// Upright action model: one note, side view, millimetres. Built standalone beside the grand (research/upright/protocol.md,
// chunk C1): for now only the geometry the static drawing needs. Kinematics (C2) and dynamics (C3) come later, here.
//
// Two frames, both with x toward the strings and y up:
// - the action frame, origin at the hammer butt's centre pin. Every traced point is in it, read off the filmed upright
//   action model (S15: PTG Education Hub high-speed clips, research/upright/video/findings.md), mirrored so the strings
//   are on the right. The clips have no ruler in the action plane: their scale is 3.6 px/mm ±10%, so every traced length
//   carries that ±10%. Outlines are traced on research/upright/parts/ref/ (the grey Ellis-redo rest frame, and the colour
//   blow-check-release rest frame fitted onto it at the four centre pins); the overlays are in research/upright/parts/.
// - the sim frame, the grand's (model.js): keybed at y = 0, the key's front at x = 0. H puts the action frame in it.
// z is across the keyboard, + toward the bass (the grand's rule); the scene draws it at BASS times.
//
// Tags: [m] measured on S15; [e] estimated from S15 (traced or read by eye); [T] a stand-in from general knowledge, until a
// source or Greg's bench gives the number (GTD d078a7e4); [S1]..[S16] the protocol's sources.

export const IN = 25.4;

// ---------- where things are ----------
// The butt centre pin in the sim frame. [T]: the key and its frame are stand-ins (see KEY), so this is too. The action
// itself, everything in the action frame below, is traced.
export const H = [451, 194];
export const toSim = ([x, y]) => [H[0] + x, H[1] + y];

// Centre pins, action frame, at rest [m: S15, the bushing dots in the grey frame]
export const CENTER = {
  butt: [0, 0],
  wippen: [2.1, -85.1],
  jack: [-33.6, -70.2],
  damper: [23.4, -3.5],
};

// Strings: the unison's line in the side view [m: S15, x = 98.2 + 0.0137 y px]. Strike height is the crown's at rest.
// Drawn from y0 to y1, three strings (a trichord) across z [T: spacing and radius].
export const STRING = { x: 53.9, y: 140, lean: 0.0137, y0: -60, y1: 175, unison: [-3.5, 0, 3.5], r: 0.55 };
export const stringX = y => STRING.x + STRING.lean * (y - STRING.y);

// ---------- the key and its frame: stand-ins [T] ----------
// No measured upright key yet. What is sourced: the capstan sits 32 mm from the key's back end [e: colour clip], the
// capstan rises about 0.78 of the key front's travel [e: S15, 26.8 px for 9.62 mm], and dip is 0.400 in [S1].
// The lengths are stand-ins scaled to that ratio; the key and its rails are drawn see-through until Greg measures one.
export const KEY = {
  balX: 230,                 // balance pin [T]
  backX: H[0] - 41 + 32,     // back end: 32 behind the capstan (CAPSTAN.x, action frame) [e]
  thick: 24,                 // [T]
  bottomY: 21,               // the key's underside on its rails, level at rest [T]
  dip: 0.4 * IN,             // [S1]
};

// ---------- traced outlines, action frame, at rest ----------
// Closed polygons unless named as a path. Each moving part turns about one of CENTER (the scene draws it in that frame).
// Shapes are as filmed; where a part was hidden or unclear, the comment says what the shape rests on.
export const TRACE = {
  // hammer: felt, underfelt and molding, on the shank [e]. The crown (rightmost) is at [10.2, 142.2] [m].
  headFelt: [[-35.6, 135.3], [-30.1, 141.5], [-24.5, 147.1], [-19.0, 151.9], [-13.4, 154.7], [-7.2, 155.8], [-0.9, 155.1],
    [4.7, 152.3], [8.5, 147.8], [10.2, 142.2], [9.9, 137.4], [8.1, 133.2], [4.5, 129.5], [-1.5, 127.0], [-10.0, 125.4],
    [-20.3, 124.2], [-27.3, 126.6], [-32.8, 129.0]],
  underfelt: [[-29, 138.2], [-23, 142.6], [-12, 144.9], [-3, 145.4], [0.2, 143], [-0.6, 139.6], [-7.5, 137.4], [-18, 136.4],
    [-26, 136.4]],
  // the molding runs on into the felt; its tip is hidden in the underfelt
  molding: [[-64.8, 125.9], [-35.6, 135.3], [-20, 139.6], [-6, 141.8], [-2, 141.2], [-6, 139.0], [-20, 134.2], [-33.5, 128.4],
    [-61.7, 115.8]],
  // butt: the block the shank and catcher shank are glued into, round its centre pin [e]
  butt: [[-28, 24], [-26, 27.5], [-20, 29.3], [-12, 29.8], [-5, 29.0], [-2, 26], [-1, 18], [0.5, 10], [3.2, 4.5], [4, 0],
    [3, -3], [0, -4], [-3, -3], [-6, 0], [-11, 4.5], [-16.5, 8.6], [-23, 9], [-26, 12], [-27.5, 18]],
  // butt cushion: felt and buckskin under the butt's heel, where the jack top lifts it (red in the colour clip) [e]
  buttCushion: [[-23.5, 9], [-16.5, 9], [-16.8, 5.2], [-17.5, 4.4], [-22.5, 4.4], [-23.5, 5.2]],
  // catcher: a wooden head on a dowel from the butt; its left face is the check face (leather on it [T]) [e]
  catcherHead: [[-55.5, 16], [-45, 17.5], [-44, 15], [-44, 0], [-48, -3], [-52.5, -2.5]],
  // butt spring: a wire from a coil on the flange, its end pressing the butt's back near the top [e]; a path. The coil
  // is drawn 1.6 mm in from the arc's visible start, so it sits on the flange's cheek.
  buttSpring: [[4.5, 1.5], [7, 9], [7, 13], [5.5, 18], [2.5, 23], [-1.5, 27.5]],
  // butt flange: a foot on the main rail, a stem up to the cheeks round the centre pin (BUTT_FORK) [e: the foot's shelf
  // for the screw is the colour clip's wider bottom, X -8..+5]
  buttFlange: [[-9, -24], [5, -24], [5, 0], [-5, 0], [-5, -17], [-9, -17]],
  // wippen: the bar, the heel block under its front end, and the cushion on the capstan [e]
  wippen: [[-66, -80.4], [20, -80.4], [20, -91.5], [-66, -91.5]],
  heel: [[-53, -91.5], [-29.5, -91.5], [-29.5, -105], [-53, -105]],
  heelCushion: [[-49.5, -105], [-33, -105], [-33, -109], [-49.5, -109]],
  // the post on the wippen that carries the jack's centre pin [e]
  jackFlange: [[-37, -80.4], [-29, -80.4], [-29, -66], [-30.2, -64.6], [-33, -64], [-35.8, -64.6], [-37, -66]],
  // wippen flange: a tongue from the main rail's underside down to its rounded end round the wippen's centre pin [e],
  // and a plate up the rail's back face, overlapping the tongue's top 6 mm, that its screw goes through [T] (Igrec
  // fig. 337: wippen flange screws are at the back of the action)
  wippenFlange: (() => {
    const x0 = -1.5, x1 = 6, c = (x0 + x1) / 2, r = (x1 - x0) / 2, arc = [];
    for (let i = 1; i < 12; i++) { const t = Math.PI + i * Math.PI / 12; arc.push([c + r * Math.cos(t), -85.1 + r * Math.sin(t)]); }
    return [[x0, -60], [x1, -60], [x1, -85.1], ...arc.reverse(), [x0, -85.1]];
  })(),
  wippenFlangePlate: [[6, -66], [10, -66], [10, -50], [6, -50]],
  // damper spoon: a wire up from the wippen's back end to the lever's felt [e]; a path. Its tip is drawn 1.6 mm higher
  // than traced, and the lever's end 2 mm lower (both within the trace's +-2 mm), so the tip stays on the felt as the
  // wippen tips it down through the stroke (about 2 mm).
  spoon: [[8.5, -80.4], [8.5, -75], [9.4, -70], [11.0, -65.8], [13.6, -61.6]],
  // jack: an L on its centre pin, the toe toward the let-off button, the arm up to the butt cushion [e]. Its top is
  // drawn 0.5 mm above the trace (within the trace's ±1 mm), for 0.3 mm of lost motion at rest: S15's slowest blow
  // bounds it at 0.46 mm (the crown starts after 1.2 mm of key).
  jack: [[-52, -61], [-50.5, -59.2], [-38, -58.8], [-35.5, -55.5], [-31, -50], [-27.5, -40], [-25.5, -30], [-25, -20],
    [-25, -10], [-25, 3.7], [-18.5, 4.1], [-18.8, -10], [-18.8, -20], [-19, -30], [-20, -40], [-23.5, -52], [-27.5, -60],
    [-29, -66], [-30, -72], [-33.6, -74.2], [-37.2, -72.5], [-38, -66.8], [-50.5, -66.8], [-52, -65]],
  // jack spring: a coil between the toe's underside and the wippen [e]; its axis, bottom to top
  jackSpring: [[-46, -80.4], [-46, -66.8]],
  // backcheck and bridle wires, up from the wippen's front end [e]; paths, wippen end first (the backcheck wire's top is
  // hidden in its head: run on 5 mm into it)
  backcheckWire: [[-59, -80.4], [-62.3, -67], [-65.5, -54], [-69.5, -37], [-72, -28], [-74, -19], [-76.6, -8]],
  bridleWire: [[-55, -80.4], [-59, -70], [-64, -57], [-68.5, -46], [-70.5, -41]],
  // backcheck head: wood, with a thick felt face toward the catcher (green in the colour clip) [e]
  backcheck: [[-83, 17], [-77.5, 19.5], [-76, -10.5], [-80, -13]],
  backcheckFelt: [[-77.5, 19.5], [-64, 19.5], [-62.5, -10.5], [-76, -10.5]],
  // bridle strap: cloth tape from the catcher's string face, draped over the let-off screw's eye, its end hooked on the
  // bridle wire [e: S15 findings, fixing [-43, 4] and hook [-71, -41], by eye ±1.5 mm]; a path, catcher end first
  strap: [[-43.5, 4], [-41, -1], [-40.8, -8], [-42.5, -14], [-44.5, -19.8], [-46, -23.3], [-48.5, -23.9], [-53, -27.2],
    [-60, -33.3], [-66, -37.5], [-70.5, -40.5]],
  // let-off: the button (body and felt face) on its regulating screw, the screw's eye on top [e]
  letoffButton: [[-50.5, -44], [-42.5, -44], [-42.5, -49], [-50.5, -49]],
  letoffFelt: [[-50.5, -49], [-42.5, -49], [-42.5, -54], [-50.5, -54]],
  letoffScrew: [[-46.5, -49], [-46.5, -28.9]],
  letoffEye: [-46.5, -26.3],           // a wire ring (EYE), 2.6 mm to its outside
  // jack stop: a block on a threaded rod, its felt facing the jack's arm [e]
  jackStop: [[-41.7, -14.5], [-36.5, -14.5], [-36.5, -24.8], [-41.7, -24.8]],
  jackStopFelt: [[-36.5, -14.5], [-28.5, -14.5], [-28.5, -24.8], [-36.5, -24.8]],
  // damper: the lever on its flange, the felt the spoon pushes, the wire up to the block and head [e]
  damperLever: [[20.5, 49], [31, 49], [30.6, 30], [29.8, 10], [28, -8], [25.2, -25], [24.3, -40], [24, -66], [19, -66],
    [19, -36.5], [19.3, -20], [19.8, -5], [20.2, 10], [20.5, 30]],
  leverFelt: [[15, -36.5], [19, -36.5], [19, -65.8], [15, -65.3]],
  // damper flange: the arm out to the lever's centre pin [e], and its foot down the main rail's back face [T]
  damperFlange: [[6, 0.5], [23.4, 0.5], [27.2, -1.2], [28, -4.5], [26.3, -7.5], [23.4, -8.2], [18, -5.5], [10, -5.5], [10, -30],
    [6, -30]],
  // damper spring: a wire from a coil on the flange up to the lever's player face [e: thin, seen in the colour clip]; a path
  damperSpring: [[17, -2], [16.5, 8], [17, 18], [18.5, 26], [20.5, 31]],
  damperWire: [[26.5, 49], [27, 55], [28, 62], [28.8, 70], [29.5, 80], [30, 90], [30.2, 95]],
  // the damper block: a round wooden block lying toward the strings, clamped on the wire by its screw [e]
  damperBlock: { x0: 23.5, x1: 36, y: 98.5, r: 5 },
  // the damper head (red in the colour clip: wood under red felt? ask Greg) and its two felt pads on the strings [e]
  damperHead: [[35.5, 56], [43.5, 56], [43.5, 115], [35.5, 115]],
  damperFelts: [[[43.5, 56], [53.4, 56], [53.4, 78], [43.5, 78]], [[43.5, 95], [53.6, 95], [53.6, 116], [43.5, 116]]],
};

