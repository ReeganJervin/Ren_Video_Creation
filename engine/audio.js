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
    // the ending fades on a curve that is nearly silent for its last moments
    mfade.gain.setValueCurveAtTime(Float32Array.from({ length: 64 }, (_, i) => (1 - i / 63) ** 2), at(T.musicFadeOut[0]), T.musicFadeOut[1] - T.musicFadeOut[0]);
    // music softer during the act of kindness (scene 4)
    section.gain.setValueAtTime(1, at(0));

    const sfxComp = ctx.createDynamicsCompressor();
    sfxComp.threshold.value = -20; sfxComp.knee.value = 8; sfxComp.ratio.value = 5; sfxComp.attack.value = 0.003; sfxComp.release.value = 0.2;
    const sfx = ctx.createGain(); sfx.gain.value = 0.8 * stems.sfx;
    sfx.connect(sfxComp); sfxComp.connect(master);
    const sSend = ctx.createGain(); sSend.gain.value = 0.3; sfxComp.connect(sSend); sSend.connect(reverb);

    const voice = ctx.createGain(); voice.gain.value = 1.0 * stems.voice; voice.connect(master);
    const vSend = ctx.createGain(); vSend.gain.value = 0.12; voice.connect(vSend); vSend.connect(reverb);

    // ---- YouTube kit: the series intro ----
    // The theme jingle is made like the music (music box and soft pads), the same in every video, a little softer than
    // the story's music between lines. While it plays, the story's music fades out and the place's sounds go down.
    if (T.youtube && T.youtube.intro) {
      const I = T.youtube.intro, a0 = at(Math.max(0, I.t0 - 0.4)), sfxLevel = sfx.gain.value;
      section.gain.setValueAtTime(1, a0); section.gain.linearRampToValueAtTime(0, at(I.t0 + 0.05));
      section.gain.setValueAtTime(0, at(I.t1 - 0.3)); section.gain.linearRampToValueAtTime(1, at(I.t1 + 0.8));
      sfx.gain.setValueAtTime(sfxLevel, a0); sfx.gain.linearRampToValueAtTime(sfxLevel * 0.3, at(I.t0 + 0.05));
      sfx.gain.setValueAtTime(sfxLevel * 0.3, at(I.t1 - 0.3)); sfx.gain.linearRampToValueAtTime(sfxLevel, at(I.t1 + 0.8));
      if (stems.music) {
        const jingle = ctx.createGain(); jingle.gain.value = 0.42 * 1.3; jingle.connect(master);
        const jSend = ctx.createGain(); jSend.gain.value = 0.35; jingle.connect(jSend); jSend.connect(reverb);
        const j = x => at(I.t0 + x);
        // a rising "Ren" phrase as his letters land, an answering "Yuki" phrase, then a bright hello as they peek in
        [[0.66, 72], [0.79, 76], [0.92, 79], [1.18, 84], [1.31, 83], [1.44, 81], [1.57, 79], [1.70, 81],
          [2.0, 84], [2.3, 86], [2.6, 88], [2.9, 84], [3.2, 86], [3.5, 83], [3.8, 84]].forEach(([x, m]) => musicBox(j(x), m, 0.8, jingle));
        [[2.0, 60], [2.6, 65], [3.2, 67], [3.8, 60]].forEach(([x, m]) => musicBox(j(x), m - 12, 0.6, jingle));
        musicBox(j(3.8), 76, 0.45, jingle); musicBox(j(3.8), 79, 0.4, jingle);
        pad(j(0.5), [60, 64, 67], 1.6, jingle, 0.035); pad(j(2.0), [65, 69, 72], 1.2, jingle, 0.035); pad(j(3.2), [60, 64, 67, 72], 1.6, jingle, 0.035);
      }
    }

    // ---- voices + ducking (overlapping/near windows are merged so ramps stay ordered) ----
    const wins = [];
    for (const v of T.voice) {
      const buf = voices[v.id]; if (!buf) continue;
      const src = ctx.createBufferSource(); src.buffer = buf; src.start(at(v.t));
      // a line that came in much louder than what played before it: its first second is softer (see make-video.js)
      if (v.calm) {
        const g = ctx.createGain(), k = Math.pow(10, -v.calm / 20);
        g.gain.setValueAtTime(k, at(v.t)); g.gain.setValueAtTime(k, at(v.t + 0.8)); g.gain.linearRampToValueAtTime(1, at(v.t + 1.6));
        src.connect(g); g.connect(voice);
      } else src.connect(voice);
      const w = [v.t, v.t + buf.duration];
      // (closer than the music needs to come back up and dip again, they count as one)
      if (wins.length && w[0] - wins[wins.length - 1][1] < 1.6) wins[wins.length - 1][1] = w[1]; else wins.push(w);
    }
    // Under speech the music sits at UNDER; in the pauses between lines it fills in at FILL, so a voice
    // starting after a pause is not a sudden jump. It comes back up slowly after a line ends.
    const FILL = 1.5, UNDER = 0.55;
    duck.gain.setValueAtTime(FILL, at(0));
    for (const [s, e] of wins) {
      duck.gain.setValueAtTime(FILL, at(Math.max(0, s - 0.3))); duck.gain.linearRampToValueAtTime(UNDER, at(s));
      duck.gain.setValueAtTime(UNDER, at(e)); duck.gain.linearRampToValueAtTime(FILL, at(e + 1.2));
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
    function musicBox(t, m, v = 1, dest = music) {
      tone(dest, t, mtof(m), 0.28 * v, 1.6);
      tone(dest, t, mtof(m) * 2, 0.07 * v, 0.5);
      tone(dest, t, mtof(m) * 5.4, 0.025 * v, 0.12);
    }
    function pad(t, notes, dur, dest = music, level = 0.045, cutoff = 900) {
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = cutoff; lp.connect(dest);
      const g = ctx.createGain(); g.connect(lp);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(level, t + 0.6);
      g.gain.setValueAtTime(level, t + dur - 0.4); g.gain.linearRampToValueAtTime(0, t + dur + 0.3);
      for (const m of notes) for (const det of [-4, 4]) {
        const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = mtof(m); o.detune.value = det;
        o.connect(g); o.start(t); o.stop(t + dur + 0.4);
      }
    }

    if (stems.music && T.music) moodMusic();
    else if (stems.music) {
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

    // ---- music moods ("music:" lines) ----
    // Each mood is a short hand-written phrase in the same music-box + pad style: its own chords, tempo
    // (bar length), melody (one entry per slot, 0 = rest), bass pattern, levels and an optional extra layer.
    // A mood plays from its change until the next one, and the two cross-fade over XF seconds.
    function moodMusic() {
      const CH = {
        C: [60, 64, 67], Am: [57, 60, 64], F: [53, 57, 60], G: [55, 59, 62], Dm: [50, 53, 57], Em: [52, 55, 59],
        Bb: [58, 62, 65], D: [50, 54, 57], A: [57, 61, 64], Bm: [47, 50, 54], E: [52, 56, 59], B: [47, 51, 54],
      };
      const MOODS = {
        happy: { bar: 2.5, slots: 4, box: 0.75, padLvl: 0.045, bass: [[0, 0, 0.7], [2, 2, 0.45]],
          chords: ['C', 'Am', 'F', 'G', 'C', 'G', 'Am', 'F', 'C', 'G', 'F', 'C', 'Dm', 'G', 'C', 'Em'],
          mel: [[76, 0, 79, 76], [74, 72, 0, 69], [72, 0, 69, 72], [74, 0, 71, 0], [76, 79, 84, 79], [77, 76, 74, 0], [72, 0, 76, 0], [77, 76, 72, 0],
            [79, 0, 76, 72], [74, 0, 0, 79], [77, 0, 0, 72], [76, 0, 0, 0], [74, 0, 77, 0], [79, 0, 74, 0], [76, 79, 84, 0], [83, 79, 76, 0]],
          end: [['F', [84, 0, 81, 77]], ['C', [76, 0, 72, 0]]], home: [72, 76, 79] },
        calm: { bar: 3.2, slots: 4, box: 0.55, padLvl: 0.055, cutoff: 800, bass: [[0, 0, 0.55]],
          chords: ['F', 'C', 'Dm', 'Bb', 'F', 'Am', 'Bb', 'C'],
          mel: [[72, 0, 0, 69], [67, 0, 0, 0], [69, 0, 72, 0], [70, 0, 0, 0], [72, 0, 77, 0], [76, 0, 0, 72], [74, 0, 70, 0], [72, 0, 0, 0]],
          end: [['C', [70, 0, 67, 0]], ['F', [69, 0, 0, 0]]], home: [65, 69, 72] },
        magical: { bar: 2.8, slots: 8, box: 0.6, padLvl: 0.05, cutoff: 1100, bass: [[0, 0, 0.55], [4, 2, 0.35]], sparkle: 0.16,
          chords: ['C', 'D', 'Am', 'F', 'C', 'Em', 'F', 'G'],
          mel: [[76, 0, 0, 79, 0, 0, 83, 0], [78, 0, 0, 0, 74, 0, 0, 0], [76, 0, 0, 72, 0, 0, 69, 0], [72, 0, 0, 0, 0, 0, 0, 0],
            [79, 0, 0, 76, 0, 0, 84, 0], [83, 0, 79, 0, 0, 0, 0, 0], [81, 0, 0, 77, 0, 0, 72, 0], [74, 0, 0, 0, 79, 0, 0, 0]],
          end: [['F', [81, 0, 0, 77, 0, 0, 0, 0]], ['C', [79, 0, 0, 76, 0, 0, 0, 0]]], home: [72, 76, 79, 84] },
        mystery: { bar: 3.0, slots: 4, box: 0.5, padLvl: 0.055, cutoff: 700, bass: [[0, 0, 0.6]], ping: 0.12,
          chords: ['Am', 'F', 'Dm', 'E', 'Am', 'Dm', 'F', 'E'],
          mel: [[64, 0, 0, 0], [0, 0, 65, 0], [62, 0, 0, 0], [0, 0, 68, 0], [64, 0, 0, 72], [69, 0, 0, 0], [0, 0, 72, 71], [68, 0, 0, 0]],
          end: [['E', [68, 0, 71, 0]], ['Am', [69, 0, 0, 0]]], home: [57, 64, 69] },
        adventure: { bar: 2.14, slots: 8, box: 0.62, padLvl: 0.04, cutoff: 1000, bass: [[0, 0, 0.5], [2, 2, 0.3], [4, 0, 0.45], [6, 2, 0.3]],
          chords: ['D', 'A', 'Bm', 'G', 'D', 'A', 'G', 'A'],
          mel: [[74, 0, 78, 0, 81, 0, 78, 0], [76, 0, 0, 73, 76, 0, 0, 0], [74, 0, 78, 0, 83, 0, 81, 0], [79, 0, 0, 0, 74, 0, 0, 0],
            [81, 0, 78, 81, 86, 0, 81, 0], [85, 0, 81, 0, 76, 0, 0, 0], [79, 0, 83, 0, 86, 0, 83, 0], [81, 0, 0, 0, 85, 0, 0, 0]],
          end: [['A', [85, 0, 81, 0, 76, 0, 0, 0]], ['D', [74, 0, 0, 0, 0, 0, 0, 0]]], home: [74, 78, 81] },
        tense: { bar: 2.4, slots: 8, box: 0.5, padLvl: 0.05, cutoff: 650, bass: [[0, 0, 0.5]], pulse: 0.22,
          chords: ['Em', 'Em', 'C', 'B', 'Em', 'Am', 'C', 'B'],
          mel: [[0, 0, 0, 0, 71, 0, 0, 0], [72, 0, 71, 0, 0, 0, 0, 0], [0, 0, 0, 0, 76, 0, 0, 0], [75, 0, 0, 0, 0, 0, 71, 0],
            [0, 0, 0, 0, 67, 0, 0, 0], [69, 0, 72, 0, 0, 0, 0, 0], [76, 0, 0, 0, 79, 0, 0, 0], [78, 0, 0, 0, 75, 0, 0, 0]],
          end: [['B', [75, 0, 0, 0, 71, 0, 0, 0]], ['Em', [71, 0, 0, 0, 0, 0, 0, 0]]], home: [64, 67, 71] },
        sad: { bar: 3.4, slots: 4, box: 0.55, padLvl: 0.05, cutoff: 750, bass: [[0, 0, 0.55], [2, 2, 0.3]],
          chords: ['Am', 'F', 'C', 'E', 'Am', 'Dm', 'F', 'E'],
          mel: [[76, 0, 74, 72], [72, 0, 0, 69], [67, 0, 72, 0], [71, 0, 0, 0], [72, 0, 71, 69], [69, 0, 65, 0], [64, 0, 65, 69], [68, 0, 0, 0]],
          end: [['E', [71, 0, 68, 0]], ['Am', [69, 0, 0, 0]]], home: [57, 64, 69] },
        bedtime: { bar: 2.7, slots: 3, box: 0.45, padLvl: 0.04, cutoff: 700, bass: [[0, 0, 0.45]],
          chords: ['C', 'G', 'Am', 'F', 'C', 'F', 'G', 'C'],
          mel: [[79, 76, 0], [74, 0, 71], [72, 76, 0], [77, 0, 72], [76, 79, 0], [77, 74, 0], [74, 0, 71], [72, 0, 0]],
          end: [['G', [74, 0, 71]], ['C', [72, 0, 0]]], home: [60, 64, 67] },
      };
      const XF = 2, list = T.music[0].t > 0 ? [{ t: 0, mood: 'happy' }, ...T.music] : T.music;
      // equal-power fades, so the music keeps its loudness through a cross-fade
      const fade = (up, n = 32) => Float32Array.from({ length: n }, (_, i) => (up ? Math.sin : Math.cos)(i / (n - 1) * Math.PI / 2));
      list.forEach((sec, i) => {
        const M = MOODS[sec.mood], next = list[i + 1], t0 = sec.t, last = !next;
        if (!M) return;   // 'none': the music before it simply fades out
        const out = ctx.createGain(); out.connect(music);
        // (a value curve may not share its start time with another event, so the curves alone shape the gain)
        if (t0 > 0) { out.gain.value = 0; out.gain.setValueCurveAtTime(fade(true), at(t0), XF); }
        if (next) out.gain.setValueCurveAtTime(fade(false), at(Math.max(t0 + XF, next.t)), XF);
        const end = next ? Math.max(t0 + XF, next.t) + XF : T.duration - 0.5;
        const nBars = Math.max(last ? 2 : 1, Math.ceil((end - t0) / M.bar)), slot = M.bar / M.slots;
        for (let b = 0; b < nBars; b++) {
          const fin = last && b >= nBars - 2, idx = b % M.chords.length, pass = Math.floor(b / M.chords.length);
          const name = fin ? M.end[b - (nBars - 2)][0] : M.chords[idx], notes = fin ? M.end[b - (nBars - 2)][1] : M.mel[idx];
          const t = at(t0 + b * M.bar), ch = CH[name];
          pad(t, ch, M.bar, out, M.padLvl, M.cutoff || 900);
          M.bass.forEach(([k, tone, v]) => musicBox(t + k * slot, ch[tone] - 12, v, out));
          // on repeats the melody goes up an octave and plays lighter, as the classic music does
          notes.forEach((m, k) => { if (m && !(pass % 2 && k % 2)) musicBox(t + k * slot, m + (pass % 2 ? 12 : 0), M.box * (pass % 2 ? 0.75 : 1), out); });
          if (M.sparkle && !fin) for (let k = 0; k < 8; k++) musicBox(t + k * M.bar / 8 + M.bar / 16, ch[k % 3] + 24, M.sparkle, out);
          if (M.ping && !fin && b % 2) musicBox(t + M.bar * 0.62, ch[0] + 24, M.ping, out);
          if (M.pulse && !fin) for (let k = 0; k < 8; k++) musicBox(t + k * M.bar / 8, ch[0] - (k % 2 ? 0 : 12), M.pulse * (k % 2 ? 0.6 : 1), out);
        }
        if (last) { const h = at(t0 + (nBars - 1) * M.bar); M.home.forEach((m, k) => musicBox(h, m, 0.5 - k * 0.07, out)); }
      });
    }

    // ---- sound effects ----
    // A place's background sound is half as loud (-6 dB) at night and under calm or bedtime music,
    // changing smoothly as night falls or the music changes.
    const evalKeys = window.StudioStory.evalKeys, QUIET = { calm: 1, bedtime: 1 };
    const quietMood = s => {
      if (!T.music) return 0;
      let q = 0;
      T.music.forEach(m => { if (m.t <= s) q = q + ((QUIET[m.mood] || 0) - q) * Math.min(1, (s - m.t) / 2); });
      return q;
    };
    const soft = s => 1 - 0.5 * Math.max(Math.min(1, Math.max(0, evalKeys(T.keys.tau, s) - 2)), quietMood(s));
    const noise = noiseBuffer(ctx);
    const noiseSrc = (t, dur) => { const n = ctx.createBufferSource(); n.buffer = noise; n.loop = true; n.start(t, (t * 0.37) % 1.5); n.stop(t + dur + 0.1); return n; };
    const chime = (t, m, g = 0.2, d = 0.9) => { tone(sfx, t, mtof(m), g, d); tone(sfx, t, mtof(m) * 2.76, g * 0.35, d * 0.5); };
    const fx = {
      breeze(c) {
        const n = noiseSrc(at(c.t), c.t1 - c.t), bp = ctx.createBiquadFilter(), g = ctx.createGain();
        bp.type = 'bandpass'; bp.frequency.value = 520; bp.Q.value = 0.5; n.connect(bp); bp.connect(g); g.connect(sfx);
        g.gain.setValueAtTime(0, at(c.t)); g.gain.linearRampToValueAtTime(0.05 * soft(c.t + 1.5), at(c.t + 1.5));
        for (let s = c.t + 2; s < c.t1 - 3; s += 1.5) g.gain.linearRampToValueAtTime((0.03 + 0.03 * Math.abs(Math.sin(s * 0.7))) * soft(s), at(s));
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
      // the sound of a place, from c.t to c.t1, fading in over c.fi and out over c.fo (so places cross-fade)
      ambience(c) {
        const t0 = c.t, t1 = c.t1, g = ctx.createGain(), out = ctx.createGain();
        out.connect(sfx);
        const band = (type, f, q) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q) b.Q.value = q; return b; };
        const layer = (filters, level) => {
          const n = noiseSrc(at(t0), t1 - t0), lg = ctx.createGain(); lg.gain.value = level;
          filters.reduce((a, b) => (a.connect(b), b), n).connect(lg); lg.connect(g);
        };
        // a gentle level that changes over time, set every 0.25 s (no sudden jumps)
        const shape = f => { const fn = s => f(s) * soft(s); g.gain.setValueAtTime(fn(t0), at(t0)); for (let s = t0 + 0.25; s <= t1; s += 0.25) g.gain.linearRampToValueAtTime(fn(s), at(s)); };
        g.connect(out);
        switch (c.kind) {
          case 'meadow': layer([band('bandpass', 520, 0.5)], 1); shape(s => 0.03 + 0.03 * Math.abs(Math.sin(s * 0.7))); break;
          case 'forest': // leaves rustling softly
            layer([band('highpass', 2400)], 0.6); layer([band('bandpass', 700, 0.6)], 0.5);
            shape(s => 0.025 + 0.02 * Math.abs(Math.sin(s * 0.55)) * (0.6 + 0.4 * Math.sin(s * 1.7)));
            break;
          case 'river': // flowing water: a low rush and a bubbling shimmer
            layer([band('lowpass', 500)], 1); layer([band('bandpass', 1500, 1.2)], 0.45);
            shape(s => 0.055 + 0.012 * Math.sin(s * 1.3) + 0.008 * Math.sin(s * 3.1));
            break;
          case 'snowy-hill': { // soft wind that swells and fades
            const bp = band('bandpass', 420, 0.9);
            for (let s = t0; s <= t1; s += 0.5) bp.frequency.linearRampToValueAtTime(380 + 160 * Math.sin(s * 0.4), at(s));
            layer([bp], 1); shape(s => 0.03 + 0.035 * (0.5 + 0.5 * Math.sin(s * 0.45)));
            break;
          }
          case 'beach': // waves rolling in and washing back, in time with the picture
            layer([band('lowpass', 650)], 1); layer([band('highpass', 1800)], 0.35);
            shape(s => 0.025 + 0.06 * Math.pow(0.5 + 0.5 * Math.sin(s * 0.9 + 0.6), 2));
            break;
        }
        out.gain.setValueAtTime(0, at(t0)); out.gain.linearRampToValueAtTime(1, at(t0 + c.fi));
        out.gain.setValueAtTime(1, at(Math.max(t0 + c.fi, t1 - c.fo))); out.gain.linearRampToValueAtTime(0, at(t1));
      },
      // a soft page-turn whoosh and a little chime when the story moves to a new place
      pageTurn(c) {
        const t = at(c.t), n = noiseSrc(t, 0.9), bp = ctx.createBiquadFilter(), g = ctx.createGain();
        bp.type = 'bandpass'; bp.Q.value = 0.8; bp.frequency.setValueAtTime(500, t); bp.frequency.exponentialRampToValueAtTime(2400, t + 0.55);
        n.connect(bp); bp.connect(g); g.connect(sfx);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.07, t + 0.3); g.gain.linearRampToValueAtTime(0, t + 0.85);
        chime(t + 0.55, 88, 0.08, 1.0); chime(t + 0.68, 93, 0.06, 1.0);
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
      // a reveal: a soft major chord that swells up and fades, with a few twinkles rising on top
      swell(c) {
        const t0 = at(c.t), t1 = at(c.t1), mid = t0 + (t1 - t0) * 0.6, g = ctx.createGain(), lp = ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.setValueAtTime(600, t0); lp.frequency.linearRampToValueAtTime(2200, mid);
        g.connect(lp); lp.connect(sfx);
        g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.05, mid); g.gain.linearRampToValueAtTime(0, t1);
        for (const m of [60, 64, 67, 72, 76]) for (const det of [-5, 5]) {
          const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = mtof(m); o.detune.value = det;
          o.connect(g); o.start(t0); o.stop(t1 + 0.05);
        }
        [84, 88, 91, 96, 100].forEach((m, i) => chime(t0 + (mid - t0) * (0.2 + i * 0.18), m, 0.06, 1.0));
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
