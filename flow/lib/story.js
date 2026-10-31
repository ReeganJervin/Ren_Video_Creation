// Reads a Flow story file: the settings at the top, then the frames (free stills) and the clips (paid videos, each
// from one frame to another). Returns { meta, frames, clips, errors }. Nothing here talks to Flow.
//
//   title: The Bravest Fox
//   project: bravest-fox
//   aspect: 9:16
//   characters: Ren, Yuki
//   style: Cute 2D chibi storybook cartoon...
//   place: A cozy forest path at dusk...
//
//   frame 1: Ren and Yuki walk side by side...
//   clip 1: frame 1 to frame 2
//   They walk along the path. A twig snaps...
//   Yuki (soft, curious): "Ren... did you hear that?"
//
// A frame or clip goes on until the next "frame" or "clip" line; its lines are joined with spaces.
// Lines starting with # are notes.
//
// In a clip, a line like  Ren (proud): "I'm a snow expert."  is something said. With "voices: none" (the default),
// Flow is asked for no voices (it makes up a new voice for every clip), and what is said is shown in speech bubbles
// on the film instead ("bubbles: on", the default). "voices: kitsu" also speaks them with Kitsu Studio's own voices.
// "(left)" or "(right)" in the brackets says which side the speaker is on, for the bubble's tail ("sides: Ren left,
// Yuki right" says it once for the whole story), and "(at 2s)" when the line starts in its clip.

