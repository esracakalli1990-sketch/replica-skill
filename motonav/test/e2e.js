/* Browser test for MotoNav. Needs Playwright and Chromium (see README in this folder).
 *   NODE_PATH=$(npm root -g) node test/e2e.js
 * All network calls are answered locally: address search, routing server, map library
 * and tiles. The routing answers are computed from the request, so this checks how the
 * app builds requests and reads answers, not the real routing engine. */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), assert = require('assert');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.SHOTS || path.join(require('os').tmpdir(), 'motonav-shots');
fs.mkdirSync(OUT, { recursive: true });

const PLACES = {
  taksim: { lat: 41.0369, lon: 28.985, display_name: 'Taksim Meydanı, Beyoğlu, İstanbul' },
  kadikoy: { lat: 40.9903, lon: 29.0205, display_name: 'Kadıköy İskele, Kadıköy, İstanbul' },
  besiktas: { lat: 41.0422, lon: 29.0067, display_name: 'Beşiktaş Meydanı, Beşiktaş, İstanbul' },
  uskudar: { lat: 41.0255, lon: 29.0152, display_name: 'Üsküdar Meydanı, Üsküdar, İstanbul' },
  sisli: { lat: 41.0602, lon: 28.9877, display_name: 'Şişli Meydanı, Şişli, İstanbul' },
};

function serve() {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
  return new Promise(res => {
    const srv = http.createServer((q, r) => {
      let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
      r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); r.end(fs.readFileSync(f));
    }).listen(0, () => res(srv));
  });
}
const hav = (a, b) => { const t = Math.PI / 180, dl = (b.lat - a.lat) * t, dn = (b.lon - a.lon) * t;
  const x = Math.sin(dl / 2) ** 2 + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dn / 2) ** 2; return 12742000 * Math.asin(Math.sqrt(x)); };
function enc(coords) { let o = '', pl = 0, pg = 0; for (const [la, lo] of coords) { for (const v of [Math.round(la * 1e6) - pl, Math.round(lo * 1e6) - pg]) { let x = v < 0 ? ~(v << 1) : v << 1; while (x >= 32) { o += String.fromCharCode((32 | (x & 31)) + 63); x >>= 5; } o += String.fromCharCode(x + 63); } pl = Math.round(la * 1e6); pg = Math.round(lo * 1e6); } return o; }

async function setup(browser, base, opts) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, geolocation: { latitude: 40.95, longitude: 29.1 }, permissions: ['geolocation'], locale: 'tr-TR' });
  const page = await ctx.newPage(); page.setDefaultTimeout(6000);
  const log = { valhalla: [], errors: [], nav: [] };
  page.on('pageerror', e => log.errors.push(String(e)));
  page.on('dialog', d => d.dismiss());
  await ctx.route('**/*', async route => {
    const url = route.request().url();
    if (url.startsWith(base)) {
      if (opts.noMap && url.includes('leaflet.js')) return route.abort();
      return route.continue();
    }
    if (url.includes('nominatim.openstreetmap.org/search')) {
      const q = decodeURIComponent(url.split('q=')[1]).toLowerCase();
      const hit = Object.keys(PLACES).filter(k => q.includes(k)).map(k => PLACES[k]);
      return route.fulfill({ json: hit });
    }
    if (url.includes('nominatim.openstreetmap.org/reverse')) return route.fulfill({ json: { display_name: 'Test Caddesi 1, İstanbul' } });
    if (url.includes('valhalla.test')) {
      if (opts.routingDown) return route.fulfill({ status: 503, body: 'down' });
      const body = JSON.parse(route.request().postData()); log.valhalla.push({ path: new URL(url).pathname, body });
      if (url.endsWith('/sources_to_targets')) {
        const k = body.costing === 'motorcycle' ? 0.8 : 1;
        return route.fulfill({ json: { sources_to_targets: body.sources.map(a => body.targets.map(b => ({ distance: hav(a, b) * 1.3 / 1000, time: hav(a, b) * 1.3 / 11 * k }))) } });
      }
      if (url.endsWith('/route')) {
        const L = body.locations; let d = 0; for (let i = 0; i + 1 < L.length; i++) d += hav(L[i], L[i + 1]) * 1.3;
        return route.fulfill({ json: { trip: { summary: { length: d / 1000, time: d / 11 }, legs: [{ shape: enc(L.map(l => [l.lat, l.lon])) }] } } });
      }
    }
    if (url.includes('google.com/maps')) { log.nav.push(url); return route.fulfill({ body: 'ok' }); }
    if (url.includes('tile.openstreetmap.org')) return route.fulfill({ status: 204 });
    return route.abort();
  });
  await page.goto(base + '/');
  await page.evaluate(s => { const k = 'motonav.v1'; const d = JSON.parse(localStorage.getItem(k) || '{}'); d.settings = Object.assign({ lang: 'tr' }, d.settings, { server: s, lang: 'tr' }); localStorage.setItem(k, JSON.stringify(d)); }, 'https://valhalla.test');
  await page.reload();
  return { page, ctx, log };
}
async function until(fn, ms = 6000) { const t = Date.now(); for (;;) { const v = await fn(); if (v) return v; if (Date.now() - t > ms) throw new Error('timed out waiting'); await new Promise(r => setTimeout(r, 100)); } }
async function addBySearch(page, q) {
  await page.fill('#q', q); await page.press('#q', 'Enter');
  await page.locator('#results button').first().click();
  await page.waitForSelector('#results', { state: 'hidden' }).catch(() => {});
}

