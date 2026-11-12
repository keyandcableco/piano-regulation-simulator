// The repin bench: a center that needs a new pin comes off the action, its old pin is pushed out and measured with a
// micrometer, the new pin is picked off the size chart by that reading, and the part goes back. The micrometer is drawn
// and worked by hand: drag the thimble (or the arrow keys, the wheel, the buttons) to open and close it, the ratchet to
// close it on the work with an even pressure, and the reading is called by the student before the job goes on.
// micrometer.js has the sizes, the reading and the judging; app.js opens the bench from the Repin button.
import { PITCH, THIMBLE_LINES, MIC_OPEN, PIN_SIZES, oldPin, micParts, inch, thou, parseMic, judgeMic, pickPin } from './micrometer.js';

const NS = 'http://www.w3.org/2000/svg';
const sv = (tag, attrs = {}, ...kids) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null && v !== false) e.setAttribute(k, v);
  for (const k of kids.flat()) if (k != null) e.append(k.nodeType ? k : document.createTextNode(k));
  return e;
};
const el = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const k of kids.flat()) if (k != null) e.append(k.nodeType ? k : document.createTextNode(k));
  return e;
};

// ---------- the drawing ----------
// Side view, the frame below the axis. Along the axis it is drawn to one scale, K px to the inch, so the spindle's face
// moves exactly as far as the thimble's edge moves along the sleeve. Across the axis it is not to scale: the thimble is
// drawn big enough that its lines can be told apart (a real thimble's lines are three times as far apart as the sleeve's).
const W = 700, H = 330, AX = 128, K = 1000;
const XA = 126;                    // the anvil's face
const HUB0 = 292, HUB1 = 346;      // the frame's barrel, the spindle runs through it
const X0 = 362;                    // the sleeve's 0 line
const RS = 24, RT = 50, RB = 42;   // sleeve, thimble, and the thimble's bevelled edge (radii, px)
const LX = 604, LY = 252, LR = 64, LM = 2.2;   // the loupe: where it sits and how much it magnifies
const DIV = 2 * Math.PI / THIMBLE_LINES;
// The lines and figures engraved on the metal keep their own colour in either theme, and are set as attributes, not by
// the page's CSS: the loupe is a <use> copy of the drawing, and the page's CSS doesn't reach into it
const INK = '#16181b', HINT = '#c4561f';
const ENGRAVED = { stroke: INK, fill: INK, 'font-size': 11, 'font-weight': 600, 'font-family': 'system-ui, sans-serif' };
const EDGE = 1.2;                  // the thimble's edge is drawn a hair right of the reading, so a line right at it shows
const xT = r => X0 + r * K + EDGE;

