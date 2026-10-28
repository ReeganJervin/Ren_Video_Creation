// Forest path: a very long, winding path through an avenue of huge old trees, seen looking along it as it curves away
// into the distance. Wide where the characters stand, it snakes left and right and disappears into a warm glow far
// away; big mossy trunks frame both sides, a canopy of leaves closes overhead, fallen leaves lie in the grass.
// (For the journey: "they set off down the long path".)
(function (root) {
  const { register, util } = typeof module !== 'undefined' ? require('./index.js') : root.StudioPlaces;
  const { clamp, hash, tod, toda, sky, glow, fireflies } = util;
  const PAL = {
    skyTop: ['#9ed8c8', '#ffb98a', '#6a5a98', '#0d1838'], skyMid: ['#d6f0d8', '#ffd6a6', '#b67ca0', '#1b2c50'], skyBot: ['#fff6dc', '#ffe8c4', '#eaa483', '#2c3f62'],
    sun: ['#fffbe8', '#fff4d6', '#ffcf9a', '#ffcf9a'], cloud: ['#ffffff', '#fff8ef', '#e9b8c8', '#4a4f8f'],
    // the light at the end of the path: warm by day and at sunset, pink at dusk, silver-blue under the moon
    endLight: ['255,236,170', '255,196,120', '240,150,170', '150,175,235'],
    canopyFar: ['#a8d39a', '#d9bb84', '#9a80b0', '#2f4c72'], canopyMid: ['#7fbc78', '#b0a96c', '#77739c', '#294866'], canopyNear: ['#5f9f5e', '#86915a', '#5c6488', '#203e58'],
    leafHi: ['#b4e09a', '#e6d08e', '#c8a2c4', '#5a86b0'],
    trunkFar: ['#a88a6c', '#ad8668', '#856a86', '#33405e'], trunk: ['#8c6444', '#8f6243', '#74585a', '#2e3a54'], trunkDark: ['#6a4a32', '#6c4632', '#5a4450', '#242e46'],
    moss: ['#7cb45e', '#8fa95e', '#6f8a6a', '#2c5652'],
    grassFar: ['#a6d08c', '#c8bf86', '#9a8eaa', '#2e4c64'], grass: ['#8cc472', '#a2b86e', '#83877c', '#2a5058'], grassNear: ['#76b05e', '#8ea65c', '#727a70', '#244a50'],
    path: ['#efe2bf', '#f2d3a6', '#dcb4a0', '#5e7096'], pathEdge: ['#d9c79c', '#dfb98c', '#c49a8e', '#4e5f86'], gravel: ['#cdbb94', '#d4ad84', '#b48e88', '#43537a'],
    leafA: ['#f0a04a', '#f28a3e', '#d0866e', '#6a6684'], leafB: ['#e8c24e', '#efb24a', '#cfa070', '#706e86'], leafC: ['#d9763e', '#dd6a3a', '#b8706a', '#5e5a7c'],
  };
  const G = 905;   // where feet stand
  // the path's middle line and half-width, from where the characters stand (wide) to the far end (a point)
  const PTS = [[960, 1140, 760], [980, 905, 560], [1100, 790, 300], [900, 700, 150], [1010, 628, 72], [930, 578, 34], [972, 548, 12], [960, 534, 2]];
  // a smooth path: Catmull-Rom through the points, sampled
  const PATH = (() => {
    const out = [];
    for (let i = 0; i < PTS.length - 1; i++) {
      const p0 = PTS[Math.max(0, i - 1)], p1 = PTS[i], p2 = PTS[i + 1], p3 = PTS[Math.min(PTS.length - 1, i + 2)];
      for (let k = 0; k < 12; k++) {
        const u = k / 12, u2 = u * u, u3 = u2 * u, cr = j => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * u + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * u2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * u3);
        out.push([cr(0), cr(1), Math.max(1, cr(2))]);
      }
    }
    out.push(PTS[PTS.length - 1]);
    return out;
  })();
  const VP = PTS[PTS.length - 1];
  // the avenue: trees along both sides, from far to near; each stands just outside the path's edge at its depth
  const TREES = [];
  for (let i = PATH.length - 5; i >= 10; i -= 6) {
    const [x, y, w] = PATH[i], s = Math.max(0.05, w / 560);
    [-1, 1].forEach(side => TREES.push({ x: x + side * (w + 30 + 170 * s + hash(i + side) * 40 * s), y: y + 6 * s, s, side, seed: i * 2 + (side > 0) }));
  }
  const LEAVES = Array.from({ length: 160 }, (_, i) => ({ x: hash(i + 11) * 2300 - 190, y: 640 + Math.pow(hash(i + 23), 0.7) * 460, r: hash(i + 37), k: Math.floor(hash(i + 51) * 3) }));
  const GRAVEL = Array.from({ length: 220 }, (_, i) => ({ u: hash(i + 701), v: hash(i + 811) * 2 - 1, r: hash(i + 907) }));
  const TUFTS = Array.from({ length: 50 }, (_, i) => ({ x: hash(i + 1300) * 2400 - 240, y: 820 + hash(i + 1400) * 260, ph: hash(i + 1500) * 6 }));
  const FLIES = Array.from({ length: 36 }, (_, i) => ({ x: hash(i + 2100) * 1920, y: 420 + hash(i + 2200) * 560, ph: hash(i + 2300) * 6, sp: 0.4 + hash(i + 2400) * 0.6 }));

  // a soft rounded crown of leaves (a cluster of circles), with a sunlit top
  function crown(c, x, y, r, col, hi) {
    c.fillStyle = col;
    [[0, 0, 1], [-0.75, 0.25, 0.72], [0.75, 0.25, 0.72], [0, -0.6, 0.7], [-0.42, -0.35, 0.62], [0.45, -0.35, 0.62]].forEach(([dx, dy, k]) => { c.beginPath(); c.arc(x + dx * r, y + dy * r, k * r, 0, Math.PI * 2); c.fill(); });
    if (hi) { c.save(); c.globalAlpha = 0.45; c.fillStyle = hi; c.beginPath(); c.arc(x - r * 0.3, y - r * 0.55, r * 0.45, 0, Math.PI * 2); c.fill(); c.restore(); }
  }
  // a big old trunk: wider at the roots, a little lean, moss up the side that faces the path, a few bark lines
  function trunk(c, x, y, s, side, seed, tau, far) {
    const w = 190 * s, top = y - 1500 * s, lean = (hash(seed) - 0.5) * 60 * s - side * 20 * s;
    c.fillStyle = tod(tau, far ? PAL.trunkFar : PAL.trunk);
    c.beginPath(); c.moveTo(x - w * 1.25, y); c.quadraticCurveTo(x - w * 0.7, y - 120 * s, x - w * 0.55 + lean, top);
    c.lineTo(x + w * 0.55 + lean, top); c.quadraticCurveTo(x + w * 0.7, y - 120 * s, x + w * 1.25, y); c.closePath(); c.fill();
    if (far) return;
    // shade on the side away from the path, moss on the side toward it
    c.save(); c.clip();
    c.fillStyle = tod(tau, PAL.trunkDark); c.globalAlpha = 0.6; c.fillRect(x + side * w * 0.15 - (side > 0 ? 0 : w * 1.3), top, w * 1.3, y - top);
    // (moss: a soft patch low on the side facing the path, and some round the roots)
    c.globalAlpha = 0.5; c.fillStyle = tod(tau, PAL.moss);
    c.beginPath(); c.ellipse(x - side * w * 0.62, y - 230 * s, w * 0.2, 230 * s, -side * 0.04, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(x - side * w * 0.4, y - 20 * s, w * 0.75, 38 * s, 0, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 0.35; c.strokeStyle = tod(tau, PAL.trunkDark); c.lineWidth = Math.max(1, 5 * s); c.lineCap = 'round';
    for (let k = 0; k < 4; k++) { const bx = x + (hash(seed + k * 7) - 0.5) * w; c.beginPath(); c.moveTo(bx, y - 200 * s - k * 90 * s); c.quadraticCurveTo(bx + 10 * s, y - 420 * s - k * 120 * s, bx - 4 * s, y - 700 * s - k * 120 * s); c.stroke(); }
    c.restore();
  }

  register('forest-path', {
    name: 'forest path',
    credit: 'Claude Code',
    ambient: 'forest',
    pos: { left: 560, center: 960, right: 1360 },
    ground: () => G,
    grade: ['#ffffff', '#fff1e0', '#e4d4ec', '#a8b4e4'], tint: ['#f6ffe8', '#ffb070', '#9a80c0', '#33489e'],
    draw(c, t, cam, tau, h) {
      sky(c, t, h, tau, PAL, { cloudAlpha: 0.5 });
      const lightCol = PAL.endLight[Math.min(3, Math.round(tau))], dk = Math.max(0, 1 - Math.abs(tau - 2) / 0.8), nt = clamp((tau - 2.2) / 0.8);
      // far away: the soft grass and canopy at the end of the path, and the light shining through
      h.cam(0.35);
      c.fillStyle = tod(tau, PAL.grassFar); c.fillRect(-500, 520, 2900, 900);
      c.fillStyle = tod(tau, PAL.canopyFar);
      for (let i = 0; i < 16; i++) crown(c, -300 + i * 170, 420 + hash(i + 3) * 90, 120 + hash(i + 5) * 40, tod(tau, PAL.canopyFar));
      c.save(); c.globalCompositeOperation = 'lighter'; glow(c, VP[0], VP[1] - 40, 520, lightCol, 0.55 - 0.2 * nt); glow(c, VP[0], VP[1] - 10, 180, lightCol, 0.6); c.restore();
      // the path, the grass beside it and the avenue of trees, far to near
      h.cam(1);
      const gr = c.createLinearGradient(0, 520, 0, 1100); gr.addColorStop(0, tod(tau, PAL.grassFar)); gr.addColorStop(0.35, tod(tau, PAL.grass)); gr.addColorStop(1, tod(tau, PAL.grassNear));
      c.fillStyle = gr; c.fillRect(-500, 534, 2900, 1000);
      // the path: its edge a little darker, then the pale gravel, then speckles
      const pathShape = grow => { c.beginPath(); PATH.forEach(([x, y, w], i) => (i ? c.lineTo(x - w - grow * w / 560, y) : c.moveTo(x - w - grow, y))); for (let i = PATH.length - 1; i >= 0; i--) { const [x, y, w] = PATH[i]; c.lineTo(x + w + grow * w / 560, y); } c.closePath(); };
      c.fillStyle = tod(tau, PAL.pathEdge); pathShape(26); c.fill();
      const pg = c.createLinearGradient(0, 534, 0, 1140); pg.addColorStop(0, tod(tau, PAL.path)); pg.addColorStop(1, tod(tau, PAL.pathEdge));
      c.save(); pathShape(0); c.fillStyle = pg; c.fill(); c.clip();
      c.fillStyle = tod(tau, PAL.gravel);
      GRAVEL.forEach(g => { const i = Math.floor(Math.pow(g.u, 0.6) * (PATH.length - 1)), [x, y, w] = PATH[i], s = w / 560; c.beginPath(); c.ellipse(x + g.v * w * 0.9, y + (g.r - 0.5) * 20 * s, (2 + g.r * 4) * s + 0.5, (1.4 + g.r * 2) * s + 0.4, 0, 0, Math.PI * 2); c.fill(); });
      // the light from the far end, lying along the path
      c.globalCompositeOperation = 'lighter'; glow(c, VP[0], VP[1] + 40, 380, lightCol, 0.35 - 0.15 * nt);
      c.restore();
      // the trees, far ones first
      TREES.forEach(tr => trunk(c, tr.x, tr.y, tr.s, tr.side, tr.seed, tau, tr.s < 0.12));
      // fallen leaves in the grass (and a few at the path's edges)
      LEAVES.forEach(l => {
        const s = 0.35 + (l.y - 640) / 460 * 0.9;
        c.fillStyle = tod(tau, [PAL.leafA, PAL.leafB, PAL.leafC][l.k]);
        c.save(); c.translate(l.x, l.y); c.rotate(l.r * 6); c.beginPath(); c.ellipse(0, 0, 7 * s, 3.6 * s, 0, 0, Math.PI * 2); c.fill(); c.restore();
      });
      // the two giant trunks at the front, framing the picture
      trunk(c, 40, 1160, 1.15, -1, 91, tau, false); trunk(c, 1890, 1180, 1.2, 1, 93, tau, false);
      // the canopy: crowns from far to near close overhead, leaving the light in the middle
      for (let i = TREES.length - 1; i >= 0; i--) {
        const tr = TREES[i], r = 330 * tr.s + 30, cy = tr.y - 1500 * tr.s;
        crown(c, tr.x - tr.side * 40 * tr.s + Math.sin(t * 0.8 + i) * 4 * tr.s, cy, r, tod(tau, tr.s < 0.25 ? PAL.canopyFar : PAL.canopyMid), tod(tau, PAL.leafHi));
      }
      [[-40, 40, 330], [260, -60, 260], [1660, -40, 280], [1960, 60, 340], [560, -150, 200], [1380, -150, 210]].forEach(([x, y, r], i) => crown(c, x + Math.sin(t * 0.7 + i) * 5, y, r, tod(tau, PAL.canopyNear), tod(tau, PAL.leafHi)));
      // sunbeams slanting down the avenue (day and sunset), the dusk glow, the moonlight
      const ra = 0.18 * (1 - clamp((tau - 1) / 0.9));
      if (ra > 0) {
        c.save(); c.globalCompositeOperation = 'lighter';
        [[640, 120, 1], [1120, 90, -1], [860, 70, 1]].forEach(([x, w, d], i) => {
          const a = ra * (0.6 + 0.4 * Math.sin(t * 0.6 + i * 2));
          const g = c.createLinearGradient(0, 0, 0, 1000); g.addColorStop(0, `rgba(255,246,206,${a})`); g.addColorStop(1, 'rgba(255,246,206,0)');
          c.fillStyle = g; c.beginPath(); c.moveTo(x, -40); c.lineTo(x + w, -40); c.lineTo(x + w + d * 260, 1000); c.lineTo(x + d * 200, 1000); c.closePath(); c.fill();
        });
        c.restore();
      }
      if (dk > 0) { c.save(); c.globalCompositeOperation = 'lighter'; glow(c, 960, 640, 900, '210,120,170', 0.25 * dk); c.restore(); }
      if (nt > 0) { c.save(); c.globalCompositeOperation = 'lighter'; glow(c, 960, 860, 820, '120,150,220', 0.16 * nt); c.restore(); }
      // grass tufts at the sides (not on the path)
      c.strokeStyle = tod(tau, PAL.moss); c.lineWidth = 3; c.lineCap = 'round';
      TUFTS.forEach(g => { if (Math.abs(g.x - 980) < 620) return; const sw = Math.sin(t * 2.2 + g.ph) * 3; c.beginPath(); c.moveTo(g.x, g.y); c.lineTo(g.x - 5 + sw, g.y - 14); c.moveTo(g.x, g.y); c.lineTo(g.x + sw, g.y - 18); c.moveTo(g.x, g.y); c.lineTo(g.x + 6 + sw, g.y - 13); c.stroke(); });
    },
    // fireflies under the trees at night
    front(c, t, cam, tau) { fireflies(c, t, tau, FLIES, 1.8); },
  });
})(this);
