// Moves the files of videos made before each video had its own folder (loose in videos/) into videos/<story>/.
//   node tools/tidy-videos.js
// Only files named exactly after a story in stories/, shorts/ or episodes/ are moved; anything else stays where it is.
const fs = require('fs'), path = require('path');
const { ROOT, storyName, tidyOldVideos, videoRel } = require('./story-check');

const names = [];
const walk = d => { if (!fs.existsSync(d)) return; for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (f.endsWith('.txt')) names.push(storyName(p)); } };
['stories', 'shorts', 'episodes'].forEach(d => walk(path.join(ROOT, d)));
let total = 0;
for (const n of [...new Set(names)].sort((a, b) => b.length - a.length)) {
  const moved = tidyOldVideos(n);
  if (moved) { console.log(`  ${moved} file${moved > 1 ? 's' : ''} -> ${videoRel(n)}`); total += moved; }
}
console.log(total ? `Done: ${total} file${total > 1 ? 's' : ''} moved into their video folders.` : 'Nothing to move: every video already has its own folder.');
