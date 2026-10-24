// Character registry. Adding a character = a drawing file in engine/ (registering window[global][draw])
// plus one entry here. Story words, movement, voice key and expressions all come from this table.
//
//   script/global/draw  drawing file, the global object it defines and its draw function
//   moves               'walk' (steps along the ground) or 'hop' (moves in small hops)
//   speed               travel speed in px per second
//   hop                 { h: height of a "hops" line, sound: 'boing' | 'light' }
//   head/chest/overhead/catch/sparkle   body anchor heights (character units, feet = 0)
//   moods               how each story mood looks on this character (values passed to the drawing)
(function (root) {
  const CHARACTERS = {
    ren: {
      name: 'Ren', script: 'ren.js', global: 'RenCharacter', draw: 'drawRen',
      moves: 'walk', speed: 290, hop: { h: 70, sound: 'boing' },
      head: -210, chest: -98, overhead: -372, catch: -104, sparkle: -180,
      moods: {
        normal: { eyes: 'normal', mouth: 'smile' },
        happy: { mouth: 'open', blush: 0.1, wag: 1 },
        surprised: { eyes: 'wide', mouth: 'o', wide: 1, droop: -0.12 },
        shy: { eyes: 'shy', mouth: 'tinyfrown', brows: 0.75, droop: 0.62, blush: 0.8, lookY: 0.6 },
        sad: { mouth: 'frown', brows: 1, droop: 0.42, lookY: 0.3 },
        sleepy: { eyes: 'sleepy', mouth: 'yawn', droop: 0.48, lookY: 0.2 },
        playful: { eyes: 'happy', mouth: 'smile', droop: -0.05, blush: 0.4, wag: 1 },
        pouty: { mouth: 'pout', brows: -1, blush: 0.35, puff: 1 },
        joy: { eyes: 'happy', mouth: 'open', blush: 0.25, wag: 1 },
      },
    },
    yuki: {
      name: 'Yuki', script: 'yuki.js', global: 'YukiCharacter', draw: 'drawYuki',
      moves: 'hop', speed: 280, hop: { h: 86, sound: 'light' },
      head: -183, chest: -80, overhead: -330, catch: -84, sparkle: -165,
      moods: {
        normal: { eyes: 'normal', mouth: 'smile' },
        happy: { mouth: 'open', blush: 0.2 },
        surprised: { eyes: 'wide', mouth: 'o', wide: 1, droop: -0.6 },
        shy: { eyes: 'shy', mouth: 'tinyfrown', brows: 0.7, droop: 0.15, flop: 1, blush: 0.85, lookY: 0.5, pawPose: 'cheeks', pawW: 1 },
        sad: { mouth: 'frown', brows: 1, droop: 0.5, lookY: 0.3 },
        sleepy: { eyes: 'sleepy', mouth: 'yawn', droop: 1.25, lookY: 0.2, pawPose: 'yawn', pawW: 1 },
        playful: { eyes: 'playful', mouth: 'tongue', blush: 0.3 },
        pouty: { eyes: 'pouty', mouth: 'pout', brows: -1, blush: 0.4, puff: 1 },
        joy: { eyes: 'happy', mouth: 'open', blush: 0.3 },
      },
    },
  };
  // moods a story can ask for (every character must define each of these, plus 'joy')
  const MOODS = ['normal', 'happy', 'surprised', 'shy', 'sad', 'sleepy', 'playful', 'pouty'];

  const api = { CHARACTERS, MOODS };
  if (typeof module !== 'undefined') module.exports = api; else root.StudioCharacters = api;
})(this);
