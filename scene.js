// Three.js rendering of the grand action. Units are millimetres, same frame
// as model.js: x toward the strings, y up, z across the keyboard (+z toward the bass).
// Three notes are built; normal modes show the middle one with ghost neighbors,
// exam mode shows all three like the 3-note exam model.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { G, NEIGHBOR_H, WEAR, keyAngle, hamPt } from './model.js';

const COLORS = {
  keybed: 0x6e4c2e, rail: 0xa47a4c, wood: 0xd7b98c, keywood: 0xe6d3ad, keytop: 0xf6f3ea,
  felt: 0x2f6e46, redfelt: 0x9b2f2f, hammerfelt: 0xeee6d2, buckskin: 0xb38b55, core: 0x5a3d22,
  brass: 0xc9a24a, steel: 0xa9afb6, string: 0xcfd3d8, dark: 0x3a2c22, ghost: 0xf2efe7,
};

const PART_NAMES = {
  key: 'Key', keytop: 'Key top', neighbor: 'Neighbor key', balance: 'Balance rail punching',
  balrail: 'Balance rail', frontrail: 'Front rail', frontpunch: 'Front rail punching', backrail: 'Back rail cloth',
  capstan: 'Capstan screw', wippen: 'Wippen', heel: 'Wippen heel cushion', wippenrail: 'Wippen rail & flange',
  jack: 'Jack', tender: 'Jack tender (toe)', jackscrew: 'Jack regulating screw', rep: 'Repetition lever',
  repscrew: 'Repetition lever height screw', repspring: 'Repetition spring', shank: 'Hammer shank',
  knuckle: 'Knuckle', hammer: 'Hammer', flange: 'Hammer flange', flangerail: 'Hammer flange rail',
  wflange: 'Wippen flange', support: 'Repetition lever support', jackstop: 'Jack stop (spoon)', repbutton: 'Repetition lever button',
  dropfelt: 'Drop screw felt', windowfelt: 'Jack stop felt in the repetition lever window',
  wcenter: 'Wippen flange center pin (bushed in the flange)', jcenter: 'Jack center pin (bushed in the wippen)',
  rcenter: 'Repetition lever center pin (bushed in the support)', hcenter: 'Hammer flange center pin (bushed in the flange)',
  ucenter: 'Damper underlever center pin (bushed in its flange)',
  drop: 'Drop screw', letoff: 'Let-off button', regrail: 'Regulating rail', restrail: 'Hammer rest rail',
  string: 'Strings', backcheck: 'Backcheck (buckskin face)', damper: 'Damper head', damperwire: 'Damper wire', underlever: 'Damper underlever',
  damperstop: 'Damper stop rail', lifttray: 'Damper lift tray (pedal)', guiderail: 'Damper guide rail', ulrail: 'Underlever flange rail', tail: 'Hammer tail (scored check surface)', keybed: 'Keybed', straightedge: 'Straightedge',
};

// note slots: 0 is the middle (the one normal modes use), 1 toward the bass, 2 toward the treble
export const NOTE_Z = [0, 23.5, -23.5];
const UL_PIVOT = [604, 66];        // underlever centre pin
const UL_FELT = [-135, -6];        // lift felt, over the key's end
const UL_WIRE = [-98, 5];          // where the damper wire leaves the underlever
const WIRE_Z = 8;                  // the wire rises beside the unison; the head reaches over it

// Wippen, jack and repetition lever outlines, side profile, mm. Digitized from Renner USA's dimensioned
// wippen drawing and fitted to Hirschkorn's measured Boston GP-178 (research/wippen/spec.md).
// wippen-local: origin at the wippen center pin, body level
const W_BODY = [[6.3, -3.7], [7.3, 0], [6.3, 3.7], [3.7, 6.3], [0, 7.3], [-3.7, 6.3], [-5.3, 5.5], [-7.4, 4.7], [-8.6, 1.5], [-9.6, 0.7],
  [-37, 0.7], [-38.5, 1.2], [-39.6, 3], [-40.5, 5.1], [-56.5, 5.1], [-57.3, 3], [-58.2, 1], [-60, 0], [-101, 0],
  [-103.6, -1.2], [-104.8, -3.8], [-103.8, -6.4], [-101.5, -7.6], [-75, -7.6], [-6, -7.3], [-5.2, -4.6]];
const W_HEEL = [[-48.5, -7.6], [-51, -17.5], [-52.5, -19.2], [-54.5, -19.8], [-56.5, -20.1], [-58.5, -20.3], [-59.5, -20.3], [-60.5, -20.3],
  [-62.5, -20.1], [-64.5, -19.8], [-66.5, -19.2], [-68, -17.5], [-72.5, -7.6]];
const W_HEEL_FELT = [[-52.5, -19.2], [-54.5, -19.8], [-56.5, -20.1], [-59.5, -20.3], [-62.5, -20.1], [-64.5, -19.8], [-66.5, -19.2],
  [-66.5, -21.3], [-64.5, -21.8], [-62.5, -22.1], [-59.5, -22.3], [-56.5, -22.1], [-54.5, -21.8], [-52.5, -21.3]];
const W_SUPPORT = [[-44.3, -0.7], [-51.7, -0.7], [-51.7, 27.9], [-51.2, 29.8], [-49.9, 31.1], [-48, 31.6], [-46.1, 31.1], [-44.8, 29.8], [-44.3, 27.9]];
const W_JACK_POST = [[-80.6, -7.6], [-82.6, -7.6], [-76.4, 21.6], [-74.4, 21.6]];
const W_FLANGE = [[3.2, -24.7], [-4, -24.7], [-4, 1.4], [-3.5, 3.2], [-2.2, 4.5], [-0.4, 5], [1.4, 4.5], [2.7, 3.2], [3.2, 1.4]];
const W_STOP_FACE = { p: [-75.9, 18.9], n: [-0.969, 0.247] };   // where the jack button rests
const W_SPRING_COIL = [-49.1, 17.0];
const W_SPRING_UPPER = [[-49.1, 17.0], [-51.6, 19.6], [-60.4, 21.8], [-63.6, 24.7], [-67.6, 26.9], [-71.5, 29.3]];
const W_SPRING_LOWER = [[-49.1, 17.0], [-51.6, 15.3], [-61.1, 16.0], [-69.8, 12.7], [-74.9, 9.1], [-80.7, 4.4], [-90.9, 1.5], [-95.4, -0.7]];
// jack-local: origin at the jack center pin, drawn at its rest lean
const J_BODY = [[17.7, 47.1], [11.9, 48.9], [-1.6, 4.2], [-3.2, 1.2], [-6.1, -1.1], [-22.6, 0.2], [-23.2, 2.1], [-23.1, 3.2], [-23.6, 4.1],
  [-24.5, 4.8], [-25.6, 4.9], [-26.5, 4.4], [-27.2, 3.5], [-27.3, 2.4], [-26.8, 1.5], [-25.9, 0.8], [-24.8, 0.7], [-16.5, -4.6],
  [-6.1, -8], [-0.6, -8.4], [3.4, -6.8], [5.8, -3.6], [6.5, 1.8], [6.7, 4.5], [6.2, 7.1], [4.9, 8.9]];
