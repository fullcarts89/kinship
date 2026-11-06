// Fixtures for the brand-directions exploration (19 Oct 2026). Exploratory, unapproved.
// Fictional people and notes only; nothing here is production data, a model output or an API call.
// The same content is rendered by every direction so that the directions, not the stories, differ.
(function () {
  const SP = window.SPRIGS2 || {};
  // The household: 15 people (round 2's set, unchanged so the comparison is fair).
  const SMALL = [
    ["ana", "Ana", "Ana is visiting for Thanksgiving"], ["anthony", "Anthony", "Anthony and Natalia's wedding is Thursday"],
    ["ben", "Ben", "Ben runs Chicago Sunday"], ["chris", "Chris", "Chris is into Warhammer again"], ["david", "David", null],
    ["josh", "Josh", "Josh has his interview Wednesday"], ["lena", "Lena", "Lena moved to Oakland"], ["maya", "Maya", "Maya is reading Piranesi"],
    ["mom", "Mom", "Mom's surgery is Thursday"], ["nana", "Nana", null, "remembered"], ["priya", "Priya", "Priya's pottery show is on October 24"],
    ["sam-diaz", "Sam Diaz", null], ["sam-lee", "Sam Lee", "Sam is training for a triathlon"], ["sarah", "Sarah", "Sarah's sister has surgery Thursday"],
    ["tyler", "Tyler", "Tyler is thinking about moving to Marin"],
  ];
  const LINES = ["is visiting next month", "got the job", "moved to Portland", "is running a half in May", "started pottery", "has a new puppy", "is reading Piranesi", null, null, "is training for a triathlon", "is thinking about grad school", null, "had a baby in August", "is renovating the kitchen", null];
  const LARGE = Object.keys(SP).map((id, i) => [id, SP[id].name, LINES[i % LINES.length] ? `${SP[id].name.split(" ")[0]} ${LINES[i % LINES.length]}` : null, id === "nana" ? "remembered" : undefined])
    .sort((a, b) => a[1].localeCompare(b[1]));

  // Today's states. `kind` drives the occasion art and the emotional register; nothing else.
  const MOMENTS = {
    // Scenario B: a grounded, upcoming race (the day before).
    moment: { person: "ben", name: "Ben", date: "Saturday, Oct 10", kicker: "Tomorrow", statement: "Ben runs Chicago tomorrow.", ctx: "Chicago Marathon · Sun, Oct 11", para: "Ben was hoping to break four hours.", quote: "Ben runs Chicago Sunday. He's hoping to break four hours.", prov: "You told Kinship · Oct 8", primary: "Wish Ben luck", kind: "race", why: "It's tomorrow.", when: "Sun, Oct 11", mention: ["Ben's knee has been bothering him", "He was hoping to break four hours"], handoff: "Wish Ben luck", ask: "Did you wish Ben luck?", reached: "You wished Ben luck.", after: "Anything worth remembering from talking with Ben?", celebrate: false },
    // The day after (the return loop, scenario E, starts here).
    dayafter: { person: "ben", name: "Ben", date: "Monday, Oct 12", kicker: "The day after", statement: "How did it go for Ben?", ctx: "Ben runs Chicago Sunday · Sun, Oct 11", para: "Ben was hoping to break four hours.", quote: "Ben runs Chicago Sunday. He's hoping to break four hours.", prov: "You told Kinship · Oct 8", primary: "Ask how it went", kind: "race", why: "It was yesterday.", when: "Sun, Oct 11", mention: ["Ben's knee has been bothering him", "He was hoping to break four hours"], handoff: "Ask Ben how it went", ask: "Did you ask Ben how it went?", reached: "You asked Ben how it went.", after: "Anything worth remembering from talking with Ben?", celebrate: false },
    birthday: { person: "maya", name: "Maya", date: "Saturday, Oct 17", kicker: "A birthday", statement: "It's Maya's birthday.", ctx: null, para: null, quote: null, prov: "From Contacts", primary: "Message Maya", kind: "birthday", why: "It's today.", when: "Oct 17", mention: ["Maya is reading Piranesi"], handoff: "Wish Maya a happy birthday", ask: "Did you reach Maya?", reached: "You reached Maya.", after: "Anything worth remembering from talking with Maya?", celebrate: true },
    milestone: { person: "anthony", name: "Anthony", date: "Monday, Oct 12", kicker: "Thursday", statement: "Anthony and Natalia's wedding is Thursday.", ctx: "Thursday · Thu, Oct 15", para: null, quote: "Anthony and Natalia are getting married Thursday at the Presidio!", prov: "You told Kinship · Oct 3", primary: "Message Anthony", kind: "wedding", why: "It's on Thursday.", when: "Thu, Oct 15", mention: ["They're getting married at the Presidio"], handoff: "Message Anthony before the wedding", ask: "Did you reach Anthony about the wedding?", reached: "You reached Anthony about the wedding.", after: "Anything worth remembering from talking with Anthony?", celebrate: true },
    promise: { person: "david", name: "David", date: "Tuesday, Oct 13", kicker: "You said you'd", statement: "Send David the contractor's number.", ctx: "You said you would, on Oct 9", para: null, quote: "Told David I'd send him Marco's number for the deck.", prov: "You told Kinship · Oct 9", primary: "Message David", kind: "promise", why: "You said you'd do it.", when: "Oct 9", mention: ["Marco's number for the deck"], handoff: "Message David", ask: "Did you send David the number?", reached: "You sent David the number.", after: null, future: "RSN-06 (Commit next)" },
    // Scenario F: a sensitive situation. No kicker, no occasion art, no celebration anywhere.
    sensitive: { person: "mom", name: "Mom", date: "Wednesday, Oct 14", kicker: null, statement: "Mom's surgery is tomorrow.", ctx: "Thursday · Thu, Oct 15", para: null, quote: "Mom's surgery is Thursday.", prov: "You told Kinship · Oct 9", primary: "Message Mom", kind: "none", why: "It's tomorrow.", when: "Thu, Oct 15", mention: [], handoff: "Message Mom", ask: "Did you reach Mom?", reached: "You reached Mom.", after: "Anything worth remembering from talking with Mom?", plain: true, future: "RSN-09 (Alpha); illustrative only" },
  };
  const WEEK = {
    moment: [{ dn: "WED", d: 14, text: "Josh has his interview", person: "josh" }, { dn: "SAT", d: 17, text: "Maya's birthday", person: "maya" }],
    dayafter: [{ dn: "WED", d: 14, text: "Josh has his interview", person: "josh" }, { dn: "SAT", d: 17, text: "Maya's birthday", person: "maya" }],
    birthday: [{ dn: "MON", d: 19, text: "Lena starts at Figma", person: "lena" }, { dn: "SAT", d: 24, text: "Priya's pottery show", person: "priya" }],
    milestone: [{ dn: "WED", d: 14, text: "Josh has his interview", person: "josh" }, { dn: "SAT", d: 17, text: "Maya's birthday", person: "maya" }],
    sensitive: [{ dn: "SAT", d: 17, text: "Maya's birthday", person: "maya" }],
    promise: [{ dn: "WED", d: 14, text: "Josh has his interview", person: "josh" }, { dn: "SAT", d: 17, text: "Maya's birthday", person: "maya" }],
    quiet: [{ dn: "WED", d: 14, text: "Josh has his interview", person: "josh" }, { dn: "SAT", d: 17, text: "Maya's birthday", person: "maya" }],
  };

  // Scenario D and the extended states: a person's page. Section rules are production's (three per section, newest first).
  const PROFILES = {
    priya: { name: "Priya", label: "college roommate", place: "Oakland", kind: "rich",
      now: { text: "Priya's pottery show is on Oct 24", prov: "You told Kinship · Sep 25", kicker: "Coming up · Saturday, Oct 24" },
      lately: [["Priya's dog Miso had a good vet checkup", "You told Kinship · Oct 1"], ["Priya is reading Piranesi", "You told Kinship · Sep 29"], ["Priya's team at Figma shipped the new editor", "You told Kinship · Sep 12"]],
      coming: [["Priya's mom is visiting from Pune · Week of Nov 2", "You told Kinship · Oct 6"]],
      said: [["Send Priya the Piranesi audiobook link", "You told Kinship · Sep 30"]],
      between: [{ text: "You two always get dosas on Shattuck", prov: "You told Kinship · Aug 14" }] },
    lena: { name: "Lena", label: "from the climbing gym", place: null, kind: "sparse",
      now: { text: "Lena moved to Oakland", prov: "You told Kinship · Oct 5", kicker: "Told Oct 5" },
      lately: [], coming: [], said: [], between: [] },
    chris: { name: "Chris", label: "Austin years", place: "Austin", kind: "shared",
      now: { text: "Games with Chris and Susan on Saturday", prov: "You told Kinship · Oct 7", kicker: "Coming up · Saturday, Oct 17" },
      lately: [["Chris is into Warhammer again", "You told Kinship · Oct 9"], ["Chris started coaching his daughter's team", "You told Kinship · Sep 20"]],
      coming: [], said: [["Send Chris that restaurant", "You told Kinship · Oct 10"]],
      between: [{ text: "You two ran the lake loop every Saturday in Austin", prov: "You told Kinship · Aug 2", quote: "Chris and I ran the lake loop every Saturday for two years. Best part of Austin." }, { text: "Thanksgiving at Chris's, most years since 2019", prov: "You told Kinship · Aug 2" }] },
    mom: { name: "Mom", label: null, place: "Sacramento", kind: "sensitive",
      now: { text: "Mom's surgery is Thursday", prov: "You told Kinship · Oct 9", kicker: "Coming up · Thursday, Oct 15" },
      lately: [["Mom wants to do Thanksgiving at hers", "You told Kinship · Oct 2"]], coming: [], said: [["Drive Mom to the hospital Thursday", "You told Kinship · Oct 9"]], between: [] },
    nana: { name: "Nana", label: null, place: null, kind: "remembered", now: null, lately: [], coming: [], said: [], between: [{ text: "Nana taught you to make pierogi every Christmas Eve", prov: "You told Kinship · Jan 3" }] },
    "sam-diaz": { name: "Sam Diaz", label: null, place: null, kind: "empty", now: null, lately: [], coming: [], said: [], between: [] },
  };

  // A long Tell (the rapid-understanding exploration's story-first capture, PROPOSED, PR #52): the same words in every direction.
  const LONG_TELL = {
    text: "Had dinner with Priya last night. Her pottery show got moved to the 24th, she's nervous about it. Miso had a good vet checkup finally. Her mom's visiting from Pune the first week of November and wants to see the redwoods. Oh and she's still reading Piranesi, loves it. I said I'd send her the audiobook link.",
    kept: [
      { text: "Priya's pottery show is on Oct 24", prov: "From your note · Oct 19", status: "kept" },
      { text: "Priya's dog Miso had a good vet checkup", prov: "From your note · Oct 19", status: "kept" },
      { text: "Priya's mom is visiting from Pune · Week of Nov 2", prov: "From your note · Oct 19", status: "kept" },
      { text: "Priya is reading Piranesi", prov: "From your note · Oct 19", status: "kept" },
      { text: "You said you'd send Priya the audiobook link", prov: "From your note · Oct 19", status: "kept" },
    ],
    pending: { text: "Priya is nervous about the show", status: "pending", note: "Held: a feeling, not a fact. Kept only if you say so." },
  };

  const CLARIFY = { question: "Which Sam?", text: "Sam is training for a triathlon", options: ["Sam Diaz", "Sam Lee"], prov: "From your note · Oct 19" };

  // Ask Kinship (Alpha, CC-25; PROVISIONAL): typed results with sources and an explicit uncertainty line.
  const ASK = { q: "Who do I know in Alameda?", results: [
    { type: "established", text: "Susan lives in Alameda, California", prov: "From 2 notes · Oct 9 · one edited by you", who: "Susan" },
    { type: "related", text: "Ben's mom lives in Alameda", prov: "You told Kinship · Sep 2", who: "Mentioned in a note about Ben · not in People" },
    { type: "memory", text: "The Alameda farmers market is good on Sundays", prov: "You told Kinship · Aug 30", who: "From a note · doesn't say who" },
  ], closing: "From what you've told Kinship, with each line's source. Nothing is kept from a question." };

  // A contextual planning idea (FUTURE, CC-28 bucket D; a suggestion, never a remembered fact).
  const IDEA = { text: "Priya's show is Saturday. You could go.", basis: "Priya's pottery show is on Oct 24", prov: "You told Kinship · Sep 25", label: "An idea, not a memory" };

  window.FX = { SMALL, LARGE, MOMENTS, WEEK, PROFILES, LONG_TELL, CLARIFY, ASK, IDEA };
})();
