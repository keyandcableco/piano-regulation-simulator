// Gate 2 at rest, in the model: the traced upright geometry holds together. Every part touches what holds it, every
// contact the drawing shows is a contact in the numbers, and the measured centres are where S15 measured them.
// node --test   (from the repo root; Node 22 or 20.19+: upright-model.js is ES module syntax and the repo has no package.json)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { H, KEY, CENTER, TRACE, SHANK, shankAt, CATCHER_SHANK, CAPSTAN, EYE, STRAP_T, BUTT_FORK, WIPPEN_FORK, SCREWS, MAIN_RAIL,
  HAMMER_RAIL, LETOFF_RAIL, STRING, stringX, WIDTH } from '../upright-model.js';

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
// do segments ab and cd cross (touching ends don't count)
const cross = (a, b, c, d) => {
  const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
};
const edges = poly => poly.map((a, i) => [a, poly[(i + 1) % poly.length]]);
// distance between two polygons' outlines, or 0 if they overlap (a vertex inside, or edges crossing)
const polyDist = (P, Q) => (P.some(p => inside(p, Q)) || Q.some(q => inside(q, P))
  || edges(P).some(([a, b]) => edges(Q).some(([c, d]) => cross(a, b, c, d))) ? 0
  : Math.min(...P.map(p => edgeDist(p, Q)), ...Q.map(q => edgeDist(q, P))));
// no two edges of a closed polygon cross
const simple = poly => edges(poly).every(([a, b], i) => edges(poly).every(([c, d], j) => Math.abs(i - j) < 2
  || (i === 0 && j === poly.length - 1) || (j === 0 && i === poly.length - 1) || !cross(a, b, c, d)));
