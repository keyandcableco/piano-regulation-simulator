import { G, IN, ADJ, SPEC, DAMPER_SPECS, DAMAGE, FACTORY, NEIGHBOR_H, Sim, measure, grade, hamPt, crownY, crownTop, keyAngle, keyPt,
         jackGeom, knuckleBottom, eff, repSupportZ, gString as gStringNow } from './model.js';
import { createScene, NOTE_Z } from './scene.js';
import { TIPS, TOOLS, NAME_FORUM_POSTERS, NAMED_OK } from './tips.js';
import { mountSwingDrill } from './drills.js';
import { TOOLBAG } from './toolbag.js';

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
// use slot 0; exam mode uses all three. adj, sim, m and tested always point at the current slot.
const NOTES = [0, 1, 2].map(() => { const a = { ...FACTORY }; return { adj: a, sim: new Sim(a), m: measure(a), tested: new Set() }; });
let cur = 0;
let adj = NOTES[0].adj, sim = NOTES[0].sim, m = NOTES[0].m, tested = NOTES[0].tested;
function store() { Object.assign(NOTES[cur], { adj, sim, m, tested }); }
function selectNote(slot) {
  if (slot === cur || busy) return;
  autoUp = false;
  if (sim.dTarget > 0) sim.press(0, 60);
  store(); cur = slot;
  ({ adj, sim, m, tested } = NOTES[slot]);
  S.setFocus(examActive() ? slot : null);
  S.clearCallouts(); letoffMark = checkMark = letoffD = null;
  refresh();
}
let mode = 'learn';
let timeScale = 0.1;
let stepIdx = 0;
let scenario = null, testsUsed = 0, verdict = null;
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

// side views follow the current note; sighting the hammer line shows all three at full strength
let viewNow = 'action';
const view = name => { viewNow = name; S.setFocus(name !== 'hammerline' && examActive() && !exam.done ? cur : null); S.setView(name, NOTE_Z[cur]); };

