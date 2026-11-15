// The tool bag's bench: one tool at a time on a 10 mm grid, in place of the action, turning slowly until it is dragged
// or the view is moved. Each scene (the grand's scene.js, the upright's scene-upright.js) makes one for its own picture.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const AX = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
const axis = s => { const m = /([+-]?)\s*([xyz])/i.exec(s || ''); if (!m) return null; const v = new THREE.Vector3(...AX[m[2].toLowerCase()]); return m[1] === '-' ? v.negate() : v; };

// scene, renderer, camera, controls: the scene's own. lights: { hemi, sun, fill }, which step back while a tool is out.
// anim: the scene's camera move ({ get(), set(v) } of its { t0, fromT, fromP, toT, toP }).
// hooks: hide() and show() the action (hide on every tool shown, show when the bench is put away); save() and restore()
// anything of the scene's own view besides the camera (the grand's clipping), once per visit to the bench.
export function createToolStage({ scene, renderer, camera, controls, lights, anim, hooks = {} }) {
  const stage = new THREE.Group(); stage.visible = false; scene.add(stage);
  const grid = new THREE.GridHelper(300, 30, 0x9a8f80, 0xc9c1b4);   // 10 mm squares
  stage.add(grid);
  const holder = new THREE.Group(); stage.add(holder);
  let savedView = null, spin = true, roomEnv = null, R = 0, home = null, spinT = 0;
  const lit = on => { lights.hemi.intensity = on ? 0.45 : 1.6; lights.sun.intensity = on ? 1.1 : 1.6; lights.fill.intensity = on ? 0.3 : 0.5; };
  // frame the whole tool with room to turn: its longest side fills about 80% of the width, even on a tall phone screen
  function distance() {
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    return Math.max(1.9 * R, 0.62 * R / (tanV * camera.aspect));
  }
  // obj: a THREE.Object3D built for the tool (models of real tools, added one at a time)
  async function show(obj, opts = {}) {
    // polished steel and brass need something to reflect: a soft room, only while a tool is out
    if (!roomEnv) { const pm = new THREE.PMREMGenerator(renderer); roomEnv = pm.fromScene(new RoomEnvironment(renderer), 0.04).texture; pm.dispose(); }
    if (!savedView) { savedView = { p: camera.position.clone(), t: controls.target.clone() }; hooks.save?.(); }
    hooks.hide?.();
    stage.visible = true;
    scene.environment = roomEnv;
    lit(true);
    // each tool is built fresh; free the last one's buffers (materials are shared, so they stay)
    holder.traverse(o => o.geometry?.dispose());
    holder.clear();
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
    holder.add(mesh);
    holder.rotation.y = 0;
    R = Math.max(size.x, size.z, size.y * 1.5, 30);
    const v = { t0: performance.now(), fromT: controls.target.clone(), fromP: camera.position.clone(),
      toT: new THREE.Vector3(0, size.y / 2, 0), toP: new THREE.Vector3(0.2, 0.9, 1.9).setLength(distance()).add(new THREE.Vector3(0, size.y, 0)) };
    anim.set(v);
    home = { t: v.toT.clone(), off: v.toP.clone().sub(v.toT), d: distance() };
    spin = !opts.still;
    return { size: { x: size.x, y: size.y, z: size.z } };
  }
  // the window changed shape (a phone turned): keep the view's direction, step in or out to fit again
  function refit() {
    if (!stage.visible || !R) return;
    const v = anim.get();
    if (v) { v.toP.sub(v.toT).setLength(distance()).add(v.toT); return; }
    camera.position.sub(controls.target).setLength(distance()).add(controls.target);
  }
  function hide() {
    if (!stage.visible) return;
    stage.visible = false; scene.environment = null; lit(false); hooks.show?.();
    if (savedView) { anim.set({ t0: performance.now(), fromT: controls.target.clone(), fromP: camera.position.clone(), toT: savedView.t, toP: savedView.p }); savedView = null; hooks.restore?.(); }
  }
  // Reset view with a tool out: back to where the tool was first framed, at the distance that fits it now
  function goHome() {
    anim.set({ t0: performance.now(), fromT: controls.target.clone(), fromP: camera.position.clone(),
      toT: home.t.clone(), toP: home.off.clone().multiplyScalar(distance() / home.d).add(home.t) });
  }
  controls.addEventListener('start', () => { spin = false; });
  function turn() {   // by the clock, so it turns at the same speed on any screen refresh rate
    const now = performance.now(), dt = Math.min(0.1, (now - spinT) / 1000); spinT = now;
    if (stage.visible && spin) holder.rotation.y += dt * 0.35;
  }
  return { show, hide, refit, goHome, turn, stop: () => { spin = false; }, get visible() { return stage.visible; } };
}
