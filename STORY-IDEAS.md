# Story direction: cute look, grown-up stories

> **Owner's decision (2026-11-09).** Ren & Yuki *look* cute, and the animation stays that way. What changes is **who the stories are for**: young adults and couples (about 18–35), with India as the first audience. Everything is in English, for YouTube and Instagram. Families can still enjoy them, but the jokes and feelings come from grown-up life: being in a relationship, missing someone, food, work, sleep, fights and making up.

This is the same idea that made cute-couple series like *Bubu Dudu* and *Milk & Mocha* popular: two soft, simple characters, and moments every couple recognises. People share them with their partner ("this is us 😂"), and that sharing brings the views.

## What we learn from them (the format, not their characters)

| They do this | So Ren & Yuki do this |
|---|---|
| **One small moment** per video, 10–40 seconds | One situation per Short, 25–40 s. No long setup |
| **Everyday couple life**: food, sleep, sulking, missing each other, tiny jealousy, cuddles | Ren and Yuki are a couple, and the stories are about their days together |
| **"This is us" feeling**: viewers see themselves | A hook like `POV: you ask her where to eat` or `When she says "I'm fine"...` |
| **Strong faces, few words** | Big moods (`pouty`, `shy`, `worried`, `laughing`), short lines, `thinks silently` for the funny inner voice |
| **A sweet ending** after the joke | A hug, `hearts float up`, or a soft last line |
| **Posting very often** in a recognisable series | A series name ("Couple Things"), a new Short 4–7 times a week |
| **Made to be sent to someone** | The end card and caption say "Tag the one who…" / "Send this to your Yuki" |

**We never copy** their characters, their names, their drawings, their exact jokes or their sound. We only take the *kind* of video. Ren & Yuki keep their own look, voices and world.

## Who Ren and Yuki are in these stories

- **Ren** (the fox): dramatic, playful, a bit forgetful, always hungry, tries very hard, panics easily, and is a total softie in the end.
- **Yuki** (the bunny): sweet, a little moody, clever, usually wins the argument, says "I'm fine" when she isn't, and secretly loves Ren's silliness.
- Their love is **affectionate and sweet**: hugs, hearts, holding paws, teasing, sulking and making up. Nothing explicit, no fighting, no mean jokes (the "Never" list in `ENGINE-ROADMAP.md` section 0.6 still applies).
- Sometimes they swap roles (Ren sulks, Yuki forgets), so it never gets one-sided.

## The recipe for a Short

1. **Hook** (first 3 s): `hook: POV: ...` or `hook: When he...`. Say the situation people will recognise.
2. **The moment**: 6–14 short lines. Let the faces do the work.
3. **The turn**: a surprise or a punchline (`beat`, `shot: close on ren`, a shout or a silent thought).
4. **The sweet ending**: a hug, hearts or a soft line.
5. **The ending card**: `ending: Tag the one who...`

Keep both of them in the picture with `shot: medium on both` near the top (otherwise the vertical camera shows only whoever is talking). Use `shot: close on ren` just for the punchline, then go back to `shot: medium on both`.

## The Couple Things folder

Every Couple Things story goes in the folder **`couple-things\`**. Start a new one by copying `couple-things\_template.txt` (it shows the five steps of the recipe). Stories in this folder are the **"Couple Things" series**: their YouTube description says "Ren & Yuki: Couple Things" in the title, has the playlist line and series hashtags, and their Instagram caption gets `#CoupleThings`. Make them as usual: `make-video.bat` for the video and the YouTube files, `make-social.bat` for Instagram. They also show in the studio app.

## Examples (in `couple-things\`, all rendered and checked)

| File | The moment |
|---|---|
| `couple-where-to-eat.txt` | "Anything is fine"… but not pizza… then pizza |
| `couple-im-fine.txt` | "I'm fine" is not fine: Ren works out he forgot to call |
| `couple-you-go-first.txt` | Neither will say goodbye first, until morning |
| `couple-what-day-is-it.txt` | "Do you know what day it is?" Ren panics. It's pancake Sunday |

