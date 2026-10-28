// Kitsu Studio app: the local server (STUDIO-APP.md). Started by "Kitsu Studio.bat", or: node studio/server/server.js
//
// - Listens on 127.0.0.1 only, so nobody else can open it. Every path it receives is checked to stay inside the project.
// - Serves the built app (studio/dist), the engine files and the build/, videos/, assets/ and cache/voices/ folders.
// - The JSON API under /api/ reads, checks and saves stories with the same functions the CMD tools use
//   (tools/story-check.js). Voices and videos are made by running the CMD tool itself (tools/make-video.js) as a
//   background job, so a video comes out exactly as it does from make-video.bat (rule R13).
// - Jobs run one at a time, keep running when the browser is closed, report progress over Server-Sent Events,
//   and are remembered in build/_studio/jobs.json, so a render stopped by a crash or restart can be resumed.
const fs = require('fs'), path = require('path'), http = require('http'), os = require('os');
const { spawn, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const DIST = path.join(ROOT, 'studio', 'dist');
// the studio's own files (jobs, preview plans); the tests use another folder so they never touch the real job list
const STATE = path.join(ROOT, 'build', process.env.KITSU_STUDIO_STATE || '_studio');
const PORT = +process.env.KITSU_PORT || 3000, HOST = '127.0.0.1';
const STORY_DIRS = ['stories', 'episodes'];
// the template every new story starts from (it lives with the demos; a name starting with _ is never listed)
const TEMPLATE = path.join(ROOT, 'stories', 'demos-and-tests', '_template.txt');
// folders the browser may read files from
const SERVED = ['engine', 'build', 'videos', 'assets', 'cache/voices', 'voice-overrides'];

// ---------- the engine (reloaded when its files change, so new assets appear without a restart) ----------
let engineDirty = false;
function engine() {
  if (engineDirty) {
    for (const k of Object.keys(require.cache)) if (k.startsWith(path.join(ROOT, 'engine')) || k === path.join(ROOT, 'tools', 'story-check.js')) delete require.cache[k];
    engineDirty = false; statusCache.clear();
  }
  return { check: require('../../tools/story-check.js'), story: require('../../engine/story.js'), places: require('../../engine/places/index.js'), assets: require('../../engine/assets.js'), wav: require('../../tools/wav.js') };
}
try { fs.watch(path.join(ROOT, 'engine'), { recursive: true }, () => { engineDirty = true; }); } catch (_) { /* no file watching: restart to see new assets */ }
try { fs.watch(path.join(ROOT, 'config'), () => { engineDirty = true; }); } catch (_) { /* as above */ }

// ---------- paths ----------
class HttpError extends Error { constructor(code, msg) { super(msg); this.code = code; } }
// a relative path inside the project, under one of the allowed folders -> the absolute path (anything else is refused)
function inside(rel, folders) {
  if (typeof rel !== 'string' || !rel || rel.includes('\0') || path.isAbsolute(rel) || /^[a-z]:/i.test(rel)) throw new HttpError(403, 'That path is not allowed.');
  const abs = path.resolve(ROOT, rel), relNorm = path.relative(ROOT, abs).replace(/\\/g, '/');
  if (relNorm.startsWith('..') || path.isAbsolute(relNorm) || !folders.some(f => relNorm === f || relNorm.startsWith(f + '/'))) throw new HttpError(403, 'That path is not allowed.');
  return abs;
}
const storyPath = rel => { const abs = inside(rel, STORY_DIRS); if (!/\.txt$/i.test(abs)) throw new HttpError(403, 'Only story files (.txt) can be opened.'); return abs; };
const relOf = abs => path.relative(ROOT, abs).replace(/\\/g, '/');
// a story name typed by the owner -> a safe file name ("My Story!" -> "my-story")
const safeName = n => String(n || '').trim().toLowerCase().replace(/\.txt$/, '').replace(/[^a-z0-9_-]+/g, '-').replace(/^[-_]+|-+$/g, '').slice(0, 60);

// ---------- stories ----------
const statusCache = new Map();
// every story, in its folder and the folders inside it (stories/episodes/, stories/demos-and-tests/...), except
// names starting with _ (the template, and stories/_deleted/)
function storyFiles() {
  const out = [];
  const walk = dir => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name.startsWith('_')) continue;
      if (e.isDirectory()) walk(path.join(dir, e.name));
      else if (e.name.endsWith('.txt')) out.push(path.join(dir, e.name));
    }
  };
  for (const d of STORY_DIRS) if (fs.existsSync(path.join(ROOT, d))) walk(path.join(ROOT, d));
  return out;
}
function storyInfo(abs) {
  const st = fs.statSync(abs), key = abs + st.mtimeMs;
  if (!statusCache.has(key)) {
    const { check } = engine();
    let title = path.basename(abs, '.txt'), duration = null, status = 'Ready', errors = 0, missing = 0;
    try {
      const r = check.checkStory(fs.readFileSync(abs, 'utf8'), {}, abs);
      title = r.parsed.meta.title || title;
      errors = r.parsed.errors.length + (r.plan ? r.plan.errors.length : 0);
      if (r.plan) { duration = r.plan.duration; missing = r.plan.missing.length; }
      status = errors ? 'Has errors' : missing ? 'Missing assets' : 'Ready';
    } catch (e) { status = 'Has errors'; }
    statusCache.set(key, { title, duration, status, errors, missing });
  }
  const s = { ...statusCache.get(key) }, name = engine().check.storyName(abs), mp4 = videoFile(name, name + '.mp4');
  if (s.status === 'Ready' && fs.existsSync(mp4.abs) && fs.statSync(mp4.abs).mtimeMs > st.mtimeMs) s.status = 'Rendered';
  return { file: relOf(abs), name, folder: relOf(path.dirname(abs)), ...s, mtime: st.mtimeMs, video: fs.existsSync(mp4.abs) ? mp4.url : null };
}

