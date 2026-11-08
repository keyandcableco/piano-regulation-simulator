// Upright action model: one note, side view, millimetres. Built standalone beside the grand (research/upright/protocol.md,
// chunk C1): for now only the geometry the static drawing needs. Kinematics (C2) and dynamics (C3) come later, here.
//
// Two frames, both with x toward the strings and y up:
// - the action frame, origin at the hammer butt's centre pin. Every traced point is in it, read off the filmed upright
//   action model (S15: PTG Education Hub high-speed clips, research/upright/video/findings.md), mirrored so the strings
//   are on the right. The clips have no ruler in the action plane: their scale is 3.6 px/mm ±10%, so every traced length
//   carries that ±10%. Outlines are traced on research/upright/parts/ref/ (the grey Ellis-redo rest frame, and the colour
//   blow-check-release rest frame fitted onto it at the four centre pins); the overlays are in research/upright/parts/.
// - the sim frame, the grand's (model.js): keybed at y = 0, the key's front at x = 0. H puts the action frame in it.
// z is across the keyboard, + toward the bass (the grand's rule); the scene draws it at BASS times.
//
// Tags: [m] measured on S15; [e] estimated from S15 (traced or read by eye); [T] a stand-in from general knowledge, until a
// source or Greg's bench gives the number (GTD d078a7e4); [S1]..[S16] the protocol's sources.

export const IN = 25.4;

// ---------- where things are ----------
// The butt centre pin in the sim frame. [T]: the key and its frame are stand-ins (see KEY), so this is too. The action
// itself, everything in the action frame below, is traced.
export const H = [451, 194];
export const toSim = ([x, y]) => [H[0] + x, H[1] + y];

// Centre pins, action frame, at rest [m: S15, the bushing dots in the grey frame]
export const CENTER = {
  butt: [0, 0],
  wippen: [2.1, -85.1],
  jack: [-33.6, -70.2],
  damper: [23.4, -3.5],
};

// Strings: the unison's line in the side view [m: S15, x = 98.2 + 0.0137 y px]. Strike height is the crown's at rest.
export const STRING = { x: 53.9, y: 140, lean: 0.0137 };
export const stringX = y => STRING.x + STRING.lean * (y - STRING.y);

// ---------- the key and its frame: stand-ins [T] ----------
// No measured upright key yet. What is sourced: the capstan sits 32 mm from the key's back end [e: colour clip], the
// capstan rises about 0.78 of the key front's travel [e: S15, 26.8 px for 9.62 mm], and dip is 0.400 in [S1].
// The lengths are stand-ins scaled to that ratio; the key and its rails are drawn see-through until Greg measures one.
export const KEY = {
  balX: 230,                 // balance pin [T]
  capX: H[0] - 41,           // capstan, under the wippen cushion [e]
  backX: H[0] - 41 + 32,     // back end [e]
  thick: 24,                 // [T]
  bottomY: 21,               // the key's underside on its rails, level at rest [T]
  dip: 0.4 * IN,             // [S1]
};

