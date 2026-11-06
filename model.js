// Grand action model: one key, side view, millimetres.
// x runs toward the back of the piano (strings), y is up, keybed at y = 0.
// Every moving part is a rigid lever on a pivot; regulation screws and
// punchings set where the levers meet. No playing physics beyond what the
// regulation tests need (hammer flight, rebound, checking, spring rise).

export const IN = 25.4;

// ---------- geometry (fixed by the "factory") ----------
export const G = {
  // key
  balX: 235, balRailY: 28,          // balance rail top (punchings sit on it)
  backRailX: 455, backRailY: 29.5,  // back rail cloth top
  frontRailX: 12, frontRailY: 18,   // front rail top (punchings sit on it)
  keyThick: 22, keyFrontLocal: -235, keyBackLocal: 235, keyTopCap: 2.5,
  capstanLocal: 115,                // capstan, behind the balance point
  backcheckLocal: 212,              // backcheck wire, near the key end
  bcHead: [210.9, 88.5],            // top of the backcheck's leather face, key-local: where the tail is caught
  // wippen (pivot at its rear, on the wippen rail)
  W: [400, 72], heel: [-50, -8], jackPivotW: [-79.5, 6], repPivotW: [-30, 16],
  // jack (local to its centre pin)
  jackTopY: 28, jackHalf: 3.5, toe: [-37, 6],
  // repetition lever (local to its centre pin)
  horn: [-45, 18], tip: [-72, 15],
  // hammer (local to the shank centre pin)
  H: [305, 120], knuckleC: [16, -8], knuckleR: 6, coreR: 3,
  crown: [125, 40], tail: [136.5, -24], shankRest: [55, -4],   // tail: the point on its scored back face that checks
  // strings and rails
  stringY: 120 + 40 + 44.45,        // nominal: crown height at rest + 1 3/4"
  letoffX: 283.5, dropX: 298, restRailX: 360,
  letoffBase: 88, dropBase: 106, restRailBase: 114,
  // repetition spring: force at the horn, in units of the hammer's weight there
  repK: 0.2,                        // per mm of extra compression
  checkHold: 1.3,                   // net lift the backcheck's grip can resist
  popNet: 1.0,                      // net lift above this is felt as a "pop"
  weakNet: 0.25,                    // net lift below this is sluggish
  wedge: 0.2,                       // a tripped jack can wedge back under a knuckle this far below its top
  bcInPath: 0.6,                    // fraction of dip before the backcheck can catch
  bcScrapeLean: 1.6,                // bent this far toward the hammer, the tail scrapes
  // damper: the key's back end lifts the underlever, the wire carries the head off the strings
  dmpContactLocal: 231,             // where the key end meets the underlever's lift felt
  dmpRatio: 1.0,                    // head lift per mm of underlever lift at the key
  dmpGravity: 5000,                 // head falling under its own weight, mm/s^2
  dmpBounceV: 350,                  // a head landing faster than this (mm/s) bobbles on the strings
};

