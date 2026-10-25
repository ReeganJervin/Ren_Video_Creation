// Draws docs/youtube-end-screen.png: the end screen (F11) with the places for YouTube's end-screen elements marked,
// to follow in YouTube Studio ("Editor" > "End screen").   node tools/end-screen-guide.js
// It compiles a tiny story with an end screen and draws it with the engine's own page (rule R13). No voices needed.
const fs = require('fs'), path = require('path'), http = require('http');
const ROOT = path.resolve(__dirname, '..');
const { parseStory, compileStory } = require('../engine/story.js');

const plan = compileStory(parseStory('title: End screen guide\nplace: meadow\nending: end screen\nren enters\nren: Hello!\n'), {});
const work = path.join(ROOT, 'build', '_guide'); fs.mkdirSync(work, { recursive: true });
fs.writeFileSync(path.join(work, 'plan.json'), JSON.stringify(plan));
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2' }[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
server.listen(0, '127.0.0.1', async () => {
  const browser = await require('./browser').launch({ exact: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(`http://127.0.0.1:${server.address().port}/engine/page.html?plan=/build/_guide/plan.json&export=1`);
  await page.evaluate(() => FILM.ready);
  const png = await page.evaluate(t => {
    FILM.render(t);
    const L = StudioFilm.END_LAYOUT, cv = document.getElementById('film'), g = cv.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    const label = (text, x, y, size = 34) => {
      g.font = `700 ${size}px Fredoka, sans-serif`; g.textAlign = 'center'; g.lineJoin = 'round';
      g.lineWidth = size * 0.22; g.strokeStyle = '#ffffff'; g.strokeText(text, x, y); g.fillStyle = '#c0302a'; g.fillText(text, x, y);
    };
    g.setLineDash([]); g.lineWidth = 6; g.strokeStyle = '#c0302a';
    L.videos.forEach((v, i) => {
      g.lineWidth = 6; g.strokeStyle = '#c0302a'; g.strokeRect(v.x, v.y, v.w, v.h);
      label(`Element ${i + 1}: Video`, v.x + v.w / 2, v.y + v.h / 2 - 6);
      label(i ? '"Best for viewer"' : '"Most recent upload" or a video', v.x + v.w / 2, v.y + v.h / 2 + 38, 26);
      label(`x ${Math.round(v.x / 19.2)}%, y ${Math.round(v.y / 10.8)}%, ${Math.round(v.w / 19.2)}% wide`, v.x + v.w / 2, v.y + v.h - 18, 22);
    });
    const s = L.subscribe;
    g.lineWidth = 6; g.strokeStyle = '#c0302a'; g.beginPath(); g.arc(s.x, s.y, s.r, 0, Math.PI * 2); g.stroke();
    label('Element 3: Subscribe', s.x, s.y + 8, 30);
    label('YouTube Studio > Editor > End screen: add these 3 elements over the soft panels (the last 20 s)', 960, 1050, 30);
    return cv.toDataURL('image/png');
  }, plan.youtube.end.t0 + 8);
  const out = path.join(ROOT, 'docs', 'youtube-end-screen.png');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.from(png.split(',')[1], 'base64'));
  await browser.close(); server.close();
  console.log('End screen guide: ' + path.relative(ROOT, out));
});
