// Picture assets: PNG files in assets/ become props, set pieces, extras and places, with no code.
//
//   assets/props/lantern.png             the prop "lantern" (old-map.png -> "old map")
//   assets/props/lantern.txt             optional settings, one "key: value" per line (see SETTINGS)
//   assets/props/chest-open.png          an extra state: chest.png is "closed", chest-open.png is "open"
//   assets/props/lantern-glowing.png     the "glowing" state (and "the lantern glows" works)
//   assets/extras/owl-1.png, owl-2.png   a flipbook (fps: in owl.txt, default 6); owl-blink.png, owl-talk.png
//   assets/places/cottage-garden/        back.png (+ back-sunset/-dusk/-night.png), front.png, place.txt
//
// In Node, scan(root) reads the folders and returns descriptions plus warnings; register(descs) adds them to the
// registries (in Node for the story checker, in the browser for drawing: the plan carries the descriptions).
(function (root) {
  const node = typeof module !== 'undefined';
  const ASSETS = node ? require('./assets.js') : root.StudioAssets;
  const PLACES = node ? require('./places/index.js') : root.StudioPlaces;
  const KS = 1.15;   // character scale: picture heights are in screen pixels at that scale
  const SETTINGS = ['kind', 'size', 'height', 'hold', 'motion', 'glow', 'moves', 'fps', 'faces', 'credit', 'ground', 'spots', 'ambient', 'names'];
  const AMBIENT = { birds: 'meadow', meadow: 'meadow', leaves: 'forest', forest: 'forest', water: 'river', river: 'river', wind: 'snowy-hill', snow: 'snowy-hill', waves: 'beach', beach: 'beach', none: 'none' };

  // ---------- reading the folders (Node only) ----------
  function scan(rootDir) {
    const fs = require('fs'), path = require('path');
    const descs = [], warnings = [];
    const rel = f => '/' + path.relative(rootDir, f).replace(/\\/g, '/');
    const settings = f => {
      const o = {};
      if (fs.existsSync(f)) fs.readFileSync(f, 'utf8').replace(/\r/g, '').split('\n').forEach(l => {
        const m = l.replace(/#.*/, '').match(/^\s*([a-z]+)\s*:\s*(.+?)\s*$/i);
        if (m && SETTINGS.includes(m[1].toLowerCase())) o[m[1].toLowerCase()] = m[2];
      });
      return o;
    };
    // PNG size and whether it can be see-through (from its header: colour type, or a transparency chunk)
    const png = f => {
      const b = fs.readFileSync(f);
      if (b.length < 33 || b.toString('ascii', 12, 16) !== 'IHDR') return null;
      const w = b.readUInt32BE(16), h = b.readUInt32BE(20), type = b[25];
      let alpha = type === 4 || type === 6;
      for (let p = 8; p + 8 < b.length && !alpha;) { const len = b.readUInt32BE(p), id = b.toString('ascii', p + 4, p + 8); if (id === 'tRNS') alpha = true; if (id === 'IDAT') break; p += 12 + len; }
      return { w, h, alpha };
    };
    const big = (file, d) => { if (d && Math.max(d.w, d.h) > 4000) warnings.push(`${file}: this picture is very large (${d.w}×${d.h}). Over 4000 pixels makes the video slow; about 1000 is plenty for a prop.`); };
    const needCredit = (txt, o, what) => { if (!o.credit) warnings.push({ credit: true, text: `Please add a credit line to ${txt}: who made this picture? (for example "credit: drawn by me")`, what }); };

    for (const [dir, kind] of [['props', 'prop'], ['extras', 'extra']]) {
      const d = path.join(rootDir, 'assets', dir);
      if (!fs.existsSync(d)) continue;
      const stems = fs.readdirSync(d).filter(f => /\.png$/i.test(f)).map(f => f.replace(/\.png$/i, '')).sort();
      // "owl-1" and "chest-open" belong to "owl" and "chest" when those exist; "old-map" alone is its own asset
      const baseOf = s => { const m = s.match(/^(.+)-([a-z0-9]+)$/i); return m && (stems.includes(m[1]) || stems.includes(m[1] + '-1')) ? [m[1], m[2].toLowerCase()] : null; };
      const groups = {};
      stems.forEach(s => {
        const p = baseOf(s), [id, part] = p || [s, 'base'];
        const g = groups[id] || (groups[id] = { frames: [], states: {}, base: null });
        if (part === 'base') g.base = s; else if (/^\d+$/.test(part)) g.frames.push([+part, s]); else g.states[part] = s;
      });
      for (const [id, g] of Object.entries(groups)) {
        const txt = path.join(d, id + '.txt'), o = settings(txt), file = n => path.join(d, n + '.png');
        const frames = g.frames.length ? g.frames.sort((a, b) => a[0] - b[0]).map(f => f[1]) : [g.base];
        const first = png(file(frames[0])), k = (o.kind || kind).toLowerCase();
        frames.concat(Object.values(g.states)).forEach(n => big(`assets/${dir}/${n}.png`, png(file(n))));
        if (first && !first.alpha) warnings.push(`assets/${dir}/${frames[0]}.png has no see-through background, so it will show as a box. Save it as a PNG with transparency.`);
        needCredit(`assets/${dir}/${id}.txt`, o, id);
        const states = Object.keys(g.states).filter(s => !/^(blink|talk)$/.test(s));
        const size = (o.size || (k === 'extra' ? 'small' : 'small')).toLowerCase();
        descs.push({
          picture: true, kind: k === 'extra' ? 'extra' : 'prop', id, names: (o.names || id.replace(/-/g, ' ')).split(',').map(s => s.trim()),
          size, height: +o.height || (k === 'extra' ? 110 : ASSETS.SIZES[size] || 80), hold: o.hold, motion: o.motion || 'none',
          glow: /^(yes|true|on)$/i.test(o.glow || '') || states.includes('glowing'), moves: (o.moves || 'walk').toLowerCase(),
          fps: +o.fps || 6, faces: (o.faces || 'right').toLowerCase(), credit: o.credit || '', ratio: first ? first.w / first.h : 1,
          states: states.includes('open') ? ['closed', ...states] : states.length ? ['off', ...states] : [],
          images: { frames: frames.map(n => rel(file(n))), states: Object.fromEntries(Object.entries(g.states).map(([s, n]) => [s, rel(file(n))])) },
        });
      }
    }
    const pd = path.join(rootDir, 'assets', 'places');
    if (fs.existsSync(pd)) for (const id of fs.readdirSync(pd).sort()) {
      const d = path.join(pd, id), back = path.join(d, 'back.png');
      if (!fs.statSync(d).isDirectory()) continue;
      if (!fs.existsSync(back)) { warnings.push(`assets/places/${id}/ has no back.png, so it isn't a place yet.`); continue; }
      const o = settings(path.join(d, 'place.txt')), dims = png(back), img = n => (fs.existsSync(path.join(d, n + '.png')) ? rel(path.join(d, n + '.png')) : null);
      big(`assets/places/${id}/back.png`, dims);
      if (dims && (dims.w < 1920 || dims.h < 1080)) warnings.push(`assets/places/${id}/back.png is ${dims.w}×${dims.h}, smaller than the video (1920×1080), so it will look blurry.`);
      needCredit(`assets/places/${id}/place.txt`, o, id);
      const spots = (o.spots || '0.29, 0.5, 0.71').split(',').map(Number);
      descs.push({
        picture: true, kind: 'place', id, name: (o.names || id.replace(/-/g, ' ')).toLowerCase(), credit: o.credit || '',
        ground: +o.ground || 0.82, spots: spots.length === 3 && spots.every(isFinite) ? spots : [0.29, 0.5, 0.71],
        ambient: AMBIENT[(o.ambient || 'birds').toLowerCase()] || 'meadow',
        back: [img('back'), img('back-sunset'), img('back-dusk'), img('back-night')], front: img('front'),
      });
    }
    return { descs, warnings };
  }

  // ---------- turning descriptions into assets ----------
  const IMAGES = {};          // url -> loaded Image (browser)
  const img = u => IMAGES[u];
  function drawImage(c, u, h, ratio, flip) {
    const im = img(u); if (!im) return;   // (an Image, or a canvas for the parts that give light)
    const w = h * ratio;
    c.save(); if (flip) c.scale(-1, 1); c.drawImage(im, -w / 2, -h, w, h); c.restore();
  }
  // which picture to show: a state's picture if it has one, else the flipbook frame for this moment
  const frameAt = (a, t) => a.images.frames[Math.floor(t * a.fps) % a.images.frames.length];

  // Returns the pictures that were left out because a drawn (code) asset has the same name: that one wins.
  function register(descs) {
    const ignored = [];
    for (const a of descs) {
      if (a.kind === 'place') {
        const same = PLACES.find(a.name);
        if (same && !same.picture) { ignored.push(`assets/places/${a.id}/ is not used: a drawn place called "${a.name}" already exists, and it wins.`); continue; }
        registerPlace(a); continue;
      }
      const same = ASSETS.find(a.names[0], a.kind);
      if (same && !same.picture) { ignored.push(`assets/${a.kind === 'extra' ? 'extras' : 'props'}/${a.id}.png is not used: a drawn ${a.kind} called "${a.names[0]}" already exists, and it wins.`); continue; }
      const def = { ...a };
      if (a.kind === 'prop') {
        def.draw = (c, t, state, light) => {
          const u = (state && a.images.states[state]) || frameAt(a, t);
          drawImage(c, u, a.height, a.ratio, a.faces === 'left');
        };
        // the parts of the glowing picture that light up, drawn again after the time-of-day colour
        if (a.images.states.glowing) def.drawLight = (c, t, state) => { if (state === 'glowing') drawImage(c, 'light:' + a.images.states.glowing, a.height, a.ratio, a.faces === 'left'); };
      } else {
        // an extra: drawn like a character from its pose K, at the size of its picture
        def.height = a.height / KS;
        def.draw = (c, K) => {
          const u = K.talk > 0.6 && a.images.states.talk ? a.images.states.talk : K.blink > 0.5 && a.images.states.blink ? a.images.states.blink : frameAt(a, K.t || 0);
          c.save(); c.translate(K.x, K.y - K.h); c.scale(K.sx * K.s / KS, K.sy * K.s / KS);
          drawImage(c, u, a.height, a.ratio, (K.f < -0.1) !== (a.faces === 'left'));
          c.restore();
        };
      }
      ASSETS.register(def);
    }
    return ignored;
  }

  // a picture place: the pictures for each time of day (missing ones use back.png, coloured by the usual grade),
  // with the shared sky showing wherever the picture is see-through
  const SKY = {
    skyTop: ['#6ec3f4', '#ff9d5c', '#5b4a9e', '#0b1236'], skyMid: ['#a8dcf7', '#ffc488', '#c0709a', '#1d2a66'], skyBot: ['#e6f6ff', '#ffe7c2', '#f5a77a', '#3b3f8c'],
    sun: ['#fffbe8', '#fff4d6', '#ffcf9a', '#ffcf9a'], cloud: ['#ffffff', '#fff8ef', '#e9b8c8', '#4a4f8f'],
  };
  const GRADE = ['#ffffff', '#ffd9b4', '#b8a6d8', '#5d6ba6'], TINT = ['#ffffff', '#ffb37a', '#9a7cc0', '#3b4a8a'];
  let frontBuf = null;
  function registerPlace(a) {
    const G = a.ground * 1080, pics = a.back.map(u => u || a.back[0]), grade = a.back.map((u, i) => (u ? '#ffffff' : GRADE[i]));
    const cover = (c, u, alpha) => { const im = img(u); if (!im || alpha <= 0) return; c.globalAlpha = alpha; c.drawImage(im, 0, 0, 1920, 1080); c.globalAlpha = 1; };
    PLACES.register(a.id, {
      name: a.name, picture: true, credit: a.credit, ambient: a.ambient,
      pos: { left: a.spots[0] * 1920, center: a.spots[1] * 1920, right: a.spots[2] * 1920 }, ground: () => G,
      grade, tint: TINT,
      draw(c, t, cam, tau, h) {
        PLACES.util.sky(c, t, h, tau, SKY, { noBirds: true });
        h.cam(1);
        const i = Math.min(2, Math.floor(Math.max(0, tau))), u = Math.min(1, Math.max(0, tau - i));
        cover(c, pics[i], 1);
        if (u > 0 && pics[i + 1] !== pics[i]) cover(c, pics[i + 1], u);
      },
      front: a.front ? (c, t, cam, tau, h) => {
        // the foreground picture gets the same time-of-day colour as the rest of the place
        const im = img(a.front); if (!im) return;
        if (!frontBuf) frontBuf = Object.assign(document.createElement('canvas'), { width: 1920, height: 1080 });
        const f = frontBuf.getContext('2d');
        f.setTransform(1, 0, 0, 1, 0, 0); f.globalCompositeOperation = 'source-over'; f.clearRect(0, 0, 1920, 1080);
        const m = c.getTransform(); f.setTransform(m); f.drawImage(im, 0, 0, 1920, 1080);
        f.setTransform(1, 0, 0, 1, 0, 0); f.globalCompositeOperation = 'multiply'; f.fillStyle = PLACES.util.tod(tau, grade); f.fillRect(0, 0, 1920, 1080);
        f.globalCompositeOperation = 'destination-in'; f.setTransform(m); f.drawImage(im, 0, 0, 1920, 1080);
        c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(frontBuf, 0, 0); c.restore();
      } : undefined,
    });
  }

  // browser: load every picture before the first frame is drawn
  async function preload(descs) {
    const urls = descs.flatMap(a => (a.kind === 'place' ? [...a.back, a.front] : [...a.images.frames, ...Object.values(a.images.states)])).filter(Boolean);
    await Promise.all([...new Set(urls)].map(u => new Promise(ok => { const im = new Image(); im.onload = im.onerror = () => { IMAGES[u] = im.naturalWidth ? im : null; ok(); }; im.src = u; })));
    // what lights up: the pixels of the glowing picture that are clearly brighter than the normal picture
    for (const a of descs) {
      const g = a.images && a.images.states.glowing, on = g && IMAGES[g], off = a.images && IMAGES[a.images.frames[0]];
      if (!on) continue;
      const w = on.naturalWidth, h = on.naturalHeight, cv = Object.assign(document.createElement('canvas'), { width: w, height: h }), x = cv.getContext('2d');
      x.drawImage(on, 0, 0); const L = x.getImageData(0, 0, w, h);
      if (off) {
        x.clearRect(0, 0, w, h); x.drawImage(off, 0, 0, w, h); const O = x.getImageData(0, 0, w, h).data, d = L.data;
        for (let i = 0; i < d.length; i += 4) if ((d[i] + d[i + 1] + d[i + 2]) - (O[i] + O[i + 1] + O[i + 2]) < 45) d[i + 3] = 0;
      }
      x.putImageData(L, 0, 0);
      IMAGES['light:' + g] = cv;
    }
  }

  const api = { scan, register, preload, IMAGES };
  if (node) module.exports = api; else root.StudioPictures = api;
})(this);
