// Gate 2 at rest, in the model: the traced upright geometry holds together. Every part touches what holds it, every
// contact the drawing shows is a contact in the numbers, and the measured centres are where S15 measured them.
// node --test   (from the repo root; Node 18+, no packages)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { H, KEY, CENTER, TRACE, SHANK, shankAt, CATCHER_SHANK, CAPSTAN, MAIN_RAIL, HAMMER_RAIL, LETOFF_RAIL, STRING, stringX,
  WIDTH } from '../upright-model.js';

const inside = ([x, y], poly) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
};
const segDist = (p, a, b) => {
  const ux = b[0] - a[0], uy = b[1] - a[1], t = Math.max(0, Math.min(1, ((p[0] - a[0]) * ux + (p[1] - a[1]) * uy) / (ux * ux + uy * uy)));
  return Math.hypot(p[0] - a[0] - t * ux, p[1] - a[1] - t * uy);
};
// distance from a point to a polygon's outline (0 on it)
const edgeDist = (p, poly) => Math.min(...poly.map((a, i) => segDist(p, a, poly[(i + 1) % poly.length])));
// distance between two polygons' outlines, or 0 if they overlap
const polyDist = (P, Q) => (P.some(p => inside(p, Q)) || Q.some(q => inside(q, P)) ? 0
  : Math.min(...P.map(p => edgeDist(p, Q)), ...Q.map(q => edgeDist(q, P))));
