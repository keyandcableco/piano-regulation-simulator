// The upright's content (research/upright/protocol.md 5.2, chunk C4): Learn steps, tests, callouts, the de-regulated
// start and "From the bench" tips. The grand's live in app.js and tips.js; at the switch (C6) the app takes them from
// content-grand.js and this file alike.
// Every sentence is checked against its sources (S1 Steinway's upright chapter, S2 Spurlock, S3 Igrec, S14 Ellis) and
// against the model (protocol 3.8; research/upright/gate5.md lists each claim, its source and the test that shows it).
// Where the sim doesn't model something a step talks about, the step says so.
import {
  FACTORY, ADJ, SPEC, DAMAGE, measure, grade, band, capstanFor, pose, gRail, gOnJack, gString, stringGap, crownAt, keyFrontTop, NEIGHBOR_H, TRACE, CENTER, toSim, turn, jackPt, CORNER,
} from './upright-model.js';
import { NAME_FORUM_POSTERS, NAMED_OK } from './tips.js';

const IN = 25.4;
// two decimals, rounded half up (3.175 is 3.18), so a reading near a band's edge doesn't round onto it
const dec = v => (Math.round(v * 100 + 1e-6) / 100).toFixed(2);
export const fmt = v => v == null ? '—' : `${dec(v)} mm`;
// a small length as a technician reads it off a pulled rail: to the nearest 64th of an inch
export function sixtyFourths(mm) {
  let n = Math.round(mm / IN * 64), d = 64;
  if (n < 1) return 'under 1/64"';
  while (n % 2 === 0) { n /= 2; d /= 2; }
  return `about ${n}/${d}"`;
}

