// Speech bubbles on the finished film, in Kitsu Studio's style: a soft white rounded bubble, a warm dark-brown
// outline, Fredoka letters and a little tail toward whoever is speaking (left, right, or the middle when unknown).
// One bubble at a time, near the top of the picture where faces rarely are. With voices, each bubble shows while its
// line is spoken, and the clips' own sound is turned down a little under the voices. The bubbles are drawn in a hidden
// browser page (Playwright, which Kitsu Studio already has) and laid over the film with FFmpeg.
const fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const { FFMPEG } = require('./join');

const FONT = path.join(__dirname, '..', 'fonts', 'fredoka-700.woff2');
const LINE = '#4a2616', FILL = '#fffaf2', TEXT = '#3a2414';

// how long a line takes to read (or say) when there is no voice to measure
const readTime = text => Math.max(1.3, 0.6 + text.length * 0.06);

// When each line shows (and is spoken): [{ text, side, wav, t0, t1 }] in film time, plus warnings.
// clips: [{ duration, lines: [{ text, side, at, len?, wav? }] }] (len: the voice line's length, when there is one).
// A line with "at" starts then; the others follow one another. Without voices, the lines are spread over the clip
// (longer lines get more time); with voices, each bubble stays for its line and a moment more.
function bubbleTimes(clips) {
  const out = [], warnings = [];
  let at = 0;
  clips.forEach((c, ci) => {
    const n = c.lines.length, pad = Math.min(0.4, c.duration * 0.05), voiced = c.lines.some(l => l.len);
    if (!n) { at += c.duration; return; }
    const len = c.lines.map(l => l.len || readTime(l.text));
    // without voices and without "at", stretch the reading times to fill the clip
    const free = c.lines.every(l => l.at === null || l.at === undefined) && !voiced;
    const scale = free ? Math.max(1, (c.duration - 2 * pad - 0.25 * (n - 1)) / len.reduce((s, x) => s + x, 0)) : 1;
    let cursor = pad;
    const starts = c.lines.map((l, i) => { const s = l.at !== null && l.at !== undefined ? l.at : cursor; cursor = s + len[i] * scale + 0.25; return s; });
    c.lines.forEach((l, i) => {
      const t0 = starts[i], next = i + 1 < n ? starts[i + 1] : c.duration;
      const t1 = Math.min(next - 0.05, c.duration - 0.05, t0 + len[i] * scale + (voiced ? 0.5 : 0));
      if (t0 + len[i] > c.duration + 0.05) warnings.push(`clip ${ci + 1}: "${l.text.slice(0, 40)}" goes on past the end of the clip. Shorten it, or start it earlier ("at").`);
      if (i && t0 < starts[i - 1] + len[i - 1] - 0.05 && voiced) warnings.push(`clip ${ci + 1}: "${l.text.slice(0, 40)}" starts before the line before it has finished.`);
      out.push({ text: l.text, side: l.side, wav: l.wav, t0: at + t0, t1: at + Math.max(t0 + 0.8, t1) });
    });
    at += c.duration;
  });
  return { items: out, warnings };
}

