#!/usr/bin/env node
// Kitsu Flow: makes a Ren & Yuki video in Google Flow from a story file, by itself, with no AI assistant in the loop
// (so it costs no Claude usage). It drives flow-mcp (github.com/GTAI-1/flow-mcp), installed in its own folder, through
// that program's local API, and keeps each Google account in its own signed-in Chrome window.
//
//   flow-video setup <flow-mcp folder>      once: where flow-mcp is installed
//   flow-video login 1                      once per account: sign in to Google in that account's Chrome window
//   flow-video credits                      the plan and credits left on every account
//   flow-video check <story>                read the story, list what will be made (spends nothing)
//   flow-video make <story>                 frames first (free); run again for the clips and the finished film
//   flow-video make <story> --all           frames, clips and the film in one go
//   flow-video make <story> --redo frame 3  make frame 3 again (also: --redo clip 2, --redo film)
//   flow-video make <story> --account 2     use account 2 only (default: whichever has the most credits)
//
// Everything lands in flow/output/<project>/: frames/frame-01.png..., clips/clip-01.mp4..., film.mp4.
// Already-made frames and clips are kept, so a run that stops (no credits left, Chrome closed) carries on where it was.
const fs = require('fs'), path = require('path'), os = require('os'), { spawn } = require('child_process');
const { parseFlowStory, framePrompt, clipPrompt, castOf } = require('./lib/story');

const HERE = __dirname, ROOT = path.resolve(HERE, '..');
const SETTINGS_FILE = process.env.KITSU_FLOW_SETTINGS || path.join(HERE, 'settings.json');
const OUTPUT = process.env.KITSU_FLOW_OUTPUT || path.join(HERE, 'output');
const ACCOUNTS_HOME = process.env.KITSU_FLOW_HOME || path.join(os.homedir(), '.kitsu-flow');
const say = (...a) => console.log(...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));
class Stop extends Error {}
const stop = msg => { throw new Stop(msg); };

