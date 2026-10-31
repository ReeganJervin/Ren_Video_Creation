# Ren & Yuki: Production System Design

> **Status:** written 2026-10-24, updated 2026-10-26. What's built and what comes next is tracked in `ENGINE-ROADMAP.md` (section 2, build order). This file describes the formats and workflows.
> **Read with:** `HANDOFF.md`, which describes the current engine, status and how we work.
> **Goal:** one shared animation engine and **three production workflows:**
> 1. **main episodes** (8–10+ min, 16:9)
> 2. **episode Shorts** (30–60 s, 9:16)
> 3. **independent Shorts** (15–60 s, 9:16)

---

## 1. Principles

1. **One engine, one story file, many renders.** The engine is deterministic: `render(t)` draws any moment exactly the same way every time. So a Short is made by **re-rendering** a part of an episode with vertical framing, not by cropping the finished 16:9 video. Cropping cuts characters off; re-rendering frames them properly.
2. **Keep the existing story syntax.** New features are added as *new* lines or headers. Every current story must keep working unchanged.
3. **No regressions.** Each new feature keeps the pixel-identical check for stories that don't use it, and `--check` must pass on every story.
4. **Design first, then build.** Every feature goes through Part A (design and visuals) → review → Part B (behaviour) → review → commit.
5. **Quality over quantity.** Every video needs a real story beat. This also keeps the channel safe from YouTube's policies on repetitive content.

---

## 2. Folder structure