function buildMic() {
  const defs = sv('defs', {},
    grad('rp-chrome', [[0, '#858b93'], [0.2, '#e6e9ec'], [0.36, '#ffffff'], [0.62, '#b6bcc3'], [1, '#737a83']]),
    grad('rp-satin', [[0, '#959ba2'], [0.3, '#dfe2e5'], [0.52, '#f2f3f4'], [1, '#868c94']]),
    grad('rp-frame', [[0, '#575d65'], [0.5, '#3d4248'], [1, '#2b2f34']]),
    grad('rp-pin', [[0, '#7e7a70'], [0.35, '#f3f0e8'], [0.62, '#c8c3b6'], [1, '#76726a']], true),
    grad('rp-pin-flat', [[0, '#7e7a70'], [0.35, '#f3f0e8'], [0.62, '#c8c3b6'], [1, '#76726a']]),
    sv('pattern', { id: 'rp-knurl', width: 7, height: 7, patternUnits: 'userSpaceOnUse' },
      sv('path', { d: 'M0 0 L7 7 M7 0 L0 7', stroke: 'rgba(30,34,40,.38)', 'stroke-width': 1.1 })),
    sv('clipPath', { id: 'rp-loupe-clip' }, sv('circle', { cx: LX, cy: LY, r: LR })));
  const mic = sv('g', { id: 'rp-mic' });
  // frame: a C under the axis, the anvil's arm on the left and the barrel on the right
  mic.append(
    sv('path', { d: `M52 ${AX - 30} L98 ${AX - 30} L98 ${AX + 40} Q98 ${AX + 100} 160 ${AX + 100} L250 ${AX + 100} Q292 ${AX + 100} 292 ${AX + 60} L292 ${AX - 32} L346 ${AX - 32} L346 ${AX + 70} Q346 ${AX + 150} 260 ${AX + 150} L140 ${AX + 150} Q52 ${AX + 150} 52 ${AX + 80} Z`,
      fill: 'url(#rp-frame)', stroke: '#1c1f23', 'stroke-width': 1 }),
    sv('text', { x: 200, y: AX + 132, 'text-anchor': 'middle', fill: '#c9cdd2', 'font-size': 11, 'font-family': 'system-ui, sans-serif', 'letter-spacing': '.04em' }, '0–1 in   .001 in'),
    sv('rect', { x: 98, y: AX - 17, width: XA - 98, height: 34, rx: 2, fill: 'url(#rp-chrome)', stroke: '#5d636b', 'stroke-width': 0.8 }));
  const spindle = sv('rect', { y: AX - 15, height: 30, fill: 'url(#rp-chrome)', stroke: '#5d636b', 'stroke-width': 0.8 });
  mic.append(spindle,
    sv('rect', { x: HUB0, y: AX - 32, width: HUB1 - HUB0, height: 64, rx: 3, fill: 'url(#rp-frame)', stroke: '#1c1f23', 'stroke-width': 1 }),
    sv('rect', { x: 306, y: AX - 42, width: 22, height: 11, rx: 3, fill: '#2b2f34' }),   // the spindle lock
    sv('rect', { x: HUB1, y: AX - RS, width: 560 - HUB1, height: 2 * RS, fill: 'url(#rp-satin)', stroke: '#6f757d', 'stroke-width': 0.8 }));
  // the sleeve: the index line along it, the .025" lines above it, every fourth (a tenth) longer and numbered
  const sleeve = sv('g', ENGRAVED, sv('line', { x1: HUB1 + 4, y1: AX, x2: 560, y2: AX, 'stroke-width': 1.1 }));
  for (let n = 0; n * PITCH <= MIC_OPEN + 1e-9; n++) {
    const x = X0 + n * PITCH * K, tenth = n % 4 === 0;
    sleeve.append(sv('line', { x1: x, y1: AX, x2: x, y2: AX - (tenth ? 13 : 8), 'stroke-width': 1.2 }));
    if (tenth) sleeve.append(sv('text', { x, y: AX - 15, 'text-anchor': 'middle', stroke: 'none' }, String(n / 4)));
  }
  mic.append(sleeve);
  // the pin, set between the faces or lying by
  const pin = sv('g', { class: 'rp-pin' });
  mic.append(pin);
  // the thimble, its bevelled edge on the reading, its lines round it; the ratchet on its end
  const thimble = sv('g', {});
  const tLines = sv('g', ENGRAVED);
  thimble.append(
    sv('path', { d: `M0 ${AX - RB} L14 ${AX - RT} L124 ${AX - RT} L124 ${AX + RT} L14 ${AX + RT} L0 ${AX + RB} Z`, fill: 'url(#rp-satin)', stroke: '#6f757d', 'stroke-width': 0.8 }),
    sv('rect', { x: 74, y: AX - RT, width: 50, height: 2 * RT, fill: 'url(#rp-knurl)' }),
    sv('line', { x1: 14, y1: AX - RT, x2: 14, y2: AX + RT, stroke: '#7c828a', 'stroke-width': 0.8 }),
    tLines,
    sv('g', { class: 'rp-ratchet' },
      sv('rect', { x: 124, y: AX - 21, width: 38, height: 42, rx: 4, fill: 'url(#rp-chrome)', stroke: '#5d636b', 'stroke-width': 0.8 }),
      sv('rect', { x: 128, y: AX - 21, width: 30, height: 42, fill: 'url(#rp-knurl)' })));
  mic.append(thimble);
  const clicks = sv('text', { class: 'rp-clicks', y: AX - 30, fill: HINT, 'font-size': 12, 'font-style': 'italic', 'font-weight': 600, 'text-anchor': 'middle', 'font-family': 'system-ui, sans-serif' });
  const hint = sv('g', { fill: HINT, stroke: HINT, 'font-size': 10, 'font-weight': 700, 'font-family': 'system-ui, sans-serif' });
  mic.append(clicks, hint);
  // the parts named, along the top
  const labels = sv('g', { class: 'rp-labels' });
  const loupe = sv('g', {},
    sv('line', { class: 'rp-lead' }),
    sv('circle', { cx: LX, cy: LY, r: LR, class: 'rp-loupe-bg' }),
    sv('g', { 'clip-path': 'url(#rp-loupe-clip)' }, sv('use', { href: '#rp-mic' })),
    sv('circle', { cx: LX, cy: LY, r: LR, class: 'rp-loupe-ring' }),
    sv('text', { x: LX, y: LY + LR + 13, 'text-anchor': 'middle', class: 'rp-lbl' }, 'loupe'));
  const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, class: 'rp-svg', tabindex: 0, role: 'group' }, defs, mic, labels, loupe);
  return { svg, spindle, pin, thimble, tLines, clicks, hint, labels, loupe };
}
function grad(id, stops, across = false) {
  return sv('linearGradient', { id, x1: 0, y1: 0, x2: across ? 1 : 0, y2: across ? 0 : 1 },
    stops.map(([o, c]) => sv('stop', { offset: o, 'stop-color': c })));
}