// one transparent picture the size of the film per bubble
async function drawBubbles(items, W, H) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const font = `data:font/woff2;base64,${fs.readFileSync(FONT).toString('base64')}`;
    return await page.evaluate(async ({ items, W, H, font, LINE, FILL, TEXT }) => {
      const face = new FontFace('Fredoka', `url(${font})`, { weight: '700' });
      await face.load(); document.fonts.add(face);
      const tall = H > W, size = Math.round((tall ? W * 0.062 : H * 0.055)), maxW = W * (tall ? 0.8 : 0.6), lw = Math.max(3, size * 0.12);
      return items.map(({ text, side }) => {
        const cv = Object.assign(document.createElement('canvas'), { width: W, height: H }), g = cv.getContext('2d');
        g.font = `700 ${size}px Fredoka`;
        // words into lines that fit, then as even as possible (no single word left alone on the last line)
        const wrap = width => {
          const out = [];
          for (const word of text.split(/\s+/)) {
            const last = out[out.length - 1];
            if (last && g.measureText(`${last} ${word}`).width <= width) out[out.length - 1] = `${last} ${word}`; else out.push(word);
          }
          return out;
        };
        let width = maxW - size * 1.4, lines = wrap(width);
        for (let w = width * 0.95; w > size * 3; w *= 0.95) { const t = wrap(w); if (t.length > lines.length) break; lines = t; }
        const lh = size * 1.18, bw = Math.max(...lines.map(l => g.measureText(l).width)) + size * 1.4, bh = lines.length * lh + size * 0.9;
        const cx = side === 'left' ? Math.max(bw / 2 + W * 0.04, W * 0.38) : side === 'right' ? Math.min(W - bw / 2 - W * 0.04, W * 0.62) : W / 2;
        const x = cx - bw / 2, y = H * (tall ? 0.07 : 0.06), r = Math.min(bh / 2, size * 0.9);
        // the tail points down toward the speaker's side
        const tx = side === 'left' ? x + bw * 0.28 : side === 'right' ? x + bw * 0.72 : cx, dir = side === 'left' ? -1 : side === 'right' ? 1 : 0;
        g.lineJoin = 'round'; g.lineWidth = lw; g.strokeStyle = LINE; g.fillStyle = FILL;
        g.shadowColor = 'rgba(60,30,10,0.18)'; g.shadowBlur = size * 0.4; g.shadowOffsetY = size * 0.12;
        g.beginPath(); g.roundRect(x, y, bw, bh, r);
        const tw = size * 0.7, tipX = tx + dir * size * 0.55, tipY = y + bh + size * 0.85;
        g.moveTo(tx - tw, y + bh - 1); g.quadraticCurveTo(tx - tw * 0.2, y + bh + size * 0.3, tipX, tipY); g.quadraticCurveTo(tx + tw * 0.2, y + bh + size * 0.3, tx + tw, y + bh - 1);
        g.fill(); g.shadowColor = 'transparent'; g.stroke();
        // cover the outline where the tail joins the bubble
        g.beginPath(); g.moveTo(tx - tw + lw, y + bh - lw); g.quadraticCurveTo(tx - tw * 0.2, y + bh + size * 0.3 - lw, tipX, tipY - lw * 1.8); g.quadraticCurveTo(tx + tw * 0.2, y + bh + size * 0.3 - lw, tx + tw - lw, y + bh - lw); g.closePath(); g.fill();
        g.fillStyle = TEXT; g.textAlign = 'center'; g.textBaseline = 'middle';
        lines.forEach((l, i) => g.fillText(l, cx, y + size * 0.45 + lh * (i + 0.5)));
        return cv.toDataURL('image/png').slice(22);
      });
    }, { items, W, H, font, LINE, FILL, TEXT });
  } finally { await browser.close(); }
}

// lays the bubbles over the film and mixes in the voice lines: film -> out
async function burnBubbles(film, out, items, W, H, { bubbles = true } = {}) {
  const shown = bubbles ? items : [], spoken = items.filter(b => b.wav);
  if (!shown.length && !spoken.length) { fs.copyFileSync(film, out); return 0; }
  const pngs = shown.length ? await drawBubbles(shown, W, H) : [];
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kitsu-bubbles-'));
  const files = pngs.map((b64, i) => { const f = path.join(dir, `bubble-${i}.png`); fs.writeFileSync(f, Buffer.from(b64, 'base64')); return f; });
  // each bubble pops in quickly and fades out (its own short fade on a looped still)
  let graph = shown.length ? shown.map((b, i) => `[${i + 1}:v]format=rgba,fade=t=in:st=${b.t0.toFixed(3)}:d=0.15:alpha=1,fade=t=out:st=${Math.max(b.t0, b.t1 - 0.2).toFixed(3)}:d=0.2:alpha=1[b${i}];`).join('')
    + shown.map((b, i) => `${i ? `[o${i - 1}]` : '[0:v]'}[b${i}]overlay=0:0:enable='between(t,${b.t0.toFixed(3)},${b.t1.toFixed(3)})'${i === shown.length - 1 ? '[v]' : `[o${i}]`}`).join(';')
    : '[0:v]null[v]';
  // the voices, each at its moment; the clips' own sound (music, little noises) ducks a little under them
  const audioIn = 1 + files.length;
  if (spoken.length) {
    graph += ';' + spoken.map((b, i) => `[${audioIn + i}:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=${Math.round(b.t0 * 1000)}:all=1[s${i}]`).join(';')
      + `;${spoken.map((_, i) => `[s${i}]`).join('')}amix=inputs=${spoken.length}:normalize=0:duration=longest,asplit=2[vo1][vo2]`
      + ';[0:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=0.8[m];[m][vo1]sidechaincompress=threshold=0.02:ratio=6:attack=20:release=400[md]'
      + ';[md][vo2]amix=inputs=2:normalize=0:duration=first[a]';
  }
  try {
    execFileSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-i', film, ...files.flatMap(f => ['-loop', '1', '-i', f]), ...spoken.flatMap(b => ['-i', b.wav]), '-filter_complex', graph,
      '-map', '[v]', '-map', spoken.length ? '[a]' : '0:a?', '-t', String(require('./join').probe(film).duration), '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-pix_fmt', 'yuv420p',
      ...(spoken.length ? ['-c:a', 'aac', '-b:a', '192k'] : ['-c:a', 'copy']), '-movflags', '+faststart', out], { stdio: ['ignore', 'ignore', 'pipe'] });
  } catch (e) { throw new Error(`FFmpeg couldn't add the speech bubbles and voices: ${String(e.stderr || e.message).slice(-400)}`); }
  finally { fs.rmSync(dir, { recursive: true, force: true }); }
  return items.length;
}

module.exports = { bubbleTimes, drawBubbles, burnBubbles };
