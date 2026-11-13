// The upload texts written in the story itself, and the checklist for uploading.
//
// A story can end with its own YouTube and Instagram texts, after a line "upload:" (the story stops there; see
// engine/story.js). One-line fields end on their line; a field with nothing after its colon is a block that runs
// until the next field:
//
//   upload:
//   youtube title: The Snore | Ren & Yuki: Couple Things #shorts
//   youtube description:
//   He snores. He will never admit it.
//
//   #RenAndYuki #CoupleThings #Shorts
//   youtube tags: ren and yuki, couple things, cute couple, couple goals, snoring
//   instagram caption:
//   He snores, but he "doesn't snore". 😴🦊🐰
//   Tag the one who does this! 😂
//   instagram hashtags: #RenAndYuki #CoupleThings #CoupleGoals #CuteCouple #Relatable
//
// Inside the upload part, "#RenAndYuki" is text (a hashtag); only "# " (a hash and a space) starts a comment.
// Every field is optional: whatever is left out is made from the story, as before (tools/youtube.js, tools/social.js).
const fs = require('fs'), path = require('path');

const FIELDS = { 'youtube title': 'title', 'youtube description': 'description', 'youtube tags': 'tags', 'instagram caption': 'caption', 'instagram hashtags': 'hashtags' };
const BLOCKS = new Set(['description', 'caption']);
const FIELD = /^(youtube title|youtube description|youtube tags|instagram caption|instagram hashtags)\s*:\s*(.*)$/i;

// What the platforms allow (YouTube Studio and Instagram, November 2026)
const LIMITS = { title: 100, titleGood: 70, description: 5000, tags: 500, caption: 2200, hashtags: 5 };

