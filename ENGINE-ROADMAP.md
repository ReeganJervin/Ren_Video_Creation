# Kitsu Studio: Engine Foundation Roadmap (F1–F8)

> **For Claude Code.** This is the implementation plan for upgrading Kitsu Studio into a production engine for the series **"Ren & Yuki: The Secrets Beyond the Enchanted Forest"**: 10 episodes of 8–10 minutes, plus Shorts.
> **Read first:** `HANDOFF.md` (the current engine, status and way of working) and `PRODUCTION-SYSTEM.md` (the three video formats).
> **Owner:** not a programmer, on Windows. They review every step from images and reports.

---

## 0. How to use this file

1. **Do one feature (F1, F2, …) at a time, in order,** in a fresh chat if possible. Start each session with:
   *"Read HANDOFF.md, PRODUCTION-SYSTEM.md and ENGINE-ROADMAP.md. Implement the next feature whose status is 'Not started', beginning with Part A."*
2. **Every feature has Part A and Part B.**
   - **Stop for the owner's review after Part A,** and again after Part B.
   - **Never start Part B, or the next feature, without explicit approval.**
3. **Commit Part A and Part B separately** after approval, using the commit message given in each section.
4. **When a feature is approved, update the status table (section 2)** and the "Current status" section of `HANDOFF.md`.
5. **If something in this file conflicts with the code,** the code is the truth. Explain the conflict, then adapt the plan.

---

## 1. Global rules (apply to every feature)

| # | Rule |
|---|---|
| R1 | **Existing stories must not change.** For every story in `stories/` that doesn't use the new feature: compare **12 frames per story** against the previous commit (they must be pixel-identical) and confirm the **timing data is identical**. Report the result every time. |
| R2 | **`--check` must pass on every story** after every change. |
| R3 | **All 10 checks must pass** on every example video. If a check fails, **fix the content or the engine, never loosen the check.** Any change to a check needs the owner's approval first. |
| R4 | **Deterministic:** every motion and effect depends only on time `t` and seeded randomness. Rendering twice gives identical output. |
| R5 | **Keep the story syntax.** Only add new lines or headers. Never rename or remove existing ones. |
| R6 | **Don't change the approved character designs** (`engine/ren.js`, `engine/yuki.js`) unless the feature explicitly requires it. If it does, show a side-by-side with the reference sheet and the previous version. |
| R7 | **Check visually:** render stills or close-ups, look at them yourself, compare with `reference/*-sheet.png` where relevant, fix problems, and only then show the owner. Always give the scratchpad paths of the images. |
| R8 | **Keep the docs up to date:** every new story line goes into `STORY-GUIDE.md` with an example; every new command goes into `README.md`. Each feature adds or updates an example story in `stories/`. |
| R9 | **Windows first:** `.bat` files keep CRLF line endings (enforced by `.gitattributes`); messages to the owner stay simple and friendly. |
| R10 | **Performance:** a new feature must not make rendering more than about 10% slower without saying so and explaining why. |
| R11 | **No fighting or violence.** Danger is shown through suspense, chases, hiding and puzzles. Every video stays suitable for children. |

**Review package**, included at every stop:
1. a summary of what changed
2. the R1 result
3. the `--check` results
4. the video report or reports
5. the image paths
6. open questions and decisions you made yourself

---

## 2. Status

| Feature | Status | Commit(s) |
|---|---|---|
| F1 Long episodes (scenes, music moods, chapters, fast rendering) | Done (approved) | F1A, F1B (branch `Improvment`) |
| F2 Camera and editing | Not started | |
| F3 Rig 2.0 (joints, movement library, lip-sync) | Not started | |
| F4 Prop system | Not started | |
| F5 Lighting and indoor places (cave kit) | Not started | |
| F6 Magic and comedy effects | Not started | |
| F7 Vertical 9:16 and Shorts | Not started | |
| F8 Creature kit (new characters) | Not started | |

---

## F1: Long episodes

