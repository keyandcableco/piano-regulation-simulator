// The sharp's stand-in lever (model.js SHARP): how far behind the naturals' balance pins its own row sits, solved so a
// factory sharp whose aftertouch is the naturals' bottoms SHARP.bottom above their tops; then the sharp's factory
// regulation, to paste into model.js as FACTORY_SHARP.
// node tests/sharp-lever.mjs            solve balBack, then regulate the sharp with it
// node tests/sharp-lever.mjs --keep     regulate the sharp with model.js's balBack as it stands (after Greg's measured keys)
// Several minutes: factory() runs measure() a few hundred times.
import { G, SHARP, SHARP_KEY, FACTORY, NAT_TOP_AT_SHARP, factory, measure, keyRest, keyPt } from '../model.js';

const rot = (p, a) => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];
// set the sharp's balance row, as model.js builds SHARP_KEY from it (its top for 1/2 in above at balPunch 1.5)
function setBalBack(s) {
  const By = G.balRailY + 1.5, x = G.keyFrontLocal + SHARP.front;
  const tN = Math.asin((G.backRailY - By) / (G.backRailX - G.balX)), tS = Math.asin((G.backRailY - By) / (G.backRailX - G.balX - s));
  const tilt = By + rot([x - s, G.keyThick], tS)[1] - (By + rot([x, G.keyThick], tN)[1]);
  SHARP_KEY.s = s; SHARP_KEY.arm = s - SHARP_KEY.front; SHARP_KEY.top = G.keyThick + G.keyTopCap + SHARP.height - tilt;
  return tilt;
}
const nat = measure(FACTORY);
console.log(`natural at factory: dip ${nat.dip.toFixed(3)}, aftertouch ${nat.aftertouch.toFixed(3)}, naturals' top at the sharp ${NAT_TOP_AT_SHARP.toFixed(3)}`);
const bottomAt = s => { setBalBack(s); const a = factory(true, nat.aftertouch), m = measure(a); return { a, m, bottom: m.sharpBottom }; };

let s = SHARP.balBack;
if (!process.argv.includes('--keep')) {
  let lo = 15, hi = 35;
  for (let i = 0; i < 6; i++) {
    const mid = (lo + hi) / 2, r = bottomAt(mid);
    console.log(`balBack ${mid.toFixed(2)}: sharp dip ${r.m.dip.toFixed(2)}, bottom ${r.bottom.toFixed(2)} above the naturals`);
    // farther back, a longer front arm and a shorter back one: more dip for the same capstan rise, so a lower bottom
    if (r.bottom > SHARP.bottom) lo = mid; else hi = mid;
  }
  s = Math.round((lo + hi) / 2 * 10) / 10;
}
const r = bottomAt(s);
const k = keyRest(r.a);
console.log(`\nbalBack ${s} (tilt ${setBalBack(s).toFixed(3)}): sharp dip ${r.m.dip.toFixed(3)}, aftertouch ${r.m.aftertouch.toFixed(3)}, bottom ${r.bottom.toFixed(3)}, keyHeight ${r.m.keyHeight.toFixed(3)}`);
console.log(`  blow ${r.m.blow.toFixed(3)} letoff ${r.m.letoff?.toFixed(3)} drop ${r.m.drop?.toFixed(3)} check ${r.m.check.toFixed(3)} damperTiming ${r.m.damperTiming?.toFixed(3)} damperStop ${r.m.damperStop?.toFixed(3)} pedalLift ${r.m.pedalLift?.toFixed(3)}`);
console.log(`  front edge at x ${keyPt(k.By, k.th0, [SHARP_KEY.front, SHARP_KEY.top], k.s)[0].toFixed(2)}`);
const out = Object.fromEntries(Object.entries(r.a).filter(([key]) => key !== 'sharp').map(([key, v]) => [key, typeof v === 'number' ? Math.round(v * 1e4) / 1e4 : v]));
console.log(`\nexport const FACTORY_SHARP = ${JSON.stringify(out)};`);
