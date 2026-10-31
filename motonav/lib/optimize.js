/* Stop-order optimiser for MotoNav. No dependencies, works in the browser
 * (global MotoOpt) and in Node (require). It orders stops with a fixed start,
 * an optional fixed end, and any cost matrix (distance or duration), including
 * asymmetric ones. Method: nearest neighbour, then 2-opt and or-opt until no
 * move helps or the time budget runs out. Heuristic: fast, not provably best. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MotoOpt = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var R = 6371000;
  var SPEED = { motorcycle: 11.1, car: 11.1, bicycle: 4.4, walking: 1.3 }; // m/s in town
  var DETOUR = 1.3; // straight line to road distance, rough

  function haversine(a, b) {
    var t = Math.PI / 180;
    var dLat = (b.lat - a.lat) * t, dLng = (b.lng - a.lng) * t;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  /* Straight-line estimate used when no road data is available. */
  function estimateMatrix(points, mode) {
    var n = points.length, dist = [], dur = [], v = SPEED[mode] || SPEED.car;
    for (var i = 0; i < n; i++) {
      dist.push([]); dur.push([]);
      for (var j = 0; j < n; j++) {
        var d = i === j ? 0 : haversine(points[i], points[j]) * DETOUR;
        dist[i].push(d); dur[i].push(d / v);
      }
    }
    return { dist: dist, dur: dur, approx: true };
  }

  function pathCost(order, cost) {
    var c = 0;
    for (var i = 0; i + 1 < order.length; i++) c += cost[order[i]][order[i + 1]];
    return c;
  }

  function nearestNeighbour(n, cost, start, end) {
    var left = [], i;
    for (i = 0; i < n; i++) if (i !== start && i !== end) left.push(i);
    var order = [start];
    while (left.length) {
      var cur = order[order.length - 1], bi = 0;
      for (i = 1; i < left.length; i++) if (cost[cur][left[i]] < cost[cur][left[bi]]) bi = i;
      order.push(left.splice(bi, 1)[0]);
    }
    if (end !== null && end !== start) order.push(end);
    return order;
  }

  /* 2-opt that handles asymmetric costs through prefix sums of both directions. */
  function twoOpt(order, cost, lastFixed, deadline) {
    var n = order.length, improved = true, i, j;
    var maxJ = lastFixed ? n - 2 : n - 1;
    while (improved && Date.now() < deadline) {
      improved = false;
      var fw = [0], bw = [0];
      for (i = 0; i + 1 < n; i++) {
        fw.push(fw[i] + cost[order[i]][order[i + 1]]);
        bw.push(bw[i] + cost[order[i + 1]][order[i]]);
      }
      for (i = 1; i < n - 1 && !improved; i++) {
        for (j = i + 1; j <= maxJ; j++) {
          var before = cost[order[i - 1]][order[i]] + (fw[j] - fw[i]) +
            (j + 1 < n ? cost[order[j]][order[j + 1]] : 0);
          var after = cost[order[i - 1]][order[j]] + (bw[j] - bw[i]) +
            (j + 1 < n ? cost[order[i]][order[j + 1]] : 0);
          if (after < before - 1e-9) {
            var seg = order.slice(i, j + 1).reverse();
            order = order.slice(0, i).concat(seg, order.slice(j + 1));
            improved = true;
            break;
          }
        }
      }
    }
    return order;
  }

  /* Move a run of 1 to 3 stops somewhere else when it shortens the path. */
  function orOpt(order, cost, lastFixed, deadline) {
    var n = order.length, improved = true;
    var hi = lastFixed ? n - 1 : n;
    while (improved && Date.now() < deadline) {
      improved = false;
      for (var len = 1; len <= 3 && !improved; len++) {
        for (var i = 1; i + len <= hi && !improved; i++) {
          var seg = order.slice(i, i + len);
          var rest = order.slice(0, i).concat(order.slice(i + len));
          var base = pathCost(order, cost);
          for (var k = 1; k <= rest.length - (lastFixed ? 1 : 0) && !improved; k++) {
            if (k === i) continue;
            var cands = [rest.slice(0, k).concat(seg, rest.slice(k))];
            if (len > 1) cands.push(rest.slice(0, k).concat(seg.slice().reverse(), rest.slice(k)));
            for (var c = 0; c < cands.length; c++) {
              if (pathCost(cands[c], cost) < base - 1e-9) {
                order = cands[c]; improved = true; break;
              }
            }
          }
        }
      }
    }
    return order;
  }

  /* opts: cost (n x n matrix), start (index), end ('auto' | index | 'start'),
   * budgetMs. Returns the visiting order as indexes, starting at `start`. */
  function optimise(opts) {
    var cost = opts.cost, n = cost.length, start = opts.start || 0;
    var end = opts.end === 'start' ? start : (typeof opts.end === 'number' ? opts.end : null);
    if (n <= 2) { var o = []; for (var q = 0; q < n; q++) o.push(q); return o; }
    var deadline = Date.now() + (opts.budgetMs || 1500);
    var order = nearestNeighbour(n, cost, start, end === start ? null : end);
    var roundTrip = end === start && opts.end === 'start';
    if (roundTrip) order.push(start);
    var lastFixed = end !== null;
    order = twoOpt(order, cost, lastFixed, deadline);
    order = orOpt(order, cost, lastFixed, deadline);
    order = twoOpt(order, cost, lastFixed, deadline);
    if (roundTrip) order.pop();
    return order;
  }

  /* Planned clock time per stop: arrival = departure + leg duration, then service time. */
  function schedule(order, dur, startMinutes, serviceMin) {
    var t = startMinutes, out = [];
    for (var i = 0; i < order.length; i++) {
      if (i > 0) t += dur[order[i - 1]][order[i]] / 60;
      out.push(Math.round(t));
      t += (serviceMin && serviceMin[order[i]]) || 0;
    }
    return out;
  }

  return { haversine: haversine, estimateMatrix: estimateMatrix, pathCost: pathCost,
    optimise: optimise, schedule: schedule, nearestNeighbour: nearestNeighbour };
});
