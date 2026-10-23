# Prompts for Claude in VS Code: Ren, Yuki, places, weather, props

Paste these prompts into Claude in VS Code **one at a time, in order**. Start a **new chat for each prompt** so each one gets Claude's full attention. Each prompt is written to stand on its own, because Claude in VS Code hasn't seen our conversation.

## Before you start (once)

1. Create a folder called `reference` inside the project folder and save the two character sheets there:
   - `reference/ren-sheet.png`: the fox sheet
   - `reference/yuki-sheet.png`: the bunny sheet
2. Save your work so you can undo a step that goes wrong. Paste **Prompt 0** first.
3. After each prompt, look at the still images Claude makes. If something looks wrong, tell Claude in the same chat, for example: "Yuki's ears are too short, make them longer like the sheet."
4. When a step looks good, say: **"Commit this step."**

---

## Prompt 0: Save a starting point

```
This folder is "Kitsu Studio": a Node.js + Python project that turns a story text file into an animated MP4.
Please:
1. Run `git init` if this is not already a git repository, make sure .gitignore excludes node_modules/, .venv/, models/, cache/, build/ and videos/, and commit everything as "Baseline before Ren/Yuki changes".
2. Read README.md, STORY-GUIDE.md and every file in engine/ and tools/ so you understand how it works, then give me a short summary (10 lines max) of the architecture. Do not change any code yet.
```

---

## Prompt 1: Rename Kitsu to Ren

```
Rename the main character from "Kitsu" to "Ren" everywhere in this project.

Context: stories are text files in stories/ that are parsed by engine/story.js; the character is drawn by engine/kitsu.js; voices are configured in config/voices.json; tools/make-video.js renders videos; docs are README.md and STORY-GUIDE.md; Windows .bat files are in the root.

Do all of this:
- Story language: lines now start with "ren" instead of "kitsu" (e.g. "ren enters", "ren (happy): Hello!", "ren picks up the star"). Do NOT keep "kitsu" as an alias.
- Code: rename engine/kitsu.js to engine/ren.js, KitsuCharacter to RenCharacter, drawKitsu to drawRen, and every other identifier, comment, error message, the plan field kitsuStartX and the voice key "kitsu" in config/voices.json (to "ren"). Keep window.KitsuFilm / KitsuAudio / KitsuStory only if renaming them would break nothing; otherwise rename them to Studio* names.
- Update every example story in stories/ (including _template.txt), replace the title card text KITSU with REN, and change the spoken text "Kitsu" to "Ren".
- Update README.md, STORY-GUIDE.md and all .bat files. The project name "Kitsu Studio" can stay; only the character is renamed.
- Batch files must keep Windows CRLF line endings.

Verify before you finish:
1. Search the whole project (excluding node_modules, .venv, models, cache, build, videos) for "kitsu" (case-insensitive) and show me the remaining hits; only the project name "Kitsu Studio" and package name may remain.
2. Run `node tools/make-video.js stories/<each story>.txt --check` for every story; all must pass.
3. Run `node tools/make-video.js stories/the-fallen-star.txt --stills 3,12,22,30` and look at the PNGs in videos/ to confirm the character still draws correctly.
```

---

## Prompt 2: Improve Ren's design

```
Improve the drawing of Ren the fox so it matches the character sheet in reference/ren-sheet.png much more closely. Open and study that image first.

Ren is drawn with Canvas 2D code in engine/ren.js (function drawRen(ctx, K)). K contains pose values: x, y (feet), h (hop height), sx/sy (squash), s (scale), f (facing: -1 left, 0 front, +1 right), walk, phase, tilt, lookX/lookY, blink, eyes ('normal'|'happy'|'wide'|'sleepy'), mouth ('smile'|'open'|'o'|'soft'|'frown'|'talk'), talk, wide, brows, blushBoost, earL/earR, tail, armL/armR. engine/film.js computes these values; keep this interface unchanged so all animations keep working.

Match the sheet:
- Bigger, rounder head relative to the body (chibi proportions, head roughly as wide as the body is tall), with fluffy cheek tufts pointing outward and a small fluffy tuft on top of the head.
- Large ears with dark brown tips that blend softly into the orange, pale pink inner ear and cream fluff at the base.
- Big shiny brown eyes: dark outline, warm brown gradient iris, one large and one small white highlight.
- Cream muzzle and cheeks, two small cream eyebrow dots, small dark nose, cat-like "ω" mouth, soft pink blush.
- Fluffy cream chest bib with a jagged fur edge; slightly pear-shaped orange body.
- Dark brown "socks" on the legs and dark brown paws on the arms, with the colour fading softly into the orange.
- Big fluffy tail with a jagged fur outline and a white tip.
- Dark burgundy scarf: a wrapped band, a knot with two hanging ends at the side, a triangle bib in front with a small cream flower.
- Keep the same overall size, the feet anchor point and the outline style (dark brown, about 4px).
- Add a new eyes value 'playful' (one eye winking as an arc, the other open) and a new mouth value 'tongue' (small smile with tongue out), matching the "Playful" face on the sheet. Add 'playful' as a mood in engine/story.js and engine/film.js and document it in STORY-GUIDE.md.

Verify: write a small temporary story that shows Ren front-facing, walking left, walking right, hopping, holding the star, and in every mood (normal, happy, surprised, shy, sad, sleepy, playful). Render stills with `node tools/make-video.js <that story> --stills ...`, look at every PNG, compare with reference/ren-sheet.png, and keep refining until it matches well. Show me the final stills. Then run --check on all stories and delete the temporary story.
```

