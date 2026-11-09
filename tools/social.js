// The Instagram and Facebook kit (F15): the same Ren & Yuki story, ready for Reels, picture posts and carousels.
// Made with  node tools/make-video.js stories/my-story.txt --social  (or make-social.bat), in videos/<name>-social/:
//   reel-cover.jpg         1080×1920 cover for the Reel (Instagram and Facebook); the title sits inside the middle
//                          3:4 part, which is what Instagram's profile grid shows
//   post.jpg               1080×1350 (4:5) picture post: the best moment with the title
//   carousel-01.jpg ...    1080×1350 slides, like a comic: the title, then moments of the story with their speech
//                          bubbles (the first part of the story only, so the ending isn't spoiled), then "What happens next?"
//   instagram.txt          caption, hashtags and how to post (Reel, picture post, carousel)
//   facebook.txt           caption, hashtags and how to post
//   <name>.en_US.srt       the subtitles, named the way Facebook asks for when you upload them
// Every picture is drawn fresh by the engine (never cropped from the video), in the vertical layout.
const fs = require('fs'), path = require('path');
const { thumbnail, subtitles, summary, SERIES, WHO } = require('./youtube');

const POST = [1080, 1350];        // Instagram's and Facebook's tallest feed picture (4:5)
const GRID_TOP = 240;             // Instagram's profile grid shows a Reel's middle 1080×1440 (3:4): from y 240 to 1680
const SLIDES = 6;                 // story moments in the carousel (plus the title slide and the last slide)

// Moments for the carousel: a speech bubble or the narrator's caption fully shown, spread over the first 75 % of the story (no spoilers),
// avoiding place changes, the intro, the end screen and props appearing, and only when a character is in the
// picture (seen(t) says so; the narrator often speaks before anyone comes in). Returns [{ t, who, text }].
async function moments(view, seen = async () => true) {
  const busy = [
    ...(view.places || []).map(p => [p.t0 - 0.2, p.t1 + 0.3]),
    ...Object.values(view.youtube || {}).map(y => [y.t0 - 0.5, y.t1 + 0.5]),
    ...[view.card].filter(Boolean).map(y => [y.t0 - 0.2, y.t1 + 0.2]),
    ...(view.props || []).flatMap(p => [[p.t0 - 0.1, p.t0 + 1.2], ...(p.t1 !== undefined && p.t1 !== null ? [[p.t1 - 1.2, p.t1 + 0.1]] : [])]),
  ];
  const inBusy = t => busy.some(([a, b]) => t >= a && t <= b), end = view.duration * 0.75;
  // the bubble has popped in after 0.4 s and starts to go 0.3 s before its end; the narrator's caption box takes
  // 0.35 s to come in and 0.45 s to go
  const at = (x, a, b) => ({ t: x.t0 + Math.max(a, Math.min((x.t1 - x.t0) * 0.6, x.t1 - x.t0 - b)), who: x.who || 'narrator', text: x.text });
  const found = [...(view.bubbles || []).map(b => at(b, 0.45, 0.35)), ...(view.captions || []).map(c => at(c, 0.4, 0.5))]
    .filter(m => m.t > 0.8 && m.t < end && !inBusy(m.t)).sort((p, q) => p.t - q.t);
  const all = [];
  for (const m of found) if (await seen(m.t)) all.push(m);
  if (all.length <= SLIDES) return all;
  // one moment from each of SLIDES equal stretches of time, the longest line in each (the most to read)
  const out = [];
  for (let i = 0; i < SLIDES; i++) {
    const a = end * i / SLIDES, b = end * (i + 1) / SLIDES, here = all.filter(m => m.t >= a && m.t < b && !out.includes(m));
    const pick = here.sort((p, q) => q.text.length - p.text.length)[0];
    if (pick) out.push(pick);
  }
  // stretches with no line: fill up with the next unused lines, in story order
  for (const m of all) if (out.length < SLIDES && !out.includes(m)) out.push(m);
  return out.sort((p, q) => p.t - q.t);
}

