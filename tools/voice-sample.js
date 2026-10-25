// A short voice sample for one voice in config/voices.json, made the same way as in a video (same voice step).
//
//   node tools/voice-sample.js owl "Hoo! Welcome to my garden!"            -> build/_voice-sample/owl.wav
//   node tools/voice-sample.js owl "Hoo!" --out <dir>                       writes <dir>/owl.wav
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2), oi = args.indexOf('--out'), out = oi >= 0 ? args[oi + 1] : path.join(ROOT, 'build', '_voice-sample');
const [who, text] = args.filter((a, i) => !a.startsWith('--') && i !== oi + 1);
if (!who || !text) { console.error('Usage: node tools/voice-sample.js <voice name> "<text>" [--out <folder>]'); process.exit(1); }
const voices = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'voices.json'), 'utf8'));
if (!voices[who]) { console.error(`There is no voice called "${who}" in config/voices.json.`); process.exit(1); }
// a one-line story that the normal voice step turns into a voice clip (levelled like every line in a video)
const story = path.join(ROOT, 'build', '_voice-sample.txt');
fs.mkdirSync(path.dirname(story), { recursive: true });
fs.writeFileSync(story, `title: Voice sample\n${who === 'narrator' ? 'narrator' : who}: ${text}\n`);
const r = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'make-video.js'), story, '--stills', '0.1'], { cwd: ROOT, stdio: 'inherit' });
const clip = path.join(ROOT, 'build', '_voice-sample', 'voice', '0.wav');
if (r.status !== 0 || !fs.existsSync(clip)) { console.error('The voice sample could not be made (see above).'); process.exit(1); }
fs.mkdirSync(out, { recursive: true });
fs.copyFileSync(clip, path.join(out, `${who}.wav`));
for (const p of fs.readdirSync(path.join(ROOT, 'videos'))) if (p.startsWith('_voice-sample-')) fs.rmSync(path.join(ROOT, 'videos', p));   // the still it needed
console.log(`Voice sample: ${path.join(out, `${who}.wav`)}`);