// ---------- adjustments (the knobs a technician turns) ----------
// value units are what the part physically moves; step lists are the
// increments offered (screw turns or punching thicknesses).
export const ADJ = [
  { id: 'balPunch', name: 'Balance rail punchings', part: 'balance', unit: 'mm', min: 0, max: 4,
    steps: [0.1, 0.25], stepLabel: ['0.004" paper', '0.010" card'], how: 'Add or remove paper punchings under the key at the balance rail. Raises or lowers the key front.' },
  { id: 'jackScrew', name: 'Jack regulating screw', part: 'jackscrew', unit: 'mm', min: -3, max: 3,
    steps: [0.1], stepLabel: ['¼ turn'], how: 'Positions the jack front-to-back under the knuckle. + moves the jack toward the front.' },
  { id: 'repStop', name: 'Repetition lever height screw', part: 'repscrew', unit: 'mm', min: -2, max: 2,
    steps: [0.02, 0.08], stepLabel: ['⅛ turn', '½ turn'], how: 'Sets how high the repetition lever rests relative to the jack top. + raises the lever.' },
  { id: 'capstan', name: 'Capstan screw', part: 'capstan', unit: 'mm', min: 6, max: 20,
    steps: [0.16, 0.64], stepLabel: ['⅛ turn', '½ turn'], how: 'Raises or lowers the wippen, and with it the hammer. + raises the hammer (shorter blow).' },
  { id: 'restRail', name: 'Hammer rest rail', part: 'restrail', unit: 'mm', min: 100, max: 122,
    steps: [0.25], stepLabel: ['shim'], how: 'Raises or lowers the rail the hammer shanks fall back toward.' },
  { id: 'frontPunch', name: 'Front rail punchings', part: 'frontpunch', unit: 'mm', min: 0, max: 8,
    steps: [0.1, 0.25], stepLabel: ['0.004" paper', '0.010" card'], how: 'Thicker punchings stop the key sooner: less dip.' },
  { id: 'letoff', name: 'Let-off button', part: 'letoff', unit: 'mm', min: 78, max: 100,
    steps: [0.05, 0.2], stepLabel: ['⅛ turn', '½ turn'], how: 'Where the jack tender hits and trips the jack. + raises the button (later let-off, closer to the string).' },
  { id: 'drop', name: 'Drop screw', part: 'drop', unit: 'mm', min: 96, max: 120,
    steps: [0.05, 0.2], stepLabel: ['⅛ turn', '½ turn'], how: 'Stops the repetition lever. + raises the screw (hammer drops less after let-off).' },
  { id: 'repSpring', name: 'Repetition spring tension', part: 'repspring', unit: '', min: 0.3, max: 2.4,
    steps: [0.02], stepLabel: ['bend'], how: 'How hard the repetition lever pushes up on the knuckle.' },
  { id: 'backcheck', name: 'Backcheck wire', part: 'backcheck', unit: 'mm', min: -4, max: 4,
    steps: [0.25], stepLabel: ['bend'], how: 'Bend the backcheck toward (+) or away from (−) the hammer tail.' },
  { id: 'damperGap', name: 'Damper lift timing (head on its wire)', part: 'damper', unit: 'mm', min: 0, max: 10,
    steps: [0.1, 0.4], stepLabel: ['nudge', 'move'], how: 'Slides the damper head on its wire. + leaves more key travel before the key picks up the underlever (later lift).' },
  { id: 'damperStop', name: 'Damper stop rail', part: 'damperstop', unit: 'mm', min: 1, max: 20, shared: true,
    steps: [0.1, 0.4], stepLabel: ['shim', 'shim ×4'], how: 'One rail over every underlever. + raises it: more room before the dampers hit it.' },
  { id: 'pedalLift', name: 'Damper pedal lift', part: 'lifttray', unit: 'mm', min: 0, max: 20, shared: true,
    steps: [0.1, 0.4], stepLabel: ['¼ turn', '1 turn'], how: 'How far the pedal\'s lift tray raises every damper. + lifts them higher.' },
  { id: 'damperDrag', name: 'Damper wire in its guide bushing', part: 'damperwire', unit: '', min: 0, max: 0.9,
    steps: [0.05], stepLabel: ['ease'], how: 'A wire bent off line drags in its bushing and the damper falls late. − straightens and eases it.' },
];

// ---------- textbook specs ----------
// Generic textbook targets of the kind a PTG exam expects. Change them here.
export const SPEC = {
  keyHeight:  { name: 'Key height (vs neighbors)', target: 0, tol: 0.4, unit: 'mm' },
  jackPos:    { name: 'Jack: back of jack to back of knuckle core', target: 0, tol: 0.4, unit: 'mm' },
  wink:       { name: 'Rep lever height (hammer winks when the jack is tripped)', target: IN / 32, tol: IN / 64, unit: 'mm' },
  blow:       { name: 'Blow distance', target: 1.75 * IN, tol: IN / 32, unit: 'mm' },
  restGap:    { name: 'Shank above rest rail', target: IN / 8, tol: IN / 16, unit: 'mm' },
  dip:        { name: 'Key dip', target: IN * 3 / 8, tol: IN / 64, unit: 'mm' },
  letoff:     { name: 'Let-off from string', target: IN / 16, tol: IN / 64, unit: 'mm' },
  drop:       { name: 'Drop below let-off', target: IN / 16, tol: IN / 64, unit: 'mm' },
  aftertouch: { name: 'Aftertouch (key travel after let-off)', target: 1.0, tol: 0.4, unit: 'mm' },
  spring:     { name: 'Repetition spring', target: 0.55, tol: 0.25, unit: '' },
  check:      { name: 'Checking distance', target: IN * 5 / 8, tol: IN / 16, unit: 'mm' },
  // dampers: textbook timing is the head starting to lift with the hammer a third to half of the way up
  damperTiming: { name: 'Damper starts lifting (share of hammer travel)', target: 0.45, tol: 0.1, unit: '%', damper: true },
  damperStop:   { name: 'Damper stop rail clearance, key down', target: IN / 32, tol: IN / 64, unit: 'mm', damper: true },
  pedalLift:    { name: 'Pedal lift above key lift (to the stop rail)', target: IN / 32, tol: IN / 64, unit: 'mm', damper: true },
  damperFall:   { name: 'Damper falls freely', target: 0, tol: 0.15, unit: '', damper: true },
};
export const DAMPER_SPECS = Object.keys(SPEC).filter(k => SPEC[k].damper);

