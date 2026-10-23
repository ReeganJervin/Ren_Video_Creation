# Story Guide: every line you can write

A story is a plain text file in the `stories` folder. You can write it in Notepad. Each line is one thing that happens, and they happen **one after another, top to bottom**. The timing is automatic: each line waits until the one before it has finished. You never type seconds, except with `wait`.

```
title: Kitsu and the Fallen Star
place: meadow
time: sunset

kitsu enters
+ narrator: Once upon a time, in a meadow kissed by the setting sun...
kitsu (surprised): Whoa! A little fallen star!
```

## The three rules

1. **One action per line.**
2. **Put `+` at the start of a line to make it happen at the same time as the line above.**
   For example, Kitsu walks in *while* the narrator talks:
   ```
   kitsu enters
   + narrator: Once upon a time...
   ```
   Two voices can't talk at the same time. If you try, the checker will tell you.
3. **Lines starting with `#` are notes.** They're ignored, so use them to organise your story.

## Settings (at the top)

| Line | What it does |
|---|---|
| `title: My Story Name` | The story's name, shown in the preview |
| `place: meadow` | Where the story happens. The only place for now is `meadow` |
| `time: sunset` | How the sky starts: `day`, `sunset`, `dusk` or `night` |

## Talking

| Line | What it does |
|---|---|
| `narrator: text` | The narrator reads the text. It also appears in a storybook caption box at the top |
| `kitsu: text` | Kitsu says the text in a speech bubble, and its mouth moves |
| `kitsu (happy): text` | Kitsu says it with a mood: `happy`, `surprised`, `shy`, `sad`, `sleepy` |

Keep each line under 160 characters. Write long speeches as several lines.

## Kitsu's actions

| Line | What Kitsu does |
|---|---|
| `kitsu enters` | Walks in from the left to the centre. Also: `kitsu enters from right`, `kitsu enters from left to right` |
| `kitsu walks to left` | Walks to the `left`, `center` or `right` spot. Add `slowly` for a careful walk |
| `kitsu exits to right` | Walks off screen (`left` or `right`) |
| `kitsu hops` | One happy hop with a boing sound. `kitsu hops twice` hops twice |
| `kitsu waves` | Waves a paw |
| `kitsu looks up` | Looks `up`, `down`, `left`, `right`, `around`, `at you`, `at the star` or `at the heart`. Looking at the star or heart follows it as it moves |
| `kitsu turns to you` | Faces the viewer |
| `kitsu tilts its head` | A curious head tilt |
| `kitsu feels sad` | Changes Kitsu's mood until you change it again: `happy`, `surprised`, `shy`, `sad`, `sleepy`, `normal` |
| `kitsu blinks` | An extra blink. Kitsu also blinks by itself |
| `kitsu raises its paws` / `kitsu lowers its paws` | Paws up or down |
| `kitsu picks up the star` | Walks to the fallen star and picks it up with both paws |
| `kitsu lets go of the star` | Lifts the star up and it floats back into the sky |

Kitsu also blinks, breathes, twitches its ears and wags its tail automatically.

## The star

| Line | What happens |
|---|---|
| `star appears` | A little star appears in the sky |
| `star twinkles` | The star (in the sky) twinkles three times |
| `star falls` | The star falls from the sky and lands in the grass next to Kitsu |
| `star glows` | The star flickers weakly, then shines brightly |
| `star rises` | The star floats up into the sky (from the grass, or from Kitsu's paws) |
| `star disappears` | The star fades away |

## Magic and fun

| Line | What happens |
|---|---|
| `hearts float up` | Three small pink hearts float up from Kitsu |
| `heart floats down` | A golden heart floats down from the star (or the sky) and Kitsu catches it |
| `sparkles` | Sparkles burst around Kitsu |
| `title card: KITSU` | Big bouncy letters drop in one by one (up to 14 characters) |

## Scene and camera

| Line | What happens |
|---|---|
| `time: night` | The sky slowly changes over 4 seconds (`day`, `sunset`, `dusk`, `night`). Stars, moon and fireflies come out at night |
| `camera: close` | The camera slowly moves closer to Kitsu. Also `closer`, or `wide` to go back |
| `wait 2` | A pause of 2 seconds |

## Sounds you get automatically

You don't write sounds. They come from the actions:

- Music-box music runs through the whole story. It's quieter while someone talks and fades out at the end.
- Hops make boings, and walking rustles the grass.
- Title letters chime, hearts pop, and star moments twinkle and sparkle.
- There's a breeze, plus birds in the day and sunset.

## Using your own voice recording for a line

Put a WAV file in `voice-overrides\<story-file-name>\line-<number>.wav`, where the number is the line number in your story file (Notepad shows it at the bottom right). For example, to replace line 12 of `my-story.txt`, use:

```
voice-overrides\my-story\line-12.wav
```

The timing adapts to your recording automatically.

## When something is wrong

`check-story.bat stories\my-story.txt` tells you exactly which line has a problem and why. For example:

```
Line 14: I don't know how Kitsu can "dances".
Line 20: the star must be in the sky to fall. Use "star appears" first.
```
