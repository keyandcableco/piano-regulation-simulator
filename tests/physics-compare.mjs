// Before and after the force-driven key: two records of tests/physics-battery.mjs laid side by side as
// tests/physics-before-after.md, the large differences marked and explained.
//   node tests/physics-compare.mjs [before.json] [after.json] [out.md]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const [bPath = path.join(here, 'data/physics-before.json'), aPath = path.join(here, 'data/physics-after.json'), out = path.join(here, 'physics-before-after.md')] = process.argv.slice(2);
const B = JSON.parse(fs.readFileSync(bPath, 'utf8')), A = JSON.parse(fs.readFileSync(aPath, 'utf8'));
const f = (x, n = 2) => x == null ? '–' : (+x).toFixed(n);
const pct = x => x == null ? '–' : `${Math.round(100 * x)}%`;
const short = o => o.replace(/\brailbounce( railbounce)*/g, 'rail').replace(/letoff/g, 'let-off').replace(/softcheck/g, 'soft check') || '(nothing)';
const strikes = r => r.strikes.length ? r.strikes.map(v => f(v)).join(', ') : 'none';

// why a row differs, by what differs (the explanations are in the notes under the tables)
function reasons(b, a, mf, c) {
  const why = new Set();
  if (b.keyUpMs != null && a.keyUpMs != null && Math.abs(a.keyUpMs - b.keyUpMs) > 25) why.add('R');
  if ((b.keyUpMs == null) !== (a.keyUpMs == null)) why.add('R');
  if (b.strikes[0] && a.strikes[0] && Math.abs(a.strikes[0] / b.strikes[0] - 1) > 0.15) why.add('S');
  if (b.check != null && a.check != null && Math.abs(a.check - b.check) > 1) why.add('C');
  if ((b.check == null) !== (a.check == null)) why.add('C');
  if (b.resetUp != null && a.resetUp != null && Math.abs(a.resetUp - b.resetUp) > 0.1) why.add('J');
  const core = o => o.replace(/ ?(railbounce|softcheck|uncheck)/g, '').trim();
  if (core(b.order) !== core(a.order)) why.add('E');
  if (b.strikes.length !== a.strikes.length) why.add('B');
  if (/jackjam/.test(a.order) && a.maxD < a.dip - 0.03) why.add('K');
  return [...why].join(' ');
}

