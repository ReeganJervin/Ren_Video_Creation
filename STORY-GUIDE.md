# Story Guide: every line you can write

A story is a plain text file in the `stories` folder. You can write it in Notepad. Each line is one thing that happens, and they happen **one after another, top to bottom**. The timing is automatic: each line waits until the one before it has finished. You never type seconds, except with `wait`.

```
title: Ren and the Fallen Star
place: meadow
time: sunset

ren enters
+ narrator: Once upon a time, in a meadow kissed by the setting sun...
ren (surprised): Whoa! A little fallen star!
```

## The three rules

1. **One action per line.**
2. **Put `+` at the start of a line to make it happen at the same time as the line above.**
   For example, Ren walks in *while* the narrator talks:
   ```
   ren enters
   + narrator: Once upon a time...
   ```
   Two voices can't talk at the same time. If you try, the checker will tell you.
3. **Lines starting with `#` are notes.** They're ignored, so use them to organise your story.

## Settings (at the top)

| Line | What it does |
|---|---|
| `title: My Story Name` | The story's name, shown in the preview |
| `place: meadow` | Where the story starts: `meadow`, `forest`, `river`, `snowy hill`, `beach` or `cottage garden` (see "Places" below) |
| `time: sunset` | How the sky starts: `day`, `sunset`, `dusk` or `night` |

## The characters

| Name | Who | How they move | Voice |
|---|---|---|---|
| `ren` | Ren, the little fox with the burgundy scarf | Walks | Kokoro `af_sky`, pitched up |
| `yuki` | Yuki, the white bunny with the pink cherry blossom | Hops along in small hops, with light, high boings | Kokoro `af_bella`, pitched up more |

A story can use Ren, Yuki or both. Only characters you mention appear, and a character whose first line is `enters` stays off screen until then. Everything below works for either name: write `ren` or `yuki` where you see `<name>`.

## Talking

| Line | What it does |
|---|---|
| `narrator: text` | The narrator reads the text. It also appears in a storybook caption box at the top |
| `ren: text` | Ren says the text in a speech bubble, and its mouth moves. `yuki: text` works the same way |
| `yuki (pouty): text` | Says it with a mood: `happy`, `surprised`, `shy`, `sad`, `sleepy`, `playful`, `pouty` |

Keep each line under 160 characters. Write long speeches as several lines.

The bubble's tail points at whoever is talking, and when both characters are on stage the bubble sits on the side away from the other one. Only one bubble is shown at a time. While one character talks, the other turns to look at them.

### How the moods look

| Mood | Ren | Yuki |
|---|---|---|
| `happy` | Open smile, tail wag | Open smile |
| `surprised` | Wide shiny eyes, little "o" mouth | Round white eyes with small pupils, ears perk up |
| `shy` | Ears flat, worried brows, blush across the nose | One ear flops, paws near her chin, glossy eyes, big blush |
| `sad` | Worried brows, frown, ears droop | Worried brows, frown, ears droop |
| `sleepy` | Eyes closed, small yawn, ears droop | Eyes closed, ears flop down, paw over a yawn |
| `playful` | A happy ^ ^ grin | A wink with her tongue out |
| `pouty` | Puffed cheeks, cross brows, small frown | Puffed cheeks, cross brows, narrowed eyes, pursed mouth |

## What a character can do

| Line | What happens |
|---|---|
| `<name> enters` | Comes in from the left to the centre. Also: `yuki enters from right`, `ren enters from left to right` |
| `<name> walks to left` | Goes to the `left`, `center` or `right` spot (Yuki hops there; `yuki hops to left` also works). Add `slowly` for a careful walk |
| `<name> walks to <other name>` | Goes over and stops beside the other character, then looks at them |
| `<name> exits to right` | Goes off screen (`left` or `right`) |
| `<name> hops` | One happy hop. `yuki hops twice` hops twice. Yuki hops higher, with a lighter boing |
| `<name> waves` | Waves a paw. `yuki waves at ren` also looks at Ren |
| `<name> looks up` | Looks `up`, `down`, `left`, `right`, `around`, `at you`, `at the star` or `at the heart`. Looking at the star or heart follows it as it moves |
| `<name> looks at <other name>` | Looks at the other character (and keeps looking until the next look) |
| `<name> turns to you` | Faces the viewer |
| `<name> turns to <other name>` | Turns toward the other character |
| `<name> hugs <other name>` | Goes over and hugs them: both turn to each other, look happy, and little hearts float up between them. Then they step apart again |
| `<name> tilts its head` | A curious head tilt |
| `<name> feels sad` | Changes the mood until you change it again: `happy`, `surprised`, `shy`, `sad`, `sleepy`, `playful`, `pouty`, `normal` |
| `<name> blinks` | An extra blink. Characters also blink by themselves |
| `<name> raises its paws` / `<name> lowers its paws` | Paws up or down |
| `<name> picks up the star` | Goes to the fallen star and picks it up with both paws |
| `<name> lets go of the star` | Lifts the star up and it floats back into the sky |

