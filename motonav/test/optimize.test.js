const test = require('node:test');
const assert = require('node:assert');
const O = require('../lib/optimize.js');

function rng(seed) { return () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296; }
function points(n, seed) {
  const r = rng(seed); const p = [];
  for (let i = 0; i < n; i++) p.push({ lat: 41 + r() * 0.2, lng: 28.9 + r() * 0.2 });
  return p;
}
function brute(cost, start, end) {
  const n = cost.length; const idx = []; for (let i = 0; i < n; i++) if (i !== start && i !== end) idx.push(i);
  let best = Infinity;
  (function perm(a, rest) {
    if (!rest.length) { const path = [start, ...a]; if (end !== null && end !== start) path.push(end); best = Math.min(best, O.pathCost(path, cost)); return; }
    rest.forEach((x, i) => perm([...a, x], rest.filter((_, j) => j !== i)));
  })([], idx);
  return best;
}

test('visits every stop exactly once and starts at the chosen start', () => {
  for (const start of [0, 3]) {
    const m = O.estimateMatrix(points(20, 7), 'motorcycle').dist;
    const order = O.optimise({ cost: m, start, end: 'auto' });
    assert.strictEqual(order[0], start);
    assert.deepStrictEqual([...order].sort((a, b) => a - b), [...Array(20).keys()]);
  }
});

test('a fixed end stop stays last', () => {
  const m = O.estimateMatrix(points(15, 3), 'car').dist;
  const order = O.optimise({ cost: m, start: 0, end: 9 });
  assert.strictEqual(order[order.length - 1], 9);
  assert.strictEqual(order.length, 15);
});

test('round trip visits all stops once and the cost includes the way back', () => {
  const m = O.estimateMatrix(points(12, 5), 'car').dist;
  const order = O.optimise({ cost: m, start: 0, end: 'start' });
  assert.strictEqual(order[0], 0);
  assert.strictEqual(new Set(order).size, 12);
  const closed = O.pathCost([...order, 0], m);
  const nn = O.pathCost([...O.nearestNeighbour(12, m, 0, null), 0], m);
  assert.ok(closed <= nn + 1e-6);
});

test('never worse than nearest neighbour, and close to the best on small cases', () => {
  let optimal = 0, total = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const m = O.estimateMatrix(points(8, seed), 'car').dist;
    const order = O.optimise({ cost: m, start: 0, end: 'auto' });
    const got = O.pathCost(order, m);
    assert.ok(got <= O.pathCost(O.nearestNeighbour(8, m, 0, null), m) + 1e-6);
    const best = brute(m, 0, null);
    assert.ok(got <= best * 1.10, 'seed ' + seed + ' more than 10% off');
    total++; if (got <= best + 1e-6) optimal++;
  }
  assert.ok(optimal / total >= 0.8, 'optimal in only ' + optimal + ' of ' + total);
});

test('handles an asymmetric matrix (one-way streets)', () => {
  const n = 9, r = rng(11); const m = [];
  for (let i = 0; i < n; i++) { m.push([]); for (let j = 0; j < n; j++) m[i].push(i === j ? 0 : 100 + r() * 900); }
  const order = O.optimise({ cost: m, start: 0, end: 'auto' });
  assert.strictEqual(new Set(order).size, n);
  assert.ok(O.pathCost(order, m) <= brute(m, 0, null) * 1.25);
});

test('300 stops finish within the time budget', () => {
  const m = O.estimateMatrix(points(300, 9), 'motorcycle').dur;
  const t = Date.now();
  const order = O.optimise({ cost: m, start: 0, end: 'auto', budgetMs: 1500 });
  assert.ok(Date.now() - t < 2500, 'took ' + (Date.now() - t) + ' ms');
  assert.strictEqual(new Set(order).size, 300);
});

test('tiny inputs', () => {
  assert.deepStrictEqual(O.optimise({ cost: [[0]], start: 0, end: 'auto' }), [0]);
  assert.deepStrictEqual(O.optimise({ cost: [[0, 5], [5, 0]], start: 1, end: 'auto' }).length, 2);
});

test('schedule adds travel and service time', () => {
  const dur = [[0, 600, 0], [600, 0, 1200], [0, 1200, 0]];
  assert.deepStrictEqual(O.schedule([0, 1, 2], dur, 480, [0, 5, 0]), [480, 490, 515]);
});

test('motorcycle estimates are not slower than bicycle', () => {
  const p = points(5, 2);
  assert.ok(O.estimateMatrix(p, 'motorcycle').dur[0][1] < O.estimateMatrix(p, 'bicycle').dur[0][1]);
});
