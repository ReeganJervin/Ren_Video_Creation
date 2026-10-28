// Yuki — the bunny, drawn to match reference/yuki-sheet.png in the same style as Ren (engine/ren.js).
// drawYuki(ctx, K) draws Yuki with feet at (K.x, K.y). K holds the same pose/expression values as Ren's, plus
// optional extras: puff (0..1 puffed cheeks), flop (0..1 extra flop of the flower ear), pawPose ('cheeks' | 'yawn')
// with pawW (0..1) to bring the paws to the face.
(function (root) {
  const C = {
    line: '#4a2616', fur: '#fff7f5', furD: '#f6dfe3', pink: '#f6b3c2', pinkD: '#ef93a8', blush: '255,140,160',
    eye: '#2e1408', irisT: '#4a2414', irisB: '#9a5a32', nose: '#f08ca2', mouth: '#8c2a3a', tongue: '#ff8fa6',
    bow: '#f7a8bc', bowD: '#e98aa3', petal: '#f9b8ca', petalD: '#f093ad', petalC: '#fff1c4', pad: '#fbdde3',
  };
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  function path(c, fn) { c.beginPath(); fn(); c.closePath(); }
  function fillStroke(c, fill, lw = 4) { c.fillStyle = fill; c.fill(); c.lineWidth = lw; c.strokeStyle = C.line; c.stroke(); }
  // Outline a union of sub-paths: a double-width stroke under the fill leaves one clean outer outline.
  function fillUnion(c, fill, lw = 4) { c.lineWidth = lw * 2; c.strokeStyle = C.line; c.stroke(); c.fillStyle = fill; c.fill(); }

  // ---------- the rig ----------
  // Yuki stands on the same joint hierarchy as Ren (engine/ren.js): hips → spine → neck (→ head); shoulder → elbow →
  // paw; hip → foot (her legs are hidden in her round body); the tail (tail1 wiggles the cotton tail); an ear chain
  // (her ears already bend along their length: earTipL/R curls the upper ear further). reachL/R lengthens an arm (pointing). Angles in K.rig (radians,
  // missing = 0); every angle is 0 at rest and a joint at 0 changes nothing, so the rest pose is drawn exactly as before.
  const J = (K, name) => (K.rig && K.rig[name]) || 0;
  function pivot(c, x, y, a) { if (!a) return; c.translate(x, y); c.rotate(a); c.translate(-x, -y); }
  function shade(c, x, y, rx, ry, a, col = C.furD) {
    c.save(); c.translate(x, y); c.scale(1, ry / rx);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(246,223,227,0)');
    c.globalAlpha = a; c.fillStyle = g; c.fillRect(-rx, -rx, rx * 2, rx * 2); c.restore();
  }

  // ---------- ears ----------
  // A long ear grown along a spine from its base at (x, y): `rot` leans the whole ear (positive = to the right),
  // `bend` curls the upper part (positive = to the right) so ears can droop, flop and bounce.
  // back: seen from behind (white all over, no pink inside)
  function earAt(c, x, y, rot, bend, sx = 1, len = 140, back = false) {
    const N = 44, L = [], R = [], IL = [], IR = [], W = 29;
    let px = 0, py = 0;
    for (let i = 0; i <= N; i++) {
      const u = i / N, a = bend * Math.pow(clamp((u - 0.3) / 0.7), 1.4);
      if (i) { px += Math.sin(a) * len / N; py -= Math.cos(a) * len / N; }
      // widest a little above the middle, rounded top
      const body = W * (0.62 + 0.38 * Math.sin(Math.PI * Math.min(u, 0.8) / 0.95));
      const w = u <= 0.78 ? body : body * Math.sqrt(Math.max(0, 1 - Math.pow((u - 0.78) / 0.22, 2)));
      const nx = Math.cos(a), ny = Math.sin(a);
      L.push([px - nx * w, py - ny * w]); R.push([px + nx * w, py + ny * w]);
      if (u > 0.1 && u <= 0.9) {
        const wi = (u <= 0.72 ? body : body * Math.sqrt(Math.max(0, 1 - Math.pow((u - 0.72) / 0.18, 2)))) * 0.52;
        IL.push([px - nx * wi, py - ny * wi + 3]); IR.push([px + nx * wi, py + ny * wi + 3]);
      }
    }
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(sx, 1);
    // smooth outline through the midpoints of the sampled edge
    const smooth = pts => { c.moveTo(...pts[0]); for (let k = 1; k < pts.length - 1; k++) c.quadraticCurveTo(pts[k][0], pts[k][1], (pts[k][0] + pts[k + 1][0]) / 2, (pts[k][1] + pts[k + 1][1]) / 2); c.lineTo(...pts[pts.length - 1]); };
    c.beginPath(); smooth([...L, ...[...R].reverse()]); c.closePath(); fillStroke(c, C.fur);
    if (back) { c.restore(); return; }
    c.beginPath(); smooth([...IL, ...[...IR].reverse()]); c.closePath();
    const g = c.createLinearGradient(0, 0, px, py);
    g.addColorStop(0, C.pink); g.addColorStop(1, '#f9cbd5');
    c.fillStyle = g; c.fill();
    c.restore();
  }
  // Ear lean/bend for one side (s = -1 left, +1 right): droop leans the ear outward and curls it down,
  // `perk` (negative droop) straightens it, landing squash makes it bounce.
  // tip: the ear chain's second joint (+ curls the upper ear outward, like a droop)
  function earPose(K, s, extraFlop = 0, tip = 0) {
    const d = (s < 0 ? K.earL : K.earR), bounce = (1 - K.sy) * 3 + (K.h > 0 ? -0.06 : 0);
    const droop = Math.max(0, d), perk = Math.max(0, -d);
    return { rot: s * (0.1 + droop * 0.75 + extraFlop * 0.3 - perk * 0.3), bend: s * (droop * 1.9 + extraFlop * 2.4 + bounce) + s * tip };
  }

  // ---------- flower + bows ----------
  function sakura(c, x, y, r, rot = 0) {
    c.save(); c.translate(x, y); c.rotate(rot);
    c.lineWidth = 1.8; c.strokeStyle = C.line;
    for (let k = 0; k < 5; k++) {
      c.save(); c.rotate(k * Math.PI * 2 / 5);
      path(c, () => { c.moveTo(0, 0); c.bezierCurveTo(-r * 0.7, -r * 0.3, -r * 0.6, -r * 1.05, -r * 0.16, -r); c.lineTo(0, -r * 0.84); c.lineTo(r * 0.16, -r); c.bezierCurveTo(r * 0.6, -r * 1.05, r * 0.7, -r * 0.3, 0, 0); });
      c.fillStyle = C.petal; c.fill(); c.stroke();
      c.strokeStyle = C.petalD; c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, -r * 0.2); c.lineTo(0, -r * 0.6); c.stroke();
      c.strokeStyle = C.line; c.lineWidth = 1.8;
      c.restore();
    }
    c.fillStyle = C.petalC; c.beginPath(); c.arc(0, 0, r * 0.22, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  // a small bow: two loops and two short ends, with an optional flower in the middle
  function bow(c, x, y, s, flower = true, rot = 0) {
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
    [-1, 1].forEach(i => {
      path(c, () => { c.moveTo(0, 2); c.lineTo(i * 8, 18); c.lineTo(i * 14, 14); c.lineTo(i * 4, 2); }); fillStroke(c, C.bowD, 3);
      path(c, () => { c.moveTo(0, 0); c.bezierCurveTo(i * 10, -16, i * 26, -14, i * 24, 0); c.bezierCurveTo(i * 26, 12, i * 10, 14, 0, 0); }); fillStroke(c, C.bow, 3);
      c.strokeStyle = C.bowD; c.lineWidth = 2; c.beginPath(); c.moveTo(i * 6, -2); c.quadraticCurveTo(i * 14, -6, i * 18, -2); c.stroke();
    });
    if (flower) sakura(c, 0, 0, 9); else { path(c, () => c.ellipse(0, 0, 7, 6, 0, 0, Math.PI * 2)); fillStroke(c, C.bow, 3); }
    c.restore();
  }

  // thin pink band under the chin; `turn` 0 front .. 1 side
  function collar(c, cx, turn) {
    path(c, () => { c.moveTo(cx - 46 + 30 * turn, -120); c.quadraticCurveTo(cx, -96 + 4 * turn, cx + 46, -120 + 6 * turn); c.lineTo(cx + 44, -112 + 6 * turn); c.quadraticCurveTo(cx, -86 + 4 * turn, cx - 44 + 30 * turn, -112); });
    fillStroke(c, C.bow, 3);
  }

  // ---------- face parts ----------
  // eyes: 'normal' | 'happy' (^ arcs) | 'wide' (white, small pupils) | 'sleepy' (closed) | 'shy' (glossy)
  //       | 'playful' (wink on the right eye) | 'pouty' (narrowed under a cross lid)
  //       | 'sparkle' (excited) | 'proud' (half closed) | 'worried' | 'scared' (small pupils) | 'determined' | 'teary'
  // `inward`: the side of the eye toward the nose (+1 right, -1 left)
  function drawEye(c, ex, ey, i, K, squeeze = 1, bold = false, inward = -i) {
    eyeShape(c, ex, ey, i, K, squeeze, bold, inward);
    if (K.tears > 0.02) tear(c, ex, ey, inward, K, squeeze);
  }
  // upper lids [y at the nose side, y at the outer side] (the eye is 21 tall above its middle), as Ren's
  const LIDS = { proud: [-7, -6], determined: [-6, -12], worried: [-17, -10], teary: [-15, -8] };
  // lower lids pushed up by the cheeks (proud), as Ren's
  const LOWER = { proud: 13 };
  function star(c, x, y, r) {
    const k = r * 0.2;
    c.beginPath(); c.moveTo(x, y - r);
    c.quadraticCurveTo(x + k, y - k, x + r, y); c.quadraticCurveTo(x + k, y + k, x, y + r);
    c.quadraticCurveTo(x - k, y + k, x - r, y); c.quadraticCurveTo(x - k, y - k, x, y - r);
    c.fill();
  }
  // a short tear track from the outer half of the lower lid, following the curve of the cheek (out, then down),
  // ending in a glistening, slightly see-through drop that swells a little
  function tear(c, ex, ey, inward, K, squeeze) {
    const a = clamp(K.tears), o = -inward, x0 = o * 7.47, y0 = 17.43, L = 21.58 * a;
    const cx = x0 + o * 9.13, cy = y0 + L * 0.45, x1 = x0 + o * 6.64, y1 = y0 + L;
    c.save(); c.translate(ex, ey); c.scale(squeeze, 1); c.globalAlpha *= a; c.lineCap = 'round';
    const track = () => { c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(cx, cy, x1, y1); };
    track(); c.strokeStyle = 'rgba(80,140,195,0.45)'; c.lineWidth = 5.81; c.stroke();
    track(); c.strokeStyle = 'rgba(190,228,252,0.7)'; c.lineWidth = 3.73; c.stroke();
    c.beginPath(); c.moveTo(x0 - 1, y0 + 4); c.quadraticCurveTo(cx - 1.5, cy, x1 - 1.5, y1 - 3);
    c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 1.4; c.stroke();
    // the drop: pointed at the top, round below
    const r = 4.15 * (0.9 + 0.1 * Math.sin((K.t || 0) * 2.4 + (inward > 0 ? 1 : 0))), dx = x1, dy = y1 + r * 0.9;
    c.beginPath(); c.moveTo(dx, dy - r * 1.9);
    c.bezierCurveTo(dx + r * 0.4, dy - r * 1.1, dx + r, dy - r * 0.5, dx + r, dy);
    c.arc(dx, dy, r, 0, Math.PI);
    c.bezierCurveTo(dx - r, dy - r * 0.5, dx - r * 0.4, dy - r * 1.1, dx, dy - r * 1.9);
    c.fillStyle = 'rgba(176,222,250,0.65)'; c.fill(); c.lineWidth = 1.6; c.strokeStyle = 'rgba(70,130,190,0.8)'; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.95)'; c.beginPath(); c.ellipse(dx - r * 0.35, dy - r * 0.3, r * 0.28, r * 0.4, -0.4, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  function eyeShape(c, ex, ey, i, K, squeeze, bold, inward) {
    c.save(); c.translate(ex, ey);
    c.scale(squeeze, 1);
    c.strokeStyle = C.line; c.lineCap = 'round';
    if (K.eyes === 'happy' || (K.eyes === 'playful' && i > 0)) {
      c.lineWidth = 5 / squeeze; c.beginPath(); c.moveTo(-15, 6); c.quadraticCurveTo(0, -13, 15, 6); c.stroke();
      c.restore(); return;
    }
    const open = 1 - K.blink;
    if (K.eyes === 'sleepy' || open < 0.15) {
      const L = bold ? 19 : 15;
      c.lineWidth = (bold ? 6.5 : 4.5) / squeeze; c.beginPath(); c.moveTo(-L, 2); c.quadraticCurveTo(0, bold ? 14 : 12, L, 2); c.stroke();
      if (K.eyes === 'sleepy') { c.lineWidth = bold ? 4.5 : 3; c.beginPath(); c.moveTo(i * (L - 1), 3); c.lineTo(i * (L + 6), -1); c.stroke(); }
      c.restore(); return;
    }
    const lx = K.lookX * 4, ly = K.lookY * 4.5;
    if (K.eyes === 'wide' && K.wide > 0.4) {
      // surprised: round white eyes with small pupils
      c.scale(1, open);
      c.beginPath(); c.ellipse(0, 0, 17, 20, 0, 0, Math.PI * 2); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 3.5; c.stroke();
      c.beginPath(); c.arc(lx * 0.8, 2 + ly * 0.8, 7, 0, Math.PI * 2); c.fillStyle = C.eye; c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(-2 + lx * 0.8, -1 + ly * 0.8, 2.4, 0, Math.PI * 2); c.fill();
      c.restore(); return;
    }
    if (K.eyes === 'scared') {
      // scared: the white of the eye shows all round a smaller brown iris, which quivers a little (never horror)
      c.scale(1, open);
      const jx = lx * 0.8 + Math.sin((K.t || 0) * 31) * 0.7;
      c.beginPath(); c.ellipse(0, 0, 16, 21, 0, 0, Math.PI * 2); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 3.5; c.stroke();
      const g = c.createLinearGradient(0, -8 + ly, 0, 12 + ly);
      g.addColorStop(0, C.irisT); g.addColorStop(1, C.irisB);
      c.beginPath(); c.ellipse(jx, 2 + ly, 8.5, 10.5, 0, 0, Math.PI * 2); c.fillStyle = g; c.fill();
      c.beginPath(); c.ellipse(jx, 1.5 + ly, 4.2, 5, 0, 0, Math.PI * 2); c.fillStyle = C.eye; c.fill();
      // a clear shine and a small second glint, so the eyes stay alive
      c.fillStyle = '#fff'; c.beginPath(); c.arc(-3 + jx, -3.5 + ly, 3.9, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(3 + jx, 4.2 + ly, 1.6, 0, Math.PI * 2); c.fill();
      c.restore(); return;
    }
    const pouty = K.eyes === 'pouty';
    c.scale(1, open * (pouty ? 0.7 : 1));
    c.beginPath(); c.ellipse(0, 0, 16, 21, 0, 0, Math.PI * 2); c.fillStyle = C.eye; c.fill();
    c.save(); c.clip();
    const g = c.createLinearGradient(0, -12 + ly, 0, 21 + ly);
    g.addColorStop(0, C.irisT); g.addColorStop(1, C.irisB);
    c.beginPath(); c.ellipse(lx * 0.8, 3 + ly, 13.5, 16.5, 0, 0, Math.PI * 2); c.fillStyle = g; c.fill();
    c.beginPath(); c.ellipse(lx * 0.9, 1 + ly, 7, 9, 0, 0, Math.PI * 2); c.fillStyle = C.eye; c.fill();
    if (pouty) {
      // a cross lid slanting down toward the nose
      c.fillStyle = C.fur; c.beginPath(); c.moveTo(-20, -24); c.lineTo(20, -24); c.lineTo(20, -8 + i * 8); c.lineTo(-20, -8 - i * 8); c.closePath(); c.fill();
    }
    c.restore();
    if (pouty) { c.lineWidth = 4; c.beginPath(); c.moveTo(-17, -8 - i * 8); c.lineTo(17, -8 + i * 8); c.stroke(); }
    c.fillStyle = '#fff';
    if (K.eyes === 'sparkle') {
      // excited: star-shaped sparkles instead of round highlights
      star(c, -4 + lx * 0.6, -7 + ly * 0.6, 11); star(c, 6 + lx, 9 + ly, 5);
      c.beginPath(); c.arc(7 + lx, -9 + ly, 2.2, 0, Math.PI * 2); c.fill();
    } else {
      if (!LIDS[K.eyes] || Math.max(...LIDS[K.eyes]) <= -10) { c.beginPath(); c.arc(-5 + lx * 0.6, -8 + ly * 0.6, 7.5, 0, Math.PI * 2); c.fill(); }
      c.beginPath(); c.arc(6 + lx, 9 + ly, 3.2, 0, Math.PI * 2); c.fill();
    }
    if (K.eyes === 'shy') {
      c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 2.6;
      c.beginPath(); c.ellipse(0, 0, 13, 17, 0, 0.25 * Math.PI, 0.75 * Math.PI); c.stroke();
      c.beginPath(); c.arc(-7 + lx, 4 + ly, 2.2, 0, Math.PI * 2); c.fill();
    }
    if (K.eyes === 'teary') {
      // wet eyes: water pooling along the lower lid, a bright wet rim and extra glints
      c.save(); c.beginPath(); c.ellipse(0, 0, 16, 21, 0, 0, Math.PI * 2); c.clip();
      c.fillStyle = 'rgba(178,222,250,0.5)'; c.beginPath(); c.moveTo(-18, 10); c.quadraticCurveTo(-7, 6, 0, 9); c.quadraticCurveTo(7, 12, 18, 8); c.lineTo(18, 25); c.lineTo(-18, 25); c.fill();
      c.restore();
      c.strokeStyle = 'rgba(255,255,255,0.95)'; c.lineWidth = 2.8;
      c.beginPath(); c.ellipse(0, 0, 13, 17.5, 0, 0.18 * Math.PI, 0.82 * Math.PI); c.stroke();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(-7.5 + lx, 4 + ly, 2.4, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(3.5 + lx, -2 + ly, 1.8, 0, Math.PI * 2); c.fill();
    }
    const lid = LIDS[K.eyes];
    if (lid) {
      // the upper lid, in fur colour, with its edge line; a small glint stays below it so the eye keeps its life
      const [yi, yo] = lid, xi = inward * 19, xo = -inward * 19, ym = (yi + yo) / 2 - (K.eyes === 'proud' ? 4 : 2);
      // (clipped a little outside the eye, so the lid also covers the eye's soft edge)
      c.save(); c.beginPath(); c.ellipse(0, 0, 17.5, 22.5, 0, 0, Math.PI * 2); c.clip();
      c.beginPath(); c.moveTo(xo, -25); c.lineTo(xi, -25); c.lineTo(xi, yi); c.quadraticCurveTo(0, ym, xo, yo); c.closePath();
      c.fillStyle = C.fur; c.fill();
      const lo = LOWER[K.eyes];
      if (lo !== undefined) { c.beginPath(); c.moveTo(-20, 27); c.lineTo(-20, lo + 7); c.quadraticCurveTo(0, lo - 7, 20, lo + 7); c.lineTo(20, 27); c.closePath(); c.fill(); }
      c.restore();
      c.save(); c.beginPath(); c.ellipse(0, 0, 16, 21, 0, 0, Math.PI * 2); c.clip();
      c.beginPath(); c.moveTo(xi, yi); c.quadraticCurveTo(0, ym, xo, yo); c.lineWidth = 7; c.strokeStyle = C.line; c.stroke();
      if (lo !== undefined) { c.beginPath(); c.moveTo(-18, lo + 8); c.quadraticCurveTo(0, lo - 7, 18, lo + 8); c.lineWidth = 3.5; c.stroke(); }
      c.restore();
      if (Math.max(yi, yo) > -10) { c.fillStyle = '#fff'; c.beginPath(); c.arc(-4 + lx * 0.6, Math.max(yi, yo) + 6 + ly * 0.4, 3.4, 0, Math.PI * 2); c.fill(); }
    }
    c.restore();
  }

  function drawMouth(c, K) {
    c.strokeStyle = C.line; c.lineWidth = 3; c.lineCap = 'round';
    const omega = () => { c.beginPath(); c.moveTo(-8, 1); c.quadraticCurveTo(-4, 7, 0, 1); c.quadraticCurveTo(4, 7, 8, 1); c.stroke(); };
    const openShape = a => {
      path(c, () => { c.moveTo(-9, 0); c.quadraticCurveTo(0, 2, 9, 0); c.quadraticCurveTo(7, 15 * a, 0, 16 * a); c.quadraticCurveTo(-7, 15 * a, -9, 0); });
      c.fillStyle = C.mouth; c.fill(); c.stroke();
      if (a > 0.45) { c.save(); c.clip(); c.beginPath(); c.ellipse(0, 13 * a, 6, 4.5 * a, 0, 0, Math.PI * 2); c.fillStyle = C.tongue; c.fill(); c.restore(); }
    };
    // lip-sync shapes (K.viseme, see engine/lipsync.js), opened by a (0..1); drawn at Ren's size, scaled to Yuki's smaller mouth
    const teeth = () => { c.save(); c.clip(); c.fillStyle = '#fff'; c.fillRect(-15, -2, 30, 5.5); c.restore(); };
    const visemeShape = (v, a) => {
      c.save(); c.scale(0.82, 0.84); c.lineWidth = 3 / 0.83;
      const ren = b => openShapeR(b);
      switch (v) {
        case 'X': c.restore(); omega(); return;
        case 'M': c.beginPath(); c.moveTo(-9, 3); c.quadraticCurveTo(0, 6, 9, 3); c.stroke(); break;   // lips pressed together
        case 'F':   // the lower lip tucked under the top teeth
          path(c, () => { c.moveTo(-9, 1); c.quadraticCurveTo(0, 3, 9, 1); c.quadraticCurveTo(6, 8, 0, 8.5); c.quadraticCurveTo(-6, 8, -9, 1); });
          c.fillStyle = C.mouth; c.fill(); teeth(); c.stroke(); break;
        case 'A': ren(0.55 + 0.45 * a); break;
        case 'E': {   // wide and not so deep, the top teeth showing
          const h = 0.45 + 0.45 * a;
          path(c, () => { c.moveTo(-13, 0); c.quadraticCurveTo(0, 2, 13, 0); c.quadraticCurveTo(10, 11 * h, 0, 12 * h); c.quadraticCurveTo(-10, 11 * h, -13, 0); });
          c.fillStyle = C.mouth; c.fill(); teeth(); c.stroke(); break;
        }
        case 'O': { const ry = 4.5 + 5.5 * a; c.beginPath(); c.ellipse(0, 1 + ry, 7, ry, 0, 0, Math.PI * 2); c.fillStyle = C.mouth; c.fill(); c.stroke(); break; }
        case 'U': { const ry = 4 + 1.5 * a; c.beginPath(); c.ellipse(0, 2 + ry, 4.5, ry, 0, 0, Math.PI * 2); c.fillStyle = C.mouth; c.fill(); c.stroke(); break; }
        default: ren(0.25 + 0.35 * a);   // C: most other consonants, a little open
      }
      c.restore();
    };
    // Ren's open mouth (at his size, so the shapes above scale together)
    const openShapeR = a => {
      path(c, () => { c.moveTo(-11, 0); c.quadraticCurveTo(0, 2, 11, 0); c.quadraticCurveTo(8, 18 * a, 0, 19 * a); c.quadraticCurveTo(-8, 18 * a, -11, 0); });
      c.fillStyle = C.mouth; c.fill(); c.stroke();
      if (a > 0.45) { c.save(); c.clip(); c.beginPath(); c.ellipse(0, 15 * a, 7, 5 * a, 0, 0, Math.PI * 2); c.fillStyle = C.tongue; c.fill(); c.restore(); }
    };
    // talking in a sad, shy or pouty mood: the open mouth turns down at the corners (it never looks like a smile)
    const downShape = (a, w) => {
      path(c, () => { c.moveTo(-w, 7); c.quadraticCurveTo(0, -1, w, 7); c.quadraticCurveTo(w * 0.6, 7 + 11 * a, 0, 7 + 11 * a); c.quadraticCurveTo(-w * 0.6, 7 + 11 * a, -w, 7); });
      c.fillStyle = C.mouth; c.fill(); c.stroke();
    };
    // talking while shy, sad or worried: small and flat, a little wobbly, corners down; it opens only a little
    // (a round "o" is for surprised)
    const worried = (a, w) => {
      const lo = 6 + 4 * a;
      path(c, () => {
        c.moveTo(-w, 6 + 3); c.quadraticCurveTo(-w * 0.55, 6 - 1, -w * 0.15, 6 + 0.5); c.quadraticCurveTo(w * 0.25, 6 - 1.5, w, 6 + 3);
        c.quadraticCurveTo(w * 0.4, lo + 1, 0, lo); c.quadraticCurveTo(-w * 0.4, lo + 1, -w, 6 + 3);
      });
      c.fillStyle = C.mouth; c.fill(); c.stroke();
    };
    // laughing: wide open, the tongue showing
    const laughShape = a => {
      path(c, () => { c.moveTo(-12, -1); c.quadraticCurveTo(0, 3, 12, -1); c.quadraticCurveTo(9, 20 * a, 0, 21 * a); c.quadraticCurveTo(-9, 20 * a, -12, -1); });
      c.fillStyle = C.mouth; c.fill(); c.stroke();
      c.save(); c.clip(); c.beginPath(); c.ellipse(0, 18 * a, 7.5, 5 * a, 0, 0, Math.PI * 2); c.fillStyle = C.tongue; c.fill(); c.restore();
    };
    // determined, talking: a firm, square-ish opening (not a smile)
    const firmShape = a => {
      path(c, () => { c.moveTo(-7, 3); c.lineTo(7, 3); c.quadraticCurveTo(7, 3 + 9 * a, 4.5, 3 + 9 * a); c.lineTo(-4.5, 3 + 9 * a); c.quadraticCurveTo(-7, 3 + 9 * a, -7, 3); });
      c.fillStyle = C.mouth; c.fill(); c.stroke();
    };
    // a small wavy line with the corners down (worried, crying); it trembles a little
    const wobble = (w, k = 1) => {
      const q = Math.sin((K.t || 0) * 9) * 0.7 * k;
      c.beginPath(); c.moveTo(-w, 7); c.quadraticCurveTo(-w * 0.6, 3.5 + q, -w * 0.25, 5); c.quadraticCurveTo(0, 7 - q, w * 0.25, 5); c.quadraticCurveTo(w * 0.6, 3.5 + q, w, 7); c.stroke();
    };
    switch (K.mouth) {
      case 'open': openShape(1); break;
      case 'talk':
        if (/frown|wobble/.test(K.moodMouth || '')) worried(K.talk, K.moodMouth === 'tinyfrown' ? 5 : 6.5);
        else if (K.moodMouth === 'gasp') worried(0.4 + 0.6 * K.talk, 6.5);
        else if (K.moodMouth === 'o') { c.beginPath(); c.ellipse(0, 8, 5.5 * (0.8 + 0.2 * K.talk), 7 * (0.55 + 0.45 * K.talk), 0, 0, Math.PI * 2); c.fillStyle = C.mouth; c.fill(); c.stroke(); }   // surprised: a round o
        else if (K.moodMouth === 'pout') downShape(K.talk * 0.7, 5);
        else if (K.moodMouth === 'laugh') laughShape(0.7 + 0.3 * K.talk);
        else if (K.moodMouth === 'set') firmShape(K.talk);
        else if (K.moodMouth === 'hmm') openShape(K.talk * 0.65);
        else if (K.viseme) visemeShape(K.viseme, K.talk);
        else openShape(K.talk);
        break;
      case 'laugh': laughShape(1); break;
      case 'wobble': wobble(7.5); break;
      case 'gasp': worried(0.45, 6.5); break;
      case 'set': c.beginPath(); c.moveTo(-7, 4); c.quadraticCurveTo(0, 5.5, 7, 4); c.stroke(); break;
      // proud: a confident closed smile, a little higher on one side
      case 'smirk': c.beginPath(); c.moveTo(-9, 2); c.quadraticCurveTo(0, 9, 10, -1); c.stroke(); c.beginPath(); c.moveTo(8.5, -2.5); c.quadraticCurveTo(11, -1, 11, 1.5); c.stroke(); break;
      // thinking: a small mouth pulled to one side
      case 'hmm': c.beginPath(); c.moveTo(-2.5, 6); c.quadraticCurveTo(1.5, 7.5, 6.5, 3.5); c.stroke(); break;
      case 'o': c.beginPath(); c.ellipse(0, 8, 5.5, 7, 0, 0, Math.PI * 2); c.fillStyle = C.mouth; c.fill(); c.stroke(); break;
      case 'soft': c.beginPath(); c.moveTo(-8, 2); c.quadraticCurveTo(0, 8, 8, 2); c.stroke(); break;
      case 'frown': c.beginPath(); c.moveTo(-7, 6); c.quadraticCurveTo(0, 0, 7, 6); c.stroke(); break;
      case 'tinyfrown': c.beginPath(); c.moveTo(-4, 6); c.quadraticCurveTo(0, 3, 4, 6); c.stroke(); break;
      case 'pout': {
        // small pursed mouth
        c.beginPath(); c.moveTo(-5, 6); c.quadraticCurveTo(0, 1, 5, 6); c.stroke();
        c.lineWidth = 2; c.beginPath(); c.moveTo(-2, 9); c.quadraticCurveTo(0, 11, 2, 9); c.stroke();
        break;
      }
      case 'yawn': {
        path(c, () => c.ellipse(0, 8, 6, 8, 0, 0, Math.PI * 2));
        c.fillStyle = C.mouth; c.fill();
        c.save(); c.clip(); c.beginPath(); c.ellipse(0, 14, 5, 3.5, 0, 0, Math.PI * 2); c.fillStyle = C.tongue; c.fill(); c.restore();
        c.stroke(); break;
      }
      case 'tongue': {
        path(c, () => { c.moveTo(-1, 3); c.quadraticCurveTo(-1, 14, 5, 14); c.quadraticCurveTo(11, 14, 10, 3); });
        c.fillStyle = C.tongue; c.fill(); c.lineWidth = 2.5; c.stroke();
        c.beginPath(); c.moveTo(4.5, 5); c.lineTo(4.5, 9); c.strokeStyle = 'rgba(140,42,58,0.6)'; c.lineWidth = 2; c.stroke();
        c.strokeStyle = C.line; c.lineWidth = 3; omega();
        break;
      }
      default: omega();
    }
  }
  function drawNose(c, x, y, rot = 0) {
    c.save(); c.translate(x, y); c.rotate(rot);
    path(c, () => { c.moveTo(-5, -2); c.quadraticCurveTo(0, -4, 5, -2); c.quadraticCurveTo(3, 3, 0, 4); c.quadraticCurveTo(-3, 3, -5, -2); });
    c.fillStyle = C.nose; c.fill(); c.lineWidth = 1.5; c.strokeStyle = C.line; c.stroke();
    c.restore();
  }
  function blushAt(c, x, y, K, k = 1) {
    const r = (22 + K.blushBoost * 8) * k, a = clamp(0.55 + K.blushBoost * 0.5);
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${C.blush},${a})`); g.addColorStop(0.6, `rgba(${C.blush},${a * 0.55})`); g.addColorStop(1, `rgba(${C.blush},0)`);
    c.fillStyle = g; c.beginPath(); c.ellipse(x, y, r, r * 0.62, 0, 0, Math.PI * 2); c.fill();
  }
  // shy: a soft blush band across the nose
  function noseBand(c, x, y, K, w = 70) {
    if (K.blushBoost <= 0.4) return;
    c.save(); c.translate(x, y); c.scale(1, 0.3);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, w), a = clamp((K.blushBoost - 0.4) * 1.4);
    g.addColorStop(0, `rgba(${C.blush},${0.6 * a})`); g.addColorStop(1, `rgba(${C.blush},0)`);
    c.fillStyle = g; c.fillRect(-w, -w, w * 2, w * 2); c.restore();
  }
  // brows > 0: worried (inner end raised); brows < 0: cross (inner end lowered)
  function brow(c, x, K, inward, k = 1) {
    const v = K.brows || 0; if (Math.abs(v) < 0.02) return;
    // firm (determined): lower and nearly level, steady rather than cross
    const f = v < 0 ? K.firm || 0 : 0, inY = v > 0 ? -34 : -22 - 4 * f, outY = v > 0 ? -26 : -32 + 2.5 * f;
    c.save(); c.globalAlpha = clamp(Math.abs(v)); c.strokeStyle = C.line; c.lineWidth = 4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x + inward * 11 * k, inY); c.lineTo(x - inward * 9 * k, outY); c.stroke();
    c.restore();
  }
  // Head pivot on the neck; the head is drawn 10% larger than its path coordinates.
  const HS = 1.1, HY = -183;
  // (proud lifts the head a little: chin up; K.nod lowers it, in pixels, for nodding)
  function headFrame(c, K, dx) { c.translate(0, -112 - 6 * (K.lift || 0) + (K.nod || 0)); c.rotate(K.tilt); c.translate(dx, HY + 112); c.scale(HS, HS); }
  // K.sit (0..1): sitting down (1) or crouching (about 0.45) lowers her round body; the feet stay on the ground, a little apart
  const sitDrop = K => 30 * (K.sit || 0);
  // a point given in head coordinates, in body coordinates (ignoring tilt) — used to send paws to the face
  const headPt = (dx, x, y) => [dx + HS * x, HY + HS * y];

  // ---------- arms ----------
  // An arm growing out of the body at the shoulder S and ending in a paw at P. The elbow bows out
  // toward side `out`; only the arm's own edges are outlined, so it joins the body outline at the shoulder.
  // E: the elbow (when the arm bends there); the curve then passes through it
  function armCurve(c, S, P, out, E) {
    const [sx, sy] = S, [px, py] = P, dx = px - sx, dy = py - sy, d = Math.hypot(dx, dy) || 1;
    const mx = E ? 2 * E[0] - (sx + px) / 2 : (sx + px) / 2 + (-dy / d) * out * 7, my = E ? 2 * E[1] - (sy + py) / 2 : (sy + py) / 2 + (dx / d) * out * 7;
    const N = 10, A = [], B = [];
    for (let k = 0; k <= N; k++) {
      const u = k / N, v = 1 - u;
      const x = v * v * sx + 2 * v * u * mx + u * u * px, y = v * v * sy + 2 * v * u * my + u * u * py;
      const tx = 2 * v * (mx - sx) + 2 * u * (px - mx), ty = 2 * v * (my - sy) + 2 * u * (py - my), tn = Math.hypot(tx, ty) || 1;
      const w = 13 - 2.5 * u;
      A.push([x - ty / tn * w, y + tx / tn * w]); B.push([x + ty / tn * w, y - tx / tn * w]);
    }
    const a0 = Math.atan2(A[N][1] - py, A[N][0] - px);
    const outline = close => {
      c.beginPath(); c.moveTo(...A[0]); A.forEach(p => c.lineTo(...p));
      c.arc(px, py, 10.5, a0, a0 + Math.PI, true);
      [...B].reverse().forEach(p => c.lineTo(...p));
      if (close) c.closePath();
    };
    const g = c.createRadialGradient(px, py, 0, px, py, 16);
    g.addColorStop(0, C.pad); g.addColorStop(1, C.fur);
    outline(true); c.fillStyle = g; c.fill();
    outline(false); c.lineWidth = 4; c.strokeStyle = C.line; c.stroke();
  }
  // Paw position from Ren's arm-angle convention (0.16 rest, up to ~2.7 raised, negative = folded in to hold):
  // at rest the paw curls in onto the upper chest.
  // elbow: + folds the forearm in (the paw then hangs from an elbow halfway along; P.elbow keeps where it is)
  function pawFrom(S, ang, i, len = 34, curl = 1.1, elbow = 0) {
    const e = Math.max(-1.6, ang - curl * (1 - clamp(ang / 1.6)));
    if (!elbow) return [S[0] + i * len * Math.sin(e), S[1] + len * Math.cos(e)];
    const u = len / 2, E = [S[0] + i * u * Math.sin(e), S[1] + u * Math.cos(e)], P = [E[0] + i * u * Math.sin(e - elbow), E[1] + u * Math.cos(e - elbow)];
    P.elbow = E;
    return P;
  }
  // The shoulder sits on the body edge while the paw is low and slides inside the body as the paw rises,
  // so a raised arm never shows an open root.
  function armFrom(c, Sedge, Sin, P, out) {
    const k = clamp((Sedge[1] - P[1] + 10) / 40);
    armCurve(c, [lerp(Sedge[0], Sin[0], k), lerp(Sedge[1], Sin[1], k)], P, out, P.elbow);
  }
  // move a paw toward a face target by the pawPose weight
  const toward = (P, T, K) => (T ? [lerp(P[0], T[0], clamp(K.pawW || 0)), lerp(P[1], T[1], clamp(K.pawW || 0))] : P);   // (a paw sent to the face drops the elbow)

  // ---------- FRONT view (|f| < 0.3) ----------
  function frontHeadPath(c, K) {
    c.beginPath();
    c.moveTo(0, -80);
    c.bezierCurveTo(56, -80, 96, -44, 96, 6);
    c.bezierCurveTo(96, 48, 62, 72, 0, 72);
    c.bezierCurveTo(-62, 72, -96, 48, -96, 6);
    c.bezierCurveTo(-96, -44, -56, -80, 0, -80);
    c.closePath();
    const p = K.puff || 0;
    if (p > 0) [-1, 1].forEach(i => { c.moveTo(i * 76 + 28 * p, 34); c.ellipse(i * 76, 34, 28 * p, 24 * p, 0, 0, Math.PI * 2); c.closePath(); });
  }
  function drawFrontHead(c, K) {
    const f = K.f;
    c.save();
    headFrame(c, K, f * 6);
    const eL = earPose(K, -1, 0, J(K, 'earTipL')), eR = earPose(K, 1, K.flop || 0, J(K, 'earTipR'));
    earAt(c, -36 + f * 8, -60, eL.rot, eL.bend);
    earAt(c, 36 + f * 8, -60, eR.rot, eR.bend);
    frontHeadPath(c, K); fillUnion(c, C.fur);
    c.save(); c.clip();
    shade(c, f * 10, -50, 70, 40, 0.0);
    shade(c, -90 - f * 20, 30, 50, 60, 0.6); shade(c, 90 - f * 20, 30, 50, 60, 0.6);
    noseBand(c, f * 20, 26, K);
    c.restore();
    [-1, 1].forEach(i => blushAt(c, i * 64 + f * 14, 34, K, 1 + 0.2 * (K.puff || 0)));
    drawEye(c, -40 + f * 20, 6, -1, K);
    drawEye(c, 40 + f * 20, 6, 1, K);
    [-1, 1].forEach(i => brow(c, i * 40 + f * 18, K, -i));
    drawNose(c, f * 22, 24);
    c.save(); c.translate(f * 22, 30); drawMouth(c, K); c.restore();
    // pink flower with a little bow at the base of the right ear (viewer's right)
    bow(c, 78 + f * 8, -44, 0.8, false, 0.7);
    sakura(c, 58 + f * 8, -58, 21, 0.2);
    c.restore();
  }
  function frontBodyPath(c) {
    path(c, () => {
      c.moveTo(0, -112);
      c.bezierCurveTo(40, -112, 72, -80, 70, -46);
      c.bezierCurveTo(68, -16, 40, -8, 0, -8);
      c.bezierCurveTo(-40, -8, -68, -16, -70, -46);
      c.bezierCurveTo(-72, -80, -40, -112, 0, -112);
    });
  }
  function drawFeet(c, K, xs) {
    xs.forEach((x0, k) => {
      const ph = K.phase + (k ? Math.PI : 0), lx = x0 + Math.sin(ph) * 8 * K.walk + (k ? 1 : -1) * 7 * (K.sit || 0), lift = Math.max(0, Math.cos(ph)) * 6 * K.walk + sitDrop(K);
      c.save(); pivot(c, x0, -46, J(K, k ? 'hipR' : 'hipL'));   // the hidden leg swings the foot from inside the body
      path(c, () => c.ellipse(lx, -11 - lift, 22, 13, 0, 0, Math.PI * 2)); fillStroke(c, C.fur);
      c.strokeStyle = C.furD; c.lineWidth = 2.5;
      [-6, 6].forEach(o => { c.beginPath(); c.moveTo(lx + o, -lift - 2); c.lineTo(lx + o, -lift - 8); c.stroke(); });
      c.restore();
    });
  }
  function drawFront(c, K) {
    pivot(c, 0, -40, J(K, 'hips'));
    if (K.sit) c.translate(0, sitDrop(K));
    drawFeet(c, K, [-24 + K.f * 6, 24 + K.f * 6]);
    c.translate(0, -Math.abs(Math.sin(K.phase)) * 4 * K.walk);
    pivot(c, 0, -50, J(K, 'spine'));
    frontBodyPath(c); c.fillStyle = C.fur; c.fill();
    c.save(); c.clip();
    shade(c, -62, -46, 40, 56, 0.7); shade(c, 62, -46, 40, 56, 0.7); shade(c, 0, -12, 60, 18, 0.6);
    c.restore();
    frontBodyPath(c); c.lineWidth = 4; c.strokeStyle = C.line; c.stroke();
    collar(c, K.f * 14, 0);
    c.save(); pivot(c, K.f * 6, -112, J(K, 'neck')); drawFrontHead(c, K); c.restore();
    bow(c, K.f * 14, -98, 1.25);
    const dx = K.f * 6;
    const tgt = K.pawPose === 'cheeks' ? [headPt(dx, -22, 48), headPt(dx, 22, 48)] : K.pawPose === 'yawn' ? [null, headPt(dx, 8 + K.f * 22, 36)] : K.pawPose === 'chin' ? [null, headPt(dx, 14 + K.f * 22, 58)]
      : K.pawPose === 'eyes' ? [headPt(dx, -36 + K.f * 20, 8), headPt(dx, 36 + K.f * 20, 8)] : [null, null];
    [-1, 1].forEach((i, k) => {
      const S = [i * 48 + K.f * 4, -88], P = toward(pawFrom(S, i < 0 ? K.armL : K.armR, i, 34 + 0.6 * J(K, i < 0 ? 'reachL' : 'reachR'), 1.1, J(K, i < 0 ? 'elbowL' : 'elbowR')), tgt[k], K);
      armFrom(c, S, [i * 36 + K.f * 4, -86], P, i);
      if (i > 0 && K.hold) K.hold.at(c, P[0], P[1] + 4);   // something held in the near paw (from the film)
    });
  }

  // ---------- THREE-QUARTER view (0.3 <= |f| < 0.7), drawn facing right ----------
  // Like the sheet's three-quarter view: the round head turned a little, no bump; the face shifts toward the
  // side Yuki is facing, with the nose and mouth between the eyes, closer to the far eye.
  function threeHeadPath(c, K) {
    c.beginPath();
    c.moveTo(0, -80);
    c.bezierCurveTo(56, -80, 98, -44, 98, 6);
    c.bezierCurveTo(98, 46, 66, 72, 0, 72);
    c.bezierCurveTo(-62, 72, -96, 48, -96, 6);
    c.bezierCurveTo(-96, -44, -56, -80, 0, -80);
    c.closePath();
    const p = K.puff || 0;
    if (p > 0) { c.moveTo(-74 + 28 * p, 36); c.ellipse(-74, 36, 28 * p, 24 * p, 0, 0, Math.PI * 2); c.closePath(); c.moveTo(80 + 22 * p, 36); c.ellipse(80, 36, 22 * p, 20 * p, 0, 0, Math.PI * 2); c.closePath(); }
  }
  function drawThreeHead(c, K) {
    c.save();
    headFrame(c, K, 6);
    // the flower is on Yuki's left ear: the near ear when we see her left side (facing left), else the far ear
    const nearFlower = !!K.flipped;
    const eN = earPose(K, -1, nearFlower ? K.flop || 0 : 0, J(K, 'earTipL')), eF = earPose(K, 1, nearFlower ? 0 : K.flop || 0, J(K, 'earTipR'));
    earAt(c, 40, -62, eF.rot + 0.2, eF.bend, 0.92);    // far ear
    if (!nearFlower) { bow(c, 70, -62, 0.6, false, 0.7); sakura(c, 54, -72, 16, 0.3); }   // peeking out behind the head
    earAt(c, -34, -60, eN.rot - 0.22, eN.bend);         // near ear
    threeHeadPath(c, K); fillUnion(c, C.fur);
    c.save(); c.clip();
    shade(c, -96, 30, 56, 70, 0.7); shade(c, 92, 30, 36, 56, 0.35);
    noseBand(c, 40, 24, K, 64);
    c.restore();
    blushAt(c, -22, 34, K, 1 + 0.2 * (K.puff || 0)); blushAt(c, 84, 28, K, 0.72);
    c.save(); c.translate(0, 6); c.scale(0.92, 0.92); drawEye(c, 0, 0, -1, K); brow(c, 0, K, 1); c.restore();
    c.save(); c.translate(68, 6); c.scale(0.82, 0.84); drawEye(c, 0, 0, 1, K, 0.85); brow(c, 0, K, -1, 0.85); c.restore();
    drawNose(c, 44, 22, 0.1);
    c.save(); c.translate(44, 28); c.scale(0.9, 0.9); drawMouth(c, K); c.restore();
    if (nearFlower) { bow(c, -80, -54, 0.8, false, -0.7); sakura(c, -60, -70, 21, -0.2); }
    c.restore();
  }
  function cottonTail(c, x, y, r) {
    c.beginPath();
    for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2, px = x + Math.cos(a) * r * 0.55, py = y + Math.sin(a) * r * 0.55; c.moveTo(px + r * 0.5, py); c.arc(px, py, r * 0.5, 0, Math.PI * 2); }
    c.moveTo(x + r * 0.6, y); c.arc(x, y, r * 0.6, 0, Math.PI * 2);
    fillUnion(c, C.fur, 3.5);
    shade(c, x - r * 0.2, y + r * 0.35, r * 0.8, r * 0.6, 0.7);
  }
  function drawThree(c, K) {
    pivot(c, 0, -40, J(K, 'hips'));
    if (K.sit) c.translate(0, sitDrop(K));
    c.save(); pivot(c, -50, -42, J(K, 'tail1')); cottonTail(c, -66, -40, 20); c.restore();
    drawFeet(c, K, [-18, 30]);
    c.translate(0, -Math.abs(Math.sin(K.phase)) * 4 * K.walk);
    pivot(c, 0, -50, J(K, 'spine'));
    frontBodyPath(c); c.fillStyle = C.fur; c.fill();
    c.save(); c.clip();
    shade(c, -64, -46, 46, 56, 0.8); shade(c, 64, -50, 30, 50, 0.4); shade(c, 10, -12, 60, 18, 0.6);
    c.restore();
    frontBodyPath(c); c.lineWidth = 4; c.strokeStyle = C.line; c.stroke();
    collar(c, 20, 0.4);
    c.save(); pivot(c, 6, -112, J(K, 'neck')); drawThreeHead(c, K); c.restore();
    bow(c, 20, -98, 1.15);
    const tgt = K.pawPose === 'cheeks' ? [headPt(6, -14, 48), headPt(6, 66, 44)] : K.pawPose === 'yawn' ? [null, headPt(6, 46, 36)] : K.pawPose === 'chin' ? [null, headPt(6, 50, 54)]
      : K.pawPose === 'eyes' ? [headPt(6, 2, 8), headPt(6, 66, 8)] : [null, null];
    const sh = [[-46, -88], [54, -88]], inner = [[-36, -86], [44, -86]];
    [-1, 1].forEach((i, k) => {
      const P = toward(pawFrom(sh[k], i < 0 ? K.armL : K.armR, i, (k ? 30 : 34) + 0.6 * J(K, i < 0 ? 'reachL' : 'reachR'), 1.1, J(K, i < 0 ? 'elbowL' : 'elbowR')), tgt[k], K);
      armFrom(c, sh[k], inner[k], P, i);
      if (i > 0 && K.hold) K.hold.at(c, P[0], P[1] + 4);
    });
  }

  // ---------- SIDE profile (|f| >= 0.7), drawn facing right ----------
  // Head: a big PERFECTLY ROUND ball, about 60% of her height without ears.
  // No muzzle bump or beak at all: just a tiny pink nose and a small smile right on the front edge.
  function sideHeadPath(c, K) {
    // a round head, a little wider than tall, with only a tiny soft nub at the nose
    c.beginPath();
    c.ellipse(-9, -18, 85, 78, 0, 0, Math.PI * 2);
    c.closePath();
    c.moveTo(78, 8); c.ellipse(68, 8, 10, 9, 0, 0, Math.PI * 2); c.closePath();
    const p = K.puff || 0;
    if (p > 0) { c.moveTo(48 + 22 * p, 24); c.ellipse(48, 24, 22 * p, 18 * p, 0, 0, Math.PI * 2); c.closePath(); }
  }
  function sideMouth(c, K) {
    // small smile just under the nose, on the front edge of the head
    c.strokeStyle = C.line; c.lineWidth = 3; c.lineCap = 'round';
    const line = dip => { c.beginPath(); c.moveTo(74, 15); c.quadraticCurveTo(68, 20 + dip, 60, 18); c.stroke(); };
    switch (K.mouth) {
      case 'smile': line(3); break;
      case 'soft': line(2.5); break;
      case 'frown': case 'tinyfrown': case 'pout': case 'wobble': line(-3); break;
      case 'smirk': line(5.5); break;
      case 'set': line(0.5); break;
      case 'hmm': line(1.2); break;
      default: c.save(); c.translate(68, 14); c.scale(0.55, 0.55); drawMouth(c, K); c.restore();
    }
  }
  // the near arm in profile: a short curve drawn INSIDE the body outline (not a separate stick arm)
  function sideArm(c, S, P, E) {
    // a small rounded arm with a paw, growing from inside the body at S; only its own edges are outlined
    // (E: the elbow, when the arm bends there; the curve then passes through it)
    const [sx, sy] = S, [px, py] = P, dx = px - sx, dy = py - sy, d = Math.hypot(dx, dy) || 1;
    const mx = E ? 2 * E[0] - (sx + px) / 2 : (sx + px) / 2 + (-dy / d) * -6, my = E ? 2 * E[1] - (sy + py) / 2 : (sy + py) / 2 + (dx / d) * -6;
    const N = 10, A = [], B = [];
    for (let k = 0; k <= N; k++) {
      const u = k / N, v = 1 - u;
      const x = v * v * sx + 2 * v * u * mx + u * u * px, y = v * v * sy + 2 * v * u * my + u * u * py;
      const tx = 2 * v * (mx - sx) + 2 * u * (px - mx), ty = 2 * v * (my - sy) + 2 * u * (py - my), tn = Math.hypot(tx, ty) || 1;
      const w = 10.5 - 1.5 * u;
      A.push([x - ty / tn * w, y + tx / tn * w]); B.push([x + ty / tn * w, y - tx / tn * w]);
    }
    const a0 = Math.atan2(A[N][1] - py, A[N][0] - px);
    const outline = close => {
      c.beginPath(); c.moveTo(...A[0]); A.forEach(p => c.lineTo(...p));
      c.arc(px, py, 9, a0, a0 + Math.PI, true);
      [...B].reverse().forEach(p => c.lineTo(...p));
      if (close) c.closePath();
    };
    const g = c.createRadialGradient(px, py, 0, px, py, 13);
    g.addColorStop(0, C.pad); g.addColorStop(1, C.fur);
    outline(true); c.fillStyle = g; c.fill();
    outline(false); c.lineWidth = 3.5; c.strokeStyle = C.line; c.stroke();
  }
  function drawSideHead(c, K) {
    c.save();
    headFrame(c, K, 12);
    // the flower is on Yuki's left ear: near when we see her left side (facing left), else on the far ear
    const nearFlower = !!K.flipped;
    const eN = earPose(K, -1, nearFlower ? K.flop || 0 : 0, J(K, 'earTipL')), eF = earPose(K, -1, nearFlower ? 0 : K.flop || 0, J(K, 'earTipR'));
    // two long ears close together on top of the head, leaning slightly back; the far ear just in front of the near ear
    earAt(c, 4, -88, eF.rot - 0.02, eF.bend * 0.8, 0.98, 126);   // far ear
    if (!nearFlower) { bow(c, 22, -98, 0.6, false, 0.4); sakura(c, 6, -104, 16, 0.15); }
    earAt(c, -22, -86, eN.rot - 0.08, eN.bend, 1.2, 126);       // near ear
    sideHeadPath(c, K); fillUnion(c, C.fur);
    c.save(); c.clip();
    shade(c, -76, -4, 50, 76, 0.6); shade(c, 10, 50, 64, 20, 0.45);
    noseBand(c, 48, 10, K, 36);
    c.restore();
    blushAt(c, 24, 20, K, 1.3 + 0.2 * (K.puff || 0));   // a big soft blush behind and below the eye
    // the eye: an upright oval toward the front, at mid-height
    c.save(); c.translate(42, -1); c.scale(0.8, 0.74);
    drawEye(c, 0, 0, 1, K, 0.9, true, 1);
    brow(c, 0, K, 1, 0.9);
    c.restore();
    drawNose(c, 75, 4, -0.2);
    sideMouth(c, K);
    if (nearFlower) { bow(c, -46, -70, 0.85, false, -0.7); sakura(c, -26, -86, 23, -0.2); }
    c.restore();
  }
  // Body: a small egg shape, clearly smaller than the head
  function sideBodyPath(c) {
    path(c, () => {
      c.moveTo(-58, -24);
      c.bezierCurveTo(-72, -60, -58, -114, 0, -118);
      c.bezierCurveTo(40, -118, 64, -94, 64, -60);
      c.bezierCurveTo(64, -24, 42, -6, 4, -4);
      c.bezierCurveTo(-24, -4, -48, -8, -58, -24);
    });
  }
  function drawSide(c, K) {
    pivot(c, -4, -40, J(K, 'hips'));
    if (K.sit) c.translate(0, sitDrop(K));
    // round cotton tail at the lower back
    c.save(); pivot(c, -54, -40, J(K, 'tail1')); cottonTail(c, -70, -38, 21); c.restore();
    // small feet with one slightly forward
    [[-14, Math.PI, true], [14, 0, false]].forEach(([x0, off, far]) => {
      const ph = K.phase + off, lx = x0 + Math.sin(ph) * 8 * K.walk + 10 * (K.sit || 0), lift = Math.max(0, Math.cos(ph)) * 5 * K.walk + sitDrop(K);
      c.save(); pivot(c, x0, -46, -J(K, far ? 'hipL' : 'hipR'));
      path(c, () => c.ellipse(lx + 4, -8 - lift, 20, 10, 0, 0, Math.PI * 2)); fillStroke(c, C.fur);
      if (far) { c.fillStyle = 'rgba(200,150,160,0.25)'; c.fill(); }
      c.restore();
    });
    c.translate(0, -Math.abs(Math.sin(K.phase)) * 4 * K.walk);
    pivot(c, -4, -50, J(K, 'spine'));
    sideBodyPath(c); c.fillStyle = C.fur; c.fill();
    c.save(); c.clip(); shade(c, -44, -46, 34, 48, 0.7); shade(c, 8, -8, 50, 14, 0.5); c.restore();
    sideBodyPath(c); c.lineWidth = 4; c.strokeStyle = C.line; c.stroke();
    // No neck: the head sits directly on the body; a small bow at the throat
    collar(c, 26, 1);
    c.save(); pivot(c, 12, -112, J(K, 'neck')); drawSideHead(c, K); c.restore();
    // the arm is a short curve drawn INSIDE the body outline hanging at the front
    const S = [22, -92], ang = K.armR, a = ang < 0 ? 0.7 - ang * 0.35 : ang + 0.15, len = 44 + 0.6 * J(K, 'reachR'), el = J(K, 'elbowR');
    const E = el ? [S[0] + len / 2 * Math.sin(a), S[1] + len / 2 * Math.cos(a)] : null;
    const P = el ? [E[0] + len / 2 * Math.sin(a + el), E[1] + len / 2 * Math.cos(a + el)] : [S[0] + len * Math.sin(a), S[1] + len * Math.cos(a)];
    const tgt = K.pawPose === 'cheeks' ? headPt(4, 56, 38) : K.pawPose === 'yawn' ? headPt(4, 74, 38) : K.pawPose === 'chin' ? headPt(4, 50, 52) : K.pawPose === 'eyes' ? headPt(4, 44, 2) : null;
    bow(c, 44, -100, 0.95, true, 0.25);
    const PP = toward(P, tgt, K);
    sideArm(c, [S[0] - 6, S[1] + 2], PP, tgt ? null : E);
    if (K.hold) K.hold.at(c, PP[0], PP[1] + 4);
  }

  // ---------- BACK view (turned away) ----------
  // Like the sheet's back view: the round back of the head with the long ears seen from behind (white, no pink), the
  // flower's bow peeking out on her left (the viewer's left, now), a round back with the cotton tail in the middle,
  // little paws at the sides and the feet. Seen from behind, her left and right parts swap places.
  const backOf = K => {
    const r = K.rig;
    return { ...K, armL: K.armR, armR: K.armL, earL: K.earR, earR: K.earL, lookX: 0,
      rig: r && { ...r, elbowL: r.elbowR, elbowR: r.elbowL, hipL: r.hipR, hipR: r.hipL, earTipL: r.earTipR, earTipR: r.earTipL } };
  };
  function drawBack(c, K) {
    const B = backOf(K);
    pivot(c, 0, -40, J(B, 'hips'));
    if (K.sit) c.translate(0, sitDrop(K));
    drawFeet(c, B, [-24, 24]);
    c.translate(0, -Math.abs(Math.sin(K.phase)) * 4 * K.walk);
    pivot(c, 0, -50, J(B, 'spine'));
    // the paws at the sides, behind the body's edges
    [-1, 1].forEach(i => { const S = [i * 48, -88]; armFrom(c, S, [i * 36, -86], pawFrom(S, i < 0 ? B.armL : B.armR, i, 34, 1.1, J(B, i < 0 ? 'elbowL' : 'elbowR')), i); });
    frontBodyPath(c); c.fillStyle = C.fur; c.fill();
    c.save(); c.clip();
    shade(c, -62, -46, 40, 56, 0.7); shade(c, 62, -46, 40, 56, 0.7); shade(c, 0, -104, 60, 18, 0.5);
    c.restore();
    frontBodyPath(c); c.lineWidth = 4; c.strokeStyle = C.line; c.stroke();
    c.save(); pivot(c, 0, -34, J(B, 'tail1')); cottonTail(c, 0, -34, 20); c.restore();
    c.save(); pivot(c, 0, -112, J(B, 'neck'));
    headFrame(c, { ...B, tilt: -K.tilt }, 0);
    // the flower is on her left ear, the viewer's left from behind: only its bow peeks out past the head
    const eL = earPose(B, -1, B.flop || 0, J(B, 'earTipL')), eR = earPose(B, 1, 0, J(B, 'earTipR'));
    earAt(c, -36, -60, eL.rot, eL.bend, 1, 140, true);
    earAt(c, 36, -60, eR.rot, eR.bend, 1, 140, true);
    bow(c, -80, -46, 0.8, false, -0.7); sakura(c, -62, -58, 21, -0.2);
    frontHeadPath(c, { ...B, puff: 0 }); fillUnion(c, C.fur);
    c.save(); c.clip(); shade(c, -90, 30, 50, 60, 0.6); shade(c, 90, 30, 50, 60, 0.6); shade(c, 0, 66, 80, 22, 0.5); c.restore();
    c.restore();
  }

  // ---------- views ----------
  const VIEWS = { front: drawFront, three: drawThree, side: drawSide, back: drawBack };
  const viewAt = a => (a < 0.3 ? 'front' : a < 0.7 ? 'three' : 'side');
  // Three-quarter and side views are drawn facing right; facing left mirrors them.
  // `flipped` tells the turned views we see Yuki's left side, so the flower on her left ear is on the near side
  const mirror = K => ({ ...K, f: -K.f, lookX: -K.lookX, tilt: -K.tilt, earL: K.earR, earR: K.earL, flipped: true,
    rig: K.rig && { ...K.rig, earTipL: K.rig.earTipR, earTipR: K.rig.earTipL } });

  function drawView(c, K, view) {
    c.save();
    c.translate(K.x, K.y - K.h);
    c.scale(K.s * K.sx, K.s * K.sy);
    c.lineJoin = 'round'; c.lineCap = 'round';
    // contact shadow
    c.save(); c.translate(0, K.h / (K.s * K.sy));
    c.fillStyle = 'rgba(30,40,20,0.22)'; c.beginPath(); c.ellipse(0, 0, 66 * (1 - K.h / 260) * (1 + 1.3 * Math.abs(Math.sin(K.roll || 0))), 11 * (1 - K.h / 260), 0, 0, Math.PI * 2); c.fill();
    c.restore();
    // lying down (K.roll, radians): the whole body tips over about a point just above the feet, onto the ground
    if (K.roll) pivot(c, 0, -86, K.roll);   // (high enough that the big head rests on the ground, not in it)
    // scared leans away from where Yuki is facing; proud stands a little taller
    if (K.lean) c.rotate(-(K.f < 0 ? -1 : 1) * 0.07 * K.lean);
    if (K.lift) c.scale(1 + 0.015 * K.lift, 1 + 0.025 * K.lift);
    if (view !== 'front' && view !== 'back' && K.f < 0) { c.scale(-1, 1); K = mirror(K); }
    VIEWS[view](c, K);
    c.restore();
  }

  // Turning goes through solid poses, never a cross-fade: front → three-quarter → side, and on to the back view when
  // turning away (K.away 0..1 continues the turn past the side: half-way is the side, 0.65 and more the back). The
  // film adds a tiny squash and a blink at each switch.
  const turnOf = K => Math.max(Math.abs(K.f), 2 * (K.away || 0));
  function drawYuki(c, K) {
    const e = turnOf(K);
    if (e >= 1.35) return drawView(c, K, 'back');
    // turning away from the front: on the way to the back, the view turns with it (the side it was facing)
    const a = Math.abs(K.f), V = e > a ? { ...K, f: (K.f < 0 ? -1 : 1) * Math.min(e, 0.9) } : K;
    drawView(c, V, viewAt(Math.min(e, 0.9)));
  }

  root.YukiCharacter = { drawYuki, C };
})(this);
