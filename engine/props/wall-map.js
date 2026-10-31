// The wall map (set piece): a great slab of old stone at the end of the cave tunnel, with a map carved into it a
// very long time ago (Episode 9). From the top: the cave and its mouth, stairs going down, then three floors under
// the ground, one below the other, each with winding passages and little rooms, joined by more stairs. One, two and
// three carved dots mark the floors. On the third floor the passages lead to a round chamber with a carved star in
// it: the only part that gleams, faintly, as if it were waiting (drawLight). The grooves are dark with a light
// lower edge, so they read as carved. Taller than Ren.
(function (root) {
  const { register } = typeof module !== 'undefined' ? require('../assets.js') : root.StudioAssets;
  const LINE = '#4a2616';
  const grad = (c, y0, y1, a, b) => { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; };
  // the slab: a big rounded stone, a little lumpy at the edges
  const slab = c => {
    c.beginPath(); c.moveTo(-330, 0);
    c.bezierCurveTo(-342, -150, -332, -360, -318, -470); c.bezierCurveTo(-300, -545, -150, -560, 0, -555);
    c.bezierCurveTo(150, -562, 305, -548, 320, -470); c.bezierCurveTo(336, -350, 344, -160, 332, 0);
    c.closePath();
  };
  // a carved line: a dark groove with a light lower edge
  function carve(c, path, w = 7) {
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    c.translate(0, 2); c.strokeStyle = 'rgba(255,250,240,0.28)'; c.lineWidth = w * 0.55; path(); c.stroke();
    c.translate(0, -2); c.strokeStyle = 'rgba(52,40,58,0.78)'; c.lineWidth = w; path(); c.stroke();
    c.restore();
  }
  // stairs going down: little zigzag steps from (x, y), n steps
  const steps = (c, x, y, n, dir = 1) => { c.beginPath(); c.moveTo(x, y); for (let i = 0; i < n; i++) { c.lineTo(x + dir * (i + 1) * 14, y + i * 14); c.lineTo(x + dir * (i + 1) * 14, y + (i + 1) * 14); } };
  const star = (c, x, y, R, r) => { c.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r : R; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); };
  const STAR = [150, -92];
  const CRACKS = [[-300, -420, -270, -390, -282, -350], [296, -200, 270, -170, 284, -130], [-120, -540, -110, -510, -126, -490]];
  const RUBBLE = [[-300, -12, 34, 20], [-250, -6, 22, 14], [282, -12, 36, 22], [236, -5, 20, 12], [-30, -4, 18, 10]];

  register({
    id: 'wall-map', kind: 'prop', names: ['wall map', 'map on the wall', 'carved map', 'stone map', 'dungeon map', 'map wall'], size: 'big', height: 560,
    states: [], glow: false, motion: 'none', credit: 'Claude Code',
    draw(c, t) {
      c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
      c.fillStyle = 'rgba(40,30,40,0.3)'; c.beginPath(); c.ellipse(0, 3, 360, 20, 0, 0, Math.PI * 2); c.fill();
      // the slab
      slab(c); c.fillStyle = grad(c, -560, 0, '#b3acbb', '#857d96'); c.fill(); c.lineWidth = 6; c.strokeStyle = LINE; c.stroke();
      c.save(); slab(c); c.clip();
      // a soft lighter face where the carving is, and darker sides
      c.fillStyle = 'rgba(255,255,255,0.12)'; c.beginPath(); c.ellipse(0, -290, 270, 250, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(60,50,80,0.18)'; c.fillRect(-340, -560, 50, 560); c.fillRect(290, -560, 50, 560);
      // cracks
      c.strokeStyle = 'rgba(74,38,22,0.45)'; c.lineWidth = 3;
      CRACKS.forEach(([a, b, m, n, e, f]) => { c.beginPath(); c.moveTo(a, b); c.quadraticCurveTo(m, n, e, f); c.stroke(); });
      // --- the carved map ---
      // the cave at the top: its mouth on the left and the tunnel winding to the stairs
      carve(c, () => { c.beginPath(); c.moveTo(-232, -458); c.bezierCurveTo(-232, -500, -180, -500, -180, -458); });
      carve(c, () => { c.beginPath(); c.moveTo(-180, -470); c.bezierCurveTo(-120, -500, -70, -440, -10, -470); c.quadraticCurveTo(20, -486, 30, -462); });
      carve(c, () => steps(c, 30, -458, 3), 5);
      // a carved line under each floor, and one, two, three dots for the floors
      [-418, -298, -178].forEach(y => carve(c, () => { c.beginPath(); c.moveTo(-262, y); c.bezierCurveTo(-100, y - 6, 100, y + 6, 262, y); }, 4));
      [[-385, 1], [-262, 2], [-142, 3]].forEach(([y, n]) => {
        for (let k = 0; k < n; k++) { c.beginPath(); c.arc(-244, y + k * 18, 6, 0, Math.PI * 2); c.fillStyle = 'rgba(52,40,58,0.78)'; c.fill(); }
      });
      // floor one: a winding passage with two little rooms, and stairs down on the right
      carve(c, () => { c.beginPath(); c.moveTo(72, -410); c.bezierCurveTo(40, -380, -60, -400, -90, -370); c.bezierCurveTo(-120, -340, -40, -320, 40, -335); c.bezierCurveTo(110, -350, 170, -330, 200, -318); });
      carve(c, () => { c.beginPath(); c.arc(-160, -370, 18, 0, Math.PI * 2); });
      carve(c, () => { c.beginPath(); c.moveTo(-108, -370); c.lineTo(-142, -370); });
      carve(c, () => { c.beginPath(); c.arc(110, -385, 14, 0, Math.PI * 2); }, 6);
      carve(c, () => steps(c, 200, -312, 3), 5);
      // floor two: longer passages with a dead end, and stairs down on the left
      carve(c, () => { c.beginPath(); c.moveTo(242, -282); c.bezierCurveTo(200, -250, 120, -270, 60, -250); c.bezierCurveTo(0, -230, -60, -270, -130, -240); c.bezierCurveTo(-170, -225, -190, -210, -190, -196); });
      carve(c, () => { c.beginPath(); c.moveTo(60, -250); c.quadraticCurveTo(80, -210, 140, -210); });
      carve(c, () => { c.beginPath(); c.moveTo(-30, -246); c.quadraticCurveTo(-20, -280, 20, -282); });
      carve(c, () => { c.beginPath(); c.arc(170, -210, 15, 0, Math.PI * 2); }, 6);
      carve(c, () => steps(c, -190, -192, 3, -1), 5);
      // floor three: the passage winds to a round chamber with a carved star in it
      carve(c, () => { c.beginPath(); c.moveTo(-232, -150); c.bezierCurveTo(-200, -110, -120, -140, -60, -110); c.bezierCurveTo(0, -80, 60, -120, 108, -96); });
      carve(c, () => { c.beginPath(); c.arc(STAR[0], STAR[1], 44, 0, Math.PI * 2); });
      carve(c, () => star(c, STAR[0], STAR[1], 24, 10), 5);
      c.restore();
      // moss along the top and a little at the bottom
      c.fillStyle = '#7fae69';
      [[-200, -548, 70, 12], [-60, -556, 50, 9], [170, -552, 80, 12], [-318, -120, 14, 40], [322, -300, 12, 36]].forEach(([x, y, rx, ry]) => { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); });
      c.fillStyle = 'rgba(255,255,255,0.25)'; c.beginPath(); c.ellipse(-150, -500, 70, 14, -0.1, 0, Math.PI * 2); c.fill();
      // fallen stones at the foot
      RUBBLE.forEach(([x, y, rx, ry], i) => {
        c.beginPath(); c.ellipse(x, y, rx, ry, i * 0.3, 0, Math.PI * 2); c.fillStyle = grad(c, y - ry, y + ry, '#a59eb0', '#7a728c'); c.fill(); c.lineWidth = 4; c.strokeStyle = LINE; c.stroke();
      });
      c.restore();
    },
    // the carved star gleams faintly, slowly, even in the dark: something down there is waiting
    drawLight(c, t) {
      const p = 0.5 + 0.5 * Math.sin(t * 1.3);
      c.save(); c.globalCompositeOperation = 'lighter';
      const g = c.createRadialGradient(STAR[0], STAR[1], 2, STAR[0], STAR[1], 60); g.addColorStop(0, `rgba(255,220,140,${0.28 + 0.2 * p})`); g.addColorStop(1, 'rgba(255,220,140,0)');
      c.fillStyle = g; c.fillRect(STAR[0] - 60, STAR[1] - 60, 120, 120);
      star(c, STAR[0], STAR[1], 20, 8); c.fillStyle = `rgba(255,226,150,${0.25 + 0.25 * p})`; c.fill();
      c.restore();
    },
  });
})(this);
