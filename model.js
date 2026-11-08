// Grand action model: one key, side view, millimetres.
// x runs toward the back of the piano (strings), y is up, keybed at y = 0.
// Every moving part is a rigid lever on a pivot; regulation screws and
// punchings set where the levers meet. No playing physics beyond what the
// regulation tests need (hammer flight, rebound, checking, spring rise).

export const IN = 25.4;

// ---------- geometry (fixed by the "factory") ----------
// The action's layout is measured, not invented: M. C. Hirschkorn, Dynamic Model of a Piano Action
// Mechanism (MASc thesis, University of Waterloo, 2004), a Boston GP-178 grand, note 52, moved into
// this frame (the balance point on the key's underside at x 235, y 29.5).
export const G = {
  // key
  balX: 235, balRailY: 28,          // balance rail top (punchings sit on it)
  backRailX: 455, backRailY: 23.24, // back rail cloth top: the key rests 1.63° front-up, as the Boston's does
  frontRailX: 12, frontRailY: 24.5, // front rail top (punchings sit on it)
  keyThick: 22, keyFrontLocal: -235, keyBackLocal: 235, keyTopCap: 2.5,
  capstanLocal: 117.6, capDomeR: 9.7,   // capstan, behind the balance point, with a shallow domed top
  backcheckLocal: 210.11,           // backcheck wire, near the key end; its head leans back under the hammer's strike line
  bcHead: [221.17, 85.18],          // key-local: where the backcheck's buckskin catches the tail (key down)
  // wippen (pivot at its rear, its flange screwed to the wippen rail); wippen-local, body level at phi = 0
  W: [416.0, 82.3], heelC: [-59.5, 3.0], heelR: 25.3,   // heel cushion: an arc that rolls on the capstan
  jackPivotW: [-98.9, -3.5], repPivotW: [-48.3, 27.5],
  // jack (local to its centre pin, drawn at its rest lean): the top-back corner that lifts the knuckle, and the toe's knob
  jackTop: [16.5, 46.7], jackTopR: 1, jackFront: [11.9, 48.9], toe: [-25.0, 5.1],   // jackFront: front end of the top face
  // repetition lever (local to its centre pin): where the knuckle sits on the horn, top of the drop screw's felt
  horn: [-33.5, 16.5], tip: [-51.6, 22.1],
  // Face of the jack stop felt on the window's front wall, bottom to top. It sits nearer the jack than the Boston's: at
  // factory the jack's top-front corner rests 4.95 mm from it, and would rest 6.5 from Hirschkorn's felt (contact 9,
  // research/wippen/spec.md §3: a circle r 5 at [-49.4, 18.5], §5, 6.2 from the jack at his own regulation). It stays here
  // because it is where a tripped jack stops (updateJack): at factory the jack clears it by 1.7 mm at the bottom of a slow
  // press, and jams once aftertouch passes about 2.5 mm. The corner moves only 3.7 mm against the lever from rest to there,
  // so no felt can be 6.2 away at rest and keep that: moved 1.25 mm out, to 6.2, it would clear by 2.95 and let about
  // 0.7 mm more aftertouch through before the jack jams. No source gives that clearance.
  windowFelt: [[-43.3, 12.6], [-42.8, 19.0]],
  // hammer (local to the shank centre pin, +x along the shank): the knuckle, the crown's arc, the tail.
  // At factory the shank rests 15.35° head-down, not the Boston's measured 16.42° (research/wippen/spec.md §1): the factory
  // solve sets the capstan for the textbook 1¾ in blow (44.45 mm), not his 47.0, so the head rests 2.5 mm higher. Set to a
  // 47.0 blow, this geometry rests at 16.42°.
  H: [323.3, 146.1], knuckleC: [16.96, -9.08], knuckleR: 4.4,
  coreT: 1.2, coreEnd: 1.2,         // the knuckle's wood core: a thin tongue through the roll's middle, ending this far past its centre (Greg's photo)
  crownC: [132.13, 35.6], crownR: 10.2,  // felt top 45.8 above the shank, 140 out from the centre pin
  tail: [133.26, -21.1],            // the point on the tail's scored back face that the backcheck catches
  shankRest: [110.0, -3.14],        // underside of the shank where it meets the rest rail
  // strings and rails
  stringY: 200.1,
  letoffX: 293.0, dropX: 319.3, restRailX: 427.1,
  // repetition spring: force at the horn, in units of the hammer's weight there
  repK: 0.076,                      // per mm of extra compression (Hirschkorn's measured spring: 6.6 g/mm at the horn, 88 g of hammer)
  checkHold: 1.3,                   // net lift the backcheck's grip can resist
  popNet: 1.0,                      // net lift above this is felt as a "pop"
  weakNet: 0.25,                    // net lift below this is sluggish
  wedge: 0.4,                       // a tripped jack can wedge back under a knuckle this far below where it would hold it
  bcInPath: 0.6,                    // fraction of dip before the backcheck can catch
  bcMissLean: 2.2,                  // bent this far away from the hammer, the backcheck misses the tail
  bcScrapeLean: 3.0,                // bent this far toward the hammer, the tail scrapes (the Boston rubs at about +2.5 to +3.6)
  jackD: 4.694,                     // damping factor of the jack-knuckle contact, s/m (Hirschkorn Table A.8, contact 7)
  jackMu: 0.177,                    // sliding friction of the knuckle on the jack top (Hirschkorn Table A.8, contact 7)
  // damper: the key's back end lifts the underlever, the wire carries the head off the strings
  dmpContactLocal: 231,             // where the key end meets the underlever's lift felt
  dmpRatio: 98 / 135,               // head lift per mm of underlever lift at the key: the wire sits nearer the flange than the lift felt
  dmpGravity: 5000,                 // head falling under its own weight, mm/s^2
  dmpBounceV: 350,                  // a head landing faster than this (mm/s) bobbles on the strings
};

// Traveling paper: one strip of thin paper (about 0.001 in, the sim's own figure) under one side of a flange about 11 mm
// wide. Under the hammer flange it tilts the swing about 0.1 mm at the string (TRAVEL_RISE below); behind the wippen
// flange it swings the wippen like a gate, the jack top 82 mm out from the flange center pin.
export const PAPER_T = 0.025, W_FLANGE_W = 11.6, WIPPEN_JACK_ARM = -G.jackPivotW[0] - G.jackTop[0];
export const WIPPEN_PAPER = +(PAPER_T * WIPPEN_JACK_ARM / W_FLANGE_W).toFixed(2);   // jack swing per strip, mm
// sideways (+ toward the bass) position of the jack top: shifted on the rail, swung by paper behind the flange
export const jackSide = a => (a.wippenSpace || 0) + (a.wippenTravel || 0);

