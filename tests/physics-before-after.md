# The grand in motion, before and after the key was given weight

Written by `tests/physics-compare.mjs` from two records of `tests/physics-battery.mjs`: `tests/data/physics-before.json`
(the Sim as it stood at commit 2365fdd: the key moved at a set speed) and `tests/data/physics-after.json` (the key
pushed by a finger's force, with its own weight, friction and felts). The factory key and the 38 Find-the-fault cases,
each played through the same programs. Three of the cases were re-sized on the way and are compared at their new size in
the after columns: the shallow-dip stutter (front punching +1.7 to +1.9), the weak repetition spring (-0.6 to -0.8) and
the tight front bushing (its drag 26 g to 34 g: a played key, kicked up by the spring, coasted home against 26).

What is compared:
- **set 250**: the key moved down at 250 mm/s, held to 0.5 s, then let go. Before, this was Play and Strike & hold. The
  Sim can still be driven that way (a hand moving the key at a set speed: the slow presses use it), so the same key
  motion can be played on both; after, the key let go comes up by itself.
- **mf**: what Play and Strike & hold are now: a 400 g finger. There is no before for it.
- **slow press** at 6 mm/s: the regulation tests' press, a hand moving the key. It should not change.

The regulation readings are not in these tables because they did not change: `measure()`, `grade()` (at all three
levels) and `slowPress()` were compared between the two versions of `model.js` for the factory key and every case, at
the old fault sizes and the new: 7052 values, one different, by intent (the tight front bushing's drag reading,
26 g to 34; a one-off script; the readings' code was not touched).

## Factory key

| | before | after |
|---|---|---|
| Slow press: let-off from the string | 1.58 mm | 1.58 mm |
| Key at 60 mm/s: strike | 0.26 m/s | 0.22 m/s |
| Key at 250 mm/s: strike, check | 1.40 m/s, 14.27 mm | 1.44 m/s, 12.52 mm |
| Key at 600 mm/s: strike, check | 3.33 m/s, 17.80 mm | 3.45 m/s, 16.23 mm |
| Key back up after letting go | 158 ms, every key, every case | 84 ms after that press; 69 ms after a normal blow |
| Jack back under the knuckle | key 33% up | key 41% up (42% after a normal blow) |
| pp, mf, ff, staccato (finger 100 g, 400 g, 1.8 kg, 1 kg for 22 ms) | no such thing | 0.83, 2.23, 4.98, 3.44 m/s |
| Check after mf, ff | – | 14.34, 18.98 mm |
| Downweight, upweight | not computed | 44 g, 17 g |
| Most the key asks for through let-off | not computed | 137 g |
| Fastest repetition, half release / full release | 42 a second, whatever the fault (critique D1) | 13 / 14 a second |

## Every case, the same key motion (250 mm/s down, let go at 0.5 s), and the new normal blow

Events are in the order they happened (damper and contact events left out; "rail" is the shank bouncing on the rest
rail). Strike speeds in m/s, check in mm from the string, "up" is the time the key took to come back, "reset" how far up
the key was when the jack got back under. The last column says which notes below explain the differences.

| Case | before: events | strike | check | up ms | reset | after, same motion: events | strike | check | up ms | reset | after, mf finger: events | strike | check | why |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| factory | let-off strike checked uncheck reset | 1.40 | 14.27 | 158 | 33% | let-off strike checked uncheck reset | 1.44 | 12.52 | 84 | 41% | let-off strike checked uncheck reset | 2.23 | 14.34 | R C |
| letoff +0.2 | let-off strike checked uncheck reset | 1.42 | 14.35 | 158 | 33% | let-off strike checked uncheck reset | 1.46 | 12.57 | 83 | 40% | let-off strike checked uncheck reset | 2.26 | 14.40 | R C |
| letoff -1 | let-off strike jackjam checked uncheck reset | 1.27 | 14.02 | 158 | 33% | let-off strike jackjam checked uncheck reset | 1.26 | 12.29 | 125 | 39% | let-off strike jackjam checked uncheck reset | 1.94 | 13.56 | R C K |
| frontPunch +1 | let-off strike checked uncheck reset | 1.40 | 15.29 | 140 | 29% | let-off strike checked uncheck reset | 1.44 | 13.55 | 122 | 35% | let-off strike checked uncheck reset | 2.23 | 15.09 | C |
| frontPunch -0.8 | let-off strike checked uncheck reset | 1.40 | 13.53 | 172 | 35% | let-off strike checked uncheck reset | 1.44 | 11.74 | 76 | 43% | let-off strike checked uncheck reset | 2.23 | 13.19 | R C |
| frontPunch +1.7 → frontPunch +1.9 | strike strike bobble strike bobble | 1.40, 0.47, 0.15 | – | 128 | – | strike strike bobble soft check | 1.30, 0.41 | – | 198 | – | let-off strike reset pop strike bobble soft check | 2.21, 0.52 | – | R E B |
| repSpring -0.6 → repSpring -0.8 | let-off strike checked uncheck reset | 1.40 | 14.51 | 158 | 38% | let-off strike checked uncheck reset | 1.44 | 12.90 | 173 | 42% | let-off strike checked uncheck reset | 2.23 | 14.59 | C |
| repSpring +0.7 | let-off strike checked uncheck reset | 1.40 | 13.92 | 158 | 29% | let-off strike checked uncheck reset | 1.44 | 12.13 | 53 | 39% | let-off strike checked uncheck reset | 2.22 | 14.11 | R C J |
| backcheck -3 | let-off strike strike bobble reset | 1.40, 0.12 | – | 158 | 17% | let-off strike strike bobble reset | 1.44, 0.11 | – | 137 | 17% | let-off strike rail strike bobble reset | 2.23, 0.15 | – |  |
| capstan -0.6 | let-off strike checked uncheck reset | 1.42 | 14.37 | 158 | 23% | let-off strike checked uncheck reset rail | 1.42 | 12.57 | 137 | 27% | let-off strike checked uncheck reset rail | 2.34 | 14.44 | C |
| capstan +0.5 | let-off strike checked uncheck reset | 1.42 | 14.36 | 158 | 41% | let-off strike checked uncheck reset | 1.44 | 12.50 | 64 | 52% | let-off strike checked uncheck reset | 2.07 | 13.68 | R C J |
| balPunch +0.5 | let-off strike jackjam checked uncheck reset | 1.40 | 13.29 | 176 | 39% | let-off strike jackjam checked uncheck reset | 1.45 | 11.82 | 69 | 49% | let-off strike jackjam checked uncheck reset | 2.15 | 13.24 | R C J K |
| jackScrew -1.4 | let-off strike checked uncheck reset | 1.63 | 14.66 | 158 | 32% | let-off strike checked uncheck reset rail | 1.63 | 12.89 | 79 | 43% | let-off strike checked uncheck reset rail | 2.21 | 14.26 | R C J |
| drop +2 | let-off strike checked uncheck reset | 1.39 | 14.17 | 158 | 33% | let-off strike checked uncheck reset | 1.44 | 12.33 | 126 | 38% | let-off strike checked uncheck reset | 2.23 | 14.23 | R C |
| repStop -0.3 | let-off strike checked uncheck reset | 1.40 | 14.30 | 158 | 33% | let-off strike checked uncheck reset | 1.44 | 12.53 | 125 | 41% | let-off strike checked uncheck reset | 2.23 | 14.36 | R C |
| repStop +0.25 | let-off strike checked uncheck reset | 1.40 | 14.24 | 158 | 33% | let-off strike checked uncheck reset | 1.44 | 12.51 | 72 | 40% | let-off strike checked uncheck reset | 2.20 | 14.28 | R C |
| damperDrag +0.5 | let-off strike checked uncheck reset | 1.40 | 14.27 | 158 | 33% | let-off strike checked uncheck reset | 1.44 | 12.52 | 84 | 41% | let-off strike checked uncheck reset | 2.21 | 14.32 | R C |
| damperLevel +0.6 | let-off strike checked uncheck reset | 1.40 | 14.27 | 158 | 33% | let-off strike checked uncheck reset | 1.44 | 12.52 | 84 | 41% | let-off strike checked uncheck reset | 2.23 | 14.34 | R C |
| damperCenter +2 | let-off strike checked uncheck reset | 1.40 | 14.27 | 158 | 33% | let-off strike checked uncheck reset | 1.44 | 12.52 | 84 | 41% | let-off strike checked uncheck reset | 2.23 | 14.34 | R C |
| damperGap -1.5 | let-off strike checked uncheck reset | 1.40 | 14.27 | 158 | 33% | let-off strike checked uncheck reset | 1.44 | 12.52 | 84 | 41% | let-off strike checked uncheck reset | 2.23 | 14.34 | R C |
| pedalLift +2 | let-off strike checked uncheck reset | 1.40 | 14.27 | 158 | 33% | let-off strike checked uncheck reset | 1.44 | 12.52 | 84 | 41% | let-off strike checked uncheck reset | 2.23 | 14.34 | R C |
| damage splitShank | let-off strike click checked uncheck reset | 1.05 | 14.27 | 158 | 33% | let-off strike click checked uncheck reset | 1.08 | 12.52 | 84 | 41% | let-off strike click checked uncheck reset | 1.67 | 14.34 | R C |
| damage looseFlange | let-off strike click checked uncheck reset | 1.40 | 14.27 | 158 | 33% | let-off strike click checked uncheck reset | 1.44 | 12.52 | 84 | 41% | let-off strike click checked uncheck reset | 2.23 | 14.34 | R C |
| damage looseHead | let-off strike click checked uncheck reset | 1.26 | 14.27 | 158 | 33% | let-off strike click checked uncheck reset | 1.29 | 12.52 | 84 | 41% | let-off strike click checked uncheck reset | 2.00 | 14.34 | R C |
| center hammerTight | let-off strike checked uncheck reset | 1.40 | 14.27 | 158 | 33% | let-off strike checked uncheck reset | 1.44 | 12.48 | 83 | 41% | let-off strike checked uncheck reset | 2.21 | 14.30 | R C |
| center hammerLoose | let-off strike click checked uncheck reset | 1.40 | 14.31 | 158 | 33% | let-off strike click checked uncheck reset | 1.44 | 12.53 | 84 | 41% | let-off strike click checked uncheck reset | 2.23 | 14.37 | R C |
| center hammerWorn | let-off strike click checked uncheck reset | 1.40 | 14.29 | 158 | 33% | let-off strike click checked uncheck reset | 1.44 | 12.52 | 84 | 41% | let-off strike click checked uncheck reset | 2.23 | 14.35 | R C |
| center wippenTight | let-off strike checked uncheck reset | 1.40 | 14.27 | 187 | 32% | let-off strike checked uncheck reset | 1.44 | 12.52 | 131 | 40% | let-off strike checked uncheck reset | 2.21 | 14.31 | R C |
| center wippenLoose | let-off strike click checked uncheck reset | 1.40 | 14.27 | 158 | 33% | let-off strike click checked uncheck reset | 1.44 | 12.52 | 82 | 41% | let-off strike click checked uncheck reset | 2.23 | 14.34 | R C |
| center jackTight | let-off strike checked uncheck reset | 1.40 | 14.27 | 158 | 36% | let-off strike checked uncheck reset | 1.44 | 12.52 | 85 | 45% | let-off strike checked uncheck reset | 2.23 | 14.33 | R C |
| center jackLoose | let-off strike click checked uncheck reset | 1.40 | 14.27 | 158 | 33% | let-off strike click checked uncheck reset | 1.44 | 12.52 | 84 | 39% | let-off strike click checked uncheck reset | 2.23 | 14.34 | R C |
| center repTight | let-off strike checked uncheck reset | 1.40 | 14.22 | 158 | 34% | let-off strike checked uncheck reset | 1.44 | 12.46 | 126 | 40% | let-off strike checked uncheck reset | 2.22 | 14.30 | R C |
| center repLoose | let-off strike checked uncheck reset | 1.40 | 14.37 | 158 | 33% | let-off strike checked uncheck reset | 1.44 | 12.55 | 75 | 40% | let-off strike checked uncheck reset | 2.23 | 14.37 | R C |
| center underTight | let-off strike checked uncheck reset | 1.40 | 14.27 | 158 | 33% | let-off strike checked uncheck reset | 1.44 | 12.52 | 84 | 41% | let-off strike checked uncheck reset | 2.22 | 14.33 | R C |
| damage brokenJackSpring | let-off strike checked uncheck reset | 1.40 | 14.27 | 158 | 98% | let-off strike checked uncheck reset | 1.44 | 12.52 | 88 | 98% | let-off strike checked uncheck reset | 2.23 | 14.36 | R C |
| wear +0.8 | let-off strike checked uncheck reset | 1.43 | 16.86 | 161 | 30% | let-off strike checked uncheck reset rail | 1.43 | 15.07 | 133 | 34% | let-off strike checked uncheck reset rail | 2.31 | 16.66 | R C |
| bushing frontWorn | let-off strike keyclick checked uncheck reset | 1.40 | 14.27 | 158 | 33% | let-off strike keyclick checked uncheck reset | 1.44 | 12.52 | 84 | 41% | let-off strike keyclick checked uncheck reset | 2.23 | 14.34 | R C |
| bushing frontTight | let-off strike checked keystuck | 1.40 | 14.27 | stays down | – | let-off strike checked uncheck reset keystuck | 1.44 | 12.52 | stays down | 31% | let-off strike checked uncheck reset keystuck | 2.11 | 14.04 | C E |
| bushing balTight | let-off strike checked uncheck reset | 1.40 | 14.27 | 316 | 28% | let-off strike checked uncheck reset | 1.44 | 12.52 | 144 | 38% | let-off strike checked uncheck reset | 2.19 | 14.23 | R C J |

### Why they differ

- **R, key return.** Before, every key came up at 60 mm/s: 158 ms, less only for a tight bushing or wippen center by a
  hand-set share. Now the key comes up under what is on it: the repetition spring while the drop screw holds the lever
  (most of the push at the start), the jack spring, the wippen's weight and the hammer's once it lands, against the key's
  own front weight and all the friction. Scott Murphy filmed 57 ms with the spring and 180 ms without. A key let go from
  a press that never checked the hammer (soft blows, the set-speed press at a weak spring) comes up slower, because the
  hammer is sitting on the lever and rides down with it. A tight front bushing still holds the key down.
- **S, strike speed for the same key motion.** The set-speed drive is the old one and the jack still simply drives the
  hammer in it, so strikes are within a few percent (none is marked). The 3% they gain at 250 and 600 mm/s is the time
  step: the Sim now always works in 0.1 ms steps, where the app used about 0.2 (the old Sim at 0.1 ms also gave 1.44).
  The slowest press (60 mm/s) strikes at 0.22 where it struck at 0.26, because the hammer now falls at 76 rad/s²
  (Hirschkorn's hammer) where it fell at 60, and at that speed it flies free for most of the stroke.
- **C, check.** The backcheck's give was set so that the Strike and hold blow stopped at the backcheck's face. That blow
  was the 250 mm/s press (1.4 m/s at the string); it is now the mf finger (2.2 m/s), so CHECK_GIVE went from 2.2 to
  4.27 mm and the old, softer blow is now caught and held short of the face, about 1.7 mm higher. The mf column is the one
  to read against the checking reading (14.29 mm, 9/16 in): the figure is where the backcheck holds the hammer once the
  key is resting on its punching (at the catch itself a firm finger has the punching squashed and the hammer a few
  tenths higher).
  A soft catch that used to hold may now come back out (soft check), as it does in Murphy's bobble clips.
- **J, where the jack resets.** The key now comes up in half the time or less, so the jack's button lets it go sooner
  against a hammer that has had less time to move, and the jack itself takes time to swing home (about 9 ms on
  Hirschkorn's spring and inertia; it was instant): the key is 8 to 10 points further up when it is back under.
- **E, B, a different list of events or count of strikes.** The shallow-dip case is compared at its new size and with a
  punching that squashes: a hard blow now lets off. A tight front bushing lets the key start up on the repetition
  spring before friction holds it, so the check lets go and the jack resets before it sticks. Elsewhere the lists
  match but for "rail": the hammer now comes home onto a key that is bouncing on its back rail cloth, and onto the rest
  rail's felt, instead of stopping dead.
- **K, the key stops on a jammed jack.** A jack pushed onto its stop felt in the lever's window now stops the key there
  (critique BE-12), short of the front punching.

## What each case does to touch, key return and repetition (after only: none of this existed)

| Case | downweight g | upweight g | through let-off g | key up after mf, ms | jack reset | repeats to, half release | full release | pp blow | ff blow |
|---|---|---|---|---|---|---|---|---|---|
| factory | 44 | 17 | 137 | 69 | 42% | 13 | 14 | let-off strike soft check reset (0.83) | let-off strike checked uncheck reset (4.98) |
| letoff +0.2 | 44 | 17 | 137 | 69 | 43% | 13 | 14 | let-off strike soft check reset (0.84) | let-off strike checked uncheck buzz reset (5.05) |
| letoff -1 | 44 | 17 | 81 | 76 | 41% | 0 | 12 | let-off strike jackjam soft check reset (0.66) | let-off strike jackjam checked uncheck reset (4.48) |
| frontPunch +1 | 44 | 17 | 137 | 116 | 37% | 16 | 17 | let-off strike soft check reset uncheck (0.83) | let-off strike checked uncheck reset (4.98) |
| frontPunch -0.8 | 44 | 17 | 137 | 68 | 44% | 13 | 16 | let-off strike soft check strike bobble reset (0.83, 0.13) | let-off strike checked uncheck reset (4.98) |
| frontPunch +1.9 | 44 | 17 | – | 183 | – | 23 | 16 | strike strike bobble soft check (0.80, 0.26) | let-off strike checked uncheck reset (4.97) |
| repSpring -0.8 | 44 | 18 | 109 | 154 | 46% | 0 | 14 | let-off strike checked uncheck reset (0.83) | let-off strike checked uncheck reset (4.98) |
| repSpring +0.7 | 44 | 17 | 161 | 49 | 42% | 3 | 15 | let-off strike strike bobble reset rail (0.82, 0.23) | let-off strike checked jumpcheck pop strike bobble reset (4.98, 0.38) |
| backcheck -3 | 44 | 17 | 137 | 129 | 20% | 4 | 12 | let-off strike reset (0.83) | let-off strike rail pop strike bobble reset (4.98, 0.65) |
| capstan -0.6 | 45 | 17 | 136 | 131 | 29% | 22 | 17 | let-off strike soft check reset soft check rail (0.87) | let-off strike checked uncheck reset rail (5.24) |
| capstan +0.5 | 42 | 17 | 138 | 59 | 51% | 3 | 14 | let-off strike soft check strike bobble reset (0.77, 0.15) | let-off strike checked uncheck reset (4.62) |
| balPunch +0.5 | 43 | 17 | 137 | 66 | 51% | 0 | 13 | let-off strike jackjam soft check strike bobble reset (0.80, 0.16) | let-off strike jackjam checked uncheck reset (4.82) |
| jackScrew -1.4 | 47 | 17 | 140 | 69 | 48% | 0 | 14 | let-off strike soft check reset rail (0.72) | let-off strike checked uncheck buzz reset rail (4.98) |
| drop +2 | 44 | 17 | 86 | 69 | 43% | 0 | 15 | let-off strike soft check strike buzz reset (0.83, 0.18) | let-off strike checked uncheck reset (4.93) |
| repStop -0.3 | 44 | 18 | 86 | 121 | 41% | 13 | 15 | let-off strike soft check reset (0.83) | let-off strike checked uncheck reset (4.98) |
| repStop +0.25 | 50 | 17 | 137 | 64 | 43% | 0 | 15 | let-off strike soft check reset (0.80) | let-off strike checked uncheck reset (4.94) |
| damperDrag +0.5 | 44 | 17 | 137 | 69 | 43% | 13 | 15 | let-off strike soft check reset (0.80) | let-off strike checked uncheck reset (4.98) |
| damperLevel +0.6 | 44 | 17 | 137 | 69 | 42% | 13 | 14 | let-off strike soft check reset (0.83) | let-off strike checked uncheck reset (4.98) |
| damperCenter +2 | 44 | 17 | 137 | 69 | 42% | 13 | 14 | let-off strike soft check reset (0.83) | let-off strike checked uncheck reset (4.98) |
| damperGap -1.5 | 44 | 17 | 137 | 69 | 42% | 13 | 14 | let-off strike soft check reset (0.81) | let-off strike checked uncheck reset (5.01) |
| pedalLift +2 | 44 | 17 | 137 | 69 | 42% | 13 | 14 | let-off strike soft check reset (0.83) | let-off strike checked uncheck reset (4.98) |
| damage splitShank | 44 | 17 | 137 | 69 | 42% | 13 | 14 | let-off strike click soft check reset (0.62) | let-off strike click checked uncheck reset (3.74) |
| damage looseFlange | 44 | 17 | 137 | 69 | 42% | 13 | 14 | let-off strike click soft check reset (0.83) | let-off strike click checked uncheck reset (4.98) |
| damage looseHead | 44 | 17 | 137 | 69 | 42% | 13 | 14 | let-off strike click soft check reset (0.74) | let-off strike click checked uncheck reset (4.48) |
| center hammerTight | 46 | 15 | 139 | 69 | 43% | 13 | 14 | let-off strike soft check reset (0.80) | let-off strike checked uncheck reset (4.97) |
| center hammerLoose | 41 | 20 | 134 | 69 | 42% | 13 | 14 | let-off strike click soft check reset (0.85) | let-off strike click checked uncheck reset (4.99) |
| center hammerWorn | 42 | 18 | 135 | 69 | 43% | 13 | 14 | let-off strike click soft check reset (0.84) | let-off strike click checked uncheck reset (4.99) |
| center wippenTight | 48 | 13 | 141 | 126 | 42% | 13 | 15 | let-off strike soft check reset (0.79) | let-off strike checked uncheck reset (4.97) |
| center wippenLoose | 44 | 17 | 137 | 68 | 42% | 13 | 14 | let-off strike click soft check reset (0.83) | let-off strike click checked uncheck reset (4.98) |
| center jackTight | 44 | 17 | 147 | 69 | 51% | 12 | 14 | let-off strike soft check reset (0.82) | let-off strike checked uncheck reset (4.98) |
| center jackLoose | 44 | 17 | 135 | 69 | 43% | 13 | 14 | let-off strike click soft check reset (0.83) | let-off strike click checked uncheck reset (4.98) |
| center repTight | 44 | 17 | 141 | 79 | 43% | 13 | 14 | let-off strike soft check reset (0.82) | let-off strike checked uncheck reset (4.98) |
| center repLoose | 44 | 17 | 134 | 65 | 42% | 13 | 14 | let-off strike soft check reset (0.83) | let-off strike checked uncheck reset (4.98) |
| center underTight | 44 | 17 | 137 | 69 | 41% | 13 | 14 | let-off strike soft check reset (0.82) | let-off strike checked uncheck reset (4.98) |
| damage brokenJackSpring | 44 | 17 | 119 | 69 | 98% | 0 | 0 | let-off strike soft check uncheck rail reset (0.83) | let-off strike checked uncheck reset (4.98) |
| wear +0.8 | 46 | 18 | 134 | 127 | 37% | 13 | 15 | let-off strike soft check reset soft check rail (0.84) | let-off strike checked uncheck reset rail (5.18) |
| bushing frontWorn | 44 | 17 | 137 | 69 | 42% | 13 | 14 | let-off strike keyclick soft check reset (0.83) | let-off strike keyclick checked uncheck reset (4.98) |
| bushing frontTight | 78 | none | 171 | stays down | 34% | 0 | 11 | let-off strike reset keystuck (0.45) | let-off strike checked uncheck reset keystuck (4.93) |
| bushing balTight | 56 | 5 | 149 | 136 | 40% | 0 | 14 | let-off strike soft check reset (0.72) | let-off strike checked uncheck reset (4.96) |
