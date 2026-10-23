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

  function drawScarf(c, K) {
    const cx = K.f * 8, bx = K.f * 18, kx = cx - 46;
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
  // `squeeze` narrows an eye seen at an angle.
  // `bold` draws closed eyes thicker and longer so they read at video size (profile)
  function drawEye(c, ex, ey, i, K, squeeze = 1, bold = false) {
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
    c.beginPath(); c.ellipse(0, 0, 19, 26, 0, 0, Math.PI * 2); c.fillStyle = C.eye; c.fill();
    c.save(); c.clip();
    // warm brown iris, lighter at the bottom
    const g = c.createLinearGradient(0, -14 + ly, 0, 26 + ly);
    g.addColorStop(0, C.irisT); g.addColorStop(1, C.irisB);
    c.beginPath(); c.ellipse(lx * 0.8, 3 + ly, 16, 20, 0, 0, Math.PI * 2); c.fillStyle = g; c.fill();
    c.beginPath(); c.ellipse(lx * 0.9, 1 + ly, 8.5, 11, 0, 0, Math.PI * 2); c.fillStyle = C.eye; c.fill();
    c.restore();
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(-6 + lx * 0.6, -10 + ly * 0.6, 9.5 + K.wide * 1.2, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(7 + lx, 10 + ly, 3.8, 0, Math.PI * 2); c.fill();
    if (K.wide > 0.3) { c.beginPath(); c.arc(8 + lx, -10 + ly, 2.6, 0, Math.PI * 2); c.fill(); }
    if (K.eyes === 'shy') {
      // glossy, a little teary: a bright rim along the bottom and an extra sparkle
      c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 2.6;
      c.beginPath(); c.ellipse(0, 0, 15, 21, 0, 0.25 * Math.PI, 0.75 * Math.PI); c.stroke();
      c.beginPath(); c.arc(-8 + lx, 4 + ly, 2.4, 0, Math.PI * 2); c.fill();
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
    switch (K.mouth) {
      case 'open': openShape(1); break;
      case 'talk': openShape(K.talk); break;
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
    const inY = v > 0 ? -38 : -26, outY = v > 0 ? -30 : -38;
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
  function headFrame(c, K, dx) { c.translate(0, -142); c.rotate(K.tilt); c.translate(dx, -68); }

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

  function drawArm(c, i, ang, K) {
    // resting arms hang along the sides with the paws by the hips; folded in (holding) they are shorter
    const len = 64 - 16 * clamp(-ang / 1.2);
    c.save();
    c.translate(i * 44 + K.f * 4, -122);
    c.rotate(i < 0 ? ang : -ang);
    armShape(c, len);
    c.restore();
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
    drawArm(c, 1, K.armR, K);
  }

  // ---------- THREE-QUARTER view (0.3 <= |f| < 0.7), drawn facing right ----------
  // The near cheek (left) keeps its full tuft; on the right the face turns into a short snout that
  // stays part of one outline, with the far eye small and close to the edge.
  function threeHeadPath(c, K) {
    c.beginPath();
    c.moveTo(-92, 4);
    c.bezierCurveTo(-98, -48, -54, -86, 2, -86);
    c.bezierCurveTo(56, -86, 94, -54, 92, -14);
    c.bezierCurveTo(92, -2, 96, 4, 102, 10);
    c.quadraticCurveTo(108, 18, 102, 26);
    c.bezierCurveTo(98, 34, 90, 38, 84, 42);
    c.bezierCurveTo(74, 62, 40, 78, 2, 78);
    c.bezierCurveTo(-30, 78, -66, 66, -84, 48);
    tufts(c, [-84, 48], [...CHEEK_L.slice(1), [-92, 4]], 5, -1);
    c.closePath();
    topTuft(c, 6);
    puffs(c, K, [[-66, 44, 30], [70, 48, 20]]);
  }
  function drawThreeHead(c, K) {
    c.save();
    headFrame(c, K, 6);
    earAt(c, 40, -56, 0.24 + K.earR * 0.8, 0.8, 0.95);   // far ear, partly behind the head
    earAt(c, -46, -50, -0.32 - K.earL);                    // near ear
    threeHeadPath(c, K); fillUnion(c, C.fur);
    c.save(); c.clip();
    sheen(c, 14, -56);
    shade(c, -96, 0, 34, 90, 0.18);
    c.fillStyle = C.cream;
    c.beginPath();
    c.moveTo(-70, 80);
    tufts(c, [-70, 80], [[-70, 58], [-62, 62], [-58, 48], [-50, 52], [-44, 42]], 3, -1);
    c.bezierCurveTo(-32, 52, -6, 52, 6, 40);
    c.quadraticCurveTo(14, 20, 32, 20);
    c.bezierCurveTo(44, 20, 50, 34, 66, 36);
    c.bezierCurveTo(78, 36, 86, 26, 96, 24);
    c.lineTo(140, 24); c.lineTo(140, 120); c.lineTo(-70, 120); c.closePath(); c.fill();
    noseBand(c, 40, 28, K, 70);
    c.restore();
    browDot(c, -20, -42); browDot(c, 56, -42, 0.65);
    blushAt(c, -54, 38, K); blushAt(c, 80, 42, K, 0.6);
    drawEye(c, -20, 2, -1, K);
    drawEye(c, 58, 2, 1, K, 0.66);
    brow(c, -20, K, 1); brow(c, 58, K, -1, 0.66);
    drawNose(c, 98, 18, 0.15);
    c.save(); c.translate(86, 34); c.scale(0.85, 0.85); drawMouth(c, K); c.restore();
    c.restore();
  }
  function drawThree(c, K) {
    const B = { ...K, f: K.f * 1.6 };   // body turned a little further than the front pieces normally go
    drawTail(c, K, -28, -0.7);
    drawLegs(c, B);
    c.translate(0, -Math.abs(Math.sin(K.phase)) * 5 * K.walk);
    drawBody(c, B);
    drawScarf(c, B);
    drawThreeHead(c, K);
    drawArm(c, -1, K.armL, K);
    drawArm(c, 1, K.armR, K);
  }

  // ---------- SIDE profile (|f| >= 0.7), drawn facing right ----------
  // One outline: skull -> forehead -> short upturned snout -> chin -> throat; cheek tuft at the back of the jaw.
  function sideHeadPath(c, K) {
    c.beginPath();
    c.moveTo(-88, 14);
    c.bezierCurveTo(-98, -46, -56, -88, -4, -88);
    c.bezierCurveTo(40, -88, 72, -64, 76, -34);
    c.bezierCurveTo(78, -20, 80, -8, 86, -2);
    c.bezierCurveTo(96, 2, 98, 14, 92, 20);
    c.bezierCurveTo(88, 26, 80, 28, 74, 30);
    c.bezierCurveTo(70, 34, 68, 40, 66, 46);
    c.bezierCurveTo(62, 62, 44, 72, 22, 78);
    c.bezierCurveTo(-8, 84, -40, 78, -60, 64);
    tufts(c, [-60, 64], [[-84, 70], [-78, 58], [-104, 54], [-90, 42], [-106, 32], [-88, 14]], 6, -1);
    c.closePath();
    topTuft(c, -14);
    puffs(c, K, [[42, 44, 26]]);
  }
  function sideMouth(c, K) {
    c.strokeStyle = C.line; c.lineWidth = 3; c.lineCap = 'round';
    const line = (dip) => { c.beginPath(); c.moveTo(90, 22); c.quadraticCurveTo(84, 26 + dip, 76, 26); c.stroke(); };
    switch (K.mouth) {
      case 'smile': line(6); break;
      case 'soft': line(4); break;
      case 'frown': case 'tinyfrown': case 'pout': line(-4); break;
      default: c.save(); c.translate(77, 22); c.scale(0.7, 0.7); drawMouth(c, K); c.restore();
    }
  }
  function drawSideHead(c, K) {
    c.save();
    headFrame(c, K, 4);
    earAt(c, 18, -66, 0.14 - K.earR * 0.5, 0.72, 0.9);     // far ear, just visible in front
    earAt(c, -30, -58, -0.26 - K.earL * 0.8, 0.86, 1);      // near ear at the back of the head
    sideHeadPath(c, K); fillUnion(c, C.fur);
    c.save(); c.clip();
    sheen(c, 4, -58);
    shade(c, -86, 4, 30, 80, 0.22);
    // muzzle, chin and throat as one cream shape that flows down into the chest
    c.fillStyle = C.cream;
    c.beginPath();
    c.moveTo(130, 14); c.lineTo(92, 14);
    c.bezierCurveTo(84, 18, 78, 24, 70, 26);
    c.bezierCurveTo(56, 32, 40, 32, 26, 28);
    tufts(c, [26, 28], [[14, 36], [10, 28], [-2, 40], [-6, 32], [-18, 48], [-16, 60], [-28, 70], [-26, 90]], 3, -1);
    c.lineTo(-26, 130); c.lineTo(130, 130); c.closePath(); c.fill();
    noseBand(c, 74, 18, K, 44);
    c.restore();
    browDot(c, 46, -44, 0.9);
    blushAt(c, 44, 34, K, 0.9);
    drawEye(c, 46, -2, 1, K, 0.84, true);
    brow(c, 46, K, 1, 0.84);
    drawNose(c, 91, 8, -0.2);
    sideMouth(c, K);
    c.restore();
  }
  function sideBodyPath(c) {
    path(c, () => {
      c.moveTo(-38, -34);
      c.bezierCurveTo(-52, -80, -38, -140, -6, -146);
      c.bezierCurveTo(14, -148, 28, -142, 34, -130);
      tufts(c, [34, -130], [[46, -122], [42, -112], [54, -102], [48, -92], [56, -80]], 5, -1);
      c.bezierCurveTo(60, -58, 52, -34, 40, -26);
      c.bezierCurveTo(22, -10, -30, -12, -38, -34);
    });
  }
  function drawSideBody(c) {
    sideBodyPath(c); c.fillStyle = C.fur; c.fill();
    c.save(); c.clip();
    shade(c, -34, -80, 20, 70, 0.3);
    // chest fluff on the front of the body, fur-edged toward the back
    c.fillStyle = C.cream;
    c.beginPath(); c.moveTo(-2, -152);
    tufts(c, [-2, -152], [[-8, -138], [2, -128], [-6, -116], [4, -104], [-2, -92], [8, -80], [4, -66]], 4, 1);
    c.bezierCurveTo(8, -48, 20, -34, 36, -26);
    c.lineTo(70, -28); c.lineTo(70, -152); c.closePath(); c.fill();
    c.restore();
    sideBodyPath(c); c.lineWidth = 4; c.strokeStyle = C.line; c.stroke();
  }
  // legs one slightly in front of the other, swapping while walking; small paws pointing forward
  function drawSideLegs(c, K) {
    [[-17, Math.PI, true], [15, 0, false]].forEach(([x0, off, far]) => {
      const ph = K.phase + off, lx = x0 + Math.sin(ph) * 14 * K.walk, lift = Math.max(0, Math.cos(ph)) * 9 * K.walk;
      const g = c.createLinearGradient(0, -66 - lift, 0, -lift);
      g.addColorStop(0, C.fur); g.addColorStop(0.3, C.fur); g.addColorStop(0.62, C.paw); g.addColorStop(1, C.paw);
      c.beginPath(); c.roundRect(lx - 14, -66 - lift, 28, 62, [12, 12, 8, 8]); c.ellipse(lx + 6, -9 - lift, 16, 9, 0, 0, Math.PI * 2);
      fillUnion(c, g, 3.5);
      if (far) { c.fillStyle = 'rgba(60,30,15,0.3)'; c.fill(); }
    });
  }
  // arm angles map to swinging forward in profile; folded (holding) brings the paw to the chest
  function drawSideArm(c, ang, far) {
    const a = ang < 0 ? 0.7 - ang * 0.35 : ang, len = 64 - 16 * clamp(-ang / 1.2);
    c.save();
    c.translate(far ? -4 : 22, -122);
    c.rotate(-a - (far ? 0 : 0.12));
    armShape(c, len);
    if (far) { c.fillStyle = 'rgba(60,30,15,0.25)'; c.fill(); }
    c.restore();
  }
  function drawSideScarf(c) {
    // small bow at the back of the neck with short ends
    path(c, () => { c.moveTo(-36, -134); c.quadraticCurveTo(-44, -122, -46, -112); c.lineTo(-38, -116); c.quadraticCurveTo(-36, -124, -30, -132); });
    fillStroke(c, C.scarfD, 3);
    path(c, () => { c.moveTo(-32, -132); c.quadraticCurveTo(-32, -120, -28, -110); c.lineTo(-22, -116); c.quadraticCurveTo(-26, -124, -26, -132); });
    fillStroke(c, C.scarf, 3);
    [[-1, C.scarfD], [1, C.scarf]].forEach(([d, col]) => { path(c, () => c.ellipse(-36 + d * 8, -138 - d * 2, 10, 6.5, d * 0.5, 0, Math.PI * 2)); fillStroke(c, col, 3); });
    // thin band around the neck
    path(c, () => { c.moveTo(-36, -145); c.quadraticCurveTo(0, -154, 38, -139); c.lineTo(37, -123); c.quadraticCurveTo(0, -136, -36, -129); });
    const g = c.createLinearGradient(0, -154, 0, -123);
    g.addColorStop(0, C.scarfL); g.addColorStop(0.55, C.scarf); g.addColorStop(1, C.scarfD);
    fillStroke(c, g);
    path(c, () => c.ellipse(-36, -137, 6, 6, 0, 0, Math.PI * 2)); fillStroke(c, C.scarf, 3);
    // bib under the chin, pointing forward
    path(c, () => { c.moveTo(6, -130); c.quadraticCurveTo(16, -108, 50, -99); c.quadraticCurveTo(50, -116, 38, -130); });
    fillStroke(c, C.scarf);
    c.strokeStyle = C.scarfD; c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(15, -125); c.quadraticCurveTo(25, -110, 42, -103); c.stroke();
    drawFlower(c, 34, -116, 6.5);
  }
  function drawSide(c, K) {
    drawTail(c, K, -26, -0.95);
    drawSideArm(c, K.armL, true);
    drawSideLegs(c, K);
    c.translate(0, -Math.abs(Math.sin(K.phase)) * 5 * K.walk);
    drawSideBody(c);
    drawSideHead(c, K);
    drawSideArm(c, K.armR, false);
    drawSideScarf(c);   // wraps over the throat and the top of the arm, as on the sheet
  }

  // ---------- views ----------
  const VIEWS = { front: drawFront, three: drawThree, side: drawSide };
  const viewAt = a => (a < 0.3 ? 'front' : a < 0.7 ? 'three' : 'side');
  const FADES = [[0.26, 0.34], [0.65, 0.75]];   // brief crossfades around the switch points
  // Three-quarter and side views are drawn facing right; facing left mirrors them.
  const mirror = K => ({ ...K, f: -K.f, lookX: -K.lookX, tilt: -K.tilt, earL: K.earR, earR: K.earL });

  function drawView(c, K, view) {
    c.save();
    c.translate(K.x, K.y - K.h);
    c.scale(K.s * K.sx, K.s * K.sy);
    c.lineJoin = 'round'; c.lineCap = 'round';
    // contact shadow
    c.save(); c.translate(0, K.h / (K.s * K.sy));
    c.fillStyle = 'rgba(30,40,20,0.22)'; c.beginPath(); c.ellipse(0, 0, 70 * (1 - K.h / 260), 12 * (1 - K.h / 260), 0, 0, Math.PI * 2); c.fill();
    c.restore();
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
