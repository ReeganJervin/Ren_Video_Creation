// Starts the browser that draws the frames: Playwright's own Chromium (installed by setup.bat),
// or, if that download never finished, the Chrome or Edge already on this computer.
// { exact: true } draws without the graphics card: slower, but every frame comes out pixel-identical each time.
const { chromium } = require('playwright');
const SOFTWARE = ['--disable-gpu', '--disable-accelerated-2d-canvas', '--disable-gpu-rasterization'];

async function launch(o = {}) {
  const args = o.exact ? SOFTWARE : [];
  try { return await chromium.launch({ args }); } catch (e) {
    if (!/Executable doesn't exist/.test(e.message)) throw e;
    for (const channel of ['chrome', 'msedge']) {
      try {
        const b = await chromium.launch({ channel, args });
        console.log(`  (using the ${channel === 'chrome' ? 'Chrome' : 'Edge'} browser on this computer; run setup.bat again to install the usual one)`);
        return b;
      } catch (_) { /* try the next one */ }
    }
    throw new Error('The drawing browser is not installed. Please run setup.bat first.');
  }
}

module.exports = { launch };
