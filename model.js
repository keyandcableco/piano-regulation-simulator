// Grand action model: one key, side view, millimetres.
// x runs toward the back of the piano (strings), y is up, keybed at y = 0.
// Every moving part is a rigid lever on a pivot; regulation screws and
// punchings set where the levers meet. The regulation readings (measure, grade)
// are worked out from where the parts stand. The Sim plays the key: a finger's
// force on a key with weight, the hammer thrown, caught and brought home.

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
  bcHead: [219.08, 77.22],          // key-local: where the backcheck's buckskin catches the tail (key down)
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
  // The shank is level at the strike (the hammer's centreline square to the string), as the makers lay a grand out, and at
  // factory rests 18.79° head-down for the textbook 1¾ in blow (44.45 mm). Two figures here are not Hirschkorn's:
  // - the string (stringY, below) is 8.2 mm lower than his contact 12. His "string" was a metal bar on a cut-down test rig
  //   (thesis §3.1), so its height is the rig's, and against it the shank passed level and struck 3.6° head-up.
  // - the knuckle and its core are turned 3.44° about the center pin from where he measured them ([16.96, -9.08], the
  //   core square to the shank): 1.1 mm, which leaves them where they were over the wippen with the shank resting that
  //   much lower (coreLean). With his knuckle on the lower-resting shank, the jack lined up to the core (jackPos) slips
  //   out from under the knuckle 35 mm short of the string.
  // No source gives the Boston's real string height or its shank's attitude at the strike (D. Conte, RPT, 2026-11-10: not
  // every grand is laid out level, but 3.6° is more than he would expect).
  H: [323.3, 146.1], knuckleC: [17.47, -8.05], knuckleR: 4.4,
  coreLean: 3.44 * Math.PI / 180,   // the core's lean from square to the shank (above)
  coreT: 1.2, coreEnd: 1.2,         // the knuckle's wood core: a thin tongue through the roll's middle, ending this far past its centre (Greg's photo)
  crownC: [132.13, 35.6], crownR: 10.2,  // felt top 45.8 above the shank, 140 out from the centre pin
  tail: [133.26, -21.1],            // the point on the tail's scored back face that the backcheck catches
  shankRest: [110.0, -3.14],        // underside of the shank where it meets the rest rail
  // strings and rails
  stringY: 191.9,
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
  // The underlever, placed by Steinway's rules for setting the underlever frame (technical reference guide, damper
  // chapter; New York Steinway's rules, used here on a Boston for want of its own): the flange center pin 2 1/4 in above
  // the keybed at the bass end and about 3/16 in higher at the treble (59.9 at note 52), and the key-end felt's contact,
  // midway through the damper's stroke, on the straight line from that pin to the key's balance point.
  ulPivot: [560, 59.9],             // underlever flange center pin
  ulFelt: [-94, 0],                 // underlever-local (its x axis is that line): the lift felt's face, over the key's end
  ulWire: [-52, 15],                // where the top flange clamps the damper wire, straight under the head
  dmpGravity: 5000,                 // head falling under its own weight, mm/s^2
  dmpBounceV: 350,                  // a head landing faster than this (mm/s) bobbles on the strings
};
// head lift per mm of underlever lift at the key end, from where the wire and the lift felt sit on the underlever (taken
// midway through the stroke, the underlever lying along the line to the balance point): 0.57
{
  const th = Math.atan2(G.ulPivot[1] - (G.balRailY + 1.5), G.ulPivot[0] - G.balX), c = Math.cos(th), s = Math.sin(th);
  G.dmpRatio = (G.ulWire[0] * c - G.ulWire[1] * s) / (G.ulFelt[0] * c - G.ulFelt[1] * s);
}

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
  { id: 'balPunch', name: 'Balance rail punchings', part: 'balance', unit: 'mm', min: 0, max: 2.5,   // more, and the key's back end reaches the wippen rail at the bottom
    steps: [0.1, 0.25], stepLabel: ['0.004" paper', '0.010" card'], how: 'Add or remove paper punchings under the key at the balance rail. Raises or lowers the key front.' },
  { id: 'jackScrew', name: 'Jack regulating screw', part: 'jackscrew', unit: 'mm', min: -7, max: 2,
    steps: [0.1], stepLabel: ['¼ turn'], how: 'Positions the jack front-to-back under the knuckle. + moves the jack toward the front.' },
  { id: 'repStop', name: 'Repetition lever height screw', part: 'repscrew', unit: 'mm', min: -2, max: 2,
    steps: [0.02, 0.08], stepLabel: ['⅛ turn', '½ turn'], how: 'Sets how high the repetition lever rests relative to the jack top. + raises the lever.' },
  { id: 'capstan', name: 'Capstan screw', part: 'capstan', unit: 'mm', min: 10, max: 16.5,   // from a hammer the key can no longer lift, up to one that blocks on the string
    steps: [0.04, 0.16], stepLabel: ['1/32 turn', '⅛ turn'], how: 'Raises or lowers the wippen, and with it the hammer. + raises the hammer (shorter blow).' },
  { id: 'restRail', name: 'Hammer rest rail', part: 'restrail', unit: 'mm', min: 101, max: 122,   // lower, and the rail is in the wippen
    steps: [0.25], stepLabel: ['shim'], how: 'Raises or lowers the rail the hammer shanks fall back toward.' },
  { id: 'frontPunch', name: 'Front rail punchings', part: 'frontpunch', unit: 'mm', min: 0, max: 8,
    steps: [0.1, 0.25], stepLabel: ['0.004" paper', '0.010" card'], how: 'Thicker punchings stop the key sooner: less dip.' },
  { id: 'letoff', name: 'Let-off button', part: 'letoff', unit: 'mm', min: 93, max: 100,   // lower, and the jack jams on its stop felt so early that its tender would be through the button
    steps: [0.05, 0.2], stepLabel: ['⅛ turn', '½ turn'], how: 'Where the jack tender hits and trips the jack. + raises the button (later let-off, closer to the string).' },
  { id: 'drop', name: 'Drop screw', part: 'drop', unit: 'mm', min: 134, max: 145,
    steps: [0.05, 0.2], stepLabel: ['⅛ turn', '½ turn'], how: 'Stops the repetition lever. + raises the screw (hammer drops less after let-off).' },
  { id: 'repSpring', name: 'Repetition spring tension', part: 'repspring', unit: '', min: 0.3, max: 2.4,
    steps: [0.02], stepLabel: ['bend'], how: 'How hard the repetition lever pushes up on the knuckle.' },
  { id: 'backcheck', name: 'Backcheck wire', part: 'backcheck', unit: 'mm', min: -4, max: 3.1,   // just past where the tail scrapes (G.bcScrapeLean): further in, the checked tail would be above the drawn head
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
// A spec is a target with a tolerance (the sim's own band: the skill level scales it), or a band a source prints, stored
// as its two edges (lo, hi), both of which pass at every level: the level only widens such a band for the Apprentice,
// never cuts into a published range (band(), grade()). src says whose figure it is.
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
  // a generic textbook figure for a middle note, with the sim's own tolerance. The makers: Steinway no less than 1/32 in
  // and no more than 1/16; Kawai 1.0 to 1.5 mm in the middle and treble, 2.0 to 2.5 in the bass (the Learn step says so)
  letoff:     { name: 'Let-off from string', target: IN / 16, tol: IN / 64, unit: 'mm' },
  drop:       { name: 'Drop below let-off', target: IN / 16, tol: IN / 64, unit: 'mm' },
  // more than the 1 mm older books give: a modern grand at textbook dip, blow and let-off has about 2 mm or more
  // (Greg, 2026-11-06). The measured Boston gave 1.7 when this was set; since the jack moved onto the knuckle's rounded
  // corner (jackPos, coreBack) the factory key gives 1.53, Steinway's figure (3/64 to 1/16 in, "a new penny"; Igrec
  // 0.8 to 1.5 mm). The target is Greg's decision and stays; the Learn step says what the action gives and what they print.
  aftertouch: { name: 'Aftertouch (key travel after let-off)', target: 1.7, tol: 0.5, unit: 'mm' },
  // net lift on the knuckle at the check line, in hammer weights: graded by what the rise does (measure().springState),
  // sluggish below G.weakNet and a pop above G.popNet, the same at every level. target is what factory() sets.
  spring:     { name: 'Repetition spring', target: 0.55, lo: G.weakNet, hi: G.popNet, unit: '', src: 'the sim\'s own: a steady rise, no pop' },
  check:      { name: 'Checking distance', target: IN * 9 / 16, lo: IN / 2, hi: IN * 5 / 8, unit: 'mm', src: 'Igrec: 1/2 to 5/8 in; Steinway: 1/2 in' },
  // centered and square to the hammer's check (Steinway's regulation guide); bands are the sim's own
  backcheckAlign: { name: 'Backcheck centered behind the tail, and square', target: 0, tol: 0.5, tolSq: 2, unit: 'mm' },
  // alignment: done first on a real piano, and part of the PTG exam's "assemble, align and regulate"
  hammerTravel: { name: 'Hammer travels straight (sideways drift at the string)', target: 0, tol: 0.3, unit: 'mm' },
  hammerSpacing: { name: 'Hammer centered on its unison', target: 0, tol: 0.4, unit: 'mm' },
  hammerSquare: { name: 'Hammer square to the strings', target: 0, tol: 1, unit: '°' },
  hammerSound: { name: 'Hammer and shank solid and quiet (wiggle and listen)', target: 0, tol: 0, unit: '' },
  // dampers: textbook timing is the head starting to lift with the hammer a third to half of the way up
  // Steinway's guide sets the lift at one third of the hammer's travel and accepts a third to a half
  damperTiming: { name: 'Damper starts lifting (share of hammer travel)', target: 0.45, lo: 1 / 3, hi: 1 / 2, unit: '%', damper: true, src: 'Steinway: between 1/3 and 1/2 of the hammer\'s travel' },
  // play at the damper head with the key held down. Steinway: about 1/16 in in the treble, 3/32 in the bass; Kawai: 1 to 2 mm
  // is permissible; Hamburg: about 1 mm. For this note (52, above the middle): Steinway's 1/16 in, inside Kawai's range.
  damperStop:   { name: 'Damper stop rail clearance, key down', target: IN / 16, lo: 1, hi: 2, unit: 'mm', damper: true, src: 'Kawai: 1 to 2 mm; Steinway: about 1/16 in in the treble' },
  // the pedal's lift against the key's (minus: the pedal lifts less). Kawai: the same height as the keys lift them;
  // Steinway: below the stop rail and slightly below where the sharps lift (the sim has no sharp: read against this
  // natural). So level with the key's lift passes, and a hair under; how far under is the sim's own (0.8 mm).
  pedalLift:    { name: 'Pedal lift against the key\'s lift', target: -0.25, lo: -0.8, hi: 0, unit: 'mm', damper: true, src: 'Kawai: the same as the keys; Steinway: slightly below, and below the stop rail' },
  // on the pedal, every damper should leave the strings together (Steinway: "check for individual fast or slow dampers
  // by operating the damper pedal"; Spurlock winks the pedal to find the early ones). Read as head lift: how far this
  // damper is ahead of (+) or behind the line of underlevers when the tray meets it. The band is the sim's own.
  pedalStart:   { name: 'Damper starts with the others on the pedal', target: 0, tol: 0.5, unit: 'mm', damper: true, noExam: true },
  damperFall:   { name: 'Damper falls freely', target: 0, tol: 0.15, unit: '', damper: true },
  // Igrec: the head vertical and centered to its strings, both ends of its felt seated with equal force; bands are the sim's own
  damperSeat:   { name: 'Damper head centered on its unison, seated flat', target: 0, tol: 0.5, tolLevel: 0.2, unit: 'mm', damper: true },
  underCenter:  { name: 'Damper underlever center: falls freely', center: 'under', unit: 'g', noExam: true, damper: true },
};
export const DAMPER_SPECS = Object.keys(SPEC).filter(k => SPEC[k].damper);
// A spec's pass band [lo, hi] at skill factor k (1.5 Apprentice, 1 Journeyman, 0.75 Exam). A source's band keeps its
// printed edges at k <= 1 and widens about its middle for the Apprentice; the sim's own tolerance scales with k.
export function band(id, k = 1) {
  const s = SPEC[id];
  if (s.lo !== undefined) { const c = (s.lo + s.hi) / 2, h = (s.hi - s.lo) / 2 * Math.max(1, k); return [c - h, c + h]; }
  if (s.target === undefined || s.tol === undefined) return null;
  return [s.target - s.tol * k, s.target + s.tol * k];
}
// Readings are graded as they are printed, to a hundredth (0.01 mm, 1% of hammer travel): two readings that print the
// same can't be one in and one out, and a reading that prints as a band's edge (1/2 in, one third) is in.
const q2 = v => Math.round(v * 100) / 100;
export const inBand = (v, [lo, hi]) => q2(v) >= q2(lo) && q2(v) <= q2(hi);

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
  e.jackSpringT = spring;                                              // mm·g: what the key works against while the button holds the jack tripped
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
  // The next two are the bushing readings' own yardsticks (keyUpShare, measureKey: how much of its return a tight
  // bushing takes, whether the key drops with the stack off), typical figures from Stanwood, set before the key had
  // weight. The key that is played and weighed off (Sim, touch()) uses the measured Boston's instead: a front weight of
  // 26.3 g (KEY_FW, Hirschkorn Table A.1) and whatever upweight its balance gives (17 g as weighed, 21 mid-stroke).
  // Two sets of figures on purpose for now: moving the bushing readings onto the measured ones would change them.
  upweight: 24,                   // what brings the key up with the action on it (Stanwood's example, PTG 2022: down 50, up 24;
                                  // key patents give 19-29 as usual)
  frontWeight: 27,                // the key's front weight with the stack off (Stanwood, PTG 2022: 27 g is medium)
  upSpeed: 60,                    // mm/s: how fast a hand lifts a key (one a tight bushing holds down, a part let go in Move parts)
  slowDrag: 3,                    // more extra friction than this, and the key visibly drops slowly (the sim's own)
};
// drag: friction a tight bushing adds at the key front (g). A key stays down once it passes the upweight, and hangs
// with the stack off once it passes the front weight less the key's own friction. Both figures are the sim's own.
export const BUSHINGS = {
  // the cloth packed down: a dealer's guide calls 1-2 mm at the key front the most a player puts up with
  frontWorn: { name: 'Worn front rail bushing', frontPlay: 1.5, lean: 0.5, clicks: true },
  // swollen cloth gripping the front pin: no play, and the action's weight can't bring the key back up
  // (34 g: it was 26, sized just over the borrowed upweight of 24. A played key is kicked up by the repetition spring
  // and coasts, the hammer landing on it as it goes: against that, 26 g no longer held it down. 34 does, with about
  // 8 g to spare over what this key lifts mid-stroke.)
  frontTight: { name: 'Tight front rail bushing', frontPlay: 0, drag: 34 },
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
// that weight, and the hammer falls at that weight over his inertia for it (GA, 76 rad/s²)
export const HAMMER_WT = 1199;
export const JACK_SPRING = 430;  // the jack spring, about constant: 0.0042 N·m (Hirschkorn §A.4)
const JACK_WT = 52;              // the jack's own weight about its pin, the arm level: 2.65 g, 19.5 mm out
const WIPPEN_WT = 1040;          // the wippen with its jack and lever about the flange pin, level: 600 + 248 + 188 mm·g
const WIPPEN_TURN = 0.0082;      // rad the wippen turns per mm of key travel (factory linkage): mm·g at its pin → g at the key front
// The damper's weights about the underlever pin are the sim's own estimates: no published figure. The whole damper
// (head, wire, underlever) about 1045 mm·g, which is 11 g at the key's end (DMP_KEY, below); the underlever alone 327.
// (Both were 1500 and 470 on the longer underlever drawn before 2026-11-10, and were scaled with its lift arm, 94 mm
// for 135, so the key carries the same damper as before.)
const DAMPER_WT = 1045, UL_WT = 327;
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
// soft: the front punching gives under a finger (Sim), so the key can go past the dip the regulation readings use
export function keyAngle(a, d, soft = false) {
  const { By, th0, thMax } = keyRest(a);
  const y0 = keyFrontTop(By, th0);
  let th = solve(t => keyFrontTop(By, t), y0 - d, th0 - 0.05, th0 + 0.2);
  return { By, th: soft ? th : Math.min(th, thMax), th0, thMax };
}
export function dipOf(a) {
  const { By, th0, thMax } = keyRest(a);
  return keyFrontTop(By, th0) - keyFrontTop(By, thMax);
}
export const keyHeightOf = a => { const { By, th0 } = keyRest(a); return keyFrontTop(By, th0); };

// ---------- full pose for a key position and state ----------
// st: { escaped, checked } carried between calls; g: hammer angle (rad)
export function linkage(a, d, soft = false) {
  wearNow = a.wear || 0;
  const k = keyAngle(a, d, soft);
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
  const c = Math.cos(G.coreLean), s = Math.sin(G.coreLean), x = G.knuckleC[0] + c * G.coreT / 2, y0 = G.knuckleC[1] + s * G.coreT / 2;
  const p = hamPt(g, [x, y0]), q = hamPt(g, [x + s, y0 - c]);
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
    const wasEsc = st.escaped, st0 = { ...st };
    const r = staticHammer(a, L, st, g);
    if (r.blocked) { blockedAt = d; g = r.g; break; }
    // let off before the button tripped the jack: a jack set too far forward lets the knuckle slip off its back
    if (!wasEsc && st.escaped && dEsc === null) {
      slipped = L.psiBtn <= L.psiRest + 1e-9;
      // the jack let go somewhere inside this step: close in on where, so the reading doesn't ride the step's grid
      // (it wobbled 0.03 mm as the capstan turned, which doesn't move let-off)
      let lo = Math.max(0, d - step), hi = d, gLo = g, gHi = r.g;
      for (let i = 0; i < 14; i++) {
        const mid = (lo + hi) / 2, s2 = { ...st0 }, r2 = staticHammer(a, linkage(a, mid), s2, gLo);
        if (s2.escaped || r2.blocked) { hi = mid; gHi = r2.g; } else { lo = mid; gLo = r2.g; }
      }
      dEsc = hi; letoff = G.stringY - crownY(gLo);
      dropLow = G.stringY - crownY(gHi);   // and where it lands at that moment, not a step later
    }
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
  // tripped at rest, does the hammer come down on the repetition lever, or on the rest rail first?
  const gLever = gFromKnuckle(repSupportZ(a, L)), winkOnRail = !onRail && gRail(a) > gLever + 1e-6 && gJ > gRail(a);
  // the lever reaching the drop screw only after let-off (or never): the hammer goes on rising, and "drop" is only the
  // small fall onto the lever, which the screw doesn't move. Key travel from let-off to the screw (Infinity: never)
  // (0.02 mm of key: the two contacts are found on the slow press's 0.01 mm steps)
  const screwLate = sp.dEsc === null || sp.blockedAt !== null ? null : sp.dScrew === null ? Infinity : sp.dScrew > sp.dEsc + 0.02 ? sp.dScrew - sp.dEsc : null;
  return {
    keyHeight: keyHeightOf(a) - NEIGHBOR_H,
    jackPos: jg.backX - coreBack(g, jg.backY),
    jackUnder: jg.backX >= slipBack(L, L.psiRest, gJ) + RESET_CLEAR,   // the sim's own test for a jack back under the knuckle
    jackSlips: sp.slipped,
    wippenSpacing: jackSide(a) - sideZ(a, kc[1] - G.H[1]),
    // trip the jack at rest: the hammer settles onto the repetition lever. That small drop is the wink.
    // Negative means the lever is already holding the hammer off the jack.
    wink: crownY(Math.max(gJ, gRail(a))) - crownY(gL),   // a hammer on the rail (lost motion) doesn't move at all
    winkOnRail,                                           // it lands on the rail: the lever's height can't be read
    jackReturns: knuckleBottom(gJ)[1] - knuckleBottom(gL)[1] < a.wedge && !a.noJackSpring,
    hammerOnJack: Math.abs(g - gJ) < 2e-4,
    blow: G.stringY - crownY(g),
    restGap: hamPt(g, G.shankRest)[1] - a.restRail,
    onRail, lostMotion: play,
    dip: sp.dip,
    letoff: sp.letoff,
    blocked: sp.blockedAt !== null,
    drop: sp.letoff === null ? null : sp.dropLow - sp.letoff,
    screwLate,
    leverSags: springF(a, L, L.hornTop) < 1,   // a spring too weak to hold the hammer's weight at the lever's stop
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
    // (a broken jack spring is the jack's fault, found by tripping the jack: the wink test)
    hammerSound: a.damage && !DAMAGE[a.damage]?.noJackSpring ? 1 : 0, damage: a.damage || null,
    ...measureRatio(a),
    ...measureDampers(a),
    ...measureKey(a),
    ...measureCenters(a),
  };
}

// ---------- action ratio ----------
// How far the hammer's crown rises for each mm the key front goes down, taken as technicians take it (Yuji Nakamura's
// jig: the hammer's rise for 6 mm of key, from rest), and the three levers it is made of, at rest: the key (capstan's
// rise per mm at the front), the wippen (the knuckle's rise per mm at the capstan) and the shank (the crown's rise per
// mm at the knuckle). Computed from the linkage as regulated; a hammer on the rail gives no ratio until it lifts.
export function measureRatio(a) {
  a = eff(a);
  const at = d => { const L = linkage(a, d), g = Math.max(gRail(a), gOnJackAt(L, L.psiRest)); return { cap: L.cap[1], kn: knuckleBottom(g)[1], cr: crownY(g) }; };
  const d6 = Math.min(6, dipOf(a) * 0.75), p0 = at(0), p1 = at(d6), e = at(0.5);
  const dc = e.cap - p0.cap, dk = e.kn - p0.kn;
  return { ratio: (p1.cr - p0.cr) / d6, ratioOver: d6, ratioKey: dc / 0.5, ratioWippen: dc > 1e-6 ? dk / dc : null, ratioShank: dk > 1e-6 ? (e.cr - p0.cr) / dk : null };
}

// ---------- dampers ----------
// head lift the key gives at this key position (mm above the strings)
export const damperKeyLift = (a, L) => Math.max(0, L.keyEndRise - a.damperGap) * G.dmpRatio;
// The pedal's lift tray works on the line of underlevers, not on each damper by itself. An underlever's place on its
// wire (damperGap) sets where the key end meets it and, by the same amount, where the tray does: one set lower on its
// wire is met sooner by both and lifted further, one set higher later and less. Told as lift at the head, the tray's arm
// drops out: the offset is the gap's difference from the line times the wire's ratio, whatever the tray's arm is. The
// line is where a regulated note's underlever sits (FACTORY.damperGap), over a key at its regulated height.
// The tray starts below the line: Steinway's manual sets "approximately 1/8 in lost motion between the underlever tray
// and the line of underlevers". Taken here where the key end lifts the underlever (the drawn tray is a stand-in), and
// not adjustable: the pedal's first travel takes it up and no damper moves.
export const TRAY_FREE = IN / 8 * G.dmpRatio;                                   // mm at the head
export const underleverOff = a => (FACTORY.damperGap - a.damperGap) * G.dmpRatio;   // + set low: met early, lifted further
// the tray's lift of a damper on the line with the pedal p of the way down (below 0: still taking up its free play)
export const trayLift = (a, p) => p * (a.pedalLift + TRAY_FREE) - TRAY_FREE;
export const pedalHeadLift = (a, p) => Math.max(0, trayLift(a, p) + underleverOff(a));
// how far down the pedal is when the tray has a damper on the line up by `lift` (a wink of the pedal: a little over 0)
export const pedalFor = (a, lift) => Math.max(0, Math.min(1, (lift + TRAY_FREE) / (a.pedalLift + TRAY_FREE)));
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
  // (the pedal's lift of this damper: an underlever off the line is lifted that much more or less, as the key lifts it)
  const off = underleverOff(a), pedalH = Math.min(pedalHeadLift(a, 1), a.damperStop);
  return {
    damperTiming: timing,
    damperStop: a.damperStop - keyLiftBottom,
    pedalLift: a.pedalLift + off - keyLiftBottom,
    pedalIntoStop: a.pedalLift + off >= a.damperStop,   // the makers stop the pedal's lift below the rail
    pedalStart: off, trayHolds: pedalHeadLift(a, 0),      // (trayHolds: set so low that the tray at rest keeps the head up)
    damperFall: a.damperDrag,
    damperSeat: a.damperCenter, damperLevel: a.damperLevel,
    fallMs: 1000 * damperFallTime(a, pedalH),
    keyLiftBottom,
  };
}

