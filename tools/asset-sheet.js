// Review sheet for an asset: the asset next to Ren and Yuki at the same scale, in every state, at every time of day.
//
//   node tools/asset-sheet.js lantern                       -> build/_sheet/lantern-sheet.png
//   node tools/asset-sheet.js owl --ref reference/owl.png    also shows a reference picture
//   node tools/asset-sheet.js "cottage garden" --out <dir>   writes the sheet into <dir>
//
// It writes small test stories, compiles them with the engine and draws the frames with the engine's own page
// (rule R13: it only calls the engine). No voices are needed.
const fs = require('fs'), path = require('path'), http = require('http');
const ROOT = path.resolve(__dirname, '..');
const { parseStory, compileStory } = require('../engine/story.js');
const { ASSETS } = require('../engine/assets.js');

const args = process.argv.slice(2), opt = k => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : null; };
const name = args.find(a => !a.startsWith('--') && a !== opt('ref') && a !== opt('out'));
if (!name) { console.error('Which asset? For example: node tools/asset-sheet.js lantern'); process.exit(1); }
const norm = s => s.toLowerCase().trim().replace(/^the /, '').replace(/[-_\s]+/g, ' ');
const asset = Object.values(ASSETS).find(a => a.names.includes(norm(name)));
if (!asset) { console.error(`There is no asset called "${name}" yet.`); process.exit(1); }
const N = asset.names[0], TIMES = ['day', 'sunset', 'dusk', 'night'];
const work = path.join(ROOT, 'build', '_sheet'), out = opt('out') || work;
fs.mkdirSync(work, { recursive: true }); fs.mkdirSync(out, { recursive: true });

// one test story per time of day, and the moments to show from it: [{ t, label, crop }]
function storyFor(time) {
  const head = `title: ${N} sheet\nplace: ${asset.kind === 'place' ? N : 'meadow'}\ntime: ${time}\n`;
  if (asset.kind === 'place') return head + 'wait 0.6\nren enters to left\n+ yuki enters from right to right\nwait 0.6\nren walks to center\nwait 0.6\nnarrator: That is all.\n';
  if (asset.kind === 'extra') return head + `ren enters to right\nwait 0.4\n${N} enters\nwait 1.2\n${N}: Hello! I am the ${N}.\nwait 1.2\n${asset.moves === 'fly' ? `${N} lands\nwait 1\n${N} takes off\nwait 0.8\n` : `${N} hops\nwait 0.6\n`}narrator: That is all.\n`;
  const st = asset.states || [];
  return head + 'ren enters to left\n+ yuki enters from right to right\nwait 0.4\n' + `${N} appears at center\nwait 1\n` +
    (st.includes('open') ? `the ${N} opens\nwait 1\n` : '') + (asset.glow ? `the ${N} glows\nwait 1.2\n` : '') + 'narrator: That is all.\n';
}
function momentsFor(plan) {
  const M = [];
  if (asset.kind === 'place') {
    const w = plan.actors.ren.walks;
    M.push({ t: 1.0, label: 'empty' }, { t: w[0].t1 + 0.5, label: 'left and right spots' }, { t: w[1].t1 + 0.5, label: 'center spot' });
    return M;
  }
  if (asset.kind === 'extra') {
    const a = plan.actors[asset.id], enter = a.walks[0], v = plan.voice.find(x => x.who === asset.id);
    const blink = a.blinks.find(b => b > enter.t1 + 0.2 && b < v.t) || a.blinks.find(b => b > enter.t1);
    M.push({ t: enter.t1 + 0.3, label: 'idle', on: asset.id }, { t: blink + 0.09, label: 'blink', on: asset.id }, { t: v.t + Math.min(0.6, v.len / 2), label: 'talking', on: asset.id, wide: true });
    // flyers: landing, landed (wings folded) and taking off
    const air = a.keys.air;
    if (air) M.push({ t: air[1][0] + 0.45, label: 'landing', on: asset.id }, { t: air[2][0] + 0.4, label: 'landed', on: asset.id }, { t: air[3][0] + 0.45, label: 'taking off', on: asset.id });
    M.push(...[0, 1, 2, 3, 4, 5].map(k => ({ t: enter.t0 + (enter.t1 - enter.t0) * k / 5, label: `moving ${k + 1}/6`, on: asset.id, strip: true })));
    return M;
  }
  const p = plan.props[0];
  M.push({ t: p.t0 + 0.9, label: (asset.states || [])[0] || 'as it appears', prop: p });
  p.states.forEach(s => M.push({ t: s.t + 0.8, label: s.state, prop: p }));
  p.glow.forEach(g => M.push({ t: g.t + 0.9, label: g.on ? 'glowing' : 'not glowing', prop: p }));
  return M;
}

