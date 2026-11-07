# Grand Action Regulation

A 3D grand piano action you can regulate, in the browser: **https://regulation.keyandcable.com/**

One key of a grand action (key, capstan, wippen, jack, repetition lever, hammer and backcheck) modelled as rigid levers on their centres. Turning a screw or changing a punching moves everything after it, the way it does on the bench.

- **Learn**: the regulation steps in the standard grand order (key height, jack to knuckle, repetition lever height, blow, rest rail, dip, let-off, drop, aftertouch, repetition spring, backcheck), each with its test, spec and why it matters, ending in a final check that shows what later steps knocked out.
- **Find the fault**: a customer's complaint and an action with one or two things wrong. Readings stay hidden until you run the test that measures them.
- **Sandbox**: every reading live, plus felt and cloth wear to watch a regulated action drift.
- **Exam**: practice for the grand section of PTG's Technical Exam: a de-regulated 3-note model, key height and dip given, 50 minutes, scored per note and for evenness across the notes. Practice scoring, not PTG's score sheet.
- **Drills**: bench checks done by eye and feel, starting with the hammer swing test for flange center friction.
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
