// API tests for the studio server (STUDIO-APP.md A5): the check, story files, path safety, and a render job that is
// started, followed, cancelled and resumed.   node studio/tests/api.test.js
// It starts its own server on port 3012, with its own job list (build/_studio-test/), and removes its test stories.
const fs = require('fs'), path = require('path'), http = require('http');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..'), PORT = 3012;
const results = [];
const ok = (name, cond, detail = '') => { results.push({ name, ok: !!cond, detail }); console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ': ' + detail : ''}`); };

function req(method, p, body, headers = {}) {
  return new Promise((res, rej) => {
    const data = body === undefined ? null : JSON.stringify(body);
    const r = http.request({ host: '127.0.0.1', port: PORT, method, path: p, headers: { Host: `localhost:${PORT}`, ...(data ? { 'Content-Type': 'application/json' } : {}), ...headers } }, x => {
      let s = ''; x.on('data', c => { s += c; }); x.on('end', () => { let j = null; try { j = JSON.parse(s); } catch (_) { /* not JSON */ } res({ status: x.statusCode, body: j, text: s }); });
    });
    r.on('error', rej); if (data) r.write(data); r.end();
  });
}
const wait = ms => new Promise(r => setTimeout(r, ms));
async function until(what, fn, secs) {
  for (let i = 0; i < secs * 4; i++) { const v = await fn(); if (v) return v; await wait(250); }
  throw new Error('Timed out waiting for ' + what);
}
const job = async id => (await req('GET', '/api/jobs')).body.jobs.find(j => j.id === id);

const STORY = 'title: Studio API Test\nplace: meadow\ntime: day\n\nren enters\nren (happy): Hello! This is a test.\nnarrator: The end.\n';

(async () => {
  const stateDir = path.join(ROOT, 'build', '_studio-test');
  fs.rmSync(stateDir, { recursive: true, force: true });
  const server = spawn(process.execPath, [path.join(ROOT, 'studio', 'server', 'server.js')], { env: { ...process.env, KITSU_PORT: String(PORT), KITSU_STUDIO_STATE: '_studio-test' }, stdio: 'ignore' });
  const made = [];
  try {
    await until('the server', async () => (await req('GET', '/api/ping').catch(() => ({}))).status === 200, 20);
    ok('server answers', true);

    // --- safety ---
    ok('another host name is refused', (await req('GET', '/api/ping', undefined, { Host: 'evil.example' })).status === 403);
    for (const bad of ['../../Windows/win.ini', '..\\..\\Windows\\win.ini', 'C:/Windows/win.ini', '/etc/passwd', 'stories/../../package.json', 'stories/../config/voices.json', 'engine/story.js'])
      ok(`story path refused: ${bad}`, (await req('GET', '/api/story?file=' + encodeURIComponent(bad))).status === 403);
    ok('file outside the served folders refused', [403, 404].includes((await req('GET', '/engine/..%2f..%2fpackage.json')).status) && !(await req('GET', '/engine/..%2f..%2fpackage.json')).text.includes('playwright'));
    ok('open-folder outside the project refused', (await req('POST', '/api/open-folder', { path: '../../Windows' })).status === 403);
    ok('delete outside stories refused', (await req('POST', '/api/stories/delete', { file: 'config/voices.json' })).status === 403);

    // --- stories ---
    const n = await req('POST', '/api/stories/new', { name: 'Studio API test ../../x' });
    ok('new story (name made safe)', n.status === 200 && n.body.file === 'stories/studio-api-test-x.txt', n.body && (n.body.file || n.body.error));
    const file = n.body.file; made.push(file);
    const got = await req('GET', '/api/story?file=' + encodeURIComponent(file));
    ok('new story starts from the template', got.status === 200 && /title: Studio API test/.test(got.body.text));
    let put = await req('PUT', '/api/story', { file, text: STORY, mtime: got.body.mtime });
    ok('save', put.status === 200 && fs.readFileSync(path.join(ROOT, file), 'utf8').includes('Hello! This is a test.'));
    const crlf = fs.readFileSync(path.join(ROOT, 'stories', 'demos-and-tests', '_template.txt'), 'utf8').includes('\r\n');
    ok('save keeps the file\'s line endings', fs.readFileSync(path.join(ROOT, file), 'utf8').includes('\r\n') === crlf, crlf ? 'CRLF' : 'LF');
    await wait(30); fs.appendFileSync(path.join(ROOT, file), '# changed in Notepad\n');
    put = await req('PUT', '/api/story', { file, text: STORY + 'ren waves\n', mtime: got.body.mtime });
    ok('a change on disk is not overwritten (409)', put.status === 409);
    put = await req('PUT', '/api/story', { file, text: STORY, force: true });
    ok('"keep mine" saves anyway', put.status === 200);
    const dup = await req('POST', '/api/stories/duplicate', { file, name: 'studio-api-test-copy' }); made.push(dup.body.file);
    ok('duplicate', dup.status === 200 && fs.existsSync(path.join(ROOT, dup.body.file)));
    const ren = await req('POST', '/api/stories/rename', { file: dup.body.file, name: 'studio-api-test-renamed' }); made.push(ren.body.file);
    ok('rename', ren.status === 200 && fs.existsSync(path.join(ROOT, ren.body.file)) && !fs.existsSync(path.join(ROOT, dup.body.file)));
    const del = await req('POST', '/api/stories/delete', { file: ren.body.file }); made.push(del.body.movedTo);
    ok('delete moves to stories/_deleted/', del.status === 200 && del.body.movedTo.startsWith('stories/_deleted/') && fs.existsSync(path.join(ROOT, del.body.movedTo)));
    const list = await req('GET', '/api/stories');
    ok('home list has the story with its status', list.body.stories.some(s => s.file === file && s.status === 'Ready' && s.title === 'Studio API Test'));

    // --- check ---
    let c = await req('POST', '/api/check', { file, text: STORY });
    ok('check: a good story', c.body.errors.length === 0 && c.body.duration > 3 && c.body.planUrl && c.body.voices.length === 2, `${c.body.duration} s`);
    ok('check: the preview plan can be loaded', (await req('GET', c.body.planUrl)).status === 200);
    ok('check: story lines have times', c.body.lineTimes.some(([l]) => l === 6));
    c = await req('POST', '/api/check', { file, text: STORY + 'ren dances wildly\n' });
    ok('check: a broken line is reported on its line', c.body.errors.length === 1 && c.body.errors[0].line === 8, JSON.stringify(c.body.errors[0]));
    c = await req('POST', '/api/check', { file, text: STORY + 'dragon enters\n' });
    ok('check: a missing asset is listed with its line', c.body.missing.some(m => m.name === 'dragon' && m.lines.includes(8)));
    const v = await req('GET', '/api/vocab');
    ok('suggestions come from the engine', v.body.places.includes('cottage garden') && v.body.props.includes('lantern') && v.body.extras.includes('owl') && v.body.moods.includes('happy'));

    // --- a render job: start, progress, cancel, resume ---
    await req('PUT', '/api/story', { file, text: STORY, force: true });
    ok('bad worker number refused', (await req('POST', '/api/jobs', { kind: 'render', file, workers: 0 })).status === 400);
    const start = await req('POST', '/api/jobs', { kind: 'render', file, workers: 1 });
    ok('render job starts', start.status === 200 && ['queued', 'running'].includes(start.body.state));
    const drawing = await until('drawing progress', async () => { const j = await job(start.body.id); return j && j.step === 'drawing' && j.progress > 0.16 ? j : null; }, 240);
    ok('render job reports progress', drawing.progress > 0.15 && drawing.fps > 0, `${Math.round(drawing.progress * 100)}%, ${drawing.scene}, ${drawing.fps} frames/s`);
    await req('POST', '/api/jobs/cancel', { id: start.body.id });
    const cancelled = await until('the cancel', async () => { const j = await job(start.body.id); return j && j.state !== 'running' ? j : null; }, 30);
    ok('render job can be cancelled', cancelled.state === 'cancelled');
    const resumed = await req('POST', '/api/jobs', { kind: 'render', file, workers: 1, resume: true });
    const done = await until('the resumed render', async () => { const j = await job(resumed.body.id); return j && !['running', 'queued'].includes(j.state) ? j : null; }, 600);
    ok('resumed render finishes', done.state === 'done', done.message || '');
    ok('resume carried on from the stopped render', done.log.some(l => /Resuming:/.test(l)), (done.log.find(l => /Resuming:/.test(l)) || '').trim());
    ok('all checks pass', done.results && done.results.length >= 10 && done.results.every(r => r.status !== 'FAIL'), done.results && `${done.results.filter(r => r.status === 'PASS').length} PASS`);
    ok('the video can be played (byte ranges)', (await req('GET', done.video, undefined, { Range: 'bytes=0-99' })).status === 206);
  } catch (e) {
    ok('test run', false, e.message);
  } finally {
    server.kill();
    for (const f of made.filter(Boolean)) fs.rmSync(path.join(ROOT, f), { force: true });
    // stories/_deleted/ only if the test made it (it may hold the owner's deleted stories)
    try { fs.rmdirSync(path.join(ROOT, 'stories', '_deleted')); } catch (_) { /* not empty, or not there */ }
    for (const n of ['studio-api-test-x']) {
      fs.rmSync(path.join(ROOT, 'build', n), { recursive: true, force: true });
      fs.rmSync(path.join(ROOT, 'videos', n), { recursive: true, force: true });   // the video's own folder
    }
    fs.rmSync(path.join(ROOT, 'build', '_studio-test'), { recursive: true, force: true });
    const bad = results.filter(r => !r.ok).length;
    console.log(`\n${results.length - bad}/${results.length} API tests passed.`);
    process.exit(bad ? 1 : 0);
  }
})();
