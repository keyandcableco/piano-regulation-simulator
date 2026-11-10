// The S15 Ellis test, reproduced on the upright model: the key held down after a blow (hammer in check), then let up
// quickly as filmed, strap and butt spring each on or off. Shared by tests/upright-dynamics.test.mjs (Gate 4) and the
// fitting tool tests/upright-fit.mjs. Data: tests/data/s15-ellis.json.
import fs from 'node:fs';
import { Sim, pose, gCheck, gRail, dipOf, slowPress } from '../upright-model.js';

export const S15 = JSON.parse(fs.readFileSync(new URL('./data/s15-ellis.json', import.meta.url), 'utf8'));
export const CASES = { bs: { strap: true, spring: true }, b: { strap: true, spring: false }, s: { strap: false, spring: true }, 0: { strap: false, spring: false } };
const DEG = Math.PI / 180;
const interp = (xs, ys, x) => {
  if (x <= xs[0]) return ys[0];
  if (x >= xs.at(-1)) return ys.at(-1);
  const i = xs.findIndex(v => v > x), f = (x - xs[i - 1]) / (xs[i] - xs[i - 1]);
  return ys[i - 1] + f * (ys[i] - ys[i - 1]);
};
const bisect = (f, target, lo, hi, n = 40) => {   // f rising from lo to hi
  for (let i = 0; i < n; i++) { const m = (lo + hi) / 2; if (f(m) < target) lo = m; else hi = m; }
  return (lo + hi) / 2;
};
// The filmed model's regulation, as far as the clips show it, on the factory's: dip 9.62 mm (the held key, on its front
// rail [m]); the jack tripping with the key at 9.0 mm (the colour blow [m]); the backcheck bent so the held hammer sits
// at the case's filmed check angle [m]; and its strap's slack, as a bridle wire setting fitted with the strap's
// stiffness (tests/upright-fit.mjs): the strap pulls only for the 10-15 ms its ends are furthest apart, so its effect
// hangs on slack to a fraction of a millimetre, finer than the traced strap's +-1 mm.
export const FILMED = { bridle: 1.4 };   // fitted: 6.1 mm of slack at rest (S15 by eye: 6-7), taut 57-60 ms (S15: 54-57 to 65-70)
// The factory regulation at a 1-3/4 in blow, the blow S15's scale takes the filmed model to have (the sim's own factory
// blow is shorter, Greg's call: SPEC.blow). The filmed regulation starts from it; the fit was made on it.
export const FACTORY_AT_1_3_4 = {"balPunch":1.5,"frontPunch":1.5522,"railShim":-0.4964,"capstan":0.274,"letoff":0.0328,"backcheck":-5.7965,"spoon":-1.5527,"bridle":0,"softFelt":10.3664};
const filmedBase = (() => {
  const a = { ...FACTORY_AT_1_3_4 };
  a.frontPunch = bisect(v => -dipOf({ ...a, frontPunch: v }), -9.62, 0, 4);
  a.letoff = bisect(v => -(slowPress({ ...a, letoff: v }, 0.02).letoffAt ?? 99), -9.0, -4, 4, 30);
  return a;
})();
export function regulationFor(key) {
  const c = S15.cases[key], { strap, spring } = CASES[key];
  const a = { ...filmedBase, ...FILMED, noStrap: !strap, noSpring: !spring }, phi = pose(a, c.keyHeld).phi, target = c.checkedDeg * DEG;
  let lo = -15, hi = 6;   // bending toward the catcher (+) catches it nearer the strings (larger angle)
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2, g = gCheck({ ...a, backcheck: m }, phi).g ?? -1; if (g < target) lo = m; else hi = m; }
  a.backcheck = (lo + hi) / 2;
  return a;
}
// run one case: returns the hammer's path (deg from rest, + toward the strings, every ms from 0) and the events
export function runEllis(key, { ms = 300, dt = 0.0001 } = {}) {
  const c = S15.cases[key], a = regulationFor(key), s = new Sim(a);
  s.hold(c.keyHeld);
  const g0 = gRail(a), t = [], g = [], ev = [];
  // the filmed key front, up to where it first reaches rest; after that the front's overshoot and dip are mostly the
  // key flexing (S15: the capstan moves under 0.5 mm meanwhile), so the key is held at rest
  let home = false;
  s.drive(tt => { const d = interp(c.t, c.key, tt * 1000); if (d <= 0.02 && tt > 0) home = true; return home ? 0 : Math.max(0, d); });
  for (let i = 0; i <= ms; i++) {
    t.push(i); g.push((s.g - g0) / DEG);
    for (let j = 0; j < Math.round(0.001 / dt); j++) { s.step(dt); for (const e of s.events) ev.push({ ...e, ms: e.t * 1000 }); s.events = []; }
  }
  const rail = ev.find(e => e.type === 'rail');
  return { t, g, ev, railMs: rail ? rail.ms : null, startDeg: (s.g, g[0]), a };
}
// the filmed path on the same 1 ms grid (deg from rest, + toward the strings)
export const filmed = (key, t) => t.map(x => interp(S15.cases[key].t, S15.cases[key].ham, x));
// root-mean-square difference between a run and the film over 0..until ms
export function rms(key, run, until) {
  const f = filmed(key, run.t); let s = 0, n = 0;
  for (let i = 0; i < run.t.length && run.t[i] <= until; i++) { s += (run.g[i] - f[i]) ** 2; n++; }
  return Math.sqrt(s / n);
}
