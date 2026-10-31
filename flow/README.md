# Kitsu Flow: Ren & Yuki videos in Google Flow

This folder is separate from Kitsu Studio. It doesn't use the story engine, and Kitsu Studio doesn't use it.

You write a story file with **frames** (free stills) and **clips** (short videos that go from one frame to the next). Then one command makes everything in Google Flow by itself: the frames, the clips, and the finished film with the clips joined.

**It runs without Claude**, so it uses none of your Claude usage. Everything it needs is in this repo: it opens a Chrome window for each Google account and clicks Flow's own buttons (`flow\lib\flow-web.js`, adapted from [flow-mcp](https://github.com/GTAI-1/flow-mcp); see `NOTICE.md`). It joins the clips with Kitsu Studio's own FFmpeg, so there's nothing else to install.

## Setting up (once)

Sign in to each Google account once. Each account gets its own Chrome window and stays signed in:
```
flow\flow-video.bat login 1
flow\flow-video.bat login 2
```
In each window: sign in, open (or create) a Flow project, and **leave the window open**. If your Ren and Yuki characters are in that project, frames can use them. You can give the accounts names in `flow\settings.json`:
```
{ "accounts": { "1": "Main account", "2": "Second account" } }
```

## Making a video

```
flow\flow-video.bat credits
flow\flow-video.bat check flow\stories\my-story.txt
flow\flow-video.bat make flow\stories\my-story.txt
```

- **`credits`**: the plan and the credits left on both accounts.
- **`check`**: reads the story and lists every frame and clip. It spends nothing.
- **`make`**, the first time: makes **only the frames**, which are free. Look at them in `flow\output\<project>\frames\`.
  - To redo a frame you don't like: `make ... --redo frame 3`. The clips that start or end on that frame are redone too.
- **`make`**, again: makes the **clips**, which cost credits, and then **joins them** into `flow\output\<project>\film.mp4`.
- **`make ... --all`**: frames, clips and film in one go.

## Two accounts

Before each clip, Kitsu Flow reads the credits on both accounts:
- It starts on the account with the most credits.
- When that account has less left than one clip may cost (`max credits:` in the story), it **switches to the other account by itself** and carries on.
- If neither has enough, it stops and tells you. Everything already made is kept, so running the same command later carries on where it stopped. Nothing is ever paid for twice.

To use one account only: `make ... --account 2`.

## The story file

Start from `flow\stories\_template.txt`:

```
title: The Bravest Fox
aspect: 9:16
characters: Ren, Yuki
max credits: 25
style: Cute 2D chibi storybook cartoon, ...
place: A cozy forest path at dusk, ...

frame 1: Ren and Yuki walk side by side along the path...
frame 2: Same place and framing. Ren frozen mid-step...

clip 1: frame 1 to frame 2
They walk along the path. A twig snaps. Ren freezes.
Yuki (soft, curious): "Ren... did you hear that?"
```

| Line | What it does |
|---|---|
| `title:` | The video's name. The output folder is named after it (or after `project:`, if you write one) |
| `aspect:` | `9:16` for Shorts, `16:9` for wide videos |
| `characters:` | Your characters' names in Flow. A frame that mentions one uses it as a reference |
| `style:` / `place:` | Added to every frame (and the style to every clip), so the look stays the same |
| `max credits:` | A clip is skipped, with nothing spent, if Flow asks for more than this (default 25) |
| `model:` | Optional, e.g. `Veo 3.1 - Fast`. Without it, Flow's current choice is used |
| `quality:` | `original`, or `upscaled` (1080p: free, but slower to download) |
| `voices:` | `none` (the default): Flow makes the clips **without voices**, because it invents a different voice for every clip, and the words go in speech bubbles instead. `flow`: Flow makes the voices |
| `bubbles:` | `on` (the default): what the characters say is shown in Kitsu-style speech bubbles on the film. `off`: no bubbles |
| `sides:` | Where each character usually stands, for the bubble's tail: `sides: Ren left, Yuki right`. One line can say otherwise: `Ren (proud, right): "..."` |
| `frame N:` | A still. Each frame also uses the frame before it as a reference, so the drawing stays consistent |
| `clip N: frame A to frame B` | A video starting on frame A and ending on frame B. The lines below it say what happens and who says what |
| `Ren (proud): "I'm a snow expert."` | In a clip: something said. With `voices: none` it becomes a speech bubble, and Flow gets only how Ren feels ("proud"). A clip's lines share its time, one bubble after another |

**The film comes in two versions:** `film.mp4` with the speech bubbles, and `film-clean.mp4` without them. To change a bubble, fix the words in the story and run `make ... --redo film`. That's free: only the joining is done again.

**One Flow project for all your stories:** keep using the project that has Ren and Yuki in it, on each account. Every frame and clip is named after its story in Flow (like `the-snow-expert-frame-01-...`), so the stories never mix up. A clip on the same account picks its frames there directly. Only a clip made on the *other* account uploads them.

## Good to know

- **Each account's Chrome window must stay open, with a Flow project open.** Don't use that window while a video is being made.
- Kitsu Flow waits 25–70 seconds between generations, like a person would, so a 6-clip video takes a while. You can leave it running.
- Your files go in `flow\output\` and are never put in git.
- Google changes Flow from time to time. If something stops working, send the message to Claude Code: the fix goes into `flow\lib\flow-web.js`, and a `git pull` brings it to you.
- Automated use of Flow may be against Google's terms (flow-mcp's author warns about this too). Use it on your own accounts, at your own risk.
- Characters (`characters:`) live in one Flow project. A frame that uses them must be made on the account whose open project has them: use `--account` for the frames if only one account has them. Clips don't need the characters (they start from your frames), so they can use either account.
- Tests (no Google needed): `node --test flow/tests/flow-video.test.js`
