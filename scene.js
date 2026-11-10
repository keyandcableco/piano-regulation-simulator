// Three.js rendering of the grand action. Units are millimetres, same frame
// as model.js: x toward the strings, y up, z across the keyboard. With x away from the player and y up, +z is the
// player's right: the treble. model.js measures sideways offsets with + toward the bass, so they are drawn at BASS times.
// Three notes are built; normal modes show the middle one with ghost neighbors,
// exam mode shows all three like the 3-note exam model.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ruleTicks } from './gauge.js';
import { G, FACTORY, NEIGHBOR_H, WEAR, TRAVEL_RISE, SIDE_K, WIPPEN_JACK_ARM, WIPPEN_PAPER, keyAngle, hamPt, repRho, knuckleBottom, linkage, dipOf, gFromTail, gOnJackAt, eff, trayLift } from './model.js';

const COLORS = {
  keybed: 0x6e4c2e, rail: 0xa47a4c, wood: 0xd7b98c, keywood: 0xe6d3ad, keytop: 0xf6f3ea,
  felt: 0x2f6e46, redfelt: 0x9b2f2f, hammerfelt: 0xeee6d2, buckskin: 0xb38b55, core: 0x8f6446, knucklefelt: 0xeeeae2,
  jack: 0xc9a06a,
  brass: 0xc9a24a, steel: 0xa9afb6, string: 0xcfd3d8, dark: 0x3a2c22, ghost: 0xf2efe7,
};

const PART_NAMES = {
  key: 'Key', keytop: 'Key top', neighbor: 'Neighbor key', balance: 'Balance rail punching',
  balrail: 'Balance rail', frontrail: 'Front rail', frontpunch: 'Front rail punching', backrail: 'Back rail cloth',
  capstan: 'Capstan screw', wippen: 'Wippen', heel: 'Wippen heel cushion', wippenrail: 'Wippen rail & flange',
  jack: 'Jack', tender: 'Jack tender (toe)', jackscrew: 'Jack regulating screw', rep: 'Repetition lever',
  repscrew: 'Repetition lever height screw', repspring: 'Repetition spring', shank: 'Hammer shank',
  knuckle: 'Knuckle (a felt roll in buckskin)', knucklecore: 'Knuckle core: a thin wood tongue through the roll, glued up into a groove in the shank. The back of the jack lines up with its back face', hammer: 'Hammer', flange: 'Hammer flange', flangescrew: 'Hammer flange screw', flangerail: 'Hammer flange rail',
  wflange: 'Wippen flange: screwed to the back face of the wippen rail. Loosen its screw to shift the wippen, or put traveling paper behind one side to swing it', support: 'Repetition lever support', jackstop: 'Jack stop (wire)', repbutton: 'Repetition lever button',
  dropfelt: 'Drop screw felt', windowfelt: 'Jack stop felt in the repetition lever window',
  wcenter: 'Wippen flange center pin (bushed in the flange)', jcenter: 'Jack center pin (bushed in the wippen)',
  rcenter: 'Repetition lever center pin (bushed in the support)', hcenter: 'Hammer flange center pin (bushed in the flange)',
  ucenter: 'Damper underlever center pin (bushed in its flange)',
  drop: 'Drop screw', letoff: 'Let-off button', regrail: 'Regulating rail', restrail: 'Hammer rest rail',
  string: 'Strings', backcheck: 'Backcheck (buckskin face)', damper: 'Damper head', damperfelt: 'Damper felt: a pad under each end of the head, split so its points drop between the strings',
  damperwire: 'Damper wire', ulflange: 'Underlever top flange: its set screw holds the damper wire', underlever: 'Damper underlever',
  damperstop: 'Damper stop rail', lifttray: 'Damper lift tray (pedal)', guiderail: 'Damper guide rail', ulrail: 'Underlever flange rail', tail: 'Hammer tail (scored check surface)', keybed: 'Keybed', straightedge: 'Straightedge',
};

// the bass side is -z (on the player's left, as seen from the keys)
export const BASS = -1;
// note slots: 0 is the middle (the one normal modes use), 1 toward the bass, 2 toward the treble
export const NOTE_Z = [0, 23.5 * BASS, -23.5 * BASS];
// The underlever's pin, lift felt and wire clamp are the model's (G.ulPivot, G.ulFelt, G.ulWire: the lift ratio comes
// from them). Its own frame runs along the line from the pin to the lift felt's face; the wood lies above that line.
const UL_PIVOT = G.ulPivot;        // underlever centre pin
const UL_FELT = G.ulFelt;          // lift felt's face, over the key's end
const UL_TOP = 10;                 // the top of the underlever's wood
const UL_WIRE = [G.ulWire[0], UL_TOP];   // where the damper wire meets the underlever: its top flange sits here
const UL_FLANGE_H = 2 * (G.ulWire[1] - UL_TOP);   // the top flange: a block on the underlever, the wire held in the middle of it by a set screw
const UL_STOP = [UL_WIRE[0] + 9, UL_TOP + UL_FLANGE_H];   // where the stop rail's felt meets the top flange, behind the wire
const UL_TRAY = [-30, 3];          // where the lift tray's top meets the underlever's underside
const STOP_X = [510, 520], TRAY_X = [518, 542];   // the stop rail (a board on edge) and the lift tray, front to back
// The damper wire (Igrec, Pianos Inside Out, fig. 327): up from the top flange, jogged sideways between bends 1 and 2 to
// line up with its guide rail bushing, up through the rail beside the unison, then over the strings between bends 3 and 4
// and up into the head between its two felts. Heights of the bends are from the head's seat on the strings.
const WIRE_Z = 8;                  // through the guide rail beside the unison
const WIRE_B2 = -62, WIRE_B1 = -70, WIRE_B3 = 3.5, WIRE_B4 = 4.5;
// Damper head, side profile (Igrec fig. 327): a wooden plate with a peaked top and a felt pad under each end. The felt is
// Renner's trichord strip (#850139: 9.5 mm wide, 11 mm tall), split up the middle so its two points drop between the
// three strings. The length and the plate's outline follow Igrec's photo, scaled to clear the hammer. Not checked against
// a real head yet.
const DH_X = 506, DH_LEN = 54, DH_PAD = 18;   // the head's middle over the strings, its length along them, each felt pad's
const DH_SEAT = 9.8;                // the felt's top (the plate's underside) above the strings' centre line, seated
const DH_WOOD_W = 9;
// felt cross-section across the strings (z, y), y from the strings' centre line: two points between the three strings,
// flanks on the outer strings, the middle string in the notch
const DH_FELT_X = [[-4.75, DH_SEAT], [4.75, DH_SEAT], [4.75, 2.35], [1.75, -1.2], [0, 0.85], [-1.75, -1.2], [-4.75, 2.35]];
// the plate, along the strings (x, y) from its underside: square ends rounded at the top, shoulders rising to a peak
const DH_WOOD = (() => {
  const half = [[-27, 0], [-27, 7.2], [-26.6, 8.2], [-25.6, 8.7], [-14, 9.4], [-9.5, 10.4], [-6.5, 12], [-3.5, 12.9], [0, 13.2]];
  return [...half, ...half.slice(0, -1).reverse().map(([x, y]) => [-x, y])];
})();

// Wippen, jack and repetition lever outlines, side profile, mm. Digitized from Renner USA's dimensioned
// wippen drawing and fitted to Hirschkorn's measured Boston GP-178 (research/wippen/spec.md).
// wippen-local: origin at the wippen center pin, body level
// The body is solid across its 11 mm back from the jack's slot. In front of the slot its two front cheeks, either side of
// the 5.5 mm jack, carry the jack's center pin (spec §3, §4.5); the slot runs back clear of the jack's heel at either end
// of the jack screw's range.
const W_SLOT_X = -90.5, W_SLOT = 5.7, W_CHEEK = (11 - W_SLOT) / 2;
const W_BODY = [[6.3, -3.7], [7.3, 0], [6.3, 3.7], [3.7, 6.3], [0, 7.3], [-3.7, 6.3], [-5.3, 5.5], [-7.4, 4.7], [-8.6, 1.5], [-9.6, 0.7],
  [-37, 0.7], [-38.5, 1.2], [-39.6, 3], [-40.5, 5.1], [-56.5, 5.1], [-57.3, 3], [-58.2, 1], [-60, 0], [W_SLOT_X, 0],
  [W_SLOT_X, -7.6], [-75, -7.6], [-6, -7.3], [-5.2, -4.6]];
const W_CHEEKS = [[W_SLOT_X, 0], [-101, 0], [-103.6, -1.2], [-104.8, -3.8], [-103.8, -6.4], [-101.5, -7.6], [W_SLOT_X, -7.6]];
const W_HEEL = [[-48.5, -7.6], [-51, -17.5], [-52.5, -19.2], [-54.5, -19.8], [-56.5, -20.1], [-58.5, -20.3], [-59.5, -20.3], [-60.5, -20.3],
  [-62.5, -20.1], [-64.5, -19.8], [-66.5, -19.2], [-68, -17.5], [-72.5, -7.6]];
const W_HEEL_FELT = [[-52.5, -19.2], [-54.5, -19.8], [-56.5, -20.1], [-59.5, -20.3], [-62.5, -20.1], [-64.5, -19.8], [-66.5, -19.2],
  [-66.5, -21.3], [-64.5, -21.8], [-62.5, -22.1], [-59.5, -22.3], [-56.5, -22.1], [-54.5, -21.8], [-52.5, -21.3]];
const W_SUPPORT = [[-44.3, -0.7], [-51.7, -0.7], [-51.7, 27.9], [-51.2, 29.8], [-49.9, 31.1], [-48, 31.6], [-46.1, 31.1], [-44.8, 29.8], [-44.3, 27.9]];
const W_JACK_POST = [[-81.56, -7.4], [-75.4, 21.6]];   // the jack stop wire's axis, foot to end (Ø2: its front face is W_STOP_FACE)
const W_FLANGE = [[3.2, -24.7], [-4, -24.7], [-4, 1.4], [-3.5, 3.2], [-2.2, 4.5], [-0.4, 5], [1.4, 4.5], [2.7, 3.2], [3.2, 1.4]];
// Below the wippen's rear end the flange is solid between its cheeks. Its screw (spec §4.1: a Ø3.7 hole 12.3 mm under the
// pin) runs level through it into the rail's back face, head on the strings side: drawn as the hammer flange's #5 × ¾ in
// screw (FS_* below), since no source gives the wippen's own.
const W_FLANGE_WEB = -8.5, W_FS = [3.2, -12.3];
const W_STOP_FACE = { p: [-76.87, 19.15], n: [-0.969, 0.247] };   // where the jack button rests: the stop wire's face
const W_SPRING_COIL = [-49.1, 17.0];
const W_SPRING_UPPER = [[-49.1, 17.0], [-51.6, 19.6], [-60.4, 21.8], [-63.6, 24.7], [-67.6, 26.9], [-71.5, 29.3]];
const W_SPRING_LOWER = [[-49.1, 17.0], [-51.6, 15.3], [-61.1, 16.0], [-69.8, 12.7], [-74.9, 9.1], [-80.7, 4.4], [-90.9, 1.5], [-95.4, -0.7]];
// where the legs' ends bear, in the frames of the parts they press (spec §4.2, §4.4): the upper on the underside of the
// fine-adjust plate under the repetition lever, the lower on the jack's spring seat, 3.5 mm behind and 2.8 above its pin.
// The spec's notch there isn't cut in the jack's outline, so the wire's end runs into the jack's back.
const R_SPRING_SEAT = [-23.2, 1.8], J_SPRING_SEAT = [3.5, 2.8];
// jack-local: origin at the jack center pin, drawn at its rest lean
// the top's back corner is rounded so the knuckle slips off it: Hirschkorn's 1 mm arc (Table A.5, Pj2), the curve
// model.js lifts the knuckle with, running from the back edge round to the top face
const J_TOP_ARC = (() => {
  const [cx, cy] = G.jackTop, r = G.jackTopR;
  const tangent = ([px, py], s) => Math.atan2(py - cy, px - cx) + s * Math.acos(r / Math.hypot(px - cx, py - cy));
  const a0 = tangent([4.9, 8.9], 1), a1 = tangent(G.jackFront, -1);
  return Array.from({ length: 9 }, (_, i) => { const a = a0 + (a1 - a0) * i / 8; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; });
})();
const J_BODY = [...J_TOP_ARC, [11.9, 48.9], [-1.6, 4.2], [-3.2, 1.2], [-6.1, -1.1], [-22.6, 0.2], [-23.2, 2.1], [-23.1, 3.2], [-23.6, 4.1],
  [-24.5, 4.8], [-25.6, 4.9], [-26.5, 4.4], [-27.2, 3.5], [-27.3, 2.4], [-26.8, 1.5], [-25.9, 0.8], [-24.8, 0.7], [-16.5, -4.6],
  [-6.1, -8], [-0.6, -8.4], [3.4, -6.8], [5.8, -3.6], [6.5, 1.8], [6.7, 4.5], [6.2, 7.1], [4.9, 8.9]];
