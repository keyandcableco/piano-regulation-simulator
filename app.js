import { G, IN, ADJ, SPEC, DAMPER_SPECS, DAMAGE, FACTORY, NEIGHBOR_H, Sim, measure, grade, hamPt, crownY, crownTop, keyAngle, keyPt,
         jackGeom, knuckleBottom, coreBack, eff, repSupportZ, sideZ, jackSide, linkage, gString as gStringNow } from './model.js';
import { createScene, NOTE_Z, BASS } from './scene.js';
import { TIPS, TOOLS, NAME_FORUM_POSTERS, NAMED_OK } from './tips.js';
import { mountSwingDrill } from './drills.js';
import { TOOLBAG } from './toolbag.js';
import { BUSHINGS, KEY, CENTERS, CENTER_FAULTS } from './model.js';

const $ = s => document.querySelector(s);
const el = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const k of kids.flat()) if (k != null) e.append(k.nodeType ? k : document.createTextNode(k));
  return e;
};

// ---------- units ----------
let units = 'in';
function fracIn(mm) {
  const inch = mm / IN, sign = inch < 0 ? '−' : '';
  let v = Math.abs(inch), whole = Math.floor(v), n = Math.round((v - whole) * 64), d = 64;
  if (n === 64) { whole++; n = 0; }
  while (n && n % 2 === 0) { n /= 2; d /= 2; }
  if (!whole && !n) return v > 1e-4 ? (sign || '') + '<1/64"' : '0"';
  return sign + (whole ? whole + (n ? ' ' : '') : '') + (n ? `${n}/${d}` : '') + '"';
}
const fmm = mm => `${mm.toFixed(mm < 10 ? 2 : 1)} mm`;
function fmt(mm, signed = false) {
  if (mm == null || Number.isNaN(mm)) return '—';
  const s = signed && mm > 0 ? '+' : '';
  return units === 'in' ? s + fracIn(mm) : s + fmm(mm).replace(/^-/, '−');
}
const fmtBoth = mm => units === 'in' ? `${fracIn(mm)} (${fmm(mm)})` : `${fmm(mm)} (${fracIn(mm)})`;

// ---------- skill level ----------
// Apprentice: readings live everywhere, looser tolerances, hints. Journeyman: readings only after
// the test that measures them. RPT: exam-tight tolerances and damage faults in the mix.
const LEVELS = {
  apprentice: { name: 'Apprentice', tolK: 1.5, live: true, hints: true },
  journeyman: { name: 'Journeyman', tolK: 1, live: false, hints: false },
  rpt: { name: 'RPT', tolK: 0.75, live: false, hints: false, damage: true },
};
let LEVEL = LEVELS.journeyman;
try { const v = localStorage.getItem('regsim-level'); if (v && Object.hasOwn(LEVELS, v)) LEVEL = LEVELS[v]; } catch {}
const level = () => (mode === 'exam' && exam.started ? exam.level : LEVEL);
const gradeL = (id, mm) => grade(id, mm, level().tolK);

// ---------- state ----------
// Three note slots (0 = middle, 1 = toward the bass, 2 = toward the treble). The one-note modes
// use slot 0; exam mode and the Sandbox's three keys use all three. adj, sim, m and tested always point at the current slot.
const NOTES = [0, 1, 2].map(() => { const a = { ...FACTORY }; return { adj: a, sim: new Sim(a), m: measure(a), tested: new Set() }; });
let cur = 0;
// Grand or upright (C6): the upright's own module (upright-app.js, loaded the first time it is picked) takes the picture,
// the panel, the loop and the move buttons; everything else in this file is the grand's, and waits while it does
let action = 'grand', U = null;
let adj = NOTES[0].adj, sim = NOTES[0].sim, m = NOTES[0].m, tested = NOTES[0].tested;
function store() { Object.assign(NOTES[cur], { adj, sim, m, tested }); }
function selectNote(slot) {
  if (slot === cur || busy) return;
  clearPlan(); clearFrames();   // the frames carry the other note's markers
  NOTES.forEach(n => { if (n.sim.dTarget > 0) n.sim.press(0, 60); });   // a chord comes up too: its plan to let it up is gone
  store(); cur = slot; closePop();
  ({ adj, sim, m, tested } = NOTES[slot]);
  S.setFocus(focusFor(viewNow));
  S.clearCallouts(); letoffMark = checkMark = letoffD = null;
  refresh();
}
let mode = 'sandbox';   // open on a regulated action: Learn's deliberate faults read as bugs to a first-time visitor
let timeScale = 0.1;
let stepIdx = 0;
// Find the fault: verdict is the last check ({ bad: spec ids still out }); gaveUp shows the answer
let scenario = null, testsUsed = 0, verdict = null, checks = 0, gaveUp = false, hint = false;
let hammerOverride = null, jackOverride = null;
let simTime = 0;
const waits = [];
const waitSim = s => new Promise(r => waits.push({ at: simTime + s, r }));
let busy = 0;
let forcedScale = null; // tests run at their own speed

const canvas = $('#c'), overlay = $('#overlay');
let S;
try { S = createScene(canvas, overlay); }
catch (err) {
  $('#stage').replaceChildren(el('div', { class: 'fallback' },
    el('h2', {}, 'This simulator needs 3D graphics (WebGL)'),
    el('p', {}, 'Try a current Chrome, Firefox, Safari or Edge, and check that hardware acceleration is turned on in the browser settings.')));
  $('#mode').replaceChildren();
  throw err;
}

// side views follow the current note and fade the other two; sighting the hammer line shows all three at full strength,
// and so do the Sandbox's views where the three stand side by side
let viewNow = 'action';
let travelRestG = null;   // the hammer's rest angle in the traveling view, held while a test lifts it
const TOGETHER = new Set(['angle', 'damperline', 'damperrow']);
const focusFor = name => !multi() || name === 'hammerline' || (examActive() ? exam.done : TOGETHER.has(name)) ? null : cur;
const view = name => { viewNow = name; travelRestG = null; S.setFocus(focusFor(name)); S.setView(name, NOTE_Z[cur]); };

// ---------- learn steps (standard grand order) ----------
// The order follows the published grand sequences (Randy Potter School checklist, Steinway and
// Kawai service manuals): prepare, level the keys, jack and repetition lever, blow and hammer
// line, let-off, drop, dip, aftertouch, backchecks, then the repetition springs, then dampers.
// Cards marked info are steps the sim does not model, shown so the sequence reads complete.
const STEPS = [
  { spec: 'hammerCenter', also: ['wippenCenter', 'jackCenter', 'repCenter'], id: 'prep', title: 'Before you regulate: prepare the action',
    knobs: [], centers: ['hammer', 'wippen', 'jack', 'rep'], test: 'swingHammer', tests: ['swingHammer', 'wobbleHammer', 'wippenTilt', 'tenderPlay', 'jackFall', 'repGauge'],
    what: 'Regulating over loose screws, tight centers or sticky keys is wasted work. Tighten the action and keyframe screws, and check that every center swings freely but not loosely: the hammer flange, the wippen flange, the jack and the repetition lever (the damper underlevers come with the dampers). Ease any tight key bushings, and shape or file worn hammers and fit them to the strings: both change blow and let-off, so they come first.',
    how: 'Swing the hammer and count, then hold its flange and flex the shank sideways. Tilt the wippen and let it fall back; wiggle the jack\'s tender side to side; with the springs unhooked, let the jack fall under its own weight and gauge the repetition lever at the drop screw. A tight center whose cloth is still firm is eased; a loose one is repinned with the next half size up; one that wobbles with its friction right has worn cloth and is rebushed. Key bushings are on the card after next; tightening screws and shaping hammers aren\'t on this card.',
    note: 'Friction is read in grams on a gram gauge at a stated distance from the pin. Rule out regulation first: let-off, dip, blow, key bushings and damper timing can all feel like a sluggish center (Rob Goodale). When one center is sluggish, check that part\'s others too (Igrec). The published ranges differ: Renner\'s table runs tighter than Igrec\'s for the wippen and the repetition lever, so the sim grades those, and the jack, on Igrec\'s, and the hammer on Renner\'s. The healthy hammer here is the measured Boston\'s, at the tight end: about 5 half-swings.' },
  { info: true, id: 'bedding', title: 'Bed the keyframe',
    what: 'The keyframe has to sit flat on the keybed at the front rail, balance rail and back rail. If it rocks, it knocks, and the key dip and height wander.',
    how: 'Knock test with the action in: press on the rails and listen. Sand the front rail where it doesn\'t touch; set the balance rail glide bolts so they just touch, never lifting the rail.' },
  { spec: 'keyBushings', id: 'keys', title: 'Square, space and ease the keys', knobs: [], bushings: true, test: 'rockKey', tests: ['rockKey', 'keyDrop'],
    what: 'Each key has to work freely yet firmly before anything else is regulated. Steinway: "A tight key will make other adjustments virtually useless." Rocked side to side at the front, at rest and held down, the key should have slight play at its front rail bushing; twisted at its front, a little at the balance pin. With the stack lifted off, a key raised and let go should drop easily.',
    how: 'A tight bushing (no play, or a key that drops slowly or stays up) is eased: squeeze the mortise with key easing pliers. A worn one (a knock each way, often a click) is rebushed with new cloth sized to the pin; easing it only makes it looser. Square a key by bending the balance rail pin to one side with a soft drift; space it by bending the front rail pin, the tool under the punching so the pin isn\'t marked. The sim keeps its keys square and spaced.',
    note: 'No technician standard gives key side play in millimetres: Steinway asks for slight play, even across the keyboard, and techs say you should feel it but not see it. The sim\'s band is its own. A key that drops freely with the stack off but comes up slowly with it on has its friction in the action, not the key.' },
  { spec: 'hammerTravel', title: 'Travel the hammers', knobs: ['hammerTravel'], test: 'travelLift',
    what: 'Lift the hammer slowly to the strings: it should rise straight, without drifting sideways. A hammer that travels off its path ends up striking a different spot than where it rests.',
    how: 'Put a strip of thin paper under one side of the hammer flange to tilt its path: under the side the hammer drifts toward as it rises. That side of the flange lifts and the path swings back. Paper on the wrong side makes the drift worse. Travel before spacing, since traveling moves the hammer at the strings.',
    note: 'Wippen flanges take traveling paper too, behind the flange on the wippen rail: that comes with the jack step.' },
  { spec: 'hammerSpacing', title: 'Space the hammers to the strings', knobs: ['hammerSpace'], test: 'alignSight',
    what: 'At the strings, the hammer should be centered on its unison so it strikes all three strings evenly (makers vary: some favor the treble side).',
    how: 'Loosen the flange screw, shift the hammer sideways, retighten.',
    note: '' },
  { spec: 'hammerSquare', title: 'Square the hammer heads', knobs: ['hammerSquare'], test: 'alignSight',
    what: 'The hammer head should stand square to the strings, so its crown meets all the strings of the unison at once.',
    how: 'Burn the shank: warm it with a heat gun or alcohol lamp and twist it until the head is square, then let it cool.',
    note: 'A head that won\'t stay square, or wobbles from blow to blow, is telling you about a damaged shank, not a regulation problem.' },
  { spec: 'keyHeight', title: 'Key height', knobs: ['balPunch'], test: 'straightedge',
    what: 'Every other measurement starts from the key, so level it first. Lay a straightedge across the neighboring keys: this key should just touch it.',
    how: 'Add or remove punchings under the key at the balance rail. The key rocks on the back rail, so the front moves about twice the punching thickness.',
    note: 'Key height also changes dip and aftertouch, which you set later.' },
  { spec: 'jackPos', also: ['wippenSpacing'], title: 'Jack position under the knuckle', knobs: ['jackScrew', 'wippenSpace', 'wippenTravel'], test: 'sightJack', tests: ['sightJack', 'sightJackFront'],
    what: 'Line up the back of the jack with the back of the knuckle core: the thin wood tongue through the middle of the felt roll, which runs up into the shank. Follow the line of the tongue\'s back face down: it should meet the back of the jack\'s top corner. Seen from the front, the jack should also stand centered under the knuckle.',
    how: 'Turn the jack regulating screw to move it front to back. Too far back and the jack drags as it escapes and is slow to get back under the knuckle; too far forward and it has less of the knuckle to push on. To center it side to side, loosen the wippen flange screw and shift the whole wippen, or put traveling paper behind one side of the wippen flange, between it and the rail: the wippen swings like a gate and the jack moves toward the side the paper is on.',
    note: 'Near its mark, jack position changes how let-off feels (forward lightens the bump) more than where it happens; the sim models where, not the feel. Set too far forward, the knuckle slips off the back of the jack before the button trips it: let-off comes early and the blow is weak. The knuckle rides on the jack\'s rounded, slick back corner, so moving the jack also moves the hammer a little: recheck the wink and blow after. Spacing the hammers moves the knuckles sideways, so center the jacks after the hammers. Steinway\'s guide (written for its uprights) also centers the jack\'s toe on its button, and calls for a compromise when the two disagree.' },
  { spec: 'wink', title: 'Repetition lever height', knobs: ['repStop'], test: 'wink',
    what: 'Trip the jack with the key at rest: the hammer should "wink", dropping a little (about 1/16") onto the repetition lever, and the jack should slip back under the knuckle when you let it go. Put another way, the top of the lever sits just below the top of the jack, about the thickness of a thin front punching.',
    how: 'Turn the repetition lever height screw. If the hammer doesn\'t move, the lever is too high: it holds the hammer off the jack (lost motion, uneven hammer line). If it drops and the jack can\'t get back under, the lever is too low and the note won\'t repeat.',
    note: 'The wink moves when you set the blow next, and a spring too weak to carry the hammer deepens it: check it again after the hammer line and the springs.' },
  { spec: 'blow', title: 'Blow distance and hammer line', knobs: ['capstan'], test: 'blowGauge',
    what: 'The capstan lifts the wippen and sets the hammer\'s rest height. Textbook blow distance is 1 3/4"; makers range from about 44 to 48 mm. Across a section the hammers should form a straight line.',
    how: 'Turn the capstan. Up raises the hammer and shortens the blow.',
    note: 'If a shank sits on the rest rail, the capstan can\'t lift that hammer: lower the rail out of the way first, then bring it up. Less blow means more aftertouch, so the capstan is one of the two real aftertouch adjustments.' },
  { spec: 'restGap', also: ['lostMotion'], title: 'Hammer rest rail', knobs: ['restRail'], test: 'restRail', tests: ['restRail', 'topPlay'],
    what: 'The rest rail sits a little below the shanks so the hammers ride on their wippens and capstans, never on the rail. Then press the key lightly at the very top: the hammer should start up the moment the key moves.',
    how: 'Raise or lower the rail. If a shank sits on the rail, the hammer is not riding on the wippen: the key moves before the hammer does, and that free play is lost motion.',
    note: 'The sim grades 1/8" (3 mm, as Ed Foote sets it). Some techs set the rail about a shank\'s thickness down; either way no shank may rest on it.' },
  { spec: 'letoff', title: 'Let-off', knobs: ['letoff'], test: 'slowPress',
    what: 'Press the key slowly: the jack should trip with the hammer 1/16" from the string on this note. Let-off is set wider toward the bass and closer toward the top treble.',
    how: 'Turn the let-off button. Lower trips earlier (farther from the string). Too close and soft notes block or buzz; too far and you lose pianissimo control and power.',
    note: 'The jack\'s tender should reach the let-off button just as the repetition lever reaches the drop screw; the drop step comes back to that.' },
  { spec: 'drop', title: 'Drop', knobs: ['drop'], test: 'slowPress',
    what: 'In a well-regulated action the repetition lever meets the drop screw at the same moment the jack\'s tender meets the let-off button. Then, just after let-off, the hammer falls back onto the lever about 1/16" below where it let off. As the key goes on to the bottom the lever lifts it back up, nearly to where it let off with this much aftertouch: ignore that rise (Igrec), but it must never be pushed back up to the string.',
    how: 'Turn the drop screw. Down stops the lever sooner and gives more drop. Too little drop and the hammer can bobble against the string; too much makes repetition sluggish.',
    note: 'Press slowly and watch the two contacts: the sim tells you which came first and by how much key travel. Chris Brown regulates one sample note so they meet together, then matches the rest to its let-off and drop. Rough in the repetition springs first: with a spring too weak to carry the hammer, drop can\'t be set.' },
  { spec: 'dip', title: 'Key dip', knobs: ['frontPunch'], test: 'dipBlock',
    what: 'Dip is how far the key front travels. A common grand starting point is 3/8"; makers specify about 10 mm. On a real piano or the exam model you work to the given spec.',
    how: 'Change the front rail punchings. Thicker punchings stop the key sooner and give less dip. Measure with moderate pressure, about the weight of your hand: pressing hard squashes the punching.',
    note: 'Dip moves checking with it, and how far the lever lifts the hammer back at the bottom, so recheck those. If the hammer blocks before the key bottoms, let-off may be too close, the dip too shallow, or there is lost motion: find which first.' },
  { spec: 'aftertouch', title: 'Aftertouch', knobs: ['frontPunch', 'capstan'], test: 'slowPress',
    what: 'Aftertouch is the key travel left after let-off. Igrec gives about 1 mm (0.8 to 1.5 mm), and many modern grands run more; this action at the textbook dip and blow gives about 1.7, and the sim grades that. It is what makes sure the jack escapes on the softest blow.',
    how: 'Most texts set it with dip and blow: more dip or less blow gives more aftertouch. Neither moves let-off or drop, judged just after let-off, but dip moves checking: recheck that. Some techs, Chris Brown among them, fine-tune it together with let-off and drop.',
    note: 'Too little and soft notes block or bobble; too much wastes the blow, slows repetition and crushes the jack\'s stop felt.' },
  { spec: 'check', also: ['backcheckAlign'], title: 'Backcheck', knobs: ['backcheck', 'backcheckSpace', 'backcheckSquare'], test: 'strikeHold', tests: ['strikeHold', 'sightBackcheck'],
    what: 'Strike firmly and hold: the backcheck should catch the hammer 1/2" to 5/8" from the string, even across the section. Seen from the front, it should sit centered behind the tail, its face square to the tail\'s.',
    how: 'Bend the backcheck wire toward or away from the hammer. Set it as close as the tail allows without scraping on the way up, within 1/2" to 5/8". Bent too far back it misses the tail altogether. Then bend it sideways to center it and twist the head with parallel pliers to square it, as Steinway\'s guide does after setting the distance.',
    note: 'On a real action the scraping limit usually lands inside 1/2" to 5/8"; this action\'s backcheck leaves more room, so the sim grades the window. The checking distance sets how the repetition spring behaves, which is why the springs come next.' },
  { spec: 'spring', title: 'Repetition spring', knobs: ['repSpring'], test: 'easeUp',
    what: 'Strike and hold so the hammer checks, then ease up a little. The hammer should rise steadily up to the drop screw: quick, but not snappy.',
    how: 'Adjust the spring. Too weak and it rises slowly or not at all; too strong and you feel a "pop" in the key, or it will not stay checked.',
    note: 'A spring too weak to carry the hammer lets the lever sag under it, which deepens the wink. Recheck the wink.' },
  { spec: 'damperTiming', title: 'Damper lift timing', knobs: ['damperGap'], test: 'damperSlow',
    what: 'Press the key slowly and watch the damper: it should start to lift when the hammer is a third to half of the way to the string.',
    how: 'Loosen the set screw in the underlever\'s wire block, move the underlever up or down the wire with the head seated on the strings (a setting jig holds it), and retighten. That changes how much key travel happens before the key end picks up the underlever. Too early and you feel the dampers in the touch; too late and the note isn\'t fully undamped at soft levels.',
    note: 'Lift timing is set key by key, so look for evenness across a section.' },
  { spec: 'damperStop', title: 'Damper stop rail', knobs: ['damperStop'], test: 'damperSlow',
    what: 'With the key held firmly down, there should be a hair of room (about 1/32" at the damper head) before the underlever reaches the stop rail.',
    how: 'Raise or lower the rail. It keeps dampers from flying up on hard staccato and bobbling on the way down. It is not the pedal\'s stop: the pedal has its own, set to about the same height.',
    note: 'Simplified here: the damper falls by its own weight. Many bass dampers also have springs.' },
  { spec: 'pedalLift', title: 'Damper pedal lift', knobs: ['pedalLift'], test: 'pedalTest',
    what: 'The pedal should lift every damper just above where the keys take them, about level with the stop rail.',
    how: 'Set the pedal\'s stop (or the rod length) so the lift tray takes the dampers just past the key lift. Too little and some notes stay damped; too much and the dampers slam into the stop rail and thump.',
    note: 'On a real piano also leave a little free play in the pedal and rod before the tray moves. Not modelled yet.' },
  { spec: 'damperFall', also: ['damperSeat', 'underCenter'], title: 'Damper wires: fall freely, seat flat', knobs: ['damperDrag', 'damperCenter', 'damperLevel'], centers: ['under'], test: 'pedalTest', tests: ['pedalTest', 'damperSight', 'ulDrop'],
    what: 'Let the pedal go: every damper should drop and land at once. One that hangs or lands late leaves the note ringing. Each head should sit centered on its unison, both ends of its felt on the strings with equal force.',
    how: 'A late damper usually has a wire that isn\'t running straight through its guide rail bushing: bend the wire so it passes without binding, or ease a tight bushing. If the wire runs free, loosen its set screw and let the underlever drop on its own: it should fall from its own weight, or its center is tight. Bend the top of the wire (bends 3 and 4, in Igrec\'s numbering) to center the head, and bend it as seen from the side to seat both ends.',
    note: 'A head off center or up at one end lets a string ring on after the key comes up. Igrec checks a row by laying a small ruler on the tops of the heads: they should run parallel with it.' },
  { info: true, id: 'pedals', title: 'Sostenuto and una corda',
    what: 'Last come the sostenuto (its rod catching only the tabs of the dampers held up) and the una corda shift (the hammers moving over to strike two strings of three).',
    how: 'Not in the sim yet.' },
  { info: true, id: 'again', title: 'Go round again',
    what: 'Every adjustment moves something you already set. Technicians go through the sequence two or three times until nothing moves, then play-test for repetition and evenness.',
    how: 'The final check re-measures everything and shows what drifted.' },
];

