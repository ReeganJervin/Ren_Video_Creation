// Crystal cave (F5 Part B): the first floor of the dungeon (Episode 10). An old mine under the ground: deep blue-violet
// rock, old wooden beams holding up the roof, and glowing crystals everywhere: clusters of blue, pink, gold and
// lavender crystals growing from the floor, the walls and the ceiling, twinkling softly. The crystals give light
// (lights/drawLights), so even without a lantern Ren and Yuki can see; between them it stays dim. No tools lying around
// (in Episode 10 they have none to dig the crystals out). The time of day changes nothing down here.
(function (root) {
  const { register, util } = typeof module !== 'undefined' ? require('./index.js') : root.StudioPlaces;
  const { hash, glow, sparkle } = util;
  const C = {
    deep: '#120f26', deep2: '#1d1a3c', back: '#2f2b5a', back2: '#3a3568',
    rock: '#4a4478', rockLight: '#6a64a0', rockShade: '#332e5a', rockDark: '#221f40',
    floor: '#433d6c', floorLight: '#5c5690', floorShade: '#2f2a52',
    wood: '#8a6240', woodDark: '#5e4028', woodLight: '#b08560',
  };
  // crystal colours: [deep, middle, light, light colour as 'r,g,b']
  const COL = {
    blue: ['#2f7fd8', '#6cc4ff', '#dff4ff', '140,210,255'],
    pink: ['#d0479e', '#ff8fd2', '#ffe2f5', '255,150,215'],
    gold: ['#c98a1c', '#ffcb5c', '#fff3cf', '255,210,120'],
    lilac: ['#7a52d0', '#b590ff', '#efe4ff', '190,160,255'],
  };
  const G = 885;
  // crystal clusters: x, y (where they grow from), size, colour, layer (camera depth), up (+1 from the floor, -1 from the ceiling)
  const CLUSTERS = [
    // far walls, small and many
    ...Array.from({ length: 10 }, (_, i) => ({ x: 560 + i * 90 + hash(i + 3) * 40, y: 640 + hash(i + 9) * 160, s: 0.35 + hash(i + 17) * 0.2, c: ['blue', 'pink', 'lilac', 'gold'][i % 4], L: 0.3, up: 1 })),
    // the walls on both sides and the ceiling
    { x: 120, y: 520, s: 1.0, c: 'blue', L: 0.65, up: 1 }, { x: 300, y: 340, s: 0.7, c: 'pink', L: 0.65, up: 1 }, { x: 60, y: 760, s: 0.8, c: 'lilac', L: 0.65, up: 1 },
    { x: 1820, y: 500, s: 1.0, c: 'pink', L: 0.65, up: 1 }, { x: 1640, y: 330, s: 0.7, c: 'gold', L: 0.65, up: 1 }, { x: 1880, y: 760, s: 0.8, c: 'blue', L: 0.65, up: 1 },
    { x: 420, y: 150, s: 0.8, c: 'lilac', L: 0.65, up: -1 }, { x: 760, y: 120, s: 0.6, c: 'blue', L: 0.65, up: -1 }, { x: 1180, y: 125, s: 0.65, c: 'pink', L: 0.65, up: -1 }, { x: 1500, y: 150, s: 0.85, c: 'blue', L: 0.65, up: -1 },
    // on the floor, near the walls and between the stage spots (small there, so they never hide anyone)
    { x: 150, y: G + 30, s: 1.25, c: 'blue', L: 1, up: 1 }, { x: 330, y: G + 60, s: 0.75, c: 'pink', L: 1, up: 1 },
    { x: 760, y: G + 18, s: 0.45, c: 'gold', L: 1, up: 1 }, { x: 1160, y: G + 18, s: 0.45, c: 'lilac', L: 1, up: 1 },
    { x: 1600, y: G + 60, s: 0.8, c: 'gold', L: 1, up: 1 }, { x: 1780, y: G + 30, s: 1.3, c: 'pink', L: 1, up: 1 },
    { x: 980, y: G + 150, s: 0.5, c: 'blue', L: 1, up: 1 },
  ];
  // one crystal cluster: 3-5 six-sided points of different heights, each with a lit facet and a light tip
  function cluster(c, k, i, bright) {
    const col = COL[k.c], n = 3 + Math.floor(hash(i + 50) * 3);
    c.save(); c.translate(k.x, k.y); c.scale(k.s, k.s * k.up);
    for (let j = 0; j < n; j++) {
      const a = (j - (n - 1) / 2) * 0.32 + (hash(i * 7 + j) - 0.5) * 0.2, h = 70 + hash(i * 11 + j) * 90 * (j === Math.floor(n / 2) ? 1.4 : 1), w = 15 + hash(i * 13 + j) * 10;
      c.save(); c.rotate(a);
      const g = c.createLinearGradient(-w, 0, w, 0); g.addColorStop(0, col[0]); g.addColorStop(0.45, col[1]); g.addColorStop(1, col[0]);
      c.beginPath(); c.moveTo(-w, 4); c.lineTo(-w, -h); c.lineTo(0, -h - w * 1.3); c.lineTo(w, -h); c.lineTo(w, 4); c.closePath();
      c.fillStyle = g; c.fill();
      c.strokeStyle = col[0]; c.lineWidth = 2.5; c.stroke();
      // the lit facet and the light tip
      c.fillStyle = col[2]; c.globalAlpha = bright ? 0.75 : 0.5;
      c.beginPath(); c.moveTo(-w * 0.35, 0); c.lineTo(-w * 0.35, -h); c.lineTo(0, -h - w * 1.3); c.lineTo(w * 0.05, -h); c.lineTo(w * 0.05, 0); c.closePath(); c.fill();
      c.globalAlpha = 1;
      c.restore();
    }
    c.restore();
  }
  const twinkle = (t, i) => Math.pow(Math.abs(Math.sin(t * (0.6 + hash(i + 70) * 0.7) + hash(i + 80) * 6)), 10);
  // the place's drawing helpers, the same soft rock as the cave tunnel
  function blob(c, x, y, rx, ry, seed, n = 9) {
    const pts = Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2, k = 0.82 + 0.3 * hash(seed + i); return [x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k]; });
    c.beginPath();
    pts.forEach((p, i) => { const q = pts[(i + 1) % n], m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; if (!i) c.moveTo(m[0], m[1]); else c.quadraticCurveTo(p[0], p[1], m[0], m[1]); });
    const p = pts[0], q = pts[1]; c.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
    c.closePath();
  }
  const ceil = x => 150 + 30 * Math.sin(x * 0.004 + 1.3) + 18 * Math.sin(x * 0.011);
  const PEBBLES = Array.from({ length: 26 }, (_, i) => ({ x: hash(i + 300) * 2400 - 240, y: G + 25 + hash(i + 330) * 170, r: 5 + hash(i + 360) * 10 }));
  const SHARDS = Array.from({ length: 22 }, (_, i) => ({ x: hash(i + 400) * 2200 - 140, y: G + 30 + hash(i + 430) * 160, c: ['blue', 'pink', 'gold', 'lilac'][i % 4] }));

  function beams(c) {
    // an old wooden mine frame: two posts and a beam across, with a brace in each corner
    c.fillStyle = C.wood;
    [[470, 230, 34, 640], [1450, 230, 34, 640]].forEach(([x, y, w, h]) => { c.fillRect(x - w / 2, y, w, h); });
    c.fillRect(420, 205, 1080, 40);
    c.fillStyle = C.woodDark;
    [[470, 230], [1450, 230]].forEach(([x]) => { c.fillRect(x + 8, 245, 9, 600); });
    c.fillRect(420, 232, 1080, 13);
    c.fillStyle = C.woodLight; c.fillRect(420, 207, 1080, 6);
    c.strokeStyle = C.wood; c.lineWidth = 22; c.lineCap = 'round';
    c.beginPath(); c.moveTo(487, 330); c.lineTo(580, 240); c.moveTo(1433, 330); c.lineTo(1340, 240); c.stroke();
    c.fillStyle = C.woodDark; [520, 760, 1000, 1240, 1440].forEach(x => { c.beginPath(); c.arc(x, 224, 4, 0, Math.PI * 2); c.fill(); });
  }

  register('crystal-cave', {
    name: 'crystal cave',
    credit: 'Claude Code',
    ambient: 'crystal',
    dark: 0.7,                                           // dark by itself, but the crystals light it up
    pos: { left: 560, center: 960, right: 1360 },
    ground: x => G + 6 * Math.sin(x * 0.006),
    grade: ['#ffffff', '#ffffff', '#ffffff', '#ffffff'],
    tint: ['#e8eaf8', '#e8eaf8', '#e8eaf8', '#e8eaf8'],
    draw(c, t, cam, tau, h) {
      c.setTransform(1, 0, 0, 1, 0, 0);
      const bg = c.createLinearGradient(0, 0, 0, h.H); bg.addColorStop(0, C.deep); bg.addColorStop(1, C.deep2);
      c.fillStyle = bg; c.fillRect(0, 0, h.W, h.H);
      // the mine going on into the distance
      h.cam(0.3);
      [[1300, 760, C.back, 0], [1040, 610, C.back2, 25], [780, 470, C.rockShade, -20], [560, 340, C.deep2, 20], [380, 230, C.deep, 0]].forEach(([w, ht, col, dx], i) => {
        const cx = 960 + dx, n = 14;
        c.fillStyle = col; c.beginPath(); c.moveTo(cx - w / 2, 870);
        for (let k = 0; k <= n; k++) { const a = Math.PI * k / n, r = 1 + (k && k < n ? 0.07 * (hash(i * 31 + k) - 0.5) : 0); c.lineTo(cx - Math.cos(a) * w / 2 * r, 860 - Math.sin(a) * ht * r); }
        c.lineTo(cx + w / 2, 870); c.closePath(); c.fill();
      });
      CLUSTERS.forEach((k, i) => { if (k.L === 0.3) cluster(c, k, i, false); });
      // walls, ceiling and the old wooden beams
      h.cam(0.65);
      [-1, 1].forEach(dir => {
        const x0 = dir < 0 ? -320 : 2240, x1 = 960 + dir * 500;
        c.fillStyle = C.rock; c.beginPath(); c.moveTo(x0, 1100); c.lineTo(x0, -40);
        c.bezierCurveTo(960 + dir * 360, -60, x1 - dir * 60, 200, x1, 520); c.bezierCurveTo(x1 + dir * 30, 700, x1 + dir * 150, 840, x1 + dir * 260, 1100); c.closePath(); c.fill();
        for (let k = 0; k < 8; k++) {
          const bx = dir < 0 ? -200 + hash(k + 40) * 560 : 1560 + hash(k + 40) * 560, by = 260 + k * 80 + hash(k + 60) * 40, r = 70 + hash(k + 80) * 55;
          c.fillStyle = k % 3 === 0 ? C.rockShade : C.rock; blob(c, bx, by, r, r * 0.75, k * 11 + (dir > 0 ? 100 : 0)); c.fill();
          c.fillStyle = C.rockLight; c.globalAlpha = 0.25; blob(c, bx - dir * r * 0.1, by - r * 0.35, r * 0.55, r * 0.25, k * 13 + 7, 7); c.fill(); c.globalAlpha = 1;
        }
      });
      c.fillStyle = C.rockDark; c.beginPath(); c.moveTo(-400, -60);
      for (let x = -400; x <= 2320; x += 40) c.lineTo(x, ceil(x));
      c.lineTo(2320, -60); c.closePath(); c.fill();
      beams(c);
      CLUSTERS.forEach((k, i) => { if (k.L === 0.65) cluster(c, k, i, false); });
      // the floor
      h.cam(1);
      const fg = c.createLinearGradient(0, G - 60, 0, 1080); fg.addColorStop(0, C.floorShade); fg.addColorStop(0.3, C.floor); fg.addColorStop(1, C.floorLight);
      c.fillStyle = fg; c.beginPath(); c.moveTo(-400, 1200); c.lineTo(-400, G - 40);
      for (let x = -400; x <= 2320; x += 40) c.lineTo(x, G - 40 + 14 * Math.sin(x * 0.006) + 10 * Math.sin(x * 0.017 + 2));
      c.lineTo(2320, 1200); c.closePath(); c.fill();
      PEBBLES.forEach((p, i) => { c.fillStyle = i % 3 ? C.floorLight : C.floorShade; blob(c, p.x, p.y, p.r, p.r * 0.6, 1200 + i, 6); c.fill(); });
      // little crystal shards scattered on the floor
      SHARDS.forEach((s, i) => { const col = COL[s.c]; c.fillStyle = col[1]; c.beginPath(); c.moveTo(s.x - 6, s.y); c.lineTo(s.x, s.y - 14); c.lineTo(s.x + 6, s.y); c.closePath(); c.fill(); });
      CLUSTERS.forEach((k, i) => { if (k.L === 1) cluster(c, k, i, false); });
    },
    // the crystals give light: soft coloured pools around them
    lights(t) {
      return CLUSTERS.map((k, i) => ({ x: k.x, y: k.y - k.up * 60 * k.s, r: k.L === 1 ? 420 * Math.max(0.6, k.s) : k.L === 0.65 ? 300 * Math.max(0.6, k.s) : 110, col: COL[k.c][3], a: (k.L === 0.3 ? 0.5 : 0.7) + 0.12 * Math.sin(t * 0.9 + i) }));
    },
    // ...and over the darkness, only soft light is added (never the crystals themselves, which would cover the characters):
    // a coloured halo around each cluster and a twinkle now and then
    drawLights(c, t, cam, tau, h) {
      c.save(); c.globalCompositeOperation = 'lighter';
      // (not the far ones, behind the characters: their light already comes from lights())
      [0.65, 1].forEach(L => {
        h.cam(L);
        CLUSTERS.forEach((k, i) => {
          if (k.L !== L) return;
          const col = COL[k.c], cy = k.y - k.up * 70 * k.s;
          glow(c, k.x, cy, 130 * k.s, col[3], 0.22 + 0.08 * Math.sin(t * 0.9 + i));
          const w = twinkle(t, i);
          if (w > 0.05 && k.s >= 0.6) sparkle(c, k.x + 10 * k.s, cy - k.up * 50 * k.s, 14 * k.s * (0.5 + w), w, '255,255,255');
        });
        if (L === 1) SHARDS.forEach((s, i) => glow(c, s.x, s.y - 6, 22, COL[s.c][3], 0.25 + 0.35 * twinkle(t, i + 100)));
      });
      c.restore();
    },
  });
})(this);
