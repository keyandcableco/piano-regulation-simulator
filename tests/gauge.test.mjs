// The rule laid on the action (gauge.js, WCI-05 / BE-13): how it is graduated, how a typed reading is understood, and
// how a call is compared with the model's figure. The laying and the asking are in app.js (tests/batch3-measure-check.cjs).
// node --test tests/gauge.test.mjs   (Node 22; under a second)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GAUGES, GAUGED, graduation, ruleTicks, parseReading, judgeReading } from '../gauge.js';
import { SPEC, FACTORY, measure } from '../model.js';

const IN = 25.4, near = (a, b, e = 1e-9) => a !== null && Math.abs(a - b) < e;

test('the five readings a rule takes: blow, let-off, drop, dip and aftertouch, each on a test the app has', () => {
  assert.deepEqual(GAUGED, ['blow', 'letoff', 'drop', 'dip', 'aftertouch']);
  const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8'), m = measure(FACTORY);
  for (const [id, g] of Object.entries(GAUGES)) {
    assert.ok(id in SPEC && typeof m[id] === 'number', `${id} is a reading of the model`);
    assert.ok(new RegExp(`\\b${g.test}: \\{ label: [^\\n]*specs: \\[[^\\]]*'${id}'`).test(app), `${id}: the ${g.test} test reads it`);
    assert.ok(g.length > m[id] * 1.25 && /\?$/.test(g.ask) && g.from, `${id}: the rule is long enough for it, and the card asks a question`);
  }
});

test('the rule is graduated in 64ths of an inch, or half millimetres', () => {
  assert.equal(graduation('in'), IN / 64); assert.equal(graduation('mm'), 0.5);
  const inch = ruleTicks('in', 2.25 * IN), at = n => inch.find(t => near(t.at, n * IN / 64));
  assert.equal(inch.length, 145); assert.equal(inch[0].at, 0);
  for (let i = 1; i < inch.length; i++) assert.ok(near(inch[i].at - inch[i - 1].at, IN / 64, 1e-9));
  // longer lines at each coarser division, and the eighths numbered as a rule numbers them
  assert.ok(at(1).rank < at(2).rank && at(2).rank < at(4).rank && at(4).rank < at(8).rank && at(8).rank < at(16).rank && at(16).rank < at(32).rank && at(32).rank < at(64).rank);
  assert.deepEqual([8, 16, 24, 32, 64, 72, 112, 128].map(n => at(n).label), ['1/8', '1/4', '3/8', '1/2', '1', '1 1/8', '1 3/4', '2']);
  assert.ok([1, 2, 3, 4, 5, 6, 7, 9, 12].every(n => at(n).label === null) && at(0).label === null);
  const mm = ruleTicks('mm', 19.05);
  assert.equal(mm.length, 39); assert.ok(mm.every((t, i) => near(t.at, i * 0.5)));
  assert.deepEqual(mm.filter(t => t.label).map(t => t.label), ['5', '10', '15']);
  assert.ok(mm[1].rank < mm[2].rank && mm[2].rank < mm[10].rank && mm[10].rank < mm[20].rank);
  assert.deepEqual(ruleTicks('mm', 57.15).filter(t => t.label).map(t => t.label), ['5', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']);
});

test('a reading typed as a technician says it is understood', () => {
  for (const [txt, inches] of [['1 3/4', 1.75], ['1-3/4', 1.75], ['1 3/4"', 1.75], ['3/64', 3 / 64], [' 1/16 in ', 1 / 16], ['.4', 0.4], ['0.390', 0.39], ['1.75', 1.75], ['2', 2], ['1/16 inch', 1 / 16], ['0', 0]])
    assert.ok(near(parseReading(txt, 'in'), inches * IN, 1e-9), `"${txt}" in inches: ${parseReading(txt, 'in')}`);
  for (const [txt, mm] of [['1.6', 1.6], ['1,6', 1.6], ['44.5 mm', 44.5], ['10', 10], ['9.5mm', 9.5], ['2 millimetres', 2]])
    assert.ok(near(parseReading(txt, 'mm'), mm, 1e-9), `"${txt}" in mm: ${parseReading(txt, 'mm')}`);
  // a unit typed after it is taken at its word, whichever units are showing
  assert.ok(near(parseReading('44.5 mm', 'in'), 44.5) && near(parseReading('1 3/4"', 'mm'), 1.75 * IN) && near(parseReading('1/16 in', 'mm'), IN / 16));
  for (const junk of ['', '   ', 'about a sixteenth', '1/0', '-1', '1 3', '3/', 'mm', '1..2', '12 feet', '900'])
    assert.equal(parseReading(junk, 'in'), null, `"${junk}"`);
  assert.equal(parseReading('7', 'in'), null);   // seven inches: not on this rule
  assert.equal(parseReading(undefined), null);
});

test('a call is compared with the model\'s figure in graduations of the rule it was read from', () => {
  const m = measure(FACTORY);
  let j = judgeReading(parseReading('1 3/4', 'in'), m.blow, 'in');
  assert.ok(j.close && Math.abs(j.off) < 0.01);
  j = judgeReading(parseReading('1 23/32', 'in'), m.blow, 'in');
  assert.ok(!j.close && j.off < 0 && j.grads === 2, JSON.stringify(j));
  j = judgeReading(parseReading('5/64', 'in'), m.letoff, 'in');   // one line over 1/16 in
  assert.ok(j.close && j.off > 0 && j.grads === 1, JSON.stringify(j));
  j = judgeReading(parseReading('3/32', 'in'), m.letoff, 'in');
  assert.ok(!j.close && j.grads === 2);
  // the same call is judged against the millimetre rule's half millimetre when that is the rule showing
  assert.ok(judgeReading(10, m.dip, 'mm').close && !judgeReading(10.2, m.dip, 'mm').close && judgeReading(10.2, m.dip, 'mm').off > 0);
  assert.ok(judgeReading(1.2, m.aftertouch, 'mm').close && !judgeReading(0.9, m.aftertouch, 'mm').close);
});

test('the app keeps the number back until it is called, and still offers it', () => {
  const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(app, /if \(gaugeNow\?\.hide\.has\(id\)\) return false;/);
  assert.match(app, /if \(gaugeMode && Object\.hasOwn\(GAUGES, id\)\) return tested\.has\(id\)/);
  assert.match(app, /'Show me the number'/);
  assert.match(app, /let gaugeMode = false;/);   // off unless the student turns it on: the tests print the number as before
});
