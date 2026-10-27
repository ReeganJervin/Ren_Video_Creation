// Episode Shorts (F7 Part B): a Short made from part of a longer story ("type: episode short", "from:", "scenes:" or
// "lines:"). The story is made as usual (its own voices, from the cache, and its own timing), in vertical; the Short
// shows a window of it, drawn again for the vertical picture (never cropped from the wide video), with the soundtrack
// cut to the same window and faded in and out, then the end card.
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const { parseStory } = require('../engine/story.js');
const ROOT = path.resolve(__dirname, '..');

// "from: episode-01-the-beginning-of-a-friendship" -> the story file: next to the Short, or anywhere in stories/
// (stories/episodes/ first) or episodes/
function findSource(from, shortPath) {
  const name = from.replace(/\.txt$/i, '').trim();
  const deep = (dir, out = []) => { if (fs.existsSync(dir)) for (const e of fs.readdirSync(dir, { withFileTypes: true })) { if (e.name.startsWith('_')) continue; const p = path.join(dir, e.name); if (e.isDirectory()) deep(p, out); else if (e.name === name + '.txt') out.push(p); } return out; };
  const tries = [path.resolve(path.dirname(shortPath), name + '.txt'), path.join(ROOT, 'stories', 'episodes', name + '.txt'), path.join(ROOT, 'stories', name + '.txt'), path.join(ROOT, 'episodes', name + '.txt'), ...deep(path.join(ROOT, 'stories')), ...deep(path.join(ROOT, 'episodes'))];
  return tries.find(f => fs.existsSync(f) && path.resolve(f) !== path.resolve(shortPath)) || null;
}

// The story a Short is made from, ready to make: its lines, in vertical (unless the Short says "format: wide"),
// without the series intro or end screen, with the Short's captions and framing. Returns { parsed, short }.
function episodeSource(shortParsed, shortPath) {
  const sm = shortParsed.meta, file = findSource(sm.from, shortPath);
  if (!file) throw new Error(`I can't find the story "${sm.from}" (looked next to the Short, and in stories\\ and its folders).`);
  const parsed = parseStory(fs.readFileSync(file, 'utf8'));
  if (parsed.errors.length) throw new Error(`The story ${path.basename(file)} has lines to fix first:\n\n${parsed.errors.join('\n\n')}`);
  Object.assign(parsed.meta, { format: sm.format === 'wide' ? 'wide' : 'vertical', intro: { at: 'none' }, ending: 'none', captions: sm.captions || 'narrator', framing: sm.framing });
  delete parsed.meta.endingText;
  parsed.beats = parsed.beats.filter(b => !b.endScreen);
  return { parsed, short: { ...sm, title: sm.title || parsed.meta.title, source: path.relative(ROOT, file) } };
}

