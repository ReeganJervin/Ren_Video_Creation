// TEMPLATE for a code-drawn place. Copy to engine/places/<id>.js, then fill it in. Files starting with "_" are
// never loaded. Follow STYLE-GUIDE.md: soft shapes, no outlines on the scenery, daytime colours given for all four
// times of day (day, sunset, dusk, night) and picked with tod(tau, [...]).
(function (root) {
  const { register, util } = typeof module !== 'undefined' ? require('./index.js') : root.StudioPlaces;
  const { tod, sky, fireflies, hash } = util;
  const PAL = {
    // the shared sky (sun, moon, stars, clouds) needs these five
    skyTop: ['#6ec3f4', '#ff9d5c', '#5b4a9e', '#0b1236'], skyMid: ['#a8dcf7', '#ffc488', '#c0709a', '#1d2a66'], skyBot: ['#e6f6ff', '#ffe7c2', '#f5a77a', '#3b3f8c'],
    sun: ['#fffbe8', '#fff4d6', '#ffcf9a', '#ffcf9a'], cloud: ['#ffffff', '#fff8ef', '#e9b8c8', '#4a4f8f'],
    // and your own layers, from far to near
    far: ['#9fcf9a', '#e8a87c', '#8a6a9a', '#2a2d5e'], ground: ['#79b862', '#86b56f', '#5f8a6a', '#1d3b3c'],
  };
  const G = 885;   // where feet stand
  const flies = Array.from({ length: 20 }, (_, i) => ({ x: hash(i + 10) * 1920, y: 560 + hash(i + 20) * 400, ph: hash(i + 30) * 6, sp: 0.4 + hash(i + 40) * 0.6 }));

  register('my-place', {
    name: 'my place',                                    // what a story writes after "place:"
    credit: 'Claude Code',
    ambient: 'meadow',                                   // which place sound to use: meadow, forest, river, snowy-hill, beach or none
    pos: { left: 560, center: 960, right: 1360 },        // the three stage spots
    ground: x => G,                                      // where feet stand at x (it may curve)
    grade: ['#ffffff', '#fff3e2', '#e4d4ee', '#aab2e6'], // multiply colour over the scene for each time of day
    tint: ['#ffffff', '#ffb070', '#a080c0', '#3a4aa0'],  // soft wash over the characters for each time of day
    // layered parallax: h.cam(p) applies the camera at depth p (0.1 far sky .. 1 the ground the characters stand on)
    draw(c, t, cam, tau, h) {
      sky(c, t, h, tau, PAL);
      h.cam(0.4);
      c.fillStyle = tod(tau, PAL.far); c.beginPath(); c.moveTo(-400, 700); c.quadraticCurveTo(960, 560, 2320, 700); c.lineTo(2320, 1200); c.lineTo(-400, 1200); c.fill();
      h.cam(1);
      c.fillStyle = tod(tau, PAL.ground); c.fillRect(-400, G - 120, 2720, 600);
    },
    // optional: things in front of the characters
    front(c, t, cam, tau) { fireflies(c, t, tau, flies); },
  });
})(this);