// ---------- small math ----------
const rot = (p, a) => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
// find x in [lo, hi] with f(x) = target, f monotonic either way
function solve(f, target, lo, hi, it = 40) {
  let flo = f(lo) - target;
  const fhi = f(hi) - target;
  if ((flo > 0) === (fhi > 0)) return Math.abs(flo) < Math.abs(fhi) ? lo : hi; // out of range: nearest end
  for (let i = 0; i < it; i++) {
    const mid = (lo + hi) / 2, fm = f(mid) - target;
    if ((fm > 0) === (flo > 0)) { lo = mid; flo = fm; } else hi = mid;
  }
  return (lo + hi) / 2;
}

// ---------- felt and cloth wear ----------
// How far each felt or cloth packs down after about ten years of steady playing,
// written as the adjustment it imitates (mm, spring in hammer weights).
// wear: 0 = freshly regulated, 1 = about ten years.
export const WEAR = { balPunch: -0.25, frontPunch: -0.3, backRail: -0.4, capstan: -0.15 /* wippen heel cushion */,
  knuckle: -0.15, crown: -1.0, letoff: +0.05 /* let-off button felt */, restRail: -0.3, backcheck: -0.6, repSpring: -0.12 };
let wearNow = 0; // set by eff()/linkage(); read by the hammer helpers
export function eff(a) {
  if (a._eff) { wearNow = a.wear; return a; }
  const w = a.wear || 0;
  wearNow = w;
  const e = { ...a, _eff: true, wear: w };
  for (const k of ['balPunch', 'frontPunch', 'capstan', 'letoff', 'restRail', 'backcheck', 'repSpring']) e[k] = a[k] + WEAR[k] * w;
  return e;
}

// ---------- key ----------
export function keyRest(a) {
  const By = G.balRailY + a.balPunch;
  const backY = G.backRailY + WEAR.backRail * (a.wear || 0);
  const th0 = Math.asin((backY - By) / (G.backRailX - G.balX));
  const fr = G.frontRailY + a.frontPunch;
  const thMax = Math.asin((By - fr) / (G.balX - G.frontRailX));
  return { By, th0, thMax };
}
const keyFrontTop = (By, th) => By + rot([G.keyFrontLocal, G.keyThick + G.keyTopCap], th)[1];
export const keyPt = (By, th, p) => add([G.balX, By], rot(p, th));
export function keyAngle(a, d) {
  const { By, th0, thMax } = keyRest(a);
  const y0 = keyFrontTop(By, th0);
  let th = solve(t => keyFrontTop(By, t), y0 - d, th0 - 0.05, th0 + 0.2);
  return { By, th: Math.min(th, thMax), th0, thMax };
}
export function dipOf(a) {
  const { By, th0, thMax } = keyRest(a);
  return keyFrontTop(By, th0) - keyFrontTop(By, thMax);
}
export const keyHeightOf = a => { const { By, th0 } = keyRest(a); return keyFrontTop(By, th0); };