// a file of a video, in its own folder videos/<story>/: { abs (on disk), url (for the browser), rel (in the project) }
function videoFile(name, file) {
  const { check } = engine(), rel = check.videoRel(name, file);
  return { abs: path.join(check.videoDir(name), file), url: '/' + rel, rel };
}

// "Line 12: message\n    "the line"" -> { line: 12, message }
function lineError(text) {
  const m = String(text).match(/^Line (\d+): ([\s\S]*)$/);
  const msg = (m ? m[2] : String(text)).split('\n')[0].trim();
  return { line: m ? +m[1] : 0, message: msg };
}

// The live check: errors and missing assets with their lines, the length, scenes and voice lines, and a preview plan
// in build/_studio/<name>/ that uses every voice line already made (the rest have estimated timing and no sound).
function checkText(file, text) {
  const { check, wav } = engine(), name = check.storyName(file);
  let r = check.checkStory(text, {}, file);
  const out = { name, title: r.parsed.meta.title || name, errors: r.parsed.errors.map(lineError), missing: [], warnings: [], duration: null, scenes: [], voices: [], lineTimes: [], planUrl: null, voicesToMake: 0 };
  if (!r.plan) return out;
  // voice lines already made: recordings in voice-overrides/, or levelled clips in cache/voices/
  const lens = {}, files = {};
  r.speech.forEach((b, i) => {
    const v = check.lineVoice(b, r.voices, r.parsed.meta), over = check.overrideFile(name, b.line);
    let f = null;
    if (fs.existsSync(over)) f = over;
    else if (v) { const lv = check.levelledVoice(check.cachedVoice(b.text, v), v.gain || 0); if (fs.existsSync(lv)) f = lv; }
    if (f) { try { lens[i] = wav.readWav(f).duration; files[i] = '/' + relOf(f); } catch (_) { /* unreadable: estimated */ } }
    else if (v) out.voicesToMake++;
  });
  if (Object.keys(lens).length) r = check.checkStory(text, lens, file);
  const plan = r.plan;
  out.errors.push(...plan.errors.map(lineError));
  out.missing = plan.missing.map(m => ({ kind: m.kind === 'prop' && m.size === 'big' ? 'set piece' : m.kind, name: m.name, lines: m.lines.filter(Boolean) }));
  out.warnings = [...plan.warnings, ...engine().story.PICTURES.warnings.filter(w => typeof w === 'string')];
  out.duration = plan.duration;
  out.scenes = plan.scenes.map(c => ({ name: c.name, line: c.line, t0: c.t0, t1: c.t1 }));
  out.voices = plan.voice.map(v => ({ line: v.line, who: v.who, text: v.text, t: v.t, len: v.len, ready: !!files[v.id] }));
  out.lineTimes = plan.lineTimes || [];
  // the missing list for /new-asset, as "--check" writes it
  const buildDir = path.join(ROOT, 'build', name);
  fs.mkdirSync(buildDir, { recursive: true });
  fs.writeFileSync(path.join(buildDir, 'missing-assets.json'), JSON.stringify(plan.missing, null, 2));
  if (!out.errors.length) {
    plan.voice.forEach(v => { if (files[v.id]) v.file = files[v.id]; else v.missing = true; });
    const dir = path.join(STATE, name), data = JSON.stringify(plan); fs.mkdirSync(dir, { recursive: true });
    // the address changes only when the plan does, so the preview reloads only then
    const v = require('crypto').createHash('sha1').update(data).digest('hex').slice(0, 12);
    fs.writeFileSync(path.join(dir, `plan-${v}.json`), data);
    for (const f of fs.readdirSync(dir)) if (/^plan-\w+\.json$/.test(f) && f !== `plan-${v}.json`) fs.rmSync(path.join(dir, f), { force: true });
    out.planUrl = `/${relOf(dir)}/plan-${v}.json`;
  }
  return out;
}

