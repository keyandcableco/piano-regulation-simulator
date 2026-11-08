// Gate 4 for the upright's dynamics (research/upright/protocol.md 4): the Sim against S15's high-speed clips, within
// about 15%, and the no-jump rule (2.5 rule 1). The constants it checks were fitted by tests/upright-fit.mjs, so some
// of what follows is in sample:
// - fitted: neither case's path and landing (the hammer's weight), spring only's (the butt spring), strap only's and,
//   for the strap, its slack at rest and its taut window in strap + spring (its slack and stiffness);
// - not fitted, the check: strap + spring's path and landing, every case's jack reset and damper return. The rail's
//   restitution was read off the same clips' rebounds.
// node --test   (from the repo root; Node 22 or 20.19+)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Sim, FACTORY, DYN, pose, strapSlack, stringGap } from '../upright-model.js';
import { S15, runEllis, rms, regulationFor } from './upright-s15.mjs';

const within = (v, film, share, msg) => assert.ok(Math.abs(v - film) <= share * film, `${msg}: ${v?.toFixed?.(2)} against ${film} (within ${share * 100}%)`);
const RUNS = Object.fromEntries(['bs', 'b', 's', '0'].map(k => [k, runEllis(k, { ms: 300 })]));

for (const [k, r] of Object.entries(RUNS)) {
  const c = S15.cases[k];
  test(`S15 ${c.label}: back on the rail in ${c.railMs} ms, along the filmed path`, () => {
    within(r.railMs, c.railMs, 0.15, 'first landing, ms');
    assert.ok(rms(k, r, c.railMs + 15) < 2, `path rms ${rms(k, r, c.railMs + 15).toFixed(2)} deg`);
  });
  test(`S15 ${c.label}: the jack gets back under the butt at ${c.jackUnderMs} ms, about half the key's return`, () => {
    const reset = r.ev.find(e => e.type === 'reset');
    assert.ok(reset, 'the jack resets');
    within(reset.ms, c.jackUnderMs, 0.15, 'jack reset, ms');
    assert.ok(reset.keyShare > 0.4 && reset.keyShare < 0.7, `at ${(reset.keyShare * 100).toFixed(0)}% of the key's return (S15: 50-66%)`);
  });
  test(`S15 ${c.label}: the damper back on the strings by about 45 ms`, () => {
    const seated = r.ev.find(e => e.type === 'seated');
    within(seated.ms, 44.6, 0.15, 'damper on the strings, ms (S15 blow-check-release)');
  });
}

// fitted (the strap's slack and stiffness were fitted to this window and the slack), so this guards the fit
test('S15 strap + spring: the strap pulls only for a moment, as the key gets home (fitted)', () => {
  const ev = RUNS.bs.ev.filter(e => /strap/.test(e.type));
  const t0 = ev.find(e => e.type === 'straptaut')?.ms, t1 = [...ev].reverse().find(e => e.type === 'strapslack')?.ms;
  assert.ok(t0 > 50 && t0 < 62, `taut from ${t0?.toFixed(1)} ms (S15: 54-57)`);
  assert.ok(t1 > 58 && t1 < 75, `slack again by ${t1?.toFixed(1)} ms (S15: 65-70)`);
  const a = regulationFor('bs'), rest = pose(a, 0);
  assert.ok(strapSlack(a, rest.phi, rest.g) > 5 && strapSlack(a, rest.phi, rest.g) < 8, 'slack at rest, mm (S15: 6-7, by eye)');
});

test('S15: the strap\'s gain, and the spring\'s: neither is slowest, then spring only, and both is fastest of the three', () => {
  const t = Object.fromEntries(Object.entries(RUNS).map(([k, r]) => [k, r.railMs]));
  assert.ok(t['0'] > t.s && t['0'] > t.b && t.s > t.bs, JSON.stringify(t));
});
test('S15: the spring speeds up the strap\'s return (strap only 118 ms, both 110)', { todo: 'the sim has strap only at 107 ms, both at 112: the fit trades strap only\'s landing for the strap\'s slack and taut window' }, () => {
  assert.ok(RUNS.bs.railMs < RUNS.b.railMs, `both ${RUNS.bs.railMs.toFixed(1)} ms, strap only ${RUNS.b.railMs.toFixed(1)}`);
});

