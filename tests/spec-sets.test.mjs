// Maker spec sets (model.js SPEC_SETS, GS-09 / WCI-14): the generic set is the default and is left as it was; a maker's
// printed range passes at both its edges; a reading the maker prints no figure for keeps the generic band and says so;
// each set's stored regulation is what the set says it is; and the one set this action cannot meet says which reading.
// node --test tests/spec-sets.test.mjs   (Node 22; about half a minute)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IN, SPEC, SPEC_SETS, FACTORY, Sim, setSpecSet, specSet, specSource, measure, grade, band, dipOf } from '../model.js';

const LEVELS = [1.5, 1, 0.75];
const snap = () => JSON.stringify([SPEC, FACTORY]);
const GENERIC = snap();
const fails = (m, k) => Object.keys(SPEC).filter(id => !grade(id, m, k).ok);
const under = (id, f) => { setSpecSet(id); try { return f(); } finally { setSpecSet('generic'); } };
const m0 = measure(FACTORY);
const reads = (id, v, k) => grade(id, { ...m0, [id]: v }, k).ok;

test('the generic set is the default, and choosing a set and coming back leaves it exactly as it was', () => {
  assert.equal(specSet(), 'generic');
  assert.deepEqual(Object.keys(SPEC_SETS), ['generic', 'steinwayNY', 'hamburg', 'kawai']);
  for (const id of Object.keys(SPEC_SETS)) { setSpecSet(id); assert.equal(specSet(), id); setSpecSet('generic'); assert.equal(snap(), GENERIC, id); }
  assert.equal(setSpecSet('no such set'), 'generic');
  assert.equal(SPEC.blow.target, 1.75 * IN); assert.equal(SPEC.dip.target, IN * 3 / 8); assert.deepEqual(band('aftertouch'), [1.2, 2.2]);
});

