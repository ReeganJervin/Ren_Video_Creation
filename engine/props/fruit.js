// The fruit (prop): a round, shiny fruit nobody has seen before, peach fading to pink and violet, with soft segment
// lines, tiny golden freckles and a little star-shaped green crown. It grows on the fruit tree. Held in the middle.
(function (root) {
  const { register } = typeof module !== 'undefined' ? require('../assets.js') : root.StudioAssets;
  const LINE = '#4a2616';

  // also drawn (smaller) on the fruit tree: (x, y) is the middle of the fruit, r its radius
  function fruitAt(c, x, y, r, lw = 4) {
    c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
    // the fruit: perfectly round, with soft segment lines like a little lantern
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2);
    const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.1);
    g.addColorStop(0, '#ffd2a8'); g.addColorStop(0.45, '#ff9ab8'); g.addColorStop(1, '#9058d0');
    c.fillStyle = g; c.fill(); c.lineWidth = lw; c.strokeStyle = LINE; c.stroke();
    c.strokeStyle = 'rgba(120,50,110,0.2)'; c.lineWidth = lw * 0.6;
    [-0.5, 0, 0.5].forEach(k => { c.beginPath(); c.moveTo(x, y - r * 0.92); c.quadraticCurveTo(x + k * r * 1.5, y, x, y + r * 0.92); c.stroke(); });
    // tiny golden freckles
    c.fillStyle = 'rgba(255,232,150,0.95)';
    [[0.42, 0.15], [0.6, 0.5], [0.15, 0.62], [-0.32, 0.6], [-0.62, 0.25], [0.3, -0.4]].forEach(([dx, dy]) => { c.beginPath(); c.arc(x + dx * r, y + dy * r, Math.max(1, r * 0.06), 0, Math.PI * 2); c.fill(); });
    // a little star-shaped green crown on top, with a short stem
    c.beginPath();
    for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.22 : r * 0.6; c.lineTo(x + Math.cos(a) * rr, y - r * 0.98 + Math.sin(a) * rr * 0.6); }
    c.closePath(); c.fillStyle = '#5fbf62'; c.fill(); c.lineWidth = lw * 0.55; c.strokeStyle = LINE; c.stroke();
    c.beginPath(); c.moveTo(x, y - r * 0.95); c.quadraticCurveTo(x + r * 0.05, y - r * 1.3, x + r * 0.2, y - r * 1.38); c.lineWidth = lw * 0.9; c.strokeStyle = '#7a4e30'; c.stroke();
    // a shiny highlight
    c.fillStyle = 'rgba(255,255,255,0.75)'; c.beginPath(); c.ellipse(x - r * 0.45, y - r * 0.35, r * 0.2, r * 0.12, -0.7, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.arc(x - r * 0.2, y - r * 0.6, r * 0.06, 0, Math.PI * 2); c.fill();
    c.restore();
  }

  register({
    id: 'fruit', kind: 'prop', names: ['fruit', 'round fruit', 'shiny fruit', 'strange fruit', 'fruits'], size: 'small', height: 56, hold: 'one paw',
    grip: -24,   // held in the middle
    states: [], glow: false, motion: 'none', credit: 'Claude Code',
    fruitAt,
    draw(c) { fruitAt(c, 0, -25, 25); },
  });
})(this);
