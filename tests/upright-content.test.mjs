// Gate 5 in Node (research/upright/protocol.md 3.8 and 4): every cause and effect the upright's Learn text states is
// either shown by the model, checked here or in upright-kinematics.test.mjs (research/upright/gate5.md names which),
// or the text says the sim doesn't model it. Also the content's structure, the spec rules of 3.2 (rules 2 and 3) and
// the de-regulated start. Run: node --test tests/upright-content.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ADJ, SPEC, FACTORY, measure, grade, band, Sim, capstanFor, DAMPER_PEDAL_LIFT, TRACE, CENTER } from '../upright-model.js';
import { STEPS, TESTS, TIPS, TOOLS, SPEC_NAMES, bandText, readingText, callouts, deregulated, seeded, creditOf } from '../content-upright.js';

const IN = 25.4, M0 = measure(FACTORY);
const with_ = (k, v) => measure({ ...FACTORY, [k]: FACTORY[k] + v });
const step = id => ADJ.find(d => d.id === id).step;
const GRADED = STEPS.filter(s => !s.info), specsOf = s => [s.spec, ...(s.also ?? [])];
const text = s => [s.what, s.how, s.note].filter(Boolean).join(' ');

// ---------- structure ----------
test('every step has its text; graded steps name real knobs, tests and specs, and a test of theirs reveals each spec', () => {
  const ids = new Set();
  for (const s of STEPS) {
    const id = s.spec ?? s.id;
    assert.ok(!ids.has(id), `step id ${id} twice`); ids.add(id);
    assert.ok(s.title && s.what && s.how, `${id}: title, what and how`);
    if (s.info) continue;
    for (const k of s.knobs) assert.ok(ADJ.some(d => d.id === k), `${id}: knob ${k}`);
    const tests = s.tests ?? [s.test];
    assert.ok(tests.includes(s.test), `${id}: its main test is among its tests`);
    for (const t of tests) assert.ok(TESTS[t], `${id}: test ${t}`);
    for (const sp of specsOf(s)) {
      assert.ok(SPEC[sp] && SPEC_NAMES[sp], `${id}: SPEC and name for ${sp}`);
      assert.ok(tests.some(t => TESTS[t].specs.includes(sp)), `${id}: a test that reveals ${sp}`);
    }
  }
  for (const [t, d] of Object.entries(TESTS)) for (const sp of d.specs) assert.ok(SPEC[sp], `test ${t}: spec ${sp}`);
});
test('tips sit on real steps and carry their credit; tools name their maker', () => {
  const ids = new Set(STEPS.map(s => s.id ?? s.spec));   // a step's tips go by its id where it has one (prep), else its spec
  for (const [k, list] of Object.entries(TIPS)) {
    assert.ok(ids.has(k), `tips for ${k}, which is no step`);
    for (const t of list) { assert.ok(t.text && t.who && t.src, `${k}: text, who, src`); assert.ok(creditOf(t).length > 0); }
  }
  for (const t of TOOLS) assert.ok(t.name && t.who && t.what, `tool ${t.name}`);
});
test('the text never says "never" or "always" as law (3.8: where sources differ, say so)', () => {
  for (const s of STEPS) assert.ok(!/\b(never|always)\b/i.test(text(s)), `${s.spec ?? s.id}: ${text(s).match(/[^.]*\b(never|always)\b[^.]*/i)?.[0]}`);
});
test('the blow step names 42.5 mm (Greg 2026-11-08: both aftertouch and escapement pass only near it)', () => {
  assert.match(STEPS.find(s => s.spec === 'blow').what, /42\.5 mm/);
  assert.equal(SPEC.blow.target, 42.5);
});

