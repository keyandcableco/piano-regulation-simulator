// Batch 3 in headless Chrome: maker spec sets (the selector, each band's source, the fallback, the Steinway set this
// action cannot meet), the exam mark with an operation left out, Find the fault beside its neighbours, and the gauges
// laid on the action with the student calling the reading. Screenshots go to <out_dir>.
// node tests/batch3-measure-check.cjs <out_dir> [base_url] [only: specs,exam,neighbours,gauges]
// Needs a server on the checkout and Chrome (playwright-core from minichord-lab's node_modules, SwiftShader WebGL).
const { chromium } = require('/home/gregory/minichord-lab/tests/node_modules/playwright-core');
const fs = require('fs');

const [out, base = 'http://localhost:8812', only = 'specs,exam,neighbours,gauges'] = process.argv.slice(2);
if (!out) { console.error('usage: node tests/batch3-measure-check.cjs <out_dir> [base_url] [sections]'); process.exit(2); }
const want = new Set(only.split(','));
let failed = 0;
const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failed++; };
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const errors = [];
  const open = async (viewport = { width: 1280, height: 900 }) => {
    const page = await (await browser.newContext({ viewport })).newPage();
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('dialog', d => d.accept());
    await page.addInitScript(() => { try { if (!sessionStorage.getItem('kept')) { localStorage.clear(); sessionStorage.setItem('kept', '1'); } localStorage.setItem('regsim-movehelp', 'seen'); } catch {} });
    await page.goto(base + '/index.html?t=' + Date.now());
    await page.waitForSelector('#mode table', { state: 'attached', timeout: 60000 });
    await page.waitForTimeout(1200);
    return page;
  };
  const tools = page => ({
    tap: async sel => { await page.evaluate(s => document.querySelector(s).click(), sel); await page.waitForTimeout(250); },
    btn: async (re, root = '#mode') => { const ok = await page.evaluate(([r, s]) => { const b = [...document.querySelectorAll(`${s} button`)].find(x => new RegExp(r).test(x.textContent)); b?.click(); return !!b; }, [re, root]); await page.waitForTimeout(400); return ok; },
    text: sel => page.evaluate(s => document.querySelector(s)?.textContent ?? '', sel),
    openFold: async re => { await page.evaluate(r => { const d = [...document.querySelectorAll('details.fold')].find(x => new RegExp(r).test(x.querySelector('summary').textContent)); if (d && !d.open) d.querySelector('summary').click(); }, re); await page.waitForTimeout(300); },
    row: name => page.evaluate(n => { const r = [...document.querySelectorAll('#mode table.specs tr')].find(x => x.cells[0]?.textContent.includes(n)); return r ? { cls: r.className, target: r.cells[1].textContent, now: r.cells[2].textContent, src: r.querySelector('.band.src')?.textContent ?? null } : null; }, name),
    atRest: async () => { await page.waitForTimeout(300); await page.waitForFunction(() => document.querySelector('#c').idle(), null, { timeout: 120000 }); },
  });

  // ---------- maker spec sets ----------
  if (want.has('specs')) {
    const page = await open(), { tap, text, openFold, row } = tools(page);
    await page.locator('#units').click(); await page.waitForTimeout(200);   // millimetres
    const sets = await page.evaluate(() => [...document.querySelectorAll('#specset option')].map(o => o.textContent));
    check(sets.join('|') === 'Generic textbook|Steinway (New York)|Steinway (Hamburg)|Kawai', `the selector offers ${sets.join(', ')}`);
    check((await page.inputValue('#specset')) === 'generic' && (await page.evaluate(() => document.querySelector('#specset-note').hidden)), 'the generic set is the default, with no note');
    await openFold('^Hammer, blow'); await openFold('^Jack and rep'); await openFold('^Key');
    const g = { blow: await row('Blow distance'), at: await row('Aftertouch') };
    check(/44\.4/.test(g.blow.target) && g.blow.src === null && g.blow.cls === 'ok', `generic: blow ${g.blow.target}, no source line, in spec`);
    for (const [id, name, blowRe, blowSrc, atOk] of [['kawai', 'Kawai', /46\.0/, /^Kawai: 46 mm/, true], ['hamburg', 'Hamburg', /46\.0.*45 to 47 mm/, /^Hamburg: 45 to 47 mm/, true],
      ['steinwayNY', 'Steinway', /44\.4/, /^Steinway: 1 3\/4 in/, false]]) {
      await page.selectOption('#specset', id); await page.waitForTimeout(500);
      // the regulated key of the set: Factory regulation deals it
      await page.evaluate(() => [...document.querySelectorAll('#mode button')].find(b => b.textContent === 'Factory regulation').click()); await page.waitForTimeout(700);
      const blow = await row('Blow distance'), at = await row('Aftertouch'), dip = await row('Key dip'), lo = await row('Let-off from string');
      check(blowRe.test(blow.target) && blowSrc.test(blow.src ?? '') && blow.cls === 'ok', `${name}: blow ${blow.target} · ${blow.src} · ${blow.now}`);
      check(lo.cls === 'ok' && new RegExp(`^${name}`).test(lo.src ?? ''), `${name}: let-off ${lo.now} in its band (${lo.src})`);
      if (id === 'steinwayNY') check(/^Steinway: 3\/64 to 1\/16 in/.test(at.src) && at.cls === 'bad', `Steinway: aftertouch ${at.now} is out of Steinway's band on this action (${at.target})`);
      else check(/^generic textbook figure: .* prints none/.test(at.src ?? '') && at.cls === 'ok', `${name}: aftertouch falls back to the generic band and says so (${at.src}); ${at.now}`);
      if (id === 'hamburg') check(/^generic textbook figure: Hamburg prints none/.test(dip.src ?? ''), `Hamburg: dip falls back too (${dip.src})`);
      const note = await text('#specset-about'), sum = await text('#specset-sum');
      check(id === 'steinwayNY' ? /cannot meet this set/.test(note) : id === 'kawai' ? /meets Kawai/.test(note) : /prints no dip or aftertouch figure/.test(note), `${name}: the note says how the set fits this action`);
      check(/cannot meet it/.test(sum) === (id === 'steinwayNY'), `${name}: its heading reads "${sum}"`);
      check(new RegExp(name === 'Hamburg' ? 'Steinway \\(Hamburg\\)' : name).test(await text('#specfoot')), `${name}: the footer names the set`);
      await page.locator('#panel').screenshot({ path: `${out}/specset-${id}.png` });
    }
    // remembered, and back to generic unchanged
    await page.reload(); await page.waitForSelector('#mode table', { state: 'attached' }); await page.waitForTimeout(1200);
    check((await page.inputValue('#specset')) === 'steinwayNY', 'the set is remembered over a reload');
    await page.selectOption('#specset', 'generic'); await page.waitForTimeout(400);
    await page.evaluate(() => [...document.querySelectorAll('#mode button')].find(b => b.textContent === 'Factory regulation').click()); await page.waitForTimeout(700);
    await openFold('^Hammer, blow'); await openFold('^Jack and rep');
    const b2 = await row('Blow distance'), a2 = await row('Aftertouch');
    check(b2.src === null && b2.cls === 'ok' && a2.cls === 'ok' && (await text('#specfoot')) === 'Targets are generic textbook numbers, not one maker\'s specs.', 'back on the generic set: no source lines, the factory key in spec');
    // the upright has no spec set row
    await tap('#action-switch [data-action="upright"]'); await page.waitForTimeout(2500);
    check(await page.evaluate(() => getComputedStyle(document.querySelector('#specset-row')).display === 'none'), 'the upright hides the grand\'s spec set row');
    await page.context().close();
  }

  // ---------- the exam mark ----------
  if (want.has('exam')) {
    const page = await open(), { tap, btn, text } = tools(page);
    await tap('.tab[data-mode="exam"]');
    check(/no operation may be left out/.test(await text('#mode')), 'the exam\'s opening says an operation left out caps the mark');
    await btn('^Start the'); await page.waitForTimeout(800);
    await btn('^Hand it in', '#actionbar'); await page.waitForTimeout(1500);
    const head = await text('#mode .verdict h2'), left = await text('#exam-skipped');
    check(/not yet/.test(head) && /^Left out: /.test(left) && /Let-off|Drop|Blow/.test(left), `an untouched model handed in: ${head} · ${left.slice(0, 90)}…`);
    await page.locator('#panel').screenshot({ path: `${out}/exam-left-out.png` });
    await page.context().close();
  }

  // ---------- Find the fault beside its neighbours ----------
  if (want.has('neighbours')) {
    const page = await open(), { tap, btn, text, openFold, row, atRest } = tools(page);
    const bench = () => page.evaluate(() => document.querySelector('#c').bench());
    const same = (a, b) => Object.keys(b).every(k => a[k] === b[k]);
    await page.selectOption('#level', 'apprentice'); await page.waitForTimeout(300);   // the panel lists the adjustments
    await tap('.tab[data-mode="diagnose"]');
    check(/between two regulated neighbors/.test(await text('#mode')) && (await bench()).notes === 1, 'Find the fault opens on one key and says the customer\'s key will stand between neighbors');
    await btn('^Next customer$'); await page.waitForTimeout(900);
    let b = await bench();
    check(b.notes === 3 && b.cur === 0, 'a customer\'s key comes with two neighbors: three notes on the bench, the customer\'s in the middle');
    // (the rest rail, damper stop rail and pedal are one for all three, and the three are as worn as each other)
    const reg = { ...b.factory, wear: b.adj[0].wear || 0, restRail: b.adj[0].restRail, damperStop: b.adj[0].damperStop, pedalLift: b.adj[0].pedalLift };
    check(JSON.stringify(b.adj[0]) !== JSON.stringify(b.factory) && same(b.adj[1], reg) && same(b.adj[2], reg), 'the customer\'s key has the fault; both neighbors are regulated, on the same rails and as worn');
    check((await page.evaluate(() => [...document.querySelectorAll('#neighbors [data-note]')].map(x => x.textContent).join('|'))) === 'Bass side|Customer\'s key|Treble side', 'the three are named, bass to treble');
    await page.waitForTimeout(1200);
    await page.locator('#stage canvas#c').screenshot({ path: `${out}/neighbours-angle.png` });
    await btn('^Sight across the hammers$'); await page.waitForTimeout(1500);
    await page.locator('#stage canvas#c').screenshot({ path: `${out}/neighbours-hammerline.png` });
    await btn('^Play all three$'); await atRest();
    // a neighbor: its tests read a regulated action, and it can't be adjusted
    await tap('#neighbors [data-note="1"]'); await page.waitForTimeout(600);
    b = await bench();
    check(b.cur === 1 && /bass neighbor, which is regulated/.test(await text('#on-neighbor')), 'picking the bass neighbor says it is regulated, a reference');
    await openFold('^Hammer, blow'); await openFold('^Jack and rep');
    const blow = await row('Blow distance'), lo = await row('Let-off from string');
    check(blow?.cls === 'ok' && lo?.cls === 'ok', `the neighbor reads in spec (blow ${blow?.now}, let-off ${lo?.now})`);
    const plus = await page.evaluate(() => { const k = [...document.querySelectorAll('#mode .knobs button')].find(x => /^\+|＋/.test(x.textContent.trim()) && !x.disabled); k?.click(); return !!k; });
    await page.waitForTimeout(300);
    const after = await bench();
    check(plus && same(after.adj[1], b.adj[1]) && /This neighbor is regulated/.test(await text('#toasts')), 'turning a screw on a neighbor does nothing, and says why');
    await page.locator('#panel').screenshot({ path: `${out}/neighbours-panel.png` });
    // checking the work goes back to the customer's key
    await btn('^Check', '#actionbar'); await page.waitForTimeout(600);
    check((await bench()).cur === 0 && /still out of spec/.test(await text('#verdict')), `Check my work checks the customer's key (${(await text('#verdict h3'))})`);
    // kept over a visit to another tab, neighbors and all
    await tap('.tab[data-mode="sandbox"]'); await page.waitForTimeout(600);
    check((await bench()).notes === 1, 'the Sandbox is back to one key');
    await tap('.tab[data-mode="diagnose"]'); await page.waitForTimeout(800);
    const back = await bench();
    check(back.notes === 3 && same(back.adj[0], b.adj[0]) && same(back.adj[1], b.adj[1]), 'back on Find the fault: the same customer\'s key, between its neighbors again');
    // one key alone, as before
    await btn('^One key$'); await page.waitForTimeout(600);
    check((await bench()).notes === 1 && !(await page.$('#neighbors [data-note]')), 'One key: the customer\'s key alone, as it was before');
    await btn('^With its neighbors$'); await page.waitForTimeout(600);
    check((await bench()).notes === 3, 'With its neighbors: three again');
    await page.context().close();
  }

  check(errors.length === 0, `no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await browser.close();
  console.log(failed ? `${failed} FAILED` : 'all ok');
  process.exit(failed ? 1 : 0);
})();
