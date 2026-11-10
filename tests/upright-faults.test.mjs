// What the veteran's critique of 2026-11-09 found the upright could not act out (research/critique/2026-11-09/upright.md),
// each as a behaviour of the Sim or of the readings: blocking (U7), bobbling on a jack that hasn't let off (U6), the
// readings and the Sim agreeing on let-off (U6), the let-off event's distance (U18), the bridle strap and the butt
// spring on a quick release (U9, U12), a weak jack spring losing fast repeats and keeping slow ones (U11), no strike off
// the hammer rail alone (U14), the lost motion band against the rail-pull figures the step quotes (U5), and the exam's
// evenness against one paper punching (U17).
// ~/.nvm/versions/node/v22.23.2/bin/node --test tests/upright-faults.test.mjs   (about two minutes)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FACTORY, ADJ, SPEC, DYN, DAMAGE, Sim, measure, grade, capstanFor, stringGap, gString, gRail, evenTol, band, IN } from '../upright-model.js';
import { STEPS, sixtyFourths } from '../content-upright.js';

const UP = 236, PP = 120, MF = 450, FF = 1300;
const count = (ev, type) => ev.filter(e => e.type === type).length;
// a blow at v mm/s held for `hold` seconds: the events, and the Sim as it stands
function held(a, v, hold = 0.5) { const s = new Sim(a); s.press(s.dip, v); s.run(s.dip / v + hold); return { s, ev: s.events, gap: stringGap(s.g) }; }
// from check after a moderate blow, the key let go at the app's speed: ms until the hammer is back on its rail
function homeFromCheck(a) {
  const s = new Sim(a); s.press(s.dip, MF); s.run(s.dip / MF + 0.4);
  assert.ok(s.checked, 'held in check before the release');
  s.events = []; const t0 = s.t; s.press(0, UP); s.run(0.5);
  return { ms: 1000 * ((s.events.find(e => e.type === 'rail')?.t ?? Infinity) - t0), ev: s.events };
}
const noLetoff = (() => { const a = { ...FACTORY, railShim: FACTORY.railShim - 2.4 }; a.capstan = capstanFor(a); return a; })();   // blow too long for the dip
const blocking = { ...FACTORY, letoff: FACTORY.letoff - 0.6 };

test('the factory plays clean at every dynamic: one strike, no bobble, no blocking, caught by the backcheck', () => {
  for (const v of [60, PP, 250, MF, 800, FF, 2000]) {
    const { ev, s } = held(FACTORY, v);
    assert.equal(count(ev, 'strike'), 1, `${v} mm/s: ${ev.map(e => e.type).join(' ')}`);
    assert.equal(count(ev, 'bobble') + count(ev, 'blocked'), 0, `${v} mm/s: ${ev.map(e => e.type).join(' ')}`);
    assert.ok(s.checked && s.jack === 'off', `${v} mm/s: checked with the jack out`);
  }
});

test('U7 blocking: with no let-off the jack jams the hammer on the strings, the key stops short, and nothing is checked', () => {
  const m = measure(blocking);
  assert.ok(m.blocks && m.letoff === null && m.check === null, 'the readings: blocks, no let-off, no checking');
  assert.match(grade('letoff', m).note, /^blocks/);
  for (const v of [60, PP, MF, FF]) {
    const { s, ev, gap } = held(blocking, v);
    assert.ok(count(ev, 'blocked') >= 1, `${v} mm/s: blocked (${ev.map(e => e.type).join(' ')})`);
    assert.ok(gap < 0.2, `${v} mm/s: the hammer stays on the strings while the key is held (${gap.toFixed(2)} mm)`);
    assert.ok(s.blocked && s.d < s.dip - 1, `${v} mm/s: the key stops ${(s.dip - s.d).toFixed(2)} mm short of the bottom`);
    assert.ok(Math.abs(s.d - m.blockDepth) < 0.15, `${v} mm/s: where the readings say it blocks (${s.d.toFixed(2)} against ${m.blockDepth.toFixed(2)})`);
    assert.equal(count(ev, 'checked') + count(ev, 'letoff'), 0, `${v} mm/s: never lets off, never checked`);
    s.press(0, UP); s.run(0.6);
    assert.ok(Math.abs(stringGap(s.g) - m.blow) < 0.1 && !s.blocked, `${v} mm/s: let go, the hammer comes home`);
  }
});

