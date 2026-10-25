# Kitsu Studio: Engine Foundation Roadmap (F1–F14), version 3

> **For Claude Code.** This is the implementation plan for upgrading Kitsu Studio into a production engine for the series **"Ren & Yuki: The Secrets Beyond the Enchanted Forest"**: 10 episodes of 8–10 minutes, plus Shorts.
> **Read first:** `HANDOFF.md` (the current engine, status and way of working) and `PRODUCTION-SYSTEM.md` (the three video formats).
> **Owner:** not a programmer, on Windows. They review every step from images and reports.
> **Version 3 (2026-10-26):** adds section 0.6 (audience and tone: a **family** show for kids **and** adults), F11 YouTube kit, F12 Expression pack, F13 Storytelling tools (weather, dreams, sound library), F14 Library growth, rule R15, and a new build order and milestones. The owner manages their own computers and branches; this roadmap doesn't set that up.
> **Version 3.1 (2026-10-26, owner):** F7 (vertical 9:16 and Shorts) moved to right after F11 (step 7), before F12; steps and milestones renumbered.
> **Version 2 (2026-10-25):** adds the big picture (section 0.5), the Asset Kit (F4, detailed in `ASSET-KIT.md`), the Studio App (F9, detailed in `STUDIO-APP.md`), the World system (F10), rules R12–R14 (including quick and full test levels), and a **build order** that no longer follows the F-numbers exactly.

---

## 0. How to use this file

1. **Do one step at a time, in the build order of section 2** (not in F-number order), in a fresh chat if possible. Start each session with:
   *"Read HANDOFF.md, PRODUCTION-SYSTEM.md and ENGINE-ROADMAP.md. Implement the next step in the build order (section 2) whose status is 'Not started'. Read its detail file if it has one."*
2. **Every feature has Part A and Part B.**
   - **Stop for the owner's review after Part A,** and again after Part B.
   - **Never start Part B, or the next feature, without explicit approval.**
3. **Commit Part A and Part B separately** after approval, using the commit message given in each section.
4. **When a feature is approved, update the status table (section 2)** and the "Current status" section of `HANDOFF.md`.
5. **If something in this file conflicts with the code,** the code is the truth. Explain the conflict, then adapt the plan.

---

## 0.5 The big picture: building a whole world, bit by bit

The goal is not a video maker with a fixed set of things. It's a **world-building studio**: every episode can add something new to the Ren & Yuki world, and once something exists, every later story can use it. Each feature in this roadmap fills one of four layers:

| Layer | What it holds | Built by |
|---|---|---|
| **1. Engine** | Drawing, movement, camera, sound, rendering, checks | F1 long episodes, F2 camera, F3 Rig 2.0, F6 effects, F7 vertical |
| **2. Library** | Everything that can appear in a story: characters, extras (simple animals), places, props, set pieces, voices, music moods, sound effects | F4 Asset Kit, F5 places and lighting, F8 creature kit |
| **3. World** | What is *true* in the world: who everyone is, where places are, which items exist, what happened in earlier episodes | F10 World system |
| **4. Studio** | How the owner works: editor, preview, rendering, Shorts, publishing files | F9 Studio App, F7 Shorts workflows |

**The growth loop**, which every new story follows:
1. Write the story using any names, even for things that don't exist yet.
2. The checker lists what's missing (F4).
3. Create the missing things with `/new-asset` or a picture (F4), or with a bigger feature if it's a new kind of thing.
4. The new thing joins the library and the world, and every later story can use it.

**When a story needs something no layer can do yet** (a new kind of action, a weather type, a new kind of effect), don't fake it in the story. Add it as a small, separate step to this roadmap, with Part A and Part B, in the same format.

---

## 0.6 Audience and tone: a family show

Ren & Yuki is for **kids and adults together**, like the best family films and animated series. The look stays cute and soft (STYLE-GUIDE.md); the **stories** can be deep.

| Kids enjoy | Adults enjoy | Never |
|---|---|---|
| Cute characters, funny moments, magic, clear feelings | Witty dialogue and wordplay, running jokes, real emotions (loneliness, fear, loss, courage, growing up), mystery and lore across episodes, foreshadowing and payoffs | Fighting or violence, gore, horror or jump scares, swearing, crude or mean-spirited humour |

