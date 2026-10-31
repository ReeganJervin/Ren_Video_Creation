// Tests Kitsu Flow against a pretend flow-mcp (same local API, no Chrome, no Google, no credits).
//   node --test flow/tests/
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), os = require('os');
const { spawnSync } = require('child_process');
const { parseFlowStory, framePrompt, castOf } = require('../lib/story');
const { probe } = require('../lib/join');

const CLI = path.join(__dirname, '..', 'flow-video.js');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kitsu-flow-'));

// a pretend Flow (no Chrome, no Google, no credits): an engine with the same methods as lib/flow-web.js
const engine = path.join(tmp, 'fake-flow.js');
fs.writeFileSync(engine, `
const fs = require('fs'), path = require('path');
class FlowAccount {
  constructor(o) { Object.assign(this, o); fs.mkdirSync(o.home, { recursive: true }); }
  file(f) { return path.join(this.home, f); }
  credits() { return Number(fs.readFileSync(this.file('credits'), 'utf8')); }
  async state() { return { ok: true, credits: this.credits(), plan: 'PRO' }; }
  async generate(s, stem, progress, name) {
    fs.appendFileSync(this.file('calls.log'), JSON.stringify(s) + '\\n');
    const cost = s.type === 'video' ? 20 : 0;
    if (cost > s.max_credits) throw new Error('too dear');
    if (this.credits() < cost) throw new Error('Not enough credits');
    fs.writeFileSync(this.file('credits'), String(this.credits() - cost));
    progress('started');
    fs.mkdirSync(path.dirname(stem), { recursive: true });
    const out = stem + (s.type === 'image' ? '.png' : '.mp4');
    if (s.type === 'video') require('child_process').execFileSync(require(${JSON.stringify(require.resolve(path.join(__dirname, '..', 'lib', 'join.js')))}).FFMPEG,
      ['-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=orange:s=180x320:d=1', ...(fs.existsSync(this.file('mute')) ? [] : ['-f', 'lavfi', '-i', 'sine=d=1']), '-shortest', out]);
    else fs.writeFileSync(out, s.prompt);
    return { files: [out], credits: cost, title: name + '-t' + Date.now() };
  }
}
module.exports = { FlowAccount };`);

const env = { ...process.env, KITSU_FLOW_ENGINE: engine, KITSU_FLOW_SETTINGS: path.join(tmp, 'settings.json'), KITSU_FLOW_OUTPUT: path.join(tmp, 'output'), KITSU_FLOW_HOME: path.join(tmp, 'accounts') };
const run = (...args) => { const r = spawnSync(process.execPath, [CLI, ...args], { env, encoding: 'utf8', cwd: tmp }); return { code: r.status, out: r.stdout + r.stderr }; };
const bank = (n, v) => { const d = path.join(tmp, 'accounts', `account-${n}`); fs.mkdirSync(d, { recursive: true }); if (v !== undefined) fs.writeFileSync(path.join(d, 'credits'), String(v)); return Number(fs.readFileSync(path.join(d, 'credits'), 'utf8')); };
const calls = n => { try { return fs.readFileSync(path.join(tmp, 'accounts', `account-${n}`, 'calls.log'), 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse); } catch (_) { return []; } };

