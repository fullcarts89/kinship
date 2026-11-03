/* Kinship · Moment Deck × Notebook — prototype fixtures.
   Every person, note and memory here is FICTIONAL sample data for a design prototype.
   Nothing here is seeded into any account. Portraits and botanicals are the PR #76 cast
   (generated 31 Oct 2026, provenance in that PR's README). */

const DAYS = {
  first: { short: 'Mon, Nov 2', long: 'MONDAY, NOV 2', greet: 'Good morning, Nora.', iso: '2026-11-02' },
  mon:   { short: 'Mon, Nov 2', long: 'MONDAY, NOV 2', greet: 'Good morning, Nora.', iso: '2026-11-02' },
  wed:   { short: 'Wed, Nov 4', long: 'WEDNESDAY, NOV 4', greet: 'Good morning, Nora.', iso: '2026-11-04' },
  fri:   { short: 'Fri, Nov 6', long: 'FRIDAY, NOV 6', greet: 'Good evening, Nora.', iso: '2026-11-06' },
  quiet: { short: 'Tue, Nov 10', long: 'TUESDAY, NOV 10', greet: 'Good morning, Nora.', iso: '2026-11-10' },
};

/* Identity only: a color and a flower per person. Never changes with history (D8). */
const PEOPLE = {
  ben:   { name: 'Ben Carter', first: 'Ben', color: '#FF6B1A', onColor: '#1B0A00', bloom: 'b-poppy.png', photo: 'p-ben-lake.jpg', rel: 'From the Prospect Park running club', relSrc: 'n_ben_jun2', pron: 'him' },
  maya:  { name: 'Maya Lin', first: 'Maya', color: '#FF3D9A', onColor: '#2A0016', bloom: 'b-peony.png', photo: 'p-maya.jpg', rel: 'Your college roommate · Oakland', relSrc: 'n_maya_aug3', birthday: 'Sat, Nov 7', pron: 'her' },
  josh:  { name: 'Josh Park', first: 'Josh', color: '#8CC8FF', onColor: '#0A1F33', bloom: 'b-anemone.png', photo: 'p-josh.jpg', rel: 'Your brother-in-law · Seattle', relSrc: 'n_josh_aug16', pron: 'him' },
  leo:   { name: 'Leo Marchetti', first: 'Leo', color: '#16264A', onColor: '#FFFFFF', bloom: 'b-fern.png', photo: 'p-leo.jpg', rel: 'From the old studio · Chicago', relSrc: 'n_leo_oct30', pron: 'him' },
  rosa:  { name: 'Rosa Bianchi', first: 'Rosa', color: '#FF8A5C', onColor: '#2A0D00', bloom: 'b-tulip.png', photo: 'p-rosa.jpg', rel: 'Your nonna · Bensonhurst', relSrc: 'n_rosa_oct4', pron: 'her' },
  priya: { name: 'Priya Shah', first: 'Priya', color: '#B7A4FF', onColor: '#160A3A', bloom: 'b-iris.png', photo: 'p-priya.jpg', rel: 'Friend from your Lisbon year', relSrc: 'n_priya_sep21', pron: 'her' },
  sam:   { name: 'Sam Delgado', first: 'Sam', color: '#FFE05A', onColor: '#2A2000', bloom: 'b-ranunculus.png', photo: 'p-sam.jpg', rel: 'From the pottery studio', relSrc: 'n_sam_oct22', pron: 'her' },
  aiko:  { name: 'Aiko Tanaka', first: 'Aiko', color: '#A6E22E', onColor: '#0F2A1D', bloom: 'g-a-leaves.png', photo: 'p-aiko.jpg', rel: null, birthday: 'Thu, Jan 14', pron: 'her', sparse: true },
  elena: { name: 'Elena Ruiz', first: 'Elena', color: '#CDBDF2', onColor: '#1E1238', bloom: 'g-a-bloom-lavender.png', photo: null, rel: 'Your neighbor, two doors down', relSrc: 'n_elena_aug20', pron: 'her' },
  samo:  { name: 'Sam Okafor', first: 'Sam', color: '#8CC8FF', onColor: '#0A1F33', bloom: 'g-a-bud.png', photo: null, rel: "Josh's friend from work", relSrc: null, pron: 'him', sparse: true },
};