// Draws the micrometer at reading r (in), the pin { d, placed } or null, and the reading help (hints) when asked
function drawMic(D, { r, pin, help, clicks }) {
  const xt = xT(r), xs = XA + r * K;
  D.spindle.setAttribute('x', xs); D.spindle.setAttribute('width', HUB0 - xs);
  D.thimble.setAttribute('transform', `translate(${xt} 0)`);
  // the thimble's lines: line j at the index when the thimble reads j; the numbers go up looking up the thimble
  const t = (r / PITCH % 1) * THIMBLE_LINES;
  D.tLines.replaceChildren();
  for (let j = 0; j < THIMBLE_LINES; j++) {
    let phi = (j - t) * DIV;
    phi = Math.atan2(Math.sin(phi), Math.cos(phi));
    if (Math.abs(phi) > 1.3) continue;
    const sn = Math.sin(phi), cs = Math.cos(phi), five = j % 5 === 0;
    const y0 = AX - RB * sn, y1 = AX - RT * sn, ink = { opacity: (0.35 + 0.65 * cs).toFixed(2) };
    D.tLines.append(sv('path', { d: `M0 ${y0} L14 ${y1} L${five ? 26 : 20} ${y1}`, fill: 'none', 'stroke-width': 1.1, ...ink }));
    if (five) D.tLines.append(sv('text', { x: 30, y: y1, stroke: 'none', 'dominant-baseline': 'central', transform: `translate(0 ${y1}) scale(1 ${cs.toFixed(3)}) translate(0 ${-y1})`, ...ink }, String(j)));
  }
  // the pin: a short rod, both ends clipped flat, standing across the faces or lying on the bench below the sleeve
  // (its diameter to the axis's scale; its length is not)
  D.pin.replaceChildren();
  if (pin) {
    const w = pin.d * K;
    D.pin.append(pin.placed
      ? sv('rect', { x: XA, y: AX - 80, width: w, height: 136, fill: 'url(#rp-pin)', stroke: '#6b675e', 'stroke-width': 0.6 })
      : sv('g', {}, sv('rect', { x: 380, y: 232, width: 136, height: w, fill: 'url(#rp-pin-flat)', stroke: '#6b675e', 'stroke-width': 0.6 }),
        sv('text', { x: 448, y: 232 + w + 16, 'text-anchor': 'middle', class: 'rp-lbl' }, 'the old pin')));
  }
  D.clicks.setAttribute('x', xt + 143); D.clicks.textContent = clicks ? 'click' : '';
  // reading help: each line showing on the sleeve gets its value, and the thimble line on the index is marked
  D.hint.replaceChildren();
  if (help) {
    const p = micParts(r);
    for (let n = 0; n <= Math.floor(r / PITCH + 1e-9); n++)
      D.hint.append(sv('text', { x: X0 + n * PITCH * K, y: AX + 14, 'text-anchor': 'middle', stroke: 'none' }, inch(n * PITCH).replace('"', '')));
    D.hint.append(sv('line', { x1: xt + 2, y1: AX, x2: xt + 24, y2: AX, 'stroke-width': 2.4, opacity: 0.7 }),
      sv('text', { x: xt + 40, y: AX + 18, stroke: 'none' }, `thimble ${p.thimble}`));
  }
  // the parts named along the top, each with a fine line down to it
  const name = (x, y, text) => [sv('line', { x1: x, y1: 24, x2: x, y2: y }), sv('text', { x, y: 18, 'text-anchor': 'middle' }, text)];
  D.labels.replaceChildren(...name(75, AX - 30, 'frame'), ...name(112, AX - 17, 'anvil'), ...name(Math.max(xs + 30, 210), AX - 15, 'spindle'),
    ...name(X0 - 6, AX - RS, 'sleeve'), ...name(xt + 50, AX - RT, 'thimble'), ...name(xt + 143, AX - 21, 'ratchet'));
  // the loupe: the reading, magnified, a fine line from it to where it looks
  // (centred a little right of the edge: the last sleeve line and the thimble's numbers both show)
  D.loupe.querySelector('use').setAttribute('transform', `translate(${LX} ${LY}) scale(${LM}) translate(${-(xt + 8)} ${-AX})`);
  const lead = D.loupe.querySelector('.rp-lead');
  lead.setAttribute('x1', xt); lead.setAttribute('y1', AX + RB + 6); lead.setAttribute('x2', LX - LR * 0.62); lead.setAttribute('y2', LY - LR * 0.78);
  D.svg.setAttribute('aria-label', 'Micrometer. Drag the thimble up or down to turn it, or use the arrow keys (a line), Page Up and Page Down (a turn), and R for the ratchet.');
}

