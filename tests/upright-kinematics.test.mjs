// Gate 3 for the upright's kinematics (research/upright/protocol.md 4): the factory meets its specs, every knob moves its
// readings the way research/upright/signs.md says, let-off stands apart from the knobs S2 names, and nothing passes
// through anything along a slow press.  node --test   (from the repo root; Node 22 or 20.19+)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FACTORY, SPEC, factory, regulate, measure, pose, slowPress, dipOf, stringGap, gString, jackGap, escaped,
  capstanTop, keyAngle, turn, wipPt, jackPt, polyGap, spoonTip, bcAngle, BC_BEND, CENTER, TRACE, STRAP_LEN, strapSlack,
  capstanFor, stringX, CORNER } from '../upright-model.js';

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a?.toFixed?.(3)} vs ${b?.toFixed?.(3)} (tolerance ${tol})`);
const M0 = measure(FACTORY);
const with_ = (k, v) => measure({ ...FACTORY, [k]: FACTORY[k] + v });
// the same, then the capstan reset to the factory lost motion, as a technician does after changing the blow or key level
const withReset = (k, v) => { const a = { ...FACTORY, [k]: FACTORY[k] + v }; return measure({ ...a, capstan: capstanFor(a) }); };

test('the stored factory regulation is what factory() solves, and it meets every spec it solves for', () => {
  const r = regulate();
  for (const k of Object.keys(FACTORY)) near(r.a[k], FACTORY[k], 2e-3, k);
  assert.deepEqual(r.missed, []);
});

test('a regulation out of a knob\'s reach says which specs it missed (the searches stop at a range\'s end quietly)', () => {
  // balance punchings this thin leave the front rail punchings no way to reach the dip
  const r = regulate({ balPunch: 0.2 });
  assert.ok(r.missed.includes('dip'), `missed: ${r.missed.join(', ') || 'nothing'}`);
});

test('the factory meets each spec it regulates to', () => {
  for (const k of ['dip', 'blow', 'lostMotion', 'letoff', 'check', 'damperShare', 'softShare']) {
    const s = SPEC[k];
    near(M0[k], s.target, s.tol, `${k} (${s.src})`);
  }
  assert.equal(M0.jammed, false, 'the jack stop clears the jack at the bottom');
  assert.equal(M0.checkScrapes, false, 'the backcheck is clear of the catcher at the strings');
  assert.ok(M0.strapSlack > 0 && M0.softStrapSlack > 0, 'the strap is slack at rest and with the soft pedal down (S1: the pedal must not lift the wippen)');
});

// Readings the geometry gives at textbook dip and blow, against their sources. They fall short: a finding for Greg
// (protocol 3.2 rule 1: don't fit the target to the model). Marked todo, so they report without failing.
test('aftertouch is within Igrec\'s 1.0-1.5 mm', { todo: 'finding: 0.44 mm at 0.400 in dip and 1-3/4 in blow' }, () => {
  assert.ok(M0.aftertouch >= SPEC.aftertouch.lo && M0.aftertouch <= SPEC.aftertouch.hi);
});
test('escapement is within Spurlock\'s 1/16-1/8 in', { todo: 'finding: 1.1 mm; by Spurlock\'s rule the blow is long for the dip' }, () => {
  assert.ok(M0.escapement >= SPEC.escapement.lo && M0.escapement <= SPEC.escapement.hi);
});

// signs.md: the row number, the knob and step, the reading, the expected sign of its change, and whether lost motion is
// reset after the change
const SIGNS = [
  [1, 'capstan', 0.1, 'lostMotion', -1, 'sourced'],
  [2, 'capstan', 0.1, 'check', -1, 'sourced'],
  [3, 'capstan', 0.1, 'damperDepth', -1, 'geometry: earlier in the key\'s travel'],
  [5, 'railShim', 0.3, 'blow', -1, 'sourced'],
  [6, 'railShim', 0.3, 'lostMotion', +1, 'sourced'],
  [8, 'letoff', 0.2, 'letoff', +1, 'geometry'],
  [9, 'backcheck', 0.5, 'check', -1, 'geometry'],
  [10, 'spoon', 0.2, 'damperShare', -1, 'geometry'],
  [11, 'bridle', 1, 'strapSlack', -1, 'geometry'],
  [13, 'frontPunch', 0.2, 'dip', -1, 'sourced'],
  [14, 'frontPunch', -0.2, 'aftertouch', +1, 'sourced: more dip, more aftertouch'],
  [15, 'railShim', -0.3, 'aftertouch', -1, 'sourced: more blow, less aftertouch, lost motion reset', true],
  [16, 'capstan', -0.1, 'aftertouch', -1, 'sourced: more lost motion, less aftertouch'],
  [18, 'frontPunch', -0.2, 'check', -1, 'sourced: more dip checks closer'],
  [19, 'balPunch', 0.3, 'keyHeight', +1, 'sourced'],
  [20, 'balPunch', 0.3, 'dip', +1, 'geometry'],
];
for (const [row, k, step, reading, sign, basis, reset] of SIGNS) {
  test(`signs.md row ${row}: ${k} ${step > 0 ? '+' : ''}${step} moves ${reading} ${sign > 0 ? 'up' : 'down'} (${basis})`, () => {
    const d = (reset ? withReset : with_)(k, step)[reading] - M0[reading];
    assert.ok(Math.sign(d) === sign && Math.abs(d) > 1e-4, `${reading} changed by ${d.toFixed(4)}`);
  });
}

test('signs.md rows 25-26: the soft pedal halves the blow and opens lost motion', () => {
  near(M0.softShare, 0.5, SPEC.softShare.tol, 'soft pedal share of the blow');
  const p = pose(FACTORY, 0, { soft: true });
  assert.ok(jackGap(p.phi, 0, p.gRail) > M0.lostMotion + 2, 'the butts leave the jacks');
});

test('let-off stands apart from capstan, key height, dip, blow and checking (S2)', () => {
  for (const [k, v] of [['capstan', 0.1], ['balPunch', 0.3], ['frontPunch', 0.2], ['railShim', 0.3], ['backcheck', 0.5]]) {
    near(with_(k, v).letoff, M0.letoff, 0.05, `let-off with ${k} +${v}`);
  }
});

test('a slow press: the wippen stays on its capstan, nothing passes through anything', () => {
  const dip = dipOf(FACTORY), gs = gString();
  let wasOff = false;
  for (let d = 0; d <= dip + 1e-9; d += 0.1) {
    const p = pose(FACTORY, d), k = keyAngle(FACTORY, d), cap = capstanTop(FACTORY, k);
    // the capstan's top on the cushion's flat underside (in the wippen's own frame), under the cushion
    const capW = turn(cap, CENTER.wippen, p.phi), cx = TRACE.heelCushion.map(q => q[0]);
    near(capW[1], Math.min(...TRACE.heelCushion.map(q => q[1])), 0.01, `capstan on the cushion at ${d.toFixed(1)}`);
    assert.ok(capW[0] > Math.min(...cx) && capW[0] < Math.max(...cx), `capstan under the cushion at ${d.toFixed(1)}`);
    assert.ok(stringGap(p.g) >= -1e-6 && p.g <= gs + 1e-9, `hammer short of the strings at ${d.toFixed(1)}`);
    if (!escaped(p.phi, p.psi, p.g)) assert.ok(jackGap(p.phi, p.psi, p.g) >= -1e-3, `jack not into the cushion at ${d.toFixed(1)}`);
    // the damper felts never press further into the strings than seated at rest; the spoon pushes the felt, not the
    // lever's end
    for (const f of TRACE.damperFelts) for (const q of f) {
      const w = turn(q, CENTER.damper, p.dl);
      assert.ok(w[0] - stringX(w[1]) <= q[0] - stringX(q[1]) + 0.01, `damper felt not through the strings at ${d.toFixed(1)}`);
    }
    const tipL = turn(spoonTip(FACTORY, p.phi), CENTER.damper, -p.dl), fy = TRACE.leverFelt.map(q => q[1]);
    if (p.dl > 0) assert.ok(tipL[1] > Math.min(...fy) && tipL[1] < Math.max(...fy), `spoon on the felt at ${d.toFixed(1)}`);
    // the jack clear of the jack stop felt; the catcher clear of the backcheck until it is caught
    assert.ok(polyGap(TRACE.jack.map(q => jackPt(p.phi, p.psi, q)), TRACE.jackStopFelt) > 0, `jack clear of its stop at ${d.toFixed(1)}`);
    if (p.on !== 'backcheck') {
      const cat = TRACE.catcherHead.map(q => turn(q, CENTER.butt, -p.g));
      const bc = TRACE.backcheckFelt.map(q => wipPt(p.phi, turn(q, BC_BEND, bcAngle(FACTORY))));
      assert.ok(polyGap(cat, bc) > 0, `catcher clear of the backcheck at ${d.toFixed(1)}`);
    }
    assert.ok(strapSlack(FACTORY, p.phi, p.g) >= 0, `strap not stretched at ${d.toFixed(1)}`);
    assert.ok(!p.blocked && !p.jammed, `no blocking or jamming at ${d.toFixed(1)}`);
    if (p.on === 'off' || p.on === 'backcheck') wasOff = true;
    else if (wasOff) assert.notEqual(p.on, 'jack', `once let off, the jack doesn't take the hammer again at ${d.toFixed(1)}`);
  }
  assert.ok(wasOff, 'it lets off before the bottom');
});

