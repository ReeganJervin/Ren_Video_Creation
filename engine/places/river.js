// River: a wide, gentle river across the middle with shimmering water, the far-bank trees reflected in it,
// a wooden footbridge, reeds and stones; the sun and moon leave paths of light. Characters stand on the near bank.
(function (root) {
  const { register, util } = typeof module !== 'undefined' ? require('./index.js') : root.StudioPlaces;
  const { clamp, hash, tod, sky, glow, sunYAt } = util;
  const PAL = {
    skyTop: ['#6ec3f4', '#ff9d5c', '#5b4a9e', '#0b1236'], skyMid: ['#a8dcf7', '#ffc488', '#c0709a', '#1d2a66'], skyBot: ['#e6f6ff', '#ffe7c2', '#f5a77a', '#3b3f8c'],
    sun: ['#fffbe8', '#fff4d6', '#ffcf9a', '#ffcf9a'], cloud: ['#ffffff', '#fff8ef', '#e9b8c8', '#4a4f8f'],
    // night colours are moonlit blues, about as bright as the meadow at night
    far: ['#a6d4a4', '#e3ac82', '#86699a', '#2c3468'], farTree: ['#77b277', '#8fa86d', '#5e7486', '#24426a'], bank: ['#8cc779', '#9fbf7a', '#6c8c7a', '#2a4c5c'],
    waterFar: ['#9fd8ef', '#ffc79c', '#a68bc0', '#34508e'], waterNear: ['#6fbfe2', '#f0a588', '#7d6fae', '#283f7c'],
    near: ['#7dbd66', '#8eb76c', '#628b6c', '#2a4c4e'], edge: ['#9a7b55', '#9a7354', '#6c5a5e', '#373e58'],
    wood: ['#c08a56', '#c0814f', '#83697a', '#5e5c80'], woodD: ['#93633a', '#93603a', '#5f4d5e', '#43456a'],
    reed: ['#5f9a4c', '#6f9150', '#4b6f5a', '#26484a'], cat: ['#8a5a36', '#8a5634', '#5e4650', '#3a3452'],
    stone: ['#b9c0c4', '#c8b0a8', '#8c88a2', '#56609a'], stoneD: ['#98a0a8', '#a89092', '#706e8c', '#424a80'],
    grass: ['#5a9a4e', '#5e8b5a', '#4a7060', '#244442'],
  };
  const BANK = 548;          // top of the far bank (parallax 0.6)
  const WY0 = 574, WY1 = 820; // the water (parallax 0.75), reaching right up to the near bank
  const SHINE = Array.from({ length: 90 }, (_, i) => ({ x: hash(i + 40) * 2600 - 340, y: WY0 + 14 + hash(i + 80) * (WY1 - WY0 - 30), w: 20 + hash(i + 120) * 54, sp: 10 + hash(i + 160) * 22, ph: hash(i + 200) * 6 }));
  const TREES = Array.from({ length: 11 }, (_, i) => ({ x: -200 + i * 230 + hash(i + 7) * 80, r: 50 + hash(i + 13) * 28, y: BANK - 18 + Math.sin(i * 1.7) * 8 }));
  const REEDS = [[60, 0], [110, 1], [150, 2], [1690, 3], [1735, 4], [1790, 5], [1840, 6], [1880, 7]];
  const STONES = [[600, 846, 30, 15], [650, 854, 20, 10], [1500, 850, 30, 16], [1550, 858, 18, 10], [1260, 640, 18, 7], [780, 700, 16, 6]];
  const TUFTS = Array.from({ length: 80 }, (_, i) => ({ x: hash(i + 300) * 2400 - 240, y: 860 + hash(i + 600) * 220, ph: hash(i + 900) * 6 }));
  const treeBlob = (c, x, y, r, flip) => [[0, 0, 1], [-0.6, 0.3, 0.7], [0.6, 0.3, 0.7], [0, -0.45, 0.7]].forEach(([dx, dy, k]) => { c.beginPath(); c.arc(x + dx * r, y + (flip ? -dy : dy) * r, k * r, 0, Math.PI * 2); c.fill(); });

  function bridge(c, tau) {
    // a little arched footbridge, drawn around its middle at (0, 0)
    c.strokeStyle = tod(tau, PAL.woodD); c.lineWidth = 9; c.lineCap = 'round';
    [-150, -75, 0, 75, 150].forEach(px => { const py = -18 - 50 * (1 - (px / 170) ** 2); c.beginPath(); c.moveTo(px, py + 18); c.lineTo(px, py - 34); c.stroke(); });
    // posts down into the water
    [-170, 170].forEach(px => { c.beginPath(); c.moveTo(px, 0); c.lineTo(px, 46); c.stroke(); });
    c.fillStyle = tod(tau, PAL.wood);
    c.beginPath(); c.moveTo(-190, 0); c.quadraticCurveTo(0, -108, 190, 0); c.lineTo(190, 18); c.quadraticCurveTo(0, -88, -190, 18); c.closePath(); c.fill();
    c.strokeStyle = tod(tau, PAL.wood); c.lineWidth = 7;
    c.beginPath(); c.moveTo(-160, -38); c.quadraticCurveTo(0, -138, 160, -38); c.stroke();
    c.strokeStyle = tod(tau, PAL.woodD); c.lineWidth = 2.5;
    for (let px = -170; px <= 170; px += 22) { const py = -54 * (1 - (px / 190) ** 2) * 1.0; c.beginPath(); c.moveTo(px, py); c.lineTo(px, py + 16); c.stroke(); }
  }

  register('river', {
    name: 'river',
    pos: { left: 560, center: 960, right: 1360 },
    ground: x => 912 - 12 * Math.exp(-(((x - 960) / 380) ** 2)),
    grade: ['#ffffff', '#fff3e2', '#e4d4ee', '#aab2e6'], tint: ['#ffffff', '#ffb070', '#a080c0', '#3a4aa0'],
    draw(c, t, cam, tau, h) {
      sky(c, t, h, tau, PAL);
      h.cam(0.35);
      c.fillStyle = tod(tau, PAL.far);
      c.beginPath(); c.moveTo(-500, 520); c.quadraticCurveTo(300, 430, 800, 500); c.quadraticCurveTo(1300, 560, 1800, 470); c.quadraticCurveTo(2100, 430, 2500, 500); c.lineTo(2500, 1400); c.lineTo(-500, 1400); c.fill();
      // far bank with a row of round trees
      h.cam(0.6);
      c.fillStyle = tod(tau, PAL.farTree); TREES.forEach(tr => treeBlob(c, tr.x, tr.y, tr.r, false));
      c.fillStyle = tod(tau, PAL.bank); c.beginPath(); c.moveTo(-500, BANK); c.quadraticCurveTo(700, BANK - 16, 1300, BANK - 2); c.quadraticCurveTo(1900, BANK + 8, 2500, BANK - 6); c.lineTo(2500, BANK + 34); c.lineTo(-500, BANK + 34); c.fill();
      // the water
      h.cam(0.75);
      const wg = c.createLinearGradient(0, WY0, 0, WY1);
      wg.addColorStop(0, tod(tau, PAL.waterFar)); wg.addColorStop(1, tod(tau, PAL.waterNear));
      c.fillStyle = wg; c.fillRect(-500, WY0, 2900, WY1 - WY0 + 80);
      // soft, wobbling reflections of the far-bank trees
      c.save(); c.globalAlpha = 0.28; c.fillStyle = tod(tau, PAL.farTree);
      TREES.forEach((tr, i) => { const wob = Math.sin(t * 1.4 + i) * 4; c.save(); c.translate(tr.x + wob, WY0 + 6); c.scale(1, 0.55); treeBlob(c, 0, tr.r * 0.9, tr.r, true); c.restore(); });
      c.restore();
      // reflections: the sun's path at sunset, the moon's path at night
      const sunY = sunYAt(tau), sa = clamp(1 - Math.abs(tau - 1) / 0.8) * (sunY < 760 ? 1 : 0), ma = clamp((tau - 2.2) / 0.6);
      c.save(); c.globalCompositeOperation = 'lighter';
      [[1450, '255,214,150', 0.5 * sa + 0.12 * (1 - clamp(tau))], [330, '225,230,255', 0.5 * ma]].forEach(([x, col, a], k) => {
        if (a <= 0) return;
        for (let i = 0; i < 22; i++) {
          const y = WY0 + 8 + i * 10.5, w = (26 + i * 8) * (0.7 + 0.3 * Math.sin(t * 3 + i * 1.3 + k)), off = Math.sin(t * 1.7 + i * 0.9) * 10;
          c.fillStyle = `rgba(${col},${a * (1 - i / 28)})`; c.beginPath(); c.ellipse(x + off, y, w, 2.8, 0, 0, Math.PI * 2); c.fill();
        }
      });
      // a little cool moonlight on the water so it stays readable at night
      if (ma > 0) glow(c, 960, (WY0 + WY1) / 2, 900, '110,140,210', 0.12 * ma);
      c.restore();
      // shimmering ripples drifting with the current
      SHINE.forEach(s => {
        const x = ((s.x + t * s.sp) % 2600) - 340, a = (0.28 + 0.25 * Math.sin(t * 2.2 + s.ph)) * (1 - 0.45 * clamp((tau - 1.5) / 1.5));
        c.strokeStyle = `rgba(255,255,255,${a})`; c.lineWidth = 2.5; c.lineCap = 'round';
        c.beginPath(); c.moveTo(x - s.w / 2, s.y); c.quadraticCurveTo(x, s.y - 3, x + s.w / 2, s.y); c.stroke();
      });
      if (ma > 0) for (let i = 0; i < 50; i++) { const a = ma * 0.6 * Math.abs(Math.sin(t * 1.5 + i * 2.3)); c.fillStyle = `rgba(255,255,240,${a})`; c.beginPath(); c.arc(hash(i + 700) * 2400 - 240, WY0 + 10 + hash(i + 760) * (WY1 - WY0 - 20), 1.7, 0, Math.PI * 2); c.fill(); }
      // the footbridge, big and close, on the left
      c.save(); c.translate(300, 708); c.scale(1.6, 1.6); bridge(c, tau); c.restore();
      // the bridge's wobbly reflection
      c.save(); c.globalAlpha = 0.2; c.translate(300 + Math.sin(t * 1.3) * 3, 708 + 60); c.scale(1.6, -0.8); bridge(c, tau); c.restore();
      // the near bank
      h.cam(1);
      c.fillStyle = tod(tau, PAL.edge);
      c.beginPath(); c.moveTo(-500, 830); c.quadraticCurveTo(500, 812, 960, 824); c.quadraticCurveTo(1500, 838, 2500, 818); c.lineTo(2500, 1500); c.lineTo(-500, 1500); c.fill();
      c.fillStyle = tod(tau, PAL.near);
      c.beginPath(); c.moveTo(-500, 840); c.quadraticCurveTo(500, 824, 960, 836); c.quadraticCurveTo(1500, 850, 2500, 830); c.lineTo(2500, 1500); c.lineTo(-500, 1500); c.fill();
      STONES.forEach(([x, y, rx, ry]) => {
        c.fillStyle = tod(tau, PAL.stoneD); c.beginPath(); c.ellipse(x, y + 3, rx, ry, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = tod(tau, PAL.stone); c.beginPath(); c.ellipse(x - 2, y, rx * 0.9, ry * 0.8, 0, 0, Math.PI * 2); c.fill();
      });
      c.strokeStyle = tod(tau, PAL.grass); c.lineWidth = 3; c.lineCap = 'round';
      TUFTS.forEach(g => { const sw = Math.sin(t * 2.2 + g.ph) * 3; c.beginPath(); c.moveTo(g.x, g.y); c.lineTo(g.x - 5 + sw, g.y - 13); c.moveTo(g.x, g.y); c.lineTo(g.x + sw, g.y - 17); c.moveTo(g.x, g.y); c.lineTo(g.x + 6 + sw, g.y - 12); c.stroke(); });
      // reeds with cattails along the water's edge
      REEDS.forEach(([x, i]) => {
        const sw = Math.sin(t * 1.4 + i) * 6, hgt = 120 + hash(i + 31) * 60;
        c.strokeStyle = tod(tau, PAL.reed); c.lineWidth = 5;
        c.beginPath(); c.moveTo(x, 870); c.quadraticCurveTo(x + sw * 0.5, 870 - hgt / 2, x + sw, 870 - hgt); c.stroke();
        c.beginPath(); c.moveTo(x - 8, 870); c.quadraticCurveTo(x - 30, 820, x - 44 + sw, 780); c.stroke();
        c.fillStyle = tod(tau, PAL.cat); c.beginPath(); c.ellipse(x + sw, 870 - hgt + 16, 7, 20, 0, 0, Math.PI * 2); c.fill();
      });
    },
  });
})(this);
