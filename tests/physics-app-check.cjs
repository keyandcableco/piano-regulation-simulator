// The force-driven key in the app, in headless Chrome: Play at each touch (pp, mf, ff, staccato) strikes and the key
// comes back up on its own; the same blow at every playback speed; the weigh-off test prints its grams and draws the
// force trace; the Repeat test counts; no page errors. Screenshots go to <out_dir>.
// node tests/physics-app-check.cjs <out_dir> [base_url]
// Needs a server on the checkout and Chrome (playwright-core from minichord-lab's node_modules, SwiftShader WebGL).
const { chromium } = require('/home/gregory/minichord-lab/tests/node_modules/playwright-core');
const fs = require('fs');

const [out, base = 'http://localhost:8812'] = process.argv.slice(2);
if (!out) { console.error('usage: node tests/physics-app-check.cjs <out_dir> [base_url]'); process.exit(2); }
let failed = 0;
const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failed++; };
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('regsim-movehelp', 'seen'); } catch {} });
  await page.goto(base + '/index.html?t=' + Date.now());
  await page.waitForSelector('#mode table', { state: 'attached', timeout: 60000 });
  await page.waitForTimeout(1500);
  const tap = async sel => { await page.evaluate(s => document.querySelector(s).click(), sel); await page.waitForTimeout(200); };
  const text = sel => page.evaluate(s => document.querySelector(s)?.textContent ?? '', sel);
  // every event line said from now on (the quiet line by the key buttons)
  await page.evaluate(() => { document.querySelector('#c').said = []; });
  const said = () => page.evaluate(() => document.querySelector('#c').said.splice(0));
  const strikeOf = lines => { const m = lines.map(l => /Hammer strikes \(([\d.]+) m\/s\)/.exec(l)).filter(Boolean); return m.length ? +m[0][1] : null; };
  // the key up and the hammer home and still (a blow begun while the hammer is still swinging is a different blow)
  const atRest = async () => { await page.waitForTimeout(300); await page.waitForFunction(() => document.querySelector('#c').idle(), null, { timeout: 120000 }); };

  // each touch, at real speed
  await tap('[data-speed="1"]');
  const speeds = {};
  for (const t of ['pp', 'mf', 'ff', 'staccato']) {
    await tap(`[data-touch="${t}"]`); await said();
    await tap('#k-play'); await atRest();
    speeds[t] = strikeOf(await said());
    check(speeds[t] !== null, `${t}: Play strikes (${speeds[t]} m/s) and the key comes back up by itself`);
  }
  check(speeds.pp < speeds.mf && speeds.mf < speeds.ff, `harder touch, faster hammer: pp ${speeds.pp}, mf ${speeds.mf}, ff ${speeds.ff} m/s`);
  check((await text('#touch-btn .v')) === 'stacc.', 'the Touch button names the touch picked');
  // the same blow at every playback speed
  await tap('[data-touch="mf"]');
  const bySpeed = {};
  for (const s of ['1', '0.1', '0.02']) {
    await tap(`[data-speed="${s}"]`); await said();
    await tap('#k-play');
    await page.waitForFunction(() => document.querySelector('#c').said.some(l => /Hammer strikes/.test(l)), null, { timeout: 60000 });
    bySpeed[s] = strikeOf(await said());
    await tap('#k-release'); await atRest();
  }
  check(bySpeed['1'] === bySpeed['0.1'] && bySpeed['0.1'] === bySpeed['0.02'], `mf strikes the same at Real speed, Slow x10 and Slow x50: ${Object.values(bySpeed).join(', ')} m/s`);
  // strike and hold: the hammer checks and the key stays down
  await tap('[data-speed="1"]'); await said();
  await tap('#k-strike'); await page.waitForTimeout(800);
  const held = await said();
  check(held.some(l => /checked/i.test(l)) && (await text('#keystate')) === 'Key held down', `Strike & hold: checked, key held down (${held.filter(l => /check/i.test(l))[0] ?? 'no check line'})`);
  await page.locator('#stage canvas#c').screenshot({ path: `${out}/strike-held.png` });
  await tap('#k-release'); await atRest();
  // weigh off
  await page.evaluate(() => { const d = [...document.querySelectorAll('details.fold')].find(x => /^Key/.test(x.querySelector('summary').textContent)); if (d && !d.open) d.querySelector('summary').click(); });
  await page.waitForTimeout(300);
  await tap('[data-anchor="test:weighOff"]');
  await page.waitForFunction(() => document.querySelector('.weighed table'), null, { timeout: 60000 });
  const touch = await page.evaluate(() => [...document.querySelectorAll('.weighed tr')].map(r => r.textContent));
  const dw = +/Downweight.*?(\d+) g$/.exec(touch[0])?.[1], uw = +/(\d+) g$/.exec(touch[1])?.[1];
  check(dw >= 35 && dw <= 60 && uw >= 10 && uw <= 35, `weigh off: downweight ${dw} g, upweight ${uw} g`);
  check(await page.evaluate(() => document.querySelectorAll('.trace svg path').length >= 2), 'weigh off: the force trace is drawn');
  await page.locator('.weighed').scrollIntoViewIfNeeded(); await page.locator('.weighed').screenshot({ path: `${out}/weigh-off.png` });
  await atRest();
  // paused, a blow steps forward and back through its frames (the finger's push is part of each frame's record)
  await tap('[data-speed="0.1"]'); await tap('#k-pause'); await tap('#k-play');
  for (let i = 0; i < 30; i++) await tap('#k-fwd');
  const dFwd = await text('#keypos');
  for (let i = 0; i < 10; i++) await tap('#k-back');
  const dBack = await text('#keypos');
  for (let i = 0; i < 10; i++) await tap('#k-fwd');
  check(dFwd !== dBack && (await text('#keypos')) === dFwd, `frames step on and back to the same place (${dFwd}; ten back: ${dBack})`);
  await tap('#k-pause'); await tap('#frames-done'); await tap('#k-release'); await atRest();
  // three keys played together, each with its own finger
  await page.evaluate(() => [...document.querySelectorAll('#mode button')].find(b => b.textContent === 'Three keys')?.click()); await page.waitForTimeout(600);
  await tap('[data-speed="1"]'); await said();
  await page.evaluate(() => [...document.querySelectorAll('#mode button')].find(b => /Play all three/.test(b.textContent))?.click());
  await page.waitForTimeout(600); await atRest();
  check(strikeOf(await said()) !== null, 'three keys: Play all three strikes and they come back up');
  await page.evaluate(() => [...document.querySelectorAll('#mode button')].find(b => b.textContent === 'One key')?.click()); await page.waitForTimeout(600);
  // Find the fault: the weigh-off is there to run, and its readings come with it
  await tap('.tab[data-mode="diagnose"]'); await page.waitForTimeout(600);
  await page.evaluate(() => [...document.querySelectorAll('#mode button')].find(b => b.textContent === 'Next customer')?.click()); await page.waitForTimeout(800);
  await page.evaluate(() => { const d = [...document.querySelectorAll('details.fold')].find(x => /^Key/.test(x.querySelector('summary').textContent)); if (d && !d.open) d.querySelector('summary').click(); });
  await page.waitForTimeout(300);
  check(await page.evaluate(() => /Not weighed yet/.test(document.querySelector('#mode').textContent)), 'Find the fault: the weigh-off reads nothing until it is run');
  await tap('[data-anchor="test:weighOff"]');
  await page.waitForFunction(() => document.querySelector('.weighed table'), null, { timeout: 60000 });
  check(true, `Find the fault: weighed off (${await page.evaluate(() => document.querySelector('.weighed tr').textContent)})`);
  await atRest();
  await tap('.tab[data-mode="sandbox"]'); await page.waitForTimeout(600);
  // repeat
  await page.evaluate(() => { const d = [...document.querySelectorAll('details.fold')].find(x => /^Jack/.test(x.querySelector('summary').textContent)); if (d && !d.open) d.querySelector('summary').click(); });
  await tap('[data-anchor="test:repeat"]');
  await page.waitForFunction(() => /Fastest from a half release|doesn't repeat at all/.test(document.querySelector('#mode').textContent), null, { timeout: 180000 });
  const rep = await page.evaluate(() => /At \d+ blows a second[^.]*\.[^.]*a second[^.]*/.exec(document.querySelector('#mode').textContent)?.[0]);
  const half = +/half release: (\d+)/.exec(rep ?? '')?.[1];
  check(half >= 10 && half <= 16, `repeat: ${rep}`);
  check(errors.length === 0, `no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await browser.close();
  console.log(failed ? `${failed} FAILED` : 'all ok');
  process.exit(failed ? 1 : 0);
})();
