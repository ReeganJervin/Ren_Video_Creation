# Kitsu Studio: Handoff

> **For Claude Code.** Read this first in every new session, then `ENGINE-ROADMAP.md` (and the detail file of the next step, if it has one).
> **Owner:** not a programmer, on Windows. They review every step from images and reports, and approve each part before it's committed.

## What this project is

Kitsu Studio turns a story written as a plain text file into a finished animated video (1920×1080, 30 fps) starring **Ren** the fox and **Yuki** the bunny, with narration, character voices, music, sound effects and speech bubbles. It is being built into a production engine for the series **"Ren & Yuki: The Secrets Beyond the Enchanted Forest"** (10 episodes of 8–10 minutes, plus Shorts).

- How to use it: `README.md`. Every story line: `STORY-GUIDE.md`.
- The plan: `ENGINE-ROADMAP.md` (version 3.1), with the detail files `ASSET-KIT.md` (F4) and `STUDIO-APP.md` (F9).
- `PRODUCTION-SYSTEM.md` (the three video formats) is referred to by the roadmap but is not in the project yet.

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
- **F11 Part A** (thumbnails, subtitles, description draft) is done and approved. **F11 Part B** (series intro, theme jingle, end screen) is done and approved. **F7 Part A** (vertical 9:16, safe area) is done and approved. Right now: **F7 Part B** (Shorts workflows).
- Then: **F11 YouTube kit**, then **F7 Vertical and Shorts** (moved there by the owner in version 3.1; it reuses F11's thumbnail, subtitles and description), then F12 Expression pack, F3 Rig 2.0, F4 Part D and Milestone 2.
- `PRODUCTION-SYSTEM.md` is mentioned in the plan but is not in the project yet (the owner has been told).
