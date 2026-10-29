# Kitsu Studio: Asset Kit (new F4, replaces "F4: Prop system")

> **For Claude Code.** This file replaces the "F4: Prop system" section of `ENGINE-ROADMAP.md`. Everything the old F4 promised is still here (props, starter props, prop actions), plus a way to add **any** new thing a story needs.
> **Read first:** `HANDOFF.md`, `PRODUCTION-SYSTEM.md`, `ENGINE-ROADMAP.md`. The global rules **R1–R15** and the review package from `ENGINE-ROADMAP.md` section 1 apply to every part below.
> **Owner:** not a programmer, on Windows. They review every step from images and reports.

---

## 0. The idea, in plain words (for the owner)

When a story needs something the engine doesn't have yet, such as a new house, an animal, an object or a place:

1. **Write the story as if it already exists.** For example: `place: cottage garden`, `owl enters`, `lantern appears at left`.
2. **Run `check-story.bat`.** It doesn't just fail. It lists exactly what's missing:
   ```
   Your story needs 3 new things:
     place:  cottage garden   (line 4)
     extra:  owl              (line 12)
     prop:   lantern          (line 20)
   They are shown as grey placeholders for now, so you can still preview.
   To create them: open Claude Code and type  /new-asset
   ```
3. **You can still preview right away.** Missing things appear as labelled grey placeholders, so you can check the timing and the jokes.
4. **Create each missing thing in one of two ways:**
   - **Option A, Claude Code (best quality):** type `/new-asset` in Claude Code. It reads the missing list, draws each thing in the Ren and Yuki style, shows you pictures, and adds it after you say OK.
   - **Option B, a picture (fastest, no code):** put a PNG file in the `assets` folder with the right name, for example `assets\props\lantern.png`. It works on the next check.
5. **Make the video.** Once something is created, every future story can use it.

---

## 1. Kinds of assets

| Kind | Examples | Story lines that use it | Folder (code) | Folder (pictures) |
|---|---|---|---|---|
| **prop**: small, can be held | lantern, leaf, map, coin, cookie, umbrella | `lantern appears at left`, `ren picks up the lantern` | `engine/props/` | `assets/props/` |
| **set piece**: big, stands on the ground | house, tent, well, tree stump, cart, signpost | `cottage appears at right`, `yuki walks to the cottage` | `engine/props/` (size `big`) | `assets/props/` |
| **place**: a whole background | cottage garden, bakery, mountain path | `place: cottage garden` | `engine/places/` | `assets/places/<name>/` |
| **extra**: a simple animal or creature | owl, squirrel, butterfly, fish, frog | `owl enters from left`, `owl (happy): Hoo!`, `owl flies away` | `engine/extras/` | `assets/extras/` |
| **character**: a full main character | a new friend with every mood and view | everything Ren and Yuki can do | not in this kit | **F8 creature kit** |

- **Extras are deliberately simple.** They have an idle motion, blinks, one or two moods, a simple mouth for talking, and one way of moving (hop, walk, fly, swim or float). They can speak with a speech bubble if they have a voice in `config/voices.json`.
- **Anything that needs full acting** (every mood, three views, hugs, Rig 2.0) is a **character** and belongs to F8. `/new-asset` must say so instead of attempting it.

---

## Part A: asset registry, missing list and placeholders

### A1. One registry for everything
1. Create `engine/assets.js`. It **finds every asset automatically** in:
   - `engine/props/`, `engine/places/` and `engine/extras/` (code-drawn)
   - `assets/props/`, `assets/places/` and `assets/extras/` (pictures, built in Part B)
   - Adding an asset must never need an edit anywhere else (no list to update by hand).
2. **Every asset file exports one description** with:
   - `id` (file name, lowercase with dashes, e.g. `cottage-garden`)
   - `kind` (`prop`, `place` or `extra`)
   - `names`: what a story may call it, including spaces and "the", e.g. `["cottage garden"]`, `["lantern", "old lantern"]`
   - `size`: `small` (held in a paw), `medium` or `big` (set piece), and its height in pixels at character scale
   - `states`, e.g. `closed`/`open`, `off`/`glowing` (optional)
   - `hold`: `one paw` or `both paws`; not for big props
   - `anchors`: where it sits on the ground, where it's held, where a door or opening is (optional)
   - `motion`: optional idle motion, e.g. `sway`, `bob`, `flicker`, `spin`
   - `sounds`: optional sound effects for appear, open, glow and so on, using existing synth sounds
   - `draw(c, t, state, light)`: the drawing. `light` is the place's time-of-day colour tint, so the asset matches day, sunset, dusk and night
   - `credit`: who made it (`Claude Code`, `owner`, or a tool name and licence for pictures)
3. **Move the existing star and heart** into the registry as props, **without changing any pixel** (R1).
4. **Move the five existing places** to the same description format. R1 must hold for every story.

