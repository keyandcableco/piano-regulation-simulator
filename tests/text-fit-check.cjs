// Words that run together, in the panel, the part cards and the bars over the picture: two pieces of text on top of each
// other, a word spilling out of its button or cut off at an edge (a sideways scroll), or two pieces of text touching with
// no space between them. Every tab of both actions (each Learn step, a few customers, the exam), and the card of every part
// a hover finds in the main views, before and after its buttons are pressed, at desktop, phone and phone-on-its-side sizes.
// Each problem is printed once, with where it was first seen, and a picture of it saved. It also fails when it couldn't
// look: a page error, a step that threw, a card button that wouldn't press, or fewer than 10 part cards opened.
// node tests/text-fit-check.cjs <out_dir> [base_url]
// Needs a server on the checkout and Chrome (playwright-core from minichord-lab's node_modules, SwiftShader WebGL).
const { chromium } = require('/home/gregory/minichord-lab/tests/node_modules/playwright-core');
const fs = require('fs');
const path = require('path');

const [out, base = 'http://localhost:8812', only] = process.argv.slice(2);
if (!out) { console.error('usage: node tests/text-fit-check.cjs <out_dir> [base_url] [desktop|phone360|side740]'); process.exit(2); }
const SIZES = [['desktop', 1280, 800], ['phone360', 360, 740], ['side740', 740, 360]].filter(s => !only || s[0] === only);
const VIEWS = { grand: ['action', 'escapement', 'keyfront', 'hammerline', 'backcheck', 'dampers', 'rails'],
  upright: ['action', 'wippen', 'butt', 'jackfront', 'check', 'damper', 'keyfront'] };