// ---------- Learn steps, in the standard upright order (protocol 3.1) ----------
// Spurlock and Steinway agree that blow and lost motion come before the final key leveling, so every key carries the
// same action weight on its capstan. Cards marked info are steps the sim doesn't model, shown so the sequence reads
// complete. A step: spec (graded), also (more graded specs), knobs (ADJ ids), test (the main one), tests.
export const STEPS = [
  { spec: 'buttLeather', also: ['catcherLeather', 'jackSpring', 'buttSpring', 'buttCenter', 'strap'], id: 'prep', title: 'Before you regulate: prepare the action',
    knobs: [], repairs: true, test: 'inspectLeather', tests: ['inspectLeather', 'jackPush', 'hammerLift', 'strapLook'],
    what: 'Regulating over loose screws, worn parts or tight centers is wasted work, and no regulation makes up for worn-out parts. Tighten every screw, the action bracket bolts before the action comes out so the frame stays in line. Check that the felts and leathers are still usable, every center is free but not wobbly, and nothing rubs. Ease tight keys (Steinway: "A tight key will make other adjustments virtually useless."), reshape worn hammers, and take the lost motion out of the pedal rods and trapwork.',
    how: 'In the sim: look at the butt leather and the catcher\'s buckskin for grooves and shine; push each jack out from under its butt and let it go (it should spring straight back); lift the hammer and let it go (the butt spring brings it back briskly, and a tight center drags); look at the bridle strap. A worn leather is re-covered, a weak or broken spring replaced, a tight center eased. Its screws, keys and trapwork start out sound.',
    note: 'Wear in the butt leather adds lost motion, which Spurlock takes out with the capstans; leather worn past use (his first check) is re-covered, and in the sim a worn butt leather is put right only by re-covering it. Upright jacks, butts and dampers all return on springs, so a tired spring shows as a part that comes back slowly or not at all. Igrec tests a butt\'s center with its spring unhooked; the sim\'s test lifts the hammer with the spring on.' },
  { info: true, id: 'seat', title: 'Seat the action and check the strike point',
    what: 'Everything is measured from the strings, so the action has to sit right against them first. On the top treble note the hammer should strike about 1/8" below the V-bar (Spurlock). Find the best tone by ear, levering the action up or down while you play the note, then set the support posts so the action rests evenly on all of them. Bend the top posts so each bracket is snug under its stud: that keeps the lost motion and the dampers stable.',
    how: 'Not in the sim: its one note is fixed in place at its strings.',
    note: 'A support with clearance can make a noise when the pedals are used (Spurlock).' },
  { info: true, id: 'align', title: 'Align the hammers, wippens and backchecks',
    what: 'Each hammer should travel straight to its strings, stand square to them and meet them centered (Steinway). Then the wippens: each jack centered on its butt and its toe on its let-off button, with the capstan under the wippen cushion. Then the backchecks, spaced sideways to their catchers. Last, check that the bridle straps are slack enough for the wippens to come down and the jacks to get under the butts (Spurlock).',
    how: 'Travel a hammer with traveling paper under its butt flange; square it by heating the shank and twisting it gently; space it by loosening the butt flange screw and shifting the flange. Shift a wippen on its loosened flange screw, or put traveling paper between its flange and the rail. Bend dowel capstan wires to line the capstans up under the wippens. Space the backchecks with wire-bending pliers only, so the wippen flanges aren\'t strained (Spurlock). Not in the sim yet: its note is aligned.',
    note: 'Traveling, spacing and burning work on one another, so repeat them (Steinway). When the capstan, jack and let-off button can\'t all be centered, place the wippen for the best result at all three (Steinway).' },
  { spec: 'blow', title: 'Blow distance', knobs: ['railShim'], test: 'blowGauge',
    what: 'Blow distance is the gap between the hammer at rest and the strings. An upright\'s hammers rest on the hammer rail, so the rail sets it. This action\'s specification is 42.5 mm, a scant 1-11/16": at 0.400" of dip, that is where the aftertouch and the jack\'s escapement both come out right (the aftertouch card).',
    how: 'Shim the hammer rail\'s rest felts to bring the rail, and the hammers, closer to the strings for a shorter blow; take shims out or cut the felts for a longer one. Moving the rail changes the lost motion: set that next.',
    note: 'Books give 1-3/4" for consoles and larger (Spurlock), 1-3/4" to 1-7/8" for most studio uprights (Igrec) and about 1-7/8" for Steinway\'s verticals; spinets run 1-1/2" (Igrec) to 1-5/8" (Spurlock). At 1-3/4" this model leaves too little aftertouch (0.6 mm) and escapement, so it runs shorter, inside 1-5/8" to 1-11/16". That is this model\'s own doing, not a rule for uprights: its key is an estimate (no upright key has been measured for it yet) and its traced sizes are good to about 10%. On a piano, start from the maker\'s blow. A longer blow gives the hammer more force; worn hammers usually need a shorter one (Igrec). A hammer the jack holds off the rail (no lost motion) can\'t be moved by the rail: turn its capstan down until it rests on the rail first, as Steinway does for hammers that don\'t follow a pulled rail.' },
  { spec: 'lostMotion', title: 'Lost motion', knobs: ['capstan'], test: 'railPull', tests: ['railPull', 'topPlay', 'jackReturn'],
    what: 'Lost motion is the small gap between the top of the jack and the butt cushion, the key at rest. The jack needs a little to get back under the butt when the key comes up slowly; more than that wears the butt leather and makes the keys feel loose at the top. The right amount is the least that lets the jack return when the key is let up very slowly after a hard blow, the sustain pedal down (Spurlock): on a new action under 0.1 mm at the jack, and up to double that on a worn one (Igrec).',
    how: 'Turn the capstan up to take lost motion out, down to add it. Pull the hammer rail gently back from the shanks: each hammer should follow it slightly, about 1/64" (Steinway); one that doesn\'t follow has none, one that follows much more than 1/16" has too much. Press the key very lightly at the top: the jack should rise a hair before the hammer moves (Igrec). Then the jack return test.',
    note: 'Spurlock\'s quick checks, pulling the rail (about 1/16" there) and tapping the keys by the capstans (a hammer that winks has none), find the bad ones fast, but he confirms every key with the jack return test. Set lost motion again whenever you move the rail or level the keys (Igrec). When wear has added lost motion, take it out with the capstans, not by moving the rail (Spurlock). Every capstan turn moves the checking a lot, which is set later. Spurlock tests with the sustain pedal down; the sim\'s test does too, though it doesn\'t model what the damper springs add. In the sim a hammer that follows the rail 1/64" has 0.05 mm at the jack, and one that follows 1/16" has 0.19: it grades from 0.04 mm, where the jack only just gets back under, to 0.2. The loose end of that range costs aftertouch, about a third of a millimetre of it, and checks the hammer farther off.' },
  { spec: 'keyHeight', title: 'Key height', knobs: ['balPunch'], test: 'straightedge',
    what: 'With the blow and lost motion set, every key carries its action\'s weight on its capstan the same way, so the keys can be leveled for good (Spurlock). Lay a straightedge across the neighbors: this key should just touch it.',
    how: 'Add or remove punchings under the key at the balance rail. The key rests on its back rail, so its front moves about twice the punching\'s thickness. A key raised there also dips deeper and checks closer to the strings, and its lost motion shrinks a little: recheck them.',
    note: 'Spurlock lays out punchings in front of the keys at half the gap between the straightedge and the key. Steinway\'s verticals use a straightedge crowned about 1/32" higher in the middle; the sim\'s neighbors are level.' },
  { spec: 'dip', title: 'Key dip', knobs: ['frontPunch'], test: 'dipBlock',
    what: 'Dip is how far the key front travels. Steinway gives about 0.400" for its verticals; Spurlock starts consoles and larger at 3/8" or more, most spinets at 7/16" and most Asian pianos at 10.5 mm. This action\'s specification is 0.400" (10.2 mm).',
    how: 'Add or remove paper punchings under the front rail cloth punching: thicker stops the key sooner and gives less dip. Use the same pressure on every key (Spurlock).',
    note: 'Spurlock\'s dip block has a cross piece resting on the neighboring keys: it barely clicks on them when the dip is right, clicks loudly and pushes them down when it\'s too deep, and doesn\'t reach them when it\'s too shallow. More dip gives more aftertouch and more escapement and checks the hammer closer to the strings, so dip comes before those. Sharps are set by matching their checking to the naturals\' (Steinway, Spurlock): what matters is equal capstan rise, not equal key travel.' },
  { spec: 'letoff', title: 'Let-off', knobs: ['letoff'], test: 'slowPress',
    what: 'Press the key slowly: the jack\'s toe meets the let-off button, and the jack trips out from under the butt before the hammer reaches the strings. Spurlock sets let-off as close to the strings as is practical, for the most power and the best control in soft playing, and finds 1/8" a good figure; the sim grades 1/8". Steinway lets off about 1/16".',
    how: 'Turn the let-off regulating screw: lowering the button toward the toe lets off earlier, farther from the strings; raising it, later and closer.',
    note: 'Let-off doesn\'t change with the capstan, key height, dip, blow or checking (Spurlock), so it can be set any time after the alignment. On a real piano a let-off much closer than 1/8" often blocks on hard blows, as the let-off rail bends and the button felt compresses (Spurlock); the sim\'s rail and button don\'t give.' },
  { spec: 'aftertouch', also: ['escapement'], title: 'Aftertouch and the jack\'s escapement', knobs: ['frontPunch', 'railShim', 'capstan'], test: 'slowPress', tests: ['slowPress', 'holdLook'],
    what: 'Aftertouch is the key travel left after let-off: 1.0 to 1.5 mm in most verticals (Igrec; Steinway: about the thickness of a new penny). Then play a medium blow, hold the key down and look at the jack: its top should stand 1/16" to 1/8" clear of the butt leather (Spurlock). With too little, the jack gets in the way of the checking and the hammers blubber; with too much, the key has to come up farther before the note repeats.',
    how: 'Set both with dip and blow, leaving let-off where it is (Igrec, Spurlock): more dip or a shorter blow gives more of both, and less lost motion gives more aftertouch. The jack\'s clearance also depends on where the backcheck holds the hammer, so rough in the checking first (Spurlock sets his sample notes\' checking to 5/8" before he looks). With let-off at 1/8", the checking at 9/16" and 0.400" of dip, the two come in together between about 42.3 and 43.4 mm of blow, and at 42.5 mm both sit near the top of their ranges. So if the jack stands too far clear, lengthen the blow a step (and reset the lost motion) or take out a hair of dip; if the aftertouch is short, do the opposite. A reading inside its own range can still be what keeps these two out: let-off on the close side, lost motion on the loose side or checking far out each take some of the aftertouch or the clearance, so when these two won\'t come in, bring those to their target figures first. The line under the readings says which.',
    note: 'Spurlock chooses the blow and dip by this test on a few sample notes, after aligning the action and before setting the lost motion. He wants the jack 1/16" to 1/8" clear, knowing escapement shrinks as the dip settles and lost motion grows. Too little aftertouch makes hammers bobble off the jacks; too much makes checking uneven and can jam the jacks at the bottom (Igrec), in the sim against its jack stop. The sim counts let-off where the hammer drops off the jack on a slow press, and aftertouch from there to the bottom of the key.' },
  { spec: 'check', title: 'Checking', knobs: ['backcheck'], test: 'strikeHold',
    what: 'The backcheck catches the hammer coming back from the strings and holds it close, so the jack can get back under the butt for a repeat blow before the key is all the way up (Spurlock). Play a moderate blow and hold the key: the hammer should be caught about 1/2" (Steinway) to 5/8" (Spurlock) from the strings.',
    how: 'Bend the backcheck wire: the head toward the catcher checks the hammer closer to the strings, away from it farther. First make sure the backcheck meets the catcher squarely and the lost motion is close: every later capstan turn changes the checking (Spurlock).',
    note: 'The sim grades 1/2" to 5/8", so both sources pass. Checking is the most sensitive reading on the action: a hair of dip, key height or capstan moves it. That is why Steinway and Spurlock use it to set the sharps\' dip: a sharp that checks closer than its natural neighbors is rising farther, so its dip is too deep (Spurlock). Checking also moves the jack\'s clearance a little, since the butt leather is held with the hammer: look at the jack again afterwards, as Spurlock does.' },
  { spec: 'softPedal', title: 'Soft pedal', knobs: ['softFelt'], test: 'softBlow',
    what: 'The soft pedal pushes the hammer rail, and every hammer with it, toward the strings. Down, it should bring the hammers halfway to the strings (Steinway, Spurlock); up, it should have no lost motion, but leave the rail resting on its supports (Spurlock).',
    how: 'Set the travel with the blocking felt glued under the pedal: thicker felt, less travel. Spurlock also glues a felt between the hammer rail and an action bracket, so a hard stomp can\'t throw the rail forward.',
    note: 'It comes before the bridle straps here because the bridle test uses the pedal\'s whole travel: Steinway gives the halfway figure inside its bridle step, and Spurlock tests his bridles with the hammers halfway before he limits the pedal with felt. With the pedal down the butts leave the jacks: in the sim about 3 mm of lost motion opens at the jack, so the key moves farther before the hammer does. The sim\'s pedal has no lost motion of its own, and with the pedal up its rail rests on its supports.' },
  { spec: 'bridle', title: 'Bridle straps', knobs: ['bridle'], test: 'softWatch', tests: ['softWatch'],
    what: 'The bridle strap ties the catcher to the wippen. It has to be slack enough that the soft pedal, moving the hammers halfway to the strings, doesn\'t lift the wippens (that puts the keys out of level), yet hold the wippen up when the key or the action is out, so the jack can\'t slip under the butt felt (Steinway, Spurlock). Jim Ellis found its main job is repetition: it brings the hammer back from the backcheck faster when the key is let go. He set his straps with just enough slack to pass the soft pedal test, and so does the sim\'s factory regulation.',
    how: 'Bend the bridle wire with finger pressure (Steinway): its top toward the player takes up slack, toward the catcher lets some out. Then press the soft pedal and watch the wippen: it must not move.',
    note: 'Spurlock also pushes groups of hammers to the strings by hand to see that no jack falls under its butt felt. The sim doesn\'t model a jack slipping under the felt, and no book gives a slack figure, so it grades only the soft pedal test and shows the slack as a reading. A strap left much slacker than the test needs doesn\'t pull at all, and the hammer comes home later on a quick release (the strap drill times it). Set the soft pedal\'s travel first (the step before this one); if you change it, or turn a capstan, check the bridles again: a lower wippen takes slack out of its strap.' },
  { info: true, id: 'jackStop', title: 'Jack stop rail',
    what: 'On a hard blow the jack flies back from the butt farther than the let-off button pushes it. A felted rail, sometimes the let-off rail itself, or a separate jack stop rail limits that, keeping the jack close to the butt for quicker repetition and less noise. Set it to just clear the jacks at full dip: hold the keys down firmly after a hard blow and check that no jack is jammed into the felt (Spurlock).',
    how: 'The sim\'s note has a fixed jack stop felt that clears the jack at full dip; it can\'t be adjusted yet.' },
  { info: true, id: 'dampers', title: 'Dampers lift together with the pedal',
    what: 'Press the sustain pedal: every damper should start to lift off its strings at the same moment, and come back to them squarely (Steinway). Each head should sit square and firm on its strings, with even pressure at the top and bottom of its felt (Spurlock). Even pedal lift comes before the spoons (Spurlock).',
    how: 'Bend the damper wires. Barely wink the pedal with your foot to find the early lifters and correct them, then the late ones (Spurlock). The bends are usually very small: Spurlock uses his fingers and a hook or screwdriver more than a bending tool. A felt that has sat a little off for years should stay that way while it damps well, since it has formed to its strings (Spurlock). Not in the sim: its one damper is already even with the pedal.' },
  { spec: 'damperTiming', title: 'Spoons: damper timing', knobs: ['spoon'], test: 'damperSlow',
    what: 'Press the key slowly and watch the damper: it should start to lift when the hammer is about halfway to the strings (Steinway, Spurlock).',
    how: 'Bend the spoon on the back of the wippen: toward the damper lever lifts the damper earlier, away from it later. The spoons weigh heavily in the touch, so make them as even as you can (Spurlock).',
    note: 'On a real piano the spoons are bent blind with the action in. Spurlock first teaches his fingers the feel and click of the bender on a spoon, and checks the timing with a gauge propped against the strings at half the blow: lift each wippen until its hammer bumps the gauge, and the damper should just wink. Steinway sets sample notes first, then lines up the spoons between them on the bench. The capstan moves the damper\'s start in key travel, but hardly as a share of the hammer\'s travel.' },
  { info: true, id: 'sustain', title: 'Sustain pedal',
    what: 'The sustain pedal needs a little lost motion, so the damper lift rod stands clear of every damper lever at rest and each damper presses its strings with its full spring: about 1/8" (3 mm) at the lift rod (Steinway). Push some strings in by hand: their dampers should follow at least 1/16" (Spurlock). Felt under the pedal limits its travel, so it lifts the dampers about as far as the spoons do (Spurlock) and at least 1/8" clear of the strings (Steinway).',
    how: 'Set the lost motion at the trapwork adjustment screw and the travel with the blocking felt under the pedal (Steinway). Not in the sim yet: its pedal has no lost motion and lifts the damper felt about 2.6 mm, a little less than the spoon\'s 3.4 at the bottom of the key.' },
  { spec: 'damperSpring', id: 'damperReturn', title: 'Dampers come back freely', knobs: [], repairs: true, test: 'damperPull',
    what: 'Pull the bottom of the damper lever away from the spoon, or the damper away from the strings, and let it go: it should snap back. If it doesn\'t, see that the spring is whole and engaged and not badly rusted, and that it isn\'t jamming in a worn notch. Push the top of the lever toward the rail a few times: a rough feel or a faint creak means its spring notches need lubricating (Igrec).',
    how: 'A broken or tired spring is replaced. The sim models the spring: its notches, friction and lubrication aren\'t in it.' },
  { info: true, id: 'middle', title: 'The middle pedal',
    what: 'On some uprights, Steinway\'s among them, the middle pedal is a sostenuto: it holds up only the dampers that were already lifted when it went down, and the rest go on working normally (Steinway, whose guide gives its adjustments in full).',
    how: 'Not in the sim.' },
  { info: true, id: 'again', title: 'Go round again',
    what: 'Every adjustment moves something set earlier: the rail moves the lost motion, the capstan the checking, key height and dip the checking and the jack\'s escapement. Go through the sequence again until nothing moves. Finish by confirming the lost motion on every key with the jack return test: Spurlock\'s last step, which saves a call-back for a sticking key. Then play-test.',
    how: 'The final check re-measures everything, shows what drifted and says what to go back to.' },
];

