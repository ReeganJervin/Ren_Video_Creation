// The bridge (set piece): an old rope-and-plank bridge across a deep chasm in the floor (Episode 10). Seen from the
// side: the gap opens in the floor under the bridge, going down into the dark, with a soft glow of crystals far, far
// below (drawLight, so it shows in the dark). Worn wooden planks hang between two posts at each end, with rope rails
// that sag in the middle and little rope ties down to the planks. The planks sit at the ground line, so Ren and Yuki
// walk across it like on the floor. One plank in the middle is missing a corner (careful!). Old, creaky, never scary.
(function (root) {
  const { register } = typeof module !== 'undefined' ? require('../assets.js') : root.StudioAssets;
  const LINE = '#4a2616';
  const HALF = 250;          // half the width of the chasm (narrow enough that the left and right spots stay on solid ground)
  const sag = x => 10 * (1 - (x / HALF) ** 2);   // the planks hang a little lower in the middle
  const rail = x => -100 + 26 * (1 - (x / (HALF + 40)) ** 2);   // and the rope rails sag more

  register({
    id: 'bridge', kind: 'prop', names: ['bridge', 'old bridge', 'rope bridge', 'wooden bridge'], size: 'big', height: 170,
    states: [], glow: false, motion: 'none', credit: 'Claude Code',
    draw(c, t) {
      c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
      // the chasm: a gap in the floor, from the ground line down past the bottom of the picture
      const g = c.createLinearGradient(0, 0, 0, 260); g.addColorStop(0, '#1a1530'); g.addColorStop(1, '#07050e');
      c.beginPath(); c.moveTo(-HALF - 30, 2);
      c.bezierCurveTo(-HALF + 10, 60, -HALF - 10, 160, -HALF + 30, 300); c.lineTo(HALF - 30, 300);
      c.bezierCurveTo(HALF + 10, 160, HALF - 10, 60, HALF + 30, 2); c.closePath();
      c.fillStyle = g; c.fill();
      // its rocky edges
      c.fillStyle = '#3a345e';
      [-1, 1].forEach(d => { c.beginPath(); c.moveTo(d * (HALF + 30), 0); c.bezierCurveTo(d * (HALF + 4), 40, d * (HALF + 22), 90, d * (HALF - 2), 140); c.lineTo(d * (HALF + 60), 140); c.lineTo(d * (HALF + 70), 0); c.closePath(); c.fill(); });
      // the far rope rail (behind the planks), a little higher and paler
      c.strokeStyle = '#a2845e'; c.lineWidth = 5;
      c.beginPath(); for (let x = -HALF - 40; x <= HALF + 40; x += 20) { const y = rail(x) - 18; if (x === -HALF - 40) c.moveTo(x + 8, y); else c.lineTo(x + 8, y); } c.stroke();
      // the planks
      for (let x = -HALF - 30, i = 0; x < HALF + 30; x += 36, i++) {
        const y = sag(Math.max(-HALF, Math.min(HALF, x + 15))), w = 32, tip = i % 3 === 1 ? 2 : 0;
        c.save(); c.translate(x + 15, y); c.rotate((i % 2 ? 0.03 : -0.02));
        c.beginPath();
        if (i === 11) { c.moveTo(-w / 2, -8); c.lineTo(w / 2 - 10, -8); c.lineTo(w / 2, 2); c.lineTo(w / 2, 8); c.lineTo(-w / 2, 8); c.closePath(); }   // the one with a corner missing
        else c.roundRect(-w / 2, -8 + tip, w, 16, 3);
        const pg = c.createLinearGradient(0, -8, 0, 8); pg.addColorStop(0, '#c09466'); pg.addColorStop(1, '#8a6240');
        c.fillStyle = pg; c.fill(); c.lineWidth = 3; c.strokeStyle = LINE; c.stroke();
        c.strokeStyle = 'rgba(74,38,22,0.35)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-w / 2 + 4, -1); c.lineTo(w / 2 - 6, 0); c.stroke();
        c.restore();
      }
      // the posts at both ends
      [-1, 1].forEach(d => [0, 24].forEach(k => {
        const x = d * (HALF + 40) - d * k;
        c.beginPath(); c.roundRect(x - 9, -118 + k * 0.4, 18, 128 - k * 0.4, 5);
        const wg = c.createLinearGradient(x - 9, 0, x + 9, 0); wg.addColorStop(0, '#b08560'); wg.addColorStop(1, '#7a5434');
        c.fillStyle = wg; c.fill(); c.lineWidth = 4; c.strokeStyle = LINE; c.stroke();
        c.fillStyle = '#d2b48c'; c.beginPath(); c.ellipse(x, -118 + k * 0.4, 9, 4, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      }));
      // the near rope rail, and little ties from the rail down to the planks
      c.strokeStyle = '#7a5a3a'; c.lineWidth = 3;
      for (let x = -HALF + 20; x < HALF; x += 72) { c.beginPath(); c.moveTo(x, rail(x) + 2); c.lineTo(x + 4, sag(x) - 6); c.stroke(); }
      c.strokeStyle = LINE; c.lineWidth = 9;
      c.beginPath(); for (let x = -HALF - 40; x <= HALF + 40; x += 20) { const y = rail(x); if (x === -HALF - 40) c.moveTo(x, y); else c.lineTo(x, y); } c.stroke();
      c.strokeStyle = '#c4a271'; c.lineWidth = 5;
      c.beginPath(); for (let x = -HALF - 40; x <= HALF + 40; x += 20) { const y = rail(x); if (x === -HALF - 40) c.moveTo(x, y); else c.lineTo(x, y); } c.stroke();
      c.restore();
    },
    // the crystals far down in the chasm: a soft glow coming up from below, gently breathing
    drawLight(c, t) {
      const p = 0.8 + 0.2 * Math.sin(t * 0.8);
      c.save(); c.globalCompositeOperation = 'lighter';
      [[-180, '150,190,255'], [60, '255,150,215'], [250, '190,160,255']].forEach(([x, col], i) => {
        const gr = c.createRadialGradient(x, 230, 5, x, 230, 200);
        gr.addColorStop(0, `rgba(${col},${0.3 * p})`); gr.addColorStop(1, `rgba(${col},0)`);
        c.fillStyle = gr; c.fillRect(x - 200, 30, 400, 270);
      });
      c.restore();
    },
  });
})(this);
