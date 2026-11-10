// The grand's specs, readings and grades (model.js SPEC, band, grade, measure), after the second veteran critique
// (2026-11-09): sourced bands keep their printed edges at every level, a reading is graded as it prints, the damper stop
// rail and pedal lift follow the makers, and readings that passed while the thing they stand for was wrong now say so.
// node --test tests/grand-specs.test.mjs   (Node 22; about a minute: measure() runs a slow press each time)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { IN, G, ADJ, SPEC, DAMAGE, FACTORY, measure, grade, band, inBand, cancelled, factory, Sim } from '../model.js';

const LEVELS = [1.5, 1, 0.75];   // Apprentice, Journeyman, Exam
const fails = (m, k = 1) => Object.keys(SPEC).filter(id => !grade(id, m, k).ok);
const m0 = measure(FACTORY);
const withReading = (id, v, extra = {}) => ({ ...m0, [id]: v, ...extra });
const at = (f = {}) => { const a = { ...FACTORY }; for (const [k, v] of Object.entries(f)) a[k] = typeof v === 'string' ? v : (a[k] || 0) + v; return a; };

test('factory passes every spec at every level', () => {
  for (const k of LEVELS) assert.deepEqual(fails(m0, k), [], `level factor ${k}`);
});

test('factory() still solves to FACTORY (let-off and drop are kept as first solved, within 0.003 mm)', () => {
  const F = factory();
  for (const [k, v] of Object.entries(FACTORY)) assert.ok(Math.abs(F[k] - v) < (k === 'letoff' || k === 'drop' ? 3e-3 : 1e-4), `${k}: ${F[k]} against ${v}`);
  for (const k of LEVELS) assert.deepEqual(fails(measure(F), k), []);
});

test('a band a source prints passes at both its edges at every level, and is not cut at Exam level', () => {
  const edges = { check: [IN / 2, IN * 5 / 8], damperTiming: [1 / 3, 1 / 2], damperStop: [1, 2], pedalLift: [-0.8, 0] };
  for (const [id, [lo, hi]] of Object.entries(edges)) {
    for (const k of LEVELS) for (const v of [lo, hi]) assert.ok(grade(id, withReading(id, v), k).ok, `${id} at ${v}, level ${k}`);
    assert.deepEqual(band(id, 0.75), band(id, 1), `${id}: the same band at Exam level`);
    assert.ok(band(id, 1.5)[0] < lo && band(id, 1.5)[1] > hi, `${id}: wider for the Apprentice`);
  }
  // outside the published range fails at Journeyman and Exam level
  for (const [id, v] of [['check', 12.6], ['check', 16.0], ['damperTiming', 0.55], ['damperTiming', 0.31], ['damperStop', IN / 32], ['pedalLift', 0.5]])
    for (const k of [1, 0.75]) assert.ok(!grade(id, withReading(id, v), k).ok, `${id} at ${v}, level ${k}`);
});

test('the sim\'s own bands narrow at Exam level and widen for the Apprentice', () => {
  for (const id of ['letoff', 'drop', 'blow', 'dip', 'aftertouch', 'wink', 'keyHeight', 'jackPos']) {
    const w = k => band(id, k)[1] - band(id, k)[0];
    assert.ok(w(0.75) < w(1) && w(1) < w(1.5), id);
  }
});

test('a reading is graded as it prints: two that print the same to 0.01 mm grade the same', () => {
  for (const id of ['letoff', 'drop', 'dip', 'blow', 'check', 'wink', 'aftertouch']) for (const k of LEVELS) for (const e of band(id, k))
    for (let i = -6; i <= 6; i++) {
      const v = e + i * 0.002, r = Math.round(v * 100) / 100;
      assert.equal(grade(id, withReading(id, v), k).ok, grade(id, withReading(id, r), k).ok, `${id} ${v} against ${r}, level ${k}`);
    }
  assert.ok(inBand(12.699999, [12.7, 15.875]) && inBand(0.33, [1 / 3, 1 / 2]) && !inBand(0.32, [1 / 3, 1 / 2]));
});

test('the makers\' damper figures: stop rail play 1/16 in, the pedal lifting no higher than the key', () => {
  assert.ok(Math.abs(m0.damperStop - IN / 16) < 1e-3 && Math.abs(m0.pedalLift + 0.25) < 1e-3);
  assert.equal(m0.pedalIntoStop, false);
  const level = measure({ ...FACTORY, pedalLift: FACTORY.pedalLift + 0.25 }), over = measure(at({ pedalLift: 0.6 })), thump = measure(at({ pedalLift: 2 }));
  assert.ok(grade('pedalLift', level).ok, 'level with the key\'s lift (Kawai) passes');
  assert.match(grade('pedalLift', over).note, /higher than the keys/);
  assert.ok(thump.pedalIntoStop); assert.match(grade('pedalLift', thump).note, /into the stop rail/);
  assert.match(grade('pedalLift', measure(at({ pedalLift: -1 }))).note, /too little/);
  // the pedal no longer reaches the stop rail at factory; pushed 2 mm higher it does (the fault case's thump)
  const pedal = a => { const s = new Sim(a); s.setPedal(true); s.run(0.3); return s.events.map(e => e.type); };
  assert.ok(!pedal({ ...FACTORY }).includes('damperstop')); assert.ok(pedal(at({ pedalLift: 2 })).includes('damperstop'));
});