// ---------- adjustments (the knobs a technician turns) ----------
// value units are what the part physically moves; step lists are the
// increments offered (screw turns or punching thicknesses). sides: a shim that goes under one side
// or the other (the side is the choice); dirs: a sideways move, + toward the bass (left from the keys).
export const ADJ = [
  { id: 'balPunch', name: 'Balance rail punchings', part: 'balance', unit: 'mm', min: 0, max: 4,
    steps: [0.1, 0.25], stepLabel: ['0.004" paper', '0.010" card'], how: 'Add or remove paper punchings under the key at the balance rail. Raises or lowers the key front.' },
  { id: 'jackScrew', name: 'Jack regulating screw', part: 'jackscrew', unit: 'mm', min: -7, max: 2,
    steps: [0.1], stepLabel: ['¼ turn'], how: 'Positions the jack front-to-back under the knuckle. + moves the jack toward the front.' },
  { id: 'repStop', name: 'Repetition lever height screw', part: 'repscrew', unit: 'mm', min: -2, max: 2,
    steps: [0.02, 0.08], stepLabel: ['⅛ turn', '½ turn'], how: 'Sets how high the repetition lever rests relative to the jack top. + raises the lever.' },
  { id: 'capstan', name: 'Capstan screw', part: 'capstan', unit: 'mm', min: 6, max: 20,
    steps: [0.04, 0.16], stepLabel: ['1/32 turn', '⅛ turn'], how: 'Raises or lowers the wippen, and with it the hammer. + raises the hammer (shorter blow).' },
  { id: 'restRail', name: 'Hammer rest rail', part: 'restrail', unit: 'mm', min: 96, max: 122,
    steps: [0.25], stepLabel: ['shim'], how: 'Raises or lowers the rail the hammer shanks fall back toward.' },
  { id: 'frontPunch', name: 'Front rail punchings', part: 'frontpunch', unit: 'mm', min: 0, max: 8,
    steps: [0.1, 0.25], stepLabel: ['0.004" paper', '0.010" card'], how: 'Thicker punchings stop the key sooner: less dip.' },
  { id: 'letoff', name: 'Let-off button', part: 'letoff', unit: 'mm', min: 86, max: 100,
    steps: [0.05, 0.2], stepLabel: ['⅛ turn', '½ turn'], how: 'Where the jack tender hits and trips the jack. + raises the button (later let-off, closer to the string).' },
  { id: 'drop', name: 'Drop screw', part: 'drop', unit: 'mm', min: 134, max: 145,
    steps: [0.05, 0.2], stepLabel: ['⅛ turn', '½ turn'], how: 'Stops the repetition lever. + raises the screw (hammer drops less after let-off).' },
  { id: 'repSpring', name: 'Repetition spring tension', part: 'repspring', unit: '', min: 0.3, max: 2.4,
    steps: [0.02], stepLabel: ['bend'], how: 'How hard the repetition lever pushes up on the knuckle.' },
  { id: 'backcheck', name: 'Backcheck wire', part: 'backcheck', unit: 'mm', min: -4, max: 4,
    steps: [0.25], stepLabel: ['bend'], how: 'Bend the backcheck toward (+) or away from (−) the hammer tail.' },
  { id: 'hammerTravel', name: 'Traveling paper under the hammer flange', part: 'flange', unit: 'mm', min: -3, max: 3,
    steps: [0.1], stepLabel: ['paper'], sides: ['bass', 'treble'],   // + is paper under the bass side: the path swings toward the treble
    how: 'A strip of thin paper under one side of the flange lifts that side, so the hammer\'s path swings away from it. Put it under the side the hammer drifts toward as it rises. Too much? Take a strip out: the sim counts that as one under the other side.' },
  { id: 'hammerSpace', name: 'Hammer spacing (shift on the flange)', part: 'flange', unit: 'mm', min: -4, max: 4,
    steps: [0.1, 0.4], stepLabel: ['tap', 'shift'], dirs: true, how: 'Loosen the flange screw and shift the hammer sideways to center it on its unison.' },
  { id: 'hammerSquare', name: 'Burn the shank (heat and twist)', part: 'shank', unit: '°', min: -8, max: 8,
    steps: [0.5], stepLabel: ['twist'], how: 'Warm the shank and twist it so the hammer head stands square to the strings.' },
  { id: 'wippenSpace', name: 'Wippen spacing (loosen the flange screw, shift it)', part: 'wflange', unit: 'mm', min: -3, max: 3,
    steps: [0.1, 0.4], stepLabel: ['tap', 'shift'], dirs: true,
    how: 'Loosen the wippen flange screw a little, slide the whole wippen sideways on the rail and snug the screw again: jack, heel and flange all move the same amount. Center the jack under the knuckle.' },
  { id: 'wippenTravel', name: 'Traveling paper between the wippen flange and its rail', part: 'wflange', unit: 'mm', min: -16 * WIPPEN_PAPER, max: 16 * WIPPEN_PAPER,
    steps: [WIPPEN_PAPER], stepLabel: ['paper'], sides: ['bass', 'treble'],   // + is paper behind the bass side: the jack swings toward the bass
    how: 'The flange screws to the back face of the wippen rail. A strip of thin paper behind one side of the flange stands that side off the rail, so the wippen swings on the screw like a gate. The wippen points forward over the rail, so its front end swings toward the side the paper is on: paper behind the bass side moves the jack toward the bass (the opposite of the hammer flange\'s rule). The jack, farthest from the flange, moves most; the heel moves about three quarters as much across the capstan. Steinway: traveling paper between the flange and the rail shifts or tilts the wippen left or right.' },
  { id: 'backcheckSpace', name: 'Backcheck wire, bent sideways', part: 'backcheck', unit: 'mm', min: -3, max: 3,
    steps: [0.1, 0.4], stepLabel: ['nudge', 'bend'], dirs: true, how: 'Bend the wire sideways with a backcheck bender to center the head behind the hammer tail.' },
  { id: 'backcheckSquare', name: 'Backcheck head, twisted on its wire', part: 'backcheck', unit: '°', min: -10, max: 10,
    steps: [0.5, 2], stepLabel: ['twist', 'twist ×4'], how: 'Twist the head with parallel pliers so its face is square to the tail.' },
  { id: 'damperGap', name: 'Damper lift timing (underlever on its wire)', part: 'damper', unit: 'mm', min: 0, max: 10,
    steps: [0.1, 0.4], stepLabel: ['nudge', 'move'], how: 'Moves the underlever on the damper wire (set screw in the underlever\'s wire block), the head staying on the strings. + leaves more key travel before the key picks up the underlever (later lift).' },
  { id: 'damperStop', name: 'Damper stop rail', part: 'damperstop', unit: 'mm', min: 1, max: 20, shared: true,
    steps: [0.1, 0.4], stepLabel: ['shim', 'shim ×4'], how: 'One rail over every underlever. + raises it: more room before the dampers hit it.' },
  { id: 'pedalLift', name: 'Damper pedal lift', part: 'lifttray', unit: 'mm', min: 0, max: 20, shared: true,
    steps: [0.1, 0.4], stepLabel: ['¼ turn', '1 turn'], how: 'How far the pedal\'s lift tray raises every damper. + lifts them higher.' },
  { id: 'damperDrag', name: 'Damper wire in its guide bushing', part: 'damperwire', unit: '', min: 0, max: 0.9,
    steps: [0.05], stepLabel: ['ease'], how: 'A wire bent off line drags in its bushing and the damper falls late. − straightens and eases it.' },
  { id: 'damperCenter', name: 'Damper wire, bends 3 and 4 (sideways)', part: 'damperwire', unit: 'mm', min: -3, max: 3,
    steps: [0.1, 0.4], stepLabel: ['nudge', 'bend'], dirs: true, how: 'Bend the wire at its top bends to move the head sideways over its unison.' },
  { id: 'damperLevel', name: 'Damper wire, seen from the side (seat the head)', part: 'damperwire', unit: 'mm', min: -1.5, max: 1.5,
    steps: [0.05, 0.2], stepLabel: ['nudge', 'bend'], how: 'Bend the wire, seen from the side, so both ends of the head sit on the strings with equal force. + lifts the head\'s back end off the strings.' },
];

