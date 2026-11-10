// The test log: a card at the top of the picture that fills in, line by line, with what a running test says and what
// the action does, so each line stays where it can be read (the pop-up messages it replaces faded after 2.6 s, three
// at most, and a long test scrolled them away unread). While the test runs the newest line is marked and the earlier
// ones dimmed; a line said again straight after shows ×2, ×3; a keyed line (one blow of the repeat test, the count's
// progress) changes in place instead of adding another. The card shows with a test's first line, and stays up with the
// result after the test until it is closed, the next test starts, the tab or the action changes, or the regulation it
// was read on changes.
const MAX_LINES = 300;
export function createTestLog(el, stage, toasts) {
  const name = el('b', { class: 'tl-name' }), state = el('span', { class: 'tl-state' });
  const lines = el('ol', { class: 'tl-lines', role: 'log', 'aria-live': 'polite' });
  const box = el('div', { id: 'testlog', hidden: '' },
    el('div', { class: 'tl-head' }, name, state,
      el('button', { class: 'tl-close', 'aria-label': 'Close the test log', onclick: () => api.close(),
        title: 'Close. It also closes by itself when another test starts or the regulation changes' }, '×')),
    lines);
  stage.append(box);
  let running = false, keyOf = null, readOn = null, last = null, stick = true;
  const keyed = new Map();
  // follows the newest line, unless it has been scrolled back to read an earlier one
  lines.addEventListener('scroll', () => { stick = lines.scrollTop + lines.clientHeight >= lines.scrollHeight - 4; });
  const mark = li => { last?.classList.remove('now'); last = li; li.classList.add('now'); };
  // centered over the picture; over the key inset (the grand's is top left, the upright's top middle), beside it
  // instead, on whichever side has room nearer the middle. The pop-up messages that still come (a warning while it is
  // up) go under it
  function place() {
    if (box.hidden) { toasts.style.top = ''; return; }
    const sr = stage.getBoundingClientRect(), W = sr.width, w = box.offsetWidth, mid = (W - w) / 2;
    let x = mid;
    const inset = [...stage.querySelectorAll('#inset, #inset-u')].find(e => !e.hidden && e.offsetParent);
    if (inset) {
      const r = inset.getBoundingClientRect(), iL = r.left - sr.left - 12, iR = r.right - sr.left + 12;
      const fits = x < iR && x + w > iL ? [iR, iL - w].filter(v => v >= 12 && v + w <= W - 12) : [];
      if (fits.length) x = fits.reduce((a, b) => Math.abs(a - mid) <= Math.abs(b - mid) ? a : b);
    }
    box.style.left = `${x}px`;
    toasts.style.top = `${box.offsetTop + box.offsetHeight + 8}px`;
  }
  new ResizeObserver(place).observe(box);
  new ResizeObserver(place).observe(stage);
  function show() {
    if (box.hidden) { box.hidden = false; place(); }
    if (stick) lines.scrollTop = lines.scrollHeight;
  }
  const api = {
    get open() { return !box.hidden; },
    get running() { return running; },
    // a test begins: its name heads the card, which shows once something is said. key(): the regulation it reads
    start(title, key) {
      lines.replaceChildren(); keyed.clear(); last = null; stick = true;
      name.textContent = title; state.textContent = 'running'; box.classList.remove('done');
      running = true; keyOf = key; readOn = null;
      box.hidden = true; place();
    },
    // a line (text, or a node with text in it); false when there is no log to take it (no test running, or its log
    // was closed)
    add(content, kind = '', key = null) {
      if (!running) return false;
      const text = typeof content === 'string' ? content : content.textContent;
      let li = key ? keyed.get(key) : null;
      if (!li && !key && last && !last.dataset.tlKey && last.dataset.text === text) {
        const n = +(last.dataset.n || 1) + 1;
        last.dataset.n = n; last.querySelector('.tl-n').textContent = `×${n}`;
        mark(last); show(); return true;
      }
      if (!li) {
        li = el('li'); lines.append(li);
        if (key) { keyed.set(key, li); li.dataset.tlKey = key; }
        while (lines.children.length > MAX_LINES) { const old = lines.firstChild; old.remove(); keyed.delete(old.dataset.tlKey); }
      }
      li.className = kind; li.dataset.text = text; delete li.dataset.n;
      li.replaceChildren(el('span', { class: 'tl-text' }, content), el('span', { class: 'tl-n' }));
      mark(li); show(); return true;
    },
    // the test is over: the card stays with what it said (if it said nothing, there's nothing to keep)
    done() {
      running = false;
      if (!lines.children.length) { api.close(); return; }
      state.textContent = 'done'; box.classList.add('done');
      readOn = keyOf?.() ?? null;
    },
    close() {
      running = false; last = null; keyed.clear();
      box.hidden = true; lines.replaceChildren(); place();
    },
    // called on every redraw: a finished log closes once the regulation it was read on has changed
    check() { if (!running && !box.hidden && readOn !== null && keyOf?.() !== readOn) api.close(); },
  };
  return api;
}