### A2. Basic story lines for any prop or set piece
These are needed now so that new assets can be used at all. The full prop acting comes in Part D.
- `<prop> appears at left|center|right|on the ground|in the sky`
- `<prop> appears next to <name>`
- `<prop> disappears`
- `the <prop> glows` and `the <prop> stops glowing` (if the prop has a glow)
- `the <prop> opens` and `the <prop> closes` (if the prop has those states)
- `<name> walks to the <prop>` (stops beside it, facing it)
- `<name> looks at the <prop>`
- **Set pieces stand behind the characters,** at the ground line of the current place. They stay when the story changes to another place only if the story says so again.
- `place: cottage garden` works like the existing places, including the page-turn transition.

### A3. Basic story lines for extras
- `<extra> enters`, `<extra> enters from left|right`, `<extra> exits to left|right`
- `<extra> flies in`, `<extra> flies away` (for flying extras), `<extra> swims by` (for fish)
- `<extra> hops`, `<extra> looks at <name>`, `<extra> feels <mood>`
- `<extra>: text` and `<extra> (mood): text`, if it has a voice entry
- Ren and Yuki can `look at`, `walk to` and `wave at` an extra.

### A4. The missing list
1. When `parseStory`/`compileStory` meet a name they don't know, in a place where an asset is expected, it is **not** an error any more. Record it as **missing**, with its kind (worked out from the line), its name, and every line number where it's used.
   - `place: X` → missing place
   - `X appears ...`, `the X glows`, `<name> picks up the X` → missing prop
   - `X enters`, `X flies in`, `X:` (speech) → missing extra. A speaking extra also needs a voice, so list that too
2. **Spelling help:** if the name is close to an existing asset (`lanturn`), suggest it: *"Line 20: did you mean 'lantern'?"* Don't treat a typo as a new asset without saying so.
3. `--check` prints the list in the friendly format from section 0, and writes it to `build/<story>/missing-assets.json`. For each missing asset, the JSON holds:
   - `kind` and `name`
   - `lines`, plus the story text of those lines, so `/new-asset` knows how it's used
   - which states and actions the story needs (e.g. `opens`, `glows`, `picks up`)
   - which places and times of day it appears in
4. Truly broken lines (unknown verbs, impossible actions) stay errors, exactly as now.

### A5. Placeholders
- **Preview** (`preview.bat`) and **stills** draw a missing asset as a soft grey rounded box (or a grey silhouette for extras) at the right size class, with its name written on it. A missing place shows a plain grey-blue backdrop with a ground line and the place name.
- **Full render** (`make-video.bat`) **refuses** while anything is missing, with the same list. `--allow-placeholders` overrides that for test renders, and the report then says `NOTE: rendered with N placeholders`.

**Part A review:**
- a test story `stories/demos-and-tests/asset-test.txt` that uses one existing prop (star), one missing prop, one missing set piece, one missing extra and one missing place
- the `--check` output and `missing-assets.json` for it
- stills showing the placeholders, plus a typo suggestion example
- R1 for every story, including the star, heart and places moved into the registry

**Commit message:** `F4A: asset registry, missing list, placeholders`

---

## Part B: picture drop-in (Option B, no code)

### B1. Props, set pieces and extras from PNG files
1. **Naming:** `assets/props/lantern.png` creates the prop `lantern`. A file name with dashes becomes a name with spaces: `old-map.png` → `old map`.
2. **Optional settings file** with the same name, `lantern.txt`, in simple `key: value` lines, so the owner can write it in Notepad:
   ```
   kind: prop            # prop | extra   (default prop; files in assets/extras are extras)
   size: small           # small | medium | big
   height: 90            # height in pixels at character scale (default by size)
   hold: one paw
   motion: flicker       # none | sway | bob | flicker | spin
   glow: yes             # adds a soft glow for "the lantern glows"
   moves: fly            # extras only: walk | hop | fly | swim | float
   credit: drawn by me
   ```
   Every setting has a sensible default, so the PNG alone works.
3. **States as extra pictures:** `chest.png` + `chest-open.png` gives the states `closed`/`open`. `lantern-glowing.png` gives the `glowing` state.
4. **Simple animation as frames:** `owl-1.png`, `owl-2.png` (and so on) play as a flipbook at a speed set by `fps:` in the settings file (default 6). `owl-blink.png` is used for blinks, and `owl-talk.png` for an open mouth while it speaks.
5. **Pictures follow the light:** apply the place's time-of-day tint to the picture, the same way the characters are tinted, so a daytime picture still looks right at sunset and at night.
6. **Facing:** pictures face right by default. `faces: left` in the settings file flips them when needed.

