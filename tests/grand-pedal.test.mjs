// The damper pedal's tray works on the line of underlevers (WCI-07): an underlever's place on its wire sets where the
// key meets it and where the tray does, so a damper timed early at the key also leaves the strings early on the pedal,
// and a wink of the pedal shows it. Steinway's manual: 1/8 in lost motion between the tray and the line of underlevers.
// node --test tests/grand-pedal.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { G, IN, FACTORY, SPEC, Sim, measure, grade, TRAY_FREE, underleverOff, trayLift, pedalHeadLift, pedalFor } from '../model.js';

const at = (f = {}) => { const a = { ...FACTORY }; for (const [k, v] of Object.entries(f)) a[k] += v; return a; };
const near = (v, to, tol, what) => assert.ok(Math.abs(v - to) <= tol, `${what}: ${v.toFixed(3)}, expected ${to} ± ${tol}`);
// the head's height with the pedal eased `to` of the way down and held
const winked = (a, to) => { const s = new Sim(a); s.setPedal(true, { to, over: 0.5 }); s.run(0.8); return s.yd; };

test('the regulated damper sits on the line: the pedal lifts it as far as before, after 1/8 in of free play at the underlever', () => {
  near(TRAY_FREE, IN / 8 * G.dmpRatio, 1e-9, 'free play at the head');
  assert.equal(underleverOff(FACTORY), 0);
  near(pedalHeadLift(FACTORY, 1), FACTORY.pedalLift, 1e-9, 'pedal down');
  const s = new Sim(FACTORY); s.setPedal(true); s.run(0.3);
  near(s.yd, FACTORY.pedalLift, 1e-6, 'the Sim, pedal down');
  // the first of the pedal's travel moves no damper
  const p0 = pedalFor(FACTORY, 0);
  assert.ok(p0 > 0.3 && p0 < 0.45, `the tray meets the line ${Math.round(p0 * 100)}% of the way down`);
  assert.equal(winked(FACTORY, p0 * 0.9), 0);
  near(winked(FACTORY, pedalFor(FACTORY, 0.5)), 0.5, 1e-6, 'a wink');
});

test('an underlever set low on its wire is met early by the key and by the tray; one set high, late', () => {
  const early = at({ damperGap: -1.5 }), late = at({ damperGap: +1.5 }), off = 1.5 * G.dmpRatio;
  near(underleverOff(early), off, 1e-9, 'early'); near(underleverOff(late), -off, 1e-9, 'late');
  assert.ok(measure(early).damperTiming < measure(FACTORY).damperTiming && measure(late).damperTiming > measure(FACTORY).damperTiming);
  // just short of the line: only the early one is up; a wink past it: the line is up, the late one still seated
  const before = pedalFor(FACTORY, -0.2), wink = pedalFor(FACTORY, 0.5);
  assert.ok(winked(early, before) > 0.5 && winked(FACTORY, before) === 0 && winked(late, before) === 0);
  near(winked(early, wink), 0.5 + off, 1e-6, 'early at the wink'); assert.equal(winked(late, wink), 0);
  // pedal down, each is lifted that much more or less: as much as the key's own lift of it moved
  near(pedalHeadLift(early, 1) - FACTORY.pedalLift, off, 1e-9, 'early, pedal down');
  for (const a of [early, late]) near(measure(a).pedalLift, measure(FACTORY).pedalLift, 1e-6, 'pedal lift against the key\'s lift');
});

test('graded: together on the pedal within the sim\'s band, and the reading says which way it is out', () => {
  assert.ok(grade('pedalStart', measure(FACTORY)).ok);
  for (const k of [1.5, 1, 0.75]) {
    const edge = SPEC.pedalStart.tol * k / G.dmpRatio;
    assert.ok(grade('pedalStart', measure(at({ damperGap: edge - 0.05 })), k).ok && grade('pedalStart', measure(at({ damperGap: -edge + 0.05 })), k).ok);
    assert.match(grade('pedalStart', measure(at({ damperGap: -edge - 0.05 })), k).note, /before the others/);
    assert.match(grade('pedalStart', measure(at({ damperGap: edge + 0.05 })), k).note, /after the others/);
  }
  // the one knob sets both readings: with the key regulated, a gap that times the damper in the middle of Steinway's band
  // also starts it with the line
  const m = measure(at({ damperGap: -0.3 }));
  assert.ok(grade('damperTiming', m).ok && grade('pedalStart', m).ok);
  assert.ok(SPEC.pedalStart.noExam && SPEC.pedalStart.damper);
});

test('set as low as it goes, the tray at rest holds the damper off the strings, and the reading says so', () => {
  const a = { ...FACTORY, damperGap: 0 }, s = new Sim(a);
  assert.ok(s.yd > 0.1 && s.yd < 0.5, `held ${s.yd.toFixed(2)} mm up`);
  near(measure(a).trayHolds, s.yd, 1e-9, 'measured');
  assert.match(grade('pedalStart', measure(a)).note, /holds this damper off the strings/);
  assert.equal(measure(FACTORY).trayHolds, 0);
  assert.equal(trayLift(FACTORY, 0), -TRAY_FREE);
});

test('the pedal let go from a wink: the damper lands, and the key at rest is at rest again', () => {
  const s = new Sim(at({ damperGap: -1 }));
  s.setPedal(true, { to: pedalFor(s.a, 0.5), over: 0.5 }); s.run(0.8);
  assert.ok(s.yd > 1); s.events.length = 0;
  s.setPedal(false); s.run(0.5);
  assert.ok(s.events.some(e => e.type === 'seated')); s.events.length = 0;
  assert.equal(s.yd, 0); assert.ok(s.atRest);
});
