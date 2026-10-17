// Round 2 engine: one pure renderer for Today, People and a person's page, with the
// round-2 refinements, mounted interactively (prototype.html) or as stills (compare.html).
// Exploratory, unapproved. Fictional content; no production code, data or model.
(function () {
  const { sprig: sprig1, grass, skyArc, icon } = window.K;
  const ill = Object.assign({}, window.K.ill);
  // round 2 redraws the bow to fill its box like the other occasion drawings (round 1's file is left unchanged)
  ill.bow = function (size = 120, color = "currentColor") {
    const f = (n) => (Math.round(n * 10) / 10).toString();
    const w = size, h = size, cx = w / 2, cy = h * 0.46, k = size / 120;
    const loops = `M${f(cx)} ${f(cy)}q${f(-30*k)} ${f(-34*k)} ${f(-46*k)} ${f(-8*k)}q${f(-8*k)} ${f(22*k)} ${f(22*k)} ${f(22*k)}q${f(20*k)} 0 ${f(24*k)} ${f(-14*k)}q${f(4*k)} ${f(14*k)} ${f(24*k)} ${f(14*k)}q${f(30*k)} 0 ${f(22*k)} ${f(-22*k)}q${f(-16*k)} ${f(-26*k)} ${f(-46*k)} ${f(8*k)}`;
    const tails = `M${f(cx)} ${f(cy)}q${f(-12*k)} ${f(30*k)} ${f(-4*k)} ${f(54*k)}M${f(cx)} ${f(cy)}q${f(16*k)} ${f(26*k)} ${f(12*k)} ${f(50*k)}`;
    const knot = `M${f(cx - 7*k)} ${f(cy - 6*k)}a${f(7*k)} ${f(7*k)} 0 1 0 ${f(14*k)} 0a${f(7*k)} ${f(7*k)} 0 1 0 ${f(-14*k)} 0`;
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path d="${loops}" fill="${color}" fill-opacity="0.07"/><path d="${loops}${tails}${knot}" fill="none" stroke="${color}" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  };
  const SP = Object.assign({}, window.SPRIGS2);
  const VIEW_W = 60, VIEW_H = 110;
  // the sprig drawn from the round-2 set (110 fictional people), same renderer as the app's
  function sprig(id, width, color, opts = {}) {
    const d = SP[id]; if (!d) return "";
    const height = (width * VIEW_H) / VIEW_W;
    const stroke = Math.min(1.2, Math.max(0.7, width / 50)) * (opts.fine ? 0.85 : 1);
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${VIEW_W} ${VIEW_H}" aria-hidden="true" focusable="false"><path d="${d.wash}" fill="${color}" fill-opacity="${opts.wash ?? 0.07}"/><path d="${d.line}" fill="none" stroke="${color}" stroke-width="${(stroke * VIEW_W) / width}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
  const C = { ink: "var(--ink)", quiet: "var(--inkQuiet)" };
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

  // ======================= fixtures (fictional) =======================
  // Every line carries: text (grounded display copy, roman), para (a paraphrase Kinship built: italic, no
  // quotes), or quote (the user's own words, verbatim: in quotation marks, always with its note).
  const SMALL = [ // the household: 15 people
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

  const MOMENTS = {
    moment: { person: "ben", name: "Ben", date: "Monday, Oct 12", kicker: "The day after", statement: "How did it go for Ben?", ctx: "Ben runs Chicago Sunday · Sun, Oct 11", para: "Ben was hoping to break four hours.", quote: "Ben runs Chicago Sunday. He's hoping to break four hours.", prov: "You told Kinship · Oct 8", primary: "Ask how it went", art: "laurel", why: "It was yesterday.", when: "Sun, Oct 11", mention: ["Ben's knee has been bothering him", "He was hoping to break four hours"], handoff: "Ask Ben how it went", ask: "Did you ask Ben how it went?", reached: "You asked Ben how it went.", after: "Anything worth remembering from talking with Ben?" },
    birthday: { person: "maya", name: "Maya", date: "Saturday, Oct 17", kicker: "A birthday", statement: "It's Maya's birthday.", ctx: null, para: null, quote: null, prov: "From Contacts", primary: "Message Maya", art: "candle", why: "It's today.", when: "Oct 17", mention: ["Maya is reading Piranesi"], handoff: "Wish Maya a happy birthday", ask: "Did you reach Maya?", reached: "You reached Maya.", after: "Anything worth remembering from talking with Maya?", celebrate: true },
    milestone: { person: "anthony", name: "Anthony", date: "Monday, Oct 12", kicker: "Thursday", statement: "Anthony and Natalia's wedding is Thursday.", ctx: "Thursday · Thu, Oct 15", para: null, quote: "Anthony and Natalia are getting married Thursday at the Presidio!", prov: "You told Kinship · Oct 3", primary: "Message Anthony", art: "rings", why: "It's on Thursday.", when: "Thu, Oct 15", mention: ["They're getting married at the Presidio"], handoff: "Message Anthony before the wedding", ask: "Did you reach Anthony about the wedding?", reached: "You reached Anthony about the wedding.", after: "Anything worth remembering from talking with Anthony?", celebrate: true },
    promise: { person: "david", name: "David", date: "Tuesday, Oct 13", kicker: "You said you'd", statement: "Send David the contractor's number.", ctx: "You said you would, on Oct 9", para: null, quote: "Told David I'd send him Marco's number for the deck.", prov: "You told Kinship · Oct 9", primary: "Message David", art: "bow", why: "You said you'd do it.", when: "Oct 9", mention: ["Marco's number for the deck"], handoff: "Message David", ask: "Did you send David the number?", reached: "You sent David the number.", after: null, future: "RSN-06" },
    thread: { person: "josh", name: "Josh", date: "Tuesday, Oct 13", kicker: "A while ago", statement: "Did Josh decide about the startup?", ctx: "Josh may leave Google · told Aug 20", para: null, quote: "Josh is thinking about leaving Google for a startup. Deciding by the fall.", prov: "You told Kinship · Aug 20", primary: "Ask Josh", art: null, why: "You told Kinship in August, and nothing since.", when: "Aug 20", mention: ["He was deciding by the fall"], handoff: "Ask Josh about the startup", ask: "Did you ask Josh about the startup?", reached: "You asked Josh about the startup.", after: "Anything worth remembering from talking with Josh?", future: "RSN-07" },
    sensitive: { person: "mom", name: "Mom", date: "Wednesday, Oct 14", kicker: null, statement: "Mom's surgery is tomorrow.", ctx: "Thursday · Thu, Oct 15", para: null, quote: "Mom's surgery is Thursday.", prov: "You told Kinship · Oct 9", primary: "Call Mom", art: null, why: "It's tomorrow.", when: "Thu, Oct 15", mention: [], handoff: "Call Mom", ask: "Did you reach Mom?", reached: "You reached Mom.", after: "Anything worth remembering from talking with Mom?", plain: true },
  };
  const WEEK = { // Coming up: ≤ 3 lines then "and N more"; a Waiting line comes before them (todayModel order)
    moment: [{ dn: "WED", d: 14, text: "Josh has his interview", person: "josh" }, { dn: "SAT", d: 17, text: "Maya's birthday", person: "maya" }],
    birthday: [{ dn: "MON", d: 19, text: "Lena starts at Figma", person: "lena" }, { dn: "SAT", d: 24, text: "Priya's pottery show", person: "priya" }],
    milestone: [{ dn: "WED", d: 14, text: "Josh has his interview", person: "josh" }, { dn: "SAT", d: 17, text: "Maya's birthday", person: "maya" }],
    sensitive: [{ dn: "SAT", d: 17, text: "Maya's birthday", person: "maya" }],
    promise: [{ dn: "WED", d: 14, text: "Josh has his interview", person: "josh" }, { dn: "SAT", d: 17, text: "Maya's birthday", person: "maya" }],
    thread: [{ dn: "WED", d: 14, text: "Josh has his interview", person: "josh" }, { dn: "SAT", d: 17, text: "Maya's birthday", person: "maya" }],
    busy: [{ dn: "FRI", d: 16, text: "Did Tyler send it?", person: "tyler", waiting: "Waiting on Tyler" }, { dn: "TODAY", d: 12, text: "Send Chris that restaurant", person: "chris", ochre: true }, { dn: "WED", d: 14, text: "Josh has his interview", person: "josh" }, { dn: "SAT", d: 17, text: "Maya's birthday", person: "maya" }],
  };

  const PROFILES = {
    priya: { name: "Priya", label: "college roommate", place: "Oakland", kind: "rich",
      now: { text: "Priya's pottery show is on Oct 24", prov: "You told Kinship · Sep 25", when: "Sat, Oct 24", kicker: "Coming up · Saturday, Oct 24", from: "coming" },
      lately: [["Priya's dog Miso had a good vet checkup", "You told Kinship · Oct 1"], ["Priya is reading Piranesi", "You told Kinship · Sep 29"], ["Priya's team at Figma shipped the new editor", "You told Kinship · Sep 12"]],
      coming: [["Priya's pottery show · Sat, Oct 24", "You told Kinship · Sep 25"], ["Priya's mom is visiting from Pune · Week of Nov 2", "You told Kinship · Oct 6"]],
      said: [["Send Priya the Piranesi audiobook link", "You told Kinship · Sep 30"]],
      between: [{ text: "You two always get dosas on Shattuck", prov: "You told Kinship · Aug 14" }],
      trail: [["You messaged · Oct 2", "Priya is reading Piranesi"]] },
    lena: { name: "Lena", label: "from the climbing gym", place: null, kind: "sparse",
      now: { text: "Lena moved to Oakland", prov: "You told Kinship · Oct 5", when: null, kicker: "Told Oct 5", from: "lately" },
      lately: [["Lena moved to Oakland", "You told Kinship · Oct 5"]], coming: [["Lena starts at Figma · Mon, Oct 19", "You told Kinship · Oct 5"]], said: [["Help Lena hang shelves", "You told Kinship · Oct 5"]], between: [], trail: [] },
    chris: { name: "Chris", label: "Austin years", place: "Austin", kind: "shared",
      now: { text: "Chris is into Warhammer again", prov: "You told Kinship · Oct 9", when: null, kicker: "Told Oct 9", from: "lately" },
      lately: [["Chris is into Warhammer again", "You told Kinship · Oct 9"], ["Chris started coaching his daughter's team", "You told Kinship · Sep 20"]],
      coming: [["Games with Chris and Susan · Sat, Oct 17", "You told Kinship · Oct 7"]], said: [["Send Chris that restaurant", "You told Kinship · Oct 10"]],
      between: [{ text: "You two ran the lake loop every Saturday in Austin", prov: "You told Kinship · Aug 2", quote: "Chris and I ran the lake loop every Saturday for two years. Best part of Austin." }, { text: "Thanksgiving at Chris's, most years since 2019", prov: "You told Kinship · Aug 2" }],
      trail: [["You called · Oct 10", "Send Chris that restaurant"], ["You saw Chris · Sep 20", "Chris started coaching his daughter's team"], ["You messaged · Aug 30", null]] },
    mom: { name: "Mom", label: null, place: "Sacramento", kind: "sensitive",
      now: { text: "Mom's surgery is Thursday", prov: "You told Kinship · Oct 9", when: "Thu, Oct 15", kicker: "Coming up · Thursday, Oct 15", from: "coming" },
      lately: [["Mom wants to do Thanksgiving at hers", "You told Kinship · Oct 2"]], coming: [["Mom's surgery · Thu, Oct 15", "You told Kinship · Oct 9"]], said: [["Drive Mom to the hospital Thursday", "You told Kinship · Oct 9"]], between: [], trail: [] },
    nana: { name: "Nana", label: null, place: null, kind: "remembered",
      now: null, lately: [], coming: [], said: [], between: [{ text: "Nana taught you to make pierogi every Christmas Eve", prov: "You told Kinship · Jan 3" }], trail: [] },
    "sam-diaz": { name: "Sam Diaz", label: null, place: null, kind: "empty", now: null, lately: [], coming: [], said: [], between: [], trail: [] },
  };

  // ======================= frame =======================
  function status() {
    return `<div class="status"><span>9:41</span><span class="island"></span><span class="sig"><svg width="18" height="12" viewBox="0 0 18 12" aria-hidden="true"><rect x="0" y="8" width="3" height="4" rx="1" fill="currentColor"/><rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="currentColor"/><rect x="10" y="3" width="3" height="9" rx="1" fill="currentColor"/><rect x="15" y="0" width="3" height="12" rx="1" fill="currentColor"/></svg><svg width="16" height="12" viewBox="0 0 16 12" aria-hidden="true"><path d="M8 11a1.4 1.4 0 1 0 0-.01M4.2 7.4a5.4 5.4 0 0 1 7.6 0M1.2 4.4a9.6 9.6 0 0 1 13.6 0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg><svg width="27" height="13" viewBox="0 0 27 13" aria-hidden="true"><rect x=".5" y=".5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" stroke-opacity=".4"/><rect x="2" y="2" width="18" height="9" rx="2" fill="currentColor"/><path d="M25 4.5v4a2 2 0 0 0 0-4z" fill="currentColor" fill-opacity=".4"/></svg></span></div>`;
  }
  let NAV = "two"; // two | three | dockask (set per render)
  const dock = (current, extra = "") => `<div class="dock">${extra}${NAV === "dockask" ? `<div class="tell"><span class="seg"><b>Tell</b><span>Ask</span></span>Tell Kinship something…</div>` : `<div class="tell">Tell Kinship something…</div>`}<div class="bar"><span class="${current === "today" ? "on" : ""}" data-act="go" data-to="today">Today</span><span class="${current === "people" ? "on" : ""}" data-act="go" data-to="people">People</span>${NAV === "three" ? `<span class="${current === "ask" ? "on" : ""}" data-act="go" data-to="ask">Ask</span>` : ""}</div></div>`;

  // ======================= config helpers =======================
  const defaults = { nav: "two", ask: null, screen: "today", state: "moment", person: "priya", treatment: "p1", hedge: "C", motion: "resolve", appearance: "auto", hour: 8, reduce: false, large: false, se: false, people: "small", query: "", sheet: null, toast: null, phase: null };
  const night = (c) => c.appearance === "night" || (c.appearance === "auto" && (c.hour < 6 || c.hour >= 19));
  const tint = (c) => { const h = c.hour; if (night(c)) return h >= 19 && h < 22 ? "var(--dusk)" : "var(--dawn)"; if (h < 9) return "var(--dawn)"; if (h >= 17) return "var(--dusk)"; return "var(--day)"; };
  const greeting = (c) => (c.hour < 12 ? "Good morning, Nico." : c.hour < 18 ? "Good afternoon, Nico." : "Good evening, Nico.");
  const seasonLine = (c) => `Mid-October. ${c.hour < 6 ? "The small hours." : c.hour < 9 ? "Early." : c.hour < 12 ? "A quiet morning." : c.hour < 17 ? "A quiet afternoon." : c.hour < 21 ? "Evening." : "Late."}`;
  const arrive = (n = 0) => `arrive${n ? ` d${n}` : ""}`;
  const peopleOf = (c) => (c.people === "large" ? LARGE : SMALL);

  // ======================= Today =======================
  function plate(m, c) {
    const long = m.statement.length > 30;
    const art = m.art && ill[m.art] ? ill[m.art](long ? 104 : m.celebrate ? 118 : 128, C.ink) : "";
    return `<div class="plate ${m.celebrate ? "celebrate" : ""} ${m.plain ? "plain" : ""} ${long ? "long" : ""}" data-plate>
      ${m.celebrate ? `<div class="celebrate-band"></div>` : ""}
      <div class="words" data-act="detail" role="button" tabindex="0" aria-label="${esc(m.statement)}. Shows why this is here">
        ${art ? `<div class="art">${art}</div>` : ""}
        ${m.kicker ? `<div class="kicker">${m.kicker}</div>` : ""}
        <div class="statement">${m.statement}</div>
        ${m.ctx ? `<div class="body ctx">${m.ctx}</div>` : ""}
        ${m.para ? `<div class="para">${m.para}</div>` : ""}
        <div style="margin-top:10px;clear:both"><span class="prov">${m.prov}</span></div>
      </div>
      ${c.hedge === "C" || c.hedge === "A" || c.hedge === "B" ? `<div class="meadow">${grass(393, 56, 4, C.ink, { opacity: .38 })}<div class="stand">${sprig(m.person, 30, C.ink, { wash: .09 })}</div></div>` : ""}
    </div>
    <div class="actions ${arrive(1)}"><span class="pill" data-act="handoff" role="button" tabindex="0">${icon[m.plain ? "phone" : "message"]("var(--onInk)")}${m.primary}</span><span class="notnow" data-act="notnow" role="button" tabindex="0">Not now</span></div>`;
  }
  function week(items, opts = {}) {
    const rows = items.map((w) => `<div class="day ${arrive(2)}" data-act="week" data-text="${esc(w.text)}"><span class="dn ${w.ochre ? "ochre" : ""}"><b>${w.dn}</b>${w.d}</span><span class="line">${w.waiting ? `<span class="small sub">${w.waiting}</span>` : ""}${w.text}</span></div>`).join("");
    return `<div class="week"><div class="label ${arrive(2)}">${opts.title || "This week"}</div>${rows}${opts.more ? `<div class="more small ${arrive(3)}" data-act="more">and ${opts.more} more</div>` : ""}</div>`;
  }
  // the return question, round 2: the question is the moment; the reason is its context; the hand-off is not repeated as a pill
  function returnBlock(m, c) {
    const ph = c.phase; // null | settling | resolved
    const quiet = ph === "settling" ? " settled" : "";
    const resolved = ph === "resolved";
    return `<div class="ret${quiet} ${arrive()}" data-ret aria-live="polite">
      <div class="kicker ${resolved ? "fading" : ""}">When you're back</div>
      <div class="statement" data-st>${resolved ? m.reached : m.ask}</div>
      <div class="body ${resolved ? "fading" : ""}" style="margin-top:10px" data-body>Kinship opened Messages for you this morning. Nothing was sent.</div>
      <div class="about ${resolved ? "fading" : ""}" data-act="detail" data-about><div class="line">${m.statement}</div><div class="small" style="margin-top:2px">${m.ctx || ""}</div><div class="provrow" style="margin-top:4px"><span class="prov">${m.prov}</span></div></div>
      <div class="actions ${resolved ? "fading" : ""}" style="margin-top:16px" data-pills><span class="pill small" data-act="yes" role="button" tabindex="0">Yes</span><span class="pill small quiet" data-act="notyet" role="button" tabindex="0">Not yet</span></div>
      <div class="again ${resolved ? "fading" : ""}" data-act="handoff" data-again>Open Messages again</div>
    </div>`;
  }
  function todayHTML(c) {
    const st = c.state;
    const m = MOMENTS[st] || MOMENTS[c.base || "moment"] || MOMENTS.moment;
    const date = m.date || "Monday, Oct 12";
    const head = `<div class="top ${arrive()}"><div class="label">${date}</div><div class="greeting" style="margin-top:8px">${greeting(c)}</div></div>`;
    let body = "";
    const wk = WEEK[st] || WEEK[c.base] || WEEK.moment;
    if (["moment", "birthday", "milestone", "sensitive", "promise", "thread"].includes(st)) body = plate(m, c) + week(wk);
    else if (st === "busy") body = plate(MOMENTS.moment, c) + week(WEEK.busy, { more: 2 });
    else if (st === "return") body = returnBlock(m, c) + week(wk);
    else if (st === "after" && !m.after) {
      body = `<div class="ret ${arrive()}" aria-live="polite"><div class="kicker">When you're back</div><div class="statement">${m.reached}</div><div class="body" style="margin-top:10px">That's done. Nothing else to remember from it.</div></div>` + week(wk);
    } else if (st === "after") {
      body = `<div class="ret ${arrive()}" aria-live="polite"><div class="kicker">${m.reached}</div><div class="statement">${m.after}</div>
        <div class="actions" style="margin-top:22px"><span class="pill" data-act="tell" role="button" tabindex="0">Tell Kinship</span><span class="pill quiet" data-act="nothing" role="button" tabindex="0">Nothing today</span></div></div>` + week(wk);
    } else if (st === "quiet") {
      body = `<div class="plate" style="margin-top:30px"><div class="kicker ${arrive()}">${seasonLine(c)}</div><div class="display ${arrive()}" style="margin-top:6px">Nothing needs you today.</div></div>
        ${c.hedge === "A" ? "" : `<div class="meadow tall ${arrive(1)}">${grass(393, 80, 21, C.ink, { opacity: .3, gap: 7 })}</div>`}` + week(WEEK.moment);
    } else if (st === "first") {
      body = `<div class="first ${arrive()}"><div class="display" style="margin-top:30px">This is where Kinship brings things back.</div>
        <div class="body" style="margin-top:10px">Tell it one thing about someone. When it matters, it comes back here.</div>
        <div class="example"><span class="tag label">An example</span><div class="art">${ill.laurel(84, C.ink)}</div>
          <div class="kicker" style="font-family:var(--serif);font-style:italic;color:var(--inkQuiet)">The day after</div><div class="st">How did it go for Ben?</div>
          <div class="small" style="margin-top:6px">You told Kinship: Ben runs Chicago Sunday. He's hoping to break four hours.</div>
          <div class="row"><span class="pill">${icon.message("var(--onInk)")}Ask how it went</span><span class="small">Then, when you're back: Did you ask Ben how it went?</span></div></div>
        <div class="pills"><span class="pill" data-act="tell" role="button" tabindex="0">Tell Kinship one thing</span><span class="pill quiet" role="button" tabindex="0">Add more people</span></div></div>`;
    } else if (st === "bringback") {
      body = `<div class="first ${arrive()}"><div class="display" style="margin-top:30px">This is where Kinship brings things back, when they matter.</div>
        <div class="example"><span class="tag label">You told Kinship</span>
          <div class="quote" style="margin-top:4px">Maya's birthday is the 17th. She wants to go to that ramen place.</div>
          <div class="small" style="margin-top:8px">Kinship kept: Maya's birthday · Sat, Oct 17 · Maya wants to go to that ramen place</div>
          <div class="kicker" style="font-family:var(--serif);font-style:italic;color:var(--inkQuiet);margin-top:14px">On Saturday</div><div class="st">It's Maya's birthday.</div>
          <div class="row"><span class="pill">${icon.message("var(--onInk)")}Message Maya</span><span class="small">When you're back: Did you reach Maya?</span></div></div>
        <div class="pills" style="margin-top:18px"><span class="pill quiet" data-act="gotit" role="button" tabindex="0">Got it</span></div></div>`;
    }
    // the ground: A hedgerow, B horizon, C nothing
    const lit = st === "busy" || st === "moment" || st === "return" ? "ben" : st === "birthday" ? "maya" : st === "milestone" ? "anthony" : null;
    let bed = "";
    if (c.hedge === "A") {
      const ids = (st === "first" ? SMALL.slice(0, 4) : peopleOf(c).filter((p) => p[3] !== "remembered")).slice(0, 14).map((p) => p[0]);
      bed = `<div class="bed"><div class="hedge" aria-hidden="true">${ids.map((id) => `<span class="h ${id === lit ? "lit" : ""}">${sprig(id, 26, C.ink)}</span>`).join("")}</div><div class="soil"></div></div>`;
    } else if (c.hedge === "B") {
      bed = `<div class="bed horizon">${grass(393, 48, 33, C.ink, { opacity: .28, gap: 8 })}<div class="soil"></div></div>`;
    }
    const kept = c.kept ? `<div class="small ${arrive()}" style="display:flex;justify-content:space-between;padding:0 6px 8px"><span>Kept: ${c.kept}</span><span class="ochre">Undo</span></div>` : "";
    return `<div class="g hedge${c.hedge}"><div class="sky" style="--skyTint:${tint(c)}"></div><div class="light" data-light></div>
      <div class="sundial">${skyArc(150, c.hour, C.ink, { height: 62, paper: "var(--paper)" })}</div>
      <div class="content">${head}${body}</div>${bed}</div>${dock("today", kept)}`;
  }

  // ======================= People =======================
  function peopleHTML(c) {
    const all = peopleOf(c);
    const q = (c.query || "").trim().toLowerCase();
    const shown = q ? all.filter((p) => p[1].toLowerCase().includes(q)) : all;
    const mark = (name) => { if (!q) return name; const i = name.toLowerCase().indexOf(q); return i < 0 ? name : `${name.slice(0, i)}<b>${name.slice(i, i + q.length)}</b>${name.slice(i + q.length)}`; };
    let rows = "", last = "";
    for (const [id, name, line, state] of shown) {
      const L = name[0].toUpperCase();
      if (!q && L !== last) { rows += `<div class="letter ${last ? "" : "first"}">${L}</div>`; last = L; }
      const rem = state === "remembered";
      rows += `<div class="row" data-act="person" data-person="${id}"><span class="rs">${sprig(id, 24, rem ? C.quiet : C.ink, { fine: rem })}</span><div><div class="nm">${mark(name)}</div>${rem ? `<div class="lv rem">Remembered</div>` : line ? `<div class="lv">${line}</div>` : ""}</div></div>`;
    }
    if (!shown.length) rows = `<div class="empty"><div class="moment">No one called “${esc(c.query)}”.</div><div style="margin-top:14px"><span class="pill quiet">Add ${esc(c.query)}</span></div></div>`;
    const letters = [...new Set(all.map((p) => p[1][0].toUpperCase()))];
    const index = !q && all.length > 30 ? `<div class="index" aria-label="Jump to a letter">${letters.map((L) => `<span class="${L === "A" ? "on" : ""}">${L}</span>`).join("")}</div>` : "";
    const unified = c.nav === "two";
    const field = q ? `<span class="q">${esc(c.query)}</span><span class="caret"></span>` : unified ? "Search or ask" : "Search your people";
    return `<div class="g pp"><div class="sky" style="--skyTint:${tint(c)};height:200px"></div>
      <div class="content"><div class="hdr"><div class="tell">${icon.search(C.quiet)}${field}</div><span class="iconbtn">${icon.plus(C.ink)}</span><span class="iconbtn">${icon.gear(C.quiet)}</span></div>
      <div class="rows">${rows}</div></div>${index}</div>${dock("people")}`;
  }

  // ======================= a person's page =======================
  const provLine = (p) => `<div class="provrow"><span class="prov">${p}</span></div>`;
  function personHTML(c) {
    const P = PROFILES[c.person] || PROFILES.priya;
    const rem = P.kind === "remembered";
    const inkFor = rem ? C.quiet : C.ink;
    const sec = (label, items, cls = "") => items.length ? `<div class="sec"><div class="label ${cls}">${label}</div>${items.map(([t, p]) => `<div class="line">${t}</div>${provLine(p)}`).join("")}</div>` : "";
    const knows = `<div class="lnk">What Kinship knows about ${P.name} →</div>${rem || P.kind === "empty" ? "" : `<div class="lnk" style="margin-top:8px" data-act="asked" data-q="What's ${P.name} into?">Ask about ${P.name} →</div>`}`;
    const acts = rem ? "" : `<div class="acts"><span class="pill">${icon.message("var(--onInk)")}Message</span><span class="pill quiet">${icon.phone(C.ink)}Call</span><span class="pill quiet">${icon.pen(C.ink)}Tell</span></div>`;
    const back = `<div class="back"><span class="iconbtn" data-act="go" data-to="people">${icon.back(C.ink)}</span><span class="small">Edit</span></div>`;
    const sub = [P.label, P.place].filter(Boolean).join(" · ");
    if (c.treatment === "p2") {
      // P2 · the journal: every line in time, in one column with a dated margin
      const entries = [];
      for (const [t, p] of P.coming) entries.push({ d: p.replace("You told Kinship · ", ""), t, p, k: "coming" });
      for (const [t, p] of P.said) entries.push({ d: p.replace("You told Kinship · ", ""), t, p, k: "said" });
      for (const [t, p] of P.lately) entries.push({ d: p.replace("You told Kinship · ", ""), t, p, k: "lately" });
      for (const b of P.between) entries.push({ d: b.prov.replace("You told Kinship · ", ""), t: b.text, p: b.prov, k: "between", quote: b.quote });
      for (const [l, a] of P.trail) entries.push({ d: l.split(" · ")[1], t: l.split(" · ")[0], p: a, k: "trail" });
      const rows = entries.map((e) => `<div class="entry"><div class="dm ${e.k === "said" ? "ochre" : ""}">${e.d}</div><div class="bd">${e.k === "between" ? `<span class="mark">❧</span>` : ""}${e.k === "trail" ? `<div class="small">${e.t}</div>${e.p ? `<div class="line">${e.p}</div>` : ""}` : `<span class="line">${e.t}</span>${e.quote ? `<div class="quote" style="margin-top:6px">${e.quote}</div>` : ""}${provLine(e.p)}`}</div></div>`).join("");
      return `<div class="g pg p2"><div class="sky" style="--skyTint:${tint(c)};height:220px"></div><div class="scrollarea">${back}
        <div class="head">${sprig(c.person, 40, inkFor, { fine: rem })}<div><div class="name" style="font-size:calc(34px * var(--ts));line-height:calc(38px * var(--ts))">${P.name}</div>${sub ? `<div class="italic" style="margin-top:2px">${sub}</div>` : ""}${rem ? `<div class="italic" style="margin-top:2px">Remembered</div>` : ""}</div></div>
        <div class="rule"></div>${rows || `<div class="body" style="margin-top:18px">What you tell Kinship about ${P.name} will be here.</div>`}${entries.length ? knows : ""}</div>${acts}</div>`;
    }
    // P1 · the portrait (recommended)
    const now = P.now ? `<div class="now"><div class="kicker">${P.now.kicker}</div><div class="nowline">${P.now.text}</div>${provLine(P.now.prov)}</div>` : "";
    const latelyRest = P.now && P.now.from === "lately" ? P.lately.slice(1) : P.lately;
    const comingRest = P.now && P.now.from === "coming" ? P.coming.slice(1) : P.coming;
    const shared = P.between.length || P.trail.length ? `<div class="shared"><div class="label"><span class="orn">❧</span>Between you</div>
        ${P.between.map((b) => `<div class="line" style="margin-top:8px">${b.text}</div>${b.quote ? `<span class="quote" style="margin-top:6px">${b.quote}</span><div class="small" style="margin-top:4px">In your words</div>` : ""}${provLine(b.prov)}`).join("")}
        ${P.trail.length ? `<div class="trail">${P.trail.map(([l, a]) => `<div class="small" style="margin-top:8px">${l}</div>${a ? `<div class="body ink" style="font-family:var(--serif);font-size:calc(17px * var(--ts))">${a}</div>` : ""}`).join("")}</div>` : ""}</div>` : "";
    const empty = P.kind === "empty" ? `<div class="body" style="margin-top:22px">What you tell Kinship about ${P.name} will be here: what's going on with them, what's coming up, what you said you'd do.</div><div style="margin-top:14px"><span class="pill quiet">${icon.pen(C.ink)}Tell Kinship about ${P.name}</span></div>` : "";
    return `<div class="g pg p1"><div class="sky" style="--skyTint:${tint(c)};height:260px"></div><div class="scrollarea">${back}
      <div class="head"><div><div class="name">${P.name}</div>${sub ? `<div class="italic" style="margin-top:6px">${sub}</div>` : ""}${rem ? `<div class="remembered">Remembered</div>` : ""}</div><div class="headsprig">${sprig(c.person, 78, inkFor, { wash: .09, fine: rem })}</div></div>
      <div class="ground">${grass(393, 40, 9, inkFor, { opacity: rem ? .18 : .3 })}<div class="soil"></div></div>
      ${now}${empty}
      ${sec("Lately", latelyRest)}${sec("Coming up", comingRest)}${sec("You said you'd", P.said, "ochre")}${shared}
      ${P.kind === "empty" ? "" : knows}</div>${acts}</div>`;
  }

  // ======================= Ask (Alpha scope; the shape only) =======================
  const ANSWERS = {
    "Who do I know in Alameda?": { lines: [["Susan lives in Alameda, California", "From your notes · Oct 9 · one edited by you", "susan"], ["Ben's mom lives in Alameda", "You told Kinship · Sep 2", "ben"]] },
    "What's Priya into?": { lines: [["Priya is reading Piranesi", "You told Kinship · Sep 29", "priya"], ["Priya hates cilantro", "You told Kinship · Mar 3", "priya"], ["Priya started pottery", "You told Kinship · Feb 11", "priya"]], scope: "priya" },
    "What gift did Priya mention?": { lines: [], scope: "priya" },
  };
  function answerSheet(c) {
    const q = c.ask || "Who do I know in Alameda?";
    const a = ANSWERS[q] || { lines: [] };
    const scope = a.scope ? PROFILES[a.scope]?.name : null;
    const lines = a.lines.length ? a.lines.map(([t, p, id]) => `<div class="ans" data-act="person" data-person="${id}"><span class="rs">${sprig(id, 18, C.ink)}</span><div><div class="line">${t}</div><div class="provrow"><span class="prov">${p}</span></div></div></div>`).join("")
      : `<div class="body" style="margin-top:14px">Nothing kept about that${scope ? ` for ${scope}` : ""}. Kinship answers only from what you've told it.</div><div style="margin-top:12px"><span class="pill quiet">${icon.pen(C.ink)}Tell Kinship${scope ? ` about ${scope}` : ""}</span></div>`;
    return `<div class="scrim" data-act="close"></div><div class="sheet" role="dialog" aria-label="${esc(q)}"><div class="grab"></div>
      <div class="label">${scope ? `Asked about ${scope}` : "You asked"}</div><div class="heading" style="margin-top:6px">${q}</div>
      <div style="margin-top:8px">${lines}</div>
      ${a.lines.length ? `<div class="small" style="margin-top:14px">From what you've told Kinship, with each line's source. Nothing is kept from a question.</div>` : ""}</div>`;
  }
  // Alternative 2's dedicated Ask destination (a field and the last answer; never a chat)
  function askHTML(c) {
    return `<div class="g pp"><div class="sky" style="--skyTint:${tint(c)};height:200px"></div>
      <div class="content"><div class="hdr"><div class="tell">${icon.search(C.quiet)}Ask Kinship…</div></div>
      <div class="body" style="margin-top:26px">Ask about the people in your life, from what you've told Kinship. Every answer shows its source.</div>
      <div class="label" style="margin-top:26px">For example</div>
      <div class="line" style="margin-top:8px" data-act="asked" data-q="Who do I know in Alameda?">Who do I know in Alameda?</div>
      <div class="line" style="margin-top:8px" data-act="asked" data-q="What's Priya into?">What's Priya into?</div></div></div>${dock("ask")}`;
  }
  // a lock screen with one private push: the Moment Today already chose (CC-25 minimal push)
  function lockHTML(c) {
    const m = MOMENTS[c.state] || MOMENTS.moment;
    return `<div class="g lock"><div class="sky" style="--skyTint:${tint(c)};height:100%"></div>
      <div class="content" style="bottom:0"><div class="lock-time">9:41</div><div class="lock-date">${m.date || "Monday, Oct 12"}</div>
      <div class="notif" data-act="opennotif"><div class="notif-h"><span class="notif-ic">${sprig(m.person, 12, "var(--onInk)")}</span><span class="small" style="color:var(--inkQuiet)">KINSHIP · now</span></div>
        <div class="body ink" style="font-family:var(--serif);font-size:calc(19px * var(--ts));line-height:calc(25px * var(--ts))">${m.statement}</div>
        <div class="small" style="margin-top:4px">${m.ctx || m.prov}</div></div></div></div>`;
  }

  // ======================= sheets =======================
  function sheetHTML(c) {
    const m = MOMENTS[c.state] || MOMENTS[c.base] || MOMENTS.moment;
    if (c.sheet === "detail") {
      return `<div class="scrim" data-act="close"></div><div class="sheet" role="dialog" aria-label="${esc(m.statement)}"><div class="grab"></div>
        <div class="label">${m.name}</div><div class="moment" style="margin-top:8px">${m.ctx || m.statement}</div>
        ${m.para ? `<div class="para" style="font-family:var(--serif);font-style:italic;color:var(--ink);margin-top:4px">${m.para}</div>` : ""}
        <div class="body" style="margin-top:14px">${m.why}</div><div class="small" style="margin-top:4px">${m.when}</div>
        ${m.quote ? `<div class="src"><div class="label">From your note</div><div class="quote" style="margin-top:6px;font-size:calc(17px * var(--ts));line-height:calc(24px * var(--ts))">${m.quote}</div><div style="margin-top:6px"><span class="prov">${m.prov}</span></div></div>` : `<div style="margin-top:12px"><span class="prov">${m.prov}</span></div>`}
        <div class="rowb"><span class="pill" data-act="handoff">${icon.message("var(--onInk)")}Message</span><span class="pill quiet">${icon.phone(C.ink)}Call</span></div>
        <div style="margin-top:12px"><span class="pill quiet" data-act="viewperson">View ${m.name}</span></div></div>`;
    }
    if (c.sheet === "answer") return answerSheet(c);
    if (c.sheet === "handoff") {
      return `<div class="scrim" data-act="close"></div><div class="sheet" role="dialog" aria-label="${esc(m.handoff)}"><div class="grab"></div>
        <div class="heading">${m.handoff}</div>
        ${m.mention.length ? `<div style="margin-top:18px"><div class="label">You could mention</div>${m.mention.map((x) => `<div class="body" style="margin-top:6px">•&nbsp; ${x}</div>`).join("")}</div>` : ""}
        <div class="rowb"><span class="pill" data-act="open">${m.plain ? "Call" : "Open Messages"}</span><span class="pill quiet">${m.plain ? "Open Messages" : "Call"}</span></div>
        <div style="display:flex;gap:8px;margin-top:8px"><span class="pill small quiet">FaceTime</span><span class="pill small quiet">WhatsApp</span></div>
        <div class="small" style="text-align:center;margin-top:16px">When you come back: “${m.ask}”</div></div>`;
    }
    return "";
  }

  // ======================= render =======================
  function renderPhone(cfg) {
    const c = Object.assign({}, defaults, cfg);
    NAV = c.nav || "two";
    const inner = c.screen === "today" ? todayHTML(c) : c.screen === "people" ? peopleHTML(c) : c.screen === "ask" ? askHTML(c) : c.screen === "lock" ? lockHTML(c) : personHTML(c);
    const cls = [night(c) ? "night" : "", c.reduce ? "reduce" : "", c.large ? "large" : "", c.se ? "se" : ""].join(" ");
    return `<div class="phone ${cls}">${status()}${inner}${sheetHTML(c)}${c.toast ? `<div class="toast ${arrive()}">${c.toast}</div>` : ""}<div class="home"></div></div>`;
  }

  // ======================= mount (interactive) =======================
  function mount(el, cfg, hooks = {}) {
    const S = Object.assign({}, defaults, cfg);
    const note = (t) => hooks.onNote?.(t);
    function render(opts = {}) {
      el.innerHTML = renderPhone(S);
      if (S.sheet) requestAnimationFrame(() => requestAnimationFrame(() => { el.querySelector(".scrim")?.classList.add("on"); el.querySelector(".sheet")?.classList.add("on"); if (S.sheet) { el.querySelectorAll(".scrim, .sheet").forEach((n) => n.classList.add("on")); } }));
      if (opts.light) requestAnimationFrame(() => el.querySelector("[data-light]")?.classList.add("on"));
      hooks.onRender?.(S);
    }
    const go = (state, opts) => { S.state = state; S.sheet = null; S.phase = null; render(opts); };
    const closeSheet = (after) => { el.querySelector(".sheet")?.classList.remove("on"); el.querySelector(".scrim")?.classList.remove("on"); setTimeout(() => { S.sheet = null; after ? after() : render(); }, S.reduce ? 150 : 240); };
    const toast = (text, ms = 1800) => { S.toast = text; render(); setTimeout(() => { S.toast = null; render(); }, ms); };
    const dur = (ms) => (S.reduce ? 150 : ms);

    // the three return motions, after Yes
    function yes() {
      const m = MOMENTS[S.state] || MOMENTS[S.base] || MOMENTS.moment;
      if (S.motion === "original") {
        el.querySelector("[data-ret]")?.classList.add("pressing");
        el.querySelector(".hedge .lit")?.classList.add("unlit");
        note("Original (round 1): the success haptic; the block presses into the paper (600 ms); light passes over the garden (900 ms); the root mark goes out. Then the question.");
        setTimeout(() => go("after", { light: true }), dur(600));
      } else if (S.motion === "settle") {
        const r = el.querySelector("[data-ret]"); r?.classList.add("settled");
        el.querySelector("[data-pills]")?.classList.add("fading"); el.querySelector("[data-again]")?.classList.add("fading");
        note("Settle: the success haptic; the question settles 4 pt and quietens (320 ms) while the pills fade; the memory prompt arrives below (320 ms). No light, nothing removed until the prompt is answered.");
        setTimeout(() => go("after"), dur(400));
      } else {
        const st = el.querySelector("[data-st]");
        el.querySelectorAll("[data-body], [data-about], [data-pills], [data-again], .ret .kicker").forEach((n) => n.classList.add("fading"));
        if (st) { st.style.opacity = "0"; setTimeout(() => { st.textContent = m.reached; st.style.opacity = "1"; }, dur(240)); }
        note("Resolve (recommended): the success haptic; the question becomes its answer in place (“Did you ask Ben how it went?” → “You asked Ben how it went.”, a 240 ms cross-fade); the rest fades; the memory prompt arrives below. Nothing moves but words.");
        setTimeout(() => go("after"), dur(520));
      }
    }

    el.addEventListener("click", (e) => {
      const t = e.target.closest("[data-act]"); if (!t) return;
      const a = t.dataset.act;
      if (a === "detail") { S.sheet = "detail"; render(); }
      else if (a === "handoff") { if (S.sheet) closeSheet(() => { S.sheet = "handoff"; render(); }); else { S.sheet = "handoff"; render(); } }
      else if (a === "close") closeSheet();
      else if (a === "open") closeSheet(() => { S.base = S.state; toast("Messages opens. Kinship sends nothing. (In the app the question waits until you come back, from 10 minutes on; the moment itself is no longer shown while the hand-off is open.)", 2800); setTimeout(() => go("return"), 2400); });
      else if (a === "notnow") { el.querySelector("[data-plate]")?.classList.add("leaving"); el.querySelector(".actions")?.classList.add("leaving"); note("Not now: the letter slides aside (320 ms); the quiet day arrives. No haptic proposed any more."); setTimeout(() => go("quiet"), dur(320)); }
      else if (a === "yes") yes();
      else if (a === "notyet") { go(S.base || "moment"); note("Not yet: nothing is recorded; the reason speaks again as the moment while its window lasts (production rule)."); }
      else if (a === "tell") { S.kept = "Ben ran 3:52. Wants to do Berlin next."; go("quiet"); note("Tell Kinship opens the dock about Ben; shown as if a note was told and kept (the Kept line, with Undo)."); setTimeout(() => { S.kept = null; render(); }, 5000); }
      else if (a === "nothing") { go("quiet"); note("Nothing today: nothing changes; the conversation still counted."); }
      else if (a === "gotit") go("quiet");
      else if (a === "person") { S.screen = "person"; S.person = t.dataset.person in PROFILES ? t.dataset.person : "sam-diaz"; render(); }
      else if (a === "go") { S.screen = t.dataset.to; S.sheet = null; render(); }
      else if (a === "viewperson") closeSheet(() => { S.screen = "person"; S.person = (MOMENTS[S.state] || MOMENTS.moment).person; render(); });
      else if (a === "asked") { S.ask = t.dataset.q; S.sheet = "answer"; render(); note("Ask: a grounded answer from kept memory, every line with its source; tap a line to land on it. Nothing is written by a question."); }
      else if (a === "opennotif") { S.screen = "today"; S.sheet = "detail"; render(); note("The push opens Today at the Moment it already chose, with its detail: why now, the source, Message / Call."); }
      else if (a === "week") toast(`“${t.dataset.text}” opens its detail (the same sheet as the moment).`);
      else if (a === "more") toast("“and 2 more” opens in place; nothing in the next week is hidden for good.");
    });
    el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { const t = e.target.closest("[data-act]"); if (t) { e.preventDefault(); t.click(); } } });
    render();
    return { S, render, go, set(patch) { Object.assign(S, patch); S.sheet = null; S.phase = null; render(); }, yes };
  }

  window.K2 = { renderPhone, mount, MOMENTS, PROFILES, SMALL, LARGE, sprig };
})();
