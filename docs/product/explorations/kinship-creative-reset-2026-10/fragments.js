// Concept 2 · FRAGMENTS (the living scrapbook). Exploratory, unapproved.
// Today is a page in a scrapbook: cream paper, torn washi, a torn "photo" fragment that holds the person's
// name as the picture (the text-only fallback is the default; a photo the user added would sit in the same frame),
// a sticky note for what the user said, typed labels for what Kinship says. Handwriting = from your note; type = Kinship.
(function () {
  const f = (n) => (Math.round(n * 10) / 10).toString();
  const WASHI = { sun: "#FFD93B", coral: "#FF5C8A", lilac: "#C9A7FF", sky: "#4FC3FF", mint: "#7EE0A6", orange: "#FF8A3D" };
  // a torn rectangle: jittered edges, seeded, as an SVG path (w × h box, amp = tear depth)
  function tornPath(w, h, seed, amp = 6, step = 14) {
    const r = window.prng(seed), pts = [];
    const edge = (x0, y0, x1, y1) => { const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / step)); for (let i = 0; i < n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t; const dx = (r() - 0.5) * 2 * amp, dy = (r() - 0.5) * 2 * amp; pts.push([x + (y0 === y1 ? 0 : dx), y + (x0 === x1 ? 0 : dy)]); } };
    edge(0, 0, w, 0); edge(w, 0, w, h); edge(w, h, 0, h); edge(0, h, 0, 0);
    return "M" + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join("L") + "z";
  }
  // a fragment: white fibrous edge behind, the paper in front; content HTML on top
  function frag(w, h, seed, fill, inner, cls = "", amp = 6) {
    return `<div class="frag ${cls}" style="width:${w}px;height:${h}px"><svg width="${w + 16}" height="${h + 16}" viewBox="-8 -8 ${w + 16} ${h + 16}" aria-hidden="true"><path d="${tornPath(w + 6, h + 6, seed + 1, amp + 2, 11)}" transform="translate(-3 -3)" fill="#FFFFFF"/><path d="${tornPath(w, h, seed, amp)}" fill="${fill}"/></svg><div class="inner">${inner}</div></div>`;
  }
  const washi = (w, h, col, seed, rot, x, y, extra = "") => `<div class="washi" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;transform:rotate(${rot}deg);${extra}"><svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><path d="${tornPath(w, h, seed, 3, 9)}" fill="${col}" fill-opacity=".92"/></svg></div>`;
  const star = (x, y, s, col, rot = 0) => `<svg class="sticker" style="left:${x}px;top:${y}px;transform:rotate(${rot}deg)" width="${s}" height="${s}" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 4l13 31 34 3-26 22 8 33-29-18-29 18 8-33L3 38l34-3z" fill="${col}" stroke="#fff" stroke-width="6" stroke-linejoin="round"/></svg>`;
  const sparkle = (x, y, s, col) => `<svg class="sticker" style="left:${x}px;top:${y}px" width="${s}" height="${s}" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 2C54 36 64 46 98 50 64 54 54 64 50 98 46 64 36 54 2 50 36 46 46 36 50 2z" fill="${col}"/></svg>`;
  const tape = (text, x, y, rot, dark) => `<div class="tape" style="left:${x}px;top:${y}px;transform:rotate(${rot}deg)">${text}</div>`;
  // the photo frame's text-only picture: the name as the image, on a pastel ground with a tiny scene of doodles
  function picture(m, dark) {
    const g = m.kind === "birthday" ? "linear-gradient(160deg,#FFD93B,#FF8AB8 60%,#C9A7FF)" : m.kind === "race" ? "linear-gradient(160deg,#7EE0A6,#4FC3FF 70%,#C9A7FF)" : "linear-gradient(160deg,#FFF3C4,#E8E4FF)";
    const name = m.name ? `<div class="bigname">${m.name.toUpperCase()}</div>` : "";
    const line = m.kind === "quiet" ? `<div class="bigq">Nothing needs you today.</div>` : `<div class="bigline">${m.short}</div>`;
    const doodles = m.kind === "race" ? `<svg class="doodle" viewBox="0 0 120 60" width="120" height="60"><path d="M6 50q20-30 40-10t30-20 38 10" fill="none" stroke="#1E1E1E" stroke-width="4" stroke-linecap="round" stroke-dasharray="1 9"/><path d="M92 8h20v14h-20z" fill="#1E1E1E"/><path d="M92 8v44" stroke="#1E1E1E" stroke-width="4" stroke-linecap="round"/></svg>` : m.kind === "birthday" ? `<svg class="doodle" viewBox="0 0 120 60" width="120" height="60"><path d="M20 52h80M30 52V30h60v22M60 30V14M56 14q4-10 8 0" fill="none" stroke="#1E1E1E" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="60" cy="10" r="4" fill="#FF8A3D"/></svg>` : `<svg class="doodle" viewBox="0 0 120 60" width="120" height="60"><circle cx="60" cy="34" r="14" fill="none" stroke="#1E1E1E" stroke-width="4"/><path d="M60 8v6M60 54v6M34 34h6M80 34h6M42 16l4 4M74 52l4 4M42 52l4-4M74 16l4-4" stroke="#1E1E1E" stroke-width="4" stroke-linecap="round"/></svg>`;
    return `<div class="pic" style="background:${g}">${name}${line}${doodles}</div>`;
  }
  function render(stateKey, opts = {}) {
    const m = window.FX[stateKey], dark = !!opts.dark, kind = m.kind;
    const dateLabel = `${m.day.slice(0, 3).toUpperCase()}, ${m.date.toUpperCase()}`;
    // washi strips and stickers: the page's own decoration, the same placements every day (nothing varies with the person)
    let deco = washi(200, 46, WASHI.sun, 11, -6, -30, 96) + washi(150, 40, WASHI.sky, 23, 84, 372, 250) + washi(190, 42, kind === "quiet" ? WASHI.mint : WASHI.coral, 37, 5, 236, 724) + washi(120, 34, WASHI.lilac, 41, -14, -24, 640) + washi(96, 26, WASHI.sun, 51, -28, 36, 164);
    if (kind === "birthday") deco += star(306, 150, 64, WASHI.coral, 12) + star(16, 300, 44, WASHI.sun, -10) + sparkle(300, 446, 34, WASHI.sky) + sparkle(120, 128, 24, WASHI.lilac);
    else if (kind === "race") deco += sparkle(300, 436, 30, WASHI.sun) + star(318, 136, 48, WASHI.lilac, 14);
    else deco += sparkle(318, 300, 28, WASHI.coral) + star(28, 440, 40, WASHI.sky, -8);
    let flow = `<div class="hdr"><div class="today">Today</div><div class="date">${dateLabel}</div></div>`;
    if (kind !== "quiet") {
      flow += `<div class="main">${frag(318, 258, 7, "#FFFFFF", picture(m, dark), "photo", 7)}</div>`;
      if (m.ctx) flow += `<div class="tape">${m.ctx.toUpperCase()}</div>`;
      if (m.para) flow += `<div class="note">${frag(250, 58, 19, WASHI.lilac, `<div class="hand">${m.para}</div>`, "", 4)}</div>`;
      flow += `<div class="prov"><i></i>${m.prov}</div>`;
      flow += `<div class="acts"><button class="pill">${m.primary}</button><button class="notnow">Not now</button></div>`;
    } else {
      flow += `<div class="main quiet">${frag(300, 180, 7, "#FFFFFF", picture(m, dark), "photo", 7)}</div>`;
      flow += `<div class="note qn">${frag(240, 58, 29, WASHI.sun, `<div class="hand">${m.kicker}</div>`, "", 4)}</div>`;
    }
    flow += `<div class="week">${m.week.map((w, i) => frag(300, 36, 61 + i * 7, "#FFFFFF", `<span class="wd">${w.dn.toUpperCase()} ${w.d}</span><span class="wt">${w.text}</span>`, "scrap", 3)).join("")}</div>`;
    return `<div class="phone fr kind-${kind} ${dark ? "dark" : ""} ${opts.reduce ? "reduce" : ""}">${window.STATUS}<div class="page">${deco}<div class="flow">${flow}</div></div>
      <div class="tell"><span class="tapebit"></span>Tell Kinship something…</div>
      <div class="bar"><span class="on">Today</span><span>People</span></div><div class="home"></div></div>`;
  }
  window.FRAGMENTS = { render, tornPath, WASHI };
})();
