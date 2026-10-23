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
  function drawTail(c, K) {
    const side = K.f >= 0 ? 1 - 2 * K.f : 1;
    const sg = side >= 0 ? 1 : -1, spread = Math.max(0.45, Math.abs(side));
    c.save();
    c.translate(side * 26, -50);
    c.scale(sg * spread * 0.86, 0.86);
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
      path(c, () => c.roundRect(lx - 16, -66 - lift, 32, 66, [14, 14, 13, 13]));
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

  // ---------- head ----------
  function drawEar(c, i, K) {
    c.save();
    c.translate(i * 48 + K.f * 10, -48);
    c.rotate(i * 0.3 + (i < 0 ? -K.earL : K.earR));
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

  // round head with fluffy cheek tufts and a little tuft on top
  function headPath(c) {
    c.beginPath();
    c.moveTo(-92, 6);
    c.bezierCurveTo(-98, -48, -54, -84, 0, -84);
    c.bezierCurveTo(54, -84, 98, -48, 92, 6);
    tufts(c, [92, 6], [[108, 18], [98, 28], [110, 40], [92, 48], [96, 58], [74, 62]], 6, -1);
    c.bezierCurveTo(46, 78, -46, 78, -74, 62);
    tufts(c, [-74, 62], [[-96, 58], [-92, 48], [-110, 40], [-98, 28], [-108, 18], [-92, 6]], 6, -1);
    c.closePath();
    c.moveTo(-22, -70);
    tufts(c, [-22, -70], [[-12, -92], [-4, -82], [6, -98], [10, -84], [22, -92], [24, -70]], 4, -1);
    c.closePath();
  }

  function drawEye(c, ex, ey, i, K) {
    const far = (i > 0 && K.f < 0) || (i < 0 && K.f > 0) ? Math.abs(K.f) : 0;
    c.save(); c.translate(ex, ey);
    c.scale((1 - 0.3 * far) * (1 + 0.1 * K.wide), 1 + 0.12 * K.wide);
    c.strokeStyle = C.line; c.lineCap = 'round';
    if (K.eyes === 'happy' || (K.eyes === 'playful' && i > 0)) {
      c.lineWidth = 5; c.beginPath(); c.moveTo(-15, 6); c.quadraticCurveTo(0, -14, 15, 6); c.stroke();
      c.restore(); return;
    }
    const open = (1 - K.blink) * (K.eyes === 'sleepy' ? 0.42 : 1);
    if (open < 0.15) {
      c.lineWidth = 4.5; c.beginPath(); c.moveTo(-15, 3); c.quadraticCurveTo(0, 9, 15, 3); c.stroke();
      c.restore(); return;
    }
    if (K.eyes === 'sleepy') { c.lineWidth = 4; c.beginPath(); c.moveTo(-17, -22 * open + 2); c.quadraticCurveTo(0, -22 * open - 3, 17, -22 * open + 2); c.stroke(); }
    c.scale(1, open);
    const lx = K.lookX * 4, ly = K.lookY * 4.5;
    c.beginPath(); c.ellipse(0, 0, 17, 22, 0, 0, Math.PI * 2); c.fillStyle = C.eye; c.fill();
    c.save(); c.clip();
    // warm brown iris, lighter at the bottom
    const g = c.createLinearGradient(0, -12 + ly, 0, 22 + ly);
    g.addColorStop(0, C.irisT); g.addColorStop(1, C.irisB);
    c.beginPath(); c.ellipse(lx * 0.8, 3 + ly, 14, 17, 0, 0, Math.PI * 2); c.fillStyle = g; c.fill();
    c.beginPath(); c.ellipse(lx * 0.9, 1 + ly, 7.5, 9.5, 0, 0, Math.PI * 2); c.fillStyle = C.eye; c.fill();
    c.restore();
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(-5.5 + lx * 0.6, -8.5 + ly * 0.6, 7.5 + K.wide * 1.2, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(6 + lx, 8.5 + ly, 3.3, 0, Math.PI * 2); c.fill();
    if (K.wide > 0.3) { c.beginPath(); c.arc(7 + lx, -9 + ly, 2.4, 0, Math.PI * 2); c.fill(); }
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

  function drawHead(c, K) {
    const f = K.f;
    c.save();
    c.translate(0, -142); c.rotate(K.tilt); c.translate(f * 6, -68);
    drawEar(c, -1, K); drawEar(c, 1, K);
    headPath(c); fillUnion(c, C.fur);
    c.save(); c.clip();
    c.save(); c.translate(f * 20, -50); c.scale(1, 0.55);
    const sh = c.createRadialGradient(0, 0, 0, 0, 0, 80);
    sh.addColorStop(0, 'rgba(252,190,122,0.8)'); sh.addColorStop(1, 'rgba(252,190,122,0)');
    c.fillStyle = sh; c.fillRect(-80, -80, 160, 160); c.restore();
    if (f) { c.fillStyle = C.furD; c.globalAlpha = 0.3 * Math.abs(f); c.beginPath(); c.ellipse(-Math.sign(f) * 92, 0, 36, 90, 0, 0, Math.PI * 2); c.fill(); }
    // cream cheeks, muzzle and chin
    c.globalAlpha = 1; c.fillStyle = C.cream;
    c.beginPath();
    c.moveTo(-130, 10); c.lineTo(-92 + f * 10, 12);
    c.bezierCurveTo(-74 + f * 14, 34, -44 + f * 18, 38, -20 + f * 26, 22);
    c.quadraticCurveTo(f * 28, 10, 20 + f * 26, 22);
    c.bezierCurveTo(44 + f * 18, 38, 74 + f * 14, 34, 92 + f * 10, 12);
    c.lineTo(130, 10); c.lineTo(130, 120); c.lineTo(-130, 120); c.closePath(); c.fill();
    c.restore();
    // cream eyebrow dots
    c.fillStyle = C.cream;
    [-1, 1].forEach(i => { c.beginPath(); c.ellipse(i * 24 + f * 18, -38, 7.5, 4.5, i * 0.25, 0, Math.PI * 2); c.fill(); });
    // soft blush
    [-1, 1].forEach(i => {
      const x = i * 56 + f * 16, y = 34, r = 20 + K.blushBoost * 8, a = clamp(0.5 + K.blushBoost * 0.6);
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${C.blush},${a})`); g.addColorStop(0.6, `rgba(${C.blush},${a * 0.6})`); g.addColorStop(1, `rgba(${C.blush},0)`);
      c.fillStyle = g; c.beginPath(); c.ellipse(x, y, r, r * 0.62, 0, 0, Math.PI * 2); c.fill();
    });
    drawEye(c, -33 + f * 20, 4, -1, K);
    drawEye(c, 33 + f * 20, 4, 1, K);
    if (K.brows > 0) {
      c.save(); c.globalAlpha = K.brows; c.strokeStyle = C.line; c.lineWidth = 4; c.lineCap = 'round';
      [-1, 1].forEach(i => { const bx = i * 33 + f * 20; c.beginPath(); c.moveTo(bx - i * 12, -31); c.lineTo(bx + i * 10, -23); c.stroke(); });
      c.restore();
    }
    // nose + mouth
    c.save(); c.translate(f * 30, 22);
    path(c, () => { c.moveTo(-7, -3); c.quadraticCurveTo(0, -6, 7, -3); c.quadraticCurveTo(4, 4, 0, 5); c.quadraticCurveTo(-4, 4, -7, -3); });
    c.fillStyle = C.eye; c.fill();
    c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.ellipse(-2, -2.5, 2.2, 1.2, 0, 0, Math.PI * 2); c.fill();
    c.translate(0, 9); drawMouth(c, K);
    c.restore();
    c.restore();
  }

  function drawArm(c, i, ang, K) {
    c.save();
    c.translate(i * 40 + K.f * 4, -120);
    c.rotate(i < 0 ? ang : -ang);
    // dark brown paw fading into the orange
    const g = c.createLinearGradient(0, -4, 0, 44);
    g.addColorStop(0, C.fur); g.addColorStop(0.5, C.fur); g.addColorStop(0.8, C.paw); g.addColorStop(1, C.paw);
    path(c, () => c.roundRect(-12, -4, 24, 48, 12)); fillStroke(c, g);
    c.restore();
  }

  function drawRen(c, K) {
    c.save();
    c.translate(K.x, K.y - K.h);
    c.scale(K.s * K.sx, K.s * K.sy);
    c.lineJoin = 'round'; c.lineCap = 'round';
    // contact shadow
    c.save(); c.translate(0, K.h / (K.s * K.sy));
    c.fillStyle = 'rgba(30,40,20,0.22)'; c.beginPath(); c.ellipse(0, 0, 70 * (1 - K.h / 260), 12 * (1 - K.h / 260), 0, 0, Math.PI * 2); c.fill();
    c.restore();
    drawTail(c, K);
    drawLegs(c, K);
    c.translate(0, -Math.abs(Math.sin(K.phase)) * 5 * K.walk);
    drawBody(c, K);
    drawScarf(c, K);
    drawHead(c, K);
    drawArm(c, -1, K.armL, K);
    drawArm(c, 1, K.armR, K);
    c.restore();
  }

  root.RenCharacter = { drawRen, C };
})(this);
