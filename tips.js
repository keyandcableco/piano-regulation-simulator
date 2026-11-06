// "From the bench": tips and tools from working technicians, credited to the people
// who came up with them or taught them. Keyed by Learn step (a spec id, or an info step's id).
// Tips are paraphrased, never quoted at length. Each: { text, who, src, url?, forum? }.
// forum: true marks a post from PTG's Pianotech forum. Those posts are readable without a login,
// but the posters wrote them for other members, so they are shown by forum and year only until
// each poster has said they are happy to be named. Flip NAME_FORUM_POSTERS once they have.
// Research notes and sources: research/bench-tips.md (not published).
export const NAME_FORUM_POSTERS = false;
// forum posters who have said yes to being named (exactly as written in `who`)
export const NAMED_OK = new Set([]);

const BROWN = { who: 'Chris Brown RPT', src: 'Key Steps for Grand Regulating, 2022',
  url: 'https://cdn.shopify.com/s/files/1/0358/9385/files/Key_Steps_for_Grand_Regulating_b1951340-2c3d-401c-a443-f9e49ef4ffaa.pdf' };
const FRANCESCO = (title, url) => ({ who: 'Francesco, pianotuningmatters', src: title, url });
const PT = (who, year, url) => ({ who, src: `PTG Pianotech forum, ${year}`, url, forum: true });

