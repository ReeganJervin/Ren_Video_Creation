// Cottage garden: soft hills and round trees far away; a hedge and a white picket fence with an open gate in the middle
// (where a cottage can stand); an apple tree and a round tree; a lawn with a stepping-stone path and two flower beds.
// Butterflies by day, fireflies at night. Sounds like the meadow (a breeze and birds).
(function (root) {
  const { register, util } = typeof module !== 'undefined' ? require('./index.js') : root.StudioPlaces;
  const { hash, tod, sky, fireflies, clamp } = util;
  const PAL = {
    skyTop: ['#6ec3f4', '#ff9d5c', '#5b4a9e', '#0b1236'], skyMid: ['#a8dcf7', '#ffc488', '#c0709a', '#1d2a66'], skyBot: ['#e6f6ff', '#ffe7c2', '#f5a77a', '#3b3f8c'],
    sun: ['#fffbe8', '#fff4d6', '#ffcf9a', '#ffcf9a'], cloud: ['#ffffff', '#fff8ef', '#e9b8c8', '#4a4f8f'],
    far: ['#a7d3a0', '#e4ab80', '#8d6c9c', '#36457c'], farTree: ['#86bf80', '#c5a070', '#76648e', '#2a4470'],
    hedge: ['#5f9e57', '#6d965a', '#4e6e66', '#2e566a'], hedgeHi: ['#76b46a', '#86ab6c', '#5f7f78', '#3a687a'],
    fence: ['#fbf3e4', '#ffe1c0', '#e3cfe0', '#a8b2e0'], fenceD: ['#e6d8c0', '#efc49c', '#c9b2c8', '#8088bc'],
    lawn: ['#86c26f', '#98b874', '#6c8f70', '#3a6672'], lawnD: ['#77b462', '#88a96a', '#5f8266', '#335e6a'],
    bed: ['#9c6a44', '#a0663e', '#7a5850', '#4a4668'], stone: ['#e7dccb', '#f0cfae', '#cbb8c8', '#8890c4'], stoneD: ['#cfc0aa', '#d9b08e', '#ad9cb0', '#6a72a6'],
    trunk: ['#7a5132', '#7a5132', '#5a4038', '#1a2230'], tree: ['#5aa45a', '#6e9a5c', '#4d6e64', '#2a5266'], treeHi: ['#74bb6c', '#88ae68', '#61817a', '#386a7c'],
    grass: ['#5a9a4e', '#5e8b5a', '#4a7060', '#30585c'], stem: ['#4f8a48', '#4f7a48', '#3f6a50', '#2a4a4a'],
    wood: ['#c08a56', '#c0814f', '#83697a', '#6a6890'], woodD: ['#93633a', '#93603a', '#5f4d5e', '#4c4e78'],
  };
  const G = 885;
  const farTrees = [[120, 600, 0.8], [1680, 575, 0.9], [1880, 600, 0.6], [-120, 590, 0.8], [2080, 585, 0.7]];
  const flowers = [];
  // along the fence, behind where the characters stand
  [[300, 790], [1130, 1620]].forEach(([a, b], side) => {
    for (let i = 0; i < 18; i++) {
      const x = a + (b - a) * (i + 0.5) / 18 + (hash(i + side * 40) - 0.5) * 16, y = 812 + hash(i + side * 40 + 9) * 14;
      flowers.push({ x, y, ph: hash(i + side * 50) * 6, col: ['#ff9ec4', '#fff3a6', '#ffffff', '#c9b6ff', '#ffb38a'][(i + side * 2) % 5], s: 0.85 + hash(i + side * 60) * 0.4 });
    }
  });
  const grass = Array.from({ length: 70 }, (_, i) => ({ x: hash(i + 300) * 2400 - 240, y: 900 + hash(i + 600) * 170, ph: hash(i + 900) * 6 }));
  const stones = [[960, 1040, 70], [945, 980, 58], [972, 928, 48], [956, 888, 40], [966, 852, 32]];
  // bigger tufts and a few flowers in the bottom corners, in front of where the characters stand (for depth)
  const corner = Array.from({ length: 14 }, (_, i) => { const left = i < 7; return { x: left ? 30 + hash(i + 2100) * 300 : 1590 + hash(i + 2100) * 300, y: 1040 + hash(i + 2200) * 45, ph: hash(i + 2300) * 6, flower: i % 3 === 0 ? ['#ff9ec4', '#fff3a6', '#ffffff', '#c9b6ff', '#ffb38a'][i % 5] : null }; });
  const flies =Array.from({ length: 24 }, (_, i) => ({ x: hash(i + 1500) * 1920, y: 560 + hash(i + 1600) * 420, ph: hash(i + 1700) * 6, sp: 0.4 + hash(i + 1800) * 0.6 }));
  const butterflies = [{ x: 420, y: 700, c: '#ffb3d1', sp: 0.23, ph: 0 }, { x: 1480, y: 680, c: '#fff1a0', sp: 0.19, ph: 2.1 }, { x: 760, y: 640, c: '#cfe8ff', sp: 0.27, ph: 4.0 }];

  function roundTree(c, x, y, s, t, tau, i, apples) {
    c.save(); c.translate(x, y); c.rotate(Math.sin(t * 1.3 + i) * 0.015);
    c.fillStyle = tod(tau, PAL.trunk); c.beginPath(); c.roundRect(-14 * s, -130 * s, 28 * s, 130 * s, 8 * s); c.fill();
    c.fillStyle = tod(tau, PAL.tree);
    [[0, -230, 105], [-78, -180, 70], [78, -180, 70], [-40, -275, 62], [44, -270, 66]].forEach(([dx, dy, r]) => { c.beginPath(); c.arc(dx * s, dy * s, r * s, 0, Math.PI * 2); c.fill(); });
    c.fillStyle = tod(tau, PAL.treeHi);
    [[-30, -268, 40], [40, -245, 34], [-82, -196, 30]].forEach(([dx, dy, r]) => { c.beginPath(); c.arc(dx * s, dy * s, r * s, 0, Math.PI * 2); c.fill(); });
    if (apples) { c.fillStyle = '#e8584a'; [[-50, -200], [30, -170], [70, -220], [-10, -250], [-90, -160], [10, -205]].forEach(([dx, dy]) => { c.beginPath(); c.arc(dx * s, dy * s, 9 * s, 0, Math.PI * 2); c.fill(); }); }
    c.restore();
  }

  register('cottage-garden', {
    name: 'cottage garden', credit: 'Claude Code', ambient: 'meadow',
    pos: { left: 560, center: 960, right: 1360 },
    ground: () => G,
    grade: ['#ffffff', '#fff3e2', '#e4d4ee', '#aab2e6'], tint: ['#ffffff', '#ffb070', '#a080c0', '#3a4aa0'],
    draw(c, t, cam, tau, h) {
      sky(c, t, h, tau, PAL);
      // far: soft hills and round trees
      h.cam(0.35);
      c.fillStyle = tod(tau, PAL.far);
      c.beginPath(); c.moveTo(-500, 640); c.quadraticCurveTo(300, 520, 900, 610); c.quadraticCurveTo(1500, 690, 2500, 590); c.lineTo(2500, 1400); c.lineTo(-500, 1400); c.fill();
      c.fillStyle = tod(tau, PAL.farTree);
      farTrees.forEach(([x, y, s]) => { c.beginPath(); c.arc(x, y - 60 * s, 55 * s, 0, Math.PI * 2); c.fill(); c.fillRect(x - 7 * s, y - 20 * s, 14 * s, 30 * s); });
      // middle: the trees, the hedge and the picket fence with its open gate
      h.cam(0.6);
      roundTree(c, 180, 760, 1.05, t, tau, 0, true);
      roundTree(c, 1760, 760, 0.9, t, tau, 1, false);
      c.fillStyle = tod(tau, PAL.hedge);
      c.beginPath(); c.moveTo(-500, 720); for (let x = -500; x <= 2500; x += 80) c.quadraticCurveTo(x + 40, 662 + (hash(x) * 14), x + 80, 700); c.lineTo(2500, 800); c.lineTo(-500, 800); c.fill();
      c.fillStyle = tod(tau, PAL.hedgeHi);
      for (let x = -460; x <= 2460; x += 80) { c.beginPath(); c.ellipse(x, 690 + hash(x + 3) * 10, 22, 10, 0, 0, Math.PI * 2); c.fill(); }
      const fence = tod(tau, PAL.fence), fenceD = tod(tau, PAL.fenceD);
      for (let x = -460; x < 2400; x += 46) {
        if (x > 800 && x < 1110) continue;   // the gate is open
        c.fillStyle = fence; c.beginPath(); c.moveTo(x, 800); c.lineTo(x, 718); c.lineTo(x + 15, 702); c.lineTo(x + 30, 718); c.lineTo(x + 30, 800); c.fill();
        c.fillStyle = fenceD; c.fillRect(x + 22, 718, 8, 82);
      }
      c.fillStyle = fence; c.fillRect(-460, 740, 1262, 12); c.fillRect(1110, 740, 1300, 12); c.fillRect(-460, 776, 1262, 12); c.fillRect(1110, 776, 1300, 12);
      // a small wooden gate: two wooden posts and two leaves, swung a little open towards us (the inner edges come
      // forward, so they look taller and lower), with the stepping stones leading through
      const wood = tod(tau, PAL.wood), woodD = tod(tau, PAL.woodD);
      c.fillStyle = woodD; c.beginPath(); c.roundRect(786, 694, 26, 112, 5); c.roundRect(1102, 694, 26, 112, 5); c.fill();
      c.fillStyle = wood; c.beginPath(); c.roundRect(782, 686, 34, 14, 5); c.roundRect(1098, 686, 34, 14, 5); c.fill();
      [[812, 912, 1], [1102, 1002, -1]].forEach(([hx, ex]) => {
        const top = (x, y) => y - (x - hx) / (ex - hx) * 8, bot = (x, y) => y + (x - hx) / (ex - hx) * 10;
        c.fillStyle = wood;
        for (let k = 0; k < 4; k++) {   // boards
          const x0 = hx + (ex - hx) * (k / 4 + 0.03), x1 = hx + (ex - hx) * ((k + 1) / 4 - 0.03);
          c.beginPath(); c.moveTo(x0, top(x0, 724)); c.lineTo(x1, top(x1, 724)); c.lineTo(x1, bot(x1, 798)); c.lineTo(x0, bot(x0, 798)); c.fill();
        }
        c.fillStyle = woodD;   // rails and a brace
        [[738, 750], [776, 788]].forEach(([a, b]) => { c.beginPath(); c.moveTo(hx, top(hx, a)); c.lineTo(ex, top(ex, a)); c.lineTo(ex, top(ex, b)); c.lineTo(hx, top(hx, b)); c.fill(); });
        c.strokeStyle = woodD; c.lineWidth = 7; c.beginPath(); c.moveTo(hx + (ex - hx) * 0.1, 780); c.lineTo(ex - (ex - hx) * 0.1, top(ex, 752)); c.stroke();
      });
      // near: the lawn, the flower beds, the path
      h.cam(1);
      c.fillStyle = tod(tau, PAL.lawn);
      c.beginPath(); c.moveTo(-500, 800); c.quadraticCurveTo(960, 780, 2500, 800); c.lineTo(2500, 1500); c.lineTo(-500, 1500); c.fill();
      c.fillStyle = tod(tau, PAL.lawnD); c.beginPath(); c.ellipse(960, 1020, 620, 70, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = tod(tau, PAL.bed);
      [[545, 818, 250], [1375, 818, 250]].forEach(([x, y, r]) => { c.beginPath(); c.ellipse(x, y, r, 16, 0, 0, Math.PI * 2); c.fill(); });
      stones.forEach(([x, y, r]) => {
        c.fillStyle = tod(tau, PAL.stoneD); c.beginPath(); c.ellipse(x, y + 4, r, r * 0.34, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = tod(tau, PAL.stone); c.beginPath(); c.ellipse(x, y, r, r * 0.32, 0, 0, Math.PI * 2); c.fill();
      });
      c.strokeStyle = tod(tau, PAL.grass); c.lineWidth = 3; c.lineCap = 'round';
      grass.forEach(g => { const sw = Math.sin(t * 2.2 + g.ph) * 3; c.beginPath(); c.moveTo(g.x, g.y); c.lineTo(g.x - 5 + sw, g.y - 13); c.moveTo(g.x, g.y); c.lineTo(g.x + sw, g.y - 17); c.moveTo(g.x, g.y); c.lineTo(g.x + 6 + sw, g.y - 12); c.stroke(); });
      const stem = tod(tau, PAL.stem);
      flowers.forEach(fl => {
        c.save(); c.translate(fl.x, fl.y); c.rotate(Math.sin(t * 2.2 + fl.ph) * 0.1); c.scale(fl.s, fl.s);
        c.strokeStyle = stem; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(4, -16, 0, -32); c.stroke();
        c.fillStyle = fl.col; for (let k = 0; k < 5; k++) { c.save(); c.translate(0, -32); c.rotate(k * 1.2566); c.beginPath(); c.ellipse(0, -8, 5.5, 8.5, 0, 0, Math.PI * 2); c.fill(); c.restore(); }
        c.fillStyle = '#ffc53d'; c.beginPath(); c.arc(0, -32, 4.5, 0, Math.PI * 2); c.fill();
        c.restore();
      });
      corner.forEach(g => {
        const sw = Math.sin(t * 2.2 + g.ph) * 5;
        c.save(); c.translate(g.x, g.y); c.scale(2, 2);
        c.strokeStyle = tod(tau, PAL.grass); c.lineWidth = 3;
        c.beginPath(); c.moveTo(0, 0); c.lineTo(-7 + sw, -15); c.moveTo(0, 0); c.lineTo(sw, -20); c.moveTo(0, 0); c.lineTo(7 + sw, -14); c.stroke();
        if (g.flower) {
          c.strokeStyle = stem; c.beginPath(); c.moveTo(2, 0); c.quadraticCurveTo(6 + sw, -14, 3 + sw, -26); c.stroke();
          c.fillStyle = g.flower; for (let k = 0; k < 5; k++) { c.save(); c.translate(3 + sw, -26); c.rotate(k * 1.2566); c.beginPath(); c.ellipse(0, -6, 4, 6.5, 0, 0, Math.PI * 2); c.fill(); c.restore(); }
          c.fillStyle = '#ffc53d'; c.beginPath(); c.arc(3 + sw, -26, 3.5, 0, Math.PI * 2); c.fill();
        }
        c.restore();
      });
    },
    // butterflies by day (they go to sleep as it gets dark), fireflies at night
    front(c, t, cam, tau) {
      const a = clamp(1.4 - tau);
      if (a > 0) butterflies.forEach(b => {
        const x = b.x + Math.sin(t * b.sp + b.ph) * 260, y = b.y + Math.sin(t * b.sp * 2.3 + b.ph) * 50, flap = Math.abs(Math.sin(t * 11 + b.ph));
        c.save(); c.globalAlpha = a; c.translate(x, y); c.fillStyle = b.c;
        [-1, 1].forEach(i => { c.save(); c.scale(i * (0.3 + 0.7 * flap), 1); c.beginPath(); c.ellipse(9, -5, 10, 7, -0.4, 0, Math.PI * 2); c.ellipse(7, 6, 7, 5, 0.4, 0, Math.PI * 2); c.fill(); c.restore(); });
        c.fillStyle = '#6b4a2e'; c.beginPath(); c.ellipse(0, 0, 2.5, 9, 0, 0, Math.PI * 2); c.fill();
        c.restore();
      });
      fireflies(c, t, tau, flies);
    },
  });
})(this);