const SETTINGS = {
  title: 'title', project: 'project', aspect: 'aspect', 'aspect ratio': 'aspect', characters: 'characters', style: 'style',
  place: 'place', model: 'model', 'frame model': 'frameModel', duration: 'duration', resolution: 'resolution',
  'max credits': 'maxCredits', quality: 'quality', voices: 'voices', bubbles: 'bubbles', sides: 'sides',
};
// something said:  Name (notes): "words"  (the quotes are what tells it apart from an action)
const SAID = /^([A-Z][\w' -]{0,30}?)\s*(?:\(([^)]*)\))?\s*:\s*["“](.+?)["”]\s*$/;
const ASPECTS = ['16:9', '9:16'];

function parseFlowStory(text) {
  const meta = { aspect: '9:16', characters: [], maxCredits: 25, quality: 'original', voices: 'none', bubbles: true, sides: {} }, frames = [], clips = [], errors = [];
  let cur = null;
  const err = (n, msg) => errors.push(`Line ${n}: ${msg}`);
  text.split(/\r?\n/).forEach((raw, i) => {
    const n = i + 1, line = raw.trim();
    if (!line || line.startsWith('#')) return;
    let m;
    if ((m = line.match(/^frame\s+(\d+)\s*:\s*(.*)$/i))) {
      const num = +m[1];
      if (frames.some(f => f.n === num)) return err(n, `there are two frames called "frame ${num}".`);
      cur = { n: num, line: n, text: m[2] }; frames.push(cur); return;
    }
    if ((m = line.match(/^clip\s+(\d+)\s*:\s*(?:from\s+)?frame\s+(\d+)\s*(?:to|->|→)\s*frame\s+(\d+)\s*:?\s*(.*)$/i))) {
      const num = +m[1];
      if (clips.some(c => c.n === num)) return err(n, `there are two clips called "clip ${num}".`);
      cur = { n: num, line: n, from: +m[2], to: +m[3], text: m[4], action: m[4], lines: [] }; clips.push(cur); return;
    }
    if (/^clip\s+\d+/i.test(line)) return err(n, 'write a clip like this: "clip 1: frame 1 to frame 2", then what happens on the next lines.');
    if (!cur && (m = line.match(/^([a-z ]+?)\s*:\s*(.+)$/i)) && SETTINGS[m[1].toLowerCase()]) {
      const key = SETTINGS[m[1].toLowerCase()], v = m[2].trim();
      if (key === 'characters') meta.characters = v.split(/\s*,\s*|\s+and\s+/i).filter(Boolean);
      else if (key === 'aspect') { if (!ASPECTS.includes(v)) return err(n, `aspect must be 9:16 (Shorts) or 16:9 (wide).`); meta.aspect = v; }
      else if (key === 'maxCredits') { if (!/^\d+$/.test(v)) return err(n, 'max credits must be a number, like 25.'); meta.maxCredits = +v; }
      else if (key === 'duration') { if (!/^(4|6|8|10)$/.test(v)) return err(n, 'duration must be 4, 6, 8 or 10 (seconds). Veo clips are always 8.'); meta.duration = +v; }
      else if (key === 'resolution') { if (!/^(360p|720p)$/.test(v)) return err(n, 'resolution must be 360p or 720p.'); meta.resolution = v; }
      else if (key === 'voices') { if (!/^(none|flow|kitsu)$/i.test(v)) return err(n, "voices must be kitsu (Kitsu Studio's own Ren and Yuki voices), none (bubbles only, the default) or flow (Flow makes the voices)."); meta.voices = v.toLowerCase(); }
      else if (key === 'bubbles') { if (!/^(on|off)$/i.test(v)) return err(n, 'bubbles must be on or off.'); meta.bubbles = /^on$/i.test(v); }
      else if (key === 'sides') {
        for (const part of v.split(/\s*,\s*/)) {
          const k = part.match(/^(.+?)\s+(left|right|middle)$/i);
          if (!k) return err(n, 'write sides like this: sides: Ren left, Yuki right');
          meta.sides[k[1].toLowerCase()] = k[2].toLowerCase();
        }
      }
      else if (key === 'quality') { if (!/^(original|upscaled)$/.test(v)) return err(n, 'quality must be original or upscaled (1080p, free, slower).'); meta.quality = v; }
      else meta[key] = v;
      return;
    }
    if (!cur) return err(n, `I don't know "${line.slice(0, 40)}". Settings go at the top (title:, project:, style:...), then "frame 1:" and "clip 1: frame 1 to frame 2".`);
    cur.text = (cur.text ? cur.text + ' ' : '') + line;
    if (cur.lines) {
      const said = line.match(SAID);
      if (said) {
        const notes = (said[2] || '').split(/\s*,\s*/).filter(Boolean), side = notes.find(x => /^(left|right|middle)$/i.test(x));
        // "at 2s": when the line starts in its clip
        const at = notes.find(x => /^at\s+\d+(\.\d+)?\s*s?$/i.test(x));
        cur.lines.push({ who: said[1].trim(), notes: notes.filter(x => x !== side && x !== at).join(', '), text: said[3].trim(), side: side && side.toLowerCase(),
          at: at ? parseFloat(at.replace(/[^\d.]/g, '')) : null, line: n });
      } else cur.action = (cur.action ? cur.action + ' ' : '') + line;
    }
  });
  if (!meta.title) errors.push('The story needs a "title:" line.');
  meta.project = (meta.project || meta.title || 'flow-story').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  [...frames, ...clips].forEach(x => { x.text = x.text.trim(); if (!x.text) err(x.line, `${x.from ? 'clip' : 'frame'} ${x.n} has no description.`); });
  clips.forEach(c => {
    c.action = (c.action || '').trim();
    c.lines.forEach(l => { l.side = l.side || meta.sides[l.who.toLowerCase()] || null; if (l.text.length > 90) err(l.line, `that line is long for a bubble (${l.text.length} letters). Keep it under 90, or split it in two.`); });
    if (meta.voices !== 'flow' && !c.action) err(c.line, `clip ${c.n} only has words. Add a line saying what happens (Flow only gets the action, not the words).`);
    if (meta.duration) c.lines.forEach(l => { if (l.at !== null && l.at >= meta.duration) err(l.line, `"at ${l.at}s" is after the end of the clip (${meta.duration} s).`); });
  });
  clips.forEach(c => [c.from, c.to].forEach(f => { if (!frames.some(x => x.n === f)) err(c.line, `clip ${c.n} uses frame ${f}, but there is no "frame ${f}:".`); }));
  if (!frames.length) errors.push('The story has no frames ("frame 1: ...").');
  frames.sort((a, b) => a.n - b.n); clips.sort((a, b) => a.n - b.n);
  return { meta, frames, clips, errors };
}

// The full prompts sent to Flow. Frames get the style and the place, and the Flow characters named in them as
// references; clips get the style (their look comes from their two frames).
const sentence = s => { s = (s || '').trim(); return !s ? '' : /[.!?]$/.test(s) ? s : s + '.'; };
function framePrompt(meta, f) { return [sentence(meta.style), sentence(meta.place), f.text].filter(Boolean).join(' '); }
// With "voices: none" the words stay out of the prompt (they go in bubbles): Flow gets the action and how each speaker
// feels, and is asked for no voices at all, so the voices can't change from clip to clip.
function clipPrompt(meta, c) {
  if (meta.voices === 'flow') return [sentence(meta.style), c.text].filter(Boolean).join(' ');
  const acting = c.lines.map(l => `${l.who} ${l.notes ? `reacts (${l.notes})` : 'reacts'} with a clear expression and body language.`);
  return [sentence(meta.style), sentence(c.action), ...acting,
    'Nobody speaks: no dialogue, no voices, no narration, no singing, and no text or speech bubbles on screen. Only soft natural sounds and gentle music.'].filter(Boolean).join(' ');
}
// the characters a frame mentions by name (Flow takes up to 3 references, one of them may be the previous frame)
function castOf(meta, text) { return meta.characters.filter(name => new RegExp(`\\b${name.replace(/[^\w ]/g, '')}\\b`, 'i').test(text)); }

module.exports = { parseFlowStory, framePrompt, clipPrompt, castOf };
