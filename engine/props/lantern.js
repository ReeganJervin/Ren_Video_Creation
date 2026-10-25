// A lantern (prop): a little bronze lantern with a candle. "the lantern glows" lights the candle; the flame and the
// lit glass are drawn after the time-of-day colour (drawLight), so the lantern is brightest at night.
(function (root) {
  const { register } = typeof module !== 'undefined' ? require('../assets.js') : root.StudioAssets;
  const LINE = '#4a2616';
  const metal = (c, y0, y1) => { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, '#c8955a'); g.addColorStop(1, '#8a5d3b'); return g; };
  const out = (c, lw = 4) => { c.lineWidth = lw; c.strokeStyle = LINE; c.stroke(); };
  // the glass panes (lit: warm gold; unlit: a soft cool cream)
  function glass(c, lit) {
    const g = c.createLinearGradient(0, -74, 0, -16);
    if (lit) { g.addColorStop(0, '#fff6c8'); g.addColorStop(1, '#ffc24a'); } else { g.addColorStop(0, '#f4f1e6'); g.addColorStop(1, '#d9d6cc'); }
    c.beginPath(); c.roundRect(-22, -74, 44, 58, 12); c.fillStyle = g; c.fill();
  }
  function flame(c, t, k) {
    const f = 1 + 0.08 * Math.sin(t * 13) + 0.05 * Math.sin(t * 7.3 + 1);
    c.save(); c.translate(0, -36); c.scale(k, k * f);
    c.beginPath(); c.moveTo(0, -18); c.quadraticCurveTo(9, -4, 0, 4); c.quadraticCurveTo(-9, -4, 0, -18);
    const g = c.createRadialGradient(0, -2, 1, 0, -4, 14); g.addColorStop(0, '#fffbe6'); g.addColorStop(0.5, '#ffd25a'); g.addColorStop(1, '#ff9a3a');
    c.fillStyle = g; c.fill(); c.restore();
  }

  register({
    id: 'lantern', kind: 'prop', names: ['lantern', 'little lantern', 'old lantern'], size: 'small', height: 95, hold: 'one paw',
    states: ['off', 'glowing'], glow: true, motion: 'flicker', credit: 'Claude Code',
    draw(c, t, state) {
      c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
      // the ring handle on top
      c.beginPath(); c.arc(0, -86, 9, Math.PI * 1.05, Math.PI * 1.95); out(c, 4);
      // the cap: a little roof
      c.beginPath(); c.moveTo(-26, -74); c.quadraticCurveTo(0, -92, 26, -74); c.closePath(); c.fillStyle = metal(c, -90, -74); c.fill(); out(c);
      // glass, with the candle inside when it's not lit
      glass(c, state === 'glowing');
      if (state !== 'glowing') {
        c.beginPath(); c.roundRect(-6, -40, 12, 22, 3); c.fillStyle = '#fff4e4'; c.fill(); out(c, 2.5);
        c.beginPath(); c.moveTo(0, -40); c.lineTo(0, -46); out(c, 2.5);
      }
      c.beginPath(); c.roundRect(-22, -74, 44, 58, 12); out(c);
      // the frame bars and a highlight on the glass
      c.beginPath(); c.moveTo(0, -74); c.lineTo(0, -60); c.moveTo(0, -30); c.lineTo(0, -16); out(c, 3);
      c.fillStyle = 'rgba(255,255,255,0.65)'; c.beginPath(); c.ellipse(-12, -60, 4, 9, -0.25, 0, Math.PI * 2); c.fill();
      // the base
      c.beginPath(); c.roundRect(-28, -18, 56, 18, 7); c.fillStyle = metal(c, -18, 0); c.fill(); out(c);
      c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.roundRect(-20, -14, 22, 4, 2); c.fill();
      c.restore();
    },
    // lit: the warm glass and the flickering flame stay bright at any time of day
    drawLight(c, t, state) {
      if (state !== 'glowing') return;
      c.save();
      c.globalAlpha = 0.85; glass(c, true); c.globalAlpha = 1;
      flame(c, t, 1);
      c.beginPath(); c.roundRect(-22, -74, 44, 58, 12); c.lineWidth = 4; c.strokeStyle = LINE; c.stroke();
      c.beginPath(); c.moveTo(0, -74); c.lineTo(0, -60); c.moveTo(0, -30); c.lineTo(0, -16); c.lineWidth = 3; c.stroke();
      c.restore();
    },
  });
})(this);