// ---------- tests ----------
const TESTS = {
  straightedge: { label: 'Lay the straightedge', specs: ['keyHeight'], view: 'keyfront',
    run: async () => { await releaseKey(); S.straightedge.visible = true; await waitReal(3); S.straightedge.visible = false; } },
  sightJack: { label: 'Sight the jack under the knuckle', specs: ['jackPos'], view: 'escapement', run: async () => { await releaseKey(); } },
  wink: { label: 'Trip the jack (wink test)', specs: ['wink'], view: 'escapement',
    run: async () => {
      // push the tender to trip the jack, watch the hammer settle onto the repetition lever, then let go
      await releaseKey();
      const g0 = sim.g, gRep = solveG(repSupportZ(sim.a, sim.L)), returns = m.jackReturns;
      for (let i = 0; i < 2; i++) {
        jackOverride = sim.L.psiRest + 0.16; hammerOverride = Math.min(g0, gRep); await waitReal(0.8);
        if (returns) { jackOverride = null; hammerOverride = null; }
        else { jackOverride = sim.L.psiRest + 0.07; toast('The jack can\'t get back under the knuckle', 'warn'); }
        await waitReal(0.8);
      }
      jackOverride = null; hammerOverride = null;
    } },
  blowGauge: { label: 'Blow distance gauge', specs: ['blow'], view: 'hammer', run: async () => { await releaseKey(); } },
  restRail: { label: 'Look at the rest rail', specs: ['restGap'], view: 'rails', run: async () => { await releaseKey(); } },
  damperSlow: { label: 'Press slowly: watch the damper', specs: ['damperTiming', 'damperStop'], view: 'dampers', damper: true,
    run: async () => { setPedal(false); await releaseKey(); sim.press(sim.dip, 6); await waitSim(2.2); await waitReal(1); } },
  alignSight: { label: 'Sight the hammer on its strings', specs: ['hammerSpacing', 'hammerSquare'], view: 'hammerline',
    run: async () => { await releaseKey(); hammerOverride = gStringNow() - 0.004; await waitReal(1.6); hammerOverride = null; } },
  travelLift: { label: 'Lift the hammer slowly to the strings', specs: ['hammerTravel'], view: 'travel',
    run: async () => {
      await releaseKey(); await waitReal(0.7);   // let the view settle first
      const g0 = sim.g, g1 = gStringNow() - 0.004;
      for (let i = 0; i <= 60; i++) { hammerOverride = g0 + (g1 - g0) * i / 60; await waitReal(0.04); }
      await waitReal(1.5);
      for (let i = 30; i >= 0; i--) { hammerOverride = g0 + (g1 - g0) * i / 30; await waitReal(0.03); }
      hammerOverride = null;
    } },
  wiggle: { label: 'Wiggle the hammer, play it, and listen', specs: ['hammerSound'], view: 'hammer',
    run: async () => {
      await releaseKey(); sim.press(sim.dip, 250); await waitSim(0.3); sim.press(0, 60); await waitSim(0.3);
      const d = DAMAGE[sim.a.damage], play = m.hammerPlay > 0;
      toast(d ? `You notice ${d.signs}.` : play ? 'You notice play at the center pin, and a click on the blow.' : 'Solid on its center, no play, and quiet.', d || play ? 'warn' : '');
    } },
  pedalTest: { label: 'Pedal down, then let it go', specs: ['pedalLift', 'damperFall'], view: 'dampers', scale: 0.1, damper: true,
    run: async () => {
      await releaseKey();
      setPedal(true); await waitSim(0.25);
      const t0 = NOTES.map(n => n.sim.t);
      landed = new Map();
      setPedal(false); await waitSim(0.25); await waitReal(0.6);
      // report landing times for the notes that are in play
      const slots = multi() ? EXAM_ORDER : [cur];
      const ms = slots.map((slot, i) => landed.has(slot) ? Math.round(1000 * (landed.get(slot) - t0[slot])) : null);
      toast(slots.length > 1 ? `Dampers landed after ${ms.map((v, i) => `note ${i + 1}: ${v ?? '—'} ms`).join(', ')}` : `Damper landed after ${ms[0] ?? '—'} ms`);
      landed = null;
    } },
  dipBlock: { label: 'Dip block at the key front', specs: ['dip'], view: 'keyfront',
    run: async () => { await releaseKey(); sim.press(sim.dip, 12); await waitSim(1.4); await waitReal(1.2); await releaseKey(); } },
  slowPress: { label: 'Press slowly to the bottom', specs: ['letoff', 'drop', 'aftertouch'], view: 'hammer',
    run: async () => { await releaseKey(); sim.press(sim.dip, 6); await waitSim(2.2); await waitReal(1.2); } },
  strikeHold: { label: 'Strike and hold', specs: ['check'], view: 'backcheck', scale: 0.12,
    run: async () => { await releaseKey(); sim.press(sim.dip, 250); await waitSim(0.5); await waitReal(1); } },
  hammerLine: { label: 'Sight the hammer line', specs: ['blow'], view: 'hammerline', threeOnly: true,
    run: async () => { await releaseKey(); await waitReal(1.5); } },
  easeUp: { label: 'Strike, hold, then ease up', specs: ['spring'], view: 'hammer', scale: 0.25,
    run: async () => { await releaseKey(); sim.press(sim.dip, 250); await waitSim(0.4); await waitReal(0.6);
      sim.press(sim.dip - 1.2, 10); await waitSim(0.6); await waitReal(1); } },
  // side to side, sighted straight along the action through a slice of it
  sightJackFront: { label: 'Sight the jack from the front', specs: ['wippenSpacing'], view: 'jackfront', run: async () => { await releaseKey(); await waitReal(2); } },
  sightBackcheck: { label: 'Strike, hold, and sight the backcheck', specs: ['backcheckAlign'], view: 'checkfront',
    run: async () => { await releaseKey(); sim.press(sim.dip, 250); await waitSim(0.5); await waitReal(1.4); view('checktop'); await waitReal(1.8); view('checkfront'); } },
  // the key barely started down: does the hammer move with it?
  topPlay: { label: 'Press lightly at the top of the key', specs: ['lostMotion'], view: 'hammer',
    run: async () => {
      const to = Math.min(sim.dip, m.lostMotion + 0.8);
      await releaseKey(); sim.press(to, 2); await waitSim(to / 2 + 0.1); await waitReal(0.8);
      const lost = !gradeL('lostMotion', m).ok;
      say(lost ? `The key went down ${fmt(m.lostMotion)} before the hammer started up: lost motion` : 'The hammer started up the moment the key moved', lost ? 'warn' : '');
      await releaseKey();
    } },
  damperSight: { label: 'Sight the damper heads on their strings', specs: ['damperSeat'], view: 'damperline', damper: true,
    run: async () => { await releaseKey(); await waitReal(1.6); view('dampers'); await waitReal(1.6); } },
  // key bushings (not in the exam: its keys are given): rocked side to side at the front (the front rail bushing) and
  // twisted (the balance rail bushing), at rest and held down, as Steinway's guide checks them
  rockKey: { label: 'Rock the key at the front', specs: ['keyBushings'], view: 'keytop', noExam: true,
    run: async () => {
      await releaseKey(); await waitReal(0.6);
      const rock = async () => {
        const half = m.keyBushings / 2, tw = m.balPlay / KEY.balTwist / 2, lean = sim.a.keyLean;
        sim.keyRock = lean;
        for (const s of [-half, half, -half, half, lean]) await sway('keyRock', sim.keyRock, s);
        sim.keyTwist = 0;
        for (const t of [-tw, tw, -tw, tw, 0]) await sway('keyTwist', sim.keyTwist, t);
        sim.keyRock = sim.keyTwist = null;
      };
      const p = m.keyBushings, s = SPEC.keyBushings, bad = p < 0.05 || p > s.target + s.tol || m.balPlay < 0.05;
      const feel = `side to side, ${p < 0.05 ? 'no play: it binds on the front pin' : p > s.target + s.tol ? `a knock each way, about ${fmt(p)}` : `slight play, smooth (about ${fmt(p)})`}; `
        + `twisted, ${m.balPlay < 0.05 ? 'no play: it binds on the balance pin' : 'a little play at the balance pin'}`;
      await rock(); say(`At rest: ${feel}`, bad ? 'warn' : '');
      sim.press(sim.dip, 20); await waitSim(sim.dip / 20 + 0.15);
      await rock(); say(`Held down: ${feel}`, bad ? 'warn' : '');
      await waitReal(0.6);
      await releaseKey();
    } },
  // Don Dalton's check (PTG, 2022): stack off, lift the key, it should drop easily
  keyDrop: { label: 'Stack off: lift the key and let it drop', specs: ['keyBushings'], view: 'action', noExam: true,
    run: async () => {
      await releaseKey();
      const stack = on => NOTES.forEach(n => { n.sim.stackOff = on; });   // one stack over all the keys
      stack(true); sim.keyShown = 0; await waitReal(0.8);
      if (m.keyFall === 'hangs') { say('Let go, the key stays up: a tight bushing holds it', 'warn'); await waitReal(1.6); }
      else {
        await sway('keyShown', 0, sim.dip, Math.round(15 / m.keyFallShare));
        say(m.keyFall === 'slow' ? 'Let go, the key drops, but slowly: a bushing is tight' : 'Let go, the key drops freely', m.keyFall === 'slow' ? 'warn' : '');
        await waitReal(1);
      }
      sim.keyShown = null; stack(false);
    } },
  // ---------- action centers (research/wippen/spec.md §8.1): friction and side play, each read where a tech reads it ----------
  // the flange off its rail, held so the shank stands level, let go: count the half-swings (the Drills tab has it to watch)
  swingHammer: { label: 'Swing test: count the hammer\'s half-swings', specs: ['hammerCenter'], view: 'hammer',
    run: async () => {
      await releaseKey(); await waitReal(0.4);
      const n = m.swings, c = CENTERS.hammer, g = m.hammerCenter, [lo, hi] = c.band;
      say(`Flange off the rail, the shank held level and let go: ${n} half-swing${n === 1 ? '' : 's'}, about ${g.toFixed(1)} g on a gauge at ${c.at} mm${g > hi ? ': it stops too soon' : g < lo ? ': it swings on too long' : ''}`, g > hi || g < lo ? 'warn' : '');
      await waitReal(1.2);
    } },
  // Renner: hold the flange down, flex the shank sideways and watch the pin. The flange held, a loose flange screw can't show
  wobbleHammer: { label: 'Hold the flange, flex the shank sideways', specs: ['hammerCenter'], view: 'travel',
    run: async () => {
      await releaseKey(); await waitReal(0.8);   // let the view settle
      const p = m.hammerPlay;
      sim.hammerRock = 0;
      for (const s of [-p / 2, p / 2, -p / 2, p / 2, 0]) await sway('hammerRock', sim.hammerRock, s, 10);
      sim.hammerRock = null;
      say(p ? `The pin moves in its bushing: the head shifts about ${fmt(p)} side to side. Side play in the center`
        : adj.damage === 'looseFlange' ? 'Held down, the pin is solid in its bushing: the shift in the action is the flange screw, not the center'
        : 'The pin stays put in its bushing: no side play', p ? 'warn' : '');
      await waitReal(0.6);
    } },
  // Igrec's step 45: tilt the stack so the wippens hang, push one toward the shanks and let it go. It falls back by its
  // own weight; a slow one gets its flange gauged. The key isn't under it (drawn where it rests).
  wippenTilt: { label: 'Tilt the stack: lift the wippen, let it fall back', specs: ['wippenCenter'], view: 'rails', scale: 0.1,
    run: async () => {
      await releaseKey();
      sim.keyShown = 0;
      const up = sim.dip * 0.6;
      sim.press(up, 40); await waitSim(up / 40 + 0.05); await waitReal(0.3);
      if (m.wippenTilt === 'hangs') { say('Let go, the wippen stays up: its flange center is seized', 'warn'); await waitReal(1.2); }
      else {
        // it falls in a time that goes as one over the square root of its weight's pull less the friction
        const v = KEY.upSpeed * Math.sqrt(m.wippenShare), longer = 1 / Math.sqrt(m.wippenShare);
        sim.press(0, v); sim.lifting = true;   // (lifting: the key's own bushings have no part in it)
        await waitSim(up / v + 0.05);
        say(m.wippenTilt === 'slow' ? `Let go, the wippen comes back slowly, taking about ${longer.toFixed(1)} times as long as a free one: a tight flange center`
          : 'Let go, the wippen drops straight back', m.wippenTilt === 'slow' ? 'warn' : '');
        await waitReal(0.6);
      }
      sim.keyShown = null;
      await releaseKey();
    } },
  // Igrec: move the jack tender side to side; any looseness means repin the jack, the wippen flange, or both. Seen from the
  // front: the jack rocking on its own pin, or the whole wippen moving on its flange
  tenderPlay: { label: 'Wiggle the jack tender side to side', specs: ['jackCenter', 'wippenCenter'], view: 'jackfront',
    run: async () => {
      await releaseKey(); await waitReal(1.2);   // the slice view
      const field = m.jackPlay ? 'jackRock' : 'wippenRock', p = m.jackPlay || m.wippenPlay;
      sim[field] = 0;
      for (const s of [-p / 2, p / 2, -p / 2, p / 2, 0]) await sway(field, sim[field], s, 10);
      sim[field] = null;
      say(m.jackPlay ? 'The jack rocks on its center pin, the wippen still: side play in the jack center'
        : m.wippenPlay ? 'The whole wippen moves on its flange, the jack with it: side play in the wippen flange center'
        : 'Solid: no side play in the jack or the wippen flange', p ? 'warn' : '');
      await waitReal(0.6);
    } },
  // Don Mannino (2007, quoted by Jessica Masse, PTG 2023): the jack spring unhooked, the wippen held tender up, the jack should fall
  // slowly under its own weight. Drawn in place: the jack swings out from under the knuckle, the hammer on its lever.
  jackFall: { label: 'Spring unhooked: let the jack fall', specs: ['jackCenter'], view: 'escapement',
    run: async () => {
      await releaseKey();
      const p0 = sim.L.psiRest, f = m.jackFall;
      hammerOverride = Math.min(sim.g, solveG(repSupportZ(sim.a, sim.L))); jackOverride = p0; await waitReal(0.6);
      if (f !== 'stays') {
        // falling slowly, it eases out; a loose one drops and flops back and forth on its pin
        const n = f === 'flops' ? 8 : 40, path = f === 'flops' ? [0.14, 0.09, 0.13, 0.11, 0.12] : [0.12];
        let at = 0;
        for (const to of path) { for (let i = 1; i <= n; i++) { jackOverride = p0 + at + (to - at) * (1 - (1 - i / n) ** 2); await waitReal(0.025); } at = to; }
      }
      say(f === 'stays' ? 'The jack stays where it is: it won\'t fall under its own weight. A tight center'
        : f === 'flops' ? 'The jack drops at once and flops on its pin: a loose center' : 'The jack falls slowly under its own weight', f === 'slow' ? '' : 'warn');
      await waitReal(1);
      jackOverride = hammerOverride = null;
    } },
  // the repetition spring unhooked, a gram gauge at the drop screw's felt, pushed square to the lever (Igrec, Don Mannino)
  repGauge: { label: 'Spring unhooked: gauge the lever at the drop screw', specs: ['repCenter'], view: 'escapement',
    run: async () => {
      await releaseKey(); await waitReal(0.8);
      const r = gradeL('repCenter', m);
      say(`The gauge at the drop screw's felt, ${CENTERS.rep.at} mm from the pin, reads ${m.repCenter.toFixed(1)} g as the lever starts to move${r.note ? `: ${r.note}` : ''}`, r.ok ? '' : 'warn');
      await waitReal(1);
    } },
  // Renner: a damper underlever should fall from its own weight. Its wire's set screw loosened (Cecil Snyder, PTG 2022), the
  // head stays on the strings, so only the underlever's center is tried
  ulDrop: { label: 'Wire unhooked: lift the underlever and let it drop', specs: ['underCenter'], view: 'dampers', damper: true,
    run: async () => {
      await releaseKey(); await waitReal(0.4);
      await sway('ulShown', 0, 6, 12); await waitReal(0.4);
      if (m.ulDrop === 'hangs') say('Let go, the underlever stays up: its center is seized', 'warn');
      else {
        await sway('ulShown', 6, 0, Math.round(10 / Math.sqrt(m.ulShare)));
        say(m.ulDrop === 'slow' ? 'Let go, the underlever comes down slowly: a tight center' : 'Let go, the underlever falls from its own weight', m.ulDrop === 'slow' ? 'warn' : '');
      }
      await waitReal(0.8);
      sim.ulShown = null;
    } },
};
// move one of the key tests' drawn values (sim.keyRock, keyTwist, keyShown) from a to b over a few screen frames
const sway = async (field, a, b, steps = 8) => { for (let i = 1; i <= steps; i++) { sim[field] = a + (b - a) * i / steps; await waitReal(0.03); } };
const waitReal = s => new Promise(r => setTimeout(r, s * 1000));
let landed = null; // pedal test: when each note's damper seated
async function releaseKey() {
  if (sim.d > 0.001 || sim.st.checked) { sim.press(0, 60); await waitSim(0.35); }
  sim.reset();
}
function solveG(zKnuckle) {
  let lo = -0.6, hi = 0.7;
  for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (knuckleBottom(mid)[1] < zKnuckle) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}
let generation = 0; // bumped when the key or scenario changes under a running test
async function runTest(id) {
  const t = TESTS[id];
  if (busy) return;
  const gen = generation;
  clearPlan(); cue = null; recentWarn.clear();   // a test's own press stays down; its warnings always show
  setPaused(false);                     // a test runs the action itself
  releaseOthers();
  busy++;
  view(t.view);
  if (mode === 'diagnose' || examActive()) testsUsed++;
  forcedScale = t.scale ?? 1;
  refresh();
  try { await t.run(); } finally { busy--; forcedScale = null; }
  // sighting the hammer line shows every hammer's height at once
  if (gen === generation) (id === 'hammerLine' ? NOTES.map(n => n.tested) : [tested]).forEach(set => t.specs.forEach(s => set.add(s)));
  store();
  refresh();
}