---

## Prompt 3: Add Yuki the bunny (second character)

```
Add a second character: Yuki, a bunny, drawn to match reference/yuki-sheet.png (study it first). Ren the fox already exists (engine/ren.js). Stories should be able to use Ren, Yuki, or both together.

1. Character design (new file engine/yuki.js, same style and interface as engine/ren.js: drawYuki(ctx, K)):
   - Soft white/very light pink fur, dark brown outline like Ren's, same chibi proportions and roughly the same height as Ren excluding ears.
   - Long upright ears with pink insides; a pink cherry-blossom flower with a small bow at the base of the ear on the viewer's right in the front view (her left ear), exactly as on the sheet.
   - Big dark brown shiny eyes, pink blush, tiny pink nose, small mouth; pink bow collar with a small flower.
   - Round chubby body, small paws held near her chest, small round cotton tail visible when turned sideways.
   - Ears are expressive: they droop/flop for shy, sad and sleepy, perk up for surprised, and bounce slightly when she hops.
   - Expressions from the sheet: happy, shy (paws near cheeks, one ear flopped), surprised (wide white eyes with small pupils), playful (wink + tongue), pouty (puffed cheeks, frowning brows), sleepy (eyes closed, ears drooped, paw over a yawn). Add 'pouty' as a mood (available to both characters; for Ren draw puffed cheeks and a small frown).

2. Movement: Yuki moves by hopping (small repeated hops with a light "boing"), not walking. Her hops sound lighter and higher than Ren's.

3. Voice: add "yuki" to config/voices.json using a different Kokoro voice from Ren's (try "af_bella" at speed 1.0 with pitch 1.18, listen-check by measuring that it differs; I will tune it later). Voice clips are made by tools/tts.py and pitched in tools/make-video.js.

4. Story language, generalised for any character (refactor engine/story.js so characters live in a registry; adding a 3rd character later should only need a drawing file + a registry entry):
   - Everything Ren can do, Yuki can do: "yuki enters from right", "yuki: Hi!", "yuki (pouty): Hmph!", "yuki hops", "yuki waves", "yuki looks at ren", "yuki picks up the star", etc.
   - New lines: "<name> looks at <other name>", "<name> walks to <other name>" (stops beside them), "<name> turns to <other name>", "ren and yuki hop" (both at once), "yuki hugs ren" (they move close, both happy, a few small hearts).
   - Each character has its own position; stage spots are left, center, right. If a story puts both on the same spot, offset them so they never overlap.
   - Characters who are not doing anything stay alive (blink, breathe, small idle motion) and turn to look at whoever is talking.
   - Only characters that have entered are on screen. A story that never mentions Yuki must look exactly as before.
   - Speech bubbles: the bubble tail points at the character who is speaking, and the bubble is placed on the side away from the other character. Two bubbles must never overlap.

5. Update STORY-GUIDE.md, README.md, stories/_template.txt and add an example story stories/ren-meets-yuki.txt (about 60 seconds) that shows Yuki entering, the two meeting, talking, every Yuki mood, a hug and hopping together.

Verify: run --check on every story, render stills of ren-meets-yuki at 8-10 moments, look at each still and compare Yuki with reference/yuki-sheet.png, fix problems, then make the full video with `node tools/make-video.js stories/ren-meets-yuki.txt` and confirm every check in videos/ren-meets-yuki-report.txt passes. Show me the stills and the report.
```

---

## Prompt 4: New places