### Both at once

Write `ren and yuki` to make both do something together:

| Line | What happens |
|---|---|
| `ren and yuki hop` | Both hop at the same time (`hop twice` works too) |
| `ren and yuki wave` | Both wave |
| `ren and yuki look at each other` / `turn to each other` | They look (or turn) at each other |
| `ren and yuki hug` | The first one hugs the second |
| `ren and yuki feel happy` | Both change mood. Also `enter`, `walk to left`, `look up`, `exit to right`, … |

### Standing apart

Each character has their own place on the stage (`left`, `center`, `right`). If two characters would end up on the same spot, the one who arrives second stops beside the other instead, so they never stand on top of each other.

Characters also blink, breathe, sway a little, twitch their ears and (Ren) wag his tail by themselves, even when they aren't doing anything.

## The star

| Line | What happens |
|---|---|
| `star appears` | A little star appears in the sky |
| `star twinkles` | The star (in the sky) twinkles three times |
| `star falls` | The star falls from the sky and lands in the grass next to the character who acted or spoke last |
| `star glows` | The star flickers weakly, then shines brightly |
| `star rises` | The star floats up into the sky (from the grass, or from the paws of whoever holds it) |
| `star disappears` | The star fades away |

## Magic and fun

| Line | What happens |
|---|---|
| `hearts float up` | Three small pink hearts float up from the character who acted or spoke last |
| `heart floats down` | A golden heart floats down from the star (or the sky) and the character who acted or spoke last catches it |
| `sparkles` | Sparkles burst around the character who acted or spoke last. `sparkles around yuki` picks who |
| `title card: REN` | Big bouncy letters drop in one by one (up to 14 characters) |

## Props, set pieces and animals (the asset kit)

Besides Ren, Yuki and the star, a story can use **props** (small things like a lantern or a map), **set pieces** (big things that stand on the ground, like a cottage or a tent) and **extras** (simple animals or creatures, like an owl or a squirrel).

### Props and set pieces

| Line | What happens |
|---|---|
| `lantern appears at left` | It appears at the `left`, `center` or `right` spot. Also `on the ground` (next to whoever acted or spoke last), `in the sky`, or `next to ren` |
| `the lantern disappears` | It fades away |
| `the lantern glows` / `the lantern stops glowing` | A soft glow around it |
| `the cottage opens` / `the cottage closes` | Opens or closes it (if it has a door or lid) |
| `ren walks to the lantern` | Walks up beside it and looks at it |
| `ren looks at the cottage` | Looks at it (and keeps looking until the next look) |
| `ren waves at the cottage` | Waves while looking at it |

Set pieces stand behind the characters. Props and set pieces stay where they are until they disappear, or until the story moves to another place.

### Extras (animals and creatures)

Extras can do the simple things characters do:

| Line | What happens |
|---|---|
| `owl enters` / `owl enters from right` / `owl exits to left` | Comes in or goes out |
| `owl flies in` / `owl flies away` | For flying extras (they stay up in the air) |
| `fish swims by` | Swims across, from one side to the other |
| `owl hops`, `owl looks at ren`, `owl feels happy` | Like the characters |
| `owl: Hoo!` / `owl (happy): Hoo!` | Talks in a speech bubble (it needs a voice in `config/voices.json`) |
| `ren looks at the owl`, `ren walks to the owl`, `ren waves at the owl` | Ren and Yuki can talk to and look at extras |

### Assets you can use

| Name | Kind | Story lines it supports |
|---|---|---|
| `star` | prop | Everything in "The star" above, plus `star appears at left`, `the star glows` |
| `heart` | prop | `hearts float up`, `heart floats down`, plus `heart appears at right` |
| `lantern` | prop (also `little lantern`, `old lantern`) | `lantern appears next to ren`, `the lantern glows` (the candle lights; brightest at night), `the lantern stops glowing`, `ren walks to the lantern`, `ren looks at the lantern` |
| `cottage` | set piece (also `little cottage`) | `cottage appears at right`, `the cottage opens` / `closes` (the door), `ren walks to the cottage`, `ren looks at the cottage`. About twice Ren's height, with a door his size; its windows (and an open door) glow warm at dusk and night |