// ---------- visibility of readings ----------
function revealed(id) {
  if (mode === 'sandbox' || level().live) return true;
  if (mode === 'learn') return tested.has(id);
  if (mode === 'exam') return tested.has(id) || exam.done;
  return tested.has(id) || gaveUp || (!!verdict && !verdict.bad.length);
}

// ---------- adjustments ----------
// rails that serve every note: one setting for all three on the exam model
const SHARED = new Set(['restRail', ...ADJ.filter(d => d.shared).map(d => d.id)]);
function setAdj(id, v) {
  clearFrames();   // frames played before the change can't be stepped back into
  const d = ADJ.find(x => x.id === id);
  adj[id] = Math.max(d.min, Math.min(d.max, v));
  sim.setAdj(adj);
  if (sim.d < 0.01 && !sim.st.checked) sim.reset();
  m = measure(adj);
  unsolve();
  store();
  // a neighbor's key held down (a chord) stays down, as this one does
  if (SHARED.has(id)) NOTES.forEach((n, i) => { if (i !== cur) {
    n.adj[id] = adj[id]; n.sim.setAdj(n.adj); if (n.sim.d < 0.01 && !n.sim.st.checked) n.sim.reset(); n.m = measure(n.adj);
  } });
  refresh();
}
// what each adjustment is for: the readings its card shows, so you see them move as you turn it
const KNOB_FOR = {
  balPunch: ['keyHeight'], frontPunch: ['dip', 'aftertouch'], capstan: ['blow', 'lostMotion', 'aftertouch'], restRail: ['restGap', 'lostMotion'],
  hammerTravel: ['hammerTravel'], hammerSpace: ['hammerSpacing'], hammerSquare: ['hammerSquare'],
  jackScrew: ['jackPos'], wippenSpace: ['wippenSpacing'], wippenTravel: ['wippenSpacing'], repStop: ['wink'], letoff: ['letoff'], drop: ['drop'], repSpring: ['spring'],
  backcheck: ['check'], backcheckSpace: ['backcheckAlign'], backcheckSquare: ['backcheckAlign'],
  damperGap: ['damperTiming'], damperStop: ['damperStop'], pedalLift: ['pedalLift'],
  damperDrag: ['damperFall'], damperCenter: ['damperSeat'], damperLevel: ['damperSeat'],
};
const SHORT = {
  keyBushings: 'Key bushings', keyHeight: 'Key height', dip: 'Dip', aftertouch: 'Aftertouch', blow: 'Blow', lostMotion: 'Lost motion', restGap: 'Rail gap',
  hammerTravel: 'Travel', hammerSpacing: 'Spacing', hammerSquare: 'Square', hammerSound: 'Solid on its center', jackPos: 'Jack position', wippenSpacing: 'Jack centered',
  wink: 'Wink', letoff: 'Let-off', drop: 'Drop', spring: 'Spring', check: 'Checking', backcheckAlign: 'Centered, square',
  damperTiming: 'Lift timing', damperStop: 'Stop rail', pedalLift: 'Pedal lift', damperFall: 'Fall', damperSeat: 'Seat',
  hammerCenter: 'Hammer center', wippenCenter: 'Wippen center', jackCenter: 'Jack center', repCenter: 'Rep lever center', underCenter: 'Underlever center',
};
// an unmeasured reading names its test, which may sit in another part of the action (aftertouch: the slow press)
const testFor = s => TESTS[Object.keys(TESTS).find(k => !TESTS[k].threeOnly && TESTS[k].specs.includes(s))]?.label;
function knobReadings(id) {
  const ids = KNOB_FOR[id] || [];
  return el('div', { class: 'sets small' }, el('span', { class: 'muted' }, 'Sets'), ids.map(s => {
    const show = revealed(s), r = show ? reading(s) : null;
    return el('span', { class: 'chip' + (show ? (r.ok ? ' ok' : ' bad') : '') }, el('span', { class: 'dot' }), `${SHORT[s]}: `,
      show ? r.txt : el('span', { class: 'muted' }, `not measured (${testFor(s)})`));
  }));
}
function knobButtons(id) {
  const d = ADJ.find(x => x.id === id);
  const btn = (sym, delta, step) => el('button', { class: 'nudge', title: `${sym} ${step}`, 'data-anchor': `${id}${sym}`, onclick: () => { S.highlight(d.part, cur); setAdj(id, adj[id] + delta); } },
    el('span', { class: 'sym' }, sym), el('span', { class: 'step' }, step));
  const coarse = d.steps[d.steps.length - 1], fine = d.steps[0];
  const two = d.steps.length > 1;
  return el('div', { class: 'knob-btns' },
    // a shim goes under one side or the other: the choice of side is the adjustment
    d.sides ? d.sides.map((s, i) => btn(`${s[0].toUpperCase()}${s.slice(1)} side`, i ? -fine : +fine, `${i ? 'right' : 'left'} from the keys · add ${d.stepLabel[0]}`)) :
    // a sideways move names the way it goes: the bass is on the left from the keys
    d.dirs ? [two ? btn('◀◀', +coarse, `${d.stepLabel[1]} toward the bass`) : null, btn('◀', +fine, `${d.stepLabel[0]} toward the bass`),
      btn('▶', -fine, `${d.stepLabel[0]} toward the treble`), two ? btn('▶▶', -coarse, `${d.stepLabel[1]} toward the treble`) : null] : [
      two ? btn('−−', -coarse, d.stepLabel[1]) : null,
      btn('−', -fine, d.stepLabel[0]),
      btn('+', +fine, d.stepLabel[0]),
      two ? btn('++', +coarse, d.stepLabel[1]) : null]);
}
// traveling paper: how many strips, under which side, and which way that moved the part
function paperTxt(d, net) {
  const side = d.sides[net > 0 ? 0 : 1];
  // a fault can leave the hammer drifting by any amount, so its paper is told in drift; the wippen's only moves by whole strips
  if (d.id !== 'wippenTravel') return `paper under the ${side} side: drifts ${Math.abs(net).toFixed(1)} mm toward the ${d.sides[net > 0 ? 1 : 0]}`;
  const n = Math.round(Math.abs(net) / d.steps[0]);
  return `${n} strip${n === 1 ? '' : 's'} behind the ${side} side: jack ${Math.abs(net).toFixed(2)} mm toward the ${side}`;
}
// where a knob sits now: the Sandbox says, and a shared rail says it is shared
function knobValue(id) {
  const d = ADJ.find(x => x.id === id), net = Math.round((adj[id] - FACTORY[id]) * 100) / 100 || 0;   // as shown: no "-0.00"
  const valTxt = mode !== 'sandbox' ? ''
    : d.sides ? (Math.abs(net) < 0.005 ? 'no paper' : paperTxt(d, net))
    : d.dirs ? (Math.abs(net) < 0.005 ? 'at factory' : `${Math.abs(net).toFixed(2)} mm toward the ${net > 0 ? 'bass' : 'treble'} from factory`)
    : d.unit === 'mm' || d.unit === '°' ? `${net >= 0 ? '+' : ''}${net.toFixed(2)}${d.unit === '°' ? '°' : ' mm'} from factory`
    : id === 'damperDrag' ? `drag ${adj[id].toFixed(2)}` : `${adj[id].toFixed(2)} × hammer weight`;
  return multi() && SHARED.has(id) ? [valTxt, 'shared by all three notes'].filter(Boolean).join(' · ') : valTxt;
}
function knobRow(id, { readings = false } = {}) {
  const d = ADJ.find(x => x.id === id);
  return el('div', { class: 'knob' },
    el('div', { class: 'knob-head' },
      el('button', { class: 'linkish', onclick: () => { S.highlight(d.part, cur); view(id === 'hammerTravel' ? 'travel' : viewFor(d.part)); } }, d.name),
      el('span', { class: 'muted small' }, knobValue(id))),
    knobButtons(id),
    readings ? knobReadings(id) : null,
    el('div', { class: 'muted small' }, d.how));
}
function viewFor(part) {
  return { balance: 'keyfront', frontpunch: 'keyfront', capstan: 'action', jackscrew: 'escapement', repscrew: 'escapement',
    restrail: 'rails', letoff: 'escapement', drop: 'escapement', repspring: 'escapement', backcheck: 'backcheck',
    damper: 'dampers', damperstop: 'dampers', lifttray: 'dampers', damperwire: 'dampers', flange: 'hammerline', shank: 'hammerline', wflange: 'jackfront' }[part] || 'action';
}

// ---------- measurement table ----------
function specTarget(id) {
  const s = SPEC[id];
  if (id === 'keyHeight') return mode === 'exam' ? `given: ${fmt(NEIGHBOR_H)}` : 'level with neighbors';
  if (id === 'dip' && mode === 'exam') return `given: ${fmt(SPEC.dip.target)}`;
  if (id === 'jackPos') return 'aligned';
  if (id === 'spring') return 'rises, no pop';
  if (id === 'damperTiming') return 'a third to half';
  if (id === 'hammerSquare') return 'square';
  if (id === 'hammerSound') return 'solid, quiet';
  if (id === 'hammerSpacing') return 'centered';
  if (id === 'hammerTravel') return 'straight';
  if (id === 'damperFall') return 'falls freely';
  if (id === 'wippenSpacing') return 'centered';
  if (id === 'backcheckAlign') return 'centered, square';
  if (id === 'lostMotion') return 'none';
  if (id === 'damperSeat') return 'centered, flat';
  if (id === 'keyBushings') return 'slight play, drops freely';
  if (s.center) { const c = CENTERS[s.center]; return `${c.band.map(g => +g.toFixed(1)).join(' to ')} g at ${c.at} mm${c.springOff ? ', spring off' : ''}`; }
  return fmt(s.target);
}
const side = v => Math.abs(v) < 0.05 ? 'centered' : `${fmt(Math.abs(v))} toward the ${v > 0 ? 'bass' : 'treble'}`;
function reading(id, mm = m) {
  const r = gradeL(id, mm);
  let txt;
  if (id === 'spring') txt = r.note;
  else if (id === 'damperTiming' && r.v != null) txt = `at ${Math.round(r.v * 100)}% of hammer travel`;
  else if (id === 'hammerSquare') txt = r.note ? r.note : Math.abs(r.v) < 0.25 ? 'square' : `${Math.abs(r.v).toFixed(1)}° out of square`;
  else if (id === 'hammerSound') txt = r.note;
  else if (id === 'hammerSpacing') txt = Math.abs(r.v) < 0.05 ? 'centered' : `${fmt(Math.abs(r.v))} toward the ${r.v > 0 ? 'bass' : 'treble'}`;
  else if (id === 'hammerTravel') txt = Math.abs(r.v) < 0.05 ? 'straight' : `drifts ${fmt(Math.abs(r.v))} toward the ${r.v > 0 ? 'treble' : 'bass'}`;
  else if (id === 'damperFall') txt = `${r.note} (lands in ${Math.round(mm.fallMs)} ms)`;
  else if (id === 'wippenSpacing') txt = side(r.v);
  else if (id === 'backcheckAlign') txt = `${side(r.v)}, ${Math.abs(mm.backcheckSquare) < 0.25 ? 'square' : `${Math.abs(mm.backcheckSquare).toFixed(1)}° out of square`}`;
  else if (id === 'lostMotion') txt = r.v < 0.01 ? 'none' : `${fmt(r.v)} of free play at the key`;
  else if (id === 'damperSeat') txt = `${side(r.v)}, ${Math.abs(mm.damperLevel) < 0.02 ? 'seated flat' : `${mm.damperLevel > 0 ? 'back' : 'front'} end ${fmt(Math.abs(mm.damperLevel))} up`}`;
  else if (id === 'keyBushings') txt = r.v < 0.05 ? r.note : `${fmt(r.v)} side play at the front` + (r.note ? ` · ${r.note}` : ', drops freely');
  // grams on the gauge at its distance (the hammer's swing count with it), and any side play
  else if (SPEC[id].center) txt = `${r.v.toFixed(1)} g at ${CENTERS[SPEC[id].center].at} mm` + (id === 'hammerCenter' ? `, ${mm.swings} half-swings` : '')
    + (r.note ? ` · ${r.note}` : '');
  else if (r.v == null) txt = r.note || '—';
  else if (id === 'keyHeight') txt = Math.abs(r.v) < 0.05 ? 'level' : `${fmt(Math.abs(r.v))} ${r.v > 0 ? 'high' : 'low'}`;
  else if (id === 'jackPos') txt = Math.abs(r.v) < 0.05 ? 'aligned' : `${fmt(Math.abs(r.v))} ${r.v > 0 ? 'too far back' : 'too far forward'}`;
  else txt = fmt(r.v) + (r.note ? ` · ${r.note}` : '');
  if (id !== 'spring' && r.note && (id === 'keyHeight' || id === 'jackPos')) txt += ` · ${r.note}`;
  return { ok: r.ok, txt };
}
function measureTable(ids, { head = true, short = false } = {}) {
  return el('table', { class: 'specs' + (head ? '' : ' bare') },
    head ? el('thead', {}, el('tr', {}, el('th', {}, 'Check'), el('th', {}, 'Target'), el('th', {}, 'Now'))) : null,
    el('tbody', {}, ids.map(id => {
      const show = revealed(id), r = reading(id);
      return el('tr', { class: show ? (r.ok ? 'ok' : 'bad') : '' },
        el('td', {}, el('span', { class: 'dot' }), short ? SHORT[id] || SPEC[id].name : SPEC[id].name),
        el('td', { class: 'muted' }, specTarget(id)),
        el('td', {}, show ? r.txt : el('span', { class: 'muted' }, 'not measured')));
    })));
}