// ---------- tests ----------
// Each runs on a host context (the preview now; the app at the switch):
//   ctx.sim  the note's Sim (upright-model.js); ctx.a its regulation; ctx.m = measure(ctx.a)
//   ctx.view(name)                  turn to one of scene-upright.js's views
//   ctx.run(seconds) -> Promise     run the Sim that long (drawn as it goes, in slow motion if the test sets scale)
//   ctx.pause(seconds) -> Promise   wait in real time, the drawing still
//   ctx.say(text, warn)             the event line and the test's log over the picture (a toast if the log was closed)
//   ctx.release() -> Promise        let the key up and bring everything to rest
//   ctx.show(a, p) / ctx.show(null) draw a pose of its own (a hand on a part, the rail pulled) instead of the Sim
//   ctx.grade(id)                   upright-model.js grade() of ctx.m at the current skill level
//   ctx.lastEvent(type)             the Sim's latest event of that type since the test began (or since ctx.release)
// specs: what the test reveals; view: where it looks from; scale: slow motion (sim seconds per real second).
const MF = 450, FF = 1300;   // mm/s at the key front: a moderate and a hard blow (preview/upright.html VEL)
export const TESTS = {
  blowGauge: { label: 'Blow distance gauge', specs: ['blow'], view: 'head',
    run: async ctx => { await ctx.release(); await ctx.pause(1.5); } },
  // Steinway's and Spurlock's rail pull: the hammers follow the rail back until their butts sit on the jacks
  railPull: { label: 'Pull the hammer rail back gently', specs: ['lostMotion'], view: 'butt',
    run: async ctx => {
      await ctx.release();
      const { a, m } = ctx, rest = pose(a, 0), gr = gRail(a);
      const gTo = m.lostMotion > 0 ? gOnJack(rest.phi, rest.psi) : gr, pull = 1.5;   // the rail goes back 1.5 mm, the hammer as far as the jack lets it
      for (let i = 0; i <= 20; i++) { const t = i / 20; ctx.show({ ...a, railShim: a.railShim - pull * t }, { ...rest, g: gr + (gTo - gr) * Math.min(1, t * 1.5) }); await ctx.pause(0.04); }
      ctx.say(m.lostMotion <= 0 ? 'The hammer doesn\'t follow the rail: it already sits on the jack. No lost motion'
        : `The hammer followed the rail ${fmt(m.railFollow)} (${sixtyFourths(m.railFollow)}) before its butt sat on the jack. Steinway looks for about 1/64"; Spurlock\'s quick check, about 1/16"`, !ctx.grade('lostMotion').ok);
      await ctx.pause(1.2); ctx.show(null);
    } },
  // Igrec: depress the key lightly at the very top and watch when the hammer starts relative to the jack
  topPlay: { label: 'Press lightly at the top of the key', specs: ['lostMotion'], view: 'butt', scale: 0.2,
    run: async ctx => {
      await ctx.release();
      const { sim, m } = ctx, to = Math.min(sim.dip, Math.max(0, m.lostMotionKey) + 0.3);
      sim.press(to, 2); await ctx.run(to / 2 + 0.1);
      ctx.say(m.lostMotion <= 0 ? 'The hammer moved with the key at once: no lost motion'
        : `The key went down ${fmt(m.lostMotionKey)} before the hammer started up`, !ctx.grade('lostMotion').ok);
      await ctx.release();
    } },
  // Spurlock's final test: a hard blow, then the key let up very slowly with the sustain pedal down
  jackReturn: { label: 'Jack return: hard blow, sustain down, let the key up very slowly', specs: ['lostMotion'], view: 'butt', scale: 0.5,
    run: async ctx => {
      await ctx.release();
      const { sim } = ctx;
      sim.setPedal(true); await ctx.run(0.15);
      sim.press(sim.dip, FF); await ctx.run(0.35);
      sim.press(0, 10); await ctx.run(sim.dip / 10 + 0.2);
      const back = sim.jack === 'under';
      ctx.say(back ? 'The jack got back under the butt' : 'The jack hangs on the butt leather: it can\'t get back under. The note won\'t repeat', !back);
      sim.setPedal(false); await ctx.run(0.1);
    } },
  straightedge: { label: 'Lay the straightedge across the neighbors', specs: ['keyHeight'], view: 'whole',
    run: async ctx => { await ctx.release(); await ctx.pause(1.5); } },
  dipBlock: { label: 'Dip block at the key front', specs: ['dip'], view: 'whole', scale: 0.25,
    run: async ctx => { await ctx.release(); ctx.sim.press(ctx.sim.dip, 12); await ctx.run(ctx.sim.dip / 12 + 0.1); await ctx.pause(1.2); await ctx.release(); } },
  slowPress: { label: 'Press slowly to the bottom', specs: ['letoff', 'aftertouch'], view: 'action', scale: 1,
    run: async ctx => { await ctx.release(); ctx.sim.press(ctx.sim.dip, 6); await ctx.run(ctx.sim.dip / 6 + 0.2); await ctx.pause(1.2); } },
  // Spurlock: a medium blow, hold the key, look at the jack
  holdLook: { label: 'Medium blow, hold the key, look at the jack', specs: ['escapement'], view: 'butt', scale: 0.1,
    run: async ctx => {
      await ctx.release(); ctx.sim.press(ctx.sim.dip, MF); await ctx.run(0.4);
      const e = ctx.m.escapement;
      ctx.say(ctx.m.letoff == null ? (ctx.m.blocks ? 'The jack never trips out: it holds the hammer on the strings' : 'The jack never trips out: the hammer comes back onto its top')
        : e <= 0.05 ? 'The jack top rests against the butt leather' : `The jack top stands ${fmt(e)} clear of the butt leather`, !ctx.grade('escapement').ok);
      await ctx.pause(1.4);
    } },
  strikeHold: { label: 'Moderate blow and hold', specs: ['check'], view: 'check', scale: 0.1,
    run: async ctx => { await ctx.release(); ctx.sim.press(ctx.sim.dip, MF); await ctx.run(0.4); await ctx.pause(1.2); } },
  softWatch: { label: 'Soft pedal down: watch the wippen', specs: ['bridle'], view: 'check', scale: 0.25,
    run: async ctx => {
      await ctx.release(); const { sim } = ctx;
      sim.setSoft(true); await ctx.run(0.3);
      ctx.say(ctx.m.softLifts ? 'The wippen lifts off its capstan as the hammers go forward: the strap is too tight' : 'The wippen stays on its capstan',
        ctx.m.softLifts);
      await ctx.pause(1); sim.setSoft(false); await ctx.run(0.2);
    } },
  softBlow: { label: 'Soft pedal down: blow distance gauge', specs: ['softPedal'], view: 'head', scale: 0.25,
    run: async ctx => {
      await ctx.release(); const { sim, m } = ctx;
      sim.setSoft(true); await ctx.run(0.3);
      ctx.say(`Soft pedal down, the hammer is ${fmt(m.softBlow)} from the strings: ${Math.round(100 * m.softPedal)}% of the way there`, !ctx.grade('softPedal').ok);
      await ctx.pause(1.4); sim.setSoft(false); await ctx.run(0.2);
    } },
  damperSlow: { label: 'Press slowly: watch the damper', specs: ['damperTiming'], view: 'action', scale: 1,
    run: async ctx => { await ctx.release(); ctx.sim.press(ctx.sim.dip, 6); await ctx.run(ctx.sim.dip / 6 + 0.2); await ctx.pause(1); } },
  // ---------- the parts' condition (C5): looked at, or tried by hand ----------
  inspectLeather: { label: 'Look at the butt leather and the catcher\'s buckskin', specs: ['buttLeather', 'catcherLeather'], view: 'butt',
    run: async ctx => {
      await ctx.release(); await ctx.pause(1.2);
      const d = DAMAGE[ctx.m.damage], spec = d?.spec;
      ctx.say(spec === 'buttLeather' ? `You see ${d.signs}` : 'The butt leather is firm and even: no groove', spec === 'buttLeather');
      ctx.view('check'); await ctx.pause(1.4);
      ctx.say(spec === 'catcherLeather' ? `You see ${d.signs}` : 'The catcher\'s buckskin has its nap: not worn smooth', spec === 'catcherLeather');
      await ctx.pause(1);
    } },
  // the jack pushed out by its top and let go: its spring brings it back (drawn: ctx.show)
  jackPush: { label: 'Push the jack out from under the butt and let it go', specs: ['jackSpring'], view: 'butt',
    run: async ctx => {
      await ctx.release();
      const { a, m } = ctx, p = pose(a, 0), out = p.psi + 0.14, k = DAMAGE[m.damage]?.dyn?.jackRate ?? 1;
      const at = psi => ({ ...p, psi });
      for (let i = 1; i <= 10; i++) { ctx.show(a, at(p.psi + (out - p.psi) * i / 10)); await ctx.pause(0.04); }
      await ctx.pause(0.4);
      // back at the spring's rate: about 6 frames sound, 50 weak; broken, it stays out
      if (k > 0) { const n = Math.round(6 / Math.max(k, 0.12)); for (let i = 1; i <= n; i++) { ctx.show(a, at(out - (out - p.psi) * i / n)); await ctx.pause(0.03); } }
      ctx.say(k >= 1 ? 'Let go, the jack springs straight back under the butt' : k > 0 ? 'Let go, the jack creeps back: its spring is weak' : 'Let go, the jack stays out: its spring is broken', k < 1);
      await ctx.pause(1.2); ctx.show(null);
    } },
  // the hammer lifted toward the strings by hand and let go: the butt spring and gravity bring it back to the rail
  hammerLift: { label: 'Lift the hammer by hand and let it go', specs: ['buttSpring', 'buttCenter'], view: 'action', scale: 0.25,
    run: async ctx => {
      await ctx.release();
      const { sim, a } = ctx, g0 = gRail(a);
      sim.g = g0 + 0.45 * (gString() - g0); sim.w = 0;   // short of where the strap would go taut and lift the wippen
      const t0 = sim.t; let back = null;
      for (let i = 0; i < 12 && back === null; i++) { await ctx.run(0.05); back = ctx.lastEvent('rail')?.t ?? null; }
      const ms = back === null ? null : Math.round(1000 * (back - t0)), d = DAMAGE[ctx.m.damage];
      ctx.say(d?.spec === 'buttCenter' ? `It comes back slowly${ms != null ? `, ${ms} ms` : ''}, dragging on its center pin`
        : d?.spec === 'buttSpring' ? `It falls back on its own weight${ms != null ? `, ${ms} ms` : ''}: the butt spring isn\'t pushing`
        : `It springs back to the rail in ${ms ?? '—'} ms`, d?.spec === 'buttCenter' || d?.spec === 'buttSpring');
      await ctx.run(0.2); await ctx.pause(0.6);
    } },
  strapLook: { label: 'Look at the bridle strap', specs: ['strap'], view: 'check',
    run: async ctx => { await ctx.release(); await ctx.pause(1.2); const d = DAMAGE[ctx.m.damage];
      ctx.say(d?.spec === 'strap' ? `You see ${d.signs}` : 'The strap is whole and hooked on its wire', d?.spec === 'strap'); await ctx.pause(1); } },
  // the damper lever pulled off its spoon and let go: its spring should snap it back (Igrec)
  damperPull: { label: 'Pull the damper lever off the spoon and let it go', specs: ['damperSpring'], view: 'damper',
    run: async ctx => {
      await ctx.release();
      const { a, m } = ctx, p = pose(a, 0), k = DAMAGE[m.damage]?.dyn?.damperAlpha ?? 1, top = 0.06;
      const at = dl => ({ ...p, dl });
      for (let i = 1; i <= 10; i++) { ctx.show(a, at(top * i / 10)); await ctx.pause(0.04); }
      await ctx.pause(0.4);
      if (k > 0) { const n = Math.round(4 / Math.sqrt(Math.max(k, 0.12))); for (let i = 1; i <= n; i++) { ctx.show(a, at(top * (1 - (i / n) ** 2))); await ctx.pause(0.03); } }
      ctx.say(k >= 1 ? 'Let go, it snaps back onto the strings' : k > 0 ? 'Let go, it drifts back to the strings: its spring is weak' : 'Let go, it stays off the strings: its spring is broken', k < 1);
      await ctx.pause(1.2); ctx.show(null);
    } },
};
// the repairs a step or a fault can call for: each puts right the damage that its spec finds
export const REPAIRS = [...new Map(Object.values(DAMAGE).map(d => [d.repair, { label: d.repair, spec: d.spec }])).values()];

