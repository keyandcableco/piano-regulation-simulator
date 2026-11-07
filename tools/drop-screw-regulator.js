import * as THREE from 'three';
import { M, lathe, rod, plate, arc } from './kit.js';

// NOTES
// Listed (Howard, AMS A-194): 7 in (178 mm) overall, 2.5 in (64 mm) wood handle, 1/8 in (3.2 mm) chrome-plated
//   round shank, "1/8 inch long recessed opening" (the slot, measured across the barrel).
// Handle length: read flat, Howard's photo shows 43% handle (about 77 mm). But its shank narrows from about 20 px
//   by the handle to 15 px by the tip, so the handle is nearer the camera and looks long. Corrected for that
//   perspective the photo gives about 60 to 68 mm, which agrees with the listing, so HANDLE is the listed 64 mm.
// Estimated from photos: handle profile (14 mm widest, 10.4 mm neck, 13.7 mm bead, domed butt, no ferrule);
//   barrel 4.8 mm OD (1.5 x shank in A-194 and A-4103) x 11.5 mm (2.2 to 3 x its OD in A-194, A-4103, Schaff 4102);
//   bore 3.3 mm x 1.5 mm deep, slot 1 mm wide x 3 mm deep. Barrel finish chrome, as in the A-4103 close-up
//   (it reads dark in the A-194 photo, like the whole shank there).
// Confirm on Greg's tool: handle length and widest diameter, barrel OD and length, bore and slot depth and width,
//   barrel finish.

const L = 178, HANDLE = 64, SHANK_R = 1.6;                                   // listed
const BAR_R = 2.4, BAR_L = 11.5, BORE_R = 1.65, BORE_D = 1.5, SLOT_W = 1, SLOT_D = 3;   // estimated

// handle [radius, x] from the butt: read off Howard's photo, perspective removed, at the listed 2.5 in
const HANDLE_PROFILE = [
  [0, 0], [1.6, 0.06], [3, 0.24], [4.1, 0.55], [4.9, 0.98], [5.45, 1.55], [5.45, 1.55],   // butt dome; doubled point
  [5.8, 2.3], [6, 3.2], [6.15, 4.3],
  [6.28, 5.8], [6.4, 7.5], [6.6, 10], [6.78, 12.5], [6.9, 15.3], [6.96, 17.8], [6.97, 20.3], [6.93, 22.8],
  [6.86, 25.3], [6.77, 27.8], [6.66, 30.3], [6.53, 32.8], [6.39, 35.3], [6.23, 37.8], [6.05, 40.3], [5.86, 42.8],
  [5.66, 45.3], [5.46, 47.8], [5.3, 50], [5.2, 51.6], [5.2, 52.8], [5.3, 53.9],                  // grip into the neck
  [5.55, 54.9], [5.95, 55.9], [6.35, 56.8], [6.62, 57.7], [6.8, 58.6], [6.85, 59.3], [6.8, 60.2], // bead
  [6.6, 61], [6.22, 61.8], [5.6, 62.5], [4.7, 63.15], [3.6, 63.6], [2.5, 63.88], [SHANK_R, HANDLE],
];

let shadow;   // inside the slot, dark as it reads in the photos (the stage has no ambient occlusion)
const socketShadow = () => shadow || (shadow = new THREE.MeshStandardMaterial({ color: 0x0b0b0c, roughness: 0.9, metalness: 0 }));

const BUTT_ROW = 5;   // profile rows 0..5 are the butt dome, where end grain meets side grain

// kit's lathe UVs run the grain around the handle: turn it to run along the sides, and straight across the butt
// (one doubled row takes the change, and its two copies share a normal so no crease shows)
function grain(mesh, len) {
  const g = mesh.geometry, uv = g.attributes.uv, pos = g.attributes.position, nor = g.attributes.normal;
  const n = HANDLE_PROFILE.length, a = new THREE.Vector3(), b = new THREE.Vector3();
  for (let i = 0; i < uv.count; i++) {
    const j = i % n;
    if (j <= BUTT_ROW) uv.setXY(i, 0.5 + pos.getZ(i) / 20, 0.5 + pos.getY(i) / 20);
    else uv.setXY(i, pos.getX(i) / len, uv.getX(i));
    if (j === BUTT_ROW) {
      a.fromBufferAttribute(nor, i).add(b.fromBufferAttribute(nor, i + 1)).normalize();
      nor.setXYZ(i, a.x, a.y, a.z); nor.setXYZ(i + 1, a.x, a.y, a.z);
    }
  }
}

