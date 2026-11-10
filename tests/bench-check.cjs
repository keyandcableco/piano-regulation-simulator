// The bench bar, the pedal wink and Learn on a phone, in headless Chrome (batch 3: WCI-13, WCI-07, GT-22): undo and
// redo, before and after, save and load in the browser, a link, a teacher's fault opened as a student, the printed
// record, the wink-the-pedal test on three keys, the same bar on the upright, and Learn at 375 px. Screenshots go to
// <out_dir>; look at them.
// node tests/bench-check.cjs <out_dir> [base_url]
// Needs a server on the checkout and Chrome (playwright-core from minichord-lab's node_modules, SwiftShader WebGL).
const { chromium } = require('/home/gregory/minichord-lab/tests/node_modules/playwright-core');
const fs = require('fs');

const [out, base = 'http://localhost:8812'] = process.argv.slice(2);
if (!out) { console.error('usage: node tests/bench-check.cjs <out_dir> [base_url]'); process.exit(2); }
let failed = 0;
const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failed++; };
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const errors = [];
  const open = async (url, viewport = { width: 1280, height: 900 }, { fresh = true } = {}) => {
    const ctx = await browser.newContext({ viewport, permissions: ['clipboard-read', 'clipboard-write'] });
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    if (fresh) await page.addInitScript(() => { try { if (!sessionStorage.getItem('seen')) { localStorage.clear(); sessionStorage.setItem('seen', '1'); } localStorage.setItem('regsim-movehelp', 'seen'); } catch {} });
    await page.goto(url);
    await page.waitForSelector('#mode h2, #mode table', { state: 'attached', timeout: 60000 });
    await page.waitForTimeout(1200);
    return page;
  };
  const tapIn = (page, sel) => page.evaluate(s => document.querySelector(s).click(), sel).then(() => page.waitForTimeout(250));
  const byText = (page, re, root = '#panel') => page.evaluate(([r, src]) => { const b = [...document.querySelectorAll(`${r} button`)].find(x => new RegExp(src).test(x.textContent) && !x.disabled); b?.click(); return !!b; }, [root, re.source]).then(async ok => { await page.waitForTimeout(300); return ok; });
  const text = (page, sel) => page.evaluate(s => document.querySelector(s)?.innerText ?? '', sel);
  const openFold = (page, re) => page.evaluate(src => { const d = [...document.querySelectorAll('details.fold')].find(x => new RegExp(src).test(x.querySelector('summary').textContent)); if (d && !d.open) d.querySelector('summary').click(); }, re.source).then(() => page.waitForTimeout(300));
  const idle = async page => { await page.waitForTimeout(300); await page.waitForFunction(() => document.querySelector('#c').idle() && !document.querySelector('#mode button.test:disabled'), null, { timeout: 120000 }); };
  const url = `${base}/index.html?t=${Date.now()}`;

  // ---------- undo, redo, before and after (the grand's Sandbox) ----------
  let page = await open(url);
  const tap = sel => tapIn(page, sel);
  check(await page.evaluate(() => !document.querySelector('#benchbar').hidden && document.querySelector('#b-undo').disabled), 'the bench bar is under the tabs, Undo off with nothing done');
  await openFold(page, /^Jack/);
  const letoff = () => page.evaluate(() => [...document.querySelectorAll('#mode tr')].find(r => /^.?Let-off/.test(r.textContent.replace(/^[✓✗○]\s*/, '')))?.lastChild.textContent);
  const l0 = await letoff();
  await tap('[data-anchor="letoff−−"]'); await tap('[data-anchor="letoff−−"]');
  const l2 = await letoff();
  check(l0 !== l2 && !(await page.evaluate(() => document.querySelector('#b-undo').disabled)), `two turns of the let-off button: ${l0} to ${l2}, Undo on`);
  await tap('#b-undo'); const l1 = await letoff();
  await tap('#b-undo');
  check((await letoff()) === l0 && l1 !== l0 && l1 !== l2, `Undo twice: back through ${l1} to ${await letoff()}`);
  check(await page.evaluate(() => document.querySelector('#b-undo').disabled && !document.querySelector('#b-redo').disabled), 'nothing left to undo, Redo on');
  await tap('#b-redo'); await tap('#b-redo');
  check((await letoff()) === l2, `Redo twice: ${await letoff()} again`);
  await page.keyboard.press('Control+z');  await page.waitForTimeout(300);
  check((await letoff()) === l1, 'Ctrl+Z undoes');
  await tap('#b-compare');
  const cmp = await text(page, '#benchpanel');
  check(/Before and after/.test(cmp) && await page.evaluate(() => document.querySelectorAll('#benchpanel tr.moved').length >= 1), 'Before / after: the readings that moved are marked');
  const row = await page.evaluate(() => [...document.querySelectorAll('#benchpanel tr')].find(r => /^Let-off/.test(r.textContent))?.innerText.replace(/\s+/g, ' '));
  check(row && row.includes(l0.replace(/\s+/g, ' ').trim().split(' ·')[0]) , `the let-off row holds before and now: ${row}`);
  await page.locator('#panel').screenshot({ path: `${out}/compare.png` });
  await byText(page, /Put it back as it was/);
  check((await letoff()) === l0, 'Put it back as it was: the regulation it started from');
  await tap('#b-undo');
  check((await letoff()) === l1, 'and that too can be undone');
  await tap('#b-compare');

  // ---------- save in the browser, load, a link ----------
  await tap('#b-save');
  await page.fill('#benchpanel input[aria-label="Name for this save"]', 'let-off out');
  await byText(page, /Save in this browser/);
  check(/let-off out/.test(await text(page, '#benchpanel .saves')), 'saved under its name');
  await byText(page, /Factory regulation/, '#mode');
  check((await letoff()) === l0, 'Factory regulation puts it right');
  await byText(page, /^Load$/, '#benchpanel .saves');
  check((await letoff()) === l1, `Load brings the saved regulation back (${await letoff()})`);
  await tap('#b-save');
  await byText(page, /Copy a link to it/);
  const link = await page.evaluate(() => document.querySelector('#benchpanel .linkbox')?.value);
  check(/#r=1[\w-]+$/.test(link ?? ''), `a link to it: …${(link ?? '').slice(-28)}`);
  await page.locator('#panel').screenshot({ path: `${out}/save-panel.png` });
  // storage survives a reload; the link opens the same regulation in a fresh browser
  await page.reload(); await page.waitForSelector('#mode table', { state: 'attached' }); await page.waitForTimeout(1200);
  await tap('#b-save');
  check(/let-off out/.test(await text(page, '#benchpanel .saves')), 'after a reload the save is still listed');
  await page.context().close();
  page = await open(link);
  await openFold(page, /^Jack/);
  check((await letoff()) === l1 && /Sandbox/.test(await text(page, '.tab.on')), `the link opens it in the Sandbox (${await letoff()})`);
  check(!/#r=/.test(page.url()), 'and the code is taken out of the address');
  await page.context().close();
  // a code that isn't one
  page = await open(`${url}#r=1notacode`);
  check(/Sandbox/.test(await text(page, '.tab.on')), 'a broken link opens the page as usual');

  // ---------- a teacher's fault ----------
  await openFold(page, /^Jack/);
  await tapIn(page, '[data-anchor="drop++"]'); await tapIn(page, '[data-anchor="drop++"]');
  await tapIn(page, '#b-save');
  await page.evaluate(() => { const d = document.querySelector('#benchpanel .teach'); if (!d.open) d.querySelector('summary').click(); });
  await page.waitForTimeout(200);
  const draft = await page.evaluate(() => document.querySelector('#benchpanel textarea[aria-label^="What was wrong"]').value);
  check(/drop/i.test(draft), `the answer is drafted from what was turned: ${draft}`);
  await page.fill('#benchpanel textarea[aria-label="What the customer says"]', 'Soft notes buzz on this key.');
  await page.fill('#benchpanel textarea[aria-label^="What was wrong"]', 'TEACHER-ANSWER: the drop screw is two turns high.');
  await page.locator('#panel').screenshot({ path: `${out}/teacher.png` });
  await byText(page, /Copy the student's link/);
  const fault = await page.evaluate(() => document.querySelector('#benchpanel .linkbox')?.value);
  check(/#r=1[\w-]+$/.test(fault ?? '') && !/TEACHER|drop|buzz/i.test(fault), 'the student\'s link doesn\'t show the complaint or the answer');
  const clip = await page.evaluate(() => navigator.clipboard.readText()).catch(() => null);
  check(clip === null || clip === fault, 'and it is on the clipboard');
  await page.context().close();
  page = await open(fault);
  const panel1 = await text(page, '#panel');
  check(/Find the fault/.test(await text(page, '.tab.on')) && /Soft notes buzz on this key/.test(panel1), 'the student\'s link opens Find the fault with the teacher\'s complaint');
  check(!/TEACHER-ANSWER/.test(await page.content()), 'the answer is nowhere on the page yet');
  check(/not measured/.test(panel1), 'readings are hidden until measured');
  await page.locator('#panel').screenshot({ path: `${out}/student.png` });
  await byText(page, /Check my work/);
  check(/still out of spec/.test(await text(page, '#verdict')) && !/TEACHER-ANSWER/.test(await text(page, '#panel')), 'a check says something is out, not what');
  await byText(page, /Show what was wrong/);
  check(/TEACHER-ANSWER: the drop screw is two turns high/.test(await text(page, '#verdict')), 'asked for, the teacher\'s answer shows');

  // ---------- print ----------
  await page.evaluate(() => { window.print = () => { window.__printed = (window.__printed || 0) + 1; }; });
  await openFold(page, /^Jack/); await tapIn(page, '[data-anchor="test:slowPress"]');
  await page.waitForFunction(() => !document.querySelector('#mode button.test:disabled'), null, { timeout: 120000 });   // (the key stays held down)
  await tapIn(page, '#b-print');
  const sheet = await text(page, '#printout');
  check(await page.evaluate(() => window.__printed === 1) && /Grand action regulation record/.test(sheet) && /Printed .*20\d\d/.test(sheet), 'Print makes the record, dated');
  check(/Let-off/.test(sheet) && /passes 3\/64" to 5\/64"/.test(sheet) && /pass/.test(sheet) && /OUT/.test(sheet) && /Find the fault/.test(sheet) && /level/.test(sheet), 'with readings, targets, in or out of spec, the mode and level');
  await page.emulateMedia({ media: 'print' });
  check(await page.evaluate(() => getComputedStyle(document.querySelector('#app')).display === 'none' && getComputedStyle(document.querySelector('#printout')).display === 'block'), 'printed, the record is all there is on the page');
  await page.setViewportSize({ width: 794, height: 1123 });
  await page.screenshot({ path: `${out}/print.png`, fullPage: true });
  await page.emulateMedia({ media: 'screen' });
  await page.context().close();

  // ---------- the pedal: three keys, one underlever set low, a wink ----------
  page = await open(url);
  await byText(page, /^Three keys$/, '#mode');
  await openFold(page, /^Dampers/);
  for (let i = 0; i < 3; i++) await tapIn(page, '[data-anchor="damperGap−−"]');
  await page.evaluate(() => { document.querySelector('#c').said = []; });
  await tapIn(page, '[data-anchor="test:pedalWink"]');
  await page.waitForTimeout(1500);
  await page.locator('#stage').screenshot({ path: `${out}/pedal-wink.png` });
  await idle(page);
  const winked = (await page.evaluate(() => document.querySelector('#c').said)).find(l => /wink of the pedal/.test(l));
  check(/note 1 starts with the line, note 2 starts early, note 3 starts with the line/.test(winked ?? ''), `wink the pedal: ${winked}`);
  const startRow = await page.evaluate(() => [...document.querySelectorAll('#mode table.score tr')].find(r => /Starts on the pedal/.test(r.textContent))?.innerText.replace(/\s+/g, ' '));
  check(/early/.test(startRow ?? '') && /with the line/.test(startRow ?? ''), `the three dampers side by side: ${startRow}`);
  await page.context().close();

  // ---------- the upright: the same bar ----------
  page = await open(`${url}#upright`);
  await page.waitForSelector('#cu', { state: 'visible', timeout: 60000 }); await page.waitForTimeout(1200);
  const capstan = () => page.evaluate(() => [...document.querySelectorAll('#mode .knob')].find(k => /^Capstan/.test(k.textContent))?.querySelector('.knob-head span')?.textContent);
  const c0 = await capstan();
  await tapIn(page, '[data-anchor="u-capstan+"]'); await tapIn(page, '[data-anchor="u-capstan+"]');
  const c2 = await capstan();
  await tapIn(page, '#b-undo');
  check(c0 !== c2 && (await capstan()) !== c2 && (await capstan()) !== c0, `upright: Undo takes back one capstan turn (${c0}, ${c2}, ${await capstan()})`);
  await tapIn(page, '#b-save');
  await page.evaluate(() => { const d = document.querySelector('#benchpanel .teach'); if (!d.open) d.querySelector('summary').click(); });
  await page.fill('#benchpanel textarea[aria-label="What the customer says"]', 'The key feels odd at the top.');
  await page.fill('#benchpanel textarea[aria-label^="What was wrong"]', 'UPRIGHT-ANSWER: the capstan is up.');
  await byText(page, /Copy the student's link/);
  const ufault = await page.evaluate(() => document.querySelector('#benchpanel .linkbox')?.value);
  await page.context().close();
  page = await open(ufault);
  await page.waitForSelector('#cu', { state: 'visible', timeout: 60000 }); await page.waitForTimeout(1500);
  const up = await text(page, '#panel');
  check(/Upright action regulation/.test(up) && /The key feels odd at the top/.test(up) && !/UPRIGHT-ANSWER/.test(up), 'upright: the student\'s link opens the upright\'s Find the fault, the answer hidden');
  await byText(page, /Show what was wrong/);
  check(/UPRIGHT-ANSWER: the capstan is up/.test(await text(page, '#panel')), 'upright: asked for, the answer shows');
  await page.evaluate(() => { window.print = () => { window.__printed = 1; }; });
  await tapIn(page, '#b-print');
  check(/Upright action regulation record/.test(await text(page, '#printout')), 'upright: Print makes its record');
  await page.locator('#panel').screenshot({ path: `${out}/upright-fault.png` });
  await page.context().close();

  // ---------- Learn on a phone (375 px): the picture, the test, its reading and Next all on screen, nothing to scroll sideways ----------
  for (const kind of ['grand', 'upright']) {
    page = await open(kind === 'grand' ? url : `${url}#upright`, { width: 375, height: 740 });
    if (kind === 'upright') { await page.waitForSelector('#cu', { state: 'visible', timeout: 60000 }); await page.waitForTimeout(1200); }
    await tapIn(page, '.tab[data-mode="learn"]'); await page.waitForTimeout(800);
    const steps = await page.evaluate(() => document.querySelector('.stepsel').options.length - 1);
    const bad = [];
    let shot = false;
    for (let i = 0; i < steps; i++) {
      const r = await page.evaluate(() => {
        const aside = document.querySelector('aside'), a = aside.getBoundingClientRect(), bar = document.querySelector('#actionbar').getBoundingClientRect();
        const inView = e => { if (!e) return null; const b = e.getBoundingClientRect(); return b.top >= a.top - 1 && b.bottom <= bar.top + 1 && b.left >= 0 && b.right <= innerWidth; };
        const wide = [...aside.querySelectorAll('*')].filter(e => { const b = e.getBoundingClientRect(); return b.width > 0 && (b.right > innerWidth + 0.5 || b.left < -0.5); }).map(e => e.tagName + '.' + e.className).slice(0, 3);
        const cv = [...document.querySelectorAll('#stage canvas')].find(c => getComputedStyle(c).display !== 'none').getBoundingClientRect();
        return { title: document.querySelector('.stepsel').selectedOptions[0].textContent, tests: document.querySelectorAll('#mode > .row button.test').length, sideways: document.documentElement.scrollWidth > innerWidth || aside.scrollWidth > aside.clientWidth, wide,
          test: inView(document.querySelector('#mode button.test')), table: inView(document.querySelector('#mode table.specs tbody tr')),
          next: [...document.querySelectorAll('#actionbar button')].some(b => /Next|Skip/.test(b.textContent) && b.getBoundingClientRect().bottom <= innerHeight),
          picture: Math.round(cv.height), font: parseFloat(getComputedStyle(document.querySelector('#mode')).fontSize) };
      });
      if (r.sideways || r.wide.length || (r.test === false && r.tests <= 2) || r.table === false || !r.next || r.picture < 240 || r.font < 14) bad.push(`${i + 1} ${r.title}: ${JSON.stringify(r)}`);
      if (!shot && r.test !== null) { shot = true; await page.screenshot({ path: `${out}/learn-phone-${kind}.png` });
        await page.evaluate(() => document.querySelector('#mode details.fold summary').click()); await page.waitForTimeout(200); await page.screenshot({ path: `${out}/learn-phone-${kind}-why.png` });
        await page.evaluate(() => document.querySelector('#mode details.fold summary').click()); }
      await byText(page, /Next step|Skip/, '#actionbar');
    }
    check(bad.length === 0, `${kind} Learn at 375 px: on all ${steps} steps the picture (240 px or more), the first reading, its test (where a step has one or two) and Next are on screen with nothing wider than the panel${bad.length ? ': ' + bad.join(' ;; ') : ''}`);
    check(/Final check/.test(await text(page, '#mode h2')), `${kind}: Next from the last step reaches the final check`);
    // the bench bar and its panels fit too
    await tapIn(page, '#b-save'); await page.evaluate(() => { const d = document.querySelector('#benchpanel .teach'); if (d && !d.open) d.querySelector('summary').click(); });
    await page.waitForTimeout(200);
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.querySelector('aside').scrollWidth <= document.querySelector('aside').clientWidth), `${kind}: the Save / share panel fits a phone`);
    await page.screenshot({ path: `${out}/save-phone-${kind}.png` });
    await page.context().close();
  }

  check(errors.length === 0, `no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await browser.close();
  console.log(failed ? `${failed} FAILED` : 'all ok');
  process.exit(failed ? 1 : 0);
})();
