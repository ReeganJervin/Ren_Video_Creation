// The YouTube kit (F11 Part A): everything needed to upload a video, made next to it in videos/:
//   <name>-thumbnail.jpg   1280×720, under 2 MB: a moment of the story drawn fresh (not taken from the video)
//   <name>.srt             English subtitles from every voice line, timed to the real voice clips
//   <name>-description.txt a draft title, summary, chapters, credits and hashtags, for the owner to edit
const fs = require('fs'), path = require('path');
const { chapters } = require('./scenes');

const SERIES = 'Ren & Yuki';
const WHO = { ren: 'Ren the fox', yuki: 'Yuki the bunny' };
const srtTime = s => { const ms = Math.max(0, Math.round(s * 1000)); const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, x = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };

// A line of speech -> parts that fit 2 subtitle lines of about 42 characters each
const LINE = 42;
function wrap(text) {
  if (text.length <= LINE) return [text];
  // two lines as even as possible, breaking at a space; better after punctuation, never after a one-letter word
  let best = null;
  for (let i = 1; i < text.length; i++) if (text[i] === ' ') {
    const a = text.slice(0, i), b = text.slice(i + 1);
    const cost = Math.max(a.length, b.length) + (/[.!?,;:…]$/.test(a) ? -8 : 0) + (/(^|\s)\w$/.test(a) ? 12 : 0);
    if (!best || cost < best.cost) best = { cost, lines: [a, b] };
  }
  return best ? best.lines : [text];
}
function parts(text) {
  const out = [];
  let rest = text.replace(/\s+/g, ' ').trim();
  while (rest.length > LINE * 2) {
    // break at the last sentence end, then the last comma, then the last space that fits
    const room = rest.slice(0, LINE * 2 + 1);
    let cut = Math.max(room.lastIndexOf('. '), room.lastIndexOf('! '), room.lastIndexOf('? '), room.lastIndexOf('… '));
    if (cut < LINE * 0.6) cut = Math.max(room.lastIndexOf(', '), room.lastIndexOf('; '), room.lastIndexOf(': '));
    if (cut < LINE * 0.6) cut = room.lastIndexOf(' ') - 1;
    out.push(rest.slice(0, cut + 1).trim()); rest = rest.slice(cut + 1).trim();
  }
  if (rest) out.push(rest);
  return out;
}

// SubRip subtitles: every voice line (the narrator too, no speaker names), split into readable parts, each part
// on screen for its share of the line's real length. Returns { text, cues }.
function subtitles(plan) {
  const cues = [];
  plan.voice.forEach((v, i) => {
    const next = plan.voice[i + 1], end = Math.min(v.t + v.len, next ? next.t - 0.05 : plan.duration);
    const ps = parts(v.text), total = ps.reduce((s, p) => s + p.length, 0);
    let t = v.t;
    ps.forEach(p => { const d = (end - v.t) * p.length / total; cues.push({ t0: t, t1: t + d, lines: wrap(p) }); t += d; });
  });
  return { cues: cues.length, text: cues.map((c, i) => `${i + 1}\n${srtTime(c.t0)} --> ${srtTime(c.t1)}\n${c.lines.join('\n')}\n`).join('\n') };
}

