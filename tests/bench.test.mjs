// The bench record's logic (bench.js, WCI-13): the undo list, a regulation as its difference from factory, the code a
// regulation or a teacher's fault travels as, and the saves kept in the browser.
// node --test tests/bench.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { History, diffAdj, applyDiff, encodeState, decodeState, codeFrom, HASH, MAX_TEXT, listSaves, addSave, removeSave } from '../bench.js';
import { FACTORY, ADJ, DAMAGE, BUSHINGS, CENTER_FAULTS, measure } from '../model.js';
import * as U from '../upright-model.js';

const GRAND = { factory: FACTORY, limits: { ...Object.fromEntries(ADJ.map(d => [d.id, [d.min, d.max]])), wear: [0, 1] },
  enums: { damage: Object.keys(DAMAGE), bushing: Object.keys(BUSHINGS), center: Object.keys(CENTER_FAULTS) } };
const UPRIGHT = { factory: U.FACTORY, limits: Object.fromEntries(U.ADJ.map(d => [d.id, [d.min, d.max]])), enums: { damage: Object.keys(U.DAMAGE) } };

test('undo and redo walk the list of states; a new change drops what was undone', () => {
  const h = new History();
  assert.ok(!h.canUndo && !h.canRedo && h.undo() === null);
  h.reset({ v: 0 });
  assert.equal(h.note({ v: 0 }), false, 'the same state again is not a change');
  for (const v of [1, 2, 3]) assert.equal(h.note({ v }), true);
  assert.equal(h.steps, 3);
  assert.deepEqual(h.undo(), { v: 2 }); assert.deepEqual(h.undo(), { v: 1 });
  assert.ok(h.canUndo && h.canRedo);
  assert.deepEqual(h.redo(), { v: 2 });
  assert.equal(h.note({ v: 2 }), false, 'putting an undone state in force is not a new change');
  h.note({ v: 9 });
  assert.ok(!h.canRedo, 'a new change after an undo drops the redo');
  assert.deepEqual([h.undo(), h.undo(), h.undo(), h.undo()], [{ v: 2 }, { v: 1 }, { v: 0 }, null]);
  assert.deepEqual(h.first(), { v: 0 });
  h.reset({ v: 5 }); assert.ok(!h.canUndo && !h.canRedo);
});

test('the undo list is bounded, and keeps the newest states', () => {
  const h = new History(10); h.reset(0);
  for (let i = 1; i <= 25; i++) h.note(i);
  let n = 0, last; for (let s = h.undo(); s !== null; s = h.undo()) { n++; last = s; }
  assert.equal(n, 9); assert.equal(last, 16);
});

test('a regulation round-trips as its difference from factory, grand and upright', () => {
  assert.deepEqual(diffAdj(FACTORY, GRAND), {}); assert.deepEqual(applyDiff({}, GRAND), FACTORY);
  const a = { ...FACTORY, letoff: FACTORY.letoff - 1, hammerSquare: 2.5, damperDrag: 0.5, wear: 0.8, damage: 'splitShank', center: 'jackTight', bushing: null };
  const d = diffAdj(a, GRAND), back = applyDiff(d, GRAND);
  assert.deepEqual(Object.keys(d).sort(), ['center', 'damage', 'damperDrag', 'hammerSquare', 'letoff', 'wear']);
  for (const k of Object.keys(FACTORY)) assert.ok(Math.abs(back[k] - a[k]) < 1e-4, k);
  assert.equal(back.damage, 'splitShank'); assert.equal(back.center, 'jackTight'); assert.equal(back.wear, 0.8); assert.ok(!('bushing' in back));
  // the readings come back the same
  const m1 = measure(a), m2 = measure(back);
  for (const k of ['letoff', 'drop', 'blow', 'aftertouch', 'hammerSquare']) assert.ok(Math.abs(m1[k] - m2[k]) < 1e-3, `${k}: ${m1[k]} against ${m2[k]}`);
  const u = { ...U.FACTORY, capstan: U.FACTORY.capstan + 0.1, damage: Object.keys(U.DAMAGE)[0] };
  assert.deepEqual(applyDiff(diffAdj(u, UPRIGHT), UPRIGHT), u);
});

test('a code from outside can\'t put the model where a knob couldn\'t', () => {
  const a = applyDiff({ letoff: 1e9, drop: -1e9, capstan: 'high', wear: 7, damage: 'meltedHammer', center: 42, __proto__: { x: 1 }, madeUp: 3, repSpring: NaN, balPunch: Infinity }, GRAND);
  const lim = id => ADJ.find(d => d.id === id);
  assert.equal(a.letoff, lim('letoff').max); assert.equal(a.drop, lim('drop').min);
  assert.equal(a.capstan, FACTORY.capstan); assert.equal(a.repSpring, FACTORY.repSpring); assert.equal(a.balPunch, FACTORY.balPunch);
  assert.equal(a.wear, 1); assert.ok(!('damage' in a) && !('center' in a) && !('madeUp' in a));
  assert.deepEqual(applyDiff(null, GRAND), FACTORY); assert.deepEqual(applyDiff('x', GRAND), FACTORY);
});