As set up on 2026-10-27 (the owner's layout):
```
stories/
  episodes/                  the series: episode-01-the-beginning-of-a-friendship.txt, episode-02-..., ...
                             (anything in a folder called "episodes" gets the series intro by default)
  early-stories/             the first little films and drafts
  demos-and-tests/           demos, test stories, and _template.txt (what a new story starts from)
  (new stories start here, in stories/ itself)
shorts/
  standalone/                independent Shorts (9:16): little stories of their own
  episode-shorts/            episode Shorts: "from: episode-05-the-hungry-road" + the lines or scenes to show
videos/
  <story-name>/              each video and all its files (report, chapters, subtitles, thumbnail...)
```
A Short's `from:` is just the episode's file name; it is found in any folder inside `stories/`.
(Planned later: `universe/series-bible.md` and `universe/episode-ideas.md`, see F10.)
`make-video.bat` accepts any of these files. The **type** of each file is set inside it (see section 3).

---

## 3. New story headers and lines

All of these are optional. Without them, a story behaves exactly as it does today.

### 3.1 Format (all types)
```
format: landscape        # 1920x1080 (default, as today)
format: vertical         # 1080x1920 for Shorts
```
Also available on the command line: `make-video.bat story.txt --format vertical`.

### 3.2 Scenes (mainly for episodes)
```
scene: The Hidden Door
place: forest
time: dusk
music: mystery
...lines...

scene: Inside the Rainbow Tree
place: rainbow forest
...
```
- A scene groups lines and can set the place, time, music and weather. Changing place between scenes uses the transition from Prompt 4B.
- Scenes appear in the plan with start and end times. They're used for:
  - **YouTube chapters**, written automatically to `<name>-chapters.txt`
  - **stills**, with `--stills scene:3`
  - **episode Shorts**, by choosing a scene to re-render
  - **reports**, with checks run per scene
- **Music moods:** `music: happy | calm | magical | mystery | adventure | tense | sad | bedtime | none`. Music crossfades between scenes, so a long episode doesn't repeat the same tune for 10 minutes.

### 3.3 Episode Short (type 2)
```
type: episode short
from: episodes/e01-the-rainbow-forest/story.txt
scenes: 4                      # or: scenes: 4-5   or: lines: 120-148
format: vertical
hook: What's behind the tiny door?     # optional big caption for the first 2-3 s
camera: close                          # optional framing override for the whole Short
ending: Watch the full episode!        # end card (2 s); or extra story lines below

# optional new lines that replace the clip's ending:
yuki (surprised): Ren... it's opening!
```
How the engine handles it:
- It compiles the **full episode plan**. Voices come from the cache, so nothing is re-made.
- It renders the chosen time window, with the scene's positions, moods, time of day and props exactly as they are at that moment.
- **Audio:** it re-renders the episode soundtrack for that window, then adds a short fade-in, a fade-out (or a music sting), and the hook and end-card sounds.
- **Vertical framing:** it uses the vertical camera rules (section 4.1) rather than cropping.
- **Length:** it warns if the result is shorter than 15 s or longer than 3 minutes (YouTube's limit). Aim for 30–60 s: that's where Shorts are watched to the end and loop.

### 3.4 Independent Short (type 3)
```
type: short
format: vertical
title: The Last Cookie
place: meadow
time: day
captions: on        # burned-in word captions for viewers watching without sound

# HOOK (0-3 s): start in the middle of the action
...
# SETUP -> TWIST -> PAYOFF
```
- **Faster pacing:** shorter gaps between lines and a quick fade-in.
- **Sound:** a short "sting" on the payoff, and optionally an ending that loops back to the start, which helps on Shorts.

### 3.5 Shared outputs (all types)
Each video can also produce:
- `<name>-thumbnail.png`: 1280×720 for episodes, or a 1080×1920 cover frame for Shorts. You choose the moment with `thumbnail: 12.5` or `thumbnail: scene 3`.
- `<name>.srt`: subtitles from the voice lines.
- `<name>-chapters.txt`: chapters for episodes.
- `<name>-meta.json`: a draft title, description and tags, for a human to edit.

---

## 4. Rendering rules per format

### 4.1 Vertical (9:16) framing
- **Camera:** the default framing is medium or close, centred on whoever is in the scene. A pair stands closer together.
- **Background:** each place needs a **taller composition**, with more sky and more foreground. That's a "vertical layout" added to each place file, not a crop.
- **Safe area:** keep faces, speech bubbles and captions out of the parts the YouTube Shorts app covers:
  - roughly the **bottom 20%** (title, music and buttons)
  - roughly the **right 15%** (like, comment and share buttons)
  - roughly the **top 8%**
- **Bubbles:** they sit above the characters' heads and wrap narrower (about 700 px wide). Narration captions sit at the top, inside the safe area.
- **Title cards:** a smaller font, centred vertically in the upper third.

### 4.2 Long episodes
- **Test the duration limits first:** render a 12-minute test before committing to 10-minute episodes. Check memory use, the voice-cache size, audio rendering length and ffmpeg.
- **Rendering in chunks and resuming:** render scene by scene, keep the finished parts, and continue after a crash with `--resume`. Join the parts with no gap.
- **Parallel rendering:** use several browser pages at once to draw frames. The aim is to make a 10-minute episode in under 15–20 minutes, instead of about 50.
- **Sound:** keep the music varied with scene music moods, and add **ambient sound per place** (Prompt 4B).

---

## 5. The three workflows

### 5.1 Main episode (8–10+ min, 16:9)
1. **Idea:** pick an episode idea from `universe/episode-ideas.md` and check it against the series bible.
2. **Outline:** 5–8 scenes in three acts: setup (about 2 min), challenge (about 5 min), resolution (about 2 min). Give each scene a purpose, a place, a time and a music mood.
3. **Script:** write `story.txt` with `scene:` blocks. You can draft it with a Claude story helper, but a human always edits it.
4. **`check-story.bat`:** fix errors, and check the estimated length of each scene.
5. **`preview.bat`:** watch it with sound and adjust the timing and jokes.
6. **Voices:** use Kokoro for drafts. For release, use human recordings via `voice-overrides`, at least for the main lines.
7. **`make-video.bat`:** render the full video.
8. **Review:** read the report and watch the whole thing once.
9. **Upload:** the video, thumbnail, chapters, subtitles and the edited description.
10. **Shorts:** pick 2–4 moments for episode Shorts.

**Checks added for episodes:**
- every scene is at least 20 s long
- chapters follow YouTube's rules: they start at 0:00, there are at least 3, and each is at least 10 s
- no scene passes 90 s without a voice line or an action, so nothing feels dead
- loudness is checked per scene

### 5.2 Episode Short (30–60 s, 9:16)
1. While watching the finished episode, note the best moments: the funniest exchange, a magical reveal, or a heartwarming beat.
2. Create `episodes/<ep>/shorts/sNN-name.txt` with `from:`, `scenes:` or `lines:`, a `hook:`, and an `ending:`.
3. Run `check-story.bat`. It confirms the length (15 s to 3 min; aim for 30–60 s) and that the chosen scenes or lines exist.
4. Run `make-video.bat`, then review the safe area, the framing and the start and end.
5. **Upload:** link the full episode with the Short's **"Related video"** setting (YouTube Studio > Content > Shorts > Details). Links typed in a Short's description are not clickable.

**Checks added for Shorts:**
- **Length** is 15 s to 3 min (aim for 30–60 s).
- **Safe area:** no bubble, caption or face inside the areas the app covers.
- **First frame:** shows a character within 0.5 s.
- **Audio:** fades in and out cleanly, with no cut-off words at the start or end of the window.

### 5.3 Independent Short (15–60 s, 9:16)
1. Pick an idea from a **Shorts ideas list:** cute, romantic, funny or relatable.
2. Use the four-beat template:
   - **Hook** (0–3 s): start in the middle of a situation.
   - **Setup:** what they want.
   - **Twist:** something goes wrong or turns out unexpected.
   - **Payoff:** a laugh, an "aww" or a surprise.
3. Check, preview and render it. Captions are on by default.

**Example ideas:** sharing an umbrella; the last cookie; Ren practising a compliment and getting flustered; Yuki's ears giving away that she's happy; a surprise picnic gone wrong; a sleepy-day mix-up.

---

## 6. Content guidelines: a family show

Ren & Yuki is for **kids and adults together**, like the best family films (see `ENGINE-ROADMAP.md` section 0.6). The look stays cute and soft; the stories can be deep.

- **Layers for every age:** kids get cute characters, funny moments, magic and clear feelings. Adults get witty dialogue, running jokes, real emotions (loneliness, fear, loss, courage, growing up), mystery and lore that builds across episodes, and foreshadowing that pays off.
- **Stakes without violence:** mystery, suspense, danger and big magic are welcome (dark caves, storms, ruins, a mysterious stranger). Danger is shown through suspense, chases, hiding, puzzles and courage. **Never** fighting, gore, horror, jump scares, swearing, or crude or mean-spirited humour.
- **Romance stays sweet and innocent:** blushing, shy glances, holding paws, sharing an umbrella, small gifts, a cheek-to-cheek hug.
- **YouTube's "Made for Kids":** the owner decides this for each video, honestly, based on who the video is mainly made for. YouTube may treat cute animation as made for kids, so keep every video free of anything unsuitable for children, even when it's aimed at a general audience.
- **Variety:** rotate places, situations, moods and formats. Avoid near-identical videos (YouTube's policy on repetitive content).
- **Character rules** live in the series bible. For example: Ren shows off but always makes things right; Yuki is shy but stubborn and braver than she looks.

---

## 7. Build order

The build order now lives in **`ENGINE-ROADMAP.md`, section 2**, and is updated there after every step. (The phase table that used to be here is out of date.)

---

## 8. Decisions for the owner

1. **Ren and Yuki's relationship:** best friends with a shy crush, or sweethearts? This affects every romantic Short.
2. **Audience setting:** decided: a **family audience** (kids and adults). "Made for Kids" is chosen per video on YouTube; it affects comments, how much ads earn, and some YouTube features.
3. **Shorts length:** stay at 60 s or less (recommended), or use longer Shorts?
4. **Voices:** Kokoro for everything at first, or human actors from the first episode?
5. **Language:** English only at first, or add more languages early?
6. **Release rhythm:** for example, 3 Shorts a week and 1 episode a month.
7. **The first videos:** decided: *The Beginning of a Friendship* is Episode 1 (owner, 2026-10-27), followed by *Into the Forest*, then the owner's arc (2026-10-28): *The Light in the Deep Forest*, *The Great Tree*, *The Hungry Road*, *Ren, Wake Up!* and *The Cave Nobody Enters* (see `stories/episodes/season-1-plan.md`). *The Day Our Adventure Began*, *The Old Lantern* and *The Star Who Waited* are earlier drafts (in `stories/early-stories/`).
