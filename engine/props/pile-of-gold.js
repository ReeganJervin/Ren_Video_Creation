// The pile of gold (set piece): a big, round heap of golden coins with gems tucked in and a little golden crown
// sitting on top. Glints twinkle across it, and it gives a soft warm light at night (drawLight).
(function (root) {
  const { register } = typeof module !== 'undefined' ? require('../assets.js') : root.StudioAssets;
  const LINE = '#4a2616';
  const grad = (c, y0, y1, a, b) => { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; };
  const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const W = 230, Hh = 190;   // half width, height of the heap
  const topAt = x => -Hh * (1 - (x / W) ** 2) ** 0.8;
  const COINS = Array.from({ length: 70 }, (_, i) => { const x = -W * 0.92 + hash(i + 1) * W * 1.84, top = topAt(x); return { x, y: top + 8 + hash(i + 200) * (-top - 14), r: 9 + hash(i + 400) * 6, k: 0.4 + hash(i + 600) * 0.45 }; }).sort((a, b) => a.y - b.y);
  const GEMS = [[-110, -70, 13, '#ff6b8a'], [90, -90, 12, '#5ab0ff'], [-30, -130, 11, '#7be08a'], [150, -30, 10, '#c48aff'], [-170, -24, 10, '#5ab0ff'], [40, -40, 12, '#ff6b8a']];
  const GLINTS = [[-120, -110], [-40, -160], [60, -140], [130, -80], [-180, -50], [10, -70], [180, -20]];

  register({
    id: 'pile-of-gold', kind: 'prop', names: ['pile of gold', 'gold', 'treasure', 'heap of gold', 'gold pile'], size: 'big', height: 260,
    states: [], glow: false, motion: 'none', credit: 'Claude Code',
    draw(c, t) {
      c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
      c.fillStyle = 'rgba(60,40,28,0.25)'; c.beginPath(); c.ellipse(0, 3, W + 30, 16, 0, 0, Math.PI * 2); c.fill();
      // the heap
      c.beginPath(); c.moveTo(-W, 0); for (let x = -W; x <= W; x += 10) c.lineTo(x, topAt(x) + Math.sin(x * 0.2) * 3); c.lineTo(W, 0); c.closePath();
      c.fillStyle = grad(c, -Hh, 0, '#ffe27a', '#d9962e'); c.fill(); c.lineWidth = 5; c.strokeStyle = LINE; c.stroke();
      // the coins on it, back to front
      COINS.forEach(o => {
        c.beginPath(); c.ellipse(o.x, o.y, o.r, o.r * o.k, 0, 0, Math.PI * 2);
        c.fillStyle = grad(c, o.y - o.r * o.k, o.y + o.r * o.k, '#fff2a6', '#e5a838'); c.fill(); c.lineWidth = 2; c.strokeStyle = LINE; c.stroke();
        c.beginPath(); c.ellipse(o.x, o.y, o.r * 0.6, o.r * o.k * 0.6, 0, 0, Math.PI * 2); c.lineWidth = 1.5; c.strokeStyle = 'rgba(170,105,25,0.5)'; c.stroke();
      });
      GEMS.forEach(([x, y, r, col]) => {
        c.beginPath(); c.moveTo(x, y - r); c.lineTo(x + r, y); c.lineTo(x, y + r); c.lineTo(x - r, y); c.closePath(); c.fillStyle = col; c.fill(); c.lineWidth = 2.5; c.strokeStyle = LINE; c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.arc(x - r * 0.3, y - r * 0.3, r * 0.2, 0, Math.PI * 2); c.fill();
      });
      // the little crown on top
      c.save(); c.translate(-10, -Hh + 6); c.rotate(-0.12);
      c.beginPath(); c.moveTo(-30, 0); c.lineTo(-34, -34); c.lineTo(-17, -16); c.lineTo(0, -42); c.lineTo(17, -16); c.lineTo(34, -34); c.lineTo(30, 0); c.closePath();
      c.fillStyle = grad(c, -42, 0, '#fff0a0', '#e8a83a'); c.fill(); c.lineWidth = 3.5; c.strokeStyle = LINE; c.stroke();
      [[-34, -34], [0, -42], [34, -34]].forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 4.5, 0, Math.PI * 2); c.fillStyle = '#ff6b8a'; c.fill(); c.lineWidth = 2; c.stroke(); });
      c.beginPath(); c.roundRect(-31, -10, 62, 10, 3); c.fillStyle = '#e8a83a'; c.fill(); c.lineWidth = 2.5; c.stroke();
      c.restore();
      c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.ellipse(-70, -140, 50, 10, -0.5, 0, Math.PI * 2); c.fill();
      c.restore();
    },
    drawLight(c, t, state, light) {
      c.save(); c.globalCompositeOperation = 'lighter';
      const n = Math.max(0, Math.min(1, (light.tau - 1.2) / 0.8 || 0));
      if (n > 0) { const g = c.createRadialGradient(0, -90, 20, 0, -90, 320); g.addColorStop(0, `rgba(255,215,120,${0.28 * n})`); g.addColorStop(1, 'rgba(255,215,120,0)'); c.fillStyle = g; c.fillRect(-340, -420, 680, 430); }
      GLINTS.forEach(([x, y], i) => {
        const w = Math.max(0, Math.sin(t * 1.5 + i * 2.3)) ** 6, s = 12 * w; if (w < 0.03) return;
        c.fillStyle = `rgba(255,255,235,${w})`; c.beginPath(); c.moveTo(x, y - s); c.quadraticCurveTo(x, y, x + s, y); c.quadraticCurveTo(x, y, x, y + s); c.quadraticCurveTo(x, y, x - s, y); c.quadraticCurveTo(x, y, x, y - s); c.fill();
      });
      c.restore();
    },
  });
})(this);