/* Fillers: only names and one line, no photos. They exist so People can be judged at 15 and at 35. */
const FILLERS = [
  ['theo', 'Theo Carter', "Ben's brother"], ['gia', 'Gia Marchetti', "Leo's sister"], ['hana', 'Hana Wu', "Maya's partner"],
  ['noor', 'Noor Aziz', 'Pottery studio'], ['bea', 'Bea Collins', 'Your cousin · Portland'], ['clara', 'Clara Novak', 'Book club'],
  ['dev', 'Dev Patel', 'From the old studio'], ['felix', 'Felix Wagner', 'Climbing on Tuesdays'], ['hugo', 'Hugo Martin', 'From work'],
  ['imani', 'Imani Brooks', 'Book club'], ['ines', 'Inês Duarte', 'Lisbon'], ['jonah', 'Jonah Weiss', 'College'],
  ['kofi', 'Kofi Mensah', 'Running club'], ['lucia', 'Lucía Moreno', 'Your aunt'], ['marcus', 'Marcus Bell', 'From work'],
  ['nadia', 'Nadia Haddad', 'Grad school · Chicago'], ['owen', 'Owen Price', 'College'], ['pete', 'Pete Sullivan', "Your dad's oldest friend"],
  ['ruth', 'Ruth Abrams', 'Your first landlord'], ['tomas', 'Tomás Reyes', 'Climbing'], ['wren', 'Wren Ellis', 'Running club'],
  ['yusuf', 'Yusuf Demir', 'From work'], ['zoe', 'Zoe Lambert', 'Your cousin'], ['ada', 'Ada Okoye', 'Choir'], ['luis', 'Luis Ferreira', 'Lisbon'],
];
const FILL_COLORS = ['#FFE05A', '#8CC8FF', '#B7A4FF', '#A6E22E', '#FF8A5C', '#FF3D9A', '#16264A', '#CDBDF2'];
const FILL_BLOOMS = ['b-anemone.png', 'b-iris.png', 'b-tulip.png', 'b-ranunculus.png', 'b-poppy.png', 'b-peony.png', 'b-fern.png', 'g-a-bud.png', 'g-a-leaf.png'];
FILLERS.forEach(([id, name, rel], i) => {
  const color = FILL_COLORS[i % FILL_COLORS.length];
  PEOPLE[id] = { name, first: name.split(' ')[0], color, onColor: color === '#16264A' ? '#fff' : '#111', bloom: FILL_BLOOMS[i % FILL_BLOOMS.length], photo: null, rel, filler: true, typical: i < 4, pron: 'them' };
});

