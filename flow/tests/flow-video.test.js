// Tests Kitsu Flow against a pretend flow-mcp (same local API, no Chrome, no Google, no credits).
//   node --test flow/tests/
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync, spawnSync } = require('child_process');
const { parseFlowStory, framePrompt, castOf } = require('../lib/story');

const CLI = path.join(__dirname, '..', 'flow-video.js');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kitsu-flow-'));

// the pretend flow-mcp: dist/core.js, dist/server.js and dist/login.js, like the real one after "npm run build"
const fake = path.join(tmp, 'flow-mcp'), dist = path.join(fake, 'dist');
fs.mkdirSync(dist, { recursive: true });
fs.writeFileSync(path.join(fake, 'package.json'), '{"name":"flow-mcp"}');
fs.writeFileSync(path.join(dist, 'login.js'), 'console.log("login", process.env.FLOW_MCP_HOME);');
fs.writeFileSync(path.join(dist, 'core.js'), `
import { mkdirSync, writeFileSync, readFileSync, existsSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
const HOME = process.env.FLOW_MCP_HOME, OUT = process.env.FLOW_MCP_OUTPUT;
const bank = join(HOME, 'credits'), log = join(HOME, 'calls.log');
const credits = () => Number(readFileSync(bank, 'utf8'));
export class LocalCore {
  jobs = {}; n = 0;
  async status() { return { flow: { signedIn: true, inProject: true, plan: 'Pro', credits_remaining: credits() } }; }
  async generate({ project, scenes }) {
    const dir = join(OUT, project); mkdirSync(dir, { recursive: true });
    return { jobs: scenes.map(s => {
      appendFileSync(log, JSON.stringify(s) + '\\n');
      const id = 'j' + (++this.n), file = join(dir, 'scene-' + this.n + (s.type === 'image' ? '.png' : '.mp4'));
      if (s.type === 'video') {
        if (credits() < 20) return (this.jobs[id] = { id, status: 'failed', files: [], error: 'Not enough credits' });
        writeFileSync(bank, String(credits() - 20));
      }
      writeFileSync(file, s.prompt);
      return (this.jobs[id] = { id, status: 'done', files: [file], credits: s.type === 'video' ? 20 : 0 });
    }) };
  }
  async wait({ job_ids }) { return { finished: true, jobs: job_ids.map(id => this.jobs[id]) }; }
  async assemble({ project, clips, output_name }) {
    const dir = join(OUT, project); mkdirSync(dir, { recursive: true });
    const output = join(dir, output_name + '.mp4'); writeFileSync(output, clips.map(c => readFileSync(c, 'utf8')).join('\\n---\\n'));
    return { output, clips };
  }
}`);
fs.writeFileSync(path.join(dist, 'server.js'), `
import { createServer } from 'node:http';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
export const PORT = Number(process.env.FLOW_MCP_PORT);
export async function startServer(core) {
  const token = 'tok' + PORT;
  createServer(async (req, res) => {
    const send = (c, d) => { res.writeHead(c, { 'content-type': 'application/json' }); res.end(JSON.stringify(d)); };
    if (req.url === '/api/health') return send(200, { name: 'flow-mcp' });
    if (req.headers['x-flow-token'] !== token) return send(401, { error: 'token' });
    let body = ''; for await (const c of req) body += c;
    try { send(200, await core[req.url.split('/').pop()](JSON.parse(body || '{}'))); } catch (e) { send(400, { error: e.message }); }
  }).listen(PORT, '127.0.0.1');
  mkdirSync(process.env.FLOW_MCP_HOME, { recursive: true }); writeFileSync(join(process.env.FLOW_MCP_HOME, 'token'), token);
  return 'owner';
}`);

const env = { ...process.env, KITSU_FLOW_SETTINGS: path.join(tmp, 'settings.json'), KITSU_FLOW_OUTPUT: path.join(tmp, 'output'), KITSU_FLOW_HOME: path.join(tmp, 'accounts') };
const run = (...args) => { const r = spawnSync(process.execPath, [CLI, ...args], { env, encoding: 'utf8', cwd: tmp }); return { code: r.status, out: r.stdout + r.stderr }; };
const bank = (n, v) => { const d = path.join(tmp, 'accounts', `account-${n}`); fs.mkdirSync(d, { recursive: true }); if (v !== undefined) fs.writeFileSync(path.join(d, 'credits'), String(v)); return Number(fs.readFileSync(path.join(d, 'credits'), 'utf8')); };
const calls = n => { try { return fs.readFileSync(path.join(tmp, 'accounts', `account-${n}`, 'calls.log'), 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse); } catch (_) { return []; } };

const STORY = path.join(tmp, 'story.txt');
fs.writeFileSync(STORY, `title: The Test Fox
aspect: 9:16
characters: Ren, Yuki
max credits: 25
style: Cute chibi cartoon
place: A meadow

frame 1: Ren and Yuki stand together.
frame 2: Ren points up.
frame 3: A butterfly lands on the meadow.

clip 1: frame 1 to frame 2
Ren points up.
Ren (excited): "Look!"
clip 2: frame 2 to frame 3
A butterfly lands.
`);

