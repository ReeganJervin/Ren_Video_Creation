// The Instagram profile kit: pictures for the account itself, drawn by the engine like the videos.
//   node tools/instagram-profile.js        (or make-profile.bat)
// Reads the moments in instagram/profile-moments.txt and writes, in instagram/profile-kit/:
//   profile-picture.jpg          1080×1080: Ren and Yuki together, faces inside the circle Instagram shows
//   highlight-<name>.jpg         1080×1920 Highlight covers: a round picture in the middle (what the Highlight
//                                circle shows), with its name below (seen when the Story is opened)
//   meet-us-1.jpg ... -4.jpg     1080×1350 carousel "Meet Ren & Yuki": who they are, and where their story starts
// No voices are needed, and nothing goes online.
const fs = require('fs'), path = require('path'), http = require('http');
const { checkStory, ROOT } = require('./story-check');

const SRC = path.join(ROOT, 'instagram', 'profile-moments.txt'), OUT = path.join(ROOT, 'instagram', 'profile-kit');
const BUILD = path.join(ROOT, 'build', '_instagram-profile');
const fail = m => { console.error('\n' + m + '\n'); process.exit(1); };

// The Highlight covers: which moment, the name under it, and which faces it is centred on
const HIGHLIGHTS = [
  { file: 'our-story', moment: 'look', label: 'Our Story', on: ['ren', 'yuki'] },
  { file: 'couple-things', moment: 'hug', label: 'Couple Things', on: ['ren', 'yuki'] },
  { file: 'ren', moment: 'ren', label: 'Ren', on: ['ren'] },
  { file: 'yuki', moment: 'yuki', label: 'Yuki', on: ['yuki'] },
  { file: 'episodes', moment: 'star', label: 'Episodes', on: ['ren', 'yuki'] },
];
// The "Meet Ren & Yuki" carousel: a moment, a big title and two small lines
const MEET = [
  { moment: 'together', on: ['ren', 'yuki'], title: 'Meet Ren & Yuki', lines: ['A fox and a bunny.', 'Cute couple moments, every week.'] },
  { moment: 'ren', on: ['ren'], title: 'Ren', lines: ['Dramatic. Always hungry.', 'Says he is a great explorer.'] },
  { moment: 'yuki', on: ['yuki'], title: 'Yuki', lines: ['Sweet. A little moody.', 'Always right. Always.'] },
  { moment: 'look', on: ['ren', 'yuki'], title: 'Their story starts here', lines: ['Watch Part 1: How We Met', 'Then follow for Couple Things!'] },
];