// The shank: a straight dowel at the measured lean, its axis passing 2.2 mm to the player's side of the butt's centre pin
export const SHANK = {
  lean: 22.3 * Math.PI / 180,  // from the vertical, top toward the player [m: S15, edge fit over 80 rows]
  x0: -2.2,                    // where its axis crosses y = 0 [e: fitted to its edges at six heights, both frames]
  r: 2.75,                     // [e: 5.4-5.7 mm across at half brightness; S15 flags about 5 mm as odd for the scale]
  y0: 20, y1: 128,             // from inside the butt to inside the molding
};
export const shankAt = y => [SHANK.x0 - Math.tan(SHANK.lean) * y, y];
// the catcher shank: a dowel from the butt's player side out to the catcher head [e]
export const CATCHER_SHANK = { from: [-24, 15.5], to: [-45, 15], r: 3 };   // from 3 mm inside the butt
// the capstan: a wooden dowel on a wire screwed into the key [e: colour clip]
export const CAPSTAN = { x: -41, top: -109, dowelBottom: -129, keyTop: -149, r: 5.5, wireR: 1.5 };
// the let-off screw's eye: ring and wire radius [e: about 5.2 mm across]
export const EYE = { R: 2.0, r: 0.6 };
// the strap's thickness (cloth tape) [T]
export const STRAP_T = 0.8;

// ---------- forks round the centre pins, screws, offsets across the keyboard: how the parts join [T] ----------
// None of these show in a side view; they are the usual construction, until Greg's bench photos show his action's.
// Butt: below y the butt narrows to its tongue, between the flange's two cheeks; the cheeks are rounded about the pin.
export const BUTT_FORK = { y: 3.5, tongue: 4.6, cheekR: 5, cheekBottom: -6 };
// Wippen: between these x it is two cheeks round the flange's tongue (4 thick).
export const WIPPEN_FORK = { x: [-5, 7.5], tongue: 4 };
// Damper flange: from this x on it is two cheeks round the lever.
export const DAMPER_FORK = { x: 17 };
// Flange screws: the head's underside at p, going in along dir.
export const SCREWS = {
  buttFlange: { p: [-7, -17], dir: [0, -1], len: 16 },     // down through the foot's shelf into the rail's top
  wippenFlange: { p: [10, -55], dir: [-1, 0], len: 14 },   // through the plate into the rail's back face
  damperFlange: { p: [10, -26], dir: [-1, 0], len: 14 },   // through the foot into the rail's back face
};
// The bridle wire stands this far toward the treble of the backcheck wire (z, + toward the bass as everywhere): on
// the filmed model its hook sits beside the backcheck wire, so the strap hangs in the bridle wire's plane, clear of the
// backcheck wire (Greg 2026-11-08: it read as hooked on the backcheck). The strap leaves the catcher at STRAP_Z0 and
// runs over to the wire as it hangs [T: the side offsets aren't in the side-on clips].
export const BRIDLE_Z = -4.5;
export const STRAP_Z0 = -1.5;

// ---------- the rails: placed by the filmed model's faces, their sections stand-ins [T] ----------
// The filmed model is a one-note model on a cast stand: a metal bracket in place of the main rail, a wire loop with a
// felt pad for the hammer rail, a rod and block for the let-off rail. The sim draws a piano's wooden rails, each face
// where the filmed part's face is.
// Main (action) rail: butt flanges on its top, wippen flanges under it, damper flanges on its back face.
export const MAIN_RAIL = [[-9, -60], [6, -60], [6, -24], [-9, -24]];
// Hammer rail: its felt touches the shank along the shank's player-side edge, about at [-36, 75] [e: S15]; the felt is
// laid along the shank so they meet on a line, 8 mm thick, on an 18 mm rail [T]. Built from the shank's line below.
export const HAMMER_RAIL = (() => {
  const c = Math.cos(SHANK.lean), s = Math.sin(SHANK.lean), n = [-c, -s];   // toward the player, square to the shank
  const edge = y => [SHANK.x0 - Math.tan(SHANK.lean) * y - SHANK.r / c, y];
  const off = (p, d) => [p[0] + n[0] * d, p[1] + n[1] * d];
  const a = edge(58), b = edge(89);
  return { felt: [a, b, off(b, 8), off(a, 8)], wood: [off(a, 8), off(b, 8), off(b, 26), off(a, 26)] };
})();
// Let-off rail: the regulating screw threads down through it to the button [T: the filmed block, X -54..-41, run on]
export const LETOFF_RAIL = [[-56, -35], [-38, -35], [-38, -44], [-56, -44]];

// ---------- widths across the keyboard (z) ----------
// Head width from Renner's upright hammers [S16: Renner USA catalog p. 22, U3/U4 3/8-13/32 in]; the rest [T].
export const WIDTH = {
  head: 10, butt: 10.5, catcher: 9, flange: 9, wippen: 10, jack: 6, jackFlange: 2, damperLever: 9, damperFlange: 8,
  damperHead: 12, backcheck: 10, strap: 6, key: 21, pitch: 23.5,
};

