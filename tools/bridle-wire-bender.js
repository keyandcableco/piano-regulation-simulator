// Upright bridle wire bender: AMS A-96 "Backcheck & Bridle Wire Regulating Tool" bit in a Schaff No. 26 combination handle.
import * as THREE from 'three';
import { M, lathe, plate, arc } from './kit.js';
import { addHandle, restTilt, BIT_IN } from './combo-handle.js';
// NOTES
// Listed (Howard, AMS A-96): straight, 8 in (203 mm), chrome plated, made in USA, designed to work with the combination
//   tool handle; bends backcheck and bridle wires.
// Estimated from Howard's 1000 px photo, scaled to the listed 8 in (0.224 mm/px; the near end reads about 12% larger
//   than the far end, from the camera's angle): rod 1/4 in (6.35 mm; reads 6.4 to 7.8 along its length), its end
//   tapered over about 10 mm to a ground flat (read here as the tang that the chuck grips, as the AMS spoon bender and
//   damper wire regulator have on their sleeves), a square head 3/8 in (9.5 mm; reads 9.4 to 9.8) by 45 mm, and a
//   fork in its end about 2.8 mm wide and 8 mm deep. The fork's exact shape is not clear in the photo: past the open
//   slot one side face shows a darker pocket that may hook the wire; modelled as a plain through slot.
// The AMS bit is shown in Schaff's No. 26 handle (combo-handle.js), as the let-off regulator is.
// Confirm on Greg's tool: which end goes in the handle, rod and head sizes, the fork's width, depth and shape.

const LEN = 203.2, X0 = BIT_IN, TIP = X0 + LEN;
const ROD_R = 3.175, HEAD = 9.5, HEAD_L = 45, FORK_W = 2.8, FORK_D = 8, EASE = 0.4;

export default {
  id: 'bridle-wire-bender',
  name: 'Bridle wire bender',
  what: 'A straight 1/4 in rod in a combination handle, ending in a square head with a fork cut in its end. The fork goes over an upright bridle wire, or a backcheck wire, so it can be bent with the action in the piano. The bridle wire sets how slack the bridle strap hangs.',
  how: [
    'Set the bridles after the capstans (Bernt Damm). Press the soft pedal all the way and watch the wippens: none should move. One that lifts has its strap too tight.',
    'Fit the fork over the bridle wire about halfway up, not where it enters the wippen: old wire gets brittle there and snaps (Bernt Damm).',
    'Bend the top of the wire toward the player to take up slack, toward the catcher to let some out (Steinway). Then press the soft pedal again: the wippens must stay put, and the straps should still hold the wippens up when the action comes out.',
    'The same fork bends the backcheck wire: the backcheck toward the catcher checks the hammer closer to the strings, away from it farther.',
  ],
  dims: 'Listed by Howard: 8 in (203 mm), straight, chrome plated, for the combination handle. Estimated from Howard\'s photos: rod about 1/4 in (6.35 mm) with a tapered tang, square head about 3/8 in (9.5 mm) across and 1-3/4 in (45 mm) long, fork about 2.8 mm wide and 8 mm deep. Shown in the Schaff No. 26 combination handle, 5 in (127 mm).',
  steps: ['bridle', 'check'],
  credit: 'Modeled on the AMS Piano Tools A-96 Backcheck & Bridle Wire Regulating Tool, sold by Howard Piano Industries, from its catalog photos and listing; shown in a Schaff No. 26 combination handle.',
  upAxis: 'y', lengthAxis: 'x',
  build() {
    const tool = new THREE.Group(), chrome = M.chrome();
    const hx = TIP - HEAD_L;                              // where the square head starts
    // rod: the tapered tang in the chuck, then straight to the head (a little inside it)
    tool.add(lathe([[1.4, X0], [ROD_R, X0 + 10], [ROD_R, hx + 1], [0, hx + 1]], chrome));
    // square head, as seen from above with the fork cut in its end, raised the bar's thickness; the outline sits inside
    // the edges by the bevel, which rounds them back out to size (plate builds in x, y and rises along z: turned so it
    // rises along y)
    const h = HEAD / 2 - EASE, w = FORK_W / 2 + EASE, e = TIP - EASE, fb = TIP - FORK_D + FORK_W / 2;
    const top = [[hx + EASE, -h], [e, -h], [e, -w], ...arc(fb, 0, w, -Math.PI / 2, -Math.PI * 1.5, 8), [e, w], [e, h], [hx + EASE, h]];
    const head = plate(top, HEAD, chrome, { z0: -HEAD / 2, bevel: EASE });
    head.rotation.x = -Math.PI / 2;
    tool.add(head);
    addHandle(tool);
    tool.rotation.z = -restTilt(tool);
    const g = new THREE.Group(); g.add(tool);
    return g;
  },
};
