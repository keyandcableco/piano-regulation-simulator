// The figures typed into the grand's Find-the-fault answers, the dip step and the Touch menu, each worked out again
// from the model: a later change to the physics that leaves one of them wrong fails here. Each check first makes sure
// the words are still in app.js (or index.html), so a reworded answer has to bring its check along.
// node --test tests/grand-answers.test.mjs   (Node 22; about a minute)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { G, FACTORY, Sim, BLOWS, CENTERS, CENTER_FAULTS, crownY, measure, measureCenters, touch, dipAt, dipOf, keyReturn, repeatCeiling } from '../model.js';

const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8'), page = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const says = (words, src = app) => assert.ok(src.includes(words), `the text no longer says "${words}": update this check with it`);
const at = (f = {}) => { const a = { ...FACTORY }; for (const [k, v] of Object.entries(f)) a[k] = typeof v === 'string' ? v : (a[k] || 0) + v; return a; };
const within = (v, lo, hi, what) => assert.ok(v >= lo && v <= hi, `${what}: ${typeof v === 'number' ? v.toFixed(2) : v}, expected ${lo} to ${hi}`);
// the first strike of a blow (m/s; 0: none), and everything that happened
function blow(adj, b, T = 0.9) {
  const s = new Sim(adj), ev = [];
  typeof b === 'number' ? s.push(b) : s.blow(b);
  for (let i = 0; i < Math.round(T / 0.01); i++) { if (i === 50) s.release(); s.events.length = 0; s.step(0.01); ev.push(...s.events); }
  return { v: ev.find(e => e.type === 'strike')?.v ?? 0, strikes: ev.filter(e => e.type === 'strike').length, types: ev.map(e => e.type) };
}
const T0 = touch(FACTORY), K0 = keyReturn(FACTORY), pp0 = blow(FACTORY, 'pp').v;

test('the Touch menu names the fingers the model plays with', () => {
  says(`a ${BLOWS.pp.F} g finger`, page); says(`a ${BLOWS.mf.F} g finger`, page); says(`a ${BLOWS.ff.F / 1000} kg finger`, page);
  says(`a ${BLOWS.pp.F} g finger`, 'x' + BLOWS.pp.say); says(`a ${BLOWS.ff.F / 1000} kg finger`, 'x' + BLOWS.ff.say);
});

test('dip step: 250 g adds about 0.1 mm and a kilogram 0.5', () => {
  says('250 g of pressure adds about 0.1 mm and a kilogram 0.5');
  within(dipAt(FACTORY, 250, T0) - dipOf(FACTORY), 0.08, 0.17, '250 g');
  within(dipAt(FACTORY, 1000, T0) - dipOf(FACTORY), 0.42, 0.58, '1 kg');
});

test('let-off too close: barely half a millimetre from the string', () => {
  says('barely half a millimetre from the string');
  within(measure(at({ letoff: 0.2 })).letoff, 0.4, 0.6, 'let-off');
});

test('let-off too far: 7 mm out, pp about a fifth slower, the softest touch silent, the key bottoms on the jack', () => {
  says('7 mm out'); says('about a fifth slower than a regulated key'); says('the softest touches don\\\'t reach the string'); says('the key bottoms on the jack');
  const a = at({ letoff: -1 });
  within(measure(a).letoff, 6.5, 7.5, 'let-off');
  within(1 - blow(a, 'pp').v / pp0, 0.14, 0.27, 'pp slower by');
  // the softest finger that sounds on the regulated key (found 2 g at a time) doesn't sound here
  let soft = 46; while (!blow(FACTORY, soft, 1.5).strikes) soft += 2;
  assert.equal(blow(a, soft, 1.5).strikes, 0, `a ${soft} g finger sounds at factory and not here`);
  const s = new Sim(a); s.blow('mf'); s.step(0.4);
  assert.ok(s.jammed && s.d < s.dip, 'the key stops on the jammed jack short of the punching');
});

test('deep dip: a soft blow touches the string a second time', () => {
  says('comes back off the lever and touches the string a second time');
  assert.ok(blow(at({ frontPunch: -0.8 }), 'pp').strikes >= 2);
  assert.equal(blow(FACTORY, 'pp').strikes, 1);
});

test('shallow dip (+1.9): soft and normal blows strike twice, a hard one once; no let-off on a slow press', () => {
  says('faults: { frontPunch: +1.9 }'); says('A hard blow squashes the front punching far enough to get the jack out');
  const a = at({ frontPunch: 1.9 });
  assert.equal(measure(a).letoff, null);
  assert.ok(blow(a, 'pp').strikes >= 2 && blow(a, 'mf').strikes >= 2);
  assert.equal(blow(a, 'ff').strikes, 1);
});

test('weak spring (-0.8): no repeat from a half release, it repeats let all the way up, slow key, smaller bump', { timeout: 300000 }, () => {
  says('faults: { repSpring: -0.8 }'); says('from a half release the note doesn\\\'t repeat at all, and the key has to come all the way up'); says('The key is slow coming back too'); says('the bump at let-off is smaller');
  const a = at({ repSpring: -0.8 });
  assert.equal(repeatCeiling(a), 0);
  assert.ok(repeatCeiling(a, { up: 1 }) >= 8);
  assert.ok(keyReturn(a).keyMs > 1.6 * K0.keyMs);
  assert.ok(touch(a).peak < T0.peak - 15);
});