const J_BUTTON = [[20.4, 19.9], [13.3, 22.2], [16.3, 31.2], [23.3, 28.9]];
const J_BUTTON_FELT = [[21.9, 19.4], [20.4, 19.9], [23.3, 28.9], [24.9, 28.4]];
const J_SCREW_AXIS = { from: [2.5, 30.75], to: [14.8, 26.7], r: 1.2 };
const J_BTN_CONTACT = [23.4, 23.9];   // middle of the button's felt face
// rep-local: origin at the repetition lever center pin, drawn at rest
const R_BODY = [[38.7, -12.6], [3.8, 2.9], [-3.3, 5.3], [-21.7, 11.8], [-32.6, 16.2], [-36.3, 17.5], [-40, 18.5], [-43.6, 19.2], [-46.6, 19.5],
  [-56.8, 19.9], [-58.6, 15.8], [-51.7, 12.5], [-45.5, 12.5], [-3.3, -2], [3.8, -5.3], [28.5, -15.1], [40, -15.5]];
const R_DROP_FELT = [[-46.6, 19.5], [-56.8, 19.9], [-56.8, 22], [-46.6, 21.5]];
// The jack stop felt, glued on the window's front wall, facing the jack. model.js stops a tripped jack where its top-front
// corner meets the line of G.windowFelt; the jack's front face leans, so lower down it comes further forward than that
// line. The wall and the felt's face are drawn leaning with it, along the face of a jack jammed on a slow press (too much
// aftertouch, or let-off set too early), so the picture shows the jack flat on its felt there, not through it.
const R_WINDOW_FELT = [[-46.8, 12.6], [-44.7, 12.6], [-43.05, 19.3], [-45, 19.3]];
// solid between the cheeks at the tail and the front end; open in the window between
const R_TAIL = [[38.7, -12.6], [3.8, 2.9], [-3.3, 5.3], [-21.7, 11.8], [-25, 13.13], [-25, 5.46], [-3.3, -2], [3.8, -5.3], [28.5, -15.1], [40, -15.5]];
const R_FRONT = [[-45, 19.35], [-46.6, 19.5], [-56.8, 19.9], [-58.6, 15.8], [-51.7, 12.5], [-46.8, 12.5]];
const R_BUTTON_C = [31.8, -26.8];    // bottom of the height screw's felt button, rep-local
const R_BUTTON_FELT_H = 5;
const CAP_R = 4.5;                   // capstan screw radius
const CAP_H = G.capDomeR - Math.sqrt(G.capDomeR ** 2 - CAP_R ** 2);   // height of its dome
const CAP_PITCH = 1.28;              // mm per turn: 1/32 turn is the knob's 0.04 mm step
const LETOFF_FELT = 3;               // the let-off button's felt, mm thick
const LETOFF_LEN = 20;               // the let-off button's screw, button to top: in its rail, clear of the flange rail, over the knob's range
const DROP_LEN = 16;                 // the drop screw, its end to the foot of its spade head: it stays through the flange over the knob's range
const DROP_PITCH = 0.4;              // mm per turn: ⅛ turn is the knob's 0.05 mm step
// the hammer flange screw: a round-head wood screw down through the flange's foot into the flange rail
const FS_X = 297, FS_SEAT = 145.2;   // its axis, and the flat on the foot its head sits on
const FS_HEAD = [[0, 0], [2.8, 0], [2.8, 0.9], [2.5, 1.45], [1.9, 1.8], [1, 1.95], [0, 2]];   // head profile, [radius, height]
const FS_SLOT = (() => {             // the slot across the head: a dark strip following the dome, rim to rim
  const dome = FS_HEAD.slice(2), across = [...dome.map(([r, h]) => [-r, h]), ...dome.slice(0, -1).reverse().map(([r, h]) => [r, h])];
  return [...across.map(([x, y]) => [x, y + 0.02]), ...[...across].reverse().map(([x, y]) => [x, y - 0.5])];
})();
const FS_R = 1.6, FS_LEN = 19;       // #5, ¾ in: its tip stays inside the rail
const FS_LOOSE_LIFT = 1.5, FS_LOOSE_LEAN = 0.1;   // loose: backed up off the flange and leaning in its hole (mm, rad)
const SHANK_R = -G.shankRest[1];     // the shank's radius where the rest rail meets it
const KNUCKLE_LEATHER = 1.5;         // buckskin round the knuckle's felt roll (proportions from Greg's photo)
// The shank's butt (WNG's Renner-type shank and flange drawing, 06-5110-03): a squared block as wide as the flange that
// carries the center pin and the knuckle, then tapers in a cone to the round shank. A tongue off its end runs between
// the flange's cheeks round the pin. hammer-local, mm.
const BUTT_W = 10.6, BUTT_TOP = 4, BUTT_END = 22, BUTT_CONE = 6;   // width, top and bottom off the shank line, length
const BUTT_TONGUE_W = 6.6, BUTT_TONGUE_R = 2.4;   // the tongue's width, and its rounded end (clear of the drop screw)
const FL_CHEEK_R = BUTT_TOP;        // the flange cheeks' rounded ends about the pin, flush with the butt; its block starts just past them

// Hammer head and backcheck, side profile, mm: Hirschkorn's Boston GP-178 parts traced full size, the crown on
// G.crownC / G.crownR and the tail's back face on his measured arc (research/hammer-shape/spec.md §5).
// hammer-local (+x along the shank from the center pin)
const H_FELT = [[128.03, 7.5], [127.63, 8.3], [126.63, 9.8], [125.28, 11.8], [124.13, 13.8], [122.93, 15.8], [121.93, 17.8], [121.03, 19.8], [120.23, 21.8], [119.48, 23.8], [118.93, 25.8], [118.68, 27.8], [118.63, 29.8], [118.83, 31.8], [119.28, 33.8], [120.08, 35.8], [121.03, 37.8], [122.23, 39.8], [122.93, 40.8], [124.92, 42.81], [125.57, 43.41], [126.28, 43.96], [127.03, 44.43], [127.82, 44.84], [128.64, 45.18], [129.49, 45.45], [130.36, 45.65], [131.24, 45.76], [132.13, 45.8], [132.77, 45.78], [133.02, 45.76], [133.9, 45.65], [134.77, 45.45], [135.62, 45.18], [136.44, 44.84], [137.23, 44.43], [137.98, 43.96], [138.69, 43.41], [139.34, 42.81], [141.33, 40.8], [142.03, 39.8], [143.23, 37.8], [144.18, 35.8], [144.98, 33.8], [145.43, 31.8], [145.63, 29.8], [145.58, 27.8], [145.33, 25.8], [144.78, 23.8], [144.03, 21.8], [143.23, 19.8], [142.33, 17.8], [141.33, 15.8], [140.13, 13.8], [138.98, 11.8], [137.63, 9.8], [136.63, 8.3], [136.23, 7.5]];
const H_UNDERFELT = [[134.37, 22.8], [134.96, 24.8], [135.56, 26.8], [135.53, 28], [135.45, 31], [135.38, 33.35], [135.18, 34.7], [134.43, 36.14], [133.24, 37.06], [132.13, 37.3], [131.02, 37.06], [129.83, 36.14], [129.08, 34.7], [128.88, 33.35], [128.81, 31], [128.73, 28], [128.7, 26.8], [129.3, 24.8], [129.89, 22.8]];
const H_WOOD = [[129.75, -24.77], [130.21, -25.23], [130.83, -25.4], [131.46, -25.23], [131.91, -24.77], [132, -24.3], [132.54, -23], [133.26, -21.1], [133.96, -19], [134.55, -17], [135.05, -15], [135.48, -13], [135.82, -11], [136.1, -9], [136.3, -7], [136.42, -5], [136.33, -3], [136.33, 2], [136.18, 3.5], [135.68, 5], [135.13, 6.5], [134.88, 7.5], [134.73, 12], [134.53, 18], [134.33, 24], [134.18, 30], [134.08, 33.35], [133.82, 34.32], [133.1, 35.04], [132.13, 35.3], [131.16, 35.04], [130.44, 34.32], [130.18, 33.35], [130.08, 30], [129.93, 24], [129.73, 18], [129.53, 12], [129.38, 7.5], [129.13, 6.5], [128.58, 5], [128.08, 3.5], [127.93, 2], [127.93, -6], [127.98, -8], [128.28, -10], [128.73, -12], [129.18, -14], [129.53, -16], [129.68, -18], [129.68, -20], [129.53, -22], [129.28, -23.6]];
const H_SEAT = [[134.81, -16], [134.45, -17.33], [134.06, -18.67], [133.64, -20], [133.17, -21.33], [132.67, -22.67], [132.13, -24], [131.53, -24], [132.07, -22.67], [132.57, -21.33], [133.04, -20], [133.46, -18.67], [133.85, -17.33], [134.21, -16]];
const H_FELT_FOOT = 7.5;             // the felt is scaled about its foot as it packs down
// key-local, the key's own (level) frame
const BC_BLOCK = [[190.11, 22], [218.41, 22], [218.41, 34.8], [196.31, 34.8], [195.94, 31], [194.86, 27.67], [193.67, 25.71], [192.23, 24.37], [190.11, 23.7]];
const BC_PIVOT = [210.11, 39.8];     // the bend in the wire: bending the backcheck turns the head about it
const BC_ARM = G.bcHead[1] - BC_PIVOT[1];   // catch point above the bend: bending the wire sideways moves the head over this arm
const BC_HEAD_C = [220.22, 65.95];         // the head's middle: it twists about here when squared
const BC_WIRE_TOP = [217.15, 55.73];
const BC_WOOD = [[208.98, 53.17], [214.24, 63.41], [216.2, 62.4], [224.19, 77.97], [226.32, 77.1], [226.43, 70.52], [227.33, 70.29], [219.78, 51], [217.17, 49.65]];
const BC_FELT = [[208.98, 53.17], [209.39, 53.98], [214.24, 63.41], [216.2, 62.4], [224.19, 77.97], [226.32, 77.1], [226.35, 75.43], [226.8, 76.07], [226.95, 76.48], [226.98, 76.92], [226.91, 77.36], [226.71, 77.76], [226.43, 78.1], [226.02, 78.38], [224.52, 79.14], [223.73, 79.43], [222.95, 79.49], [222.18, 79.36], [221.48, 79.02], [220.88, 78.52], [220.41, 77.82], [208, 53.68]];
const BC_LEATHER = [[227.61, 75.65], [227.84, 76.29], [227.89, 76.97], [227.77, 77.63], [227.47, 78.25], [227.04, 78.77], [226.48, 79.16], [224.88, 79.97], [223.92, 80.32], [222.91, 80.41], [221.9, 80.22], [220.99, 79.78], [220.2, 79.13], [219.63, 78.29], [207.2, 54.09], [208, 53.68], [220.41, 77.82], [220.88, 78.52], [221.48, 79.02], [222.18, 79.36], [222.95, 79.49], [223.73, 79.43], [224.52, 79.14], [226.02, 78.38], [226.43, 78.1], [226.71, 77.76], [226.91, 77.36], [226.98, 76.92], [226.95, 76.48], [226.8, 76.07], [226.35, 75.43], [226.43, 70.52], [227.33, 70.29], [227.22, 75.09]];

