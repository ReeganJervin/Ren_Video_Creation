// A short voice sample for one voice in config/voices.json, made the same way as in a video (same voice step).
//
//   node tools/voice-sample.js owl "Hoo! Welcome to my garden!"            -> build/_voice-sample/owl.wav
//   node tools/voice-sample.js owl "Hoo!" --out <dir>                       writes <dir>/owl.wav
//   node tools/voice-sample.js ren --moods                                  -> build/_voice-sample/ren-moods.wav
//
// --moods: one line in every mood (with mood voices on), then thinking out loud, whispering and shouting, each one
// after the narrator says its name; for hearing and tuning "_moods" and "_styles" in config/voices.json.
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const { MOODS } = require('../engine/story.js');
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2), oi = args.indexOf('--out'), out = oi >= 0 ? args[oi + 1] : path.join(ROOT, 'build', '_voice-sample');
const moods = args.includes('--moods');
const [who, given] = args.filter((a, i) => !a.startsWith('--') && i !== oi + 1);
if (!who || (!given && !moods)) { console.error('Usage: node tools/voice-sample.js <voice name> "<text>" [--out <folder>]\n   or: node tools/voice-sample.js <character> --moods ["<text>"]'); process.exit(1); }
const voices = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'voices.json'), 'utf8'));
if (!voices[who] || who.startsWith('_')) { console.error(`There is no voice called "${who}" in config/voices.json.`); process.exit(1); }
if (moods && who === 'narrator') { console.error('The narrator has no moods.'); process.exit(1); }
// a story that the normal voice step turns into voice clips (levelled like every line in a video)
const text = given || 'I never thought we would find it, right here in the meadow.';
const lines = !moods ? [`${who === 'narrator' ? 'narrator' : who}: ${text}`]
  : ['mood voices: on', ...MOODS.flatMap(m => [`narrator: ${m[0].toUpperCase() + m.slice(1)}.`, `${who}${m === 'normal' ? '' : ` (${m})`}: ${text}`]),
    ...[['Thinking out loud', 'thinks'], ['Whispering', 'whispers'], ['Shouting', 'shouts']].flatMap(([n, s]) => [`narrator: ${n}.`, `${who} (${s}): ${text}`])];
const story = path.join(ROOT, 'build', '_voice-sample.txt');
fs.mkdirSync(path.dirname(story), { recursive: true });
fs.writeFileSync(story, `title: Voice sample\n${lines.join('\n')}\n`);
const r = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'make-video.js'), story, '--stills', '0.1'], { cwd: ROOT, stdio: 'inherit' });
const clips = lines.filter(l => !/^mood voices/.test(l)).map((_, i) => path.join(ROOT, 'build', '_voice-sample', 'voice', `${i}.wav`));
for (const p of fs.readdirSync(path.join(ROOT, 'videos'))) if (p.startsWith('_voice-sample-')) fs.rmSync(path.join(ROOT, 'videos', p));   // the still it needed
if (r.status !== 0 || clips.some(c => !fs.existsSync(c))) { console.error('The voice sample could not be made (see above).'); process.exit(1); }
fs.mkdirSync(out, { recursive: true });
const file = path.join(out, moods ? `${who}-moods.wav` : `${who}.wav`);
if (!moods) fs.copyFileSync(clips[0], file);
else {
  // every clip in turn, with a short pause after each (a longer one after each sample line)
  const pads = clips.map((_, i) => `[${i}:a]aresample=24000,apad=pad_dur=${i % 2 ? 0.8 : 0.25}[a${i}]`).join(';');
  const g = `${pads};${clips.map((_, i) => `[a${i}]`).join('')}concat=n=${clips.length}:v=0:a=1[out]`;
  const c = spawnSync(ffmpeg, ['-loglevel', 'error', '-y', ...clips.flatMap(f => ['-i', f]), '-filter_complex', g, '-map', '[out]', file]);
  if (c.status !== 0) { console.error('Joining the samples failed: ' + c.stderr); process.exit(1); }
}
console.log(`Voice sample: ${file}`);
