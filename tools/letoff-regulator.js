// Bench let-off regulator: Schaff No. 67A let-off regulator bit locked in a Schaff No. 26 combination handle.
import * as THREE from 'three';
import { M, lathe, arc, knurled } from './kit.js';
// NOTES
// Listed (Schaff): No. 67A bit 7 in (178 mm) overall, chrome, 1/8 in (3.2 mm) shank, 5/16 in (7.9 mm) wide opening.
//   No. 26 handle: black octagon plastic, compression nut, 5 in (127 mm). The listing never says the 67A fits the
//   No. 26; that is read from the bit's sleeve and tang and the handle's "fits the entire set of regulating tools".
// Estimated from the 300 px Schaff photo (the same picture serves the 5, 7 and 12 in bits; its shank measures
//   1/8 in only at the 7 in scale, so it is read as the 7 in): cup 9.5 mm across x 9.6 mm, a cone of about
//   50 degrees into the shank, shank 125 mm, sleeve 6 mm x 30 mm, then a ground flat tang 10 mm (hidden in the chuck).
// Estimated from the 250 px No. 26 photo scaled to 127 mm: chrome nose 12.5 mm long (11 to 18 mm across),
//   knurled nut 20 mm x 19.5 mm, brass thread 15.5 mm, black body 90 mm: collar 24.4, neck 22, octagon grip
//   with a shallow flute per face, about 30 mm across corners and 28 mm across flats, domed butt. The 22 mm grip in the research notes does not fit the photo at 5 in.
// Inferred, not seen: the mouth. A closed slot 2.5 mm wide, 7.9 mm long and 8 mm deep, sized to swallow a Renner
//   let-off eye (7.5 mm ring of 2.2 mm wire). Whether the slot cuts through the cup wall is unknown.
// Also estimated: the bit sits 37 mm deep in the handle (3 mm of sleeve shows), about 268 mm long assembled.
// The tool rests on the grip's front edge and the cup, so it lies tipped about 2.5 degrees nose down.
// Confirm on Greg's tool: that he uses a straight driver at all; a straight-on macro of the mouth with calipers on
//   cup OD, slot width, length and depth, and whether the slot is open-sided; bit length and how far it goes into
//   the handle; handle length, grip across flats, nut diameter; a close photo of the eyes on his bench action.

const CUP_R = 4.76, MOUTH = 268, GRIP_R = 15.2, GRIP_FRONT = 57;
const S8 = Math.PI / 8;

