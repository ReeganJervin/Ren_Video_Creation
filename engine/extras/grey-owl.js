// The grey owl (extra): an older, grumpier owl, grey as a storm cloud, who lives in the snowy hills. Built like the
// little owl (flies, lands, takes off, blinks, looks and talks), but a bit bigger, with soft grey feathers, bushy
// white eyebrows, round spectacles and heavy half-closed eyelids: he looks serious until something surprises him
// (the lids go up) or he laughs (happy eyes). Grumpy, never scary.
(function (root) {
  const { register } = typeof module !== 'undefined' ? require('../assets.js') : root.StudioAssets;
  const LINE = '#4a2616';
  const grad = (c, y0, y1, a, b) => { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; };

  register({
    id: 'grey-owl',
    kind: 'extra',
    names: ['grey owl', 'gray owl', 'old owl', 'old grey owl'],
    moves: 'fly',
    height: 128,
    // his own faces (the other moods look normal): eyes open wide when surprised, close happily when he laughs
    moods: { surprised: { wide: 1 }, scared: { wide: 1 }, excited: { wide: 1 }, laughing: { eyes: 'happy' }, happy: { eyes: 'happy' }, joy: { eyes: 'happy' }, playful: { eyes: 'happy' } },
    credit: 'Claude Code',

    draw(c, K) {
      const t = K.t || 0, air = K.air === undefined ? 1 : K.air;
      // wings: fast beats while flying across, landing or taking off; slow soft flaps while hovering; folded once landed.
      // The body bobs with each beat.
      const effort = Math.max(K.walk || 0, air > 0.02 && air < 0.98 ? 1 : 0), up = Math.min(1, air * 6);
      const beat = Math.sin(t * (7 + 11 * effort)), flap = (0.25 + 0.95 * effort) * beat * up, bob = -Math.max(0, beat) * (3 + 4 * effort) * up;
      c.save();
      c.translate(K.x, K.y - K.h + bob);
      c.scale(K.s * K.sx * (K.f < -0.1 ? -1 : 1), K.s * K.sy);   // faces right; mirrored when facing left
      c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = LINE;
      const turn = Math.max(-1, Math.min(1, Math.abs(K.f || 0))) * 6;   // the face shifts a little towards where it faces
      // a soft shadow far below on the ground would look odd in the air, so none
      // feet: two little orange claws peeking out under the body
      c.fillStyle = '#e8a04a'; c.lineWidth = 2.5;
      [-12, 12].forEach(x => { c.beginPath(); c.ellipse(x + turn * 0.5, -3, 8, 5, 0, 0, Math.PI * 2); c.fill(); c.stroke(); });
      // wings (behind the body), each turning around its shoulder
      [-1, 1].forEach(i => {
        c.save(); c.translate(i * 34, -66); c.rotate(i * (0.08 + 0.17 * up - flap));
        c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(i * 30, 8, i * 22, 46); c.quadraticCurveTo(i * 8, 52, 0, 34); c.closePath();
        c.fillStyle = grad(c, 0, 50, '#8a8f9e', '#6b7080'); c.fill(); c.lineWidth = 4; c.stroke();
        c.strokeStyle = 'rgba(60,62,80,0.45)'; c.lineWidth = 2.5;
        [[12, 22], [14, 34]].forEach(([x, y]) => { c.beginPath(); c.moveTo(i * 4, y - 6); c.quadraticCurveTo(i * x, y, i * (x + 4), y + 6); c.stroke(); });
        c.restore();
      });
      // ear tufts
      c.lineWidth = 4;
      [-1, 1].forEach(i => {
        c.beginPath(); c.moveTo(i * 18, -96); c.quadraticCurveTo(i * 34, -112, i * 38, -122); c.quadraticCurveTo(i * 40, -100, i * 36, -88); c.closePath();
        c.fillStyle = '#7a7f8e'; c.fill(); c.stroke();
      });
      // round body
      c.beginPath(); c.ellipse(0, -56, 42, 54, 0, 0, Math.PI * 2); c.fillStyle = grad(c, -110, 0, '#aeb2bd', '#80869a'); c.fill(); c.stroke();
      // cream belly with little feather marks
      c.beginPath(); c.ellipse(turn * 0.4, -30, 27, 26, 0, 0, Math.PI * 2); c.fillStyle = grad(c, -56, -4, '#f2f3f7', '#dadde6'); c.fill();
      c.strokeStyle = 'rgba(110,115,135,0.6)'; c.lineWidth = 2.5;
      [[-10, -40], [8, -40], [-1, -30], [-12, -22], [10, -22], [-1, -14]].forEach(([x, y]) => { c.beginPath(); c.arc(x + turn * 0.4, y, 4, 0.2, Math.PI - 0.2); c.stroke(); });
      c.strokeStyle = LINE;
      // face: a heart-shaped cream disc
      c.save(); c.translate(turn, 0);
      c.beginPath(); c.moveTo(0, -60); c.bezierCurveTo(-14, -48, -38, -54, -36, -76); c.bezierCurveTo(-34, -96, -10, -98, 0, -86);
      c.bezierCurveTo(10, -98, 34, -96, 36, -76); c.bezierCurveTo(38, -54, 14, -48, 0, -60); c.closePath();
      c.fillStyle = '#e9ebf1'; c.fill(); c.lineWidth = 2.5; c.stroke();
      // eyes: golden rings with big shiny pupils; they close with K.blink and look with K.lookX/K.lookY
      const happy = K.eyes === 'happy' || K.eyes === 'joy';
      [-1, 1].forEach(i => {
        c.save(); c.translate(i * 16, -76);
        // laughing / happy: closed, curved eyes (^ ^), the grumpiness gone for a moment
        if (happy) { c.beginPath(); c.arc(0, 4, 10, 1.15 * Math.PI, 1.85 * Math.PI); c.lineWidth = 3.5; c.stroke(); c.restore(); return; }
        c.save(); c.scale(1, 1 - 0.95 * (K.blink || 0));
        c.beginPath(); c.arc(0, 0, 12, 0, Math.PI * 2); c.fillStyle = '#f2b94a'; c.fill(); c.lineWidth = 2.5; c.stroke();
        c.fillStyle = '#2e1408'; c.beginPath(); c.arc((K.lookX || 0) * 3, (K.lookY || 0) * 2.5, 8.5, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.arc((K.lookX || 0) * 3 + 3, (K.lookY || 0) * 2.5 - 3.5, 3.2, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.arc((K.lookX || 0) * 3 - 2.5, (K.lookY || 0) * 2.5 + 3, 1.4, 0, Math.PI * 2); c.fill();
        // grumpy: a heavy grey upper lid over the top of the eye (it lifts when he's surprised, and when happy)
        const lid = happy ? 0 : 0.45 * (1 - Math.min(1, K.wide || 0));
        if (lid > 0.02) {
          c.save(); c.beginPath(); c.arc(0, 0, 12, 0, Math.PI * 2); c.clip();
          c.fillStyle = '#9a9fad'; c.fillRect(-13, -13, 26, 26 * lid);
          c.beginPath(); c.moveTo(-13, -13 + 26 * lid); c.lineTo(13, -13 + 26 * lid); c.lineWidth = 2.5; c.stroke();
          c.restore();
        }
        // happy: the cheeks push up a soft lower lid
        if (happy) { c.fillStyle = '#e9ebf1'; c.beginPath(); c.ellipse(0, 12, 14, 7, 0, 0, Math.PI * 2); c.fill(); }
        c.restore();
        // closed: a soft curved line
        if ((K.blink || 0) > 0.6) { c.beginPath(); c.arc(0, -4, 11, 0.25 * Math.PI, 0.75 * Math.PI); c.lineWidth = 3; c.stroke(); }
        c.restore();
      });
      // round spectacles with a little bridge
      c.lineWidth = 2.5; c.strokeStyle = '#6a5a4a';
      [-1, 1].forEach(i => { c.beginPath(); c.arc(i * 16, -76, 15.5, 0, Math.PI * 2); c.stroke(); });
      c.beginPath(); c.moveTo(-1, -79); c.quadraticCurveTo(0, -82, 1, -79); c.stroke();
      c.strokeStyle = LINE;
      // bushy white eyebrows, slanting down towards the beak (they rise when he's surprised)
      const browUp = Math.min(1, K.wide || 0) * 8;
      [-1, 1].forEach(i => {
        c.beginPath(); c.moveTo(i * 4, -92 - browUp * 0.4); c.quadraticCurveTo(i * 18, -104 - browUp, i * 34, -98 - browUp);
        c.quadraticCurveTo(i * 22, -94 - browUp, i * 6, -88 - browUp * 0.4); c.closePath();
        c.fillStyle = '#ffffff'; c.fill(); c.lineWidth = 2.5; c.stroke();
      });
      // blush
      c.fillStyle = 'rgba(255,150,165,0.35)'; [-1, 1].forEach(i => { c.beginPath(); c.ellipse(i * 27, -61, 7, 4, 0, 0, Math.PI * 2); c.fill(); });
      // beak: a little orange triangle that opens to talk (the lower part drops)
      const open = 9 * Math.min(1, (K.talk || 0) * 1.4);
      c.lineWidth = 2.5;
      if (open > 0.8) {
        c.beginPath(); c.ellipse(0, -60 + open * 0.45, 5.5, 1 + open * 0.55, 0, 0, Math.PI * 2); c.fillStyle = '#8c2a2e'; c.fill();
        c.beginPath(); c.moveTo(-5, -61 + open); c.lineTo(5, -61 + open); c.lineTo(0, -55 + open); c.closePath(); c.fillStyle = '#e08a2a'; c.fill(); c.stroke();
      }
      c.beginPath(); c.moveTo(-7, -71); c.lineTo(7, -71); c.lineTo(0, -58); c.closePath(); c.fillStyle = '#f4a43a'; c.fill(); c.stroke();
      c.restore();
      c.restore();
    },
  });
})(this);