const ys = poly => poly.map(p => p[1]), xs = poly => poly.map(p => p[0]);
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a.toFixed(2)} vs ${b.toFixed(2)} (tolerance ${tol})`);

test('centre pins are where S15 measured them (findings.md, grey rest frame)', () => {
  near(CENTER.wippen[0], 2.08, 0.1, 'wippen x'); near(CENTER.wippen[1], -85.08, 0.1, 'wippen y');
  near(CENTER.jack[0], -33.58, 0.1, 'jack x'); near(CENTER.jack[1], -70.22, 0.1, 'jack y');
  near(CENTER.damper[0], 23.36, 0.1, 'damper x'); near(CENTER.damper[1], -3.47, 0.1, 'damper y');
  near(SHANK.lean * 180 / Math.PI, 22.3, 0.01, 'shank lean');
});

const PATHS = new Set(['buttSpring', 'strap', 'spoon', 'backcheckWire', 'bridleWire', 'damperSpring', 'damperWire', 'jackSpring',
  'letoffScrew']);
test('outlines are well formed: finite, and every closed one simple (no edges crossing)', () => {
  for (const [k, v] of Object.entries(TRACE)) {
    if (k === 'damperBlock' || k === 'letoffEye') continue;
    for (const p of k === 'damperFelts' ? v : [v]) {
      assert.ok(p.length >= (PATHS.has(k) ? 2 : 3), `${k} has points`);
      assert.ok(p.every(q => q.length === 2 && q.every(Number.isFinite)), `${k} is finite`);
      if (!PATHS.has(k)) assert.ok(simple(p), `${k} is a simple polygon`);
    }
  }
  for (const p of [MAIN_RAIL, HAMMER_RAIL.felt, HAMMER_RAIL.wood, LETOFF_RAIL]) assert.ok(simple(p), 'rail is a simple polygon');
  // the crossing test itself: a bow-tie fails, a square passes, and a bar crossing a block counts as touching
  assert.ok(!simple([[0, 0], [2, 2], [2, 0], [0, 2]]) && simple([[0, 0], [2, 0], [2, 2], [0, 2]]), 'simple() works');
  assert.equal(polyDist([[-1, 0.4], [3, 0.4], [3, 0.6], [-1, 0.6]], [[0, 0], [2, 0], [2, 1], [0, 1]]), 0, 'polyDist sees crossings');
});

test('each centre pin is in the parts it joins', () => {
  assert.ok(inside(CENTER.butt, TRACE.butt), 'butt pin in the butt');
  assert.ok(Math.hypot(CENTER.butt[0], CENTER.butt[1]) < BUTT_FORK.cheekR, 'butt pin within the flange cheeks');
  assert.ok(CENTER.butt[1] < BUTT_FORK.y && CENTER.butt[1] > BUTT_FORK.cheekBottom, 'butt pin in its tongue, between the cheeks');
  assert.ok(inside(CENTER.wippen, TRACE.wippen), 'wippen pin in the wippen');
  assert.ok(inside(CENTER.wippen, TRACE.wippenFlange), 'wippen pin in the flange tongue');
  assert.ok(edgeDist(CENTER.wippen, TRACE.wippenFlange) > 2, 'with wood round it');
  const fx = xs(TRACE.wippenFlange);
  assert.ok(WIPPEN_FORK.x[0] < Math.min(...fx) && WIPPEN_FORK.x[1] > Math.max(...fx), 'the wippen is forked all along the tongue');
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

test('the spoon reaches the damper lever felt; the damper felts touch the strings', () => {
  // the factory bends the spoon to set damper timing (upright-kinematics.test.mjs); as traced the tip is just short of
  // the felt face, level with its lower part
  const tip = TRACE.spoon.at(-1), face = Math.min(...xs(TRACE.leverFelt));
  assert.ok(face - tip[0] > 1 - 0.01 && face - tip[0] < 3, `spoon tip (wire r 1) ${(face - tip[0] - 1).toFixed(2)} mm short of the felt face`);
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
  const eye = TRACE.letoffEye, touch = EYE.R + EYE.r + STRAP_T / 2;
  const closest = Math.min(...s.slice(1).map((q, i) => segDist(eye, s[i], q)));
  near(closest, touch, 0.3, 'strap lying on the eye');
  assert.ok(s.some(p => Math.abs(p[0] - eye[0]) < 1 && p[1] > eye[1]), 'over the top of it');
  const len = s.slice(1).reduce((t, q, i) => t + Math.hypot(q[0] - s[i][0], q[1] - s[i][1]), 0);
  near(len, 58.5, 1, 'strap length (S15: taut 58-59 mm)');
});

test('flanges are on the main rail; the let-off screw goes through its rail', () => {
  const [r0, r1] = [Math.min(...xs(MAIN_RAIL)), Math.max(...xs(MAIN_RAIL))], [rb, rt] = [Math.min(...ys(MAIN_RAIL)), Math.max(...ys(MAIN_RAIL))];
  near(Math.min(...ys(TRACE.buttFlange)), rt, 0.01, 'butt flange foot on the rail top');
  assert.ok(Math.min(...xs(TRACE.buttFlange)) >= r0 && Math.max(...xs(TRACE.buttFlange)) <= r1, 'butt flange foot within the rail');
  near(Math.max(...ys(TRACE.wippenFlange)), rb, 0.01, 'wippen flange tongue from the rail\'s underside');
  const pl = TRACE.wippenFlangePlate;
  near(Math.min(...xs(pl)), r1, 0.01, 'wippen flange plate on the rail\'s back face');
  near(Math.min(...xs(pl)), Math.max(...xs(TRACE.wippenFlange)), 0.01, 'plate against the tongue\'s back');
  assert.ok(rb - Math.min(...ys(pl)) >= 5, 'plate overlaps the tongue at least 5 mm (joined, not at a corner)');
  assert.ok(Math.max(...ys(pl)) > rb + 5, 'plate up the rail\'s back face');
  const sc = SCREWS.wippenFlange;
  assert.ok(inside([sc.p[0] - 1, sc.p[1]], pl) && sc.p[0] - sc.len < r1, 'its screw through the plate into the rail');
  const bs = SCREWS.buttFlange;
  assert.ok(inside([bs.p[0], bs.p[1] - 1], TRACE.buttFlange) && bs.p[1] - bs.len < rt, 'butt flange screw through the foot into the rail');
  const ds = SCREWS.damperFlange;
  assert.ok(inside([ds.p[0] - 1, ds.p[1]], TRACE.damperFlange) && ds.p[0] - ds.len < r1 && ds.p[1] < rt, 'damper flange screw into the rail');
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
