// Bench drills: small hands-on checks technicians do by feel and eye, practiced on a 2D model.
// Each drill mounts into a panel element and keeps its own animation loop.

const rnd = (lo, hi) => lo + Math.random() * (hi - lo);

// ---------- hammer swing test (flange center friction) ----------
// Hold the hammer flange so the shank stands level, let go, and count the half-swings
// (each change of direction) until it stops. Too few: the center pin is tight. Too many: loose.
// Target about 9 for hard bushings (Chris Brown RPT, Key Steps for Grand Regulating).
export const SWING = { good: [7, 11], target: 9 };

// a pendulum with dry friction at the center pin: each half-swing loses about the same angle,
// 2·tau/g, so starting level it makes about n half-swings
function swingParams(n) {
  const g = 75;                          // g / L for a grand hammer, 1/s^2
  return { g, tau: (Math.PI / 2 / n) * g / 2 };
}

export function mountSwingDrill(root, { el, toast }) {
  let halfSwings = Math.round(rnd(3, 16));   // the part on the bench: unknown to the learner
  let state = 'ready', th = Math.PI / 2, w = 0, reversals = 0, raf = null, last = 0, counted = null;
  const cv = el('canvas', { width: 360, height: 230, class: 'drillcanvas' });
  const ctx = cv.getContext('2d');
  const status = el('p', { class: 'muted small' }, 'The flange is in the vise and the shank is held level. Let it go and count the half-swings (each time it changes direction) until it stops.');
  const input = el('input', { type: 'number', min: 0, max: 40, placeholder: 'count', class: 'countin' });
  const verdict = el('div');

  function draw() {
    const W = cv.width, H = cv.height, css = getComputedStyle(document.documentElement);
    const ink = css.getPropertyValue('--ink').trim() || '#222', muted = css.getPropertyValue('--muted').trim() || '#777';
    ctx.clearRect(0, 0, W, H);
    const px = W / 2, py = 46, L = 132;
    // vise jaws and flange
    ctx.fillStyle = '#7a5634'; ctx.fillRect(px - 46, py - 40, 30, 34); ctx.fillRect(px + 16, py - 40, 30, 34);
    ctx.fillStyle = '#d7b98c'; ctx.fillRect(px - 14, py - 34, 28, 30);
    // shank and head, swinging below the center pin
    const hx = px + L * Math.sin(th), hy = py + L * Math.cos(th);
    ctx.strokeStyle = '#c9a77a'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(-th);
    ctx.fillStyle = '#eee6d2'; ctx.beginPath(); ctx.roundRect(-16, -2, 32, 30, 10); ctx.fill();
    ctx.fillStyle = '#d7b98c'; ctx.fillRect(-7, -10, 14, 12);
    ctx.restore();
    ctx.fillStyle = '#3a2c22'; ctx.beginPath(); ctx.arc(px, py, 4, 0, 7); ctx.fill();
    // the resting line, faint
    ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(px, py + 8); ctx.lineTo(px, py + L + 30); ctx.stroke(); ctx.setLineDash([]);
    if (state === 'ready') { ctx.fillStyle = ink; ctx.font = '13px system-ui'; ctx.fillText('held level', hx - 72, hy - 12); }
  }
  function step(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;   // keeps real time on slow devices too
    const { g, tau } = swingParams(halfSwings);
    const steps = Math.ceil(dt / 0.001);
    for (let i = 0; i < steps; i++) {
      const h = dt / steps, before = w;
      const fr = Math.abs(w) > 1e-3 ? -Math.sign(w) * tau : 0;
      const a = -g * Math.sin(th) + fr;
      // dry friction holds it once the swing can no longer overcome it
      if (Math.abs(w) < 0.02 && Math.abs(g * Math.sin(th)) <= tau) { w = 0; state = 'stopped'; break; }
      w += a * h; th += w * h;
      if (before !== 0 && Math.sign(before) !== Math.sign(w) && w !== 0) reversals++;
    }
    draw();
    if (state === 'swinging') raf = requestAnimationFrame(step);
    else { status.textContent = 'It has stopped. How many half-swings did you count?'; input.focus(); }
  }
  function release() {
    if (state === 'swinging') return;
    th = Math.PI / 2; w = 0; reversals = 0; state = 'swinging'; counted = null; verdict.replaceChildren();
    status.textContent = 'Count each change of direction…';
    last = performance.now(); raf = requestAnimationFrame(step);
  }
  function check() {
    if (state !== 'stopped') { toast('Let it go and watch it stop first.'); return; }
    const n = +input.value;
    if (!input.value) { toast('Type the number of half-swings you counted.'); return; }
    counted = n;
    const close = Math.abs(n - reversals) <= 1;
    const [lo, hi] = SWING.good;
    const call = reversals < lo ? 'tight' : reversals > hi ? 'loose' : 'good';
    verdict.replaceChildren(
      el('p', {}, close ? `Good counting: it made ${reversals} half-swings.` : `It actually made ${reversals} half-swings (you counted ${n}). Watch the head turn back each time.`),
      el('p', {}, 'Now call it:'),
      el('div', { class: 'row' }, ['tight', 'good', 'loose'].map(c => el('button', { onclick: () => judge(c, call) },
        { tight: 'Too tight', good: 'About right', loose: 'Too loose' }[c]))));
  }
  function judge(c, call) {
    const words = { tight: 'too tight: it stops too soon', good: 'about right', loose: 'too loose: it swings too long' };
    verdict.replaceChildren(
      el('p', { class: c === call ? 'okc' : 'badc' }, c === call ? `Right: the center is ${words[call]}.` : `Not quite: with ${reversals} half-swings the center is ${words[call]}.`),
      el('p', { class: 'muted small' }, `Target: about ${SWING.target} half-swings for hard bushings, ${SWING.good[0]} to ${SWING.good[1]} is fine.`),
      call === 'good' ? el('div', { class: 'row' }, el('button', { class: 'primary', onclick: newPart }, 'Next hammer'))
        : el('div', { class: 'row' },
          el('button', { onclick: () => fix(call === 'tight' ? +4 : -4, call === 'tight' ? 'Repinned with the next size smaller pin.' : 'Repinned with the next size larger pin.') },
            call === 'tight' ? 'Repin: next size smaller' : 'Repin: next size larger'),
          call === 'tight' ? el('button', { onclick: () => fix(+2, 'Eased the bushings.') }, 'Ease the bushings') : null));
  }
  function fix(delta, msg) {
    halfSwings = Math.max(2, Math.min(18, halfSwings + delta + Math.round(rnd(-1, 1))));
    toast(msg + ' Try the swing again.');
    state = 'ready'; th = Math.PI / 2; w = 0; input.value = ''; verdict.replaceChildren();
    status.textContent = 'Swing it again and count.'; draw();
  }
  function newPart() {
    halfSwings = Math.round(rnd(3, 16)); state = 'ready'; th = Math.PI / 2; w = 0; input.value = ''; verdict.replaceChildren();
    status.textContent = 'A new hammer in the vise. Let it go and count.'; draw();
  }
  root.append(
    el('h3', {}, 'Hammer swing test'),
    el('p', {}, 'Checks the friction of the hammer flange center. Too tight and the hammer is sluggish to repeat; too loose and it wobbles sideways.'),
    cv, status,
    el('div', { class: 'row' }, el('button', { class: 'primary', onclick: release }, 'Let it go'), input, el('button', { onclick: check }, 'Check my count')),
    verdict,
    el('p', { class: 'credit' }, 'About nine half-swings for hard bushings: Chris Brown RPT, Key Steps for Grand Regulating.'));
  draw();
  return () => cancelAnimationFrame(raf);
}
