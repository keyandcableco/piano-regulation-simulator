// The grand's key under a finger (model.js Sim.push / blow / release, touch(), dipAt(), keyReturn(), repeatTest()):
// touchweight, the front punching's give, key return from the force balance, the repetition ceiling, energy, and the
// same answer whatever the time step or the way a run is cut into frames. After the second veteran critique
// (research/critique/2026-11-09/grand-dynamics.md D1-D10).
// node --test tests/grand-physics.test.mjs   (Node 22; a few minutes: the repetition ceilings play many blows)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { G, FACTORY, Sim, BLOWS, HAMMER_WT, I_HAM, GRAV, KEY_FW, crownY, measure, touch, dipAt, dipOf, keyReturn, repeatTest, repeatCeiling } from '../model.js';

const at = (f = {}) => { const a = { ...FACTORY }; for (const [k, v] of Object.entries(f)) a[k] = typeof v === 'string' ? v : (a[k] || 0) + v; return a; };
const dist = s => G.stringY - crownY(s.g);
const QUIET = new Set(['tender', 'dropscrew', 'damperup', 'seated', 'damperstop', 'railbounce']);
// play a blow, hold it, let go at tUp; returns the events, the first strike's speed and the check distance
function play(adj, blow, { tUp = 0.3, T = 0.9, chunk = 0.001, h } = {}) {
  const s = new Sim(adj), ev = [];
  if (h) s.h = h;
  typeof blow === 'number' ? s.push(blow) : s.blow(blow);
  for (let i = 0, n = Math.round(T / chunk), up = Math.round(tUp / chunk); i < n; i++) {
    if (i === up) s.release();
    s.events.length = 0; s.step(chunk);
    for (const e of s.events) ev.push(e);
  }
  return { s, ev, order: ev.filter(e => !QUIET.has(e.type)).map(e => e.type).join(' '), strike: ev.find(e => e.type === 'strike')?.v ?? null,
    strikes: ev.filter(e => e.type === 'strike').map(e => e.v), check: ev.find(e => e.type === 'checked')?.dist ?? null };
}
const T0 = touch(FACTORY);

test('touchweight: the factory key weighs off like a medium grand, and the Sim agrees with the reading', () => {
  // usual figures: about 50 g down, 20 to 30 up (Stanwood's example, PTG 2022: 50 and 24)
  assert.ok(T0.down > 38 && T0.down < 55, `downweight ${T0.down.toFixed(1)}`);
  assert.ok(T0.up > 12 && T0.up < 30, `upweight ${T0.up.toFixed(1)}`);
  assert.ok(T0.friction > 8 && T0.friction < 16 && T0.returns, `friction ${T0.friction.toFixed(1)}`);
  // a gram weight a little over the downweight takes the key down to the let-off bump and no further; a little under
  // doesn't take it down
  const down = w => { const s = new Sim(FACTORY); s.push(w); s.step(4); return s.d; };
  const bump = T0.trace.find(r => r.state).d;
  const over = down(T0.down + 3), under = down(T0.down - 3);
  assert.ok(over > bump - 0.4 && over < bump + 0.5, `${(T0.down + 3).toFixed(0)} g stops at the bump: ${over.toFixed(2)} of ${bump.toFixed(2)}`);
  assert.ok(under < 2, `${(T0.down - 3).toFixed(0)} g doesn't take it down: ${under.toFixed(2)}`);
  // from there the key lifts a little under the upweight all the way back, and not a little over it
  const up = w => { const s = new Sim(FACTORY); s.push(T0.down + 3); s.step(4); s.push(w); s.step(4); return s.d; };
  assert.ok(up(T0.up - 3) < 0.3, `the key lifts ${(T0.up - 3).toFixed(0)} g back up: ${up(T0.up - 3).toFixed(2)}`);
  assert.ok(up(T0.up + 4) > 3, `it doesn't lift ${(T0.up + 4).toFixed(0)} g: ${up(T0.up + 4).toFixed(2)}`);
});

test('touchweight: the let-off bump is in the trace, and getting through it takes two or three times the downweight', () => {
  assert.ok(T0.peak > 2 * T0.down && T0.peak < 4 * T0.down, `peak ${T0.peak.toFixed(0)} g against ${T0.down.toFixed(0)} down`);
  const states = [...new Set(T0.trace.map(r => r.state).filter(Boolean))];
  assert.deepEqual(states, ['screw', 'tender', 'escaped']);
  assert.ok(T0.bottom > T0.up, 'held down, the wound repetition spring pushes back harder than the key does mid-stroke');
});