// ---------- full pose for a key position and state ----------
// st: { escaped, checked } carried between calls; g: hammer angle (rad)
export function linkage(a, d) {
  wearNow = a.wear || 0;
  const k = keyAngle(a, d);
  const cap = keyPt(k.By, k.th, [G.capstanLocal, G.keyThick + a.capstan]);
  // wippen angle: heel sits on the capstan
  const phi = solve(f => G.W[1] + rot(G.heel, f)[1], cap[1], 0.4, -0.6);
  const wp = p => add(G.W, rot(p, phi));
  const J = wp(G.jackPivotW), R = wp(G.repPivotW);
  // jack
  const psiRest = a.jackScrew / G.jackTopY;
  const jackPt = (psi, p) => add(J, rot(p, phi + psi));
  const btn = a.letoff;
  let psiBtn = psiRest;
  if (jackPt(psiRest, G.toe)[1] > btn) psiBtn = solve(s => jackPt(s, G.toe)[1], btn, psiRest, psiRest + 0.8);
  // repetition lever: rho > 0 lifts the horn
  const repPt = (rho, p) => add(R, rot(p, phi - rho));
  const rhoStop = a.repStop / -G.horn[0] + 0.0;
  let rhoDrop = Infinity;
  if (repPt(rhoStop, G.tip)[1] > a.drop) rhoDrop = solve(r => repPt(r, G.tip)[1], a.drop, rhoStop - 0.5, rhoStop);
  const hornFree = repPt(rhoStop, G.horn)[1];
  const hornTop = repPt(Math.min(rhoStop, rhoDrop), G.horn)[1];
  // backcheck: catch height rises with the key; bending toward the hammer catches higher
  const bcHead = keyPt(k.By, k.th, G.bcHead);
  const depth = d / Math.max(0.1, dipOf(a));
  const keyEndRise = keyPt(k.By, k.th, [G.dmpContactLocal, G.keyThick])[1] - keyPt(k.By, k.th0, [G.dmpContactLocal, G.keyThick])[1];
  return { keyEndRise, k, cap, phi, J, R, psiRest, psiBtn, jackPt, repPt, rhoStop, rhoDrop, hornFree, hornTop,
           bcCatchY: bcHead[1] + 3 * a.backcheck, bcHead, depth };
}

// hammer helpers
export const hamPt = (g, p) => add(G.H, rot(p, g));
export const knuckleBottom = g => { const c = hamPt(g, G.knuckleC); return [c[0], c[1] - (G.knuckleR + WEAR.knuckle * wearNow)]; };
export const crownY = g => hamPt(g, [G.crown[0], G.crown[1] + WEAR.crown * wearNow])[1];
const gFromKnuckle = z => solve(g => knuckleBottom(g)[1], z, -0.6, 0.7);
const gFromCrown = y => solve(crownY, y, -0.6, 0.7);
let gStrCache = { w: null, g: 0 };
export function gString() {
  if (gStrCache.w !== wearNow) gStrCache = { w: wearNow, g: gFromCrown(G.stringY) };
  return gStrCache.g;
}
export function gRail(a) { return solve(g => hamPt(g, G.shankRest)[1], a.restRail, -0.6, 0.7); }
export const gFromTail = y => solve(g => hamPt(g, G.tail)[1], y, -0.6, 0.7);

// spring force on the knuckle (units of hammer weight) with the horn at height z
export const springF = (a, L, z) => a.repSpring + G.repK * Math.max(0, L.hornFree - z);

// where the repetition lever alone would hold the hammer (knuckle height)
export function repSupportZ(a, L) {
  if (springF(a, L, L.hornTop) >= 1) return L.hornTop;
  return Math.min(L.hornTop, L.hornFree - (1 - a.repSpring) / G.repK);
}

export function jackGeom(L, psi) {
  return {
    topY: L.jackPt(psi, [0, G.jackTopY])[1],
    backX: L.jackPt(psi, [G.jackHalf, G.jackTopY])[0],
  };
}

// Update escape/reset state from the jack geometry. Returns jack angle.
export function updateJack(a, L, st, g) {
  const kb = knuckleBottom(g);
  if (!st.escaped) {
    const jg = jackGeom(L, L.psiBtn);
    if (jg.backX < kb[0]) st.escaped = true;
    else return L.psiBtn;
  }
  // escaped: the jack spring pushes it back as far as the button and knuckle allow
  const tgt = Math.max(L.psiRest, L.psiBtn);
  const jt = jackGeom(L, tgt);
  // the jack spring can push a rounded jack top back under a knuckle sitting a hair below it
  if (jt.topY < kb[1] + G.wedge) {
    if (jt.backX >= kb[0]) st.escaped = false;
    return tgt;
  }
  // jack top is still up against the front of the knuckle
  const held = solve(s => jackGeom(L, s).backX, kb[0] - 0.4, tgt, tgt + 0.8);
  return Math.max(tgt, held);
}

// Quasi-static hammer angle for the current state.
export function staticHammer(a, L, st, gPrev) {
  const psi = updateJack(a, L, st, gPrev);
  const cands = [gRail(a), gFromKnuckle(repSupportZ(a, L))];
  let jackG = -Infinity;
  if (!st.escaped) { jackG = gFromKnuckle(jackGeom(L, psi).topY); cands.push(jackG); }
  if (st.checked) cands.push(gFromTail(L.bcCatchY));
  let g = Math.max(...cands);
  let blocked = false;
  if (g > gString()) { blocked = jackG >= gString(); g = gString(); }
  return { g, psi, blocked, jackG };
}