const lines = [];
const P = s => lines.push(s);
P('# The grand in motion, before and after the key was given weight');
P('');
P('Written by `tests/physics-compare.mjs` from two records of `tests/physics-battery.mjs`: `tests/data/physics-before.json`');
P('(the Sim as it stood at commit 2365fdd: the key moved at a set speed) and `tests/data/physics-after.json` (the key');
P('pushed by a finger\'s force, with its own weight, friction and felts). The factory key and the 38 Find-the-fault cases,');
P('each played through the same programs. Three of the cases were re-sized on the way and are compared at their new size in');
P('the after columns: the shallow-dip stutter (front punching +1.7 to +1.9), the weak repetition spring (-0.6 to -0.8) and');
P('the tight front bushing (its drag 26 g to 34 g: a played key, kicked up by the spring, coasted home against 26).');
P('');
P('What is compared:');
P('- **set 250**: the key moved down at 250 mm/s, held to 0.5 s, then let go. Before, this was Play and Strike & hold. The');
P('  Sim can still be driven that way (a hand moving the key at a set speed: the slow presses use it), so the same key');
P('  motion can be played on both; after, the key let go comes up by itself.');
P('- **mf**: what Play and Strike & hold are now: a 400 g finger. There is no before for it.');
P('- **slow press** at 6 mm/s: the regulation tests\' press, a hand moving the key. It should not change.');
P('');
P('The regulation readings are not in these tables because they did not change: `measure()`, `grade()` (at all three');
P('levels) and `slowPress()` were compared between the two versions of `model.js` for the factory key and every case, at');
P('the old fault sizes and the new: 7052 values, one different, by intent (the tight front bushing\'s drag reading,');
P('26 g to 34; a one-off script; the readings\' code was not touched).');
P('');
const bf = B.cases[0].runs, af = A.cases[0].runs, at = A.cases[0];
P('## Factory key');
P('');
P('| | before | after |');
P('|---|---|---|');
P(`| Slow press: let-off from the string | ${f(bf.slow6.letoff)} mm | ${f(af.slow6.letoff)} mm |`);
P(`| Key at 60 mm/s: strike | ${strikes(bf.set60)} m/s | ${strikes(af.set60)} m/s |`);
P(`| Key at 250 mm/s: strike, check | ${strikes(bf.set250)} m/s, ${f(bf.set250.check)} mm | ${strikes(af.set250)} m/s, ${f(af.set250.check)} mm |`);
P(`| Key at 600 mm/s: strike, check | ${strikes(bf.set600)} m/s, ${f(bf.set600.check)} mm | ${strikes(af.set600)} m/s, ${f(af.set600.check)} mm |`);
P(`| Key back up after letting go | ${bf.set250.keyUpMs} ms, every key, every case | ${af.set250.keyUpMs} ms after that press; ${f(at.keyReturn.keyMs, 0)} ms after a normal blow |`);
P(`| Jack back under the knuckle | key ${pct(bf.set250.resetUp)} up | key ${pct(af.set250.resetUp)} up (${pct(at.keyReturn.resetUp)} after a normal blow) |`);
P(`| pp, mf, ff, staccato (finger 100 g, 400 g, 1.8 kg, 1 kg for 22 ms) | no such thing | ${['pp', 'mf', 'ff', 'staccato'].map(b => f(af[b].strikes[0])).join(', ')} m/s |`);
P(`| Check after mf, ff | – | ${f(af.mf.check)}, ${f(af.ff.check)} mm |`);
P(`| Downweight, upweight | not computed | ${f(at.touch.down, 0)} g, ${f(at.touch.up, 0)} g |`);
P(`| Most the key asks for through let-off | not computed | ${f(at.touch.peak, 0)} g |`);
P(`| Fastest repetition, half release / full release | 42 a second, whatever the fault (critique D1) | ${at.repeat.half} / ${at.repeat.full} a second |`);
P('');
P('## Every case, the same key motion (250 mm/s down, let go at 0.5 s), and the new normal blow');
P('');
P('Events are in the order they happened (damper and contact events left out; "rail" is the shank bouncing on the rest');
P('rail). Strike speeds in m/s, check in mm from the string, "up" is the time the key took to come back, "reset" how far up');
P('the key was when the jack got back under. The last column says which notes below explain the differences.');
P('');
P('| Case | before: events | strike | check | up ms | reset | after, same motion: events | strike | check | up ms | reset | after, mf finger: events | strike | check | why |');
P('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (let i = 0; i < B.cases.length; i++) {
  const b = B.cases[i].runs.set250, c = A.cases[i], a = c.runs.set250, m = c.runs.mf;
  const name = c.name === B.cases[i].name ? c.name : `${B.cases[i].name} → ${c.name}`;
  P(`| ${name} | ${short(b.order)} | ${strikes(b)} | ${f(b.check)} | ${b.keyUpMs ?? 'stays down'} | ${pct(b.resetUp)} | ${short(a.order)} | ${strikes(a)} | ${f(a.check)} | ${a.keyUpMs ?? 'stays down'} | ${pct(a.resetUp)} | ${short(m.order)} | ${strikes(m)} | ${f(m.check)} | ${reasons(b, a, m, c)} |`);
}
P('');
P('### Why they differ');
P('');
P('- **R, key return.** Before, every key came up at 60 mm/s: 158 ms, less only for a tight bushing or wippen center by a');
P('  hand-set share. Now the key comes up under what is on it: the repetition spring while the drop screw holds the lever');
P('  (most of the push at the start), the jack spring, the wippen\'s weight and the hammer\'s once it lands, against the key\'s');
P('  own front weight and all the friction. Scott Murphy filmed 57 ms with the spring and 180 ms without. A key let go from');
P('  a press that never checked the hammer (soft blows, the set-speed press at a weak spring) comes up slower, because the');
P('  hammer is sitting on the lever and rides down with it. A tight front bushing still holds the key down.');
P('- **S, strike speed for the same key motion.** The set-speed drive is the old one and the jack still simply drives the');
P('  hammer in it, so strikes are within a few percent (none is marked). The 3% they gain at 250 and 600 mm/s is the time');
P('  step: the Sim now always works in 0.1 ms steps, where the app used about 0.2 (the old Sim at 0.1 ms also gave 1.44).');
P('  The slowest press (60 mm/s) strikes at 0.22 where it struck at 0.26, because the hammer now falls at 76 rad/s²');
P('  (Hirschkorn\'s hammer) where it fell at 60, and at that speed it flies free for most of the stroke.');
P('- **C, check.** The backcheck\'s give was set so that the Strike and hold blow stopped at the backcheck\'s face. That blow');
P('  was the 250 mm/s press (1.4 m/s at the string); it is now the mf finger (2.2 m/s), so CHECK_GIVE went from 2.2 to');
P('  4.27 mm and the old, softer blow is now caught and held short of the face, about 1.7 mm higher. The mf column is the one');
P('  to read against the checking reading (14.29 mm, 9/16 in): the figure is where the backcheck holds the hammer once the');
P('  key is resting on its punching (at the catch itself a firm finger has the punching squashed and the hammer a few');
P('  tenths higher).');
P('  A soft catch that used to hold may now come back out (soft check), as it does in Murphy\'s bobble clips.');
P('- **J, where the jack resets.** The key now comes up in half the time or less, so the jack\'s button lets it go sooner');
P('  against a hammer that has had less time to move, and the jack itself takes time to swing home (about 9 ms on');
P('  Hirschkorn\'s spring and inertia; it was instant): the key is 8 to 10 points further up when it is back under.');
P('- **E, B, a different list of events or count of strikes.** The shallow-dip case is compared at its new size and with a');
P('  punching that squashes: a hard blow now lets off. A tight front bushing lets the key start up on the repetition');
P('  spring before friction holds it, so the check lets go and the jack resets before it sticks. Elsewhere the lists');
P('  match but for "rail": the hammer now comes home onto a key that is bouncing on its back rail cloth, and onto the rest');
P('  rail\'s felt, instead of stopping dead.');
P('- **K, the key stops on a jammed jack.** A jack pushed onto its stop felt in the lever\'s window now stops the key there');
P('  (critique BE-12), short of the front punching.');
P('');
P('## What each case does to touch, key return and repetition (after only: none of this existed)');
P('');
P('| Case | downweight g | upweight g | through let-off g | key up after mf, ms | jack reset | repeats to, half release | full release | pp blow | ff blow |');
P('|---|---|---|---|---|---|---|---|---|---|');
for (const c of A.cases) {
  const k = c.keyReturn, r = c.runs;
  P(`| ${c.name} | ${f(c.touch.down, 0)} | ${c.touch.up != null && c.touch.up <= 0 ? 'none' : f(c.touch.up, 0)} | ${f(c.touch.peak, 0)} | ${k.stuck ? 'stays down' : f(k.keyMs, 0)} | ${pct(k.resetUp)} | ${c.repeat.half} | ${c.repeat.full} | ${short(r.pp.order)} (${strikes(r.pp)}) | ${short(r.ff.order)} (${strikes(r.ff)}) |`);
}
P('');
fs.writeFileSync(out, lines.join('\n'));
console.log(`wrote ${out}`);
