// The sharp in the middle of the grand's three-key model (model.js SHARP): the Sandbox's three keys and the exam show a
// sharp between two naturals a semitone apart, its readings in its own terms, and one key again leaves a natural.
// node tests/sharp-check.cjs [base_url] [out_dir]; needs a server on the checkout and Chrome (playwright-core from
// minichord-lab's node_modules, SwiftShader WebGL), like the other harnesses here. Writes screenshots to out_dir.
const { chromium } = require('/home/gregory/minichord-lab/tests/node_modules/playwright-core');
const path = require('path');
const fs = require('fs');

const [base = 'http://localhost:8812', out = '/tmp/sharp-check'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
let fails = 0;
const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) fails++; };
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, colorScheme: 'light' });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('regsim-movehelp', 'seen'); localStorage.setItem('regsim-level', 'apprentice'); } catch {} });
  await page.goto(`${base}/index.html?t=${Date.now()}`);
  await page.waitForSelector('#mode table', { state: 'attached', timeout: 60000 });
  await page.waitForTimeout(1500);
  const pick = async (cat, sel) => { if (await page.$(`#${cat}`)) await page.click(`#${cat} .cat-btn`); await page.click(sel); };
  const shot = async name => { await page.waitForTimeout(1200); await page.locator('#c').screenshot({ path: path.join(out, `${name}.png`) }); };
  const viewTo = async v => { await pick('cat-view', `#views [data-view="${v}"]`); await page.waitForTimeout(900); };
  const text = () => page.locator('#mode').innerText();

  await page.locator('#mode button', { hasText: 'Three keys' }).click();
  await page.waitForTimeout(1000);
  await shot('three-damperrow');
  for (const v of ['angle', 'keyfront', 'hammerline', 'action']) { await viewTo(v); await shot(`three-${v}`); }
  await viewTo('keyfront');
  let t = await page.locator('body').innerText();
  check(/above the naturals/.test(t), 'Sandbox three keys: the sharp\'s readings say "above the naturals"');
  const z = await page.evaluate(() => window.__regsimNoteZ?.() ?? null);
  if (z) check(Math.abs(Math.abs(z[1]) - 23.5 * 7 / 12) < 0.01, `neighbors a semitone from the sharp (${z.map(v => v.toFixed(2)).join(', ')})`);

  await page.locator('#mode button', { hasText: 'One key' }).click();
  await page.waitForTimeout(800);
  t = await text();
  check(!/above the naturals/.test(t), 'one key again: a natural, read as a natural');
  await viewTo('keyfront'); await shot('one-keyfront');

  // the exam: note 2 is the sharp
  await page.click('.tab[data-mode=exam]');
  await page.waitForTimeout(600);
  await page.locator('#mode button', { hasText: /^Start the/ }).click();
  await page.waitForTimeout(1500);
  t = await text();
  check(/Note 2 \(sharp\)/.test(t), 'exam: note 2 is named the sharp');
  check(/Note 2, the sharp/.test(t), 'exam: the examiner\'s sheet gives the sharp\'s figures');
  await viewTo('keyfront'); await shot('exam-keyfront');
  await viewTo('angle'); await shot('exam-angle');

  check(!errors.length, `no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await browser.close();
  console.log(fails ? `${fails} failed` : 'all passed', `· screenshots in ${out}`);
  process.exit(fails ? 1 : 0);
})();
