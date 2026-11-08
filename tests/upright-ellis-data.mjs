// Writes data/upright-ellis.json for the upright's strap drill (upright-app.js): S15's four filmed returns from check
// (strap and butt spring each on or off, Jim Ellis's test) and the Sim's runs of the same, every 2 ms.
// node tests/upright-ellis-data.mjs
import fs from 'node:fs';
import { S15, CASES, runEllis } from './upright-s15.mjs';

const every = (xs, n) => xs.filter((_, i) => i % n === 0);
const out = { source: 'S15: high-speed video of an upright action model (PTG Education Hub), redoing Jim Ellis\'s bridle strap test (PTJ, Dec 1997)', cases: {} };
for (const key of Object.keys(CASES)) {
  const c = S15.cases[key], run = runEllis(key, { ms: 300 });
  out.cases[key] = { label: c.label, ...CASES[key], film: { t: c.t, deg: c.ham.map(v => +v.toFixed(2)) }, filmRailMs: c.railMs,
    sim: { t: every(run.t, 2), deg: every(run.g, 2).map(v => +v.toFixed(2)) }, simRailMs: run.railMs && +run.railMs.toFixed(1) };
  console.log(key, c.label, 'film', c.railMs, 'sim', run.railMs?.toFixed(1));
}
fs.writeFileSync(new URL('../data/upright-ellis.json', import.meta.url), JSON.stringify(out));
