// Asset registry: every prop, set piece, extra and place in one list, found automatically.
// Adding an asset = one file in engine/props/, engine/extras/ or engine/places/ that calls register({...}).
// Nothing else needs editing: in Node the folders are scanned; in the browser the plan lists the files to load.
//
// A description has:
//   id        file name, lowercase with dashes ("cottage-garden")
//   kind      'prop' | 'extra' | 'place'
//   names     what a story may call it ("lantern", "old lantern"); "the" is always allowed in front
//   size      'small' (held in a paw) | 'medium' | 'big' (a set piece), and height in px at character scale
//   states    e.g. ['closed', 'open'] or ['off', 'glowing'] (optional; the first one is where it starts)
//   glow      true if "the X glows" works
//   hold      'one paw' | 'both paws' (not for big props)
//   anchors, motion, sounds   optional
//   draw(c, t, state, light)   the drawing, with (0, 0) where it stands on the ground. light = { tau, tint }
//   Things that give light are never darkened by the time of day (they look brightest at night):
//   emissive  true if the whole asset gives light (the star): it is drawn after the time-of-day colour
//   drawLight(c, t, state, light)   optional: just the parts that give light, drawn after the time-of-day colour
//   credit    who made it
// Extras also have moves ('walk' | 'hop' | 'fly' | 'swim' | 'float') and draw(c, K) like a character.
(function (root) {
  const ASSETS = {};
  const norm = s => String(s).toLowerCase().trim().replace(/^(the|a|an) /, '').replace(/[-_\s]+/g, ' ');
  const SIZES = { small: 80, medium: 170, big: 360 };
  function register(def) {
    const a = { kind: 'prop', size: 'small', states: [], credit: 'Claude Code', ...def };
    a.names = (a.names || [a.id.replace(/-/g, ' ')]).map(norm);
    a.height = a.height || SIZES[a.size] || SIZES.small;
    ASSETS[a.id] = a;
    return a;
  }
  const find = (name, kind) => { const n = norm(name); return Object.values(ASSETS).find(a => (!kind || a.kind === kind) && a.names.includes(n)); };
  const all = kind => Object.values(ASSETS).filter(a => !kind || a.kind === kind);

  // spelling help: the known name closest to a typo (at most 2 letters off, and not for very short words)
  function dist(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  }
  function suggest(name, candidates) {
    const n = norm(name);
    if (n.length < 4) return null;
    let best = null;
    for (const c of candidates) { const k = dist(n, norm(c)); if (k > 0 && k <= (n.length < 7 ? 1 : 2) && (!best || k < best.k)) best = { k, name: c }; }
    return best && best.name;
  }

  // Things a story usually means as a big set piece, so a missing one gets a set-piece placeholder.
  const BIG = /\b(house|cottage|hut|tent|well|tree|stump|cart|wagon|signpost|sign|tower|castle|bridge|boat|statue|rock|boulder|gate|fence|door|shop|bakery|barn|mill|fountain|bench|table)\b/;
  const guessSize = name => (BIG.test(norm(name)) ? 'big' : 'small');

  // A simple extra (animal or creature) works on the stage like a small character: this makes its description.
  function extraCharacter(id, a) {
    const h = a.height || 110, fly = /^(fly|float)$/.test(a.moves || '') ? 230 : 0;
    // (the F12 moods are there too; an extra shows them as the nearest older mood, and --check says so)
    const moods = {}; ['normal', 'happy', 'surprised', 'shy', 'sad', 'sleepy', 'playful', 'pouty', 'joy',
      'excited', 'proud', 'thinking', 'worried', 'scared', 'determined', 'laughing', 'crying'].forEach(m => { moods[m] = {}; });
    return {
      name: a.label || id.replace(/-/g, ' ').replace(/^./, ch => ch.toUpperCase()), extra: true, missing: !!a.missing,
      moves: a.moves === 'hop' ? 'hop' : 'walk', fly, speed: 240, hop: { h: Math.round(h * 0.4), sound: 'light' },
      head: -h * 0.62, chest: -h * 0.3, overhead: -h * 1.15, catch: -h * 0.35, sparkle: -h * 0.6, moods, height: h,
    };
  }

  // Node: find every asset file in the asset folders and load it. (Places load through places/index.js.)
  const FILES = [];
  if (typeof module !== 'undefined') {
    const fs = require('fs'), path = require('path');
    module.exports = { ASSETS, register, find, all, norm, suggest, guessSize, extraCharacter, FILES, SIZES };
    for (const dir of ['props', 'extras']) {
      const d = path.join(__dirname, dir);
      if (!fs.existsSync(d)) continue;
      for (const f of fs.readdirSync(d).sort()) if (f.endsWith('.js') && !f.startsWith('_')) { FILES.push(`${dir}/${f}`); require(path.join(d, f)); }
    }
  } else root.StudioAssets = { ASSETS, register, find, all, norm, suggest, guessSize, extraCharacter, FILES, SIZES };
})(this);
