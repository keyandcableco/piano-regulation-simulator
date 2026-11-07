import * as THREE from 'three';
import { M, plate, arc } from './kit.js';
// NOTES
// Model: Schaff P-KDB key dip block, 3/8 in size (Schaff 199; Howard S-199; Steve's SH199).
// Listed: length 1-7/8 in (47.6 mm, Schaff); the four heights 3/8, 13/32, 7/16, 1/2 in.
// Follows from the method: total height = target dip (block top comes level with the next keys).
// Estimated from the P-KDB photo (Schaff's own, the sharpest) and Howard's: width 23.5 mm (camera fits
//   of both photos' corners against the listed length give 22-24 mm); layers measured at the near
//   corner as about 21% keytop, 43% upper ply, 36% lower ply: keytop 2.0 mm, upper ply 4.05 mm, lower
//   ply 3.3 mm. The research guessed a 2.5-3 mm keytop; the photo measures thinner.
//   The same fits put the height at 8-9.3 mm rather than 9.5, within the error of rounded corners.
// Underside: both Schaff photos show the notch on an END face with a lip at each side, and the long
//   face's bottom edge runs straight, so it is a groove along the length (about 14 mm wide, 2 mm deep,
//   centred, lips about 4.7 mm), not a rabbet across the width. Whether it runs the full length is not
//   visible; modelled full length. Its purpose is not stated anywhere.
// Plies are cross-banded: the upper ply shows end grain on the ends, the lower ply on the long faces.
// Ridges: the P-KDB photo shows the keytop ridges running across the width, about 0.8 mm apart
//   (Howard's photo shows them lengthwise, and a dark middle ply). Modelled as the P-KDB photo.
// Howard calls the block tapered; no taper shows in the photos, so none is modelled (unverified).
// Confirm on Greg's block: width, height at each end, keytop thickness, groove width/depth/length,
//   ridge direction, and which end faces the player.

const L = 47.6, W = 23.5, H = 9.5;                // length listed; width estimated; height = 3/8 in dip
const IV = 2.0, LOW = 3.3, GLUE = 0.15;           // keytop, lower ply, glue line (estimated)
const UP = H - IV - LOW - GLUE;                   // upper ply, about 4 mm
const GW = 14.2, GD = 2.0, EASE = 0.5;            // underside groove; eased keytop edges

// local materials: the photo's birch is pinker than kit's birchPly, and end grain reads greyer
let mats = null;
function materials() {
  if (mats) return mats;
  const c = document.createElement('canvas'); c.width = 256; c.height = 4;   // keytop ridges as a bump map
  const g = c.getContext('2d'), img = g.createImageData(256, 4);
  let s = 11; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const ph = Array.from({ length: 16 }, () => (rnd() - 0.5) * 0.5), amp = ph.map(() => 0.6 + rnd() * 0.4);
  for (let x = 0; x < 256; x++) {
    const k = Math.floor(x / 16), f = (x % 16) / 16 + ph[k];
    const v = 128 + 120 * amp[k] * Math.cos(f * Math.PI * 2);
    for (let y = 0; y < 4; y++) { const i = (y * 256 + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  }
  g.putImageData(img, 0, 0);
  const bump = new THREE.CanvasTexture(c);
  bump.wrapS = bump.wrapT = THREE.RepeatWrapping; bump.repeat.set(1 / 12.8, 1 / 12.8);   // 0.8 mm pitch
  // the tool stage lights a top face about 2.5x, so these bases are darker than the photo's colours
  const side = M.ivory().clone(); side.color.set(0xa6a08b); side.roughness = 0.4;
  const top = side.clone(); top.bumpMap = bump; top.bumpScale = 0.5;
  const std = (color, r) => new THREE.MeshStandardMaterial({ color, roughness: r, metalness: 0 });
  mats = { top, side, long: std(0xa49282, 0.7), end: std(0x94837a, 0.8), glue: std(0x5e4738, 0.8) };
  return mats;
}

export default {
  id: 'key-dip-block',
  name: 'Key dip block',
  what: 'A small block exactly as tall as the target key dip, 3/8 in (9.5 mm) for this one. You set it on a white key and press the key down. If the dip is right, the block top comes level with the keys beside it.',
  how: [
    'Level the keys first. Then set the block on the front of a white key and press that key firmly to the bottom.',
    'Look across, or feel with a finger: the block top should be level with the keytops on either side. If it sits above them, the dip is too shallow, so remove punchings. If it sits below, the dip is too deep, so add punchings.',
    'Use the same firm pressure on every key. Pressing harder squashes the front rail punching and reads deeper.',
    'When the dip is even, check aftertouch. Blocks also come in 13/32, 7/16 and 1/2 in for other dip targets.',
  ],
  dims: 'Length 1-7/8 in (47.6 mm), listed by Schaff. Height 3/8 in (9.5 mm), the listed size, the same as the dip it checks. Width about 15/16 in (23.5 mm), about one white key, estimated from the photos. Keytop about 2 mm thick over two wood plies about 4 mm and 3.3 mm, with a groove under it about 14 mm wide and 2 mm deep: all estimated from photos.',
  steps: ['dip', 'aftertouch'],
  credit: 'Modeled on the Schaff P-KDB key dip block, 3/8 in (Schaff 199), from Schaff and Howard Piano Industries catalog photos and listings.',
  upAxis: 'y', lengthAxis: 'x',
  build() {
    const m = materials(), g = new THREE.Group();
    // lower ply: cross-section with the underside groove, run along the length (caps are the ends)
    const r = 0.25, e = 0.3, hw = GW / 2;          // cutter radius in the corners; lip edges just broken
    const sect = [[-W / 2, 0], ...arc(-hw - e, e, e, -Math.PI / 2, 0, 4), ...arc(-hw + r, GD - r, r, Math.PI, Math.PI / 2, 4),
      ...arc(hw - r, GD - r, r, Math.PI / 2, 0, 4), ...arc(hw + e, e, e, Math.PI, Math.PI * 1.5, 4), [W / 2, 0], [W / 2, LOW], [-W / 2, LOW]];
    const low = plate(sect, L, m.long); low.material = [m.long, m.end]; low.rotation.y = Math.PI / 2; g.add(low);
    // glue line and upper ply (box faces: +x, -x, +y, -y, +z, -z; end grain on the ends)
    const box = (h, y0, mat) => { const b = new THREE.Mesh(new THREE.BoxGeometry(L, h, W), mat); b.position.set(L / 2, y0 + h / 2, 0); return b; };
    g.add(box(GLUE, LOW, m.glue), box(UP, LOW + GLUE, [m.end, m.end, m.long, m.long, m.long, m.long]));
    // keytop: eased top edges, ridges on the top face only; its lower bevel hides inside the upper ply
    const rect = [[EASE, -W / 2 + EASE], [L - EASE, -W / 2 + EASE], [L - EASE, W / 2 - EASE], [EASE, W / 2 - EASE]];
    const geo = new THREE.ExtrudeGeometry(new THREE.Shape(rect.map(([x, y]) => new THREE.Vector2(x, y))),
      { depth: IV - EASE, bevelEnabled: true, bevelThickness: EASE, bevelSize: EASE, bevelSegments: 4, curveSegments: 1 });
    geo.translate(0, 0, H - IV); geo.rotateX(-Math.PI / 2);
    g.add(new THREE.Mesh(geo, [m.top, m.side]));
    return g;
  },
};
