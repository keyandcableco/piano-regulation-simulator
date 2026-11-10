# Grand Action Regulation

A 3D grand piano action you can regulate, in the browser: **https://regulation.keyandcable.com/**

One key of a grand action (key, capstan, wippen, jack, repetition lever, hammer and backcheck) modelled as rigid levers on their centres. Turning a screw or changing a punching moves everything after it, the way it does on the bench.

The hammer action's layout is measured: every center, contact and lever comes from M. C. Hirschkorn, *Dynamic Model of a Piano Action Mechanism* (MASc thesis, University of Waterloo, 2004), a Boston GP-178 grand, note 52. The wippen, jack and repetition lever are drawn from Renner USA's dimensioned wippen drawing, fitted to those measurements. The dampers aren't part of Hirschkorn's model; their layout is drawn to suit.

- **Learn**: the regulation steps in the standard grand order (checking the action centers for friction and side play, key bushings, aligning the hammers, key height, jack to knuckle and centered under it, repetition lever height, blow, rest rail and lost motion, let-off, drop, dip, aftertouch, backcheck distance, spacing and squaring, repetition spring, dampers), each with its test, spec and why it matters, ending in a final check that shows what later steps knocked out.
- **Find the fault**: a customer's complaint and an action with one or two things wrong, acting out the complaint in play where the model can (a hammer that bobbles on a key with no aftertouch, a backcheck that misses, a damper that leaves a string ringing). Readings stay hidden until you run the test that measures them. The customer's key stands between two regulated neighbors, on the same rails and pedal, as on the bench: play them, sight across the three, or run a test on a neighbor to see what right looks like. Only the customer's key is adjusted and checked.
- **Sandbox**: every reading live, plus felt and cloth wear to watch a regulated action drift.
- **Read the gauges yourself** (a switch at the top of the panel, off by default): the tests for blow, let-off, drop, dip and aftertouch stop where the reading is taken and lay a rule on the action (64ths of an inch, or half millimetres), its zero on what is measured from and a fine sight line carried across from the part. You type what it reads (1 3/4, 3/64, .4, 44.5 mm); only then does the test show the model's figure and how far off the call was. "Show me the number" skips the call, and with the switch off the tests print the figure as before. `gauge.js` holds the rule's graduations and the reading of what is typed; `scene.js` (`setGauge`) draws it.
- **Exam**: practice for the grand section of PTG's Technical Exam (assemble, align and regulate a grand action model in 50 minutes, per PTG's 2005 source book addendum). Here the 3-note model starts assembled and de-regulated, with key height and dip given, and the clock can be set shorter to leave the time assembly would take. Scored per note and for evenness across the notes, with this practice's own pass mark, not PTG's score sheet; an operation left out (a check out of tolerance on more than one of the three notes: let-off never set, say) caps the mark below a pass (`examscore.js`). This is an independent practice tool, not affiliated with or endorsed by the Piano Technicians Guild.
- **Drills**: bench checks done by eye and feel, starting with the hammer swing test for flange center friction (read against the gram gauge, with a wobble test for worn bushings).

Center friction is in grams on a gram gauge at a stated distance from the pin: Hirschkorn's measured torques for a healthy action, checked against Renner USA's flange bushing cloth manual and Igrec's *Pianos Inside Out*. The hammer flange, wippen flange, jack and repetition lever centers can each go tight or loose (the hammer's bushing can also wear and wobble, and the damper underlever's center go tight); each is found by the test a technician would use, and eased, repinned or rebushed.
- **Tools**: 3D models of real regulating tools from the supply houses, with what each one adjusts and how to use it. Sizes the catalogs list are exact; the rest are estimated from catalog photos and say so.

The grand's key has weight and is played by force. A blow is a finger pushing on the key front (the Touch menu: pp, mf, ff, staccato), and the key, the wippen and the hammer the jack carries pick up speed by their inertia against their weight, the center and key friction, the repetition and jack springs, the let-off button and drop screw, and the damper once the key has it. Let go, the key comes back up under the same balance, onto a back rail cloth and a front punching that give. The masses, inertias, friction torques, springs and felt curves are Hirschkorn's measurements of the Boston. From them come a **weigh-off** test (downweight and upweight in grams, as taken at the bench with the damper lifted, and a trace of force against key travel that shows the let-off bump) and a **Repeat** test (five quick blows, and the fastest the key repeats). `tests/physics-before-after.md` sets the action's motion before and after this change side by side.

