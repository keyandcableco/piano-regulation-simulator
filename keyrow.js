// The keys on the bench, as a row (Greg, 2026-11-16), for both actions' scenes and apps:
//   one    a single key;
//   three  a sharp between two naturals, as on the 3-key action models on Greg's bench: the exam, the Sandbox's Three keys;
//   five   white, black, white, black, white: the Sandbox's Five keys and Find the fault's neighbors. The customer's key
//          stays a natural in the middle (the cases are written for one), and the two sharps can be leveled together.
// Slots: 0 is the middle, 1 and 2 a semitone toward the bass and the treble, 3 and 4 two semitones. A row with a sharp
// stands a semitone apart at the hammers, as on a piano (seven naturals to the octave's twelve notes), while the
// naturals' fronts tile at their own pitch: so a natural's head and its tail don't line up, as on a piano.
export function keyRows(pitch, bass) {
  const semi = pitch * 7 / 12;
  const row = (steps, sharp) => {
    const z = steps.map(k => k * semi * bass);
    return { z, sharp, hasSharp: sharp.includes(true), order: z.map((v, i) => [v, i]).sort((p, q) => p[0] - q[0]).map(([, i]) => i) };
  };
  return { one: row([0], [false]), three: row([0, 1, -1], [true, false, false]), five: row([0, 1, -1, 2, -2], [false, true, true, false, false]) };
}
// A natural in a row with a sharp: its head the width of its place along the key fronts (the naturals' fronts tile at
// the pitch, centered on the row, each 0.75 mm clear of the next), its tail behind cut back 1 mm clear of a sharp
// beside it. Spans of z across the row, in the key's own frame (0 at its slot): { head: [z0, z1], tail: [z0, z1] }.
export function naturalFit(row, slot, pitch, sharpW) {
  const nat = row.order.filter(i => !row.sharp[i]), z = row.z[slot];
  const c = (nat.indexOf(slot) - (nat.length - 1) / 2) * pitch;
  const head = [c - pitch / 2 + 0.75, c + pitch / 2 - 0.75], tail = [...head];
  row.z.forEach((zs, i) => {
    if (!row.sharp[i]) return;
    if (zs < z) tail[0] = Math.max(tail[0], zs + sharpW / 2 + 1);
    else tail[1] = Math.min(tail[1], zs - sharpW / 2 - 1);
  });
  return { head: head.map(v => v - z), tail: tail.map(v => v - z) };
}
