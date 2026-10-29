// The Dark Cave (set piece): a big rounded rock hill with snow on top and a wide arched mouth that is dark all the
// way in (deep violet fading to black, so it never looks like a hole in the picture). A faint cold mist drifts out
// along the ground. Mysterious, never scary: no eyes, nothing pointy around the mouth, nothing inside.
// The mouth is about one and a half Rens tall, so Ren and Yuki can stand at it (going inside is F5).
(function (root) {
  const { register } = typeof module !== 'undefined' ? require('../assets.js') : root.StudioAssets;
  const LINE = '#4a2616';
  const grad = (c, y0, y1, a, b) => { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; };
  const out = (c, lw = 6) => { c.lineWidth = lw; c.strokeStyle = LINE; c.stroke(); };
  // the rock hill
  const rock = c => {
    c.beginPath(); c.moveTo(-430, 0);
    c.bezierCurveTo(-440, -240, -330, -470, -120, -560); c.bezierCurveTo(20, -610, 220, -560, 330, -420);
    c.bezierCurveTo(420, -300, 440, -120, 440, 0); c.closePath();
  };
  // the mouth: a wide soft arch
  const mouth = c => { c.beginPath(); c.moveTo(-170, 0); c.bezierCurveTo(-190, -260, -110, -470, 10, -470); c.bezierCurveTo(130, -470, 200, -260, 180, 0); c.closePath(); };

  register({
    id: 'dark-cave', kind: 'prop', names: ['dark cave', 'cave', 'the dark cave', 'cave mouth'], size: 'big', height: 690,
    states: [], glow: false, motion: 'none', credit: 'Claude Code',
    draw(c, t) {
      c.save(); c.scale(1.15, 1.15); c.lineJoin = 'round'; c.lineCap = 'round';
      const sh = c.createRadialGradient(0, 2, 30, 0, 2, 480); sh.addColorStop(0, 'rgba(50,40,60,0.3)'); sh.addColorStop(1, 'rgba(50,40,60,0)');
      c.save(); c.scale(1, 0.1); c.fillStyle = sh; c.beginPath(); c.arc(0, 20, 480, 0, Math.PI * 2); c.fill(); c.restore();
      // the rock: cool grey-blue stone with soft lighter faces
      rock(c); c.fillStyle = grad(c, -600, 0, '#9aa3b8', '#6f7790'); c.fill(); out(c);
      c.save(); rock(c); c.clip();
      c.fillStyle = 'rgba(255,255,255,0.14)';
      [[-280, -300, 90, 140, -0.3], [250, -260, 70, 120, 0.3], [-60, -520, 120, 40, 0]].forEach(([x, y, rx, ry, a]) => { c.beginPath(); c.ellipse(x, y, rx, ry, a, 0, Math.PI * 2); c.fill(); });
      c.strokeStyle = 'rgba(60,50,70,0.4)'; c.lineWidth = 3;
      [[-360, -140, -300, -200], [300, -180, 360, -120], [-250, -420, -190, -470], [230, -440, 280, -390], [-330, -40, -280, -70]]
        .forEach(([x0, y0, x1, y1]) => { c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo((x0 + x1) / 2 + 10, (y0 + y1) / 2 - 10, x1, y1); c.stroke(); });
      c.restore();
      // snow on top, in soft lumps
      c.beginPath(); c.moveTo(-372, -300);
      c.bezierCurveTo(-330, -440, -200, -540, -60, -585); c.bezierCurveTo(80, -610, 230, -560, 360, -360);
      c.quadraticCurveTo(340, -330, 300, -360); c.quadraticCurveTo(260, -330, 220, -400); c.quadraticCurveTo(150, -440, 90, -470);
      c.quadraticCurveTo(0, -470, -60, -500); c.quadraticCurveTo(-150, -470, -210, -450); c.quadraticCurveTo(-280, -380, -330, -340); c.quadraticCurveTo(-360, -300, -372, -300); c.closePath();
      c.fillStyle = grad(c, -600, -300, '#ffffff', '#dce8f6'); c.fill(); out(c, 5);
      // the mouth: dark all the way in
      mouth(c);
      const g = c.createRadialGradient(10, -150, 20, 10, -200, 330); g.addColorStop(0, '#0d0a16'); g.addColorStop(0.6, '#1c1530'); g.addColorStop(1, '#2e2448');
      c.fillStyle = g; c.fill(); out(c);
      // a lighter stone rim around the mouth
      c.beginPath(); c.moveTo(-200, 0); c.bezierCurveTo(-222, -280, -126, -500, 10, -500); c.bezierCurveTo(146, -500, 232, -280, 210, 0);
      c.lineWidth = 22; c.strokeStyle = 'rgba(200,210,230,0.35)'; c.stroke();
      mouth(c); out(c);
      // a cold mist drifting slowly out along the ground
      for (let k = 0; k < 5; k++) {
        const u = (t * 0.06 + k / 5) % 1, x = 10 + (k % 2 ? 1 : -1) * u * 260, a = Math.sin(u * Math.PI) * 0.22;
        c.fillStyle = `rgba(225,232,250,${a})`; c.beginPath(); c.ellipse(x, -24 - u * 20, 70 + u * 60, 18 + u * 8, 0, 0, Math.PI * 2); c.fill();
      }
      // two rocks and snow at the foot
      [[-330, 0, 60, 40], [350, 0, 50, 34]].forEach(([x, y, rx, ry]) => {
        c.beginPath(); c.ellipse(x, y - ry * 0.6, rx, ry, 0, Math.PI, 0); c.closePath(); c.fillStyle = grad(c, y - ry * 1.6, y, '#a5adc0', '#7c849a'); c.fill(); out(c, 5);
        c.beginPath(); c.ellipse(x - 6, y - ry * 1.45, rx * 0.6, ry * 0.3, 0, Math.PI, 0); c.closePath(); c.fillStyle = '#ffffff'; c.fill(); out(c, 3);
      });
      c.restore();
    },
  });
})(this);
