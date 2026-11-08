// Three.js drawing of the upright action, at rest (research/upright/protocol.md, chunk C1). Standalone: the grand's
// scene.js is not touched; the helpers below are its idioms, and the two scenes share one core at the switch (C6).
// Units are millimetres. The world frame is the sim frame (upright-model.js): x toward the strings, y up, keybed at
// y = 0. Everything of the action is built in the action frame (origin at the butt centre pin) inside a group placed
// at H, each moving part in its own pivot's group, so the kinematics (C2) only turn groups.
// Across the keyboard: +z is the player's right, the treble. The model measures sideways with + toward the bass, so
// sideways offsets are drawn at BASS times (the grand's rule, scene.js).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { H, KEY, CENTER, TRACE, SHANK, shankAt, CATCHER_SHANK, CAPSTAN, EYE, STRAP_T, BUTT_FORK, WIPPEN_FORK, DAMPER_FORK, SCREWS,
  BRIDLE_Z, MAIN_RAIL, HAMMER_RAIL, LETOFF_RAIL, STRING, stringX, WIDTH, RAIL_N, SPOON_BASE, spoonAngle, BC_BEND, bcAngle,
  BRIDLE_BASE, bridleAngle, strapEnds, STRAP_LEN, turn, wipPt, KEY_RAILS } from './upright-model.js';

// the bass side is -z (on the player's left, as seen from the keys)
export const BASS = -1;
// note slots: 0 is the middle (the one drawn solid), 1 toward the bass, 2 toward the treble (see-through neighbors)
export const NOTE_Z = [0, WIDTH.pitch * BASS, -WIDTH.pitch * BASS];

const COLORS = {
  keybed: 0x6e4c2e, rail: 0xa47a4c, wood: 0xd7b98c, keywood: 0xe6d3ad, keytop: 0xf6f3ea,
  felt: 0x2f6e46, redfelt: 0x9b2f2f, hammerfelt: 0xeee6d2, buckskin: 0xb38b55, tape: 0xf1ede4,
  brass: 0xc9a24a, steel: 0xa9afb6, string: 0xcfd3d8, dark: 0x3a2c22, ghost: 0xf2efe7,
};

export const PART_NAMES = {
  keybed: 'Keybed (stand-in)', key: 'Key (stand-in until measured)', balrail: 'Balance rail (stand-in)',
  frontrail: 'Front rail (stand-in)', backrail: 'Back rail and cloth (stand-in)', capstan: 'Capstan: a wooden dowel on a wire screwed into the key',
  wippen: 'Wippen', heel: 'Wippen cushion (on the capstan)', wflange: 'Wippen flange: hangs from the main rail, screwed at the back',
  wcenter: 'Wippen center pin', jackflange: 'Jack flange (on the wippen)', jack: 'Jack', jcenter: 'Jack center pin',
  jackspring: 'Jack spring', spoon: 'Damper spoon', bcwire: 'Backcheck wire', backcheck: 'Backcheck (felt face)',
  bridle: 'Bridle wire', strap: 'Bridle strap: tape from the catcher, hooked on the bridle wire',
  butt: 'Hammer butt', cushion: 'Butt cushion (felt and buckskin): the jack lifts it', bflange: 'Butt flange: on the main rail',
  bscrew: 'Butt flange screw', hcenter: 'Butt center pin', buttspring: 'Butt spring', shank: 'Hammer shank',
  hammer: 'Hammer head', catcher: 'Catcher (butt check)', mainrail: 'Main (action) rail', hammerrail: 'Hammer rail and its felt',
  letoffrail: 'Let-off (regulating) rail', letoff: 'Let-off button', letoffscrew: 'Let-off regulating screw and its eye',
  jackstop: 'Jack stop rail and felt', lever: 'Damper lever', leverfelt: 'Damper lever felt (the spoon pushes it)',
  dflange: 'Damper flange', dcenter: 'Damper lever center pin', dspring: 'Damper spring', dwire: 'Damper wire',
  dblock: 'Damper block and its screw', damper: 'Damper head', damperfelt: 'Damper felts', string: 'Strings',
};