// ---------- traced outlines, action frame, at rest ----------
// Closed polygons unless named as a path. Each moving part turns about one of CENTER (the scene draws it in that frame).
// Shapes are as filmed; where a part was hidden or unclear, the comment says what the shape rests on.
export const TRACE = {
  // hammer: felt, underfelt and molding, on the shank [e]. The crown (rightmost) is at [10.2, 142.2] [m].
  headFelt: [[-35.6, 135.3], [-30.1, 141.5], [-24.5, 147.1], [-19.0, 151.9], [-13.4, 154.7], [-7.2, 155.8], [-0.9, 155.1],
    [4.7, 152.3], [8.5, 147.8], [10.2, 142.2], [9.9, 137.4], [8.1, 133.2], [4.5, 129.5], [-1.5, 127.0], [-10.0, 125.4],
    [-20.3, 124.2], [-27.3, 126.6], [-32.8, 129.0]],
  underfelt: [[-29, 138.2], [-23, 142.6], [-12, 144.9], [-3, 145.4], [0.2, 143], [-0.6, 139.6], [-7.5, 137.4], [-18, 136.4],
    [-26, 136.4]],
  // the molding runs on into the felt; its tip is hidden in the underfelt
  molding: [[-64.8, 125.9], [-35.6, 135.3], [-20, 139.6], [-6, 141.8], [-2, 141.2], [-6, 139.0], [-20, 134.2], [-33.5, 128.4],
    [-61.7, 115.8]],
  // butt: the block the shank and catcher shank are glued into, round its centre pin [e]
  butt: [[-28, 24], [-26, 27.5], [-20, 29.3], [-12, 29.8], [-5, 29.0], [-2, 26], [-1, 18], [0.5, 10], [3.2, 4.5], [4, 0],
    [3, -3], [0, -4], [-3, -3], [-6, 0], [-11, 4.5], [-16.5, 8.6], [-23, 9], [-26, 12], [-27.5, 18]],
  // butt cushion: felt and buckskin under the butt's heel, where the jack top lifts it (red in the colour clip) [e]
  buttCushion: [[-23.5, 9], [-16.5, 9], [-16.8, 5.2], [-17.5, 4.4], [-22.5, 4.4], [-23.5, 5.2]],
  // catcher: a wooden head on a dowel from the butt; its left face is the check face (leather on it [T]) [e]
  catcherHead: [[-55.5, 16], [-45, 17.5], [-44, 15], [-44, 0], [-48, -3], [-52.5, -2.5]],
  // butt spring: a wire from a coil on the flange, its end pressing the butt's back near the top [e]; a path. The coil
  // is drawn 1.6 mm in from the arc's visible start, so it sits on the flange's cheek.
  buttSpring: [[4.5, 1.5], [7, 9], [7, 13], [5.5, 18], [2.5, 23], [-1.5, 27.5]],
  // butt flange: a foot on the main rail, a stem up to its rounded top round the centre pin [e: the foot's shelf for
  // the screw is the colour clip's wider bottom, X -8..+5]
  buttFlange: [[-9, -24], [5, -24], [5, 0], [-5, 0], [-5, -17], [-9, -17]],
  // wippen: the bar, the heel block under its front end, and the cushion on the capstan [e]
  wippen: [[-66, -80.4], [20, -80.4], [20, -91.5], [-66, -91.5]],
  heel: [[-53, -91.5], [-29.5, -91.5], [-29.5, -105], [-53, -105]],
  heelCushion: [[-49.5, -105], [-33, -105], [-33, -109], [-49.5, -109]],
  // the post on the wippen that carries the jack's centre pin [e]
  jackFlange: [[-37, -80.4], [-29, -80.4], [-29, -66], [-30.2, -64.6], [-33, -64], [-35.8, -64.6], [-37, -66]],
  // wippen flange: from the main rail's underside down to its rounded end round the wippen's centre pin; the foot up the
  // rail's back face is [T] (Igrec fig. 337: wippen flange screws are at the back of the action)
  wippenFlange: [[-1.5, -60], [10, -60], [10, -50], [6, -50], [6, -85.1], [-1.5, -85.1]],
  // damper spoon: a wire up from the wippen's back end to the lever's felt [e]; a path
  spoon: [[8.5, -80.4], [8.5, -75], [9.4, -70], [11.2, -66.3], [14, -63.2]],
  // jack: an L on its centre pin, the toe toward the let-off button, the arm up to the butt cushion [e]
  jack: [[-52, -61], [-50.5, -59.2], [-38, -58.8], [-35.5, -55.5], [-31, -50], [-27.5, -40], [-25.5, -30], [-25, -20],
    [-25, -10], [-25, 3.2], [-18.5, 3.6], [-18.8, -10], [-18.8, -20], [-19, -30], [-20, -40], [-23.5, -52], [-27.5, -60],
    [-29, -66], [-30, -72], [-33.6, -74.2], [-37.2, -72.5], [-38, -66.8], [-50.5, -66.8], [-52, -65]],
  // jack spring: a coil between the toe's underside and the wippen [e]; its axis, bottom to top
  jackSpring: [[-46, -80.4], [-46, -66.8]],
  // backcheck and bridle wires, up from the wippen's front end [e]; paths, wippen end first (the backcheck wire's top is
  // hidden in its head: run on 5 mm into it)
  backcheckWire: [[-59, -80.4], [-62.3, -67], [-65.5, -54], [-69.5, -37], [-72, -28], [-74, -19], [-76.6, -8]],
  bridleWire: [[-55, -80.4], [-59, -70], [-64, -57], [-68.5, -46], [-70.5, -41]],
  // backcheck head: wood, with a thick felt face toward the catcher (green in the colour clip) [e]
  backcheck: [[-83, 17], [-77.5, 19.5], [-76, -10.5], [-80, -13]],
  backcheckFelt: [[-77.5, 19.5], [-64, 19.5], [-62.5, -10.5], [-76, -10.5]],
  // bridle strap: cloth tape from the catcher's string face, draped over the let-off screw's eye, its end hooked on the
  // bridle wire [e: S15 findings, fixing [-43, 4] and hook [-71, -41], by eye ±1.5 mm]; a path, catcher end first
  strap: [[-43.5, 4], [-41, -1], [-40.8, -8], [-42.5, -14], [-44.5, -19.5], [-46, -22.6], [-48.5, -23.4], [-53, -27],
    [-60, -33.3], [-66, -37.5], [-70.5, -40.5]],
  // let-off: the button (body and felt face) on its regulating screw, the screw's eye on top [e]
  letoffButton: [[-50.5, -44], [-42.5, -44], [-42.5, -49], [-50.5, -49]],
  letoffFelt: [[-50.5, -49], [-42.5, -49], [-42.5, -54], [-50.5, -54]],
  letoffScrew: [[-46.5, -49], [-46.5, -28.9]],
  letoffEye: [-46.5, -26.3],           // a wire ring, 2.6 mm to its outside
  // jack stop: a block on a threaded rod, its felt facing the jack's arm [e]
  jackStop: [[-41.7, -14.5], [-36.5, -14.5], [-36.5, -24.8], [-41.7, -24.8]],
  jackStopFelt: [[-36.5, -14.5], [-28.5, -14.5], [-28.5, -24.8], [-36.5, -24.8]],
  // damper: the lever on its flange, the felt the spoon pushes, the wire up to the block and head [e]
  damperLever: [[20.5, 49], [31, 49], [30.6, 30], [29.8, 10], [28, -8], [25.2, -25], [24.3, -40], [24, -64], [19, -64],
    [19, -36.5], [19.3, -20], [19.8, -5], [20.2, 10], [20.5, 30]],
  leverFelt: [[15, -36.5], [19, -36.5], [19, -63.8], [15, -63.3]],
  // damper flange: the arm out to the lever's centre pin [e], and its foot down the main rail's back face [T]
  damperFlange: [[6, 0.5], [23.4, 0.5], [27.2, -1.2], [28, -4.5], [26.3, -7.5], [23.4, -8.2], [18, -5.5], [10, -5.5], [10, -30],
    [6, -30]],
  // damper spring: a wire from a coil on the flange up to the lever's player face [e: thin, seen in the colour clip]; a path
  damperSpring: [[17, -2], [16.5, 8], [17, 18], [18.5, 26], [20.5, 31]],
  damperWire: [[26.5, 49], [27, 55], [28, 62], [28.8, 70], [29.5, 80], [30, 90], [30.2, 95]],
  // the damper block: a round wooden block lying toward the strings, clamped on the wire by its screw [e]
  damperBlock: { x0: 23.5, x1: 36, y: 98.5, r: 5 },
  // the damper head (red in the colour clip: wood under red felt? ask Greg) and its two felt pads on the strings [e]
  damperHead: [[35.5, 56], [43.5, 56], [43.5, 115], [35.5, 115]],
  damperFelts: [[[43.5, 56], [53.4, 56], [53.4, 78], [43.5, 78]], [[43.5, 95], [53.6, 95], [53.6, 116], [43.5, 116]]],
};

