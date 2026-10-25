---
name: new-asset
description: Create a missing prop, set piece, extra (simple animal) or place for a Kitsu Studio story, in the Ren & Yuki style, with a review sheet the owner approves. Use when the owner types /new-asset (optionally with a name, or "name: description"), or asks to create something a story's check lists as missing.
---

# /new-asset: create something a story needs

The owner is not a programmer. Keep every message short, friendly and simple. Never commit without the owner's approval.

## How it's called

- `/new-asset`: read every `build/*/missing-assets.json` (made by `check-story.bat` / `node tools/make-video.js <story> --check`) and offer to create the missing things **one at a time**, in the order they appear. Run `--check` on recently changed stories first if the lists may be old.
- `/new-asset lantern`: create that one asset. Look it up in the missing lists for how it's used; if it isn't in any, ask in one line what it is.
- `/new-asset owl: a small round brown owl with big sleepy eyes`: create it from the owner's description. If they mention a picture in `reference/`, open it and match it.

## Before you draw

1. **Read** `STYLE-GUIDE.md` (the rules), `ASSET-KIT.md` (what each kind needs) and the matching template: `engine/props/_template.js`, `engine/extras/_template.js` or `engine/places/_template.js`. Look at an existing asset of the same kind for the style (`engine/props/star.js`, the places in `engine/places/`).
2. **Understand how it's used:** from the missing list, read its `kind`, `text` (the story lines), `needs` (appears, opens, glows, flies, speaks…), `places` and `times`.
   - A missing prop with `size: big`, or one used like a building or big object, is a **set piece**: `size: 'big'`, about 280–420 px tall. A building a character could walk into is bigger: door about Ren's height, building about 1.7–2× Ren (see STYLE-GUIDE.md section 4).
   - **A full main character** (every mood, three views, hugs, real acting) is **not** an asset: say it belongs to the creature kit (F8 in `ENGINE-ROADMAP.md`) and stop.
3. **Ask at most one or two short questions**, and only if something important is unclear (main colour, rough size). Otherwise choose sensible defaults that fit the series.

## Draw it

4. Create `engine/props/<id>.js`, `engine/extras/<id>.js` or `engine/places/<id>.js` from the template (`id` = lowercase name with dashes). Draw it in code, following `STYLE-GUIDE.md`:
   - one outline colour `#4a2616`, round shapes, soft gradients, a small highlight, blush on faces
   - daytime colours only; anything that gives light goes in `drawLight` (or `emissive: true`)
   - every state the story needs (`states: ['closed', 'open']`, `['off', 'glowing']`) and `glow: true` if it glows
   - extras: `moves` (walk, hop, fly, swim, float), and blinking, looking and talking from the pose `K`
   - places: palettes for all four times of day, a `ground(x)`, the three spots, and `ambient`
   - deterministic: only `t` and fixed seeds, never `Math.random()`
5. If the story makes it speak (`needs` has `speaks`, or a `voice` entry is missing), add a voice to `config/voices.json` (a Kokoro voice name or a blend like `"am_puck:0.6+af_sky:0.4"`, with `speed` and `pitch`), different from Ren, Yuki and the narrator. Make a sample with `node tools/voice-sample.js <id> "<a line from the story>" --out <scratchpad>`.

## Review

6. Make the review sheet: `node tools/asset-sheet.js "<name>" --out <scratchpad>` (add `--ref reference/<file>.png` if there's a reference picture). It shows the asset next to Ren and Yuki at the same scale, in every state, at all four times of day (extras: idle, blink, talking and a movement strip; places: empty and with Ren and Yuki on all three spots).
7. **Look at the sheet yourself first** and fix problems: wrong size next to Ren, outlines too thin or thick, colours off the palette, glow darkened at night, parts cut off, anything scary. Repeat until it's right.
8. Show the owner the sheet (give the full scratchpad path) and the voice sample if there is one, with a two-line summary. **Wait for approval.** Change it as often as they ask.

## After approval

9. Run `node tools/make-video.js <story> --check` on the story that needed it (the asset must no longer be missing).
10. Run rule R1: `node tools/compare-engines.js` (every other story must be unchanged).
11. Add it to the **asset list** in `STORY-GUIDE.md` (section "Assets you can use") with the story lines it supports.
12. Commit it as `Add asset: <name>`, **only on the branch `Improvment`** (never on `main`), ending the message with the co-author line from the session's instructions.
13. **Finish with a plain summary:** what was created, the story lines to use, and anything that's still missing.