What this means for the engine:
- **Real emotional range:** characters can be truly sad, scared, worried, determined or heartbroken, and the drawings, voices and music must support that convincingly, not only "cute" versions.
- **Atmosphere and stakes:** mystery, suspense, danger and big magic are welcome: dark caves, storms, ancient ruins, a mysterious stranger. Danger is shown through suspense, chases, hiding, puzzles and courage, never through fighting (R11).
- **Cinematic quality:** camera, lighting, music and timing should feel like a film, so adults stay for the whole episode.
- **Romance** between Ren and Yuki stays sweet and innocent.
- **YouTube:** whether a video is marked "Made for Kids" is the owner's decision for each video. The engine never assumes it.

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
| R11 | **No fighting or violence.** Danger is shown through suspense, chases, hiding, puzzles and courage. A family audience: suitable for kids, interesting for adults (section 0.6). No gore, horror, jump scares, swearing or crude humour. |
| R12 | **Everything new goes into a registry, never hard-coded.** Characters, extras, places, props, voices, music moods and sounds are each one entry or one file in their registry, found automatically. A story or the engine core must never contain a one-off drawing. This is what lets the world keep growing. |
| R13 | **One engine, many front ends.** The CMD tools (`check-story.bat`, `preview.bat`, `make-video.bat`) keep working forever. The Studio App (F9) and Claude Code skills only *call* the engine; they never copy its logic. |
| R14 | **Quick tests per step, full tests at milestones.** See "Test levels" below. Never render a long video just to test a single step. |
| R15 | **Built for a family audience** (section 0.6). Every feature must support both lighter and deeper storytelling: moods, music, lighting and effects need a convincing serious range (sad, scared, mysterious, epic), not only a cute one. When in doubt, show the owner both versions. |

### Test levels

**Quick test: every Part A and Part B stop.** Aim for under 15–20 minutes in total.
1. `--check` on every story (seconds).
2. **R1 by frames, not by videos:** compare the 12 frames per story and the timing data. Don't render the old stories as full videos.
3. **One short demo story, 1–2 minutes long,** that uses the new feature. Render it in full and run all 10 checks on it. The demo stories in this roadmap (camera-demo, treasure-demo and so on) must be kept to **2 minutes or less**.
4. Stills and frame strips for the visual review.
5. Reuse the voice cache. Never delete `cache/` to test.

**Full test: at each milestone only.** A milestone comes every 3–4 steps of the build order:
- **Milestone 1:** after F2, F4 A–C and F9 A (build-order step 5)
- **Milestone 2:** after F11, F7, F12, F3 and F4 D (step 11)
- **Milestone 3:** after F13, F5 and F6 (step 15)
- **Milestone 4:** after F9 B, F10 and F8 (step 19)

At every milestone, also render one of the owner's real stories (ask which one) as a real-world test.

A full test means:
1. Render **every** example story in `stories/` as a full video. All 10 checks must pass on each.
2. Render the 12-minute stress test (`stories/test-12min.txt`) and report the time and memory.
3. Do R1 by frames against the commit from the previous milestone.
4. Write a short milestone report: what passed, what failed, the render times.

**Exception:** if a step changes rendering itself, audio, the voice step or the joining of chunks, also render the 12-minute test at that step. Some problems only show up in long videos. Say so in the review package.

**Review package**, included at every stop:
1. a summary of what changed
2. the R1 result
3. the `--check` results
4. the video report or reports
5. the image paths
6. open questions and decisions you made yourself

**How the rules are checked (tools added during F1 and F2):**
- **R1:** `node tools/compare-engines.js` compares every story in `stories/` against the last commit: the timing plan and 12 frames pixel by pixel (R14: no full videos). `--only <story>` checks one story. `--sound` also compares the music and effects soundtrack (slow on long stories; use it when a step changes audio). Soundtracks count as the same when no sample differs by more than 2 in 32768, because the browser's reverb is not bit-exact between runs (about -100 dB).
- **R3, one check changed with the owner's approval (2026-10-25):** "No sudden volume changes" fails only above **2.5 LU** (it was 2.0). Moments between 2.0 and 2.5 are listed in the report as a NOTE, so they stay visible. **Why:** the owner's new voices (Ren `am_puck`, Yuki and narrator blends) are livelier, and in long, dialogue-heavy stories a loud word after a quiet moment reaches about 2.5 LU. The owner listened to the loudest such moment (a 10-second clip from the 12-minute test) and found it fine. At the same time, every voice line got volume-matching and a soft start, and place sounds became half as loud at night and under calm or bedtime music.
- **R4:** frames are drawn by the browser in software mode (`tools/browser.js`, `launch({ exact: true })`), because drawing with the graphics card is not pixel-repeatable. `make-video` always uses this mode.

