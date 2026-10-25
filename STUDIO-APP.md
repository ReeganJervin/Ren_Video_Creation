# Kitsu Studio: Studio App (F9, the browser front end)

> **For Claude Code.** This is the detail file for **F9** in `ENGINE-ROADMAP.md`.
> - **Part A** is build-order step 4. It needs F1 (done) and Asset Kit Part A.
> - **Part B** is build-order step 11.
>
> **Read first:** `HANDOFF.md`, `PRODUCTION-SYSTEM.md`, `ENGINE-ROADMAP.md`, `ASSET-KIT.md`. Global rules **R1–R14** and the review package apply.
> **Owner:** not a programmer, on Windows. They review every step from screenshots and reports.

---

## 0. The idea, in plain words (for the owner)

- Double-click **`Kitsu Studio.bat`**. Your browser opens the studio at `http://localhost:3000`.
- Everything runs **on your own computer**. Nothing goes online, and nobody else can open it.
- You write, check, preview and render in the browser.
- **The CMD commands keep working** (rule R13), so Claude Code and the automatic checks still use them.

---

## 1. Technical decisions

| Topic | Decision |
|---|---|
| **Front end** | **React + Vite + TypeScript**, in `studio/`. Not Next.js: this is a one-user local app, so a server-rendering framework only adds parts that can break. Screens stay plain React components, so moving to Next.js later (for an online product) stays possible |
| **Back end** | A small Node server in `studio/server/`. It serves the built front end, the engine files and the `build/`, `videos/` and `assets/` folders, plus a JSON API |
| **Engine use** | The server **calls the same functions** the CMD tools use (`parseStory`, `compileStory`, the voice step, the renderer, `validate`). Move shared code out of `tools/make-video.js` into importable modules if needed, so both use one copy. **No engine logic in the front end**, except the existing `engine/page.html` player embedded for previews |
| **Security** | Listen on `127.0.0.1` only, never `0.0.0.0`. Only allow reading and writing files inside the project folder. Check every path the API receives |
| **Long jobs** | Voices and rendering run as **background jobs** in the server. Progress goes to the browser over Server-Sent Events. Closing the tab never stops a job. A job survives a browser refresh, and uses F1's `--resume` after a crash or restart |
| **One render at a time** | Renders queue up instead of running in parallel. Each render already uses several workers (F1) |
| **Install** | `setup.bat` installs and builds the studio as well. `Kitsu Studio.bat` starts the server and opens the browser. Both keep CRLF line endings (R9) |
| **Look** | Clean and friendly, a light theme with an optional dark theme, large readable text, works on a laptop screen (1366×768 and up) |

---

## Part A: write, check, preview, render

### A1. Home screen
- A list of stories (from `stories/`, and from `episodes/` if it exists), with title, length (from the last check), last-changed date and a status badge: `Has errors`, `Missing assets`, `Ready`, `Rendered`.
- Buttons: **New story** (from `_template.txt`), **Open**, **Duplicate**, **Rename**, **Delete**. Delete asks first and moves the file to `stories/_deleted/`, so nothing is ever lost.

### A2. Story editor
- **Code editor:** CodeMirror 6, with:
  - colours for line types (narrator, Ren, Yuki, actions, settings, `#` notes, `scene:` lines)
  - line numbers matching Notepad's, so the voice-override line numbers stay right
- **Suggestions while typing:** after `ren `, suggest every action; after `(`, every mood; after `place: `, every place; after `the `, every prop. Take all suggestions from the engine's registries, so new assets appear automatically.
- **Live check:** about 0.5 s after typing stops, run `--check`. Errors are underlined in red on their line, with the friendly message on hover. Missing assets are underlined in orange (from the Asset Kit missing list).
- **Side panel:**
  - total estimated length
  - the scene list with lengths; clicking a scene jumps to it
  - the missing-assets list, each with "Copy `/new-asset` command"
- **Save:** saves automatically after typing stops, plus Ctrl+S. The file on disk stays a plain text file the owner can still open in Notepad. If the file changes on disk (for example Claude Code edited it), offer to reload it.