// ---------- scenarios for diagnose mode ----------
const SCENARIOS = [
  { complaint: 'Soft notes on this key feel uneven and hard to control next to its neighbors.', faults: { letoff: +0.2 }, answer: 'Let-off set too close: the jack trips barely half a millimetre from the string. A hair closer and the hammer blocks against the string.' },
  { complaint: 'I can\'t play this note quietly, it either thumps or misses.', faults: { letoff: -1.0 }, answer: 'Let-off too far from the string.' },
  { complaint: 'The key feels shallow, and soft notes are hard to control.', faults: { frontPunch: +1.0 }, answer: 'Dip too shallow: too little aftertouch, so the jack barely escapes. The damper settings move with it and come right once dip is set.' },
  { complaint: 'The key feels deep and mushy at the bottom.', faults: { frontPunch: -0.8 }, answer: 'Dip too deep: too much aftertouch.' },
  { complaint: 'Played firmly, this note sometimes sounds twice, like a stutter.', faults: { frontPunch: +1.7 }, alone: true, answer: 'Dip far too shallow: the key bottoms before the jack can escape, so there is no let-off and no aftertouch. After the blow the hammer falls back onto the jack, bounces off it and strikes again (the double repeat Igrec warns of). The damper settings move with dip and come right once it is set.' },
  { complaint: 'Fast repeated notes and trills fail on this key.', faults: { repSpring: -0.6 }, answer: 'Repetition spring too weak.' },
  { complaint: 'There\'s a little bump in the key when I let it up slowly.', faults: { repSpring: +0.7 }, answer: 'Repetition spring too strong.' },
  { complaint: 'When I play loud and hold the key down, the hammer doesn\'t stay back: it bounces up and sits right under the string.', faults: { backcheck: -3.0 }, alone: true, answer: 'Backcheck bent too far back: it misses the tail, so nothing catches the hammer and it comes back up on the repetition lever.' },
  { complaint: 'There\'s free play at the top of the key and the tone is weak.', faults: { capstan: -0.4 }, answer: 'Capstan too low: the hammer rests on the rail, so the key moves before it lifts anything (lost motion), and the blow is too long.' },
  { complaint: 'The hammer on this key sits higher than its neighbors, and the key goes on down a long way after the note sounds.', faults: { capstan: +0.5 }, answer: 'Capstan too high: the blow is short, so aftertouch grows. Let-off doesn\'t move: the button still trips the jack at the same point. The jack position reading shifts a little with the hammer\'s height and comes right with the capstan.' },
  { complaint: 'This key sits higher than the others.', faults: { balPunch: +0.5 }, answer: 'Too many balance rail punchings: key too high (and the dip changed with it).' },
  { complaint: 'Soft repeated notes on this key feel draggy compared with its neighbors.', faults: { jackScrew: -1.4 }, answer: 'Jack set too far back under the knuckle: it drags as it escapes and is slow to get back under. Sight the back of the jack against the back of the knuckle core. Moving it shifts the hammer\'s height a little too, so blow and wink come right once it is back in place.' },
  { complaint: 'Soft notes on this key buzz, as if something is touching the string.', faults: { drop: +2.0 }, alone: true, answer: 'Drop screw too high: after let-off the repetition lever carries the hammer back up against the string on a soft blow.' },
  { complaint: 'Trills and fast repeated notes on this key feel unreliable.', faults: { repStop: -0.3 }, answer: 'Repetition lever too low: tripped at rest, the hammer drops so far that the jack can\'t get back under the knuckle. A strong spring can still throw the hammer up for it in play, which is why the wink test is how you find it. With the lever riding low, the hammer also drops further after let-off; that comes right with the lever.' },
  { complaint: 'The hammer on this key sits a little higher than its neighbors.', faults: { repStop: +0.25 }, answer: 'Repetition lever too high above the jack: it holds the hammer off the jack (no wink), so the hammer line is uneven.' },
  { complaint: 'Notes ring on after I let go, and the sustain pedal leaves a little smear.', faults: { damperDrag: +0.5 }, answer: 'A damper wire binding in its guide rail bushing: that damper falls late.' },
  { complaint: 'This note keeps ringing faintly after I let the key up, even without the pedal.', faults: { damperLevel: +0.6 }, answer: 'The damper head isn\'t seated: its back end sits up off the strings, so a string goes on ringing. Bend the wire, as seen from the side, until both ends sit with equal force.' },
  { complaint: 'One string of this note rings on after I let go.', faults: { damperCenter: +2.0 }, answer: 'The damper head sits off center on its unison, so its felt doesn\'t cover one string properly. Bend the top of the wire to center it.' },
  { complaint: 'The key feels heavier right at the top of the stroke than the ones next to it.', faults: { damperGap: -1.5 }, answer: 'The damper lifts too early: the key picks up the underlever before the hammer is a third of the way up. Lifting earlier also lifts it further, which eats the stop rail clearance and leaves the pedal short of the key lift: they come right once the timing is fixed.' },
  { complaint: 'There\'s a thump when I put the sustain pedal down.', faults: { pedalLift: +2 }, answer: 'Pedal lift too high: it drives the dampers into the stop rail.' },
  { complaint: 'This note sounds thinner than its neighbors, and there\'s a little click. The hammer looks a bit crooked.', faults: { damage: 'splitShank' }, alone: true,
    answer: 'A split hammer shank, not yet broken: it flexes on the blow (less power), clicks, and the head wobbles. Burning or traveling won\'t hold; replace the shank, then travel, space and square the new one.' },
  { complaint: 'There\'s a click in this note, and it doesn\'t seem to hit in the same place every time.', faults: { damage: 'looseFlange' }, alone: true,
    answer: 'A loose hammer flange screw: the hammer shifts sideways on its flange. Tighten it, then check the spacing.' },
  { complaint: 'A tick when I play this note, and it sounds a little duller than the others.', faults: { damage: 'looseHead' }, alone: true,
    answer: 'The hammer head is loose on its shank (a failed glue joint). Reglue it square.' },
  // action centers (research/wippen/spec.md §8.2): the symptoms here are what the sim shows; its tests find the center
  { complaint: 'Since the summer, soft repeated notes on this key feel a little sluggish next to its neighbors.', faults: { center: 'hammerTight' }, alone: true,
    answer: 'A tight hammer flange center: swing-tested, the hammer makes only 3 half-swings, about 7 g on a gauge at 23 mm (Renner: 2 to 5). In play it barely shows, which is why techs swing-test. The cloth is swollen, not worn: ease the bushing. Turning up the spring only covers it up.' },
  { complaint: 'There\'s a click in this note, and the hammer seems to move about.', faults: { center: 'hammerLoose' }, alone: true,
    answer: 'A loose hammer flange center: the pin is loose in its cloth. It swings on for 14 half-swings (1.5 g at 23 mm), and with the flange held down the pin moves in its bushing. The flange screw is tight, so it\'s the center: repin it with the next half size up.' },
  { complaint: 'This note clicks, and when I look inside its hammer looks a little loose sideways.', faults: { center: 'hammerWorn' }, alone: true,
    answer: 'A worn hammer flange bushing: its friction is fine (about 7 half-swings, 3 g), but with the flange held down the pin moves in its bushing, one side of the cloth worn. Repinning won\'t stop a wobble: rebush it (Renner).' },
  { complaint: 'Since the summer this key comes back up a little lazily, and quick repeated notes feel heavy.', faults: { center: 'wippenTight' }, alone: true,
    answer: 'A tight wippen flange center: tilted, the wippen falls back slowly, and it drags the key on its way up. The key drops freely with the stack off, so it isn\'t the key bushings. Ease the flange center (repinning works too).' },
  { complaint: 'There\'s a faint tick from inside the piano when I play this key.', faults: { center: 'wippenLoose' }, alone: true,
    answer: 'A loose wippen flange center: wiggled at the tender, the whole wippen moves on its flange, jack and all. Repin the wippen flange a half size up (Igrec).' },
  { complaint: 'Sometimes this note won\'t play again unless I let the key nearly all the way up.', faults: { center: 'jackTight' }, alone: true,
    answer: 'A tight jack center: the jack spring can barely push it back under the knuckle, so it gets back late on the way up, and tripped at rest it doesn\'t come back at all (the wink test says so). It isn\'t the repetition lever: with the spring unhooked the jack won\'t fall under its own weight. Ease it, or repin it (Steve Howard tries a center lubricant first, then repins).' },
  { complaint: 'Played softly, this note gives a little tick.', faults: { center: 'jackLoose' }, alone: true,
    answer: 'A loose jack center: wiggled at the tender, the jack rocks on its pin in the wippen, and with the spring unhooked it drops and flops. Repin the jack (Igrec).' },
  { complaint: 'Quick repeated notes feel a little slow on this key, as if the hammer were slow to come back up after a loud note.', faults: { center: 'repTight' }, alone: true,
    answer: 'A tight repetition lever center: with its spring unhooked the lever gauges 10 g at the drop screw (Igrec: 2 to 6 at 58 mm), and it brakes the spring\'s lift: the hammer rises from check about a fifth slower. The spring itself is fine: ease the center, don\'t strengthen the spring.' },
  { complaint: 'Soft repeated notes on this key aren\'t as even as on its neighbors.', faults: { center: 'repLoose' }, alone: true,
    answer: 'A repetition lever center too loose: about 1 g at the drop screw with the spring unhooked (Igrec: 2 to 6 at 58 mm). It is meant to be the tightest center in the wippen, a brake that steadies the lever (Igrec); below the low end the lever doesn\'t hold the knuckle steady for the jack to reset (Don Mannino). The gauge finds it; in play it shows only a little. Repin it a half size up.' },
  { complaint: 'After this humid summer, this note keeps ringing a little after I let the key go.', faults: { center: 'underTight' }, alone: true,
    answer: 'A tight damper underlever center: the damper falls late. The wire runs straight in its guide bushing; with its set screw loosened the underlever comes down slowly on its own. Ease the center (James Kelly repins a half size up and reams).' },
  { complaint: 'Sometimes this note doesn\'t play again unless I let the key all the way up.', faults: { damage: 'brokenJackSpring' }, alone: true,
    answer: 'A broken jack spring: nothing pushes the jack back under the knuckle until the key is fully up. Replace the spring.' },
  { complaint: 'It was regulated when we bought it eight years ago. Now there\'s a click at the top of the key, soft notes are hard to control, and it feels like it bottoms out.', faults: { wear: 0.8 }, alone: true,
    answer: 'Nothing was turned: eight years of playing packed down the felts and cloth. Blow grew, the hammer settled onto the rest rail (lost motion), and aftertouch shrank. The fix is a touch-up of the whole sequence.' },
  { complaint: 'This key wobbles from side to side, and it clicks when I play it.', faults: { bushing: 'frontWorn' }, alone: true,
    answer: 'A worn front rail bushing: the cloth in the key\'s front mortise has packed down, so the key knocks side to side on its front pin and clicks. Rebush the front mortise with new cloth sized to the pin; easing only makes it looser. Turning an oval front pin takes up a little play for a while, but it crushes the rail\'s wood.' },
  { complaint: 'Since the summer this key stays down after I play it, and I have to lift it back up.', faults: { bushing: 'frontTight' }, alone: true,
    answer: 'A tight front rail bushing: the cloth swelled in the humid months and grips the front pin, so the key has no side play and the action\'s weight can\'t bring it back up. Ease it with key easing pliers. Rebushing would work too, but the cloth is sound.' },
  { complaint: 'This key comes back up slowly, lazier than the ones next to it.', faults: { bushing: 'balTight' }, alone: true,
    answer: 'A tight balance rail bushing: the key still has its side play at the front, but twisted at its front it has none at the balance pin, and with the stack off it drops slowly. Ease the balance bushing with key easing pliers.' },
];
function newScenario() {
  const pool = [...SCENARIOS].sort(() => Math.random() - 0.5);
  const s = pool[0];
  scenario = { ...s, faults: { ...s.faults } };
  adj = { ...FACTORY };
  for (const [k, v] of Object.entries(scenario.faults)) adj[k] = typeof v === 'string' ? v : (adj[k] || 0) + v;
  // a second, quieter problem half the time
  if (!s.alone && Math.random() < 0.5) {
    const s2 = pool.find(p => !p.alone && !Object.keys(p.faults).some(k => k in s.faults));
    for (const [k, v] of Object.entries(s2.faults)) adj[k] += v;
    scenario.second = s2;
  }
  tested = new Set(); testsUsed = 0; verdict = null; checks = 0; gaveUp = false; hint = false;
  applyAdj();
  $('aside').scrollTop = 0;
}
const rnd = (lo, hi) => lo + Math.random() * (hi - lo), pm = x => rnd(-x, x);
function deregulated() {
  const a = { ...FACTORY };
  a.balPunch += pm(0.4); a.jackScrew += pm(1.2); a.repStop += rnd(-0.12, 0.3); a.capstan += pm(1.2);
  a.restRail += Math.random() < 0.5 ? rnd(-4, -2) : rnd(0.5, 2); a.frontPunch += pm(0.6);
  // rough let-off stays on the early side so dip can be set without blocking
  a.letoff += rnd(-1.0, 0.25);
  a.drop += pm(2.0); a.repSpring += rnd(-0.15, 0.25); a.backcheck += pm(2.3);   // short of missing or scraping
  a.damperGap += pm(1.5); a.damperStop += pm(1.2); a.pedalLift += pm(1.2);
  a.hammerTravel = pm(0.6); a.hammerSpace = pm(0.8); a.hammerSquare = pm(2.5);
  a.wippenSpace = pm(0.8); a.backcheckSpace = pm(1.0); a.backcheckSquare = pm(3); a.damperCenter = pm(1.0); a.damperLevel = pm(0.35);
  a.damperDrag = Math.random() < 0.4 ? rnd(0.3, 0.6) : FACTORY.damperDrag;
  return a;
}
function messUp() {
  adj = deregulated();
  // in Learn, one key in three also has a key bushing to ease or rebush, and one in four a center to ease, repin or rebush
  if (mode === 'learn' && Math.random() < 1 / 3) { const k = Object.keys(BUSHINGS); adj.bushing = k[Math.floor(Math.random() * k.length)]; }
  if (mode === 'learn' && Math.random() < 1 / 4) { const k = Object.keys(CENTER_FAULTS); adj.center = k[Math.floor(Math.random() * k.length)]; }
  applyAdj();
}
function applyAdj() { generation++; clearFrames(); sim.setAdj(adj); sim.reset(); m = measure(adj); store(); S.clearCallouts(); refresh(); }

// ---------- panel ----------
// append children, skipping the nulls left by conditionals
const put = (p, ...kids) => p.append(...kids.flat().filter(k => k != null));
// A click that redraws the panel or the part card keeps the button clicked where it was, under the pointer: readings
// above it change length as you adjust, and would otherwise push it up or down between clicks.
let pressed = null;
// (only for the redraw the click itself causes: forgotten once the click has been handled)
document.addEventListener('click', e => { pressed = e.target.closest?.('[data-anchor]') || null; setTimeout(() => { pressed = null; }); }, true);
function holdPressed(redraw) {
  const a = pressed?.isConnected ? pressed : null; pressed = null;
  if (!a) { redraw(); return; }
  const box = popEl.contains(a) ? popEl : $('aside'), key = a.dataset.anchor, top = a.getBoundingClientRect().top;
  redraw();
  const b = [...box.querySelectorAll('[data-anchor]')].find(x => x.dataset.anchor === key);
  if (!b) return;
  const moved = b.getBoundingClientRect().top - top;
  if (box !== popEl) { box.scrollTop += moved; return; }
  if (!pop) return;
  // the card moves; what the stage's edges stop it moving (no wind-up kept for later), it scrolls instead
  pop.shift -= moved; placePop();
  const left = b.getBoundingClientRect().top - top;
  pop.shift += left; popEl.scrollTop += left;
}
function refresh() { holdPressed(redraw); }
function redraw() {
  if (action === 'upright') {
    for (const b of document.querySelectorAll('.tab')) b.classList.toggle('on', b.dataset.mode === U.mode);
    const p = $('#mode');
    p.replaceChildren(); $('#actionbar').replaceChildren();
    if (showCredits) U.renderCredits(p, () => { showCredits = false; refresh(); }); else U.renderPanel(p);
    return;
  }
  for (const b of document.querySelectorAll('.tab')) b.classList.toggle('on', b.dataset.mode === mode);
  // the action's views and key buttons have nothing to work on while a tool is on the bench
  $('#views').style.display = $('#keydock').style.display = mode === 'tools' ? 'none' : '';
  // the measured distances drawn on the action: the Sandbox can hide them
  $('#dist-btn').hidden = mode !== 'sandbox';
  S.setCallouts(mode !== 'sandbox' || distancesOn);
  const p = $('#mode');
  p.replaceChildren(); $('#actionbar').replaceChildren();
  if (showCredits) renderCredits(p);
  else if (mode === 'learn') renderLearn(p);
  else if (mode === 'diagnose') renderDiagnose(p);
  else if (mode === 'exam') renderExam(p);
  else if (mode === 'drills') renderDrills(p);
  else if (mode === 'tools') renderTools(p);
  else renderSandbox(p);
  renderPop();
  $('#units').textContent = units === 'in' ? 'inches' : 'mm';
}
function testButton(id) {
  return el('button', { class: 'test', disabled: busy ? '' : false, 'data-anchor': `test:${id}`, onclick: () => runTest(id) }, '▶ ', TESTS[id].label);
}
const GRADED = STEPS.filter(s => !s.info);
// a step checks its own spec and any that go with it (the jack centered side to side with its position, say)
const stepSpecs = s => [s.spec, ...(s.also || [])];
const stepDone = s => stepSpecs(s).every(id => tested.has(id) && gradeL(id, m).ok);
function renderLearn(p) {
  const st = STEPS[stepIdx];
  const done = stepIdx >= STEPS.length;
  put(p, el('div', { class: 'steps' }, STEPS.map((s, i) =>
    el('button', { class: 'pip' + (s.info ? ' info' : '') + (i === stepIdx ? ' cur' : '') + (!s.info && stepDone(s) ? ' ok' : ''), title: s.title,
      onclick: () => { stepIdx = i; focusStep(); refresh(); } }, String(i + 1))),
    el('button', { class: 'pip' + (done ? ' cur' : ''), title: 'Final check', onclick: () => { stepIdx = STEPS.length; refresh(); } }, '✓')),
    // the key arrives knocked out of regulation (messUp), and nothing else on the page would say so
    done ? null : el('p', { class: 'muted small' }, 'This key starts out of regulation on purpose: every setting, hammer alignment included, is knocked a little off. Work through the steps to put it right; ✓ re-checks everything at the end.'));
  if (done) {
    GRADED.flatMap(stepSpecs).forEach(id => tested.add(id));
    const bad = GRADED.filter(s => !stepDone(s));
    put(p, el('h2', {}, 'Final check'),
      el('p', {}, bad.length ? 'Everything was re-measured. These are out of spec now (often because a later step moved them):' : 'Every measurement is in spec. That key is regulated.'),
      bad.length ? el('ul', {}, bad.map(s => el('li', {}, el('button', { class: 'linkish', onclick: () => { stepIdx = STEPS.indexOf(s); focusStep(); refresh(); } }, s.title)))) : null,
      measureTable(Object.keys(SPEC)),
      el('div', { class: 'row' }, el('button', { onclick: () => { stepIdx = 0; tested = new Set(); messUp(); focusStep(); } }, 'Start over with a new key')));
    return;
  }
  const nav = (okToGo) => el('div', { class: 'row' },
    el('button', { disabled: stepIdx === 0 ? '' : false, onclick: () => { stepIdx--; focusStep(); refresh(); } }, '← Back'),
    el('button', { class: okToGo ? 'primary' : '', onclick: () => { stepIdx++; focusStep(); refresh(); } }, okToGo ? 'Next step →' : 'Skip →'));
  const head = el('div', { class: 'muted small' }, `Step ${stepIdx + 1} of ${STEPS.length}${st.info ? ' · not in the sim' : ''}`);
  if (st.info) {
    put(p, head, el('h2', {}, st.title), el('p', {}, st.what), el('p', { class: 'muted' }, st.how), benchTips(st.id), nav(true));
    return;
  }
  const earlier = STEPS.slice(0, stepIdx).filter(s => !s.info).flatMap(stepSpecs);
  put(p, head,
    el('h2', {}, st.title),
    el('p', {}, st.what), el('p', { class: 'muted' }, st.how),
    st.note ? el('p', { class: 'note' }, st.note) : null,
    el('div', { class: 'row' }, (st.tests || [st.test]).map(testButton)),
    measureTable(stepSpecs(st)),
    el('div', { class: 'knobs' }, st.knobs.map(knobRow)),
    st.bushings ? bushingRepairs() : null,
    st.centers ? centerRepairs(st.centers) : null,
    benchTips(st.id ?? st.spec),
    nav(stepDone(st)),
    earlier.length ? el('details', {}, el('summary', {}, 'Earlier steps'), measureTable(earlier)) : null,
  );
}
// tips from working technicians for one step, each credited
const named = t => !t.forum || NAME_FORUM_POSTERS || NAMED_OK.has(t.who);
function tipLine(t) {
  const label = named(t) ? `${t.who}, ${t.src}` : t.src;
  return el('li', {}, t.text, ' ', el('span', { class: 'credit' }, '— ', t.url ? el('a', { href: t.url, target: '_blank', rel: 'noopener' }, label) : label));
}
function benchTips(key) {
  const tips = TIPS[key];
  if (!tips?.length) return null;
  return el('details', { class: 'bench', open: '' }, el('summary', {}, 'From the bench'), el('ul', {}, tips.map(tipLine)));
}
function renderCredits(p) {
  const all = Object.values(TIPS).flat();
  const people = [...new Set(all.filter(named).map(t => t.who))].sort();
  const forumCount = all.filter(t => !named(t)).length;
  put(p, el('h2', {}, 'From the bench: credits'),
    el('p', {}, 'Regulation is passed hand to hand. These tips and tools come from the technicians named here; thank you.'),
    TOOLS.length ? el('h3', {}, 'Tools') : null,
    TOOLS.length ? el('ul', {}, TOOLS.map(t => el('li', {}, el('b', {}, t.name), ` (${t.who}): ${t.what} `, t.url ? el('a', { href: t.url, target: '_blank', rel: 'noopener' }, 'link') : null))) : null,
    people.length ? el('h3', {}, 'Technicians') : null,
    people.length ? el('p', {}, people.join(' · ')) : null,
    forumCount ? el('p', { class: 'muted' }, `And ${forumCount} tips from members of PTG's Pianotech forum, credited by year until each has said they'd like their name here.`) : null,
    el('h3', {}, 'The action'),
    el('p', {}, 'The layout of every part is measured, not drawn by eye: M. C. Hirschkorn, ',
      el('a', { href: 'https://hdl.handle.net/10012/877', target: '_blank', rel: 'noopener' }, 'Dynamic Model of a Piano Action Mechanism'),
      ' (MASc thesis, University of Waterloo, 2004), a Boston GP-178 grand, note 52. The wippen, jack and repetition lever outlines follow Renner USA\'s dimensioned wippen drawing.'),
    el('div', { class: 'row' }, el('button', { onclick: () => { showCredits = false; refresh(); } }, '← Back')));
}
let showCredits = false;
function focusStep() {
  const st = STEPS[stepIdx];
  if (!st) return;
  if (st.info) { S.highlight([]); view('angle'); return; }
  const pins = Object.keys(CENTER_PART).filter(p => st.centers?.includes(CENTER_PART[p]));
  S.highlight([...st.knobs.map(k => ADJ.find(a => a.id === k).part), ...pins], cur);
  view(TESTS[st.test].view);
}
// repairs: a broken or loose part can only be fixed, not regulated around
function repairs() {
  return el('details', {}, el('summary', {}, 'Repairs'),
    el('p', { class: 'muted small' }, 'For a part that is broken or loose. Regulation can\'t fix these.'),
    el('div', { class: 'tests' }, Object.entries(DAMAGE).map(([key, d]) => el('button', { class: 'test', disabled: busy ? '' : false, onclick: () => {
      if (adj.damage !== key) { if (mode === 'diagnose' || examActive()) testsUsed++; toast(`${d.repair}: nothing wrong there, so nothing changed.`); refresh(); return; }
      adj.damage = null; clearFrames();
      unsolve();
      // a new shank arrives untraveled and unspaced
      if (key === 'splitShank') {
        Object.assign(adj, { hammerTravel: pm(0.6), hammerSpace: pm(0.6), hammerSquare: pm(2) });
        ['hammerTravel', 'hammerSpacing', 'hammerSquare'].forEach(s => tested.delete(s));
      }
      toast(`${d.repair}: done.`);
      sim.setAdj(adj); sim.reset(); m = measure(adj); store(); refresh();
    } }, d.repair))));
}
// key bushings are eased or rebushed, never regulated; the wrong one says why it didn't help
const BUSHING_FIXES = {
  easeFront: { label: 'Ease the front rail bushing', fixes: { frontTight: 'Eased with key easing pliers: the key has its play again and drops freely.' },
    wrong: { frontWorn: 'Easing a worn bushing only makes it looser: this one needs new cloth.', balTight: 'The front bushing already has its play: easing it would only make it sloppy.' } },
  rebushFront: { label: 'Rebush the front rail mortise', fixes: { frontWorn: 'Rebushed: new cloth sized to the pin, and the key has slight play again.',
    frontTight: 'Rebushed, and it works, but the cloth was sound, only swollen: key easing pliers would have done it in a minute.' } },
  easeBal: { label: 'Ease the balance rail bushing', fixes: { balTight: 'Eased: the key has a little play at its balance pin and drops freely.' },
    wrong: { frontTight: 'The balance bushing already has its play: the key binds at the front.' } },
};
function bushingChanged() { generation++; clearFrames(); sim.setAdj(adj); sim.reset(); m = measure(adj); store(); refresh(); }
function bushingRepairs() {
  return el('div', {}, el('p', { class: 'muted small' }, 'Key bushings: eased or rebushed, not regulated.'),
    el('div', { class: 'tests' }, Object.values(BUSHING_FIXES).map(f => el('button', { class: 'test', disabled: busy ? '' : false, onclick: () => {
      const msg = f.fixes[adj.bushing];
      if (!msg) {
        if (mode === 'diagnose') testsUsed++;
        toast(f.wrong?.[adj.bushing] || `${f.label}: nothing wrong there, so nothing changed.`); refresh(); return;
      }
      adj.bushing = null; unsolve(); toast(msg); bushingChanged();
    } }, f.label))));
}
const damageLabel = k => ({ splitShank: 'Split shank', looseFlange: 'Loose flange screw', looseHead: 'Loose hammer head',
  brokenJackSpring: 'Broken jack spring' })[k];
