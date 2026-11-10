// The bench bar under the tabs (WCI-13): Undo and Redo, Before / after, Save / load (this browser, a link, a fault set
// up for a student) and Print. It works on whichever action is showing through that action's adapter (app.js for the
// grand, upright-app.js for the upright); the logic that needs no page is in bench.js.
//
// An adapter:
//   name                'grand' | 'upright'
//   can()               { edit, print }: whether the regulation can be changed just now, and whether there is one to print
//   context()           a key for the piece of work in hand (this Learn key, this customer, this exam): a new key starts
//                       the undo list afresh, and "before" is the state the work under a key was first seen in
//   snap() / restore(s) the regulation as plain data, and putting one back (false if it couldn't just now)
//   rules               bench.js diffAdj/applyDiff rules for one note
//   notes(s)            the notes of a snapshot worth saving: one, or three
//   fault()             { c, w }: the complaint and the answer, when the work in hand is a Find-the-fault case; else null
//   draft(s)            words for what differs from factory, to start a teacher's answer from
//   open(state)         load { k, notes: [adj...], c, w } (a save into the Sandbox, a fault into Find the fault); false if it couldn't
//   readings(s)         [{ name, target, txt, ok, shown }] for the note being worked on, as it reads in state s
//   record()            { title, meta: [text...], tables: [{ caption, head: [..], rows: [[text | { txt, ok }...]] }], copy: element }
import { History, diffAdj, applyDiff, encodeState, decodeState, codeFrom, HASH, MAX_TEXT, listSaves, addSave, removeSave } from './bench.js';