// ---------- the spec rules (protocol 3.2) ----------
test('rule 2: each band holds its sources\' figures and the step\'s own instruction', () => {
  const ok = (id, v, extra = {}) => assert.ok(grade(id, { ...M0, ...extra, [id]: v }).ok, `${id} ${v.toFixed(3)} should pass`);
  ok('check', 0.5 * IN + 1e-9); ok('check', 0.625 * IN - 1e-9);       // Steinway 1/2, Spurlock 5/8
  ok('blow', 1.625 * IN); ok('blow', 1.6875 * IN); ok('blow', 42.5);  // Greg's window and target
  ok('aftertouch', 1.0); ok('aftertouch', 1.5);                       // Igrec
  ok('escapement', 0.0625 * IN); ok('escapement', 0.125 * IN);        // Spurlock
  ok('letoff', 0.125 * IN); ok('dip', 0.4 * IN);                      // the steps' own figures
  ok('damperTiming', 0.5); ok('softPedal', 0.5);                      // halfway
  ok('lostMotion', 0.08); ok('lostMotion', 0.1, { jackReturns: true }); // under 0.1 mm new (Igrec)
  // ...and the sources still pass at the top skill level (a source's range only widens with the level)
  for (const [id, v] of [['aftertouch', 1.0], ['aftertouch', 1.5], ['escapement', 0.0625 * IN], ['blow', 1.625 * IN], ['check', 0.5 * IN], ['check', 0.625 * IN]])
    assert.ok(grade(id, { ...M0, [id]: v }, 0.75).ok, `${id} ${v} at the top level`);
});
test('rule 3: the finest step of each knob a step turns moves that step\'s readings by under half the top level\'s band', () => {
  const half = id => { const s = SPEC[id]; return s.lo !== undefined ? (s.hi - s.lo) / 2 : s.tol * 0.75; };
  for (const s of GRADED) for (const k of s.knobs) for (const id of specsOf(s)) {
    if (id === 'bridle') continue;   // functional
    // a rail step is followed by resetting the lost motion, as the steps say (else the rail alone moves no aftertouch)
    const b = { ...FACTORY, [k]: FACTORY[k] + step(k) };
    if (k === 'railShim') b.capstan = capstanFor(b);
    const d = Math.abs(measure(b)[id] - M0[id]);
    assert.ok(d < half(id), `${k} one step (${step(k)}) moves ${id} by ${d.toFixed(3)}, half the band is ${half(id).toFixed(3)}`);
  }
});

