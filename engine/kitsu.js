// Kitsu — the fixed character. Proportions, palette and features never change between videos.
// drawKitsu(ctx, K) draws Kitsu with feet at (K.x, K.y); K holds pose/expression values.
(function (root) {
  const C = {
    line: '#4a2616', fur: '#f39a4a', furD: '#e2802f', cream: '#fff3e0', tip: '#5a2d18',
    paw: '#5b3020', pink: '#f7bcb4', blush: 'rgba(255,120,135,0.42)', eye: '#3a1b0d', iris: '#8e4c1f',
    scarf: '#6c2232', scarfD: '#4f1624', petal: '#ffe6df', petalC: '#f5c542', mouth: '#8c2a2e', tongue: '#ff8f9a',
  };
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  function path(c, fn) { c.beginPath(); fn(); c.closePath(); }
  function fillStroke(c, fill, lw = 4) { c.fillStyle = fill; c.fill(); c.lineWidth = lw; c.strokeStyle = C.line; c.stroke(); }

  function drawTail(c, K) {
    const side = K.f >= 0 ? 1 - 2 * K.f : 1;
    const sg = side >= 0 ? 1 : -1, spread = Math.max(0.45, Math.abs(side));
    c.save();
    c.translate(side * 26, -50);
    c.scale(sg * spread, 1);
    c.rotate(0.18 + K.tail);
    const tail = () => path(c, () => {
      c.moveTo(-10, -4);
      c.bezierCurveTo(44, 14, 106, -18, 110, -76);
      c.bezierCurveTo(113, -116, 92, -146, 66, -164);
      c.bezierCurveTo(76, -130, 64, -104, 42, -88);
      c.bezierCurveTo(20, -72, 4, -46, 4, -22);
    });
    tail(); c.fillStyle = C.fur; c.fill();
    c.save(); c.clip();
    c.fillStyle = C.cream;
    path(c, () => { c.moveTo(40, -120); c.quadraticCurveTo(70, -108, 112, -112); c.lineTo(120, -180); c.lineTo(40, -180); });
    c.fill();
    c.fillStyle = C.furD; c.globalAlpha = 0.35;
    path(c, () => { c.moveTo(-10, -4); c.bezierCurveTo(40, 6, 90, -20, 100, -60); c.lineTo(110, -40); c.lineTo(0, 10); }); c.fill();
    c.restore();
    tail(); c.lineWidth = 4; c.strokeStyle = C.line; c.stroke();
    c.restore();
  }

  function drawLegs(c, K) {
    const dir = K.f >= 0 ? 1 : -1;
    [-1, 1].forEach(i => {
      const ph = i < 0 ? K.phase : K.phase + Math.PI;
      const lx = i * 22 + K.f * 6 + Math.sin(ph) * 13 * K.walk * dir;
      const lift = Math.max(0, Math.cos(ph)) * 9 * K.walk;
      path(c, () => c.roundRect(lx - 15, -64 - lift, 30, 40, [14, 14, 4, 4]));
      fillStroke(c, C.fur);
      path(c, () => c.roundRect(lx - 16, -34 - lift, 32, 34, 13));
      fillStroke(c, C.paw);
    });
  }

  function bodyPath(c) {
    path(c, () => {
      c.moveTo(-48, -38);
      c.bezierCurveTo(-60, -84, -42, -146, 0, -148);
      c.bezierCurveTo(42, -146, 60, -84, 48, -38);
      c.bezierCurveTo(42, -10, -42, -10, -48, -38);
    });
  }
  function drawBody(c, K) {
    bodyPath(c); c.fillStyle = C.fur; c.fill();
    c.save(); c.clip();
    c.fillStyle = C.furD; c.globalAlpha = 0.3;
    c.beginPath(); c.ellipse(-K.f * 30 + 40, -70, 26, 70, 0, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 1; c.fillStyle = C.cream;
    path(c, () => {
      const bx = K.f * 14;
      c.moveTo(bx - 26, -60);
      c.quadraticCurveTo(bx - 30, -112, bx - 10, -120);
      c.lineTo(bx - 4, -110); c.lineTo(bx + 2, -122); c.lineTo(bx + 8, -110); c.lineTo(bx + 14, -118);
      c.quadraticCurveTo(bx + 32, -100, bx + 28, -60);
      c.quadraticCurveTo(bx + 24, -26, bx, -24);
      c.quadraticCurveTo(bx - 24, -26, bx - 26, -60);
    });
    c.fill();
    c.restore();
    bodyPath(c); c.lineWidth = 4; c.strokeStyle = C.line; c.stroke();
  }

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
    const cx = K.f * 8, bx = K.f * 18;
    // knot and tails at the side
    const kx = cx - 44;
    path(c, () => { c.moveTo(kx, -142); c.lineTo(kx - 24, -118); c.quadraticCurveTo(kx - 12, -112, kx - 4, -120); });
    fillStroke(c, C.scarfD, 3.5);
    path(c, () => { c.moveTo(kx, -142); c.lineTo(kx - 6, -112); c.quadraticCurveTo(kx + 4, -110, kx + 10, -120); });
    fillStroke(c, C.scarf, 3.5);
    path(c, () => c.ellipse(cx, -140, 52, 15, 0, 0, Math.PI * 2));
    fillStroke(c, C.scarf);
    path(c, () => {
      c.moveTo(bx - 36, -140);
      c.quadraticCurveTo(bx - 14, -104, bx, -94);
      c.quadraticCurveTo(bx + 14, -104, bx + 36, -140);
    });
    fillStroke(c, C.scarf);
    c.strokeStyle = C.scarfD; c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(bx - 18, -134); c.quadraticCurveTo(bx - 6, -114, bx, -104); c.stroke();
    path(c, () => c.ellipse(kx + 2, -140, 8, 7, 0, 0, Math.PI * 2));
    fillStroke(c, C.scarf, 3);
    drawFlower(c, bx + 8, -120, 7);
  }

  function drawEar(c, i, K) {
    c.save();
    c.translate(i * 46 + K.f * 10, -50);
    c.rotate(i * 0.32 + (i < 0 ? -K.earL : K.earR));
    const ear = () => path(c, () => { c.moveTo(-34, 12); c.quadraticCurveTo(-30, -55, 0, -98); c.quadraticCurveTo(30, -55, 34, 12); });
    ear(); c.fillStyle = C.fur; c.fill();
    c.save(); c.clip();
    c.fillStyle = C.tip; c.beginPath(); c.ellipse(0, -104, 46, 46, 0, 0, Math.PI * 2); c.fill();
    c.restore();
    path(c, () => { c.moveTo(-20, 8); c.quadraticCurveTo(-17, -36, 0, -64); c.quadraticCurveTo(17, -36, 20, 8); });
    c.fillStyle = C.pink; c.fill();
    c.fillStyle = C.cream;
    [[-11, 4, 9], [0, -2, 9], [11, 4, 9], [-5, -12, 6], [6, -14, 6]].forEach(([x, y, r]) => { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); });
    ear(); c.lineWidth = 4; c.strokeStyle = C.line; c.stroke();
    c.restore();
  }

  function headPath(c) {
    path(c, () => {
      c.moveTo(-84, 8);
      c.bezierCurveTo(-92, -44, -48, -74, 0, -74);
      c.bezierCurveTo(48, -74, 92, -44, 84, 8);
      c.quadraticCurveTo(96, 22, 104, 30);
      c.quadraticCurveTo(88, 36, 80, 40);
      c.quadraticCurveTo(90, 50, 92, 56);
      c.quadraticCurveTo(70, 58, 58, 60);
      c.bezierCurveTo(40, 72, -40, 72, -58, 60);
      c.quadraticCurveTo(-70, 58, -92, 56);
      c.quadraticCurveTo(-90, 50, -80, 40);
      c.quadraticCurveTo(-88, 36, -104, 30);
      c.quadraticCurveTo(-96, 22, -84, 8);
    });
  }

  function drawEye(c, ex, ey, i, K) {
    const far = (i > 0 && K.f < 0) || (i < 0 && K.f > 0) ? Math.abs(K.f) : 0;
    c.save(); c.translate(ex, ey);
    c.scale((1 - 0.3 * far) * (1 + 0.1 * K.wide), 1 + 0.12 * K.wide);
    c.strokeStyle = C.line; c.lineCap = 'round';
    if (K.eyes === 'happy') {
      c.lineWidth = 5; c.beginPath(); c.moveTo(-14, 6); c.quadraticCurveTo(0, -14, 14, 6); c.stroke();
      c.restore(); return;
    }
    const open = (1 - K.blink) * (K.eyes === 'sleepy' ? 0.42 : 1);
    if (open < 0.15) {
      c.lineWidth = 4.5; c.beginPath(); c.moveTo(-14, 3); c.quadraticCurveTo(0, 9, 14, 3); c.stroke();
      c.restore(); return;
    }
    if (K.eyes === 'sleepy') { c.lineWidth = 4; c.beginPath(); c.moveTo(-16, -20 * open + 2); c.quadraticCurveTo(0, -20 * open - 3, 16, -20 * open + 2); c.stroke(); }
    c.scale(1, open);
    const lx = K.lookX * 4, ly = K.lookY * 4.5;
    c.beginPath(); c.ellipse(0, 0, 15.5, 20, 0, 0, Math.PI * 2); c.fillStyle = C.eye; c.fill();
    c.save(); c.clip();
    c.beginPath(); c.ellipse(lx * 0.8, 7 + ly, 12, 12, 0, 0, Math.PI * 2); c.fillStyle = C.iris; c.fill();
    c.restore();
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(-5 + lx, -8 + ly, 6.5 + K.wide * 1.2, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(5 + lx, 8 + ly, 2.8, 0, Math.PI * 2); c.fill();
    if (K.wide > 0.3) { c.beginPath(); c.arc(6 + lx, -9 + ly, 2.2, 0, Math.PI * 2); c.fill(); }
    c.restore();
  }

  function drawMouth(c, K) {
    c.strokeStyle = C.line; c.lineWidth = 3; c.lineCap = 'round';
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
      default: c.beginPath(); c.moveTo(-10, 1); c.quadraticCurveTo(-5, 8, 0, 1); c.quadraticCurveTo(5, 8, 10, 1); c.stroke();
    }
  }

  function drawHead(c, K) {
    const f = K.f;
    c.save();
    c.translate(0, -142); c.rotate(K.tilt); c.translate(f * 6, -68);
    drawEar(c, -1, K); drawEar(c, 1, K);
    headPath(c); c.fillStyle = C.fur; c.fill();
    c.save(); c.clip();
    c.fillStyle = C.furD; c.globalAlpha = 0.22;
    c.beginPath(); c.ellipse(-f * 40, -60, 90, 30, 0, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 1; c.fillStyle = C.cream;
    c.beginPath(); c.ellipse(f * 14, 38, 80, 34, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(f * 30, 22, 26, 20, 0, 0, Math.PI * 2); c.fill();
    c.restore();
    headPath(c); c.lineWidth = 4; c.strokeStyle = C.line; c.stroke();
    // forehead marks
    c.fillStyle = C.cream;
    [-1, 1].forEach(i => { c.beginPath(); c.ellipse(i * 17 + f * 18, -40, 7, 4.5, i * 0.3, 0, Math.PI * 2); c.fill(); });
    // blush
    c.fillStyle = C.blush; c.globalAlpha = 1 + K.blushBoost;
    [-1, 1].forEach(i => { c.beginPath(); c.ellipse(i * 56 + f * 16, 28, 15 + K.blushBoost * 8, 9 + K.blushBoost * 3, 0, 0, Math.PI * 2); c.fill(); });
    c.globalAlpha = 1;
    drawEye(c, -31 + f * 20, 2, -1, K);
    drawEye(c, 31 + f * 20, 2, 1, K);
    if (K.brows > 0) {
      c.save(); c.globalAlpha = K.brows; c.strokeStyle = C.line; c.lineWidth = 4; c.lineCap = 'round';
      [-1, 1].forEach(i => { const bx = i * 31 + f * 20; c.beginPath(); c.moveTo(bx - i * 12, -31); c.lineTo(bx + i * 10, -23); c.stroke(); });
      c.restore();
    }
    // nose + mouth
    c.save(); c.translate(f * 30, 20);
    path(c, () => { c.moveTo(-7, -3); c.quadraticCurveTo(0, -6, 7, -3); c.quadraticCurveTo(4, 4, 0, 5); c.quadraticCurveTo(-4, 4, -7, -3); });
    c.fillStyle = C.eye; c.fill();
    c.translate(0, 10); drawMouth(c, K);
    c.restore();
    c.restore();
  }

  function drawArm(c, i, ang, K) {
    c.save();
    c.translate(i * 38 + K.f * 4, -120);
    c.rotate(i < 0 ? ang : -ang);
    path(c, () => c.roundRect(-11, -4, 22, 44, 11)); fillStroke(c, C.fur);
    path(c, () => c.ellipse(0, 36, 11.5, 9.5, 0, 0, Math.PI * 2)); fillStroke(c, C.paw);
    c.restore();
  }

  function drawKitsu(c, K) {
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

  // ---------- star + heart ----------
  root.KitsuCharacter = { drawKitsu, C };
})(this);
