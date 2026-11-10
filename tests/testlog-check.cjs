// The test log (testlog.js) in headless Chrome: a test's lines fill in on the card over the picture and stay after it,
// the card closes on its ×, on a change to the regulation, on a tab switch and when the next test starts; the upright's
// tests use it too; it fits a phone in dark mode. Screenshots go to <out_dir>.
// node tests/testlog-check.cjs <out_dir> [base_url]
// Needs a server on the checkout and Chrome (playwright-core from minichord-lab's node_modules, SwiftShader WebGL).
const { chromium } = require('/home/gregory/minichord-lab/tests/node_modules/playwright-core');
const fs = require('fs'), path = require('path');

const [out, base = 'http://localhost:8812'] = process.argv.slice(2);
if (!out) { console.error('usage: node tests/testlog-check.cjs <out_dir> [base_url]'); process.exit(2); }
let failed = 0;
const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failed++; };
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const open = async (viewport, scheme, action = 'grand') => {
    const page = await (await browser.newContext({ viewport, colorScheme: scheme })).newPage();
    page.errors = [];
    page.on('pageerror', e => page.errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') page.errors.push(m.text()); });
    await page.addInitScript(([a]) => { try { localStorage.clear(); localStorage.setItem('regsim-movehelp', 'seen'); localStorage.setItem('regsim-action', a); } catch {} }, [action]);
    await page.goto(`${base}/index.html?t=${Date.now()}`, { timeout: 90000 });
    await page.waitForSelector('#mode table, #mode h2', { state: 'attached', timeout: 60000 });
    await page.waitForTimeout(1500);
    await page.evaluate(() => document.querySelectorAll('aside details:not([open])').forEach(d => { d.open = true; }));
    return page;
  };
  // the log's box and the key inset's overlap, in px² (0: clear of it, or no inset)
  const overInset = page => page.evaluate(() => {
    const b = document.getElementById('testlog').getBoundingClientRect(), i = [...document.querySelectorAll('#inset, #inset-u')].find(e => !e.hidden && e.offsetParent);
    if (!i) return 0;
    const r = i.getBoundingClientRect();
    return Math.max(0, Math.min(b.right, r.right) - Math.max(b.left, r.left)) * Math.max(0, Math.min(b.bottom, r.bottom) - Math.max(b.top, r.top));
  });
  const log = page => page.evaluate(() => {
    const b = document.getElementById('testlog');
    return { shown: !!b && !b.hidden, done: !!b?.classList.contains('done'), name: b?.querySelector('.tl-name').textContent ?? '',
      lines: [...(b?.querySelectorAll('li') ?? [])].map(l => l.textContent) };
  });
  const run = async (page, anchor) => {
    await page.evaluate(a => document.querySelector(`[data-anchor="${a}"]`).click(), anchor);
    await page.waitForFunction(() => !document.querySelector('aside button.test[disabled]'), null, { timeout: 120000 });
    await page.waitForTimeout(300);
  };

  // the grand, on a desktop
  const page = await open({ width: 1400, height: 900 }, 'light');
  await page.evaluate(() => document.querySelector('[data-anchor="test:slowPress"]').click());
  await page.waitForFunction(() => { const b = document.getElementById('testlog'); return b && !b.hidden; }, null, { timeout: 60000 });
  let l = await log(page);
  check(l.shown && !l.done && l.name === 'Press slowly to the bottom', `a running test shows its log: "${l.name}"`);
  await page.waitForFunction(() => !document.querySelector('aside button.test[disabled]'), null, { timeout: 120000 });
  l = await log(page);
  check(l.shown && l.done && l.lines.some(t => /Let-off/.test(t)), `and keeps it when done: ${l.lines.join(' | ')}`);
  await page.screenshot({ path: path.join(out, 'slowpress-done.png') });
  // a warning popped up while the log is up goes under it
  const below = await page.evaluate(() => {
    const t = document.getElementById('toasts'), b = document.getElementById('testlog');
    return t.getBoundingClientRect().top >= b.getBoundingClientRect().bottom;
  });
  check(below, 'messages pop up under the log');
  check(await overInset(page) === 0, 'grand: clear of the key inset');
  // a knob changed: what the log read no longer holds
  await page.evaluate(() => document.querySelector('aside button.nudge').click());
  await page.waitForTimeout(300);
  check(!(await log(page)).shown, 'a change to the regulation closes it');
  // ×
  await run(page, 'test:strikeHold');
  check((await log(page)).shown, 'strike and hold: the log is up');
  await page.click('#testlog .tl-close');
  check(!(await log(page)).shown, 'the × closes it');
  // a test that says nothing (sighting, from a key at rest: the first one lets the held key up, and says so) leaves no card
  await run(page, 'test:sightJack');
  check((await log(page)).lines.some(t => /Jack back under/.test(t)), 'sighting lets the held key up, and the log says so');
  await run(page, 'test:sightJack');
  check(!(await log(page)).shown, 'a test with nothing to say leaves no card');
  // the next test replaces it
  await run(page, 'test:wink');
  await run(page, 'test:topPlay');
  l = await log(page);
  check(l.shown && l.name === 'Press lightly at the top of the key' && !l.lines.some(t => /wink|rest rail/.test(t)), `the next test starts a fresh log: ${l.lines.join(' | ')}`);
  // a tab switch closes it
  await page.click('.tab[data-mode="learn"]'); await page.waitForTimeout(500);
  check(!(await log(page)).shown, 'switching tabs closes it');
  check(page.errors.length === 0, `grand: no page errors${page.errors.length ? ': ' + page.errors.join(' | ') : ''}`);
  await page.context().close();   // (each page draws in software: one at a time)

  // a phone, dark: the weigh-off's lines in the log, fitting the picture's width
  const phone = await open({ width: 390, height: 844 }, 'dark');
  await run(phone, 'test:weighOff');
  l = await log(phone);
  const fit = await phone.evaluate(() => { const b = document.getElementById('testlog').getBoundingClientRect(), s = document.getElementById('stage').getBoundingClientRect();
    return b.left >= s.left && b.right <= s.right && b.bottom <= s.bottom; });
  check(l.shown && l.lines.some(t => /Downweight/.test(t)) && fit, `phone: the weigh-off's log fits the picture (${l.lines.length} lines)`);
  check(!l.lines.some(t => /drop screw|let-off button/.test(t)), `phone: the weigh-off's log keeps to the weights: ${l.lines.join(' | ')}`);
  await phone.screenshot({ path: path.join(out, 'phone-dark-weighoff.png') });
  check(phone.errors.length === 0, `phone: no page errors${phone.errors.length ? ': ' + phone.errors.join(' | ') : ''}`);
  await phone.context().close();

  // the upright (its Sandbox lists no tests: Learn's first step)
  const up = await open({ width: 1400, height: 900 }, 'dark', 'upright');
  await up.click('.tab[data-mode="learn"]'); await up.waitForTimeout(1500);
  const anchor = await up.evaluate(() => [...document.querySelectorAll('[data-anchor^="u-test:"]')].find(b => /Press slowly|let-off|Let-off/i.test(b.textContent))?.dataset.anchor
    ?? document.querySelector('[data-anchor^="u-test:"]')?.dataset.anchor);
  await up.evaluate(a => document.querySelector(`[data-anchor="${a}"]`).click(), anchor);
  await up.waitForFunction(() => !document.querySelector('aside button.test[disabled]'), null, { timeout: 120000 });
  await up.waitForTimeout(300);
  l = await log(up);
  check(l.shown && l.done && l.lines.length > 0, `upright ${anchor}: ${l.lines.join(' | ')}`);
  check(await overInset(up) === 0, 'upright: clear of the key inset');
  await up.screenshot({ path: path.join(out, 'upright-dark.png') });
  check(up.errors.length === 0, `upright: no page errors${up.errors.length ? ': ' + up.errors.join(' | ') : ''}`);

  await browser.close();
  console.log(failed ? `${failed} FAILED` : 'all ok');
  process.exit(failed ? 1 : 0);
})();