// =====================================================================================================================
// Kinematics (C2): where every part is for a key depth and a regulation, quasi-statically. No dynamics yet (C3).
// Angles, radians, each about its part's centre pin, 0 at the traced rest pose:
//   th   key, + = front down (it rocks on the balance rail punching)
//   phi  wippen, + = rising (turning toward the strings at its front: clockwise in this view)
//   psi  jack on the wippen, + = tripped (its top toward the player)
//   g    hammer, + = toward the strings (clockwise)
//   dl   damper lever, + = the head lifted off the strings (its lower end pushed toward the strings)
// =====================================================================================================================
const rot = ([x, y], a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
// a point drawn at rest on a part, with the part turned by a (counter-clockwise) about its centre c
export const turn = (p, c, a) => add(c, rot(sub(p, c), a));
// x with f(x) = target, f monotonic on [lo, hi] (either way); clamped to the ends
function solve(f, target, lo, hi, n = 60) {
  let flo = f(lo) - target;
  if (flo * (f(hi) - target) > 0) return Math.abs(flo) < Math.abs(f(hi) - target) ? lo : hi;
  for (let i = 0; i < n; i++) {
    const m = (lo + hi) / 2, fm = f(m) - target;
    if (fm * flo > 0) { lo = m; flo = fm; } else hi = m;
  }
  return (lo + hi) / 2;
}

// keep a function's answers for the arguments it has seen (the slow press asks the same regulation-only questions at
// every key depth)
function memo(fn) {
  const m = new Map();
  return (...args) => {
    const k = args.join(',');
    if (!m.has(k)) { if (m.size > 4000) m.clear(); m.set(k, fn(...args)); }
    return m.get(k);
  };
}

// ---------- polygons (outlines turned with their parts) ----------
const inside = ([x, y], P) => {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [xi, yi] = P[i], [xj, yj] = P[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
};
const segDist = (p, a, b) => {
  const ux = b[0] - a[0], uy = b[1] - a[1], t = Math.max(0, Math.min(1, ((p[0] - a[0]) * ux + (p[1] - a[1]) * uy) / (ux * ux + uy * uy)));
  return Math.hypot(p[0] - a[0] - t * ux, p[1] - a[1] - t * uy);
};
const crosses = (a, b, c, d) => {
  const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
};
// the gap between two outlines, mm; 0 when they touch or overlap
export function polyGap(P, Q) {
  if (P.some(p => inside(p, Q)) || Q.some(q => inside(q, P))) return 0;
  for (let i = 0; i < P.length; i++) for (let j = 0; j < Q.length; j++)
    if (crosses(P[i], P[(i + 1) % P.length], Q[j], Q[(j + 1) % Q.length])) return 0;
  let d = Infinity;
  for (const p of P) for (let j = 0; j < Q.length; j++) d = Math.min(d, segDist(p, Q[j], Q[(j + 1) % Q.length]));
  for (const q of Q) for (let i = 0; i < P.length; i++) d = Math.min(d, segDist(q, P[i], P[(i + 1) % P.length]));
  return d;
}

// ---------- the knobs: real operations, each with its direction named ----------
// Stand-in ranges and steps [T]: the capstan's thread pitch, the let-off screw's, and the felts' thicknesses are not
// measured yet (Greg's bench). The knob values are what the part physically moves, in mm.
export const ADJ = [
  { id: 'balPunch', name: 'Balance rail punchings (under the key)', unit: 'mm', min: 0, max: 4, step: 0.1 },
  { id: 'frontPunch', name: 'Front rail punchings (under the key front)', unit: 'mm', min: 0, max: 4, step: 0.05 },
  { id: 'railShim', name: 'Hammer rail rest felts: shim (toward the strings) or cut', unit: 'mm', min: -3, max: 6, step: 0.1 },
  { id: 'capstan', name: 'Capstan: turn the dowel up (+) or down its wire', unit: 'mm', min: -4, max: 4, step: 0.02 },
  { id: 'letoff', name: 'Let-off regulating screw: button down toward the jack (+) or up', unit: 'mm', min: -4, max: 4, step: 0.05 },
  // checking moves about 20 mm per mm of bend here, so the finest step is under half the tightest checking band (rule 3)
  { id: 'backcheck', name: 'Backcheck wire: bend the head toward the catcher (+) or away', unit: 'mm', min: -15, max: 6, step: 0.05 },
  { id: 'spoon', name: 'Spoon: bend toward the damper lever (+) or away', unit: 'mm', min: -4, max: 4, step: 0.05 },
  { id: 'bridle', name: 'Bridle wire: bend its top toward the player (+, tighter strap) or toward the catcher', unit: 'mm', min: -8, max: 8, step: 0.25 },
  { id: 'softFelt', name: 'Soft pedal travel at the hammer rail (its blocking felt)', unit: 'mm', min: 0, max: 30, step: 0.25 },
];

// ---------- the specs the factory regulates to (graded and levelled in C4) ----------
// A target comes from a source, never from what the model produces (protocol 3.2 rule 1). Bands hold each source's
// range; where sources differ the first is the sim's default. Where Greg has overridden the sources, his figure and its
// date stand instead (rule 1). A spec is a target with a tolerance, or a band (lo, hi) with or without a target.
export const SPEC = {
  // level with the neighbours (a straightedge across them); the tolerance is the grand's, the sim's own
  keyHeight: { target: 0, tol: 0.4, src: 'level with the neighbouring keys [S1, S2]; tolerance the sim\'s own' },
  dip: { target: 0.400 * IN, tol: 0.4, src: 'Steinway .400 in [S1]; 3/8 in+ consoles and larger [S2]' },
  // Greg's call, 2026-11-08 ("Shorter blow"): at the textbook 1-3/4 in this geometry leaves aftertouch at 0.44 mm and
  // escapement at 1.1, both short of their sources; at 0.400 in of dip a blow of 1-5/8 to 1-11/16 in brings both in.
  // The band is his window and the target, a scant 1-11/16 in, his. (Those figures counted let-off late: see FACTORY.
  // Counted from where the hammer drops, 1-3/4 in gives 0.64 and 1.07, still short; 42.5 mm gives 1.36 and 2.97, and
  // both are inside their bands from about 42.3 to 43.4 mm (with checking reset to 9/16 in; tests/upright-content.test.mjs), the middle near a full 1-11/16 in.)
  blow: { target: 42.5, lo: 1.625 * IN, hi: 1.6875 * IN, src: 'Greg 2026-11-08: 1-5/8 to 1-11/16 in, for aftertouch and escapement at 0.400 in dip. The sources: 1-3/4 in [S2]; 1-3/4 to 1-7/8 in studio uprights [S3]; Steinway about 1-7/8 [S1]' },
  // lo is functional: below JACK_CLEAR the jack can't get back under the cushion on a slow release [S2's test]. hi is
  // Igrec's figure for a worn action (double the new action's 0.1 mm), which is also where Spurlock's wholesale check
  // sits: a hammer following a pulled rail 1/16 in has 0.19 mm at the jack here; Steinway's 1/64 in of follow is 0.047.
  // Both must pass (critique 2026-11-09, U5).
  lostMotion: { target: 0.08, lo: 0.04, hi: 0.2, src: 'the least that lets the jack return [S2]; the hammer follows a pulled rail about 1/64 in [S1] to 1/16 in [S2]; under 0.004 in (0.1 mm) on a new action, up to double that on a worn one [S3]' },
  letoff: { target: 0.125 * IN, tol: 0.8, src: '1/8 in [S2]; Steinway 1/16 in [S1]' },
  check: { target: 0.5625 * IN, lo: 0.5 * IN, hi: 0.625 * IN, src: '5/8 in [S2, S11]; Steinway 1/2 in [S1]: graded 1/2 to 5/8, both pass at every level' },
  damperTiming: { target: 0.5, tol: 0.1, src: 'the damper starts with the hammer about halfway [S1, S2]' },
  aftertouch: { lo: 1.0, hi: 1.5, src: '0.040-0.060 in [S3]; Steinway about a new penny [S1]' },
  escapement: { lo: 0.0625 * IN, hi: 0.125 * IN, src: 'jack 1/16-1/8 in clear of the butt leather, key held after a medium blow [S2]' },
  softPedal: { target: 0.5, tol: 0.1, src: 'the soft pedal moves the hammers halfway to the strings [S1, S2]' },
  // functional: soft pedal down, the strap must not lift the wippen [S1, S2]; its slack is a reading (rule 4: no
  // published figure). Ellis set straps with just enough slack for that [S14]
  bridle: { functional: true, src: 'soft pedal down: the wippens don\'t move [S1, S2]; just enough slack for that [S14]' },
  // the parts' condition (C5): sound, or worn or broken (DAMAGE), found by looking or by a hand test, put right by a repair
  buttLeather: { functional: true, src: 'butt leather not grooved [S2: worn butt leather]' },
  catcherLeather: { functional: true, src: 'catcher buckskin not worn smooth [T]' },
  jackSpring: { functional: true, src: 'the jack springs back under the butt [S3 fig. 338]' },
  damperSpring: { functional: true, src: 'the damper snaps back when pulled off the spoon [S3]' },
  buttSpring: { functional: true, src: 'the butt spring whole and seated [S3]' },
  buttCenter: { functional: true, src: 'the butt center free but not wobbly [S2]; Igrec\'s table [S3]' },
  strap: { functional: true, src: 'the bridle strap whole and hooked [S1, S2]' },
};
// a spec's pass band, [lo, hi]
export const band = s => s.lo !== undefined ? [s.lo, s.hi] : [s.target - s.tol, s.target + s.tol];
// the room (mm) the jack needs between its top and the cushion to get back under the butt at rest: below it a slow
// release leaves the jack hanging on the butt leather [T: the sim's own figure, set just under what Steinway's 1/64 in
// of rail follow leaves at the jack here (0.047 mm): "less means the jack may hang" [S1]]
export const JACK_CLEAR = 0.04;
const EDGE = 0.05;   // mm: a jack held out by the cushion's player-side end stands this far off it

// ---------- the key (stand-in geometry, KEY) ----------
// Its frame: origin on the underside at the balance pin, drawn level; it rests on its back rail cloth at the back end.
// The rails and punchings under it are stand-ins [T]; the scene draws them from these.
export const KEY_RAILS = {
  back: { x: KEY.backX - 15, y: KEY.bottomY },                   // back rail cloth top under the key's back end
  balTop: KEY.bottomY - 1.5,                                     // balance rail top: 1.5 mm of punchings gives the level key
  pinX: 12,                                                      // front rail pin, sim x
  frontTop: KEY.bottomY - KEY.dip - 1,                           // front rail top: 1 mm of punchings gives the 0.400 in dip
};
const CAP_LOCAL = [H[0] + CAPSTAN.x - KEY.balX, KEY.thick];       // the capstan wire's foot, key frame
export function keyRest(a) {
  const bal = KEY_RAILS.balTop + a.balPunch;
  const th0 = Math.atan2(KEY_RAILS.back.y - bal, KEY_RAILS.back.x - KEY.balX);   // back end down on its rail: front up if bal is high
  return { bal, th0 };
}
// a key-frame point in the sim frame, key at angle th
export const keyPt = (bal, th, p) => add([KEY.balX, bal], rot(p, th));
const frontTop = (bal, th) => keyPt(bal, th, [-KEY.balX, KEY.thick])[1];
// key angle for a front depth d (mm the key front's top has gone down from rest)
export function keyAngle(a, d) {
  const { bal, th0 } = keyRest(a), y0 = frontTop(bal, th0);
  return { bal, th: solve(t => y0 - frontTop(bal, t), d, th0 - 0.05, th0 + 0.2) };
}
// dip: the key front's travel until it lands on the front rail punching
export function dipOf(a) {
  const { bal, th0 } = keyRest(a), punch = KEY_RAILS.frontTop + a.frontPunch;
  const th = solve(t => keyPt(bal, t, [KEY_RAILS.pinX - KEY.balX, 0])[1], punch, th0, th0 + 0.2);
  return frontTop(bal, th0) - frontTop(bal, th);
}
export const keyHeightOf = a => { const { bal, th0 } = keyRest(a); return frontTop(bal, th0); };
// the neighbouring keys' height: they stay at the factory's 1.5 mm of balance punchings
export const NEIGHBOR_H = keyHeightOf({ balPunch: 1.5 });
export const keyFrontTop = (a, d) => { const k = keyAngle(a, d); return keyPt(k.bal, k.th, [-KEY.balX, KEY.thick]); };

// ---------- the wippen on the capstan ----------
// the capstan dowel's flat top (action frame): its centre, and the two ends of its rim in the side view
export function capstanTop(a, k, dx = 0) {
  return sub(keyPt(k.bal, k.th, [CAP_LOCAL[0] + dx, CAP_LOCAL[1] + CAPSTAN.top - CAPSTAN.keyTop + a.capstan]), H);
}
// The cushion's flat underside, wippen-local: the dowel's top lifts it at the top's centre. As the key and wippen tilt
// apart a rigid cushion would ride on the dowel's string-side rim: that turns the wippen 11.2 degrees over the filmed
// 9.6 mm press, against the 9.4-10 the filmed checked frame shows (research/upright/parts/README.md); at the centre,
// 10.1. The felt gives, so the centre it is.
const CUSHION_V = Math.min(...TRACE.heelCushion.map(p => p[1])) - CENTER.wippen[1];
export function wippenOn(c) {
  return solve(phi => rot(sub(c, CENTER.wippen), phi)[1], CUSHION_V, -0.4, 0.6);
}
const W = CENTER.wippen, J0 = CENTER.jack;
export const wipPt = (phi, p) => turn(p, W, -phi);
// a point drawn on the jack, the wippen at phi and the jack at psi
export const jackPt = (phi, psi, p) => wipPt(phi, turn(p, J0, psi));

// ---------- the jack, the let-off button and the jack stop ----------
// The jack outline is listed from the toe's tip: its points 1-2 are the toe's top, under the button. Its two highest
// points are its top face, rising to the string-side corner.
const TOE_TOP = [TRACE.jack[1], TRACE.jack[2]];
const TOP_FACE = [...TRACE.jack].sort((p, q) => q[1] - p[1]).slice(0, 2).sort((p, q) => p[0] - q[0]);
export const CORNER = TOP_FACE[1];
const BUTTON_Y = Math.min(...TRACE.letoffFelt.map(p => p[1]));   // the button felt's face at factory 0 [e]
const BUTTON_X = [Math.min(...TRACE.letoffFelt.map(p => p[0])), Math.max(...TRACE.letoffFelt.map(p => p[0]))];
// the cushion's underside, butt frame: flat (its traced rounded ends left out) [e]
const CUSH_FACE = { y: Math.min(...TRACE.buttCushion.map(p => p[1])), x: [Math.min(...TRACE.buttCushion.map(p => p[0])), Math.max(...TRACE.buttCushion.map(p => p[0]))] };
// The toe's highest point under the button's face (as the toe tilts it moves along the toe's top), taken at 17 points
// along the toe's top. So the jack's angle steps a little where the contact moves from one point to the next, and the
// jack's top with it (a few hundredths of a millimetre): the Sim keeps those steps from throwing the hammer (LIFT_RATIO).
// The exact edge would be smooth, but it turns the jack a hair farther at the bottom of the key: the jack's clearance
// reads 0.22 mm more, which at the 42.5 mm blow puts the factory regulation over the top of Spurlock's 1/8 in. Left
// sampled until the blow target is looked at again (critique 2026-11-09, U1: the factory sits at the window's edge).
const TOE_SAMPLES = Array.from({ length: 17 }, (_, i) => [TOE_TOP[0][0] + (TOE_TOP[1][0] - TOE_TOP[0][0]) * i / 16, TOE_TOP[0][1] + (TOE_TOP[1][1] - TOE_TOP[0][1]) * i / 16]);
function toeHigh(phi, psi) {
  let y = -Infinity;
  for (const p of TOE_SAMPLES) { const q = jackPt(phi, psi, p); if (q[0] >= BUTTON_X[0] && q[0] <= BUTTON_X[1]) y = Math.max(y, q[1]); }
  return y;
}
// the jack's tripping angle: the button holds the toe down once the wippen lifts it there
export function jackPsi(a, phi) {
  const by = BUTTON_Y - a.letoff;
  if (toeHigh(phi, 0) <= by) return 0;
  return solve(psi => toeHigh(phi, psi), by, 0, 0.8, 40);
}
// does the jack's arm touch the jack stop felt (fixed to the frame) at this angle; and the first angle at which it does
const stopTouching = (phi, psi) => polyGap(TRACE.jack.map(p => jackPt(phi, psi, p)), TRACE.jackStopFelt) === 0;
function stopPsi(phi, psi) {
  let lo = 0, hi = psi;
  for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (stopTouching(phi, m)) hi = m; else lo = m; }
  return lo;
}
// The jack's top corner in the butt's frame (the butt turned by -g): its gap under the cushion (mm), and whether it has
// slid off the cushion's player-side end (let-off: the jack escapes toward the player).
const cornerInButt = (phi, psi, g) => turn(jackPt(phi, psi, CORNER), CENTER.butt, g);
export const jackGap = (phi, psi, g) => CUSH_FACE.y - cornerInButt(phi, psi, g)[1];
export const escaped = (phi, psi, g) => cornerInButt(phi, psi, g)[0] < CUSH_FACE.x[0];

// ---------- the hammer ----------
// the shank's player-side edge rests on the hammer rail felt; the rail sits shim mm toward the strings, square to its face
export const RAIL_N = [Math.cos(SHANK.lean), Math.sin(SHANK.lean)];   // toward the strings, square to the felt face
const RAIL_FACE = HAMMER_RAIL.felt.slice(0, 2);
export const gRail = (a, soft = false) => gRailAt(a.railShim + (soft ? a.softFelt : 0));
const gRailAt = memo(s => {
  const face = RAIL_FACE.map(p => add(p, [RAIL_N[0] * s, RAIL_N[1] * s]));
  // the shank's axis, turned by -g: its distance from the face's points, less the radius
  const clear = g => {
    const p0 = turn(shankAt(0), CENTER.butt, -g), p1 = turn(shankAt(100), CENTER.butt, -g);
    const ux = p1[0] - p0[0], uy = p1[1] - p0[1], l = Math.hypot(ux, uy);
    return Math.min(...face.map(f => (ux * (f[1] - p0[1]) - uy * (f[0] - p0[0])) / l)) - SHANK.r;   // + on the player side (left of the axis, which runs up toward the player)
  };
  return solve(g => -clear(g), 0, -0.3, 0.6);
});
// the crown's gap to the strings at hammer angle g (the felt's nearest point; negative: past them)
export function stringGap(g) {
  return Math.min(...TRACE.headFelt.map(p => { const q = turn(p, CENTER.butt, -g); return stringX(q[1]) - q[0]; }));
}
export const gString = memo(() => solve(stringGap, 0, 0, 0.8));
// the hammer lifted by the jack: the angle at which the cushion sits on the jack's corner
export const gOnJack = (phi, psi) => solve(g => jackGap(phi, psi, g), 0, -0.3, 0.8);
// Until the button trips it, the jack's top keeps its place under the butt: through the lost motion it rises without
// drifting toward the strings, and lifting it rides with the cushion, the jack turning on its pin to follow the butt.
// Left free, the top would drift about 4 mm toward the strings per mm it rises (it stands 89 mm above the wippen's pin)
// and slide under the cushion: the traced layout would then swing the hammer only about 11 degrees for the capstan's
// rise, against 17 riding (S15: 18 to the strings, crown-per-capstan 5.9-6.7), and with the soft pedal down the top
// would pass the cushion altogether. What holds it: its spring presses it against the butt felt, the larger red felt
// hanging below the butt on its string side, which turns with the butt [S17 Kawai US 7,408,102; S18 Renner's guide,
// which calls it the hammer butt cushion]. The felt isn't a contact here: the filmed model shows 3-4 mm of daylight
// between it and the traced jack, so this rule stands in for it (research/upright/parts/butt.md, Open).
const JACK_ARM = Math.hypot(...sub(CORNER, J0));
// the jack's angle that keeps its corner at x in the butt's frame (hammer at g), the wippen at phi
const psiAtX = (phi, g, x) => solve(psi => cornerInButt(phi, psi, g)[0], x, -0.4, 0.8, 40);
// where the corner meets the cushion: the wippen angle then, and the spot (butt frame); x is its place under the butt.
// It depends only on the regulation, not the key's depth: kept for the next poses of a press.
const contactOn = memo((gr, x) => ({ phiC: solve(phi => jackGap(phi, psiAtX(phi, gr, x), gr), 0, -0.1, 0.4, 40), q: [x, CUSH_FACE.y] }));
// the wippen's angle with the key at rest, and the corner's place under the butt then (regulation only)
const restPlace = memo((balPunch, capstan, gr) => {
  const a = { balPunch, capstan }, phi0 = wippenOn(capstanTop(a, keyAngle(a, 0)));
  return cornerInButt(phi0, 0, gr)[0];
});
// the hammer and jack angles with the corner held at its spot on the cushion, the wippen at phi
function chain(phi, c) {
  const jw = wipPt(phi, J0);
  const g = solve(g => Math.hypot(...sub(turn(c.q, CENTER.butt, -g), jw)), JACK_ARM, -0.3, 0.8);
  const qw = turn(c.q, CENTER.butt, -g), r = rot(sub(CORNER, J0), -phi);
  return { g, psi: Math.atan2(qw[1] - jw[1], qw[0] - jw[0]) - Math.atan2(r[1], r[0]) };
}

// ---------- the backcheck and the catcher ----------
// Bending the wire turns the head (and the wire above its bend) about the bend; the knob is mm at the felt face.
export const BC_BEND = TRACE.backcheckWire[1];                     // the bend: just above where the wire leaves the wippen [T]
const BC_FACE_MID = (() => {                                       // the middle of the felt's face toward the catcher
  const f = [...TRACE.backcheckFelt].sort((p, q) => q[0] - p[0]).slice(0, 2);
  return [(f[0][0] + f[1][0]) / 2, (f[0][1] + f[1][1]) / 2];
})();
const BC_ARM = Math.hypot(...sub(BC_FACE_MID, BC_BEND));
export const bcAngle = a => -a.backcheck / BC_ARM;                 // + toward the strings: clockwise about the bend
const bcPoly = (a, phi) => TRACE.backcheckFelt.map(p => wipPt(phi, turn(p, BC_BEND, bcAngle(a))));
const catcherPoly = g => TRACE.catcherHead.map(p => turn(p, CENTER.butt, -g));
// the hammer coming back from the strings with the wippen at phi: the angle where the catcher first meets the
// backcheck felt (no give in the felt: the filmed felt squashes about 6 mm, research/upright/parts/README.md)
export function gCheck(a, phi) {
  const gs = gString(), hit = g => polyGap(catcherPoly(g), bcPoly(a, phi)) === 0;
  if (hit(gs)) return { g: gs, scrapes: true };                    // in the catcher's way even at the strings
  let lo = gs, step = 0.01;
  for (let g = gs - step; g > -0.2; g -= step) {
    if (hit(g)) { let hi = lo, l2 = g; for (let i = 0; i < 30; i++) { const m = (hi + l2) / 2; if (hit(m)) l2 = m; else hi = m; } return { g: hi, scrapes: false }; }
    lo = g;
  }
  return { g: null, scrapes: false };                              // misses
}

// ---------- the damper ----------
// the spoon's tip (a wire, r 1) pushes the lever's felt; bending it moves the tip along the wippen, toward the lever
// (bent about its foot on the wippen: the knob is mm the tip moves toward the lever)
const SPOON_TIP = TRACE.spoon.at(-1), SPOON_R = 1;
export const SPOON_BASE = TRACE.spoon[0];
export const spoonAngle = a => -a.spoon / (SPOON_TIP[1] - SPOON_BASE[1]);
const LEVER_FACE_X = Math.min(...TRACE.leverFelt.map(p => p[0]));
export const spoonTip = (a, phi) => wipPt(phi, turn(SPOON_TIP, SPOON_BASE, spoonAngle(a)));
export function damperAngle(a, phi) {
  const t = spoonTip(a, phi), D = CENTER.damper;
  const reach = dl => turn(t, D, -dl)[0] + SPOON_R - LEVER_FACE_X;   // the tip in the lever's frame: > 0 pushes into the felt
  if (reach(0) <= 0) return 0;
  return solve(reach, 0, 0, 0.6);
}

// ---------- the bridle strap ----------
const STRAP = TRACE.strap;
export const STRAP_LEN = STRAP.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - STRAP[i][0], q[1] - STRAP[i][1]), 0);
const BRIDLE_HOOK = TRACE.bridleWire.at(-1);
export const BRIDLE_BASE = TRACE.bridleWire[0];
const BRIDLE_ARM = Math.hypot(...sub(BRIDLE_HOOK, BRIDLE_BASE));
// bending the wire's top toward the player turns it counter-clockwise about its base
export const bridleAngle = a => a.bridle / BRIDLE_ARM;
export const strapEnds = (a, phi, g) => [turn(STRAP[0], CENTER.butt, -g), wipPt(phi, turn(BRIDLE_HOOK, BRIDLE_BASE, bridleAngle(a)))];
// slack: how much longer the strap is than the distance between its ends (negative: it would have to stretch)
export function strapSlack(a, phi, g) { const [f, k] = strapEnds(a, phi, g); return STRAP_LEN - Math.hypot(...sub(f, k)); }