// ---------- measurements ----------
export function factoryNeighborHeight() { return keyHeightOf({ balPunch: 1.5, frontPunch: 0 }); }
export const NEIGHBOR_H = factoryNeighborHeight();

function rest(a) {
  a = eff(a);
  const L = linkage(a, 0), st = { escaped: false, checked: false };
  let g = 0;
  for (let i = 0; i < 4; i++) g = staticHammer(a, L, st, g).g;
  return { L, st, g, psi: updateJack(a, L, { ...st }, g) };
}

// slow press from rest to the bottom; reports let-off, drop and aftertouch
export function slowPress(a, step = 0.01) {
  a = eff(a);
  const dip = dipOf(a);
  const st = { escaped: false, checked: false };
  let g = rest(a).g, dEsc = null, letoff = null, blockedAt = null, maxCrown = -Infinity;
  for (let d = 0; d <= dip + 1e-9; d += step) {
    const L = linkage(a, d);
    const wasEsc = st.escaped;
    const r = staticHammer(a, L, st, g);
    if (r.blocked) { blockedAt = d; g = r.g; break; }
    if (!wasEsc && st.escaped && dEsc === null) { dEsc = d; letoff = G.stringY - crownY(g); }
    g = r.g;
    maxCrown = Math.max(maxCrown, crownY(g));
  }
  const bottomD = blockedAt ?? dip;
  return {
    dip, dEsc, blockedAt,
    letoff, // distance from string at the moment the jack trips
    dropFromString: G.stringY - crownY(g),
    aftertouch: dEsc === null ? 0 : bottomD - dEsc,
    escaped: st.escaped, gBottom: g, closest: G.stringY - maxCrown,
  };
}

// hammer rise from check: net lift on the knuckle (units of hammer weight)
export function springNet(a) {
  a = eff(a);
  const dip = dipOf(a);
  const L = linkage(a, dip);
  const zCheck = knuckleBottom(gFromTail(L.bcCatchY))[1];
  return springF(a, L, Math.min(zCheck, L.hornTop)) - 1;
}

export function measure(a) {
  a = eff(a);
  const R = rest(a);
  const { L, g } = R;
  const kb = knuckleBottom(g);
  const kc = hamPt(g, G.knuckleC);
  const jg = jackGeom(L, L.psiRest);
  const crownPerKnuckle = (crownY(gFromKnuckle(kb[1] + 0.5)) - crownY(gFromKnuckle(kb[1]))) / 0.5;
  const sp = slowPress(a);
  const net = springNet(a);
  const Lb = linkage(a, sp.blockedAt ?? sp.dip);
  const gChk = gFromTail(Lb.bcCatchY);
  const onRail = Math.abs(g - gRail(a)) < 1e-4;
  // lost motion: key travel before the jack meets the knuckle (when hammer sits on the rail)
  const restZ = Math.max(jg.topY, repSupportZ(a, L));
  return {
    keyHeight: keyHeightOf(a) - NEIGHBOR_H,
    jackPos: jg.backX - (kc[0] + G.coreR),
    jackUnder: jg.backX > kb[0],
    // trip the jack at rest: the hammer settles onto the repetition lever. That small drop is the wink.
    // Negative means the lever is already holding the hammer off the jack.
    wink: (jg.topY - repSupportZ(a, L)) * crownPerKnuckle,
    jackReturns: jg.topY - repSupportZ(a, L) < G.wedge,
    hammerOnJack: Math.abs(kb[1] - jg.topY) < 0.02,
    blow: G.stringY - crownY(g),
    restGap: hamPt(g, G.shankRest)[1] - a.restRail,
    onRail, lostMotion: onRail ? Math.max(0, kb[1] - restZ) : 0,
    dip: sp.dip,
    letoff: sp.letoff,
    blocked: sp.blockedAt !== null,
    drop: sp.letoff === null ? null : sp.dropFromString - sp.letoff,
    aftertouch: sp.aftertouch,
    spring: net,
    springState: net > G.checkHold ? 'jumps' : net > G.popNet ? 'pop' : net < 0 ? 'none' : net < G.weakNet ? 'weak' : 'good',
    check: G.stringY - crownY(gChk),
    scrapes: a.backcheck > G.bcScrapeLean,
    noCheck: net > G.checkHold,
    press: sp,
    ...measureDampers(a),
  };
}