test('touchweight: the faults that change it change it', () => {
  const t = f => touch(at(f));
  // a tight hammer flange (7 g at 23 mm against 4.5) adds its 58 mm·g x the hammer's turn per mm of key: about 2.4 g of friction
  const ht = t({ center: 'hammerTight' });
  assert.ok(Math.abs(ht.friction - T0.friction - 2.4) < 0.5 && Math.abs(ht.balance - T0.balance) < 0.5, `tight hammer center: friction +${(ht.friction - T0.friction).toFixed(1)}`);
  assert.ok(t({ center: 'wippenTight' }).friction > T0.friction + 3, 'tight wippen center: more friction');
  const bal = t({ bushing: 'balTight' }), front = t({ bushing: 'frontTight' });
  assert.ok(bal.down > T0.down + 10 && bal.up < T0.up - 10 && bal.returns, 'tight balance bushing: down and up move apart');
  assert.ok(!front.returns && front.up < 0, 'tight front bushing: the key won\'t come back up');
  // the repetition spring isn't in the downweight (the lever is on its stop until the drop screw), it is in the bump
  const strong = t({ repSpring: 0.7 }), weak = t({ repSpring: -0.6 });
  assert.ok(Math.abs(strong.down - T0.down) < 0.5 && strong.peak > T0.peak + 15 && strong.bottom > T0.bottom + 15, `strong spring: peak ${strong.peak.toFixed(0)} against ${T0.peak.toFixed(0)}`);
  assert.ok(weak.peak < T0.peak - 15, 'weak spring: a smaller bump');
  // a drop screw 6 mm low holds the lever down from the top of the stroke: the key winds the spring all the way (GS-17)
  assert.ok(t({ drop: -6 }).down > T0.down + 25, 'drop screw far too low: a heavy key from the top');
  // the damper comes in as weight where the key picks it up, earlier when it lifts early
  const dmp = tr => tr.find(r => r.damper > 0), early = t({ damperGap: -1.5 });
  assert.ok(dmp(T0.trace).damper > 8 && dmp(T0.trace).damper < 14 && dmp(early.trace).d < dmp(T0.trace).d - 1, 'early damper: its weight comes in sooner');
});

test('the front punching gives under the finger: dip depends on how hard the key is pressed', () => {
  const d0 = dipOf(FACTORY), d = w => dipAt(FACTORY, w, T0) - d0;
  assert.ok(d(50) === 0, 'a weight the action holds up doesn\'t reach the punching');
  // Hirschkorn's loading curve for the Boston's front felt (Table A.8, contact 2)
  assert.ok(d(250) > 0.08 && d(250) < 0.2, `250 g: +${d(250).toFixed(2)} mm`);
  assert.ok(d(1000) > 0.4 && d(1000) < 0.6, `1 kg: +${d(1000).toFixed(2)} mm`);
  assert.ok(d(250) < d(500) && d(500) < d(1000) && d(1000) < d(2000));
  // the Sim's key, pushed and left to settle, sits where the reading says
  for (const w of [250, 1000]) { const s = new Sim(FACTORY); s.push(w); s.step(1.5); assert.ok(Math.abs(s.d - dipAt(FACTORY, w, T0)) < 0.04, `${w} g: key at ${s.d.toFixed(3)}, reading ${dipAt(FACTORY, w, T0).toFixed(3)}`); }
  // the regulation readings are untouched: a slow press by hand stops at the dip
  const s = new Sim(FACTORY); s.press(s.dip, 6); s.step(2.2);
  assert.equal(s.d, s.dip);
});

test('marginal aftertouch fails on soft blows first', () => {
  // with no aftertouch on a slow press, a soft blow doesn't get the jack out and the hammer strikes again off it; a hard
  // blow squashes the punching far enough to let off cleanly
  for (const fp of [1.7, 1.9]) {
    const a = at({ frontPunch: fp });
    assert.equal(measure(a).letoff, null, `front punching +${fp}: no let-off on a slow press`);
    const soft = play(a, 150, { tUp: 0.5 }), hard = play(a, 'ff', { tUp: 0.5 });
    assert.ok(soft.strikes.length >= 2, `+${fp}, a 150 g finger: ${soft.order}`);
    assert.ok(hard.strikes.length === 1 && hard.check !== null, `+${fp}, ff: ${hard.order}`);
  }
  // the normal blow is clean at +1.7 and stutters at +1.9
  assert.equal(play(at({ frontPunch: 1.7 }), 'mf', { tUp: 0.5 }).strikes.length, 1);
  assert.ok(play(at({ frontPunch: 1.9 }), 'mf', { tUp: 0.5 }).strikes.length >= 2);
});