// ---------- each claim the steps make about the model ----------
test('lost motion: the hammer follows a pulled rail, the key moves first, and the jack returns, by the gap', () => {
  assert.ok(M0.railFollow > 0.2 && M0.railFollow < 1.6, `rail follow ${M0.railFollow.toFixed(2)} mm at the crown (Steinway about 0.4, Spurlock about 1.6)`);
  assert.ok(M0.lostMotionKey > 0, 'the key moves before the hammer');
  const less = measure({ ...FACTORY, capstan: capstanFor(FACTORY, 0.04) }), none = measure({ ...FACTORY, capstan: capstanFor(FACTORY, -0.05) });
  assert.ok(less.railFollow < M0.railFollow && none.railFollow === 0, 'less lost motion, less follow; none, no follow');
  assert.equal(grade('lostMotion', less).ok, false, 'too little: the jack can\'t return');
  assert.match(grade('lostMotion', none).note, /holds the hammer off/);
  // the jack return test in the Sim: hard blow, sustain down, the key let up very slowly
  const ret = a => { const s = new Sim(a); s.setPedal(true); s.run(0.15); s.press(s.dip, 1300); s.run(0.35); s.press(0, 10); s.run(s.dip / 10 + 0.2); return s.jack === 'under'; };
  assert.equal(ret(FACTORY), true, 'factory: the jack gets back under');
  assert.equal(ret({ ...FACTORY, capstan: capstanFor(FACTORY, 0.04) }), false, '0.04 mm: it hangs on the butt leather');
});
test('lost motion: a capstan step moves the checking a lot (the note: set checking later)', () => {
  assert.ok(Math.abs(with_('capstan', step('capstan')).check - M0.check) > 0.3);
});
test('key height: the front moves about twice the punching; raised, the key dips deeper, checks closer, loses a little lost motion, escapes more', () => {
  const up = with_('balPunch', 0.1);
  const r = up.keyHeight / 0.1;
  assert.ok(r > 1.8 && r < 2.5, `front per punching ${r.toFixed(2)}`);
  assert.ok(up.dip > M0.dip && up.check < M0.check && up.lostMotion < M0.lostMotion && up.lostMotion > M0.lostMotion - 0.02 && up.escapement > M0.escapement);
});
test('dip: more dip gives more aftertouch and more escapement and checks closer', () => {
  const deeper = with_('frontPunch', -0.1);
  assert.ok(deeper.dip > M0.dip && deeper.aftertouch > M0.aftertouch && deeper.escapement > M0.escapement && deeper.check < M0.check);
});
test('aftertouch and escapement: a shorter blow raises both; with checking at 9/16 in both pass from about 42.35 to 42.6 mm', () => {
  const solveKnob = (a, k, read, target, lo, hi) => {
    const up = read({ ...a, [k]: hi }) > read({ ...a, [k]: lo });
    for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if ((read({ ...a, [k]: mid }) < target) === up) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  };
  // the rail set for this blow, the lost motion reset, the checking roughed in to 9/16 in, as the step says
  const at = (blow, check = true) => {
    const a = { ...FACTORY, railShim: solveKnob(FACTORY, 'railShim', b => measure(b).blow, blow, -3, 6) };
    a.capstan = capstanFor(a);
    if (check) a.backcheck = solveKnob(a, 'backcheck', b => measure(b).check ?? 99, SPEC.check.target, -15, 6);
    return measure(a);
  };
  const both = m => grade('aftertouch', m).ok && grade('escapement', m).ok;
  const s = at(42.3), lo = at(42.38), hi = at(42.56), l = at(42.66);
  assert.ok(s.aftertouch >= lo.aftertouch && lo.aftertouch > l.aftertouch && s.escapement > lo.escapement && lo.escapement > l.escapement, 'shorter blow, more of both');
  assert.equal(grade('escapement', s).ok, false, '42.3: the jack too far clear');
  assert.equal(grade('aftertouch', l).ok, false, '42.66: too little aftertouch');
  assert.ok(both(lo) && both(hi), '42.38 and 42.56: both in');
  // with the checking left where the rail put it, the window is narrower: why the step says to rough checking in first
  assert.equal(both(at(42.38, false)), false, '42.38 without the checking reset: out');
});
test('grading names the cause: no let-off for checking; the jack holding the hammer off its rail for the blow', () => {
  const noLetoff = measure({ ...FACTORY, letoff: -0.6 });
  assert.equal(noLetoff.letoff, null);
  assert.match(grade('check', noLetoff).note, /never lets off/);
  const high = measure({ ...FACTORY, capstan: FACTORY.capstan + 0.5 });   // the jack holds the hammer 41.2 mm out
  assert.ok(high.lostMotion <= 0);
  assert.match(grade('blow', high).note, /capstan down/);
});
test('aftertouch: too much jams the jack against its stop at the bottom (Igrec: jacks jam)', () => {
  const deep = measure({ ...FACTORY, frontPunch: FACTORY.frontPunch - 1.5 });
  assert.ok(deep.aftertouch > SPEC.aftertouch.hi, `aftertouch ${deep.aftertouch.toFixed(2)}`);
  assert.equal(deep.jammed, true, 'jammed');
  assert.equal(grade('aftertouch', deep).ok, false);
});
test('bridle: a strap tight enough for the soft pedal to lift the wippen fails, and the Sim\'s wippen does lift', () => {
  const tight = { ...FACTORY, bridle: 3 }, m = measure(tight);
  assert.ok(m.softLifts && !grade('bridle', m).ok && grade('bridle', M0).ok);
  const lift = a => { const s = new Sim(a), phi0 = s.phi; s.setSoft(true); s.run(0.3); return s.phi - phi0; };
  assert.ok(lift(tight) > 0.001, `tight strap: the wippen lifts ${lift(tight).toFixed(4)} rad`);
  assert.ok(Math.abs(lift(FACTORY)) < 1e-6, 'factory: it stays on its capstan');
});
test('soft pedal: about 3 mm of lost motion opens at the jack', () => {
  // the jack's gap to the cushion with the soft pedal down (kinematics rows 25-26 check it grows)
  const a = { ...FACTORY, railShim: FACTORY.railShim + FACTORY.softFelt * 1 }, gap = measure(a).lostMotion;
  assert.ok(gap > 2 && gap < 4, `${gap.toFixed(2)} mm`);
});
test('sustain: the pedal lifts the damper felt about 2.6 mm, the spoon about 3.4 at the bottom of the key', () => {
  const r = Math.hypot(TRACE.damperFelts[0][2][0] - CENTER.damper[0], TRACE.damperFelts[0][2][1] - CENTER.damper[1]);
  assert.ok(Math.abs(DAMPER_PEDAL_LIFT * r - 2.6) < 0.1, `pedal ${(DAMPER_PEDAL_LIFT * r).toFixed(2)}`);
  assert.ok(Math.abs(M0.damperLift - 3.4) < 0.1, `spoon ${M0.damperLift.toFixed(2)}`);
});

