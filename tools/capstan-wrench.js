// Capstan wrench: Schaff No. 86 / AMS A-86 "Universal Capstan Regulator". A chrome grip tube with a bent
// pointed end (round capstans with holes) and a bent flat stepped fork (square-shouldered capstans).
import * as THREE from 'three';
import { M, lathe, plate } from './kit.js';

// NOTES
// Listed (Schaff No. 86): 9 in (229 mm) overall, chrome plated, slotted end for square-shouldered
//   (Steinway, Baldwin) capstans, pointed end for capstans with holes. AMS lists no sizes and only a
//   "graduated opening" for the slot.
// Estimated from the AMS A-86 photo (1000 px) and the Schaff photo (300 px), scaled to the 9 in:
//   grip tube 140 x 8 mm with a 6 mm cone onto the rod (both photos read 8 to 8.5 mm, thicker than the
//   6.5 mm in the research text); point end 49 mm: rod 4.8 mm (photos read 4.4 to 5.4 mm, not 3 to 3.5),
//   bent 25 degrees 16 mm from the tip (AMS reads 24 to 26, Schaff about 30), tapering over the last 17 mm
//   to a rounded 1.4 mm tip; fork end 40 mm: blade 6.4 x 1.5 mm, 21 mm neck bent 14 degrees at the tube,
//   curving on to about 28 degrees at the tines; fork head 13 mm across, tines about 4.9 mm at the root and
//   2.6 mm at the tips; slot 12.3 mm deep, 3.2 mm (1/8 in) at the bottom, 3.6 mm at a step notch 6.4 mm up,
//   then 5.2 mm (about 3/16 in) flaring to 8.4 mm at the mouth (the AMS photo reads about 8.3).
//   The 1/8 and 3/16 in steps are borrowed from Schaff No. 84B's two ends; the AMS close-up shows the notches.
// The two photos disagree on the fork: Schaff's neck and head look about a third longer. AMS is followed,
//   with the lengths split between them (fork 40 mm here, AMS about 37, Schaff about 51).
// Laid flat with both bends in the bench plane, the way the Schaff photo shows it from above: point at +X
// (the sim's capstans are round), bending toward +Z; fork at -X, bending toward -Z, so the ends form a Z.
// Confirm on Greg's tool: tube OD, rod diameter, tip diameter, fork slot width at bottom and above the step,
// slot depth, blade thickness, and both bend angles from a top photo on a ruler.

const AX = 4;                                   // tube radius: the tool rests on its grip, axis 4 mm up
const rad = d => d * Math.PI / 180;
const ss = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);

// a polyline with rounded corners as a curve (same rounding as kit.js bentRod)
function bendPath(points, bendRadius) {
  const P = points.map(p => new THREE.Vector3(...p)), path = new THREE.CurvePath();
  let start = P[0];
  for (let i = 1; i < P.length - 1; i++) {
    const a = P[i - 1], b = P[i], c = P[i + 1];
    const r1 = Math.min(bendRadius, a.distanceTo(b) / 2), r2 = Math.min(bendRadius, b.distanceTo(c) / 2);
    const p1 = b.clone().add(a.clone().sub(b).setLength(r1)), p2 = b.clone().add(c.clone().sub(b).setLength(r2));
    path.add(new THREE.LineCurve3(start, p1)); path.add(new THREE.QuadraticBezierCurve3(p1, b, p2));
    start = p2;
  }
  path.add(new THREE.LineCurve3(start, P[P.length - 1]));
  return path;
}
// a rod along a curve whose radius changes: r(u) at arc fraction u, 0 at the start, 1 at the end
function taperRod(path, r, material, tubular = 96, radial = 20) {
  const geo = new THREE.TubeGeometry(path, tubular, 1, radial, false);
  const pos = geo.attributes.position, P = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i <= tubular; i++) {
    path.getPointAt(i / tubular, P);
    const k = r(i / tubular);
    for (let j = 0; j <= radial; j++) {
      const n = i * (radial + 1) + j;
      v.fromBufferAttribute(pos, n).sub(P).multiplyScalar(k).add(P);
      pos.setXYZ(n, v.x, v.y, v.z);
    }
  }
  return new THREE.Mesh(geo, material);
}

