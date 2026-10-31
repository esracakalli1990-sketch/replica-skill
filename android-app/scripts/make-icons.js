// Renders the launcher icons and splash screens from the MotoNav mark.
// Dev tool: needs Playwright and Chromium (NODE_PATH=$(npm root -g) node scripts/make-icons.js).
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const RES = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');
const BG = '#0d1014', ACCENT = '#c6f135';
// The mark in a 512 box: an M that is also a road, with a pin dot under it.
const MARK = `<path d="M120 380V150l136 150 136-150v230" fill="none" stroke="${ACCENT}" stroke-width="52" stroke-linecap="round" stroke-linejoin="round"/><circle cx="256" cy="400" r="26" fill="${ACCENT}"/>`;
const svg = (size, inner) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">${inner}</svg>`;
const full = size => svg(size, `<rect width="512" height="512" rx="112" fill="${BG}"/>${MARK}`);
const round = size => svg(size, `<circle cx="256" cy="256" r="256" fill="${BG}"/><g transform="translate(256 256) scale(.78) translate(-256 -256)">${MARK}</g>`);
// adaptive foreground: the mark inside the central 61% that every launcher shape keeps
const fore = size => svg(size, `<g transform="translate(256 256) scale(.56) translate(-256 -270)">${MARK}</g>`);
const dens = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const splash = { port: { mdpi: [320, 480], hdpi: [480, 800], xhdpi: [720, 1280], xxhdpi: [960, 1600], xxxhdpi: [1280, 1920] } };

(async () => {
  const browser = await chromium.launch(); const page = await browser.newPage();
  async function png(file, w, h, body, transparent) {
    await page.setViewportSize({ width: w, height: h });
    await page.setContent(`<style>html,body{margin:0;width:${w}px;height:${h}px;background:${transparent ? 'transparent' : BG};display:grid;place-items:center;overflow:hidden}</style>${body}`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    await page.screenshot({ path: file, omitBackground: !!transparent });
  }
  for (const [d, k] of Object.entries(dens)) {
    await png(path.join(RES, `mipmap-${d}`, 'ic_launcher.png'), 48 * k, 48 * k, full(48 * k), true);
    await png(path.join(RES, `mipmap-${d}`, 'ic_launcher_round.png'), 48 * k, 48 * k, round(48 * k), true);
    await png(path.join(RES, `mipmap-${d}`, 'ic_launcher_foreground.png'), 108 * k, 108 * k, fore(108 * k), true);
  }
  for (const [d, [w, h]] of Object.entries(splash.port)) {
    const s = Math.round(w * 0.34);
    const body = `<div style="display:grid;place-items:center;width:${w}px;height:${h}px;background:${BG}">${full(s)}</div>`;
    await png(path.join(RES, `drawable-port-${d}`, 'splash.png'), w, h, body);
    const lbody = `<div style="display:grid;place-items:center;width:${h}px;height:${w}px;background:${BG}">${full(Math.round(w * 0.34))}</div>`;
    await png(path.join(RES, `drawable-land-${d}`, 'splash.png'), h, w, lbody);
  }
  await png(path.join(RES, 'drawable', 'splash.png'), 480, 800, `<div style="display:grid;place-items:center;width:480px;height:800px;background:${BG}">${full(160)}</div>`);
  await browser.close();
  console.log('icons and splash written to', RES);
})();