**Goal:** make 8–10+ minute episodes practical. That means scenes, music moods, chapters, and much faster, reliable rendering.

### Part A: scenes, music moods, chapters
1. **Scene blocks:** a line `scene: <name>` starts a scene. A scene may set `place:`, `time:` and `music:` (and later `weather:`) in its first lines. The plan stores `scenes[]` with the name, start and end times. A story without `scene:` lines works exactly as now, as one implicit scene.
2. **Music moods:** `music: happy | calm | magical | mystery | adventure | tense | sad | bedtime | none`.
   - Each mood has its own procedural arrangement (chords, tempo, instruments and density) in the current gentle music-box and pad style.
   - Moods crossfade over about 2 s when they change.
   - `music:` also works without scenes, as a mid-story line. A story with no `music:` lines uses today's music, unchanged.
3. **Chapters:** write `videos/<name>-chapters.txt` in YouTube format, using `0:00 Scene name` lines. Only write it if there are at least 3 scenes, the first at 0:00, each at least 10 s. Otherwise skip it and add a note in the report.
4. **CLI:**
   - `--stills scene:N` renders the middle of scene N, and `scene:N@3.5` renders 3.5 s into it.
   - `--check` prints the scene list with estimated durations.
5. **New checks** for stories with scenes, added to the report:
   - each scene is at least 20 s long (a warning if shorter)
   - no stretch longer than 90 s without a voice line or action
   - the chapter rules are met

**Part A review:** a 3-scene test story (`stories/test-scenes.txt`) using 3 music moods and 2 places. Show its report, the chapters file, the `--check` output, and stills from each scene.

**Commit message:** `F1A: scenes, music moods, chapters`

### Part B: speed and reliability
1. **Parallel rendering:**
   - Use N browser pages at once. The default is CPU cores minus 1; set it with `--workers N`.
   - Frames are delivered in order to ffmpeg.
   - **The output must be pixel-identical to rendering with 1 worker.** Verify this on one story.
2. **Rendering in chunks, with resume:**
   - Render scene by scene into `build/<name>/chunks/`, plus one audio file for the whole episode.
   - Join the chunks with no gaps, duplicate frames or audio drift.
   - `--resume` continues after a crash or Ctrl+C without redoing finished chunks. A chunk is redone if the story changed (compare a hash of the plan).
3. **Progress display:** overall %, the current scene, frames per second, and an estimated time left.
4. **Stress test:**
   - Generate `stories/test-12min.txt`: 12 scenes, all five places, both characters, about 120 lines.
   - Render it and report the total time, peak memory and the checks.
   - Compare speed with 1 worker against N workers on a 1-minute story.
5. **Docs:** STORY-GUIDE.md (scenes, music, chapters) and README.md (`--workers`, `--resume`, and expected render times).

**Acceptance:**
- the 12-minute test passes all checks
- rendering with N workers is pixel-identical to 1 worker
- `--resume` works after a deliberate interruption
- the speed-up is reported

**Commit message:** `F1B: parallel and chunked rendering, resume, 12-minute stress test`

---

## F2: Camera and editing

**Goal:** make episodes feel like a TV show. That means several shots per scene, cuts, reactions, suspense and comic timing.

### Part A: shots and camera moves
1. **Shot lines:**
   - `shot: wide | medium | close | extreme close | over the shoulder`
   - optionally with a target: `on ren`, `on yuki`, `on both`, `on the star` (or any prop later)
   - Example: `shot: close on yuki`.
   - Over the shoulder needs two characters: `shot: over the shoulder of ren`.
   - It cuts instantly, like an edit. The existing `camera:` lines keep working as they do now, as smooth moves.
2. **Camera moves:**
   - `camera: push in`, `camera: pull out`, `camera: pan to <target>`, `camera: follow <name>`
   - `camera: shake` (light, short, for surprises), `camera: hold`
   - Moves are smooth, with easing.
3. **Framing rules:**
   - characters are never cut off at the head in close shots
   - when framing a person, use the rule of thirds and leave room in front of them in the direction they're looking
   - bubbles adapt to the shot: they shrink and move in close shots, and never cover faces