### B2. Places from pictures
1. `assets/places/cottage-garden/` with:
   - `back.png` (required): the background, ideally 1920×1080 or larger
   - `front.png` (optional): a transparent foreground drawn in front of the characters, e.g. grass or flowers
   - `back-sunset.png`, `back-dusk.png`, `back-night.png` (optional): if missing, the engine tints `back.png` for that time of day and adds the shared sky effects where the picture is transparent
   - `place.txt` (optional): `ground: 0.82` (where feet stand, as a share of the height), `spots: 0.25, 0.5, 0.75` (the left/center/right spots), `ambient: birds` (one of the existing ambient sounds), `credit:`
2. A slow, subtle parallax or breathing motion is not needed. Keep picture places still unless the owner asks.

### B3. Safety checks for pictures
- **Size limits:** warn if a picture is very large (over 4000 px), and if a place background is smaller than 1920×1080 (it will look blurry).
- **Transparency:** warn if a prop or extra PNG has no transparent background (it would show a box).
- **Credits are required for pictures.** If `credit:` is missing, `--check` says: *"Please add a credit line to lantern.txt: who made this picture?"*
- Every video writes `videos/<story>/<story>-credits.txt`, listing all assets used and their credits. This matters later if the videos are sold.
- **Copyright note for the docs:** use only pictures you made yourself or from tools whose terms allow commercial use. Don't use pictures found on the internet.

**Part B review:** stills of `asset-test.txt` with all its missing assets replaced by test PNGs, including a two-state prop, a flipbook extra, and a picture place. Show each at day and at night, plus the warnings for a deliberately bad PNG (no transparency, no credit).

**Commit message:** `F4B: picture drop-in for props, extras and places`

---

## Part C: the `/new-asset` command (Option A, Claude Code)

### C1. The style guide
1. Write `STYLE-GUIDE.md`, **taken from the real code** of `engine/ren.js`, `engine/yuki.js` and `engine/places/`:
   - outline colour and thickness at each size
   - the palette (main, shadow, highlight colours)
   - how shading, blush and highlights are drawn
   - how time-of-day tints are applied
   - character scale and ground line
   - **do's and don'ts**, e.g. "rounded shapes, no thin spiky details, no realistic textures"
2. Add a **code template** for each kind: `engine/props/_template.js`, `engine/extras/_template.js`, `engine/places/_template.js`.

### C2. The skill
Create a Claude Code skill at `.claude/skills/new-asset/SKILL.md`, so the owner can type `/new-asset` in Claude Code. It must work in three ways:
- `/new-asset`: read every `build/*/missing-assets.json` and offer to create the missing things one by one
- `/new-asset lantern`: create one asset
- `/new-asset owl: a small round brown owl with big sleepy eyes`: create one asset from the owner's description. The owner may also put a reference image in `reference/` and mention it

The skill's steps, for each asset:
1. **Understand how it's used.** Read the story lines from the missing list, and the states and actions needed. If the asset is really a full character, say it belongs to F8 and stop.
2. **Ask at most one or two short questions** if something important is unclear, such as colour or size. Otherwise choose sensible defaults that fit the series.
3. **Draw it in code** from the template, following `STYLE-GUIDE.md`.
4. **Make a review sheet**, saved in the scratchpad, showing:
   - the asset next to Ren and Yuki at the same scale
   - every state and motion it needs
   - all four times of day
   - for places: the empty place plus Ren and Yuki standing on all three spots
   - for extras: idle, blink, talking and its movement
   - the reference image beside it, if one was given
5. **Look at the sheet yourself, fix problems,** then show it to the owner and **wait for approval**. Change it as often as the owner asks.
6. **After approval:**
   - run `--check` on the story that needed it
   - run R1 for all stories
   - add the asset to the **asset list in STORY-GUIDE.md**, with the story lines it supports
   - commit it as `Add asset: <name>`
7. **Finish with a plain summary:** what was created, the story lines to use, and anything still missing.

### C3. Test the skill end to end
Use the skill itself to create four assets, each with a review stop:
- **lantern** (prop, `off`/`glowing`)
- **cottage** (set piece, with door `closed`/`open`)
- **cottage garden** (place)
- **owl** (extra that flies, blinks and speaks)

Give the owl a voice in `config/voices.json` and make a 5-second sample for the owner to approve. Then remake `asset-test.txt` with no placeholders.

**Part C review:** the four review sheets, the video report for `asset-test.txt` (all 10 checks pass), and the R1 result.

**Commit message:** `F4C: style guide, /new-asset skill, first four assets`

---

## Part D: prop acting and the Season 1 props

**Do this after F3 (Rig 2.0),** because holding and carrying look much better on the new rig. Parts A–C don't need F3.

