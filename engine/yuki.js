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
  function shade(c, x, y, rx, ry, a, col = C.furD) {
    c.save(); c.translate(x, y); c.scale(1, ry / rx);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(246,223,227,0)');
    c.globalAlpha = a; c.fillStyle = g; c.fillRect(-rx, -rx, rx * 2, rx * 2); c.restore();
  }

  // ---------- ears ----------
  // A long ear grown along a spine from its base at (x, y): `rot` leans the whole ear (positive = to the right),
  // `bend` curls the upper part (positive = to the right) so ears can droop, flop and bounce.
  function earAt(c, x, y, rot, bend, sx = 1, len = 140) {
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
    c.beginPath(); smooth([...IL, ...[...IR].reverse()]); c.closePath();
    const g = c.createLinearGradient(0, 0, px, py);
    g.addColorStop(0, C.pink); g.addColorStop(1, '#f9cbd5');
    c.fillStyle = g; c.fill();
    c.restore();
  }
  // Ear lean/bend for one side (s = -1 left, +1 right): droop leans the ear outward and curls it down,
  // `perk` (negative droop) straightens it, landing squash makes it bounce.
  function earPose(K, s, extraFlop = 0) {
    const d = (s < 0 ? K.earL : K.earR), bounce = (1 - K.sy) * 3 + (K.h > 0 ? -0.06 : 0);
    const droop = Math.max(0, d), perk = Math.max(0, -d);
    return { rot: s * (0.1 + droop * 0.75 + extraFlop * 0.3 - perk * 0.3), bend: s * (droop * 1.9 + extraFlop * 2.4 + bounce) };
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
  function drawEye(c, ex, ey, i, K, squeeze = 1, bold = false) {
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
    c.beginPath(); c.arc(-5 + lx * 0.6, -8 + ly * 0.6, 7.5, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(6 + lx, 9 + ly, 3.2, 0, Math.PI * 2); c.fill();
    if (K.eyes === 'shy') {
      c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 2.6;
      c.beginPath(); c.ellipse(0, 0, 13, 17, 0, 0.25 * Math.PI, 0.75 * Math.PI); c.stroke();
      c.beginPath(); c.arc(-7 + lx, 4 + ly, 2.2, 0, Math.PI * 2); c.fill();
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
    switch (K.mouth) {
      case 'open': openShape(1); break;
      case 'talk':
        if (/frown/.test(K.moodMouth || '')) worried(K.talk, K.moodMouth === 'frown' ? 6.5 : 5);
        else if (K.moodMouth === 'o') { c.beginPath(); c.ellipse(0, 8, 5.5 * (0.8 + 0.2 * K.talk), 7 * (0.55 + 0.45 * K.talk), 0, 0, Math.PI * 2); c.fillStyle = C.mouth; c.fill(); c.stroke(); }   // surprised: a round o
        else if (K.moodMouth === 'pout') downShape(K.talk * 0.7, 5);
        else openShape(K.talk);
        break;
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
    const inY = v > 0 ? -34 : -22, outY = v > 0 ? -26 : -32;
    c.save(); c.globalAlpha = clamp(Math.abs(v)); c.strokeStyle = C.line; c.lineWidth = 4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x + inward * 11 * k, inY); c.lineTo(x - inward * 9 * k, outY); c.stroke();
    c.restore();
  }
  // Head pivot on the neck; the head is drawn 10% larger than its path coordinates.
  const HS = 1.1, HY = -183;
  function headFrame(c, K, dx) { c.translate(0, -112); c.rotate(K.tilt); c.translate(dx, HY + 112); c.scale(HS, HS); }
  // a point given in head coordinates, in body coordinates (ignoring tilt) — used to send paws to the face
  const headPt = (dx, x, y) => [dx + HS * x, HY + HS * y];

  // ---------- arms ----------
  // An arm growing out of the body at the shoulder S and ending in a paw at P. The elbow bows out
  // toward side `out`; only the arm's own edges are outlined, so it joins the body outline at the shoulder.
  function armCurve(c, S, P, out) {
    const [sx, sy] = S, [px, py] = P, dx = px - sx, dy = py - sy, d = Math.hypot(dx, dy) || 1;
    const mx = (sx + px) / 2 + (-dy / d) * out * 7, my = (sy + py) / 2 + (dx / d) * out * 7;
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
  function pawFrom(S, ang, i, len = 34, curl = 1.1) {
    const e = Math.max(-1.6, ang - curl * (1 - clamp(ang / 1.6)));
    return [S[0] + i * len * Math.sin(e), S[1] + len * Math.cos(e)];
  }
  // The shoulder sits on the body edge while the paw is low and slides inside the body as the paw rises,
  // so a raised arm never shows an open root.
  function armFrom(c, Sedge, Sin, P, out) {
    const k = clamp((Sedge[1] - P[1] + 10) / 40);
    armCurve(c, [lerp(Sedge[0], Sin[0], k), lerp(Sedge[1], Sin[1], k)], P, out);
  }
  // move a paw toward a face target by the pawPose weight
  const toward = (P, T, K) => (T ? [lerp(P[0], T[0], clamp(K.pawW || 0)), lerp(P[1], T[1], clamp(K.pawW || 0))] : P);

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
    const eL = earPose(K, -1), eR = earPose(K, 1, K.flop || 0);
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
      const ph = K.phase + (k ? Math.PI : 0), lx = x0 + Math.sin(ph) * 8 * K.walk, lift = Math.max(0, Math.cos(ph)) * 6 * K.walk;
      path(c, () => c.ellipse(lx, -11 - lift, 22, 13, 0, 0, Math.PI * 2)); fillStroke(c, C.fur);
      c.strokeStyle = C.furD; c.lineWidth = 2.5;
      [-6, 6].forEach(o => { c.beginPath(); c.moveTo(lx + o, -lift - 2); c.lineTo(lx + o, -lift - 8); c.stroke(); });
    });
  }
  function drawFront(c, K) {
    drawFeet(c, K, [-24 + K.f * 6, 24 + K.f * 6]);
    c.translate(0, -Math.abs(Math.sin(K.phase)) * 4 * K.walk);
    frontBodyPath(c); c.fillStyle = C.fur; c.fill();
    c.save(); c.clip();
    shade(c, -62, -46, 40, 56, 0.7); shade(c, 62, -46, 40, 56, 0.7); shade(c, 0, -12, 60, 18, 0.6);
    c.restore();
    frontBodyPath(c); c.lineWidth = 4; c.strokeStyle = C.line; c.stroke();
    collar(c, K.f * 14, 0);
    drawFrontHead(c, K);
    bow(c, K.f * 14, -98, 1.25);
    const dx = K.f * 6;
    const tgt = K.pawPose === 'cheeks' ? [headPt(dx, -22, 48), headPt(dx, 22, 48)] : K.pawPose === 'yawn' ? [null, headPt(dx, 8 + K.f * 22, 36)] : [null, null];
    [-1, 1].forEach((i, k) => { const S = [i * 48 + K.f * 4, -88]; armFrom(c, S, [i * 36 + K.f * 4, -86], toward(pawFrom(S, i < 0 ? K.armL : K.armR, i), tgt[k], K), i); });
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
    const eN = earPose(K, -1, nearFlower ? K.flop || 0 : 0), eF = earPose(K, 1, nearFlower ? 0 : K.flop || 0);
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
    cottonTail(c, -66, -40, 20);
    drawFeet(c, K, [-18, 30]);
    c.translate(0, -Math.abs(Math.sin(K.phase)) * 4 * K.walk);
    frontBodyPath(c); c.fillStyle = C.fur; c.fill();
    c.save(); c.clip();
    shade(c, -64, -46, 46, 56, 0.8); shade(c, 64, -50, 30, 50, 0.4); shade(c, 10, -12, 60, 18, 0.6);
    c.restore();
    frontBodyPath(c); c.lineWidth = 4; c.strokeStyle = C.line; c.stroke();
    collar(c, 20, 0.4);
    drawThreeHead(c, K);
    bow(c, 20, -98, 1.15);
    const tgt = K.pawPose === 'cheeks' ? [headPt(6, -14, 48), headPt(6, 66, 44)] : K.pawPose === 'yawn' ? [null, headPt(6, 46, 36)] : [null, null];
    const sh = [[-46, -88], [54, -88]], inner = [[-36, -86], [44, -86]];
    [-1, 1].forEach((i, k) => armFrom(c, sh[k], inner[k], toward(pawFrom(sh[k], i < 0 ? K.armL : K.armR, i, k ? 30 : 34), tgt[k], K), i));
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
      case 'frown': case 'tinyfrown': case 'pout': line(-3); break;
      default: c.save(); c.translate(68, 14); c.scale(0.55, 0.55); drawMouth(c, K); c.restore();
    }
  }
  // the near arm in profile: a short curve drawn INSIDE the body outline (not a separate stick arm)
  function sideArm(c, S, P) {
    // a small rounded arm with a paw, growing from inside the body at S; only its own edges are outlined
    const [sx, sy] = S, [px, py] = P, dx = px - sx, dy = py - sy, d = Math.hypot(dx, dy) || 1;
    const mx = (sx + px) / 2 + (-dy / d) * -6, my = (sy + py) / 2 + (dx / d) * -6;
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
    const eN = earPose(K, -1, nearFlower ? K.flop || 0 : 0), eF = earPose(K, -1, nearFlower ? 0 : K.flop || 0);
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
    drawEye(c, 0, 0, 1, K, 0.9, true);
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
    // round cotton tail at the lower back
    cottonTail(c, -70, -38, 21);
    // small feet with one slightly forward
    [[-14, Math.PI, true], [14, 0, false]].forEach(([x0, off, far]) => {
      const ph = K.phase + off, lx = x0 + Math.sin(ph) * 8 * K.walk, lift = Math.max(0, Math.cos(ph)) * 5 * K.walk;
      path(c, () => c.ellipse(lx + 4, -8 - lift, 20, 10, 0, 0, Math.PI * 2)); fillStroke(c, C.fur);
      if (far) { c.fillStyle = 'rgba(200,150,160,0.25)'; c.fill(); }
    });
    c.translate(0, -Math.abs(Math.sin(K.phase)) * 4 * K.walk);
    sideBodyPath(c); c.fillStyle = C.fur; c.fill();
    c.save(); c.clip(); shade(c, -44, -46, 34, 48, 0.7); shade(c, 8, -8, 50, 14, 0.5); c.restore();
    sideBodyPath(c); c.lineWidth = 4; c.strokeStyle = C.line; c.stroke();
    // No neck: the head sits directly on the body; a small bow at the throat
    collar(c, 26, 1);
    drawSideHead(c, K);
    // the arm is a short curve drawn INSIDE the body outline hanging at the front
    const S = [22, -92], ang = K.armR, a = ang < 0 ? 0.7 - ang * 0.35 : ang + 0.15, len = 44;
    const P = [S[0] + len * Math.sin(a), S[1] + len * Math.cos(a)];
    const tgt = K.pawPose === 'cheeks' ? headPt(4, 56, 38) : K.pawPose === 'yawn' ? headPt(4, 74, 38) : null;
    bow(c, 44, -100, 0.95, true, 0.25);
    sideArm(c, [S[0] - 6, S[1] + 2], toward(P, tgt, K));
  }

  // ---------- views ----------
  const VIEWS = { front: drawFront, three: drawThree, side: drawSide };
  const viewAt = a => (a < 0.3 ? 'front' : a < 0.7 ? 'three' : 'side');
  const FADES = [[0.26, 0.34], [0.65, 0.75]];   // brief crossfades around the switch points
  // Three-quarter and side views are drawn facing right; facing left mirrors them.
  // `flipped` tells the turned views we see Yuki's left side, so the flower on her left ear is on the near side
  const mirror = K => ({ ...K, f: -K.f, lookX: -K.lookX, tilt: -K.tilt, earL: K.earR, earR: K.earL, flipped: true });

  function drawView(c, K, view) {
    c.save();
    c.translate(K.x, K.y - K.h);
    c.scale(K.s * K.sx, K.s * K.sy);
    c.lineJoin = 'round'; c.lineCap = 'round';
    // contact shadow
    c.save(); c.translate(0, K.h / (K.s * K.sy));
    c.fillStyle = 'rgba(30,40,20,0.22)'; c.beginPath(); c.ellipse(0, 0, 66 * (1 - K.h / 260), 11 * (1 - K.h / 260), 0, 0, Math.PI * 2); c.fill();
    c.restore();
    if (view !== 'front' && K.f < 0) { c.scale(-1, 1); K = mirror(K); }
    VIEWS[view](c, K);
    c.restore();
  }

  let bufs = null;
  function drawYuki(c, K) {
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

  root.YukiCharacter = { drawYuki, C };
})(this);
