// Tool bag entries: models of real regulation tools, added a few at a time, one bag per action; and the Tools panel
// both actions show them in.
import capstanWrench from './tools/capstan-wrench.js';
import letoffRegulator from './tools/letoff-regulator.js';
import dropScrewRegulator from './tools/drop-screw-regulator.js';
import keyDipBlock from './tools/key-dip-block.js';
import spoonBender from './tools/spoon-bender.js';
import damperWireRegulator from './tools/damper-wire-regulator.js';
import bridleWireBender from './tools/bridle-wire-bender.js';

export const TOOLBAG = [capstanWrench, letoffRegulator, dropScrewRegulator, keyDipBlock];
export const UPRIGHT_TOOLBAG = [spoonBender, damperWireRegulator, bridleWireBender];

// The panel: the bag's buttons and the picked tool's card. el and put: the app's DOM helpers; tools: the bag; sel: the
// picked tool's id; pick(id): put that tool on the bench; stepTitle(id): the Learn step a tool's steps[] entry names
// (none: not linked); goLearn(id): open that step.
export function renderToolBag(p, { el, put, tools, sel, pick, stepTitle, goLearn }) {
  const t = tools.find(x => x.id === sel);
  put(p, el('h2', {}, 'Tool bag'),
    el('p', { class: 'muted' }, 'Regulating tools and what they do. Pick one to see it on the bench; drag to turn it. Grid squares are 10 mm.'),
    el('div', { class: 'toolgrid' }, tools.map(x => el('button', { class: 'toolbtn' + (x.id === sel ? ' on' : ''), onclick: () => pick(x.id) }, x.name))),
    t ? el('div', { class: 'toolcard' },
      el('h3', {}, t.name),
      el('p', {}, t.what),
      t.how?.length ? el('ol', {}, t.how.map(h => el('li', {}, h))) : null,
      t.dims ? el('p', { class: 'muted small' }, el('b', {}, 'Dimensions: '), t.dims) : null,
      t.steps?.filter(stepTitle).length ? el('p', { class: 'small' }, 'Used in: ', t.steps.filter(stepTitle).flatMap((id, i) => [i ? ', ' : '',
        el('button', { class: 'linkish', onclick: () => { goLearn(id); } }, stepTitle(id))])) : null,
      t.credit ? el('p', { class: 'credit' }, t.credit) : null) : null,
    el('p', { class: 'muted small' }, 'Models of real regulation tools, added a few at a time.'));
}
