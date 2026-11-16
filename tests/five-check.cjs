// The five-key row (keyrow.js ROWS.five, Greg 2026-11-16): white, black, white, black, white. The Sandbox's Five keys
// (two sharps to level together) and Find the fault's neighbors round the customer's key, a natural in the middle, on
// both actions; Three keys and the exam keep their sharp in the middle.
// node tests/five-check.cjs [base_url] [out_dir]; needs a server on the checkout and Chrome (playwright-core from
// minichord-lab's node_modules, SwiftShader WebGL), like the other harnesses here. Writes screenshots to out_dir.
const { chromium } = require('/home/gregory/minichord-lab/tests/node_modules/playwright-core');
const path = require('path');
const fs = require('fs');

const [base = 'http://localhost:8812', out = '/tmp/five-check'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
let fails = 0;
const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) fails++; };
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, colorScheme: 'light' });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  await page.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('regsim-movehelp', 'seen'); localStorage.setItem('regsim-level', 'apprentice'); } catch {} });
  await page.goto(`${base}/index.html?t=${Date.now()}`);
  await page.waitForSelector('#mode table', { state: 'attached', timeout: 60000 });
  await page.waitForTimeout(1500);
  const pick = async (cat, sel) => { if (await page.$(`#${cat}`)) await page.click(`#${cat} .cat-btn`); await page.click(sel); };
  const shot = async name => { await page.waitForTimeout(1200); await page.locator('#stage').screenshot({ path: path.join(out, `${name}.png`) }); };
  const viewTo = async v => { await pick('cat-view', `#views [data-view="${v}"]`); await page.waitForTimeout(900); };
  const text = () => page.locator('#mode').innerText();
  const bench = () => page.evaluate(() => { const b = document.querySelector('#c').bench(); return { notes: b.notes, cur: b.cur, sharp: b.adj.map(a => !!a.sharp), adj: b.adj }; });
  const button = (re, scope = '#mode') => page.locator(`${scope} button`).filter({ hasText: re }).first();

  // the Sandbox's five keys
  await button(/^Five keys$/).click(); await page.waitForTimeout(1200);
  let b = await bench(), t = await text();
  check(b.notes === 5 && b.cur === 0, `Sandbox five keys: five on the bench, the middle one worked (${b.notes}, ${b.cur})`);
  check(JSON.stringify(b.sharp) === JSON.stringify([false, true, true, false, false]), `white, black, white, black, white (${b.sharp})`);
  check(/level the two sharps/.test(t) && /Play all five/.test(t), 'its text and buttons are the five\'s');
  const hTable = () => page.locator('#mode table').filter({ has: page.locator('th', { hasText: /^Keys$/ }) });
  const heights = () => hTable().locator('tbody td');
  const cells = (await heights().allInnerTexts()).join(' | ');
  check(await heights().count() === 6 && await hTable().locator('td.okc').count() === 5, `at factory the five key heights all pass (${cells})`);
  check((await hTable().locator('thead th').allInnerTexts()).join('|') === 'Keys|Note 1|Note 2 (sharp)|Note 3|Note 4 (sharp)|Note 5', 'the heights read bass to treble');
  const rails = a => [a.restRail, a.damperStop, a.pedalLift].map(v => v.toFixed(4)).join(',');
  check(new Set(b.adj.slice(0, 5).map(rails)).size === 1, 'the five share one set of rails');
  await shot('five-damperrow');
  for (const v of ['keyfront', 'hammerline', 'angle', 'action']) { await viewTo(v); await shot(`five-${v}`); }
  await button(/^Play all five$/).click(); await page.waitForTimeout(2500);
  await button(/^Mess it all up$/).click(); await page.waitForTimeout(800);
  b = await bench();
  check(b.adj[1].balPunch !== b.adj[2].balPunch, `Mess it all up knocks the sharps' heights out each on its own (${b.adj[1].balPunch.toFixed(3)}, ${b.adj[2].balPunch.toFixed(3)})`);
  check(new Set(b.adj.slice(0, 5).map(rails)).size === 1, 'and the rails stay one setting');
  await button(/^Note 2$/).click(); await page.waitForTimeout(800);
  b = await bench();
  check(b.cur === 1 && /Note 2 \(sharp\)/.test(await page.locator('#mode h3').first().innerText()), 'Note 2 picked: the bass sharp');
  await viewTo('keyfront'); await shot('five-messed-keyfront');
  await button(/^Factory regulation$/).click(); await page.waitForTimeout(800);
  check(await hTable().locator('td.okc').count() === 5, 'Factory regulation puts all five heights back');

  // three keys again: the sharp in the middle
  await button(/^Three keys$/).click(); await page.waitForTimeout(1000);
  b = await bench();
  check(b.notes === 3 && JSON.stringify(b.sharp.slice(0, 3)) === JSON.stringify([true, false, false]), `Three keys: the sharp in the middle again (${b.sharp.slice(0, 3)})`);
  await viewTo('keyfront'); await shot('three-keyfront');
  await button(/^One key$/).click(); await page.waitForTimeout(800);
  b = await bench();
  check(b.notes === 1 && !b.sharp[0], 'One key: a natural');

  // Find the fault: the customer's key in the middle of five
  await page.click('.tab[data-mode=diagnose]'); await page.waitForTimeout(1000);
  if (await button(/^Next customer$/).count()) { await button(/^Next customer$/).click(); await page.waitForTimeout(1500); }
  b = await bench(); t = await text();
  check(b.notes === 5 && b.cur === 0 && JSON.stringify(b.sharp) === JSON.stringify([false, true, true, false, false]), `Find the fault: five, the customer's key a natural in the middle (${b.notes}; ${b.sharp})`);
  check(/middle of five/.test(t), 'its text says so');
  check(await page.locator('#neighbors button[data-note]').count() === 5, 'five keys to pick from');
  const customer = JSON.stringify(b.adj[0]);
  check(new Set(b.adj.slice(0, 5).map(rails)).size === 1, 'the customer and its neighbors share one set of rails');
  await button(/^Look down on the keys$/, '#neighbors').click(); await page.waitForTimeout(900); await shot('fault-keytop');
  await button(/^Sight across the hammers$/, '#neighbors').click(); await page.waitForTimeout(900); await shot('fault-hammerline');
  await page.locator('#neighbors .row.notes button[data-note="2"]').click(); await page.waitForTimeout(800);
  t = await text();
  check(/You are on the sharp on the treble side/.test(t), 'a neighbor picked is named: the sharp on the treble side');
  await viewTo('keyfront'); await shot('fault-sharp-keyfront');
  await page.locator('#on-neighbor button').click(); await page.waitForTimeout(600);
  await button(/^One key$/, '#neighbors').click(); await page.waitForTimeout(800);
  b = await bench();
  check(b.notes === 1 && JSON.stringify(b.adj[0]) === customer, 'One key: the customer\'s key alone, its regulation as it was');
  await button(/^With its neighbors$/, '#neighbors').click(); await page.waitForTimeout(800);
  b = await bench();
  check(b.notes === 5 && JSON.stringify(b.adj[0]) === customer, 'and with its neighbors again, still as it was');

  // the exam keeps three, the sharp in the middle
  await page.click('.tab[data-mode=exam]'); await page.waitForTimeout(600);
  await page.locator('#mode button', { hasText: /^Start the/ }).click(); await page.waitForTimeout(1500);
  b = await bench();
  check(b.notes === 3 && b.sharp[0] && !b.sharp[1] && !b.sharp[2], 'the exam: three, the sharp in the middle');

  // the upright's Find the fault: five drawn round the customer's key
  await page.goto(`${base}/index.html?t=${Date.now()}`);
  await page.waitForSelector('#mode table', { state: 'attached', timeout: 60000 }); await page.waitForTimeout(1000);
  await page.click('#action-switch [data-action="upright"]'); await page.waitForTimeout(2500);
  const uview = async v => {
    const item = page.locator(`#views [data-uview="${v}"]`).first();
    if (!(await item.isVisible())) await page.click('#cat-view .cat-btn');
    await item.click(); await page.waitForTimeout(1200);
  };
  await page.click('.tab[data-mode=diagnose]'); await page.waitForTimeout(1500);
  if (await button(/^Next customer$/).count()) { await button(/^Next customer$/).click(); await page.waitForTimeout(1500); }
  for (const v of ['keyfront', 'front']) { await uview(v); await shot(`upright-fault-${v}`); }
  await page.click('.tab[data-mode=sandbox]'); await page.waitForTimeout(1200);
  await uview('keyfront'); await shot('upright-sandbox-keyfront');
  await page.click('.tab[data-mode=exam]'); await page.waitForTimeout(800);
  await page.click('#mode button:has-text("Start the exam")'); await page.waitForTimeout(1500);
  check(/Note 2 \(sharp\)/.test(await text()), 'upright exam: still three, note 2 the sharp');
  await uview('keyfront'); await shot('upright-exam-keyfront');

  check(!errors.length, `no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await browser.close();
  console.log(fails ? `${fails} failed` : 'all passed', `· screenshots in ${out}`);
  process.exit(fails ? 1 : 0);
})();