test('U6: the key bottoming before the jack trips is not called blocking, and the hammer bobbles on the jack near the strings', () => {
  const m = measure(noLetoff);
  assert.ok(m.letoff === null && !m.blocks && m.check === null && m.escapement === 0, 'the readings: no let-off, not blocked, never checked');
  assert.match(grade('letoff', m).note, /^no let-off/);
  for (const v of [PP, MF]) {
    const { s, ev, gap } = held(noLetoff, v);
    assert.ok(count(ev, 'bobble') >= 1, `${v} mm/s: the hammer bounces on the jack (${ev.map(e => e.type).join(' ')})`);
    assert.ok(gap > 1 && gap < 5 && s.jack === 'under' && !s.checked, `${v} mm/s: it hangs on the jack ${gap.toFixed(1)} mm from the strings, not in check`);
    assert.equal(count(ev, 'blocked') + count(ev, 'letoff'), 0, `${v} mm/s: neither blocked nor let off`);
  }
  assert.ok(count(held(noLetoff, MF).ev, 'strike') >= 2, 'a moderate blow strikes again off the jack: it blubbers');
});

test('U6: the readings and the Sim agree on whether, where and how deep in the key a regulation lets off', () => {
  const cases = { factory: FACTORY, 'no let-off': noLetoff, blocking, 'let-off close': { ...FACTORY, letoff: FACTORY.letoff - 0.2 },
    'let-off far': { ...FACTORY, letoff: FACTORY.letoff + 0.3 }, 'shallow dip': { ...FACTORY, frontPunch: FACTORY.frontPunch + 1.5 },
    'thin aftertouch': { ...FACTORY, frontPunch: FACTORY.frontPunch + 1.2 }, 'backcheck far': { ...FACTORY, backcheck: FACTORY.backcheck - 3 } };
  for (const [name, a] of Object.entries(cases)) {
    const m = measure(a), s = new Sim(a);
    s.press(s.dip, 6); s.run(s.dip / 6 + 0.3);
    const lo = s.events.find(e => e.type === 'letoff');
    assert.equal(!!lo, m.letoff !== null, `${name}: the Sim ${lo ? 'lets off' : 'does not let off'}, the reading is ${m.letoff}`);
    if (lo) {
      assert.equal(lo.flown, false, `${name}: on a slow press the hammer is still on the jack at let-off`);
      assert.ok(Math.abs(lo.dist - m.letoff) < 0.15, `${name}: let-off ${lo.dist.toFixed(2)} mm in play, ${m.letoff.toFixed(2)} read`);
      assert.ok(Math.abs(lo.d - m.letoffDepth) < 0.1, `${name}: at ${lo.d.toFixed(2)} mm of key in play, ${m.letoffDepth.toFixed(2)} read`);
    }
    assert.equal(s.checked, m.check !== null, `${name}: checked in play ${s.checked}, checking read ${m.check}`);
    if (s.checked) assert.ok(Math.abs(stringGap(s.g) - m.check) < 0.2, `${name}: checked ${stringGap(s.g).toFixed(2)} in play, ${m.check.toFixed(2)} read`);
  }
});

test('U18: a let-off distance is given only where the hammer was still on the jack', () => {
  const slow = new Sim(FACTORY); slow.press(slow.dip, 6); slow.run(slow.dip / 6 + 0.1);
  assert.ok(Math.abs(slow.events.find(e => e.type === 'letoff').dist - SPEC.letoff.target) < 0.15, 'a slow press reads the regulated let-off');
  assert.equal(slow.events.find(e => e.type === 'letoff').flown, false);
  for (const v of [PP, MF, FF]) assert.equal(held(FACTORY, v).ev.find(e => e.type === 'letoff').flown, true, `${v} mm/s: in a blow the hammer has flown on, so no distance is shown`);
});

test('U9: at the factory regulation the bridle strap brings the hammer home sooner on a quick release, by about the filmed margin', () => {
  const m = measure(FACTORY);
  assert.ok(!m.softLifts && m.softStrapSlack > 0.5 && m.softStrapSlack < 1, `just enough slack for the soft pedal (${m.softStrapSlack.toFixed(2)} mm)`);
  const on = homeFromCheck(FACTORY), off = homeFromCheck({ ...FACTORY, damage: 'strapBroken' });
  assert.ok(on.ev.some(e => e.type === 'straptaut'), 'the strap goes taut on the way home');
  assert.ok(!off.ev.some(e => e.type === 'straptaut'), 'a broken strap never pulls');
  // S15: 110 ms with the strap, 126 without (14.5% longer)
  assert.ok(off.ms / on.ms > 1.08 && off.ms / on.ms < 1.22, `strap on ${on.ms.toFixed(1)} ms, broken ${off.ms.toFixed(1)}`);
  assert.ok(Math.abs(on.ms - 110) < 110 * 0.15 && Math.abs(off.ms - 126) < 126 * 0.15, 'each within 15% of the filmed time');
});