Places are listed in "Places" below. New assets are added here as they are created (with `/new-asset` in Claude Code).

### Things that don't exist yet

You can write a story with things that don't exist yet. `check-story.bat` lists them instead of failing:

```
Your story needs 5 new things:
  extra:      owl                  (lines 22, 23)
  place:      cottage garden       (line 9)
  set piece:  cottage              (lines 14, 15, 17)
  prop:       lantern              (lines 18, 19, 20, 27)
  voice:      voice for owl        (line 23)
They are shown as grey placeholders for now, so you can still preview.
```

- In the preview and in stills, missing things are **grey placeholders** with their name on them: a box for a prop or set piece, a grey animal shape for an extra, and a plain grey-blue background for a place.
- `make-video.bat` won't make the finished video until everything exists. For a test video anyway, run `node tools\make-video.js stories\my-story.txt --allow-placeholders`.
- If a name is very close to something that exists, it's probably a typo, and the check tells you: *"Line 4: I don't know "hart". Did you mean "heart"?"*
- The list is also saved as `build\<story>\missing-assets.json`, which Claude Code uses to create the missing things.

### Adding your own pictures (no code)

The quickest way to create a missing thing is a PNG picture in the `assets` folder of the project:

| Put this file | And you get |
|---|---|
| `assets\props\lantern.png` | the prop `lantern` (a name with dashes, like `old-map.png`, becomes `old map`) |
| `assets\props\chest.png` + `chest-open.png` | a chest that opens: `the chest opens` shows the second picture |
| `assets\props\lantern-glowing.png` | the picture for `the lantern glows` |
| `assets\extras\owl.png` | the animal `owl` |
| `assets\extras\owl-1.png`, `owl-2.png`, … | an owl that moves, like a flipbook. Add `owl-blink.png` for blinks and `owl-talk.png` for talking |
| `assets\places\cottage-garden\back.png` | the place `cottage garden` (1920×1080 or bigger) |

Pictures of props and animals need a **see-through (transparent) background**. They face right; if yours faces left, say so in the settings file.

**Settings** (optional): a text file with the same name, like `assets\props\lantern.txt`, with simple lines you can write in Notepad. Every setting has a sensible default:

```
size: small          # small, medium or big (big = a set piece like a house)
height: 90           # how tall, in pixels, next to Ren and Yuki
hold: one paw        # one paw or both paws
glow: yes            # so "the lantern glows" works
moves: fly           # animals only: walk, hop, fly, swim or float
fps: 6               # animals only: flipbook speed
faces: left          # if the picture faces left
credit: drawn by me  # who made the picture (required)
```

**Places:** in `assets\places\cottage-garden\` you can also add `front.png` (a see-through picture drawn in front of the characters, like flowers), `back-sunset.png`, `back-dusk.png` and `back-night.png` (without them, `back.png` is coloured for the time of day, and the sky shows through any see-through part), and `place.txt`:

```
ground: 0.85               # where feet stand, as a share of the height (0.85 = 85% down)
spots: 0.29, 0.5, 0.71     # the left, center and right spots, as shares of the width
ambient: birds             # the place's sound: birds, leaves, water, wind, waves or none
credit: drawn by me
```

Pictures change colour with the time of day, like everything else, so a daytime picture still looks right at night. **Things that give light are the exception:** the lit parts of a glowing picture (the parts of `lantern-glowing.png` that are brighter than `lantern.png`), the star, and the soft glow around anything that glows keep their full colour, so they look brightest at night.

**Examples:** `docs\examples\pictures\` has a full set to copy and try: a lantern that glows, a cottage whose door opens, an owl that flies, blinks and talks, and the place "cottage garden" with flowers in front. Copy a folder's files into `assets\` (for example `docs\examples\pictures\props\lantern*.*` into `assets\props\`) and they work in your stories straight away. `bad-example-crate.png` shows what the check says about a picture without a see-through background or a credit. The engine never loads pictures from `docs\`, only from `assets\`.

**Credits:** every picture needs a `credit:` line (who made it). The check reminds you, and a finished video can't be made with an uncredited picture. Every video also gets `videos\<story>-credits.txt`, listing everything in it and who made it. **Only use pictures you made yourself, or from a tool whose terms allow selling videos. Don't use pictures found on the internet.**

The check also warns about pictures that are very large (over 4000 pixels), place backgrounds smaller than 1920×1080 (they look blurry), and prop or animal pictures without a see-through background.

## Places

| Place | What it looks like | What you hear |
|---|---|---|
| `meadow` | Rolling green hills, pine trees, a sunny knoll full of flowers; fireflies at night | A breeze, and birds in the day and at sunset |
| `forest` | Tall rounded trees, a sandy path, ferns and mushrooms; sunbeams by day, a purple glow at dusk, fireflies at night | Birds and softly rustling leaves |
| `river` | A wide river with a wooden footbridge, reeds and stones; the sun and moon shine on the water | Flowing water |
| `snowy hill` | Snowy hills and pine trees, a snowman, paw prints and sparkling snow | A soft wind |
| `beach` | The sea, waves washing up on the sand, shells and a palm tree; a beautiful sunset over the water | Gentle waves |
| `cottage garden` | A lawn with a white picket fence, a little wooden gate, stepping stones, flower beds along the fence and an apple tree; butterflies by day, fireflies at night. Add `cottage appears at center` for the cottage behind the gate | A breeze, and birds in the day and at sunset |

Every place works at every time of day (`day`, `sunset`, `dusk`, `night`).

### Changing place in the middle of a story

Write `place: river` anywhere in the story to go somewhere new. The page fades to white like a storybook page turning (about 1.2 seconds, with a soft whoosh), and the new place fades in. Characters keep their spots and their moods, and the sounds of the old place cross-fade into the new one.

```
narrator: First, they explored the shady forest.
place: river
narrator: Next, they found a sparkling river.
```

## Scenes (for long episodes)

Long stories are easier to write and watch in **scenes**. Start each scene with a `scene:` line and its name. Right after it, you can set the scene's place, time of day and music:

```
title: The Secret Forest

