// Move parts (the ✋ button with the move buttons): while it is on, dragging a part of the action moves it by hand
// through its own small range, and the rest of the action follows as the model has it: lift the wippen and the jack
// lifts the hammer; trip the jack and the hammer drops onto the repetition lever; lift the hammer off the jack and
// nothing else moves, since nothing hangs from it. Dragging empty space still turns the view, and a click still opens a
// part's card. The Sims hold the part (Sim.grab), so what follows is their physics; this file turns the pointer into
// where the hand holds it.
import * as THREE from 'three';

export const hand = { on: false };

// what a part is held by: a drag on any of these parts moves the whole piece they belong to (scene.js and
// scene-upright.js PART_NAMES; parts not listed don't move: rails, buttons, screws on the rails, the center pins)
export const GRAND_HOLD = {
  key: 'key', keytop: 'key', capstan: 'key', backcheck: 'key',
  wippen: 'wippen', heel: 'wippen', support: 'wippen', jackstop: 'wippen', repspring: 'wippen', jcenter: 'wippen', rcenter: 'wippen',
  jack: 'jack', tender: 'jack', jackscrew: 'jack',
  rep: 'rep', dropfelt: 'rep', windowfelt: 'rep', repscrew: 'rep', repbutton: 'rep',
  hammer: 'hammer', shank: 'hammer', knuckle: 'hammer', knucklecore: 'hammer', tail: 'hammer',
  damper: 'damper', damperfelt: 'damper', damperwire: 'damper', ulflange: 'damper', underlever: 'damper',
};
export const UPRIGHT_HOLD = {
  key: 'key', capstan: 'key',
  wippen: 'wippen', heel: 'wippen', jackflange: 'wippen', jcenter: 'wippen', jackspring: 'wippen', spoon: 'wippen', bcwire: 'wippen',
  backcheck: 'wippen', bridle: 'wippen',
  jack: 'jack',
  butt: 'hammer', cushion: 'hammer', shank: 'hammer', hammer: 'hammer', catcher: 'hammer',
  lever: 'damper', leverfelt: 'damper', dwire: 'damper', dblock: 'damper', damper: 'damper', damperfelt: 'damper',
};
export const HOLD_NAMES = { key: 'the key', wippen: 'the wippen', jack: 'the jack', rep: 'the repetition lever', hammer: 'the hammer', damper: 'the damper' };

const v = new THREE.Vector3();
function screenAt(obj, local, camera, canvas) {
  obj.updateWorldMatrix(true, false);
  v.copy(local); obj.localToWorld(v); v.project(camera);
  return [(v.x * 0.5 + 0.5) * canvas.clientWidth, (-v.y * 0.5 + 0.5) * canvas.clientHeight];
}
// Where in its range [lo, hi] the hand must hold a part for the spot grabbed (obj, local: on the part's mesh) to come
// nearest the pointer at x, y (px from the picture's top left). pose(q) draws the part held at q, so the spot follows
// the drawing exactly whatever the view. A few Newton steps along the spot's path on the screen, the path's direction
// taken from q a little lower (the repetition lever can only be pressed down from where it is, so a step up wouldn't
// move it). A spot whose whole range moves under 2 px on the screen (its path seen end on) stays where it is.
export function dragTo({ obj, local, camera, canvas, pose, q, lo, hi, x, y }) {
  q = Math.max(lo, Math.min(hi, q));
  if (!(hi - lo > 1e-9)) return q;   // nowhere for it to go
  const e = (hi - lo) * 1e-3;
  for (let i = 0; i < 4; i++) {
    pose(q); const [px, py] = screenAt(obj, local, camera, canvas);
    pose(q - e); const [bx, by] = screenAt(obj, local, camera, canvas);
    const tx = (px - bx) / e, ty = (py - by) / e, t2 = tx * tx + ty * ty;
    if (t2 * (hi - lo) ** 2 < 4) break;
    const dq = Math.max(-(hi - lo) / 2, Math.min((hi - lo) / 2, ((x - px) * tx + (y - py) * ty) / t2));
    const next = Math.max(lo, Math.min(hi, q + dq));
    const done = Math.abs(next - q) < e * 0.1;
    q = next;
    if (done) break;
  }
  return q;
}
