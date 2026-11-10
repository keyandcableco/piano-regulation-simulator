// Move parts and Hide panel in headless Chrome: the ✋ button, a part found by hovering and dragged with the mouse (the
// grand's jack tripped and let go without a phantom blow, its wippen lifted, a click still opening a part's card, a tap on
// the key playing it; the upright's wippen and jack), the panel hidden, remembered over a reload and brought back, and no
// page errors. Screenshots of each held part go to <out_dir>.
// node tests/move-parts-check.cjs <out_dir> [base_url]
// Needs a server on the checkout and Chrome (playwright-core from minichord-lab's node_modules, SwiftShader WebGL).
const { chromium } = require('/home/gregory/minichord-lab/tests/node_modules/playwright-core');
const fs = require('fs');

const [out, base = 'http://localhost:8812'] = process.argv.slice(2);
if (!out) { console.error('usage: node tests/move-parts-check.cjs <out_dir> [base_url]'); process.exit(2); }
let failed = 0;
const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failed++; };
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  // (the panel shown at the start, but not again on the reload that checks it is remembered)
  await page.addInitScript(() => { try { localStorage.setItem('regsim-movehelp', 'seen'); if (!sessionStorage.getItem('mpc')) { localStorage.removeItem('regsim-panel'); sessionStorage.setItem('mpc', '1'); } } catch {} });
  await page.goto(base + '/'); await page.waitForTimeout(2500);
  const tap = async sel => { await page.evaluate(s => document.querySelector(s).click(), sel); await page.waitForTimeout(300); };
  const text = sel => page.evaluate(s => [...document.querySelectorAll(s)].map(e => e.textContent).join(' | '), sel);
  // a spot on the picture whose hover name matches re (the first one from the top)
  const find = (re, cs) => page.evaluate(([src, cs]) => {
    const re = new RegExp(src), c = document.querySelector(cs), r = c.getBoundingClientRect(), tip = document.querySelector('#tip');
    for (let y = r.top + 4; y < r.bottom - 4; y += 4) for (let x = r.left + 4; x < r.right - 4; x += 4) {
      if (document.elementFromPoint(x, y) !== c) continue;
      c.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y, bubbles: true }));
      if (!tip.hidden && re.test(tip.textContent)) { c.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true })); return [x, y]; }
    }
    return null;
  }, [re.source, cs]);
  // drag from at by (dx, dy) and hold; returns what was said while held, then lets go and waits
  async function drag(at, dx, dy, line, shot) {
    await page.mouse.move(at[0], at[1]); await page.mouse.down();
    for (let i = 1; i <= 12; i++) { await page.mouse.move(at[0] + dx * i / 12, at[1] + dy * i / 12); await page.waitForTimeout(40); }
    await page.waitForTimeout(500);
    const held = await text(line);
    if (shot) await page.screenshot({ path: `${out}/${shot}.png` });
    await page.mouse.up(); await page.waitForTimeout(1500);
    return held;
  }
  // the jack trips one way on the screen, whatever the view: try each until it does
  async function tripJack(cs, line) {
    for (const [dx, dy] of [[-40, 0], [40, 0], [0, -40], [0, 40]]) {
      const at = await find(/^Jack ·/, cs);
      if (!at) return { found: false };
      const held = await drag(at, dx, dy, line, `${cs.slice(1)}-jack`);
      if (/tripped by hand/.test(held)) return { found: true, tripped: true, after: await text(line) };
    }
    return { found: true, tripped: false };
  }

  check(!(await page.$eval('#nav-hand', b => b.classList.contains('on'))), 'Move parts starts off');
  await tap('#nav-hand');
  check(await page.$eval('#nav-hand', b => b.getAttribute('aria-pressed') === 'true'), 'the ✋ button turns Move parts on');

  // the grand
  await tap('[data-view="escapement"]'); await page.waitForTimeout(1500);
  const j = await tripJack('#c', '#lastevent');
  check(j.found && j.tripped, 'grand: dragging the jack trips it ("Jack tripped by hand")');
  check(j.tripped && !/strikes/.test(j.after), `grand: let go, the jack goes back under with no blow (${j.after})`);
  await tap('[data-view="action"]'); await page.waitForTimeout(1500);
  const w = await find(/^Wippen ·/, '#c');
  check(!!w, 'grand: the wippen is named for dragging on hover');
  if (w) {
    await page.mouse.move(w[0], w[1]); await page.mouse.down();
    for (let i = 1; i <= 12; i++) { await page.mouse.move(w[0], w[1] - 30 * i / 12); await page.waitForTimeout(40); }
    await page.waitForTimeout(500);
    const kp = await text('#keypos');
    await page.screenshot({ path: `${out}/c-wippen.png` });
    check(!/key 0"? down/.test(kp) && !/key 0 mm down/.test(kp), `grand: lifting the wippen presses the key (${kp})`);
    // (waited for, up to 30 s: the page plays at Slow x10 and a headless frame rate stretches that further; a fixed
    // 2.5 s was too short for the key's return even before it had to settle on its back rail)
    await page.mouse.up();
    await page.waitForFunction(() => /key 0"? down|key 0 mm down/.test(document.querySelector('#keypos').textContent), null, { timeout: 30000 }).catch(() => {});
    check(/key 0"? down|key 0 mm down/.test(await text('#keypos')), 'grand: let go, the key comes back up');
  }
  await tap('[data-view="escapement"]'); await page.waitForTimeout(1500);
  const jc = await find(/^Jack ·/, '#c');
  await page.mouse.click(jc[0], jc[1]); await page.waitForTimeout(400);
  check(await page.evaluate(() => !document.querySelector('#partpop').hidden && /Jack/.test(document.querySelector('#partpop b')?.textContent)),
    'grand: a click on a part still opens its card');
  await page.evaluate(() => document.querySelectorAll('.pop-x').forEach(b => b.offsetParent && b.click()));
  await tap('[data-view="keyfront"]'); await page.waitForTimeout(1500);
  const k = await find(/^Key ·/, '#c');
  if (k) { await page.mouse.click(k[0], k[1]); await page.waitForTimeout(250); }
  check(!!k && !/rest/.test(await text('#keystate')), 'grand: a tap on the key plays it');
  await page.waitForTimeout(2500);

  // the panel
  await tap('#panel-btn');
  const hidden = await page.evaluate(() => [document.querySelector('aside').getBoundingClientRect().width, document.querySelector('#stage').getBoundingClientRect().width, document.querySelector('#panel-btn').textContent]);
  check(hidden[0] === 0 && hidden[1] === 1280 && hidden[2] === 'Show panel', `Hide panel gives the picture the whole window (${hidden})`);
  await page.screenshot({ path: `${out}/no-panel.png` });
  await page.reload(); await page.waitForTimeout(2500);
  check(await page.evaluate(() => document.querySelector('#app').classList.contains('nopanel')), 'the panel stays hidden over a reload');
  await tap('#panel-btn');
  check(await page.evaluate(() => document.querySelector('aside').getBoundingClientRect().width === 400), 'Show panel brings it back');

  // the upright
  await tap('#action-switch [data-action="upright"]'); await page.waitForTimeout(2500);
  if (!(await page.$eval('#nav-hand', b => b.classList.contains('on')))) await tap('#nav-hand');
  await tap('[data-uview="wippen"]'); await page.waitForTimeout(1500);
  const uw = await find(/^Wippen ·/, '#cu');
  const uHeld = uw ? await drag(uw, 0, -60, '.u-lastevent', 'cu-wippen') : '';
  check(/Let off/.test(uHeld), `upright: lifting the wippen lets the jack off (${uHeld})`);
  const uj = await tripJack('#cu', '.u-lastevent');
  check(uj.found && uj.tripped, 'upright: dragging the jack trips it');
  await tap('#nav-hand');
  check(!(await page.$eval('#nav-hand', b => b.classList.contains('on'))), 'the ✋ button turns Move parts off');

  check(!errors.length, `no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await browser.close();
  console.log(failed ? `${failed} FAILED` : 'all ok');
  process.exit(failed ? 1 : 0);
})();
