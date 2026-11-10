// Gauges laid on the action, read by the student (WCI-05, BE-13). The part that needs no screen: what each gauge
// measures and asks, how a rule is graduated, how a typed reading is understood, and how far off it was. Runs in Node.
// app.js lays the rule on the action (scene.js setGauge), waits for the reading, then shows the model's own figure.
const IN = 25.4;

// One rule serves all five, as one six-inch rule does on the bench: zero at the thing measured from, the scale running
// down from it, and a fine sight line carried across from the part being read.
//   from: what the rule's zero sits on; ask: the question; length: mm of scale drawn; views: the close-up it is read in
export const GAUGES = {
  blow: { name: 'Blow distance', test: 'blowGauge', at: 'hammer', length: 57.15, view: 'gblow',
    from: 'the underside of the string', ask: 'How far is the top of the hammer from the string?' },
  letoff: { name: 'Let-off', test: 'slowPress', at: 'hammer', length: 19.05, view: 'gstring',
    from: 'the underside of the string', ask: 'The jack is about to trip: this is as close as the hammer gets. How far is it from the string?' },
  drop: { name: 'Drop', test: 'slowPress', at: 'hammer', length: 19.05, view: 'gstring',
    from: 'the pencil line at the let-off height', ask: 'The jack has tripped and the hammer has dropped onto the repetition lever. How far below the let-off line is it?' },
  dip: { name: 'Key dip', test: 'dipBlock', at: 'key', length: 19.05, view: 'gkey',
    from: 'the key top\'s height at rest', ask: 'The key is on its front punching. How far down has its top gone?' },
  aftertouch: { name: 'Aftertouch', test: 'slowPress', at: 'key', length: 19.05, view: 'gkey',
    from: 'the pencil line where the key top was at let-off', ask: 'The key is at the bottom. How far has it gone since let-off?' },
};
export const GAUGED = Object.keys(GAUGES);

// The smallest graduation: a 64th of an inch, or half a millimetre
export const graduation = units => units === 'in' ? IN / 64 : 0.5;

// The rule's graduations over `length` mm from its zero: { at (mm from zero), rank (1 longest .. 0.3 shortest), label }
// Inches: 64ths, the lines longer at each coarser division, the eighths numbered. Millimetres: halves, each whole
// millimetre longer, the fives longer still and numbered.
export function ruleTicks(units, length) {
  const ticks = [];
  if (units === 'in') {
    const frac = n => { let d = 64; while (n % 2 === 0 && d > 1) { n /= 2; d /= 2; } return d === 1 ? String(n) : `${n}/${d}`; };
    for (let n = 0; n * IN / 64 <= length + 1e-9; n++) {
      const rank = n % 64 === 0 ? 1 : n % 32 === 0 ? 0.9 : n % 16 === 0 ? 0.8 : n % 8 === 0 ? 0.68 : n % 4 === 0 ? 0.56 : n % 2 === 0 ? 0.42 : 0.3;
      const whole = Math.floor(n / 64), rest = n % 64;
      ticks.push({ at: n * IN / 64, rank, label: n > 0 && n % 8 === 0 ? (whole ? whole + (rest ? ' ' : '') : '') + (rest ? frac(rest) : '') : null });
    }
  } else {
    for (let n = 0; n * 0.5 <= length + 1e-9; n++)
      ticks.push({ at: n * 0.5, rank: n % 20 === 0 ? 1 : n % 10 === 0 ? 0.8 : n % 2 === 0 ? 0.55 : 0.3, label: n > 0 && n % 10 === 0 ? String(n / 2) : null });
  }
  return ticks;
}

// What the student typed, in mm, or null when it can't be read. In inches: a fraction (3/64), a mixed number (1 3/4 or
// 1-3/4) or a decimal (.4 or 1.75), with or without the inch mark. In millimetres: a number (1.6 or 1,6). A unit typed
// after it (mm, in, ") is taken at its word whichever units are showing.
export function parseReading(text, units = 'in') {
  let s = String(text ?? '').trim().toLowerCase().replace(/[”″]/g, '"').replace(/[−–]/g, '-');
  let u = units;
  const unit = /\s*(mm|millimet(?:er|re)s?|inch(?:es)?|in\.?|")$/.exec(s);
  if (unit) { u = unit[1].startsWith('m') ? 'mm' : 'in'; s = s.slice(0, unit.index).trim(); }
  if (!s) return null;
  const num = t => /^\d*[.,]?\d+$|^\d+[.,]$/.test(t) ? +t.replace(',', '.') : NaN;
  let v;
  const mixed = /^(?:(\d+)[\s-]+)?(\d+)\s*\/\s*(\d+)$/.exec(s);
  if (mixed) v = +mixed[3] ? (+(mixed[1] || 0)) + (+mixed[2]) / (+mixed[3]) : NaN;
  else v = num(s);
  if (!Number.isFinite(v) || v < 0) return null;
  const mm = u === 'in' ? v * IN : v;
  return mm > 150 ? null : mm;   // nothing on this rule is six inches long
}

// How a call compares with the model's figure: off is signed mm (+: called too large); close when within one
// graduation of the rule it was read from; grads is how many graduations out, to the nearest half.
export function judgeReading(said, truth, units = 'in') {
  const off = said - truth, g = graduation(units);
  const q = v => Math.round(v * 100) / 100;   // compared as printed, to 0.01 mm: one line over is one graduation, not a hair more
  return { off, close: q(Math.abs(off)) <= q(g), grads: Math.round(Math.abs(off) / g * 2) / 2 };
}
