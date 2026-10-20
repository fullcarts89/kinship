// Concept 2 · FRAGMENTS, refined (the living scrapbook, grown up). Exploratory, unapproved.
// A page about one person. The torn plate is the picture: the person's photo if they chose one, otherwise a typographic
// plate in a duotone that is theirs (two colours from the id; the same layout for everyone). One strip of washi, no stickers
// except one small star on a birthday, no handwriting anywhere: verbatim words are a typed clipping with quotation marks
// and "From your note"; Kinship's paraphrase is italic serif without quotes; the user's photo caption is "Your caption".
(function () {
  const f = (n) => (Math.round(n * 10) / 10).toString();
  const DUO = [["#0F3D3E", "#F2A07B"], ["#3A1F4E", "#FFB7A5"], ["#14402A", "#D9F46B"], ["#0B1F4D", "#8FD3FF"], ["#7A2E1D", "#FFD37A"], ["#4B2A7A", "#FF9FC2"]];
  const duo = (id) => DUO[window.seedOf(id) % DUO.length];
  function tornPath(w, h, seed, amp = 5, step = 14) {
    const r = window.prng(seed), pts = [];
    const edge = (x0, y0, x1, y1) => { const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / step)); for (let i = 0; i < n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t; const dx = (r() - 0.5) * 2 * amp, dy = (r() - 0.5) * 2 * amp; pts.push([x + (y0 === y1 ? 0 : dx), y + (x0 === x1 ? 0 : dy)]); } };
    edge(0, 0, w, 0); edge(w, 0, w, h); edge(w, h, 0, h); edge(0, h, 0, 0);
    return "M" + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join("L") + "z";
  }
  function frag(w, h, seed, fill, inner, cls = "", amp = 5) {
    return `<div class="frag ${cls}" style="width:${w}px;height:${h}px"><svg width="${w + 16}" height="${h + 16}" viewBox="-8 -8 ${w + 16} ${h + 16}" aria-hidden="true"><path d="${tornPath(w + 6, h + 6, seed + 1, amp + 2, 11)}" transform="translate(-3 -3)" fill="#FFFFFF"/><path d="${tornPath(w, h, seed, amp)}" fill="${fill}"/></svg><div class="inner">${inner}</div></div>`;
  }
  const washi = (w, h, col, seed, rot, x, y) => `<div class="washi" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;transform:rotate(${rot}deg)"><svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><path d="${tornPath(w, h, seed, 3, 9)}" fill="${col}" fill-opacity=".9"/></svg></div>`;
  const star = (x, y, s, col, rot = 0) => `<svg class="sticker" style="left:${x}px;top:${y}px;transform:rotate(${rot}deg)" width="${s}" height="${s}" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 4l13 31 34 3-26 22 8 33-29-18-29 18 8-33L3 38l34-3z" fill="${col}" stroke="#fff" stroke-width="6" stroke-linejoin="round"/></svg>`;
  // one fine line drawing per kind of day, drawn in the plate's light colour
  const line = (kind, col) => kind === "race" ? `<svg class="line" viewBox="0 0 120 70" width="120" height="70"><path d="M4 58c18-26 36-6 54-22s28-10 56-4" fill="none" stroke="${col}" stroke-width="1.6" stroke-dasharray="1 7" stroke-linecap="round"/><path d="M98 10h16v12H98zM98 10v46" fill="none" stroke="${col}" stroke-width="1.6" stroke-linejoin="round"/></svg>` : kind === "birthday" ? `<svg class="line" viewBox="0 0 120 70" width="120" height="70"><path d="M20 60h80M30 60V36h60v24M60 36V18M57 18q3-8 6 0" fill="none" stroke="${col}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="60" cy="13" r="3" fill="${col}"/></svg>` : `<svg class="line" viewBox="0 0 120 70" width="120" height="70"><circle cx="60" cy="38" r="14" fill="none" stroke="${col}" stroke-width="1.6"/><path d="M60 12v6M60 58v6M34 38h6M80 38h6M42 20l4 4M74 56l4 4M42 56l4-4M74 20l4-4" stroke="${col}" stroke-width="1.6" stroke-linecap="round"/></svg>`;
  function plate(m, opts) {
    const [a, b] = m.person ? duo(m.person) : ["#E9E2D6", "#F7F2E8"];
    const isQuiet = m.kind === "quiet";
    const ground = opts.personPhoto && m.person ? window.PHOTOS.slot("person", m.person, 330, 250) + `<div class="scrim"></div>` : `<div class="duo" style="background:linear-gradient(155deg,${a},${b})"></div><div class="grainy"></div>`;
    const txt = isQuiet ? `<div class="pq">Nothing needs you today.</div>` : `<div class="pn">${m.name}</div><div class="ps">${m.short}.</div>`;
    const light = opts.personPhoto ? "#FFFFFF" : isQuiet ? "#5B5650" : b;
    return `<div class="pic ${opts.personPhoto ? "isphoto" : ""} ${isQuiet ? "isquiet" : ""}" style="--light:${light}">${ground}${opts.memoryPhoto ? "" : line(m.kind, light)}${txt}</div>`;
  }
  const slip = (w, seed, inner, cls = "") => frag(w, 34, seed, "#FFFFFF", inner, "slip " + cls, 3);
  function render(stateKey, opts = {}) {
    const m = window.FX[stateKey], dark = !!opts.dark, kind = m.kind, memo = opts.memoryPhoto && m.memory;
    const dateLabel = `${m.day.toUpperCase()} · ${m.date.toUpperCase()}`;
    let deco = washi(170, 22, kind === "quiet" ? "#BFE3D0" : "#D7C9F2", 11, -4, -16, 110);
    if (kind === "birthday") deco += star(318, 92, 44, "#E85D6A", 12);
    let flow = `<div class="hdr"><div class="date">${dateLabel}</div>${m.kicker && m.name ? `<div class="kick">${m.kicker}</div>` : ""}</div>`;
    if (kind !== "quiet") {
      flow += `<div class="main">${frag(330, 250, 7, "#FFFFFF", plate(m, opts), "photo", 6)}${memo ? `<div class="memo">${frag(138, 104, 33, "#FFFFFF", `<div class="pic small">${window.PHOTOS.slot("memory", m.person, 138, 104)}</div>`, "photo", 5)}</div>` : ""}</div>`;
      if (memo) flow += `<div class="clip cap">“${m.memory.caption}”<span class="src">${m.memory.cprov.toUpperCase()} · ${m.memory.attached}</span></div>`;
      else if (m.quote && !m.dense) flow += `<div class="clip">“${m.quote}”<span class="src">${m.qprov.toUpperCase()}</span></div>`;
      if (m.para) flow += `<div class="para">${m.para}</div>`;
      flow += `<div class="ctxrow">${m.ctx ? `<span class="ctx">${m.ctx.toUpperCase()}</span>` : ""}${(!m.quote || m.dense || memo) ? `<span class="src solo">${m.prov.toUpperCase()}</span>` : ""}</div>`;
      flow += `<div class="acts"><button class="pill">${m.primary}</button><button class="notnow">Not now</button></div>`;
    } else {
      flow += `<div class="main quiet">${frag(300, 170, 7, "#FFFFFF", plate(m, opts), "photo", 6)}</div><div class="para q">${m.kicker}</div>`;
    }
    const rows = (m.dense ? [{ ...m.waiting, waiting: true }, ...m.week] : m.week).map((w, i) => slip(w.waiting ? 300 : 280 + (i % 2) * 16, 61 + i * 7, `<span class="wd ${w.own ? "own" : ""}">${w.dn.toUpperCase()} ${w.d}</span><span class="wt">${w.waiting ? `<small>${w.sub} · </small>` : ""}${w.text}</span>`)).join("");
    flow += `<div class="week">${rows}${m.more ? `<div class="more">and ${m.more} more</div>` : ""}</div>`;
    return `<div class="phone fr kind-${kind} ${dark ? "dark" : ""} ${opts.reduce ? "reduce" : ""} ${m.dense ? "dense" : ""} ${memo ? "has-memory" : ""}">${window.STATUS}<div class="page">${deco}<div class="flow">${flow}</div></div>
      <div class="tell"><span class="tapebit"></span>Tell Kinship something…</div>
      <div class="bar"><span class="on">Today</span><span>People</span></div><div class="home"></div></div>`;
  }
  window.FRAGMENTS = { render, tornPath, duo };
})();