// action centers are eased, repinned or rebushed (research/wippen/spec.md §8.3), never regulated: ease a tight one whose
// cloth is firm, repin a loose one in sound cloth with the next half size up, rebush one that wobbles with its friction
// right. The others work on a tight or loose center too, at more cost; the wrong one says why it didn't help.
const CENTER_FIXES = {
  ease: { label: 'Ease', fixes: { tight: 'Eased: the bushing burnished and lightly reamed, and it swings freely again.' },
    wrong: { loose: 'Easing a loose center only makes it looser: it needs a bigger pin.', worn: 'Easing a worn bushing only makes it looser: it needs new cloth.' } },
  repin: { label: 'Repin', fixes: { loose: 'Repinned with the next half size up, snug in the birdseye, the bushing sized to the spec.',
    tight: 'Repinned with a new polished pin and the bushing sized: it works, though easing would have done it with the cloth this firm.' },
    wrong: { worn: 'Repinned: the friction is right again, but it still wobbles. One side of the cloth is worn: rebush it.' } },
  rebush: { label: 'Rebush', fixes: { worn: 'Rebushed: new cloth pulled through, sized with a new pin, trimmed and burnished. No side play.',
    tight: 'Rebushed, and it works, but the cloth was sound, only swollen: easing it would have taken a minute.',
    loose: 'Rebushed, and it works, but the cloth was sound: a pin a half size up would have done it.' } },
};
function centerRepairs(ids, { fold = false } = {}) {
  const f = CENTER_FAULTS[adj.center];
  const rows = ids.filter(id => id !== 'under' || !examActive() || exam.dampers).map(id => el('div', { class: 'row small' },
    el('span', { class: 'grow' }, CENTERS[id].name),
    Object.values(CENTER_FIXES).map(fx => el('button', { class: 'test', disabled: busy ? '' : false, onclick: () => {
      const kind = f?.center === id ? f.kind : null, msg = kind && fx.fixes[kind];
      if (!msg) {
        if (mode === 'diagnose' || examActive()) testsUsed++;
        toast(kind ? fx.wrong[kind] : `${fx.label}: nothing wrong with the ${CENTERS[id].name.toLowerCase()}, so nothing changed.`); refresh(); return;
      }
      adj.center = null; unsolve(); toast(msg); bushingChanged();
    } }, fx.label))));
  const body = [el('p', { class: 'muted small' }, 'Action centers: eased, repinned or rebushed, not regulated.'), rows];
  return fold ? el('details', {}, el('summary', {}, 'Center repairs'), ...body) : el('div', {}, ...body);
}
// Find the fault, Sandbox and Exam work part by part: each part of the action with its tests, readings and adjustments together
// (hammerLine shows only with three notes, the exam's or the Sandbox's, where there are three hammers to sight)
const AREAS = [
  { id: 'key', name: 'Key', tests: ['straightedge', 'dipBlock', 'rockKey', 'keyDrop'], knobs: ['balPunch', 'frontPunch'], repairs: bushingRepairs },
  { id: 'hammer', name: 'Hammer, blow and rest rail', tests: ['travelLift', 'alignSight', 'wiggle', 'blowGauge', 'hammerLine', 'restRail', 'topPlay'],
    knobs: ['hammerTravel', 'hammerSpace', 'hammerSquare', 'capstan', 'restRail'] },
  { id: 'jack', name: 'Jack and repetition lever', tests: ['sightJack', 'sightJackFront', 'wink', 'slowPress', 'easeUp'],
    knobs: ['jackScrew', 'wippenSpace', 'wippenTravel', 'repStop', 'letoff', 'drop', 'repSpring'] },
  { id: 'backcheck', name: 'Backcheck', tests: ['strikeHold', 'sightBackcheck'], knobs: ['backcheck', 'backcheckSpace', 'backcheckSquare'] },
  { id: 'dampers', name: 'Dampers and pedal', tests: ['damperSlow', 'pedalTest', 'damperSight'],
    knobs: ['damperGap', 'damperStop', 'pedalLift', 'damperDrag', 'damperCenter', 'damperLevel'] },
  { id: 'centers', name: 'Action centers', tests: ['swingHammer', 'wobbleHammer', 'wippenTilt', 'tenderPlay', 'jackFall', 'repGauge', 'ulDrop'],
    knobs: [], repairs: () => centerRepairs(Object.keys(CENTERS)) },
];
// open sections survive the panel being redrawn
const openFolds = new Set(['how']);
const fold = (key, summary, ...kids) => el('details', { class: 'fold', open: openFolds.has(key) ? '' : false,
  ontoggle: e => { e.target.open ? openFolds.add(key) : openFolds.delete(key); } }, el('summary', {}, summary), el('div', { class: 'fold-body' }, ...kids));
const testOk = t => (!TESTS[t].threeOnly || multi()) && !(TESTS[t].noExam && examActive()) && (!TESTS[t].damper || !examActive() || exam.dampers);
// Which adjustment sets which reading is part of what's being learned: past Apprentice, Find the fault and the Exam don't
// list the adjustments; you click the part of the action you'd turn, and its controls come up beside it (the part card)
const panelKnobs = () => mode === 'sandbox' || mode === 'learn' || level().live;
function areaPanel(a) {
  const tests = a.tests.filter(testOk);
  const specs = [...new Set(tests.flatMap(t => TESTS[t].specs))];
  const shown = specs.filter(revealed), out = shown.filter(id => !gradeL(id, m).ok);
  const status = out.length ? el('span', { class: 'badc small' }, `${out.length} out of spec`)
    : shown.length === specs.length ? el('span', { class: 'okc small' }, 'all in spec')
    : el('span', { class: 'muted small' }, shown.length ? `${shown.length} of ${specs.length} measured` : 'not measured');
  // each knob goes under the first test that reads what it sets: run the test, and what you turn is right under it
  const knobs = panelKnobs() ? a.knobs : [], placed = new Set();
  const under = t => knobs.filter(k => !placed.has(k) && (KNOB_FOR[k] || []).some(s => TESTS[t].specs.includes(s)) && placed.add(k));
  const blocks = tests.map(t => {
    const ks = under(t);
    return el('div', { class: 'testblock' }, testButton(t), measureTable(TESTS[t].specs, { head: false }),
      ks.length ? el('div', { class: 'knobs' }, ks.map(id => knobRow(id, { readings: true }))) : null);
  });
  const rest = knobs.filter(k => !placed.has(k));
  return fold(a.id, [el('span', { class: 'grow' }, a.name), status],
    blocks,
    rest.length ? el('div', { class: 'knobs' }, rest.map(id => knobRow(id, { readings: true }))) : null,
    panelKnobs() ? null : el('p', { class: 'muted small' }, 'To adjust, click the part of the action you would turn.'),
    examActive() ? null : a.repairs?.());
}
// ---------- the part card: click a part of the action to test or adjust it ----------
// A test sits on the part you'd touch or watch to do it. The key itself plays when clicked, so its tests sit on the rails
// and punchings it rests on.
const KEY_TESTS = ['straightedge', 'dipBlock', 'rockKey', 'keyDrop', 'topPlay'];
const HAMMER_TESTS = ['travelLift', 'alignSight', 'wiggle'];
const PART_TESTS = {
  frontrail: KEY_TESTS, frontpunch: KEY_TESTS, balance: KEY_TESTS, balrail: KEY_TESTS, backrail: ['keyDrop'], keybed: ['keyDrop'], neighbor: ['straightedge'],
  capstan: ['topPlay'], heel: ['topPlay'],
  hammer: ['blowGauge', 'hammerLine', 'slowPress', ...HAMMER_TESTS], shank: HAMMER_TESTS, flange: HAMMER_TESTS, flangescrew: HAMMER_TESTS,
  hcenter: ['swingHammer', 'wobbleHammer', 'wiggle'], flangerail: ['travelLift'], string: ['slowPress', 'alignSight', 'hammerLine'], tail: ['strikeHold', 'sightBackcheck'],
  restrail: ['restRail', 'topPlay'],
  jack: ['sightJack', 'wink', 'sightJackFront'], tender: ['wink', 'slowPress', 'tenderPlay'], jcenter: ['jackFall', 'tenderPlay', 'wink'], knuckle: ['sightJack'], knucklecore: ['sightJack'],
  jackscrew: ['sightJack'], jackstop: ['wink'], windowfelt: ['wink'],
  rep: ['wink', 'easeUp'], repscrew: ['wink'], repbutton: ['wink'], support: ['wink'], rcenter: ['repGauge', 'easeUp'], repspring: ['easeUp'],
  letoff: ['slowPress'], regrail: ['slowPress'], drop: ['slowPress'], dropfelt: ['slowPress', 'repGauge'],
  wippen: ['sightJackFront', 'wippenTilt'], wflange: ['sightJackFront'], wcenter: ['wippenTilt', 'tenderPlay'], wippenrail: ['sightJackFront'],
  backcheck: ['strikeHold', 'sightBackcheck'],
  damper: ['damperSight', 'damperSlow', 'pedalTest'], damperfelt: ['damperSight'], damperwire: ['damperSight', 'pedalTest'], guiderail: ['pedalTest'],
  underlever: ['damperSlow', 'ulDrop'], ulflange: ['damperSlow'], ucenter: ['ulDrop', 'damperSlow'], damperstop: ['damperSlow'], lifttray: ['pedalTest'],
};
// the center pins: their cards carry that center's repairs
const CENTER_PART = { hcenter: 'hammer', wcenter: 'wippen', jcenter: 'jack', rcenter: 'rep', ucenter: 'under' };
// parts that carry another part's adjustment: the flange screw spaces the flange, the rails carry their punchings, the
// repetition lever's height is set by its screw, the underlever's top flange times the damper, the wippen spaces on its flange
const KNOB_PART = { flangescrew: 'flange', frontrail: 'frontpunch', balrail: 'balance', dropfelt: 'drop', rep: 'repscrew',
  ulflange: 'damper', underlever: 'damper', damperfelt: 'damper', wippen: 'wflange' };
let pop = null;   // the open card: { part, obj, local } (the spot clicked, pinned to the part), and last: where it was drawn
const popEl = $('#partpop'), popDot = $('#popdot');
const popKnobs = part => ADJ.filter(d => d.part === (KNOB_PART[part] || part) && !(examActive() && !exam.dampers && DAMPER_KNOBS.includes(d.id))).map(d => d.id);
function openPop(hit) {
  pop = { part: hit.part, obj: hit.obj, local: hit.local, h0: null, shift: 0 };
  S.highlight(KNOB_PART[hit.part] || hit.part, cur);
  renderPop();
}
function closePop() { if (!pop) return; pop = null; popEl.hidden = popDot.hidden = true; S.highlight(null); }
function renderPop() {
  if (!pop) return;
  if (mode === 'tools' || mode === 'drills' || exam.done) { closePop(); return; }
  const tests = (PART_TESTS[pop.part] || []).filter(testOk), knobs = popKnobs(pop.part);
  const full = S.PART_NAMES[pop.part] || pop.part, colon = full.indexOf(':');
  const name = colon < 0 ? full : full.slice(0, colon), about = colon < 0 ? '' : full.slice(colon + 1).trim();
  // the readings its tests take, and (where the panel lists what sets what) the ones its adjustments set, once measured
  const specs = [...new Set([...tests.flatMap(t => TESTS[t].specs), ...(panelKnobs() ? knobs.flatMap(k => KNOB_FOR[k] || []).filter(revealed) : [])])];
  popEl.replaceChildren(...[
    el('div', { class: 'pop-head' }, el('b', { class: 'grow' }, name),
      el('button', { class: 'pop-x', title: 'Close', 'aria-label': 'Close', onclick: closePop }, '×')),
    about ? el('div', { class: 'muted small' }, about[0].toUpperCase() + about.slice(1)) : null,
    tests.length ? el('div', { class: 'tests' }, tests.map(testButton)) : null,
    specs.length ? measureTable(specs, { head: false, short: true }) : null,
    ...knobs.map(id => {
      const v = knobValue(id);
      return el('div', { class: 'pop-knob' }, el('div', { class: 'small' }, el('b', {}, ADJ.find(x => x.id === id).name), v ? el('span', { class: 'muted' }, ` · ${v}`) : null),
        knobButtons(id));
    }),
    CENTER_PART[pop.part] ? centerRepairs([CENTER_PART[pop.part]]) : null,
    tests.length || knobs.length || CENTER_PART[pop.part] ? null : el('div', { class: 'muted small' }, 'Nothing to test or adjust on this part.')].filter(Boolean));
  popEl.hidden = false;
  placePop();
}
// every screen frame: beside the spot clicked, on whichever side has room, clear of the view buttons and the key buttons
function placePop() {
  if (!pop || popEl.hidden) return;
  const at = S.screenOf(pop.obj, pop.local), stage = $('#stage');
  popDot.hidden = !at.on;
  if (at.on) { popDot.style.transform = `translate(${at.x}px, ${at.y}px)`; pop.last = at; }
  const p = at.on || !pop.last ? at : pop.last;
  const W = stage.clientWidth, top0 = $('#views').offsetHeight + 16, bottom = stage.clientHeight - $('#keydock').offsetHeight - 16;
  const mh = `${Math.max(140, bottom - top0)}px`;
  if (popEl.style.maxHeight !== mh) popEl.style.maxHeight = mh;
  const w = popEl.offsetWidth, h = popEl.offsetHeight, gap = 22;
  pop.h0 ??= h;   // centered on the spot as it first opened: readings that change length afterwards don't re-center it
  const x = Math.max(8, Math.min(W - w - 8, p.x + gap + w <= W - 100 ? p.x + gap : p.x - gap - w));
  const y = Math.max(top0, Math.min(bottom - h, p.y - pop.h0 / 2 + pop.shift));
  popEl.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  popEl.classList.toggle('busy', !!busy);   // faded while a test runs, so the action shows through
}
popEl.addEventListener('pointerenter', () => { tip.hidden = true; });
const howTo = () => el('ol', { class: 'how' },
  el('li', {}, el('b', {}, 'Test. '), 'Open a part of the action below and run its tests (▶). The action shows each test, and its readings fill in.',
    level().live ? ' At Apprentice level every reading shows from the start.' : ''),
  el('li', {}, el('b', {}, 'Adjust. '), 'Click the part of the action you would turn (a screw, a spring, a punching): its − and + come up beside it, with the readings, and they change as you turn it.',
    panelKnobs() ? ' At this level each test here also lists what sets it.' : ''),
  el('li', {}, el('b', {}, 'Check. '), 'Play the key to try it, then press ', el('b', {}, 'Check my work'),
    ' at the bottom. You are told which checks are still out, but not why, until it is right or you ask for the answer.'));
// a solved verdict no longer holds once anything is turned again
const unsolve = () => { if (verdict && !verdict.bad.length) verdict = null; };
function checkWork() {
  checks++;
  verdict = { bad: Object.keys(SPEC).filter(id => !gradeL(id, m).ok) };
  refresh();
  // the list sits at the top: go there the first time and when it's right; after that, don't pull you out of the part you're in
  if (checks === 1 || !verdict.bad.length) $('#verdict')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  else toast(`Still out: ${verdict.bad.map(id => SHORT[id] || SPEC[id].name).join(', ')}`, 'warn');
}
function renderDiagnose(p) {
  if (!scenario) {
    put(p, el('h2', {}, 'Find the fault'),
      el('p', {}, 'A customer describes a problem with one key. Find what is out of regulation and put it right.'),
      howTo(),
      el('div', { class: 'row' }, el('button', { class: 'primary', onclick: newScenario }, 'Next customer')));
    return;
  }
  const solved = !!verdict && !verdict.bad.length;
  const answer = () => el('p', {}, el('b', {}, 'What was wrong: '), scenario.answer, scenario.second ? ` Also: ${scenario.second.answer}` : '');
  const hintBad = Object.keys(SPEC).filter(id => !gradeL(id, m).ok).map(id => SPEC[id].name);
  put(p, el('div', { class: 'complaint' }, el('div', { class: 'muted small' }, 'The customer says'), el('p', {}, `“${scenario.complaint}”`)),
    verdict ? el('div', { class: 'verdict ' + (solved ? 'ok' : 'bad'), id: 'verdict' },
      el('h3', {}, solved ? 'Regulated. Nice work.' : `Last check: ${verdict.bad.length} still out of spec`),
      solved ? null : el('ul', { class: 'small' }, verdict.bad.map(id => el('li', {}, SPEC[id].name))),
      solved || gaveUp ? answer() : null,
      el('p', { class: 'muted small' }, `${testsUsed} test${testsUsed === 1 ? '' : 's'} run, checked ${checks} time${checks === 1 ? '' : 's'}.`),
      el('div', { class: 'row' }, solved || gaveUp ? el('button', { class: solved ? 'primary' : '', onclick: newScenario }, 'Next customer')
        : el('button', { onclick: () => { gaveUp = true; refresh(); } }, 'Show what was wrong'))) : null,
    hint && level().hints && !solved ? el('p', { class: 'note' }, 'Hint: look at ', hintBad.join('; ') || 'nothing: it looks regulated', '.') : null,
    solved ? null : fold('how', 'How it works', howTo()),
    AREAS.map(areaPanel),
    repairs());
  // the bar is the panel's last child, so it can stay pinned to the bottom edge
  put($('#actionbar'),
      el('span', { class: 'muted small grow' }, `Tests run: ${testsUsed}`),
      level().hints && !hint && !solved ? el('button', { onclick: () => { hint = true; refresh(); } }, 'Hint') : null,
      solved ? el('button', { class: 'primary', onclick: newScenario }, 'Next customer')
        : el('button', { class: 'primary', onclick: checkWork }, checks ? 'Check again' : 'Check my work'));
}
// felt and cloth packing down with playing: punchings, back rail cloth, wippen heel,
// knuckle, hammer felt, button felts, backcheck felt, and a tiring repetition spring (one piano: all three keys wear alike)
function wearControl() {
  const yrs = Math.round((adj.wear || 0) * 10);
  return el('div', { class: 'wear' },
    el('div', { class: 'knob-head' }, el('b', {}, 'Felt & cloth wear'), el('span', { class: 'muted small' }, yrs ? `about ${yrs} year${yrs > 1 ? 's' : ''} of daily playing` : 'new felt')),
    el('input', { type: 'range', min: 0, max: 10, step: 1, value: yrs,
      oninput: e => { const y = +e.target.value; e.target.closest('.wear').querySelector('.muted').textContent = y ? `about ${y} year${y > 1 ? 's' : ''} of daily playing` : 'new felt'; },
      onchange: e => {
        const w = +e.target.value / 10;
        if (multi()) NOTES.forEach((n, i) => { if (i !== cur) putNote(n, { ...n.adj, wear: w }); });
        adj.wear = w; applyAdj();
      } }),
    el('div', { class: 'muted small' }, 'Punchings, cloth, cushions, knuckles and hammer felt pack down. Watch blow, lost motion and aftertouch drift, then regulate it back.'));
}
// ---------- tool bag ----------
// Real regulation tools, modeled from supply-house photos and listings, shown one at a time on the bench.
let toolSel = null;
const stepTitle = id => STEPS.find(s => s.spec === id || s.id === id)?.title;
function renderTools(p) {
  const t = TOOLBAG.find(x => x.id === toolSel);
  put(p, el('h2', {}, 'Tool bag'),
    el('p', { class: 'muted' }, 'Regulating tools and what they do. Pick one to see it on the bench; drag to turn it. Grid squares are 10 mm.'),
    el('div', { class: 'toolgrid' }, TOOLBAG.map(x => el('button', { class: 'toolbtn' + (x.id === toolSel ? ' on' : ''), onclick: () => pickTool(x.id) }, x.name))),
    t ? el('div', { class: 'toolcard' },
      el('h3', {}, t.name),
      el('p', {}, t.what),
      t.how?.length ? el('ol', {}, t.how.map(h => el('li', {}, h))) : null,
      t.dims ? el('p', { class: 'muted small' }, el('b', {}, 'Dimensions: '), t.dims) : null,
      t.steps?.filter(stepTitle).length ? el('p', { class: 'small' }, 'Used in: ', t.steps.filter(stepTitle).flatMap((id, i) => [i ? ', ' : '',
        el('button', { class: 'linkish', onclick: () => { goLearn(id); } }, stepTitle(id))])) : null,
      t.credit ? el('p', { class: 'credit' }, t.credit) : null) : null,
    el('p', { class: 'muted small' }, 'Models of real regulation tools, added a few at a time.'));
}
async function pickTool(id) {
  const t = TOOLBAG.find(x => x.id === id);
  S.clearCallouts();
  try { await S.showTool(t.build(), { upAxis: t.upAxis, lengthAxis: t.lengthAxis }); toolSel = id; }
  catch { toast('Could not load that model.', 'warn'); }
  refresh();
}
function goLearn(id) {
  $('.tab[data-mode=learn]').click();
  const i = STEPS.findIndex(s => s.spec === id || s.id === id);
  if (i >= 0) { stepIdx = i; focusStep(); refresh(); }
}

