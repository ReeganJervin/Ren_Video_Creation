// Story parser + compiler.
// parseStory(text)            -> { meta, beats, errors }
// compileStory(parsed, lens)  -> plan (everything the renderer and the audio engine need)
// `lens` maps speech index -> voice clip length in seconds (estimated when unknown).
// Characters come from the registry in characters.js; every line works for any of them.
(function (root) {
  const { CHARACTERS, MOODS } = typeof module !== 'undefined' ? require('./characters.js') : root.StudioCharacters;
  const PLACES = typeof module !== 'undefined' ? require('./places/index.js') : root.StudioPlaces;
  const NAMES = Object.keys(CHARACTERS), NAME = NAMES.join('|');
  const POS = { left: 560, center: 960, right: 1360 };
  const OFF = { left: -280, right: 2200 };
  const TIMES = { day: 0, sunset: 1, dusk: 2, night: 3 };
  const MUSIC = ['happy', 'calm', 'magical', 'mystery', 'adventure', 'tense', 'sad', 'bedtime', 'none'];
  const KS = 1.15;              // character scale (fixed)
  const GAP = 280;              // closest two characters may stand (centre to centre)
  const HUG = 230;              // cheek to cheek
  const MINX = 300, MAXX = 1620;
  const feetY = x => 905 - 38 * Math.exp(-(((x - 960) / 240) ** 2));   // the meadow's ground (each place has its own)
  const title = id => CHARACTERS[id].name;

  const HELP = [
    'narrator: <text>', '<name>: <text>', `<name> (${MOODS.slice(1).join('|')}): <text>`,
    '<name> enters [from left|right] [to left|center|right]', '<name> walks to left|center|right', '<name> walks to <other name>',
    '<name> exits [to] left|right', '<name> hops [twice]', '<name> waves', '<name> looks up|down|left|right|around|at you|at the star|at the heart',
    '<name> looks at <other name>', '<name> turns to you', '<name> turns to <other name>', '<name> tilts its head',
    `<name> feels ${MOODS.join('|')}`, '<name> hugs <other name>', '<name> picks up the star', '<name> lets go of the star',
    '<name> raises its paws', '<name> lowers its paws', '<name> blinks', '<name> and <name> hop | wave | look at each other | feel <mood>',
    'star appears', 'star falls', 'star glows', 'star twinkles', 'star rises', 'star disappears',
    'hearts float up', 'heart floats down', 'sparkles [around <name>]', 'title card: <WORD>',
    `place: ${PLACES.names().join('|')}`, 'time: day|sunset|dusk|night', 'camera: wide|close|closer', 'wait <seconds>',
    'scene: <name>', `music: ${MUSIC.join('|')}`,
    `Characters: ${NAMES.join(', ')}`,
  ];

  // ---------------- parser ----------------
  const spot = s => s.replace('centre', 'center');
  // One character's action words -> a beat ({ type, ... }), or null when the words aren't known.
  // Verbs take an optional "s" so "ren and yuki hop" and "yuki hops" both work.
  function action(a, group) {
    let k;
    if ((k = a.match(/^enters?(?: from (left|right))?(?: to (?:the )?(left|center|centre|right))?$/))) return { type: 'enter', from: k[1] || 'left', to: spot(k[2] || 'center') };
    if ((k = a.match(/^(?:walks?|moves?|goes|go|hops?|runs?) to (?:the )?(left|center|centre|right)( slowly)?$/))) return { type: 'walk', to: spot(k[1]), slow: !!k[2] };
    if ((k = a.match(new RegExp(`^(?:walks?|moves?|goes|go|hops?|runs?) (?:over )?to (${NAME})( slowly)?$`)))) return { type: 'walkTo', target: k[1], slow: !!k[2] };
    if ((k = a.match(/^(?:exits?|leaves?)(?: to)?(?: the)? (left|right)$/))) return { type: 'exit', to: k[1] };
    if ((k = a.match(/^hops?( twice)?$/))) return { type: 'hop', n: k[1] ? 2 : 1 };
    if (/^waves?( goodbye| hello)?$/.test(a)) return { type: 'wave' };
    if ((k = a.match(new RegExp(`^waves? (?:to|at) (${NAME})$`)))) return { type: 'wave', target: k[1] };
    if ((k = a.match(/^looks? (up|down|left|right|around|at you|at the viewer|at the camera|at (?:the )?star|at (?:the )?heart)$/))) {
      return { type: 'look', at: k[1].replace(/^at (the )?/, '').replace(/^(viewer|camera)$/, 'you') };
    }
    if ((k = a.match(new RegExp(`^looks? at (${NAME})$`)))) return { type: 'lookAt', target: k[1] };
    if (group && /^(?:look|turn)s? (?:at|to) each other$/.test(a)) return { type: /^turn/.test(a) ? 'turnTo' : 'lookAt', target: 'each other' };
    if (/^turns? to (you|the viewer|the camera)$/.test(a)) return { type: 'look', at: 'you' };
    if ((k = a.match(new RegExp(`^turns? to (${NAME})$`)))) return { type: 'turnTo', target: k[1] };
    if (/^tilts? (its |his |her |their )?heads?$/.test(a)) return { type: 'tilt' };
    if ((k = a.match(new RegExp(`^(?:feels?|looks?|is|are) (${MOODS.join('|')}|calm)$`)))) return { type: 'mood', mood: k[1] === 'calm' ? 'normal' : k[1] };
    if ((k = a.match(new RegExp(`^hugs? (${NAME})$`)))) return { type: 'hug', target: k[1] };
    if (group && /^hug( each other)?$/.test(a)) return { type: 'hug', target: 'each other' };
    if (/^picks? up (the )?star$/.test(a)) return { type: 'pickup' };
    if (/^(holds? (the )?star( close)?|hugs? (the )?star)$/.test(a)) return { type: 'wait', secs: 1.0 };
    if (/^(lets? go of|releases?|lets? go|sets? free) (the )?star$/.test(a)) return { type: 'star', act: 'rises' };
    if (/^raises? (its |his |her |their )?paws$/.test(a)) return { type: 'paws', up: true };
    if (/^lowers? (its |his |her |their )?paws$/.test(a)) return { type: 'paws', up: false };
    if (/^blinks?$/.test(a)) return { type: 'blink' };
    return null;
  }

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
        if (key === 'place') {
          const p = PLACES.find(val);
          if (!p) return err(`Unknown place "${val}". Available places: ${PLACES.names().join(', ')}`);
          if (!started) meta.place = p.id; else beat('place', { value: p.id });
        } else meta[key] = val;
        return;
      }
      // a new scene: its first place/time/music lines belong to its start (see "scene heads" below)
      if ((m = line.match(/^scene\s*:\s*(.+)$/i))) {
        if (together) return err('A scene can\'t start at the same time as the line above. Remove the "+".');
        const name = m[1].trim();
        if (name.length > 60) return err('A scene name must be 60 characters or fewer.');
        beats.push({ type: 'scene', line: lineNo, together: false, src: raw.trim(), name });
        return;
      }
      if ((m = line.match(/^music\s*:\s*(\w+)$/i))) {
        const v = m[1].toLowerCase();
        if (!MUSIC.includes(v)) return err(`Unknown music "${m[1]}". Use: ${MUSIC.join(', ')}`);
        if (!started) meta.music = v; else beat('music', { mood: v });
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
      if ((m = line.match(new RegExp(`^(narrator|${NAME})\\s*(?:\\(\\s*([a-z]+)\\s*\\))?\\s*:\\s*(.+)$`, 'i')))) {
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
      if ((m = line.match(new RegExp(`^sparkles?(?:\\s+around (${NAME}))?$`, 'i')))) return beat('sparkles', { target: m[1] && m[1].toLowerCase() });
      if (/^(a |the |little )*hearts? floats? up$/i.test(line)) return beat('heartsUp');
      if (/^(a |the |golden )*hearts? floats? down$/i.test(line)) return beat('heartDown');
      if ((m = line.match(/^(?:the |a |little )*star\s+(appears|falls|glows|twinkles|rises|disappears)$/i))) return beat('star', { act: m[1].toLowerCase() });

      if ((m = line.match(new RegExp(`^(${NAME})(?:\\s+and\\s+(${NAME}))?\\s+(.+)$`, 'i')))) {
        const who = [m[1].toLowerCase(), m[2] && m[2].toLowerCase()].filter(Boolean);
        const names = who.map(title).join(' and ');
        if (who.length === 2 && who[0] === who[1]) return err(`${names}? Use two different characters.`);
        const a = m[3].toLowerCase().replace(/[.!]+$/, '').replace(/\s+/g, ' ');
        if (/each other/.test(a) && who.length < 2) return err('"each other" needs two characters, like "ren and yuki look at each other".');
        const b = action(a, who.length > 1);
        if (!b) return err(`I don't know how ${names} can "${a}".`);
        if (b.target && b.target !== 'each other') {
          if (who.includes(b.target)) return err(`${title(b.target)} can't do that to themself. Name someone else.`);
        }
        if (b.target === 'each other' && who.length !== 2) return err('"each other" needs two characters, like "ren and yuki look at each other".');
        if (who.length > 1 && /^(pickup|star|walkTo)$/.test(b.type)) return err(`Only one character can do this at a time. Write it for ${title(who[0])} or ${title(who[1])}.`);
        return beat(b.type, { ...b, who });
      }
      err('I don\'t understand this line.');
    });
    if (!beats.some(b => b.type === 'say')) errors.push('The story has no narrator or character lines.');
    // scene heads: the place/time/music lines right after "scene:" all happen at the scene's start.
    // When the scene changes place, its new time of day is already set as the page turns.
    beats.forEach((b, i) => {
      if (b.type !== 'scene') return;
      const head = [];
      for (let k = i + 1; k < beats.length && /^(place|time|music)$/.test(beats[k].type); k++) head.push(beats[k]);
      const moves = head.some(h => h.type === 'place');
      head.forEach(h => { h.head = true; if (h.type === 'time' && moves) h.snap = true; });
    });
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

  // characters a beat is about (speech by a character counts)
  const whoOf = b => (b.type === 'say' ? (b.who === 'narrator' ? [] : [b.who]) : b.who || [b.target].filter(t => t && t !== 'each other'));

  // ---------------- compiler ----------------
  function compileStory(parsed, lens = {}) {
    const { meta, beats } = parsed;
    // stage spots and ground height come from the place
    const place = PLACES.find(meta.place) || PLACES.PLACES.meadow, POS = place.pos;
    let here = place.id;                                   // the place right now, as the story goes along
    const PT = 1.2;                                        // a change of place: fade to white and back, switching halfway
    const changes = [];
    const feetY = x => PLACES.PLACES[here].ground(x), spots = () => PLACES.PLACES[here].pos;
    const errors = [];
    const G = { tau: [], zoom: [], bright: [] };
    const setG = (k, t, v, dur = 0.4) => G[k].push({ t, v, dur });
    const P = {
      meta, actors: {}, voice: [], captions: [], bubbles: [], titles: [], hearts: [], heartDown: [], sparkles: [],
      star: [], twinkles: [], sfx: [], warnings: [],
    };
    const ARM_R = 0.16;
    const sfx = (type, at, o = {}) => P.sfx.push({ type, t: at, ...o });

    // the cast, in order of first mention (a story with no characters still shows Ren, as it always has)
    const cast = [];
    beats.forEach(b => { whoOf(b).forEach(w => { if (!cast.includes(w)) cast.push(w); }); if (b.target && b.target !== 'each other' && !cast.includes(b.target)) cast.push(b.target); });
    if (!cast.length) cast.push('ren');
    const A = {};
    let startSlot = 0;
    cast.forEach(id => {
      const first = beats.find(b => whoOf(b).includes(id) || b.target === id);
      const enters = first && first.type === 'enter' && first.who && first.who.includes(id);
      // characters already on stage start at the centre, then beside each other
      const x = enters ? OFF[first.from] : [POS.center, POS.center + GAP, POS.center - GAP][startSlot++ % 3];
      A[id] = {
        id, def: CHARACTERS[id], x, open: null,
        ch: { facing: [], lookX: [], lookY: [], tilt: [], armL: [], armR: [], crouch: [] },
        out: { startX: x, firstFacing: enters ? (first.from === 'left' ? 0.85 : -0.85) : 0, walks: [], hops: [], moods: [], exprs: [], waves: [], lookAt: [], blinkExtra: [] },
      };
      P.actors[id] = A[id].out;
    });
    let focus = cast[0], holder = null;
    let star = { state: 'none', x: 0, y: 0, r: 20 };
    let t = 0.6, prevStart = 0.6;
    const voiceWins = [];
    const set = (a, k, t, v, dur = 0.4) => a.ch[k].push({ t, v, dur });
    const closeLook = (a, s) => { if (a.open) { a.open.b = s; a.open = null; } };
    const skyFor = x => ({ x: Math.max(260, Math.min(1660, x + (x > 1300 ? -460 : 460))), y: 160 });
    const onStage = a => a.x > 0 && a.x < 1920;
    const others = a => cast.map(i => A[i]).filter(o => o !== a && onStage(o));
    const inside = x => x >= MINX && x <= MAXX;
    const toward = (a, o) => Math.sign(o.x - a.x) || 1;
    const nearestSpot = x => [spots().left, spots().center, spots().right].reduce((p, q) => (Math.abs(q - x) < Math.abs(p - x) ? q : p));
    // the other character a move to x would bump into, if any
    const crowding = (a, x) => others(a).find(o => Math.abs(x - o.x) < GAP);
    // Two characters near each other stand as a pair centred on `c`: the mover keeps the side it comes from,
    // and the one already standing steps over (after finishing any move of its own). Returns how long it takes.
    function pairUp(a, o, s, c, gap, slow) {
      const side = Math.sign(a.x - o.x) || (a.x < c ? -1 : 1);
      c = Math.max(MINX + gap / 2, Math.min(MAXX - gap / 2, c));
      const at = o.free > s ? o.free - 0.15 : s;
      const dO = moveTo(o, at, c - side * gap / 2, false) + (at - s);
      const dA = moveTo(a, s, c + side * gap / 2, slow);
      return Math.max(dA, dO);
    }
    // going to a stage spot: alone it is the spot itself; next to someone they share it as a centred pair
    function goToSpot(a, s, x, slow) {
      const o = crowding(a, x);
      return o ? pairUp(a, o, s, x, GAP, slow) : moveTo(a, s, x, slow);
    }

    // walking (or hopping, for characters that hop) to x1
    function moveTo(a, s, x1, slow) {
      const dist = Math.abs(x1 - a.x);
      if (dist < 4) return 0;
      const dir = x1 > a.x ? 1 : -1;
      let dur;
      set(a, 'facing', s, dir * 0.85, 0.25);
      if (a.def.moves === 'hop') {
        // small repeated hops, each with a light boing
        const n = Math.max(2, Math.round(dist / 90)), hd = slow ? 0.42 : 0.33;
        dur = n * hd;
        a.out.walks.push({ t0: s + 0.15, t1: s + 0.15 + dur, x0: a.x, x1, hops: n });
        for (let k = 0; k < n; k++) sfx('hopUp', s + 0.15 + k * hd, { gain: 0.55 });
      } else {
        dur = Math.max(1.2, dist / (slow ? a.def.speed * 0.6 : a.def.speed));
        a.out.walks.push({ t0: s + 0.15, t1: s + 0.15 + dur, x0: a.x, x1 });
        sfx('rustle', s + 0.15, { dur, gain: 0.45 });
      }
      set(a, 'facing', s + 0.15 + dur, 0, 0.45);
      set(a, 'lookX', s, dir * 0.6, 0.3); set(a, 'lookY', s, 0, 0.3);
      set(a, 'lookX', s + 0.15 + dur, 0, 0.4);
      a.x = x1; a.free = s + 0.15 + dur; a.toYou = false;
      return dur + 0.6;
    }
    function hop(a, s, n) {
      for (let i = 0; i < n; i++) {
        const t0 = s + 0.14 + i * 0.7;
        a.out.hops.push({ t0, t1: t0 + 0.55, h: a.def.hop.h });
        if (a.def.hop.sound === 'light') { sfx('hopUp', t0); sfx('hopLand', t0 + 0.55); } else { sfx('boingUp', t0); sfx('boingLand', t0 + 0.55); }
      }
      return 0.85 + (n - 1) * 0.7;
    }
    // eyes (and a slight turn) toward another character until the next look
    function lookAtActor(a, o, s, turn) {
      closeLook(a, s);
      a.open = { a: s, b: 1e9, target: { actor: o.id } }; a.out.lookAt.push(a.open);
      set(a, 'facing', s, toward(a, o) * (turn ? 0.5 : 0.18), 0.35);
      set(a, 'lookY', s, 0, 0.3);
      a.toYou = false;
    }
    const talks = [];   // conversation lines: who spoke to whom, used to turn them toward each other
    const scenes = [], music = meta.music ? [{ t: 0, mood: meta.music }] : [];
    let scene = null, content = false;   // the scene going on now; whether anything has happened yet

    for (const b of beats) {
      const s = b.together ? prevStart : t;
      const who = (b.who && typeof b.who !== 'string' ? b.who : []).map(id => A[id]);
      if (who.length) focus = who[0].id;
      let dur = 0;
      switch (b.type) {
        case 'say': {
          const len = lens[P.voice.length] || estimate(b.text);
          const a = b.who === 'narrator' ? null : A[b.who];
          const vt = a ? s + 0.15 : s;
          if (voiceWins.some(([x, e]) => vt < e && vt + len > x)) errors.push(`Line ${b.line}: two voices would talk at the same time. Remove the "+" so this line waits its turn.`);
          voiceWins.push([vt, vt + len]);
          P.voice.push({ id: P.voice.length, who: b.who, text: b.text, t: vt, len, line: b.line });
          if (!a) {
            P.captions.push({ text: b.text, t0: Math.max(0.3, s - 0.1), t1: s + len + 0.5 });
            dur = len + 0.45;
          } else {
            focus = a.id;
            // the bubble goes on the side away from the other character
            const o = others(a)[0];
            const side = o ? (a.x >= o.x ? 1 : -1) : (a.x >= 960 ? -1 : 1);
            if (o) talks.push({ t0: s, t1: vt + len, pairs: [[a, toward(a, o)], [o, toward(o, a)]].filter(([q]) => !q.toYou) });
            P.bubbles.push({ who: a.id, text: b.text, t0: s, t1: Math.max(vt + len + 0.9, s + 2.8), side, emph: /!/.test(b.text) && /^(whoa|wow|oh|look|yay|hooray)/i.test(b.text) });
            if (b.mood) a.out.exprs.push({ a: s, b: vt + len + 0.3, mood: b.mood });
            dur = 0.15 + len + 0.55;
          }
          break;
        }
        case 'wait': dur = b.secs; break;
        case 'enter': case 'walk': {
          if (b.type === 'enter') who.forEach(a => { a.x = OFF[b.from]; });
          const c = spots()[b.to];
          if (who.length === 2) {
            // two together share the spot as a centred pair; the one in front goes further in
            const [p, q] = b.type === 'enter' ? who : [...who].sort((x, y) => x.x - y.x);
            const side = b.type === 'enter' ? (b.from === 'left' ? 1 : -1) : 1, k = b.type === 'enter' ? 0.25 : 0;
            dur = Math.max(moveTo(p, s, c + side * GAP / 2, b.slow), moveTo(q, s + k, c - side * GAP / 2, b.slow) + k);
          } else dur = goToSpot(who[0], s, c, b.slow);
          break;
        }
        case 'walkTo': {
          // they meet in the middle: the pair is centred on the stage spot between them
          const a = who[0], o = A[b.target];
          dur = pairUp(a, o, s, nearestSpot((a.x + o.x) / 2), GAP, b.slow);
          lookAtActor(a, o, s + Math.max(0.2, dur - 0.4), false);
          break;
        }
        case 'exit': who.forEach(a => { dur = Math.max(dur, moveTo(a, s, OFF[b.to], false)); }); break;
        case 'hop': who.forEach(a => { dur = Math.max(dur, hop(a, s, b.n)); }); break;
        case 'wave': {
          who.forEach(a => {
            if (holder === a.id) P.warnings.push(`Line ${b.line}: ${a.def.name} is holding the star, so they wave with the star in their paws.`);
            if (b.target) lookAtActor(a, A[b.target], s, false);
            set(a, 'armR', s, 2.35, 0.4); a.out.waves.push({ a: s + 0.4, b: s + 2.2 }); set(a, 'armR', s + 2.2, holder === a.id ? -1.2 : ARM_R, 0.4);
          });
          dur = 2.6; break;
        }
        case 'look': {
          who.forEach(a => {
            closeLook(a, s);
            const L = { up: [0.2, -1], down: [0, 0.8], left: [-1, 0], right: [1, 0], you: [0, 0], around: [0, 0] }[b.at];
            if (b.at === 'star' || b.at === 'heart') { a.open = { a: s, b: 1e9, target: b.at }; a.out.lookAt.push(a.open); }
            else if (b.at === 'around') { set(a, 'lookX', s, -1, 0.4); set(a, 'lookX', s + 0.6, 1, 0.6); set(a, 'lookX', s + 1.4, 0, 0.4); set(a, 'lookY', s, 0, 0.3); }
            else { set(a, 'lookX', s, L[0], 0.4); set(a, 'lookY', s, L[1], 0.4); }
            if (b.at === 'you') { set(a, 'facing', s, 0, 0.4); a.toYou = true; }
            if (b.at === 'up') { set(a, 'tilt', s, -0.1, 0.4); } else set(a, 'tilt', s, 0, 0.4);
          });
          dur = b.at === 'around' ? 1.9 : 0.9;
          break;
        }
        case 'lookAt': case 'turnTo': {
          const pairs = b.target === 'each other' ? [[who[0], who[1]], [who[1], who[0]]] : who.map(a => [a, A[b.target]]);
          pairs.forEach(([a, o]) => lookAtActor(a, o, s, b.type === 'turnTo'));
          dur = 0.9; break;
        }
        case 'hug': {
          // cheek to cheek: side by side, heads leaning together, a slight turn toward each other, both faces visible
          const [a, o] = b.target === 'each other' ? who : [who[0], A[b.target]];
          const c = (a.x + o.x) / 2;
          const d = pairUp(a, o, s, c, HUG, false);
          const p = s + Math.max(0, d - 0.35), dir = toward(a, o);
          [[a, dir], [o, -dir]].forEach(([q, d2]) => {
            const inner = d2 > 0 ? 'armR' : 'armL', outer = d2 > 0 ? 'armL' : 'armR', rest = holder === q.id ? -1.2 : ARM_R;
            closeLook(q, p);
            set(q, 'facing', p, d2 * 0.15, 0.3); set(q, 'lookX', p, d2 * 0.5, 0.3); set(q, 'lookY', p, 0, 0.3);
            set(q, 'tilt', p, d2 * 0.14, 0.35);
            set(q, inner, p, 1.75, 0.35); set(q, outer, p, 0.45, 0.35);
            set(q, inner, p + 2.3, rest, 0.4); set(q, outer, p + 2.3, rest, 0.4);
            set(q, 'facing', p + 2.5, 0, 0.45); set(q, 'lookX', p + 2.5, 0, 0.4); set(q, 'tilt', p + 2.4, 0, 0.4);
            q.out.exprs.push({ a: p + 0.1, b: p + 2.6, mood: 'joy' });
            q.toYou = false;
          });
          [0.35, 0.75, 1.15].forEach((o2, i) => { P.hearts.push({ t: p + o2, i, between: [a.id, o.id] }); sfx('pop', p + o2); });
          // then they step apart again, still centred where they hugged
          dur = (p - s) + 2.55 + pairUp(a, o, p + 2.55, c, GAP, false);
          break;
        }
        case 'tilt': who.forEach(a => { set(a, 'tilt', s, 0.22, 0.3); set(a, 'tilt', s + 0.9, 0, 0.3); }); dur = 1.25; break;
        case 'mood': who.forEach(a => a.out.moods.push({ t: s, mood: b.mood })); dur = 0.6; break;
        case 'blink': who.forEach(a => a.out.blinkExtra.push(s)); dur = 0.4; break;
        case 'paws': {
          who.forEach(a => {
            const v = b.up ? 2.7 : holder === a.id ? -1.2 : ARM_R;
            set(a, 'armL', s, v, 0.5); set(a, 'armR', s, v, 0.5);
            if (holder === a.id) P.star.push({ type: b.up ? 'raise' : 'lower', t0: s, t1: s + 0.6, who: a.id });
          });
          dur = 0.8; break;
        }
        case 'pickup': {
          const a = who[0];
          if (star.state !== 'ground') { errors.push(`Line ${b.line}: there is no star on the ground to pick up. Use "star falls" first.`); break; }
          const side = star.x >= a.x ? 1 : -1;
          const d = moveTo(a, s, star.x - side * 115, true);
          const p = s + Math.max(0, d - 0.3);
          set(a, 'facing', p, side * 0.85, 0.3);
          a.ch.crouch.push({ t: p, v: 0.86, dur: 0.4 }, { t: p + 0.9, v: 1, dur: 0.4 });
          set(a, 'armL', p, 0.7, 0.5); set(a, 'armR', p, 0.7, 0.5);
          set(a, 'lookX', p, side * 0.8, 0.3); set(a, 'lookY', p, 0.9, 0.3);
          P.star.push({ type: 'pickup', t0: p + 0.6, t1: p + 1.3, from: { x: star.x, y: star.y }, who: a.id });
          P.star.push({ type: 'held', t0: p + 1.3, who: a.id });
          set(a, 'armL', p + 1.0, -1.2, 0.4); set(a, 'armR', p + 1.0, -1.2, 0.4);
          set(a, 'facing', p + 1.3, 0, 0.4); set(a, 'lookX', p + 1.3, 0, 0.4); set(a, 'lookY', p + 1.3, 0.8, 0.4);
          sfx('rustle', p, { dur: 1.2, gain: 0.8 }); sfx('twinkle', p + 1.3, { midi: 93, gain: 0.1 });
          holder = a.id; star.state = 'held';
          dur = (p - s) + 2.0;
          break;
        }
        case 'star': {
          if (who.length && b.act === 'rises' && holder && holder !== who[0].id) { errors.push(`Line ${b.line}: ${who[0].def.name} isn't holding the star; ${title(holder)} is.`); break; }
          dur = starBeat(b, s);
          break;
        }
        case 'heartsUp': {
          [0.1, 0.4, 0.7].forEach((o, i) => { P.hearts.push({ t: s + o, i, who: focus }); sfx('pop', s + o); });
          dur = 1.6; break;
        }
        case 'heartDown': {
          const a = A[focus];
          const from = star.state === 'sky' ? { x: star.x, y: star.y } : { x: Math.min(1700, a.x + 420), y: 110 };
          P.heartDown.push({ t0: s, t1: s + 1.3, burst: s + 1.65, from, who: a.id });
          sfx('pop', s, { gain: 0.4 });
          if (holder !== a.id) { set(a, 'armL', s + 0.6, 1.9, 0.45); set(a, 'armR', s + 0.6, 1.9, 0.45); set(a, 'armL', s + 1.65, ARM_R, 0.3); set(a, 'armR', s + 1.65, ARM_R, 0.3); }
          a.out.exprs.push({ a: s + 1.4, b: s + 2.4, mood: 'joy' });
          closeLook(a, s); a.out.lookAt.push({ a: s, b: s + 1.6, target: 'heart' });
          sfx('sparkles', s + 1.65, { n: 6, seed: Math.round(s * 10) });
          dur = 2.1; break;
        }
        case 'sparkles': P.sparkles.push({ t: s, who: b.target || focus }); sfx('sparkleChime', s); dur = 0.8; break;
        case 'title': {
          const letters = [...b.text].map((_, i) => s + i * 0.22);
          P.titles.push({ text: b.text, letters, drop: 0.5, out0: s + 5.2, out1: s + 6.0 });
          letters.forEach((lt, i) => { if (b.text[i] !== ' ') sfx('chime', lt + 0.31, { midi: [84, 88, 91, 93, 96, 98, 100][i % 7], gain: 0.2 }); });
          dur = letters.length * 0.22 + 0.6;
          break;
        }
        case 'time':
          // a scene that opens somewhere new switches the sky while the page is white; otherwise it changes slowly
          if (b.snap && scene && scene.turn) setG('tau', scene.t0 + PT / 2, TIMES[b.value], 0.001); else setG('tau', s, TIMES[b.value], 4);
          dur = 0; break;
        case 'place': {
          if (b.value === here) { P.warnings.push(`Line ${b.line}: the story is already at the ${PLACES.PLACES[here].name}.`); break; }
          changes.push({ t0: s, t1: s + PT, from: here, to: b.value });
          sfx('pageTurn', s);
          here = b.value;
          dur = PT;
          break;
        }
        case 'camera': setG('zoom', s, b.zoom, 1.6); dur = 0; break;
        case 'scene': {
          // lines before the first scene make an opening scene named after the story
          if (!scenes.length && content) scenes.push({ name: meta.title, line: 0, t0: 0, opening: true });
          const t0 = content ? s : 0, i = beats.indexOf(b);
          let turn = false;
          for (let k = i + 1; k < beats.length && beats[k].head; k++) if (beats[k].type === 'place' && beats[k].value !== here) turn = true;
          scene = { name: b.name, line: b.line, t0, turn };
          scenes.push(scene);
          break;
        }
        case 'music': music.push({ t: b.head ? scene.t0 : s, mood: b.mood, line: b.line }); break;
      }
      if (b.type !== 'scene') content = true;
      prevStart = s;
      t = Math.max(t, s + dur);
    }

    function starBeat(b, s) {
      const act = b.act, f = A[focus], h = holder && A[holder];
      if (act === 'appears') {
        const p = skyFor(f.x);
        star = { state: 'sky', x: p.x, y: p.y, r: 20 };
        P.star.push({ type: 'appear', t0: s, t1: s + 0.8, at: p, r: 20 });
        G.bright.push({ t: s, v: 0.95, dur: 0.1 });
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
        // land on the side away from the other characters when possible
        let gx = f.x + 330 < 1760 ? f.x + 330 : f.x - 330;
        if (others(f).some(o => Math.abs(o.x - gx) < 180) && f.x - 330 > 160) gx = f.x - 330;
        const to = { x: gx, y: feetY(gx) - 26 };
        P.star.push({ type: 'fall', t0: s, t1: s + 2.0, from: { x: star.x, y: star.y }, to, r0: star.r, r1: 26 });
        P.star.push({ type: 'ground', t0: s + 2.0, at: to, r: 26 });
        G.bright.push({ t: s + 2.0, v: 0.5, dur: 0.6 });
        sfx('fallChime', s, { dur: 2.0 }); sfx('softLand', s + 2.0);
        sfx('sparkles', s + 2.12, { n: 5, seed: 3 }); sfx('sparkles', s + 2.5, { n: 4, seed: 9 });
        P.sparkles.push({ t: s + 2.0, at: to, small: true });
        star = { state: 'ground', x: to.x, y: to.y, r: 26 };
        return 2.4;
      }
      if (act === 'glows') {
        if (star.state === 'none') { errors.push(`Line ${b.line}: there is no star yet.`); return 0; }
        P.star.push({ type: 'flicker', t0: s, t1: s + 1.4 });
        G.bright.push({ t: s, v: 0.3, dur: 0.2 }, { t: s + 1.4, v: 1, dur: 2.2 });
        [0.3, 1.6, 2.6].forEach((o, i) => { sfx('twinkle', s + o, { midi: [93, 96, 100][i], gain: 0.11 }); P.sparkles.push({ t: s + o, onStar: true, small: true, who: focus }); });
        return 3.6;
      }
      if (act === 'rises') {
        if (star.state === 'none' || star.state === 'sky') { errors.push(`Line ${b.line}: the star must be on the ground or held to rise.`); return 0; }
        const a = h || f, to = skyFor(a.x);
        let s0 = s;
        if (star.state === 'held') {
          set(a, 'armL', s, 2.7, 0.5); set(a, 'armR', s, 2.7, 0.5);
          P.star.push({ type: 'raise', t0: s, t1: s + 0.9, who: a.id });
          s0 = s + 1.0;
          set(a, 'armL', s0 + 0.3, ARM_R, 0.7); set(a, 'armR', s0 + 0.3, ARM_R, 0.7);
          sfx('twinkle', s + 0.4, { midi: 91, gain: 0.1 });
        }
        P.star.push({ type: 'rise', t0: s0, t1: s0 + 4.2, from: star.state === 'held' ? 'overhead' : { x: star.x, y: star.y }, to, r0: 30, r1: 14, who: a.id });
        P.star.push({ type: 'sky', t0: s0 + 4.2, at: to, r: 14, arrive: true });
        G.bright.push({ t: s0, v: 1, dur: 0.5 });
        // everyone on stage watches it go
        cast.map(i => A[i]).filter(q => q === a || onStage(q)).forEach(q => { closeLook(q, s); q.out.lookAt.push({ a: s0, b: s0 + 5.6, target: 'star' }); });
        sfx('riseChime', s0, { dur: 4.2 }); sfx('sparkleTrail', s0, { t1: s0 + 4.2 }); sfx('windSwell', s0, { t1: s0 + 5 }); sfx('chime', s0 + 4.2, { midi: 96, gain: 0.15 });
        holder = null;
        star = { state: 'sky', x: to.x, y: to.y, r: 14 };
        return (s0 - s) + 4.6;
      }
      if (act === 'disappears') {
        if (star.state === 'none') return 0;
        if (star.state === 'held') { set(h, 'armL', s + 0.4, ARM_R, 0.5); set(h, 'armR', s + 0.4, ARM_R, 0.5); holder = null; }
        P.star.push({ type: 'vanish', t0: s, t1: s + 0.8 });
        sfx('sparkles', s, { n: 4, seed: 40 });
        star = { state: 'none' };
        return 1.0;
      }
      return 0;
    }

    const turned = {};
    talks.forEach(k => k.pairs.forEach(([q, dir]) => {
      const list = turned[q.id] || (turned[q.id] = []), last = list[list.length - 1];
      if (last && last.dir === dir && k.t0 - last.t1 < 1.6) last.t1 = k.t1; else list.push({ t0: k.t0, t1: k.t1, dir, q });
    }));
    // turn at the start of every line (so a walk ending mid-conversation doesn't leave them facing front)…
    talks.forEach(k => k.pairs.forEach(([q, dir]) => set(q, 'facing', k.t0, dir * 0.42, 0.3)));
    // …and relax only when the conversation pauses
    Object.values(turned).forEach(list => list.forEach(w => set(w.q, 'facing', w.t1 + 0.35, 0, 0.45)));
    cast.forEach(id => closeLook(A[id], t));
    const duration = Math.ceil((t + 1.8) * 30) / 30;
    // bubbles fade out before the next one pops in, so two bubbles are never on screen together
    P.bubbles.forEach((b, i) => { const n = P.bubbles[i + 1]; if (n) b.t1 = Math.min(b.t1, n.t0 - 0.1); b.t1 = Math.min(b.t1, duration - 0.3); });
    P.captions.forEach((c, i) => { const n = P.captions[i + 1]; if (n) c.t1 = Math.min(c.t1, n.t0 - 0.05); });
    // automatic life: blinks and ear twitches (each character on its own rhythm), birds
    const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
    cast.forEach((id, n) => {
      const o = A[id].out, seed = n * 1000;
      o.blinks = []; for (let b = 2.0 + n * 0.9, i = 0; b < duration - 0.5; b += 2.8 + hash(i++ + seed) * 1.8) o.blinks.push(b);
      o.blinks.push(...o.blinkExtra); o.blinks.sort((a, b) => a - b);
      o.twitches = []; for (let w = 3.0 + n * 1.3, i = 0; w < duration - 1; w += 5 + hash(i + 50 + seed) * 3, i++) o.twitches.push(w);
      const init = { facing: o.firstFacing, lookX: 0, lookY: 0, tilt: 0, armL: ARM_R, armR: ARM_R, crouch: 1 };
      o.keys = {};
      for (const k in A[id].ch) o.keys[k] = keysFrom(init[k], A[id].ch[k]);
    });
    const tau0 = TIMES[meta.time];
    const gInit = { tau: tau0, zoom: 1, bright: 0.9 }, keys = {};
    for (const k in G) keys[k] = keysFrom(gInit[k], G[k]);
    if (!changes.length && place.id === 'meadow') {
      // the meadow all story long: the breeze and birds, exactly as always
      sfx('breeze', 0, { t1: duration });
      if (tau0 <= 1) [1.6, 3.3, 5.4].forEach(c => { if (c < duration - 2) sfx('chirp', c); });
    } else {
      // each place has its own ambient sound; on a change of place the two cross-fade over the transition
      const segs = [{ id: place.id, t0: 0 }, ...changes.map(c => ({ id: c.to, t0: c.t0 }))];
      segs.forEach((g, k) => {
        const next = segs[k + 1], t0 = g.t0, t1 = next ? next.t0 + PT : duration;
        sfx('ambience', t0, { kind: g.id, t1, fi: k ? PT : 1.5, fo: next ? PT : 1.5 });
        // birds sing in the meadow and the forest in the day and at sunset
        if (g.id !== 'meadow' && g.id !== 'forest') return;
        const calls = g.id === 'forest' ? [] : [1.6, 3.3, 5.4];
        if (g.id === 'forest') for (let c = 1.4, i = 0; c < t1 - t0 - 1; c += 3.2 + hash(i++ + 77) * 2.6) calls.push(c);
        calls.forEach(c => { const at = t0 + c + (k ? PT : 0); if (at < (next ? next.t0 : duration - 2) && evalKeys(keys.tau, at) <= 1.3) sfx('chirp', at); });
      });
      if (changes.length) {
        P.places = changes;
        // speech bubbles close as the page turns (their lines have always finished by then)
        P.bubbles.forEach(b => changes.forEach(c => { if (b.t0 < c.t0 && b.t1 > c.t0) b.t1 = Math.min(b.t1, c.t0 + 0.3); }));
      }
    }
    P.sfx.sort((a, b) => a.t - b.t);
    // scenes run until the next one starts; a story without "scene:" lines is one scene
    if (!scenes.length) scenes.push({ name: meta.title, line: 0, t0: 0, implicit: true });
    scenes.forEach((c, i) => { c.t1 = i + 1 < scenes.length ? scenes[i + 1].t0 : duration; delete c.turn; });
    // music changes ([] means the classic music all story long)
    if (music.length) P.music = music;

    return {
      version: 2, duration, fps: 30, width: 1920, height: 1080, scale: KS, errors, cast, ...P, keys, scenes,
      musicFadeIn: 1.0, musicFadeOut: [Math.max(1, duration - 3), duration], pictureFadeOut: [duration - 0.65, duration],
    };
  }
  function estimate(text) { return 0.45 + text.split(/\s+/).length * 0.36; }

  const api = { parseStory, compileStory, evalKeys, feetY, HELP, POS, CHARACTERS, MOODS, MUSIC };
  if (typeof module !== 'undefined') module.exports = api; else root.StudioStory = api;
})(this);