// ---------- readings: a spec's value in words ----------
export const SPEC_NAMES = {
  keyHeight: 'Key height (vs neighbors)', dip: 'Dip', blow: 'Blow', lostMotion: 'Lost motion (at the jack)', letoff: 'Let-off',
  aftertouch: 'Aftertouch', escapement: 'Jack clear of the butt, key held', check: 'Checking', bridle: 'Strap slack at rest',
  softPedal: 'Soft pedal: share of the blow', damperTiming: 'Damper starts: share of the blow',
  buttLeather: 'Butt leather', catcherLeather: 'Catcher buckskin', jackSpring: 'Jack spring', damperSpring: 'Damper spring',
  buttSpring: 'Butt spring', buttCenter: 'Butt center', strap: 'Bridle strap',
};
const CONDITION = { buttLeather: 'firm, not grooved', catcherLeather: 'not worn smooth', jackSpring: 'springs the jack back', damperSpring: 'snaps the damper back',
  buttSpring: 'brings the hammer back briskly', buttCenter: 'free, not wobbly', strap: 'whole and hooked' };
// a spec's band as the step shows it
export function bandText(id) {
  const s = SPEC[id];
  if (id === 'keyHeight') return 'level with the neighbors';
  if (CONDITION[id]) return CONDITION[id];
  if (id === 'bridle') return 'soft pedal down: the wippen stays put';
  if (id === 'lostMotion') return 'the least that lets the jack return';
  if (id === 'damperTiming' || id === 'softPedal') return `${Math.round(100 * (s.target - s.tol))}-${Math.round(100 * (s.target + s.tol))}%`;
  const [lo, hi] = s.lo !== undefined ? [s.lo, s.hi] : [s.target - s.tol, s.target + s.tol];
  // small ones in thousandths, as Igrec gives aftertouch; the rest in 64ths
  const inch = hi < 2 ? `${(lo / IN).toFixed(3).slice(1)}-${(hi / IN).toFixed(3).slice(1)}"` : `${frac(lo, Math.ceil)} to ${frac(hi, Math.floor)}`;
  return `${dec(lo)}-${dec(hi)} mm (${inch})`;
}
// a 64th of an inch inside the band (round: Math.ceil for its low end, Math.floor for its high end), as a technician writes it
function frac(mm, round) {
  let n = round(mm / IN * 64 + (round === Math.ceil ? -1e-6 : 1e-6)), d = 64;
  const whole = Math.floor(n / 64); n -= whole * 64;
  while (n && n % 2 === 0) { n /= 2; d /= 2; }
  return `${whole ? whole + (n ? '-' : '') : ''}${n ? `${n}/${d}` : whole ? '' : '0'}"`;
}
export function readingText(id, m) {
  const v = m[id];
  if (CONDITION[id]) { const d = DAMAGE[m.damage]; return d?.spec === id ? d.name.toLowerCase() : 'sound'; }
  if (id === 'keyHeight') return Math.abs(v) < 0.05 ? 'level' : `${fmt(Math.abs(v))} ${v > 0 ? 'high' : 'low'}`;
  if (id === 'damperTiming' || id === 'softPedal') return v == null ? '—' : `${Math.round(100 * v)}%`;
  if (id === 'bridle') return fmt(m.strapSlack);
  return fmt(v);
}

