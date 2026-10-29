// The golden coin (prop): a thick, round gold coin standing on its edge, with a raised rim and the Great Tree's
// mark in the middle (a round crown on a little trunk). It catches the light with a slow glint. Held in the middle.
(function (root) {
  const { register } = typeof module !== 'undefined' ? require('../assets.js') : root.StudioAssets;
  const LINE = '#4a2616';

  register({
    id: 'coin', kind: 'prop', names: ['coin', 'golden coin', 'gold coin', 'old coin'], size: 'small', height: 46, hold: 'one paw',
    grip: -23,
    states: [], glow: false, motion: 'none', credit: 'Claude Code',
    draw(c, t) {
      c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
      const y = -23, r = 22;
      // the edge (a little thickness on the right), then the face
      c.beginPath(); c.ellipse(3, y, r, r, 0, 0, Math.PI * 2); c.fillStyle = '#b8781e'; c.fill(); c.lineWidth = 3.5; c.strokeStyle = LINE; c.stroke();
      c.beginPath(); c.arc(0, y, r, 0, Math.PI * 2);
      const g = c.createRadialGradient(-7, y - 8, 2, 0, y, r); g.addColorStop(0, '#fff2a8'); g.addColorStop(0.6, '#f5c542'); g.addColorStop(1, '#dc9a26');
      c.fillStyle = g; c.fill(); c.lineWidth = 3.5; c.stroke();
      // the raised rim
      c.beginPath(); c.arc(0, y, r - 5, 0, Math.PI * 2); c.lineWidth = 2; c.strokeStyle = 'rgba(160,100,20,0.6)'; c.stroke();
      // the Great Tree's mark
      c.fillStyle = 'rgba(170,105,25,0.75)';
      c.beginPath(); c.roundRect(-2.5, y - 1, 5, 11, 1.5); c.fill();
      [[0, -6, 7], [-6, -2, 5], [6, -2, 5]].forEach(([dx, dy, rr]) => { c.beginPath(); c.arc(dx, y + dy, rr, 0, Math.PI * 2); c.fill(); });
      c.fillRect(-9, y + 10, 18, 2);
      // a glint that sweeps across now and then
      const u = (t * 0.35) % 1;
      if (u < 0.3) {
        c.save(); c.beginPath(); c.arc(0, y, r - 1, 0, Math.PI * 2); c.clip();
        const x = -r + (u / 0.3) * r * 2; c.fillStyle = 'rgba(255,255,255,0.55)';
        c.beginPath(); c.moveTo(x - 4, y - r); c.lineTo(x + 4, y - r); c.lineTo(x - 4, y + r); c.lineTo(x - 12, y + r); c.closePath(); c.fill(); c.restore();
      }
      c.fillStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.ellipse(-9, y - 11, 4, 2.5, -0.6, 0, Math.PI * 2); c.fill();
      c.restore();
    },
  });
})(this);
