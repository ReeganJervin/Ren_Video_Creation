// The little star (prop). Its own story lines (appears, falls, glows, twinkles, rises...) are worked out in story.js
// and film.js; drawAt(c, t, S) draws it there, exactly as it always has. draw(...) is the usual asset drawing, for
// "star appears at left" style lines.
(function (root) {
  const { register } = typeof module !== 'undefined' ? require('../assets.js') : root.StudioAssets;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  function glow(c, x, y, r, col, a) {
    if (a <= 0) return;
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`);
    c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function starPath(c, r) { c.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.5 : r; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); }
  // S = { x, y, r, alpha, bright, flare, happy }
  function drawAt(c, t, S) {
    c.save(); c.globalCompositeOperation = 'lighter';
    glow(c, S.x, S.y, S.r * (3.5 + S.bright * 2.5), '255,214,110', 0.4 * S.bright * S.alpha);
    if (S.flare > 0) {
      c.translate(S.x, S.y); c.rotate(t * 0.3);
      for (const rot of [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4]) {
        c.save(); c.rotate(rot);
        const L = S.r * (rot % (Math.PI / 2) ? 2.5 + 3 * S.flare : 3 + 5 * S.flare), g = c.createLinearGradient(-L, 0, L, 0);
        g.addColorStop(0, 'rgba(255,240,180,0)'); g.addColorStop(0.5, `rgba(255,240,180,${0.9 * S.flare})`); g.addColorStop(1, 'rgba(255,240,180,0)');
        c.fillStyle = g; c.fillRect(-L, -2.5, L * 2, 5); c.restore();
      }
    }
    c.restore();
    c.save(); c.translate(S.x, S.y); c.rotate(Math.sin(t * 1.7) * 0.12); c.globalAlpha = S.alpha;
    const g = c.createRadialGradient(-S.r * 0.3, -S.r * 0.3, 0, 0, 0, S.r);
    g.addColorStop(0, '#fff8d0'); g.addColorStop(1, S.bright > 0.6 ? '#ffc93c' : '#f2c25a');
    starPath(c, S.r); c.fillStyle = g; c.fill(); c.lineJoin = 'round'; c.lineWidth = S.r * 0.16; c.strokeStyle = '#e8a21a'; c.stroke();
    const fa = clamp((S.r - 15) / 5) * S.alpha;
    if (fa > 0) {
      c.globalAlpha = fa; c.strokeStyle = c.fillStyle = '#6b3a10'; c.lineWidth = 2; c.lineCap = 'round';
      const e = S.r * 0.22;
      if (S.happy) [-1, 1].forEach(i => { c.beginPath(); c.arc(i * e, -1, 2.3, 0, Math.PI * 2); c.fill(); });
      else [-1, 1].forEach(i => { c.beginPath(); c.moveTo(i * e - 3, -1); c.quadraticCurveTo(i * e, 2, i * e + 3, -1); c.stroke(); });
      c.beginPath(); c.moveTo(-3, 4); c.quadraticCurveTo(0, 7, 3, 4); c.stroke();
      c.fillStyle = 'rgba(255,120,120,0.5)'; [-1, 1].forEach(i => { c.beginPath(); c.ellipse(i * e * 1.9, 4, 3, 2, 0, 0, Math.PI * 2); c.fill(); });
    }
    c.restore();
  }
  register({
    id: 'star', kind: 'prop', names: ['star', 'little star'], size: 'small', height: 52, hold: 'both paws',
    states: ['off', 'glowing'], glow: true, emissive: true, motion: 'bob', credit: 'Claude Code',
    drawAt,
    draw(c, t, state, light) { drawAt(c, t, { x: 0, y: -26 + Math.sin(t * 2) * 3, r: 26, alpha: 1, bright: state === 'glowing' ? 1 : 0.6, flare: 0, happy: true }); },
  });
})(this);