test('blows: harder finger, faster hammer, in Askenfelt and Jansson\'s ranges; the jack lets off before the string', () => {
  const v = Object.fromEntries(['pp', 'mf', 'ff', 'staccato'].map(b => [b, play(FACTORY, b)]));
  assert.ok(v.pp.strike > 0.5 && v.pp.strike < 1.1, `pp ${v.pp.strike.toFixed(2)} m/s`);
  assert.ok(v.mf.strike > 1.6 && v.mf.strike < 2.6, `mf ${v.mf.strike.toFixed(2)} m/s`);
  assert.ok(v.ff.strike > 4.3 && v.ff.strike < 5.6, `ff ${v.ff.strike.toFixed(2)} m/s`);
  for (const b of Object.keys(v)) assert.match(v[b].order, /^letoff strike/, `${b}: ${v[b].order}`);
  // the normal blow checks at the backcheck's face, where the regulation reading has it; a hard one deeper
  const held = play(FACTORY, 'mf', { tUp: 9 });
  assert.ok(Math.abs(dist(held.s) - measure(FACTORY).check) < 0.15, `mf held at ${dist(held.s).toFixed(2)}, reading ${measure(FACTORY).check.toFixed(2)}`);
  assert.ok(v.ff.check > v.mf.check + 3);
  // a soft blow doesn't stay in check (Scott Murphy's bobble clips: 0.84-0.97 m/s came out, 1.2-1.5 stayed)
  assert.match(v.pp.order, /softcheck/);
  // the hammer starts from rest and is pushed up to speed (the key moved at a set speed had it at 1.5 m/s in the first step)
  const s = new Sim(FACTORY); s.blow('ff'); s.sub(s.h);
  assert.ok(s.w * 0.14 < 0.05, `crown speed after one step of ff: ${(s.w * 0.14).toFixed(4)} m/s`);
  s.step(0.004);
  assert.ok(s.w * 0.14 > 0.5 && s.w * 0.14 < 1.5, `and after 4 ms: ${(s.w * 0.14).toFixed(2)} m/s`);
});

test('jack position inside its tolerance barely moves the blow (no kick from the jack top\'s corner)', () => {
  const v0 = play(FACTORY, 'mf').strike;
  for (const dj of [0.3, 0.15, -0.15, -0.4]) {
    const a = at({ jackScrew: dj }), v = play(a, 'mf').strike;
    assert.ok(Math.abs(measure(a).jackPos) < 0.45 && Math.abs(v / v0 - 1) < 0.03, `jack screw ${dj}: ${v.toFixed(3)} against ${v0.toFixed(3)} m/s`);
  }
});

test('key return comes from the force balance: the spring brings it up, friction holds it back', () => {
  const f = keyReturn(FACTORY), strong = keyReturn(at({ repSpring: 0.7 })), weak = keyReturn(at({ repSpring: -0.8 }));
  // Scott Murphy's clips of a Steinway action model: back up in 57 ms, 180 ms with the repetition spring unhooked
  assert.ok(f.keyMs > 45 && f.keyMs < 90, `factory ${f.keyMs.toFixed(0)} ms`);
  assert.ok(strong.keyMs < f.keyMs - 8, `strong spring ${strong.keyMs.toFixed(0)} ms`);
  assert.ok(weak.keyMs > 1.6 * f.keyMs && weak.keyMs < 260, `weak spring ${weak.keyMs.toFixed(0)} ms`);
  assert.ok(keyReturn(at({ bushing: 'balTight' })).keyMs > 1.5 * f.keyMs, 'a tight balance bushing: slow');
  assert.ok(keyReturn(at({ center: 'wippenTight' })).keyMs > 1.3 * f.keyMs, 'a tight wippen center: slow');
  const stuck = keyReturn(at({ bushing: 'frontTight' }));
  assert.ok(stuck.stuck && stuck.keyMs === null, 'a tight front bushing: it stays down');
  // the jack is back under with the key about a third to a half of the way up (Askenfelt and Jansson: about a third)
  assert.ok(f.resetUp > 0.3 && f.resetUp < 0.5, `reset ${(100 * f.resetUp).toFixed(0)}% up`);
  assert.ok(keyReturn(at({ damage: 'brokenJackSpring' })).resetUp > 0.95, 'no jack spring: only with the key all the way up');
});