// Words for the editor's suggestions, straight from the engine's registries (new assets appear automatically).
function vocab() {
  const { story, places, assets } = engine();
  const all = kind => Object.values(assets.ASSETS).filter(a => a.kind === kind && !a.missing);
  return {
    characters: Object.keys(story.CHARACTERS), moods: story.MOODS, music: story.MUSIC, places: places.names(),
    times: ['day', 'sunset', 'dusk', 'night'],
    props: all('prop').flatMap(a => a.names), extras: all('extra').flatMap(a => a.names),
    // the props a character can hold (small ones, by their main name), for "picks up the …" and the like
    holdable: all('prop').filter(a => a.size !== 'big' && !['star', 'heart'].includes(a.id)).map(a => a.names[0]),
    help: story.HELP,
  };
}

// ---------- jobs: voices and videos, one at a time, by running the CMD tool ----------
let jobs = [], seq = 0, current = null;
const clients = new Set();
fs.mkdirSync(STATE, { recursive: true });
try {
  jobs = JSON.parse(fs.readFileSync(path.join(STATE, 'jobs.json'), 'utf8'));
  // a job that was running when the studio stopped is stopped now (a render can be resumed)
  jobs.forEach(j => { if (j.state === 'running' || j.state === 'queued') { j.state = 'stopped'; j.message = 'The studio was closed while this was running.'; } });
  seq = Math.max(0, ...jobs.map(j => j.id));
} catch (_) { /* no jobs yet */ }
let saveTimer = null;
const saveJobs = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => fs.writeFileSync(path.join(STATE, 'jobs.json'), JSON.stringify(jobs.slice(-50), null, 1)), 300); };
const publicJob = j => ({ ...j, log: j.log.slice(-40) });
function emit(j) {
  saveJobs();
  const data = `event: job\ndata: ${JSON.stringify(publicJob(j))}\n\n`;
  for (const c of clients) c.write(data);
}
// overall progress from the step: voices, soundtrack, drawing, joining, checking
const SPAN = { voices: [0, 0.1], soundtrack: [0.1, 0.15], drawing: [0.15, 0.95], joining: [0.95, 0.97], checking: [0.97, 1] };

