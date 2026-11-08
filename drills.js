// Bench drills: small hands-on checks technicians do by feel and eye, practiced on a 2D model.
// Each drill mounts into a panel element and keeps its own animation loop.
import { CENTERS, SWING_K, swingCount } from './model.js';

const rnd = (lo, hi) => lo + Math.random() * (hi - lo);

// ---------- hammer swing test (flange center friction) ----------
// Hold the hammer flange so the shank stands level, let go, and count the half-swings (each change of direction) until
// it stops. Each hammer on the bench has a friction torque at its center pin; its count follows technicians' counts
// against the gram gauge (swingCount in model.js: half-swings ≈ 21 ÷ grams at 23 mm). Too few: tight; too many: loose.
// The call is on the friction itself, Renner's 2 to 5 g at 23 mm (CENTERS.hammer), about 4 to 10 half-swings; about 9
// is Chris Brown's ideal for hard bushings (Key Steps for Grand Regulating). A hammer that swings right can still
// wobble on its pin: one side of its bushing worn (Renner).
const H = CENTERS.hammer;
export const SWING = { target: 9, good: [SWING_K / H.band[1], SWING_K / H.band[0]] };   // about 4.2 to 10.5
const gramsOf = T => T / H.at;

// The drawn pendulum: the hammer about its center pin (Hirschkorn, Table A.1: its weight's 0.0118 N·m over 1.54e-4 kg·m²
// about the pin gives g/L = 76 /s²), with a dry friction at the pin chosen so it stops after exactly the hammer's count.
// Stepped in fixed 1 ms steps so the count on screen is the count it was set for.
const G_L = 76, H_STEP = 0.001;
function pendulumStep(s, tau) {
  // dry friction holds it once the swing can no longer overcome it
  if (Math.abs(s.w) < 0.02 && Math.abs(G_L * Math.sin(s.th)) <= tau) { s.w = 0; return false; }
  const before = s.w, fr = Math.abs(s.w) > 1e-3 ? -Math.sign(s.w) * tau : 0;
  s.w += (-G_L * Math.sin(s.th) + fr) * H_STEP; s.th += s.w * H_STEP;
  if (before !== 0 && Math.sign(before) !== Math.sign(s.w) && s.w !== 0) s.rev++;
  return true;
}
function countFor(tau) {
  const s = { th: Math.PI / 2, w: 0, rev: 0 };
  for (let i = 0; i < 120000 && pendulumStep(s, tau); i++);
  return s.rev;
}
// the friction that makes the drawn hammer stop after n half-swings: between the smallest tau that gives n or fewer and the
// smallest that gives fewer than n (the count falls as tau grows)
const tauCache = new Map();
function tauFor(n) {
  if (tauCache.has(n)) return tauCache.get(n);
  const atMost = k => { let lo = 0.05, hi = 80; for (let i = 0; i < 36; i++) { const m = Math.sqrt(lo * hi); if (countFor(m) > k) lo = m; else hi = m; } return hi; };
  const t = Math.sqrt(atMost(n) * atMost(n - 1));
  tauCache.set(n, t);
  return t;
}

// A hammer for the bench, kept clear of the band's edges so its count calls it plainly: tight is Fred Sturm's 3-4
// half-swings at 6-8 g and tighter (2-3 here); loose is James Kelly's 12-14 and looser (13-19); in between 5-9. One good
// one in four has a worn bushing.
function benchHammer() {
  const r = Math.random(), g = r < 0.2 ? rnd(6.5, 10) : r < 0.4 ? rnd(1.1, 1.6) : rnd(2.3, 4.5);
  return { T: g * H.at, wobble: r >= 0.4 && Math.random() < 0.25 };
}
// a center sized to the spec by a repair (the sim's own spread, inside Renner's band)
const sized = () => rnd(2.4, 4.2) * H.at;