// ---------- callouts: measurement lines drawn on the action (sim frame, mm) ----------
// st: { a, m, p (the drawn pose), events (the Sim's since the test began), shown(id) (is that reading revealed) }
export function callouts({ a, m, p, events = [], shown }) {
  const out = [], z = 14, lineSim = (id, p1, p2, text) => out.push({ id, from: [...p1, z], to: [...p2, z], text });
  const line = (id, p1, p2, text) => lineSim(id, toSim(p1), toSim(p2), text);   // action-frame points
  const atRest = p.d < 0.01, soft = (p.soft ?? 0) > 0.5;
  const toString = (g, id, text) => { const c = crownAt(g); line(id, c, [c[0] + stringGap(g), c[1]], text); };
  if (shown('blow') && atRest && !soft) toString(p.g, 'blow', `blow ${fmt(stringGap(p.g))}`);
  if (shown('softPedal') && atRest && soft) toString(p.g, 'soft', `soft pedal: ${fmt(stringGap(p.g))}`);
  const lo = events.find(e => e.type === 'letoff');
  if (shown('letoff') && lo && !lo.flown && !events.some(e => e.type === 'strike')) toString(lo.g, 'letoff', `let off ${fmt(lo.dist)}`);
  const dm = events.find(e => e.type === 'damperup' && e.d > 0.01);   // the key's lift, not the sustain pedal's
  if (shown('damperTiming') && dm && m.blow && !events.some(e => e.type === 'strike')) toString(dm.g, 'damper', `damper starts: ${Math.round(100 * (1 - stringGap(dm.g) / m.blow))}% of the blow`);
  if (shown('check') && p.on !== 'under' && p.d > 0.9 * m.dip && events.some(e => e.type === 'checked')) toString(p.g, 'check', `checked ${fmt(stringGap(p.g))}`);
  if (shown('escapement') && p.on === 'off' && p.d > 0.9 * m.dip) {
    // the jack's top corner to the nearest point of the butt cushion
    const c = jackPt(p.phi, p.psi, CORNER), cush = TRACE.buttCushion.map(q => turn(q, CENTER.butt, -p.g));
    const near = cush.reduce((b, q) => Math.hypot(q[0] - c[0], q[1] - c[1]) < Math.hypot(b[0] - c[0], b[1] - c[1]) ? q : b);
    line('escape', c, near, `jack clear ${fmt(m.escapement)}`);
  }
  // the key's front (sim frame): its top against the neighbors' (the straightedge), and how far it has gone down
  if (shown('keyHeight') && atRest) { const f = keyFrontTop(a, 0); lineSim('keyHeight', f, [f[0], NEIGHBOR_H], readingText('keyHeight', m)); }
  if (shown('dip') && p.d > 0.05) {
    const f0 = keyFrontTop(a, 0), f1 = keyFrontTop(a, p.d);
    lineSim('dip', [f0[0] - 4, f0[1]], [f0[0] - 4, f1[1]], `${fmt(p.d)}${p.d >= m.dip - 0.01 ? ' (dip)' : ''}`);
  }
  return out;
}

// ---------- Find the fault (C5): a customer's complaint, one cause ----------
// Each case is one cause (a knob off, or a worn or broken part), sized so the action shows the complaint and nothing
// bigger, checked in play by tests/upright-scenarios.test.mjs (protocol 3.4). make(f): the change from the factory f.
// Complaints are worded for what the sim shows; the cause and fix name the source where there is one.
// reads: the readings that point at the cause. also: the other readings the same cause drags out of range with it; the
// answer names them (alsoText), so a student who found three readings out isn't left thinking there were three faults
// (critique 2026-11-09, U20). The scenario test checks that reads and also are exactly what grades out.
export const SCENARIOS = [
  { id: 'stickyJack', complaint: 'If I let a key up slowly, it sometimes won\'t play the next time.', make: f => ({ capstan: f.capstan + 0.1 }),
    reads: ['lostMotion'], also: ['check', 'escapement'],
    cause: 'Too little lost motion: the capstan is up so far that the jack can\'t get back under the butt on a slow release (Steinway, Spurlock)',
    fix: 'Turn the capstan down a little, until the jack return test passes' },
  { id: 'looseKeys', complaint: 'The keys feel loose and clunky at the top.', make: f => ({ capstan: f.capstan - 0.35 }),
    reads: ['lostMotion'], also: ['check', 'aftertouch', 'escapement'],
    cause: 'Too much lost motion: the capstan is low, so the key moves before the hammer does (Spurlock)',
    fix: 'Raise the capstan until the hammer just follows a pulled rail' },
  { id: 'letoffClose', complaint: 'Some notes buzz or bounce against the string when I play them, even softly.', make: f => ({ letoff: f.letoff - 0.3 }),
    reads: ['letoff'], also: ['aftertouch', 'escapement'],
    cause: 'Let-off too close: the jack is still under the butt when the hammer comes back from the strings, so the hammer bounces on it and strikes again. (Spurlock finds 1/8" a good figure, and warns that much closer blocks on hard blows)',
    fix: 'Lower the let-off button until the hammer lets off 1/8" from the strings' },
  { id: 'blocking', complaint: 'This note is dead: a thud, the key stops short, and the hammer stays jammed against the string until I let go.', make: f => ({ letoff: f.letoff - 0.6 }),
    reads: ['letoff'], also: ['aftertouch', 'escapement', 'check'],
    cause: 'The hammer blocks: the let-off button is so high that the jack never trips, so it pushes the hammer onto the strings and holds it there. Spurlock warns that a let-off set too close blocks on hard blows; set past the strings, as here, it blocks on every blow',
    fix: 'Lower the let-off button until the hammer lets off 1/8" from the strings' },
  { id: 'letoffFar', complaint: 'I can\'t play this note quietly: it won\'t sound unless I play it harder.', make: f => ({ letoff: f.letoff + 0.5 }),
    reads: ['letoff'], also: ['aftertouch', 'escapement'],
    cause: 'Let-off too far: the jack lets go far from the strings, so a soft blow can run out before it gets there (Estey: let-off much more than 1/8" needs work)',
    fix: 'Raise the let-off button until the hammer lets off 1/8" from the strings' },
  { id: 'blubber', complaint: 'Unless I really hit this note, its hammer bobbles against the string and hangs there until I let the key go.', make: f => { const a = { ...f, railShim: f.railShim - 2.4 }; return { railShim: a.railShim, capstan: capstanFor(a) }; },
    reads: ['blow'], also: ['letoff', 'aftertouch', 'escapement', 'check'],
    cause: 'No jack escapement: the blow is too long for the dip, so the key bottoms before the jack trips out from under the butt. The hammer comes back from the string onto the jack\'s top and bobbles there (Spurlock: blubbering hammers); only a hard blow, which throws the wippen up past the key, trips the jack',
    fix: 'Shorten the blow (shim the rail felts) and reset the lost motion, until the jack stands 1/16" to 1/8" clear' },
  { id: 'checkFar', complaint: 'When I hold this key after a loud note, its hammer falls back much farther than the others.', make: f => ({ backcheck: f.backcheck - 0.8 }),
    reads: ['check'], also: [],
    cause: 'The backcheck is bent too far from the catcher, so it catches the hammer late (Spurlock)',
    fix: 'Bend the backcheck wire toward the catcher until the hammer checks 1/2" to 5/8" from the strings' },
  { id: 'bridleTight', complaint: 'When I use the soft pedal, some keys go out of level.', make: f => ({ bridle: f.bridle + 3 }),
    reads: ['bridle'], also: [],
    cause: 'The bridle strap is too tight: the soft pedal, moving the hammers, lifts the wippen off its capstan (Spurlock, Steinway)',
    fix: 'Bend the bridle wire toward the catcher until the soft pedal leaves the wippen on its capstan' },
  { id: 'softWeak', complaint: 'The soft pedal doesn\'t do much.', make: f => ({ softFelt: f.softFelt - 5 }),
    reads: ['softPedal'], also: [],
    cause: 'The soft pedal\'s travel is short: it moves the hammers only a quarter of the way to the strings (Spurlock: halfway)',
    fix: 'Thin the soft pedal\'s blocking felt until the hammers come halfway to the strings' },
  { id: 'spoonEarly', complaint: 'The keys feel heavy right at the start of the stroke.', make: f => ({ spoon: f.spoon + 0.8 }),
    reads: ['damperTiming'], also: [],
    cause: 'The spoon lifts the damper too early: the key takes up the damper spring almost at once (Spurlock: spoons weigh in the touch)',
    fix: 'Bend the spoon away from the damper lever until the damper starts with the hammer halfway' },
  { id: 'buttLeather', complaint: 'This key feels loose and clunky at the top, even after the last regulation.', make: () => ({ damage: 'buttLeather' }),
    reads: ['buttLeather', 'lostMotion'], also: ['check', 'aftertouch', 'escapement', 'bridle'],
    cause: 'The butt leather is worn past use: a groove where the jack lifts it adds lost motion. Raising the capstan takes that out for now (Spurlock), but leather worn this far is re-covered (his first check, that leathers are usable), and the sim counts it until it is. The sim models the groove as its depth and nothing else: 0.23 mm more lost motion',
    fix: 'Re-cover the butt; then set the lost motion' },
  { id: 'catcherLeather', complaint: 'When I hold a loud note, the hammer drops back farther than it used to.', make: () => ({ damage: 'catcherLeather' }),
    reads: ['catcherLeather', 'check'], also: [],
    cause: 'The catcher\'s buckskin is worn thin and slick, so the backcheck catches it late. The sim models only the thickness the buckskin has lost: the hammer checks farther off. On a real catcher, slick buckskin also lets a hard blow slide through the check, which the sim doesn\'t show',
    fix: 'Re-cover the catcher with new buckskin; then check the checking' },
  { id: 'jackSpringBroken', complaint: 'One note plays once, then won\'t play again.', make: () => ({ damage: 'jackSpringBroken' }),
    reads: ['jackSpring'], also: [],
    cause: 'The jack spring is broken: after let-off nothing brings the jack back under the butt (Igrec: the spring sits in the jack\'s notch)',
    fix: 'Replace the jack spring' },
  { id: 'jackSpringWeak', complaint: 'Fast repeated notes don\'t all sound on this key.', make: () => ({ damage: 'jackSpringWeak' }),
    reads: ['jackSpring'], also: [],
    cause: 'The jack spring is weak: the jack creeps back under the butt, too slowly for a quick repeat. Slow repeats still sound',
    fix: 'Replace the jack spring' },
  { id: 'buttSpringBroken', complaint: 'This hammer is lazy: lifted and let go it drifts back instead of snapping back, and quick notes on it feel late.', make: () => ({ damage: 'buttSpringBroken' }),
    reads: ['buttSpring'], also: [],
    cause: 'The butt spring is broken or off its cord: only the hammer\'s own weight, and the strap\'s tug, bring it home. Filmed, a hammer came back from check in 118 ms without its spring against 110 with it, and in 218 against 126 with the strap off as well (Ellis\'s test in PTG\'s high-speed clips)',
    fix: 'Replace the butt spring' },
  { id: 'damperSpringBroken', complaint: 'One note keeps ringing after I let it go.', make: () => ({ damage: 'damperSpringBroken' }),
    reads: ['damperSpring'], also: [],
    cause: 'The damper spring is broken: nothing brings the damper back to the strings (Igrec)', fix: 'Replace the damper spring' },
  { id: 'damperSpringWeak', complaint: 'One note rings on for a moment after I let it go.', make: () => ({ damage: 'damperSpringWeak' }),
    reads: ['damperSpring'], also: [],
    cause: 'The damper spring is weak: the damper drifts back to the strings (Igrec)', fix: 'Replace the damper spring' },
  { id: 'buttCenterTight', complaint: 'This key feels stiff, and soft notes don\'t always sound.', make: () => ({ damage: 'buttCenterTight' }),
    reads: ['buttCenter'], also: [],
    cause: 'The butt center is tight: the hammer drags on its pin (Igrec\'s table gives its healthy range)', fix: 'Ease or repin the butt center' },
  { id: 'strapBroken', complaint: 'Quick repeated notes feel slow on this key.', make: () => ({ damage: 'strapBroken' }),
    reads: ['strap'], also: [],
    cause: 'The bridle strap is broken: nothing helps the hammer back from the backcheck on a quick release, so it gets home later (Ellis: 126 ms against 110 on film; about 125 against 111 here)', fix: 'Replace the bridle strap' },
];
// what else a case's one cause put out of range, for the answer
export function alsoText(sc) {
  if (!sc.also?.length) return '';
  const short = { check: 'checking', aftertouch: 'aftertouch', escapement: 'the jack\'s clearance', bridle: 'the bridle strap\'s soft pedal test', letoff: 'let-off', lostMotion: 'lost motion' };
  const names = sc.also.map(id => short[id]);
  return `The same cause also puts out ${names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0]}: ${names.length > 1 ? 'they come' : 'it comes'} back when the cause is put right, with no knob of ${names.length > 1 ? 'their' : 'its'} own turned`;
}

