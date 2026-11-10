// Student emulation (protocol 3.1 and Gate 3): the Learn order on 25 de-regulated keys, each knob turned in its own
// step size toward its spec, the way the step tells the student to. It counts the readings a step knocks out of spec
// after an earlier step set them (the grand's veteran found its order knocked out wink in 12 of 25 keys: W5), so each
// step's note can say what to recheck; then one more round, as "Go round again" says, after which every key must pass.
// Run: node --test tests/upright-student.test.mjs (about a minute). The table prints with the results.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ADJ, SPEC, measure, grade, pose, jackGap, stringGap, gRail, dipOf, slowPress, keyHeightOf, NEIGHBOR_H } from '../upright-model.js';
import { STEPS, deregulated, seeded, advise } from '../content-upright.js';

const KEYS = 25;
// quick readings for the knob a step turns (measure() gives them all, slower)
const rd = {
  blow: a => stringGap(pose(a, 0).g),                          // what the gauge reads: the hammer, not the rail
  lostMotion: a => { const p = pose(a, 0); return jackGap(p.phi, 0, p.gRail); },
  keyHeight: a => keyHeightOf(a) - NEIGHBOR_H,
  dip: a => dipOf(a),
  letoff: a => slowPress(a, 0.05).letoffGap ?? -1,             // never trips: as if at the strings (factory()'s rule)
  check: a => { const p = pose(a, dipOf(a), { held: true }); return p.on === 'backcheck' ? stringGap(p.g) : 99; },
  damperTiming: a => slowPress(a, 0.05).damperAt?.share ?? 1,   // never lifts: as late as can be
  softPedal: a => 1 - stringGap(gRail(a, true)) / stringGap(gRail(a)),
};
// turn one knob a step at a time, whichever way brings the reading nearer its target, until a step no longer helps
function tune(a, k, read, target) {
  const d = ADJ.find(x => x.id === k), err = b => Math.abs(read(b) - target);
  let e = err(a);
  for (const s of [d.step, -d.step]) {
    let moved = false;
    for (;;) {
      const v = +(a[k] + s).toFixed(6);
      if (v < d.min - 1e-9 || v > d.max + 1e-9) break;
      const e2 = err({ ...a, [k]: v });
      if (e2 >= e - 1e-9) break;
      a[k] = v; e = e2; moved = true;
    }
    if (moved) return;
  }
}
const okAll = (a, ids) => { const m = measure(a); return ids.every(id => grade(id, m).ok); };
// what each graded step has the student do (its "how")
const STUDENT = {
  // the condition checks: Learn's keys start with every part sound (Find the fault has the damage)
  buttLeather: () => {}, damperSpring: () => {},
  // the jack holding the hammer off its rail first: capstan down until it rests there (the blow step's note)
  blow: a => { const d = ADJ.find(x => x.id === 'capstan'); while (rd.lostMotion(a) <= 0) a.capstan = +(a.capstan - d.step).toFixed(6); tune(a, 'railShim', rd.blow, SPEC.blow.target); },
  lostMotion: a => tune(a, 'capstan', rd.lostMotion, SPEC.lostMotion.target),
  keyHeight: a => tune(a, 'balPunch', rd.keyHeight, 0),
  dip: a => tune(a, 'frontPunch', rd.dip, SPEC.dip.target),
  letoff: a => tune(a, 'letoff', rd.letoff, SPEC.letoff.target),
  // "Move the blow toward 42.5 mm, reset the lost motion, or change the dip a hair, and look again": a few steps of
  // each, nearest first, keeping blow and dip in their own bands
  // checking roughed in first (the jack's clearance depends on it), then the blow and dip
  aftertouch: a => {
    if (okAll(a, ['aftertouch', 'escapement'])) return;
    tune(a, 'backcheck', rd.check, SPEC.check.target);
    if (okAll(a, ['aftertouch', 'escapement'])) return;
    const rs = ADJ.find(d => d.id === 'railShim').step, fp = ADJ.find(d => d.id === 'frontPunch').step, tries = [];
    for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) tries.push([i, j]);
    tries.sort((p, q) => Math.hypot(...p) - Math.hypot(...q));
    for (const [i, j] of tries) {
      const b = { ...a, railShim: +(a.railShim + i * rs).toFixed(6), frontPunch: +(a.frontPunch + j * fp).toFixed(6) };
      tune(b, 'capstan', rd.lostMotion, SPEC.lostMotion.target);
      if (okAll(b, ['aftertouch', 'escapement', 'blow', 'dip', 'lostMotion'])) { Object.assign(a, b); return; }
    }
  },
  check: a => tune(a, 'backcheck', rd.check, SPEC.check.target),
  // bend the wire toward the catcher until the soft pedal no longer lifts the wippen
  bridle: a => { const d = ADJ.find(x => x.id === 'bridle'); while (measure(a).softLifts && a.bridle - d.step >= d.min) a.bridle = +(a.bridle - d.step).toFixed(6); },
  softPedal: a => tune(a, 'softFelt', rd.softPedal, SPEC.softPedal.target),
  damperTiming: a => tune(a, 'spoon', rd.damperTiming, SPEC.damperTiming.target),
};
const GRADED = STEPS.filter(s => !s.info);
const specsOf = s => [s.spec, ...(s.also ?? [])];

test('every graded Learn step has a student action, and its specs exist', () => {
  for (const s of GRADED) {
    assert.ok(STUDENT[s.spec], `no student action for ${s.spec}`);
    for (const id of specsOf(s)) assert.ok(SPEC[id], `no SPEC.${id}`);
  }
});