// The description draft: title, a 2–3 sentence summary from the story, chapters, credits, hashtags, and a reminder.
function description(plan, credits) {
  const title = (plan.meta.title || 'A new story').trim();
  const full = `${title} | ${SERIES}`;
  // the summary: the narrator's first sentences, or who is in it and where
  const sentences = plan.voice.filter(v => v.who === 'narrator').map(v => v.text.replace(/^[.…\s]+|[.…\s]+$/g, '').trim()).filter(Boolean)
    .flatMap(t => t.match(/[^.!?]+[.!?]*/g) || []).map(s => s.trim()).filter(s => s.length > 3).map(s => (/[.!?]$/.test(s) ? s : s + '.'));
  const summary = [];
  for (const s of sentences) { if (summary.length >= 3 || summary.join(' ').length + s.length > 320) break; summary.push(s); }
  const stars = plan.cast.filter(id => WHO[id]).map(id => WHO[id]);
  const place = (plan.meta.place || 'meadow').replace(/-/g, ' ');
  if (summary.length < 2) summary.push(`${stars.length ? `A ${SERIES} story with ${stars.join(' and ')}` : `A ${SERIES} story`}, in the ${place}.`);
  const ch = chapters(plan);
  const tag = s => '#' + s.replace(/(^|\s)(\w)/g, (_, a, c) => c.toUpperCase()).replace(/[^\w]/g, '');
  const tags = ['#RenAndYuki', '#Animation', '#FamilyAnimation', '#Storytime', tag(place)];
  // YouTube does not make links clickable in a Short's description; the "Related video" setting is the clickable way
  const isShort = /short/.test(plan.meta.type || '');
  const from = (plan.meta.from || '').trim();
  const shortNote = !isShort ? [] : [
    "SHORTS LINK: Links typed in a Short's description are NOT clickable (YouTube blocks them).",
    `To link ${from ? `the full episode (${from})` : 'a full episode'}: YouTube Studio > Content > Shorts > this Short > Details >`,
    "'Related video', then pick the episode. It shows as a tappable link above the title in the Shorts player.", '',
  ];
  return [
    'TITLE (draft, under 70 characters)', full.length <= 70 ? full : title.slice(0, 70), '',
    'SUMMARY (draft)', summary.join(' '), '',
    ...(ch.text ? ['CHAPTERS', ch.text.trim(), ''] : []),
    'CREDITS', credits.trim(), '',
    'HASHTAGS', tags.join(' '), '',
    ...shortNote,
    "Reminder: Check YouTube's 'altered or synthetic content' and 'Made for Kids' settings before publishing.", '',
  ].join('\n');
}

// The thumbnail's words: "thumbnail text:" if the story has it ("none" for no words), else a Short's hook, else
// (an episode or any other long video) the story's own title
function thumbText(plan) {
  const m = plan.meta;
  if (m.thumbnailText !== undefined) return m.thumbnailText;
  if (plan.hook && plan.hook.text) return plan.hook.text;
  return /short/.test(m.type || '') ? '' : (m.title || '').trim();
}