// ---------- dampers ----------
// head lift the key gives at this key position (mm above the strings)
export const damperKeyLift = (a, L) => Math.max(0, L.keyEndRise - a.damperGap) * G.dmpRatio;
const damperFallTime = (a, h) => Math.sqrt(2 * Math.max(0, h) / (G.dmpGravity * (1 - Math.min(0.95, a.damperDrag))));
export function measureDampers(a) {
  a = eff(a);
  const dip = dipOf(a);
  const Lb = linkage(a, dip);
  const keyLiftBottom = damperKeyLift(a, Lb);
  // the key position where the key end first reaches the underlever, and how far the hammer has gone by then
  let timing = null;
  if (Lb.keyEndRise > a.damperGap) {
    const d0 = solve(d => linkage(a, d).keyEndRise, a.damperGap, 0, dip);
    const st = { escaped: false, checked: false };
    let g = rest(a).g; const g0 = g;
    for (let d = 0; d <= d0 + 1e-9; d += Math.max(0.02, d0 / 60)) g = staticHammer(a, linkage(a, d), st, g).g;
    timing = (crownY(g) - crownY(g0)) / (G.stringY - crownY(g0));
  }
  const pedalH = Math.min(a.pedalLift, a.damperStop);
  return {
    damperTiming: timing,
    damperStop: a.damperStop - keyLiftBottom,
    pedalLift: a.pedalLift - keyLiftBottom,
    pedalIntoStop: a.pedalLift > a.damperStop + 0.2,
    damperFall: a.damperDrag,
    fallMs: 1000 * damperFallTime(a, pedalH),
    keyLiftBottom,
  };
}

// pass/fail for one spec given a measurement set
export function grade(id, m) {
  const s = SPEC[id];
  let v = m[id];
  if (id === 'letoff' && m.blocked) return { ok: false, v: null, note: 'blocks: jack never lets off' };
  if (id === 'damperTiming' && v == null) return { ok: false, v: null, note: 'the key never lifts the damper' };
  if (v === null || v === undefined) return { ok: false, v: null, note: 'no let-off' };
  if (id === 'jackPos' && !m.jackUnder) return { ok: false, v, note: 'jack is not under the knuckle' };
  if (id === 'wink' && v < 0) return { ok: false, v, note: 'no wink: the lever holds the hammer off the jack' };
  if (id === 'wink' && !m.jackReturns) return { ok: false, v, note: 'jack will not return under the knuckle' };
  if (id === 'restGap' && m.onRail) return { ok: false, v, note: m.lostMotion > 0.05 ? 'hammer sits on the rail: lost motion' : 'hammer sits on the rail' };
  if (id === 'check' && m.scrapes) return { ok: false, v, note: 'tail scrapes the backcheck' };
  if (id === 'check' && m.noCheck) return { ok: false, v, note: 'hammer will not stay checked' };
  if (id === 'damperStop' && v <= 0.05) return { ok: false, v, note: 'dampers hit the stop rail before the key bottoms' };
  if (id === 'pedalLift' && m.pedalIntoStop) return { ok: false, v, note: 'the pedal drives the dampers into the stop rail' };
  if (id === 'pedalLift' && v < 0) return { ok: false, v, note: 'the pedal lifts the dampers less than the keys do' };
  if (id === 'damperFall') return { ok: v <= s.tol, v, note: v <= s.tol ? 'falls freely' : 'drags in its bushing: falls late' };
  if (id === 'spring') {
    const notes = { good: 'rises positively, no pop', weak: 'sluggish rise', none: 'hammer does not rise', pop: 'pops: bump felt in the key', jumps: 'jumps out of check' };
    return { ok: m.springState === 'good', v, note: notes[m.springState] };
  }
  return { ok: Math.abs(v - s.target) <= s.tol, v, note: '' };
}

