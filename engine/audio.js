// Web Audio soundtrack for a story plan. buildAudio() schedules music, effects and voices on any
// AudioContext (live preview) or OfflineAudioContext (export).
(() => {
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  let seed = 1;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  async function loadVoices(ctx, P) {
    const out = {}, missing = [];
    for (const v of P.voice) {
      try {
        const r = await fetch(v.file);
        if (!r.ok) throw new Error(r.status);
        out[v.id] = await ctx.decodeAudioData(await r.arrayBuffer());
      } catch (e) { missing.push(v.id); }
    }
    return { buffers: out, missing };
  }

  function noiseBuffer(ctx, secs = 2) {
    seed = 12345;
    const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * secs), ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1;
    return b;
  }
  function impulse(ctx, secs = 2.2) {
    seed = 777;
    const len = Math.floor(ctx.sampleRate * secs), b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (rnd() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    return b;
  }

  function buildAudio(ctx, t0, P, voices, stems = { music: 1, sfx: 1, voice: 1 }) {
    const T = P, at = s => t0 + s;
    // master: gentle limiter so stacked effects never clip
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -4; limiter.knee.value = 2; limiter.ratio.value = 20; limiter.attack.value = 0.002; limiter.release.value = 0.15;
    limiter.connect(ctx.destination);
    const master = ctx.createGain(); master.gain.value = 0.72; master.connect(limiter);
    const reverb = ctx.createConvolver(); reverb.buffer = impulse(ctx);
    const revOut = ctx.createGain(); revOut.gain.value = 0.5; reverb.connect(revOut); revOut.connect(master);

    // ---- buses ----
    const music = ctx.createGain(); music.gain.value = 0.42 * stems.music;
    const duck = ctx.createGain(), section = ctx.createGain(), mfade = ctx.createGain();
    music.connect(duck); duck.connect(section); section.connect(mfade); mfade.connect(master);
    const mSend = ctx.createGain(); mSend.gain.value = 0.35; mfade.connect(mSend); mSend.connect(reverb);
    mfade.gain.setValueAtTime(0, at(0)); mfade.gain.linearRampToValueAtTime(1, at(T.musicFadeIn));
    mfade.gain.setValueAtTime(1, at(T.musicFadeOut[0])); mfade.gain.linearRampToValueAtTime(0, at(T.musicFadeOut[1]));
    // music softer during the act of kindness (scene 4)
    section.gain.setValueAtTime(1, at(0));

    const sfxComp = ctx.createDynamicsCompressor();
    sfxComp.threshold.value = -20; sfxComp.knee.value = 8; sfxComp.ratio.value = 5; sfxComp.attack.value = 0.003; sfxComp.release.value = 0.2;
    const sfx = ctx.createGain(); sfx.gain.value = 0.8 * stems.sfx;
    sfx.connect(sfxComp); sfxComp.connect(master);
    const sSend = ctx.createGain(); sSend.gain.value = 0.3; sfxComp.connect(sSend); sSend.connect(reverb);

    const voice = ctx.createGain(); voice.gain.value = 1.0 * stems.voice; voice.connect(master);
    const vSend = ctx.createGain(); vSend.gain.value = 0.12; voice.connect(vSend); vSend.connect(reverb);

    // ---- voices + ducking (overlapping/near windows are merged so ramps stay ordered) ----
    const wins = [];
    for (const v of T.voice) {
      const buf = voices[v.id]; if (!buf) continue;
      const src = ctx.createBufferSource(); src.buffer = buf; src.connect(voice); src.start(at(v.t));
      const w = [v.t, v.t + buf.duration];
      if (wins.length && w[0] - wins[wins.length - 1][1] < 1.0) wins[wins.length - 1][1] = w[1]; else wins.push(w);
    }
    duck.gain.setValueAtTime(1, at(0));
    for (const [s, e] of wins) {
      duck.gain.setValueAtTime(1, at(Math.max(0, s - 0.3))); duck.gain.linearRampToValueAtTime(0.55, at(s));
      duck.gain.setValueAtTime(0.55, at(e)); duck.gain.linearRampToValueAtTime(1, at(e + 0.6));
    }

    // ---- instruments ----
    function env(g, t, peak, attack, decay) {
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    }
    function tone(dest, t, freq, peak, decay, type = 'sine', attack = 0.004) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t); o.connect(g); g.connect(dest);
      env(g, t, peak, attack, decay); o.start(t); o.stop(t + attack + decay + 0.05);
      return o;
    }
    function musicBox(t, m, v = 1) {
      tone(music, t, mtof(m), 0.28 * v, 1.6);
      tone(music, t, mtof(m) * 2, 0.07 * v, 0.5);
      tone(music, t, mtof(m) * 5.4, 0.025 * v, 0.12);
    }
    function pad(t, notes, dur) {
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(music);
      const g = ctx.createGain(); g.connect(lp);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.045, t + 0.6);
      g.gain.setValueAtTime(0.045, t + dur - 0.4); g.gain.linearRampToValueAtTime(0, t + dur + 0.3);
      for (const m of notes) for (const det of [-4, 4]) {
        const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = mtof(m); o.detune.value = det;
        o.connect(g); o.start(t); o.stop(t + dur + 0.4);
      }
    }

    if (stems.music) {
      // 2.5 s bars (96 bpm). A 16-bar hand-written phrase repeats (an octave-lighter variation on
      // repeats) and the last two bars always resolve home, so any story length ends cleanly.
      const CH = { C: [60, 64, 67], Am: [57, 60, 64], F: [53, 57, 60], G: [55, 59, 62], Dm: [50, 53, 57], Em: [52, 55, 59] };
      const bars = ['C', 'Am', 'F', 'G', 'C', 'G', 'Am', 'F', 'C', 'G', 'F', 'C', 'Dm', 'G', 'C', 'Em'];
      const mel = [
        [76, 0, 79, 76], [74, 72, 0, 69], [72, 0, 69, 72], [74, 0, 71, 0],
        [76, 79, 84, 79], [77, 76, 74, 0], [72, 0, 76, 0], [77, 76, 72, 0],
        [79, 0, 76, 72], [74, 0, 0, 79], [77, 0, 0, 72], [76, 0, 0, 0],
        [74, 0, 77, 0], [79, 0, 74, 0], [76, 79, 84, 0], [83, 79, 76, 0],
      ];
      const ending = [['F', [84, 0, 81, 77]], ['C', [76, 0, 72, 0]]];
      const bar = 2.5, beat = bar / 4, nBars = Math.max(2, Math.ceil((T.duration - 0.5) / bar));
      const magical = T.keys.tau.some(k => k[1] >= 1.5) || T.star.length > 0;
      for (let b = 0; b < nBars; b++) {
        const end = b >= nBars - 2, idx = b % 16, pass = Math.floor(b / 16);
        const name = end ? ending[b - (nBars - 2)][0] : bars[idx], notes = end ? ending[b - (nBars - 2)][1] : mel[idx];
        const t = at(b * bar), ch = CH[name];
        pad(t, ch, bar);
        musicBox(t, ch[0] - 12, 0.7); musicBox(t + 2 * beat, ch[2] - 12, 0.45);
        notes.forEach((m, k) => { if (m && !(pass % 2 && k % 2)) musicBox(t + k * beat, m + (pass % 2 ? 12 : 0), pass % 2 ? 0.55 : 0.75); });
        if (magical && !end && (idx >= 6 && idx <= 9 || idx >= 14)) for (let k = 0; k < 8; k++) musicBox(t + k * beat / 2 + beat / 4, ch[k % 3] + 24, 0.16);
      }
      const last = at((nBars - 1) * bar);
      musicBox(last, 72, 0.5); musicBox(last, 76, 0.4); musicBox(last, 79, 0.35);
    }

    // ---- sound effects ----
    const noise = noiseBuffer(ctx);
    const noiseSrc = (t, dur) => { const n = ctx.createBufferSource(); n.buffer = noise; n.loop = true; n.start(t, (t * 0.37) % 1.5); n.stop(t + dur + 0.1); return n; };
    const chime = (t, m, g = 0.2, d = 0.9) => { tone(sfx, t, mtof(m), g, d); tone(sfx, t, mtof(m) * 2.76, g * 0.35, d * 0.5); };
    const fx = {
      breeze(c) {
        const n = noiseSrc(at(c.t), c.t1 - c.t), bp = ctx.createBiquadFilter(), g = ctx.createGain();
        bp.type = 'bandpass'; bp.frequency.value = 520; bp.Q.value = 0.5; n.connect(bp); bp.connect(g); g.connect(sfx);
        g.gain.setValueAtTime(0, at(c.t)); g.gain.linearRampToValueAtTime(0.05, at(c.t + 1.5));
        for (let s = c.t + 2; s < c.t1 - 3; s += 1.5) g.gain.linearRampToValueAtTime(0.03 + 0.03 * Math.abs(Math.sin(s * 0.7)), at(s));
        g.gain.linearRampToValueAtTime(0, at(c.t1));
      },
      windSwell(c) {
        const n = noiseSrc(at(c.t), c.t1 - c.t), bp = ctx.createBiquadFilter(), g = ctx.createGain();
        bp.type = 'bandpass'; bp.Q.value = 0.8; bp.frequency.setValueAtTime(400, at(c.t)); bp.frequency.linearRampToValueAtTime(900, at(c.t1));
        n.connect(bp); bp.connect(g); g.connect(sfx);
        g.gain.setValueAtTime(0, at(c.t)); g.gain.linearRampToValueAtTime(0.09, at((c.t + c.t1) / 2)); g.gain.linearRampToValueAtTime(0, at(c.t1));
      },
      chirp(c) {
        for (let k = 0; k < 3; k++) {
          const t = at(c.t + k * 0.11), o = ctx.createOscillator(), g = ctx.createGain();
          o.frequency.setValueAtTime(3100, t); o.frequency.linearRampToValueAtTime(4300, t + 0.035); o.frequency.linearRampToValueAtTime(3300, t + 0.07);
          o.connect(g); g.connect(sfx); env(g, t, 0.035, 0.01, 0.07); o.start(t); o.stop(t + 0.12);
        }
      },
      boingUp(c) {
        const t = at(c.t), o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'triangle'; o.frequency.setValueAtTime(240, t); o.frequency.exponentialRampToValueAtTime(560, t + 0.16);
        o.connect(g); g.connect(sfx); env(g, t, 0.16, 0.01, 0.25); o.start(t); o.stop(t + 0.3);
      },
      boingLand(c) {
        const t = at(c.t), o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
        o.type = 'triangle'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(420, t + 0.12);
        lfo.frequency.value = 26; lg.gain.setValueAtTime(40, t); lg.gain.exponentialRampToValueAtTime(1, t + 0.4);
        lfo.connect(lg); lg.connect(o.frequency);
        o.connect(g); g.connect(sfx); env(g, t, 0.26, 0.008, 0.42); o.start(t); o.stop(t + 0.5); lfo.start(t); lfo.stop(t + 0.5);
      },
      // lighter, higher boings for hopping characters (Yuki)
      hopUp(c) {
        const t = at(c.t), o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(520, t); o.frequency.exponentialRampToValueAtTime(1100, t + 0.11);
        o.connect(g); g.connect(sfx); env(g, t, 0.15 * (c.gain || 1), 0.006, 0.16); o.start(t); o.stop(t + 0.2);
      },
      hopLand(c) {
        const t = at(c.t), o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(340, t); o.frequency.exponentialRampToValueAtTime(760, t + 0.09);
        lfo.frequency.value = 32; lg.gain.setValueAtTime(30, t); lg.gain.exponentialRampToValueAtTime(1, t + 0.25);
        lfo.connect(lg); lg.connect(o.frequency);
        o.connect(g); g.connect(sfx); env(g, t, 0.17 * (c.gain || 1), 0.006, 0.26); o.start(t); o.stop(t + 0.32); lfo.start(t); lfo.stop(t + 0.32);
      },
      chime(c) { chime(at(c.t), c.midi, c.gain || 0.2); },
      twinkle(c) { const g = c.gain || 0.2; chime(at(c.t), c.midi, g, 0.7); chime(at(c.t + 0.07), c.midi + 7, g * 0.6, 0.6); },
      sparkleChime(c) { [96, 100, 103, 108].forEach((m, i) => chime(at(c.t + i * 0.06), m, 0.13, 0.7)); },
      pop(c) {
        const t = at(c.t), o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.setValueAtTime(420, t); o.frequency.exponentialRampToValueAtTime(1500, t + 0.07);
        o.connect(g); g.connect(sfx); env(g, t, 0.22 * (c.gain || 0.6) / 0.6, 0.004, 0.09); o.start(t); o.stop(t + 0.12);
      },
      fallChime(c) {
        const notes = [103, 100, 98, 96, 93, 91, 88, 86, 84];
        notes.forEach((m, i) => chime(at(c.t + i * c.dur / notes.length), m, 0.1, 0.8));
      },
      softLand(c) {
        const t = at(c.t);
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(60, t + 0.2);
        o.connect(g); g.connect(sfx); env(g, t, 0.22, 0.005, 0.25); o.start(t); o.stop(t + 0.3);
        const n = noiseSrc(t, 0.2), lp = ctx.createBiquadFilter(), ng = ctx.createGain();
        lp.type = 'lowpass'; lp.frequency.value = 700; n.connect(lp); lp.connect(ng); ng.connect(sfx); env(ng, t, 0.12, 0.005, 0.15);
        chime(t + 0.02, 79, 0.08, 1.0);
      },
      sparkles(c) { seed = 100 + c.seed; for (let i = 0; i < c.n; i++) chime(at(c.t + rnd() * 0.5), 96 + Math.floor(rnd() * 12), 0.06, 0.4); },
      sparkleTrail(c) { seed = 500; for (let s = c.t; s < c.t1; s += 0.13 + rnd() * 0.08) chime(at(s), 94 + Math.floor(rnd() * 14), 0.035, 0.35); },
      riseChime(c) {
        const notes = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93, 96, 98, 100];
        notes.forEach((m, i) => chime(at(c.t + i * c.dur / notes.length), m, 0.09, 1.0));
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.setValueAtTime(mtof(72), at(c.t)); o.frequency.exponentialRampToValueAtTime(mtof(96), at(c.t + c.dur));
        o.connect(g); g.connect(sfx);
        g.gain.setValueAtTime(0, at(c.t)); g.gain.linearRampToValueAtTime(0.02, at(c.t + 1)); g.gain.linearRampToValueAtTime(0, at(c.t + c.dur));
        o.start(at(c.t)); o.stop(at(c.t + c.dur + 0.1));
      },
      rustle(c) {
        const n = noiseSrc(at(c.t), c.dur), hp = ctx.createBiquadFilter(), g = ctx.createGain();
        hp.type = 'highpass'; hp.frequency.value = 2200; n.connect(hp); hp.connect(g); g.connect(sfx);
        g.gain.setValueAtTime(0, at(c.t));
        seed = Math.floor(c.t * 100);
        for (let s = 0; s < c.dur; s += 0.18) {
          const peak = 0.05 * (c.gain || 1) * (0.5 + rnd() * 0.5);
          g.gain.linearRampToValueAtTime(peak, at(c.t + s + 0.05)); g.gain.linearRampToValueAtTime(0.004, at(c.t + s + 0.17));
        }
        g.gain.linearRampToValueAtTime(0, at(c.t + c.dur));
      },
    };
    if (stems.sfx) for (const c of T.sfx) fx[c.type](c);
  }

  function encodeWav(buf) {
    const ch = buf.numberOfChannels, len = buf.length, sr = buf.sampleRate;
    const ab = new ArrayBuffer(44 + len * ch * 2), dv = new DataView(ab);
    const str = (o, s) => [...s].forEach((c, i) => dv.setUint8(o + i, c.charCodeAt(0)));
    str(0, 'RIFF'); dv.setUint32(4, 36 + len * ch * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
    dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, ch, true); dv.setUint32(24, sr, true);
    dv.setUint32(28, sr * ch * 2, true); dv.setUint16(32, ch * 2, true); dv.setUint16(34, 16, true); str(36, 'data'); dv.setUint32(40, len * ch * 2, true);
    const data = [...Array(ch)].map((_, i) => buf.getChannelData(i));
    let o = 44;
    for (let i = 0; i < len; i++) for (let c = 0; c < ch; c++) { const s = Math.max(-1, Math.min(1, data[c][i])); dv.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2; }
    return new Uint8Array(ab);
  }

  // Offline render of the full soundtrack (or one stem) -> base64 WAV.
  async function renderAudio(P, stem = 'mix') {
    const sr = 48000, ctx = new OfflineAudioContext(2, Math.round(sr * P.duration), sr);
    const { buffers, missing } = await loadVoices(ctx, P);
    if (missing.length) console.warn('Missing voice clips (rendered without them): ' + missing.join(', '));
    const stems = stem === 'mix' ? { music: 1, sfx: 1, voice: 1 } : { music: +(stem === 'music'), sfx: +(stem === 'sfx'), voice: +(stem === 'voice') };
    buildAudio(ctx, 0, P, buffers, stems);
    const rendered = await ctx.startRendering();
    // Safety net: the compressor's automatic make-up gain can push peaks up, so cap them at -2 dBFS.
    let peak = 0;
    for (let c = 0; c < rendered.numberOfChannels; c++) for (const v of rendered.getChannelData(c)) peak = Math.max(peak, Math.abs(v));
    const limit = Math.pow(10, -2 / 20);
    if (peak > limit) for (let c = 0; c < rendered.numberOfChannels; c++) { const d = rendered.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] *= limit / peak; }
    const bytes = encodeWav(rendered);
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return { wav: btoa(s), missing };
  }

  window.StudioAudio = { loadVoices, buildAudio, renderAudio };
})();