4. **Background parallax** follows the camera, so cuts and pans show depth.

**Part A review:** a test story that uses every shot type, cut and move in two places. Show stills of each shot and a 1-second strip of 6 frames for each move.

**Commit message:** `F2A: shot types, cuts and camera moves`

### Part B: automatic editing and timing
1. **Automatic coverage, optional:**
   - `editing: auto` at the top of a story. During conversations the engine picks shots automatically: a medium two-shot to set up, close-ups on the speaker, and quick reaction shots on surprised, shy or sad moods.
   - Manual `shot:` lines always take priority.
   - Without `editing: auto`, nothing changes.
2. **Timing lines:**
   - `beat`: a 0.6 s pause for comic timing.
   - `pause <seconds>`: a quiet pause (the same as `wait`).
   - `slow motion <seconds>`: slows the next action. This is for magical reveals, not fights.
3. **Reveal helper:** `reveal: <prop or place>` does a slow push-in or pan, with a gentle magical music swell.
4. **Docs and example:** STORY-GUIDE.md section "Camera & editing", plus the example `stories/camera-demo.txt`, about 90 s.

**Acceptance:**
- the demo passes all checks
- R1 holds (stories without shot or editing lines are unchanged)
- no face is cut off in any of the 30 stills sampled from the demo

**Commit message:** `F2B: automatic editing, beats, slow motion, reveals`

---

## F3: Rig 2.0 (joints, movement library, lip-sync)

**Goal:** real adventure movement while **keeping the approved look of Ren and Yuki.**

### Part A: the skeleton, with the design unchanged
1. **Rebuild Ren and Yuki on a joint hierarchy:**
   - hips → spine → neck → head
   - shoulder → upper arm → forearm → paw, on each side
   - hip → thigh → shin → foot, on each side
   - a tail chain of 3–5 segments
   - an ear chain of 2–3 segments per ear
   - Drawing stays in Canvas 2D, in the same style.
2. **The look must not change:** in their rest pose, both characters must look the same as now in the front, three-quarter and side views and in every mood.
   - Show side-by-sides: old engine | new engine | reference sheet.
   - Small differences are acceptable only if they look closer to the sheet.
3. **A back view** (when facing away), matching the sheet's "Back" view, for both characters.
4. **Springy secondary motion:** ears, tail, Ren's scarf ends and Yuki's ear flower follow the body with spring physics (deterministic, time-stepped from t = 0).
5. **Existing actions** (walk, hop, wave, hug, hold the star, catch, moods, talking) must work on the new rig.
   - **R1 exception:** pixel-identical output is impossible here because the rig changes. Instead, show the same 12 frames per story from old and new side by side, and get the owner's approval.

**Part A review:** close-ups of both characters in all views and moods (old | new | sheet), a strip showing springy ears and tail, and the back view.

**Commit message:** `F3A: Rig 2.0 skeleton, back view, spring motion`

### Part B: movement library and lip-sync
1. **New actions,** each working for both characters (`<name>` = ren or yuki):
   - `<name> runs to left|center|right|<name>`
   - `<name> sneaks to …` (crouched, careful steps)
   - `<name> jumps over`, `<name> jumps down`, `<name> jumps up`
   - `<name> climbs up` and `<name> climbs down` (to a ledge height set by the place, later in F5)
   - `<name> crawls to …`
   - `<name> pushes` (a prop or wall, ready for F4)
   - `<name> falls down` and `<name> gets up` (a comic fall, never hurt)
   - `<name> trips`
   - `<name> hides behind <prop or place feature>`
   - `<name> peeks out`
   - `<name> jumps in fright` (a startled jump, with ears up)
   - `<name> sits down` and `<name> stands up`
   - `<name> lies down` (for sleeping)
   - `<name> dances`
   - `<name> shrugs`, `<name> nods`, `<name> shakes its head`
   - `<name> points at <target>`
   - `<name> covers its eyes`
   - `<name> stretches`, `<name> yawns`
   - `<name> sighs`
   - Yuki keeps hopping instead of walking, and her runs are fast hops.
