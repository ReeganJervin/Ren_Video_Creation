// Cave tunnel (F5 Part B): inside the Dark Cave. Soft rounded rock walls in violet-grey stone, a low ceiling with
// rounded stalactites, an uneven stone floor with pebbles and little puddles, and the tunnel going on into the dark
// in the middle. Wet glints twinkle on the walls and water drips from the stalactites into the puddles.
// Underground, so dark by itself: with no light you see nothing (Episode 8); the lantern lights up the rock around it.
// It has no lights of its own. The time of day doesn't change anything down here.
(function (root) {
  const { register, util } = typeof module !== 'undefined' ? require('./index.js') : root.StudioPlaces;
  const { hash, sparkle } = util;
  const C = {
    deep: '#1f1a2c', deep2: '#2c2540', back: '#4b4360', back2: '#5d5472',
    rock: '#6a6080', rockLight: '#8a809c', rockShade: '#493f5c', rockDark: '#352d47',
    floor: '#5c5470', floorLight: '#776e8a', floorShade: '#463e58',
    pebble: '#857c96', moss: '#5e7663', puddle: '#34405e', puddleLight: '#51628a',
  };
  const G = 885;   // where feet stand

  // a soft round blob of rock: a closed curve through n points around (x, y), radii rx, ry, wobbling by seed
  function blob(c, x, y, rx, ry, seed, n = 9) {
    const pts = Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2, k = 0.82 + 0.3 * hash(seed + i); return [x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k]; });
    c.beginPath();
    pts.forEach((p, i) => { const q = pts[(i + 1) % n], m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; if (!i) c.moveTo(m[0], m[1]); else c.quadraticCurveTo(p[0], p[1], m[0], m[1]); });
    const p = pts[0], q = pts[1]; c.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
    c.closePath();
  }
  // a soft rounded stalactite hanging from y0, tip at y0 + len
  function stalactite(c, x, y0, w, len) {
    c.beginPath(); c.moveTo(x - w, y0);
    c.bezierCurveTo(x - w * 0.8, y0 + len * 0.45, x - w * 0.25, y0 + len * 0.85, x, y0 + len);
    c.bezierCurveTo(x + w * 0.25, y0 + len * 0.85, x + w * 0.8, y0 + len * 0.45, x + w, y0);
    c.closePath(); c.fill();
  }
  // and its twin growing up from the floor
  function stalagmite(c, x, y0, w, len) {
    c.beginPath(); c.moveTo(x - w, y0);
    c.bezierCurveTo(x - w * 0.75, y0 - len * 0.5, x - w * 0.3, y0 - len * 0.92, x, y0 - len);
    c.bezierCurveTo(x + w * 0.3, y0 - len * 0.92, x + w * 0.75, y0 - len * 0.5, x + w, y0);
    c.closePath(); c.fill();
  }

  // the stalactites on the ceiling (x, width, length); the ones that drip are marked with a drip period
  const ROOF = [[-180, 70, 150], [10, 46, 120], [150, 60, 190, 4.3], [330, 38, 100], [470, 52, 160], [640, 34, 90, 5.9], [760, 48, 140],
    [1170, 44, 130], [1300, 36, 95], [1420, 58, 175, 3.7], [1590, 40, 110], [1730, 62, 165], [1900, 44, 125, 5.1], [2060, 70, 150]];
  const ROOF_Y = 150;   // where the ceiling's rock ends and the stalactites start (mid layer)
  const ceil = x => ROOF_Y + 30 * Math.sin(x * 0.004 + 1.3) + 18 * Math.sin(x * 0.011);
  // the puddles on the floor (x, y, width); drips land in the ones under the dripping stalactites
  const PUDDLES = [[150, 965, 120], [640, 1010, 90], [1420, 990, 130], [1900, 975, 110], [1010, 1055, 150]];
  const PEBBLES = Array.from({ length: 30 }, (_, i) => ({ x: hash(i + 300) * 2400 - 240, y: G + 20 + hash(i + 330) * 170, r: 5 + hash(i + 360) * 11 }));
  const MOSS = [[90, 860, 70], [430, 300, 40], [1500, 330, 46], [1830, 845, 80], [260, 560, 34], [1690, 600, 30]];
  // wet glints on the walls and ceiling: they twinkle (and show where the lantern light falls)
  const GLINTS = Array.from({ length: 70 }, (_, i) => {
    const side = i % 2, x = side ? 1440 + hash(i + 500) * 760 : -280 + hash(i + 500) * 760;
    return { x, y: 210 + hash(i + 540) * 600, s: 3 + hash(i + 580) * 5, ph: hash(i + 620) * 6, sp: 0.8 + hash(i + 660) * 1.4 };
  });
  const ROOF_GLINTS = Array.from({ length: 26 }, (_, i) => ({ x: hash(i + 700) * 2200 - 140, ph: hash(i + 740) * 6, s: 3 + hash(i + 780) * 4 }));

  register('cave-tunnel', {
    name: 'cave tunnel',
    credit: 'Claude Code',
    ambient: 'cave',
    dark: 0.86,                                          // as dark as "light: dark": nothing shows without a light
    pos: { left: 560, center: 960, right: 1360 },
    ground: x => G + 6 * Math.sin(x * 0.006),
    grade: ['#ffffff', '#ffffff', '#ffffff', '#ffffff'], // no sky down here: every time of day looks the same
    tint: ['#ece6f4', '#ece6f4', '#ece6f4', '#ece6f4'],
    draw(c, t, cam, tau, h) {
      // the far dark: the tunnel going on into the distance, darker towards its middle
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.fillStyle = C.deep; c.fillRect(0, 0, h.W, h.H);
      h.cam(0.3);
      // each ring is a rough rocky arch, a little smaller, darker and further to one side than the one before,
      // so the tunnel seems to wind away into the dark
      const rings = [[1340, 780, C.back, 0], [1060, 620, C.back2, 30], [800, 480, C.rockShade, -20], [580, 360, C.deep2, 25], [400, 250, C.deep, 0]];
      rings.forEach(([w, ht, col, dx], i) => {
        const cx = 960 + dx, n = 14;
        const pts = Array.from({ length: n + 1 }, (_, k) => {
          const a = Math.PI * k / n, r = 1 + (k && k < n ? 0.07 * (hash(i * 31 + k) - 0.5) : 0);
          return [cx - Math.cos(a) * w / 2 * r, 860 - Math.sin(a) * ht * r];
        });
        c.fillStyle = col; c.beginPath(); c.moveTo(pts[0][0], 870);
        pts.forEach((p, k) => { if (!k) c.lineTo(p[0], p[1]); else { const q = pts[k - 1]; c.quadraticCurveTo(q[0] + (p[0] - q[0]) * 0.1, q[1] - 14 * hash(i * 7 + k), (q[0] + p[0]) / 2, (q[1] + p[1]) / 2); } });
        c.lineTo(pts[n][0], pts[n][1]); c.lineTo(pts[n][0], 870); c.closePath(); c.fill();
        // a lighter lip on the inner edge of the nearer rings, where the rock turns
        if (i < 3) { c.strokeStyle = C.rockLight; c.globalAlpha = 0.18; c.lineWidth = 10 - i * 2; c.stroke(); c.globalAlpha = 1; }
      });
      // the far floor of the tunnel, fading into the dark
      const ff = c.createLinearGradient(0, 760, 0, 880); ff.addColorStop(0, C.deep); ff.addColorStop(1, C.floorShade);
      c.fillStyle = ff; c.beginPath(); c.moveTo(-200, 880); c.lineTo(760, 800); c.lineTo(1160, 800); c.lineTo(2120, 880); c.closePath(); c.fill();

      // the walls on both sides, curving in under the ceiling
      h.cam(0.65);
      const wall = (dir) => {
        const x0 = dir < 0 ? -320 : 2240, x1 = 960 + dir * 470;
        c.fillStyle = C.rock; c.beginPath(); c.moveTo(x0, 1100); c.lineTo(x0, -40);
        c.bezierCurveTo(960 + dir * 330, -60, x1 - dir * 60, 200, x1, 520);
        c.bezierCurveTo(x1 + dir * 30, 700, x1 + dir * 150, 840, x1 + dir * 260, 1100); c.closePath(); c.fill();
        // rounded boulders that make up the wall, lighter on top
        for (let k = 0; k < 9; k++) {
          const bx = dir < 0 ? -200 + hash(k + 40) * 560 : 1560 + hash(k + 40) * 560, by = 260 + k * 75 + hash(k + 60) * 40, r = 70 + hash(k + 80) * 60;
          c.fillStyle = k % 3 === 0 ? C.rockShade : C.rock; blob(c, bx, by, r, r * 0.75, k * 11 + (dir > 0 ? 100 : 0)); c.fill();
          c.fillStyle = C.rockLight; c.globalAlpha = 0.25; blob(c, bx - dir * r * 0.1, by - r * 0.35, r * 0.55, r * 0.25, k * 13 + 7, 7); c.fill(); c.globalAlpha = 1;
        }
        // soft shadow where the wall turns towards the tunnel
        const sg = c.createLinearGradient(x1 - dir * 220, 0, x1, 0); sg.addColorStop(0, 'rgba(40,32,56,0)'); sg.addColorStop(1, 'rgba(40,32,56,0.55)');
        c.fillStyle = sg; c.beginPath(); c.moveTo(x1 - dir * 220, 120); c.bezierCurveTo(x1 - dir * 80, 260, x1, 400, x1, 520); c.bezierCurveTo(x1 + dir * 30, 700, x1 + dir * 150, 840, x1 + dir * 260, 1100); c.lineTo(x1 - dir * 220, 1100); c.closePath(); c.fill();
      };
      wall(-1); wall(1);
      // moss in the cracks
      c.fillStyle = C.moss; MOSS.forEach(([x, y, r], i) => { blob(c, x, y, r, r * 0.4, 900 + i, 7); c.fill(); });
      // the ceiling and its stalactites
      c.fillStyle = C.rockDark; c.beginPath(); c.moveTo(-400, -60);
      for (let x = -400; x <= 2320; x += 40) c.lineTo(x, ceil(x));
      c.lineTo(2320, -60); c.closePath(); c.fill();
      ROOF.forEach(([x, w, len]) => { c.fillStyle = C.rockShade; stalactite(c, x, ceil(x) - 10, w, len); c.fillStyle = C.rockLight; c.globalAlpha = 0.35; stalactite(c, x - w * 0.3, ceil(x) - 6, w * 0.35, len * 0.7); c.globalAlpha = 1; });
      // glints twinkling on the wet rock
      c.save(); c.globalCompositeOperation = 'lighter';
      GLINTS.forEach(g => { const a = Math.pow(Math.abs(Math.sin(t * g.sp + g.ph)), 6); sparkle(c, g.x, g.y, g.s * (0.6 + 0.6 * a), 0.25 + 0.6 * a, '200,220,255'); });
      ROOF_GLINTS.forEach(g => { const a = Math.pow(Math.abs(Math.sin(t * 0.9 + g.ph)), 8); sparkle(c, g.x, ceil(g.x) + 6, g.s * (0.6 + 0.5 * a), 0.2 + 0.6 * a, '200,220,255'); });
      c.restore();
      // water dripping from the stalactites that drip (falls in 0.7 s, then a ripple in the puddle below)
      ROOF.forEach(([x, w, len, per], i) => {
        if (!per) return;
        const u = ((t + i * 1.7) % per) / per, top = ceil(x) - 10 + len, fall = 0.7 / per, bottom = 870;
        if (u < 0.35) { const s = u / 0.35; c.fillStyle = 'rgba(190,210,240,0.85)'; c.beginPath(); c.ellipse(x, top + 4 * s, 4 * s + 1, 6 * s + 1, 0, 0, Math.PI * 2); c.fill(); }
        else if (u < 0.35 + fall) { const s = (u - 0.35) / fall, y = top + (bottom - top) * s * s; c.fillStyle = 'rgba(190,210,240,0.9)'; c.beginPath(); c.ellipse(x, y, 4, 8, 0, 0, Math.PI * 2); c.fill(); }
      });

      // the floor the characters stand on
      h.cam(1);
      const fg = c.createLinearGradient(0, G - 60, 0, 1080); fg.addColorStop(0, C.floorShade); fg.addColorStop(0.3, C.floor); fg.addColorStop(1, C.floorLight);
      c.fillStyle = fg; c.beginPath(); c.moveTo(-400, 1200); c.lineTo(-400, G - 40);
      for (let x = -400; x <= 2320; x += 40) c.lineTo(x, G - 40 + 14 * Math.sin(x * 0.006) + 10 * Math.sin(x * 0.017 + 2));
      c.lineTo(2320, 1200); c.closePath(); c.fill();
      // puddles, with a soft shine, and rings where the drips land
      PUDDLES.forEach(([x, y, w], i) => {
        c.fillStyle = C.puddle; c.beginPath(); c.ellipse(x, y, w, w * 0.18, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = C.puddleLight; c.globalAlpha = 0.6; c.beginPath(); c.ellipse(x - w * 0.25, y - w * 0.04, w * 0.45, w * 0.05, 0, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
        const drip = ROOF.findIndex(r => r[3] && Math.abs(r[0] - x) < 30);
        if (drip >= 0) {
          const per = ROOF[drip][3], since = ((t + drip * 1.7) % per) - (0.35 * per + 0.7);
          if (since >= 0 && since < 1.2) { const s = since / 1.2; c.strokeStyle = `rgba(200,220,250,${0.7 * (1 - s)})`; c.lineWidth = 2.5; c.beginPath(); c.ellipse(x, y, 8 + s * w * 0.6, (8 + s * w * 0.6) * 0.18, 0, 0, Math.PI * 2); c.stroke(); }
        }
        c.save(); c.globalCompositeOperation = 'lighter'; sparkle(c, x + w * 0.3, y - 3, 5, 0.3 + 0.4 * Math.abs(Math.sin(t * 1.1 + i)), '210,225,255'); c.restore();
      });
      // pebbles
      PEBBLES.forEach((p, i) => {
        c.fillStyle = i % 3 ? C.pebble : C.floorShade; blob(c, p.x, p.y, p.r, p.r * 0.6, 1200 + i, 6); c.fill();
        c.fillStyle = C.floorLight; c.globalAlpha = 0.5; c.beginPath(); c.ellipse(p.x - p.r * 0.2, p.y - p.r * 0.25, p.r * 0.45, p.r * 0.2, 0, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
      });
      // small stalagmites near the walls, away from the stage spots
      c.fillStyle = C.rockShade;
      [[120, G + 10, 34, 90], [215, G + 30, 22, 55], [1760, G + 15, 38, 100], [1860, G + 35, 24, 60]].forEach(([x, y, w, len]) => stalagmite(c, x, y, w, len));
      c.fillStyle = C.rockLight; c.globalAlpha = 0.3;
      [[110, G + 10, 12, 70], [1748, G + 15, 13, 78]].forEach(([x, y, w, len]) => stalagmite(c, x, y, w, len));
      c.globalAlpha = 1;
      // big dark rocks framing the corners (drawn here, behind the characters, so the darkness covers them too)
      h.cam(1.15);
      c.fillStyle = C.rockDark;
      blob(c, -120, 1110, 330, 170, 1500); c.fill();
      blob(c, 2040, 1120, 340, 160, 1510); c.fill();
      blob(c, -150, -40, 300, 170, 1520); c.fill();
      blob(c, 2070, -50, 310, 160, 1530); c.fill();
      [[90, 70, 46, 150], [1840, 60, 50, 165]].forEach(([x, y, w, len]) => stalactite(c, x, y, w, len));
    },
  });
})(this);
