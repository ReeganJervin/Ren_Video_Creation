# Kitsu Studio

You write a story as a text file and get a finished animated Ren video: 1920×1080, 30 fps, with narration, Ren's voice, music, sound effects and speech bubbles.

Ren's design, the voices and the style are fixed in the project. **Only the story changes.**

## One-time setup (Windows)

1. Install **Node.js LTS** from https://nodejs.org.
2. Install **Python 3.12** from https://www.python.org/downloads/. During install, tick **"Add python.exe to PATH"**.
3. Double-click **`setup.bat`** and wait for "All set!". This takes a few minutes and needs internet once, to download:
   - the drawing browser
   - the video tools
   - the voice tool
   - the voice model (about 120 MB)

After setup, everything runs offline.

## Making a video

1. Copy `stories\_template.txt` to a new name, for example `stories\my-story.txt`, and write your story. The full list of lines you can use is in **[STORY-GUIDE.md](STORY-GUIDE.md)**.
2. Check it: `check-story.bat stories\my-story.txt`. This finds mistakes in seconds.
3. Watch it live with sound (optional): `preview.bat stories\my-story.txt`. This opens in your browser. Press Ctrl+C in the window to stop.
4. Make the video: `make-video.bat stories\my-story.txt`. You can also drag the story file onto `make-video.bat`.

The video appears in the `videos` folder as `my-story.mp4`, along with a check report, `my-story-report.txt`.

**How long it takes:** about 4–6 minutes for a 50-second video, depending on your computer. Voices are remembered, so if you only change actions, the voices aren't made again.

There are two example stories to try first:
- `stories\the-fallen-star.txt` is your 50-second film, written as a story.
- `stories\a-sunny-hello.txt` is a short daytime story that shows all the moods.

## Every video is checked automatically

After rendering, the video is tested for:
- correct length, size and frame rate, with sound and picture in sync
- every voice line starting on time, with no overlaps and nothing cut off
- speech bubbles and captions staying up for their whole line
- every sound effect playing on its moment
- sensible volume with no clipping, no sudden jumps, and a clean fade-out

The results are in `videos\<name>-report.txt`.

## What's inside

| Folder or file | What it is |
|---|---|
| `stories\` | Your stories, plus the template and examples |
| `config\voices.json` | The two fixed voices: the narrator is `af_heart`, and Ren is `af_sky`, pitched up |
| `engine\ren.js` | Ren's fixed design (shape, colours, face, scarf) |
| `engine\story.js` | Reads the story and works out the timing for everything |
| `engine\film.js` | Draws the meadow, the sky, the star, hearts, bubbles and captions |
| `engine\audio.js` | Music, sound effects, voice mixing (Web Audio) |
| `tools\make-video.js` | The main program behind the `.bat` files |
| `voice-overrides\` | Optional: your own recordings for specific lines (see STORY-GUIDE.md) |

## Adding new things later

New places, props or characters, like a forest, a butterfly or a bunny, are added in code:
- `engine/story.js` gets the new story words.
- `engine/film.js` gets the drawing.
- `engine/audio.js` gets the sounds.

Existing stories keep working unchanged.