// fork blade centreline: s mm out from the tube end (x = -70), heading -X and swinging toward -Z,
// 14 degrees just past the tube, then curving on through the head to 28 degrees at the tines
const theta = s => rad(14) * ss((s - 0.3) / 3.5) + rad(14) * ss((s - 16) / 24);
const DS = 0.05, CL = [[-70, 0]];
for (let i = 1; i * DS <= 42; i++) { const t = theta((i - 0.5) * DS), p = CL[i - 1]; CL.push([p[0] - Math.cos(t) * DS, p[1] - Math.sin(t) * DS]); }
// (s along, w across) on the straight blade -> (x, z) on the bent one
function bend(s, w) {
  if (s <= 0) return [-70 - s, w];
  const i = Math.min(CL.length - 2, Math.floor(s / DS)), f = s / DS - i, t = theta(s);
  const x = CL[i][0] + (CL[i + 1][0] - CL[i][0]) * f, z = CL[i][1] + (CL[i + 1][1] - CL[i][1]) * f;
  return [x - Math.sin(t) * w, z + Math.cos(t) * w];
}
// one side of the fork outline, neck to slot centre; b: the extrude bevel grows the part by b, so draw it b inside
function forkHalf(b) {
  const h = [];
  for (let s = -4; s < 21.5; s += 0.5) h.push([s, 3.2 - b]);                                   // 6.4 mm neck
  for (let i = 0; i <= 12; i++) { const t = i / 12; h.push([21.5 + 5.5 * t, 3.2 + 3.3 * (1 - Math.cos(Math.PI * t)) / 2 - b]); }   // flare to 13 mm
  const tc = 38.2, rt = 1.3, wc = 5.5;                                                         // tine tip: 2.6 mm round end
  for (let i = 1; i <= 12; i++) { const t = i / 12; h.push([27 + (tc - 27) * t, 6.5 + 0.3 * Math.pow(t, 1.5) - b]); }   // tine outer edge, spreading a little
  for (let i = 1; i < 12; i++) { const p = Math.PI * i / 12; h.push([tc + (rt - b) * Math.sin(p), wc + (rt - b) * Math.cos(p)]); }   // rounded tip
  for (let i = 0; i <= 10; i++) { const t = 1 - i / 10; h.push([34 + (tc - 34) * t, 2.6 + 1.6 * Math.pow(t, 1.6) + b]); }   // mouth, 8.4 to 5.2 mm
  h.push([33.6, 1.8 + b], [28.8, 1.6 + b]);                                                    // step notch, 3.6 to 3.2 mm
  for (let i = 1; i <= 8; i++) { const p = Math.PI / 2 * i / 8; h.push([28.8 - (1.6 + b) * Math.sin(p), (1.6 + b) * Math.cos(p)]); }   // round bottom
  return h;
}

export default {
  id: 'capstan-wrench',
  name: 'Capstan wrench',
  what: 'Turns the capstan screw on top of the key, under the wippen heel. Raising or lowering the capstan sets how high the hammer rests (the blow distance) and, together with key dip, the aftertouch.',
  how: [
    'Find the capstan: the brass screw on top of the key, behind the balance rail, right under the wippen heel.',
    'Reach in between the keys. Put the pointed tip into a hole in a round capstan, or slip the stepped fork over the flats of a square capstan.',
    'Swing the tool about a quarter turn, lift it out, re-seat it and repeat. Turning counterclockwise (seen from above) raises the capstan, lifts the hammer and shortens the blow.',
    'Check the blow distance with a gauge and sight along the hammer line. Turn up any hammer that sits on the rest rail until it lifts off.',
  ],
  dims: 'Listed by Schaff: 9 in (229 mm) long, chrome plated. Estimated from catalog photos: grip tube about 5-1/2 in (140 mm) long and 5/16 in (8 mm) across; pointed rod about 3/16 in (4.8 mm), bent about 25 degrees 5/8 in (16 mm) from a rounded tip of about 1.4 mm; fork blade about 1/4 in (6.4 mm) wide and 1.5 mm thick, bent about 14 degrees and curving on to about 28 degrees; fork about 1/2 in (13 mm) across with a stepped slot about 1/2 in (12 mm) deep, about 1/8 in (3.2 mm) wide at the bottom and 3/16 in (5 mm) above the step, opening wider at the mouth.',
  steps: ['blow', 'aftertouch'],
  credit: 'Modeled on the Schaff No. 86 / AMS A-86 Universal Capstan Regulator, from Schaff and Howard Piano Industries catalog photos and listings.',
  upAxis: 'y', lengthAxis: 'x',
  build() {
    const g = new THREE.Group(), chrome = M.chrome();
    // grip tube: closed round end at the fork, spun down in a short cone onto the point rod
    const tube = lathe([[0, -70], [2.9, -70], [3.5, -69.85], [3.85, -69.5], [4, -68.9], [4, 68.2], [3.9, 68.9],
      [3.62, 69.6], [3.15, 70.8], [2.7, 72.7], [2.38, 74.8]], chrome, 48);
    tube.position.y = AX; g.add(tube);
    // pointed end: 4.8 mm rod, bent 25 degrees toward +Z 16 mm from the tip, tapering over the last 17 mm to a 1.4 mm round tip
    const L2 = 16, tip = [104 + L2 * Math.cos(rad(25)), AX, L2 * Math.sin(rad(25))];
    const path = bendPath([[72, AX, 0], [104, AX, 0], tip], 6), len = path.getLength(), rTip = 0.7;
    g.add(taperRod(path, u => { const d = (1 - u) * len; return d >= 17 ? 2.4 : rTip + (2.4 - rTip) * Math.pow(d / 17, 0.75); }, chrome));
    const cap = new THREE.Mesh(new THREE.SphereGeometry(rTip, 16, 10), chrome); cap.position.set(...tip); g.add(cap);
    // fork end: 1.5 mm flat blade, outline drawn straight then bent along the centreline
    const half = forkHalf(0.2), outline = [...half, ...half.slice(0, -1).reverse().map(([s, w]) => [s, -w])].map(([s, w]) => bend(s, w));
    const fork = plate(outline, 1.5, M.stainless(), { z0: -0.75, bevel: 0.2 });   // plated too, but the flat blade reads darker in both photos
    fork.rotation.x = Math.PI / 2; fork.position.y = AX; g.add(fork);     // shape y -> world Z, lying flat
    return g;
  },
};
