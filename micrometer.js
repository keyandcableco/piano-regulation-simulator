// The micrometer at the bench: repinning an action center starts by measuring the old pin, and the new one is picked off
// a size chart by that reading. The part that needs no screen: the pin sizes, what a 0-1 inch outside micrometer shows
// for a reading, how a typed reading is understood, how far off a call was, and which new pin a center wants. Runs in
// Node. repin.js draws the micrometer and walks through the job.
//
// How a .001" outside micrometer reads (Precision Graphic Instruments, "How to read an outside micrometer"): the sleeve's
// numbered lines are tenths of an inch (.100", .200" ...), each tenth split in four lines of .025"; the thimble has 25
// lines of .001" round it, and one turn of it moves the spindle .025", the sleeve's smallest division (40 threads to the
// inch). Close it on the work with the ratchet "until the spindle closes down and stops moving", then add up the last
// numbered line showing on the sleeve, the .025" lines showing past it, and the thimble line on the sleeve's index line.

export const PITCH = 0.025;       // in per turn of the thimble
export const THIMBLE_LINES = 25;  // .001" each
export const MIC_OPEN = 0.15;     // the widest the bench's micrometer is drawn open, in: room enough for any center pin

// Center pins, 3/4" long, nickel silver: Steve's Piano Service chart (stevespianoservice.com, "Center pins"), size and
// decimal diameter as printed. "Mic your old pin, find the thousandths of inch size on the right column." Each half size
// is a thousandth bigger up to size 23; past it the steps grow.
export const PIN_SIZES = [
  ['18', 0.046], ['18-1/2', 0.047], ['19', 0.048], ['19-1/2', 0.049], ['20', 0.050], ['20-1/2', 0.051], ['21', 0.052],
  ['21-1/2', 0.053], ['22', 0.054], ['22-1/2', 0.055], ['23', 0.056], ['23-1/2', 0.0575], ['24', 0.059], ['24-1/2', 0.061],
  ['25', 0.063], ['26', 0.066],
].map(([size, d]) => ({ size, d }));
// The pin that comes out of a center needing a repin: which size the action was pinned with is the sim's own pick (no
// source gives the Boston's), from the middle of the chart, a size either side of fifty thousandths so that the sleeve
// sometimes shows one .025" line and sometimes two. A real pin reads a hair over its size as often as not: up to 3
// ten-thousandths here, never under, so the nearest thimble line is always its size and never a line short of a turn.
export const OLD_PINS = ['19', '19-1/2', '20', '20-1/2', '21', '21-1/2'];
export function oldPin(rand = Math.random) {
  const size = OLD_PINS[Math.floor(rand() * OLD_PINS.length)], i = PIN_SIZES.findIndex(p => p.size === size);
  return { i, d: PIN_SIZES[i].d + Math.floor(rand() * 4) / 10000 };
}
export const sizeIndex = d => PIN_SIZES.reduce((b, p, i) => Math.abs(p.d - d) < Math.abs(PIN_SIZES[b].d - d) ? i : b, 0);

// What the micrometer shows at a reading r (in): the last numbered line on the sleeve, how many .025" lines show past
// it, the thimble line nearest the index line, and the reading those add up to, to the nearest thousandth
export function micParts(r) {
  const thou = Math.round(r * 1000);
  return { numbered: Math.floor(thou / 100), lines: Math.floor(thou % 100 / 25), thimble: thou % 25, total: thou / 1000 };
}
// a reading as a technician writes it: .050", or .0575" where it takes the half
export const inch = v => `${v.toFixed(Math.abs(v * 1000 - Math.round(v * 1000)) > 1e-6 ? 4 : 3).replace(/^0\./, '.')}"`;
// and said aloud: "fifty thousandths"
export const thou = v => `${+(v * 1000).toFixed(1)} thousandths`;

