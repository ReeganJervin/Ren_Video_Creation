// The shiny pebble (prop): a small, smooth, round pebble, pale lilac-grey with soft stripes and a bright little
// sparkle that winks now and then. Held in the middle.
(function (root) {
  const { register } = typeof module !== 'undefined' ? require('../assets.js') : root.StudioAssets;
  const LINE = '#4a2616';

  register({
    id: 'pebble', kind: 'prop', names: ['pebble', 'shiny pebble', 'stone', 'shiny stone', 'little stone'], size: 'small', height: 30, hold: 'one paw',
    grip: -15,
    states: [], glow: false, motion: 'none', credit: 'Claude Code',
    draw(c, t) {
      c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
      c.beginPath(); c.ellipse(0, -15, 21, 15, -0.12, 0, Math.PI * 2);
      const g = c.createRadialGradient(-6, -21, 2, 0, -15, 22); g.addColorStop(0, '#f3eefb'); g.addColorStop(0.6, '#c9bedc'); g.addColorStop(1, '#9d91b8');
      c.fillStyle = g; c.fill(); c.lineWidth = 3.5; c.strokeStyle = LINE; c.stroke();
      c.save(); c.clip(); c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = 2.5;
      [[-14, -6], [-6, -2]].forEach(([a, b]) => { c.beginPath(); c.moveTo(-22, -15 + a); c.quadraticCurveTo(0, -15 + b - 8, 22, -15 + a + 6); c.stroke(); });
      c.restore();
      c.fillStyle = 'rgba(255,255,255,0.8)'; c.beginPath(); c.ellipse(-8, -22, 5, 3, -0.4, 0, Math.PI * 2); c.fill();
      // the wink of light
      const w = Math.max(0, Math.sin(t * 1.4)) ** 8;
      if (w > 0.02) {
        c.fillStyle = `rgba(255,255,255,${w})`; const s = 7 * w, x = 8, y = -22;
        c.beginPath(); c.moveTo(x, y - s); c.quadraticCurveTo(x, y, x + s, y); c.quadraticCurveTo(x, y, x, y + s); c.quadraticCurveTo(x, y, x - s, y); c.quadraticCurveTo(x, y, x, y - s); c.fill();
      }
      c.restore();
    },
  });
})(this);
