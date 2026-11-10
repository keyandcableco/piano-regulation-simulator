// The picture's bars as menus (controls.js), driven in headless Chrome at desktop and phone widths: every view and key
// action through its menu (or out on the bar, where it has room), a menu closing on a pick, an outside tap and Escape, the
// keyboard and the keys shown on the buttons, the bars fitting with no sideways scroll, the buttons staying put as their words change, each mode, the upright's menus, and no page errors.
// node tests/controls-check.cjs <out_dir> [base_url]
// Needs a server on the checkout and Chrome (playwright-core from minichord-lab's node_modules, SwiftShader WebGL).
const { chromium } = require('/home/gregory/minichord-lab/tests/node_modules/playwright-core');
const fs = require('fs');
const path = require('path');

const [out, base = 'http://localhost:8812'] = process.argv.slice(2);
if (!out) { console.error('usage: node tests/controls-check.cjs <out_dir> [base_url]'); process.exit(2); }
// (the short ones: a phone with its browser's own bars showing, an iPhone SE's 553 px the shortest)
const SIZES = [['desktop', 1280, 800], ['phone360', 360, 740], ['phone375', 375, 812], ['phone390', 390, 844], ['phone360x640', 360, 640], ['phoneSE', 375, 553]];
// the views only tests use, as app.js names them on the View button (TEST_VIEWS there; upright-app.js's too)
const TEST_VIEW_NAMES = ['Traveling', 'Jack from the keys', 'Backcheck, end on', 'Backcheck, above', 'Damper heads', 'Three dampers', 'Key tops', 'Hammer head', 'Jack and hammer', 'Wippen', 'Reading the rule'];
const GRAND_VIEWS = ['action', 'angle', 'keyfront', 'escapement', 'hammer', 'rails', 'hammerline', 'backcheck', 'dampers'];
const UPRIGHT_VIEWS = ['action', 'angle', 'front', 'keyfront', 'whole', 'wippen', 'butt', 'jackfront', 'check', 'damper'];

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  let failed = 0;
  const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failed++; };
  for (const [size, w, h] of SIZES) {
    const phone = w < 500;
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: phone ? 2 : 1, hasTouch: phone, isMobile: phone });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    await page.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('regsim-movehelp', 'seen'); } catch {} });
    const shot = name => page.screenshot({ path: path.join(out, `${size}-${name}.png`) });
    const tap = sel => phone ? page.tap(sel) : page.click(sel);
    const menuOpen = id => page.$eval(`#${id}`, m => !m.hidden);
    const viewNow = () => page.$eval('#view-now', e => e.textContent);
    const pick = async (cat, item) => { await tap(`#${cat} .cat-btn`); await tap(item); };
    // a key button: out on the bar where it has room, else in the Key & pedal menu
    const keysOut = () => page.$eval('#cat-key', e => e.hidden);
    const keyPick = async item => { if (await keysOut()) await tap(item); else await pick('cat-key', item); };
    const t = (label) => `${size}: ${label}`;
    await page.goto(`${base}/index.html?t=${Date.now()}`);
    await page.waitForSelector('#mode table', { state: 'attached', timeout: 60000 });
    await page.waitForTimeout(1500);

    // the bars fit the picture: no sideways scroll, nothing past the edge
    const fit = async label => {
      const r = await page.evaluate(() => {
        const st = document.getElementById('stage').getBoundingClientRect();
        return ['#views', '#keybar'].map(s => { const e = document.querySelector(s), b = e.getBoundingClientRect();
          const kids = [...e.querySelectorAll(':scope > button, :scope > .cat > .cat-btn')].filter(k => k.offsetParent);
          return { s, scroll: e.scrollWidth - e.clientWidth, right: Math.max(...kids.map(k => k.getBoundingClientRect().right)) - st.right, top: Math.min(...kids.map(k => k.getBoundingClientRect().top)), bottom: Math.max(...kids.map(k => k.getBoundingClientRect().bottom)) }; });
      });
      for (const b of r) check(b.scroll <= 0 && b.right <= -8 && b.bottom - b.top < 60, t(`${label} ${b.s} fits on one row (overflow ${b.scroll}, ${(-b.right).toFixed(0)} px to spare, ${(b.bottom - b.top).toFixed(0)} px tall)`));
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), t(`${label} page has no sideways scroll`));
      // no button's words cut short (every speed, and the longest view name in the menu)
      const cut = await page.evaluate(async names => {
        const bad = [], fits = (e, why) => { if (e.scrollWidth > e.clientWidth + 0.5) bad.push(why); };
        for (const b of document.querySelectorAll('.bar > button, .cat-btn')) if (b.offsetParent) fits(b, b.textContent);
        const sp = document.querySelector('#speed-btn .v'), was = sp.textContent;
        for (const t of ['Real speed', 'Slow ×10', 'Slow ×50']) { sp.textContent = t; fits(sp, t); }
        sp.textContent = was;
        const vn = document.getElementById('view-now'), vw = vn.textContent;
        for (const b of document.querySelectorAll('#menu-view b')) { vn.textContent = b.textContent; if (getComputedStyle(b.closest('button')).display !== 'none') fits(vn, b.textContent); }
        for (const n of names) { vn.textContent = n; fits(vn, n); }
        vn.textContent = vw;
        return bad;
      }, TEST_VIEW_NAMES);
      check(!cut.length, t(`${label} no words cut short${cut.length ? ': ' + cut.join(', ') : ''}`));
    };
    await fit('grand');
    await shot('grand');
    // the key buttons out on a wide picture's bar, in the menu on a phone's; their keys shown only with a keyboard
    const isOut = await keysOut(), outN = await page.$$eval('#keybar > .kout', l => l.filter(b => b.offsetParent).length);
    check(phone ? !isOut && outN === 0 : isOut && outN === 5, t(`key buttons ${isOut ? `out on the bar (${outN})` : 'in the Key & pedal menu'}`));
    const chip = await page.$eval('#k-release', b => getComputedStyle(b, '::after').content);
    check(phone ? chip === 'none' || chip === 'normal' : chip === '"Esc"', t(`Let key up ${phone ? 'shows no key' : 'shows its key'} (${chip})`));

    // where the bar buttons sit, to see they don't move as words change
    const spots = () => page.evaluate(() => [...document.querySelectorAll('.bar > button, .cat-btn')].filter(b => b.offsetParent).map(b => { const r = b.getBoundingClientRect(); return `${r.left.toFixed(1)},${r.top.toFixed(1)},${r.width.toFixed(1)}`; }).join(' '));
    const spots0 = await spots();

    // every grand view through the View menu, the menu closing on the pick, and the button naming the view
    for (const v of GRAND_VIEWS) {
      await pick('cat-view', `[data-view="${v}"]`);
      const name = await page.$eval(`[data-view="${v}"] b`, e => e.textContent);
      check(!(await menuOpen('menu-view')) && (await viewNow()) === name && await page.$eval(`[data-view="${v}"]`, e => e.classList.contains('on')), t(`view ${v} picked: menu closed, View says "${name}"`));
    }
    await pick('cat-view', '[data-view="angle"]');
    await tap('#cat-view .cat-btn'); await page.waitForTimeout(300); await shot('menu-view');
    // an open menu is whole on screen: no part of it past the window's edges, and nothing in it scrolled out of sight
    for (const id of ['menu-view']) {
      const r = await page.$eval(`#${id}`, m => { const b = m.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom, s: m.scrollHeight - m.clientHeight, W: innerWidth, H: document.documentElement.clientHeight }; });
      check(r.l >= 0 && r.r <= r.W && r.t >= 0 && r.b <= r.H && r.s <= 1, t(`${id} on screen (${r.l.toFixed(0)}-${r.r.toFixed(0)} × ${r.t.toFixed(0)}-${r.b.toFixed(0)}, ${r.s} px scrolled)`));
    }
    // an outside tap closes it
    await (phone ? page.touchscreen.tap(w / 2, 200) : page.mouse.click(w * 0.35, 300));
    check(!(await menuOpen('menu-view')), t('an outside tap closes the menu'));
    // Show: part names, key inset, distances (Sandbox)
    for (const id of ['labels', 'inset-btn', 'dist-btn']) {
      const before = await page.$eval(`#${id}`, e => e.classList.contains('on'));
      await pick('cat-show', `#${id}`);
      check(await page.$eval(`#${id}`, e => e.classList.contains('on')) !== before && !(await menuOpen('menu-show')), t(`Show: ${id} toggles and the menu closes`));
      await pick('cat-show', `#${id}`);
    }
    await tap('#cat-show .cat-btn'); await page.waitForTimeout(300); await shot('menu-show'); await page.keyboard.press('Escape');

    // the key: Play, Let key up, and the Key & pedal menu
    const keyDown = () => page.evaluate(() => document.getElementById('keystate').textContent);
    // wait (up to 40 s) for the key's state line to say so: a blow and a key's return take the action's own time,
    // at Slow x10 unless the speed was changed, and a slow headless frame rate stretches that further
    const untilKey = re => page.waitForFunction(src => new RegExp(src).test(document.getElementById('keystate').textContent), re.source, { timeout: 40000 }).catch(() => {});
    await pick('cat-speed', '[data-speed="1"]');
    check((await page.$eval('#speed-btn .v', e => e.textContent)) === 'Real speed', t('Speed: Real speed named on the button'));
    await tap('#k-play'); await page.waitForTimeout(150);
    check(/going down|held|coming up/.test(await keyDown()), t(`Play plays the key (${await keyDown()})`));
    await page.waitForTimeout(1200);
    await keyPick('#k-strike'); await page.waitForTimeout(800);
    check(/held/.test(await keyDown()) && !(await menuOpen('menu-key')), t(`Strike & hold holds it (${await keyDown()})`));
    // Escape with a menu open closes the menu and leaves the key down (Key & pedal's, or Speed's while it's hidden)
    const escCat = await keysOut() ? 'speed' : 'key';
    await tap(`#cat-${escCat} .cat-btn`); await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    check(!(await menuOpen(`menu-${escCat}`)) && /held/.test(await keyDown()), t(`Escape closes the ${escCat} menu and leaves the held key down`));
    await keyPick('#k-ease'); await page.waitForTimeout(600);
    check(/held|coming up/.test(await keyDown()), t(`Ease up lets it up a little (${await keyDown()})`));
    // (the key comes up on its own and bounces a little on its back rail before it is at rest: waited for, not timed)
    await tap('#k-release'); await untilKey(/rest/);
    check(/rest/.test(await keyDown()), t(`Let key up lets it up (${await keyDown()})`));
    await keyPick('#k-slow'); await page.waitForTimeout(400);
    check(/going down|held/.test(await keyDown()), t(`Press slowly presses (${await keyDown()})`));
    await tap('#k-release'); await page.waitForTimeout(1500);
    await keyPick('#k-loop'); await page.waitForTimeout(300);
    check(await page.$eval('#k-loop', e => e.classList.contains('on')) && (await keysOut() ? await page.$eval('#k-loop', e => e.getAttribute('aria-pressed') === 'true') : await page.$eval('#cat-key', e => e.classList.contains('latched'))),
      t(`Loop turns on, ${await keysOut() ? 'pressed on the bar' : 'with the dot on Key & pedal'}`));
    await tap('#k-release'); await page.waitForTimeout(300);
    check(!(await page.$eval('#k-loop', e => e.classList.contains('on'))), t('Let key up stops the loop'));
    await keyPick('#k-pedal');
    check(await page.$eval('#k-pedal', e => e.classList.contains('on') && e.getAttribute(e.classList.contains('kout') ? 'aria-pressed' : 'aria-checked') === 'true'), t('Pedal goes down (aria-checked or -pressed)'));
    if (await keysOut()) await shot('keybar-out'); else { await tap('#cat-key .cat-btn'); await page.waitForTimeout(300); await shot('menu-key'); await page.keyboard.press('Escape'); }
    await keyPick('#k-pedal');
    for (const s of ['0.02', '0.1']) {
      await pick('cat-speed', `[data-speed="${s}"]`);
      check(await page.$eval(`[data-speed="${s}"]`, e => e.classList.contains('on')), t(`Speed ${s} picked`));
    }
    check((await page.$eval('#speed-btn .v', e => e.textContent)) === 'Slow ×10', t('Speed button says Slow ×10'));
    await tap('#cat-speed .cat-btn'); await page.waitForTimeout(300); await shot('menu-speed'); await page.keyboard.press('Escape');

    // frame by frame: Pause and step brings out the frame buttons; Go to let-off; step; Run; Done
    await pick('cat-speed', '#k-frames'); await page.waitForTimeout(200);
    check(await page.$eval('#framepad', e => !e.hidden) && (await page.$eval('#k-pause', e => e.textContent)) === 'Run', t('Pause and step: paused, frame buttons out'));
    await pick('cat-speed', '#k-letoff-m');
    await page.waitForFunction(() => /let-off in/.test(document.getElementById('keypos').textContent) || /before let-off/.test(document.getElementById('lastevent').textContent), null, { timeout: 60000 });
    check((await viewNow()) === 'Jack & knuckle', t('Go to let-off: View says Jack & knuckle'));
    await page.waitForTimeout(300); await shot('framepad');
    // nothing covers the frame buttons, Play or Let key up while the frame buttons are out (a short phone picture too)
    const covered = await page.evaluate(() => ['#k-pause', '#k-back', '#k-fwd', '#k-letoff', '#frames-done', '#k-play', '#k-release'].filter(s => {
      const b = document.querySelector(s), r = b.getBoundingClientRect(), st = document.getElementById('stage').getBoundingClientRect();
      if (r.bottom > st.bottom || r.top < st.top) return true;
      return [[r.left + 4, r.top + 4], [r.right - 4, r.bottom - 4], [(r.left + r.right) / 2, (r.top + r.bottom) / 2]].some(([x, y]) => !b.contains(document.elementFromPoint(x, y)));
    }));
    check(!covered.length, t(`frame buttons, Play and Let key up all uncovered${covered.length ? ': covered ' + covered.join(' ') : ''}`));
    const kp = () => page.$eval('#keypos', e => e.textContent);
    const k0 = await kp(); await tap('#k-fwd'); await page.waitForTimeout(200); const k1 = await kp();
    await tap('#k-back'); await page.waitForTimeout(200); const k2 = await kp();
    check(phone || (k0 !== k1 && k2 === k0), t(`frame ▶ then ◀ (${k0} | ${k1} | ${k2})`));
    await tap('#k-pause'); await page.waitForTimeout(200);
    check((await page.$eval('#k-pause', e => e.textContent)) === 'Pause' && await page.$eval('#framepad', e => !e.hidden), t('Run runs, and the frame buttons stay out'));
    await tap('#k-pause'); await tap('#frames-done'); await page.waitForTimeout(200);
    check(await page.$eval('#framepad', e => e.hidden) && (await page.$eval('#k-pause', e => e.textContent)) === 'Pause', t('Done: running, frame buttons away'));
    await tap('#k-release'); await page.waitForTimeout(1500);

    // nothing in the bars moved while their words changed (view names, speeds, Pause / Run, key states)
    await pick('cat-view', '[data-view="angle"]'); await pick('cat-speed', '[data-speed="0.1"]');
    const spots1 = await spots();
    check(spots1 === spots0, t(`bar buttons stayed put${spots1 === spots0 ? '' : `: ${spots0} → ${spots1}`}`));

    // the keyboard: Enter opens a menu on its item that is on, the arrows move through its grid, Enter picks, focus back
    // on the category, whose arrows then still slide the view rather than open it
    if (!phone) {
      await page.focus('#view-btn'); await page.keyboard.press('Enter');
      const f0 = await page.evaluate(() => document.activeElement.dataset.view);
      await page.keyboard.press('ArrowDown'); const f1 = await page.evaluate(() => document.activeElement.dataset.view);
      await page.keyboard.press('ArrowLeft'); const f2 = await page.evaluate(() => document.activeElement.dataset.view);
      await page.keyboard.press('Enter'); await page.waitForTimeout(200);
      const back = await page.evaluate(() => document.activeElement.id);
      check(f0 === 'angle' && f1 === 'escapement' && f2 === 'keyfront' && back === 'view-btn' && (await viewNow()) === 'Key front', t(`keyboard: ${f0} ↓ ${f1} ← ${f2}, Enter picks, focus back on View`));
      await page.keyboard.press('ArrowDown');
      check(!(await menuOpen('menu-view')), t('an arrow on the View button leaves the menu shut (it slides the view)'));
      await page.keyboard.press('Enter'); await page.keyboard.press('Tab');
      check(!(await menuOpen('menu-view')), t('Tab leaves and closes the menu'));
      await page.evaluate(() => document.activeElement.blur());
      // a mouse pick lets go of the focus: Space strikes the key again; K pauses (the frame buttons come out), comma and
      // full stop step, K runs, P works the pedal
      await pick('cat-view', '[data-view="hammer"]');
      await page.keyboard.down('Space'); await page.waitForTimeout(400);
      const held = await keyDown(); await page.keyboard.up('Space'); await page.waitForTimeout(500);   // (at Slow ×10)
      check(/going down|held/.test(held) && /coming up|rest/.test(await keyDown()), t(`Space after a menu pick strikes the key (${held}), and lets it go (${await keyDown()})`));
      await page.waitForTimeout(2500);
      await page.keyboard.press('k');
      const padOut = await page.$eval('#framepad', e => !e.hidden) && (await page.$eval('#k-pause', e => e.textContent)) === 'Run';
      await page.keyboard.press('k'); await page.keyboard.press('p');
      const pedal = await page.$eval('#k-pedal', e => e.classList.contains('on'));
      await page.keyboard.press('p');
      check(padOut && pedal && (await page.$eval('#k-pause', e => e.textContent)) === 'Pause', t('K pauses with the frame buttons out, K runs, P works the pedal'));
      await tap('#frames-done');
      // the letters shown on the key buttons: H holds, E eases it up, Esc lets it up, S presses slowly, L loops and stops
      await page.keyboard.press('h'); await untilKey(/held/); await page.waitForTimeout(1500); const dH = await kp(), sH = await keyDown();
      await page.keyboard.press('e'); await page.waitForTimeout(2500); const dE = await kp(), sE = await keyDown();
      check(/held/.test(sH) && dE !== dH && !/rest/.test(sE), t(`H strikes and holds (${sH}, ${dH}), E eases it up (${sE}, ${dE})`));
      await page.keyboard.press('Escape'); await page.waitForTimeout(2500);
      await page.keyboard.press('s'); await page.waitForTimeout(400); const sS = await keyDown();
      await page.keyboard.press('Escape'); await page.waitForTimeout(2500);
      await page.keyboard.press('l'); const lOn = await page.$eval('#k-loop', e => e.classList.contains('on'));
      await page.keyboard.press('l'); const lOff = await page.$eval('#k-loop', e => !e.classList.contains('on'));
      check(/going down|held/.test(sS) && lOn && lOff, t(`S presses slowly (${sS}), L loops and stops`));
      await page.keyboard.press('Escape'); await page.waitForTimeout(2500);
      // G goes to let-off; full stop and comma step on and back
      await page.keyboard.press('g');
      await page.waitForFunction(() => /let-off in/.test(document.getElementById('keypos').textContent), null, { timeout: 60000 });
      const g0 = await kp(); await page.keyboard.press('.'); await page.waitForTimeout(200); const g1 = await kp();
      await page.keyboard.press(','); await page.waitForTimeout(200); const g2 = await kp();
      check(g0 !== g1 && g2 === g0, t(`G goes to let-off, full stop then comma step (${g0} | ${g1} | ${g2})`));
      await shot('keys-framepad');
      await tap('#frames-done'); await page.keyboard.press('Escape'); await page.waitForTimeout(1500);

      // narrower windows: the bar pulls in, then the buttons go back in the menu; widened with Key & pedal open, the
      // menu closes as its buttons come out; a resize while in Tools is caught up on the way back
      // (1200: with the Touch button on the bar the buttons stay out, pulled in, down to about 1160 px wide; it was 1100)
      await page.setViewportSize({ width: 1200, height: h }); await page.waitForTimeout(500);
      check(await keysOut() && await page.$eval('#keybar', e => e.classList.contains('tight')), t('1200 wide: key buttons out, the bar pulled in'));
      await fit('1200 wide');
      await page.setViewportSize({ width: 1000, height: h }); await page.waitForTimeout(500);
      check(!(await keysOut()), t('1000 wide: key buttons in the menu'));
      await fit('1000 wide');
      await tap('#cat-key .cat-btn'); await page.waitForTimeout(200);
      await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(500);
      check(await keysOut() && !(await menuOpen('menu-key')), t('widened with Key & pedal open: buttons out, the menu closed'));
      await tap('.tab[data-mode="tools"]'); await page.waitForTimeout(500);
      await page.setViewportSize({ width: 1000, height: h }); await page.waitForTimeout(300);
      await tap('.tab[data-mode="sandbox"]'); await page.waitForTimeout(500);
      check(!(await keysOut()), t('narrowed in Tools: back in the Sandbox the buttons are in the menu'));
      await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(500);
      check(await keysOut(), t('back to full width: buttons out again'));
    }

    // each mode: the View button follows the views a mode or a test picks
    for (const m of ['learn', 'diagnose', 'exam', 'drills', 'sandbox']) {
      await tap(`.tab[data-mode="${m}"]`); await page.waitForTimeout(600);
      const ok = await page.evaluate(() => { const on = document.querySelector('[data-view].on'); return !on || on.querySelector('b').textContent === document.getElementById('view-now').textContent; });
      check(ok, t(`${m}: View says "${await viewNow()}", its menu agrees`));
      if (m === 'learn') await shot('learn');
    }
    // a test switches the view itself
    await tap('.tab[data-mode="learn"]'); await page.waitForTimeout(400);
    const tb = await page.$('#mode button.test');
    if (tb) {
      await tb.click(); await page.waitForTimeout(400);
      const dis = await page.$eval('#k-play', e => e.disabled);
      await page.waitForFunction(() => !document.querySelector('#mode button.test')?.disabled, null, { timeout: 180000 });
      check(dis && (await viewNow()).length > 0, t(`a Learn test: key buttons wait, View says "${await viewNow()}"`));
    }
    await tap('.tab[data-mode="sandbox"]'); await page.waitForTimeout(400);

    // the upright: its own views, key buttons and speeds in the same menus, the grand's hidden
    const grandView = await viewNow();
    await tap('#action-switch [data-action="upright"]');
    await page.waitForSelector('#cu', { state: 'visible', timeout: 60000 }); await page.waitForTimeout(1200);
    await fit('upright');
    await shot('upright');
    for (const v of UPRIGHT_VIEWS) {
      await pick('cat-view', `[data-uview="${v}"]`);
      const name = await page.$eval(`[data-uview="${v}"] b`, e => e.textContent);
      check((await viewNow()) === name && !(await menuOpen('menu-view')), t(`upright view ${v}: "${name}"`));
    }
    await tap('#cat-view .cat-btn'); await page.waitForTimeout(300);
    check(await page.evaluate(() => [...document.querySelectorAll('#menu-view button')].filter(b => b.offsetParent).every(b => b.dataset.uview)), t('upright View menu holds only the upright views'));
    await shot('upright-menu-view'); await page.keyboard.press('Escape');
    // its key inset, from the Show menu, off and on (it starts on where the stage is 700 px wide; shown in any view but the key front)
    await pick('cat-view', '[data-uview="action"]');
    const uInset = '#showmenu button[data-upright]:has-text("Key inset")';
    const insetState = () => page.evaluate(() => [[...document.querySelectorAll('#showmenu button[data-upright]')].find(b => b.textContent.includes('Key inset')).getAttribute('aria-checked'),
      !document.getElementById('inset-u').hidden].join());
    const inset0 = await insetState();
    await pick('cat-show', uInset); await page.waitForTimeout(400);
    const inset1 = await insetState();
    await pick('cat-show', uInset); await page.waitForTimeout(400);
    const inset2 = await insetState();
    check([inset0, inset1].sort().join('|') === 'false,false|true,true' && inset2 === inset0, t(`upright: Key inset from the Show menu (${inset0} | ${inset1} | ${inset2})`));
    await tap('#keybar button[data-upright].kplay'); await page.waitForTimeout(300);
    const uOut = await page.$$eval('#keybar > .kout[data-upright]', l => l.filter(b => b.offsetParent).length);
    check(phone ? uOut === 0 : uOut === 4 && await keysOut(), t(`upright: key buttons ${uOut ? `out on the bar (${uOut})` : 'in the menu'}`));
    const uSus = '#keydock button[data-upright]:has-text("Sustain pedal")';
    await keyPick(uSus);
    check(await keysOut() ? await page.$eval(uSus, e => e.getAttribute('aria-pressed') === 'true') : await page.$eval('#cat-key', e => e.classList.contains('latched')), t('upright: Sustain pedal on, shown on its button or the dot'));
    await keyPick(uSus);
    await keyPick('#keydock button[data-upright]:has-text("Strike & hold")'); await page.waitForTimeout(400);
    await tap('#keybar button[data-upright]:has-text("Let key up")');
    if (!phone) {   // its keys: H strikes and holds, S presses slowly
      const uState = () => page.$eval('.u-keystate', e => e.textContent);
      await page.waitForTimeout(1500);
      await page.keyboard.press('h'); await page.waitForTimeout(1200); const uH = await uState();
      await page.keyboard.press('Escape'); await page.waitForTimeout(1500);
      await page.keyboard.press('s'); await page.waitForTimeout(400); const uS = await uState();
      await page.keyboard.press('Escape'); await page.waitForTimeout(1500);
      check(/held|going down/.test(uH) && /going down|held/.test(uS), t(`upright: H strikes and holds (${uH}), S presses slowly (${uS})`));
    }
    await pick('cat-speed', '[data-uspeed="1"]');
    check((await page.$eval('#speed-btn .v', e => e.textContent)) === 'Real speed', t('upright: Speed button says Real speed'));
    if (!(await keysOut())) { await tap('#cat-key .cat-btn'); await page.waitForTimeout(300); await shot('upright-menu-key'); await page.keyboard.press('Escape'); }
    await tap('#action-switch [data-action="grand"]'); await page.waitForTimeout(800);
    check((await viewNow()) === grandView, t(`back on the grand: View says "${await viewNow()}" again`));
    check((await page.$eval('#speed-btn .v', e => e.textContent)) === 'Slow ×10', t('back on the grand: its own speed, Slow ×10'));

    check(!errors.length, t(`no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`));
    await ctx.close();
  }
  await browser.close();
  console.log(failed ? `${failed} FAILED` : 'all passed');
  process.exit(failed ? 1 : 0);
})();
