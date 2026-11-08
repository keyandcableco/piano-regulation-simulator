// The scenario harness (protocol 3.4 and Gate 3, chunk C5): each Find the fault case, set up from the factory, must show
// its complaint in play (the Sim) or in the reading a technician would take, the factory must not, and nothing bigger
// may show (a mf blow still strikes, unless the case is a note that won't play again). Run:
// ~/.nvm/versions/node/v22.23.2/bin/node --test tests/upright-scenarios.test.mjs (a few minutes: every case is played)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FACTORY, Sim, measure, grade } from '../upright-model.js';
import { SCENARIOS } from '../content-upright.js';

const UP = 236;
const setUp = sc => ({ ...FACTORY, damage: null, ...sc.make(FACTORY) });
// a blow at v mm/s, held, then let up quickly: what happened going down and coming up
function blow(a, v, { hold = 0.4, release = UP } = {}) {
  const s = new Sim(a);
  s.press(s.dip, v); s.run(s.dip / v + hold);
  const down = s.events; s.events = [];
  const t0 = s.t; s.press(0, release); s.run(0.6);
  const up = s.events;
  return { strikes: down.filter(e => e.type === 'strike').length, blocked: down.some(e => e.type === 'blocked'),
    checked: down.findLast(e => e.type === 'checked')?.dist ?? null, railAt: (up.find(e => e.type === 'rail')?.t ?? Infinity) - t0,
    seatedAt: (up.find(e => e.type === 'seated')?.t ?? Infinity) - t0, sim: s };
}
// Spurlock's jack return test: a hard blow, the sustain pedal down, the key let up very slowly
function jackReturns(a) {
  const s = new Sim(a); s.setPedal(true); s.run(0.15); s.press(s.dip, 1300); s.run(0.35); s.press(0, 10); s.run(s.dip / 10 + 0.2);
  return s.jack === 'under';
}
// the slowest blow that still strikes, mm/s
const minStrike = a => [30, 45, 60, 80, 100, 120, 160, 200].find(v => blow(a, v, { hold: 0.05 }).strikes) ?? Infinity;
// staccato blows at hz: how many struck
function repeats(a, hz, n = 6) {
  const s = new Sim(a);
  for (let i = 0; i < n; i++) { s.press(s.dip, 450); s.run(0.5 / hz); s.press(0, UP); s.run(0.5 / hz); }
  return s.events.filter(e => e.type === 'strike').length;
}
// (a quick release, the key let go at 1.5 m/s: where Ellis found the strap matters)
const F = { m: measure(FACTORY), mf: blow(FACTORY, 450), quick: blow(FACTORY, 1300, { release: 1500 }), min: minStrike(FACTORY), rep: repeats(FACTORY, 12) };

// what each complaint looks like on the action; the factory must not look like it
const SYMPTOM = {
  stickyJack: a => !jackReturns(a),
  looseKeys: (a, m) => m.lostMotionKey > 0.35,
  letoffClose: a => { const b = blow(a, 450); return b.strikes > 1 || b.blocked; },
  letoffFar: a => minStrike(a) > F.min,
  blubber: (a, m) => m.escapement <= 0.05,
  checkFar: a => blow(a, 450).checked > 17,
  bridleTight: (a, m) => m.softLifts,
  softWeak: (a, m) => m.softPedal < 0.35,
  spoonEarly: (a, m) => m.damperTiming < 0.35,
  buttLeather: (a, m) => m.lostMotionKey > 0.3,
  catcherLeather: a => blow(a, 450).checked > 17,
  jackSpringBroken: a => { const s = new Sim(a); for (const _ of [0, 1]) { s.press(s.dip, 450); s.run(0.4); s.press(0, UP); s.run(0.6); } return s.events.filter(e => e.type === 'strike').length === 1; },
  jackSpringWeak: a => repeats(a, 12) < F.rep,
  damperSpringBroken: a => blow(a, 450).seatedAt === Infinity,
  damperSpringWeak: a => blow(a, 450).seatedAt > F.mf.seatedAt + 0.05,
  buttCenterTight: a => minStrike(a) > F.min,
  strapBroken: a => blow(a, 1300, { release: 1500 }).railAt > F.quick.railAt * 1.3,
};

test('every case has a symptom check, and the factory shows none of them', () => {
  for (const sc of SCENARIOS) assert.ok(SYMPTOM[sc.id], `no symptom for ${sc.id}`);
  for (const [id, has] of Object.entries(SYMPTOM)) assert.equal(has(FACTORY, F.m), false, `the factory shows ${id}`);
});
for (const sc of SCENARIOS) {
  test(`${sc.id}: "${sc.complaint}" shows in play, a check finds it, and nothing bigger`, () => {
    const a = setUp(sc), m = measure(a);
    assert.ok(SYMPTOM[sc.id](a, m), 'the complaint shows');
    const bad = ['keyHeight', 'dip', 'blow', 'lostMotion', 'letoff', 'aftertouch', 'escapement', 'check', 'bridle', 'softPedal', 'damperTiming',
      'buttLeather', 'catcherLeather', 'jackSpring', 'damperSpring', 'buttSpring', 'buttCenter', 'strap'].filter(id => !grade(id, m).ok);
    assert.ok(bad.length > 0, 'some check finds it');
    const b = blow(a, 450);
    if (sc.id !== 'letoffClose') assert.ok(b.strikes >= 1 && !b.blocked, `a mf blow still strikes cleanly (${b.strikes} strikes, blocked ${b.blocked})`);
    assert.ok(!m.jammed || sc.id === 'letoffFar', 'no jack jammed on its stop');
    console.log(`  ${sc.id}: out of spec: ${bad.join(', ')}`);
  });
}