export const TIPS = {
  prep: [
    { text: 'Take the keyframe return spring off before bedding and regulating: its friction stiffens the keyframe.', ...BROWN },
    { text: 'Hammer flange friction of about nine half-swings balances stability against repetition. Keep both sides alike so traveling and spacing stay put.', ...BROWN },
    { text: 'Fully regulate one natural and one sharp first, to try out the specs and parts before doing all 88.', ...BROWN },
    { text: 'Easing pliers that work with the stack in place save pulling the action for a few tight keys.', ...PT('Benjamin Sanchez', 2021) },
  ],
  bedding: [
    { text: 'Test the back rail with the action fully assembled, tapping over the rail\'s actual contact lip. Tap in the wrong place and you get a false knock.', ...BROWN },
    { text: 'If a light touch on a cleat completes the back rail\'s fit, shim it with punchings rather than sanding.', ...BROWN },
    { text: 'Set glide bolts evenly with a caliper: measure key height in front of the bolt, open the caliper a few thousandths, turn the bolt up until the key touches it.', ...PT('Jon Page', 2008) },
  ],
  keys: [
    { text: 'Press each key down often while leveling, so the punchings settle onto the balance pin before you judge the height.', ...FRANCESCO('50 point guide to grand regulation, 2015', 'https://pianotuningmatters.blogspot.com/2015/11/50-point-guide-to-grand-regulation.html') },
    { text: 'Many tight front bushings and some time? Sized broaches on a temperature-controlled iron, or steam with bushing cauls left in overnight.', ...PT('Alan Eder RPT', 2021) },
  ],
  travel: [
    { text: 'Travel the shanks before hanging hammers: screw the stack to a dead-level bench and check each shank against a square.', ...PT('Dale Erwin RPT', 2001) },
    { text: 'Travel the two end shanks of a section perfectly, then clip a stick ruled with vertical lines to the end hammers. Lift the section and the wanderers show at once.', ...PT('Lance Lafargue RPT', 2001) },
    { text: 'Mark a spacing scale from the hammer wear marks before you start, so unspaced hammers have a real place to go back to.', ...BROWN },
  ],
  keyHeight: [
    { text: 'Pre-level the end keys with cut punchings and make sure the straightedge clears every key before you start.', ...BROWN },
    { text: 'Press each key down often while leveling, so the punchings settle before you judge the height.', ...FRANCESCO('50 point guide to grand regulation, 2015', 'https://pianotuningmatters.blogspot.com/2015/11/50-point-guide-to-grand-regulation.html') },
  ],
  jackPos: [
    { text: 'Backlight the action, sight each sample jack (press its neighbor to see past it), then line up the rest with a straightedge across the jack tips.', ...BROWN },
    { text: 'Treat sighting as step one: then press each key slowly through let-off and let it ride back up. You feel the note-to-note differences and hear a "pock" where jack and knuckle disagree.', ...PT('Jim Ialeggio', 2012, 'https://my.ptg.org/discussion/jack-to-knuckle-alignment-question') },
    { text: 'A jack set deeper than standard adds friction at escapement: heavier touch, more knuckle wear, a harder life for the jack toe.', ...PT('Nathan Monteleone', 2026, 'https://my.ptg.org/discussion/jack-to-knuckle-alignment-question') },
    { text: 'Big or worn, flattened knuckles get some latitude: the back of the jack can sit a little forward of the core.', ...PT('David Skolnik RPT', 2026, 'https://my.ptg.org/discussion/jack-to-knuckle-alignment-question') },
  ],
  wink: [
    { text: 'Rough it in by brushing a fingertip across the jack and lever tops, then flick the jack tail: the hammer should dip a little and come back. Aim for consistency, not an exact number.', ...PT('David Nereson RPT', 2004) },
    { text: 'Yamaha\'s 0.2 mm is about the thickness of a thin front punching. You can feel it, but set it by the wink, and expect to reset it after spring or jack changes.', ...PT('David Skolnik RPT', 2004) },
    { text: 'Leave the winking hammer room to fall: the rest rail about one shank diameter below. Some makes wink clearly, others hardly at all.', ...FRANCESCO('Grand regulation in detail: jack, 2023', 'https://pianotuningmatters.blogspot.com/2023/10/grand-regulation-in-detail-jack.html') },
  ],
  blow: [
    { text: 'Specifications are the starting point; making it work is the goal. Some actions need a closer hammer line to get let-off and aftertouch without excess dip.', ...PT('Norman Cantrell', 2023, 'https://my.ptg.org/discussion/let-off-adjustments') },
    { text: 'If let-off won\'t come right after a rebuild, check the geometry: string height should equal center-pin height plus hammer bore distance.', ...PT('Paul McCloud', 2023, 'https://my.ptg.org/discussion/let-off-adjustments') },
    { text: 'If aftertouch comes too low in the keystroke, reduce the blow distance.', who: 'Donald Dusenbury', src: 'Mechanical Music Digest, 2002', url: 'https://mmdigest.com/Archives/Digests/200208/2002.08.23.06.html' },
  ],
  restGap: [
    { text: 'About 3 mm below the shank: close enough to stop the jack locking behind the knuckle in fast repetition, far enough that the hammer stays suspended as the action wears.', ...PT('Ed Foote RPT', 2011) },
    { text: 'Rule of thumb: one shank thickness.', ...PT('Wim Blees RPT', 2011) },
    { text: 'A hammer resting on its cushion has lost motion built in and spoils the hammer line. When cushions are too tall, peel felt off evenly.', ...PT('Fred Sturm', 2011) },
  ],
  letoff: [
    { text: 'Rough in let-off by feel: roll a finger along the jack tender until the jack trips. No bump means too wide; a big bump, or no escape, means too close.', ...PT('Brian De Tar', 1995) },
    { text: 'Set each button to just block, then back off until the hammer stops touching a string that is still vibrating: dampers held up with the sostenuto, two quick strikes, then bring the hammer to let-off.', ...PT('Ed Foote', 2002) },
    { text: 'A 1/16" strip of magnetic sign material makes a let-off gauge. Exact specs matter less than exact consistency.', ...PT('Newton Hunt', 2002) },
    { text: 'On the bench, a let-off rack: a straightedge set just below let-off under half a section of shanks, matched to sample notes set in the piano.', who: 'the late LaRoy Edwards (Yamaha)', src: 'Instructions for Using the Let Off Rack',
      url: 'https://cdn.shopify.com/s/files/1/0664/2365/2581/files/Instructions_for_Using_The_Let_Off_Rack.odt.pdf' },
  ],
  drop: [
    { text: 'The drop screw is really the repetition lever\'s upstop. The closer let-off and drop happen together, the crisper the start of aftertouch.', ...PT('Jon Page', 2009) },
    { text: 'Regulate one sample so the tender meets the let-off button and the lever meets the drop screw at the same moment, then match the rest to it.', ...BROWN },
    { text: 'Check the springs first: regulating drop with weak repetition springs is a lost cause.', ...FRANCESCO('Guide to grand regulation part XVII, 2016', 'https://pianotuningmatters.blogspot.com/2016/04/guide-to-grand-regulation-part-xvii.html') },
  ],
  dip: [
    { text: 'Press the dip block with only the weight of your hand. Beginners push into the felt and set too little dip.', who: 'D. L. Bullock', src: 'Mechanical Music Digest, 2003', url: 'https://mmdigest.com/Archives/Digests/200310/2003.10.02.14.html' },
    { text: 'A weighted dip block (his: maple and lead, 250 g) gives every key exactly the same pressure.', ...PT('Jack Houweling', 2010) },
    { text: 'Keep several dip blocks, and finish by pressing three keys at once with three fingers to compare.', ...PT('Newton Hunt', 1998) },
    { text: 'Work dip out instead of guessing: dip = (blow − let-off) ÷ action ratio + aftertouch.', who: 'Yuji Nakamura ARPT', src: 'Grand Action Set Up',
      url: 'https://yuji-nakamura-sddl.squarespace.com/s/Grand-action-set-up-by-Yuji-Nakamura.pdf' },
  ],
  aftertouch: [
    { text: 'The "lost punching": with let-off set, put a split card punching on the front pin, build up paper until let-off just happens, then slip the split punching out. Its thickness is your aftertouch.', ...PT('David Skolnik', 2016) },
    { text: 'An aftertouch gauge cut from an old keytop, slotted around the front pin and thinned to .040". Under a light touch the key clicks onto it just before let-off.', ...PT('Fred Sturm', 2016) },
    { text: 'Aftertouch is there to get the jack out of the knuckle\'s way as the hammer rebounds. Too much crushes the stop felt; too little gives bobbling and blocking.', ...PT('Conrad Hoffsommer RPT', 2004) },
  ],
  check: [
    { text: 'Set backchecks as high as they go without the tail scraping when played against resistance, then match the sharps to the naturals.', ...BROWN },
    { text: 'Checking set on the bench drifts in the piano: set samples in the piano, and on the bench slow the hammers\' fall so they check at a realistic speed.', ...PT('David Love RPT', 2009) },
    { text: 'A strip of tape on one handle of the wire bender shows which way you\'re bending.', ...PT('Ron Nossaman', 2010) },
  ],
  spring: [
    { text: 'Fast as it can rise without bouncing at the top. Done right the springs taper from slower in the bass to faster in the treble, and a slight bump in the key is fine: chasing every bump leaves them too weak.', ...PT('Daniel DeBiasio', 2026, 'https://my.ptg.org/discussion/jack-to-knuckle-alignment-question') },
    { text: 'Yamaha\'s target: enough tension to lift the hammer until the lever reaches the drop screw, not so much you feel a bump.', who: 'Larry Lobel', src: 'Mechanical Music Digest, 1997', url: 'https://mmdigest.com/Archives/Digests/199702/1997.02.09.21.html' },
    { text: 'The Yamaha trick: sight along the row of wippens afterwards to catch springs hung up on the lip of their groove.', ...PT('Joseph Alkana RPT, from LaRoy Edwards', 2000) },
    { text: 'Allow for the season: leave springs a little hoppy in winter; they slow down in summer as the centers tighten.', ...PT('Matt Wynne', 2002) },
  ],
  dampers: [
    { text: 'Ed Foote\'s Wire Wizard makes the awkward bends in grand damper wires a cinch.', ...PT('Jon Page', 2021) },
    { text: 'Install dampers from the top down: prove the top bends first and the rest becomes a straight sequence of moves.', ...PT('Jim Ialeggio', 2021) },
  ],
  again: [
    { text: 'Action regulation is a never-ending circle: go through it all, then again, sometimes a third time.', ...PT('Wim Blees RPT', 2018) },
  ],
};

