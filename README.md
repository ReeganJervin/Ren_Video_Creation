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

## Making a video

1. Copy `stories\_template.txt` to a new name, for example `stories\my-story.txt`, and write your story. The full list of lines you can use is in **[STORY-GUIDE.md](STORY-GUIDE.md)**.
2. Check it: `check-story.bat stories\my-story.txt`. This finds mistakes in seconds.
3. Watch it live with sound (optional): `preview.bat stories\my-story.txt`. This opens in your browser. Press Ctrl+C in the window to stop.
4. Make the video: `make-video.bat stories\my-story.txt`. You can also drag the story file onto `make-video.bat`.

The video appears in the `videos` folder as `my-story.mp4`, along with a check report, `my-story-report.txt`.

**How long it takes:** about 4–6 minutes for a 50-second video, depending on your computer. Voices are remembered, so if you only change actions, the voices aren't made again.

There are example stories to try first:
- `stories\the-fallen-star.txt` is your 50-second film, written as a story.
- `stories\a-sunny-hello.txt` is a short daytime story that shows Ren's moods.
- `stories\ren-meets-yuki.txt` is a one-minute story where Ren meets Yuki: talking, every Yuki mood, a hug and hopping together.
- `stories\a-trip-around.txt` takes Ren and Yuki to every place: the meadow, forest, river, snowy hill and beach.

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
| `config\voices.json` | The fixed voices: the narrator is `af_heart`, Ren is `af_sky` pitched up, and Yuki is `af_bella` pitched up more |
| `engine\characters.js` | The list of characters: their names, how they move, their sounds and how each mood looks on them |
| `engine\ren.js` | Ren's fixed design (shape, colours, face, scarf) |
| `engine\yuki.js` | Yuki's fixed design (shape, colours, face, ears, flower and bow) |
| `engine\story.js` | Reads the story and works out the timing for everything |
| `engine\places\` | The places (meadow, forest, river, snowy hill, beach): one drawing file each, plus the list in `index.js` |
| `engine\film.js` | Draws each frame: the place, the characters, the star, hearts, bubbles, captions and place changes |
| `engine\audio.js` | Music, sound effects, the sound of each place, voice mixing (Web Audio) |
| `tools\make-video.js` | The main program behind the `.bat` files |
| `voice-overrides\` | Optional: your own recordings for specific lines (see STORY-GUIDE.md) |

## Adding new things later

New props, like a butterfly, are added in code:
- `engine/story.js` gets the new story words.
- `engine/film.js` gets the drawing.
- `engine/audio.js` gets the sounds.

A new place needs a drawing file in `engine/places/`, its name in the list in `engine/places/index.js` and a sound in `engine/audio.js`. A new character needs only a drawing file in `engine/` (like `engine/yuki.js`), one entry in `engine/characters.js` and a voice in `config/voices.json`. Every story line then works for the new name.

Existing stories keep working unchanged.