test('the strap is the traced one and slack at rest by S15\'s 6-7 mm', () => {
  near(STRAP_LEN, 58.7, 0.5, 'strap length');
  const p = pose({ ...FACTORY, railShim: 0, capstan: 0 }, 0);
  near(strapSlack(FACTORY, p.phi, p.g), 6.5, 0.6, 'slack at the traced rest');
});

test('the slow press against S15: hammer swing to the strings, crown per key travel, the jack\'s escape', () => {
  // S15: the hammer turns 18 degrees to reach the strings [e: camera plumbness]; the crown travels about 4.5 mm per mm
  // of key front [e]; the jack top escapes about 5 mm (19 px) toward the player with the key held [m px, e mm]. Bands
  // allow the clips' +-10% scale and their estimates, about 15%.
  near(gString() * 180 / Math.PI, 18, 2.5, 'hammer swing to the strings, degrees');
  const sp = slowPress(FACTORY), ratio = (M0.blow - M0.letoff) / (sp.letoffAt - sp.moveAt);
  near(ratio, 4.5, 0.7, 'crown per key travel');
  // the jack's top corner slides toward the player along the cushion (butt frame) and comes off it
  const held = pose(FACTORY, M0.dip, { held: true }), rest = pose(FACTORY, 0);
  const inButt = q => turn(jackPt(q.phi, q.psi, CORNER), CENTER.butt, q.g)[0];
  assert.ok(escaped(held.phi, held.psi, held.g), 'the jack has let off with the key held');
  near(inButt(rest) - inButt(held), 5, 2.5, 'its top\'s escape toward the player, mm');
});