/* Notes: the user's own words, kept exactly. Every memory points at one. */
const NOTES = {
  n_ben_jun2:   { date: 'Tue, Jun 2', long: 'Tuesday, June 2', text: "Met Ben at the Prospect Park running club. He's a nurse at Methodist, works nights most weeks." },
  n_ben_sep14:  { date: 'Mon, Sep 14', long: 'Monday, September 14', text: "Ben's doing his Saturday long runs with his brother Theo now. He swears the everything bagels at Russ & Daughters are the only acceptable recovery food." },
  n_ben_oct8:   { date: 'Thu, Oct 8', long: 'Thursday, October 8', text: "Coffee with Ben after his long run. The New York Marathon is Sunday, Nov 1 — he's hoping to break four hours. Says if it goes well we should run Chicago together next year (!!)." },
  n_maya_aug3:  { date: 'Mon, Aug 3', long: 'Monday, August 3', text: "Maya started as head of design at Lumen this week! Her partner Hana says she's already rearranging the whole office." },
  n_maya_sep12: { date: 'Sat, Sep 12', long: 'Saturday, September 12', text: "Maya came over for dinner. She's obsessed with Ottolenghi lately and keeps talking about getting his new one, Comfort. Also misses her grandma's beef noodle soup from Taipei — says nothing in Oakland comes close." },
  n_josh_aug16: { date: 'Sun, Aug 16', long: 'Sunday, August 16', text: "Josh and my sister are thinking about moving back east next year." },
  n_josh_oct20: { date: 'Tue, Oct 20', long: 'Tuesday, October 20', text: "Josh has a final-round interview at Figma on Tuesday Nov 3 at 10. He's weirdly calm about it. Hates whiteboard rounds though." },
  n_leo_oct30:  { date: 'Fri, Oct 30', long: 'Friday, October 30', text: "Long dinner with Leo. He signed the lease on a place in Pilsen and moves in Sunday the 15th. His sister Gia's wedding is the 21st and he's giving the toast — he hates public speaking. I said I'd help him practice." },
  n_leo_sep19:  { date: 'Sat, Sep 19', long: 'Saturday, September 19', text: "Leo's tomatoes came in early this year — he brought a whole bag to the studio and made everyone take some." },
  n_leo_jul8:   { date: 'Wed, Jul 8', long: 'Wednesday, July 8', text: "Leo got the teaching job at SAIC! Starts in September. He's been wanting this for years." },
  n_leo_may2:   { date: 'Sat, May 2', long: 'Saturday, May 2', text: "Leo's thinking about leaving the studio to teach full-time. Nervous about the money." },
  n_rosa_sep21: { date: 'Mon, Sep 21', long: 'Monday, September 21', text: "Called Nonna. Christmas Eve is at her place again this year. Her figs finally came in and she's very proud of them." },
  n_rosa_oct4:  { date: 'Sun, Oct 4', long: 'Sunday, October 4', text: "Nonna's teaching me the ravioli on Sunday, November 8th. She still won't tell anyone the secret is nutmeg (it's nutmeg). I need to bring her the good flour from Sahadi's — the 00 one, not the bag from the corner store." },
  n_priya_sep21:{ date: 'Mon, Sep 21', long: 'Monday, September 21', text: "Priya FaceTimed from Lisbon. She's teaching at a ceramics studio in Alfama and loving it." },
  n_sam_oct3:   { date: 'Sat, Oct 3', long: 'Saturday, October 3', text: "Sam's still chasing the promotion she's been after for a year. Decision's supposed to come this month." },
  n_sam_oct22:  { date: 'Thu, Oct 22', long: 'Thursday, October 22', text: "Sam has been completely overwhelmed at work. Still throwing pots every weekend to stay sane." },
  n_elena_aug20:{ date: 'Thu, Aug 20', long: 'Thursday, August 20', text: "Elena's been teaching me to prune the roses along the fence. She knows every variety by name." },
  n_elena_oct26:{ date: 'Mon, Oct 26', long: 'Monday, October 26', text: "Elena's knee surgery is Tuesday the 3rd. She can't drive for two weeks after, and her follow-up is the 12th. I want to check in after — maybe bring dinner Thursday." },
};

/* Memories. kind: fact · event · plan · promise (yours) · thread · context · convo.
   now: where the Portrait shows it (coming · yours · lately · between). sec: What Kinship knows section.
   span: the exact words in the note it was understood from. */
