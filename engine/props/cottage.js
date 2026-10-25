// A cottage (set piece): cream walls, a round red roof with a chimney, two round windows, a flower box and a wooden
// door. "the cottage opens" swings the door open. At dusk and night the windows (and the open doorway) glow warm:
// that light is drawn after the time-of-day colour (drawLight), so it stays bright.
(function (root) {
  const { register } = typeof module !== 'undefined' ? require('../assets.js') : root.StudioAssets;
  const LINE = '#4a2616';
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const grad = (c, y0, y1, a, b) => { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; };
  const out = (c, lw = 5) => { c.lineWidth = LW(lw); c.strokeStyle = LINE; c.stroke(); };
  const WIN = [[-104, -150], [104, -150]];   // window centres
  // drawn at 1.9x: the door is about Ren's height (to the base of his ears), the cottage about twice his height.
  // Line widths are divided by S, so outlines stay at the set-piece thickness of STYLE-GUIDE.md (about 6 px).
  const S = 1.9, LW = w => w * 1.2 / S;
  // the door opening (also where the warm light shows when it's open)
  const doorway = c => { c.beginPath(); c.moveTo(-38, 0); c.lineTo(-38, -100); c.arc(0, -100, 38, Math.PI, 0); c.lineTo(38, 0); c.closePath(); };

  register({
    id: 'cottage', kind: 'prop', names: ['cottage', 'little cottage'], size: 'big', height: 680,
    states: ['closed', 'open'], glow: false, credit: 'Claude Code',
    draw(c, t, state) {
      c.save(); c.scale(S, S); c.lineJoin = 'round'; c.lineCap = 'round';
      // a soft shadow on the ground, like the characters have
      const sh = c.createRadialGradient(0, 2, 20, 0, 2, 215); sh.addColorStop(0, 'rgba(60,40,28,0.28)'); sh.addColorStop(1, 'rgba(60,40,28,0)');
      c.save(); c.scale(1, 0.12); c.fillStyle = sh; c.beginPath(); c.arc(0, 16, 215, 0, Math.PI * 2); c.fill(); c.restore();
      // chimney, with a soft puff of smoke drifting up
      c.beginPath(); c.roundRect(78, -330, 40, 80, 6); c.fillStyle = grad(c, -330, -250, '#c97a5c', '#a85a44'); c.fill(); out(c);
      c.beginPath(); c.roundRect(72, -340, 52, 16, 5); c.fillStyle = '#8e4a38'; c.fill(); out(c, 4);
      for (let k = 0; k < 3; k++) {
        const u = ((t * 0.25 + k / 3) % 1), y = -352 - u * 70, a = Math.sin(u * Math.PI) * 0.55;
        c.fillStyle = `rgba(255,255,255,${a})`; c.beginPath(); c.arc(98 + Math.sin(u * 5 + k) * 8, y, 9 + u * 10, 0, Math.PI * 2); c.fill();
      }
      // walls
      c.beginPath(); c.roundRect(-170, -232, 340, 232, [10, 10, 4, 4]); c.fillStyle = grad(c, -232, 0, '#fbecd2', '#efd4a8'); c.fill(); out(c);
      // a few soft stones along the bottom
      c.fillStyle = '#e2c08e'; [[-140, -12], [-96, -14], [96, -14], [140, -12]].forEach(([x, y]) => { c.beginPath(); c.ellipse(x, y, 16, 8, 0, 0, Math.PI * 2); c.fill(); });
      // roof: a big round red roof with a soft overhang
      c.beginPath(); c.moveTo(-200, -214); c.quadraticCurveTo(-120, -300, 0, -352); c.quadraticCurveTo(120, -300, 200, -214);
      c.quadraticCurveTo(204, -196, 186, -196); c.lineTo(-186, -196); c.quadraticCurveTo(-204, -196, -200, -214); c.closePath();
      c.fillStyle = grad(c, -352, -196, '#e07a5c', '#c25b45'); c.fill(); out(c);
      c.strokeStyle = 'rgba(120,40,30,0.35)'; c.lineWidth = LW(3);
      [[-120, -232], [-40, -250], [40, -250], [120, -232]].forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 26, Math.PI * 0.15, Math.PI * 0.85); c.stroke(); });
      c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.ellipse(-70, -296, 46, 9, -0.5, 0, Math.PI * 2); c.fill();
      // windows: round panes with a cross, and a flower box under each
      WIN.forEach(([x, y]) => {
        c.beginPath(); c.arc(x, y, 30, 0, Math.PI * 2); c.fillStyle = grad(c, y - 30, y + 30, '#bfe6f6', '#8cc9e8'); c.fill(); out(c);
        c.beginPath(); c.moveTo(x - 30, y); c.lineTo(x + 30, y); c.moveTo(x, y - 30); c.lineTo(x, y + 30); out(c, 3.5);
        c.fillStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.ellipse(x - 12, y - 13, 6, 9, -0.6, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.roundRect(x - 36, y + 34, 72, 16, 5); c.fillStyle = '#9c6a44'; c.fill(); out(c, 4);
        ['#ff9ec4', '#fff3a6', '#ff9ec4'].forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.arc(x - 22 + i * 22, y + 30, 8, 0, Math.PI * 2); c.fill(); c.lineWidth = LW(2.5); c.strokeStyle = LINE; c.stroke(); });
      });
      // the door: closed, or swung open (dark warm inside, the door folded back against the wall)
      if (state === 'open') {
        doorway(c); c.fillStyle = '#5a3420'; c.fill(); out(c);
        c.beginPath(); c.moveTo(-38, 0); c.lineTo(-38, -138); c.lineTo(-74, -126); c.lineTo(-74, -6); c.closePath(); c.fillStyle = grad(c, -138, 0, '#b07a4e', '#8a5a36'); c.fill(); out(c);
      } else {
        doorway(c); c.fillStyle = grad(c, -138, 0, '#b07a4e', '#8a5a36'); c.fill(); out(c);
        c.beginPath(); c.moveTo(0, -136); c.lineTo(0, 0); c.moveTo(-38, -70); c.lineTo(38, -70); out(c, 3);
        c.fillStyle = '#f4c45a'; c.beginPath(); c.arc(24, -60, 6, 0, Math.PI * 2); c.fill(); out(c, 3);
      }
      // the doorstep
      c.beginPath(); c.roundRect(-56, -6, 112, 12, 5); c.fillStyle = '#d9b98a'; c.fill(); out(c, 4);
      c.restore();
    },
    // at dusk and night: warm light in the windows, and in the doorway when the door is open
    drawLight(c, t, state, light) {
      // fades in during sunset, full from dusk on
      const k = clamp((light.tau - 1.2) / 0.6);
      if (k <= 0) return;
      c.save(); c.scale(S, S);
      const warm = (y0, y1) => grad(c, y0, y1, `rgba(255,236,170,${0.95 * k})`, `rgba(255,190,90,${0.95 * k})`);
      WIN.forEach(([x, y]) => {
        c.beginPath(); c.arc(x, y, 28, 0, Math.PI * 2); c.fillStyle = warm(y - 28, y + 28); c.fill();
        c.globalAlpha = k; c.beginPath(); c.moveTo(x - 30, y); c.lineTo(x + 30, y); c.moveTo(x, y - 30); c.lineTo(x, y + 30); c.lineWidth = LW(3.5); c.strokeStyle = LINE; c.stroke();
        c.beginPath(); c.arc(x, y, 30, 0, Math.PI * 2); c.lineWidth = LW(5); c.stroke(); c.globalAlpha = 1;
      });
      if (state === 'open') { doorway(c); c.fillStyle = warm(-138, 0); c.fill(); c.globalAlpha = k; c.lineWidth = LW(5); c.strokeStyle = LINE; c.stroke(); }
      c.restore();
    },
  });
})(this);