2. **Blending:** smooth transitions between actions (about 0.15–0.3 s blends), with no popping.
3. **Real lip-sync:**
   - Use word or phoneme timing from the TTS. Kokoro tokens give phonemes; otherwise estimate from the text and audio energy.
   - Map them to 6–8 mouth shapes per view (A/I, E, O, U, M/B/P, F/V, rest).
   - **Voice-override recordings** use audio energy plus text alignment.
4. **Docs and example:** STORY-GUIDE.md section "Movement", plus `stories/movement-demo.txt` (about 2 min, using every action).

**Acceptance:**
- every action shown in stills and in a strip of 6 frames
- lip-sync visibly matches the speech on 3 sample lines (show a mouth-shape strip next to the waveform)
- the demo passes all checks

**Commit message:** `F3B: movement library, blending, lip-sync`

---

## F4: Prop system

**Goal:** treasure hunting needs objects. Any prop can appear, be held, carried, used, given, put down, opened or glow.

### Part A: props and their drawings
1. **Prop list** in `engine/props/`, one file per prop, like the place list. Each prop defines:
   - its drawing
   - its size
   - where it's held (one paw or both)
   - its states, for example closed and open
   - optional glow
   - its sounds
2. **Season 1 starter props:**
   - golden coin (with the tree symbol)
   - legendary sword (with runes that can glow)
   - old map (it unrolls, and can show marks)
   - treasure chest (closed, open, overflowing)
   - pile of gold
   - lantern
   - ancient book
   - artefact orb
   - stone door (closed, open)
   - lever
   - shiny pebble
   - cookie
   - umbrella
   - flower
   - Keep the existing star and heart working exactly as now.
3. **Style:** the same line weight and palette as the characters. Every prop must work in all four times of day and in dark scenes (ready for F5).

**Part A review:** a sheet showing every prop in each state, at character scale next to Ren and Yuki, by day and at night.

**Commit message:** `F4A: prop registry and Season 1 props`

