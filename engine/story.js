// Story parser + compiler.
// parseStory(text)            -> { meta, beats, errors }
// compileStory(parsed, lens)  -> plan (everything the renderer and the audio engine need)
// `lens` maps speech index -> voice clip length in seconds (estimated when unknown).
// Characters come from the registry in characters.js; every line works for any of them.
(function (root) {
  const { CHARACTERS, MOODS, FALLBACK } = typeof module !== 'undefined' ? require('./characters.js') : root.StudioCharacters;
  const PLACES = typeof module !== 'undefined' ? require('./places/index.js') : root.StudioPlaces;
  const ASSETS = typeof module !== 'undefined' ? require('./assets.js') : root.StudioAssets;
  // picture assets (PNG files in assets/): read once in Node; the plan carries them to the page
  const PICTURES = { descs: [], warnings: [] };
  if (typeof module !== 'undefined') {
    const pics = require('./pictures.js');
    Object.assign(PICTURES, pics.scan(require('path').join(__dirname, '..')));
    PICTURES.warnings.push(...pics.register(PICTURES.descs));
  }
  // Everyone who can act: the characters, plus the extras (simple animals) a story uses, set by parseStory.
  // NAMES are written as in a story ("baby owl"); ALIAS turns them into ids ("baby-owl").
  const BASE = Object.keys(CHARACTERS);
  let NAMES = BASE, NAME = BASE.join('|'), ALIAS = {}, EXTRAS = {};
  const toId = n => ALIAS[String(n).toLowerCase()] || String(n).toLowerCase();
  const charDef = id => CHARACTERS[id] || EXTRAS[id];
  const POS = { left: 560, center: 960, right: 1360 };
  const OFF = { left: -280, right: 2200 };
  const TIMES = { day: 0, sunset: 1, dusk: 2, night: 3 };
  const MUSIC = ['happy', 'calm', 'magical', 'mystery', 'adventure', 'tense', 'sad', 'bedtime', 'epic', 'heartfelt', 'none'];
  // ways of talking, written with a mood or alone: "ren (shouts, excited): …", "yuki (thinks silently): …"
  const STYLES = { thinks: 'think', think: 'think', 'thinks silently': 'think', whispers: 'whisper', whisper: 'whisper', shouts: 'shout', shout: 'shout' };
  const KS = 1.15;              // character scale (fixed)
  const GAP = 280;              // closest two characters may stand (centre to centre)
  const HUG = 230;              // cheek to cheek
  const MINX = 300, MAXX = 1620;
  const feetY = x => 905 - 38 * Math.exp(-(((x - 960) / 240) ** 2));   // the meadow's ground (each place has its own)
  const title = id => charDef(id).name;

  const HELP = [
    'narrator: <text>', '<name>: <text>', `<name> (${MOODS.slice(1).join('|')}): <text>`,
    '<name> (thinks|thinks silently|whispers|shouts): <text>', '<name> (shouts, <mood>): <text>', 'mood voices: on|off',
    '<name> enters [from left|right] [to left|center|right]', '<name> walks to left|center|right', '<name> walks to <other name>',
    '<name> exits [to] left|right', '<name> walks down the path', '<name> comes up the path [to left|center|right]', '<name> hops [twice]', '<name> waves', '<name> looks up|down|left|right|around|at you|at the star|at the heart',
    '<name> looks at <other name>', '<name> turns to you', '<name> turns to <other name>', '<name> turns away', '<name> tilts its head',
    '<name> sits down', '<name> stands up', '<name> crouches', '<name> leans closer [to <other name>]', '<name> leans back', '<name> wobbles',
    '<name> counts on its paws', '<name> writes in the air', '<name> holds out its paw [to <other name>]', '<name> touches paws with <other name>',
    '<name> stretches its paws wide', '<name> nods', '<name> shakes its head', '<name> points at <other name>|you|the star|<prop>', '<name> points up|left|right',
    `<name> feels ${MOODS.join('|')}`, '<name> hugs <other name>', '<name> picks up the star', '<name> lets go of the star',
    '<name> raises its paws', '<name> lowers its paws', '<name> blinks', '<name> and <name> hop | wave | look at each other | feel <mood>',
    '<name> runs to left|center|right|<other name>', '<name> runs off to the left|right', '<name> sneaks to left|center|right', '<name> crawls to left|center|right',
    '<name> jumps', '<name> jumps in fright', '<name> trips', '<name> falls down', '<name> gets up', '<name> lies down', '<name> faints', '<name> wakes up',
    '<name> hides behind <other name>', '<name> peeks out', '<name> shrugs', '<name> covers its eyes', '<name> stretches', '<name> yawns', '<name> sighs', '<name> dances',
    '<name> finds the <prop>', '<name> picks up the <prop>', '<name> holds the <prop>', '<name> holds up the <prop>',
    '<name> carries the <prop> [to left|center|right|<other name>|the <prop>]', '<name> puts down the <prop>', '<name> drops the <prop>',
    '<name> gives the <prop> to <other name>', '<name> opens the <prop>', '<name> closes the <prop>',
    'star appears', 'star falls', 'star glows', 'star twinkles', 'star rises', 'star disappears',
    'hearts float up', 'heart floats down', 'sparkles [around <name>]', 'title card: <WORD>',
    `place: ${PLACES.names().join('|')}`, 'time: day|sunset|dusk|night', 'moon: full|crescent', 'camera: wide|close|closer', 'wait <seconds>',
    'scene: <name>', `music: ${MUSIC.join('|')}`, 'music: deep tense|deep sad', 'thumbnail: auto|<seconds>|scene <number>', 'thumbnail shot: wide|medium|close', 'thumbnail text: <text>',
    'format: wide|vertical', 'type: short|episode short', 'captions: narrator|all|off', 'loop: on', 'sting', 'hook: <text>', 'framing: close|medium|wide',
    'from: <story>', 'scenes: <number>|<number>-<number>', 'lines: <number>-<number>', 'ending: <text> (the end card of a Short)', 'intro: series|none|after scene <number>', 'ending: end screen|none', 'ending text: <text>',
    'shot: wide|medium|close|extreme close [on <name>|both|the star]', 'shot: over the shoulder of <name>',
    'camera: push in|pull out|pan to <name|the star|left|center|right>|follow <name>|shake|hold',
    'editing: auto', 'beat', 'slow motion <seconds>', 'reveal: the star|<name>|<place>',
    '<prop> appears [at left|center|right | on the ground | in the sky | next to <name>]', '<prop> disappears',
    'the <prop> glows | stops glowing | opens | closes | overflows', '<name> walks to the <prop>', '<name> looks at the <prop>',
    '<extra> enters | exits | flies in | flies away | lands | takes off | swims by | hops', '<extra>: <text>',
    `Characters: ${BASE.join(', ')}`,
  ];

  // ---------------- parser ----------------
  const spot = s => s.replace('centre', 'center');
  // One character's action words -> a beat ({ type, ... }), or null when the words aren't known.
  // Verbs take an optional "s" so "ren and yuki hop" and "yuki hops" both work.
  function action(a, group) {
    let k;
    // running and sneaking are going somewhere at another pace: "runs to ...", "sneaks to ..." (also "tiptoes",
    // "creeps"); the pace rides on the move's "slow" field ('run' or 'sneak'), so every kind of move can have it
    const gait = /^runs?\b/.test(a) ? 'run' : /^(?:sneaks?|tiptoes?|creeps?)\b/.test(a) ? 'sneak' : /^crawls?\b/.test(a) ? 'crawl' : null;
    if (gait === 'run' && (k = a.match(/^runs? (?:off|away)(?: to)?(?: the)? (left|right)$/))) return { type: 'exit', to: k[1], slow: 'run' };
    if (gait && / to /.test(a)) {
      const b = action(a.replace(/^\w+/, 'walks').replace(/ slowly$/, ''), group);
      if (b && 'slow' in b) b.slow = gait;
      return b;
    }
    if ((k = a.match(/^enters?(?: from (left|right))?(?: to (?:the )?(left|center|centre|right))?$/))) return { type: 'enter', from: k[1] || 'left', to: spot(k[2] || 'center') };
    if ((k = a.match(/^(?:walks?|moves?|goes|go|hops?|runs?) to (?:the )?(left|center|centre|right)( slowly)?$/))) return { type: 'walk', to: spot(k[1]), slow: !!k[2] };
    if ((k = a.match(new RegExp(`^(?:walks?|moves?|goes|go|hops?|runs?) (?:over )?to (${NAME})( slowly)?$`)))) return { type: 'walkTo', target: k[1], slow: !!k[2] };
    if ((k = a.match(/^(?:exits?|leaves?)(?: to)?(?: the)? (left|right)$/))) return { type: 'exit', to: k[1] };
    // a journey along a place's path, into the picture: away from us into the distance, or toward us from far away
    if (/^(?:walks?|hops?|goes|go|runs?|sets? off) (?:away )?(?:down|along) the (?:path|road|trail)(?: into the distance)?$|^(?:walks?|hops?|goes|go) (?:away )?into the distance$/.test(a)) return { type: 'journey', dir: 'away', run: gait === 'run' };
    if ((k = a.match(/^comes? (?:up|down|along) the (?:path|road|trail)(?: to (?:the )?(left|center|centre|right))?$/))) return { type: 'journey', dir: 'toward', to: spot(k[1] || 'center') };
    if ((k = a.match(/^hops?( twice)?$/))) return { type: 'hop', n: k[1] ? 2 : 1 };
    if (/^waves?( goodbye| hello)?$/.test(a)) return { type: 'wave' };
    if ((k = a.match(new RegExp(`^waves? (?:to|at) (${NAME})$`)))) return { type: 'wave', target: k[1] };
    if ((k = a.match(/^looks? (up|down|left|right|around|at you|at the viewer|at the camera|at (?:the )?star|at (?:the )?heart)$/))) {
      return { type: 'look', at: k[1].replace(/^at (the )?/, '').replace(/^(viewer|camera)$/, 'you') };
    }
    if ((k = a.match(new RegExp(`^looks? at (${NAME})$`)))) return { type: 'lookAt', target: k[1] };
    if (group && /^(?:look|turn)s? (?:at|to) each other$/.test(a)) return { type: /^turn/.test(a) ? 'turnTo' : 'lookAt', target: 'each other' };
    if (/^turns? to (you|the viewer|the camera)$/.test(a)) return { type: 'look', at: 'you' };
    if (/^turns? (away|around|its back|his back|her back)$/.test(a)) return { type: 'away' };
    // the movement library (F3)
    if (/^(?:jumps?(?: up| high)?|leaps?)$/.test(a)) return { type: 'jump' };
    if (/^(?:jumps? (?:in|with|from) (?:fright|surprise|shock)|(?:is )?startled|gets? a fright)$/.test(a)) return { type: 'fright' };
    if (/^(?:trips?(?: over)?|stumbles?)$/.test(a)) return { type: 'trip' };
    if (/^(?:falls?(?: down| over)?|tumbles?(?: down| over)?)$/.test(a)) return { type: 'fall' };
    if (/^gets? (?:back )?up$/.test(a)) return { type: 'stand' };
    if (/^(?:lies|lie|lays?|lying) down$/.test(a)) return { type: 'lie' };
    if (/^(?:faints?|passes out|pass out|collapses?)$/.test(a)) return { type: 'faint' };
    if (/^wakes? up$/.test(a)) return { type: 'wake' };
    if ((k = a.match(new RegExp(`^hides? behind (${NAME})$`)))) return { type: 'hide', target: k[1] };
    if (/^peeks? out$/.test(a)) return { type: 'peek' };
    if (/^shrugs?$/.test(a)) return { type: 'shrug' };
    if (/^covers? (?:its |his |her |their )?eyes$/.test(a)) return { type: 'coverEyes' };
    if (/^stretch(?:es)?(?: out)?$/.test(a)) return { type: 'stretch' };
    if (/^yawns?$/.test(a)) return { type: 'yawn' };
    if (/^sighs?$/.test(a)) return { type: 'sigh' };
    if (/^(?:dances?|does a (?:little |happy )?dance)$/.test(a)) return { type: 'dance' };
    if (/^sits?( down)?$/.test(a)) return { type: 'sit' };
    if (/^stands?( up)?$/.test(a)) return { type: 'stand' };
    if (/^crouch(es)?( down)?$/.test(a)) return { type: 'crouch' };
    if ((k = a.match(new RegExp(`^leans? (closer|in|forward)(?: to (${NAME}))?$`)))) return { type: 'lean', back: false, target: k[2] };
    if (/^leans? back$/.test(a)) return { type: 'lean', back: true };
    if (/^wobbles?$/.test(a)) return { type: 'wobble' };
    if (/^counts? on (its |his |her |their )?paws$/.test(a)) return { type: 'count' };
    if (/^writes? (something )?in the air$/.test(a)) return { type: 'write' };
    if ((k = a.match(new RegExp(`^holds? out (?:its |his |her |their )?paws?(?: to (${NAME}))?$`)))) return { type: 'holdOut', target: k[1] };
    if ((k = a.match(new RegExp(`^touch(?:es)? paws with (${NAME})$`)))) return { type: 'touch', target: k[1] };
    if (group && /^touch paws( with each other)?$/.test(a)) return { type: 'touch', target: 'each other' };
    if (/^stretch(es)? (its |his |her |their )?paws (wide|out)$/.test(a)) return { type: 'wide' };
    if (/^nods?( yes)?$/.test(a)) return { type: 'nod' };
    if (/^shakes? (its |his |her |their )?head( no)?$/.test(a)) return { type: 'headShake' };
    if ((k = a.match(/^points? (up|left|right)$/))) return { type: 'point', at: k[1] };
    if (/^points? (?:at|to) (you|the viewer|the camera)$/.test(a)) return { type: 'point', at: 'you' };
    if (/^points? (?:at|to) (?:the )?star$/.test(a)) return { type: 'point', at: 'star' };
    if ((k = a.match(/^points? (?:at|to) (?:the |a |an )?(.+)$/))) return { type: 'point', thing: ASSETS.norm(k[1]) };
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
    // extras that fly, float or swim
    if ((k = a.match(/^(?:flies|fly|floats?) in(?: from (left|right))?(?: to (?:the )?(left|center|centre|right))?$/))) return { type: 'enter', from: k[1] || 'left', to: spot(k[2] || 'center'), how: 'fly' };
    if ((k = a.match(/^(?:flies|fly|floats?) (?:away|off)(?: to(?: the)? (left|right))?$/))) return { type: 'exit', to: k[1] || 'right', how: 'fly' };
    // a flying extra settles on the ground (wings folded) and takes off again
    if (/^(?:lands?|settles?)(?: down| on the ground)?$/.test(a)) return { type: 'land', down: true };
    if (/^(?:takes? off|flies up)$/.test(a)) return { type: 'land', down: false };
    if ((k = a.match(/^swims? (?:by|past)(?: from(?: the)? (left|right))?$/))) return { type: 'pass', from: k[1] || 'left', how: 'swim' };
    // props in paws (asset kit, Part D): find, pick up, hold up, carry, put down, drop, give, open and close a prop
    {
      const TH = '(?:the |a |an |its |his |her |their )?(.+?)', hold = (act, th, more = {}) => (/^(?:eyes?|mouth|paws?|ears?|tail|head)$/.test(ASSETS.norm(th)) ? null : { type: 'hold', act, thing: ASSETS.norm(th), ...more });
      if ((k = a.match(new RegExp(`^finds? ${TH}$`)))) return hold('find', k[1]);
      if ((k = a.match(new RegExp(`^picks? up ${TH}$`)) || a.match(new RegExp(`^picks? ${TH} up$`)))) return hold('pick', k[1]);
      if ((k = a.match(new RegExp(`^holds? up ${TH}$`)) || a.match(new RegExp(`^holds? ${TH} up$`)))) return hold('up', k[1]);
      if ((k = a.match(new RegExp(`^holds? ${TH}$`)))) return hold('hold', k[1]);
      if ((k = a.match(new RegExp(`^carr(?:y|ies) ${TH} to (?:the |a |an )?(.+)$`)))) return hold('carry', k[1], { to: ASSETS.norm(k[2]) });
      if ((k = a.match(new RegExp(`^carr(?:y|ies) ${TH}$`)))) return hold('pick', k[1]);
      if ((k = a.match(new RegExp(`^puts? down ${TH}$`)) || a.match(new RegExp(`^puts? ${TH} down$`)))) return hold('put', k[1]);
      if ((k = a.match(new RegExp(`^drops? ${TH}$`)))) return hold('drop', k[1]);
      if ((k = a.match(new RegExp(`^gives? ${TH} to (${NAME})$`)))) return hold('give', k[1], { target: k[2] });
      if ((k = a.match(new RegExp(`^(opens?|closes?) ${TH}$`)))) return hold(/^open/.test(k[1]) ? 'open' : 'close', k[2]);
    }
    // things (props and set pieces): "walks to the lantern", "looks at the cottage", "waves at the owl"
    if ((k = a.match(/^(?:walks?|moves?|goes|go|hops?|runs?) (?:over )?to (?:the |a |an )?(.+?)( slowly)?$/))) return { type: 'walkToThing', thing: ASSETS.norm(k[1]), slow: !!k[2] };
    if ((k = a.match(/^looks? at (?:the |a |an )?(.+)$/))) return { type: 'lookAtThing', thing: ASSETS.norm(k[1]) };
    if ((k = a.match(/^waves? (?:to|at) (?:the |a |an )?(.+)$/))) return { type: 'wave', thing: ASSETS.norm(k[1]) };
    return null;
  }

  // Extras: names in the story that enter, fly, swim, hop or talk but aren't characters. Known extras come from
  // the asset registry; unknown ones are missing extras, shown as placeholders. Typos of known names are errors.
  const KEYS = /^(title|title card|place|time|moon|camera|shot|scene|music|editing|reveal|narrator|wait|pause|weather|light|format|type|thumbnail|thumbnail text|thumbnail shot|intro|ending|ending text|type|captions|loop|from|scenes|lines|hook|framing|sting|mood voices)$/;
  function findExtras(lines, errors) {
    const found = {};
    lines.forEach((raw, i) => {
      const line = raw.trim().replace(/^\+\s*/, '');
      if (!line || line.startsWith('#')) return;
      const act = line.match(/^(?:the |a |an )?([a-z][a-z' ]{0,30}?)\s+(enters?|exits?|leaves?|flies|fly|floats?|swims?|hops?|lands?|takes? off)\b/i);
      const talk = line.match(/^([a-z][a-z' ]{0,30}?)\s*(?:\(\s*[a-z ,]+\s*\))?\s*:\s*\S/i);
      const n = ASSETS.norm((act || talk || [])[1] || '');
      if (!n || n.split(' ').length > 3 || KEYS.test(n) || / and /.test(` ${n} `) || CHARACTERS[n] || /^(star|stars|heart|hearts|sparkles?)$/.test(n)) return;
      if (ASSETS.find(n, 'prop') || ASSETS.find(n, 'place')) return;
      const known = ASSETS.find(n, 'extra');
      if (!known && !found[n]) {
        const s = ASSETS.suggest(n, [...BASE, ...ASSETS.all('extra').flatMap(a => a.names)]);
        if (s) { errors.push(`Line ${i + 1}: I don't know "${n}". Did you mean "${s}"?\n    "${raw.trim()}"`); found['#' + (i + 1)] = true; return; }
      }
      const e = found[n] || (found[n] = { id: known ? known.id : n.replace(/\s+/g, '-'), name: n, asset: known, moves: null, lines: [] });
      if (act && !e.moves) e.moves = /^(flies|fly|lands?|takes? off)$/i.test(act[2]) ? 'fly' : /^float/i.test(act[2]) ? 'float' : /^swim/i.test(act[2]) ? 'swim' : /^hop/i.test(act[2]) ? 'hop' : null;
    });
    return found;
  }

  function parseStory(text) {
    const meta = { title: 'Untitled story', place: 'meadow', time: 'sunset' };
    const beats = [], errors = [];
    const lines = text.replace(/\r/g, '').split('\n');
    // the extras this story uses become names that can act, like the characters
    const found = findExtras(lines, errors), extras = {};
    // lines already reported as typos are not read again
    const typo = new Set(Object.keys(found).filter(k => k[0] === '#').map(k => +k.slice(1)));
    Object.keys(found).forEach(k => { if (k[0] === '#') delete found[k]; });
    ALIAS = {}; EXTRAS = {};
    Object.values(found).forEach(e => {
      ALIAS[e.name] = e.id;
      const desc = e.asset ? { moves: e.asset.moves, height: e.asset.height } : { missing: true, moves: e.moves || 'walk', label: e.name.replace(/^./, c => c.toUpperCase()) };
      EXTRAS[e.id] = ASSETS.extraCharacter(e.id, e.asset ? { ...e.asset, label: e.asset.label } : desc);
      extras[e.id] = { name: e.name, missing: !e.asset, ...desc };
    });
    NAMES = [...BASE, ...Object.keys(found)].sort((a, b) => b.length - a.length);
    NAME = NAMES.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    // Missing things: not errors any more, but a list of what this story still needs (shown as placeholders).
    const missing = {};
    const miss = (kind, name, lineNo, src, need, extra = {}) => {
      const k = `${kind}:${name}`, e = missing[k] || (missing[k] = { kind, name, lines: [], text: [], needs: [], places: [], times: [], ...extra });
      if (lineNo && !e.lines.includes(lineNo)) { e.lines.push(lineNo); e.text.push(src); }
      if (need && !e.needs.includes(need)) e.needs.push(need);
      return k;
    };
    Object.values(found).filter(e => !e.asset).forEach(e => miss('extra', e.name, 0, '', null, { id: e.id, moves: e.moves || 'walk' }));
    let started = false;
    lines.forEach((raw, i) => {
      const lineNo = i + 1;
      let line = raw.trim();
      if (!line || line.startsWith('#') || typo.has(lineNo)) return;
      let together = false;
      if (line.startsWith('+')) { together = true; line = line.slice(1).trim(); }
      const err = msg => errors.push(`Line ${lineNo}: ${msg}\n    "${raw.trim()}"`);
      const beat = (type, o = {}) => {
        // names as written ("baby owl") become ids ("baby-owl")
        ['who', 'target', 'of', 'on'].forEach(f => { if (o[f] && o[f] !== 'narrator') o[f] = Array.isArray(o[f]) ? o[f].map(toId) : toId(o[f]); });
        beats.push({ type, line: lineNo, together, src: raw.trim(), ...o }); started = true;
      };
      const needs = (kind, name, need, extra) => miss(kind, name, lineNo, raw.trim(), need, extra);
      // a place: one we have, a typo of one we have, or a new (missing) one shown as a placeholder
      const placeOf = val => {
        const p = PLACES.find(val);
        if (p) return p;
        const s = ASSETS.suggest(val, PLACES.names());
        if (s) { err(`I don't know the place "${val}". Did you mean "${s}"?`); return null; }
        const ph = PLACES.placeholder(ASSETS.norm(val));
        needs('place', ph.name, 'place');
        return ph;
      };
      let m;

      // YouTube: the series intro and the end screen (anywhere in the story; they take no time where they are written)
      // Shorts (F7 Part B)
      if ((m = line.match(/^type\s*:\s*(.+)$/i))) {
        const v = m[1].trim().toLowerCase().replace(/\s+/g, ' ');
        if (v !== 'short' && v !== 'episode short' && v !== 'episode') return err(`Unknown type "${m[1].trim()}". Use: short, or episode short`);
        meta.type = v === 'episode' ? 'episode' : v;
        return;
      }
      if ((m = line.match(/^captions\s*:\s*(.+)$/i))) {
        const v = m[1].trim().toLowerCase();
        if (!/^(narrator|all|off|on)$/.test(v)) return err(`Unknown captions "${m[1].trim()}". Use: narrator, all, or off`);
        meta.captions = v === 'on' ? 'narrator' : v;
        return;
      }
      if ((m = line.match(/^loop\s*:\s*(.+)$/i))) {
        const v = m[1].trim().toLowerCase();
        if (!/^(on|off|yes|no)$/.test(v)) return err(`Use "loop: on" or "loop: off"`);
        meta.loop = /^(on|yes)$/.test(v);
        return;
      }
      if ((m = line.match(/^hook\s*:\s*(.+)$/i))) {
        const v = m[1].trim();
        if (v.length > 80) return err('The hook must be 80 characters or fewer, so it can be read in a moment.');
        meta.hook = v;
        return;
      }
      if ((m = line.match(/^framing\s*:\s*(.+)$/i))) {
        const v = m[1].trim().toLowerCase();
        if (!/^(close|medium|wide)$/.test(v)) return err(`Unknown framing "${m[1].trim()}". Use: close, medium or wide`);
        meta.framing = v;
        return;
      }
      // an episode Short: which story, and which part of it
      if ((m = line.match(/^from\s*:\s*(.+)$/i))) { meta.from = m[1].trim(); return; }
      if ((m = line.match(/^scenes?\s*:\s*(\d+)\s*(?:-\s*(\d+))?\s*$/i))) { meta.window = { scenes: [+m[1], +(m[2] || m[1])], line: lineNo }; return; }
      if ((m = line.match(/^lines\s*:\s*(\d+)\s*-\s*(\d+)\s*$/i))) { meta.window = { lines: [+m[1], +m[2]], line: lineNo }; return; }
      if (/^sting$/i.test(line)) return beat('sting', {});
      // the picture: wide (16:9, the usual) or vertical (9:16, for Shorts)
      if ((m = line.match(/^format\s*:\s*(.+)$/i))) {
        const v = m[1].trim().toLowerCase();
        if (v !== 'vertical' && v !== 'wide') return err(`Unknown format "${m[1].trim()}". Use: wide, or vertical`);
        meta.format = v;
        return;
      }
      if ((m = line.match(/^intro\s*:\s*(.+)$/i))) {
        const v = m[1].trim().toLowerCase().replace(/\s+/g, ' ');
        let k;
        if (v === 'series') meta.intro = { at: 'start', line: lineNo };
        else if (v === 'none' || v === 'off') meta.intro = { at: 'none', line: lineNo };
        else if ((k = v.match(/^after scene (\d+)$/))) meta.intro = { at: 'after', scene: +k[1], line: lineNo };
        else return err(`Unknown intro "${m[1].trim()}". Use: series, none, or after scene 1`);
        return;
      }
      if ((m = line.match(/^ending\s+text\s*:\s*(.+)$/i))) {
        const v = m[1].trim();
        if (v.length > 160) return err('This line is too long (max 160 characters).');
        meta.endingText = { text: v, line: lineNo, src: raw.trim() };
        return;
      }
      if ((m = line.match(/^ending\s*:\s*(.+)$/i))) {
        const v = m[1].trim().toLowerCase().replace(/\s+/g, ' ');
        if (v === 'end screen' || v === 'none') meta.ending = v;
        else if (m[1].trim().length <= 60) meta.cardText = m[1].trim();   // a Short's end card
        else return err('An end card text must be 60 characters or fewer.');
        return;
      }
      // YouTube thumbnail: which moment, and its text (anywhere in the story; they take no time)
      if ((m = line.match(/^thumbnail\s+text\s*:\s*(.+)$/i))) {
        const v = m[1].trim();
        if (v.length > 60) return err('The thumbnail text must be 60 characters or fewer, so it stays big and readable.');
        meta.thumbnailText = v;
        return;
      }
      if ((m = line.match(/^thumbnail\s+shot\s*:\s*(.+)$/i))) {
        const v = m[1].trim().toLowerCase();
        if (!/^(wide|medium|close)$/.test(v)) return err(`Unknown thumbnail shot "${m[1].trim()}". Use: wide, medium or close`);
        meta.thumbnailShot = v;
        return;
      }
      if ((m = line.match(/^thumbnail\s*:\s*(.+)$/i))) {
        const v = m[1].trim().toLowerCase();
        let k;
        if (v === 'auto') meta.thumbnail = { auto: true };
        else if ((k = v.match(/^(\d+(?:\.\d+)?)\s*(?:s|sec|seconds)?$/))) meta.thumbnail = { t: +k[1] };
        else if ((k = v.match(/^scene\s+(\d+)$/))) meta.thumbnail = { scene: +k[1] };
        else return err(`Unknown thumbnail "${m[1].trim()}". Use: auto, a time in seconds like 12.5, or scene 3`);
        return;
      }
      if ((m = line.match(/^(title|place)\s*:\s*(.+)$/i))) {
        const key = m[1].toLowerCase(), val = m[2].trim();
        if (key === 'place') {
          const p = placeOf(val);
          if (!p) return;
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
      if ((m = line.match(/^music\s*:\s*(deep\s+)?(\w+)$/i))) {
        const v = m[2].toLowerCase(), deep = !!m[1];
        if (!MUSIC.includes(v)) return err(`Unknown music "${m[2]}". Use: ${MUSIC.join(', ')}`);
        // deeper, fuller and more dramatic (a low cello and soft drums), still never horror
        if (deep && !/^(tense|sad)$/.test(v)) return err(`"deep" works with tense and sad music: music: deep tense, or music: deep sad`);
        if (!started) { meta.music = v; if (deep) meta.musicDeep = true; } else beat('music', deep ? { mood: v, deep } : { mood: v });
        return;
      }
      if ((m = line.match(/^mood voices\s*:\s*(.+)$/i))) {
        const v = m[1].trim().toLowerCase();
        if (!/^(on|off)$/.test(v)) return err(`Use: mood voices: on, or mood voices: off`);
        meta.moodVoices = v === 'on';
        return;
      }
      if ((m = line.match(/^time\s*:\s*(\w+)$/i))) {
        const v = m[1].toLowerCase();
        if (!(v in TIMES)) return err(`Unknown time "${m[1]}". Use: day, sunset, dusk or night`);
        if (!started) meta.time = v; else beat('time', { value: v });
        return;
      }
      // the moon at night: a crescent (as always), or full
      if ((m = line.match(/^moon\s*:\s*(.+)$/i))) {
        const v = m[1].trim().toLowerCase().replace(/^(a |the )/, '').replace(/\s+moon$/, '');
        if (!/^(full|crescent)$/.test(v)) return err(`Use: moon: full, or moon: crescent`);
        if (!started) meta.moon = v; else beat('moon', { value: v });
        return;
      }
      // shots cut instantly, like an edit: "shot: close on yuki", "shot: over the shoulder of ren"
      if ((m = line.match(/^shot\s*:\s*(.+)$/i))) {
        const v = m[1].toLowerCase().replace(/[.!]+$/, '').replace(/\s+/g, ' ').replace(/close-?up/, 'close').replace(/^extreme-close/, 'extreme close');
        let k;
        if ((k = v.match(new RegExp(`^over (?:the )?shoulder (?:of )?(${NAME})$`))) || (k = v.match(new RegExp(`^over (${NAME})'s shoulder$`)))) return beat('shot', { size: 'ots', of: k[1] });
        if ((k = v.match(new RegExp(`^(wide|medium|close|extreme close)(?: on (${NAME}|both|everyone|(?:the )?star))?$`)))) {
          return beat('shot', { size: k[1], on: k[2] && k[2].replace(/^the /, '').replace('everyone', 'both') });
        }
        return err(`Unknown shot "${m[1]}". Use: wide, medium, close or extreme close (optionally "on ren", "on yuki", "on both", "on the star"), or "over the shoulder of ren".`);
      }
      // camera moves glide smoothly: push in, pull out, pan to …, follow …, shake, hold
      if ((m = line.match(/^camera\s*:\s*(.+\s.+|shake|hold)$/i))) {
        const v = m[1].toLowerCase().replace(/[.!]+$/, '').replace(/\s+/g, ' ');
        let k;
        if (/^(push|zoom) in$/.test(v)) return beat('cam', { move: 'push' });
        if (/^(pull|zoom) out$/.test(v)) return beat('cam', { move: 'pull' });
        if ((k = v.match(new RegExp(`^pan (?:over )?to (?:the )?(${NAME}|both|everyone|star|left|center|centre|right)$`)))) return beat('cam', { move: 'pan', on: spot(k[1]).replace('everyone', 'both') });
        if ((k = v.match(new RegExp(`^follows? (${NAME})$`)))) return beat('cam', { move: 'follow', on: k[1] });
        if (v === 'shake') return beat('cam', { move: 'shake' });
        if (v === 'hold' || v === 'hold still') return beat('cam', { move: 'hold' });
        return err(`Unknown camera move "${m[1]}". Use: push in, pull out, pan to <name|the star|left|center|right>, follow <name>, shake, hold, or wide, close, closer.`);
      }
      if ((m = line.match(/^camera\s*:\s*(\w+)$/i))) {
        const v = m[1].toLowerCase(), z = { wide: 1, normal: 1, close: 1.3, closer: 1.55 }[v];
        if (!z) return err(`Unknown camera "${m[1]}". Use: wide, close or closer`);
        return beat('camera', { zoom: z });
      }
      if ((m = line.match(new RegExp(`^(narrator|${NAME})\\s*(?:\\(\\s*([a-z ,]+?)\\s*\\))?\\s*:\\s*(.+)$`, 'i')))) {
        const who = m[1].toLowerCase(), say = m[3].trim();
        if (m[2] && who === 'narrator') return err('The narrator has no mood or way of talking. Remove the (…) part.');
        // the (…) part: a mood, a way of talking, or both ("shouts, excited")
        let mood = null, style = null, silent = false;
        for (const w of (m[2] || '').toLowerCase().split(',').map(x => x.trim().replace(/\s+/g, ' ')).filter(Boolean)) {
          if (STYLES[w]) { if (style) return err('A line can only have one way of talking (thinks, whispers or shouts).'); style = STYLES[w]; silent = w === 'thinks silently'; }
          else if (MOODS.includes(w)) { if (mood) return err('A line can only have one mood.'); mood = w; }
          else return err(`Unknown mood or way of talking "${w}". Moods: ${MOODS.join(', ')}. Ways of talking: thinks, thinks silently, whispers, shouts`);
        }
        if (say.length > 160) return err('This line is too long (max 160 characters). Split it into two lines.');
        if (EXTRAS[toId(who)]) { const e = Object.values(found).find(f => f.id === toId(who)); if (!e.asset) needs('extra', e.name, 'speaks'); }
        return beat('say', { who, mood, text: say, ...(style ? { style } : {}), ...(silent ? { silent } : {}) });
      }
      if ((m = line.match(/^(?:wait|pause)\s+([\d.]+)\s*(?:s|sec|seconds?)?$/i))) return beat('wait', { secs: Math.min(20, parseFloat(m[1])) });
      // a short pause for comic timing
      if (/^(a )?beat\.?$/i.test(line)) return beat('wait', { secs: 0.6 });
      if ((m = line.match(/^slow[- ]?motion\s+([\d.]+)\s*(?:s|sec|seconds?)?$/i))) {
        const secs = parseFloat(m[1]);
        if (!(secs >= 0.5 && secs <= 10)) return err('Slow motion needs a length from 0.5 to 10 seconds, like "slow motion 3".');
        return beat('slow', { secs });
      }
      // the camera chooses its own shots in conversations (manual shot: lines still win)
      if ((m = line.match(/^editing\s*:\s*(\w+)$/i))) {
        const v = m[1].toLowerCase();
        if (!/^(auto|manual|off)$/.test(v)) return err(`Unknown editing "${m[1]}". Use: auto (or manual).`);
        if (started) return err('"editing:" goes at the top of the story, before the first action or line.');
        meta.editing = v === 'auto' ? 'auto' : 'manual';
        return;
      }
      // a slow, magical camera move to show something (or somewhere) new
      if ((m = line.match(/^reveal\s*:\s*(.+)$/i))) {
        const v = m[1].trim().toLowerCase().replace(/[.!]+$/, '').replace(/^the /, '');
        if (v === 'star' || NAMES.includes(v)) return beat('reveal', { on: v });
        const p = placeOf(v);
        if (p) return beat('reveal', { place: p.id });
        return;
      }
      if ((m = line.match(/^title card\s*:\s*(.+)$/i))) {
        const word = m[1].trim().toUpperCase();
        if (word.length > 14) return err('Title card text must be 14 characters or fewer.');
        return beat('title', { text: word });
      }
      if ((m = line.match(new RegExp(`^sparkles?(?:\\s+around (${NAME}))?$`, 'i')))) return beat('sparkles', { target: m[1] && m[1].toLowerCase() });
      if (/^(a |the |little )*hearts? floats? up$/i.test(line)) return beat('heartsUp');
      if (/^(a |the |golden )*hearts? floats? down$/i.test(line)) return beat('heartDown');
      if ((m = line.match(/^(?:the |a |little )*star\s+(appears|falls|glows|twinkles|rises|disappears)$/i))) return beat('star', { act: m[1].toLowerCase() });
      // any prop or set piece: "lantern appears at left", "the chest opens", "the lantern glows"
      if ((m = line.match(/^(?:the |a |an )?([a-z][a-z' -]{0,30}?)\s+(appears?|disappears?|vanishes|glows|stops glowing|opens|closes|overflows)(?:\s+(.+?))?[.!]*$/i)) && !NAMES.includes(ASSETS.norm(m[1]))) {
        const name = ASSETS.norm(m[1]), verb = m[2].toLowerCase(), rest = (m[3] || '').toLowerCase();
        const act = /^appear/.test(verb) ? 'appear' : /^(disappear|vanish)/.test(verb) ? 'disappear' : verb === 'glows' ? 'glow' : verb === 'stops glowing' ? 'unglow' : verb === 'opens' ? 'open' : verb === 'overflows' ? 'overflow' : 'close';
        let where = null, k;
        if (act === 'appear') {
          if (!rest || rest === 'on the ground') where = { ground: true };
          else if ((k = rest.match(/^at (?:the )?(left|center|centre|right)$/))) where = { at: spot(k[1]) };
          else if (rest === 'in the sky') where = { sky: true };
          else if ((k = rest.match(new RegExp(`^next to (${NAME})$`)))) where = { next: toId(k[1]) };
          else return err(`Where should the ${name} appear? Use "at left", "at center", "at right", "on the ground", "in the sky" or "next to <name>".`);
        } else if (rest) return err(`I don't know "${m[2]} ${rest}". Write just "the ${name} ${verb}".`);
        const asset = ASSETS.find(name, 'prop');
        if (!asset) {
          const s = ASSETS.suggest(name, ASSETS.all('prop').flatMap(a => a.names));
          if (s) return err(`I don't know "${name}". Did you mean "${s}"?`);
          needs('prop', name, { appear: 'appears', disappear: 'disappears', glow: 'glows', unglow: 'glows', open: 'opens', close: 'closes', overflow: 'overflows' }[act], { size: ASSETS.guessSize(name) });
        } else if ((act === 'glow' || act === 'unglow') && !asset.glow) return err(`The ${name} can't glow.`);
        else if ((act === 'open' || act === 'close') && !asset.states.includes('open')) return err(`The ${name} can't open or close.`);
        else if (act === 'overflow' && !asset.states.includes('overflowing')) return err(`The ${name} can't overflow.`);
        return beat('prop', { name, asset: asset ? asset.id : null, act, where });
      }

      if ((m = line.match(new RegExp(`^(${NAME})(?:\\s+and\\s+(${NAME}))?\\s+(.+)$`, 'i')))) {
        const who = [m[1].toLowerCase(), m[2] && m[2].toLowerCase()].filter(Boolean);
        const names = who.map(w => title(toId(w))).join(' and ');
        if (who.length === 2 && who[0] === who[1]) return err(`${names}? Use two different characters.`);
        const a = m[3].toLowerCase().replace(/[.!]+$/, '').replace(/\s+/g, ' ');
        if (/each other/.test(a) && who.length < 2) return err('"each other" needs two characters, like "ren and yuki look at each other".');
        const b = action(a, who.length > 1);
        if (!b) return err(`I don't know how ${names} can "${a}".`);
        // a "thing" is another character or extra (then it's the usual action), or a prop or set piece
        if (b.type === 'hold') {
          const HELD = { pick: 'pick up', hold: 'hold', up: 'hold up', carry: 'carry', put: 'put down', drop: 'drop', give: 'give' };
          if (NAMES.includes(b.thing) || CHARACTERS[b.thing]) return err(`${names} can't ${HELD[b.act] || b.act} ${title(toId(b.thing))}. Only props can be ${b.act === 'find' ? 'found' : 'held'} like that.`);
          const asset = ASSETS.find(b.thing, 'prop');
          if (asset && HELD[b.act] && asset.size === 'big') return err(`The ${b.thing} is too big to ${HELD[b.act]}.`);
          if (asset && HELD[b.act] && asset.fixed) return err(`The ${b.thing} is fixed in place, so it can't be picked up or carried.`);
          if (asset && (b.act === 'open' || b.act === 'close') && !asset.states.includes('open')) return err(`The ${b.thing} can't open or close.`);
          if (b.act === 'carry' && b.to && !/^(left|center|centre|right)$/.test(b.to) && !NAMES.includes(b.to) && !ASSETS.find(b.to, 'prop')) return err(`I don't know where "${b.to}" is. Carry it to the left, center or right, to someone, or to a prop that's here.`);
          if (who.length > 1) return err(`Only one character can do this at a time. Write it for ${title(toId(who[0]))} or ${title(toId(who[1]))}.`);
          if (!asset) {
            const sg = ASSETS.suggest(b.thing, ASSETS.all('prop').flatMap(x => x.names));
            if (sg) return err(`I don't know "${b.thing}". Did you mean "${sg}"?`);
            needs('prop', b.thing, { find: 'is found', hold: 'is held', pick: 'is picked up', up: 'is held up', carry: 'is carried', put: 'is put down', drop: 'is dropped', give: 'is given', open: 'opens', close: 'closes' }[b.act], { size: 'small' });
          }
          b.asset = asset ? asset.id : null;
        } else if (b.thing) {
          if (NAMES.includes(b.thing)) { b.target = b.thing; b.type = { walkToThing: 'walkTo', lookAtThing: 'lookAt', wave: 'wave', point: 'point' }[b.type]; delete b.thing; }
          else {
            const asset = ASSETS.find(b.thing, 'prop');
            if (!asset) {
              const s = ASSETS.suggest(b.thing, [...ASSETS.all('prop').flatMap(x => x.names), ...NAMES]);
              if (s) return err(`I don't know "${b.thing}". Did you mean "${s}"?`);
              needs('prop', b.thing, { walkToThing: 'walks to', lookAtThing: 'looks at', wave: 'waves at', point: 'points at' }[b.type], { size: ASSETS.guessSize(b.thing) });
            }
          }
        }
        if (/^(enter|exit|pass)$/.test(b.type) && b.how && who.some(w => !EXTRAS[toId(w)])) return err(`Only an animal or creature can ${b.how} — ${names} can walk instead.`);
        if (b.target && b.target !== 'each other') {
          if (who.includes(b.target)) return err(`${title(toId(b.target))} can't do that to themself. Name someone else.`);
        }
        if (b.target === 'each other' && who.length !== 2) return err('"each other" needs two characters, like "ren and yuki look at each other".');
        if (who.length > 1 && /^(pickup|star|walkTo|walkToThing)$/.test(b.type)) return err(`Only one character can do this at a time. Write it for ${title(toId(who[0]))} or ${title(toId(who[1]))}.`);
        who.forEach(w => { const e = found[w]; if (e && !e.asset) needs('extra', e.name, b.type === 'enter' && b.how ? 'flies' : b.type === 'pass' ? 'swims' : b.type === 'mood' ? `feels ${b.mood}` : { enter: 'enters', exit: 'exits', hop: 'hops', walk: 'walks', lookAt: 'looks at' }[b.type] || b.type); });
        return beat(b.type, { ...b, who });
      }
      err('I don\'t understand this line.');
    });
    if (meta.endingText) {
      if (meta.ending === 'none') errors.push(`Line ${meta.endingText.line}: "ending text" is said in the end screen. Remove "ending: none", or this line.`);
      else { meta.ending = 'end screen'; beats.push({ type: 'say', line: meta.endingText.line, together: false, src: meta.endingText.src, who: 'narrator', text: meta.endingText.text, endScreen: true }); }
    }
    if (!beats.some(b => b.type === 'say') && meta.type !== 'episode short') errors.push('The story has no narrator or character lines.');
    if (meta.type === 'episode short' && (!meta.from || !meta.window)) errors.push('An episode Short needs "from: <story>" and "scenes: 2" (or "scenes: 2-3", or "lines: 40-60").');
    if (meta.cardText && !/short/.test(meta.type || '')) errors.push('"ending: <text>" makes the end card of a Short; this story isn\'t one (add "type: short"), or use "ending: end screen".');
    // scene heads: the place/time/music lines right after "scene:" all happen at the scene's start.
    // When the scene changes place, its new time of day is already set as the page turns.
    beats.forEach((b, i) => {
      if (b.type !== 'scene') return;
      const head = [];
      for (let k = i + 1; k < beats.length && /^(place|time|music)$/.test(beats[k].type); k++) head.push(beats[k]);
      const moves = head.some(h => h.type === 'place');
      head.forEach(h => { h.head = true; if (h.type === 'time' && moves) h.snap = true; });
    });
    errors.sort((a, b) => (parseInt(a.slice(5), 10) || 1e9) - (parseInt(b.slice(5), 10) || 1e9));
    return { meta, beats, errors, extras, missing: Object.values(missing) };
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
    // the extras in this story act like small characters
    Object.entries(parsed.extras || {}).forEach(([id, d]) => { EXTRAS[id] = ASSETS.extraCharacter(id, ASSETS.ASSETS[id] || d); });
    // stage spots and ground height come from the place
    // vertical (9:16): the stage is narrower, so the spots are closer together and characters come in from just
    // outside the picture (wide stories keep the usual values)
    // a Short (F7 Part B) is vertical unless it says "format: wide", and quicker: shorter pauses, faster walks
    const SHORT = /short/.test(meta.type || '');
    const VERT = meta.format === 'vertical' || SHORT && meta.format !== 'wide';
    const PACE = SHORT ? 0.6 : 1, STRIDE = SHORT ? 1.25 : 1;
    const CAPS = meta.captions || (SHORT ? 'narrator' : 'off');   // which spoken lines get big word-by-word captions
    const squeeze = p => (VERT ? { ...p, left: 960 + (p.left - 960) * 0.31, right: 960 + (p.right - 960) * 0.31 } : p);
    const OFF = VERT ? { left: 220, right: 1700 } : { left: -280, right: 2200 };
    const MINX = VERT ? 620 : 300, MAXX = VERT ? 1300 : 1620;
    const GAP = VERT ? 300 : 280;   // closest two characters may stand (in vertical with a small gap: they never overlap)
    const place = PLACES.PLACES[meta.place] || PLACES.find(meta.place) || PLACES.PLACES.meadow, POS = squeeze(place.pos);
    let here = place.id;                                   // the place right now, as the story goes along
    const PT = 1.2;                                        // a change of place: fade to white and back, switching halfway
    const changes = [];
    const feetY = x => PLACES.PLACES[here].ground(x), spots = () => squeeze(PLACES.PLACES[here].pos);
    const errors = [];
    const G = { tau: [], zoom: [], bright: [] };
    const setG = (k, t, v, dur = 0.4) => G[k].push({ t, v, dur });
    const P = {
      meta, actors: {}, voice: [], captions: [], bubbles: [], titles: [], hearts: [], heartDown: [], sparkles: [],
      star: [], twinkles: [], sfx: [], warnings: [],
    };
    const ARM_R = 0.16;
    const sfx = (type, at, o = {}) => P.sfx.push({ type, t: at, ...o });
    // an extra (a simple animal) has only the first eight moods: a newer one shows as the nearest of those
    const moodNote = (a, mood, line) => { if (a.def.extra && FALLBACK[mood] && !Object.keys(a.def.moods[mood] || {}).length) P.warnings.push(`Line ${line}: the ${a.def.name.toLowerCase()} has no "${mood}" face, so it looks ${FALLBACK[mood]}.`); };
    // props and set pieces on stage now (by name), and every one that ever appears
    P.props = [];
    let props = {};
    const heldBy = new Map();   // prop -> the id of whoever holds it
    // the missing list, with the places and times of day where each missing thing shows up
    const missing = (parsed.missing || []).map(e => ({ ...e, places: [], times: [] }));
    let nowTime = meta.time;
    const noteMissing = line => missing.forEach(e => {
      const pn = PLACES.PLACES[here].name;
      // a missing place is used at every time of day the story spends there
      if (e.kind === 'place' && e.name === pn) { if (!e.places.includes(pn)) e.places.push(pn); if (!e.times.includes(nowTime)) e.times.push(nowTime); return; }
      if (!e.lines.includes(line)) return;
      if (!e.places.includes(pn)) e.places.push(pn);
      if (!e.times.includes(nowTime)) e.times.push(nowTime);
    });

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
        id, def: charDef(id), x, open: null,
        ch: { facing: [], lookX: [], lookY: [], tilt: [], armL: [], armR: [], crouch: [] },
        out: { startX: x, firstFacing: enters ? (first.from === 'left' ? 0.85 : -0.85) : 0, walks: [], hops: [], moods: [], exprs: [], waves: [], lookAt: [], blinkExtra: [] },
      };
      P.actors[id] = A[id].out;
    });
    let focus = cast[0], holder = null;
    // props in paws: who holds what (a.holding = { p, how, h }); the arms' rest pose depends on it
    const HOLD_ARM = a => (a.def.moves === 'hop' ? 0.85 : 0.45);   // carrying something in the near paw
    const restR = a => (holder === a.id ? -1.2 : a.holding ? (a.holding.how === 'both' ? -1.2 : HOLD_ARM(a)) : ARM_R);
    const restL = a => (a.holding && a.holding.how === 'both' ? -1.2 : ARM_R);
    let star = { state: 'none', x: 0, y: 0, r: 20 };
    let t = 0.6, prevStart = 0.6;
    const voiceWins = [];
    // a channel only stories that use it have (joint poses "rig.<joint>", "sit", "nod"): created when first used
    const pose = (a, k, t, v, dur = 0.35) => { (a.ch[k] = a.ch[k] || []).push({ t, v, dur }); };
    const set = (a, k, t, v, dur = 0.4) => {
      // anything that turns a character (facing) also ends turning away
      if (k === 'facing' && a.away && t >= a.away) { a.ch.away.push({ t, v: 0, dur }); a.away = 0; }
      a.ch[k].push({ t, v, dur });
    };
    // which way a character faces now (+1 right, -1 left); facing the front, toward the middle of the stage
    const facingDir = a => { const f = a.ch.facing, v = f.length ? f[f.length - 1].v : 0; return Math.sign(v) || (a.x >= 960 ? -1 : 1); };
    const closeLook = (a, s) => { if (a.open) { a.open.b = s; a.open = null; } };
    // where something goes "in the sky": beside and above (vertical: above the group, inside the safe area)
    const skyFor = x => (VERT ? { x: Math.max(840, Math.min(1080, x)) + 40, y: 400 } : { x: Math.max(260, Math.min(1660, x + (x > 1300 ? -460 : 460))), y: 160 });
    const onStage = a => (VERT ? a.x > 420 && a.x < 1500 : a.x > 0 && a.x < 1920);
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
      c = roomFor([a, o], c, gap);
      const at = o.free > s ? o.free - 0.15 : s;
      const want = c - side * gap / 2, dO = moveTo(o, at, want, false) + (at - s);
      // if the other couldn't get there (say a prop was in the way), keep the full gap from where they really are
      const dA = moveTo(a, s, Math.abs(o.x - want) > 4 ? o.x + side * gap : c + side * gap / 2, slow);
      return Math.max(dA, dO, makeWay([a, o], s));
    }
    // the characters on stage that aren't in a group (one hiding behind someone is meant to be close)
    const thirds = group => cast.map(i => A[i]).filter(o => !group.includes(o) && onStage(o) && !o.hiding);
    // Where a group of two `gap` apart can stand, centred as near `c` as it can: at least GAP from everyone else
    // on stage, so nobody ends up on top of a third character. Only inside the stage; if there's no such room,
    // the nearest place on the stage (makeWay then moves the third one along).
    function roomFor(group, c, gap) {
      let lo = MINX + gap / 2, hi = MAXX - gap / 2;
      c = Math.max(lo, Math.min(hi, c));
      thirds(group).forEach(o => { if (o.x < c) lo = Math.max(lo, o.x + GAP + gap / 2); else hi = Math.min(hi, o.x - GAP - gap / 2); });
      return lo <= hi ? Math.max(lo, Math.min(hi, c)) : c;
    }
    // anyone else still too close to where the group ends up steps aside, away from it (after finishing any move
    // of their own). Returns how long it takes.
    function makeWay(group, s) {
      let dur = 0;
      thirds(group).forEach(o => {
        const near = group.reduce((p, q) => (Math.abs(q.x - o.x) < Math.abs(p.x - o.x) ? q : p));
        if (Math.abs(near.x - o.x) >= GAP) return;
        const xs = group.map(q => q.x), dir = Math.sign(o.x - (Math.min(...xs) + Math.max(...xs)) / 2) || 1;
        const x = Math.max(MINX, Math.min(MAXX, dir > 0 ? Math.max(...xs) + GAP : Math.min(...xs) - GAP));
        const at = o.free > s ? o.free - 0.15 : s;
        dur = Math.max(dur, moveTo(o, at, x, false) + (at - s));
      });
      return dur;
    }
    // going to a stage spot: alone it is the spot itself; next to someone they share it as a centred pair
    function goToSpot(a, s, x, slow) {
      const o = crowding(a, x);
      return o ? pairUp(a, o, s, x, GAP, slow) : moveTo(a, s, x, slow);
    }

    // walking (or hopping, for characters that hop) to x1
    // Nobody stops on top of a small prop (it would be hidden behind them): they stop beside it, on the side
    // they come from, about one body-width away. Big set pieces stand behind everyone, so they don't count.
    const BESIDE = 230;
    function clearOfProps(x, from, except) {
      if (x < 0 || x > 1920) return x;   // walking off stage
      for (const p of Object.values(props)) if (p !== except && p.size !== 'big' && !p.sky && !heldBy.has(p) && Math.abs(x - p.x) < BESIDE - 1) x = p.x + (Math.sign(from - p.x) || -1) * BESIDE;
      return x;
    }
    // slow: true for a careful walk, or the pace 'run' / 'sneak' (running: about twice as fast, leaning forward and
    // bouncing; sneaking: crouched low on tiptoe, slow, paws up in front, little hops for hoppers)
    function moveTo(a, s, x1, slow, except) {
      x1 = clearOfProps(x1, a.x, except);
      const dist = Math.abs(x1 - a.x);
      if (dist < 4) return 0;
      const dir = x1 > a.x ? 1 : -1, gait = slow === 'run' || slow === 'sneak' || slow === 'crawl' ? slow : null;
      if (a.hiding) { a.hiding.rec.b = s + 0.3; a.hiding = null; }   // moving away ends hiding behind someone
      if (gait) slow = false;
      let dur;
      set(a, 'facing', s, dir * 0.85, 0.25);
      if (a.def.moves === 'hop') {
        // small repeated hops, each with a light boing (running: bigger, quicker hops; sneaking: tiny careful ones)
        const n = Math.max(2, Math.round(dist / (gait === 'run' ? 130 : gait === 'sneak' || gait === 'crawl' ? 70 : 90)));
        const hd = (gait === 'run' ? 0.25 : gait === 'crawl' ? 0.6 : gait === 'sneak' ? 0.5 : slow ? 0.42 : 0.33) / (SHORT ? 1.15 : 1);
        dur = n * hd;
        a.out.walks.push({ t0: s + 0.15, t1: s + 0.15 + dur, x0: a.x, x1, hops: n, ...(gait ? { gait } : {}) });
        for (let k = 0; k < n; k++) sfx('hopUp', s + 0.15 + k * hd, { gain: gait === 'sneak' || gait === 'crawl' ? 0.25 : 0.55 });
      } else {
        const speed = a.def.speed * (gait === 'run' ? 2.1 : gait === 'sneak' ? 0.45 : gait === 'crawl' ? 0.32 : slow ? 0.6 : 1);
        dur = Math.max(gait === 'run' ? 0.6 : SHORT ? 0.9 : 1.2, dist / (speed * STRIDE));
        a.out.walks.push({ t0: s + 0.15, t1: s + 0.15 + dur, x0: a.x, x1, ...(gait ? { gait } : {}) });
        sfx('rustle', s + 0.15, { dur, gain: gait === 'run' ? 0.6 : gait === 'sneak' || gait === 'crawl' ? 0.2 : 0.45 });
      }
      if (gait === 'sneak') {
        // low and careful: crouched, leaning forward, paws up in front, eyes ahead; upright again at the end
        a.ch.crouch.push({ t: s, v: 0.88, dur: 0.3 }, { t: s + 0.15 + dur, v: 1, dur: 0.35 });
        pose(a, 'rig.spine', s, dir * 0.12, 0.3); pose(a, 'rig.spine', s + 0.15 + dur, 0, 0.35);
        set(a, 'armL', s, 0.75, 0.3); set(a, 'armR', s, 0.75, 0.3);
        set(a, 'armL', s + 0.15 + dur, restL(a), 0.35); set(a, 'armR', s + 0.15 + dur, restR(a), 0.35);
      }
      if (gait === 'crawl') {
        // down low, bent right over with the paws reaching forward and the head up, slowly; upright at the end
        a.ch.crouch.push({ t: s, v: 0.8, dur: 0.35 }, { t: s + 0.15 + dur, v: 1, dur: 0.4 });
        pose(a, 'rig.spine', s, dir * 0.36, 0.35); pose(a, 'rig.neck', s, -dir * 0.3, 0.35);
        pose(a, 'rig.spine', s + 0.15 + dur, 0, 0.4); pose(a, 'rig.neck', s + 0.15 + dur, 0, 0.4);
        set(a, 'armL', s, 0.55, 0.3); set(a, 'armR', s, 0.55, 0.3);
        const steps = Math.max(2, Math.round(dur / 0.45));
        for (let k = 1; k < steps; k++) { set(a, 'armL', s + 0.15 + k * dur / steps, k % 2 ? 0.8 : 0.45, 0.2); set(a, 'armR', s + 0.15 + k * dur / steps, k % 2 ? 0.45 : 0.8, 0.2); }
        set(a, 'armL', s + 0.15 + dur, restL(a), 0.4); set(a, 'armR', s + 0.15 + dur, restR(a), 0.4);
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
    const scenes = [], music = meta.music ? [{ t: 0, mood: meta.music, ...(meta.musicDeep ? { deep: true } : {}) }] : [];
    // shots and camera moves (a story without them keeps the classic automatic camera)
    const shotMode = beats.some(b => /^(shot|cam|reveal)$/.test(b.type)) || meta.editing === 'auto', shots = [];
    // what a shot or move looks at: { all } on-stage characters, { actors }, { star } or a stage spot { x }
    const aim = (on, line) => {
      if (!on || on === 'both') return { all: true };
      if (on === 'star') { if (star.state === 'none') errors.push(`Line ${line}: there is no star to look at. Use "star appears" first.`); return { star: true }; }
      if (/^(left|center|right)$/.test(on)) return { x: spots()[on] };
      if (!A[on]) { errors.push(`Line ${line}: ${title(on)} isn't in this story.`); return { all: true }; }
      if (!onStage(A[on])) P.warnings.push(`Line ${line}: ${title(on)} isn't on stage at this moment.`);
      return { actors: [on] };
    };
    let scene = null, content = false;   // the scene going on now; whether anything has happened yet
    // slow motion: everything the next action creates is stretched around its start
    let slow = null;
    const tracked = () => [
      ...Object.values(P).filter(Array.isArray), ...Object.values(G), changes, shots,
      ...cast.flatMap(id => [...Object.values(A[id].out).filter(Array.isArray), ...Object.values(A[id].ch)]),
    ];
    const stretch = (snap, s, k) => snap.forEach(([arr, n]) => {
      for (let i = n; i < arr.length; i++) {
        const o = arr[i], at = x => (typeof x === 'number' && x >= s && x < 1e8 ? s + (x - s) * k : x);
        if (typeof o === 'number') { arr[i] = at(o); continue; }
        if (!o || typeof o !== 'object') continue;
        ['t', 't0', 't1', 'a', 'b', 'burst', 'out0', 'out1'].forEach(f => { o[f] = at(o[f]); });
        if (typeof o.dur === 'number') o.dur *= k;
        if (Array.isArray(o.letters)) o.letters = o.letters.map(at);
      }
    });
    const log = [];   // every beat with its start, for automatic editing

    // YouTube kit: the series intro (5 s) and the end screen (the last 20 s) take their time in the story's timeline,
    // so everything after them simply starts later. While they play, the film draws them over the story.
    const INTRO = 5, END = 20, wantIntro = !VERT && meta.intro && meta.intro.at !== 'none' ? meta.intro : null, wantEnd = !VERT && meta.ending === 'end screen';
    if (VERT && (meta.intro && meta.intro.at !== 'none' || meta.ending === 'end screen')) P.warnings.push('The series intro and the end screen are left out of vertical videos for now (they come with Shorts, F7 Part B).');
    let introDone = false, endAt = null, scenesStarted = 0;
    const startIntro = at => { (P.youtube || (P.youtube = {})).intro = { t0: at, t1: at + INTRO }; t = at + INTRO + 0.4; prevStart = t; introDone = true; };
    const startEnd = () => {
      endAt = t + 0.5; (P.youtube || (P.youtube = {})).end = { t0: endAt };
      music.push({ t: endAt, mood: 'calm', line: 0 });   // calm music under the end screen
      t = endAt + 1.2; prevStart = t;
    };
    if (wantIntro && wantIntro.at === 'start') startIntro(0);

    for (const b of beats) {
      // the intro after a scene: just before the next scene starts
      if (wantIntro && wantIntro.at === 'after' && !introDone && b.type === 'scene') {
        if (scenesStarted + (scenesStarted === 0 && content ? 1 : 0) >= wantIntro.scene) startIntro(t + 0.3);
      }
      if (b.type === 'scene') scenesStarted += scenesStarted === 0 && content ? 2 : 1;
      if (b.endScreen && wantEnd && endAt === null) startEnd();
      const s = b.together ? prevStart : t;
      const who = (b.who && typeof b.who !== 'string' ? b.who : []).map(id => A[id]);
      if (who.length) focus = who[0].id;
      const stage = cast.filter(id => onStage(A[id]));
      let dur = 0, snap = null;
      noteMissing(b.line);
      if (slow && b.type !== 'slow') {
        if (b.type === 'say') { errors.push(`Line ${slow.line}: slow motion slows an action, not a voice line. Put it right before an action.`); slow = null; }
        else snap = tracked().map(arr => [arr, arr.length]);
      }
      switch (b.type) {
        case 'say': {
          if (b.silent) {
            // a silent thought: the thought bubble alone, up long enough to read (no voice)
            const a = A[b.who], o = others(a)[0], read = Math.max(1.8, 0.9 + b.text.split(/\s+/).length * 0.3);
            focus = a.id;
            P.bubbles.push({ who: a.id, text: b.text, t0: s, t1: s + read + 0.6, side: o ? (a.x >= o.x ? 1 : -1) : (a.x >= 960 ? -1 : 1), style: 'think', silent: true });
            if (b.mood) { a.out.exprs.push({ a: s, b: s + read + 0.3, mood: b.mood }); moodNote(a, b.mood, b.line); }
            dur = read + 0.4 * PACE;
            break;
          }
          const len = lens[P.voice.length] || estimate(b.text);
          const a = b.who === 'narrator' ? null : A[b.who];
          const vt = a ? s + 0.15 : s;
          if (voiceWins.some(([x, e]) => vt < e && vt + len > x)) errors.push(`Line ${b.line}: two voices would talk at the same time. Remove the "+" so this line waits its turn.`);
          voiceWins.push([vt, vt + len]);
          P.voice.push({ id: P.voice.length, who: b.who, text: b.text, t: vt, len, line: b.line, ...(b.style ? { style: b.style } : {}) });
          // big word-by-word captions (Shorts): a few words at a time, each on screen for its share of the line
          if (CAPS === 'all' || CAPS === 'narrator' && b.who === 'narrator') {
            const words = b.text.split(/\s+/), groups = [];
            for (let i = 0; i < words.length;) { let n = Math.min(3, words.length - i); if (words.length - i - n === 1) n = Math.min(4, words.length - i); groups.push(words.slice(i, i + n).join(' ')); i += n; }
            const total = groups.reduce((q, g) => q + g.length + 2, 0);
            let at = vt;
            groups.forEach(g => { const d = len * (g.length + 2) / total; (P.wordCaps || (P.wordCaps = [])).push({ text: g, t0: at, t1: at + d, who: b.who }); at += d; });
          }
          if (!a) {
            P.captions.push({ text: b.text, t0: Math.max(0.3, s - 0.1), t1: s + len + 0.5 });
            dur = len + 0.45 * PACE;
          } else {
            focus = a.id;
            // the bubble goes on the side away from the other character
            const o = others(a)[0];
            const side = o ? (a.x >= o.x ? 1 : -1) : (a.x >= 960 ? -1 : 1);
            if (o) talks.push({ t0: s, t1: vt + len, pairs: [[a, toward(a, o)], [o, toward(o, a)]].filter(([q]) => !q.toYou) });
            P.bubbles.push({ who: a.id, text: b.text, t0: s, t1: Math.max(vt + len + 0.9, s + 2.8), side, emph: !b.style && /!/.test(b.text) && /^(whoa|wow|oh|look|yay|hooray)/i.test(b.text), ...(b.style ? { style: b.style } : {}) });
            if (b.mood) { a.out.exprs.push({ a: s, b: vt + len + 0.3, mood: b.mood }); moodNote(a, b.mood, b.line); }
            // laughing: a soft giggle right after the line (not over the voice)
            if (b.mood === 'laughing') sfx('giggle', vt + len + 0.05, { who: a.id });
            dur = 0.15 + len + 0.55 * PACE;
          }
          break;
        }
        case 'wait': dur = b.secs * PACE; break;
        case 'sting': sfx('sting', s); break;
        case 'enter': case 'walk': {
          if (b.type === 'enter') who.forEach(a => { a.x = OFF[b.from]; });
          let c = spots()[b.to];
          if (who.length === 2) {
            // two together share the spot as a centred pair (clear of anyone else); the one in front goes further in
            const [p, q] = b.type === 'enter' ? who : [...who].sort((x, y) => x.x - y.x);
            const side = b.type === 'enter' ? (b.from === 'left' ? 1 : -1) : 1, k = b.type === 'enter' ? 0.25 : 0;
            if (thirds(who).some(o => Math.abs(o.x - c) < GAP + GAP / 2)) c = roomFor(who, c, GAP);
            dur = Math.max(moveTo(p, s, c + side * GAP / 2, b.slow), moveTo(q, s + k, c - side * GAP / 2, b.slow) + k, makeWay(who, s));
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
        case 'exit': who.forEach(a => { if (a.ch.air) a.ch.air.push({ t: s, v: 1, dur: 0.6 }); dur = Math.max(dur, moveTo(a, s, OFF[b.to], b.slow || false)); }); break;
        case 'journey': {
          // along the place's path, into the picture: "away" walks off into the distance (seen from behind) until gone;
          // "toward" comes from far away up to a stage spot. Side by side walkers keep their gap, shrinking with distance.
          const pl = PLACES.PLACES[here];
          if (!pl.trail) { errors.push(`Line ${b.line}: the ${pl.name} has no path that leads into the distance. Try the forest path.`); break; }
          if (who.some(a => a.def.fly)) { errors.push(`Line ${b.line}: only Ren, Yuki and walking animals can walk along the path.`); break; }
          const T = PLACES.util.trailOf(pl.trail), x0 = pl.trail[0][0];
          const c = b.to && spots()[b.to], ends = who.length === 2 ? [c - GAP / 2, c + GAP / 2] : [c];
          who.forEach((a, i) => {
            if (b.dir === 'toward' && onStage(a)) { errors.push(`Line ${b.line}: ${title(a.id)} is already here. Use "comes up the path" for someone who isn't on stage yet.`); return; }
            if (b.dir === 'away' && !onStage(a)) { errors.push(`Line ${b.line}: ${title(a.id)} isn't on stage, so can't walk down the path.`); return; }
            if (a.hiding) { a.hiding.rec.b = s + 0.3; a.hiding = null; }
            const speed = a.def.speed * (b.run ? 2.1 : 1) * STRIDE, d = Math.min(6, Math.max(3.5, T.len / speed)) * (b.run ? 0.6 : 1);
            const spotX = b.dir === 'away' ? a.x : ends[i], o = spotX - x0, t0 = s + 0.15 + (b.dir === 'away' ? 0.35 : 0);
            const n = a.def.moves === 'hop' ? Math.max(4, Math.round(d / 0.36)) : 0;
            a.out.walks.push({ t0, t1: t0 + d, x0: b.dir === 'away' ? a.x : OFF.right, x1: b.dir === 'away' ? OFF.right : spotX, ...(n ? { hops: n } : {}),
              ...(b.run ? { gait: 'run' } : {}), trip: { dir: b.dir, o } });
            if (n) for (let k = 0; k < n; k++) sfx('hopUp', t0 + k * d / n, { gain: 0.55 * (b.dir === 'away' ? 1 - k / n : (k + 1) / n) });
            else sfx('rustle', t0, { dur: d, gain: 0.4 });
            if (b.dir === 'away') {
              // turn round to face the path first, then go; once gone, they face the front again (off stage)
              a.ch.away = a.ch.away || []; a.ch.away.push({ t: s, v: 1, dur: 0.45 }, { t: t0 + d, v: 0, dur: 0.05 }); a.away = 0;
              a.x = OFF.right;
            } else { set(a, 'facing', s, 0, 0.05); a.x = spotX; }
            a.free = t0 + d; a.toYou = false;
            dur = Math.max(dur, t0 + d - s + (b.dir === 'away' ? 0.3 : 0.6));
          });
          break;
        }
        // a flying extra lands where it is (wings folded) or takes off again; only made when a story uses it
        case 'land': who.forEach(a => {
          if (!a.def.fly) { errors.push(`Line ${b.line}: only things that fly can ${b.down ? 'land' : 'take off'}.`); return; }
          (a.ch.air || (a.ch.air = [])).push({ t: s, v: b.down ? 0 : 1, dur: 0.9 });
          sfx('rustle', s, { dur: 0.8, gain: 0.5 }); dur = 1.0;
        }); break;
        // an extra swimming past: in from one side and out the other
        case 'pass': who.forEach(a => { a.x = OFF[b.from]; dur = Math.max(dur, moveTo(a, s, OFF[b.from === 'left' ? 'right' : 'left'], false)); }); break;
        case 'prop': dur = propBeat(b, s); break;
        case 'hold': dur = holdBeat(b, s, who[0]); break;
        case 'walkToThing': {
          // walks up beside the prop, on the side it comes from, and looks at it. If someone already stands
          // there it takes the prop's other side when that one is free; otherwise the one standing steps aside.
          const a = who[0], p = props[b.thing];
          if (!p) { errors.push(`Line ${b.line}: there is no ${b.thing} here. Use "${b.thing} appears" first.`); break; }
          const beside = sd => Math.max(MINX, Math.min(MAXX, p.x + sd * (p.size === 'big' ? 300 : BESIDE)));
          let side = Math.sign(a.x - p.x) || -1;
          if (crowding(a, beside(side)) && !crowding(a, beside(-side))) side = -side;
          dur = moveTo(a, s, beside(side), b.slow);
          dur = Math.max(dur, makeWay([a], s));
          closeLook(a, s + dur - 0.5); a.open = { a: s + dur - 0.5, b: 1e9, target: { prop: P.props.indexOf(p) } }; a.out.lookAt.push(a.open);
          set(a, 'facing', s + dur - 0.4, -side * 0.5, 0.35);
          break;
        }
        case 'lookAtThing': {
          const p = props[b.thing];
          if (!p) { errors.push(`Line ${b.line}: there is no ${b.thing} here. Use "${b.thing} appears" first.`); break; }
          who.forEach(a => { closeLook(a, s); a.open = { a: s, b: 1e9, target: { prop: P.props.indexOf(p) } }; a.out.lookAt.push(a.open); set(a, 'facing', s, (Math.sign(p.x - a.x) || 1) * 0.35, 0.35); a.toYou = false; });
          dur = 0.9; break;
        }
        case 'hop': who.forEach(a => { dur = Math.max(dur, hop(a, s, b.n)); }); break;
        case 'wave': {
          const p = b.thing && props[b.thing];
          if (b.thing && !p) { errors.push(`Line ${b.line}: there is no ${b.thing} here. Use "${b.thing} appears" first.`); break; }
          who.forEach(a => {
            if (holder === a.id) P.warnings.push(`Line ${b.line}: ${a.def.name} is holding the star, so they wave with the star in their paws.`);
            if (b.target) lookAtActor(a, A[b.target], s, false);
            if (p) { closeLook(a, s); a.open = { a: s, b: 1e9, target: { prop: P.props.indexOf(p) } }; a.out.lookAt.push(a.open); }
            set(a, 'armR', s, 2.35, 0.4); a.out.waves.push({ a: s + 0.4, b: s + 2.2 }); set(a, 'armR', s + 2.2, restR(a), 0.4);
          });
          dur = 2.6; break;
        }
        // ---- the movement library (F3): poses on joint channels ("rig.<joint>"), "sit" and "nod", which only stories
        // that use them have; every pose eases in and out (about 0.3 s), so actions blend into each other ----
        case 'sit': who.forEach(a => { pose(a, 'sit', s, 1, 0.55); a.ch.crouch.push({ t: s, v: 1, dur: 0.3 }); }); dur = 0.8; break;
        case 'stand': who.forEach(a => {
          pose(a, 'sit', s, 0, 0.5); pose(a, 'rig.spine', s, 0, 0.4); a.ch.crouch.push({ t: s, v: 1, dur: 0.4 });
          if (a.ch.roll) pose(a, 'roll', s, 0, 0.55);   // up from lying down too
          if (a.faint) { a.faint.b = s; a.faint = null; }   // (and awake, if they had fainted)
        }); dur = who.some(a => a.ch.roll) ? 0.9 : 0.7; break;
        case 'crouch': who.forEach(a => { pose(a, 'sit', s, 0.55, 0.4); a.ch.crouch.push({ t: s, v: 0.94, dur: 0.4 }); }); dur = 0.6; break;
        case 'lean': who.forEach(a => {
          // toward the other character (or forward), held for a moment, then upright again
          const o = b.target ? A[b.target] : others(a)[0], dir = o ? toward(a, o) : (a.x >= 960 ? -1 : 1), v = (b.back ? -0.13 : 0.2) * dir;
          if (o && !b.back) set(a, 'facing', s, dir * 0.35, 0.35);
          pose(a, 'rig.spine', s, v, 0.4); pose(a, 'rig.neck', s, v * 0.4, 0.4);
          pose(a, 'rig.spine', s + 2.0, 0, 0.5); pose(a, 'rig.neck', s + 2.0, 0, 0.5);
        }); dur = 0.7; break;
        case 'wobble': who.forEach(a => {
          // a small loss of balance (arms out), then steady again
          [[0, 0.14, 0.18], [0.25, -0.1, 0.22], [0.52, 0.06, 0.2], [0.78, 0, 0.25]].forEach(([d, v, dd]) => pose(a, 'rig.hips', s + d, v, dd));
          set(a, 'armL', s, 0.95, 0.2); set(a, 'armR', s, 0.95, 0.2); set(a, 'armL', s + 0.85, restL(a), 0.3); set(a, 'armR', s + 0.85, ARM_R, 0.3);
        }); dur = 1.1; break;
        case 'count': who.forEach(a => {
          // both paws up in front of the chest, one tapping the other three times, eyes on the paws
          set(a, 'armL', s, 0.25, 0.35); set(a, 'armR', s, 0.25, 0.35); pose(a, 'rig.elbowL', s, 1.9, 0.35); pose(a, 'rig.elbowR', s, 1.9, 0.35);
          set(a, 'lookY', s, 0.6, 0.3); set(a, 'lookX', s, 0, 0.3);
          [0.55, 1.0, 1.45].forEach((d, i) => { set(a, 'armL', s + d, 0.5, 0.12); set(a, 'armL', s + d + 0.18, 0.25, 0.14); pose(a, 'nod', s + d, 4, 0.1); pose(a, 'nod', s + d + 0.15, 0, 0.12); });
          set(a, 'armL', s + 2.0, restL(a), 0.4); set(a, 'armR', s + 2.0, ARM_R, 0.4); pose(a, 'rig.elbowL', s + 2.0, 0, 0.4); pose(a, 'rig.elbowR', s + 2.0, 0, 0.4); set(a, 'lookY', s + 2.0, 0, 0.4);
        }); dur = 2.3; break;
        case 'write': who.forEach(a => {
          // a paw up high, tracing little loops in the air, eyes following it
          set(a, 'armR', s, 1.9, 0.35); pose(a, 'rig.elbowR', s, -0.5, 0.35); pose(a, 'rig.reachR', s, 16, 0.35); set(a, 'lookY', s, -0.5, 0.3); set(a, 'lookX', s, 0.7, 0.3);
          for (let i = 0; i < 8; i++) { set(a, 'armR', s + 0.4 + i * 0.2, i % 2 ? 2.05 : 1.8, 0.18); pose(a, 'rig.elbowR', s + 0.4 + i * 0.2, i % 2 ? -0.25 : -0.85, 0.18); }
          set(a, 'armR', s + 2.1, ARM_R, 0.4); pose(a, 'rig.elbowR', s + 2.1, 0, 0.4); pose(a, 'rig.reachR', s + 2.1, 0, 0.4); set(a, 'lookY', s + 2.1, 0, 0.4); set(a, 'lookX', s + 2.1, 0, 0.4);
        }); dur = 2.4; break;
        case 'holdOut': who.forEach(a => {
          // the near paw held out toward the other (the near arm is the right one whenever a character is turned)
          const o = b.target ? A[b.target] : others(a)[0], dir = o ? toward(a, o) : (a.x >= 960 ? -1 : 1);
          set(a, 'facing', s, dir * 0.45, 0.35); set(a, 'armR', s, 1.35, 0.35); pose(a, 'rig.elbowR', s, -0.15, 0.35);
          set(a, 'armR', s + 2.6, restR(a), 0.4); pose(a, 'rig.elbowR', s + 2.6, 0, 0.4);
        }); dur = 0.8; break;
        case 'touch': {
          // the two step close, turn to each other and touch paws (a soft chime), then step apart again
          const [a, o] = b.target === 'each other' ? who : [who[0], A[b.target]];
          const c = (a.x + o.x) / 2, d = pairUp(a, o, s, c, 230, false), p = s + Math.max(0, d - 0.3), dir = toward(a, o);
          [[a, dir], [o, -dir]].forEach(([q, d2]) => {
            closeLook(q, p); set(q, 'facing', p, d2 * 0.45, 0.3); set(q, 'lookX', p, d2 * 0.6, 0.3);
            set(q, 'armR', p, 1.3, 0.35); pose(q, 'rig.elbowR', p, 0.12, 0.35);
            set(q, 'armR', p + 1.4, restR(q), 0.4); pose(q, 'rig.elbowR', p + 1.4, 0, 0.4); set(q, 'lookX', p + 1.4, 0, 0.4);
            q.out.exprs.push({ a: p + 0.2, b: p + 1.6, mood: 'happy' }); q.toYou = false;
          });
          sfx('twinkle', p + 0.35, { midi: 88, gain: 0.12 });
          dur = (p - s) + 1.6 + pairUp(a, o, p + 1.6, c, GAP, false);
          break;
        }
        case 'wide': who.forEach(a => {
          set(a, 'armL', s, 1.5, 0.4); set(a, 'armR', s, 1.5, 0.4); set(a, 'lookY', s, -0.2, 0.4);
          set(a, 'armL', s + 1.7, restL(a), 0.45); set(a, 'armR', s + 1.7, ARM_R, 0.45); set(a, 'lookY', s + 1.7, 0, 0.45);
        }); dur = 2.0; break;
        case 'nod': who.forEach(a => {   // (two nods, the eyes dipping with the head)
          [[0, 15, 0.16], [0.22, 0, 0.16], [0.44, 15, 0.16], [0.66, 0, 0.2]].forEach(([d, v, dd]) => pose(a, 'nod', s + d, v, dd));
          set(a, 'lookY', s, 0.7, 0.16); set(a, 'lookY', s + 0.66, 0, 0.2);
        }); dur = 0.9; break;
        case 'headShake': who.forEach(a => {
          [[0, 1], [0.18, -1], [0.36, 1], [0.54, -1], [0.72, 0]].forEach(([d, v]) => { set(a, 'lookX', s + d, v * 0.8, 0.15); pose(a, 'rig.neck', s + d, v * 0.09, 0.15); set(a, 'facing', s + d, v * 0.14, 0.15); });
        }); dur = 1.0; break;
        case 'point': who.forEach(a => {
          // the arm points the way: at someone, a prop, the star, you, or up / left / right
          const p = b.target ? A[b.target] : b.thing ? props[b.thing] : b.at === 'star' ? (star.state !== 'none' ? { x: star.x, y: star.y } : null) : null;
          if ((b.target || b.thing || b.at === 'star') && !p) { errors.push(`Line ${b.line}: there is no ${b.thing || b.target || 'star'} here.`); return; }
          const sy = feetY(a.x) - 122 * KS;
          const tx = p ? p.x : b.at === 'left' ? a.x - 600 : b.at === 'right' ? a.x + 600 : a.x, ty = p ? (p.y !== undefined ? p.y - (b.target ? 200 * KS : 30) : feetY(p.x) - 200 * KS) : b.at === 'up' ? sy - 600 : sy;
          const dir = Math.sign(tx - a.x) || 0, ang = b.at === 'you' ? 1.0 : b.at === 'up' ? 2.55 : Math.atan2(Math.abs(tx - a.x), -(sy - ty));
          if (dir) { set(a, 'facing', s, dir * 0.45, 0.35); set(a, 'lookX', s, dir * 0.8, 0.3); }
          set(a, 'lookY', s, b.at === 'up' ? -1 : 0, 0.3);
          set(a, 'armR', s, Math.min(2.6, Math.max(0.6, ang)), 0.35); pose(a, 'rig.elbowR', s, 0, 0.3); pose(a, 'rig.reachR', s, b.at === 'up' ? 24 : 14, 0.35); pose(a, 'rig.reachR', s + 1.9, 0, 0.4);
          set(a, 'armR', s + 1.9, restR(a), 0.4); set(a, 'lookX', s + 1.9, 0, 0.4); set(a, 'lookY', s + 1.9, 0, 0.4);
        }); dur = 0.8; break;
        // ---- the movement library, part 2: jumps, frights, trips and falls (a comic fall: never hurt) ----
        case 'jump': who.forEach(a => {
          // a big jump: crouch, up high with the paws in the air, a squashy landing
          const t0 = s + 0.18, t1 = t0 + 0.75;
          a.out.hops.push({ t0, t1, h: a.def.hop.h * 2.1 });
          if (a.def.hop.sound === 'light') { sfx('hopUp', t0); sfx('hopLand', t1); } else { sfx('boingUp', t0); sfx('boingLand', t1); }
          set(a, 'armL', t0, 2.2, 0.2); set(a, 'armR', t0, 2.2, 0.2);
          set(a, 'armL', t1, restL(a), 0.3); set(a, 'armR', t1, restR(a), 0.3);
        }); dur = 1.25; break;
        case 'fright': who.forEach(a => {
          // a startled little jump: scared face (ears back, wide eyes), paws flung up, leaning back; then it settles
          const dir = facingDir(a), t0 = s + 0.05, t1 = t0 + 0.4;
          a.out.hops.push({ t0, t1, h: a.def.hop.h * 0.9, face: false });
          a.out.exprs.push({ a: s, b: s + 1.7, mood: 'scared' });
          sfx(a.def.hop.sound === 'light' ? 'hopUp' : 'boingUp', t0); sfx('softLand', t1);
          set(a, 'armL', s, 1.9, 0.12); set(a, 'armR', s, 1.9, 0.12);
          pose(a, 'rig.spine', s, -dir * 0.1, 0.15); pose(a, 'rig.spine', s + 1.1, 0, 0.4);
          set(a, 'armL', s + 1.0, restL(a), 0.4); set(a, 'armR', s + 1.0, restR(a), 0.4);
        }); dur = 1.4; break;
        case 'trip': who.forEach(a => {
          // a stumble forward, arms windmilling, a surprised face; caught just in time, then upright again
          const dir = facingDir(a);
          a.out.exprs.push({ a: s, b: s + 1.1, mood: 'surprised' });
          sfx('rustle', s, { dur: 0.35, gain: 0.6 });
          pose(a, 'rig.spine', s, dir * 0.36, 0.18); pose(a, 'rig.neck', s, dir * 0.12, 0.18);
          set(a, 'armL', s, 1.5, 0.15); set(a, 'armR', s, 1.5, 0.15);
          set(a, 'armL', s + 0.3, 0.6, 0.15); set(a, 'armR', s + 0.3, 1.9, 0.15);
          set(a, 'armL', s + 0.5, 1.7, 0.15); set(a, 'armR', s + 0.5, 0.7, 0.15);
          pose(a, 'rig.spine', s + 0.4, -dir * 0.07, 0.25); pose(a, 'rig.neck', s + 0.45, 0, 0.25);
          pose(a, 'rig.spine', s + 0.7, 0, 0.3);
          set(a, 'armL', s + 0.75, restL(a), 0.3); set(a, 'armR', s + 0.75, restR(a), 0.3);
        }); dur = 1.15; break;
        case 'fall': who.forEach(a => {
          // tips back, paws up, and plops down on the bottom with a soft bump (it stays sitting until "gets up")
          const dir = facingDir(a);
          a.out.exprs.push({ a: s, b: s + 1.5, mood: 'surprised' });
          set(a, 'facing', s, 0, 0.3);
          pose(a, 'rig.spine', s, -dir * 0.2, 0.2);
          set(a, 'armL', s, 2.1, 0.18); set(a, 'armR', s, 2.1, 0.18);
          pose(a, 'sit', s + 0.15, 1, 0.22);
          a.ch.crouch.push({ t: s + 0.37, v: 0.8, dur: 0.08 }, { t: s + 0.45, v: 1, dur: 0.3 });
          a.out.hops.push({ t0: s + 0.45, t1: s + 0.7, h: 14, face: false });   // a little bounce on landing
          sfx('softLand', s + 0.37);
          pose(a, 'rig.spine', s + 0.5, -dir * 0.06, 0.4);   // still leaning back a little, sitting on the bottom
          set(a, 'armL', s + 0.7, restL(a), 0.4); set(a, 'armR', s + 0.7, restR(a), 0.4);
        }); dur = 1.5; break;
        // ---- the movement library, part 3: gestures, lying down, hiding and peeking ----
        case 'shrug': who.forEach(a => {
          // "I don't know": shoulders up, paws out to the sides with the forearms turned up, head tipped
          const sa = a.def.moves === 'hop' ? 1.15 : 0.8;   // (short arms go out further, so the shrug reads)
          set(a, 'armL', s, sa, 0.25); set(a, 'armR', s, sa, 0.25); pose(a, 'rig.elbowL', s, -0.9, 0.25); pose(a, 'rig.elbowR', s, -0.9, 0.25);
          pose(a, 'nod', s, 6, 0.25); set(a, 'tilt', s, 0.14, 0.25); a.ch.crouch.push({ t: s, v: 0.97, dur: 0.25 });
          set(a, 'armL', s + 1.1, restL(a), 0.4); set(a, 'armR', s + 1.1, restR(a), 0.4); pose(a, 'rig.elbowL', s + 1.1, 0, 0.4); pose(a, 'rig.elbowR', s + 1.1, 0, 0.4);
          pose(a, 'nod', s + 1.1, 0, 0.4); set(a, 'tilt', s + 1.1, 0, 0.4); a.ch.crouch.push({ t: s + 1.1, v: 1, dur: 0.4 });
        }); dur = 1.5; break;
        case 'coverEyes': who.forEach(a => {
          // both paws over the eyes (shy, or "I can't look!"), a little hunched, for a couple of seconds
          (a.out.paws = a.out.paws || []).push({ a: s, b: s + 2.2, pose: 'eyes' });
          a.ch.crouch.push({ t: s, v: 0.96, dur: 0.3 }, { t: s + 2.2, v: 1, dur: 0.35 });
          set(a, 'facing', s, 0, 0.3);
        }); dur = 2.5; break;
        case 'stretch': who.forEach(a => {
          // a big happy stretch: paws high, standing tall, eyes closed, face up
          set(a, 'armL', s, 2.3, 0.45); set(a, 'armR', s, 2.3, 0.45); pose(a, 'rig.reachL', s, 26, 0.45); pose(a, 'rig.reachR', s, 26, 0.45);
          a.ch.crouch.push({ t: s, v: 1.05, dur: 0.45 }, { t: s + 1.6, v: 1, dur: 0.45 });
          set(a, 'lookY', s, -0.6, 0.45); a.out.exprs.push({ a: s + 0.2, b: s + 1.8, mood: 'joy' });
          set(a, 'armL', s + 1.6, restL(a), 0.45); set(a, 'armR', s + 1.6, restR(a), 0.45);
          pose(a, 'rig.reachL', s + 1.6, 0, 0.45); pose(a, 'rig.reachR', s + 1.6, 0, 0.45); set(a, 'lookY', s + 1.6, 0, 0.45);
        }); dur = 2.1; break;
        case 'yawn': who.forEach(a => {
          // a big sleepy yawn with a paw over the mouth, head tipped back a little
          a.out.exprs.push({ a: s, b: s + 1.9, mood: 'sleepy' });
          (a.out.paws = a.out.paws || []).push({ a: s + 0.15, b: s + 1.7, pose: 'yawn' });
          set(a, 'lookY', s, -0.3, 0.4); set(a, 'tilt', s, 0.1, 0.4); set(a, 'lookY', s + 1.7, 0, 0.4); set(a, 'tilt', s + 1.7, 0, 0.4);
        }); dur = 2.2; break;
        case 'sigh': who.forEach(a => {
          // a breath in (shoulders up, eyes up), then a long breath out: shoulders and head drop, a slow blink
          a.ch.crouch.push({ t: s, v: 1.03, dur: 0.45 }, { t: s + 0.55, v: 0.96, dur: 0.6 }, { t: s + 1.3, v: 1, dur: 0.4 });
          set(a, 'lookY', s, -0.3, 0.45); set(a, 'lookY', s + 0.55, 0.35, 0.5); set(a, 'lookY', s + 1.3, 0, 0.4);
          pose(a, 'nod', s + 0.55, 8, 0.6); pose(a, 'nod', s + 1.3, 0, 0.4);
          set(a, 'armL', s + 0.55, 0.05, 0.5); set(a, 'armR', s + 0.55, holder === a.id ? -1.2 : 0.05, 0.5);
          set(a, 'armL', s + 1.3, restL(a), 0.4); set(a, 'armR', s + 1.3, restR(a), 0.4);
          a.out.blinkExtra.push(s + 0.65);
        }); dur = 1.7; break;
        case 'dance': who.forEach(a => {
          // a happy little dance: four beats of swaying hips, paws up in turn, a small bounce on each beat
          a.out.exprs.push({ a: s, b: s + 3.3, mood: 'joy' });
          sfx('twinkle', s + 0.1, { midi: 84, gain: 0.1 });
          for (let i = 0; i < 4; i++) {
            const t = s + 0.15 + i * 0.75, v = i % 2 ? -1 : 1;
            pose(a, 'rig.hips', t, v * 0.12, 0.3); pose(a, 'rig.spine', t, -v * 0.1, 0.3); set(a, 'facing', t, v * 0.25, 0.3);
            set(a, 'armL', t, v > 0 ? 2.4 : 0.9, 0.3); set(a, 'armR', t, v > 0 ? 0.9 : 2.4, 0.3);
            a.out.hops.push({ t0: t + 0.3, t1: t + 0.62, h: 20 });
          }
          const e = s + 3.15;
          pose(a, 'rig.hips', e, 0, 0.35); pose(a, 'rig.spine', e, 0, 0.35); set(a, 'facing', e, 0, 0.35);
          set(a, 'armL', e, restL(a), 0.35); set(a, 'armR', e, restR(a), 0.35);
        }); dur = 3.5; break;
        case 'lie': who.forEach(a => {
          // lies down on the side, facing the front, head toward the middle of the stage (until "gets up")
          const dir = a.x >= 960 ? -1 : 1;
          set(a, 'facing', s, 0, 0.3); pose(a, 'sit', s, 0, 0.3);
          pose(a, 'roll', s, dir * 1.4, 0.7); sfx('softLand', s + 0.6, { gain: 0.5 });
          set(a, 'armL', s, 0.35, 0.5); set(a, 'armR', s, holder === a.id ? -1.2 : 0.35, 0.5);
        }); dur = 1.2; break;
        case 'faint': who.forEach(a => {
          // a little wobble, the eyes close, and down onto the side, limp (until "wakes up" and "gets up");
          // anything in the paws falls
          const dir = a.x >= 960 ? -1 : 1;
          if (a.holding) letGo(a, s + 0.35, { x: Math.max(120, Math.min(1800, a.x + dir * 90)), fall: 'drop' });
          [[0, 0.1, 0.18], [0.2, -0.08, 0.2], [0.42, 0, 0.2]].forEach(([d, v, dd]) => pose(a, 'rig.hips', s + d, v, dd));
          a.faint = { a: s + 0.25, b: 1e9, mood: 'fainted' }; a.out.exprs.push(a.faint);
          set(a, 'facing', s, 0, 0.3); pose(a, 'sit', s, 0, 0.3); set(a, 'lookX', s, 0, 0.3); set(a, 'lookY', s, 0.3, 0.3);
          set(a, 'armL', s + 0.35, 0.3, 0.4); set(a, 'armR', s + 0.35, holder === a.id ? -1.2 : 0.3, 0.4);
          pose(a, 'roll', s + 0.45, dir * 1.45, 0.45);
          sfx('softLand', s + 0.9, { gain: 0.6 });
        }); dur = 1.5; break;
        case 'wake': who.forEach(a => {
          // the eyes open (still lying there): a slow blink, a look around
          if (a.faint) { a.faint.b = s + 0.3; a.faint = null; }
          a.out.blinkExtra.push(s + 0.5);
          set(a, 'lookY', s + 0.3, 0, 0.4);
        }); dur = 0.9; break;
        case 'hide': who.forEach(a => {
          // tucks in just behind the other one (drawn behind them), crouched down, until it moves again
          const o = A[b.target];
          if (!o || o === a) { errors.push(`Line ${b.line}: there is no one to hide behind.`); return; }
          const side = Math.sign(a.x - o.x) || -1, d = moveTo(a, s, o.x + side * 55, b.slow || 'sneak');
          const t = s + Math.max(0.3, d - 0.6);
          a.hiding = { o, side, rec: { a: t - 0.3, b: 1e9 } }; (a.out.behind = a.out.behind || []).push(a.hiding.rec);
          a.ch.crouch.push({ t, v: 0.86, dur: 0.35 }); set(a, 'facing', t, -side * 0.3, 0.35);
          dur = Math.max(dur, d);
        }); dur = Math.max(dur || 0, 0.8); break;
        case 'peek': who.forEach(a => {
          // leans out sideways (from behind whoever it hides behind) and looks at you, then tucks back in
          const side = a.hiding ? a.hiding.side : (a.x >= 960 ? 1 : -1);
          pose(a, 'rig.spine', s, side * 0.34, 0.4); pose(a, 'rig.neck', s, side * 0.16, 0.4);
          set(a, 'lookX', s, 0, 0.3); set(a, 'lookY', s, 0, 0.3); set(a, 'facing', s, 0, 0.35);
          if (a.hiding) a.ch.crouch.push({ t: s, v: 0.95, dur: 0.4 }, { t: s + 1.7, v: 0.86, dur: 0.4 });
          pose(a, 'rig.spine', s + 1.7, 0, 0.4); pose(a, 'rig.neck', s + 1.7, 0, 0.4);
        }); dur = 2.1; break;
        case 'away':
          // the back view (a channel only stories that turn away have, so other plans stay as they are)
          who.forEach(a => { a.ch.away = a.ch.away || []; a.ch.away.push({ t: s, v: 1, dur: 0.45 }); a.away = s + 0.01; });
          dur = 0.6;
          break;
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
            const inner = d2 > 0 ? 'armR' : 'armL', outer = d2 > 0 ? 'armL' : 'armR', rest = restR(q);
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
          // then they step apart again, still centred where they hugged, facing each other (never back to back);
          // and a hug makes up: both feel happy afterwards (until the story says otherwise)
          dur = (p - s) + 2.55 + pairUp(a, o, p + 2.55, c, GAP, false);
          [[a, dir], [o, -dir]].forEach(([q, d2]) => {
            set(q, 'facing', p + 2.55, d2 * 0.35, 0.25); set(q, 'lookX', p + 2.55, d2 * 0.6, 0.3);
            q.out.moods.push({ t: p + 2.6, mood: 'happy' });
          });
          break;
        }
        case 'tilt': who.forEach(a => { set(a, 'tilt', s, 0.22, 0.3); set(a, 'tilt', s + 0.9, 0, 0.3); }); dur = 1.25; break;
        case 'mood': who.forEach(a => { a.out.moods.push({ t: s, mood: b.mood }); moodNote(a, b.mood, b.line); if (b.mood === 'laughing') sfx('giggle', s + 0.1, { who: a.id }); }); dur = 0.6; break;
        case 'blink': who.forEach(a => a.out.blinkExtra.push(s)); dur = 0.4; break;
        case 'paws': {
          who.forEach(a => {
            const v = b.up ? 2.7 : restR(a);
            set(a, 'armL', s, v, 0.5); set(a, 'armR', s, v, 0.5);
            if (holder === a.id) P.star.push({ type: b.up ? 'raise' : 'lower', t0: s, t1: s + 0.6, who: a.id });
            // raising the star next to a set piece with a place for it (the Great Tree's hollow): it goes in there
            const slotted = b.up && holder === a.id && Object.values(props).find(p => !p.t1 && !p.sky && p.asset && ASSETS.ASSETS[p.asset].slot && Math.abs(p.x - a.x) < 520);
            if (slotted) {
              const [sx, sy] = ASSETS.ASSETS[slotted.asset].slot, at = { x: slotted.x + sx, y: groundAt(slotted).y + sy };
              P.star.push({ type: 'place', t0: s + 0.7, t1: s + 1.7, to: at, who: a.id }, { type: 'slot', t0: s + 1.7, at, r: 26 });
              set(a, 'armL', s + 1.6, restL(a), 0.6); set(a, 'armR', s + 1.6, ARM_R, 0.6);
              sfx('softLand', s + 1.7); sfx('twinkle', s + 1.75, { midi: 93, gain: 0.1 });
              holder = null; star = { state: 'ground', x: at.x, y: at.y, r: 26 };
              dur = 2.0;
            }
          });
          dur = Math.max(dur || 0, 0.8); break;
        }
        case 'pickup': {
          const a = who[0];
          if (star.state !== 'ground') { errors.push(`Line ${b.line}: there is no star on the ground to pick up. Use "star falls" first.`); break; }
          if (a.holding) { errors.push(`Line ${b.line}: ${a.def.name}'s paws are full: ${a.def.name} is holding the ${a.holding.p.name}. Put it down first.`); break; }
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
          // "the star glows" / "disappears" for a star that came in as a prop ("star appears at left")
          if (star.state === 'none' && props.star && /^(glows|disappears)$/.test(b.act)) { dur = propBeat({ ...b, name: 'star', act: b.act === 'glows' ? 'glow' : 'disappear' }, s); break; }
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
          if (holder !== a.id) { set(a, 'armL', s + 0.6, 1.9, 0.45); set(a, 'armR', s + 0.6, 1.9, 0.45); set(a, 'armL', s + 1.65, restL(a), 0.3); set(a, 'armR', s + 1.65, ARM_R, 0.3); }
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
        case 'moon':
          (P.moon = P.moon || []).push({ t: s, value: b.value });
          dur = 0; break;
        case 'time':
          // a scene that opens somewhere new switches the sky while the page is white; otherwise it changes slowly
          if (b.snap && scene && scene.turn) setG('tau', scene.t0 + PT / 2, TIMES[b.value], 0.001); else setG('tau', s, TIMES[b.value], 4);
          nowTime = b.value;
          dur = 0; break;
        case 'place': {
          if (b.value === here) { P.warnings.push(`Line ${b.line}: the story is already at the ${PLACES.PLACES[here].name}.`); break; }
          changes.push({ t0: s, t1: s + PT, from: here, to: b.value });
          leavePlace(s + PT / 2);
          sfx('pageTurn', s);
          here = b.value;
          dur = PT;
          break;
        }
        case 'camera':
          if (shotMode) shots.push({ t: s, op: 'zoom', z: b.zoom, on: { all: true }, dur: 1.6 }); else setG('zoom', s, b.zoom, 1.6);
          dur = 0; break;
        case 'shot': {
          if (b.size === 'ots') {
            const a = A[b.of], o = a && others(a)[0];
            if (!a) errors.push(`Line ${b.line}: ${title(b.of)} isn't in this story.`);
            else if (!o || !onStage(a)) errors.push(`Line ${b.line}: an over-the-shoulder shot needs ${title(b.of)} and someone else on stage.`);
            else shots.push({ t: s, op: 'ots', of: a.id, on: { actors: [o.id] }, dur: 0 });
            break;
          }
          // without "on …", a wide shot shows everyone and a closer one whoever acted or spoke last
          const on = b.on || (b.size === 'wide' || !A[focus] || !onStage(A[focus]) ? 'both' : focus);
          shots.push({ t: s, op: 'cut', size: b.size, on: aim(on, b.line), dur: 0 });
          break;
        }
        case 'cam': {
          const D = { push: 2, pull: 2, pan: 1.8, follow: 1, shake: 0.6, hold: 0 }[b.move];
          shots.push({ t: s, op: b.move, on: b.on ? aim(b.on, b.line) : undefined, dur: D });
          break;
        }
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
        case 'music': music.push({ t: b.head ? scene.t0 : s, mood: b.mood, line: b.line, ...(b.deep ? { deep: true } : {}) }); break;
        case 'slow':
          if (slow) errors.push(`Line ${b.line}: there are two "slow motion" lines in a row.`);
          slow = { secs: b.secs, line: b.line };
          break;
        case 'reveal': {
          // a slow, eased camera move with a gentle magical swell; a place is shown by pulling out wide
          const D = 3.2;
          if (b.place) {
            let at = s;
            if (b.place !== here) { changes.push({ t0: s, t1: s + PT, from: here, to: b.place }); leavePlace(s + PT / 2); sfx('pageTurn', s); here = b.place; at = s + PT / 2; }
            shots.push({ t: at, op: 'cut', size: 'medium', on: { all: true }, dur: 0 }, { t: at + 0.6, op: 'reveal', z: 1, on: { all: true }, dur: D });
            dur = at - s + 0.6 + D;
          } else {
            // the star is revealed with everyone looking up at it; a character fills a close shot
            shots.push(b.on === 'star' ? { t: s, op: 'reveal', z: 1.5, on: { ...aim('star', b.line), all: true }, dur: D } : { t: s, op: 'reveal', z: 2.2, on: aim(b.on, b.line), dur: D });
            dur = D;
          }
          sfx('swell', s + (dur - D), { t1: s + dur + 0.8 });
          break;
        }
      }
      if (snap) {
        // the action takes about the asked-for time (never faster than normal)
        const k = dur > 0 ? Math.max(1, slow.secs / dur) : 1;
        if (dur <= 0) P.warnings.push(`Line ${slow.line}: slow motion has nothing to slow down on the next line.`);
        else if (k === 1) P.warnings.push(`Line ${slow.line}: that action already takes ${dur.toFixed(1)} s, so slow motion ${slow.secs} doesn't slow it.`);
        if (k > 1) {
          stretch(snap, s, k);
          cast.forEach(id => { if (A[id].free > s) A[id].free = s + (A[id].free - s) * k; });
          dur *= k;
          (P.slowmo || (P.slowmo = [])).push({ t0: s, t1: s + dur });
        }
        slow = null;
      }
      log.push({ b, s, dur, stage });
      if (b.type !== 'scene') content = true;
      prevStart = s;
      t = Math.max(t, s + dur);
    }
    if (slow) errors.push(`Line ${slow.line}: slow motion needs an action after it.`);
    if (wantIntro && !introDone) errors.push(`Line ${wantIntro.line}: "intro: after scene ${wantIntro.scene}", but the story doesn't have a scene after scene ${wantIntro.scene}.`);
    if (wantEnd && endAt === null) startEnd();
    if (SHORT) {
      // the payoff: a music sting as the last line lands (unless the story has its own "sting" line)
      const last = P.voice[P.voice.length - 1];
      if (last && !P.sfx.some(x => x.type === 'sting')) sfx('sting', last.t + last.len + 0.05);
      if (meta.hook) P.hook = { text: meta.hook, t0: 0.15, t1: 3.2 };
      if (meta.loop) P.loop = true;
      // a 1-second logo end card (longer with a text), unless the Short loops back to its start
      else { const c0 = t + 0.2; P.card = { t0: c0, t1: c0 + (meta.cardText ? 2 : 1), text: meta.cardText || null }; t = P.card.t1 - 1.8; }
    }
    if (VERT && meta.framing) P.framing = meta.framing;
    // the end screen lasts 20 s, to the very end of the video
    if (endAt !== null) t = Math.max(endAt + END, t + 1.5) - 1.8;

    // a change of place: the props stay behind (they go as the page turns)
    // (a prop someone holds goes with them)
    function leavePlace(at) {
      const kept = {};
      Object.entries(props).forEach(([k, p]) => { if (heldBy.has(p)) kept[k] = p; else p.t1 = at; });
      props = kept;
    }

    // Props and set pieces: appear somewhere, disappear, glow or stop glowing, open or close.
    function propBeat(b, s) {
      const cur = props[b.name];
      if (b.act !== 'appear') {
        if (!cur) { errors.push(`Line ${b.line}: there is no ${b.name} here. Use "${b.name} appears" first.`); return 0; }
        if (b.act === 'disappear') {
          if (heldBy.has(cur)) letGo(A[heldBy.get(cur)], s + 0.5);
          cur.t1 = s + 0.5; delete props[b.name]; sfx('sparkles', s, { n: 4, seed: 70 + P.props.indexOf(cur) }); return 0.7;
        }
        if (b.act === 'glow' || b.act === 'unglow') { cur.glow.push({ t: s, on: b.act === 'glow' }); if (b.act === 'glow') sfx('twinkle', s + 0.1, { midi: 91, gain: 0.12 }); return 0.8; }
        if (b.act === 'overflow') {
          // treasure spilling over: a pop, a shower of sparkles and a happy chime
          cur.states.push({ t: s, state: 'overflowing' }); sfx('pop', s + 0.1, { gain: 0.35 });
          const g = groundAt(cur); [0.15, 0.45, 0.8].forEach((o, i) => { P.sparkles.push({ t: s + o, at: { x: g.x + (i - 1) * 40, y: g.y - cur.height * 0.8 }, small: true }); sfx('twinkle', s + o, { midi: [88, 91, 96][i], gain: 0.12 }); });
          return 1.2;
        }
        cur.states.push({ t: s, state: b.act === 'open' ? 'open' : 'closed' }); sfx('pop', s + 0.1, { gain: 0.3 });
        return 0.8;
      }
      if (cur) { P.warnings.push(`Line ${b.line}: the ${b.name} is already here.`); return 0; }
      const asset = b.asset && ASSETS.ASSETS[b.asset], m = missing.find(e => e.kind === 'prop' && e.name === b.name);
      const size = asset ? asset.size : (m && m.size) || 'small', height = asset ? asset.height : ASSETS.SIZES[size];
      const f = A[focus], w = b.where;
      let x, sky = false;
      if (w.at) x = spots()[w.at];
      else if (w.next) {
        const o = A[w.next];
        if (!o || !onStage(o)) { errors.push(`Line ${b.line}: ${title(w.next)} isn't on stage, so the ${b.name} can't appear next to them.`); return 0; }
        const side = others(o).some(q => q.x > o.x) ? -1 : 1;
        x = o.x + side * (size === 'big' ? 320 : 230);
      } else if (w.sky) { sky = true; x = skyFor(f ? f.x : 960).x; }
      else {
        // on the ground: beside whoever acted or spoke last, on the side away from the others
        const fx = f && onStage(f) ? f.x : 960;
        x = fx + 230 < 1760 ? fx + 230 : fx - 230;
        if (f && others(f).some(o => Math.abs(o.x - x) < 160)) x = fx - 230;
      }
      x = Math.max(120, Math.min(1800, x));
      const p = { name: b.name, asset: b.asset, missing: !asset, size, height, x, y: sky ? (VERT ? 400 : 300) : feetY(x), sky, t0: s, t1: null, states: [], glow: [] };
      P.props.push(p); props[b.name] = p;
      if (!b.quiet) { sfx('pop', s + 0.1, { gain: 0.35 }); sfx('sparkles', s + 0.15, { n: 3, seed: 50 + P.props.length }); }
      return 0.8;
    }

    // ---- props in paws (asset kit, Part D) ----
    // where a prop stands now (it may have been put down somewhere else since it appeared)
    function groundAt(p) { return p.at || { x: p.x, y: p.y }; }
    // a hold on p by a from t (lift: it glides up from where it stood); continues: a new pose of the same hold
    function takeHold(a, p, t, how, lift = true) {
      const h = { t0: t, t1: null, who: a.id, how, from: groundAt(p), ...(lift ? {} : { lift: false }) };
      (p.holds = p.holds || []).push(h); heldBy.set(p, a.id); a.holding = { p, how, h };
      // a prop that only glows for someone (the legendary sword, for Ren) lights up in their paw
      const as = p.asset && ASSETS.ASSETS[p.asset];
      if (as && as.glowsFor && as.glowsFor.includes(a.id) && !(p.glow.length && p.glow[p.glow.length - 1].on)) {
        const g = t + (lift ? 0.45 : 0.15);
        p.glow.push({ t: g, on: true, held: true }); sfx('twinkle', g, { midi: 96, gain: 0.14 }); sfx('chime', g + 0.2, { midi: 91, gain: 0.12 });
      }
      return h;
    }
    // a lets go at t; the prop lands at (x) (put down, or dropped), or goes to someone else (no landing)
    function letGo(a, t, land) {
      const hd = a.holding; if (!hd) return;
      hd.h.t1 = t; heldBy.delete(hd.p); a.holding = null;
      const gl = hd.p.glow[hd.p.glow.length - 1];
      if (gl && gl.on && gl.held) hd.p.glow.push({ t, on: false });   // (its light goes out when it leaves their paw)
      if (land) { const y = feetY(land.x); (hd.p.spots = hd.p.spots || []).push({ t, x: land.x, y, fall: land.fall }); hd.p.at = { x: land.x, y }; }
    }
    // a hold's pose changes (held up high, then back): a new segment of the same hold, without the lift
    function rehold(a, t, how) { const hd = a.holding; hd.h.t1 = t; const h = { t0: t, t1: null, who: a.id, how, from: hd.h.from, lift: false }; hd.p.holds.push(h); hd.h = h; hd.how = how; }
    function both(p) { const as = p.asset && ASSETS.ASSETS[p.asset]; return as && as.hold === 'both paws' ? 'both' : 'one'; }
    function holdBeat(b, s, a) {
      const p = props[b.thing], what = `the ${b.thing}`, Name = a.def.name;
      const fail = msg => { errors.push(`Line ${b.line}: ${msg}`); return 0; };
      const mustHold = () => (a.holding && a.holding.p === p ? null : fail(`${Name} isn't holding ${what}.`));
      if (b.act === 'find') {
        let d = 0;
        if (!p) { focus = a.id; d = propBeat({ act: 'appear', name: b.thing, asset: b.asset, where: {}, line: b.line }, s); }
        const q = props[b.thing]; if (!q) return d;
        const g = groundAt(q), side = Math.sign(g.x - a.x) || 1;
        if (Math.abs(g.x - a.x) > 330) d += moveTo(a, s + d, g.x - side * 200, false, q);
        const t = s + d;
        set(a, 'facing', t, side * 0.5, 0.3); set(a, 'lookX', t, side * 0.8, 0.3); set(a, 'lookY', t, 0.7, 0.3);
        a.out.exprs.push({ a: t, b: t + 1.6, mood: 'surprised' });
        P.sparkles.push({ t: t + 0.3, at: { x: g.x, y: g.y - q.height * 0.6 }, small: true }); sfx('twinkle', t + 0.3, { midi: 91, gain: 0.12 });
        set(a, 'lookY', t + 1.6, 0, 0.4); a.toYou = false;
        return d + 1.8;
      }
      if (b.act === 'hold') {
        if (p && heldBy.get(p) === a.id) return 0.1;
        if (!p) {
          // not here yet: it's simply in their paw (as if they brought it along)
          if (a.holding) return fail(`${Name}'s paws are full: ${Name} is holding the ${a.holding.p.name}. Put it down first.`);
          if (holder === a.id) return fail(`${Name}'s paws are full: ${Name} is holding the star.`);
          focus = a.id; propBeat({ act: 'appear', name: b.thing, asset: b.asset, where: {}, line: b.line, quiet: true }, s);
          const q = props[b.thing], how = both(q);
          takeHold(a, q, s, how, false);
          set(a, 'armR', s, restR(a), 0.35); set(a, 'armL', s, restL(a), 0.35);
          return 0.5;
        }
        b = { ...b, act: 'pick' };
      }
      if (!p) return fail(`there is no ${b.thing} here. Use "${b.thing} appears" first.`);
      if (b.act === 'pick' || (b.act === 'carry' && !(a.holding && a.holding.p === p))) {
        if (heldBy.has(p)) return heldBy.get(p) === a.id ? (b.act === 'carry' ? carryOn(b, s, a, p) : 0.1) : fail(`${title(heldBy.get(p))} is holding ${what}, not ${Name}.`);
        if (a.holding) return fail(`${Name}'s paws are full: ${Name} is holding the ${a.holding.p.name}. Put it down first.`);
        if (holder === a.id) return fail(`${Name}'s paws are full: ${Name} is holding the star.`);
        if (p.sky) return fail(`${what} is up in the sky, out of reach.`);
        const g = groundAt(p), side = Math.sign(g.x - a.x) || 1;
        const d = Math.abs(g.x - a.x) > 100 ? moveTo(a, s, g.x - side * 95, false, p) : 0, t = s + Math.max(0, d - 0.3);
        set(a, 'facing', t, side * 0.6, 0.3); set(a, 'lookX', t, side * 0.7, 0.3); set(a, 'lookY', t, 0.8, 0.3);
        a.ch.crouch.push({ t, v: 0.88, dur: 0.35 }, { t: t + 0.85, v: 1, dur: 0.4 });
        const how = both(p);
        set(a, 'armR', t, 0.7, 0.35); if (how === 'both') set(a, 'armL', t, 0.7, 0.35);
        takeHold(a, p, t + 0.5, how);
        set(a, 'armR', t + 0.8, restR(a), 0.4); set(a, 'armL', t + 0.8, restL(a), 0.4);
        set(a, 'facing', t + 1.1, 0, 0.4); set(a, 'lookX', t + 1.1, 0, 0.4); set(a, 'lookY', t + 1.1, 0, 0.4);
        sfx('rustle', t, { dur: 0.6, gain: 0.5 }); sfx('pop', t + 0.55, { gain: 0.25 });
        a.toYou = false;
        const dur = (t - s) + 1.4;
        return b.act === 'carry' ? dur + carryOn(b, s + dur, a, p) : dur;
      }
      if (b.act === 'carry') return carryOn(b, s, a, p);
      if (mustHold()) return 0;
      if (b.act === 'up') {
        // held up high for everyone to see (a little sparkle), then back
        const was = a.holding.how, pa = a.holding.p.asset && ASSETS.ASSETS[a.holding.p.asset], up = (pa && pa.raise) || 2.5;
        set(a, 'armR', s, up, 0.35); if (was === 'both') set(a, 'armL', s, up, 0.35);
        rehold(a, s + 0.2, 'up');
        set(a, 'lookY', s, -0.5, 0.35); set(a, 'facing', s, 0, 0.35);
        P.sparkles.push({ t: s + 0.5, who: a.id, small: true }); sfx('twinkle', s + 0.45, { midi: 93, gain: 0.12 });
        rehold(a, s + 2.0, was);
        set(a, 'armR', s + 1.9, restR(a), 0.4); set(a, 'armL', s + 1.9, restL(a), 0.4); set(a, 'lookY', s + 1.9, 0, 0.4);
        return 2.4;
      }
      if (b.act === 'put' || b.act === 'drop') {
        const dir = Math.sign(a.ch.facing.length ? a.ch.facing[a.ch.facing.length - 1].v : 0) || (a.x >= 960 ? -1 : 1);
        const x = Math.max(120, Math.min(1800, a.x + dir * (b.act === 'put' ? 100 : 75)));
        if (b.act === 'put') {
          a.ch.crouch.push({ t: s, v: 0.88, dur: 0.35 }, { t: s + 0.8, v: 1, dur: 0.4 });
          set(a, 'armR', s, 0.7, 0.35); set(a, 'armL', s, ARM_R, 0.35); set(a, 'lookY', s, 0.8, 0.3);
          letGo(a, s + 0.45, { x, fall: 'put' });
          set(a, 'armR', s + 0.8, restR(a), 0.4); set(a, 'lookY', s + 1.0, 0, 0.4);
          sfx('softLand', s + 0.7, { gain: 0.4 });
          return 1.3;
        }
        // dropped: the paws fly open, it falls with a little bounce
        set(a, 'armR', s, 1.4, 0.12); set(a, 'armL', s, 1.4, 0.12);
        letGo(a, s + 0.1, { x, fall: 'drop' });
        set(a, 'lookY', s + 0.2, 0.8, 0.25);
        set(a, 'armR', s + 0.7, restR(a), 0.4); set(a, 'armL', s + 0.7, restL(a), 0.4); set(a, 'lookY', s + 1.2, 0, 0.4);
        sfx('softLand', s + 0.1 + 0.32);
        return 1.3;
      }
      if (b.act === 'give') {
        const o = A[b.target];
        if (!o || !onStage(o)) return fail(`${title(b.target)} isn't here to take ${what}.`);
        if (o.holding) return fail(`${o.def.name}'s paws are full: ${o.def.name} is holding the ${o.holding.p.name}.`);
        if (holder === o.id) return fail(`${o.def.name}'s paws are full: ${o.def.name} is holding the star.`);
        const c = (a.x + o.x) / 2, d = pairUp(a, o, s, c, 250, false), t = s + Math.max(0, d - 0.3), dir = toward(a, o), how = a.holding.how === 'up' ? 'one' : a.holding.how;
        [[a, dir], [o, -dir]].forEach(([q, d2]) => { closeLook(q, t); set(q, 'facing', t, d2 * 0.45, 0.3); set(q, 'lookX', t, d2 * 0.6, 0.3); q.toYou = false; });
        set(a, 'armR', t, 1.25, 0.35); set(o, 'armR', t + 0.15, 1.25, 0.35);
        letGo(a, t + 0.6); takeHold(o, p, t + 0.6, how, false);
        set(a, 'armR', t + 0.9, restR(a), 0.4); set(a, 'armL', t + 0.9, restL(a), 0.4);
        set(o, 'armR', t + 0.9, restR(o), 0.4); set(o, 'armL', t + 0.9, restL(o), 0.4);
        o.out.exprs.push({ a: t + 0.5, b: t + 1.8, mood: 'happy' });
        sfx('twinkle', t + 0.6, { midi: 88, gain: 0.1 });
        return (t - s) + 1.4;
      }
      if (b.act === 'open' || b.act === 'close') {
        let d = 0;
        if (!(a.holding && a.holding.p === p)) {
          const g = groundAt(p), side = Math.sign(g.x - a.x) || 1;
          if (Math.abs(g.x - a.x) > (p.size === 'big' ? 300 : 260)) d = moveTo(a, s, g.x - side * (p.size === 'big' ? 230 : 160), false, p);
          set(a, 'facing', s + d, side * 0.6, 0.3); set(a, 'armR', s + d, 1.1, 0.35); set(a, 'armR', s + d + 0.8, restR(a), 0.4);
        } else { set(a, 'armL', s, 0.9, 0.3); set(a, 'armL', s + 0.7, restL(a), 0.4); }
        p.states.push({ t: s + d + 0.35, state: b.act === 'open' ? 'open' : 'closed' }); sfx('pop', s + d + 0.4, { gain: 0.3 });
        return d + 1.0;
      }
      return 0;
    }
    // carrying something somewhere: a spot, someone, or a prop that's here
    function carryOn(b, s, a, p) {
      if (!b.to) return 0;
      if (/^(left|center|centre|right)$/.test(b.to)) return goToSpot(a, s, spots()[spot(b.to)], false);
      const o = A[toId(b.to)];
      if (o) {
        if (!onStage(o)) { errors.push(`Line ${b.line}: ${title(b.to)} isn't here.`); return 0; }
        const d = pairUp(a, o, s, nearestSpot((a.x + o.x) / 2), GAP, false);   // (side by side, as "walks to" does)
        lookAtActor(a, o, s + Math.max(0.2, d - 0.4), false);
        return d;
      }
      const q = props[b.to];
      if (!q) { errors.push(`Line ${b.line}: there is no ${b.to} here. Use "${b.to} appears" first.`); return 0; }
      const g = groundAt(q), side = Math.sign(a.x - g.x) || -1;
      return moveTo(a, s, g.x + side * (q.size === 'big' ? 230 : 150), false, q);
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
          set(a, 'armL', s0 + 0.3, restL(a), 0.7); set(a, 'armR', s0 + 0.3, ARM_R, 0.7);
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
        if (star.state === 'held') { set(h, 'armL', s + 0.4, restL(h), 0.5); set(h, 'armR', s + 0.4, ARM_R, 0.5); holder = null; }
        P.star.push({ type: 'vanish', t0: s, t1: s + 0.8 });
        sfx('sparkles', s, { n: 4, seed: 40 });
        star = { state: 'none' };
        return 1.0;
      }
      return 0;
    }

    P.props.forEach(q => { delete q.at; });   // (only for working out where things are)
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
    if (endAt !== null) P.youtube.end.t1 = duration;
    if (P.card) P.card.t1 = duration;
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
      const init = { facing: o.firstFacing, lookX: 0, lookY: 0, tilt: 0, armL: ARM_R, armR: ARM_R, crouch: 1, air: 1, away: 0 };
      o.keys = {};
      for (const k in A[id].ch) o.keys[k] = keysFrom(k in init ? init[k] : 0, A[id].ch[k]);
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
        // (a picture place uses one of the existing place sounds)
        const amb = PLACES.PLACES[g.id].ambient || g.id;
        if (amb !== 'none') sfx('ambience', t0, { kind: amb, t1, fi: k ? PT : 1.5, fo: next ? PT : 1.5 });
        // birds sing in the meadow and the forest in the day and at sunset
        if (amb !== 'meadow' && amb !== 'forest') return;
        const calls = amb === 'forest' ? [] : [1.6, 3.3, 5.4];
        if (amb === 'forest') for (let c = 1.4, i = 0; c < t1 - t0 - 1; c += 3.2 + hash(i++ + 77) * 2.6) calls.push(c);
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
    // an intro at the very start belongs to the first scene (chapters start at 0:00)
    if (P.youtube && P.youtube.intro && P.youtube.intro.t0 === 0 && scenes.length) scenes[0].t0 = 0;
    scenes.forEach((c, i) => { c.t1 = i + 1 < scenes.length ? scenes[i + 1].t0 : duration; delete c.turn; });
    // music changes ([] means the classic music all story long)
    if (music.length) P.music = music;
    if (meta.editing === 'auto') autoEdit();
    if (shotMode) P.shots = shots;
    // the asset files the page loads, the extras on stage, and what is still missing
    P.assetFiles = [...ASSETS.FILES, ...PLACES.FILES.map(f => `places/${f}.js`)];
    P.pictures = PICTURES.descs;
    P.extras = parsed.extras || {};
    P.missing = missing;
    P.missingPlaces = missing.filter(e => e.kind === 'place').map(e => e.name);

    // Automatic coverage ("editing: auto"), like a TV editor: a medium two-shot to set up a conversation,
    // close-ups on whoever speaks, a quick reaction shot of the listener after a surprised, shy or sad line,
    // a wide shot whenever someone moves or the narrator speaks. A manual shot or camera line always wins:
    // the editor waits until the character line after it has been spoken.
    function autoEdit() {
      const lineOf = b => P.voice.find(v => v.line === b.line);
      const manual = shots.map(x => x.t).sort((a, b) => a - b);
      const holds = manual.map(m => {
        const e = log.find(x => x.s >= m && x.b.type === 'say' && x.b.who !== 'narrator');
        const v = e && lineOf(e.b);
        return [m, v ? v.t + v.len + 0.3 : m + 3];
      });
      const held = at => holds.some(([a, b]) => at >= a - 0.05 && at < b);
      const auto = [];
      let last = { t: -10, key: '' }, convo = false, speaker = null, lineEnd = -10, reaction = false;
      const cut = (at, size, on, o = {}) => {
        const key = size + JSON.stringify(on), manualBetween = manual.some(m => m > last.t && m <= at);
        // (and never just before a manual shot, which would make two cuts in a row)
        if (held(at) || key === last.key && !manualBetween || manual.some(m => m > at && m - at < 1)) return;
        if (at - last.t < 1.2 && !o.force) return;   // never cut faster than about once a second
        auto.push({ t: at, op: 'cut', size, on, dur: 0, auto: true });
        last = { t: at, key };
      };
      for (const { b, s, stage } of log) {
        if (b.type === 'say' && b.who === 'narrator') { cut(s, 'wide', { all: true }, { force: reaction }); convo = false; reaction = false; continue; }
        if (b.type === 'say') {
          const v = lineOf(b), others = stage.filter(id => id !== b.who && onStage(A[id]));
          if (!others.length) { if (speaker !== b.who) cut(s, 'medium', { actors: [b.who] }); }
          else if (!convo || s - lineEnd > 4) cut(s, 'medium', { all: true });   // set up the conversation
          else if (b.who !== speaker || reaction) cut(s, 'close', { actors: [b.who] }, { force: reaction });
          reaction = false;
          convo = others.length > 0; speaker = b.who; lineEnd = v.t + v.len;
          if (others.length && /^(surprised|shy|sad|scared|crying)$/.test(b.mood || '')) {
            cut(lineEnd + 0.1, 'close', { actors: [others[0]] }, { force: true });
            reaction = true;
          }
          continue;
        }
        if (/^(enter|walk|walkTo|exit|hug|pickup|place)$/.test(b.type) || b.type === 'star' && /^(appears|falls|rises)$/.test(b.act)) {
          cut(s, 'wide', { all: true }, { force: b.type === 'place' });
          convo = false;
        }
      }
      // at the same moment a manual shot comes after an automatic one, so the manual one wins
      shots.unshift(...auto);
      shots.sort((a, b) => a.t - b.t);
    }

    return {
      version: 2, duration, fps: 30, width: VERT ? 1080 : 1920, height: VERT ? 1920 : 1080, scale: KS, errors, cast, ...P, keys, scenes,
      musicFadeIn: 1.0, musicFadeOut: [Math.max(1, duration - 3), duration], pictureFadeOut: P.loop ? [duration + 1, duration + 2] : [duration - 0.65, duration],
      // when each story line starts: [line, seconds] (for the studio's preview; the renderer doesn't use it)
      lineTimes: log.map(x => [x.b.line, +x.s.toFixed(3)]),
    };
  }
  function estimate(text) { return 0.45 + text.split(/\s+/).length * 0.36; }

  const api = { parseStory, compileStory, evalKeys, feetY, HELP, POS, CHARACTERS, MOODS, FALLBACK, MUSIC, STYLES, PICTURES };
  if (typeof module !== 'undefined') module.exports = api; else root.StudioStory = api;
})(this);
