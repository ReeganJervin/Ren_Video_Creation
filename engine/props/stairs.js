// The stairs (set piece): an old stone archway in the rock, with worn stone steps going down into the dark (Episode
// 9: the way down to the first floor of the dungeon). Big rounded stones make the arch, with moss and a crack or two;
// inside, the steps get narrower and darker the further down they go, until there is only darkness. A faint cold
// draught of mist drifts out along the bottom step. Taller than Ren, so he and Yuki could walk down (F5).
(function (root) {
  const { register } = typeof module !== 'undefined' ? require('../assets.js') : root.StudioAssets;
  const LINE = '#4a2616';
  const grad = (c, y0, y1, a, b) => { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; };
  const out = (c, lw = 5) => { c.lineWidth = lw; c.strokeStyle = LINE; c.stroke(); };
  // the opening: 260 wide, 380 tall with a round top
  const way = c => { c.beginPath(); c.moveTo(-130, 0); c.lineTo(-130, -250); c.arc(0, -250, 130, Math.PI, 0); c.lineTo(130, 0); c.closePath(); };
  const STONES = [[-196, -36, 54, 40], [-200, -118, 50, 42], [-194, -200, 52, 40], [-172, -282, 50, 40], [-118, -352, 50, 38], [-40, -392, 48, 34],
    [40, -392, 48, 34], [118, -352, 50, 38], [172, -282, 50, 40], [194, -200, 52, 40], [200, -118, 50, 42], [196, -36, 54, 40]];
  // the steps, from the nearest (bottom) to the furthest: [y of the front edge, half width, step height]
  const STEPS = [[0, 124, 30], [-36, 104, 26], [-66, 87, 22], [-92, 72, 19], [-114, 59, 16], [-132, 48, 13], [-147, 39, 11]];

  register({
    id: 'stairs', kind: 'prop', names: ['stairs', 'steps', 'stone stairs', 'old stairs', 'staircase', 'stairway', 'way down'], size: 'big', height: 430,
    states: [], glow: false, motion: 'none', credit: 'Claude Code',
    draw(c, t) {
      c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
      c.fillStyle = 'rgba(40,30,40,0.3)'; c.beginPath(); c.ellipse(0, 3, 260, 16, 0, 0, Math.PI * 2); c.fill();
      // the rock around the arch
      c.beginPath(); c.moveTo(-250, 0); c.bezierCurveTo(-262, -200, -230, -420, 0, -432); c.bezierCurveTo(230, -420, 262, -200, 250, 0); c.closePath();
      c.fillStyle = grad(c, -432, 0, '#9d95ac', '#766e88'); c.fill(); out(c, 6);
      // the dark opening, darkest at the top where the stairs disappear
      way(c); c.fillStyle = grad(c, -380, 0, '#120d18', '#3a3046'); c.fill(); out(c, 5);
      // the steps going down: each a pale top and a darker front, narrower and darker as they go
      c.save(); way(c); c.clip();
      // (far to near, so each nearer step overlaps the one beyond it). Going down, you see the top of each step: lit at
      // its near edge, falling into shadow where the next step drops away behind it
      [...STEPS].reverse().forEach(([y, hw, h], j) => {
        const i = STEPS.length - 1 - j, fade = i / (STEPS.length - 1), top = y - h, L = k => Math.round(k * (1 - 0.72 * fade));
        const g = c.createLinearGradient(0, top, 0, y);
        g.addColorStop(0, `rgb(${L(52)},${L(44)},${L(62)})`); g.addColorStop(0.45, `rgb(${L(120)},${L(112)},${L(138)})`); g.addColorStop(1, `rgb(${L(176)},${L(168)},${L(192)})`);
        c.beginPath(); c.roundRect(-hw, top, hw * 2, h, 3); c.fillStyle = g; c.fill();
        c.lineWidth = 3; c.strokeStyle = `rgba(74,38,22,${0.85 - 0.6 * fade})`; c.stroke();
        // its worn near edge, catching the light
        c.beginPath(); c.moveTo(-hw + 5, y - 2); c.quadraticCurveTo(0, y - 5, hw - 5, y - 2);
        c.lineWidth = 3; c.strokeStyle = `rgba(232,226,244,${0.6 - 0.5 * fade})`; c.stroke();
      });
      // and further down, only darkness
      c.fillStyle = grad(c, -380, -150, 'rgba(10,6,14,1)', 'rgba(10,6,14,0)'); c.fillRect(-130, -380, 260, 240);
      // a faint cold draught drifting out along the bottom
      for (let k = 0; k < 3; k++) {
        const u = ((t * 0.12 + k / 3) % 1), x = -90 + u * 180, a = Math.sin(u * Math.PI) * 0.22;
        c.fillStyle = `rgba(220,226,245,${a})`; c.beginPath(); c.ellipse(x, -12 - k * 6, 70, 9, 0, 0, Math.PI * 2); c.fill();
      }
      c.restore();
      // the big rounded stones of the arch, with a little moss
      STONES.forEach(([x, y, rx, ry], i) => {
        c.beginPath(); c.ellipse(x, y, rx, ry, (i % 3 - 1) * 0.15, 0, Math.PI * 2);
        c.fillStyle = grad(c, y - ry, y + ry, i % 2 ? '#b9b2c2' : '#ada5b8', '#867e98'); c.fill(); out(c, 5);
        c.fillStyle = 'rgba(255,255,255,0.22)'; c.beginPath(); c.ellipse(x - rx * 0.3, y - ry * 0.4, rx * 0.35, ry * 0.18, -0.3, 0, Math.PI * 2); c.fill();
        if (i % 4 === 1) { c.fillStyle = '#7fae69'; c.beginPath(); c.ellipse(x + rx * 0.2, y - ry * 0.75, rx * 0.5, ry * 0.2, 0, 0, Math.PI * 2); c.fill(); }
      });
      // a crack in one stone
      c.strokeStyle = 'rgba(74,38,22,0.6)'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-210, -130); c.lineTo(-196, -112); c.lineTo(-204, -96); c.stroke();
      c.restore();
    },
  });
})(this);
