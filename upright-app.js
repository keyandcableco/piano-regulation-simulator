// The upright action in the app (research/upright/protocol.md, chunk C6). app.js keeps the grand's code paths as they
// were; when the header's switch picks the upright it hands this module the picture, the panel, the loop and the move
// buttons. The page's one class (#app.upright, index.html) hides the grand's canvas, view and key buttons and shows
// this module's, which sit in the same bars so the phone layouts carry over.
// The upright's model, drawing and content are upright-model.js, scene-upright.js and content-upright.js. It has Learn
// and the Sandbox; Find the fault, the exam, drills and tools come with C5, C7 and C8.
import { FACTORY, ADJ, SPEC, DAMAGE, Sim, measure, grade, pose, DAMPER_PEDAL_LIFT } from './upright-model.js';
import { createUprightScene } from './scene-upright.js';
import { STEPS, TESTS, TIPS, TOOLS, SPEC_NAMES, REPAIRS, SCENARIOS, bandText, readingText, callouts, deregulated, creditOf } from './content-upright.js';

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
const VIEW_BUTTONS = [['action', 'Action'], ['angle', '3/4'], ['keyfront', 'Key front'], ['whole', 'Key'], ['butt', 'Jack & butt'], ['jackfront', 'Jack from the keys'],
  ['check', 'Backcheck'], ['wippen', 'Wippen'], ['damper', 'Damper'], ['front', 'From the keys']];
