# Kitsu Studio: Style Guide for new assets

> **For Claude Code** (used by the `/new-asset` skill), and for anyone drawing pictures for `assets\`.
> Taken from the real drawing code: `engine/ren.js`, `engine/yuki.js` and `engine/places/`. When this file and the code disagree, the code wins: update this file.

## 1. The look in one sentence

Soft, round, chibi storybook shapes with **one warm dark-brown outline**, flat warm colours with a gentle top-to-bottom gradient, a small white highlight, and pink blush on anything with a face. Cute and calm, never scary, never realistic.

## 2. Outline

| Rule | Value (from the code) |
|---|---|
| Outline colour | `#4a2616` (warm dark brown). Never black, never grey |
| Character outline | `lineWidth 4` at character scale (so about 4.6 px on screen) |
| Small details (whiskers, inner lines, stitches) | `lineWidth 2–3`, same colour |
| Props and extras | `lineWidth 4` for the silhouette, 2.5 for inner lines |
| Set pieces (big) | `lineWidth 5–6` for the silhouette, 3 for inner lines |
| Joins and caps | `lineJoin = 'round'`, `lineCap = 'round'` everywhere |
| Unions | for shapes made of several parts, use one clean outer outline (Ren's `fillUnion`: stroke at double width under the fill), not an outline on every part |
| Places (backgrounds) | **no outlines** on hills, trees and sky; soft shapes only. Small foreground details (grass, flower stems) may use thin strokes (`lineWidth 3`) in a darker shade of their own colour |

## 3. Colour

- **Main colours are warm and soft** (pastel-to-mid saturation), with a lighter top and a slightly darker bottom: a `createLinearGradient` from top to bottom between a colour's light and dark versions (`fur`, `furL`, `furD` in Ren).
- **Palettes from the characters**, to match against:
  - Ren: fur `#f39a4a` (light `#f9b46e`, dark `#e2802f`), cream `#fff4e4`, dark paws `#5b3020`, scarf `#6c2232`
  - Yuki: fur `#fff7f5` (shade `#f6dfe3`), pink `#f6b3c2` / `#ef93a8`, bow `#f7a8bc`
  - Shared: outline `#4a2616`, eyes `#2e1408`, mouth `#8c2a2e`, blush `rgb(255,128,138)`
- **Shadows** are a darker version of the same colour (never grey or black overlays).
- **Highlights:** one or two small soft white shapes (`rgba(255,255,255,0.5–0.8)`) on the top-left of round things (eyes, glass, metal, apples). No hard specular glints.
- **Blush:** anything with a face gets two soft radial-gradient blush spots, `rgb(255,128,138)` fading to transparent.
- **Wood** `#8a5d3b`–`#9c6a44`, **roof red** `#c8604a`, **warm cream walls** `#f6e3c2`, **leaf green** `#5f9e57`–`#8cc77a`, **gold** `#f4b350`–`#ffc94a`.

## 4. Size and the ground

- Characters are drawn in "character units" and scaled by **KS = 1.15**. Ren stands about **345 px** tall on screen (ears included), Yuki about **330 px** (ears included).
- **Feet stand at (0, 0):** every prop, set piece and extra is drawn with (0, 0) at the middle of where it touches the ground, and goes **up** (negative y).
- Sizes on screen: **small** props about 60–110 px (fits in a paw), **medium** 120–200 px, **big** set pieces 280–420 px (a cottage is about as tall as Ren with his paws up).
- The ground line is the place's `ground(x)`, about **y = 880–905** in the outdoor places. Stage spots are left 560, center 960, right 1360.

## 5. Time of day (don't paint it in)

- Draw every asset **in daytime colours**. The engine colours it for sunset, dusk and night:
  - props and set pieces are drawn with the scenery and get the place's **grade** (a multiply colour)
  - characters and extras get the place's **tint** (a soft colour wash)
- **Things that give light are the exception.** A flame, the glass of a lit lantern, a glowing crystal, magic: put them in `drawLight(c, t, state, light)` (or mark a whole asset `emissive: true`). They are drawn after the time-of-day colour, so they stay bright and look brightest at night. The engine adds a soft warm glow around anything that glows.
- `light = { tau, tint }`: `tau` is 0 day, 1 sunset, 2 dusk, 3 night. Use it only for small extras that should change with the light (a window that is lit at night, for example).

## 6. Movement (deterministic)

- Everything depends only on the time `t` (and fixed seeds): no `Math.random()`, no clocks.
- Idle motion is gentle: `Math.sin(t * 1.5–3)` with small amplitudes (2–6 px, or 0.03–0.08 rad).
- Use the `motion` field for the standard ones: `sway`, `bob`, `flicker`, `spin`.

## 7. Do and don't

| Do | Don't |
|---|---|
| Round, chunky shapes; big simple silhouettes | Thin spiky details, sharp corners, many tiny parts |
| One warm outline colour (`#4a2616`) | Black outlines, outlines in many colours |
| Flat colours with one soft gradient | Realistic textures, noise, photos, hard shadows |
| Big shiny eyes and blush on anything with a face | Realistic animal anatomy, teeth, claws, anything scary |
| Warm, friendly colours that match the palette | Neon colours, very dark or muddy colours |
| Daytime colours (the engine does the night) | Painting the time of day into the asset |
| Light-giving parts in `drawLight` | Glows drawn in `draw` (they'd be darkened at night) |

## 8. Files

- **Code-drawn assets:** `engine/props/<id>.js`, `engine/extras/<id>.js`, `engine/places/<id>.js`. Start from the `_template.js` in each folder. Files starting with `_` are never loaded.
- **Pictures:** `assets\props\`, `assets\extras\`, `assets\places\<id>\` (see "Adding your own pictures" in STORY-GUIDE.md). A picture with the same name as a code-drawn asset is ignored, and the check says so.
- **Review sheet:** `node tools/asset-sheet.js <name>` draws the asset next to Ren and Yuki, in every state and at every time of day.