// pass/fail for one spec given a measurement set; k is the skill level's factor (band(): it scales the sim's own
// tolerances, and only widens a band a source prints)
export function grade(id, m, k = 1) {
  const s = SPEC[id], b = band(id, k);
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
  // a hammer that sits on the rest rail, or comes down on it when the jack is tripped, says nothing about the lever
  if (id === 'wink' && m.onRail) return { ok: false, v, note: 'the hammer sits on the rest rail: lower the rail, then trip the jack' };
  // (a drop to the rail that is already too deep needs no second look: the lever is too low, below)
  if (id === 'wink' && m.winkOnRail && q2(v) <= q2(b[1])) return { ok: false, v, note: 'the hammer came down on the rest rail, not the lever: lower the rail and trip it again' };
  if (id === 'wink' && v < 0) return { ok: false, v, note: 'no wink: the lever holds the hammer off the jack' };
  if (id === 'wink' && DAMAGE[m.damage]?.noJackSpring) return { ok: false, v, note: DAMAGE[m.damage].signs };
  if (id === 'wink' && !m.jackReturns) return { ok: false, v, note: 'jack will not return under the knuckle' };
  if (id === 'restGap' && m.onRail) return { ok: false, v, note: m.lostMotion > 0.05 ? 'hammer sits on the rail: lost motion' : 'hammer sits on the rail' };
  if (id === 'check' && m.scrapes) return { ok: false, v, note: 'tail scrapes the backcheck' };
  if (id === 'check' && m.bcMisses) return { ok: false, v: null, note: 'the backcheck misses the tail: the hammer bounces back' };
  // held against the string at the bottom: by a drop screw set too high (no drop at let-off), or, with the drop itself
  // fine, by too much aftertouch carrying the lever back up as the key goes on down
  if (id === 'drop' && m.dropAtString) return v != null && v >= b[0]
    ? { ok: false, v, note: 'the lever lifts the hammer back up to the string at the bottom: too much aftertouch' }
    : { ok: false, v: null, note: 'no drop: the lever holds the hammer against the string' };
  // the lever not yet on its screw at let-off: no drop to read (the screw's turns show in how late it comes)
  if (id === 'drop' && m.leverSags && v != null && q2(v) > q2(b[1])) return { ok: false, v, note: 'the spring is too weak to carry the hammer: the lever sags under it' };
  if (id === 'drop' && m.screwLate != null && !m.leverSags) return { ok: false, v: null, note: m.screwLate === Infinity
    ? 'none: the hammer goes on rising after let-off, the lever never reaches the drop screw'
    : `none yet: the hammer goes on rising after let-off, the lever meets the drop screw ${m.screwLate.toFixed(2)} mm of key travel later` };
  if (id === 'spring' && m.bcMisses) return { ok: false, v: null, note: 'can\'t be set: the backcheck misses, so the hammer never checks' };
  if (id === 'check' && m.noCheck) return { ok: false, v, note: 'hammer will not stay checked' };
  if (id === 'damperStop' && v <= 0.05) return { ok: false, v, note: 'dampers hit the stop rail before the key bottoms' };
  if (id === 'pedalLift' && m.pedalIntoStop) return { ok: false, v, note: 'the pedal drives the dampers into the stop rail' };
  if (id === 'pedalLift') return { ok: inBand(v, b), v, note: q2(v) > q2(b[1]) ? 'the pedal lifts the dampers higher than the keys do' : q2(v) < q2(b[0]) ? 'the pedal lifts the dampers too little' : '' };
  if (id === 'pedalStart') return m.trayHolds > 0.005 ? { ok: false, v, note: 'the lift tray holds this damper off the strings with the pedal up' }
    : { ok: inBand(v, b), v, note: q2(v) > q2(b[1]) ? 'leaves the strings before the others' : q2(v) < q2(b[0]) ? 'leaves the strings after the others' : '' };
  if (id === 'hammerSquare' && m.damage === 'splitShank') return { ok: false, v, note: 'the head wobbles from blow to blow' };
  if (id === 'hammerSound') return m.hammerSound ? { ok: false, v, note: DAMAGE[m.damage].signs } : { ok: true, v, note: 'solid and quiet' };
  // a wire dragging in its guide bushing or a tight underlever center: the pedal test can't tell which
  if (id === 'damperFall') { const ok = q2(v) <= q2(b[1]); return { ok, v, note: ok ? 'falls freely' : 'drags: falls late' }; }
  if (id === 'keyBushings') {
    const note = v < 0.05 ? 'no side play at the front: the front bushing binds'
      : m.balPlay < 0.05 ? 'no play at the balance pin: the balance bushing binds'
      : m.keyFall === 'hangs' ? 'a tight bushing holds the key up' : m.keyFall === 'slow' ? 'the key drops slowly'
      : q2(v) > q2(b[1]) ? 'a knock each way at the front: the front bushing is worn' : '';
    return { ok: !note && inBand(v, b), v, note };
  }
  // two readings each: sideways in mm, and square (degrees) or seated (mm one end is up)
  if (id === 'backcheckAlign') return { ok: inBand(v, b) && Math.abs(m.backcheckSquare) <= s.tolSq * k, v, note: '' };
  if (id === 'damperSeat') return { ok: inBand(v, b) && Math.abs(m.damperLevel) <= s.tolLevel * k, v, note: '' };
  if (id === 'spring') {
    const notes = { good: 'rises positively, no pop', weak: 'sluggish rise', none: 'hammer does not rise', pop: 'pops: bump felt in the key', jumps: 'jumps out of check' };
    return { ok: m.springState === 'good', v, note: notes[m.springState] };
  }
  return { ok: inBand(v, b), v, note: '' };
}
// Find the fault deals a second fault on top of the first: the specs the first alone puts out that the two together put
// back in (at any of the skill factors ks). A pair that cancels like that would make the customer's complaint untrue.
export function cancelled(first, both, ks = [1]) {
  const m1 = measure(first), m2 = measure(both);
  return Object.keys(SPEC).filter(id => ks.some(k => !grade(id, m1, k).ok && grade(id, m2, k).ok));
}