// ---------- factory regulation (solve every knob to its spec) ----------
const bis = (a, id, f, target, lo, hi) => { a[id] = solve(x => { a[id] = x; return f(); }, target, lo, hi, 30); };
export function factory() {
  const a = { balPunch: 1.5, jackScrew: 0, repStop: 0, capstan: 12, restRail: 112, frontPunch: 1.5,
              letoff: 90, drop: 112, repSpring: 0.8, backcheck: 0, damperGap: 4, damperStop: 8, pedalLift: 8, damperDrag: 0.05 };
  for (let pass = 0; pass < 3; pass++) {
    bis(a, 'jackScrew', () => measure(a).jackPos, 0, -3, 3);
    bis(a, 'repStop', () => measure(a).wink, SPEC.wink.target, -2, 2);
    bis(a, 'capstan', () => measure(a).blow, SPEC.blow.target, 6, 20);
    a.restRail = hamPt(rest(a).g, G.shankRest)[1] - SPEC.restGap.target;
    bis(a, 'frontPunch', () => dipOf(a), SPEC.dip.target, 0, 8);
    bis(a, 'letoff', () => measure(a).letoff ?? 0, SPEC.letoff.target, 78, 100);
    bis(a, 'drop', () => measure(a).drop ?? 0, SPEC.drop.target, 100, 120);
    bis(a, 'backcheck', () => measure(a).check, SPEC.check.target, -4, 4);
    bis(a, 'damperGap', () => measureDampers(a).damperTiming ?? 1, SPEC.damperTiming.target, 0, 9);
    const kl = measureDampers(a).keyLiftBottom;
    // the stop rail a hair above the key's lift, and the pedal taking the dampers just up to it
    a.damperStop = kl + SPEC.damperStop.target;
    a.pedalLift = a.damperStop - 0.05;
  }
  return a;
}

// ---------- time-stepped simulation (for watching it move) ----------
const GA = 60;       // hammer free-fall, rad/s^2
const DAMP = 25;     // damping while the knuckle rides the repetition lever
const POP_W = 2.0;   // leaving the lever faster than this is a visible pop
const REST_E = 0.35; // rebound off the string

