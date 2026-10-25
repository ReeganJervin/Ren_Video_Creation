# Kitsu Studio: Handoff

> **For Claude Code.** Read this first in every new session, then `ENGINE-ROADMAP.md` (and the detail file of the next step, if it has one).
> **Owner:** not a programmer, on Windows. They review every step from images and reports, and approve each part before it's committed.

## What this project is

Kitsu Studio turns a story written as a plain text file into a finished animated video (1920×1080, 30 fps) starring **Ren** the fox and **Yuki** the bunny, with narration, character voices, music, sound effects and speech bubbles. It is being built into a production engine for the series **"Ren & Yuki: The Secrets Beyond the Enchanted Forest"** (10 episodes of 8–10 minutes, plus Shorts).

- How to use it: `README.md`. Every story line: `STORY-GUIDE.md`.
- The plan: `ENGINE-ROADMAP.md` (version 2), with the detail files `ASSET-KIT.md` (F4) and `STUDIO-APP.md` (F9).
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

**Notes about the owner's computer:** an Intel i3 laptop with 2 cores and 8 GB of memory that slows itself down when hot, so speed measurements vary a lot; compare runs side by side. Playwright's own browser could not be downloaded there, so the installed Chrome is used automatically.

## Current status

- **Next step:** see the **build order in `ENGINE-ROADMAP.md` section 2**. The first step there whose status isn't "Done" is the one to work on.
- Right now: **F1 and F2 are done, and F4 Part A** (asset registry, missing list, placeholders). Next is **F4 Asset Kit, Part B** (`ASSET-KIT.md`): picture drop-in.
- After that: F4 Part C, then F9 Studio App Part A (`STUDIO-APP.md`), then **milestone 1** (full test, rule R14), then F3 Rig 2.0.