// ---------- factory regulation (solve every knob to its spec) ----------
const bis = (a, id, f, target, lo, hi) => { a[id] = solve(x => { a[id] = x; return f(); }, target, lo, hi, 30); };
export function factory() {
  const a = { balPunch: 1.5, jackScrew: 0, repStop: 0, capstan: 13.5, restRail: 101, frontPunch: 2.5,
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
    // the stop rail its clearance above the key's lift, and the pedal lifting the dampers a hair less than the key does
    a.damperStop = kl + SPEC.damperStop.target;
    a.pedalLift = kl + SPEC.pedalLift.target;
  }
  return a;
}

// ---------- the key under a finger: weights, inertias, felts ----------
// The key is pushed at its front by a force (a finger, a gram weight) and comes back up under the action's own weight
// and springs. Forces at the key front are in grams (a gram weight's worth), inertias in grams of effective mass
// there, lengths in mm: acceleration = force x GRAV / mass.
export const GRAV = 9810;   // mm/s^2
// Masses (g), moments of inertia about each part's own centre of mass (g·mm²) and centres of mass (mm, from the part's
// pin): Hirschkorn Table A.1, the Boston's parts weighed, hung and swung
// (research/wippen/src/hirschkorn-boston-gp178-note52.json, mass_properties).
const A1 = {
  key: { m: 120.08, Icm: 2.75e6, cm: [51.4, 15.8] },      // its centre of mass is in front of the balance pin: the key is front-heavy
  wippen: { m: 11.96, Icm: 1.69e4, cm: [50.2, -1.8] },
  jack: { m: 2.65, Icm: 778, cm: [0.8, 19.5] },
  rep: { m: 3.71, Icm: 4100, cm: [2.1, -1.2] },
  hammer: { m: 11.74, Icm: 2.9e4, cm: [-102.2, 14.5] },
};
const aboutPin = b => b.Icm + b.m * (b.cm[0] ** 2 + b.cm[1] ** 2);
export const I_HAM = aboutPin(A1.hammer);                 // the hammer about its centre pin, g·mm²
const I_JACK = aboutPin(A1.jack);                         // the jack about its pin
const KEY_ARM = -G.keyFrontLocal;                         // key front to the balance pin, mm
export const KEY_FW = A1.key.m * A1.key.cm[0] / KEY_ARM;  // the key's own front weight, stack off: 26.3 g (Stanwood calls 27 medium)
const M_KEY = aboutPin(A1.key) / KEY_ARM ** 2;            // the key's inertia as a mass at its front: 56 g
// the wippen about its flange pin, carrying the jack and the repetition lever at their pins (their own turning on the
// wippen left out)
const I_WIP = aboutPin(A1.wippen) + A1.jack.Icm + A1.jack.m * (G.jackPivotW[0] ** 2 + G.jackPivotW[1] ** 2)
  + A1.rep.Icm + A1.rep.m * (G.repPivotW[0] ** 2 + G.repPivotW[1] ** 2);
// The felts the key lands on, as Hirschkorn loaded them in a press: force (N) = a x³ + b x² + c x for x m of squash,
// times (1 + D × the squashing speed, m/s) (his Eqs. 2.4, 2.5; Table A.8 contact 2, "Key - Ground at Key Front", and
// contact 3, "Key - Ground at Key Back"; the D's are his forte calibration). r: where the felt sits along the key, as a
// share of the key front's arm (the sim's own rails: front pin 223 mm, back rail 220 mm from the balance pin).
const FELT_FRONT = { a: 4.41e10, b: -1.02e7, c: 15700, D: 1.219, r: (G.balX - G.frontRailX) / KEY_ARM };
const FELT_BACK = { a: 2.42e10, b: -1.11e7, c: 6540, D: 2.502, r: (G.backRailX - G.balX) / KEY_ARM };
const N2G = 1e6 / GRAV;   // newtons to grams of force
const feltG = (f, xmm) => { const x = xmm / 1000; return x <= 0 ? 0 : (f.a * x * x * x + f.b * x * x + f.c * x) * N2G; };
const feltSquash = (f, grams) => grams <= 0 ? 0 : solve(x => feltG(f, x), grams, 0, 3);   // mm
// The damper as the key end feels it: its weight about the underlever pin (DAMPER_WT, the sim's own estimate) taken at
// the lift felt, 94 mm out where the wire is 52 (G.ulFelt, G.ulWire, G.dmpRatio), and the mass that goes with the head's
// own fall (G.dmpGravity, the sim's own too). Stand-ins, like every damper figure here: no published weight.
const DMP_LIFT_ARM = -G.ulFelt[0], DMP_KEY = DAMPER_WT / DMP_LIFT_ARM;                          // 11 g at the key's back end
const DMP_M = DAMPER_WT / (DMP_LIFT_ARM * G.dmpRatio) * GRAV / G.dmpGravity * G.dmpRatio ** 2;   // about 12 g there
// The finger. A blow is a steady push until the key is down, easing then to the weight of a resting hand; the forces
// are the sim's own, picked so the factory key's hammer speeds land where Askenfelt and Jansson measured them (KTH,
// "From touch to string vibrations": a mezzo forte key reaches 0.3-0.5 m/s, forte seldom over 1 m/s and its hammer
// about 5 m/s). Staccato is a jab that lets go before the key is down. No source gives finger forces for this action.
export const BLOWS = {
  pp: { F: 100, name: 'pp', say: 'a soft blow (pp): a 100 g finger' },
  mf: { F: 400, name: 'mf', say: 'a normal blow (mf): a 400 g finger' },
  ff: { F: 1800, name: 'ff', say: 'a hard blow (ff): a 1.8 kg finger' },
  staccato: { F: 1000, ms: 22, name: 'staccato', say: 'a staccato jab: 1 kg for 22 ms, then the finger is gone' },
};
export const HOLD_G = 150;       // a hand resting on a held key, g (the sim's own)
const HOLD_EASE = 0.06;          // s over which a blow's push eases to that
// A key thrown back up off its front punching meets the hand that is still coming down behind the finger: while the
// finger pushes, it resists the key coming back up at it with this much more force for each mm/s (g), up to a limit.
// The sim's own, sized so a held key stays down on its punching as a held key does; Hirschkorn's felt alone (measured
// with no hand on it) throws a bare key back at about 0.6 of its speed.
const FINGER_BACK = 2, FINGER_BACK_MAX = 1500;
// Back at rest the key stops on its back rail cloth. Friction would leave it anywhere within a few hundredths of a
// millimetre of where the regulation readings put it (more with a tight bushing); once it is that near and still, it
// is set there (the sim's own).
const REST_NEAR = 0.1, REST_STILL = 2, REST_T = 0.004;   // mm, mm/s, s
const KEY_HOME = 3;              // g: see keyLoads (a key with lost motion still comes home)
const WEIGH_V = 10;              // mm/s: the fastest a key moves under a steadied gram weight (Sim.weigh; the sim's own)
// The jack top's path under the knuckle, eased (Sim.cam): tabulated every CAM_H mm of key travel from CAM_D0 (above
// rest, for a key bouncing on its back rail) and averaged over CAM_EASE mm either side. CAM_EASE is the sim's own, of
// the size the knuckle's felt gives under a blow (Hirschkorn's loading curve for it, Table A.8 contact 7, is about
// 0.03 mm for each newton at first: a tenth of a millimetre of key travel under a firm blow's few newtons).
const CAM_H = 0.02, CAM_D0 = -1.2, CAM_EASE = 0.1;
const SUB = 0.0001;              // the Sim's own time step, s: every run is cut into these, whatever the screen does