export class Sim {
  constructor(a) { this.setAdj(a); this.reset(); }
  setAdj(a) { this.a = eff(a); this.dip = dipOf(this.a); }
  reset() {
    this.d = 0; this.dTarget = 0; this.keySpeed = 40;
    this.st = { escaped: false, checked: false, aboveCheck: false, dChecked: 0 };
    const L = linkage(this.a, 0);
    let g = 0; for (let i = 0; i < 4; i++) g = staticHammer(this.a, L, this.st, g).g;
    this.g = g; this.w = 0; this.psi = L.psiRest; this.L = L; this.events = [];
    this.blocked = false; this.scraped = false;
    this.t = 0; this.pedal = this.pedal ?? 0; this.pedalTarget = this.pedalTarget ?? 0;
    this.yd = Math.min(this.pedal * this.a.pedalLift, this.a.damperStop); this.vd = 0;
    this.up = this.yd > 0.05; this.hitStop = false; this.liftedAt = this.up ? 0 : null;
  }
  setPedal(down) { this.pedalTarget = down ? 1 : 0; }
  // damper head: pushed up by the key's underlever or the pedal's lift tray, capped by the stop rail,
  // and otherwise falling under its weight, slowed by any drag in its guide bushing
  stepDamper(dt) {
    const a = this.a;
    this.t += dt;
    // the foot presses the pedal over about a tenth of a second; let go, the tray drops away faster than the dampers fall
    const rate = this.pedalTarget > this.pedal ? dt / 0.1 : dt / 0.02;
    this.pedal += Math.sign(this.pedalTarget - this.pedal) * Math.min(Math.abs(this.pedalTarget - this.pedal), rate);
    const push = Math.max(damperKeyLift(a, this.L), this.pedal * a.pedalLift);
    // free flight first (rising after a hard blow, or falling); the underlever or tray takes over
    // whenever it is at or above where the head would be
    const gEff = G.dmpGravity * (this.vd > 0 ? 1 + a.damperDrag : 1 - Math.min(0.95, a.damperDrag));
    let v = this.vd - gEff * dt, y = this.yd + v * dt;
    if (push >= y) { v = (push - this.yd) / dt; y = push; if (push <= this.yd + 1e-9) v = 0; }
    if (y > a.damperStop) { if (v > 40 && !this.hitStop) { this.emit('damperstop'); this.hitStop = true; } y = a.damperStop; v = Math.min(0, v); }
    if (y > 0.05 && !this.up) { this.up = true; this.liftedAt = this.t; this.emit('damperup'); this.hitStop = false; }
    if (y <= 0) {
      // landing on the strings
      if (this.up) { this.up = false; this.emit('seated', { t: this.t, airMs: this.liftedAt === null ? null : 1000 * (this.t - this.liftedAt), v: -v }); }
      if (-v > G.dmpBounceV) { this.emit('damperbounce'); v = 0.3 * -v; y = 0.01; }
      else { y = 0; v = 0; }
    }
    this.yd = y; this.vd = v;
  }
  emit(type, data = {}) { this.events.push({ type, d: this.d, g: this.g, ...data }); }
  press(target, speed) { this.dTarget = Math.max(0, Math.min(target, this.dip + 1)); this.keySpeed = speed; }
  step(dt) {
    const a = this.a, st = this.st;
    const dPrev = this.d;
    const dir = Math.sign(this.dTarget - this.d);
    this.d += dir * Math.min(Math.abs(this.dTarget - this.d), this.keySpeed * dt);
    this.d = Math.max(0, Math.min(this.d, this.dip));
    let L = linkage(a, this.d);
    const wasEsc = st.escaped;
    this.psi = updateJack(a, L, st, this.g);
    if (!wasEsc && st.escaped) this.emit('letoff', { dist: G.stringY - crownY(this.g) });
    if (wasEsc && !st.escaped) this.emit('reset');
    const jackG = st.escaped ? -Infinity : gFromKnuckle(jackGeom(L, this.psi).topY);
    const gHorn = gFromKnuckle(L.hornTop);
    const kz = knuckleBottom(this.g)[1];
    const onRep = kz <= L.hornTop + 1e-6;
    let acc = -GA;
    // the lever damps the hammer's rise; a falling hammer just compresses the spring
    if (onRep) acc += GA * springF(a, L, kz) - (this.w > 0 ? DAMP * this.w : 0);
    let w = this.w + acc * dt;
    let g = this.g + w * dt;
    const jackDriving = jackG >= this.g - 1e-6;
    if (onRep && g > gHorn && !jackDriving) {
      if (w > POP_W) { if (!this.popped) this.emit('pop'); this.popped = true; }
      else { g = gHorn; w = Math.min(w, (gHorn - this.g) / dt); }
    }
    if (jackG > g) {
      // a jack slipping back under the knuckle lifts it a hair with no kick; otherwise the jack drives it
      w = wasEsc && !st.escaped ? Math.max(0, w) : Math.max(w, Math.min(40, (jackG - this.g) / dt));
      g = jackG;
    }
    const gR = gRail(a);
    if (g < gR) { g = gR; w = Math.max(0, w); }
    // backcheck
    const gC = gFromTail(L.bcCatchY);
    const catchActive = L.depth >= G.bcInPath;
    if (catchActive && g > gC + 0.02) st.aboveCheck = true;
    if (!catchActive) st.aboveCheck = false;
    if (catchActive && w > 0 && g < gC && a.backcheck > G.bcScrapeLean && !this.scraped) { this.scraped = true; this.emit('scrape'); }
    if (!st.checked && catchActive && st.aboveCheck && this.g >= gC && g < gC && w < 0) {
      st.checked = true; st.dChecked = this.d; g = gC; w = 0;
      this.emit('checked', { dist: G.stringY - crownY(gC) });
    }
    if (st.checked) {
      st.dChecked = Math.max(st.dChecked, this.d);
      const net = springF(a, L, Math.min(knuckleBottom(gC)[1], L.hornTop)) - 1;
      if (net > G.checkHold) { st.checked = false; this.emit('jumpcheck'); }
      else if (this.d < st.dChecked - 0.8 || !catchActive) { st.checked = false; st.aboveCheck = false; this.emit('uncheck'); }
      else { g = gC; w = 0; } // the backcheck grips the tail
    }
    // string
    if (g > gString()) {
      if (jackG >= gString() - 1e-9 && !st.escaped) {
        g = gString(); w = 0; this.d = dPrev; this.dTarget = Math.min(this.dTarget, dPrev);
        if (!this.blocked) this.emit('blocked'); this.blocked = true;
        L = linkage(a, this.d);
      } else {
        this.emit('strike', { v: w * G.crown[0] / 1000 });
        g = gString(); w = -REST_E * Math.abs(w);
      }
    }
    if (this.d < 0.5) { this.blocked = false; this.scraped = false; this.popped = false; }
    this.g = g; this.w = w; this.L = L;
    this.stepDamper(dt);
  }
  run(seconds, dt = 0.0002) { for (let t = 0; t < seconds; t += dt) this.step(dt); }
}

// Factory regulation solved offline with factory() (node), so the page loads fast.
export const FACTORY = {"balPunch":1.5,"jackScrew":0,"repStop":0.9008,"capstan":12.5,"restRail":112.825,"frontPunch":2.4804,"letoff":87.9002,"drop":111.2148,"repSpring":0.8,"backcheck":0.8957,"damperGap":3.4967,"damperStop":6.6222,"pedalLift":6.5722,"damperDrag":0.05};
