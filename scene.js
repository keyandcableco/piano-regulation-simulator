// Three.js rendering of the grand action. Units are millimetres, same frame
// as model.js: x toward the strings, y up, z across the keyboard (+z toward the bass).
// Three notes are built; normal modes show the middle one with ghost neighbors,
// exam mode shows all three like the 3-note exam model.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
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
  drop: 'Drop screw', letoff: 'Let-off button', regrail: 'Regulating rail', restrail: 'Hammer rest rail',
  string: 'Strings', backcheck: 'Backcheck', damper: 'Damper head', damperwire: 'Damper wire', underlever: 'Damper underlever',
  damperstop: 'Damper stop rail', lifttray: 'Damper lift tray (pedal)', guiderail: 'Damper guide rail', ulrail: 'Underlever flange rail', tail: 'Hammer tail (check surface)', keybed: 'Keybed', straightedge: 'Straightedge',
};

// note slots: 0 is the middle (the one normal modes use), 1 toward the bass, 2 toward the treble
export const NOTE_Z = [0, 23.5, -23.5];
const UL_PIVOT = [604, 66];        // underlever centre pin
const UL_FELT = [-135, -6];        // lift felt, over the key's end
const UL_WIRE = [-128, 5];         // where the damper wire leaves the underlever
const WIRE_Z = 8;                  // the wire rises beside the unison; the head reaches over it

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

  scene.add(new THREE.HemisphereLight(0xffffff, 0x554433, 1.6));
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
  ext(rect(404, 58, 432, 84), 80, 0, COLORS.rail, 'wippenrail', fixed);
  ext(rect(262, 124, 296, 148), 80, 0, COLORS.rail, 'flangerail', fixed);
  ext(rect(268, 95, 292, 106), 80, 0, COLORS.rail, 'regrail', fixed);
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
  ext(rect(452, 148, 500, 156), 80, 0, COLORS.rail, 'guiderail', fixed);
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
    // punchings, pins, let-off button, drop screw, flange, strings
    n.frontPunch = cyl(6, 1, 'y', [G.frontRailX, 0, 0], COLORS.felt, 'frontpunch', root);
    cyl(1.2, 22, 'y', [G.frontRailX, G.frontRailY + 11, 0], COLORS.steel, 'frontrail', root, { metal: true, noPick: true });
    n.balPunch = cyl(6, 1, 'y', [G.balX, 0, 0], COLORS.felt, 'balance', root);
    cyl(1.5, 30, 'y', [G.balX, G.balRailY + 15, 0], COLORS.steel, 'balrail', root, { metal: true, noPick: true });
    ext(rect(392, 66, 406, 80), 10, 0, COLORS.wood, 'wippenrail', root);
    ext(rect(296, 112, 312, 132), 3.5, -5, COLORS.wood, 'flange', root);
    ext(rect(296, 112, 312, 132), 3.5, 5, COLORS.wood, 'flange', root, { opacity: 0.4 });
    n.letoffBtn = new THREE.Group(); root.add(n.letoffBtn);
    cyl(5, 3, 'y', [G.letoffX, 1.5, 0], COLORS.redfelt, 'letoff', n.letoffBtn);
    n.letoffStem = cyl(1.2, 1, 'y', [G.letoffX, 0, 0], COLORS.steel, 'letoff', root, { metal: true });
    n.dropScrew = cyl(1.4, 1, 'y', [G.dropX, 0, 4.5], COLORS.steel, 'drop', root, { metal: true });
    cyl(3, 3, 'y', [G.dropX, 149.5, 4.5], COLORS.steel, 'drop', root, { metal: true });
    for (const z of [-3.5, 0, 3.5]) cyl(0.55, 420, 'x', [440, G.stringY + 0.55, z], COLORS.string, 'string', root, { metal: true });

    // key, with capstan and backcheck
    const key = n.key = new THREE.Group(); root.add(key);
    ext(rect(-235, 0, 235, G.keyThick), 21, 0, COLORS.keywood, 'key', key);
    ext(rect(-235, G.keyThick, -85, G.keyThick + G.keyTopCap), 21.4, 0, COLORS.keytop, 'key', key);
    ext(rect(-236.5, -2, -235, G.keyThick + G.keyTopCap), 21.4, 0, COLORS.keytop, 'key', key);
    for (const x of [-170, -150]) cyl(4.5, 21.2, 'z', [x, 11, 0], 0x8a8f96, 'key', key, { metal: true, noPick: true });
    n.capstan = cyl(5, 1, 'y', [G.capstanLocal, 0, 0], COLORS.brass, 'capstan', key, { metal: true });
    n.capDome = new THREE.Mesh(new THREE.SphereGeometry(5, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(COLORS.brass, { metal: true }));
    key.add(n.capDome); register(n.capDome, 'capstan', {});
    // grand backcheck: an angled wooden head on a stiff wire, felt face leaning toward the
    // hammer tail. The face passes through the point where the model catches the tail.
    const bc = n.bc = new THREE.Group(); bc.position.set(G.backcheckLocal, G.keyThick, 0); key.add(bc);
    {
      const P = [-3.1, 78.2], u = [-0.342, 0.94], d = [0.94, 0.342]; // contact point, face direction, into the head
      const at = (t, s) => [P[0] + u[0] * t + d[0] * s, P[1] + u[1] * t + d[1] * s];
      ext(shapeFrom([at(-15, 0), at(5, 0), at(5, 3), at(-15, 3)]), 13, 0, COLORS.buckskin, 'backcheck', bc);   // felt/leather face
      ext(shapeFrom([at(-15, 3), at(5, 3), at(5, 15), at(-15, 15)]), 12, 0, COLORS.wood, 'backcheck', bc);     // head
      const foot = at(-15, 9);
      tube([[2, 0, 0], [6, 30, 0], [foot[0], foot[1] + 1, 0]], 1.2, COLORS.steel, 'backcheck', bc);
      ext(rect(-3, -1, 9, 3), 10, 0, COLORS.dark, 'backcheck', bc);                                           // wire block on the key
    }

    // wippen with jack and repetition lever
    const wippen = n.wippen = new THREE.Group(); root.add(wippen);
    wippen.position.set(G.W[0], G.W[1], 0);
    ext(shapeFrom([[-96, -2], [6, -2], [8, 2], [6, 9], [-60, 9], [-92, 9], [-96, 5]]), 12, 0, COLORS.wood, 'wippen', wippen);
    n.heelG = new THREE.Group(); n.heelG.position.y = -2; wippen.add(n.heelG);
    ext(rect(-56, -6, -44, 0), 14, 0, COLORS.redfelt, 'heel', n.heelG);
    ext(rect(-34, 9, -26, 16), 12, 0, COLORS.wood, 'rep', wippen);
    cyl(1.3, 12, 'y', [-95, 15, 0], COLORS.steel, 'jackscrew', wippen, { metal: true });
    cyl(3, 2, 'y', [-95, 21, 0], COLORS.redfelt, 'jackscrew', wippen);
    tube([[-28, 12, 0], [-36, 8, 0], [-46, 10, 0], [-56, 14, 0]], 0.6, COLORS.steel, 'repspring', wippen);

    const jack = n.jack = new THREE.Group(); wippen.add(jack);
    jack.position.set(G.jackPivotW[0], G.jackPivotW[1], 0);
    ext(rect(-G.jackHalf, -3, G.jackHalf, G.jackTopY), 5.5, 0, COLORS.wood, 'jack', jack);
    ext(shapeFrom([[-40, 0], [0, 0], [0, 6], [-40, G.toe[1] - 1.5]]), 5.5, 0, COLORS.wood, 'tender', jack);
    ext(rect(-40, G.toe[1] - 1.5, -32, G.toe[1]), 6, 0, COLORS.redfelt, 'tender', jack);

    const rep = n.rep = new THREE.Group(); wippen.add(rep);
    rep.position.set(G.repPivotW[0], G.repPivotW[1], 0);
    const repShape = shapeFrom([[-76, G.tip[1]], [-52, G.horn[1]], [-38, G.horn[1]], [6, 4], [6, -2], [-38, 13], [-76, 11]]);
    // near cheek see-through so the jack shows in its window
    ext(repShape, 3.2, -4.6, COLORS.wood, 'rep', rep);
    ext(repShape, 3.2, 4.6, COLORS.wood, 'rep', rep, { opacity: 0.4 });
    cyl(1.1, 8, 'y', [-14, 4, 6.5], COLORS.steel, 'repscrew', rep, { metal: true });

    // hammer
    const hammer = n.hammer = new THREE.Group(); root.add(hammer);
    hammer.position.set(G.H[0], G.H[1], 0);
    cyl(3.5, 124, 'x', [62, 0, 0], COLORS.wood, 'shank', hammer);
    n.knuckle = cyl(G.knuckleR, 8, 'z', [G.knuckleC[0], G.knuckleC[1], 0], COLORS.buckskin, 'knuckle', hammer);
    cyl(G.coreR, 8.4, 'z', [G.knuckleC[0], G.knuckleC[1], 0], COLORS.core, 'knuckle', hammer);
    // molding: tapers toward the crown; below the shank it continues as the tail,
    // whose back face is what the backcheck catches
    const mold = new THREE.Shape();
    mold.moveTo(118, -8); mold.lineTo(119.5, 14); mold.lineTo(121.5, 24); mold.lineTo(130.5, 24); mold.lineTo(132.5, 8);
    mold.lineTo(134, -4); mold.lineTo(G.tail[0] + 1, -18);
    mold.quadraticCurveTo(G.tail[0] + 0.5, -22.5, 130, -22.5); mold.quadraticCurveTo(123, -22, 120.5, -16); mold.closePath();
    ext(mold, 10, 0, COLORS.wood, 'hammer', hammer);
    ext(shapeFrom([[133.6, -5], [G.tail[0] + 0.95, -18], [G.tail[0] + 1.35, -18], [134, -5]]), 10.4, 0, COLORS.dark, 'tail', hammer); // roughened check surface
    // felt wraps the top of the molding: underfelt band, then the top felt to the crown
    n.feltG = new THREE.Group(); n.feltG.position.y = 4; hammer.add(n.feltG);
    const felt = new THREE.Shape();
    // grand hammer felt: wide where it is glued to the molding, near-straight sides, rounded crown
    felt.moveTo(110.5, 0); felt.lineTo(112, 18);
    felt.bezierCurveTo(112.8, 29, 117, G.crown[1] - 4, G.crown[0], G.crown[1] - 4);
    felt.bezierCurveTo(133, G.crown[1] - 4, 137.2, 29, 138, 18); felt.lineTo(139.5, 0);
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
    ext(rect(462, 4, 490, 22), 16, 1, COLORS.wood, 'damper', head);
    ext(rect(462, 0, 490, 4), 13, 0, COLORS.hammerfelt, 'damper', head);
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
    [fixed, [12, 8, 41], 'Front rail'], [fixed, [456, 12, 41], 'Back rail'], [N0.wippen, [-15, 2, 7], 'Wippen'],
    [N0.jack, [0, 18, 4], 'Jack'], [N0.rep, [-15, 9, 7], 'Repetition lever'], [N0.letoffBtn, [G.letoffX, -1, 6], 'Let-off button'],
    [N0.root, [G.dropX, 128, 6], 'Drop screw'], [N0.hammer, [G.knuckleC[0], G.knuckleC[1] - 4, 5], 'Knuckle'],
    [N0.hammer, [70, 4, 4], 'Shank'], [N0.hammer, [125, 30, 7], 'Hammer'], [N0.hammer, [133, -20, 6], 'Tail'],
    [N0.bc, [8, 70, 7], 'Backcheck'], [restRail, [G.restRailX, -8, 41], 'Rest rail'], [fixed, [275, 140, 41], 'Hammer flange rail'],
    [fixed, [280, 100, 41], 'Regulating rail'], [N0.root, [560, G.stringY + 3, 0], 'Strings'], [fixed, [410, 70, 41], 'Wippen rail'],
    [N0.dHead, [476, 22, 9], 'Damper'], [N0.ul, [-60, 5, 6], 'Underlever'], [fixed, [474, 156, 41], 'Damper guide rail'],
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
    action: { t: [245, 100, 0], p: [245, 125, 1000] },
    angle: { t: [300, 100, 0], p: [-80, 260, 520] },
    escapement: { t: [312, 100, 0], p: [312, 106, 250] },
    keyfront: { t: [10, 50, 0], p: [-190, 120, 110] },
    hammer: { t: [400, 165, 0], p: [400, 168, 330] },
    backcheck: { t: [425, 150, 0], p: [435, 152, 380] },
    rails: { t: [320, 110, 0], p: [320, 115, 260] },
    // looking down the keys from the player's side at the hammer tops: sight the hammer line
    hammerline: { t: [430, 162, 0], p: [250, 245, 0] },
    dampers: { t: [520, 130, 0], p: [520, 140, 420] },
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
    // adjustable parts
    const cap = Math.max(0.5, a.capstan);
    n.capstan.scale.y = cap; n.capstan.position.y = G.keyThick + cap / 2; n.capDome.position.set(G.capstanLocal, G.keyThick + cap, 0);
    n.balPunch.scale.y = Math.max(0.3, a.balPunch); n.balPunch.position.y = G.balRailY + Math.max(0.3, a.balPunch) / 2 - Math.max(0, 0.3 - a.balPunch);
    n.frontPunch.scale.y = Math.max(0.3, a.frontPunch); n.frontPunch.position.y = G.frontRailY + Math.max(0.3, a.frontPunch) / 2;
    n.letoffBtn.position.y = a.letoff;
    n.letoffStem.scale.y = 106 - (a.letoff + 3); n.letoffStem.position.y = (106 + a.letoff + 3) / 2;
    n.dropScrew.scale.y = 149 - a.drop; n.dropScrew.position.y = (149 + a.drop) / 2;
    if (drawShared) restRail.position.y = a.restRail;
    n.bc.rotation.z = (a.backcheck - (a.wear || 0) * WEAR.backcheck) / 80;
    // packed-down felts
    const w = a.wear || 0;
    n.knuckle.scale.set((G.knuckleR + WEAR.knuckle * w) / G.knuckleR, (G.knuckleR + WEAR.knuckle * w) / G.knuckleR, 1);
    n.feltG.scale.y = (G.crown[1] - 4 + WEAR.crown * w) / (G.crown[1] - 4);
    n.heelG.scale.y = (6 + WEAR.capstan * w) / 6;
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

  setNoteCount(1);
  return { render, update, setView, highlight, pick, setCallout, clearCallouts, setBackground, controls, setLabels,
           setNoteCount, setFocus, straightedge, PART_NAMES, VIEWS };
}