// ---------- settings and accounts ----------
function settings() {
  let s = {};
  try { s = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')); } catch (_) { /* not set up yet */ }
  return { flowMcp: s.flowMcp || process.env.FLOW_MCP_DIR || '', accounts: s.accounts || { 1: 'Account 1', 2: 'Account 2' } };
}
function flowMcpDir() {
  const dir = settings().flowMcp;
  if (!dir) stop('First tell me where flow-mcp is installed:\n  flow-video setup C:\\Users\\you\\flow-mcp');
  if (!fs.existsSync(path.join(dir, 'dist', 'core.js'))) stop(`flow-mcp isn't built in ${dir}.\nIn that folder run:  npm install  and then  npm run build`);
  return dir;
}
// each account: its own Chrome profile and its own ports, so both can be signed in at once, and neither touches the
// flow-mcp that Claude may use (that one is ~/.flow-mcp on ports 8787 and 9333)
function account(n) {
  const names = settings().accounts;
  if (!names[n]) stop(`There is no account ${n}. Accounts: ${Object.keys(names).join(', ')} (see flow/settings.json).`);
  return { n: String(n), name: names[n], home: path.join(ACCOUNTS_HOME, `account-${n}`), port: 8790 + +n, cdp: 9340 + +n };
}
const accounts = () => Object.keys(settings().accounts).map(account);
function envFor(a) {
  const env = { ...process.env, FLOW_MCP_HOME: a.home, FLOW_MCP_PORT: String(a.port), FLOW_MCP_CDP_PORT: String(a.cdp), FLOW_MCP_OUTPUT: path.join(OUTPUT, '_flow') };
  // joining the clips needs FFmpeg: use the one Kitsu Studio already has
  if (!env.FLOW_MCP_FFMPEG) { try { env.FLOW_MCP_FFMPEG = require(path.join(ROOT, 'node_modules', 'ffmpeg-static')); } catch (_) { /* then ffmpeg on the PATH */ } }
  if (!env.FLOW_MCP_FFPROBE) { try { env.FLOW_MCP_FFPROBE = require(path.join(ROOT, 'node_modules', 'ffprobe-static')).path; } catch (_) { /* then ffprobe on the PATH */ } }
  return env;
}

// ---------- talking to flow-mcp ----------
const servers = [];
async function health(a) {
  try { const r = await fetch(`http://127.0.0.1:${a.port}/api/health`, { signal: AbortSignal.timeout(2000) }); return r.ok && (await r.json()).name === 'flow-mcp'; } catch (_) { return false; }
}
async function up(a) {
  if (!(await health(a))) {
    const child = spawn(process.execPath, [path.join(HERE, 'lib', 'serve.mjs'), flowMcpDir()], { env: envFor(a), stdio: ['ignore', 'pipe', 'pipe'] });
    let log = ''; child.stdout.on('data', d => { log += d; }); child.stderr.on('data', d => { log += d; });
    servers.push(child);
    for (let i = 0; i < 60 && !(await health(a)); i++) {
      if (child.exitCode !== null) stop(`flow-mcp could not start for ${a.name}:\n${log.trim().slice(-600)}`);
      await sleep(500);
    }
    if (!(await health(a))) stop(`flow-mcp did not start for ${a.name} (port ${a.port}).`);
  }
  return a;
}
async function api(a, method, body = {}) {
  const token = fs.readFileSync(path.join(a.home, 'token'), 'utf8').trim();
  const r = await fetch(`http://127.0.0.1:${a.port}/api/${method}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-flow-token': token }, body: JSON.stringify(body) });
  const out = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(out.error || `flow-mcp said ${r.status} to ${method}`);
  return out;
}
const shutdown = () => servers.forEach(c => { try { c.kill(); } catch (_) { /* already gone */ } });

// signed in, a project open, and the credits left (null when it can't be read)
async function state(a) {
  await up(a);
  const s = (await api(a, 'status', { detailed: true })).flow || {};
  return { ok: s.signedIn && s.inProject, credits: typeof s.credits_remaining === 'number' ? s.credits_remaining : null, plan: s.plan, hint: s.hint };
}
function showState(a, s) {
  say(`  ${a.n}. ${a.name}: ${s.ok ? `${s.credits === null ? 'credits unknown' : `${s.credits} credits`}${s.plan ? ` (${s.plan})` : ''}` : s.hint || 'not ready'}`);
}

// waits for jobs, printing each change; returns the finished jobs
async function waitFor(a, ids, label) {
  let last = '';
  for (;;) {
    const w = await api(a, 'wait', { job_ids: ids, timeout_seconds: 40 });
    const line = w.jobs.map(j => `${j.status}${j.progress ? ` ${j.progress}` : ''}`).join(', ') + (w.pacing ? ` (${w.pacing})` : '');
    if (line !== last) { say(`    ${label}: ${line}`); last = line; }
    if (w.finished) return w.jobs;
  }
}

// ---------- the story's files ----------
const outDir = story => path.join(OUTPUT, story.meta.project);
const stateFile = story => path.join(outDir(story), 'made.json');
function made(story) { try { return JSON.parse(fs.readFileSync(stateFile(story), 'utf8')); } catch (_) { return { frames: {}, clips: {}, credits: {} }; } }
function saveMade(story, m) { fs.mkdirSync(outDir(story), { recursive: true }); fs.writeFileSync(stateFile(story), JSON.stringify(m, null, 2)); }
const have = f => f && fs.existsSync(f);
function keep(src, dir, name) {
  fs.mkdirSync(dir, { recursive: true });
  const dst = path.join(dir, name + path.extname(src).toLowerCase());
  fs.copyFileSync(src, dst);
  return dst;
}
function readStory(file) {
  if (!file) stop('Which story? For example:  flow-video make flow\\stories\\my-story.txt');
  if (!fs.existsSync(file)) stop(`I can't find ${file}.`);
  const story = parseFlowStory(fs.readFileSync(file, 'utf8'));
  if (story.errors.length) stop(`Please fix these lines in ${path.basename(file)}:\n  ${story.errors.join('\n  ')}`);
  return story;
}

// ---------- making ----------
async function makeFrames(story, a, m, todo) {
  say(`\nFrames (free): ${todo.map(f => f.n).join(', ')} on ${a.name}`);
  // one at a time, so each can use the frame before it as a reference and keep the look the same
  for (const f of todo) {
    const prev = story.frames[story.frames.indexOf(f) - 1], prevFile = prev && m.frames[prev.n];
    const refs = [...(have(prevFile) ? [path.resolve(prevFile)] : []), ...castOf(story.meta, f.text).map(c => `asset:${c}`)].slice(0, 3);
    const scene = { type: 'image', prompt: framePrompt(story.meta, f) + (have(prevFile) ? ' Match the previous image exactly for the characters, colours, light and drawing style; this is the same scene a moment later.' : ''),
      aspect_ratio: story.meta.aspect, max_credits: 0, ...(refs.length ? { reference_images: refs } : {}), ...(story.meta.frameModel ? { model: story.meta.frameModel } : {}), download_quality: story.meta.quality };
    const q = await api(a, 'generate', { project: `${story.meta.project}-frames`, scenes: [scene] });
    const [job] = await waitFor(a, q.jobs.map(j => j.id), `frame ${f.n}`);
    const file = job.status === 'done' && job.files.find(x => /\.(png|jpe?g|webp)$/i.test(x));
    if (!file) stop(`Frame ${f.n} wasn't made: ${job.error || job.status}. Run the same command again to try once more.`);
    m.frames[f.n] = keep(file, path.join(outDir(story), 'frames'), `frame-${String(f.n).padStart(2, '0')}`);
    saveMade(story, m);
    say(`    frame ${f.n}: ${path.relative(process.cwd(), m.frames[f.n])}`);
  }
}

// Clips one at a time. Before each one the credits are read; when the account in use has fewer left than a clip may
// cost (the story's "max credits"), it moves to another account that has enough, by itself.
async function makeClips(story, accts, pinned, m) {
  const todo = story.clips.filter(c => !have(m.clips[c.n]));
  const need = story.meta.maxCredits;
  say(`\nClips: ${todo.map(c => c.n).join(', ')} (each at most ${need} credits)`);
  let a = null;
  for (const c of todo) {
    // the account for this clip
    const pick = [];
    for (const x of pinned ? [pinned] : accts) { const s = await state(x); if (s.ok) pick.push({ a: x, s }); }
    const fits = pick.filter(p => p.s.credits === null || p.s.credits >= need);
    const keepOn = a && fits.find(p => p.a === a);
    const best = keepOn || fits.sort((p, q) => (q.s.credits ?? 0) - (p.s.credits ?? 0))[0];
    if (!best) {
      pick.forEach(p => showState(p.a, p.s));
      stop(`No account has ${need} credits left for clip ${c.n}. Everything made so far is kept: run the same command again when credits are back${pinned ? ', or without --account to use the other account' : ''}.`);
    }
    if (a && best.a !== a) say(`  ${a.name} is low on credits: switching to ${best.a.name} (${best.s.credits} credits).`);
    a = best.a;
    const scene = { type: 'video', prompt: clipPrompt(story.meta, c), aspect_ratio: story.meta.aspect, max_credits: need,
      first_frame: path.resolve(m.frames[c.from]), last_frame: path.resolve(m.frames[c.to]), download_quality: story.meta.quality,
      ...(story.meta.model ? { model: story.meta.model } : {}), ...(story.meta.duration ? { duration: story.meta.duration } : {}), ...(story.meta.resolution ? { resolution: story.meta.resolution } : {}) };
    say(`  clip ${c.n} (frame ${c.from} to frame ${c.to}) on ${a.name}${best.s.credits !== null ? `, ${best.s.credits} credits left` : ''}`);
    const q = await api(a, 'generate', { project: `${story.meta.project}-clips`, scenes: [scene] });
    const [job] = await waitFor(a, q.jobs.map(j => j.id), `clip ${c.n}`);
    const file = job.status === 'done' && job.files.find(x => /\.(mp4|webm|mov)$/i.test(x));
    if (!file) stop(`Clip ${c.n} wasn't made: ${job.error || job.status}.\nThe clips made so far are kept: run the same command again to carry on.${/credit/i.test(job.error || '') ? ' (It looks like a credits problem: try --account with your other account.)' : ''}`);
    m.clips[c.n] = keep(file, path.join(outDir(story), 'clips'), `clip-${String(c.n).padStart(2, '0')}`);
    m.credits[c.n] = { account: a.n, credits: job.credits ?? null };
    saveMade(story, m);
    say(`    clip ${c.n}: ${path.relative(process.cwd(), m.clips[c.n])}${job.credits ? ` (${job.credits} credits)` : ''}`);
  }
  return a;
}

async function makeFilm(story, a, m) {
  say('\nJoining the clips into the film...');
  const clips = story.clips.map(c => path.resolve(m.clips[c.n]));
  const r = await api(a, 'assemble', { project: `${story.meta.project}-film`, clips, output_name: 'film', hold_last_frame: false });
  const src = r.output;
  if (!have(src)) stop(`The film wasn't made: ${JSON.stringify(r).slice(0, 300)}`);
  m.film = keep(src, outDir(story), 'film');
  saveMade(story, m);
  say(`  ${path.relative(process.cwd(), m.film)}`);
}

async function make(file, opts) {
  const story = readStory(file);
  const m = made(story);
  if (opts.redo) {
    const [kind, n] = opts.redo;
    if (kind === 'film') delete m.film; else if (kind === 'frame') delete m.frames[n]; else if (kind === 'clip') delete m.clips[n];
    // a new frame changes the clips that start or end on it
    if (kind === 'frame') story.clips.filter(c => c.from === +n || c.to === +n).forEach(c => { if (m.clips[c.n]) { delete m.clips[c.n]; say(`(clip ${c.n} uses frame ${n}, so it will be made again too)`); } });
    if (kind !== 'film') delete m.film;
    saveMade(story, m);
  }
  const pinned = opts.account ? account(opts.account) : null;
  say(`${story.meta.title}: ${story.frames.length} frames, ${story.clips.length} clips, ${story.meta.aspect}`);
  say('Accounts:');
  const accts = pinned ? [pinned] : accounts(), ready = [];
  for (const a of accts) { const s = await state(a); showState(a, s); if (s.ok) ready.push({ a, s }); }
  if (!ready.length) stop(`No account is ready. Sign in with  flow-video login ${accts[0].n}  and open a Flow project in that Chrome window, then try again.`);
  const first = ready.sort((p, q) => (q.s.credits ?? 0) - (p.s.credits ?? 0))[0].a;

  const frames = story.frames.filter(f => !have(m.frames[f.n]));
  if (frames.length) {
    await makeFrames(story, first, m, frames);
    if (!opts.all) {
      say(`\nThe frames are ready in ${path.relative(process.cwd(), path.join(outDir(story), 'frames'))}. Look at them first: they're free, clips cost credits.`);
      say(`  Redo one:            flow-video make ${file} --redo frame 3`);
      say(`  Then make the clips: flow-video make ${file}`);
      return;
    }
  } else say('\nFrames: all made.');

  const need = story.clips.filter(c => !have(m.clips[c.n]));
  let a = first;
  if (need.length) a = await makeClips(story, accts.map(x => x), pinned, m) || first; else say('Clips: all made.');
  if (!have(m.film) && story.clips.length) await makeFilm(story, a, m);
  const spent = Object.values(m.credits).reduce((s, x) => s + (x.credits || 0), 0);
  say(`\nDone: ${path.relative(process.cwd(), m.film || outDir(story))}${spent ? ` (clips cost ${spent} credits in all)` : ''}`);
}

function check(file) {
  const story = readStory(file);
  const m = made(story);
  say(`${story.meta.title}  (project "${story.meta.project}", ${story.meta.aspect}${story.meta.model ? `, ${story.meta.model}` : ''}, at most ${story.meta.maxCredits} credits a clip)`);
  if (story.meta.characters.length) say(`Flow characters: ${story.meta.characters.join(', ')}`);
  say('\nFrames (free):');
  story.frames.forEach(f => say(`  ${have(m.frames[f.n]) ? 'made ' : '     '} frame ${f.n}${castOf(story.meta, f.text).length ? ` [${castOf(story.meta, f.text).join(', ')}]` : ''}: ${f.text.slice(0, 80)}${f.text.length > 80 ? '...' : ''}`));
  say('\nClips:');
  story.clips.forEach(c => say(`  ${have(m.clips[c.n]) ? 'made ' : '     '} clip ${c.n}: frame ${c.from} to frame ${c.to}: ${c.text.slice(0, 70)}${c.text.length > 70 ? '...' : ''}`));
  const left = story.clips.filter(c => !have(m.clips[c.n])).length;
  say(`\n${left} clip(s) still to make: at most ${left * story.meta.maxCredits} credits. Nothing has been spent by this check.`);
}

async function credits() {
  say('Accounts:');
  for (const a of accounts()) showState(a, await state(a).catch(e => ({ ok: false, hint: e.message })));
}

function setup(dir) {
  if (!dir) stop('Where is flow-mcp? For example:  flow-video setup C:\\Users\\you\\flow-mcp');
  dir = path.resolve(dir);
  if (!fs.existsSync(path.join(dir, 'package.json'))) stop(`${dir} doesn't look like the flow-mcp folder (no package.json).`);
  const s = settings();
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify({ flowMcp: dir, accounts: s.accounts }, null, 2));
  say(`Saved: flow-mcp is in ${dir}`);
  if (!fs.existsSync(path.join(dir, 'dist', 'core.js'))) say('It isn\'t built yet. In that folder run:  npm install  and then  npm run build');
  say(`Accounts: ${Object.entries(s.accounts).map(([n, name]) => `${n} (${name})`).join(', ')}. You can rename them in flow\\settings.json.`);
  say('Next, sign in to each account once:  flow-video login 1   and   flow-video login 2');
}

function login(n) {
  const a = account(n || 1);
  say(`Opening a Chrome window for ${a.name}. Sign in to Google there, open (or create) a Flow project, and leave the window open.`);
  const child = spawn(process.execPath, [path.join(flowMcpDir(), 'dist', 'login.js')], { env: envFor(a), stdio: 'inherit' });
  return new Promise(r => child.on('exit', r));
}

// ---------- command line ----------
async function main(argv) {
  const [cmd, ...rest] = argv, opt = k => { const i = rest.indexOf(`--${k}`); return i >= 0 ? rest[i + 1] : null; };
  const file = rest.find((x, i) => !x.startsWith('--') && !['--account', '--redo'].includes(rest[i - 1]) && !(rest[i - 2] === '--redo'));
  if (cmd === 'setup') return setup(rest[0]);
  if (cmd === 'login') return login(rest[0]);
  if (cmd === 'credits') return credits();
  if (cmd === 'check') return check(file);
  if (cmd === 'make') {
    let redo = null;
    const ri = rest.indexOf('--redo');
    if (ri >= 0) {
      redo = [String(rest[ri + 1] || '').toLowerCase(), rest[ri + 2]];
      if (!/^(frame|clip|film)$/.test(redo[0]) || (redo[0] !== 'film' && !/^\d+$/.test(redo[1] || ''))) stop('Use --redo frame 3, --redo clip 2, or --redo film.');
    }
    return make(file, { all: rest.includes('--all'), account: opt('account'), redo });
  }
  say(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 17).map(l => l.replace(/^\/\/ ?/, '')).join('\n'));
}

if (require.main === module) {
  main(process.argv.slice(2))
    .catch(e => { console.error(`\n${e instanceof Stop ? e.message : `Something went wrong: ${e.stack || e}`}`); process.exitCode = 1; })
    .finally(shutdown);
}
module.exports = { main, shutdown };
