// Place registry. Adding a place = a file in engine/places/ that calls register(id, {...}) plus its name in FILES.
// A place provides:
//   name           what a story writes after "place:"
//   pos            x of the stage spots { left, center, right }
//   ground(x)      y where characters' feet stand at x
//   grade, tint    day/sunset/dusk/night colours: a multiply grade over the scene, and a tint over the characters
//   draw(c, t, cam, tau, h)    the layered parallax background (h.cam(p) applies the camera at parallax p)
//   front(...)     optional: things drawn in front of the characters (fireflies, ...)
(function (root) {
  const PLACES = {};
  const FILES = ['meadow', 'forest', 'river', 'snowy-hill', 'beach'];
  const register = (id, def) => { PLACES[id] = { id, ...def }; };
  // "snowy hill", "Snowy-Hill" and "snowy_hill" all mean the same place
  const find = name => { const n = String(name).toLowerCase().trim().replace(/[-_\s]+/g, ' '); return Object.values(PLACES).find(p => p.name === n); };
  const names = () => FILES.map(f => f.replace(/-/g, ' '));

  // ---------- shared drawing helpers (deterministic: time-based, seeded) ----------
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  // colour across the time of day: tau 0 = day, 1 = sunset, 2 = dusk, 3 = night
  const tod = (tau, cols) => {
    const i = Math.min(2, Math.floor(clamp(tau, 0, 3))), u = clamp(tau - i), a = hex(cols[i]), b = hex(cols[i + 1]);
    return `rgb(${a.map((v, k) => Math.round(lerp(v, b[k], u))).join(',')})`;
  };
  // same, with alpha
  const toda = (tau, cols, a) => tod(tau, cols).replace('rgb(', 'rgba(').replace(')', `,${a})`);
  function glow(c, x, y, r, col, a) {
    if (a <= 0) return;
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`);
    c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function sparkle(c, x, y, s, a, col = '255,255,255') {
    if (a <= 0 || s <= 0) return;
    c.save(); c.translate(x, y); c.globalAlpha = clamp(a); c.fillStyle = `rgb(${col})`;
    c.beginPath(); c.moveTo(0, -s); c.quadraticCurveTo(0, 0, s, 0); c.quadraticCurveTo(0, 0, 0, s); c.quadraticCurveTo(0, 0, -s, 0); c.quadraticCurveTo(0, 0, 0, -s); c.fill();
    c.restore();
  }
  const STARS = Array.from({ length: 170 }, (_, i) => ({ x: hash(i) * 2400 - 240, y: hash(i + 400) * 640 - 80, r: 0.6 + hash(i + 800) * 1.9, ph: hash(i + 1200) * 6 }));
  const CLOUDS = [[260, 230, 1.1], [820, 150, 0.8], [1250, 260, 1.0], [1700, 180, 0.9]];
  const sunYAt = tau => (tau < 1 ? lerp(190, 540, tau) : lerp(540, 1000, clamp((tau - 1) / 0.8)));
  // The sky every place shares: gradient, stars + moon at night, the sun, drifting clouds and birds by day.
  // pal needs skyTop, skyMid, skyBot, sun, cloud. o: { sunX, noBirds, cloudAlpha }
  function sky(c, t, h, tau, pal, o = {}) {
    const sunX = o.sunX || 1450;
    c.setTransform(1, 0, 0, 1, 0, 0);
    const g = c.createLinearGradient(0, 0, 0, h.H);
    g.addColorStop(0, tod(tau, pal.skyTop)); g.addColorStop(0.55, tod(tau, pal.skyMid)); g.addColorStop(1, tod(tau, pal.skyBot));
    c.fillStyle = g; c.fillRect(0, 0, h.W, h.H);
    h.cam(0.1);
    const sa = clamp((tau - 1.6) / 0.9);
    if (sa > 0) for (const s of STARS) { c.globalAlpha = sa * (0.45 + 0.55 * Math.abs(Math.sin(t * 1.3 + s.ph))); c.fillStyle = '#fff'; c.beginPath(); c.arc(s.x, s.y, s.r, 0, Math.PI * 2); c.fill(); }
    c.globalAlpha = 1;
    const ma = clamp((tau - 2.2) / 0.6);
    if (ma > 0) {
      c.save(); c.globalAlpha = ma; c.globalCompositeOperation = 'lighter'; glow(c, 330, 200, 160, '230,230,255', 0.25); c.globalCompositeOperation = 'source-over';
      c.beginPath(); c.rect(0, 0, 800, 600); c.arc(356, 182, 56, 0, Math.PI * 2); c.clip('evenodd');
      c.beginPath(); c.arc(330, 200, 62, 0, Math.PI * 2); c.fillStyle = '#fff6d6'; c.fill(); c.restore();
    }
    h.cam(0.15);
    const sunY = sunYAt(tau);
    if (sunY < 990) {
      c.save(); c.globalCompositeOperation = 'lighter'; glow(c, sunX, sunY, 330, '255,236,190', 0.5 * clamp(1.6 - tau * 0.6)); c.restore();
      c.beginPath(); c.arc(sunX, sunY, tau < 0.5 ? 95 : 120, 0, Math.PI * 2); c.fillStyle = tod(tau, pal.sun); c.fill();
    }
    h.cam(0.2);
    c.fillStyle = tod(tau, pal.cloud); c.globalAlpha = o.cloudAlpha || 0.9;
    CLOUDS.forEach(([x, y, s], i) => {
      const cx = ((x + t * (8 + i * 3)) % 2500) - 290;
      [[0, 0, 95, 30], [55, -18, 62, 32], [-50, -8, 55, 24], [10, -30, 48, 26]].forEach(([dx, dy, rx, ry]) => { c.beginPath(); c.ellipse(cx + dx * s, y + dy * s, rx * s, ry * s, 0, 0, Math.PI * 2); c.fill(); });
    });
    c.globalAlpha = 1;
    if (tau < 1.5 && !o.noBirds) {
      c.strokeStyle = 'rgba(110,60,40,0.8)'; c.lineWidth = 3; c.lineCap = 'round';
      for (let start = 0.8; start < h.duration; start += 16) [0, 1, 2].forEach(i => {
        const u = (t - start - i * 0.3) / 6.5; if (u < 0 || u > 1) return;
        const x = lerp(2000, 200, u) + i * 50, y = 230 + i * 26 + Math.sin(t * 2 + i) * 8, w = Math.sin(t * 13 + i * 2) * 8;
        c.beginPath(); c.moveTo(x - 13, y - w); c.quadraticCurveTo(x - 6, y - 4, x, y); c.quadraticCurveTo(x + 6, y - 4, x + 13, y - w); c.stroke();
      });
    }
  }
  // fireflies in front of the characters as night falls
  function fireflies(c, t, tau, list, start = 2.1) {
    const fa = clamp((tau - start) / 0.6);
    if (fa <= 0) return;
    c.save(); c.globalCompositeOperation = 'lighter';
    list.forEach(fl => {
      const x = fl.x + Math.sin(t * fl.sp + fl.ph) * 60, y = fl.y + Math.cos(t * fl.sp * 1.3 + fl.ph) * 30, a = fa * (0.4 + 0.6 * Math.abs(Math.sin(t * 2 + fl.ph)));
      glow(c, x, y, 14, '220,255,150', 0.7 * a); c.fillStyle = `rgba(250,255,210,${a})`; c.beginPath(); c.arc(x, y, 2.5, 0, Math.PI * 2); c.fill();
    });
    c.restore();
  }
  const util = { clamp, lerp, hash, hex, tod, toda, glow, sparkle, sky, sunYAt, fireflies, STARS, CLOUDS };

  const api = { PLACES, FILES, register, find, names, util };
  if (typeof module !== 'undefined') { module.exports = api; FILES.forEach(f => require('./' + f + '.js')); } else root.StudioPlaces = api;
})(this);
