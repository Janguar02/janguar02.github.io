'use strict';
// Browser Zombies lobby + relay service (MULTIPLAYER.md, "Internet multiplayer").
//
// Every player (host and clients, desktop or browser) opens ONE outgoing WebSocket to this
// service, so nobody needs port forwarding and NAT does not matter. The service
//   * creates lobbies with a short code ("AB12-CD34") - the code never contains an IP address,
//   * resolves a code to its lobby on join, assigns peer ids (host = 1, clients 2, 3, ...),
//   * forwards the game's packets between the host and its clients (it never reads them),
//   * tells the host about joins / leaves and the clients about the host leaving.
// No accounts, no persistence, no game logic. State lives in memory; a restart ends all lobbies.
//
// Protocol v1
//   text frames = JSON control messages
//     -> {op:"host", game, v, max}            <- {op:"hosted", code, id:1, max}
//     -> {op:"join", game, v, code}           <- {op:"joined", code, id}
//                                             <- {op:"error", error, message}  (then close)
//        error: BAD_REQUEST, VERSION_MISMATCH, LOBBY_NOT_FOUND, LOBBY_FULL, SERVER_FULL, RATE_LIMIT
//     host <- {op:"peer_connected", id}  {op:"peer_disconnected", id}
//     host -> {op:"kick", id}  {op:"lock", on}
//     client <- {op:"host_left"}  (then close)
//     any -> {op:"ping", t}                   <- {op:"pong", t}
//   binary frames = game packets
//     to relay:   int32 LE target + payload   (client: target 1; host: client id, 0 = all, -id = all but id)
//     from relay: int32 LE sender + payload
//
// Environment: PORT (8090), MAX_LOBBIES (500), MAX_PEERS (4), ALLOWED_ORIGINS (comma list, empty = any),
//              RATE_BYTES (bytes/s per connection, 4 MiB), LOG (1 = log lobby events).

const http = require('http');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const PORT = parseInt(process.env.PORT || '8090', 10);
const GAME = 'browserzombies';
const RELAY_VERSION = 1;
const MAX_LOBBIES = parseInt(process.env.MAX_LOBBIES || '500', 10);
const MAX_PEERS = parseInt(process.env.MAX_PEERS || '4', 10);
const RATE_BYTES = parseInt(process.env.RATE_BYTES || String(4 << 20), 10);
const MAX_PACKET = 1 << 20;
const HELLO_TIMEOUT_MS = 10000;
const HEARTBEAT_MS = 15000;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
const LOG = process.env.LOG === '1';
// no 0/O, 1/I/L: codes are read aloud and typed
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

const lobbies = new Map(); // code -> {code, host, peers: Map<id, ws>, nextId, max, locked, v, created}
const stats = { started: Date.now(), connections: 0, lobbiesCreated: 0, bytes: 0 };

function log(...a) {
	if (LOG) console.log(new Date().toISOString(), ...a);
}

function newCode() {
	for (let tries = 0; tries < 100; tries++) {
		let s = '';
		for (let i = 0; i < 8; i++) s += ALPHABET[crypto.randomInt(ALPHABET.length)];
		const code = s.slice(0, 4) + '-' + s.slice(4);
		if (!lobbies.has(code)) return code;
	}
	return null;
}

// "ab12cd34", "AB12-CD34", " ab12 cd34 " -> "AB12-CD34"
function normalizeCode(c) {
	const s = String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/O/g, '0');
	return s.length === 8 ? s.slice(0, 4) + '-' + s.slice(4) : '';
}

function sendJson(ws, obj) {
	if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj));
}

function fail(ws, error, message) {
	sendJson(ws, { op: 'error', error, message });
	// the close reason repeats the error (some clients drop a text frame that arrives with the close)
	setTimeout(() => ws.close(4000, error), 50);
}

function forward(to, from, payload) {
	if (to.readyState !== to.OPEN) return;
	const buf = Buffer.allocUnsafe(4 + payload.length);
	buf.writeInt32LE(from, 0);
	payload.copy(buf, 4);
	to.send(buf, { binary: true });
}

function closeLobby(lobby, reason) {
	if (!lobbies.has(lobby.code)) return;
	lobbies.delete(lobby.code);
	for (const [id, ws] of lobby.peers) {
		if (id === 1) continue;
		sendJson(ws, { op: 'host_left' });
		ws.close(4001, reason);
	}
	log('lobby closed', lobby.code, reason);
}

