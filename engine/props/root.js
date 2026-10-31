// The root (prop): an old, twisty tree root lying on the ground. Its outline is long with lumpy ends, so in the dark
// it feels just like a bone (Episode 8); in the light it's clearly a root (Episode 9): woody tan bark with twisting
// grain lines, gnarled ends, curly root hairs, a little side twig and a tiny green sprout on top, harmless and a bit
// funny. About as long as Yuki is tall, lying down.
(function (root) {
  const { register } = typeof module !== 'undefined' ? require('../assets.js') : root.StudioAssets;
  const LINE = '#4a2616';
  // the gnarled lumps at both ends (x, y, rx, ry, tilt): three each, so the ends look lumpy, not round like a bone
  const LUMPS = [[-118, -38, 17, 14, 0.5], [-126, -20, 16, 13, -0.2], [-110, -12, 13, 10, 0.3],
    [116, -42, 16, 13, -0.4], [126, -24, 15, 13, 0.2], [112, -14, 13, 10, -0.3]];
  // the twisty middle: its top and bottom edges, a little thicker in places
  const shaft = c => {
    c.beginPath(); c.moveTo(-112, -36);
    c.bezierCurveTo(-75, -46, -45, -22, -5, -34); c.bezierCurveTo(30, -46, 70, -48, 112, -40);
    c.lineTo(114, -18);
    c.bezierCurveTo(70, -22, 35, -14, 0, -13); c.bezierCurveTo(-40, -6, -75, -20, -114, -12);
    c.closePath();
  };
  // a little side twig, with one tiny fork
  const twig = c => {
    c.beginPath(); c.moveTo(-58, -34); c.quadraticCurveTo(-66, -50, -80, -58); c.lineTo(-76, -64); c.quadraticCurveTo(-60, -56, -50, -38); c.closePath();
  };
  const lump = (c, [x, y, rx, ry, a]) => { c.beginPath(); c.ellipse(x, y, rx, ry, a, 0, Math.PI * 2); };
  const each = (c, f) => { shaft(c); f(); twig(c); f(); LUMPS.forEach(l => { lump(c, l); f(); }); };

  register({
    id: 'root', kind: 'prop', names: ['root', 'old root', 'tree root', 'twisty root', 'bony root'], size: 'medium', height: 78, hold: 'both paws',
    grip: -26,
    states: [], glow: false, motion: 'none', credit: 'Claude Code',
    draw(c, t) {
      c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
      // soft shadow on the ground
      c.fillStyle = 'rgba(60,40,30,0.18)'; c.beginPath(); c.ellipse(0, -2, 140, 10, 0, 0, Math.PI * 2); c.fill();
      // curly root hairs at both ends (behind the root)
      c.strokeStyle = '#8a643c'; c.lineWidth = 3;
      [[-136, -30, -156, -40, -150, -54], [-140, -18, -164, -14, -168, -26], [-128, -6, -148, 4, -160, -2], [-130, -44, -140, -60, -128, -66],
        [134, -36, 154, -50, 146, -60], [140, -22, 164, -18, 168, -30], [128, -8, 150, 0, 160, -8], [126, -50, 132, -66, 120, -70]].forEach(([x0, y0, x1, y1, x2, y2]) => {
        c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(x1, y1, x2, y2); c.stroke();
      });
      // one clean outline around the whole root: stroke everything wide, then fill on top
      c.strokeStyle = LINE; c.lineWidth = 8;
      each(c, () => c.stroke());
      const g = c.createLinearGradient(0, -66, 0, -2); g.addColorStop(0, '#e8cb98'); g.addColorStop(0.5, '#cfa46c'); g.addColorStop(1, '#a87b4a');
      c.fillStyle = g;
      each(c, () => c.fill());
      // bark: twisting grain lines, little cracks and two knots
      c.save(); c.beginPath(); shaft(c); c.clip();
      c.strokeStyle = 'rgba(104,66,34,0.55)'; c.lineWidth = 2.5;
      for (let k = 0; k < 9; k++) { const x = -100 + k * 25; c.beginPath(); c.moveTo(x, -46); c.bezierCurveTo(x + 10, -34, x - 6, -22, x + 8, -8); c.stroke(); }
      c.strokeStyle = 'rgba(104,66,34,0.4)'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(-95, -24); c.bezierCurveTo(-40, -16, 20, -30, 100, -28); c.stroke();
      c.restore();
      c.save(); LUMPS.forEach(l => { c.save(); lump(c, l); c.clip(); c.strokeStyle = 'rgba(104,66,34,0.45)'; c.lineWidth = 2; c.beginPath(); c.arc(l[0] + 3, l[1] + 2, l[2] * 0.55, 0.4, 2.6); c.stroke(); c.restore(); });
      c.restore();
      [[-30, -22, 6, 4], [52, -30, 5, 3.5]].forEach(([x, y, rx, ry]) => {
        c.beginPath(); c.ellipse(x, y, rx, ry, 0.2, 0, Math.PI * 2); c.fillStyle = '#8a5f34'; c.fill(); c.lineWidth = 2; c.strokeStyle = LINE; c.stroke();
        c.beginPath(); c.ellipse(x, y, rx * 0.45, ry * 0.45, 0.2, 0, Math.PI * 2); c.fillStyle = '#5e3e20'; c.fill();
      });
      // a small soft highlight on the top edge of each end
      c.fillStyle = 'rgba(255,248,230,0.6)';
      [[-120, -46, 7, 3.5, -0.4], [112, -50, 7, 3.5, -0.3], [-80, -40, 12, 3, -0.2]].forEach(([x, y, rx, ry, a]) => { c.beginPath(); c.ellipse(x, y, rx, ry, a, 0, Math.PI * 2); c.fill(); });
      // a tiny green sprout with two leaves, waving a little
      const sway = Math.sin(t * 1.6) * 0.08;
      c.save(); c.translate(22, -38); c.rotate(sway);
      c.strokeStyle = LINE; c.lineWidth = 6; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-3, -12, 2, -24); c.stroke();
      c.strokeStyle = '#6fae4f'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-3, -12, 2, -24); c.stroke();
      [-1, 1].forEach(s => {
        c.save(); c.translate(2, -24); c.rotate(s * 0.7 - 0.2);
        c.beginPath(); c.ellipse(s * 9, -3, 10, 5.5, 0, 0, Math.PI * 2);
        c.fillStyle = '#8fd06a'; c.fill(); c.lineWidth = 3; c.strokeStyle = LINE; c.stroke();
        c.restore();
      });
      c.restore();
      c.restore();
    },
  });
})(this);