// What the student typed, in inches, or null. A decimal is inches (.050, 0.05, .050"); a whole number is thousandths,
// as it is said (50, or 50 thou); millimetres only with their unit (1.27 mm). { v, as: 'in' | 'thou' | 'mm' }
export function parseMic(text) {
  let s = String(text ?? '').trim().toLowerCase().replace(/[”″]/g, '"').replace(/,/g, '.');
  let as = null;
  const unit = /\s*(mm|millimet(?:er|re)s?|thou|thousandths?|mils?|inch(?:es)?|in\.?|")$/.exec(s);
  if (unit) { as = unit[1].startsWith('m') && !unit[1].startsWith('mil') ? 'mm' : /^(thou|mil)/.test(unit[1]) ? 'thou' : 'in'; s = s.slice(0, unit.index).trim(); }
  if (!/^\d*\.?\d+$|^\d+\.$/.test(s)) return null;
  const n = +s;
  if (!Number.isFinite(n)) return null;
  if (!as) as = s.includes('.') ? 'in' : 'thou';
  const v = as === 'mm' ? n / 25.4 : as === 'thou' ? n / 1000 : n;
  return v > 1 ? null : { v, as };   // nothing on a 0-1" micrometer reads more than an inch
}

// How a call compares with what the micrometer shows. ok: on the nearest thimble line (a hair either side is the same
// call). Otherwise why, as far as it can be told: a whole turn or more out (the sleeve's lines miscounted), a decimal
// place out, a thimble line misread, or nowhere near.
export function judgeMic(said, shown) {
  const off = said - shown;
  if (Math.abs(off) <= 0.0006) return { ok: true, off };
  if (Math.abs(said * 10 - shown) <= 0.0006 || Math.abs(said / 10 - shown) <= 0.0006) return { ok: false, off, why: 'decimal' };
  const turns = Math.round(off / PITCH);
  if (turns && Math.abs(turns) <= 4 && Math.abs(off - turns * PITCH) <= 0.0015) return { ok: false, off, why: Math.abs(turns) === 4 ? 'tenth' : 'turn', turns };
  if (Math.abs(off) < PITCH / 2) return { ok: false, off, why: 'thimble', lines: Math.round(off * 1000) };
  return { ok: false, off, why: 'far' };
}

// Which new pin a center wants, by kind of fault (research/wippen/spec.md §8.3; app.js CENTER_FIXES): a loose center in
// sound cloth takes the next half size up. A tight one that is repinned keeps its size: the pin must be tight in the
// wood, and the bushing is reamed to it (David A. Vanderhoofven, RPT, Mechanical Music Digest 2001.01.16: "If you can
// push the center pin through the hole using your finger, the pin is not large enough"; "choose the appropriate straight
// reamer and size the bushing ... until the friction is correct"). A worn bushing is pinned like a loose one; the
// wobble it leaves is the lesson (app.js says so after). Returns { ok, text }.
export function pickPin(kind, oldI, newI) {
  const step = newI - oldI;
  const old = PIN_SIZES[oldI], pick = PIN_SIZES[newI];
  const name = `Size ${pick.size} (${inch(pick.d)})`;
  if (kind === 'tight') {
    if (step === 0) return { ok: true, text: `${name}, a new polished pin the size of the old one: tight in the wood, and the bushing reamed to it.` };
    if (step < 0) return { ok: false, text: `${name} is smaller than the pin that came out, so it would be looser in the wood, and the pin has to be tight there: David Vanderhoofven, RPT: if you can push it through with your finger, it is not large enough. Keep the size and ream the bushing.` };
    return { ok: false, text: `${name} is bigger than the pin that came out: it would make a tight center tighter, with more cloth to ream away. Keep the size and ream the bushing to the new pin.` };
  }
  if (step === 1) return { ok: true, text: `${name}: the next half size up from the ${old.size} that came out.` };
  if (step === 0) return { ok: false, text: `${name} is the size that came out: in the same cloth it would be just as loose. Go up.` };
  if (step < 0) return { ok: false, text: `${name} is smaller than the pin that came out: it would be looser still.` };
  return { ok: false, text: `${name} is more than a half size up: try the next half size first. The bigger the pin, the more cloth the reamer has to take out before it turns freely.` };
}
