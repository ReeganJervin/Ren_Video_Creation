# Kitsu Studio

You write a story as a text file and get a finished animated video starring Ren the fox and Yuki the bunny: 1920×1080, 30 fps, with narration, the characters' voices, music, sound effects and speech bubbles.

The characters' designs, the voices and the style are fixed in the project. **Only the story changes.** A story can use Ren, Yuki or both.

## One-time setup (Windows)

1. Install **Node.js LTS** from https://nodejs.org.
2. Install **Python 3.12** from https://www.python.org/downloads/. During install, tick **"Add python.exe to PATH"**.
3. Double-click **`setup.bat`** and wait for "All set!". This takes a few minutes and needs internet once, to download:
   - the drawing browser
   - the video tools
   - the voice tool
   - the voice model (about 120 MB)

After setup, everything runs offline.

## The studio app (in your browser)

Double-click **`Kitsu Studio.bat`**. Your browser opens the studio at http://localhost:3000. Everything runs on your own computer: nothing goes online, and nobody else can open it. Keep the black window open while you use the studio, and close it to stop.

- **Home:** all your stories, with their length and status (*Has errors*, *Missing assets*, *Ready*, *Rendered*). New story, Open, Duplicate, Rename and Delete. Delete moves the story to `stories\_deleted\`, so nothing is ever lost.
- **Writing:** the editor colours each kind of line and suggests what you can write (type `ren ` and see). Mistakes get a red underline about half a second after you stop typing; point at one to read what's wrong. Things that don't exist yet get an orange underline, with the `/new-asset` command to copy for Claude Code. The story saves itself, and it stays a normal text file you can still open in Notepad. If someone else changes the file (Claude Code, or you in Notepad), the studio offers to load the new version.
- **Preview:** play, pause and drag the timeline. Click a story line to jump to that moment; while it plays, the current line lights up. **Make voices** makes the voice lines that aren't made yet. **Save still** saves the picture in `videos\`.
- **Make video:** shows each step, the scene, the speed and the time left. You can cancel it and resume it later, and closing the browser doesn't stop it. When it's done, the video plays in the page with its checks in green and red, plus **Open folder** and **Copy report** (to paste to Claude Code).

The command files below keep working exactly as before.

## Making a video

1. Copy `stories\_template.txt` to a new name, for example `stories\my-story.txt`, and write your story. The full list of lines you can use is in **[STORY-GUIDE.md](STORY-GUIDE.md)**.
2. Check it: `check-story.bat stories\my-story.txt`. This finds mistakes in seconds.
3. Watch it live with sound (optional): `preview.bat stories\my-story.txt`. This opens in your browser. Press Ctrl+C in the window to stop.
4. Make the video: `make-video.bat stories\my-story.txt`. You can also drag the story file onto `make-video.bat`.

The video appears in the `videos` folder as `my-story.mp4`, along with a check report, `my-story-report.txt`, and `my-story-credits.txt`, which lists everything in the video and who made it. A story with at least 3 scenes also gets `my-story-chapters.txt`, ready to paste into a YouTube description (see "Scenes" in STORY-GUIDE.md). For uploading, every video also gets `my-story-thumbnail.jpg`, `my-story.srt` (subtitles) and `my-story-description.txt` (a description draft); see "YouTube" in STORY-GUIDE.md.

### Still images (for checking)

To save single pictures instead of the whole video, open a command window in the project folder and run:

```
node tools\make-video.js stories\my-story.txt --stills 3,10.5
```

This saves the pictures at 3 s and 10.5 s into the `videos` folder. For stories with scenes, you can also write:
- `--stills scene:2` for the middle of scene 2
- `--stills scene:2@3.5` for 3.5 seconds into scene 2

You can mix them, for example `--stills 3,scene:1,scene:3@4`.

**How long it takes:** on a small laptop (2 processor cores), a 1-minute video takes about 2 minutes, plus about a minute the first time its voices are made. Voices are remembered, so if you only change actions, the voices aren't made again. An 11-minute episode takes about 30 minutes, of which drawing the pictures takes about 12. A faster computer with more cores is quicker.

### If a video stops halfway

Long videos are drawn in pieces, one scene at a time (long scenes are cut into one-minute pieces). If the window was closed or the computer restarted, carry on where it stopped:

```
resume-video.bat stories\my-story.txt
```

The pieces that were already finished are kept. If you changed the story since then, it starts again from the beginning, so the video always matches your story.

### Options for the make-video command

| Option | What it does |
|---|---|
| `--resume` | Carries on with a stopped video (this is what `resume-video.bat` does) |
| `--workers 3` | Draws with 3 browser pages at once. The default is the number of processor threads minus 1. More workers are faster, until the computer is busy; the video looks exactly the same with any number of workers |
| `--allow-placeholders` | Makes a test video even though the story uses things that don't exist yet (they appear as grey placeholders, and the report says so) |

For example: `node tools\make-video.js stories\my-story.txt --workers 2 --resume`

While drawing, the window shows how far it is, which scene it's on, how many frames per second it draws and about how long is left.

There are example stories to try first:
- `stories\the-fallen-star.txt` is your 50-second film, written as a story.
- `stories\a-sunny-hello.txt` is a short daytime story that shows Ren's moods.
- `stories\ren-meets-yuki.txt` is a one-minute story where Ren meets Yuki: talking, every Yuki mood, a hug and hopping together.
- `stories\a-trip-around.txt` takes Ren and Yuki to every place: the meadow, forest, river, snowy hill and beach.
- `stories\test-scenes.txt` is a story in three scenes, with three music moods and YouTube chapters.
- `stories\test-camera.txt` shows every kind of shot and camera move.
- `stories\camera-demo.txt` lets the camera edit by itself (`editing: auto`), with comic beats, slow motion and reveals.

## Every video is checked automatically

After rendering, the video is tested for:
- correct length, size and frame rate, with sound and picture in sync
- every voice line starting on time, with no overlaps and nothing cut off
- speech bubbles and captions staying up for their whole line
- every sound effect playing on its moment
- sensible volume with no clipping, no sudden jumps, and a clean fade-out

Stories with scenes get three extra lines in the report: scene lengths, that something happens at least every 90 seconds, and whether a chapters file was made.

The results are in `videos\<name>-report.txt`. Each line starts with `PASS`, `FAIL`, `WARN` (worth a look, but the video is fine) or `NOTE` (for your information).

## What's inside

| Folder or file | What it is |
|---|---|
| `stories\` | Your stories, plus the template and examples |
| `config\voices.json` | The voices: the narrator, Ren, Yuki, and the owl (a Kokoro voice or a blend of two, with speed and pitch) |
| `engine\characters.js` | The list of characters: their names, how they move, their sounds and how each mood looks on them |
| `engine\ren.js` | Ren's fixed design (shape, colours, face, scarf) |
| `engine\yuki.js` | Yuki's fixed design (shape, colours, face, ears, flower and bow) |
| `engine\story.js` | Reads the story and works out the timing for everything |
| `engine\places\` | The places (meadow, forest, river, snowy hill, beach, cottage garden): one drawing file each, found automatically (`index.js` has the shared helpers) |
| `engine\assets.js` | The asset registry: every prop, set piece, extra and place, found automatically, plus spelling help |
| `engine\props\`, `engine\extras\` | Props and set pieces (star, heart, lantern, cottage) and extras (the owl), one file each; `_template.js` in each folder is the starting point for a new one |
| `assets\` | Your own pictures: `props\`, `extras\` and `places\` (see "Adding your own pictures" in STORY-GUIDE.md). `engine\pictures.js` turns them into props, animals and places |
| `engine\film.js` | Draws each frame: the place, the characters, the star, hearts, bubbles, captions and place changes |
| `engine\audio.js` | Music, sound effects, the sound of each place, voice mixing (Web Audio) |
| `tools\make-video.js` | The main program behind the `.bat` files |
| `tools\story-check.js` | The story check and voice bookkeeping that `make-video.js` and the studio app share |
| `studio\` | The studio app: `server\server.js` (the local server), `src\` (the screens, React + TypeScript), `tests\` (`node studio\tests\api.test.js` and `node studio\tests\e2e.test.js`) |
| `tools\youtube.js` | The YouTube files: thumbnail, subtitles and description draft |
| `tools\scenes.js` | Chapters and the extra checks for stories with scenes |
| `tools\render.js` | Draws the frames: several workers at once, scene by scene in pieces that `--resume` can keep |
| `tools\browser.js` | Starts the drawing browser (or Chrome/Edge if setup couldn't download it) |
| `tools\compare-engines.js` | For engine changes: checks that every story in `stories\` still looks and sounds exactly the same as before (`node tools\compare-engines.js`) |
| `voice-overrides\` | Optional: your own recordings for specific lines (see STORY-GUIDE.md) |

## Adding new things later

A new prop, set piece or extra (an animal) is one file in `engine/props/` or `engine/extras/`, found automatically; no list needs editing. The story lines for props and extras already work for any name (see "Props, set pieces and animals" in STORY-GUIDE.md), and anything a story uses before it exists is shown as a grey placeholder.

A new place is one drawing file in `engine/places/` (found automatically) and a sound in `engine/audio.js`. A new character needs only a drawing file in `engine/` (like `engine/yuki.js`), one entry in `engine/characters.js` and a voice in `config/voices.json`. Every story line then works for the new name.

Existing stories keep working unchanged.
