// The umbrella (prop): a sunny yellow umbrella with white polka dots and a curved wooden handle. Closed, it's
// furled with a little strap; "ren opens the umbrella" pops it open over his head. Held by the handle.
(function (root) {
  const { register } = typeof module !== 'undefined' ? require('../assets.js') : root.StudioAssets;
  const LINE = '#4a2616';

  register({
    id: 'umbrella', kind: 'prop', names: ['umbrella', 'yellow umbrella', 'brolly'], size: 'medium', height: 170, hold: 'one paw',
    grip: -22,   // the handle
    states: ['closed', 'open'], glow: false, motion: 'none', credit: 'Claude Code',
    draw(c, t, state) {
      c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
      // the handle: a wooden hook at the bottom
      c.beginPath(); c.moveTo(0, -36); c.lineTo(0, -12); c.arc(-9, -12, 9, 0, Math.PI, false);
      c.lineWidth = 9; c.strokeStyle = LINE; c.stroke(); c.lineWidth = 5.5; c.strokeStyle = '#b07a48'; c.stroke();
      // the shaft (it slides out when the umbrella opens, so the canopy is over the holder's head)
      const L = state === 'open' ? 230 : 0;
      c.beginPath(); c.moveTo(0, -36); c.lineTo(0, -150 - L); c.lineWidth = 6; c.strokeStyle = LINE; c.stroke(); c.lineWidth = 3; c.strokeStyle = '#c9ccd6'; c.stroke();
      const dots = (pts, r) => { c.fillStyle = 'rgba(255,255,255,0.9)'; pts.forEach(([x, y]) => { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }); };
      if (state === 'open') {
        c.translate(0, 45 - L); c.scale(1.3, 1.3);   // (the canopy, a bit bigger, on top of the slid-out shaft)
        // the canopy: a wide dome with scalloped edges
        c.beginPath(); c.moveTo(-96, -118);
        c.bezierCurveTo(-90, -190, 90, -190, 96, -118);
        for (let k = 0; k < 6; k++) { const x1 = 96 - (k + 1) * 32; c.quadraticCurveTo(x1 + 16, -130, x1, -118); }   // six soft scallops
        c.closePath();
        const g = c.createLinearGradient(0, -175, 0, -118); g.addColorStop(0, '#ffe680'); g.addColorStop(1, '#f6c33c');
        c.fillStyle = g; c.fill(); c.lineWidth = 4.5; c.strokeStyle = LINE; c.stroke();
        c.strokeStyle = 'rgba(180,120,20,0.45)'; c.lineWidth = 2.5;
        [-64, -32, 0, 32, 64].forEach(x => { c.beginPath(); c.moveTo(0, -170); c.quadraticCurveTo(x * 0.8, -150, x, -122); c.stroke(); });
        dots([[-60, -140], [-20, -158], [24, -150], [62, -136], [-36, -128], [40, -126]], 5);
        c.beginPath(); c.arc(0, -173, 5, 0, Math.PI * 2); c.fillStyle = '#c9ccd6'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = LINE; c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.ellipse(-44, -160, 22, 7, -0.4, 0, Math.PI * 2); c.fill();
      } else {
        // furled: a long slim teardrop around the shaft, with a strap
        c.beginPath(); c.moveTo(0, -168); c.quadraticCurveTo(15, -110, 12, -48); c.quadraticCurveTo(0, -40, -12, -48); c.quadraticCurveTo(-15, -110, 0, -168); c.closePath();
        const g = c.createLinearGradient(-14, 0, 14, 0); g.addColorStop(0, '#ffe680'); g.addColorStop(1, '#eeb52e');
        c.fillStyle = g; c.fill(); c.lineWidth = 4; c.strokeStyle = LINE; c.stroke();
        dots([[-4, -130], [5, -100], [-5, -76], [4, -58]], 3);
        c.beginPath(); c.roundRect(-13, -92, 26, 8, 3); c.fillStyle = '#ff8fb5'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = LINE; c.stroke();
        c.beginPath(); c.moveTo(0, -168); c.lineTo(0, -178); c.lineWidth = 4; c.strokeStyle = LINE; c.stroke();
      }
      c.restore();
    },
  });
})(this);
