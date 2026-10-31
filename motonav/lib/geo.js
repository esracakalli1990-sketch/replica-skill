/* Parsing and links for MotoNav: coordinates, CSV/GPX/KML import, navigation app links. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MotoGeo = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  function valid(lat, lng) { return isFinite(lat) && isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180; }

  /* "41.0082, 28.9784" or "41.0082 28.9784" -> {lat, lng} or null */
  function parseCoords(text) {
    var m = /^\s*(-?\d{1,2}(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:[.,]\d+)?)\s*$/.exec(String(text || ''));
    if (!m) return null;
    var lat = parseFloat(m[1].replace(',', '.')), lng = parseFloat(m[2].replace(',', '.'));
    return valid(lat, lng) ? { lat: lat, lng: lng } : null;
  }

  function splitCsvLine(line, d) {
    var out = [], cur = '', q = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (q) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
      else if (ch === '"') q = true;
      else if (ch === d) { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur);
    return out.map(function (s) { return s.trim(); });
  }

  var HEAD = {
    name: /^(name|ad|isim|title|label|customer|müşteri)$/i, address: /^(address|adres)$/i,
    lat: /^(lat|latitude|enlem|y)$/i, lng: /^(lng|lon|long|longitude|boylam|x)$/i,
    phone: /^(phone|tel|telefon|gsm)$/i, note: /^(note|notes|not|açıklama)$/i
  };

  /* Rows with coordinates are usable now. Rows with only an address are returned
   * with needsGeocode: true so the screen can look them up. Bad rows are counted. */
  function parseCsv(text) {
    var lines = String(text || '').replace(/^﻿/, '').split(/\r?\n/).filter(function (l) { return l.trim(); });
    if (!lines.length) return { rows: [], skipped: 0, error: 'empty file' };
    var d = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ';' : ',';
    var head = splitCsvLine(lines[0], d), col = {};
    head.forEach(function (h, i) { Object.keys(HEAD).forEach(function (k) { if (col[k] == null && HEAD[k].test(h)) col[k] = i; }); });
    if (col.lat == null && col.address == null) return { rows: [], skipped: lines.length - 1, error: 'no address or lat/lng column found' };
    var rows = [], skipped = 0;
    lines.slice(1).forEach(function (line) {
      var c = splitCsvLine(line, d), get = function (k) { return col[k] != null ? c[col[k]] || '' : ''; };
      var lat = parseFloat(get('lat').replace(',', '.')), lng = parseFloat(get('lng').replace(',', '.'));
      var row = { name: get('name'), address: get('address'), phone: get('phone'), note: get('note') };
      if (valid(lat, lng)) { row.lat = lat; row.lng = lng; rows.push(row); }
      else if (row.address) { row.needsGeocode = true; rows.push(row); }
      else skipped++;
    });
    return { rows: rows, skipped: skipped };
  }

  function unxml(s) { return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&'); }

  function parseGpx(text) {
    var rows = [], re = /<wpt\b([^>]*)>([\s\S]*?)<\/wpt>|<wpt\b([^>]*)\/>/g, m;
    while ((m = re.exec(text))) {
      var attrs = m[1] || m[3] || '', body = m[2] || '';
      var lat = parseFloat((/lat="([^"]+)"/.exec(attrs) || [])[1]), lng = parseFloat((/lon="([^"]+)"/.exec(attrs) || [])[1]);
      var name = (/<name>([\s\S]*?)<\/name>/.exec(body) || [])[1] || '';
      if (valid(lat, lng)) rows.push({ name: unxml(name.replace(/<!\[CDATA\[|\]\]>/g, '')).trim(), lat: lat, lng: lng });
    }
    return { rows: rows, skipped: 0 };
  }

  function parseKml(text) {
    var rows = [], re = /<Placemark\b[\s\S]*?<\/Placemark>/g, m;
    while ((m = re.exec(text))) {
      var coords = /<Point>[\s\S]*?<coordinates>\s*([^<\s]+)/.exec(m[0]);
      if (!coords) continue;
      var p = coords[1].split(','), lng = parseFloat(p[0]), lat = parseFloat(p[1]);
      var name = (/<name>([\s\S]*?)<\/name>/.exec(m[0]) || [])[1] || '';
      if (valid(lat, lng)) rows.push({ name: unxml(name.replace(/<!\[CDATA\[|\]\]>/g, '')).trim(), lat: lat, lng: lng });
    }
    return { rows: rows, skipped: 0 };
  }

  function parseFile(name, text) {
    var ext = (/\.([a-z0-9]+)$/i.exec(name) || [])[1];
    ext = (ext || '').toLowerCase();
    if (ext === 'gpx') return parseGpx(text);
    if (ext === 'kml') return parseKml(text);
    if (ext === 'csv' || ext === 'txt') return parseCsv(text);
    return { rows: [], skipped: 0, error: 'unsupported file type: ' + (ext || 'unknown') + ' (use CSV, GPX or KML; save Excel as CSV)' };
  }

  /* Links that open a navigation app on the phone. mode: motorcycle|car|bicycle|walking */
  function pt(p) { return p[0].toFixed(6) + ',' + p[1].toFixed(6); }
  /* via: optional [[lat, lng], ...] the route must pass through, in order. Only Google Maps and
   * Yandex Maps accept them; for the other apps the destination alone is used. */
  function navLink(app, stop, mode, via) {
    var ll = stop.lat + ',' + stop.lng;
    via = via || [];
    switch (app) {
      case 'google':
        var tm = { motorcycle: 'two-wheeler', car: 'driving', bicycle: 'bicycling', walking: 'walking' }[mode] || 'driving';
        return 'https://www.google.com/maps/dir/?api=1&destination=' + ll + '&travelmode=' + tm +
          (via.length ? '&waypoints=' + via.map(pt).join('%7C') : '');
      case 'waze': return 'https://waze.com/ul?ll=' + ll + '&navigate=yes';
      case 'yandex': return 'yandexmaps://maps.yandex.com/?rtext=~' + via.map(pt).concat([ll]).join('~') + '&rtt=auto';
      case 'apple': return 'https://maps.apple.com/?daddr=' + ll + '&dirflg=' + (mode === 'walking' ? 'w' : 'd');
      case 'here': return 'https://wego.here.com/directions/drive/mylocation/' + ll;
      default: return 'geo:' + ll + '?q=' + ll;
    }
  }

  function fmtDistance(m) { return m >= 1000 ? (m / 1000).toFixed(m >= 100000 ? 0 : 1) + ' km' : Math.round(m) + ' m'; }
  function fmtDuration(s) {
    var m = Math.round(s / 60);
    return m >= 60 ? Math.floor(m / 60) + ' sa ' + (m % 60) + ' dk' : m + ' dk';
  }
  function fmtClock(minutes) {
    var h = Math.floor(minutes / 60) % 24, m = Math.round(minutes % 60);
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  function supportsVia(app) { return app === 'google' || app === 'yandex'; }

  return { supportsVia: supportsVia, parseCoords: parseCoords, parseCsv: parseCsv, parseGpx: parseGpx, parseKml: parseKml,
    parseFile: parseFile, navLink: navLink, fmtDistance: fmtDistance, fmtDuration: fmtDuration, fmtClock: fmtClock };
});
