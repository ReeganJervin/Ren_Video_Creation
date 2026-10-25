// TEMPLATE for a code-drawn extra (a simple animal or creature). Copy to engine/extras/<id>.js, then fill it in.
// Files starting with "_" are never loaded. Follow STYLE-GUIDE.md.
// An extra acts like a small character: it enters, exits, hops, looks, blinks, talks and keeps its distance.
// It is drawn from its pose K, with its feet at (K.x, K.y):
//   K.h hop height, K.s scale (1.15), K.sx/K.sy squash, K.f facing (-1 left .. 0 front .. 1 right),
//   K.lookX/K.lookY eyes (-1..1), K.blink (0..1, 1 = closed), K.talk (0..1 mouth open), K.t time,
//   K.eyes/K.mouth from its mood ('normal', 'happy', 'wide', 'sleepy'...), K.tilt head tilt.
(function (root) {
  const { register } = typeof module !== 'undefined' ? require('../assets.js') : root.StudioAssets;
  const LINE = '#4a2616';

  register({
    id: 'my-animal',
    kind: 'extra',
    names: ['my animal'],
    moves: 'walk',                       // walk | hop | fly | swim | float (fly and float stay up in the air)
    height: 100,                         // in character units (x 1.15 on screen); Ren is about 300
    credit: 'Claude Code',

    draw(c, K) {
      c.save();
      c.translate(K.x, K.y - K.h);
      c.scale(K.s * K.sx * (K.f < -0.1 ? -1 : 1), K.s * K.sy);   // faces right; mirrored when facing left
      c.lineJoin = 'round'; c.lineCap = 'round'; c.lineWidth = 4; c.strokeStyle = LINE;
      // body
      c.beginPath(); c.ellipse(0, -40, 34, 40, 0, 0, Math.PI * 2); c.fillStyle = '#c8a07a'; c.fill(); c.stroke();
      // eyes: big and shiny, closing with K.blink, looking with K.lookX/K.lookY
      [-1, 1].forEach(i => {
        c.save(); c.translate(i * 13 + (K.lookX || 0) * 3, -52 + (K.lookY || 0) * 2); c.scale(1, 1 - 0.92 * (K.blink || 0));
        c.fillStyle = '#2e1408'; c.beginPath(); c.arc(0, 0, 7, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(2, -2.5, 2.5, 0, Math.PI * 2); c.fill();
        c.restore();
      });
      // mouth: opens while it talks
      c.fillStyle = '#8c2a2e'; c.beginPath(); c.ellipse(0, -34, 5, 1.5 + 4 * (K.talk || 0), 0, 0, Math.PI * 2); c.fill();
      c.restore();
    },
  });
})(this);
