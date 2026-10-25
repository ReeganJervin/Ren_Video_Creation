// Draws the frames of a plan into an MP4: several browser pages at once, scene by scene into chunks
// (build/<name>/chunks/), so a stopped render can carry on with --resume. The chunks are then joined
// without re-encoding and put together with the soundtrack.
//
// Every frame depends only on its time, and the browser draws in software mode (see browser.js), so the
// result is pixel-identical whatever the number of workers and however often a render was resumed.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { spawn } = require('child_process');
const { once } = require('events');
const ffmpeg = require('ffmpeg-static');

const CHUNK = 60;   // longest chunk in seconds: long scenes are split so a resume never redoes much
// x264 'veryfast' is twice as fast as 'medium' here and looks the same on flat cartoon colours (SSIM 0.997)
const PRESET = 'veryfast';

// [{ i, f0, f1, scene }]: frame ranges [f0, f1) that together cover every frame exactly once
function chunksOf(plan) {
  const frames = Math.round(plan.duration * plan.fps), at = t => Math.min(frames, Math.round(t * plan.fps));
  const out = [];
  plan.scenes.forEach((c, s) => {
    const n = Math.max(1, Math.ceil((c.t1 - c.t0) / CHUNK));
    for (let k = 0; k < n; k++) {
      const f0 = at(c.t0 + (c.t1 - c.t0) * k / n), f1 = s === plan.scenes.length - 1 && k === n - 1 ? frames : at(c.t0 + (c.t1 - c.t0) * (k + 1) / n);
      if (f1 > f0) out.push({ i: out.length, f0, f1, scene: s });
    }
  });
  return out;
}

// what the frames depend on: the plan and the drawing code
function fingerprint(plan, root) {
  const h = crypto.createHash('sha1').update(JSON.stringify(plan));
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).forEach(e => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p); else h.update(e.name).update(fs.readFileSync(p));
  });
  walk(path.join(root, 'engine'));
  return h.digest('hex');
}

// one frame as JPEG bytes
const grab = (page, t) => page.evaluate(t => { FILM.render(t); return document.getElementById('film').toDataURL('image/jpeg', 0.93).slice(23); }, t).then(b => Buffer.from(b, 'base64'));

// Draws frames f0..f1-1 on all pages at once and hands them to write() strictly in order.
function drawInOrder(pages, f0, f1, fps, write) {
  return new Promise((resolve, reject) => {
    const got = new Map(), idle = [...pages], ahead = pages.length * 3;
    let next = f0, want = f0, writing = false, failed = false;
    const stop = e => { if (!failed) { failed = true; reject(e); } };
    const pump = async () => {
      if (writing || failed) return;
      writing = true;
      try { while (got.has(want)) { const d = got.get(want); got.delete(want); await write(d, want); want++; } } catch (e) { return stop(e); }
      writing = false;
      if (want >= f1) resolve(); else kick();
    };
    const kick = () => {
      while (idle.length && next < f1 && next - want < ahead && !failed) {
        const p = idle.pop(), i = next++;
        grab(p, i / fps).then(d => { got.set(i, d); idle.push(p); pump(); kick(); }, stop);
      }
    };
    if (f0 >= f1) resolve(); else kick();
  });
}

// Encodes one chunk. Written to a .part file first and renamed only when complete,
// so a chunk on disk is always a finished one.
async function drawChunk(pages, c, file, fps, onFrame) {
  const part = file + '.part';
  const ff = spawn(ffmpeg, ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(fps), '-i', 'pipe:0',
    '-c:v', 'libx264', '-preset', PRESET, '-crf', '18', '-pix_fmt', 'yuv420p', '-f', 'mp4', part], { stdio: ['pipe', 'inherit', 'inherit'] });
  const closed = once(ff, 'close');
  await drawInOrder(pages, c.f0, c.f1, fps, async (jpg, i) => { if (!ff.stdin.write(jpg)) await once(ff.stdin, 'drain'); onFrame(i); });
  ff.stdin.end();
  const [code] = await closed;
  if (code !== 0) throw new Error(`Encoding chunk ${c.i + 1} failed.`);
  fs.renameSync(part, file);
}

