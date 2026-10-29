// Scene renderer: draws any compiled story plan. render(t) is deterministic.
(() => {
  // the picture (1920×1080, or 1080×1920 for vertical stories; set from the plan). Places are designed around the point
  // (RX, RY) of the 1920×1080 stage, so a vertical picture shows the same place, taller (more sky, more ground).
  let W = 1920, H = 1080, VERT = false;
  const RX = 960, RY = 540;
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
      const hh = w.gait === 'run' ? 46 : w.gait === 'sneak' ? 12 : w.gait === 'crawl' ? 7 : 30;   // running: bigger hops; sneaking, crawling: tiny ones
      return { h: v < 0.8 ? Math.sin(v / 0.8 * Math.PI) * hh : 0, land: v >= 0.8 ? Math.sin((v - 0.8) / 0.2 * Math.PI) : 0 };
    }
    return null;
  }
  const onStage = (id, t) => { const x = actorX(id, t); return x > -60 && x < 1980; };
  // how much a character is running at t (0 to 1, easing in and out at the ends of the run)
  function runAt(id, t) {
    for (const w of P.actors[id].walks) if (w.gait === 'run' && t > w.t0 - 0.15 && t < w.t1 + 0.25) return win(t, w.t0 - 0.15, w.t1 + 0.25, 0.2, 0.3);
    return 0;
  }
  // Body: position, squash, facing, arms. Never depends on props (so props can follow it).
  function actorBody(id, t) {
    const a = P.actors[id], n = CAST.indexOf(id);
    const x = actorX(id, t), v = (actorX(id, t + 0.02) - actorX(id, t - 0.02)) / 0.04;
    const walk = REG[id].moves === 'hop' ? 0 : clamp(Math.abs(v) / 140), run = runAt(id, t);
    let h = 0, sx = 1, sy = 1, hopping = false;
    for (const hp of a.hops) {
      const pre = hp.t0 - 0.14;
      if (t > pre && t < hp.t0) { const q = Math.sin((t - pre) / 0.14 * Math.PI); sy *= 1 - 0.09 * q; sx *= 1 + 0.07 * q; }
      if (t >= hp.t0 && t <= hp.t1) {
        const u = (t - hp.t0) / (hp.t1 - hp.t0); h = Math.sin(u * Math.PI) * hp.h; hopping = hp.face === false ? 'keep' : true;
        const st = 0.07 * Math.abs(Math.cos(u * Math.PI)) * Math.sin(u * Math.PI) * 2; sy *= 1 + st; sx *= 1 - st * 0.7;
      }
      if (t > hp.t1 && t < hp.t1 + 0.2) { const q = Math.sin((t - hp.t1) / 0.2 * Math.PI); sy *= 1 - 0.12 * q; sx *= 1 + 0.09 * q; }
    }
    const th = travelHop(id, t);
    if (th) { h += th.h; sy *= 1 - 0.1 * th.land; sx *= 1 + 0.08 * th.land; }
    const crouch = A_(id, 'crouch', t), air = a.keys.air ? A_(id, 'air', t) : 1;   // air: 1 flying, 0 landed
    // breathing and idle sway, each character on its own phase
    sy *= crouch * (1 + 0.012 * Math.sin(t * 2.6 + n * 1.7)); sx *= 1 + (1 - crouch) * 0.45;
    const phase = x / 160 * Math.PI * 2, swing = Math.sin(phase) * 0.35 * walk * (1 + 0.9 * run), idle = Math.sin(t * 2 + n * 2.1) * 0.04;
    // running: a bouncy stride (walkers; hoppers run in bigger hops instead)
    if (run && walk) h += Math.abs(Math.sin(phase)) * 14 * run * walk;
    let wave = 0; for (const w of a.waves) wave += Math.sin((t - w.a) * 9) * 0.35 * win(t, w.a, w.b, 0.2, 0.3);
    return {
      id, t, x, y: placeAt(t).ground(x) - (REG[id].fly || 0) * air, air, h, sx, sy, s: KS, f: A_(id, 'facing', t), walk, phase, hopping, run,
      armL: A_(id, 'armL', t) + swing + idle, armR: A_(id, 'armR', t) - swing + idle + wave,
      ...(a.keys.away ? { away: A_(id, 'away', t) } : {}),
    };
  }
  // the place on screen at t: a change of place switches halfway through its fade
  const placeAt = t => { let p = PL; if (P.places) for (const ch of P.places) if (t >= (ch.t0 + ch.t1) / 2) p = StudioPlaces.PLACES[ch.to]; return p; };
  const toWorld = (K, lx, ly) => ({ x: K.x + lx * K.s * K.sx, y: K.y - K.h + ly * K.s * K.sy });
  const headOf = (id, t) => { const B = actorBody(id, t); return { vis: true, ...toWorld(B, B.f * 6, REG[id].head) }; };

  // what each mood looks like comes from the character registry; anything a mood leaves out is neutral
  const NEUTRAL = { eyes: 'normal', mouth: 'smile', wide: 0, brows: 0, droop: 0, blush: 0, lookY: 0, wag: 0, puff: 0, flop: 0, pawPose: null, pawW: 0,
    lookX: 0, tilt: 0, lift: 0, lean: 0, bounce: 0, shake: 0, tremble: 0, tears: 0, firm: 0 };
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
    let lx = A_(id, 'lookX', t) + mix('lookX'), ly = A_(id, 'lookY', t) + mix('lookY');
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
    K.tilt = A_(id, 'tilt', t) + Math.sin(t * 0.9 + n * 1.3) * 0.025 + mix('brows') * 0.06 + mix('tilt');
    K.eyes = pick('eyes'); K.mouth = pick('mouth'); K.wide = mix('wide'); K.brows = mix('brows');
    K.moodMouth = K.mouth;   // the mood's own mouth, so a talking mouth can follow the mood (sad talking isn't a smile)
    K.blushBoost = mix('blush'); K.puff = mix('puff'); K.flop = mix('flop');
    K.lift = mix('lift'); K.lean = mix('lean'); K.tears = mix('tears'); K.firm = mix('firm');
    K.pawPose = m.cur.pawPose || m.prev.pawPose;
    K.pawW = lerp(m.prev.pawPose === K.pawPose ? m.prev.pawW : 0, m.cur.pawPose === K.pawPose ? m.cur.pawW : 0, m.w);
    // a paw pose from the story's actions ("covers its eyes", "yawns"): it wins over the mood's own while it lasts
    if (a.paws) for (const pw of a.paws) {
      const w = win(t, pw.a, pw.b, 0.25, 0.3); if (w <= 0) continue;
      K.pawW = K.pawPose === pw.pose ? Math.max(K.pawW, w) : w; K.pawPose = pw.pose;
    }
    if (K.hopping === true) K.eyes = 'happy';   // (a startled jump keeps its scared face)
    K.talk = 0;
    for (const v of P.voice) {
      if (v.who !== id || t < v.t || t >= v.t + v.len) continue;
      K.mouth = 'talk';
      if (v.lips) {
        // lip-sync (see engine/lipsync.js): the shape for this frame, and how open, eased between frames
        const L = v.lips, u = (t - v.t) * L.fps, i = Math.min(L.open.length - 1, Math.floor(u)), j = Math.min(L.open.length - 1, i + 1);
        K.viseme = L.shape[i] || 'X';
        K.talk = K.viseme === 'X' || K.viseme === 'M' ? 0 : lerp(+L.open[i], L.shape[j] === K.viseme ? +L.open[j] : +L.open[i], u - i) / 9;
      } else K.talk = 0.25 + 0.75 * Math.abs(Math.sin((t - v.t) * 13.5)) * (0.6 + 0.4 * Math.abs(Math.sin((t - v.t) * 4.7 + 1)));
    }
    if (K.mouth === 'talk' && K.pawPose === 'yawn') K.pawW *= 0.15;   // move the paw away so the talking mouth shows
    K.blink = 0;
    if (K.eyes !== 'happy') for (const b of a.blinks) { const u = (t - b) / (K.eyes === 'sleepy' ? 0.4 : 0.18); if (u > 0 && u < 1) K.blink = Math.sin(u * Math.PI); }
    let tw = 0, side = 1;
    a.twitches.forEach((tt, i) => { const u = (t - tt) / 0.32; if (u > 0 && u < 1) { tw = Math.sin(u * Math.PI) * 0.32; side = i % 2 ? 1 : -1; } });
    const base = mix('droop') - 0.12 * K.wide;
    K.earL = base + (side < 0 ? tw : 0); K.earR = base + (side > 0 ? tw : 0);
    const wag = Math.max(mix('wag'), K.hopping === true ? 1 : 0);
    K.tail = Math.sin(t * 2.3) * 0.15 + K.walk * Math.sin(K.phase) * 0.18 + wag * Math.sin(t * 9) * 0.2;
    // excited bounces a little, laughing shakes gently, scared trembles
    const bounce = mix('bounce'), shake = mix('shake'), tremble = mix('tremble');
    if (bounce > 0 && !K.hopping) K.h += Math.abs(Math.sin(t * 6.5)) * 8 * bounce;
    if (shake > 0) { K.sy *= 1 + 0.025 * Math.sin(t * 16) * shake; K.tilt += Math.sin(t * 8) * 0.03 * shake; }
    if (tremble > 0) K.x += Math.sin(t * 43) * 2.2 * tremble;
    // posed joints from the story's actions (sit, lean, point, count...): the "rig.<joint>" channels, then "sit" and "nod"
    for (const k in a.keys) if (k.startsWith('rig.')) { const v = A_(id, k, t); if (v) (K.rig || (K.rig = {}))[k.slice(4)] = v; }
    if (a.keys.sit) K.sit = A_(id, 'sit', t);
    // running leans forward, into the run
    if (K.run) (K.rig || (K.rig = {})).spine = (K.rig.spine || 0) + (Math.sign(K.f) || 1) * 0.14 * K.run;
    if (a.keys.nod) K.nod = A_(id, 'nod', t);
    if (a.keys.roll) K.roll = A_(id, 'roll', t);   // lying down: the whole body tipped over (radians)
    if (P.props) for (const p of P.props) { const h = p.holds && holdOf(p, t); if (h && h.who === id) K.hold = holdHook(p, h, t); }   // a prop in its paw
    springPose(id, t, K);
    // a clean turn: as the drawing switches pose, a tiny squash; and one quick blink per turn (see turnBlink)
    const sw = turnSwitch(id, t);
    if (sw > 0) { K.sy *= 1 - 0.04 * sw; K.sx *= 1 + 0.03 * sw; }
    if (turnBlink(id, t)) K.blink = 1;
    return K;
  }

  // who is drawn first (furthest back): the cast in order, except that anyone hiding behind someone goes first
  const drawOrder = t => {
    const hid = id => (P.actors[id].behind || []).some(w => t >= w.a && t < w.b);
    return CAST.some(hid) ? [...CAST.filter(hid), ...CAST.filter(id => !hid(id))] : CAST;
  };

  // ---------- clean turns ----------
  // The drawings turn through solid poses (front, three-quarter, side, and back when turning away), switching where
  // the turn (facing, or 2 × away past the side) crosses 0.3, 0.7 and 1.35. Near each crossing (within 0.05 s, while
  // the character is really turning) the switch gets a tiny squash and a blink: 1 at the crossing, 0 at 0.05 s away.
  const TURN_SWITCHES = [0.3, 0.7, 1.35];
  // facing at t, with the small turn toward whoever is talking (as in actorState)
  function facingAt(id, t) {
    let f = A_(id, 'facing', t);
    if (CAST.length > 1 && onStage(id, t)) {
      const x = actorX(id, t);
      for (const v of P.voice) {
        if (v.who === 'narrator') continue;
        const w = win(t, v.t - 0.25, v.t + v.len + 0.4, 0.35, 0.45); if (w <= 0) continue;
        const other = v.who === id ? CAST.find(o => o !== id && onStage(o, t)) : v.who;
        if (!other || other === id || !onStage(other, t)) continue;
        f += (Math.sign(actorX(other, t) - x) || 1) * 0.2 * w * (v.who === id ? 0.5 : 1) * (1 - clamp(Math.abs(f) / 0.3));
      }
    }
    return f;
  }
  function turnSwitch(id, t) {
    if (REG[id].extra) return 0;
    const a = P.actors[id], turn = u => Math.max(Math.abs(facingAt(id, u)), 2 * (a.keys.away ? A_(id, 'away', u) : 0));
    const e0 = turn(t - 0.05), e1 = turn(t + 0.05);
    if (Math.abs(e1 - e0) < 1e-4) return 0;
    let s = 0;
    for (const B of TURN_SWITCHES) if ((e0 - B) * (e1 - B) < 0) s = Math.max(s, 1 - Math.abs(t - (t - 0.05 + 0.1 * (B - e0) / (e1 - e0))) / 0.05);
    return clamp(s);
  }
  // At most one blink per turn, fully closed for about 2 frames (no half-closed frames), at the turn's biggest switch:
  // three-quarter / side (0.7), or side / back (1.35) when turning away or back. Only the story's own turns count
  // (facing and away), not the small turn toward whoever is talking, so listening and talking never blink.
  function turnBlink(id, t) {
    if (REG[id].extra) return false;
    const a = P.actors[id], away = u => (a.keys.away ? A_(id, 'away', u) : 0);
    const turn = u => Math.max(Math.abs(A_(id, 'facing', u)), 2 * away(u));
    const e0 = turn(t - 0.034), e1 = turn(t + 0.034);
    if (Math.abs(e1 - e0) < 1e-4) return false;
    const B = Math.max(away(t - 0.5), away(t + 0.5)) > 0.5 ? 1.35 : 0.7;
    return (e0 - B) * (e1 - B) < 0;
  }

  // ---------- spring motion ----------
  // Ears, tails and Ren's scarf ends follow the body with springs, pushed by how the body speeds up and slows down
  // (hops and landings, steps, starts and stops). Stepped at 120 Hz from t = 0 when the story loads, so every frame,
  // and every worker drawing part of the video, gets exactly the same motion; kept as 60 values a second (about 2 MB
  // for a 12-minute story). A character that hasn't moved has springs at exactly 0, so it is drawn as before.
  const SPRING_RATE = 60, SPRING_SUB = 2;
  //            how fast (Hz), damping, and how hard the body's acceleration pushes (vertical, along the facing)
  const SPRINGS = { ear: [2.4, 0.3, 0.045, 0], lean: [2.0, 0.35, 0, 0.04], tailA: [1.6, 0.35, 0.014, 0.03], tailB: [2.2, 0.4, 0, 0], scarf: [2.8, 0.25, 0.026, 0.09] };
  let SPR = {};
  function buildSprings() {
    SPR = {};
    const dt = 1 / (SPRING_RATE * SPRING_SUB), n = Math.ceil(P.duration * SPRING_RATE) + 2, lim = a => clamp(a, -3000, 3000);
    CAST.forEach(id => {
      if (REG[id].extra) return;
      const out = {}, S = {};
      for (const k in SPRINGS) { out[k] = new Float32Array(n); S[k] = [0, 0]; }
      // where the body is (the walking bob included) and which way it faces
      const at = t => { const B = actorBody(id, t); return [B.x, B.y - B.h - Math.abs(Math.sin(B.phase)) * 5 * B.walk, B.f < 0 ? -1 : 1]; };
      const step = (k, target, push) => { const [hz, z] = SPRINGS[k], w = 2 * Math.PI * hz, q = S[k]; q[1] += (-w * w * (q[0] - target) - 2 * z * w * q[1] + push) * dt; q[0] += q[1] * dt; };
      let p0 = at(-dt), p1 = at(0);
      for (let i = 0; i < n * SPRING_SUB; i++) {
        const p2 = at((i + 1) * dt), ax = lim((p2[0] - 2 * p1[0] + p0[0]) / (dt * dt)), ay = lim((p2[1] - 2 * p1[1] + p0[1]) / (dt * dt)), fwd = ax * p1[2];
        const push = k => -ay * SPRINGS[k][2] - fwd * SPRINGS[k][3];
        // (a moving body pushes; still, the springs just settle)
        step('ear', 0, push('ear')); step('lean', 0, -ax * SPRINGS.lean[3]); step('tailA', 0, push('tailA'));
        step('tailB', S.tailA[0] * 1.3, 0); step('scarf', 0, push('scarf'));
        if (i % SPRING_SUB === 0) for (const k in SPRINGS) out[k][i / SPRING_SUB] = S[k][0];
        p0 = p1; p1 = p2;
      }
      SPR[id] = out;
    });
  }
  // the springs at t, as joint angles (K.rig) for the drawings: ear tips (never bending in so far that Yuki's long
  // ears could cross), the tail chain, the scarf ends
  function springPose(id, t, K) {
    const o = SPR[id];
    if (!o) return;
    const u = clamp(t * SPRING_RATE, 0, o.ear.length - 1.001), i = Math.floor(u), w = u - i, v = k => o[k][i] + (o[k][i + 1] - o[k][i]) * w;
    const ear = clamp(v('ear'), -0.3, 0.6), lean = clamp(v('lean'), -0.3, 0.3) * (Math.abs(K.f) >= 0.3 && K.f < 0 ? -1 : 1);
    const tA = clamp(v('tailA'), -0.5, 0.5), tB = clamp(v('tailB'), -0.6, 0.6), sc = clamp(v('scarf'), -0.5, 0.5);
    const r = { earTipL: Math.max(-0.25, ear - lean), earTipR: Math.max(-0.25, ear + lean), tail1: tA * 0.6, tail2: tA * 0.4 + tB * 0.4, tail3: tB * 0.7, scarf: sc };
    for (const k in r) if (Math.abs(r[k]) < 0.004) delete r[k];
    if (Object.keys(r).length) K.rig = { ...r, ...(K.rig || {}) };
  }

  // the moon: a crescent unless the story says "moon: full"
  function moonAt(t) { let m = P.meta.moon || 'crescent'; for (const e of P.moon || []) if (e.t <= t) m = e.value; return m; }

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
      case 'place': {
        const from = seg._from || (seg._from = (() => { const B = actorBody(seg.who, seg.t0); return toWorld(B, 0, REG[seg.who].overhead); })());
        const q = ease(u); p = { x: lerp(from.x, seg.to.x, q), y: lerp(from.y, seg.to.y, q) - Math.sin(q * Math.PI) * 50 }; r = lerp(28, 26, q); break;
      }
      case 'slot': p = seg.at; r = seg.r; break;
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
    c.translate(-(RX + (cam.cx - RX) * p), -(RY + (cam.cy - RY) * p));
  }
  const toScreen = (cam, p) => ({ x: (p.x - cam.cx) * cam.z + W / 2, y: (p.y - cam.cy) * cam.z + H / 2 });

  // ---------- props, set pieces and extras (asset kit) ----------
  // where a prop is (for looking at it), or null when it isn't on stage
  function propPoint(i, t) {
    const p = P.props[i];
    if (!p || t < p.t0 || (p.t1 !== null && t > p.t1)) return null;
    const h = holdOf(p, t);
    if (h) { const B = actorBody(h.who, t); return { vis: true, ...toWorld(B, B.f * 30, REG[h.who].chest) }; }
    const g = groundOf(p, t);
    return { vis: true, x: g.x, y: g.y - p.height * 0.6 };
  }
  // ---------- props in paws (asset kit, Part D) ----------
  // A prop someone holds has holds: [{ t0, t1, who, how: 'one' | 'both' | 'up', from }] (t0: the lift starts; t1: let
  // go, or null) and, once put down or dropped somewhere, spots: [{ t, x, y, fall: 'put' | 'drop' }]. Props without
  // them are drawn exactly as before.
  const LIFT = 0.35, LAND = 0.32;
  let curCam = null;   // this frame's camera (a prop being lifted comes from where it stood)
  const holdOf = (p, t) => (p.holds ? p.holds.find(h => t >= h.t0 && (h.t1 === null || t < h.t1)) || null : null);
  function groundOf(p, t) { let g = { x: p.x, y: p.y, t: -1, fall: null }; if (p.spots) for (const q of p.spots) if (q.t <= t) g = q; return g; }
  // the prop's state at t (open, glowing...) and how far its glow is on
  function propLook(p, t) {
    const st = lastAt(p.states, t), gl = lastAt(p.glow, t), asset = p.asset && StudioAssets.ASSETS[p.asset];
    const glowA = gl ? (gl.on ? ease((t - gl.t) / 0.4) : 1 - ease((t - gl.t) / 0.4)) : 0;
    let state = st ? st.state : asset && asset.states.length ? asset.states[0] : 'closed';
    if (glowA > 0.5 && asset && asset.states.includes('glowing')) state = 'glowing';
    return { st, asset, glowA, state };
  }
  // how a held prop sits on the paw: it hangs from its grip (a lantern by its handle), or is held in the middle, or
  // (held up) rests on top of the paw. Returns how far down to draw it from the paw.
  function gripOf(p, how) {
    const a = p.asset && StudioAssets.ASSETS[p.asset];
    if (a && a.hangs) return -a.grip;   // (a lantern always hangs by its handle)
    return how === 'up' ? 6 : a && a.grip !== undefined ? -a.grip : p.height * 0.5;
  }
  // The character's drawing calls hold.at(c, x, y) with its near paw (in the drawing's own coordinates): the prop is
  // drawn there, upright, at the world's size (the character's own scale taken out); while being lifted it glides
  // there from where it stood. Where it was drawn is kept for the light pass (a lit lantern stays bright).
  function holdHook(p, h, t) {
    return {
      at(c, x, y) {
        const m = c.getTransform(), q = m.transformPoint(new DOMPoint(x, y)), s = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) / KS;
        let px = q.x, py = q.y, sc = s, dy = gripOf(p, h.how);
        if (h.lift !== false && t < h.t0 + LIFT && curCam) {
          const u = ease((t - h.t0) / LIFT), g = toScreen(curCam, h.from);
          px = lerp(g.x, q.x, u); py = lerp(g.y, q.y, u) - Math.sin(u * Math.PI) * 20 * s; sc = lerp(curCam.z, s, u); dy = lerp(0, dy, u);
        }
        const L = propLook(p, t);
        c.save(); c.setTransform(sc, 0, 0, sc, px, py); c.translate(0, dy); c.lineJoin = 'round'; c.lineCap = 'round';
        if (!L.asset) drawPropPlaceholder(c, p, L.st ? L.state : null); else if (!L.asset.emissive) L.asset.draw(c, t, L.state, { tau: 0, tint: null });
        c.restore();
        h.dev = { t, x: px, y: py, s: sc, dy };
      },
    };
  }
  // after the characters: the light of held props (a glow, a lit flame), never darkened by the time of day
  function drawHeldLight(c, t) {
    for (const p of P.props) {
      const h = p.holds && holdOf(p, t);
      if (!h || !h.dev || h.dev.t !== t) continue;
      const L = propLook(p, t);
      if (!(L.glowA > 0 || (L.asset && (L.asset.emissive || L.asset.drawLight)))) continue;
      c.save(); c.setTransform(h.dev.s, 0, 0, h.dev.s, h.dev.x, h.dev.y); c.translate(0, h.dev.dy);
      if (L.glowA > 0) { c.save(); c.globalCompositeOperation = 'lighter'; glow(c, 0, -p.height * 0.55, p.height * 1.3, '255,222,140', 0.45 * L.glowA); c.restore(); }
      // (someone hiding behind another: only the soft glow shows, not the lit lantern in front of them)
      const hiding = (P.actors[h.who].behind || []).some(w => t >= w.a && t < w.b);
      if (!hiding && L.asset && L.asset.emissive) L.asset.draw(c, t, L.state, {});
      else if (!hiding && L.asset && L.asset.drawLight) L.asset.drawLight(c, t, L.state, {});
      c.restore();
    }
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
      if (p.holds && holdOf(p, t)) return;   // in someone's paw: their drawing draws it
      const a = p.t1 !== null ? clamp((p.t1 - t) / 0.5) : 1, pop = easeOutBack((t - p.t0) / 0.4);
      const { st, asset, glowA, state } = propLook(p, t);
      // put down (a short way) or dropped (from paw height, with a little bounce) where it stands now
      const g = groundOf(p, t), u = g.fall ? (t - g.t) / LAND : 1;
      const lift = u >= 1 ? (g.fall === 'drop' ? Math.abs(Math.sin((t - g.t - LAND) * 14)) * 10 * Math.exp(-(t - g.t - LAND) * 7) : 0) : (g.fall === 'drop' ? 80 * (1 - u * u) : 26 * (1 - ease(u)));
      HP.cam(1);
      c.save(); c.translate(g.x, g.y - lift); c.globalAlpha = a; c.scale(pop, pop);
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
  // big outlined text: the outline eats into the spaces between words, so they get wider (a share of the font size)
  const WORD_GAP = 0.22, wordGap = (c, size) => { c.wordSpacing = `${Math.round(size * WORD_GAP)}px`; };
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
    const lines = wrap(c, cap.text, VERT ? 600 : 1300), lh = 54, w = Math.max(...lines.map(l => c.measureText(l).width)) + 90, h = lines.length * lh + 44;
    const x = W / 2 - w / 2, y = (VERT ? H * 0.08 + 14 : 54) - (1 - a) * 10;
    drawn.push({ kind: 'caption', x0: x, x1: x + w, y0: y, y1: y + h });
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
    // A long line can need more than 3 lines at every size above (the wrapping width shrinks with the text). Then the
    // width stays put while the text gets smaller, so fewer lines are needed; and failing everything, the smallest
    // size in a corner. (Bubbles that fit above are laid out exactly as before.)
    if (!last) {
      const maxW = 560 * start / 52;
      for (let size = start; size >= 24 && !(last && last.ok); size -= 2) {
        c.font = `700 ${size}px ${FONT}`;
        const lines = wrap(c, b.text, maxW);
        if (lines.length > 4 && size > 24) continue;
        const lh = size * 1.18, w = Math.max(...lines.map(l => c.measureText(l).width)) + 84 * size / 52, h = lines.length * lh + 56 * size / 52;
        const into = (x, y) => [clamp(x, 40 + w / 2, W - 40 - w / 2), clamp(y, 40 + h / 2, H - 40 - h / 2)];
        const sides = [b.side, -b.side];
        const cands = sides.map(s => into(s > 0 ? me.x1 + 36 + w / 2 : me.x0 - 36 - w / 2, me.y0 + h / 2)).concat(sides.map(s => into(s > 0 ? W : 0, 0)));
        const ok = cands.find(([x, y]) => fits(x, y, w, h));
        if (ok || !last) last = { size, lines, lh, w, h, bx: (ok || cands[0])[0], by: (ok || cands[0])[1], ok: !!ok };
      }
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
    let size = 52, lines, lh, w, h, bx, by, L = 120, framed = null;
    if (F) {
      head = F.heads[b.who] || head;
      try { framed = framedBubble(c, b, head, cam, F); } catch (e) { console.warn(`bubble "${b.text}": ${e.message}; placed the usual way`); }
    }
    if (framed) ({ size, lines, lh, w, h, bx, by, L } = framed);
    else if (VERT) {
      for (; size >= 34; size -= 2) { c.font = `700 ${size}px ${FONT}`; lines = wrap(c, b.text, 560); if (lines.length <= 3) break; }
      lh = size * 1.18; w = Math.max(...lines.map(l => c.measureText(l).width)) + 84; h = lines.length * lh + 56;
      bx = clamp(head.x, W * 0.04 + w / 2, W * 0.85 - w / 2);
      by = clamp(head.y - 250 * cam.z - h / 2 - 20, H * 0.08 + h / 2 + 10, H * 0.8 - h / 2);   // above the ears
      L = clamp(Math.hypot(head.x - bx, head.y - by) - h / 2 - 120 * cam.z, 24, 200);
    } else {
      for (; size >= 34; size -= 2) { c.font = `700 ${size}px ${FONT}`; lines = wrap(c, b.text, 560); if (lines.length <= 2) break; }
      lh = size * 1.18; w = Math.max(...lines.map(l => c.measureText(l).width)) + 84; h = lines.length * lh + 56;
      bx = head.x + b.side * (w / 2 + 170 * cam.z); by = head.y - 190;
      bx = clamp(bx, 40 + w / 2, W - 40 - w / 2); by = clamp(by, 40 + h / 2, H - 40 - h / 2);
      if (Math.abs(bx - head.x) < w / 2 + 110 * cam.z) by = Math.max(40 + h / 2, head.y - 150 * cam.z - h / 2 - 60);
    }
    // ways of talking: a whisper's bubble is smaller, a shout's a little bigger (and its spikes reach further)
    const st = b.style, k = st === 'whisper' ? 0.86 : st === 'shout' ? 1.06 : 1, pad = (st === 'shout' ? 26 : st === 'think' ? 20 : 0) * k;
    const ox = w * (k - 1) / 2 + pad, oy = h * (k - 1) / 2 + pad;
    if (ox > 0 || oy > 0) {
      // the spikes and puffs also stay inside the picture (and in vertical, inside the safe area)
      const top = VERT ? H * 0.08 + 4 : 40, bottom = VERT ? H * 0.8 - 4 : H - 40, left = VERT ? W * 0.04 : 40, right = VERT ? W * 0.85 - 4 : W - 40;
      bx = clamp(bx, left + w / 2 + ox, right - w / 2 - ox); by = clamp(by, top + h / 2 + oy, bottom - h / 2 - oy);
    }
    drawn.push({ kind: 'bubble', x0: bx - w * k / 2 - pad, x1: bx + w * k / 2 + pad, y0: by - h * k / 2 - pad, y1: by + h * k / 2 + pad });
    const ang = Math.atan2(head.y - by, head.x - bx), dx = Math.cos(ang), dy = Math.sin(ang), px = -dy, py = dx;
    const ex = dx * (w / 2 - 34), ey = dy * (h / 2 - 16), tx = ex + dx * L, ty = ey + dy * L, bw = st === 'whisper' ? 16 : 24;
    c.globalAlpha = a; c.translate(bx, by); c.scale(sc * k, sc * k);
    if (st === 'shout') c.rotate(-0.025);
    const body = () => { c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, Math.min(h / 2, 60)); };
    const tail = () => { c.beginPath(); c.moveTo(ex + px * bw, ey + py * bw); c.quadraticCurveTo((ex + tx) / 2 + px * 9, (ey + ty) / 2 + py * 9, tx, ty); c.quadraticCurveTo((ex + tx) / 2 - px * 3, (ey + ty) / 2 - py * 3, ex - px * bw, ey - py * bw); c.closePath(); };
    c.lineJoin = 'round'; c.strokeStyle = '#111'; c.lineWidth = 14; c.fillStyle = '#fffcf2';
    if (st === 'think') {
      // a cloud: round puffs all along the edge, and little circles leading to the thinker's head instead of a tail
      const cloud = () => {
        body();
        const n = Math.max(8, Math.round((w + h) / 40)), r = Math.min(30, h * 0.3);
        for (let i = 0; i < n; i++) {
          const q = i / n * Math.PI * 2, cq = Math.cos(q), sq = Math.sin(q);
          const x = (w / 2 - r * 0.35) * Math.sign(cq) * Math.pow(Math.abs(cq), 0.45), y = (h / 2 - r * 0.35) * Math.sign(sq) * Math.pow(Math.abs(sq), 0.45);
          c.moveTo(x + r, y); c.arc(x, y, r, 0, Math.PI * 2);
        }
      };
      const dots = () => { [[0.3, 15], [0.62, 10.5], [0.92, 7]].forEach(([u, r]) => { const x = ex + dx * (20 + L * u), y = ey + dy * (14 + L * u); c.moveTo(x + r, y); c.arc(x, y, r, 0, Math.PI * 2); }); };
      c.lineWidth = 12; c.beginPath(); dots(); c.stroke(); c.fill();
      cloud(); c.stroke(); cloud(); c.fill();
    } else if (st === 'whisper') {
      // soft and quiet: a paler bubble with a dashed outline, and a small dashed triangle for a tail that starts at
      // the bubble's edge (only its two outer sides are drawn, so no line ever enters the bubble)
      const r = Math.min(h / 2, 60), e = Math.min((w / 2 - r * 0.3) / Math.max(1e-6, Math.abs(dx)), (h / 2 - r * 0.3) / Math.max(1e-6, Math.abs(dy)));
      const qx = dx * e, qy = dy * e, tip = [qx + dx * (L * 0.85 + 14), qy + dy * (L * 0.85 + 14)];
      const side = s => [qx + px * 14 * s + dx * 4, qy + py * 14 * s + dy * 4];
      c.fillStyle = '#fffdf7';
      c.beginPath(); c.moveTo(qx + px * 14 - dx * 10, qy + py * 14 - dy * 10); c.lineTo(...tip); c.lineTo(qx - px * 14 - dx * 10, qy - py * 14 - dy * 10); c.closePath(); c.fill();
      body(); c.fill();
      c.setLineDash([16, 12]); c.lineWidth = 5; c.strokeStyle = '#6a6a6a'; body(); c.stroke();
      c.setLineDash([9, 7]); c.lineWidth = 4;
      [1, -1].forEach(s => { c.beginPath(); c.moveTo(...side(s)); c.lineTo(...tip); c.stroke(); });
      c.setLineDash([]);
    } else if (st === 'shout') {
      const n = 16 + Math.round(w / 55), rx = w / 2 + 22, ry = h / 2 + 22;
      const burst = () => { c.beginPath(); for (let i = 0; i < n * 2; i++) { const q = i / (n * 2) * Math.PI * 2, o = i % 2 ? 0.86 : 1.06; c.lineTo(Math.cos(q) * rx * o, Math.sin(q) * ry * o); } c.closePath(); };
      const wedge = () => { c.beginPath(); c.moveTo(ex + px * bw, ey + py * bw); c.lineTo(tx, ty); c.lineTo(ex - px * bw, ey - py * bw); c.closePath(); };
      c.lineJoin = 'miter'; c.miterLimit = 3;
      wedge(); c.stroke(); burst(); c.stroke(); wedge(); c.fill(); burst(); c.fill();
    } else { tail(); c.stroke(); body(); c.stroke(); tail(); c.fill(); body(); c.fill(); }
    c.fillStyle = st === 'whisper' ? '#3e3e3e' : '#1a1a1a'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `${st === 'whisper' ? 600 : 700} ${size}px ${FONT}`;
    if (st === 'think') c.font = `italic 600 ${size}px ${FONT}`;
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
    const measure = () => chars.map(ch => c.measureText(ch).width + (ch === ' ' ? size * WORD_GAP : 0));
    let widths = measure(), total = widths.reduce((s, v) => s + v, 0) + gap * (chars.length - 1);
    const room = VERT ? W * 0.84 : 1600;
    if (total > room) { size = Math.floor(size * room / total); c.font = `700 ${size}px ${FONT}`; widths = measure(); total = widths.reduce((s, v) => s + v, 0) + gap * (chars.length - 1); }
    c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    let x = W / 2 - total / 2; const base = VERT ? H * 0.24 : 335;
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
  // ---------- YouTube kit: the series intro and the end screen ----------
  // They have their own time in the story's timeline (story.js); while they play they are drawn over the story,
  // fading in and out. Ren and Yuki are posed here directly, since they aren't acting in the story then.
  // Where YouTube's end-screen elements go (two videos and the subscribe button), in 1920×1080 pixels:
  const END_LAYOUT = { videos: [{ x: 880, y: 330, w: 480, h: 270 }, { x: 1400, y: 330, w: 480, h: 270 }], subscribe: { x: 1380, y: 790, r: 120 } };
  const CAM0 = { z: 1, cx: 960, cy: 540 };
  function posedK(id, t, o) {
    const look = moodLook(id, o.mood || 'happy'), n = id === 'yuki' ? 1 : 0;
    let blink = 0;
    if (look.eyes !== 'happy') for (let b = (o.t0 || 0) + 1.3 + n * 0.7; b < t + 1; b += 3.4 + n * 0.6) { const u = (t - b) / 0.18; if (u > 0 && u < 1) blink = Math.sin(u * Math.PI); }
    const idle = Math.sin(t * 2 + n * 2.1) * 0.04;
    return {
      id, t, x: o.x, y: o.y, h: 0, sx: 1, sy: 1 + 0.012 * Math.sin(t * 2.6 + n * 1.7), s: KS * (o.scale || 1), f: o.f || 0, walk: 0, phase: 0, hopping: false,
      armL: 0.16 + idle, armR: (o.wave ? 2.35 + Math.sin(t * 9) * 0.35 * o.wave : 0.16) + idle,
      lookX: clamp((o.lookX || 0) + (look.lookX || 0), -1, 1), lookY: clamp((o.lookY || 0) + (look.lookY || 0), -1, 1), tilt: Math.sin(t * 0.9 + n * 1.3) * 0.025 + (o.tilt || 0) + (look.tilt || 0),
      lift: look.lift || 0, lean: look.lean || 0, tears: look.tears || 0, firm: look.firm || 0,
      eyes: look.eyes, mouth: look.mouth, wide: look.wide || 0, brows: look.brows || 0, blushBoost: look.blush || 0, puff: look.puff || 0, flop: look.flop || 0,
      pawPose: look.pawPose, pawW: look.pawPose ? 1 : 0, talk: 0, blink,
      earL: (look.droop || 0) - 0.12 * (look.wide || 0), earR: (look.droop || 0) - 0.12 * (look.wide || 0), tail: Math.sin(t * 2.3) * 0.15 + (look.wag || 0) * Math.sin(t * 9) * 0.2,
    };
  }
  // a soft meadow, the same in every video
  function backdrop(g, t, tau) {
    const M = StudioPlaces.PLACES.meadow;
    g.setTransform(1, 0, 0, 1, 0, 0);
    M.draw(g, t, CAM0, tau, { ...HP, cam: p => applyCam(g, CAM0, p) });
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'multiply'; g.fillStyle = tod(tau, M.grade); g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'source-over'; g.fillStyle = 'rgba(255,247,235,0.22)'; g.fillRect(0, 0, W, H);
  }
  // the "Ren & Yuki" logo: letters drop in one by one and bounce, like a title card (Ren orange, Yuki pink)
  const LOGO = [...'Ren & Yuki'], LOGO_COL = i => (i < 3 ? ['#ffb35c', '#f07a2a'] : i === 4 ? ['#ffe08a', '#f4b350'] : ['#ffc4d4', '#ee7f9c']);
  function drawLogo(g, t, t0, base, size) {
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.font = `700 ${size}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.lineJoin = 'round';
    const gap = size * 0.06, widths = LOGO.map(ch => g.measureText(ch).width + (ch === ' ' ? size * WORD_GAP : 0)), total = widths.reduce((a, b) => a + b, 0) + gap * (LOGO.length - 1);
    let x = W / 2 - total / 2, k = 0;
    LOGO.forEach((ch, i) => {
      const cx = x + widths[i] / 2; x += widths[i] + gap;
      if (ch === ' ') return;
      const lt = t0 + 0.35 + (k++) * 0.13, u = (t - lt) / 0.5;
      if (u < 0) return;
      const y = base - (1 - easeOutBounce(u)) * 380, wob = Math.sin(t * 2.2 + i) * 4 * clamp(u - 1), [c0, c1] = LOGO_COL(i);
      g.save(); g.translate(cx, y + wob); g.rotate(Math.sin(i * 1.7) * 0.06); g.globalAlpha = clamp(u * 4);
      g.lineWidth = size * 0.13; g.strokeStyle = '#5a2a14'; g.strokeText(ch, 0, 0);
      const gr = g.createLinearGradient(0, -size * 0.76, 0, 0); gr.addColorStop(0, c0); gr.addColorStop(1, c1); g.fillStyle = gr; g.fillText(ch, 0, 0);
      g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(-widths[i] * 0.18, -size * 0.62, size * 0.07, size * 0.04, -0.5, 0, Math.PI * 2); g.fill();
      g.restore();
      burst(g, t, lt + 0.31, cx, base - size * 0.35, 5, i * 17 + 3, 80, 0.7, 13);
    });
    g.restore();
  }
  // a character in a mood, posed directly, on g's current transform (the mood sheet): o = { x, y, scale, f, talk, t, rig, away }
  function character(g, id, mood, o = {}) {
    const K = posedK(id, o.t || 0, { ...o, mood, t0: -10 });
    K.moodMouth = K.mouth;
    if (o.talk) { K.mouth = 'talk'; K.talk = o.talk; }
    if (o.rig) K.rig = o.rig;
    if (o.away) K.away = o.away;
    DRAW[id](g, K);
  }
  const drawPosed = (g, id, K) => { applyCam(g, CAM0, 1); DRAW[id](g, K); g.setTransform(1, 0, 0, 1, 0, 0); };
  // the intro (5 s): the logo bounces in over the meadow, then Ren and Yuki peek in from below and wave
  function drawIntro(g, t, u, seg) {
    backdrop(g, t, 0);
    drawLogo(g, t, seg.t0, 430, 210);
    [['ren', 380, 1.9, 0.12], ['yuki', 1540, 2.2, -0.12]].forEach(([id, x, p0, f]) => {
      const up = easeOutBack((u - p0) / 0.6);
      if (up <= 0 || !DRAW[id]) return;
      const wave = clamp((u - p0 - 0.6) / 0.3) * clamp((seg.t1 - seg.t0 - 0.3 - u) / 0.3);
      drawPosed(g, id, posedK(id, t, { x, y: 1080 + 560 - 470 * up, scale: 1.3, f, lookX: Math.sign(f) * 0.5, lookY: -0.4, wave, t0: seg.t0 }));
      burst(g, t, seg.t0 + p0 + 0.15, x, 760, 6, id === 'ren' ? 91 : 97, 120, 0.8, 14);
    });
  }
  // the end screen (the last 20 s): Ren and Yuki wave on the left; room for YouTube's two videos and subscribe button
  function drawEndScreen(g, t, u, seg) {
    backdrop(g, t, 1);
    const L = END_LAYOUT;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    // soft cream panels, no outlines, where YouTube puts its elements (the owner adds them in YouTube Studio; an edge
    // would peek out if an element isn't placed exactly on it). The panels are a little bigger and fade at their edges.
    g.shadowColor = 'rgba(255,250,240,0.55)'; g.shadowBlur = 40; g.fillStyle = 'rgba(255,250,240,0.36)';
    L.videos.forEach(v => { g.beginPath(); g.roundRect(v.x - 10, v.y - 10, v.w + 20, v.h + 20, 30); g.fill(); });
    g.beginPath(); g.arc(L.subscribe.x, L.subscribe.y, L.subscribe.r + 10, 0, Math.PI * 2); g.fill();
    g.shadowBlur = 0; g.shadowColor = 'transparent';
    g.font = `700 64px ${FONT}`; wordGap(g, 64); g.textAlign = 'center'; g.lineJoin = 'round'; g.lineWidth = 11; g.strokeStyle = '#5a2a14'; g.fillStyle = '#fff4e4';
    const hx = (L.videos[0].x + L.videos[1].x + L.videos[1].w) / 2;
    g.strokeText('Watch next!', hx, 270); g.fillText('Watch next!', hx, 270);
    g.restore();
    [['ren', 330, [[0.8, 3.2], [9, 11.4]]], ['yuki', 640, [[1.6, 4], [10, 12.4]]]].forEach(([id, x, waves]) => {
      if (!DRAW[id]) return;
      const wave = Math.max(...waves.map(([a, b]) => win(u, a, b, 0.3, 0.3)));
      drawPosed(g, id, posedK(id, t, { x, y: 1000, scale: 1.25, f: 0.22, lookX: 0.15, wave, t0: seg.t0 }));
    });
  }
  function drawYouTube(c, t) {
    const Y = P.youtube;
    if (Y.intro) {
      const sg = Y.intro, a = win(t, sg.t0, sg.t1, sg.t0 === 0 ? 1e-3 : 0.35, 0.3);
      if (a > 0) {
        const g = aux.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W, H);
        drawIntro(g, t, t - sg.t0, sg);
        c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = a; c.drawImage(aux, 0, 0); c.restore();
      }
    }
    if (Y.end) {
      const sg = Y.end, a = ease((t - sg.t0) / 0.6);
      if (a > 0) {
        const g = aux.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W, H);
        drawEndScreen(g, t, t - sg.t0, sg);
        c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = a; c.drawImage(aux, 0, 0); c.restore();
        // the narrator's "ending text" shows over the end screen
        P.captions.forEach(cap => { if (cap.t0 >= sg.t0 - 0.2) drawCaption(c, cap, t); });
      }
    }
  }
  // ---------- Shorts (F7 Part B): big word captions, the hook, the 1-second end card ----------
  // big bold words with a warm outline, kept inside the safe area; fitted to the width; returns the box drawn
  function bigText(c, text, cx, y, maxW, size0, a = 1, sc = 1) {
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = a;
    let size = size0, lines;
    for (; size >= 34; size -= 4) { c.font = `700 ${size}px ${FONT}`; wordGap(c, size); lines = wrap(c, text, maxW); if (lines.length <= 2 && lines.every(l => c.measureText(l).width <= maxW)) break; }
    const lh = size * 1.12, w = Math.max(...lines.map(l => c.measureText(l).width)), h = lines.length * lh;
    c.translate(cx, y + h / 2); c.scale(sc, sc); c.translate(0, -h / 2);
    c.textAlign = 'center'; c.textBaseline = 'top'; c.lineJoin = 'round';
    lines.forEach((l, i) => {
      c.lineWidth = size * 0.2; c.strokeStyle = '#3a1d0e'; c.strokeText(l, 0, i * lh);
      c.fillStyle = '#fff6e6'; c.fillText(l, 0, i * lh);
    });
    c.restore();
    return { x0: cx - w / 2, x1: cx + w / 2, y0: y, y1: y + h };
  }
  function drawShort(c, local, t) {
    const cx = VERT ? W * 0.43 : W / 2, maxW = VERT ? W * 0.76 : W * 0.6;
    for (const q of P.wordCaps || []) {
      if (local < q.t0 || local > q.t1) continue;
      const pop = easeOutBack(clamp((local - q.t0) / 0.18));
      drawn.push({ kind: 'caption', ...bigText(c, q.text, cx, VERT ? H * 0.64 : H * 0.78, maxW, VERT ? 76 : 64, 1, 0.85 + 0.15 * pop) });
    }
    if (P.hook && local >= P.hook.t0 && local <= P.hook.t1) {
      const a = ease((local - P.hook.t0) / 0.3) * ease((P.hook.t1 - local) / 0.35);
      drawn.push({ kind: 'hook', ...bigText(c, P.hook.text, cx, VERT ? H * 0.085 : H * 0.08, maxW, VERT ? 76 : 72, a, 0.9 + 0.1 * easeOutBack(clamp((local - P.hook.t0) / 0.3))) });
    }
    if (P.card && local >= P.card.t0) {
      const g = aux.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W, H);
      backdrop(g, t, 0);
      // the logo, already landed (a Short's card is short), with its gentle wobble
      drawLogo(g, local, P.card.t0 - 1.6, VERT ? H * 0.42 : H * 0.45, VERT ? 150 : 200);
      if (P.card.text) bigText(g, P.card.text, W / 2, VERT ? H * 0.5 : H * 0.6, maxW, VERT ? 60 : 56);
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = ease((local - P.card.t0) / 0.25); c.drawImage(aux, 0, 0); c.restore();
    }
  }
  // The thumbnail's framing (YouTube kit): the characters on stage fill a share of the picture height, standing
  // low with room above for the title. null = the story's own camera (always, except while making a thumbnail).
  let framing = null;
  const FRAMES = { medium: { fill: 0.55, top: 0.36 }, close: { fill: 0.78, top: 0.26 } };
  function camFramed(t) {
    if (VERT) {
      // a vertical cover frame: the characters together, as in the video's framing, when they fit big enough;
      // otherwise the first of them alone (the faces stay at about 43 % from the top, below the title)
      const fill = framing.size === 'close' ? 0.5 : 0.42, on = framing.ids.filter(id => near(id, t)), ids = on.length ? on : CAST.slice(0, 1);
      const both = vFrame(ids, fill, t, 0.5);
      return ids.length > 1 && both.pairFill < fill * 0.8 ? vFrame(ids.slice(0, 1), fill, t, 0.5) : both;
    }
    const F0 = FRAMES[framing.size], tp = Math.max(F0.top, framing.top || 0), F = { top: tp, fill: Math.min(F0.fill, 0.95 - tp) }, on = framing.ids.filter(id => onStage(id, t)), Bs = (on.length ? on : CAST.slice(0, 1)).map(id => actorBody(id, t));
    const xs = Bs.map(b => b.x), spread = Math.max(...xs) - Math.min(...xs), top = Math.min(...Bs.map(b => b.y)) - 345;   // Ren is about 345 px tall, ears included
    const bottom = Math.max(...Bs.map(b => b.y));
    // as big as asked, but everyone fits across with some room
    const z = Math.max(1, Math.min(F.fill * H / (bottom - top), W * 0.86 / (spread + 300)));
    let cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = top + (H / 2 - F.top * H) / z;
    const hw = W / 2 / z, hh = H / 2 / z;
    cx = clamp(cx, -220 + hw, 2140 - hw); cy = clamp(cy, -40 + hh, 1140 - hh);
    return { z, cx, cy };
  }
  // Vertical (9:16): always framed on the characters, medium-close or closer, a little left of the middle, standing
  // low in the picture: feet at about 76 % from the top (just above the bottom 20 % the phone's buttons cover), so
  // there's no empty ground below them and plenty of room above for bubbles and a Short's hook text. Faces stay
  // between 43 % and 63 % from the top (a close shot keeps the face up there and lets the feet go out of the
  // picture), inside the safe area (out of the bottom 20 %, the right 15 % and the top 8 %). "shot:" lines choose how close and on whom; camera moves
  // come later (F7 Part B). fill: a character's height as a share of the picture's height.
  const VFILL = { wide: 0.28, medium: 0.36, close: 0.48, 'extreme close': 0.62, ots: 0.4 };
  // a framing of some characters: fill = a character's height as a share of the picture's height
  // place: where the group stands across the picture (0.435 of the width unless asked)
  // where the faces go (a share of the picture's height from the top), for zoom z and feet d below the faces (world)
  const vFaceAt = (z, d) => clamp(0.76 - z * d / H, 0.43, 0.63);
  function vFrame(ids, fill, t, place = 0.435) {
    // everyone near the middle of the stage counts, more and more as they come in (so an entrance glides)
    const ws = ids.map(id => ({ id, B: actorBody(id, t) })).map(q => ({ ...q, w: clamp((700 - Math.abs(q.B.x - RX)) / 200) })).filter(q => q.w > 0);
    if (!ws.length) return { z: 1.2, cx: RX, cy: 900 - (0.74 * H - H / 2) / 1.2 };
    const sw = ws.reduce((a, q) => a + q.w, 0), mx = ws.reduce((a, q) => a + q.B.x * q.w, 0) / sw;
    // the faces' height (the characters', not a flying extra's)
    const chars = ws.filter(q => !REG[q.id].extra), use = chars.length ? chars : ws;
    const uw = use.reduce((a, q) => a + q.w, 0);
    const faceY = use.reduce((a, q) => a + toWorld(q.B, q.B.f * 6, REG[q.id].head).y * q.w, 0) / uw;
    const d = use.reduce((a, q) => a + q.B.y * q.w, 0) / uw - faceY;   // the feet, below the faces
    const half = Math.max(...ws.map(q => Math.abs(q.B.x - mx) * q.w));
    // as close as asked, but everyone fits between the left edge and the right 15 %, tails included
    const z = Math.max(0.9, Math.min(fill * H / 345, 0.83 * W / (2 * half + 340)));
    let cx = mx + (W / 2 - place * W) / z, cy = faceY - (vFaceAt(z, d) * H - H / 2) / z;
    const hw = W / 2 / z, hh = H / 2 / z;
    cx = clamp(cx, -400 + hw, 2320 - hw); cy = clamp(cy, -300 + hh, 1460 - hh);
    return { z, cx, cy, d, pairFill: z * 345 / H };
  }
  const near = (id, t) => Math.abs(actorBody(id, t).x - RX) < 560;   // on the (narrow) stage
  const idsOf = on => (on && on.actors ? on.actors.filter(id => CAST.includes(id)) : CAST);
  const vMix = (a, b, k) => ({ z: lerp(a.z, b.z, k), cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k), d: lerp(a.d || 0, b.d || 0, k) });
  // No half faces in vertical: every face (characters and extras) is either whole in the picture or fully out of it
  // (a neighbour's face cut by the edge, 15 % visible, looks like a mistake on a phone). For someone the shot isn't
  // about, the camera slides just far enough to leave the face out, as long as that keeps the shot's own characters
  // whole. Otherwise (or when the cut face belongs to the shot itself) the shot widens until everyone it needs is
  // whole, inside the safe area, standing as low as before. Walking or flying in or out across the edge is left
  // alone (they have to cross it).
  function wholeFaces(cam, t, framed) {
    const half = 90 * KS, ears = 0.7 * half, L = W * 0.04, R = W * 0.85;
    const fx = id => { const K = actorBody(id, t); return toWorld(K, K.f * 6, REG[id].head).x; };
    const sx = (x, c) => (x - c.cx) * c.z + W / 2;
    const clampX = c => ({ ...c, cx: clamp(c.cx, -400 + W / 2 / c.z, 2320 - W / 2 / c.z) });
    // the face (shown characters must have it whole), or the whole head, ears and cheek fluff (about 1.7 × the face's
    // width; someone left out must be out with all of it, not leave an ear tip at the edge)
    const box = (c, id, e = 0) => { const x = sx(fx(id), c); return [x - (half + e) * c.z, x + (half + e) * c.z]; };
    const whole = (c, id) => { const [x0, x1] = box(c, id); return x0 >= L && x1 <= R; };
    const cutBy = (c, id, e) => { const [x0, x1] = box(c, id, e); return x1 > 0 && x0 < W && (x0 < 0 || x1 > W); };
    const crossing = id => (P.actors[id].walks || []).some(w => t >= w.t0 - 0.2 && t <= w.t1 + 0.2 && [w.x0, w.x1].some(x => x <= 420 || x >= 1500));
    const here = CAST.filter(id => onStage(id, t) && !crossing(id)), show = framed.filter(id => here.includes(id));
    const cut = (c, id) => cutBy(c, id, show.includes(id) ? 0 : ears);
    // (a change can cut someone checked before, so it looks again until nothing is cut)
    for (let pass = 0; pass <= here.length; pass++) {
      const id = here.find(q => cut(cam, q));
      if (!id) break;
      if (!show.includes(id)) {
        // slide just far enough that the whole head is out, if everyone shown stays whole and nobody else gets cut
        const [x0, x1] = box(cam, id, ears), out = clampX({ ...cam, cx: cam.cx + (x0 < 0 ? x1 + 14 : x0 - W - 14) / cam.z });
        if (!cut(out, id) && show.filter(m => whole(cam, m)).every(m => whole(out, m)) && !here.some(q => q !== id && !cut(cam, q) && cut(out, q))) { cam = out; continue; }
        show.push(id);
      }
      // otherwise wider, until everyone shown is whole inside the safe area, standing as low as before
      const xs = show.map(fx), lo = Math.min(...xs) - half, hi = Math.max(...xs) + half, d = cam.d || 0;
      const z = Math.min(cam.z, (R - L) / (hi - lo)), Y = cam.cy + (vFaceAt(cam.z, d) * H - H / 2) / cam.z;
      cam = clampX({ ...cam, z, cx: (lo + hi) / 2 - ((L + R) / 2 - W / 2) / z, cy: Y - (vFaceAt(z, d) * H - H / 2) / z });
    }
    return cam;
  }
  function camVertical(t) {
    let fill = VFILL[P.framing] || 0.36, ids = CAST, push = 1, from = null, k = 1, shake = 0, framed = null;
    // the story's shots and camera moves: cuts choose how close and on whom; push in and pull out go closer or wider;
    // pan and follow glide to someone else; shake shakes
    for (const x of P.shots || []) {
      if (x.t > t) break;
      const u = x.dur ? ease((t - x.t) / x.dur) : 1;
      if (x.op === 'cut') { fill = VFILL[x.size] || 0.36; ids = idsOf(x.on); push = 1; from = null; }
      else if (x.op === 'ots') { fill = VFILL.close; ids = idsOf(x.on); push = 1; from = null; }
      else if (x.op === 'zoom') fill = 0.36 * x.z;
      else if (x.op === 'push') push *= 1 + 0.35 * u;
      else if (x.op === 'pull') push /= 1 + 0.35 * u;
      else if ((x.op === 'pan' || x.op === 'follow') && x.on && x.on.actors) { from = ids; ids = idsOf(x.on); k = u; }
      else if (x.op === 'shake') shake = t < x.t + x.dur ? 1 - (t - x.t) / x.dur : 0;
    }
    if (!P.shots) fill *= K_('zoom', t);
    let cam = vFrame(ids, fill * push, t);
    if (from && k < 1) cam = vMix(vFrame(from, fill * push, t), cam, k);
    // a conversation without shot lines: when the two together would be small, frame whoever is speaking
    // (medium-close), and stay on them for a moment after the line
    if (!P.shots && ids.length > 1 && cam.pairFill < 0.3) {
      const v = [...P.voice].reverse().find(q => q.who !== 'narrator' && CAST.includes(q.who) && q.t - 0.15 <= t && t <= q.t + q.len + 2.5 && near(q.who, t));
      const others = CAST.filter(id => id !== (v && v.who) && near(id, t));
      if (v && others.length) {
        // the speaker toward the neighbour's side, close enough that the neighbour's face is out of the picture
        const me = actorBody(v.who, t).x, o = others.map(id => actorBody(id, t).x).sort((p, q) => Math.abs(p - me) - Math.abs(q - me))[0];
        const left = o < me, place = left ? 0.32 : 0.58, room = left ? place * W : (1 - place) * W;
        const fill = Math.max(0.4, (room + 110) / Math.max(60, Math.abs(o - me) - 105) * 345 / H);
        cam = vFrame([v.who], Math.min(fill, 0.5), t, place); framed = [v.who];
      }
    }
    cam = wholeFaces(cam, t, framed || ids);
    if (shake) { cam.cx += Math.sin(t * 47) * 10 * shake / cam.z; cam.cy += Math.cos(t * 39) * 8 * shake / cam.z; }
    return cam;
  }
  const camFor = t => (framing ? camFramed(t) : VERT ? camVertical(t) : P.shots ? camShot(t) : camAt(t));
  let drawn = [];   // bubbles and captions drawn in the last frame: { kind, x0, x1, y0, y1 } on screen
  // An episode Short plays a window of a longer story: its time 0 is the window's start (P.window, in the story's time).
  const storyTime = t => (P.window ? P.window.t0 + Math.min(t, P.window.t1 - P.window.t0) : t);
  let loopCv = null, inLoop = false;
  // clean: without speech bubbles, captions, title cards and a Short's texts (for thumbnails and cover frames)
  function render(t, clean = false) {
    const local = t;
    // a looping Short: its last moment blends into its first, so the end flows back to the start
    if (P.loop && !inLoop && local > P.duration - 0.6) {
      inLoop = true; render(0.6); inLoop = false;
      if (!loopCv) { loopCv = document.createElement('canvas'); loopCv.width = W; loopCv.height = H; }
      loopCv.getContext('2d').drawImage(ctx.canvas, 0, 0);
    }
    t = clamp(storyTime(t), 0, P.duration); drawn = [];
    const c = ctx, tau = K_('tau', t);
    let cam = camFor(t);
    // a shout gives the picture a tiny shake as the voice starts
    const shout = P.bubbles.find(q => q.style === 'shout' && t >= q.t0 + 0.12 && t < q.t0 + 0.6);
    if (shout) { const u = 1 - (t - shout.t0 - 0.12) / 0.48; cam = { ...cam, cx: cam.cx + Math.sin(t * 61) * 7 * u / cam.z, cy: cam.cy + Math.cos(t * 53) * 5 * u / cam.z }; }
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    curCam = cam;
    const PN = placeAt(t);
    HP.cam = p => applyCam(c, cam, p);
    HP.moon = moonAt(t);
    PN.draw(c, t, cam, tau, HP);
    if (P.props && P.props.length) drawProps(c, t, tau, PN, 'base');
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'multiply'; c.fillStyle = tod(tau, PN.grade); c.fillRect(0, 0, W, H); c.globalCompositeOperation = 'source-over';
    if (P.props && P.props.length) drawProps(c, t, tau, PN, 'light');
    const Ks = {}; CAST.forEach(id => { Ks[id] = actorState(id, t); });
    const k = layer.getContext('2d');
    k.setTransform(1, 0, 0, 1, 0, 0); k.globalCompositeOperation = 'source-over'; k.clearRect(0, 0, W, H);
    if (cam.ots) drawOts(k, cam, Ks); else { applyCam(k, cam, 1); drawOrder(t).forEach(id => DRAW[id](k, Ks[id])); }
    k.setTransform(1, 0, 0, 1, 0, 0); k.globalCompositeOperation = 'source-atop';
    k.globalAlpha = tau < 1 ? 0.06 * tau : 0.06 + 0.08 * (tau - 1); k.fillStyle = tod(tau, PN.tint); k.fillRect(0, 0, W, H);
    k.globalAlpha = 1; k.globalCompositeOperation = 'source-over';
    c.drawImage(layer, 0, 0);
    if (P.props && P.props.some(p => p.holds)) drawHeldLight(c, t);

    applyCam(c, cam, 1);
    const S = starAt(t);
    const segNow = starSegs.filter(q => q.t0 <= t).pop();
    const held = S && segNow && ['held', 'pickup', 'raise', 'lower'].includes(segNow.type);
    if (S && held) { c.save(); c.globalCompositeOperation = 'lighter'; glow(c, S.x, S.y, 560, '255,190,90', 0.12 * S.bright); c.restore(); }
    if (PN.front) {
      // butterflies and fireflies go around faces (the head, with room for ears and whiskers)
      StudioPlaces.util.faces(CAST.filter(id => onStage(id, t)).map(id => { const K = Ks[id], h = toWorld(K, K.f * 6, REG[id].head); return { x: h.x, y: h.y, r: (REG[id].height ? REG[id].height * 0.5 : 160) * K.s }; }));
      PN.front(c, t, cam, tau, HP);
      StudioPlaces.util.faces([]);
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
    if (!clean) P.titles.forEach(T => drawTitle(c, T, t));
    if (!P.wordCaps && !clean) P.captions.forEach(cap => drawCaption(c, cap, t));   // (a Short shows the narrator as big word captions instead)
    const F = cam.framed ? faceBoxes(cam, Ks, heads) : null;
    if (!clean) P.bubbles.forEach(b => drawBubble(c, b, t, toScreen(cam, heads[b.who]), cam, F));
    if (P.youtube) drawYouTube(c, t);
    if ((P.wordCaps || P.hook || P.card) && !clean) drawShort(c, local, t);
    c.setTransform(1, 0, 0, 1, 0, 0);
    const vg = c.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.05);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(20,10,30,${0.12 + 0.07 * tau})`);
    c.fillStyle = vg; c.fillRect(0, 0, W, H);
    const [f0, f1] = P.pictureFadeOut, fade = P.window ? 1 - clamp(local / 0.35) : clamp((t - f0) / (f1 - f0)) + (P.loop ? 0 : 1 - clamp(t / 0.5));
    if (fade > 0) { c.fillStyle = `rgba(0,0,0,${clamp(fade)})`; c.fillRect(0, 0, W, H); }
    if (loopCv && P.loop && local > P.duration - 0.6) { c.globalAlpha = ease((local - (P.duration - 0.6)) / 0.6); c.drawImage(loopCv, 0, 0); c.globalAlpha = 1; }
  }

  async function init(canvas, plan) {
    P = plan; KS = plan.scale; CAST = plan.cast; REG = { ...StudioCharacters.CHARACTERS };
    W = plan.width || 1920; H = plan.height || 1080; VERT = H > W;
    canvas.width = W; canvas.height = H;
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
    if (plan.youtube) Object.keys(StudioCharacters.CHARACTERS).forEach(id => { const d = REG[id]; if (!DRAW[id] && window[d.global]) DRAW[id] = window[d.global][d.draw]; });
    starSegs = plan.star.filter(s => s.type !== 'flicker').sort((a, b) => a.t0 - b.t0);
    flickers = plan.star.filter(s => s.type === 'flicker');
    ctx = canvas.getContext('2d');
    layer = document.createElement('canvas'); layer.width = W; layer.height = H;
    aux = document.createElement('canvas'); aux.width = W; aux.height = H;
    half = document.createElement('canvas'); half.width = W / 2; half.height = H / 2;
    if (P.shots) buildRigs();
    buildSprings();
    await Promise.all(['700 52px Fredoka', 'italic 500 40px Lora'].map(f => document.fonts.load(f)));
    render(0);
  }
  // For checks: where each visible face (eyes to chin) is on screen at t, and whether the frame cuts it.
  // The shoulder in an over-the-shoulder shot is cut on purpose and is left out.
  function faces(t) {
    const cam = camFor(t), out = [];
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
  // the mood a character shows at t, by name (used to pick a thumbnail; drawing doesn't use it)
  const mood = (id, t) => {
    const a = P.actors[id]; let cur = 'normal';
    for (const m of a.moods) if (m.t <= t) cur = m.mood;
    for (const e of a.exprs) if (t >= e.a && t < e.b) cur = e.mood;
    return cur;
  };
  // frame('medium' | 'close', ids, top) for a thumbnail (top: where the characters' heads may start, below a title);
  // frame(null) goes back to the story's camera
  const frame = (size, ids, top) => { framing = size && FRAMES[size] ? { size, ids: ids && ids.length ? ids : CAST, top: top || 0 } : null; };
  // the safe-area check: faces, bubbles and captions of the frame just drawn
  // (the helpers take a Short's own time, like render)
  const layout = t => ({ faces: faces(storyTime(t)).map(q => ({ kind: 'face ' + q.id, ...q.box })), boxes: drawn });
  window.StudioFilm = { init, render, faces: t => faces(storyTime(t)), pose: (id, t) => pose(id, storyTime(t)), mood: (id, t) => mood(id, storyTime(t)), frame, END_LAYOUT, layout, character,
    // the meadow backdrop and the logo, for the channel art (tools/channel-art.js)
    art: { backdrop, logo: drawLogo, bigText } };
})();
