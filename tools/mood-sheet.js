// Mood sheet for the characters: every mood in every view (front, three-quarter and side, both directions), plus
// talking, under the character's reference sheet. For reviewing moods (F12) and checking the rig keeps them (F3).
//
//   node tools/mood-sheet.js                 -> build/_sheet/ren-moods.png and build/_sheet/yuki-moods.png
//   node tools/mood-sheet.js yuki --out <dir> only Yuki, written into <dir>
//
// It draws with the engine's own page and its own mood-to-face code (rule R13). No voices are needed.
const fs = require('fs'), path = require('path'), http = require('http');
const ROOT = path.resolve(__dirname, '..');
const { parseStory, compileStory, CHARACTERS, MOODS, FALLBACK } = require('../engine/story.js');

const args = process.argv.slice(2), opt = k => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : null; };
const asked = args.filter(a => !a.startsWith('--') && a !== opt('out'));
const ids = asked.length ? asked.map(a => a.toLowerCase()) : Object.keys(CHARACTERS);
const bad = ids.find(id => !CHARACTERS[id]);
if (bad) { console.error(`There is no character called "${bad}". Characters: ${Object.keys(CHARACTERS).join(', ')}`); process.exit(1); }
const work = path.join(ROOT, 'build', '_sheet'), out = opt('out') || work;
fs.mkdirSync(work, { recursive: true }); fs.mkdirSync(out, { recursive: true });

// a tiny story with every character, so the page knows them all
const plan = compileStory(parseStory(`title: Mood sheet\n${ids.map((id, i) => `${id} enters${i ? ' from right to right' : ' to left'}`).join('\n')}\nnarrator: That is all.\n`), { 0: 1 });
fs.writeFileSync(path.join(work, 'moods-plan.json'), JSON.stringify(plan));

(async () => {
  const types = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
  const server = http.createServer((req, res) => {
    const f = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const browser = await require('./browser.js').launch({ exact: true });
  try {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}/engine/page.html?plan=/build/_sheet/moods-plan.json&export=1`);
    await page.evaluate(() => FILM.ready);
    for (const id of ids) {
      const ref = fs.existsSync(path.join(ROOT, 'reference', `${id}-sheet.png`)) ? `/reference/${id}-sheet.png` : null;
      const png = await page.evaluate(async ({ id, moods, fresh, ref, scale }) => {
        const VIEWS = [['front', 0], ['three-quarter, right', 0.5], ['three-quarter, left', -0.5], ['side, right', 0.9], ['side, left', -0.9], ['talking', 0, 0.8]];
        const CW = 230, CH = 300, LW = 190, TOP = 56, W = LW + CW * VIEWS.length;
        let img = null, RH = 0;
        if (ref) { img = new Image(); img.src = ref; await img.decode(); RH = Math.round(W * img.height / img.width); }
        const H = RH + TOP + CH * moods.length;
        const cv = Object.assign(document.createElement('canvas'), { width: W, height: H }), g = cv.getContext('2d');
        g.fillStyle = '#fbf6ee'; g.fillRect(0, 0, W, H);
        if (img) g.drawImage(img, 0, 0, W, RH);
        g.fillStyle = '#4a2616'; g.font = '600 20px Fredoka, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        VIEWS.forEach(([label], j) => g.fillText(label, LW + CW * (j + 0.5), RH + TOP / 2));
        moods.forEach((m, i) => {
          const y0 = RH + TOP + CH * i;
          // the new moods on a warmer background, so they stand out
          g.fillStyle = fresh.includes(m) ? '#f6e7d2' : i % 2 ? '#f4efe6' : '#fbf6ee'; g.fillRect(0, y0, W, CH);
          g.strokeStyle = 'rgba(74,38,22,0.15)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, y0); g.lineTo(W, y0); g.stroke();
          g.fillStyle = '#4a2616'; g.textAlign = 'left'; g.font = '700 26px Fredoka, sans-serif'; g.fillText(m, 18, y0 + CH / 2 - (fresh.includes(m) ? 12 : 0));
          if (fresh.includes(m)) { g.font = '600 16px Fredoka, sans-serif'; g.fillStyle = '#b4602a'; g.fillText('new (F12)', 18, y0 + CH / 2 + 18); }
          VIEWS.forEach(([, f, talk], j) => {
            g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
            StudioFilm.character(g, id, m, { x: LW + CW * (j + 0.5), y: y0 + CH - 22, scale, f, talk, t: 0.7 });
            g.restore();
          });
        });
        return cv.toDataURL('image/png');
      }, { id, moods: MOODS, fresh: Object.keys(FALLBACK), ref, scale: 250 / 345 / plan.scale });
      const file = path.join(out, `${id}-moods.png`);
      fs.writeFileSync(file, Buffer.from(png.split(',')[1], 'base64'));
      console.log(`${CHARACTERS[id].name}: ${path.relative(ROOT, file)}`);
    }
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e.message || e); process.exit(1); });
