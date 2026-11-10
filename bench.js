// The bench record (WCI-13): the logic behind undo and redo, before and after, save and load, and a fault a teacher
// hands a student as a link. No DOM in here, so it runs in Node too (tests/bench.test.mjs); bench-ui.js draws it.
//
// A regulation travels as a short code: the adjustments that differ from the factory regulation, and for a fault the
// customer's complaint and the answer, as JSON, lightly scrambled and base64url'd. The scrambling only keeps the answer
// from being read off the address bar; it is not a secret.

// ---------- undo and redo ----------
// A list of states (anything JSON can hold) and a place in it. note() adds a state when it differs from the one at that
// place, dropping whatever had been undone; undo() and redo() step along it and hand back the state to put in force.
export class History {
  constructor(max = 100) { this.max = max; this.reset(null); }
  reset(state) { this.list = state == null ? [] : [JSON.stringify(state)]; this.at = this.list.length - 1; }
  // true when the state was new (so a caller can tell a change from a redraw)
  note(state) {
    const s = JSON.stringify(state);
    if (this.at >= 0 && this.list[this.at] === s) return false;
    this.list.length = this.at + 1; this.list.push(s);
    if (this.list.length > this.max) this.list.shift();
    this.at = this.list.length - 1;
    return true;
  }
  get canUndo() { return this.at > 0; }
  get canRedo() { return this.at < this.list.length - 1; }
  get steps() { return Math.max(0, this.at); }
  undo() { return this.canUndo ? JSON.parse(this.list[--this.at]) : null; }
  redo() { return this.canRedo ? JSON.parse(this.list[++this.at]) : null; }
  // the first state: where the work started
  first() { return this.list.length ? JSON.parse(this.list[0]) : null; }
}

// ---------- a regulation as the difference from factory ----------
// rules: { factory, limits: { id: [min, max] }, enums: { id: [allowed strings] } }. Only ids the rules name survive, numbers
// are clamped to their limits and strings must be on their list, so a code typed in or followed from a link can't put
// the model anywhere a knob couldn't.
const r4 = v => Math.round(v * 1e4) / 1e4;
export function diffAdj(adj, rules) {
  const d = {};
  for (const id of Object.keys(rules.limits)) {
    const v = adj[id], f = rules.factory[id] ?? 0;
    if (typeof v === 'number' && Number.isFinite(v) && Math.abs(v - f) > 5e-5) d[id] = r4(v - f);
  }
  for (const id of Object.keys(rules.enums)) if (typeof adj[id] === 'string' && rules.enums[id].includes(adj[id])) d[id] = adj[id];
  return d;
}
export function applyDiff(diff, rules) {
  const a = { ...rules.factory };
  if (!diff || typeof diff !== 'object') return a;
  for (const [id, [lo, hi]] of Object.entries(rules.limits)) {
    const v = diff[id];
    if (typeof v === 'number' && Number.isFinite(v)) a[id] = Math.max(lo, Math.min(hi, r4((rules.factory[id] ?? 0) + v)));
  }
  for (const [id, list] of Object.entries(rules.enums)) if (typeof diff[id] === 'string' && list.includes(diff[id])) a[id] = diff[id];
  return a;
}