// ---------- when aftertouch or the jack's clearance won't come in (critique 2026-11-09, U3) ----------
// Both are set by other readings, and a reading can sit inside its own range and still be what keeps these two out. So
// the aftertouch step and the final check say what to go back to: the reading that sits farthest from its target on
// the side that hurts, or, when all of them are on target, which way to move the blow or the dip (Igrec and Spurlock
// set these two with blow and dip). Returns null when both pass, else { spec, to, dir, text }: the reading to move, to
// its target (to) or one step (dir: +1 raises it), and the sentence for the student. tests/upright-student.test.mjs
// follows it as a student who otherwise stops at green.
// each: the reading, +1 if more of it gives more aftertouch and clearance, its name mid-sentence, its low and high side
const SETS_AFTERTOUCH = [['letoff', +1, 'let-off', 'close', 'far'], ['lostMotion', -1, 'lost motion', 'tight', 'loose'], ['check', -1, 'checking', 'close', 'far'],
  ['blow', -1, 'blow', 'short', 'long'], ['dip', +1, 'dip', 'shallow', 'deep']];
export function advise(m, k = 1) {
  const at = grade('aftertouch', m, k), es = grade('escapement', m, k);
  if (at.ok && es.ok) return null;
  if (m.letoff == null) return { spec: 'letoff', text: m.blocks ? 'The jack never lets off: set the let-off first' : 'The key bottoms before the jack trips: check the blow, dip and let-off, in that order' };
  // which way they have to go: more (too little aftertouch or clearance) or less
  const more = !at.ok ? !m.jammed && m.aftertouch < SPEC.aftertouch.lo : m.escapement < SPEC.escapement.lo;
  let worst = null;
  for (const [id, sign, name, lowSide, highSide] of SETS_AFTERTOUCH) {
    if (id === 'check' && at.ok === false && es.ok) continue;   // checking moves the clearance, not the aftertouch
    const s = SPEC[id], [lo, hi] = band(s), off = (m[id] - s.target) * sign * (more ? -1 : 1);   // > 0: on the side that hurts
    const share = off / ((hi - lo) / 2);
    if (share > 0.2 && (!worst || share > worst.share)) worst = { share, spec: id, to: s.target, text: `${name[0].toUpperCase()}${name.slice(1)} is ${fmt(m[id])}, on the ${m[id] < s.target ? lowSide : highSide} side of its ${fmt(s.target)}: bring it to that figure first, then look again` };
  }
  if (worst) return worst;
  // everything on target: the blow, a step toward the middle of the window (longer gives less of both), while it stays
  // inside its range; else the dip
  const stepBlow = 0.22, [bl, bh] = band(SPEC.blow), [dl, dh] = band(SPEC.dip);
  if (more ? m.blow - stepBlow >= bl : m.blow + stepBlow <= bh) return { spec: 'blow', dir: more ? -1 : +1,
    text: more ? 'Shorten the blow a step (shim the rail felts) and reset the lost motion, then look again' : 'Lengthen the blow a step (take a shim out) and reset the lost motion, then look again' };
  if (more ? m.dip + 0.05 <= dh : m.dip - 0.05 >= dl) return { spec: 'dip', dir: more ? +1 : -1, text: more ? 'Add a hair of dip (a thinner front punching), then look again' : 'Take out a hair of dip (a paper front punching), then look again' };
  return { spec: 'blow', text: 'Blow and dip are at the ends of their ranges: go through the sequence again from the blow' };
}

// ---------- the de-regulated start ----------
// Learn's key starts out of regulation on purpose (the grand's 4adbd5f), every knob off by a random amount, but short of
// blocking, missing the backcheck, scraping, jamming or the strap lifting the wippen at rest (protocol 3.4, eb4b968).
// rng: () => [0, 1). Off by up to: key height 0.45 mm, dip 0.6, blow 2.2, lost motion 0.15, let-off 2, checking about
// 8 mm, the damper's start 15% of the blow, the soft pedal 15%.
const SPREAD = { balPunch: 0.2, frontPunch: 0.3, railShim: 1, capstan: 0.12, letoff: 0.3, backcheck: 0.4, spoon: 0.5, bridle: 3, softFelt: 3 };
export function deregulated(rng = Math.random) {
  for (let tries = 0; tries < 200; tries++) {
    const a = { ...FACTORY };
    for (const [k, s] of Object.entries(SPREAD)) {
      const d = ADJ.find(x => x.id === k), v = FACTORY[k] + (2 * rng() - 1) * s;
      a[k] = Math.max(d.min, Math.min(d.max, Math.round(v / d.step) * d.step));
    }
    if (fairStart(a)) return a;
  }
  return { ...FACTORY };
}
// a start short of blocking, missing, scraping, jamming or a taut strap at rest
export function fairStart(a) {
  const m = measure(a);
  return !(m.letoff == null || m.check == null || m.checkScrapes || m.jammed || m.strapSlack <= 0 || m.damperTiming == null);
}
// a small seeded generator, so the tests and the student emulation see the same keys every run
export function seeded(seed) {
  let t = seed >>> 0;
  return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
}

