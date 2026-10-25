// Kitsu Studio: story text file -> finished MP4.
//
//   node tools/make-video.js stories/my-story.txt            make the video (videos/my-story.mp4)
//   node tools/make-video.js stories/my-story.txt --check    only check the story and show its timing
//   node tools/make-video.js stories/my-story.txt --preview  open a live preview in your browser
//   node tools/make-video.js stories/my-story.txt --stills 3,10.5   save still images (for checking)
//   node tools/make-video.js stories/my-story.txt --stills scene:2,scene:3@4.5   the middle of scene 2, 4.5 s into scene 3
//   options for making the video:
//     --workers N   draw with N browser pages at once (default: number of processor cores minus 1)
//     --resume      carry on with a render that was stopped, keeping the parts already drawn
const fs = require('fs'), path = require('path'), http = require('http'), crypto = require('crypto'), os = require('os');
const { spawn, spawnSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const { renderVideo, fingerprint } = require('./render');
const { parseStory, compileStory } = require('../engine/story.js');
const { readWav } = require('./wav');
const { validate } = require('./validate');
const { clock, hasScenes, chapters, sceneChecks } = require('./scenes');

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
  // an extra that speaks needs a voice in config/voices.json: without one, the voice is missing too
  const voices = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/voices.json'), 'utf8'));
  speech.forEach(b => {
    if (voices[b.who] || b.who === 'narrator') return;
    const e = parsed.missing.find(x => x.kind === 'voice' && x.id === b.who) || (parsed.missing.push({ kind: 'voice', id: b.who, name: `voice for ${parsed.extras[b.who] ? parsed.extras[b.who].name : b.who}`, lines: [], text: [], needs: ['speaks'], places: [], times: [] }), parsed.missing[parsed.missing.length - 1]);
    e.lines.push(b.line); e.text.push(b.src);
  });
  const buildDir = path.join(ROOT, 'build', name);
  fs.mkdirSync(buildDir, { recursive: true });

  if (opt('check')) {
    const plan = compileStory(parsed, {});
    if (plan.errors.length) fail(`Please fix these lines:\n\n${plan.errors.join('\n')}`);
    say(`\n"${plan.meta.title}" looks good! Estimated length: ${plan.duration.toFixed(1)} s (exact length is known after voices are made).\n`);
    plan.voice.forEach(v => say(`  ${v.t.toFixed(1).padStart(6)} s  ${v.who.padEnd(8)} ${v.text}`));
    plan.warnings.forEach(w => say('  note: ' + w));
    if (hasScenes(plan)) {
      say(`\nScenes (estimated):`);
      plan.scenes.forEach((c, i) => say(`  ${String(i + 1).padStart(2)}. ${clock(c.t0).padStart(7)}  ${(c.t1 - c.t0).toFixed(1).padStart(6)} s  ${c.name}`));
      say('');
      sceneChecks(plan).forEach(r => say(`  ${label(r)}  ${r.name}: ${r.detail}`));
    }
    missingReport(plan, buildDir);
    return;
  }

  // 2. voices (cached, so unchanged lines are never re-made)
  const voiceDir = path.join(buildDir, 'voice'), cacheDir = path.join(ROOT, 'cache', 'voices');
  fs.mkdirSync(voiceDir, { recursive: true }); fs.mkdirSync(cacheDir, { recursive: true });
  const overrideDir = path.join(ROOT, 'voice-overrides', name);
  const lens = {}, jobs = [], pending = [];
  speech.forEach((b, i) => {
    const v = voices[b.who], out = path.join(voiceDir, `${i}.wav`);
    const override = path.join(overrideDir, `line-${b.line}.wav`);
    if (fs.existsSync(override)) { levelVoice(override, out); say(`  using your recording for line ${b.line}`); return; }
    if (!v) { if (fs.existsSync(out)) fs.unlinkSync(out); return; }   // no voice yet: estimated timing, no sound
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
  // every line at the same loudness, whichever voice says it (levelled once, kept beside the cached clip)
  for (const p of pending) {
    const levelled = p.cached.replace(/\.wav$/, `.lv${-VOICE_LUFS}s.wav`);
    if (!fs.existsSync(levelled)) levelVoice(p.cached, levelled);
    fs.copyFileSync(levelled, p.out);
  }
  speech.forEach((b, i) => { const w = path.join(voiceDir, `${i}.wav`); if (fs.existsSync(w)) lens[i] = readWav(w).duration; });

  // 3. compile the timeline
  const plan = compileStory(parsed, lens);
  // a finished video needs every asset; stills and the preview show placeholders instead
  if (plan.missing.length && !opt('stills') && !opt('preview')) {
    missingReport(plan, buildDir);
    if (!opt('allow-placeholders')) fail('The video can\'t be made until these are created (or add --allow-placeholders for a test video).');
  }
  if (plan.errors.length) fail(`Please fix these lines:\n\n${plan.errors.join('\n')}`);
  // (a line whose voice doesn't exist yet, like a new extra's, has no file and stays silent)
  plan.voice.forEach(v => { if (fs.existsSync(path.join(voiceDir, `${v.id}.wav`))) v.file = `/build/${name}/voice/${v.id}.wav`; else v.missing = true; });
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

  // 4. render (software drawing, so every frame comes out the same however it is rendered)
  const browser = await require('./browser').launch({ exact: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', e => { console.error('[page error]', e.message); });
  await page.goto(url + '&export=1');
  await page.evaluate(() => FILM.ready);
  const canvas = page.locator('#film');
  const outDir = path.join(ROOT, 'videos');
  fs.mkdirSync(outDir, { recursive: true });

  if (opt('stills')) {
    const shots = stillTimes(args[args.indexOf('--stills') + 1] || '', plan);
    for (const { t, tag } of shots) {
      await page.evaluate(t => FILM.render(t), t);
      await canvas.screenshot({ path: path.join(outDir, `${name}-still-${tag}${t.toFixed(1)}s.png`) });
    }
    say(`Saved ${shots.length} still(s) in videos/`);
    await browser.close(); server.close(); return;
  }

  // the soundtrack (kept for --resume when nothing it depends on has changed)
  const voiceSum = crypto.createHash('sha1');
  speech.forEach((_, i) => { const w = path.join(voiceDir, `${i}.wav`); voiceSum.update(fs.existsSync(w) ? fs.readFileSync(w) : 'none'); });
  const soundId = fingerprint(plan, ROOT) + voiceSum.digest('hex'), soundState = path.join(buildDir, 'soundtrack.json');
  const stems = ['mix', 'voice', 'sfx', 'master'].map(s => path.join(buildDir, `${s}.wav`));
  let soundOld = null;
  try { soundOld = JSON.parse(fs.readFileSync(soundState, 'utf8')).id; } catch (_) { /* not made yet */ }
  if (opt('resume') && soundOld === soundId && stems.every(f => fs.existsSync(f))) say('Using the soundtrack made last time.');
  else {
    say('Making the soundtrack...');
    if (fs.existsSync(soundState)) fs.unlinkSync(soundState);
    for (const stem of ['mix', 'voice', 'sfx']) {
      const { wav, missing } = await page.evaluate(s => FILM.renderAudio(s), stem);
      if (missing.length && stem === 'mix') say('  warning: missing voice clips: ' + missing.join(', '));
      fs.writeFileSync(path.join(buildDir, `${stem}.wav`), Buffer.from(wav, 'base64'));
    }
    await master(path.join(buildDir, 'mix.wav'), path.join(buildDir, 'master.wav'));
    fs.writeFileSync(soundState, JSON.stringify({ id: soundId }));
  }
  await page.close();

  const mp4 = path.join(outDir, `${name}.mp4`);
  const wn = args.indexOf('--workers'), workers = wn >= 0 ? parseInt(args[wn + 1], 10) : Math.max(1, os.cpus().length - 1);
  if (!(workers >= 1 && workers <= 64)) fail('--workers needs a number of workers from 1 to 64, for example --workers 3');
  try {
    await renderVideo(plan, { browser, url, workers, resume: opt('resume'), buildDir, mp4, root: ROOT, wav: path.join(buildDir, 'master.wav'), say });
  } catch (e) {
    await browser.close(); server.close();
    fail(`${e.message}\nYou can carry on where it stopped with:  resume-video.bat ${path.relative(ROOT, storyPath)}`);
  }
  await browser.close(); server.close();
  say('\nChecking the video...');
  const results = validate(plan, { root: ROOT, mp4, voice: path.join(buildDir, 'voice.wav'), sfx: path.join(buildDir, 'sfx.wav'), master: path.join(buildDir, 'master.wav') });
  results.push(...sceneChecks(plan));
  if (plan.missing.length) results.push({ ok: true, note: true, name: 'Placeholders', detail: `rendered with ${plan.missing.length} placeholder${plan.missing.length === 1 ? '' : 's'}: ${plan.missing.map(m => m.name).join(', ')}` });
  // YouTube chapters, when the scenes allow it (an old file from an earlier render is removed otherwise)
  const chFile = path.join(outDir, `${name}-chapters.txt`), ch = chapters(plan);
  if (ch.text) fs.writeFileSync(chFile, ch.text); else if (fs.existsSync(chFile)) fs.unlinkSync(chFile);
  const report = results.map(r => `${label(r)}  ${r.name}: ${r.detail}`).join('\n');
  fs.writeFileSync(path.join(outDir, `${name}-report.txt`), report + '\n');
  say(report);
  if (ch.text) say(`\nChapters for YouTube: videos/${name}-chapters.txt`);
  const bad = results.filter(r => !r.ok).length;
  say(bad ? `\nThe video was made, but ${bad} check(s) failed. See videos/${name}-report.txt` : `\nDone! Your video: videos/${name}.mp4`);
}

// The missing list, in plain words, and as build/<story>/missing-assets.json for the /new-asset command.
function missingReport(plan, dir) {
  const list = plan.missing;
  fs.writeFileSync(path.join(dir, 'missing-assets.json'), JSON.stringify(list, null, 2));
  if (!list.length) return;
  const kindOf = m => (m.kind === 'prop' && m.size === 'big' ? 'set piece' : m.kind);
  const where = m => { const L = m.lines.filter(Boolean); return L.length ? `(line${L.length > 1 ? 's' : ''} ${L.join(', ')})` : ''; };
  say(`\nYour story needs ${list.length} new thing${list.length === 1 ? '' : 's'}:`);
  list.forEach(m => say(`  ${(kindOf(m) + ':').padEnd(11)} ${m.name.padEnd(20)} ${where(m)}`));
  say('They are shown as grey placeholders for now, so you can still preview.');
  say('To create them: open Claude Code and type  /new-asset');
}

const label = r => (!r.ok ? 'FAIL' : r.warn ? 'WARN' : r.note ? 'NOTE' : 'PASS');

// "--stills 3,10.5,scene:2,scene:3@4.5" -> [{ t, tag }]: plain seconds, the middle of a scene, or seconds into a scene
function stillTimes(list, plan) {
  const out = list.split(',').filter(Boolean).map(item => {
    const m = item.trim().match(/^scene:(\d+)(?:@([\d.]+))?$/i);
    if (!m) {
      const t = Number(item);
      if (!isFinite(t)) fail(`"${item}" is not a time. Use seconds like 12.5, or scene:2, or scene:2@3.5`);
      return { t, tag: '' };
    }
    const n = +m[1], c = plan.scenes[n - 1];
    if (!c) fail(`There is no scene ${n}. This story has ${plan.scenes.length} scene(s).`);
    const t = m[2] !== undefined ? c.t0 + +m[2] : (c.t0 + c.t1) / 2;
    if (t > c.t1) fail(`Scene ${n} is only ${(c.t1 - c.t0).toFixed(1)} s long, so scene:${n}@${m[2]} is past its end.`);
    return { t, tag: `scene${n}-` };
  });
  if (!out.length) fail('Tell me which moments to save, for example: --stills 3,10.5 or --stills scene:2');
  return out;
}

// Voices come out of Kokoro (and from recordings) at different loudness, e.g. am_puck is about 4 dB louder
// than af_bella. Each line gets one fixed gain to VOICE_LUFS, capped so its peak stays below -2 dBTP.
// Some voices also start with a punch, so the first SOFT_START seconds of speech fade up from about -9 dB:
// the line still starts clearly, without a jump in volume. The length never changes.
// Clips too short or quiet to measure are copied as they are.
const VOICE_LUFS = -22, SOFT_START = 0.4;
function levelVoice(src, dst) {
  const r = spawnSync(ffmpeg, ['-hide_banner', '-i', src, '-af', 'loudnorm=print_format=json', '-f', 'null', '-'], { encoding: 'utf8' });
  let m = null;
  try { m = JSON.parse(r.stderr.slice(r.stderr.lastIndexOf('{'), r.stderr.lastIndexOf('}') + 1)); } catch (_) { /* unmeasurable */ }
  const I = m && parseFloat(m.input_i), tp = m && parseFloat(m.input_tp);
  if (!isFinite(I) || I < -60) { fs.copyFileSync(src, dst); return; }
  const gain = Math.max(-15, Math.min(15, VOICE_LUFS - I, -2 - tp));
  // where the speech starts: the first 10 ms that rise above -40 dB (from the very start if it can't be read)
  let s0 = 0;
  try {
    const w = readWav(src), x = w.samples(), hop = Math.round(w.rate * 0.01);
    for (let i = 0; i + hop <= x.length; i += hop) { let e = 0; for (let k = i; k < i + hop; k++) e += x[k] * x[k]; if (10 * Math.log10(e / hop + 1e-18) > -40) { s0 = i / w.rate; break; } }
  } catch (_) { /* e.g. a 24-bit recording */ }
  const ramp = `volume='${Math.pow(10, gain / 20).toFixed(4)}*if(lt(t,${s0.toFixed(3)}+${SOFT_START}),0.35+0.65*max(0,t-${s0.toFixed(3)})/${SOFT_START},1)':eval=frame`;
  const tmp = dst + '.part.wav';
  spawnSync(ffmpeg, ['-loglevel', 'error', '-y', '-i', src, '-af', ramp, '-c:a', 'pcm_s16le', tmp]);
  fs.renameSync(tmp, dst);
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
