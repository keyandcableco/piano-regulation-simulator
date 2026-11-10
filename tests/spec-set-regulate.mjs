// Regulates the grand's geometry to a maker's spec set (model.js SPEC_SETS) with factory(), which solves every knob
// to SPEC's targets, and prints the knob values (SPEC_SETS[id].reg) with what is still out of the set afterwards.
// node tests/spec-set-regulate.mjs <set> [reading=aim ...]     e.g.  node tests/spec-set-regulate.mjs hamburg blow=45.3
// An aim moves where inside a printed range the regulation goes (SPEC_SETS[id].aim). Takes a few minutes a set.
import { SPEC, SPEC_SETS, setSpecSet, factory, measure, grade, band } from '../model.js';

const [id, ...aims] = process.argv.slice(2);
if (!SPEC_SETS[id]) { console.error(`sets: ${Object.keys(SPEC_SETS).join(', ')}`); process.exit(2); }
setSpecSet(id);
const aim = { ...(SPEC_SETS[id].aim || {}), ...Object.fromEntries(aims.map(s => s.split('=')).map(([k, v]) => [k, +v])) };
const printed = {};
for (const [k, v] of Object.entries(aim)) { printed[k] = SPEC[k]; SPEC[k] = { ...SPEC[k], target: v }; }
const a = factory();
for (const k of Object.keys(printed)) SPEC[k] = printed[k];
const m = measure(a), r = v => Math.round(v * 1e4) / 1e4;
console.log(JSON.stringify(Object.fromEntries(Object.entries(a).map(([k, v]) => [k, r(v)]))));
for (const k of ['blow', 'restGap', 'letoff', 'drop', 'dip', 'aftertouch', 'check', 'wink', 'spring', 'damperTiming', 'damperStop', 'pedalLift'])
  console.log(k.padEnd(13), String(r(m[k])).padEnd(9), 'band', band(k).map(r).join(' to '), [1.5, 1, 0.75].map(f => grade(k, m, f).ok ? 'pass' : 'FAIL').join(' / '));
for (const f of [1.5, 1, 0.75]) console.log(`level ${f}: out`, Object.keys(SPEC).filter(k => !grade(k, m, f).ok).join(', ') || 'nothing');
