// The brand-directions engine (19 Oct 2026). Exploratory, unapproved.
// One renderer for Today, People, a person's page, the first Tell and every sheet; six directions
// supply only their marks, occasion art, ambient room and CSS. Product behaviour (one Moment, the
// hand-off that never counts, the return check, sources on every line, no counts, no scores) is the
// same in every direction, because the directions are visual, not behavioural.
(function () {
  const FX = window.FX, ART = window.ART, SP = window.SPRIGS2 || {}, K = window.K || {};
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const f = (n) => (Math.round(n * 10) / 10).toString();

  // The Garden's sprig, from round 2's generator output (identity-only).
  function sprig(id, width, color, opts = {}) {
    const d = SP[id]; if (!d) return "";
    const VW = 60, VH = 110, height = (width * VH) / VW, stroke = Math.min(1.2, Math.max(0.7, width / 50)) * (opts.fine ? 0.85 : 1);
    return `<svg class="mark sprig" width="${width}" height="${f(height)}" viewBox="0 0 ${VW} ${VH}" aria-hidden="true"><path d="${d.wash}" fill="${color}" fill-opacity="${opts.wash ?? 0.07}"/><path d="${d.line}" fill="none" stroke="${color}" stroke-width="${f((stroke * VW) / width)}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
  const GARDEN_ART = { race: "laurel", birthday: "candle", wedding: "rings", promise: "bow" };

  // ---------------------------------------------------------------- the six directions
  const THEMES = {
    garden: { name: "Garden Letter", letter: "A",
      mark: (id, size, name, night, place) => sprig(id, place === "page" ? 70 : place === "row" ? 24 : 30, "currentColor"),
      art: (kind, size) => (GARDEN_ART[kind] && K.ill ? K.ill[GARDEN_ART[kind]](size, "currentColor") : ""),
      room: (S, kind) => `<div class="sky"></div>${K.skyArc && !["people", "person", "setup"].includes(kind) ? `<div class="sundial">${K.skyArc(220, S.hour, "currentColor", { height: 90, paper: S.night ? "#121513" : "#EFEEE9" })}</div>` : ""}`,
      ground: (S, person, tall) => `<div class="meadow ${tall ? "tall" : ""}">${K.grass ? K.grass(w(S), tall ? 80 : 56, tall ? 21 : 4, "currentColor", { opacity: tall ? 0.3 : 0.38, gap: tall ? 7 : 9 }) : ""}${person ? `<div class="stand">${sprig(person, 30, "currentColor", { wash: 0.09 })}</div>` : ""}</div>` },
    bloom: { name: "Bloom", letter: "B",
      mark: (id, size) => ART.bloomMark(id, size),
      art: (kind, size) => ART.bloomArt(kind, size),
      room: (S) => "",
      extras: (S, m) => (m.celebrate && !S.reduce ? ART.bloomPetals(w(S), 300, 5) : m.celebrate ? ART.bloomPetals(w(S), 300, 5) : "") },
    keepsake: { name: "Keepsake", letter: "C",
      mark: (id, size, name) => ART.stickerMark(id, size, name),
      art: (kind, size, night) => ART.doodle(kind, size, night ? "#F3EBDD" : undefined),
      room: (S) => "",
      extras: (S, m) => (m.plain ? "" : `<div class="tape tl">${ART.tape(64, 18, "#BFE3D0", 2)}</div><div class="tape tr">${ART.tape(64, 18, "#FBE8A6", 9)}</div>`) },
    orbit: { name: "Orbit", letter: "D",
      mark: (id, size, name, night) => ART.orbitMark(id, size, night),
      art: (kind, size, night) => ART.orbitArt(kind, size, night),
      room: (S, kind) => { const col = { race: "#6E5CFF", birthday: "#FF5C7A", wedding: "#FFB547", promise: "#34E0D0", quiet: "#34E0D0", first: "#6E5CFF", people: "#6E5CFF", person: "#FF5C7A", setup: "#6E5CFF" }[kind]; return col ? ART.orbitDisc(w(S), 360, col, w(S) - 40, 40, 170) : ""; } },
    postmark: { name: "Postmark", letter: "E",
      mark: (id, size) => ART.stampMark(id, size),
      art: (kind, size) => "",
      poster: (kind, W) => ART.postArt(kind, W, 118),
      room: (S) => "",
      extras: (S, m) => `<div class="pm">${ART.postmark(m.when ? m.when.replace(/^\w+, /, "").toUpperCase() : "TODAY", 62, "currentColor")}</div>` },
    woven: { name: "Woven", letter: "F",
      mark: (id, size, name, night, place) => ART.bandMark(id, place === "page" ? 320 : place === "row" ? 56 : 120, place === "page" ? 18 : place === "row" ? 10 : 12, { knot: place === "page" }),
      art: (kind, size) => ART.charms(kind, size),
      room: (S) => "" },
  };
  const w = (S) => (S.se ? 375 : 393);

  // ---------------------------------------------------------------- state
  const defaults = { theme: "garden", screen: "today", state: "moment", base: "moment", person: "priya", people: "small", query: "", sheet: null, appearance: "light", hour: 9, reduce: false, large: false, se: false, phase: null, kept: null, toast: null, note: null, label: true, voice: null };
  const greeting = (h) => (h < 12 ? "Good morning, Nico." : h < 18 ? "Good afternoon, Nico." : "Good evening, Nico.");
  const seasonLine = (h) => `Mid-October. ${h < 9 ? "Early." : h < 12 ? "A quiet morning." : h < 17 ? "A quiet afternoon." : "Evening."}`;
  const arrive = (n = 0) => `arrive${n ? ` d${n}` : ""}`;

  const icon = K.icon || {};
  const ic = (n, c = "currentColor", s = 16) => (icon[n] ? icon[n](c, s) : "");

  // ---------------------------------------------------------------- pieces
  function status() { return `<div class="status"><span>9:41</span><span class="island"></span><span class="sig"><svg width="18" height="12" viewBox="0 0 18 12" aria-hidden="true"><rect x="0" y="8" width="3" height="4" rx="1" fill="currentColor"/><rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="currentColor"/><rect x="10" y="3" width="3" height="9" rx="1" fill="currentColor"/><rect x="15" y="0" width="3" height="12" rx="1" fill="currentColor"/></svg><svg width="16" height="12" viewBox="0 0 16 12" aria-hidden="true"><path d="M8 11a1.4 1.4 0 1 0 0-.01M4.2 7.4a5.4 5.4 0 0 1 7.6 0M1.2 4.4a9.6 9.6 0 0 1 13.6 0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg><svg width="27" height="13" viewBox="0 0 27 13" aria-hidden="true"><rect x=".5" y=".5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" stroke-opacity=".4"/><rect x="2" y="2" width="18" height="9" rx="2" fill="currentColor"/><path d="M25 4.5v4a2 2 0 0 0 0-4z" fill="currentColor" fill-opacity=".4"/></svg></span></div>`; }
  function dock(S, current) { return `<div class="dock"><div class="tell" data-act="tellfocus">Tell Kinship something…</div><div class="bar"><span class="${current === "today" ? "on" : ""}" data-act="go" data-to="today">Today</span><span class="${current === "people" ? "on" : ""}" data-act="go" data-to="people">People</span></div><div class="home"></div></div>`; }
  const prov = (t, cls = "") => `<div class="prov ${cls}"><i class="dot"></i>${esc(t)}</div>`;
  const pill = (label, act, cls = "primary", extra = "") => `<button class="pill ${cls}" data-act="${act}" ${extra}>${label}</button>`;

  // ---------------------------------------------------------------- Today
  function plate(S, T, m) {
    const night = S.night, kind = m.kind;
    const art = m.plain ? "" : T.art(kind, S.theme === "woven" ? 110 : S.theme === "keepsake" ? 110 : S.theme === "orbit" ? 112 : 148, night);
    const poster = T.poster && !m.plain ? `<div class="poster">${T.poster(kind, w(S) - 52)}</div>` : "";
    const extras = T.extras ? T.extras(S, m) : "";
    return `<div class="plate kind-${kind} ${m.celebrate ? "celebrate" : ""} ${m.plain ? "plain" : ""}" data-plate>
      ${extras}${poster}
      <div class="words" data-act="detail" role="button" tabindex="0">
        ${art ? `<div class="art">${art}</div>` : ""}
        ${m.kicker ? `<div class="kicker">${esc(m.kicker)}</div>` : ""}
        <div class="statement">${esc(m.statement)}</div>
        ${m.ctx ? `<div class="ctx">${esc(m.ctx)}</div>` : ""}
        ${m.para ? `<div class="para">${esc(m.para)}</div>` : ""}
        ${prov(m.prov)}
        <div class="who"><span class="whomark">${T.mark(m.person, 36, m.name, night, "moment")}</span><span class="whoname">${esc(m.name)}</span></div>
      </div>
      ${T.ground ? T.ground(S, m.person, false) : ""}
    </div>
    <div class="actions ${arrive(1)}">${pill(`${ic("message")}${esc(m.primary)}`, "handoff")}<button class="notnow" data-act="notnow">Not now</button></div>`;
  }
  function week(items, opts = {}) {
    return `<div class="week"><div class="label ${arrive(2)}">${opts.title || "This week"}</div>${items.map((x) => `<div class="day ${arrive(2)}" data-act="week" data-text="${esc(x.text)}"><span class="dn ${x.ochre ? "ochre" : ""}"><b>${x.dn}</b>${x.d}</span><span class="line">${esc(x.text)}</span></div>`).join("")}${opts.more ? `<div class="more small ${arrive(3)}">and ${opts.more} more</div>` : ""}</div>`;
  }
  function returnBlock(S, T, m) {
    const resolved = S.phase === "resolved", night = S.night;
    return `<div class="ret ${arrive()}" data-ret aria-live="polite">
      <div class="kicker ${resolved ? "fading" : ""}">When you're back</div>
      <div class="statement" data-st>${esc(resolved ? m.reached : m.ask)}</div>
      <div class="small ${resolved ? "fading" : ""}" style="margin-top:8px">You opened Messages earlier.</div>
      <div class="who ${resolved ? "nod" : ""}"><span class="whomark">${T.mark(m.person, 36, m.name, night, "moment")}</span><span class="whoname">${esc(m.name)}</span></div>
      <div class="about ${resolved ? "fading" : ""}" data-act="detail"><div class="line">${esc(m.statement)}</div><div class="small">${esc(m.ctx || "")}</div>${prov(m.prov)}</div>
      <div class="actions ${resolved ? "fading" : ""}">${pill("Yes", "yes", "primary small")}${pill("Not yet", "notyet", "quiet small")}</div>
      <div class="again ${resolved ? "fading" : ""}" data-act="handoff">Open Messages again</div>
    </div>`;
  }
  function promptBlock(S, m) {
    return `<div class="prompt ${arrive()}"><div class="moment">${esc(m.after || "Anything worth remembering?")}</div><div class="actions">${pill(`${ic("pen")}Tell Kinship`, "tellfocus", "primary small")}${pill("Nothing today", "nothing", "quiet small")}</div></div>`;
  }
  function today(S, T) {
    const st = S.state, m = FX.MOMENTS[st] || FX.MOMENTS[S.base] || FX.MOMENTS.moment;
    const wk = FX.WEEK[st] || FX.WEEK[S.base] || FX.WEEK.moment;
    const date = st === "quiet" || st === "first" ? "Monday, Oct 12" : m.date;
    let body = "";
    if (FX.MOMENTS[st]) body = plate(S, T, m) + week(wk);
    else if (st === "quiet") body = `<div class="plate quiet"><div class="kicker ${arrive()}">${seasonLine(S.hour)}</div><div class="statement ${arrive()}">Nothing needs you today.</div>${T.ground ? T.ground(S, null, true) : `<div class="quietart ${arrive(1)}">${quietArt(S)}</div>`}</div>` + week(FX.WEEK.quiet);
    else if (st === "first") body = `<div class="plate first"><div class="statement ${arrive()}">This is where Kinship brings things back.</div><div class="body ${arrive(1)}">When something matters, it's here, with where it came from.</div>
        <div class="example ${arrive(2)}"><span class="tag small">An example</span><div class="kicker">Tomorrow</div><div class="st">Ben runs Chicago tomorrow.</div>${prov("You told Kinship · Oct 8")}<div class="row"><span class="pill primary ghosted">${ic("message")}Wish Ben luck</span></div></div>
        <div class="actions ${arrive(3)}">${pill(`${ic("pen")}Tell Kinship one thing`, "tellfocus")}</div></div>`;
    else if (st === "return") body = returnBlock(S, T, m) + (S.phase === "resolved" && m.after ? promptBlock(S, m) : "") + week(wk);
    else if (st === "after") body = `<div class="ret ${arrive()}"><div class="statement">${esc(m.reached)}</div></div>` + promptBlock(S, m) + week(wk);
    const roomKind = FX.MOMENTS[st] ? (m.plain ? "none" : m.kind) : st;
    return `<div class="room">${T.room(S, roomKind)}</div><div class="content today-screen">${status()}<div class="top"><div class="label date">${date.toUpperCase()}</div><div class="greeting">${greeting(S.hour)}</div></div>${body}</div>${dock(S, "today")}`;
  }
  // The quiet day's picture, per direction: a place that is still a place when nothing needs you.
  function quietArt(S) {
    const t = S.theme, W = w(S) - 52;
    if (t === "bloom") return `<svg width="${W}" height="120" viewBox="0 0 ${W} 120" aria-hidden="true">${[0.1, 0.3, 0.5, 0.7, 0.9].map((x, i) => `<g transform="translate(${f(W * x)} 70)">${ART.bloomMark(["quiet-1", "quiet-2", "quiet-3", "quiet-4", "quiet-5"][i], 56).replace(/<svg[^>]*>|<\/svg>/g, "").replace(/<g fill/, `<g transform="translate(-28 -28)" fill`).replace(/<circle /, `<circle transform="translate(-28 -28)" `)}</g>`).join("")}<path d="M0 118h${W}" stroke="currentColor" stroke-width="2" stroke-opacity=".3"/></svg>`;
    if (t === "keepsake") return `<div class="quietcard">${ART.tape(70, 18, "#C9DDF2", 4)}<div class="caveat">Nothing pinned today.</div></div>`;
    if (t === "orbit") return `<svg width="${W}" height="120" viewBox="0 0 ${W} 120" aria-hidden="true"><g style="mix-blend-mode:${S.night ? "screen" : "multiply"}">${[0.2, 0.5, 0.8].map((x, i) => `<circle cx="${f(W * x)}" cy="60" r="44" fill="${ART.ORB.light[i + 1]}" fill-opacity=".35"/>`).join("")}</g></svg>`;
    if (t === "postmark") return `<div class="quietpost">${ART.postArt("race", W, 110).replace(/#2A6FB8/g, "#C9D5E6").replace(/#2E6B4F/g, "#B9CFC2").replace(/#E8B23A/g, "#F1DDA3").replace(/#F7F1E3/g, "#FBF7EE").replace(/#D7382D/g, "#E7B1AA")}<div class="small">No post today.</div></div>`;
    if (t === "woven") return `<div class="quietband">${ART.bandMark("kinship", W, 14, { knot: true })}</div>`;
    return "";
  }

  // ---------------------------------------------------------------- People
  function people(S, T) {
    const list = S.people === "large" ? FX.LARGE : FX.SMALL, q = S.query.trim().toLowerCase();
    const shown = q ? list.filter((p) => p[1].toLowerCase().includes(q)) : list;
    let rows = "", letter = "";
    for (const p of shown) {
      const L = p[1][0].toUpperCase();
      if (L !== letter && !q && list.length > 30) { letter = L; rows += `<div class="letter">${L}</div>`; }
      else if (L !== letter && !q) { letter = L; rows += `<div class="letter">${L}</div>`; }
      rows += `<div class="row ${p[3] === "remembered" ? "remembered" : ""}" data-act="person" data-person="${p[0]}"><span class="rm">${T.mark(p[0], 40, p[1], S.night, "row")}</span><span class="rt"><span class="name">${esc(p[1])}${p[3] === "remembered" ? ` <i class="rem">remembered</i>` : ""}</span>${p[2] ? `<span class="small sub">${esc(p[2])}</span>` : ""}</span></div>`;
    }
    if (!shown.length) rows = `<div class="empty"><div class="moment">No one called “${esc(S.query)}”.</div><div class="actions">${pill(`Add ${esc(S.query)}`, "add", "quiet small")}</div></div>`;
    const index = list.length > 30 && !q ? `<div class="index">${"ABCDEFGHIJKLMNOPRSTVWZ".split("").join("<br>")}</div>` : "";
    return `<div class="room">${T.room(S, "people")}</div><div class="content people-screen">${status()}<div class="hdr"><div class="search ${q ? "has" : ""}" data-act="search">${ic("search")}<span>${q ? esc(S.query) : "Search your people"}</span></div><span class="iconbtn" data-act="add">${ic("plus")}</span><span class="iconbtn" data-act="settings">${ic("gear")}</span></div><div class="rows">${rows}</div>${index}</div>${dock(S, "people")}`;
  }

  // ---------------------------------------------------------------- a person's page
  function person(S, T) {
    const P = FX.PROFILES[S.person] || FX.PROFILES.priya, night = S.night;
    const sec = (title, items, cls = "") => (items.length ? `<div class="sec ${cls}"><div class="label">${title}</div>${items.map(([t, p]) => `<div class="entry" data-act="correct" data-text="${esc(t)}"><div class="line">${esc(t)}</div>${prov(p)}</div>`).join("")}</div>` : "");
    const shared = P.between.length ? `<div class="sec shared"><div class="label"><span class="orn">❧</span>Between you</div>${P.between.map((b) => `<div class="entry"><div class="line">${esc(b.text)}</div>${b.quote ? `<div class="quote">${esc(b.quote)}</div><div class="small inwords">In your words</div>` : ""}${prov(b.prov)}</div>`).join("")}</div>` : "";
    const now = P.now ? `<div class="now ${arrive(1)}" data-act="correct" data-text="${esc(P.now.text)}"><div class="kicker">${esc(P.now.kicker)}</div><div class="nowline">${esc(P.now.text)}</div>${prov(P.now.prov)}</div>` : "";
    const empty = P.kind === "empty" ? `<div class="body" style="margin-top:22px">What you tell Kinship about ${esc(P.name)} will be here: what's going on with them, what's coming up, what you said you'd do.</div><div class="actions">${pill(`${ic("pen")}Tell Kinship about ${esc(P.name)}`, "tellfocus", "quiet")}</div>` : "";
    const remembered = P.kind === "remembered" ? `<div class="body" style="margin-top:14px">Kept, and never brought up on its own.</div>` : "";
    const more = P.kind === "rich" || P.kind === "shared" ? `<div class="links"><span class="link" data-act="knows">What Kinship knows about ${esc(P.name)} →</span><span class="link future" data-act="ask">Ask about ${esc(P.name)} → <i class="tagf">Alpha</i></span></div>` : "";
    const idea = P.kind === "rich" ? `<div class="idea" data-act="idea"><div class="label">An idea <i class="tagf">Future · CC-28</i></div><div class="line">${esc(FX.IDEA.text)}</div><div class="small">${esc(FX.IDEA.label)} · from “${esc(FX.IDEA.basis)}”</div></div>` : "";
    return `<div class="room">${T.room(S, "person")}</div><div class="content person-screen ${P.kind}">${status()}<div class="back"><span class="iconbtn" data-act="go" data-to="people">${ic("back")}</span><span class="edit">Edit</span></div>
      <div class="head ${arrive()}"><div class="pagemark">${T.mark(S.person, 96, P.name, night, "page")}</div><div class="name">${esc(P.name)}</div><div class="italic sub">${[P.label, P.place].filter(Boolean).join(" · ") || (P.kind === "remembered" ? "remembered" : "")}</div></div>
      ${T.ground ? T.ground(S, null, false).replace("meadow", "meadow pageground") : ""}
      ${now}${remembered}${empty}${sec("Lately", P.lately)}${sec("Coming up", P.coming)}${sec("You said you'd", P.said, "said")}${shared}${idea}${more}
    </div><div class="acts">${P.kind === "remembered" ? pill(`${ic("pen")}Tell`, "tellfocus", "quiet") : `${pill(`${ic("message")}Message`, "handoff")}${pill(`${ic("phone")}Call`, "handoff", "quiet")}${pill(`${ic("pen")}Tell`, "tellfocus", "quiet")}`}</div>`;
  }

  // ---------------------------------------------------------------- Scenario A: the first Tell (PROPOSED, PR #52 concept B)
  function setup(S, T) {
    return `<div class="room">${T.room(S, "setup")}</div><div class="content setup-screen">${status()}
      <div class="label step">Setting up · 4 of 4</div>
      <div class="statement ${arrive()}">What's going on in Maya's life lately?</div>
      <div class="body ${arrive(1)}">Say it the way you'd tell a friend. A few sentences are better than one; Kinship sorts out what matters. Type it, or use the mic on your keyboard.</div>
      <div class="field tall ${arrive(2)}"><span class="ph">Something about Maya…</span></div>
      <div class="eg ${arrive(2)}"><span class="small">Like</span><div class="quote">She just started at a new clinic and is nervous about the night shifts. Her birthday's coming up and she wants to do a hike.</div></div>
      <div class="someone ${arrive(3)}" data-act="toast" data-text="Switches the person without ranking anyone.">${T.mark("maya", 28, "Maya", S.night, "row")} Someone else ▾</div>
      <div class="actions ${arrive(3)}">${pill("Keep it", "longtell")}<button class="notnow" data-act="toast" data-text="Skip is always offered; nothing is required.">Skip for now</button></div>
    </div>`;
  }

  // ---------------------------------------------------------------- sheets
  function sheet(S, T) {
    const m = FX.MOMENTS[S.state] || FX.MOMENTS[S.base] || FX.MOMENTS.moment, P = FX.PROFILES[S.person] || FX.PROFILES.priya, night = S.night;
    const H = (t) => `<div class="heading">${t}</div>`;
    let body = "";
    switch (S.sheet) {
      case "detail": body = `<div class="label">Why this is here</div>${H(esc(m.statement))}<div class="body">${esc(m.why)} ${m.ctx ? esc(m.ctx) + "." : ""}</div>${m.quote ? `<div class="label" style="margin-top:18px">From your note</div><div class="quote">${esc(m.quote)}</div>` : ""}${prov(m.prov)}<div class="rowb">${pill("Edit", "correct", "quiet small")}${pill("Not this", "close", "quiet small")}${pill("Close", "close", "primary small")}</div>`; break;
      case "handoff": body = `${H(esc(m.handoff))}${m.mention.length ? `<div class="label" style="margin-top:14px">You could mention</div>${m.mention.map((t) => `<div class="line mention">${esc(t)}</div>`).join("")}` : ""}<div class="rowb">${pill(`${ic("message", "var(--onInk)")}Open Messages`, "open")}${pill(`${ic("phone")}Call`, "open", "quiet")}</div><div class="small" style="margin-top:14px">Kinship opens the app and sends nothing. It can't see what you do there.</div>`; break;
      case "correct": body = `<div class="label">Correct this</div><div class="field"><span>${esc(S.text || P.now?.text || m.statement)}</span></div>${prov("You told Kinship · Oct 8 · edits are kept as yours")}<div class="rowb">${pill("Save", "close")}${pill("Not this", "close", "quiet")}</div>`; break;
      case "clarify": body = `<div class="label">One thing to check</div>${H(esc(FX.CLARIFY.question))}<div class="quote">${esc(FX.CLARIFY.text)}</div>${prov(FX.CLARIFY.prov)}<div class="options">${FX.CLARIFY.options.map((o) => `<div class="opt" data-act="close">${T.mark(o === "Sam Diaz" ? "sam-diaz" : "sam-lee", 36, o, night, "row")}<span>${esc(o)}</span></div>`).join("")}<div class="opt plain" data-act="close"><span>Someone else</span></div></div><div class="small">Kinship never guesses who.</div>`; break;
      case "processing": body = `<div class="label">Understanding…</div><div class="quote tell">${esc(FX.LONG_TELL.text)}</div><div class="progress"><span class="pline"></span></div><div class="small">Nothing is kept until it's understood. You can keep telling; Kinship catches up.</div>`; break;
      case "kept": body = `<div class="label">Kept for Priya</div>${FX.LONG_TELL.kept.map((k) => `<div class="keptline ${arrive()}"><div class="line">${esc(k.text)}</div>${prov(k.prov)}</div>`).join("")}<div class="pending ${arrive(3)}"><div class="label">Not kept yet</div><div class="line">${esc(FX.LONG_TELL.pending.text)}</div><div class="small">${esc(FX.LONG_TELL.pending.note)}</div><div class="rowb">${pill("Keep it", "close", "primary small")}${pill("Leave it", "close", "quiet small")}</div></div><div class="rowb">${pill("Got it right", "close")}${pill("Undo", "close", "quiet")}</div>`; break;
      case "ask": body = `<div class="label">You asked <i class="tagf">Alpha · provisional</i></div>${H(esc(FX.ASK.q))}${FX.ASK.results.map((r) => `<div class="res ${r.type}"><div class="line">${esc(r.text)}</div><div class="small">${esc(r.who)}</div>${prov(r.prov)}</div>`).join("")}<div class="small closing">${esc(FX.ASK.closing)}</div>`; break;
      case "idea": body = `<div class="label">An idea <i class="tagf">Future · CC-28 bucket D</i></div>${H(esc(FX.IDEA.text))}<div class="small">${esc(FX.IDEA.label)}. Built only from what you told Kinship:</div><div class="line" style="margin-top:8px">${esc(FX.IDEA.basis)}</div>${prov(FX.IDEA.prov)}<div class="rowb">${pill("Message Priya", "open")}${pill("Not now", "close", "quiet")}</div>`; break;
      case "knows": body = `<div class="label">What Kinship knows about ${esc(P.name)}</div>${[...P.lately, ...P.coming, ...P.said].map(([t, p]) => `<div class="entry"><div class="line">${esc(t)}</div>${prov(p)}</div>`).join("")}<div class="rowb">${pill("Close", "close", "primary small")}</div>`; break;
    }
    return `<div class="scrim on" data-act="close"></div><div class="sheet on ${S.sheet}"><div class="grab"></div>${body}</div>`;
  }

  // ---------------------------------------------------------------- mount
  function mount(stage, cfg = {}, hooks = {}) {
    const S = Object.assign({}, defaults, cfg);
    let timers = [];
    function compute() { S.night = S.appearance === "night" || (S.appearance === "auto" && (S.hour < 6 || S.hour >= 19)); }
    function render() {
      compute();
      const T = THEMES[S.theme] || THEMES.garden;
      let body = "";
      if (S.screen === "today") body = today(S, T);
      else if (S.screen === "people") body = people(S, T);
      else if (S.screen === "person") body = person(S, T);
      else if (S.screen === "setup") body = setup(S, T);
      const cls = `phone ${S.voice ? `voice-${S.voice}` : ""} ${S.night ? "night" : ""} ${S.reduce ? "reduce" : ""} ${S.large ? "large" : ""} ${S.se ? "se" : ""} screen-${S.screen} state-${S.state}`;
      stage.innerHTML = `<div class="${cls}" data-theme="${S.theme}">${body}${S.sheet ? sheet(S, T) : ""}${S.toast ? `<div class="toast">${esc(S.toast)}</div>` : ""}${S.label ? `<div class="themelabel">${T.letter} · ${T.name}</div>` : ""}</div>`;
      if (hooks.onRender) hooks.onRender(S);
    }
    const note = (t) => hooks.onNote && hooks.onNote(t);
    const toast = (t, ms = 2200) => { S.toast = t; render(); timers.push(setTimeout(() => { S.toast = null; render(); }, ms)); };
    const go = (state) => { S.state = state; S.phase = null; render(); };
    function act(a, el) {
      const m = FX.MOMENTS[S.state] || FX.MOMENTS[S.base] || FX.MOMENTS.moment;
      if (a === "go") { S.screen = el.dataset.to; S.sheet = null; render(); }
      else if (a === "detail") { S.sheet = "detail"; render(); note("The detail: why it's here and the note's own words. Kinship shows its source on everything."); }
      else if (a === "handoff") { S.sheet = "handoff"; render(); note("The hand-off: Kinship opens a channel. It sends nothing, and opening Messages never counts as contact (T12)."); }
      else if (a === "open") { S.sheet = null; S.base = FX.MOMENTS[S.state] ? S.state : S.base; render(); toast("Messages opens. Kinship sends nothing and can't see what you do there. When you're back (10 min+), it asks.", 2600); timers.push(setTimeout(() => { S.screen = "today"; go("return"); note("Back from Messages: the question is the moment. One observed fact (you opened Messages), nothing claimed about what happened."); }, 2300)); }
      else if (a === "yes") { S.phase = "resolved"; render(); note("Yes: the question becomes its answer in place. One haptic. Nothing pressed, lit, scored or rewarded."); }
      else if (a === "notyet") { go(S.base || "moment"); note("Not yet: nothing is recorded; the reason speaks again while its window lasts."); }
      else if (a === "nothing") { go("quiet"); note("Nothing today: Today moves on. Nothing was logged."); }
      else if (a === "notnow") { const p = el.closest("[data-plate]"); if (p && !S.reduce) p.classList.add("leaving"); timers.push(setTimeout(() => { go(S.state === "sensitive" ? "quiet" : "quiet"); note("Not now: the moment is put aside for today. No streak, no penalty, nothing accumulates."); }, S.reduce ? 150 : 320)); }
      else if (a === "week") toast(`“${el.dataset.text}” opens its detail (the same sheet as the moment).`);
      else if (a === "person") { S.screen = "person"; S.person = FX.PROFILES[el.dataset.person] ? el.dataset.person : "lena"; S.sheet = null; render(); }
      else if (a === "correct") { S.sheet = "correct"; S.text = el.dataset.text; render(); note("Any line opens its correction. The user's edit wins; re-extraction never overrides it."); }
      else if (a === "clarify") { S.sheet = "clarify"; render(); }
      else if (a === "longtell") { S.screen = "today"; S.state = "first"; S.sheet = "processing"; render(); note("A long story (PROPOSED story-first capture, PR #52): the pending state is honest. Then the Kept card, with one held line that needs your yes."); timers.push(setTimeout(() => { S.sheet = "kept"; render(); }, S.reduce ? 1200 : 2400)); }
      else if (a === "ask") { S.sheet = "ask"; render(); note("Ask (Alpha, provisional): typed results, each with its source; an explicit closing line; nothing written."); }
      else if (a === "idea") { S.sheet = "idea"; render(); note("A contextual idea (FUTURE, CC-28 bucket D): a suggestion, never shown as a remembered fact."); }
      else if (a === "knows") { S.sheet = "knows"; render(); }
      else if (a === "close") { S.sheet = null; render(); }
      else if (a === "tellfocus") toast("The Tell field takes focus. (Keyboard not simulated.)");
      else if (a === "search") toast("Type in the panel to filter People. The field only filters; asking is explicit (AR-2).");
      else if (a === "add") toast("Add by name or from contacts. Nothing pre-checked; only the people you pick are saved.");
      else if (a === "settings") toast("Settings: What Kinship knows, consent, export, delete.");
      else if (a === "toast") toast(el.dataset.text);
    }
    stage.addEventListener("click", (e) => { const el = e.target.closest("[data-act]"); if (!el || !stage.contains(el)) return; act(el.dataset.act, el); });
    const api = { S, render, set: (o) => { Object.assign(S, o); render(); }, go, act, clear: () => { timers.forEach(clearTimeout); timers = []; } };
    render();
    return api;
  }

  // A static render (no listeners) for galleries.
  function still(cfg) { const d = document.createElement("div"); mount(d, Object.assign({ label: false }, cfg)); return d.innerHTML; }

  window.KB = { mount, still, THEMES, esc, sprig };
})();