const MEM = [
  { id: 'ben_job', p: 'ben', kind: 'fact', text: 'Ben is a nurse at Methodist and works nights most weeks.', src: 'n_ben_jun2', span: "He's a nurse at Methodist, works nights most weeks", sec: 'Background' },
  { id: 'ben_theo', p: 'ben', kind: 'fact', text: 'Ben does his Saturday long runs with his brother Theo.', src: 'n_ben_sep14', span: "Ben's doing his Saturday long runs with his brother Theo now", sec: 'Their people' },
  { id: 'ben_bagels', p: 'ben', kind: 'fact', text: 'Ben swears by the everything bagels at Russ & Daughters.', src: 'n_ben_sep14', span: 'He swears the everything bagels at Russ & Daughters are the only acceptable recovery food', sec: 'Into', now: 'lately' },
  { id: 'ben_race', p: 'ben', kind: 'event', text: 'Ben ran the New York Marathon on Sun, Nov 1.', src: 'n_ben_oct8', span: 'The New York Marathon is Sunday, Nov 1', sec: 'Plans', when: 'Sun, Nov 1', now: 'lately' },
  { id: 'ben_goal', p: 'ben', kind: 'context', text: 'Ben was hoping to break four hours.', src: 'n_ben_oct8', span: "he's hoping to break four hours", sec: 'Hoping to', now: 'lately' },
  { id: 'ben_chicago', p: 'ben', kind: 'context', text: 'Ben wants to run Chicago together next year.', src: 'n_ben_oct8', span: 'we should run Chicago together next year', sec: 'Hoping to' },
  { id: 'ben_c1', p: 'ben', kind: 'convo', text: 'You messaged · Fri, Oct 9', about: 'About his long run', sec: 'Between you', now: 'between' },

  { id: 'maya_job', p: 'maya', kind: 'fact', text: 'Maya started as head of design at Lumen.', src: 'n_maya_aug3', span: 'Maya started as head of design at Lumen this week', sec: 'Background' },
  { id: 'maya_hana', p: 'maya', kind: 'fact', text: "Maya's partner is Hana.", src: 'n_maya_aug3', span: 'Her partner Hana', sec: 'Their people' },
  { id: 'maya_otto', p: 'maya', kind: 'fact', text: 'Maya is obsessed with Ottolenghi lately.', src: 'n_maya_sep12', span: "She's obsessed with Ottolenghi lately", sec: 'Into', now: 'lately' },
  { id: 'maya_book', p: 'maya', kind: 'context', text: "Maya keeps talking about getting Ottolenghi's new book, Comfort.", src: 'n_maya_sep12', span: 'keeps talking about getting his new one, Comfort', sec: 'Hoping to', now: 'lately' },
  { id: 'maya_soup', p: 'maya', kind: 'fact', text: "Maya misses her grandma's beef noodle soup from Taipei.", src: 'n_maya_sep12', span: "misses her grandma's beef noodle soup from Taipei", sec: 'Into' },
  { id: 'maya_bday', p: 'maya', kind: 'event', text: "Maya's birthday", contacts: true, sec: 'Plans', when: 'Sat, Nov 7', now: 'coming' },

  { id: 'josh_move', p: 'josh', kind: 'plan', text: 'Josh and your sister are thinking about moving back east next year.', src: 'n_josh_aug16', span: 'Josh and my sister are thinking about moving back east next year', sec: 'Plans', tentative: true },
  { id: 'josh_interview', p: 'josh', kind: 'event', text: 'Josh has a final-round interview at Figma on Tue, Nov 3 at 10:00.', src: 'n_josh_oct20', span: 'Josh has a final-round interview at Figma on Tuesday Nov 3 at 10', sec: 'Plans', when: 'Tue, Nov 3 · 10:00', now: 'coming' },
  { id: 'josh_calm', p: 'josh', kind: 'thread', text: 'Josh is weirdly calm about the interview.', src: 'n_josh_oct20', span: "He's weirdly calm about it", sec: 'Background', now: 'lately' },
  { id: 'josh_wb', p: 'josh', kind: 'fact', text: 'Josh hates whiteboard rounds.', src: 'n_josh_oct20', span: 'Hates whiteboard rounds though', sec: 'Into' },

  { id: 'leo_move', p: 'leo', kind: 'event', text: 'Leo signed the lease on a place in Pilsen and moves in on Sun, Nov 15.', src: 'n_leo_oct30', span: 'He signed the lease on a place in Pilsen and moves in Sunday the 15th', sec: 'Plans', when: 'Sun, Nov 15', now: 'coming' },
  { id: 'leo_toast', p: 'leo', kind: 'event', text: "Leo is giving the toast at his sister Gia's wedding on Sat, Nov 21.", src: 'n_leo_oct30', span: "His sister Gia's wedding is the 21st and he's giving the toast", sec: 'Plans', when: 'Sat, Nov 21', now: 'coming' },
  { id: 'leo_speak', p: 'leo', kind: 'fact', text: 'Leo hates public speaking.', src: 'n_leo_oct30', span: 'he hates public speaking', sec: 'Into', now: 'lately' },
  { id: 'leo_practice', p: 'leo', kind: 'promise', text: 'You said you’d help Leo practice the toast.', src: 'n_leo_oct30', span: "I said I'd help him practice", sec: 'Plans', now: 'yours' },
  { id: 'leo_gia', p: 'leo', kind: 'fact', text: "Gia is Leo's sister.", src: 'n_leo_oct30', span: 'His sister Gia', sec: 'Their people' },
  { id: 'leo_tom', p: 'leo', kind: 'fact', text: 'Leo grows tomatoes.', src: 'n_leo_sep19', span: "Leo's tomatoes came in early this year", sec: 'Into' },
  { id: 'leo_job', p: 'leo', kind: 'fact', text: 'Leo teaches at SAIC.', src: 'n_leo_jul8', span: 'Leo got the teaching job at SAIC', sec: 'Background' },
  { id: 'leo_thread', p: 'leo', kind: 'thread', text: 'Leo was thinking about leaving the studio to teach full-time.', src: 'n_leo_may2', span: "Leo's thinking about leaving the studio to teach full-time", sec: 'Background', resolved: 'Answered by your note of Jul 8' },
  { id: 'leo_c1', p: 'leo', kind: 'convo', text: 'You saw Leo · Fri, Oct 30', about: 'About the move', sec: 'Between you', now: 'between' },

  { id: 'rosa_ravioli', p: 'rosa', kind: 'event', text: 'Rosa is teaching you to make ravioli on Sun, Nov 8.', src: 'n_rosa_oct4', span: "Nonna's teaching me the ravioli on Sunday, November 8th", sec: 'Plans', when: 'Sun, Nov 8', now: 'coming' },
  { id: 'rosa_flour', p: 'rosa', kind: 'promise', text: 'You said you’d bring her the good flour from Sahadi’s.', src: 'n_rosa_oct4', span: "I need to bring her the good flour from Sahadi's", sec: 'Plans', now: 'yours' },
  { id: 'rosa_nutmeg', p: 'rosa', kind: 'fact', text: 'Rosa’s secret ingredient is nutmeg. She won’t tell anyone.', src: 'n_rosa_oct4', span: "She still won't tell anyone the secret is nutmeg", sec: 'Into' },
  { id: 'rosa_xmas', p: 'rosa', kind: 'plan', text: 'Christmas Eve is at Rosa’s again this year.', src: 'n_rosa_sep21', span: 'Christmas Eve is at her place again this year', sec: 'Plans' },
  { id: 'rosa_figs', p: 'rosa', kind: 'fact', text: 'Rosa’s figs finally came in, and she’s very proud of them.', src: 'n_rosa_sep21', span: "Her figs finally came in and she's very proud of them", sec: 'Into', now: 'lately' },
  { id: 'rosa_c1', p: 'rosa', kind: 'convo', text: 'You called · Mon, Sep 21', about: 'About Christmas Eve', sec: 'Between you', now: 'between' },

  { id: 'priya_lisbon', p: 'priya', kind: 'fact', text: 'Priya lives in Lisbon.', src: 'n_priya_sep21', span: 'Priya FaceTimed from Lisbon', sec: 'Background', now: 'lately' },
  { id: 'priya_studio', p: 'priya', kind: 'fact', text: 'Priya teaches at a ceramics studio in Alfama.', src: 'n_priya_sep21', span: "She's teaching at a ceramics studio in Alfama", sec: 'Background' },

  { id: 'sam_chasing', p: 'sam', kind: 'thread', text: 'Sam has been chasing a promotion for a year.', src: 'n_sam_oct3', span: "Sam's still chasing the promotion she's been after for a year", sec: 'Background', now: 'lately' },
  { id: 'sam_over', p: 'sam', kind: 'thread', text: 'Sam has been completely overwhelmed at work.', src: 'n_sam_oct22', span: 'Sam has been completely overwhelmed at work', sec: 'Background', now: 'lately' },
  { id: 'sam_pots', p: 'sam', kind: 'fact', text: 'Sam throws pots every weekend.', src: 'n_sam_oct22', span: 'throwing pots every weekend', sec: 'Into' },

  { id: 'elena_roses', p: 'elena', kind: 'fact', text: 'Elena knows every rose variety by name.', src: 'n_elena_aug20', span: 'She knows every variety by name', sec: 'Into' },
  { id: 'elena_surgery', p: 'elena', kind: 'event', sens: true, text: 'Elena’s knee surgery is on Tue, Nov 3.', src: 'n_elena_oct26', span: "Elena's knee surgery is Tuesday the 3rd", sec: 'Plans', when: 'Tue, Nov 3', now: 'coming' },
  { id: 'elena_drive', p: 'elena', kind: 'fact', sens: true, text: 'Elena can’t drive for two weeks after the surgery.', src: 'n_elena_oct26', span: "She can't drive for two weeks after", sec: 'Background', now: 'lately' },
  { id: 'elena_follow', p: 'elena', kind: 'event', sens: true, text: 'Elena’s follow-up is on Thu, Nov 12.', src: 'n_elena_oct26', span: 'her follow-up is the 12th', sec: 'Plans', when: 'Thu, Nov 12', now: 'coming' },
  { id: 'elena_promise', p: 'elena', kind: 'promise', text: 'You said you’d check in on Elena after her surgery, maybe bring dinner Thursday.', src: 'n_elena_oct26', span: 'I want to check in after — maybe bring dinner Thursday', sec: 'Plans', now: 'yours' },
];