function shapeFrom(pts) {
  const s = new THREE.Shape();
  s.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
  s.closePath();
  return s;
}
const rect = (x0, y0, x1, y1) => shapeFrom([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
const rel = (pts, o) => pts.map(([x, y]) => [x - o[0], y - o[1]]);
// the part of a polygon on one side of a line x = k (or y = k): where a part narrows into a fork round a centre pin
function clip(pts, axis, k, keepAbove) {
  const i = axis === 'x' ? 0 : 1, inside = p => (keepAbove ? p[i] >= k : p[i] <= k), out = [];
  for (let n = 0; n < pts.length; n++) {
    const a = pts[n], b = pts[(n + 1) % pts.length];
    if (inside(a)) out.push(a);
    if (inside(a) !== inside(b)) {
      const t = (k - a[i]) / (b[i] - a[i]);
      out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
    }
  }
  return out;
}

export function createUprightScene(canvas, overlay) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 5, 5000);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.minDistance = 40; controls.maxDistance = 3000;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x554433, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(200, 500, 600);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xffffff, 0.5);
  fill.position.set(-300, 100, -400);
  scene.add(fill);

  const pickables = [];
  const partMeshes = {};
  let building = -1;    // note slot the parts being built belong to (-1 = shared)
  let ghost = 1;        // opacity scale for the note being built: the neighbors are see-through
  function mat(color, opts = {}) {
    const op = (opts.opacity ?? 1) * ghost;
    return new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: opts.metal ? 0.6 : 0.05, transparent: op < 1, opacity: op,
      depthWrite: op > 0.5 });
  }
  function register(m, part, opts) {
    m.userData.part = part; m.userData.note = building; m.userData.baseOpacity = (opts.opacity ?? 1) * ghost;
    if (part && !opts.noPick) { pickables.push(m); (partMeshes[part] ||= []).push(m); }
  }
  function ext(shape, depth, z0, color, part, parent, opts = {}) {
    const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 16 });
    geo.translate(0, 0, z0 - depth / 2);
    const m = new THREE.Mesh(geo, mat(color, opts));
    parent.add(m); register(m, part, opts);
    return m;
  }
  const extPts = (pts, depth, z0, color, part, parent, opts) => ext(shapeFrom(pts), depth, z0, color, part, parent, opts);
  function cyl(r, len, axis, pos, color, part, parent, opts = {}) {
    const geo = new THREE.CylinderGeometry(r, r, len, 20);
    if (axis === 'x') geo.rotateZ(Math.PI / 2);
    if (axis === 'z') geo.rotateX(Math.PI / 2);
    const m = new THREE.Mesh(geo, mat(color, opts));
    m.position.set(...pos);
    parent.add(m); register(m, part, opts);
    return m;
  }
  // a round part from a to b (side-view points, at depth z)
  function rodBetween(a, b, r, color, part, parent, opts = {}, z = 0) {
    const A = new THREE.Vector3(a[0], a[1], z), B = new THREE.Vector3(b[0], b[1], z);
    const m = cyl(r, A.distanceTo(B), 'y', [0, 0, 0], color, part, parent, { metal: true, ...opts });
    m.position.copy(A).add(B).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.sub(A).normalize());
    return m;
  }
  // Wires, tapes and coils that bend as the parts move are rebuilt each pose: each has a geometry builder, and
  // reshape() swaps a mesh's geometry for a new one.
  const wireGeo = (pts, r, z) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x, y, z)), false,
    'centripetal'), Math.max(8, pts.length * 8), r, 8);
  function tapeGeo(pts, thick, width, z) {
    const n = pts.map((p, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      return [-dy / l, dx / l];
    });
    const side = s => pts.map((p, i) => [p[0] + s * n[i][0] * thick / 2, p[1] + s * n[i][1] * thick / 2]);
    const geo = new THREE.ExtrudeGeometry(shapeFrom([...side(1), ...side(-1).reverse()]), { depth: width, bevelEnabled: false });
    geo.translate(0, 0, z - width / 2);
    return geo;
  }
  function coilGeo(a, b, R, r, turns, z) {
    const ax = new THREE.Vector3(b[0] - a[0], b[1] - a[1], 0), len = ax.length(); ax.normalize();
    const u = new THREE.Vector3(-ax.y, ax.x, 0), w = new THREE.Vector3(0, 0, 1), pts = [];
    for (let i = 0; i <= turns * 24; i++) {
      const t = i / (turns * 24), th = t * turns * 2 * Math.PI;
      pts.push(new THREE.Vector3(a[0], a[1], z).addScaledVector(ax, t * len).addScaledVector(u, R * Math.cos(th)).addScaledVector(w, R * Math.sin(th)));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), turns * 24, r, 6);
  }
  function mesh(geo, color, part, parent, opts = {}) {
    const m = new THREE.Mesh(geo, mat(color, opts));
    parent.add(m); register(m, part, opts);
    return m;
  }
  function reshape(m, geo) { m.geometry.dispose(); m.geometry = geo; }
  // a bent wire through side-view points, at depth z
  const wire = (pts, r, color, part, parent, z = 0, opts = {}) => mesh(wireGeo(pts, r, z), color, part, parent, { metal: true, ...opts });
  // a cloth tape through side-view points: thick across the side view, wide across the keyboard
  const tape = (pts, thick, width, z, color, part, parent) => mesh(tapeGeo(pts, thick, width, z), color, part, parent);
  // a coil spring along a side-view axis from a to b, coil radius R, wire radius r
  const coil = (a, b, R, r, turns, part, parent, z = 0) => mesh(coilGeo(a, b, R, r, turns, z), COLORS.steel, part, parent, { metal: true });
  // a turned part about +y, from [radius, height] points listed bottom to top
  function lathe(profile, color, part, parent, opts = {}) {
    const m = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 24), mat(color, opts));
    parent.add(m); register(m, part, opts);
    return m;
  }
  // a center pin across a part, with the cloth bushing ring showing round it on each face
  function center(part, parent, [x, y], len) {
    cyl(1.27, len, 'z', [x, y, 0], COLORS.redfelt, part, parent);
    cyl(0.635, len + 0.8, 'z', [x, y, 0], COLORS.steel, part, parent, { metal: true });
  }
  // a round-head wood screw (the grand's flange screw shape: #5, head Ø 5.6): its head's underside at p, going in along dir
  const SCREW_HEAD = [[0, 0], [2.8, 0], [2.8, 0.9], [2.5, 1.45], [1.9, 1.8], [1, 1.95], [0, 2]];
  function screw(part, parent, { p, dir, len }, z = 0) {
    const g = new THREE.Group(); g.position.set(p[0], p[1], z); parent.add(g);
    g.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), new THREE.Vector3(dir[0], dir[1], 0).normalize());
    lathe(SCREW_HEAD, COLORS.steel, part, g, { metal: true });
    ext(rect(-2.8, 1.3, 2.8, 2.1), 0.7, 0, COLORS.dark, part, g);   // the slot across the head
    cyl(1.6, len, 'y', [0, -len / 2, 0], COLORS.steel, part, g, { metal: true });
    return g;
  }

  // the action frame: everything below is drawn in it
  const act = new THREE.Group(); act.position.set(H[0], H[1], 0); scene.add(act);
  const A = (x, y) => [x - H[0], y - H[1]];   // a sim-frame point in the action frame (the key and its rails)

  // ---------- shared: keybed and key frame (stand-ins, see-through), rails, strings ----------
  const fixed = new THREE.Group(); act.add(fixed);
  const SI = { opacity: 0.3 };   // stand-ins without a reference yet: see-through
  ext(rect(...A(-30, -14), ...A(520, 0)), 100, 0, COLORS.keybed, 'keybed', fixed, SI);
  const [, railTop] = A(0, KEY.bottomY), FX = KEY_RAILS.pinX;
  ext(rect(...A(FX - 8, 0), A(FX + 8, 0)[0], A(0, KEY_RAILS.frontTop)[1]), 80, 0, COLORS.rail, 'frontrail', fixed, SI);
  ext(rect(...A(KEY.balX - 12, 0), A(KEY.balX + 12, 0)[0], A(0, KEY_RAILS.balTop)[1]), 80, 0, COLORS.rail, 'balrail', fixed, SI);
  ext(rect(...A(KEY.backX - 30, 0), A(KEY.backX, 0)[0], railTop - 2), 80, 0, COLORS.rail, 'backrail', fixed, SI);
  ext(rect(A(KEY.backX - 30, 0)[0], railTop - 2, A(KEY.backX, 0)[0], railTop), 80, 0, COLORS.felt, 'backrail', fixed, SI);
  // rails: each face where the filmed model's is; their sections are stand-ins (upright-model.js). Brackets not drawn.
  extPts(MAIN_RAIL, 80, 0, COLORS.rail, 'mainrail', fixed);
  const hammerRail = new THREE.Group(); fixed.add(hammerRail);   // the soft pedal will move it
  extPts(HAMMER_RAIL.wood, 80, 0, COLORS.rail, 'hammerrail', hammerRail);
  extPts(HAMMER_RAIL.felt, 80, 0, COLORS.felt, 'hammerrail', hammerRail);
  extPts(LETOFF_RAIL, 80, 0, COLORS.rail, 'letoffrail', fixed);
  // the jack stop: the filmed block and felt, run on as a rail (pianos have a felted jack stop rail, S2)
  extPts(TRACE.jackStop, 80, 0, COLORS.rail, 'jackstop', fixed);
  extPts(TRACE.jackStopFelt, 80, 0, COLORS.felt, 'jackstop', fixed);

  // ---------- one note ----------
  function makeNote(slot) {
    building = slot; ghost = slot === 0 ? 1 : 0.18;
    const root = new THREE.Group(); root.position.z = NOTE_Z[slot]; act.add(root);
    const n = { root };

    // key (stand-in), its group on the balance pin (where it rocks), with the capstan screwed into it; punchings and pins
    const kp = A(KEY.balX, KEY.bottomY), K = ([x, y]) => [x - kp[0], y - kp[1]];   // action frame -> the key's frame
    const key = n.key = new THREE.Group(); key.position.set(...kp, 0); root.add(key);
    const [kx0, ky0] = K(A(0, KEY.bottomY)), kx1 = K(A(KEY.backX, 0))[0];
    ext(rect(kx0, ky0, kx1, ky0 + KEY.thick), WIDTH.key, 0, COLORS.keywood, 'key', key, SI);
    ext(rect(kx0, ky0 + KEY.thick, kx0 + 150, ky0 + KEY.thick + 2.5), WIDTH.key + 0.4, 0, COLORS.keytop, 'key', key, SI);
    // the punchings: 1 mm discs stacked to the knob's thickness on their rails (update() sets the stacks)
    const punch = (x, top, part) => { const m = cyl(6, 1, 'y', [x, 0, 0], COLORS.felt, part, root, SI); m.geometry.translate(0, 0.5, 0); m.position.y = top; return m; };
    n.balPunch = punch(kp[0], A(0, KEY_RAILS.balTop)[1], 'balrail');
    n.frontPunch = punch(A(FX, 0)[0], A(0, KEY_RAILS.frontTop)[1], 'frontrail');
    cyl(1.5, 30, 'y', [kp[0], railTop + 10, 0], COLORS.steel, 'balrail', root, { ...SI, metal: true, noPick: true });
    // the capstan: a wooden dowel turned on a wire screwed into the key [e]
    const cx = K([CAPSTAN.x, 0])[0], cy = y => K([0, y])[1];
    rodBetween([cx, cy(CAPSTAN.keyTop)], [cx, cy(CAPSTAN.dowelBottom + 3)], CAPSTAN.wireR, COLORS.steel, 'capstan', key);
    // the dowel turns up or down its wire (the capstan knob); the hole for the capstan tool through it
    const dowel = n.capDowel = new THREE.Group(); key.add(dowel);
    cyl(CAPSTAN.r, CAPSTAN.top - CAPSTAN.dowelBottom, 'y', [cx, cy((CAPSTAN.top + CAPSTAN.dowelBottom) / 2), 0], COLORS.wood, 'capstan', dowel);
    cyl(0.9, 2 * CAPSTAN.r + 0.4, 'z', [cx, cy(CAPSTAN.dowelBottom + 7), 0], COLORS.dark, 'capstan', dowel);

    // wippen: the bar on its center pin, forked round the flange's tongue; the heel and its cushion on the capstan;
    // the jack's flange; the spoon, backcheck and bridle wires; the jack spring
    const W = CENTER.wippen, wippen = n.wippen = new THREE.Group(); wippen.position.set(W[0], W[1], 0); root.add(wippen);
    const WF = WIPPEN_FORK.x, wt = WIPPEN_FORK.tongue;   // between WF the wippen is two cheeks round the flange's tongue
    extPts(rel(clip(TRACE.wippen, 'x', WF[0], false), W), WIDTH.wippen, 0, COLORS.wood, 'wippen', wippen);
    extPts(rel(clip(TRACE.wippen, 'x', WF[1], true), W), WIDTH.wippen, 0, COLORS.wood, 'wippen', wippen);
    const wCheek = (WIDTH.wippen - wt) / 2, fork = rel(clip(clip(TRACE.wippen, 'x', WF[0], true), 'x', WF[1], false), W);
    extPts(fork, wCheek, -(wt + wCheek) / 2, COLORS.wood, 'wippen', wippen);
    extPts(fork, wCheek, (wt + wCheek) / 2, COLORS.wood, 'wippen', wippen, { opacity: 0.3 });
    extPts(rel(TRACE.heel, W), WIDTH.wippen, 0, COLORS.wood, 'wippen', wippen);
    extPts(rel(TRACE.heelCushion, W), WIDTH.wippen + 0.4, 0, COLORS.felt, 'heel', wippen);
    const jCheek = WIDTH.jackFlange, jz = (WIDTH.jack + jCheek) / 2 + 0.2;
    extPts(rel(TRACE.jackFlange, W), jCheek, -jz, COLORS.wood, 'jackflange', wippen);
    extPts(rel(TRACE.jackFlange, W), jCheek, jz, COLORS.wood, 'jackflange', wippen, { opacity: 0.3 });
    // the wires bend about their feet (spoon, bridle wire) or the bend just above it (backcheck) when regulated
    const bentAt = at => { const g = new THREE.Group(); g.position.set(...rel([at], W)[0], 0); wippen.add(g); return g; };
    n.spoon = bentAt(SPOON_BASE);
    wire(rel(TRACE.spoon, SPOON_BASE), 1, COLORS.brass, 'spoon', n.spoon);
    wire(rel(TRACE.backcheckWire.slice(0, 2), W), 1, COLORS.steel, 'bcwire', wippen);
    n.bc = bentAt(BC_BEND);
    wire(rel(TRACE.backcheckWire.slice(1), BC_BEND), 1, COLORS.steel, 'bcwire', n.bc);
    extPts(rel(TRACE.backcheck, BC_BEND), WIDTH.backcheck, 0, COLORS.wood, 'backcheck', n.bc);
    extPts(rel(TRACE.backcheckFelt, BC_BEND), WIDTH.backcheck, 0, COLORS.felt, 'backcheck', n.bc);
    n.bridle = bentAt(BRIDLE_BASE);
    wire(rel(TRACE.bridleWire, BRIDLE_BASE), 0.75, COLORS.brass, 'bridle', n.bridle, BASS * BRIDLE_Z);
    // its top bent over into the hook the strap's end hangs on
    const hk = rel([TRACE.bridleWire.at(-1)], BRIDLE_BASE)[0];
    wire([hk, [hk[0] + 1.2, hk[1] + 1.6], [hk[0] + 2.6, hk[1] + 0.6], [hk[0] + 2.6, hk[1] - 1.2]], 0.75, COLORS.brass, 'bridle', n.bridle, BASS * BRIDLE_Z);
    n.jackSpring = coil(rel([TRACE.jackSpring[0]], W)[0], rel([TRACE.jackSpring[1]], W)[0], 2, 0.35, 6, 'jackspring', wippen);
    center('wcenter', wippen, [0, 0], WIDTH.wippen + 0.6);
    center('jcenter', wippen, rel([CENTER.jack], W)[0], WIDTH.jack + 2 * jCheek + 1);

    // jack: an L on its center pin, between the jack flange's cheeks
    const jack = n.jack = new THREE.Group(); jack.position.set(CENTER.jack[0] - W[0], CENTER.jack[1] - W[1], 0); wippen.add(jack);
    extPts(rel(TRACE.jack, CENTER.jack), WIDTH.jack, 0, COLORS.wood, 'jack', jack);

    // wippen flange: a tongue hanging from the main rail's underside to its rounded end round the pin, with a plate up the
    // rail's back face where its screw goes in from the back [T: Igrec fig. 337]
    {
      const g = n.wflange = new THREE.Group(); root.add(g);
      extPts(TRACE.wippenFlange, WIPPEN_FORK.tongue, 0, COLORS.wood, 'wflange', g);
      extPts(TRACE.wippenFlangePlate, WIDTH.damperFlange, 0, COLORS.wood, 'wflange', g);
      screw('wflange', g, SCREWS.wippenFlange);
    }

    // hammer: the butt (its tongue between the flange's cheeks), cushion, shank, head and catcher, all turning about the
    // butt center pin
    const hammer = n.hammer = new THREE.Group(); root.add(hammer);
    extPts(clip(TRACE.butt, 'y', BUTT_FORK.y, true), WIDTH.butt, 0, COLORS.wood, 'butt', hammer);
    extPts(clip(TRACE.butt, 'y', BUTT_FORK.y, false), BUTT_FORK.tongue, 0, COLORS.wood, 'butt', hammer);
    // the cushion: felt with a buckskin face where the jack lifts it [T: which layer is where]
    extPts(TRACE.buttCushion, WIDTH.butt - 0.6, 0, COLORS.redfelt, 'cushion', hammer);
    {
      const c = TRACE.buttCushion, yb = Math.min(...c.map(p => p[1]));
      extPts([[c[4][0], yb], [c[3][0], yb], [c[3][0], yb + 0.8], [c[4][0], yb + 0.8]], WIDTH.butt - 0.4, 0, COLORS.buckskin, 'cushion', hammer);
    }
    rodBetween(shankAt(SHANK.y0), shankAt(SHANK.y1), SHANK.r, COLORS.wood, 'shank', hammer, { metal: false });
    // head: the molding's end grain inside the underfelt inside the top felt, as a hammer's side shows them
    extPts(TRACE.headFelt, WIDTH.head, 0, COLORS.hammerfelt, 'hammer', hammer);
    extPts(TRACE.underfelt, WIDTH.head + 0.2, 0, COLORS.redfelt, 'hammer', hammer);
    extPts(TRACE.molding, WIDTH.head + 0.4, 0, COLORS.wood, 'hammer', hammer);
    rodBetween(CATCHER_SHANK.from, CATCHER_SHANK.to, CATCHER_SHANK.r, COLORS.wood, 'catcher', hammer, { metal: false });
    extPts(TRACE.catcherHead, WIDTH.catcher, 0, COLORS.wood, 'catcher', hammer);
    {   // buckskin on the check face [T]
      const [p, q] = [TRACE.catcherHead[0], TRACE.catcherHead[5]], dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy), nx = -dy / l, ny = dx / l;
      extPts([p, q, [q[0] + nx * 1, q[1] + ny * 1], [p[0] + nx * 1, p[1] + ny * 1]], WIDTH.catcher + 0.2, 0, COLORS.buckskin, 'catcher', hammer);
    }
    center('hcenter', hammer, [0, 0], WIDTH.flange + 0.6);

    // butt flange: foot and stem on the main rail, two cheeks round the butt's tongue, rounded about the pin; its screw
    // down through the foot's shelf into the rail [T]; the butt spring's coil on it
    {
      const g = n.bflange = new THREE.Group(); root.add(g);
      const f = TRACE.buttFlange;
      const { cheekR: r, cheekBottom: yb, tongue } = BUTT_FORK;
      extPts(clip(f, 'y', yb, false), WIDTH.flange, 0, COLORS.wood, 'bflange', g);
      const cheek = new THREE.Shape();
      cheek.moveTo(-r, yb); cheek.lineTo(r, yb); cheek.lineTo(r, 0); cheek.absarc(0, 0, r, 0, Math.PI, false); cheek.closePath();
      const cw = (WIDTH.flange - tongue - 0.2) / 2, cz = (tongue + 0.2 + cw) / 2;   // a hair clear of the butt's tongue
      ext(cheek, cw, -cz, COLORS.wood, 'bflange', g);
      ext(cheek, cw, cz, COLORS.wood, 'bflange', g, { opacity: 0.35 });
      screw('bscrew', g, SCREWS.buttFlange);
      // the spring's coil on the near cheek, its leg up to the butt's back
      cyl(1.6, 2.2, 'z', [...TRACE.buttSpring[0], cz], COLORS.steel, 'buttspring', g, { metal: true });
      n.buttSpring = wire(TRACE.buttSpring, 0.5, COLORS.steel, 'buttspring', g, cz); n.buttSpringZ = cz;
    }

    // the bridle strap, catcher to bridle wire, draped over the let-off screw's eye (C2 lays it out each frame)
    n.strap = tape(TRACE.strap, STRAP_T, WIDTH.strap, 0, COLORS.tape, 'strap', root);
    n.strapEnd = cyl(1.6, 0.6, 'z', [...TRACE.strap.at(-1), BASS * BRIDLE_Z + 0.9], COLORS.buckskin, 'strap', root);   // its leather end on the hook

    // let-off: the regulating screw down through the rail, the button on its end, the eye on top
    {
      const g = n.letoff = new THREE.Group(); root.add(g);
      const [sx, sy0] = TRACE.letoffScrew[0], sy1 = TRACE.letoffScrew[1][1];
      const b = TRACE.letoffButton, f = TRACE.letoffFelt, bx = (b[0][0] + b[1][0]) / 2, br = (b[1][0] - b[0][0]) / 2;
      cyl(br, b[0][1] - b[2][1], 'y', [bx, (b[0][1] + b[2][1]) / 2, 0], 0xe8e2d4, 'letoff', g);
      cyl(br, f[0][1] - f[2][1], 'y', [bx, (f[0][1] + f[2][1]) / 2, 0], COLORS.felt, 'letoff', g);
      cyl(1.25, sy1 - sy0, 'y', [sx, (sy0 + sy1) / 2, 0], COLORS.steel, 'letoffscrew', g, { metal: true });
      const eye = new THREE.Mesh(new THREE.TorusGeometry(EYE.R, EYE.r, 8, 24), mat(COLORS.steel, { metal: true }));
      eye.position.set(...TRACE.letoffEye, 0); g.add(eye); register(eye, 'letoffscrew', {});
    }

    // damper: the lever on its pin, its felt for the spoon, the wire up to the block, the head and its two felts
    const D = CENTER.damper, damper = n.damper = new THREE.Group(); damper.position.set(D[0], D[1], 0); root.add(damper);
    extPts(rel(TRACE.damperLever, D), WIDTH.damperLever, 0, COLORS.wood, 'lever', damper);
    extPts(rel(TRACE.leverFelt, D), WIDTH.damperLever, 0, COLORS.felt, 'leverfelt', damper);
    wire(rel(TRACE.damperWire, D), 0.8, COLORS.steel, 'dwire', damper);
    {
      const b = TRACE.damperBlock;
      cyl(b.r, b.x1 - b.x0, 'x', [(b.x0 + b.x1) / 2 - D[0], b.y - D[1], 0], COLORS.wood, 'dblock', damper);
      // its screw, into the block's player end
      cyl(1.4, 4, 'x', [b.x0 - 1 - D[0], b.y - D[1], 0], COLORS.brass, 'dblock', damper, { metal: true });
      cyl(2.4, 1.4, 'x', [b.x0 - 3.2 - D[0], b.y - D[1], 0], COLORS.brass, 'dblock', damper, { metal: true });
    }
    extPts(rel(TRACE.damperHead, D), WIDTH.damperHead, 0, COLORS.redfelt, 'damper', damper);
    for (const f of TRACE.damperFelts) extPts(rel(f, D), WIDTH.damperHead, 0, COLORS.hammerfelt, 'damperfelt', damper);
    center('dcenter', damper, [0, 0], WIDTH.damperLever + 5);

    // damper flange: the arm from its foot on the main rail's back face out to two cheeks round the lever; its screw
    // into the rail from the back [T]; the damper spring's coil on it
    {
      const g = n.dflange = new THREE.Group(); root.add(g);
      const DF_X = DAMPER_FORK.x;
      extPts(clip(TRACE.damperFlange, 'x', DF_X, false), WIDTH.damperFlange, 0, COLORS.wood, 'dflange', g);
      const cz = WIDTH.damperLever / 2 + 1.2;
      extPts(clip(TRACE.damperFlange, 'x', DF_X, true), 2, -cz, COLORS.wood, 'dflange', g);
      extPts(clip(TRACE.damperFlange, 'x', DF_X, true), 2, cz, COLORS.wood, 'dflange', g, { opacity: 0.35 });
      screw('dflange', g, SCREWS.damperFlange);
      // the spring's coil beside the flange, its leg up the lever's player face
      cyl(1.5, 1.6, 'z', [...TRACE.damperSpring[0], WIDTH.damperFlange / 2 + 0.8], COLORS.steel, 'dspring', g, { metal: true });
      n.damperSpring = wire(TRACE.damperSpring, 0.45, COLORS.steel, 'dspring', g, WIDTH.damperFlange / 2 + 0.8);
    }

    // the unison in the string plane
    for (const z of STRING.unison) rodBetween([stringX(STRING.y0), STRING.y0], [stringX(STRING.y1), STRING.y1], STRING.r, COLORS.string, 'string', root, {}, z);
    building = -1; ghost = 1;
    return n;
  }
  const notes = [0, 1, 2].map(makeNote);
  const N0 = notes[0];

  // ---------- pose: turn the parts to a pose of the model (upright-model.js pose()), with the knobs a ----------
  const lerp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  // a spring's leg from its coil (fixed) to its end on a part turned by `move`; the bend shared along the way
  const leg = (pts, move) => pts.map((p, i) => lerp(p, move(p), i / (pts.length - 1)));
  function update(a, p, slot = 0) {
    const n = notes[slot];
    n.key.position.y = A(0, p.bal)[1]; n.key.rotation.z = p.th;
    n.balPunch.scale.y = Math.max(0.01, a.balPunch); n.frontPunch.scale.y = Math.max(0.01, a.frontPunch);
    n.capDowel.position.y = a.capstan;
    n.wippen.rotation.z = -p.phi;
    n.jack.rotation.z = p.psi;
    n.hammer.rotation.z = -p.g;
    n.damper.rotation.z = p.dl;
    n.spoon.rotation.z = spoonAngle(a); n.bc.rotation.z = bcAngle(a); n.bridle.rotation.z = bridleAngle(a);
    n.letoff.position.y = -a.letoff;
    // the hammer rail is every note's: the last note posed sets it (the preview poses all three with the same pedal).
    // p.soft is true/false from pose(), or the share of the pedal's travel (0-1) from a running Sim
    const rs = a.railShim + Number(p.soft || 0) * a.softFelt; hammerRail.position.set(RAIL_N[0] * rs, RAIL_N[1] * rs, 0);
    // the springs follow the parts they press; the strap hangs between the catcher and the bridle wire's hook
    const W = CENTER.wippen, js = TRACE.jackSpring;
    reshape(n.jackSpring, coilGeo(rel([js[0]], W)[0], rel([turn(js[1], CENTER.jack, p.psi)], W)[0], 2, 0.35, 6, 0));
    reshape(n.buttSpring, wireGeo(leg(TRACE.buttSpring, q => turn(q, CENTER.butt, -p.g)), 0.5, n.buttSpringZ));
    reshape(n.damperSpring, wireGeo(leg(TRACE.damperSpring, q => turn(q, CENTER.damper, p.dl)), 0.45, WIDTH.damperFlange / 2 + 0.8));
    const [f, k] = strapEnds(a, p.phi, p.g), s = TRACE.strap;
    let along = 0;
    const strap = p.slack <= 0.05 ? [f, lerp(f, k, 0.5), k] : s.map((q, i) => {
      if (i) along += Math.hypot(q[0] - s[i - 1][0], q[1] - s[i - 1][1]);
      return lerp(turn(q, CENTER.butt, -p.g), wipPt(p.phi, turn(q, BRIDLE_BASE, bridleAngle(a))), along / STRAP_LEN);
    });
    reshape(n.strap, tapeGeo(strap, STRAP_T, WIDTH.strap, 0));
    n.strapEnd.position.set(k[0], k[1], BASS * BRIDLE_Z + 0.9);
  }

  // ---------- part labels (on the middle note) ----------
  const LABELS = [
    [N0.hammer, [-15, 150, 6], 'Hammer'], [N0.hammer, shankAt(70).concat(4), 'Shank'], [N0.hammer, [-14, 20, 6], 'Butt'],
    [N0.hammer, [-50, 8, 6], 'Catcher'], [N0.hammer, [-20, 5, 6], 'Butt cushion'], [N0.bflange, [-2, -14, 6], 'Butt flange'],
    [N0.bflange, [4, 16, 2], 'Butt spring'], [N0.wippen, [-30, 0, 6], 'Wippen'], [N0.jack, [8, 40, 4], 'Jack'],
    [N0.wippen, [-41, -21, 6], 'Cushion'], [N0.root, [CAPSTAN.x, -120, 6], 'Capstan'], [N0.letoff, [-46.5, -52, 5], 'Let-off button'],
    [fixed, [-47, -38, 41], 'Let-off rail'], [fixed, [-33, -18, 41], 'Jack stop rail'], [N0.wippen, [-78, 76, 6], 'Backcheck'],
    [N0.root, [-60, -30, 4], 'Bridle strap'], [N0.wippen, [-68, 30, 4], 'Bridle wire'], [N0.wippen, [8, 18, 2], 'Spoon'],
    [N0.damper, [2, 20, 5], 'Damper lever'], [N0.damper, [24, 90, 7], 'Damper'], [N0.dflange, [12, -10, 5], 'Damper flange'],
    [N0.damper, [3, 60, 2], 'Damper wire'], [fixed, [-2, -40, 41], 'Main rail'], [hammerRail, [-45, 70, 41], 'Hammer rail'],
    [N0.root, [stringX(150), 160, 0], 'Strings'], [N0.wflange, [2, -72, 3], 'Wippen flange'], [N0.wippen, [-46, 10, 2], 'Jack spring'],
    [N0.root, [-300, -150, 11], 'Key (stand-in)'],
  ].map(([obj, p, text]) => {
    const e = document.createElement('div'); e.className = 'plabel'; e.textContent = text; e.hidden = true; overlay.appendChild(e);
    return { obj, p: new THREE.Vector3(...p), e };
  });
  // the neighbors, so the views from the keys show which side is the bass
  for (const [slot, text] of [[1, 'Bass side'], [2, 'Treble side']]) {
    const e = document.createElement('div'); e.className = 'plabel'; e.textContent = text; e.hidden = true; overlay.appendChild(e);
    LABELS.push({ obj: notes[slot].hammer, p: new THREE.Vector3(-15, 165, 0), e });
  }
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
      const shown = (o => { for (; o; o = o.parent) if (!o.visible) return false; return true; })(l.obj);
      l.e.style.display = shown && lv.z < 1 && Math.abs(lv.x) < 1.05 && Math.abs(lv.y) < 1.05 ? '' : 'none';
    }
  }

  // ---------- views (world = sim frame; written in the action frame, so a view stays on its parts if H moves) ----------
  const at = (x, y, z = 0) => [H[0] + x, H[1] + y, z];
  // nb: the see-through neighbor notes show (the views across the keyboard); in the side views they would sit in front
  const VIEWS = {
    action: { t: at(-12, 0), p: at(-12, 6, 700) },                   // from the treble end: strings on the right
    whole: { t: at(-200, -60), p: at(-200, -40, 1250) },             // the action on its (stand-in) key
    angle: { t: at(-15, 0), p: at(-420, 170, 470), nb: true },       // from the player's side, above, toward the treble
    front: { t: at(-20, 20), p: at(-760, 40, 0), nb: true },         // from the keys: the bass on the left
    back: { t: at(10, 20), p: at(700, 60, -160), nb: true },         // from behind the strings
    top: { t: at(-10, 0), p: at(-10, 700, 0.1), nb: true },
    head: { t: at(-18, 136), p: at(-18, 140, 260) },
    butt: { t: at(-20, 0), p: at(-20, 4, 230) },                     // jack top under the cushion, catcher, flange
    buttangle: { t: at(-20, 0), p: at(-170, 70, 170) },
    // from the keys through a slice of the action (the rails in front cut away): the jack under the butt cushion
    jackfront: { t: at(-22, -2), p: at(-260, 10, 0), clip: [-28, 4] },
    check: { t: at(-58, -5), p: at(-58, 0, 260) },                   // catcher, backcheck, strap, bridle wire
    checkangle: { t: at(-58, -5), p: at(-230, 60, 170) },
    wippen: { t: at(-25, -78), p: at(-25, -72, 330) },
    wippenangle: { t: at(-25, -78), p: at(-220, -10, 230) },
    damper: { t: at(30, 20), p: at(30, 25, 470) },
    damperangle: { t: at(30, 20), p: at(250, 90, 260) },
  };
  let viewAnim = null;
  function setNeighbors(on) { for (const n of notes.slice(1)) n.root.visible = on; }
  // a clipped view keeps only the slice of the action between two x (action frame); cut parts show their insides
  let clipNow = null;
  const inClip = p => !clipNow || (p.x >= H[0] + clipNow[0] && p.x <= H[0] + clipNow[1]);
  function setClip(c) {
    clipNow = c || null;
    const P = (x, k) => new THREE.Plane(new THREE.Vector3(x, 0, 0), k);
    renderer.clippingPlanes = c ? [P(1, -(H[0] + c[0])), P(-1, H[0] + c[1])] : [];
    const side = c ? THREE.DoubleSide : THREE.FrontSide;
    act.traverse(o => { if (o.isMesh && o.material.side !== side) { o.material.side = side; o.material.needsUpdate = true; } });
  }
  function setView(name, instant = false) {
    const v = VIEWS[name] || VIEWS.action;
    setNeighbors(!!v.nb); setClip(v.clip);
    const toT = new THREE.Vector3(...v.t), toP = new THREE.Vector3(...v.p);
    if (instant) { controls.target.copy(toT); camera.position.copy(toP); viewAnim = null; return; }
    viewAnim = { t0: performance.now(), fromT: controls.target.clone(), fromP: camera.position.clone(), toT, toP };
  }
  setView('action', true);

  // ---------- picking: which part is under the pointer ----------
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick(ev) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    // see-through parts and parts a clipped view has cut away are skipped (a ray ignores clipping planes)
    const shown = o => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
    const hit = ray.intersectObjects(pickables, false).find(h => h.object.userData.baseOpacity > 0.25 && shown(h.object) && inClip(h.point));
    return hit ? { part: hit.object.userData.part, name: PART_NAMES[hit.object.userData.part] || hit.object.userData.part } : null;
  }
  // where a point of a group is on the picture, in pixels from its top left
  const sv = new THREE.Vector3();
  function screenOf(obj, local = [0, 0, 0]) {
    scene.updateMatrixWorld();
    sv.set(...local); obj.localToWorld(sv); sv.project(camera);
    return { x: (sv.x * 0.5 + 0.5) * canvas.clientWidth, y: (-sv.y * 0.5 + 0.5) * canvas.clientHeight };
  }

  let bg = null;
  function setBackground(hex) { if (hex !== bg) { scene.background = new THREE.Color(hex); bg = hex; } }
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.floor(w * renderer.getPixelRatio()) || canvas.height !== Math.floor(h * renderer.getPixelRatio())) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    }
  }
  function render() {
    resize();
    if (viewAnim) {
      const t = Math.min(1, (performance.now() - viewAnim.t0) / 700), e = t * t * (3 - 2 * t);
      controls.target.lerpVectors(viewAnim.fromT, viewAnim.toT, e);
      camera.position.lerpVectors(viewAnim.fromP, viewAnim.toP, e);
      if (t >= 1) viewAnim = null;
    }
    controls.update();
    updateLabels();
    renderer.render(scene, camera);
  }
  // let go of everything this scene made (the app's switch between actions will build and drop scenes)
  function dispose() {
    controls.dispose();
    scene.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
    for (const l of LABELS) l.e.remove();
    renderer.dispose();
  }
  return { render, update, setView, setNeighbors, setLabels, setBackground, pick, screenOf, dispose, controls, camera, scene, notes, VIEWS, partMeshes };
}
