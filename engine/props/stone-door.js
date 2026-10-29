// The stone door (set piece): an ancient doorway of big rounded stones with moss, a carved Great Tree above it and
// a heavy round-topped stone door carved with circles and a star-shaped socket in the middle. "the stone door
// opens": the door slides down into the ground with a rumble of dust, and a warm golden light shines out of the
// doorway (drawLight), brightest at night. The doorway is a little taller than Ren, so he could walk through (F5).
(function (root) {
  const { register } = typeof module !== 'undefined' ? require('../assets.js') : root.StudioAssets;
  const LINE = '#4a2616';
  const grad = (c, y0, y1, a, b) => { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; };
  const out = (c, lw = 6) => { c.lineWidth = lw; c.strokeStyle = LINE; c.stroke(); };
  // the doorway: 300 wide, 420 tall with a round top
  const way = c => { c.beginPath(); c.moveTo(-150, 0); c.lineTo(-150, -270); c.arc(0, -270, 150, Math.PI, 0); c.lineTo(150, 0); c.closePath(); };
  const STONES = [[-232, -40, 62, 44], [-236, -130, 58, 46], [-230, -220, 60, 44], [-206, -310, 58, 44], [-150, -390, 58, 42], [-56, -440, 56, 38], [56, -440, 56, 38], [150, -390, 58, 42], [206, -310, 58, 44], [230, -220, 60, 44], [236, -130, 58, 46], [232, -40, 62, 44]];

  register({
    id: 'stone-door', kind: 'prop', names: ['stone door', 'door', 'ancient door', 'old door', 'stone gate'], size: 'big', height: 500,
    states: ['closed', 'open'], glow: false, motion: 'none', credit: 'Claude Code',
    draw(c, t, state) {
      c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
      c.fillStyle = 'rgba(50,40,40,0.28)'; c.beginPath(); c.ellipse(0, 3, 310, 18, 0, 0, Math.PI * 2); c.fill();
      // the wall behind the stones
      c.beginPath(); c.moveTo(-290, 0); c.lineTo(-290, -270); c.quadraticCurveTo(-270, -500, 0, -500); c.quadraticCurveTo(270, -500, 290, -270); c.lineTo(290, 0); c.closePath();
      c.fillStyle = grad(c, -500, 0, '#a7a3a0', '#85807e'); c.fill(); out(c);
      // the doorway: dark inside
      way(c); c.fillStyle = grad(c, -420, 0, '#3a2c2a', '#241a1a'); c.fill(); out(c);
      // the door: slides down into the ground when it opens (and stays down)
      const open = state === 'open';
      c.save(); way(c); c.clip();
      const down = open ? 430 : 0;
      c.translate(0, down);
      way(c); c.fillStyle = grad(c, -420, 0, '#b4b0aa', '#8f8a86'); c.fill(); out(c, 5);
      c.strokeStyle = 'rgba(70,60,60,0.45)'; c.lineWidth = 4;
      [44, 82, 116].forEach(r => { c.beginPath(); c.arc(0, -220, r, 0, Math.PI * 2); c.stroke(); });
      c.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? 13 : 28; c.lineTo(Math.cos(a) * rr, -220 + Math.sin(a) * rr); } c.closePath();
      c.fillStyle = '#4a3c3a'; c.fill(); c.lineWidth = 3; c.strokeStyle = LINE; c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.18)'; c.beginPath(); c.ellipse(-70, -340, 40, 70, 0.2, 0, Math.PI * 2); c.fill();
      c.restore();
      // the big round stones of the arch, with a little moss
      STONES.forEach(([x, y, rx, ry], i) => {
        c.beginPath(); c.ellipse(x, y, rx, ry, (i % 3 - 1) * 0.15, 0, Math.PI * 2);
        c.fillStyle = grad(c, y - ry, y + ry, i % 2 ? '#c4bfb8' : '#b8b2ab', '#948e88'); c.fill(); out(c, 5);
        c.fillStyle = 'rgba(255,255,255,0.22)'; c.beginPath(); c.ellipse(x - rx * 0.3, y - ry * 0.4, rx * 0.35, ry * 0.18, -0.3, 0, Math.PI * 2); c.fill();
        if (i % 4 === 1) { c.fillStyle = '#7fb069'; c.beginPath(); c.ellipse(x + rx * 0.2, y - ry * 0.75, rx * 0.5, ry * 0.2, 0, 0, Math.PI * 2); c.fill(); }
      });
      // the keystone with the carved Great Tree
      c.beginPath(); c.roundRect(-46, -500, 92, 76, 16); c.fillStyle = grad(c, -500, -424, '#cdc8c0', '#a29c95'); c.fill(); out(c, 5);
      c.fillStyle = 'rgba(80,70,70,0.6)'; c.beginPath(); c.roundRect(-4, -458, 8, 24, 2); c.fill();
      [[0, -470, 14], [-12, -460, 10], [12, -460, 10]].forEach(([x, y, r]) => { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); });
      c.restore();
    },
    drawLight(c, t, state, light) {
      if (state !== 'open') return;
      c.save(); c.globalCompositeOperation = 'lighter';
      way(c); c.clip();
      const p = 0.85 + 0.15 * Math.sin(t * 1.8);
      const g = c.createRadialGradient(0, -160, 20, 0, -200, 360); g.addColorStop(0, `rgba(255,214,130,${0.75 * p})`); g.addColorStop(1, `rgba(255,170,80,${0.25 * p})`);
      c.fillStyle = g; c.fillRect(-160, -430, 320, 430);
      c.restore();
      c.save(); c.globalCompositeOperation = 'lighter';
      // the light spilling onto the ground in front
      c.scale(1, 0.18); const h = c.createRadialGradient(0, 0, 10, 0, 0, 240); h.addColorStop(0, `rgba(255,214,130,${0.35 * p})`); h.addColorStop(1, 'rgba(255,214,130,0)');
      c.fillStyle = h; c.beginPath(); c.arc(0, 0, 240, 0, Math.PI * 2); c.fill();
      c.restore();
    },
  });
})(this);