/* Dense state: Leo's two years of pages (short, plausible, all fictional). */
const LEO_DENSE = [
  ['Thu, Oct 15', "Leo sent a photo of the Pilsen apartment — huge windows, terrible kitchen. He's thrilled."],
  ['Sun, Oct 4', "Leo's students put on a show. He cried a bit, says it was the radiator."],
  ['Mon, Aug 24', "Leo's first week at SAIC. Says the faculty lounge coffee is criminal."],
  ['Sat, Jun 13', "Biscotti turned ten. Leo threw her a party with a cake made of liver. Not joking."],
  ['Fri, Apr 17', "Leo recommended The Overstory. Says it changed how he sees trees."],
  ['Sun, Mar 1', "Leo's back is better. Swimming twice a week now."],
  ['Sat, Jan 10', "Leo and Gia went to Naples for their dad's eightieth."],
  ['Sun, Dec 14, 2025', "Leo hosted the studio holiday dinner. Made his nonno's polenta."],
  ['Wed, Nov 5, 2025', "Leo's thinking about getting a second dog. Biscotti disagrees."],
  ['Sat, Sep 27, 2025', "Leo finished the big mural on Halsted. Took two years."],
  ['Fri, Aug 8, 2025', "Leo said the only music he can paint to is Alice Coltrane."],
  ['Sun, Jun 1, 2025', "Leo's teaching a Saturday kids' class at the studio."],
  ['Tue, Apr 15, 2025', "Leo hates cilantro with a passion that seems medical."],
  ['Sat, Feb 22, 2025', "Leo's mom moved in with Gia for the winter."],
  ['Mon, Jan 6, 2025', "Leo made a resolution to stop buying brushes. Lasted four days."],
  ['Sun, Nov 24, 2024', "First dinner at Leo's. He made cacio e pepe and wouldn't let anyone help."],
];

