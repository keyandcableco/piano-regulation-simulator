// The picture's two bars (index.html): a few category buttons (View, Show, Key & pedal, Speed), each opening a menu of
// its views or key actions, so a phone never scrolls a row of buttons sideways. The grand's buttons are in index.html;
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

// what the menus show on their buttons: the speed chosen, a dot while a key option stays on (Loop, a pedal), and
// aria-checked on the items that are on or off
function sync() {
  for (const cat of document.querySelectorAll('.cat')) {
    const list = [...cat.querySelectorAll('.menu button')].filter(shown);
    for (const b of list) if (b.getAttribute('role') !== 'menuitem') b.setAttribute('aria-checked', String(b.classList.contains('on')));
    if (cat.dataset.value !== undefined) {
      const on = list.find(b => b.getAttribute('role') === 'menuitemradio' && b.classList.contains('on'));
      const v = cat.querySelector('.cat-btn .v');
      if (on && v.textContent !== on.dataset.short) v.textContent = on.dataset.short;
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
  // ahead of the page's own keys: Escape closes the menu instead of letting the key up, and the arrows move through the
  // menu instead of sliding the view
  window.addEventListener('keydown', e => {
    const onBtn = e.target.classList?.contains('cat-btn') ? e.target.closest('.cat') : null;
    if (!open) {
      if (onBtn && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); e.stopPropagation(); openMenu(onBtn, true); }
      return;
    }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeMenu(open.contains(document.activeElement)); return; }
    if (e.key === 'Tab') { closeMenu(); return; }
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1, Home: -Infinity, End: Infinity }[e.key];
    if (step === undefined) return;
    e.preventDefault(); e.stopPropagation();
    const list = items(open), i = list.indexOf(document.activeElement);
    const next = !Number.isFinite(step) ? (step < 0 ? 0 : list.length - 1) : i < 0 ? (step > 0 ? 0 : list.length - 1) : (i + step + list.length) % list.length;
    list[next]?.focus();
  }, true);
  window.addEventListener('resize', () => { if (open) place(open); });
  // the apps turn their buttons on and off (and #app.upright swaps the action): follow them
  const watch = new MutationObserver(sync);
  watch.observe($('#app'), { attributes: true, attributeFilter: ['class'] });
  for (const bar of [$('#views'), $('#keydock')]) watch.observe(bar, { attributes: true, attributeFilter: ['class'], subtree: true });
  sync();
}