test('every figure in a maker\'s set names its maker, and is a range with both edges or a figure with a tolerance', () => {
  for (const [id, set] of Object.entries(SPEC_SETS)) for (const [k, o] of Object.entries(set.over)) {
    assert.ok(k in SPEC, `${id}.${k} is a reading`);
    assert.ok(o.src.startsWith(set.maker + ':'), `${id}.${k}: "${o.src}"`);
    assert.ok(('lo' in o && 'hi' in o && o.lo < o.hi && o.target >= o.lo && o.target <= o.hi) !== ('tol' in o), `${id}.${k}`);
    if ('tol' in o) assert.match(o.src, /sim's own/, `${id}.${k}: a tolerance the maker doesn't print is the sim's own, and says so`);
  }
});

test('a maker\'s printed range passes at both its edges at every level, and fails outside it', () => {
  const edges = { steinwayNY: { letoff: [IN / 32, IN / 16], dip: [0.390 * IN, 0.420 * IN], aftertouch: [IN * 3 / 64, IN / 16] },
    hamburg: { blow: [45, 47] }, kawai: { letoff: [1, 1.5], drop: [1, 1.5], damperStop: [1, 2] } };
  for (const [set, e] of Object.entries(edges)) under(set, () => {
    for (const [id, [lo, hi]] of Object.entries(e)) {
      for (const k of LEVELS) for (const v of [lo, hi]) assert.ok(reads(id, v, k), `${set} ${id} at ${v}, level ${k}`);
      for (const k of [1, 0.75]) for (const v of [lo - 0.06, hi + 0.06]) assert.ok(!reads(id, v, k), `${set} ${id} at ${v}, level ${k}`);
    }
  });
  // single printed figures: Kawai's 46 mm blow and 10.1 mm dip pass, the generic 1 3/4 in and 3/8 in don't
  under('kawai', () => { assert.ok(reads('blow', 46, 0.75) && reads('dip', 10.1, 0.75)); assert.ok(!reads('blow', 1.75 * IN, 1) && !reads('dip', IN * 3 / 8, 1)); });
  under('hamburg', () => { assert.ok(reads('letoff', 1, 0.75) && reads('drop', 2, 0.75) && reads('check', 15, 0.75)); assert.ok(!reads('drop', IN / 16, 1)); });
  under('steinwayNY', () => assert.ok(reads('check', IN / 2, 0.75) && !reads('dip', IN * 3 / 8, 1.5)));
});

test('a reading the maker prints no figure for keeps the generic band, and its source says so', () => {
  const generic = Object.fromEntries(Object.keys(SPEC).map(id => [id, JSON.stringify(LEVELS.map(k => band(id, k)))]));
  assert.equal(specSource('aftertouch'), null);
  assert.match(specSource('check').text, /Igrec/);
  for (const [set, ids] of Object.entries({ hamburg: ['dip', 'aftertouch', 'wink', 'restGap'], kawai: ['aftertouch', 'wink', 'keyHeight'], steinwayNY: ['wink', 'restGap'] })) under(set, () => {
    for (const id of ids) {
      const s = specSource(id);
      assert.ok(s.fallback && s.text.includes(`${SPEC_SETS[set].maker} prints none`) && s.text.startsWith('generic'), `${set} ${id}: ${s.text}`);
      assert.equal(JSON.stringify(LEVELS.map(k => band(id, k))), generic[id], `${set} ${id}: the generic band`);
    }
    for (const id of Object.keys(SPEC_SETS[set].over)) assert.equal(specSource(id).fallback, false);
    assert.equal(specSource('hammerCenter'), null);   // a part's spec, not a regulation figure
    // a generic band that already names its makers keeps that source in the fallback line
    assert.match(specSource('damperTiming').text, /Steinway: between 1\/3 and 1\/2/);
  });
});

test('Kawai\'s and Hamburg\'s sets: the regulated key passes everything at every level and plays', () => {
  for (const set of ['kawai', 'hamburg']) under(set, () => {
    const m = measure(FACTORY);
    for (const k of LEVELS) assert.deepEqual(fails(m, k), [], `${set} at level ${k}`);
    assert.equal(SPEC_SETS[set].unmet, undefined);
    const s = new Sim({ ...FACTORY }); let strikes = 0;
    s.blow('mf'); for (let i = 0; i < 90; i++) { if (i === 50) s.release(); s.events.length = 0; s.step(0.01); strikes += s.events.filter(e => e.type === 'strike').length; }
    assert.equal(strikes, 1, `${set}: one strike at mf`);
  });
  under('kawai', () => { const m = measure(FACTORY); assert.ok(Math.abs(m.blow - 46) < 0.01 && Math.abs(m.dip - 10.1) < 0.01 && Math.abs(m.restGap - 5) < 0.01); assert.match(SPEC_SETS.kawai.fit, /1\.83 mm/); assert.ok(Math.abs(m.aftertouch - 1.83) < 0.02); });
  under('hamburg', () => { const m = measure(FACTORY); assert.ok(Math.abs(m.blow - 45.5) < 0.01 && Math.abs(m.dip - 9.75) < 0.01 && Math.abs(m.drop - 2) < 0.01); assert.match(SPEC_SETS.hamburg.fit, /leaves 1\.52/); assert.ok(Math.abs(m.aftertouch - 1.52) < 0.02); });
});

test('Steinway\'s set: this action cannot meet it, and the set says so rather than the model being bent', { timeout: 300000 }, () => under('steinwayNY', () => {
  // regulated to the printed figures, only aftertouch is out, at every level
  const m = measure(FACTORY);
  for (const k of LEVELS) assert.deepEqual(fails(m, k), ['aftertouch'], `level ${k}`);
  assert.deepEqual(SPEC_SETS.steinwayNY.unmet, ['aftertouch']);
  assert.ok(Math.abs(m.blow - 1.75 * IN) < 0.01 && Math.abs(m.dip - 0.4 * IN) < 0.01 && Math.abs(m.aftertouch - 2.16) < 0.02, `aftertouch ${m.aftertouch}`);
  assert.match(SPEC_SETS.steinwayNY.fit, /cannot meet this set/); assert.match(SPEC_SETS.steinwayNY.fit, /about 2\.2 mm/); assert.match(SPEC_SETS.steinwayNY.fit, /still 1\.69 mm/);
  // with blow at its long edge, let-off at its close edge and dip at its shallow edge (everything that shortens
  // aftertouch), it is still over Steinway's 1/16 in
  const a = { ...FACTORY }, bis = (id, f, target, lo, hi) => { for (let i = 0; i < 22; i++) { a[id] = (lo + hi) / 2; if (f() < target) lo = a[id]; else hi = a[id]; } };
  bis('capstan', () => -measure(a).blow, -band('blow')[1], 12, 15);
  bis('frontPunch', () => -dipOf(a), -band('dip')[0], 0, 4);
  bis('letoff', () => -(measure(a).letoff ?? 0), -(band('letoff')[0] + 0.005), 94, 98);
  const e = measure(a);
  assert.ok(grade('blow', e).ok && grade('dip', e).ok && grade('letoff', e).ok, `at the edges: blow ${e.blow}, dip ${e.dip}, let-off ${e.letoff}`);
  assert.ok(!grade('aftertouch', e).ok && e.aftertouch > IN / 16 && e.aftertouch < 1.75, `aftertouch at the edges ${e.aftertouch}`);
  // the action's ratio is the reason: about 5.4 hammer to key up to let-off, where Steinway's figures imply about 4.9
  const implied = (1.75 * IN - IN * 3 / 64) / (0.4 * IN - IN * 7 / 128);
  assert.ok(Math.abs(implied - 4.93) < 0.05 && Math.abs((m.blow - m.letoff) / (m.dip - m.aftertouch) - 5.36) < 0.08);
}));
