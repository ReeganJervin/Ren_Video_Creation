// The little bag (prop): a small, plain cloth pouch with a drawstring, found in the treasure chest in Episode 10. Faded
// tan cloth with a darker patch sewn on, little stitches, a ruffled top pulled shut by a cord with two knotted ends,
// and a tiny faded star stitched on the front: the only hint that it isn't as useless as Ren thinks (later in the
// season it turns out to be a magic bag that fits anything). Held by its cord, it hangs from the paw.
(function (root) {
  const { register } = typeof module !== 'undefined' ? require('../assets.js') : root.StudioAssets;
  const LINE = '#4a2616';
  const star = (c, x, y, R, r) => { c.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r : R; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); };

  register({
    id: 'bag', kind: 'prop', names: ['bag', 'little bag', 'small bag', 'pouch', 'little pouch', 'cloth bag', 'useless bag', 'magic bag'], size: 'small', height: 52, hold: 'one paw',
    grip: -50, hangs: true,   // held by the cord at the top
    states: [], glow: false, motion: 'none', credit: 'Claude Code',
    draw(c, t) {
      c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
      // the pouch: round at the bottom, pulled in at the neck
      const body = () => { c.beginPath(); c.moveTo(-9, -38); c.bezierCurveTo(-22, -32, -26, -12, -20, -4); c.quadraticCurveTo(0, 4, 20, -4); c.bezierCurveTo(26, -12, 22, -32, 9, -38); c.closePath(); };
      body(); const g = c.createLinearGradient(0, -38, 0, 2); g.addColorStop(0, '#d8bc8c'); g.addColorStop(1, '#a8845a');
      c.fillStyle = g; c.fill(); c.lineWidth = 3.5; c.strokeStyle = LINE; c.stroke();
      c.save(); body(); c.clip();
      // a darker patch sewn on, with little stitches
      c.fillStyle = '#9a7a52'; c.beginPath(); c.roundRect(4, -20, 13, 12, 2); c.fill();
      c.strokeStyle = '#6e5232'; c.lineWidth = 1.5; c.setLineDash([2.5, 2.5]); c.beginPath(); c.roundRect(5, -19, 11, 10, 2); c.stroke();
      // the faded little star
      c.setLineDash([2, 2]); c.strokeStyle = 'rgba(240,214,140,0.9)'; c.lineWidth = 1.6; star(c, -8, -18, 6.5, 2.8); c.stroke();
      c.setLineDash([]);
      // soft folds
      c.strokeStyle = 'rgba(74,38,22,0.3)'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(-6, -36); c.quadraticCurveTo(-12, -22, -10, -6); c.moveTo(4, -36); c.quadraticCurveTo(0, -26, 2, -24); c.stroke();
      c.restore();
      // the ruffled top above the cord
      c.beginPath(); c.moveTo(-9, -38); c.quadraticCurveTo(-14, -46, -8, -48); c.quadraticCurveTo(-4, -44, 0, -49); c.quadraticCurveTo(4, -44, 8, -48); c.quadraticCurveTo(14, -46, 9, -38); c.closePath();
      c.fillStyle = '#d2b484'; c.fill(); c.lineWidth = 3; c.strokeStyle = LINE; c.stroke();
      // the drawstring round the neck, with two knotted ends hanging down
      c.strokeStyle = '#8a3a2a'; c.lineWidth = 3.5; c.beginPath(); c.moveTo(-10, -38); c.quadraticCurveTo(0, -35, 10, -38); c.stroke();
      const sway = Math.sin(t * 1.8) * 1.5;
      [[-1, -22], [1, -18]].forEach(([d, end]) => {
        c.beginPath(); c.moveTo(d * 2, -37); c.quadraticCurveTo(d * 9 + sway, -30, d * 7 + sway, end); c.stroke();
        c.fillStyle = '#8a3a2a'; c.beginPath(); c.arc(d * 7 + sway, end, 2.6, 0, Math.PI * 2); c.fill();
      });
      // a small highlight
      c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.ellipse(-12, -26, 3, 6, 0.3, 0, Math.PI * 2); c.fill();
      c.restore();
    },
  });
})(this);