export default {
  id: 'drop-screw-regulator',
  name: 'Drop screw regulator',
  what: 'Turns the drop screw on each grand hammer flange. The drop screw stops the repetition lever, and that sets how far the hammer falls after let-off.',
  how: [
    'Work with the action out on the bench. The drop screw stands in the front of each hammer flange, with its head on top beside the shank butt.',
    'Set let-off first, since the two interact. The head is usually a flat tab (spade): lower the barrel over it so the slot in the barrel floor straddles the tab. A slotted head needs a small flat screwdriver instead.',
    'Turn a fraction of a turn. Screwing it down gives more drop; up gives less.',
    'Press the key slowly. After let-off the hammer should settle about 1/16 in (1.6 mm) below the let-off point. Check it again with the action in the piano.',
  ],
  dims: 'Listed: 7 in (178 mm) overall, 2.5 in (64 mm) wood handle, 1/8 in (3.2 mm) chrome shank, slot 1/8 in (3.2 mm) long. Estimated from photos: handle 14 mm at its widest, barrel 4.8 mm across and 11.5 mm long, slot about 1 mm wide. Howard\'s photo makes the handle look longer (about 77 mm), probably because of the camera angle; the model uses the listed 2.5 in.',
  steps: ['drop', 'wink', 'jackPos'],
  credit: 'Modeled on the AMS A-194 Grand Drop Screw Regulator, from Howard Piano Industries and Schaff catalog photos and listings.',
  upAxis: 'y', lengthAxis: 'x',
  build() {
    const g = new THREE.Group();
    // turned beech handle: domed butt, swelling grip, slight neck, bead behind the shank
    const handle = lathe(HANDLE_PROFILE, M.beech(), 48);
    grain(handle, HANDLE);
    g.add(handle);
    // 1/8 in chrome shank, seated in the handle and the barrel
    const x0 = L - BAR_L;
    g.add(rod([HANDLE - 4, 0, 0], [x0 + 0.5, 0, 0], SHANK_R, M.chrome(), 20));
    // barrel: square shoulder, rounded front edge, thin rim round the bore (doubled points keep the edges crisp)
    g.add(lathe([[SHANK_R, x0], [BAR_R - 0.12, x0], [BAR_R - 0.12, x0], [BAR_R, x0 + 0.12], [BAR_R, x0 + 0.12],
      [BAR_R, L - 0.35], [BAR_R - 0.08, L - 0.1], [BAR_R - 0.3, L], [BAR_R - 0.3, L], [BORE_R + 0.1, L],
      [BORE_R, L - 0.1]], M.chrome(), 40));
    // bore wall, then on past the floor as the two ends of the slot
    g.add(lathe([[BORE_R, L - 0.1], [BORE_R, L - BORE_D]], M.satinSteel(), 40));
    g.add(lathe([[BORE_R, L - BORE_D], [BORE_R, L - BORE_D - SLOT_D]], socketShadow(), 40));
    // floor of the bore: two segments with the slot between them, across the barrel (along Z); slot walls in shadow
    const a0 = Math.asin(SLOT_W / 2 / BORE_R);
    for (const [s, e] of [[a0, Math.PI - a0], [Math.PI + a0, 2 * Math.PI - a0]]) {
      const seg = plate(arc(0, 0, BORE_R + 0.02, s, e, 16), SLOT_D, M.satinSteel());
      seg.material = [M.satinSteel(), socketShadow()];                  // extrude groups: caps, sides
      seg.rotation.y = -Math.PI / 2; seg.position.x = L - BORE_D;       // outline (z, y), depth back along -X
      g.add(seg);
    }
    const floor = new THREE.Mesh(new THREE.CircleGeometry(BORE_R, 24), socketShadow());
    floor.rotation.y = Math.PI / 2; floor.position.x = L - BORE_D - SLOT_D + 0.01;
    g.add(floor);
    // lying on the bench it rests on the bead and the barrel, tip down a couple of degrees; bake that in
    const bead = HANDLE_PROFILE.filter(p => p[1] > 50).reduce((a, b) => (b[0] > a[0] ? b : a));
    const tilt = new THREE.Matrix4().makeRotationZ(-Math.atan2(bead[0] - BAR_R, L - 0.35 - bead[1]));
    for (const m of g.children) {
      m.updateMatrix(); m.geometry.applyMatrix4(tilt.clone().multiply(m.matrix));
      m.position.set(0, 0, 0); m.quaternion.identity(); m.scale.set(1, 1, 1);
    }
    return g;
  },
};