// bench drills keep their own animation; mount them once per visit to the tab
let drillsEl = null, drillsStop = null;
function renderDrills(p) {
  if (!drillsEl) {
    drillsEl = el('div');
    put(drillsEl, el('h2', {}, 'Bench drills'),
      el('p', { class: 'muted' }, 'Quick checks you do by eye and feel at the bench. More to come.'));
    const swing = el('div', { class: 'drill' });
    drillsStop = mountSwingDrill(swing, { el, toast });
    drillsEl.append(swing);
  }
  p.append(drillsEl);
}
// ---------- sandbox ----------
// One key, or three neighbors on the same rails (the exam's three notes), to see the dampers lift and land together
let threeKeys = false;
const sharedOf = a => Object.fromEntries([...SHARED].map(k => [k, a[k]]));
function putNote(n, a) { n.adj = a; n.sim.setAdj(a); n.sim.reset(); n.m = measure(a); n.tested = new Set(); }
function setThreeKeys(on) {
  if (on === threeKeys || busy) return;
  setLoop(false); clearPlan(); clearFrames(); closePop();
  NOTES.forEach(n => { if (n.sim.dTarget > 0) n.sim.press(0, 60); });
  store();
  // the neighbors start regulated, on the middle note's rails and as worn as it is
  const a0 = NOTES[0].adj;
  for (const i of [1, 2]) putNote(NOTES[i], on ? { ...FACTORY, wear: a0.wear || 0, ...sharedOf(a0) } : { ...FACTORY });
  threeKeys = on; cur = 0;
  ({ adj, sim, m, tested } = NOTES[0]);
  S.setNoteCount(on ? 3 : 1); S.clearCallouts();
  view(on ? 'damperrow' : viewNow === 'damperrow' ? 'dampers' : viewNow);   // the row of three has no button of its own
  refresh();
}
// all three keys at once: a blow comes back up as Play's does; a slow press stays down until Let key up
function chord(slow) {
  if (busy) return;
  setLoop(false); clearPlan(); cue = null;
  NOTES.forEach(n => n.sim.press(n.sim.dip, slow ? 6 : 250));
  if (!slow) { plan = 'all'; planAt = null; }
  pausedNote();
}
// as worn as before, like Factory regulation; with three keys each knocked out on its own, the rails they share set once
function messUpSandbox() {
  const rails = sharedOf(deregulated()), w = adj.wear || 0;
  const one = () => ({ ...deregulated(), wear: w, ...rails });
  if (multi()) NOTES.forEach((n, i) => { if (i !== cur) putNote(n, one()); });
  adj = one(); applyAdj();
}
function factoryAll() {
  const w = adj.wear || 0;
  if (multi()) NOTES.forEach((n, i) => { if (i !== cur) putNote(n, { ...FACTORY, wear: w }); });
  adj = { ...FACTORY, wear: w }; applyAdj();
}
// the three dampers side by side: when each starts to lift on its key, and how long each takes to land off the pedal
function damperCompare() {
  const cell = (id, txt) => s => el('td', { class: gradeL(id, NOTES[s].m).ok ? 'okc' : 'badc' }, txt(NOTES[s].m));
  const rows = [
    ['Starts lifting (share of hammer travel)', 'damperTiming', mm => mm.damperTiming == null ? 'never' : `${Math.round(100 * mm.damperTiming)}%`],
    ['Lands after the pedal', 'damperFall', mm => `${Math.round(mm.fallMs)} ms`]];
  return el('table', { class: 'specs score' },
    el('thead', {}, el('tr', {}, el('th', {}, 'Dampers'), EXAM_ORDER.map((s, i) => el('th', {}, `Note ${i + 1}`)))),
    el('tbody', {}, rows.map(([name, id, txt]) => el('tr', {}, el('td', {}, name), EXAM_ORDER.map(cell(id, txt))))));
}
function renderSandbox(p) {
  const three = multi(), dis = busy ? '' : false;
  put(p, el('h2', {}, 'Sandbox'),
    el('p', { class: 'muted' }, 'Every reading is live. Open a part of the action, turn anything, and watch what else moves.'),
    el('div', { class: 'row notes' }, el('button', { class: three ? '' : 'on', disabled: dis, onclick: () => setThreeKeys(false) }, 'One key'),
      el('button', { class: three ? 'on' : '', disabled: dis, onclick: () => setThreeKeys(true) }, 'Three keys')),
    three ? [
      el('p', { class: 'muted small' }, 'Three neighbors, bass to treble, on the same rest rail, damper stop rail and pedal. The neighbors start regulated. Pick the note to work on here, or click its key.'),
      el('div', { class: 'row notes' }, EXAM_ORDER.map((slot, i) =>
        el('button', { class: slot === cur ? 'on' : '', disabled: dis, onclick: () => { selectNote(slot); view(viewNow); } }, `Note ${i + 1}`))),
      el('div', { class: 'row' }, el('button', { disabled: dis, onclick: () => chord(false) }, 'Play all three'),
        el('button', { disabled: dis, onclick: () => chord(true) }, 'Press all three slowly'),
        el('button', { onclick: () => view('damperrow') }, 'Watch the dampers')),
      damperCompare(),
      el('h3', {}, `Note ${EXAM_ORDER.indexOf(cur) + 1}`)] : null,
    el('div', { class: 'row' }, el('button', { onclick: factoryAll }, 'Factory regulation'),
      el('button', { onclick: messUpSandbox }, 'Mess it all up')),
    wearControl(),
    AREAS.map(areaPanel),
    el('label', { class: 'row small' }, 'Break something: ',
      el('select', { onchange: e => { adj.damage = e.target.value || null; clearFrames(); sim.setAdj(adj); sim.reset(); m = measure(adj); store(); refresh(); } },
        el('option', { value: '' }, 'nothing'),
        Object.keys(DAMAGE).map(k => el('option', { value: k, ...(adj.damage === k ? { selected: '' } : {}) }, damageLabel(k))))),
    el('label', { class: 'row small' }, 'Key bushings: ',
      el('select', { disabled: busy ? '' : false, onchange: e => { adj.bushing = e.target.value || null; bushingChanged(); } },
        el('option', { value: '' }, 'healthy'),
        Object.entries(BUSHINGS).map(([k, b]) => el('option', { value: k, ...(adj.bushing === k ? { selected: '' } : {}) }, b.name)))),
    el('label', { class: 'row small' }, 'Action centers: ',
      el('select', { disabled: busy ? '' : false, onchange: e => { adj.center = e.target.value || null; bushingChanged(); } },
        el('option', { value: '' }, 'healthy'),
        Object.entries(CENTER_FAULTS).map(([k, f]) => el('option', { value: k, ...(adj.center === k ? { selected: '' } : {}) }, f.name)))),
    repairs());
}

