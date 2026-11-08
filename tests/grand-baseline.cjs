// The grand in the app, recorded so a change to the shared page (C6: the Grand / Upright switch) can be shown to leave
// it as it was: the stage's pixels in the deterministic states (Sandbox at factory, each view, a frozen strike), the
// panel's text in each tab, the key's events on a Play, and any page errors.
// node tests/grand-baseline.cjs <out_dir> [base_url]; then compare two out_dirs with tests/grand-compare.py. Two runs of
// the same code differ only where something animates (the "Let key up" button's pulse), by a few levels.
// Needs a server on the checkout and Chrome (playwright-core from minichord-lab's node_modules, SwiftShader WebGL).
const { chromium } = require('/home/gregory/minichord-lab/tests/node_modules/playwright-core');
const fs = require('fs');
const path = require('path');

const [out, base = 'http://localhost:8812'] = process.argv.slice(2);
if (!out) { console.error('usage: node tests/grand-baseline.cjs <out_dir> [base_url]'); process.exit(2); }
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  // first visit: the move help card stays shut, the level and action are the defaults
  await page.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('regsim-movehelp', 'seen'); } catch {} });
  await page.goto(`${base}/index.html?t=${Date.now()}`);
  await page.waitForSelector('#mode table', { state: 'attached', timeout: 60000 });
  await page.waitForTimeout(1500);
  const record = {};
  const shot = async name => { await page.waitForTimeout(900); await page.locator('#stage canvas#c').screenshot({ path: path.join(out, `${name}.png`) }); };
  const text = sel => page.$eval(sel, e => e.innerText.replace(/\s+/g, ' ').trim());
  record.sandbox = await text('#mode');
  // a button in one of the picture's menus (controls.js): open its category first, where the page has them
  const pick = async (cat, sel) => { if (await page.$(`#${cat}`)) await page.click(`#${cat} .cat-btn`); await page.click(sel); };
  for (const v of ['action', 'angle', 'escapement', 'backcheck', 'dampers']) { await pick('cat-view', `#views [data-view="${v}"]`); await shot(`view-${v}`); }
  // Strike & hold at real speed, then the events line once it has checked
  await pick('cat-view', '#views [data-view="action"]');
  await pick('cat-speed', '[data-speed="1"]');
  await pick('cat-key', '#k-strike'); await page.waitForTimeout(1500);
  record.strike = { keystate: await text('#keystate'), lastevent: await text('#lastevent') };
  await shot('strike-held');
  await page.click('#k-release'); await page.waitForTimeout(1000);
  for (const tab of ['exam', 'drills', 'tools']) {
    await page.click(`.tab[data-mode="${tab}"]`); await page.waitForTimeout(800);
    record[tab] = await text('#mode');
  }
  await page.click('.tab[data-mode="sandbox"]'); await page.waitForTimeout(500);
  await page.click('#credits'); await page.waitForTimeout(300);
  record.credits = await text('#mode');
  record.header = await text('header');
  record.tabs = await page.$$eval('.tab', bs => bs.map(b => `${b.textContent}${b.hidden ? ' (hidden)' : ''}`));
  record.errors = errors;
  fs.writeFileSync(path.join(out, 'record.json'), JSON.stringify(record, null, 1));
  console.log(`wrote ${out}; page errors: ${errors.length ? errors.join(' | ') : 'none'}`);
  await browser.close();
})();