(async () => {
  const srv = await serve(); const base = 'http://localhost:' + srv.address().port;
  const browser = await chromium.launch(); let failed = 0;
  const step = async (name, fn) => { try { await fn(); console.log('ok   ' + name); } catch (e) { failed++; console.log('FAIL ' + name + '\n     ' + String(e.message).split('\n')[0]); } };

  const { page, log } = await setup(browser, base, {});
  await step('home screen has the menu and the bottom tabs', async () => {
    assert.strictEqual(await page.title(), 'MotoNav');
    assert.ok((await page.locator('.menu button').count()) >= 9);
    assert.strictEqual(await page.locator('.tabs button').count(), 4);
    await page.screenshot({ path: path.join(OUT, '01-home.png') });
  });
  await step('create a route and add stops by address search and by coordinates', async () => {
    await page.click('text=Yeni rota oluştur');
    for (const q of ['taksim', 'kadikoy', 'besiktas', 'uskudar']) await addBySearch(page, q);
    await page.click('button[aria-label="Ekle"]'); await page.click('text=Koordinat yapıştır');
    await page.fill('.sheet input', '41.0602, 28.9877'); await page.click('.sheet .primary');
    assert.strictEqual(await page.locator('.stop').count(), 5);
  });
  await step('optimise: motorcycle is the default and the engine is asked for it', async () => {
    await page.click('text=Optimize et');
    assert.strictEqual(await page.locator('.modes button[aria-pressed="true"]').innerText().then(s => s.includes('Motosiklet')), true);
    await page.screenshot({ path: path.join(OUT, '02-optimise.png') });
    await page.locator('.radio input[value="distance"]').check();
    await page.locator('.sheet .primary').click();
    await page.waitForSelector('.banner:has-text("km")');
    const m = log.valhalla.find(x => x.path === '/sources_to_targets');
    assert.strictEqual(m.body.costing, 'motorcycle');
    assert.strictEqual(m.body.costing_options.motorcycle.shortest, true);
    assert.strictEqual(m.body.sources.length, 6); // my location + 5 stops
  });
  await step('result shows numbered stops with planned times and no estimate warning', async () => {
    assert.strictEqual(await page.locator('.banner .warn').count(), 0);
    const times = await page.locator('.stop .time').allInnerTexts();
    assert.strictEqual(times.length, 5);
    assert.ok(times.every(x => /^\d\d:\d\d$/.test(x)), times.join());
    assert.ok(times[0] >= '08:00' && [...times].sort().join() === times.join(), 'times rise: ' + times);
    await page.screenshot({ path: path.join(OUT, '03-result.png') });
  });
  await step('the vehicle choice reaches the engine (car -> auto, duration -> no shortest)', async () => {
    log.valhalla.length = 0;
    await page.click('text=Optimize et');
    await page.locator('.modes button', { hasText: 'Araba' }).click();
    await page.locator('.radio input[value="duration"]').check();
    await page.locator('.sheet .primary').click();
    const m = await until(() => log.valhalla.find(x => x.path === '/sources_to_targets'));
    assert.strictEqual(m.body.costing, 'auto');
    assert.ok(!('shortest' in m.body.costing_options.auto));
  });
  await step('a fixed start stop is honoured', async () => {
    await page.click('text=Optimize et');
    const third = await page.locator('.sheet select').first().locator('option').nth(3).getAttribute('value');
    await page.locator('.sheet select').first().selectOption(third);
    log.valhalla.length = 0;
    await page.locator('.sheet .primary').click();
    await until(() => log.valhalla.find(x => x.path === '/route'));
    await until(() => page.evaluate(id => window.MotoNavDebug.state().routes[0].stops[0].id === id, third));
  });
  await step('map tab draws one numbered marker per stop and a route line', async () => {
        await page.click('button:has-text("Harita")');
    await page.waitForSelector('.leaflet-marker-icon');
    assert.strictEqual(await page.locator('.leaflet-marker-icon').count(), 5);
    assert.ok(await page.locator('path.leaflet-interactive').count() >= 1);
    await page.screenshot({ path: path.join(OUT, '04-map.png') });
    await page.click('button:has-text("Liste")');
  });
  await step('done and failed marks stick, navigate opens a motorcycle link', async () => {
    await page.locator('.stop').nth(0).locator('button[aria-label="Tamam"]').click();
    await page.locator('.stop').nth(1).locator('button[aria-label="Olmadı"]').click();
    assert.ok(await page.locator('.stop.done').count() === 1 && await page.locator('.stop.failed').count() === 1);
    await page.click('button[aria-label="Yol tarifi"]');
    const url = await until(() => log.nav[0]);
    assert.match(url, /maps\/dir\/\?api=1&destination=.*&travelmode=(driving|two-wheeler)/);
    assert.match(url, /two-wheeler|driving/);
  });
  await step('with shortest distance, navigating hands Google Maps a route through via points', async () => {
    await page.click('text=Optimize et');
    await page.locator('.modes button', { hasText: 'Motosiklet' }).click();
    await page.locator('.radio input[value="distance"]').check();
    await page.locator('.sheet .primary').click();
    await until(() => page.evaluate(() => window.MotoNavDebug.state().routes[0].method === 'distance'));
    await until(() => page.evaluate(() => !!window.MotoNavDebug.state().routes[0].plan));
    log.valhalla.length = 0; log.nav.length = 0;
    await page.locator('.stop.failed, .stop.done').first().waitFor().catch(() => {});
    await page.click('button[aria-label="Yol tarifi"]');
    const url = await until(() => log.nav[0]);
    assert.ok(/travelmode=two-wheeler&waypoints=/.test(url), 'link was: ' + url + ' routing calls: ' + JSON.stringify(log.valhalla.map(x => x.path)));
    const r = log.valhalla.filter(x => x.path === '/route' && x.body.locations.length === 2).pop();
    assert.ok(r, 'no two-point route request');
    assert.strictEqual(r.body.costing_options.motorcycle.shortest, true);
    assert.ok(url.split('waypoints=')[1].split('%7C').length >= 1);
  });
  await step('import a CSV into the address book and the route', async () => {
    await page.click('button[aria-label="Ekle"]'); await page.click('text=Durakları içe aktar');
    fs.writeFileSync(path.join(OUT, 'in.csv'), 'ad;enlem;boylam;telefon\nDepo;41,10;29,00;0532\nŞube;41,11;29,01;\n');
    await page.setInputFiles('.sheet input[type=file]', path.join(OUT, 'in.csv'));
    await page.waitForSelector('.stop:nth-child(7)');
    assert.strictEqual(await page.locator('.stop').count(), 7);
    assert.strictEqual(await page.evaluate(() => window.MotoNavDebug.state().book.length), 2);
  });
  await step('data survives a reload', async () => {
    await page.reload();
    await page.click('.tabs button:nth-child(2)');
    assert.ok(await page.locator('.card', { hasText: 'Rota 1' }).count() === 1);
  });
  await step('stop text is shown as text, never run as HTML', async () => {
    await page.evaluate(() => { const s = window.MotoNavDebug.state(); s.routes[0].stops[0].label = '<img src=x onerror="window.__pwned=1">'; localStorage.setItem('motonav.v1', JSON.stringify(Object.assign({}, s, { ui: undefined }))); });
    await page.reload(); await page.click('.tabs button:nth-child(2)'); await page.locator('.card', { hasText: 'Rota 1' }).click();
    await page.waitForSelector('.stop');
    assert.strictEqual(await page.evaluate(() => window.__pwned || 0), 0);
    assert.ok((await page.locator('.stop').first().innerText()).includes('<img'));
  });
  await step('no script errors on the way', async () => assert.deepStrictEqual(log.errors, []));
  await page.context().close();

  const down = await setup(browser, base, { routingDown: true });
  await step('with the routing server down the app still plans and says it is an estimate', async () => {
    const p = down.page;
    await p.click('text=Yeni rota oluştur');
    for (const q of ['taksim', 'kadikoy', 'besiktas']) await addBySearch(p, q);
    await p.click('text=Optimize et'); await p.locator('.sheet .primary').click();
    await p.waitForSelector('.banner .warn');
    assert.ok((await p.locator('.banner .warn').innerText()).includes('Tahmini'));
    await p.screenshot({ path: path.join(OUT, '05-estimate.png') });
  });
  await step('no script errors with the server down', async () => assert.deepStrictEqual(down.log.errors, []));
  await down.ctx.close();

  const nomap = await setup(browser, base, { noMap: true });
  await step('without the map library the list still works and the map tab explains', async () => {
    const p = nomap.page; await p.click('text=Yeni rota oluştur'); await addBySearch(p, 'taksim');
    await p.click('button:has-text("Harita")'); await p.waitForSelector('.nomap');
    assert.deepStrictEqual(nomap.log.errors, []);
  });
  await nomap.ctx.close();
  await browser.close(); srv.close();
  console.log(failed ? failed + ' failed' : 'all passed'); console.log('screenshots: ' + OUT);
  process.exit(failed ? 1 : 0);
})();
