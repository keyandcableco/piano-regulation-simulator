// Play and Press slowly held down (the grand's and the upright's). A tap does what the button always did: Play strikes
// the key and lets it come back up, Press slowly takes it to the bottom and holds it there. Held, the key stays down
// for as long as the button is, and comes up when it's let go. While it's held a slider comes up over the button
// (once the key is down, for Play: the hammer in check), and sliding the thumb or the mouse along it takes the key by
// hand, the way Move parts does, and eases it up (right) and down again (left) through the whole stroke: off the check
// and back, or up and down through let-off on a slow press. Right is up so the thumb has room whichever button it's
// on: Play sits at the bar's left end with the key at the bottom, Press slowly further along with the key at the top.
// The slider's handle sits under the thumb; pushed past either end of the stroke, the slider comes along with it.
import { closeMenu } from './controls.js';

const TAP_MS = 300;   // let go sooner than this, it was a tap
const GAIN = 22;      // px of slide per mm of key travel (less on a narrow window, so the whole stroke fits on it)
const START_PX = 4;   // the slide it takes before the hand takes the key

let ui = null;
function faderUi() {
  if (ui) return ui;
  const mk = (cls, parent) => { const e = document.createElement('div'); e.className = cls; parent.append(e); return e; };
  const root = document.createElement('div');
  root.id = 'keyfader'; root.hidden = true; root.setAttribute('aria-hidden', 'true');
  document.body.append(root);
  ui = { root, cap: mk('kf-cap', root), track: mk('kf-track', root), fill: null, handle: null, down: mk('kf-end kf-down', root), up: mk('kf-end kf-up', root) };
  ui.fill = mk('kf-fill', ui.track); ui.handle = mk('kf-handle', root);
  ui.down.textContent = '◀ down'; ui.up.textContent = 'up ▶';
  return ui;
}

// o: sim() the Sim the button plays now; busy() true while a test has the key; down() the press (strike, or the slow
// press); tap() a quick press let go; up() the key let go after a hold; ready(sim) the key is where the slider can
// take it; fmt(mm) a key depth for the slider's caption
export function holdKey(btn, o) {
  let h = null, swallow = false;
  btn.dataset.hold = '';
  btn.addEventListener('contextmenu', e => e.preventDefault());   // (a long press on a phone)
  btn.addEventListener('pointerdown', e => {
    swallow = false;   // (a press that ended with no click, cancelled or let go off the button, left nothing to swallow)
    if (e.button !== 0 || !e.isPrimary || h || btn.disabled || o.busy()) return;
    e.preventDefault();   // (keeps the focus off the button, so Space still strikes the key)
    try { btn.setPointerCapture(e.pointerId); } catch {}
    swallow = true;
    h = { id: e.pointerId, t0: performance.now(), x: e.clientX, s: o.sim(), shown: false, fading: false, x0: e.clientX, sx: e.clientX, d0: 0, lost: false };
    o.down();
    requestAnimationFrame(tick);
  });
  btn.addEventListener('pointermove', e => { if (h && e.pointerId === h.id) { h.x = e.clientX; slide(); } });
  const end = e => { if (h && e.pointerId === h.id) finish(); };
  for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) btn.addEventListener(t, end);
  window.addEventListener('blur', () => { if (h) finish(); });
  window.addEventListener('keydown', e => { if (h && e.key === 'Escape') finish(); }, true);
  // the click a press ends with was the press: it has been played (Enter or Space on the focused button is a click
  // with no press before it, and plays the key as a tap does)
  btn.addEventListener('click', e => { if (swallow && e.detail !== 0) { e.stopImmediatePropagation(); e.preventDefault(); } swallow = false; }, true);

  const gain = s => Math.min(GAIN, innerWidth * 0.7 / s.dip);
  function slide() {
    const s = h.s;
    if (!h.shown || h.lost) return;
    if (!h.fading) {
      if (Math.abs(h.x - h.sx) < START_PX) return;   // (from where the thumb was when the slider came up)
      if (o.sim() !== s || o.busy()) return;
      s.grab('key', s.d); h.hand = s.hand; h.fading = true; h.x0 = h.x; h.d0 = s.d;
    }
    // a new regulation, a test or Move parts took the key: this hold is done with it (no taking it back on the next move)
    if (s.hand !== h.hand || o.busy()) { h.lost = true; ui.root.hidden = true; return; }
    const g = gain(s);
    let t = h.d0 - (h.x - h.x0) / g;
    if (t < 0) { h.x0 = h.x - h.d0 * g; t = 0; }
    else if (t > s.dip) { h.x0 = h.x - (h.d0 - s.dip) * g; t = s.dip; }
    s.hand.q = t;
  }
  function tick() {
    if (!h) return;
    const s = h.s;
    if (o.sim() !== s) { ui && (ui.root.hidden = true); return; }   // (the note or the regulation changed under it)
    if (!h.shown && performance.now() - h.t0 >= TAP_MS && o.ready(s)) {
      h.shown = true; h.sx = h.x; faderUi().root.hidden = false;
      btn.closest('.menu')?.classList.add('held');   // (a phone's menu, over the picture: see through it)
    }
    if (h.shown && !ui.root.hidden) draw(s);
    requestAnimationFrame(tick);
  }
  function draw(s) {
    const g = gain(s), at = h.fading ? null : s.d;
    if (at !== null) { h.x0 = h.x; h.d0 = at; }   // not taken yet: the handle stays under the thumb as the key moves
    const px = d => h.x0 + (h.d0 - d) * g, L = px(s.dip), R = px(0), W = innerWidth;
    // above the bar under the picture and its status line (a phone's menu item too: its menu, faded, is over the picture)
    const r = (btn.closest('#keydock') ?? btn).getBoundingClientRect(), top = Math.max(8, r.top - 58);
    Object.assign(ui.root.style, { top: `${top}px` });
    Object.assign(ui.track.style, { left: `${L}px`, width: `${R - L}px` });
    ui.fill.style.width = `${Math.max(0, R - px(s.d))}px`;
    ui.handle.style.left = `${px(s.d)}px`;
    ui.down.style.left = `${Math.max(4, L)}px`;
    ui.up.style.left = `${Math.min(W - 4, R)}px`;
    const mid = (Math.max(4, L) + Math.min(W - 4, R)) / 2;
    ui.cap.style.left = `${Math.max(90, Math.min(W - 90, mid))}px`;
    ui.cap.textContent = `Key ${o.fmt(Math.max(0, s.d))} down · ${h.fading ? 'let go to drop it' : 'slide to ease it'}`;
  }
  function finish() {
    const g = h; h = null;
    if (ui) ui.root.hidden = true;
    const menu = btn.closest('.menu');
    menu?.classList.remove('held');
    if (menu && !menu.hidden) closeMenu();
    if (g.fading && g.s.hand === g.hand) g.s.letGo();
    if (o.busy() || g.lost) return;   // (a test has the key now)
    if (o.sim() !== g.s) { g.s.press(0, 60); return; }   // the note changed under the hold: that note's key comes up
    if (!g.fading && performance.now() - g.t0 < TAP_MS) o.tap(); else o.up();
  }
}
