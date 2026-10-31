// The treasure chest (prop): a sturdy wooden chest with a round lid, golden bands and corners and a golden lock
// plate with a star-shaped keyhole. "the treasure chest opens": the lid swings back on its red velvet lining and
// gold glints inside; "the treasure chest overflows": coins and gems heap up over the rim and spill down the front.
// The gold inside gives a warm light (drawLight), brightest at night. "the treasure chest opens empty": the lid opens
// on the bare red velvet, with nothing inside and no light (Episode 10: only a little bag was in it).
(function (root) {
  const { register } = typeof module !== 'undefined' ? require('../assets.js') : root.StudioAssets;
  const LINE = '#4a2616';
  const grad = (c, y0, y1, a, b) => { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; };
  const SC = 1.25;   // drawn a little bigger: about half Ren's height
  const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  function coin(c, x, y, r, tilt) {
    c.beginPath(); c.ellipse(x, y, r, r * tilt, 0, 0, Math.PI * 2);
    c.fillStyle = grad(c, y - r * tilt, y + r * tilt, '#fff0a0', '#e0a030'); c.fill(); c.lineWidth = 2; c.strokeStyle = LINE; c.stroke();
  }
  function gem(c, x, y, r, col) {
    c.beginPath(); c.moveTo(x, y - r); c.lineTo(x + r, y); c.lineTo(x, y + r); c.lineTo(x - r, y); c.closePath();
    c.fillStyle = col; c.fill(); c.lineWidth = 2; c.strokeStyle = LINE; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.arc(x - r * 0.3, y - r * 0.3, r * 0.2, 0, Math.PI * 2); c.fill();
  }
  // the treasure: a heap over the rim (h = how high above the rim)
  function heap(c, h, n, seed) {
    c.beginPath(); c.moveTo(-78, -92); c.quadraticCurveTo(-40, -92 - h, 0, -92 - h * 1.1); c.quadraticCurveTo(40, -92 - h, 78, -92); c.closePath();
    c.fillStyle = grad(c, -92 - h, -92, '#ffe27a', '#e2a43a'); c.fill(); c.lineWidth = 3; c.strokeStyle = LINE; c.stroke();
    for (let i = 0; i < n; i++) {
      const x = -66 + hash(seed + i) * 132, top = -92 - h * 1.05 * (1 - (x / 80) ** 2), y = top + 6 + hash(seed + i + 50) * (-92 - top);
      coin(c, x, y, 7 + hash(seed + i + 90) * 4, 0.45 + hash(seed + i + 130) * 0.4);
    }
  }
  function lid(c, open) {
    if (open) {
      // swung back: the inside of the lid, red velvet, above the box
      c.beginPath(); c.moveTo(-86, -92); c.lineTo(-80, -170); c.quadraticCurveTo(0, -200, 80, -170); c.lineTo(86, -92); c.closePath();
      c.fillStyle = grad(c, -200, -92, '#9a6440', '#7a4a2c'); c.fill(); c.lineWidth = 4; c.strokeStyle = LINE; c.stroke();
      c.beginPath(); c.moveTo(-72, -98); c.lineTo(-68, -164); c.quadraticCurveTo(0, -188, 68, -164); c.lineTo(72, -98); c.closePath();
      c.fillStyle = grad(c, -188, -98, '#d8485a', '#a8303e'); c.fill(); c.lineWidth = 3; c.stroke();
      return;
    }
    c.beginPath(); c.moveTo(-88, -88); c.lineTo(-88, -112); c.bezierCurveTo(-88, -152, 88, -152, 88, -112); c.lineTo(88, -88); c.closePath();
    c.fillStyle = grad(c, -150, -88, '#b8804e', '#94603a'); c.fill(); c.lineWidth = 4; c.strokeStyle = LINE; c.stroke();
    // golden bands over the lid
    [-55, 55].forEach(x => { c.beginPath(); c.moveTo(x - 9, -88); c.lineTo(x - 9, -128 + Math.abs(x) * 0.1); c.quadraticCurveTo(x, -134 + Math.abs(x) * 0.1, x + 9, -128 + Math.abs(x) * 0.1); c.lineTo(x + 9, -88); c.closePath(); c.fillStyle = '#f2c14a'; c.fill(); c.lineWidth = 3; c.stroke(); });
    c.fillStyle = 'rgba(255,255,255,0.3)'; c.beginPath(); c.ellipse(-20, -132, 30, 6, -0.1, 0, Math.PI * 2); c.fill();
  }

  register({
    id: 'treasure-chest', kind: 'prop', names: ['treasure chest', 'chest', 'treasure box', 'old chest'], size: 'medium', height: 190, hold: 'both paws',
    states: ['closed', 'open', 'overflowing', 'empty'], glow: true, glowColor: '255,215,120', motion: 'none', credit: 'Claude Code',
    draw(c, t, state) {
      c.save(); c.scale(SC, SC); c.lineJoin = 'round'; c.lineCap = 'round';
      const open = state !== 'closed';
      c.fillStyle = 'rgba(60,40,28,0.25)'; c.beginPath(); c.ellipse(0, 2, 100, 10, 0, 0, Math.PI * 2); c.fill();
      if (open) lid(c, true);
      if (state === 'open') heap(c, 16, 9, 3);
      if (state === 'empty') {
        // nothing inside: just the shadowy velvet bottom
        c.beginPath(); c.moveTo(-78, -92); c.quadraticCurveTo(0, -100, 78, -92); c.closePath();
        c.fillStyle = '#6a2430'; c.fill(); c.lineWidth = 3; c.strokeStyle = LINE; c.stroke();
      }
      if (state === 'overflowing') {
        heap(c, 52, 22, 7);
        gem(c, -24, -128, 9, '#ff6b8a'); gem(c, 30, -122, 8, '#5ab0ff'); gem(c, 4, -146, 7, '#7be08a');
      }
      // the box: planks, golden bands and corners
      c.beginPath(); c.roundRect(-88, -92, 176, 92, [4, 4, 8, 8]); c.fillStyle = grad(c, -92, 0, '#a8703f', '#7e5030'); c.fill(); c.lineWidth = 4.5; c.strokeStyle = LINE; c.stroke();
      c.strokeStyle = 'rgba(74,38,22,0.4)'; c.lineWidth = 2.5; [-60, -30].forEach(y => { c.beginPath(); c.moveTo(-86, y); c.lineTo(86, y); c.stroke(); });
      [-55, 55].forEach(x => { c.beginPath(); c.rect(x - 9, -92, 18, 92); c.fillStyle = '#f2c14a'; c.fill(); c.lineWidth = 3; c.strokeStyle = LINE; c.stroke(); c.fillStyle = '#c98a24'; [-80, -46, -12].forEach(y => { c.beginPath(); c.arc(x, y, 2.5, 0, Math.PI * 2); c.fill(); }); });
      // the lock plate with a star-shaped keyhole
      c.beginPath(); c.roundRect(-16, -100, 32, 36, 6); c.fillStyle = grad(c, -100, -64, '#ffe58a', '#e0a030'); c.fill(); c.lineWidth = 3; c.strokeStyle = LINE; c.stroke();
      c.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? 3.2 : 7; c.lineTo(Math.cos(a) * rr, -82 + Math.sin(a) * rr); } c.closePath(); c.fillStyle = '#5a3420'; c.fill();
      if (!open) lid(c, false);
      if (state === 'overflowing') {
        // coins spilling down the front and onto the grass
        [[-70, -70], [-76, -40], [70, -64], [78, -30], [-96, -6], [92, -5], [-60, -4], [110, -4]].forEach(([x, y], i) => coin(c, x, y, 8 + (i % 3), 0.5 + (i % 2) * 0.3));
      }
      c.restore();
    },
    // the gold gives a warm light when the chest is open, and little glints twinkle on it
    drawLight(c, t, state, light) {
      if (state === 'closed' || state === 'empty') return;
      const k = state === 'overflowing' ? 1 : 0.7, pulse = 0.85 + 0.15 * Math.sin(t * 2.2);
      c.save(); c.scale(SC, SC); c.globalCompositeOperation = 'lighter';
      const g = c.createRadialGradient(0, -110, 10, 0, -110, 150); g.addColorStop(0, `rgba(255,220,130,${0.35 * k * pulse})`); g.addColorStop(1, 'rgba(255,220,130,0)');
      c.fillStyle = g; c.fillRect(-160, -260, 320, 260);
      for (let i = 0; i < 4; i++) {
        const w = Math.max(0, Math.sin(t * 1.7 + i * 1.9)) ** 6, x = -50 + i * 33, y = state === 'overflowing' ? -130 + (i % 2) * 18 : -100 - (i % 2) * 6, s = 9 * w;
        if (w < 0.03) continue;
        c.fillStyle = `rgba(255,255,235,${w})`; c.beginPath(); c.moveTo(x, y - s); c.quadraticCurveTo(x, y, x + s, y); c.quadraticCurveTo(x, y, x, y + s); c.quadraticCurveTo(x, y, x - s, y); c.quadraticCurveTo(x, y, x, y - s); c.fill();
      }
      c.restore();
    },
  });
})(this);
