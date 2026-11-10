// The exam's mark (examscore.js, GT-02): an operation left out fails the exam however good the rest is. Before this
// rule a 3-note model with let-off and drop never touched passed at 86%.
// node --test tests/exam-score.test.mjs   (Node 22; a few seconds)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SPEC, FACTORY, measure, grade, band } from '../model.js';
import { examMark, skippedOps, PASS, CAP, OP_NEEDS } from '../examscore.js';

// the score sheet as app.js examScore() builds it for an exam without dampers or dealt damage
const EVEN = ['keyHeight', 'dip', 'blow', 'letoff', 'drop', 'check'];
const IDS = Object.keys(SPEC).filter(id => !SPEC[id].damper && !SPEC[id].noExam && id !== 'hammerSound');
function sheet(notes, k = 1) {
  const ms = notes.map(f => measure({ ...FACTORY, ...Object.fromEntries(Object.entries(f).map(([id, v]) => [id, FACTORY[id] + v])) }));
  const rows = IDS.map(id => ({ id, cells: ms.map(m => ({ ok: grade(id, m, k).ok })) }));
  const even = EVEN.map(id => {
    const v = ms.map(m => grade(id, m, k).v), [lo, hi] = band(id, 1);
    return { id, ok: v.every(x => x != null) && Math.max(...v) - Math.min(...v) <= (hi - lo) / 2 * k + 1e-9 };
  });
  return { rows, even };
}
const mark = (notes, k) => { const s = sheet(notes, k); return examMark(s.rows, s.even); };

test('the app scores the exam with this rule', () => {
  const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(app, /examMark\(rows, even, \{ missed \}\)/);
  assert.ok(CAP < PASS && OP_NEEDS === 2);
});

test('three regulated notes pass with full marks', () => {
  const r = mark([{}, {}, {}]);
  assert.deepEqual([r.pct, r.raw, r.skipped, r.pass], [100, 100, [], true]);
});

test('let-off never touched fails, though the items alone would pass', () => {
  for (const k of [1.5, 1, 0.75]) for (const off of [[-0.5, -0.5, -0.5], [-0.8, -0.3, 0.2], [-1, -0.6, -0.45]]) {
    const r = mark(off.map(letoff => ({ letoff })), k);
    assert.ok(r.raw >= PASS, `level ${k}, buttons ${off}: the items alone come to ${r.raw}%`);
    assert.ok(r.skipped.includes('letoff'), `level ${k}, buttons ${off}: skipped ${r.skipped}`);
    assert.ok(!r.pass && r.pct <= CAP, `level ${k}, buttons ${off}: ${r.pct}%`);
  }
});

test('drop never touched fails, though the items alone would pass', () => {
  for (const k of [1.5, 1, 0.75]) for (const off of [[1, 1, 1], [1.5, -1.2, 0.6], [-2, -0.7, 0.9]]) {
    const r = mark(off.map(drop => ({ drop })), k);
    assert.ok(r.raw >= PASS, `level ${k}, screws ${off}: the items alone come to ${r.raw}%`);
    assert.ok(r.skipped.includes('drop'), `level ${k}, screws ${off}: skipped ${r.skipped}`);
    assert.ok(!r.pass && r.pct <= CAP, `level ${k}, screws ${off}: ${r.pct}%`);
  }
});

test('let-off and drop both untouched (the critique\'s case) fails', () => {
  const r = mark([{ letoff: -0.8, drop: 1.5 }, { letoff: -0.3, drop: -1.2 }, { letoff: 0.2, drop: 0.6 }]);
  assert.ok(!r.pass && r.skipped.includes('letoff') && r.skipped.includes('drop'), JSON.stringify(r));
});

test('alignment left out fails too', () => {
  const r = mark([{ hammerSpace: 0.8 }, { hammerSpace: -0.7 }, { hammerSpace: 0.6 }]);
  assert.ok(!r.pass && r.skipped.includes('hammerSpacing'), JSON.stringify(r));
});

test('one note a little out is a lost item, not a skipped operation', () => {
  const r = mark([{ letoff: -0.5 }, {}, {}]);
  assert.ok(!r.skipped.includes('letoff'));
  assert.ok(r.pass && r.pct < 100, `${r.pct}%`);
});

test('a check scored on one note only (a dealt repair) needs that note', () => {
  const row = ok => [{ id: 'hammerSound', cells: [{ ok: true, skip: true }, { ok }, { ok: true, skip: true }] }];
  assert.deepEqual(skippedOps(row(false)), ['hammerSound']);
  assert.deepEqual(skippedOps(row(true)), []);
  assert.deepEqual(skippedOps([{ id: 'x', cells: [{ ok: false, skip: true }] }]), []);
});

test('a damaged part left in still caps the mark', () => {
  const s = sheet([{}, {}, {}]);
  assert.equal(examMark(s.rows, s.even, { missed: true }).pct, CAP);
});
