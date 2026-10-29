// The Great Tree (set piece): a huge, very old tree at the heart of the forest. Roots as big as hills, a thick
// trunk with bark grooves and a star-shaped hollow (where the fallen star goes), two great limbs and an enormous
// round crown that reaches the top of the picture. At night the moon catches the top of the crown in silver and
// the hollow shimmers softly: that light is drawn after the time-of-day colour (drawLight), so it stays bright.
(function (root) {
  const { register } = typeof module !== 'undefined' ? require('../assets.js') : root.StudioAssets;
  const LINE = '#4a2616';
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const grad = (c, y0, y1, a, b) => { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; };
  const out = (c, lw = 6) => { c.lineWidth = lw; c.strokeStyle = LINE; c.stroke(); };
  // the hollow: a rounded five-point star in the trunk, at the height of Yuki's raised paws
  const HX = 0, HY = -330, HR = 50;
  const starPath = (c, x, y, r) => {
    c.beginPath();
    for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.52 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    c.closePath();
  };
  // the crown: big round leaf clusters [x, y, r], back to front
  const CROWN = [
    [-600, -800, 180], [600, -800, 180], [-430, -940, 210], [430, -940, 210], [-200, -1040, 240], [200, -1040, 240],
    [-720, -640, 140], [720, -640, 140], [-520, -660, 180], [520, -660, 180], [-330, -760, 200], [330, -760, 200], [0, -860, 250],
    [-160, -660, 160], [160, -660, 160],
  ];
  // vines hanging from the crown [x, top y, length]
  const VINES = [[-700, -540, 150], [-560, -520, 210], [-420, -600, 120], [430, -580, 170], [580, -540, 230], [710, -530, 130]];
  // the trunk outline: wide flared roots at the ground, narrowing up into the crown
  const trunk = c => {
    c.beginPath();
    c.moveTo(-420, 0);
    c.quadraticCurveTo(-280, -16, -230, -100);          // left root lobe
    c.quadraticCurveTo(-175, -210, -170, -380);
    c.quadraticCurveTo(-160, -540, -140, -640);
    c.lineTo(140, -640);
    c.quadraticCurveTo(160, -540, 170, -380);
    c.quadraticCurveTo(175, -210, 230, -100);
    c.quadraticCurveTo(280, -16, 420, 0);               // right root lobe
    c.closePath();
  };

  register({
    id: 'great-tree', kind: 'prop', names: ['great tree', 'the great tree', 'old tree', 'giant tree'], size: 'big', height: 1280,
    slot: [HX, HY], states: [], glow: false, motion: 'sway', credit: 'Claude Code',
    draw(c, t, state) {
      c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
      // a wide soft shadow on the ground
      const sh = c.createRadialGradient(0, 4, 40, 0, 4, 520); sh.addColorStop(0, 'rgba(60,40,28,0.32)'); sh.addColorStop(1, 'rgba(60,40,28,0)');
      c.save(); c.scale(1, 0.1); c.fillStyle = sh; c.beginPath(); c.arc(0, 40, 520, 0, Math.PI * 2); c.fill(); c.restore();

      // the two great limbs, up into the crown
      [-1, 1].forEach(sd => {
        c.beginPath();
        c.moveTo(sd * 60, -560); c.quadraticCurveTo(sd * 180, -660, sd * 330, -720);
        c.lineTo(sd * 350, -680); c.quadraticCurveTo(sd * 200, -610, sd * 120, -500); c.closePath();
        c.fillStyle = grad(c, -720, -500, '#8a5a38', '#7a4e30'); c.fill(); out(c);
      });

      // the crown, swaying very gently (it is old and heavy)
      const sw = Math.sin(t * 0.45) * 4;
      c.save(); c.translate(sw, 0);
      // hanging vines with little leaves, swaying a touch more than the crown
      VINES.forEach(([x, y, L], i) => {
        const w = Math.sin(t * 0.9 + i * 1.7) * 6;
        c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + w * 0.5, y + L * 0.5, x + w, y + L); c.lineWidth = 4; c.strokeStyle = '#4f8f52'; c.stroke();
        c.fillStyle = '#6cb46a';
        for (let k = 1; k <= Math.floor(L / 40); k++) { const yy = y + k * 40, xx = x + w * (k * 40 / L); c.beginPath(); c.ellipse(xx + (k % 2 ? 7 : -7), yy, 9, 5, k % 2 ? 0.6 : -0.6, 0, Math.PI * 2); c.fill(); }
      });
      CROWN.forEach(([x, y, r], i) => {
        c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2);
        c.fillStyle = grad(c, y - r, y + r, i < 6 ? '#6fb879' : '#7cc486', i < 6 ? '#4a9560' : '#57a067'); c.fill(); out(c);
      });
      // soft highlight blobs, and a few darker leaf curls, on the front clusters
      c.fillStyle = 'rgba(190,240,170,0.5)';
      [[-360, -830, 70, 26], [360, -830, 70, 26], [-40, -960, 90, 30], [-170, -710, 50, 20], [170, -710, 50, 20], [-560, -720, 60, 22], [560, -720, 60, 22], [-240, -1110, 70, 24], [240, -1110, 70, 24]]
        .forEach(([x, y, rx, ry]) => { c.beginPath(); c.ellipse(x, y, rx, ry, -0.3, 0, Math.PI * 2); c.fill(); });
      c.strokeStyle = 'rgba(40,90,50,0.45)'; c.lineWidth = 3;
      [[-360, -640], [-60, -760], [200, -620], [380, -680], [-180, -880], [120, -960], [-560, -600], [560, -620], [-700, -680], [700, -700]]
        .forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 22, Math.PI * 0.15, Math.PI * 0.85); c.stroke(); });
      c.restore();

      // the trunk: warm old bark
      trunk(c); c.fillStyle = grad(c, -620, 0, '#9a6a44', '#7e5032'); c.fill(); out(c);
      // bark grooves (inner lines) and a lighter side where the light falls
      c.save(); trunk(c); c.clip();
      c.fillStyle = 'rgba(255,220,170,0.16)'; c.beginPath(); c.ellipse(-90, -330, 46, 300, 0.04, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(74,38,22,0.5)'; c.lineWidth = 3;
      [[-110, -600, -125, -440, -100, -250], [-60, -560, -40, -470, -66, -420], [70, -600, 95, -470, 80, -260], [118, -420, 124, -320, 140, -200],
       [-40, -230, -60, -140, -150, -40], [50, -240, 70, -130, 170, -40], [0, -200, -6, -110, 10, -20]]
        .forEach(([x0, y0, x1, y1, x2, y2]) => { c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(x1, y1, x2, y2); c.stroke(); });
      c.restore();
      // a round old knot
      c.beginPath(); c.ellipse(88, -500, 18, 24, 0, 0, Math.PI * 2); c.fillStyle = '#6e4428'; c.fill(); out(c, 3);
      c.beginPath(); c.ellipse(88, -500, 8, 11, 0, 0, Math.PI * 2); c.fillStyle = '#5a3420'; c.fill();

      // the roots in front: big rounded humps along the ground, with moss
      [[-270, 1], [270, -1]].forEach(([x, sd]) => {
        c.beginPath(); c.moveTo(x - sd * 120, 0); c.quadraticCurveTo(x - sd * 40, -96, x + sd * 80, -44); c.quadraticCurveTo(x + sd * 200, -8, x + sd * 290, 0); c.closePath();
        c.fillStyle = grad(c, -86, 0, '#946240', '#7a4e30'); c.fill(); out(c, 5);
        c.fillStyle = '#6cae5c'; c.beginPath(); c.ellipse(x - sd * 20, -62, 34, 11, sd * 0.3, 0, Math.PI * 2); c.fill();
      });

      // the hollow: a dark, soft star with a lighter rim
      starPath(c, HX, HY, HR + 10); c.fillStyle = '#b0825a'; c.fill(); out(c, 4);
      starPath(c, HX, HY + 2, HR); c.fillStyle = grad(c, HY - HR, HY + HR, '#3c2416', '#5a3620'); c.fill(); out(c, 4);
      c.restore();
    },
    // at dusk and night: silver moonlight on the top of the crown, and a soft shimmer in the hollow
    drawLight(c, t, state, light) {
      const k = clamp((light.tau - 1.4) / 0.8);
      if (k <= 0) return;
      c.save();
      const sw = Math.sin(t * 0.45) * 4;
      c.save(); c.translate(sw, 0); c.globalCompositeOperation = 'lighter';
      [[-200, -1040, 240], [200, -1040, 240], [-430, -940, 210], [430, -940, 210], [-600, -800, 180], [600, -800, 180]].forEach(([x, y, r]) => {
        const g = c.createRadialGradient(x - r * 0.2, y - r * 0.75, 0, x - r * 0.2, y - r * 0.75, r * 0.9);
        g.addColorStop(0, `rgba(200,220,255,${0.42 * k})`); g.addColorStop(1, 'rgba(200,220,255,0)');
        c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
      });
      c.restore();
      const pulse = 0.75 + 0.25 * Math.sin(t * 1.6);
      c.globalCompositeOperation = 'lighter';
      const g = c.createRadialGradient(HX, HY, 0, HX, HY, HR * 1.6);
      g.addColorStop(0, `rgba(255,236,170,${0.5 * k * pulse})`); g.addColorStop(1, 'rgba(255,236,170,0)');
      c.fillStyle = g; c.beginPath(); c.arc(HX, HY, HR * 1.6, 0, Math.PI * 2); c.fill();
      c.restore();
    },
  });
})(this);