// ---------- time-stepped simulation (for watching it move) ----------
// The hammer's fall about its center pin, rad/s^2: its weight's moment over its inertia there, both Hirschkorn's
// (Table A.1: 11.74 g, 102.2 mm out, 2.9e-5 kg·m² about its centre of mass): 76.3. (It was 60, with no source, until the
// key was given weight: the hammer's load on the jack has to be the same weight the touchweight counts.)
const GA = HAMMER_WT * GRAV / I_HAM;
// The rest rail's felt gives back this share of the shank's landing speed: Scott Murphy's high-speed clips (PTG
// Education Hub, "High Speed Video of the Grand Piano Action": about 0.6 after a quick release from check; "Double
// striking hammer": 0.68). The middle of the two. A landing slower than RAIL_V (rad/s) just settles (the sim's own).
const RAIL_E = 0.64, RAIL_V = 0.05;
// Damping while the knuckle rides the repetition lever up. 23 is fitted to two of the three things Scott Murphy's
// high-speed videos show of an ease-up (PTG Education Hub, "High Speed Video of the Grand Piano Action", a Steinway
// action model): the float over the drop screw (1.3 mm here, 1.2 filmed) and the dip below where the hammer then sits
// (0.47, 0.45 filmed). The third it does not fit: the rise out of check is 0.18 m/s at the crown here against about
// 0.12 filmed, half as fast again (on his grand the soft blows of "Hammer Bobbling" rise back at 0.18-0.28 m/s).
// Re-fitted when the hammer's fall went from 60 to 76 rad/s² (GA): it was 20 (rise 0.16), which with the heavier
// hammer floated 1.6 mm and dipped 1.0.
const DAMP = 23;
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
// the crown) above its face, the give of the Strike and hold test's blow (a normal blow, BLOWS.mf: 2.3 m/s at the string)
// at factory, so that blow is held at the face once the hand has eased to its resting weight, and the check reading, the
// factory and the miss and scrape leans stay where they were. A softer blow is held short of the face, a harder one past
// it; the drawn backcheck doesn't give. (It was 2.2 for the old test blow of 1.4 m/s.)
const CHECK_TAU = 0.0037;
const CHECK_GIVE = 4.27;
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
// The fastest the jack can drive the hammer when a hand moves the key at a set speed (Sim.press), rad/s: 5.6 m/s at the
// crown. Nothing else stops a faster key throwing the hammer faster there; this stands in for the limit of a real blow.
// Askenfelt and Jansson (KTH, "From touch to string vibrations"): a forte key seldom moves faster than about 1 m/s,
// the hammer then reaching about 5 m/s. A blow played by force (Sim.push, blow) needs no cap: the hammer's inertia is it.
const JACK_DRIVE_W_MAX = 40;
// A jack spring working the jack's rounded top back under a knuckle that sits a hair below where the jack would hold
// it (up to G.wedge) doesn't snap the hammer up. At the reset the hammer stays where it is and keeps its speed, and
// the jack takes up the gap over this long (s), along a smoothstep whose sharpest slowing (57 rad/s^2 at the full
// wedge) stays under the hammer's own fall, so it never throws it. While the backcheck holds the tail it can't lift
// it at all. Scott Murphy's high-speed videos (PTG Education Hub, "High Speed Video of the Grand Piano Action") show
// no lift at the reset on a quick release, and a hammer falling straight on past it; the time itself isn't measured.
// Before this the reset lifted the crown 3.2 mm in one step, stopped a falling hammer in mid-air, and could fire a
// checked hammer at the string when the check let go.
const WEDGE_T = 0.05;
// A hand holding a part (Move parts in the app) eases it to where the pointer puts it, critically damped at this rate
// (rad/s: about 60 ms behind a steady drag), rather than jumping there: a pointer's jerky steps would otherwise snap the
// jack up under the knuckle and throw the hammer off it.
const HAND_W = 35;

