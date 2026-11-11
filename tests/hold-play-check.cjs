// Play and Press slowly held down (keyfader.js), driven in headless Chrome: a tap still plays as a click did, a hold
// keeps the key down and lets it up when let go, the slider comes up while held and sliding it eases the key up (right)
// and down (left), Enter on Play still plays it, the same on the upright, and on a phone with a finger (Press slowly in
// the Key & pedal menu there). Screenshots of the slider go to out_dir.
// node tests/hold-play-check.cjs <out_dir> [base_url]
// Needs a server on the checkout and Chrome (playwright-core from minichord-lab's node_modules, SwiftShader WebGL).
const { chromium } = require('/home/gregory/minichord-lab/tests/node_modules/playwright-core');
const fs = require('fs');
const path = require('path');

const [out, base = 'http://localhost:8812'] = process.argv.slice(2);
if (!out) { console.error('usage: node tests/hold-play-check.cjs <out_dir> [base_url]'); process.exit(2); }

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  let failed = 0;
  const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failed++; };
  for (const [size, w, h] of [['desktop', 1280, 800], ['phone390', 390, 844]]) {
    const phone = w < 500;
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: phone, isMobile: phone });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    await page.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('regsim-movehelp', 'seen'); } catch {} });
    await page.goto(base, { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    if ((await page.textContent('#units')).trim() === 'inches') await page.click('#units');   // readings in mm
    const cdp = phone ? await ctx.newCDPSession(page) : null;
    // the key's depth, read off the bar under the picture (the grand's or the upright's)
    const depth = async () => {
      const t = await page.evaluate(() => document.querySelector(document.querySelector('#app').classList.contains('upright') ? '.u-keypos' : '#keypos').textContent);   // (shown or not: a phone hides it)
      const m = t.match(/key ([−-]?[\d.]+) mm down/); return m ? +m[1].replace('−', '-') : NaN;
    };
    const fader = () => page.$eval('#keyfader', e => !e.hidden).catch(() => false);
    const center = async sel => { const b = await page.locator(sel).boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
    // a pointer: the mouse, or a finger through CDP (Playwright's touchscreen only taps)
    const P = {
      async down(x, y) { this.x = x; this.y = y; if (!phone) { await page.mouse.move(x, y); await page.mouse.down(); } else await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); },
      async move(x, y, steps = 10) {
        for (let i = 1; i <= steps; i++) {
          const px = this.x + (x - this.x) * i / steps, py = this.y + (y - this.y) * i / steps;
          if (!phone) await page.mouse.move(px, py); else await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: px, y: py }] });
          await page.waitForTimeout(30);
        }
        this.x = x; this.y = y;
      },
      async up() { if (!phone) await page.mouse.up(); else await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); },
    };
    const settleUp = async () => { for (let i = 0; i < 40 && !((await depth()) <= 0.005); i++) await page.waitForTimeout(250); return depth(); };

    for (const action of phone ? ['grand'] : ['grand', 'upright']) {
      const tag = `${size} ${action}`;
      if (action === 'upright') { await page.click('#action-switch [data-action=upright]'); await page.waitForTimeout(1500); }
      const play = action === 'grand' ? '#k-play' : '#keybar .kplay[data-hold]:not(#k-play)';
      const slowSel = action === 'grand' ? '#k-slow' : '[data-upright][data-hold][data-key=S]';
      // a tap: struck and let up, as a click always did
      let [x, y] = await center(play);
      await P.down(x, y); await page.waitForTimeout(60); await P.up();
      await page.waitForTimeout(400);
      check(!(await fader()), `${tag}: no slider on a tap`);
      check((await settleUp()) <= 0.005, `${tag}: a tap on Play lets the key back up`);
      // held: the key stays down, the slider comes up, sliding right eases it up, left presses it again
      await P.down(x, y); await page.waitForTimeout(1500);
      const dip = await depth();
      check(dip > 8, `${tag}: Play held keeps the key down (${dip} mm)`);
      check(await fader(), `${tag}: the slider is up while Play is held`);
      await page.waitForTimeout(600);
      check((await depth()) > 8, `${tag}: still down after 2 s held`);
      await P.move(x + 110, y, 110); await page.waitForTimeout(800);   // (a slow, careful slide: 1 px at a time)
      const eased = await depth();
      check(eased < dip - 3 && eased > 0.5, `${tag}: sliding right, slowly, eases the key up (${dip} → ${eased} mm)`);
      await page.screenshot({ path: path.join(out, `${size}-${action}-play-slider.png`) });
      await P.move(x + 40, y); await page.waitForTimeout(800);
      const back = await depth();
      check(back > eased + 2, `${tag}: sliding back left presses it down again (${eased} → ${back} mm)`);
      await P.move(x - 200, y); await page.waitForTimeout(800);
      const pushed = await depth();
      check(pushed > dip - 0.5, `${tag}: pushed past the bottom it stays at the bottom (${pushed} mm)`);
      await P.move(x - 140, y); await page.waitForTimeout(800);
      check((await depth()) < pushed - 1.5, `${tag}: and the slider came along, so it eases straight back up (${await depth()} mm)`);
      await P.up(); await page.waitForTimeout(300);
      check(!(await fader()), `${tag}: the slider goes when Play is let go`);
      { const u = await settleUp(); check(u <= 0.005, `${tag}: let go, the key comes up (${u} mm)`); }
      // Press slowly: a tap still presses to the bottom and holds; held, the slider works it through let-off
      const openKeyMenu = async () => { if (await page.$eval('#cat-key', e => !e.hidden)) { await (phone ? page.tap('#cat-key .cat-btn') : page.click('#cat-key .cat-btn')); await page.waitForTimeout(200); } };
      await openKeyMenu();
      [x, y] = await center(slowSel);
      await P.down(x, y); await page.waitForTimeout(60); await P.up();
      await page.waitForTimeout(3000);
      const slowD = await depth();
      check(slowD > 0.3, `${tag}: a tap on Press slowly still presses the key (${slowD} mm after 3 s)`);
      check(await page.$$eval('.menu', ms => ms.every(m => m.hidden)), `${tag}: the menu closed after the tap`);
      await page.keyboard.press('Escape'); check((await settleUp()) <= 0.005, `${tag}: Esc lets it up`);
      await openKeyMenu();
      [x, y] = await center(slowSel);
      await P.down(x, y); await page.waitForTimeout(500);
      check(await fader(), `${tag}: the slider is up while Press slowly is held`);
      if (phone) check(await page.$eval('#menu-key', m => getComputedStyle(m).opacity < 0.5), `${tag}: the menu fades while held`);
      await P.move(x - 180, y); await page.waitForTimeout(1200);
      const pressed = await depth();
      check(pressed > 6, `${tag}: sliding left takes it down (${pressed} mm)`);
      await page.screenshot({ path: path.join(out, `${size}-${action}-slow-slider.png`) });
      await P.move(x - 80, y); await page.waitForTimeout(1000);
      const rocked = await depth();
      check(rocked < pressed - 2, `${tag}: and right lets it back up (${pressed} → ${rocked} mm)`);
      await P.up(); await page.waitForTimeout(300);
      check(!(await fader()) && await page.$$eval('.menu', ms => ms.every(m => m.hidden)), `${tag}: let go: slider and menu gone`);
      { const u = await settleUp(); check(u <= 0.005, `${tag}: let go, the key comes up (${u} mm)`); }
      // Enter on the focused Play still plays it
      if (!phone) {
        await page.focus(play); await page.keyboard.press('Enter'); await page.waitForTimeout(700);
        const kd = await depth();
        check(kd > 0.5 || (await settleUp()) <= 0.005, `${tag}: Enter on Play strikes (${kd} mm a moment after)`);
        check((await settleUp()) <= 0.005, `${tag}: and the key comes back up`);
        await page.evaluate(() => document.activeElement?.blur());
      }
    }
    check(errors.length === 0, `${size}: no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
    await ctx.close();
  }
  await browser.close();
  console.log(failed ? `${failed} FAILED` : 'all ok');
  process.exit(failed ? 1 : 0);
})();