// A carousel slide: the story's own picture at t (speech bubbles and the narrator's caption box included), with an
// optional big text at the top and a small one at the bottom, and the slide number. Returns a JPEG Buffer.
async function slide(page, t, o = {}) {
  const url = await page.evaluate(async ({ t, clean, top, bottom, n, of }) => {
    const film = document.getElementById('film'), W = film.width, H = film.height;
    const cv = Object.assign(document.createElement('canvas'), { width: W, height: H }), g = cv.getContext('2d');
    if (clean) StudioFilm.frame('medium', null, 0.2);
    try { StudioFilm.render(t, clean); } finally { StudioFilm.frame(null); }
    g.drawImage(film, 0, 0);
    // big outlined text in the series style (as in the thumbnails), on one or two even lines, as big as fits
    const text = (s, y, size0, shade) => {
      let size = size0, lines = [s];
      const words = s.split(/\s+/), fits = ls => ls.every(l => g.measureText(l).width <= W - 110);
      for (;;) {
        g.font = `700 ${size}px Fredoka`; g.wordSpacing = `${Math.round(size * 0.22)}px`;
        if (fits([s])) { lines = [s]; break; }
        let two = null;
        for (let i = 1; i < words.length; i++) { const a = words.slice(0, i).join(' '), b = words.slice(i).join(' '), w = Math.max(g.measureText(a).width, g.measureText(b).width); if (!two || w < two.w) two = { w, ls: [a, b] }; }
        if (two && fits(two.ls)) { lines = two.ls; break; }
        if (size <= 40) { lines = two ? two.ls : [s]; break; }
        size -= 4;
      }
      const lh = size * 1.08, y0 = y < 0 ? H + y - lines.length * lh : y;
      if (shade) {
        // a soft dark band behind the words, so they read on any picture
        const gr = g.createLinearGradient(0, y0 - 60, 0, y0 + lines.length * lh + 60);
        gr.addColorStop(0, 'rgba(30,14,8,0)'); gr.addColorStop(0.5, 'rgba(30,14,8,0.42)'); gr.addColorStop(1, 'rgba(30,14,8,0)');
        g.fillStyle = gr; g.fillRect(0, y0 - 60, W, lines.length * lh + 120);
      }
      g.textAlign = 'center'; g.textBaseline = 'top'; g.lineJoin = 'round';
      lines.forEach((l, i) => {
        const yy = y0 + i * lh;
        g.fillStyle = 'rgba(40,20,10,0.35)'; g.fillText(l, W / 2 + size * 0.04, yy + size * 0.07);
        g.lineWidth = size * 0.17; g.strokeStyle = '#4a2616'; g.strokeText(l, W / 2, yy);
        g.fillStyle = '#fff4e4'; g.fillText(l, W / 2, yy);
      });
    };
    if (top) text(top, 70, 104, false);
    if (bottom) text(bottom, -70, 60, true);
    // the slide number, small, in the top right corner ("3/8")
    if (n) {
      g.wordSpacing = '0px'; g.font = '600 34px Fredoka'; const s = `${n}/${of}`, w = g.measureText(s).width + 36;
      g.fillStyle = 'rgba(30,14,8,0.5)'; g.beginPath(); g.roundRect(W - w - 28, 28, w, 54, 27); g.fill();
      g.fillStyle = '#fff4e4'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, W - 28 - w / 2, 56);
    }
    return cv.toDataURL('image/jpeg', 0.92);
  }, { t, clean: !!o.clean, top: o.top || '', bottom: o.bottom || '', n: o.n || 0, of: o.of || 0 });
  return Buffer.from(url.split(',')[1], 'base64');
}

// The captions: a few lines a person would write, from the story (title, hook, summary), plus a question that
// gets people commenting. The same question for the same story every time.
function question(view) {
  const both = ['ren', 'yuki'].every(id => view.cast.includes(id));
  const star = view.cast.filter(id => WHO[id]).map(id => WHO[id].split(' ')[0])[0];
  const qs = both
    // (couple stories: people send them to their partner, so the question asks for that; STORY-IDEAS.md)
    ? ['Tag your partner who does this! 😂', 'Be honest: are you Ren or Yuki in your relationship? 🦊🐰', 'Has this ever happened to you two? Tell us in the comments! 👇', 'Send this to the Yuki in your life 💛']
    : star ? [`What should ${star} do next? Tell us in the comments! 👇`, `Have you ever felt like ${star}? 💛`, `Tag a friend who would love ${star}! 🌟`]
      : ['What should happen next? Tell us in the comments! 👇'];
  const h = [...(view.meta.title || '')].reduce((s, c) => (s * 31 + c.charCodeAt(0)) >>> 0, 7);
  return qs[h % qs.length];
}
// the story in a few sentences, from the narrator (a Short without a narrator needs none: the hook says it)
const about = view => (view.voice.some(v => v.who === 'narrator') ? [summary(view), ''] : []);
// a couple story: Ren and Yuki together (the stories are now about them as a couple, STORY-IDEAS.md)
const couple = view => ['ren', 'yuki'].every(id => view.cast.includes(id));
const placeTag = view => '#' + (view.meta.place || 'meadow').replace(/(^|-)(\w)/g, (_, a, c) => c.toUpperCase()).replace(/[^\w]/g, '');

