// TEMPLATE for a code-drawn prop or set piece. Copy to engine/props/<id>.js (lowercase, dashes), then fill it in.
// Files starting with "_" are never loaded. Follow STYLE-GUIDE.md. (0, 0) is where it stands on the ground; draw upward.
(function (root) {
  const { register } = typeof module !== 'undefined' ? require('../assets.js') : root.StudioAssets;
  const LINE = '#4a2616';   // the one outline colour (STYLE-GUIDE.md section 2)

  register({
    id: 'my-prop',                       // = the file name
    kind: 'prop',
    names: ['my prop'],                  // what a story may call it ("the" is always allowed)
    size: 'small',                       // small (in a paw) | medium | big (a set piece, stands behind the characters)
    height: 90,                          // on-screen pixels, next to Ren (about 345 px tall)
    hold: 'one paw',                     // one paw | both paws (not for big props)
    states: [],                          // e.g. ['closed', 'open'] or ['off', 'glowing']: the first is where it starts
    glow: false,                         // true if "the my prop glows" should work
    motion: 'none',                      // none | sway | bob | flicker | spin
    credit: 'Claude Code',

    // The drawing, in daytime colours (the engine colours it for sunset, dusk and night).
    draw(c, t, state, light) {
      c.save();
      c.lineJoin = 'round'; c.lineCap = 'round';
      const g = c.createLinearGradient(0, -90, 0, 0); g.addColorStop(0, '#f9c98a'); g.addColorStop(1, '#e8a45a');
      c.beginPath(); c.roundRect(-30, -90, 60, 90, 16);
      c.fillStyle = g; c.fill(); c.lineWidth = 4; c.strokeStyle = LINE; c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.ellipse(-12, -70, 7, 11, -0.4, 0, Math.PI * 2); c.fill();
      c.restore();
    },

    // Optional: only the parts that give light (a flame, lit glass), drawn after the time-of-day colour
    // so they stay bright at night. Remove it if nothing glows.
    drawLight(c, t, state, light) {
      if (state !== 'glowing') return;
    },
  });
})(this);