// The slack the factory leaves in the strap with the soft pedal down, mm [T: the sim's figure for Ellis's "just enough
// slack to pass the soft pedal test" [S14]: three steps of the bridle wire short of lifting the wippen]. With it the
// strap goes taut for a moment on a quick release from check and brings the hammer home sooner, as S15 filmed: at the
// factory regulation 111 ms against 125 without the strap (film 110 and 126). Until 2026-11-09 the factory wire stood
// at its traced place, 1.5 mm of soft-pedal slack, and the strap never pulled (critique, U9).
export const BRIDLE_SOFT_SLACK = 0.75;

// ---------- one pose ----------
// The key held at depth d on a slow press (or held down after a blow, held: true: the jack has escaped and the hammer
// sits where the backcheck caught it). soft: the soft pedal down.
export function pose(a, d, { soft = false, held = false } = {}) {
  const k = keyAngle(a, d), phi = wippenOn(capstanTop(a, k)), gr = gRail(a, soft);
  const c = contactOn(gr, restPlace(a.balPunch, a.capstan, gr));  // the corner's place under the butt, key at rest
  let psi, g = gr, on = 'rail', check = null, rests = false;
  // through the lost motion the jack rises in place; past it the jack carries the butt round
  if (phi > c.phiC) { ({ g, psi } = chain(phi, c)); on = 'jack'; if (g < gr) { g = gr; on = 'rail'; } }
  else psi = psiAtX(phi, gr, c.q[0]);
  // the let-off button turns the jack further toward the player than the butt holds it: its top slides along the
  // cushion toward the player and comes off its end (let-off)
  const pb = jackPsi(a, phi);
  if (pb > psi) {
    psi = pb;
    g = Math.max(gr, gOnJack(phi, psi)); on = g > gr ? 'jack' : 'rail';
    if (escaped(phi, psi, g)) on = 'off';
  }
  // the jack stop: the button turning the jack into it jams the key there
  const jammed = stopTouching(phi, psi);
  if (jammed) {
    psi = stopPsi(phi, psi);
    if (on === 'jack') g = Math.max(gr, gOnJack(phi, psi));
  }
  // a jack that hasn't let off when the hammer reaches the strings holds it there: the key blocks
  const gs = gString(), blocked = on === 'jack' && g > gs;
  if (blocked) g = gs;
  if (held || on === 'off') {
    // the hammer, back from the strings, sits where the backcheck caught it, or on its rail
    check = gCheck(a, phi);
    g = gr; on = 'rail';
    if (check.g !== null && check.g > g) { g = check.g; on = 'backcheck'; }
    // a jack that hasn't let off still stands under the cushion: the hammer comes down on it, short of the backcheck
    // (no escapement: it blubbers there). The Sim's own test for let-off, so the two agree.
    const gc = gOnJack(phi, psi);
    if (!escaped(phi, psi, gc) && gc > g) { g = Math.min(gs, gc); on = 'jack'; check = null; }
    // let off, but the button hasn't yet turned the jack clear of the cushion where the hammer now sits: the cushion's
    // player-side end holds the jack out (it rests against the butt leather), as in the Sim
    else if (cornerInButt(phi, psi, g)[1] > CUSH_FACE.y - JACK_CLEAR) {
      const pe = psiAtX(phi, g, CUSH_FACE.x[0] - EDGE);
      if (pe > psi && !jammed) { psi = pe; rests = true; }
    }
  }
  return { d, th: k.th, bal: k.bal, phi, psi, g, dl: damperAngle(a, phi), on, jammed, blocked, check, soft, gRail: gr, rests,
    slack: strapSlack(a, phi, g) };
}