test('U12: a broken butt spring brings the hammer home slower in every case, and the hammer never hangs at the strings', () => {
  assert.equal(DAMAGE.buttSpringBroken.spec, 'buttSpring');
  assert.ok(!grade('buttSpring', measure({ ...FACTORY, damage: 'buttSpringBroken' })).ok, 'the condition check finds it');
  assert.ok(DYN.hammerLean > gString() + 2 * Math.PI / 180, 'the centre of mass stays on the player\'s side at the strings (S15: about 4 degrees)');
  const both = homeFromCheck(FACTORY).ms, strapOnly = homeFromCheck({ ...FACTORY, damage: 'buttSpringBroken' }).ms;
  const springOnly = homeFromCheck({ ...FACTORY, noStrap: true }).ms, neither = homeFromCheck({ ...FACTORY, noStrap: true, noSpring: true }).ms;
  // S15: 110, 118, 126, 218
  assert.ok(strapOnly > both + 1 && neither > springOnly * 1.4, `both ${both.toFixed(0)}, strap only ${strapOnly.toFixed(0)}, spring only ${springOnly.toFixed(0)}, neither ${neither.toFixed(0)} ms`);
  // let go by hand anywhere short of the strings, key at rest, it comes back to the rail (it hung 1.3 mm off them before)
  // (strap off: with it on, a hammer that near the strings has the wippen hanging from its strap)
  for (const a of [{ ...FACTORY, noStrap: true, noSpring: true }]) for (const short of [0.2, 1.4, 10]) {
    const s = new Sim(a), gr = gRail(a);
    let g = gString(); while (stringGap(g) < short) g -= 0.0005;
    s.g = g; s.w = 0; s.run(1.0);
    assert.ok(s.g <= gr + 1e-6, `let go ${short} mm short of the strings, it is back on its rail within a second (now ${stringGap(s.g).toFixed(1)} mm from them)`);
    assert.equal(count(s.events, 'strike'), 0);
  }
  // lifted by hand and let go (the prep card's test): slower home without the spring
  const lift = a => { const s = new Sim(a), g0 = gRail(a); s.g = g0 + 0.45 * (gString() - g0); s.run(0.6); return s.events.find(e => e.type === 'rail')?.t ?? Infinity; };
  // and a hard blow held is caught by the backcheck where a sound action's is (it hung 5 mm off the strings before)
  const ff = held({ ...FACTORY, damage: 'buttSpringBroken' }, FF);
  assert.ok(ff.s.checked && Math.abs(ff.gap - measure(FACTORY).check) < 0.5, `no spring, ff held: checked ${ff.gap.toFixed(1)} mm from the strings`);
  assert.ok(lift({ ...FACTORY, damage: 'buttSpringBroken' }) > 1.2 * lift(FACTORY), 'lifted and let go, it comes back slower');
});

test('U11: a weak jack spring keeps slow repeats and loses fast ones', () => {
  const a = { ...FACTORY, damage: 'jackSpringWeak' }, n = 5;
  const repeats = (reg, hz) => { const s = new Sim(reg); for (let i = 0; i < n; i++) { s.press(s.dip, MF); s.run(0.5 / hz); s.press(0, UP); s.run(0.5 / hz); } return count(s.events, 'strike'); };
  const rates = [3, 5, 7, 9, 11, 13, 15], got = rates.map(hz => repeats(a, hz));
  console.log(`  weak jack spring, strikes of ${n} at ${rates.map((hz, i) => `${hz}/s: ${got[i]}`).join(', ')}`);
  for (let i = 1; i < got.length; i++) assert.ok(got[i] <= got[i - 1], `never more notes at a faster rate (${got.join(', ')})`);
  assert.equal(got[0], n, 'every note at 3 a second'); assert.equal(got[1], n, 'every note at 5 a second');
  assert.ok(got.at(-1) < n, 'notes lost at 15 a second');
  assert.equal(repeats(FACTORY, 15), n, 'a sound spring keeps them all');
});