test('the hammer comes home onto the rest rail and bounces; a quick release throws it back up', () => {
  // staccato: the key is home before the hammer; the shank goes through its rest onto the rail's felt and comes back
  const s = new Sim(FACTORY), rest = dist(s); let low = 0, high = 1e9, bounced = false, t = 0;
  s.blow('staccato');
  let strikes = 0;
  for (let i = 0; i < 6000; i++) { s.events.length = 0; s.sub(s.h); for (const e of s.events) { if (e.type === 'railbounce') bounced = true; if (e.type === 'strike') strikes++; } if (i > 400) { const d = dist(s) - rest; if (d > low) { low = d; t = i; } if (i > t && low > 1) high = Math.min(high, d); } }
  // Scott Murphy's clip of a quick release: 4.6 mm below rest (the whole rest-rail gap), thrown back 9 mm, still
  // swinging 125 ms later; his double-strike clip has a staccato hammer thrown all the way back to the string. Here the
  // rail gap is 1/8 in at the shank, about 4 mm at the crown.
  assert.ok(bounced && low > 3 && low < 6, `sank ${low.toFixed(1)} mm below rest`);
  assert.ok(-high > 1 && low - high < 40 && strikes === 1, `thrown back ${(low - high).toFixed(1)} mm, ${strikes} strike`);
  s.step(1.5);
  assert.ok(s.d === 0 && s.w === 0 && Math.abs(dist(s) - rest) < 1e-6, 'and settles back at rest');
});

test('repetition has a ceiling, in a real grand\'s range, and faults lower it', { timeout: 600000 }, () => {
  // from a half release; a good grand manages about 10 to 14 blows a second (Scott Murphy filmed 24 blows in 2.45 s)
  const f = repeatCeiling(FACTORY);
  assert.ok(f >= 10 && f <= 16, `factory repeats to ${f} a second`);
  // a spring too weak to hold the hammer up for the jack: only with the key let all the way up
  const weak = at({ repSpring: -0.8 });
  assert.equal(repeatCeiling(weak), 0, 'weak spring: no repeat from a half release');
  assert.ok(repeatCeiling(weak, { up: 1 }) >= 8, 'weak spring: it still repeats with the key let all the way up');
  assert.equal(repeatCeiling(at({ drop: -3 })), 0, 'deep drop: no repeat from a half release');
  assert.ok(repeatCeiling(at({ backcheck: -3 })) < f - 3, 'a backcheck that misses: slower');
  assert.ok(repeatCeiling(at({ repSpring: 0.7 })) < f - 3, 'a spring too strong throws the hammer back at the string: slower');
  assert.equal(repeatCeiling(at({ letoff: -1 })), 0, 'let-off far too early: no repeat from a half release');
  assert.equal(repeatCeiling(at({ damage: 'brokenJackSpring' })), 0, 'no jack spring: no repeat');
  // what doesn't lower it here: a tight hammer or wippen center, and the jack a little back (they show as friction at
  // the key and a slower key return instead)
  assert.ok(Math.abs(repeatCeiling(at({ center: 'hammerTight' })) - f) <= 1);
  // one beat's worth: at 8 a second every blow sounds
  const r = repeatTest(FACTORY, 8);
  assert.ok(r.ok && r.sounded === 5 && r.blows.every(b => b.rose > 0.4 && b.rose < 0.55), JSON.stringify(r.blows.map(b => +b.v.toFixed(2))));
});

