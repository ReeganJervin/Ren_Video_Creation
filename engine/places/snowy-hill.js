// Snowy hill: snow-covered hills and snowy pine trees with soft blue shadows, a little snowman and
// sparkles twinkling on the snow.
(function (root) {
  const { register, util } = typeof module !== 'undefined' ? require('./index.js') : root.StudioPlaces;
  const { clamp, hash, tod, toda, sky, sparkle } = util;
  const PAL = {
    skyTop: ['#8cc6ee', '#f2a2b4', '#675aa8', '#0a1638'], skyMid: ['#c4e4f7', '#f8c6c3', '#b38abf', '#19295c'], skyBot: ['#eef8ff', '#fde2d5', '#e5afc3', '#323f78'],
    sun: ['#fffdf2', '#fff2dc', '#ffd2b0', '#ffd2b0'], cloud: ['#ffffff', '#fff6f2', '#e6c0d4', '#4a5290'],
    far: ['#dde9f5', '#f2d2da', '#a89bc4', '#38457a'], farPine: ['#86a8bb', '#a8a0b0', '#6f7096', '#1f2e52'],
    mid: ['#eaf2fa', '#f6dee3', '#b7abcf', '#45528a'], pine: ['#4d7b86', '#677c88', '#4a5a7c', '#182a44'], cap: ['#f6fbff', '#fdeef0', '#d2c9e4', '#6a76a8'],
    snow: ['#f7fbff', '#fdeff0', '#d0c7e3', '#5b6799'], shadow: ['#cddff2', '#ecd0dc', '#a59cc9', '#3c4880'],
    coal: ['#3a3440', '#3a3440', '#302a3a', '#15141e'], carrot: ['#f39a4a', '#f39a4a', '#c07a6a', '#5a4a5a'], scarf: ['#e86a6a', '#e86a6a', '#b0607a', '#4a3a5a'], stick: ['#7a5236', '#7a5236', '#5a4646', '#1c2430'],
  };
  const FAR_PINES = Array.from({ length: 16 }, (_, i) => ({ x: -260 + i * 170 + hash(i + 5) * 70, y: 560 + hash(i + 11) * 40, s: 0.5 + hash(i + 19) * 0.25 }));
  const PINES = [[60, 700, 1.1], [200, 720, 0.85], [1640, 700, 1.0], [1780, 725, 0.8], [1900, 705, 1.05], [-110, 715, 0.95], [2050, 715, 0.9]];
  const DRIFTS = [[560, 990, 170, 34], [1430, 1010, 200, 38], [960, 1075, 320, 30], [1720, 900, 140, 24], [130, 905, 120, 20], [1180, 960, 110, 18]];
  // a trail of little paw prints winding across the snow
  const PRINTS = Array.from({ length: 16 }, (_, i) => { const u = i / 15; return { x: 380 + u * 1180, y: 1040 - Math.sin(u * Math.PI) * 70 + (i % 2 ? 9 : -9), r: 0.25 + 0.1 * Math.sin(u * 5) }; });
  const BUSHES = [[70, 1020, 1.2], [210, 1060, 0.85], [1730, 1050, 1.0], [1870, 1010, 1.25]];
  const FRONT_PINES = [[45, 1090, 1.2], [1885, 1095, 1.25]];
  const GLINTS = Array.from({ length: 60 }, (_, i) => ({ x: hash(i + 900) * 2300 - 190, y: 800 + hash(i + 950) * 270, ph: hash(i + 990) * 6, s: 3 + hash(i + 1010) * 5 }));

  function pine(c, x, y, s, t, i, tau, body, capCol) {
    c.save(); c.translate(x, y); c.rotate(Math.sin(t * 1.2 + i) * 0.015); c.scale(s, s);
    c.fillStyle = tod(tau, PAL.stick); c.fillRect(-9, -10, 18, 30);
    [[0, -60, 70], [0, -110, 56], [0, -152, 42]].forEach(([dx, dy, w], k) => {
      c.fillStyle = body; c.beginPath(); c.moveTo(dx, dy - 60); c.lineTo(dx + w, dy + 50); c.quadraticCurveTo(dx, dy + 62, dx - w, dy + 50); c.closePath(); c.fill();
      // snow resting on each layer
      c.fillStyle = capCol; c.beginPath(); c.moveTo(dx, dy - 60); c.lineTo(dx + w * 0.55, dy - 8); c.quadraticCurveTo(dx + w * 0.25, dy + 2, dx, dy - 10); c.quadraticCurveTo(dx - w * 0.25, dy + 4, dx - w * 0.55, dy - 6); c.closePath(); c.fill();
    });
    c.restore();
  }
  function bush(c, x, y, s, tau) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = tod(tau, PAL.pine); [[-34, -20, 34], [0, -36, 40], [36, -18, 32]].forEach(([dx, dy, r]) => { c.beginPath(); c.arc(dx, dy, r, 0, Math.PI * 2); c.fill(); });
    c.fillStyle = tod(tau, PAL.cap); [[-34, -30, 32, 20], [0, -50, 38, 24], [36, -26, 30, 19]].forEach(([dx, dy, rx, ry]) => { c.beginPath(); c.ellipse(dx, dy, rx, ry, 0, 0, Math.PI * 2); c.fill(); });
    c.strokeStyle = tod(tau, PAL.shadow); c.lineWidth = 3; c.beginPath(); c.arc(0, -50, 30, 0.2, Math.PI - 0.2); c.stroke();
    c.fillStyle = tod(tau, PAL.snow); c.beginPath(); c.ellipse(0, 0, 80, 16, 0, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  function snowman(c, x, y, tau, t) {
    const snow = tod(tau, PAL.snow), sh = tod(tau, PAL.shadow);
    c.save(); c.translate(x, y); c.scale(1.45, 1.45);
    c.fillStyle = sh; c.beginPath(); c.ellipse(0, 4, 70, 14, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = tod(tau, PAL.stick); c.lineWidth = 5; c.lineCap = 'round';
    const wave = Math.sin(t * 2) * 0.08;
    c.beginPath(); c.moveTo(-34, -112); c.lineTo(-78, -150 + wave * 40); c.moveTo(-62, -138 + wave * 30); c.lineTo(-72, -160); c.stroke();
    c.beginPath(); c.moveTo(34, -112); c.lineTo(78, -140); c.stroke();
    [[0, -40, 52], [0, -118, 40], [0, -180, 30]].forEach(([dx, dy, r]) => {
      c.fillStyle = snow; c.beginPath(); c.arc(dx, dy, r, 0, Math.PI * 2); c.fill();
      c.strokeStyle = sh; c.lineWidth = 3; c.stroke();
      c.fillStyle = sh; c.beginPath(); c.arc(dx + r * 0.3, dy + r * 0.25, r * 0.75, -0.2, 1.9); c.arc(dx, dy, r, 1.9, -0.2, true); c.fill();
    });
    c.fillStyle = tod(tau, PAL.coal);
    [[-10, -188], [10, -188]].forEach(([dx, dy]) => { c.beginPath(); c.arc(dx, dy, 4, 0, Math.PI * 2); c.fill(); });
    [-30, -14, 2].forEach(dy => { c.beginPath(); c.arc(0, -118 + dy + 16, 4, 0, Math.PI * 2); c.fill(); });
    c.strokeStyle = tod(tau, PAL.coal); c.lineWidth = 2.5; c.beginPath(); c.arc(0, -176, 9, 0.3, Math.PI - 0.3); c.stroke();
    c.fillStyle = tod(tau, PAL.carrot); c.beginPath(); c.moveTo(0, -182); c.lineTo(26, -178); c.lineTo(0, -174); c.closePath(); c.fill();
    c.fillStyle = tod(tau, PAL.scarf); c.beginPath(); c.ellipse(0, -152, 34, 9, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.moveTo(14, -150); c.lineTo(28, -112 + Math.sin(t * 2.4) * 3); c.lineTo(16, -110); c.lineTo(6, -148); c.fill();
    c.restore();
  }

  register('snowy-hill', {
    name: 'snowy hill',
    pos: { left: 560, center: 960, right: 1360 },
    ground: x => 905 - 34 * Math.exp(-(((x - 960) / 300) ** 2)),
    grade: ['#f8fbff', '#fff0ea', '#e2d6ef', '#a8b2e8'], tint: ['#eef4ff', '#ffb6a0', '#9a86c6', '#3a4aa8'],
    draw(c, t, cam, tau, h) {
      sky(c, t, h, tau, PAL, { noBirds: true });
      h.cam(0.35);
      c.fillStyle = tod(tau, PAL.far);
      c.beginPath(); c.moveTo(-500, 620); c.quadraticCurveTo(250, 470, 760, 590); c.quadraticCurveTo(1200, 680, 1600, 540); c.quadraticCurveTo(1950, 450, 2500, 600); c.lineTo(2500, 1400); c.lineTo(-500, 1400); c.fill();
      const fp = tod(tau, PAL.farPine), fc = tod(tau, PAL.cap);
      FAR_PINES.forEach((p, i) => pine(c, p.x, p.y + 40, p.s, t, i, tau, fp, fc));
      h.cam(0.6);
      c.fillStyle = tod(tau, PAL.mid);
      c.beginPath(); c.moveTo(-500, 700); c.quadraticCurveTo(350, 610, 900, 690); c.quadraticCurveTo(1400, 760, 2500, 650); c.lineTo(2500, 1400); c.lineTo(-500, 1400); c.fill();
      c.fillStyle = toda(tau, PAL.shadow, 0.6); c.beginPath(); c.moveTo(600, 700); c.quadraticCurveTo(1100, 720, 1500, 740); c.quadraticCurveTo(1100, 760, 700, 740); c.fill();
      const pb = tod(tau, PAL.pine);
      PINES.forEach(([x, y, s], i) => pine(c, x, y + 30, s, t, i + 20, tau, pb, fc));
      // a soft snowy ridge just behind the characters, with a blue shadow along its foot
      h.cam(0.8);
      c.fillStyle = tod(tau, PAL.snow);
      c.beginPath(); c.moveTo(-500, 760); c.quadraticCurveTo(300, 700, 760, 735); c.quadraticCurveTo(1150, 765, 1500, 725); c.quadraticCurveTo(1900, 690, 2500, 740); c.lineTo(2500, 1400); c.lineTo(-500, 1400); c.fill();
      const rg = c.createLinearGradient(0, 735, 0, 800);
      rg.addColorStop(0, toda(tau, PAL.shadow, 0)); rg.addColorStop(1, toda(tau, PAL.shadow, 0.75));
      c.fillStyle = rg; c.fillRect(-500, 735, 2900, 70);
      // the snowy slope the characters stand on
      h.cam(1);
      c.fillStyle = tod(tau, PAL.snow);
      c.beginPath(); c.moveTo(-500, 812); c.quadraticCurveTo(500, 790, 960, 800); c.quadraticCurveTo(1500, 815, 2500, 795); c.lineTo(2500, 1500); c.lineTo(-500, 1500); c.fill();
      // gentle drifts: a lit top and a soft blue shadow underneath
      DRIFTS.forEach(([x, y, rx, ry]) => {
        c.fillStyle = toda(tau, PAL.shadow, 0.7); c.beginPath(); c.ellipse(x + rx * 0.08, y + ry * 0.35, rx, ry, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = tod(tau, PAL.cap); c.beginPath(); c.ellipse(x - rx * 0.06, y - ry * 0.15, rx * 0.92, ry * 0.75, 0, 0, Math.PI * 2); c.fill();
      });
      c.fillStyle = toda(tau, PAL.shadow, 0.9);
      PRINTS.forEach(p => { c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.beginPath(); c.ellipse(0, 0, 9, 6, 0, 0, Math.PI * 2); c.fill(); [-7, 0, 7].forEach(dx => { c.beginPath(); c.arc(dx, -9, 2.6, 0, Math.PI * 2); c.fill(); }); c.restore(); });
      snowman(c, 250, 990, tau, t);
      // sparkles glinting on the snow (by sunlight, and by moonlight)
      const ga = 0.55 + 0.35 * clamp((tau - 2) / 1);
      BUSHES.forEach(([x, y, s]) => bush(c, x, y, s, tau));
      FRONT_PINES.forEach(([x, y, s], i) => pine(c, x, y, s, t, i + 40, tau, pb, fc));
      GLINTS.forEach(g => { if (Math.abs(g.x - 960) < 520 && Math.abs(g.y - 905) < 50) return; const a = Math.max(0, Math.sin(t * 1.8 + g.ph * 3)) ** 3; sparkle(c, g.x, g.y, g.s * (0.6 + 0.4 * a), a * ga); });
    },
  });
})(this);
