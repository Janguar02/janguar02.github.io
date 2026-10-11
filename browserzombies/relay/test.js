'use strict';
// Relay protocol test: starts server.js on a free port and plays host / clients against it.
//   node test.js            (npm test)
const { spawn } = require('child_process');
const WebSocket = require('ws');

const PORT = 18000 + Math.floor(Math.random() * 1000);
const URL = `ws://127.0.0.1:${PORT}`;
let passes = 0;
let fails = 0;

function check(name, ok, info = '') {
	if (ok) passes++;
	else fails++;
	console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${info}`);
}

function client() {
	return new Promise((resolve, reject) => {
		const ws = new WebSocket(URL);
		ws.inbox = [];
		ws.waiters = [];
		ws.on('message', (data, bin) => {
			const m = bin ? { bin: true, from: data.readInt32LE(0), payload: data.subarray(4).toString() } : JSON.parse(data.toString());
			ws.inbox.push(m);
			ws.waiters = ws.waiters.filter((w) => !w());
		});
		ws.on('close', (code) => { ws.closed = code; ws.waiters = ws.waiters.filter((w) => !w()); });
		ws.on('open', () => resolve(ws));
		ws.on('error', reject);
	});
}

// waits for the first inbox message matching pred (consumes it)
function next(ws, pred, ms = 3000) {
	return new Promise((resolve) => {
		const tryTake = () => {
			const i = ws.inbox.findIndex(pred);
			if (i >= 0) {
				resolve(ws.inbox.splice(i, 1)[0]);
				return true;
			}
			return false;
		};
		if (tryTake()) return;
		ws.waiters.push(tryTake);
		setTimeout(() => {
			ws.waiters = ws.waiters.filter((w) => w !== tryTake);
			resolve(null);
		}, ms);
	});
}

function closed(ws, ms = 3000) {
	return new Promise((resolve) => {
		const t0 = Date.now();
		const iv = setInterval(() => {
			if (ws.closed !== undefined || Date.now() - t0 > ms) {
				clearInterval(iv);
				resolve(ws.closed);
			}
		}, 20);
	});
}

function packet(target, text) {
	const p = Buffer.from(text);
	const b = Buffer.alloc(4 + p.length);
	b.writeInt32LE(target, 0);
	p.copy(b, 4);
	return b;
}

const op = (o) => (m) => m.op === o;

async function main() {
	const srv = spawn(process.execPath, [__dirname + '/server.js'], { env: { ...process.env, PORT: String(PORT), MAX_PEERS: '4' } });
	await new Promise((r) => srv.stdout.once('data', r));
	try {
		const host = await client();
		host.send(JSON.stringify({ op: 'host', game: 'browserzombies', v: 1, max: 4 }));
		const hosted = await next(host, op('hosted'));
		check('host gets a lobby code', hosted && /^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(hosted.code), hosted && hosted.code);
		const code = hosted.code;

		const bad = await client();
		bad.send(JSON.stringify({ op: 'join', game: 'browserzombies', v: 1, code: 'ZZZZ-ZZZZ' }));
		const nf = await next(bad, op('error'));
		check('unknown code -> LOBBY_NOT_FOUND', nf && nf.error === 'LOBBY_NOT_FOUND');
		check('... and closed', (await closed(bad)) === 4000);

		const old = await client();
		old.send(JSON.stringify({ op: 'join', game: 'browserzombies', v: 0, code }));
		const vm = await next(old, op('error'));
		check('other protocol -> VERSION_MISMATCH', vm && vm.error === 'VERSION_MISMATCH');

		const c = [];
		for (let i = 0; i < 3; i++) {
			const w = await client();
			// lower case without dash works too
			w.send(JSON.stringify({ op: 'join', game: 'browserzombies', v: 1, code: i === 0 ? code.toLowerCase().replace('-', '') : code }));
			const j = await next(w, op('joined'));
			check(`client ${i} joined`, j && j.id === 2 + i, j && String(j.id));
			const pc = await next(host, op('peer_connected'));
			check(`host told about client ${i}`, pc && pc.id === 2 + i);
			c.push(w);
		}
		const full = await client();
		full.send(JSON.stringify({ op: 'join', game: 'browserzombies', v: 1, code }));
		const fe = await next(full, op('error'));
		check('5th player -> LOBBY_FULL', fe && fe.error === 'LOBBY_FULL');

		c[0].send(packet(1, 'hello host'));
		const h1 = await next(host, (m) => m.bin);
		check('client -> host packet', h1 && h1.from === 2 && h1.payload === 'hello host');
		c[1].send(packet(4, 'sneaky'));
		check('client -> client packet is dropped', (await next(c[2], (m) => m.bin, 300)) === null);
		host.send(packet(3, 'to three'));
		const p3 = await next(c[1], (m) => m.bin);
		check('host -> one client', p3 && p3.from === 1 && p3.payload === 'to three');
		check('... nobody else', (await next(c[0], (m) => m.bin, 300)) === null);
		host.send(packet(0, 'all'));
		const all = await Promise.all(c.map((w) => next(w, (m) => m.bin)));
		check('host -> all clients', all.every((m) => m && m.payload === 'all'));
		host.send(packet(-2, 'not two'));
		const nt = await Promise.all(c.map((w) => next(w, (m) => m.bin, 300)));
		check('host -> all but one', nt[0] === null && nt[1] && nt[2]);

		host.send(JSON.stringify({ op: 'ping', t: 42 }));
		const pong = await next(host, op('pong'));
		check('ping / pong', pong && pong.t === 42);

		c[2].close();
		const pd = await next(host, op('peer_disconnected'));
		check('host told about a leave', pd && pd.id === 4);

		host.send(JSON.stringify({ op: 'kick', id: 3 }));
		check('host kicks a client', (await closed(c[1])) === 4002);
		await next(host, op('peer_disconnected'));

		host.close();
		const hl = await next(c[0], op('host_left'));
		check('host leaves -> clients told', hl !== null);
		check('... and closed', (await closed(c[0])) === 4001);
		const late = await client();
		late.send(JSON.stringify({ op: 'join', game: 'browserzombies', v: 1, code }));
		const le = await next(late, op('error'));
		check('closed lobby -> LOBBY_NOT_FOUND', le && le.error === 'LOBBY_NOT_FOUND');

		const res = await fetch(`http://127.0.0.1:${PORT}/health`).then((r) => r.json());
		check('health endpoint', res.ok === true && res.lobbies === 0, JSON.stringify(res));
	} finally {
		srv.kill();
	}
	console.log(`\nRELAY TEST: ${passes} passed, ${fails} failed`);
	process.exit(fails ? 1 : 0);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