// A Reel should be short: Instagram takes up to 3 minutes, but under about 90 seconds works best
function reelNote(view) {
  const D = view.duration, sec = Math.round(D), len = D < 90 ? null : `${Math.floor(sec / 60)} min ${sec % 60} s`;
  if (!len) return [];
  return [`   NOTE: this story is ${len} long. ${D > 180 ? 'That is too long for a Reel (3 minutes at most).' : 'Reels work best under about 90 seconds.'}`,
    '   Make a Short from one scene instead ("type: episode short", see "Shorts" in STORY-GUIDE.md) and post that as the Reel.'];
}

function instagramText(view, f) {
  const title = (view.meta.title || 'A new story').trim(), hook = view.hook && view.hook.text || view.meta.thumbnailText || '';
  // Instagram uses at most 5 hashtags on a post
  const tags = couple(view) ? ['#RenAndYuki', '#CoupleGoals', '#CuteCouple', '#Relatable', '#Animation'] : ['#RenAndYuki', '#Animation', '#Cartoon', '#Storytime', placeTag(view)];
  return [
    `INSTAGRAM: ${title}`, '',
    'CAPTION (copy everything between the lines, and change anything you like)',
    '------------------------------------------------------------',
    `${title} 🦊🐰${hook && hook !== title ? '\n' + hook : ''}`, '',
    ...about(view),
    question(view), '',
    `Follow for more ${SERIES} stories! ✨`, '',
    tags.join(' '),
    '------------------------------------------------------------', '',
    'WHAT TO POST (three kinds of post, all made from this story)',
    `1. A Reel (the most views): the video ${f.reel}${f.reelMade ? '' : `\n   (not made yet: ${f.reelHow})`}`,
    ...reelNote(view),
    '   - When posting, tap "Edit cover", then "Add from camera roll", and choose reel-cover.jpg',
    '   - Turn on "Share to Facebook" and the Reel goes to your Facebook page too',
    '2. A picture post: post.jpg (tell people a new video is out)',
    `3. A carousel (people swipe through, like a comic): carousel-01.jpg to carousel-${String(f.slides).padStart(2, '0')}.jpg, in that order`,
    '   (it shows only the first part of the story, so people watch the Reel to see the ending)', '',
    'TIPS',
    '- Post the Reel first, then the carousel a day or two later, so the same story brings people back twice.',
    '- Answer the first comments in the first hour; Instagram shows a post to more people when people talk.',
    '- Put your YouTube channel link in your Instagram bio ("link in bio" in the last carousel slide).', '',
    "Reminder: the voices are made by a computer. Check Instagram's \"AI info\" label setting before you post.", '',
  ].join('\n');
}

function facebookText(view, f) {
  const title = (view.meta.title || 'A new story').trim(), hook = view.hook && view.hook.text || view.meta.thumbnailText || '';
  return [
    `FACEBOOK: ${title}`, '',
    'CAPTION (copy everything between the lines, and change anything you like)',
    '------------------------------------------------------------',
    `${title} 🦊🐰${hook && hook !== title ? '\n' + hook : ''}`, '',
    ...about(view),
    question(view), '',
    'Watch the full video: [paste your YouTube link here]', '',
    couple(view) ? '#RenAndYuki #CoupleGoals #Relatable' : '#RenAndYuki #FamilyAnimation #Storytime',
    '------------------------------------------------------------', '',
    'WHAT TO POST',
    `1. A Reel: the video ${f.reel}, with reel-cover.jpg as its cover${f.reelMade ? '' : `\n   (not made yet: ${f.reelHow})`}`,
    ...reelNote(view),
    '   (if you turned on "Share to Facebook" on Instagram, it is already there)',
    `2. The wide video as a normal Facebook video${f.wide ? `: ${f.wide}` : ''}, with the YouTube thumbnail.`,
    `   To add subtitles: in the video's settings, "Subtitles and captions", upload ${f.srt} (from this folder)`,
    '3. A picture post: post.jpg, or all the carousel pictures together as one post (people swipe through them)', '',
    'TIPS',
    '- Facebook likes posts that start a conversation: keep the question at the end of the caption.',
    '- Share the post to Facebook groups for families and animation fans (check each group\'s rules first).', '',
    "Reminder: the voices are made by a computer. Check Facebook's \"AI info\" label setting before you post.", '',
  ].join('\n');
}

