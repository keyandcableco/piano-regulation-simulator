// The link-preview card (card.png, 1200 x 630: og:image and twitter:image in index.html), rendered from the app as it
// is, so it can be made again whenever the model changes: the Sandbox's three keys at factory, in the 3/4 view, with
// the title over the empty sky. Bump the ?v= on both image tags in index.html after a new card (v=2 on 2026-11-08),
// or sites that already fetched the old one keep showing it.
// node tests/make-card.cjs [base_url] [out_png]; needs a server on the checkout and Chrome (playwright-core from
// minichord-lab's node_modules, SwiftShader WebGL), like the other harnesses here, and Noto Sans installed (the title's
// width is laid out for it). Look at the card after a model change: nothing checks that the model stays clear of the title.
const { chromium } = require('/home/gregory/minichord-lab/tests/node_modules/playwright-core');
const fs = require('fs');
const path = require('path');

const [base = 'http://localhost:8812', out = path.join(__dirname, '..', 'card.png')] = process.argv.slice(2);
const W = 1200, H = 630;
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  // the picture at twice the card's size, scaled down into it for smooth edges
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2, colorScheme: 'light' });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('regsim-movehelp', 'seen'); } catch {} });
  await page.goto(`${base}/index.html?t=${Date.now()}`);
  await page.waitForSelector('#mode table', { state: 'attached', timeout: 60000 });
  await page.waitForTimeout(1500);
  const pick = async (cat, sel) => { if (await page.$(`#${cat}`)) await page.click(`#${cat} .cat-btn`); await page.click(sel); };
  if (await page.$eval('#inset-btn', b => b.classList.contains('on'))) await pick('cat-show', '#inset-btn');
  await page.locator('#mode button', { hasText: 'Three keys' }).click();
  await page.waitForTimeout(800);
  await pick('cat-view', '#views [data-view="angle"]');
  // the stage alone, filling the window: no bars, labels, callouts or menus
  await page.addStyleTag({ content: `
    #stage { position: fixed !important; inset: 0 !important; z-index: 9999; width: 100vw !important; height: 100vh !important; }
    #stage > *:not(#c) { display: none !important; } #c { width: 100% !important; height: 100% !important; }` });
  await page.waitForTimeout(1000);
  // the move pad's steps, as a keyboard press on its buttons would take them
  const move = (sel, n) => page.evaluate(([s, k]) => { for (let i = 0; i < k; i++) document.querySelector(s).dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 })); }, [sel, n]);
  await move('[data-zoom="-1"]', 2);
  await move('[data-slide="-1,0"]', 2);
  await move('[data-slide="0,1"]', 1);
  await page.waitForTimeout(1500);
  const shot = await page.locator('#c').screenshot();
  if (errors.length) { console.error('page errors:', errors.join(' | ')); await browser.close(); process.exit(1); }
  await page.close();   // SwiftShader's render loop can starve the card page's capture

  const card = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await card.setContent(`<!doctype html><html><head><style>
    html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; }
    body { background: #eceef0 url(data:image/png;base64,${shot.toString('base64')}) center / ${W}px ${H}px no-repeat;
      font-family: 'Noto Sans', sans-serif; position: relative; }
    h1 { position: absolute; left: 56px; top: 40px; margin: 0; font-size: 64px; line-height: 1.08; font-weight: 700; color: #1f1d1a; }
    p { position: absolute; left: 58px; top: 182px; margin: 0; font-size: 22px; color: #5f5a52; }
    .url { position: absolute; right: 48px; bottom: 38px; top: auto; left: auto; font-size: 20px; font-weight: 600; color: #b5562b; }
  </style></head><body>
    <h1>Grand Action<br>Regulation</h1>
    <p>Learn it, find the fault, or turn any screw.</p>
    <p class="url">regulation.keyandcable.com</p>
  </body></html>`);
  await card.evaluate(() => document.fonts.ready);
  await card.screenshot({ path: out });
  console.log(`wrote ${out}`);
  await browser.close();
})();
