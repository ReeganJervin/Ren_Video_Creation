// Ren — the fixed character, drawn to match reference/ren-sheet.png. Proportions, palette and features never change between videos.
// drawRen(ctx, K) draws Ren with feet at (K.x, K.y); K holds pose/expression values.
(function (root) {
  const C = {
    line: '#4a2616', fur: '#f39a4a', furL: '#f9b46e', furD: '#e2802f', cream: '#fff4e4', tip: '#4f2716',
    paw: '#5b3020', pink: '#f9c9c1', blush: '255,128,138', eye: '#2e1408', irisT: '#5c2c10', irisB: '#c47c38',
    scarf: '#6c2232', scarfL: '#86344a', scarfD: '#4a1422', petal: '#ffe6df', petalC: '#f5c542', mouth: '#8c2a2e', tongue: '#ff8f9a',
  };
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  function path(c, fn) { c.beginPath(); fn(); c.closePath(); }
  function fillStroke(c, fill, lw = 4) { c.fillStyle = fill; c.fill(); c.lineWidth = lw; c.strokeStyle = C.line; c.stroke(); }
  // Outline a union of sub-paths: a double-width stroke under the fill leaves one clean outer outline.
  function fillUnion(c, fill, lw = 4) { c.lineWidth = lw * 2; c.strokeStyle = C.line; c.stroke(); c.fillStyle = fill; c.fill(); }
  // Fur edge: from the current point through each point in pts as little swept tufts (tips point outward).
  // `side` is +1 when the outside of the shape is on the left of the drawing direction, -1 otherwise.
  function tufts(c, from, pts, depth, side = 1) {
    let [ax, ay] = from;
    for (const [bx, by] of pts) {
      const dx = bx - ax, dy = by - ay, n = Math.hypot(dx, dy) || 1;
      c.quadraticCurveTo(ax + dx * 0.4 - side * dy / n * depth, ay + dy * 0.4 + side * dx / n * depth, bx, by);
      ax = bx; ay = by;
    }
  }

  // ---------- tail ----------
  const cubic = (a, b, d, e, u) => { const v = 1 - u; return v * v * v * a + 3 * v * v * u * b + 3 * v * u * u * d + u * u * u * e; };
  const spine = u => ({ x: cubic(-6, 70, 128, 70, u), y: cubic(-2, 16, -56, -168, u) });
  const tailW = u => 46 * Math.pow(Math.sin(Math.PI * (0.1 + 0.9 * u)), 0.72) + 6 * (1 - u);
  function tailEdges() {
    const outer = [], inner = [];
    for (let i = 0; i <= 14; i++) {
      const u = i / 14, p = spine(u), q = spine(Math.min(1, u + 0.01)), r = spine(Math.max(0, u - 0.01));
      const tx = q.x - r.x, ty = q.y - r.y, n = Math.hypot(tx, ty) || 1, nx = ty / n, ny = -tx / n, w = tailW(u);
      outer.push([p.x + nx * w, p.y + ny * w]); inner.push([p.x - nx * w, p.y - ny * w]);
    }
    return { outer, inner };
  }
  const TAIL = tailEdges();
  function tailPath(c) {
    const { outer, inner } = TAIL;
    c.beginPath(); c.moveTo(...inner[0]); c.lineTo(...outer[0]);
    tufts(c, outer[0], outer.slice(1), 7, -1);
    tufts(c, outer[outer.length - 1], inner.slice(0, -1).reverse(), 6, -1);
    c.closePath();
  }
  // Tail rooted at (x, -50); sx < 0 points it to the left, |sx| < 1 foreshortens it.
  function drawTail(c, K, x, sx) {
    c.save();
    c.translate(x, -50);
    c.scale(sx * 0.86, 0.86);
    c.rotate(0.12 + K.tail);
    tailPath(c); fillUnion(c, C.fur);
    c.save(); c.clip();
    // soft shade along the underside
    c.strokeStyle = C.furD; c.globalAlpha = 0.45; c.lineWidth = 26; c.beginPath();
    for (let i = 0; i <= 10; i++) { const p = spine(i / 14); const [ix, iy] = TAIL.inner[i]; c.lineTo(ix * 0.7 + p.x * 0.3, iy * 0.7 + p.y * 0.3); }
    c.stroke(); c.globalAlpha = 1;
    // white tip with a jagged fur edge
    const k = 10, a = TAIL.inner[k], b = TAIL.outer[k], m = spine(k / 14), d = spine(1);
    const ux = d.x - m.x, uy = d.y - m.y;
    c.beginPath(); c.moveTo(a[0] - (b[0] - a[0]) * 0.3, a[1] - (b[1] - a[1]) * 0.3);
    const cut = [];
    for (let j = 1; j <= 6; j++) {
      const s = j / 6, jag = (j % 2 ? 1 : -0.6) * 9;
      cut.push([a[0] + (b[0] - a[0]) * s - ux / 60 * jag, a[1] + (b[1] - a[1]) * s - uy / 60 * jag]);
    }
    tufts(c, [a[0], a[1]], cut, 4);
    c.lineTo(b[0] + (b[0] - a[0]) * 0.3, b[1] + (b[1] - a[1]) * 0.3);
    c.lineTo(b[0] + ux * 3, b[1] + uy * 3); c.lineTo(a[0] + ux * 3, a[1] + uy * 3); c.closePath();
    c.fillStyle = C.cream; c.fill();
    c.restore();
    c.restore();
  }

  // ---------- legs + body ----------
  function drawLegs(c, K) {
    const dir = K.f >= 0 ? 1 : -1;
    [-1, 1].forEach(i => {
      const ph = i < 0 ? K.phase : K.phase + Math.PI;
      const lx = i * 23 + K.f * 6 + Math.sin(ph) * 13 * K.walk * dir;
      const lift = Math.max(0, Math.cos(ph)) * 9 * K.walk;
      // dark brown socks fading into the orange
      const g = c.createLinearGradient(0, -66 - lift, 0, -lift);
      g.addColorStop(0, C.fur); g.addColorStop(0.3, C.fur); g.addColorStop(0.62, C.paw); g.addColorStop(1, C.paw);
      c.beginPath(); c.roundRect(lx - 16, -66 - lift, 32, 66, [14, 14, 13, 13]);
      fillStroke(c, g);
      c.strokeStyle = 'rgba(255,220,190,0.35)'; c.lineWidth = 2;
      [-5, 5].forEach(o => { c.beginPath(); c.moveTo(lx + o, -lift - 3); c.lineTo(lx + o, -lift - 10); c.stroke(); });
    });
  }

  function bodyPath(c) {
    path(c, () => {
      c.moveTo(-50, -34);
      c.bezierCurveTo(-66, -82, -42, -146, 0, -148);
      c.bezierCurveTo(42, -146, 66, -82, 50, -34);
      c.bezierCurveTo(44, -8, -44, -8, -50, -34);
    });
  }
  function drawBody(c, K) {
    bodyPath(c); c.fillStyle = C.fur; c.fill();
    c.save(); c.clip();
    c.fillStyle = C.furD; c.globalAlpha = 0.3;
    c.beginPath(); c.ellipse(-K.f * 30 + 44, -70, 26, 70, 0, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 1; c.fillStyle = C.cream;
    // fluffy cream chest bib with a jagged fur edge
    const bx = K.f * 14;
    c.beginPath();
    c.moveTo(bx - 30, -58);
    c.bezierCurveTo(bx - 34, -84, bx - 36, -104, bx - 32, -118);
    tufts(c, [bx - 32, -118], [[bx - 40, -110], [bx - 26, -124], [bx - 14, -122], [bx - 4, -134], [bx + 8, -124], [bx + 20, -132], [bx + 28, -120], [bx + 40, -112], [bx + 32, -104]], 5);
    c.bezierCurveTo(bx + 36, -88, bx + 34, -74, bx + 30, -58);
    c.bezierCurveTo(bx + 28, -28, bx - 28, -28, bx - 30, -58);
    c.fill();
    c.restore();
    bodyPath(c); c.lineWidth = 4; c.strokeStyle = C.line; c.stroke();
  }

  // ---------- scarf ----------
  function drawFlower(c, x, y, r) {
    c.save(); c.translate(x, y);
    c.fillStyle = C.petal; c.strokeStyle = C.line; c.lineWidth = 1.6;
    for (let k = 0; k < 5; k++) {
      const a = k * Math.PI * 2 / 5 - Math.PI / 2;
      c.beginPath(); c.ellipse(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9, r * 0.62, r * 0.48, a, 0, Math.PI * 2); c.fill(); c.stroke();
    }
    c.beginPath(); c.arc(0, 0, r * 0.42, 0, Math.PI * 2); c.fillStyle = C.petalC; c.fill();
    c.restore();
  }

  // farKnot: the knot is on the far side of the neck (three-quarter view seen from Ren's left) and only peeks out
  function drawScarf(c, K, farKnot = false) {
    const cx = K.f * 8, bx = K.f * 18, kx = cx - 46;
    if (farKnot) return drawScarfFarKnot(c, cx, bx);
    // two hanging ends below the knot at the side
    path(c, () => { c.moveTo(kx - 2, -140); c.quadraticCurveTo(kx - 22, -124, kx - 28, -106); c.lineTo(kx - 16, -110); c.lineTo(kx - 10, -100); c.quadraticCurveTo(kx - 4, -122, kx + 6, -134); });
    fillStroke(c, C.scarfD, 3.5);
    path(c, () => { c.moveTo(kx + 2, -138); c.quadraticCurveTo(kx - 4, -118, kx + 2, -102); c.lineTo(kx + 10, -110); c.lineTo(kx + 18, -104); c.quadraticCurveTo(kx + 14, -124, kx + 14, -136); });
    fillStroke(c, C.scarf, 3.5);
    // wrapped band
    path(c, () => c.ellipse(cx, -140, 54, 16, 0, 0, Math.PI * 2));
    const g = c.createLinearGradient(0, -156, 0, -124);
    g.addColorStop(0, C.scarfL); g.addColorStop(0.55, C.scarf); g.addColorStop(1, C.scarfD);
    fillStroke(c, g);
    // triangle bib in front
    path(c, () => {
      c.moveTo(bx - 38, -138);
      c.quadraticCurveTo(bx - 14, -106, bx + 2, -96);
      c.quadraticCurveTo(bx + 16, -106, bx + 38, -138);
    });
    fillStroke(c, C.scarf);
    c.strokeStyle = C.scarfD; c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(bx - 20, -132); c.quadraticCurveTo(bx - 8, -114, bx + 1, -104); c.stroke();
    c.beginPath(); c.moveTo(bx + 18, -134); c.quadraticCurveTo(bx + 12, -126, bx + 6, -120); c.stroke();
    // knot
    path(c, () => c.ellipse(kx + 2, -140, 10, 8, 0.3, 0, Math.PI * 2));
    fillStroke(c, C.scarf, 3);
    drawFlower(c, bx + 10, -122, 7.5);
  }

  // the scarf with its knot on the far side: the knot and the tips of its ends peek out behind the band
  function drawScarfFarKnot(c, cx, bx) {
    const kx = cx + 40;
    path(c, () => { c.moveTo(kx - 6, -140); c.quadraticCurveTo(kx + 8, -124, kx + 12, -112); c.lineTo(kx + 18, -118); c.quadraticCurveTo(kx + 12, -130, kx + 6, -140); });
    fillStroke(c, C.scarfD, 3);
    path(c, () => c.ellipse(kx + 2, -148, 9, 7, 0.3, 0, Math.PI * 2)); fillStroke(c, C.scarfD, 3);
    path(c, () => c.ellipse(cx, -140, 54, 16, 0, 0, Math.PI * 2));
    const g = c.createLinearGradient(0, -156, 0, -124);
    g.addColorStop(0, C.scarfL); g.addColorStop(0.55, C.scarf); g.addColorStop(1, C.scarfD);
    fillStroke(c, g);
    path(c, () => { c.moveTo(bx - 38, -138); c.quadraticCurveTo(bx - 14, -106, bx + 2, -96); c.quadraticCurveTo(bx + 16, -106, bx + 38, -138); });
    fillStroke(c, C.scarf);
    c.strokeStyle = C.scarfD; c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(bx - 20, -132); c.quadraticCurveTo(bx - 8, -114, bx + 1, -104); c.stroke();
    c.beginPath(); c.moveTo(bx + 18, -134); c.quadraticCurveTo(bx + 12, -126, bx + 6, -120); c.stroke();
    drawFlower(c, bx + 10, -122, 7.5);
  }

  // ---------- head parts shared by every view ----------
  // One ear with its base at (x, y), turned by rot; sx/sy squeeze it when seen at an angle.
  function earAt(c, x, y, rot, sx = 1, sy = 1) {
    c.save();
    c.translate(x, y); c.rotate(rot); c.scale(sx, sy);
    const ear = () => path(c, () => { c.moveTo(-37, 14); c.bezierCurveTo(-39, -40, -20, -84, 2, -114); c.bezierCurveTo(24, -84, 40, -40, 37, 14); });
    // dark brown tip blending softly into the orange
    const g = c.createLinearGradient(0, -52, 0, -100);
    g.addColorStop(0, C.fur); g.addColorStop(0.45, '#b4602a'); g.addColorStop(1, C.tip);
    ear(); fillStroke(c, g);
    path(c, () => { c.moveTo(-22, 10); c.bezierCurveTo(-22, -26, -12, -54, 1, -76); c.bezierCurveTo(14, -54, 23, -26, 22, 10); });
    const pg = c.createLinearGradient(0, -76, 0, 10);
    pg.addColorStop(0, '#f1b1ad'); pg.addColorStop(1, C.pink);
    c.fillStyle = pg; c.fill();
    // cream fluff at the base
    c.beginPath(); c.moveTo(-24, -6);
    tufts(c, [-24, -6], [[-18, -36], [-9, -26], [-2, -50], [5, -30], [12, -44], [15, -26], [24, -6]], 4, -1);
    c.lineTo(24, 16); c.lineTo(-24, 16);
    c.closePath(); c.fillStyle = C.cream; c.fill();
    c.restore();
  }

  // eyes: 'normal' | 'happy' (^ arcs) | 'wide' | 'sleepy' (closed) | 'shy' (glossy) | 'playful' (wink, for Yuki)
  //       | 'sparkle' (excited) | 'proud' (half closed) | 'worried' | 'scared' (small pupils) | 'determined' | 'teary'
  // `squeeze` narrows an eye seen at an angle.
  // `bold` draws closed eyes thicker and longer so they read at video size (profile)
  // `inward`: the side of the eye toward the nose (+1 right, -1 left)
  function drawEye(c, ex, ey, i, K, squeeze = 1, bold = false, inward = -i) {
    eyeShape(c, ex, ey, i, K, squeeze, bold, inward);
    if (K.tears > 0.02) tear(c, ex, ey, inward, K, squeeze);
  }
  // upper lids [y at the nose side, y at the outer side] (the eye is 26 tall above its middle): proud is half closed
  // and level, determined a little, lower toward the nose (steady); worried and teary a little, higher toward the nose
  const LIDS = { proud: [-9, -8], determined: [-8, -15], worried: [-21, -13], teary: [-19, -10] };
  // lower lids pushed up by the cheeks (proud: a confident, pleased look): the middle of the lid's top edge
  const LOWER = { proud: 16 };
  // a 4-point sparkle (excited eyes)
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
    const a = clamp(K.tears), o = -inward, x0 = o * 9, y0 = 21, L = 26 * a;
    const cx = x0 + o * 11, cy = y0 + L * 0.45, x1 = x0 + o * 8, y1 = y0 + L;
    c.save(); c.translate(ex, ey); c.scale(squeeze, 1); c.globalAlpha *= a; c.lineCap = 'round';
    const track = () => { c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(cx, cy, x1, y1); };
    track(); c.strokeStyle = 'rgba(80,140,195,0.45)'; c.lineWidth = 7; c.stroke();
    track(); c.strokeStyle = 'rgba(190,228,252,0.7)'; c.lineWidth = 4.5; c.stroke();
    c.beginPath(); c.moveTo(x0 - 1, y0 + 4); c.quadraticCurveTo(cx - 1.5, cy, x1 - 1.5, y1 - 3);
    c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 1.4; c.stroke();
    // the drop: pointed at the top, round below
    const r = 5 * (0.9 + 0.1 * Math.sin((K.t || 0) * 2.4 + (inward > 0 ? 1 : 0))), dx = x1, dy = y1 + r * 0.9;
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
    c.scale(squeeze * (1 + 0.1 * K.wide), 1 + 0.12 * K.wide);
    c.strokeStyle = C.line; c.lineCap = 'round';
    if (K.eyes === 'happy' || (K.eyes === 'playful' && i > 0)) {
      c.lineWidth = 5 / squeeze; c.beginPath(); c.moveTo(-17, 7); c.quadraticCurveTo(0, -15, 17, 7); c.stroke();
      c.restore(); return;
    }
    const open = 1 - K.blink;
    if (K.eyes === 'sleepy' || open < 0.15) {
      const L = bold ? 21 : 17;
      c.lineWidth = (bold ? 6.5 : 4.5) / squeeze; c.beginPath(); c.moveTo(-L, 2); c.quadraticCurveTo(0, bold ? 15 : 13, L, 2); c.stroke();
      if (K.eyes === 'sleepy') { c.lineWidth = bold ? 4.5 : 3; c.beginPath(); c.moveTo(i * (L - 1), 3); c.lineTo(i * (L + 6), -1); c.stroke(); }
      c.restore(); return;
    }
    c.scale(1, open);
    const lx = K.lookX * 4.5, ly = K.lookY * 5;
    if (K.eyes === 'scared') {
      // scared: the white of the eye shows all round a smaller iris, which quivers a little (suspense, never horror)
      const jx = lx * 0.8 + Math.sin((K.t || 0) * 31) * 0.8;
      c.beginPath(); c.ellipse(0, 0, 19, 26, 0, 0, Math.PI * 2); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 3.5; c.stroke();
      const g = c.createLinearGradient(0, -10 + ly, 0, 14 + ly);
      g.addColorStop(0, C.irisT); g.addColorStop(1, C.irisB);
      c.beginPath(); c.ellipse(jx, 3 + ly, 10, 12.5, 0, 0, Math.PI * 2); c.fillStyle = g; c.fill();
      c.beginPath(); c.ellipse(jx, 2 + ly, 5, 6, 0, 0, Math.PI * 2); c.fillStyle = C.eye; c.fill();
      // a clear shine and a small second glint, so the eyes stay alive
      c.fillStyle = '#fff'; c.beginPath(); c.arc(-3.5 + jx, -4.5 + ly, 4.6, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(3.5 + jx, 5 + ly, 1.9, 0, Math.PI * 2); c.fill();
      c.restore(); return;
    }
    c.beginPath(); c.ellipse(0, 0, 19, 26, 0, 0, Math.PI * 2); c.fillStyle = C.eye; c.fill();
    c.save(); c.clip();
    // warm brown iris, lighter at the bottom
    const g = c.createLinearGradient(0, -14 + ly, 0, 26 + ly);
    g.addColorStop(0, C.irisT); g.addColorStop(1, C.irisB);
    c.beginPath(); c.ellipse(lx * 0.8, 3 + ly, 16, 20, 0, 0, Math.PI * 2); c.fillStyle = g; c.fill();
    c.beginPath(); c.ellipse(lx * 0.9, 1 + ly, 8.5, 11, 0, 0, Math.PI * 2); c.fillStyle = C.eye; c.fill();
    c.restore();
    c.fillStyle = '#fff';
    if (K.eyes === 'sparkle') {
      // excited: star-shaped sparkles instead of round highlights
      star(c, -5 + lx * 0.6, -9 + ly * 0.6, 13); star(c, 7 + lx, 10 + ly, 6);
      c.beginPath(); c.arc(8 + lx, -11 + ly, 2.6, 0, Math.PI * 2); c.fill();
    } else {
      // (a low lid would cut the big highlight in half: then only the small glint below the lid shows)
      if (!LIDS[K.eyes] || Math.max(...LIDS[K.eyes]) <= -12) { c.beginPath(); c.arc(-6 + lx * 0.6, -10 + ly * 0.6, 9.5 + K.wide * 1.2, 0, Math.PI * 2); c.fill(); }
      c.beginPath(); c.arc(7 + lx, 10 + ly, 3.8, 0, Math.PI * 2); c.fill();
      if (K.wide > 0.3) { c.beginPath(); c.arc(8 + lx, -10 + ly, 2.6, 0, Math.PI * 2); c.fill(); }
    }
    if (K.eyes === 'shy') {
      // glossy, a little teary: a bright rim along the bottom and an extra sparkle
      c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 2.6;
      c.beginPath(); c.ellipse(0, 0, 15, 21, 0, 0.25 * Math.PI, 0.75 * Math.PI); c.stroke();
      c.beginPath(); c.arc(-8 + lx, 4 + ly, 2.4, 0, Math.PI * 2); c.fill();
    }
    if (K.eyes === 'teary') {
      // wet eyes: water pooling along the lower lid, a bright wet rim and extra glints
      c.save(); c.beginPath(); c.ellipse(0, 0, 19, 26, 0, 0, Math.PI * 2); c.clip();
      c.fillStyle = 'rgba(178,222,250,0.5)'; c.beginPath(); c.moveTo(-21, 12); c.quadraticCurveTo(-9, 7, 0, 11); c.quadraticCurveTo(9, 15, 21, 10); c.lineTo(21, 30); c.lineTo(-21, 30); c.fill();
      c.restore();
      c.strokeStyle = 'rgba(255,255,255,0.95)'; c.lineWidth = 3;
      c.beginPath(); c.ellipse(0, 0, 15.5, 21.5, 0, 0.18 * Math.PI, 0.82 * Math.PI); c.stroke();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(-9 + lx, 5 + ly, 2.8, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(4 + lx, -2 + ly, 2, 0, Math.PI * 2); c.fill();
    }
    const lid = LIDS[K.eyes];
    if (lid) {
      // the upper lid, in fur colour, with its edge line; a small glint stays below it so the eye keeps its life
      const [yi, yo] = lid, xi = inward * 22, xo = -inward * 22, ym = (yi + yo) / 2 - (K.eyes === 'proud' ? 5 : 2);
      // (clipped a little outside the eye, so the lid also covers the eye's soft edge)
      c.save(); c.beginPath(); c.ellipse(0, 0, 20.5, 27.5, 0, 0, Math.PI * 2); c.clip();
      c.beginPath(); c.moveTo(xo, -30); c.lineTo(xi, -30); c.lineTo(xi, yi); c.quadraticCurveTo(0, ym, xo, yo); c.closePath();
      c.fillStyle = C.fur; c.fill();
      const lo = LOWER[K.eyes];
      if (lo !== undefined) { c.beginPath(); c.moveTo(-24, 32); c.lineTo(-24, lo + 8); c.quadraticCurveTo(0, lo - 8, 24, lo + 8); c.lineTo(24, 32); c.closePath(); c.fill(); }
      c.restore();
      c.save(); c.beginPath(); c.ellipse(0, 0, 19, 26, 0, 0, Math.PI * 2); c.clip();
      c.beginPath(); c.moveTo(xi, yi); c.quadraticCurveTo(0, ym, xo, yo); c.lineWidth = 7; c.strokeStyle = C.line; c.stroke();
      if (lo !== undefined) { c.beginPath(); c.moveTo(-22, lo + 9); c.quadraticCurveTo(0, lo - 8, 22, lo + 9); c.lineWidth = 3.5; c.stroke(); }
      c.restore();
      if (Math.max(yi, yo) > -12) { c.fillStyle = '#fff'; c.beginPath(); c.arc(-5 + lx * 0.6, Math.max(yi, yo) + 7 + ly * 0.4, 4, 0, Math.PI * 2); c.fill(); }
    }
    c.restore();
  }

  function drawMouth(c, K) {
    c.strokeStyle = C.line; c.lineWidth = 3; c.lineCap = 'round';
    const omega = () => { c.beginPath(); c.moveTo(-10, 1); c.quadraticCurveTo(-5, 8, 0, 1); c.quadraticCurveTo(5, 8, 10, 1); c.stroke(); };
    const openShape = a => {
      path(c, () => { c.moveTo(-11, 0); c.quadraticCurveTo(0, 2, 11, 0); c.quadraticCurveTo(8, 18 * a, 0, 19 * a); c.quadraticCurveTo(-8, 18 * a, -11, 0); });
      c.fillStyle = C.mouth; c.fill(); c.stroke();
      if (a > 0.45) { c.save(); c.clip(); c.beginPath(); c.ellipse(0, 15 * a, 7, 5 * a, 0, 0, Math.PI * 2); c.fillStyle = C.tongue; c.fill(); c.restore(); }
    };
    // talking in a sad, shy or pouty mood: the open mouth turns down at the corners (it never looks like a smile)
    const downShape = (a, w) => {
      path(c, () => { c.moveTo(-w, 8); c.quadraticCurveTo(0, -1, w, 8); c.quadraticCurveTo(w * 0.6, 8 + 13 * a, 0, 8 + 13 * a); c.quadraticCurveTo(-w * 0.6, 8 + 13 * a, -w, 8); });
      c.fillStyle = C.mouth; c.fill(); c.stroke();
    };
    // talking while shy, sad or worried: small and flat, a little wobbly, corners down; it opens only a little
    // (a round "o" is for surprised)
    const worried = (a, w) => {
      const lo = 7 + 5 * a;
      path(c, () => {
        c.moveTo(-w, 7 + 3); c.quadraticCurveTo(-w * 0.55, 7 - 1, -w * 0.15, 7 + 0.5); c.quadraticCurveTo(w * 0.25, 7 - 1.5, w, 7 + 3);
        c.quadraticCurveTo(w * 0.4, lo + 1, 0, lo); c.quadraticCurveTo(-w * 0.4, lo + 1, -w, 7 + 3);
      });
      c.fillStyle = C.mouth; c.fill(); c.stroke();
    };
    // laughing: wide open, the tongue showing
    const laughShape = a => {
      path(c, () => { c.moveTo(-14, -1); c.quadraticCurveTo(0, 3, 14, -1); c.quadraticCurveTo(11, 24 * a, 0, 25 * a); c.quadraticCurveTo(-11, 24 * a, -14, -1); });
      c.fillStyle = C.mouth; c.fill(); c.stroke();
      c.save(); c.clip(); c.beginPath(); c.ellipse(0, 21 * a, 9, 6 * a, 0, 0, Math.PI * 2); c.fillStyle = C.tongue; c.fill(); c.restore();
    };
    // determined, talking: a firm, square-ish opening (not a smile)
    const firmShape = a => {
      path(c, () => { c.moveTo(-8, 4); c.lineTo(8, 4); c.quadraticCurveTo(8, 4 + 11 * a, 5, 4 + 11 * a); c.lineTo(-5, 4 + 11 * a); c.quadraticCurveTo(-8, 4 + 11 * a, -8, 4); });
      c.fillStyle = C.mouth; c.fill(); c.stroke();
    };
    // a small wavy line with the corners down (worried, crying); it trembles a little
    const wobble = (w, k = 1) => {
      const q = Math.sin((K.t || 0) * 9) * 0.8 * k;
      c.beginPath(); c.moveTo(-w, 8); c.quadraticCurveTo(-w * 0.6, 4 + q, -w * 0.25, 6); c.quadraticCurveTo(0, 8 - q, w * 0.25, 6); c.quadraticCurveTo(w * 0.6, 4 + q, w, 8); c.stroke();
    };
    switch (K.mouth) {
      case 'open': openShape(1); break;
      case 'talk':
        if (/frown|wobble/.test(K.moodMouth || '')) worried(K.talk, K.moodMouth === 'tinyfrown' ? 6 : 8);
        else if (K.moodMouth === 'gasp') worried(0.4 + 0.6 * K.talk, 8);
        else if (K.moodMouth === 'o') { c.beginPath(); c.ellipse(0, 9, 6 * (0.8 + 0.2 * K.talk), 8 * (0.55 + 0.45 * K.talk), 0, 0, Math.PI * 2); c.fillStyle = C.mouth; c.fill(); c.stroke(); }   // surprised: a round o
        else if (K.moodMouth === 'pout') downShape(K.talk * 0.7, 6);
        else if (K.moodMouth === 'laugh') laughShape(0.7 + 0.3 * K.talk);
        else if (K.moodMouth === 'set') firmShape(K.talk);
        else if (K.moodMouth === 'hmm') openShape(K.talk * 0.65);
        else openShape(K.talk);
        break;
      case 'laugh': laughShape(1); break;
      case 'wobble': wobble(9); break;
      case 'gasp': worried(0.45, 8); break;
      case 'set': c.beginPath(); c.moveTo(-9, 5); c.quadraticCurveTo(0, 6.5, 9, 5); c.stroke(); break;
      // proud: a confident closed smile, a little higher on one side
      case 'smirk': c.beginPath(); c.moveTo(-11, 2); c.quadraticCurveTo(0, 11, 12, -1); c.stroke(); c.beginPath(); c.moveTo(10, -3); c.quadraticCurveTo(13, -1, 13, 2); c.stroke(); break;
      // thinking: a small mouth pulled to one side
      case 'hmm': c.beginPath(); c.moveTo(-3, 7); c.quadraticCurveTo(2, 8.5, 8, 4); c.stroke(); break;
      case 'o': c.beginPath(); c.ellipse(0, 9, 6, 8, 0, 0, Math.PI * 2); c.fillStyle = C.mouth; c.fill(); c.stroke(); break;
      case 'soft': c.beginPath(); c.moveTo(-10, 2); c.quadraticCurveTo(0, 10, 10, 2); c.stroke(); break;
      case 'frown': c.beginPath(); c.moveTo(-9, 7); c.quadraticCurveTo(0, -1, 9, 7); c.stroke(); break;
      case 'tinyfrown': case 'pout': c.beginPath(); c.moveTo(-5, 7); c.quadraticCurveTo(0, 3, 5, 7); c.stroke(); break;
      case 'yawn': {
        path(c, () => c.ellipse(0, 9, 7, 9, 0, 0, Math.PI * 2));
        c.fillStyle = C.mouth; c.fill();
        c.save(); c.clip(); c.beginPath(); c.ellipse(0, 16, 6, 4, 0, 0, Math.PI * 2); c.fillStyle = C.tongue; c.fill(); c.restore();
        c.stroke(); break;
      }
      case 'tongue': {
        // small smile with the tongue poking out
        path(c, () => { c.moveTo(-1, 4); c.quadraticCurveTo(-1, 16, 6, 16); c.quadraticCurveTo(13, 16, 12, 4); });
        c.fillStyle = C.tongue; c.fill(); c.lineWidth = 2.5; c.stroke();
        c.beginPath(); c.moveTo(5.5, 6); c.lineTo(5.5, 11); c.strokeStyle = 'rgba(140,42,46,0.6)'; c.lineWidth = 2; c.stroke();
        c.strokeStyle = C.line; c.lineWidth = 3; omega();
        break;
      }
      default: omega();
    }
  }

  function drawNose(c, x, y, rot = 0) {
    c.save(); c.translate(x, y); c.rotate(rot);
    path(c, () => { c.moveTo(-7, -3); c.quadraticCurveTo(0, -6, 7, -3); c.quadraticCurveTo(4, 4, 0, 5); c.quadraticCurveTo(-4, 4, -7, -3); });
    c.fillStyle = C.eye; c.fill();
    c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.ellipse(-2, -2.5, 2.2, 1.2, 0, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  function blushAt(c, x, y, K, k = 1) {
    const r = (20 + K.blushBoost * 8) * k, a = clamp(0.5 + K.blushBoost * 0.6);
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${C.blush},${a})`); g.addColorStop(0.6, `rgba(${C.blush},${a * 0.6})`); g.addColorStop(1, `rgba(${C.blush},0)`);
    c.fillStyle = g; c.beginPath(); c.ellipse(x, y, r, r * 0.62, 0, 0, Math.PI * 2); c.fill();
  }
  // shy: a soft blush band across the nose
  function noseBand(c, x, y, K, w = 80) {
    if (K.blushBoost <= 0.4) return;
    c.save(); c.translate(x, y); c.scale(1, 0.28);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, w), a = clamp((K.blushBoost - 0.4) * 1.4);
    g.addColorStop(0, `rgba(${C.blush},${0.55 * a})`); g.addColorStop(1, `rgba(${C.blush},0)`);
    c.fillStyle = g; c.fillRect(-w, -w, w * 2, w * 2); c.restore();
  }
  function browDot(c, x, y, k = 1) { c.fillStyle = C.cream; c.beginPath(); c.ellipse(x, y, 7.5 * k, 4.5, 0, 0, Math.PI * 2); c.fill(); }
  // brows > 0: worried (inner end, toward the nose in direction `inward`, raised); brows < 0: cross (inner end lowered)
  function brow(c, x, K, inward, k = 1) {
    const v = K.brows || 0; if (Math.abs(v) < 0.02) return;
    // firm (determined): lower and nearly level, steady rather than cross
    const f = v < 0 ? K.firm || 0 : 0, inY = v > 0 ? -38 : -26 - 5 * f, outY = v > 0 ? -30 : -38 + 3 * f;
    c.save(); c.globalAlpha = clamp(Math.abs(v)); c.strokeStyle = C.line; c.lineWidth = 4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x + inward * 12 * k, inY); c.lineTo(x - inward * 10 * k, outY); c.stroke();
    c.restore();
  }
  function sheen(c, x, y) {
    c.save(); c.translate(x, y); c.scale(1, 0.6);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, 44);
    g.addColorStop(0, 'rgba(252,192,128,0.45)'); g.addColorStop(1, 'rgba(252,192,128,0)');
    c.fillStyle = g; c.fillRect(-44, -44, 88, 88); c.restore();
  }
  function shade(c, x, y, rx, ry, a) { c.save(); c.fillStyle = C.furD; c.globalAlpha = a; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); c.restore(); }
  const topTuft = (c, dx) => { c.moveTo(dx - 22, -70); tufts(c, [dx - 22, -70], [[dx - 12, -92], [dx - 4, -82], [dx + 6, -98], [dx + 10, -84], [dx + 22, -92], [dx + 24, -70]], 4, -1); c.closePath(); };
  // Head pivot: shared by every view so the head sits on the neck the same way.
  // (proud lifts the head a little: chin up)
  function headFrame(c, K, dx) { c.translate(0, -142 - 6 * (K.lift || 0)); c.rotate(K.tilt); c.translate(dx, -68); }

  // ---------- FRONT view (|f| < 0.3) ----------
  // Round head with small orange cheek tufts and a little tuft on top. Below the eyes it is never
  // wider than at eye level, apart from the tufts.
  const CHEEK_R = [[104, 14], [95, 22], [104, 32], [91, 40], [84, 48]];
  const CHEEK_L = CHEEK_R.map(([x, y]) => [-x, y]).reverse();
  // puffed cheeks for 'pouty': round bulges added to the head outline at (x, y)
  function puffs(c, K, spots) {
    const p = K.puff || 0; if (p <= 0) return;
    spots.forEach(([x, y, r]) => { c.moveTo(x + r * p, y); c.ellipse(x, y, r * p, r * p * 0.85, 0, 0, Math.PI * 2); c.closePath(); });
  }
  function frontHeadPath(c, K) {
    c.beginPath();
    c.moveTo(-92, 4);
    c.bezierCurveTo(-98, -48, -54, -84, 0, -84);
    c.bezierCurveTo(54, -84, 98, -48, 92, 4);
    tufts(c, [92, 4], CHEEK_R, 5, -1);
    c.bezierCurveTo(66, 66, 30, 78, 0, 78);
    c.bezierCurveTo(-30, 78, -66, 66, -84, 48);
    tufts(c, [-84, 48], [...CHEEK_L.slice(1), [-92, 4]], 5, -1);
    c.closePath();
    topTuft(c, 0);
    puffs(c, K, [[-70, 42, 30], [70, 42, 30]]);
  }
  function drawFrontHead(c, K) {
    const f = K.f, mx = f * 26;
    c.save();
    headFrame(c, K, f * 6);
    earAt(c, -48 + f * 10, -48, -0.3 - K.earL);
    earAt(c, 48 + f * 10, -48, 0.3 + K.earR);
    frontHeadPath(c, K); fillUnion(c, C.fur);
    c.save(); c.clip();
    sheen(c, f * 16, -56);
    if (f) shade(c, -Math.sign(f) * 92, 0, 36, 90, 0.3 * Math.abs(f));
    // cream only on the muzzle, chin and the inner/lower cheeks (fur-edged); the outer cheek tufts stay orange
    c.fillStyle = C.cream;
    const sx = f * 14;
    c.beginPath();
    c.moveTo(-64 + sx, 78);
    tufts(c, [-64 + sx, 78], [[-64 + sx, 56], [-56 + sx, 60], [-52 + sx, 46], [-44 + sx, 50], [-38 + sx, 40]], 3, -1);
    c.bezierCurveTo(-30 + sx, 46, -24 + mx, 44, -17 + mx, 28);
    c.quadraticCurveTo(mx, 17, 17 + mx, 28);
    c.bezierCurveTo(24 + mx, 44, 30 + sx, 46, 38 + sx, 40);
    tufts(c, [38 + sx, 40], [[44 + sx, 50], [52 + sx, 46], [56 + sx, 60], [64 + sx, 56], [64 + sx, 78]], 3, -1);
    c.lineTo(64 + sx, 120); c.lineTo(-64 + sx, 120); c.closePath(); c.fill();
    noseBand(c, mx * 0.7, 28, K);
    c.restore();
    [-1, 1].forEach(i => { browDot(c, i * 26 + f * 18, -42); blushAt(c, i * 60 + f * 16, 38, K); });
    drawEye(c, -37 + f * 22, 2, -1, K);
    drawEye(c, 37 + f * 22, 2, 1, K);
    [-1, 1].forEach(i => brow(c, i * 37 + f * 20, K, -i));
    drawNose(c, mx, 30);
    c.save(); c.translate(mx, 39); drawMouth(c, K); c.restore();
    c.restore();
  }

  function drawArm(c, i, ang, K, chin) {
    // resting arms hang along the sides with the paws by the hips; folded in (holding) they are shorter
    const S = [i * 44 + K.f * 4, -122];
    let len = 64 - 16 * clamp(-ang / 1.2), rot = i < 0 ? ang : -ang;
    ({ rot, len } = toChin(S, rot, len, K, i > 0 && chin));
    c.save();
    c.translate(...S);
    c.rotate(rot);
    armShape(c, len);
    c.restore();
  }
  // thinking: the near paw goes up to the chin (point T, in body coordinates) from shoulder S
  function toChin(S, rot, len, K, T) {
    const w = K.pawPose === 'chin' && T ? clamp(K.pawW || 0) : 0;
    if (w <= 0) return { rot, len };
    const dx = T[0] - S[0], dy = T[1] - S[1];
    return { rot: rot + (Math.atan2(-dx, dy) - rot) * w, len: len + (Math.hypot(dx, dy) + 4 - len) * w };
  }
  // dark brown paw fading into the orange
  function armShape(c, len) {
    const g = c.createLinearGradient(0, -4, 0, len);
    g.addColorStop(0, C.fur); g.addColorStop(0.55, C.fur); g.addColorStop(0.82, C.paw); g.addColorStop(1, C.paw);
    c.beginPath(); c.roundRect(-12, -4, 24, len + 4, 12); fillStroke(c, g);
  }

  function drawFront(c, K) {
    const side = K.f >= 0 ? 1 - 2 * K.f : 1;
    drawTail(c, K, side * 26, Math.sign(side || 1) * Math.max(0.45, Math.abs(side)));
    drawLegs(c, K);
    c.translate(0, -Math.abs(Math.sin(K.phase)) * 5 * K.walk);
    drawBody(c, K);
    drawScarf(c, K);
    drawFrontHead(c, K);
    drawArm(c, -1, K.armL, K);
    drawArm(c, 1, K.armR, K, [8 + K.f * 20, -136 - 6 * (K.lift || 0)]);
  }

  // ---------- THREE-QUARTER view (0.3 <= |f| < 0.7), drawn facing right ----------
  // The near cheek (left) keeps its full tuft; on the right the face turns into a short snout that
  // stays part of one outline, with the far eye small and close to the edge.
  // Like the sheet's three-quarter view: the round front head turned a little. Fluffy cheeks on both sides,
  // no protruding snout; the face (eyes, nose, mouth) shifts toward the side Ren is facing.
  const CHEEK_RF = [[100, 12], [92, 20], [100, 30], [88, 38], [80, 46]];   // the far cheek, slightly smaller
  function threeHeadPath(c, K) {
    c.beginPath();
    c.moveTo(-92, 4);
    c.bezierCurveTo(-98, -48, -54, -86, 2, -86);
    c.bezierCurveTo(56, -86, 96, -50, 90, 2);
    tufts(c, [90, 2], CHEEK_RF, 5, -1);
    c.bezierCurveTo(64, 66, 32, 78, 2, 78);
    c.bezierCurveTo(-30, 78, -66, 66, -84, 48);
    tufts(c, [-84, 48], [...CHEEK_L.slice(1), [-92, 4]], 5, -1);
    c.closePath();
    topTuft(c, 8);
    puffs(c, K, [[-66, 44, 30], [72, 44, 24]]);
  }
  function drawThreeHead(c, K) {
    c.save();
    headFrame(c, K, 6);
    earAt(c, 44, -56, 0.2 + K.earR * 0.8, 0.9, 0.97);    // far ear
    earAt(c, -46, -50, -0.4 - K.earL);                    // near ear
    threeHeadPath(c, K); fillUnion(c, C.fur);
    c.save(); c.clip();
    sheen(c, 18, -56);
    shade(c, -96, 0, 34, 90, 0.18);
    // cream on the whole lower face: under the near eye, up around the nose and mouth, under the far eye to the far cheek
    c.fillStyle = C.cream;
    c.beginPath();
    c.moveTo(-70, 80);
    tufts(c, [-70, 80], [[-70, 58], [-62, 62], [-58, 48], [-50, 52], [-44, 42]], 3, -1);
    c.bezierCurveTo(-30, 46, -8, 44, 8, 34);
    c.bezierCurveTo(22, 24, 30, 14, 44, 14);
    c.bezierCurveTo(58, 14, 62, 30, 76, 30);
    c.bezierCurveTo(86, 30, 92, 22, 100, 20);
    c.lineTo(140, 20); c.lineTo(140, 120); c.lineTo(-70, 120); c.closePath(); c.fill();
    noseBand(c, 40, 28, K, 70);
    c.restore();
    browDot(c, 4, -40, 0.85); browDot(c, 58, -40, 0.7);
    blushAt(c, -34, 40, K); blushAt(c, 88, 36, K, 0.7);
    c.save(); c.translate(8, 2); c.scale(0.9, 0.9); drawEye(c, 0, 0, -1, K); brow(c, 0, K, 1); c.restore();
    c.save(); c.translate(72, 2); c.scale(0.8, 0.82); drawEye(c, 0, 0, 1, K, 0.85); brow(c, 0, K, -1, 0.85); c.restore();
    drawNose(c, 58, 22, 0.1);
    c.save(); c.translate(56, 31); c.scale(0.85, 0.85); drawMouth(c, K); c.restore();
    c.restore();
  }
  function drawThree(c, K) {
    const B = { ...K, f: K.f * 1.6 };   // body turned a little further than the front pieces normally go
    drawTail(c, K, -28, -0.7);
    drawLegs(c, B);
    c.translate(0, -Math.abs(Math.sin(K.phase)) * 5 * K.walk);
    drawBody(c, B);
    drawScarf(c, B, K.flipped);   // the knot is on Ren's right side: near when he faces right
    drawThreeHead(c, K);
    drawArm(c, -1, K.armL, K);
    drawArm(c, 1, K.armR, K, [58, -146 - 6 * (K.lift || 0)]);
  }

  // ---------- SIDE profile (|f| >= 0.7), drawn facing right ----------
  // Head: round, positioned slightly forward of the body; the face fills the front half.
  // A SHORT small snout with a black nose tip and a gentle smile under it.
  function sideHeadPath(c, K) {
    c.beginPath();
    c.moveTo(-88, 20);
    c.bezierCurveTo(-98, -40, -58, -92, -2, -94);              // back of the skull to the top
    c.bezierCurveTo(44, -94, 70, -70, 74, -40);                // crown to the forehead
    c.bezierCurveTo(78, -20, 88, -6, 102, 0);                  // brow sloping into the snout bridge
    c.bezierCurveTo(110, 3, 112, 13, 106, 17);                 // round snout tip
    c.bezierCurveTo(100, 22, 92, 24, 86, 26);                  // under the snout
    c.bezierCurveTo(80, 28, 80, 34, 74, 38);                   // chin
    c.bezierCurveTo(58, 52, 30, 62, 2, 66);                    // jaw
    c.bezierCurveTo(-22, 70, -46, 70, -62, 60);
    tufts(c, [-62, 60], [[-80, 66], [-76, 54], [-98, 50], [-88, 40], [-100, 30], [-88, 20]], 6, -1);
    c.closePath();
    topTuft(c, -18);
    puffs(c, K, [[50, 36, 22]]);
  }
  function sideMouth(c, K) {
    c.strokeStyle = C.line; c.lineWidth = 3; c.lineCap = 'round';
    // a gentle smile running back from under the nose
    const line = (dip) => { c.beginPath(); c.moveTo(100, 21); c.quadraticCurveTo(92, 26 + dip, 80, 24); c.stroke(); };
    switch (K.mouth) {
      case 'smile': line(5); break;
      case 'soft': line(3); break;
      case 'frown': case 'tinyfrown': case 'pout': case 'wobble': line(-4); break;
      case 'smirk': line(7); break;
      case 'set': line(0.5); break;
      case 'hmm': line(1.5); break;
      default: c.save(); c.translate(93, 17); c.scale(0.5, 0.5); drawMouth(c, K); c.restore();
    }
  }
  function drawSideHead(c, K) {
    c.save();
    headFrame(c, K, -13);
    c.scale(1.1, 1.1);
    // two big pointed ears close together on the top-back of the head; the far ear shows just in front of the near ear
    earAt(c, -4, -72, 0.06 - K.earR * 0.5, 0.76, 0.92);    // far ear
    earAt(c, -24, -66, -0.08 - K.earL * 0.8, 0.9, 1);      // near ear
    sideHeadPath(c, K); fillUnion(c, C.fur);
    c.save(); c.clip();
    sheen(c, -6, -62);
    shade(c, -86, 4, 30, 80, 0.22);
    // cream: the lower half of the snout, the cheek under the eye back toward the ear, the chin and jaw (fur-edged);
    // the top of the snout stays orange
    c.fillStyle = C.cream;
    c.beginPath();
    c.moveTo(140, 2); c.lineTo(106, 2);
    c.bezierCurveTo(94, 6, 82, 16, 62, 17);
    c.bezierCurveTo(44, 18, 24, 16, 6, 14);
    tufts(c, [6, 14], [[-6, 24], [-12, 16], [-24, 30], [-30, 22], [-42, 38], [-40, 50], [-56, 58], [-54, 90]], 3, -1);
    c.lineTo(-54, 130); c.lineTo(140, 130); c.closePath(); c.fill();
    noseBand(c, 78, 12, K, 44);
    c.restore();
    browDot(c, 56, -38, 0.8);
    blushAt(c, 38, 10, K, 1.05);
    // the eye: an upright oval close above the snout
    c.save(); c.translate(62, 1); c.scale(0.8, 0.76);
    drawEye(c, 0, 0, 1, K, 0.82, true, 1);
    brow(c, 0, K, 1, 0.82);
    c.restore();
    drawNose(c, 106, 7, -0.2);
    sideMouth(c, K);
    c.restore();
  }
  // Body: an upright pear shape; cream chest running down to the belly
  function sideBodyPath(c) {
    path(c, () => {
      c.moveTo(-50, -34);
      c.bezierCurveTo(-64, -80, -46, -138, -8, -146);
      c.bezierCurveTo(14, -150, 28, -142, 36, -130);
      tufts(c, [36, -130], [[48, -122], [44, -112], [56, -102], [50, -92], [58, -80]], 5, -1);
      c.bezierCurveTo(62, -58, 54, -32, 40, -22);
      c.bezierCurveTo(18, -6, -40, -8, -50, -34);
    });
  }
  function drawSideBody(c) {
    sideBodyPath(c); c.fillStyle = C.fur; c.fill();
    c.save(); c.clip();
    shade(c, -44, -76, 18, 66, 0.3);
    // cream chest running down to the belly, fur-edged toward the back
    c.fillStyle = C.cream;
    c.beginPath(); c.moveTo(4, -150);
    tufts(c, [4, -150], [[-4, -136], [6, -124], [-2, -112], [8, -100], [2, -88], [12, -76], [8, -62]], 4, 1);
    c.bezierCurveTo(12, -44, 22, -30, 38, -22);
    c.lineTo(72, -24); c.lineTo(72, -150); c.closePath(); c.fill();
    c.restore();
    sideBodyPath(c); c.lineWidth = 4; c.strokeStyle = C.line; c.stroke();
  }
  // legs one slightly in front of the other, with dark socks; one foot slightly ahead
  function drawSideLegs(c, K) {
    [[-14, Math.PI, true], [20, 0, false]].forEach(([x0, off, far]) => {
      const ph = K.phase + off, lx = x0 + Math.sin(ph) * 14 * K.walk, lift = Math.max(0, Math.cos(ph)) * 9 * K.walk;
      const g = c.createLinearGradient(0, -62 - lift, 0, -lift);
      g.addColorStop(0, C.fur); g.addColorStop(0.3, C.fur); g.addColorStop(0.62, C.paw); g.addColorStop(1, C.paw);
      c.beginPath(); c.roundRect(lx - 13, -62 - lift, 26, 58, [11, 11, 8, 8]); c.ellipse(lx + 5, -8 - lift, 15, 8, 0, 0, Math.PI * 2);
      fillUnion(c, g, 3.5);
      if (far) { c.fillStyle = 'rgba(60,30,15,0.3)'; c.fill(); }
    });
  }
  // short bent arm hanging at the front with a dark paw at belly height
  function drawSideArm(c, ang, far, K) {
    const a = ang < 0 ? 0.7 - ang * 0.35 : ang, S = [far ? -12 : 6, -120];
    const { rot, len } = toChin(S, -a - (far ? 0 : 0.12), 58 - 14 * clamp(-ang / 1.2), K, !far && [64, -160 - 6 * (K.lift || 0)]);
    c.save();
    c.translate(...S);
    c.rotate(rot);
    armShape(c, len);
    if (far) { c.fillStyle = 'rgba(60,30,15,0.25)'; c.fill(); }
    c.restore();
  }
  function drawSideScarf(c, farKnot) {
    if (farKnot) {
      // the knot is on the far side: only the tops of its loops peek over the band
      [[-1, C.scarfD], [1, C.scarfD]].forEach(([d, col]) => { path(c, () => c.ellipse(-42 + d * 7, -160 - d * 2, 8, 5.5, d * 0.5, 0, Math.PI * 2)); fillStroke(c, col, 3); });
    } else drawSideBow(c);
    drawSideBand(c, !farKnot);
  }
  function drawSideBow(c) {
    // small bow at the back of the neck with short ends
    path(c, () => { c.moveTo(-46, -138); c.quadraticCurveTo(-56, -124, -58, -112); c.lineTo(-50, -116); c.quadraticCurveTo(-46, -126, -40, -136); });
    fillStroke(c, C.scarfD, 3);
    path(c, () => { c.moveTo(-42, -136); c.quadraticCurveTo(-42, -122, -38, -112); c.lineTo(-32, -118); c.quadraticCurveTo(-36, -126, -36, -136); });
    fillStroke(c, C.scarf, 3);
    [[-1, C.scarfD], [1, C.scarf]].forEach(([d, col]) => { path(c, () => c.ellipse(-46 + d * 8, -146 - d * 2, 10, 6.5, d * 0.5, 0, Math.PI * 2)); fillStroke(c, col, 3); });
  }
  function drawSideBand(c, near = true) {
    // a thick wrapped band around the neck, slightly lower at the front
    path(c, () => {
      c.moveTo(-48, -160); c.quadraticCurveTo(4, -168, 58, -152);
      c.quadraticCurveTo(64, -140, 60, -124);
      c.quadraticCurveTo(6, -134, -46, -130);
      c.quadraticCurveTo(-52, -146, -48, -160);
    });
    const g = c.createLinearGradient(0, -166, 0, -124);
    g.addColorStop(0, C.scarfL); g.addColorStop(0.55, C.scarf); g.addColorStop(1, C.scarfD);
    fillStroke(c, g);
    c.strokeStyle = C.scarfD; c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(-30, -152); c.quadraticCurveTo(0, -148, 30, -144); c.stroke();
    c.beginPath(); c.moveTo(-10, -140); c.quadraticCurveTo(14, -138, 40, -136); c.stroke();
    if (near) { path(c, () => c.ellipse(-46, -145, 6, 7, 0, 0, Math.PI * 2)); fillStroke(c, C.scarf, 3); }
    // a small bib tip at the front of the throat with the flower
    path(c, () => { c.moveTo(42, -132); c.quadraticCurveTo(50, -114, 62, -108); c.quadraticCurveTo(66, -120, 62, -132); });
    fillStroke(c, C.scarf, 3.5);
    drawFlower(c, 52, -142, 6.5);
  }
  function drawSide(c, K) {
    // big fluffy tail rising and curling up behind the body, with a white tip
    drawTail(c, K, -42, -0.95);
    drawSideArm(c, K.armL, true, K);
    drawSideLegs(c, K);
    c.translate(0, -Math.abs(Math.sin(K.phase)) * 5 * K.walk);
    drawSideBody(c);
    drawSideHead(c, K);
    // (a paw at the chin goes over the scarf)
    const chin = K.pawPose === 'chin' && K.pawW > 0.5;
    if (!chin) drawSideArm(c, K.armR, false, K);
    // scarf: a band around the neck seen from the side, the flower at the front of the throat
    drawSideScarf(c, K.flipped);
    if (chin) drawSideArm(c, K.armR, false, K);
  }

  // ---------- views ----------
  const VIEWS = { front: drawFront, three: drawThree, side: drawSide };
  const viewAt = a => (a < 0.3 ? 'front' : a < 0.7 ? 'three' : 'side');
  const FADES = [[0.26, 0.34], [0.65, 0.75]];   // brief crossfades around the switch points
  // Three-quarter and side views are drawn facing right; facing left mirrors them.
  // `flipped` tells the turned views we see Ren's left side, so one-sided details (the scarf knot) go to the far side
  const mirror = K => ({ ...K, f: -K.f, lookX: -K.lookX, tilt: -K.tilt, earL: K.earR, earR: K.earL, flipped: true });

  function drawView(c, K, view) {
    c.save();
    c.translate(K.x, K.y - K.h);
    c.scale(K.s * K.sx, K.s * K.sy);
    c.lineJoin = 'round'; c.lineCap = 'round';
    // contact shadow
    c.save(); c.translate(0, K.h / (K.s * K.sy));
    c.fillStyle = 'rgba(30,40,20,0.22)'; c.beginPath(); c.ellipse(0, 0, 70 * (1 - K.h / 260), 12 * (1 - K.h / 260), 0, 0, Math.PI * 2); c.fill();
    c.restore();
    // scared leans away from where Ren is facing; proud stands a little taller (chest out)
    if (K.lean) c.rotate(-(K.f < 0 ? -1 : 1) * 0.07 * K.lean);
    if (K.lift) c.scale(1 + 0.015 * K.lift, 1 + 0.025 * K.lift);
    if (view !== 'front' && K.f < 0) { c.scale(-1, 1); K = mirror(K); }
    VIEWS[view](c, K);
    c.restore();
  }

  let bufs = null;
  function drawRen(c, K) {
    const a = Math.abs(K.f), fade = FADES.find(([lo, hi]) => a > lo && a < hi);
    if (!fade || typeof document === 'undefined') return drawView(c, K, viewAt(a));
    // crossfade: draw both views off-screen, lay the nearer one down fully and the other on top
    const W = c.canvas.width, H = c.canvas.height, w = (a - fade[0]) / (fade[1] - fade[0]);
    if (!bufs || bufs[0].width !== W || bufs[0].height !== H) bufs = [0, 1].map(() => Object.assign(document.createElement('canvas'), { width: W, height: H }));
    const m = c.getTransform(), views = [viewAt(fade[0]), viewAt(fade[1])];
    views.forEach((v, i) => {
      const b = bufs[i].getContext('2d');
      b.setTransform(1, 0, 0, 1, 0, 0); b.clearRect(0, 0, W, H); b.setTransform(m);
      drawView(b, K, v);
    });
    const [base, top, alpha] = w < 0.5 ? [0, 1, w * 2] : [1, 0, (1 - w) * 2];
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
    c.drawImage(bufs[base], 0, 0);
    c.globalAlpha *= alpha; c.drawImage(bufs[top], 0, 0);
    c.restore();
  }

  root.RenCharacter = { drawRen, C };
})(this);
