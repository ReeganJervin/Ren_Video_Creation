// Speech bubbles on the finished film, in Kitsu Studio's style: a soft white rounded bubble, a warm dark-brown
// outline, Fredoka letters and a little tail toward whoever is speaking (left, right, or the middle when unknown).
// Each clip's lines share its time evenly, one bubble at a time, near the top of the picture where faces rarely are.
// The bubbles are drawn in a hidden browser page (Playwright, which Kitsu Studio already has) and laid over the film
// with FFmpeg.
const fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const { FFMPEG } = require('./join');

const FONT = path.join(__dirname, '..', 'fonts', 'fredoka-700.woff2');
const LINE = '#4a2616', FILL = '#fffaf2', TEXT = '#3a2414';

// when each line shows: [{ text, side, t0, t1 }] from the clips' lengths and their lines
function bubbleTimes(clips) {
  const out = [];
  let at = 0;
  for (const c of clips) {
    const n = c.lines.length;
    if (n) {
      const pad = Math.min(0.4, c.duration * 0.05), share = (c.duration - 2 * pad) / n;
      c.lines.forEach((l, i) => out.push({ text: l.text, side: l.side, t0: at + pad + i * share, t1: at + pad + (i + 1) * share - Math.min(0.2, share * 0.1) }));
    }
    at += c.duration;
  }
  return out;
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

// lays the bubbles over the film: film -> out
async function burnBubbles(film, out, items, W, H) {
  if (!items.length) { fs.copyFileSync(film, out); return 0; }
  const pngs = await drawBubbles(items, W, H);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kitsu-bubbles-'));
  const files = pngs.map((b64, i) => { const f = path.join(dir, `bubble-${i}.png`); fs.writeFileSync(f, Buffer.from(b64, 'base64')); return f; });
  // each bubble pops in quickly and fades out (its own short fade on a looped still)
  const graph = items.map((b, i) => `[${i + 1}:v]format=rgba,fade=t=in:st=${b.t0.toFixed(3)}:d=0.15:alpha=1,fade=t=out:st=${Math.max(b.t0, b.t1 - 0.2).toFixed(3)}:d=0.2:alpha=1[b${i}];`).join('')
    + items.map((b, i) => `${i ? `[o${i - 1}]` : '[0:v]'}[b${i}]overlay=0:0:enable='between(t,${b.t0.toFixed(3)},${b.t1.toFixed(3)})'${i === items.length - 1 ? '[v]' : `[o${i}]`}`).join(';');
  try {
    execFileSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-i', film, ...files.flatMap(f => ['-loop', '1', '-i', f]), '-filter_complex', graph,
      '-map', '[v]', '-map', '0:a?', '-shortest', '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-movflags', '+faststart', out], { stdio: ['ignore', 'ignore', 'pipe'] });
  } catch (e) { throw new Error(`FFmpeg couldn't add the speech bubbles: ${String(e.stderr || e.message).slice(-400)}`); }
  finally { fs.rmSync(dir, { recursive: true, force: true }); }
  return items.length;
}

module.exports = { bubbleTimes, drawBubbles, burnBubbles };