export class Sim {
  constructor(a) { this.h = SUB; this.setAdj(a); this.reset(); }   // h: the time step (a test halves it to show the answer doesn't hang on it)
  setAdj(a) { this.a = eff(a); this.dip = dipOf(this.a); this.gR = gRail(this.a); this.camT = null; }
  // The hammer angle the jack top holds the knuckle at, against key travel, while the button alone has the jack: the
  // parts' own path, with its corners eased over CAM_EASE mm of key travel either way. The rigid profiles meet at
  // corners (the knuckle passing from the jack top's rounded corner to its face, the tender meeting the button) where
  // the hammer's speed for a given key speed steps by 4 to 10%; a felt-and-buckskin knuckle can't pass a step on, it
  // gives. Eased, the hammer's place moves by under 0.02 mm at the crown and its speed has no step. Worked out once
  // for a regulation, the first time a finger plays it.
  cam(d) {
    let T = this.camT;
    if (!T) {
      const n = Math.ceil((this.dip + 2.8) / CAM_H) + 1, raw = new Float64Array(n), g = new Float64Array(n), k = Math.round(CAM_EASE / CAM_H);
      for (let i = 0; i < n; i++) { const L = linkage(this.a, CAM_D0 + i * CAM_H, true); raw[i] = gOnJackAt(L, L.psiBtn); }
      for (let i = 0; i < n; i++) {
        let s = 0, wt = 0;
        for (let j = -k; j <= k; j++) { const w = k + 1 - Math.abs(j), q = Math.max(0, Math.min(n - 1, i + j)); s += w * (raw[q] + (i + j - q) * (q ? raw[q] - raw[q - 1] : raw[1] - raw[0])); wt += w; }
        g[i] = s / wt;
      }
      // (set so that at rest it is exactly where the parts put the hammer: a millionth of a radian, but the hammer
      // must not start a hair off its jack)
      T = this.camT = { g, n, off: 0 };
      const L0 = linkage(this.a, 0, true);
      T.off = gOnJackAt(L0, L0.psiBtn) - this.cam(0);
    }
    const x = Math.max(1, Math.min(T.n - 2.001, (d - CAM_D0) / CAM_H)), i = Math.floor(x), t = x - i, g = T.g;
    const m0 = (g[i + 1] - g[i - 1]) / 2, m1 = (g[i + 2] - g[i]) / 2, t2 = t * t, t3 = t2 * t;   // (a smooth curve through the eased points)
    return T.off + (2 * t3 - 3 * t2 + 1) * g[i] + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * g[i + 1] + (t3 - t2) * m1;
  }
  reset() {
    this.d = 0; this.dTarget = 0; this.keySpeed = 40;
    // the key's speed (mm/s), the finger's force on it (g; null while a hand moves it at a set speed), a blow in
    // progress, and the work the finger has done (g·mm)
    this.v = 0; this.force = null; this.finger = null; this.lid = null; this.vCap = null; this.work = 0; this.acc = 0; this.stillT = 0; this.jamD = null;
    this.st = { escaped: false, checked: false, aboveCheck: false, dChecked: 0 };
    const L = linkage(this.a, 0, true);
    let g = gOnJack(L); for (let i = 0; i < 4; i++) g = staticHammer(this.a, L, this.st, g).g;
    this.g = g; this.w = 0; this.psi = L.psiRest; this.L = L; this.dL = 0; this.events = [];
    // how the hammer is carried: on the jack (and how fast the jack lifts it, rad per mm of key: gam), the load on the
    // jack's top in hammer weights, and the damper riding on the key's back end
    this.D = null; this.onJack = Math.abs(g - gOnJack(L)) < 2e-4; this.gam = null; this.jgPrev = null; this.jgD = 0;
    this.psiNow = this.psi; this.psiW = 0;   // where the jack really is on its way back under, and how fast it is turning
    this.jackLoad = this.onJack ? 1 : 0; this.dmpOnKey = false;
    if (this.onJack) this.gam = this.jackRate(L, L.psiRest, g);
    // the back rail cloth is already squashed by what rests on the key: x0 mm, so that at rest the forces balance where
    // the regulation readings put the key
    this.x0 = 0; this.onRep = knuckleBottom(g)[1] <= L.hornTop + 1e-6;
    this.blocked = false; this.scraped = false; this.jammed = false; this.bounceD = null; this.floatD = null; this.struckD = null; this.onBtn = false; this.onScrew = false;
    this.onRep = false;
    this.wedge0 = 0; this.wedgeT = 0;   // the gap a jack that has just reset still has to take up (rad), and for how long it has
    // a key held down by a tight bushing, and the hand lifting it; the key tests' rocking, twisting and stack-off
    // drop are drawn from keyRock (mm sideways at the front, + bass), keyTwist (rad) and keyShown (key travel)
    this.stuck = false; this.lifting = false; this.keyRock = null; this.keyTwist = null; this.keyShown = null; this.stackOff = false;
    // the center tests' side play, drawn from jackRock (mm at the jack's top), wippenRock (mm at the jack, the wippen moving
    // on its flange) and hammerRock (mm at the crown), + bass; ulShown lifts the underlever alone (mm at its lift felt)
    this.jackRock = this.wippenRock = this.hammerRock = this.ulShown = null;
    this.hand = null;
    this.t = 0; this.pedal = this.pedal ?? 0; this.pedalTarget = this.pedalTarget ?? 0;
    this.yd = Math.min(pedalHeadLift(this.a, this.pedal), this.a.damperStop); this.vd = 0;
    this.up = this.yd > 0.05; this.hitStop = false; this.liftedAt = this.up ? 0 : null;
    this.x0 = feltSquash(FELT_BACK, Math.max(0, -(this.keyLoads().F - (this.onJack ? HAMMER_WT * this.gam : 0))) / FELT_BACK.r);
  }
  // how fast the jack lifts the hammer here, rad per mm of key travel (found by moving the key a hundredth of a mm on)
  jackRate(L, psi, jackG) {
    const L2 = linkage(this.a, this.d + 0.01, true);
    return (gOnJackAt(L2, psi + (L2.psiBtn - L.psiBtn)) - jackG) / 0.01;
  }
  // how the linkage moves per mm of key travel at the key's present place: the wippen's turn (rad), the horn's rise
  // free and as stopped (mm), the jack's turn on the button (rad), the key end's rise (mm) and the backcheck's (mm)
  // Taken from the step the key has just made (L0 at d0, a moment ago), or, when it has barely moved, by moving it a
  // hundredth of a millimetre on.
  // (this.dL: the key travel this.L was worked out at, a hair off this.d after the jack has shared out a step's speed)
  derivs(L0 = null, d0 = 0) {
    if (this.D && this.D.d === this.d) return this.D;
    const L = this.L, at = this.dL ?? this.d;
    let L2 = L0, k = L0 ? 1 / (d0 - at) : 0;
    if (!L0 || Math.abs(d0 - at) < 1e-5) { L2 = linkage(this.a, at + 0.01, true); k = 100; }
    return this.D = { d: this.d, rise: (L.phi - L2.phi) * k, horn: (L2.hornFree - L.hornFree) * k, top: (L2.hornTop - L.hornTop) * k,
      psi: Math.max(0, (L2.psiBtn - L.psiBtn) * k), end: (L2.keyEndRise - L.keyEndRise) * k, bc: (L2.bcCatchY - L.bcCatchY) * k };
  }
  // What bears on the key where it is, apart from its own friction: F (g at the key front, + pushing it down), the
  // friction that resists its moving either way (fr, g) and its inertia there (m, g), with the wippen and whatever
  // else moves with it. The hammer on the jack is not in here: step() couples it through the jack.
  //   weights: the key's own front weight (A1) helps; the wippen with its jack and lever (WIPPEN_WT) resists
  //   repetition spring: whenever the drop screw or the knuckle holds the lever down off its stop, the wippen works
  //     against it (springF, Hirschkorn's spring law); a hammer resting on the lever weighs on the key through it
  //   jack spring: while the let-off button holds the jack tripped (JACK_SPRING, Hirschkorn §A.4), and the knuckle's
  //     drag on the jack top as it is pulled out from under it (G.jackMu, his Table A.8 contact 7)
  //   friction: the key's (KEY.friction) and each center's (CENTERS, his Table A.9), a tight bushing's drag
  //   the damper once the key's end has picked it up; a hammer held by the backcheck (it rides on the key)
  //   the front punching and the back rail cloth (FELT_FRONT, FELT_BACK)
  keyLoads(D = this.derivs()) {
    const a = this.a, L = this.L, st = this.st;
    let F = (this.force || 0) + KEY_FW - WIPPEN_WT * D.rise;
    if (this.force > 0 && this.v < 0 && !this.vCap) F += Math.min(FINGER_BACK * -this.v, FINGER_BACK_MAX);   // the hand behind the finger (a gram weight has none)
    let m = M_KEY + I_WIP * D.rise * D.rise;
    let fr = KEY.friction + (BUSHINGS[a.bushing]?.drag || 0) + a.centerT.wippen * Math.abs(D.rise);
    // (a hammer the lever is carrying up sits within a micron or two of its top from step to step, now a hair over,
    // now a hair under: it is on the lever all the same, and its weight on the key)
    const kz = knuckleBottom(this.g)[1], onRep = kz <= L.hornTop + 0.002, pressing = onRep && kz < L.hornTop - 0.002;
    const z = onRep ? Math.min(kz, L.hornTop) : L.hornTop;
    const arm = hamPt(this.g, G.knuckleC)[0] - G.H[0], hornG = HAMMER_WT / arm;   // the hammer's weight at its knuckle, g
    const sF = springF(a, L, z), held = st.checked || st.catching;
    if (held) {
      // the backcheck is on the key: the hammer it holds rides up and down with it, the spring pushing under its knuckle
      const gbc = D.bc / (hamPt(this.g, G.tail)[0] - G.H[0]);
      F += HAMMER_WT * ((onRep ? sF : 0) - 1) * gbc; m += I_HAM * gbc * gbc;
      if (onRep) F -= hornG * sF * D.horn;
    } else {
      // resting on the lever where its stop or the drop screw has it: its weight, and its center's friction, come through
      if (onRep && !pressing && !this.onJack) { F -= hornG * D.top; fr += a.centerT.hammer * Math.abs(D.top / arm); }
      if (z < L.hornFree - 1e-9) {
        // how fast the spring is being wound per mm of key: the horn's free rise against where it is held, by the drop
        // screw or its stop, or by the knuckle (which the jack may be lifting too: then the lever's push on the hammer
        // is counted here, as the little the spring winds, and not again in the hammer's own motion)
        const rate = D.horn - (pressing ? (this.onJack && !st.escaped ? arm * (this.gam || 0) : 0) : D.top);
        F -= hornG * sF * rate; fr += a.centerT.rep * Math.abs(rate) / -G.horn[0];
      }
    }
    if (L.psiBtn > L.psiRest + 1e-9 && this.psi <= L.psiBtn + 1e-9) {
      F -= a.jackSpringT * D.psi; fr += a.centerT.jack * D.psi;
      if (!st.escaped && this.onJack) fr += G.jackMu * hornG * Math.max(0, this.jackLoad) * Math.hypot(...G.jackTop) * D.psi;
    }
    if (this.onJack && !st.escaped) fr += a.centerT.hammer * Math.abs(this.gam || 0);
    if (this.dmpOnKey) { F -= DMP_KEY * (1 + a.damperDrag) * D.end; m += DMP_M * D.end * D.end; }
    // A hammer that has come down on the rest rail (lost motion) is off the key, and this key alone is front-heavy
    // (KEY_FW 26 g against the wippen's 8.5: by Stanwood's balance it would hang with its front down until the jack
    // met the knuckle again). The regulation readings have a key with lost motion sitting up on its back rail with
    // free play at the top, so here a key let go still comes home: KEY_HOME g of return beyond its friction (the sim's
    // own stand-in, flagged for a bench check).
    if (!this.force && !this.onJack && !held && this.g <= this.gR + 1e-9) F = Math.min(F, -(fr + KEY_HOME));
    if (this.d > this.dip) {
      const r = FELT_FRONT.r; F -= feltG(FELT_FRONT, (this.d - this.dip) * r) * Math.max(0, 1 + FELT_FRONT.D * this.v * r / 1000) * r;
    }
    const xb = this.x0 - this.d * FELT_BACK.r;
    if (xb > 0) F += feltG(FELT_BACK, xb) * Math.max(0, 1 - FELT_BACK.D * this.v * FELT_BACK.r / 1000) * FELT_BACK.r;
    return { F, fr, m };
  }
  // the pedal all the way down, or (to, over) part of the way and slowly: a wink of the pedal, to see which dampers start first
  setPedal(down, { to = 1, over = 0.1 } = {}) { this.pedalTarget = down ? to : 0; this.pedalOver = over; }
  // damper head: pushed up by the key's underlever or the pedal's lift tray, capped by the stop rail,
  // and otherwise falling under its weight, slowed by any drag in its guide bushing
  stepDamper(dt) {
    const a = this.a;
    this.t += dt;
    // the foot presses the pedal over about a tenth of a second; let go, the tray drops away faster than the dampers fall
    const rate = this.pedalTarget > this.pedal ? dt / (this.pedalOver ?? 0.1) : dt / 0.02;
    this.pedal += Math.sign(this.pedalTarget - this.pedal) * Math.min(Math.abs(this.pedalTarget - this.pedal), rate);
    const keyLift = damperKeyLift(a, this.L);
    const push = Math.max(keyLift, pedalHeadLift(a, this.pedal), this.hand?.hold === 'damper' ? Math.min(this.hand.at, a.damperStop) : 0);
    // the key's end has the damper when it is what holds the head up (not the pedal's tray, not a head thrown clear by a
    // hard blow); picking it up on the way down, the key gives it some of its speed
    const onKey = keyLift > 0 && keyLift >= push - 1e-9 && keyLift >= this.yd - 1e-6;
    if (onKey && !this.dmpOnKey && this.v > 0 && this.force !== null) {
      const riding = this.onJack && !this.st.escaped, m = this.keyLoads().m + (riding ? I_HAM * (this.gam || 0) ** 2 : 0);
      this.v *= m / (m + DMP_M);
      if (riding) this.w *= m / (m + DMP_M);   // (the hammer on the jack slows with the key)
    }
    this.dmpOnKey = onKey;
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
  emit(type, data = {}) { this.events.push({ type, t: this.t, d: this.d, g: this.g, ...data }); }
  // A hand moving the key to a place at a set speed, whatever resists it: the slow presses of the regulation tests
  // (to the bottom at 6 or 12 mm/s, a little way down at 2), easing a held key up a little, a part dragged in Move
  // parts, a stuck key lifted. Those are motions a hand makes on purpose and slowly. Everything played is a finger's
  // force (push, blow), and a key let go (press(0, ...) or release) comes up on its own.
  press(target, speed) {
    if (target <= 0) return this.release(speed);
    this.lifting = false; this.finger = null; this.force = null; this.lid = null; this.vCap = null;
    this.dTarget = Math.max(0, Math.min(target, this.dip + 1)); this.keySpeed = speed;
  }
  // The finger pushing down on the key front with a force, in grams (a gram weight set on the key is the same thing)
  push(grams) {
    this.finger = null; this.lifting = false; this.lid = null; this.vCap = null;
    this.force = Math.max(0, grams); this.dTarget = grams > 0 ? this.dip : 0; this.keySpeed = 999;
  }
  // A gram weight set on the key front as a technician weighs a key off: steadied, so the key moves slowly or not at
  // all and never gathers the speed to carry it through let-off (left to itself a weight a few grams over the
  // downweight picks up speed down the stroke, where the action asks for less and less, and fires the action; from
  // there, the jack tripped and the hammer on the lever, the key no longer lifts its upweight). The key goes no faster
  // than WEIGH_V either way, and where it stops is where the forces on it balance: what touch() reads.
  weigh(grams) { this.push(grams); this.vCap = WEIGH_V; }
  // a blow from BLOWS: pushed until the key is down, then eased to a resting hand's weight (or, staccato, let go)
  blow(kind = 'mf') {
    const b = typeof kind === 'string' ? BLOWS[kind] : kind;
    this.push(b.F);
    this.finger = { F: b.F, hold: Math.min(b.F, b.hold ?? HOLD_G), ms: b.ms ?? null, t: 0, downAt: null };
  }
  // The finger gone: the key comes up under the action's weight and springs, against its friction. A key a tight
  // bushing holds down stays down (and says so); let go again, a hand lifts it at liftSpeed.
  // The finger coming up at a set speed (mm/s) as far as `to` mm of key travel and waiting there: the key follows as
  // fast as the action brings it up, and no faster than the finger lets it (a repeated note's part release)
  ease(to, speed) {
    this.finger = null; this.lifting = false; this.force = 0; this.keySpeed = 999;
    this.dTarget = Math.max(0, to); this.lid = { d: Math.max(this.d, this.dTarget), to: this.dTarget, v: speed }; this.vCap = null;
  }
  release(liftSpeed = KEY.upSpeed) {
    this.finger = null; this.dTarget = 0; this.lid = null; this.vCap = null;
    if (this.stuck && this.force === 0) { this.lifting = true; this.keySpeed = liftSpeed; return; }
    this.force = 0; this.keySpeed = liftSpeed;
  }
  // A hand on one part (the app's Move parts), holding it at q and moved by setting hand.q: 'key' (q: key travel, mm; the
  // app's wippen is held this way too, the key following a lifted wippen since it is heavier at the front), 'jack' (its
  // angle on the wippen: the hand trips it as the let-off button does), 'rep' (the repetition lever's horn height, mm: a
  // finger can only press it down from its stop), 'hammer' (its angle: lifted off whatever holds it up) or 'damper'
  // (its lift, mm). Everything else goes on as the model has it.
  grab(hold, q) { this.hand = { hold, q, at: q, v: 0 }; }
  letGo() {
    const h = this.hand; this.hand = null;
    if (h?.hold !== 'hammer') return;
    // a hammer set down on the backcheck stays there, as one caught by it does
    const L = this.L, st = this.st, gC = gFromTail(L.bcCatchY), gTake = gC + CHECK_GIVE / STRIKE_R;
    if (L.depth >= G.bcInPath && this.a.backcheck >= -G.bcMissLean && st.aboveCheck && this.g <= gTake && this.g >= gC - 0.02) {
      st.checked = true; st.catching = false; st.give = gTake - this.g; st.dChecked = this.d; this.w = 0;
    }
  }
  // Move the action on by dt seconds. It is always worked in the Sim's own steps of SUB, the time left over carried
  // to the next call, so a run comes out the same however the caller cuts it up (screen frames, playback speed).
  step(dt) {
    this.acc += dt;
    for (let n = Math.floor(this.acc / this.h + 1e-9); n > 0; n--) { this.acc -= this.h; this.sub(this.h); }
    if (this.acc < 0) this.acc = 0;
  }
  sub(dt) {
    const a = this.a, st = this.st;
    const dPrev = this.d;
    const h = this.hand;
    if (h) { h.v += (HAND_W * HAND_W * (h.q - h.at) - 2 * HAND_W * h.v) * dt; h.at += h.v * dt; }
    // a blow in progress: the push, then the resting hand (or the finger gone)
    const fin = this.finger;
    if (fin) {
      fin.t += dt;
      if (fin.ms !== null) { if (fin.t >= fin.ms / 1000) this.release(); }
      else {
        if (fin.downAt === null && (this.d >= this.dip || this.blocked || this.jamD !== null)) fin.downAt = fin.t;
        if (fin.downAt !== null) this.force = fin.hold + (fin.F - fin.hold) * Math.max(0, 1 - (fin.t - fin.downAt) / HOLD_EASE);
      }
    }
    const handKey = h?.hold === 'key';
    const forced = this.force !== null && !this.lifting && !handKey;
    // forced: the key moves as the forces on it and its inertia have it. K: those forces; vF: the speed the key alone
    // would have after this step; vUsed: the speed it is moved at (with the hammer's load, if the jack has it)
    let K = null, vF = 0, vUsed = 0;
    const shrink = (v, dv) => Math.abs(v) <= dv ? 0 : v - Math.sign(v) * dv;
    const cap = v => this.vCap ? Math.max(-this.vCap, Math.min(this.vCap, v)) : v;   // (a weight being steadied: weigh())
    if (forced) {
      K = this.keyLoads();
      vF = this.v + K.F * GRAV / K.m * dt;
      let M = K.m; vUsed = vF;
      if (this.onJack && !st.escaped && this.gam !== null) {
        // (with the hammer's own fall this step; the lever's push on its knuckle, if any, is already in K: keyLoads)
        M = K.m + I_HAM * this.gam * this.gam;
        vUsed = (K.m * vF + I_HAM * this.gam * (this.w - GA * dt)) / M;
      }
      vUsed = cap(shrink(vUsed, K.fr * GRAV / M * dt));
      if (this.jamD !== null && vUsed > 0) vUsed = 0;   // a jack jammed on its stop felt stops the key
      this.d = Math.max(CAM_D0 + 0.1, Math.min(this.d + vUsed * dt, this.dip + 1.5));
      // a finger easing the key up: it can't come up past the finger
      const lid = this.lid;
      if (lid) { lid.d = Math.max(lid.to, lid.d - lid.v * dt); if (this.d < lid.d) { this.d = lid.d; lid.on = true; } else lid.on = false; }
      this.work += this.force * (this.d - dPrev);
    } else {
      if (handKey) { this.dTarget = Math.max(0, Math.min(h.at, this.dip)); this.keySpeed = Math.abs(h.v) + 1e-9; this.force = null; this.finger = null; }
      const dir = Math.sign(this.dTarget - this.d);
      // (a key taken hold of while it is bouncing above its rest on the back rail cloth, after a release, is brought
      // from where it is, not set down at rest in one step: a hand's own grab at up to 300 mm/s)
      const below = dPrev < 0;
      this.d += dir * Math.min(Math.abs(this.dTarget - this.d), (handKey && !below ? Infinity : (below ? Math.max(this.keySpeed, 300) : this.keySpeed) * dt));
      this.d = Math.max(Math.min(0, dPrev), Math.min(this.d, this.jamD ?? Infinity, this.dip));
      this.v = (this.d - dPrev) / dt;
    }
    if (this.jamD !== null && this.d < this.jamD - 0.05) this.jamD = null;
    if (this.d === 0) this.stuck = this.lifting = false;
    // a worn bushing lets the key knock on its pins as a blow bottoms it
    if (BUSHINGS[a.bushing]?.clicks && dPrev < this.dip && this.d >= this.dip && (forced ? vUsed : this.keySpeed) >= 100) this.emit('keyclick');
    let L = linkage(a, this.d, true), dAt = this.d;
    // the jack's tender reaching the let-off button, and the repetition lever the drop screw: in a well-regulated
    // action the two meet together
    const onBtn = L.psiBtn > L.psiRest + 1e-9, onScrew = L.rhoDrop < L.rhoStop;
    if (onBtn && !this.onBtn) this.emit('tender');
    if (onScrew && !this.onScrew) this.emit('dropscrew');
    this.onBtn = onBtn; this.onScrew = onScrew;
    // a hand trips the jack as the button would, or holds the repetition lever down from its stop
    const handTrip = h?.hold === 'jack' && h.at > L.psiBtn;
    if (handTrip) L.psiBtn = h.at;
    if (h?.hold === 'rep') L.hornTop = Math.min(L.hornTop, h.at);
    const wasEsc = st.escaped;
    this.psi = updateJack(a, L, st, this.g);
    // The jack swings back toward the knuckle no faster than its spring can turn it against its center's friction
    // (JACK_SPRING, CENTERS.jack and the jack's inertia about its pin, all Hirschkorn's: about 9 ms for a healthy
    // jack to come home from a full trip, half as long again for the tight one). Until it is there it isn't under.
    const pull = a.jackSpringT - a.centerT.jack;
    if (this.psi < this.psiNow - 1e-9 && pull > 0 && !handTrip && h?.hold !== 'jack') {
      this.psiW += pull * GRAV / I_JACK * dt;
      this.psiNow = Math.max(this.psi, this.psiNow - this.psiW * dt);
      if (this.psiNow > this.psi + 1e-9) { if (wasEsc) st.escaped = true; this.psi = this.psiNow; } else this.psiW = 0;
    } else { this.psiNow = this.psi; this.psiW = 0; }
    if (!wasEsc && st.escaped) this.emit('letoff', { dist: G.stringY - crownY(this.g), hand: handTrip });
    // the jack back under the knuckle drives the next strike: a new blow, not a bobble off the lever
    if (wasEsc && !st.escaped) { this.emit('reset'); this.struckD = this.floatD = null; }
    // (a hand pushing it there isn't a regulation fault, nor is a hard blow squashing the punching until the jack meets its felt)
    if (st.jammed && !this.jammed && !handTrip && this.d <= this.dip + 0.02) this.emit('jackjam');
    // a jack on its stop felt can turn no further, so the button can push its tender no further: the key stops there
    // (until it has come back up a little)
    if (st.jammed && !handTrip && this.jamD === null && this.d > dPrev) { this.jamD = this.d; if (forced) vF = Math.min(vF, 0); this.dTarget = Math.min(this.dTarget, this.d); }
    this.jammed = st.jammed || this.jamD !== null;
    // where the jack would have the hammer: under a finger's force, with the jack where the button has it, read off the
    // jack top's path with its corners eased (cam()); otherwise from the parts as they stand
    const onCam = forced && !st.escaped && !handTrip && h?.hold !== 'jack' && Math.abs(this.psi - L.psiBtn) < 1e-9;
    let jackG = st.escaped ? -Infinity : onCam ? this.cam(this.d) : gOnJackAt(L, this.psi);
    let carried = false;   // the jack carried the hammer through this step (under a finger's force)
    // how fast the jack is lifting the hammer per mm of key, from the step just made; found afresh when the jack has
    // just come back under
    if (st.escaped) { this.gam = null; this.jgPrev = null; }
    else {
      if (this.jgCam !== onCam) this.jgPrev = null;
      if (this.jgPrev !== null && Math.abs(this.d - this.jgD) > 1e-7) this.gam = (jackG - this.jgPrev) / (this.d - this.jgD);
      else if (this.gam === null || this.jgPrev === null) this.gam = this.jackRate(L, this.psi, onCam ? gOnJackAt(L, this.psi) : jackG);
      this.jgPrev = jackG; this.jgD = this.d; this.jgCam = onCam;
    }
    const gHorn = gFromKnuckle(L.hornTop);
    const kz = knuckleBottom(this.g)[1];
    const onRep = kz <= L.hornTop + 1e-6;
    // Off the lever, the hammer's center pin drags on its swing either way: Coulomb friction, all of it (a.hammerFr, from
    // CENTERS; it never holds a hammer up against its weight). On the lever, DAMP, REP_CENTER and LAND_LOSS were fitted on
    // the healthy action with the hammer's own friction folded in, so there only a center tighter than healthy adds its
    // extra (a.hammerFrX, a.centerFrX), and the lever's brake goes with its center's torque (a.repFr).
    let acc = -GA;
    // (a hammer the jack is carrying under a finger's force: its center's friction is counted with the key's, keyLoads)
    if (!onRep && !(forced && this.onJack)) acc -= Math.sign(this.w) * GA * a.hammerFr;
    // the lever damps the hammer's rise; a falling hammer compresses the spring against the lever's friction
    const sF = onRep ? springF(a, L, kz) : 0;
    // (while the jack is carrying the hammer under a finger's force, the lever's push on the knuckle is part of the
    // key's load, keyLoads, and its damping, fitted on the lever lifting the hammer by itself, has no part)
    // The lever's brakes below (its center's and the knuckle's sliding friction, the landing loss) are likewise for a
    // hammer the lever alone has: with the knuckle on the jack too, knuckle and lever go up and down together with the
    // wippen and hardly move against each other. (Left on, they took 7 g off what the key lifts on the way up.)
    const lever = onRep && !(forced && this.onJack);
    if (lever) acc += GA * sF - (this.w > 0 ? DAMP * this.w : 0);
    let w = this.w + acc * dt;
    // rising on the lever (or about to), a tight center's extra friction slows it, or holds it if the lift can't beat it
    if (lever && this.w >= 0 && w > 0) w = Math.max(0, w - GA * a.centerFrX * dt);
    // landing on the lever from free flight takes LAND_LOSS out of the fall
    if (lever && !this.onRep && w < 0) w = -Math.sqrt(Math.max(0, w * w - 2 * GA * LAND_LOSS / STRIKE_R));
    this.onRep = onRep;
    // the lever's friction slows a hammer coming down, or holds one still when the spring and its weight nearly balance,
    // but never throws it back up
    if (lever && this.w <= 0 && w < 0) w = Math.min(0, w + GA * (a.repFr + REP_SLIDE * sF + a.hammerFrX) * dt);
    let g = this.g + w * dt;
    // a hand holding the hammer puts it where it is held; what holds it up from below (the jack, the lever, the rail) still does
    const held = h?.hold === 'hammer';
    if (held) { g = Math.min(h.at, gString()); w = (g - this.g) / dt; }
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
    if (onRep && g > gHorn && !jackDriving && !held) {
      // The lever stops at the drop screw and the hammer carries on up with its own speed, then falls back onto it (a
      // float: Scott Murphy's clips show 1.2-2.4 mm over the drop screw after a rise out of check); a crawl stays on the
      // lever. A pop is the spring kicking it up fast as the key comes up or holds; on the way down the blow just leaves it.
      // (a key held by hand is going down when the hand is)
      if (w > POP_W) { if (!this.popped && this.dTarget <= this.d && !(h?.hold === 'key' && h.v > 0)) this.emit('pop'); this.popped = true; }
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
      if (vk > BOUNCE_V && this.d >= this.dip - 0.02 && !held) {
        w = Math.sqrt(Math.max(0, (Math.max(0, 1 - 2 / 3 * G.jackD * vk) * this.w) ** 2 - 2 * GA * Math.max(0, jackG - g)));
        this.bounceD = this.d;   // a strike before the key comes back up is a bobble
      }
      // otherwise the jack has it. Moved by a hand at a set speed, the jack simply drives it (one slipping back under
      // lifts it gently: WEDGE_T). Under a finger's force the key and the hammer share their momentum through the
      // jack: the hammer takes the speed that keeps its knuckle on the jack top, and the key gives up (or gains) what
      // that takes, each by its inertia. Nothing here can hand the hammer a step in speed for free: where the jack
      // top's path has a corner (the tender meeting the button), the key slows instead, which is the bump of let-off.
      else if (!forced) w = Math.max(w, Math.min(JACK_DRIVE_W_MAX, (jackG - this.g) / dt));
      else {
        const c = (jackG - this.g) / dt, gp = this.gam, I = I_HAM, M = K.m + I * gp * gp;
        let vNew = cap(shrink((K.m * vF + I * gp * (w - c) + I * gp * gp * vUsed) / M, K.fr * GRAV / M * dt));
        if (this.jamD !== null && vNew > 0) vNew = 0;
        const wNew = c + gp * (vNew - vUsed);
        // the load on the jack's top, in hammer weights (smoothed over a millisecond): the knuckle's drag on a tripping jack
        this.jackLoad += (I * (wNew - w) / (dt * GRAV * HAMMER_WT) - this.jackLoad) * Math.min(1, dt / 0.001);
        // the key ends the step where its speed after the sharing puts it, the jack top (and the hammer on it) with it
        const dd = (vNew - vUsed) * dt;
        this.d += dd; jackG += gp * dd; this.work += this.force * dd;
        vF = vNew; w = wNew; carried = true;
      }
      g = jackG;
    }
    const gR = this.gR;
    // The shank lands on the rest rail's felt and comes back off it: Scott Murphy's high-speed clips (PTG Education
    // Hub) show about 0.6 of the landing speed after a quick release, and 0.68 in his double-strike clip.
    if (g < gR) { g = gR; w = w < -RAIL_V ? -RAIL_E * w : Math.max(0, w); if (w * STRIKE_R / 1000 > 0.05) this.emit('railbounce', { v: w * STRIKE_R / 1000 }); }
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
    let caughtNow = false, catchF = 1;
    // the spring's lift on a knuckle at height z, as the backcheck judges it; none while a finger holds the lever down clear of it
    const liftAt = z => h?.hold === 'rep' && z > L.hornTop ? 0 : springF(a, L, Math.min(z, L.hornTop));
    if (held) {
      // the hand lifts the tail off the backcheck, and can't push it in deeper than its face (or than it already is)
      st.checked = st.catching = false;
      const floor = Math.min(gC, this.g);
      if (catchActive && st.aboveCheck && g < floor) { g = floor; w = Math.max(0, w); }
    }
    if (!held && !st.checked && !st.catching && catchActive && st.aboveCheck && g < gTake && w < 0 &&
        (this.g >= gTake || this.g >= (this.gCwas ?? gFromTail(this.L.bcCatchY)) + CHECK_GIVE / STRIKE_R)) {
      // the tail meets the backcheck, which takes up the hammer's speed over CHECK_TAU x that speed, from where they met
      // inside this step (catchF: the share of the step that comes after)
      st.catching = true; st.dChecked = this.d; st.wCatch = -this.w; caughtNow = true;
      catchF = this.g >= gTake && this.g > g ? Math.max(0, Math.min(1, (gTake - g) / (this.g - g))) : 1;
      g = this.g; w = this.w;
    }
    if (st.catching) {
      // a key coming up lets go of the tail while it's still being caught, as it does once it's held
      if (this.d < st.dChecked - 0.8 || !catchActive) { st.catching = false; st.aboveCheck = false; this.emit('uncheck'); }
      else {
        st.dChecked = Math.max(st.dChecked, this.d);
        const dtc = dt * catchF, gFrom = catchF < 1 ? gTake : this.g;
        w = Math.min(0, this.w + st.wCatch / (2 * CHECK_TAU) * dtc);
        g = gFrom + (this.w + w) / 2 * dtc;
        if (jackG > g + 1e-6) { st.catching = false; st.aboveCheck = false; if (!caughtNow) this.emit('uncheck'); g = gFree; w = wFree; }
        else if (w >= 0) {
          st.catching = false; w = 0;
          // too soft a catch to grip: if the spring lifts at all there, it takes the hammer straight back out
          if (st.wCatch * STRIKE_R / 1000 < CHECK_HOLD_V && liftAt(knuckleBottom(g)[1]) > 1) {
            this.emit('softcheck', { dist: G.stringY - crownY(g) });
          } else {
            st.checked = true; st.give = gTake - g;
            // dist: where the backcheck holds it once the key is resting on its punching (under a blow the punching
            // is squashed at this moment and the backcheck with the key's end a little higher: now)
            const gDip = forced && this.d > this.dip ? gFromTail(linkage(a, this.dip, true).bcCatchY) + CHECK_GIVE / STRIKE_R - st.give : g;
            this.emit('checked', { dist: G.stringY - crownY(gDip), now: G.stringY - crownY(g) });
          }
        }
      }
    }
    if (st.checked) {
      st.dChecked = Math.max(st.dChecked, this.d);
      const net = liftAt(knuckleBottom(gTake - st.give)[1]) - 1;   // the spring where the knuckle is held
      if (net > G.checkHold) { st.checked = false; this.emit('jumpcheck'); }
      else if (this.d < st.dChecked - 0.8 || !catchActive) { st.checked = false; st.aboveCheck = false; this.emit('uncheck'); }
      else if (jackG > gTake - st.give + 1e-6) { st.checked = false; st.aboveCheck = false; this.emit('uncheck'); g = gFree; w = wFree; }
      else { g = gTake - st.give; w = 0; } // the backcheck grips the tail where it stopped it
    }
    // string
    if (g > gString()) {
      if (jackG >= gString() - 1e-9 && !st.escaped) {
        g = gString(); w = 0; this.d = dPrev; this.dTarget = Math.min(this.dTarget, dPrev);
        if (forced) { vF = Math.min(vF, 0); carried = true; }   // the string stops the hammer, the jack under it and the key
        if (!this.blocked) this.emit('blocked'); this.blocked = true;
        L = linkage(a, this.d, true); dAt = this.d;
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
    this.onJack = !st.escaped && Math.abs(g - jackG) < 1e-9;
    const Lwas = this.L, dWas = this.dL ?? dPrev; this.gCwas = gC;
    this.g = g; this.w = w; this.L = L; this.dL = dAt;
    if (forced) this.derivs(Lwas, dWas);
    if (forced) {
      // the key's speed after this step: with the hammer's share if the jack carried it, less friction (which can hold
      // it still), and none at all into a jammed jack
      if (!carried) { vF = shrink(vF, K.fr * GRAV / K.m * dt); this.jackLoad = 0; }
      if (this.jamD !== null && vF > 0) vF = 0;
      if (this.lid?.on) vF = Math.max(vF, this.lid.d > this.lid.to ? -this.lid.v : 0);   // up against the easing finger
      vF = cap(vF);
      this.v = vF;
      // let go and all but back at rest: the key is set where the regulation has it (REST_NEAR)
      const still = this.force === 0 && Math.abs(this.v) < REST_STILL;
      this.stillT = still ? this.stillT + dt : 0;
      if (still && this.stillT >= REST_T) {
        if (Math.abs(this.d) < REST_NEAR) { this.d = 0; this.v = 0; this.L = linkage(a, 0, true); this.dL = 0; if (this.onJack) { this.g = this.jgCam ? this.cam(0) : gOnJackAt(this.L, this.psi); this.w = 0; this.jgPrev = null; } }
        // or a tight bushing holds it down: it stays there until a hand lifts it
        else if (this.d > 0.5 && this.v === 0 && this.stillT >= 0.05 && !this.stuck && (BUSHINGS[a.bushing]?.drag || a.wippenDrag > 0)) { this.stuck = true; this.emit('keystuck'); }
      }
    } else this.jackLoad = this.onJack ? 1 : 0;
    this.stepDamper(dt);
  }
  run(seconds, dt = SUB) { this.step(seconds); }
  // Nothing moving and nothing about to: the key up at rest with no finger, weight or hand on it, the hammer home and
  // still, the jack home, the damper down (or held steady by the pedal). A step would change nothing but the clock,
  // so a page can skip it (idle(dt) keeps the clock) and spend nothing on a key nobody is playing.
  get atRest() {
    const a = this.a;
    return this.d === 0 && Math.abs(this.v) < 1e-9 && Math.abs(this.w) < 1e-9 && this.dTarget === 0 && !this.hand && !this.finger && !this.lid && !this.lifting && !this.stuck
      && !this.force && !this.st.escaped && !this.st.checked && !this.st.catching && !this.wedge0 && this.psiNow === this.psi
      && this.vd === 0 && this.pedal === this.pedalTarget && this.yd === Math.min(pedalHeadLift(a, this.pedal), a.damperStop) && !this.events.length;
  }
  idle(dt) { this.t += dt; }
}

// ---------- touchweight ----------
// What the key front weighs through a slow press, in grams, worked out from the same weights, springs and frictions the
// Sim moves the key by (Sim.keyLoads; the tests check the two agree): the force that balances the action at each point
// of the stroke (bal) and the friction that has to be overcome either way (fr). Going down the finger needs bal + fr;
// coming up the key lifts bal - fr.
//   down, up: weighed off as a technician does it, the damper lifted off by the pedal: the gram weight that just takes
//     the key down from rest to where let-off begins to resist (the most the stroke asks for on the way), and the
//     weight the key will just lift all the way back from there (the least it offers on the way)
//   balance, friction: half their sum and half their difference (Stanwood's balance weight and friction weight)
//   peak: the most the key asks for getting through let-off (the drop screw winding up the repetition spring, the
//     button tripping the jack against its spring and the knuckle's drag); bottom: what it takes to hold it down
//   trace: [{ d, down, up, damper, state }] for drawing force against travel; damper is what the damper adds once the
//     key has picked it up (pedal up)
// Left out: sliding friction at the capstan and the knuckle before let-off, so the friction is a floor.
export function touch(a, { step = 0.02 } = {}) {
  a = eff(a);
  const dip = dipOf(a), h = 0.01, st = { escaped: false, checked: false }, trace = [];
  let g = rest(a).g;
  const pose = (d, s, gIn) => {
    const L = linkage(a, d), r = staticHammer(a, L, s, gIn), kz = knuckleBottom(r.g)[1];
    return { L, g: r.g, psi: r.psi, z: kz <= L.hornTop + 1e-6 ? Math.min(kz, L.hornTop) : L.hornTop };
  };
  for (let d = 0; d <= dip - h + 1e-9; d += step) {
    const p = pose(d, st, g); g = p.g;
    const st2 = { ...st }, q = pose(d + h, st2, g);
    if (st2.escaped !== st.escaped) continue;   // the jack lets go inside this hundredth of a millimetre: nothing steady to read
    const k = 1 / h, rise = (p.L.phi - q.L.phi) * k, gd = (q.g - p.g) * k, psid = (q.psi - p.psi) * k;
    const comp = p.L.hornFree - p.z, compd = ((q.L.hornFree - q.z) - comp) * k;
    const hornG = HAMMER_WT / (hamPt(p.g, G.knuckleC)[0] - G.H[0]);
    const onBtn = p.L.psiBtn > p.L.psiRest + 1e-9, onScrew = p.L.rhoDrop < p.L.rhoStop;
    let bal = HAMMER_WT * gd + WIPPEN_WT * rise - KEY_FW, fr = KEY.friction + (BUSHINGS[a.bushing]?.drag || 0) + a.centerT.hammer * Math.abs(gd) + a.centerT.wippen * Math.abs(rise);
    if (comp > 1e-9 || compd > 1e-9) { bal += hornG * springF(a, p.L, p.z) * compd; fr += a.centerT.rep * Math.abs(compd) / -G.horn[0]; }
    if (onBtn) {
      bal += a.jackSpringT * Math.max(0, psid); fr += a.centerT.jack * Math.abs(psid);
      if (!st.escaped) fr += G.jackMu * hornG * Math.hypot(...G.jackTop) * Math.max(0, psid);
    }
    const damper = p.L.keyEndRise > a.damperGap ? DMP_KEY * (1 + a.damperDrag) * (q.L.keyEndRise - p.L.keyEndRise) * k : 0;
    // lost: the hammer still on the rest rail, the key going down with nothing on it (lost motion)
    trace.push({ d, bal, fr, down: bal + fr, up: bal - fr, damper, lost: Math.abs(gd) < 1e-9, btn: onBtn, state: st.escaped ? 'escaped' : onBtn ? 'tender' : onScrew ? 'screw' : '' });
  }
  // where let-off begins to resist: the drop screw or the button, whichever the key meets first; but a drop screw the
  // lever meets long before the button (set far too low) is part of the stroke, and its weight part of the downweight
  const dScrew = trace.find(r => r.state)?.d ?? dip, dBtn = trace.find(r => r.btn || r.state === 'escaped')?.d ?? dip, dBump = dBtn - dScrew > 1.5 ? dBtn : dScrew;
  const dLost = Math.max(-1, ...trace.filter(r => r.lost && r.d < dBump).map(r => r.d));   // lost motion at the top is no part of it
  const pre = trace.filter(r => r.d < dBump - 0.03 && r.d > dLost + 0.03 && r.d >= 0.1), ok = pre.length > 0;
  const down = ok ? Math.max(...pre.map(r => r.down)) : null, up = ok ? Math.min(...pre.map(r => r.up)) : null;
  const bump = trace.filter(r => r.state && r.state !== 'escaped');
  const last = trace[trace.length - 1];
  // the middle of the stroke (1 to 5 mm of key travel), where the two are often quoted
  const mid = pre.filter(r => r.d >= 1 && r.d <= 5), avg = k => mid.length ? mid.reduce((s, r) => s + r[k], 0) / mid.length : null;
  return { down, up, balance: ok ? (down + up) / 2 : null, friction: ok ? (down - up) / 2 : null, midDown: avg('down'), midUp: avg('up'), midFriction: avg('fr'),
    peak: bump.length ? Math.max(...bump.map(r => r.down)) : null, bottom: last ? last.up : null, bottomDown: last ? last.down : null,
    bumpAt: dBump, lostTo: Math.max(0, dLost), returns: up !== null && up > 0, trace };
}
// Key dip under a finger's weight: the front punching squashes (FELT_FRONT) under what the finger presses with beyond
// what the action pushes back with at the bottom. dipOf() is the dip with the key just touching the punching.
export function dipAt(a, grams, t = touch(a)) {
  return dipOf(eff(a)) + feltSquash(FELT_FRONT, Math.max(0, grams - (t.bottomDown ?? 0)) / FELT_FRONT.r) / FELT_FRONT.r;
}

// ---------- playing it: key return, repetition ----------
// run a Sim through a finger program [[t, sim => ...], ...] for T seconds; returns the Sim and its events
export function playKey(a, prog, T) {
  const s = new Sim(a), ev = [];
  let pi = 0;
  for (let i = 0, n = Math.round(T / SUB); i < n; i++) {
    while (pi < prog.length && i * SUB >= prog[pi][0] - 1e-12) prog[pi++][1](s);
    s.events.length = 0; s.sub(SUB);
    for (const e of s.events) ev.push(e);
  }
  return { s, ev };
}
// A normal blow held for 0.3 s and let go: how long the key takes to come back up (ms), how long the hammer takes to be
// back at rest and still, and how far up the key was when the jack got back under the knuckle
export function keyReturn(a, blow = 'mf') {
  const s = new Sim(a), g0 = s.g, T0 = 0.3;
  let keyMs = null, homeMs = null, resetUp = null;
  s.blow(blow);
  for (let i = 0, n = Math.round(1.5 / SUB); i < n; i++) {
    const t = i * SUB;
    if (i === Math.round(T0 / SUB)) s.release();
    s.events.length = 0; s.sub(SUB);
    if (t < T0) continue;
    for (const e of s.events) if (e.type === 'reset' && resetUp === null) resetUp = 1 - e.d / s.dip;
    if (keyMs === null && s.d <= 0.05) keyMs = 1000 * (t - T0);
    if (keyMs !== null && homeMs === null && s.d === 0 && Math.abs(s.g - g0) < 2e-4 && Math.abs(s.w) < 1e-6) { homeMs = 1000 * (t - T0); break; }
  }
  return { keyMs, homeMs, resetUp, stuck: s.stuck };
}
// Repeated blows: the finger pushes with F grams for the first half of each beat and eases up over the second half, n
// times, at `rate` blows a second. A blow from a part release is a shorter stroke and softer for it; it counts as
// sounding if the hammer struck in its beat at no less than a third of the first blow's speed (the sim's own line).
// REPEAT_F is a firm finger, the sim's own.
export const REPEAT_F = 600, REPEAT_SOUNDS = 1 / 3;
// Each beat: pushed with F for the first half, the finger easing up to `up` (a share of the dip) over the second half.
// Played as a generator, `chunk` time steps between yields, so a page can do it a few milliseconds at a time; each
// blow gives its fastest strike (m/s, 0: none) and how far up the key got. repeatTest() plays it straight through.
export function* repeatRun(a, rate, { n = 5, F = REPEAT_F, up = 0.5, chunk = 500 } = {}) {
  const s = new Sim(a), blows = [], per = Math.round(1 / rate / SUB), on = Math.round(per / 2), to = s.dip * (1 - up);
  let k = 0;
  for (let b = 0; b < n; b++) {
    let v = 0, rose = 0;
    s.push(F);
    for (let i = 0; i < per; i++) {
      if (i === on) s.ease(to, Math.max(1, s.d - to) / ((per - on) * SUB));
      s.events.length = 0; s.sub(SUB);
      for (const e of s.events) if (e.type === 'strike') v = Math.max(v, e.v);
      if (i >= on) rose = Math.max(rose, 1 - s.d / s.dip);
      if (++k % chunk === 0) yield k;
    }
    blows.push({ v, rose });
  }
  const v0 = blows[0].v, good = b => v0 > 0 && b.v >= REPEAT_SOUNDS * v0;
  return { rate, up, blows: blows.map(b => ({ ...b, ok: good(b) })), ok: blows.every(good), sounded: blows.filter(good).length };
}
export function repeatTest(a, rate, opts = {}) {
  const it = repeatRun(a, rate, opts);
  let r;
  while (!(r = it.next()).done);
  return r.value;
}
// The fastest this key repeats, the finger letting it up by `up` of its dip each time (a half by default): the rate
// (whole blows a second) up to which every blow of repeatTest sounds, counting up from 3 a second until one fails
// (0: it doesn't repeat that way at all)
export function repeatCeiling(a, opts = {}) {
  let best = 0;
  for (let r = 3; r <= 30; r++) { if (repeatTest(a, r, opts).ok) best = r; else break; }
  return best;
}

// Factory regulation solved offline with factory() (node), so the page loads fast. Solved again on 2026-11-10 for the
// level shank and the shorter underlever: this line is factory()'s output to four places.
export const FACTORY = {"balPunch":1.5,"jackScrew":-0.5704,"repStop":-0.4583,"capstan":13.8059,"restRail":104.5261,"frontPunch":2.299,"letoff":95.6037,"drop":140.1825,"repSpring":1.354,"backcheck":0.5158,"damperGap":3.4985,"damperStop":4.9279,"pedalLift":3.0904,"damperDrag":0.05,"hammerTravel":0,"hammerSpace":0,"hammerSquare":0,"wippenSpace":0,"wippenTravel":0,"backcheckSpace":0,"backcheckSquare":0,"damperCenter":0,"damperLevel":0};

// ---------- maker spec sets (GS-09, WCI-14) ----------
// The set graded against: the generic textbook set above (the default, unchanged), or one maker's own figures laid over
// it. A maker's printed range is a band (lo, hi: its edges pass at every level); a single printed figure keeps the
// generic reading's tolerance, which is the sim's own. Where a maker prints no figure for a reading, the generic band
// stands and specSource() says so. Sources (read from the makers' own service literature; only the figures are kept
// here): Steinway & Sons' technical reference guide, grand regulation chapter (New York: models S to B) and its
// Hamburg factory preparation checklist; Kawai's grand piano regulation manual (middle and treble figures).
// This action is still the measured Boston, note 52: a maker's figures on it show the trade-offs, not that maker's piano.
// reg: the same geometry regulated to the set (solved offline: tests/spec-set-regulate.mjs), swapped into FACTORY while
// the set is chosen. aim: where in a printed range that regulation was aimed, when the middle of every range can't be
// had at once on this geometry. fit: what the set showed about the model.
const OWN = 'the tolerance is the sim\'s own';
export const SPEC_SETS = {
  generic: { name: 'Generic textbook', maker: null, source: 'generic textbook figures, not one maker\'s', over: {} },
  steinwayNY: { name: 'Steinway (New York)', maker: 'Steinway', source: 'Steinway & Sons technical reference guide, grand regulation',
    over: {
      blow: { target: 1.75 * IN, tol: IN / 32, src: `Steinway: 1 3/4 in, models S to B (${OWN})` },
      letoff: { target: IN * 3 / 64, lo: IN / 32, hi: IN / 16, src: 'Steinway: no less than 1/32 in, no more than 1/16 in' },
      drop: { target: IN * 3 / 64, lo: IN / 32, hi: IN / 16, src: 'Steinway: no more than 1/16 in below let-off (the 1/32 in floor is the sim\'s own)' },
      dip: { target: 0.400 * IN, lo: 0.390 * IN, hi: 0.420 * IN, src: 'Steinway: .400 in, within .390 to .420 in' },
      aftertouch: { target: IN * 7 / 128, lo: IN * 3 / 64, hi: IN / 16, src: 'Steinway: 3/64 to 1/16 in' },
      check: { target: IN / 2, tol: IN / 16, src: `Steinway: 1/2 in (${OWN})` },
      damperStop: { target: IN / 16, tol: IN / 64, src: `Steinway: about 1/16 in in the treble (${OWN})` },
    },
    // regulated to the printed figures; the aftertouch that leaves is outside Steinway's own range (fit)
    reg: { frontPunch: 1.6973, letoff: 95.676, drop: 140.3269, repSpring: 1.3392, backcheck: 0.8308, damperStop: 5.2815, pedalLift: 3.444 },
    unmet: ['aftertouch'],
    fit: 'This action is the measured Boston, and it cannot meet this set: at Steinway\'s blow, let-off and .400 in dip it leaves about 2.2 mm (over 5/64 in) of aftertouch where Steinway expects 3/64 to 1/16 in, and with all three at the far edge of their ranges still 1.69 mm. Aftertouch stays out of this set here; the model is not bent to fit. A Steinway gets there with a lower action ratio (about 4.9 to this action\'s 5.4).' },
  hamburg: { name: 'Steinway (Hamburg)', maker: 'Hamburg', source: 'Steinway & Sons Hamburg factory preparation checklist',
    over: {
      blow: { target: 46, lo: 45, hi: 47, src: 'Hamburg: 45 to 47 mm' },
      letoff: { target: 1, tol: IN / 64, src: `Hamburg: 1 mm from the steel strings (${OWN})` },
      drop: { target: 2, tol: IN / 64, src: `Hamburg: 2 mm after let-off (${OWN})` },
      check: { target: 15, tol: IN / 16, src: `Hamburg: approximately 15 mm (${OWN})` },
      damperStop: { target: 1, tol: IN / 64, src: `Hamburg: approximately 1 mm (${OWN})` },
    },
    aim: { blow: 45.5, dip: 9.75 },
    reg: { jackScrew: -0.4942, repStop: -0.4418, capstan: 13.7155, restRail: 103.7341, frontPunch: 2.0858, letoff: 95.7107, drop: 140.1945, repSpring: 1.3444,
      backcheck: 0.2176, damperGap: 3.5548, damperStop: 4.4337, pedalLift: 3.1837 },
    fit: 'Hamburg\'s checklist prints no dip or aftertouch figure, so those two are graded on the generic bands. At the middle of Hamburg\'s blow (46 mm) with the generic 3/8 in dip this action leaves 1.21 mm of aftertouch, under the generic band; the regulated key here is set to 45.5 mm blow and 9.75 mm dip, inside both bands, which leaves 1.52.' },
  kawai: { name: 'Kawai', maker: 'Kawai', source: 'Kawai grand piano regulation manual',
    over: {
      blow: { target: 46, tol: IN / 32, src: `Kawai: 46 mm (${OWN})` },
      restGap: { target: 5, tol: IN / 16, src: `Kawai: rest rail 5 mm below the shanks (${OWN})` },
      letoff: { target: 1.25, lo: 1, hi: 1.5, src: 'Kawai: 1.0 to 1.5 mm, middle and treble' },
      drop: { target: 1.25, lo: 1, hi: 1.5, src: 'Kawai: the same as the let-off (1.0 to 1.5 mm)' },
      dip: { target: 10.1, tol: IN / 64, src: `Kawai: 10.1 mm dip block (${OWN})` },
      check: { target: 15, tol: IN / 16, src: `Kawai: 15 mm (${OWN})` },
      damperStop: { target: 1.5, lo: 1, hi: 2, src: 'Kawai: 1 to 2 mm is permissible' },
    },
    reg: { jackScrew: -0.4574, repStop: -0.4339, capstan: 13.6727, restRail: 101.5326, frontPunch: 1.7542, letoff: 95.6652, drop: 140.3052, repSpring: 1.3317,
      backcheck: 0.1096, damperGap: 3.5813, damperStop: 5.1136, pedalLift: 3.3636 },
    fit: 'This action meets Kawai\'s middle-and-treble figures at every level, with 1.83 mm of aftertouch (Kawai prints no aftertouch figure: graded on the generic band). Kawai\'s key height (66 to 68 mm from the keybed) and its bass let-off and drop are not modelled.' },
};
const GENERIC_SPEC = { ...SPEC }, GENERIC_FACTORY = { ...FACTORY };
let specSetNow = 'generic';
export const specSet = () => specSetNow;
// Choose the set: SPEC's entries and FACTORY's values are swapped in place, so everything that grades or deals a
// regulated key follows without knowing about sets.
export function setSpecSet(id) {
  if (!Object.hasOwn(SPEC_SETS, id)) id = 'generic';
  specSetNow = id;
  for (const k of Object.keys(GENERIC_SPEC)) {
    const o = SPEC_SETS[id].over[k], base = { ...GENERIC_SPEC[k] };
    if (o) { if ('lo' in o) delete base.tol; else { delete base.lo; delete base.hi; } }
    SPEC[k] = o ? { ...base, ...o } : GENERIC_SPEC[k];
  }
  Object.assign(FACTORY, GENERIC_FACTORY, SPEC_SETS[id].reg || {});
  return id;
}
// Whose figure a reading is graded against under the chosen set: { text, fallback } (fallback: the maker prints none,
// so the generic band stands). Under the generic set, only the bands a source prints have one.
export function specSource(id) {
  const set = SPEC_SETS[specSetNow], s = GENERIC_SPEC[id];
  if (set.over[id]) return { text: set.over[id].src, fallback: false };
  if (!set.maker) return s.src ? { text: s.src, fallback: false } : null;
  if (s.target === undefined && s.lo === undefined) return null;   // a part's own spec (center friction), not a regulation figure
  return { text: `generic${s.src ? ` (${s.src})` : ' textbook figure'}: ${set.maker} prints none for this`, fallback: true };
}
