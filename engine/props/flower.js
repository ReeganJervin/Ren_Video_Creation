// The flower (prop): a little pink five-petal flower with a sunny centre on a green stem with two leaves, nodding
// gently. Held by the stem.
(function (root) {
  const { register } = typeof module !== 'undefined' ? require('../assets.js') : root.StudioAssets;
  const LINE = '#4a2616';

  register({
    id: 'flower', kind: 'prop', names: ['flower', 'little flower', 'pink flower', 'pretty flower'], size: 'small', height: 76, hold: 'one paw',
    grip: -18,   // by the stem
    states: [], glow: false, motion: 'sway', credit: 'Claude Code',
    draw(c, t) {
      c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
      const sw = Math.sin(t * 1.6) * 3;
      // stem and leaves
      c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-3, -30, sw, -54); c.lineWidth = 6; c.strokeStyle = LINE; c.stroke(); c.lineWidth = 3.5; c.strokeStyle = '#5fae5a'; c.stroke();
      [[-1, -26, -1], [1, -34, 1]].forEach(([sd, y, k]) => {
        c.beginPath(); c.moveTo(-1, y); c.quadraticCurveTo(sd * 12, y - 10, sd * 20, y - 4); c.quadraticCurveTo(sd * 10, y + 4, -1, y);
        c.fillStyle = '#7cc46e'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = LINE; c.stroke();
      });
      // the bloom
      c.save(); c.translate(sw, -60); c.rotate(sw * 0.03);
      for (let k = 0; k < 5; k++) {
        c.save(); c.rotate(k * Math.PI * 2 / 5);
        c.beginPath(); c.ellipse(0, -9, 7.5, 10, 0, 0, Math.PI * 2);
        const g = c.createLinearGradient(0, -19, 0, 0); g.addColorStop(0, '#ffc2d8'); g.addColorStop(1, '#ff8fb5');
        c.fillStyle = g; c.fill(); c.lineWidth = 2.5; c.strokeStyle = LINE; c.stroke(); c.restore();
      }
      c.beginPath(); c.arc(0, 0, 6, 0, Math.PI * 2); c.fillStyle = '#ffd75a'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = LINE; c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.arc(-2, -2, 1.8, 0, Math.PI * 2); c.fill();
      c.restore();
      c.restore();
    },
  });
})(this);
