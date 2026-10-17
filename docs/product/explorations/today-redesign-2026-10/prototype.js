// "The Garden Letter": the preferred direction as a navigable prototype.
// Exploratory, unapproved. Fictional content; no production code, data or model.
(function () {
  const { sprig, ill, grass, skyArc, icon } = window.K;
  const D = window.DIRECTIONS;
  const C = { ink: "var(--ink)", quiet: "var(--inkQuiet)" };

  // ---------- state ----------
  const S = {
    screen: "today",            // today | people | person
    state: "moment",            // moment | birthday | milestone | busy | quiet | first | bringback | return | after
    sheet: null,                // detail | handoff | null
    toast: null,
    hour: 8,
    appearance: "auto",         // auto | light | night
    reduce: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    large: false,
    lit: "ben",
    kept: null,
    pending: null,
  };
  let lastState = null;

  const MOMENTS = {
    moment: { person: "ben", name: "Ben", kicker: "The day after", statement: "How did it go for Ben?", ctx: "Ben runs Chicago Sunday · Sun, Oct 11", pull: "He was hoping to break four hours.", prov: "You told Kinship · Oct 8", primary: "Ask how it went", art: "laurel", why: "It was yesterday.", when: "Sun, Oct 11", mention: ["Ben's knee has been bothering him", "He was hoping to break four hours"], handoff: "Ask Ben how it went", ask: "Did you ask Ben how it went?", after: "Anything worth remembering from talking with Ben?" },
    birthday: { person: "maya", name: "Maya", kicker: "A birthday", statement: "It's Maya's birthday.", ctx: null, pull: null, prov: "From Contacts", primary: "Message Maya", art: "candle", why: "It's today.", when: "Oct 12", mention: ["Maya is reading Piranesi"], handoff: "Wish Maya a happy birthday", ask: "Did you reach Maya?", after: "Anything worth remembering from talking with Maya?", celebrate: true },
    milestone: { person: "anthony", name: "Anthony", kicker: "Thursday", statement: "Anthony and Natalia's wedding is Thursday.", ctx: "Thursday · Thu, Oct 15", pull: null, prov: "You told Kinship · Oct 3", primary: "Message Anthony", art: "rings", why: "It's on Thursday.", when: "Thu, Oct 15", mention: ["They're getting married at the Presidio"], handoff: "Message Anthony before the wedding", ask: "Did you reach Anthony about the wedding?", after: "Anything worth remembering from talking with Anthony?", celebrate: true },
  };
  const WEEK = [
    { dn: "WED", d: 14, text: "Josh has his interview", person: "josh" },
    { dn: "SAT", d: 17, text: "Maya's birthday", person: "maya" },
  ];
  const BUSY = [
    { dn: "TODAY", d: 12, text: "Send Chris that restaurant", person: "chris", ochre: true, label: "You said you'd" },
    { dn: "WED", d: 14, text: "Josh has his interview", person: "josh" },
    { dn: "FRI", d: 16, text: "Did Tyler send it?", person: "tyler", waiting: "Waiting on Tyler" },
    { dn: "SAT", d: 17, text: "Maya's birthday", person: "maya" },
  ];

  // ---------- helpers ----------
  const night = () => S.appearance === "night" || (S.appearance === "auto" && (S.hour < 6 || S.hour >= 19));
  const tint = () => {
    const h = S.hour;
    if (night()) return h >= 19 && h < 22 ? "var(--dusk)" : "var(--dawn)";
    if (h < 9) return "var(--dawn)";
    if (h >= 17) return "var(--dusk)";
    return "var(--day)";
  };
  const greeting = () => (S.hour < 12 ? "Good morning, Nico." : S.hour < 18 ? "Good afternoon, Nico." : "Good evening, Nico.");
  const seasonLine = () => {
    const h = S.hour;
    const part = h < 6 ? "The small hours." : h < 9 ? "Early." : h < 12 ? "A quiet morning." : h < 17 ? "A quiet afternoon." : h < 21 ? "Evening." : "Late.";
    return `Mid-October. ${part}`;
  };
  const arrive = (n = 0) => `arrive${n ? ` d${n}` : ""}`;
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

  // ---------- Today ----------
  function plate(m, extra = "") {
    const art = ill[m.art] ? ill[m.art](m.celebrate ? 118 : 128, C.ink) : "";
    return `<div class="plate ${m.celebrate ? "celebrate" : ""} ${extra}" data-plate>
      ${m.celebrate ? `<div class="celebrate-band"></div>` : ""}
      <div class="words" data-act="detail" role="button" tabindex="0" aria-label="${esc(m.statement)}. Shows why this is here">
        <div class="art">${art}</div>
        <div class="kicker">${m.kicker}</div>
        <div class="statement">${m.statement}</div>
        ${m.ctx ? `<div class="body ctx">${m.ctx}</div>` : ""}
        ${m.pull ? `<div class="pull">“${m.pull}”</div>` : ""}
        <div style="margin-top:10px;clear:both"><span class="prov">${m.prov}</span></div>
      </div>
      <div class="meadow">${grass(393, 56, 4, C.ink, { opacity: .38 })}<div class="stand">${sprig(m.person, 30, C.ink, { wash: .09 })}</div></div>
    </div>
    <div class="actions ${arrive(1)}"><span class="pill" data-act="handoff" role="button" tabindex="0">${icon.message("var(--onInk)")}${m.primary}</span><span class="notnow" data-act="notnow" role="button" tabindex="0">Not now</span></div>`;
  }
  function week(items, opts = {}) {
    const rows = items.map((w) => `<div class="day ${arrive(2)}" data-act="week" data-text="${esc(w.text)}"><span class="dn ${w.ochre ? "ochre" : ""}"><b>${w.dn}</b>${w.d}</span><span class="line">${w.waiting ? `<span class="small" style="display:block;margin-bottom:-2px">${w.waiting}</span>` : ""}${w.text}</span></div>`).join("");
    return `<div class="week"><div class="label ${arrive(2)}">${opts.title || "This week"}</div>${rows}${opts.more ? `<div class="more small ${arrive(3)}" data-act="more">and 2 more</div>` : ""}</div>`;
  }
  function todayHTML() {
    const n = night();
    const st = S.state;
    const m = MOMENTS[st] || MOMENTS.moment;
    let body = "";
    const head = `<div class="top ${arrive()}"><div class="label">Monday, Oct 12</div><div class="greeting" style="margin-top:8px">${greeting()}</div></div>`;
    if (st === "moment" || st === "birthday" || st === "milestone") {
      body = plate(m) + week(WEEK);
    } else if (st === "busy") {
      body = plate(MOMENTS.moment) + week(BUSY, { more: true });
    } else if (st === "return") {
      body = `<div class="slip ${arrive()}" aria-live="polite"><div class="moment">${m.ask}</div><div class="small" style="margin-top:4px">${m.ctx || m.prov}</div>
        <div class="row"><span class="pill small" data-act="yes" role="button" tabindex="0">Yes</span><span class="pill small quiet" data-act="notyet" role="button" tabindex="0">Not yet</span></div></div>` + plate(m) + week(WEEK);
    } else if (st === "after") {
      body = `<div class="quiet-head ${arrive()}" aria-live="polite"><div class="kicker" style="font-family:var(--serif);font-style:italic;color:var(--inkQuiet)">You reached ${m.name}.</div>
        <div class="display" style="margin-top:6px">${m.after}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:26px"><span class="pill" data-act="tell" role="button" tabindex="0">Tell Kinship</span><span class="pill quiet" data-act="nothing" role="button" tabindex="0">Nothing today</span></div></div>` + week(WEEK);
    } else if (st === "quiet") {
      body = `<div class="quiet-head ${arrive()}"><div class="kicker" style="font-family:var(--serif);font-style:italic;font-size:calc(17px * var(--ts));color:var(--inkQuiet)">${seasonLine()}</div>
        <div class="display" style="margin-top:6px">Nothing needs you today.</div></div>
        <div class="meadow tall">${grass(393, 80, 21, C.ink, { opacity: .3, gap: 7 })}</div>` + week(WEEK);
    } else if (st === "first") {
      body = `<div class="first ${arrive()}"><div class="display" style="margin-top:30px">This is where Kinship brings things back.</div>
        <div class="body" style="margin-top:12px">Tell Kinship what's going on with the people you care about. When something matters, like a birthday, a big day or something you said you'd do, it will be here, with what you said.</div>
        <div class="pills"><span class="pill" data-act="tell" role="button" tabindex="0">Tell Kinship one thing</span><span class="pill quiet" role="button" tabindex="0">Add more people</span></div></div>`;
    } else if (st === "bringback") {
      body = `<div class="first ${arrive()}"><div class="display" style="margin-top:30px">This is where Kinship brings things back, when they matter.</div>
        <div class="small" style="margin-top:12px">An example</div>
        <div class="letter"><div class="art">${ill.laurel(72, C.ink)}</div>
          <div class="r"><div class="label">You tell Kinship</div><div class="body ink" style="margin-top:4px">Ben runs Chicago Sunday and hopes to break four hours.</div></div>
          <div class="r"><div class="label">The day after</div><div class="body ink" style="margin-top:4px">It comes back here: “How did it go for Ben?”</div></div>
          <div class="r"><div class="label">When you're back</div><div class="body ink" style="margin-top:4px">Did you ask Ben how it went?</div></div></div>
        <div class="pills" style="margin-top:18px"><span class="pill quiet" data-act="gotit" role="button" tabindex="0">Got it</span></div></div>`;
    }
    const lit = (st === "moment" || st === "busy" || st === "return") ? "ben" : st === "birthday" ? "maya" : st === "milestone" ? "anthony" : null;
    const hedgeIds = st === "first" ? D.HEDGE.slice(0, 5) : D.HEDGE;
    const kept = S.kept ? `<div class="small ${arrive()}" style="display:flex;justify-content:space-between;padding:0 6px 8px"><span>Kept: ${S.kept}</span><span class="ochre">Undo</span></div>` : "";
    return `<div class="g"><div class="sky" style="--skyTint:${tint()}"></div><div class="light" data-light></div>
      <div class="sundial">${skyArc(150, S.hour, C.ink, { height: 62, paper: "var(--paper)" })}</div>
      <div class="content">${head}${body}</div>
      <div class="bed"><div class="fade"></div>${D.hedgerow(hedgeIds, 48, lit)}<div class="soil"></div></div>
    </div>${D.dock("today", "Tell Kinship something…", kept)}`;
  }

  // ---------- People ----------
  function peopleHTML() {
    const rows = D.PEOPLE.map(([id, name, line]) => `<div class="row" data-act="person" data-person="${id}"><span class="rs">${sprig(id, 24, C.ink)}</span><div><div class="body ink" style="font-size:calc(17px * var(--ts))">${name}</div>${line ? `<div class="small" style="margin-top:2px;font-size:calc(13px * var(--ts));line-height:calc(18px * var(--ts))">${line}</div>` : ""}</div></div>`).join("");
    return `<div class="g pp"><div class="sky" style="--skyTint:${tint()};height:220px"></div>
      <div class="content" style="bottom:124px"><div class="hdr"><div class="tell">${icon.search(C.quiet)}Search your people</div><span class="iconbtn">${icon.plus(C.ink)}</span><span class="iconbtn">${icon.gear(C.quiet)}</span></div>
      <div class="italic">Fourteen people. Mid-October.</div><div class="rows">${rows}</div></div></div>${D.dock("people")}`;
  }

  // ---------- Person ----------
  function personHTML() {
    const P = D.PRIYA;
    const sec = (label, items, cls = "") => `<div class="sec"><div class="label ${cls}">${label}</div>${items.map(([t, p]) => `<div class="line">${t}</div><div style="margin-top:2px"><span class="prov">${p}</span></div>`).join("")}</div>`;
    return `<div class="g pg"><div class="sky" style="--skyTint:${tint()};height:260px"></div>
      <div class="scrollarea">
        <div class="back"><span class="iconbtn" data-act="back">${icon.back(C.ink)}</span></div>
        <div class="head"><div><div class="name">Priya</div><div class="italic" style="margin-top:6px">${P.label} · Oakland</div></div><div class="headsprig">${sprig("priya", 78, C.ink, { wash: .09 })}</div></div>
        <div class="ground">${grass(393, 40, 9, C.ink, { opacity: .3 })}<div class="soil"></div></div>
        ${sec("Lately", P.lately.slice(0, 2))}
        ${sec("Coming up", P.coming.slice(0, 2))}
        ${sec("You said you'd", P.said.slice(0, 1), "ochre")}
        <div class="sec"><div class="label">Between you</div><div class="quote">“You two always get dosas on Shattuck.”</div><div style="margin-top:2px"><span class="prov">You told Kinship · Aug 14</span></div>
          <div class="line" style="margin-top:10px">You messaged · Oct 2</div><div class="small">Priya is reading Piranesi</div></div>
        <div class="ochre small" style="margin-top:18px;font-size:13px">What Kinship knows about Priya →</div>
      </div>
      <div class="acts"><span class="pill">${icon.message("var(--onInk)")}Message</span><span class="pill quiet">${icon.phone(C.ink)}Call</span><span class="pill quiet">${icon.pen(C.ink)}Tell</span></div>
    </div>`;
  }

  // ---------- sheets ----------
  function sheetHTML() {
    const m = MOMENTS[S.state] || MOMENTS.moment;
    if (S.sheet === "detail") {
      return `<div class="scrim" data-act="close"></div><div class="sheet" role="dialog" aria-label="${esc(m.statement)}"><div class="grab"></div>
        <div class="label">${m.name}</div><div class="moment" style="margin-top:8px">${m.ctx || m.statement}</div>
        ${m.pull ? `<div class="body ink" style="margin-top:4px">${m.pull}</div>` : ""}
        <div class="body" style="margin-top:16px">${m.why}</div><div class="small" style="margin-top:4px">${m.when}</div>
        <div style="margin-top:12px"><span class="prov">${m.prov}</span></div>
        <div class="rowb"><span class="pill" data-act="handoff">${icon.message("var(--onInk)")}Message</span><span class="pill quiet">${icon.phone(C.ink)}Call</span></div>
        <div style="margin-top:12px"><span class="pill quiet" style="flex:none" data-act="viewperson">View ${m.name}</span></div></div>`;
    }
    if (S.sheet === "handoff") {
      return `<div class="scrim" data-act="close"></div><div class="sheet" role="dialog" aria-label="${esc(m.handoff)}"><div class="grab"></div>
        <div class="heading">${m.handoff}</div>
        <div class="mention"><div class="label">You could mention</div>${m.mention.map((x) => `<div class="body">•&nbsp; ${x}</div>`).join("")}</div>
        <div class="rowb"><span class="pill" data-act="open">Open Messages</span><span class="pill quiet">Call</span></div>
        <div style="display:flex;gap:8px;margin-top:8px"><span class="pill small quiet">FaceTime</span><span class="pill small quiet">WhatsApp</span></div>
        <div class="small" style="text-align:center;margin-top:16px">When you come back: “${m.ask.replace("Did you ask", "Did you reach").replace(" how it went", "")}”</div></div>`;
    }
    return "";
  }

  // ---------- render ----------
  const stage = document.getElementById("stage");
  function render(opts = {}) {
    const n = night();
    const inner = S.screen === "today" ? todayHTML() : S.screen === "people" ? peopleHTML() : personHTML();
    stage.innerHTML = D.phone(inner + sheetHTML() + (S.toast ? `<div class="toast ${arrive()}">${S.toast}</div>` : ""), { night: n, cls: `${S.reduce ? "reduce" : ""} ${S.large ? "large" : ""}` });
    if (S.sheet) requestAnimationFrame(() => requestAnimationFrame(() => { stage.querySelector(".scrim")?.classList.add("on"); stage.querySelector(".sheet")?.classList.add("on"); }));
    if (opts.light) requestAnimationFrame(() => stage.querySelector("[data-light]")?.classList.add("on"));
    syncPanel();
  }
  function go(state, opts) { lastState = S.state; S.state = state; S.sheet = null; render(opts); }
  function closeSheet(after) {
    const sh = stage.querySelector(".sheet"), sc = stage.querySelector(".scrim");
    if (sh) { sh.classList.remove("on"); sc?.classList.remove("on"); }
    setTimeout(() => { S.sheet = null; after ? after() : render(); }, S.reduce ? 150 : 240);
  }
  function toast(text, ms = 1600) { S.toast = text; render(); setTimeout(() => { S.toast = null; render(); }, ms); }

  // ---------- interactions ----------
  stage.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]");
    if (!el) return;
    const act = el.dataset.act;
    if (act === "detail") { S.sheet = "detail"; render(); }
    else if (act === "handoff") { if (S.sheet) closeSheet(() => { S.sheet = "handoff"; render(); }); else { S.sheet = "handoff"; render(); } }
    else if (act === "close") closeSheet();
    else if (act === "open") {
      closeSheet(() => {
        toast("Messages opens. Kinship sends nothing. (In the app the question below waits until you come back, from 10 minutes on.)", 2600);
        setTimeout(() => { if (S.state !== "return") go("return"); }, 2200);
      });
    }
    else if (act === "notnow") {
      const p = stage.querySelector("[data-plate]"), a = stage.querySelector(".actions");
      p?.classList.add("leaving"); a?.classList.add("leaving");
      setTimeout(() => go("quiet"), S.reduce ? 150 : 320);
      note("Not now: the plate slides off to the right (320 ms) and the quiet day arrives. A soft tick haptic is proposed here.");
    }
    else if (act === "yes") {
      const p = stage.querySelector("[data-plate]"), a = stage.querySelector(".actions"), s = stage.querySelector(".slip");
      p?.classList.add("pressing"); a?.classList.add("pressing"); s?.classList.add("pressing");
      stage.querySelector(".hedge .lit")?.classList.add("unlit");
      note("Yes: the success haptic (the one approved haptic), the plate presses into the paper (600 ms), light passes over the garden, Ben's root mark goes out. Then the one optional question.");
      setTimeout(() => go("after", { light: true }), S.reduce ? 150 : 600);
    }
    else if (act === "notyet") { go("moment"); note("Not yet: nothing is recorded; the moment stays while its window lasts."); }
    else if (act === "tell") { S.kept = "Ben ran 3:52. Wants to do Berlin next."; go("quiet"); note("Tell Kinship opens the dock about Ben. Shown here as if a note was told and kept: the Kept line above the field, with Undo."); setTimeout(() => { S.kept = null; render(); }, 5000); }
    else if (act === "nothing") { go("quiet"); note("Nothing today: nothing changes; the conversation still counted."); }
    else if (act === "gotit") go("quiet");
    else if (act === "person") { S.screen = "person"; render(); }
    else if (act === "back") { S.screen = "people"; render(); }
    else if (act === "viewperson") closeSheet(() => { S.screen = "person"; render(); });
    else if (act === "week") { toast(`“${el.dataset.text}” opens its detail (the same sheet as the moment).`); }
    else if (act === "more") { toast("“and 2 more” opens in place; nothing in the next week is hidden for good."); }
  });
  stage.addEventListener("click", (e) => {
    const bar = e.target.closest(".bar span");
    if (bar) { S.screen = bar.textContent.trim().toLowerCase(); render(); }
  });
  stage.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { const el = e.target.closest("[data-act]"); if (el) { e.preventDefault(); el.click(); } } });

  // ---------- panel ----------
  const noteEl = document.getElementById("note");
  function note(t) { noteEl.textContent = t; }
  function syncPanel() {
    if (!document.getElementById("hour")) return;
    document.querySelectorAll("[data-state]").forEach((b) => b.classList.toggle("on", b.dataset.state === S.state && S.screen === "today"));
    document.querySelectorAll("[data-screen]").forEach((b) => b.classList.toggle("on", b.dataset.screen === S.screen));
    document.querySelectorAll("[data-appearance]").forEach((b) => b.classList.toggle("on", b.dataset.appearance === S.appearance));
    document.getElementById("hour").value = S.hour;
    document.getElementById("hourLabel").textContent = `${String(S.hour).padStart(2, "0")}:00`;
    document.getElementById("reduce").checked = S.reduce;
    document.getElementById("large").checked = S.large;
  }
  document.querySelectorAll("[data-state]").forEach((b) => b.addEventListener("click", () => { S.screen = "today"; S.kept = null; go(b.dataset.state); note(b.dataset.note || ""); }));
  document.querySelectorAll("[data-screen]").forEach((b) => b.addEventListener("click", () => { S.screen = b.dataset.screen; S.sheet = null; render(); }));
  document.querySelectorAll("[data-appearance]").forEach((b) => b.addEventListener("click", () => { S.appearance = b.dataset.appearance; render(); }));
  document.getElementById("hour").addEventListener("input", (e) => { S.hour = +e.target.value; render(); });
  document.getElementById("reduce").addEventListener("change", (e) => { S.reduce = e.target.checked; render(); });
  document.getElementById("large").addEventListener("change", (e) => { S.large = e.target.checked; render(); });

  // ?state=…&screen=…&hour=…&night=1&large=1&reduce=1 for captures
  const q = new URLSearchParams(location.search);
  if (q.get("state")) S.state = q.get("state");
  if (q.get("screen")) S.screen = q.get("screen");
  if (q.get("hour")) S.hour = +q.get("hour");
  if (q.get("night")) S.appearance = "night";
  if (q.get("large")) S.large = true;
  if (q.get("reduce")) S.reduce = true;
  if (q.get("sheet")) S.sheet = q.get("sheet");
  if (q.get("capture")) document.body.classList.add("capture");
  render();
})();
