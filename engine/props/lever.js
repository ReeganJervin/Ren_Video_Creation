// The lever (prop): an old wooden lever with an iron band and a round red knob, set in a mossy stone block. It's
// fixed in place (it can't be picked up). States: up (leaning back), down (pulled forward).
(function (root) {
  const { register } = typeof module !== 'undefined' ? require('../assets.js') : root.StudioAssets;
  const LINE = '#4a2616';
  const grad = (c, y0, y1, a, b) => { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; };

  register({
    id: 'lever', kind: 'prop', names: ['lever', 'old lever', 'stone lever'], size: 'medium', height: 160, fixed: true,
    states: ['up', 'down'], glow: false, motion: 'none', credit: 'Claude Code',
    draw(c, t, state) {
      c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
      c.fillStyle = 'rgba(50,40,40,0.25)'; c.beginPath(); c.ellipse(0, 2, 62, 8, 0, 0, Math.PI * 2); c.fill();
      // the handle, turning around the slot in the block
      c.save(); c.translate(0, -46); c.rotate(state === 'down' ? 0.75 : -0.45);
      c.beginPath(); c.roundRect(-7, -104, 14, 106, 6); c.fillStyle = grad(c, -104, 0, '#b8844e', '#8a5a36'); c.fill(); c.lineWidth = 4; c.strokeStyle = LINE; c.stroke();
      c.beginPath(); c.roundRect(-9, -40, 18, 10, 3); c.fillStyle = '#7c8494'; c.fill(); c.lineWidth = 2.5; c.stroke();
      c.beginPath(); c.arc(0, -108, 14, 0, Math.PI * 2);
      const g = c.createRadialGradient(-4, -112, 2, 0, -108, 14); g.addColorStop(0, '#ff9a8a'); g.addColorStop(1, '#d8485a');
      c.fillStyle = g; c.fill(); c.lineWidth = 3.5; c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.arc(-5, -113, 3, 0, Math.PI * 2); c.fill();
      c.restore();
      // the stone block with its slot
      c.beginPath(); c.roundRect(-52, -56, 104, 56, 14); c.fillStyle = grad(c, -56, 0, '#c2bdb6', '#948e88'); c.fill(); c.lineWidth = 5; c.strokeStyle = LINE; c.stroke();
      c.beginPath(); c.roundRect(-30, -58, 60, 10, 4); c.fillStyle = '#4a3c3a'; c.fill(); c.lineWidth = 3; c.stroke();
      c.fillStyle = '#7fb069'; c.beginPath(); c.ellipse(-28, -6, 18, 6, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.22)'; c.beginPath(); c.ellipse(-22, -40, 16, 5, -0.2, 0, Math.PI * 2); c.fill();
      c.restore();
    },
  });
})(this);