// All the files. vpage: the engine's page for the vertical story (1080×1920); ppage: the same story with a
// 1080×1350 picture. view: the story as it is seen (an episode Short's own time). Returns the summary line.
async function socialFiles({ vpage, ppage, view, dir, base, reel, reelMade, reelHow, wide }) {
  fs.mkdirSync(dir, { recursive: true });
  // old carousel slides from an earlier run go, so the folder only has this story's
  for (const f of fs.readdirSync(dir)) if (/^carousel-\d+\.jpg$/.test(f)) fs.unlinkSync(path.join(dir, f));
  const made = [], warnings = [];
  // (the title on every picture: the story's thumbnail text, or its hook, or its title)
  const title = (view.meta.thumbnailText || view.hook && view.hook.text || view.meta.title || '').trim();
  // the Reel cover: the cover frame, with its title moved down into the part the profile grid shows
  const cover = await thumbnail(vpage, view, { top: GRID_TOP + 50, text: title });
  fs.writeFileSync(path.join(dir, 'reel-cover.jpg'), cover.jpg);
  made.push(`Reel cover at ${cover.t.toFixed(1)} s`);
  warnings.push(...cover.warnings.map(w => `Reel cover: ${w}`));
  // the picture post, 4:5
  const pview = { ...view, height: POST[1] };
  const post = await thumbnail(ppage, pview, { size: POST, top: 60, text: title });
  fs.writeFileSync(path.join(dir, 'post.jpg'), post.jpg);
  made.push(`picture post at ${post.t.toFixed(1)} s`);
  warnings.push(...post.warnings.map(w => `picture post: ${w}`));
  // the carousel: the title slide, the story moments, then "What happens next?"
  const mains = view.cast.filter(id => !Object.keys(view.extras || {}).includes(id));
  const ms = await moments(view, t => ppage.evaluate(([t, mains]) => StudioFilm.faces(t).some(f => mains.includes(f.id) && !f.cut), [t, mains])), of = ms.length + 2;
  fs.writeFileSync(path.join(dir, 'carousel-01.jpg'), post.jpg);
  for (let i = 0; i < ms.length; i++) fs.writeFileSync(path.join(dir, `carousel-${String(i + 2).padStart(2, '0')}.jpg`), await slide(ppage, ms[i].t, { n: i + 2, of }));
  const lastT = ms.length ? ms[ms.length - 1].t : post.t;
  fs.writeFileSync(path.join(dir, `carousel-${String(of).padStart(2, '0')}.jpg`), await slide(ppage, lastT, { clean: true, top: 'What happens next?', bottom: 'Watch the video: link in bio', n: of, of }));
  made.push(`carousel of ${of} slides`);
  if (!ms.length) warnings.push('the carousel has no story moments (the story has no speech bubbles in its first part)');
  // the subtitles, named for Facebook, and the two captions
  const srt = `${base}.en_US.srt`;
  fs.writeFileSync(path.join(dir, srt), subtitles(view).text);
  const f = { reel, reelMade, reelHow, wide, srt, slides: of };
  fs.writeFileSync(path.join(dir, 'instagram.txt'), instagramText(view, f));
  fs.writeFileSync(path.join(dir, 'facebook.txt'), facebookText(view, f));
  made.push('Instagram and Facebook captions', 'subtitles for Facebook');
  return { ok: true, warn: warnings.length > 0, note: !warnings.length, name: 'Instagram and Facebook files', detail: made.join(', ') + (warnings.length ? '. ' + warnings.join('; ') : '') };
}

module.exports = { socialFiles, moments, question, instagramText, facebookText, POST };
