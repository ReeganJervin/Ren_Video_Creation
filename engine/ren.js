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
    // when turned, the far ear slides in behind the head and sits a little lower
    const far = Math.sign(K.f) === -i ? turnOf(K.f) : 0;
    c.save();
    c.translate(i * 48 + K.f * 10 - i * 30 * far, -48 + 10 * far);
    c.rotate(i * 0.3 + (i < 0 ? -K.earL : K.earR) - i * 0.12 * far);
    c.scale(1 - 0.15 * far, 1 - 0.08 * far);
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

  // How far the head is turned into a three-quarter/side view: 0 below |f| = 0.3, 1 at |f| = 0.85.
  const turnOf = f => clamp((Math.abs(f) - 0.3) / 0.55);
  // Snout that pokes out past the head outline on the facing side when turned.
  const snout = f => { const a = turnOf(f), s = Math.sign(f) || 1; return { a, x: s * (62 + 30 * a), rx: 16 + 16 * a, tip: s * (62 + 30 * a + 16 + 16 * a) }; };

  // Round head with small orange cheek tufts and a little tuft on top. Below the eyes it is never
  // wider than at eye level, apart from the tufts. The far tuft shrinks when the head turns.
  const CHEEK = [[104, 14], [95, 22], [104, 32], [91, 40], [84, 48]];
  function headPath(c, f) {
    const a = turnOf(f), kR = f < 0 ? 1 - 0.8 * a : 1, kL = f > 0 ? 1 - 0.8 * a : 1;
    const side = (k, s) => CHEEK.map(([x, y]) => [s * (90 + (x - 90) * k), y]);
    const R = side(kR, 1), L = side(kL, -1).reverse(), lEnd = L.shift();
    c.beginPath();
    c.moveTo(-92, 4);
    c.bezierCurveTo(-98, -48, -54, -84, 0, -84);
    c.bezierCurveTo(54, -84, 98, -48, 92, 4);
    tufts(c, [92, 4], R, 5, -1);
    c.bezierCurveTo(R[4][0] - 18, 66, 30, 78, 0, 78);
    c.bezierCurveTo(-30, 78, lEnd[0] + 18, 66, lEnd[0], lEnd[1]);
    tufts(c, lEnd, [...L, [-92, 4]], 5, -1);
    c.closePath();
    c.moveTo(-22, -70);
    tufts(c, [-22, -70], [[-12, -92], [-4, -82], [6, -98], [10, -84], [22, -92], [24, -70]], 4, -1);
    c.closePath();
    if (a > 0) { const S = snout(f); c.moveTo(S.x + S.rx, 34); c.ellipse(S.x, 34, S.rx, 17, 0, 0, Math.PI * 2); c.closePath(); }
  }

  // eyes: 'normal' | 'happy' (^ arcs) | 'wide' | 'sleepy' (closed) | 'shy' (glossy) | 'playful' (wink, for Yuki)
  function drawEye(c, ex, ey, i, K) {
    const far = Math.sign(K.f) === -i ? Math.abs(K.f) : 0;
    c.save(); c.translate(ex, ey);
    c.scale((1 - 0.5 * far) * (1 + 0.1 * K.wide), 1 + 0.12 * K.wide);
    c.strokeStyle = C.line; c.lineCap = 'round';
    if (K.eyes === 'happy' || (K.eyes === 'playful' && i > 0)) {
      c.lineWidth = 5; c.beginPath(); c.moveTo(-17, 7); c.quadraticCurveTo(0, -15, 17, 7); c.stroke();
      c.restore(); return;
    }
    const open = 1 - K.blink;
    if (K.eyes === 'sleepy' || open < 0.15) {
      c.lineWidth = 4.5; c.beginPath(); c.moveTo(-17, 2); c.quadraticCurveTo(0, 13, 17, 2); c.stroke();
      if (K.eyes === 'sleepy') { c.lineWidth = 3; c.beginPath(); c.moveTo(i * 16, 3); c.lineTo(i * 22, 0); c.stroke(); }
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
      case 'tinyfrown': c.beginPath(); c.moveTo(-5, 7); c.quadraticCurveTo(0, 3, 5, 7); c.stroke(); break;
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

  function drawHead(c, K) {
    const f = K.f;
    c.save();
    c.translate(0, -142); c.rotate(K.tilt); c.translate(f * 6, -68);
    drawEar(c, -1, K); drawEar(c, 1, K);
    const S = snout(f), mx = f * 26 + (S.tip - 8 - f * 26) * S.a;   // muzzle centre slides out onto the snout
    headPath(c, f); fillUnion(c, C.fur);
    c.save(); c.clip();
    // small soft sheen on the crown
    c.save(); c.translate(f * 16, -56); c.scale(1, 0.6);
    const sh = c.createRadialGradient(0, 0, 0, 0, 0, 44);
    sh.addColorStop(0, 'rgba(252,192,128,0.45)'); sh.addColorStop(1, 'rgba(252,192,128,0)');
    c.fillStyle = sh; c.fillRect(-44, -44, 88, 88); c.restore();
    if (f) { c.fillStyle = C.furD; c.globalAlpha = 0.3 * Math.abs(f); c.beginPath(); c.ellipse(-Math.sign(f) * 92, 0, 36, 90, 0, 0, Math.PI * 2); c.fill(); }
    // cream only on the muzzle, chin and the inner/lower cheeks (fur-edged); the outer cheek tufts stay orange
    c.globalAlpha = 1; c.fillStyle = C.cream;
    const my = f * 26 + (mx - f * 26) * 0.8, sx = f * 14 + (my - f * 26) * 0.45;
    c.beginPath();
    c.moveTo(-64 + sx, 78);
    tufts(c, [-64 + sx, 78], [[-64 + sx, 56], [-56 + sx, 60], [-52 + sx, 46], [-44 + sx, 50], [-38 + sx, 40]], 3, -1);
    c.bezierCurveTo(-30 + sx, 46, -24 + my, 44, -17 + my, 28);
    c.quadraticCurveTo(my, 17, 17 + my, 28);
    c.bezierCurveTo(24 + my, 44, 30 + sx, 46, 38 + sx, 40);
    tufts(c, [38 + sx, 40], [[44 + sx, 50], [52 + sx, 46], [56 + sx, 60], [64 + sx, 56], [64 + sx, 78]], 3, -1);
    c.lineTo(64 + sx, 120); c.lineTo(-64 + sx, 120); c.closePath(); c.fill();
    if (S.a > 0.5) { c.beginPath(); c.ellipse(S.x + Math.sign(f) * 4, 40, S.rx, 12, 0, 0, Math.PI * 2); c.fill(); }
    // shy: a blush band across the nose
    if (K.blushBoost > 0.4) {
      c.save(); c.translate(mx * 0.7, 28); c.scale(1, 0.28);
      const bg = c.createRadialGradient(0, 0, 0, 0, 0, 80), ba = clamp((K.blushBoost - 0.4) * 1.4);
      bg.addColorStop(0, `rgba(${C.blush},${0.55 * ba})`); bg.addColorStop(1, `rgba(${C.blush},0)`);
      c.fillStyle = bg; c.fillRect(-80, -80, 160, 160); c.restore();
    }
    c.restore();
    // cream eyebrow dots
    c.fillStyle = C.cream;
    [-1, 1].forEach(i => { c.beginPath(); c.ellipse(i * 26 + f * 18, -42, 7.5, 4.5, i * 0.25, 0, Math.PI * 2); c.fill(); });
    // soft blush
    [-1, 1].forEach(i => {
      const x = i * 60 + f * 16, y = 38, r = 20 + K.blushBoost * 8, a = clamp(0.5 + K.blushBoost * 0.6);
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${C.blush},${a})`); g.addColorStop(0.6, `rgba(${C.blush},${a * 0.6})`); g.addColorStop(1, `rgba(${C.blush},0)`);
      c.fillStyle = g; c.beginPath(); c.ellipse(x, y, r, r * 0.62, 0, 0, Math.PI * 2); c.fill();
    });
    drawEye(c, -37 + f * 22, 2, -1, K);
    drawEye(c, 37 + f * 22, 2, 1, K);
    if (K.brows > 0) {
      // worried brows: inner ends raised
      c.save(); c.globalAlpha = K.brows; c.strokeStyle = C.line; c.lineWidth = 4; c.lineCap = 'round';
      [-1, 1].forEach(i => { const bx = i * 37 + f * 20; c.beginPath(); c.moveTo(bx - i * 12, -38); c.lineTo(bx + i * 10, -30); c.stroke(); });
      c.restore();
    }
    // nose + mouth
    c.save(); c.translate(mx, 30);
    path(c, () => { c.moveTo(-7, -3); c.quadraticCurveTo(0, -6, 7, -3); c.quadraticCurveTo(4, 4, 0, 5); c.quadraticCurveTo(-4, 4, -7, -3); });
    c.fillStyle = C.eye; c.fill();
    c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.ellipse(-2, -2.5, 2.2, 1.2, 0, 0, Math.PI * 2); c.fill();
    c.translate(0, 9); drawMouth(c, K);
    c.restore();
    c.restore();
  }

  function drawArm(c, i, ang, K) {
    // resting arms hang along the sides with the paws by the hips; folded in (holding) they are shorter
    const len = 64 - 16 * clamp(-ang / 1.2);
    c.save();
    c.translate(i * 44 + K.f * 4, -122);
    c.rotate(i < 0 ? ang : -ang);
    // dark brown paw fading into the orange
    const g = c.createLinearGradient(0, -4, 0, len);
    g.addColorStop(0, C.fur); g.addColorStop(0.55, C.fur); g.addColorStop(0.82, C.paw); g.addColorStop(1, C.paw);
    path(c, () => c.roundRect(-12, -4, 24, len + 4, 12)); fillStroke(c, g);
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
