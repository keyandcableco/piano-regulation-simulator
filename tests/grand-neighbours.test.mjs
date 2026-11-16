// Find the fault beside its neighbours (app.js seatNeighbors, GT-24): the four neighbours dealt round a customer's key
// (five keys, white black white black white: keyrow.js ROWS.five, Greg 2026-11-16) are a reference worth comparing
// against. Each is the regulated key of its kind, sharp or natural, on the customer's rails and pedal and as worn as it
// is, so for every case it reads in spec wherever the fault is the customer's key's own, and out only where the fault is
// in something they share (the pedal, the wear of one piano). The customer is dealt on the five's rails, set on the sharps.
// node --test tests/grand-neighbours.test.mjs   (Node 22; about half a minute)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ADJ, SPEC, FACTORY, measure, grade, sharpFactory } from '../model.js';

const src = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const i0 = src.indexOf('const SCENARIOS = ['), i1 = src.indexOf('\n];', i0);
const SCENARIOS = new Function(`return ${src.slice(i0 + 'const SCENARIOS = '.length, i1 + 2)}`)();
const SHARED = ['restRail', ...ADJ.filter(d => d.shared).map(d => d.id)];
const out = (a, k = 1) => Object.keys(SPEC).filter(id => !grade(id, measure(a), k).ok);
// as app.js deals them: newScenario() for the customer's key, seatNeighbors() for the other four
const SF = sharpFactory(), RAILS = Object.fromEntries(SHARED.map(k => [k, SF[k]])), BASE = { ...FACTORY, ...RAILS };
const customer = sc => { const a = { ...BASE }; for (const [k, v] of Object.entries(sc.faults)) a[k] = typeof v === 'string' ? v : (a[k] || 0) + v; return a; };
const neighbour = (a0, base) => ({ ...base, wear: a0.wear || 0, ...Object.fromEntries(SHARED.map(k => [k, a0[k]])) });

test('the app deals the neighbours this way, and only the customer\'s key can be turned or checked', () => {
  assert.match(src, /if \(on\) for \(const i of row\(\)\.order\) if \(i !== 0\) putNote\(NOTES\[i\], \{ \.\.\.rowFactory\(i\), wear: a0\.wear \|\| 0, \.\.\.sharedOf\(a0\) \}\);/);
  assert.match(src, /const rowFactory = \(i, name = rowName\(\)\) => \(\{ \.\.\.factoryOf\(i, name\), \.\.\.railsOf\(name\) \}\);/);
  assert.match(src, /const railsOf = \(name = rowName\(\)\) => sharedOf\(ROWS\[name === 'one' && mode === 'diagnose' \? 'five' : name\]\.hasSharp \? sharpFactory\(\) : FACTORY\);/);
  assert.match(src, /adj = rowFactory\(0, 'five'\);/);
  assert.match(src, /const sharedOf = a => Object\.fromEntries\(\[\.\.\.SHARED\]\.map\(k => \[k, a\[k\]\]\)\);/);
  assert.match(src, /const SHARED = new Set\(\['restRail', \.\.\.ADJ\.filter\(d => d\.shared\)\.map\(d => d\.id\)\]\);/);
  assert.match(src, /function setAdj\(id, v\) \{\n  if \(neighborsOn\(\) && cur !== 0\) \{ toast\(/);
  assert.match(src, /function checkWork\(\) \{\n  if \(neighborsOn\(\) && cur !== 0\) \{ selectNote\(0\);/);
  assert.match(src, /applyAdj\(\);\n  seatNeighbors\(\);/);
  assert.deepEqual(SHARED, ['restRail', 'damperStop', 'pedalLift']);
});

test('the customer\'s key, regulated on the five\'s rails, passes every check', () => {
  assert.deepEqual(out(BASE), []);
});

test('for every customer, the neighbours are regulated wherever the fault is the key\'s own', { timeout: 300000 }, () => {
  let own = 0, sharedCases = 0;
  for (const sc of SCENARIOS) {
    const a0 = customer(sc), bad0 = out(a0);
    assert.ok(bad0.length, `${JSON.stringify(sc.faults)}: the customer's key is out of spec`);
    const inShared = Object.keys(sc.faults).some(k => SHARED.includes(k) || k === 'wear');
    if (!inShared) own++; else sharedCases++;
    for (const [kind, base] of [['natural', BASE], ['sharp', { ...SF, ...RAILS }]]) {
      const nb = neighbour(a0, base), badN = out(nb);
      if (!inShared) {
        assert.deepEqual(badN, [], `${JSON.stringify(sc.faults)}: the ${kind} neighbour reads in spec`);
        assert.deepEqual({ ...nb, wear: 0 }, { ...base, wear: 0 });
      } else {
        // one pedal, one piano's wear: the neighbours have it too, and show the same readings out. (A sharp's pedal lift
        // sits near the low edge of its band on the rails it shares, model.js FACTORY_SHARP: worn, it goes out too.)
        const also = kind === 'sharp' && 'wear' in sc.faults ? ['pedalLift'] : [];
        assert.ok(badN.length && badN.every(id => bad0.includes(id) || also.includes(id)), `${JSON.stringify(sc.faults)}: ${kind} neighbour out in ${badN}, customer in ${bad0}`);
      }
    }
  }
  assert.ok(own >= 30 && sharedCases >= 2 && sharedCases <= 3, `${own} cases of the key's own, ${sharedCases} shared`);
});