// The thumbnail, drawn in the engine's page (opened with &export=1). Picks the moment, draws it, adds the text,
// and returns { jpg (Buffer), t, how, warnings }.
async function thumbnail(page, plan) {
  // (the picture is drawn clean, without bubbles, captions and title cards, so those don't matter)
  const busy = [
    ...(plan.places || []).map(p => [p.t0 - 0.2, p.t1 + 0.3]),
    // the series intro and the end screen; a Short's hook, big captions and end card
    ...Object.values(plan.youtube || {}).map(y => [y.t0 - 0.5, y.t1 + 0.5]),
    ...[plan.card].filter(Boolean).map(y => [y.t0 - 0.2, y.t1 + 0.2]),
    // props growing in or fading out
    ...(plan.props || []).flatMap(p => [[p.t0 - 0.1, p.t0 + 1.2], ...(p.t1 !== undefined && p.t1 !== null ? [[p.t1 - 1.2, p.t1 + 0.1]] : [])]),
  ];
  const extras = Object.keys(plan.extras || {});
  const mains = plan.cast.filter(id => !extras.includes(id));   // the characters (extras are a bonus)
  const want = plan.meta.thumbnail || { auto: true };
  if (want.scene && !plan.scenes[want.scene - 1]) throw new Error(`"thumbnail: scene ${want.scene}": this story has ${plan.scenes.length} scene(s).`);
  if (want.t !== undefined && want.t > plan.duration) throw new Error(`"thumbnail: ${want.t}": the story is only ${plan.duration.toFixed(1)} s long.`);
  // the framing: a medium shot unless the story says otherwise ("thumbnail shot: wide | medium | close")
  const shot = plan.meta.thumbnailShot || 'medium';
  const vertical = plan.height > plan.width;
  const r = await page.evaluate(async ({ busy, mains, extras, want, duration, scenes, text, shot, vertical, PW }) => {
    // a thumbnail is 1280×720; a vertical video's cover frame is 1080×1920
    const W = vertical ? 1080 : 1280, H = vertical ? 1920 : 720, S = W / PW, TOP = vertical ? 170 : 30;
    const cv = Object.assign(document.createElement('canvas'), { width: W, height: H }), g = cv.getContext('2d');
    // the title first: big, bold, rounded letters, on one line or two even ones, as big as fits
    let size = 118, lines = [];
    if (text) {
      const words = text.split(/\s+/), fits = ls => ls.every(l => g.measureText(l).width <= W - 100);
      for (;;) {
        // (the outline eats into the spaces between words, so they are wider, as in the engine's big text)
        g.font = `700 ${size}px Fredoka`; g.wordSpacing = `${Math.round(size * 0.22)}px`;
        if (fits([text])) { lines = [text]; break; }
        let two = null;
        for (let i = 1; i < words.length; i++) { const x = words.slice(0, i).join(' '), y = words.slice(i).join(' '); const w = Math.max(g.measureText(x).width, g.measureText(y).width); if (!two || w < two.w) two = { w, ls: [x, y] }; }
        if (two && fits(two.ls)) { lines = two.ls; break; }
        if (size <= 56) { lines = two ? two.ls : [text]; break; }
        size -= 6;
      }
    }
    const lh = size * 1.08, blockH = lines.length * lh;
    // the framing: in a medium or close shot the characters stand below the title
    StudioFilm.frame(shot === 'wide' ? null : shot, mains, lines.length ? (TOP + blockH) / H + 0.02 : 0);
    try {
      const inBusy = t => busy.some(([x, y]) => t >= x && t <= y);
      // how good a moment is: the main characters fully in the frame, facing front, surprised or excited (or happy),
      // eyes open, standing still; extras in the picture are a bonus
      const MOOD = { surprised: 25, excited: 25, joy: 22, laughing: 18, happy: 14, playful: 12, proud: 10, determined: 8 };
      const score = t => {
        const faces = StudioFilm.faces(t), seen = mains.filter(id => faces.some(f => f.id === id && !f.cut));
        let s = seen.length * 40 - (mains.length - seen.length) * 60 + extras.filter(id => faces.some(f => f.id === id && !f.cut)).length * 10;
        for (const id of seen) {
          const K = StudioFilm.pose(id, t), m = StudioFilm.mood(id, t);
          s += 12 * (1 - Math.min(1, Math.abs(K.f) / 0.6)) + (MOOD[m] || 0) - (K.blink > 0.05 ? 40 : 0) - (K.walk > 0.1 ? 10 : 0);
        }
        // faces in front of each other (an extra flying past a character's head)
        const hit = (p, q) => p.box.x0 < q.box.x1 && q.box.x0 < p.box.x1 && p.box.y0 < q.box.y1 && q.box.y0 < p.box.y1;
        faces.forEach((p, i) => faces.slice(i + 1).forEach(q => { if (hit(p, q)) s -= 30; }));
        // a face cut by the edge of the picture
        s -= faces.filter(f => f.cut).length * 30;
        return { s, all: seen.length === mains.length };
      };
      let t, how;
      if (want.t !== undefined) { t = want.t; how = 'chosen in the story'; }
      else if (want.scene) { const c = scenes[want.scene - 1]; t = (c.t0 + c.t1) / 2; how = `the middle of scene ${want.scene}`; }
      else {
        let best = null;
        for (let x = 1.5; x < duration - 2.5; x += 0.2) {
          if (inBusy(x)) continue;
          const r = score(x); if (!best || r.s > best.s) best = { ...r, t: x };
        }
        t = best ? best.t : Math.min(duration / 3, 5); how = 'auto';
        if (best && !best.all) how += ' (no moment shows every character fully, so the closest one)';
      }
      // problems a viewer would notice
      const warnings = [];
      if (inBusy(t)) warnings.push('the moment is during a change of place, an appearing prop, the intro, the end screen or the end card');
      const cut = StudioFilm.faces(t).filter(f => f.cut).map(f => f.id);
      if (cut.length) warnings.push(`a face is cut off at the edge (${cut.join(', ')})`);
      // draw the moment fresh and make it 1280×720
      StudioFilm.render(t, true);
      g.imageSmoothingQuality = 'high'; g.drawImage(document.getElementById('film'), 0, 0, W, H);
      if (lines.length) {
        // at the top in a medium or close shot (the framing left room); in a wide shot wherever it covers no face
        let y0 = TOP;
        if (shot === 'wide') {
          const boxes = StudioFilm.faces(t).map(f => ({ x0: f.box.x0 * S, x1: f.box.x1 * S, y0: f.box.y0 * S, y1: f.box.y1 * S }));
          const overlap = y => boxes.reduce((s, b) => s + Math.max(0, Math.min(b.y1, y + blockH) - Math.max(b.y0, y)) * Math.max(0, Math.min(b.x1, W - 50) - Math.max(b.x0, 50)), 0);
          y0 = [TOP, H - TOP - blockH, (H - blockH) / 2].reduce((x, y) => (overlap(y) < overlap(x) ? y : x));
        }
        g.textAlign = 'center'; g.textBaseline = 'top'; g.lineJoin = 'round'; g.font = `700 ${size}px Fredoka`; g.wordSpacing = `${Math.round(size * 0.22)}px`;
        lines.forEach((l, i) => {
          const y = y0 + i * lh;
          g.fillStyle = 'rgba(40,20,10,0.35)'; g.fillText(l, W / 2 + size * 0.04, y + size * 0.07);
          g.lineWidth = size * 0.17; g.strokeStyle = '#4a2616'; g.strokeText(l, W / 2, y);
          g.fillStyle = '#fff4e4'; g.fillText(l, W / 2, y);
        });
      }
      // under 2 MB (YouTube's limit)
      let q = 0.92, url;
      do { url = cv.toDataURL('image/jpeg', q); q -= 0.08; } while (url.length * 0.75 > 1.9e6 && q > 0.4);
      return { url, t, how, warnings };
    } finally { StudioFilm.frame(null); }
  }, { busy, mains, extras, want, duration: plan.duration, scenes: plan.scenes.map(c => ({ t0: c.t0, t1: c.t1 })), text: thumbText(plan), shot, vertical, PW: plan.width });
  return { jpg: Buffer.from(r.url.split(',')[1], 'base64'), t: r.t, how: `${r.how}, ${shot} shot`, warnings: r.warnings };
}