// fluted octagon as a fraction of the across-corners radius, a = 0 round to 1 full; a face points down (t = pi)
function fluted(t, a) {
  const p = ((t + S8) % (2 * S8) + 2 * S8) % (2 * S8) - S8;           // angle from the nearest face centre
  const f = 0.935 / Math.cos(p), k = 0.01, h = Math.max(k - Math.abs(f - 1), 0) / k;
  const oct = Math.min(f, 1) - h * h * k / 4 - 0.008 * Math.cos(p * 4) ** 2;   // softened corners, shallow flute per face
  return 1 - a * (1 - oct);
}
// a solid along +X through stations [x, R, a]; a repeated station gives a crisp edge
function loft(stations, mat, n = 128) {
  const pos = [], idx = [];
  for (const [x, R, a] of stations) for (let i = 0; i < n; i++) {
    const t = i / n * Math.PI * 2, r = R * fluted(t, a);
    pos.push(x, r * Math.cos(t), r * Math.sin(t));
  }
  for (let s = 0; s < stations.length - 1; s++) for (let i = 0; i < n; i++) {
    const a = s * n + i, b = s * n + (i + 1) % n;
    idx.push(a, b, a + n, b, b + n, a + n);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return new THREE.Mesh(g, mat);
}
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

let nutSteel = null;   // knurled chrome for the compression nut, made once and shared
const nutMat = () => nutSteel || (nutSteel = knurled(M.chrome(), 30, 8));

export default {
  id: 'letoff-regulator',
  name: 'Let-off regulator',
  what: 'A straight driver for the let-off screws of a grand action on the bench. Its slotted cup fits over the wire eye on top of the screw, and turning it raises or lowers the button that trips the jack, which sets how close the hammer gets to the string before it lets off.',
  how: [
    'Find the let-off screws. On a grand they stand upright in the let-off rail at the front of the stack, just in front of and below the hammer flanges, not under the shanks. The wire eye is on top and the felt button is underneath, over the jack tender.',
    'Set the cup straight down over the eye so the eye drops into the slot. Keep the tool upright, or the eye bends. With the action in the piano the eyes sit under the pinblock, so technicians slide in a flat let-off wrench instead, like the S-3149 designed by Keith Akins RPT.',
    'Turn a fraction of a turn. Screwing the button down makes the jack trip earlier, farther from the string. Backing it up makes it trip later.',
    'Press the key slowly and watch how close the hammer gets before it drops away: about 1/16 in (1.6 mm) in the top treble, 1/8 in (3.2 mm) in the tenor, and a little more in the bass.',
  ],
  dims: 'Listed by Schaff: bit 7 in (178 mm) long, 1/8 in (3.2 mm) shank, 5/16 in (7.9 mm) opening; handle 5 in (127 mm). Estimated from catalog photos: cup about 3/8 in (9.5 mm) across, grip about 1-3/16 in (30 mm) across, about 10-1/2 in (268 mm) long with the bit in the handle. The slot, 2.5 mm wide and 8 mm deep, is not seen in any photo: it is sized to take a 7.5 mm eye of 2.2 mm wire from the Renner drawing.',
  steps: ['letoff'],
  credit: 'Modeled on the Schaff No. 67A let-off regulator in a Schaff No. 26 combination handle, from Schaff Piano Supply catalog photos and listings.',
  upAxis: 'y', lengthAxis: 'x',
  build() {
    const tool = new THREE.Group(), chrome = M.chrome();
    // bit: hidden tang and sleeve, shoulder, 1/8 in shank, cone, cup (x = 268 is the mouth)
    tool.add(lathe([[0, 90], [2.6, 90], [3, 90.6], [3, 130], [3, 130], [1.59, 132.4], [1.59, 132.4],
      [1.59, 256], [1.59, 256], [CUP_R, 258.6], [CUP_R, 258.6], [CUP_R, 267.6], [4.45, MOUTH]], chrome));
    const m = mouth(4.45, 2.5, 7.9, 8, chrome); m.position.x = MOUTH; tool.add(m);
    // chuck: chrome nose cap, knurled compression nut, brass thread on the handle's stem
    tool.add(lathe([[8.8, 114.5], [9, 114.5], [9, 115.2], [8.7, 117.5], [8.2, 119.8], [7.5, 122], [6.8, 123.8],
      [6.1, 125.2], [5.5, 126.3], [5, 126.85], [4.6, 127], [4.6, 127], [3.1, 127], [3.1, 127], [3.1, 124.5], [0, 124.5]], chrome));
    tool.add(lathe([[7.8, 95], [9.2, 95], [9.2, 95], [10, 95.8]], chrome));
    tool.add(lathe([[10, 95.8], [10, 113.7]], nutMat()));
    tool.add(lathe([[10, 113.7], [9.2, 114.5], [9.2, 114.5], [8.8, 114.5]], chrome));
    const thread = [];
    for (let x = 90, i = 0; x <= 95.01; x += 0.35, i++) thread.push([i % 2 ? 7.75 : 7.35, x]);
    tool.add(lathe(thread, M.brass()));
    // black plastic body: domed butt, fluted octagon grip, flare, neck, front collar
    const body = [[0, 0, 1], [0, 2.8, 1], [0, 2.8, 1]];
    for (let i = 1; i <= 9; i++) { const g = 0.18 + (Math.PI / 2 - 0.18) * i / 9; body.push([10 - 10 * Math.cos(g), GRIP_R * Math.sin(g), 1]); }
    body.push([33, GRIP_R, 1], [GRIP_FRONT, GRIP_R, 1], [59.2, 14.5, 0.9], [62, 13.3, 0.6], [65, 12.2, 0.3], [68.4, 11.5, 0.1],
      [71, 11.15, 0], [74, 11, 0], [78, 11, 0], [83, 11.65, 0], [86, 12.2, 0], [88, 11.65, 0], [89.3, 10.6, 0],
      [90, 9.3, 0], [90, 9.3, 0], [90, 7, 0]);
    tool.add(loft(body, M.blackPlastic()));
    // lying on the bench it rests on the front edge of the grip and on the cup, tipped nose down
    let drop = 0;
    for (let i = 0; i <= 90; i++) { const t = Math.PI + (i / 90 - 0.5) * Math.PI / 4; drop = Math.max(drop, -GRIP_R * fluted(t, 1) * Math.cos(t)); }
    tool.rotation.z = -Math.atan2(drop - CUP_R, MOUTH - GRIP_FRONT);
    const g = new THREE.Group(); g.add(tool);
    return g;
  },
};
