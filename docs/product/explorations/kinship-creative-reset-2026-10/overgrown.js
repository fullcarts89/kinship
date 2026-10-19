// Concept 1 · OVERGROWN (the electric garden, reimagined). Exploratory, unapproved.
// Today is a scene: oversized grainy botanicals, the headline set into the plants, one label card for
// the facts and the action. Every plant is scenery for the kind of day; the person's bloom is the only
// per-person mark and it is identity-only (seeded from the id, one size).
(function () {
  const f = (n) => (Math.round(n * 10) / 10).toString();
  const P = { light: { ground: "#F2EFE8", ink: "#141A16", violet: "#6B4DFF", leafDeep: "#0B3D2E", leafMid: "#1E7A4E", leafBright: "#5CD36E", lime: "#B8F05A", orange: "#FF6A3D", red: "#FF3D2E", pink: "#FF4FA3", pinkLight: "#FFA6D2", yellow: "#FFD23F", card: "#FFFFFF" },
              dark: { ground: "#0C1711", ink: "#F1F0E8", violet: "#B7A5FF", leafDeep: "#0E3F2C", leafMid: "#1F8A55", leafBright: "#6CE07A", lime: "#C8FF66", orange: "#FF7A4D", red: "#FF5A48", pink: "#FF6BB5", pinkLight: "#FFB3D9", yellow: "#FFDC5C", card: "#16261D" } };
  const defs = (c) => `<defs>
    <linearGradient id="og-leafA" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="${c.leafDeep}"/><stop offset=".55" stop-color="${c.leafMid}"/><stop offset="1" stop-color="${c.leafBright}"/></linearGradient>
    <linearGradient id="og-leafB" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c.leafBright}"/><stop offset="1" stop-color="${c.leafDeep}"/></linearGradient>
    <linearGradient id="og-stem" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${c.leafDeep}"/><stop offset="1" stop-color="${c.leafMid}"/></linearGradient>
    <linearGradient id="og-orange" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="${c.red}"/><stop offset="1" stop-color="${c.orange}"/></linearGradient>
    <linearGradient id="og-pink" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="${c.pink}"/><stop offset="1" stop-color="${c.pinkLight}"/></linearGradient>
    <linearGradient id="og-sage" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#4F7A6A"/><stop offset="1" stop-color="#B9D6C7"/></linearGradient>
    <linearGradient id="og-sageB" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#A9C9B8"/><stop offset="1" stop-color="#3F6657"/></linearGradient>
    <radialGradient id="og-moon" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#FFF7D6"/><stop offset="1" stop-color="#F0D58A"/></radialGradient>
    <filter id="og-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch" result="n"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 .5"/></feComponentTransfer></filter>
    <filter id="og-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="10"/></filter>
  </defs>`;
  // a fat leaf from (x,y) along angle a (deg), length L, width W, with a lighter rim and a midrib
  function leaf(x, y, a, L, W, fill, rim) {
    const r = (a * Math.PI) / 180, ux = Math.cos(r), uy = Math.sin(r), nx = -uy, ny = ux;
    const tx = x + ux * L, ty = y + uy * L, m1x = x + ux * L * 0.45 + nx * W, m1y = y + uy * L * 0.45 + ny * W, m2x = x + ux * L * 0.45 - nx * W, m2y = y + uy * L * 0.45 - ny * W;
    const d = `M${f(x)} ${f(y)}Q${f(m1x)} ${f(m1y)} ${f(tx)} ${f(ty)}Q${f(m2x)} ${f(m2y)} ${f(x)} ${f(y)}z`;
    const rib = `M${f(x + ux * 6)} ${f(y + uy * 6)}L${f(x + ux * L * 0.82)} ${f(y + uy * L * 0.82)}`;
    return `<path d="${d}" fill="${fill}"/><path d="${d}" fill="none" stroke="${rim}" stroke-opacity=".35" stroke-width="3"/><path d="${rib}" fill="none" stroke="${rim}" stroke-opacity=".5" stroke-width="2.5" stroke-linecap="round"/>`;
  }
  const stem = (d, w, c) => `<path d="${d}" fill="none" stroke="url(#og-stem)" stroke-width="${w}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${c.leafBright}" stroke-opacity=".45" stroke-width="${w * 0.28}" stroke-linecap="round" transform="translate(-${w * 0.22} -${w * 0.22})"/>`;
  const berry = (x, y, r, col) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}"/><circle cx="${f(x - r * 0.3)}" cy="${f(y - r * 0.3)}" r="${f(r * 0.3)}" fill="#fff" fill-opacity=".55"/>`;
  function tulip(x, y, s, grad) { // the race flower: a bold three-petal cup
    return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-46 -10C-52 30 -30 54 0 58C30 54 52 30 46 -10C30 10 12 14 0 -6C-12 14 -30 10 -46 -10z" fill="${grad}"/><path d="M0 -6C-14 20 -16 44 0 58C16 44 14 20 0 -6z" fill="#fff" fill-opacity=".25"/><path d="M-46 -10Q-40 -40 -20 -46Q-6 -30 0 -6" fill="${grad}" opacity=".9"/><path d="M46 -10Q40 -40 20 -46Q6 -30 0 -6" fill="${grad}" opacity=".9"/></g>`;
  }
  function bloom(x, y, R, n, grad, centre) { // a round flower of n fat petals
    let d = "";
    for (let i = 0; i < n; i++) { const a = (360 / n) * i; d += `<ellipse cx="0" cy="${f(-R * 0.58)}" rx="${f(R * 0.3)}" ry="${f(R * 0.5)}" fill="${grad}" transform="rotate(${a})"/>`; }
    return `<g transform="translate(${x} ${y})">${d}<circle r="${f(R * 0.26)}" fill="${centre}"/><circle r="${f(R * 0.1)}" cx="${f(-R * 0.07)}" cy="${f(-R * 0.08)}" fill="#fff" fill-opacity=".5"/></g>`;
  }
  // the person's bloom: identity only (petal count, shape, hue pair from the id; one size)
  function mark(id, size = 44) {
    const r = window.prng(window.seedOf(id)), n = 5 + Math.floor(r() * 4), hue = Math.floor(r() * 360), hue2 = (hue + 40 + Math.floor(r() * 40)) % 360, rot = r() * 360;
    const gid = `og-m-${window.seedOf(id)}`;
    let d = "";
    for (let i = 0; i < n; i++) d += `<ellipse cx="0" cy="${f(-size * 0.3)}" rx="${f(size * 0.15)}" ry="${f(size * 0.26)}" fill="url(#${gid})" transform="rotate(${f(rot + (360 / n) * i)})"/>`;
    return `<svg class="mark" width="${size}" height="${size}" viewBox="${-size / 2} ${-size / 2} ${size} ${size}" aria-hidden="true"><defs><linearGradient id="${gid}" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="hsl(${hue} 85% 45%)"/><stop offset="1" stop-color="hsl(${hue2} 95% 65%)"/></linearGradient></defs>${d}<circle r="${f(size * 0.13)}" fill="#141A16"/></svg>`;
  }
  function scene(kind, dark) {
    const c = dark ? P.dark : P.light, W = 393, H = 540;
    let body = "";
    const petal = (x, y, a, L, W, g) => `<g transform="translate(${x} ${y}) rotate(${a})"><path d="M0 0C${f(-W)} ${f(-L * 0.35)} ${f(-W * 0.9)} ${f(-L * 0.8)} 0 ${f(-L)}C${f(W * 0.9)} ${f(-L * 0.8)} ${f(W)} ${f(-L * 0.35)} 0 0z" fill="${g}"/><path d="M0 -6C${f(-W * 0.35)} ${f(-L * 0.4)} ${f(-W * 0.2)} ${f(-L * 0.75)} 0 ${f(-L * 0.92)}" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="4" stroke-linecap="round"/></g>`;
    if (kind === "race") {
      body += leaf(-30, 300, -28, 210, 66, "url(#og-leafA)", c.lime) + leaf(-10, 520, -62, 190, 60, "url(#og-leafB)", c.lime);
      body += stem(`M40 580C60 440 110 340 170 262C212 206 250 176 322 134`, 22, c);
      body += leaf(132, 318, -152, 150, 48, "url(#og-leafA)", c.lime) + leaf(170, 262, 24, 136, 42, "url(#og-leafB)", c.lime) + leaf(252, 176, 148, 110, 34, "url(#og-leafA)", c.lime) + leaf(72, 470, -118, 170, 56, "url(#og-leafB)", c.lime);
      body += stem(`M410 560C380 450 350 400 338 300C332 250 338 200 330 150`, 16, c) + leaf(344, 300, 38, 100, 32, "url(#og-leafA)", c.lime) + leaf(362, 420, 158, 120, 38, "url(#og-leafB)", c.lime) + leaf(420, 220, 200, 120, 40, "url(#og-leafA)", c.lime);
      body += petal(410, 60, 160, 150, 60, "url(#og-pink)") + petal(430, 150, 110, 140, 56, "url(#og-orange)") + petal(372, 20, 200, 120, 50, "url(#og-orange)");
      body += tulip(318, 126, 1.0, "url(#og-orange)");
      body += berry(204, 150, 11, c.yellow) + berry(224, 126, 8, c.yellow) + berry(244, 150, 9, c.yellow) + berry(88, 120, 7, c.yellow) + berry(104, 96, 10, c.yellow);
      body += leaf(16, 580, -74, 130, 46, "url(#og-leafA)", c.lime);
    } else if (kind === "birthday") {
      body += leaf(-20, 330, -30, 200, 64, "url(#og-leafB)", c.lime) + leaf(-10, 540, -64, 180, 58, "url(#og-leafA)", c.lime);
      body += stem(`M60 580C70 440 120 380 180 300C230 236 262 200 262 160`, 18, c);
      body += leaf(130, 360, -160, 130, 42, "url(#og-leafB)", c.lime) + leaf(180, 300, 20, 120, 38, "url(#og-leafA)", c.lime) + leaf(40, 500, -110, 150, 50, "url(#og-leafA)", c.lime);
      body += stem(`M390 560C370 460 320 420 322 330C324 280 350 240 350 200`, 14, c) + leaf(326, 330, 30, 90, 28, "url(#og-leafB)", c.lime) + leaf(340, 440, 165, 100, 34, "url(#og-leafA)", c.lime) + leaf(416, 300, 196, 110, 36, "url(#og-leafB)", c.lime);
      body += petal(60, 80, -40, 150, 58, "url(#og-orange)") + petal(20, 160, -70, 120, 50, "url(#og-pink)");
      body += bloom(262, 128, 96, 8, "url(#og-pink)", c.yellow) + bloom(356, 200, 50, 7, "url(#og-orange)", c.yellow) + bloom(150, 150, 30, 6, "url(#og-orange)", c.yellow);
      for (const [x, y, r] of [[80, 230, 5], [140, 70, 7], [330, 60, 6], [120, 210, 4], [206, 60, 5], [300, 300, 4], [48, 260, 6], [372, 90, 5]]) body += berry(x, y, r, c.yellow);
    } else { // quiet: the garden at rest, sage and a low sun
      body += `<circle cx="300" cy="120" r="54" fill="url(#og-moon)"/><circle cx="300" cy="120" r="78" fill="${c.yellow}" opacity=".12" filter="url(#og-soft)"/>`;
      body += leaf(-20, 320, -30, 190, 60, "url(#og-sage)", "#DCEBE2") + `<path d="M40 580C50 440 100 360 160 290C200 242 230 210 262 180" fill="none" stroke="url(#og-sage)" stroke-width="16" stroke-linecap="round"/>`;
      body += leaf(126, 345, -158, 130, 40, "url(#og-sage)", "#DCEBE2") + leaf(160, 290, 18, 112, 34, "url(#og-sageB)", "#DCEBE2") + leaf(50, 500, -112, 150, 48, "url(#og-sage)", "#DCEBE2");
      body += `<path d="M400 560C380 470 340 430 336 340C334 290 352 250 356 220" fill="none" stroke="url(#og-sage)" stroke-width="12" stroke-linecap="round"/>` + leaf(340, 340, 32, 84, 26, "url(#og-sageB)", "#DCEBE2") + leaf(352, 450, 162, 92, 30, "url(#og-sage)", "#DCEBE2") + leaf(420, 230, 198, 100, 34, "url(#og-sage)", "#DCEBE2");
    }
    return `<svg class="scenesvg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">${defs(c)}<g>${body}</g><rect width="${W}" height="${H}" filter="url(#og-grain)" opacity="${dark ? ".22" : ".24"}" style="mix-blend-mode:${dark ? "screen" : "multiply"}"/></svg>`;
  }
  function render(stateKey, opts = {}) {
    const m = window.FX[stateKey], dark = !!opts.dark, kind = m.kind;
    const card = m.primary ? `<div class="card">
        <div class="who">${mark(m.person)}<span>${m.name}</span></div>
        ${m.ctx ? `<div class="ctx">${m.ctx}</div>` : ""}
        ${m.para ? `<div class="para">${m.para}</div>` : ""}
        <div class="prov"><i></i>${m.prov}</div>
        <div class="acts"><button class="pill">${m.primary}</button><button class="notnow">Not now</button></div>
      </div>` : "";
    return `<div class="phone og kind-${kind} ${dark ? "dark" : ""} ${opts.reduce ? "reduce" : ""}">${window.STATUS}
      <div class="scene">${scene(kind, dark)}</div>
      <div class="date">${m.day.slice(0, 3).toUpperCase()} · ${m.date.toUpperCase()}</div>
      ${m.kicker ? `<div class="kicker">${m.kicker}</div>` : ""}
      <h1 class="head">${m.statement}</h1>
      ${card}
      <div class="week">${m.week.map((w) => `<span class="seed"><b>${w.dn.toUpperCase()} ${w.d}</b>${w.text}</span>`).join("")}</div>
      <div class="tell"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 22c0-8 3-13 10-18-7 1-12 5-14 12"/><path d="M12 22c0-6-2-9-6-12"/></svg>Tell Kinship something…</div>
      <div class="bar"><span class="on">Today</span><span>People</span></div><div class="home"></div>
    </div>`;
  }
  window.OVERGROWN = { render, mark, scene, P };
})();
