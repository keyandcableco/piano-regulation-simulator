// The grand in motion, as numbers: the factory key and every Find-the-fault case (SCENARIOS in app.js) played through
// the same key programs, with the times of the events and the hammer's speeds. Run before and after a change to the
// time-stepped Sim and compared (tests/physics-compare.mjs writes tests/physics-before-after.md).
//   node tests/physics-battery.mjs <out.json> [path/to/model.js]
// Programs every Sim can play (the key moved at a set speed, as the Sim was first built): the key down at 60, 250 and
// 600 mm/s, held until 0.5 s, then let up; and a slow press at 6 mm/s. A Sim with a finger force (push) also plays
// pp, mf, ff and staccato blows, a weight left on the key, and a repeated blow.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const [out, modelPath = path.join(here, '..', 'model.js')] = process.argv.slice(2);
if (!out) { console.error('usage: node tests/physics-battery.mjs <out.json> [model.js]'); process.exit(2); }
const M = await import(pathToFileURL(path.resolve(modelPath)).href);
const { FACTORY, Sim, G, crownY } = M;

// the fault cases, read out of app.js (it needs a browser to import)
export function scenarios(appPath = path.join(here, '..', 'app.js')) {
  const src = fs.readFileSync(appPath, 'utf8');
  const a = src.indexOf('const SCENARIOS = ['), b = src.indexOf('\n];', a);
  return new Function(`return ${src.slice(a + 'const SCENARIOS = '.length, b + 2)}`)();
}
export const withFaults = f => { const a = { ...FACTORY }; for (const [k, v] of Object.entries(f)) a[k] = typeof v === 'string' ? v : (a[k] || 0) + v; return a; };
const label = f => Object.entries(f).map(([k, v]) => typeof v === 'string' ? `${k} ${v}` : `${k} ${v > 0 ? '+' : ''}${v}`).join(', ');

const DT = 0.0002, r3 = x => x == null ? null : Math.round(x * 1000) / 1000;
// play a program: prog is a list of [t, fn(sim)]; returns the events with their times and a summary
function play(adj, prog, T) {
  const s = new Sim(adj), ev = [];
  let pi = 0, upAt = null, releasedAt = null, homeAt = null, maxD = 0;
  const g0 = s.g;
  for (let i = 0, n = Math.round(T / DT); i < n; i++) {
    const t = i * DT;
    while (pi < prog.length && t >= prog[pi][0] - 1e-12) { const r = prog[pi][1](s); if (r === 'release') releasedAt = t; pi++; }
    s.events.length = 0;
    s.step(DT);
    maxD = Math.max(maxD, s.d);
    for (const e of s.events) ev.push({ t: r3(t + DT), type: e.type, d: r3(e.d), v: r3(e.v), dist: r3(e.dist), lever: e.lever });
    if (releasedAt !== null && upAt === null && s.d <= 0.05) upAt = t + DT;
    if (releasedAt !== null && homeAt === null && upAt !== null && Math.abs(s.g - g0) < 2e-4 && Math.abs(s.w) < 1e-3) homeAt = t + DT;
  }
  const first = type => ev.find(e => e.type === type);
  const strikes = ev.filter(e => e.type === 'strike');
  const quiet = new Set(['tender', 'dropscrew', 'damperup', 'seated', 'damperstop']);
  return {
    order: ev.filter(e => !quiet.has(e.type)).map(e => e.type).join(' '),
    strikes: strikes.map(e => e.v), tStrike: first('strike')?.t ?? null,
    letoff: first('letoff')?.dist ?? null, tLetoff: first('letoff')?.t ?? null,
    check: first('checked')?.dist ?? null, tCheck: first('checked')?.t ?? null,
    resetUp: first('reset') ? r3(1 - first('reset').d / s.dip) : null,
    maxD: r3(maxD), dip: r3(s.dip),
    keyUpMs: upAt === null || releasedAt === null ? null : Math.round(1000 * (upAt - releasedAt)),
    homeMs: homeAt === null || releasedAt === null ? null : Math.round(1000 * (homeAt - releasedAt)),
    endDist: r3(G.stringY - crownY(s.g)), endD: r3(s.d),
  };
}
const letUp = s => { s.release ? s.release() : s.press(0, 60); return 'release'; };
const PROGRAMS = {
  slow6: { T: 2.2, prog: [[0, s => s.press(s.dip, 6)]] },
  set60: { T: 1.0, prog: [[0, s => s.press(s.dip, 60)], [0.5, letUp]] },
  set250: { T: 1.0, prog: [[0, s => s.press(s.dip, 250)], [0.5, letUp]] },
  set600: { T: 1.0, prog: [[0, s => s.press(s.dip, 600)], [0.5, letUp]] },
};
if (Sim.prototype.push) {
  for (const b of ['pp', 'mf', 'ff']) PROGRAMS[b] = { T: 1.0, prog: [[0, s => s.blow(b)], [0.5, letUp]] };
  PROGRAMS.staccato = { T: 0.6, prog: [[0, s => { s.blow('staccato'); return 'release'; }]] };
}

const cases = [{ name: 'factory', adj: { ...FACTORY } }, ...scenarios().map(sc => ({ name: label(sc.faults), complaint: sc.complaint, adj: withFaults(sc.faults) }))];
const result = { model: path.resolve(modelPath), dt: DT, programs: Object.keys(PROGRAMS), cases: [] };
for (const c of cases) {
  const row = { name: c.name, complaint: c.complaint, runs: {} };
  for (const [id, p] of Object.entries(PROGRAMS)) row.runs[id] = play(c.adj, p.prog, p.T);
  if (M.touch) { const t = M.touch(c.adj); row.touch = { down: r3(t.down), up: r3(t.up), peak: r3(t.peak) }; }
  if (M.repeatCeiling) row.repeat = M.repeatCeiling(c.adj);
  result.cases.push(row);
  console.error(c.name);
}
fs.writeFileSync(out, JSON.stringify(result, null, 1));
console.log(`wrote ${out}: ${result.cases.length} cases x ${result.programs.length} programs`);