// Marks the window on the story's plan (what the page draws) and returns the Short as a video of its own (its own
// time from 0): the lists the checks, the subtitles, the description and the cover frame read.
function applyWindow(plan, sm) {
  const w = sm.window;
  let t0, t1;
  if (w.scenes) {
    const [a, b] = w.scenes, A = plan.scenes[a - 1], B = plan.scenes[b - 1];
    if (!A || !B || b < a) throw new Error(`Line ${w.line}: "scenes: ${a}${b !== a ? '-' + b : ''}": the story has ${plan.scenes.length} scene${plan.scenes.length > 1 ? 's' : ''}.`);
    t0 = A.t0; t1 = B.t1;
  } else {
    const [a, b] = w.lines, start = plan.lineTimes.find(([l]) => l >= a), end = plan.lineTimes.find(([l]) => l > b);
    if (!start || b < a) throw new Error(`Line ${w.line}: "lines: ${a}-${b}": the story has no story lines there.`);
    t0 = start[1]; t1 = end ? end[1] : plan.duration;
  }
  // a voice line that starts inside the window is heard to its end
  for (const v of plan.voice) if (v.t >= t0 && v.t < t1) t1 = Math.max(t1, v.t + v.len + 0.6);
  t1 = Math.min(t1, plan.duration);
  const L = t1 - t0, sh = x => (typeof x === 'number' ? x - t0 : x), inWin = (a, b) => (b === undefined || b === null ? a >= t0 && a < t1 : b > t0 && a < t1);
  // what the page draws: the window, and the Short's own pictures in the Short's time
  plan.window = { t0, t1 };
  plan.wordCaps = (plan.wordCaps || []).filter(q => inWin(q.t0, q.t1)).map(q => ({ ...q, t0: sh(q.t0), t1: sh(q.t1) }));
  if (!plan.wordCaps.length) delete plan.wordCaps;
  if (sm.hook) plan.hook = { text: sm.hook, t0: 0.15, t1: 3.2 };
  plan.card = { t0: L + 0.1, t1: L + 0.1 + (sm.cardText ? 2 : 1), text: sm.cardText || null };
  const D = Math.ceil(plan.card.t1 * 30) / 30;
  plan.card.t1 = D;
  const move = (x, keys) => { const y = { ...x }; for (const k of keys) y[k] = sh(y[k]); return y; };
  return {
    ...plan, duration: D, window: undefined,
    // the Short's own cover settings ("thumbnail:", "thumbnail text:", "thumbnail shot:"), not the story's
    meta: { ...plan.meta, title: sm.title, type: 'episode short', thumbnail: sm.thumbnail, thumbnailText: sm.thumbnailText, thumbnailShot: sm.thumbnailShot },
    voice: plan.voice.filter(v => v.t >= t0 && v.t < t1).map(v => move(v, ['t'])),
    bubbles: plan.bubbles.filter(b => inWin(b.t0, b.t1)).map(b => move(b, ['t0', 't1'])),
    captions: plan.captions.filter(c => inWin(c.t0, c.t1)).map(c => move(c, ['t0', 't1'])),
    sfx: plan.sfx.filter(c => c.t >= t0 && c.t < t1).map(c => move(c, ['t', 't1'])),
    titles: plan.titles.filter(x => inWin(x.letters[0], x.out1)).map(x => ({ ...move(x, ['out0', 'out1']), letters: x.letters.map(sh) })),
    places: (plan.places || []).filter(p => inWin(p.t0, p.t1)).map(p => move(p, ['t0', 't1'])),
    props: (plan.props || []).map(p => move(p, ['t0', 't1'])),
    lineTimes: plan.lineTimes.filter(([, s]) => s >= t0 && s < t1).map(([l, s]) => [l, sh(s)]),
    actors: Object.fromEntries(Object.entries(plan.actors).map(([id, a]) => [id, { ...a, walks: a.walks.map(x => move(x, ['t0', 't1'])) }])),
    scenes: [{ name: sm.title, line: 0, t0: 0, t1: D, implicit: true }],   // (one scene: no chapters or scene checks)
    youtube: undefined,
  };
}

// a soundtrack stem cut to the window: faded in and out, then quiet under the end card
function sliceWav(file, plan, D) {
  const { t0, t1 } = plan.window, L = t1 - t0, tmp = file + '.part.wav';
  const af = `atrim=start=${t0.toFixed(3)}:end=${t1.toFixed(3)},asetpts=PTS-STARTPTS,afade=t=in:d=0.3,afade=t=out:st=${Math.max(0, L - 0.5).toFixed(3)}:d=0.5,apad=whole_dur=${D.toFixed(3)}`;
  const r = spawnSync(ffmpeg, ['-loglevel', 'error', '-y', '-i', file, '-af', af, '-c:a', 'pcm_s16le', tmp]);
  if (r.status !== 0) throw new Error('Cutting the soundtrack for the Short failed.');
  fs.renameSync(tmp, file);
}

// The length of a Short: 15 to 60 seconds (a warning outside)
const shortLength = D => ({ ok: true, warn: D < 15 || D > 60, note: D >= 15 && D <= 60, name: 'Short length', detail: `${D.toFixed(1)} s (a Short should be 15 to 60 s)` });

module.exports = { findSource, episodeSource, applyWindow, sliceWav, shortLength };
