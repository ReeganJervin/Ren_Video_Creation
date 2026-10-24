// Beach: the sea to the horizon with the sun setting into it, rolling waves on the sand, shells and a palm tree.
(function (root) {
  const { register, util } = typeof module !== 'undefined' ? require('./index.js') : root.StudioPlaces;
  const { clamp, lerp, hash, tod, toda, sky, sunYAt, glow } = util;
  const PAL = {
    skyTop: ['#62bdf2', '#ff8f62', '#58479c', '#0a1236'], skyMid: ['#a2dbf6', '#ffb886', '#c46c98', '#1b2966'], skyBot: ['#e8f8ff', '#ffe2b4', '#f7a47a', '#3a3e8a'],
    sun: ['#fffbe8', '#fff1c8', '#ffc488', '#ffc488'], cloud: ['#ffffff', '#fff3e6', '#eab4c4', '#4a4f8f'],
    seaFar: ['#58bfd6', '#e9917c', '#6f5c9c', '#111d47'], seaNear: ['#83d9df', '#f4b28c', '#8c74aa', '#1a2c5d'],
    wet: ['#e6cf9e', '#e9bd94', '#a98f9e', '#2e3554'], sand: ['#f7e3b6', '#f8d2a4', '#cba8aa', '#3f4563'], sandD: ['#ecd29f', '#efc192', '#b8979e', '#343a58'],
    foam: ['#ffffff', '#fff6ee', '#eadcf0', '#8a94c8'],
    trunk: ['#b88a5a', '#b37f52', '#7c6476', '#262a40'], trunkD: ['#93693e', '#8f633c', '#5f4c5e', '#1c2034'], frond: ['#58a85e', '#6c9a58', '#4a6c64', '#132c32'],
    shell: ['#ffc4cc', '#ffc0b8', '#d2a2b8', '#5a5478'], star: ['#ff9f7a', '#ff9a72', '#c27e8a', '#54405e'],
  };
  const HZ = 600;   // horizon (parallax 0.35)
  const SHORE = 790;  // where the waves reach the sand (parallax 1)
  const GLITTER = Array.from({ length: 60 }, (_, i) => ({ x: hash(i + 50) * 2600 - 340, y: HZ + 6 + hash(i + 90) * 170, w: 14 + hash(i + 130) * 40, ph: hash(i + 170) * 6 }));
  const SHELLS = [[260, 960, 1.0, 0], [420, 1040, 0.8, 1], [1520, 990, 0.9, 0], [1700, 1060, 1.1, 1], [1820, 930, 0.7, 0], [130, 1060, 0.9, 1]];
  const DOTS = Array.from({ length: 120 }, (_, i) => ({ x: hash(i + 400) * 2400 - 240, y: 830 + hash(i + 450) * 250 }));

  function shell(c, x, y, s, kind, tau) {
    c.save(); c.translate(x, y); c.scale(s, s); c.fillStyle = tod(tau, PAL.shell);
    if (kind === 0) {
      c.beginPath(); c.moveTo(0, 4); c.lineTo(-18, -6); c.quadraticCurveTo(0, -30, 18, -6); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 2; [-10, -3, 4, 11].forEach(dx => { c.beginPath(); c.moveTo(0, 2); c.lineTo(dx, -18); c.stroke(); });
    } else {
      c.beginPath(); c.ellipse(0, -8, 16, 11, -0.3, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 2; c.beginPath();
      for (let a = 0; a < 9; a += 0.3) { const r = a * 1.4; c.lineTo(Math.cos(a) * r - 2, -8 + Math.sin(a) * r * 0.7); } c.stroke();
    }
    c.restore();
  }
  function starfish(c, x, y, s, tau) {
    c.save(); c.translate(x, y); c.scale(s, s); c.rotate(0.3); c.fillStyle = tod(tau, PAL.star);
    c.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 9 : 24; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.6)'; [[0, -10], [9, -3], [5, 8], [-5, 8], [-9, -3]].forEach(([dx, dy]) => { c.beginPath(); c.arc(dx, dy, 1.8, 0, Math.PI * 2); c.fill(); });
    c.restore();
  }
  function palm(c, x, y, s, t, tau) {
    c.save(); c.translate(x, y); c.scale(s, s);
    // one gently curved, tapering trunk with ring marks
    const P = u => [-Math.sin(u * 1.6) * 120, -u * 520], Wd = u => 26 - u * 10;
    const L = [], R = [];
    for (let k = 0; k <= 20; k++) { const u = k / 20, [px, py] = P(u), [qx, qy] = P(Math.min(1, u + 0.01)), [rx, ry] = P(Math.max(0, u - 0.01)), tx = qx - rx, ty = qy - ry, n = Math.hypot(tx, ty) || 1; L.push([px - ty / n * Wd(u), py + tx / n * Wd(u)]); R.push([px + ty / n * Wd(u), py - tx / n * Wd(u)]); }
    c.fillStyle = tod(tau, PAL.trunk); c.beginPath(); L.forEach(p => c.lineTo(...p)); [...R].reverse().forEach(p => c.lineTo(...p)); c.closePath(); c.fill();
    c.strokeStyle = tod(tau, PAL.trunkD); c.lineWidth = 4; c.lineCap = 'round';
    for (let k = 1; k < 20; k++) { c.beginPath(); c.moveTo(...L[k]); c.quadraticCurveTo((L[k][0] + R[k][0]) / 2, (L[k][1] + R[k][1]) / 2 + 6, ...R[k]); c.stroke(); }
    const tx = -Math.sin(1.6) * 120, ty = -520;
    c.fillStyle = tod(tau, PAL.frond);
    [-2.7, -2.1, -1.5, -0.9, -0.3, 0.3, -3.2].forEach((a, i) => {
      const sw = Math.sin(t * 1.3 + i) * 0.06, aa = a + sw, L = 230;
      c.save(); c.translate(tx, ty); c.rotate(aa);
      c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(L * 0.5, -60, L, 30); c.quadraticCurveTo(L * 0.5, -10, 0, 12); c.closePath(); c.fill();
      c.restore();
    });
    c.fillStyle = tod(tau, PAL.trunkD); [[-14, 14], [10, 18], [-2, 26]].forEach(([dx, dy]) => { c.beginPath(); c.arc(tx + dx, ty + dy, 14, 0, Math.PI * 2); c.fill(); });
    c.restore();
  }

  register('beach', {
    name: 'beach',
    pos: { left: 560, center: 960, right: 1360 },
    ground: x => 910 - 8 * Math.exp(-(((x - 960) / 420) ** 2)),
    grade: ['#ffffff', '#fff0dc', '#e8d2ea', '#aab2e6'], tint: ['#fffaf0', '#ffa860', '#a080c0', '#3a4aa0'],
    draw(c, t, cam, tau, h) {
      sky(c, t, h, tau, PAL, { noBirds: false });
      // the sea, out to the horizon
      h.cam(0.35);
      const sg = c.createLinearGradient(0, HZ, 0, 900);
      sg.addColorStop(0, tod(tau, PAL.seaFar)); sg.addColorStop(1, tod(tau, PAL.seaNear));
      c.fillStyle = sg; c.fillRect(-500, HZ, 2900, 900);
      // the sun's path of light on the water (golden at sunset) and the moon's at night
      const sunY = sunYAt(tau), sa = (1 - clamp(Math.abs(tau - 1) / 0.9)) * (sunY < HZ + 20 ? 1 : clamp((HZ + 120 - sunY) / 100)), ma = clamp((tau - 2.2) / 0.6);
      c.save(); c.globalCompositeOperation = 'lighter';
      if (sa > 0) glow(c, 1450, HZ, 420, '255,170,110', 0.35 * sa);
      [[1450, '255,206,140', 0.75 * sa + 0.15 * (1 - clamp(tau))], [330, '225,230,255', 0.5 * ma]].forEach(([x, col, a], k) => {
        if (a <= 0) return;
        for (let i = 0; i < 22; i++) {
          const y = HZ + 4 + i * 9, w = (14 + i * 7) * (0.6 + 0.4 * Math.sin(t * 3.1 + i * 1.7 + k)), off = Math.sin(t * 1.3 + i * 0.8) * (6 + i);
          c.fillStyle = `rgba(${col},${a * (1 - i / 26)})`; c.beginPath(); c.ellipse(x + off, y, w, 2.4 + i * 0.08, 0, 0, Math.PI * 2); c.fill();
        }
      });
      c.restore();
      GLITTER.forEach(g => {
        const a = (0.3 + 0.3 * Math.sin(t * 2.4 + g.ph)) * (1 - 0.7 * clamp((tau - 1.5) / 1.5));
        c.strokeStyle = `rgba(255,255,255,${a})`; c.lineWidth = 2.2; c.lineCap = 'round';
        const x = g.x + Math.sin(t * 0.5 + g.ph) * 12;
        c.beginPath(); c.moveTo(x - g.w / 2, g.y); c.quadraticCurveTo(x, g.y - 3, x + g.w / 2, g.y); c.stroke();
      });
      // a little sailboat far out
      c.fillStyle = toda(tau, PAL.foam, 0.9); const bx = 600 + Math.sin(t * 0.2) * 30;
      c.beginPath(); c.moveTo(bx, HZ - 8); c.lineTo(bx, HZ - 52); c.lineTo(bx + 30, HZ - 10); c.closePath(); c.fill();
      c.fillStyle = toda(tau, PAL.trunkD, 0.9); c.beginPath(); c.moveTo(bx - 20, HZ - 8); c.lineTo(bx + 34, HZ - 8); c.lineTo(bx + 26, HZ); c.lineTo(bx - 14, HZ); c.fill();
      // sand, wet sand and the rolling waves
      h.cam(1);
      const reach = Math.sin(t * 0.9) * 14;
      c.fillStyle = tod(tau, PAL.wet);
      c.beginPath(); c.moveTo(-500, SHORE - 24); c.quadraticCurveTo(960, SHORE - 44, 2500, SHORE - 24); c.lineTo(2500, 1500); c.lineTo(-500, 1500); c.fill();
      c.fillStyle = tod(tau, PAL.sand);
      c.beginPath(); c.moveTo(-500, SHORE + 26); c.quadraticCurveTo(500, SHORE + 6, 960, SHORE + 16); c.quadraticCurveTo(1500, SHORE + 28, 2500, SHORE + 8); c.lineTo(2500, 1500); c.lineTo(-500, 1500); c.fill();
      // foam: scalloped wave edges washing up and back
      const foam = tod(tau, PAL.foam);
      [[0, 0.95], [1.8, 0.55]].forEach(([ph, a]) => {
        const y = SHORE - 30 + Math.sin(t * 0.9 + ph) * 14;
        c.fillStyle = toda(tau, PAL.foam, a);
        c.beginPath(); c.moveTo(-500, y - 30);
        for (let x = -500; x <= 2500; x += 60) c.quadraticCurveTo(x + 30, y + 14 + Math.sin(x * 0.02 + t * 1.5 + ph) * 5, x + 60, y);
        c.lineTo(2500, y - 30); c.closePath(); c.fill();
      });
      c.fillStyle = toda(tau, PAL.seaNear, 0.6);
      c.beginPath(); c.moveTo(-500, SHORE - 90); c.lineTo(2500, SHORE - 90); c.lineTo(2500, SHORE - 56 + reach * 0.5); c.quadraticCurveTo(960, SHORE - 70 + reach, -500, SHORE - 56 + reach * 0.5); c.closePath(); c.fill();
      c.fillStyle = tod(tau, PAL.sandD); DOTS.forEach(d => { c.beginPath(); c.arc(d.x, d.y, 2, 0, Math.PI * 2); c.fill(); });
      SHELLS.forEach(([x, y, s, k]) => shell(c, x, y, s, k, tau));
      starfish(c, 1640, 1000, 1.0, tau); starfish(c, 330, 1000, 0.75, tau);
      palm(c, 1830, 980, 1.05, t, tau);
    },
  });
})(this);