/* Ideas for showing up. Each is grounded in a memory the user told (ground), never invented.
   cat: the CC-28 category. assist: what the sheet offers. */
const IDEAS = {
  ben: [
    { id: 'ben_bagels', cat: 'A gesture', title: 'Bring him recovery bagels', ground: ['ben_bagels'], ways: ['message', 'keep'], keep: 'Drop off Russ & Daughters bagels for Ben.' },
    { id: 'ben_chicago', cat: 'Time together', title: 'Start planning Chicago', ground: ['ben_chicago'], ways: ['message', 'keep'], keep: 'Talk to Ben about running Chicago next year.' },
  ],
  maya: [
    { id: 'maya_book', cat: 'A gesture', title: 'Get her the book she keeps mentioning', ground: ['maya_book'], ways: ['find', 'card', 'keep'], keep: "Get Maya Ottolenghi's Comfort for her birthday.", keepWhen: 'Thursday' },
    { id: 'maya_soup', cat: 'Celebrate', title: "Cook her grandma's beef noodle soup", ground: ['maya_soup'], ways: ['message', 'keep'], keep: 'Make beef noodle soup for Maya’s birthday.' },
    { id: 'maya_wish', cat: 'Message', title: 'Wish her happy birthday on the day', ground: ['maya_bday'], ways: ['onday'] },
  ],
  josh: [
    { id: 'josh_luck', cat: 'Message', title: 'Wish him luck', ground: ['josh_calm', 'josh_wb'], ways: ['message', 'help'] },
    { id: 'josh_after', cat: 'Follow through', title: 'Ask how it went, afterwards', ground: ['josh_interview'], ways: ['onday'] },
  ],
  elena: [
    { id: 'elena_dinner', cat: 'Practical help', title: 'Bring dinner Thursday', ground: ['elena_promise'], ways: ['message', 'help', 'keep'], keep: 'Bring Elena dinner on Thursday.', keepWhen: 'Thursday' },
    { id: 'elena_ride', cat: 'Practical help', title: 'Offer a ride to her follow-up', ground: ['elena_drive', 'elena_follow'], ways: ['message', 'keep'], keep: 'Offer Elena a ride to her follow-up on the 12th.' },
    { id: 'elena_check', cat: 'Check in', title: 'Just check in', ground: [], ways: ['message', 'call'] },
  ],
  rosa: [
    { id: 'rosa_flour', cat: 'Follow through', title: 'Bring the 00 flour on Sunday', ground: ['rosa_flour'], detail: "“the 00 one, not the bag from the corner store”", ways: ['keep', 'call'], keep: 'Pick up the 00 flour from Sahadi’s for Nonna.', keepWhen: 'Saturday' },
    { id: 'rosa_figs', cat: 'Time together', title: 'Ask her to show you the fig tree', ground: ['rosa_figs'], ways: ['call'] },
  ],
  leo: [
    { id: 'leo_practice', cat: 'Follow through', title: 'Set a time to practice the toast', ground: ['leo_practice', 'leo_speak'], ways: ['message', 'keep'], keep: 'Practice the toast with Leo before the 21st.' },
    { id: 'leo_move', cat: 'Practical help', title: 'Offer to help with the move on the 15th', ground: ['leo_move'], ways: ['message', 'keep'], keep: 'Help Leo move on Sunday the 15th.' },
  ],
  sam: [
    { id: 'sam_kin', cat: 'Time together', title: 'Take her to the Thai place she loves', ground: ['j_sam_thai'], ways: ['message', 'keep'] },
  ],
  priya: [
    { id: 'priya_move', cat: 'Practical help', title: 'Offer to help with the move', ground: ['j_priya_move', 'j_anjali'], ways: ['message', 'keep'], keep: 'Offer to help Priya move into the Oakland place.' },
    { id: 'priya_back', cat: 'Time together', title: 'Welcome her home', ground: ['j_priya_back'], ways: ['message', 'keep'], keep: 'Have Priya over now she’s back.' },
  ],
};

