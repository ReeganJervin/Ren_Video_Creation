// Scene renderer: draws any compiled story plan. render(t) is deterministic.
(() => {
  const W = 1920, H = 1080;
  const { evalKeys, feetY } = StudioStory;
  let P, KS, REG, CAST = [], DRAW = {};

  // ---------- helpers ----------
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => -(Math.cos(Math.PI * clamp(t)) - 1) / 2;
  const easeOutBack = t => { t = clamp(t); const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  const easeOutBounce = t => {
    t = clamp(t); const n = 7.5625, d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
    return n * (t -= 2.625 / d) * t + 0.984375;
  };
  const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const win = (t, a, b, fi = 0.3, fo = 0.3) => ease((t - a) / fi) * ease((b - t) / fo);
  const bez = (p0, p1, p2, u) => ({ x: (1 - u) * (1 - u) * p0.x + 2 * u * (1 - u) * p1.x + u * u * p2.x, y: (1 - u) * (1 - u) * p0.y + 2 * u * (1 - u) * p1.y + u * u * p2.y });
  const K_ = (name, t) => evalKeys(P.keys[name], t);
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  // colour across the time of day: tau 0 = day, 1 = sunset, 2 = dusk, 3 = night
  const tod = (tau, cols) => {
    const i = Math.min(2, Math.floor(clamp(tau, 0, 3))), u = clamp(tau - i), a = hex(cols[i]), b = hex(cols[i + 1]);
    return `rgb(${a.map((v, k) => Math.round(lerp(v, b[k], u))).join(',')})`;
  };
  const PAL = {
    skyTop: ['#6ec3f4', '#ff9d5c', '#5b4a9e', '#0b1236'], skyMid: ['#a8dcf7', '#ffc488', '#c0709a', '#1d2a66'], skyBot: ['#e6f6ff', '#ffe7c2', '#f5a77a', '#3b3f8c'],
    far: ['#9fcf9a', '#e8a87c', '#8a6a9a', '#2a2d5e'], mid: ['#7fbf6e', '#a3c48a', '#6f8f86', '#1f3a4a'], tree: ['#4f8f4f', '#5e8b5a', '#3f6a5a', '#14303a'],
    trunk: ['#7a5132', '#7a5132', '#5a4038', '#1a2230'], front: ['#79b862', '#86b56f', '#5f8a6a', '#1d3b3c'], knoll: ['#8cc873', '#97c47c', '#6c9a72', '#24474a'],
    grass: ['#5a9a4e', '#5e8b5a', '#4a7060', '#163032'], stem: ['#4f8a48', '#4f7a48', '#3f6a50', '#1a3a3a'], cloud: ['#ffffff', '#fff8ef', '#e9b8c8', '#4a4f8f'],
    sun: ['#fffbe8', '#fff4d6', '#ffcf9a', '#ffcf9a'], grade: ['#ffffff', '#fff3e2', '#e4d4ee', '#aab2e6'], tint: ['#ffffff', '#ffb070', '#a080c0', '#3a4aa0'],
  };

  // ---------- characters ----------
  const ARM_R = 0.16;
  const A_ = (id, name, t) => evalKeys(P.actors[id].keys[name], t);
  // Position along the ground. Hopping characters travel in small hops and pause briefly on each landing.
  function actorX(id, t) {
    const a = P.actors[id];
    let x = a.startX;
    for (const w of a.walks) {
      if (t >= w.t1) x = w.x1;
      else if (t > w.t0) {
        const u = (t - w.t0) / (w.t1 - w.t0);
        if (!w.hops) return lerp(w.x0, w.x1, ease(u));
        const k = Math.min(w.hops - 1, Math.floor(u * w.hops)), v = u * w.hops - k;
        return lerp(w.x0, w.x1, (k + ease(clamp(v / 0.8))) / w.hops);
      }
      else break;
    }
    return x;
  }
  // height and landing squash of a travel hop at t (null when not hopping along)
  function travelHop(id, t) {
    for (const w of P.actors[id].walks) {
      if (!w.hops || t <= w.t0 || t >= w.t1) continue;
      const u = (t - w.t0) / (w.t1 - w.t0), k = Math.floor(u * w.hops), v = u * w.hops - k;
      return { h: v < 0.8 ? Math.sin(v / 0.8 * Math.PI) * 30 : 0, land: v >= 0.8 ? Math.sin((v - 0.8) / 0.2 * Math.PI) : 0 };
    }
    return null;
  }
  const onStage = (id, t) => { const x = actorX(id, t); return x > -60 && x < 1980; };
  // Body: position, squash, facing, arms. Never depends on props (so props can follow it).
  function actorBody(id, t) {
    const a = P.actors[id], n = CAST.indexOf(id);
    const x = actorX(id, t), v = (actorX(id, t + 0.02) - actorX(id, t - 0.02)) / 0.04;
    const walk = REG[id].moves === 'hop' ? 0 : clamp(Math.abs(v) / 140);
    let h = 0, sx = 1, sy = 1, hopping = false;
    for (const hp of a.hops) {
      const pre = hp.t0 - 0.14;
      if (t > pre && t < hp.t0) { const q = Math.sin((t - pre) / 0.14 * Math.PI); sy *= 1 - 0.09 * q; sx *= 1 + 0.07 * q; }
      if (t >= hp.t0 && t <= hp.t1) {
        const u = (t - hp.t0) / (hp.t1 - hp.t0); h = Math.sin(u * Math.PI) * hp.h; hopping = true;
        const st = 0.07 * Math.abs(Math.cos(u * Math.PI)) * Math.sin(u * Math.PI) * 2; sy *= 1 + st; sx *= 1 - st * 0.7;
      }
      if (t > hp.t1 && t < hp.t1 + 0.2) { const q = Math.sin((t - hp.t1) / 0.2 * Math.PI); sy *= 1 - 0.12 * q; sx *= 1 + 0.09 * q; }
    }
    const th = travelHop(id, t);
    if (th) { h += th.h; sy *= 1 - 0.1 * th.land; sx *= 1 + 0.08 * th.land; }
    const crouch = A_(id, 'crouch', t);
    // breathing and idle sway, each character on its own phase
    sy *= crouch * (1 + 0.012 * Math.sin(t * 2.6 + n * 1.7)); sx *= 1 + (1 - crouch) * 0.45;
    const phase = x / 160 * Math.PI * 2, swing = Math.sin(phase) * 0.35 * walk, idle = Math.sin(t * 2 + n * 2.1) * 0.04;
    let wave = 0; for (const w of a.waves) wave += Math.sin((t - w.a) * 9) * 0.35 * win(t, w.a, w.b, 0.2, 0.3);
    return {
      id, x, y: feetY(x), h, sx, sy, s: KS, f: A_(id, 'facing', t), walk, phase, hopping,
      armL: A_(id, 'armL', t) + swing + idle, armR: A_(id, 'armR', t) - swing + idle + wave,
    };
  }
  const toWorld = (K, lx, ly) => ({ x: K.x + lx * K.s * K.sx, y: K.y - K.h + ly * K.s * K.sy });
  const headOf = (id, t) => { const B = actorBody(id, t); return { vis: true, ...toWorld(B, B.f * 6, REG[id].head) }; };

  // what each mood looks like comes from the character registry; anything a mood leaves out is neutral
  const NEUTRAL = { eyes: 'normal', mouth: 'smile', wide: 0, brows: 0, droop: 0, blush: 0, lookY: 0, wag: 0, puff: 0, flop: 0, pawPose: null, pawW: 0 };
  const moodLook = (id, name) => ({ ...NEUTRAL, ...REG[id].moods[name] });
  function moodAt(id, t) {
    const a = P.actors[id];
    let cur = 'normal', prev = 'normal', since = -10;
    for (const m of a.moods) if (m.t <= t) { prev = cur; cur = m.mood; since = m.t; }
    for (const e of a.exprs) if (t >= e.a - 0.25 && t < e.b) { prev = cur; cur = e.mood; since = e.a - 0.25; }
    return { cur: moodLook(id, cur), prev: moodLook(id, prev), w: ease((t - since) / 0.3) };
  }

  function actorState(id, t) {
    const K = actorBody(id, t), a = P.actors[id], def = REG[id], n = CAST.indexOf(id);
    const m = moodAt(id, t), mix = k => lerp(m.prev[k] || 0, m.cur[k] || 0, m.w), pick = k => (m.w > 0.5 ? m.cur : m.prev)[k];
    let lx = A_(id, 'lookX', t), ly = A_(id, 'lookY', t) + mix('lookY');
    const head = toWorld(K, K.f * 6, def.head);
    for (const L of a.lookAt) {
      const w = win(t, L.a, L.b, 0.3, 0.4); if (w <= 0) continue;
      const p = L.target === 'star' ? starAt(t) : L.target === 'heart' ? heartAt(t) : headOf(L.target.actor, t);
      if (!p || !p.vis) continue;
      const dx = p.x - head.x, dy = p.y - head.y, nn = Math.hypot(dx, dy) || 1;
      lx = lerp(lx, clamp(dx / nn * 1.3, -1, 1), w); ly = lerp(ly, clamp(dy / nn * 1.3, -1, 1), w);
    }
    // listening: characters standing still turn their eyes (and a little of the body) to whoever is talking;
    // the speaker glances at the listener
    if (CAST.length > 1 && onStage(id, t)) {
      for (const v of P.voice) {
        if (v.who === 'narrator') continue;
        const w = win(t, v.t - 0.25, v.t + v.len + 0.4, 0.35, 0.45); if (w <= 0) continue;
        const other = v.who === id ? CAST.find(o => o !== id && onStage(o, t)) : v.who;
        if (!other || other === id || !onStage(other, t)) continue;
        const dir = Math.sign(actorX(other, t) - K.x) || 1, k = w * (v.who === id ? 0.5 : 1) * (1 - clamp(Math.abs(K.f) / 0.3));
        lx = lerp(lx, dir * 0.85, k); ly = lerp(ly, 0, k * 0.5);
        K.f += dir * 0.2 * k;
      }
    }
    K.lookX = clamp(lx, -1, 1); K.lookY = clamp(ly, -1, 1);
    K.tilt = A_(id, 'tilt', t) + Math.sin(t * 0.9 + n * 1.3) * 0.025 + mix('brows') * 0.06;
    K.eyes = pick('eyes'); K.mouth = pick('mouth'); K.wide = mix('wide'); K.brows = mix('brows');
    K.blushBoost = mix('blush'); K.puff = mix('puff'); K.flop = mix('flop');
    K.pawPose = m.cur.pawPose || m.prev.pawPose;
    K.pawW = lerp(m.prev.pawPose === K.pawPose ? m.prev.pawW : 0, m.cur.pawPose === K.pawPose ? m.cur.pawW : 0, m.w);
    if (K.hopping) K.eyes = 'happy';
    K.talk = 0;
    for (const v of P.voice) {
      if (v.who !== id || t < v.t || t >= v.t + v.len) continue;
      K.mouth = 'talk';
      K.talk = 0.25 + 0.75 * Math.abs(Math.sin((t - v.t) * 13.5)) * (0.6 + 0.4 * Math.abs(Math.sin((t - v.t) * 4.7 + 1)));
    }
    if (K.mouth === 'talk' && K.pawPose === 'yawn') K.pawW *= 0.15;   // move the paw away so the talking mouth shows
    K.blink = 0;
    if (K.eyes !== 'happy') for (const b of a.blinks) { const u = (t - b) / (K.eyes === 'sleepy' ? 0.4 : 0.18); if (u > 0 && u < 1) K.blink = Math.sin(u * Math.PI); }
    let tw = 0, side = 1;
    a.twitches.forEach((tt, i) => { const u = (t - tt) / 0.32; if (u > 0 && u < 1) { tw = Math.sin(u * Math.PI) * 0.32; side = i % 2 ? 1 : -1; } });
    const base = mix('droop') - 0.12 * K.wide;
    K.earL = base + (side < 0 ? tw : 0); K.earR = base + (side > 0 ? tw : 0);
    const wag = Math.max(mix('wag'), K.hopping ? 1 : 0);
    K.tail = Math.sin(t * 2.3) * 0.15 + K.walk * Math.sin(K.phase) * 0.18 + wag * Math.sin(t * 9) * 0.2;
    return K;
  }

  // ---------- star / hearts ----------
  let starSegs = [], flickers = [];
  function starAt(t) {
    if (!starSegs.length || t < starSegs[0].t0) return null;
    let seg = null; for (const s of starSegs) if (s.t0 <= t) seg = s; else break;
    let bright = K_('bright', t), p, r = 26, alpha = 1, flare = 0;
    for (const f of flickers) if (t >= f.t0 && t < f.t1) bright = 0.25 + 0.14 * (Math.sin(t * 23) + Math.sin(t * 37 + 1)) * 0.5;
    const u = seg.t1 ? (t - seg.t0) / (seg.t1 - seg.t0) : 0;
    const chest = () => { const B = actorBody(seg.who, t), d = REG[seg.who]; const up = clamp((B.armL + 1.2) / 3.9); return toWorld(B, lerp(B.f * 40, 0, up), lerp(d.chest, d.overhead, ease((up - 0.45) / 0.55))); };
    switch (seg.type) {
      case 'appear': p = seg.at; r = seg.r; alpha = ease(u); break;
      case 'sky': p = seg.at; r = seg.r; if (seg.arrive && t < seg.t0 + 0.6) flare = Math.sin((t - seg.t0) / 0.6 * Math.PI) * 0.8; break;
      case 'fall': {
        const c = { x: (seg.from.x + seg.to.x) / 2 + 280 * Math.sign(seg.from.x - seg.to.x || 1), y: (seg.from.y + seg.to.y) / 2 };
        p = bez(seg.from, c, seg.to, ease(u)); r = lerp(seg.r0, seg.r1, ease(u)); break;
      }
      case 'ground': { const a = t - seg.t0; p = { x: seg.at.x, y: seg.at.y - Math.abs(Math.sin(a * 9)) * 18 * Math.exp(-a * 5) }; r = seg.r; break; }
      case 'pickup': { const q = ease(u), ch = chest(); p = { x: lerp(seg.from.x, ch.x, q), y: lerp(seg.from.y, ch.y, q) - Math.sin(q * Math.PI) * 40 }; r = lerp(26, 28, q); break; }
      case 'held': case 'raise': case 'lower': p = chest(); r = 28 + 2 * bright; break;
      case 'rise': {
        const from = seg.from === 'overhead' ? (seg._from || (seg._from = (() => { const B = actorBody(seg.who, seg.t0); return toWorld(B, 0, REG[seg.who].overhead); })())) : seg.from;
        const c = { x: from.x - (seg.to.x - from.x) * 0.9, y: Math.min(from.y, seg.to.y) - 50 };
        p = bez(from, c, seg.to, ease(u)); r = lerp(seg.r0, seg.r1, ease(u)); break;
      }
      case 'vanish': { const before = starAt(seg.t0 - 0.001) || { x: 0, y: 0, r: 20 }; p = before; r = before.r; alpha = 1 - ease(u); if (u >= 1) return null; break; }
      default: return null;
    }
    for (const tw of P.twinkles) { const q = (t - tw) / 0.32; if (q > 0 && q < 1) flare = Math.max(flare, Math.sin(q * Math.PI)); }
    return { vis: true, x: p.x, y: p.y, r, alpha, bright, flare, happy: bright > 0.8 };
  }
  function heartAt(t) {
    for (const h of P.heartDown) {
      if (t < h.t0 || t > h.burst) continue;
      const B = actorBody(h.who, t), hold = toWorld(B, 0, REG[h.who].catch);
      if (t < h.t1) { const u = ease((t - h.t0) / (h.t1 - h.t0)); return { vis: true, x: lerp(h.from.x, hold.x, u) + Math.sin(u * Math.PI * 3) * 50 * (1 - u), y: lerp(h.from.y, hold.y, u), sc: easeOutBack((t - h.t0) / 0.3) }; }
      return { vis: true, x: hold.x, y: hold.y, sc: 1 + 0.15 * Math.sin((t - h.t1) * 20) };
    }
    return null;
  }

  // ---------- drawing primitives ----------
  function glow(c, x, y, r, col, a) {
    if (a <= 0) return;
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`);
    c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function starPath(c, r) { c.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.5 : r; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); }
  function drawStar(c, S, t) {
    c.save(); c.globalCompositeOperation = 'lighter';
    glow(c, S.x, S.y, S.r * (3.5 + S.bright * 2.5), '255,214,110', 0.4 * S.bright * S.alpha);
    if (S.flare > 0) {
      c.translate(S.x, S.y); c.rotate(t * 0.3);
      for (const rot of [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4]) {
        c.save(); c.rotate(rot);
        const L = S.r * (rot % (Math.PI / 2) ? 2.5 + 3 * S.flare : 3 + 5 * S.flare), g = c.createLinearGradient(-L, 0, L, 0);
        g.addColorStop(0, 'rgba(255,240,180,0)'); g.addColorStop(0.5, `rgba(255,240,180,${0.9 * S.flare})`); g.addColorStop(1, 'rgba(255,240,180,0)');
        c.fillStyle = g; c.fillRect(-L, -2.5, L * 2, 5); c.restore();
      }
    }
    c.restore();
    c.save(); c.translate(S.x, S.y); c.rotate(Math.sin(t * 1.7) * 0.12); c.globalAlpha = S.alpha;
    const g = c.createRadialGradient(-S.r * 0.3, -S.r * 0.3, 0, 0, 0, S.r);
    g.addColorStop(0, '#fff8d0'); g.addColorStop(1, S.bright > 0.6 ? '#ffc93c' : '#f2c25a');
    starPath(c, S.r); c.fillStyle = g; c.fill(); c.lineJoin = 'round'; c.lineWidth = S.r * 0.16; c.strokeStyle = '#e8a21a'; c.stroke();
    const fa = clamp((S.r - 15) / 5) * S.alpha;
    if (fa > 0) {
      c.globalAlpha = fa; c.strokeStyle = c.fillStyle = '#6b3a10'; c.lineWidth = 2; c.lineCap = 'round';
      const e = S.r * 0.22;
      if (S.happy) [-1, 1].forEach(i => { c.beginPath(); c.arc(i * e, -1, 2.3, 0, Math.PI * 2); c.fill(); });
      else [-1, 1].forEach(i => { c.beginPath(); c.moveTo(i * e - 3, -1); c.quadraticCurveTo(i * e, 2, i * e + 3, -1); c.stroke(); });
      c.beginPath(); c.moveTo(-3, 4); c.quadraticCurveTo(0, 7, 3, 4); c.stroke();
      c.fillStyle = 'rgba(255,120,120,0.5)'; [-1, 1].forEach(i => { c.beginPath(); c.ellipse(i * e * 1.9, 4, 3, 2, 0, 0, Math.PI * 2); c.fill(); });
    }
    c.restore();
  }
  function drawHeart(c, x, y, r, a, col = '#ff7a9a', glowCol = '255,150,170') {
    c.save(); c.globalCompositeOperation = 'lighter'; glow(c, x, y, r * 2.6, glowCol, 0.3 * a); c.restore();
    c.save(); c.translate(x, y); c.globalAlpha = clamp(a);
    c.beginPath(); c.moveTo(0, r * 0.35);
    c.bezierCurveTo(-r * 1.1, -r * 0.35, -r * 0.5, -r * 1.05, 0, -r * 0.45); c.bezierCurveTo(r * 0.5, -r * 1.05, r * 1.1, -r * 0.35, 0, r * 0.35); c.closePath();
    c.fillStyle = col; c.fill(); c.lineWidth = 3; c.strokeStyle = '#ffffffaa'; c.stroke();
    c.restore();
  }
  function sparkle(c, x, y, s, a, col = '255,246,200') {
    if (a <= 0 || s <= 0) return;
    c.save(); c.translate(x, y); c.globalAlpha = clamp(a); c.fillStyle = `rgb(${col})`;
    c.beginPath(); c.moveTo(0, -s); c.quadraticCurveTo(0, 0, s, 0); c.quadraticCurveTo(0, 0, 0, s); c.quadraticCurveTo(0, 0, -s, 0); c.quadraticCurveTo(0, 0, 0, -s); c.fill();
    c.restore();
  }
  function burst(c, t, t0, x, y, n, seed, spread = 90, life = 0.9, size = 14) {
    const age = t - t0; if (age < 0 || age > life) return;
    for (let i = 0; i < n; i++) {
      const a = hash(seed + i) * Math.PI * 2, sp = spread * (0.5 + hash(seed + i + 50) * 0.7), u = age / life, d = sp * (1 - Math.pow(1 - u, 2));
      sparkle(c, x + Math.cos(a) * d, y + Math.sin(a) * d - u * 20, size * (1 - u * 0.6) * (0.6 + hash(seed + i + 9) * 0.6), Math.sin(u * Math.PI) * 1.2);
    }
  }
  function trail(c, t, a, b, seed) {
    const step = 0.035, life = 0.9;
    for (let e = Math.max(a, Math.floor((t - life) / step) * step); e <= Math.min(t, b); e += step) {
      const age = t - e; if (age < 0 || age > life) continue;
      const p = starAt(e); if (!p) continue;
      const n = Math.round(e / step), u = age / life, jx = (hash(n + seed) - 0.5) * 40, jy = (hash(n + seed + 7) - 0.5) * 40;
      sparkle(c, p.x + jx * (0.3 + u), p.y + jy * (0.3 + u) + u * 30, (5 + hash(n + 3) * 9) * (1 - u), (1 - u) * 0.95);
    }
  }

  // ---------- background ----------
  const stars = Array.from({ length: 170 }, (_, i) => ({ x: hash(i) * 2400 - 240, y: hash(i + 400) * 640 - 80, r: 0.6 + hash(i + 800) * 1.9, ph: hash(i + 1200) * 6 }));
  const clouds = [[260, 230, 1.1], [820, 150, 0.8], [1250, 260, 1.0], [1700, 180, 0.9]];
  const trees = [[130, 640, 1.0], [250, 660, 0.78], [1590, 630, 1.0], [1710, 655, 0.75], [1840, 640, 0.9], [-80, 650, 0.9], [2020, 650, 0.85]];
  const flowers = [];
  for (let i = 0; i < 52; i++) {
    const x = -200 + i * 46 + hash(i + 77) * 30, y = 790 + hash(i + 99) * 270;
    if (Math.abs(x - 960) < 170 && y < 960) continue;
    flowers.push({ x, y, ph: hash(i) * 6, col: ['#ffffff', '#ffd6e7', '#fff3bf', '#e5dbff', '#ffe0c2'][i % 5], s: 0.8 + hash(i + 5) * 0.5 });
  }
  const grass = Array.from({ length: 100 }, (_, i) => ({ x: hash(i + 300) * 2400 - 240, y: 760 + hash(i + 600) * 320, ph: hash(i + 900) * 6 }));
  const flies = Array.from({ length: 26 }, (_, i) => ({ x: hash(i + 1500) * 1920, y: 560 + hash(i + 1600) * 420, ph: hash(i + 1700) * 6, sp: 0.4 + hash(i + 1800) * 0.6 }));

  function camAt(t) {
    const z = K_('zoom', t), fz = clamp((z - 1) / 0.55), on = CAST.filter(id => onStage(id, t)), Bs = (on.length ? on : CAST.slice(0, 1)).map(id => actorBody(id, t));
    const B = { x: Bs.reduce((v, b) => v + b.x, 0) / Bs.length, y: Bs.reduce((v, b) => v + b.y, 0) / Bs.length };
    let cx = lerp(960, B.x, fz * 0.85), cy = lerp(540, B.y - 230, fz * 0.9);
    const hw = 960 / z, hh = 540 / z;
    cx = clamp(cx, -220 + hw, 2140 - hw); cy = clamp(cy, -40 + hh, 1140 - hh);
    return { z, cx, cy };
  }
  function applyCam(c, cam, p) {
    const z = 1 + (cam.z - 1) * p;
    c.setTransform(1, 0, 0, 1, 0, 0); c.translate(W / 2, H / 2); c.scale(z, z);
    c.translate(-(W / 2 + (cam.cx - W / 2) * p), -(H / 2 + (cam.cy - H / 2) * p));
  }
  const toScreen = (cam, p) => ({ x: (p.x - cam.cx) * cam.z + W / 2, y: (p.y - cam.cy) * cam.z + H / 2 });

  function drawBackground(c, t, cam, tau) {
    c.setTransform(1, 0, 0, 1, 0, 0);
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, tod(tau, PAL.skyTop)); g.addColorStop(0.55, tod(tau, PAL.skyMid)); g.addColorStop(1, tod(tau, PAL.skyBot));
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    applyCam(c, cam, 0.1);
    const sa = clamp((tau - 1.6) / 0.9);
    if (sa > 0) for (const s of stars) { c.globalAlpha = sa * (0.45 + 0.55 * Math.abs(Math.sin(t * 1.3 + s.ph))); c.fillStyle = '#fff'; c.beginPath(); c.arc(s.x, s.y, s.r, 0, Math.PI * 2); c.fill(); }
    c.globalAlpha = 1;
    const ma = clamp((tau - 2.2) / 0.6);
    if (ma > 0) {
      c.save(); c.globalAlpha = ma; c.globalCompositeOperation = 'lighter'; glow(c, 330, 200, 160, '230,230,255', 0.25); c.globalCompositeOperation = 'source-over';
      c.beginPath(); c.rect(0, 0, 800, 600); c.arc(356, 182, 56, 0, Math.PI * 2); c.clip('evenodd');
      c.beginPath(); c.arc(330, 200, 62, 0, Math.PI * 2); c.fillStyle = '#fff6d6'; c.fill(); c.restore();
    }
    applyCam(c, cam, 0.15);
    const sunY = tau < 1 ? lerp(190, 540, tau) : lerp(540, 1000, clamp((tau - 1) / 0.8));
    if (sunY < 990) {
      c.save(); c.globalCompositeOperation = 'lighter'; glow(c, 1450, sunY, 330, '255,236,190', 0.5 * clamp(1.6 - tau * 0.6)); c.restore();
      c.beginPath(); c.arc(1450, sunY, tau < 0.5 ? 95 : 120, 0, Math.PI * 2); c.fillStyle = tod(tau, PAL.sun); c.fill();
    }
    applyCam(c, cam, 0.2);
    c.fillStyle = tod(tau, PAL.cloud); c.globalAlpha = 0.9;
    clouds.forEach(([x, y, s], i) => {
      const cx = ((x + t * (8 + i * 3)) % 2500) - 290;
      [[0, 0, 95, 30], [55, -18, 62, 32], [-50, -8, 55, 24], [10, -30, 48, 26]].forEach(([dx, dy, rx, ry]) => { c.beginPath(); c.ellipse(cx + dx * s, y + dy * s, rx * s, ry * s, 0, 0, Math.PI * 2); c.fill(); });
    });
    c.globalAlpha = 1;
    if (tau < 1.5) {
      c.strokeStyle = 'rgba(110,60,40,0.8)'; c.lineWidth = 3; c.lineCap = 'round';
      for (let start = 0.8; start < P.duration; start += 16) [0, 1, 2].forEach(i => {
        const u = (t - start - i * 0.3) / 6.5; if (u < 0 || u > 1) return;
        const x = lerp(2000, 200, u) + i * 50, y = 230 + i * 26 + Math.sin(t * 2 + i) * 8, w = Math.sin(t * 13 + i * 2) * 8;
        c.beginPath(); c.moveTo(x - 13, y - w); c.quadraticCurveTo(x - 6, y - 4, x, y); c.quadraticCurveTo(x + 6, y - 4, x + 13, y - w); c.stroke();
      });
    }
    applyCam(c, cam, 0.35);
    c.fillStyle = tod(tau, PAL.far);
    c.beginPath(); c.moveTo(-500, 620); c.quadraticCurveTo(200, 480, 700, 590); c.quadraticCurveTo(1150, 680, 1550, 560); c.quadraticCurveTo(1900, 480, 2500, 590); c.lineTo(2500, 1400); c.lineTo(-500, 1400); c.fill();
    applyCam(c, cam, 0.6);
    c.fillStyle = tod(tau, PAL.mid);
    c.beginPath(); c.moveTo(-500, 700); c.quadraticCurveTo(350, 600, 900, 690); c.quadraticCurveTo(1400, 760, 2500, 650); c.lineTo(2500, 1400); c.lineTo(-500, 1400); c.fill();
    trees.forEach(([x, y, s], i) => {
      c.save(); c.translate(x, y + 30); c.rotate(Math.sin(t * 1.5 + i) * 0.03); c.transform(1, 0, Math.sin(t * 1.5 + i + 0.6) * 0.05, 1, 0, 0);
      c.fillStyle = tod(tau, PAL.trunk); c.fillRect(-8 * s, -20 * s, 16 * s, 40 * s);
      c.fillStyle = tod(tau, PAL.tree);
      c.beginPath(); c.moveTo(0, -190 * s); c.lineTo(56 * s, -80 * s); c.lineTo(36 * s, -80 * s); c.lineTo(66 * s, -10 * s); c.lineTo(-66 * s, -10 * s); c.lineTo(-36 * s, -80 * s); c.lineTo(-56 * s, -80 * s); c.fill();
      c.restore();
    });
    applyCam(c, cam, 1);
    c.fillStyle = tod(tau, PAL.front);
    c.beginPath(); c.moveTo(-500, 780); c.quadraticCurveTo(500, 730, 960, 760); c.quadraticCurveTo(1500, 790, 2500, 750); c.lineTo(2500, 1500); c.lineTo(-500, 1500); c.fill();
    c.fillStyle = tod(tau, PAL.knoll); c.beginPath(); c.ellipse(960, 975, 440, 110, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = tod(tau, PAL.grass); c.lineWidth = 3; c.lineCap = 'round';
    grass.forEach(g => { const sw = Math.sin(t * 2.2 + g.ph) * 3; c.beginPath(); c.moveTo(g.x, g.y); c.lineTo(g.x - 5 + sw, g.y - 13); c.moveTo(g.x, g.y); c.lineTo(g.x + sw, g.y - 17); c.moveTo(g.x, g.y); c.lineTo(g.x + 6 + sw, g.y - 12); c.stroke(); });
    const stem = tod(tau, PAL.stem);
    flowers.forEach(fl => {
      c.save(); c.translate(fl.x, fl.y + Math.sin(t * 3 + fl.ph) * 3); c.rotate(Math.sin(t * 2.4 + fl.ph) * 0.15); c.scale(fl.s, fl.s);
      c.strokeStyle = stem; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(4, -16, 0, -30); c.stroke();
      c.fillStyle = fl.col; for (let k = 0; k < 5; k++) { c.save(); c.translate(0, -30); c.rotate(k * 1.2566); c.beginPath(); c.ellipse(0, -8, 5.5, 8.5, 0, 0, Math.PI * 2); c.fill(); c.restore(); }
      c.fillStyle = '#ffc53d'; c.beginPath(); c.arc(0, -30, 4.5, 0, Math.PI * 2); c.fill();
      c.restore();
    });
  }

  // ---------- text overlays ----------
  const FONT = '"Fredoka", "Arial Rounded MT Bold", Arial, sans-serif', SERIF = '"Lora", Georgia, serif';
  function wrap(c, text, maxW) {
    const words = text.split(' '), lines = []; let line = '';
    for (const w of words) { const test = line ? line + ' ' + w : w; if (c.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test; }
    lines.push(line);
    if (lines.length === 2) {
      let best = null;
      for (let i = 1; i < words.length; i++) {
        const a = words.slice(0, i).join(' '), b = words.slice(i).join(' '), m = Math.max(c.measureText(a).width, c.measureText(b).width);
        if (m <= maxW && (!best || m < best.m)) best = { m, l: [a, b] };
      }
      if (best) return best.l;
    }
    return lines;
  }
  function drawCaption(c, cap, t) {
    const a = ease((t - cap.t0) / 0.35) * ease((cap.t1 - t) / 0.45); if (a <= 0) return;
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = a; c.font = `500 italic 40px ${SERIF}`;
    const lines = wrap(c, cap.text, 1300), lh = 54, w = Math.max(...lines.map(l => c.measureText(l).width)) + 90, h = lines.length * lh + 44;
    const x = W / 2 - w / 2, y = 54 - (1 - a) * 10;
    c.fillStyle = 'rgba(255,248,232,0.92)'; c.strokeStyle = 'rgba(122,74,40,0.85)'; c.lineWidth = 3; c.beginPath(); c.roundRect(x, y, w, h, 18); c.fill(); c.stroke();
    c.strokeStyle = 'rgba(122,74,40,0.35)'; c.lineWidth = 1.5; c.beginPath(); c.roundRect(x + 9, y + 9, w - 18, h - 18, 12); c.stroke();
    c.fillStyle = '#5a3418'; c.textAlign = 'center'; c.textBaseline = 'middle';
    lines.forEach((l, i) => c.fillText(l, W / 2, y + 22 + lh / 2 + i * lh));
    c.restore();
  }
  function drawBubble(c, b, t, head, cam) {
    if (t < b.t0 || t > b.t1) return;
    const pin = easeOutBack((t - b.t0) / 0.38), out = ease((b.t1 - t) / 0.3), a = clamp((t - b.t0) / 0.12) * out, sc = (0.35 + 0.65 * pin) * (0.92 + 0.08 * out);
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
    let size = 52, lines;
    for (; size >= 34; size -= 2) { c.font = `700 ${size}px ${FONT}`; lines = wrap(c, b.text, 560); if (lines.length <= 2) break; }
    const lh = size * 1.18, w = Math.max(...lines.map(l => c.measureText(l).width)) + 84, h = lines.length * lh + 56;
    let bx = head.x + b.side * (w / 2 + 170 * cam.z), by = head.y - 190;
    bx = clamp(bx, 40 + w / 2, W - 40 - w / 2); by = clamp(by, 40 + h / 2, H - 40 - h / 2);
    if (Math.abs(bx - head.x) < w / 2 + 110 * cam.z) by = Math.max(40 + h / 2, head.y - 150 * cam.z - h / 2 - 60);
    const ang = Math.atan2(head.y - by, head.x - bx), dx = Math.cos(ang), dy = Math.sin(ang), px = -dy, py = dx;
    const ex = dx * (w / 2 - 34), ey = dy * (h / 2 - 16), L = 120, tx = ex + dx * L, ty = ey + dy * L, bw = 24;
    c.globalAlpha = a; c.translate(bx, by); c.scale(sc, sc);
    const body = () => { c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, Math.min(h / 2, 60)); };
    const tail = () => { c.beginPath(); c.moveTo(ex + px * bw, ey + py * bw); c.quadraticCurveTo((ex + tx) / 2 + px * 9, (ey + ty) / 2 + py * 9, tx, ty); c.quadraticCurveTo((ex + tx) / 2 - px * 3, (ey + ty) / 2 - py * 3, ex - px * bw, ey - py * bw); c.closePath(); };
    c.lineJoin = 'round'; c.strokeStyle = '#111'; c.lineWidth = 14; c.fillStyle = '#fffcf2';
    tail(); c.stroke(); body(); c.stroke(); tail(); c.fill(); body(); c.fill();
    c.fillStyle = '#1a1a1a'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `700 ${size}px ${FONT}`;
    lines.forEach((l, i) => c.fillText(l, 0, -((lines.length - 1) * lh) / 2 + i * lh + 2));
    const ea = b.emph ? win(t, b.t0 + 0.2, b.t0 + 1.6, 0.15, 0.4) : 0;
    if (ea > 0) {
      c.globalAlpha = a * ea; c.lineWidth = 6; c.lineCap = 'round';
      const ox = -w / 2 + 34, oy = -h / 2 + 18;
      [200, 232, 262].forEach(deg => { const r = deg * Math.PI / 180; c.beginPath(); c.moveTo(ox + Math.cos(r) * 46, oy + Math.sin(r) * 46); c.lineTo(ox + Math.cos(r) * 80, oy + Math.sin(r) * 80); c.stroke(); });
    }
    c.restore();
    sparkle(c, bx + w * 0.47, by - h * 0.55, 16 * pin, a * 0.9, '255,214,90');
  }
  function drawTitle(c, T, t) {
    const out = ease((T.out1 - t) / (T.out1 - T.out0));
    if (t < T.letters[0] || out <= 0) return;
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
    let size = 170; c.font = `700 ${size}px ${FONT}`;
    const chars = [...T.text], gap = 14;
    let widths = chars.map(ch => c.measureText(ch).width), total = widths.reduce((s, v) => s + v, 0) + gap * (chars.length - 1);
    if (total > 1600) { size = Math.floor(size * 1600 / total); c.font = `700 ${size}px ${FONT}`; widths = chars.map(ch => c.measureText(ch).width); total = widths.reduce((s, v) => s + v, 0) + gap * (chars.length - 1); }
    c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    let x = W / 2 - total / 2; const base = 335;
    chars.forEach((ch, i) => {
      const t0 = T.letters[i], u = (t - t0) / T.drop, cx = x + widths[i] / 2; x += widths[i] + gap;
      if (u < 0 || ch === ' ') return;
      const y = base - (1 - easeOutBounce(u)) * 360, wob = Math.sin(t * 2.2 + i) * 4 * clamp(u - 1);
      c.save(); c.translate(cx, y + wob); c.rotate(Math.sin(i * 1.7) * 0.06); c.globalAlpha = clamp(u * 4) * out; c.lineJoin = 'round';
      c.lineWidth = 22 * size / 170; c.strokeStyle = '#5a2a14'; c.strokeText(ch, 0, 0);
      const g = c.createLinearGradient(0, -size * 0.76, 0, 0); g.addColorStop(0, '#ffb35c'); g.addColorStop(1, '#f07a2a'); c.fillStyle = g; c.fillText(ch, 0, 0);
      c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.ellipse(-widths[i] * 0.18, -size * 0.62, 12, 7, -0.5, 0, Math.PI * 2); c.fill();
      c.restore();
      burst(c, t, t0 + T.drop * 0.62, cx, base - 60, 5, i * 17 + 3, 80, 0.7, 13);
    });
    c.restore();
  }

  // ---------- frame ----------
  let ctx, layer;
  function render(t) {
    t = clamp(t, 0, P.duration);
    const c = ctx, cam = camAt(t), tau = K_('tau', t);
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    drawBackground(c, t, cam, tau);
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'multiply'; c.fillStyle = tod(tau, PAL.grade); c.fillRect(0, 0, W, H); c.globalCompositeOperation = 'source-over';
    const Ks = {}; CAST.forEach(id => { Ks[id] = actorState(id, t); });
    const k = layer.getContext('2d');
    k.setTransform(1, 0, 0, 1, 0, 0); k.globalCompositeOperation = 'source-over'; k.clearRect(0, 0, W, H);
    applyCam(k, cam, 1); CAST.forEach(id => DRAW[id](k, Ks[id]));
    k.setTransform(1, 0, 0, 1, 0, 0); k.globalCompositeOperation = 'source-atop';
    k.globalAlpha = tau < 1 ? 0.06 * tau : 0.06 + 0.08 * (tau - 1); k.fillStyle = tod(tau, PAL.tint); k.fillRect(0, 0, W, H);
    k.globalAlpha = 1; k.globalCompositeOperation = 'source-over';
    c.drawImage(layer, 0, 0);

    applyCam(c, cam, 1);
    const S = starAt(t);
    const segNow = starSegs.filter(q => q.t0 <= t).pop();
    const held = S && segNow && ['held', 'pickup', 'raise', 'lower'].includes(segNow.type);
    if (S && held) { c.save(); c.globalCompositeOperation = 'lighter'; glow(c, S.x, S.y, 560, '255,190,90', 0.12 * S.bright); c.restore(); }
    const fa = clamp((tau - 2.1) / 0.6);
    if (fa > 0) {
      c.save(); c.globalCompositeOperation = 'lighter';
      flies.forEach(fl => {
        const x = fl.x + Math.sin(t * fl.sp + fl.ph) * 60, y = fl.y + Math.cos(t * fl.sp * 1.3 + fl.ph) * 30, a = fa * (0.4 + 0.6 * Math.abs(Math.sin(t * 2 + fl.ph)));
        glow(c, x, y, 14, '220,255,150', 0.7 * a); c.fillStyle = `rgba(250,255,210,${a})`; c.beginPath(); c.arc(x, y, 2.5, 0, Math.PI * 2); c.fill();
      });
      c.restore();
    }
    starSegs.forEach((s, i) => { if (s.type === 'fall' || s.type === 'rise') trail(c, t, s.t0, s.t1, 11 + i * 30); });
    if (S) drawStar(c, S, t);
    const heads = {}; CAST.forEach(id => { heads[id] = toWorld(Ks[id], Ks[id].f * 6, REG[id].head); });
    P.sparkles.forEach((sp, i) => {
      let p = sp.at;
      if (!p && sp.onStar) { const q = starAt(sp.t); p = q ? { x: q.x, y: q.y } : heads[sp.who]; }
      if (!p) { const B = actorBody(sp.who, sp.t); p = toWorld(B, 0, REG[sp.who].sparkle); }
      burst(c, t, sp.t, p.x, p.y, sp.small ? 7 : 12, 60 + i * 13, sp.small ? 80 : 170, 1.0, sp.small ? 12 : 15);
    });
    P.hearts.forEach(hh => {
      const u = (t - hh.t) / 1.5; if (u < 0 || u > 1) return;
      // from one character's head, or between two hugging characters
      const at = hh.between ? { x: (heads[hh.between[0]].x + heads[hh.between[1]].x) / 2, y: Math.min(heads[hh.between[0]].y, heads[hh.between[1]].y) + 40 } : heads[hh.who];
      const dx = hh.between ? [-40, 45, 0][hh.i] : [-90, 95, -20][hh.i];
      drawHeart(c, at.x + dx + Math.sin(u * 9 + hh.i) * 10, at.y - 140 - u * 150, 16 * easeOutBack(clamp(u * 4)), Math.sin(u * Math.PI) * 1.2);
    });
    const HS = heartAt(t);
    if (HS) drawHeart(c, HS.x, HS.y, 24 * HS.sc, 1, '#ffd36b', '255,210,120');
    P.heartDown.forEach((h, i) => { const B = actorBody(h.who, h.burst), p = toWorld(B, 0, REG[h.who].catch); burst(c, t, h.burst, p.x, p.y, 14, 33 + i, 140, 1.1, 16); });

    P.titles.forEach(T => drawTitle(c, T, t));
    P.captions.forEach(cap => drawCaption(c, cap, t));
    P.bubbles.forEach(b => drawBubble(c, b, t, toScreen(cam, heads[b.who]), cam));
    c.setTransform(1, 0, 0, 1, 0, 0);
    const vg = c.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.05);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(20,10,30,${0.12 + 0.07 * tau})`);
    c.fillStyle = vg; c.fillRect(0, 0, W, H);
    const [f0, f1] = P.pictureFadeOut, fade = clamp((t - f0) / (f1 - f0)) + (1 - clamp(t / 0.5));
    if (fade > 0) { c.fillStyle = `rgba(0,0,0,${clamp(fade)})`; c.fillRect(0, 0, W, H); }
  }

  async function init(canvas, plan) {
    P = plan; KS = plan.scale; CAST = plan.cast; REG = StudioCharacters.CHARACTERS;
    CAST.forEach(id => { DRAW[id] = window[REG[id].global][REG[id].draw]; });
    starSegs = plan.star.filter(s => s.type !== 'flicker').sort((a, b) => a.t0 - b.t0);
    flickers = plan.star.filter(s => s.type === 'flicker');
    ctx = canvas.getContext('2d');
    layer = document.createElement('canvas'); layer.width = W; layer.height = H;
    await Promise.all(['700 52px Fredoka', 'italic 500 40px Lora'].map(f => document.fonts.load(f)));
    render(0);
  }
  window.StudioFilm = { init, render };
})();