// ---------- readings, callouts, the de-regulated start ----------
test('band text gives each graded spec\'s band, in mm and inches where it has numbers', () => {
  assert.match(bandText('check'), /12\.70-15\.88 mm \(1\/2" to 5\/8"\)/);
  assert.match(bandText('blow'), /41\.28-42\.86 mm \(1-5\/8" to 1-11\/16"\)/);
  assert.match(bandText('aftertouch'), /1\.00-1\.50 mm \(\.039-\.059"\)/);
  assert.match(bandText('dip'), /\(25\/64" to 13\/32"\)/);        // fractions inside the band, not past it
  assert.match(bandText('escapement'), /1\.59-3\.18 mm \(1\/16" to 1\/8"\)/);
  for (const s of GRADED) for (const id of specsOf(s)) { assert.ok(bandText(id)); assert.ok(readingText(id, M0)); }
});
test('callouts: the blow at rest, checking and the jack held, from the Sim\'s pose', () => {
  const all = () => true, s = new Sim(FACTORY);
  const rest = callouts({ a: FACTORY, m: M0, p: s.pose(), events: [], shown: all });
  assert.ok(rest.some(c => c.id === 'blow' && /42\.5/.test(c.text)) && rest.some(c => c.id === 'keyHeight'));
  s.press(s.dip, 450); s.run(0.4);
  const held = callouts({ a: FACTORY, m: M0, p: s.pose(), events: s.events, shown: all });
  const ids = held.map(c => c.id);
  assert.ok(ids.includes('check') && ids.includes('escape') && ids.includes('dip'), ids.join(', '));
  for (const c of held) assert.ok(c.from.every(Number.isFinite) && c.to.every(Number.isFinite), c.id);
});
test('the de-regulated start: out of spec but short of blocking, missing, scraping, jamming or a taut strap at rest', () => {
  const rng = seeded(7);
  let out = 0;
  for (let i = 0; i < 30; i++) {
    const a = deregulated(rng), m = measure(a);
    assert.ok(m.letoff != null && m.check != null && !m.checkScrapes && !m.jammed && m.strapSlack > 0 && m.damperTiming != null);
    for (const d of ADJ) assert.ok(a[d.id] >= d.min - 1e-9 && a[d.id] <= d.max + 1e-9, `${d.id} in range`);
    out += GRADED.flatMap(specsOf).filter(id => !grade(id, m).ok).length;
  }
  assert.ok(out / 30 > 4, `${(out / 30).toFixed(1)} specs out per key on average`);
});
