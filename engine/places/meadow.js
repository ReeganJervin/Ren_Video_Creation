// Meadow: rolling green hills, pine trees, a sunny knoll with flowers; fireflies at night.
(function (root) {
  const { register, util } = typeof module !== 'undefined' ? require('./index.js') : root.StudioPlaces;
  const { hash, tod, sky, fireflies } = util;
  const PAL = {
    skyTop: ['#6ec3f4', '#ff9d5c', '#5b4a9e', '#0b1236'], skyMid: ['#a8dcf7', '#ffc488', '#c0709a', '#1d2a66'], skyBot: ['#e6f6ff', '#ffe7c2', '#f5a77a', '#3b3f8c'],
    far: ['#9fcf9a', '#e8a87c', '#8a6a9a', '#2a2d5e'], mid: ['#7fbf6e', '#a3c48a', '#6f8f86', '#1f3a4a'], tree: ['#4f8f4f', '#5e8b5a', '#3f6a5a', '#14303a'],
    trunk: ['#7a5132', '#7a5132', '#5a4038', '#1a2230'], front: ['#79b862', '#86b56f', '#5f8a6a', '#1d3b3c'], knoll: ['#8cc873', '#97c47c', '#6c9a72', '#24474a'],
    grass: ['#5a9a4e', '#5e8b5a', '#4a7060', '#163032'], stem: ['#4f8a48', '#4f7a48', '#3f6a50', '#1a3a3a'], cloud: ['#ffffff', '#fff8ef', '#e9b8c8', '#4a4f8f'],
    sun: ['#fffbe8', '#fff4d6', '#ffcf9a', '#ffcf9a'],
  };
  const trees = [[130, 640, 1.0], [250, 660, 0.78], [1590, 630, 1.0], [1710, 655, 0.75], [1840, 640, 0.9], [-80, 650, 0.9], [2020, 650, 0.85]];
  const flowers = [];
  for (let i = 0; i < 52; i++) {
    const x = -200 + i * 46 + hash(i + 77) * 30, y = 790 + hash(i + 99) * 270;
    if (Math.abs(x - 960) < 170 && y < 960) continue;
    flowers.push({ x, y, ph: hash(i) * 6, col: ['#ffffff', '#ffd6e7', '#fff3bf', '#e5dbff', '#ffe0c2'][i % 5], s: 0.8 + hash(i + 5) * 0.5 });
  }
  const grass = Array.from({ length: 100 }, (_, i) => ({ x: hash(i + 300) * 2400 - 240, y: 760 + hash(i + 600) * 320, ph: hash(i + 900) * 6 }));
  const flies = Array.from({ length: 26 }, (_, i) => ({ x: hash(i + 1500) * 1920, y: 560 + hash(i + 1600) * 420, ph: hash(i + 1700) * 6, sp: 0.4 + hash(i + 1800) * 0.6 }));

  register('meadow', {
    name: 'meadow',
    pos: { left: 560, center: 960, right: 1360 },
    ground: x => 905 - 38 * Math.exp(-(((x - 960) / 240) ** 2)),
    grade: ['#ffffff', '#fff3e2', '#e4d4ee', '#aab2e6'], tint: ['#ffffff', '#ffb070', '#a080c0', '#3a4aa0'],
    draw(c, t, cam, tau, h) {
      sky(c, t, h, tau, PAL);
      h.cam(0.35);
      c.fillStyle = tod(tau, PAL.far);
      c.beginPath(); c.moveTo(-500, 620); c.quadraticCurveTo(200, 480, 700, 590); c.quadraticCurveTo(1150, 680, 1550, 560); c.quadraticCurveTo(1900, 480, 2500, 590); c.lineTo(2500, 1400); c.lineTo(-500, 1400); c.fill();
      h.cam(0.6);
      c.fillStyle = tod(tau, PAL.mid);
      c.beginPath(); c.moveTo(-500, 700); c.quadraticCurveTo(350, 600, 900, 690); c.quadraticCurveTo(1400, 760, 2500, 650); c.lineTo(2500, 1400); c.lineTo(-500, 1400); c.fill();
      trees.forEach(([x, y, s], i) => {
        c.save(); c.translate(x, y + 30); c.rotate(Math.sin(t * 1.5 + i) * 0.03); c.transform(1, 0, Math.sin(t * 1.5 + i + 0.6) * 0.05, 1, 0, 0);
        c.fillStyle = tod(tau, PAL.trunk); c.fillRect(-8 * s, -20 * s, 16 * s, 40 * s);
        c.fillStyle = tod(tau, PAL.tree);
        c.beginPath(); c.moveTo(0, -190 * s); c.lineTo(56 * s, -80 * s); c.lineTo(36 * s, -80 * s); c.lineTo(66 * s, -10 * s); c.lineTo(-66 * s, -10 * s); c.lineTo(-36 * s, -80 * s); c.lineTo(-56 * s, -80 * s); c.fill();
        c.restore();
      });
      h.cam(1);
      c.fillStyle = tod(tau, PAL.front);
      c.beginPath(); c.moveTo(-500, 780); c.quadraticCurveTo(500, 730, 960, 760); c.quadraticCurveTo(1500, 790, 2500, 750); c.lineTo(2500, 1500); c.lineTo(-500, 1500); c.fill();
      c.fillStyle = tod(tau, PAL.knoll); c.beginPath(); c.ellipse(960, 975, 440, 110, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = tod(tau, PAL.grass); c.lineWidth = 3; c.lineCap = 'round';
      grass.forEach(g => { const sw = Math.sin(t * 2.2 + g.ph) * 3; c.beginPath(); c.moveTo(g.x, g.y); c.lineTo(g.x - 5 + sw, g.y - 13); c.moveTo(g.x, g.y); c.lineTo(g.x + sw, g.y - 17); c.moveTo(g.x, g.y); c.lineTo(g.x + 6 + sw, g.y - 12); c.stroke(); });
      const stem = tod(tau, PAL.stem);
      flowers.forEach(fl => {
        c.save(); c.translate(fl.x, fl.y + Math.sin(t * 3 + fl.ph) * 3); c.rotate(Math.sin(t * 2.4 + fl.ph) * 0.15); c.scale(fl.s, fl.s);
        c.strokeStyle = stem; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(4, -16, 0, -30); c.stroke();
        c.fillStyle = fl.col; for (let k = 0; k < 5; k++) { c.save(); c.translate(0, -30); c.rotate(k * 1.2566); c.beginPath(); c.ellipse(0, -8, 5.5, 8.5, 0, 0, Math.PI * 2); c.fill(); c.restore(); }
        c.fillStyle = '#ffc53d'; c.beginPath(); c.arc(0, -30, 4.5, 0, Math.PI * 2); c.fill();
        c.restore();
      });
    },
    front(c, t, cam, tau) { fireflies(c, t, tau, flies); },
  });
})(this);