// ---------- exam mode: the 3-note grand model ----------
// PTG's technical exam hands you a de-regulated 3-note grand action model with the key height
// and dip given, and 50 minutes. This is practice scoring, not PTG's score sheet.
// PTG's 50 minutes cover assembling the model too; this one starts assembled, so a shorter clock leaves that time
const EXAM_CLOCKS = [50, 40, 30];
let examMinutes = 50;
const EXAM_ORDER = [1, 0, 2];                 // note 1, 2, 3 from bass to treble
const EVEN = ['keyHeight', 'dip', 'blow', 'letoff', 'drop', 'check'];
let examDampers = false;
const DAMPER_KNOBS = ['damperGap', 'damperStop', 'pedalLift', 'damperDrag', 'damperCenter', 'damperLevel'];
const examSpecs = () => Object.keys(SPEC).filter(id => (exam.dampers || !SPEC[id].damper) && !SPEC[id].noExam);
let exam = { started: false, done: false };
const examActive = () => mode === 'exam' && exam.started;
// three notes in play: the exam model, or the Sandbox's three keys
const multi = () => examActive() || (mode === 'sandbox' && threeKeys);
function startExam() {
  setPaused(false); clearFrames(); closePop();
  const restRail = deregulated().restRail;
  const shared = deregulated();
  NOTES.forEach(n => {
    const a = { ...deregulated(), restRail, damperStop: shared.damperStop, pedalLift: shared.pedalLift };
    if (!examDampers) for (const k of DAMPER_KNOBS) a[k] = FACTORY[k];
    n.adj = a; n.sim.setAdj(a); n.sim.reset(); n.m = measure(a); n.tested = new Set();
  });
  if (LEVEL.damage) {
    // a tight hammer center is a center fault (adj.center), the others damage
    const slot = EXAM_ORDER[Math.floor(Math.random() * 3)], keys = ['splitShank', 'looseFlange', 'looseHead', 'hammerTight'];
    const n = NOTES[slot], k = keys[Math.floor(Math.random() * keys.length)];
    if (CENTER_FAULTS[k]) n.adj.center = k; else n.adj.damage = k;
    n.sim.setAdj(n.adj); n.sim.reset(); n.m = measure(n.adj);
  }
  exam = { started: true, done: false, dampers: examDampers, level: LEVEL, damaged: NOTES.map(n => n.adj.damage || n.adj.center || null),
    minutes: examMinutes, endAt: Date.now() + examMinutes * 60000, t0: Date.now() };
  $('#level').disabled = true;
  testsUsed = 0; generation++;
  cur = EXAM_ORDER[0]; ({ adj, sim, m, tested } = NOTES[cur]); lastClock = '';
  S.setNoteCount(3); S.setFocus(cur); S.clearCallouts();
  refresh();
  view('angle');
}
// back to one note, from the exam or the Sandbox's three keys
function toOneNote() {
  clearFrames(); closePop();
  const wasThree = exam.started || threeKeys;
  exam = { started: false, done: false }; threeKeys = false;
  $('#level').disabled = false;
  NOTES.forEach(n => { if (n.sim.dTarget > 0) n.sim.press(0, 60); });
  store(); cur = 0;
  if (wasThree) NOTES.forEach(n => putNote(n, { ...FACTORY }));
  ({ adj, sim, m, tested } = NOTES[0]);
  S.setNoteCount(1); S.setFocus(null);
}
function handIn() {
  if (exam.done) return;
  closePop();
  exam.done = true; exam.used = Math.min(Date.now() - exam.t0, exam.minutes * 60000);
  NOTES.forEach(n => n.sim.press(0, 60));
  NOTES.forEach(n => { n.m = measure(n.adj); });
  m = NOTES[cur].m;
  S.setFocus(null); view('angle');
  refresh();
}
const clock = ms => { const t = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
let lastClock = '';
function tickExam() {
  const c = $('#examclock');
  if (!examActive() || exam.done) { if (!c.hidden) c.hidden = true; return; }
  const left = exam.endAt - Date.now();
  if (left <= 0) { toast('Time. Pencils down.', 'warn'); handIn(); return; }
  const txt = clock(left);
  if (txt !== lastClock) { c.textContent = txt; c.hidden = false; c.classList.toggle('low', left < 5 * 60000); lastClock = txt; }
}
function examScore() {
  // the wiggle-and-listen check, and the check of a center dealt as damage, are scored only on the note that had it
  const anyDamage = exam.damaged.some(d => DAMAGE[d]), dealtCenters = new Set(exam.damaged.map(d => CENTER_FAULTS[d]?.center).filter(Boolean));
  const ids = [...examSpecs(), ...Object.keys(SPEC).filter(id => dealtCenters.has(SPEC[id].center))];
  const notScored = (id, i) => (id === 'hammerSound' && !DAMAGE[exam.damaged[i]]) || (SPEC[id].center && CENTER_FAULTS[exam.damaged[i]]?.center !== SPEC[id].center);
  const rows = ids.filter(id => id !== 'hammerSound' || anyDamage).map(id => ({ id, cells: EXAM_ORDER.map(i =>
    notScored(id, i) ? { txt: '—', ok: true, skip: true } : { ...reading(id, NOTES[i].m), ok: gradeL(id, NOTES[i].m).ok }) }));
  const even = EVEN.concat(exam.dampers ? ['damperTiming'] : []).map(id => {
    const vals = EXAM_ORDER.map(i => gradeL(id, NOTES[i].m).v);
    const ok = vals.every(v => v != null) && Math.max(...vals) - Math.min(...vals) <= SPEC[id].tol * exam.level.tolK;
    return { id, ok, spread: vals.every(v => v != null) ? Math.max(...vals) - Math.min(...vals) : null };
  });
  if (exam.dampers) {
    const t = EXAM_ORDER.map(i => NOTES[i].m.fallMs), spread = Math.max(...t) - Math.min(...t);
    even.push({ id: 'damperFall', ok: spread <= 5, spread, ms: true });
  }
  const items = rows.flatMap(r => r.cells.filter(c => !c.skip).map(c => c.ok)).concat(even.map(e => e.ok));
  let pct = Math.round(100 * items.filter(Boolean).length / items.length);
  const missed = NOTES.some(n => n.adj.damage || n.adj.center);
  if (missed) pct = Math.min(pct, 79);   // a damaged part left in the action fails the exam
  return { rows, even, pct, missed };
}
function renderExam(p) {
  if (!exam.started) {
    put(p, el('h2', {}, 'Exam practice: grand regulation'),
      el('p', {}, 'Practice for the grand section of PTG\'s Technical Exam. PTG\'s source book addendum (2005) says only that you assemble, align and regulate a disassembled grand action model in 50 minutes. Here you get a 3-note model, already assembled and de-regulated, with key height and dip given as targets. Regulate all three notes evenly.'),
      el('ul', { class: 'small' },
        el('li', {}, LEVEL.live ? 'At Apprentice level readings show as you work; at Journeyman and RPT they stay hidden until you run the test that measures them.' : 'Readings stay hidden until you run the test that measures them, on that note.'),
        el('li', {}, 'Click a key, or the note buttons, to work on a note. The hammer rest rail is shared.'),
        el('li', {}, LEVEL.live ? 'Adjust by clicking the part of the action you would turn, or with the controls listed under each test.'
          : 'Adjust by clicking the part of the action you would turn: its controls come up beside it. The panel lists the tests, not the adjustments; knowing which part to turn is part of the exam.'),
        el('li', {}, 'Assembly is skipped, but aligning is in: travel, space and square each hammer, center each jack and backcheck. The real 50 minutes include assembling the model, so you can set a shorter clock to leave yourself that time.'),
        LEVEL.damage ? el('li', {}, 'At RPT level one note may also have a damaged part to find and repair (on the real exam, repairs are a separate section).') : null,
        el('li', {}, 'Scoring: each spec on each note, plus how even the three notes are. 80% is this practice\'s pass mark, not PTG\'s.')),
      el('label', { class: 'row small' }, el('input', { type: 'checkbox', ...(examDampers ? { checked: '' } : {}), onchange: e => { examDampers = e.target.checked; } }),
        ' Include dampers and pedal (lift timing, stop rail, pedal lift, falling together). PTG\'s grand section may not include them.'),
      el('label', { class: 'row small' }, 'Clock: ',
        el('select', { onchange: e => { examMinutes = +e.target.value; refresh(); } },
          EXAM_CLOCKS.map(n => el('option', { value: n, ...(n === examMinutes ? { selected: '' } : {}) }, n === 50 ? '50 minutes (the whole section)' : `${n} minutes`)))),
      el('p', { class: 'muted small' }, 'Practice scoring with textbook tolerances, not PTG\'s official score sheet. The real exam also has you assemble the model; this one starts assembled.'),
      el('div', { class: 'row' }, el('button', { class: 'primary', onclick: startExam }, `Start the ${examMinutes} minutes`)));
    return;
  }
  if (exam.done) return renderExamResult(p);
  const n = EXAM_ORDER.indexOf(cur) + 1;
  put(p, el('div', { class: 'sheet' }, el('div', { class: 'muted small' }, 'Examiner\'s sheet'),
      el('div', {}, `Key height: ${fmt(NEIGHBOR_H)} (straightedge set to it)`), el('div', {}, `Dip: ${fmt(SPEC.dip.target)}`)),
    el('div', { class: 'row notes' }, EXAM_ORDER.map((slot, i) =>
      el('button', { class: slot === cur ? 'on' : '', disabled: busy ? '' : false, onclick: () => { selectNote(slot); view('angle'); } }, `Note ${i + 1}`))),
    el('h3', {}, `Note ${n}`),
    AREAS.filter(a => exam.dampers || a.id !== 'dampers').map(areaPanel),
    repairs(), centerRepairs(Object.keys(CENTERS), { fold: true }));
  put($('#actionbar'), el('span', { class: 'muted small grow' }, `Note ${n} · tests run: ${testsUsed}`),
    el('button', { class: 'primary', onclick: () => { if (confirm('Hand in your exam model now?')) handIn(); } }, 'Hand it in'));
}
function renderExamResult(p) {
  const sc = examScore(), pass = sc.pct >= 80;
  const cell = c => el('td', { class: c.ok ? 'okc' : 'badc' }, c.txt);
  put(p, el('div', { class: 'verdict ' + (pass ? 'ok' : 'bad') },
      el('h2', {}, `${sc.pct}%: ${pass ? 'pass' : 'not yet'}`),
      el('p', { class: 'muted small' }, `${exam.level.name} level · time used ${clock(exam.used)} of ${exam.minutes}:00 · ${testsUsed} tests run`),
      sc.missed ? el('p', {}, 'A damaged part was left unrepaired, so this practice caps the score below a pass.') : null),
    el('table', { class: 'specs score' },
      el('thead', {}, el('tr', {}, el('th', {}, 'Check'), el('th', {}, 'Note 1'), el('th', {}, 'Note 2'), el('th', {}, 'Note 3'))),
      el('tbody', {}, sc.rows.map(r => el('tr', {}, el('td', {}, SPEC[r.id].name), r.cells.map(cell))))),
    el('h3', {}, 'Evenness across the three notes'),
    el('table', { class: 'specs score' }, el('tbody', {}, sc.even.map(e =>
      el('tr', {}, el('td', {}, e.ms ? 'Dampers land together' : SPEC[e.id].name), el('td', { class: e.ok ? 'okc' : 'badc' },
        e.spread == null ? 'not all working' : e.ms ? `${Math.round(e.spread)} ms apart` : e.id === 'damperTiming' ? `spread ${Math.round(e.spread * 100)}%` : `spread ${fmt(e.spread)}`))))),
    el('p', { class: 'muted small' }, `Evenness passes when the three notes are within each spec's tolerance of each other. Practice scoring, not PTG's.`),
    el('div', { class: 'row' }, el('button', { class: 'primary', onclick: () => { toOneNote(); refresh(); } }, 'New exam')));
}

// ---------- events from the simulation ----------
function toast(text, kind = '') {
  const box = $('#toasts');
  if ([...box.children].some(c => c.textContent === text && !c.classList.contains('out'))) return;   // already showing
  while (box.children.length >= 3) box.firstChild.remove();
  const t = el('div', { class: 'toast ' + kind }, text);
  box.append(t);
  setTimeout(() => t.classList.add('out'), 2600);
  setTimeout(() => t.remove(), 3200);
}
// What the key just did. While you simply play, it goes to the quiet line by the key buttons; during a test,
// and for anything that is wrong (a block, a pop, a scrape), it pops up as well.
const recentWarn = new Map();
function say(text, kind = '') {
  $('#lastevent').textContent = text; $('#lastevent').title = text;
  if (kind === 'warn') {
    if (performance.now() - (recentWarn.get(text) ?? -1e9) < 5000) return;   // not again on every loop
    recentWarn.set(text, performance.now());
    toast(text, kind);
  } else if (busy) toast(text, kind);
}
let letoffMark = null, checkMark = null, letoffD = null, contactD = {};
function handleEvents() {
  for (const e of sim.events) {
    const show = id => revealed(id);
    if (e.type === 'letoff') {
      // let-off is judged on a slow press; a hard blow trips at a slightly different point
      const slow = sim.keySpeed <= 20;
      // a hard blow, or the jack back under, ends the slow press's marks: drop and aftertouch hang from them
      letoffMark = slow ? e.g : null; letoffD = slow ? e.d : null;
      say(show('letoff') && slow ? `Let-off ${fmt(e.dist)} from the string` : 'Jack let off');
    }
    if (e.type === 'strike') say(`Hammer strikes (${e.v.toFixed(1)} m/s)`);
    if (e.type === 'checked') { checkMark = e.g; say(show('check') ? `Checked ${fmt(e.dist)} from the string` : 'Hammer checked'); }
    if (e.type === 'reset') { letoffMark = letoffD = null; say(`Jack back under the knuckle (key ${Math.round(100 * (1 - e.d / sim.dip))}% up)`); }
    if (e.type === 'blocked') say('Blocked: the jack never let off and the hammer is jammed against the string', 'warn');
    if (e.type === 'buzz') e.held ? say('The hammer is held up against the string: it buzzes instead of striking', 'warn')
      : say('Too soft to sound: the hammer only just reached the string');
    if (e.type === 'jackjam') say('The jack is jammed against its stop felt in the repetition lever: too much aftertouch, or let-off set too early', 'warn');
    if (e.type === 'pop') say('Pop: you would feel a bump in the key', 'warn');
    if (e.type === 'scrape') say('The hammer tail scraped the backcheck', 'warn');
    if (e.type === 'jumpcheck') say('The hammer jumped out of check', 'warn');
    if (e.type === 'damperbounce') say('The damper bobbled on the strings', 'warn');
    if (e.type === 'bobble') say('The hammer bounced off the jack and struck again (bobble)', 'warn');
    // the tender reaching the let-off button and the lever reaching the drop screw: together in a well-regulated action
    if (e.type === 'tender' || e.type === 'dropscrew') {
      contactD[e.type] = e.d;
      const tender = e.type === 'tender', other = contactD[tender ? 'dropscrew' : 'tender'];
      const btn = 'the jack\'s tender met the let-off button', screw = 'the repetition lever met the drop screw';
      // within the 0.2 mm of key travel that drop and let-off in spec allow; the verdict waits until drop has been tested
      if (other == null || !show('drop')) say(tender ? 'The jack\'s tender meets the let-off button' : 'The repetition lever meets the drop screw');
      else if (e.d - other < 0.2) say('Tender on the let-off button and lever on the drop screw together, as in a well-regulated action');
      else say(`${tender ? 'The lever met the drop screw' : 'The tender met the let-off button'} ${(e.d - other).toFixed(1)} mm of key travel before ${tender ? btn : screw}`);
    }
    // a head off center, or with one end up, leaves part of the unison undamped
    // (in Learn, only once the dampers are being worked on, so it doesn't nag through the earlier steps)
    if (e.type === 'seated' && !gradeL('damperSeat', m).ok && (show('damperSeat') || mode === 'diagnose')) say('The damper is down, but a string goes on ringing', 'warn');
    if (e.type === 'click') say('A dry click on the blow', 'warn');
    if (e.type === 'keyclick') say('A click from the key as it bottoms: it knocks on its pins', 'warn');
    // a test lifts the key itself; Loop can't go on with it down
    if (e.type === 'keystuck' && !busy) { setLoop(false); say('The key stayed down: a tight bushing holds it. Press Let key up to lift it by hand', 'warn'); }
  }
  // the pedal test listens for every damper landing, on every note
  NOTES.forEach((n, slot) => { if (landed) for (const e of n.sim.events) if (e.type === 'seated' && !landed.has(slot)) landed.set(slot, e.t); n.sim.events = []; });
}
const FRONT_VIEWS = new Set(['jackfront', 'checkfront', 'checktop', 'hammerline', 'damperline']);
function updateCallouts() {
  if (sim.stackOff || sim.keyShown != null) { S.clearCallouts(); return; }   // the key and stack apart (key drop, wippen tilt): nothing to measure
  const nz = NOTE_Z[cur], z = 9 + nz, L = sim.L, g = hammerOverride ?? sim.g;
  const atRest = sim.d < 0.01;
  const show = id => revealed(id);
  // traveling: only a line straight up from where the head rests, like the lines on a traveling stick; a hammer
  // that travels true rises along it, one that doesn't drifts off it
  if (sim.d < 0.01) { letoffMark = null; checkMark = null; letoffD = null; contactD = {}; }
  if (viewNow === 'travel') {
    // from the crown where it rests (a head out of square, or wobbling on a split shank, sits off the hammer's line,
    // twisted on the shank: the same twist scene.js draws) up to the strings
    const E = eff(adj);
    if (atRest) travelRestG = sim.g;
    const c0 = crownTop(travelRestG ?? sim.g), c1 = crownTop(gStringNow());
    const twist = (E.hammerSquare || 0) + (E.wobble ? E.wobble * ((sim.strikes || 0) % 2 ? 1 : -1) : 0);
    const zRest = nz + BASS * sideZ(E, c0[1] - G.H[1]) + (G.crownC[1] + G.crownR) * Math.sin(twist * Math.PI / 180);
    S.setCallout('travel', [c0[0], c0[1], zRest], [c1[0], c1[1], zRest], 'straight up');
    S.clearCallouts(['travel']);
    return;
  }
  const keep = [];
  if (show('blow') && atRest) {
    const c = crownTop(g); S.setCallout('blow', [c[0], c[1], z], [c[0], G.stringY, z], `blow ${fmt(G.stringY - c[1])}`); keep.push('blow');
  }
  if (show('restGap') && atRest) {
    const s = hamPt(g, G.shankRest), rr = eff(adj).restRail; S.setCallout('rest', [G.restRailX, rr, 12 + nz], [G.restRailX, s[1], 12 + nz], `rail gap ${fmt(Math.max(0, m.restGap))}`); keep.push('rest');
  }
  // the tail's clearance from the backcheck at rest: no book figure, a reading of the drawn parts, shown with checking;
  // a side-view reading, so not while a test holds the hammer up or in the views that look along the action
  if (show('check') && atRest && hammerOverride === null && !FRONT_VIEWS.has(viewNow)) {
    const b = S.backcheckGap(cur);
    S.setCallout('bcgap', [...b.tail, 8 + nz], [...b.bc, 8 + nz], `backcheck gap ${fmt(b.gap)}`); keep.push('bcgap');
  }
  if (show('keyHeight') && atRest) {
    const k = keyAngle(eff(adj), 0), f = keyPt(k.By, k.th, [G.keyFrontLocal + 8, G.keyThick + G.keyTopCap]);
    S.setCallout('kh', [f[0], f[1], 12 + nz], [f[0], NEIGHBOR_H, 12 + nz], reading('keyHeight').txt); keep.push('kh');
  }
  if (show('dip')) {
    const k = keyAngle(eff(adj), 0), f0 = keyPt(k.By, k.th0, [G.keyFrontLocal, G.keyThick + G.keyTopCap]);
    const kk = keyAngle(eff(adj), sim.d), f1 = keyPt(kk.By, kk.th, [G.keyFrontLocal, G.keyThick + G.keyTopCap]);
    if (sim.d > 0.05) { S.setCallout('dip', [f0[0] - 3, f0[1], 12 + nz], [f0[0] - 3, f1[1], 12 + nz], `${fmt(sim.d)}${sim.d >= sim.dip - 0.01 ? ' (dip)' : ''}`); keep.push('dip'); }
  }
  // the jack's front-to-back line from the side; seen from the front, how far it sits off the knuckle's center
  if (show('jackPos') && atRest && viewNow !== 'jackfront') {
    const jg = jackGeom(L, sim.psi);
    S.setCallout('jack', [jg.backX, jg.backY, 8 + nz], [coreBack(g, jg.backY), jg.backY, 8 + nz], reading('jackPos').txt); keep.push('jack');
  }
  if (show('wippenSpacing') && atRest && viewNow === 'jackfront') {
    const jg = jackGeom(L, sim.psi), zj = nz + BASS * jackSide(adj);
    S.setCallout('jackside', [jg.backX - 3, jg.topY + 1, zj], [jg.backX - 3, jg.topY + 1, zj - BASS * m.wippenSpacing], reading('wippenSpacing').txt); keep.push('jackside');
  }
  if (letoffMark !== null && sim.d > 0.05 && show('letoff')) {
    const c = crownTop(letoffMark); S.setCallout('letoff', [c[0] + 8, c[1], z], [c[0] + 8, G.stringY, z], `let-off ${fmt(G.stringY - c[1])}`); keep.push('letoff');
  }
  // after let-off on a slow press: where the hammer lands on the repetition lever just after let-off, below the let-off
  // point on the let-off line's own ruler, its label kept clear below let-off's (hidden as the key comes back up). It
  // marks the drop as judged, not the hammer: that sinks on past it into the lever's spring and comes back, and the
  // lever lifts it back some as the key goes on down, which Igrec says to ignore.
  if (letoffMark !== null && m.drop != null && sim.dTarget >= sim.d && show('drop')) {
    const c0 = crownTop(letoffMark);
    S.setCallout('drop', [c0[0] + 8, c0[1], z], [c0[0] + 8, c0[1] - m.drop, z], `drop ${fmt(m.drop)}`, { end: true, dy: 18 }); keep.push('drop');
  }
  if (letoffD !== null && sim.d > letoffD + 0.02 && show('aftertouch')) {
    const E = eff(adj), ka = keyAngle(E, letoffD), kb = keyAngle(E, sim.d);
    const pa = keyPt(ka.By, ka.th, [G.keyFrontLocal + 20, G.keyThick + G.keyTopCap]), pb = keyPt(kb.By, kb.th, [G.keyFrontLocal + 20, G.keyThick + G.keyTopCap]);
    S.setCallout('after', [pa[0], pa[1], 12 + nz], [pb[0], pb[1], 12 + nz], `aftertouch ${fmt(sim.d - letoffD)}`); keep.push('after');
  }
  if (checkMark !== null && sim.st.checked && show('check')) {
    const c = crownTop(checkMark); S.setCallout('check', [c[0] - 8, c[1], z], [c[0] - 8, G.stringY, z], `check ${fmt(G.stringY - c[1])}`); keep.push('check');
  }
  S.clearCallouts(keep);
}

// ---------- key controls ----------
// What the key does by itself once it is down: Play ('up') lets it up, and Ease up pressed while the key is still on
// its way down ('ease') eases it once the hammer has had time to check. planAt is when, in action time.
let plan = null, planAt = null;
const clearPlan = () => { plan = null; planAt = null; };
// why a button did nothing, or what it is waiting for: on the event line, and popped up where it is seen
const explain = text => { say(text); toast(text); };
// paused, a key button sets the key going, but nothing moves until the action is stepped or run
const pausedNote = () => { if (paused) explain('Paused: Frame ▶ steps it on (hold it down to keep going), Run plays it'); };
$('#k-play').onclick = () => { if (!busy) { cue = null; sim.press(sim.dip, 250); plan = 'up'; planAt = null; pausedNote(); } };
// Loop: play the key over and over, a normal blow each time it has come back up and settled
let looping = false, restSince = null;
const setLoop = on => { looping = on; restSince = null; $('#k-loop').classList.toggle('on', on); };
// looping is running, from the key up
$('#k-loop').onclick = () => {
  if (busy) return;
  if (!looping) { if (paused) setPaused(false); if (sim.dTarget > 0) { clearPlan(); sim.press(0, 60); } }
  setLoop(!looping);
};
for (const id of ['#k-strike', '#k-slow', '#k-ease', '#k-release']) $(id).addEventListener('click', () => setLoop(false));
// the key buttons play the note being worked on: the other keys of a chord come up first
const releaseOthers = () => NOTES.forEach(n => { if (n.sim !== sim && n.sim.dTarget > 0) n.sim.press(0, 60); });
for (const id of ['#k-play', '#k-loop', '#k-strike', '#k-slow', '#k-letoff']) $(id).addEventListener('click', () => { if (!busy) releaseOthers(); });
$('#k-slow').onclick = () => { if (!busy) { clearPlan(); cue = null; sim.press(sim.dip, 6); pausedNote(); } };
$('#k-strike').onclick = () => { if (!busy) { clearPlan(); cue = null; sim.press(sim.dip, 250); pausedNote(); } };
// Ease up lets a held key up a little. Pressed while the key is still going down (a blow, or any press while paused),
// it waits for the key to get there and the hammer to check: strike, hold, then ease up, as the spring test does.
const easeNow = () => sim.press(Math.max(0, Math.min(sim.d, sim.dip) - 1.2), 10);
$('#k-ease').onclick = () => {
  if (busy) return;
  const goingDown = sim.dTarget > sim.d + 0.01;
  if (!goingDown && sim.d < 1.3) { explain('Ease up lets a held key up a little: Strike & hold or Press slowly first'); return; }
  clearPlan(); cue = null;
  if (goingDown) plan = 'ease'; else easeNow();
  pausedNote();
};
// (and any other key a chord left down)
const letUp = () => { if (!busy) { clearPlan(); cue = null; NOTES.forEach(n => { if (n.sim === sim || n.sim.dTarget > 0) n.sim.press(0, 60); }); pausedNote(); } };
$('#k-release').onclick = letUp;
// letting go of Space or the key on screen: paused, before the key has got down, it goes down and comes back up as
// Play does (a tap can't be stepped through otherwise)
const letGo = () => { if (paused && sim.dTarget > sim.d + 0.01) { plan = 'up'; planAt = null; } else sim.press(0, 60); };
let pedalDown = false;
const setPedal = down => { pedalDown = down; NOTES.forEach(n => n.sim.setPedal(down)); $('#k-pedal').classList.toggle('on', down); };
$('#k-pedal').onclick = () => { if (!busy) { setPedal(!pedalDown); pausedNote(); } };
let labelsOn = false, distancesOn = true;
$('#dist-btn').onclick = () => { distancesOn = !distancesOn; S.setCallouts(distancesOn); $('#dist-btn').classList.toggle('on', distancesOn); };
$('#labels').onclick = () => { labelsOn = !labelsOn; S.setLabels(labelsOn); $('#labels').classList.toggle('on', labelsOn); };   // hidden in Tools
// the key front in a corner, so the key's travel shows beside whatever part of the action the main view is on;
// on from the start where the stage has room for it
const setInset = on => { S.setInset(on); $('#inset-btn').classList.toggle('on', on); };
$('#inset-btn').onclick = () => setInset(!$('#inset-btn').classList.contains('on'));
S.insetEl.onclick = () => view('keyfront');
setInset($('#stage').clientWidth >= 700);
// ---------- frame by frame ----------
// Pause freezes the action. Frame ▶ moves it on by what one screen frame shows at the chosen speed (press a key
// button while paused, then step through the stroke); ◀ Frame steps back through the frames already played.
// Held down, either one keeps stepping, a frame each screen frame.
let paused = false, stepFrames = 0, frameNo = 0, frameHold = null;
const FRAME_S = 1 / 60, H_STEP = 0.0002;   // 0.2 ms steps keep the escapement timing stable
const frameHistory = [], HISTORY_MAX = 900;   // about 15 s of frames
const clearFrames = () => { frameHistory.length = 0; cue = null; };
const SNAP_SKIP = new Set(['a', 'L', 'events', 'dip', 'keyRock', 'keyTwist', 'keyShown', 'stackOff', 'jackRock', 'wippenRock', 'hammerRock', 'ulShown']), SNAP_LAZY = ['strikes', 'popped', 'buzzing'];   // fields a Sim sets only later
const snapSim = s => Object.fromEntries(Object.entries(s).filter(([k]) => !SNAP_SKIP.has(k)).map(([k, v]) => [k, v && typeof v === 'object' ? structuredClone(v) : v]));
// nothing moving: keys up, hammers and dampers still (a damper can rest up on the pedal's tray), the pedal not moving
// (a hammer at rest can keep a speed of 1e-16 or so from the last step's rounding)
const idleNow = () => NOTES.every(({ sim: s }) => s.d === 0 && s.dTarget === 0 && Math.abs(s.w) < 1e-9 && Math.abs(s.vd) < 1e-9 && s.pedal === s.pedalTarget);
let lastIdle = false;
// each frame the action moves: every note's state, and what the panel was marking (so markers and messages step back too)
function snapshot() {
  const idle = idleNow();
  if (idle && lastIdle) return;   // a long wait at rest doesn't push the blow you want out of the history
  lastIdle = idle;
  frameHistory.push({ idle, simTime, frameNo, plan, planAt, letoffMark, letoffD, checkMark, contactD: { ...contactD }, line: $('#lastevent').textContent,
    notes: NOTES.map(n => snapSim(n.sim)) });
  if (frameHistory.length > HISTORY_MAX) frameHistory.shift();
}
function restoreFrame(h) {
  ({ simTime, frameNo, plan, planAt, letoffMark, letoffD, checkMark } = h); contactD = { ...h.contactD };
  $('#lastevent').textContent = h.line; recentWarn.clear();   // a warning shows again when its frame is replayed
  NOTES.forEach((n, i) => {
    for (const k of SNAP_LAZY) if (!(k in h.notes[i])) n.sim[k] = undefined;
    Object.assign(n.sim, h.notes[i]); n.sim.L = linkage(n.sim.a, n.sim.d); n.sim.events = [];
  });
  pedalDown = NOTES[0].sim.pedalTarget > 0; $('#k-pedal').classList.toggle('on', pedalDown);
  lastIdle = false;
}
function setPaused(on) {
  paused = on; if (on) setLoop(false); else cue = null;   // run, the frames go by at the screen's own rate
  $('#k-pause').classList.toggle('on', on); $('#k-pause').textContent = on ? 'Run' : 'Pause';
}
const frameFwd = () => {
  if (busy) return;
  if (cue?.run) { explain('Still going to let-off'); return; }
  setPaused(true); stepFrames++;
  if (idleNow()) explain('Nothing is moving: press a key button or Go to let-off, then step');
};
// false once there is nothing left to step back to
const frameBack = () => {
  if (busy) return false;
  if (cue?.run) { explain('Still going to let-off'); return false; }
  setPaused(true);
  while (idleNow() && frameHistory.at(-1)?.idle) frameHistory.pop();   // from rest, straight back to the last frame that moved
  const h = frameHistory.pop();
  if (h) { restoreFrame(h); return true; }
  explain('No earlier frames: stepping back starts over after a knob is turned or the mode changes'); return false;
};
$('#k-pause').onclick = () => { if (!busy) setPaused(!paused); };
for (const [id, dir] of [['#k-fwd', 1], ['#k-back', -1]]) {
  const b = $(id), step = () => (dir > 0 ? frameFwd() : frameBack());
  b.addEventListener('pointerdown', e => { if (e.button !== 0 || busy) return; step(); frameHold = { dir, t0: performance.now(), id: e.pointerId }; });
  b.addEventListener('click', e => { if (e.detail === 0) step(); });   // Enter on the focused button (a mouse click stepped on pointerdown)
}
function setSpeed(s) {
  if (s === timeScale) return;
  timeScale = s; cue = null;   // the frames change size, so the count to let-off no longer holds
  document.querySelectorAll('[data-speed]').forEach(x => x.classList.toggle('on', +x.dataset.speed === s));
}
for (const b of document.querySelectorAll('[data-speed]')) b.onclick = () => setSpeed(+b.dataset.speed);
// Go to let-off: from rest, press slowly and stop just before the jack's tender meets the let-off button, in the
// Jack & knuckle view, ready to step through let-off and the drop onto the repetition lever after it. The press is run
// ahead fast, frame by frame as stepping would, many frames to a screen frame, up to let-off and then stepped back, so
// the frames before it can be stepped back into too and the count to let-off is known.
let cue = null;   // { run: true, tender } while it runs ahead; then { letoff: the frame the jack let off on }
const CUE_BEFORE = 10, CUE_MS = 12;   // stop this many frames before the tender; work per screen frame while running ahead
function goToLetoff() {
  if (busy || mode === 'tools') return;
  setLoop(false); clearPlan();
  if (timeScale === 1) setSpeed(0.1);   // at real speed the whole of it goes by in two or three frames
  view('escapement');
  sim.reset(); letoffMark = checkMark = letoffD = null; contactD = {}; clearFrames();
  setPaused(true);
  sim.press(sim.dip, 6);
  cue = { run: true, tender: null };
}
function runCue() {
  const dt = Math.min(FRAME_S * timeScale, 120 * H_STEP), until = performance.now() + CUE_MS;
  while (performance.now() < until) {
    const did = advance(dt);
    if (did.includes('tender') && cue.tender === null) cue.tender = frameNo;
    const letoff = did.includes('letoff') ? frameNo : null;
    // stopped by the let-off, by a hammer blocked on the string, or by the key at the bottom without either
    if (letoff === null && !did.includes('blocked') && sim.d < sim.dTarget - 1e-6) continue;
    const { tender } = cue, at = tender ?? letoff ?? (did.includes('blocked') ? frameNo : null);
    cue = letoff === null ? null : { letoff };
    if (at === null) { explain('The jack never let off on this press: the key reached the bottom first'); return; }
    while (frameNo > at - CUE_BEFORE && frameHistory.length) frameBack();
    explain(letoff !== null ? 'Just before let-off. Frame ▶ steps on and ◀ Frame back; hold either to keep going'
      : `The jack never lets off on this press. Frame ▶ steps on from just before ${tender !== null ? 'the tender meets its button' : 'the hammer jams at the string'}`);
    return;
  }
}
$('#k-letoff').onclick = goToLetoff;
for (const b of document.querySelectorAll('[data-view]')) b.onclick = () => view(b.dataset.view);
for (const b of document.querySelectorAll('.tab')) b.onclick = () => {
  if (action === 'upright') { if (U.busy) return; showCredits = false; U.setMode(b.dataset.mode); refresh(); return; }
  if (b.dataset.mode === mode) return;
  if (mode === 'exam' && exam.started && !exam.done && b.dataset.mode !== 'exam' && !confirm('Leave the exam? Your progress will be lost.')) return;
  toOneNote();
  showCredits = false;
  if (mode === 'drills') { drillsStop?.(); drillsEl = null; }
  if (mode === 'tools') { S.hideTool(); toolSel = null; S.setLabels(labelsOn); }
  mode = b.dataset.mode; tested = new Set(); verdict = null; S.clearCallouts(); setPaused(false); clearFrames(); closePop();
  if (mode === 'tools') { S.setLabels(false); if (sim.dTarget > 0) sim.press(0, 60); if (TOOLBAG.length) pickTool(TOOLBAG[0].id); }
  if (mode === 'exam' || mode === 'drills' || mode === 'tools') { exam = { started: false, done: false }; refresh(); return; }
  if (mode === 'learn') { stepIdx = 0; messUp(); focusStep(); }
  else if (mode === 'diagnose') { scenario = null; adj = { ...FACTORY }; applyAdj(); }
  else { adj = { ...FACTORY }; applyAdj(); }
};
$('#units').onclick = () => { units = units === 'in' ? 'mm' : 'in'; refresh(); };
$('#level').value = Object.keys(LEVELS).find(k => LEVELS[k] === LEVEL);
// a hint or a check was given at the old level's tolerances
$('#level').onchange = e => { LEVEL = LEVELS[e.target.value]; hint = false; verdict = null; try { localStorage.setItem('regsim-level', e.target.value); } catch {} e.target.blur(); refresh(); };
$('#credits').onclick = e => { e.preventDefault(); showCredits = true; refresh(); $('aside').scrollTop = 0; };
window.addEventListener('keydown', e => {
  if (mode === 'tools' || action === 'upright') return;   // no key on the bench while a tool is out; the upright has its own keys
  if (e.code === 'Escape') { setLoop(false); letUp(); closePop(); }
  if (e.code === 'KeyP' && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey && !busy && e.target === document.body) setPedal(!pedalDown);
  if (e.code === 'Space' && !e.repeat && !busy && e.target === document.body) { e.preventDefault(); setLoop(false); clearPlan(); cue = null; releaseOthers(); sim.press(sim.dip, 250); pausedNote(); }
  // frame keys work wherever focus is (often a button just clicked), but not while typing or choosing in a field
  if (!/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) && !e.ctrlKey && !e.metaKey && !e.altKey) {
    // by the character typed, so the keys named in the titles work on any keyboard layout
    if ((e.key === 'k' || e.key === 'K' || e.code === 'Pause') && !e.repeat && !busy) setPaused(!paused);
    if (e.key === '.') frameFwd();
    if (e.key === ',') frameBack();
  }
});
window.addEventListener('keyup', e => { if (mode !== 'tools' && action === 'grand' && e.code === 'Space' && !busy && e.target === document.body) letGo(); });