export function mountSwingDrill(root, { el, toast }) {
  let ham = benchHammer(), wobbled = false;   // the part on the bench: unknown to the learner
  let state = 'ready', sw = { th: Math.PI / 2, w: 0, rev: 0 }, raf = null, last = 0, acc = 0;
  const cv = el('canvas', { width: 360, height: 230, class: 'drillcanvas' });
  const ctx = cv.getContext('2d');
  const status = el('p', { class: 'muted small' }, 'The flange is in the vise and the shank is held level. Let it go and count the half-swings (each time it changes direction) until it stops.');
  const input = el('input', { type: 'number', min: 0, max: 40, placeholder: 'count', class: 'countin' });
  const wobbleLine = el('p', { class: 'small' });
  const verdict = el('div');
  const count = () => swingCount(ham.T);

  function draw() {
    const W = cv.width, Hc = cv.height, css = getComputedStyle(document.documentElement);
    const ink = css.getPropertyValue('--ink').trim() || '#222', muted = css.getPropertyValue('--muted').trim() || '#777';
    ctx.clearRect(0, 0, W, Hc);
    const px = W / 2, py = 46, L = 132, th = sw.th;
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
    acc += Math.min(0.1, (now - last) / 1000); last = now;   // keeps real time on slow devices too
    const tau = tauFor(count());
    for (; acc >= H_STEP; acc -= H_STEP) if (!pendulumStep(sw, tau)) { state = 'stopped'; break; }
    draw();
    if (state === 'swinging') raf = requestAnimationFrame(step);
    else { status.textContent = 'It has stopped. How many half-swings did you count?'; input.focus(); }
  }
  function release() {
    if (state === 'swinging') return;
    sw = { th: Math.PI / 2, w: 0, rev: 0 }; state = 'swinging'; verdict.replaceChildren();
    status.textContent = 'Count each change of direction…';
    tauFor(count());   // worked out before the clock starts
    last = performance.now(); acc = 0; raf = requestAnimationFrame(step);
  }
  // Renner: hold the flange down and flex the shank sideways, watching the pin
  function wobble() {
    wobbled = true;
    wobbleLine.textContent = ham.wobble ? 'Flange held down, shank flexed sideways: the pin moves in its bushing. Side play.'
      : 'Flange held down, shank flexed sideways: the pin stays put. No side play.';
    wobbleLine.className = 'small ' + (ham.wobble ? 'badc' : 'okc');
  }
  // the right call: worn if it wobbles, else by its friction against Renner's band
  const callOf = () => { const g = gramsOf(ham.T); return ham.wobble ? 'worn' : g > H.band[1] ? 'tight' : g < H.band[0] ? 'loose' : 'good'; };
  function check() {
    if (state !== 'stopped') { toast('Let it go and watch it stop first.'); return; }
    const n = +input.value;
    if (!input.value) { toast('Type the number of half-swings you counted.'); return; }
    const real = sw.rev, close = Math.abs(n - real) <= 1;
    verdict.replaceChildren(
      el('p', {}, close ? `Good counting: it made ${real} half-swings.` : `It actually made ${real} half-swings (you counted ${n}). Watch the head turn back each time.`),
      el('p', {}, wobbled ? 'Now call it:' : 'Now call it (wobble it first, if you haven\'t):'),
      el('div', { class: 'row' }, ['tight', 'good', 'loose', 'worn'].map(c => el('button', { onclick: () => judge(c) },
        { tight: 'Too tight', good: 'About right', loose: 'Too loose', worn: 'Wobbles: worn bushing' }[c]))));
  }
  function judge(c) {
    const call = callOf(), g = gramsOf(ham.T);
    const words = { tight: 'too tight: it stops too soon', good: 'about right', loose: 'too loose: it swings too long',
      worn: 'worn: its friction may pass, but the pin moves in its bushing' };
    const fixBtn = (label, msg, next) => el('button', { onclick: () => fix(msg, next) }, label);
    const fixes = {
      // ease a tight one whose cloth is firm; a new polished pin and sized bushing also frees it (spec §8.3)
      tight: [fixBtn('Ease the bushing', 'Eased: burnished and lightly reamed.', { T: sized() }),
        fixBtn('Repin with a polished pin', 'Repinned, the bushing sized to the spec. Easing would have done it.', { T: sized() })],
      loose: [fixBtn('Repin: next half size up', 'Repinned with the next half size up, snug in the birdseye.', { T: sized() })],
      // repinning a worn bushing tightens it but leaves the wobble (Renner)
      worn: [fixBtn('Rebush the flange', 'Rebushed: new cloth, sized with a new pin, burnished.', { T: sized(), wobble: false }),
        fixBtn('Repin: next half size up', 'Repinned: tighter, but it still wobbles. One side of the cloth is worn.', { T: Math.min(0.9 * H.band[1], g * 1.6) * H.at, wobble: true })],
    };
    verdict.replaceChildren(
      el('p', { class: c === call ? 'okc' : 'badc' }, c === call ? `Right: the center is ${words[call]}.` : `Not quite: the center is ${words[call]}.`),
      el('p', { class: 'muted small' }, `It made ${count()} half-swings, about ${g.toFixed(1)} g on a gram gauge at ${H.at} mm (${Math.round(ham.T)} mm·g). `
        + `Renner wants ${H.band[0]} to ${H.band[1]} g there, about ${Math.round(SWING.good[0])} to ${Math.floor(SWING.good[1])} half-swings; about ${SWING.target} is Chris Brown's ideal for hard bushings.`),
      call === 'good' ? el('div', { class: 'row' }, el('button', { class: 'primary', onclick: newPart }, 'Next hammer'))
        : el('div', { class: 'row' }, fixes[call]));
  }
  function fix(msg, next) {
    ham = { ...ham, ...next }; wobbled = false;
    toast(msg + ' Try the swing again.');
    reset('Swing it again and count.');
  }
  function reset(text) {
    cancelAnimationFrame(raf);
    state = 'ready'; sw = { th: Math.PI / 2, w: 0, rev: 0 }; input.value = ''; verdict.replaceChildren(); wobbleLine.textContent = '';
    status.textContent = text; draw();
  }
  function newPart() { ham = benchHammer(); wobbled = false; reset('A new hammer in the vise. Let it go and count.'); }
  root.append(
    el('h3', {}, 'Hammer swing test'),
    el('p', {}, 'Checks the friction of the hammer flange center. Too tight and the hammer is sluggish to repeat; too loose and it wobbles sideways. A hammer can swing right and still wobble: hold the flange and flex the shank to see.'),
    cv, status,
    el('div', { class: 'row' }, el('button', { class: 'primary', onclick: release }, 'Let it go'), input, el('button', { onclick: check }, 'Check my count'),
      el('button', { onclick: wobble }, 'Wobble it')),
    wobbleLine, verdict,
    el('p', { class: 'credit' }, 'About nine half-swings for hard bushings: Chris Brown RPT, Key Steps for Grand Regulating. Counts against the gram gauge: a fit to Brown\'s figure and Fred Sturm\'s (PTG), not a published rule. Friction range and the wobble test: Renner USA\'s flange bushing cloth manual (Bill Spurlock).'));
  draw();
  return () => cancelAnimationFrame(raf);
}
