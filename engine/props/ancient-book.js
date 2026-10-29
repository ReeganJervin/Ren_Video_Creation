// The ancient book (prop): a thick old book bound in deep green leather, with golden corners, a golden Great Tree
// on the cover and a clasp. "ren opens the book": it opens wide, showing old pages, rune-writing on the left and a
// drawing of the Great Tree and the star on the right. "the book glows" makes its pages shine softly.
(function (root) {
  const { register } = typeof module !== 'undefined' ? require('../assets.js') : root.StudioAssets;
  const LINE = '#4a2616';
  const grad = (c, y0, y1, a, b) => { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; };
  const tree = (c, x, y, s, col) => {
    c.fillStyle = col; c.beginPath(); c.roundRect(x - 2.5 * s, y - 2 * s, 5 * s, 12 * s, 1.5 * s); c.fill();
    [[0, -8, 8], [-7, -3, 6], [7, -3, 6]].forEach(([dx, dy, r]) => { c.beginPath(); c.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); c.fill(); });
  };

  register({
    id: 'ancient-book', kind: 'prop', names: ['ancient book', 'book', 'old book', 'magic book', 'book of legends'], size: 'small', height: 84, hold: 'both paws',
    states: ['closed', 'open'], glow: true, glowColor: '255,235,170', motion: 'none', credit: 'Claude Code',
    draw(c, t, state) {
      c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
      if (state === 'open') {
        // open wide: two pages on the cover, a little curved
        c.beginPath(); c.moveTo(-78, -12); c.lineTo(-80, -70); c.quadraticCurveTo(-40, -80, 0, -70); c.quadraticCurveTo(40, -80, 80, -70); c.lineTo(78, -12); c.quadraticCurveTo(40, -22, 0, -10); c.quadraticCurveTo(-40, -22, -78, -12); c.closePath();
        c.fillStyle = '#2f6a52'; c.fill(); c.lineWidth = 4; c.strokeStyle = LINE; c.stroke();
        [-1, 1].forEach(sd => {
          c.beginPath(); c.moveTo(0, -16); c.quadraticCurveTo(sd * 36, -28, sd * 72, -18); c.lineTo(sd * 73, -72); c.quadraticCurveTo(sd * 36, -82, 0, -72); c.closePath();
          c.fillStyle = grad(c, -82, -16, '#fff6dc', '#efdcb0'); c.fill(); c.lineWidth = 3; c.strokeStyle = LINE; c.stroke();
        });
        // left page: lines of old rune-writing; right page: the Great Tree and the star
        c.strokeStyle = 'rgba(110,70,40,0.6)'; c.lineWidth = 2;
        for (let k = 0; k < 5; k++) { const y = -64 + k * 9; c.beginPath(); c.moveTo(-62, y + 2); for (let x = -62; x < -12; x += 7) c.lineTo(x + 3.5, y + ((x / 7) % 2 ? -2 : 2)); c.stroke(); }
        tree(c, 36, -40, 1.6, 'rgba(70,130,80,0.8)');
        c.fillStyle = '#f2b83a'; c.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? 3 : 7; c.lineTo(58 + Math.cos(a) * rr, -64 + Math.sin(a) * rr); } c.closePath(); c.fill();
        c.beginPath(); c.moveTo(0, -72); c.lineTo(0, -14); c.lineWidth = 2; c.strokeStyle = 'rgba(110,70,40,0.5)'; c.stroke();
      } else {
        // closed, standing up: the cover, the page edges and the spine
        c.beginPath(); c.roundRect(30, -80, 12, 78, 3); c.fillStyle = grad(c, -80, 0, '#fff4d8', '#e6d0a0'); c.fill(); c.lineWidth = 3; c.strokeStyle = LINE; c.stroke();
        c.strokeStyle = 'rgba(150,110,60,0.4)'; c.lineWidth = 1.5; [-66, -50, -34, -18].forEach(y => { c.beginPath(); c.moveTo(32, y); c.lineTo(40, y); c.stroke(); });
        c.beginPath(); c.roundRect(-40, -84, 74, 84, [4, 8, 8, 4]); c.fillStyle = grad(c, -84, 0, '#3f8a6a', '#2a5e48'); c.fill(); c.lineWidth = 4; c.strokeStyle = LINE; c.stroke();
        c.beginPath(); c.roundRect(-40, -84, 14, 84, [4, 0, 0, 4]); c.fillStyle = '#24503e'; c.fill(); c.lineWidth = 3; c.stroke();
        // golden corners, the tree, the clasp
        c.fillStyle = '#f2c14a'; [[34, -84, -1, 1], [34, 0, -1, -1]].forEach(([x, y, sx, sy]) => { c.beginPath(); c.moveTo(x, y); c.lineTo(x + sx * 14, y); c.lineTo(x, y + sy * 14); c.closePath(); c.fill(); c.lineWidth = 2; c.strokeStyle = LINE; c.stroke(); });
        c.beginPath(); c.arc(4, -44, 19, 0, Math.PI * 2); c.lineWidth = 3; c.strokeStyle = '#f2c14a'; c.stroke();
        tree(c, 4, -42, 1.2, '#f2c14a');
        c.beginPath(); c.roundRect(28, -50, 16, 14, 3); c.fillStyle = '#f2c14a'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = LINE; c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.25)'; c.beginPath(); c.ellipse(-10, -72, 14, 4, -0.2, 0, Math.PI * 2); c.fill();
      }
      c.restore();
    },
  });
})(this);
