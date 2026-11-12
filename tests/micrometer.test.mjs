// The micrometer at the repin bench (micrometer.js): readings, typed calls, how a call is judged, and the pin picked.
import test from 'node:test';
import assert from 'node:assert/strict';
import { PITCH, PIN_SIZES, OLD_PINS, oldPin, sizeIndex, micParts, inch, thou, parseMic, judgeMic, pickPin } from '../micrometer.js';

test('the chart is Steve\'s Piano Service\'s: half sizes a thousandth apart up to 23, in order', () => {
  assert.equal(PIN_SIZES.length, 16);
  assert.deepEqual(PIN_SIZES.find(p => p.size === '20'), { size: '20', d: 0.05 });
  assert.equal(PIN_SIZES.find(p => p.size === '23-1/2').d, 0.0575);
  for (let i = 1; i < PIN_SIZES.length; i++) assert.ok(PIN_SIZES[i].d > PIN_SIZES[i - 1].d);
  for (let i = 1; i <= PIN_SIZES.findIndex(p => p.size === '23'); i++) assert.ok(Math.abs(PIN_SIZES[i].d - PIN_SIZES[i - 1].d - 0.001) < 1e-9);
});

test('a reading splits into the sleeve\'s numbered line, its .025" lines and the thimble line', () => {
  assert.deepEqual(micParts(0.226), { numbered: 2, lines: 1, thimble: 1, total: 0.226 });   // PGI's worked example
  assert.deepEqual(micParts(0.051), { numbered: 0, lines: 2, thimble: 1, total: 0.051 });
  assert.deepEqual(micParts(0.049), { numbered: 0, lines: 1, thimble: 24, total: 0.049 });
  assert.deepEqual(micParts(0.0503), { numbered: 0, lines: 2, thimble: 0, total: 0.05 });   // a hair past a line: that line
  assert.equal(micParts(0).total, 0);
});

test('every old pin reads its own size on the nearest thimble line, never a line short of a turn', () => {
  let r = 0;
  const rand = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  for (let k = 0; k < 500; k++) {
    const p = oldPin(rand);
    assert.ok(OLD_PINS.includes(PIN_SIZES[p.i].size));
    assert.ok(p.d >= PIN_SIZES[p.i].d && p.d < PIN_SIZES[p.i].d + 0.0004);
    assert.equal(micParts(p.d).total, PIN_SIZES[p.i].d);
    assert.equal(sizeIndex(p.d), p.i);
  }
});

test('readings are written and said as a technician would', () => {
  assert.equal(inch(0.05), '.050"');
  assert.equal(inch(0.0575), '.0575"');
  assert.equal(inch(0.226), '.226"');
  assert.equal(thou(0.051), '51 thousandths');
});

test('a typed call: decimals are inches, whole numbers thousandths, millimetres only with their unit', () => {
  assert.deepEqual(parseMic('.050'), { v: 0.05, as: 'in' });
  assert.deepEqual(parseMic('0.051"'), { v: 0.051, as: 'in' });
  assert.deepEqual(parseMic('50'), { v: 0.05, as: 'thou' });
  assert.deepEqual(parseMic('51 thou'), { v: 0.051, as: 'thou' });
  assert.ok(Math.abs(parseMic('1.27 mm').v - 0.05) < 1e-9);
  assert.equal(parseMic('1.27 mm').as, 'mm');
  assert.equal(parseMic(''), null);
  assert.equal(parseMic('abc'), null);
  assert.equal(parseMic('1/2'), null);
  assert.equal(parseMic('2000'), null);   // more than an inch
});

test('a call is judged against what the micrometer shows, and a miss says why', () => {
  assert.equal(judgeMic(0.05, 0.0502).ok, true);
  assert.equal(judgeMic(0.051, 0.0502).ok, false);
  assert.deepEqual(judgeMic(0.025, 0.05), { ok: false, off: 0.025 - 0.05, why: 'turn', turns: -1 });   // one sleeve line short
  assert.equal(judgeMic(0.074, 0.049).why, 'turn');
  assert.equal(judgeMic(0.15, 0.05).why, 'tenth');
  assert.equal(judgeMic(0.5, 0.05).why, 'decimal');
  assert.equal(judgeMic(0.005, 0.05).why, 'decimal');
  const t = judgeMic(0.048, 0.051);
  assert.equal(t.why, 'thimble'); assert.equal(t.lines, -3);
  assert.equal(judgeMic(0.4, 0.05).why, 'far');
});

test('the new pin: a loose center goes up a half size, a tight one keeps its size', () => {
  const i = PIN_SIZES.findIndex(p => p.size === '20');
  assert.equal(pickPin('loose', i, i + 1).ok, true);
  assert.equal(pickPin('loose', i, i).ok, false);
  assert.equal(pickPin('loose', i, i - 1).ok, false);
  assert.equal(pickPin('loose', i, i + 2).ok, false);
  assert.equal(pickPin('tight', i, i).ok, true);
  assert.equal(pickPin('tight', i, i - 1).ok, false);
  assert.equal(pickPin('tight', i, i + 1).ok, false);
  assert.match(pickPin('loose', i, i + 1).text, /20-1\/2.*\.051"/);
});

test('one turn of the thimble is .025": 40 threads to the inch', () => assert.equal(PITCH, 1 / 40));
