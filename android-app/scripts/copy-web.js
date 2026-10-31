// Copies the MotoNav web app into www/, the folder Capacitor packs into the APK.
const fs = require('fs'), path = require('path');
const from = path.join(__dirname, '..', '..', 'motonav'), to = path.join(__dirname, '..', 'www');
const skip = new Set(['test', 'README.md', 'sw.js', 'node_modules']);
fs.rmSync(to, { recursive: true, force: true });
(function copy(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const f of fs.readdirSync(src)) {
    if (src === from && skip.has(f)) continue;
    const s = path.join(src, f), d = path.join(dst, f);
    fs.statSync(s).isDirectory() ? copy(s, d) : fs.copyFileSync(s, d);
  }
})(from, to);
console.log('copied web app to', to);