function shapeFrom(pts) {
  const s = new THREE.Shape();
  s.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
  s.closePath();
  return s;
}
const rect = (x0, y0, x1, y1) => shapeFrom([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);

export function createScene(canvas, overlay) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 5, 5000);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  // never zoom through the point looked at, nor so far out the action is lost (a tall phone's action view is ~2400 out)
  controls.minDistance = 40; controls.maxDistance = 3000;

  const hemi = new THREE.HemisphereLight(0xffffff, 0x554433, 1.6);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(200, 500, 600);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xffffff, 0.5);
  fill.position.set(-300, 100, -400);
  scene.add(fill);

  const pickables = [];
  const partMeshes = {};
  let building = -1; // note slot the parts being built belong to (-1 = shared)
  function mat(color, opts = {}) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: opts.metal ? 0.6 : 0.05, transparent: !!opts.opacity, opacity: opts.opacity ?? 1 });
  }
  function register(m, part, opts) {
    m.userData.part = part; m.userData.note = building; m.userData.baseOpacity = opts.opacity ?? 1;
    if (part && !opts.noPick) { pickables.push(m); (partMeshes[part] ||= []).push(m); }
  }
  function ext(shape, depth, z0, color, part, parent, opts = {}) {
    const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 16 });
    geo.translate(0, 0, z0 - depth / 2);
    const m = new THREE.Mesh(geo, mat(color, opts));
    parent.add(m); register(m, part, opts);
    return m;
  }
  function cyl(r, len, axis, pos, color, part, parent, opts = {}) {
    const geo = new THREE.CylinderGeometry(r, r, len, 20);
    if (axis === 'x') geo.rotateZ(Math.PI / 2);
    if (axis === 'z') geo.rotateX(Math.PI / 2);
    const m = new THREE.Mesh(geo, mat(color, opts));
    m.position.set(...pos);
    parent.add(m); register(m, part, opts);
    return m;
  }
  // a cross-section drawn across the strings ([z, y] points), run along them from x0 to x1
  function extAlongX(shape, x0, x1, color, part, parent, opts = {}) {
    const geo = new THREE.ExtrudeGeometry(shape, { depth: x1 - x0, bevelEnabled: false });
    geo.rotateY(Math.PI / 2); geo.translate(x0, 0, 0);
    const m = new THREE.Mesh(geo, mat(color, opts));
    parent.add(m); register(m, part, opts);
    return m;
  }
  // a turned part about +y, from [radius, height] points listed bottom to top
  function lathe(profile, color, part, parent, opts = {}) {
    const m = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 24), mat(color, opts));
    parent.add(m); register(m, part, opts);
    return m;
  }
  // a center pin across a part, with the cloth bushing ring showing round it on each face
  function center(part, parent, [x, y], len) {
    cyl(1.27, len, 'z', [x, y, 0], COLORS.redfelt, part, parent);
    cyl(0.635, len + 0.8, 'z', [x, y, 0], COLORS.steel, part, parent, { metal: true });
  }
  function rodBetween(a, b, r, color, part, parent) {
    const A = new THREE.Vector3(a[0], a[1], 0), B = new THREE.Vector3(b[0], b[1], 0);
    const m = cyl(r, A.distanceTo(B), 'y', [0, 0, 0], color, part, parent, { metal: true });
    m.position.copy(A).add(B).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.sub(A).normalize());
    return m;
  }
  function tube(points, r, color, part, parent) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, r, 8), mat(color, { metal: true }));
    parent.add(m); register(m, part, {});
    return m;
  }

  // ---------- shared frame: keybed and rails ----------
  const fixed = new THREE.Group();
  scene.add(fixed);
  ext(rect(-30, -14, 520, 0), 100, 0, COLORS.keybed, 'keybed', fixed);
  ext(rect(4, 0, 20, G.frontRailY), 80, 0, COLORS.rail, 'frontrail', fixed);
  ext(rect(G.balX - 12, 0, G.balX + 12, G.balRailY), 80, 0, COLORS.rail, 'balrail', fixed);
  ext(rect(440, 0, 472, G.backRailY - 2), 80, 0, COLORS.rail, 'backrail', fixed);
  ext(rect(440, G.backRailY - 2, 472, G.backRailY), 80, 0, COLORS.felt, 'backrail', fixed);
  // the wippen flanges hang under their pins and screw to the back face of the wippen rail
  ext(rect(G.W[0] - 20, G.W[1] - 26, G.W[0] - 4, G.W[1] - 10), 80, 0, COLORS.rail, 'wippenrail', fixed);
  ext(rect(282, 124, 306, 140), 80, 0, COLORS.rail, 'flangerail', fixed);
  ext(rect(281, 106, 305, 118), 80, 0, COLORS.rail, 'regrail', fixed);
  // the hammer rest rail is one rail for every note
  const restRail = new THREE.Group(); fixed.add(restRail);
  ext(rect(G.restRailX - 8, -12, G.restRailX + 8, -2), 80, 0, COLORS.rail, 'restrail', restRail);
  ext(rect(G.restRailX - 8, -2, G.restRailX + 8, 0), 80, 0, COLORS.felt, 'restrail', restRail);
  // ghost neighbor keys at the regulated height, for the one-note modes
  const ghosts = new THREE.Group(); fixed.add(ghosts);
  const nbTh = Math.asin((G.backRailY - (G.balRailY + 1.5)) / (G.backRailX - G.balX));
  for (const z of [NOTE_Z[1], NOTE_Z[2]]) {
    const nk = new THREE.Group();
    nk.position.set(G.balX, G.balRailY + 1.5, 0); nk.rotation.z = nbTh;
    ext(rect(-235, 0, 235, G.keyThick), 21, z, COLORS.ghost, 'neighbor', nk, { opacity: 0.35 });
    ext(rect(-235, G.keyThick, -85, G.keyThick + G.keyTopCap), 21, z, COLORS.ghost, 'neighbor', nk, { opacity: 0.5 });
    ghosts.add(nk);
  }
  // damper rails, shared by every note: the guide rail the wires pass through, the underlever
  // flange rail, the stop rail over the underlevers and the pedal's lift tray under them
  ext(rect(482, G.stringY - 52.1, 530, G.stringY - 44.1), 80, 0, COLORS.rail, 'guiderail', fixed);
  ext(rect(UL_PIVOT[0] - 12, UL_PIVOT[1] - 32, UL_PIVOT[0] + 22, UL_PIVOT[1] - 8), 80, 0, COLORS.rail, 'ulrail', fixed);
  // the stop rail: a board on edge behind the damper wires, felt on its bottom edge, just over the top flanges
  // (Steinway's technical reference guide, damper chapter; D. Conte, RPT)
  const dStopRail = new THREE.Group(); fixed.add(dStopRail);
  ext(rect(STOP_X[0], 0, STOP_X[1], 34), 80, 0, COLORS.rail, 'damperstop', dStopRail);
  ext(rect(STOP_X[0], 0, STOP_X[1], 3), 80, 0, COLORS.felt, 'damperstop', dStopRail);
  const liftTray = new THREE.Group(); fixed.add(liftTray);
  ext(rect(TRAY_X[0], -10, TRAY_X[1], 0), 80, 0, COLORS.dark, 'lifttray', liftTray);
  const straightedge = new THREE.Group(); fixed.add(straightedge);
  ext(rect(-6, NEIGHBOR_H, 30, NEIGHBOR_H + 3), 90, 0, COLORS.steel, 'straightedge', straightedge, { metal: true, noPick: true });
  straightedge.visible = false;

  // ---------- one note: key, wippen, jack, repetition lever, hammer and its screws ----------
  function makeNote(slot) {
    building = slot;
    const root = new THREE.Group(); root.position.z = NOTE_Z[slot]; scene.add(root);
    const n = { root };
    // punchings, pins, let-off button, drop screw, flanges, strings
    n.frontPunch = cyl(6, 1, 'y', [G.frontRailX, 0, 0], COLORS.felt, 'frontpunch', root);
    cyl(1.2, 22, 'y', [G.frontRailX, G.frontRailY + 11, 0], COLORS.steel, 'frontrail', root, { metal: true, noPick: true });
    n.balPunch = cyl(6, 1, 'y', [G.balX, 0, 0], COLORS.felt, 'balance', root);
    cyl(1.5, 30, 'y', [G.balX, G.balRailY + 15, 0], COLORS.steel, 'balrail', root, { metal: true, noPick: true });
    // wippen flange: a fork hanging under the wippen's center pin, screwed to the wippen rail
    const wfl = n.wfl = new THREE.Group(); wfl.position.set(G.W[0], G.W[1], 0); root.add(wfl);
    ext(shapeFrom(W_FLANGE), 3, -4.3, COLORS.wood, 'wflange', wfl);
    ext(shapeFrom(W_FLANGE), 3, 4.3, COLORS.wood, 'wflange', wfl, { opacity: 0.4 });
    ext(rect(-4, -24.7, 3.2, W_FLANGE_WEB), 5.7, 0, COLORS.wood, 'wflange', wfl);   // into the cheeks a hair: no slit
    // its screw, the one you loosen to space the wippen: built about +y like the hammer flange's, turned to point into the rail
    const wfs = new THREE.Group(); wfs.position.set(...W_FS, 0); wfs.rotation.z = -Math.PI / 2; wfl.add(wfs);
    lathe(FS_HEAD, COLORS.steel, 'wflange', wfs, { metal: true });
    ext(shapeFrom(FS_SLOT), 0.7, 0, COLORS.dark, 'wflange', wfs);
    cyl(FS_R, FS_LEN, 'y', [0, -FS_LEN / 2, 0], COLORS.steel, 'wflange', wfs, { metal: true });
    // traveling paper: a strip between the flange's front face and the rail's back face, at one cheek, peeking over the
    // rail top. Drawn 0.3 mm a strip (real strips are about a tenth of that) so it shows; it grows into the rail face so
    // the flange needn't move (the swing itself is the group's yaw).
    n.wPaper = new THREE.Group(); n.wPaper.position.set(-4, 0, 0); wfl.add(n.wPaper);
    ext(rect(-1, -24, 0, -8.5), 3, 0, COLORS.ghost, 'wflange', n.wPaper);
    // hammer flange: a foot screwed on the flange rail, a body standing over the repetition lever's front end with the
    // drop screw threaded down through it, and a fork round the shank's center pin. Spacing shifts it on the rail.
    const fl = n.flange = new THREE.Group(); root.add(fl);
    // the top slopes up to the body; the screw's head sits on a level shelf behind it
    ext(shapeFrom([[290, 140], [309, 140], [311.5, 145.5], [322, 145.5], [322, 149.5], [FS_X + 3.6, 144 + (FS_X + 3.6 - 290) * 5.5 / 32],
      [FS_X + 3.6, FS_SEAT], [290, FS_SEAT]]), 11, 0, COLORS.wood, 'flange', fl);
    // its two short cheeks round the center pin, rounded about it and flush with the shank's butt (WNG's Renner-type
    // drawing, 06-5110-03): from the side the flange runs straight on into the shank
    const cheek = new THREE.Shape();
    cheek.moveTo(322, G.H[1] - FL_CHEEK_R); cheek.lineTo(G.H[0], G.H[1] - FL_CHEEK_R);
    cheek.absarc(G.H[0], G.H[1], FL_CHEEK_R, -Math.PI / 2, Math.PI / 2, false);
    cheek.lineTo(322, G.H[1] + FL_CHEEK_R); cheek.closePath();
    ext(cheek, 2, -(BUTT_TONGUE_W / 2 + 1), COLORS.wood, 'flange', fl);
    ext(cheek, 2, BUTT_TONGUE_W / 2 + 1, COLORS.wood, 'flange', fl);
    // its screw, on the flat behind the body; a loose one stands up off the flange and leans
    const fs = n.flangeScrew = new THREE.Group(); fs.position.set(FS_X, FS_SEAT, 0); fl.add(fs);
    lathe(FS_HEAD, COLORS.steel, 'flangescrew', fs, { metal: true });
    ext(shapeFrom(FS_SLOT), 0.7, 0, COLORS.dark, 'flangescrew', fs);
    cyl(FS_R, FS_LEN, 'y', [0, -FS_LEN / 2, 0], COLORS.steel, 'flangescrew', fs, { metal: true });
    n.letoffBtn = new THREE.Group(); root.add(n.letoffBtn);
    n.letoffFelt = cyl(5, LETOFF_FELT, 'y', [G.letoffX, LETOFF_FELT / 2, 0], COLORS.redfelt, 'letoff', n.letoffBtn);
    // its screw rides with it, up through the regulating rail, so turning it shows above the rail
    cyl(1.2, LETOFF_LEN, 'y', [G.letoffX, 3 + LETOFF_LEN / 2, 0], COLORS.steel, 'letoff', n.letoffBtn, { metal: true });
    // drop screw: down the middle of the flange's body, its rounded, flattened end stopping the felt on the repetition
    // lever's front end. The whole screw moves when it is regulated, and its spade head turns.
    const ds = n.dropScrew = new THREE.Group(); ds.position.set(G.dropX, 0, 0); fl.add(ds);
    lathe([[0, 0], [1.2, 0.05], [1.65, 0.3], [1.8, 0.7], [1.4, 1.3]], COLORS.steel, 'drop', ds, { metal: true });
    cyl(1.4, DROP_LEN - 1.2, 'y', [0, (DROP_LEN + 1.2) / 2, 0], COLORS.steel, 'drop', ds, { metal: true });
    ext(rect(-1.5, DROP_LEN - 0.2, 1.5, DROP_LEN + 2.4), 0.9, 0, COLORS.steel, 'drop', ds, { metal: true });
    for (const z of [-3.5, 0, 3.5]) cyl(0.55, 420, 'x', [440, G.stringY + 0.55, z], COLORS.string, 'string', root, { metal: true });

    // key, with capstan and backcheck
    const key = n.key = new THREE.Group(); root.add(key);
    ext(rect(-235, 0, 235, G.keyThick), 21, 0, COLORS.keywood, 'key', key);
    ext(rect(-235, G.keyThick, -85, G.keyThick + G.keyTopCap), 21.4, 0, COLORS.keytop, 'key', key);
    ext(rect(-236.5, -2, -235, G.keyThick + G.keyTopCap), 21.4, 0, COLORS.keytop, 'key', key);
    for (const x of [-170, -150]) cyl(4.5, 21.2, 'z', [x, 11, 0], 0x8a8f96, 'key', key, { metal: true, noPick: true });
    // capstan: a brass screw with a shallow dome on top, which the heel cushion rolls on
    n.capstan = cyl(CAP_R, 1, 'y', [G.capstanLocal, 0, 0], COLORS.brass, 'capstan', key, { metal: true });
    n.capDome = new THREE.Mesh(new THREE.SphereGeometry(G.capDomeR, 24, 6, 0, Math.PI * 2, 0, Math.asin(CAP_R / G.capDomeR)), mat(COLORS.brass, { metal: true }));
    key.add(n.capDome); register(n.capDome, 'capstan', {});
    // the wrench holes round its top, which turn as it is regulated
    n.capHoles = new THREE.Group(); key.add(n.capHoles);
    for (let i = 0; i < 4; i++) {
      const t = i * Math.PI / 2, h = cyl(0.75, 0.6, 'x', [0, 0, 0], COLORS.dark, 'capstan', n.capHoles);
      h.position.set(Math.cos(t) * (CAP_R - 0.2), 0, -Math.sin(t) * (CAP_R - 0.2)); h.rotation.y = t;
    }
    // grand backcheck: a block glued on the key, a wire bent back toward the strings, and a wooden head whose
    // buckskin face leans back to meet the falling tail. Bending the wire turns the head about the bend.
    ext(shapeFrom(BC_BLOCK), 12, 0, COLORS.wood, 'backcheck', key);
    rodBetween([BC_PIVOT[0], 14], BC_PIVOT, 1.45, COLORS.steel, 'backcheck', key);
    const bc = n.bc = new THREE.Group(); bc.position.set(...BC_PIVOT, 0); key.add(bc);
    {
      const rel = (pts, o = BC_PIVOT) => pts.map(([x, y]) => [x - o[0], y - o[1]]);
      rodBetween([0, 0], rel([BC_WIRE_TOP])[0], 1.45, COLORS.steel, 'backcheck', bc);
      cyl(1.45, 2.9, 'z', [0, 0, 0], COLORS.steel, 'backcheck', bc, { metal: true });
      // the head on the wire's end: squaring twists it about its middle
      const hd = n.bcHeadG = new THREE.Group(); hd.position.set(...rel([BC_HEAD_C])[0], 0); bc.add(hd);
      ext(shapeFrom(rel(BC_WOOD, BC_HEAD_C)), 12, 0, COLORS.wood, 'backcheck', hd);
      ext(shapeFrom(rel(BC_FELT, BC_HEAD_C)), 12.2, 0, COLORS.redfelt, 'backcheck', hd);
      ext(shapeFrom(rel(BC_LEATHER, BC_HEAD_C)), 12.4, 0, COLORS.buckskin, 'backcheck', hd);
    }

    // wippen, with its heel, the repetition lever's support, the jack stop and the butterfly spring
    const wippen = n.wippen = new THREE.Group(); root.add(wippen);
    wippen.position.set(G.W[0], G.W[1], 0);
    ext(shapeFrom(W_BODY), 11, 0, COLORS.wood, 'wippen', wippen);
    // its front cheeks round the jack; the near one see-through (and clicked through: pick skips 0.3 and under), so the
    // jack's foot and center pin show between them and a click there picks the jack
    ext(shapeFrom(W_CHEEKS), W_CHEEK, -(W_SLOT + W_CHEEK) / 2, COLORS.wood, 'wippen', wippen);
    ext(shapeFrom(W_CHEEKS), W_CHEEK, (W_SLOT + W_CHEEK) / 2, COLORS.wood, 'wippen', wippen, { opacity: 0.3 });
    ext(shapeFrom(W_HEEL), 12, 0, COLORS.wood, 'wippen', wippen);
    n.heelG = new THREE.Group(); n.heelG.position.y = -19.2; wippen.add(n.heelG);   // the cushion packs down toward the heel
    ext(shapeFrom(W_HEEL_FELT.map(([x, y]) => [x, y + 19.2])), 12.4, 0, COLORS.redfelt, 'heel', n.heelG);
    ext(shapeFrom(W_SUPPORT), 2.4, -3.95, COLORS.wood, 'support', wippen);
    ext(shapeFrom(W_SUPPORT), 2.4, 3.95, COLORS.wood, 'support', wippen, { opacity: 0.4 });
    // jack stop: a round wire (Renner), the jack button's felt bearing on its side and its end rounded off
    rodBetween(W_JACK_POST[0], W_JACK_POST[1], 1, COLORS.steel, 'jackstop', wippen);
    lathe([[0, -1], [0.7, -0.7], [1, 0], [0.7, 0.7], [0, 1]], COLORS.steel, 'jackstop', wippen, { metal: true }).position.set(...W_JACK_POST[1], 0);
    cyl(1.6, 4.4, 'z', [...W_SPRING_COIL, 0], COLORS.steel, 'repspring', wippen, { metal: true });
    // each leg is built along the line from the coil to its end, so update() can swing it about the coil and stretch it
    // to keep its end on the part it presses
    n.springLegs = [[W_SPRING_UPPER, -1.2], [W_SPRING_LOWER, 1.6]].map(([pts, z]) => {
      const [cx, cy] = W_SPRING_COIL, [ex, ey] = pts[pts.length - 1], a = Math.atan2(ey - cy, ex - cx), c = Math.cos(a), s = Math.sin(a);
      const leg = new THREE.Group(); leg.position.set(cx, cy, 0); wippen.add(leg);
      tube(pts.map(([x, y]) => [(x - cx) * c + (y - cy) * s, (y - cy) * c - (x - cx) * s, z]), 0.5, COLORS.steel, 'repspring', leg);
      return { leg, len: Math.hypot(ex - cx, ey - cy) };
    });
    center('wcenter', wippen, [0, 0], 12);
    center('jcenter', wippen, G.jackPivotW, 12);
    center('rcenter', wippen, G.repPivotW, 10.6);

    // jack: an L on its center pin, the long arm leaning back under the knuckle, the toe toward the let-off button
    const jack = n.jack = new THREE.Group(); wippen.add(jack);
    jack.position.set(G.jackPivotW[0], G.jackPivotW[1], 0);
    ext(shapeFrom(J_BODY), 5.5, 0, COLORS.jack, 'jack', jack);
    cyl(2.1, 5.7, 'z', [-25.0, 3.0, 0], COLORS.wood, 'tender', jack);
    // regulating screw through the arm; its button's felt rests on the jack stop
    n.jackBtn = new THREE.Group(); jack.add(n.jackBtn);
    ext(shapeFrom(J_BUTTON), 9.5, 0, 0xe8e2d4, 'jackscrew', n.jackBtn);
    ext(shapeFrom(J_BUTTON_FELT), 9.5, 0, COLORS.redfelt, 'jackscrew', n.jackBtn);
    rodBetween(J_SCREW_AXIS.from, J_SCREW_AXIS.to, J_SCREW_AXIS.r, COLORS.steel, 'jackscrew', n.jackBtn);
    cyl(2, 1.6, 'x', [0, 0, 0], COLORS.steel, 'jackscrew', n.jackBtn, { metal: true }).position.set(...J_SCREW_AXIS.from, 0);

    // repetition lever: two cheeks round the window the jack rises through, solid at the tail and the front end
    const rep = n.rep = new THREE.Group(); wippen.add(rep);
    rep.position.set(G.repPivotW[0], G.repPivotW[1], 0);
    ext(shapeFrom(R_BODY), 2.3, -4.35, COLORS.wood, 'rep', rep);
    ext(shapeFrom(R_BODY), 2.3, 4.35, COLORS.wood, 'rep', rep, { opacity: 0.22 });   // see-through, so the jack shows in its window
    ext(shapeFrom(R_TAIL), 6.5, 0, COLORS.wood, 'rep', rep);
    ext(shapeFrom(R_FRONT), 6.5, 0, COLORS.wood, 'rep', rep);
    ext(shapeFrom(R_DROP_FELT), 11, 0, COLORS.redfelt, 'dropfelt', rep);
    ext(shapeFrom(R_WINDOW_FELT), 6.4, 0, COLORS.redfelt, 'windowfelt', rep);
    rodBetween([-18.2, 16.2], [-25.2, -2.7], 1.0, COLORS.steel, 'repspring', rep);          // spring's fine adjustment screw
    cyl(2.2, 0.8, 'y', [-23.2, 2.2, 0], COLORS.steel, 'repspring', rep, { metal: true });
    // height screw through the tail; its felt-bottomed button rests on the wippen
    n.repBtn = new THREE.Group(); rep.add(n.repBtn);
    cyl(1.1, 13.3, 'y', [31.8, -11.75, 0], COLORS.steel, 'repscrew', n.repBtn, { metal: true });
    cyl(1.6, 3.8, 'y', [31.8, -3.2, 0], COLORS.steel, 'repscrew', n.repBtn, { metal: true });
    cyl(4.7, 4.4, 'y', [31.8, -19.6, 0], 0xe8e2d4, 'repbutton', n.repBtn);
    cyl(4.7, R_BUTTON_FELT_H, 'y', [31.8, -24.3, 0], COLORS.redfelt, 'repbutton', n.repBtn);

    // hammer
    // alignment: spacing shifts the whole hammer sideways, traveling tilts its swing about the shank line
    const align = n.align = new THREE.Group(); root.add(align);
    align.position.set(G.H[0], G.H[1], 0);
    const hammer = n.hammer = new THREE.Group(); align.add(hammer);
    cyl(SHANK_R, 132 - BUTT_END, 'x', [(132 + BUTT_END) / 2, 0, 0], COLORS.wood, 'shank', hammer);   // ends hidden inside the molding
    center('hcenter', hammer, [0, 0], BUTT_W + 0.4);
    // a split along the shank: only there when the shank is damaged
    n.crack = ext(rect(30, 2.2, 95, 3.6), 1.2, 3.4, COLORS.dark, 'shank', hammer, { noPick: true });
    // the head twists about the shank's axis when the shank is out of square
    const headG = n.headG = new THREE.Group(); hammer.add(headG);
    // knuckle (the common modern kind, from Greg's photo): a felt roll in buckskin, built round a thin wood tongue
    // through its middle. The tongue stands out of the roll and is glued up into a groove across the shank's underside;
    // its end grain shows on each side of the knuckle, and the back of the jack lines up with its back face.
    {
      const [kx, ky] = G.knuckleC, R = G.knuckleR, t = G.coreT, rollTop = ky + R;
      // the butt: the tongue between the flange cheeks, then the block, its underside coming down flat onto the roll
      const tongue = new THREE.Shape();
      tongue.moveTo(FL_CHEEK_R + 1, -BUTT_TONGUE_R); tongue.lineTo(FL_CHEEK_R + 1, BUTT_TONGUE_R); tongue.lineTo(0, BUTT_TONGUE_R);
      tongue.absarc(0, 0, BUTT_TONGUE_R, Math.PI / 2, 3 * Math.PI / 2, false); tongue.closePath();
      ext(tongue, BUTT_TONGUE_W - 0.6, 0, COLORS.wood, 'shank', hammer);
      // its back end cups round the cheeks' rounded ends, so the flange runs straight on into the shank at any angle
      const rc = FL_CHEEK_R + 0.25, a0 = Math.asin(BUTT_TOP / rc), block = new THREE.Shape();
      block.moveTo(rc * Math.cos(a0), BUTT_TOP);
      [[BUTT_END, BUTT_TOP], [BUTT_END, rollTop], [kx - R, rollTop], [kx - R - 2.5, -BUTT_TOP], [rc * Math.cos(a0), -BUTT_TOP]]
        .forEach(([x, y]) => block.lineTo(x, y));
      block.absarc(0, 0, rc, -a0, a0, false); block.closePath();
      ext(block, BUTT_W, 0, COLORS.wood, 'shank', hammer);
      const cone = new THREE.Mesh(new THREE.CylinderGeometry(SHANK_R, BUTT_TOP, BUTT_CONE, 20).rotateZ(-Math.PI / 2),
        mat(COLORS.wood));
      cone.position.x = BUTT_END + BUTT_CONE / 2; hammer.add(cone); register(cone, 'shank', {});
      // the tongue: from just past the roll's centre, up through the roll and 1.8 mm into the groove
      const core = new THREE.Group(); core.position.set(kx, ky, 0); core.rotation.z = G.coreLean; hammer.add(core);
      ext(rect(-t / 2, -G.coreEnd, t / 2, R + 1.8), 8.4, 0, COLORS.core, 'knucklecore', core);
      // felt and buckskin hang from the roll's top, so wear (the knuckle packing down) flattens only its bottom
      n.knuckle = new THREE.Group(); n.knuckle.position.set(kx, rollTop, 0); hammer.add(n.knuckle);
      const ring = (r0, r1) => {
        const s = new THREE.Shape(); s.absarc(0, -R, r1, 0, 2 * Math.PI, false);
        if (r0) { const h = new THREE.Path(); h.absarc(0, -R, r0, 0, 2 * Math.PI, true); s.holes.push(h); }
        return s;
      };
      ext(ring(0, R - KNUCKLE_LEATHER), 8.2, 0, COLORS.knucklefelt, 'knuckle', n.knuckle);
      ext(ring(R - KNUCKLE_LEATHER, R), 8.2, 0, COLORS.buckskin, 'knuckle', n.knuckle);
    }
    // head: molding and tail in one piece, the underfelt round the molding's tip, the top felt over it, and the
    // scored seat on the tail's back face that the backcheck's buckskin grips
    ext(shapeFrom(H_WOOD), 11.4, 0, COLORS.wood, 'hammer', headG);
    ext(shapeFrom(H_UNDERFELT), 11.2, 0, COLORS.redfelt, 'hammer', headG);
    ext(shapeFrom(H_SEAT), 11.6, 0, COLORS.dark, 'tail', headG);
    n.feltG = new THREE.Group(); n.feltG.position.y = H_FELT_FOOT; headG.add(n.feltG);
    ext(shapeFrom(H_FELT.map(([x, y]) => [x, y - H_FELT_FOOT])), 11, 0, COLORS.hammerfelt, 'hammer', n.feltG);
    // damper: underlever pivoting on its flange behind the keys, lift felt over the key's end, the top flange holding the
    // wire, the wire up through the guide rail, and the head with its two felts sitting on the unison
    const ul = n.ul = new THREE.Group(); ul.position.set(...UL_PIVOT, 0); root.add(ul);
    ext(shapeFrom([[UL_FELT[0] - 7, 3], [-12, 3], [-8, -5], [7, -5], [7, UL_TOP], [UL_FELT[0] - 7, UL_TOP]]), 9, 0, COLORS.wood, 'underlever', ul);
    ext(rect(UL_FELT[0] - 7, UL_FELT[1], UL_FELT[0] + 7, 3), 10, 0, COLORS.redfelt, 'underlever', ul);
    ext(rect(UL_WIRE[0] - 4, UL_WIRE[1], UL_WIRE[0] + 16, UL_WIRE[1] + UL_FLANGE_H), 7, 0, COLORS.wood, 'ulflange', ul);
    cyl(1.3, 2.4, 'z', [UL_WIRE[0], UL_WIRE[1] + UL_FLANGE_H / 2, 4.5], COLORS.brass, 'ulflange', ul, { metal: true });   // its set screw
    // the wire in five straight runs, flange to bend 1 to 4 to the head, laid out each frame
    n.wire = Array.from({ length: 5 }, () => cyl(1, 1, 'y', [0, 0, 0], COLORS.steel, 'damperwire', root, { metal: true }));
    const head = n.dHead = new THREE.Group(); root.add(head);   // origin on the strings' centre line, under the head's middle
    ext(shapeFrom(DH_WOOD.map(([x, y]) => [x, y + DH_SEAT])), DH_WOOD_W, 0, COLORS.wood, 'damper', head);
    for (const x0 of [-DH_LEN / 2, DH_LEN / 2 - DH_PAD]) extAlongX(shapeFrom(DH_FELT_X), x0, x0 + DH_PAD, COLORS.hammerfelt, 'damperfelt', head);
    center('ucenter', ul, [0, 0], 10);
    building = -1;
    return n;
  }
  const notes = [0, 1, 2].map(makeNote);
  const N0 = notes[0];

  // ---------- one note or three ----------
  let noteCount = 1, focus = null;
  function setNoteCount(c) {
    noteCount = c;
    notes.forEach((n, i) => { n.root.visible = i < c; });
    ghosts.visible = c === 1;
    applyFocus();
  }
  // in the three-note model, fade the notes you are not working on so the side views stay readable
  function setFocus(i) { focus = i; applyFocus(); }
  function applyFocus() {
    notes.forEach((n, i) => n.root.traverse(o => {
      if (!o.isMesh) return;
      const faded = noteCount > 1 && focus !== null && i !== focus;
      const op = o.userData.baseOpacity * (faded ? 0.18 : 1);
      // three.js builds an opaque material's shader to draw it solid whatever its opacity: switching needs a rebuild
      if (o.material.transparent !== op < 1) { o.material.transparent = op < 1; o.material.needsUpdate = true; }
      o.material.opacity = op; o.material.depthWrite = !faded;
    }));
  }

  // ---------- callouts (measurement lines with labels) ----------
  const callouts = new Map();
  // the label sits at the line's middle, or with opts.end at its far end, pushed opts.dy pixels down
  // (so two short lines stacked end to end keep their labels apart)
  function setCallout(id, p1, p2, text, opts = {}) {
    let c = callouts.get(id);
    if (!c) {
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xe0583a, depthTest: false }));
      line.renderOrder = 10; scene.add(line);
      const el = document.createElement('div'); el.className = 'callout'; overlay.appendChild(el);
      c = { line, el }; callouts.set(id, c);
    }
    c.line.geometry.setFromPoints([new THREE.Vector3(...p1), new THREE.Vector3(...p2)]);
    c.el.textContent = text;
    c.mid = opts.end ? [...p2] : [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, (p1[2] + p2[2]) / 2];
    c.dy = opts.dy || 0;
  }
  // shown or hidden as a set (the Sandbox's Distances button); hidden ones keep updating, so they come back current
  let calloutsOn = true;
  function setCallouts(on) { calloutsOn = on; }
  function clearCallouts(keep = []) {
    for (const [id, c] of callouts) {
      if (keep.includes(id)) continue;
      scene.remove(c.line); c.el.remove(); callouts.delete(id);
    }
  }

  // ---------- a rule laid on the action, for the student to read (gauge.js; app.js places it every frame) ----------
  // A steel rule standing in the plane of the part's near face, its zero on what is measured from and its scale running
  // down, graduated on the edge next to the part; a fine sight line carried across from the part to the scale, and
  // (mark) a pencil line at the zero. Drawn over everything, so a neighbor's key or hammer in front doesn't hide it.
  const RULE_W = 14, RULE_PX = 32;   // mm wide; texture pixels per mm
  const gauge = new THREE.Group(); gauge.visible = false; scene.add(gauge);
  const ruleMat = new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, side: THREE.DoubleSide });
  const ruleMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), ruleMat); ruleMesh.renderOrder = 20; gauge.add(ruleMesh);
  const gaugeLine = color => {
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color, depthTest: false }));
    l.renderOrder = 21; l.frustumCulled = false; gauge.add(l); return l;   // (moved every frame: its first bounds would cull it)
  };
  const sightLine = gaugeLine(0x101418), zeroLine = gaugeLine(0x1c5fd0);
  let ruleKey = '';
  // the rule's face: `head` mm of plain steel above the zero, then the scale; ticks from the edge on the part's side
  function ruleTexture(units, length, head, ticksOnRight) {
    const cv = document.createElement('canvas'), W = RULE_W * RULE_PX, H = Math.round((length + head) * RULE_PX);
    cv.width = W; cv.height = H;
    const c = cv.getContext('2d');
    c.fillStyle = '#d4d8dd'; c.fillRect(0, 0, W, H);
    c.strokeStyle = '#7d848c'; c.lineWidth = 4; c.strokeRect(2, 2, W - 4, H - 4);
    c.strokeStyle = c.fillStyle = '#15191e'; c.textBaseline = 'middle'; c.textAlign = ticksOnRight ? 'left' : 'right';
    const fine = units === 'in';
    c.font = `600 ${Math.round((fine ? 2.0 : 2.3) * RULE_PX)}px system-ui, sans-serif`;
    for (const t of ruleTicks(units, length)) {
      const y = (head + t.at) * RULE_PX, len = t.rank * 0.46 * W;
      c.lineWidth = t.rank >= 0.8 ? 4 : 3;
      c.beginPath(); c.moveTo(ticksOnRight ? W : 0, y); c.lineTo(ticksOnRight ? W - len : len, y); c.stroke();
      if (t.label && y < H - RULE_PX) c.fillText(t.label, ticksOnRight ? 0.04 * W : 0.96 * W, y);
    }
    if (head > 1.5) c.fillText('0', ticksOnRight ? 0.04 * W : 0.96 * W, head * RULE_PX - 0.9 * RULE_PX);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return tex;
  }
  // g: null to put it away, or { units, length, head, x (the rule's edge on the part's side), side (-1: the rule lies toward
  // the keys from there, +1 toward the strings), z, zero (height of its zero), px, py (where the sight line starts: on the
  // part, at the height being read), mark (a line at the zero too), hideGhosts }
  function setGauge(g) {
    if (!g) { if (gauge.visible) { gauge.visible = false; ghosts.visible = noteCount === 1; } return; }
    const key = `${g.units}|${g.length}|${g.head}|${g.side}`;
    if (key !== ruleKey) { ruleMat.map?.dispose(); ruleMat.map = ruleTexture(g.units, g.length, g.head, g.side < 0); ruleMat.needsUpdate = true; ruleKey = key; }
    const h = g.length + g.head, far = g.x + g.side * RULE_W;
    ruleMesh.scale.set(RULE_W, h, 1);
    ruleMesh.position.set((g.x + far) / 2, g.zero + g.head - h / 2, g.z);
    sightLine.geometry.setFromPoints([new THREE.Vector3(g.px, g.py, g.z + 0.05), new THREE.Vector3(far, g.py, g.z + 0.05)]);
    zeroLine.visible = !!g.mark;
    if (g.mark) zeroLine.geometry.setFromPoints([new THREE.Vector3(g.px, g.zero, g.z + 0.05), new THREE.Vector3(far, g.zero, g.z + 0.05)]);
    gauge.visible = true;
    if (g.hideGhosts) ghosts.visible = false;
  }

  // ---------- tail to backcheck: the narrowest side-view gap between the drawn tail and the backcheck's buckskin ----------
  const TAIL_EDGE = H_WOOD.slice(0, 16);      // the tail's bottom corner and its back face, toward the backcheck
  const BC_FACE = BC_LEATHER.slice(0, 15);    // the buckskin's rounded top and the face it turns to the tail
  const gv = new THREE.Vector3();
  const nearest = (p, a, b) => {
    const ux = b[0] - a[0], uy = b[1] - a[1], t = Math.max(0, Math.min(1, ((p[0] - a[0]) * ux + (p[1] - a[1]) * uy) / (ux * ux + uy * uy)));
    return [a[0] + t * ux, a[1] + t * uy];
  };
  function backcheckGap(slot) {
    const n = notes[slot];
    n.headG.updateWorldMatrix(true, false); n.bcHeadG.updateWorldMatrix(true, false);
    const toW = (pts, obj, o) => pts.map(([x, y]) => { gv.set(x - o[0], y - o[1], 0).applyMatrix4(obj.matrixWorld); return [gv.x, gv.y]; });
    const tail = toW(TAIL_EDGE, n.headG, [0, 0]), face = toW(BC_FACE, n.bcHeadG, BC_HEAD_C);
    let best = { gap: Infinity };
    // each corner of one outline against each edge of the other, both ways round
    for (const [A, B, flip] of [[tail, face, false], [face, tail, true]])
      for (const p of A) for (let i = 1; i < B.length; i++) {
        const q = nearest(p, B[i - 1], B[i]), gap = Math.hypot(p[0] - q[0], p[1] - q[1]);
        if (gap < best.gap) best = flip ? { gap, tail: q, bc: p } : { gap, tail: p, bc: q };
      }
    return best;
  }
  // Is the drawn tail in the drawn backcheck? Side view: a corner of either outline inside the other.
  const inPoly = ([x, y], P) => {
    let c = false;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c;
    return c;
  };
  const toWorld = (pts, obj, o) => pts.map(([x, y]) => { gv.set(x - o[0], y - o[1], 0).applyMatrix4(obj.matrixWorld); return [gv.x, gv.y]; });
  // (points every half millimetre or so along each outline: the buckskin's face is one long straight edge)
  const dense = pts => pts.flatMap((p, i) => { if (!i) return [p]; const a = pts[i - 1], k = Math.ceil(Math.hypot(p[0] - a[0], p[1] - a[1]) / 0.5); return Array.from({ length: k }, (_, j) => [a[0] + (p[0] - a[0]) * (j + 1) / k, a[1] + (p[1] - a[1]) * (j + 1) / k]); });
  const TAIL_PTS = dense(TAIL_EDGE), BC_PTS = dense(BC_FACE);
  function tailHits(n, bc) {
    n.headG.updateWorldMatrix(true, false);
    const edge = toWorld(TAIL_PTS, n.headG, [0, 0]);
    if (edge.some(p => bc.all.some(P => inPoly(p, P)))) return true;
    const wood = toWorld(H_WOOD, n.headG, [0, 0]);
    return bc.face.some(p => inPoly(p, wood));
  }
  // the head's buckskin, the felt under it and its wood, and the points along the buckskin's face
  const bcOutline = n => { n.bcHeadG.updateWorldMatrix(true, false); return { all: [BC_LEATHER, BC_FELT, BC_WOOD].map(P => toWorld(P, n.bcHeadG, BC_HEAD_C)), face: toWorld(BC_PTS, n.bcHeadG, BC_HEAD_C) }; };
  // A backcheck that comes up under a tail carries it: the hammer is drawn no lower than where its tail rests on the
  // buckskin. (model.js has no such contact: a hammer left low while the key goes down, as when a jack set too far
  // forward lets the knuckle slip off early, would otherwise be drawn with the backcheck through its tail.)
  function carriedBy(n, g) {
    const bc = bcOutline(n);
    if (!tailHits(n, bc)) return g;
    let lo = g, hi = g + 0.15;
    for (let i = 0; i < 9; i++) { const mid = (lo + hi) / 2; n.hammer.rotation.z = mid; if (tailHits(n, bc)) lo = mid; else hi = mid; }
    return hi;
  }
  // How far the wire bends for the backcheck knob. model.js catches the tail 3 mm higher for each mm of the knob; the
  // drawn head, turned knob / 80 rad about the wire's bend, meets a checked tail up to about 1.5 mm in from factory, and
  // further in falls behind (a "checked" hammer was drawn with daylight round its tail). So past there the wire is drawn
  // bent the little more that brings the buckskin up to the tail where the model checks it, as far as it can go without
  // standing in the resting tail: worked out once, on the factory action, knob by knob.
  const BC_KNOBS = Array.from({ length: 33 }, (_, i) => -4 + i * 0.25);
  let bcMore = null;
  function fitBackcheck() {
    const n = notes[0], more = [];
    for (const o of [n.align, n.headG, n.bc, n.bcHeadG, n.key]) o.rotation.set(0, 0, 0);
    n.align.position.z = 0;
    for (const b of BC_KNOBS) {
      const a = eff({ ...FACTORY, backcheck: b }), d = dipOf(a);
      const at = (dKey, g, t) => {
        const k = keyAngle(a, dKey); n.key.position.set(G.balX, k.By, 0); n.key.rotation.z = k.th;
        n.hammer.rotation.z = g; n.bc.rotation.z = b / 80 + t;
        return tailHits(n, bcOutline(n));
      };
      const L0 = linkage(a, 0), gRest = gOnJackAt(L0, L0.psiRest), gChk = gFromTail(linkage(a, d).bcCatchY);
      let t = 0;
      if (!at(d, gChk, 0) && at(d, gChk, 0.12)) { let lo = 0, hi = 0.12; for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; if (at(d, gChk, mid)) hi = mid; else lo = mid; } t = lo; }
      // not into the tail of the hammer at rest (with a little air: 0.004 rad is about 0.2 mm at the head)
      while (t > 0 && at(0, gRest, t + 0.004)) t = Math.max(0, t - 0.002);
      more.push(t);
    }
    bcMore = more;
  }
  const bcLean = b => {
    if (!bcMore) fitBackcheck();
    const x = Math.max(0, Math.min(BC_KNOBS.length - 1.001, (b + 4) / 0.25)), i = Math.floor(x);
    return b / 80 + bcMore[i] + (bcMore[i + 1] - bcMore[i]) * (x - i);
  };
  // The tripped jack against the knuckle: model.js holds an escaped jack just past the point the knuckle slipped off
  // it, where the drawn corner would still stand in the knuckle's roll once the knuckle has come down beside it (on the
  // lever, or in check). It is drawn tripped the little further that leaves its back just touching the roll.
  const J_BACK_LOW = (() => {   // the back edge's line, moved in by the corner's radius so it runs from the corner's centre
    const [px, py] = [4.9, 8.9], [cx, cy] = G.jackTop, l = Math.hypot(cx - px, cy - py);
    return [px - (cy - py) / l * G.jackTopR, py + (cx - px) / l * G.jackTopR];
  })();
  function clearOfKnuckle(L, psi, g, wear) {
    const k = hamPt(g, G.knuckleC), R = G.knuckleR + WEAR.knuckle * wear + G.jackTopR - 0.05;
    const gap = s => { const q = nearest(k, L.jackPt(s, G.jackTop), L.jackPt(s, J_BACK_LOW)); return Math.hypot(k[0] - q[0], k[1] - q[1]) - R; };
    if (gap(psi) >= 0) return psi;
    let lo = psi, hi = psi + 0.15;
    for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; if (gap(mid) < 0) lo = mid; else hi = mid; }
    return hi;
  }

  // ---------- part labels (on the middle note) ----------
  const LABELS = [
    [N0.key, [-150, 30, 0], 'Key'], [N0.capDome, [0, 4, 0], 'Capstan'], [fixed, [G.balX, 12, 41], 'Balance rail'],
    [fixed, [12, 8, 41], 'Front rail'], [fixed, [456, 12, 41], 'Back rail'], [N0.wippen, [-28, 2, 7], 'Wippen'],
    [N0.jack, [8, 28, 4], 'Jack'], [N0.rep, [-12, 9, 7], 'Repetition lever'], [N0.letoffBtn, [G.letoffX, -1, 6], 'Let-off button'],
    [N0.root, [G.dropX, 146, 10], 'Drop screw'], [N0.hammer, [G.knuckleC[0], G.knuckleC[1] - 4, 5], 'Knuckle'],
    [N0.hammer, [70, 4, 4], 'Shank'], [N0.hammer, [132, 30, 7], 'Hammer'], [N0.hammer, [133, -20, 6], 'Tail'],
    [N0.bc, [12, 40, 7], 'Backcheck'], [restRail, [G.restRailX, -8, 41], 'Rest rail'], [fixed, [294, 140, 41], 'Hammer flange rail'],
    [fixed, [293, 118, 41], 'Regulating rail'], [N0.root, [560, G.stringY + 3, 0], 'Strings'], [fixed, [G.W[0] - 12, G.W[1] - 10, 41], 'Wippen rail'],
    [N0.wippen, [-48, 31, 5], 'Support'], [N0.jack, [20, 30, 6], 'Jack button'], [N0.wippen, [-62, -22, 7], 'Heel'],
    [N0.dHead, [0, DH_SEAT + 13, 6], 'Damper'], [N0.ul, [-72, UL_TOP, 6], 'Underlever'], [fixed, [506, G.stringY - 44.1, 41], 'Damper guide rail'],
    [dStopRail, [(STOP_X[0] + STOP_X[1]) / 2, 34, 41], 'Damper stop rail'], [liftTray, [(TRAY_X[0] + TRAY_X[1]) / 2, -10, 41], 'Lift tray']
  ].map(([obj, p, text]) => {
    const e = document.createElement('div'); e.className = 'plabel'; e.textContent = text; e.hidden = true; overlay.appendChild(e);
    return { obj, p: new THREE.Vector3(...p), e };
  });
  let labelsOn = false;
  function setLabels(on) { labelsOn = on; for (const l of LABELS) l.e.hidden = !on; }
  const lv = new THREE.Vector3();
  function updateLabels() {
    if (!labelsOn) return;
    scene.updateMatrixWorld();
    const w = canvas.clientWidth, h = canvas.clientHeight;
    for (const l of LABELS) {
      lv.copy(l.p); l.obj.localToWorld(lv); lv.project(camera);
      l.e.style.transform = `translate(${(lv.x * 0.5 + 0.5) * w}px, ${(-lv.y * 0.5 + 0.5) * h}px)`;
      const off = notes[0].stackOff && !KEY_LABELS.has(l.e.textContent);   // nothing named over a lifted-off stack
      l.e.style.display = lv.z < 1 && Math.abs(lv.x) < 1.05 && Math.abs(lv.y) < 1.05 && !off ? '' : 'none';
    }
  }

  // ---------- views ----------
  const VIEWS = {
    action: { t: [255, 105, 0], p: [255, 130, 1000] },
    angle: { t: [320, 110, 0], p: [-60, 270, 520] },
    escapement: { t: [330, 115, 0], p: [330, 121, 250] },
    keyfront: { t: [10, 55, 0], p: [-190, 125, 110] },
    hammer: { t: [425, 162, 0], p: [425, 165, 330] },
    backcheck: { t: [445, 125, 0], p: [452, 128, 330] },
    // the rest rail under the shank, close enough to see the gap (1/8 in is about 20 px on a desktop)
    rails: { t: [G.restRailX, 112, 0], p: [G.restRailX, 116, 225] },
    // the wippen on its flange and rail (the tilt test)
    wippen: { t: [325, 120, 0], p: [325, 125, 270] },
    // the wink test: the jack being tripped and, in the same picture, the hammer head that dips
    wink: { t: [398, 138, 0], p: [398, 142, 335] },
    // looking down the keys from the player's side at the hammer tops: sight the hammer line
    hammerline: { t: [460, 154, 0], p: [280, 237, 0] },
    dampers: { t: [522, 124, 0], p: [522, 134, 420] },
    // straight along the action from the front, through a slice cut out of it: the jack under the knuckle,
    // and the checked hammer's tail on its backcheck; then the backcheck from above, the hammer cut away
    jackfront: { t: [339, 122, 0], p: [205, 127, 0], clip: { x: [329, 350] } },
    checkfront: { t: [455, 116, 0], p: [325, 120, 0], clip: { x: [446, 470] } },
    checktop: { t: [456, 106, 0], p: [438, 232, 0.1], clip: { y: 113 } },
    // the damper heads on their strings, from above the hammers
    damperline: { t: [506, G.stringY + 3, 0], p: [420, G.stringY + 85, 0] },
    // three dampers side by side from the treble end, low enough to see each head lift off its strings
    damperrow: { t: [506, G.stringY - 2, 0], p: [385, G.stringY + 50, 165] },
    // traveling: straight along the action from the keys, through a slice round the hammer head, so the head rises
    // toward its unison (the three strings end-on) with nothing in front of it
    travel: { t: [455, 164, 0], p: [333, 166, 0], clip: { x: [436, 474] } },   // about 132 to 197 high: a low rail's head too
    // down onto the key fronts and their neighbors: the gaps show the key's side play
    keytop: { t: [30, 26, 0], p: [-50, 250, 0] },
  };
  // A clipped view keeps only a slice of the action. Cut parts are drawn two-sided so they show their insides.
  let clipNow = null;
  const inClip = p => !clipNow || (clipNow.x ? p.x >= clipNow.x[0] && p.x <= clipNow.x[1] : p.y <= clipNow.y);
  function setClip(c) {
    clipNow = c || null;
    const P = (x, y, k) => new THREE.Plane(new THREE.Vector3(x, y, 0), k);
    renderer.clippingPlanes = !c ? [] : c.x ? [P(1, 0, -c.x[0]), P(-1, 0, c.x[1])] : [P(0, -1, c.y)];
    const side = c ? THREE.DoubleSide : THREE.FrontSide;
    for (const r of [fixed, ...notes.map(n => n.root)]) r.traverse(o => { if (o.isMesh && o.material.side !== side) { o.material.side = side; o.material.needsUpdate = true; } });
  }
  let viewAnim = null, viewZ = 0, viewName = 'action';
  // pull the camera back on tall, narrow screens so the same width of the action fits
  function viewPos(v) {
    const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    const k = aspect < 1.4 ? Math.min(2.4, 1.4 / aspect) : 1;
    const t = new THREE.Vector3(...v.t);
    return new THREE.Vector3(...v.p).sub(t).multiplyScalar(k).add(t);
  }
  // side views follow the note being worked on; the views of all three together stay centered
  let home = { name: 'action', z: 0 };   // the view Reset view goes back to
  function setView(name, z = viewZ) {
    viewZ = z; viewName = name; home = { name, z };
    const v = VIEWS[name] || VIEWS.action;
    setClip(v.clip);
    const dz = name === 'hammerline' || name === 'damperrow' ? 0 : z;
    const toT = new THREE.Vector3(...v.t), toP = viewPos(v);
    toT.z += dz; toP.z += dz;
    viewAnim = { t0: performance.now(), fromT: controls.target.clone(), fromP: camera.position.clone(), toT, toP };
  }
  camera.position.copy(viewPos(VIEWS.action)); controls.target.set(...VIEWS.action.t);
  // the on-screen move buttons: zoom toward or away from the point looked at, slide across the screen, or go back
  function settle() {   // pressed during a change of view: finish the change, then move from there
    if (viewAnim) { controls.target.copy(viewAnim.toT); camera.position.copy(viewAnim.toP); camera.lookAt(controls.target); viewAnim = null; }
    spin = false;   // a tool on the bench stops turning, as it does when dragged
  }
  function zoomBy(f) {   // f < 1 steps in
    settle();
    const d = THREE.MathUtils.clamp(camera.position.distanceTo(controls.target) * f, controls.minDistance, controls.maxDistance);
    camera.position.sub(controls.target).setLength(d).add(controls.target);
  }
  const sideV = new THREE.Vector3(), upV = new THREE.Vector3();
  function slideBy(dx, dy) {   // in screen heights: +dx sees more to the right, +dy more above
    settle();
    const h = 2 * camera.position.distanceTo(controls.target) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    sideV.set(dx * h, 0, 0).applyQuaternion(camera.quaternion);
    upV.set(0, dy * h, 0).applyQuaternion(camera.quaternion);
    sideV.add(upV); camera.position.add(sideV); controls.target.add(sideV);
  }
  function resetView() {
    if (!toolStage.visible) { setView(home.name, home.z); return; }
    viewAnim = { t0: performance.now(), fromT: controls.target.clone(), fromP: camera.position.clone(),
      toT: toolHome.t.clone(), toP: toolHome.off.clone().multiplyScalar(toolDistance() / toolHome.d).add(toolHome.t) };
  }

  // ---------- highlight & hover ----------
  let highlighted = [];
  function highlight(parts, note = null) {
    for (const m of highlighted) m.material.emissive.setHex(0);
    highlighted = [];
    // the flange knobs work its screw too, and the damper's lift timing is set at the underlever's top flange
    const also = { flange: ['flangescrew'], damper: ['damperfelt', 'ulflange'] };
    for (const p of [].concat(parts || []).flatMap(p => [p, ...(also[p] || [])])) for (const m of partMeshes[p] || []) {
      if (note !== null && m.userData.note !== -1 && m.userData.note !== note) continue;
      m.material.emissive.setHex(0x7a4a00); highlighted.push(m);
    }
  }
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const shown = o => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
  function pick(ev) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    // faded exam notes stay clickable; only see-through-by-design parts (cheeks, ghosts) are skipped
    // ...nor parts a clipped view has cut away
    // a faded note in front of the one in focus (a side view sights all three in line) gives way to it and the shared rails
    const hits = ray.intersectObjects(pickables, false).filter(h => shown(h.object) && h.object.userData.baseOpacity > 0.3 && inClip(h.point));
    const mine = h => noteCount < 2 || focus === null || h.object.userData.note === focus || h.object.userData.note === -1;
    const hit = hits.find(mine) || hits[0];
    // obj and local pin the spot clicked to the part, so a card can follow it as the part and the view move
    return hit ? { part: hit.object.userData.part, note: hit.object.userData.note, obj: hit.object, local: hit.object.worldToLocal(hit.point.clone()) } : null;
  }
  // where a spot on a part is on the picture, in pixels from its top left; on: in front of the camera, in the picture and not cut away
  const sv = new THREE.Vector3();
  function screenOf(obj, local) {
    sv.copy(local); obj.localToWorld(sv);
    const cut = !inClip(sv) || !shown(obj);
    sv.project(camera);
    return { x: (sv.x * 0.5 + 0.5) * canvas.clientWidth, y: (-sv.y * 0.5 + 0.5) * canvas.clientHeight,
      on: sv.z < 1 && Math.abs(sv.x) < 1 && Math.abs(sv.y) < 1 && !cut };
  }

  // ---------- update from the model ----------
  let bg = null;
  function setBackground(hex) { if (hex !== bg) { scene.background = new THREE.Color(hex); bg = hex; } }

  // with the stack lifted off the keys (the key drop test) only the keys and the keyframe show
  const KEY_PARTS = new Set(['key', 'keytop', 'neighbor', 'balance', 'balrail', 'frontrail', 'frontpunch', 'backrail', 'capstan', 'backcheck', 'keybed']);
  const KEY_LABELS = new Set(['Key', 'Capstan', 'Balance rail', 'Front rail', 'Back rail', 'Backcheck']);
  function showStack(n, on, shared) {
    for (const c of n.root.children) c.visible = on || c === n.key || KEY_PARTS.has(c.userData.part);
    // the shared rails come back with any note's stack (a test cut short by a mode change can leave another note current)
    if (shared || on) for (const c of fixed.children) if (c !== ghosts && c !== straightedge) c.visible = on || KEY_PARTS.has(c.userData.part);
  }

  function update(slot, sim, a, hammerOverride = null, jackOverride = null, drawShared = slot === 0) {
    if (!bcMore) fitBackcheck();   // (it poses the middle note to do it: before this frame's own pose)
    const n = notes[slot];
    const k = keyAngle(a, sim.keyShown ?? sim.d);
    n.key.position.set(G.balX, k.By, 0); n.key.rotation.z = k.th;
    // key bushings: side play lets the front swing about the balance pin, and twist on it; a worn one rests off center
    n.key.rotation.y = Math.asin(BASS * (sim.keyRock ?? a.keyLean ?? 0) / -G.keyFrontLocal);
    n.key.rotation.x = sim.keyTwist ?? 0;
    if (!!n.stackOff !== !!sim.stackOff) { n.stackOff = !!sim.stackOff; showStack(n, !n.stackOff, drawShared); }
    const L = sim.L;
    n.wippen.rotation.z = L.phi;
    // (a tripped jack is drawn clear of the knuckle's roll; one a test or a hand holds is where that puts it)
    const psiShown = jackOverride ?? (sim.st?.escaped && sim.hand?.hold !== 'jack' ? clearOfKnuckle(L, sim.psi, hammerOverride ?? sim.g, a.wear || 0) : sim.psi);
    n.jack.rotation.z = psiShown;
    // side play the center tests rock (model.js Sim.reset): the jack on its pin, the hammer on its pin (the wippen: below)
    n.jack.rotation.x = Math.asin(BASS * (sim.jackRock || 0) / G.jackTop[1]);   // rocking on its pin: the top moves, not the end in the cheeks
    n.align.rotation.y = Math.asin(-BASS * (sim.hammerRock || 0) / G.crownC[0]);
    // repetition lever: horn sits under the knuckle or at its stop/drop limit
    const kb = knuckleBottom(hammerOverride ?? sim.g)[1];
    n.rep.rotation.z = -repRho(L, Math.min(L.hornTop, kb));
    // the butterfly spring's legs follow the lever's fine-adjust plate and the jack's heel
    legTo(n.springLegs[0], G.repPivotW, R_SPRING_SEAT, n.rep.rotation.z);
    legTo(n.springLegs[1], G.jackPivotW, J_SPRING_SEAT, n.jack.rotation.z);
    n.hammer.rotation.z = hammerOverride ?? sim.g;
    // side to side: the wippen shifted on its flange, the backcheck wire bent over and its head twisted
    n.wippen.position.z = n.wfl.position.z = BASS * (a.wippenSpace || 0);
    // traveling paper behind one side of the wippen flange swings the wippen on the rail like a gate: the jack top, 82 mm
    // forward of the flange, moves toward the paper's side by the knob's amount, the heel about 72% of it
    const wt = a.wippenTravel || 0, wYaw = Math.asin(Math.max(-0.1, Math.min(0.1, BASS * wt / WIPPEN_JACK_ARM)));
    n.wfl.rotation.y = wYaw;
    n.wippen.rotation.y = wYaw + Math.asin(BASS * (sim.wippenRock || 0) / WIPPEN_JACK_ARM);   // rocking on its flange's pin
    n.wPaper.visible = Math.abs(wt) > 0.005;
    n.wPaper.scale.x = Math.round(Math.abs(wt) / WIPPEN_PAPER) * 0.3 || 0.3;
    n.wPaper.position.z = BASS * Math.sign(wt) * 4.3;
    n.bc.rotation.x = Math.asin(Math.max(-0.5, Math.min(0.5, BASS * (a.backcheckSpace || 0) / BC_ARM)));
    n.bcHeadG.rotation.y = (a.backcheckSquare || 0) * Math.PI / 180;
    // alignment: spacing, traveling (drift at the string = 47 mm of rise times the tilt), squaring
    const tilt = -BASS * (a.hammerTravel || 0) / TRAVEL_RISE;    // + travel drifts toward the treble; the crown rises about 44.5 mm to the strings
    n.align.rotation.x = tilt;
    n.align.position.z = BASS * (a.hammerSpace || 0) - SIDE_K * Math.sin(tilt);   // keep the resting head where spacing puts it (model.js sideZ)
    n.flange.position.z = BASS * (a.hammerSpace || 0);
    const loose = a.damage === 'looseFlange';
    n.flangeScrew.position.y = FS_SEAT + (loose ? FS_LOOSE_LIFT : 0); n.flangeScrew.rotation.z = loose ? FS_LOOSE_LEAN : 0;
    const wob = a.wobble ? a.wobble * ((sim.strikes || 0) % 2 ? 1 : -1) : 0;   // a split shank wobbles blow to blow
    n.headG.rotation.x = ((a.hammerSquare || 0) + wob) * Math.PI / 180;
    n.crack.visible = a.damage === 'splitShank';
    // adjustable parts
    const cap = Math.max(0.5, a.capstan);
    n.capstan.scale.y = Math.max(0.1, cap - CAP_H); n.capstan.position.y = G.keyThick + (cap - CAP_H) / 2;
    n.capDome.position.set(G.capstanLocal, G.keyThick + cap - G.capDomeR, 0);
    n.capHoles.position.set(G.capstanLocal, G.keyThick + cap - CAP_H - 2.2, 0); n.capHoles.rotation.y = 2 * Math.PI * (a.capstan - WEAR.capstan * (a.wear || 0)) / CAP_PITCH;   // turned by the knob, not by wear
    // the jack screw moves its button along the screw so the felt meets the stop at the jack's rest angle
    n.jackBtn.position.set(...jackBtnShift(L.psiRest), 0);
    // the height screw moves its button down the tail until it sits on the wippen with the lever at its stop
    n.repBtn.position.y = repBtnShift(L.rhoStop);
    n.balPunch.scale.y = Math.max(0.3, a.balPunch); n.balPunch.position.y = G.balRailY + Math.max(0.3, a.balPunch) / 2 - Math.max(0, 0.3 - a.balPunch);
    n.frontPunch.scale.y = Math.max(0.3, a.frontPunch); n.frontPunch.position.y = G.frontRailY + Math.max(0.3, a.frontPunch) / 2;
    n.letoffBtn.position.y = a.letoff;
    // A jack jammed on its stop felt can't trip any further, while the model's key goes on down: the tender is drawn
    // squashing the button's felt (up to 60% of it) rather than passing through it.
    const squash = Math.max(0, Math.min(0.6 * LETOFF_FELT, L.jackPt(psiShown, [-25, 3])[1] + 2.1 - a.letoff));
    n.letoffFelt.scale.y = (LETOFF_FELT - squash) / LETOFF_FELT; n.letoffFelt.position.y = squash + (LETOFF_FELT - squash) / 2;
    n.dropScrew.position.y = a.drop; n.dropScrew.rotation.y = 2 * Math.PI * (a.drop - FACTORY.drop) / DROP_PITCH;   // right-hand thread: up turns it anticlockwise
    if (drawShared) restRail.position.y = a.restRail;
    n.bc.rotation.z = bcLean(a.backcheck - (a.wear || 0) * WEAR.backcheck);
    // Bent in past where it scrapes, the head can't be drawn any closer without standing in the resting tail; there the
    // wire is drawn giving to the tail it holds, so a checked hammer still shows the buckskin on its tail
    if (sim.st?.checked && hammerOverride === null && a.backcheck > 2) {
      const hit = t => { n.bc.rotation.z = bcLean(a.backcheck - (a.wear || 0) * WEAR.backcheck) + t; return tailHits(n, bcOutline(n)); };
      if (!hit(0) && hit(0.08)) { let lo = 0, hi = 0.08; for (let i = 0; i < 9; i++) { const mid = (lo + hi) / 2; if (hit(mid)) hi = mid; else lo = mid; } hit(lo); }
      else hit(0);
    }
    // the backcheck under a tail the model has left low carries it (not while it has the hammer in check, nor a test's or a hand's hammer)
    if (hammerOverride === null && L.depth > 0.3 && !sim.st?.checked && !sim.st?.catching && sim.hand?.hold !== 'hammer' && !sim.stackOff)
      n.hammer.rotation.z = carriedBy(n, sim.g);
    // packed-down felts
    const w = a.wear || 0;
    n.knuckle.scale.y = (2 * G.knuckleR + WEAR.knuckle * w) / (2 * G.knuckleR);
    n.feltG.scale.y = (G.crownC[1] + G.crownR - H_FELT_FOOT + WEAR.crown * w) / (G.crownC[1] + G.crownR - H_FELT_FOOT);
    n.heelG.scale.y = (2.1 + WEAR.capstan * w) / 2.1;
    // damper: the underlever's felt sits damperGap above the key end; the head rises with it
    const keyTop = k.By + Math.sin(k.th0) * G.dmpContactLocal + G.keyThick * Math.cos(k.th0);
    // (the underlever drop test lifts the underlever alone, its wire unhooked: the head stays on the strings)
    const feltY = keyTop + (a.damperGap ?? 3.5) + (sim.ulShown ?? sim.yd / G.dmpRatio);
    const th = solveUl(feltY);
    n.ul.rotation.z = th;
    // a head bent off its seat rests on one end, the other up by damperLevel; one bent sideways sits off its unison
    const lvl = a.damperLevel || 0, hz = BASS * (a.damperCenter || 0), hy = G.stringY + sim.yd + Math.abs(lvl) / 2;
    n.dHead.position.set(DH_X, hy, hz);
    n.dHead.rotation.z = lvl / DH_LEN;
    // the wire from the top flange (riding on the underlever) to the head's middle, between its felts
    const fl = ulPt(th, [UL_WIRE[0], UL_WIRE[1] + UL_FLANGE_H]);
    const wp = [[fl[0], fl[1], 0], [DH_X, hy + WIRE_B1, 0], [DH_X, hy + WIRE_B2, WIRE_Z], [DH_X, hy + WIRE_B3, WIRE_Z],
      [DH_X, hy + WIRE_B4, hz], [DH_X, hy + DH_SEAT + 3, hz]];
    n.wire.forEach((m, i) => rodTo(m, wp[i], wp[i + 1]));
    if (drawShared) {
      // the stop rail's felt sits where the top flange's top would be with the damper lifted damperStop;
      // the lift tray's top comes up to the line of underlevers (a regulated note's, FACTORY.damperGap) after its free
      // play, and touches this underlever's underside sooner or later as it sits below or above that line
      const feltRest = keyTop + (a.damperGap ?? 3.5);
      const ulY = (th, lx, ly) => UL_PIVOT[1] + lx * Math.sin(th) + ly * Math.cos(th);
      dStopRail.position.y = ulY(solveUl(feltRest + (a.damperStop ?? 7) / G.dmpRatio), ...UL_STOP);
      liftTray.position.y = ulY(solveUl(keyTop + FACTORY.damperGap + trayLift(a, sim.pedal ?? 0) / G.dmpRatio), ...UL_TRAY) - 0.3;
    }
  }
  // jack-local shift of the jack button along its screw that puts its felt on the stop face at jack angle psi
  const scrU = (() => { const [a, b] = [J_SCREW_AXIS.from, J_SCREW_AXIS.to], l = Math.hypot(b[0] - a[0], b[1] - a[1]); return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; })();
  function jackBtnShift(psi) {
    const c = Math.cos(psi), s = Math.sin(psi), rot = p => [p[0] * c - p[1] * s, p[0] * s + p[1] * c];
    const f = rot(J_BTN_CONTACT), u = rot(scrU), { p, n: nn } = W_STOP_FACE;
    const gap = (G.jackPivotW[0] + f[0] - p[0]) * nn[0] + (G.jackPivotW[1] + f[1] - p[1]) * nn[1];
    const k = -gap / (u[0] * nn[0] + u[1] * nn[1]);
    return [scrU[0] * k, scrU[1] * k];
  }
  // swing and stretch a spring leg about the coil so its end sits on point p of a part pinned at o and turned to angle a
  function legTo({ leg, len }, o, [px, py], a) {
    const x = o[0] + px * Math.cos(a) - py * Math.sin(a) - W_SPRING_COIL[0], y = o[1] + px * Math.sin(a) + py * Math.cos(a) - W_SPRING_COIL[1];
    leg.rotation.z = Math.atan2(y, x); leg.scale.x = Math.hypot(x, y) / len;
  }
  // rep-local drop of the height screw's button that seats it on the wippen top (y 0.7) with the lever at rho
  function repBtnShift(rho) {
    const [x, y] = R_BUTTON_C, c = Math.cos(-rho), s = Math.sin(-rho);
    return (0.7 - G.repPivotW[1] - x * s) / c - y;
  }
  // a point on the underlever, given in its own frame, with the underlever at angle th
  const ulPt = (th, [lx, ly]) => [UL_PIVOT[0] + lx * Math.cos(th) - ly * Math.sin(th), UL_PIVOT[1] + lx * Math.sin(th) + ly * Math.cos(th)];
  // lay a unit-length rod (a cylinder along y) from a to b
  const UP = new THREE.Vector3(0, 1, 0), ra = new THREE.Vector3(), rb = new THREE.Vector3();
  function rodTo(m, a, b) {
    ra.set(...a); rb.set(...b);
    const len = ra.distanceTo(rb);
    m.position.copy(ra).add(rb).multiplyScalar(0.5);
    m.scale.set(1, Math.max(1e-3, len), 1);
    if (len > 1e-6) m.quaternion.setFromUnitVectors(UP, rb.sub(ra).divideScalar(len));
  }
  // underlever angle that puts its lift felt at height y
  function solveUl(y) {
    let lo = -0.5, hi = 0.5;
    for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (UL_PIVOT[1] + UL_FELT[0] * Math.sin(m) + UL_FELT[1] * Math.cos(m) > y) lo = m; else hi = m; }
    return (lo + hi) / 2;
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.floor(w * renderer.getPixelRatio()) || canvas.height !== Math.floor(h * renderer.getPixelRatio())) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
      refitTool();
    }
  }
  // ---------- key-front inset: the one part no side view keeps in frame, so you see the key travel beside the action ----------
  // the key's front and its front rail punching, from in front, a little above and to the treble side (not so far to the
  // side that a neighbor key hides it)
  const INSET = { t: [6, 44, 0], p: [-80, 66, 38] };
  const insetCam = new THREE.PerspectiveCamera(30, 4 / 3, 5, 5000);
  // the box takes the pointer, so a click or drag there doesn't reach the part of the action hidden behind it;
  // clicking it opens the full Key front view
  const insetBox = document.createElement('div'); insetBox.id = 'inset'; insetBox.hidden = true; overlay.appendChild(insetBox);
  insetBox.style.pointerEvents = 'auto'; insetBox.title = 'The key front: click for the full view';
  const insetText = document.createElement('div'); insetText.className = 'inset-text'; insetBox.appendChild(insetText);
  let insetOn = false, insetMode = 'key';
  function setInset(on) { insetOn = on; }
  function setInsetText(t) { if (insetText.textContent !== t) insetText.textContent = t; }
  // What the inset shows: the key front, or ('crown') the hammer's crown at the string, side on and close, for stepping
  // through let-off and drop a frame at a time: the Jack & knuckle view that goes with it has the hammer head out of the
  // picture, and let-off is the hammer's distance from the string. Its let-off and drop lines show in it.
  const INSET_CROWN = { t: [462, G.stringY - 7, 0], p: [462, G.stringY - 6.5, 80] };
  function setInsetMode(m) { insetMode = m; insetBox.title = m === 'crown' ? 'The hammer at the string: click for the Hammer view' : 'The key front: click for the full view'; }
  // top left, under the view buttons however many rows they wrap to: clear of the strings, the damper and the hammer
  // head in the opening view and the side views (top right, it sat on them), about a quarter of the stage wide.
  // Measured again only when the stage changes size.
  const viewsBar = document.getElementById('views'), navpad = document.getElementById('navpad');
  let insetAt = null;
  if (window.ResizeObserver) { const ro = new ResizeObserver(() => { insetAt = null; }); for (const e of [viewsBar, navpad]) if (e) ro.observe(e); }   // the bars wrap or reflow
  function insetRect() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (insetAt?.sw === w && insetAt.sh === h) return insetAt;
    const iw = Math.round(Math.max(150, Math.min(280, w * 0.26))), ih = Math.round(iw * 0.72);
    const top = Math.max(56, viewsBar ? viewsBar.offsetTop + viewsBar.offsetHeight + 8 : 0);
    insetAt = { x: viewsBar ? Math.max(8, viewsBar.offsetLeft) : 10, top, w: iw, h: ih, sw: w, sh: h };
    insetBox.style.cssText = `left:${insetAt.x}px;top:${top}px;width:${iw}px;height:${ih}px;pointer-events:auto`;
    return insetAt;
  }
  // not in the clipped views (they look along the action at one slice, and swapping their clipping planes out and back
  // every frame would send every material back through the shader cache)
  function renderInset() {
    const crown = insetMode === 'crown', V = crown ? INSET_CROWN : INSET;
    const show = insetOn && !toolStage.visible && viewName !== (crown ? 'hammer' : 'keyfront') && !clipNow;
    if (insetBox.hidden === show) insetBox.hidden = !show;
    if (!show) return;
    const r = insetRect(), y = r.sh - r.top - r.h;   // the renderer counts from the bottom
    insetCam.position.set(V.p[0], V.p[1], V.p[2] + viewZ); insetCam.lookAt(V.t[0], V.t[1], V.t[2] + viewZ);
    insetCam.aspect = r.w / r.h; insetCam.updateProjectionMatrix();
    // the lines' labels are placed for the main view only; at the string the let-off and drop lines themselves show
    for (const c of callouts.values()) c.line.visible = crown && calloutsOn;
    renderer.setScissorTest(true); renderer.setScissor(r.x, y, r.w, r.h); renderer.setViewport(r.x, y, r.w, r.h);
    renderer.render(scene, insetCam);
    renderer.setScissorTest(false); renderer.setViewport(0, 0, r.sw, r.sh);
    for (const c of callouts.values()) c.line.visible = calloutsOn;
  }

  const v3 = new THREE.Vector3();
  function render() {
    resize();
    if (viewAnim) {
      const t = Math.min(1, (performance.now() - viewAnim.t0) / 700), e = t * t * (3 - 2 * t);
      controls.target.lerpVectors(viewAnim.fromT, viewAnim.toT, e);
      camera.position.lerpVectors(viewAnim.fromP, viewAnim.toP, e);
      if (t >= 1) viewAnim = null;
    }
    spinTool();
    controls.update();
    updateLabels();
    for (const c of callouts.values()) c.line.visible = calloutsOn;
    renderer.render(scene, camera);
    renderInset();
    placeCallouts();
  }
  // A label whose box falls on the inset hides (the inset box is see-through: its picture is drawn in the canvas under
  // it, and the labels are placed for the main view). Labels that would land on one another (the dip and aftertouch at
  // the key front) keep last frame's row while it's free, else take the nearest free row below, or above when the inset
  // or the picture's edge is in the way, in the order they appeared, so they don't swap rows while the key moves; one
  // with no free row hides. Same as scene-upright.js.
  function placeCallouts() {
    const w = canvas.clientWidth, h = canvas.clientHeight, on = [], placed = [];
    const ins = insetBox.hidden ? null : insetAt;
    // the label's box is right of and a little above its point (the .callout margins: 6px across, 10px up)
    const onInset = (c, y) => ins && c.x + 6 < ins.x + ins.w && ins.x < c.x + 6 + c.w && y - 10 < ins.top + ins.h && ins.top < y - 10 + c.h;
    const across = (c, o) => c.x < o.x + o.w && o.x < c.x + c.w;
    const clash = (c, y) => onInset(c, y) || placed.some(o => across(c, o) && y < o.y + o.h + 2 && o.y < y + c.h + 2);
    for (const c of callouts.values()) {
      const cut = !inClip(v3.set(...c.mid));   // its line is cut away in a clipped view: hide the label too
      v3.project(camera);
      c.x = (v3.x * 0.5 + 0.5) * w; c.y = (-v3.y * 0.5 + 0.5) * h + c.dy;
      const show = calloutsOn && v3.z < 1 && !cut;
      c.el.style.display = show ? '' : 'none';
      if (show) on.push(c); else c.shift = 0;   // out of the picture: it comes back on its own row
    }
    for (const c of on) { c.w = c.el.offsetWidth; c.h = c.el.offsetHeight; }   // read after the writes: one layout
    for (const c of on) {
      const y0 = c.y;
      if (onInset(c, y0)) { c.el.style.display = 'none'; c.shift = 0; continue; }
      // the rows just under and over the labels in its way (not ones off to the side, which would carry it off its line)
      const rows = placed.filter(o => across(c, o)).flatMap(o => [o.y + o.h + 2, o.y - c.h - 2]).filter(y => y >= 10 && y - 10 + c.h <= h);
      const last = c.shift ? [y0 + c.shift].filter(y => y >= 10 && y - 10 + c.h <= h && rows.some(r => Math.abs(r - y) < 3)) : [];
      const y = [y0, ...last, ...rows.filter(y => y >= y0).sort((p, q) => p - q), ...rows.filter(y => y < y0).sort((p, q) => q - p)].find(y => !clash(c, y));
      if (y === undefined) { c.el.style.display = 'none'; c.shift = 0; continue; }
      c.shift = y - y0; c.y = y; placed.push(c);
      c.el.style.transform = `translate(${c.x}px, ${c.y}px)`;
    }
  }

  // ---------- tool bag: one tool on the bench at a time, in place of the action ----------
  const toolStage = new THREE.Group(); toolStage.visible = false; scene.add(toolStage);
  const grid = new THREE.GridHelper(300, 30, 0x9a8f80, 0xc9c1b4);   // 10 mm squares
  toolStage.add(grid);
  const toolHolder = new THREE.Group(); toolStage.add(toolHolder);
  const AX = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
  const axis = s => { const m = /([+-]?)\s*([xyz])/i.exec(s || ''); if (!m) return null; const v = new THREE.Vector3(...AX[m[2].toLowerCase()]); return m[1] === '-' ? v.negate() : v; };
  let savedView = null, savedClip = null, spin = true, roomEnv = null, toolR = 0, toolHome = null;
  // obj: a THREE.Object3D built for the tool (models of real tools, added one at a time)
  async function showTool(obj, opts = {}) {
    // polished steel and brass need something to reflect: a soft room, only while a tool is out
    if (!roomEnv) { const pm = new THREE.PMREMGenerator(renderer); roomEnv = pm.fromScene(new RoomEnvironment(renderer), 0.04).texture; pm.dispose(); }
    if (!savedView) { savedView = { p: camera.position.clone(), t: controls.target.clone() }; savedClip = clipNow; setClip(null); }
    fixed.visible = false; notes.forEach(n => { n.root.visible = false; });
    toolStage.visible = true;
    scene.environment = roomEnv;
    lightsForTools(true);
    // each tool is built fresh; free the last one's buffers (materials are shared, so they stay)
    toolHolder.traverse(o => o.geometry?.dispose());
    toolHolder.clear();
    const mesh = obj;
    // turn the model so its length runs left-right and its natural up is up
    const up = axis(opts.upAxis) || new THREE.Vector3(0, 0, 1);
    let len = axis(opts.lengthAxis) || new THREE.Vector3(1, 0, 0);
    if (Math.abs(len.dot(up)) > 0.9) len = Math.abs(up.x) > 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const n = new THREE.Vector3().crossVectors(len, up);
    const m4 = new THREE.Matrix4().set(len.x, len.y, len.z, 0, up.x, up.y, up.z, 0, n.x, n.y, n.z, 0, 0, 0, 0, 1);
    mesh.applyMatrix4(m4);
    const box = new THREE.Box3().setFromObject(mesh), c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
    mesh.position.sub(new THREE.Vector3(c.x, box.min.y, c.z));
    toolHolder.add(mesh);
    toolHolder.rotation.y = 0;
    toolR = Math.max(size.x, size.z, size.y * 1.5, 30);
    viewAnim = { t0: performance.now(), fromT: controls.target.clone(), fromP: camera.position.clone(),
      toT: new THREE.Vector3(0, size.y / 2, 0), toP: new THREE.Vector3(0.2, 0.9, 1.9).setLength(toolDistance()).add(new THREE.Vector3(0, size.y, 0)) };
    toolHome = { t: viewAnim.toT.clone(), off: viewAnim.toP.clone().sub(viewAnim.toT), d: toolDistance() };
    spin = !opts.still;
    return { size: { x: size.x, y: size.y, z: size.z } };
  }
  // frame the whole tool with room to turn: its longest side fills about 80% of the width, even on a tall phone screen
  function toolDistance() {
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    return Math.max(1.9 * toolR, 0.62 * toolR / (tanV * camera.aspect));
  }
  // the window changed shape (a phone turned): keep the view's direction, step in or out to fit again
  function refitTool() {
    if (!toolStage.visible || !toolR) return;
    if (viewAnim) { viewAnim.toP.sub(viewAnim.toT).setLength(toolDistance()).add(viewAnim.toT); return; }
    camera.position.sub(controls.target).setLength(toolDistance()).add(controls.target);
  }
  function hideTool() {
    if (!toolStage.visible) return;
    toolStage.visible = false; scene.environment = null; lightsForTools(false); fixed.visible = true; setNoteCount(noteCount);
    if (savedView) { viewAnim = { t0: performance.now(), fromT: controls.target.clone(), fromP: camera.position.clone(), toT: savedView.t, toP: savedView.p }; savedView = null; setClip(savedClip); }
  }
  // the room already lights the tool from all round, so the direct lights step back while it is out
  function lightsForTools(on) { hemi.intensity = on ? 0.45 : 1.6; sun.intensity = on ? 1.1 : 1.6; fill.intensity = on ? 0.3 : 0.5; }
  controls.addEventListener('start', () => { spin = false; });
  let spinT = 0;
  function spinTool() {   // by the clock, so it turns at the same speed on any screen refresh rate
    const now = performance.now(), dt = Math.min(0.1, (now - spinT) / 1000); spinT = now;
    if (toolStage.visible && spin) toolHolder.rotation.y += dt * 0.35;
  }

  setNoteCount(1);
  return { render, update, setView, zoomBy, slideBy, resetView, showTool, hideTool, spinTool, highlight, pick, screenOf, setCallout, clearCallouts, setCallouts, backcheckGap, setBackground, controls, camera, setLabels,
           setNoteCount, setFocus, setGauge, setInset, setInsetText, setInsetMode, insetEl: insetBox, straightedge, PART_NAMES, VIEWS };
}
