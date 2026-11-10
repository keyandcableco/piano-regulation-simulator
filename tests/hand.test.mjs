// Move parts (hand.js): a hand on one part of each action's Sim (Sim.grab / letGo), and what the rest of the action does.
// node --test   (from the repo root; Node 22 or 20.19+)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as GM from '../model.js';
import * as UM from '../upright-model.js';

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a?.toFixed?.(3)} vs ${b?.toFixed?.(3)} (tolerance ${tol})`);
// run a Sim for secs, the hand's target set by f(t) if given; returns the events (with the hand's let-off flag)
function run(s, secs, dt, f) {
  const ev = [];
  for (let t = 0; t < secs; t += dt) { f?.(t); s.step(dt); for (const e of s.events) ev.push(e); s.events = []; }
  return ev;
}
const types = ev => ev.map(e => e.type);
const ramp = (from, to, secs) => t => from + (to - from) * Math.min(1, t / secs);

// ---------- the grand ----------
const G_DT = 0.0002;
const crown = s => GM.G.stringY - GM.crownY(s.g);   // crown to string, mm
const grand = () => new GM.Sim({ ...GM.FACTORY });

test('grand: the key held by hand goes down through let-off and comes back up when let go', () => {
  const s = grand(); s.grab('key', 0);
  const down = run(s, 1.2, G_DT, t => { s.hand.q = ramp(0, s.dip, 1)(t); });
  near(s.d, s.dip, 0.01, 'at the bottom');
  assert.ok(types(down).includes('letoff') && !types(down).includes('strike'), `a slow press lets off without a blow: ${types(down)}`);
  s.letGo(); s.press(0, GM.KEY.upSpeed);
  const up = run(s, 1, G_DT);   // (the key comes up on its own with the hammer riding it, and takes about 0.65 s to settle on its back rail)
  assert.equal(s.d, 0); assert.ok(types(up).includes('reset'));
});

test('grand: the jack tripped by hand at rest drops the hammer onto the repetition lever (the wink), and goes back under when let go', () => {
  const s = grand(), c0 = crown(s), p0 = s.psi;
  s.grab('jack', p0);
  const held = run(s, 0.5, G_DT, t => { s.hand.q = ramp(p0, p0 + 0.2, 0.3)(t); });
  const lo = held.find(e => e.type === 'letoff');
  assert.ok(lo?.hand, 'a let-off, marked as the hand\'s');
  assert.ok(!types(held).includes('jackjam'), 'no jammed-jack warning for a jack pushed by hand');
  near(crown(s) - c0, 1.6, 0.6, 'the wink at the crown (1/16 in)');
  s.letGo();
  let maxW = 0;
  const after = run(s, 0.6, G_DT, () => { maxW = Math.max(maxW, s.w); });
  assert.ok(types(after).includes('reset') && !types(after).includes('strike'), `back under, no blow: ${types(after)}`);
  assert.ok(maxW < 2, `the reset lifts it gently (${maxW.toFixed(2)} rad/s)`);
  near(crown(s), c0, 0.05, 'back where it rested');
});

test('grand: the hammer lifted by hand moves nothing else, and falls back onto the jack', () => {
  const s = grand(), c0 = crown(s), psi0 = s.psi, phi0 = s.L.phi;
  s.grab('hammer', s.g);
  const held = run(s, 0.5, G_DT, t => { s.hand.q = ramp(s.hand.at, s.hand.at + 0.08, 0.3)(t); });
  assert.ok(c0 - crown(s) > 8, `lifted ${(c0 - crown(s)).toFixed(1)} mm`);
  assert.equal(s.d, 0); near(s.psi, psi0, 1e-9, 'the jack'); near(s.L.phi, phi0, 1e-9, 'the wippen');
  assert.deepEqual(types(held), []);
  s.letGo();
  const after = run(s, 0.6, G_DT);
  near(crown(s), c0, 0.05, 'back on the jack');
  assert.ok(!types(after).includes('strike'));
});

test('grand: a checked hammer lifted out by hand and set back down stays checked', () => {
  const s = grand(); s.blow('mf'); run(s, 0.6, G_DT);   // the Strike and hold test's blow: a normal finger, which checks at the backcheck's face
  assert.ok(s.st.checked, 'checked after a strike and hold');
  const gc = s.g; s.grab('hammer', gc);
  run(s, 0.4, G_DT, t => { s.hand.q = ramp(gc, gc + 0.06, 0.3)(t); });
  assert.ok(!s.st.checked && s.g > gc + 0.05, 'lifted out of check');
  run(s, 0.4, G_DT, t => { s.hand.q = ramp(gc + 0.06, gc - 0.14, 0.3)(t); });
  near(s.g, gc, 0.002, 'stopped by the backcheck\'s face');
  s.letGo(); run(s, 0.5, G_DT);
  assert.ok(s.st.checked, 'held by the backcheck');
});

test('grand: the repetition lever pressed down moves nothing at rest; key down, the hammer on it follows it into check', () => {
  const s = grand(), c0 = crown(s), top = GM.linkage(s.a, 0).hornTop;
  s.grab('rep', top); run(s, 0.4, G_DT, t => { s.hand.q = ramp(top, top - 2, 0.3)(t); });
  near(crown(s), c0, 0.01, 'the hammer stays on the jack');
  near(s.L.hornTop, top - 2, 0.05, 'the lever is down');
  s.letGo(); run(s, 0.2, G_DT);
  s.press(s.dip, 6); run(s, 2.5, G_DT);
  const c1 = crown(s), q0 = Math.min(GM.linkage(s.a, s.d).hornTop, GM.knuckleBottom(s.g)[1]);
  s.grab('rep', q0);
  const ev = run(s, 0.4, G_DT, t => { s.hand.q = ramp(q0, q0 - 2, 0.3)(t); });
  assert.ok(crown(s) - c1 > 5, `the hammer came down with it (${(crown(s) - c1).toFixed(1)} mm)`);
  assert.ok(types(ev).includes('checked') && !types(ev).includes('softcheck'), `caught and held: ${types(ev)}`);
});

test('grand: the damper lifted by hand falls back onto the strings', () => {
  const s = grand(); s.grab('damper', 0);
  run(s, 0.4, G_DT, t => { s.hand.q = ramp(0, 4, 0.3)(t); });
  near(s.yd, 4, 0.1, 'lifted');
  s.letGo();
  assert.ok(types(run(s, 0.5, G_DT)).includes('seated') && s.yd === 0);
});

test('grand: a jerky pointer (60 updates a second, 0.3 mm of noise) on a slow key doesn\'t throw the hammer off the jack', () => {
  const s = grand(); s.grab('key', 0);
  let seed = 1, next = 0, gap = 0;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let t = 0; t < 1; t += G_DT) {
    if (t >= next) { s.hand.q = Math.min(s.dip, 5 * t + (rnd() - 0.5) * 0.6); next += 1 / 60; }
    s.step(G_DT);
    if (!s.st.escaped) gap = Math.max(gap, GM.crownY(s.g) - GM.crownY(GM.gOnJackAt(s.L, s.psi)));
  }
  assert.ok(gap < 0.5, `the crown left the jack by ${gap.toFixed(2)} mm`);
});

// ---------- the upright ----------
const U_DT = 0.0001;
const upright = () => new UM.Sim({ ...UM.FACTORY });

test('upright: the wippen lifted by hand off its capstan lets off and checks the hammer, the key staying where it is', () => {
  const s = upright(), p0 = s.phi, pDip = UM.wippenOn(UM.capstanTop(s.a, UM.keyAngle(s.a, s.dip)));
  s.grab('wippen', p0);
  const held = run(s, 1.2, U_DT, t => { s.hand.q = ramp(p0, pDip, 1)(t); });
  assert.equal(s.d, 0);
  assert.ok(types(held).includes('letoff') && s.jack === 'off', `let off: ${types(held)}`);
  s.letGo();
  const after = run(s, 0.8, U_DT);
  near(s.phi, p0, 1e-6, 'back on the capstan'); assert.ok(types(after).includes('reset'));
});

test('upright: the jack tripped by hand lets off (marked as the hand\'s) and goes back under when let go', () => {
  const s = upright(), p0 = s.psi;
  s.grab('jack', p0);
  const held = run(s, 0.4, U_DT, t => { s.hand.q = ramp(p0, p0 + 0.3, 0.3)(t); });
  assert.ok(held.find(e => e.type === 'letoff')?.hand);
  s.letGo();
  assert.ok(types(run(s, 0.4, U_DT)).includes('reset') && s.jack === 'under');
});

// (the jack's top keeps its place under the butt as the butt moves: upright-model.js's riding rule, so it turns a hair)
test('upright: the hammer lifted by hand leaves the key and wippen where they are, and falls back to its rail', () => {
  const s = upright(), g0 = s.g, phi0 = s.phi;
  s.grab('hammer', g0);
  run(s, 0.4, U_DT, t => { s.hand.q = ramp(g0, g0 + 0.4 * (UM.gString() - g0), 0.3)(t); });
  assert.ok(UM.stringGap(s.g) < UM.stringGap(g0) - 10, 'lifted toward the strings');
  assert.equal(s.d, 0); near(s.phi, phi0, 1e-9, 'the wippen');
  s.letGo(); run(s, 0.8, U_DT);
  near(s.g, g0, 1e-3, 'back on the rail');
});

test('upright: the damper lifted by hand falls back onto the strings', () => {
  const s = upright(); s.grab('damper', 0);
  run(s, 0.4, U_DT, t => { s.hand.q = ramp(0, 0.04, 0.3)(t); });
  near(s.dl, 0.04, 0.002, 'lifted');
  s.letGo();
  assert.ok(types(run(s, 0.4, U_DT)).includes('seated') && s.dl === 0);
});