// "# moment: name +1.5" lines -> { name: time in seconds }
function moments(text, plan) {
  const lines = text.split(/\r?\n/), out = {};
  lines.forEach((l, i) => {
    const m = l.match(/^#\s*moment:\s*([\w-]+)\s*(?:\+\s*([\d.]+))?\s*$/i);
    if (!m) return;
    const next = plan.lineTimes.find(([n]) => n > i + 1);
    if (!next) fail(`"# moment: ${m[1]}" (line ${i + 1}) needs a story line after it.`);
    out[m[1]] = next[1] + (m[2] ? +m[2] : 0);
  });
  return out;
}

function serve() {
  const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png' };
  const server = http.createServer((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(r => server.listen(0, '127.0.0.1', () => r(server)));
}

// Draws one picture in the engine's page: the story at t (clean: no bubbles), cut around the faces of `on`
// into a W×H picture; kind 'profile' (square), 'highlight' (round picture on a plain background, with a label)
// or 'card' (big title and lines over the picture). Returns a JPEG data URL.
const draw = (page, o) => page.evaluate(async o => {
  const film = document.getElementById('film');
  StudioFilm.render(o.t, true);
  const faces = StudioFilm.faces(o.t).filter(f => o.on.includes(f.id));
  if (!faces.length) throw new Error(`no face of ${o.on.join(' or ')} at ${o.t.toFixed(1)} s`);
  // the middle of the faces, and how far apart they are
  const x0 = Math.min(...faces.map(f => f.box.x0)), x1 = Math.max(...faces.map(f => f.box.x1));
  const y0 = Math.min(...faces.map(f => f.box.y0)), y1 = Math.max(...faces.map(f => f.box.y1));
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const cv = Object.assign(document.createElement('canvas'), { width: o.W, height: o.H }), g = cv.getContext('2d');
  g.imageSmoothingQuality = 'high';
  // a square or tall part of the film around the faces (s: its width), kept inside the film
  const crop = (s, ratio, lift) => {
    const w = Math.min(s, film.width), h = Math.min(w * ratio, film.height);
    const sx = Math.max(0, Math.min(film.width - w, cx - w / 2)), sy = Math.max(0, Math.min(film.height - h, cy - h * lift));
    return [sx, sy, w, h];
  };
  const text = (s, y, size, color = '#fff4e4', line = '#4a2616', maxW = o.W - 120) => {
    g.font = `700 ${size}px Fredoka`; g.wordSpacing = `${Math.round(size * 0.22)}px`;
    while (g.measureText(s).width > maxW && size > 30) { size -= 4; g.font = `700 ${size}px Fredoka`; g.wordSpacing = `${Math.round(size * 0.22)}px`; }
    g.textAlign = 'center'; g.textBaseline = 'top'; g.lineJoin = 'round';
    g.fillStyle = 'rgba(40,20,10,0.35)'; g.fillText(s, o.W / 2 + size * 0.04, y + size * 0.07);
    g.lineWidth = size * 0.17; g.strokeStyle = line; g.strokeText(s, o.W / 2, y);
    g.fillStyle = color; g.fillText(s, o.W / 2, y);
  };
  if (o.kind === 'profile') {
    // both faces fill the middle of the circle, with a little body below
    const [sx, sy, w, h] = crop(Math.max(460, (x1 - x0) * 1.38), 1, 0.38);
    g.drawImage(film, sx, sy, w, h, 0, 0, o.W, o.H);
  } else if (o.kind === 'highlight') {
    // a warm plain background, the round picture in the middle, a ring, and the name below
    const bg = g.createLinearGradient(0, 0, 0, o.H); bg.addColorStop(0, '#fff4e4'); bg.addColorStop(1, '#ffd9b0');
    g.fillStyle = bg; g.fillRect(0, 0, o.W, o.H);
    const R = 400, X = o.W / 2, Y = o.H / 2;
    const [sx, sy, w, h] = crop(Math.max(520, (x1 - x0) * 1.6), 1, 0.5);
    g.save(); g.beginPath(); g.arc(X, Y, R, 0, Math.PI * 2); g.clip(); g.drawImage(film, sx, sy, w, h, X - R, Y - R, 2 * R, 2 * R); g.restore();
    g.lineWidth = 18; g.strokeStyle = '#f39a4a'; g.beginPath(); g.arc(X, Y, R + 9, 0, Math.PI * 2); g.stroke();
    text(o.title, Y + R + 70, 96);
  } else {
    // a 4:5 card: the picture, a soft dark band at the top and the bottom, the title and the lines
    const [sx, sy, w, h] = crop(Math.max(700, (x1 - x0) * 1.9), o.H / o.W, 0.45);
    g.drawImage(film, sx, sy, w, h, 0, 0, o.W, o.H);
    const band = (ya, yb, up) => { const gr = g.createLinearGradient(0, ya, 0, yb); gr.addColorStop(up ? 1 : 0, 'rgba(30,14,8,0)'); gr.addColorStop(up ? 0 : 1, 'rgba(30,14,8,0.5)'); g.fillStyle = gr; g.fillRect(0, ya, o.W, yb - ya); };
    band(0, 340, true); band(o.H - 330, o.H, false);
    text(o.title, 100, 110);
    o.lines.forEach((l, i) => text(l, o.H - 230 + i * 82, 62));
    if (o.n) { g.wordSpacing = '0px'; g.font = '600 34px Fredoka'; const s = `${o.n}/${o.of}`, bw = g.measureText(s).width + 36; g.fillStyle = 'rgba(30,14,8,0.5)'; g.beginPath(); g.roundRect(o.W - bw - 28, 28, bw, 54, 27); g.fill(); g.fillStyle = '#fff4e4'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, o.W - 28 - bw / 2, 56); }
  }
  return cv.toDataURL('image/jpeg', 0.92);
}, o);

async function main() {
  if (!fs.existsSync(SRC)) fail(`I can't find ${path.relative(ROOT, SRC)}.`);
  const text = fs.readFileSync(SRC, 'utf8');
  const { parsed, plan } = checkStory(text, {}, SRC);
  if (parsed.errors.length || !plan || plan.errors.length) fail(`Please fix these lines in ${path.basename(SRC)}:\n\n${[...parsed.errors, ...(plan ? plan.errors : [])].join('\n')}`);
  const at = moments(text, plan);
  fs.mkdirSync(BUILD, { recursive: true }); fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(BUILD, 'plan.json'), JSON.stringify(plan));
  const server = await serve(), browser = await require('./browser').launch({ exact: true });
  try {
    const page = await browser.newPage({ viewport: { width: plan.width, height: plan.height } });
    page.on('pageerror', e => console.error('[page error]', e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/engine/page.html?plan=/build/_instagram-profile/plan.json&export=1`);
    await page.evaluate(() => FILM.ready);
    const save = (name, url) => { fs.writeFileSync(path.join(OUT, name), Buffer.from(url.split(',')[1], 'base64')); console.log('  ' + name); };
    const need = m => { if (at[m] === undefined) fail(`${path.basename(SRC)} has no "# moment: ${m}" line.`); return at[m]; };
    save('profile-picture.jpg', await draw(page, { kind: 'profile', t: need('look'), on: ['ren', 'yuki'], W: 1080, H: 1080 }));
    for (const h of HIGHLIGHTS) save(`highlight-${h.file}.jpg`, await draw(page, { kind: 'highlight', t: need(h.moment), on: h.on, title: h.label, W: 1080, H: 1920 }));
    for (const [i, m] of MEET.entries()) save(`meet-us-${i + 1}.jpg`, await draw(page, { kind: 'card', t: need(m.moment), on: m.on, title: m.title, lines: m.lines, n: i + 1, of: MEET.length, W: 1080, H: 1350 }));
    console.log(`\nDone! The pictures are in ${path.relative(ROOT, OUT)}${path.sep}`);
  } finally { await browser.close(); server.close(); }
}

main().catch(e => fail('Something went wrong: ' + (e && e.message || e)));