/* Journey 2: a messy story. Spans are exact substrings of the text. */
const J2_TEXT = "Lunch with Priya today — she's back from Lisbon for good!! Moving into a place in Oakland on the 15th I think? or mid-month anyway. Her sister Anjali is flying in to help with the move. Her mom's knee surgery went fine but she's worried about her dad being on his own so much. Then Sam called — she got the promotion!!! I said I'd take her out to celebrate Friday, maybe the Thai place she loves. Oh and Leo — no wait, Josh — his interview got moved to Thursday at 10.";
const J2_ITEMS = [
  { id: 'j_priya_back', p: 'priya', kind: 'fact', text: 'Priya is back from Lisbon for good.', span: "she's back from Lisbon for good", sec: 'Background', now: 'lately', replaces: 'priya_lisbon' },
  { id: 'j_priya_move', p: 'priya', kind: 'event', text: 'Priya is moving into a place in Oakland', dateTok: 'mid-November', dateAlt: 'Sun, Nov 15', span: 'Moving into a place in Oakland on the 15th I think? or mid-month anyway', sec: 'Plans', now: 'coming' },
  { id: 'j_anjali', p: 'priya', kind: 'fact', text: 'Priya’s sister Anjali is flying in to help with the move.', span: 'Her sister Anjali is flying in to help with the move', sec: 'Their people', newPerson: 'Anjali' },
  { id: 'j_mom', p: 'priya', kind: 'event', sens: 'her mom’s health', text: 'Priya’s mom had knee surgery, and it went fine.', span: "Her mom's knee surgery went fine", sec: 'Their people', held: true },
  { id: 'j_dad', p: 'priya', kind: 'thread', text: 'Priya is worried about her dad being on his own so much.', span: "she's worried about her dad being on his own so much", sec: 'Their people', now: 'lately' },
  { id: 'j_sam_promo', p: 'sam', kind: 'fact', text: 'Sam got the promotion.', span: 'she got the promotion', sec: 'Background', now: 'lately', resolves: 'sam_chasing', tag: 'Good news' },
  { id: 'j_sam_promise', p: 'sam', kind: 'promise', text: 'You said you’d take Sam out to celebrate on Fri, Nov 6.', span: "I said I'd take her out to celebrate Friday", sec: 'Plans', now: 'yours' },
  { id: 'j_sam_thai', p: 'sam', kind: 'fact', text: 'Sam loves Thai food.', span: 'the Thai place she loves', sec: 'Into', fix: 'Sam loves Kin Khao, the Thai place on Telegraph.' },
  { id: 'j_josh', p: 'josh', kind: 'event', text: 'Josh’s interview moved to Thu, Nov 5 at 10:00.', span: 'Josh — his interview got moved to Thursday at 10', sec: 'Plans', now: 'coming', when: 'Thu, Nov 5 · 10:00', replaces: 'josh_interview' },
];

