// The picture's two bars (index.html): a few category buttons (View, Show, Key & pedal, Speed), each opening a menu of
// its views or key actions, so a phone never scrolls a row of buttons sideways (a wide picture has Key & pedal's
// buttons out on the bar instead). The grand's buttons are in index.html;
// the upright's (upright-app.js) go into the same menus, marked data-upright. A menu closes on a pick, a tap outside it,
// or Escape, and works from the keyboard: the arrows move through it, Enter picks, Tab leaves.
const $ = s => document.querySelector(s);
const ITEMS = '.menu button:not([hidden])';
let open = null;   // the open category (.cat)
const items = cat => [...cat.querySelectorAll(ITEMS)].filter(b => b.offsetParent && !b.disabled);
const isUpright = () => $('#app').classList.contains('upright');
// a button belongs to the action shown (the other action's are hidden by #app.upright)
const shown = b => isUpright() ? !!b.closest('[data-upright]') : !b.closest('[data-upright]');

// beside its button, as wide as the picture allows; the bottom bar's menus open upward. On a phone the picture is short,
// so a menu may reach down over the panel below it (it is fixed to the window, not clipped by the picture).
function place(cat) {
  const menu = cat.querySelector('.menu'), b = cat.querySelector('.cat-btn').getBoundingClientRect();
  const stage = $('#stage').getBoundingClientRect(), up = !!cat.closest('#keydock'), H = document.documentElement.clientHeight;
  menu.style.maxWidth = `${stage.width - 20}px`;
  menu.style.maxHeight = `${Math.max(120, up ? b.top - 16 : H - b.bottom - 16)}px`;
  menu.style.left = `${Math.max(stage.left + 10, Math.min(b.left, stage.right - 10 - menu.offsetWidth))}px`;
  menu.style.top = up ? 'auto' : `${b.bottom + 6}px`;
  menu.style.bottom = up ? `${H - b.top + 6}px` : 'auto';
}
function openMenu(cat, focusItem) {
  if (open && open !== cat) closeMenu();
  open = cat;
  cat.querySelector('.menu').hidden = false;
  cat.querySelector('.cat-btn').setAttribute('aria-expanded', 'true');
  place(cat);
  if (focusItem) { const list = items(cat); (list.find(b => b.classList.contains('on')) ?? list[0])?.focus(); }
}
export function closeMenu(refocus = false) {
  if (!open) return;
  const cat = open; open = null;
  const inside = cat.contains(document.activeElement);
  cat.querySelector('.menu').hidden = true;
  const btn = cat.querySelector('.cat-btn');
  btn.setAttribute('aria-expanded', 'false');
  // back to the category from the keyboard; from a click, let go of the focus so Space strikes the key again
  if (refocus) btn.focus(); else if (inside || document.activeElement === btn) document.activeElement.blur();
}

// the View button names the view shown, whichever way it was picked (the menu, a test, a Learn step)
export function markView(name) {
  const v = $('#view-now');
  if (v.textContent !== name) { v.textContent = name; v.parentElement.title = `View: ${name}. Pick another view`; }
}

// Where the bottom bar has room, the Key & pedal menu's buttons come out onto it beside Play and Let key up, one tap
// each (Ease up again and again without opening a menu), and the Key & pedal button goes; where it hasn't (a phone),
// they stay in the menu. When it runs short the keys shown on the bar's buttons come off first, then the buttons pull
// in (the Speed button names just the speed). Tried in that order, each laid out and measured: one row, nothing past
// the bar's end.
const keybar = $('#keybar'), keyCat = $('#cat-key'), keyMenu = $('#keymenu');
function keysOut(on) {
  if (on) for (const b of [...keyMenu.children]) { b.dataset.mrole = b.getAttribute('role'); b.removeAttribute('role'); b.removeAttribute('aria-checked'); b.classList.add('kout'); keyCat.before(b); }
  else for (const b of keybar.querySelectorAll(':scope > .kout')) { b.setAttribute('role', b.dataset.mrole); b.removeAttribute('aria-pressed'); b.classList.remove('kout'); keyMenu.append(b); }
  keyCat.hidden = on;
}
function fitKeys() {
  if (!keybar.offsetParent) return;   // (Tools hides the bar: tried again when it shows)
  if (open === keyCat) closeMenu();   // (its buttons may be about to leave it)
  const fits = () => {
    const kids = [...keybar.children].filter(k => k.offsetParent), r = keybar.getBoundingClientRect();
    return kids.every(k => { const q = k.getBoundingClientRect(); return q.top < kids[0].getBoundingClientRect().bottom - 2 && q.right <= r.right + 0.5; });
  };
  for (const [out, keys, tight] of [[true, true, false], [true, false, false], [true, false, true], [false, true, false], [false, false, false]]) {
    keysOut(out); keybar.classList.toggle('nokeys', !keys); keybar.classList.toggle('tight', tight);
    if (fits()) break;
  }
  sync();
}

