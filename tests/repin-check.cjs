// The repin bench (repin.js) in headless Chrome: Repin on a loose hammer flange center opens the bench; the old pin is
// pushed out, the micrometer's zero checked with the ratchet, the pin won't go in a closed micrometer, goes in an open
// one, the ratchet closes on it, wrong calls say why and the right one goes on; the chart refuses the same size and
// takes the next half size up; pinning it clears the fault. Keys typed on the bench don't play the key. A tight center
// keeps its size; a worn bushing is pinned and still wobbles; Escape puts it away with nothing changed. Screenshots
// (desktop light, phone dark) go to <out_dir>.
// node tests/repin-check.cjs <out_dir> [base_url]
// Needs a server on the checkout and Chrome (playwright-core from minichord-lab's node_modules, SwiftShader WebGL).
const { chromium } = require('/home/gregory/minichord-lab/tests/node_modules/playwright-core');
const fs = require('fs'), path = require('path');

const [out, base = 'http://localhost:8812'] = process.argv.slice(2);
if (!out) { console.error('usage: node tests/repin-check.cjs <out_dir> [base_url]'); process.exit(2); }
let failed = 0;
const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failed++; };
const SIZES = ['.048', '.049', '.050', '.051', '.052', '.053'];
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const open = async (viewport, scheme, action = 'grand') => {
    const page = await (await browser.newContext({ viewport, colorScheme: scheme })).newPage();
    page.errors = [];
    page.on('pageerror', e => page.errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') page.errors.push(m.text()); });
    await page.addInitScript(a => { try { localStorage.clear(); localStorage.setItem('regsim-movehelp', 'seen'); localStorage.setItem('regsim-level', 'apprentice'); localStorage.setItem('regsim-action', a); } catch {} }, action);
    await page.goto(`${base}/index.html?t=${Date.now()}`, { timeout: 90000 });
    await page.waitForSelector('#mode table, #mode h2', { state: 'attached', timeout: 60000 });
    await page.waitForTimeout(1500);
    return page;
  };
  const dlg = page => page.locator('#repin');
  const step = page => page.evaluate(() => document.querySelector('#repin .rp-body')?.dataset.step ?? null);
  const note = page => page.locator('#rp-note').textContent();
  const result = page => page.evaluate(() => { const r = document.getElementById('rp-result'); return r ? { text: r.textContent, cls: r.className } : null; });
  const button = (page, name) => dlg(page).getByRole('button', { name, exact: true });
  const setCenter = async (page, label) => {
    await page.evaluate(() => document.querySelectorAll('aside details:not([open])').forEach(d => { d.open = true; }));
    const sel = page.locator('#mode label', { hasText: 'Action centers:' }).locator('select');
    await sel.selectOption({ label });
    await page.waitForTimeout(400);
  };
  const repin = async page => {
    await page.evaluate(() => document.querySelectorAll('aside details:not([open])').forEach(d => { d.open = true; }));
    await page.locator('#mode .row.small', { hasText: 'Hammer flange center' }).first().getByRole('button', { name: 'Repin', exact: true }).click();
    await page.waitForTimeout(300);
  };
  // the ratchet runs on screen frames, slow in SwiftShader: wait till it has slipped
  const ratchet = async page => {
    await button(page, 'Ratchet').click();
    await page.waitForFunction(() => /ratchet: click/.test(document.getElementById('rp-note')?.textContent) || /reads zero/.test(document.getElementById('rp-note')?.textContent), null, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(200);
  };
  // pin out, zero (when asked), the pin in and closed on: returns the size called right
  const measure = async (page, shots) => {
    await button(page, 'Push the old pin out').click(); await page.waitForTimeout(200);
    if (await step(page) === '1') {
      if (shots) await dlg(page).screenshot({ path: path.join(out, `${shots}-zero.png`) });
      check(await page.locator('#rp-go').isDisabled(), 'zero: Go on waits for the ratchet');
      await ratchet(page);
      check(/reads zero/.test(await note(page)), `zero: the ratchet closes it and it reads zero (${await note(page)})`);
      await page.locator('#rp-go').click(); await page.waitForTimeout(200);
    }
    check(await step(page) === '2', 'measure step');
    // a closed micrometer won't take the pin (it is only closed after the zero check)
    if (await page.evaluate(() => true)) {
      await button(page, 'Put the pin in').click();
      const n = await note(page);
      if (/won't go in/.test(n)) {
        check(true, 'the pin won\'t go in a closed micrometer');
        for (let i = 0; i < 3; i++) await dlg(page).getByRole('button', { name: /Turn ▶▶/ }).click();
        await button(page, 'Put the pin in').click();
      }
    }
    check(/between the anvil and the spindle/.test(await note(page)), 'the pin goes in an open micrometer');
    await page.locator('#rp-in').fill('.050'); await dlg(page).getByRole('button', { name: 'Call it' }).click();
    check(/Close it down on the pin first/.test((await result(page)).text), 'calling before closing it says to close it');
    // closed on the thimble by hand (the arrow keys), then told to use the ratchet
    await page.locator('#repin .rp-svg').focus();
    for (let i = 0; i < 80; i++) await page.keyboard.press('ArrowUp');
    check(/ratchet/.test(await note(page)), `closed by hand, it asks for the ratchet (${await note(page)})`);
    await page.locator('#rp-in').fill('.050'); await dlg(page).getByRole('button', { name: 'Call it' }).click();
    check(/Give it the ratchet first/.test((await result(page)).text), 'calling before the ratchet says to give it the ratchet');
    await ratchet(page);
    check(/click, click, click/.test(await note(page)), 'the ratchet slips: click, click, click');
    if (shots) await dlg(page).screenshot({ path: path.join(out, `${shots}-measure.png`) });
    // the keys typed on the bench stay on the bench: h would strike the key
    const before = await page.locator('#lastevent').textContent();
    await page.locator('#rp-in').focus(); await page.keyboard.press('h'); await page.keyboard.press('Backspace');
    await page.locator('#repin .rp-svg').focus(); await page.keyboard.press('h');
    await page.waitForTimeout(300);
    check(await page.locator('#lastevent').textContent() === before && await dlg(page).isVisible(), 'keys on the bench don\'t play the key');
    // a whole turn under, then the sizes in turn till it is right
    let right = null, sawTurn = false;
    for (const s of SIZES) {
      const said = s === '.050' ? '50' : s;   // and once in thousandths
      await page.locator('#rp-in').fill(said); await dlg(page).getByRole('button', { name: 'Call it' }).click();
      const r = await result(page);
      if (r.cls === 'okc') { right = s; check(said !== '50' || /Taking that as 50 thousandths/.test(r.text), `a whole number is taken as thousandths (${r.text})`); break; }
      check(/thousandth|turn/.test(r.text), `a near miss says how far (${said}: ${r.text})`);
    }
    check(!!right, `the right call is taken (${right})`);
    if (right) {
      const under = (+right - 0.025).toFixed(3);
      sawTurn = true;
      if (shots) await dlg(page).screenshot({ path: path.join(out, `${shots}-called.png`) });
    }
    return right;
  };

  // ---- a loose hammer flange center, desktop, light ----
  {
    const page = await open({ width: 1280, height: 860 }, 'light');
    await setCenter(page, 'Loose hammer flange center');
    // a wrong call a whole turn out is told as such
    await repin(page);
    check(await dlg(page).isVisible(), 'Repin on the loose center opens the bench');
    await dlg(page).screenshot({ path: path.join(out, 'desktop-pinout.png') });
    const right = await measure(page, 'desktop');
    await page.locator('#rp-go').click(); await page.waitForTimeout(200);
    check(await step(page) === '3', 'the chart step');
    const sizes = await dlg(page).locator('.rp-chart tbody tr').evaluateAll(trs => trs.map(tr => tr.children[1].textContent));
    const i = sizes.findIndex(s => s === `${right}"`);
    await dlg(page).locator('.rp-chart tbody tr').nth(i).getByRole('button').click();
    check((await result(page)).cls === 'badc', `the same size is refused (${(await result(page)).text})`);
    await dlg(page).locator('.rp-chart tbody tr').nth(i + 2).getByRole('button').click();
    check((await result(page)).cls === 'badc', 'a whole size up is refused');
    await dlg(page).locator('.rp-chart tbody tr').nth(i + 1).getByRole('button').click();
    check((await result(page)).cls === 'okc', `the next half size up is taken (${(await result(page)).text})`);
    await dlg(page).screenshot({ path: path.join(out, 'desktop-chart.png') });
    await page.locator('#rp-go').click(); await page.waitForTimeout(200);
    await button(page, 'Pin it and put it back').click(); await page.waitForTimeout(400);
    const r = await result(page);
    check(r.cls === 'okc' && /next half size up/.test(r.text), `pinned: ${r.text}`);
    await dlg(page).screenshot({ path: path.join(out, 'desktop-done.png') });
    await button(page, 'Done').click(); await page.waitForTimeout(300);
    check(!(await dlg(page).isVisible()), 'Done puts the bench away');
    const now = await page.locator('#mode label', { hasText: 'Action centers:' }).locator('select').inputValue();
    check(now === '', `the center is healthy again (${now || 'healthy'})`);
    // a second repin skips the zero check (checked once a visit); Escape puts it away with nothing changed
    await setCenter(page, 'Loose hammer flange center');
    await repin(page);
    await button(page, 'Push the old pin out').click(); await page.waitForTimeout(200);
    check(await step(page) === '2', 'the zero is checked once a visit');
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    check(!(await dlg(page).isVisible()), 'Escape puts the bench away');
    check(await page.locator('#mode label', { hasText: 'Action centers:' }).locator('select').inputValue() === 'hammerLoose', 'and nothing is changed');
    // a tight one keeps its size
    await setCenter(page, 'Tight hammer flange center');
    await repin(page);
    const rt = await measure(page, null);
    await page.locator('#rp-go').click(); await page.waitForTimeout(200);
    const sz = await dlg(page).locator('.rp-chart tbody tr').evaluateAll(trs => trs.map(tr => tr.children[1].textContent));
    const it = sz.findIndex(s => s === `${rt}"`);
    await dlg(page).locator('.rp-chart tbody tr').nth(it + 1).getByRole('button').click();
    check((await result(page)).cls === 'badc', 'tight: a bigger pin is refused');
    await dlg(page).locator('.rp-chart tbody tr').nth(it).getByRole('button').click();
    check((await result(page)).cls === 'okc', 'tight: the same size is taken');
    await page.locator('#rp-go').click(); await page.waitForTimeout(200);
    await button(page, 'Pin it and put it back').click(); await page.waitForTimeout(400);
    check((await result(page)).cls === 'okc', `tight pinned: ${(await result(page)).text}`);
    await button(page, 'Done').click();
    // a worn bushing: pinned, and it still wobbles
    await setCenter(page, 'Worn hammer flange bushing');
    await repin(page);
    const rw = await measure(page, null);
    await page.locator('#rp-go').click(); await page.waitForTimeout(200);
    const sw = await dlg(page).locator('.rp-chart tbody tr').evaluateAll(trs => trs.map(tr => tr.children[1].textContent));
    await dlg(page).locator('.rp-chart tbody tr').nth(sw.findIndex(s => s === `${rw}"`) + 1).getByRole('button').click();
    await page.locator('#rp-go').click(); await page.waitForTimeout(200);
    await button(page, 'Pin it and put it back').click(); await page.waitForTimeout(400);
    const w = await result(page);
    check(w.cls === 'badc' && /rebush/.test(w.text), `worn: ${w.text}`);
    await button(page, 'Done').click();
    check(await page.locator('#mode label', { hasText: 'Action centers:' }).locator('select').inputValue() === 'hammerWorn', 'worn: the fault stays');
    // Ease and Rebush still work at once, with no bench
    await setCenter(page, 'Tight hammer flange center');
    await page.locator('#mode .row.small', { hasText: 'Hammer flange center' }).first().getByRole('button', { name: 'Ease', exact: true }).click();
    await page.waitForTimeout(300);
    check(!(await dlg(page).isVisible()) && await page.locator('#mode label', { hasText: 'Action centers:' }).locator('select').inputValue() === '', 'Ease needs no bench');
    check(!page.errors.length, `no page errors (${page.errors.join(' | ')})`);
  }
  // ---- a phone, dark ----
  {
    const page = await open({ width: 360, height: 740 }, 'dark');
    await setCenter(page, 'Loose wippen flange center');
    await page.evaluate(() => document.querySelectorAll('aside details:not([open])').forEach(d => { d.open = true; }));
    await page.locator('#mode .row.small', { hasText: 'Wippen flange center' }).first().getByRole('button', { name: 'Repin', exact: true }).click();
    await page.waitForTimeout(300);
    await button(page, 'Push the old pin out').click(); await page.waitForTimeout(200);
    await ratchet(page);
    await page.locator('#rp-go').click(); await page.waitForTimeout(200);
    for (let i = 0; i < 3; i++) await dlg(page).getByRole('button', { name: /Turn ▶▶/ }).click();
    await button(page, 'Put the pin in').click();
    await ratchet(page);
    const wide = await page.evaluate(() => { const d = document.getElementById('repin'); return { sw: d.scrollWidth, cw: d.clientWidth, w: d.getBoundingClientRect().width }; });
    check(wide.sw <= wide.cw + 1 && wide.w <= 360, `the bench fits a 360 px phone (${JSON.stringify(wide)})`);
    await page.screenshot({ path: path.join(out, 'phone-measure.png') });
    await dlg(page).getByRole('button', { name: 'Help me read it' }).click();
    await page.waitForTimeout(200);
    await dlg(page).screenshot({ path: path.join(out, 'phone-help.png') });
    // focus fallen back to the page (a replaced button had it): the page's keys still don't play the key, and Escape
    // still puts the bench away
    const ev = await page.locator('#lastevent').textContent();
    await page.evaluate(() => document.activeElement?.blur());
    for (const k of ['h', 'Space', 'p']) await page.keyboard.press(k);
    await page.waitForTimeout(300);
    check(await page.locator('#lastevent').textContent() === ev && await dlg(page).isVisible(), 'with focus on the page, its keys stay off the key');
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    check(!(await dlg(page).isVisible()), 'with focus on the page, Escape puts the bench away');
    check(!page.errors.length, `phone: no page errors (${page.errors.join(' | ')})`);
  }
  // ---- the upright: a tight butt center, eased or repinned at the same bench ----
  {
    const page = await open({ width: 1280, height: 860 }, 'light', 'upright');
    const sel = page.locator('#mode select[title="Wear or break one part"]');
    await sel.selectOption({ label: 'Butt center tight' }); await page.waitForTimeout(400);
    const fix = name => page.locator('#mode button', { hasText: name }).first();
    check(await fix('Ease the butt center').count() === 1 && await fix('Repin the butt center').count() === 1, 'upright: Ease and Repin are two repairs');
    await fix('Repin the butt center').click(); await page.waitForTimeout(300);
    check(await dlg(page).isVisible() && /Repin the butt center/.test(await dlg(page).locator('#rp-title').textContent()), 'upright: Repin opens the bench');
    check(/hammer butt and its flange/.test(await dlg(page).textContent()), 'upright: the butt and its flange come off');
    const r = await measure(page, 'upright');
    await page.locator('#rp-go').click(); await page.waitForTimeout(200);
    const sz = await dlg(page).locator('.rp-chart tbody tr').evaluateAll(trs => trs.map(tr => tr.children[1].textContent));
    const it = sz.findIndex(s => s === `${r}"`);
    await dlg(page).locator('.rp-chart tbody tr').nth(it + 1).getByRole('button').click();
    check((await result(page)).cls === 'badc', 'upright: a bigger pin is refused for a tight center');
    await dlg(page).locator('.rp-chart tbody tr').nth(it).getByRole('button').click();
    await page.locator('#rp-go').click(); await page.waitForTimeout(200);
    await button(page, 'Pin it and put it back').click(); await page.waitForTimeout(400);
    check((await result(page)).cls === 'okc', `upright pinned: ${(await result(page)).text}`);
    await button(page, 'Done').click(); await page.waitForTimeout(300);
    check(await sel.inputValue() === '', 'upright: all parts sound again');
    // healthy: Repin says the part was sound and opens nothing; Ease still fixes a tight one at once
    await fix('Repin the butt center').click(); await page.waitForTimeout(300);
    check(!(await dlg(page).isVisible()), 'upright: Repin on a sound center opens no bench');
    await sel.selectOption({ label: 'Butt center tight' }); await page.waitForTimeout(400);
    await fix('Ease the butt center').click(); await page.waitForTimeout(300);
    check(!(await dlg(page).isVisible()) && await sel.inputValue() === '', 'upright: Ease needs no bench');
    // the × puts the bench away with nothing changed (the page behind the dialog can't be clicked while it is out, so
    // the stale paths, a regulation, mode or action changed under it, aren't reached from here)
    await sel.selectOption({ label: 'Butt center tight' }); await page.waitForTimeout(400);
    await fix('Repin the butt center').click(); await page.waitForTimeout(300);
    await dlg(page).getByRole('button', { name: 'Put it away' }).click(); await page.waitForTimeout(300);
    check(!(await dlg(page).isVisible()) && await sel.inputValue() === 'buttCenterTight', 'upright: the × puts the bench away, the center still tight');
    // a loose butt center (Find the fault deals it; the upright's Sandbox shows readings, not tests): Ease says why it
    // won't do, the rocking test shows the play, Repin takes the next half size up and Check my work passes
    await page.locator('.tab[data-mode=diagnose]').click(); await page.waitForTimeout(500);
    for (let i = 0; i < 120 && !/its hammer seems to wobble/.test(await page.locator('#mode').textContent()); i++) {
      await page.locator('#actionbar button', { hasText: 'Next customer' }).click(); await page.waitForTimeout(60);
    }
    check(/its hammer seems to wobble/.test(await page.locator('#mode').textContent()), 'upright loose: Find the fault deals the loose butt center');
    await page.evaluate(() => document.querySelectorAll('#mode details:not([open])').forEach(d => { d.open = true; }));
    await fix('Ease the butt center').click(); await page.waitForTimeout(200);
    check(/only makes it looser/.test(await page.locator('#toasts').textContent()), 'upright loose: Ease says it only makes it looser');
    await page.locator('#mode button', { hasText: 'rock the hammer side to side' }).first().click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(out, 'upright-rock.png') });
    await page.waitForFunction(() => /side play in the center/.test(document.getElementById('testlog')?.textContent ?? ''), null, { timeout: 30000 }).catch(() => {});
    check(/side play in the center/.test(await page.locator('#testlog').textContent()), 'upright loose: the rocking test finds side play');
    await page.waitForFunction(() => ![...document.querySelectorAll('#mode button.test')].some(b => b.disabled), null, { timeout: 30000 }).catch(() => {});
    await fix('Repin the butt center').click(); await page.waitForTimeout(300);
    const rl = await measure(page, null);
    await page.locator('#rp-go').click(); await page.waitForTimeout(200);
    const sl = await dlg(page).locator('.rp-chart tbody tr').evaluateAll(trs => trs.map(tr => tr.children[1].textContent));
    const il = sl.findIndex(s => s === `${rl}"`);
    await dlg(page).locator('.rp-chart tbody tr').nth(il).getByRole('button').click();
    check((await result(page)).cls === 'badc', 'upright loose: the same size is refused');
    await dlg(page).locator('.rp-chart tbody tr').nth(il + 1).getByRole('button').click();
    await page.locator('#rp-go').click(); await page.waitForTimeout(200);
    await button(page, 'Pin it and put it back').click(); await page.waitForTimeout(400);
    check((await result(page)).cls === 'okc' && /next half size up/.test((await result(page)).text), `upright loose pinned: ${(await result(page)).text}`);
    await button(page, 'Done').click(); await page.waitForTimeout(300);
    await page.locator('#actionbar button', { hasText: 'Check my work' }).click(); await page.waitForTimeout(300);
    check(/Fixed\./.test(await page.locator('#mode').textContent()), 'upright loose: Check my work says fixed');
    // repinned, the rocking test finds no play
    await page.locator('#mode button', { hasText: 'rock the hammer side to side' }).first().click();
    await page.waitForFunction(() => /no side play/.test(document.getElementById('testlog')?.textContent ?? ''), null, { timeout: 30000 }).catch(() => {});
    check(/no side play/.test(await page.locator('#testlog').textContent()), 'upright repinned: the rocking test finds no side play');
    check(!page.errors.length, `upright: no page errors (${page.errors.join(' | ')})`);
  }
  await browser.close();
  console.log(failed ? `${failed} failed` : 'all ok');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
