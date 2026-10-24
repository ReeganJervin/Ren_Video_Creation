// Forest: layers of tall rounded trees, a mossy path, mushrooms and ferns; light rays by day, fireflies at night.
(function (root) {
  const { register, util } = typeof module !== 'undefined' ? require('./index.js') : root.StudioPlaces;
  const { clamp, hash, tod, toda, sky, glow, fireflies } = util;
  const PAL = {
    skyTop: ['#8fd3c4', '#ffae80', '#5e528f', '#0b1733'], skyMid: ['#c9ecd6', '#ffcf9f', '#ae7499', '#18294b'], skyBot: ['#effbe8', '#ffe7c4', '#e79f7c', '#2a3d5e'],
    sun: ['#fffbe8', '#fff4d6', '#ffcf9a', '#ffcf9a'], cloud: ['#ffffff', '#fff8ef', '#e9b8c8', '#4a4f8f'],
    // dusk: purple between the trees, warm near the ground; night: cool moonlit blues, readable like the meadow
    farTree: ['#a9d6ad', '#d6b28c', '#9a7cb4', '#34507a'], farTrunk: ['#b79c80', '#b58f73', '#8a6c8e', '#2e3a5e'], farGround: ['#9fcf98', '#c9b98a', '#9a84a8', '#2e4866'],
    midTree: ['#7cbf85', '#a7b67c', '#6c7aa0', '#2a5068'], midTree2: ['#6db37a', '#98ab72', '#62709a', '#264a64'], leafHi: ['#a6dca0', '#d8cc8e', '#c4a0c8', '#5c86b4'], midTrunk: ['#93694a', '#93694a', '#7a5a5c', '#34405a'], midGround: ['#8ec67a', '#aabd7c', '#8a8a7c', '#2e5060'],
    nearTree: ['#5aa269', '#7d9b5e', '#5a6a86', '#22465a'], nearTrunk: ['#7a5236', '#7a5236', '#6a4a46', '#2c3448'],
    floor: ['#84c26c', '#98bb70', '#8e9a6c', '#2e5458'], path: ['#e8d6a9', '#ecc79c', '#e0b090', '#56688c'], moss: ['#6cae5c', '#80a85e', '#7a8e64', '#2a5054'],
    fern: ['#4c9a57', '#5d8f55', '#5a7a56', '#244c4c'], cap: ['#f4867c', '#f39478', '#d68a86', '#6a5a84'], stalk: ['#fff4e6', '#fff0dc', '#f2dccc', '#7a86a8'],
  };
  const crown = (c, x, y, r) => {
    [[0, 0, 1], [-0.72, 0.28, 0.74], [0.72, 0.28, 0.74], [0, -0.55, 0.72], [-0.38, -0.3, 0.62], [0.4, -0.32, 0.62]].forEach(([dx, dy, k]) => { c.beginPath(); c.arc(x + dx * r, y + dy * r, k * r, 0, Math.PI * 2); c.fill(); });
  };
  const FAR = Array.from({ length: 14 }, (_, i) => ({ x: -260 + i * 190 + hash(i + 3) * 60, y: 470 + hash(i + 9) * 40, r: 70 + hash(i + 17) * 30 }));
  const MID = [[-40, 400, 120], [300, 380, 110], [560, 420, 95], [1380, 410, 100], [1660, 380, 120], [1960, 400, 115], [880, 360, 90], [1130, 390, 85]];
  const NEAR = [[40, 1.0], [1880, 0.95]];
  const FERNS = [[150, 905, 1.1], [330, 1010, 1.0], [1610, 925, 1.05], [1790, 1020, 1.2], [60, 1060, 1.0], [1880, 900, 0.9]];
  const SHROOMS = [[250, 965, 1.0], [285, 980, 0.7], [1545, 990, 1.1], [1700, 1045, 0.8], [440, 1050, 0.9], [1480, 1060, 0.7]];
  const TUFTS = Array.from({ length: 70 }, (_, i) => ({ x: hash(i + 300) * 2400 - 240, y: 790 + hash(i + 600) * 290, ph: hash(i + 900) * 6 }));
  const FLIES = Array.from({ length: 40 }, (_, i) => ({ x: hash(i + 2500) * 1920, y: 420 + hash(i + 2600) * 560, ph: hash(i + 2700) * 6, sp: 0.4 + hash(i + 2800) * 0.6 }));

  function fern(c, x, y, s, t, ph, col) {
    c.save(); c.translate(x, y); c.scale(s, s); c.fillStyle = col;
    for (let k = -3; k <= 3; k++) {
      c.save(); c.rotate(k * 0.32 + Math.sin(t * 1.6 + ph + k) * 0.04);
      c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-14, -40, 0, -78 + Math.abs(k) * 8); c.quadraticCurveTo(14, -40, 0, 0); c.fill();
      c.restore();
    }
    c.restore();
  }
  function mushroom(c, x, y, s, tau) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = tod(tau, PAL.stalk); c.beginPath(); c.moveTo(-9, 0); c.quadraticCurveTo(-11, -22, -7, -30); c.lineTo(7, -30); c.quadraticCurveTo(11, -22, 9, 0); c.closePath(); c.fill();
    c.fillStyle = tod(tau, PAL.cap); c.beginPath(); c.moveTo(-30, -26); c.quadraticCurveTo(-28, -58, 0, -60); c.quadraticCurveTo(28, -58, 30, -26); c.quadraticCurveTo(0, -20, -30, -26); c.fill();
    c.fillStyle = tod(tau, PAL.stalk); [[-14, -42, 5], [6, -50, 4], [16, -36, 4.5], [-2, -34, 3]].forEach(([dx, dy, r]) => { c.beginPath(); c.arc(dx, dy, r, 0, Math.PI * 2); c.fill(); });
    c.restore();
  }

  register('forest', {
    name: 'forest',
    pos: { left: 560, center: 960, right: 1360 },
    ground: x => 905 - 10 * Math.exp(-(((x - 960) / 420) ** 2)),
    grade: ['#ffffff', '#fff1e0', '#e2d4ec', '#a8b4e4'], tint: ['#f4ffe8', '#ffb070', '#9a80c0', '#33489e'],
    draw(c, t, cam, tau, h) {
      sky(c, t, h, tau, PAL, { cloudAlpha: 0.7 });
      // far layer: a soft wall of tree crowns
      h.cam(0.3);
      c.fillStyle = tod(tau, PAL.farGround); c.fillRect(-500, 640, 2900, 800);
      c.fillStyle = tod(tau, PAL.farTrunk); FAR.forEach(f => c.fillRect(f.x - 9, f.y, 18, 700 - f.y));
      c.fillStyle = tod(tau, PAL.farTree); FAR.forEach(f => crown(c, f.x, f.y, f.r));
      // light rays slanting through the leaves (day and sunset)
      const ra = 0.2 * (1 - clamp((tau - 1) / 0.9));
      if (ra > 0) {
        c.save(); c.globalCompositeOperation = 'lighter';
        [[520, 160], [860, 120], [1240, 180], [1520, 140]].forEach(([x, w], i) => {
          const a = ra * (0.6 + 0.4 * Math.sin(t * 0.7 + i * 1.7));
          const g = c.createLinearGradient(0, 0, 0, 980);
          g.addColorStop(0, `rgba(255,248,210,${a})`); g.addColorStop(1, 'rgba(255,248,210,0)');
          c.fillStyle = g; c.beginPath(); c.moveTo(x, -40); c.lineTo(x + w, -40); c.lineTo(x + w + 320, 980); c.lineTo(x + 200, 980); c.closePath(); c.fill();
        });
        c.restore();
      }
      // dusk: the sky glows pink-purple between the trunks
      const dk = Math.max(0, 1 - Math.abs(tau - 2) / 0.8);
      if (dk > 0) { c.save(); c.globalCompositeOperation = 'lighter'; glow(c, 960, 600, 900, '200,110,170', 0.35 * dk); glow(c, 960, 680, 500, '255,160,130', 0.3 * dk); c.restore(); }
      // middle layer: tall rounded trees
      h.cam(0.55);
      c.fillStyle = tod(tau, PAL.midGround); c.beginPath(); c.moveTo(-500, 740); c.quadraticCurveTo(600, 700, 1100, 730); c.quadraticCurveTo(1700, 760, 2500, 720); c.lineTo(2500, 1400); c.lineTo(-500, 1400); c.fill();
      MID.forEach(([x, y, r], i) => {
        const sway = Math.sin(t * 1.1 + i) * 4;
        c.fillStyle = tod(tau, PAL.midTrunk); c.beginPath(); c.moveTo(x - 20, 760); c.lineTo(x - 13, y + 40); c.lineTo(x + 13, y + 40); c.lineTo(x + 20, 760); c.fill();
        c.fillStyle = tod(tau, i % 2 ? PAL.midTree2 : PAL.midTree); crown(c, x + sway, y, r);
        // soft sunlit highlight on the upper-left of each crown
        c.save(); c.globalAlpha = 0.5; c.fillStyle = tod(tau, PAL.leafHi); c.beginPath(); c.arc(x + sway - r * 0.3, y - r * 0.5, r * 0.42, 0, Math.PI * 2); c.fill(); c.restore();
      });
      // the forest floor and the path
      h.cam(1);
      c.fillStyle = tod(tau, PAL.floor);
      c.beginPath(); c.moveTo(-500, 790); c.quadraticCurveTo(500, 760, 960, 780); c.quadraticCurveTo(1500, 800, 2500, 770); c.lineTo(2500, 1500); c.lineTo(-500, 1500); c.fill();
      c.fillStyle = tod(tau, PAL.path); c.beginPath(); c.ellipse(960, 960, 760, 120, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = toda(tau, PAL.moss, 0.55); [[-60, 860, 260, 50], [1980, 880, 260, 60], [960, 1075, 900, 40]].forEach(([x, y, rx, ry]) => { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); });
      // big trunks framing the edges
      NEAR.forEach(([x, s], i) => {
        c.fillStyle = tod(tau, PAL.nearTrunk); c.beginPath(); c.moveTo(x - 70 * s, 1100); c.quadraticCurveTo(x - 40 * s, 600, x - 46 * s, -60); c.lineTo(x + 46 * s, -60); c.quadraticCurveTo(x + 40 * s, 600, x + 70 * s, 1100); c.fill();
        c.fillStyle = tod(tau, PAL.nearTree); crown(c, x + Math.sin(t * 0.9 + i) * 5, 20, 170 * s);
      });
      c.strokeStyle = tod(tau, PAL.moss); c.lineWidth = 3; c.lineCap = 'round';
      TUFTS.forEach(g => { if (Math.abs(g.x - 960) < 700 && Math.abs(g.y - 960) < 110) return; const sw = Math.sin(t * 2.2 + g.ph) * 3; c.beginPath(); c.moveTo(g.x, g.y); c.lineTo(g.x - 5 + sw, g.y - 13); c.moveTo(g.x, g.y); c.lineTo(g.x + sw, g.y - 17); c.moveTo(g.x, g.y); c.lineTo(g.x + 6 + sw, g.y - 12); c.stroke(); });
      if (dk > 0) { c.save(); c.globalCompositeOperation = 'lighter'; const wg = c.createLinearGradient(0, 760, 0, 1100); wg.addColorStop(0, 'rgba(255,150,90,0)'); wg.addColorStop(0.4, `rgba(255,150,90,${0.18 * dk})`); wg.addColorStop(1, 'rgba(255,150,90,0)'); c.fillStyle = wg; c.fillRect(-500, 760, 2900, 400); c.restore(); }
      const mn = clamp((tau - 2.2) / 0.8);
      if (mn > 0) { c.save(); c.globalCompositeOperation = 'lighter'; glow(c, 900, 900, 800, '120,150,220', 0.16 * mn); c.restore(); }
      const fc = tod(tau, PAL.fern);
      FERNS.forEach(([x, y, s], i) => fern(c, x, y, s, t, i * 1.3, fc));
      SHROOMS.forEach(([x, y, s]) => mushroom(c, x, y, s, tau));
    },
    // fireflies come out early under the trees
    front(c, t, cam, tau) { fireflies(c, t, tau, FLIES, 1.8); },
  });
})(this);
