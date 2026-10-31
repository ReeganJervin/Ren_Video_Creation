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

const SETTINGS = {
  title: 'title', project: 'project', aspect: 'aspect', 'aspect ratio': 'aspect', characters: 'characters', style: 'style',
  place: 'place', model: 'model', 'frame model': 'frameModel', duration: 'duration', resolution: 'resolution',
  'max credits': 'maxCredits', quality: 'quality',
};
const ASPECTS = ['16:9', '9:16'];

function parseFlowStory(text) {
  const meta = { aspect: '9:16', characters: [], maxCredits: 25, quality: 'original' }, frames = [], clips = [], errors = [];
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
      cur = { n: num, line: n, from: +m[2], to: +m[3], text: m[4] }; clips.push(cur); return;
    }
    if (/^clip\s+\d+/i.test(line)) return err(n, 'write a clip like this: "clip 1: frame 1 to frame 2", then what happens on the next lines.');
    if (!cur && (m = line.match(/^([a-z ]+?)\s*:\s*(.+)$/i)) && SETTINGS[m[1].toLowerCase()]) {
      const key = SETTINGS[m[1].toLowerCase()], v = m[2].trim();
      if (key === 'characters') meta.characters = v.split(/\s*,\s*|\s+and\s+/i).filter(Boolean);
      else if (key === 'aspect') { if (!ASPECTS.includes(v)) return err(n, `aspect must be 9:16 (Shorts) or 16:9 (wide).`); meta.aspect = v; }
      else if (key === 'maxCredits') { if (!/^\d+$/.test(v)) return err(n, 'max credits must be a number, like 25.'); meta.maxCredits = +v; }
      else if (key === 'duration') { if (!/^(4|6|8|10)$/.test(v)) return err(n, 'duration must be 4, 6, 8 or 10 (seconds). Veo clips are always 8.'); meta.duration = +v; }
      else if (key === 'resolution') { if (!/^(360p|720p)$/.test(v)) return err(n, 'resolution must be 360p or 720p.'); meta.resolution = v; }
      else if (key === 'quality') { if (!/^(original|upscaled)$/.test(v)) return err(n, 'quality must be original or upscaled (1080p, free, slower).'); meta.quality = v; }
      else meta[key] = v;
      return;
    }
    if (!cur) return err(n, `I don't know "${line.slice(0, 40)}". Settings go at the top (title:, project:, style:...), then "frame 1:" and "clip 1: frame 1 to frame 2".`);
    cur.text = (cur.text ? cur.text + ' ' : '') + line;
  });
  if (!meta.title) errors.push('The story needs a "title:" line.');
  meta.project = (meta.project || meta.title || 'flow-story').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  [...frames, ...clips].forEach(x => { x.text = x.text.trim(); if (!x.text) err(x.line, `${x.from ? 'clip' : 'frame'} ${x.n} has no description.`); });
  clips.forEach(c => [c.from, c.to].forEach(f => { if (!frames.some(x => x.n === f)) err(c.line, `clip ${c.n} uses frame ${f}, but there is no "frame ${f}:".`); }));
  if (!frames.length) errors.push('The story has no frames ("frame 1: ...").');
  frames.sort((a, b) => a.n - b.n); clips.sort((a, b) => a.n - b.n);
  return { meta, frames, clips, errors };
}

// The full prompts sent to Flow. Frames get the style and the place, and the Flow characters named in them as
// references; clips get the style (their look comes from their two frames).
const sentence = s => { s = (s || '').trim(); return !s ? '' : /[.!?]$/.test(s) ? s : s + '.'; };
function framePrompt(meta, f) { return [sentence(meta.style), sentence(meta.place), f.text].filter(Boolean).join(' '); }
function clipPrompt(meta, c) { return [sentence(meta.style), c.text].filter(Boolean).join(' '); }
// the characters a frame mentions by name (Flow takes up to 3 references, one of them may be the previous frame)
function castOf(meta, text) { return meta.characters.filter(name => new RegExp(`\\b${name.replace(/[^\w ]/g, '')}\\b`, 'i').test(text)); }

module.exports = { parseFlowStory, framePrompt, clipPrompt, castOf };