// All three files for a plan; returns the report row.
async function youtubeFiles(page, plan, name, outDir, credits) {
  const made = [], warnings = [];
  try {
    // (a vertical video gets a 1080×1920 cover frame instead of a thumbnail)
    const th = await thumbnail(page, plan), cover = plan.height > plan.width;
    fs.writeFileSync(path.join(outDir, `${name}-${cover ? 'cover' : 'thumbnail'}.jpg`), th.jpg);
    made.push(`${cover ? 'cover frame' : 'thumbnail'} at ${th.t.toFixed(1)} s (${th.how})`);
    warnings.push(...th.warnings.map(w => `${cover ? 'cover' : 'thumbnail'}: ${w}`));
  } catch (e) { warnings.push(`no thumbnail: ${e.message}`); }
  const srt = subtitles(plan);
  fs.writeFileSync(path.join(outDir, `${name}.srt`), srt.text);
  made.push(`subtitles (${srt.cues} parts)`);
  fs.writeFileSync(path.join(outDir, `${name}-description.txt`), description(plan, credits));
  made.push('description draft');
  return { ok: true, warn: warnings.length > 0, note: !warnings.length, name: 'YouTube files', detail: made.join(', ') + (warnings.length ? '. ' + warnings.join('; ') : '') };
}

module.exports = { youtubeFiles, subtitles, description, thumbnail, wrap, parts };