## 30 ideas to write next

Ideas marked ★ need a new prop or place first (ask Claude Code with `/new-asset`).

**Food and daily life**
1. Ren says he isn't hungry, then eats all of Yuki's fries ★ (fries)
2. "Just one bite": Yuki's "one bite" is half the cake ★ (cake)
3. Chai or coffee? The great morning debate ★ (cups)
4. Diet starts Monday. Every Monday
5. Ren cooks for Yuki for the first time, and it's a disaster with a sweet ending ★ (pot)
6. Shopping: "I'm just looking"… four bags later ★ (bags)

**Sleep**
7. Blanket thief at night ★ (blanket)
8. "Five more minutes" (an hour later)
9. Yuki falls asleep in the middle of Ren's long story
10. Ren snores; Yuki tries everything to stop it

**Missing you and texting**
11. "Seen 2 hours ago": the late-reply sulk ★ (phone)
12. Long distance: both look at the same star at night (`star appears`, `music: heartfelt`)
13. A whole call where neither says anything important, and both are happy ★ (phone)
14. The first day apart: Ren pretends he's fine (he is not)

**Little fights and making up**
15. Ren forgot the anniversary (and tries to hide it)
16. Who said "I love you" first? Both say they did
17. Jealous of a butterfly that Yuki thinks is pretty
18. The silent treatment, broken by a single cookie ★ (cookie)
19. "You never listen". Ren repeats everything she said, word for word
20. Saying sorry in the most dramatic way possible (`ren (shouts)`, hearts)

**Sweet moments**
21. Yuki is sad, and Ren just sits with her without saying anything (`sits down`, `music: heartfelt`)
22. Ren practises a compliment and ruins it (like *The Compliment*)
23. First meeting anniversary at the same meadow
24. Yuki teaches Ren to dance; he steps on her paw
25. Walking home; Ren makes the walk longer on purpose

**India and festivals**
26. Diwali: decorating with lanterns; Ren is very proud of one crooked lantern (the `lantern` prop exists)
27. Valentine's week: Rose Day, Chocolate Day… Ren forgets which day it is
28. Monsoon: one umbrella for two ★ (umbrella, rain needs F13 weather)
29. Cricket match on TV vs. date night ★ (TV)
30. Wedding season: Ren tries every outfit ★ (outfits)

## Posting plan

**YouTube:** everything goes on as planned (the episodes, the Shorts and the series). In between, upload the **Couple Things** Shorts, all in their own playlist, **"Ren & Yuki: Couple Things"**.
- Make the playlist once: in YouTube Studio, click **Create** (top right), then **New playlist**.
- When you upload a Couple Things Short, choose that playlist on the **Details** page. The description draft (`videos\<name>-description.txt`) has a PLAYLIST line to remind you, with a place for the playlist link.

**Instagram:** **Couple Things are the main Reels.** In between, post the other Shorts you already have (in `shorts\`), then the carousel of a Couple Things Short a day or two after its Reel.

An example week:

| Day | YouTube | Instagram |
|---|---|---|
| Mon | Couple Things Short | Couple Things Reel |
| Tue | (as planned) | Carousel of Monday's Couple Things |
| Wed | Couple Things Short | Couple Things Reel |
| Thu | (as planned) | Another Short (from `shorts\`) |
| Fri | Couple Things Short | Couple Things Reel |
| Sat | (as planned) | Another Short (from `shorts\`) |
| Sun | Episode or longer story, when one is ready | Picture post: "new episode on YouTube, link in bio" |

- **Same time each day.** Evenings tend to suit couples, but check YouTube Analytics and Instagram insights to see when *your* viewers are online.
- **Language:** everything in English. Facebook is on hold for now.
- **Watch what works:** after 2–3 weeks, make more of the kind that got the most shares and saves.
