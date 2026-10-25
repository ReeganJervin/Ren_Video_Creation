// A heart (prop): the little hearts that float up, and the golden heart that floats down. drawAt(c, x, y, r, a, col, glowCol)
// draws it there, exactly as it always has; draw(...) is the usual asset drawing.
(function (root) {
  const { register } = typeof module !== 'undefined' ? require('../assets.js') : root.StudioAssets;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  function glow(c, x, y, r, col, a) {
    if (a <= 0) return;
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`);
    c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function drawAt(c, x, y, r, a, col = '#ff7a9a', glowCol = '255,150,170') {
    c.save(); c.globalCompositeOperation = 'lighter'; glow(c, x, y, r * 2.6, glowCol, 0.3 * a); c.restore();
    c.save(); c.translate(x, y); c.globalAlpha = clamp(a);
    c.beginPath(); c.moveTo(0, r * 0.35);
    c.bezierCurveTo(-r * 1.1, -r * 0.35, -r * 0.5, -r * 1.05, 0, -r * 0.45); c.bezierCurveTo(r * 0.5, -r * 1.05, r * 1.1, -r * 0.35, 0, r * 0.35); c.closePath();
    c.fillStyle = col; c.fill(); c.lineWidth = 3; c.strokeStyle = '#ffffffaa'; c.stroke();
    c.restore();
  }
  register({
    id: 'heart', kind: 'prop', names: ['heart', 'little heart'], size: 'small', height: 50, hold: 'both paws',
    states: ['off', 'glowing'], glow: true, motion: 'bob', credit: 'Claude Code',
    drawAt,
    draw(c, t, state, light) { drawAt(c, 0, -30 + Math.sin(t * 2) * 3, 24, 1, state === 'glowing' ? '#ffd36b' : '#ff7a9a', state === 'glowing' ? '255,210,120' : '255,150,170'); },
  });
})(this);