const STORY = path.join(tmp, 'story.txt');
fs.writeFileSync(STORY, `title: The Test Fox
aspect: 9:16
sides: Ren left, Yuki right
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
  assert.strictEqual(s.clips[0].action, 'Ren points up.');
  assert.deepStrictEqual(s.clips[0].lines.map(l => [l.who, l.notes, l.text, l.side]), [['Ren', 'excited', 'Look!', 'left']]);
  assert.strictEqual(framePrompt(s.meta, s.frames[0]), 'Cute chibi cartoon. A meadow. Ren and Yuki stand together.');
  assert.deepStrictEqual(castOf(s.meta, s.frames[2].text), []);
  const bad = parseFlowStory('aspect: 4:3\nframe 1: x\nclip 1: frame 1 to frame 9\ny\nclip 2 frame 1\n');
  assert.ok(bad.errors.some(e => /title/.test(e)));
  assert.ok(bad.errors.some(e => /9:16/.test(e)));
  assert.ok(bad.errors.some(e => /no "frame 9:"/.test(e)));
  assert.ok(bad.errors.some(e => /clip 1: frame 1 to frame 2/.test(e)));
});

test('check spends nothing', () => {
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
  // the frame before, picked in Flow where it already is (not uploaded again)
  assert.match(imgs[1].reference_images[0], /^asset:the-test-fox-frame-01-t\d+$/);
  assert.match(imgs[1].prompt, /Match the previous image/);
  assert.strictEqual(calls(1).length, 0);
  assert.ok(fs.existsSync(path.join(tmp, 'output', 'the-test-fox', 'frames', 'frame-03.png')));
});

test('make again: clips from frame to frame, switching account when one runs low, then the film', () => {
  bank(1, 30); bank(2, 30); fs.writeFileSync(path.join(tmp, 'accounts', 'account-2', 'mute'), '');
  const r = run('make', STORY);
  assert.strictEqual(r.code, 0, r.out);
  const v1 = calls(1).filter(c => c.type === 'video'), v2 = calls(2).filter(c => c.type === 'video');
  assert.strictEqual(v1.length + v2.length, 2);
  assert.match(r.out, /switching to/);
  // a clip on the account that made the frames picks them in Flow; on the other account they are uploaded
  const onFrames = v2.length ? v2[0] : null, onOther = v1[0];
  if (onFrames) { assert.match(onFrames.first_frame, /^asset:the-test-fox-frame-0\d-t\d+$/); }
  assert.match(onOther.first_frame, /frame-0\d\.png$/);
  const clip = [...v1, ...v2][0];
  // voices: none (the default): the words stay out of Flow's prompt, which asks for no voices
  assert.doesNotMatch(clip.prompt, /Look!/);
  assert.match(clip.prompt, /Ren points up\. Ren reacts \(excited\)/);
  assert.match(clip.prompt, /Nobody speaks/);
  assert.strictEqual(clip.aspect_ratio, '9:16'); assert.strictEqual(clip.max_credits, 25);
  const film = path.join(tmp, 'output', 'the-test-fox', 'film.mp4');
  assert.ok(fs.existsSync(film));
  // a real film: both 1-second clips joined, with sound (account 2's clips have none, and get silence)
  const info = probe(film);
  assert.ok(Math.abs(info.duration - 2) < 0.25, `film is ${info.duration} s`);
  assert.ok(info.audio);
  // the speech bubble ("Look!") is on the film, not on the clean copy
  assert.match(r.out, /adding 1 speech bubble/);
  assert.ok(fs.existsSync(path.join(tmp, 'output', 'the-test-fox', 'film-clean.mp4')));
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

test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));

test('the Flow driver: newest image model, file kinds, the price link', () => {
  const { newestNanoBanana, extensionOf, inEnglish } = require('../lib/flow-web');
  assert.strictEqual(newestNanoBanana(['Nano Banana Pro', 'Nano Banana 2 Lite', 'Nano Banana 2.1', 'Veo 3.1 - Fast']), 2);
  assert.strictEqual(newestNanoBanana(['Nano Banana 2', 'Nano Banana 10']), 1);
  assert.strictEqual(newestNanoBanana(['Veo 3.1 - Fast']), -1);
  const f = path.join(tmp, 'kind');
  fs.writeFileSync(f, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0])); assert.strictEqual(extensionOf(f), '.png');
  fs.writeFileSync(f, Buffer.from([0xff, 0xd8, 0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0])); assert.strictEqual(extensionOf(f), '.jpg');
  fs.writeFileSync(f, Buffer.concat([Buffer.from([0, 0, 0, 0x20]), Buffer.from('ftypisom')])); assert.strictEqual(extensionOf(f), '.mp4');
  assert.strictEqual(inEnglish('https://flow.google.com/project/x?hl=es'), 'https://flow.google.com/project/x?hl=en');
  // the price is the link with a number in it, never Flow's "Add AI credits" banner (the bug of 2026-10-31)
  const price = /^\s*\d[\d,]*\s*credits?\s*$/i;
  assert.ok(price.test('0 credits') && price.test('20 credits') && price.test('1,000 credits'));
  assert.ok(!price.test('Add AI credits'));
  assert.match(fs.readFileSync(path.join(__dirname, '..', 'lib', 'flow-web.js'), 'utf8'), /name: \/\^\\s\*\\d\[\\d,\]\*\\s\*credits\?\\s\*\$\/i/);
});

test('bubbles: the lines of a clip share its time; the bubble pictures are drawn', async () => {
  const { bubbleTimes, drawBubbles } = require('../lib/bubbles');
  const t = bubbleTimes([{ duration: 8, lines: [{ text: 'a', side: 'left' }, { text: 'b', side: 'right' }] }, { duration: 8, lines: [] }, { duration: 8, lines: [{ text: 'c' }] }]);
  assert.deepStrictEqual(t.map(b => b.text), ['a', 'b', 'c']);
  assert.ok(t[0].t0 > 0 && t[0].t1 < t[1].t0 && t[1].t1 <= 8 && t[2].t0 >= 16 && t[2].t1 <= 24);
  const [png] = await drawBubbles([{ text: "Don't worry, Yuki. I'm a snow expert.", side: 'left' }], 720, 1280);
  fs.writeFileSync(path.join(tmp, 'bubble.png'), Buffer.from(png, 'base64'));
  if (process.env.KEEP_BUBBLE) fs.copyFileSync(path.join(tmp, 'bubble.png'), process.env.KEEP_BUBBLE);
  assert.ok(png.length > 2000);
});
