# Grand Action Regulation

A 3D grand piano action you can regulate, in the browser: **https://regulation.keyandcable.com/**

One key of a grand action (key, capstan, wippen, jack, repetition lever, hammer and backcheck) modelled as rigid levers on their centres. Turning a screw or changing a punching moves everything after it, the way it does on the bench.

The hammer action's layout is measured: every center, contact and lever comes from M. C. Hirschkorn, *Dynamic Model of a Piano Action Mechanism* (MASc thesis, University of Waterloo, 2004), a Boston GP-178 grand, note 52. The wippen, jack and repetition lever are drawn from Renner USA's dimensioned wippen drawing, fitted to those measurements. The dampers aren't part of Hirschkorn's model; their layout is drawn to suit.

- **Learn**: the regulation steps in the standard grand order (checking the action centers for friction and side play, key bushings, aligning the hammers, key height, jack to knuckle and centered under it, repetition lever height, blow, rest rail and lost motion, let-off, drop, dip, aftertouch, backcheck distance, spacing and squaring, repetition spring, dampers), each with its test, spec and why it matters, ending in a final check that shows what later steps knocked out.
- **Find the fault**: a customer's complaint and an action with one or two things wrong, acting out the complaint in play where the model can (a hammer that bobbles on a key with no aftertouch, a backcheck that misses, a damper that leaves a string ringing). Readings stay hidden until you run the test that measures them.
- **Sandbox**: every reading live, plus felt and cloth wear to watch a regulated action drift.
- **Exam**: practice for the grand section of PTG's Technical Exam (assemble, align and regulate a grand action model in 50 minutes, per PTG's 2005 source book addendum). Here the 3-note model starts assembled and de-regulated, with key height and dip given, and the clock can be set shorter to leave the time assembly would take. Scored per note and for evenness across the notes, with this practice's own pass mark, not PTG's score sheet. This is an independent practice tool, not affiliated with or endorsed by the Piano Technicians Guild.
- **Drills**: bench checks done by eye and feel, starting with the hammer swing test for flange center friction (read against the gram gauge, with a wobble test for worn bushings).

Center friction is in grams on a gram gauge at a stated distance from the pin: Hirschkorn's measured torques for a healthy action, checked against Renner USA's flange bushing cloth manual and Igrec's *Pianos Inside Out*. The hammer flange, wippen flange, jack and repetition lever centers can each go tight or loose (the hammer's bushing can also wear and wobble, and the damper underlever's center go tight); each is found by the test a technician would use, and eased, repinned or rebushed.
- **Tools**: 3D models of real regulating tools from the supply houses, with what each one adjusts and how to use it. Sizes the catalogs list are exact; the rest are estimated from catalog photos and say so.

The targets are generic textbook numbers, not one maker's specs. They live in `SPEC` in `model.js`.

## Running it locally

It is plain HTML and ES modules with no build step, but modules need a web server:

```bash
python3 -m http.server 8812
```

then open http://localhost:8812/.

## Files

- `model.js`: the mechanism (geometry, adjustments, specs, measurements, the time-stepped key stroke, felt wear). Runs in Node too.
- `scene.js`: the Three.js drawing.
- `app.js`: the modes, tests and controls.
- `drills.js`: the bench drills.
- `toolbag.js` and `tools/`: the tool models, one file per tool, sharing the materials and shape helpers in `tools/kit.js`.
- `vendor/three/`: Three.js r160, OrbitControls and RoomEnvironment, from the `three@0.160.0` npm package.

## License

Copyright © 2026 Greg Miller / The Key & Cable Company.

Licensed under the [GNU General Public License v3.0](LICENSE). You can use, study, share and modify it. If you distribute it or a modified version, you have to make the source available under the same licence.

Source location: https://github.com/keyandcableco/piano-regulation-simulator

Three.js in `vendor/three/` is not covered by this licence: it is under the MIT License (see `vendor/three/LICENSE`). The Key & Cable name and logo are not licensed.