// ---------- From the bench ----------
// Tips and tools from working technicians, credited (the grand's rule, tips.js: forum posters are named, Greg
// 2026-11-06). Keyed by step (a spec id, or an info step's id). Research notes: research/upright/bench-tips.md.
const SPURLOCK = { who: 'Bill Spurlock', src: 'Vertical Regulation (Spurlock Specialty Tools)', url: 'https://spurlockspecialtytools.com/index_htm_files/vreg.pdf' };
const STEINWAY = { who: 'Steinway & Sons', src: 'World-Wide Technical Reference Guide, ch. 5 Upright Regulation', url: 'https://www.indyptg.org/PTG/SteinwayServiceManuals/Chp5.pdf' };
const IGREC = { who: 'Mario Igrec', src: 'Pianos Inside Out, 2013 (sample pages)', url: 'https://www.pianosinsideout.com/regbig.pdf' };
const ELLIS = { who: 'Jim Ellis RPT', src: 'Bridle Strap Function, Piano Technicians Journal, Dec 1997' };
export const PT = (who, year, url) => ({ who, src: `PTG Pianotech forum, ${year}`, url, forum: true });
// how a tip's credit reads: forum posters by name unless NAME_FORUM_POSTERS is off (then only those who said yes)
export const creditOf = t => t.forum && !NAME_FORUM_POSTERS && !NAMED_OK.has(t.who) ? t.src : `${t.who}, ${t.src}`;

