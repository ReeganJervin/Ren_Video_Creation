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
| `place: meadow` | Where the story starts: `meadow`, `forest`, `river`, `snowy hill` or `beach` (see "Places" below) |
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

## Places

| Place | What it looks like | What you hear |
|---|---|---|
| `meadow` | Rolling green hills, pine trees, a sunny knoll full of flowers; fireflies at night | A breeze, and birds in the day and at sunset |
| `forest` | Tall rounded trees, a sandy path, ferns and mushrooms; sunbeams by day, a purple glow at dusk, fireflies at night | Birds and softly rustling leaves |
| `river` | A wide river with a wooden footbridge, reeds and stones; the sun and moon shine on the water | Flowing water |
| `snowy hill` | Snowy hills and pine trees, a snowman, paw prints and sparkling snow | A soft wind |
| `beach` | The sea, waves washing up on the sand, shells and a palm tree; a beautiful sunset over the water | Gentle waves |

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

## Sounds you get automatically

You don't write sounds. They come from the actions:

- Music-box music runs through the whole story (choose its mood with `music:`, see "Music" above). It's quieter while someone talks, comes up a little in the pauses between lines, and fades out at the end.
- Hops make boings (Yuki's are lighter and higher), and walking rustles the grass.
- Title letters chime, hearts pop, and star moments twinkle and sparkle.
- Each place has its own sound: a breeze and birds in the meadow, birds and leaves in the forest, flowing water at the river, wind on the snowy hill and waves at the beach.

## Using your own voice recording for a line

Put a WAV file in `voice-overrides\<story-file-name>\line-<number>.wav`, where the number is the line number in your story file (Notepad shows it at the bottom right). For example, to replace line 12 of `my-story.txt`, use:

```
voice-overrides\my-story\line-12.wav
```

The timing adapts to your recording automatically.

## When something is wrong

`check-story.bat stories\my-story.txt` tells you exactly which line has a problem and why. For example:

```
Line 14: I don't know how Ren can "dances".
Line 20: the star must be in the sky to fall. Use "star appears" first.
```
