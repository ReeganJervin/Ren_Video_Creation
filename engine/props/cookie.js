// A cookie (prop): a round, golden cookie with chocolate chips, standing on its edge. Held in the middle.
(function (root) {
  const { register } = typeof module !== 'undefined' ? require('../assets.js') : root.StudioAssets;
  const LINE = '#4a2616';

  register({
    id: 'cookie', kind: 'prop', names: ['cookie', 'big cookie', 'biscuit', 'snack'], size: 'small', height: 50, hold: 'one paw',
    grip: -25,   // held in the middle
    states: [], glow: false, motion: 'none', credit: 'Claude Code',
    draw(c) {
      c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
      // a slightly wobbly round edge, like a home-made cookie
      c.beginPath();
      for (let i = 0; i <= 16; i++) { const a = i / 16 * Math.PI * 2, r = 25 + (i % 3 === 0 ? -1.5 : 0.8); c.lineTo(Math.cos(a) * r, -25 + Math.sin(a) * r); }
      c.closePath();
      const g = c.createLinearGradient(0, -50, 0, 0); g.addColorStop(0, '#f6c27a'); g.addColorStop(1, '#d9914a');
      c.fillStyle = g; c.fill(); c.lineWidth = 4; c.strokeStyle = LINE; c.stroke();
      // chocolate chips
      c.fillStyle = '#5b3020';
      [[-10, -36, 4.5], [8, -38, 3.5], [12, -22, 4.5], [-6, -18, 3.5], [-15, -26, 3], [2, -28, 3]].forEach(([x, y, r]) => { c.beginPath(); c.ellipse(x, y, r, r * 0.8, 0.4, 0, Math.PI * 2); c.fill(); });
      // a warm highlight
      c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.ellipse(-9, -42, 6, 3, -0.5, 0, Math.PI * 2); c.fill();
      c.restore();
    },
  });
})(this);
