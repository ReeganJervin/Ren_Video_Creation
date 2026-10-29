// The fruit tree (set piece): a friendly round tree, a little taller than two Rens, with a curvy trunk, a big soft
// crown and the round pink-and-violet fruit (the fruit prop) hanging in it, plus a few fallen ones in the grass.
(function (root) {
  const { register } = typeof module !== 'undefined' ? require('../assets.js') : root.StudioAssets;
  const LINE = '#4a2616';
  const grad = (c, y0, y1, a, b) => { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; };
  const out = (c, lw = 6) => { c.lineWidth = lw; c.strokeStyle = LINE; c.stroke(); };
  // the same fruit as the fruit prop (drawn here too, so the tree works on its own)
  function fruitAt(c, x, y, r, lw) {
    c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2);
    const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.1);
    g.addColorStop(0, '#ffd2a8'); g.addColorStop(0.45, '#ff9ab8'); g.addColorStop(1, '#9058d0');
    c.fillStyle = g; c.fill(); c.lineWidth = lw; c.strokeStyle = LINE; c.stroke();
    c.beginPath();
    for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.22 : r * 0.6; c.lineTo(x + Math.cos(a) * rr, y - r * 0.98 + Math.sin(a) * rr * 0.6); }
    c.closePath(); c.fillStyle = '#5fbf62'; c.fill(); c.lineWidth = lw * 0.55; c.strokeStyle = LINE; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.75)'; c.beginPath(); c.ellipse(x - r * 0.45, y - r * 0.35, r * 0.2, r * 0.12, -0.7, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  const CROWN = [[-190, -470, 120], [190, -470, 120], [-110, -590, 140], [110, -590, 140], [0, -660, 130], [0, -480, 160], [-230, -560, 90], [230, -560, 90]];
  // fruit hanging in the crown [x, y]
  const HANG = [[-200, -410], [-90, -400], [40, -380], [170, -420], [-150, -520], [80, -520], [220, -500], [-30, -600], [150, -640], [-210, -620], [0, -470]];
  // fallen fruit in the grass
  const FALLEN = [[-150, -20], [-110, -16], [130, -18]];

  register({
    id: 'fruit-tree', kind: 'prop', names: ['fruit tree', 'tree full of fruit'], size: 'big', height: 800,
    states: [], glow: false, motion: 'sway', credit: 'Claude Code',
    draw(c, t) {
      c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
      const sh = c.createRadialGradient(0, 2, 20, 0, 2, 300); sh.addColorStop(0, 'rgba(60,40,28,0.3)'); sh.addColorStop(1, 'rgba(60,40,28,0)');
      c.save(); c.scale(1, 0.12); c.fillStyle = sh; c.beginPath(); c.arc(0, 16, 300, 0, Math.PI * 2); c.fill(); c.restore();
      // a curvy trunk with two short branches
      c.beginPath();
      c.moveTo(-90, 0); c.quadraticCurveTo(-44, -10, -50, -120); c.quadraticCurveTo(-64, -260, -34, -420);
      c.lineTo(42, -420); c.quadraticCurveTo(22, -260, 48, -120); c.quadraticCurveTo(50, -10, 94, 0); c.closePath();
      c.fillStyle = grad(c, -420, 0, '#a07048', '#86583a'); c.fill(); out(c);
      [-1, 1].forEach(sd => { c.beginPath(); c.moveTo(sd * 10, -330); c.quadraticCurveTo(sd * 70, -370, sd * 120, -440); c.lineWidth = 22; c.strokeStyle = LINE; c.stroke(); c.lineWidth = 14; c.strokeStyle = '#94643f'; c.stroke(); });
      c.strokeStyle = 'rgba(74,38,22,0.45)'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(-8, -380); c.quadraticCurveTo(-24, -240, -4, -90); c.stroke();
      // the crown, swaying gently, with the fruit hanging in it
      const sw = Math.sin(t * 0.7) * 3;
      c.save(); c.translate(sw, 0);
      CROWN.forEach(([x, y, r], i) => { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = grad(c, y - r, y + r, '#8ccf7e', '#5aa865'); c.fill(); out(c); });
      c.fillStyle = 'rgba(210,250,180,0.5)';
      [[-120, -660, 50, 18], [70, -700, 46, 16], [-200, -520, 34, 13], [160, -540, 40, 14]].forEach(([x, y, rx, ry]) => { c.beginPath(); c.ellipse(x, y, rx, ry, -0.3, 0, Math.PI * 2); c.fill(); });
      HANG.forEach(([x, y], i) => fruitAt(c, x + Math.sin(t * 1.1 + i) * 1.5, y, 25, 4));
      c.restore();
      FALLEN.forEach(([x, y]) => fruitAt(c, x, y, 18, 3.5));
      c.restore();
    },
  });
})(this);