// what the menus show on their buttons: the speed chosen, a dot while a key option stays on (Loop, a pedal), and
// aria-checked on the items that are on or off (aria-pressed on the switches out on the bar)
function sync() {
  for (const b of keybar.querySelectorAll(':scope > .kout[data-mrole="menuitemcheckbox"]')) b.setAttribute('aria-pressed', String(b.classList.contains('on')));
  for (const b of document.querySelectorAll('[data-key]:not([aria-keyshortcuts])')) b.setAttribute('aria-keyshortcuts', b.dataset.key === 'Esc' ? 'Escape' : b.dataset.key);
  for (const cat of document.querySelectorAll('.cat')) {
    const list = [...cat.querySelectorAll('.menu button')].filter(shown);
    for (const b of list) if (b.getAttribute('role') !== 'menuitem') b.setAttribute('aria-checked', String(b.classList.contains('on')));
    if (cat.dataset.value !== undefined) {   // (data-value names the category for a screen reader, where a phone hides its word)
      const on = list.find(b => b.getAttribute('role') === 'menuitemradio' && b.classList.contains('on'));
      const v = cat.querySelector('.cat-btn .v');
      if (on && v.textContent !== on.dataset.short) v.textContent = on.dataset.short;
      if (on) v.parentElement.setAttribute('aria-label', `${cat.dataset.value}: ${on.dataset.short}`);
    }
    if (cat.dataset.dot !== undefined) cat.classList.toggle('latched', list.some(b => b.getAttribute('role') === 'menuitemcheckbox' && b.classList.contains('on')));
  }
}

export function initControls() {
  for (const cat of document.querySelectorAll('.cat')) {
    const btn = cat.querySelector('.cat-btn'), menu = cat.querySelector('.menu');
    btn.setAttribute('aria-haspopup', 'true'); btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', menu.id);
    // (detail 0: Enter or Space on the focused button, so the menu takes the focus; a click lets go of it, so Space
    // still strikes the key, and the arrows still reach the menu)
    btn.addEventListener('click', e => {
      if (open === cat) closeMenu(e.detail === 0); else openMenu(cat, e.detail === 0);
      if (e.detail) btn.blur();
    });
    // a pick closes the menu; the item's own handler (app.js, upright-app.js) does the rest
    menu.addEventListener('click', e => { const b = e.target.closest('button'); if (b && !b.disabled) closeMenu(e.detail === 0); });
  }
  // a tap anywhere else closes the menu (and still does what it was for)
  window.addEventListener('pointerdown', e => { if (open && !open.contains(e.target)) closeMenu(); }, true);
  // ahead of the page's own keys while a menu is open: Escape closes the menu instead of letting the key up, and the
  // arrows move through the menu instead of sliding the view (with it closed, Enter or Space opens it, and the arrows
  // still slide the view)
  window.addEventListener('keydown', e => {
    if (!open) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeMenu(open.contains(document.activeElement)); return; }
    if (e.key === 'Tab') { closeMenu(); return; }
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1, Home: -1, End: 1 }[e.key];
    if (step === undefined) return;
    e.preventDefault(); e.stopPropagation();
    const list = items(open), cur = document.activeElement, i = list.indexOf(cur);
    let next;
    if (e.key === 'Home') next = list[0];
    else if (e.key === 'End') next = list.at(-1);
    else if (i < 0) next = step > 0 ? list[0] : list.at(-1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') next = list[(i + step + list.length) % list.length];
    else {   // up or down the grid: the nearest item in the next row, by its left edge; past the last row, round to the other end
      const r = cur.getBoundingClientRect();
      const gap = b => { const q = b.getBoundingClientRect(); return step > 0 ? q.top - r.bottom : r.top - q.bottom; };
      const cost = b => gap(b) * 1000 + Math.abs(b.getBoundingClientRect().left - r.left);
      const ahead = list.filter(b => gap(b) >= -1);
      next = ahead.length ? ahead.reduce((a, b) => (cost(b) < cost(a) ? b : a)) : step > 0 ? list[0] : list.at(-1);
    }
    next?.focus();
  }, true);
  window.addEventListener('resize', () => { if (open) place(open); });
  // the apps turn their buttons on and off (and #app.upright swaps the action): follow them
  const watch = new MutationObserver(sync);
  watch.observe($('#app'), { attributes: true, attributeFilter: ['class'] });
  for (const bar of [$('#views'), $('#keydock')]) watch.observe(bar, { attributes: true, attributeFilter: ['class'], subtree: true });
  sync(); fitKeys();
  // the key buttons out or in: as the picture changes size or comes back from Tools (after the frame, so a change to
  // the bar isn't measured inside its own resize), as the action swaps, and once the fonts are in
  new ResizeObserver(() => requestAnimationFrame(fitKeys)).observe($('#keydock'));
  new MutationObserver(fitKeys).observe($('#app'), { attributes: true, attributeFilter: ['class'] });
  document.fonts?.ready.then(fitKeys);
  matchMedia('(hover: hover) and (pointer: fine)').addEventListener('change', fitKeys);   // (the keys shown come and go with a mouse)
}
