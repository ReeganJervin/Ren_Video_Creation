# Kitsu Flow: Ren & Yuki videos in Google Flow

This folder is separate from Kitsu Studio. It doesn't use the story engine, and Kitsu Studio doesn't use it.

You write a story file with **frames** (free stills) and **clips** (short videos that go from one frame to the next). Then one command makes everything in Google Flow by itself: the frames, the clips, and the finished film with the clips joined.

**It runs without Claude**, so it uses none of your Claude usage. It clicks Flow for you using [flow-mcp](https://github.com/GTAI-1/flow-mcp), which you install once in its own folder.

## Setting up (once)

1. **Install flow-mcp** in a folder outside OneDrive (for example `C:\Users\you\flow-mcp`):
   ```
   git clone https://github.com/GTAI-1/flow-mcp.git C:\Users\you\flow-mcp
   cd C:\Users\you\flow-mcp
   npm install
   npm run build
   ```
2. **Tell Kitsu Flow where it is** (from the Ren_Video_Creation folder):
   ```
   flow\flow-video.bat setup C:\Users\you\flow-mcp
   ```
3. **Sign in to each Google account once.** Each account gets its own Chrome window and stays signed in:
   ```
   flow\flow-video.bat login 1
   flow\flow-video.bat login 2
   ```
   In each window: sign in, open (or create) a Flow project, and **leave the window open**. You can give the accounts names in `flow\settings.json`.

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
| `frame N:` | A still. Each frame also uses the frame before it as a reference, so the drawing stays consistent |
| `clip N: frame A to frame B` | A video starting on frame A and ending on frame B. The lines below it say what happens and who says what |

## Good to know

- **Each account's Chrome window must stay open, with a Flow project open.** Don't use that window while a video is being made.
- flow-mcp waits 25–70 seconds between generations, like a person would, so a 6-clip video takes a while. You can leave it running.
- Your files go in `flow\output\` and are never put in git.
- Google changes Flow from time to time. If something stops working, update flow-mcp: in its folder run `git pull`, `npm install` and `npm run build`.
- flow-mcp's own README warns that automated use of Flow may be against Google's terms. Use it on your own accounts, at your own risk.
- Tests (no Google needed): `node --test flow/tests/flow-video.test.js`
