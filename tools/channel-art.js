// The YouTube channel's art, drawn with the engine's own characters, meadow and logo (so it matches the videos):
//
//   node tools/channel-art.js        -> channel/ (profile picture, banner, watermark, a banner preview with
//                                       YouTube's safe areas, and channel-about.txt with the texts to paste)
//
// Upload in YouTube Studio > Customisation > Branding (picture, banner, video watermark) and > Basic info (texts).
const fs = require('fs'), path = require('path'), http = require('http');
const ROOT = path.resolve(__dirname, '..');
const { parseStory, compileStory } = require('../engine/story.js');

const OUT = path.join(ROOT, 'channel'), work = path.join(ROOT, 'build', '_channel');
fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(work, { recursive: true });
const plan = compileStory(parseStory('title: Channel\nplace: meadow\ntime: day\nren enters to left\nyuki enters from right to right\nnarrator: Hello.\n'), { 0: 1 });
fs.writeFileSync(path.join(work, 'plan.json'), JSON.stringify(plan));

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
    await page.goto(`http://127.0.0.1:${server.address().port}/engine/page.html?plan=/build/_channel/plan.json&export=1`);
    await page.evaluate(() => FILM.ready);
    const files = await page.evaluate(async ({ ks }) => {
      const F = StudioFilm, A = F.art, TAU = Math.PI * 2;
      // The engine draws in 1920 x 1080 picture pixels and sets its transforms itself; a canvas whose setTransform
      // scales by S and shifts by (ox, oy) draws the same picture bigger and sharp, or any part of it.
      const sheet = (w, h, S, ox = 0, oy = 0) => {
        const cv = Object.assign(document.createElement('canvas'), { width: w, height: h }), g = cv.getContext('2d');
        const set = g.setTransform.bind(g);
        g.setTransform = (a, b, c, d, e, f) => (typeof a === 'object' ? set(a) : set(a * S, b * S, c * S, d * S, e * S + ox, f * S + oy));
        g.resetTransform = () => g.setTransform(1, 0, 0, 1, 0, 0);
        g.setTransform(1, 0, 0, 1, 0, 0);
        return { cv, g };
      };
      const px = h => h / 345 / ks;   // a character this many pixels tall
      const pose = (g, id, mood, o) => { g.setTransform(1, 0, 0, 1, 0, 0); F.character(g, id, mood, { t: 0.7, ...o }); };
      // little sparkles and petals (fixed, so the art is the same every time)
      const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
      const sparkle = (g, x, y, r, col) => {
        g.save(); g.translate(x, y); g.fillStyle = col; g.beginPath();
        for (let i = 0; i < 8; i++) { const a = i * TAU / 8, rr = i % 2 ? r * 0.32 : r; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
        g.closePath(); g.fill(); g.restore();
      };
      const petal = (g, x, y, r, rot) => {
        g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = 'rgba(248,170,192,0.9)';
        g.beginPath(); g.moveTo(0, -r); g.bezierCurveTo(r * 0.9, -r * 0.6, r * 0.7, r * 0.8, 0, r); g.bezierCurveTo(-r * 0.7, r * 0.8, -r * 0.9, -r * 0.6, 0, -r); g.fill();
        g.restore();
      };
      const out = {};

      // ---- banner: 2560 x 1440 (the whole 1920 x 1080 picture, 4/3 bigger). Everything that matters stays in the
      // middle 1546 x 423 (what phones show); computers show the middle 2560 x 423 band, TVs all of it.
      {
        const { cv, g } = sheet(2560, 1440, 2560 / 1920);
        A.backdrop(g, 0, 0.15);
        g.setTransform(1, 0, 0, 1, 0, 0);
        // a soft light behind the logo, so it reads on the meadow
        const glow = g.createRadialGradient(960, 520, 40, 960, 520, 520); glow.addColorStop(0, 'rgba(255,250,238,0.75)'); glow.addColorStop(1, 'rgba(255,250,238,0)');
        g.fillStyle = glow; g.fillRect(300, 250, 1320, 560);
        for (let i = 0; i < 26; i++) petal(g, 120 + rnd() * 1680, 60 + rnd() * 960, 7 + rnd() * 7, rnd() * TAU);
        for (let i = 0; i < 18; i++) sparkle(g, 420 + rnd() * 1080, 300 + rnd() * 120, 5 + rnd() * 8, 'rgba(255,255,255,0.9)');
        A.logo(g, 10, 0, 560, 116);
        A.bigText(g, 'Cozy adventures for the whole family', 960, 596, 900, 38);
        // (the phone's box is x 380..1540, y 381..699 of the picture: ears and paws stay inside it)
        pose(g, 'ren', 'happy', { x: 478, y: 688, scale: px(250), f: 0.25, lookX: 0.3, wave: 0.9 });
        pose(g, 'yuki', 'joy', { x: 1448, y: 688, scale: px(250), f: -0.25, lookX: -0.3 });
        out.banner = cv.toDataURL('image/png');
        // the same with YouTube's areas marked, to check it (not for uploading)
        g.resetTransform = null; const raw = Object.getPrototypeOf(g).setTransform.bind(g); raw(1, 0, 0, 1, 0, 0);
        g.lineWidth = 6; g.setLineDash([24, 14]);
        g.strokeStyle = '#ffffff'; g.strokeRect(3, 508.5, 2554, 423); g.strokeStyle = '#ff3b6b'; g.strokeRect(507, 508.5, 1546, 423);
        g.setLineDash([]); g.font = '600 34px Fredoka, sans-serif'; g.fillStyle = '#ffffff'; g.textAlign = 'left';
        g.fillText('TV: the whole picture', 30, 60); g.fillText('Computer: the white band', 30, 495);
        g.fillStyle = '#ff3b6b'; g.fillText('Phone: the pink box (always visible)', 520, 970);
        out.bannerPreview = cv.toDataURL('image/png');
      }

      // ---- profile picture: 800 x 800, shown as a circle (as small as 98 px): the two faces, close together
      const profile = (size, clipCircle) => {
        const S = size / 520, { cv, g } = sheet(size, size, S, -700 * S, -230 * S);   // shows x 700..1220, y 230..750
        if (clipCircle) { const set = Object.getPrototypeOf(g).setTransform.bind(g); set(1, 0, 0, 1, 0, 0); g.beginPath(); g.arc(size / 2, size / 2, size / 2, 0, TAU); g.clip(); }
        g.setTransform(1, 0, 0, 1, 0, 0);
        const bg = g.createRadialGradient(960, 440, 30, 960, 520, 380);
        bg.addColorStop(0, '#fff8ea'); bg.addColorStop(0.55, '#ffe4cf'); bg.addColorStop(1, '#f9c9c4');
        g.fillStyle = bg; g.fillRect(700, 230, 520, 520);
        // a soft green hill at the bottom, like the meadow
        g.fillStyle = '#9fd77f'; g.beginPath(); g.ellipse(960, 830, 420, 150, 0, 0, TAU); g.fill();
        g.fillStyle = '#86c96a'; g.beginPath(); g.ellipse(960, 860, 380, 120, 0, 0, TAU); g.fill();
        for (let i = 0; i < 9; i++) sparkle(g, 730 + rnd() * 460, 255 + rnd() * 140, 5 + rnd() * 6, 'rgba(255,255,255,0.95)');
        // cheek to cheek, both faces well inside the circle
        pose(g, 'yuki', 'joy', { x: 1068, y: 800, scale: px(430), f: -0.2, lookX: -0.2 });
        pose(g, 'ren', 'happy', { x: 866, y: 812, scale: px(430), f: 0.2, lookX: 0.2 });
        return cv;
      };
      out.profile = profile(800, false).toDataURL('image/png');
      // how it looks as YouTube shows it: a circle, big and small (not for uploading)
      {
        const cv = Object.assign(document.createElement('canvas'), { width: 1000, height: 820 }), g = cv.getContext('2d');
        g.fillStyle = '#ffffff'; g.fillRect(0, 0, 1000, 820);
        const big = profile(800, true); g.drawImage(big, 10, 10);
        [[98, 840, 60], [48, 865, 200], [36, 871, 290]].forEach(([d, x, y]) => g.drawImage(big, x, y, d, d));
        g.fillStyle = '#333'; g.font = '600 18px Fredoka, sans-serif'; g.fillText('98 px', 850, 180); g.fillText('48 px', 865, 270); g.fillText('36 px', 865, 350);
        out.profilePreview = cv.toDataURL('image/png');
      }
      // ---- video watermark: 150 x 150, round, see-through around it (YouTube shows it in the corner of every video)
      out.watermark = profile(150, true).toDataURL('image/png');
      return out;
    }, { ks: plan.scale });
    const names = { profile: 'profile-picture-800.png', banner: 'banner-2560x1440.png', bannerPreview: 'banner-preview-safe-areas.png', profilePreview: 'profile-preview-circle.png', watermark: 'watermark-150.png' };
    for (const [k, f] of Object.entries(names)) {
      fs.writeFileSync(path.join(OUT, f), Buffer.from(files[k].split(',')[1], 'base64'));
      console.log('  ' + path.join('channel', f));
    }
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e.message || e); process.exit(1); });
