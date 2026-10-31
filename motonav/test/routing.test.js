const test = require('node:test');
const assert = require('node:assert');
const R = require('../lib/routing.js');

const pts = [{ lat: 41.0, lng: 29.0 }, { lat: 41.01, lng: 29.01 }, { lat: 41.02, lng: 29.0 }];

function encode(coords) { // polyline6 encoder, to test the decoder against known input
  let out = '', pl = 0, pg = 0;
  for (const [la, lo] of coords) {
    for (const v of [Math.round(la * 1e6) - pl, Math.round(lo * 1e6) - pg]) {
      let x = v < 0 ? ~(v << 1) : v << 1;
      while (x >= 32) { out += String.fromCharCode((32 | (x & 31)) + 63); x >>= 5; }
      out += String.fromCharCode(x + 63);
    }
    pl = Math.round(la * 1e6); pg = Math.round(lo * 1e6);
  }
  return out;
}

test('polyline6 decodes what it encodes', () => {
  const line = [[41.0, 29.0], [41.01234, 29.05678], [40.99, 28.9]];
  const back = R.decodePolyline6(encode(line));
  back.forEach((p, i) => { assert.ok(Math.abs(p[0] - line[i][0]) < 1e-6 && Math.abs(p[1] - line[i][1]) < 1e-6); });
});

test('motorcycle uses its own costing and shortest maps to the distance method', () => {
  const o = R.costingOptions({ mode: 'motorcycle', method: 'distance', useHighways: false, useTolls: true, useFerry: false });
  assert.strictEqual(o.costing, 'motorcycle');
  assert.deepStrictEqual(o.costing_options.motorcycle, { use_highways: 0, use_tolls: 1, use_ferry: 0, shortest: true });
  assert.strictEqual(R.costingOptions({ mode: 'car', method: 'duration' }).costing, 'auto');
  assert.strictEqual(R.costingOptions({ mode: 'walking', method: 'duration' }).costing, 'pedestrian');
  assert.strictEqual('shortest' in R.costingOptions({ mode: 'bicycle', method: 'duration' }).costing_options.bicycle, false);
});

test('matrix reads km and seconds from the engine answer and sends the vehicle costing', async () => {
  let sent;
  const f = async (url, init) => {
    sent = { url, body: JSON.parse(init.body) };
    return { ok: true, json: async () => ({ sources_to_targets: pts.map((_, i) => pts.map((_, j) => ({ distance: i === j ? 0 : 1.5, time: i === j ? 0 : 120 }))) }) };
  };
  const m = await R.matrix(pts, { mode: 'motorcycle', method: 'duration', server: 'https://example.test/' }, f);
  assert.strictEqual(sent.url, 'https://example.test/sources_to_targets');
  assert.strictEqual(sent.body.costing, 'motorcycle');
  assert.strictEqual(m.approx, false);
  assert.strictEqual(m.dist[0][1], 1500);
  assert.strictEqual(m.dur[0][1], 120);
});

test('an engine failure falls back to estimates and says so', async () => {
  const m = await R.matrix(pts, { mode: 'car', method: 'duration', server: 'https://example.test' },
    async () => ({ ok: false, status: 503 }));
  assert.strictEqual(m.approx, true);
  assert.match(m.reason, /503/);
  assert.ok(m.dist[0][1] > 0);
});

test('no server and too many stops both fall back without any request', async () => {
  const f = async () => { throw new Error('should not be called'); };
  assert.strictEqual((await R.matrix(pts, { mode: 'car' }, f)).approx, true);
  const many = Array.from({ length: R.MATRIX_LIMIT + 1 }, (_, i) => ({ lat: 41 + i / 1000, lng: 29 }));
  const m = await R.matrix(many, { mode: 'car', server: 'https://example.test' }, f);
  assert.strictEqual(m.approx, true);
  assert.match(m.reason, /more than/);
});

test('geometry joins chunks and sums distance and time', async () => {
  const many = Array.from({ length: 25 }, (_, i) => ({ lat: 41 + i / 100, lng: 29 }));
  let calls = 0;
  const f = async (url, init) => {
    calls++;
    const n = JSON.parse(init.body).locations.length;
    return { ok: true, json: async () => ({ trip: { summary: { length: 2, time: 300 },
      legs: [{ shape: encode([[41, 29], [41.1, 29]]) }] } }) };
  };
  const g = await R.geometry(many, { mode: 'motorcycle', method: 'duration', server: 'https://example.test' }, f);
  assert.strictEqual(calls, 2);
  assert.strictEqual(g.distance, 4000);
  assert.strictEqual(g.duration, 600);
  assert.strictEqual(g.line.length, 4);
});

test('geometry returns null when the engine fails', async () => {
  const g = await R.geometry(pts, { mode: 'car', server: 'https://example.test' }, async () => ({ ok: false, status: 500 }));
  assert.strictEqual(g, null);
});
