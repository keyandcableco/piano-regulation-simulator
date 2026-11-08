// The upright in the app (C6), driven in headless Chrome: the switch both ways, the Sandbox, a part card, Learn's steps
// and every test, the key bar, the move buttons, and no page errors. Screenshots go to <out_dir>.
// node tests/upright-app-check.cjs <out_dir> [base_url] [width height]
// Needs a server on the checkout and Chrome (playwright-core from minichord-lab's node_modules, SwiftShader WebGL).
const { chromium } = require('/home/gregory/minichord-lab/tests/node_modules/playwright-core');
const fs = require('fs');
const path = require('path');

const [out, base = 'http://localhost:8812', w = '1280', h = '900'] = process.argv.slice(2);
if (!out) { console.error('usage: node tests/upright-app-check.cjs <out_dir> [base_url] [width height]'); process.exit(2); }
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: +w, height: +h } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('regsim-movehelp', 'seen'); } catch {} });
  const shot = name => page.screenshot({ path: path.join(out, `${name}.png`) });
  const text = sel => page.$eval(sel, e => e.innerText.replace(/\s+/g, ' ').trim());
  let failed = 0;
  const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failed++; };

  await page.goto(`${base}/index.html?t=${Date.now()}`);
  await page.waitForSelector('#mode table', { state: 'attached', timeout: 60000 });
  check(await page.evaluate(() => !document.getElementById('app').classList.contains('upright')), 'opens on the grand');
  await page.click('#action-switch [data-action="upright"]');
  await page.waitForSelector('#cu', { state: 'visible', timeout: 60000 });
  await page.waitForTimeout(1500);
  check((await page.url()).endsWith('#upright'), 'the address says #upright');
  check(await page.$eval('#c', e => getComputedStyle(e).display === 'none'), 'the grand picture is hidden');
  check((await text('header h1')) === 'Upright action regulation', 'header says upright');
  const tabs = await page.$$eval('.tab', bs => bs.filter(b => getComputedStyle(b).display !== 'none').map(b => b.textContent));
  check(tabs.join() === 'Learn,Find the fault,Sandbox,Exam,Drills', `upright tabs: ${tabs.join(', ')}`);
  check((await text('#mode')).includes('Factory regulation'), 'the Sandbox at factory');
  await shot('upright-sandbox');
  // the key: Play, then the events line
  await page.click('[data-uspeed="1"]');
  await page.click('#keybar button[data-upright]:has-text("Play")');
  await page.waitForTimeout(2500);
  const ev = await page.$eval('.u-lastevent', e => e.textContent);
  check(/Struck|Checked/.test(ev), `Play strikes and checks: "${ev}"`);
  // a part card: the backcheck in the Backcheck view
  await page.click('#views [data-uview="check"]'); await page.waitForTimeout(1200);
  const box = await page.$eval('#cu', c => { const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  // find a backcheck pixel by asking the scene where it is
  const at = await page.evaluate(() => {
    const S = document.getElementById('cu').scene; if (!S) return null;
    const m = S.partMeshes.backcheck?.[0]; if (!m) return null;
    m.geometry.computeBoundingBox(); const b = m.geometry.boundingBox;
    return S.screenOf(m, [(b.min.x + b.max.x) / 2, (b.min.y + b.max.y) / 2, b.max.z]);
  });
  if (at) { await page.mouse.click(box.x + at.x, box.y + at.y); await page.waitForTimeout(400); }
  check(at && await page.$eval('#partpop-u', e => !e.hidden && /Backcheck/.test(e.textContent)), 'clicking the backcheck opens its card');
  await shot('upright-card');
  // the move buttons move the upright's view
  const cam0 = await page.evaluate(() => document.getElementById('cu').scene.camera.position.toArray());
  await page.click('#navpad [data-zoom="-1"]'); await page.waitForTimeout(200);
  const cam1 = await page.evaluate(() => document.getElementById('cu').scene.camera.position.toArray());
  check(cam0.some((v, i) => Math.abs(v - cam1[i]) > 0.5), 'zoom moves the upright camera');
  await page.click('#nav-reset');
  // Learn: every step, every test
  await page.click('.tab[data-mode="learn"]'); await page.waitForTimeout(500);
  check((await text('#mode')).includes('out of regulation on purpose'), 'Learn starts on a de-regulated key');
  const nSteps = await page.$$eval('#mode .steps .pip', ps => ps.length);
  for (let i = 0; i < nSteps - 1; i++) {
    await page.click(`#mode .steps .pip >> nth=${i}`); await page.waitForTimeout(150);
    const tests = await page.$$eval('#mode button.test', bs => bs.map(b => b.textContent));
    for (let j = 0; j < tests.length; j++) {
      await page.click(`#mode button.test >> nth=${j}`);
      await page.waitForFunction(() => !document.querySelector('#mode button.test')?.disabled, null, { timeout: 180000 });
    }
    if (i === 8) await shot('upright-learn-aftertouch');
  }
  const unread = await page.$$eval('#mode td', ts => ts.filter(t => t.textContent === 'not measured').length);
  check(true, `walked ${nSteps - 1} steps; cells still not measured on the last step: ${unread}`);
  await page.click('#mode .steps .pip >> nth=-1'); await page.waitForTimeout(300);
  check((await text('#mode')).includes('Final check'), 'the final check');
  await shot('upright-final');
  // Find the fault: a customer, a test, a repair or two, check the work, the answer, the next customer
  await page.click('.tab[data-mode="diagnose"]'); await page.waitForTimeout(500);
  check((await text('#mode')).includes('A customer says'), 'Find the fault shows a complaint');
  await page.click('#mode button.test >> nth=0');
  await page.waitForFunction(() => !document.querySelector('#mode button.test')?.disabled, null, { timeout: 120000 });
  const repairs = await page.$$eval('#mode button', bs => bs.filter(b => b.textContent.startsWith('🔧')).length);
  check(repairs >= 5, `repair buttons: ${repairs}`);
  await page.click('#actionbar button:has-text("Check my work")'); await page.waitForTimeout(300);
  check((await text('#mode')).includes('Still out'), 'checking the untouched work names what is still out');
  await page.click('#actionbar button:has-text("Show what was wrong")'); await page.waitForTimeout(300);
  check((await text('#mode')).includes('What was wrong'), 'the answer');
  await shot('upright-diagnose');
  await page.click('#actionbar button:has-text("Next customer")'); await page.waitForTimeout(500);
  check(!(await text('#mode')).includes('What was wrong'), 'the next customer starts fresh');
  // the exam: start, move between the notes, run a test, hand it in; the switch waits while it runs
  await page.click('.tab[data-mode="exam"]'); await page.waitForTimeout(400);
  await page.click('#mode button:has-text("Start the exam")'); await page.waitForTimeout(600);
  check((await text('#mode')).includes('Note 1 (bass)'), 'the exam has three notes');
  await page.click('#mode button:has-text("Note 3")'); await page.waitForTimeout(400);
  check(await page.evaluate(() => /note 3/.test(document.querySelector('.u-keypos').textContent)), 'note 3 is the one worked on');
  await page.click('#mode button.test >> nth=0');
  await page.waitForFunction(() => !document.querySelector('#mode button.test')?.disabled, null, { timeout: 120000 });
  await page.click('#action-switch [data-action="grand"]'); await page.waitForTimeout(400);
  check(await page.evaluate(() => document.getElementById('app').classList.contains('upright')), 'the switch waits while the exam runs');
  await page.click('#actionbar button:has-text("Hand it in")'); await page.waitForTimeout(800);
  check(/Score: \d+%/.test(await text('#mode')), `exam scored: ${(await text('#mode')).slice(0, 40)}`);
  await shot('upright-exam-result');
  // drills: the strap plot
  await page.click('.tab[data-mode="drills"]'); await page.waitForTimeout(1500);
  check((await text('#mode')).includes('Strap or no strap') && await page.$('#mode canvas') !== null, 'the strap drill draws its plot');
  await shot('upright-drill');
  // credits, then back to the grand
  await page.click('#credits'); await page.waitForTimeout(300);
  check((await text('#mode')).includes('upright credits'), 'upright credits');
  await page.click('#action-switch [data-action="grand"]'); await page.waitForTimeout(1500);
  check(await page.$eval('#cu', e => getComputedStyle(e).display === 'none') && await page.$eval('#c', e => getComputedStyle(e).display !== 'none'), 'back to the grand picture');
  check((await page.$$eval('.tab', bs => bs.filter(b => getComputedStyle(b).display !== 'none').length)) === 6, 'all six grand tabs back');
  await shot('grand-after-switch');
  check(!errors.length, `page errors: ${errors.join(' | ') || 'none'}`);
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