// The upload part of a story's text -> { present, line, title, description, tags, caption, hashtags, problems, notes }.
// problems: things a platform would refuse or cut; notes: things worth knowing. Both say the line.
function parseUpload(text) {
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  const start = lines.findIndex(l => /^\s*upload\s*:\s*$/i.test(l));
  const u = { present: start >= 0, line: start + 1, title: '', description: '', tags: [], caption: '', hashtags: [], problems: [], notes: [] };
  if (start < 0) return u;
  let block = null, blockLines = [];
  const close = () => {
    if (block) u[block] = blockLines.join('\n').replace(/^\s*\n|\n\s*$/g, '').replace(/\n{3,}/g, '\n\n').trim();
    block = null; blockLines = [];
  };
  for (let i = start + 1; i < lines.length; i++) {
    const raw = lines[i], line = raw.trim(), no = i + 1;
    if (/^#(\s|$)/.test(line)) continue;                       // "# a comment" (a hashtag has no space after #)
    const m = line.match(FIELD);
    if (m) {
      close();
      const key = FIELDS[m[1].toLowerCase()], val = m[2].trim();
      if (BLOCKS.has(key) && !val) { block = key; continue; }
      if (key === 'tags') u.tags = val.split(',').map(s => s.trim()).filter(Boolean);
      else if (key === 'hashtags') u.hashtags = val.split(/\s+/).filter(Boolean).map(h => (h.startsWith('#') ? h : '#' + h));
      else u[key] = val;
      continue;
    }
    if (block) { blockLines.push(raw.replace(/\s+$/, '')); continue; }
    if (line) u.notes.push(`Line ${no}: this upload line isn't a field, so it is left out: "${line}". The fields are: ${Object.keys(FIELDS).join(', ')}.`);
  }
  close();
  checkUpload(u);
  return u;
}

// Platform limits for the texts written in the story (made-up texts are checked where they are made).
function checkUpload(u) {
  const at = `the upload part (line ${u.line})`;
  const P = m => u.problems.push(`${at}: ${m}`), N = m => u.notes.push(`${at}: ${m}`);
  const len = s => [...s].length;   // characters as people count them (an emoji is one)
  if (u.title) {
    if (len(u.title) > LIMITS.title) P(`the YouTube title is ${len(u.title)} characters; YouTube allows ${LIMITS.title}.`);
    else if (len(u.title) > LIMITS.titleGood) N(`the YouTube title is ${len(u.title)} characters; phones show about the first ${LIMITS.titleGood}.`);
  }
  if (/[<>]/.test(u.title + u.description)) P('YouTube doesn\'t allow "<" or ">" in a title or description.');
  if (len(u.description) > LIMITS.description) P(`the YouTube description is ${len(u.description)} characters; YouTube allows ${LIMITS.description}.`);
  const tagChars = u.tags.join(',').length;
  if (tagChars > LIMITS.tags) P(`the YouTube tags are ${tagChars} characters together; YouTube allows ${LIMITS.tags}.`);
  const caption = instagramCaption(u);
  if (caption && len(caption) > LIMITS.caption) P(`the Instagram caption (with its hashtags) is ${len(caption)} characters; Instagram allows ${LIMITS.caption}.`);
  const tagsIn = (caption.match(/(^|\s)#\w+/g) || []).length;
  if (tagsIn > LIMITS.hashtags) N(`the Instagram caption has ${tagsIn} hashtags; Instagram uses at most ${LIMITS.hashtags}, so keep the best ${LIMITS.hashtags}.`);
}

// The story's own Instagram caption with its hashtags under it ('' when the story has none)
function instagramCaption(u) {
  if (!u || (!u.caption && !u.hashtags.length)) return '';
  return [u.caption, u.hashtags.join(' ')].filter(Boolean).join('\n\n');
}

// The upload part of a story file (an empty one when the file can't be read)
function readUpload(storyPath) {
  try { return parseUpload(fs.readFileSync(storyPath, 'utf8')); } catch (_) { return parseUpload(''); }
}

const mmss = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

// UPLOAD.txt: the steps for both platforms, pointing at this video's own files. Written with the YouTube files and
// again with the Instagram files, so it always lists what is in the folder.
function writeGuide(outDir, name, plan) {
  const has = f => fs.existsSync(path.join(outDir, f));
  const title = (plan.meta.title || name).trim(), vertical = plan.height > plan.width;
  const isShort = /short/.test(plan.meta.type || '') || vertical && plan.duration <= 180;
  const series = plan.meta.series, playlist = series ? `Ren & Yuki: ${series}` : null;
  const from = (plan.meta.from || '').trim();
  const pic = vertical ? `${name}-cover.jpg` : `${name}-thumbnail.jpg`;
  const ig = has('instagram') && has(path.join('instagram', 'instagram.txt'));
  const out = [
    `UPLOAD: ${title}`,
    `Video: ${name}.mp4   (${plan.width}x${plan.height}, about ${mmss(plan.duration)})`,
    ...(has(`${name}.mp4`) ? [] : ['       (not made yet: make-video.bat makes it, with everything else in this folder)']), '',
    `YOUTUBE${isShort ? ' SHORT' : ''}   (YouTube Studio > Create > Upload videos, or the YouTube app)`,
    `  1. Upload ${name}.mp4.${isShort ? ' It is vertical and under 3 minutes, so it becomes a Short.' : ''}`,
    `  2. Title, Description, Tags: paste from ${name}-youtube.txt  (Tags are under "Show more").`,
    vertical
      ? `  3. Cover: in the YouTube app pick the frame shown in ${pic} (Shorts covers come from the video).`
      : `  3. Thumbnail: upload ${pic}.`,
    ...(playlist ? [`  4. Playlist: "${playlist}".`] : ['  4. Playlist: pick the one it belongs to.']),
    '  5. Audience: choose "Made for kids" or "No, it\'s not made for kids" (check what fits this video).',
    `  6. Subtitles: Show more > Subtitles > Upload file > With timing > ${name}.srt`,
    '  7. Altered or synthetic content: check this setting (the voices are made by a computer).',
    '  8. Visibility: Public, or Schedule.',
    ...(isShort ? [
      `  9. After it is up: Studio > Content > Shorts > this Short > Details > Related video: pick ${from ? `the full episode (${from})` : 'the video it should lead to (a full episode, or the next Short)'}.`,
      '     That is the only clickable link a Short has (links typed in its description are not clickable).',
    ] : []),
    '',
    'INSTAGRAM REEL   (Instagram app > + > Reel)',
    ...(ig ? [
      `  1. Select the vertical video${vertical ? ` ${name}.mp4` : ' (instagram.txt says which file)'}. Don't add Instagram music: the video has its own.`,
      '  2. Edit cover > Add from camera roll > instagram\\reel-cover.jpg',
      '  3. Caption: paste the CAPTION part of instagram\\instagram.txt (between the lines).',
      '  4. Check the "AI info" label setting (the voices are made by a computer), then Share.',
      '  5. A day or two later: the carousel (instagram\\carousel-01.jpg onwards), as instagram.txt says.',
    ] : [
      '  The Instagram files are not made yet. Drag the story onto make-social.bat (a few seconds), then this list',
      '  shows the steps.',
    ]),
    '',
    ...(has(`${name}-credits.txt`) ? [`Credits (what is in the video and who made it): ${name}-credits.txt. Keep them; they don't go in the description.`, ''] : []),
  ];
  fs.writeFileSync(path.join(outDir, 'UPLOAD.txt'), out.join('\n'));
}

module.exports = { parseUpload, readUpload, checkUpload, instagramCaption, writeGuide, LIMITS };
