// Upright damper wire regulator: AMS A-61A "Piano Damper Wire Regulator" bit in a Schaff No. 26 combination handle.
import * as THREE from 'three';
import { M, lathe, plate, arc } from './kit.js';
import { addHandle, restTilt, BIT_IN } from './combo-handle.js';
// NOTES
// Listed (Howard, AMS A-61A): 7 in (178 mm), chrome plated, made in USA, works with the combination tool handle; comes
//   with a 45 degree slot or a straight slot. Inserted between the hammer shanks several notes away, it bends a damper
//   wire forward, back or sideways with the action in, mainly on verticals.
// Modelled: the straight slot (Howard's third and fourth photos; the first two show the 45 degree head).
// Estimated from Howard's 1000 px photos, scaled to the listed 7 in (0.214 mm/px; the far end reads about 12% smaller
//   than the near end, from the camera's angle): rod 4.0 mm (reads 3.7 to 4.4), sleeve 6.5 x 45 mm with a ground flat
//   tang on its last 11 mm (reads 7.2 mm with the blur), flat round head 9 mm across (reads 8.6 to 8.8) and about
//   3 mm thick, slot about 2.4 mm wide and 5.5 mm deep from the tip, its floor round.
// The AMS bit is shown in Schaff's No. 26 handle (combo-handle.js), as the let-off regulator is; Howard sells its own
//   wood combination handle for these bits.
// Confirm on Greg's tool: rod and sleeve diameter, head diameter and thickness, slot width and depth, which slot.

const LEN = 177.8, X0 = BIT_IN, TIP = X0 + LEN;   // the bit's tang end goes into the handle at BIT_IN
const ROD_R = 2.0, SLEEVE_R = 3.25, SLEEVE = 45, HEAD_R = 4.5, HEAD_T = 3, SLOT_W = 2.4, SLOT_D = 5.5;

const EASE = 0.3;   // the head's edges are broken; plate's bevel rounds the outline back out by this much
// the flat head in its own plane (x along the bit, the slot opening at +x), centred on the origin, inside its edges by EASE
function headOutline() {
  const r = HEAD_R - EASE, w = SLOT_W / 2 + EASE;
  const a0 = Math.asin(w / r), xb = HEAD_R - SLOT_D + SLOT_W / 2;
  return [...arc(0, 0, r, a0, Math.PI * 2 - a0, 40), ...arc(xb, 0, w, -Math.PI / 2, -Math.PI * 1.5, 8)];
}

export default {
  id: 'damper-wire-regulator',
  name: 'Damper wire regulator',
  what: 'A long, thin rod in a combination handle with a small slotted head, like a tiny open-end wrench. It slips in between the hammer shanks and fits around an upright damper wire, so the wire can be bent forward, back or sideways with the action in the piano.',
  how: [
    'Find the dampers that need it first: press the sustain pedal barely and watch which dampers start to lift before the rest, then which lag (Spurlock).',
    'Slide the rod in between the hammer shanks a few notes away, and fit the slot around the damper wire.',
    'Bend in small steps so each head sits square and firm on its strings: one pressing too hard goes back toward you, one not touching goes toward the strings (Craig Brougher). Bend the wire to square the head rather than trying to re-train a skewed felt (Wim Blees).',
    'Wink the pedal again: every damper should start to lift at the same moment and come back to its strings squarely (Steinway). Then time the spoons.',
  ],
  dims: 'Listed by Howard: 7 in (178 mm), chrome plated, with a straight or a 45 degree slot; this model has the straight one. Estimated from Howard\'s photos: rod about 5/32 in (4 mm), sleeve about 1/4 in (6.5 mm) by 45 mm, head about 3/8 in (9 mm) across and 3 mm thick, slot about 2.4 mm wide and 5.5 mm deep. Shown in the Schaff No. 26 combination handle, 5 in (127 mm).',
  steps: ['dampers'],
  credit: 'Modeled on the AMS Piano Tools A-61A Piano Damper Wire Regulator, sold by Howard Piano Industries, from its catalog photos and listing; shown in a Schaff No. 26 combination handle.',
  upAxis: 'y', lengthAxis: 'x',
  build() {
    const tool = new THREE.Group(), chrome = M.chrome();
    const hx = TIP - HEAD_R;                              // the head's centre
    // bit: sleeve (its tang hidden in the chuck), a short taper onto the rod, the rod into the head's back
    tool.add(lathe([[0, X0], [SLEEVE_R - 0.4, X0], [SLEEVE_R, X0 + 0.4], [SLEEVE_R, X0 + SLEEVE - 0.4], [SLEEVE_R - 0.3, X0 + SLEEVE],
      [ROD_R, X0 + SLEEVE + 0.8], [ROD_R, hx - HEAD_R * 0.55], [0, hx - HEAD_R * 0.55]], chrome));
    // a flat head lying in the bench plane, its slot opening along the bit
    const head = plate(headOutline(), HEAD_T, chrome, { z0: -HEAD_T / 2, bevel: EASE });
    head.rotation.x = -Math.PI / 2; head.position.x = hx;
    tool.add(head);
    addHandle(tool);
    // lying on the bench it rests on the grip's front edge and on the far end of the bit
    tool.rotation.z = -restTilt(tool);
    const g = new THREE.Group(); g.add(tool);
    return g;
  },
};