const J_BUTTON = [[20.4, 19.9], [13.3, 22.2], [16.3, 31.2], [23.3, 28.9]];
const J_BUTTON_FELT = [[21.9, 19.4], [20.4, 19.9], [23.3, 28.9], [24.9, 28.4]];
const J_SCREW_AXIS = { from: [2.5, 30.75], to: [14.8, 26.7], r: 1.2 };
const J_BTN_CONTACT = [23.4, 23.9];   // middle of the button's felt face
// rep-local: origin at the repetition lever center pin, drawn at rest
const R_BODY = [[38.7, -12.6], [3.8, 2.9], [-3.3, 5.3], [-21.7, 11.8], [-32.6, 16.2], [-36.3, 17.5], [-40, 18.5], [-43.6, 19.2], [-46.6, 19.5],
  [-56.8, 19.9], [-58.6, 15.8], [-51.7, 12.5], [-45.5, 12.5], [-3.3, -2], [3.8, -5.3], [28.5, -15.1], [40, -15.5]];
const R_DROP_FELT = [[-46.6, 19.5], [-56.8, 19.9], [-56.8, 22], [-46.6, 21.5]];
const R_WINDOW_FELT = [[-43.7, 18], [-49.2, 19.1], [-51.7, 10], [-47.3, 8.2]];
// solid between the cheeks at the tail and the front end; open in the window between
const R_TAIL = [[38.7, -12.6], [3.8, 2.9], [-3.3, 5.3], [-21.7, 11.8], [-25, 13.13], [-25, 5.46], [-3.3, -2], [3.8, -5.3], [28.5, -15.1], [40, -15.5]];
const R_FRONT = [[-45, 19.35], [-46.6, 19.5], [-56.8, 19.9], [-58.6, 15.8], [-51.7, 12.5], [-45.5, 12.5]];
const R_BUTTON_C = [31.8, -26.8];    // bottom of the height screw's felt button, rep-local
const R_BUTTON_FELT_H = 5;
const CAP_R = 4.5;                   // capstan screw radius
const CAP_H = G.capDomeR - Math.sqrt(G.capDomeR ** 2 - CAP_R ** 2);   // height of its dome
const DROP_TOP = 152;                // the drop screw's head