function serve() {
  const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png' };
  const server = http.createServer((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(r => server.listen(0, '127.0.0.1', () => r(server)));
}

(async () => {
  const rows = [];
  for (const time of TIMES) {
    const parsed = parseStory(storyFor(time));
    if (parsed.errors.length) throw new Error(parsed.errors.join('\n'));
    const plan = compileStory(parsed, {});
    if (plan.errors.length) throw new Error(plan.errors.join('\n'));
    const file = path.join(work, `${asset.id}-${time}.json`);
    fs.writeFileSync(file, JSON.stringify(plan));
    let M = momentsFor(plan);
    if (time !== 'day') M = M.filter(m => !m.strip);   // the movement strip only once, by day
    rows.push({ time, plan: '/' + path.relative(ROOT, file).replace(/\\/g, '/'), M });
  }
  const server = await serve(), base = `http://127.0.0.1:${server.address().port}`;
  const browser = await require('./browser').launch({ exact: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', e => console.error('[page error]', e.message));
  const tiles = [];
  for (const r of rows) {
    await page.goto(`${base}/engine/page.html?plan=${r.plan}&export=1`); await page.evaluate(() => FILM.ready);
    // small and medium props, and extras (not the movement strip), also get a close-up of each moment, to judge the details
    const shots = r.M.flatMap(m => ((m.prop && asset.size !== 'big') || (m.on && !m.strip) ? [m, { ...m, close: true, wide: false, label: m.label + ' (close-up)' }] : [m]));
    for (const m of shots) {
      // props and extras: a close view around the asset (Ren and Yuki nearby, for scale); places: the whole frame
      // (big set pieces: the whole wide shot, to see it with both characters)
      if (asset.size === 'big') m.wide = true;
      const crop = await page.evaluate(([m, kind]) => {
        FILM.render(m.t);
        let cx = 960, cy = 540, w = 1920;
        if (kind !== 'place' && !m.wide) { w = m.close ? 300 : 1100; if (m.prop) { cx = m.prop.x; cy = m.prop.y - (m.close ? m.prop.height * 0.55 : 230); } else { const K = StudioFilm.pose(m.on, m.t); cx = K.x; cy = K.y - (m.close ? K.h + 70 : 220); } }
        const h = w * 9 / 16, x = Math.max(0, Math.min(1920 - w, cx - w / 2)), y = Math.max(0, Math.min(1080 - h, cy - h / 2));
        const cv = Object.assign(document.createElement('canvas'), { width: 480, height: 270 });
        cv.getContext('2d').drawImage(document.getElementById('film'), x, y, w, h, 0, 0, 480, 270);
        return cv.toDataURL('image/png');
      }, [m, asset.kind]);
      tiles.push({ row: m.strip ? 'moving (day)' : r.time, label: m.label, png: crop });
    }
  }
  // the sheet: one row per time of day (plus the movement strip), each tile labelled
  const ref = opt('ref') ? `${base}/${opt('ref').replace(/\\/g, '/')}` : null;
  const sheet = await page.evaluate(async ([tiles, title, ref]) => {
    const rowsOrder = [...new Set(tiles.map(t => t.row))], cols = Math.max(...rowsOrder.map(r => tiles.filter(t => t.row === r).length)) + (ref ? 1 : 0);
    const S = Object.assign(document.createElement('canvas'), { width: 160 + cols * 490, height: 70 + rowsOrder.length * 310 }), g = S.getContext('2d');
    g.fillStyle = '#f4efe6'; g.fillRect(0, 0, S.width, S.height);
    g.fillStyle = '#3a2a1e'; g.font = '700 34px sans-serif'; g.fillText(title, 20, 46);
    const load = src => new Promise(ok => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = src; });
    for (const [ri, row] of rowsOrder.entries()) {
      const y = 70 + ri * 310;
      g.fillStyle = '#3a2a1e'; g.font = '600 24px sans-serif'; g.fillText(row, 20, y + 140);
      let ci = 0;
      if (ref && ri === 0) { const im = await load(ref); if (im) { const s = Math.min(480 / im.width, 270 / im.height); g.drawImage(im, 160 + (480 - im.width * s) / 2, y + (270 - im.height * s) / 2, im.width * s, im.height * s); g.fillText('reference', 160, y + 296); } ci = 1; }
      else if (ref) ci = 1;
      for (const t of tiles.filter(t => t.row === row)) {
        const im = await load(t.png), x = 160 + ci * 490;
        g.drawImage(im, x, y); g.strokeStyle = '#c9bca8'; g.lineWidth = 2; g.strokeRect(x, y, 480, 270);
        g.fillStyle = '#3a2a1e'; g.font = '20px sans-serif'; g.fillText(t.label, x + 4, y + 294);
        ci++;
      }
    }
    return S.toDataURL('image/png').slice(22);
  }, [tiles, `${N} (${asset.kind === 'prop' && asset.size === 'big' ? 'set piece' : asset.kind}${asset.picture ? ', picture' : ''})`, ref]);
  const dst = path.join(out, `${asset.id}-sheet.png`);
  fs.writeFileSync(dst, Buffer.from(sheet, 'base64'));
  await browser.close(); server.close();
  console.log(`Review sheet: ${dst}`);
})().catch(e => { console.error(e && e.message || e); process.exit(1); });