function addJob(kind, file, opts = {}) {
  const abs = storyPath(file);
  if (!fs.existsSync(abs)) throw new HttpError(404, 'That story does not exist.');
  const j = { id: ++seq, kind, file: relOf(abs), name: engine().check.storyName(abs), opts, state: 'queued', step: 'waiting', progress: 0, log: [], results: null, created: Date.now() };
  jobs.push(j); emit(j); next();
  return j;
}
function next() {
  if (current) return;
  const j = jobs.find(x => x.state === 'queued');
  if (!j) return;
  current = j; j.state = 'running'; j.started = Date.now(); j.step = j.kind === 'voices' ? 'voices' : 'starting';
  const args = [path.join(ROOT, 'tools', 'make-video.js'), j.file];
  if (j.kind === 'voices') args.push('--voices');
  else {
    if (j.opts.workers) args.push('--workers', String(j.opts.workers));
    if (j.opts.resume) args.push('--resume');
    if (j.opts.allowPlaceholders) args.push('--allow-placeholders');
  }
  const child = spawn(process.execPath, args, { cwd: ROOT, env: { ...process.env, KITSU_PROGRESS: '1' }, windowsHide: true });
  j.pid = child.pid; emit(j);
  let last = 0;
  const onText = buf => {
    for (const line of buf.toString().split(/\r|\n/)) {
      if (!line.trim()) continue;
      if (line.startsWith('@@')) {
        try {
          const p = JSON.parse(line.slice(2));
          j.step = p.step;
          if (p.step === 'drawing') Object.assign(j, { scene: p.scene, fps: p.fps, left: p.left, drawn: p.done });
          if (p.step === 'voices') j.voices = { done: 0, total: p.total };
          const [a, b] = j.kind === 'voices' ? [0, 1] : SPAN[p.step] || [j.progress, j.progress];
          j.progress = a + (b - a) * (p.step === 'drawing' ? p.done : 0);
        } catch (_) { /* not progress after all */ }
        continue;
      }
      const v = line.match(/^\s*voice (\d+)\/(\d+):/);
      if (v) { j.voices = { done: +v[1] - 1, total: +v[2] }; const [a, b] = j.kind === 'voices' ? [0, 1] : SPAN.voices; j.progress = a + (b - a) * (+v[1] - 1) / +v[2]; }
      if (/^\s+\d+%\s/.test(line)) continue;   // the CMD progress line; the @@ line carries the same
      j.log.push(line); if (j.log.length > 400) j.log.splice(0, 100);
    }
    const now = Date.now();
    if (now - last > 250) { last = now; emit(j); }
  };
  child.stdout.on('data', onText); child.stderr.on('data', onText);
  child.on('close', code => {
    j.ended = Date.now(); j.exitCode = code; delete j.pid;
    if (j.cancelled) { j.state = 'cancelled'; j.message = j.kind === 'render' ? 'Stopped. Resume carries on from the parts already drawn.' : 'Stopped.'; }
    else if (code === 0) {
      j.state = 'done'; j.progress = 1; j.step = 'done';
      if (j.kind === 'render') { j.results = readReport(j.name); j.video = videoFile(j.name, j.name + '.mp4').url; }
    } else { j.state = 'failed'; j.message = j.log.slice(-8).join('\n'); }
    current = null; emit(j); next();
  });
}
function cancelJob(j) {
  if (j.state === 'queued') { j.state = 'cancelled'; emit(j); return; }
  if (j.state !== 'running' || !j.pid) return;
  j.cancelled = true;
  // stop the whole tree (the tool, its browser and ffmpeg)
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(j.pid), '/T', '/F'], { windowsHide: true });
  else try { process.kill(j.pid, 'SIGTERM'); } catch (_) { /* already gone */ }
}
// videos/<name>/<name>-report.txt -> [{ status, name, detail }]
function readReport(name) {
  const f = videoFile(name, `${name}-report.txt`).abs;
  if (!fs.existsSync(f)) return null;
  return fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(Boolean).map(l => {
    const m = l.match(/^(PASS|FAIL|WARN|NOTE)\s+([^:]+):\s*(.*)$/);
    return m ? { status: m[1], name: m[2], detail: m[3] } : { status: 'NOTE', name: '', detail: l };
  });
}

