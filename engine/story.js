// Story parser + compiler.
// parseStory(text)            -> { meta, beats, errors }
// compileStory(parsed, lens)  -> plan (everything the renderer and the audio engine need)
// `lens` maps speech index -> voice clip length in seconds (estimated when unknown).
(function (root) {
  const POS = { left: 560, center: 960, right: 1360 };
  const OFF = { left: -280, right: 2200 };
  const TIMES = { day: 0, sunset: 1, dusk: 2, night: 3 };
  const MOODS = ['normal', 'happy', 'surprised', 'shy', 'sad', 'sleepy'];
  const SPEED = 290;            // walking speed, px per second
  const KS = 1.15;              // Ren scale (fixed)
  const feetY = x => 905 - 38 * Math.exp(-(((x - 960) / 240) ** 2));

  const HELP = [
    'narrator: <text>', 'ren: <text>', 'ren (happy|surprised|shy|sad|sleepy): <text>',
    'ren enters [from left|right] [to left|center|right]', 'ren walks to left|center|right', 'ren exits [to] left|right',
    'ren hops [twice]', 'ren waves', 'ren looks up|down|left|right|at you|at the star|at the heart', 'ren turns to you',
    'ren tilts its head', 'ren feels happy|surprised|shy|sad|sleepy|normal', 'ren picks up the star', 'ren lets go of the star',
    'ren raises its paws', 'ren lowers its paws', 'ren blinks',
    'star appears', 'star falls', 'star glows', 'star twinkles', 'star rises', 'star disappears',
    'hearts float up', 'heart floats down', 'sparkles', 'title card: <WORD>',
    'time: day|sunset|dusk|night', 'camera: wide|close|closer', 'wait <seconds>',
  ];

  // ---------------- parser ----------------
  function parseStory(text) {
    const meta = { title: 'Untitled story', place: 'meadow', time: 'sunset' };
    const beats = [], errors = [];
    let started = false;
    text.replace(/\r/g, '').split('\n').forEach((raw, i) => {
      const lineNo = i + 1;
      let line = raw.trim();
      if (!line || line.startsWith('#')) return;
      let together = false;
      if (line.startsWith('+')) { together = true; line = line.slice(1).trim(); }
      const err = msg => errors.push(`Line ${lineNo}: ${msg}\n    "${raw.trim()}"`);
      const beat = (type, o = {}) => { beats.push({ type, line: lineNo, together, src: raw.trim(), ...o }); started = true; };
      let m;

      if ((m = line.match(/^(title|place)\s*:\s*(.+)$/i))) {
        const key = m[1].toLowerCase(), val = m[2].trim();
        if (key === 'place' && val.toLowerCase() !== 'meadow') return err(`Unknown place "${val}". Available places: meadow`);
        meta[key] = key === 'place' ? val.toLowerCase() : val;
        return;
      }
      if ((m = line.match(/^time\s*:\s*(\w+)$/i))) {
        const v = m[1].toLowerCase();
        if (!(v in TIMES)) return err(`Unknown time "${m[1]}". Use: day, sunset, dusk or night`);
        if (!started) meta.time = v; else beat('time', { value: v });
        return;
      }
      if ((m = line.match(/^camera\s*:\s*(\w+)$/i))) {
        const v = m[1].toLowerCase(), z = { wide: 1, normal: 1, close: 1.3, closer: 1.55 }[v];
        if (!z) return err(`Unknown camera "${m[1]}". Use: wide, close or closer`);
        return beat('camera', { zoom: z });
      }
      if ((m = line.match(/^(narrator|ren)\s*(?:\(\s*([a-z]+)\s*\))?\s*:\s*(.+)$/i))) {
        const who = m[1].toLowerCase(), mood = m[2] && m[2].toLowerCase(), say = m[3].trim();
        if (mood && who === 'narrator') return err('The narrator has no mood. Remove the (…) part.');
        if (mood && !MOODS.includes(mood)) return err(`Unknown mood "${m[2]}". Use: ${MOODS.join(', ')}`);
        if (say.length > 160) return err('This line is too long (max 160 characters). Split it into two lines.');
        return beat('say', { who, mood, text: say });
      }
      if ((m = line.match(/^(?:wait|pause)\s+([\d.]+)\s*(?:s|sec|seconds?)?$/i))) return beat('wait', { secs: Math.min(20, parseFloat(m[1])) });
      if ((m = line.match(/^title card\s*:\s*(.+)$/i))) {
        const word = m[1].trim().toUpperCase();
        if (word.length > 14) return err('Title card text must be 14 characters or fewer.');
        return beat('title', { text: word });
      }
      if (/^sparkles?(\s+around ren)?$/i.test(line)) return beat('sparkles');
      if (/^(a |the |little )*hearts? floats? up$/i.test(line)) return beat('heartsUp');
      if (/^(a |the |golden )*hearts? floats? down$/i.test(line)) return beat('heartDown');
      if ((m = line.match(/^(?:the |a |little )*star\s+(appears|falls|glows|twinkles|rises|disappears)$/i))) return beat('star', { act: m[1].toLowerCase() });

      if ((m = line.match(/^ren\s+(.+)$/i))) {
        const a = m[1].toLowerCase().replace(/[.!]+$/, '').replace(/\s+/g, ' ');
        let k;
        if ((k = a.match(/^enters(?: from (left|right))?(?: to (?:the )?(left|center|centre|right))?$/))) return beat('enter', { from: k[1] || 'left', to: (k[2] || 'center').replace('centre', 'center') });
        if ((k = a.match(/^(?:walks|moves|goes) to (?:the )?(left|center|centre|right)(?: slowly)?$/))) return beat('walk', { to: k[1].replace('centre', 'center'), slow: /slowly/.test(a) });
        if ((k = a.match(/^(?:exits|leaves)(?: to)?(?: the)? (left|right)$/))) return beat('exit', { to: k[1] });
        if ((k = a.match(/^hops( twice)?$/))) return beat('hop', { n: k[1] ? 2 : 1 });
        if (/^waves( goodbye| hello)?$/.test(a)) return beat('wave');
        if ((k = a.match(/^looks (up|down|left|right|around|at you|at the viewer|at the camera|at (?:the )?star|at (?:the )?heart)$/))) {
          const v = k[1].replace(/^at (the )?/, '').replace(/^(viewer|camera)$/, 'you');
          return beat('look', { at: v });
        }
        if (/^turns to (you|the viewer|the camera)$/.test(a)) return beat('look', { at: 'you' });
        if (/^tilts (its |his |her )?head$/.test(a)) return beat('tilt');
        if ((k = a.match(/^(?:feels|looks|is) (happy|surprised|shy|sad|sleepy|normal|calm)$/))) return beat('mood', { mood: k[1] === 'calm' ? 'normal' : k[1] });
        if (/^picks up (the )?star$/.test(a)) return beat('pickup');
        if (/^(holds (the )?star( close)?|hugs (the )?star)$/.test(a)) return beat('wait', { secs: 1.0 });
        if (/^(lets go of|releases|lets go|sets free) (the )?star$/.test(a)) return beat('star', { act: 'rises' });
        if (/^raises (its |his |her )?paws$/.test(a)) return beat('paws', { up: true });
        if (/^lowers (its |his |her )?paws$/.test(a)) return beat('paws', { up: false });
        if (/^blinks$/.test(a)) return beat('blink');
        return err(`I don't know how Ren can "${a}".`);
      }
      err('I don\'t understand this line.');
    });
    if (!beats.some(b => b.type === 'say')) errors.push('The story has no narrator or Ren lines.');
    return { meta, beats, errors };
  }

  // ---------------- keyframe streams ----------------
  const ease = t => -(Math.cos(Math.PI * Math.min(1, Math.max(0, t))) - 1) / 2;
  function evalKeys(keys, t) {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) {
      const [ta, va] = keys[i], [tb, vb] = keys[i + 1];
      if (t <= tb) return tb === ta ? vb : va + (vb - va) * ease((t - ta) / (tb - ta));
    }
    return keys[keys.length - 1][1];
  }
  // Builds keys from changes {t, v, dur}; a later change starts from wherever the value is at that moment.
  function keysFrom(initial, changes) {
    let keys = [[0, initial]];
    for (const c of [...changes].sort((a, b) => a.t - b.t)) {
      const v0 = evalKeys(keys, c.t);
      keys = keys.filter(k => k[0] <= c.t);
      keys.push([c.t, v0], [c.t + Math.max(0.001, c.dur), c.v]);
    }
    return keys;
  }

  // ---------------- compiler ----------------
  function compileStory(parsed, lens = {}) {
    const { meta, beats } = parsed;
    const errors = [];
    const ch = { facing: [], lookX: [], lookY: [], tilt: [], armL: [], armR: [], crouch: [], tau: [], zoom: [], bright: [] };
    const set = (k, t, v, dur = 0.4) => ch[k].push({ t, v, dur });
    const P = {
      meta, walks: [], hops: [], moods: [], exprs: [], waves: [], lookAt: [], blinkExtra: [],
      voice: [], captions: [], bubbles: [], titles: [], hearts: [], heartDown: [], sparkles: [],
      star: [], twinkles: [], sfx: [], warnings: [],
    };
    const ARM_R = 0.16;
    const firstRen = beats.find(b => /^(enter|walk|exit|hop|wave|look|tilt|mood|pickup|paws|blink)$/.test(b.type) || (b.type === 'say' && b.who === 'ren'));
    let kx = firstRen && firstRen.type === 'enter' ? OFF[firstRen.from] : POS.center;
    P.renStartX = kx;
    let facing = 0, holding = false, armsUp = false, mood = 'normal', openLook = null, zoom = 1;
    let star = { state: 'none', x: 0, y: 0, r: 20 };
    let t = 0.6, prevStart = 0.6;
    const voiceWins = [];
    const sfx = (type, at, o = {}) => P.sfx.push({ type, t: at, ...o });
    const chestY = () => feetY(kx) - 98 * KS;
    const closeLook = s => { if (openLook) { openLook.b = s; openLook = null; } };
    const skyFor = x => ({ x: Math.max(260, Math.min(1660, x + (x > 1300 ? -460 : 460))), y: 160 });

    function walkTo(s, x1, slow) {
      const dist = Math.abs(x1 - kx);
      if (dist < 4) return 0;
      const dir = x1 > kx ? 1 : -1, dur = Math.max(1.2, dist / (slow ? SPEED * 0.6 : SPEED));
      set('facing', s, dir * 0.85, 0.25);
      P.walks.push({ t0: s + 0.15, t1: s + 0.15 + dur, x0: kx, x1 });
      sfx('rustle', s + 0.15, { dur, gain: 0.45 });
      set('facing', s + 0.15 + dur, 0, 0.45);
      set('lookX', s, dir * 0.6, 0.3); set('lookY', s, 0, 0.3);
      set('lookX', s + 0.15 + dur, 0, 0.4);
      kx = x1;
      return dur + 0.6;
    }

    for (const b of beats) {
      const s = b.together ? prevStart : t;
      let dur = 0;
      switch (b.type) {
        case 'say': {
          const len = lens[P.voice.length] || estimate(b.text);
          const vt = b.who === 'ren' ? s + 0.15 : s;
          if (voiceWins.some(([a, e]) => vt < e && vt + len > a)) errors.push(`Line ${b.line}: two voices would talk at the same time. Remove the "+" so this line waits its turn.`);
          voiceWins.push([vt, vt + len]);
          P.voice.push({ id: P.voice.length, who: b.who, text: b.text, t: vt, len, line: b.line });
          if (b.who === 'narrator') {
            P.captions.push({ text: b.text, t0: Math.max(0.3, s - 0.1), t1: s + len + 0.5 });
            dur = len + 0.45;
          } else {
            P.bubbles.push({ text: b.text, t0: s, t1: Math.max(vt + len + 0.9, s + 2.8), side: kx >= 960 ? -1 : 1, emph: /!/.test(b.text) && /^(whoa|wow|oh|look|yay|hooray)/i.test(b.text) });
            if (b.mood) P.exprs.push({ a: s, b: vt + len + 0.3, mood: b.mood });
            dur = 0.15 + len + 0.55;
          }
          break;
        }
        case 'wait': dur = b.secs; break;
        case 'enter': {
          kx = OFF[b.from];
          dur = walkTo(s, POS[b.to], false);
          break;
        }
        case 'walk': dur = walkTo(s, POS[b.to], b.slow); break;
        case 'exit': dur = walkTo(s, OFF[b.to], false); break;
        case 'hop': {
          for (let i = 0; i < b.n; i++) {
            const t0 = s + 0.14 + i * 0.7;
            P.hops.push({ t0, t1: t0 + 0.55, h: 70 });
            sfx('boingUp', t0); sfx('boingLand', t0 + 0.55);
          }
          dur = 0.85 + (b.n - 1) * 0.7;
          break;
        }
        case 'wave': {
          if (holding) { P.warnings.push(`Line ${b.line}: Ren is holding the star, so it waves with the star in its paws.`); }
          set('armR', s, 2.35, 0.4); P.waves.push({ a: s + 0.4, b: s + 2.2 }); set('armR', s + 2.2, holding ? -1.2 : ARM_R, 0.4);
          dur = 2.6; break;
        }
        case 'look': {
          closeLook(s);
          const L = { up: [0.2, -1], down: [0, 0.8], left: [-1, 0], right: [1, 0], you: [0, 0], around: [0, 0] }[b.at];
          if (b.at === 'star' || b.at === 'heart') { openLook = { a: s, b: 1e9, target: b.at }; P.lookAt.push(openLook); }
          else if (b.at === 'around') { set('lookX', s, -1, 0.4); set('lookX', s + 0.6, 1, 0.6); set('lookX', s + 1.4, 0, 0.4); set('lookY', s, 0, 0.3); }
          else { set('lookX', s, L[0], 0.4); set('lookY', s, L[1], 0.4); }
          if (b.at === 'you') set('facing', s, 0, 0.4);
          if (b.at === 'up') { set('tilt', s, -0.1, 0.4); } else set('tilt', s, 0, 0.4);
          dur = b.at === 'around' ? 1.9 : 0.9;
          break;
        }
        case 'tilt': set('tilt', s, 0.22, 0.3); set('tilt', s + 0.9, 0, 0.3); dur = 1.25; break;
        case 'mood': P.moods.push({ t: s, mood: b.mood }); mood = b.mood; dur = 0.6; break;
        case 'blink': P.blinkExtra.push(s); dur = 0.4; break;
        case 'paws': {
          armsUp = b.up;
          const v = b.up ? 2.7 : holding ? -1.2 : ARM_R;
          set('armL', s, v, 0.5); set('armR', s, v, 0.5);
          if (holding) star = moveStar(star, s, b.up ? 'raise' : 'lower', 0.6);
          dur = 0.8; break;
        }
        case 'pickup': {
          if (star.state !== 'ground') { errors.push(`Line ${b.line}: there is no star on the ground to pick up. Use "star falls" first.`); break; }
          const side = star.x >= kx ? 1 : -1;
          let d = walkTo(s, star.x - side * 115, true);
          const p = s + Math.max(0, d - 0.3);
          set('facing', p, side * 0.85, 0.3);
          ch.crouch.push({ t: p, v: 0.86, dur: 0.4 }, { t: p + 0.9, v: 1, dur: 0.4 });
          set('armL', p, 0.7, 0.5); set('armR', p, 0.7, 0.5);
          set('lookX', p, side * 0.8, 0.3); set('lookY', p, 0.9, 0.3);
          P.star.push({ type: 'pickup', t0: p + 0.6, t1: p + 1.3, from: { x: star.x, y: star.y } });
          P.star.push({ type: 'held', t0: p + 1.3 });
          set('armL', p + 1.0, -1.2, 0.4); set('armR', p + 1.0, -1.2, 0.4);
          set('facing', p + 1.3, 0, 0.6); set('lookX', p + 1.3, 0, 0.4); set('lookY', p + 1.3, 0.8, 0.4);
          sfx('rustle', p, { dur: 1.2, gain: 0.8 }); sfx('twinkle', p + 1.3, { midi: 93, gain: 0.1 });
          holding = true; star.state = 'held';
          dur = (p - s) + 2.0;
          break;
        }
        case 'star': dur = starBeat(b, s); break;
        case 'heartsUp': {
          [0.1, 0.4, 0.7].forEach((o, i) => { P.hearts.push({ t: s + o, i }); sfx('pop', s + o); });
          dur = 1.6; break;
        }
        case 'heartDown': {
          const from = star.state === 'sky' ? { x: star.x, y: star.y } : { x: Math.min(1700, kx + 420), y: 110 };
          P.heartDown.push({ t0: s, t1: s + 1.3, burst: s + 1.65, from });
          sfx('pop', s, { gain: 0.4 });
          if (!holding) { set('armL', s + 0.6, 1.9, 0.45); set('armR', s + 0.6, 1.9, 0.45); set('armL', s + 1.65, ARM_R, 0.3); set('armR', s + 1.65, ARM_R, 0.3); }
          P.exprs.push({ a: s + 1.4, b: s + 2.4, mood: 'joy' });
          closeLook(s); openLook = { a: s, b: s + 1.6, target: 'heart' }; P.lookAt.push(openLook); openLook = null;
          sfx('sparkles', s + 1.65, { n: 6, seed: Math.round(s * 10) });
          dur = 2.1; break;
        }
        case 'sparkles': P.sparkles.push({ t: s }); sfx('sparkleChime', s); dur = 0.8; break;
        case 'title': {
          const letters = [...b.text].map((_, i) => s + i * 0.22);
          P.titles.push({ text: b.text, letters, drop: 0.5, out0: s + 5.2, out1: s + 6.0 });
          letters.forEach((lt, i) => { if (b.text[i] !== ' ') sfx('chime', lt + 0.31, { midi: [84, 88, 91, 93, 96, 98, 100][i % 7], gain: 0.2 }); });
          dur = letters.length * 0.22 + 0.6;
          break;
        }
        case 'time': set('tau', s, TIMES[b.value], 4); dur = 0; break;
        case 'camera': zoom = b.zoom; set('zoom', s, b.zoom, 1.6); dur = 0; break;
      }
      prevStart = s;
      t = Math.max(t, s + dur);
    }

    function starBeat(b, s) {
      const act = b.act;
      if (act === 'appears') {
        const p = skyFor(kx);
        star = { state: 'sky', x: p.x, y: p.y, r: 20 };
        P.star.push({ type: 'appear', t0: s, t1: s + 0.8, at: p, r: 20 });
        ch.bright.push({ t: s, v: 0.95, dur: 0.1 });
        sfx('twinkle', s + 0.15, { midi: 96, gain: 0.1 });
        return 1.0;
      }
      if (act === 'twinkles') {
        if (star.state !== 'sky') { errors.push(`Line ${b.line}: the star must be in the sky to twinkle.`); return 0; }
        [0.1, 0.45, 0.8].forEach((o, i) => { P.twinkles.push(s + o); sfx('twinkle', s + o, { midi: [96, 100, 103][i], gain: 0.2 }); });
        return 1.3;
      }
      if (act === 'falls') {
        if (star.state !== 'sky') { errors.push(`Line ${b.line}: the star must be in the sky to fall. Use "star appears" first.`); return 0; }
        const gx = kx + 330 < 1760 ? kx + 330 : kx - 330, to = { x: gx, y: feetY(gx) - 26 };
        P.star.push({ type: 'fall', t0: s, t1: s + 2.0, from: { x: star.x, y: star.y }, to, r0: star.r, r1: 26 });
        P.star.push({ type: 'ground', t0: s + 2.0, at: to, r: 26 });
        ch.bright.push({ t: s + 2.0, v: 0.5, dur: 0.6 });
        sfx('fallChime', s, { dur: 2.0 }); sfx('softLand', s + 2.0);
        sfx('sparkles', s + 2.12, { n: 5, seed: 3 }); sfx('sparkles', s + 2.5, { n: 4, seed: 9 });
        P.sparkles.push({ t: s + 2.0, at: to, small: true });
        star = { state: 'ground', x: to.x, y: to.y, r: 26 };
        return 2.4;
      }
      if (act === 'glows') {
        if (star.state === 'none') { errors.push(`Line ${b.line}: there is no star yet.`); return 0; }
        P.star.push({ type: 'flicker', t0: s, t1: s + 1.4 });
        ch.bright.push({ t: s, v: 0.3, dur: 0.2 }, { t: s + 1.4, v: 1, dur: 2.2 });
        [0.3, 1.6, 2.6].forEach((o, i) => { sfx('twinkle', s + o, { midi: [93, 96, 100][i], gain: 0.11 }); P.sparkles.push({ t: s + o, onStar: true, small: true }); });
        return 3.6;
      }
      if (act === 'rises') {
        if (star.state === 'none' || star.state === 'sky') { errors.push(`Line ${b.line}: the star must be on the ground or held to rise.`); return 0; }
        const to = skyFor(kx);
        let s0 = s;
        if (star.state === 'held') {
          set('armL', s, 2.7, 0.5); set('armR', s, 2.7, 0.5);
          P.star.push({ type: 'raise', t0: s, t1: s + 0.9 });
          s0 = s + 1.0;
          set('armL', s0 + 0.3, ARM_R, 0.7); set('armR', s0 + 0.3, ARM_R, 0.7);
          sfx('twinkle', s + 0.4, { midi: 91, gain: 0.1 });
        }
        P.star.push({ type: 'rise', t0: s0, t1: s0 + 4.2, from: star.state === 'held' ? 'overhead' : { x: star.x, y: star.y }, to, r0: 30, r1: 14 });
        P.star.push({ type: 'sky', t0: s0 + 4.2, at: to, r: 14, arrive: true });
        ch.bright.push({ t: s0, v: 1, dur: 0.5 });
        closeLook(s); P.lookAt.push({ a: s0, b: s0 + 5.6, target: 'star' });
        sfx('riseChime', s0, { dur: 4.2 }); sfx('sparkleTrail', s0, { t1: s0 + 4.2 }); sfx('windSwell', s0, { t1: s0 + 5 }); sfx('chime', s0 + 4.2, { midi: 96, gain: 0.25 });
        holding = false; armsUp = false;
        star = { state: 'sky', x: to.x, y: to.y, r: 14 };
        return (s0 - s) + 4.6;
      }
      if (act === 'disappears') {
        if (star.state === 'none') return 0;
        if (star.state === 'held') { holding = false; set('armL', s + 0.4, ARM_R, 0.5); set('armR', s + 0.4, ARM_R, 0.5); }
        P.star.push({ type: 'vanish', t0: s, t1: s + 0.8 });
        sfx('sparkles', s, { n: 4, seed: 40 });
        star = { state: 'none' };
        return 1.0;
      }
      return 0;
    }
    function moveStar(st, s, kind, d) { P.star.push({ type: kind, t0: s, t1: s + d }); return st; }

    closeLook(t);
    const duration = Math.ceil((t + 1.8) * 30) / 30;
    // bubbles fade out before the next one pops in
    P.bubbles.forEach((b, i) => { const n = P.bubbles[i + 1]; if (n) b.t1 = Math.min(b.t1, n.t0 - 0.1); b.t1 = Math.min(b.t1, duration - 0.3); });
    P.captions.forEach((c, i) => { const n = P.captions[i + 1]; if (n) c.t1 = Math.min(c.t1, n.t0 - 0.05); });
    // automatic life: blinks, ear twitches, birds
    const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
    P.blinks = []; for (let b = 2.0, i = 0; b < duration - 0.5; b += 2.8 + hash(i++) * 1.8) P.blinks.push(b);
    P.blinks.push(...P.blinkExtra); P.blinks.sort((a, b) => a - b);
    P.twitches = []; for (let w = 3.0, i = 0; w < duration - 1; w += 5 + hash(i + 50) * 3, i++) P.twitches.push(w);
    sfx('breeze', 0, { t1: duration });
    const tau0 = TIMES[meta.time];
    if (tau0 <= 1) [1.6, 3.3, 5.4].forEach(c => { if (c < duration - 2) sfx('chirp', c); });
    P.sfx.sort((a, b) => a.t - b.t);

    const keys = {};
    const init = { facing: 0, lookX: 0, lookY: 0, tilt: 0, armL: ARM_R, armR: ARM_R, crouch: 1, tau: tau0, zoom: 1, bright: 0.9 };
    for (const k in ch) keys[k] = keysFrom(init[k], ch[k]);
    if (firstRen && firstRen.type === 'enter') keys.facing = keysFrom(firstRen.from === 'left' ? 0.85 : -0.85, ch.facing);

    return {
      version: 1, duration, fps: 30, width: 1920, height: 1080, scale: KS, errors, ...P, keys,
      musicFadeIn: 1.0, musicFadeOut: [Math.max(1, duration - 3), duration], pictureFadeOut: [duration - 0.65, duration],
    };
  }
  function estimate(text) { return 0.45 + text.split(/\s+/).length * 0.36; }

  const api = { parseStory, compileStory, evalKeys, feetY, HELP, POS };
  if (typeof module !== 'undefined') module.exports = api; else root.StudioStory = api;
})(this);