test('the code: a state goes in and comes out, three notes and long words too', () => {
  const diff = diffAdj({ ...FACTORY, drop: FACTORY.drop + 2, center: 'repTight' }, GRAND);
  const save = { k: 'save', a: 'grand', n: [diff, {}, { letoff: -0.5 }] };
  assert.deepEqual(decodeState(encodeState(save)), { ...save, c: '', w: '' });
  const fault = { k: 'fault', a: 'upright', n: [{ capstan: 0.1 }], c: 'It “clicks”, naïvely — ♪', w: 'x'.repeat(MAX_TEXT + 50) };
  const back = decodeState(encodeState(fault));
  assert.equal(back.c, fault.c); assert.equal(back.w.length, MAX_TEXT); assert.deepEqual(back.n, fault.n);
  assert.match(encodeState(fault), /^1[A-Za-z0-9_-]+$/, 'safe in an address as it is');
});

test('the answer can\'t be read off the code, and a damaged code is refused', () => {
  const code = encodeState({ k: 'fault', a: 'grand', n: [{ drop: 2 }], c: 'Soft notes buzz', w: 'Drop screw too high' });
  let plain = ''; try { plain = Buffer.from(code.slice(1), 'base64url').toString('latin1'); } catch {}
  for (const s of [code, plain]) assert.ok(!/drop|buzz|fault|Soft/i.test(s), 'neither the code nor its plain base64 shows the words');
  const two = encodeState({ k: 'fault', a: 'grand', n: [{ drop: 2 }], c: 'Soft notes buzz', w: 'Drop screw too high' });
  assert.equal(code, two, 'the same fault gives the same link (a class gets one address)');
  for (const bad of ['', '1', 'hello', '2' + code.slice(1), code.slice(0, -3), code.slice(0, 10) + (code[10] === 'A' ? 'B' : 'A') + code.slice(11), code + '!!', null, 42, '1' + 'A'.repeat(20000)])
    assert.equal(decodeState(bad), null, `refused: ${String(bad).slice(0, 24)}`);
  // well-formed but not a state this page knows
  for (const st of [{ k: 'other', a: 'grand', n: [{}] }, { k: 'save', a: 'harp', n: [{}] }, { k: 'save', a: 'grand', n: [] }, { k: 'save', a: 'grand', n: [{}, {}] }, { k: 'save', a: 'grand', n: [[1]] }, { k: 'save', a: 'grand' }])
    assert.equal(decodeState(encodeState(st)), null);
});

test('a link or a bare code, as it is pasted', () => {
  const code = encodeState({ k: 'save', a: 'grand', n: [{}] });
  assert.equal(codeFrom(`https://regulation.keyandcable.com/${HASH}${code}`), code);
  assert.equal(codeFrom(`  ${code}\n`), code); assert.equal(codeFrom(`${HASH}${code}`), code);
  assert.equal(codeFrom(null), '');
});

test('saves in the browser: newest first, a name replaces itself, junk is dropped, and a browser without storage is survived', () => {
  const mem = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => { m.set(k, String(v)); } }; };
  const s = mem(), code = encodeState({ k: 'save', a: 'grand', n: [{ letoff: -1 }] }), code2 = encodeState({ k: 'save', a: 'grand', n: [{ drop: 1 }] });
  assert.deepEqual(listSaves(s), []);
  addSave(s, 'first', code, 1); addSave(s, '  second ', code2, 2); addSave(s, 'first', code2, 3);
  assert.deepEqual(listSaves(s).map(x => [x.name, x.code === code2]), [['first', true], ['second', true]]);
  assert.deepEqual(removeSave(s, 'first').map(x => x.name), ['second']);
  for (let i = 0; i < 30; i++) addSave(s, `n${i}`, code, i);
  assert.equal(listSaves(s).length, 20); assert.equal(listSaves(s)[0].name, 'n29');
  s.setItem('regsim-saves', '{not json'); assert.deepEqual(listSaves(s), []);
  s.setItem('regsim-saves', JSON.stringify([{ name: 'ok', code }, { name: 'bad', code: 'zzz' }, null, 7])); assert.deepEqual(listSaves(s).map(x => x.name), ['ok']);
  const refuses = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  assert.deepEqual(listSaves(refuses), []); assert.equal(addSave(refuses, 'x', code), null); assert.equal(removeSave(refuses, 'x'), null);
});
