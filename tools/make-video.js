// Kitsu Studio: story text file -> finished MP4.
//
//   node tools/make-video.js stories/my-story.txt            make the video (videos/my-story.mp4)
//   node tools/make-video.js stories/my-story.txt --check    only check the story and show its timing
//   node tools/make-video.js stories/my-story.txt --preview  open a live preview in your browser
//   node tools/make-video.js stories/my-story.txt --stills 3,10.5   save still images (for checking)
const fs = require('fs'), path = require('path'), http = require('http'), crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');
const { once } = require('events');
const ffmpeg = require('ffmpeg-static');
const { parseStory, compileStory } = require('../engine/story.js');
const { readWav } = require('./wav');
const { validate } = require('./validate');

const ROOT = path.resolve(__dirname, '..');
const say = (...a) => console.log(...a);
const fail = msg => { console.error('\n' + msg + '\n'); process.exit(1); };

async function main() {
  const args = process.argv.slice(2);
  const storyArg = args.find(a => !a.startsWith('--'));
  if (!storyArg) fail('Tell me which story to make, for example:\n  make-video.bat stories\\the-fallen-star.txt');
  const storyPath = path.resolve(storyArg);
  if (!fs.existsSync(storyPath)) fail(`I can't find the story file: ${storyArg}`);
  const name = path.basename(storyPath).replace(/\.[^.]+$/, '').replace(/[^\w-]+/g, '-');
  const opt = k => args.includes('--' + k);

  // 1. read + check the story
  const parsed = parseStory(fs.readFileSync(storyPath, 'utf8'));
  if (parsed.errors.length) fail(`Please fix these lines in ${path.basename(storyPath)}:\n\n${parsed.errors.join('\n\n')}\n\nSee STORY-GUIDE.md for every line you can use.`);
  const speech = parsed.beats.filter(b => b.type === 'say');

  if (opt('check')) {
    const plan = compileStory(parsed, {});
    if (plan.errors.length) fail(`Please fix these lines:\n\n${plan.errors.join('\n')}`);
    say(`\n"${plan.meta.title}" looks good! Estimated length: ${plan.duration.toFixed(1)} s (exact length is known after voices are made).\n`);
    plan.voice.forEach(v => say(`  ${v.t.toFixed(1).padStart(6)} s  ${v.who.padEnd(8)} ${v.text}`));
    plan.warnings.forEach(w => say('  note: ' + w));
    return;
  }

  // 2. voices (cached, so unchanged lines are never re-made)
  const voices = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/voices.json'), 'utf8'));
  const buildDir = path.join(ROOT, 'build', name), voiceDir = path.join(buildDir, 'voice'), cacheDir = path.join(ROOT, 'cache', 'voices');
  fs.mkdirSync(voiceDir, { recursive: true }); fs.mkdirSync(cacheDir, { recursive: true });
  const overrideDir = path.join(ROOT, 'voice-overrides', name);
  const lens = {}, jobs = [], pending = [];
  speech.forEach((b, i) => {
    const v = voices[b.who], out = path.join(voiceDir, `${i}.wav`);
    const override = path.join(overrideDir, `line-${b.line}.wav`);
    if (fs.existsSync(override)) { fs.copyFileSync(override, out); say(`  using your recording for line ${b.line}`); return; }
    const key = crypto.createHash('sha1').update(JSON.stringify([b.text, v.voice, v.speed, v.pitch])).digest('hex').slice(0, 16);
    const cached = path.join(cacheDir, key + '.wav');
    pending.push({ cached, out, pitch: v.pitch });
    if (!fs.existsSync(cached)) jobs.push({ text: b.text, voice: v.voice, speed: v.speed, out: cached + (v.pitch !== 1 ? '.raw.wav' : '') });
  });
  if (jobs.length) {
    say(`Making ${jobs.length} voice line(s)...`);
    const py = [path.join(ROOT, '.venv', 'Scripts', 'python.exe'), path.join(ROOT, '.venv', 'bin', 'python')].find(p => fs.existsSync(p));
    if (!py) fail('The voice tool is not installed yet. Please run setup.bat first.');
    if (!fs.existsSync(path.join(ROOT, 'models', 'kokoro.onnx'))) fail('The voice model is missing. Please run setup.bat first.');
    const jobsFile = path.join(buildDir, 'voice-jobs.json');
    fs.writeFileSync(jobsFile, JSON.stringify(jobs));
    const r = spawnSync(py, [path.join(ROOT, 'tools', 'tts.py'), path.join(ROOT, 'models'), jobsFile], { stdio: 'inherit' });
    if (r.status !== 0) fail('Making the voices failed (see the message above).');
    for (const p of pending) {
      const raw = p.cached + '.raw.wav';
      if (p.pitch !== 1 && fs.existsSync(raw)) {
        // Ren's brighter voice: raise pitch, keep timing.
        const sr = readWav(raw).rate;
        spawnSync(ffmpeg, ['-loglevel', 'error', '-y', '-i', raw, '-af', `asetrate=${Math.round(sr * p.pitch)},aresample=${sr},atempo=${(1 / p.pitch).toFixed(5)}`, p.cached]);
        fs.unlinkSync(raw);
      }
    }
  }
  for (const p of pending) fs.copyFileSync(p.cached, p.out);
  speech.forEach((b, i) => { lens[i] = readWav(path.join(voiceDir, `${i}.wav`)).duration; });

  // 3. compile the timeline
  const plan = compileStory(parsed, lens);
  if (plan.errors.length) fail(`Please fix these lines:\n\n${plan.errors.join('\n')}`);
  plan.voice.forEach(v => { v.file = `/build/${name}/voice/${v.id}.wav`; });
  fs.writeFileSync(path.join(buildDir, 'plan.json'), JSON.stringify(plan));
  plan.warnings.forEach(w => say('  note: ' + w));
  say(`"${plan.meta.title}": ${plan.duration.toFixed(1)} s, ${plan.voice.length} spoken lines.`);

  const server = await serve();
  const url = `http://127.0.0.1:${server.address().port}/engine/page.html?plan=/build/${name}/plan.json`;
  if (opt('preview')) {
    say(`\nPreview: ${url}\n(Press Ctrl+C here when you are done.)`);
    const opener = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]] : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
    spawn(opener[0], opener[1], { stdio: 'ignore', detached: true }).on('error', () => {});
    return;
  }

  // 4. render
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', e => { console.error('[page error]', e.message); });
  await page.goto(url + '&export=1');
  await page.evaluate(() => FILM.ready);
  const canvas = page.locator('#film');
  const outDir = path.join(ROOT, 'videos');
  fs.mkdirSync(outDir, { recursive: true });

  if (opt('stills')) {
    const times = args[args.indexOf('--stills') + 1].split(',').map(Number);
    for (const t of times) {
      await page.evaluate(t => FILM.render(t), t);
      await canvas.screenshot({ path: path.join(outDir, `${name}-still-${t.toFixed(1)}s.png`) });
    }
    say(`Saved ${times.length} still(s) in videos/`);
    await browser.close(); server.close(); return;
  }

  say('Making the soundtrack...');
  for (const stem of ['mix', 'voice', 'sfx']) {
    const { wav, missing } = await page.evaluate(s => FILM.renderAudio(s), stem);
    if (missing.length && stem === 'mix') say('  warning: missing voice clips: ' + missing.join(', '));
    fs.writeFileSync(path.join(buildDir, `${stem}.wav`), Buffer.from(wav, 'base64'));
  }
  await master(path.join(buildDir, 'mix.wav'), path.join(buildDir, 'master.wav'));

  const frames = Math.round(plan.duration * plan.fps), mp4 = path.join(outDir, `${name}.mp4`);
  say(`Drawing ${frames} frames...`);
  const ff = spawn(ffmpeg, ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', '30', '-i', 'pipe:0',
    '-i', path.join(buildDir, 'master.wav'), '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-t', plan.duration.toFixed(3), '-movflags', '+faststart', mp4], { stdio: ['pipe', 'inherit', 'inherit'] });
  const started = Date.now();
  for (let i = 0; i < frames; i++) {
    await page.evaluate(t => FILM.render(t), i / plan.fps);
    const jpg = await canvas.screenshot({ type: 'jpeg', quality: 93 });
    if (!ff.stdin.write(jpg)) await once(ff.stdin, 'drain');
    if (i % 150 === 0 || i === frames - 1) {
      const done = (i + 1) / frames, el = (Date.now() - started) / 1000;
      process.stdout.write(`\r  ${Math.round(done * 100)}%  (about ${Math.max(0, Math.round(el / done - el))} s left)    `);
    }
  }
  ff.stdin.end();
  const [code] = await once(ff, 'close');
  await browser.close(); server.close();
  if (code !== 0) fail('Encoding the video failed.');
  say('\n\nChecking the video...');
  const results = validate(plan, { root: ROOT, mp4, voice: path.join(buildDir, 'voice.wav'), sfx: path.join(buildDir, 'sfx.wav'), master: path.join(buildDir, 'master.wav') });
  const report = results.map(r => `${r.ok ? 'PASS' : 'FAIL'}  ${r.name}: ${r.detail}`).join('\n');
  fs.writeFileSync(path.join(outDir, `${name}-report.txt`), report + '\n');
  say(report);
  const bad = results.filter(r => !r.ok).length;
  say(bad ? `\nThe video was made, but ${bad} check(s) failed. See videos/${name}-report.txt` : `\nDone! Your video: videos/${name}.mp4`);
}

// Mastering: one fixed gain to about -16 LUFS, capped so true peak stays at or below -1.5 dBTP.
async function master(src, dst) {
  const r = spawnSync(ffmpeg, ['-hide_banner', '-i', src, '-af', 'loudnorm=print_format=json', '-f', 'null', '-'], { encoding: 'utf8' });
  const m = JSON.parse(r.stderr.slice(r.stderr.lastIndexOf('{'), r.stderr.lastIndexOf('}') + 1));
  const gain = Math.min(-16 - parseFloat(m.input_i), -1.5 - parseFloat(m.input_tp));
  spawnSync(ffmpeg, ['-loglevel', 'error', '-y', '-i', src, '-af', `volume=${gain.toFixed(2)}dB`, '-c:a', 'pcm_s16le', dst]);
}

function serve() {
  const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.wav': 'audio/wav', '.woff2': 'font/woff2' };
  const server = http.createServer((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(r => server.listen(0, '127.0.0.1', () => r(server)));
}

main().catch(e => fail('Something went wrong: ' + (e && e.stack || e)));