test('the story file: settings, frames, clips, prompts and characters', () => {
  const s = parseFlowStory(fs.readFileSync(STORY, 'utf8'));
  assert.deepStrictEqual(s.errors, []);
  assert.strictEqual(s.meta.project, 'the-test-fox');
  assert.deepStrictEqual(s.frames.map(f => f.n), [1, 2, 3]);
  assert.deepStrictEqual(s.clips.map(c => [c.from, c.to]), [[1, 2], [2, 3]]);
  assert.strictEqual(s.clips[0].text, 'Ren points up. Ren (excited): "Look!"');
  assert.strictEqual(framePrompt(s.meta, s.frames[0]), 'Cute chibi cartoon. A meadow. Ren and Yuki stand together.');
  assert.deepStrictEqual(castOf(s.meta, s.frames[2].text), []);
  const bad = parseFlowStory('aspect: 4:3\nframe 1: x\nclip 1: frame 1 to frame 9\ny\nclip 2 frame 1\n');
  assert.ok(bad.errors.some(e => /title/.test(e)));
  assert.ok(bad.errors.some(e => /9:16/.test(e)));
  assert.ok(bad.errors.some(e => /no "frame 9:"/.test(e)));
  assert.ok(bad.errors.some(e => /clip 1: frame 1 to frame 2/.test(e)));
});

test('setup, then check spends nothing', () => {
  assert.match(run('setup', fake).out, /Saved/);
  const c = run('check', STORY);
  assert.strictEqual(c.code, 0, c.out);
  assert.match(c.out, /frame 1 \[Ren, Yuki\]/);
  assert.match(c.out, /2 clip\(s\) still to make: at most 50 credits/);
});

test('make: frames first (free), with the previous frame and the characters as references', () => {
  bank(1, 30); bank(2, 100);
  const r = run('make', STORY);
  assert.strictEqual(r.code, 0, r.out);
  assert.match(r.out, /The frames are ready/);
  // the account with the most credits makes the frames
  const imgs = calls(2).filter(c => c.type === 'image');
  assert.strictEqual(imgs.length, 3);
  assert.deepStrictEqual(imgs[0].reference_images, ['asset:Ren', 'asset:Yuki']);
  assert.match(imgs[1].reference_images[0], /frame-01\.png$/);
  assert.match(imgs[1].prompt, /Match the previous image/);
  assert.strictEqual(calls(1).length, 0);
  assert.ok(fs.existsSync(path.join(tmp, 'output', 'the-test-fox', 'frames', 'frame-03.png')));
});

test('make again: clips from frame to frame, switching account when one runs low, then the film', () => {
  bank(1, 30); bank(2, 30);
  const r = run('make', STORY);
  assert.strictEqual(r.code, 0, r.out);
  const v1 = calls(1).filter(c => c.type === 'video'), v2 = calls(2).filter(c => c.type === 'video');
  assert.strictEqual(v1.length + v2.length, 2);
  assert.match(r.out, /switching to/);
  const clip = [...v1, ...v2][0];
  assert.match(clip.first_frame, /frame-01\.png$/); assert.match(clip.last_frame, /frame-02\.png$/);
  assert.strictEqual(clip.aspect_ratio, '9:16'); assert.strictEqual(clip.max_credits, 25);
  const film = path.join(tmp, 'output', 'the-test-fox', 'film.mp4');
  assert.ok(fs.existsSync(film));
  assert.strictEqual(fs.readFileSync(film, 'utf8').split('---').length, 2);
  assert.match(r.out, /clips cost 40 credits/);
});

test('nothing is made twice; --redo frame 2 makes that frame and its two clips again', () => {
  bank(1, 100); bank(2, 0);
  const before = calls(1).length + calls(2).length;
  assert.match(run('make', STORY).out, /Frames: all made[\s\S]*Clips: all made/);
  assert.strictEqual(calls(1).length + calls(2).length, before);
  const b1 = calls(1).length, b2 = calls(2).length;
  const r = run('make', STORY, '--redo', 'frame', '2', '--all');
  assert.strictEqual(r.code, 0, r.out);
  assert.match(r.out, /clip 1 uses frame 2[\s\S]*clip 2 uses frame 2/);
  const after = [...calls(1).slice(b1), ...calls(2).slice(b2)];
  assert.deepStrictEqual(after.map(c => c.type), ['image', 'video', 'video']);
});

test('no account with enough credits: stops, keeps what was made, says what to do', () => {
  bank(1, 5); bank(2, 5);
  const r = run('make', STORY, '--redo', 'clip', '1');
  assert.strictEqual(r.code, 1);
  assert.match(r.out, /No account has 25 credits left for clip 1/);
  assert.ok(fs.existsSync(path.join(tmp, 'output', 'the-test-fox', 'clips', 'clip-02.mp4')));
});

test('--account pins one account', () => {
  bank(1, 100); bank(2, 100);
  const before = calls(2).length;
  const r = run('make', STORY, '--account', '1');
  assert.strictEqual(r.code, 0, r.out);
  assert.strictEqual(calls(2).length, before);
});

test.after(() => { spawnSync(process.platform === 'win32' ? 'cmd' : 'true'); fs.rmSync(tmp, { recursive: true, force: true }); });
