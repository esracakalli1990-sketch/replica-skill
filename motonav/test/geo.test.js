const test = require('node:test');
const assert = require('node:assert');
const G = require('../lib/geo.js');

test('coordinates in common spellings', () => {
  assert.deepStrictEqual(G.parseCoords('41.0082, 28.9784'), { lat: 41.0082, lng: 28.9784 });
  assert.deepStrictEqual(G.parseCoords('41,0082 28,9784'), { lat: 41.0082, lng: 28.9784 });
  assert.deepStrictEqual(G.parseCoords('-33.86;151.2'), { lat: -33.86, lng: 151.2 });
  assert.strictEqual(G.parseCoords('95, 10'), null);
  assert.strictEqual(G.parseCoords('Taksim'), null);
});

test('csv with semicolons, quotes and Turkish headers', () => {
  const r = G.parseCsv('﻿ad;adres;enlem;boylam;telefon\n"Ali; Veli";Kadıköy;40,99;29,02;0530\nEv;Moda Cd. 5;;;\n;;;;\n');
  assert.strictEqual(r.rows.length, 2);
  assert.deepStrictEqual([r.rows[0].name, r.rows[0].lat, r.rows[0].lng, r.rows[0].phone], ['Ali; Veli', 40.99, 29.02, '0530']);
  assert.strictEqual(r.rows[1].needsGeocode, true);
  assert.strictEqual(r.skipped, 1);
});

test('csv without usable columns says why', () => {
  assert.match(G.parseCsv('a,b\n1,2').error, /no address/);
});

test('gpx waypoints', () => {
  const r = G.parseGpx('<gpx><wpt lat="41.1" lon="29.1"><name>A &amp; B</name></wpt><wpt lat="41.2" lon="29.2"/><wpt lat="999" lon="1"/></gpx>');
  assert.deepStrictEqual(r.rows, [{ name: 'A & B', lat: 41.1, lng: 29.1 }, { name: '', lat: 41.2, lng: 29.2 }]);
});

test('kml points are lon,lat', () => {
  const r = G.parseKml('<kml><Placemark><name><![CDATA[Depo]]></name><Point><coordinates>29.5,41.5,0</coordinates></Point></Placemark><Placemark><LineString><coordinates>1,2</coordinates></LineString></Placemark></kml>');
  assert.deepStrictEqual(r.rows, [{ name: 'Depo', lat: 41.5, lng: 29.5 }]);
});

test('file type routing and xls message', () => {
  assert.strictEqual(G.parseFile('a.GPX', '<wpt lat="1" lon="2"/>').rows.length, 1);
  assert.match(G.parseFile('a.xls', '').error, /CSV, GPX or KML/);
});

test('navigation links use the right mode for a motorcycle', () => {
  const s = { lat: 41.1, lng: 29.2 };
  assert.match(G.navLink('google', s, 'motorcycle'), /travelmode=two-wheeler/);
  assert.match(G.navLink('google', s, 'car'), /travelmode=driving/);
  assert.strictEqual(G.navLink('waze', s), 'https://waze.com/ul?ll=41.1,29.2&navigate=yes');
  assert.match(G.navLink('yandex', s), /^yandexmaps:\/\//);
});

test('formatting', () => {
  assert.strictEqual(G.fmtDistance(850), '850 m');
  assert.strictEqual(G.fmtDistance(10880), '10.9 km');
  assert.strictEqual(G.fmtDuration(3900), '1 sa 5 dk');
  assert.strictEqual(G.fmtClock(485), '08:05');
});

test('google link carries via points as waypoints, in order', () => {
  const url = G.navLink('google', { lat: 41.1, lng: 29.2 }, 'motorcycle', [[41.01, 29.01], [41.02, 29.02]]);
  assert.match(url, /destination=41\.1,29\.2&travelmode=two-wheeler&waypoints=41\.010000,29\.010000%7C41\.020000,29\.020000$/);
  assert.ok(!/waypoints/.test(G.navLink('google', { lat: 1, lng: 2 }, 'car')));
});

test('yandex link lists via points before the destination, starting from the current position', () => {
  assert.strictEqual(G.navLink('yandex', { lat: 41.1, lng: 29.2 }, 'car', [[41.01, 29.01]]),
    'yandexmaps://maps.yandex.com/?rtext=~41.010000,29.010000~41.1,29.2&rtt=auto');
});

test('only google and yandex take via points', () => {
  assert.ok(G.supportsVia('google') && G.supportsVia('yandex'));
  assert.ok(!G.supportsVia('waze') && !G.supportsVia('apple'));
  assert.strictEqual(G.navLink('waze', { lat: 1, lng: 2 }, 'car', [[3, 4]]), 'https://waze.com/ul?ll=1,2&navigate=yes');
});