// hover names, press the key by clicking it
const tip = $('#tip');
canvas.addEventListener('pointermove', e => {
  const part = S.pick(e)?.part;
  canvas.style.cursor = part === 'key' ? 'pointer' : '';   // the key plays; anywhere else drags the view
  if (part) { tip.textContent = S.PART_NAMES[part] || part; tip.style.transform = `translate(${e.offsetX + 14}px, ${e.offsetY + 10}px)`; tip.hidden = false; }
  else tip.hidden = true;
});
canvas.addEventListener('pointerleave', () => { tip.hidden = true; });
let keyHeld = null;   // the pointer holding the key down
canvas.addEventListener('pointerdown', e => {
  const hit = S.pick(e), part = hit?.part;
  // a click on a neighbor works on that note: a view of one note follows it over (so a part clicked in a side view
  // opens its card where you were looking), and a view of all three stays put (re-aiming would fight a drag that starts on a neighbor)
  if (hit && hit.note >= 0 && hit.note !== cur && multi() && !busy) {
    selectNote(hit.note);
    if (focusFor(viewNow) !== null) view(viewNow);
  }
  if (part === 'key' && !busy) { keyHeld = e.pointerId; S.controls.enabled = false; setLoop(false); clearPlan(); cue = null; releaseOthers(); sim.press(sim.dip, 250); pausedNote(); }
  else clickAt = clickAt || e.button !== 0 || !e.isPrimary ? null   // a second finger, or a right or middle button, turns the view
    : { x: e.clientX, y: e.clientY, id: e.pointerId, hit, shift: e.shiftKey || e.ctrlKey };
});
// a click that didn't turn the view: a part opens its card, empty space closes it
let clickAt = null;
canvas.addEventListener('pointerup', e => {
  const c = clickAt; clickAt = null;
  if (!c || c.id !== e.pointerId || c.shift || Math.hypot(e.clientX - c.x, e.clientY - c.y) > 6 || mode === 'tools' || mode === 'drills') return;
  // a neighbor's part clicked while a test runs (the note can't switch then) would open a card working on the wrong note
  if (c.hit && (c.hit.note < 0 || c.hit.note === cur)) openPop(c.hit); else if (!c.hit) closePop();
});
// a touch can end without pointerup (second finger, app switch, long-press menu): let the key up then too. Each hold
// ends with the pointer that started it, so a second finger tapping a button leaves a held key down; leaving the window ends all.
const endHold = e => {
  const mine = h => e.pointerId === undefined || h.id === e.pointerId;
  if (clickAt && mine(clickAt)) clickAt = null;
  if (frameHold && mine(frameHold)) frameHold = null;
  if (moveHold && mine(moveHold)) moveHold = null;
  if (keyHeld !== null && mine({ id: keyHeld })) { keyHeld = null; S.controls.enabled = true; letGo(); }
};
window.addEventListener('pointerup', endHold);
window.addEventListener('pointercancel', endHold);
window.addEventListener('blur', endHold);
canvas.addEventListener('contextmenu', e => e.preventDefault());

// ---------- moving the view with buttons ----------
// Dragging turns the view, but sliding (Shift, Ctrl or right-drag) and zooming are easy to miss, so the picture has
// buttons for them too, and a card on the first visit says how. A click is one step; held, a button keeps going.
const ZOOM_STEP = 0.85, SLIDE_STEP = 0.08;   // a click: 15% closer, or 8% of the picture's height across
let moveHold = null;   // { zoom } or { dx, dy } while a move button is held down, and when it was pressed
const scene = () => action === 'upright' ? U.S : S;   // the picture the move buttons move
function moveStep(m, k = 1) {   // k: fraction of one click's step
  if (m.zoom) scene().zoomBy(Math.pow(ZOOM_STEP, -m.zoom * k));
  else scene().slideBy(m.dx * SLIDE_STEP * k, m.dy * SLIDE_STEP * k);
}
for (const b of document.querySelectorAll('[data-zoom], [data-slide]')) {
  const [dx, dy] = (b.dataset.slide || '0,0').split(',').map(Number), m = b.dataset.zoom ? { zoom: +b.dataset.zoom } : { dx, dy };
  b.addEventListener('pointerdown', e => { if (e.button !== 0) return; moveStep(m); moveHold = { ...m, t0: performance.now(), id: e.pointerId }; });
  b.addEventListener('click', e => { if (e.detail === 0) moveStep(m); });   // Enter on the focused button
  b.addEventListener('contextmenu', e => e.preventDefault());   // a long press on a phone
}
$('#nav-reset').onclick = () => scene().resetView();
// a clicked button lets go of the keyboard, so Space goes back to striking the key
$('#navpad').addEventListener('click', e => { if (e.detail) e.target.closest('button')?.blur(); });
const moveHelp = $('#movehelp');
let helpSeen = false;
try { helpSeen = localStorage.getItem('regsim-movehelp') === 'seen'; } catch {}
moveHelp.hidden = helpSeen;
$('#nav-help').onclick = () => { moveHelp.hidden = !moveHelp.hidden; };
$('#movehelp-ok').onclick = () => { moveHelp.hidden = true; try { localStorage.setItem('regsim-movehelp', 'seen'); } catch {} };
// the arrow keys slide and + and − zoom, when the picture was the last thing clicked (else they scroll the panel)
let viewKeys = true;
window.addEventListener('pointerdown', e => { viewKeys = $('#stage').contains(e.target); }, true);
const MOVE_KEYS = { ArrowLeft: { dx: -1, dy: 0 }, ArrowRight: { dx: 1, dy: 0 }, ArrowUp: { dx: 0, dy: 1 }, ArrowDown: { dx: 0, dy: -1 },
  '+': { zoom: -1 }, '=': { zoom: -1 }, '-': { zoom: 1 }, '_': { zoom: 1 } };
window.addEventListener('keydown', e => {
  const m = MOVE_KEYS[e.key];
  if (!m || !viewKeys || e.ctrlKey || e.metaKey || e.altKey || !(e.target === document.body || $('#stage').contains(e.target))) return;
  e.preventDefault(); moveStep(m, 0.5);
});

// ---------- theme ----------
const mq = matchMedia('(prefers-color-scheme: dark)');
const stageColor = () => getComputedStyle(document.documentElement).getPropertyValue('--stage').trim() || '#eef0f2';
function applyTheme() { S.setBackground(stageColor()); U?.S.setBackground(stageColor()); }
mq.addEventListener('change', applyTheme);

// ---------- loop ----------
// one frame of the action: every note moved on by dtSim of action time, and the panel told what happened.
// Returns what the note being worked on did in it.
function advance(dtSim) {
  if (mode !== 'tools') snapshot();
  for (const n of NOTES) {
    const s2 = n.sim;
    if (s2 !== sim && s2.d === 0 && s2.dTarget === 0 && s2.w === 0 && s2.yd === 0 && s2.vd === 0 && s2.pedal === s2.pedalTarget) continue;
    for (let t = 0; t < dtSim; t += H_STEP) n.sim.step(Math.min(H_STEP, dtSim - t));
  }
  simTime += dtSim; frameNo++;
  const did = sim.events.map(e => e.type);
  for (let i = waits.length - 1; i >= 0; i--) if (simTime >= waits[i].at) { waits[i].r(); waits.splice(i, 1); }
  handleEvents();
  // Play (and Play all three, 'all') lets the key up a moment after it gets down (0.12 s of screen time at the chosen
  // speed); Ease up pressed on the way down eases it 0.15 s of action time after, by when a struck hammer has checked.
  // Both are counted in the action's own time so a paused or stepped stroke does the same on the same frame every time.
  if (plan && planAt === null && (sim.d >= sim.dTarget - 0.01 || sim.blocked)) planAt = simTime + (plan === 'ease' ? 0.15 : 0.12 * (forcedScale ?? timeScale));
  if (planAt !== null && simTime >= planAt) {
    const p = plan; clearPlan();
    if (p === 'up') sim.press(0, 60); else if (p === 'all') NOTES.forEach(n => n.sim.press(0, 60)); else easeNow();
  }
  if (looping && (busy || mode === 'tools')) setLoop(false);
  if (looping && !plan && sim.d === 0 && sim.dTarget === 0) {
    if (restSince === null) restSince = simTime;
    else if (simTime - restSince > 0.35) { sim.press(sim.dip, 250); plan = 'up'; restSince = null; }
  } else restSince = null;
  return did;
}
const frames = n => `${n} frame${n === 1 ? '' : 's'}`;
let last = performance.now();
function frame(now) {
  const dtReal = Math.min(0.05, (now - last) / 1000); last = now;
  // on a slow device cap the work per frame (the action then runs a little slower than real time rather than stuttering)
  const scale = forcedScale ?? timeScale;
  // a frame button held down steps on (or back) every screen frame, after a moment so a click is one step
  if (frameHold && now - frameHold.t0 > 350) { if (frameHold.dir > 0) stepFrames = Math.max(stepFrames, 1); else if (frameHistory.length) frameBack(); else frameHold = null; }
  if (moveHold && now - moveHold.t0 > 350) moveStep(moveHold, dtReal * 6);   // held: about six clicks a second, smoothly
  if (action === 'upright') {   // the upright's frame; a fault in it mustn't stop the loop the grand comes back to
    try { U.frame(dtReal); } catch (err) { console.error(err); }
    requestAnimationFrame(frame); return;
  }
  let dtSim = Math.min(dtReal * scale, 120 * H_STEP);
  if (paused) { dtSim = stepFrames ? Math.min(FRAME_S * scale, 120 * H_STEP) : 0; stepFrames = Math.max(0, stepFrames - 1); }
  if (cue?.run) runCue();
  else if (dtSim > 0) advance(dtSim);
  NOTES.forEach((n, i) => { if (i === 0 || multi()) S.update(i, n.sim, eff(n.adj), i === cur ? hammerOverride : null, i === cur ? jackOverride : null, i === cur); });
  tickExam();
  if (mode !== 'tools') updateCallouts();
  // a test that draws the key apart from the action (the stack lifted off it: the key drop, the wippen tilt) says where it is drawn
  const kd = sim.keyShown ?? sim.d, apart = sim.keyShown != null;
  const down = kd > 0.05 || (!apart && sim.dTarget > 0.05);
  const toLetoff = !cue ? '' : cue.run ? 'going to let-off · ' : frameNo < cue.letoff ? `let-off in ${frames(cue.letoff - frameNo)} · `
    : frameNo === cue.letoff ? 'let-off · ' : `${frames(frameNo - cue.letoff)} after let-off · `;
  $('#keypos').textContent = `${paused ? 'paused · ' : ''}${toLetoff}key ${fmt(kd)} down`;
  S.setInsetText(`Key front · ${fmt(kd)} down${kd >= sim.dip - 0.01 ? ' (dip)' : ''}`);
  $('#keystate').textContent = !down ? 'Key at rest' : apart ? 'Key down' : sim.dTarget > sim.d + 0.01 ? 'Key going down' : sim.dTarget > 0.05 ? 'Key held down' : sim.stuck && !sim.lifting ? 'Key stuck down' : 'Key coming up';
  $('#keystate').classList.toggle('down', down);
  $('#k-release').classList.toggle('attn', sim.dTarget > 0.05 && plan !== 'up' && plan !== 'all' && !busy);
  // a test runs the action itself: the key and frame buttons wait for it
  for (const b of keyButtons) if (b.disabled !== !!busy) b.disabled = !!busy;
  S.render();
  placePop();
  requestAnimationFrame(frame);
}
const keyButtons = [...document.querySelectorAll('#keybar button:not([data-speed])')];
applyTheme();
adj = { ...FACTORY }; applyAdj(); view('angle');
// the exam clock keeps time even while the tab is in the background
setInterval(tickExam, 1000);
requestAnimationFrame(frame);

// ---------- Grand / Upright ----------
// The switch in the header, remembered like the level, and #upright in the address opens the upright. Switching lets
// the grand's key go and leaves it as it was; the upright opens on its Sandbox at the factory regulation.
let loadingUpright = null;   // the first load of upright-app.js, shared by every click while it loads
async function setAction(kind) {
  if (kind === 'upright' && !U) {
    try {
      loadingUpright ??= import('./upright-app.js').then(({ createUprightApp }) => {
        U ??= createUprightApp({ el, put, toast, level, refresh });
        U.S.setBackground(stageColor());
      });
      await loadingUpright;
    } catch (err) { loadingUpright = null; console.error(err); toast('The upright could not load. Try reloading the page.', 'warn'); return; }
  }
  // (checked after the load: a test or an exam may have started while it loaded)
  if (kind === action || busy || U?.busy) return;
  if (U?.examRunning) { toast('Finish or leave the upright exam first', 'warn'); return; }
  if (kind === 'upright') {
    if (mode === 'exam' && exam.started && !exam.done) { toast('Finish or leave the exam first', 'warn'); return; }
    if (mode !== 'learn' && mode !== 'sandbox') $('.tab[data-mode=sandbox]').click();
    setLoop(false); clearPlan(); cue = null; setPaused(false); releaseOthers(); sim.press(0, 60); closePop(); S.highlight(null); tip.hidden = true;
  }
  action = kind; showCredits = false;
  $('#app').classList.toggle('upright', kind === 'upright');
  for (const b of document.querySelectorAll('#action-switch button')) b.classList.toggle('on', b.dataset.action === kind);
  $('header h1').textContent = kind === 'upright' ? 'Upright action regulation' : 'Grand action regulation';
  if (kind === 'upright') U.show(); else U?.hide();
  try { localStorage.setItem('regsim-action', kind); } catch {}
  history.replaceState(null, '', kind === 'upright' ? '#upright' : location.pathname + location.search);
  refresh();
}
for (const b of document.querySelectorAll('#action-switch button')) b.onclick = () => { setAction(b.dataset.action); b.blur(); };
{
  let start = 'grand';
  try { start = localStorage.getItem('regsim-action') || 'grand'; } catch {}
  if (location.hash === '#upright') start = 'upright';
  if (start === 'upright') setAction('upright');
}