const MMD = (who, year, url) => ({ who, src: `Mechanical Music Digest, ${year}`, url });
const PLAYER_CARE = url => ({ who: 'John A. Tuttle', src: 'Player-Care, Regulating the piano action', url });
// Tips that disagree with a spec the sim grades say which one it grades (protocol 3.2 rule 5).
export const TIPS = {
  prep: [
    { text: 'Diagnose before changing anything: the shims and punchings already in a vertical record what earlier techs found. See how it plays, then test-regulate a few notes with changes you can undo. A maker\'s specs are a starting point, not a verdict.', ...PT('Ed Sutton', 2025, 'https://my.ptg.org/discussion/how-strictly-to-follow-manufacturers-keyboard-regulation-specs-keyframe-shimming') },
  ],
  seat: [
    { text: 'Finding the strike point: hang a hammer on the last note of a section, play it and rock the action up and down for the sweet spot, then match the other end of the section and fill in with a straightedge. Do it in the piano; the treble is the touchy end.', ...MMD('Jon Page', 1998, 'https://www.mmdigest.com/Archives/Digests/199801/1998.01.05.21.html') },
    { text: 'When regulation won\'t hold or the dampers lift far too early, look for a loose action: pull on each bracket where it sits on its stud to feel for wiggle, and check under the keybed for missing wedges.', ...PT('Paul McCloud', 2023, 'https://my.ptg.org/discussion/kawai-607-regulation') },
  ],
  align: [
    { text: 'Bass hammer tails rubbing their neighbors: take a few mm off with an 80 or 120 grit sanding paddle, holding the shank with pliers and bracing against the hammer rail so the flange takes no strain. For more, take the hammer off.', ...PT('Wim Blees and Rex Roseman', 2024, 'https://my.ptg.org/discussion/tapering-upright-hammers') },
    { text: 'The capstan wire is a touch adjustment too: bent back from the middle of the wippen cushion the touch gets heavier, forward lighter (3 mm back added 4 to 6 g on a Yamaha U3). It changes the action ratio, so dip, aftertouch and checking need refining after.', who: 'Yuji Nakamura ARPT', src: 'Controlling the Touchweight of the Upright Action, Part 2',
      url: 'https://yuji-nakamura-sddl.squarespace.com/s/Controlling-the-touch-weight-of-the-upright-action-2-PDF.pdf' },
  ],
  blow: [
    { text: 'Choose blow and dip on two or three sample notes: let-off at 1/8", a reasonable dip, slight lost motion, checking at 5/8", then hold a medium blow and look at the jack. Lengthen or shorten the blow until the jack stands 1/16" to 1/8" clear.', ...SPURLOCK },
    { text: 'Kawai prints a 46 mm blow, but in practice it usually lands at 42 to 43 mm: moving the rail back far enough for 46 leans the shanks back too far.', ...PT('Don Mannino', 2023, 'https://my.ptg.org/discussion/kawai-607-regulation') },
    { text: 'If aftertouch comes too low in the keystroke, shorten the blow.', ...MMD('Donald Dusenbury', 2002, 'https://mmdigest.com/Archives/Digests/200208/2002.08.23.06.html') },
    { text: 'Wear moves the numbers the same way every time: dip grows as the rail cloths pack, let-off closes as the button felt packs, blow grows as hammers and rest felts wear, checking closes. Touch up one and the rest keep drifting.', ...MMD('John Rhodes RPT', 2010, 'https://www.mmdigest.com/Archives/Digests/201002/2010.02.15.07.html') },
  ],
  lostMotion: [
    { text: 'New pianos often arrive with the hammer rail resting too far back, its rest felts settled in shipping. A piece of bushing cloth or a cardboard balance punching on each rest felt restores the lost motion quickly.', ...SPURLOCK },
    { text: 'The pull and tap checks are quick, but finish every key with the jack return test: it saves the call-back for a "sticking key".', ...SPURLOCK },
    { text: 'A two-way capstan check: lift the hammer rail a couple of mm by the soft pedal lever and the hammer should move at once; then press the key so lightly the wippen only just lifts, and the hammer must not move yet.', ...MMD('Roger Waring', 2003, 'https://www.mmdigest.com/Archives/Digests/200301/2003.01.20.10.html') },
    { text: 'Leave a few thousandths rather than none: swelling wood can stop the jack getting back under. Right feels slightly spongy, and the backcheck moves a hair before the hammer. Only a technician should be able to feel it.', ...PLAYER_CARE('https://www.player-care.com/regulating-the-action.html') },
    { text: 'With unworn butts, Kawai sets its new uprights with the jack just supporting the hammer at rest, almost negative lost motion: pulling the rail back moves no hammer, and nor does pressing the back of the key. (The sim grades a gap that lets the jack return, Spurlock\'s rule.)', ...PT('Don Mannino', 2023, 'https://my.ptg.org/discussion/kawai-607-regulation') },
  ],
  keyHeight: [
    { text: 'Prop up the end white keys to hold the straightedge at the height you want, then lift and tap it to find the keys that are too high.', ...SPURLOCK },
    { text: 'A vertical\'s keybed bows with the humidity, so balance rail shims fitted when it was low end up too high. A low rail shows as shallow dip, weak blow, incomplete let-off, late checking, no aftertouch and shallow damper lift. Try pulling shims first.', ...PT('Ed Sutton', 2025, 'https://my.ptg.org/discussion/how-strictly-to-follow-manufacturers-keyboard-regulation-specs-keyframe-shimming') },
    { text: 'Techs disagree on the order: Steven Rosenthal levels the keys first, since key height changes everything after it; Paul McCloud sets the capstans first, since key height can\'t be read true until the lost motion is out. The sim follows Spurlock and Steinway: lost motion first.', ...PT('Steven Rosenthal and Paul McCloud', 2023, 'https://my.ptg.org/discussion/kawai-607-regulation') },
  ],
  dip: [
    { text: 'A dip block with a cross piece shimmed to your chosen dip: it barely clicks on the neighbors when the dip is right. Much faster than comparing block and keys by feel.', ...SPURLOCK },
    { text: 'Supply-house dip blocks vary: measure each one before you trust the number on it.', ...MMD('Richard Friedman', 2010, 'https://www.mmdigest.com/Archives/Digests/201002/2010.02.15.09.html') },
    { text: 'Judge dip by what the hammer does: press the key just to the front punching without squashing it, and the hammer should check with a solid catch. Too shallow and it bobbles; too deep and the backcheck pushes it forward.', ...MMD('Ben Gottfried', 2025, 'https://www.mmdigest.com/Archives/Digests/202507/2025.07.15.03.html') },
  ],
  letoff: [
    { text: 'Hang a tapered wooden block on the hammer rail between the shanks and the rail felt, and prop the rail forward until those hammers rest just over 1/8" from the strings. Play each key: at 1/8" let-off the hammer winks and knocks lightly on the block; wider, it doesn\'t wink; closer, it jumps toward the strings.', ...SPURLOCK },
    { text: 'Measure let-off to the spot where the hammer meets the string (its groove), not to the worn face beside it.', ...PLAYER_CARE('https://www.player-care.com/regulating-the-action.html') },
  ],
  aftertouch: [
    { text: 'For an exact aftertouch, put a cardboard punching of the wanted thickness on the front punching and press the key with a steady weight (8 to 10 oz.): just a little more pressure should take the hammer through let-off.', ...IGREC },
    { text: 'About a penny\'s thickness at the key, with a breaking feel at let-off. Too much and the jacks hit their stop and the action feels sluggish; too little and the hammers double-strike.', ...PT('Blaine Hebert', 2024, 'https://my.ptg.org/discussion/beginning-tech-questions') },
    { text: 'Judge dip and blow by the real gap between jack and butt with the key down, not by the printed numbers: odd geometry can bury the jacks at a "correct" dip and blow.', who: 'Dave Renaud', src: 'pianotech mailing list, 2013', url: 'https://groups.google.com/g/pianotech/c/vuJ2DV_nOpg', forum: true },
  ],
  check: [
    { text: 'Set the naturals\' checking first, then line the sharps\' backchecks up with a straightedge across the heads: if all capstans rise the same, all hammers check alike, and a sharp that checks closer has too much dip.', ...SPURLOCK },
    { text: 'As the action wears, keep the key dip and the hammers checking evenly, even at the cost of an uneven line of backchecks.', ...STEINWAY },
    { text: 'Some actions come checking an inch or more from the strings and repeat poorly; bringing them back to 5/8" cured most of the sticking.', ...PT('Steven Rosenthal', 2022, 'https://my.ptg.org/discussion/90s-baldwin-hamilton') },
    { text: 'If you have to bend the backcheck wires a long way to reach a good checking distance, suspect the dip first. (He likes about 3/4"; the sim grades 1/2" to 5/8".)', ...MMD('Ben Gottfried', 2025, 'https://www.mmdigest.com/Archives/Digests/202507/2025.07.15.03.html') },
  ],
  bridle: [
    { text: 'The bridle strap\'s main job is repetition: on a quick release, strap and butt spring together brought the hammer back from check fastest. Holding the wippens up with the action out is a side benefit.', ...ELLIS },
    { text: 'After the capstans, bend the bridle wires so the straps are taut but the wippens just don\'t move with the soft pedal all the way down. Bend an old wire in its middle, not where it leaves the wippen: corroded wire snaps there.', ...MMD('Bernt W. Damm', 1998, 'https://www.mmdigest.com/Archives/Digests/199801/1998.01.13.07.html') },
    { text: 'Fitting new clip-on straps: with the action out and the wippen hanging, leave about 1/4" to 3/8" between the top of the jack and the butt. Slide the clip along the catcher to set it, then fine-tune with the wire.', who: 'Howard Piano Industries', src: 'Piano Bridle Strap Replacement', url: 'https://www.howardpianoindustries.com/piano-bridle-strap-replacement/' },
  ],
  jackStop: [
    { text: 'On the first sample note, play mf and hold: the jack should sit a little clear of the butt. Then pull it back by hand to check there is about 1 mm more before the jack stop felt. Moving the rail that carries the felt resets let-off, so do it first.', ...PT('Don Mannino', 2023, 'https://my.ptg.org/discussion/kawai-607-regulation') },
  ],
  softPedal: [
    { text: 'With the soft pedal down and its play taken up, the hammer line should have come about halfway to the strings. A customer may feel little difference even when it works as designed.', ...PT('Terry Farrell', 2025, 'https://my.ptg.org/discussion/upright-soft-pedal') },
  ],
  dampers: [
    { text: 'A tapered hardwood wedge between the lift rail and the whippen moulding, pushed in until a third to half the dampers start to come off: bend the worst wires first, until every damper just budges at the same wedge setting. Check again the next day; a few won\'t hold.', who: 'Craig Brougher', src: 'Player-Care, Regulating Upright Dampers', url: 'https://www.player-care.com/dampers.html' },
    { text: 'Dampers skewed off to one side on a console: there\'s no need to retrain the felts. Bend the wire so the head sits square on the strings, and the felts follow. (Spurlock leaves a felt that has long sat off alone while it damps well.)', ...PT('Wim Blees', 2024, 'https://my.ptg.org/discussion/bent-damper-question') },
    { text: 'Block the pedal so most spoons start their damper at half the hammer\'s travel, then bend each wire until its felt just touches the strings with no pressure. What\'s left for the spoons is small.', ...MMD('Larry Broadmoore', 1997, 'https://www.mmdigest.com/Archives/Digests/199712/1997.12.26.18.html') },
  ],
  damperTiming: [
    { text: 'Spoon bending is done blind: tip the action back, watch the bender slip onto a spoon and hear its click, then find the spoons by feel. Tape on the handle marks how far in to reach.', ...SPURLOCK },
    { text: 'A thin blade on a combination handle is all you need. Get the dampers lifting evenly with the pedal first; an early lifter is usually a packed-down damper felt.', ...PT('Jon Page', 2022, 'https://my.ptg.org/discussion/damper-spoon-timing-article') },
    { text: 'Taking the keys out costs about 20 minutes and makes the spoons easy to reach. Lift each wippen until the hammer leaves the rail and keep lifting, watching the damper. Set the capstans right before touching the spoons.', ...PT('John Gunderson', 2022, 'https://my.ptg.org/discussion/damper-spoon-timing-article') },
    { text: 'Not good at bending blind? Set the end spoon of each section in the piano, then lay the action on the bench and bend each spoon until its lever lines up with a straightedge along the levers.', ...PT('David Love', 2022, 'https://my.ptg.org/discussion/damper-spoon-timing-article') },
    { text: 'He roughs in the spoons before the pedal: a spoon lifting too soon makes the dampers impossible to regulate to the lift rod. (Spurlock and the sim do the pedal first.) A chubby modern bender can be ground thinner to fit.', ...MMD('Art Reblitz', 2000, 'https://www.mmdigest.com/Archives/Digests/200006/2000.06.20.07.html') },
  ],
  sustain: [
    { text: 'Check the lost motion at the lift rod by pushing a few strings toward the soundboard: the dampers should follow by that much.', ...STEINWAY },
    { text: 'Once the dampers lift together with the rod, set the pedal so its tip moves about 1/4" before it takes up the dampers, so it can\'t hold them off the strings.', ...MMD('Art Reblitz', 2000, 'https://www.mmdigest.com/Archives/Digests/200006/2000.06.20.07.html') },
  ],
  damperReturn: [
    { text: 'Damper spring strength read at the key, as the difference of two downweights: roughly 30 g in the treble, 40 to 50 in the tenor, 70 to 80 in the bass. Too weak and dampers leak; too strong kills pianissimo and makes the touch heavy where the spoon meets the lever.', who: 'Yuji Nakamura ARPT',
      src: 'Controlling the Touchweight of the Upright Action, Part 1', url: 'https://yuji-nakamura-sddl.squarespace.com/s/Controlling-the-touch-weight-of-the-upright-action-1-PDF.pdf' },
    { text: 'Damper springs that are too strong slow the key, so the backcheck can\'t stop a bobbling hammer unless the blow is forceful. Weaken them a little.', who: 'Paul McCloud', src: 'pianotech mailing list, 2013', url: 'https://groups.google.com/g/pianotech/c/vuJ2DV_nOpg', forum: true },
  ],
  again: [
    { text: 'The soft pedal finds sluggish hammer flanges: hold the sustain pedal down to get the dampers out of the way, then press and slowly release the soft pedal. As the rail comes back, a slow hammer shows at once.', ...PT('Wim Blees', 2025, 'https://my.ptg.org/discussion/upright-soft-pedal-system-function') },
  ],
};
export const TOOLS = [
  { name: 'Tapered let-off block', who: 'Bill Spurlock', what: 'hung on the hammer rail to set let-off at 1/8" on many notes at once', url: SPURLOCK.url },
  { name: 'Cross-piece dip block', who: 'Bill Spurlock', what: 'clicks on the neighboring keys when the dip is right', url: SPURLOCK.url },
  { name: 'Damper-lift gauge', who: 'Bill Spurlock', what: 'propped against the strings at half the blow: each damper should just wink as its hammer bumps it', url: SPURLOCK.url },
  { name: 'Spoon benders, direct-blow and spinet', who: 'AMS Piano Tools, sold by Howard Piano Industries', what: 'reach the spoon round the wippen with the action in', url: 'https://www.howardpianoindustries.com/spoon-bender' },
  { name: 'Upright Damper Timing Tool', who: 'Renner USA', what: 'a clear gauge held to the strings by magnets, sighted through while bending spoons', url: 'https://rennerusa.com/online-store/Upright-Damper-Timing-Tool-p376212065' },
  { name: 'Upright Let-Off Gauge', who: 'Renner USA', what: 'a rail on the hammer rail behind the shanks to set a section\'s let-off', url: 'https://rennerusa.com/online-store/Upright-Let-Off-Gauge-p376215012' },
  { name: 'Upright Damper Spring Tension Tool', who: 'Renner USA', what: 'a weighted hook on the damper wire for even damper springs', url: 'https://rennerusa.com/online-store/Upright-Damper-Spring-Tension-Tool-p376203171' },
  { name: 'Flexible-shaft let-off regulating screwdriver', who: 'Jurgen Goering, Piano Forte Supply', what: 'reaches spade-tipped upright let-off screws and stays on while you test' },
  { name: 'Lost Motion Compensator', who: 'Kirk Burgett, Jamie Marks and Dana Mazzaglia, Wessell Nickel & Gross (US 8,541,671)', what: 'turns the wippen with the hammer rail, so the soft pedal opens no gap at the jack', url: 'https://patents.google.com/patent/US8541671' },
  { name: 'Damper wedge', who: 'Craig Brougher', what: 'a tapered hardwood wedge that lifts the dampers a little at a time to even them', url: 'https://www.player-care.com/dampers.html' },
  { name: 'Strap-cutting jig', who: 'Bernt W. Damm', what: 'a razor blade on a block cuts new bridle straps to one length', url: 'https://www.mmdigest.com/Archives/Digests/199801/1998.01.13.07.html' },
];