// chunks + soundtrack -> the finished MP4 (video copied as it is, so nothing is encoded twice)
async function join(files, wav, duration, mp4, dir) {
  const list = path.join(dir, 'join.txt');
  fs.writeFileSync(list, files.map(f => `file '${f.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`).join('\n') + '\n');
  const ff = spawn(ffmpeg, ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-i', wav, '-map', '0:v', '-map', '1:a',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', duration.toFixed(3), '-movflags', '+faststart', mp4], { stdio: 'inherit' });
  const [code] = await once(ff, 'close');
  if (code !== 0) throw new Error('Joining the video failed.');
}

const mmss = s => { s = Math.round(s); return (s >= 3600 ? `${Math.floor(s / 3600)} h ` : '') + (s >= 60 ? `${Math.floor(s / 60) % 60} min ` : '') + `${s % 60} s`; };

// Renders the whole video. o: { browser, url, workers, resume, buildDir, mp4, root, wav, say }
async function renderVideo(plan, o) {
  const dir = path.join(o.buildDir, 'chunks'), state = path.join(dir, 'state.json');
  const id = fingerprint(plan, o.root), chunks = chunksOf(plan);
  const file = c => path.join(dir, `chunk-${String(c.i + 1).padStart(3, '0')}.mp4`);
  // a resume only keeps chunks drawn for exactly this plan and engine
  let old = null;
  try { old = JSON.parse(fs.readFileSync(state, 'utf8')); } catch (_) { /* nothing to resume */ }
  if (o.resume && old && old.id !== id) o.say('  The story or the engine changed since the last render, so every chunk is drawn again.');
  if (!o.resume || !old || old.id !== id) { fs.rmSync(dir, { recursive: true, force: true }); old = null; }
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(state, JSON.stringify({ id, chunks: chunks.length }));
  const todo = chunks.filter(c => !fs.existsSync(file(c)));
  if (o.resume && old) o.say(`  Resuming: ${chunks.length - todo.length} of ${chunks.length} chunks are already done.`);

  const total = chunks.reduce((s, c) => s + c.f1 - c.f0, 0), left = todo.reduce((s, c) => s + c.f1 - c.f0, 0);
  if (left) o.say(`Drawing ${left === total ? total : `the remaining ${left} of ${total}`} frames with ${o.workers} worker${o.workers > 1 ? 's' : ''}, in ${todo.length} chunk${todo.length === 1 ? '' : 's'}...`);
  else o.say('Every chunk is already drawn, so only joining them.');
  const pages = [];
  for (let w = 0; w < Math.min(o.workers, left); w++) {
    const p = await o.browser.newPage({ viewport: { width: plan.width, height: plan.height } });
    p.on('pageerror', e => console.error('[page error]', e.message));
    await p.goto(o.url + '&export=1');
    await p.evaluate(() => FILM.ready);
    pages.push(p);
  }
  const started = Date.now();
  let drawn = 0, shown = 0;
  for (const c of todo) {
    const sc = plan.scenes[c.scene], label = plan.scenes.length > 1 ? `scene ${c.scene + 1}/${plan.scenes.length} "${sc.name}"` : `chunk ${c.i + 1}/${chunks.length}`;
    await drawChunk(pages, c, file(c), plan.fps, () => {
      drawn++;
      const now = Date.now();
      if (now - shown < 1000 && drawn < left) return;
      shown = now;
      const el = (now - started) / 1000, fps = drawn / el, done = (total - left + drawn) / total;
      process.stdout.write(`\r  ${String(Math.floor(done * 100)).padStart(3)}%  ${label}  ${fps.toFixed(1)} frames/s  about ${mmss(Math.max(0, (left - drawn) / fps))} left      `.slice(0, 118));
    });
  }
  await Promise.all(pages.map(p => p.close()));
  const el = (Date.now() - started) / 1000;
  if (left) process.stdout.write(`\r  100%  drew ${left} frames in ${mmss(el)} (${(left / el).toFixed(1)} frames/s)${' '.repeat(50)}\n`);
  await join(chunks.map(file), o.wav, plan.duration, o.mp4, dir);
  return { frames: total, drawn: left, seconds: el };
}

module.exports = { renderVideo, chunksOf, fingerprint };
