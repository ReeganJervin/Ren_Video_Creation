// A map (prop): an old paper map. Rolled up, it's a scroll tied with a red ribbon; "the map opens" unrolls it into a
// parchment with a hand-drawn forest (a "broccoli"), a dotted path, a river and a red X. Held in the middle.
(function (root) {
  const { register } = typeof module !== 'undefined' ? require('../assets.js') : root.StudioAssets;
  const LINE = '#4a2616';
  const paper = (c, y0, y1) => { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, '#fbeccb'); g.addColorStop(1, '#ead2a0'); return g; };

  register({
    id: 'map', kind: 'prop', names: ['map', 'old map', 'treasure map', 'paper map'], size: 'small', height: 84, hold: 'one paw',
    grip: -42,   // held in the middle
    states: ['rolled', 'open'], glow: false, motion: 'none', credit: 'Claude Code',
    draw(c, t, state) {
      c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
      if (state !== 'open') {
        // rolled: a scroll standing up, curled ends, a red ribbon round the middle
        c.beginPath(); c.roundRect(-14, -78, 28, 76, 12); c.fillStyle = paper(c, -78, 0); c.fill(); c.lineWidth = 4; c.strokeStyle = LINE; c.stroke();
        [-78, -2].forEach(y => { c.beginPath(); c.ellipse(0, y, 14, 5, 0, 0, Math.PI * 2); c.fillStyle = '#f3dcae'; c.fill(); c.lineWidth = 3; c.stroke(); c.beginPath(); c.ellipse(0, y, 5, 2, 0, 0, Math.PI * 2); c.lineWidth = 2; c.stroke(); });
        c.fillStyle = '#c8604a'; c.beginPath(); c.roundRect(-15, -45, 30, 9, 3); c.fill(); c.lineWidth = 2.5; c.strokeStyle = LINE; c.stroke();
        c.beginPath(); c.moveTo(0, -40); c.quadraticCurveTo(10, -30, 8, -22); c.moveTo(0, -40); c.quadraticCurveTo(-8, -30, -10, -24); c.strokeStyle = '#c8604a'; c.lineWidth = 4; c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.ellipse(-6, -62, 3, 9, 0, 0, Math.PI * 2); c.fill();
      } else {
        // open: a parchment with rolled edges at the sides
        c.beginPath(); c.moveTo(-50, -82); c.quadraticCurveTo(0, -88, 50, -82); c.lineTo(50, -4); c.quadraticCurveTo(0, 2, -50, -4); c.closePath();
        c.fillStyle = paper(c, -86, 0); c.fill(); c.lineWidth = 4; c.strokeStyle = LINE; c.stroke();
        [-50, 50].forEach(x => { c.beginPath(); c.roundRect(x - 7, -86, 14, 86, 7); c.fillStyle = '#f3dcae'; c.fill(); c.lineWidth = 3.5; c.strokeStyle = LINE; c.stroke(); });
        // the drawing: a broccoli-shaped forest, a wavy river, a dotted path to a red X
        c.fillStyle = '#7fb069'; [[-26, -64, 9], [-17, -68, 10], [-8, -63, 8]].forEach(([x, y, r]) => { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); });
        c.strokeStyle = '#8a5d3b'; c.lineWidth = 3; c.beginPath(); c.moveTo(-17, -58); c.lineTo(-17, -48); c.stroke();
        c.strokeStyle = '#7fb3d9'; c.lineWidth = 4; c.beginPath(); c.moveTo(-38, -30); c.quadraticCurveTo(-24, -40, -10, -30); c.quadraticCurveTo(4, -20, 18, -30); c.stroke();
        c.strokeStyle = '#8a5d3b'; c.lineWidth = 2.5; c.setLineDash([4, 5]); c.beginPath(); c.moveTo(-17, -46); c.quadraticCurveTo(0, -48, 10, -40); c.quadraticCurveTo(24, -28, 28, -16); c.stroke(); c.setLineDash([]);
        c.strokeStyle = '#d0453a'; c.lineWidth = 4; c.beginPath(); c.moveTo(24, -20); c.lineTo(34, -10); c.moveTo(34, -20); c.lineTo(24, -10); c.stroke();
      }
      c.restore();
    },
  });
})(this);