// ---------- HTTP ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wav': 'audio/wav', '.mp4': 'video/mp4', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.srt': 'text/plain; charset=utf-8', '.vtt': 'text/vtt; charset=utf-8', '.jpg': 'image/jpeg', '.ico': 'image/x-icon' };
function sendFile(req, res, abs) {
  if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) { res.writeHead(404); return res.end(); }
  const size = fs.statSync(abs).size, type = MIME[path.extname(abs).toLowerCase()] || 'application/octet-stream';
  const range = req.headers.range && req.headers.range.match(/bytes=(\d*)-(\d*)/);
  if (range && (range[1] || range[2])) {
    // videos need byte ranges to seek
    let a = range[1] ? +range[1] : size - +range[2], b = range[1] && range[2] ? +range[2] : size - 1;
    if (a >= size || a > b) { res.writeHead(416, { 'Content-Range': `bytes */${size}` }); return res.end(); }
    b = Math.min(b, size - 1);
    res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${a}-${b}/${size}`, 'Accept-Ranges': 'bytes', 'Content-Length': b - a + 1, 'Cache-Control': 'no-store' });
    return fs.createReadStream(abs, { start: a, end: b }).pipe(res);
  }
  res.writeHead(200, { 'Content-Type': type, 'Content-Length': size, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' });
  fs.createReadStream(abs).pipe(res);
}
const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };
const body = req => new Promise((ok, bad) => {
  let n = 0; const parts = [];
  req.on('data', c => { n += c.length; if (n > 30e6) { bad(new HttpError(413, 'Too much data.')); req.destroy(); } else parts.push(c); });
  req.on('end', () => { try { ok(parts.length ? JSON.parse(Buffer.concat(parts).toString('utf8')) : {}); } catch (_) { bad(new HttpError(400, 'Bad request.')); } });
});

// line endings: a file keeps the ones it had (Notepad files usually have CRLF)
const eolOf = text => (/\r\n/.test(text) ? '\r\n' : '\n');
function writeStory(abs, text, eol) { fs.writeFileSync(abs, text.replace(/\r\n/g, '\n').replace(/\n/g, eol)); }

const api = {
  'GET /api/ping': () => ({ app: 'kitsu-studio' }),
  'GET /api/defaults': () => ({ workers: Math.max(1, os.cpus().length - 1), cores: os.cpus().length }),
  'GET /api/stories': () => ({ stories: storyFiles().map(storyInfo).sort((a, b) => b.mtime - a.mtime) }),
  'GET /api/story': q => {
    const abs = storyPath(q.get('file'));
    if (!fs.existsSync(abs)) throw new HttpError(404, 'That story does not exist.');
    return { file: relOf(abs), name: engine().check.storyName(abs), text: fs.readFileSync(abs, 'utf8').replace(/\r\n/g, '\n'), mtime: fs.statSync(abs).mtimeMs };
  },
  'GET /api/story/stat': q => { const abs = storyPath(q.get('file')); return { exists: fs.existsSync(abs), mtime: fs.existsSync(abs) ? fs.statSync(abs).mtimeMs : null }; },
  // save; refused (409) when the file changed on disk since the app loaded it, unless force is set
  'PUT /api/story': async (q, req) => {
    const b = await body(req), abs = storyPath(b.file);
    if (!fs.existsSync(abs)) throw new HttpError(404, 'That story does not exist.');
    const old = fs.readFileSync(abs, 'utf8'), mtime = fs.statSync(abs).mtimeMs;
    if (!b.force && b.mtime && Math.abs(mtime - b.mtime) > 1 && old.replace(/\r\n/g, '\n') !== b.text) throw Object.assign(new HttpError(409, 'The story was changed outside the studio.'), { extra: { mtime } });
    if (old.replace(/\r\n/g, '\n') !== b.text) writeStory(abs, b.text, eolOf(old));
    return { mtime: fs.statSync(abs).mtimeMs };
  },
  'POST /api/stories/new': async (q, req) => {
    const b = await body(req), name = safeName(b.name);
    if (!name) throw new HttpError(400, 'Please give the story a name.');
    const abs = path.join(ROOT, 'stories', name + '.txt');
    if (fs.existsSync(abs)) throw new HttpError(409, `There is already a story called "${name}".`);
    const tpl = fs.readFileSync(TEMPLATE, 'utf8');
    const title = String(b.name).trim().replace(/\s+/g, ' ');
    fs.writeFileSync(abs, tpl.replace(/^title:.*$/m, `title: ${title}`));
    return { file: relOf(abs) };
  },
  'POST /api/stories/duplicate': async (q, req) => {
    const b = await body(req), src = storyPath(b.file), name = safeName(b.name);
    if (!name) throw new HttpError(400, 'Please give the copy a name.');
    const abs = path.join(path.dirname(src), name + '.txt');
    if (fs.existsSync(abs)) throw new HttpError(409, `There is already a story called "${name}".`);
    fs.copyFileSync(src, abs);
    return { file: relOf(abs) };
  },
  'POST /api/stories/rename': async (q, req) => {
    const b = await body(req), src = storyPath(b.file), name = safeName(b.name);
    if (!name) throw new HttpError(400, 'Please give the story a name.');
    const abs = path.join(path.dirname(src), name + '.txt');
    if (abs === src) return { file: relOf(abs) };
    if (fs.existsSync(abs)) throw new HttpError(409, `There is already a story called "${name}".`);
    fs.renameSync(src, abs);
    return { file: relOf(abs) };
  },
  // never really deleted: moved to stories/_deleted/ (with the time added if that name is taken)
  'POST /api/stories/delete': async (q, req) => {
    const b = await body(req), src = storyPath(b.file);
    if (!fs.existsSync(src)) throw new HttpError(404, 'That story does not exist.');
    const dir = path.join(path.dirname(src), '_deleted'); fs.mkdirSync(dir, { recursive: true });
    let dst = path.join(dir, path.basename(src));
    if (fs.existsSync(dst)) dst = path.join(dir, path.basename(src, '.txt') + '-' + new Date().toISOString().replace(/[:.]/g, '-') + '.txt');
    fs.renameSync(src, dst);
    return { movedTo: relOf(dst) };
  },
  'POST /api/check': async (q, req) => { const b = await body(req); storyPath(b.file); return checkText(b.file, String(b.text || '')); },
  'GET /api/vocab': () => vocab(),
  'GET /api/jobs': () => ({ jobs: jobs.slice(-50).map(publicJob) }),
  'POST /api/jobs': async (q, req) => {
    const b = await body(req);
    if (!['voices', 'render'].includes(b.kind)) throw new HttpError(400, 'Unknown job.');
    const w = b.workers === undefined ? undefined : parseInt(b.workers, 10);
    if (w !== undefined && !(w >= 1 && w <= 64)) throw new HttpError(400, 'Workers must be a number from 1 to 64.');
    return publicJob(addJob(b.kind, b.file, { workers: w, resume: !!b.resume, allowPlaceholders: !!b.allowPlaceholders }));
  },
  'POST /api/jobs/cancel': async (q, req) => {
    const b = await body(req), j = jobs.find(x => x.id === b.id);
    if (!j) throw new HttpError(404, 'There is no such job.');
    cancelJob(j); return publicJob(j);
  },
  'GET /api/report': q => {
    const name = engine().check.storyName(storyPath(q.get('file'))), url = f => { const v = videoFile(name, f); return fs.existsSync(v.abs) ? v.url : null; };
    return {
      results: readReport(name), video: url(name + '.mp4'),
      // the YouTube files (F11)
      thumbnail: url(`${name}-thumbnail.jpg`) || url(`${name}-cover.jpg`),
      subtitles: url(`${name}.srt`),
      description: url(`${name}-description.txt`),
      // the video's own folder, for "Open folder"
      folder: videoFile(name, '').rel,
    };
  },
  // the subtitles as WebVTT, for the video player in the app
  'GET /api/subtitles.vtt': (q, req, res) => {
    const name = engine().check.storyName(storyPath(q.get('file'))), f = videoFile(name, name + '.srt').abs;
    if (!fs.existsSync(f)) throw new HttpError(404, 'No subtitles yet.');
    const vtt = 'WEBVTT\n\n' + fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n').replace(/(\d\d:\d\d:\d\d),(\d\d\d)/g, '$1.$2');
    res.writeHead(200, { 'Content-Type': 'text/vtt; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(vtt);
    return undefined;
  },
  // the preview's current frame -> videos/<name>/<name>-still-<t>s.png (named like the CMD tool's stills)
  'POST /api/still': async (q, req) => {
    const b = await body(req), name = engine().check.storyName(storyPath(b.file)), t = +b.t;
    const m = String(b.png || '').match(/^data:image\/png;base64,(.+)$/);
    if (!m || !isFinite(t)) throw new HttpError(400, 'Bad still.');
    const out = videoFile(name, `${name}-still-${t.toFixed(1)}s.png`).abs;
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, Buffer.from(m[1], 'base64'));
    return { file: relOf(out) };
  },
  // shows a file (or folder) of the project in Windows Explorer
  'POST /api/open-folder': async (q, req) => {
    const b = await body(req), abs = inside(b.path || 'videos', ['videos', 'stories', 'episodes', 'build']);
    if (process.platform === 'win32') {
      const args = fs.existsSync(abs) && fs.statSync(abs).isFile() ? [`/select,${abs}`] : [fs.existsSync(abs) ? abs : path.dirname(abs)];
      spawn('explorer.exe', args, { detached: true, stdio: 'ignore' }).unref();
    } else spawn(process.platform === 'darwin' ? 'open' : 'xdg-open', [fs.existsSync(abs) && fs.statSync(abs).isFile() ? path.dirname(abs) : abs], { detached: true, stdio: 'ignore' }).unref();
    return { ok: true };
  },
};

const server = http.createServer(async (req, res) => {
  // only this computer, by name: a web page elsewhere can't reach the studio through a look-alike address
  const host = String(req.headers.host || '').replace(/:\d+$/, '');
  if (!['127.0.0.1', 'localhost'].includes(host)) { res.writeHead(403); return res.end('Forbidden'); }
  const url = new URL(req.url, 'http://x');
  const p = decodeURIComponent(url.pathname);
  try {
    if (p === '/api/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
      res.write('retry: 2000\n\n');
      jobs.slice(-50).forEach(j => res.write(`event: job\ndata: ${JSON.stringify(publicJob(j))}\n\n`));
      clients.add(res);
      const ping = setInterval(() => res.write(': ping\n\n'), 15000);
      req.on('close', () => { clearInterval(ping); clients.delete(res); });
      return;
    }
    if (p.startsWith('/api/')) {
      const h = api[`${req.method} ${p}`];
      if (!h) throw new HttpError(404, 'Unknown request.');
      const out = await h(url.searchParams, req, res);
      return out === undefined ? undefined : json(res, 200, out);
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'Not allowed.');
    const rel = p.replace(/^\/+/, '');
    if (SERVED.some(f => rel.startsWith(f + '/'))) return sendFile(req, res, inside(rel, SERVED));
    // the app itself (any other address shows the app, which picks the screen)
    const file = path.resolve(DIST, rel || 'index.html');
    if (file.startsWith(DIST + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) return sendFile(req, res, file);
    if (!fs.existsSync(path.join(DIST, 'index.html'))) { res.writeHead(500, { 'Content-Type': 'text/plain' }); return res.end('The studio app is not built yet. Please run setup.bat.'); }
    return sendFile(req, res, path.join(DIST, 'index.html'));
  } catch (e) {
    if (e instanceof HttpError) return json(res, e.code, { error: e.message, ...(e.extra || {}) });
    console.error(e);
    return json(res, 500, { error: 'Something went wrong: ' + (e && e.message || e) });
  }
});

if (require.main === module) {
  const open = process.argv.includes('--open');
  const openBrowser = () => { if (open && process.platform === 'win32') spawn('cmd', ['/c', 'start', '', `http://localhost:${PORT}`], { detached: true, stdio: 'ignore' }).unref(); };
  server.on('error', e => {
    if (e.code !== 'EADDRINUSE') throw e;
    // already running (Kitsu Studio.bat started twice): just open it
    http.get(`http://127.0.0.1:${PORT}/api/ping`, r => {
      let s = ''; r.on('data', c => { s += c; }); r.on('end', () => {
        if (s.includes('kitsu-studio')) { console.log('Kitsu Studio is already running.'); openBrowser(); process.exit(0); }
        console.error(`Another program is using port ${PORT}. Close it, or start the studio with KITSU_PORT set to another number.`); process.exit(1);
      });
    }).on('error', () => { console.error(`Port ${PORT} is busy.`); process.exit(1); });
  });
  server.listen(PORT, HOST, () => {
    console.log(`Kitsu Studio is running at http://localhost:${PORT}  (only on this computer)`);
    console.log('Keep this window open while you use the studio. Close it to stop the studio.');
    openBrowser();
  });
}
module.exports = { server, inside, checkText, safeName };
