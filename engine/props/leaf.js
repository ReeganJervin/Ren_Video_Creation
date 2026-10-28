// A leaf (prop): a big, soft green leaf with a curled tip, standing on its stem. Held by the stem, it stands up from
// the paw. (Episode 1's "oldest leaf in the meadow" and anything else a story needs a leaf for.)
(function (root) {
  const { register } = typeof module !== 'undefined' ? require('../assets.js') : root.StudioAssets;
  const LINE = '#4a2616';

  register({
    id: 'leaf', kind: 'prop', names: ['leaf', 'big leaf', 'green leaf', 'old leaf', 'oldest leaf'], size: 'small', height: 62, hold: 'one paw',
    grip: -6,   // the stem
    states: [], glow: false, motion: 'sway', credit: 'Claude Code',
    draw(c, t) {
      c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
      c.rotate(0.18 + Math.sin(t * 1.7) * 0.04);
      // the stem
      c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-2, -8, 0, -14); c.lineWidth = 6; c.strokeStyle = LINE; c.stroke();
      c.lineWidth = 3; c.strokeStyle = '#6e9a4a'; c.stroke();
      // the blade: wide in the middle, a pointed tip that curls a little
      const blade = () => { c.beginPath(); c.moveTo(0, -12); c.bezierCurveTo(-30, -18, -30, -50, -4, -62); c.quadraticCurveTo(2, -66, 6, -60); c.bezierCurveTo(30, -48, 26, -18, 0, -12); c.closePath(); };
      const g = c.createLinearGradient(0, -64, 0, -12); g.addColorStop(0, '#9fd37f'); g.addColorStop(1, '#5f9e57');
      blade(); c.fillStyle = g; c.fill(); c.lineWidth = 4; c.strokeStyle = LINE; c.stroke();
      // the middle vein and a few side veins
      c.strokeStyle = 'rgba(74,38,22,0.45)'; c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(0, -13); c.quadraticCurveTo(-2, -38, 2, -58); c.stroke();
      [[-24, -1], [-36, -1], [-46, -1], [-24, 1], [-36, 1], [-46, 1]].forEach(([y, i]) => { c.beginPath(); c.moveTo(i * 0.5, y); c.quadraticCurveTo(i * 8, y - 3, i * 13, y - 8); c.stroke(); });
      // a soft highlight
      c.fillStyle = 'rgba(255,255,255,0.45)'; c.beginPath(); c.ellipse(-10, -44, 4, 9, -0.4, 0, Math.PI * 2); c.fill();
      c.restore();
    },
  });
})(this);