test('the Learn order on 25 de-regulated keys: what each step knocks out, and every key in spec after going round again', () => {
  const rng = seeded(20261108), knocked = new Map(), startOut = new Map(), stillOut = [];
  for (let n = 0; n < KEYS; n++) {
    const a = deregulated(rng), m0 = measure(a);
    for (const s of GRADED) for (const id of specsOf(s)) if (!grade(id, m0).ok) startOut.set(id, (startOut.get(id) ?? 0) + 1);
    for (let round = 0; round < 2; round++) {
      const ok = new Map();   // specs set so far this round: in spec after the last step?
      for (const s of GRADED) {
        STUDENT[s.spec](a);
        const m = measure(a);
        for (const [id, was] of ok) {
          const now = grade(id, m).ok;
          if (round === 0 && was && !now) { const key = `${s.spec} -> ${id}`; knocked.set(key, (knocked.get(key) ?? 0) + 1); }
          ok.set(id, now);
        }
        for (const id of specsOf(s)) if (!ok.has(id)) ok.set(id, grade(id, m).ok);
      }
    }
    const m = measure(a), bad = GRADED.flatMap(specsOf).filter(id => !grade(id, m).ok);
    if (bad.length) stillOut.push(`key ${n}: ${bad.map(id => `${id} ${grade(id, m).note}`).join(', ')}`);
  }
  console.log(`out of spec at the start (of ${KEYS} keys): ${[...startOut].map(([k, v]) => `${k} ${v}`).join(', ')}`);
  console.log(`knocked out in the first round (step -> spec set earlier: keys):\n  ${[...knocked].sort((p, q) => q[1] - p[1]).map(([k, v]) => `${k}: ${v}`).join('\n  ') || 'none'}`);
  assert.deepEqual(stillOut, [], 'every key in spec after going round again');
});

// ---------- the student who stops at green (critique 2026-11-09, U3) ----------
// The student above drives every knob to its exact target. A real one stops when the row turns green. This one does:
// each knob a step at a time toward its target, stopping as soon as its own reading grades in at the level. At the
// aftertouch step, where no knob is its own, it does what the line under the readings (and the final check) tells it:
// content-upright.js advise(). It must finish within the two rounds "Go round again" asks for, at every level.
const LEVELS = { Apprentice: 1.5, Journeyman: 1, 'the top level': 0.75 };
function green(K) {
  const okNow = (a, id) => grade(id, measure(a), K).ok;
  const toGreen = (a, k, id, target = SPEC[id].target) => {
    const d = ADJ.find(x => x.id === k), err = b => Math.abs(rd[id](b) - target);
    if (okNow(a, id)) return;
    for (const s of [d.step, -d.step]) {
      let moved = false, e = err(a);
      for (;;) {
        const v = +(a[k] + s).toFixed(6);
        if (v < d.min - 1e-9 || v > d.max + 1e-9) break;
        const e2 = err({ ...a, [k]: v });
        if (e2 >= e - 1e-9) break;
        a[k] = v; e = e2; moved = true;
        if (okNow(a, id)) return;
      }
      if (moved) return;
    }
  };
  const KNOB = { blow: 'railShim', lostMotion: 'capstan', dip: 'frontPunch', letoff: 'letoff', check: 'backcheck' };
  return {
    ...STUDENT,
    blow: a => { const d = ADJ.find(x => x.id === 'capstan'); while (rd.lostMotion(a) <= 0) a.capstan = +(a.capstan - d.step).toFixed(6); toGreen(a, 'railShim', 'blow'); },
    lostMotion: a => toGreen(a, 'capstan', 'lostMotion'), keyHeight: a => toGreen(a, 'balPunch', 'keyHeight', 0), dip: a => toGreen(a, 'frontPunch', 'dip'),
    letoff: a => toGreen(a, 'letoff', 'letoff'), check: a => toGreen(a, 'backcheck', 'check'),
    softPedal: a => toGreen(a, 'softFelt', 'softPedal'), damperTiming: a => toGreen(a, 'spoon', 'damperTiming'),
    // "bring it to that figure first", or one step of the blow (and the lost motion reset) or of the dip
    aftertouch: a => {
      for (let i = 0; i < 10; i++) {
        const adv = advise(measure(a), K);
        if (!adv) return;
        if (adv.to !== undefined) tune(a, KNOB[adv.spec], rd[adv.spec], adv.to);
        else if (adv.dir) {
          const k = KNOB[adv.spec], d = ADJ.find(x => x.id === k);
          a[k] = +(a[k] - adv.dir * d.step).toFixed(6);   // a shim out lengthens the blow; a punching out deepens the dip
          if (adv.spec === 'blow') tune(a, 'capstan', rd.lostMotion, SPEC.lostMotion.target);
        } else return;
      }
    },
  };
}
for (const [name, K] of Object.entries(LEVELS)) {
  test(`a student who stops at green, at ${name}: at least 28 of 30 de-regulated keys in spec after two rounds`, () => {
    const rng = seeded(20261109), student = green(K), out = [];
    for (let n = 0; n < 30; n++) {
      const a = deregulated(rng);
      for (let round = 0; round < 2; round++) for (const s of GRADED) student[s.spec](a);
      const m = measure(a), bad = GRADED.flatMap(specsOf).filter(id => !grade(id, m, K).ok);
      if (bad.length) out.push(`key ${n}: ${bad.map(id => `${id} ${m[id]?.toFixed?.(2)} (${grade(id, m, K).note})`).join(', ')}`);
    }
    console.log(`  ${name}: ${30 - out.length} of 30 in spec${out.length ? `\n  ${out.join('\n  ')}` : ''}`);
    assert.ok(out.length <= 2, out.join('; '));
  });
}