/* After-contact notes (journeys 1, 5, 6). */
const AFTER = {
  ben: {
    text: "He did it — 3:58! Already talking about Chicago. His knee's sore but he says it's nothing.",
    items: [
      { id: 'a_ben_time', p: 'ben', kind: 'fact', text: 'Ben finished the New York Marathon in 3:58.', span: 'He did it — 3:58!', sec: 'Background', now: 'lately', tag: 'Good news' },
      { id: 'a_ben_chicago', p: 'ben', kind: 'context', known: 'ben_chicago', text: 'Ben wants to run Chicago together next year.', span: 'Already talking about Chicago' },
      { id: 'a_ben_knee', p: 'ben', kind: 'fact', sens: 'his health', held: true, text: 'Ben’s knee is sore after the marathon.', span: "His knee's sore but he says it's nothing", sec: 'Background' },
    ],
  },
  elena: {
    text: "Bringing Elena dinner Thursday at 7. She's craving lentil soup and says the pain's better than she expected.",
    items: [
      { id: 'a_elena_dinner', p: 'elena', kind: 'promise', text: 'You’re bringing Elena dinner on Thu, Nov 5 at 7:00.', span: 'Bringing Elena dinner Thursday at 7', sec: 'Plans', now: 'yours', supersedes: 'elena_promise' },
      { id: 'a_elena_soup', p: 'elena', kind: 'fact', text: 'Elena is craving lentil soup.', span: "She's craving lentil soup", sec: 'Into', now: 'lately' },
      { id: 'a_elena_pain', p: 'elena', kind: 'fact', sens: 'her health', held: true, text: 'Elena’s pain is better than she expected.', span: "says the pain's better than she expected", sec: 'Background' },
    ],
  },
  sam: {
    text: "Took Sam to Kin Khao to celebrate. She starts the new role on the 16th and she's nervous about managing people who used to be her teammates. She gave me a bowl she made — the blue one!",
    items: [
      { id: 'a_sam_start', p: 'sam', kind: 'event', text: 'Sam starts her new role on Mon, Nov 16.', span: 'She starts the new role on the 16th', sec: 'Plans', now: 'coming', when: 'Mon, Nov 16' },
      { id: 'a_sam_nerv', p: 'sam', kind: 'thread', text: 'Sam is nervous about managing her old teammates.', span: "she's nervous about managing people who used to be her teammates", sec: 'Background', now: 'lately' },
      { id: 'a_sam_bowl', p: 'sam', kind: 'context', text: 'Sam gave you a bowl she made, the blue one.', span: 'She gave me a bowl she made — the blue one!', sec: 'Between you', now: 'between' },
      { id: 'a_sam_kin', p: 'sam', kind: 'fact', known: 'j_sam_thai', text: 'Sam loves Kin Khao, the Thai place on Telegraph.', span: 'Kin Khao' },
    ],
  },
};