function shapeFrom(pts) {
  const s = new THREE.Shape();
  s.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
  s.closePath();
  return s;
}
const rect = (x0, y0, x1, y1) => shapeFrom([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);

export function createScene(canvas, overlay) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 5, 5000);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;

  const hemi = new THREE.HemisphereLight(0xffffff, 0x554433, 1.6);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(200, 500, 600);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xffffff, 0.5);
  fill.position.set(-300, 100, -400);
  scene.add(fill);

  const pickables = [];
  const partMeshes = {};
  let building = -1; // note slot the parts being built belong to (-1 = shared)
  function mat(color, opts = {}) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: opts.metal ? 0.6 : 0.05, transparent: !!opts.opacity, opacity: opts.opacity ?? 1 });
  }
  function register(m, part, opts) {
    m.userData.part = part; m.userData.note = building; m.userData.baseOpacity = opts.opacity ?? 1;
    if (part && !opts.noPick) { pickables.push(m); (partMeshes[part] ||= []).push(m); }
  }
  function ext(shape, depth, z0, color, part, parent, opts = {}) {
    const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 16 });
    geo.translate(0, 0, z0 - depth / 2);
    const m = new THREE.Mesh(geo, mat(color, opts));
    parent.add(m); register(m, part, opts);
    return m;
  }
  function cyl(r, len, axis, pos, color, part, parent, opts = {}) {
    const geo = new THREE.CylinderGeometry(r, r, len, 20);
    if (axis === 'x') geo.rotateZ(Math.PI / 2);
    if (axis === 'z') geo.rotateX(Math.PI / 2);
    const m = new THREE.Mesh(geo, mat(color, opts));
    m.position.set(...pos);
    parent.add(m); register(m, part, opts);
    return m;
  }
  // a center pin across a part, with the cloth bushing ring showing round it on each face
  function center(part, parent, [x, y], len) {
    cyl(1.27, len, 'z', [x, y, 0], COLORS.redfelt, part, parent);
    cyl(0.635, len + 0.8, 'z', [x, y, 0], COLORS.steel, part, parent, { metal: true });
  }
  function rodBetween(a, b, r, color, part, parent) {
    const A = new THREE.Vector3(a[0], a[1], 0), B = new THREE.Vector3(b[0], b[1], 0);
    const m = cyl(r, A.distanceTo(B), 'y', [0, 0, 0], color, part, parent, { metal: true });
    m.position.copy(A).add(B).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.sub(A).normalize());
    return m;
  }
  function tube(points, r, color, part, parent) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, r, 8), mat(color, { metal: true }));
    parent.add(m); register(m, part, {});
    return m;
  }

  // ---------- shared frame: keybed and rails ----------
  const fixed = new THREE.Group();
  scene.add(fixed);
  ext(rect(-30, -14, 520, 0), 100, 0, COLORS.keybed, 'keybed', fixed);
  ext(rect(4, 0, 20, G.frontRailY), 80, 0, COLORS.rail, 'frontrail', fixed);
  ext(rect(G.balX - 12, 0, G.balX + 12, G.balRailY), 80, 0, COLORS.rail, 'balrail', fixed);
  ext(rect(440, 0, 472, G.backRailY - 2), 80, 0, COLORS.rail, 'backrail', fixed);
  ext(rect(440, G.backRailY - 2, 472, G.backRailY), 80, 0, COLORS.felt, 'backrail', fixed);
  // the wippen flanges hang under their pins and screw to the back face of the wippen rail
  ext(rect(G.W[0] - 20, G.W[1] - 26, G.W[0] - 4, G.W[1] - 10), 80, 0, COLORS.rail, 'wippenrail', fixed);
  ext(rect(282, 124, 306, 140), 80, 0, COLORS.rail, 'flangerail', fixed);
  ext(rect(281, 106, 305, 118), 80, 0, COLORS.rail, 'regrail', fixed);
  // the hammer rest rail is one rail for every note
  const restRail = new THREE.Group(); fixed.add(restRail);
  ext(rect(G.restRailX - 8, -12, G.restRailX + 8, -2), 80, 0, COLORS.rail, 'restrail', restRail);
  ext(rect(G.restRailX - 8, -2, G.restRailX + 8, 0), 80, 0, COLORS.felt, 'restrail', restRail);
  // ghost neighbor keys at the regulated height, for the one-note modes
  const ghosts = new THREE.Group(); fixed.add(ghosts);
  const nbTh = Math.asin((G.backRailY - (G.balRailY + 1.5)) / (G.backRailX - G.balX));
  for (const z of [NOTE_Z[1], NOTE_Z[2]]) {
    const nk = new THREE.Group();
    nk.position.set(G.balX, G.balRailY + 1.5, 0); nk.rotation.z = nbTh;
    ext(rect(-235, 0, 235, G.keyThick), 21, z, COLORS.ghost, 'neighbor', nk, { opacity: 0.35 });
    ext(rect(-235, G.keyThick, -85, G.keyThick + G.keyTopCap), 21, z, COLORS.ghost, 'neighbor', nk, { opacity: 0.5 });
    ghosts.add(nk);
  }
  // damper rails, shared by every note: the guide rail the wires pass through, the underlever
  // flange rail, the stop rail over the underlevers and the pedal's lift tray under them
  ext(rect(482, 148, 530, 156), 80, 0, COLORS.rail, 'guiderail', fixed);
  ext(rect(592, 34, 626, 58), 80, 0, COLORS.rail, 'ulrail', fixed);
  const dStopRail = new THREE.Group(); fixed.add(dStopRail);
  ext(rect(522, 0, 556, 10), 80, 0, COLORS.rail, 'damperstop', dStopRail);
  ext(rect(522, 0, 556, 2), 80, 0, COLORS.felt, 'damperstop', dStopRail);
  const liftTray = new THREE.Group(); fixed.add(liftTray);
  ext(rect(562, -10, 588, 0), 80, 0, COLORS.dark, 'lifttray', liftTray);
  const straightedge = new THREE.Group(); fixed.add(straightedge);
  ext(rect(-6, NEIGHBOR_H, 30, NEIGHBOR_H + 3), 90, 0, COLORS.steel, 'straightedge', straightedge, { metal: true, noPick: true });
  straightedge.visible = false;

  // ---------- one note: key, wippen, jack, repetition lever, hammer and its screws ----------
  function makeNote(slot) {
    building = slot;
    const root = new THREE.Group(); root.position.z = NOTE_Z[slot]; scene.add(root);
    const n = { root };
    // punchings, pins, let-off button, drop screw, flanges, strings
    n.frontPunch = cyl(6, 1, 'y', [G.frontRailX, 0, 0], COLORS.felt, 'frontpunch', root);
    cyl(1.2, 22, 'y', [G.frontRailX, G.frontRailY + 11, 0], COLORS.steel, 'frontrail', root, { metal: true, noPick: true });
    n.balPunch = cyl(6, 1, 'y', [G.balX, 0, 0], COLORS.felt, 'balance', root);
    cyl(1.5, 30, 'y', [G.balX, G.balRailY + 15, 0], COLORS.steel, 'balrail', root, { metal: true, noPick: true });
    // wippen flange: a fork hanging under the wippen's center pin, screwed to the wippen rail
    const wfl = new THREE.Group(); wfl.position.set(G.W[0], G.W[1], 0); root.add(wfl);
    ext(shapeFrom(W_FLANGE), 3, -4.3, COLORS.wood, 'wflange', wfl);
    ext(shapeFrom(W_FLANGE), 3, 4.3, COLORS.wood, 'wflange', wfl, { opacity: 0.4 });
    // hammer flange: a foot screwed on the flange rail, and a fork round the shank's center pin
    ext(rect(290, 140, 322, 144), 11, 0, COLORS.wood, 'flange', root);
    ext(rect(316, 140, 331, 153.5), 3.5, -5, COLORS.wood, 'flange', root);
    ext(rect(316, 140, 331, 153.5), 3.5, 5, COLORS.wood, 'flange', root, { opacity: 0.4 });
    n.letoffBtn = new THREE.Group(); root.add(n.letoffBtn);
    cyl(5, 3, 'y', [G.letoffX, 1.5, 0], COLORS.redfelt, 'letoff', n.letoffBtn);
    n.letoffStem = cyl(1.2, 1, 'y', [G.letoffX, 0, 0], COLORS.steel, 'letoff', root, { metal: true });
    // drop screw: beside the hammer flange, down onto the felt on the repetition lever's front end
    n.dropScrew = cyl(1.4, 1, 'y', [G.dropX, 0, 8], COLORS.steel, 'drop', root, { metal: true });
    cyl(2.6, 1.6, 'y', [G.dropX, DROP_TOP + 0.8, 8], COLORS.steel, 'drop', root, { metal: true });
    cyl(2.4, 4, 'y', [G.dropX, 142, 8], COLORS.wood, 'flange', root);
    for (const z of [-3.5, 0, 3.5]) cyl(0.55, 420, 'x', [440, G.stringY + 0.55, z], COLORS.string, 'string', root, { metal: true });

    // key, with capstan and backcheck
    const key = n.key = new THREE.Group(); root.add(key);
    ext(rect(-235, 0, 235, G.keyThick), 21, 0, COLORS.keywood, 'key', key);
    ext(rect(-235, G.keyThick, -85, G.keyThick + G.keyTopCap), 21.4, 0, COLORS.keytop, 'key', key);
    ext(rect(-236.5, -2, -235, G.keyThick + G.keyTopCap), 21.4, 0, COLORS.keytop, 'key', key);
    for (const x of [-170, -150]) cyl(4.5, 21.2, 'z', [x, 11, 0], 0x8a8f96, 'key', key, { metal: true, noPick: true });
    // capstan: a brass screw with a shallow dome on top, which the heel cushion rolls on
    n.capstan = cyl(CAP_R, 1, 'y', [G.capstanLocal, 0, 0], COLORS.brass, 'capstan', key, { metal: true });
    n.capDome = new THREE.Mesh(new THREE.SphereGeometry(G.capDomeR, 24, 6, 0, Math.PI * 2, 0, Math.asin(CAP_R / G.capDomeR)), mat(COLORS.brass, { metal: true }));
    key.add(n.capDome); register(n.capDome, 'capstan', {});
    // grand backcheck: an angled wooden head on a stiff wire, felt face leaning toward the
    // hammer tail. The face passes through the point where the model catches the tail.
    const bc = n.bc = new THREE.Group(); bc.position.set(G.backcheckLocal, G.keyThick, 0); key.add(bc);
    {
      // contact point at the top of the face, the face leaning toward the hammer, and the head behind it:
      // buckskin (its nap grips the scored tail), a felt underlay, then the wooden head
      const P = [G.bcHead[0] - G.backcheckLocal, G.bcHead[1] - G.keyThick], u = [-0.574, 0.819], d = [0.819, 0.574]; // face 35° off vertical
      const at = (t, s) => [P[0] + u[0] * t + d[0] * s, P[1] + u[1] * t + d[1] * s];
      ext(shapeFrom([at(-20, 0), at(3, 0), at(3, 2.5), at(-20, 2.5)]), 13, 0, COLORS.buckskin, 'backcheck', bc);
      ext(shapeFrom([at(-20, 2.5), at(3, 2.5), at(3, 4.5), at(-20, 4.5)]), 13, 0, COLORS.redfelt, 'backcheck', bc);
      ext(shapeFrom([at(-20, 4.5), at(3.5, 4.5), at(2, 14), at(-20, 14)]), 12, 0, COLORS.wood, 'backcheck', bc);
      const foot = at(-20, 9);
      tube([[2, 0, 0], [6, 30, 0], [foot[0], foot[1] + 1, 0]], 1.2, COLORS.steel, 'backcheck', bc);
      ext(rect(-3, -1, 9, 3), 10, 0, COLORS.dark, 'backcheck', bc);                                           // wire block on the key
    }

    // wippen, with its heel, the repetition lever's support, the jack stop and the butterfly spring
    const wippen = n.wippen = new THREE.Group(); root.add(wippen);
    wippen.position.set(G.W[0], G.W[1], 0);
    ext(shapeFrom(W_BODY), 11, 0, COLORS.wood, 'wippen', wippen);
    ext(shapeFrom(W_HEEL), 12, 0, COLORS.wood, 'wippen', wippen);
    n.heelG = new THREE.Group(); n.heelG.position.y = -19.2; wippen.add(n.heelG);   // the cushion packs down toward the heel
    ext(shapeFrom(W_HEEL_FELT.map(([x, y]) => [x, y + 19.2])), 12.4, 0, COLORS.redfelt, 'heel', n.heelG);
    ext(shapeFrom(W_SUPPORT), 2.4, -3.95, COLORS.wood, 'support', wippen);
    ext(shapeFrom(W_SUPPORT), 2.4, 3.95, COLORS.wood, 'support', wippen, { opacity: 0.4 });
    ext(shapeFrom(W_JACK_POST), 2, 0, COLORS.steel, 'jackstop', wippen, { metal: true });
    cyl(1.6, 4.4, 'z', [...W_SPRING_COIL, 0], COLORS.steel, 'repspring', wippen, { metal: true });
    tube(W_SPRING_UPPER.map(([x, y]) => [x, y, -1.2]), 0.5, COLORS.steel, 'repspring', wippen);
    tube(W_SPRING_LOWER.map(([x, y]) => [x, y, 1.6]), 0.5, COLORS.steel, 'repspring', wippen);
    center('wcenter', wippen, [0, 0], 12);
    center('jcenter', wippen, G.jackPivotW, 12);
    center('rcenter', wippen, G.repPivotW, 10.6);

    // jack: an L on its center pin, the long arm leaning back under the knuckle, the toe toward the let-off button
    const jack = n.jack = new THREE.Group(); wippen.add(jack);
    jack.position.set(G.jackPivotW[0], G.jackPivotW[1], 0);
    ext(shapeFrom(J_BODY), 5.5, 0, COLORS.wood, 'jack', jack);
    cyl(2.1, 5.7, 'z', [-25.0, 3.0, 0], COLORS.wood, 'tender', jack);
    // regulating screw through the arm; its button's felt rests on the jack stop
    n.jackBtn = new THREE.Group(); jack.add(n.jackBtn);
    ext(shapeFrom(J_BUTTON), 9.5, 0, 0xe8e2d4, 'jackscrew', n.jackBtn);
    ext(shapeFrom(J_BUTTON_FELT), 9.5, 0, COLORS.redfelt, 'jackscrew', n.jackBtn);
    rodBetween(J_SCREW_AXIS.from, J_SCREW_AXIS.to, J_SCREW_AXIS.r, COLORS.steel, 'jackscrew', n.jackBtn);
    cyl(2, 1.6, 'x', [0, 0, 0], COLORS.steel, 'jackscrew', n.jackBtn, { metal: true }).position.set(...J_SCREW_AXIS.from, 0);

    // repetition lever: two cheeks round the window the jack rises through, solid at the tail and the front end
    const rep = n.rep = new THREE.Group(); wippen.add(rep);
    rep.position.set(G.repPivotW[0], G.repPivotW[1], 0);
    ext(shapeFrom(R_BODY), 2.3, -4.35, COLORS.wood, 'rep', rep);
    ext(shapeFrom(R_BODY), 2.3, 4.35, COLORS.wood, 'rep', rep, { opacity: 0.4 });
    ext(shapeFrom(R_TAIL), 6.5, 0, COLORS.wood, 'rep', rep);
    ext(shapeFrom(R_FRONT), 6.5, 0, COLORS.wood, 'rep', rep);
    ext(shapeFrom(R_DROP_FELT), 9, 0, COLORS.redfelt, 'dropfelt', rep);
    ext(shapeFrom(R_WINDOW_FELT), 6.4, 0, COLORS.redfelt, 'windowfelt', rep);
    rodBetween([-18.2, 16.2], [-25.2, -2.7], 1.0, COLORS.steel, 'repspring', rep);          // spring's fine adjustment screw
    cyl(2.2, 0.8, 'y', [-23.2, 2.2, 0], COLORS.steel, 'repspring', rep, { metal: true });
    // height screw through the tail; its felt-bottomed button rests on the wippen
    n.repBtn = new THREE.Group(); rep.add(n.repBtn);
    cyl(1.1, 13.3, 'y', [31.8, -11.75, 0], COLORS.steel, 'repscrew', n.repBtn, { metal: true });
    cyl(1.6, 3.8, 'y', [31.8, -3.2, 0], COLORS.steel, 'repscrew', n.repBtn, { metal: true });
    cyl(4.7, 4.4, 'y', [31.8, -19.6, 0], 0xe8e2d4, 'repbutton', n.repBtn);
    cyl(4.7, R_BUTTON_FELT_H, 'y', [31.8, -24.3, 0], COLORS.redfelt, 'repbutton', n.repBtn);

    // hammer
    // alignment: spacing shifts the whole hammer sideways, traveling tilts its swing about the shank line
    const align = n.align = new THREE.Group(); root.add(align);
    align.position.set(G.H[0], G.H[1], 0);
    const hammer = n.hammer = new THREE.Group(); align.add(hammer);
    cyl(3.2, 128, 'x', [64, 0, 0], COLORS.wood, 'shank', hammer);
    center('hcenter', hammer, [0, 0], 13.6);
    // a split along the shank: only there when the shank is damaged
    n.crack = ext(rect(30, 2.2, 95, 3.6), 1.2, 3.4, COLORS.dark, 'shank', hammer, { noPick: true });
    // the head twists about the shank's axis when the shank is out of square
    const headG = n.headG = new THREE.Group(); hammer.add(headG);
    n.knuckle = cyl(G.knuckleR, 8, 'z', [G.knuckleC[0], G.knuckleC[1], 0], COLORS.buckskin, 'knuckle', hammer);
    cyl(G.coreR, 8.4, 'z', [G.knuckleC[0], G.knuckleC[1], 0], COLORS.core, 'knuckle', hammer);
    // old head drawing, moved so its crown sits on the new crown arc (replaced by the traced outlines next)
    const oldHead = new THREE.Group(); oldHead.position.set(7.13, 5.8, 0); headG.add(oldHead);
    // molding: tapers toward the crown; below the shank it continues as the tail,
    // whose back face is what the backcheck catches
    const mold = new THREE.Shape();
    // the tail swells back toward the strings below the shank and curves under: its back face is
    // the scored surface the backcheck's leather catches
    mold.moveTo(118, -8); mold.lineTo(119.5, 14); mold.lineTo(121.5, 24); mold.lineTo(130.5, 24); mold.lineTo(132.5, 8);
    mold.lineTo(134, -2); mold.quadraticCurveTo(139.5, -7, 139.3, -18);
    mold.quadraticCurveTo(137.5, -25.5, 130, -26); mold.quadraticCurveTo(122, -25, 120, -16); mold.closePath();
    ext(mold, 10, 0, COLORS.wood, 'hammer', oldHead);
    ext(shapeFrom([[134.3, -2.6], [138.6, -7.6], [139.1, -18], [137, -23.4], [136, -22.8], [138, -18], [137.5, -8], [133.6, -3.2]]),
      10.4, 0, COLORS.dark, 'tail', oldHead); // scored check surface
    // felt wraps the top of the molding: underfelt band, then the top felt to the crown
    n.feltG = new THREE.Group(); n.feltG.position.y = 4; oldHead.add(n.feltG);
    const felt = new THREE.Shape();
    // grand hammer felt: wide where it is glued to the molding, near-straight sides, rounded crown
    felt.moveTo(110.5, 0); felt.lineTo(112, 18);
    felt.bezierCurveTo(112.8, 29, 117, 40 - 4, 125, 40 - 4);
    felt.bezierCurveTo(133, 40 - 4, 137.2, 29, 138, 18); felt.lineTo(139.5, 0);
    felt.lineTo(132.8, 2); felt.lineTo(119.2, 2); felt.closePath();
    ext(felt, 12, 0, COLORS.hammerfelt, 'hammer', n.feltG);
    ext(shapeFrom([[110.5, 0], [119.2, 2], [119.4, 4.5], [110.7, 3]]), 12.2, 0, COLORS.redfelt, 'hammer', n.feltG);
    ext(shapeFrom([[139.5, 0], [132.8, 2], [132.6, 4.5], [139.3, 3]]), 12.2, 0, COLORS.redfelt, 'hammer', n.feltG);
    // damper: underlever pivoting on its flange behind the keys, lift felt over the key's end,
    // wire up through the guide rail, head with its felt sitting on the unison
    const ul = n.ul = new THREE.Group(); ul.position.set(...UL_PIVOT, 0); root.add(ul);
    ext(rect(-142, -2, 6, 5), 9, 0, COLORS.wood, 'underlever', ul);
    ext(rect(-142, -6, -128, -2), 10, 0, COLORS.redfelt, 'underlever', ul);
    n.wire = cyl(1.1, 1, 'y', [UL_WIRE[0] + UL_PIVOT[0], 0, WIRE_Z], COLORS.steel, 'damperwire', root, { metal: true });
    const head = n.dHead = new THREE.Group(); root.add(head);
    ext(rect(492, 4, 520, 22), 16, 1, COLORS.wood, 'damper', head);
    ext(rect(492, 0, 520, 4), 13, 0, COLORS.hammerfelt, 'damper', head);
    center('ucenter', ul, [0, 0], 10);
    building = -1;
    return n;
  }
  const notes = [0, 1, 2].map(makeNote);
  const N0 = notes[0];

  // ---------- one note or three ----------
  let noteCount = 1, focus = null;
  function setNoteCount(c) {
    noteCount = c;
    notes.forEach((n, i) => { n.root.visible = i < c; });
    ghosts.visible = c === 1;
    applyFocus();
  }
  // in the three-note model, fade the notes you are not working on so the side views stay readable
  function setFocus(i) { focus = i; applyFocus(); }
  function applyFocus() {
    notes.forEach((n, i) => n.root.traverse(o => {
      if (!o.isMesh) return;
      const faded = noteCount > 1 && focus !== null && i !== focus;
      const op = o.userData.baseOpacity * (faded ? 0.18 : 1);
      o.material.transparent = op < 1; o.material.opacity = op; o.material.depthWrite = !faded;
    }));
  }

  // ---------- callouts (measurement lines with labels) ----------
  const callouts = new Map();
  function setCallout(id, p1, p2, text) {
    let c = callouts.get(id);
    if (!c) {
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xe0583a, depthTest: false }));
      line.renderOrder = 10; scene.add(line);
      const el = document.createElement('div'); el.className = 'callout'; overlay.appendChild(el);
      c = { line, el }; callouts.set(id, c);
    }
    c.line.geometry.setFromPoints([new THREE.Vector3(...p1), new THREE.Vector3(...p2)]);
    c.el.textContent = text;
    c.mid = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, (p1[2] + p2[2]) / 2];
  }
  function clearCallouts(keep = []) {
    for (const [id, c] of callouts) {
      if (keep.includes(id)) continue;
      scene.remove(c.line); c.el.remove(); callouts.delete(id);
    }
  }

  // ---------- part labels (on the middle note) ----------
  const LABELS = [
    [N0.key, [-150, 30, 0], 'Key'], [N0.capDome, [0, 4, 0], 'Capstan'], [fixed, [G.balX, 12, 41], 'Balance rail'],
    [fixed, [12, 8, 41], 'Front rail'], [fixed, [456, 12, 41], 'Back rail'], [N0.wippen, [-28, 2, 7], 'Wippen'],
    [N0.jack, [8, 28, 4], 'Jack'], [N0.rep, [-12, 9, 7], 'Repetition lever'], [N0.letoffBtn, [G.letoffX, -1, 6], 'Let-off button'],
    [N0.root, [G.dropX, 146, 10], 'Drop screw'], [N0.hammer, [G.knuckleC[0], G.knuckleC[1] - 4, 5], 'Knuckle'],
    [N0.hammer, [70, 4, 4], 'Shank'], [N0.hammer, [132, 30, 7], 'Hammer'], [N0.hammer, [133, -20, 6], 'Tail'],
    [N0.bc, [8, 70, 7], 'Backcheck'], [restRail, [G.restRailX, -8, 41], 'Rest rail'], [fixed, [294, 140, 41], 'Hammer flange rail'],
    [fixed, [293, 118, 41], 'Regulating rail'], [N0.root, [560, G.stringY + 3, 0], 'Strings'], [fixed, [G.W[0] - 12, G.W[1] - 10, 41], 'Wippen rail'],
    [N0.wippen, [-48, 31, 5], 'Support'], [N0.jack, [20, 30, 6], 'Jack button'], [N0.wippen, [-62, -22, 7], 'Heel'],
    [N0.dHead, [506, 22, 9], 'Damper'], [N0.ul, [-60, 5, 6], 'Underlever'], [fixed, [506, 156, 41], 'Damper guide rail'],
    [dStopRail, [539, 10, 41], 'Damper stop rail'], [liftTray, [575, -10, 41], 'Lift tray']
  ].map(([obj, p, text]) => {
    const e = document.createElement('div'); e.className = 'plabel'; e.textContent = text; e.hidden = true; overlay.appendChild(e);
    return { obj, p: new THREE.Vector3(...p), e };
  });
  let labelsOn = false;
  function setLabels(on) { labelsOn = on; for (const l of LABELS) l.e.hidden = !on; }
  const lv = new THREE.Vector3();
  function updateLabels() {
    if (!labelsOn) return;
    scene.updateMatrixWorld();
    const w = canvas.clientWidth, h = canvas.clientHeight;
    for (const l of LABELS) {
      lv.copy(l.p); l.obj.localToWorld(lv); lv.project(camera);
      l.e.style.transform = `translate(${(lv.x * 0.5 + 0.5) * w}px, ${(-lv.y * 0.5 + 0.5) * h}px)`;
      l.e.style.display = lv.z < 1 && Math.abs(lv.x) < 1.05 && Math.abs(lv.y) < 1.05 ? '' : 'none';
    }
  }

  // ---------- views ----------
  const VIEWS = {
    action: { t: [255, 105, 0], p: [255, 130, 1000] },
    angle: { t: [320, 110, 0], p: [-60, 270, 520] },
    escapement: { t: [330, 115, 0], p: [330, 121, 250] },
    keyfront: { t: [10, 55, 0], p: [-190, 125, 110] },
    hammer: { t: [425, 168, 0], p: [425, 171, 330] },
    backcheck: { t: [445, 125, 0], p: [452, 128, 330] },
    rails: { t: [325, 120, 0], p: [325, 125, 270] },
    // looking down the keys from the player's side at the hammer tops: sight the hammer line
    hammerline: { t: [460, 162, 0], p: [280, 245, 0] },
    dampers: { t: [540, 130, 0], p: [540, 140, 420] },
  };
  let viewAnim = null, viewZ = 0;
  // pull the camera back on tall, narrow screens so the same width of the action fits
  function viewPos(v) {
    const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    const k = aspect < 1.4 ? Math.min(2.4, 1.4 / aspect) : 1;
    const t = new THREE.Vector3(...v.t);
    return new THREE.Vector3(...v.p).sub(t).multiplyScalar(k).add(t);
  }
  // side views follow the note being worked on; the hammer-line view stays centered
  function setView(name, z = viewZ) {
    viewZ = z;
    const v = VIEWS[name] || VIEWS.action;
    const dz = name === 'hammerline' ? 0 : z;
    const toT = new THREE.Vector3(...v.t), toP = viewPos(v);
    toT.z += dz; toP.z += dz;
    viewAnim = { t0: performance.now(), fromT: controls.target.clone(), fromP: camera.position.clone(), toT, toP };
  }
  camera.position.copy(viewPos(VIEWS.action)); controls.target.set(...VIEWS.action.t);

  // ---------- highlight & hover ----------
  let highlighted = [];
  function highlight(parts, note = null) {
    for (const m of highlighted) m.material.emissive.setHex(0);
    highlighted = [];
    for (const p of [].concat(parts || [])) for (const m of partMeshes[p] || []) {
      if (note !== null && m.userData.note !== -1 && m.userData.note !== note) continue;
      m.material.emissive.setHex(0x7a4a00); highlighted.push(m);
    }
  }
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const shown = o => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
  function pick(ev) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    // faded exam notes stay clickable; only see-through-by-design parts (cheeks, ghosts) are skipped
    const hit = ray.intersectObjects(pickables, false).find(h => shown(h.object) && h.object.userData.baseOpacity > 0.3);
    return hit ? { part: hit.object.userData.part, note: hit.object.userData.note } : null;
  }

  // ---------- update from the model ----------
  let bg = null;
  function setBackground(hex) { if (hex !== bg) { scene.background = new THREE.Color(hex); bg = hex; } }

  function update(slot, sim, a, hammerOverride = null, jackOverride = null, drawShared = slot === 0) {
    const n = notes[slot];
    const k = keyAngle(a, sim.d);
    n.key.position.set(G.balX, k.By, 0); n.key.rotation.z = k.th;
    const L = sim.L;
    n.wippen.rotation.z = L.phi;
    n.jack.rotation.z = jackOverride ?? sim.psi;
    // repetition lever: horn sits under the knuckle or at its stop/drop limit
    const kb = hamPt(hammerOverride ?? sim.g, G.knuckleC)[1] - G.knuckleR;
    n.rep.rotation.z = -solveRho(L, Math.min(L.hornTop, kb));
    n.hammer.rotation.z = hammerOverride ?? sim.g;
    // alignment: spacing, traveling (drift at the string = 47 mm of rise times the tilt), squaring
    const tilt = -(a.hammerTravel || 0) / 44.5;           // crown rises about 44.5 mm to the strings
    n.align.rotation.x = tilt;
    n.align.position.z = (a.hammerSpace || 0) - 40 * Math.sin(tilt);   // keep the resting head where spacing puts it
    const wob = a.wobble ? a.wobble * ((sim.strikes || 0) % 2 ? 1 : -1) : 0;   // a split shank wobbles blow to blow
    n.headG.rotation.x = ((a.hammerSquare || 0) + wob) * Math.PI / 180;
    n.crack.visible = a.damage === 'splitShank';
    // adjustable parts
    const cap = Math.max(0.5, a.capstan);
    n.capstan.scale.y = Math.max(0.1, cap - CAP_H); n.capstan.position.y = G.keyThick + (cap - CAP_H) / 2;
    n.capDome.position.set(G.capstanLocal, G.keyThick + cap - G.capDomeR, 0);
    // the jack screw moves its button along the screw so the felt meets the stop at the jack's rest angle
    n.jackBtn.position.set(...jackBtnShift(L.psiRest), 0);
    // the height screw moves its button down the tail until it sits on the wippen with the lever at its stop
    n.repBtn.position.y = repBtnShift(L.rhoStop);
    n.balPunch.scale.y = Math.max(0.3, a.balPunch); n.balPunch.position.y = G.balRailY + Math.max(0.3, a.balPunch) / 2 - Math.max(0, 0.3 - a.balPunch);
    n.frontPunch.scale.y = Math.max(0.3, a.frontPunch); n.frontPunch.position.y = G.frontRailY + Math.max(0.3, a.frontPunch) / 2;
    n.letoffBtn.position.y = a.letoff;
    n.letoffStem.scale.y = 106 - (a.letoff + 3); n.letoffStem.position.y = (106 + a.letoff + 3) / 2;
    n.dropScrew.scale.y = DROP_TOP - a.drop; n.dropScrew.position.y = (DROP_TOP + a.drop) / 2;
    if (drawShared) restRail.position.y = a.restRail;
    n.bc.rotation.z = (a.backcheck - (a.wear || 0) * WEAR.backcheck) / 80;
    // packed-down felts
    const w = a.wear || 0;
    n.knuckle.scale.set((G.knuckleR + WEAR.knuckle * w) / G.knuckleR, (G.knuckleR + WEAR.knuckle * w) / G.knuckleR, 1);
    n.feltG.scale.y = (36 + WEAR.crown * w) / 36;
    n.heelG.scale.y = (2.1 + WEAR.capstan * w) / 2.1;
    // damper: the underlever's felt sits damperGap above the key end; the head rises with it
    const keyTop = k.By + Math.sin(k.th0) * G.dmpContactLocal + G.keyThick * Math.cos(k.th0);
    const feltY = keyTop + (a.damperGap ?? 3.5) + sim.yd / G.dmpRatio;
    const th = solveUl(feltY);
    n.ul.rotation.z = th;
    const wb = [UL_PIVOT[0] + UL_WIRE[0] * Math.cos(th) - UL_WIRE[1] * Math.sin(th), UL_PIVOT[1] + UL_WIRE[0] * Math.sin(th) + UL_WIRE[1] * Math.cos(th)];
    const headY = G.stringY + 1.1 + sim.yd;
    n.dHead.position.y = headY;
    n.wire.scale.y = Math.max(1, headY + 4 - wb[1]); n.wire.position.set(wb[0], (headY + 4 + wb[1]) / 2, WIRE_Z);
    if (drawShared) {
      // the stop rail sits where the underlever's top would be with the damper lifted damperStop;
      // the lift tray's top touches the underlever's underside when the pedal lifts it
      const feltRest = keyTop + (a.damperGap ?? 3.5);
      const ulY = (th, lx, ly) => UL_PIVOT[1] + lx * Math.sin(th) + ly * Math.cos(th);
      dStopRail.position.y = ulY(solveUl(feltRest + (a.damperStop ?? 7) / G.dmpRatio), 539 - UL_PIVOT[0], 5);
      liftTray.position.y = ulY(solveUl(feltRest + (sim.pedal ?? 0) * (a.pedalLift ?? 7) / G.dmpRatio), 575 - UL_PIVOT[0], -2) - 0.3;
    }
  }
  // jack-local shift of the jack button along its screw that puts its felt on the stop face at jack angle psi
  const scrU = (() => { const [a, b] = [J_SCREW_AXIS.from, J_SCREW_AXIS.to], l = Math.hypot(b[0] - a[0], b[1] - a[1]); return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; })();
  function jackBtnShift(psi) {
    const c = Math.cos(psi), s = Math.sin(psi), rot = p => [p[0] * c - p[1] * s, p[0] * s + p[1] * c];
    const f = rot(J_BTN_CONTACT), u = rot(scrU), { p, n: nn } = W_STOP_FACE;
    const gap = (G.jackPivotW[0] + f[0] - p[0]) * nn[0] + (G.jackPivotW[1] + f[1] - p[1]) * nn[1];
    const k = -gap / (u[0] * nn[0] + u[1] * nn[1]);
    return [scrU[0] * k, scrU[1] * k];
  }
  // rep-local drop of the height screw's button that seats it on the wippen top (y 0.7) with the lever at rho
  function repBtnShift(rho) {
    const [x, y] = R_BUTTON_C, c = Math.cos(-rho), s = Math.sin(-rho);
    return (0.7 - G.repPivotW[1] - x * s) / c - y;
  }
  // underlever angle that puts its lift felt at height y
  function solveUl(y) {
    let lo = -0.5, hi = 0.5;
    for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (UL_PIVOT[1] + UL_FELT[0] * Math.sin(m) + UL_FELT[1] * Math.cos(m) > y) lo = m; else hi = m; }
    return (lo + hi) / 2;
  }
  // repetition lever angle that puts the horn at height y
  function solveRho(L, y) {
    let lo = L.rhoStop - 0.6, hi = L.rhoStop;
    for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (L.repPt(m, G.horn)[1] < y) lo = m; else hi = m; }
    return (lo + hi) / 2;
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.floor(w * renderer.getPixelRatio()) || canvas.height !== Math.floor(h * renderer.getPixelRatio())) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
      refitTool();
    }
  }
  const v3 = new THREE.Vector3();
  function render() {
    resize();
    if (viewAnim) {
      const t = Math.min(1, (performance.now() - viewAnim.t0) / 700), e = t * t * (3 - 2 * t);
      controls.target.lerpVectors(viewAnim.fromT, viewAnim.toT, e);
      camera.position.lerpVectors(viewAnim.fromP, viewAnim.toP, e);
      if (t >= 1) viewAnim = null;
    }
    spinTool();
    controls.update();
    updateLabels();
    renderer.render(scene, camera);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    for (const c of callouts.values()) {
      v3.set(...c.mid).project(camera);
      c.el.style.transform = `translate(${(v3.x * 0.5 + 0.5) * w}px, ${(-v3.y * 0.5 + 0.5) * h}px)`;
      c.el.style.display = v3.z < 1 ? '' : 'none';
    }
  }

  // ---------- tool bag: one tool on the bench at a time, in place of the action ----------
  const toolStage = new THREE.Group(); toolStage.visible = false; scene.add(toolStage);
  const grid = new THREE.GridHelper(300, 30, 0x9a8f80, 0xc9c1b4);   // 10 mm squares
  toolStage.add(grid);
  const toolHolder = new THREE.Group(); toolStage.add(toolHolder);
  const AX = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
  const axis = s => { const m = /([+-]?)\s*([xyz])/i.exec(s || ''); if (!m) return null; const v = new THREE.Vector3(...AX[m[2].toLowerCase()]); return m[1] === '-' ? v.negate() : v; };
  let savedView = null, spin = true, roomEnv = null, toolR = 0;
  // obj: a THREE.Object3D built for the tool (models of real tools, added one at a time)
  async function showTool(obj, opts = {}) {
    // polished steel and brass need something to reflect: a soft room, only while a tool is out
    if (!roomEnv) { const pm = new THREE.PMREMGenerator(renderer); roomEnv = pm.fromScene(new RoomEnvironment(renderer), 0.04).texture; pm.dispose(); }
    if (!savedView) savedView = { p: camera.position.clone(), t: controls.target.clone() };
    fixed.visible = false; notes.forEach(n => { n.root.visible = false; });
    toolStage.visible = true;
    scene.environment = roomEnv;
    lightsForTools(true);
    // each tool is built fresh; free the last one's buffers (materials are shared, so they stay)
    toolHolder.traverse(o => o.geometry?.dispose());
    toolHolder.clear();
    const mesh = obj;
    // turn the model so its length runs left-right and its natural up is up
    const up = axis(opts.upAxis) || new THREE.Vector3(0, 0, 1);
    let len = axis(opts.lengthAxis) || new THREE.Vector3(1, 0, 0);
    if (Math.abs(len.dot(up)) > 0.9) len = Math.abs(up.x) > 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const n = new THREE.Vector3().crossVectors(len, up);
    const m4 = new THREE.Matrix4().set(len.x, len.y, len.z, 0, up.x, up.y, up.z, 0, n.x, n.y, n.z, 0, 0, 0, 0, 1);
    mesh.applyMatrix4(m4);
    const box = new THREE.Box3().setFromObject(mesh), c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
    mesh.position.sub(new THREE.Vector3(c.x, box.min.y, c.z));
    toolHolder.add(mesh);
    toolHolder.rotation.y = 0;
    toolR = Math.max(size.x, size.z, size.y * 1.5, 30);
    viewAnim = { t0: performance.now(), fromT: controls.target.clone(), fromP: camera.position.clone(),
      toT: new THREE.Vector3(0, size.y / 2, 0), toP: new THREE.Vector3(0.2, 0.9, 1.9).setLength(toolDistance()).add(new THREE.Vector3(0, size.y, 0)) };
    spin = !opts.still;
    return { size: { x: size.x, y: size.y, z: size.z } };
  }
  // frame the whole tool with room to turn: its longest side fills about 80% of the width, even on a tall phone screen
  function toolDistance() {
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    return Math.max(1.9 * toolR, 0.62 * toolR / (tanV * camera.aspect));
  }
  // the window changed shape (a phone turned): keep the view's direction, step in or out to fit again
  function refitTool() {
    if (!toolStage.visible || !toolR) return;
    if (viewAnim) { viewAnim.toP.sub(viewAnim.toT).setLength(toolDistance()).add(viewAnim.toT); return; }
    camera.position.sub(controls.target).setLength(toolDistance()).add(controls.target);
  }
  function hideTool() {
    if (!toolStage.visible) return;
    toolStage.visible = false; scene.environment = null; lightsForTools(false); fixed.visible = true; setNoteCount(noteCount);
    if (savedView) { viewAnim = { t0: performance.now(), fromT: controls.target.clone(), fromP: camera.position.clone(), toT: savedView.t, toP: savedView.p }; savedView = null; }
  }
  // the room already lights the tool from all round, so the direct lights step back while it is out
  function lightsForTools(on) { hemi.intensity = on ? 0.45 : 1.6; sun.intensity = on ? 1.1 : 1.6; fill.intensity = on ? 0.3 : 0.5; }
  controls.addEventListener('start', () => { spin = false; });
  let spinT = 0;
  function spinTool() {   // by the clock, so it turns at the same speed on any screen refresh rate
    const now = performance.now(), dt = Math.min(0.1, (now - spinT) / 1000); spinT = now;
    if (toolStage.visible && spin) toolHolder.rotation.y += dt * 0.35;
  }

  setNoteCount(1);
  return { render, update, setView, showTool, hideTool, spinTool, highlight, pick, setCallout, clearCallouts, setBackground, controls, camera, setLabels,
           setNoteCount, setFocus, straightedge, PART_NAMES, VIEWS };
}