// ---------- the bench ----------
// open the bench in the <dialog> host for one center:
//   center: its name; part: what comes off the action with it (by default the center's part, from its name);
//   kind: 'loose' | 'tight' | 'worn'; hints: the reading help offered (Apprentice)
//   stale(): the key or the mode changed under it (the bench is put away); finish(): repins it, returns { ok, text }
// The grand's and the upright's benches share one micrometer: its zero is checked once a visit, on whichever comes first.
let current = null;   // the bench that is out: one at a time
let zeroed = false;
export function openRepinBench(host, { center, part = center.replace(/ center$/i, '').toLowerCase(), kind, hints = false, stale = () => false, finish }) {
  current?.close();
  const D = buildMic();
  const old = oldPin();
  const mic = { r: 0.12, pin: { d: old.d, placed: false }, ratcheted: false, help: false, clicks: false };
  const STEPS = ['Pin out', 'Zero', 'Measure', 'New pin', 'Pin it'];
  let step = 0, done = false, raf = 0, picked = null, note = '';

  const title = el('b', { id: 'rp-title', class: 'grow' }, `Repin the ${center.toLowerCase()}`);
  const body = el('div', { class: 'rp-body' });
  host.replaceChildren(el('div', { class: 'rp-head' }, title,
    el('button', { class: 'rp-x', 'aria-label': 'Put it away', title: 'Put it away: nothing is changed on the action', onclick: () => close() }, '×')), body);
  host.setAttribute('aria-labelledby', 'rp-title');

  // Keys typed while the bench is out stay on the bench (the page's own keys play the key, work the pedal, step frames
  // and slide the view): stopped on the dialog, and caught at the window too for the moments focus has fallen back to
  // the page (a button that had it was replaced by the next step's). The micrometer's keys work anywhere on the bench
  // but the reading's box: the arrows a line, Page Up and Page Down a turn, R the ratchet.
  function micKey(e) {
    if (e.target.tagName === 'INPUT') return;
    const d = { ArrowDown: 0.001, ArrowRight: 0.001, ArrowUp: -0.001, ArrowLeft: -0.001, PageDown: PITCH, PageUp: -PITCH }[e.key];
    if (d && (step === 1 || step === 2)) { e.preventDefault(); if (!raf) turn(d); }
    if ((e.key === 'r' || e.key === 'R') && !e.repeat && !e.ctrlKey && !e.metaKey && (step === 1 || step === 2)) { e.preventDefault(); ratchet(); }
  }
  const keys = e => {
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    micKey(e);
  };
  const stray = e => {
    if (host.contains(e.target)) return;
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); close(); }
  };
  const cancel = e => e.preventDefault();   // Escape is handled above, once
  host.addEventListener('keydown', keys); host.addEventListener('cancel', cancel);
  window.addEventListener('keydown', stray, true);
  const watch = setInterval(() => { if (!done && stale()) close(); }, 200);
  // timers the bench sets (the ratchet's click, a held button's repeat) go with it
  const timers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };
  const cancelLater = t => { clearTimeout(t); timers.delete(t); };
  const api = { close };
  current = api;
  function close() {
    clearInterval(watch); cancelAnimationFrame(raf); raf = 0;
    timers.forEach(clearTimeout); timers.clear();
    host.removeEventListener('keydown', keys); host.removeEventListener('cancel', cancel);
    window.removeEventListener('keydown', stray, true);
    if (host.open) host.close();
    host.replaceChildren();
    if (current === api) current = null;
  }

  // ---- working the micrometer ----
  const low = () => mic.pin.placed ? mic.pin.d : 0;
  const closed = () => mic.r <= low() + 1e-9;
  // a warning about calling it too soon goes once the micrometer is worked again
  const clearWarn = () => { const r = body.querySelector('#rp-result.warnc'); if (r) { r.textContent = ''; r.className = ''; } };
  function turn(dr, by = 'thimble') {
    clearWarn();
    const was = closed();
    mic.r = Math.min(MIC_OPEN, Math.max(low(), mic.r + dr));
    if (!closed()) mic.ratcheted = false;
    if (closed() && dr < 0 && by === 'thimble') {
      const stop = !was ? 'Snug.' : mic.pin.placed ? 'It is down on the pin: the thimble won\'t turn any further without forcing it.' : 'The faces are together.';
      note = mic.ratcheted ? stop : `${stop} Finish with the ratchet: it slips at the same light pressure every time, so the reading is the same every time.`;
    } else if (dr) note = '';
    render();
  }
  // the ratchet: turns the thimble down at a steady rate until the spindle stops, then slips: click, click, click
  function ratchet() {
    if (raf) return;
    let last = performance.now(), slips = 0, slipAt = 0;
    const go = now => {
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      if (!closed()) { mic.r = Math.max(low(), mic.r - 0.09 * dt); render(); raf = requestAnimationFrame(go); return; }
      if (now - slipAt > 170) { slips++; slipAt = now; mic.clicks = true; render(); later(() => { mic.clicks = false; render(); }, 90); }
      if (slips < 3) { raf = requestAnimationFrame(go); return; }
      raf = 0; mic.ratcheted = true; clearWarn();
      note = mic.pin.placed ? 'Closed on the pin with the ratchet: click, click, click.' : 'Closed with the ratchet: click, click, click.';
      render();
      if (step === 1) zeroChecked();
    };
    note = ''; raf = requestAnimationFrame(go);
  }
  function placePin() {
    clearWarn();
    if (mic.pin.placed) { mic.pin.placed = false; mic.ratcheted = false; note = 'The pin is out of the micrometer.'; render(); return; }
    if (mic.r < mic.pin.d + 0.003) { note = 'It won\'t go in: open the micrometer up a turn or two first.'; render(); return; }
    mic.pin.placed = true; mic.ratcheted = false; note = 'The pin is between the anvil and the spindle, square across them. Now close it down.'; render();
  }
  // the thimble by hand: drag it up or down (the front of it moves with the finger: down opens), or the wheel
  let drag = null;
  D.thimble.style.cursor = 'ns-resize';
  D.thimble.addEventListener('pointerdown', e => {
    if (raf) return;
    drag = { y: e.clientY, id: e.pointerId }; D.svg.setPointerCapture(e.pointerId); e.preventDefault();
  });
  D.svg.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const scale = H / D.svg.getBoundingClientRect().height, dy = (e.clientY - drag.y) * scale;
    drag.y = e.clientY;
    turn(dy / RT / (2 * Math.PI) * PITCH);
  });
  const endDrag = e => { if (drag && e.pointerId === drag.id) drag = null; };
  D.svg.addEventListener('pointerup', endDrag); D.svg.addEventListener('pointercancel', endDrag);
  D.svg.querySelector('.rp-ratchet').addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); ratchet(); });
  D.thimble.addEventListener('wheel', e => { if (raf) return; e.preventDefault(); turn(Math.sign(e.deltaY) * 0.001); }, { passive: false });
  const btn = (label, title, fn, cls = '') => el('button', { class: cls, title, onclick: fn }, label);
  // hold a turning button to keep turning
  const holdBtn = (label, title, dr) => {
    const b = el('button', { title }, label);
    let timer = null;
    const stop = () => { cancelLater(timer); timer = null; };
    b.addEventListener('pointerdown', e => { e.preventDefault(); if (raf) return; turn(dr); const rep = () => { timer = later(() => { turn(dr); rep(); }, timer ? 60 : 380); }; rep(); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => b.addEventListener(t, stop));
    b.addEventListener('click', e => { if (e.detail === 0 && !raf) turn(dr); });   // the keyboard's Enter or Space
    return b;
  };
  const controls = () => el('div', { class: 'rp-ctl' },
    holdBtn('◀◀ Turn', 'Close it a whole turn of the thimble (Page Up)', -PITCH),
    holdBtn('◀ Line', 'Close it one thimble line (up or left arrow); hold to keep turning', -0.001),
    holdBtn('Line ▶', 'Open it one thimble line (down or right arrow); hold to keep turning', 0.001),
    holdBtn('Turn ▶▶', 'Open it a whole turn of the thimble (Page Down)', PITCH),
    btn('Ratchet', 'Turn the ratchet: it closes the micrometer and slips at an even light pressure when the spindle stops (R)', ratchet, 'primary'),
    step === 2 ? el('button', { id: 'rp-put', title: 'Set the old pin between the anvil and the spindle, or take it out', onclick: placePin }, 'Put the pin in') : null);

  // ---- the steps ----
  function zeroChecked() {
    zeroed = true;
    note = 'It reads zero: the thimble\'s edge sits on the sleeve\'s 0 line and its 0 line on the index line.';
    render();
  }
  const howTo = () => el('details', { class: 'rp-how', open: hints && step === 2 ? '' : false },
    el('summary', {}, 'How to read a micrometer'),
    el('ol', {},
      el('li', {}, 'The sleeve: the numbered lines are tenths of an inch (1 is .100"). Take the last numbered line showing left of the thimble\'s edge.'),
      el('li', {}, 'Each short line between them is .025". Add .025" for every one showing past that numbered line.'),
      el('li', {}, 'The thimble: 25 lines round it, each .001", and one turn of it is .025", one sleeve line. Add the thimble line that sits on the long index line along the sleeve; its numbers go up as you look up it.'),
      el('li', {}, 'Add them up: .025" + .025" + .001" is .051", fifty-one thousandths. Close on the work with the ratchet every time, so it always closes with the same light pressure.')),
    el('p', { class: 'muted small' }, 'A micrometer with a vernier, a row of ten lines along the top of the sleeve, reads on to the ten-thousandth; the pin chart here goes by thousandths. (Reading method: Precision Graphic Instruments, "How to read an outside micrometer".)'));

  // the step's content is built when the step begins; after that only the drawing, the note and the buttons that
  // depend on where the micrometer is change
  function render() {
    if (step === 1 || step === 2) drawMic(D, { r: mic.r, pin: step === 2 ? mic.pin : null, help: mic.help, clicks: mic.clicks });
    if (body.dataset.step !== String(step)) {
      body.dataset.step = step;
      body.replaceChildren(el('div', { class: 'rp-steps', 'aria-hidden': 'true' }, STEPS.map((s, i) =>
        el('span', { class: i === step ? 'now' : i < step ? 'done' : '' }, `${i + 1} ${s}`))), ...content());
    }
    const status = body.querySelector('#rp-note');
    if (status && status.textContent !== note) status.textContent = note;
    const go = body.querySelector('#rp-go');
    if (step === 1 && go) go.disabled = !(mic.ratcheted && closed());
    const put = body.querySelector('#rp-put');
    if (put) put.textContent = mic.pin.placed ? 'Take the pin out' : 'Put the pin in';
  }
  const next = () => { step++; note = ''; render(); later(() => body.querySelector('#rp-go:not([disabled]), .rp-ctl .primary, .rp-chart button')?.focus(), 50); };
  function content() {
    if (step === 0) return [
      el('p', {}, `Take the ${part} off the action to the bench, push the old pin out with a center pin punch, and lay it by: it is measured before anything goes back in.`),
      el('p', { class: 'muted small' }, 'Center pins come in half sizes a thousandth of an inch apart, too close to tell by eye, so the old pin is measured with a micrometer and the new one picked by that reading.'),
      el('div', { class: 'row' }, el('button', { class: 'primary', id: 'rp-go', onclick: () => { if (zeroed) step++; next(); } }, 'Push the old pin out'))];
    if (step === 1) return [
      el('p', {}, 'First check the micrometer\'s zero. With nothing between the anvil and the spindle, close it with the ratchet: it should read zero.'),
      el('p', { class: 'muted small' }, 'If it didn\'t, the sleeve would be turned to zero with the little spanner that comes with the micrometer before anything is measured. Drag the thimble, or use the buttons, the arrow keys or the wheel; the ratchet is the knob on its end.'),
      D.svg, controls(), el('p', { id: 'rp-note', class: 'rp-note', 'aria-live': 'polite' }, note),
      el('div', { class: 'row' }, el('button', { class: 'primary', id: 'rp-go', disabled: '', onclick: next }, 'Go on'))];
    if (step === 2) {
      const input = el('input', { type: 'text', id: 'rp-in', inputmode: 'decimal', autocomplete: 'off', placeholder: 'e.g. .050', 'aria-label': 'The old pin: your reading, in inches' });
      const result = el('p', { id: 'rp-result', 'aria-live': 'polite' });
      input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); call(input, result); } });
      return [
        el('p', {}, `${zeroed ? 'The micrometer\'s zero is checked. ' : ''}Open it up, put the old pin between the anvil and the spindle, and close it down, the last of it with the ratchet. Then read it.`),
        D.svg, controls(), el('p', { id: 'rp-note', class: 'rp-note', 'aria-live': 'polite' }, note),
        el('div', { class: 'row rp-call' }, input, el('button', { class: 'primary', onclick: () => call(input, result) }, 'Call it'),
          hints ? el('button', { 'aria-pressed': String(mic.help), title: 'Mark the value of each sleeve line showing, and the thimble line on the index line', onclick: e => { mic.help = !mic.help; e.target.setAttribute('aria-pressed', String(mic.help)); render(); } }, 'Help me read it') : null,
          el('button', { onclick: () => show(result) }, 'Show me')),
        result, howTo()];
    }
    if (step === 3) {
      const out = el('p', { id: 'rp-result', 'aria-live': 'polite' });
      const rows = PIN_SIZES.map((p, i) => el('tr', { class: i === picked ? 'picked' : '' },
        el('td', {}, el('button', { class: 'linkish', onclick: () => pick(i, out) }, `Size ${p.size}`)), el('td', {}, inch(p.d))));
      return [
        el('p', {}, `The old pin reads ${inch(micParts(old.d).total)}. Find it on the chart, then pick the pin that goes in.`),
        hints ? el('p', { class: 'muted small' }, 'A loose center takes the next half size up. A tight one that is repinned keeps its size, and its bushing is reamed to the new pin.') : null,
        el('div', { class: 'rp-chart' }, el('table', {}, el('thead', {}, el('tr', {}, el('th', {}, 'Center pin'), el('th', {}, 'Diameter'))), el('tbody', {}, rows))),
        el('p', { class: 'muted small' }, 'Chart: Steve\'s Piano Service, center pins 3/4" long, nickel silver.'),
        out];
    }
    const pinText = kind === 'tight'
      ? 'Push the new pin through the wood: it must be tight there. Ream the swollen bushing cloth with the straight reamer that matches the pin until the part swings with the right friction, push the pin through, and clip its point off flush.'
      : 'Push the new pin through the wood first: it must be tight there; if a finger could push it through, it is too small. Ream the bushings with the straight reamer that matches the pin until the part swings with the right friction, push it through, and clip its point off flush.';
    const res = el('p', { id: 'rp-result', 'aria-live': 'polite' });
    const doIt = el('button', { class: 'primary', id: 'rp-go', onclick: () => {
      const r = finish();
      done = true; clearInterval(watch);
      res.className = r.ok ? 'okc' : 'badc'; res.textContent = r.text;
      doIt.replaceWith(el('button', { class: 'primary', id: 'rp-done', onclick: close }, 'Done'));
      later(() => body.querySelector('#rp-done')?.focus(), 50);
    } }, 'Pin it and put it back');
    return [el('p', {}, `Size ${PIN_SIZES[picked].size}. ${pinText}`),
      el('p', { class: 'muted small' }, 'David A. Vanderhoofven, RPT: the pin fits tight in the wood so it can\'t move from side to side, and turns in the cloth bushings.'),
      el('div', { class: 'row' }, doIt), res];
  }

  // the student's call on the old pin
  function call(input, result) {
    if (!mic.pin.placed) return say(result, 'Put the old pin in the micrometer first.');
    if (!closed()) return say(result, 'Close it down on the pin first: the spindle isn\'t touching it yet.');
    if (!mic.ratcheted) return say(result, 'Give it the ratchet first: it slips at the same light pressure every time, so the reading is the same every time.');
    const p = parseMic(input.value);
    if (!p) return say(result, 'Type it as an inch reading, .050, or in thousandths, 50.');
    const shown = mic.r, j = judgeMic(p.v, shown), saidAs = p.as === 'thou' ? `Taking that as ${thou(p.v)}, ${inch(p.v)}. ` : p.as === 'mm' ? `Taking that as ${inch(p.v)}. ` : '';
    if (j.ok) return reveal(result, `${saidAs}Right: ${inch(micParts(shown).total)}, ${thou(micParts(shown).total)}.`, true);
    const way = j.off > 0 ? 'over' : 'under';
    const why = {
      turn: `That is ${Math.abs(j.turns) === 1 ? 'a whole turn' : `${Math.abs(j.turns)} whole turns`} ${way} (${inch(Math.abs(j.turns) * PITCH)}). Count the short lines on the sleeve again: every one showing past the last numbered line, left of the thimble's edge, is .025".`,
      tenth: 'That is a tenth out: the numbered lines on the sleeve are tenths of an inch, and this pin is nowhere near one.',
      decimal: 'That is a decimal place out: thousandths are the third place, so fifty thousandths is .050.',
      thimble: `That is ${Math.abs(j.lines)} thousandth${Math.abs(j.lines) === 1 ? '' : 's'} ${way}. Look again at which thimble line sits on the index line (the loupe helps), and at how many .025" lines show on the sleeve.`,
      far: 'That isn\'t what it shows. Start at the sleeve: the last numbered line showing, then the .025" lines past it, then the thimble line on the index line. Add them up.',
    }[j.why];
    say(result, saidAs + why, 'badc');
    input.select();
  }
  function say(node, text, cls = 'warnc') { node.className = cls; node.textContent = text; }
  function show(result) {
    if (!mic.pin.placed || !closed() || !mic.ratcheted) {
      // nothing on the micrometer to read yet: it is closed on the pin for you
      if (!mic.pin.placed) { mic.r = Math.max(mic.r, mic.pin.d + 0.01); mic.pin.placed = true; }
      mic.r = mic.pin.d; mic.ratcheted = true; note = 'Closed on the pin with the ratchet.'; render();
    }
    reveal(result, null, false);
  }
  function reveal(result, lead, ok) {
    const p = micParts(mic.r), sleeve = p.numbered * 0.1 + p.lines * PITCH;
    const parts = `Sleeve: the ${p.numbered} line${p.lines ? ` and ${p.lines === 1 ? 'one .025" line' : `${p.lines} .025" lines`} past it, ${inch(sleeve)}` : `, ${inch(sleeve)}`}. Thimble: line ${p.thimble} on the index line, ${inch(p.thimble / 1000)}. Together ${inch(p.total)}.`;
    result.className = ok ? 'okc' : '';
    result.replaceChildren(lead ?? `It reads ${inch(p.total)}, ${thou(p.total)}.`, ' ', el('span', { class: ok ? 'rp-parts' : '' }, ok && !hints ? '' : parts));
    const row = result.parentNode.querySelector('.rp-call');
    row.replaceChildren(el('button', { class: 'primary', id: 'rp-go', onclick: next }, 'Go on'));
    later(() => row.querySelector('#rp-go')?.focus(), 300);   // (not at once: the Enter that called it would press it too)
  }
  function pick(i, out) {
    const r = pickPin(kind === 'worn' ? 'loose' : kind, old.i, i);
    picked = i;
    if (!r.ok) {
      say(out, r.text, 'badc');
      body.querySelectorAll('.rp-chart tr').forEach((tr, k) => tr.classList.toggle('picked', k - 1 === i));
      return;
    }
    say(out, r.text, 'okc');
    body.querySelectorAll('.rp-chart button').forEach(b => { b.disabled = true; });
    body.querySelectorAll('.rp-chart tr').forEach((tr, k) => tr.classList.toggle('picked', k - 1 === i));
    out.after(el('div', { class: 'row' }, el('button', { class: 'primary', id: 'rp-go', onclick: next }, 'Go on')));
    later(() => body.querySelector('#rp-go')?.focus(), 50);
  }

  host.showModal();
  render();
  later(() => body.querySelector('#rp-go')?.focus(), 50);
  return api;
}
