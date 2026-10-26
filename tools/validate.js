// Checks a finished video against its plan. Returns [{ ok, name, detail }].
const { spawnSync } = require('child_process');
const path = require('path');
const ffmpeg = require('ffmpeg-static');
const ffprobe = require('ffprobe-static').path;
const { readWav } = require('./wav');

const db = (x, a, b) => { let s = 0; for (let i = a; i < b; i++) s += x[i] * x[i]; return 10 * Math.log10(s / Math.max(1, b - a) + 1e-18); };

function validate(plan, files) {
  const R = [], check = (name, ok, detail) => R.push({ ok: !!ok, name, detail });
  const D = plan.duration;

  // container
  const pr = spawnSync(ffprobe, ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', files.mp4], { encoding: 'utf8', maxBuffer: 1 << 26 });
  const info = JSON.parse(pr.stdout);
  const v = info.streams.find(s => s.codec_type === 'video'), a = info.streams.find(s => s.codec_type === 'audio');
  const frames = Math.round(D * plan.fps);
  check('Length', Math.abs(+v.duration - D) < 0.04 && a && Math.abs(+a.duration - D) < 0.06, `video ${(+v.duration).toFixed(2)} s, audio ${a ? (+a.duration).toFixed(2) : 'missing'} s (planned ${D.toFixed(2)} s)`);
  check('Picture', v.width === (plan.width || 1920) && v.height === (plan.height || 1080) && v.r_frame_rate === '30/1' && +v.nb_read_frames === frames, `${v.width}x${v.height}, ${v.r_frame_rate} fps, ${v.nb_read_frames} frames`);
  check('Sound and picture start together', a && Math.abs(+v.start_time - +a.start_time) < 0.03, `video ${v.start_time} s, audio ${a && a.start_time} s`);

  // voices: measured onsets in the voice-only track
  const vw = readWav(files.voice), vs = vw.samples(), sr = vw.rate, hop = Math.round(sr * 0.01);
  const env = []; for (let i = 0; i + hop <= vs.length; i += hop) env.push(db(vs, i, i + hop));
  // Each clip may start with a little silence of its own; expect speech at clip start + that lead-in.
  const leadIn = file => {
    const w = readWav(file), x = w.samples(), h = Math.round(w.rate * 0.01);
    for (let i = 0; i + h <= x.length; i += h) if (db(x, i, i + h) > -40) return i / w.rate;
    return 0;
  };
  const late = [], overlap = [];
  plan.voice.forEach((vc, i) => {
    const n = plan.voice[i + 1], end = vc.t + vc.len;
    if ((n && end > n.t - 0.05) || end > D - 0.5) overlap.push(`line ${vc.line}`);
    if (vc.missing) return;   // no voice made yet (a placeholder extra): nothing to hear
    const expected = vc.t + leadIn(path.join(files.root, vc.file));
    let onset = null;
    for (let k = Math.max(0, Math.floor((vc.t - 0.3) / 0.01)); k < Math.min(env.length, Math.floor((expected + 0.6) / 0.01)); k++) if (env[k] > -40) { onset = k * 0.01; break; }
    if (onset === null || Math.abs(onset - expected) > 0.1) late.push(`line ${vc.line} (speech expected ${expected.toFixed(2)} s, heard ${onset === null ? 'nothing' : onset.toFixed(2) + ' s'})`);
  });
  const heard = plan.voice.filter(v => !v.missing).length;
  check('Voices start on time', !late.length, late.length ? `off: ${late.join('; ')}` : `${heard} lines, speech heard within 0.1 s of plan${heard < plan.voice.length ? ` (${plan.voice.length - heard} without a voice yet)` : ''}`);
  check('No overlapping or cut-off voices', !overlap.length, overlap.length ? `problem: ${overlap.join(', ')}` : 'every line ends before the next starts and before the ending');

  // text boxes hold their voice lines (bubbles belong to the characters' lines, in order)
  const talk = plan.voice.filter(x => x.who !== 'narrator'), narr = plan.voice.filter(x => x.who === 'narrator');
  const badB = plan.bubbles.filter((b, i) => !(b.t0 <= talk[i].t && talk[i].t + talk[i].len <= b.t1 + 0.01));
  const badC = plan.captions.filter((c, i) => !(c.t0 <= narr[i].t && narr[i].t + narr[i].len <= c.t1 + 0.01));
  check('Speech bubbles and captions stay up for their lines', !badB.length && !badC.length, `${plan.bubbles.length} bubbles, ${plan.captions.length} captions${badB.length + badC.length ? `; too short: ${[...badB, ...badC].map(x => x.text).join(' | ')}` : ''}`);

  // sound effects: energy rises at each discrete cue
  const sw = readWav(files.sfx), ss = sw.samples(), ssr = sw.rate;
  const cues = plan.sfx.filter(c => ['boingUp', 'boingLand', 'hopUp', 'hopLand', 'chime', 'twinkle', 'pop', 'softLand', 'chirp', 'sparkleChime', 'sting'].includes(c.type));
  const miss = cues.filter(c => {
    const i = Math.round(c.t * ssr), w = Math.round(0.12 * ssr);
    const before = db(ss, Math.max(0, i - w), Math.max(1, i - Math.round(0.01 * ssr))), after = db(ss, i, Math.min(ss.length, i + w));
    return after - before < 1 && after < -45;
  });
  check('Sound effects fire on their cues', !miss.length, `${cues.length - miss.length}/${cues.length} cues heard${miss.length ? '; missing: ' + miss.map(c => `${c.type}@${c.t.toFixed(2)}`).join(', ') : ''}`);

  // loudness and fades
  const ln = spawnSync(ffmpeg, ['-hide_banner', '-i', files.mp4, '-af', 'loudnorm=print_format=json', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1 << 26 }).stderr;
  const L = JSON.parse(ln.slice(ln.lastIndexOf('{'), ln.lastIndexOf('}') + 1));
  check('Loudness, no clipping', +L.input_i >= -22 && +L.input_i <= -13 && +L.input_tp < -1, `${L.input_i} LUFS, true peak ${L.input_tp} dBTP`);
  const eb = spawnSync(ffmpeg, ['-hide_banner', '-i', files.mp4, '-af', 'ebur128=metadata=1,ametadata=print:key=lavfi.r128.S', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1 << 28 }).stderr;
  // Limit 2.5 LU (raised from 2.0 with the owner's approval on 2026-10-25: with the new, livelier voices a loud
  // word after a quiet moment in a long story reaches about 2.5, which the owner listened to and found fine).
  // Moments between 2.0 and 2.5 are listed as a NOTE so they stay visible.
  const pts = [...eb.matchAll(/pts_time:([\d.]+)/g)].map(m => +m[1]), S = [...eb.matchAll(/lavfi\.r128\.S=(-?[\d.]+)/g)].map(m => +m[1]);
  const idx = S.map((_, i) => i).filter(i => pts[i] >= 4 && pts[i] <= D - 3);
  let step = 0; const near = [];
  for (let k = 1; k < idx.length; k++) {
    const d = Math.abs(S[idx[k]] - S[idx[k - 1]]);
    step = Math.max(step, d);
    if (d >= 2.0 && d <= 2.5 && !near.some(n => Math.abs(n.t - pts[idx[k]]) < 2)) near.push({ t: pts[idx[k]], d });
  }
  const clock = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  R.push({ ok: !idx.length || step <= 2.5, note: near.length > 0 && step <= 2.5, name: 'No sudden volume changes',
    detail: idx.length ? `largest 0.1 s change in short-term loudness: ${step.toFixed(2)} LU (limit 2.5)${near.length ? `; between 2.0 and 2.5 at ${near.map(n => `${clock(n.t)} (${n.d.toFixed(2)})`).join(', ')}` : ''}` : 'too short to measure' });
  const mw = readWav(files.master), ms = mw.samples(), msr = mw.rate;
  const head = db(ms, 0, Math.round(0.1 * msr)), tail = db(ms, ms.length - Math.round(0.25 * msr), ms.length);
  check('Music fades in and out cleanly', head < -35 && tail < -50, `first 0.1 s ${head.toFixed(1)} dB, last 0.25 s ${tail.toFixed(1)} dB`);
  return R;
}
module.exports = { validate };
