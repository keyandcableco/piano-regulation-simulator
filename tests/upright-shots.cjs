// Renders of the upright drawing (preview/upright.html) in headless Chrome, and the browser-side checks of Gate 2 at rest.
// node tests/upright-shots.cjs <out_dir> [base_url] [view ...]
// Needs a server on the checkout (python3 -m http.server 8812) and Chrome; playwright-core from minichord-lab's
// node_modules (this repo has none). WebGL comes from SwiftShader, so it runs without a GPU.
const { chromium } = require('/home/gregory/minichord-lab/tests/node_modules/playwright-core');
const fs = require('fs');
const path = require('path');

const [out, base = 'http://localhost:8812', ...only] = process.argv.slice(2);
if (!out) { console.error('usage: node tests/upright-shots.cjs <out_dir> [base_url] [view ...]'); process.exit(2); }
const SHOTS = [
  ['side', 'view=action'], ['side-labels', 'view=action&labels=1'], ['whole', 'view=whole&labels=1'], ['angle', 'view=angle&labels=1'],
  ['front', 'view=front&labels=1'], ['back', 'view=back'], ['top', 'view=top'],
  ['head', 'view=head'], ['butt', 'view=butt&labels=1'], ['butt-angle', 'view=buttangle'], ['jack-front', 'view=jackfront'],
  ['check', 'view=check&labels=1'], ['check-angle', 'view=checkangle'], ['wippen', 'view=wippen&labels=1'],
  ['wippen-angle', 'view=wippenangle'], ['damper', 'view=damper&labels=1'], ['damper-angle', 'view=damperangle'],
].filter(([n]) => !only.length || only.includes(n));

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  let failed = 0;
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  for (const [name, query] of SHOTS) {
    await page.goto(`${base}/preview/upright.html?${query}&shot=1&t=${Date.now()}`);
    await page.waitForFunction(() => window.ready, null, { timeout: 60000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(out, `upright-${name}.png`) });
    console.log(path.join(out, `upright-${name}.png`));
  }
  // Gate 2: from the keys the bass neighbor is on the player's left, the treble one on the right
  await page.goto(`${base}/preview/upright.html?view=front&shot=1&t=${Date.now()}`);
  await page.waitForFunction(() => window.ready, null, { timeout: 60000 });
  const xs = await page.evaluate(() => [1, 2].map(i => window.S.screenOf(window.S.notes[i].hammer, [-15, 140, 0]).x));
  const bassLeft = xs[0] < xs[1];
  console.log(`front view: bass neighbor at x ${xs[0].toFixed(0)}, treble at ${xs[1].toFixed(0)}: ${bassLeft ? 'bass on the left, ok' : 'MIRRORED'}`);
  if (!bassLeft) failed++;
  if (errors.length) { console.log('page errors:', errors.join(' | ')); failed++; }
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