export const TOOLS = [
  { name: 'Wire Wizard', who: 'Ed Foote RPT', what: 'for the awkward bends in grand damper wires' },
  { name: 'Let-off rack', who: 'the late LaRoy Edwards (Yamaha)', what: 'a straightedge under half a section of shanks to match let-off on the bench',
    url: 'https://cdn.shopify.com/s/files/1/0664/2365/2581/files/Instructions_for_Using_The_Let_Off_Rack.odt.pdf' },
  { name: 'Regulating Rack, Gauge Keys, Keysteps and the Regulation Station', who: 'Chris Brown RPT, Grandwork Tools', what: 'a bench system that reproduces the keybed and strike line', url: 'https://grandwork.tools/' },
  { name: 'Taut-Line regulating tool', who: 'sold by Pianotek Supply', what: 'a taut string between flexible posts for hammer line, let-off and drop' },
  { name: 'Damper underlever setting jig', who: 'Bill Spurlock, Spurlock Specialty Tools', what: 'sets grand damper underlever height' },
  { name: 'Flexible-shaft regulating tool', who: 'Jurgen Goering, Piano Forte Supply', what: 'reaches awkward jack and regulating screws' },
  { name: 'Action ratio jig', who: 'Yuji Nakamura ARPT', what: 'measures hammer travel for 6 mm of key travel',
    url: 'https://yuji-nakamura-sddl.squarespace.com/s/Grand-action-set-up-by-Yuji-Nakamura.pdf' },
  { name: 'Shank clips and touchweight method', who: 'David Stanwood', what: 'try strike weight before committing; the equation of balance', url: 'https://www.stanwoodpiano.com/touchweight.htm' },
  { name: 'Regulating rule for grand pianos', who: 'Noriyuki Sakakibara, Kawai (US patent 5,159,762)', what: 'rests on the strings and reads hammer travel directly', url: 'https://patents.google.com/patent/US5159762' },
];