// The shank: a straight dowel at the measured lean, its axis passing 2.2 mm to the player's side of the butt's centre pin
export const SHANK = {
  lean: 22.3 * Math.PI / 180,  // from the vertical, top toward the player [m: S15, edge fit over 80 rows]
  x0: -2.2,                    // where its axis crosses y = 0 [e: fitted to its edges at six heights, both frames]
  r: 2.75,                     // [e: 5.4-5.7 mm across at half brightness; S15 flags about 5 mm as odd for the scale]
  y0: 20, y1: 128,             // from inside the butt to inside the molding
};
export const shankAt = y => [SHANK.x0 - Math.tan(SHANK.lean) * y, y];
// the catcher shank: a dowel from the butt's player side out to the catcher head [e]
export const CATCHER_SHANK = { from: [-24, 15.5], to: [-45, 15], r: 3 };   // from 3 mm inside the butt
// the capstan: a wooden dowel on a wire screwed into the key [e: colour clip]
export const CAPSTAN = { x: -41, top: -109, dowelBottom: -129, keyTop: -149, r: 5.5, wireR: 1.5 };

// ---------- the rails: placed by the filmed model's faces, their sections stand-ins [T] ----------
// The filmed model is a one-note model on a cast stand: a metal bracket in place of the main rail, a wire loop with a
// felt pad for the hammer rail, a rod and block for the let-off rail. The sim draws a piano's wooden rails, each face
// where the filmed part's face is.
// Main (action) rail: butt flanges on its top, wippen flanges under it, damper flanges on its back face.
export const MAIN_RAIL = [[-9, -60], [6, -60], [6, -24], [-9, -24]];
// Hammer rail: its felt touches the shank along the shank's player-side edge, about at [-36, 75] [e: S15]; the felt is
// laid along the shank so they meet on a line, 8 mm thick, on an 18 mm rail [T]. Built from the shank's line below.
export const HAMMER_RAIL = (() => {
  const c = Math.cos(SHANK.lean), s = Math.sin(SHANK.lean), n = [-c, -s];   // toward the player, square to the shank
  const edge = y => [SHANK.x0 - Math.tan(SHANK.lean) * y - SHANK.r / c, y];
  const off = (p, d) => [p[0] + n[0] * d, p[1] + n[1] * d];
  const a = edge(58), b = edge(89);
  return { felt: [a, b, off(b, 8), off(a, 8)], wood: [off(a, 8), off(b, 8), off(b, 26), off(a, 26)] };
})();
// Let-off rail: the regulating screw threads down through it to the button [T: the filmed block, X -54..-41, run on]
export const LETOFF_RAIL = [[-56, -35], [-38, -35], [-38, -44], [-56, -44]];

// ---------- widths across the keyboard (z) ----------
// Head width from Renner's upright hammers [S16: Renner USA catalog p. 22, U3/U4 3/8-13/32 in]; the rest [T].
export const WIDTH = {
  head: 10, butt: 10.5, catcher: 9, flange: 9, wippen: 10, jack: 6, jackFlange: 2, damperLever: 9, damperFlange: 8,
  damperHead: 12, backcheck: 10, strap: 6, key: 21, pitch: 23.5,
};
