# Kitsu Studio: Handoff

> **For Claude Code.** Read this first in every new session, then `ENGINE-ROADMAP.md` (and the detail file of the next step, if it has one).
> **Owner:** not a programmer, on Windows. They review every step from images and reports, and approve each part before it's committed.

## What this project is

Kitsu Studio turns a story written as a plain text file into a finished animated video (1920×1080, 30 fps) starring **Ren** the fox and **Yuki** the bunny, with narration, character voices, music, sound effects and speech bubbles. It is being built into a production engine for the series **"Ren & Yuki: The Secrets Beyond the Enchanted Forest"** (10 episodes of 8–10 minutes, plus Shorts).

- How to use it: `README.md`. Every story line: `STORY-GUIDE.md`.
- The plan: `ENGINE-ROADMAP.md` (version 3.1), with the detail files `ASSET-KIT.md` (F4) and `STUDIO-APP.md` (F9).

## How the engine works

| Part | Files |
|---|---|
| Story language: parsing and timing | `engine/story.js` (story lines → a timed plan) |
| Characters | `engine/characters.js` (registry), `engine/ren.js`, `engine/yuki.js` (approved designs: rule R6) |
| Places | `engine/places/` (one file each, list in `index.js`) |
| Drawing each frame, camera, bubbles | `engine/film.js` (deterministic: depends only on the time `t`) |
| Music, sound effects, voice mixing | `engine/audio.js` (Web Audio; music moods; music fills the pauses between lines) |
| The main command | `tools/make-video.js` (voices → plan → soundtrack → frames → MP4 → checks), behind `make-video.bat`, `check-story.bat`, `preview.bat`, `resume-video.bat` |
| Rendering | `tools/render.js` (several browser pages at once, scene chunks, `--resume`), `tools/browser.js` (software drawing, so frames are pixel-repeatable) |
| Checks | `tools/validate.js` (the 10 video checks), `tools/scenes.js` (scene checks and YouTube chapters) |
| Voices | `tools/tts.py` (Kokoro, offline), `config/voices.json`, voice cache in `cache/voices/` |

## Way of working

1. Follow the **build order** in `ENGINE-ROADMAP.md` section 2, one part at a time, and **stop for the owner's review** after every part, with the full review package (roadmap section 1).
2. **Never commit to `main`.** Commit only on the branch **`Improvment`**, and only after the owner approves, with the roadmap's commit message.
3. Test as rule **R14** says: a quick test at every review stop (`--check` on every story; R1 with `node tools/compare-engines.js`, which compares 12 frames and the timing of every story with the last commit; one demo of 2 minutes or less, rendered with all checks). Full renders of every story and the 12-minute test only at milestones, or when a step changes rendering, audio, voices or chunk joining.
4. Look at your own stills before showing the owner (R7). Put review images in the session's scratchpad and give their full paths.
5. Keep messages to the owner short, simple and friendly.

**Owner-approved exceptions to the rules:** the "No sudden volume changes" check fails only above 2.5 LU (was 2.0), with 2.0–2.5 shown as a NOTE. Approved 2026-10-25 after the owner listened to the loudest moment of the 12-minute test; the reason is the livelier new voices. Details in `ENGINE-ROADMAP.md` section 1.

**Audience and content (roadmap section 0.6, rules R11 and R15):** Ren & Yuki is a **family show, for kids and adults together**. The look stays cute and soft; the stories can be deep: real emotions (loneliness, fear, loss, courage, growing up), mystery and lore across episodes, suspense, danger and big magic, witty dialogue and running jokes. **Never:** fighting or violence, gore, horror or jump scares, swearing, crude or mean-spirited humour. Danger is shown through suspense, chases, hiding, puzzles and courage. Romance between Ren and Yuki stays sweet and innocent. Every feature needs a convincing serious range (sad, scared, mysterious, epic), not only a cute one; when in doubt, show the owner both versions. Whether a video is "Made for Kids" on YouTube is the owner's choice for each video; the engine never assumes it.

**Notes about the owner's computer:** an Intel i3 laptop with 2 cores and 8 GB of memory that slows itself down when hot, so speed measurements vary a lot; compare runs side by side. Playwright's own browser could not be downloaded there, so the installed Chrome is used automatically.

## Current status

