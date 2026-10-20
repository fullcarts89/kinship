// Concept 1 · OVERGROWN, refined (the electric garden, with the person at its centre). Exploratory, unapproved.
// The person is the headline: their name first, the grounded statement completing the sentence, their bloom (or their
// photo, if they chose one) grown into a small frame of leaves. Less scenery than the first pass; the story block is open
// paper, not a card. Verbatim words carry quotation marks and "From your note"; Kinship's paraphrase is italic without.
(function () {
  const f = (n) => (Math.round(n * 10) / 10).toString();
  const P = { light: { leafDeep: "#0B3D2E", leafMid: "#1E7A4E", leafBright: "#5CD36E", lime: "#B8F05A", orange: "#FF6A3D", red: "#FF3D2E", pink: "#FF4FA3", pinkLight: "#FFA6D2", yellow: "#FFD23F" },
              dark: { leafDeep: "#0E3F2C", leafMid: "#1F8A55", leafBright: "#6CE07A", lime: "#C8FF66", orange: "#FF7A4D", red: "#FF5A48", pink: "#FF6BB5", pinkLight: "#FFB3D9", yellow: "#FFDC5C" } };
  const defs = (c, id) => `<defs>
    <linearGradient id="${id}-leafA" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="${c.leafDeep}"/><stop offset=".55" stop-color="${c.leafMid}"/><stop offset="1" stop-color="${c.leafBright}"/></linearGradient>
    <linearGradient id="${id}-leafB" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c.leafBright}"/><stop offset="1" stop-color="${c.leafDeep}"/></linearGradient>
    <linearGradient id="${id}-stem" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${c.leafDeep}"/><stop offset="1" stop-color="${c.leafMid}"/></linearGradient>
    <linearGradient id="${id}-orange" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="${c.red}"/><stop offset="1" stop-color="${c.orange}"/></linearGradient>
    <linearGradient id="${id}-pink" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="${c.pink}"/><stop offset="1" stop-color="${c.pinkLight}"/></linearGradient>
    <linearGradient id="${id}-sage" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#4F7A6A"/><stop offset="1" stop-color="#B9D6C7"/></linearGradient>
    <radialGradient id="${id}-moon" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#FFF7D6"/><stop offset="1" stop-color="#F0D58A"/></radialGradient>
    <filter id="${id}-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 .5"/></feComponentTransfer></filter>
    <filter id="${id}-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="10"/></filter>
    <filter id="${id}-shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#0B3D2E" flood-opacity=".22"/></filter>
  </defs>`;
  function leaf(x, y, a, L, W, fill, rim, id) {
    const r = (a * Math.PI) / 180, ux = Math.cos(r), uy = Math.sin(r), nx = -uy, ny = ux;
    const tx = x + ux * L, ty = y + uy * L, m1x = x + ux * L * 0.45 + nx * W, m1y = y + uy * L * 0.45 + ny * W, m2x = x + ux * L * 0.45 - nx * W, m2y = y + uy * L * 0.45 - ny * W;
    const d = `M${f(x)} ${f(y)}Q${f(m1x)} ${f(m1y)} ${f(tx)} ${f(ty)}Q${f(m2x)} ${f(m2y)} ${f(x)} ${f(y)}z`;
    const rib = `M${f(x + ux * 6)} ${f(y + uy * 6)}L${f(x + ux * L * 0.82)} ${f(y + uy * L * 0.82)}`;
    const veins = [0.3, 0.5, 0.7].map((t) => { const px = x + ux * L * t, py = y + uy * L * t; return `M${f(px)} ${f(py)}l${f(nx * W * 0.55 + ux * L * 0.1)} ${f(ny * W * 0.55 + uy * L * 0.1)}M${f(px)} ${f(py)}l${f(-nx * W * 0.55 + ux * L * 0.1)} ${f(-ny * W * 0.55 + uy * L * 0.1)}`; }).join("");
    return `<g filter="url(#${id}-shadow)"><path d="${d}" fill="${fill}"/></g><path d="${d}" fill="none" stroke="${rim}" stroke-opacity=".35" stroke-width="2.5"/><path d="${rib}${veins}" fill="none" stroke="${rim}" stroke-opacity=".45" stroke-width="2" stroke-linecap="round"/>`;
  }
  const stem = (d, w, c, id) => `<path d="${d}" fill="none" stroke="url(#${id}-stem)" stroke-width="${w}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${c.leafBright}" stroke-opacity=".45" stroke-width="${w * 0.28}" stroke-linecap="round" transform="translate(-${w * 0.22} -${w * 0.22})"/>`;
  const berry = (x, y, r, col) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}"/><circle cx="${f(x - r * 0.3)}" cy="${f(y - r * 0.3)}" r="${f(r * 0.3)}" fill="#fff" fill-opacity=".55"/>`;
  // the person's bloom, seeded: petal count, two rings, hue pair, rotation. One size; nothing about history reaches it.
  function bloomSpec(id) { const r = window.prng(window.seedOf(id)); return { n: 6 + Math.floor(r() * 3), hue: Math.floor(r() * 360), hue2: (Math.floor(r() * 360) + 180) % 360, rot: r() * 360, shape: Math.floor(r() * 2) }; }
  function bigBloom(id, cx, cy, R, gid) {
    const b = bloomSpec(id), g = `${gid}-${window.seedOf(id)}`;
    let petals = "";
    const petal = (rr, rx, ry, fill, op = 1) => { let d = ""; for (let i = 0; i < b.n; i++) { const a = b.rot + (360 / b.n) * i; d += b.shape ? `<ellipse cx="0" cy="${f(-rr * 0.58)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}" fill-opacity="${op}" transform="rotate(${f(a)})"/>` : `<path d="M0 0C${f(-rx * 1.3)} ${f(-rr * 0.4)} ${f(-rx)} ${f(-rr)} 0 ${f(-rr * 1.05)}C${f(rx)} ${f(-rr)} ${f(rx * 1.3)} ${f(-rr * 0.4)} 0 0z" fill="${fill}" fill-opacity="${op}" transform="rotate(${f(a)})"/>`; } return d; };
    petals += petal(R, R * 0.34, R * 0.5, `url(#${g}-a)`) + `<g transform="rotate(${f(180 / b.n)})">${petal(R * 0.72, R * 0.26, R * 0.38, `url(#${g}-b)`, 0.95)}</g>`;
    return `<defs><linearGradient id="${g}-a" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="hsl(${b.hue} 80% 42%)"/><stop offset="1" stop-color="hsl(${b.hue} 95% 68%)"/></linearGradient><linearGradient id="${g}-b" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="hsl(${b.hue2} 85% 48%)"/><stop offset="1" stop-color="hsl(${b.hue2} 95% 72%)"/></linearGradient></defs>
      <g transform="translate(${cx} ${cy})" filter="url(#${gid}-shadow)">${petals}<circle r="${f(R * 0.22)}" fill="#141A16"/><circle r="${f(R * 0.09)}" cx="${f(-R * 0.06)}" cy="${f(-R * 0.07)}" fill="#fff" fill-opacity=".5"/></g>`;
  }
  // the photo frame: the same bloom's silhouette clips the person's chosen photo (a nested svg; a real file at photos/<id>.jpg
  // is drawn over the stand-in when it exists, and silently skipped when it does not)
  function photoFrame(id, cx, cy, R, gid) {
    const b = bloomSpec(id), m = `${gid}-mask-${window.seedOf(id)}`, S = R * 2.4;
    let d = "";
    // a clipPath takes shapes only (no groups), so every petal carries its own transform
    for (let i = 0; i < b.n; i++) { const a = b.rot + (360 / b.n) * i; d += `<ellipse cx="0" cy="${f(-R * 0.52)}" rx="${f(R * 0.46)}" ry="${f(R * 0.6)}" transform="translate(${cx} ${cy}) rotate(${f(a)})"/>`; }
    d += `<circle cx="${cx}" cy="${cy}" r="${f(R * 0.64)}"/>`;
    const inner = window.PHOTOS.person(S, S, `${gid}-${id}`).replace(/<svg [^>]*>/, "").replace("</svg>", "");
    return `<clipPath id="${m}">${d}</clipPath>
      <g filter="url(#${gid}-shadow)"><circle cx="${cx}" cy="${cy}" r="${f(R * 1.08)}" fill="#F2EFE8" fill-opacity=".001"/><g clip-path="url(#${m})"><g transform="translate(${f(cx - S / 2)} ${f(cy - S / 2)})"><svg width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${inner}</svg>${window.PHOTOS.file("person", id) ? `<image href="${window.PHOTOS.file("person", id)}" x="0" y="0" width="${S}" height="${S}" preserveAspectRatio="xMidYMid slice"/>` : ""}</g></g></g>
      <g clip-path="url(#${m})"><circle cx="${cx}" cy="${cy}" r="${f(R * 1.3)}" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="${f(R * 0.5)}"/></g>`;
  }
  function scene(m, opts) {
    const dark = !!opts.dark, c = dark ? P.dark : P.light, W = 393, H = opts.memoryPhoto ? 220 : 330, id = `og-${m.kind}-${opts.personPhoto ? "p" : "b"}-${dark ? "d" : "l"}`;
    let body = "", extra = "";
    const rim = c.lime;
    if (m.kind === "race" || m.kind === "birthday") {
      const bx = 292, by = opts.memoryPhoto ? 999 : 158, R = 78;
      if (!opts.memoryPhoto) {
        body += stem(`M${bx + 10} 330C${bx - 20} 280 ${bx - 10} 230 ${bx} 200`, 12, c, id);
        body += leaf(bx - 96, 232, -150, 96, 30, `url(#${id}-leafA)`, rim, id) + leaf(bx + 54, 240, 20, 92, 30, `url(#${id}-leafB)`, rim, id) + leaf(bx - 80, 112, -112, 84, 28, `url(#${id}-leafB)`, rim, id) + leaf(bx + 60, 100, -40, 86, 26, `url(#${id}-leafA)`, rim, id);
        if (m.kind === "birthday") { body += berry(bx - 112, 70, 7, c.yellow) + berry(bx + 102, 46, 6, c.yellow) + berry(bx + 118, 120, 5, c.yellow) + berry(bx - 124, 170, 5, c.yellow); }
        if (opts.personPhoto) { body += photoFrame(m.person, bx, by, R, id); body += leaf(bx + 44, by + 66, 34, 70, 22, `url(#${id}-leafA)`, rim, id); }
        else body += bigBloom(m.person, bx, by, R, id);
        if (m.kind === "race") body += berry(bx - 118, 96, 9, c.yellow) + berry(bx - 100, 72, 7, c.yellow);
      } else {
        body += leaf(-20, 196, -22, 96, 30, `url(#${id}-leafA)`, rim, id) + leaf(412, 150, 198, 100, 32, `url(#${id}-leafB)`, rim, id);
      }
    } else {
      body += `<circle cx="300" cy="96" r="46" fill="url(#${id}-moon)"/><circle cx="300" cy="96" r="70" fill="${c.yellow}" opacity=".12" filter="url(#${id}-soft)"/>`;
      body += `<path d="M380 330C360 270 330 230 326 180" fill="none" stroke="url(#${id}-sage)" stroke-width="12" stroke-linecap="round"/>` + leaf(330, 230, 24, 88, 28, `url(#${id}-sage)`, "#DCEBE2", id) + leaf(342, 300, 166, 92, 30, `url(#${id}-sage)`, "#DCEBE2", id) + leaf(400, 170, 200, 100, 32, `url(#${id}-sage)`, "#DCEBE2", id);
    }
    return `<svg class="scenesvg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">${defs(c, id)}${extra}<g>${body}</g><rect width="${W}" height="${H}" filter="url(#${id}-grain)" opacity="${dark ? ".2" : ".2"}" style="mix-blend-mode:${dark ? "screen" : "multiply"}; pointer-events:none"/></svg>`;
  }
  const dayRow = (w) => `<div class="row ${w.own ? "own" : ""}"><span class="dn">${w.dn.toUpperCase()} ${w.d}</span><span class="tx">${w.text}</span></div>`;
  function render(stateKey, opts = {}) {
    const m = window.FX[stateKey], dark = !!opts.dark, kind = m.kind, hasName = !!m.name;
    const memo = opts.memoryPhoto && m.memory;
    const story = m.primary ? `<div class="story">
        ${m.ctx ? `<div class="ctx">${m.ctx}</div>` : ""}
        ${m.para ? `<div class="para">${m.para}</div>` : ""}
        ${memo ? `<div class="clip cap">“${m.memory.caption}”<span class="src"><i></i>${m.memory.cprov.toUpperCase()} · ${m.memory.attached}</span></div>` : m.quote && !m.dense ? `<div class="clip">“${m.quote}”<span class="src"><i></i>${m.qprov.toUpperCase()}</span></div>` : `<div class="prov"><i></i>${m.prov}</div>`}
        <div class="acts"><button class="pill">${m.primary}</button><button class="notnow">Not now</button></div>
      </div>` : `<div class="story quiet"><div class="kick2">${m.kicker}</div></div>`;
    const week = `<div class="week ${m.dense ? "dense" : ""}">${m.dense ? `<div class="lbl">This week</div><div class="row waiting"><span class="dn">${m.waiting.dn.toUpperCase()} ${m.waiting.d}</span><span class="tx"><small>${m.waiting.sub}</small>${m.waiting.text}</span></div>` : ""}${m.week.map(dayRow).join("")}${m.more ? `<div class="more">and ${m.more} more</div>` : ""}</div>`;
    const head = hasName ? `${m.kicker ? `<div class="kick">${m.kicker}</div>` : ""}<h1 class="name">${m.name}</h1><div class="stmt">${m.short}.</div>` : `<h1 class="name q">Nothing needs<br>you today.</h1>`;
    return `<div class="phone og kind-${kind} ${dark ? "dark" : ""} ${opts.reduce ? "reduce" : ""} ${opts.personPhoto ? "has-photo" : ""} ${memo ? "has-memory" : ""} ${m.dense ? "dense" : ""}">${window.STATUS}
      ${memo ? `<div class="memphoto">${window.PHOTOS.slot("memory", m.person, 393, 230)}</div>` : ""}
      <div class="scene">${scene(m, opts)}</div>
      <div class="date">${m.day.slice(0, 3).toUpperCase()} · ${m.date.toUpperCase()}</div>
      <div class="col"><div class="head">${head}</div>${story}${week}</div>
      <div class="tell"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 22c0-8 3-13 10-18-7 1-12 5-14 12"/><path d="M12 22c0-6-2-9-6-12"/></svg>Tell Kinship something…</div>
      <div class="bar"><span class="on">Today</span><span>People</span></div><div class="home"></div>
    </div>`;
  }
  window.OVERGROWN = { render, scene, bigBloom, P };
})();
