// The upright sharp's stand-in lever (upright-model.js SHARP): how far behind the naturals' balance pins its own row
// sits, solved so a factory sharp with the naturals' capstan rise (it checks with them) bottoms SHARP.bottom above
// their tops; then the sharp's factory regulation, to paste into upright-model.js as FACTORY_SHARP.
// node tests/sharp-lever-upright.mjs          solve balBack, then regulate the sharp with it
// node tests/sharp-lever-upright.mjs --keep   regulate the sharp with upright-model.js's balBack as it stands
import { SHARP, FACTORY, factory, measure, capstanRise, setSharpBalBack } from '../upright-model.js';

const nat = measure(FACTORY);
console.log(`natural at factory: dip ${nat.dip.toFixed(3)}, capstan rise ${capstanRise(FACTORY).toFixed(3)}, check ${nat.check?.toFixed(3)}`);
const at = s => { setSharpBalBack(s); const a = factory({ sharp: true }), m = measure(a); return { a, m, bottom: m.sharpBottom }; };
let s = SHARP.balBack;
if (!process.argv.includes('--keep')) {
  let lo = 0, hi = 40;
  for (let i = 0; i < 10; i++) {
    const mid = (lo + hi) / 2, r = at(mid);
    console.log(`balBack ${mid.toFixed(2)}: sharp dip ${r.m.dip.toFixed(2)}, bottom ${r.bottom.toFixed(2)} above the naturals`);
    if (r.bottom > SHARP.bottom) lo = mid; else hi = mid;
  }
  s = Math.round((lo + hi) / 2 * 10) / 10;
}
const r = at(s);
console.log(`\nbalBack ${s}: sharp dip ${r.m.dip.toFixed(3)}, bottom ${r.bottom.toFixed(3)}, keyHeight ${r.m.keyHeight.toFixed(3)}, check ${r.m.check?.toFixed(3)} (natural ${nat.check?.toFixed(3)}), aftertouch ${r.m.aftertouch?.toFixed(3)} (natural ${nat.aftertouch?.toFixed(3)})`);
const { sharp, ...out } = r.a;
console.log(`\nexport const FACTORY_SHARP = ${JSON.stringify(out)};`);