// The rail is a hard stop with a fixed restitution: the filmed head sinks up to 2 degrees into the cloth. After a
// staccato the hammer comes back from the strings unchecked, lands at about 440 deg/s, rises about 10 degrees off the
// rail and holds the jack out until it lands again 200 ms later.
test('the hammer lands faster than filmed (the rail cloth\'s give is not modelled)', { todo: 'model lands at 160-280 deg/s; S15 59-151' }, () => {
  for (const [k, r] of Object.entries(RUNS)) {
    const land = r.ev.find(e => e.type === 'rail');
    within(land.v * 180 / Math.PI, S15.cases[k].landingDegS, 0.15, `${k} landing speed`);
  }
});
test('the first rebound off the rail rises as high as filmed', { todo: 'the sim rises 2.0-3.3 degrees, the film 3.4-5.6 (case 0\'s clip ends too soon to tell)' }, () => {
  for (const k of ['bs', 'b', 's']) {
    const r = RUNS[k], i0 = r.t.findIndex(t => t > r.railMs), i1 = r.t.findIndex((t, j) => j > i0 && r.g[j] <= 1e-6);
    within(Math.max(...r.g.slice(i0, i1 > 0 ? i1 : undefined)), S15.cases[k].reboundDeg, 0.15, `${k} rebound, deg`);
  }
});
test('the key bouncing on its back rail throws the wippen off the capstan', { todo: 'the key is driven and rigid: S15\'s 1.5-2 mm throw not modelled' }, () => {
  assert.fail('not modelled');
});

// ---------- in play: the key programs ----------
function play(steps, a = FACTORY) {
  const s = new Sim(a), ev = []; let jump = 0, psiJump = 0;
  for (const [target, speed, secs] of steps) {
    s.press(target, speed);
    for (let t = 0; t < secs; t += 0.0001) {
      const g0 = s.g, p0 = s.psi;
      s.step(0.0001);
      jump = Math.max(jump, Math.abs(s.g - g0)); psiJump = Math.max(psiJump, Math.abs(s.psi - p0));
      ev.push(...s.events); s.events = [];
    }
  }
  return { s, ev, jump, psiJump, types: ev.map(e => e.type) };
}
const PROGRAMS = {
  'slow press and back': [[10.16, 10, 1.2], [0, 10, 1.3]],
  'soft blow held': [[10.16, 120, 0.4]],
  'firm blow held': [[10.16, 300, 0.4]],
  'firm blow, quick release': [[10.16, 300, 0.15], [0, 236, 0.4]],
  'staccato': [[10.16, 400, 0.03], [0, 400, 0.4]],
};
for (const [name, steps] of Object.entries(PROGRAMS)) {
  test(`no jumps: ${name}`, () => {
    const r = play(steps);
    // 0.1 ms steps: the hammer turning 0.006 rad in one is about 8.5 m/s at the crown; the jack swings back at jackRate
    assert.ok(r.jump < 0.006, `hammer moved ${r.jump.toFixed(4)} rad in a step`);
    assert.ok(r.psiJump <= DYN.jackRate * 0.0001 + 0.005, `jack moved ${r.psiJump.toFixed(4)} rad in a step`);
    for (const e of r.ev.filter(e => e.type === 'strike')) assert.ok(e.v < 3, `strike at ${e.v.toFixed(2)} m/s`);
  });
}
test('in play: a slow press lets off without striking, the hammer falls into check, and comes home', () => {
  const r = play(PROGRAMS['slow press and back']);
  assert.ok(r.types.includes('letoff') && !r.types.includes('strike') && r.types.includes('checked'), r.types.join(' '));
  assert.ok(r.types.includes('reset') && r.types.includes('rail'), 'the jack resets and the hammer lands on the rail');
  assert.ok(Math.abs(stringGap(r.s.g) - stringGap(pose(FACTORY, 0).g)) < 0.1, 'back at rest');
});
test('in play: a firm blow strikes once, lets off and is checked about where the factory checks', () => {
  const r = play(PROGRAMS['firm blow held']);
  assert.equal(r.types.filter(t => t === 'strike').length, 1, r.types.join(' '));
  const ck = r.ev.filter(e => e.type === 'checked').at(-1);
  assert.ok(ck && Math.abs(stringGap(r.s.g) - 14.29) < 1, `held ${stringGap(r.s.g).toFixed(1)} mm from the strings`);
});
test('in play: staccato strikes once and the hammer comes home', () => {
  const r = play(PROGRAMS.staccato);
  assert.equal(r.types.filter(t => t === 'strike').length, 1, r.types.join(' '));
  assert.ok(r.types.includes('rail'), 'lands on the rail');
});
