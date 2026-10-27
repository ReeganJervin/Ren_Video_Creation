// End-to-end test of the studio app with Playwright (STUDIO-APP.md A5):
// open the studio, create a story, type a broken line and see the error, fix it, see a missing asset, preview it,
// make the voices, render it and see every check pass, then delete it.
//   node studio/tests/e2e.test.js [--out <folder>]   screenshots and a screen recording (MP4) go to <folder>
// It starts its own server on port 3013, with its own job list, and removes everything it made.
const fs = require('fs'), path = require('path'), http = require('http');
const { spawn, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..'), PORT = 3013, URL0 = `http://localhost:${PORT}/`;
const oi = process.argv.indexOf('--out'), OUT = oi > 0 ? path.resolve(process.argv[oi + 1]) : path.join(ROOT, 'build', '_studio-e2e');
const NAME = 'e2e-garden-test', FILE = `stories/${NAME}.txt`;
const STORY = [
  'title: E2E Garden Test', 'place: cottage garden', 'time: dusk', '',
  'ren enters', '+ narrator: Ren visits the garden at dusk.', 'lantern appears next to ren', 'the lantern glows',
  // a new last line every run, so there is always a voice to make
  'ren (happy): What a lovely glow!', 'owl flies in from left', 'owl: Hoo! Good evening.', `narrator: And that was test number ${Date.now() % 1000}.`,
].join('\n');

const results = [];
const ok = (name, cond, detail = '') => { results.push({ name, ok: !!cond }); console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ': ' + detail : ''}`); if (!cond) throw new Error(name); };
const ping = () => new Promise(r => http.get(`${URL0}api/ping`, x => r(x.statusCode === 200)).on('error', () => r(false)));
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  fs.rmSync(path.join(ROOT, 'build', '_studio-test-e2e'), { recursive: true, force: true });
  const server = spawn(process.execPath, [path.join(ROOT, 'studio', 'server', 'server.js')], { env: { ...process.env, KITSU_PORT: String(PORT), KITSU_STUDIO_STATE: '_studio-test-e2e' }, stdio: 'ignore' });
  const browser = await require('../../tools/browser').launch({});
  const shot = (p, n) => p.screenshot({ path: path.join(OUT, n) });
  const errors = [];
  let crashed = false;
  const watch = p => p.on('pageerror', e => errors.push(e.message));
  try {
    for (let i = 0; i < 80 && !(await ping()); i++) await wait(250);
    ok('the studio opens', await ping());

    // ---------- part 1, recorded: write a story and preview it ----------
    const rec = await browser.newContext({ viewport: { width: 1366, height: 768 }, recordVideo: { dir: path.join(OUT, 'rec'), size: { width: 1366, height: 768 } } });
    let page = await rec.newPage(); watch(page);
    await page.goto(URL0);
    await page.getByText('The Long Way Home').waitFor();
    await shot(page, '01-home.png');
    ok('home lists the stories with a status', await page.locator('.badge').count() > 5);

    await page.getByRole('button', { name: '＋ New story' }).click();
    await page.getByRole('dialog').locator('input').fill('E2E Garden Test');
    await shot(page, '02-new-story.png');
    await page.getByRole('dialog').getByRole('button', { name: 'Create' }).click();
    await page.locator('.cm-content').waitFor();
    ok('a new story opens in the editor', page.url().includes(FILE));

    // write it (typed like a person, for the recording)
    const ed = page.locator('.cm-content');
    await ed.click(); await page.keyboard.press('Control+A'); await page.keyboard.press('Delete');
    for (const line of STORY.split('\n')) { await page.keyboard.type(line, { delay: 12 }); await page.keyboard.press('Escape'); await page.keyboard.press('Enter'); }
    await page.locator('.save-state.saved').waitFor({ timeout: 10000 });
    ok('the story is saved to its file', fs.readFileSync(path.join(ROOT, FILE), 'utf8').includes('owl: Hoo! Good evening.'));
    await page.locator('.player iframe').waitFor({ timeout: 20000 });
    await page.getByRole('button', { name: 'Play', exact: true }).waitFor({ state: 'visible' });
    await page.waitForFunction(() => !document.querySelector('.transport .primary')?.hasAttribute('disabled'), null, { timeout: 30000 });
    await shot(page, '03-editor.png');

    // suggestions while typing
    await page.keyboard.type('ren ', { delay: 40 });
    await page.locator('.cm-tooltip-autocomplete').waitFor({ timeout: 5000 });
    ok('suggestions appear after "ren "', await page.locator('.cm-tooltip-autocomplete li').filter({ hasText: 'walks to the lantern' }).count() > 0);
    await page.keyboard.type('wa', { delay: 60 });
    await shot(page, '04-suggestions.png');
    await page.keyboard.press('Escape');

    // a broken line: red underline, the message on hover, and in the side panel
    await page.keyboard.press('Control+Backspace'); await page.keyboard.type('dances wildly', { delay: 30 });
    await page.locator('.cm-lintRange-error').waitFor({ timeout: 10000 });
    await page.locator('.cm-lintRange-error').hover();
    await page.locator('.cm-tooltip-lint').waitFor({ timeout: 5000 });
    ok('a broken line is underlined in red with the message', (await page.locator('.cm-tooltip-lint').innerText()).includes('dances wildly'));
    ok('the side panel lists the line to fix', (await page.locator('.side').innerText()).includes('Line 13'));
    await shot(page, '05-error.png');
    // fixed
    await page.keyboard.press('End'); await page.keyboard.press('Shift+Home'); await page.keyboard.type('ren waves', { delay: 30 });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('.cm-lintRange-error'), null, { timeout: 10000 });
    ok('fixing the line clears the error', await page.locator('.cm-lintRange-error').count() === 0);

    // a missing asset: orange underline and the /new-asset command
    await page.keyboard.press('End'); await page.keyboard.press('Enter'); await page.keyboard.type('dragon enters', { delay: 30 });
    await page.keyboard.press('Escape');
    await page.locator('.cm-lintRange-warning').waitFor({ timeout: 10000 });
    ok('a missing asset is underlined in orange and listed', (await page.locator('.side').innerText()).includes('/new-asset dragon'));
    await page.locator('.cm-lintRange-warning').hover(); await page.locator('.cm-tooltip-lint').waitFor();
    await shot(page, '06-missing.png');
    await page.keyboard.press('Shift+Home'); await page.keyboard.press('Backspace'); await page.keyboard.press('Backspace');
    await page.waitForFunction(() => !document.querySelector('.cm-lintRange-warning'), null, { timeout: 10000 });
    await page.locator('.save-state.saved').waitFor({ timeout: 10000 });

    // preview: click a line to jump there, play, and the playing line is highlighted
    await page.waitForFunction(() => !document.querySelector('.transport .primary')?.hasAttribute('disabled'), null, { timeout: 30000 });
    await page.locator('.cm-line', { hasText: 'owl flies in from left' }).click();
    await wait(800);
    const at = await page.locator('.time').innerText();
    ok('clicking a story line jumps the preview there', !at.startsWith('0:01.0'), at);
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await page.locator('.cm-playing').waitFor({ timeout: 10000 });
    await wait(2500);
    ok('while playing, the current line is highlighted', await page.locator('.cm-playing').count() === 1, await page.locator('.cm-playing').innerText());
    await shot(page, '07-preview-playing.png');
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.locator('.cm-line', { hasText: 'ren (happy)' }).click(); await wait(600);
    await page.getByRole('button', { name: 'Save still' }).click();
    await page.getByText(/Saved videos\//).waitFor({ timeout: 10000 });
    ok('"Save still" saves the frame in videos/<story>/', fs.readdirSync(path.join(ROOT, 'videos', NAME)).some(f => f.startsWith(NAME + '-still-')));
    await wait(1200);
    await rec.close();   // the recording is finished here

    // ---------- part 2: voices, the video, the checks ----------
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    page = await ctx.newPage(); watch(page);
    await page.goto(URL0 + '#/story/' + FILE);
    await page.locator('.cm-content').waitFor();
    await page.getByRole('button', { name: /Make voices/ }).waitFor({ timeout: 20000 });
    await page.getByRole('button', { name: /Make voices/ }).click();
    await page.getByRole('button', { name: 'Voices ready ✓' }).waitFor({ timeout: 300000 });
    ok('"Make voices" makes the voices, and the preview uses them', (await page.locator('.side').innerText()).includes('with every voice made'));
    await page.getByRole('button', { name: 'Make video' }).click();
    await page.getByText('Drawing the frames').waitFor({ timeout: 120000 });
    await wait(1500);
    await page.locator('.render').scrollIntoViewIfNeeded();
    await shot(page, '08-render-progress.png');
    ok('the render shows its progress', /\d+%/.test(await page.locator('.progress-head').innerText()));
    await page.locator('.checks').waitFor({ timeout: 600000 });
    await page.locator('.render').scrollIntoViewIfNeeded();
    await shot(page, '09-render-done.png');
    const rows = await page.locator('.checks li').count(), fails = await page.locator('.checks li.row-fail').count();
    ok('the video is made and every check passes', rows >= 10 && fails === 0, `${rows} checks, ${fails} failed`);
    ok('the video file exists, in its own folder', fs.existsSync(path.join(ROOT, 'videos', NAME, NAME + '.mp4')));
    await page.getByRole('button', { name: '☾ Dark' }).click();
    await page.locator('.right').evaluate(e => e.scrollTo(0, 0));
    await shot(page, '10-dark.png');
    await page.getByRole('button', { name: '☀ Light' }).click();

    // home: rendered, then delete (moved to stories/_deleted/)
    await page.getByRole('button', { name: '← Stories' }).click();
    const row = page.locator('tr', { hasText: 'E2E Garden Test' });
    await row.waitFor();
    ok('home shows the story as rendered', (await row.locator('.badge').innerText()) === 'Rendered');
    await row.getByRole('button', { name: 'Delete' }).click();
    await shot(page, '11-delete.png');
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
    await page.getByText(/Moved to stories\/_deleted\//).waitFor();
    ok('delete moves the story to stories/_deleted/', fs.existsSync(path.join(ROOT, 'stories', '_deleted', NAME + '.txt')));
    await ctx.close();
    ok('no errors in the page', errors.length === 0, errors.join(' | '));
  } catch (e) {
    crashed = true;
    if (!results.length || results[results.length - 1].ok) console.log('FAIL  ' + (e && e.message || e));
  } finally {
    await browser.close().catch(() => {});
    server.kill();
    // the recording as an MP4
    const recDir = path.join(OUT, 'rec'), webm = fs.existsSync(recDir) && fs.readdirSync(recDir).find(f => f.endsWith('.webm'));
    if (webm) {
      spawnSync(require('ffmpeg-static'), ['-loglevel', 'error', '-y', '-i', path.join(recDir, webm), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '23', path.join(OUT, 'studio-writing-and-preview.mp4')]);
      fs.rmSync(recDir, { recursive: true, force: true });
    }
    // remove everything the test made
    for (const f of [FILE, `stories/_deleted/${NAME}.txt`]) fs.rmSync(path.join(ROOT, f), { force: true });
    try { fs.rmdirSync(path.join(ROOT, 'stories', '_deleted')); } catch (_) { /* not empty, or not there */ }
    fs.rmSync(path.join(ROOT, 'build', NAME), { recursive: true, force: true });
    fs.rmSync(path.join(ROOT, 'build', '_studio-test-e2e'), { recursive: true, force: true });
    fs.rmSync(path.join(ROOT, 'videos', NAME), { recursive: true, force: true });   // the video's own folder
    const bad = results.filter(r => !r.ok).length;
    console.log(`\n${results.filter(r => r.ok).length} end-to-end checks passed${bad || crashed ? ', and the test stopped on a failure' : ''}. Screenshots: ${OUT}`);
    process.exit(bad || crashed ? 1 : 0);
  }
})();