```
Add new places to the story engine. Currently the only place is "meadow" (drawn in engine/film.js, drawBackground, with colours for times of day: day, sunset, dusk, night via the tau value and the PAL table).

Refactor backgrounds into a place registry (for example engine/places/meadow.js, forest.js, ...), each place providing: a layered parallax drawing function (sky, far layer, mid layer, ground), its own day/sunset/dusk/night colour palette, the ground height function (feet position for characters), and the x positions for left/center/right. Keep the meadow looking exactly as it does now.

Add these places, in the same cute pastel storybook style, animated subtly (deterministic, time-based only):
- forest: tall rounded trees in layers, mushrooms, ferns, light rays through leaves by day, fireflies at night.
- river: a gentle river across the middle with shimmering animated water and a small wooden bridge, reeds and stones on the bank, reflections at night.
- snowy hill: snow-covered hills and pine trees, soft blue shadows, a snowman; ground sparkles.
- beach: sea with animated waves, sand, shells, a palm tree; sunset over the water looks especially nice.

Story language:
- "place: forest" at the top sets the starting place.
- "place: river" in the middle of a story changes place with a smooth fade-to-white storybook page-turn transition (about 1.2 s), and characters keep their positions.
- Unknown places give a clear error listing the available places.

Add matching ambient sounds in engine/audio.js (meadow: breeze + birds as now; forest: birds + soft leaves; river: flowing water; snowy hill: soft wind; beach: waves), cross-fading on place changes.

Update STORY-GUIDE.md and add example story stories/a-trip-around.txt that visits every place. Verify with --check and stills of each place at day and night (look at them and fix anything that looks off), then render the example and confirm the report passes.
```

---

## Prompt 5: Weather

```
Add weather to the story engine (engine/story.js, engine/film.js, engine/audio.js). Weather is independent of place and time of day and works in every place.

Story language: "weather: clear | rain | snow | leaves | windy", either at the top (starting weather) or mid-story (fades in/out over about 2 seconds).
- rain: diagonal soft raindrops in two depth layers, small splash ripples on the ground, slightly darker/greyer colour grade; rain sound. Optional "thunder" line: a gentle flash plus a soft rumble (keep it cute, not scary).
- snow: flakes of different sizes drifting and swaying; soft muffled wind sound.
- leaves: orange/red/yellow leaves tumbling across the screen; rustling sound.
- windy: grass, flowers and trees sway much more, scarves/ears/tails move more; wind sound.
- Characters react automatically: in rain they squint slightly; in snow their breath is not needed, keep it simple.
- Add a prop line "<name> opens an umbrella" / "<name> closes the umbrella" (cute umbrella in their paw; Ren's is red, Yuki's is pink). Raindrops should not fall through the umbrella.

All motion must be deterministic (based on time t only, seeded randomness) so the export is reproducible. Keep the effect counts reasonable so rendering speed stays similar.

Update STORY-GUIDE.md, add example story stories/rainy-day.txt (Ren and Yuki share an umbrella, rain stops, a rainbow appears: also add "rainbow appears" as a line). Verify with --check, stills, look at them, then render the example and confirm the report passes.
```

---

## Prompt 6: More props

```
Add new props to the story engine, following the same pattern as the existing star prop (compile-time segments in engine/story.js, drawing + state in engine/film.js, sound cues in engine/audio.js). All props must work with both Ren and Yuki ("<name>" below means either character).

- butterfly: "butterfly flies in", "butterfly lands on <name>" (on their head/ear), "butterfly flies away". Fluttering wings, wavy flight path, characters can "look at the butterfly".
- ball: "ball appears", "<name> kicks the ball" / "<name> throws the ball to <other name>" (the other catches it), "ball bounces away". Bouncy arcs with squash, a soft bounce sound.
- apple: "apple falls" (from a tree, or from the top if the place has no tree), "<name> picks up the apple", "<name> eats the apple" (bite marks appear, crunch sound), "<name> gives the apple to <other name>".
- balloon: "balloon appears", "<name> holds the balloon" (string in paw, gentle sway), "<name> lets go of the balloon" (it floats up and away).
- flower: "<name> picks a flower" (from the ground), "<name> gives the flower to <other name>".
- gift: "gift appears", "<name> opens the gift" (lid pops, sparkles; then a prop given in the line comes out, e.g. "ren opens the gift: ball").

Rules: clear error messages when a prop line doesn't make sense (e.g. eating an apple nobody holds). Characters automatically look at a moving prop that is near them. Props never overlap speech bubbles. Everything deterministic.

Update STORY-GUIDE.md and add example story stories/picnic-party.txt (Ren and Yuki: a picnic with an apple to share, a ball game, a balloon, a butterfly, a gift). Verify with --check and stills (look at them and fix anything that looks off), then render the example and confirm the report passes. Finally run --check on every story in stories/ to make sure nothing old broke.
```

---

## Tips

- **If a step fails or looks wrong:** describe what you see in the same chat, and attach a still image if you can. To undo the whole step, say "Undo all changes since the last commit."
- **Rendering is slow while you're experimenting.** Ask Claude to use `--stills` and `--check` while it works, and to make the full video only at the end.
- **The voices for Yuki:** if you don't like how she sounds, ask: "Try Yuki with the Kokoro voices af_nicole, af_kore and af_aoede, make a 5-second sample of each in videos/, and I'll pick one."