- **Next step:** see the **build order in `ENGINE-ROADMAP.md` section 2**. The first step there whose status isn't "Done" is the one to work on.
- Done: **F1, F2, F4 Parts A–C and F9 Part A** (build-order steps 1–4). The first four assets are the lantern, cottage, cottage garden and owl; the studio app starts with `Kitsu Studio.bat` (code in `studio/`, tests in `studio/tests/`).
- **Milestone 1** (step 5) was cut short by the owner (2026-10-26: "I don't want to render any story"): 4 stories were rendered in full before it was stopped (a-sunny-hello, a-trip-around, asset-test, camera-demo), all checks passed. The rest of the full test, the 12-minute test and a real story are still to do when the owner wants them.
- **F11 Part A** (thumbnails, subtitles, description draft) is done and approved. **F11 Part B** (series intro, theme jingle, end screen) is done and approved. **F7 Part A** (vertical 9:16, safe area) is done and approved. **F7 Part B** (Shorts: `type: short`, `type: episode short` in `tools/shorts.js`, cover frames, Short length check; examples in `shorts/`) is done and approved.
- **F12 Part A** (eight new moods, mood sheet tool) is done and approved. **F12 Part B** (thought, whisper and shout bubbles, mood voices, epic/heartfelt/deep music, `stories/demos-and-tests/feelings-demo.txt`) is done and approved. **F3 Rig 2.0** has started: stop 1 (the skeleton, look unchanged) is done and approved; stop 2 (springy ears, tail and scarf, back view, `turns away`) is done and approved; stop 3 (movement library) is under way: clean turns (one blink per turn, owner's review) and the Episode 1 and 2 actions are done and approved; the second round (runs, sneaks, crawls, jumps, frights, trips, falls and gets up, lies down, hides behind and peeks out, shrugs, covers its eyes, stretches, yawns, sighs, dances) is done and waiting for the owner's review; climbing, jumping over, pushing and hiding behind props wait for ledges and props (F4 Part D, F5). Stop 4 (lip-sync: 8 mouth shapes per frame from the line's phonemes and the clip's loudness, `engine/lipsync.js`) is done and waiting for the owner's review. The movement demo (`stories/demos-and-tests/movement-demo.txt`, hide and seek, 2 min 37 s, all checks pass) finishes F3.
- **F4 Part D** (build-order step 10) has started: stop 1 (picking up, holding, carrying, giving, putting down and dropping props; the leaf, map and cookie; Ren really carries the lantern in Episodes 3 and 4) is built and waiting for the owner's review. Stop 2 has started: the Season 1 episode assets (Great Tree, full moon, fruit tree, fruit, grey owl, Dark Cave) and the other Season 1 props (Starfang the legendary sword, which glows only for Ren; coin, treasure chest, pile of gold, ancient book, orb, stone door, lever, pebble, umbrella, flower) are built and waiting for the owner's review; the rest of stop 2 next (see ASSET-KIT.md Part D), then Milestone 2.
- **Stories written:** Season 1, Episodes 1–7, in `stories\episodes\` (the owner's arc; the plan, the decisions and the explorer's rules are in `stories\episodes\season-1-plan.md`): 1 The Beginning of a Friendship, 2 Into the Forest, 3 The Light in the Deep Forest, 4 The Great Tree, 5 The Hungry Road, 6 Ren, Wake Up!, 7 The Cave Nobody Enters (cliffhanger; Episode 8 starts inside the Dark Cave). Episodes 3–7 have every asset they need (the Great Tree, the full moon, the fruit tree and fruit, the grey owl and the Dark Cave were made in F4 Part D stop 2). The earlier drafts "The Old Lantern" and "The Star Who Waited" are in `stories\early-stories\`. Shorts in `shorts\episode-shorts\` (two per episode, `ep1-1-…` to `ep7-2-…`) and `shorts\standalone\` (21 Shorts, numbered in the order to post them: 1–4 are on YouTube already, The Compliment did best, so the next ones follow its style: Ren's pride and Yuki's last word).
- **YouTube channel art:** `channel\` (made by `node tools\channel-art.js`).
- `PRODUCTION-SYSTEM.md` (the three video formats, workflows and family-audience content guidelines) is in the project root.

## Open items (where the last session stopped, 2026-10-30)

Waiting for the owner's answer or review:
- **The sword's name:** called **Starfang** for now (in `engine/props/sword.js` names and `STORY-GUIDE.md`); the owner may want another legendary name.
- **The brown owl's faces:** offered to give `engine/extras/owl.js` its own worried, scared and thinking faces (like the grey owl's `moods`), so Episode 3's notes ("the owl has no worried face") go away. Not started; waiting for a yes.
- Everything from F3 stop 3 round two, F3 stop 4 and F4 Part D stops 1–2 listed above as "waiting for the owner's review".

Approved on 2026-10-30: the **forest path** and the new lines `<name> walks down the path` / `<name> comes up the path` (Ren and Yuki walk into the distance along a place's `trail`; `engine/places/index.js` `trailOf`/`trailAt`). The path is used in Episode 5 (after Ren gives Yuki the map) and at the end of Episode 6.

**The owner's decision (2026-10-30): F5 (dungeons and caves) comes next**, before the rest of F4 Part D and Milestone 2, so Episode 8 onwards can happen underground. F5 Part A (light and darkness) is built and waiting for the owner's review (`stories/demos-and-tests/light-demo.txt`); then Part B with the six places the owner approved: cave tunnel (inside the Dark Cave, where Episode 8 starts), dungeon hall (stone corridors, wall torches, carved doors), treasure chamber (gold piles, chests, coins), sword chamber (runes, a stone stand where Starfang waits), crystal cave (crystals that give light), underground lake (still dark water). Other places later, when the stories need them.

Then, after the owner's OK: **F4 Part D stop 2, third part**: `<name> uses the <prop> on the <prop>`, `<name> pulls the <prop>` (the lever's `up`/`down` states exist), `the map shows <text>`, extras landing on set pieces (perch points), `stories/demos-and-tests/treasure-demo.txt`, then Milestone 2.

**Uploaded folders (2026-10-30):** stories already on YouTube live in an `uploaded\` folder next to the others: `stories\episodes\uploaded\` (Episodes 1–4), `shorts\standalone\uploaded\` (Shorts 1–7) and `shorts\episode-shorts\uploaded\` (ep1-1, ep1-2, ep2-1). The owner doesn't want anything in them changed. Move a story there once it's on YouTube. Everything still works from there: episodes keep the series intro (the path still has `episodes\`) and episode Shorts still find their episode (any folder inside `stories\`).

The owner's YouTube channel (for context): Episodes 1–4, Shorts 1–7 and the episode Shorts ep1-1, ep1-2 and ep2-1 are uploaded (2026-10-27 to 30). "The Compliment" got about 410 views, the others 3–10, so new Shorts follow its style (it opens mid-moment, Ren's pride meets Yuki's teasing, Yuki gets the last word so it loops). **2026-10-30: the episode Short "Very Local Wind" (`ep2-1`) got 237 views in its first hour**, the fastest start so far. Why it may work: the hook is a question ("She wants to go WHERE?"); Ren pretends to be brave and every excuse is worse than the last ("That's the wind." / "There isn't any wind." / "It's very local wind."); the punchline is Ren's own silly denial, so here Ren gets the last word. Use this alongside The Compliment's style: a quick hook, Ren's pride or fear, and a running escalation that ends on one short, funny line. The owner decided **not** to add AI (no API keys) to the studio.

**Kitsu Flow (`flow\`, 2026-10-31, waiting for the owner's first real run):** a separate tool, not part of the engine. It makes Ren & Yuki videos in **Google Flow** from a story file of frames and clips (`flow\stories\_template.txt`), by driving [flow-mcp](https://github.com/GTAI-1/flow-mcp) (installed in its own folder) through its local API, so it uses no Claude usage. The owner chose this over copying flow-mcp's code (Option A), so flow-mcp's own fixes for Flow changes keep working. It has two Google accounts, each with its own Chrome profile (`~/.kitsu-flow/account-N`, ports 8790+N and 9340+N). Before each clip it reads the credits and switches to the other account when one runs low. It is resumable (`flow\output\<project>\made.json`). Keep it separate from the engine (the owner's wish): it must not import anything from `engine\` or `tools\`. Tested against a pretend flow-mcp (`flow\tests\`); the real Flow can only be tried on the owner's PC.

Not in git (on the owner's PC only): `build\`, `videos\`, the voice cache `cache\` and the Kokoro model `models\`. Video folders are named after the story file, so the renamed Shorts make new folders.
