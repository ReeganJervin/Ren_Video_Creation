// Lip-sync: which mouth shape a character makes, frame by frame, while saying a line.
// The voice model doesn't say when each sound is spoken, so it is estimated: the line's sounds (phonemes from the
// voice tool, or guessed from the spelling) are spread over the parts of the clip that are actually voiced (from its
// loudness), each sound getting time by how long it usually lasts. How wide the mouth opens follows the loudness.
// The result is two strings with one character per frame (30 a second):
//   shape: X rest (closed), M lips pressed (m b p), F lip on teeth (f v), A wide open (a), E wide (e i),
//          O round (o), U small round (u w r), C slightly open (most other consonants)
//   open:  0..9, how far the mouth opens
(function (root) {
  const FPS = 30;
  // phoneme (IPA, as the voice tool writes it) -> [shape, how long it usually lasts]
  const IPA = {};
  const put = (chars, shape, w) => { for (const ch of chars) IPA[ch] = [shape, w]; };
  put('aɑæʌɐ', 'A', 1); put('eɛiɪɜ', 'E', 1); put('oɔɒ', 'O', 1); put('uʊ', 'U', 1);
  put('ɚɝ', 'U', 0.9); put('əᵻ', 'C', 0.6);
  put('mbp', 'M', 0.6); put('fv', 'F', 0.7); put('wɹr', 'U', 0.6);
  put('tdkgɡʔɾ', 'C', 0.45); put('nŋlszʃʒθðhjxçʤʧ', 'C', 0.6);
  // the spelling, when there are no phonemes (a rough guess, good enough for timing)
  const SPELL = { a: 'A', e: 'E', i: 'E', y: 'E', o: 'O', u: 'U', w: 'U', r: 'U', m: 'M', b: 'M', p: 'M', f: 'F', v: 'F' };

  // the line's sounds in order: [{ shape, w }]
  function sounds(text, phonemes) {
    const out = [];
    if (phonemes) {
      for (const ch of phonemes) {
        if (ch === 'ː') { if (out.length) out[out.length - 1].w += 0.5; continue; }
        const p = IPA[ch]; if (p) out.push({ shape: p[0], w: p[1] });
      }
    } else {
      const s = text.toLowerCase().replace(/[^a-z]/g, '');
      for (let i = 0; i < s.length; i++) {
        const ch = s[i]; if (ch === s[i - 1] && !/[aeiou]/.test(ch)) continue;   // (double consonants are one sound)
        const shape = SPELL[ch] || 'C';
        out.push({ shape, w: /[aeiouy]/.test(ch) ? 0.8 : 0.5 });
      }
    }
    return out;
  }

  // samples (mono, -1..1) at rate -> { fps, shape, open }
  function lips(text, phonemes, samples, rate) {
    // loudness, every 10 ms
    const hop = Math.round(rate / 100), n = Math.floor(samples.length / hop), rms = new Float32Array(n);
    let peak = 1e-6;
    for (let i = 0; i < n; i++) {
      let s = 0; for (let j = i * hop; j < (i + 1) * hop; j++) s += samples[j] * samples[j];
      rms[i] = Math.sqrt(s / hop); peak = Math.max(peak, rms[i]);
    }
    // voiced: louder than a tenth of the peak; gaps under 60 ms (the stop in "top", a quick breath) still count as
    // speech, and specks under 40 ms don't
    const on = Array.from(rms, r => r > peak * 0.1);
    const runs = v => { const r = []; let s = 0; for (let i = 1; i <= n; i++) if (i === n || on[i] !== on[s]) { r.push([s, i, on[s]]); s = i; } return r; };
    for (const [a, b, v] of runs()) if (!v && a > 0 && b < n && b - a < 6) for (let i = a; i < b; i++) on[i] = true;
    for (const [a, b, v] of runs()) if (v && b - a < 4) for (let i = a; i < b; i++) on[i] = false;
    // the sounds spread over the voiced time, each by its weight: the voiced 10 ms steps, counted, map to the sounds
    const S = sounds(text, phonemes), total = S.reduce((q, p) => q + p.w, 0) || 1, voiced = on.filter(Boolean).length || 1;
    const at = new Array(n).fill(null);   // the sound at each 10 ms step
    let k = 0, done = 0, acc = S.length ? S[0].w : 0;
    for (let i = 0; i < n; i++) {
      if (!on[i]) continue;
      const pos = (done++ + 0.5) / voiced * total;
      while (k < S.length - 1 && pos > acc) acc += S[++k].w;
      at[i] = k;
    }
    // per video frame: the sound covering most of it (lips pressed or on the teeth win, even for a moment: you see
    // them close); how open is the loudness, a little eased
    const frames = Math.ceil(samples.length / rate * FPS);
    let shape = '', open = '';
    for (let f = 0; f < frames; f++) {
      const a = Math.floor(f * 100 / FPS), b = Math.min(n, Math.floor((f + 1) * 100 / FPS));
      const count = {}; let loud = 0;
      for (let i = a; i < b; i++) { loud = Math.max(loud, rms[i] / peak); if (at[i] !== null) { const sh = S[at[i]].shape; count[sh] = (count[sh] || 0) + 1; } }
      let best = 'X', most = 0;
      for (const sh in count) if (count[sh] > most) { best = sh; most = count[sh]; }
      if (count.M) best = 'M'; else if (count.F && best !== 'M') best = 'F';
      shape += best;
      open += best === 'X' || best === 'M' ? 0 : Math.min(9, Math.round(Math.pow(loud, 0.6) * 10));
    }
    // a shape held for a single frame flickers: it takes its neighbour's (except a closing m, b or p)
    const sh = shape.split('');
    for (let f = 1; f < sh.length - 1; f++) if (sh[f] !== sh[f - 1] && sh[f] !== sh[f + 1] && sh[f] !== 'M') sh[f] = sh[f - 1];
    return { fps: FPS, shape: sh.join(''), open };
  }

  const api = { lips, sounds, FPS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.StudioLipSync = api;
})(typeof window !== 'undefined' ? window : globalThis);