// ---------- the code ----------
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
function toB64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = bytes[i] << 16 | (bytes[i + 1] ?? 0) << 8 | (bytes[i + 2] ?? 0);
    s += B64[n >> 18 & 63] + B64[n >> 12 & 63] + (i + 1 < bytes.length ? B64[n >> 6 & 63] : '') + (i + 2 < bytes.length ? B64[n & 63] : '');
  }
  return s;
}
function fromB64(s) {
  if (/[^A-Za-z0-9_-]/.test(s) || s.length % 4 === 1) return null;
  const out = [];
  for (let i = 0; i < s.length; i += 4) {
    const c = [0, 1, 2, 3].map(j => i + j < s.length ? B64.indexOf(s[i + j]) : 0), n = c[0] << 18 | c[1] << 12 | c[2] << 6 | c[3];
    out.push(n >> 16 & 255); if (i + 2 < s.length) out.push(n >> 8 & 255); if (i + 3 < s.length) out.push(n & 255);
  }
  return Uint8Array.from(out);
}
// a fixed stream of bytes to mix in (a small generator, the same every time): scrambling, not secrecy
function mix(bytes) {
  let x = 0x5eed1e;
  return bytes.map(b => { x = (Math.imul(x, 1103515245) + 12345) >>> 0; return b ^ (x >>> 16 & 255); });
}
const sum = bytes => bytes.reduce((s, b) => (s * 31 + b) & 255, 7);
const VERSION = '1';
export const MAX_TEXT = 1600, MAX_CODE = 20000;   // (two full texts in a script of three bytes a letter, as base64, fit)
// state: { k: 'save' | 'fault', a: 'grand' | 'upright', n: [diff, ...] (one note or three), c: complaint, w: what was wrong,
//          s: spec set, when it isn't the generic one }
export function encodeState(state) {
  const bytes = new TextEncoder().encode(JSON.stringify(state));
  return VERSION + toB64(mix(Uint8Array.from([...bytes, sum(bytes)])));
}
// null for anything that isn't a code this page made (a typo, a cut-off link, another version)
export function decodeState(code) {
  if (typeof code !== 'string' || code.length < 4 || code.length > MAX_CODE || code[0] !== VERSION) return null;
  const raw = fromB64(code.slice(1).trim());
  if (!raw || raw.length < 2) return null;
  const all = mix(raw), bytes = all.slice(0, -1);
  if (sum(bytes) !== all[all.length - 1]) return null;
  let st;
  try { st = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); } catch { return null; }
  if (!st || typeof st !== 'object' || !['save', 'fault'].includes(st.k) || !['grand', 'upright'].includes(st.a)) return null;
  if (!Array.isArray(st.n) || ![1, 3].includes(st.n.length) || st.n.some(d => !d || typeof d !== 'object' || Array.isArray(d))) return null;
  const text = v => typeof v === 'string' ? v.slice(0, MAX_TEXT) : '';
  // s: the spec set the action was regulated against (a diff is taken from that set's regulated key); none is the generic set
  return { k: st.k, a: st.a, n: st.n, c: text(st.c), w: text(st.w), s: typeof st.s === 'string' ? st.s.slice(0, 24) : '' };
}
// the code in an address (…#r=CODE), and an address or a bare code as someone pastes it
export const HASH = '#r=';
export const codeFrom = text => { const t = String(text ?? '').trim(), i = t.indexOf(HASH); return i >= 0 ? t.slice(i + HASH.length).split(/[&\s]/)[0] : t; };

// ---------- saves kept in the browser ----------
// store: anything with getItem and setItem (localStorage); every access is guarded, so a browser that refuses storage
// just has no saved list
const KEY = 'regsim-saves', MAX_SAVES = 20;
export function listSaves(store) {
  try {
    const v = JSON.parse(store.getItem(KEY) || '[]');
    return Array.isArray(v) ? v.filter(s => s && typeof s.name === 'string' && typeof s.code === 'string' && decodeState(s.code)).slice(0, MAX_SAVES) : [];
  } catch { return []; }
}
// newest first; a save under a name already there replaces it. Returns the new list, or null if it couldn't be kept.
export function addSave(store, name, code, when = Date.now()) {
  const clean = String(name).trim().slice(0, 60) || 'Unnamed';
  const list = [{ name: clean, code, when }, ...listSaves(store).filter(s => s.name !== clean)].slice(0, MAX_SAVES);
  try { store.setItem(KEY, JSON.stringify(list)); return list; } catch { return null; }
}
export function removeSave(store, name) {
  const list = listSaves(store).filter(s => s.name !== name);
  try { store.setItem(KEY, JSON.stringify(list)); return list; } catch { return null; }
}