test('U14: no strike off the hammer rail alone, however hard the hammer comes back', () => {
  const cases = { 'backcheck out of reach, ff held': [{ ...FACTORY, backcheck: -15 }, FF, 0.6], 'no strap, no spring, mf staccato': [{ ...FACTORY, noStrap: true, noSpring: true }, MF, 0],
    'factory, ff staccato': [FACTORY, FF, 0], 'backcheck out of reach, hardest blow': [{ ...FACTORY, backcheck: -15 }, 2000, 0.6] };
  for (const [name, [a, v, hold]] of Object.entries(cases)) {
    const s = new Sim(a); s.press(s.dip, v); s.run(s.dip / v + hold); s.press(0, UP); s.run(0.8);
    assert.equal(count(s.events, 'strike'), 1, `${name}: ${s.events.map(e => e.type + (e.type === 'strike' ? `(${e.v.toFixed(2)})` : '')).join(' ')}`);
  }
  // the rebound's speed stops growing past railSoft: its rise stays near what S15 filmed (2 to 5.6 degrees)
  const s = new Sim({ ...FACTORY, backcheck: -15 }); s.press(s.dip, FF);
  let top = 0, landed = false;
  for (let i = 0; i < 6000; i++) { s.step(0.0001); if (s.events.some(e => e.type === 'rail')) landed = true; if (landed) top = Math.max(top, s.g - gRail(FACTORY)); }
  assert.ok(landed && top * 180 / Math.PI < 6, `an unchecked ff hammer rises ${(top * 180 / Math.PI).toFixed(1)} degrees off the rail`);
});

test('U5: the rail-pull figures the lost motion step quotes both pass the grade', () => {
  const at = lm => { const a = { ...FACTORY }; a.capstan = capstanFor(a, lm); return measure(a); };
  // Steinway: the hammer follows a pulled rail about 1/64 in; Spurlock's quick check: about 1/16 in; Igrec: 0.2 mm worn
  let lo = 0.02, hi = 0.3; for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; if (at(mid).railFollow < IN / 64) lo = mid; else hi = mid; }
  const steinway = at(hi), spurlock = (() => { let l = 0.05, h = 0.4; for (let i = 0; i < 30; i++) { const mid = (l + h) / 2; if (at(mid).railFollow < IN / 16) l = mid; else h = mid; } return at(l); })();
  assert.ok(grade('lostMotion', steinway).ok && steinway.jackReturns, `Steinway's 1/64 in of follow (${steinway.lostMotion.toFixed(3)} mm at the jack) passes`);
  assert.ok(grade('lostMotion', spurlock).ok, `Spurlock's 1/16 in of follow (${spurlock.lostMotion.toFixed(3)} mm at the jack) passes`);
  assert.ok(grade('lostMotion', at(0.2)).ok, 'Igrec\'s worn-action 0.2 mm passes');
  assert.ok(!grade('lostMotion', at(0.25)).ok && !grade('lostMotion', at(0.03)).ok, 'more than that is too much, and 0.03 mm is too little');
  assert.equal(sixtyFourths(steinway.railFollow), 'about 1/64"'); assert.equal(sixtyFourths(spurlock.railFollow), 'about 1/16"');
  // and in play: at Steinway's figure the jack still gets back on Spurlock's slow release
  const s = new Sim({ ...FACTORY, capstan: capstanFor(FACTORY, steinway.lostMotion) }); s.setPedal(true); s.run(0.15); s.press(s.dip, FF); s.run(0.35); s.press(0, 10); s.run(s.dip / 10 + 0.2);
  assert.equal(s.jack, 'under', 'the jack return test passes at 1/64 in of follow');
});

test('U13: the soft pedal\'s travel is set before the bridle straps', () => {
  const order = STEPS.filter(s => !s.info).map(s => s.spec);
  assert.ok(order.indexOf('softPedal') < order.indexOf('bridle') && order.indexOf('check') < order.indexOf('softPedal'), order.join(' '));
});

test('U17: the exam\'s evenness survives one paper front punching on one note, at every level', () => {
  const EVEN = ['keyHeight', 'dip', 'blow', 'lostMotion', 'letoff', 'check', 'damperTiming'], step = ADJ.find(d => d.id === 'frontPunch').step;
  const base = measure(FACTORY);
  for (const dir of [-1, 1]) {
    const m = measure({ ...FACTORY, frontPunch: FACTORY.frontPunch + dir * step });
    for (const k of [1.5, 1, 0.75]) for (const id of EVEN)
      assert.ok(Math.abs(m[id] - base[id]) <= evenTol(id, k) + 1e-9, `${id} at x${k}: one punching moves it ${Math.abs(m[id] - base[id]).toFixed(2)}, the tolerance is ${evenTol(id, k).toFixed(2)}`);
  }
  // and the tolerance is otherwise one note's own
  const [lo, hi] = band(SPEC.blow);
  assert.ok(Math.abs(evenTol('blow', 1) - (hi - lo) / 2) < 1e-9 && Math.abs(evenTol('dip', 0.75) - 0.3) < 1e-9, 'blow and dip keep one note\'s tolerance');
});