test('energy: nothing moves by itself, a blow gets less out than the finger puts in, bounces die away', () => {
  const s = new Sim(FACTORY), g0 = s.g;
  s.push(0); s.step(1);
  assert.ok(s.d === 0 && s.v === 0 && s.w === 0 && s.g === g0, 'at rest with no finger: still');
  for (const b of ['pp', 'mf', 'ff']) {
    const k = new Sim(FACTORY); let e = null; k.blow(b);
    for (let i = 0; i < 3000 && !e; i++) { k.events.length = 0; k.sub(k.h); e = k.events.find(x => x.type === 'strike'); }
    // in g·mm: the hammer's energy of motion at the string and the height it gained, against the finger's work plus what
    // the key's own front weight gave on the way down
    const w = e.v * 1000 / Math.hypot(G.crownC[0], G.crownC[1] + G.crownR), got = 0.5 * I_HAM * w * w / GRAV + HAMMER_WT * (e.g - g0), put = k.work + KEY_FW * k.d;
    assert.ok(got < put && got > 0.3 * put, `${b}: hammer got ${got.toFixed(0)} of ${put.toFixed(0)} g·mm`);
  }
  // let go from check: each time the hammer comes back up after landing it comes less high than the time before
  const r = new Sim(FACTORY); r.blow('mf'); r.step(0.3); r.release();
  const peaks = []; let prev = dist(r), falling = true;
  for (let i = 0; i < 12000; i++) { r.sub(r.h); const d = dist(r); if (i > 1500) { if (falling && d < prev) falling = false; else if (!falling && d > prev) { peaks.push(prev); falling = true; } } prev = d; }
  for (let i = 1; i < peaks.length; i++) assert.ok(peaks[i] > peaks[i - 1] - 0.05, `rebounds die away: ${peaks.map(p => p.toFixed(1)).join(', ')}`);
  assert.ok(r.d === 0 && r.w === 0, 'and it comes to rest');
});

test('the same answer at half the time step, and however a run is cut into frames', () => {
  const cases = [{}, { letoff: -1 }, { repSpring: 0.7 }, { drop: 2 }, { backcheck: -3 }, { capstan: 0.5 }, { frontPunch: -0.8 }, { center: 'jackTight' }];
  for (const f of cases) for (const b of ['mf', 'ff']) {
    const a = play(at(f), b, { tUp: 9, T: 0.25 }), h = play(at(f), b, { tUp: 9, T: 0.25, h: 0.00005 });
    assert.equal(h.order, a.order, `${JSON.stringify(f)} ${b}`);
    assert.ok(Math.abs(h.strike / a.strike - 1) < (Object.keys(f).length ? 0.015 : 0.01), `${JSON.stringify(f)} ${b}: strike ${a.strike.toFixed(3)} against ${h.strike.toFixed(3)} at half the step`);
    // (the factory key to a twentieth of a millimetre; a fault case, where the key may stop on a jammed jack, to a tenth)
    if (a.check !== null) assert.ok(Math.abs(h.check - a.check) < (Object.keys(f).length ? 0.1 : 0.05), `${JSON.stringify(f)} ${b}: check ${a.check.toFixed(3)} against ${h.check.toFixed(3)}`);
  }
  // a 60 Hz screen at real speed, at Slow x10, a 144 Hz screen at Slow x50, and frames that come late
  const ref = play(FACTORY, 'mf', { chunk: 0.001 });
  for (const chunk of [1 / 60, 1 / 600, 1 / 7200]) { const p = play(FACTORY, 'mf', { chunk, tUp: Math.round(0.3 / chunk) * chunk }); assert.equal(p.strike, ref.strike, `frames of ${(chunk * 1000).toFixed(2)} ms`); assert.equal(p.check, ref.check); }
  const s = new Sim(FACTORY), ev = []; let seed = 7; s.blow('mf');
  for (let t = 0; t < 0.25;) { seed = (seed * 16807) % 2147483647; const dt = 0.0167 * (0.85 + 0.3 * seed / 2147483647); s.events.length = 0; s.step(dt); ev.push(...s.events); t += dt; }
  assert.equal(ev.find(e => e.type === 'strike').v, ref.strike, 'frames 15% early or late');
});

test('the jack stops the key when it jams on its stop felt', () => {
  // let-off far too early: the tripped jack reaches the felt in the lever's window before the key reaches the punching
  const a = at({ letoff: -1 }), s = new Sim(a); s.press(s.dip, 6); s.step(2.5);
  assert.ok(s.jammed && s.d < s.dip - 0.05, `slow press stops at ${s.d.toFixed(2)} of ${s.dip.toFixed(2)}`);
  const k = new Sim(a); k.push(BLOWS.mf.F); k.step(0.5);
  assert.ok(k.jammed && k.d < k.dip, `and under a finger: ${k.d.toFixed(2)}`);
  k.release(); k.step(1.5);
  assert.ok(k.d === 0 && !k.jammed, 'let go, it comes back up');
});
