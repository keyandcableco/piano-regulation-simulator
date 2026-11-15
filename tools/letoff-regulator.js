// Bench let-off regulator: Schaff No. 67A let-off regulator bit locked in a Schaff No. 26 combination handle.
import * as THREE from 'three';
import { M, lathe, arc } from './kit.js';
import { addHandle, gripDrop, GRIP_FRONT } from './combo-handle.js';
// NOTES
// Listed (Schaff): No. 67A bit 7 in (178 mm) overall, chrome, 1/8 in (3.2 mm) shank, 5/16 in (7.9 mm) wide opening.
//   No. 26 handle: black octagon plastic, compression nut, 5 in (127 mm). The listing never says the 67A fits the
//   No. 26; that is read from the bit's sleeve and tang and the handle's "fits the entire set of regulating tools".
// Estimated from the 300 px Schaff photo (the same picture serves the 5, 7 and 12 in bits; its shank measures
//   1/8 in only at the 7 in scale, so it is read as the 7 in): cup 9.5 mm across x 9.6 mm, a cone of about
//   50 degrees into the shank, shank 125 mm, sleeve 6 mm x 30 mm, then a ground flat tang 10 mm (hidden in the chuck).
// The No. 26 handle's sizes are in combo-handle.js. The 22 mm grip in the research notes does not fit its photo at 5 in.
// Inferred, not seen: the mouth. A closed slot 2.5 mm wide, 7.9 mm long and 8 mm deep, sized to swallow a Renner
//   let-off eye (7.5 mm ring of 2.2 mm wire). Whether the slot cuts through the cup wall is unknown.
// Also estimated: the bit sits 37 mm deep in the handle (3 mm of sleeve shows), about 268 mm long assembled.
// The tool rests on the grip's front edge and the cup, so it lies tipped about 2.5 degrees nose down.
// Confirm on Greg's tool: that he uses a straight driver at all; a straight-on macro of the mouth with calipers on
//   cup OD, slot width, length and depth, and whether the slot is open-sided; bit length and how far it goes into
//   the handle; handle length, grip across flats, nut diameter; a close photo of the eyes on his bench action.

const CUP_R = 4.76, MOUTH = 268;

// the working end in the face plane (slot along y), turned to face +X: mouth face, slot walls, slot floor
function mouth(r, w, len, depth, mat) {
  const c = len / 2 - w / 2, v2 = p => new THREE.Vector2(...p);
  const slot = [...arc(0, c, w / 2, 0, Math.PI, 12), ...arc(0, -c, w / 2, Math.PI, Math.PI * 2, 12)];
  const face = new THREE.Shape(arc(0, 0, r, 0, Math.PI * 2, 40).map(v2));
  face.holes.push(new THREE.Path(slot.map(v2)));
  const floor = new THREE.ShapeGeometry(new THREE.Shape(slot.map(v2)), 4); floor.translate(0, 0, -depth);
  const pos = [], nor = [], idx = [], n = slot.length;
  for (const [x, y] of slot) {
    const nx = -x, ny = -(y - (y > 0 ? c : -c)), l = Math.hypot(nx, ny);   // normals point into the slot
    pos.push(x, y, -depth, x, y, 0); nor.push(nx / l, ny / l, 0, nx / l, ny / l, 0);
  }
  for (let k = 0; k < n; k++) { const a = 2 * k, b = 2 * ((k + 1) % n); idx.push(a, a + 1, b, b, a + 1, b + 1); }
  const walls = new THREE.BufferGeometry();
  walls.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  walls.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); walls.setIndex(idx);
  const g = new THREE.Group();
  for (const geo of [new THREE.ShapeGeometry(face, 4), floor, walls]) g.add(new THREE.Mesh(geo, mat));
  g.rotation.y = Math.PI / 2;
  return g;
}

export default {
  id: 'letoff-regulator',
  name: 'Let-off regulator',
  what: 'A straight driver for regulating screws with a wire eye, here on the let-off screws of a grand action out on the bench. Its slotted cup fits over the eye, and turning it raises or lowers the button that trips the jack, which sets how close the hammer gets to the string before it lets off.',
  how: [
    'Find the let-off screws. On a grand they stand upright in the let-off rail at the front of the stack, just in front of and below the hammer flanges, not under the shanks. The wire eye is on top and the felt button is underneath, over the jack tender.',
    'Set the cup straight down over the eye so the eye drops into the slot. Keep the tool upright, or the eye bends. With the action in the piano the eyes sit under the pinblock, so technicians slide in a flat let-off wrench instead, like the S-3149 designed by Keith Akins RPT.',
    'Turn a fraction of a turn. Screwing the button down makes the jack trip earlier, farther from the string. Backing it up makes it trip later.',
    'Press the key slowly and watch how close the hammer gets before it drops away: closer in the treble and wider toward the bass. The sim\'s note is set to 1/16 in (1.6 mm).',
  ],
  dims: 'Listed by Schaff: bit 7 in (178 mm) long, 1/8 in (3.2 mm) shank, 5/16 in (7.9 mm) opening; handle 5 in (127 mm). Estimated from catalog photos: cup about 3/8 in (9.5 mm) across, grip about 1-3/16 in (30 mm) across, about 10-1/2 in (268 mm) long with the bit in the handle. The slot, 2.5 mm wide and 8 mm deep, is not seen in any photo: it is sized to take a 7.5 mm eye of 2.2 mm wire from the Renner drawing.',
  steps: ['letoff'],
  credit: 'Modeled on the Schaff No. 67A let-off regulator in a Schaff No. 26 combination handle (sold to fit Schaff\'s regulating bits), from Schaff Piano Supply catalog photos and listings.',
  upAxis: 'y', lengthAxis: 'x',
  build() {
    const tool = new THREE.Group(), chrome = M.chrome();
    // bit: hidden tang and sleeve, shoulder, 1/8 in shank, cone, cup (x = 268 is the mouth)
    tool.add(lathe([[0, 90], [2.6, 90], [3, 90.6], [3, 130], [3, 130], [1.59, 132.4], [1.59, 132.4],
      [1.59, 256], [1.59, 256], [CUP_R, 258.6], [CUP_R, 258.6], [CUP_R, 267.6], [4.45, MOUTH]], chrome));
    const m = mouth(4.45, 2.5, 7.9, 8, chrome); m.position.x = MOUTH; tool.add(m);
    addHandle(tool);
    // lying on the bench it rests on the front edge of the grip and on the cup, tipped nose down
    tool.rotation.z = -Math.atan2(gripDrop() - CUP_R, MOUTH - GRIP_FRONT);
    const g = new THREE.Group(); g.add(tool);
    return g;
  },
};
