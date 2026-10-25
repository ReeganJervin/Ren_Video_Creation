// Scene renderer: draws any compiled story plan. render(t) is deterministic.
(() => {
  const W = 1920, H = 1080;
  const { evalKeys } = StudioStory;
  let P, KS, REG, CAST = [], DRAW = {}, PL, HP;

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
    const crouch = A_(id, 'crouch', t), air = a.keys.air ? A_(id, 'air', t) : 1;   // air: 1 flying, 0 landed
    // breathing and idle sway, each character on its own phase
    sy *= crouch * (1 + 0.012 * Math.sin(t * 2.6 + n * 1.7)); sx *= 1 + (1 - crouch) * 0.45;
    const phase = x / 160 * Math.PI * 2, swing = Math.sin(phase) * 0.35 * walk, idle = Math.sin(t * 2 + n * 2.1) * 0.04;
    let wave = 0; for (const w of a.waves) wave += Math.sin((t - w.a) * 9) * 0.35 * win(t, w.a, w.b, 0.2, 0.3);
    return {
      id, t, x, y: placeAt(t).ground(x) - (REG[id].fly || 0) * air, air, h, sx, sy, s: KS, f: A_(id, 'facing', t), walk, phase, hopping,
      armL: A_(id, 'armL', t) + swing + idle, armR: A_(id, 'armR', t) - swing + idle + wave,
    };
  }
  // the place on screen at t: a change of place switches halfway through its fade
  const placeAt = t => { let p = PL; if (P.places) for (const ch of P.places) if (t >= (ch.t0 + ch.t1) / 2) p = StudioPlaces.PLACES[ch.to]; return p; };
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
      const p = L.target === 'star' ? starAt(t) : L.target === 'heart' ? heartAt(t) : L.target.prop !== undefined ? propPoint(L.target.prop, t) : headOf(L.target.actor, t);
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
  // the star and the heart are props in the asset registry (engine/props/)
  const drawStar = (c, S, t) => StudioAssets.ASSETS.star.drawAt(c, t, S);
  const drawHeart = (c, ...rest) => StudioAssets.ASSETS.heart.drawAt(c, ...rest);
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

  function camAt(t) {
    const z = K_('zoom', t), fz = clamp((z - 1) / 0.55), on = CAST.filter(id => onStage(id, t)), Bs = (on.length ? on : CAST.slice(0, 1)).map(id => actorBody(id, t));
    const B = { x: Bs.reduce((v, b) => v + b.x, 0) / Bs.length, y: Bs.reduce((v, b) => v + b.y, 0) / Bs.length };
    // close-ups frame everyone on stage: centred between them, never zoomed in so far that someone is cut off
    const xs = Bs.map(b => b.x), spread = Math.max(...xs) - Math.min(...xs);
    const zz = Math.min(z, Math.max(1, 1700 / (spread + 560)));
    let cx = lerp(960, B.x, fz * (Bs.length > 1 ? 1 : 0.85)), cy = lerp(540, B.y - 230, fz * 0.9);
    const hw = 960 / zz, hh = 540 / zz;
    cx = clamp(cx, -220 + hw, 2140 - hw); cy = clamp(cy, -40 + hh, 1140 - hh);
    return { z: zz, cx, cy };
  }
  // ---------- shots and camera moves (stories with "shot:" or camera-move lines) ----------
  const SIZES = { wide: 1, medium: 1.75, close: 2.7, 'extreme close': 4.2 }, OTS_Z = 2.2;
  let RIGS = [], SHAKES = [], baseMemo = [];
  // What a shot looks at, as one box: left/right x, top of the head, eye line, feet, facing (one subject only).
  function aimBox(on, t) {
    let S = [];
    if (on.star) { const s = starAt(t); if (s) S = [{ x: s.x, top: s.y - 70, eye: s.y, feet: s.y + 70, f: 0 }]; }
    if (on.x !== undefined) { const y = placeAt(t).ground(on.x); S = [{ x: on.x, top: y - 430, eye: y - 240, feet: y, f: 0 }]; }
    // the star together with everyone watching it ({ star, all }): their faces count, not their feet
    if (on.star && on.all) S.push(...CAST.filter(id => onStage(id, t)).map(id => { const B = actorBody(id, t), e = toWorld(B, 0, REG[id].head).y; return { x: B.x, top: e - 90, eye: e, feet: e + 110, f: B.f }; }));
    else if (!on.star && on.x === undefined) {
      let ids = on.actors || CAST.filter(id => onStage(id, t));
      if (!ids.length) ids = CAST.slice(0, 1);
      S = ids.map(id => {
        const B = actorBody(id, t), d = REG[id];
        return { x: B.x, top: toWorld(B, 0, d.overhead * 0.92).y, eye: toWorld(B, 0, d.head).y, feet: B.y, f: B.f };
      });
    }
    if (!S.length) return aimBox({ all: true }, t);
    return { x0: Math.min(...S.map(s => s.x)), x1: Math.max(...S.map(s => s.x)), top: Math.min(...S.map(s => s.top)), eye: Math.min(...S.map(s => s.eye)), feet: Math.max(...S.map(s => s.feet)), f: S.length === 1 ? S[0].f : 0 };
  }
  // the same box averaged over the last half second, so the framing follows movement smoothly
  function aimSmooth(on, t) {
    const n = 4, acc = { x0: 0, x1: 0, top: 0, eye: 0, feet: 0, f: 0 };
    for (let k = 0; k < n; k++) { const b = aimBox(on, Math.max(0, t - k * 0.15)); for (const q in acc) acc[q] += b[q] / n; }
    return acc;
  }
  const bounds = c => { const hw = 960 / c.z, hh = 540 / c.z; return { z: c.z, cx: clamp(c.cx, -220 + hw, 2140 - hw), cy: clamp(c.cy, -40 + hh, 1140 - hh) }; };
  // A shot of size z on its subject: subject on a third with room in front of where it faces, the top of the
  // head inside the frame, and (in an extreme close-up) the eyes a little above the middle.
  function frameCam(z, on, t, lead = 1) {
    const g = aimSmooth(on, t);
    // two or more subjects: never so close that someone is cut off (the classic camera's rule)
    if (g.x1 - g.x0 > 1) z = Math.min(z, 1700 / (g.x1 - g.x0 + 560));
    z = Math.max(1, z);
    const hw = 960 / z, hh = 540 / z, v = clamp((z - 1) / 0.75), u = clamp((z - SIZES.close) / (SIZES['extreme close'] - SIZES.close));
    let cx = (g.x0 + g.x1) / 2 + (g.x0 === g.x1 ? clamp(g.f * 1.5, -1, 1) * hw / 3 * lead * v : 0);
    const byTop = g.top + hh * (1 - 2 * (z < 2.2 ? 0.1 : 0.08)), byEye = g.eye + 0.16 * hh;
    let cy = lerp(540, lerp(byTop, byEye, u), v);
    if (z < 3.4 && g.top < cy - hh + 6) cy = g.top + hh - 6;
    if (g.x0 === g.x1 && on.actors && z > 1.2) cx = noHalfFaces(cx, hw, g.x0, on.actors[0], t);
    return bounds({ z, cx, cy });
  }
  // In a shot of one character, nobody else's face sits half in the frame: slide the frame (as little as
  // possible, keeping the subject's own face well inside) so each other face is fully in or fully out.
  function noHalfFaces(cx, hw, x, id, t) {
    const fw = 105 * KS, keep = [x - fw * 1.05, x + fw * 1.05];
    for (const o of CAST) {
      if (o === id || !onStage(o, t)) continue;
      const ox = aimSmooth({ actors: [o] }, t).x0, lo = ox - fw, hi = ox + fw, L = cx - hw, R = cx + hw;
      if (hi <= L || lo >= R || lo >= L && hi <= R) continue;   // already fully out or fully in
      const shifts = ox > cx ? [hi - R + 12, lo - R - 12] : [lo - L - 12, hi - L + 12];   // bring it in / push it out
      const ok = shifts.filter(d => keep[0] >= L + d && keep[1] <= R + d).sort((a, b) => Math.abs(a) - Math.abs(b));
      if (ok.length) cx += ok[0];
    }
    return cx;
  }
  // over the shoulder: the other character on the third away from the shoulder, facing it
  function otsCam(rig, t) {
    const g = aimSmooth(rig.on, t), a = actorX(rig.of, t), dir = Math.sign(a - g.x0) || 1, z = OTS_Z, hw = 960 / z, hh = 540 / z;
    return bounds({ z, cx: g.x0 + dir * hw / 3, cy: g.top + hh * (1 - 2 * 0.12) });
  }
  const camBlend = (a, b, w) => ({ z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), w)), cx: lerp(a.cx, b.cx, w), cy: lerp(a.cy, b.cy, w) });
  const rigCam = (i, t) => { const r = RIGS[i]; return r.kind === 'fixed' ? r.cam : r.kind === 'ots' ? otsCam(r, t) : frameCam(r.z, r.on, t); };
  // the camera after shots/moves 0..i (i < 0: the classic automatic camera)
  function camUpTo(i, t) {
    if (i < 0) return camAt(t);
    const r = RIGS[i], to = rigCam(i, t);
    if (r.dur > 0 && t < r.t + r.dur) return camBlend(camUpTo(i - 1, t), to, ease((t - r.t) / r.dur));
    return to;
  }
  // where the camera is just as shot/move i begins (moves start from there)
  const camBefore = i => baseMemo[i] || (baseMemo[i] = camUpTo(i - 1, RIGS[i].t));
  function buildRigs() {
    RIGS = []; SHAKES = []; baseMemo = [];
    let on = { all: true };
    for (const s of P.shots) {
      if (s.op === 'shake') { SHAKES.push(s); continue; }
      const r = { t: s.t, dur: s.dur, op: s.op };
      RIGS.push(r);
      const i = RIGS.length - 1, base = () => camBefore(i), p = RIGS[i - 1];
      // the zoom a move builds on: where the previous shot or move is heading (so moves in a row add up)
      const z0 = () => (!p ? base().z : p.kind === 'frame' ? p.z : p.kind === 'ots' ? OTS_Z : p.cam.z);
      if (s.op === 'cut') Object.assign(r, { kind: 'frame', z: SIZES[s.size], on: on = s.on });
      else if (s.op === 'ots') Object.assign(r, { kind: 'ots', of: s.of, on: on = s.on });
      else if (s.op === 'zoom' || s.op === 'reveal') Object.assign(r, { kind: 'frame', z: s.z, on: on = s.on });
      else if (s.op === 'push') Object.assign(r, { kind: 'frame', z: Math.min(SIZES['extreme close'], z0() * 1.4), on });
      else if (s.op === 'pull') Object.assign(r, { kind: 'frame', z: Math.max(1, z0() / 1.4), on });
      else if (s.op === 'pan' || s.op === 'follow') Object.assign(r, { kind: 'frame', z: z0(), on: on = s.on });
      else if (s.op === 'hold') Object.assign(r, { kind: 'fixed', cam: base() });
    }
  }
  // the camera at t with shots: { z, cx, cy, framed, ots: { of, a } } (a = how visible the shoulder is)
  function camShot(t) {
    let i = -1; while (i + 1 < RIGS.length && RIGS[i + 1].t <= t) i++;
    const c = { ...camUpTo(i, t), framed: i >= 0 };
    const r = RIGS[i], prev = RIGS[i - 1];
    if (r && r.kind === 'ots') c.ots = { of: r.of, on: r.on, a: 1 };
    else if (r && prev && prev.kind === 'ots' && r.dur > 0 && t < r.t + r.dur) c.ots = { of: prev.of, on: prev.on, a: 1 - ease((t - r.t) / r.dur) };
    // a short, light shake for surprises, fading out
    for (const s of SHAKES) {
      const u = (t - s.t) / s.dur; if (u < 0 || u > 1) continue;
      const a = 14 / c.z * Math.pow(1 - u, 2);
      c.cx += a * (Math.sin(t * 61) + Math.sin(t * 37 + 1)) / 2; c.cy += a * (Math.sin(t * 53 + 2) + Math.sin(t * 29)) / 2;
    }
    return c;
  }

  function applyCam(c, cam, p) {
    const z = 1 + (cam.z - 1) * p;
    c.setTransform(1, 0, 0, 1, 0, 0); c.translate(W / 2, H / 2); c.scale(z, z);
    c.translate(-(W / 2 + (cam.cx - W / 2) * p), -(H / 2 + (cam.cy - H / 2) * p));
  }
  const toScreen = (cam, p) => ({ x: (p.x - cam.cx) * cam.z + W / 2, y: (p.y - cam.cy) * cam.z + H / 2 });

  // ---------- props, set pieces and extras (asset kit) ----------
  // where a prop is (for looking at it), or null when it isn't on stage
  function propPoint(i, t) {
    const p = P.props[i];
    if (!p || t < p.t0 || (p.t1 !== null && t > p.t1)) return null;
    return { vis: true, x: p.x, y: p.y - p.height * 0.6 };
  }
  const lastAt = (list, t) => { let v = null; for (const e of list) if (e.t <= t) v = e; return v; };
  // Props stand on the ground behind the characters (or float in the sky), drawn with the scenery so they share
  // its time-of-day colour. They pop in, fade out, and glow or open when the story says so.
  // Two passes: 'base' before the time-of-day colour, 'light' after it, for everything that gives light
  // (the glow, emissive assets, and an asset's drawLight parts), so light is never darkened at night.
  function drawProps(c, t, tau, PN, pass) {
    const light = { tau, tint: tod(tau, PN.tint) };
    P.props.forEach(p => {
      if (t < p.t0 || (p.t1 !== null && t >= p.t1)) return;
      const a = p.t1 !== null ? clamp((p.t1 - t) / 0.5) : 1, pop = easeOutBack((t - p.t0) / 0.4);
      const st = lastAt(p.states, t), gl = lastAt(p.glow, t), asset = p.asset && StudioAssets.ASSETS[p.asset];
      const glowA = gl ? (gl.on ? ease((t - gl.t) / 0.4) : 1 - ease((t - gl.t) / 0.4)) : 0;
      let state = st ? st.state : asset && asset.states.length ? asset.states[0] : 'closed';
      if (glowA > 0.5 && asset && asset.states.includes('glowing')) state = 'glowing';
      HP.cam(1);
      c.save(); c.translate(p.x, p.y); c.globalAlpha = a; c.scale(pop, pop);
      if (pass === 'base') {
        if (!asset) drawPropPlaceholder(c, p, st ? state : null); else if (!asset.emissive) asset.draw(c, t, state, light);
      } else {
        if (glowA > 0) { c.save(); c.globalCompositeOperation = 'lighter'; glow(c, 0, -p.height * 0.55, p.height * 1.3, '255,222,140', 0.45 * glowA * a); c.restore(); }
        if (asset && asset.emissive) asset.draw(c, t, state, light);
        else if (asset && asset.drawLight) asset.drawLight(c, t, state, light);
      }
      c.restore();
    });
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1;
  }
  // a missing prop: a soft grey rounded box of its size class, with its name on it
  function drawPropPlaceholder(c, p, state) {
    const w = { small: 84, medium: 160, big: 380 }[p.size] || 84, h = p.height, r = Math.min(24, w / 4);
    c.fillStyle = 'rgba(205,210,218,0.95)'; c.strokeStyle = '#7c8592'; c.lineWidth = 4; c.setLineDash([12, 8]);
    c.beginPath(); c.roundRect(-w / 2, -h, w, h, r); c.fill(); c.stroke(); c.setLineDash([]);
    c.fillStyle = '#4d5560'; c.textAlign = 'center'; c.textBaseline = 'middle';
    const fs = p.size === 'small' ? 22 : 34, label = p.name + (state ? ` (${state})` : '');
    c.font = `700 ${fs}px ${FONT}`;
    if (p.size === 'small') c.fillText(label, 0, 22); else c.fillText(label, 0, -h / 2);
  }
  // a missing extra: a simple grey animal shape that still blinks, looks, talks and hops, with its name under it
  function drawExtraPlaceholder(c, K, def) {
    const H = def.height || 110;
    c.save(); c.translate(K.x, K.y - K.h); c.scale(K.s * K.sx, K.s * K.sy);
    c.fillStyle = '#aab1bb'; c.strokeStyle = '#6d7581'; c.lineWidth = 4;
    c.beginPath(); c.ellipse(0, -H * 0.3, H * 0.3, H * 0.3, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    const hx = K.f * 8;
    [-1, 1].forEach(i => { c.beginPath(); c.arc(hx + i * H * 0.15, -H * 0.84, H * 0.08, 0, Math.PI * 2); c.fill(); c.stroke(); });
    c.beginPath(); c.arc(hx, -H * 0.62, H * 0.24, 0, Math.PI * 2); c.fill(); c.stroke();
    [-1, 1].forEach(i => {
      const ex = hx + i * H * 0.085 + (K.lookX || 0) * 3, ey = -H * 0.64 + (K.lookY || 0) * 2;
      c.save(); c.translate(ex, ey); c.scale(1, 1 - 0.9 * (K.blink || 0));
      c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, H * 0.05, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#3a3f47'; c.beginPath(); c.arc(0, 0, H * 0.028, 0, Math.PI * 2); c.fill(); c.restore();
    });
    if (K.talk > 0) { c.fillStyle = '#3a3f47'; c.beginPath(); c.ellipse(hx, -H * 0.52, H * 0.04, H * 0.035 * K.talk + 1, 0, 0, Math.PI * 2); c.fill(); }
    c.restore();
    c.save(); c.fillStyle = '#4d5560'; c.textAlign = 'center'; c.font = `700 24px ${FONT}`; c.fillText(def.name, K.x, K.y + 32); c.restore();
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
  // In framed shots a bubble shrinks with the zoom and goes where it covers no face: beside the speaker's face
  // (on its usual side first), above it, or in a top corner, getting smaller until it fits.
  function framedBubble(c, b, head, cam, F) {
    const me = F.boxes.find(q => q.id === b.who) || { x0: head.x - 90, x1: head.x + 90, y0: head.y - 90, y1: head.y + 90 };
    const fits = (x, y, w, h) => !F.boxes.some(q => x + w / 2 + 16 > q.x0 && x - w / 2 - 16 < q.x1 && y + h / 2 + 16 > q.y0 && y - h / 2 - 16 < q.y1);
    // near the speaker first (getting smaller if needed), and only then the corners of the frame
    const start = Math.round(clamp(52 - (cam.z - 1) * 7, 34, 52) / 2) * 2;
    let last = null;
    for (const near of [true, false]) {
      for (let size = start; size >= 28 && !(last && last.ok); size -= 2) {
        c.font = `700 ${size}px ${FONT}`;
        const lines = wrap(c, b.text, 560 * size / 52);
        if (lines.length > 3) continue;
        const lh = size * 1.18, w = Math.max(...lines.map(l => c.measureText(l).width)) + 84 * size / 52, h = lines.length * lh + 56 * size / 52;
        const into = (x, y) => [clamp(x, 40 + w / 2, W - 40 - w / 2), clamp(y, 40 + h / 2, H - 40 - h / 2)];
        const sides = [b.side, -b.side];
        const cands = near
          ? sides.map(s => into(s > 0 ? me.x1 + 36 + w / 2 : me.x0 - 36 - w / 2, me.y0 + h / 2)).concat(
            [into(head.x, me.y0 - 20 - h / 2)], sides.map(s => into(head.x + s * w / 2, me.y0 - 20 - h / 2)))
          : sides.map(s => into(s > 0 ? W : 0, 0)).concat(sides.map(s => into(s > 0 ? W : 0, H)));
        const ok = cands.find(([x, y]) => fits(x, y, w, h));
        if (ok || !near && !last) last = { size, lines, lh, w, h, bx: (ok || cands[0])[0], by: (ok || cands[0])[1], ok: !!ok };
      }
      if (last && last.ok) break;
    }
    // the tail reaches toward the speaker but stops before the face
    const d = Math.hypot(head.x - last.bx, head.y - last.by), e = Math.min(last.w / 2, last.h / 2), faceR = (me.x1 - me.x0) / 2;
    last.L = clamp(d - e - faceR * 0.9, 24, 120);
    return last;
  }
  // screen boxes around every visible face (and where each head is on screen, for the shoulder in an over-the-shoulder shot)
  function faceBoxes(cam, Ks, heads) {
    const boxes = [], at = {};
    CAST.forEach(id => {
      let p = toScreen(cam, heads[id]), s = KS * cam.z;
      if (cam.ots && cam.ots.of === id) { const o = otsPlace(cam, Ks, id); p = o.head; s = o.K.s; }
      at[id] = p;
      if (p.x < -400 || p.x > W + 400) return;
      boxes.push({ id, x0: p.x - 128 * s, x1: p.x + 128 * s, y0: p.y - 105 * s, y1: p.y + 120 * s });
    });
    return { boxes, heads: at };
  }
  // the shoulder in an over-the-shoulder shot: big, at the frame edge on its own side, turned toward the other
  function otsPlace(cam, Ks, id) {
    const K = Ks[id], on = cam.ots.on.actors[0], dir = Math.sign(Ks[on].x - K.x) || 1, s = KS * cam.z * 1.6;
    const head = { x: dir > 0 ? W * 0.07 : W * 0.93, y: H * 0.62 };
    return { head, K: { ...K, x: head.x, y: head.y - REG[id].head * s * K.sy, h: K.h * cam.z * 1.6, s, f: dir * 0.85, lookX: dir * 0.8, lookY: 0 } };
  }
  function drawOts(k, cam, Ks) {
    const A = cam.ots.of, ax = aux.getContext('2d');
    applyCam(k, cam, 1); CAST.forEach(id => { if (id !== A) DRAW[id](k, Ks[id]); });
    const put = (alpha, filter) => { k.save(); k.setTransform(1, 0, 0, 1, 0, 0); k.globalAlpha = alpha; k.filter = filter; k.drawImage(aux, 0, 0); k.restore(); };
    // as the shot moves on, the shoulder character fades back to where it really stands
    if (cam.ots.a < 1) { ax.setTransform(1, 0, 0, 1, 0, 0); ax.clearRect(0, 0, W, H); applyCam(ax, cam, 1); DRAW[A](ax, Ks[A]); put(1 - cam.ots.a, 'none'); }
    // close to the camera: big, soft and a little darker. It is blurred anyway, so it is drawn at half size
    // and only on its own half of the frame, which keeps the blur quick.
    const o = otsPlace(cam, Ks, A), hx = o.head.x < W / 2 ? 0 : W / 2, sx = half.getContext('2d');
    sx.setTransform(1, 0, 0, 1, 0, 0); sx.clearRect(0, 0, W / 2, H / 2);
    sx.setTransform(0.5, 0, 0, 0.5, 0, 0); DRAW[A](sx, o.K);
    k.save(); k.setTransform(1, 0, 0, 1, 0, 0); k.globalAlpha = cam.ots.a; k.filter = 'blur(3px) brightness(0.6)';
    k.drawImage(half, hx / 2, 0, W / 4, H / 2, hx, 0, W / 2, H); k.restore();
  }
  function drawBubble(c, b, t, head, cam, F) {
    if (t < b.t0 || t > b.t1) return;
    const pin = easeOutBack((t - b.t0) / 0.38), out = ease((b.t1 - t) / 0.3), a = clamp((t - b.t0) / 0.12) * out, sc = (0.35 + 0.65 * pin) * (0.92 + 0.08 * out);
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
    let size = 52, lines, lh, w, h, bx, by, L = 120;
    if (F) {
      head = F.heads[b.who] || head;
      ({ size, lines, lh, w, h, bx, by, L } = framedBubble(c, b, head, cam, F));
    } else {
      for (; size >= 34; size -= 2) { c.font = `700 ${size}px ${FONT}`; lines = wrap(c, b.text, 560); if (lines.length <= 2) break; }
      lh = size * 1.18; w = Math.max(...lines.map(l => c.measureText(l).width)) + 84; h = lines.length * lh + 56;
      bx = head.x + b.side * (w / 2 + 170 * cam.z); by = head.y - 190;
      bx = clamp(bx, 40 + w / 2, W - 40 - w / 2); by = clamp(by, 40 + h / 2, H - 40 - h / 2);
      if (Math.abs(bx - head.x) < w / 2 + 110 * cam.z) by = Math.max(40 + h / 2, head.y - 150 * cam.z - h / 2 - 60);
    }
    const ang = Math.atan2(head.y - by, head.x - bx), dx = Math.cos(ang), dy = Math.sin(ang), px = -dy, py = dx;
    const ex = dx * (w / 2 - 34), ey = dy * (h / 2 - 16), tx = ex + dx * L, ty = ey + dy * L, bw = 24;
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
  let ctx, layer, aux, half;
  function render(t) {
    t = clamp(t, 0, P.duration);
    const c = ctx, cam = P.shots ? camShot(t) : camAt(t), tau = K_('tau', t);
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    const PN = placeAt(t);
    HP.cam = p => applyCam(c, cam, p);
    PN.draw(c, t, cam, tau, HP);
    if (P.props && P.props.length) drawProps(c, t, tau, PN, 'base');
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'multiply'; c.fillStyle = tod(tau, PN.grade); c.fillRect(0, 0, W, H); c.globalCompositeOperation = 'source-over';
    if (P.props && P.props.length) drawProps(c, t, tau, PN, 'light');
    const Ks = {}; CAST.forEach(id => { Ks[id] = actorState(id, t); });
    const k = layer.getContext('2d');
    k.setTransform(1, 0, 0, 1, 0, 0); k.globalCompositeOperation = 'source-over'; k.clearRect(0, 0, W, H);
    if (cam.ots) drawOts(k, cam, Ks); else { applyCam(k, cam, 1); CAST.forEach(id => DRAW[id](k, Ks[id])); }
    k.setTransform(1, 0, 0, 1, 0, 0); k.globalCompositeOperation = 'source-atop';
    k.globalAlpha = tau < 1 ? 0.06 * tau : 0.06 + 0.08 * (tau - 1); k.fillStyle = tod(tau, PN.tint); k.fillRect(0, 0, W, H);
    k.globalAlpha = 1; k.globalCompositeOperation = 'source-over';
    c.drawImage(layer, 0, 0);

    applyCam(c, cam, 1);
    const S = starAt(t);
    const segNow = starSegs.filter(q => q.t0 <= t).pop();
    const held = S && segNow && ['held', 'pickup', 'raise', 'lower'].includes(segNow.type);
    if (S && held) { c.save(); c.globalCompositeOperation = 'lighter'; glow(c, S.x, S.y, 560, '255,190,90', 0.12 * S.bright); c.restore(); }
    if (PN.front) PN.front(c, t, cam, tau, HP);
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

    // a change of place: the page fades to warm paper-white and back, with a few sparkles at its brightest
    if (P.places) P.places.forEach((ch, i) => {
      const u = (t - ch.t0) / (ch.t1 - ch.t0); if (u <= 0 || u >= 1) return;
      const a = u < 0.5 ? ease(u * 2) : ease((1 - u) * 2);
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = `rgba(255,250,240,${a})`; c.fillRect(0, 0, W, H); c.restore();
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
      for (let k = 0; k < 9; k++) sparkle(c, 260 + hash(i * 31 + k) * 1400, 200 + hash(i * 31 + k + 9) * 680, 18 * a, a * 0.9, '255,214,120');
      c.restore();
    });
    // slow motion: a soft, dreamy glow at the edges and a few drifting sparkles
    if (P.slowmo) P.slowmo.forEach((sm, i) => {
      const a = win(t, sm.t0, sm.t1, 0.4, 0.5); if (a <= 0) return;
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
      const g = c.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
      g.addColorStop(0, 'rgba(255,248,230,0)'); g.addColorStop(1, `rgba(255,244,220,${0.32 * a})`);
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      for (let k = 0; k < 14; k++) {
        const u = ((t - sm.t0) * 0.12 + hash(i * 41 + k)) % 1;
        sparkle(c, 120 + hash(i * 41 + k + 7) * 1680, H * (0.95 - u * 0.9), 10 + 8 * hash(k + 3), a * Math.sin(u * Math.PI) * 0.8, '255,236,170');
      }
      c.restore();
    });
    P.titles.forEach(T => drawTitle(c, T, t));
    P.captions.forEach(cap => drawCaption(c, cap, t));
    const F = cam.framed ? faceBoxes(cam, Ks, heads) : null;
    P.bubbles.forEach(b => drawBubble(c, b, t, toScreen(cam, heads[b.who]), cam, F));
    c.setTransform(1, 0, 0, 1, 0, 0);
    const vg = c.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.05);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(20,10,30,${0.12 + 0.07 * tau})`);
    c.fillStyle = vg; c.fillRect(0, 0, W, H);
    const [f0, f1] = P.pictureFadeOut, fade = clamp((t - f0) / (f1 - f0)) + (1 - clamp(t / 0.5));
    if (fade > 0) { c.fillStyle = `rgba(0,0,0,${clamp(fade)})`; c.fillRect(0, 0, W, H); }
  }

  async function init(canvas, plan) {
    P = plan; KS = plan.scale; CAST = plan.cast; REG = { ...StudioCharacters.CHARACTERS };
    // picture assets (PNG files in assets/): registered from the plan, every picture loaded before drawing
    if (plan.pictures && plan.pictures.length) { StudioPictures.register(plan.pictures); await StudioPictures.preload(plan.pictures); }
    // places the story names that don't exist yet are shown as placeholders
    (plan.missingPlaces || []).forEach(n => StudioPlaces.placeholder(n));
    PL = StudioPlaces.PLACES[plan.meta.place] || StudioPlaces.find(plan.meta.place) || StudioPlaces.PLACES.meadow;
    // extras act like small characters: drawn by their asset, or as a grey placeholder
    Object.entries(plan.extras || {}).forEach(([id, d]) => {
      const a = StudioAssets.ASSETS[id];
      REG[id] = StudioAssets.extraCharacter(id, a || d);
      DRAW[id] = a && a.draw ? (c, K) => a.draw(c, K) : (c, K) => drawExtraPlaceholder(c, K, REG[id]);
    });
    HP = { W, H, duration: plan.duration, cam: null };
    CAST.forEach(id => { if (!DRAW[id]) DRAW[id] = window[REG[id].global][REG[id].draw]; });
    starSegs = plan.star.filter(s => s.type !== 'flicker').sort((a, b) => a.t0 - b.t0);
    flickers = plan.star.filter(s => s.type === 'flicker');
    ctx = canvas.getContext('2d');
    layer = document.createElement('canvas'); layer.width = W; layer.height = H;
    aux = document.createElement('canvas'); aux.width = W; aux.height = H;
    half = document.createElement('canvas'); half.width = W / 2; half.height = H / 2;
    if (P.shots) buildRigs();
    await Promise.all(['700 52px Fredoka', 'italic 500 40px Lora'].map(f => document.fonts.load(f)));
    render(0);
  }
  // For checks: where each visible face (eyes to chin) is on screen at t, and whether the frame cuts it.
  // The shoulder in an over-the-shoulder shot is cut on purpose and is left out.
  function faces(t) {
    const cam = P.shots ? camShot(t) : camAt(t), out = [];
    CAST.forEach(id => {
      if (!onStage(id, t) || cam.ots && cam.ots.of === id) return;
      const K = actorBody(id, t), p = toScreen(cam, toWorld(K, K.f * 6, REG[id].head)), s = KS * cam.z;
      const box = { x0: p.x - 90 * s, x1: p.x + 90 * s, y0: p.y - 70 * s, y1: p.y + 75 * s };
      if (box.x1 < 0 || box.x0 > W || box.y1 < 0 || box.y0 > H) return;   // not in the picture at all
      out.push({ id, z: +cam.z.toFixed(2), cut: box.x0 < 0 || box.x1 > W || box.y0 < 0 || box.y1 > H, box });
    });
    return out;
  }
  // For checks: a character's pose at t (facing, look, mood...), exactly as it is drawn
  const pose = (id, t) => actorState(id, t);
  window.StudioFilm = { init, render, faces, pose };
})();