// ---------- learn steps (standard grand order) ----------
// The order follows the published grand sequences (Randy Potter School checklist, Steinway and
// Kawai service manuals): prepare, level the keys, jack and repetition lever, blow and hammer
// line, let-off, drop, dip, aftertouch, backchecks, then the repetition springs, then dampers.
// Cards marked info are steps the sim does not model, shown so the sequence reads complete.
const STEPS = [
  { info: true, id: 'prep', title: 'Before you regulate: prepare the action',
    what: 'Regulating over loose screws, tight centers or sticky keys is wasted work. Tighten the action and keyframe screws, check that the centers swing freely but not loosely, ease any tight key bushings, and shape or file worn hammers and fit them to the strings: both change blow and let-off, so they come first.',
    how: 'None of this is in the sim: its parts are clean, free and tight. On a real piano it comes first.' },
  { info: true, id: 'bedding', title: 'Bed the keyframe',
    what: 'The keyframe has to sit flat on the keybed at the front rail, balance rail and back rail. If it rocks, it knocks, and the key dip and height wander.',
    how: 'Knock test with the action in: press on the rails and listen. Sand the front rail where it doesn\'t touch; set the balance rail glide bolts so they just touch, never lifting the rail.' },
  { info: true, id: 'keys', title: 'Square, space and ease the keys',
    what: 'Keys should sit square and evenly spaced, with slight side play at the bushings and none that binds.',
    how: 'Square a key by bending the balance rail pin to one side with a soft drift; space it by bending the front rail pin, the tool under the punching so the pin isn\'t marked.' },
  { spec: 'hammerTravel', title: 'Travel the hammers', knobs: ['hammerTravel'], test: 'travelLift',
    what: 'Lift the hammer slowly to the strings: it should rise straight, without drifting sideways. A hammer that travels off its path ends up striking a different spot than where it rests.',
    how: 'Put a strip of paper under one side of the hammer flange to tilt its path. Travel before spacing, since traveling moves the hammer at the strings.',
    note: 'Wippens and jacks are squared the same way at their flanges; the sim keeps those square.' },
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
  { spec: 'jackPos', also: ['wippenSpacing'], title: 'Jack position under the knuckle', knobs: ['jackScrew', 'wippenSpace'], test: 'sightJack', tests: ['sightJack', 'sightJackFront'],
    what: 'Line up the back of the jack with the back of the knuckle core (the wood inside the buckskin). Seen from the front, the jack should also stand centered under the knuckle.',
    how: 'Turn the jack regulating screw to move it front to back. Too far back and the jack drags as it escapes and is slow to get back under the knuckle; too far forward and it has less of the knuckle to push on. To center it side to side, loosen the wippen flange screw and shift the wippen, or tilt it with traveling paper under the flange.',
    note: 'Jack position changes how let-off feels (forward lightens the bump) more than where it happens. The sim models where, not the feel. Spacing the hammers moves the knuckles sideways, so center the jacks after the hammers. Steinway\'s guide (written for its uprights) also centers the jack\'s toe on its button, and calls for a compromise when the two disagree.' },
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
    note: '' },
  { spec: 'drop', title: 'Drop', knobs: ['drop'], test: 'slowPress',
    what: 'After let-off the hammer falls back onto the repetition lever, about 1/16" below where it let off. It must never rise above the let-off point as the key goes down.',
    how: 'Turn the drop screw. Down stops the lever sooner and gives more drop. Too little drop and the hammer can bobble against the string; too much makes repetition sluggish.',
    note: 'Another way to set it: the lever reaches the drop screw just as the tender reaches the let-off button. Rough in the repetition springs first: with a spring too weak to carry the hammer, drop can\'t be set. Changing dip moves drop again.' },
  { spec: 'dip', title: 'Key dip', knobs: ['frontPunch'], test: 'dipBlock',
    what: 'Dip is how far the key front travels. A common grand starting point is 3/8"; makers specify about 10 mm. On a real piano or the exam model you work to the given spec.',
    how: 'Change the front rail punchings. Thicker punchings stop the key sooner and give less dip. Measure with moderate pressure, about the weight of your hand: pressing hard squashes the punching.',
    note: 'Dip moves drop and checking with it, so recheck those. If the hammer blocks before the key bottoms, let-off may be too close, the dip too shallow, or there is lost motion: find which first.' },
  { spec: 'aftertouch', title: 'Aftertouch', knobs: ['frontPunch', 'capstan'], test: 'slowPress',
    what: 'Aftertouch is the key travel left after let-off. Igrec gives about 1 mm (0.8 to 1.5 mm), and many modern grands run more; this action at the textbook dip and blow gives about 1.7, and the sim grades that. It is what makes sure the jack escapes on the softest blow.',
    how: 'Most texts set it with dip and blow: more dip or less blow gives more aftertouch. Then recheck let-off and drop, which those changes move. Some techs, Chris Brown among them, fine-tune it together with let-off and drop.',
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
  { spec: 'damperFall', also: ['damperSeat'], title: 'Damper wires: fall freely, seat flat', knobs: ['damperDrag', 'damperCenter', 'damperLevel'], test: 'pedalTest', tests: ['pedalTest', 'damperSight'],
    what: 'Let the pedal go: every damper should drop and land at once. One that hangs or lands late leaves the note ringing. Each head should sit centered on its unison, both ends of its felt on the strings with equal force.',
    how: 'A late damper usually has a wire that isn\'t running straight through its guide rail bushing: bend the wire so it passes without binding, or ease a tight bushing. Bend the top of the wire (bends 3 and 4, in Igrec\'s numbering) to center the head, and bend it as seen from the side to seat both ends.',
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
  travelLift: { label: 'Lift the hammer slowly to the strings', specs: ['hammerTravel'], view: 'hammerline',
    run: async () => {
      await releaseKey();
      const g0 = sim.g, g1 = gStringNow() - 0.004;
      for (let i = 0; i <= 30; i++) { hammerOverride = g0 + (g1 - g0) * i / 30; await waitReal(0.04); }
      await waitReal(0.8);
      for (let i = 30; i >= 0; i--) { hammerOverride = g0 + (g1 - g0) * i / 30; await waitReal(0.02); }
      hammerOverride = null;
    } },
  wiggle: { label: 'Wiggle the hammer, play it, and listen', specs: ['hammerSound'], view: 'hammer',
    run: async () => {
      await releaseKey(); sim.press(sim.dip, 250); await waitSim(0.3); sim.press(0, 60); await waitSim(0.3);
      const d = DAMAGE[sim.a.damage];
      toast(d ? `You notice ${d.signs}.` : 'Solid on its center, no play, and quiet.', d ? 'warn' : '');
    } },
  pedalTest: { label: 'Pedal down, then let it go', specs: ['pedalLift', 'damperFall'], view: 'dampers', scale: 0.1, damper: true,
    run: async () => {
      await releaseKey();
      setPedal(true); await waitSim(0.25);
      const t0 = NOTES.map(n => n.sim.t);
      landed = new Map();
      setPedal(false); await waitSim(0.25); await waitReal(0.6);
      // report landing times for the notes that are in play
      const slots = examActive() ? EXAM_ORDER : [cur];
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
  hammerLine: { label: 'Sight the hammer line', specs: ['blow'], view: 'hammerline', examOnly: true,
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
};
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
  autoUp = false; recentWarn.clear();   // a test's own press stays down; its warnings always show
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
  return tested.has(id) || !!verdict;
}

// ---------- adjustments ----------
// rails that serve every note: one setting for all three on the exam model
const SHARED = new Set(['restRail', ...ADJ.filter(d => d.shared).map(d => d.id)]);
function setAdj(id, v) {
  const d = ADJ.find(x => x.id === id);
  adj[id] = Math.max(d.min, Math.min(d.max, v));
  sim.setAdj(adj);
  if (sim.d < 0.01 && !sim.st.checked) sim.reset();
  m = measure(adj);
  store();
  if (SHARED.has(id)) NOTES.forEach((n, i) => { if (i !== cur) { n.adj[id] = adj[id]; n.sim.setAdj(n.adj); n.sim.reset(); n.m = measure(n.adj); } });
  refresh();
}
function knobRow(id) {
  const d = ADJ.find(x => x.id === id);
  const btn = (txt, delta, title) => el('button', { class: 'nudge', title, onclick: () => { S.highlight(d.part, cur); setAdj(id, adj[id] + delta); } }, txt);
  const coarse = d.steps[d.steps.length - 1], fine = d.steps[0];
  const two = d.steps.length > 1;
  const valTxt = mode === 'sandbox'
    ? (d.unit === 'mm' || d.unit === '°' ? `${(adj[id] - FACTORY[id] >= 0 ? '+' : '')}${(adj[id] - FACTORY[id]).toFixed(2)}${d.unit === '°' ? '°' : ' mm'} from factory`
      : id === 'damperDrag' ? `drag ${adj[id].toFixed(2)}` : `${adj[id].toFixed(2)} × hammer weight`)
    : '';
  return el('div', { class: 'knob' },
    el('div', { class: 'knob-head' },
      el('button', { class: 'linkish', onclick: () => { S.highlight(d.part, cur); view(viewFor(d.part)); } }, d.name),
      el('span', { class: 'muted small' }, examActive() && SHARED.has(id) ? 'shared by all three notes' : valTxt)),
    el('div', { class: 'knob-btns' },
      two ? btn('−−', -coarse, `− ${d.stepLabel[1]}`) : null,
      btn('−', -fine, `− ${d.stepLabel[0]}`),
      btn('+', +fine, `+ ${d.stepLabel[0]}`),
      two ? btn('++', +coarse, `+ ${d.stepLabel[1]}`) : null),
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
  else if (r.v == null) txt = r.note || '—';
  else if (id === 'keyHeight') txt = Math.abs(r.v) < 0.05 ? 'level' : `${fmt(Math.abs(r.v))} ${r.v > 0 ? 'high' : 'low'}`;
  else if (id === 'jackPos') txt = Math.abs(r.v) < 0.05 ? 'aligned' : `${fmt(Math.abs(r.v))} ${r.v > 0 ? 'too far back' : 'too far forward'}`;
  else txt = fmt(r.v) + (r.note ? ` · ${r.note}` : '');
  if (id !== 'spring' && r.note && (id === 'keyHeight' || id === 'jackPos')) txt += ` · ${r.note}`;
  return { ok: r.ok, txt };
}
function measureTable(ids) {
  return el('table', { class: 'specs' },
    el('thead', {}, el('tr', {}, el('th', {}, 'Check'), el('th', {}, 'Target'), el('th', {}, 'Now'))),
    el('tbody', {}, ids.map(id => {
      const show = revealed(id), r = reading(id);
      return el('tr', { class: show ? (r.ok ? 'ok' : 'bad') : '' },
        el('td', {}, el('span', { class: 'dot' }), SPEC[id].name),
        el('td', { class: 'muted' }, specTarget(id)),
        el('td', {}, show ? r.txt : el('span', { class: 'muted' }, 'not measured')));
    })));
}

// ---------- scenarios for diagnose mode ----------
const SCENARIOS = [
  { complaint: 'Soft notes on this key feel uneven and hard to control next to its neighbors.', faults: { letoff: +0.2 }, answer: 'Let-off set too close: the jack trips barely half a millimetre from the string. A hair closer and the hammer blocks against the string.' },
  { complaint: 'I can\'t play this note quietly, it either thumps or misses.', faults: { letoff: -1.0 }, answer: 'Let-off too far from the string.' },
  { complaint: 'The key feels shallow, and soft notes are hard to control.', faults: { frontPunch: +1.0 }, answer: 'Dip too shallow: too little aftertouch, so the jack barely escapes. Drop and the damper settings move with it and come right once dip is set.' },
  { complaint: 'The key feels deep and mushy at the bottom.', faults: { frontPunch: -0.8 }, answer: 'Dip too deep: too much aftertouch.' },
  { complaint: 'Played firmly, this note sometimes sounds twice, like a stutter.', faults: { frontPunch: +1.7 }, alone: true, answer: 'Dip far too shallow: the key bottoms before the jack can escape, so there is no let-off and no aftertouch. After the blow the hammer falls back onto the jack, bounces off it and strikes again (the double repeat Igrec warns of). Drop and the damper settings move with dip and come right once it is set.' },
  { complaint: 'Fast repeated notes and trills fail on this key.', faults: { repSpring: -0.6 }, answer: 'Repetition spring too weak.' },
  { complaint: 'There\'s a little bump in the key when I let it up slowly, and loud notes bounce.', faults: { repSpring: +0.7 }, answer: 'Repetition spring too strong.' },
  { complaint: 'When I play loud and hold the key down, the hammer doesn\'t stay back: it bounces up and sits right under the string.', faults: { backcheck: -3.0 }, alone: true, answer: 'Backcheck bent too far back: it misses the tail, so nothing catches the hammer and it comes back up on the repetition lever.' },
  { complaint: 'There\'s free play at the top of the key and the tone is weak.', faults: { capstan: -0.4 }, answer: 'Capstan too low: the hammer rests on the rail, so the key moves before it lifts anything (lost motion), and the blow is too long.' },
  { complaint: 'The hammer on this key sits higher than its neighbors, and the key goes on down a long way after the note sounds.', faults: { capstan: +0.5 }, answer: 'Capstan too high: the blow is short, so aftertouch grows and drop shrinks. Let-off doesn\'t move: the button still trips the jack at the same point.' },
  { complaint: 'This key sits higher than the others.', faults: { balPunch: +0.5 }, answer: 'Too many balance rail punchings: key too high (and the dip changed with it).' },
  { complaint: 'Soft repeated notes on this key feel draggy compared with its neighbors.', faults: { jackScrew: -1.4 }, answer: 'Jack set too far back under the knuckle: it drags as it escapes and is slow to get back under. Sight the back of the jack against the back of the knuckle core.' },
  { complaint: 'Soft notes on this key buzz, as if something is touching the string.', faults: { drop: +2.0 }, alone: true, answer: 'Drop screw too high: after let-off the repetition lever carries the hammer back up against the string on a soft blow.' },
  { complaint: 'Trills and fast repeated notes on this key feel unreliable.', faults: { repStop: -0.3 }, answer: 'Repetition lever too low: tripped at rest, the hammer drops so far that the jack can\'t get back under the knuckle. A strong spring can still throw the hammer up for it in play, which is why the wink test is how you find it.' },
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
  { complaint: 'This note feels a little sluggish, and its hammer is slow to come back up after a note.', faults: { damage: 'tightCenter' }, alone: true,
    answer: 'A tight hammer flange center: the hammer swings stiffly and falls back slowly, so the repetition spring can\'t lift it. Ease the center; turning up the spring only covers it up.' },
  { complaint: 'Sometimes this note doesn\'t play again unless I let the key all the way up.', faults: { damage: 'brokenJackSpring' }, alone: true,
    answer: 'A broken jack spring: nothing pushes the jack back under the knuckle until the key is fully up. Replace the spring.' },
  { complaint: 'It was regulated when we bought it eight years ago. Now there\'s a click at the top of the key, soft notes are hard to control, and it feels like it bottoms out.', faults: { wear: 0.8 }, alone: true,
    answer: 'Nothing was turned: eight years of playing packed down the felts and cloth. Blow grew, the hammer settled onto the rest rail (lost motion), and aftertouch shrank. The fix is a touch-up of the whole sequence.' },
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
  tested = new Set(); testsUsed = 0; verdict = null;
  applyAdj();
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
function messUp() { adj = deregulated(); applyAdj(); }
function applyAdj() { generation++; sim.setAdj(adj); sim.reset(); m = measure(adj); store(); S.clearCallouts(); refresh(); }

// ---------- panel ----------
// append children, skipping the nulls left by conditionals
const put = (p, ...kids) => p.append(...kids.flat().filter(k => k != null));
function refresh() {
  for (const b of document.querySelectorAll('.tab')) b.classList.toggle('on', b.dataset.mode === mode);
  // the action's views and key buttons have nothing to work on while a tool is on the bench
  $('#views').style.display = $('#keybar').style.display = mode === 'tools' ? 'none' : '';
  const p = $('#mode');
  p.replaceChildren();
  if (showCredits) renderCredits(p);
  else if (mode === 'learn') renderLearn(p);
  else if (mode === 'diagnose') renderDiagnose(p);
  else if (mode === 'exam') renderExam(p);
  else if (mode === 'drills') renderDrills(p);
  else if (mode === 'tools') renderTools(p);
  else renderSandbox(p);
  $('#units').textContent = units === 'in' ? 'inches' : 'mm';
}
function testButton(id) {
  return el('button', { class: 'test', disabled: busy ? '' : false, onclick: () => runTest(id) }, '▶ ', TESTS[id].label);
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
    el('button', { class: 'pip' + (done ? ' cur' : ''), title: 'Final check', onclick: () => { stepIdx = STEPS.length; refresh(); } }, '✓')));
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
    benchTips(st.spec),
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
  S.highlight(st.knobs.map(k => ADJ.find(a => a.id === k).part), cur);
  view(TESTS[st.test].view);
}
// repairs: a broken or loose part can only be fixed, not regulated around
function repairs() {
  return el('details', {}, el('summary', {}, 'Repairs'),
    el('p', { class: 'muted small' }, 'For a part that is broken or loose. Regulation can\'t fix these.'),
    el('div', { class: 'tests' }, Object.entries(DAMAGE).map(([key, d]) => el('button', { class: 'test', disabled: busy ? '' : false, onclick: () => {
      if (adj.damage !== key) { if (mode === 'diagnose' || examActive()) testsUsed++; toast(`${d.repair}: nothing wrong there, so nothing changed.`); refresh(); return; }
      adj.damage = null;
      // a new shank arrives untraveled and unspaced
      if (key === 'splitShank') {
        Object.assign(adj, { hammerTravel: pm(0.6), hammerSpace: pm(0.6), hammerSquare: pm(2) });
        ['hammerTravel', 'hammerSpacing', 'hammerSquare'].forEach(s => tested.delete(s));
      }
      toast(`${d.repair}: done.`);
      sim.setAdj(adj); sim.reset(); m = measure(adj); store(); refresh();
    } }, d.repair))));
}
const damageLabel = k => ({ splitShank: 'Split shank', looseFlange: 'Loose flange screw', looseHead: 'Loose hammer head',
  tightCenter: 'Tight flange center', brokenJackSpring: 'Broken jack spring' })[k];
function renderDiagnose(p) {
  if (!scenario) {
    put(p, el('h2', {}, 'Find the fault'),
      el('p', {}, `A customer describes a problem with one key. ${LEVEL.live ? 'At Apprentice level the readings are shown, and you can ask for a hint.' : 'Readings stay hidden until you run the test that measures them.'} Find what is out, fix it, then have your work checked.`),
      el('div', { class: 'row' }, el('button', { class: 'primary', onclick: newScenario }, 'Next customer')));
    return;
  }
  put(p, el('div', { class: 'complaint' }, el('div', { class: 'muted small' }, 'The customer says'), el('p', {}, `“${scenario.complaint}”`)),
    el('h3', {}, 'Tests'), el('div', { class: 'tests' }, Object.keys(TESTS).filter(k => !TESTS[k].examOnly).map(testButton)),
    el('div', { class: 'muted small' }, `Tests run: ${testsUsed}`),
    measureTable(Object.keys(SPEC)),
    el('details', { open: '' }, el('summary', {}, 'Adjustments'), el('div', { class: 'knobs' }, ADJ.map(a => knobRow(a.id)))),
    repairs());
  if (!verdict) put(p, el('div', { class: 'row' }, el('button', { class: 'primary', onclick: () => { verdict = true; refresh(); } }, 'Check my work'),
    LEVEL.hints ? el('button', { onclick: e => { const bad = Object.keys(SPEC).filter(id => !gradeL(id, m).ok).map(id => SPEC[id].name); e.target.replaceWith(el('p', { class: 'note' }, 'Hint: look at ', bad.join('; ') || 'nothing: it looks regulated', '.')); } }, 'Hint') : null));
  else {
    const bad = Object.keys(SPEC).filter(id => !gradeL(id, m).ok);
    put(p, el('div', { class: 'verdict ' + (bad.length ? 'bad' : 'ok') },
      el('h3', {}, bad.length ? `${bad.length} still out of spec` : 'Regulated. Nice work.'),
      el('p', {}, el('b', {}, 'What was wrong: '), scenario.answer, scenario.second ? ` Also: ${scenario.second.answer}` : ''),
      el('p', { class: 'muted small' }, `You ran ${testsUsed} test${testsUsed === 1 ? '' : 's'}.`)),
      el('div', { class: 'row' }, el('button', { class: 'primary', onclick: newScenario }, 'Next customer'),
        bad.length ? el('button', { onclick: () => { verdict = null; refresh(); } }, 'Keep working') : null));
  }
}
// felt and cloth packing down with playing: punchings, back rail cloth, wippen heel,
// knuckle, hammer felt, button felts, backcheck felt, and a tiring repetition spring
function wearControl() {
  const yrs = Math.round((adj.wear || 0) * 10);
  return el('div', { class: 'wear' },
    el('div', { class: 'knob-head' }, el('b', {}, 'Felt & cloth wear'), el('span', { class: 'muted small' }, yrs ? `about ${yrs} year${yrs > 1 ? 's' : ''} of daily playing` : 'new felt')),
    el('input', { type: 'range', min: 0, max: 10, step: 1, value: yrs,
      oninput: e => { const y = +e.target.value; e.target.closest('.wear').querySelector('.muted').textContent = y ? `about ${y} year${y > 1 ? 's' : ''} of daily playing` : 'new felt'; },
      onchange: e => { adj.wear = +e.target.value / 10; applyAdj(); } }),
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
function renderSandbox(p) {
  put(p, el('h2', {}, 'Sandbox'),
    el('p', { class: 'muted' }, 'Every reading is live. Turn anything and watch what else moves.'),
    el('div', { class: 'row' }, el('button', { onclick: () => { adj = { ...FACTORY, wear: adj.wear || 0 }; applyAdj(); } }, 'Factory regulation'),
      el('button', { onclick: messUp }, 'Mess it all up')),
    wearControl(),
    measureTable(Object.keys(SPEC)),
    el('h3', {}, 'Tests'), el('div', { class: 'tests' }, Object.keys(TESTS).filter(k => !TESTS[k].examOnly).map(testButton)),
    el('h3', {}, 'Adjustments'), el('div', { class: 'knobs' }, ADJ.map(a => knobRow(a.id))),
    el('label', { class: 'row small' }, 'Break something: ',
      el('select', { onchange: e => { adj.damage = e.target.value || null; sim.setAdj(adj); sim.reset(); m = measure(adj); store(); refresh(); } },
        el('option', { value: '' }, 'nothing'),
        Object.keys(DAMAGE).map(k => el('option', { value: k, ...(adj.damage === k ? { selected: '' } : {}) }, damageLabel(k))))),
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
const SPEC_OF_KNOB_DAMPER = new Set(DAMPER_KNOBS);   // include damper regulation in the exam
const examSpecs = () => Object.keys(SPEC).filter(id => exam.dampers || !SPEC[id].damper);
let exam = { started: false, done: false };
const examActive = () => mode === 'exam' && exam.started;
function startExam() {
  const restRail = deregulated().restRail;
  const shared = deregulated();
  NOTES.forEach(n => {
    const a = { ...deregulated(), restRail, damperStop: shared.damperStop, pedalLift: shared.pedalLift };
    if (!examDampers) for (const k of DAMPER_KNOBS) a[k] = FACTORY[k];
    n.adj = a; n.sim.setAdj(a); n.sim.reset(); n.m = measure(a); n.tested = new Set();
  });
  if (LEVEL.damage) {
    const slot = EXAM_ORDER[Math.floor(Math.random() * 3)], keys = ['splitShank', 'looseFlange', 'looseHead', 'tightCenter'];
    const n = NOTES[slot]; n.adj.damage = keys[Math.floor(Math.random() * keys.length)];
    n.sim.setAdj(n.adj); n.sim.reset(); n.m = measure(n.adj);
  }
  exam = { started: true, done: false, dampers: examDampers, level: LEVEL, damaged: NOTES.map(n => n.adj.damage || null),
    minutes: examMinutes, endAt: Date.now() + examMinutes * 60000, t0: Date.now() };
  $('#level').disabled = true;
  testsUsed = 0; generation++;
  cur = EXAM_ORDER[0]; ({ adj, sim, m, tested } = NOTES[cur]); lastClock = '';
  S.setNoteCount(3); S.setFocus(cur); S.clearCallouts();
  refresh();
  view('angle');
}
function leaveExam() {
  const wasExam = exam.started;
  exam = { started: false, done: false };
  $('#level').disabled = false;
  if (sim.dTarget > 0) sim.press(0, 60);
  store(); cur = 0;
  if (wasExam) NOTES.forEach(n => { n.adj = { ...FACTORY }; n.sim.setAdj(n.adj); n.sim.reset(); n.m = measure(n.adj); n.tested = new Set(); });
  ({ adj, sim, m, tested } = NOTES[0]);
  S.setNoteCount(1); S.setFocus(null);
}
function handIn() {
  if (exam.done) return;
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
  const anyDamage = exam.damaged.some(Boolean);
  const rows = examSpecs().filter(id => id !== 'hammerSound' || anyDamage).map(id => ({ id, cells: EXAM_ORDER.map(i =>
    id === 'hammerSound' && !exam.damaged[i] ? { txt: '—', ok: true, skip: true } : { ...reading(id, NOTES[i].m), ok: gradeL(id, NOTES[i].m).ok }) }));
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
  const missed = NOTES.some(n => n.adj.damage);
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
    el('h3', {}, `Note ${n}: tests`), el('div', { class: 'tests' }, Object.keys(TESTS).filter(k => exam.dampers || !TESTS[k].damper).map(testButton)),
    el('div', { class: 'muted small' }, `Tests run: ${testsUsed}`),
    measureTable(examSpecs()),
    el('details', { open: '' }, el('summary', {}, `Note ${n}: adjustments`), el('div', { class: 'knobs' }, ADJ.filter(a => exam.dampers || !SPEC_OF_KNOB_DAMPER.has(a.id)).map(a => knobRow(a.id)))),
    repairs(),
    el('div', { class: 'row' }, el('button', { class: 'primary', onclick: () => { if (confirm('Hand in your exam model now?')) handIn(); } }, 'Hand it in')));
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
    el('div', { class: 'row' }, el('button', { class: 'primary', onclick: () => { leaveExam(); refresh(); } }, 'New exam')));
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
let letoffMark = null, checkMark = null, letoffD = null;
function handleEvents() {
  for (const e of sim.events) {
    const show = id => revealed(id);
    if (e.type === 'letoff') {
      // let-off is judged on a slow press; a hard blow trips at a slightly different point
      const slow = sim.keySpeed <= 20;
      if (slow) { letoffMark = e.g; letoffD = e.d; }
      say(show('letoff') && slow ? `Let-off ${fmt(e.dist)} from the string` : 'Jack let off');
    }
    if (e.type === 'strike') say(`Hammer strikes (${e.v.toFixed(1)} m/s)`);
    if (e.type === 'checked') { checkMark = e.g; say(show('check') ? `Checked ${fmt(e.dist)} from the string` : 'Hammer checked'); }
    if (e.type === 'reset') say(`Jack back under the knuckle (key ${Math.round(100 * (1 - e.d / sim.dip))}% up)`);
    if (e.type === 'blocked') say('Blocked: the jack never let off and the hammer is jammed against the string', 'warn');
    if (e.type === 'buzz') say('The hammer is held up against the string: it buzzes instead of striking', 'warn');
    if (e.type === 'jackjam') say('The jack is jammed against its stop felt in the repetition lever: too much aftertouch, or let-off set too early', 'warn');
    if (e.type === 'pop') say('Pop: you would feel a bump in the key', 'warn');
    if (e.type === 'scrape') say('The hammer tail scraped the backcheck', 'warn');
    if (e.type === 'jumpcheck') say('The hammer jumped out of check', 'warn');
    if (e.type === 'damperbounce') say('The damper bobbled on the strings', 'warn');
    if (e.type === 'bobble') say('The hammer bounced off the jack and struck again (bobble)', 'warn');
    // a head off center, or with one end up, leaves part of the unison undamped
    // (in Learn, only once the dampers are being worked on, so it doesn't nag through the earlier steps)
    if (e.type === 'seated' && !gradeL('damperSeat', m).ok && (show('damperSeat') || mode === 'diagnose')) say('The damper is down, but a string goes on ringing', 'warn');
    if (e.type === 'click') say('A dry click on the blow', 'warn');
  }
  // the pedal test listens for every damper landing, on every note
  NOTES.forEach((n, slot) => { if (landed) for (const e of n.sim.events) if (e.type === 'seated' && !landed.has(slot)) landed.set(slot, e.t); n.sim.events = []; });
}
function updateCallouts() {
  const nz = NOTE_Z[cur], z = 9 + nz, L = sim.L, g = hammerOverride ?? sim.g;
  const atRest = sim.d < 0.01;
  const show = id => revealed(id);
  const keep = [];
  if (show('blow') && atRest) {
    const c = crownTop(g); S.setCallout('blow', [c[0], c[1], z], [c[0], G.stringY, z], `blow ${fmt(G.stringY - c[1])}`); keep.push('blow');
  }
  if (show('restGap') && atRest) {
    const s = hamPt(g, G.shankRest), rr = eff(adj).restRail; S.setCallout('rest', [G.restRailX, rr, 12 + nz], [G.restRailX, s[1], 12 + nz], `rail gap ${fmt(Math.max(0, m.restGap))}`); keep.push('rest');
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
    const jg = jackGeom(L, sim.psi), kc = hamPt(g, G.knuckleC);
    S.setCallout('jack', [jg.backX, jg.topY, 8 + nz], [kc[0] + G.coreR, jg.topY, 8 + nz], reading('jackPos').txt); keep.push('jack');
  }
  if (show('wippenSpacing') && atRest && viewNow === 'jackfront') {
    const jg = jackGeom(L, sim.psi), zj = nz + (adj.wippenSpace || 0);
    S.setCallout('jackside', [jg.backX - 3, jg.topY + 1, zj], [jg.backX - 3, jg.topY + 1, zj - m.wippenSpacing], reading('wippenSpacing').txt); keep.push('jackside');
  }
  if (letoffMark !== null && sim.d > 0.05 && show('letoff')) {
    const c = crownTop(letoffMark); S.setCallout('letoff', [c[0] + 8, c[1], z], [c[0] + 8, G.stringY, z], `let-off ${fmt(G.stringY - c[1])}`); keep.push('letoff');
  }
  if (letoffD !== null && sim.d > letoffD + 0.02 && show('aftertouch')) {
    const E = eff(adj), ka = keyAngle(E, letoffD), kb = keyAngle(E, sim.d);
    const pa = keyPt(ka.By, ka.th, [G.keyFrontLocal + 20, G.keyThick + G.keyTopCap]), pb = keyPt(kb.By, kb.th, [G.keyFrontLocal + 20, G.keyThick + G.keyTopCap]);
    S.setCallout('after', [pa[0], pa[1], 12 + nz], [pb[0], pb[1], 12 + nz], `aftertouch ${fmt(sim.d - letoffD)}`); keep.push('after');
  }
  if (checkMark !== null && sim.st.checked && show('check')) {
    const c = crownTop(checkMark); S.setCallout('check', [c[0] - 8, c[1], z], [c[0] - 8, G.stringY, z], `check ${fmt(G.stringY - c[1])}`); keep.push('check');
  }
  if (sim.d < 0.01) { letoffMark = null; checkMark = null; letoffD = null; }
  S.clearCallouts(keep);
}

// ---------- key controls ----------
let autoUp = false; // Play: let the key up once it reaches the bottom
$('#k-play').onclick = () => { if (!busy) { sim.press(sim.dip, 250); autoUp = true; } };
// Loop: play the key over and over, a normal blow each time it has come back up and settled
let looping = false, restSince = null;
const setLoop = on => { looping = on; restSince = null; $('#k-loop').classList.toggle('on', on); };
$('#k-loop').onclick = () => { if (!busy) setLoop(!looping); };
for (const id of ['#k-strike', '#k-slow', '#k-ease', '#k-release']) $(id).addEventListener('click', () => setLoop(false));
$('#k-slow').onclick = () => { if (!busy) { autoUp = false; sim.press(sim.dip, 6); } };
$('#k-strike').onclick = () => { if (!busy) { autoUp = false; sim.press(sim.dip, 250); } };
$('#k-ease').onclick = () => { if (!busy) { autoUp = false; sim.press(Math.max(0, Math.min(sim.d, sim.dip) - 1.2), 10); } };
const letUp = () => { if (!busy) { autoUp = false; sim.press(0, 60); } };
$('#k-release').onclick = letUp;
let pedalDown = false;
const setPedal = down => { pedalDown = down; NOTES.forEach(n => n.sim.setPedal(down)); $('#k-pedal').classList.toggle('on', down); };
$('#k-pedal').onclick = () => { if (!busy) setPedal(!pedalDown); };
let labelsOn = false;
$('#labels').onclick = () => { labelsOn = !labelsOn; S.setLabels(labelsOn); $('#labels').classList.toggle('on', labelsOn); };   // hidden in Tools
for (const b of document.querySelectorAll('[data-speed]')) b.onclick = () => {
  timeScale = +b.dataset.speed;
  document.querySelectorAll('[data-speed]').forEach(x => x.classList.toggle('on', x === b));
};
for (const b of document.querySelectorAll('[data-view]')) b.onclick = () => view(b.dataset.view);
for (const b of document.querySelectorAll('.tab')) b.onclick = () => {
  if (b.dataset.mode === mode) return;
  if (mode === 'exam' && exam.started && !exam.done && b.dataset.mode !== 'exam' && !confirm('Leave the exam? Your progress will be lost.')) return;
  leaveExam();
  showCredits = false;
  if (mode === 'drills') { drillsStop?.(); drillsEl = null; }
  if (mode === 'tools') { S.hideTool(); toolSel = null; S.setLabels(labelsOn); }
  mode = b.dataset.mode; tested = new Set(); verdict = null; S.clearCallouts();
  if (mode === 'tools') { S.setLabels(false); if (sim.dTarget > 0) sim.press(0, 60); if (TOOLBAG.length) pickTool(TOOLBAG[0].id); }
  if (mode === 'exam' || mode === 'drills' || mode === 'tools') { exam = { started: false, done: false }; refresh(); return; }
  if (mode === 'learn') { stepIdx = 0; messUp(); focusStep(); }
  else if (mode === 'diagnose') { scenario = null; adj = { ...FACTORY }; applyAdj(); }
  else { adj = { ...FACTORY }; applyAdj(); }
};
$('#units').onclick = () => { units = units === 'in' ? 'mm' : 'in'; refresh(); };
$('#level').value = Object.keys(LEVELS).find(k => LEVELS[k] === LEVEL);
$('#level').onchange = e => { LEVEL = LEVELS[e.target.value]; try { localStorage.setItem('regsim-level', e.target.value); } catch {} e.target.blur(); refresh(); };
$('#credits').onclick = e => { e.preventDefault(); showCredits = true; refresh(); $('aside').scrollTop = 0; };
window.addEventListener('keydown', e => {
  if (mode === 'tools') return;   // no key on the bench while a tool is out
  if (e.code === 'Escape') { setLoop(false); letUp(); }
  if (e.code === 'KeyP' && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey && !busy && e.target === document.body) setPedal(!pedalDown);
  if (e.code === 'Space' && !e.repeat && !busy && e.target === document.body) { e.preventDefault(); setLoop(false); autoUp = false; sim.press(sim.dip, 250); }
});
window.addEventListener('keyup', e => { if (mode !== 'tools' && e.code === 'Space' && !busy && e.target === document.body) sim.press(0, 60); });

// hover names, press the key by clicking it
const tip = $('#tip');
canvas.addEventListener('pointermove', e => {
  const part = S.pick(e)?.part;
  if (part) { tip.textContent = S.PART_NAMES[part] || part; tip.style.transform = `translate(${e.offsetX + 14}px, ${e.offsetY + 10}px)`; tip.hidden = false; }
  else tip.hidden = true;
});
canvas.addEventListener('pointerleave', () => { tip.hidden = true; });
let keyHeld = false;
canvas.addEventListener('pointerdown', e => {
  const hit = S.pick(e), part = hit?.part;
  if (hit && hit.note >= 0 && hit.note !== cur && examActive() && !busy) { selectNote(hit.note); view('angle'); }
  if (part === 'key' && !busy) { keyHeld = true; S.controls.enabled = false; setLoop(false); autoUp = false; sim.press(sim.dip, 250); }
  else {
    const knob = ADJ.find(a => a.part === part);
    if (knob) S.highlight(knob.part, cur);
  }
});
// a touch can end without pointerup (second finger, app switch, long-press menu): let the key up then too
const endHold = () => { if (keyHeld) { keyHeld = false; S.controls.enabled = true; sim.press(0, 60); } };
window.addEventListener('pointerup', endHold);
window.addEventListener('pointercancel', endHold);
window.addEventListener('blur', endHold);
canvas.addEventListener('contextmenu', e => e.preventDefault());

// ---------- theme ----------
const mq = matchMedia('(prefers-color-scheme: dark)');
function applyTheme() { S.setBackground(getComputedStyle(document.documentElement).getPropertyValue('--stage').trim() || '#eef0f2'); }
mq.addEventListener('change', applyTheme);

// ---------- loop ----------
let last = performance.now();
function frame(now) {
  const dtReal = Math.min(0.05, (now - last) / 1000); last = now;
  // 0.2 ms steps keep the escapement timing stable; on a slow device cap the work per
  // frame (the action then runs a little slower than real time rather than stuttering)
  const h = 0.0002, dtSim = Math.min(dtReal * (forcedScale ?? timeScale), 120 * h);
  for (const n of NOTES) {
    const s2 = n.sim;
    if (s2 !== sim && s2.d === 0 && s2.dTarget === 0 && s2.w === 0 && s2.yd === 0 && s2.vd === 0 && s2.pedal === s2.pedalTarget) continue;
    for (let t = 0; t < dtSim; t += h) n.sim.step(Math.min(h, dtSim - t));
  }
  simTime += dtSim;
  for (let i = waits.length - 1; i >= 0; i--) if (simTime >= waits[i].at) { waits[i].r(); waits.splice(i, 1); }
  handleEvents();
  NOTES.forEach((n, i) => { if (i === 0 || examActive()) S.update(i, n.sim, eff(n.adj), i === cur ? hammerOverride : null, i === cur ? jackOverride : null, i === cur); });
  tickExam();
  if (mode !== 'tools') updateCallouts();
  if (autoUp && (sim.d >= sim.dip - 0.01 || sim.blocked)) { autoUp = false; setTimeout(() => sim.press(0, 60), 120); }
  if (looping && (busy || mode === 'tools')) setLoop(false);
  if (looping && !autoUp && sim.d === 0 && sim.dTarget === 0) {
    if (restSince === null) restSince = simTime;
    else if (simTime - restSince > 0.35) { sim.press(sim.dip, 250); autoUp = true; restSince = null; }
  } else restSince = null;
  const down = sim.d > 0.05 || sim.dTarget > 0.05;
  $('#keypos').textContent = `key ${fmt(sim.d)} down`;
  $('#keystate').textContent = down ? (sim.dTarget > 0.05 ? 'Key held down' : 'Key coming up') : 'Key at rest';
  $('#keystate').classList.toggle('down', down);
  $('#k-release').classList.toggle('attn', sim.dTarget > 0.05 && !autoUp && !busy);
  S.render();
  requestAnimationFrame(frame);
}
applyTheme();
messUp(); focusStep();
// the exam clock keeps time even while the tab is in the background
setInterval(tickExam, 1000);
requestAnimationFrame(frame);
