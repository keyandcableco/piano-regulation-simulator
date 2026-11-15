// Upright damper spoon bender: AMS A-85 "Spoon Bender" (direct blow) bit in a Schaff No. 26 combination handle.
import * as THREE from 'three';
import { M, lathe, plate, bentRod } from './kit.js';
import { addHandle, restTilt, BIT_IN } from './combo-handle.js';
// NOTES
// Listed (Howard, AMS A-85): reaches the damper spoon from around the wippen without taking the action out; for
//   direct-blow actions (AMS sells a separate spinet spoon bender); used with the combination tool handle. No sizes.
// Estimated from Howard's 1000 px photo (its two photos are the same picture). No length is listed, so the scale is
//   the sleeve, taken as long as the A-61A damper wire regulator's (45 mm, scaled from that bit's listed 7 in):
//   0.2 mm/px, which also gives the A-61A's sleeve and rod diameters here (6.2 and 4.2 mm). Sleeve 6.5 x 45 mm with a
//   ground flat tang, rod 4.2 mm: 41 mm straight past the sleeve, a 25 degree bend, a 75 mm run, then a hook turned
//   down about 17 mm, ending in a round boss about 9 mm across and 7.5 mm long, its axis along the run and its slotted
//   face toward the handle. Overall about 160 mm along the bit.
// Not clear in the photo, so the sim's own: the hook's angle (the photo's angle of view makes it read 125 degrees;
//   drawn square to the run), and the slot: drawn 2.4 mm wide and 3 mm deep across the boss's face, in the plane of
//   the bends, with the hook entering the boss's side behind it (the photo seems to show the slot open on the hook's side). All the bends lie in one plane; the tool lies on the bench with that plane flat.
// The AMS bit is shown in Schaff's No. 26 handle (combo-handle.js), as the let-off regulator is.
// Confirm on Greg's tool: overall length, rod size, the bend angles and lengths from a top photo on a ruler, the
//   boss's size and how the slot is cut.

const X0 = BIT_IN, SLEEVE_R = 3.25, SLEEVE = 45, ROD_R = 2.1;
const RUN0 = 41, BEND = 25, RUN = 75, HOOK = 17;            // mm, degrees
const BOSS_R = 4.5, BOSS_L = 7.5, SLOT_W = 2.4, SLOT_D = 3, HOOK_AT = 1.6;   // HOOK_AT: the hook's centre behind the boss's middle
const rad = d => d * Math.PI / 180;

export default {
  id: 'spoon-bender',
  name: 'Spoon bender',
  what: 'A bent rod in a combination handle that reaches around the wippen to the damper spoon with the action in the piano. Its slotted tip catches the spoon, and a small twist or lever of the handle bends the spoon toward or away from the damper lever, which sets when the damper starts to lift. This one is for full-size uprights (direct blow); spinets take a different bender.',
  how: [
    'Set the capstans first. Raising a capstan lifts the wippen and its spoon closer to the damper lever, so the damper then lifts early (Paul McCloud).',
    'Feed the hook in beside the wippen and around behind it, and fit the slotted tip on the spoon. In the bass, enter at an angle, catch the spoon, then straighten the handle (John Gunderson).',
    'Bend the spoon toward the damper lever to lift the damper earlier, away from it to lift later. Keep the moves small: the spoons weigh in the touch, so make them even (Spurlock). If you lose the spoon, take out a key or two to find it (Jon Page).',
    'Press the key slowly and watch the damper: it should start to lift when the hammer is about halfway to the strings (Steinway, Spurlock).',
  ],
  dims: 'No sizes listed by AMS or Howard. Estimated from Howard\'s photo, scaled by the shank sleeve of AMS\'s 7 in damper wire regulator: about 6-1/4 in (160 mm) along the bit, rod about 4 mm, a 25 degree bend 41 mm past the sleeve, a 3 in (75 mm) run, then a hook about 11/16 in (17 mm) deep ending in a slotted boss about 3/8 in (9 mm) across. The hook\'s angle and the slot\'s shape are the sim\'s reading of the photo. Shown in the Schaff No. 26 combination handle, 5 in (127 mm).',
  steps: ['damperTiming'],
  credit: 'Modeled on the AMS Piano Tools A-85 Spoon Bender (direct blow), sold by Howard Piano Industries, from its catalog photo and listing; shown in a Schaff No. 26 combination handle.',
  upAxis: 'y', lengthAxis: 'x',
  build() {
    const tool = new THREE.Group(), chrome = M.chrome();
    const x1 = X0 + SLEEVE;
    // sleeve, its tang hidden in the chuck, and a short taper onto the rod
    tool.add(lathe([[0, X0], [SLEEVE_R - 0.4, X0], [SLEEVE_R, X0 + 0.4], [SLEEVE_R, x1 - 0.4], [SLEEVE_R - 0.3, x1],
      [ROD_R, x1 + 0.8], [ROD_R, x1 + 2], [0, x1 + 2]], chrome));
    // the rod in the bench plane: straight on, bent BEND toward +z, run, then a hook turned square to the run, the same way
    const d1 = new THREE.Vector3(Math.cos(rad(BEND)), 0, Math.sin(rad(BEND)));
    const d2 = new THREE.Vector3(Math.cos(rad(BEND + 90)), 0, Math.sin(rad(BEND + 90)));
    const p1 = new THREE.Vector3(x1 + 1, 0, 0), p2 = new THREE.Vector3(x1 + RUN0, 0, 0);
    const p3 = p2.clone().addScaledVector(d1, RUN), p4 = p3.clone().addScaledVector(d2, HOOK);
    tool.add(bentRod([p1, p2, p3, p4].map(p => p.toArray()), ROD_R, chrome, 5));
    // the boss on the hook's end: axis along the run, the slotted face toward the handle, the hook entering its side
    // behind the slot. Built with its axis along +x and the hook coming in along +z, then turned with the run.
    const boss = new THREE.Group();
    boss.add(lathe([[0, SLOT_D - BOSS_L / 2], [BOSS_R, SLOT_D - BOSS_L / 2], [BOSS_R, BOSS_L / 2 - 0.3], [BOSS_R - 0.3, BOSS_L / 2], [0, BOSS_L / 2]], chrome));
    // in front of the slot's floor, the two halves either side of it: circle segments, raised along the axis
    const a0 = Math.asin(SLOT_W / 2 / BOSS_R), seg = [];
    for (let i = 0; i <= 16; i++) { const a = a0 + (Math.PI - 2 * a0) * i / 16; seg.push([BOSS_R * Math.cos(a), BOSS_R * Math.sin(a)]); }
    for (const s of [1, -1]) {
      const half = plate(seg.map(([u, v]) => [u, s * v]), SLOT_D, chrome);
      half.rotation.y = Math.PI / 2; half.position.x = -BOSS_L / 2;   // its outline's u runs along -z, its v along y
      boss.add(half);
    }
    boss.rotation.y = -rad(BEND);                                     // +x onto the run, +z onto the hook
    boss.position.copy(p4).addScaledVector(d2, BOSS_R - 0.6).addScaledVector(d1, -HOOK_AT);
    tool.add(boss);
    addHandle(tool);
    tool.rotation.z = -restTilt(tool);
    const g = new THREE.Group(); g.add(tool);
    return g;
  },
};