// ---------- textbook specs ----------
// Generic textbook targets of the kind a PTG exam expects. Change them here.
// They are not the measured Boston's regulation: Hirschkorn set his GP-178 to dip 10.0 mm, blow 48 (47.0 as measured),
// let-off 1.0 mm from the string, drop to 3.0 and check at 15 (research/wippen/spec.md §1, §6), and at rest it shows
// 6.3 mm from the let-off button to the jack's toe, 4.9 from the drop screw to its felt and 0.9 from the shank to the rest
// rail. factory() regulates the same geometry to these targets instead, which leaves 7.75, 6.04 and 3.18 mm at rest.
export const SPEC = {
  // Action centers: friction in grams on a gram gauge at the stated distance (CENTERS), and no side play. Graded on the
  // published ranges as they stand, not scaled with the skill level: they are part specs, not regulation tolerances. Not
  // in the exam (its repairs are a separate section), apart from a tight hammer center dealt as Exam-level damage.
  hammerCenter: { name: 'Hammer flange center: free, no side play', center: 'hammer', unit: 'g', noExam: true },
  wippenCenter: { name: 'Wippen flange center: free, no side play', center: 'wippen', unit: 'g', noExam: true },
  jackCenter: { name: 'Jack center: free, no side play', center: 'jack', unit: 'g', noExam: true },
  repCenter: { name: 'Repetition lever center: firm, not loose', center: 'rep', unit: 'g', noExam: true },
  // Steinway's guide asks for slight side play at the front rail bushing, at rest and held down, and a little at the
  // balance pin when the key is turned at its front, even across the keyboard; no technician standard gives it in mm.
  // Graded on the side play at the front; the band is the sim's own (KEY below). Not in the exam: repairs aren't.
  keyBushings: { name: 'Key bushings: slight side play, key drops freely', target: 0.45, tol: 0.35, unit: 'mm', noExam: true },
  keyHeight:  { name: 'Key height (vs neighbors)', target: 0, tol: 0.4, unit: 'mm' },
  jackPos:    { name: 'Jack: back of jack to back of knuckle core', target: 0, tol: 0.4, unit: 'mm' },
  // side to side, the jack centered under the knuckle (Steinway's regulation guide aligns the wippen so). A 5.5 mm jack
  // under an 8.2 mm knuckle has 1.35 mm each side before its edge passes the knuckle's; the band is the sim's own.
  wippenSpacing: { name: 'Jack centered under the knuckle (wippen spacing)', target: 0, tol: 0.4, unit: 'mm' },
  // at the hammer: Yamaha's 0.2 mm gap at the lever (David Skolnik) and "about 1/16 in" (David Nereson) both land here
  wink:       { name: 'Rep lever height (hammer winks when the jack is tripped)', target: IN / 16, tol: IN / 32, unit: 'mm' },
  blow:       { name: 'Blow distance', target: 1.75 * IN, tol: IN / 32, unit: 'mm' },
  restGap:    { name: 'Shank above rest rail', target: IN / 8, tol: IN / 16, unit: 'mm' },
  // pressed lightly at the very top, the hammer starts up at once (the test Igrec gives for an upright's jack gap;
  // a grand hammer rides on its jack, so it should show none). Any play you could feel fails; the 0.05 mm is the sim's own.
  lostMotion: { name: 'No lost motion (key travel before the hammer moves)', target: 0, tol: 0.05, unit: 'mm' },
  dip:        { name: 'Key dip', target: IN * 3 / 8, tol: IN / 64, unit: 'mm' },
  letoff:     { name: 'Let-off from string', target: IN / 16, tol: IN / 64, unit: 'mm' },
  drop:       { name: 'Drop below let-off', target: IN / 16, tol: IN / 64, unit: 'mm' },
  // more than the 1 mm older books give: a modern grand at textbook dip, blow and let-off has about 2 mm or more
  // (Greg, 2026-11-06); the measured Boston gives 1.7
  aftertouch: { name: 'Aftertouch (key travel after let-off)', target: 1.7, tol: 0.5, unit: 'mm' },
  spring:     { name: 'Repetition spring', target: 0.55, tol: 0.25, unit: '' },
  check:      { name: 'Checking distance', target: IN * 9 / 16, tol: IN / 16, unit: 'mm' },   // 1/2 to 5/8 in (Igrec)
  // centered and square to the hammer's check (Steinway's regulation guide); bands are the sim's own
  backcheckAlign: { name: 'Backcheck centered behind the tail, and square', target: 0, tol: 0.5, tolSq: 2, unit: 'mm' },
  // alignment: done first on a real piano, and part of the PTG exam's "assemble, align and regulate"
  hammerTravel: { name: 'Hammer travels straight (sideways drift at the string)', target: 0, tol: 0.3, unit: 'mm' },
  hammerSpacing: { name: 'Hammer centered on its unison', target: 0, tol: 0.4, unit: 'mm' },
  hammerSquare: { name: 'Hammer square to the strings', target: 0, tol: 1, unit: '°' },
  hammerSound: { name: 'Hammer and shank solid and quiet (wiggle and listen)', target: 0, tol: 0, unit: '' },
  // dampers: textbook timing is the head starting to lift with the hammer a third to half of the way up
  damperTiming: { name: 'Damper starts lifting (share of hammer travel)', target: 0.45, tol: 0.1, unit: '%', damper: true },
  damperStop:   { name: 'Damper stop rail clearance, key down', target: IN / 32, tol: IN / 64, unit: 'mm', damper: true },
  pedalLift:    { name: 'Pedal lift above key lift (to the stop rail)', target: IN / 32, tol: IN / 64, unit: 'mm', damper: true },
  damperFall:   { name: 'Damper falls freely', target: 0, tol: 0.15, unit: '', damper: true },
  // Igrec: the head vertical and centered to its strings, both ends of its felt seated with equal force; bands are the sim's own
  damperSeat:   { name: 'Damper head centered on its unison, seated flat', target: 0, tol: 0.5, tolLevel: 0.2, unit: 'mm', damper: true },
  underCenter:  { name: 'Damper underlever center: falls freely', center: 'under', unit: 'g', noExam: true, damper: true },
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
// ---------- damage: parts that are broken or loose, found from their symptoms ----------
// Each changes what the action does; none can be regulated away, only repaired.
export const DAMAGE = {
  splitShank: { repair: 'Replace the shank', power: 0.75, clicky: true, wobble: 3, add: { hammerTravel: 0.6 },
    signs: 'a dry click on the blow, and the head wobbles from blow to blow' },
  looseFlange: { repair: 'Tighten the flange screw', clicky: true, add: { hammerSpace: 0.9 },
    signs: 'a click, and the hammer shifts sideways on its flange' },
  looseHead: { repair: 'Reglue the hammer head', power: 0.9, clicky: true, add: { hammerSquare: 2 },
    signs: 'a tick on the blow, and the head moves on the shank' },
  // (a tight or loose center pin is a center fault, CENTER_FAULTS below: eased, repinned or rebushed)
  brokenJackSpring: { repair: 'Replace the jack spring', noJackSpring: true,
    signs: 'the jack flops loose: it does not spring back under the knuckle' },
};
export function eff(a) {
  if (a._eff) { wearNow = a.wear; return a; }
  const w = a.wear || 0;
  wearNow = w;
  const e = { ...a, _eff: true, wear: w, power: 1 };
  for (const k of ['balPunch', 'frontPunch', 'capstan', 'letoff', 'restRail', 'backcheck', 'repSpring']) e[k] = a[k] + WEAR[k] * w;
  for (const k of ['hammerTravel', 'hammerSpace', 'hammerSquare', 'wippenSpace', 'wippenTravel', 'backcheckSpace', 'backcheckSquare', 'damperCenter', 'damperLevel']) e[k] = a[k] ?? 0;
  const dmg = DAMAGE[a.damage];
  if (dmg) {
    for (const [k, v] of Object.entries(dmg.add || {})) e[k] += v;
    if (dmg.power) e.power = dmg.power;
    e.clicky = !!dmg.clicky; e.wobble = dmg.wobble || 0;
  }
  e.keyLean = BUSHINGS[a.bushing]?.lean || 0;
  // action centers: each one's friction torque (mm·g). The sim's other figures were set on the healthy action, so where
  // they already stand for its friction (the key's upweight, the lever's brake, the damper's fall) only a fault's
  // difference from healthy is added; the hammer's free swing takes its whole friction (Sim.step).
  const cf = CENTER_FAULTS[a.center], T = e.centerT = {};
  for (const [k, c] of Object.entries(CENTERS)) T[k] = cf?.center === k ? cf.T : c.T;
  e.hammerFr = T.hammer / HAMMER_WT;                                   // hammer weights
  e.repFr = REP_CENTER * T.rep / CENTERS.rep.T;                        // hammer weights at the horn (REP_CENTER, below)
  e.hammerFrX = Math.max(0, (T.hammer - CENTERS.hammer.T) / HAMMER_WT);   // what a tight one has over healthy
  e.centerFrX = e.hammerFrX + Math.max(0, e.repFr - REP_CENTER);
  // the jack spring pushes the jack back under the knuckle against its center's friction; the wedge it can work the
  // rounded top under a knuckle sitting a hair low shrinks with what is left (the sim's own scaling), and with nothing
  // left the jack doesn't come back at all
  const spring = dmg?.noJackSpring ? 0 : JACK_SPRING;
  e.noJackSpring = spring <= T.jack;
  e.wedge = G.wedge * Math.max(0, Math.min(1, (spring - T.jack) / (JACK_SPRING - CENTERS.jack.T)));
  e.wippenDrag = Math.max(0, T.wippen - CENTERS.wippen.T) * WIPPEN_TURN;   // g at the key front
  e.damperDrag = (a.damperDrag ?? 0) + Math.max(0, T.under - CENTERS.under.T) / DAMPER_WT;
  if (cf?.clicks) e.clicky = true;
  return e;
}

// ---------- key bushings ----------
// The key is guided sideways by cloth bushings in two mortises: round the balance rail pin and round the front rail pin.
// Forum techs want side play you can feel but not see; the mm figures are the sim's own within that (a Piano World
// post, seen only in a search summary, gives 0.2 at the balance and 0.4 at the front). Friction is in grams at the key front.
export const KEY = {
  frontPlay: 0.3, balPlay: 0.2,   // side play at the key front (front bushing) and across the balance pin, mm
  balTwist: 22,                   // the balance mortise runs through the key's depth: twisting the front rolls it on its pin
  friction: 1244 / 235,           // the key's own friction, about 5.3 g (Hirschkorn Table A.9: 1244 mm·g at the balance)
  upweight: 24,                   // what brings the key up with the action on it (Stanwood's example, PTG 2022: down 50, up 24;
                                  // key patents give 19-29 as usual)
  frontWeight: 27,                // the key's front weight with the stack off (Stanwood, PTG 2022: 27 g is medium)
  upSpeed: 60,                    // mm/s: a free key comes up as fast as the sim lets a key up
  slowDrag: 3,                    // more extra friction than this, and the key visibly drops slowly (the sim's own)
};
// drag: friction a tight bushing adds at the key front (g). A key stays down once it passes the upweight, and hangs
// with the stack off once it passes the front weight less the key's own friction. Both figures are the sim's own.
export const BUSHINGS = {
  // the cloth packed down: a dealer's guide calls 1-2 mm at the key front the most a player puts up with
  frontWorn: { name: 'Worn front rail bushing', frontPlay: 1.5, lean: 0.5, clicks: true },
  // swollen cloth gripping the front pin: no play, and the action's weight can't bring the key back up
  frontTight: { name: 'Tight front rail bushing', frontPlay: 0, drag: 26 },
  // gripping the balance pin: the play at the front is still there, but the key comes up at half speed
  balTight: { name: 'Tight balance rail bushing', balPlay: 0, drag: 12 },
};
// share of a free key's speed coming up (0: it stays down); a tight wippen center drags on it too (a.wippenDrag, from eff)
export const keyUpShare = a => Math.max(0, Math.min(1, 1 - ((BUSHINGS[a.bushing]?.drag || 0) + (a.wippenDrag || 0)) / KEY.upweight));
export function measureKey(a) {
  const b = BUSHINGS[a.bushing] || {}, drag = b.drag || 0, free = KEY.frontWeight - KEY.friction;
  return {
    keyBushings: b.frontPlay ?? KEY.frontPlay, balPlay: b.balPlay ?? KEY.balPlay, keyDrag: drag,
    // stack off, the key raised and let go: Don Dalton's "it should drop easily" (PTG, 2022)
    keyFall: drag >= free ? 'hangs' : drag > KEY.slowDrag ? 'slow' : 'free', keyFallShare: Math.max(0, 1 - drag / free),
    keyUpShare: keyUpShare(a),
  };
}

// ---------- action centers ----------
// Every center pin turns in cloth bushings with a friction torque, in mm·g (grams of force on a gram gauge times its
// distance from the pin): research/wippen/spec.md §7. Healthy torques are Hirschkorn's, measured on the Boston (Table A.9,
// kinetic friction: hammer 0.00101 N·m, wippen and jack 0.000397, repetition lever 0.00247). He didn't measure the damper
// underlever: there the middle of Renner's range. A gram gauge reads a center at `at` mm from its pin; `band` is the
// published range there, in grams. Hirschkorn's four fall inside the range used for each: wippen and jack near the low
// end, the hammer near the top, the repetition lever in the middle (the tightest center on purpose: it brakes the lever,
// Igrec). The two sources differ: Renner's table puts the wippen at 2-3 g at 23 mm (46-69 mm·g) and the lever at 6-8 g
// where the drop screw touches, both above the measured Boston, and Igrec's hammer range stops at 100 mm·g, just under it.
// So the wippen, jack and lever are graded on Igrec's ranges (gauged springs unhooked) and the hammer on Renner's.
//   Renner: Renner USA Technical Manual "Renner Flange Bushing Cloth" (Bill Spurlock, 2014), its friction table.
//   Igrec: Mario Igrec, Pianos Inside Out (2013), Table 5, gauged with the springs unhooked.
export const CENTERS = {
  hammer: { name: 'Hammer flange center', T: 103, at: 23, band: [2, 5], src: 'Renner' },     // 46-115 mm·g
  wippen: { name: 'Wippen flange center', T: 40, at: 25, band: [1.5, 4], src: 'Igrec' },     // 37-100 mm·g
  // at the tender's tip, spring off
  jack: { name: 'Jack center', T: 40, at: 25, band: [0.5, 4], src: 'Igrec', springOff: true },   // 12-100 mm·g
  // where the drop screw meets its felt: 56 mm out on this lever (Igrec measures 58: his 2-6 g there is 120-360 mm·g)
  rep: { name: 'Repetition lever center', T: 252, at: 56, band: [120 / 56, 360 / 56], src: 'Igrec', springOff: true },
  under: { name: 'Damper underlever center', T: 40, at: 20, band: [1, 3], src: 'Renner' },  // 20-60 mm·g
};
// what the friction works against (Hirschkorn Table A.1 masses and centers of mass)
// the hammer's weight about its pin: 11.74 g, 102 mm out (the sim's "hammer weight"). Its friction is used as a share of
// that weight: the share is Hirschkorn's, the acceleration it makes follows the sim's own gravity GA (60 rad/s², where his
// weight over inertia gives 76), as the hammer's weight does
export const HAMMER_WT = 1199;
export const JACK_SPRING = 430;  // the jack spring, about constant: 0.0042 N·m (Hirschkorn §A.4)
const JACK_WT = 52;              // the jack's own weight about its pin, the arm level: 2.65 g, 19.5 mm out
const WIPPEN_WT = 1040;          // the wippen with its jack and lever about the flange pin, level: 600 + 248 + 188 mm·g
const WIPPEN_TURN = 0.0082;      // rad the wippen turns per mm of key travel (factory linkage): mm·g at its pin → g at the key front
// The damper's weights about the underlever pin are the sim's own estimates, from the drawn parts (scene.js) in maple and
// steel: no published figure. The whole damper (head, wire, underlever) about 1500 mm·g; the underlever alone 470.
const DAMPER_WT = 1500, UL_WT = 470;
// Faults (spec §8.2, §8.3): tight cloth (swollen, gummed) is eased; a loose pin in sound cloth is repinned a half size up;
// a bushing that wobbles with its friction right has worn cloth and is rebushed. No source gives side play in mm for an
// action center (Renner: "watch the pin"), so play is the sim's own, in mm at the part a test watches (the crown, the
// jack's top), sized so the test shows it on screen. Torques without a source are the sim's own too, picked where the
// symptoms in §8.2 show.
export const CENTER_FAULTS = {
  // Fred Sturm (PTG, 2022): 3-4 half-swings read about 6-8 g
  hammerTight: { center: 'hammer', kind: 'tight', T: 7 * 23, name: 'Tight hammer flange center' },
  // James Kelly (PTG, 2023): 12-14 swings is too loose
  hammerLoose: { center: 'hammer', kind: 'loose', T: 1.5 * 23, play: 1.5, clicks: true, name: 'Loose hammer flange center' },
  // Renner: a part can pass the friction test and still wobble, one side of its bushing worn
  hammerWorn: { center: 'hammer', kind: 'worn', T: 3 * 23, play: 2.0, clicks: true, name: 'Worn hammer flange bushing' },
  // a sluggish one, of the kind Igrec's tilt test catches (about 5× his top figure; the sim's own)
  wippenTight: { center: 'wippen', kind: 'tight', T: 20 * 25, name: 'Tight wippen flange center' },
  wippenLoose: { center: 'wippen', kind: 'loose', T: 0.6 * 25, play: 1.0, clicks: true, name: 'Loose wippen flange center' },
  // Steve Howard (Howard Piano Industries, 2023): over 6-7 g at the toe is too tight; this one sticks (the sim's own)
  jackTight: { center: 'jack', kind: 'tight', T: 12 * 25, name: 'Tight jack center' },
  jackLoose: { center: 'jack', kind: 'loose', T: 0.3 * 25, play: 1.0, clicks: true, name: 'Loose jack center' },
  // Don Mannino (2007, quoted by Jessica Masse, PTG 2023): it can reach about 7 g in humid weather and still work, and must not
  // drop below the low end or the lever won't hold the knuckle
  repTight: { center: 'rep', kind: 'tight', T: 10 * 56, name: 'Tight repetition lever center' },
  repLoose: { center: 'rep', kind: 'loose', T: 1 * 56, name: 'Loose repetition lever center' },
  // the humid-summer sticking damper (James Kelly, Cecil Snyder, PTG 2022)
  underTight: { center: 'under', kind: 'tight', T: 15 * 20, name: 'Tight damper underlever center' },
};
// Swing test (spec §8.1): the flange held, the shank level, let go, count the half-swings. A real hammer loses more than
// its center's friction alone takes (air, the felt): technicians' counts fit half-swings ≈ 21 ÷ grams at the flange
// gauge (Chris Brown: 9 for 2.5 g; Fred Sturm: 6-8 for 2-3 g, 3-4 for 6-8 g). An empirical fit, not a published law;
// friction alone, with Hirschkorn's hammer, would give about 7 at his 103 mm·g.
export const SWING_K = 21;
export const swingCount = T => Math.max(1, Math.round(SWING_K * CENTERS.hammer.at / T));
// a part falling back under its own weight against its center's friction: how much of a free part's pull is left
const fallShare = (W, T, T0) => Math.max(0, (W - T) / (W - T0));
// falls back in visibly more time than a healthy one (over about 1.2×: it falls in a time ∝ 1/√pull), or not at all
const fallOf = s => s <= 0 ? 'hangs' : s < 0.7 ? 'slow' : 'free';
export function measureCenters(a) {
  a = eff(a);
  const cf = CENTER_FAULTS[a.center], T = a.centerT, out = { centerFault: a.center || null };
  for (const [k, c] of Object.entries(CENTERS)) {
    out[`${k}Center`] = T[k] / c.at;                      // grams on the gauge
    out[`${k}Play`] = cf?.center === k ? cf.play || 0 : 0;
  }
  out.swings = swingCount(T.hammer);
  // spring unhooked, the wippen held tender up: the jack should fall slowly under its own weight (Don Mannino, 2007,
  // quoted by Jessica Masse, PTG 2023). With the jack's 52 mm·g of weight, Hirschkorn's 40 does just that. The test
  // reads tighter than Igrec's range: a jack between 52 and his 100 mm·g passes the gauge but won't fall (Mannino's own
  // figure for the jack is 1-2 g, 25-50 mm·g). None of the faults sits there.
  out.jackFall = T.jack >= JACK_WT ? 'stays' : T.jack < CENTERS.jack.band[0] * CENTERS.jack.at ? 'flops' : 'slow';
  // Igrec's tilt test: the stack tilted so the wippens hang, pushed toward the shanks and let go; slow ones get gauged
  out.wippenShare = fallShare(WIPPEN_WT, T.wippen, CENTERS.wippen.T); out.wippenTilt = fallOf(out.wippenShare);
  // the wire unhooked, the underlever lifted and let go: it should fall from its own weight (Renner)
  out.ulShare = fallShare(UL_WT, T.under, CENTERS.under.T); out.ulDrop = fallOf(out.ulShare);
  return out;
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
  // wippen angle: the heel's arc rests on the capstan's dome (their centres a fixed distance apart)
  const dome = keyPt(k.By, k.th, [G.capstanLocal, G.keyThick + a.capstan - G.capDomeR]);
  const phi = solve(f => { const c = add(G.W, rot(G.heelC, f)); return Math.hypot(c[0] - dome[0], c[1] - dome[1]); },
    G.heelR + G.capDomeR, 0.4, -0.6);
  const wp = p => add(G.W, rot(p, phi));
  const J = wp(G.jackPivotW), R = wp(G.repPivotW);
  // jack: jackScrew is how far the screw moves the jack's top, mm along its arc about the pin (the top corner's centre is
  // 49.5 mm out). The wippen spec (research/wippen/spec.md §5) divides by 47, the top's height above the pin, which turns
  // it about 5% more per mm; dividing by the radius keeps the knob's millimetres true at the top.
  const psiRest = a.jackScrew / Math.hypot(...G.jackTop);
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
// Brown's sight: the back face of the knuckle's tongue, followed down along its lean to height y, where the back of
// the jack should meet it
export function coreBack(g, y) {
  const x = G.knuckleC[0] + G.coreT / 2, p = hamPt(g, [x, G.knuckleC[1]]), q = hamPt(g, [x, G.knuckleC[1] - 1]);
  return p[0] + (y - p[1]) * (q[0] - p[0]) / (q[1] - p[1]);
}
export const knuckleBottom = g => { const c = hamPt(g, G.knuckleC); return [c[0], c[1] - (G.knuckleR + WEAR.knuckle * wearNow)]; };
// the top of the crown's arc at this angle: the felt that meets the string
export const crownTop = g => { const c = hamPt(g, G.crownC); return [c[0], c[1] + G.crownR + WEAR.crown * wearNow]; };
export const crownY = g => crownTop(g)[1];
const gFromKnuckle = z => solve(g => knuckleBottom(g)[1], z, -0.6, 0.7);
const gFromCrown = y => solve(crownY, y, -0.6, 0.7);
let gStrCache = { w: null, g: 0 };
export function gString() {
  if (gStrCache.w !== wearNow) gStrCache = { w: wearNow, g: gFromCrown(G.stringY) };
  return gStrCache.g;
}
export function gRail(a) { return solve(g => hamPt(g, G.shankRest)[1], a.restRail, -0.6, 0.7); }
// sideways (+ toward the bass) position of a point on the hammer, py above its center pin: spacing puts the resting
// head over its mark, and traveling tilts the swing about the shank line so the head drifts the traveling amount on its
// rise to the string (where the spacing reading is taken)
export const TRAVEL_RISE = 44.5, SIDE_K = G.stringY - TRAVEL_RISE - G.H[1];
export const sideZ = (a, py) => (a.hammerSpace || 0) + (SIDE_K - py) * (a.hammerTravel || 0) / TRAVEL_RISE;
export const gFromTail = y => solve(g => hamPt(g, G.tail)[1], y, -0.6, 0.7);

// spring force on the knuckle (units of hammer weight) with the horn at height z
export const springF = (a, L, z) => a.repSpring + G.repK * Math.max(0, L.hornFree - z);

// where the repetition lever alone would hold the hammer (knuckle height)
export function repSupportZ(a, L) {
  if (springF(a, L, L.hornTop) >= 1) return L.hornTop;
  return Math.min(L.hornTop, L.hornFree - (1 - a.repSpring) / G.repK);
}

// the jack's top-back corner is a small arc: its back edge escapes past the knuckle
export function jackGeom(L, psi) {
  const c = L.jackPt(psi, G.jackTop);
  return { topY: c[1] + G.jackTopR, backX: c[0] + G.jackTopR, backY: c[1] };   // backY: the height of its back edge
}
// The knuckle rests on the jack's top: the face running forward from the corner (square to the leaning arm,
// so it rises toward the front) or the corner's arc. Gap between the knuckle and that profile, mm.
const JACK_FACE_T = (() => {   // where the face leaves the corner arc: the tangent from the face's front end
  const [cx, cy] = G.jackTop, [fx, fy] = G.jackFront, d = Math.hypot(fx - cx, fy - cy);
  const a = Math.atan2(fy - cy, fx - cx) - Math.acos(G.jackTopR / d);
  return [cx + G.jackTopR * Math.cos(a), cy + G.jackTopR * Math.sin(a)];
})();
function jackGap(L, psi, g) {
  const k = hamPt(g, G.knuckleC), R = G.knuckleR + WEAR.knuckle * wearNow, r = G.jackTopR;
  const c = L.jackPt(psi, G.jackTop), t = L.jackPt(psi, JACK_FACE_T), f = L.jackPt(psi, G.jackFront);
  // height the knuckle's center would sit at, resting on the corner arc, the face or the face's front edge, at its own x
  const dx = k[0] - c[0], dxf = k[0] - f[0];
  let h = Math.max(c[1] + Math.sqrt(Math.max(0, (R + r) ** 2 - dx * dx)), f[1] + Math.sqrt(Math.max(0, R * R - dxf * dxf)));
  const len = Math.hypot(f[0] - t[0], f[1] - t[1]), ux = (f[0] - t[0]) / len, uy = (f[1] - t[1]) / len;
  const nx = ux < 0 ? uy : -uy, ny = Math.abs(ux);              // the face's upward normal
  const sOn = (k[0] - t[0] - R * nx) / ux;                     // where along the face it would touch
  if (sOn >= 0 && sOn <= len) h = Math.max(h, t[1] + R * ny + sOn * uy);
  return k[1] - h;
}
// hammer angle with the knuckle sitting on the jack
export const gOnJackAt = (L, psi) => solve(g => jackGap(L, psi, g), 0, -0.6, 0.7);
// When does the knuckle come off the jack? With the jack set by Brown's rule the knuckle rests on the jack's rounded
// back corner, just past where the top face (which rises toward the front) runs into it. As the jack is tripped
// forward the knuckle rolls back over the corner; once its contact leans back further than the face's slope plus the
// friction angle of buckskin on the jack top (Hirschkorn's measured sliding friction; the tops are kept slick so it
// slips), it slides off. That is a modelling criterion built from those two angles, not a force balance.
const SLIP_FRICTION = Math.atan(G.jackMu), RESET_CLEAR = 0.1;   // mm the jack must be clear of the slip point to count as back under
// the x the jack's back edge has to stay behind for the knuckle (hammer at g) to stay on the jack at angle psi
export function slipBack(L, psi, g) {
  const t = L.jackPt(psi, JACK_FACE_T), f = L.jackPt(psi, G.jackFront);
  const slope = Math.atan2(f[1] - t[1], t[0] - f[0]);
  const R = G.knuckleR + WEAR.knuckle * wearNow + G.jackTopR;
  return hamPt(g, G.knuckleC)[0] - (R * Math.sin(slope + SLIP_FRICTION) - G.jackTopR);
}

// Update escape/reset state from the jack geometry. Returns jack angle.
// repetition lever angle that puts the horn at height y
export const repRho = (L, y) => solve(r => L.repPt(r, G.horn)[1], y, L.rhoStop - 0.6, L.rhoStop);
// gap between the jack's top-front corner and the stop felt in the lever's window (> 0: clear)
function feltGap(L, psi, rho) {
  const [p, q] = G.windowFelt.map(v => L.repPt(rho, v)), c = L.jackPt(psi, G.jackFront);
  const ux = q[0] - p[0], uy = q[1] - p[1];
  return ((c[0] - p[0]) * uy - (c[1] - p[1]) * ux) / Math.hypot(ux, uy);
}
// Jack angle for the current state. A tripped jack is stopped by the felt in the repetition lever's window;
// pushed past that (too much aftertouch, or let-off too early) it jams there and st.jammed is set.
export function updateJack(a, L, st, g) {
  const psi = jackFree(a, L, st, g);
  st.jammed = false;
  if (psi <= L.psiRest + 1e-9) return psi;
  const rho = repRho(L, Math.min(L.hornTop, knuckleBottom(g)[1]));
  if (feltGap(L, psi, rho) >= 0) return psi;
  st.jammed = true;
  return feltGap(L, L.psiRest, rho) <= 0 ? L.psiRest : solve(s => feltGap(L, s, rho), 0, L.psiRest, psi);
}
function jackFree(a, L, st, g) {
  const kb = knuckleBottom(g);
  if (!st.escaped) {
    // it lets off once the knuckle slips off its back, when the let-off button has tripped it or it is carrying the
    // knuckle (set too far forward); a knuckle the lever has lifted clear of an untripped jack, as the key comes up,
    // doesn't take it out
    const jg = jackGeom(L, L.psiBtn);
    if (jg.backX < slipBack(L, L.psiBtn, g) && (L.psiBtn > L.psiRest + 1e-9 || gOnJackAt(L, L.psiBtn) >= g - 1e-4)) st.escaped = true;
    else return L.psiBtn;
  }
  // escaped: the jack spring pushes it back as far as the button and knuckle allow
  const tgt = Math.max(L.psiRest, L.psiBtn);
  const jt = jackGeom(L, tgt);
  // the jack angle that puts its back edge just past the point the knuckle slipped off (its spring holds it there,
  // up against the front of the knuckle)
  const pastSlip = () => solve(s => jackGeom(L, s).backX - slipBack(L, s, g), -0.1, tgt, tgt + 0.8);
  if (a.noJackSpring && L.depth > 0.02) return Math.max(tgt, pastSlip());
  // the jack spring can push a rounded jack top back under a knuckle sitting a hair below where the jack would hold it,
  // once the knuckle sitting there would be clear of the slipping point (judged where it would sit, so it can't flicker)
  const gS = gOnJackAt(L, tgt);
  if (knuckleBottom(gS)[1] < kb[1] + (a.wedge ?? G.wedge)) {
    if (jt.backX >= slipBack(L, tgt, gS) + RESET_CLEAR) st.escaped = false;
    return tgt;
  }
  return Math.max(tgt, pastSlip());
}

// Quasi-static hammer angle for the current state.
export function staticHammer(a, L, st, gPrev) {
  const psi = updateJack(a, L, st, gPrev);
  const cands = [gRail(a), gFromKnuckle(repSupportZ(a, L))];
  let jackG = -Infinity;
  if (!st.escaped) { jackG = gOnJackAt(L, psi); cands.push(jackG); }
  if (st.checked) cands.push(gFromTail(L.bcCatchY));
  let g = Math.max(...cands);
  let blocked = false;
  if (g > gString()) { blocked = jackG >= gString(); g = gString(); }
  return { g, psi, blocked, jackG };
}

// ---------- measurements ----------
export function factoryNeighborHeight() { return keyHeightOf({ balPunch: 1.5, frontPunch: 0 }); }
export const NEIGHBOR_H = factoryNeighborHeight();

// start a rest search with the knuckle sitting on the jack, where a regulated hammer rests
const gOnJack = L => gOnJackAt(L, L.psiRest);
function rest(a) {
  a = eff(a);
  const L = linkage(a, 0), st = { escaped: false, checked: false };
  let g = gOnJack(L);
  for (let i = 0; i < 4; i++) g = staticHammer(a, L, st, g).g;
  return { L, st, g, psi: updateJack(a, L, { ...st }, g) };
}

// slow press from rest to the bottom; reports let-off, drop and aftertouch
export function slowPress(a, step = 0.01) {
  a = eff(a);
  const dip = dipOf(a);
  const st = { escaped: false, checked: false };
  let g = rest(a).g, dEsc = null, letoff = null, blockedAt = null, maxCrown = -Infinity, slipped = false;
  let dropLow = null, rising = false, dTender = null, dScrew = null;
  for (let d = 0; d <= dip + 1e-9; d += step) {
    const L = linkage(a, d);
    // when the jack's tender reaches the let-off button, and the repetition lever the drop screw
    if (dTender === null && L.psiBtn > L.psiRest + 1e-9) dTender = d;
    if (dScrew === null && L.rhoDrop < L.rhoStop) dScrew = d;
    const wasEsc = st.escaped;
    const r = staticHammer(a, L, st, g);
    if (r.blocked) { blockedAt = d; g = r.g; break; }
    // let off before the button tripped the jack: a jack set too far forward lets the knuckle slip off its back
    if (!wasEsc && st.escaped && dEsc === null) { dEsc = d; letoff = G.stringY - crownY(g); slipped = L.psiBtn <= L.psiRest + 1e-9; }
    g = r.g;
    maxCrown = Math.max(maxCrown, crownY(g));
    // drop is judged just after let-off, where the hammer lands on the lever; as the key goes on down the lever lifts
    // it back some, and Igrec says to ignore that rise
    const dist = G.stringY - crownY(g);
    if (dEsc !== null && !rising) { if (dropLow === null || dist >= dropLow - 1e-6) dropLow = dist; else rising = true; }
  }
  const bottomD = blockedAt ?? dip;
  return {
    dip, dEsc, blockedAt, dTender, dScrew,
    letoff, // distance from string at the moment the jack trips
    dropLow, // distance from string where the hammer lands just after let-off
    dropFromString: G.stringY - crownY(g),
    aftertouch: dEsc === null ? 0 : bottomD - dEsc,
    escaped: st.escaped, gBottom: g, closest: G.stringY - maxCrown, slipped,
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
  // where the hammer sits on the jack, and where it would drop to with the jack tripped (the lever, or the rail)
  const gJ = gOnJackAt(L, L.psiRest), gL = Math.max(gRail(a), gFromKnuckle(repSupportZ(a, L)));
  const sp = slowPress(a);
  const net = springNet(a);
  const Lb = linkage(a, sp.blockedAt ?? sp.dip);
  const gChk = gFromTail(Lb.bcCatchY);
  const onRail = Math.abs(g - gRail(a)) < 1e-4;
  // lost motion: with the hammer on the rail, the key travel before the jack (or lever) reaches the knuckle and the hammer starts up
  let play = 0;
  if (onRail) {
    const st = { escaped: false, checked: false }, c0 = crownY(g);
    for (let d = 0.01; d <= sp.dip; d += 0.01) { if (crownY(staticHammer(a, linkage(a, d), st, g).g) > c0 + 0.005) break; play = d; }
  }
  const pyTail = hamPt(gChk, G.tail)[1] - G.H[1];
  return {
    keyHeight: keyHeightOf(a) - NEIGHBOR_H,
    jackPos: jg.backX - coreBack(g, jg.backY),
    jackUnder: jg.backX >= slipBack(L, L.psiRest, gJ) + RESET_CLEAR,   // the sim's own test for a jack back under the knuckle
    jackSlips: sp.slipped,
    wippenSpacing: jackSide(a) - sideZ(a, kc[1] - G.H[1]),
    // trip the jack at rest: the hammer settles onto the repetition lever. That small drop is the wink.
    // Negative means the lever is already holding the hammer off the jack.
    wink: crownY(Math.max(gJ, gRail(a))) - crownY(gL),   // a hammer on the rail (lost motion) doesn't move at all
    jackReturns: knuckleBottom(gJ)[1] - knuckleBottom(gL)[1] < a.wedge && !a.noJackSpring,
    hammerOnJack: Math.abs(g - gJ) < 2e-4,
    blow: G.stringY - crownY(g),
    restGap: hamPt(g, G.shankRest)[1] - a.restRail,
    onRail, lostMotion: play,
    dip: sp.dip,
    letoff: sp.letoff,
    blocked: sp.blockedAt !== null,
    drop: sp.letoff === null ? null : sp.dropLow - sp.letoff,
    // key travel from the tender meeting the let-off button to the lever meeting the drop screw (+: the screw comes later)
    screwAfterButton: sp.dTender === null || sp.dScrew === null ? null : sp.dScrew - sp.dTender,
    aftertouch: sp.aftertouch,
    spring: net,
    // the spring's band was set on the healthy action: a center tighter than that takes its extra friction off the lift
    springState: net > G.checkHold ? 'jumps' : net > G.popNet ? 'pop' : net < 0 ? 'none' : net - a.centerFrX < G.weakNet ? 'weak' : 'good',
    check: G.stringY - crownY(gChk),
    backcheckAlign: a.backcheckSpace - sideZ(a, pyTail), backcheckSquare: a.backcheckSquare,
    scrapes: a.backcheck > G.bcScrapeLean,
    bcMisses: a.backcheck < -G.bcMissLean,
    dropAtString: sp.letoff !== null && sp.dropFromString < 0.05,
    noCheck: net > G.checkHold,
    press: sp,
    hammerTravel: a.hammerTravel, hammerSpacing: a.hammerSpace - a.hammerTravel, hammerSquare: a.hammerSquare,
    hammerSound: a.damage ? 1 : 0, damage: a.damage || null,
    ...measureDampers(a),
    ...measureKey(a),
    ...measureCenters(a),
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
    damperSeat: a.damperCenter, damperLevel: a.damperLevel,
    fallMs: 1000 * damperFallTime(a, pedalH),
    keyLiftBottom,
  };
}

// pass/fail for one spec given a measurement set; k scales the tolerance (skill level)
export function grade(id, m, k = 1) {
  const s = { ...SPEC[id], tol: SPEC[id].tol * k };
  let v = m[id];
  if (s.center) {
    const [lo, hi] = CENTERS[s.center].band;
    const note = [v > hi ? 'tight' : v < lo ? 'loose' : '', m[`${s.center}Play`] ? 'side play' : ''].filter(Boolean).join(', ');
    return { ok: !note, v, note };
  }
  if (id === 'letoff' && m.blocked) return { ok: false, v: null, note: 'blocks: jack never lets off' };
  if (id === 'damperTiming' && v == null) return { ok: false, v: null, note: 'the key never lifts the damper' };
  if (v === null || v === undefined) return { ok: false, v: null, note: 'no let-off' };
  if (id === 'jackPos' && !m.jackUnder) return { ok: false, v, note: 'jack is not under the knuckle' };
  if (id === 'jackPos' && m.jackSlips) return { ok: false, v, note: 'too far forward: the knuckle slips off it before let-off' };
  if (id === 'wink' && v < 0) return { ok: false, v, note: 'no wink: the lever holds the hammer off the jack' };
  if (id === 'wink' && !m.jackReturns) return { ok: false, v, note: 'jack will not return under the knuckle' };
  if (id === 'restGap' && m.onRail) return { ok: false, v, note: m.lostMotion > 0.05 ? 'hammer sits on the rail: lost motion' : 'hammer sits on the rail' };
  if (id === 'check' && m.scrapes) return { ok: false, v, note: 'tail scrapes the backcheck' };
  if (id === 'check' && m.bcMisses) return { ok: false, v: null, note: 'the backcheck misses the tail: the hammer bounces back' };
  // held against the string at the bottom: by a drop screw set too high (no drop at let-off), or, with the drop itself
  // fine, by too much aftertouch carrying the lever back up as the key goes on down
  if (id === 'drop' && m.dropAtString) return v != null && v >= s.target - s.tol
    ? { ok: false, v, note: 'the lever lifts the hammer back up to the string at the bottom: too much aftertouch' }
    : { ok: false, v: null, note: 'no drop: the lever holds the hammer against the string' };
  if (id === 'spring' && m.bcMisses) return { ok: false, v: null, note: 'can\'t be set: the backcheck misses, so the hammer never checks' };
  if (id === 'check' && m.noCheck) return { ok: false, v, note: 'hammer will not stay checked' };
  if (id === 'damperStop' && v <= 0.05) return { ok: false, v, note: 'dampers hit the stop rail before the key bottoms' };
  if (id === 'pedalLift' && m.pedalIntoStop) return { ok: false, v, note: 'the pedal drives the dampers into the stop rail' };
  if (id === 'pedalLift' && v < 0) return { ok: false, v, note: 'the pedal lifts the dampers less than the keys do' };
  if (id === 'hammerSquare' && m.damage === 'splitShank') return { ok: false, v, note: 'the head wobbles from blow to blow' };
  if (id === 'hammerSound') return m.damage ? { ok: false, v, note: DAMAGE[m.damage].signs } : { ok: true, v, note: 'solid and quiet' };
  // a wire dragging in its guide bushing or a tight underlever center: the pedal test can't tell which
  if (id === 'damperFall') return { ok: v <= s.tol, v, note: v <= s.tol ? 'falls freely' : 'drags: falls late' };
  if (id === 'keyBushings') {
    const note = v < 0.05 ? 'no side play at the front: the front bushing binds'
      : m.balPlay < 0.05 ? 'no play at the balance pin: the balance bushing binds'
      : m.keyFall === 'hangs' ? 'a tight bushing holds the key up' : m.keyFall === 'slow' ? 'the key drops slowly'
      : v > s.target + s.tol ? 'a knock each way at the front: the front bushing is worn' : '';
    return { ok: !note && Math.abs(v - s.target) <= s.tol, v, note };
  }
  // two readings each: sideways in mm, and square (degrees) or seated (mm one end is up)
  if (id === 'backcheckAlign') return { ok: Math.abs(v) <= s.tol && Math.abs(m.backcheckSquare) <= s.tolSq * k, v, note: '' };
  if (id === 'damperSeat') return { ok: Math.abs(v) <= s.tol && Math.abs(m.damperLevel) <= s.tolLevel * k, v, note: '' };
  if (id === 'spring') {
    const notes = { good: 'rises positively, no pop', weak: 'sluggish rise', none: 'hammer does not rise', pop: 'pops: bump felt in the key', jumps: 'jumps out of check' };
    return { ok: m.springState === 'good', v, note: notes[m.springState] };
  }
  return { ok: Math.abs(v - s.target) <= s.tol, v, note: '' };
}

// ---------- factory regulation (solve every knob to its spec) ----------
const bis = (a, id, f, target, lo, hi) => { a[id] = solve(x => { a[id] = x; return f(); }, target, lo, hi, 30); };
export function factory() {
  const a = { balPunch: 1.5, jackScrew: 0, repStop: 0, capstan: 13.5, restRail: 110, frontPunch: 2.5,
              letoff: 94, drop: 140, repSpring: 0.8, backcheck: 0, damperGap: 4, damperStop: 8, pedalLift: 8, damperDrag: 0.05,
              hammerTravel: 0, hammerSpace: 0, hammerSquare: 0, wippenSpace: 0, wippenTravel: 0, backcheckSpace: 0, backcheckSquare: 0, damperCenter: 0, damperLevel: 0 };
  for (let pass = 0; pass < 5; pass++) {
    bis(a, 'jackScrew', () => measure(a).jackPos, 0, -7, 2);
    bis(a, 'repStop', () => measure(a).wink, SPEC.wink.target, -2, 2);
    bis(a, 'capstan', () => measure(a).blow, SPEC.blow.target, 6, 20);
    a.restRail = hamPt(rest(a).g, G.shankRest)[1] - SPEC.restGap.target;
    bis(a, 'frontPunch', () => dipOf(a), SPEC.dip.target, 0, 8);
    bis(a, 'letoff', () => measure(a).letoff ?? 0, SPEC.letoff.target, 84, 102);
    bis(a, 'drop', () => measure(a).drop ?? 0, SPEC.drop.target, 128, 152);
    bis(a, 'backcheck', () => measure(a).check, SPEC.check.target, -4, 4);
    // set for SPEC.spring's rise from check (net 0.55 hammer weights), which takes about 1.355 at rest. The Boston's
    // measured spring is 1.16 at rest (research/wippen/spec.md §3, §5): here that rises from check with 0.35, still a
    // pass, but toward the sluggish end.
    bis(a, 'repSpring', () => measure(a).spring, SPEC.spring.target, 0.3, 2.4);
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
// Damping while the knuckle rides the repetition lever up. 20 fits Scott Murphy's high-speed videos (PTG Education Hub,
// "High Speed Video of the Grand Piano Action"): the app's ease-up rises out of check at about 0.16 m/s at the crown,
// floats 1.3 mm over the drop screw and dips 0.5 below where it then sits (his ease-up on a Steinway action model: about
// 0.12 m/s, 1.2 mm, 0.45); on his grand the soft blows of "Hammer Bobbling" rise back at 0.18-0.28 m/s, and with
// this the sim's give 0.15-0.22 (its catch stops the hammer a moment first).
const DAMP = 20;
// Moving up faster than this (rad/s) when the lever stops at the drop screw, the hammer carries on and floats; slower,
// it stays on the lever
const FLOAT_W = 0.05;
// A hammer settling down onto the repetition lever is braked by friction, in hammer weights at the horn, worked out
// at the drop position: the lever's center (Hirschkorn Table A.9, 252 g·mm, the lever turning 0.53 times the hammer's
// angle over the knuckle's 17.3 mm arm, 88 g of hammer) gives 0.088, and the knuckle sliding on its buckskin (Table A.8
// contact 10, kinetic friction 0.33, about 0.15 mm of slide for each mm pressed down) gives 0.05 for each hammer weight
// the spring pushes with: about 0.16 in all at the drop screw. Without it, a slow press with a little too much drop
// carried the hammer on past the lever into check.
const REP_CENTER = 0.088, REP_SLIDE = 0.05;
// A knuckle coming down onto the lever (the contact starting while the hammer falls: just after let-off, a rebound
// coming back onto it, or catching up with a lever moving away) loses a fixed energy, worth this many mm of fall at
// the crown. A small landing dies; a fast one carries on into check, so only blows near the check threshold change
// (at factory a strike and hold now needs about 180 mm/s of key speed to check; 170 without this).
// Fitted to Scott Murphy's high-speed videos of a Steinway grand action model (PTG Education Hub, "High Speed Video of
// the Grand Piano Action"): after a rise from check the hammer floated 1.2 mm (at the crown) over the drop screw and
// came back only about 0.45 mm below where it then sat, still a frame (33 ms) later; the same test here gives 0.54,
// and the sim's own ease-up, now that the hammer floats (FLOAT_W), floats 1.3 mm and dips 0.52.
// Hirschkorn's damping for this contact (Table A.8, contact 10, 2.935 s/m) takes only about 4% off at let-off speeds,
// so it can't account for that on its own.
const LAND_LOSS = 1.0;
const POP_W = 2.0;   // leaving the lever faster than this is a visible pop
const STRIKE_W = 0.5; // reaching the string slower than this, the hammer just leans on it (rad/s)
// Rebound off the string. In Scott Murphy's high-speed videos (PTG Education Hub, "High Speed Video of the Grand Piano
// Action") a clean strike, the jack escaped and the key held, comes back at 0.41-0.63 of its speed over seven blows from
// pp to fff on a Shigeru Kawai action model (median 0.49, a little less the harder the blow), and at 0.59 off a grand's
// string.
const REST_E = 0.5;
// The backcheck gives like a spring: a hammer coming down into it goes on by CHECK_TAU (s) times its speed, slowing
// evenly, and is held where it stops. On the Shigeru model the check came 3.7 mm deeper for each m/s the hammer left the
// string at (19.4 mm after p, 26.5 after ff), 13-36 ms after the strike. It starts to take the hammer CHECK_GIVE (mm at
// the crown) above its face, the give of the Strike and hold test's blow (250 mm/s) at factory, so that blow stops at the
// face and the check reading, the factory and the miss and scrape leans stay where they were. A softer blow is held short
// of the face, a harder one past it; the drawn backcheck doesn't give.
const CHECK_TAU = 0.0037;
const CHECK_GIVE = 2.2;
const STRIKE_R = Math.hypot(G.crownC[0], G.crownC[1] + G.crownR);   // centre pin to the felt that meets the string, mm
// The backcheck only grips a tail that comes into it firmly. In Scott Murphy's "Hammer Bobbling" clips (PTG Education
// Hub, a grand filmed at 1000 frames/s) every firm blow (1.2-1.5 m/s at the string) stayed checked and every soft one
// (0.84-0.97 m/s) was slowed by the backcheck and came straight back out onto the repetition lever, with normal
// regulation and with too little drop, a strong spring or too little aftertouch (the line falls between 0.63 and
// 0.75 m/s off the string; his p blow on the Shigeru model, 0.78 off, was held too). Driven by the same key motion,
// the sim's catches begin at 0.49-0.73 m/s at the crown for the firm blows, 0.45 for the Shigeru p, and 0.23-0.40 for
// the soft ones, so the line sits between (narrowly: the sim's softer rebound leaves the p blow just above it). A
// catch slower than this (m/s at the crown) doesn't hold if the spring lifts there at all; a firmer one holds up to
// G.checkHold, as before. The app's Strike and hold (250 mm/s) catches at 0.51-0.71 on every fault case tried.
const CHECK_HOLD_V = 0.42;
const BOUNCE_V = 0.01;  // a knuckle landing on the jack slower than this (m/s) just settles
// A jack spring working the jack's rounded top back under a knuckle that sits a hair below where the jack would hold
// it (up to G.wedge) doesn't snap the hammer up. At the reset the hammer stays where it is and keeps its speed, and
// the jack takes up the gap over this long (s), along a smoothstep whose sharpest slowing (57 rad/s^2 at the full
// wedge) stays under the hammer's own fall, so it never throws it. While the backcheck holds the tail it can't lift
// it at all. Scott Murphy's high-speed videos (PTG Education Hub, "High Speed Video of the Grand Piano Action") show
// no lift at the reset on a quick release, and a hammer falling straight on past it; the time itself isn't measured.
// Before this the reset lifted the crown 3.2 mm in one step, stopped a falling hammer in mid-air, and could fire a
// checked hammer at the string when the check let go.
const WEDGE_T = 0.05;

export class Sim {
  constructor(a) { this.setAdj(a); this.reset(); }
  setAdj(a) { this.a = eff(a); this.dip = dipOf(this.a); }
  reset() {
    this.d = 0; this.dTarget = 0; this.keySpeed = 40;
    this.st = { escaped: false, checked: false, aboveCheck: false, dChecked: 0 };
    const L = linkage(this.a, 0);
    let g = gOnJack(L); for (let i = 0; i < 4; i++) g = staticHammer(this.a, L, this.st, g).g;
    this.g = g; this.w = 0; this.psi = L.psiRest; this.L = L; this.events = [];
    this.blocked = false; this.scraped = false; this.jammed = false; this.bounceD = null; this.floatD = null; this.struckD = null; this.onBtn = false; this.onScrew = false;
    this.onRep = false;
    this.wedge0 = 0; this.wedgeT = 0;   // the gap a jack that has just reset still has to take up (rad), and for how long it has
    // a key held down by a tight bushing, and the hand lifting it; the key tests' rocking, twisting and stack-off
    // drop are drawn from keyRock (mm sideways at the front, + bass), keyTwist (rad) and keyShown (key travel)
    this.stuck = false; this.lifting = false; this.keyRock = null; this.keyTwist = null; this.keyShown = null; this.stackOff = false;
    // the center tests' side play, drawn from jackRock (mm at the jack's top), wippenRock (mm at the jack, the wippen moving
    // on its flange) and hammerRock (mm at the crown), + bass; ulShown lifts the underlever alone (mm at its lift felt)
    this.jackRock = this.wippenRock = this.hammerRock = this.ulShown = null;
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
      if (this.up) {
        this.up = false; this.emit('seated', { t: this.t, airMs: this.liftedAt === null ? null : 1000 * (this.t - this.liftedAt), v: -v });
      }
      if (-v > G.dmpBounceV) { this.emit('damperbounce'); v = 0.3 * -v; y = 0.01; }
      else { y = 0; v = 0; }
    }
    this.yd = y; this.vd = v;
  }
  emit(type, data = {}) { this.events.push({ type, d: this.d, g: this.g, ...data }); }
  press(target, speed) {
    // letting a key up again once it has stuck down: the hand lifts it. Pressed and let go instead, it stays down,
    // and says so again. Pressed down, a tight key binds again.
    if (target > this.d) this.lifting = false;
    else if (this.stuck && target < this.d) { if (target === 0 && this.dTarget === 0) this.lifting = true; else this.emit('keystuck'); }
    this.dTarget = Math.max(0, Math.min(target, this.dip + 1)); this.keySpeed = speed;
  }
  step(dt) {
    const a = this.a, st = this.st;
    const dPrev = this.d;
    const dir = Math.sign(this.dTarget - this.d);
    // the action's weight brings a key up; a tight bushing's friction slows it, or holds it down
    let speed = this.keySpeed;
    if (dir < 0 && !this.lifting && (BUSHINGS[a.bushing]?.drag || a.wippenDrag > 0)) {
      speed = Math.min(speed, KEY.upSpeed * keyUpShare(a));
      if (speed <= 0 && !this.stuck) { this.stuck = true; this.emit('keystuck'); }
    }
    this.d += dir * Math.min(Math.abs(this.dTarget - this.d), speed * dt);
    this.d = Math.max(0, Math.min(this.d, this.dip));
    if (this.d === 0) this.stuck = this.lifting = false;
    // a worn bushing lets the key knock on its pins as a blow bottoms it
    if (BUSHINGS[a.bushing]?.clicks && dPrev < this.dip && this.d >= this.dip && this.keySpeed >= 100) this.emit('keyclick');
    let L = linkage(a, this.d);
    // the jack's tender reaching the let-off button, and the repetition lever the drop screw: in a well-regulated
    // action the two meet together
    const onBtn = L.psiBtn > L.psiRest + 1e-9, onScrew = L.rhoDrop < L.rhoStop;
    if (onBtn && !this.onBtn) this.emit('tender');
    if (onScrew && !this.onScrew) this.emit('dropscrew');
    this.onBtn = onBtn; this.onScrew = onScrew;
    const wasEsc = st.escaped;
    this.psi = updateJack(a, L, st, this.g);
    if (!wasEsc && st.escaped) this.emit('letoff', { dist: G.stringY - crownY(this.g) });
    // the jack back under the knuckle drives the next strike: a new blow, not a bobble off the lever
    if (wasEsc && !st.escaped) { this.emit('reset'); this.struckD = this.floatD = null; }
    if (st.jammed && !this.jammed) this.emit('jackjam');
    this.jammed = st.jammed;
    let jackG = st.escaped ? -Infinity : gOnJackAt(L, this.psi);
    const gHorn = gFromKnuckle(L.hornTop);
    const kz = knuckleBottom(this.g)[1];
    const onRep = kz <= L.hornTop + 1e-6;
    // Off the lever, the hammer's center pin drags on its swing either way: Coulomb friction, all of it (a.hammerFr, from
    // CENTERS; it never holds a hammer up against its weight). On the lever, DAMP, REP_CENTER and LAND_LOSS were fitted on
    // the healthy action with the hammer's own friction folded in, so there only a center tighter than healthy adds its
    // extra (a.hammerFrX, a.centerFrX), and the lever's brake goes with its center's torque (a.repFr).
    let acc = -GA;
    if (!onRep) acc -= Math.sign(this.w) * GA * a.hammerFr;
    // the lever damps the hammer's rise; a falling hammer compresses the spring against the lever's friction
    const sF = onRep ? springF(a, L, kz) : 0;
    if (onRep) acc += GA * sF - (this.w > 0 ? DAMP * this.w : 0);
    let w = this.w + acc * dt;
    // rising on the lever (or about to), a tight center's extra friction slows it, or holds it if the lift can't beat it
    if (onRep && this.w >= 0 && w > 0) w = Math.max(0, w - GA * a.centerFrX * dt);
    // landing on the lever from free flight takes LAND_LOSS out of the fall
    if (onRep && !this.onRep && w < 0) w = -Math.sqrt(Math.max(0, w * w - 2 * GA * LAND_LOSS / STRIKE_R));
    this.onRep = onRep;
    // the lever's friction slows a hammer coming down, or holds one still when the spring and its weight nearly balance,
    // but never throws it back up
    if (onRep && this.w <= 0 && w < 0) w = Math.min(0, w + GA * (a.repFr + REP_SLIDE * sF + a.hammerFrX) * dt);
    let g = this.g + w * dt;
    // the backcheck: where it starts to take the hammer, and where it has it this step if it holds or is catching it
    const gC = gFromTail(L.bcCatchY);
    const gTake = gC + CHECK_GIVE / STRIKE_R;
    const gHeld = st.checked ? gTake - st.give
      : st.catching ? this.g + Math.min(0, this.w + st.wCatch / (2 * CHECK_TAU) * dt) * dt : Infinity;
    // a jack that has just reset sits at the knuckle and takes up the gap under it over WEDGE_T; under a hammer the
    // backcheck has, it sits where the backcheck has it, so it doesn't lift it off by a rounding or a key still rising
    const gAt = Math.min(g, gHeld);
    if (st.escaped) this.wedge0 = 0;
    else if (wasEsc) { this.wedge0 = Math.max(0, jackG - gAt); this.wedgeT = 0; }
    if (this.wedge0 > 0) {
      const x = Math.min(1, this.wedgeT / WEDGE_T);
      jackG = wasEsc ? gAt : jackG - this.wedge0 * (1 - x * x * (3 - 2 * x));   // at the reset exactly at the hammer, not a rounding error above it
      if (!st.checked && !st.catching) this.wedgeT += dt;
      if (x >= 1) this.wedge0 = 0;
    }
    const jackDriving = jackG >= this.g - 1e-6;
    if (onRep && g > gHorn && !jackDriving) {
      // The lever stops at the drop screw and the hammer carries on up with its own speed, then falls back onto it (a
      // float: Scott Murphy's clips show 1.2-2.4 mm over the drop screw after a rise out of check); a crawl stays on the
      // lever. A pop is the spring kicking it up fast as the key comes up or holds; on the way down the blow just leaves it.
      if (w > POP_W) { if (!this.popped && this.dTarget <= this.d) this.emit('pop'); this.popped = true; }
      else if (w < FLOAT_W) { g = gHorn; w = Math.min(w, (gHorn - this.g) / dt); }
      // off the lever after this key-down has already struck: striking again before the key comes up is a bobble
      if (w >= FLOAT_W && this.struckD !== null && this.floatD === null) this.floatD = this.d;
    }
    if (jackG > g) {
      // With the key held down on the front rail, a hammer falling back onto a jack that has not escaped far enough
      // meets it on a bottomed key and bounces off the knuckle: Hunt and Crossley's restitution for Hirschkorn's
      // damping factor of that contact. That is the double repeat Igrec puts down to too little aftertouch; here it
      // takes a key with almost none, since the model's jack escapes cleanly once its back passes the knuckle's center.
      // Anywhere else the key and wippen give under the knuckle and it settles.
      // A jack slipping back under lifts the knuckle a hair; that lift comes out of the bounce, not on top of it.
      const vk = -this.w * G.knuckleC[0] / 1000;   // the knuckle's downward speed, m/s
      if (vk > BOUNCE_V && this.d >= this.dip - 0.02) {
        w = Math.sqrt(Math.max(0, (Math.max(0, 1 - 2 / 3 * G.jackD * vk) * this.w) ** 2 - 2 * GA * Math.max(0, jackG - g)));
        this.bounceD = this.d;   // a strike before the key comes back up is a bobble
      }
      // otherwise the jack drives it (one slipping back under lifts it gently: WEDGE_T)
      else w = Math.max(w, Math.min(40, (jackG - this.g) / dt));
      g = jackG;
    }
    const gR = gRail(a);
    if (g < gR) { g = gR; w = Math.max(0, w); }
    // backcheck. A jack that hasn't let off and rises above where the backcheck has the hammer lifts it off and carries
    // it on (gFree, wFree: the step without the backcheck); it doesn't build up under a held hammer and fire it when the
    // check lets go.
    const gFree = g, wFree = w;
    const catchActive = L.depth >= G.bcInPath && a.backcheck >= -G.bcMissLean;
    if (catchActive && g > gC + 0.02) st.aboveCheck = true;   // 0.02 rad is above gTake too
    if (!catchActive) st.aboveCheck = false;
    if (catchActive && w > 0 && g < gC && a.backcheck > G.bcScrapeLean && !this.scraped) { this.scraped = true; this.emit('scrape'); }
    // the hammer falls past where the backcheck takes it, or a key still going down carries that point up past the
    // hammer within the step (so the hammer was above where it stood a step ago)
    let caughtNow = false;
    if (!st.checked && !st.catching && catchActive && st.aboveCheck && g < gTake && w < 0 &&
        (this.g >= gTake || this.g >= gFromTail(this.L.bcCatchY) + CHECK_GIVE / STRIKE_R)) {
      // the tail meets the backcheck, which takes up the hammer's speed over CHECK_TAU x that speed
      st.catching = true; st.dChecked = this.d; st.wCatch = -this.w; caughtNow = true;
      g = this.g; w = this.w;
    }
    if (st.catching) {
      // a key coming up lets go of the tail while it's still being caught, as it does once it's held
      if (this.d < st.dChecked - 0.8 || !catchActive) { st.catching = false; st.aboveCheck = false; this.emit('uncheck'); }
      else {
        st.dChecked = Math.max(st.dChecked, this.d);
        w = Math.min(0, this.w + st.wCatch / (2 * CHECK_TAU) * dt);
        g = this.g + w * dt;
        if (jackG > g + 1e-6) { st.catching = false; st.aboveCheck = false; if (!caughtNow) this.emit('uncheck'); g = gFree; w = wFree; }
        else if (w >= 0) {
          st.catching = false; w = 0;
          // too soft a catch to grip: if the spring lifts at all there, it takes the hammer straight back out
          if (st.wCatch * STRIKE_R / 1000 < CHECK_HOLD_V && springF(a, L, Math.min(knuckleBottom(g)[1], L.hornTop)) > 1) {
            this.emit('softcheck', { dist: G.stringY - crownY(g) });
          } else {
            st.checked = true; st.give = gTake - g;
            this.emit('checked', { dist: G.stringY - crownY(g) });
          }
        }
      }
    }
    if (st.checked) {
      st.dChecked = Math.max(st.dChecked, this.d);
      const net = springF(a, L, Math.min(knuckleBottom(gTake - st.give)[1], L.hornTop)) - 1;   // the spring where the knuckle is held
      if (net > G.checkHold) { st.checked = false; this.emit('jumpcheck'); }
      else if (this.d < st.dChecked - 0.8 || !catchActive) { st.checked = false; st.aboveCheck = false; this.emit('uncheck'); }
      else if (jackG > gTake - st.give + 1e-6) { st.checked = false; st.aboveCheck = false; this.emit('uncheck'); g = gFree; w = wFree; }
      else { g = gTake - st.give; w = 0; } // the backcheck grips the tail where it stopped it
    }
    // string
    if (g > gString()) {
      if (jackG >= gString() - 1e-9 && !st.escaped) {
        g = gString(); w = 0; this.d = dPrev; this.dTarget = Math.min(this.dTarget, dPrev);
        if (!this.blocked) this.emit('blocked'); this.blocked = true;
        L = linkage(a, this.d);
      } else if (w > STRIKE_W) {
        this.strikes = (this.strikes || 0) + 1;
        this.emit('strike', { v: a.power * w * STRIKE_R / 1000 });
        // thrown back up off the jack, or floated up off the repetition lever, and struck again: the hammer bobbled
        if (this.bounceD !== null) this.emit('bobble');
        else if (this.floatD !== null) this.emit('bobble', { lever: true });
        this.bounceD = null; this.floatD = null; this.struckD = this.d;
        if (a.clicky) this.emit('click');
        g = gString(); w = -REST_E * Math.abs(w);
      } else {
        // pushed up to the string by the repetition lever: it rests there and buzzes, no blow
        if (!this.buzzing) this.emit('buzz', { held: onRep });   // held: the lever holds it there; else a blow too soft to sound
        this.buzzing = true; g = gString(); w = Math.min(0, w);
      }
    }
    if (this.d < 0.5) { this.scraped = false; this.popped = false; }
    if (this.bounceD !== null && this.d < this.bounceD - 0.5) this.bounceD = null;   // the key came up: a new blow is a new note
    // only a new blow from the jack (its reset, above) or the key back up ends the note: easing the key up a little,
    // the hammer can still float up off the lever and strike again
    if (this.d < 0.5) this.struckD = this.floatD = null;
    if (g < gString() - 1e-4) { this.blocked = false; this.buzzing = false; }   // off the string: a new blow can block or buzz again
    this.g = g; this.w = w; this.L = L;
    this.stepDamper(dt);
  }
  run(seconds, dt = 0.0002) { for (let t = 0; t < seconds; t += dt) this.step(dt); }
}

// Factory regulation solved offline with factory() (node), so the page loads fast.
export const FACTORY = {"balPunch":1.5,"jackScrew":-0.5732,"repStop":-0.4591,"capstan":13.8078,"restRail":110.7759,"frontPunch":2.299,"letoff":95.6693,"drop":140.2303,"repSpring":1.3553,"backcheck":0.5226,"damperGap":3.5071,"damperStop":5.0557,"pedalLift":5.0057,"damperDrag":0.05,"hammerTravel":0,"hammerSpace":0,"hammerSquare":0,"wippenSpace":0,"wippenTravel":0,"backcheckSpace":0,"backcheckSquare":0,"damperCenter":0,"damperLevel":0};