test('a wink capped by the rest rail does not pass', () => {
  for (const [rail, rep] of [[2, -0.6], [1.6, -0.4]]) {
    const m = measure(at({ restRail: rail, repStop: rep })), g = grade('wink', m);
    assert.ok(inBand(m.wink, band('wink')), 'the capped drop is inside the band');
    assert.ok(m.winkOnRail && !g.ok); assert.match(g.note, /rest rail/);
  }
  const onRail = measure(at({ capstan: -0.6 }));
  assert.ok(onRail.onRail); assert.match(grade('wink', onRail).note, /sits on the rest rail/);
  assert.ok(!m0.winkOnRail);
});

test('let-off does not move when the capstan turns (the reading no longer rides the slow press\'s grid)', () => {
  const v = Array.from({ length: 9 }, (_, i) => measure({ ...FACTORY, capstan: FACTORY.capstan + 0.04 * i }));
  const spread = f => Math.max(...v.map(f)) - Math.min(...v.map(f));
  assert.ok(spread(m => m.letoff) < 0.005, `let-off spread ${spread(m => m.letoff)}`);
  assert.ok(spread(m => m.drop) < 0.005, `drop spread ${spread(m => m.drop)}`);
});

test('drop with the lever not yet on its screw at let-off reads "none yet", and every click of the screw shows', () => {
  // a lever set low, so the hammer isn't carried back to the string, and the drop screw raised click by click
  const seen = [];
  for (let i = 0; i <= 30; i++) {
    const m = measure(at({ repStop: -0.2, drop: 0.05 * i })), g = grade('drop', m);
    if (m.screwLate != null && !m.dropAtString) { seen.push(g.note); assert.ok(!g.ok && g.v === null); assert.match(g.note, /^none/); }
  }
  assert.ok(seen.length >= 3, `only ${seen.length} such settings`);
  assert.equal(new Set(seen).size, seen.length, 'each click reads differently');
  assert.equal(m0.screwLate, null);
});

test('a spring too weak to carry the hammer says so on the drop reading', () => {
  const m = measure(at({ repSpring: -0.6 }));
  assert.ok(m.leverSags); assert.match(grade('drop', m).note, /too weak to carry the hammer/);
});

test('a broken jack spring is the jack\'s fault: found by tripping the jack, not by wiggling the hammer', () => {
  const m = measure(at({ damage: 'brokenJackSpring' }));
  assert.ok(grade('hammerSound', m).ok); assert.ok(!grade('wink', m).ok);
  assert.equal(grade('wink', m).note, DAMAGE.brokenJackSpring.signs);
  for (const d of ['splitShank', 'looseFlange', 'looseHead']) assert.ok(!grade('hammerSound', measure(at({ damage: d }))).ok, d);
});

test('the spring\'s printed band is the graded one', () => {
  assert.deepEqual([SPEC.spring.lo, SPEC.spring.hi], [G.weakNet, G.popNet]);
  for (let i = -14; i <= 14; i++) {
    const m = measure(at({ repSpring: 0.05 * i })), inside = m.spring >= SPEC.spring.lo && m.spring <= SPEC.spring.hi;
    for (const k of LEVELS) assert.equal(grade('spring', m, k).ok, inside, `net ${m.spring}`);
  }
});

test('a second fault that puts back what the first put out is found', () => {
  const first = at({ frontPunch: 1.0 });
  assert.ok(!grade('dip', measure(first)).ok);
  assert.ok(cancelled(first, { ...first, balPunch: first.balPunch + 0.5 }).includes('dip'), 'a high key gives a shallow dip its depth back');
  assert.deepEqual(cancelled(first, { ...first, hammerSpace: 0.9 }), []);
});

test('the action ratio is a reading', () => {
  assert.ok(m0.ratio > 5.2 && m0.ratio < 5.8, `ratio ${m0.ratio}`);
  assert.ok(Math.abs(m0.ratioKey - G.capstanLocal / -G.keyFrontLocal) < 0.02);
  assert.ok(Math.abs(m0.ratioKey * m0.ratioWippen * m0.ratioShank - m0.ratio) < 0.6);   // the product is the ratio at rest; it falls through the stroke
  assert.ok(measure(at({ capstan: 0.5 })).ratio > 5);
});

test('every Find-the-fault case is out of spec at every level, and the capstan case has play you can feel', () => {
  const src = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  const i0 = src.indexOf('const SCENARIOS = ['), i1 = src.indexOf('\n];', i0);
  const SCENARIOS = new Function(`return ${src.slice(i0 + 'const SCENARIOS = '.length, i1 + 2)}`)();
  for (const sc of SCENARIOS) { const m = measure(at(sc.faults)); for (const k of LEVELS) assert.ok(fails(m, k).length, `${JSON.stringify(sc.faults)} at level ${k}`); }
  const cap = SCENARIOS.find(s => s.faults.capstan < 0), m = measure(at(cap.faults));
  assert.ok(m.lostMotion >= 0.4, `lost motion ${m.lostMotion}`); assert.ok(!grade('lostMotion', m, 1.5).ok);
  assert.doesNotMatch(cap.complaint, /weak/);
});

test('knob ends stop where a part would meet another', () => {
  const lim = id => { const d = ADJ.find(x => x.id === id); return [d.min, d.max]; };
  assert.deepEqual(lim('capstan'), [10, 16.5]); assert.deepEqual(lim('letoff'), [93, 100]);
  assert.deepEqual(lim('restRail'), [101, 122]); assert.deepEqual(lim('balPunch'), [0, 2.5]);
  assert.ok(lim('backcheck')[1] > G.bcScrapeLean, 'the scrape can still be reached');
  for (const d of ADJ) if (d.id in FACTORY) assert.ok(FACTORY[d.id] > d.min && FACTORY[d.id] < d.max, d.id);
});