test('strong spring (+0.7): pp strikes twice, ff jumps out of check, hardly repeats, 160 g against 140, hold half as much again', { timeout: 300000 }, () => {
  says('strikes twice, and a hard one (ff) jumps out of check and comes back to the string'); says('from a half release the key hardly repeats at all');
  says('about 160 g where its neighbors take 140'); says('holding the key down takes half as much again');
  const a = at({ repSpring: 0.7 }), t = touch(a), ff = blow(a, 'ff');
  assert.ok(blow(a, 'pp').strikes >= 2);
  assert.ok(ff.types.includes('jumpcheck') && ff.strikes >= 2, ff.types.join(' '));
  within(repeatCeiling(a), 0, 5, 'repeats to');
  within(t.peak, 150, 170, 'through let-off'); within(T0.peak, 130, 150, 'a regulated key\'s');
  within(t.bottom / T0.bottom, 1.35, 1.7, 'to hold the key down, against a regulated key');
});

test('capstan low: about half a millimetre of lost motion', () => {
  says('about half a millimetre before it lifts anything');
  within(measure(at({ capstan: -0.6 })).lostMotion, 0.35, 0.65, 'lost motion');
});

test('jack too far back: pp about a tenth weaker, about 3 g more downweight, the same upweight', () => {
  says('about a tenth weaker than its neighbors'); says('about 3 g more to go down while lifting the same weight back');
  const a = at({ jackScrew: -1.4 }), t = touch(a);
  within(1 - blow(a, 'pp').v / pp0, 0.06, 0.15, 'pp weaker by');
  within(t.down - T0.down, 2, 4.5, 'downweight more by');
  within(Math.abs(t.up - T0.up), 0, 1, 'upweight moved by');
});

test('early damper: about 11 g at the key, from 2 mm of travel where a regulated one comes in past 3.5', () => {
  says('about 11 g at the key'); says('comes in at 2 mm of key travel where its neighbors\\\' comes in past 3.5');
  const d = t => t.trace.find(r => r.damper > 0), early = d(touch(at({ damperGap: -1.5 })));
  within(early.damper, 9.5, 12.5, 'damper weight'); within(early.d, 1.7, 2.3, 'picked up at'); within(d(T0).d, 3.5, 3.9, 'regulated: picked up at');
});

test('tight hammer center: 3 half-swings, about 7 g; 2 to 3 g more down and less up, the balance unchanged', () => {
  says('only 3 half-swings, about 7 g on a gauge at 23 mm'); says('takes 2 to 3 g more to go down and lifts 2 to 3 g less than its neighbors, the balance weight unchanged');
  const a = at({ center: 'hammerTight' }), t = touch(a), c = measureCenters(a);
  assert.equal(c.swings, 3); within(c.hammerCenter, 6.5, 7.5, 'gauge');
  within(t.down - T0.down, 2, 3, 'down more by'); within(T0.up - t.up, 2, 3, 'up less by'); within(Math.abs(t.balance - T0.balance), 0, 0.5, 'balance moved by');
});

test('tight wippen center: nearly twice as long to come back; about 4 g more down and 4 g less up', () => {
  says('nearly twice as long to come back as a free one'); says('about 4 g more to go down and lifts 4 g less');
  const a = at({ center: 'wippenTight' }), t = touch(a);
  within(keyReturn(a).keyMs / K0.keyMs, 1.6, 2.1, 'key return against a free key');
  within(t.down - T0.down, 3, 5, 'down more by'); within(T0.up - t.up, 3, 5, 'up less by');
});

test('tight jack center: back under with the key about half way up, a free jack at four tenths', () => {
  says('about half way up, where a free jack is back at four tenths');
  within(keyReturn(at({ center: 'jackTight' })).resetUp, 0.45, 0.57, 'tight jack reset'); within(K0.resetUp, 0.36, 0.45, 'free jack reset');
});

test('tight lever center: 10 g at the drop screw; the hammer rises from check slower', () => {
  says('the lever gauges 10 g at the drop screw'); says('the hammer rises from check about a fifth slower');
  within(CENTER_FAULTS.repTight.T / CENTERS.rep.at, 9.5, 10.5, 'gauge');
  // the spring test's rise: strike, hold, ease the key up 1.2 mm, and time the hammer from check to within 3 mm of the string
  const rise = adj => { const s = new Sim(adj); s.blow('mf'); s.step(0.4); s.press(s.dip - 1.2, 10); let t = 0; while (G.stringY - crownY(s.g) > 3.5 && t < 2) { s.step(0.001); t += 0.001; } return t; };
  within(rise(at({ center: 'repTight' })) / rise(FACTORY), 1.1, 1.4, 'time to rise from check against a free lever');
});

test('tight balance bushing: about twice as long to come back up; about 12 g more down and 12 g less up', () => {
  says('about twice as long to come back up'); says('about 12 g more to go down and lifts 12 g less: all friction');
  const a = at({ bushing: 'balTight' }), t = touch(a);
  within(keyReturn(a).keyMs / K0.keyMs, 1.7, 2.3, 'key return against a free key');
  within(t.down - T0.down, 11, 13, 'down more by'); within(T0.up - t.up, 11, 13, 'up less by'); within(Math.abs(t.balance - T0.balance), 0, 0.5, 'balance moved by');
});

test('the weigh-off note and the Repeat line: 50 / 24 is a balance of 37 and friction of 13; 24 blows in 2.45 s is about 10 a second', () => {
  says('50 down, 24 up, so a balance weight of 37 and friction of 13'); says('24 blows in 2.45 s');
  assert.equal((50 + 24) / 2, 37); assert.equal((50 - 24) / 2, 13);
  within(T0.midDown, 38, 44, 'mid-stroke down'); within(T0.midUp, 18, 24, 'mid-stroke up');
  assert.ok(T0.down < 50 && T0.up < 20, 'the note says this key reads lighter than usual and its upweight low');
});