// ---------- readings ----------
// A slow press from rest to the bottom: where the hammer starts, where the damper starts, where the jack lets off.
export function slowPress(a, step = 0.02) {
  const dip = dipOf(a), rest = pose(a, 0);
  let moveAt = null, damperAt = null, letoffAt = null, letoffGap = null, lastOnJack = null, blockAt = null, closest = Infinity;
  for (let d = 0; d <= dip + 1e-9; d += step) {
    const p = pose(a, d);
    // blocked: the jack presses the hammer on the strings before it lets off, and the key stops there
    if (p.blocked) { blockAt = d; break; }
    if (moveAt === null && p.on === 'jack') moveAt = d;
    // the hammer's share of its travel when the damper starts; after let-off the hammer has fallen back, so a damper
    // that only starts then counts as late (1)
    if (damperAt === null && p.dl > 1e-4) damperAt = { d, share: letoffAt === null ? (stringGap(rest.g) - stringGap(p.g)) / stringGap(rest.g) : 1 };
    // let-off is the hammer's closest approach to the strings while the jack still carries it (with a very close let-off
    // the hammer sinks a little before the jack slips out)
    if (p.on === 'jack') { lastOnJack = p; closest = Math.min(closest, stringGap(p.g)); }
    else if (lastOnJack && letoffAt === null) { letoffAt = d; letoffGap = closest; }
  }
  return { dip, moveAt, damperAt, letoffAt, letoffGap, blockAt };
}
// the gap (mm) between the jack and the butt cushion: at rest it is the lost motion; held down, the escapement
const jackCushionGap = p => polyGap(TRACE.jack.map(q => jackPt(p.phi, p.psi, q)), TRACE.buttCushion.map(q => turn(q, CENTER.butt, -p.g)));
export function measure(a0) {
  const a = eff(a0), sp = slowPress(a), rest = pose(a, 0), soft = pose(a, 0, { soft: true });
  // the key held down after a blow; a key that blocks stops where the hammer meets the strings
  const bottom = sp.blockAt !== null ? pose(a, sp.blockAt) : pose(a, sp.dip, { held: true });
  const blow = stringGap(rest.g), lostMotion = jackGap(rest.phi, 0, rest.gRail);
  return {
    keyHeight: keyHeightOf(a) - NEIGHBOR_H, dip: sp.dip, blow,   // key height: mm above its neighbours
    lostMotion,                                            // jack top to butt cushion at rest, mm (S3's jack gap)
    lostMotionKey: sp.moveAt,                              // key travel before the hammer moves, mm
    jackReturns: lostMotion > JACK_CLEAR,                  // gets back under the butt on a slow release [S2's test]
    // the hammer rail pulled back from the shanks: how far the crown follows it before the cushion meets the jack
    // (none if the jack already holds the hammer off the rail) [S1 about 1/64 in; S2 about 1/16 in, wholesale]
    railFollow: lostMotion > 0 ? stringGap(gOnJack(rest.phi, rest.psi)) - blow : 0,
    letoff: sp.letoffGap, letoffDepth: sp.letoffAt,
    blocks: sp.blockAt !== null, blockDepth: sp.blockAt,   // the jack never lets off and jams the hammer on the strings
    aftertouch: sp.letoffAt === null ? null : sp.dip - sp.letoffAt,
    check: bottom.on === 'backcheck' ? stringGap(bottom.g) : null, checkScrapes: !!bottom.check?.scrapes,
    // key held after the blow, the hammer on the backcheck: 0 when the jack rests against the butt leather
    escapement: bottom.rests || bottom.on === 'jack' ? 0 : jackCushionGap(bottom), jackRests: bottom.rests,
    damperTiming: sp.damperAt?.share ?? null, damperDepth: sp.damperAt?.d ?? null,
    damperLift: bottom.dl * Math.hypot(...sub(TRACE.damperFelts[0][2], CENTER.damper)),   // the felt off the strings, mm
    softBlow: stringGap(soft.g), softPedal: 1 - stringGap(soft.g) / blow,
    strapSlack: rest.slack, softStrapSlack: soft.slack, softLifts: !a.noStrap && soft.slack <= 0,
    damage: a0.damage ?? null,
    jammed: bottom.jammed,
  };
}

// the capstan setting that gives this lost motion (a technician resets it after moving the rail or the key level)
export function capstanFor(a, lostMotion = SPEC.lostMotion.target) {
  return solve(v => { const p = pose({ ...a, capstan: v }, 0); return jackGap(p.phi, 0, p.gRail); }, lostMotion, 4, -4);
}

// ---------- the factory: each knob solved in the standard order to its spec ----------
// (protocol 3.1: blow and lost motion before key level and dip; let-off; checking; spoons; soft pedal)
// regulate() also says which specs it couldn't reach (a knob ran out of range): the searches stop at a range's end
// without complaint, so this is where that shows.
export function regulate(a0 = {}) {
  const a = factory(a0), m = measure(a), missed = [];
  for (const k of ['dip', 'blow', 'lostMotion', 'letoff', 'check', 'damperTiming', 'softPedal']) {
    const [lo, hi] = band(SPEC[k]);
    if (m[k] === null || m[k] < lo - 1e-9 || m[k] > hi + 1e-9) missed.push(k);
  }
  return { a, m, missed };
}
export function factory(a0 = {}) {
  const a = { balPunch: 1.5, frontPunch: 1, railShim: 0, capstan: 0, letoff: 0, backcheck: 0, spoon: 0, bridle: 0, softFelt: 10, ...a0 };
  for (let pass = 0; pass < 2; pass++) {
    a.railShim = solve(v => stringGap(gRail({ ...a, railShim: v })), SPEC.blow.target, -3, 6);
    a.capstan = capstanFor(a);
    a.frontPunch = solve(v => dipOf({ ...a, frontPunch: v }), SPEC.dip.target, 4, 0);
    // a button too high never trips the jack: count that as letting off at the strings, so the search keeps one direction
    a.letoff = solve(v => slowPress({ ...a, letoff: v }, 0.05).letoffGap ?? -1, SPEC.letoff.target, -4, 4, 30);
    a.backcheck = solve(v => { const p = pose({ ...a, backcheck: v }, dipOf(a), { held: true }); return p.on === 'backcheck' ? stringGap(p.g) : 99; },
      SPEC.check.target, -15, 6, 40);
    a.spoon = solve(v => slowPress({ ...a, spoon: v }, 0.05).damperAt?.share ?? 1, SPEC.damperTiming.target, -4, 4, 30);
    a.softFelt = solve(v => 1 - stringGap(gRail({ ...a, softFelt: v }, true)) / SPEC.blow.target, SPEC.softPedal.target, 0, 30);
    // the bridle wire last: just enough slack that the soft pedal doesn't lift the wippen (Ellis's setting [S14])
    a.bridle = solve(v => { const b = { ...a, bridle: v }, p = pose(b, 0, { soft: true }); return strapSlack(b, p.phi, p.g); }, BRIDLE_SOFT_SLACK, 8, -8);
  }
  for (const k of Object.keys(a)) a[k] = +a[k].toFixed(4);
  return a;
}

