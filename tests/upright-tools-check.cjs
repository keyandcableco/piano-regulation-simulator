// The upright's Tools tab, driven in headless Chrome: each upright tool on its own picture's bench, the card and its
// Learn links, the move buttons, the key held off while a tool is out, leaving the tab and the Grand/Upright switch,
// and the grand's tool bag unchanged. Screenshots go to <out_dir>.
// node tests/upright-tools-check.cjs <out_dir> [base_url]
// Needs a server on the checkout and Chrome (playwright-core from minichord-lab's node_modules, SwiftShader WebGL).
const { chromium } = require('/home/gregory/minichord-lab/tests/node_modules/playwright-core');
const fs = require('fs');
const path = require('path');

const [out, base = 'http://localhost:8812'] = process.argv.slice(2);
if (!out) { console.error('usage: node tests/upright-tools-check.cjs <out_dir> [base_url]'); process.exit(2); }
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('regsim-movehelp', 'seen'); } catch {} });
  const shot = name => page.screenshot({ path: path.join(out, `${name}.png`) });
  const text = sel => page.$eval(sel, e => e.innerText.replace(/\s+/g, ' ').trim());
  const shown = sel => page.$eval(sel, e => getComputedStyle(e).display !== 'none' && !e.hidden);
  const cam = () => page.evaluate(() => document.getElementById('cu').scene.camera.position.toArray());
  const moved = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  let failed = 0;
  const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failed++; };

  await page.goto(`${base}/index.html?t=${Date.now()}`);
  await page.waitForSelector('#mode table', { state: 'attached', timeout: 60000 });
  // the grand's bag first: its four tools, as before
  await page.click('.tab[data-mode="tools"]'); await page.waitForTimeout(800);
  const grandTools = await page.$$eval('#mode .toolbtn', bs => bs.map(b => b.textContent));
  check(grandTools.join() === 'Capstan wrench,Let-off regulator,Drop screw regulator,Key dip block', `grand bag: ${grandTools.join(', ')}`);
  await shot('grand-tools');
  // to the upright: it opens on its Sandbox, and has a Tools tab of its own
  await page.click('#action-switch [data-action="upright"]');
  await page.waitForSelector('#cu', { state: 'visible', timeout: 60000 }); await page.waitForTimeout(1200);
  check((await text('#mode')).includes('Factory regulation'), 'the upright opens on its Sandbox');
  check(await shown('.tab[data-mode="tools"]'), 'the upright shows a Tools tab');
  const cam0 = await cam();
  await page.click('.tab[data-mode="tools"]');
  // (the first tool out builds the bench's reflections and shaders: slow in software WebGL, so wait for the move)
  await page.waitForFunction(() => document.getElementById('cu').scene.controls.target.length() < 100, null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(900);
  check(await page.$eval('.tab[data-mode="tools"]', b => b.classList.contains('on')), 'Tools tab is on');
  const names = await page.$$eval('#mode .toolbtn', bs => bs.map(b => b.textContent));
  check(names.join() === 'Spoon bender,Damper wire regulator,Bridle wire bender', `upright bag: ${names.join(', ')}`);
  check(await page.$eval('#views', e => e.style.display === 'none') && await page.$eval('#keydock', e => e.style.display === 'none'), 'view and key bars hidden while a tool is out');
  check(await page.$eval('#cu', e => getComputedStyle(e).display !== 'none') && await page.$eval('#c', e => getComputedStyle(e).display === 'none'), 'the tool is on the upright\'s own picture');
  const camA = await cam();
  check(moved(cam0, camA) > 50, `the camera moved to the tool: ${cam0.map(Math.round)} to ${camA.map(Math.round)}`);
  for (let i = 0; i < names.length; i++) {
    await page.evaluate(i => document.querySelectorAll('#mode .toolbtn')[i].click(), i); await page.waitForTimeout(1200);
    const card = await text('#mode .toolcard');
    check(card.startsWith(names[i]) && /Dimensions:/.test(card) && /Modeled on the AMS Piano Tools/.test(card), `${names[i]}: its card`);
    const links = await page.$$eval('#mode .toolcard .linkish', bs => bs.map(b => b.textContent));
    check(links.length > 0, `${names[i]}: Used in ${links.join(', ')}`);
    await shot(`upright-tool-${i + 1}`);
  }
  // the key stays put while a tool is out (Space would hold it down in the Sandbox)
  await page.mouse.click(5, 300);   // focus the page, away from any button
  await page.keyboard.down('Space'); await page.waitForTimeout(500); await page.keyboard.up('Space');
  check(!(await page.$eval('.u-keystate', e => e.classList.contains('down'))), 'Space doesn\'t press the key with a tool out');
  // the move buttons: zoom in, then Reset view goes back to the tool's own framing, not an action view
  const camT = await cam();
  await page.click('#navpad [data-zoom="-1"]'); await page.waitForTimeout(300);
  check(moved(camT, await cam()) > 1, 'zoom moves the view on the tool');
  await page.click('#nav-reset'); await page.waitForTimeout(1200);
  check(moved(camT, await cam()) < 1, 'Reset view goes back to the tool\'s framing');
  // a Used in link opens that Learn step, the action back in place of the tool
  const link = await page.$eval('#mode .toolcard .linkish', b => b.textContent);
  await page.click('#mode .toolcard .linkish'); await page.waitForTimeout(1500);
  check(await page.$eval('.tab[data-mode="learn"]', b => b.classList.contains('on')), 'a Used in link opens Learn');
  check((await text('#mode')).includes(link), `on the step "${link}"`);
  check(await page.$eval('#views', e => e.style.display !== 'none'), 'the view bar is back');
  const back = await page.evaluate(() => document.getElementById('cu').scene.scene.children.find(o => o.isGroup && o.children.some(c => c.type === 'GridHelper'))?.visible);
  check(back === false, 'the tool bench is put away');
  await shot('upright-learn-from-tool');
  // Tools again, another tool, then the switch: the grand comes back as it was; the upright comes back on Tools with the
  // same tool out (its key and regulation left as they were)
  await page.click('.tab[data-mode="tools"]'); await page.waitForTimeout(1200);
  await page.evaluate(() => document.querySelectorAll('#mode .toolbtn')[1].click()); await page.waitForTimeout(1200);
  await page.click('#action-switch [data-action="grand"]'); await page.waitForTimeout(1200);
  check(await page.$eval('#c', e => getComputedStyle(e).display !== 'none'), 'back to the grand picture');
  await page.click('#action-switch [data-action="upright"]'); await page.waitForTimeout(1500);
  check(await page.$eval('.tab[data-mode="tools"]', b => b.classList.contains('on')) && (await text('#mode .toolbtn.on')) === 'Damper wire regulator', 'the upright comes back on Tools, the same tool out');
  check(await page.$eval('#views', e => e.style.display === 'none'), 'its view bar still hidden');
  await shot('upright-tools-after-switch');
  await page.click('.tab[data-mode="sandbox"]'); await page.waitForTimeout(1200);
  check(await page.$eval('#views', e => e.style.display !== 'none') && await page.$eval('#keydock', e => e.style.display !== 'none'), 'back in the Sandbox: its view and key bars are shown');
  check(errors.length === 0, `no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
