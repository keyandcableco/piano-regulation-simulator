// The upright action in the app (research/upright/protocol.md, chunk C6). app.js keeps the grand's code paths as they
// were; when the header's switch picks the upright it hands this module the picture, the panel, the loop and the move
// buttons. The page's one class (#app.upright, index.html) hides the grand's canvas, view and key buttons and shows
// this module's, which sit in the same bars so the phone layouts carry over.
// The upright's model, drawing and content are upright-model.js, scene-upright.js and content-upright.js. It has Learn
// and the Sandbox; Find the fault, the exam, drills and tools come with C5, C7 and C8.
import { FACTORY, ADJ, DAMAGE, Sim, measure, grade, pose, evenTol, DAMPER_PEDAL_LIFT, keyAngle, capstanTop, wippenOn, gRail, gString } from './upright-model.js';
import { hand, UPRIGHT_HOLD, HOLD_NAMES, dragTo } from './hand.js';
import { createUprightScene } from './scene-upright.js';
import { STEPS, TESTS, TIPS, TOOLS, SPEC_NAMES, REPAIRS, SCENARIOS, bandText, readingText, callouts, deregulated, fairStart, creditOf, advise, alsoText } from './content-upright.js';
import { markView } from './controls.js';
import { diffAdj } from './bench.js';

const DT = 0.0001;          // s: the Sim's step (its tests' and fit's)
// At most this many steps a screen frame. Each costs about 0.2 ms of computing, so 120 is about 24 ms: real speed
// (166 steps a frame at 60 Hz) runs at about 70%, and the key line says so; the slow-motion speeds keep up.
const MAX_STEPS = 120;
const STRIKE = 450, SLOW = 6, UP = 236;   // mm/s at the key front: a moderate blow, a slow press, a quick release [S15]
// the parts each knob works on (for the highlight), and what each knob sets
const KNOB_PARTS = { balPunch: ['balrail', 'key'], frontPunch: ['frontrail'], railShim: ['hammerrail'], capstan: ['capstan'],
  letoff: ['letoff', 'letoffscrew'], backcheck: ['backcheck', 'bcwire'], spoon: ['spoon'], bridle: ['bridle', 'strap'], softFelt: ['hammerrail'] };
const SETS = { balPunch: ['keyHeight', 'dip'], frontPunch: ['dip', 'aftertouch', 'escapement'], railShim: ['blow', 'lostMotion'],
  capstan: ['lostMotion', 'check'], letoff: ['letoff', 'aftertouch'], backcheck: ['check'], spoon: ['damperTiming'], bridle: ['bridle'], softFelt: ['softPedal'] };
// a clicked part's card: the knobs that work on it or on what it touches
const PART_KNOBS = { key: ['balPunch', 'frontPunch'], balrail: ['balPunch'], frontrail: ['frontPunch'], hammerrail: ['railShim', 'softFelt'],
  hammer: ['railShim'], shank: ['railShim'], capstan: ['capstan'], heel: ['capstan'], wippen: ['capstan'], jack: ['capstan', 'letoff'], cushion: ['capstan'],
  butt: ['capstan'], letoff: ['letoff'], letoffscrew: ['letoff'], letoffrail: ['letoff'], backcheck: ['backcheck'], bcwire: ['backcheck'],
  catcher: ['backcheck', 'bridle'], bridle: ['bridle'], strap: ['bridle'], spoon: ['spoon'], lever: ['spoon'], leverfelt: ['spoon'] };
const KNOB_VIEW = { balPunch: 'whole', frontPunch: 'whole', railShim: 'action', capstan: 'wippen', letoff: 'butt', backcheck: 'check', spoon: 'damper',
  bridle: 'check', softFelt: 'action' };
// the Sandbox's parts of the action, each with its knobs and what they set (the grand's AREAS)
// (with each part's tests and condition checks, for Find the fault)
const AREAS = [
  { name: 'Key', knobs: ['balPunch', 'frontPunch'], specs: ['keyHeight', 'dip'], tests: ['straightedge', 'dipBlock'] },
  { name: 'Hammer and hammer rail', knobs: ['railShim', 'softFelt'], specs: ['blow', 'softPedal', 'buttSpring', 'buttCenter'], tests: ['blowGauge', 'softBlow', 'hammerLift'] },
  { name: 'Wippen and jack', knobs: ['capstan', 'letoff'], specs: ['lostMotion', 'letoff', 'aftertouch', 'escapement', 'jackSpring', 'buttLeather'],
    tests: ['railPull', 'topPlay', 'jackReturn', 'slowPress', 'holdLook', 'jackPush', 'inspectLeather'] },
  { name: 'Backcheck and bridle', knobs: ['backcheck', 'bridle'], specs: ['check', 'bridle', 'catcherLeather', 'strap'], tests: ['strikeHold', 'softWatch', 'strapLook'] },
  { name: 'Damper', knobs: ['spoon'], specs: ['damperTiming', 'damperSpring'], tests: ['damperSlow', 'damperPull'] },
];
const ALL_SPECS = AREAS.flatMap(ar => ar.specs);
const SHARED = new Set(['railShim', 'softFelt']);   // one hammer rail (and its soft pedal) under all the notes
// the View menu (controls.js): the whole action, then the close views, each with what the tests check in it
const VIEW_GROUPS = [
  ['Whole action', [['action', 'Action', 'from the treble end: let-off, damper'], ['angle', '3/4', 'from the player\'s side, above'],
    ['front', 'From the keys', 'the key and its neighbors']]],
  ['Close up', [['keyfront', 'Key front', 'the key travel, the front rail punching'], ['whole', 'Key', 'key height, dip'],
    ['wippen', 'Wippen', 'and the capstan'], ['butt', 'Jack & butt', 'lost motion, escapement'],
    ['jackfront', 'Jack from the keys', 'a slice through the jack'], ['check', 'Backcheck', 'check, bridle'], ['damper', 'Damper', 'damper lever and spoon']]],
];
const TEST_VIEWS = { head: 'Hammer head' };   // views only a test uses, named on the View button
const EVENT_TEXT = {
  // (a let-off distance only where the hammer was still on the jack: in a blow it has flown on and struck by then)
  letoff: e => e.hand ? 'Jack tripped by hand' : e.flown ? 'Jack escaped' : `Let off ${e.dist.toFixed(1)} mm from the strings`, strike: e => `Struck at ${e.v.toFixed(1)} m/s`,
  blocked: () => 'Blocked: the jack holds the hammer on the strings', bobble: () => 'The hammer bounces on the jack',
  checked: e => `Checked ${e.dist.toFixed(1)} mm from the strings`, reset: () => 'Jack back under the butt', seated: () => 'Damper back on the strings',
};
// the event line's length: a blow, held and let go, says struck, jack escaped, checked, jack back, damper back, hammer
// home (the strap going taut shows in the picture, and in the time home)
const LOG_LINES = 4;
const specsOf = st => [st.spec, ...(st.also ?? [])];

