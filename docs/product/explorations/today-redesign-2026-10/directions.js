// Three directions × three screens, drawn from fixtures. Exploratory, unapproved.
// Fictional demonstration content. No production code, data or model is involved.
(function () {
  const { sprig, ill, grass, skyArc, icon } = window.K;
  const C = { ink: "var(--ink)", quiet: "var(--inkQuiet)", ochre: "var(--ochre)" };

  // ---------- fixtures (fictional) ----------
  const PEOPLE = [
    ["ana", "Ana", "Ana is visiting for Thanksgiving"],
    ["anthony", "Anthony", "Anthony and Natalia's wedding is Thursday"],
    ["ben", "Ben", "Ben runs Chicago Sunday"],
    ["chris", "Chris", "Chris is into Warhammer again"],
    ["david", "David", null],
    ["josh", "Josh", "Josh has his interview Wednesday"],
    ["lena", "Lena", "Lena moved to Oakland"],
    ["maya", "Maya", "Maya is reading Piranesi"],
    ["mom", "Mom", "Mom wants to do Thanksgiving at hers"],
    ["priya", "Priya", "Priya's pottery show is on October 24"],
    ["sam-diaz", "Sam Diaz", null],
    ["sam-lee", "Sam Lee", "Sam is training for a triathlon"],
    ["sarah", "Sarah", "Sarah's sister has surgery Thursday"],
    ["tyler", "Tyler", "Tyler is thinking about moving to Marin"],
  ];
  const HEDGE = ["ana", "anthony", "ben", "chris", "david", "josh", "lena", "maya", "mom", "priya", "sam-diaz", "sam-lee", "sarah", "tyler"];

  const PRIYA = {
    name: "Priya", label: "college roommate",
    lately: [
      ["Priya's dog Miso had a good vet checkup", "You told Kinship · Oct 1"],
      ["Priya is reading Piranesi", "You told Kinship · Sep 29"],
      ["Priya's team at Figma shipped the new editor", "You told Kinship · Sep 12"],
    ],
    coming: [
      ["Priya's pottery show · Sat, Oct 24", "You told Kinship · Sep 25"],
      ["Priya's mom is visiting from Pune · Week of Nov 2", "You told Kinship · Oct 6"],
      ["Priya and Dev are thinking about a trip to Japan in the spring", "You told Kinship · Jul 2"],
    ],
    said: [["Send Priya the Piranesi audiobook link", "You told Kinship · Sep 30"], ["Come to Priya's pottery show", "You told Kinship · Sep 25"]],
    between: [["You two always get dosas on Shattuck", "You told Kinship · Aug 14"], ["Roommates at Hilltop, 2014 to 2016", "You told Kinship · Aug 14"]],
    talked: [["You messaged · Oct 2", "Priya is reading Piranesi"]],
  };

  // ---------- frame ----------
  function status(night) {
    return `<div class="status"><span>9:41</span><span class="island"></span><span class="sig">
      <svg width="18" height="12" viewBox="0 0 18 12" aria-hidden="true"><rect x="0" y="8" width="3" height="4" rx="1" fill="currentColor"/><rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="currentColor"/><rect x="10" y="3" width="3" height="9" rx="1" fill="currentColor"/><rect x="15" y="0" width="3" height="12" rx="1" fill="currentColor"/></svg>
      <svg width="16" height="12" viewBox="0 0 16 12" aria-hidden="true"><path d="M8 11a1.4 1.4 0 1 0 0-.01M4.2 7.4a5.4 5.4 0 0 1 7.6 0M1.2 4.4a9.6 9.6 0 0 1 13.6 0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
      <svg width="27" height="13" viewBox="0 0 27 13" aria-hidden="true"><rect x=".5" y=".5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" stroke-opacity=".4"/><rect x="2" y="2" width="18" height="9" rx="2" fill="currentColor"/><path d="M25 4.5v4a2 2 0 0 0 0-4z" fill="currentColor" fill-opacity=".4"/></svg></span></div>`;
  }
  function phone(inner, opts = {}) {
    return `<div class="phone ${opts.night ? "night" : ""} ${opts.cls || ""}" data-frame="${opts.id || ""}">${status(opts.night)}${inner}<div class="home"></div></div>`;
  }
  function dock(current = "today", placeholder = "Tell Kinship something…", extra = "") {
    return `<div class="dock">${extra}<div class="tell">${placeholder}</div><div class="bar"><span class="${current === "today" ? "on" : ""}">Today</span><span class="${current === "people" ? "on" : ""}">People</span></div></div>`;
  }
  const hedgerow = (ids, h = 44, lit = null, opts = {}) => `<div class="hedge" aria-hidden="true">${ids.map((id, i) => `<span class="h ${id === lit ? "lit" : ""}" style="--i:${i}">${sprig(id, Math.round(h * 60 / 110), C.ink, { wash: 0.07 })}</span>`).join("")}</div>`;

  // ======================================================================
  // CURRENT (as built), for comparison
  // ======================================================================
  function currentToday(night) {
    return phone(`<div class="screen">
      <div style="padding-top:88px"><div class="label">Monday, Oct 12</div><div class="greeting" style="margin-top:8px">Good morning, Nico.</div></div>
      <div style="margin-top:48px;display:flex;gap:16px;align-items:flex-start">
        ${sprig("ben", 46, C.ink)}
        <div style="flex:1"><div class="display">How did it go for Ben?</div>
          <div class="body" style="margin-top:12px">Ben runs Chicago Sunday · Sun, Oct 11</div>
          <div class="body ink" style="margin-top:4px">Ben was hoping to break four hours.</div>
          <div style="margin-top:8px"><span class="prov">You told Kinship · Oct 8</span></div></div></div>
      <div style="display:flex;gap:8px;margin-top:26px"><span class="pill">${icon.message("var(--onInk)")}Ask how it went</span><span class="pill quiet">Not now</span></div>
      <div class="hair" style="margin-top:48px;padding-top:16px"><div class="label">Wednesday</div><div class="line" style="margin-top:4px">Josh has his interview Wednesday</div>
        <div class="label" style="margin-top:16px">Saturday</div><div class="line" style="margin-top:4px">Maya's birthday</div></div>
      </div>${dock()}`, { night, id: "current-today", cls: "cur" });
  }

  // ======================================================================
  // DIRECTION A · THE LIVING GARDEN · "The Bed"
  // ======================================================================
  const A = {};
  A.today = function (night, variant = "moment") {
    const hour = night ? 21 : 8;
    const sky = `<div class="a-sky ${night ? "" : "dawn"}"></div><div class="a-sundial">${skyArc(150, hour, C.ink, { height: 62, paper: "var(--paper)" })}</div>`;
    const momentBlock = variant === "birthday"
      ? `<div class="a-plot"><div class="a-ground">${grass(393, 70, 4, C.ink, { opacity: .38 })}</div>
          <div class="a-stand" style="left:0">${sprig("maya", 54, C.ink, { wash: .09 })}</div>
          <div class="a-words"><div class="display">It's Maya's birthday.</div>
            <div class="italic" style="margin-top:10px">Her thirty-fourth, if Contacts has it right.</div>
            <div style="margin-top:8px"><span class="prov">From Contacts</span></div></div></div>
          <div style="display:flex;gap:8px;margin-top:22px"><span class="pill">${icon.message("var(--onInk)")}Message Maya</span><span class="pill text">Not now</span></div>`
      : `<div class="a-plot"><div class="a-ground">${grass(393, 70, 4, C.ink, { opacity: .38 })}</div>
          <div class="a-stand" style="left:0">${sprig("ben", 54, C.ink, { wash: .09 })}</div>
          <div class="a-words"><div class="display">How did it go for Ben?</div>
            <div class="body" style="margin-top:12px">Ben runs Chicago Sunday · Sun, Oct 11</div>
            <div class="body ink" style="margin-top:4px">Ben was hoping to break four hours.</div>
            <div style="margin-top:8px"><span class="prov">You told Kinship · Oct 8</span></div></div></div>
          <div style="display:flex;gap:8px;margin-top:22px"><span class="pill">${icon.message("var(--onInk)")}Ask how it went</span><span class="pill text">Not now</span></div>`;
    return phone(`<div class="screen a">${sky}
      <div style="padding-top:88px"><div class="label">Monday, Oct 12</div><div class="greeting" style="margin-top:8px">Good morning, Nico.</div></div>
      <div style="position:relative;margin-top:36px">${momentBlock}</div>
      <div class="a-week"><div class="label">This week</div>
        <div class="a-day"><span class="a-dn"><b>WED</b>14</span><span class="line">Josh has his interview</span></div>
        <div class="a-day"><span class="a-dn"><b>SAT</b>17</span><span class="line">Maya's birthday</span></div></div>
      <div class="a-bed">${hedgerow(HEDGE, 48, "ben")}<div class="a-soil"></div></div>
      </div>${dock()}`, { night, id: `a-today${variant === "birthday" ? "-birthday" : ""}` });
  };
  A.people = function (night) {
    const rows = PEOPLE.map(([id, name, line]) => `<div class="a-row"><span class="a-rs">${sprig(id, 24, C.ink)}</span><div><div class="body ink" style="font-size:17px">${name}</div>${line ? `<div class="small" style="margin-top:2px;font-size:13px;line-height:18px">${line}</div>` : ""}</div></div>`).join("");
    return phone(`<div class="screen a"><div class="a-sky day" style="height:220px"></div>
      <div style="position:relative;padding-top:70px;display:flex;gap:8px;align-items:center">
        <div class="tell" style="flex:1;height:50px;gap:8px">${icon.search(C.quiet)}Search your people</div><span class="iconbtn">${icon.plus(C.ink)}</span><span class="iconbtn">${icon.gear(C.quiet)}</span></div>
      <div class="italic" style="margin-top:22px">Fourteen people. Mid-October.</div>
      <div class="a-rows">${rows}</div>
      </div>${dock("people")}`, { night, id: "a-people" });
  };
  A.person = function (night) {
    const sec = (label, items, cls = "") => `<div class="a-sec"><div class="label ${cls}">${label}</div>${items.map(([t, p]) => `<div class="line" style="margin-top:6px">${t}</div><div style="margin-top:2px"><span class="prov">${p}</span></div>`).join("")}</div>`;
    return phone(`<div class="screen a"><div class="a-sky day" style="height:260px"></div>
      <div style="position:relative;padding-top:64px"><span class="iconbtn" style="margin-left:-12px">${icon.back(C.ink)}</span></div>
      <div class="a-head"><div><div class="name">Priya</div><div class="italic" style="margin-top:6px">${PRIYA.label} · Oakland</div></div>
        <div class="a-headsprig">${sprig("priya", 78, C.ink, { wash: .09 })}</div></div>
      <div class="a-ground" style="position:relative;height:40px;margin:0 -26px">${grass(393, 40, 9, C.ink, { opacity: .3 })}<div class="a-soil" style="bottom:0"></div></div>
      <div class="a-sections">
        ${sec("Lately", PRIYA.lately.slice(0, 2))}
        ${sec("Coming up", PRIYA.coming.slice(0, 2))}
        ${sec("You said you'd", PRIYA.said.slice(0, 1), "ochre")}
        ${sec("Between you", PRIYA.between.slice(0, 1))}
        <div class="ochre small" style="margin-top:18px;font-size:13px">What Kinship knows about Priya →</div></div>
      <div class="a-actions"><span class="pill">${icon.message("var(--onInk)")}Message</span><span class="pill quiet">${icon.phone(C.ink)}Call</span><span class="pill quiet">${icon.pen(C.ink)}Tell</span></div>
      </div>`, { night, id: "a-person" });
  };

  // ======================================================================
  // DIRECTION B · THE ILLUSTRATED STORYBOOK · "The Letter"
  // ======================================================================
  const B = {};
  const stamp = (id, size = 56) => `<span class="b-stamp" style="width:${size}px;height:${Math.round(size * 1.25)}px">${sprig(id, Math.round(size * .62), C.ink)}</span>`;
  B.today = function (night, variant = "moment") {
    const plate = variant === "birthday"
      ? `<div class="b-plate"><div class="b-art">${ill.candle(132, C.ink)}</div>${stamp("maya")}
          <div class="b-kicker">A birthday</div>
          <div class="b-display">It's Maya's birthday.</div>
          <div class="b-pull">Thirty-four, today.</div>
          <div style="margin-top:10px"><span class="prov">From Contacts</span></div>
          <div class="b-actions"><span class="pill">${icon.message("var(--onInk)")}Message Maya</span><span class="b-notnow">Not now</span></div></div>`
      : `<div class="b-plate"><div class="b-art">${ill.laurel(140, C.ink)}</div>${stamp("ben")}
          <div class="b-kicker">The day after</div>
          <div class="b-display">How did it go for Ben?</div>
          <div class="body" style="margin-top:10px">Ben runs Chicago Sunday · Sun, Oct 11</div>
          <div class="b-pull">“He was hoping to break four hours.”</div>
          <div style="margin-top:10px"><span class="prov">You told Kinship · Oct 8</span></div>
          <div class="b-actions"><span class="pill">${icon.message("var(--onInk)")}Ask how it went</span><span class="b-notnow">Not now</span></div></div>`;
    return phone(`<div class="screen b">
      <div class="b-top"><div class="b-dateline"><span class="b-orn">❧</span><span>Monday, the twelfth of October</span></div></div>
      <div class="b-greet">Good morning, Nico.</div>
      ${plate}
      <div class="b-rule"><span>also this week</span></div>
      <div class="b-index"><div class="b-ix"><span class="b-ixd">Wednesday</span><span class="b-ixl"></span><span class="line">Josh has his interview</span></div>
        <div class="b-ix"><span class="b-ixd">Saturday</span><span class="b-ixl"></span><span class="line">Maya's birthday</span></div></div>
      </div>${dock()}`, { night, id: `b-today${variant === "birthday" ? "-birthday" : ""}` });
  };
  B.people = function (night) {
    let out = "", last = "";
    for (const [id, name, line] of PEOPLE) {
      const L = name[0];
      if (L !== last) { out += `<div class="b-letter">${L}</div>`; last = L; }
      out += `<div class="b-entry">${stamp(id, 30)}<div><span class="moment" style="font-size:20px">${name}</span>${line ? `<div class="italic" style="margin-top:0;font-size:15px;line-height:21px">${line}</div>` : ""}</div></div>`;
    }
    return phone(`<div class="screen b">
      <div style="padding-top:70px;display:flex;gap:8px;align-items:center"><div class="tell" style="flex:1;height:50px;gap:8px">${icon.search(C.quiet)}Search your people</div><span class="iconbtn">${icon.plus(C.ink)}</span><span class="iconbtn">${icon.gear(C.quiet)}</span></div>
      <div class="b-dateline" style="margin-top:22px"><span class="b-orn">❧</span><span>An index of your people</span></div>
      <div class="b-entries">${out}</div>
      </div>${dock("people")}`, { night, id: "b-people" });
  };
  B.person = function (night) {
    const sec = (label, items, cls = "") => `<div class="b-sec"><div class="b-sech ${cls}">${label}</div>${items.map(([t, p]) => `<div class="line" style="margin-top:6px">${t}</div><div style="margin-top:2px"><span class="prov">${p}</span></div>`).join("")}</div>`;
    return phone(`<div class="screen b">
      <div style="padding-top:64px;display:flex;justify-content:space-between;align-items:center"><span class="iconbtn" style="margin-left:-12px">${icon.back(C.ink)}</span><span class="label">Chapter · P</span></div>
      <div class="b-chapter">${stamp("priya", 64)}<div class="name" style="font-size:44px;line-height:46px;margin-top:14px">Priya</div>
        <div class="italic" style="margin-top:8px">${PRIYA.label} · Oakland</div></div>
      <div class="b-rule"><span>lately</span></div>
      <div class="b-sec"><div class="b-drop"><span class="b-dc">P</span><span class="line">riya's dog Miso had a good vet checkup</span></div><div style="margin-top:2px"><span class="prov">You told Kinship · Oct 1</span></div>
        <div class="line" style="margin-top:8px">Priya is reading Piranesi</div><div style="margin-top:2px"><span class="prov">You told Kinship · Sep 29</span></div></div>
      <div class="b-rule"><span>coming up</span></div>
      ${sec("", PRIYA.coming.slice(0, 2))}
      <div class="b-rule"><span class="ochre">you said you'd</span></div>
      ${sec("", PRIYA.said.slice(0, 1))}
      <div class="b-rule"><span>between you</span></div>
      <div class="b-quote">“You two always get dosas on Shattuck.”</div><div style="margin-top:2px"><span class="prov">You told Kinship · Aug 14</span></div>
      <div class="a-actions"><span class="pill">${icon.message("var(--onInk)")}Message</span><span class="pill quiet">${icon.phone(C.ink)}Call</span><span class="pill quiet">${icon.pen(C.ink)}Tell</span></div>
      </div>`, { night, id: "b-person" });
  };

  // ======================================================================
  // DIRECTION C · THE PLAYFUL COMPANION · "The Desk"
  // ======================================================================
  const Cc = {};
  Cc.today = function (night, variant = "moment") {
    const slip = variant === "birthday"
      ? `<div class="c-slip" style="--rot:-1.4deg"><span class="c-pin"></span>
          <div class="c-sliphead">${sprig("maya", 40, C.ink)}<span class="label">Birthday</span></div>
          <div class="display" style="margin-top:12px">It's Maya's birthday.</div>
          <div style="margin-top:10px"><span class="prov">From Contacts</span></div></div>
         <div class="c-slip c-under" style="--rot:1.6deg"></div>
         <div class="c-btnrow"><span class="c-button">${icon.message("var(--onInk)", 18)}Message Maya</span><span class="c-hint">swipe to put aside →</span></div>`
      : `<div class="c-slip" style="--rot:-1.4deg"><span class="c-pin"></span>
          <div class="c-sliphead">${sprig("ben", 40, C.ink)}<span class="label">The day after</span></div>
          <div class="display" style="margin-top:12px">How did it go for Ben?</div>
          <div class="body" style="margin-top:10px">Ben runs Chicago Sunday · Sun, Oct 11</div>
          <div class="body ink" style="margin-top:4px">Ben was hoping to break four hours.</div>
          <div style="margin-top:10px"><span class="prov">You told Kinship · Oct 8</span></div></div>
         <div class="c-slip c-under" style="--rot:1.6deg"></div>
         <div class="c-btnrow"><span class="c-button">${icon.message("var(--onInk)", 18)}Ask how it went</span><span class="c-hint">swipe to put aside →</span></div>`;
    return phone(`<div class="screen c"><div class="c-grain"></div>
      <div style="position:relative;padding-top:88px;display:flex;justify-content:space-between;align-items:baseline"><div><div class="label">Monday, Oct 12</div><div class="greeting" style="margin-top:8px">Good morning, Nico.</div></div></div>
      <div class="c-desk">${slip}</div>
      <div class="c-tray"><div class="label">This week</div>
        <div class="c-tag"><span class="c-tagh"></span>${sprig("josh", 18, C.ink)}<span class="line" style="font-size:17px">Wed · Josh has his interview</span></div>
        <div class="c-tag"><span class="c-tagh"></span>${sprig("maya", 18, C.ink)}<span class="line" style="font-size:17px">Sat · Maya's birthday</span></div></div>
      </div>${dock("today", "Tell Kinship something…")}`, { night, id: `c-today${variant === "birthday" ? "-birthday" : ""}` });
  };
  Cc.people = function (night) {
    const tags = PEOPLE.map(([id, name, line], i) => `<div class="c-ptag" style="--rot:${((i * 7) % 5 - 2) * 0.5}deg"><span class="c-tagh big"></span>${sprig(id, 30, C.ink)}<div class="body ink" style="margin-top:8px;font-size:17px;line-height:22px">${name}</div>${line ? `<div class="small" style="margin-top:3px;font-size:12px">${line}</div>` : ""}</div>`).join("");
    return phone(`<div class="screen c"><div class="c-grain"></div>
      <div style="position:relative;padding-top:70px;display:flex;gap:8px;align-items:center"><div class="tell" style="flex:1;height:50px;gap:8px;box-shadow:inset 0 2px 4px rgba(29,34,30,.08)">${icon.search(C.quiet)}Search your people</div><span class="iconbtn">${icon.plus(C.ink)}</span><span class="iconbtn">${icon.gear(C.quiet)}</span></div>
      <div class="c-grid">${tags}</div>
      </div>${dock("people")}`, { night, id: "c-people" });
  };
  Cc.person = function (night) {
    const slip = (label, items, cls = "", rot = "-0.8deg") => `<div class="c-slip c-sec" style="--rot:${rot}"><span class="c-pin small"></span><div class="label ${cls}">${label}</div>${items.map(([t, p]) => `<div class="line" style="margin-top:6px">${t}</div><div style="margin-top:2px"><span class="prov">${p}</span></div>`).join("")}</div>`;
    return phone(`<div class="screen c"><div class="c-grain"></div>
      <div style="position:relative;padding-top:64px"><span class="iconbtn" style="margin-left:-12px">${icon.back(C.ink)}</span></div>
      <div class="c-nametag" style="--rot:-1deg"><span class="c-tagh big"></span><div style="display:flex;gap:16px;align-items:center">${sprig("priya", 48, C.ink)}<div><div class="name" style="font-size:36px;line-height:40px">Priya</div><div class="small" style="margin-top:4px">${PRIYA.label} · Oakland</div></div></div></div>
      <div class="c-stack">
        ${slip("Lately", PRIYA.lately.slice(0, 2), "", "0.7deg")}
        ${slip("Coming up", PRIYA.coming.slice(0, 2), "", "-0.9deg")}
        ${slip("You said you'd", PRIYA.said.slice(0, 1), "ochre", "0.5deg")}
      </div>
      <div class="a-actions c-actions"><span class="c-button">${icon.message("var(--onInk)", 18)}Message</span><span class="pill quiet">${icon.phone(C.ink)}Call</span><span class="pill quiet">${icon.pen(C.ink)}Tell</span></div>
      </div>`, { night, id: "c-person" });
  };

  window.DIRECTIONS = { currentToday, A, B, C: Cc, PEOPLE, HEDGE, PRIYA, phone, dock, hedgerow, status };
})();
