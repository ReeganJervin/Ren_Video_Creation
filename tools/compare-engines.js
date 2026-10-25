// Checks that engine changes leave existing stories alone (rule R1 in ENGINE-ROADMAP.md).
//
//   node tools/compare-engines.js [git-ref]      compare the engine at git-ref (default HEAD) with the working copy
//   ... --only the-fallen-star                    only that story
//   ... --sound                                   also compare the soundtracks (slow on long stories)
//
// For every story in stories/: the timing plan and 12 frames (pixel by pixel), plus the music + effects soundtrack with --sound.
// Timing uses estimated voice lengths (the same for both engines), so no voices need to be made.
// Differences are saved as PNGs in build/_compare/diff/.
const fs = require('fs'), path = require('path'), http = require('http');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
// the git ref: the first word that isn't an option (or the story name after --only)
const ref = process.argv.slice(2).find((a, i, all) => !a.startsWith('--') && all[i - 1] !== '--only') || 'HEAD';
const FRAMES = 12, SELF = process.argv.includes('--self');   // --self: old engine against itself (how repeatable rendering is)
const SOUND = process.argv.includes('--sound');               // rule R14: frames and timing by default
const work = path.join(ROOT, 'build', '_compare'), oldDir = path.join(work, 'old'), planDir = path.join(work, 'plans'), diffDir = path.join(work, 'diff');

// the engine folder as it was at `ref`
function checkoutEngine() {
  fs.rmSync(work, { recursive: true, force: true });
  const files = spawnSync('git', ['ls-tree', '-r', '--name-only', ref, 'engine'], { cwd: ROOT, encoding: 'utf8' });
  if (files.status !== 0) throw new Error(`git can't find "${ref}": ${files.stderr}`);
  for (const f of files.stdout.split('\n').filter(Boolean)) {
    const dst = path.join(oldDir, f);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.writeFileSync(dst, spawnSync('git', ['show', `${ref}:${f}`], { cwd: ROOT, maxBuffer: 1 << 28 }).stdout);
  }
  fs.mkdirSync(planDir, { recursive: true }); fs.mkdirSync(diffDir, { recursive: true });
}

// keys that only one of the two plans has, and the paths of values that differ
function diffPlans(a, b, at = '', out = { onlyOld: [], onlyNew: [], changed: [] }) {
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const p = at ? `${at}.${k}` : k;
      if (!at && (k === 'assetFiles' || k === 'pictures')) continue;   // the library grows with every new asset; that isn't a change to the story
      if (!(k in b)) out.onlyOld.push(p); else if (!(k in a)) out.onlyNew.push(p); else diffPlans(a[k], b[k], p, out);
    }
  } else if (JSON.stringify(a) !== JSON.stringify(b)) out.changed.push(at);
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