### A3. Live preview
- The existing `engine/page.html` player, embedded beside the editor (or below it on small screens).
- **Play, pause, scrub, and a timeline** with scene markers and voice-line markers.
- **Click a story line to jump** to the moment it starts. While playing, the current line is highlighted in the editor.
- **Voices:** "Make voices" runs the voice step as a background job (only new or changed lines, because of the cache), then the preview plays with sound. Until then it plays silently, using estimated timing.
- **Still:** a "Save still" button saves the current frame as a PNG in `videos/`.

### A4. Render
- **Make video** button, with options: workers (default from F1), and "allow placeholders" (only shown if assets are missing).
- **Progress:** the step (voices, soundtrack, drawing, checking), overall percentage, the current scene, frames per second and time left. Cancel and Resume buttons.
- **When it finishes:** play the video in the page, show the 10 checks as green or red rows, and offer **Open folder**.
- If a check fails, show the friendly explanation, and a button that copies the report so the owner can paste it to Claude Code.

### A5. Tests
- **API tests:** check, render job start/progress/cancel/resume, path safety (a request for `../../Windows` must be refused).
- **End-to-end test with Playwright:**
  - open the studio
  - create a story
  - type a broken line and see the error
  - fix it
  - preview it
  - render a short story
  - see all checks pass
- **R1/R13:** prove that the CMD tools still give identical results for every story, before and after the refactor.

**Part A review:**
- screenshots of every screen, including an error, a missing asset and a render in progress
- the end-to-end test result
- a short screen recording (an MP4 made with Playwright) of writing and previewing a small story
- the R1/R13 results

**Commit message:** `F9A: Studio App - editor, live check, preview, render`

---

## Part B: voices, library, videos, Shorts

### B1. Voices screen
- The audition picker built into the app: every Kokoro voice and blend, with filters, a play button and a speed and pitch slider.
- **Test line:** type any sentence and hear it in the chosen voice.
- **Assign** a voice to Ren, Yuki, the narrator or any extra. This writes to `config/voices.json`.
- Changing a voice warns that old voice lines will be remade, and shows how many.
- **Your recordings:** a list of `voice-overrides` per story. Upload a WAV for a line from the editor's line menu.

### B2. Library screen (from the Asset Kit)
- Tabs for **places, props and set pieces, extras, characters**, each with a thumbnail.
  - Draw the thumbnails with the engine, and cache them.
  - Each card shows its states and times of day, its credit, and which stories use it.
- **Missing:** everything missing across all stories, with the story and lines where it's used, and the `/new-asset` command to copy.
- **Add picture:** drag and drop a PNG, fill in the simple settings form (name, kind, size, motion, credit), and it's saved in `assets/` with its `.txt` settings file. Show the Asset Kit's picture warnings (no transparency, no credit, too small).

### B3. Videos screen
- Every finished video with its thumbnail, length, date, check results and file links: chapters, subtitles, credits, report.
- Play inside the app. **Open folder** button.

### B4. Shorts screen (needs F7)
- Choose an episode, then pick scenes or a range on the timeline. Add a hook and an ending, preview it in vertical framing with the safe area shown, then render.
- This writes a normal episode-short story file (from `PRODUCTION-SYSTEM.md`), so the CMD tools can render it too.
- If F7 isn't done yet, hide this screen.

### B5. World screen (needs F10)
- Browse the world files, see the season's episode list with status, and the `world-check` to-do list.
- If F10 isn't done yet, hide this screen.

**Part B review:** screenshots of each screen; assigning a new voice and hearing a test line; adding a PNG prop and using it in a story; the end-to-end tests extended to these screens; R1/R13.

**Commit message:** `F9B: Studio App - voices, library, videos, Shorts`

---

## Later (not part of F9)
- **An online version others can pay for.** That needs accounts, payments, servers and cloud rendering costs. It's a separate project, to plan only once the channel works. If it's ever built, re-check the ffmpeg licence (GPL) for distribution.
- **A desktop app** (an installer with its own window, e.g. Electron) for selling as a download. The same licence check applies.

---

## Prompt to give Claude Code (for Part A, at build-order step 4)

> Read HANDOFF.md, PRODUCTION-SYSTEM.md, ENGINE-ROADMAP.md, ASSET-KIT.md and STUDIO-APP.md. Implement STUDIO-APP.md Part A only, follow rules R1–R14, and stop for my review with the full review package.