scene: A Sunny Morning
place: meadow
time: day
music: happy

ren enters
+ narrator: One sunny morning, Ren went out to play.

scene: Into the Forest
place: forest
time: dusk
music: mystery

narrator: The forest was quiet, and the shadows were growing long.
```

- When a scene goes to a new place, the page turns as usual, and its new time of day is already there when the page comes back.
- When a scene stays in the same place, its `time:` line changes the sky slowly, as always.
- Scenes are optional. A story without `scene:` lines works exactly as before.
- Lines before the first `scene:` line make an opening scene named after the story's title.

**Chapters for YouTube:** when a story has at least 3 scenes, each at least 10 seconds long, making the video also writes `videos\<name>-chapters.txt`, for example:

```
0:00 A Sunny Morning
0:23 Into the Forest
0:46 The Wishing Star
```

Paste these lines into the YouTube description, and YouTube shows them as chapters. If the scenes don't meet those rules, the report says why and no chapters file is made.

**Extra checks for stories with scenes** (in the report and in `check-story.bat`):
- each scene should be at least 20 seconds long (a warning if it's shorter)
- something must happen (a voice line or an action) at least every 90 seconds
- whether chapters could be made

## Music

Music plays through every story. With `music:` you choose its mood:

| Line | What it sounds like |
|---|---|
| `music: happy` | The usual cheerful music-box tune |
| `music: calm` | Slow and peaceful, with soft warm chords |
| `music: magical` | Twinkling high notes over dreamy chords, for wonder and magic |
| `music: mystery` | Quiet, low and curious, for exploring and secrets |
| `music: adventure` | Faster and bouncy, for setting off and searching |
| `music: tense` | A soft ticking pulse, for suspense (still gentle, never scary) |
| `music: sad` | Slow and tender, in a minor key |
| `music: bedtime` | A quiet lullaby |
| `music: none` | The music fades away |

Write `music:` at the top of the story, at the start of a scene, or anywhere in the middle. When the mood changes, the old music fades out as the new one fades in, over about 2 seconds. A story without `music:` lines plays the usual music, exactly as before.

```
narrator: Suddenly, the ground began to shake!
music: tense
```

## Scene and camera

| Line | What happens |
|---|---|
| `time: night` | The sky slowly changes over 4 seconds (`day`, `sunset`, `dusk`, `night`). Stars, moon and fireflies come out at night |
| `camera: close` | The camera slowly moves closer to the characters on stage. Also `closer`, or `wide` to go back |
| `wait 2` | A pause of 2 seconds |

## Camera & editing

Without any of these lines, the camera works by itself, exactly as before. Use them to make a story feel like a TV show.

### Shots (an instant cut, like an edit)

| Line | What you see |
|---|---|
| `shot: wide` | The whole place, with everyone in it |
| `shot: medium on ren` | Ren from head to toe, a little closer |
| `shot: close on yuki` | Yuki's head and shoulders |
| `shot: extreme close on ren` | Ren's face fills the screen (good for big surprises) |
| `shot: over the shoulder of ren` | Ren's shoulder, big and soft at the edge of the screen, with the character Ren is talking to on the other side |

After `shot: medium`, `close` or `extreme close`, you can write `on ren`, `on yuki`, `on both` or `on the star`. Without it, the shot shows whoever acted or spoke last (a wide shot shows everyone).

The camera follows the rules of good framing by itself:
- Nobody's head is ever cut off in a close shot.
- One character stands on a third of the screen, with room in front of where they're looking.
- If the characters move, the shot follows them smoothly.
- Speech bubbles get smaller in close shots and move to where they don't cover anyone's face.

```
yuki (playful): Let's play hide and seek!
shot: extreme close on ren
ren (surprised): Hide and seek? I love hide and seek!
shot: over the shoulder of ren
yuki (happy): Then close your eyes and count to ten!
```

### Camera moves (smooth glides)

| Line | What the camera does |
|---|---|
| `camera: push in` | Glides closer (about 2 seconds) |
| `camera: pull out` | Glides further away |
| `camera: pan to yuki` | Turns to look at Yuki. Also `pan to the star`, `pan to left`, `pan to center`, `pan to right` |
| `camera: follow ren` | Keeps Ren in the picture while Ren moves |
| `camera: shake` | A short, light shake, for surprises |
| `camera: hold` | Stops still, even if the characters move (they can walk out of the picture) |

Moves happen while the story carries on, like `camera: close`. The old lines `camera: close`, `closer` and `wide` still work, and in a story with shots they glide too. Background layers move at different speeds as the camera moves, so the picture has depth.

### Automatic editing

Write `editing: auto` at the top of the story (next to `title:`), and the camera chooses the shots by itself, like a TV editor:

- When a conversation starts, it shows both characters together (a medium shot).
- Then it cuts to a close-up of whoever is talking.
- After a **surprised**, **shy** or **sad** line, it shows the other character's reaction for a moment.
- When someone enters, walks, exits or hugs, and when the narrator speaks, it shows the whole place (a wide shot).

Your own `shot:` and `camera:` lines always win. After one of them, the automatic editor waits until the next character line has been spoken. Without `editing: auto`, nothing changes.

```
title: The Missing Cookie
editing: auto
```

### Timing

| Line | What happens |
|---|---|
| `beat` | A short pause (0.6 seconds), for comic timing |
| `pause 2` | A quiet pause of 2 seconds (the same as `wait 2`) |
| `slow motion 3` | The **next action** happens slowly and takes about 3 seconds, with a soft dreamy glow. Use it for magical moments, like a falling star. It works on actions, not on voice lines |
| `reveal: the star` | The camera glides slowly to the star, with a gentle magical swell in the music. Also `reveal: yuki` |
| `reveal: river` | Shows a place: if the story isn't there yet, the page turns first. Then the camera starts close on the characters and slowly pulls back to show the whole place |

```
ren looks around
beat
ren (surprised): Wait... where did it go?

