// Concept 3 · RINGS (the wild card: Connection Orbit's forms and palette, Postcards' warmth). Exploratory, unapproved.
// Today is a dial: thick arcs for the week, today at the top, a dot for each thing coming up placed by its DAY (never by importance),
// the Moment at the centre. The person's token is identity-only. No arc, dot or ring ever means closeness,
// frequency, health or rank; the dial is a calendar you can feel, not a graph.
(function () {
  const f = (n) => (Math.round(n * 10) / 10).toString();
  const C = { light: { sand: "#F7F4EA", navy: "#0B1F4D", blue: "#0B6BFF", sky: "#4CC3FF", orange: "#FF8A00", yellow: "#FFD338", pink: "#FF6BB5", white: "#FFFFFF", cream: "#FFF9E8" },
              dark: { sand: "#0B1F4D", navy: "#F7F4EA", blue: "#3D8BFF", sky: "#6FD0FF", orange: "#FF9A2E", yellow: "#FFD95C", pink: "#FF84C4", white: "#16305E", cream: "#122A58" } };
  const pol = (cx, cy, r, a) => [cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)];
  function arc(cx, cy, r, a0, a1, w, col, op = 1) { const [x0, y0] = pol(cx, cy, r, a0), [x1, y1] = pol(cx, cy, r, a1); const big = a1 - a0 > 180 ? 1 : 0; return `<path d="M${f(x0)} ${f(y0)}A${r} ${r} 0 ${big} 1 ${f(x1)} ${f(y1)}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-opacity="${op}"/>`; }
  const dayAngle = (dow, today) => -90 + (((dow - today) % 7 + 7) % 7) * (360 / 7); // today at the top; the dial turns as the week turns
  // the person's token: a disc split in two seeded colours with one satellite dot; one size for everyone
  function token(id, size = 44, dark = false) {
    const r = window.prng(window.seedOf(id)), c = dark ? C.dark : C.light, cols = [c.blue, c.sky, c.orange, c.yellow, c.pink];
    const a = cols[Math.floor(r() * 5)]; let b = cols[Math.floor(r() * 5)]; while (b === a) b = cols[Math.floor(r() * 5)];
    const split = Math.floor(r() * 360), sat = Math.floor(r() * 360), R = size / 2 - 2;
    const [sx, sy] = pol(0, 0, R, split), [ex, ey] = pol(0, 0, R, split + 180), [dx, dy] = pol(0, 0, R * 0.62, sat);
    return `<svg class="token" width="${size}" height="${size}" viewBox="${-size / 2} ${-size / 2} ${size} ${size}" aria-hidden="true"><circle r="${R}" fill="${a}"/><path d="M${f(sx)} ${f(sy)}A${R} ${R} 0 0 1 ${f(ex)} ${f(ey)}z" fill="${b}"/><circle cx="${f(dx)}" cy="${f(dy)}" r="${f(size * 0.11)}" fill="${dark ? "#0B1F4D" : "#FFF9E8"}"/></svg>`;
  }
  function dial(m, dark) {
    const c = dark ? C.dark : C.light, W = 393, H = 372, cx = 196, cy = 186, k = 0.86;
    let s = "";
    const R = (r) => Math.round(r * k);
    if (m.kind === "race") {
      s += arc(cx, cy, 164, -200, -20, 26, c.blue) + arc(cx, cy, 164, 10, 120, 26, c.sky) + arc(cx, cy, 132, 100, 330, 22, c.orange) + arc(cx, cy, 132, -40, 70, 22, c.white) + arc(cx, cy, 104, -130, 140, 18, c.yellow) + `<circle cx="${cx}" cy="${cy}" r="184" fill="none" stroke="${c.navy}" stroke-opacity=".18" stroke-width="1.5"/>`;
    } else if (m.kind === "birthday") {
      s += arc(cx, cy, 164, -220, 60, 26, c.orange) + arc(cx, cy, 164, 80, 130, 26, c.pink) + arc(cx, cy, 132, -60, 250, 22, c.yellow) + arc(cx, cy, 132, 260, 290, 22, c.blue) + arc(cx, cy, 104, 20, 330, 18, c.pink) + `<circle cx="${cx}" cy="${cy}" r="184" fill="none" stroke="${c.navy}" stroke-opacity=".18" stroke-width="1.5"/>`;
      for (const [a, rr, col, r2] of [[-150, 196, c.yellow, 7], [-30, 192, c.pink, 5], [40, 200, c.orange, 6], [150, 194, c.sky, 5], [100, 186, c.yellow, 4]]) { const [x, y] = pol(cx, cy, rr, a); s += `<circle cx="${f(x)}" cy="${f(y)}" r="${r2}" fill="${col}"/>`; }
    } else {
      s += arc(cx, cy, 164, -200, 120, 20, c.blue, 0.9) + arc(cx, cy, 132, 60, 330, 18, c.white) + arc(cx, cy, 104, -120, 110, 14, c.sky) + `<circle cx="${cx}" cy="${cy}" r="184" fill="none" stroke="${c.navy}" stroke-opacity=".18" stroke-width="1.5"/>`;
    }
    // the week's dots on the outer orbit, by day; a tick to the ring
    for (const w of m.week) { const a = dayAngle(w.dow, m.today), [x, y] = pol(cx, cy, 214, a), [tx, ty] = pol(cx, cy, 198, a); s += `<path d="M${f(tx)} ${f(ty)}L${f(x)} ${f(y)}" stroke="${c.navy}" stroke-width="2"/><circle cx="${f(x)}" cy="${f(y)}" r="10" fill="${c.white}" stroke="${c.navy}" stroke-width="3"/>`; }
    // today on the orbit
    const [tx, ty] = pol(cx, cy, 184, -90); s += `<circle cx="${f(tx)}" cy="${f(ty)}" r="13" fill="${c.yellow}" stroke="${c.navy}" stroke-width="3"/>`;
    // the centre
    s += `<circle cx="${cx}" cy="${cy}" r="82" fill="${c.cream}"/>`;
    return `<svg class="dial" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true"><g transform="translate(${cx} ${cy}) scale(${k}) translate(${-cx} ${-cy})">${s}</g></svg>`;
  }
  function render(stateKey, opts = {}) {
    const m = window.FX[stateKey], dark = !!opts.dark, kind = m.kind, c = dark ? C.dark : C.light;
    const centre = kind === "quiet" ? `<div class="centre"><div class="cq">Nothing needs you today.</div></div>` : `<div class="centre"><div class="ck">${m.kicker}</div><div class="cs">${m.statement}</div></div>`;
    const under = kind === "quiet" ? `<div class="under"><div class="kick">${m.kicker}</div></div>` : `<div class="under">
        <div class="who">${token(m.person, 44, dark)}<span>${m.name}</span></div>
        ${m.ctx ? `<div class="ctx">${m.ctx}</div>` : ""}${m.para ? `<div class="para">${m.para}</div>` : ""}
        <div class="prov">${m.prov}</div>
        <div class="acts"><button class="pill">${m.primary}</button><button class="notnow">Not now</button></div></div>`;
    return `<div class="phone rg kind-${kind} ${dark ? "dark" : ""} ${opts.reduce ? "reduce" : ""}">${window.STATUS}
      <div class="dayname">${m.day}</div><div class="datetag">${m.date.toUpperCase()}</div>
      <div class="dialwrap">${dial(m, dark)}${centre}</div>
      ${under}
      <div class="week">${m.week.map((w) => `<span class="chip"><i></i><b>${w.dn.toUpperCase()} ${w.d}</b>${w.text}</span>`).join("")}</div>
      <div class="tell">Tell Kinship something…</div>
      <div class="bar"><span class="on">Today</span><span>People</span></div><div class="home"></div></div>`;
  }
  window.RINGS = { render, token, dial, C };
})();
