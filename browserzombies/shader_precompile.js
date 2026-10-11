// Shader precompile worker (PERFORMANCE_AUDIT.md "Web startup").
//
// Godot's WebGL renderer links every shader program synchronously (~125-300 ms each on a cold
// ANGLE/D3D11 start, 230-240 programs per map). The browser keeps linked programs in its GPU
// program cache (shared by the WebGL contexts of the page, also persisted on disk). This worker links
// the same programs - recorded from real cold starts by tools/web_startup_profile.py --capture,
// packed by tools/build_shader_manifest.py - in its own OffscreenCanvas context while the engine
// downloads, initialises and shows the menu. When Godot links an identical program later it is a
// cache hit (~1-3 ms). Stale or missing data only means "no hit": the game works unchanged.
//
// The context must enable the same extensions as Godot's (Emscripten enables them all): the shader
// translator output, and with it the cache key, depends on them.
//
// in:  {url, map}                 start, map = the scene to compile first after the menu
//      {prioritize: map}          the player picked another map
// out: {progress: true, done, total, by_map: {menu: [done, total], ...}}
//      {finished: true, ms, programs, failed}
'use strict';

const EXTENSIONS = ['ANGLE_instanced_arrays', 'EXT_clip_control', 'EXT_color_buffer_float', 'EXT_color_buffer_half_float',
	'EXT_conservative_depth', 'EXT_depth_clamp', 'EXT_disjoint_timer_query_webgl2', 'EXT_float_blend', 'EXT_polygon_offset_clamp',
	'EXT_texture_compression_bptc', 'EXT_texture_compression_rgtc', 'EXT_texture_filter_anisotropic', 'EXT_texture_norm16',
	'KHR_parallel_shader_compile', 'NV_shader_noperspective_interpolation', 'OES_texture_float_linear', 'OES_vertex_array_object',
	'OVR_multiview2', 'WEBGL_blend_func_extended', 'WEBGL_clip_cull_distance', 'WEBGL_compressed_texture_s3tc',
	'WEBGL_compressed_texture_s3tc_srgb', 'WEBGL_draw_buffers', 'WEBGL_draw_instanced_base_vertex_base_instance', 'WEBGL_multi_draw',
	'WEBGL_multi_draw_instanced_base_vertex_base_instance', 'WEBGL_polygon_mode'];
const IN_FLIGHT = 6;

let manifest = null;
let queue = [];          // program indices still to link, in priority order
let priorityMap = 'facility';
let menuFirst = true;    // false on a direct map start (?map=...): the menu comes later, if at all

async function loadManifest(url) {
	const res = await fetch(url);
	if (!res.ok) throw new Error('manifest ' + res.status);
	if (url.endsWith('.gz') && !res.headers.get('content-encoding') && typeof DecompressionStream !== 'undefined') {
		return JSON.parse(await new Response(res.body.pipeThrough(new DecompressionStream('gzip'))).text());
	}
	return res.json();
}

function source(i) {
	const runs = manifest.sources[i];
	const out = [];
	for (let j = 0; j < runs.length; j += 2) {
		for (let k = 0; k < runs[j + 1]; k++) out.push(manifest.lines[runs[j] + k]);
	}
	return out.join('\n');
}

function bit(map) {
	const i = manifest.maps.indexOf(map);
	return i < 0 ? 0 : 1 << i;
}

// menu first, then what the chosen map needs (common programs come first in the file), then the rest
function order() {
	const menu = bit('menu'), want = bit(priorityMap);
	const rank = (pi) => {
		const tags = manifest.progs[pi][2];
		if (menuFirst) return tags & menu ? 0 : (tags & want ? 1 : 2);
		return tags & want ? 0 : (tags & menu ? 1 : 2);
	};
	queue.sort((a, b) => rank(a) - rank(b) || a - b);
}

self.onmessage = async (e) => {
	if (e.data.prioritize) {
		priorityMap = e.data.prioritize;
		menuFirst = false;
		if (manifest) order();
		return;
	}
	const t0 = performance.now();
	let failed = 0;
	try {
		if (e.data.map) priorityMap = e.data.map;
		if (e.data.direct) menuFirst = false;
		manifest = await loadManifest(e.data.url);
		const gl = new OffscreenCanvas(1, 1).getContext('webgl2', {alpha: false, depth: true, stencil: false, antialias: false,
			premultipliedAlpha: true, preserveDrawingBuffer: true, powerPreference: 'default', failIfMajorPerformanceCaveat: false});
		if (!gl) throw new Error('no webgl2 in worker');
		for (const ext of EXTENSIONS) gl.getExtension(ext);
		const par = gl.getExtension('KHR_parallel_shader_compile');
		const shaders = new Map();
		const shaderFor = (i) => {
			let sh = shaders.get(i);
			if (sh) return sh;
			const src = source(i);
			sh = gl.createShader(/gl_Position/.test(src) ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER);
			gl.shaderSource(sh, src);
			gl.compileShader(sh);
			shaders.set(i, sh);
			return sh;
		};
		const total = manifest.progs.length;
		const byMap = {};
		for (const m of manifest.maps) byMap[m] = [0, manifest.progs.filter(p => p[2] & bit(m)).length];
		queue = [...Array(total).keys()];
		order();
		let done = 0;
		const flight = [];
		const report = () => self.postMessage({progress: true, done, total, by_map: byMap});
		report();
		while (done < total) {
			while (flight.length < IN_FLIGHT && queue.length) {
				const pi = queue.shift();
				const [ids, attrIdx] = manifest.progs[pi];
				const pr = gl.createProgram();
				for (const i of ids) gl.attachShader(pr, shaderFor(i));
				const attrs = manifest.attrs[attrIdx];
				for (const name in attrs) gl.bindAttribLocation(pr, attrs[name], name);
				gl.linkProgram(pr);
				flight.push([pi, pr]);
			}
			let changed = false;
			for (let k = flight.length - 1; k >= 0; k--) {
				const [pi, pr] = flight[k];
				if (par && !gl.getProgramParameter(pr, par.COMPLETION_STATUS_KHR)) continue;
				if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) failed++;
				gl.deleteProgram(pr);
				flight.splice(k, 1);
				done++;
				const tags = manifest.progs[pi][2];
				for (const m of manifest.maps) if (tags & bit(m)) byMap[m][0]++;
				changed = true;
			}
			if (changed) report();
			if (done < total) await new Promise(r => setTimeout(r, par ? 15 : 0));
		}
		self.postMessage({finished: true, ms: Math.round(performance.now() - t0), programs: total, failed});
	} catch (err) {
		self.postMessage({finished: true, ms: Math.round(performance.now() - t0), programs: 0, failed: -1, error: String(err)});
	}
};
