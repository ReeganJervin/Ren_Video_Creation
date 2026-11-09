// Puts the commands for making a story at the top of every story file (stories\ and shorts\), so each file says
// how to check, watch and make it, its YouTube and Instagram files and (for a wide story) its vertical version.
//   node tools/story-commands.js            add or refresh the commands in every story
//   node tools/story-commands.js --check    only say which stories would change
// The commands go in the comment box at the top, just before its closing ===== line (a story without a box gets
// one). Old one-line hints ("Make it:", "Check:", "Save as:"...) are replaced. Only comment lines change, so every
// video comes out the same. A story's lines move down when its box grows, so the episode Shorts that show part of
// it ("lines: 40-55") are changed to point at the same lines.
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const CHECK = process.argv.includes('--check');

// old hints in the comment box, replaced by the commands
const OLD = /^#\s+(Make it|Make|Check|Watch|Save as|Preview|If it stops[^:]*)\s*:/i;
const MARK = '#  Commands';
const RULE = /^#\s*=+\s*$/;

function storyFiles() {
  const out = [];
  const walk = dir => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name.startsWith('_')) continue;   // the templates and _deleted\
      if (e.isDirectory()) walk(path.join(dir, e.name));
      else if (e.name.endsWith('.txt')) out.push(path.join(dir, e.name));
    }
  };
  for (const d of ['stories', 'shorts']) if (fs.existsSync(path.join(ROOT, d))) walk(path.join(ROOT, d));
  return out;
}
const meta = (lines, key) => { for (const l of lines) { const m = l.trim().match(new RegExp(`^${key}\\s*:\\s*(.+)$`, 'i')); if (m) return m[1].trim(); } return ''; };

// the command lines for a story, with its path as it is typed in the project folder (stories\episodes\...)
function commands(rel, lines) {
  const type = meta(lines, 'type').toLowerCase(), format = meta(lines, 'format').toLowerCase();
  const vertical = format === 'vertical' || (/short/.test(type) && format !== 'wide');
  const node = `node tools\\make-video.js ${rel}`;
  return [
    `${MARK} (run them in the project folder, or drag the story onto the .bat file):`,
    `#    Check it:            check-story.bat ${rel}`,
    `#    Watch it:            preview.bat ${rel}`,
    `#    Make the video:      make-video.bat ${rel}`,
    `#    If it stopped:       resume-video.bat ${rel}`,
    ...(vertical ? [] : [`#    Vertical version:    ${node} --format vertical`]),
    `#    YouTube files only:  ${node} --youtube`,
    `#    Instagram files:     make-social.bat ${rel}`,
  ];
}

// the story with its commands: { lines, eol, text, delta (how far the story lines moved), headLen (the old box) }
function withCommands(file) {
  const rel = path.relative(ROOT, file).replace(/\//g, '\\');
  const text = fs.readFileSync(file, 'utf8'), eol = text.includes('\r\n') ? '\r\n' : '\n', lines = text.split(eol);
  let n = 0;
  while (n < lines.length && lines[n].startsWith('#')) n++;
  const head = lines.slice(0, n), rest = lines.slice(n);
  // the box without an old command block and old hints
  const keep = [];
  let inBlock = false;
  for (const l of head) {
    if (l.startsWith(MARK)) { inBlock = true; continue; }
    if (inBlock && l.startsWith('#    ')) continue;
    inBlock = false;
    if (!OLD.test(l)) keep.push(l);
  }
  const cmds = commands(rel, lines), rules = keep.map((l, i) => (RULE.test(l) ? i : -1)).filter(i => i >= 0);
  let box;
  if (rules.length >= 2) {
    const i = rules[rules.length - 1], above = keep[i - 1];
    box = [...keep.slice(0, i), ...(above.trim() === '#' || RULE.test(above) ? [] : ['#']), ...cmds, ...keep.slice(i)];
  } else if (keep.length) box = [...keep, ...(keep[keep.length - 1].trim() === '#' ? [] : ['#']), ...cmds];
  else box = ['# ============================================================', `#  ${meta(lines, 'title') || path.basename(file, '.txt')}`, '#', ...cmds, '# ============================================================', ''];
  const out = [...box, ...rest];
  return { lines: out, eol, text: out.join(eol), old: text, delta: box.length - head.length, headLen: head.length };
}

const files = storyFiles(), done = new Map();
for (const f of files) done.set(f, withCommands(f));
// episode Shorts that show lines of a story whose lines moved: the same lines, at their new numbers
const byName = new Map(files.map(f => [path.basename(f, '.txt'), f]));
const fixes = [];
for (const f of files) {
  const r = done.get(f), src = r.text.match(/^from\s*:\s*(.+?)\s*$/m), ln = r.text.match(/^lines\s*:\s*(\d+)\s*-\s*(\d+)\s*$/m);
  if (!src || !ln) continue;
  const s = done.get(byName.get(src[1].replace(/\.txt$/i, '').trim()));
  if (!s || !s.delta) continue;
  const move = x => (x > s.headLen ? x + s.delta : x), a = move(+ln[1]), b = move(+ln[2]);
  r.text = r.text.replace(/^(lines\s*:\s*)\d+\s*-\s*\d+/m, `$1${a}-${b}`);
  fixes.push(`${path.relative(ROOT, f)}: lines ${ln[1]}-${ln[2]} -> ${a}-${b}`);
}
const changed = files.filter(f => done.get(f).text !== done.get(f).old);
if (!CHECK) for (const f of changed) fs.writeFileSync(f, done.get(f).text);
console.log(`${changed.length} of ${files.length} stories ${CHECK ? 'would change' : 'updated'}.`);
fixes.forEach(x => console.log('  ' + x));
