// The exam's mark, worked out from its score sheet (GT-02). Runs in Node too.
// The sheet is one row per check, a cell per note ({ ok, skip }: skip marks a check not scored on that note), and the
// evenness lines ({ ok }). The mark is the share of scored items that pass, as before, with two caps below the pass
// mark: a damaged part left in the action, and an operation left out. An operation counts as done when its check is in
// tolerance on at least OP_NEEDS of the notes it is scored on (every one, when it is scored on fewer): let-off never
// touched, or drop, or the hammers never spaced, fails the exam however good the rest is. Before this rule a model with
// let-off and drop untouched on all three notes passed at 86%.
export const PASS = 80, CAP = 79, OP_NEEDS = 2;

// the checks whose operation was left out: in tolerance on too few notes
export function skippedOps(rows) {
  return rows.filter(r => {
    const scored = r.cells.filter(c => !c.skip);
    return scored.length && scored.filter(c => c.ok).length < Math.min(OP_NEEDS, scored.length);
  }).map(r => r.id);
}

export function examMark(rows, even, { missed = false } = {}) {
  const items = rows.flatMap(r => r.cells.filter(c => !c.skip).map(c => c.ok)).concat(even.map(e => e.ok));
  const raw = Math.round(100 * items.filter(Boolean).length / items.length);
  const skipped = skippedOps(rows);
  const pct = missed || skipped.length ? Math.min(raw, CAP) : raw;
  return { pct, raw, skipped, pass: pct >= PASS };
}