1. **All prop actions from the old F4 Part B:**
   - `<name> finds the <prop>`
   - `<name> picks up`, `holds up`, `carries`, `puts down`, `drops`, `opens` and `closes the <prop>`
   - `<name> gives the <prop> to <name>`
   - `<name> uses the <prop> on the <prop>`
   - `<name> pulls the <prop>`
   - `the map shows <text>`
   - clear errors for impossible actions, e.g. *"Line 22: Ren isn't holding the sword."*
   - continuity: held props travel with the character between scenes and places; others stay where they were left
   - **extras land on set pieces:** `owl lands on the fence` / `on the roof` / `on the branch`. Set pieces mark where things can perch, and the extra flies there and settles. Since Part C, `<extra> lands` and `<extra> takes off` work on the ground only (added at the owner's request).
2. **Season 1 starter props, made with `/new-asset`:**
   - golden coin with the tree symbol
   - legendary sword with glowing runes
   - old map that unrolls
   - treasure chest (closed, open, overflowing)
   - pile of gold
   - ancient book
   - artefact orb
   - stone door
   - lever
   - shiny pebble
   - cookie
   - umbrella
   - flower
   - **leaf**, which Episode 1 needs
   - **for Season 1, Episodes 3–7** (see `stories/episodes/season-1-plan.md`): the **Great Tree** (a huge set piece with a star-shaped hollow), a **fruit tree** and the **fruit**, the **grey owl** (an older, grumpier owl; its voice is already in `config/voices.json`), the **Dark Cave** (the cave mouth, a set piece on the snowy hill), and a **full moon** for Episode 4
3. **Episode upgrade:** replace the `# LATER:` lines (Ren holding the lantern, his map) with real prop lines. Done in stop 1 (in the drafts now in `stories/early-stories/`); the new Episodes 3–7 use the prop lines directly.
4. **Docs:** a "Props and assets" section in STORY-GUIDE.md, plus `stories/treasure-demo.txt` (a mini treasure hunt of about 2 min).

**Acceptance:** the demo passes all checks, R1 holds, and the error messages are tested with a deliberately broken story.

**As built (stop 1, prop acting):**
- **Lines:** `finds`, `picks up`, `holds` (new: if the prop isn't there yet, it's already in the paw, for the start of a scene), `holds up`, `carries … [to <spot | name | prop>]`, `puts down`, `drops`, `gives … to <name>`, `opens` / `closes`. One prop at a time per character (or the star); big set pieces can't be held.
- **Errors:** "Ren isn't holding the lantern.", "Ren's paws are full: Ren is holding the map. Put it down first.", "Yuki is holding the lantern, not Ren.", "The cottage is too big to pick up.", "Ren can't pick up Yuki.", "The lantern can't open or close.", plus spelling help. Tested with a deliberately broken story.
- **How it's drawn:** a held prop is drawn by the character's own drawing at the near paw (`K.hold.at(c, x, y)`), upright and at world size, in every view (front, three-quarter, side; behind the body in the back view), so it moves with walks, hops, runs and turns. Picking up glides it from the ground to the paw (0.35 s); put down and dropped props land where they were left (a drop bounces). Light (a lit lantern) is drawn after the time-of-day colour at the paw; someone hiding behind another shows only the soft glow.
- **Assets:** `grip` (the y the paw holds) and `hangs` (it hangs from there, like the lantern's handle) in the asset description. New props: `leaf`, `map` (rolled / open), `cookie`.
- **Continuity:** a held prop goes with its holder through a change of place; everything else stays behind. Plans: `holds` and `spots` on a prop record, only when used (R1: every story compiles to the same plan, apart from the asset file list, which grows with every new asset).
- **Episodes 3 and 4:** the `# LATER:` lines are now real: Ren's map (Episode 3), Ren carrying the lantern (Episodes 3 and 4).
- **Stop 2, first part (built, waiting for the owner's review):** the Season 1 episode assets: the Great Tree (set piece with a `slot`, the star-shaped hollow: raising the star beside it puts the star in there), the full moon (`moon: full`), the fruit tree, the fruit, the Dark Cave and the grey owl (an extra with its own `moods`: wide eyes when surprised, happy eyes when laughing).
- **Stop 2, second part (next):** the rest of the Season 1 props, `uses … on …`, `pulls`, `the map shows <text>`, extras landing on set pieces, `stories/demos-and-tests/treasure-demo.txt`.

**Commit message:** `F4D: prop actions, continuity and Season 1 props`

---

## Where this fits

`ENGINE-ROADMAP.md` version 3 already lists the Asset Kit in its build order: Parts A–C were step 3 (done), and Part D is step 10 (after F3).

F5 (places) and F8 (creatures) should **use this kit** rather than build their own lists: new cave and indoor places register as places, and simple creatures start as extras before becoming full characters.

---

## Prompt to give Claude Code

> Read HANDOFF.md, PRODUCTION-SYSTEM.md, ENGINE-ROADMAP.md and ASSET-KIT.md. Implement ASSET-KIT.md Part A only, follow rules R1–R15, and stop for my review with the full review package.