const ys = poly => poly.map(p => p[1]), xs = poly => poly.map(p => p[0]);
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a.toFixed(2)} vs ${b.toFixed(2)} (tolerance ${tol})`);

test('centre pins are where S15 measured them (findings.md, grey rest frame)', () => {
  near(CENTER.wippen[0], 2.08, 0.1, 'wippen x'); near(CENTER.wippen[1], -85.08, 0.1, 'wippen y');
  near(CENTER.jack[0], -33.58, 0.1, 'jack x'); near(CENTER.jack[1], -70.22, 0.1, 'jack y');
  near(CENTER.damper[0], 23.36, 0.1, 'damper x'); near(CENTER.damper[1], -3.47, 0.1, 'damper y');
  near(SHANK.lean * 180 / Math.PI, 22.3, 0.01, 'shank lean');
});

test('outlines are well formed', () => {
  for (const [k, v] of Object.entries(TRACE)) {
    if (k === 'damperBlock' || k === 'letoffEye') continue;
    const polys = k === 'damperFelts' ? v : [v];
    for (const p of polys) {
      assert.ok(p.length >= 2, `${k} has points`);
      assert.ok(p.every(q => q.length === 2 && q.every(Number.isFinite)), `${k} is finite`);
    }
  }
});

test('each centre pin is in the parts it joins', () => {
  assert.ok(inside(CENTER.butt, TRACE.butt), 'butt pin in the butt');
  assert.ok(Math.hypot(CENTER.butt[0], CENTER.butt[1]) < 5, 'butt pin within the flange cheeks (r 5)');
  assert.ok(inside(CENTER.wippen, TRACE.wippen), 'wippen pin in the wippen');
  assert.ok(Math.hypot(CENTER.wippen[0] - 2.25, 0) < 3.75 && CENTER.wippen[1] <= -60, 'wippen pin in the flange tongue');
  assert.ok(inside(CENTER.jack, TRACE.jack), 'jack pin in the jack');
  assert.ok(inside(CENTER.jack, TRACE.jackFlange), 'jack pin in its flange');
  assert.ok(inside(CENTER.damper, TRACE.damperLever), 'damper pin in the lever');
  assert.ok(inside(CENTER.damper, TRACE.damperFlange), 'damper pin in the flange');
});

test('the hammer: shank into butt and molding, crown short of the strings by the blow', () => {
  assert.ok(inside(shankAt(SHANK.y0), TRACE.butt), 'shank starts inside the butt');
  assert.ok(inside(shankAt(SHANK.y1), TRACE.molding), 'shank ends inside the molding');
  assert.ok(inside(CATCHER_SHANK.from, TRACE.butt), 'catcher shank glued into the butt');
  assert.ok(edgeDist(CATCHER_SHANK.to, TRACE.catcherHead) < CATCHER_SHANK.r, 'catcher shank reaches its head');
  const crown = Math.max(...xs(TRACE.headFelt));
  near(STRING.x - crown, 43.7, 0.5, 'blow (the scale was set by it: not independent)');
  assert.ok(STRING.x > crown && crown > 0, 'the strings are toward +x');
});

test('lost motion: the jack top is just under the butt cushion, not in it', () => {
  const cush = TRACE.buttCushion, bottom = Math.min(...ys(cush));
  const top = TRACE.jack.filter(p => p[1] > 0);
  const gap = bottom - Math.max(...ys(top));
  assert.ok(gap >= 0 && gap <= 1, `jack top ${gap.toFixed(2)} mm below the cushion (0 to 1)`);
  const [x0, x1] = [Math.min(...xs(top)), Math.max(...xs(top))], [c0, c1] = [Math.min(...xs(cush)), Math.max(...xs(cush))];
  assert.ok(Math.min(x1, c1) - Math.max(x0, c0) > 4, 'the jack top is under the cushion, not beside it');
});

test('the wippen sits on the capstan, the capstan on the key', () => {
  near(CAPSTAN.top, Math.min(...ys(TRACE.heelCushion)), 0.01, 'capstan top on the cushion');
  const [c0, c1] = [Math.min(...xs(TRACE.heelCushion)), Math.max(...xs(TRACE.heelCushion))];
  near(CAPSTAN.x, (c0 + c1) / 2, 1, 'capstan centred under the cushion [S1]');
  near(CAPSTAN.keyTop, KEY.bottomY + KEY.thick - H[1], 0.01, 'capstan wire into the key top');
  assert.ok(CAPSTAN.x + H[0] > KEY.balX && CAPSTAN.x + H[0] < KEY.backX, 'capstan behind the balance pin, before the key end');
});

test('everything on the wippen starts on its top face', () => {
  const top = Math.max(...ys(TRACE.wippen)), [w0, w1] = [Math.min(...xs(TRACE.wippen)), Math.max(...xs(TRACE.wippen))];
  for (const k of ['backcheckWire', 'bridleWire', 'spoon', 'jackSpring']) {
    const [x, y] = TRACE[k][0];
    near(y, top, 0.01, `${k} base on the wippen`);
    assert.ok(x > w0 && x < w1, `${k} base over the wippen`);
  }
  near(Math.min(...ys(TRACE.jackFlange)), top, 0.01, 'jack flange on the wippen');
  assert.ok(edgeDist(TRACE.backcheckWire.at(-1), TRACE.backcheck) < 1.5, 'backcheck wire into the backcheck head');
  near(TRACE.jackSpring[1][1], Math.min(...ys(TRACE.jack.filter(p => p[0] < -38))), 0.01, 'jack spring under the toe');
});

test('the spoon touches the damper lever felt; the damper felts touch the strings', () => {
  const tip = TRACE.spoon.at(-1), face = Math.min(...xs(TRACE.leverFelt));
  near(face - tip[0], 1, 0.3, 'spoon tip (wire r 1) on the felt face');
  assert.ok(tip[1] >= Math.min(...ys(TRACE.leverFelt)) && tip[1] <= Math.max(...ys(TRACE.leverFelt)), 'on the felt, not past it');
  for (const f of TRACE.damperFelts) {
    const y = (Math.min(...ys(f)) + Math.max(...ys(f))) / 2;
    near(stringX(y), Math.max(...xs(f)), 0.6, 'damper felt on the string');
  }
  const w = TRACE.damperWire, b = TRACE.damperBlock;
  assert.ok(inside(w[0], TRACE.damperLever) || edgeDist(w[0], TRACE.damperLever) < 0.1, 'wire into the lever top');
  assert.ok(Math.abs(w.at(-1)[1] - b.y) <= b.r && w.at(-1)[0] >= b.x0 && w.at(-1)[0] <= b.x1, 'wire into the block');
  near(b.x1, Math.min(...xs(TRACE.damperHead)), 0.6, 'block against the head');
});

test('the strap runs from the catcher over the let-off eye to the bridle wire hook', () => {
  const s = TRACE.strap;
  assert.ok(edgeDist(s[0], TRACE.catcherHead) < 1, 'fixed on the catcher');
  near(Math.hypot(s.at(-1)[0] - TRACE.bridleWire.at(-1)[0], s.at(-1)[1] - TRACE.bridleWire.at(-1)[1]), 0, 0.6, 'end on the hook');
  const eye = TRACE.letoffEye, over = s.filter(p => Math.abs(p[0] - eye[0]) < 1.5);
  assert.ok(over.length && over.every(p => p[1] > eye[1] + 2.4 && p[1] < eye[1] + 4), 'draped over the eye');
  const len = s.slice(1).reduce((t, q, i) => t + Math.hypot(q[0] - s[i][0], q[1] - s[i][1]), 0);
  near(len, 58.5, 1, 'strap length (S15: taut 58-59 mm)');
});

test('flanges are on the main rail; the let-off screw goes through its rail', () => {
  const [r0, r1] = [Math.min(...xs(MAIN_RAIL)), Math.max(...xs(MAIN_RAIL))], [rb, rt] = [Math.min(...ys(MAIN_RAIL)), Math.max(...ys(MAIN_RAIL))];
  near(Math.min(...ys(TRACE.buttFlange)), rt, 0.01, 'butt flange foot on the rail top');
  assert.ok(Math.min(...xs(TRACE.buttFlange)) >= r0 && Math.max(...xs(TRACE.buttFlange)) <= r1, 'butt flange foot within the rail');
  near(Math.max(...ys(TRACE.wippenFlange)), rb + 10, 0.01, 'wippen flange foot up the back face 10 mm');
  near(Math.min(...xs(TRACE.wippenFlange.filter(p => p[1] > -60))), r1, 0.01, 'wippen flange foot on the back face');
  near(Math.min(...xs(TRACE.damperFlange.filter(p => p[1] < -6))), r1, 0.01, 'damper flange foot on the back face');
  assert.ok(Math.min(...ys(TRACE.damperFlange)) < rt, 'damper flange foot reaches below the rail top');
  const [sx, sy0] = TRACE.letoffScrew[0], sy1 = TRACE.letoffScrew[1][1];
  const [l0, l1] = [Math.min(...xs(LETOFF_RAIL)), Math.max(...xs(LETOFF_RAIL))], [lb, lt] = [Math.min(...ys(LETOFF_RAIL)), Math.max(...ys(LETOFF_RAIL))];
  assert.ok(sx > l0 && sx < l1 && sy0 < lb && sy1 > lt, 'screw through the let-off rail');
  near(Math.max(...ys(TRACE.letoffButton)), lb, 0.01, 'button against the rail\'s underside');
});

test('the hammer rail felt lies along the shank, touching it', () => {
  const [a, b] = HAMMER_RAIL.felt, axis0 = shankAt(0), axis1 = shankAt(100);
  const lineDist = p => Math.abs((axis1[0] - axis0[0]) * (axis0[1] - p[1]) - (axis0[0] - p[0]) * (axis1[1] - axis0[1])) / Math.hypot(axis1[0] - axis0[0], axis1[1] - axis0[1]);
  near(lineDist(a), SHANK.r, 0.01, 'felt face at the shank surface (low end)');
  near(lineDist(b), SHANK.r, 0.01, 'felt face at the shank surface (high end)');
  assert.ok(a[0] < shankAt(a[1])[0], 'on the player\'s side of the shank');
});

test('room to move: nothing touches that shouldn\'t at rest', () => {
  assert.ok(polyDist(TRACE.jack, TRACE.jackStopFelt) > 2.5, 'jack clear of the jack stop (it escapes about 5 mm at the top)');
  assert.ok(polyDist(TRACE.catcherHead, TRACE.backcheckFelt) > 5, 'catcher clear of the backcheck at rest');
  assert.ok(polyDist(TRACE.jack, TRACE.letoffFelt) > 3, 'toe below the let-off button at rest');
  assert.ok(polyDist(TRACE.jack, TRACE.buttFlange) > 1, 'jack clear of the butt flange');
  assert.ok(WIDTH.pitch > WIDTH.damperHead, 'neighbouring dampers clear');
});
