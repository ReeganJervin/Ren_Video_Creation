// The legendary sword (prop): Starfang. A long, broad silver blade with a fuller full of old runes (its name, in a
// language nobody speaks any more), a golden crossguard shaped like two swept-back wings with a blue star-gem in the
// middle, a navy grip bound in gold and a golden star for a pommel. On the ground it stands planted point-down;
// in a paw it's held by the grip, blade up. It glows only for Ren: when he holds it the runes, the edges and the
// gem light up ice-blue (glowsFor), and the light goes out when he lets go. "the sword glows" works for anyone.
(function (root) {
  const { register } = typeof module !== 'undefined' ? require('../assets.js') : root.StudioAssets;
  const LINE = '#4a2616';
  const TIP = 236;   // from the bottom of the pommel to the point
  const BLADE0 = 80; // where the blade starts (just above the guard)
  // the blade outline: broad, with a long leaf-shaped point
  const blade = c => {
    c.beginPath(); c.moveTo(-15, -BLADE0);
    c.lineTo(-16, -150); c.quadraticCurveTo(-16, -200, 0, -TIP); c.quadraticCurveTo(16, -200, 16, -150); c.lineTo(15, -BLADE0); c.closePath();
  };
  // the runes along the fuller: little angular marks (deterministic), y from the guard up
  const RUNES = [
    [[-4, 0, 4, -6], [0, -8, 0, 4]], [[-4, -6, 4, -6], [-4, -6, 0, 4], [4, -6, 0, 4]], [[0, -8, 0, 4], [-4, -2, 4, -2]],
    [[-4, 4, 0, -8], [0, -8, 4, 4], [-2, -1, 2, -1]], [[-4, -7, 4, 3], [4, -7, -4, 3]], [[0, -8, -4, -2], [-4, -2, 0, 4], [0, 4, 4, -2]],
  ];
  const runeY = i => -100 - i * 19;
  function drawRunes(c, col, lw) {
    c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round';
    RUNES.forEach((r, i) => r.forEach(([x0, y0, x1, y1]) => { c.beginPath(); c.moveTo(x0, runeY(i) + y0); c.lineTo(x1, runeY(i) + y1); c.stroke(); }));
  }
  function starPath(c, x, y, r) { c.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.5 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); }
  // on the ground the sword stands upside down, its point in the earth; in a paw it's held blade up
  // (drawn at 1.25x: nearly as tall as Ren)
  const SC = 1.25;
  function pose(c, held) { if (!held) { c.translate(0, -(TIP - 22) * SC); c.rotate(Math.PI); } c.scale(SC, SC); }

  register({
    id: 'sword', kind: 'prop', names: ['sword', 'legendary sword', 'starfang', 'old sword', 'magic sword'], size: 'medium', height: 295, hold: 'one paw',
    grip: -55, hilt: true,   // held by the grip (held up high: by the end of the grip)
    lean: 0.3, raise: 3.0,   // in a paw it leans out a little; held up, it goes straight up like a hero's
    states: ['off', 'glowing'], glow: true, glowsFor: ['ren'], glowColor: '150,225,255', halo: false, motion: 'none', credit: 'Claude Code',
    draw(c, t, state, light) {
      const held = !!(light && light.held);
      c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
      if (!held) {
        // a little mound of earth where the point went in
        c.fillStyle = 'rgba(60,40,28,0.25)'; c.beginPath(); c.ellipse(0, 2, 34, 6, 0, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.moveTo(-26, 2); c.quadraticCurveTo(0, -14, 26, 2); c.closePath(); c.fillStyle = '#9a7048'; c.fill(); c.lineWidth = 3; c.strokeStyle = LINE; c.stroke();
        c.beginPath(); c.rect(-200, -500, 400, 498); c.clip();   // the point is in the ground
      }
      pose(c, held);
      // the blade: two bevels (a light side and a shadow side) and a fuller down the middle
      blade(c); const g = c.createLinearGradient(-16, 0, 16, 0); g.addColorStop(0, '#f4f8fd'); g.addColorStop(0.5, '#dfe7f2'); g.addColorStop(0.51, '#b7c4d8'); g.addColorStop(1, '#9fb0c8');
      c.fillStyle = g; c.fill(); c.lineWidth = 4; c.strokeStyle = LINE; c.stroke();
      c.beginPath(); c.moveTo(0, -BLADE0 - 4); c.lineTo(0, -TIP + 18); c.lineWidth = 1.5; c.strokeStyle = 'rgba(80,95,130,0.35)'; c.stroke();
      c.beginPath(); c.roundRect(-5, -205, 10, 120, 5); c.fillStyle = 'rgba(120,140,180,0.35)'; c.fill();
      drawRunes(c, 'rgba(60,75,120,0.7)', 2);
      // a bright glint along the light edge
      c.beginPath(); c.moveTo(-11, -96); c.lineTo(-12, -150); c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,0.85)'; c.stroke();
      // the crossguard: two golden wings swept up, with curled tips
      c.beginPath();
      c.moveTo(-14, -66); c.quadraticCurveTo(-40, -64, -58, -86); c.quadraticCurveTo(-50, -92, -44, -84); c.quadraticCurveTo(-30, -76, -14, -82);
      c.lineTo(14, -82); c.quadraticCurveTo(30, -76, 44, -84); c.quadraticCurveTo(50, -92, 58, -86); c.quadraticCurveTo(40, -64, 14, -66); c.closePath();
      const gg = c.createLinearGradient(0, -92, 0, -64); gg.addColorStop(0, '#ffe58a'); gg.addColorStop(1, '#d99a2b');
      c.fillStyle = gg; c.fill(); c.lineWidth = 4; c.strokeStyle = LINE; c.stroke();
      // the star-gem in the middle of the guard
      starPath(c, 0, -74, 11); const sg = c.createRadialGradient(-3, -77, 1, 0, -74, 12); sg.addColorStop(0, '#d8f6ff'); sg.addColorStop(1, '#3d8fd8');
      c.fillStyle = sg; c.fill(); c.lineWidth = 2.5; c.strokeStyle = LINE; c.stroke();
      // the grip: navy, bound with gold
      c.beginPath(); c.roundRect(-7, -64, 14, 44, 4); c.fillStyle = '#2f3d6e'; c.fill(); c.lineWidth = 3.5; c.strokeStyle = LINE; c.stroke();
      c.strokeStyle = '#e8b84a'; c.lineWidth = 2.5; [-56, -46, -36, -26].forEach(y => { c.beginPath(); c.moveTo(-6, y + 4); c.lineTo(6, y - 2); c.stroke(); });
      // the pommel: a golden star
      starPath(c, 0, -12, 13); c.fillStyle = gg; c.fill(); c.lineWidth = 3; c.strokeStyle = LINE; c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.arc(-3, -16, 2.5, 0, Math.PI * 2); c.fill();
      c.restore();
    },
    // glowing: the runes burn ice-blue, light runs along both edges, the gem shines and little stars twinkle on the blade
    drawLight(c, t, state, light) {
      if (state !== 'glowing') return;
      const held = !!(light && light.held), pulse = 0.8 + 0.2 * Math.sin(t * 3.2);
      c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
      if (!held) { c.beginPath(); c.rect(-200, -500, 400, 498); c.clip(); }
      pose(c, held);
      c.globalCompositeOperation = 'lighter';
      const g = c.createRadialGradient(0, -160, 10, 0, -150, 120); g.addColorStop(0, `rgba(150,225,255,${0.22 * pulse})`); g.addColorStop(1, 'rgba(150,225,255,0)');
      c.fillStyle = g; c.fillRect(-130, -290, 260, 260);
      blade(c); c.lineWidth = 4; c.strokeStyle = `rgba(150,225,255,${0.55 * pulse})`; c.stroke();
      c.save(); blade(c); c.clip(); c.fillStyle = `rgba(110,190,255,${0.18 * pulse})`; c.fillRect(-20, -TIP, 40, TIP); c.restore();
      c.shadowColor = 'rgba(120,220,255,0.9)'; c.shadowBlur = 12;
      drawRunes(c, `rgba(200,250,255,${pulse})`, 2.6);
      c.shadowBlur = 0;
      starPath(c, 0, -74, 11); c.fillStyle = `rgba(190,240,255,${0.8 * pulse})`; c.fill();
      // twinkles travelling up the blade
      for (let k = 0; k < 3; k++) {
        const u = (t * 0.5 + k / 3) % 1, y = -BLADE0 - u * (TIP - BLADE0 - 20), a = Math.sin(u * Math.PI), s = 7 * a;
        c.fillStyle = `rgba(235,252,255,${a})`; c.beginPath(); c.moveTo(k % 2 ? 9 : -9, y - s); c.quadraticCurveTo(k % 2 ? 9 : -9, y, (k % 2 ? 9 : -9) + s, y);
        c.quadraticCurveTo(k % 2 ? 9 : -9, y, k % 2 ? 9 : -9, y + s); c.quadraticCurveTo(k % 2 ? 9 : -9, y, (k % 2 ? 9 : -9) - s, y); c.quadraticCurveTo(k % 2 ? 9 : -9, y, k % 2 ? 9 : -9, y - s); c.fill();
      }
      c.restore();
    },
  });
})(this);
