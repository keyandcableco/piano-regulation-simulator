// The sharp in the middle of the grand's three-key model (model.js SHARP, Greg 2026-11-16): its own lever, regulated to
// its own figures (1/2 in above the naturals, the naturals' aftertouch, not buried), graded in those terms, playing as a
// key does, and the rails the three share passing on all three.
// node --test tests/grand-sharp.test.mjs   (Node 22; about a minute: measure() runs a slow press each time)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { G, SPEC, FACTORY, SHARP, SHARP_KEY, NATURAL, NEIGHBOR_H, NAT_TOP_AT_SHARP, Sim, measure, grade, keyHeightOf, dipOf,
  sharpFactory, asKey, touch } from '../model.js';

const out = (a, k = 1) => Object.keys(SPEC).filter(id => !grade(id, measure(a), k).ok);
const SF = sharpFactory();
const nat = measure(FACTORY), sh = measure(SF);

test('the natural\'s lever is the one the model always had', () => {
  assert.equal(NATURAL.s, 0);
  assert.equal(NATURAL.front, G.keyFrontLocal);
  assert.equal(NATURAL.arm, 235);
  assert.ok(Math.abs(keyHeightOf(FACTORY) - NEIGHBOR_H) < 1e-9 || Math.abs(keyHeightOf({ ...FACTORY, balPunch: 1.5 }) - NEIGHBOR_H) < 1e-9);
  assert.ok(!nat.sharp && nat.sharpBottom === null);
});

test('the sharp\'s lever: pressed nearer its balance pin, which sits behind the naturals\'', () => {
  assert.equal(SHARP_KEY.s, SHARP.balBack);
  assert.ok(SHARP_KEY.arm < NATURAL.arm, `its front arm ${SHARP_KEY.arm.toFixed(1)} mm`);
  assert.ok(SHARP_KEY.frontRailX > G.frontRailX + 40, 'its front rail pin behind the naturals\' heads');
});

test('at its factory regulation the sharp is 1/2 in above the naturals, with their aftertouch, and 2 mm clear of them when down', () => {
  assert.ok(sh.sharp);
  assert.ok(Math.abs(sh.keyHeight) < 0.01, `height off 1/2 in by ${sh.keyHeight.toFixed(3)}`);
  assert.ok(Math.abs(keyHeightOf(SF) - NAT_TOP_AT_SHARP - SHARP.height) < 0.01);
  assert.ok(Math.abs(sh.aftertouch - nat.aftertouch) < 0.02, `aftertouch ${sh.aftertouch.toFixed(3)} against the naturals' ${nat.aftertouch.toFixed(3)}`);
  assert.ok(Math.abs(sh.sharpBottom - SHARP.bottom) < 0.05, `down, ${sh.sharpBottom.toFixed(2)} above the naturals`);
  assert.ok(sh.dip > nat.dip, `the sharp travels farther than the naturals: ${sh.dip.toFixed(2)} against ${nat.dip.toFixed(2)}`);
  assert.deepEqual(out(SF), [], 'every spec in at its factory regulation');
});

test('a buried sharp fails its dip, a high one its height, a shallow one its aftertouch', () => {
  const buried = { ...SF, frontPunch: SF.frontPunch - 1.4 };
  const g = grade('dip', measure(buried));
  assert.ok(!g.ok && /bur/.test(g.note), `buried: ${g.note} (${g.bottom.toFixed(2)})`);
  const high = measure({ ...SF, balPunch: SF.balPunch + 0.5 });
  assert.ok(!grade('keyHeight', high).ok && high.keyHeight > 0);
  const shallow = measure({ ...SF, frontPunch: SF.frontPunch + 0.8 });
  assert.ok(!grade('aftertouch', shallow).ok, `aftertouch ${shallow.aftertouch.toFixed(2)}`);
});

test('a key turned sharp and back keeps how far each knob is off its factory', () => {
  const a = { ...FACTORY, capstan: FACTORY.capstan + 0.3, frontPunch: FACTORY.frontPunch - 0.2, wear: 0.4 };
  const s = asKey(a, true);
  assert.ok(s.sharp);
  assert.ok(Math.abs(s.capstan - (SF.capstan + 0.3)) < 1e-9 && Math.abs(s.frontPunch - (SF.frontPunch - 0.2)) < 1e-9 && s.wear === 0.4);
  const back = asKey(s, false);
  assert.ok(!('sharp' in back));
  for (const k of Object.keys(a)) assert.ok(Math.abs(back[k] - a[k]) < 1e-9, k);
});

test('the rails the three share, set on the sharp, pass on the naturals', () => {
  const n = { ...FACTORY, restRail: SF.restRail, damperStop: SF.damperStop, pedalLift: SF.pedalLift };
  assert.deepEqual(out(n), []);
});

test('the sharp plays: a firm blow strikes, checks and comes home like the naturals\'', () => {
  const play = a => { const s = new Sim(a); s.blow('mf'); const ev = []; for (let i = 0; i < 900; i++) { s.events.length = 0; s.step(0.001); ev.push(...s.events); if (i === 300) s.release(); }
    s.step(1.5); return { strike: ev.find(e => e.type === 'strike')?.v ?? null, checked: ev.some(e => e.type === 'checked'), home: s.d < 0.1 }; };
  const pn = play(FACTORY), ps = play(SF);
  assert.ok(ps.strike && pn.strike, 'both strike');
  assert.ok(Math.abs(ps.strike / pn.strike - 1) < 0.35, `hammer speed ${ps.strike.toFixed(2)} against ${pn.strike.toFixed(2)} m/s`);
  assert.ok(ps.checked && ps.home);
  const t = touch(SF), tn = touch(FACTORY);
  assert.ok(t.down > 30 && t.down < 70, `the sharp weighs off: down ${t.down.toFixed(1)} g (natural ${tn.down.toFixed(1)})`);
  assert.ok(dipOf(SF) > 0);
});