### Part B: prop actions
1. **Story lines** (`<prop>` = the prop's name, optionally with "the"):
   - `<prop> appears at left|center|right|on the ground|in the sky`
   - `<name> finds the <prop>` (an excited reaction, with a sparkle)
   - `<name> picks up the <prop>`, `<name> holds up the <prop>` (a proud pose)
   - `<name> carries the <prop>` (walking with it; heavy props slow the character down)
   - `<name> gives the <prop> to <name>`
   - `<name> puts down the <prop>`
   - `<name> drops the <prop>` (a comic drop with a sound)
   - `<name> opens the <prop>` and `<name> closes the <prop>`
   - `<name> uses the <prop> on the <prop>` (for example the coin on the stone door)
   - `<name> pulls the <prop>` (a lever)
   - `the <prop> glows` and `the <prop> stops glowing`
   - `the <prop> opens`
   - `the <prop> disappears`
   - `the map shows <text>` (a mark or label appears on the map)
2. **Clear errors for impossible actions,** for example *"Line 22: Ren isn't holding the sword."* or *"Line 30: there is no chest here."*
3. **Props carry over** between scenes and places when held, and stay where they were left otherwise.
4. **Docs and example:** STORY-GUIDE.md section "Props", plus `stories/treasure-demo.txt`, a mini treasure hunt of about 2 min that uses most props.

**Acceptance:** the demo passes all checks, R1 holds, and the error messages are tested with a deliberately broken story.

**Commit message:** `F4B: prop actions, continuity and errors`

---

## F5: Lighting and indoor places (cave kit)

**Goal:** half of Season 1 happens underground or indoors.

### Part A: the lighting system
1. **Light sources:**
   - Props (lantern, glowing sword, orb, glowing runes), magic effects and place features (torches, crystals) can **give off light.**
   - Darkness is applied as a layer, with soft circles of light around each source.
   - Characters are lit by nearby lights, with warm or cool tinting and a rim light.
2. **Story lines:**
   - `light: bright | dim | dark` sets the room's light level.
   - `<name> lights the lantern`
   - Glowing props light their surroundings automatically.
3. **Outdoor places stay unchanged** (R1). Lighting only applies when a place or story asks for it.

**Part A review:** Ren and Yuki in a dark test room with a lantern, a glowing sword and an orb, each light alone and together, plus a still where they walk from the dark into the light.

**Commit message:** `F5A: lighting system`

### Part B: the cave kit and indoor places
1. **Cave kit** in `engine/places/`. One base cave with **variants:**
   - `cave entrance` (outdoor forest edge, with a dark opening beneath a giant ancient tree)
   - `cave tunnel`
   - `treasure chamber` (gold piles, chests, glittering coins)
   - `hidden chamber` (runes, a pedestal for the sword)
   - `crystal cave` (glowing crystals that give light)
   - `underground lake`
2. **Ancient interiors:**
   - `ancient ruins` (outdoor and indoor parts, carved symbols)
   - `ancient library` (shelves, floating dust in the light, books)
3. **Place features** that characters and props can use:
   - ledges (for `climbs up`)
   - things to hide behind
   - doors and passages (for `opens`)
   - pedestals (for `puts the <prop> on`)
4. **Each place** gets its own ambient sound (cave drips and echoes, crystal hum, lake water, library hush) and suggested music moods.
5. **Docs and example:** `stories/into-the-cave.txt` (about 2 min), with a forest walk → cave entrance → tunnel → treasure chamber → hidden chamber, using the lantern and the glowing sword.

**Acceptance:**
- all new places shown in their light levels, with characters in them
- the example passes all checks
- R1 holds for outdoor stories

**Commit message:** `F5B: cave kit, ruins, library and place features`

---

## F6: Magic and comedy effects

**Goal:** the wonder and the comic disasters.

### Part A: magic effects
**Story lines:**
- `magic sparkles around <target>`
- `the runes glow` (on the sword, a door or a wall)
- `a beam of light shines from <prop> to <target>`
- `a portal opens` and `the portal closes`
- `the <prop> floats up`
- `magic swirl around <name>`
- `the ground glows`
- `an illusion appears` (a shimmering copy or fake path) and `the illusion fades`
- `a glow comes from <place feature>` (for example the sealed passage, as in the Episode 1 hook)

Each effect has its own sound and uses the lighting system from F5. All of them are deterministic particles or shapes.

**Part A review:** a strip of 6 frames for every effect, outdoors and in a dark cave.

**Commit message:** `F6A: magic effects`

### Part B: comedy and impact effects
**Story lines:**
- `treasure avalanche` (coins pour and pile up, with a funny sound)
- `dust cloud`
- `<name> is buried in coins` (only the ears stick out)
- `the floor rumbles` (shake plus sound)
- `rocks tumble` (small and harmless)
- `a splash`
- `stars spin around <name>` (dizzy, comic)
- `sweat drop on <name>`
- `anger puff on <name>` (cartoon steam)
- `question mark above <name>` and `exclamation mark above <name>`
- `<name> blushes deeply`

**Docs and example:** STORY-GUIDE.md section "Effects", plus `stories/effects-demo.txt` (about 2 min).

**Acceptance:** the demo passes all checks, and effects don't slow rendering by more than 10% when unused (R10).

**Commit message:** `F6B: comedy and impact effects`

---

## F7: Vertical 9:16 and Shorts

**Goal:** publish Shorts while episodes are being made (see `PRODUCTION-SYSTEM.md`, sections 3–5).

### Part A: vertical rendering
1. `format: vertical` (or `--format vertical`) renders 1080×1920.
2. **Vertical layout per place:** a taller composition with more sky and more foreground, not a crop.
3. **Camera framing for vertical:** medium or close, centred on the characters, and pairs stand closer.
4. **Safe area:**
   - Keep faces, bubbles and captions out of roughly the bottom 20%, the right 15% and the top 8%.
   - Add a safe-area check to the report.
5. **Bubbles and captions** are narrower (about 700 px wide), and title cards are scaled down.

**Part A review:** every place in vertical format with both characters (day and night), plus a vertical version of `sorry-yuki` with the safe-area check passing.

**Commit message:** `F7A: vertical format and safe area`

### Part B: Shorts workflows
1. **Independent Short:**
   - `type: short` (vertical by default)
   - `captions: on` for burned-in word captions
   - faster pacing
   - a music "sting" on the payoff
   - an optional ending that loops back to the start
2. **Episode Short:**
   - `type: episode short`, with `from: <story>` and `scenes: N` or `scenes: N-M` or `lines: A-B`
   - `hook: <text>`, `ending: <text>` (an end card), an optional framing override, and optional replacement ending lines
   - It re-renders the time window (it never crops), and the audio window gets fades.
   - Voices come from the cache.
3. **Outputs:**
   - a thumbnail (1280×720, or a vertical cover frame), chosen with `thumbnail: <seconds>` or `thumbnail: scene N`
   - a subtitle file, `<name>.srt`
   - `<name>-meta.json` with a draft title, description and tags
4. **Length checks:** 15–60 s for Shorts, with a warning outside that range.
5. **Examples:**
   - `shorts/the-last-cookie.txt` (independent)
   - `episodes/demo/shorts/s01.txt` (taken from `stories/into-the-cave.txt` or the 12-minute test)

**Acceptance:** both example Shorts pass all checks, including safe area and length, and R1 holds for landscape stories.

**Commit message:** `F7B: independent and episode Shorts, thumbnails, subtitles`

---

## F8: Creature kit (new characters)

**Goal:** add the Season 1 cast quickly. **Do this only after the owner confirms that Episodes 1–3 are in production.**

### Part A: the kit, plus the first two creatures
1. **Character builder:** a new character file defines its body parts on the Rig 2.0 skeleton, or a simpler rig for blob or spirit creatures. It also defines its palette, views, moods, its movement style (walk, hop, float, fly or stomp) and its voice entry. Use Ren and Yuki as the pattern, and update `engine/characters.js`.
2. **First creatures:**
   - **forest spirit:** small, glowing, floating, simple
   - **stone guardian:** big, blocky, few joints, glowing eyes
   - The owner supplies reference sheets in `reference/`. If they're missing, propose 3 design sketches as images first.
3. **Large characters:** support scale and partial framing (a giant character that's only partly in shot) for the guardian and, later, the older dragon.

**Part A review:** close-ups of both creatures in all views and moods next to Ren and Yuki, plus their movement strips.

**Commit message:** `F8A: creature kit, forest spirit, stone guardian`

### Part B: dragons and the stranger
1. **Baby dragon:** chibi size, little wings that flap (it can hover briefly), a tail, curious and greedy-for-shiny moods.
2. **Older dragon:** huge. Mostly shown in partial framing (head and neck, an eye, a shadow or silhouette); slow, wise movements.
3. **The stranger:** a hooded, cloaked figure with the face hidden in shadow except glowing eyes or a glint. They glide, gesture and can vanish into mist. Their voice should be distinct, calm and mysterious.
4. Each creature needs a voice in `config/voices.json`, with samples for the owner to approve.
5. **Example:** `stories/creatures-demo.txt` (about 2 min).

**Acceptance:** all designs approved by the owner, the demo passes all checks, and R1 holds.

**Commit message:** `F8B: baby dragon, older dragon, the stranger`

---

## After F1–F8

1. Write the **lore bible** and the **Episode 1 script** in the story template.
2. Do a **production feasibility review:** list any line the engine still can't do and plan small additions.
3. Make **Episode 1** at about 6–8 minutes, review it, then produce Episodes 2–3 as one block.
4. Throughout, publish **independent Shorts** (F7) while the episodes are in production.