const EVENT_TEXT = {
  letoff: e => `Let off ${e.dist.toFixed(1)} mm from the strings`, strike: e => `Struck at ${e.v.toFixed(1)} m/s`, blocked: () => 'Blocked on the strings',
  checked: e => `Checked ${e.dist.toFixed(1)} mm from the strings`, reset: () => 'Jack back under the butt', seated: () => 'Damper back on the strings',
  straptaut: () => 'The strap pulls',
};
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
  const viewBtns = VIEW_BUTTONS.map(([v, label]) => mark(el('button', { 'data-uview': v, onclick: () => view(v) }, label)));
  const labelsBtn = mark(el('button', { title: 'Show part names', onclick: () => { labelsOn = !labelsOn; S.setLabels(labelsOn); labelsBtn.classList.toggle('on', labelsOn); } }, 'Labels'));
  // the key front in a corner, as the grand has it: on where the stage has room
  const insetBtn = mark(el('button', { title: 'A small view of the key front in the corner, so you can watch the key travel while the main view shows the action',
    onclick: () => setInset(!insetBtn.classList.contains('on')) }, 'Key inset'));
  const setInset = on => { S.setInset(on); insetBtn.classList.toggle('on', on); };
  S.insetEl.onclick = () => view('keyfront');
  $('#views').append(...viewBtns, labelsBtn, insetBtn);
  const keyState = mark(el('span', { class: 'u-keystate' })), lastEvent = mark(el('span', { class: 'u-lastevent' })), keyPos = mark(el('span', { class: 'u-keypos' }));
  $('#keystatus').append(keyState, lastEvent, mark(el('span', { class: 'sep' })), keyPos);
  const kb = (label, title, onclick) => mark(el('button', { title, onclick }, label));
  const softBtn = kb('Soft pedal', 'Soft pedal down or up', () => setSoft(!softOn));
  const susBtn = kb('Sustain pedal', 'Sustain pedal down or up (P)', () => setSustain(!sustainOn));
  const speedBtns = [[1, 'Real speed'], [0.1, 'Slow ×10'], [0.02, 'Slow ×50']].map(([s, label]) =>
    mark(el('button', { 'data-uspeed': s, class: s === speed ? 'on' : '', onclick: () => setSpeed(s) }, label)));
  const keyBtns = [
    kb('Play', 'Strike the key and let it come back up', () => play('play')),
    kb('Strike & hold', 'Strike and keep holding the key down (or hold Space, or press and hold on the key)', () => play('hold')),
    kb('Press slowly', 'Press the key slowly to the bottom and hold it there', () => play('slow')),
    kb('Let key up', 'Let the key all the way up (Esc)', () => play('up')),
    softBtn, susBtn];
  $('#keybar').append(...keyBtns, mark(el('span', { class: 'sep' })), ...speedBtns);
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
    sim = new Sim(a); sim.setSoft(softOn); sim.setPedal(sustainOn); sim.soft = softOn ? 1 : 0; sim.pedal = sustainOn ? 1 : 0;
    if (!keepTested) tested = new Set();
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

  // ---------- the key and pedals ----------
  function play(kind) {
    if (busy) return;
    plan = null; idle = false;
    if (kind !== 'up') testEvents = [];   // the callouts read this press's events
    if (kind === 'up') { sim.press(0, UP); return; }
    if (kind === 'slow') { sim.press(sim.dip, SLOW); return; }
    sim.press(sim.dip, STRIKE);
    if (kind === 'play') plan = 'up';
  }
  function setSoft(on) { if (busy) return; idle = false; testEvents = []; softOn = on; sim.setSoft(on); softBtn.classList.toggle('on', on); }
  function setSustain(on) { if (busy) return; idle = false; testEvents = []; sustainOn = on; sim.setPedal(on); susBtn.classList.toggle('on', on); }
  function setSpeed(s) { speed = s; for (const b of speedBtns) b.classList.toggle('on', +b.dataset.uspeed === s); }
  function view(name) { viewNow = name; S.setView(name); for (const b of viewBtns) b.classList.toggle('on', b.dataset.uview === name); }

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
      else if (typeof plan === 'number' && sim.t >= plan) { plan = null; sim.press(0, UP); }
      for (const e of sim.events) {
        testEvents.push(e);
        if (EVENT_TEXT[e.type]) { log.push(EVENT_TEXT[e.type](e)); if (log.length > 3) log.shift(); }
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
      if (busy || plan || !idle) {
        const s0 = state(), n = advance(dtReal * (busy ? testScale : speed));
        // idle only once a frame's steps left everything where it was, the key where it is going
        idle = n > 0 && !busy && !plan && sim.d === sim.dTarget && state().every((v, i) => Math.abs(v - s0[i]) < 1e-9);
        if (idle) lagging = false;
      }
      const p = sim.pose(), railShim = sim.railShim();
      // the neighbors: the exam's other notes as they are now, else the factory key on the same rail (the straightedge's)
      const nbr = slot => {
        const i = exam.started ? exam.cur + (slot === 1 ? -1 : 1) : null;
        const an = i === null ? { ...a, railShim, balPunch: FACTORY.balPunch, frontPunch: FACTORY.frontPunch, capstan: FACTORY.capstan }
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
    keyState.textContent = d < 0.05 && sim.dTarget < 0.05 ? 'Key at rest' : sim.dTarget > sim.d + 0.01 ? 'Key going down' : sim.dTarget > 0.05 ? 'Key held down' : 'Key coming up';
    keyState.classList.toggle('down', d > 0.05);
    keyPos.textContent = `${exam.started && !exam.done ? `note ${exam.cur + 1} · ${clockText()} · ` : ''}key ${d.toFixed(2)} mm down${lagging ? ' · slower than chosen' : ''}`;
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
    say: (text, warn) => { toast(text, warn ? 'warn' : ''); log.push(text); if (log.length > 3) log.shift(); },
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
        bad.length ? el('ul', {}, bad.map(s => el('li', {}, el('button', { class: 'linkish', onclick: () => goStep(STEPS.indexOf(s)) }, s.title)))) : null,
        readingsTable(GRADED.flatMap(specsOf)),
        el('div', { class: 'row' }, el('button', { disabled: busy ? '' : false, onclick: () => { setRegulation(deregulated(), { keepTested: false }); goStep(0); } }, 'Start over with a new key')));
      return;
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
    verdict = { ok: !bad.length, bad };
    refresh();
  }
  function renderDiagnose(p) {
    if (!scenario) { newCase(); return; }
    const knobs = level().live;   // the panel lists the knobs at Apprentice; otherwise they're on the parts (click one)
    put(p, el('h2', {}, 'A customer says:'), el('p', { class: 'note' }, `“${scenario.complaint}”`),
      el('p', { class: 'muted small' }, `Find out what's wrong and put it right: run the tests that would show it, then adjust or repair. ${knobs ? '' : 'Click a part on the action to adjust it. '}Check your work when you think it's done.`),
      verdict ? el('div', { class: 'verdict ' + (verdict.ok ? 'ok' : 'bad') },
        verdict.ok ? el('p', {}, el('b', {}, 'Fixed. '), scenario.cause, '.') : el('p', {}, 'Still out: ', verdict.bad.map(id => SPEC_NAMES[id]).join(', '), '.')) : null,
      gaveUp ? el('div', { class: 'verdict bad' }, el('p', {}, el('b', {}, 'What was wrong: '), scenario.cause, '. ', el('b', {}, 'The fix: '), scenario.fix, '.')) : null,
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
    const notes = [0, 1, 2].map(() => ({ a: { ...deregulated(), railShim: shared.railShim, softFelt: shared.softFelt, damage: null }, tested: new Set() }));
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
  const evenTol = id => { const s = SPEC[id]; return (s.lo !== undefined ? (s.hi - s.lo) / 2 : s.tol) * exam.level.tolK; };
  function examScore() {
    exam.notes[exam.cur] = { a: { ...a }, tested };
    const ms = exam.notes.map(n => measure(n.a)), g = (id, i) => grade(id, ms[i], exam.level.tolK);
    // a part's condition is scored only on the note that had something wrong with it
    const rows = SCORED.filter(id => !CONDITION.has(id) || exam.damaged.some(d => DAMAGE[d]?.spec === id)).map(id => ({ id, cells: ms.map((m2, i) =>
      CONDITION.has(id) && DAMAGE[exam.damaged[i]]?.spec !== id ? { skip: true } : { ok: g(id, i).ok, txt: readingText(id, m2) }) }));
    const even = EVEN.map(id => {
      const v = ms.map((m2, i) => g(id, i).v);
      const spread = v.every(x => x != null) ? Math.max(...v) - Math.min(...v) : null;
      return { id, spread, ok: spread !== null && spread <= evenTol(id) };
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
        el('p', {}, 'Three neighboring notes, each knocked out of regulation, to regulate in the time: the same steps as Learn, with one hammer rail and soft pedal shared by all three. You\'re scored on each note against the specs, and on how even the three are.'),
        el('p', { class: 'muted small' }, 'PTG\'s vertical exam section is a disassembled three-note action model with pedals: you assemble it, then regulate all three notes and the pedals in 65 minutes, scored for their consistency and accuracy (Technical Exam Source Book Addendum, 2005). Here the model comes assembled and the scoring is the sim\'s own practice scoring, not PTG\'s sheet. At the top skill level one note may also hold a worn or broken part: in the real exam, repairs are a separate section.'),
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
      el('table', { class: 'specs' }, el('thead', {}, el('tr', {}, el('th', {}, 'Case'), el('th', {}, 'Filmed'), el('th', {}, 'Sim'))),
        el('tbody', {}, Object.entries(ellis.cases).map(([k, c]) => el('tr', {},
          el('td', {}, el('label', {}, el('input', { type: 'checkbox', checked: ellisShown[k] ? '' : false, onchange: e => { ellisShown[k] = e.target.checked; refresh(); } }),
            ' ', el('span', { style: `color:${ELLIS_COLORS[k]};font-weight:600` }, c.label))),
          el('td', {}, `${Math.round(c.filmRailMs)} ms`), el('td', {}, c.simRailMs ? `${Math.round(c.simRailMs)} ms` : '—'))))),
      el('p', { class: 'muted small' }, 'To feel it on the action: in the Sandbox, break the bridle strap (the parts list) and play at Slow ×50 with a quick release, then put it right and play again.'),
      el('p', { class: 'credit' }, 'Jim Ellis RPT, "Bridle Strap Function", Piano Technicians Journal, Dec 1997; high-speed video from PTG\'s Education Hub (main videos narrated by Scott Murphy RPT).'));
    drawEllis(canvas);
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
        line.t.forEach((t, i) => { if (t > 300) return; i ? g.lineTo(X(t), Y(line.deg[i])) : g.moveTo(X(t), Y(line.deg[i])); });
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
    const hit = S.pick(e);
    canvas.style.cursor = hit?.part === 'key' ? 'pointer' : '';
    if (hit) { tip.textContent = hit.name; tip.style.transform = `translate(${e.offsetX + 14}px, ${e.offsetY + 10}px)`; tip.hidden = false; } else tip.hidden = true;
  });
  canvas.addEventListener('pointerleave', () => { tip.hidden = true; });
  canvas.addEventListener('pointerdown', e => {
    const hit = S.pick(e);
    if (hit?.part === 'key' && !busy && e.button === 0) { keyHeld = e.pointerId; S.controls.enabled = false; play('hold'); return; }
    clickAt = e.button !== 0 || !e.isPrimary ? null : { x: e.clientX, y: e.clientY, id: e.pointerId, hit, ox: e.offsetX, oy: e.offsetY };
  });
  canvas.addEventListener('pointerup', e => {
    const c = clickAt; clickAt = null;
    if (!c || c.id !== e.pointerId || Math.hypot(e.clientX - c.x, e.clientY - c.y) > 6) return;
    if (c.hit) openCard(c.hit, c.ox, c.oy); else { closeCard(); S.highlight([]); }
  });
  const letUp = () => { if (!busy) { sim.press(0, UP); idle = false; } };
  const endHold = e => { if (keyHeld !== null && (e.pointerId === undefined || e.pointerId === keyHeld)) { keyHeld = null; S.controls.enabled = true; letUp(); } };
  window.addEventListener('pointerup', endHold); window.addEventListener('pointercancel', endHold); window.addEventListener('blur', endHold);
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('keydown', e => {
    if (!active || busy || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code === 'Escape') { play('up'); closeCard(); }
    if (e.target !== document.body) return;
    if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) play('hold'); }
    if (e.code === 'KeyP' && !e.repeat) setSustain(!sustainOn);
  });
  window.addEventListener('keyup', e => { if (active && e.code === 'Space' && e.target === document.body) letUp(); });

  // ---------- shown and hidden by the app's switch ----------
  let insetSet = false;
  function show() {
    active = true; view(viewNow);
    if (!insetSet) { insetSet = true; setInset(document.getElementById('stage').clientWidth >= 700); }
  }
  function hide() { active = false; closeCard(); tip.hidden = true; plan = null; letUp(); }
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
  return { S, show, hide, frame, setMode, renderPanel, renderCredits, get mode() { return mode; }, get busy() { return busy; },
    get examRunning() { return exam.started && !exam.done; } };
}