// env: el and put (the app's DOM helpers), toast(text, kind), level() (the app's skill level: tolK, live), refresh()
// (redraw the panel)
export function createUprightApp({ el, put, toast, level, refresh }) {
  const $ = s => document.querySelector(s);
  const mark = e => { e.dataset.upright = ''; return e; };
  let active = false, mode = 'sandbox', labelsOn = false, speed = 0.1, softOn = false, sustainOn = false;
  // ---------- the picture, its buttons and its key bar ----------
  const canvas = mark(el('canvas', { id: 'cu' })), overlay = mark(el('div', { id: 'overlay-u' }));
  $('#c').after(canvas); $('#overlay').after(overlay);
  const S = createUprightScene(canvas, overlay);
  canvas.scene = S;   // for the headless checks (tests/upright-app-check.cjs)
  // the page's View, Show, Key & pedal and Speed menus take the upright's buttons beside the grand's (index.html, controls.js)
  const item = (role, label, caption, attrs) => mark(el('button', { role, ...attrs }, el('b', {}, label), caption ? el('small', {}, caption) : null));
  const viewBtns = [];
  for (const [head, views] of VIEW_GROUPS) {
    const btns = views.map(([v, label, caption]) => item('menuitemradio', label, caption, { 'data-uview': v, onclick: () => view(v) }));
    viewBtns.push(...btns);
    $('#menu-view').append(mark(el('div', { role: 'group', 'aria-label': head }, el('div', { class: 'mhead' }, head), el('div', { class: 'mgrid' }, btns))));
  }
  const labelsBtn = item('menuitemcheckbox', 'Part names', 'a name beside each part',
    { onclick: () => { labelsOn = !labelsOn; S.setLabels(labelsOn); labelsBtn.classList.toggle('on', labelsOn); } });
  // the key front in a corner, as the grand has it: on where the stage has room
  const insetBtn = item('menuitemcheckbox', 'Key inset', 'the key front in a corner, to watch its travel while the view shows the action',
    { onclick: () => setInset(!insetBtn.classList.contains('on')) });
  const setInset = on => { S.setInset(on); insetBtn.classList.toggle('on', on); };
  S.insetEl.onclick = () => view('keyfront');
  $('#showmenu').append(labelsBtn, insetBtn);
  const keyState = mark(el('span', { class: 'u-keystate' })), lastEvent = mark(el('span', { class: 'u-lastevent' })), keyPos = mark(el('span', { class: 'u-keypos' }));
  $('#keystatus').append(keyState, lastEvent, mark(el('span', { class: 'sep' })), keyPos);
  const kb = (label, title, onclick, attrs = {}) => mark(el('button', { title, onclick, ...attrs }, label));
  const softBtn = item('menuitemcheckbox', 'Soft pedal', 'the hammer rail moves in', { title: 'Soft pedal down or up', onclick: () => setSoft(!softOn) });
  const susBtn = item('menuitemcheckbox', 'Sustain pedal', 'all the dampers off', { title: 'Sustain pedal down or up (P)', 'data-key': 'P', onclick: () => setSustain(!sustainOn) });
  const speedBtns = [[1, 'Real speed', 'as fast as a real blow'], [0.1, 'Slow ×10', 'ten times slower'], [0.02, 'Slow ×50', 'fifty times slower']].map(([s, label, caption]) =>
    item('menuitemradio', label, caption, { 'data-uspeed': s, 'data-short': label, class: s === speed ? 'on' : '', onclick: () => setSpeed(s) }));
  // Play and Let key up stay on the bar, after the grand's own; the others go in the Key & pedals menu
  const keyBtns = [
    kb([el('span', { class: 'glyph' }, '▶ '), 'Play'], 'Strike the key and let it come back up', () => play('play'), { class: 'kplay' }),
    kb('Let key up', 'Let the key all the way up (Esc)', () => play('up'), { 'data-key': 'Esc' }),
    item('menuitem', 'Strike & hold', 'strike, and keep it down', { title: 'Strike and keep holding the key down (H; or hold Space, or press and hold on the key)', 'data-key': 'H', onclick: () => play('hold') }),
    item('menuitem', 'Press slowly', 'to the bottom, and hold it', { title: 'Press the key slowly to the bottom and hold it there (S)', 'data-key': 'S', onclick: () => play('slow') }),
    softBtn, susBtn];
  $('#k-release').after(...keyBtns.slice(0, 2));
  $('#keymenu').append(...keyBtns.slice(2));
  $('#speedmenu').append(...speedBtns);
  const card = mark(el('div', { id: 'partpop-u', hidden: '' }));
  $('#stage').append(card);

  // ---------- state ----------
  const a = { ...FACTORY };
  let m = measure(a), sim = new Sim(a), tested = new Set(), stepIdx = 0, carry = 0, plan = null, lagging = false;
  let busy = false, testRun = null, testScale = 1, override = null, testEvents = [], viewNow = 'action', cardPart = null;
  let idle = false;   // nothing moved on the last frame and nothing has been asked of the Sim since: its steps are skipped
  const log = [];

  // ---------- the regulation ----------
  function setRegulation(b, { keepTested = true, replace = false } = {}) {
    if (busy) return;   // a running test has the Sim
    if (replace) for (const k of Object.keys(a)) delete a[k];
    Object.assign(a, b); m = measure(a);
    verdict = null;   // a check of the work belongs to the work it checked
    sim = new Sim(a); sim.setSoft(softOn); sim.setPedal(sustainOn); sim.soft = softOn ? 1 : 0; sim.pedal = sustainOn ? 1 : 0;
    if (!keepTested) { tested = new Set(); dealt++; }   // a fresh key: a new piece of work for the bench bar
    testEvents = []; plan = null; idle = false; log.length = 0; lastEvent.textContent = '';
    refresh(); renderCard();
  }
  function nudge(k, dir) {
    if (busy) return;
    const d = ADJ.find(x => x.id === k);
    S.highlight(KNOB_PARTS[k]);
    const v = Math.max(d.min, Math.min(d.max, +(a[k] + dir * d.step).toFixed(6)));
    // the exam's three notes share one hammer rail: its rest felts and the soft pedal move all three
    if (exam.started && !exam.done && SHARED.has(k)) for (const n of exam.notes) n.a[k] = v;
    setRegulation({ [k]: v });
  }
  const gradeL = id => grade(id, m, level().tolK);
  const revealed = id => level().live || mode === 'sandbox' || tested.has(id) || (mode === 'diagnose' && (gaveUp || verdict?.ok));
  // Find the fault: the customer's case, the last check of the work, and whether the answer was shown
  let scenario = null, verdict = null, gaveUp = false, lastCase = null;
  let dealt = 0;   // keys dealt (setRegulation with keepTested off): the bench bar's undo list and "before" start afresh with each

  // ---------- the key and pedals ----------
  function play(kind) {
    if (busy) return;
    plan = null; idle = false;
    if (kind !== 'up') testEvents = [];   // the callouts read this press's events
    if (kind === 'up') { keyUp(); return; }
    releasedAt = null;   // a new press: a landing after it isn't timed from the last release
    if (kind === 'slow') { sim.press(sim.dip, SLOW); return; }
    sim.press(sim.dip, STRIKE);
    if (kind === 'play') plan = 'up';
  }
  // let the key up; from check, the time the hammer takes to get home goes on the event line (the strap and the butt
  // spring show there: Ellis's test)
  let releasedAt = null;
  function keyUp() { releasedAt = sim.checked && sim.d > 0.9 * sim.dip ? sim.t : null; sim.press(0, UP); }
  function setSoft(on) { if (busy) return; idle = false; testEvents = []; softOn = on; sim.setSoft(on); softBtn.classList.toggle('on', on); }
  function setSustain(on) { if (busy) return; idle = false; testEvents = []; sustainOn = on; sim.setPedal(on); susBtn.classList.toggle('on', on); }
  function setSpeed(s) { speed = s; for (const b of speedBtns) b.classList.toggle('on', +b.dataset.uspeed === s); }
  function view(name) {
    viewNow = name; S.setView(name);
    for (const b of viewBtns) b.classList.toggle('on', b.dataset.uview === name);
    markView(viewBtns.find(b => b.dataset.uview === name)?.querySelector('b').textContent ?? TEST_VIEWS[name] ?? name);
  }

  // ---------- the loop (app.js's frame() calls this while the upright is shown) ----------
  // returns how many steps it ran (none when the frame is shorter than a step)
  function advance(secs) {
    carry += secs;
    let n = Math.floor(carry / DT + 1e-9);
    lagging = n > MAX_STEPS; n = Math.min(n, MAX_STEPS); carry = lagging ? 0 : carry - n * DT;
    for (let i = 0; i < n; i++) {
      sim.step(DT);
      // Play lets the key up once it is down (as the grand's does, a moment after it gets there)
      if (plan === 'up' && sim.d >= sim.dip - 0.01) { plan = sim.t + 0.012; }
      else if (typeof plan === 'number' && sim.t >= plan) { plan = null; keyUp(); }
      for (const e of sim.events) {
        if (!e.hand) testEvents.push(e);   // (a jack tripped by hand isn't a let-off reading)
        if (EVENT_TEXT[e.type]) { log.push(EVENT_TEXT[e.type](e)); if (log.length > LOG_LINES) log.shift(); }
        if (e.type === 'rail' && releasedAt !== null) { log.push(`Hammer home in ${Math.round(1000 * (e.t - releasedAt))} ms`); if (log.length > LOG_LINES) log.shift(); releasedAt = null; }
      }
      sim.events = [];
      if (testRun && sim.t >= testRun.until - 1e-12) { const r = testRun.r; testRun = null; r(); }
    }
    return n;
  }
  const state = () => [sim.d, sim.dTarget, sim.g, sim.w, sim.phi, sim.v, sim.psi, sim.dl, sim.vd, sim.soft, sim.softTarget, sim.pedal, sim.pedalTarget];
  function frame(dtReal) {
    if (override) S.update(override.a, override.p, 0);
    else {
      if (busy || plan || !idle || sim.hand) {
        // a part held by hand moves at the hand's own pace, real speed; let go, it goes on at the chosen speed
        const s0 = state(), n = advance(dtReal * (busy ? testScale : sim.hand ? 1 : speed));
        // idle only once a frame's steps left everything where it was, the key where it is going
        idle = n > 0 && !busy && !plan && !sim.hand && sim.d === sim.dTarget && state().every((v, i) => Math.abs(v - s0[i]) < 1e-9);
        if (idle) lagging = false;
      }
      const p = sim.pose(), railShim = sim.railShim();
      // the neighbors: the exam's other notes as they are now, else the factory key on the same rail (the straightedge's)
      const nbr = slot => {
        const i = exam.started ? exam.cur + (slot === 1 ? -1 : 1) : null;
        const an = i === null ? { ...a, railShim, balPunch: FACTORY.balPunch, frontPunch: FACTORY.frontPunch, capstan: FACTORY.capstan, damage: null }
          : exam.notes[i] ? { ...exam.notes[i].a, railShim } : null;
        if (!an) return;
        const rest = pose(an, 0);
        rest.dl = Math.max(rest.dl, sim.pedal * DAMPER_PEDAL_LIFT);   // their dampers on the sustain pedal's rod
        S.update(an, rest, slot);
      };
      nbr(1); nbr(2); S.update(a, p, 0);
    }
    lastEvent.textContent = log.join(' · ');
    const d = override ? override.p.d : sim.d;
    keyState.textContent = d < 0.05 && sim.dTarget < 0.05 ? 'Key at rest' : !override && sim.blocked && sim.dTarget > sim.d + 0.01 ? 'Key blocked: it stops short'
      : sim.dTarget > sim.d + 0.01 ? 'Key going down' : sim.dTarget > 0.05 ? 'Key held down' : 'Key coming up';
    keyState.classList.toggle('down', d > 0.05);
    keyPos.textContent = `${exam.started && !exam.done ? `note ${exam.cur + 1} · ${clockText()} · ` : ''}key ${d.toFixed(2)} mm down${lagging && !sim.hand ? ' · slower than chosen' : ''}`;
    if (exam.started && !exam.done && Date.now() >= exam.endAt && !busy) handIn();
    S.setInsetText(`Key front · ${d.toFixed(2)} mm down${d >= sim.dip - 0.01 ? ' (dip)' : ''}`);
    for (const b of keyBtns) b.disabled = busy;
    const list = callouts({ a, m, p: override ? override.p : sim.pose(), events: testEvents, shown: revealed });
    for (const c of list) S.setCallout(c.id, c.from, c.to, c.text);
    S.clearCallouts(list.map(c => c.id));
    S.render();
  }

  // ---------- tests (content-upright.js's ctx contract) ----------
  const ctx = {
    get sim() { return sim; }, get a() { return a; }, get m() { return m; },
    view,
    run: secs => new Promise(r => { testRun = { until: sim.t + secs, r }; }),
    pause: secs => new Promise(r => setTimeout(r, secs * 1000)),
    say: (text, warn) => { toast(text, warn ? 'warn' : ''); log.push(text); if (log.length > LOG_LINES) log.shift(); },
    release: async () => {
      if (sim.d > 0.001 || sim.checked || sim.soft > 0 || sim.pedal > 0) { sim.press(0, UP); sim.setSoft(false); sim.setPedal(false); await ctx.run(0.4); }
      sim.reset(); testEvents = [];
    },
    show: (an, p) => { override = an ? { a: an, p } : null; },
    grade: id => gradeL(id),
    lastEvent: type => testEvents.filter(e => e.type === type).at(-1),
  };
  async function runTest(id) {
    if (busy) return;
    const t = TESTS[id];
    dropHand();
    busy = true; plan = null; testScale = t.scale ?? 1; closeCard();
    softOn = sustainOn = false; softBtn.classList.remove('on'); susBtn.classList.remove('on');
    sim = new Sim(a); testEvents = []; log.length = 0;
    refresh(); view(t.view);
    try { await t.run(ctx); } catch (err) { console.error(err); }
    override = null; testRun = null; busy = false; idle = false;
    for (const sp of t.specs) tested.add(sp);
    refresh();
  }

  // ---------- the panel ----------
  function readingsTable(ids) {
    return el('table', { class: 'specs' },
      el('thead', {}, el('tr', {}, el('th', {}, 'Check'), el('th', {}, 'Target'), el('th', {}, 'Now'))),
      el('tbody', {}, ids.map(id => {
        const show = revealed(id), r = gradeL(id);
        return el('tr', { class: show ? (r.ok ? 'ok' : 'bad') : '' },
          el('td', {}, el('span', { class: 'dot' }), SPEC_NAMES[id]),
          el('td', { class: 'muted' }, bandText(id)),
          el('td', {}, show ? `${readingText(id, m)}${r.note ? ` · ${r.note}` : ''}` : el('span', { class: 'muted' }, 'not measured')));
      })));
  }
  function knobRow(k, { sets = false } = {}) {
    const d = ADJ.find(x => x.id === k), net = Math.round((a[k] - FACTORY[k]) * 100) / 100 || 0;
    // the card's buttons (sets) anchor apart from the panel's, so a click in the card never scrolls the panel
    const btn = (sym, dir) => el('button', { class: 'nudge', title: `${sym} ${d.step} ${d.unit}`, 'data-anchor': `u-${sets ? 'card-' : ''}${k}${sym}`, disabled: busy ? '' : false,
      onclick: () => nudge(k, dir) }, el('span', { class: 'sym' }, sym), el('span', { class: 'step' }, `${d.step} ${d.unit}`));
    return el('div', { class: 'knob' },
      el('div', { class: 'knob-head' },
        el('button', { class: 'linkish', onclick: () => { S.highlight(KNOB_PARTS[k]); view(KNOB_VIEW[k]); } }, d.name),
        el('span', { class: 'muted small' }, mode === 'sandbox' ? `${net >= 0 ? '+' : ''}${net.toFixed(2)} ${d.unit} from factory` : '')),
      el('div', { class: 'knob-btns' }, btn('−', -1), btn('+', +1)),
      sets ? el('div', { class: 'sets small' }, el('span', { class: 'muted' }, 'Sets'), SETS[k].map(id => {
        const show = revealed(id), r = gradeL(id);
        return el('span', { class: 'chip' + (show ? (r.ok ? ' ok' : ' bad') : '') }, el('span', { class: 'dot' }), `${SPEC_NAMES[id]}: `,
          show ? readingText(id, m) : el('span', { class: 'muted' }, 'not measured'));
      })) : null);
  }
  const testButton = id => el('button', { class: 'test', disabled: busy ? '' : false, 'data-anchor': `u-test:${id}`, onclick: () => runTest(id) }, '▶ ', TESTS[id].label);
  function benchTips(key) {
    const tips = TIPS[key];
    if (!tips?.length) return null;
    return el('details', { class: 'bench', open: '' }, el('summary', {}, 'From the bench'), el('ul', {}, tips.map(t =>
      el('li', {}, t.text, ' ', el('span', { class: 'credit' }, '— ', t.url ? el('a', { href: t.url, target: '_blank', rel: 'noopener' }, creditOf(t)) : creditOf(t))))));
  }
  const GRADED = STEPS.filter(s => !s.info);
  const stepDone = st => specsOf(st).every(id => tested.has(id) && gradeL(id).ok);
  function goStep(i) {
    if (busy) return;
    stepIdx = i;
    const st = STEPS[i];
    S.highlight(stepParts());
    if (st && !st.info) view(TESTS[st.test].view);
    refresh();
  }
  function renderLearn(p) {
    const st = STEPS[stepIdx], done = stepIdx >= STEPS.length;
    put(p, el('div', { class: 'steps' }, STEPS.map((s, i) =>
      el('button', { class: 'pip' + (s.info ? ' info' : '') + (i === stepIdx ? ' cur' : '') + (!s.info && stepDone(s) ? ' ok' : ''), title: s.title, onclick: () => goStep(i) }, String(i + 1))),
      el('button', { class: 'pip' + (done ? ' cur' : ''), title: 'Final check', onclick: () => goStep(STEPS.length) }, '✓')),
      done ? null : el('p', { class: 'muted small' }, 'This key starts out of regulation on purpose: every adjustment is knocked a little off. Work through the steps to put it right; ✓ re-checks everything at the end.'));
    if (done) {
      GRADED.flatMap(specsOf).forEach(id => tested.add(id));
      const bad = GRADED.filter(s => !stepDone(s));
      put(p, el('h2', {}, 'Final check'),
        el('p', {}, bad.length ? 'Everything was re-measured. These are out of spec now (often because a later step moved them):' : 'Every measurement is in spec. That key is regulated.'),
        bad.length ? el('ul', {}, bad.map(s => el('li', {}, el('button', { class: 'linkish', onclick: () => goStep(STEPS.indexOf(s)) }, s.title), backTo(s)))) : null,
        readingsTable(GRADED.flatMap(specsOf)),
        el('div', { class: 'row' }, el('button', { disabled: busy ? '' : false, onclick: () => { setRegulation(deregulated(), { keepTested: false }); goStep(0); } }, 'Start over with a new key')));
      return;
    }
    // aftertouch and the jack's clearance are set by other readings: what to go back to (content-upright.js advise)
    function backTo(s) {
      if (s.spec !== 'aftertouch') { const n = specsOf(s).map(id => gradeL(id).note).find(Boolean); return n ? `: ${n}` : null; }
      const adv = advise(m, level().tolK), to = adv && GRADED.find(g => specsOf(g).includes(adv.spec));
      return adv ? [`: ${adv.text}`, to && to !== s ? [' (', el('button', { class: 'linkish', onclick: () => goStep(STEPS.indexOf(to)) }, to.title), ')'] : null] : null;
    }
    const nav = ok => el('div', { class: 'row' },
      el('button', { disabled: stepIdx === 0 ? '' : false, onclick: () => goStep(stepIdx - 1) }, '← Back'),
      el('button', { class: ok ? 'primary' : '', onclick: () => goStep(stepIdx + 1) }, ok ? 'Next step →' : 'Skip →'));
    const head = el('div', { class: 'muted small' }, `Step ${stepIdx + 1} of ${STEPS.length}${st.info ? ' · not in the sim' : ''}`);
    if (st.info) { put(p, head, el('h2', {}, st.title), el('p', {}, st.what), el('p', { class: 'muted' }, st.how), st.note ? el('p', { class: 'note' }, st.note) : null, benchTips(st.id), nav(true)); return; }
    const earlier = STEPS.slice(0, stepIdx).filter(s => !s.info).flatMap(specsOf);
    put(p, head, el('h2', {}, st.title), el('p', {}, st.what), el('p', { class: 'muted' }, st.how), st.note ? el('p', { class: 'note' }, st.note) : null,
      el('div', { class: 'row' }, (st.tests ?? [st.test]).map(testButton)),
      readingsTable(specsOf(st)),
      st.spec === 'aftertouch' && specsOf(st).every(id => tested.has(id)) && !stepDone(st) ? el('p', { class: 'note', 'data-advice': '' }, 'What to move', backTo(st)) : null,
      el('div', { class: 'knobs' }, st.knobs.map(k => knobRow(k))),
      st.repairs ? repairButtons(specsOf(st)) : null,
      benchTips(st.id ?? st.spec), nav(stepDone(st)),
      earlier.length ? el('details', {}, el('summary', {}, 'Earlier steps'), readingsTable(earlier)) : null);
  }
  function renderSandbox(p) {
    put(p, el('p', { class: 'muted small' }, 'An upright action at its factory regulation. Play it with the buttons under the picture, or press and hold on the key; change anything below and watch what it does. Wear or break a part to see what it does in play.'),
      el('div', { class: 'row' },
        el('button', { disabled: busy ? '' : false, onclick: () => setRegulation({ ...FACTORY, damage: null }) }, 'Factory regulation'),
        el('button', { disabled: busy ? '' : false, onclick: () => setRegulation({ ...deregulated(), damage: null }) }, 'Mess it up'),
        el('select', { title: 'Wear or break one part', disabled: busy ? '' : false, onchange: e => setRegulation({ damage: e.target.value || null }) },
          el('option', { value: '' }, 'All parts sound'),
          Object.entries(DAMAGE).map(([k, d]) => el('option', { value: k, selected: a.damage === k ? '' : false }, d.name)))),
      AREAS.map(ar => el('details', { class: 'fold', open: '' }, el('summary', {}, ar.name),
        readingsTable(ar.specs), el('div', { class: 'knobs' }, ar.knobs.map(k => knobRow(k))), repairButtons(ar.specs))));
  }
  // ---------- Find the fault: a customer's complaint, one cause, the tests and the work to put it right ----------
  function newCase() {
    if (busy) return;
    const pool = SCENARIOS.filter(s => s.id !== lastCase);
    scenario = pool[Math.floor(Math.random() * pool.length)]; lastCase = scenario.id;
    verdict = null; gaveUp = false;
    setRegulation({ ...FACTORY, damage: null, ...scenario.make(FACTORY) }, { keepTested: false });
  }
  function repair(r) {
    if (busy) return;
    if (DAMAGE[a.damage]?.spec === r.spec) { setRegulation({ damage: null }); toast(`Done: ${r.label.toLowerCase()}`); }
    else toast('That part was sound: nothing there to put right', 'warn');
  }
  const repairButtons = specs => {
    const list = REPAIRS.filter(r => specs.includes(r.spec));
    return list.length ? el('div', { class: 'row' }, list.map(r => el('button', { disabled: busy ? '' : false, onclick: () => repair(r) }, `🔧 ${r.label}`))) : null;
  };
  function checkWork() {
    const bad = ALL_SPECS.filter(id => !gradeL(id).ok);
    verdict = { ok: !bad.length, bad, k: level().tolK };
    refresh();
  }
  function renderDiagnose(p) {
    if (!scenario) { newCase(); return; }
    if (verdict && verdict.k !== level().tolK) verdict = null;   // given at another skill level's tolerances
    const knobs = level().live;   // the panel lists the knobs at Apprentice; otherwise they're on the parts (click one)
    const also = alsoText(scenario);
    put(p, el('h2', {}, 'A customer says:'), el('p', { class: 'note' }, `“${scenario.complaint}”`),
      el('p', { class: 'muted small' }, `Find out what's wrong and put it right: run the tests that would show it, then adjust or repair. ${knobs ? '' : 'Click a part on the action to adjust it. '}Check your work when you think it's done.`),
      verdict ? el('div', { class: 'verdict ' + (verdict.ok ? 'ok' : 'bad') },
        verdict.ok ? el('p', {}, el('b', {}, 'Fixed. '), scenario.cause, scenario.custom ? '' : '.', also ? ` ${also}.` : '') : el('p', {}, 'Still out: ', verdict.bad.map(id => SPEC_NAMES[id]).join(', '), '.')) : null,
      // (a fault a teacher set up comes with one note, in the teacher's own words)
      gaveUp ? el('div', { class: 'verdict bad' }, el('p', {}, el('b', {}, 'What was wrong: '), scenario.cause, scenario.custom ? null : ['. ', also ? `${also}. ` : '', el('b', {}, 'The fix: '), scenario.fix, '.'])) : null,
      AREAS.map(ar => el('details', { class: 'fold', open: '' }, el('summary', {}, ar.name),
        el('div', { class: 'row' }, ar.tests.map(testButton)), readingsTable(ar.specs),
        knobs ? el('div', { class: 'knobs' }, ar.knobs.map(k => knobRow(k))) : null, repairButtons(ar.specs))));
    put($('#actionbar'), el('div', { class: 'row' },
      el('button', { class: 'primary', disabled: busy ? '' : false, onclick: checkWork }, 'Check my work'),
      el('button', { disabled: busy || gaveUp ? '' : false, onclick: () => { gaveUp = true; refresh(); } }, 'Show what was wrong'),
      el('button', { disabled: busy ? '' : false, onclick: newCase }, 'Next customer')));
  }
  // ---------- the exam (C7): three notes, de-regulated, scored per note and for evenness (protocol 3.7) ----------
  // PTG's vertical section is a disassembled three-note model with pedals, assembled and regulated in 65 minutes, scored
  // for the consistency and accuracy of all three notes [S13]. Here it comes assembled; the scoring is the sim's own.
  const EXAM_CLOCKS = [65, 45, 30];
  const EVEN = ['keyHeight', 'dip', 'blow', 'lostMotion', 'letoff', 'check', 'damperTiming'];
  const SCORED = STEPS.filter(s => !s.info).flatMap(specsOf);
  const CONDITION = new Set(['buttLeather', 'catcherLeather', 'jackSpring', 'damperSpring', 'buttSpring', 'buttCenter', 'strap']);
  let exam = { started: false }, examMinutes = 65;
  const clockText = () => { const s = Math.max(0, Math.round((exam.endAt - Date.now()) / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} left`; };
  function startExam() {
    const lv = level(), shared = deregulated();
    const dealt = () => { for (let i = 0; i < 50; i++) { const b = { ...deregulated(), railShim: shared.railShim, softFelt: shared.softFelt, damage: null }; if (fairStart(b)) return b; } return { ...FACTORY, damage: null }; };
    const notes = [0, 1, 2].map(() => ({ a: dealt(), tested: new Set() }));
    // at the top level one note may hold a worn or broken part: leaving it caps the score below a pass (the sim's own;
    // in PTG's exam, repairs are a separate section)
    if (lv.tolK < 1) { const keys = Object.keys(DAMAGE); notes[Math.floor(Math.random() * 3)].a.damage = keys[Math.floor(Math.random() * keys.length)]; }
    exam = { started: true, done: false, level: lv, notes, cur: 1, minutes: examMinutes, endAt: Date.now() + examMinutes * 60000,
      damaged: notes.map(n => n.a.damage) };
    document.getElementById('level').disabled = true;
    goNote(1, true);
  }
  // work on another of the three notes: this one's regulation and tests kept, that one's taken up
  function goNote(i, first = false) {
    if (busy) return;
    if (!first) { exam.notes[exam.cur] = { a: { ...a }, tested }; }
    exam.cur = i;
    S.setPresent([i > 0, i < 2]);
    setRegulation({ ...exam.notes[i].a }, { replace: true });
    tested = exam.notes[i].tested;
    refresh();
  }
  function examScore() {
    exam.notes[exam.cur] = { a: { ...a }, tested };
    const ms = exam.notes.map(n => measure(n.a)), g = (id, i) => grade(id, ms[i], exam.level.tolK);
    // a part's condition is scored only on the note that had something wrong with it
    const rows = SCORED.filter(id => !CONDITION.has(id) || exam.damaged.some(d => DAMAGE[d]?.spec === id)).map(id => ({ id, cells: ms.map((m2, i) =>
      CONDITION.has(id) && DAMAGE[exam.damaged[i]]?.spec !== id ? { skip: true } : { ok: g(id, i).ok, txt: readingText(id, m2) }) }));
    const even = EVEN.map(id => {
      const v = ms.map((m2, i) => g(id, i).v);
      const spread = v.every(x => x != null) ? Math.max(...v) - Math.min(...v) : null;
      return { id, spread, ok: spread !== null && spread <= evenTol(id, exam.level.tolK) + 1e-9 };
    });
    const items = rows.flatMap(r => r.cells.filter(c => !c.skip).map(c => c.ok)).concat(even.map(e => e.ok));
    let pct = Math.round(100 * items.filter(Boolean).length / items.length);
    const missed = exam.notes.some(n => n.a.damage);
    if (missed) pct = Math.min(pct, 79);
    return { rows, even, pct, missed };
  }
  function handIn() { if (busy || !exam.started || exam.done) return; exam.result = examScore(); exam.done = true; document.getElementById('level').disabled = false; refresh(); }
  function leaveExam() { exam = { started: false }; S.setPresent([true, true]); document.getElementById('level').disabled = false; }
  function renderExam(p) {
    if (!exam.started) {
      put(p, el('h2', {}, 'Upright exam: three notes'),
        el('p', {}, 'Three neighboring notes, each knocked out of regulation, to regulate in the time: the same steps as Learn, with one hammer rail and soft pedal shared by all three. You\'re scored on each note against the specs, and on how even the three are: each reading\'s spread across the three within one note\'s tolerance (and never finer than one paper punching or capstan step moves it).'),
        el('p', { class: 'muted small' }, 'PTG\'s vertical exam section is a disassembled three-note action model with pedals: you assemble it, then regulate all three notes and the pedals in 65 minutes, scored for their consistency and accuracy (Technical Exam Source Book Addendum, 2005). Here the model comes assembled and the scoring is the sim\'s own practice scoring, not PTG\'s sheet. At the top skill level one note may also hold a worn or broken part: in the real exam, repairs are a separate section.'),
        el('p', { class: 'muted small' }, 'An independent practice tool, not affiliated with or endorsed by the Piano Technicians Guild.'),
        el('div', { class: 'row' }, el('span', { class: 'muted' }, 'Clock:'), EXAM_CLOCKS.map(n => el('button', { class: n === examMinutes ? 'on' : '', onclick: () => { examMinutes = n; refresh(); } }, `${n} min`))),
        el('div', { class: 'row' }, el('button', { class: 'primary', onclick: startExam }, 'Start the exam')));
      return;
    }
    if (exam.done) {
      const r = exam.result, note = ['Note 1', 'Note 2', 'Note 3'];
      put(p, el('h2', {}, `Score: ${r.pct}%${r.pct >= 80 ? ', a pass' : ''}`),
        r.missed ? el('p', { class: 'verdict bad' }, 'A worn or broken part was left in the action, so the score is capped below a pass.') : null,
        el('table', { class: 'specs score' }, el('thead', {}, el('tr', {}, el('th', {}, 'Check'), note.map(n => el('th', {}, n)))),
          el('tbody', {}, r.rows.map(row => el('tr', {}, el('td', {}, SPEC_NAMES[row.id]),
            row.cells.map(c => c.skip ? el('td', { class: 'muted' }, '—') : el('td', { class: c.ok ? 'okc' : 'badc' }, `${c.ok ? '✓' : '✗'} ${c.txt}`)))))),
        el('h3', {}, 'Evenness across the three'),
        el('table', { class: 'specs score' }, el('tbody', {}, r.even.map(e => el('tr', {}, el('td', {}, SPEC_NAMES[e.id]),
          el('td', { class: e.ok ? 'okc' : 'badc' }, `${e.ok ? '✓' : '✗'} spread ${e.spread == null ? '—' : e.id === 'damperTiming' ? `${Math.round(100 * e.spread)}%` : `${e.spread.toFixed(2)} mm`}`))))),
        el('div', { class: 'row' }, el('button', { class: 'primary', onclick: () => { exam = { started: false }; S.setPresent([true, true]); refresh(); } }, 'Start a new exam')));
      return;
    }
    put(p, el('div', { class: 'row notes' }, [0, 1, 2].map(i => el('button', { class: i === exam.cur ? 'on' : '', disabled: busy ? '' : false, onclick: () => goNote(i) },
      `Note ${i + 1}${i === 0 ? ' (bass)' : i === 2 ? ' (treble)' : ''}`))),
      el('p', { class: 'muted small' }, `${clockText()}. Run the tests, adjust and repair; the hammer rail\'s rest felts and the soft pedal are shared by all three notes. ${level().live ? '' : 'Click a part on the action to adjust it.'}`),
      AREAS.map(ar => el('details', { class: 'fold', open: '' }, el('summary', {}, ar.name),
        el('div', { class: 'row' }, ar.tests.map(testButton)), readingsTable(ar.specs),
        level().live ? el('div', { class: 'knobs' }, ar.knobs.map(k => knobRow(k))) : null, repairButtons(ar.specs))));
    put(document.getElementById('actionbar'), el('div', { class: 'row' }, el('button', { class: 'primary', disabled: busy ? '' : false, onclick: handIn }, 'Hand it in')));
  }
  // ---------- drills (C8): strap or no strap, Jim Ellis's test as S15 filmed it, beside the sim's own runs ----------
  // data/upright-ellis.json (tests/upright-ellis-data.mjs): the hammer's angle from rest after a quick release from
  // check, every case filmed and simulated
  let ellis = null, ellisShown = { bs: true, b: true, s: true, 0: true };
  const ELLIS_COLORS = { bs: '#c4482a', b: '#3a6ea5', s: '#2f8a52', 0: '#8a6a20' };
  function renderDrills(p) {
    if (!ellis) {
      put(p, el('p', { class: 'muted' }, 'Loading the filmed runs…'));
      fetch('./data/upright-ellis.json').then(r => r.json()).then(d => { ellis = d; refresh(); }).catch(() => { ellis = { failed: true }; refresh(); });
      return;
    }
    if (ellis.failed) { put(p, el('p', {}, 'The filmed runs could not load. Try reloading the page.')); return; }
    const canvas = el('canvas', { class: 'drillcanvas', width: 720, height: 420 });
    put(p, el('h2', {}, 'Strap or no strap'),
      el('p', {}, 'Jim Ellis RPT timed the hammer coming back from the backcheck to its rail on a quick release, with the bridle strap and the butt spring each on or off. He found the strap\'s main job is repetition: strap and spring together bring the hammer home fastest, and with neither it takes about twice as long. PTG\'s high-speed clips redo his test on an upright action model; the sim\'s physics were fitted to them.'),
      canvas,
      el('p', { class: 'muted small' }, 'Solid: filmed. Dashed: the sim. The hammer\'s angle from where it rests, from the moment the key is let go; each line ends on the rail.'),
      el('table', { class: 'specs' }, el('thead', {}, el('tr', {}, el('th', {}, 'Case'), el('th', {}, 'Filmed'), el('th', {}, 'Sim'), el('th', {}, 'Yours'))),
        el('tbody', {}, Object.entries(ellis.cases).map(([k, c]) => el('tr', {},
          el('td', {}, el('label', {}, el('input', { type: 'checkbox', checked: ellisShown[k] ? '' : false, onchange: e => { ellisShown[k] = e.target.checked; refresh(); } }),
            ' ', el('span', { style: `color:${ELLIS_COLORS[k]};font-weight:600` }, c.label)),
            el('div', {}, el('button', { class: 'test', 'data-time': k, disabled: busy ? '' : false, onclick: () => timeCase(k) }, '▶ Time it'))),
          el('td', {}, `${Math.round(c.filmRailMs)} ms`), el('td', {}, c.simRailMs ? `${Math.round(c.simRailMs)} ms` : '—'),
          el('td', { 'data-timed': k }, k in drillTimes ? `${drillTimes[k] ?? '—'} ms` : '—'))))),
      el('p', {}, el('b', {}, 'Your turn. '), 'Before you time them, decide: which case comes home last, and which two are closest together? Then time each one on the sim\'s own action. Each run plays a moderate blow at the factory regulation, holds the key, and lets it go at the filmed speed, with the strap broken or the butt spring unhooked as the case says; watch the strap go straight for a moment as the key gets home.'),
      el('p', { class: 'muted small' }, 'Your times differ a little from the Sim column: that column is the sim set up as the filmed model was (a longer blow, its own checking distance); yours is the factory regulation. In the Sandbox the same thing shows on the event line: break the bridle strap or the butt spring, strike and hold, let the key go, and read "Hammer home in … ms".'),
      el('p', { class: 'credit' }, 'Jim Ellis RPT, "Bridle Strap Function", Piano Technicians Journal, Dec 1997; high-speed video from PTG\'s Education Hub (main videos narrated by Scott Murphy RPT).'));
    drawEllis(canvas);
  }
  // one of Ellis's four cases on the sim's own action: a moderate blow held, then the key let go at the filmed speed
  const drillTimes = {};
  async function timeCase(key) {
    if (busy) return;
    const c = ellis.cases[key];
    dropHand(); busy = true; plan = null; testScale = 0.1; closeCard();
    for (const k of Object.keys(a)) delete a[k];
    Object.assign(a, FACTORY, { damage: null, noStrap: !c.strap, noSpring: !c.spring }); m = measure(a);
    sim = new Sim(a); testEvents = []; log.length = 0; refresh(); view('check');
    try {
      sim.press(sim.dip, STRIKE); await ctx.run(0.3);
      const t0 = sim.t; let home;
      sim.press(0, UP);
      for (let i = 0; i < 14 && !home; i++) { await ctx.run(0.03); home = testEvents.find(e => e.type === 'rail' && e.t > t0); }
      drillTimes[key] = home ? Math.round(1000 * (home.t - t0)) : null;
      ctx.say(home ? `${c.label}: the hammer was home ${drillTimes[key]} ms after the key was let go (filmed: ${Math.round(c.filmRailMs)} ms)` : `${c.label}: the hammer didn't get home in 400 ms`);
      await ctx.run(0.1); await ctx.pause(0.8);
    } catch (err) { console.error(err); }
    delete a.noStrap; delete a.noSpring; m = measure(a); sim = new Sim(a); sim.setSoft(softOn); sim.setPedal(sustainOn); sim.soft = softOn ? 1 : 0; sim.pedal = sustainOn ? 1 : 0;
    testRun = null; busy = false; idle = false; refresh();
  }
  function drawEllis(cv) {
    const g = cv.getContext('2d'), W = cv.width, Hh = cv.height, L = 56, B = 40, T = 14, R = 14;
    const css = getComputedStyle(document.documentElement), ink = css.getPropertyValue('--ink').trim() || '#222', muted = css.getPropertyValue('--muted').trim() || '#777';
    const all = Object.values(ellis.cases).flatMap(c => c.film.deg.concat(c.sim.deg)), yMax = Math.ceil(Math.max(...all) / 5) * 5, yMin = Math.floor(Math.min(0, ...all));
    const X = t => L + (W - L - R) * t / 300, Y = d => T + (Hh - T - B) * (yMax - d) / (yMax - yMin);
    g.clearRect(0, 0, W, Hh); g.font = '20px system-ui'; g.fillStyle = muted; g.strokeStyle = muted; g.lineWidth = 1;
    for (let t = 0; t <= 300; t += 50) { g.beginPath(); g.moveTo(X(t), Y(yMin)); g.lineTo(X(t), Y(yMin) + 5); g.stroke(); g.fillText(`${t}`, X(t) - 12, Hh - 12); }
    for (let d = yMin; d <= yMax; d += 5) { g.fillText(`${d}°`, 4, Y(d) + 6); g.globalAlpha = 0.25; g.beginPath(); g.moveTo(L, Y(d)); g.lineTo(W - R, Y(d)); g.stroke(); g.globalAlpha = 1; }
    g.fillStyle = ink; g.fillText('ms', W - R - 26, Y(yMin) - 8);
    for (const [k, c] of Object.entries(ellis.cases)) {
      if (!ellisShown[k]) continue;
      g.strokeStyle = ELLIS_COLORS[k]; g.lineWidth = 3;
      for (const [line, dash] of [[c.film, []], [c.sim, [10, 7]]]) {
        g.setLineDash(dash); g.beginPath();
        let started = false;   // (the film starts 10 ms before the release: those points are left off)
        line.t.forEach((t, i) => { if (t < 0 || t > 300) return; started ? g.lineTo(X(t), Y(line.deg[i])) : g.moveTo(X(t), Y(line.deg[i])); started = true; });
        g.stroke();
      }
      g.setLineDash([]);
    }
  }
  function renderPanel(p) {
    if (mode === 'learn') renderLearn(p); else if (mode === 'diagnose') renderDiagnose(p); else if (mode === 'exam') renderExam(p);
    else if (mode === 'drills') renderDrills(p); else renderSandbox(p);
    renderCard();
  }
  function renderCredits(p, back) {
    const all = Object.values(TIPS).flat(), people = [...new Set(all.map(t => t.who))].sort();
    put(p, el('h2', {}, 'From the bench: upright credits'),
      el('p', {}, 'Regulation is passed hand to hand. These tips and tools come from the technicians named here; thank you.'),
      el('h3', {}, 'Tools'), el('ul', {}, TOOLS.map(t => el('li', {}, el('b', {}, t.name), ` (${t.who}): ${t.what} `, t.url ? el('a', { href: t.url, target: '_blank', rel: 'noopener' }, 'link') : null))),
      el('h3', {}, 'Technicians and sources'), el('p', {}, people.join(' · ')),
      el('h3', {}, 'The action'),
      el('p', {}, 'Traced from high-speed video of an upright action model in PTG\'s Education Hub (narrated by Scott Murphy RPT), with its timing fitted to Jim Ellis\'s bridle strap test. The steps follow Steinway\'s upright regulation chapter, Bill Spurlock\'s "Vertical Regulation" and Mario Igrec\'s Pianos Inside Out.'),
      el('div', { class: 'row' }, el('button', { onclick: back }, '← Back')));
  }

  // ---------- the part card: a clicked part's knobs and what they set ----------
  function openCard(hit, x, y) {
    if (!PART_KNOBS[hit.part]) { closeCard(); toast(hit.name); return; }   // a part with no knobs of its own: its name
    cardPart = hit.part; card.style.left = `${Math.min(x + 12, canvas.clientWidth - 290)}px`; card.style.top = `${Math.max(8, Math.min(y - 20, canvas.clientHeight - 320))}px`;
    S.highlight(PART_KNOBS[hit.part].flatMap(k => KNOB_PARTS[k]).concat(hit.part));
    renderCard();
  }
  const stepParts = () => { const st = STEPS[stepIdx]; return mode === 'learn' && st && !st.info ? st.knobs.flatMap(k => KNOB_PARTS[k]) : []; };
  function closeCard() { if (cardPart) S.highlight(stepParts()); cardPart = null; card.hidden = true; }
  function renderCard() {
    if (!cardPart) return;
    card.replaceChildren(el('div', { class: 'pop-head' }, el('b', { style: 'flex:1' }, S.PART_NAMES[cardPart] || cardPart), el('button', { class: 'pop-x', title: 'Close', onclick: closeCard }, '×')),
      ...PART_KNOBS[cardPart].map(k => el('div', { class: 'pop-knob' }, knobRow(k, { sets: true }))));
    card.hidden = false;
  }

  // ---------- pointer and keys ----------
  const tip = $('#tip');
  let keyHeld = null, clickAt = null;
  canvas.addEventListener('pointermove', e => {
    if (grab) { if (grab.id === e.pointerId) moveGrab(e); return; }
    const hit = S.pick(e), hold = holdOf(hit);
    canvas.style.cursor = hold ? 'move' : hit?.part === 'key' ? 'pointer' : '';
    if (hit) { tip.textContent = hit.name + (hold ? ` · drag to move ${HOLD_NAMES[hold]}` : ''); tip.style.transform = `translate(${e.offsetX + 14}px, ${e.offsetY + 10}px)`; tip.hidden = false; } else tip.hidden = true;
  });
  canvas.addEventListener('pointerleave', () => { tip.hidden = true; });
  canvas.addEventListener('pointerdown', e => {
    if (grab) return;   // a second finger while a part is held does nothing (the view's controls are off till it comes up)
    const hit = S.pick(e);
    // Move parts (hand.js): the part is taken hold of once the pointer moves; let go where it was pressed, it was a click
    // (Shift or Ctrl still slides the view)
    const hold = e.button === 0 && e.isPrimary && !e.shiftKey && !e.ctrlKey && !e.metaKey ? holdOf(hit) : null;
    if (hold) { S.controls.enabled = false; grab = { id: e.pointerId, x: e.clientX, y: e.clientY, hit, hold, started: false, ox: e.offsetX, oy: e.offsetY }; tip.hidden = true; return; }
    if (hit?.part === 'key' && !busy && e.button === 0) { keyHeld = e.pointerId; S.controls.enabled = false; play('hold'); return; }
    clickAt = e.button !== 0 || !e.isPrimary ? null : { x: e.clientX, y: e.clientY, id: e.pointerId, hit, ox: e.offsetX, oy: e.offsetY };
  });
  canvas.addEventListener('pointerup', e => {
    // not moved: a click, which opens the part's card; the key plays, as Play does
    if (grab?.id === e.pointerId) { const g = endGrab(); if (!g.started && !g.dropped) g.hit.part === 'key' ? play('play') : openCard(g.hit, g.ox, g.oy); return; }
    const c = clickAt; clickAt = null;
    if (!c || c.id !== e.pointerId || Math.hypot(e.clientX - c.x, e.clientY - c.y) > 6) return;
    if (c.hit) openCard(c.hit, c.ox, c.oy); else { closeCard(); S.highlight([]); }
  });
  // ---------- Move parts: dragging a part moves it by hand (hand.js) ----------
  // The wippen lifts off its capstan, the key staying where it is; the jack trips toward the player; the hammer lifts
  // toward the strings; the damper lever swings off the strings. Only the middle note: its neighbors are drawn at rest.
  // { id, x, y: where the pointer went down, hit, hold, started, lo, hi, sim, dropped } from a press on a part till that
  // pointer comes up (dropped: the part let go of before then)
  let grab = null;
  const holdOf = hit => hand.on && active && hit && hit.note === 0 && !busy && !override ? UPRIGHT_HOLD[hit.part] ?? null : null;
  const phiAt = d => wippenOn(capstanTop(sim.a, keyAngle(sim.a, d)));
  function holdRange(hold) {
    if (hold === 'key') return [sim.d, 0, sim.dip];
    if (hold === 'wippen') { const lo = phiAt(sim.d); return [sim.phi, lo, Math.max(lo, phiAt(sim.dip)) + 0.02]; }
    if (hold === 'jack') return [sim.psi, sim.psi, sim.psi + 0.3];
    if (hold === 'hammer') return [sim.g, gRail({ ...sim.a, railShim: sim.railShim() }), gString()];
    return [sim.dl, 0, 0.06];
  }
  const FIELD = { wippen: 'phi', jack: 'psi', hammer: 'g', damper: 'dl' };
  // the note drawn with the held part at q, for dragTo to see where the spot grabbed goes
  function heldAt(hold, q) {
    const p = sim.pose();
    return hold === 'key' ? { ...p, d: q, th: keyAngle(sim.a, q).th } : { ...p, [FIELD[hold]]: q };
  }
  function moveGrab(e) {
    if (grab.dropped) return;
    if (!grab.started) {
      if (Math.hypot(e.clientX - grab.x, e.clientY - grab.y) < 4) return;
      const [q, lo, hi] = holdRange(grab.hold);
      Object.assign(grab, { started: true, lo, hi, sim });
      if (grab.hold === 'key') plan = null;
      testEvents = [];   // the callouts read this move's events
      sim.grab(grab.hold, q); idle = false;
    }
    if (grab.sim !== sim || !sim.hand) { grab.dropped = true; return; }   // the regulation changed under it: a new Sim
    const r = canvas.getBoundingClientRect();
    sim.hand.q = dragTo({ obj: grab.hit.obj, local: grab.hit.local, camera: S.camera, canvas, q: sim.hand.q, lo: grab.lo, hi: grab.hi,
      x: e.clientX - r.left, y: e.clientY - r.top, pose: q => S.update(a, heldAt(grab.hold, q), 0) });
    S.update(a, sim.pose(), 0);   // drawn where it really is again
  }
  // let the part go (the key comes back up by itself). The pointer stays the grab's till it comes up, so the view
  // doesn't start turning under it mid-drag.
  function letGoOf(g) { if (g.started && g.sim === sim && sim.hand) { sim.letGo(); idle = false; if (g.hold === 'key') keyUp(); } }
  function dropHand() { if (grab && !grab.dropped) { grab.dropped = true; letGoOf(grab); } }
  // the pointer up: let go, and the view turns again; returns what was held
  function endGrab() {
    const g = grab;
    if (!g) return null;
    grab = null; S.controls.enabled = true;
    if (!g.dropped) letGoOf(g);
    return g;
  }
  const letUp = () => { if (!busy) { keyUp(); idle = false; } };
  const endHold = e => {
    if (grab && (e.pointerId === undefined || e.pointerId === grab.id)) endGrab();
    if (keyHeld !== null && (e.pointerId === undefined || e.pointerId === keyHeld)) { keyHeld = null; S.controls.enabled = true; letUp(); }
  };
  window.addEventListener('pointerup', endHold); window.addEventListener('pointercancel', endHold); window.addEventListener('blur', endHold);
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('keydown', e => {
    if (!active || busy || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code === 'Escape') { play('up'); closeCard(); }
    // H and S as the grand's: shown on their buttons
    const k = !e.repeat && !/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) && { h: 'hold', s: 'slow' }[e.key.toLowerCase()];
    if (k) play(k);
    if (e.target !== document.body) return;
    if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) play('hold'); }
    if ((e.key === 'p' || e.key === 'P') && !e.repeat) setSustain(!sustainOn);
  });
  window.addEventListener('keyup', e => { if (active && e.code === 'Space' && e.target === document.body) letUp(); });

  // ---------- shown and hidden by the app's switch ----------
  let insetSet = false;
  function show() {
    active = true; view(viewNow);
    if (!insetSet) { insetSet = true; setInset(document.getElementById('stage').clientWidth >= 700); }
  }
  function hide() { dropHand(); active = false; closeCard(); tip.hidden = true; plan = null; letUp(); }
  function setMode(next) {
    if (busy || next === mode) return;
    if (exam.started && !exam.done && !confirm('Leave the exam? Your progress will be lost.')) return;
    if (exam.started) leaveExam();
    mode = ['learn', 'diagnose', 'exam', 'drills'].includes(next) ? next : 'sandbox';
    closeCard(); S.highlight([]);
    if (mode === 'exam') { exam = { started: false }; setRegulation({ ...FACTORY, damage: null }, { keepTested: false, replace: true }); return; }
    if (mode === 'learn') { setRegulation({ ...deregulated(), damage: null }, { keepTested: false }); goStep(0); }
    else if (mode === 'diagnose') { scenario = null; newCase(); }
    else setRegulation({ ...FACTORY, damage: null }, { keepTested: false });
  }
  // ---------- the bench bar (bench-ui.js): this action's undo and redo, before and after, save and load, print ----------
  // One note's regulation. Not in the exam, whose three notes share a rail: there it only prints.
  const BENCH_RULES = { factory: FACTORY, limits: Object.fromEntries(ADJ.map(d => [d.id, [d.min, d.max]])), enums: { damage: Object.keys(DAMAGE) } };
  const tidy = b => Object.fromEntries(Object.entries(b).filter(([k, v]) => v != null && (k in BENCH_RULES.limits || k === 'damage')).sort(([x], [y]) => (x < y ? -1 : 1)));
  const benchRows = mm => ALL_SPECS.map(id => { const r = grade(id, mm, level().tolK); return { id, name: SPEC_NAMES[id], txt: `${readingText(id, mm)}${r.note ? ` · ${r.note}` : ''}`, ok: r.ok, shown: revealed(id) }; });
  const bench = {
    name: 'upright', rules: BENCH_RULES,
    can: () => ({ edit: mode === 'learn' || mode === 'sandbox' || (mode === 'diagnose' && !!scenario), print: mode !== 'drills' && (mode !== 'exam' || !!exam.started) }),
    context: () => `${mode}|${dealt}`,
    snap: () => ({ notes: [tidy(a)] }),
    restore: st => { if (busy) return false; setRegulation({ damage: null, ...st.notes[0] }, { replace: true }); },
    notes: st => st.notes,
    fault: () => (mode === 'diagnose' && scenario ? { c: scenario.complaint, w: scenario.custom ? scenario.cause : `${scenario.cause}. ${alsoText(scenario) ? `${alsoText(scenario)}. ` : ''}The fix: ${scenario.fix}.` } : null),
    draft: st => {
      const parts = Object.entries(diffAdj(st.notes[0], BENCH_RULES)).map(([k, v]) => typeof v === 'string' ? DAMAGE[v].name.toLowerCase()
        : `${ADJ.find(x => x.id === k).name.toLowerCase()} ${v > 0 ? '+' : '−'}${Math.abs(v).toFixed(2)} mm from factory`);
      return parts.length ? `Set up with: ${parts.join('; ')}.` : 'Nothing is out: this action is at its factory regulation.';
    },
    open: st => {
      if (busy || (exam.started && !exam.done)) return false;
      if (exam.started) leaveExam();
      closeCard(); S.highlight([]);
      if (st.k === 'fault') { mode = 'diagnose'; scenario = { id: 'custom', custom: true, complaint: st.c, cause: st.w || 'No note was left with it.', fix: '', also: [] }; lastCase = null; gaveUp = false; }
      else mode = 'sandbox';
      setRegulation({ damage: null, ...st.notes[0] }, { keepTested: false, replace: true });
    },
    readings: st => benchRows(measure(st.notes[0])),
    record: () => {
      const meta = [{ learn: 'Learn', diagnose: 'Find the fault', sandbox: 'Sandbox', exam: 'Exam practice' }[mode], `${level().name} level`];
      if (mode === 'exam' && exam.done) return { title: 'Upright action regulation: exam practice', meta, tables: [], copy: document.getElementById('mode') };
      if (mode === 'exam') meta.push(`note ${exam.cur + 1} of 3`);
      const rows = benchRows(m), seen = rows.filter(r => r.shown);
      meta.push(`${seen.filter(r => r.ok).length} of ${seen.length} measured readings in spec${seen.length < rows.length ? `, ${rows.length - seen.length} not measured` : ''}`);
      if (mode === 'diagnose' && scenario) meta.push(`the customer said: “${scenario.complaint}”`);
      return { title: 'Upright action regulation record', meta, tables: [{ head: ['Check', 'Target', 'Reading', 'In spec'],
        rows: rows.map(r => [r.name, bandText(r.id), r.shown ? { txt: r.txt, ok: r.ok } : { txt: 'not measured', ok: null }, !r.shown ? '' : r.ok ? 'pass' : 'OUT']) }] };
    },
  };
  return { S, bench, show, hide, frame, setMode, renderPanel, renderCredits, dropHand, get mode() { return mode; }, get busy() { return busy; },
    get examRunning() { return exam.started && !exam.done; } };
}
