// Fit the upright's dynamic constants (upright-model.js DYN) to S15's Ellis clips, one case at a time:
// the hammer's weight (hammerMR) to strap and spring both off; the butt spring's preload (springT0) to spring only; the
// strap's slack (the filmed bridle setting) and stiffness to strap only, with the slack at rest and the taut window that
// strap + spring shows. Strap + spring's path and landing are left out, as the check. Prints the fitted values for DYN
// and each case's fit. Run from the repo root: node tests/upright-fit.mjs   (about a minute)
import { DYN, pose, strapSlack } from '../upright-model.js';
import { runEllis, rms, S15, FILMED, regulationFor } from './upright-s15.mjs';

// how far a run is from the film: the path's rms (deg) up to just after the filmed landing, and the landing time (a
// 20 ms miss costs as much as a degree all along)
const cost = key => {
  const r = runEllis(key, { ms: 260 }), c = S15.cases[key];
  return rms(key, r, Math.min(c.railMs + 15, 250)) + Math.abs((r.railMs ?? 400) - c.railMs) / 20;
};
// golden-section search on one constant
function golden(f, lo, hi, n = 18) {
  const k = (Math.sqrt(5) - 1) / 2;
  let a = lo, b = hi, c = b - k * (b - a), d = a + k * (b - a), fc = f(c), fd = f(d);
  for (let i = 0; i < n; i++) {
    if (fc < fd) { b = d; d = c; fd = fc; c = b - k * (b - a); fc = f(c); }
    else { a = c; c = d; fc = fd; d = a + k * (b - a); fd = f(d); }
  }
  return (a + b) / 2;
}
const show = key => {
  const r = runEllis(key, { ms: 260 }), c = S15.cases[key], land = r.ev.find(e => e.type === 'rail');
  return `${c.label}: lands ${r.railMs?.toFixed(1)} ms (film ${c.railMs}) at ${land ? (land.v * 180 / Math.PI).toFixed(0) : '-'} deg/s (film ${c.landingDegS}), path rms ${rms(key, r, c.railMs + 15).toFixed(2)} deg`;
};

const only = process.argv[2];   // 'strap': refit the strap alone, the hammer and spring as they stand in DYN
if (only !== 'strap') {
  DYN.hammerMR = golden(v => { DYN.hammerMR = v; return cost('0'); }, 500, 8000);
  console.log('hammerMR', DYN.hammerMR.toFixed(0), '|', show('0'));
  // the spring's rate as well gives about 0 (-16 gf·mm per radian, fitted with the preload): left at 0 in DYN
  DYN.springK = 0;
  DYN.springT0 = golden(v => { DYN.springT0 = v; return cost('s'); }, 0, 4000);
  console.log('springT0', DYN.springT0.toFixed(0), '|', show('s'));
}
// The strap: the filmed bridle setting (its slack) and its stiffness, on strap only, together with what the clips say
// of the strap itself: about 6.5 mm of slack at rest [e] and taut from about 55 to 68 ms with the spring in [m]. On its
// path and landing alone the fit takes the slack out altogether (taut at rest), which the film contradicts.
let best = null;
for (const br of [-3, -2, -1, 0, 1, 2, 3]) for (const K of [100, 300, 800, 2000, 6000]) {
  FILMED.bridle = br; DYN.strapK = K;
  const a = regulationFor('b'), rest = pose(a, 0), slack = strapSlack(a, rest.phi, rest.g);
  const rb = runEllis('b', { ms: 220 }), rbs = runEllis('bs', { ms: 200 }), win = rbs.ev.filter(e => /strap/.test(e.type));
  const t0 = win.find(e => e.type === 'straptaut')?.ms ?? 999, t1 = [...win].reverse().find(e => e.type === 'strapslack')?.ms ?? 999;
  const c = rms('b', rb, 133) + Math.abs(rb.railMs - S15.cases.b.railMs) / 20 + Math.abs(slack - 6.5) / 2 + Math.abs(t0 - 55.5) / 10 + Math.abs(t1 - 67.5) / 10;
  if (!best || c < best.c) best = { c, br, K, slack, t0, t1 };
}
FILMED.bridle = best.br; DYN.strapK = best.K;
console.log(`filmed bridle ${best.br} (slack at rest ${best.slack.toFixed(1)} mm), strapK ${best.K}, taut ${best.t0.toFixed(0)}-${best.t1.toFixed(0)} ms with the spring |`, show('b'));
console.log('strap + spring, its path and landing not fitted |', show('bs'));
