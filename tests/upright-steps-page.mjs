// The upright's Learn steps as one page to read (protocol 5.3, C4: "Greg reads it"), straight from content-upright.js.
// node tests/upright-steps-page.mjs <out.html>
import { writeFileSync } from 'node:fs';
import { ADJ, SPEC, FACTORY, measure } from '../upright-model.js';
import { STEPS, TESTS, TIPS, TOOLS, SPEC_NAMES, bandText, readingText, creditOf } from '../content-upright.js';

const out = process.argv[2];
if (!out) { console.error('usage: node tests/upright-steps-page.mjs <out.html>'); process.exit(2); }
const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const m = measure(FACTORY);
const specsOf = s => [s.spec, ...(s.also ?? [])];
const link = t => t.url ? `<a href="${esc(t.url)}">${esc(creditOf(t))}</a>` : esc(creditOf(t));

const steps = STEPS.map((s, i) => {
  const parts = [`<h2>${i + 1}. ${esc(s.title)}${s.info ? ' <span class="tag">not in the sim</span>' : ''}</h2>`, `<p>${esc(s.what)}</p>`, `<p><b>How:</b> ${esc(s.how)}</p>`];
  if (s.note) parts.push(`<p class="note">${esc(s.note)}</p>`);
  if (!s.info) {
    parts.push('<table><tr><th>Graded</th><th>Pass band</th><th>Factory</th></tr>' + specsOf(s).map(id =>
      `<tr><td>${esc(SPEC_NAMES[id])}</td><td>${esc(bandText(id))}</td><td>${esc(readingText(id, m))}</td></tr>`).join('') + '</table>');
    parts.push(`<p class="small"><b>Knobs:</b> ${s.knobs.map(k => { const d = ADJ.find(x => x.id === k); return `${esc(d.name)} (a step: ${d.step} ${d.unit})`; }).join('; ')}</p>`);
    parts.push(`<p class="small"><b>Tests:</b> ${(s.tests ?? [s.test]).map(t => esc(TESTS[t].label)).join('; ')}</p>`);
  }
  const tips = TIPS[s.id ?? s.spec] ?? [];
  if (tips.length) parts.push('<h3>From the bench</h3><ul>' + tips.map(t => `<li>${esc(t.text)} <span class="credit">(${link(t)})</span></li>`).join('') + '</ul>');
  return `<section>${parts.join('\n')}</section>`;
}).join('\n');

writeFileSync(out, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Upright Learn steps</title>
<style>
:root { --ink: #1f2328; --muted: #5d6670; --bg: #fbfaf7; --line: #d9d6cf; --tag: #8a5a00; }
@media (prefers-color-scheme: dark) { :root { --ink: #e6e3dc; --muted: #a6adb4; --bg: #1c1d1f; --line: #3a3c40; --tag: #e0b050; } }
body { margin: 0; background: var(--bg); color: var(--ink); font: 16px/1.5 system-ui, sans-serif; }
main { max-width: 760px; margin: 0 auto; padding: 16px; }
h1 { font-size: 24px; margin: 8px 0; } h2 { font-size: 19px; margin: 28px 0 6px; } h3 { font-size: 15px; margin: 12px 0 4px; }
section { border-top: 1px solid var(--line); } p { margin: 6px 0; } .note { color: var(--muted); } .small { font-size: 14px; color: var(--muted); }
.tag { font-size: 12px; font-weight: 600; color: var(--tag); border: 1px solid var(--tag); border-radius: 4px; padding: 1px 6px; vertical-align: middle; }
table { border-collapse: collapse; margin: 8px 0; font-size: 14px; width: 100%; } td, th { border-bottom: 1px solid var(--line); padding: 4px 8px 4px 0; text-align: left; vertical-align: top; }
ul { padding-left: 20px; } li { margin: 4px 0; } .credit { color: var(--muted); font-size: 14px; } a { color: inherit; }
</style></head><body><main>
<h1>Upright regulation: the Learn steps</h1>
<p class="note">Draft for review (C4, ${new Date().toISOString().slice(0, 10)}), from content-upright.js. ${STEPS.length} steps, ${STEPS.filter(s => !s.info).length} of them graded in the sim. Sources: Steinway's upright chapter, Bill Spurlock's "Vertical Regulation", Mario Igrec's <i>Pianos Inside Out</i>, Jim Ellis's bridle strap article. The factory column is the sim's regulated note.</p>
${steps}
<section><h2>Tools named in the tips</h2><ul>${TOOLS.map(t => `<li><b>${esc(t.name)}</b>, ${esc(t.who)}: ${esc(t.what)}</li>`).join('')}</ul></section>
</main></body></html>
`);
console.log(`wrote ${out}`);
