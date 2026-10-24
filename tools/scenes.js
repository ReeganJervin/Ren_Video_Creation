// Scenes: chapter lines for YouTube and the extra checks for stories with "scene:" lines.
// Works on a compiled plan, so it runs both in --check (estimated timing) and after rendering.

const MIN_SCENE = 20, MIN_CHAPTER = 10, MAX_QUIET = 90;

// 75.4 -> "1:15", 3725 -> "1:02:05" (YouTube chapter format)
function clock(s) {
  s = Math.floor(s + 1e-6);
  const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

const hasScenes = plan => plan.scenes.length > 0 && !plan.scenes[0].implicit;

// { text } when the chapter rules are met, otherwise { reason }
function chapters(plan) {
  const S = plan.scenes;
  if (!hasScenes(plan) || S.length < 3) return { reason: `YouTube needs at least 3 chapters; this story has ${hasScenes(plan) ? S.length : 0} scene(s)` };
  if (S[0].t0 > 0) return { reason: 'the first scene must start at 0:00' };
  const short = S.filter(c => c.t1 - c.t0 < MIN_CHAPTER);
  if (short.length) return { reason: `every chapter must be at least ${MIN_CHAPTER} s long; too short: ${short.map(c => `"${c.name}" (${(c.t1 - c.t0).toFixed(1)} s)`).join(', ')}` };
  // two scenes starting in the same second would give YouTube the same timestamp twice
  const stamps = S.map(c => clock(c.t0));
  if (new Set(stamps).size !== stamps.length) return { reason: 'two scenes start in the same second' };
  return { text: S.map((c, i) => `${stamps[i]} ${c.name}`).join('\n') + '\n' };
}

// Everything that visibly or audibly happens, as [start, end] windows.
function activity(plan) {
  const W = [];
  const add = (a, b = a) => W.push([a, Math.max(a, b)]);
  plan.voice.forEach(v => add(v.t, v.t + v.len));
  Object.values(plan.actors).forEach(a => {
    a.walks.forEach(w => add(w.t0, w.t1)); a.hops.forEach(h => add(h.t0, h.t1)); a.waves.forEach(w => add(w.a, w.b));
    a.moods.forEach(m => add(m.t)); (a.blinkExtra || []).forEach(b => add(b));
    Object.values(a.keys).forEach(ks => ks.slice(1).forEach(k => add(k[0])));
  });
  plan.titles.forEach(T => add(T.letters[0], T.out1));
  plan.star.forEach(s => add(s.t0, s.t1 || s.t0));
  plan.hearts.forEach(h => add(h.t, h.t + 1.5));
  plan.heartDown.forEach(h => add(h.t0, h.burst));
  plan.sparkles.forEach(s => add(s.t, s.t + 1));
  (plan.places || []).forEach(c => add(c.t0, c.t1));
  ['tau', 'zoom'].forEach(k => plan.keys[k].slice(1).forEach(q => add(q[0])));
  return W.sort((a, b) => a[0] - b[0]);
}

// the longest stretch with nothing happening: { len, t0, t1 }
function quietest(plan) {
  let best = { len: 0, t0: 0, t1: 0 }, reach = 0;
  for (const [a, b] of [...activity(plan), [plan.duration, plan.duration]]) {
    if (a - reach > best.len) best = { len: a - reach, t0: reach, t1: a };
    reach = Math.max(reach, b);
  }
  return best;
}

// Checks added to the report for stories with scenes: [{ ok, warn, note, name, detail }]
function sceneChecks(plan) {
  if (!hasScenes(plan)) return [];
  const R = [];
  const short = plan.scenes.filter(c => c.t1 - c.t0 < MIN_SCENE);
  R.push({ ok: true, warn: short.length > 0, name: 'Scene lengths',
    detail: short.length ? `shorter than ${MIN_SCENE} s: ${short.map(c => `"${c.name}" (${(c.t1 - c.t0).toFixed(1)} s)`).join(', ')}` : `${plan.scenes.length} scenes, each at least ${MIN_SCENE} s` });
  const q = quietest(plan);
  R.push({ ok: q.len <= MAX_QUIET, name: 'Something happens at least every 90 s',
    detail: `longest stretch without a voice line or action: ${q.len.toFixed(1)} s (${clock(q.t0)} to ${clock(q.t1)})` });
  const ch = chapters(plan);
  R.push({ ok: true, note: !ch.text, name: 'Chapters', detail: ch.text ? `${plan.scenes.length} chapters` : `no chapters file: ${ch.reason}` });
  return R;
}

module.exports = { clock, hasScenes, chapters, quietest, sceneChecks };
