// The combination handle the regulating bits lock into: Schaff No. 26, black fluted octagon plastic with a knurled
// compression-nut chuck. Shared by every bit in the bag that is sold to fit a combination handle.
import * as THREE from 'three';
import { M, lathe, knurled } from './kit.js';
// NOTES
// Listed (Schaff): No. 26 handle: black octagon plastic, compression nut, 5 in (127 mm), "fits the entire set of
//   regulating tools".
// Estimated from the 250 px No. 26 photo scaled to 127 mm: chrome nose 12.5 mm long (11 to 18 mm across),
//   knurled nut 20 mm x 19.5 mm, brass thread 15.5 mm, black body 90 mm: collar 24.4, neck 22, octagon grip
//   with a shallow flute per face, about 30 mm across corners and 28 mm across flats, domed butt.
// Built along +X: the butt at x = 0, the chuck's mouth at x = NOSE. A bit's sleeve goes in to x = BIT_IN (37 mm deep).
// Confirm on Greg's handle: length, grip across flats, nut diameter, how deep a bit goes in.

export const GRIP_R = 15.2, GRIP_FRONT = 57, NOSE = 127, BIT_IN = 90;
const S8 = Math.PI / 8;

// fluted octagon as a fraction of the across-corners radius, a = 0 round to 1 full; a face points down (t = pi)
export function fluted(t, a) {
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

let nutSteel = null;   // knurled chrome for the compression nut, made once and shared
const nutMat = () => nutSteel || (nutSteel = knurled(M.chrome(), 30, 8));

// the handle's parts, added to `tool` (a bit's own group, so the bit and handle tip together)
export function addHandle(tool) {
  const chrome = M.chrome();
  // chuck: chrome nose cap, knurled compression nut, brass thread on the handle's stem
  tool.add(lathe([[8.8, 114.5], [9, 114.5], [9, 115.2], [8.7, 117.5], [8.2, 119.8], [7.5, 122], [6.8, 123.8],
    [6.1, 125.2], [5.5, 126.3], [5, 126.85], [4.6, NOSE], [4.6, NOSE], [3.1, NOSE], [3.1, NOSE], [3.1, 124.5], [0, 124.5]], chrome));
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
  return tool;
}

// how far the grip's front edge reaches below the axis, with a face down (the grip is what the tool rests on)
export function gripDrop() {
  let drop = 0;
  for (let i = 0; i <= 90; i++) { const t = Math.PI + (i / 90 - 0.5) * Math.PI / 4; drop = Math.max(drop, -GRIP_R * fluted(t, 1) * Math.cos(t)); }
  return drop;
}
// Lying on the bench, a tool in the handle rests on the grip's front edge and tips nose down until some point of the bit
// touches too. The tip angle (about z, nose down) for a tool built along +X with y up: the point of the bit the bench
// meets first. `tool` is the group as built, before it is turned.
export function restTilt(tool) {
  const drop = gripDrop(), v = new THREE.Vector3();
  let best = Infinity;
  tool.updateMatrixWorld(true);
  tool.traverse(o => {
    if (!o.isMesh) return;
    const p = o.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld);
      if (v.x > GRIP_FRONT + 10) best = Math.min(best, (v.y + drop) / (v.x - GRIP_FRONT));
    }
  });
  return Number.isFinite(best) ? Math.atan(best) : 0;
}
