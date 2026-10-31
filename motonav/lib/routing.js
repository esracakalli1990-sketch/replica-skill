/* Road routing adapter for MotoNav. One module talks to the routing engine so
 * the engine can be swapped. It speaks the Valhalla HTTP API (sources_to_targets
 * and route). When the engine cannot be reached, or the route has more stops than
 * the engine's matrix limit, it falls back to straight-line estimates and says so
 * (approx: true), so the screen never shows invented road numbers as real ones. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./optimize.js'));
  else root.MotoRouting = factory(root.MotoOpt);
})(typeof self !== 'undefined' ? self : this, function (Opt) {
  var COSTING = { motorcycle: 'motorcycle', car: 'auto', bicycle: 'bicycle', walking: 'pedestrian' };
  var MATRIX_LIMIT = 50;   // many public servers refuse bigger matrices
  var ROUTE_CHUNK = 20;    // locations per route request

  /* Engine options from the screen: preference is 'duration' or 'distance'. */
  function costingOptions(o) {
    var c = COSTING[o.mode] || 'auto', opt = {};
    if (c === 'auto' || c === 'motorcycle') {
      opt.use_highways = o.useHighways === false ? 0 : 1;
      opt.use_tolls = o.useTolls === false ? 0 : 1;
      opt.use_ferry = o.useFerry === false ? 0 : 1;
    }
    if (o.method === 'distance') opt.shortest = true;
    var all = {}; all[c] = opt;
    return { costing: c, costing_options: all };
  }

  function loc(p) { return { lat: p.lat, lon: p.lng }; }

  function post(base, path, body, fetchImpl) {
    return fetchImpl(base.replace(/\/+$/, '') + path, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    }).then(function (r) {
      if (!r.ok) throw new Error('routing server answered ' + r.status);
      return r.json();
    });
  }

  /* Cost matrices in metres and seconds. Never throws: falls back and flags it. */
  function matrix(points, o, fetchImpl) {
    var fallback = function (why) {
      var m = Opt.estimateMatrix(points, o.mode); m.reason = why; return m;
    };
    if (!o.server) return Promise.resolve(fallback('no routing server set'));
    if (points.length > MATRIX_LIMIT) return Promise.resolve(fallback('more than ' + MATRIX_LIMIT + ' stops: ordering by straight-line estimate'));
    var ce = costingOptions(o);
    var body = { sources: points.map(loc), targets: points.map(loc), costing: ce.costing,
      costing_options: ce.costing_options, units: 'kilometers' };
    return post(o.server, '/sources_to_targets', body, fetchImpl).then(function (res) {
      var rows = res.sources_to_targets, n = points.length, dist = [], dur = [];
      if (!rows || rows.length !== n) throw new Error('unexpected matrix answer');
      var est = Opt.estimateMatrix(points, o.mode);
      for (var i = 0; i < n; i++) {
        dist.push([]); dur.push([]);
        for (var j = 0; j < n; j++) {
          var cell = rows[i][j];
          // an unreachable pair gets a large cost so the optimiser avoids it
          var ok = cell && cell.distance != null && cell.time != null;
          dist[i].push(i === j ? 0 : ok ? cell.distance * 1000 : est.dist[i][j] * 10);
          dur[i].push(i === j ? 0 : ok ? cell.time : est.dur[i][j] * 10);
        }
      }
      return { dist: dist, dur: dur, approx: false };
    }).catch(function (e) { return fallback(String(e.message || e)); });
  }

  /* Valhalla shapes are polyline with 6 decimals. Returns [[lat, lng], ...]. */
  function decodePolyline6(str) {
    var i = 0, lat = 0, lng = 0, out = [];
    while (i < str.length) {
      var shift = 0, result = 0, b;
      do { b = str.charCodeAt(i++) - 63; result |= (b & 31) << shift; shift += 5; } while (b >= 32);
      lat += (result & 1) ? ~(result >> 1) : (result >> 1);
      shift = 0; result = 0;
      do { b = str.charCodeAt(i++) - 63; result |= (b & 31) << shift; shift += 5; } while (b >= 32);
      lng += (result & 1) ? ~(result >> 1) : (result >> 1);
      out.push([lat / 1e6, lng / 1e6]);
    }
    return out;
  }

  /* Road geometry and totals for stops already in order. Chunked, overlapping by one point. */
  function geometry(ordered, o, fetchImpl) {
    if (!o.server || ordered.length < 2) return Promise.resolve(null);
    var ce = costingOptions(o), chunks = [];
    for (var s = 0; s < ordered.length - 1; s += ROUTE_CHUNK - 1) chunks.push(ordered.slice(s, s + ROUTE_CHUNK));
    return Promise.all(chunks.map(function (c) {
      var body = { locations: c.map(function (p) { var l = loc(p); l.type = 'break'; return l; }),
        costing: ce.costing, costing_options: ce.costing_options,
        directions_options: { units: 'kilometers' } };
      return post(o.server, '/route', body, fetchImpl);
    })).then(function (parts) {
      var line = [], dist = 0, time = 0;
      parts.forEach(function (r) {
        var trip = r.trip;
        if (!trip || !trip.legs) throw new Error('unexpected route answer');
        trip.legs.forEach(function (leg) { line = line.concat(decodePolyline6(leg.shape)); });
        dist += trip.summary.length * 1000; time += trip.summary.time;
      });
      return { line: line, distance: dist, duration: time };
    }).catch(function () { return null; });
  }

  /* Points spread evenly along a road line, to hand to a navigation app that would otherwise
   * pick its own route. Returns [[lat, lng], ...] without the two ends. Short lines get none. */
  function sampleVia(line, max) {
    if (!line || line.length < 2) return [];
    var cum = [0], i;
    for (i = 1; i < line.length; i++) {
      cum.push(cum[i - 1] + Opt.haversine({ lat: line[i - 1][0], lng: line[i - 1][1] }, { lat: line[i][0], lng: line[i][1] }));
    }
    var total = cum[cum.length - 1];
    var k = Math.min(max || 8, Math.floor(total / 1500));
    var out = [], seg = 1;
    for (var n = 1; n <= k; n++) {
      var at = n * total / (k + 1);
      while (seg < cum.length - 1 && cum[seg] < at) seg++;
      var span = cum[seg] - cum[seg - 1], f = span > 0 ? (at - cum[seg - 1]) / span : 0;
      out.push([line[seg - 1][0] + (line[seg][0] - line[seg - 1][0]) * f, line[seg - 1][1] + (line[seg][1] - line[seg - 1][1]) * f]);
    }
    return out;
  }

  return { costingOptions: costingOptions, matrix: matrix, geometry: geometry, sampleVia: sampleVia,
    decodePolyline6: decodePolyline6, MATRIX_LIMIT: MATRIX_LIMIT };
});