// ---------- damage (C5): worn or broken parts, put right by a repair, not a knob ----------
// Each is written as what it does: to the knobs it imitates (adj, added to them, or a flag), or to the Sim's constants
// (dyn, a factor on DYN). Sizes are the sim's own [T], set so the action shows the customer's complaint and nothing
// bigger (protocol 3.4; tests/upright-scenarios.test.mjs). spec: the condition check that finds it.
export const DAMAGE = {
  // modelled as the groove's depth at the jack, nothing more: 0.23 mm more lost motion (as the capstan 0.5 mm lower)
  buttLeather: { spec: 'buttLeather', name: 'Butt leather worn', adj: { capstan: -0.5 }, part: 'cushion', repair: 'Re-cover the butt: new felt and buckskin',
    signs: 'a groove worn in the butt leather where the jack lifts it' },
  // modelled as the thickness the buckskin has lost, nothing more: the backcheck meets the catcher 0.45 mm later. The
  // slick leather sliding through the check on a hard blow is not modelled (the backcheck is a rigid outline: U4)
  catcherLeather: { spec: 'catcherLeather', name: 'Catcher buckskin worn', adj: { backcheck: -0.45 }, part: 'catcher', repair: 'Re-cover the catcher with new buckskin',
    signs: 'the catcher\'s buckskin worn thin and slick' },
  jackSpringWeak: { spec: 'jackSpring', name: 'Jack spring weak', dyn: { jackRate: 0.12 }, part: 'jackspring', repair: 'Replace the jack spring',
    signs: 'the jack creeps back under the butt' },
  jackSpringBroken: { spec: 'jackSpring', name: 'Jack spring broken', dyn: { jackRate: 0 }, part: 'jackspring', repair: 'Replace the jack spring',
    signs: 'the jack stays where it is pushed: its spring is broken' },
  damperSpringWeak: { spec: 'damperSpring', name: 'Damper spring weak', dyn: { damperAlpha: 0.005 }, part: 'dspring', repair: 'Replace the damper spring',
    signs: 'the damper drifts back to the strings' },
  damperSpringBroken: { spec: 'damperSpring', name: 'Damper spring broken', dyn: { damperAlpha: 0 }, part: 'dspring', repair: 'Replace the damper spring',
    signs: 'the damper stays off the strings: its spring is broken' },
  // without its spring the hammer comes home on its weight alone (and the strap's tug): slower in every case, as S15
  // filmed (118 ms against 110 with the strap, 218 against 126 without)
  buttSpringBroken: { spec: 'buttSpring', name: 'Butt spring broken', adj: { noSpring: true }, part: 'buttspring', repair: 'Replace the butt spring',
    signs: 'the butt spring is broken: nothing but its own weight brings the hammer back' },
  buttCenterTight: { spec: 'buttCenter', name: 'Butt center tight', dyn: { frictionT: 6 }, part: 'hcenter', repair: 'Ease or repin the butt center',
    signs: 'the hammer drags on its center pin' },
  strapBroken: { spec: 'strap', name: 'Bridle strap broken', adj: { noStrap: true }, part: 'strap', repair: 'Replace the bridle strap',
    signs: 'the bridle strap is broken and hangs from the catcher' },
};
// the regulation with its damage folded in: what the parts actually do
export function eff(a) {
  const d = DAMAGE[a.damage];
  if (!d?.adj) return a;
  const e = { ...a };
  for (const [k, v] of Object.entries(d.adj)) e[k] = typeof v === 'number' ? (a[k] ?? 0) + v : v;
  return e;
}

// ---------- grading ----------
// Pass or fail for one spec, with what's wrong in a technician's words; k scales the tolerance (skill level: 1.5
// Apprentice, 1 Journeyman, 0.75 the top level). A band from a source's range (lo, hi) only widens: at k <= 1 the
// source's own range stands, so its endpoints always pass (protocol 3.2 rule 2). Functional specs don't scale.
export function grade(id, m, k = 1) {
  const s = SPEC[id], v = m[id];
  // a part's condition: sound, or what is wrong with it
  if (s.functional && id !== 'bridle') {
    const d = DAMAGE[m.damage];
    return d?.spec === id ? { ok: false, v: null, note: d.signs } : { ok: true, v: null, note: '' };
  }
  if (id === 'bridle') return m.softLifts ? { ok: false, v: m.strapSlack, note: 'soft pedal down, the strap lifts the wippen: the key goes out of level' }
    : { ok: true, v: m.strapSlack, note: '' };
  if (id === 'letoff' && v == null) return { ok: false, v: null, note: m.blocks ? 'blocks: the jack never lets off and jams the hammer on the strings'
    : 'no let-off: the key bottoms before the jack trips out' };
  if ((id === 'aftertouch' || id === 'escapement') && m.letoff == null) return { ok: false, v: null, note: 'no let-off' };
  if (id === 'aftertouch' && m.jammed) return { ok: false, v, note: 'the jack jams against the jack stop at the bottom' };
  if (id === 'check' && m.letoff == null) return { ok: false, v: null, note: 'the jack never lets off, so the hammer is never checked' };
  if (id === 'check' && v == null) return { ok: false, v: null, note: m.checkScrapes ? 'the catcher scrapes the backcheck on the way up' : 'the backcheck misses the catcher' };
  if (id === 'check' && m.checkScrapes) return { ok: false, v, note: 'the catcher scrapes the backcheck on the way up' };
  if (id === 'damperTiming' && v == null) return { ok: false, v: null, note: 'the key never lifts the damper' };
  // the jack holds the hammer off its rail: moving the rail can't move it (lower the capstan first)
  if (id === 'blow' && m.lostMotion <= 0 && (v < band(s)[0] || v > band(s)[1])) return { ok: false, v, note: 'the jack holds the hammer off its rail, so the rail can\'t set it: turn the capstan down first' };
  if (id === 'lostMotion' && v <= 0) return { ok: false, v, note: 'none: the jack holds the hammer off its rail' };
  if (id === 'lostMotion' && !m.jackReturns) return { ok: false, v, note: 'too little: the jack can\'t get back under the butt on a slow release' };
  if (id === 'escapement' && v <= 0.05) return { ok: false, v, note: 'the jack rests against the butt leather: it gets in the way of the checking' };
  let [lo, hi] = band(s);
  if (s.lo === undefined) { lo = s.target - s.tol * k; hi = s.target + s.tol * k; }
  else if (k > 1) { const c = (lo + hi) / 2, h = (hi - lo) / 2 * k; [lo, hi] = id === 'lostMotion' ? [lo, s.target + (hi - s.target) * k] : [c - h, c + h]; }
  if (v < lo - 1e-9) return { ok: false, v, note: LOW[id] ?? 'too low' };
  if (v > hi + 1e-9) return { ok: false, v, note: HIGH[id] ?? 'too high' };
  return { ok: true, v, note: '' };
}
const LOW = {
  keyHeight: 'low', dip: 'shallow', blow: 'short', letoff: 'too close to the strings', aftertouch: 'too little',
  escapement: 'too little: the jack sits close to the butt leather', check: 'checks too close to the strings',
  damperTiming: 'lifts early', softPedal: 'the soft pedal moves the hammers too little',
};
const HIGH = {
  keyHeight: 'high', dip: 'deep', blow: 'long', lostMotion: 'too much: the key is loose at the top', letoff: 'too far from the strings',
  aftertouch: 'too much', escapement: 'too much: the key has to come up farther to repeat', check: 'checks too far from the strings',
  damperTiming: 'lifts late', softPedal: 'the soft pedal moves the hammers too far',
};
// Exam evenness (upright-app.js): how far a reading may spread across the three notes. One note's own tolerance (half
// its band, scaled by the level), but never finer than one step of a paper front punching or of the capstan moves that
// reading on this action: at the top level checking's 1.19 mm was less than the 1.7 mm one .002 in punching moves it
// (critique 2026-11-09, U17; the size of that move is the rigid backcheck's, U4).
let STEP_MOVES = null;
export function evenTol(id, k = 1) {
  if (!STEP_MOVES) {
    const base = measure(FACTORY); STEP_MOVES = {};
    for (const knob of ['frontPunch', 'capstan']) for (const dir of [-1, 1]) {
      const m = measure({ ...FACTORY, [knob]: FACTORY[knob] + dir * ADJ.find(d => d.id === knob).step });
      for (const key of Object.keys(SPEC)) if (typeof m[key] === 'number' && typeof base[key] === 'number') STEP_MOVES[key] = Math.max(STEP_MOVES[key] ?? 0, Math.abs(m[key] - base[key]));
    }
  }
  const s = SPEC[id], own = (s.lo !== undefined ? (s.hi - s.lo) / 2 : s.tol) * k;
  return Math.max(own, STEP_MOVES[id] ?? 0);
}
// the crown's point nearest the strings at hammer angle g, action frame (where a blow or let-off callout starts)
export function crownAt(g) {
  let best = null, gap = Infinity;
  for (const p of TRACE.headFelt) { const q = turn(p, CENTER.butt, -g), d = stringX(q[1]) - q[0]; if (d < gap) { gap = d; best = q; } }
  return best;
}

// The factory regulation, as factory() solves it (tests/upright-kinematics.test.mjs checks they agree), at the shorter
// blow Greg chose (SPEC.blow): aftertouch 1.36 mm, escapement 2.97. At the textbook 1-3/4 in they are 0.64 and 1.07.
// (Until 2026-11-09 let-off was counted from where the jack stood clear of the cushion with the hammer in check, 0.34 mm
// of key later than where the hammer drops off the jack: aftertouch then read 1.04 and 0.44. See pose().)
export const FACTORY = {"balPunch":1.5,"frontPunch":1.5522,"railShim":0.5587,"capstan":0.7933,"letoff":0.0314,"backcheck":-6.9339,"spoon":-1.6704,"bridle":0.9719,"softFelt":9.7695};

