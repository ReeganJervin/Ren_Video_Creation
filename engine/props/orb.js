// The orb (prop): an old artefact, a glass sphere on a little golden stand shaped like three roots. Inside, a soft
// violet-blue mist turns slowly with tiny stars in it. "the orb glows": the mist lights up from inside and the
// stars sparkle (drawLight), brightest at night.
(function (root) {
  const { register } = typeof module !== 'undefined' ? require('../assets.js') : root.StudioAssets;
  const LINE = '#4a2616';
  const R = 28, CY = -46;
  function mist(c, t, a) {
    c.save(); c.beginPath(); c.arc(0, CY, R - 2, 0, Math.PI * 2); c.clip();
    for (let k = 0; k < 3; k++) {
      const ang = t * 0.6 + k * 2.1, x = Math.cos(ang) * 9, y = CY + Math.sin(ang * 1.3) * 7;
      const g = c.createRadialGradient(x, y, 2, x, y, 22); g.addColorStop(0, `rgba(${k === 1 ? '150,200,255' : '200,160,255'},${0.55 * a})`); g.addColorStop(1, 'rgba(200,160,255,0)');
      c.fillStyle = g; c.fillRect(-R, CY - R, R * 2, R * 2);
    }
    for (let k = 0; k < 5; k++) {
      const ang = t * 0.4 + k * 1.26, x = Math.cos(ang) * (8 + k * 3), y = CY + Math.sin(ang) * (5 + k * 2), w = 0.5 + 0.5 * Math.sin(t * 3 + k);
      c.fillStyle = `rgba(255,255,255,${(0.4 + 0.6 * w) * a})`; c.beginPath(); c.arc(x, y, 1.4 + w, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  }

  register({
    id: 'orb', kind: 'prop', names: ['orb', 'artefact', 'artifact', 'magic orb', 'crystal ball', 'glass orb'], size: 'small', height: 76, hold: 'both paws',
    states: ['off', 'glowing'], glow: true, glowColor: '200,170,255', halo: false, motion: 'none', credit: 'Claude Code',
    draw(c, t, state) {
      c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
      // the stand: three golden roots holding the sphere
      c.beginPath(); c.moveTo(-20, 0); c.quadraticCurveTo(-18, -12, -12, -20); c.lineTo(12, -20); c.quadraticCurveTo(18, -12, 20, 0); c.closePath();
      const gg = c.createLinearGradient(0, -22, 0, 0); gg.addColorStop(0, '#ffe58a'); gg.addColorStop(1, '#d99a2b');
      c.fillStyle = gg; c.fill(); c.lineWidth = 3.5; c.strokeStyle = LINE; c.stroke();
      // the glass sphere
      c.beginPath(); c.arc(0, CY, R, 0, Math.PI * 2);
      const g = c.createRadialGradient(-8, CY - 10, 3, 0, CY, R); g.addColorStop(0, '#eae4ff'); g.addColorStop(0.7, '#a89ae0'); g.addColorStop(1, '#6e62b8');
      c.fillStyle = g; c.fill();
      mist(c, t, 0.6);
      c.beginPath(); c.arc(0, CY, R, 0, Math.PI * 2); c.lineWidth = 4; c.strokeStyle = LINE; c.stroke();
      // the roots curling up around it
      c.strokeStyle = '#e8b84a'; c.lineWidth = 4;
      [-1, 1].forEach(sd => { c.beginPath(); c.moveTo(sd * 10, -20); c.quadraticCurveTo(sd * 30, -26, sd * 26, -44); c.stroke(); });
      c.fillStyle = 'rgba(255,255,255,0.8)'; c.beginPath(); c.ellipse(-10, CY - 12, 7, 4, -0.6, 0, Math.PI * 2); c.fill();
      c.restore();
    },
    drawLight(c, t, state) {
      if (state !== 'glowing') return;
      c.save(); c.globalCompositeOperation = 'lighter';
      const p = 0.85 + 0.15 * Math.sin(t * 2.4);
      const g = c.createRadialGradient(0, CY, 4, 0, CY, R * 2.2); g.addColorStop(0, `rgba(220,200,255,${0.38 * p})`); g.addColorStop(0.45, `rgba(170,150,255,${0.25 * p})`); g.addColorStop(1, 'rgba(170,150,255,0)');
      c.fillStyle = g; c.fillRect(-R * 2.2, CY - R * 2.2, R * 4.4, R * 4.4);
      mist(c, t, 1);
      c.restore();
    },
  });
})(this);