function onControl(ws, msg) {
	switch (msg.op) {
		case 'ping':
			sendJson(ws, { op: 'pong', t: msg.t });
			return;
		case 'host': {
			if (ws.lobby) return fail(ws, 'BAD_REQUEST', 'already in a lobby');
			if (msg.game !== GAME) return fail(ws, 'BAD_REQUEST', 'unknown game');
			if (lobbies.size >= MAX_LOBBIES) return fail(ws, 'SERVER_FULL', 'too many lobbies, try again later');
			const code = newCode();
			if (!code) return fail(ws, 'SERVER_FULL', 'no free code');
			const max = Math.max(2, Math.min(MAX_PEERS, parseInt(msg.max, 10) || MAX_PEERS));
			const lobby = { code, host: ws, peers: new Map([[1, ws]]), nextId: 2, max, locked: false, v: msg.v, created: Date.now() };
			lobbies.set(code, lobby);
			ws.lobby = lobby;
			ws.peerId = 1;
			stats.lobbiesCreated++;
			sendJson(ws, { op: 'hosted', code, id: 1, max });
			log('lobby', code, 'hosted from', ws.remote);
			return;
		}
		case 'join': {
			if (ws.lobby) return fail(ws, 'BAD_REQUEST', 'already in a lobby');
			if (msg.game !== GAME) return fail(ws, 'BAD_REQUEST', 'unknown game');
			const code = normalizeCode(msg.code);
			const lobby = code && lobbies.get(code);
			if (!lobby) return fail(ws, 'LOBBY_NOT_FOUND', 'no lobby with this code');
			if (lobby.v !== msg.v) return fail(ws, 'VERSION_MISMATCH', `host runs protocol ${lobby.v}, you ${msg.v}`);
			if (lobby.peers.size >= lobby.max || lobby.locked) return fail(ws, 'LOBBY_FULL', 'the lobby is full');
			const id = lobby.nextId++;
			lobby.peers.set(id, ws);
			ws.lobby = lobby;
			ws.peerId = id;
			sendJson(ws, { op: 'joined', code, id });
			sendJson(lobby.host, { op: 'peer_connected', id });
			log('lobby', code, 'join', id, 'from', ws.remote);
			return;
		}
		case 'kick': {
			const lobby = ws.lobby;
			if (!lobby || ws.peerId !== 1) return;
			const target = lobby.peers.get(parseInt(msg.id, 10));
			if (target && target !== ws) target.close(4002, 'KICKED');
			return;
		}
		case 'lock':
			if (ws.lobby && ws.peerId === 1) ws.lobby.locked = !!msg.on;
			return;
		default:
			return fail(ws, 'BAD_REQUEST', 'unknown op');
	}
}

function onPacket(ws, data) {
	const lobby = ws.lobby;
	if (!lobby || data.length < 4) return;
	const target = data.readInt32LE(0);
	const payload = data.subarray(4);
	if (ws.peerId !== 1) {
		// clients only talk to the host (the game's own server relay handles anything else)
		if (target === 1) forward(lobby.host, ws.peerId, payload);
		return;
	}
	if (target > 1) {
		const to = lobby.peers.get(target);
		if (to) forward(to, 1, payload);
	} else if (target === 0 || target < 0) {
		for (const [id, to] of lobby.peers) {
			if (id !== 1 && id !== -target) forward(to, 1, payload);
		}
	}
}

function onClose(ws) {
	const lobby = ws.lobby;
	if (!lobby) return;
	ws.lobby = null;
	if (ws.peerId === 1) {
		closeLobby(lobby, 'HOST_LEFT');
	} else if (lobby.peers.get(ws.peerId) === ws) {
		lobby.peers.delete(ws.peerId);
		sendJson(lobby.host, { op: 'peer_disconnected', id: ws.peerId });
		log('lobby', lobby.code, 'leave', ws.peerId);
	}
}

const server = http.createServer((req, res) => {
	if (req.url === '/health' || req.url === '/healthz') {
		let peers = 0;
		for (const l of lobbies.values()) peers += l.peers.size;
		res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
		res.end(JSON.stringify({ ok: true, relay: RELAY_VERSION, lobbies: lobbies.size, peers,
			uptime_s: Math.round((Date.now() - stats.started) / 1000), lobbies_created: stats.lobbiesCreated }));
		return;
	}
	res.writeHead(200, { 'content-type': 'text/plain' });
	res.end('Browser Zombies relay. Connect with a WebSocket (MULTIPLAYER.md).\n');
});

const wss = new WebSocketServer({
	server,
	maxPayload: MAX_PACKET,
	perMessageDeflate: false,
	verifyClient: (info) => ALLOWED_ORIGINS.length === 0 || !info.origin || ALLOWED_ORIGINS.includes(info.origin),
});

wss.on('connection', (ws, req) => {
	stats.connections++;
	ws.remote = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
	ws.alive = true;
	ws.lobby = null;
	ws.peerId = 0;
	ws.bucket = RATE_BYTES;
	ws.bucketT = Date.now();
	ws.helloTimer = setTimeout(() => {
		if (!ws.lobby) fail(ws, 'BAD_REQUEST', 'no host / join request');
	}, HELLO_TIMEOUT_MS);
	ws.on('pong', () => { ws.alive = true; });
	ws.on('message', (data, isBinary) => {
		// token bucket: a burst of one second of RATE_BYTES, refilled continuously
		const now = Date.now();
		ws.bucket = Math.min(RATE_BYTES, ws.bucket + (now - ws.bucketT) * RATE_BYTES / 1000);
		ws.bucketT = now;
		ws.bucket -= data.length;
		stats.bytes += data.length;
		if (ws.bucket < -RATE_BYTES) return fail(ws, 'RATE_LIMIT', 'too much traffic');
		if (isBinary) return onPacket(ws, data);
		let msg;
		try {
			msg = JSON.parse(data.toString('utf8'));
		} catch (e) {
			return fail(ws, 'BAD_REQUEST', 'invalid JSON');
		}
		if (msg && (msg.op === 'host' || msg.op === 'join')) clearTimeout(ws.helloTimer);
		onControl(ws, msg || {});
	});
	ws.on('close', () => {
		clearTimeout(ws.helloTimer);
		onClose(ws);
	});
	ws.on('error', () => {});
});

// dead connections (closed tab, lost network) are dropped within 2 heartbeats
const heartbeat = setInterval(() => {
	for (const ws of wss.clients) {
		if (!ws.alive) {
			ws.terminate();
			continue;
		}
		ws.alive = false;
		ws.ping();
	}
}, HEARTBEAT_MS);
wss.on('close', () => clearInterval(heartbeat));

server.listen(PORT, () => console.log(`browserzombies relay v${RELAY_VERSION} listening on :${PORT}`));

function shutdown() {
	for (const l of [...lobbies.values()]) closeLobby(l, 'SERVER_SHUTDOWN');
	wss.close();
	server.close(() => process.exit(0));
	setTimeout(() => process.exit(0), 2000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

module.exports = { normalizeCode };