// =====================================================================================================================
// Dynamics (C3): one note stepped in time.
// The hammer (butt, shank, head and catcher on the butt pin) and the wippen are bodies with inertia; so is the damper
// lever. The wippen rides on the capstan, but the strap or a key bouncing on its back rail can lift it off. The jack is
// quasi-static: where its spring, the butt and the let-off button put it. The key is driven: press() moves it at a
// speed, drive() follows a measured key (a clip's).
// Units: mm, s, g. Torques are g·mm²/s²: GRAV times a torque in gram-force·mm, the way technicians weigh them.
// =====================================================================================================================
const GRAV = 9810;
const DEG = Math.PI / 180;
const LIFT_RATIO = 3;     // the hammer turns at most this many times faster than the wippen lifting it (about 2.3 at its fastest here)
const BLOCK_TOL = 1e-4;   // rad: how far past the strings the jack may ask the hammer to be before the key stops (0.014 mm at the crown)
const HAND_W = 35;   // rad/s: how fast a hand holding a part eases to where it is moved (model.js HAND_W)
export const DYN = {
  hammerI: 175000,       // [T] g·mm²: head 8 g at 142 mm, shank 2 g, butt 4 g, catcher 1.5 g (Greg's scale: protocol 1.4 D)
  hammerLean: 22.3 * DEG, // [S15 m, e] how far the hammer's centre of mass leans toward the player at rest: taken as the
                         //   shank's own lean, so it still leans 4.7 degrees at the strings and gravity pulls toward the
                         //   rail through the whole stroke, as S15 found (findings.md item 7). It was 16.2 [T, from the
                         //   stand-in masses], which put the centre of mass 1.4 degrees over centre at the strings: with
                         //   no butt spring the hammer hung there (critique 2026-11-09, U12). Where the real centre of
                         //   mass lies along the hammer is still [T]: Greg's bench (balance a hammer on its pin)
  hammerMR: 1047,        // [fit] g·mm: mass times the CG's distance from the pin (S15, strap and spring both off). Only
                         //   its ratio to hammerI shows in the clips
  springT0: 301,         // [fit] gf·mm: the butt spring's push toward the rail at rest (S15, spring only)
  springK: 0,            // gf·mm per radian toward the strings: fitted with the preload it comes out about 0 (-16), so
                         //   left at 0 (tests/upright-fit.mjs fits the preload alone)
  frictionT: 60,         // [S3] gf·mm: the butt centre, Igrec's 1.5-4.0 g at 25 mm (37-100)
  railE: 0.5,            // [S15 m] rebound over landing speed on the hammer rail cloth (0.45-0.52). The rail is a hard
                         //   stop here: the filmed hammers land at 59-151 deg/s, the model's at 135-220 on the same
                         //   timing, the cloth's give (the head runs 0.5-2 degrees past rest) not modelled
  railSoft: 5.2,         // [T] rad/s (300 deg/s): past this landing speed the cloth takes the rest, so the rebound's
                         //   speed stops growing (railE times this: a rise of about 4 degrees, S15's highest filmed
                         //   rebound was 5.6). S15 has no landing faster than 151 deg/s; a hard stop with railE at every
                         //   speed threw an unchecked ff hammer 42 mm back onto the strings (critique 2026-11-09, U14)
  jackE: 0.3,            // [T] rebound of the butt's leather landing on the top of a jack that hasn't escaped (the
                         //   bobble: no film of one)
  stringE: 0.4,          // [S15 m] off the filmed model's wire "string" after a firm blow
  strapK: 100,           // [fit] gf per mm the strap is stretched past its length (S15, strap on), fitted with the filmed
                         //   strap's slack (tests/upright-fit.mjs): its slack decides more than its stiffness
  strapGive: 1.1,        // [T] mm: that soft stretch is the tape's first give (and its wire's); past it the tape is taut cloth
  strapK2: 5000,         //   [T] gf per mm. The filmed returns stretch it 0.6 to 1.0 mm, so they don't reach this; a strap
                         //   too tight for the soft pedal does, and lifts the wippen. (One less than about 1 mm too tight
                         //   only stretches here, though its reading already fails: the wippen is held down by
                         //   wippenDownT's one constant, far more than its weight at rest)
  strapC: 0.5,           // [T] gf per mm/s of stretching (cloth: a little damping)
  wippenI: 20000,        // [T] g·mm²: wippen with its jack, backcheck and wires
  wippenDownT: 18500,    // [S15 ff, e] gf·mm holding the wippen down on its capstan: its weight, the damper spring
                         //   through the spoon, the hammer on the jack, as one constant. From S15's ff blow: the wippen's
                         //   front end overshoots 2.75 mm (+26%) past where the key holds it (a key speed about 1/5 of the
                         //   7-8 m/s crown taken). S15's key bouncing on its back rail throws the wippen 1.5-2 mm for 25 ms,
                         //   which would want 1/18 of this; that throw is not modelled (the key is driven, rigid)
  damperAlpha: 1400,     // [S15 ff, medium-low] rad/s²: the damper spring's return (the head dropping back about 13 mm
                         //   in 14 ms after a hard blow throws it)
  jackRate: 40,          // [T] rad/s: how fast the jack spring swings the jack back under the butt
};

export class Sim {
  constructor(a, d = 0, { soft = false } = {}) {
    this.a = eff({ ...a }); this.k = DAMAGE[a.damage]?.dyn ?? {};   // damage: folded into the knobs, or factors on DYN
    this.dip = dipOf(this.a); this.reset(d, { soft });
  }
  // at rest (or held at depth d on a slow press), the soft pedal up or already down
  reset(d = 0, { soft = false } = {}) {
    const a = this.a, p = pose(a, d, { soft });
    this.t = 0; this.d = d; this.dTarget = d; this.keySpeed = 40; this.driver = null;
    this.soft = this.softTarget = soft ? 1 : 0; this.pedal = 0; this.pedalTarget = 0;
    this.phi = p.phi; this.v = 0; this.g = p.g; this.w = 0; this.psi = p.psi; this.dl = p.dl; this.vd = 0;
    this.jack = p.on === 'off' || p.on === 'backcheck' ? 'off' : 'under';
    this.strapLen = STRAP_LEN;
    this.taut = false; this.checked = false; this.onRail = p.on === 'rail'; this.seated = p.dl <= 1e-6; this.events = [];
    this.strapD = undefined; this.dPeak = 0; this.blocked = false; this.gJ = undefined; this.struck = false; this.near = Infinity;
    this.hand = null;
  }
  // held down after a blow: the key at depth d, the hammer where the backcheck holds it, the jack let off
  hold(d, { soft = false } = {}) {
    const p = pose(this.a, d, { held: true, soft });
    this.reset(0, { soft });
    Object.assign(this, { d, dTarget: d, dPeak: d, phi: p.phi, g: p.g, psi: p.psi, dl: p.dl, jack: 'off', checked: p.on === 'backcheck', onRail: false,
      seated: p.dl <= 1e-6 });
  }
  press(target, speed) { this.driver = null; this.dTarget = Math.max(0, Math.min(target, this.dip)); this.keySpeed = speed; }
  // A hand on one part (the app's Move parts, as model.js's Sim has it), holding it at q and moved by setting hand.q:
  // 'key' (key travel, mm), 'wippen' (its angle: lifted off the capstan, the key staying where it is), 'jack' (its
  // angle: the hand trips it as the let-off button does), 'hammer' (its angle) or 'damper' (the lever's angle off the
  // strings). It eases there (HAND_W) rather than jumping.
  grab(hold, q) { this.driver = null; this.hand = { hold, q, at: q, v: 0 }; }
  letGo() { this.hand = null; }
  // follow a measured key: fn(t) gives the key front's depth (mm) t seconds from now
  drive(fn) { this.driver = fn; this.t0 = this.t; }
  setSoft(down) { this.softTarget = down ? 1 : 0; }
  setPedal(down) { this.pedalTarget = down ? 1 : 0; }
  emit(type, data = {}) { this.events.push({ type, t: this.t, d: this.d, g: this.g, ...data }); }
  // the regulation with the soft pedal part way down: the rail moves its share of the soft pedal's travel
  railShim() { return this.a.railShim + this.soft * this.a.softFelt; }