The targets are generic textbook numbers, not one maker's specs, unless a maker's set is chosen ("Specs graded against"): Steinway (New York), Steinway (Hamburg) or Kawai, from their service literature (`SPEC_SETS` in `model.js`). Each band then names whose figure it is; a reading the maker prints no figure for keeps the generic band and says so; and the regulated key is the same Boston geometry regulated to that set (`tests/spec-set-regulate.mjs`). Kawai's set fits it; Hamburg's fits toward the short end of its blow; Steinway's New York set cannot be met (its blow, let-off and dip leave about 2.1 mm of aftertouch on this action, where Steinway expects 3/64 to 1/16 in), and the page says so rather than bending the model. The generic targets live in `SPEC` in `model.js`. A band a source prints (checking 1/2 to 5/8 in, damper lift at a third to half of the hammer's travel, the damper stop rail and pedal lift from Steinway's and Kawai's manuals) passes at both its edges at every skill level; the sim's own tolerances narrow at Exam level. The panel prints each band under its target.

The page also has an **upright** action (Learn, Find the fault, Sandbox, Exam and a drill), switched at the top of the panel. It lives in its own files: `upright-model.js`, `scene-upright.js`, `upright-app.js`, `content-upright.js`.

## What this model doesn't do

The page says this too ("What this model doesn't do", at the foot of the panel). A picture on a screen can teach what each adjustment does, what it moves and the order of the work. It can't teach hands or ears, and it leaves these out:

- **No sound.** Blocking, buzzing, bobbling and ringing strings are told in words. No voicing, no hammer-to-string mating.
- **One natural key.** No sharp, so nothing on sharp height or dip, nor the damper and pedal settings the makers check on a sharp. The three-note model is three naturals.
- **One note's geometry.** No taper from bass to treble (let-off, springs, damper play), no bass dampers with springs.
- **Generic targets, or a maker's figures on a Boston.** On a real piano the maker's figures govern. A maker's set here is its printed figures laid on one measured Boston action: it shows the trade-offs, not that maker's piano.
- **Every click is exact and instant.** The time a job takes here says nothing about the bench.
- **No assembly, bedding, key squaring or spacing, hammer filing.** Named in Learn so the order reads complete, not done.
- **Grand:** the dampers and lift tray are drawn to suit, not measured; no una corda, sostenuto or pedal trapwork; feel is a number and a picture (the weigh-off's grams and its force trace), not a feel, and the finger forces behind pp, mf, ff and staccato are the sim's own; the front punching and back rail cloth give as Hirschkorn measured them (how far a played key bounces back off the punching is tuned, a stand-in for the hand behind the finger), but the knuckle doesn't settle into the repetition lever or the jack and the backcheck's give is a fitted figure, so a key with a little too little aftertouch still plays cleanly; a key with lost motion is kept up on its back rail, though by its measured weights its front would hang low; the repetition spring is graded by its net lift, not by eye; wear amounts are the sim's own estimates.
- **Upright:** no feel (the key and its punchings are rigid and the key moves at a set speed, not under a finger's weight: no touchweight, no let-off bump, no punching that squashes under pressure); built on a filmed one-note action model, with Renner's catalog, Steinway's vertical guide, Bill Spurlock's writing and Jim Ellis's high-speed clips; the key and rail dimensions are stand-ins; no pedal linkage; no tool models yet.

## Running it locally

It is plain HTML and ES modules with no build step, but modules need a web server:

```bash
python3 -m http.server 8812
```

then open http://localhost:8812/.

## Files

- `model.js`: the mechanism (geometry, adjustments, specs, measurements, felt wear), the key played by force (`Sim`), touchweight (`touch`) and repetition (`repeatTest`). Runs in Node too.
- `scene.js`: the Three.js drawing.
- `app.js`: the modes, tests and controls.
- `drills.js`: the bench drills.
- `gauge.js`: the rule laid on the action for the student to read. `examscore.js`: the exam's mark.
- `toolbag.js` and `tools/`: the tool models, one file per tool, sharing the materials and shape helpers in `tools/kit.js`.
- `vendor/three/`: Three.js r160, OrbitControls and RoomEnvironment, from the `three@0.160.0` npm package.

## License

Copyright © 2026 Greg Miller / The Key & Cable Company.

Licensed under the [GNU General Public License v3.0](LICENSE). You can use, study, share and modify it. If you distribute it or a modified version, you have to make the source available under the same licence.

Source location: https://github.com/keyandcableco/piano-regulation-simulator

Three.js in `vendor/three/` is not covered by this licence: it is under the MIT License (see `vendor/three/LICENSE`). The Key & Cable name and logo are not licensed.