// runs in the page: what's wrong with the text under root
function textFit(rootSel) {
  const root = document.querySelector(rootSel), bad = [];
  if (!root || !root.getClientRects().length) return bad;
  const say = (kind, what, r) => bad.push({ kind, what: what.replace(/\s+/g, ' ').trim(), x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width) });
  const name = e => e.id ? `#${e.id}` : e.className && typeof e.className === 'string' ? `${e.tagName.toLowerCase()}.${e.className.split(' ')[0]}` : e.tagName.toLowerCase();
  const pieces = [];
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n; (n = tw.nextNode());) {
    const p = n.parentElement;
    // (a closed fold's contents still give rects, piled where the fold is)
    if (!n.data.trim() || p.closest('.plabel, .callout, #tip, option, script, style') || !p.checkVisibility({ visibilityProperty: true })) continue;
    const r = document.createRange(); r.selectNodeContents(n);
    const rects = [...r.getClientRects()].filter(q => q.width > 0.5 && q.height > 0.5);
    // its layer: the nearest sticky or positioned box (the bottom bar, a card), which may lie over text scrolled under it
    let layer = p;
    while (layer !== root && !['sticky', 'fixed', 'absolute'].includes(getComputedStyle(layer).position)) layer = layer.parentElement;
    if (rects.length) pieces.push({ n, p, rects, layer, t: n.data.trim() });
  }
  // on top of each other
  for (let i = 0; i < pieces.length; i++) for (let j = i + 1; j < pieces.length; j++) {
    if (pieces[i].layer !== pieces[j].layer) continue;
    const hit = pieces[i].rects.find(a => pieces[j].rects.some(b =>
      Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 3));
    if (hit) say('on top of each other', `"${pieces[i].t}" / "${pieces[j].t}"`, hit);
  }
  // spilling out of its button, or cut off by an edge that clips or scrolls (the nearest one)
  for (const p of pieces) {
    if (getComputedStyle(p.p).textOverflow === 'ellipsis') continue;
    for (let e = p.p; e && e !== document.body; e = e.parentElement) {
      const s = getComputedStyle(e), clips = s.overflowX !== 'visible';
      if (e.tagName !== 'BUTTON' && !clips) continue;
      if (s.textOverflow === 'ellipsis') break;
      const b = e.getBoundingClientRect(), l = b.left + e.clientLeft, r = l + e.clientWidth;
      const off = p.rects.find(q => q.left < l - 1 || q.right > r + 1);
      if (off) say(e.tagName === 'BUTTON' ? 'spills out of its button' : 'cut off at an edge', `"${p.t}" in ${name(e)}`, off);
      break;
    }
  }
  if (root.scrollWidth > root.clientWidth + 1) say('scrolls sideways', `${name(root)} by ${root.scrollWidth - root.clientWidth} px`, root.getBoundingClientRect());
  // two pieces touching with no space between them ("Wippen spacingat factory")
  for (let i = 1; i < pieces.length; i++) {
    const A = pieces[i - 1].n, B = pieces[i].n, a = A.data, b = B.data;
    if (/\s$/.test(a) || /^\s/.test(b) || !/[\p{L}\p{N})”".,:;%]$/u.test(a) || !/^[\p{L}\p{N}(“]/u.test(b)) continue;
    const ra = document.createRange(); ra.setStart(A, a.length - 1); ra.setEnd(A, a.length);
    const rb = document.createRange(); rb.setStart(B, 0); rb.setEnd(B, 1);
    const qa = ra.getClientRects()[0], qb = rb.getClientRects()[0];
    if (!qa || !qb) continue;
    const sameLine = Math.min(qa.bottom, qb.bottom) - Math.max(qa.top, qb.top) > Math.min(qa.height, qb.height) / 2, gap = qb.left - qa.right;
    if (sameLine && gap < 2.5 && gap > -2) say('no space between', `"${a.trim().slice(-40)}" + "${b.trim().slice(0, 40)}"`, qa);
  }
  return bad;
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const seen = new Map();   // problem -> where first seen
  let shots = 0, looks = 0;
  const broke = [];   // the sweep itself going wrong (a page error, a step that threw, too few cards), so a pass means something
  for (const [size, w, h] of SIZES) for (const action of ['grand', 'upright']) {
    const phone = w < 500 || h < 500;   // a phone upright or on its side: a touch screen
    let cardsOpened = 0;
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: phone, isMobile: phone });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(([a]) => { try { localStorage.clear(); localStorage.setItem('regsim-movehelp', 'seen');
      localStorage.setItem('regsim-level', 'apprentice'); localStorage.setItem('regsim-action', a); } catch {} }, [action]);
    await page.goto(`${base}/index.html?t=${Date.now()}`);
    await page.waitForSelector('#mode h2, #mode table', { state: 'attached', timeout: 60000 });
    await page.waitForTimeout(2000);
    const tap = async sel => { await page.evaluate(s => document.querySelector(s).click(), sel); await page.waitForTimeout(300); };
    const openFolds = () => page.evaluate(() => document.querySelectorAll('aside details:not([open])').forEach(d => { d.open = true; }));
    const look = async where => {
      looks++;
      for (const root of ['aside', '#partpop', '#partpop-u', '#keydock', '#views', '#toasts', '#framepad']) {
        for (const b of await page.evaluate(textFit, root)) {
          const key = `${b.kind}: ${b.what}`;
          if (seen.has(key)) { seen.get(key).n++; continue; }
          const file = `${String(++shots).padStart(3, '0')}-${size}-${action}.png`;
          const clip = { x: Math.max(0, b.x - 120), y: Math.max(0, b.y - 60), width: Math.min(360, w - Math.max(0, b.x - 120)), height: Math.min(160, h - Math.max(0, b.y - 60)) };
          if (clip.width > 10 && clip.height > 10) await page.screenshot({ path: path.join(out, file), clip }).catch(() => {});
          seen.set(key, { where: `${size} ${action} ${where}`, file, n: 1 });
          console.log(`    ${key}  [${size} ${action} ${where}, ${file}]`);
        }
      }
    };
    const modes = await page.$$eval('.tab[data-mode]', ts => ts.filter(t => t.offsetParent).map(t => t.dataset.mode));
    // a part card for every part a hover finds in each view, then again with its buttons pressed
    const cards = async () => {
      const done = new Set();   // each part's card once, in the first view that shows it
      for (const v of VIEWS[action]) {
        await tap(action === 'grand' ? `[data-view="${v}"]` : `[data-uview="${v}"]`); await page.waitForTimeout(1500);
        const found = await page.evaluate(() => {
          const c = document.querySelector('#cu') || document.querySelector('#c'), r = c.getBoundingClientRect(), tip = document.querySelector('#tip'), f = {};
          for (let y = r.top + 4; y < r.bottom - 4; y += 7) for (let x = r.left + 4; x < r.right - 4; x += 7) {
            if (document.elementFromPoint(x, y) !== c) continue;
            c.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y, bubbles: true }));
            const t = tip.hidden ? '' : tip.textContent; if (t && !f[t] && !/^Key\b/.test(t)) f[t] = [x, y];
          }
          c.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
          return f;
        });
        for (const [part, [x, y]] of Object.entries(found)) {
          if (done.has(part)) continue;
          done.add(part);
          await page.evaluate(() => document.querySelectorAll('.pop-x').forEach(b => b.offsetParent && b.click()));
          await page.mouse.click(x, y); await page.waitForTimeout(250);
          if (await page.evaluate(() => ['#partpop', '#partpop-u'].some(s => document.querySelector(s)?.checkVisibility()))) cardsOpened++;
          await look(`card: ${part}`);
          // (pressed in the page: the card follows its part every frame, so a pointer click waits for it to hold still)
          // (the first button three times, or the last if that knob is already at its stop: several cards share a knob)
          const cardText = () => page.evaluate(() => document.querySelector('#partpop:not([hidden]), #partpop-u:not([hidden])')?.textContent);
          const press = end => page.evaluate(end => {
            const b = () => [...document.querySelectorAll('#partpop:not([hidden]) .nudge:not(:disabled), #partpop-u:not([hidden]) .nudge:not(:disabled)')].at(end);
            if (!b()) return false;
            for (let k = 0; k < 3; k++) b()?.click();
            return true;
          }, end);
          const before = await cardText();
          if (await press(0)) {
            await page.waitForTimeout(250);
            if (await cardText() === before) { await press(-1); await page.waitForTimeout(250); }
            if (await cardText() === before) broke.push(`${size} ${action}: pressing ${part}'s buttons changed nothing on its card`);
            await look(`card: ${part}, pressed`);
          }
        }
      }
      await page.evaluate(() => document.querySelectorAll('.pop-x').forEach(b => b.offsetParent && b.click()));
    };
    for (const m of modes.filter(m => m !== 'exam').concat(modes.includes('exam') ? ['exam'] : [])) {
      await tap(`.tab[data-mode="${m}"]`);
      try {
        if (m === 'learn') {
          const n = await page.$$eval('#mode .steps .pip', ps => ps.length);
          for (let i = 0; i < n; i++) { await page.evaluate(i => document.querySelectorAll('#mode .steps .pip')[i].click(), i); await page.waitForTimeout(150); await openFolds(); await look(`learn step ${i + 1}`); }
        } else if (m === 'diagnose') {
          for (let i = 0; i < 4; i++) {
            await page.evaluate(() => [...document.querySelectorAll('#mode button')].find(b => /Next customer/.test(b.textContent))?.click()); await page.waitForTimeout(400);
            await openFolds(); await look(`find the fault, customer ${i + 1}`);
            await page.evaluate(() => [...document.querySelectorAll('aside button')].find(b => /Check my work/.test(b.textContent))?.click()); await page.waitForTimeout(300);
            await page.evaluate(() => [...document.querySelectorAll('#mode button')].find(b => /Show what was wrong/.test(b.textContent))?.click()); await page.waitForTimeout(300);
            await look(`find the fault, customer ${i + 1} checked`);
          }
        } else if (m === 'sandbox') {
          await openFolds(); await look('sandbox');
          await cards();
          await openFolds(); await look('sandbox, adjusted');
        } else if (m === 'tools') {
          const n = await page.$$eval('#mode .toolbtn', bs => bs.length);
          await look('tools');
          for (let i = 0; i < n; i++) { await page.evaluate(i => document.querySelectorAll('#mode .toolbtn')[i].click(), i); await page.waitForTimeout(400); await look(`tool ${i + 1}`); }
        } else if (m === 'exam') {
          await look('exam intro');
          await page.evaluate(() => document.querySelector('#mode button.primary')?.click()); await page.waitForTimeout(800);
          await openFolds(); await look('exam running');
        } else { await openFolds(); await look(m); }
      } catch (e) { broke.push(`${size} ${action} ${m}: ${e.message.split('\n')[0]}`); }
      console.log(`  ${size} ${action} ${m} done`);
    }
    for (const e of errors) broke.push(`${size} ${action} page error: ${e}`);
    if (cardsOpened < 10) broke.push(`${size} ${action}: only ${cardsOpened} part cards opened`);
    await ctx.close();
    console.log(`swept ${size} ${action}: ${looks} looks so far, ${cardsOpened} part cards, ${seen.size} problems`);
  }
  await browser.close();
  for (const [k, v] of seen) console.log(`${k}\n    first: ${v.where} (${v.n}×) ${v.file}`);
  for (const b of broke) console.log(`SWEEP BROKE: ${b}`);
  console.log(seen.size ? `${seen.size} problems` : 'no text problems', broke.length ? `, but the sweep broke ${broke.length} times` : '');
  process.exit(seen.size || broke.length ? 1 : 0);
})();