star appears
reveal: the star
slow motion 4
star falls
```

## Sounds you get automatically

You don't write sounds. They come from the actions:

- Music-box music runs through the whole story (choose its mood with `music:`, see "Music" above). It's quieter while someone talks, comes up a little in the pauses between lines, and fades out at the end.
- Hops make boings (Yuki's are lighter and higher), and walking rustles the grass.
- Title letters chime, hearts pop, and star moments twinkle and sparkle.
- Each place has its own sound: a breeze and birds in the meadow, birds and leaves in the forest, flowing water at the river, wind on the snowy hill and waves at the beach. These sounds get softer at night and when the music is `calm` or `bedtime`, so quiet scenes stay quiet.

## Using your own voice recording for a line

Put a WAV file in `voice-overrides\<story-file-name>\line-<number>.wav`, where the number is the line number in your story file (Notepad shows it at the bottom right). For example, to replace line 12 of `my-story.txt`, use:

```
voice-overrides\my-story\line-12.wav
```

The timing adapts to your recording automatically, and its volume is matched to the other voices, so it doesn't sound louder or quieter than the rest. (Every voice line is volume-matched this way, whichever voice says it.)

## When something is wrong

`check-story.bat stories\my-story.txt` tells you exactly which line has a problem and why. For example:

```
Line 14: I don't know how Ren can "dances".
Line 20: the star must be in the sky to fall. Use "star appears" first.
```