export function mountBench({ el, toast, adapter, refresh }) {
  const $ = s => document.querySelector(s);
  const bar = $('#benchbar'), panel = $('#benchpanel'), sheet = $('#printout');
  const B = { undo: $('#b-undo'), redo: $('#b-redo'), compare: $('#b-compare'), save: $('#b-save'), print: $('#b-print') };
  const per = {};   // by adapter name: { hist, ctx, bases: context -> { state, at } }
  const mine = A => per[A.name] ??= { hist: new History(), ctx: null, bases: new Map() };
  let open = null;   // 'compare' | 'save' | null
  let movedOnly = true;   // Before / after lists only the readings that moved, until asked for them all
  let store = null;
  try { store = window.localStorage; store.getItem('regsim-saves'); } catch { store = null; }
  const mark = ok => el('span', { class: 'mark ' + (ok === null ? 'none' : ok ? 'ok' : 'bad'), role: 'img', 'aria-label': ok === null ? 'not measured' : ok ? 'in spec' : 'out of spec' }, ok === null ? '○' : ok ? '✓' : '✗');

  // ---------- keeping up with the work: called on every redraw of the panel ----------
  function sync() {
    const A = adapter();
    if (!A) { bar.hidden = true; panel.hidden = true; return; }
    const c = A.can(), P = mine(A);
    bar.hidden = !c.edit && !c.print;
    if (c.edit || c.print) {
      const ctx = A.context(), s = A.snap();
      if (ctx !== P.ctx) { P.ctx = ctx; P.hist.reset(s); if (!P.bases.has(ctx)) P.bases.set(ctx, { state: s, at: Date.now() }); }
      else P.hist.note(s);
      // what has been measured while the action still stands as it did at "before"
      const base = P.bases.get(P.ctx);
      if (A.blind?.() && base && JSON.stringify(base.state) === JSON.stringify(s)) { base.seen ??= new Set(); for (const r of A.readings(s)) if (r.shown) base.seen.add(r.name); }
    }
    B.undo.disabled = !c.edit || !P.hist.canUndo; B.redo.disabled = !c.edit || !P.hist.canRedo;
    B.compare.disabled = B.save.disabled = !c.edit; B.print.disabled = !c.print;
    if (!c.edit) open = null;
    for (const k of ['compare', 'save']) { B[k].classList.toggle('on', open === k); B[k].setAttribute('aria-expanded', String(open === k)); }
    draw();
  }
  function step(way) {
    const A = adapter(), P = A && mine(A);
    if (!A || !A.can().edit) return;
    const s = way < 0 ? P.hist.undo() : P.hist.redo();
    if (!s) return;
    if (A.restore(s) === false) { way < 0 ? P.hist.redo() : P.hist.undo(); toast('Not while a test is running', 'warn'); return; }
    toast(way < 0 ? 'Undone: the last change is taken back' : 'Redone');
  }
  B.undo.onclick = () => step(-1); B.redo.onclick = () => step(+1);
  window.addEventListener('keydown', e => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey || /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
    const k = e.key.toLowerCase();
    if (k === 'z') { e.preventDefault(); step(e.shiftKey ? +1 : -1); } else if (k === 'y') { e.preventDefault(); step(+1); }
  });
  for (const k of ['compare', 'save']) B[k].onclick = () => { open = open === k ? null : k; linkBox = null; refresh(); if (open) panel.scrollIntoView({ block: 'nearest' }); };

  // ---------- the panel under the bar ----------
  let linkBox = null;   // { text, note }: a link just made, shown to copy by hand as well
  // what has been typed in the panel's fields, kept while the panel redraws; the answer is drafted from the adjustments
  // until the teacher writes their own
  let draftFor = null, complaint = '', answer = '', answerMine = false, nameVal = '', codeVal = '';
  function draw() {
    const A = adapter();
    panel.hidden = !open || !A;
    if (panel.hidden) { panel.replaceChildren(); return; }
    // a field being typed in keeps the keyboard through a redraw
    const at = panel.contains(document.activeElement) ? document.activeElement : null, label = at?.getAttribute('aria-label'), sel = at && 'selectionStart' in at ? [at.selectionStart, at.selectionEnd] : null;
    panel.replaceChildren(...(open === 'compare' ? compare(A) : saving(A)).flat().filter(Boolean));
    const again = label && [...panel.querySelectorAll('[aria-label]')].find(x => x.getAttribute('aria-label') === label);
    if (again) { again.focus(); if (sel) try { again.setSelectionRange(...sel); } catch {} }
  }
  const time = t => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  function compare(A) {
    const P = mine(A), base = P.bases.get(P.ctx), now = A.readings(A.snap()), was = A.readings(base.state);
    const same = JSON.stringify(base.state) === JSON.stringify(A.snap());
    // (where readings have to be measured, a "before" figure shows only if it was measured before the work began)
    if (A.blind?.()) was.forEach(r => { r.shown &&= !!base.seen?.has(r.name); });
    const cell = r => el('td', { class: r.shown ? (r.ok ? 'okc' : 'badc') : 'muted' }, r.shown ? [mark(r.ok), r.txt] : 'not measured');
    const moved = i => now[i].shown && was[i].txt !== now[i].txt, any = now.some((r, i) => moved(i)), rows = now.map((r, i) => i).filter(i => !movedOnly || !any || moved(i));
    return [
      el('div', { class: 'knob-head' }, el('b', {}, 'Before and after'), el('span', { class: 'muted small' }, `before: as it stood at ${time(base.at)}`)),
      same ? el('p', { class: 'muted small' }, 'Nothing has been changed since then. Adjust something and the two columns part.') : null,
      el('table', { class: 'specs compare' },
        el('thead', {}, el('tr', {}, el('th', {}, 'Check'), el('th', {}, 'Before'), el('th', {}, 'Now'))),
        el('tbody', {}, rows.map(i => el('tr', { class: moved(i) ? 'moved' : '' }, el('td', {}, now[i].name), cell(was[i]), cell(now[i]))))),
      any ? el('label', { class: 'row small' }, el('input', { type: 'checkbox', checked: movedOnly ? '' : false, onchange: e => { movedOnly = e.target.checked; refresh(); } }), ' Only the readings that moved') : null,
      el('p', { class: 'muted small' }, 'A reading shows here once you have measured it, as in the rest of the panel. Rows in bold have moved.'),
      el('div', { class: 'row' },
        el('button', { disabled: same ? '' : false, onclick: () => { if (A.restore(base.state) !== false) toast('Back as it was before. Undo brings your work back'); } }, 'Put it back as it was'),
        el('button', { disabled: same ? '' : false, onclick: () => { P.bases.set(P.ctx, { state: A.snap(), at: Date.now(), seen: new Set(now.filter(r => r.shown).map(r => r.name)) }); refresh(); } }, 'Call this the new "before"'))];
  }
  // the state in hand as a code: a fault stays a fault (its complaint and answer travel with it)
  function codeNow(A, asFault = null) {
    const s = A.snap(), f = asFault ?? A.fault();
    return encodeState({ k: f ? 'fault' : 'save', a: A.name, ...(A.set && A.set() !== 'generic' ? { s: A.set() } : {}), n: A.notes(s).map(a => diffAdj(a, A.rules)), ...(f ? { c: f.c.slice(0, MAX_TEXT), w: f.w.slice(0, MAX_TEXT) } : {}) });
  }
  const linkOf = code => location.origin + location.pathname + location.search + HASH + code;
  async function copy(text, note) {
    linkBox = { text, note };
    try { await navigator.clipboard.writeText(text); toast('Link copied'); } catch { toast('Copy the link from the box'); }
    refresh();
    panel.querySelector('.linkbox')?.select?.();
  }
  function saving(A) {
    const saves = store ? listSaves(store).filter(s => decodeState(s.code)?.a === A.name) : [], fault = A.fault();
    const name = el('input', { type: 'text', class: 'benchin', maxlength: 60, placeholder: 'a name for it', 'aria-label': 'Name for this save', value: nameVal, oninput: e => { nameVal = e.target.value; } });
    const code = el('input', { type: 'text', class: 'benchin', placeholder: 'paste a link or code', 'aria-label': 'A link or code to load', value: codeVal, oninput: e => { codeVal = e.target.value; } });
    const snapKey = A.name + JSON.stringify(A.snap());
    if (draftFor !== snapKey) { draftFor = snapKey; if (!answerMine) answer = A.draft(A.snap()); complaint ||= 'Something isn\'t right with this key. Find what is out and put it right.'; }
    const cIn = el('textarea', { class: 'benchin', rows: 2, maxlength: MAX_TEXT, 'aria-label': 'What the customer says', oninput: e => { complaint = e.target.value; } }, complaint);
    const wIn = el('textarea', { class: 'benchin', rows: 3, maxlength: MAX_TEXT, 'aria-label': 'What was wrong (the answer)', oninput: e => { answer = e.target.value; answerMine = true; } }, answer);
    return [
      el('div', { class: 'knob-head' }, el('b', {}, 'Save, load and share'), el('span', { class: 'muted small' }, fault ? 'this customer\'s key as it stands' : 'every adjustment as it stands')),
      store ? el('div', { class: 'row' }, name, el('button', { onclick: () => {
        const list = addSave(store, nameVal || `${A.name === 'upright' ? 'Upright' : 'Grand'}, ${new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`, codeNow(A));
        toast(list ? 'Saved in this browser' : 'This browser wouldn\'t keep it: copy the link instead', list ? '' : 'warn'); if (list) nameVal = ''; refresh();
      } }, 'Save in this browser'))
        : el('p', { class: 'muted small' }, 'This browser isn\'t keeping saved work (private window, or storage turned off). A link still works.'),
      saves.length ? el('ul', { class: 'saves' }, saves.map(s => el('li', {}, el('span', { class: 'grow' }, s.name, s.when ? el('span', { class: 'muted small' }, ` · ${new Date(s.when).toLocaleDateString()}`) : null),
        el('button', { onclick: () => load(s.code) }, 'Load'),
        el('button', { title: `Delete the save "${s.name}"`, onclick: () => { removeSave(store, s.name); refresh(); } }, 'Delete')))) : null,
      el('div', { class: 'row' }, el('button', { onclick: () => copy(linkOf(codeNow(A)), fault ? 'Opens this customer\'s key as it stands. The answer travels with it, hidden.' : 'Opens this regulation in the Sandbox.') }, 'Copy a link to it'),
        code, el('button', { onclick: () => { if (load(codeVal)) codeVal = ''; } }, 'Load')),
      // a teacher's fault: the Sandbox as it stands, handed over with a complaint, the answer hidden until it is asked for
      fault ? null : el('details', { class: 'teach', open: panel.querySelector('.teach')?.open ? '' : false }, el('summary', {}, 'Teachers: hand this to a student as a fault'),
        el('p', { class: 'muted small' }, 'Set the action up wrong in the Sandbox (any adjustments, a worn or broken part), then write what the customer says. The student\'s link opens Find the fault on this key: the complaint shows, the readings stay hidden until they are measured, and your answer shows only when the key is put right or the student asks for it.'),
        el('label', { class: 'small' }, 'The customer says', cIn),
        el('label', { class: 'small' }, 'What was wrong (kept hidden; edit it to say what you want the student to learn)', wIn),
        answerMine ? el('button', { class: 'linkish small', onclick: () => { answerMine = false; draftFor = null; refresh(); } }, 'Write it from the adjustments again') : null,
        el('div', { class: 'row' }, el('button', { class: 'primary', onclick: () => {
          if (!complaint.trim()) { toast('Write what the customer says first', 'warn'); return; }
          copy(linkOf(codeNow(A, { c: complaint.trim(), w: answer.trim() || 'The teacher left no note.' })), 'The student\'s link. The answer is scrambled in it, not locked: enough to keep it out of sight, no more.');
        } }, 'Copy the student\'s link'))),
      linkBox ? [el('textarea', { class: 'benchin linkbox', rows: 3, readonly: '', 'aria-label': 'The link' }, linkBox.text), el('p', { class: 'muted small' }, linkBox.note)] : null];
  }
  // a code or a link, from the list, the box or the address
  function load(text, { quiet = false } = {}) {
    const st = decodeState(codeFrom(text));
    if (!st) { if (!quiet) toast('That isn\'t a link or code from this page (or part of it is missing)', 'warn'); return false; }
    const A = adapter();
    if (!A) { toast('Open Learn, Find the fault or the Sandbox first', 'warn'); return false; }
    if (st.a !== A.name) { toast(`That one is for the ${st.a} action: switch to the ${st.a === 'upright' ? 'Upright' : 'Grand'} piano first`, 'warn'); return false; }
    // (the set first: the differences are from that set's regulated key)
    const set0 = A.set?.();
    if (A.useSet && A.useSet(st.s || 'generic') === false) { toast('Not just now: finish what is running first', 'warn'); return false; }
    const ok = A.open({ k: st.k, notes: st.n.map(d => applyDiff(d, A.rules)), c: st.c || 'Something isn\'t right with this key.', w: st.w });
    if (ok === false) { if (A.useSet && A.set() !== set0) A.useSet(set0); toast('Not just now: finish what is running first', 'warn'); return false; }
    open = null; linkBox = null;
    const setNote = A.set && A.set() !== set0 ? `. It is graded against ${A.setName()}: the specs have been switched to match` : '';
    toast((st.k === 'fault' ? 'A fault set up for you: find it and put it right' : 'Loaded into the Sandbox') + setNote);
    refresh();
    return true;
  }

  // ---------- print: a record of the regulation as it reads now ----------
  function print() {
    const A = adapter();
    if (!A || !A.can().print) return;
    const r = A.record(), cellOf = c => typeof c === 'string' ? el('td', {}, c) : el('td', { class: c.ok === null ? 'muted' : c.ok ? 'okc' : 'badc' }, c.ok === null ? null : `${c.ok ? '✓' : '✗'} `, c.txt);
    sheet.replaceChildren(
      el('h1', {}, r.title),
      el('p', { class: 'meta' }, [`Printed ${new Date().toLocaleString([], { dateStyle: 'long', timeStyle: 'short' })}`, ...r.meta].join(' · ')),
      el('p', { class: 'meta' }, 'Name: ________________________________'),
      ...(r.copy ? [printable(r.copy)] : []),
      ...r.tables.flatMap(t => [t.caption ? el('h2', {}, t.caption) : null,
        el('table', {}, el('thead', {}, el('tr', {}, t.head.map(h => el('th', {}, h)))), el('tbody', {}, t.rows.map(row => el('tr', {}, row.map(cellOf)))))]).filter(Boolean),
      el('p', { class: 'meta' }, '✓ in spec, ✗ out of spec, at the level and targets named above. A practice record from regulation.keyandcable.com: not an exam result.'));
    window.print();
  }
  // a copy of what the panel shows (the exam's score sheet), without its buttons
  function printable(node) {
    const c = node.cloneNode(true);
    c.querySelectorAll('button, select, input, .row').forEach(x => x.remove());
    c.removeAttribute('id'); c.className = 'copy';
    return c;
  }
  B.print.onclick = print;

  // a link followed to this page (…#r=CODE): the code names its action, so the caller switches to it first
  const fromAddress = () => { const i = location.hash.indexOf(HASH); return i === 0 ? decodeState(codeFrom(location.hash)) && codeFrom(location.hash) : null; };
  const actionOf = code => decodeState(code)?.a ?? null;
  return { sync, load, fromAddress, actionOf };
}
