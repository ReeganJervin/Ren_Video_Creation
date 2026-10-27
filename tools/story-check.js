// The story check and the voice bookkeeping, shared by the CMD tools (make-video.js) and the studio app's server,
// so both work from one copy (rule R13).
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { parseStory, compileStory } = require('../engine/story.js');

const ROOT = path.resolve(__dirname, '..');
const VOICE_LUFS = -22;   // every voice line is levelled to this loudness (see levelVoice in make-video.js)

const readVoices = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'config/voices.json'), 'utf8'));
// the build folder name for a story file: build/<name>/, videos/<name>.mp4
const storyName = file => path.basename(file).replace(/\.[^.]+$/, '').replace(/[^\w-]+/g, '-');
// Every video's files go together in their own folder, videos/<story>/: the video, its thumbnail or cover, subtitles,
// description, chapters, credits, check report and stills. A vertical copy (<story>-vertical) goes in the same folder.
const videoFolder = name => name.replace(/-vertical$/, '');
const videoDir = name => path.join(ROOT, 'videos', videoFolder(name));
const videoRel = (name, file = '') => `videos/${videoFolder(name)}/${file}`;
// Videos made before each video had its own folder lie loose in videos/: moves this story's files (exact names only,
// so another story's files are never touched) into videos/<story>/. Returns how many files moved.
function tidyOldVideos(name) {
  const loose = path.join(ROOT, 'videos'), dir = videoDir(name);
  if (!fs.existsSync(loose)) return 0;
  const base = videoFolder(name), mine = new Set();
  for (const n of [base, base + '-vertical']) {
    for (const s of ['.mp4', '.srt', '-thumbnail.jpg', '-cover.jpg', '-description.txt', '-chapters.txt', '-credits.txt', '-report.txt']) mine.add(n + s);
  }
  let moved = 0;
  for (const f of fs.readdirSync(loose)) {
    const still = [base, base + '-vertical'].some(n => f.startsWith(n + '-still-') && f.endsWith('.png'));
    if (!(mine.has(f) || still) || !fs.statSync(path.join(loose, f)).isFile()) continue;
    fs.mkdirSync(dir, { recursive: true });
    fs.renameSync(path.join(loose, f), path.join(dir, f)); moved++;
  }
  return moved;
}

// An extra that speaks needs a voice in config/voices.json: without one, the voice is missing too.
function addMissingVoices(parsed, voices) {
  parsed.beats.filter(b => b.type === 'say' && !b.silent).forEach(b => {
    if (voices[b.who] || b.who === 'narrator' || b.who.startsWith('_')) return;
    const e = parsed.missing.find(x => x.kind === 'voice' && x.id === b.who) || (parsed.missing.push({ kind: 'voice', id: b.who, name: `voice for ${parsed.extras[b.who] ? parsed.extras[b.who].name : b.who}`, lines: [], text: [], needs: ['speaks'], places: [], times: [] }), parsed.missing[parsed.missing.length - 1]);
    e.lines.push(b.line); e.text.push(b.src);
  });
}

// The voice for one line: the speaker's voice from config/voices.json, changed by the line's way of talking
// ("_styles": thinks, whispers, shouts) and, when the story says "mood voices: on", by its mood ("_moods", which a
// voice can change for itself with its own "moods"). speed and pitch multiply, gain (dB) adds; echo and breath are
// effects. null when the speaker has no voice yet.
function lineVoice(b, voices, meta = {}) {
  const base = voices[b.who];
  if (!base) return null;
  const v = { ...base };
  const apply = (k, tag) => {
    if (!k) return;
    if (k.speed) v.speed = +(v.speed * k.speed).toFixed(4);
    if (k.pitch) v.pitch = +(v.pitch * k.pitch).toFixed(4);
    if (k.gain) v.gain = (v.gain || 0) + k.gain;
    if (k.breath) v.breath = Math.max(v.breath || 0, k.breath);
    if (k.echo) v.echo = true;
    Object.assign(v, tag);
  };
  if (meta.moodVoices && b.mood) apply({ ...(voices._moods || {})[b.mood], ...((base.moods || {})[b.mood] || {}) }, { mood: b.mood });
  if (b.style) apply((voices._styles || {})[b.style], { style: b.style });
  delete v.moods;
  return v;
}

// where a voice line is kept in cache/voices/: the raw clip and the levelled one (a line's mood and way of talking
// are part of the key, so a line made again in another mood or way is a new clip; plain lines keep their old keys)
const voiceKey = (text, v) => crypto.createHash('sha1').update(JSON.stringify([text, v.voice, v.speed, v.pitch,
  ...(v.mood || v.style || v.breath || v.echo ? [v.mood || null, v.style || null, v.breath || 0, !!v.echo] : [])])).digest('hex').slice(0, 16);
const cachedVoice = (text, v) => path.join(ROOT, 'cache', 'voices', voiceKey(text, v) + '.wav');
// gain: a voice's own level in dB from config/voices.json ("gain": -2 makes it 2 dB quieter than the others)
const levelledVoice = (cached, gain = 0) => cached.replace(/\.wav$/, `.lv${-(VOICE_LUFS + gain)}s.wav`);
const overrideFile = (name, line) => path.join(ROOT, 'voice-overrides', name, `line-${line}.wav`);

// Settings that depend on the story's folder: stories in episodes/ start with the series intro (unless they say
// "intro: none"). Shorts (shorts/) have no series intro.
function folderDefaults(parsed, file) {
  if (file && /(^|[\\/])episodes[\\/]/.test(path.relative(ROOT, path.resolve(ROOT, file))) && !/(^|[\\/])shorts[\\/]/.test(path.relative(ROOT, path.resolve(ROOT, file))) && !/short/.test(parsed.meta.type || '') && !parsed.meta.intro) parsed.meta.intro = { at: 'start', line: 0 };
  return parsed;
}

// Checks a story's text: { parsed, plan, speech, voices }. plan is null when the lines themselves have errors.
// lens: voice lengths by speech index (estimated when left out); file: the story file, for folder defaults.
function checkStory(text, lens = {}, file = null) {
  const parsed = folderDefaults(parseStory(text), file), voices = readVoices();
  if (parsed.errors.length) return { parsed, plan: null, speech: [], voices };
  const speech = parsed.beats.filter(b => b.type === 'say' && !b.silent);   // (a silent thought has no voice)
  addMissingVoices(parsed, voices);
  return { parsed, plan: compileStory(parsed, lens), speech, voices };
}

module.exports = { ROOT, VOICE_LUFS, readVoices, storyName, videoFolder, videoDir, videoRel, tidyOldVideos, addMissingVoices, lineVoice, voiceKey, cachedVoice, levelledVoice, overrideFile, checkStory, folderDefaults };