  step(dt) {
    const a = this.a, gPrev = this.g, phiPrev = this.phi, dPrev = this.d, psiPrev = this.psi;
    this.t += dt;
    // pedals: a foot presses over about a tenth of a second and lets go faster
    for (const [k, tk] of [['soft', 'softTarget'], ['pedal', 'pedalTarget']]) {
      const rate = this[tk] > this[k] ? dt / 0.1 : dt / 0.03;
      this[k] += Math.sign(this[tk] - this[k]) * Math.min(Math.abs(this[tk] - this[k]), rate);
    }
    const h = this.hand;
    if (h) { h.v += (HAND_W * HAND_W * (h.q - h.at) - 2 * HAND_W * h.v) * dt; h.at += h.v * dt; }
    // the key
    if (h?.hold === 'key') this.d = this.dTarget = Math.max(0, Math.min(this.dip, h.at));
    else if (this.driver) this.d = Math.max(0, Math.min(this.dip, this.driver(this.t - this.t0)));
    else this.d += Math.sign(this.dTarget - this.d) * Math.min(Math.abs(this.dTarget - this.d), this.keySpeed * dt);
    const k = keyAngle(a, this.d), phiCap = wippenOn(capstanTop(a, k));

    // ---- the strap: a tension-only link, slack until its ends are its length apart ----
    // Slack, it hangs over the let-off screw's eye; taut, it pulls straight from the catcher to the hook: in every pose
    // where it can be taut that line passes at least 10 mm clear of the eye, so the eye never bends a taut strap.
    const [F, K] = strapEnds(a, this.phi, this.g), u = sub(K, F), D = Math.hypot(...u);
    const stretch = D - this.strapLen, rate = (D - (this.strapD ?? D)) / dt;
    this.strapD = D;
    let T = stretch > 0 ? GRAV * Math.max(0, DYN.strapK * Math.min(stretch, DYN.strapGive) + DYN.strapK2 * Math.max(0, stretch - DYN.strapGive) + DYN.strapC * rate) : 0;
    if (a.noStrap) T = 0;
    if ((T > 0) !== this.taut) { this.taut = T > 0; this.emit(this.taut ? 'straptaut' : 'strapslack'); }
    const cross = (r, f) => r[0] * f[1] - r[1] * f[0];
    const fH = [T * u[0] / D, T * u[1] / D];                       // on the catcher, toward the hook
    const tauH = -cross(sub(F, CENTER.butt), fH);                   // + = toward the strings
    const tauW = -cross(sub(K, CENTER.wippen), [-fH[0], -fH[1]]);   // + = rising

    // ---- the wippen: free under its load and the strap, but never below its capstan ----
    let v = this.v + (tauW - GRAV * DYN.wippenDownT) / DYN.wippenI * dt;
    let phi = this.phi + v * dt;
    if (phi <= phiCap) { phi = phiCap; v = (phiCap - phiPrev) / dt; }   // on the capstan: carried, or resting
    if (h?.hold === 'wippen') { phi = Math.max(phiCap, h.at); v = (phi - phiPrev) / dt; }   // held, but never below the capstan
    this.phi = phi; this.v = v;

    // ---- the jack ----
    const gr = gRail({ ...a, railShim: this.railShim() });
    const x0 = restPlace(a.balPunch, a.capstan, gr), c = contactOn(gr, x0);
    const handTrip = h?.hold === 'jack' && h.at > jackPsi(a, phi);
    const pb = handTrip ? h.at : jackPsi(a, phi);                    // a hand trips it as the button does
    const gs = gString();
    let gJack = -Infinity;                                          // where the jack holds the hammer up from
    let keyBlocked = false;
    if (this.jack === 'under') {
      const ch = chain(phi, c), psiFree = psiAtX(phi, this.g, x0);
      if (pb > Math.max(ch.psi, psiFree)) {
        // The button trips it: its top slides toward the player along the cushion. It has let off once the butt, were
        // it sitting on the jack, would miss its top (pose()'s own test, so a slow press and measure() agree): until
        // then a hammer coming back from the strings lands on the jack again, wherever the hammer is meanwhile.
        this.psi = pb;
        const gc = gOnJack(phi, pb);
        if (escaped(phi, pb, gc)) {
          // dist is the let-off distance only while the hammer still sits on the jack: in a blow it has flown on and
          // struck by now (flown), and dist is just where it happens to be
          const carried = !this.struck && this.g <= (this.gJ ?? -Infinity) + 7e-3;   // not struck, and within 1 mm at the crown
          this.jack = 'off'; this.emit('letoff', { dist: carried ? Math.min(stringGap(this.g), this.near) : stringGap(this.g), flown: !carried, hand: handTrip });
        } else gJack = gc;
      } else if (this.g <= ch.g + 1e-6) { this.psi = ch.psi; gJack = ch.g; }   // carrying the butt
      else this.psi = psiFree;                                      // the hammer above it: the jack keeps its place
      // Blocking: a jack that hasn't let off would push the hammer through the strings. Nothing here gives (the sim's
      // felts and rails don't: the Let-off card), so the key stops where the hammer meets the strings, and the jack
      // holds it there for as long as the key is pressed.
      if (gJack > gs + BLOCK_TOL && Number.isFinite(this.gJ ?? NaN) && !handTrip) {
        keyBlocked = true;
        this.d = dPrev; phi = phiPrev; v = 0; this.phi = phi; this.v = 0; this.psi = psiPrev; gJack = Math.min(this.gJ, gs + BLOCK_TOL);
        if (h?.hold === 'key') { h.at = Math.min(h.at, dPrev); h.v = Math.min(h.v, 0); }
      }
    } else {
      // let off: its spring swings it back toward its place under the butt, unless the cushion's player-side end is in
      // the way (the corner still above the cushion's underside) or the button holds it out
      const psiHome = psiAtX(phi, this.g, x0), q = cornerInButt(phi, psiHome, this.g);
      const clear = q[1] < CUSH_FACE.y - JACK_CLEAR;
      // (the button holds it only while the toe touches it: jackPsi's 0 is "not touching", not a stop. Taken as one, it
      // kept a slow jack from getting home under a hammer still on its way back, whose place for it is a hair past 0:
      // a weak jack spring then lost notes at 4 to 6 a second and none at 8 to 10. Critique 2026-11-09, U11)
      const hold = pb > 0 ? pb : -Infinity;
      const psiTo = Math.max(hold, clear ? psiHome : psiAtX(phi, this.g, CUSH_FACE.x[0] - EDGE));
      this.psi += Math.sign(psiTo - this.psi) * Math.min(Math.abs(psiTo - this.psi), DYN.jackRate * (this.k.jackRate ?? 1) * dt);
      if (clear && hold <= psiHome && Math.abs(this.psi - psiHome) < 1e-6) {
        this.jack = 'under';
        const share = this.dPeak > 0 ? 1 - this.d / this.dPeak : null;   // how far the key had come back up
        this.emit('reset', { keyShare: share }); this.struck = false;
      }
    }

    // ---- the hammer ----
    const lean = DYN.hammerLean - this.g;
    let acc = (GRAV * (-DYN.hammerMR * Math.sin(lean) - (a.noSpring ? 0 : DYN.springT0 + DYN.springK * this.g)) + tauH) / DYN.hammerI;
    if (Math.abs(this.w) > 1e-6) acc -= Math.sign(this.w) * GRAV * DYN.frictionT * (this.k.frictionT ?? 1) / DYN.hammerI;
    let w = this.w + acc * dt, g = this.g + w * dt;
    // a hand holding the hammer puts it where it is held; the jack, the backcheck and the rail still stop it
    if (h?.hold === 'hammer') { g = Math.min(h.at, gString()); w = (g - gPrev) / dt; }
    // The jack carries it. A hammer that falls back onto the top of a jack that hasn't let off bounces there (the bobble
    // that, near the strings, blubbers); one the jack meets slowly is taken at the jack's own speed: no snap.
    if (g < gJack) {
      // (falling itself, and faster than the jack top is going down: a hammer riding a jack down with the key is neither)
      // The speed it takes from the jack is never more than the wippen's own rise could give it (LIFT_RATIO): where the
      // toe's contact on the button steps along the toe, the jack's top steps a few hundredths of a millimetre, which
      // taken as a speed threw a slowly pressed hammer at the strings.
      const wJ = Number.isFinite(this.gJ ?? NaN) ? (gJack - this.gJ) / dt : 0;
      const lift = Math.min((gJack - gPrev) / dt, LIFT_RATIO * Math.max(0, phi - phiPrev) / dt);
      if (w < -0.5 && wJ - w > 0.5) { this.emit('bobble', { v: -w }); w = Math.max(-DYN.jackE * w, lift); }
      else w = Math.max(w, lift);
      g = gJack;
    }
    // The backcheck: the catcher coming back meets its felt and is held there, the felt taking its speed. It only ever
    // stops the hammer: a backcheck that rises into a hammer (the wippen overshooting at the key's bottom, as S15's ff
    // blow shows) moves it out of the way, at no speed of its own, and never throws it.
    const bc = TRACE.backcheckFelt.map(p => wipPt(phi, turn(p, BC_BEND, bcAngle(a))));
    const hits = gg => polyGap(TRACE.catcherHead.map(p => turn(p, CENTER.butt, -gg)), bc) === 0;
    if (hits(g)) {
      let lo = g, hi = Math.max(g, gPrev);                          // lo touching; find the nearest clear angle above it
      if (hits(hi)) hi = Math.min(gString(), hi + 0.01);
      if (hits(hi)) { g = gPrev; w = 0; }                           // wedged against it (a backcheck in the catcher's way)
      else {
        for (let i = 0; i < 25; i++) { const m = (lo + hi) / 2; if (hits(m)) lo = m; else hi = m; }
        if (!this.checked && w < 0) { this.checked = true; this.emit('checked', { dist: stringGap(hi) }); }
        g = hi; w = Math.max(0, Math.min(w, 0));                    // held: the felt has taken the speed it came back with
      }
    } else if (this.checked) { this.checked = false; this.emit('uncheck'); }
    // the rail
    if (g < gr) {
      // the cloth returns railE of a landing's speed, up to railSoft: a faster landing comes back no faster
      if (w < -0.5) { this.emit('rail', { v: -w }); w = DYN.railE * Math.min(-w, DYN.railSoft); } else w = Math.max(0, w);
      g = gr;
    }
    // the strings: a hammer in flight strikes and comes back; one the jack still holds is pressed there (blocked)
    if (g > gs) {
      if (gJack >= gs) w = 0;
      else { this.emit('strike', { v: w * 142.6 / 1000 }); w = -DYN.stringE * Math.abs(w); this.struck = true; }
      g = gs;
    }
    const blocked = keyBlocked || (gJack >= gs && g >= gs);
    if (blocked && !this.blocked) this.emit('blocked');
    this.blocked = blocked;
    this.g = g; this.w = w; this.gJ = gJack;
    // the closest the hammer has come to the strings while the jack carried it, this press (the let-off distance)
    if (this.jack !== 'under' || this.d === 0) this.near = Infinity; else if (g <= gJack + 1e-6) this.near = Math.min(this.near, stringGap(g));
    this.dPeak = Math.max(this.dPeak ?? 0, this.d);
    if (this.d === 0 && this.g <= gr + 1e-6) { this.dPeak = 0; this.struck = false; }

    // ---- the damper: the spoon or the lift rod holds it off; else its spring brings it back to the strings ----
    const dlSpoon = damperAngle(a, phi), dlPedal = this.pedal * DAMPER_PEDAL_LIFT;
    let vd = this.vd - DYN.damperAlpha * (this.k.damperAlpha ?? 1) * dt, dl = this.dl + vd * dt;
    const floor = Math.max(dlSpoon, dlPedal, h?.hold === 'damper' ? h.at : 0);
    if (dl < floor) { vd = Math.max(vd, (floor - this.dl) / dt); dl = floor; }
    if (dl <= 0) { dl = 0; vd = 0; if (!this.seated) { this.seated = true; this.emit('seated'); } }
    else if (this.seated && dl > 1e-4) { this.seated = false; this.emit('damperup'); }
    this.dl = dl; this.vd = vd;
  }
  run(seconds, dt = 0.0001) { for (let t = 0; t < seconds - 1e-12; t += dt) this.step(dt); }
  // where everything is now, as pose() gives it (for the drawing), but soft is the pedal's share of its travel (0-1)
  pose() {
    return { d: this.d, th: keyAngle(this.a, this.d).th, bal: keyRest(this.a).bal, phi: this.phi, psi: this.psi, g: this.g, dl: this.dl,
      soft: this.soft, slack:this.strapLen - Math.hypot(...sub(...strapEnds(this.a, this.phi, this.g))), on: this.jack, blocked: this.blocked };
  }
}
// the sustain pedal lifts every damper about as far as its spoon does at the bottom of the key (S2) [T: its lost motion
// and travel are knobs to come with the trapwork]
export const DAMPER_PEDAL_LIFT = 0.03;