---

## 2. Status and build order

Work through the steps **in this order**. The F-numbers are names, not the order. **Carry over the real commit hashes** from the previous version of this table.

| Step | Feature | Status | Commit(s) |
|---|---|---|---|
| 1 | F1 Long episodes (scenes, music moods, chapters, fast rendering) | Done | `7ff0e59` (F1A), `97a1ecd` (F1B) |
| 2 | F2 Camera and editing | Done | `a2ca81a` (F2A), `87030e1` (F2B) |
| 3 | F4 Asset Kit, Parts A–C (`ASSET-KIT.md`) | Done | `272fba8` (F4A), `5dcf1ef` (F4B), `2ca0af5` (F4C) |
| 4 | F9 Studio App, Part A (`STUDIO-APP.md`) | Done | `4b1cf13` (F9A) |
| 5 | **Milestone 1** (full test) | In progress | |
| 6 | **F11 YouTube kit** (thumbnails, subtitles, description, series intro, end screen) | Done (approved) | `b86d4fb` (F11A), F11B (see git log) |
| 7 | F7 Vertical 9:16 and Shorts (reuses F11's thumbnails, subtitles and description) | Not started | |
| 8 | **F12 Expression pack** (new moods, thought/whisper/shout bubbles, mood voices) | Not started | |
| 9 | F3 Rig 2.0 (joints, movement library, lip-sync), in **4 review stops** | Not started | |
| 10 | F4 Asset Kit, Part D: prop acting, Season 1 props, extras landing on set pieces (needs F3) | Not started | |
| 11 | **Milestone 2.** The owner then makes the real **Episode 1** | Not started | |
| 12 | **F13 Storytelling tools** (weather, dreams and memories, sound library) | Not started | |
| 13 | F5 Lighting and indoor places (cave kit, inside the cottage) | Not started | |
| 14 | F6 Magic and comedy effects | Not started | |
| 15 | **Milestone 3** | Not started | |
| 16 | F9 Studio App, Part B (voices, library, videos, Shorts screens) | Not started | |
| 17 | F10 World system | Not started | |
| 18 | F8 Creature kit (new main characters) | Not started | |
| 19 | **Milestone 4** | Not started | |
| always | **F14 Library growth:** new places, animals and props in batches, between steps, when the owner's stories need them | Ongoing | |

**Why this order:**
- **F11 first,** because the owner is uploading now and needs thumbnails, subtitles, an intro and an end screen.
- **F7 right after F11** (owner's decision, version 3.1), so Shorts can be published early. F7 reuses F11's thumbnail, subtitles and description and only adds what's vertical: the 9:16 layout, the safe area and the vertical cover frame.
- **F12 before F3,** because new moods and bubbles (and a serious emotional range, section 0.6) help every story right away. F3 must keep everything F12 adds (F3 Part A review shows every mood, including the new ones). F12's new bubbles must also work in vertical format (F7).
- **Milestone 2 before Episode 1,** so the episode is made with all the acting it needs.

All work is committed on the git branch `Improvment` (never directly on `main`).

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

### As built (changes and decisions made during F1, approved by the owner)
- **Scenes:** lines before the first `scene:` line become an opening scene named after the story title. When a scene's first lines change the place, its `time:` switches while the page is white, instead of the usual 4-second sky change.
- **Music:** before the first `music:` line of a story that uses moods, the music is `happy` (the classic tune). Stories without `music:` lines keep the classic music code exactly.
- **Rendering:** chunks are scenes, and long scenes are split into pieces of at most 60 s. Frames are captured in the page (`toDataURL`) and encoded with x264 `veryfast` at CRF 18: twice as fast as `medium`, and it looks the same on flat cartoon colours (SSIM 0.997). `resume-video.bat` was added for the owner, and the soundtrack is also kept on `--resume` when nothing changed. If Playwright's browser can't be installed, `tools/browser.js` uses the installed Chrome or Edge.
- **Measured on the owner's laptop** (Intel i3, 2 cores, 8 GB): 3 workers draw about 1.4× faster than 1 and about 2.5× faster than the old method; an 11-minute episode renders in about 30 minutes; peak memory about 2.1 GB.
- **Sound (owner-approved change to every story's soundtrack):** the music comes up a little in the pauses between lines and dips under speech, so long episodes pass the "No sudden volume changes" check. The final music fade-out is curved, and the star's "arrival" chime is softer. Pictures and timing of existing stories did not change.
- **`stories/test-12min.txt`** ended up at about 11 minutes and about 200 lines, with no `wait` lines (a pause before a loud line trips the volume check).

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

**As built (F2A):**
- A shot without `on …` frames whoever acted or spoke last (a wide shot frames everyone). Shots follow moving characters smoothly. Moves in a row build on each other (e.g. `pull out` then `follow`).
- The old `camera: wide | close | closer` lines are unchanged in stories without shots; in stories with shots they glide like the new moves.
- **Over the shoulder is a 2D trick** until F3 adds a back view: the shoulder character is drawn big, soft and darker at the frame edge, turned toward the other character.
- Speech bubbles in shots shrink with the zoom and try spots beside or above the speaker before the frame corners; they never cover a face, and the tail stops before the face.
- **R10:** stories with shots draw about 15% slower. The camera's own work is about 1%; the rest is close-ups painting more pixels. Stories without shots are not affected.
- Example story: `stories/test-camera.txt`.

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

**As built (F2B):**
- Automatic editing rules: wide for entrances, walks, exits, hugs and the narrator; a medium two-shot to start a conversation; a close-up on each new speaker; a 1-cut reaction shot of the listener after a surprised, shy or sad line; never more than about one cut a second. A manual shot or camera line holds until the next character line has been spoken, and no automatic cut lands less than 1 s before a manual one.
- `slow motion N` stretches everything the next action creates so it takes about N seconds (never faster than normal), with a soft dreamy glow. `beat` is a 0.6 s pause.
- `reveal: the star` frames the star together with everyone watching it; `reveal: <name>` pushes in close; `reveal: <place>` turns the page if needed, then pulls back from the characters to the whole place. A gentle magical swell plays under every reveal.
- In a shot of one character, nobody else's face is ever half in the frame (it is slid fully in or fully out). In an extreme close-up this wins over look room.
- Acceptance: a face check (`StudioFilm.faces(t)`) over the whole demo, every 0.1 s: no face cut off in any framed shot.
- **Voices (owner-approved):** every voice line is volume-matched to -22 LUFS with a 0.4 s soft start (also the owner's recordings), and place sounds are half as loud at night and under calm or bedtime music. The volume check limit became 2.5 LU (see section 1).
- Demo: `stories/camera-demo.txt` (97 s).

---

## F3: Rig 2.0 (joints, movement library, lip-sync)

> **Review stops:** because F3 is big, stop for review **four times**: (1) skeleton with the design unchanged, including every mood from F12; (2) springy ears, tail and scarf, plus the back view; (3) the movement library; (4) lip-sync. At every stop, show side-by-side pictures: old | new | reference sheet.

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
   - **Needed by Episode 1:** `<name> crouches` and `<name> stands up` (from a crouch), `<name> counts on its paws`, `<name> writes in the air`, `<name> holds out its paw`, `<name> touches paws with <name>`, `<name> wobbles` (a small loss of balance, then recovers), `<name> stretches its paws wide`, `<name> leans closer`
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

## F4: Asset Kit (replaces the old "Prop system")

**Goal:** when a story needs something new, such as a house, an animal, an object or a place, adding it is quick and easy. The checker lists what's missing, placeholders allow a preview straight away, and each missing thing is created with a picture or the `/new-asset` Claude Code command.

**The full specification is in `ASSET-KIT.md`.** It has four parts:
- **Part A:** asset registry, missing list, placeholders (`F4A`)
- **Part B:** picture drop-in for props, extras and places (`F4B`)
- **Part C:** style guide, `/new-asset` skill, first four assets (`F4C`)
- **Part D:** prop acting, the Season 1 props, and extras landing on set pieces (fence, roof, branch). **Do this after F3.** (`F4D`)

It includes everything the old F4 promised: the prop registry, the Season 1 starter props, the prop actions and the error messages.

---

## F5: Lighting and indoor places (cave kit)

> **Uses the Asset Kit (F4):** new caves and indoor places are registered as places, and cave objects as props or set pieces. Don't build a separate list.

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

**Goal:** publish Shorts while episodes are being made (see `PRODUCTION-SYSTEM.md`, sections 3–5). Build-order step 7, right after F11: it **reuses F11's thumbnail, subtitles and description** (as vertical versions) instead of making its own.

### Part A: vertical rendering
1. `format: vertical` (or `--format vertical`) renders 1080×1920.
2. **Vertical layout per place:** a taller composition with more sky and more foreground, not a crop.
3. **Camera framing for vertical:** medium or close, centred on the characters, and pairs stand closer.
4. **Safe area:**
   - Keep faces, bubbles and captions out of roughly the bottom 20%, the right 15% and the top 8%.
   - Add a safe-area check to the report.
5. **Bubbles and captions** are narrower (about 700 px wide), and title cards are scaled down.

**Part A review:** every place in vertical format with both characters (day and night), including the cottage garden, plus a vertical version of `sorry-yuki` with the safe-area check passing.

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
3. **Outputs:** reuse F11 (thumbnail, subtitles, description). Add a **vertical cover frame** (1080×1920) for Shorts.
4. **Length checks:** 15–60 s for Shorts, with a warning outside that range.
5. **Examples:**
   - `shorts/the-last-cookie.txt` (independent)
   - `episodes/demo/shorts/s01.txt` (taken from the 12-minute test; F7 comes before the cave kit in F5)

**Acceptance:** both example Shorts pass all checks, including safe area and length, and R1 holds for landscape stories.

**Commit message:** `F7B: independent and episode Shorts, thumbnails, subtitles`

---

## F8: Creature kit (new characters)

> **Uses the Asset Kit (F4):** a simple creature can start as an *extra* and be upgraded to a full character here, keeping its name and voice.

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

## F9: Studio App (the browser front end)

**Goal:** the owner does everything in a web browser on their own computer instead of CMD: write, check, preview, render, and manage voices, assets and videos.

**The full specification is in `STUDIO-APP.md`.**
- **Part A** (build-order step 4, done): editor, live check, preview and render with progress.
- **Part B** (build-order step 16): voices, library, videos and Shorts screens.

---

## F10: World system (world bible, continuity, series memory)

**Goal:** the engine knows what's *true* in the Ren & Yuki world, so a whole season stays consistent, and each episode can build on the last.

### Part A: the world as data
1. **A `world/` folder** of simple text files the owner can read and edit in Notepad:
   - `world/characters/<name>.txt`: who they are, personality, how they talk, catchphrases, likes and fears, relationships, voice. This links to the registry entry; it doesn't replace it.
   - `world/places/<name>.txt`: what the place is like, what's near it, which places connect to it, its secrets.
   - `world/items/<name>.txt`: important story items (the golden coin, the legendary sword): what they do, who has them.
   - `world/lore.txt`: the rules of the world (magic, history, the Enchanted Forest's secrets).
   - `world/season-1.txt`: the episode list, each with a one-line summary, its status and its story file.
2. **Every name in a world file must exist in the library,** or be marked `planned`. `--check` warns about mismatches, e.g. *"world/items/golden-coin.txt: there is no prop called golden coin yet."*
3. **`world-check.bat`** checks the whole world folder and lists everything that's planned but not built, by episode. This is the to-do list for the season.

**Part A review:** the world folder filled in for Season 1 from the owner's series bible, with the `world-check` output.

**Commit message:** `F10A: world bible as data, world-check`

### Part B: continuity and series memory
1. **Episode start and end state:** each episode's plan records the state at the end: who holds which item, which places are discovered, which doors are open, relationships. The next episode can start from that state with `continues: e01`.
2. **Continuity checks:** for example *"Line 40: Ren gave the golden coin to Yuki in Episode 2, but Ren is holding it here."* or *"The stone door was opened in Episode 3, but it's closed here."* These are warnings the owner can accept, never hard errors.
3. **Recaps:** `recap: e01-e02` creates a "Previously on Ren & Yuki" opening from scenes marked `recap: yes` in earlier episodes, re-rendered with a short narration.
4. **Story helper (optional):** a Claude Code skill `/draft-episode` that reads the world folder and the episode summary and writes a first draft in the story language, with the missing-assets list. **A human always edits the draft.**

**Acceptance:** two short linked test episodes, where the second continues from the first. Show a deliberate continuity mistake being caught, and a recap that passes all checks.

**Commit message:** `F10B: continuity, series memory, recaps`

---

## F11: YouTube kit

**Goal:** everything needed to upload a video comes out of `make-video.bat` and the Studio App, ready to use.

### Part A: thumbnails, subtitles, description
1. **Thumbnail:** `<name>-thumbnail.jpg`, 1280×720, under 2 MB.
   - Choose the moment with `thumbnail: 12.5` (seconds) or `thumbnail: scene 3` (the middle of that scene), or `thumbnail: auto`: pick a frame where both characters are fully visible, facing front, with a happy or surprised mood, and no speech bubble.
   - `thumbnail text: The Owl's Lantern`: big, bold, readable text in the series style (rounded font, warm outline), placed where it doesn't cover faces.
   - The frame is re-rendered at 1280×720, not taken from the video, so it's sharp. Without any `thumbnail` line, use `auto`.
2. **Subtitles:** `<name>.srt` (English) from every voice line, including the narrator, timed to the real voice clips. Long lines are split into readable parts (at most 2 lines of about 42 characters each). Speaker names are not included.
3. **Description draft:** `<name>-description.txt` containing:
   - a draft title (under 70 characters) and a 2–3 sentence summary from the story
   - the chapters (from F1), if any
   - credits (from the Asset Kit credits file)
   - 3–5 suggested hashtags
   - a reminder line for the owner: *"Check YouTube's 'altered or synthetic content' and 'Made for Kids' settings before publishing."*
   - It's a draft for the owner to edit, never published automatically.
4. **Studio App:** the "render done" screen shows the thumbnail, and buttons to open the subtitles and copy the description.
5. **Check:** the report notes whether the thumbnail, subtitles and description were written, and warns if the thumbnail has a speech bubble or a face cut off.

**Part A review:** the thumbnail (auto and with text), the .srt opened next to the video, and the description for `stories/the-owls-lantern.txt` (ask the owner for their latest version of it).

**As built (F11A, with the owner's review changes):**
- The thumbnail is drawn with its own framing, a **medium shot** by default (the characters fill about 55% of the height, standing below the title); `thumbnail shot: wide | medium | close` chooses. Auto prefers surprised or excited faces, eyes open, nobody in front of a face, and skips moments where a prop is still appearing. The title is measured first, so the framing leaves room for one or two lines.
- `--youtube` makes only the three files (no video), for quick tests. A full render adds a "YouTube files" line to the report (NOTE, or WARN for a bubble or a cut-off face).
- In the studio app's player the subtitles start **off** (the narrator's words are already on screen); CC turns them on.
- Review story: `stories/youtube-demo.txt` (39 s, all checks pass). The owner's `beginning-of-a-friendship.txt` was not in the project yet.

**Commit message:** `F11A: thumbnails, subtitles, description draft`

### Part B: series intro and end screen
1. **Series intro:** `intro: series` (also the default for stories in `episodes/` and `shorts/` once approved; `intro: none` turns it off).
   - About **5 seconds**: the "Ren & Yuki" logo bounces in letter by letter (like the title card) over a soft meadow background. Ren and Yuki peek in and wave.
   - A short, catchy **theme jingle**, made by the engine like the music (no outside music), the same in every video.
   - The intro comes **after** the story's first few seconds if the story starts with a hook scene (`intro: after scene 1`), so viewers see the hook first.
2. **End screen:** `ending: end screen` adds the last **20 seconds**:
   - Ren and Yuki on one side, waving and looking happy, with calm music.
   - Empty space laid out for YouTube's end-screen elements: two video boxes and a subscribe circle, following YouTube's end-screen template (see `docs/youtube-end-screen.png`, which Part B also draws as a guide).
   - An optional narrator line, e.g. `ending text: See you next time!`
3. **Checks:** all 10 checks still pass with the intro and end screen. Loudness stays even (the jingle isn't louder than the story).
4. **Docs and example:** STORY-GUIDE.md section "YouTube", plus a short example `stories/youtube-demo.txt` (under 1 minute, with a hook scene, intro, end screen and thumbnail).

**Acceptance:** the demo passes all checks, R1 holds for stories without the new lines, and the owner approves the intro and jingle.

**As built (F11B):**
- The intro (5 s) and the end screen (the last 20 s) take their time in the story's timeline (story.js), so everything after them simply starts later; while they play, film.js draws them over the story (Ren and Yuki posed directly, so both appear even in a Ren-only story). `intro: after scene N` works for any scene. `ending text:` is a narrator line (its voice, caption and subtitle are made like any other).
- Sound: the story's music fades out and the place's sounds go down to 30% under the jingle (music box and pads, 0.55 of the music bus). Measured on `stories/youtube-demo.txt`: intro -19.7 LUFS, story -18.8 / -20.0, end screen -22.0.
- `docs/youtube-end-screen.png` is drawn by `tools/end-screen-guide.js` from the engine's own end screen.
- **Loud starts (owner's decision):** a voice line that comes in much louder than what plays just before it (the owl's "Hoo!" after a quiet moment reached 2.79 LU) gets a softer first second. make-video measures it in the mix itself, the way the check does (the rise as the line starts, and the drop 3 s later as it leaves the 3 s window); only lines over 2.3 LU are softened, and the soundtrack is made again. Every other line stays exactly as it was. The owl's voice is also 2 dB quieter (`"gain": -2` in `config/voices.json`, a new optional setting per voice).
- **Butterflies and fireflies go around faces** (thumbnails and video): the film tells the place where the faces are, and `util.clear(x, y)` moves anything small flying in front of the characters out to the edge of a face. Only frames where an insect was on a face change (R1: a few frames in asset-test, ren-and-the-sleepy-star, test-12min, test-scenes and the-fallen-star, checked: only fireflies moved off faces).
- The end screen has soft cream panels without outlines (an edge would peek out from under YouTube's elements); the guide picture marks them in red.

**Commit message:** `F11B: series intro, theme jingle, end screen`

---

## F12: Expression pack

**Goal:** stories can show many more feelings and ways of talking.

### Part A: new moods
1. **Eight new moods for Ren and Yuki,** in every view (front, three-quarter, side, both directions), drawn to match the reference sheets' style:
   - `excited`: sparkly eyes, big open smile, ears up, a little bounce
   - `proud`: chest out, chin up, confident smile, eyes half closed
   - `thinking`: eyes looking up to one side, a paw at the chin, small mouth
   - `worried`: raised inner brows, small wobbly mouth, ears half down
   - `scared`: wide eyes with small pupils, ears flat back, body leaning away, a small tremble (for suspense, never horror)
   - `determined`: firm brows, steady eyes, a small confident set mouth, ears up (for courage moments)
   - `laughing`: eyes closed in happy curves, wide open smile, the body shakes gently
   - `crying`: glossy eyes with tears running down, a wobbly mouth. It should feel truly sad in a serious moment, without being distressing
2. These work everywhere moods work: `ren (excited): …`, `ren feels proud`, `ren and yuki feel worried`.
3. **Extras** fall back to their nearest mood (e.g. `laughing` → `happy`), with a note in `--check`.
4. **Sounds:** `laughing` adds a soft giggle sound. Optional, and it must pass the loudness checks.

**Part A review:** a mood sheet for both characters showing every mood (old and new) in all views, next to the reference sheets. Include a serious test: the same sad, scared and determined lines shown in a dark, dramatic scene, to show they work for older viewers too.

**Commit message:** `F12A: eight new moods`

### Part B: ways of talking, and voices that follow the mood
1. **Bubble styles** (they can be combined with a mood: `ren (shouts, excited): …`):
   - `ren (thinks): …`: a cloud-shaped thought bubble with little circles leading to the head. The voice is softer, with a gentle echo. `(thinks silently)` shows the bubble with no voice, held long enough to read.
   - `ren (whispers): …`: a smaller, softer bubble with a dashed outline; the voice is quieter and breathier.
   - `ren (shouts): …`: a big spiky bubble; the voice is a little louder and faster, and the camera does a tiny shake. It stays within the loudness checks.
2. **Mood voices:** each mood slightly changes the voice's speed and pitch (e.g. sad: slower and a little lower; excited: faster and a little higher; scared: a little faster and breathier; determined: steady and slightly lower; sleepy: slow).
   - The amounts live in `config/voices.json` as defaults that can be changed per character.
   - The voice cache key includes the mood, so changed lines are remade and others aren't.
   - **Existing stories:** this changes how existing mood lines sound, so it's **off by default** for stories that already exist (`mood voices: on` turns it on). New stories made from the template have it on. Ask the owner whether to turn it on everywhere.
3. **Music range for a family audience (section 0.6):** add `music: epic` (big, brave, for courage and great discoveries) and `music: heartfelt` (warm and emotional, for big feelings). Let `tense` and `sad` reach a deeper, fuller, more dramatic sound when a scene needs it, while staying away from horror. Update STORY-GUIDE.md's music table (e.g. `tense` is no longer described as "never scary", just "suspense, never horror").
4. **Docs and example:** STORY-GUIDE.md sections "Moods" and "Ways of talking", plus `stories/feelings-demo.txt` (about 90 s) using every mood and bubble style, with one funny scene and one serious, emotional scene.

**Acceptance:** the demo passes all checks, R1 holds, and the owner approves the voice samples (one line in each mood, for Ren and Yuki).

**Commit message:** `F12B: thought, whisper and shout bubbles, mood voices`

---

## F13: Storytelling tools (weather, dreams, sound library)

### Part A: weather
1. **Lines:** `weather: rain`, `light rain`, `snow`, `wind`, `fog`, `clear`. They can be set at the start of a scene or changed in the middle (a smooth change over about 3 s).
   - **Rain:** falling drops in layers (near drops bigger and faster), splashes on the ground, puddles that slowly appear, a softer and greyer sky. Characters get a light shine.
   - **Snow:** gently falling flakes in layers; in non-snowy places, a thin white layer slowly builds on the ground.
   - **Wind:** leaves and petals blowing across, trees and grass bending more, ears and scarf blowing (with F3's springs).
   - **Fog:** soft layers that hide the far background.
   - `rainbow appears` / `rainbow disappears`: a soft rainbow over the place, best after rain.
2. **Works in every place and time of day,** including night (moonlit rain and snow). Weather never covers faces or bubbles.
3. **Sound:** each weather has its own soft ambient sound (rain patter, wind gusts, quiet snow hush) that cross-fades like place sounds. A far-off, gentle thunder rumble is allowed with `thunder` but **no bright flashes** (avoid flashing images for viewers' safety).
4. **Umbrella:** create the `umbrella` prop with `/new-asset` (open and closed), so `yuki holds the umbrella` works after F4 Part D.

**Part A review:** every weather in two places at day and night (stills), plus a 6-frame strip of each.

**Commit message:** `F13A: weather and rainbow`

### Part B: dreams and memories, sound library
1. **Dreams and memories:**
   - `dream begins` … `dream ends`, and `memory begins` … `memory ends`.
   - **Look:** a dream has soft pastel colours, a gentle vignette and floating sparkles; a memory has a warm sepia look and a soft frame. The transition into and out of them is a gentle wobble (about 1 s) with a dreamy music sting.
   - Anything can happen inside: a different `place:`, `time:`, weather, props or characters. When it ends, everything returns to exactly how it was before it started.
   - Episode 1 uses this for Ren imagining his big expedition.
2. **Sound library:** `sound: <name>` plays a sound at that moment (it can be combined with `+`).
   - About 30 sounds to start: door creak, knock, giggle, gasp, yawn, snore, sneeze, tummy rumble, splash, plop, pop, whoosh, swish, chime, bell, footsteps on wood, rustle, crunch, bird call, owl hoot, frog croak, cricket, raindrop, wind gust, drumroll, ta-da, slide whistle, sparkle, magic shimmer, page turn.
   - Make them with the engine's synthesizer where possible. Any recorded sound must be **CC0 (public domain)**, kept in `assets/sounds/` with its source and licence, and listed in the credits file.
   - A sound registry (R12), so new sounds are one file each. The Studio App's suggestions list every sound.
   - Unknown sounds go on the missing list like assets.
3. **Checks:** the sound-effect check covers `sound:` lines; loudness checks still pass.
4. **Docs and example:** STORY-GUIDE.md sections "Weather", "Dreams and memories" and "Sounds", plus `stories/rainy-day-demo.txt` (about 2 min) with rain, a rainbow, a dream and several sounds.

**Acceptance:** the demo passes all checks, R1 holds, and a story's state after `dream ends` is shown to be identical to before `dream begins`.

**Commit message:** `F13B: dreams and memories, sound library`

---

## F14: Library growth (ongoing)

**Goal:** the world grows in batches as the owner's stories need it, using `/new-asset` (Asset Kit Part C), with a review sheet and the owner's approval for each asset.

**How:** between roadmap steps, when the owner asks (usually with a story or a missing-assets list), create the batch, one review stop per asset, one commit per asset (`Add asset: <name>`).

**Season 1 wish list** (create only when a story needs them; the owner chooses the order):
- **Home places:** Ren's den, Yuki's burrow; inside the cottage (needs F5)
- **Adventure places:** lake, cave entrance, mountain path, village market, the Enchanted Forest gate, rainbow forest
- **Animal friends (extras):** squirrel, hedgehog, frog, butterflies, fish, songbirds
- **Props:** picnic basket, apple, cookie, umbrella, kite, ball, backpack, map, book, blanket, bunch of flowers, leaf (Episode 1)

---

## After the roadmap

1. The roadmap is a living document. When a story needs something new, add a small step here (see section 0.5) rather than faking it.
2. Produce Episodes 2–3 as one block, then keep the cycle going: **write → missing list → create → check → render → publish.**
3. Throughout, publish **independent Shorts** (F7) while the episodes are in production.