async function main() {
  checkoutEngine();
  const NEW = require('../engine/story.js'), OLD = require(path.join(oldDir, 'engine', 'story.js'));
  // --only name: just that story
  const only = process.argv.indexOf('--only'), stories = fs.readdirSync(path.join(ROOT, 'stories')).filter(f => f.endsWith('.txt') && (only < 0 || f === process.argv[only + 1] + '.txt'));
  const server = await serve(), base = `http://127.0.0.1:${server.address().port}`;
  const browser = await require('./browser').launch({ exact: true });
  const open = async (engine, plan) => {
    const p = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    p.on('pageerror', e => console.error('[page error]', e.message));
    await p.goto(`${base}/${engine}/page.html?plan=${plan}&export=1`);
    await p.evaluate(() => FILM.ready);
    return p;
  };
  // a fingerprint of the frame's pixels
  const frame = (p, t) => p.evaluate(t => {
    FILM.render(t);
    const d = new Uint32Array(document.getElementById('film').getContext('2d').getImageData(0, 0, 1920, 1080).data.buffer);
    let h1 = 2166136261, h2 = 0;
    for (let i = 0; i < d.length; i++) { h1 = Math.imul(h1 ^ d[i], 16777619); h2 = (h2 + d[i] * (i % 65521 + 1)) | 0; }
    return `${(h1 >>> 0).toString(16)}-${(h2 >>> 0).toString(16)}`;
  }, t);
  // the music + effects soundtrack as 16-bit samples
  const sound = async p => { const b = Buffer.from((await p.evaluate(() => FILM.renderAudio('mix'))).wav, 'base64'); return new Int16Array(b.buffer, b.byteOffset + 44, (b.length - 44) >> 1); };
  // The browser's reverb is not bit-exact between runs (differences of 1 in 32768, about -100 dB),
  // so soundtracks count as the same when no sample differs by more than 2.
  const sameSound = (x, y) => { if (x.length !== y.length) return false; for (let i = 0; i < x.length; i++) if (Math.abs(x[i] - y[i]) > 2) return false; return true; };

  let allOk = true;
  const rows = [];
  for (const f of stories) {
    const name = f.replace(/\.txt$/, ''), text = fs.readFileSync(path.join(ROOT, 'stories', f), 'utf8');
    const pa = OLD.parseStory(text), pb = NEW.parseStory(text);
    if (pb.errors.length) { rows.push(`FAIL  ${name}: the story has errors in the new engine`); allOk = false; continue; }
    if (pa.errors.length) { rows.push(`NEW   ${name.padEnd(26)} uses lines the old engine doesn't know, so it isn't compared`); continue; }
    const A = OLD.compileStory(pa, {}), B = NEW.compileStory(pb, {});
    const d = diffPlans(A, B);
    fs.writeFileSync(path.join(planDir, `${name}-old.json`), JSON.stringify(A));
    fs.writeFileSync(path.join(planDir, `${name}-new.json`), JSON.stringify(B));
    const po = await open('build/_compare/old/engine', `/build/_compare/plans/${name}-old.json`);
    const pn = SELF ? await open('build/_compare/old/engine', `/build/_compare/plans/${name}-old.json`) : await open('engine', `/build/_compare/plans/${name}-new.json`);
    const bad = [];
    // a frame one engine can't draw: the old one crashing is a bug that's fixed now; the new one crashing is a failure
    const tryFrame = (p, t) => frame(p, t).catch(e => 'crash: ' + String(e.message).split('\n')[0]);
    let crash = null;
    for (let i = 0; i < FRAMES; i++) {
      const t = +(A.duration * (i + 0.5) / FRAMES).toFixed(3);
      const fo = await tryFrame(po, t), fn = await tryFrame(pn, t);
      if (fn.startsWith('crash')) { crash = `the new engine crashes at ${t.toFixed(2)} s: ${fn.slice(7)}`; break; }
      if (fo.startsWith('crash')) { crash = crash || `the old engine crashed at ${t.toFixed(2)} s (fixed in the new one)`; continue; }
      if (fo !== fn) {
        bad.push(t.toFixed(2));
        await po.locator('#film').screenshot({ path: path.join(diffDir, `${name}-${t.toFixed(2)}-old.png`) });
        await pn.locator('#film').screenshot({ path: path.join(diffDir, `${name}-${t.toFixed(2)}-new.png`) });
      }
    }
    if (crash) {
      await po.close(); await pn.close();
      const fixed = crash.startsWith('the old');
      if (!fixed) allOk = false;
      rows.push(`${fixed ? 'FIXED' : 'FAIL '} ${name.padEnd(26)} ${crash}`);
      continue;
    }
    const soundOk = SOUND ? sameSound(await sound(po), await sound(pn)) : null;
    await po.close(); await pn.close();
    const timingOk = !d.changed.length && !d.onlyOld.length;
    const ok = timingOk && !bad.length && soundOk !== false;
    allOk = allOk && ok;
    rows.push(`${ok ? 'SAME' : 'DIFF'}  ${name.padEnd(26)} timing ${timingOk ? 'identical' : 'CHANGED: ' + [...d.changed, ...d.onlyOld].slice(0, 6).join(', ')}` +
      `${d.onlyNew.length ? ` (new fields: ${d.onlyNew.join(', ')})` : ''}; frames ${FRAMES - bad.length}/${FRAMES} identical${bad.length ? ' (differ at ' + bad.join(', ') + ' s)' : ''}${soundOk === null ? '' : `; soundtrack ${soundOk ? 'same' : 'CHANGED'}`}`);
  }
  await browser.close(); server.close();
  console.log(`\nComparing the engine at ${ref} with the working copy:\n\n${rows.join('\n')}\n`);
  console.log(allOk ? 'All stories are unchanged.' : `Some stories changed. Differing frames are in ${path.relative(ROOT, diffDir)}`);
  process.exit(allOk ? 0 : 1);
}

main().catch(e => { console.error(e && e.stack || e); process.exit(1); });
