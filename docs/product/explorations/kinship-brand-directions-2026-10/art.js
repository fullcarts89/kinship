// Original artwork for the six brand directions (19 Oct 2026). Exploratory, unapproved.
// Every person mark is a pure function of the person's id (FNV-1a seed) and is drawn at one fixed size
// per place: nothing about history, recency, contact or "closeness" can reach it (D8). Occasion art
// is one drawing per kind of reason, never per person, and none exists for a sensitive reason.
(function () {
  const f = (n) => (Math.round(n * 10) / 10).toString();
  function seedOf(id) { let h = 0x811c9dc5; for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; }
  function prng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
  const svg = (w, h, inner, extra = "") => `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true" focusable="false"${extra}>${inner}</svg>`;

  // ---------------------------------------------------------------- B · Bloom (the electric garden)
  const BLOOM = { petals: ["#FF4D2E", "#FFB300", "#3D5AFE", "#FF7AB6", "#B48CFF", "#1F8A4C", "#FF8A3D", "#17B6C9"], centers: ["#1A1A1A", "#FFF6E5", "#FFB300", "#FF4D2E"] };
  // A flat flower: 5–8 petals, one of three petal shapes, two colours. Always the same radius.
  function bloomMark(id, size = 40) {
    const r = prng(seedOf(id)), n = 5 + Math.floor(r() * 4), shape = Math.floor(r() * 3);
    const pc = pick(r, BLOOM.petals); let cc = pick(r, BLOOM.centers); if (cc === pc) cc = "#1A1A1A";
    const rot = r() * 360, cx = size / 2, cy = size / 2, R = size * 0.46, pr = size * 0.19;
    let d = "";
    for (let i = 0; i < n; i++) {
      const a = rot + (360 / n) * i;
      if (shape === 0) d += `<ellipse cx="${f(cx)}" cy="${f(cy - R * 0.55)}" rx="${f(pr * 0.78)}" ry="${f(R * 0.5)}" transform="rotate(${f(a)} ${cx} ${cy})"/>`;
      else if (shape === 1) d += `<path d="M${f(cx)} ${f(cy)}q${f(-pr)} ${f(-R * 0.5)} 0 ${f(-R)}q${f(pr)} ${f(R * 0.5)} 0 ${f(R)}z" transform="rotate(${f(a)} ${cx} ${cy})"/>`;
      else d += `<path d="M${f(cx)} ${f(cy)}c${f(-pr * 1.3)} ${f(-R * 0.3)} ${f(-pr * 1.1)} ${f(-R)} 0 ${f(-R * 0.98)}c${f(pr * 1.1)} ${f(-R * 0.02)} ${f(pr * 1.3)} ${f(R * 0.7)} 0 ${f(R * 0.98)}z" transform="rotate(${f(a)} ${cx} ${cy})"/>`;
    }
    return svg(size, size, `<g fill="${pc}">${d}</g><circle cx="${cx}" cy="${cy}" r="${f(size * 0.14)}" fill="${cc}"/>`, ' class="mark bloom"');
  }
  // Occasion art, flat and large. One per kind.
  function bloomArt(kind, size = 150) {
    const s = size, c = s / 2;
    if (kind === "race") { // a bold wreath of flat leaves in two greens
      let d = "";
      for (const side of [-1, 1]) for (let i = 0; i < 7; i++) {
        const t = i / 6, a = side * (-20 + t * 150), rr = s * 0.36;
        const x = c + Math.cos((a - 90) * Math.PI / 180) * rr, y = c + Math.sin((a - 90) * Math.PI / 180) * rr;
        d += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(s * 0.07)}" ry="${f(s * 0.13)}" fill="${i % 2 ? "#1F8A4C" : "#5FD068"}" transform="rotate(${f(a + side * 40)} ${f(x)} ${f(y)})"/>`;
      }
      return svg(s, s, d + `<circle cx="${c}" cy="${f(s * 0.9)}" r="${f(s * 0.06)}" fill="#FF4D2E"/>`);
    }
    if (kind === "birthday") return svg(s, s, `<rect x="${f(s * 0.2)}" y="${f(s * 0.52)}" width="${f(s * 0.6)}" height="${f(s * 0.36)}" rx="${f(s * 0.06)}" fill="#FF7AB6"/><rect x="${f(s * 0.2)}" y="${f(s * 0.52)}" width="${f(s * 0.6)}" height="${f(s * 0.12)}" rx="${f(s * 0.06)}" fill="#FFF6E5" fill-opacity=".6"/><rect x="${f(c - s * 0.03)}" y="${f(s * 0.3)}" width="${f(s * 0.06)}" height="${f(s * 0.24)}" fill="#3D5AFE"/><ellipse cx="${c}" cy="${f(s * 0.22)}" rx="${f(s * 0.06)}" ry="${f(s * 0.09)}" fill="#FFB300"/><circle cx="${f(s * 0.14)}" cy="${f(s * 0.2)}" r="${f(s * 0.04)}" fill="#FF4D2E"/><circle cx="${f(s * 0.86)}" cy="${f(s * 0.34)}" r="${f(s * 0.035)}" fill="#1F8A4C"/><circle cx="${f(s * 0.78)}" cy="${f(s * 0.12)}" r="${f(s * 0.045)}" fill="#B48CFF"/>`);
    if (kind === "wedding") return svg(s, s, `<circle cx="${f(s * 0.4)}" cy="${f(s * 0.52)}" r="${f(s * 0.24)}" fill="none" stroke="#FFB300" stroke-width="${f(s * 0.08)}"/><circle cx="${f(s * 0.62)}" cy="${f(s * 0.52)}" r="${f(s * 0.24)}" fill="none" stroke="#FF4D2E" stroke-width="${f(s * 0.08)}"/><circle cx="${f(s * 0.51)}" cy="${f(s * 0.14)}" r="${f(s * 0.05)}" fill="#3D5AFE"/>`);
    if (kind === "promise") return svg(s, s, `<path d="M${f(c)} ${f(c)}c${f(-s * 0.3)} ${f(-s * 0.36)} ${f(-s * 0.46)} ${f(-s * 0.02)} ${f(-s * 0.12)} ${f(s * 0.02)}c${f(s * 0.34)} ${f(0.04 * s)} ${f(s * 0.16)} ${f(-s * 0.36)} ${f(-s * 0.12)} ${f(-s * 0.02)}` + `M${f(c)} ${f(c)}c${f(s * 0.3)} ${f(-s * 0.36)} ${f(s * 0.46)} ${f(-s * 0.02)} ${f(s * 0.12)} ${f(s * 0.02)}c${f(-s * 0.34)} ${f(0.04 * s)} ${f(-s * 0.16)} ${f(-s * 0.36)} ${f(s * 0.12)} ${f(-s * 0.02)}" fill="#FFB300"/><path d="M${f(c)} ${f(c)}l${f(-s * 0.14)} ${f(s * 0.36)}M${f(c)} ${f(c)}l${f(s * 0.16)} ${f(s * 0.34)}" stroke="#FF4D2E" stroke-width="${f(s * 0.07)}" stroke-linecap="round"/><circle cx="${c}" cy="${c}" r="${f(s * 0.07)}" fill="#1A1A1A"/>`);
    return "";
  }
  // Petal confetti for a celebration only (never a hard time): fixed, seeded, not random.
  function bloomPetals(w, h, seed = 3) {
    const r = prng(seed); let d = "";
    for (let i = 0; i < 14; i++) { const x = r() * w, y = r() * h, a = r() * 360, col = pick(r, BLOOM.petals); d += `<ellipse class="petal" style="--i:${i}" cx="${f(x)}" cy="${f(y)}" rx="4" ry="7" fill="${col}" fill-opacity=".85" transform="rotate(${f(a)} ${f(x)} ${f(y)})"/>`; }
    return svg(w, h, d, ' class="petals" preserveAspectRatio="none"');
  }

  // ---------------------------------------------------------------- C · Keepsake (the scrapbook)
  const KEEP = { paper: ["#BFE3D0", "#FBE8A6", "#F6C9C9", "#C9DDF2", "#E6D3F2", "#FFD9B3"], ink: "#2B2622" };
  // A hand-cut sticker: circle, scallop, tilted square or burst, in one washi colour, with the initial in ink.
  function stickerMark(id, size = 40, name = "") {
    const r = prng(seedOf(id)), shape = Math.floor(r() * 4), col = pick(r, KEEP.paper), tilt = (r() - 0.5) * 16;
    const c = size / 2, R = size * 0.46; let d = "";
    if (shape === 0) d = `<circle cx="${c}" cy="${c}" r="${f(R)}"/>`;
    else if (shape === 1) { let p = `M${f(c + R * 0.86)} ${f(c)}`; for (let i = 0; i < 12; i++) { const a2 = ((i + 0.5) / 12) * Math.PI * 2, a1 = ((i + 1) / 12) * Math.PI * 2; p += `Q${f(c + Math.cos(a2) * R * 1.1)} ${f(c + Math.sin(a2) * R * 1.1)} ${f(c + Math.cos(a1) * R * 0.86)} ${f(c + Math.sin(a1) * R * 0.86)}`; } d = `<path d="${p}z"/>`; }
    else if (shape === 2) d = `<rect x="${f(c - R * 0.86)}" y="${f(c - R * 0.86)}" width="${f(R * 1.72)}" height="${f(R * 1.72)}" rx="${f(R * 0.25)}" transform="rotate(${f(tilt)} ${c} ${c})"/>`;
    else { let p = ""; for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2, rr = i % 2 ? R : R * 0.78; p += `${i ? "L" : "M"}${f(c + Math.cos(a) * rr)} ${f(c + Math.sin(a) * rr)}`; } d = `<path d="${p}z"/>`; }
    const letter = (name || id)[0].toUpperCase();
    return svg(size, size, `<g fill="${col}" stroke="#FFFCF5" stroke-width="2">${d}</g><text x="${c}" y="${f(c + size * 0.16)}" text-anchor="middle" font-family="Caveat, cursive" font-weight="700" font-size="${f(size * 0.5)}" fill="${KEEP.ink}" transform="rotate(${f(tilt / 2)} ${c} ${c})">${letter}</text>`, ' class="mark sticker"');
  }
  // Washi tape, a torn edge, a doodle. The jitter is seeded so the page draws the same every time.
  function tape(w = 70, h = 20, col = "#FBE8A6", seed = 1) { const r = prng(seed); const a = (r() - 0.5) * 10; return svg(w + 10, h + 10, `<rect x="5" y="5" width="${w}" height="${h}" fill="${col}" fill-opacity=".85" transform="rotate(${f(a)} ${w / 2 + 5} ${h / 2 + 5})"/><path d="M5 5v${h}M${w + 5} 5v${h}" stroke="#FFFCF5" stroke-width="1" stroke-dasharray="2 2" transform="rotate(${f(a)} ${w / 2 + 5} ${h / 2 + 5})"/>`, ' class="tape"'); }
  function doodle(kind, size = 120, ink = KEEP.ink) {
    const s = size, c = s / 2, r = prng(7), j = () => (r() - 0.5) * s * 0.02;
    const st = `fill="none" stroke="${ink}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"`;
    if (kind === "birthday") return svg(s, s, `<path d="M${f(c + j())} ${f(s * 0.12)}c${f(s * 0.22)} 0 ${f(s * 0.26)} ${f(s * 0.24)} ${f(s * 0.1)} ${f(s * 0.42)}c${f(-s * 0.06)} ${f(s * 0.06)} ${f(-s * 0.14)} ${f(s * 0.06)} ${f(-s * 0.2)} 0c${f(-s * 0.16)} ${f(-s * 0.18)} ${f(-s * 0.12)} ${f(-s * 0.42)} ${f(s * 0.1)} ${f(-s * 0.42)}z" fill="#F6C9C9" stroke="${ink}" stroke-width="2.2"/><path d="M${f(c + j())} ${f(s * 0.55)}q${f(-s * 0.08)} ${f(s * 0.15)} ${f(s * 0.02)} ${f(s * 0.3)}q${f(s * 0.06)} ${f(s * 0.08)} ${f(-s * 0.03)} ${f(s * 0.12)}" ${st}/><path d="M${f(s * 0.16)} ${f(s * 0.3)}l${f(s * 0.05)} ${f(-s * 0.05)}M${f(s * 0.8)} ${f(s * 0.26)}l${f(s * 0.06)} ${f(-s * 0.04)}M${f(s * 0.84)} ${f(s * 0.5)}l${f(s * 0.07)} 0" ${st}/>`);
    if (kind === "race") return svg(s, s, `<path d="M${f(s * 0.2)} ${f(s * 0.9)}L${f(s * 0.2)} ${f(s * 0.14)}" ${st}/><path d="M${f(s * 0.22)} ${f(s * 0.16)}h${f(s * 0.56)}v${f(s * 0.34)}h${f(-s * 0.56)}z" fill="#FFFCF5" stroke="${ink}" stroke-width="2.2"/>${[0, 1, 2, 3].map((i) => [0, 1, 2].map((k) => ((i + k) % 2 ? `<rect x="${f(s * 0.22 + i * s * 0.14)}" y="${f(s * 0.16 + k * s * 0.113)}" width="${f(s * 0.14)}" height="${f(s * 0.113)}" fill="${ink}"/>` : "")).join("")).join("")}<path d="M${f(s * 0.3)} ${f(s * 0.92)}q${f(s * 0.2)} ${f(-s * 0.1)} ${f(s * 0.5)} 0" ${st} stroke-dasharray="4 5"/>`);
    if (kind === "wedding") return svg(s, s, `<circle cx="${f(s * 0.4)}" cy="${f(s * 0.55)}" r="${f(s * 0.22)}" ${st}/><circle cx="${f(s * 0.6)}" cy="${f(s * 0.55)}" r="${f(s * 0.22)}" ${st}/><path d="M${f(s * 0.5)} ${f(s * 0.18)}l${f(s * 0.04)} ${f(s * 0.08)}l${f(s * 0.08)} 0l${f(-s * 0.06)} ${f(s * 0.05)}l${f(s * 0.02)} ${f(s * 0.08)}l${f(-s * 0.08)} ${f(-s * 0.05)}l${f(-s * 0.08)} ${f(s * 0.05)}l${f(s * 0.02)} ${f(-s * 0.08)}l${f(-s * 0.06)} ${f(-s * 0.05)}l${f(s * 0.08)} 0z" fill="#FBE8A6" stroke="${ink}" stroke-width="2"/>`);
    if (kind === "promise") return svg(s, s, `<path d="M${f(s * 0.5)} ${f(s * 0.5)}c${f(-s * 0.3)} ${f(-s * 0.34)} ${f(-s * 0.46)} 0 ${f(-s * 0.12)} ${f(s * 0.04)}c${f(s * 0.32)} ${f(s * 0.04)} ${f(s * 0.16)} ${f(-s * 0.36)} ${f(-s * 0.12)} ${f(-s * 0.04)}M${f(s * 0.5)} ${f(s * 0.5)}c${f(s * 0.3)} ${f(-s * 0.34)} ${f(s * 0.46)} 0 ${f(s * 0.12)} ${f(s * 0.04)}c${f(-s * 0.32)} ${f(s * 0.04)} ${f(-s * 0.16)} ${f(-s * 0.36)} ${f(s * 0.12)} ${f(-s * 0.04)}M${f(s * 0.5)} ${f(s * 0.5)}l${f(-s * 0.1)} ${f(s * 0.36)}M${f(s * 0.5)} ${f(s * 0.5)}l${f(s * 0.14)} ${f(s * 0.34)}" ${st}/>`);
    return "";
  }

  // ---------------------------------------------------------------- D · Orbit (connected worlds)
  const ORB = { light: ["#FF5C7A", "#6E5CFF", "#34E0D0", "#FFB547", "#C6FF3D"], dark: ["#FF7A92", "#8E80FF", "#4AF0E0", "#FFC46A", "#D2FF5C"] };
  // Three overlapping discs in one of four fixed arrangements. Equal diameter for everyone; no edges, no graph.
  function orbitMark(id, size = 40, night = false) {
    const r = prng(seedOf(id)), cols = night ? ORB.dark : ORB.light, arr = Math.floor(r() * 4);
    const c = size / 2, R = size * 0.27;
    const P = [[[-0.18, -0.12], [0.18, -0.12], [0, 0.18]], [[-0.2, 0], [0, 0], [0.2, 0]], [[-0.14, -0.14], [0.14, 0.14], [0.14, -0.14]], [[0, -0.18], [-0.16, 0.12], [0.16, 0.12]]][arr];
    const c1 = pick(r, cols); let c2 = pick(r, cols); while (c2 === c1) c2 = pick(r, cols); let c3 = pick(r, cols); while (c3 === c1 || c3 === c2) c3 = pick(r, cols);
    const cs = [c1, c2, c3];
    const d = P.map((p, i) => `<circle cx="${f(c + p[0] * size)}" cy="${f(c + p[1] * size)}" r="${f(R)}" fill="${cs[i]}" fill-opacity=".82"/>`).join("");
    return svg(size, size, `<g style="mix-blend-mode:${night ? "screen" : "multiply"}">${d}</g>`, ' class="mark orbit"');
  }
  function orbitArt(kind, size = 150, night = false) {
    const s = size, c = s / 2, cols = night ? ORB.dark : ORB.light;
    if (kind === "race") return svg(s, s, `<path d="M${f(s * 0.14)} ${f(s * 0.7)}A${f(s * 0.38)} ${f(s * 0.38)} 0 1 1 ${f(s * 0.86)} ${f(s * 0.7)}" fill="none" stroke="${cols[1]}" stroke-width="${f(s * 0.09)}" stroke-linecap="round" stroke-dasharray="${f(s * 0.3)} ${f(s * 0.08)}"/><circle cx="${f(s * 0.86)}" cy="${f(s * 0.7)}" r="${f(s * 0.09)}" fill="${cols[0]}"/>`);
    if (kind === "birthday") return svg(s, s, [0.44, 0.32, 0.2].map((k, i) => `<circle cx="${c}" cy="${c}" r="${f(s * k)}" fill="none" stroke="${cols[(i + 3) % 5]}" stroke-width="${f(s * 0.05)}" stroke-opacity="${1 - i * 0.2}"/>`).join("") + `<circle cx="${c}" cy="${c}" r="${f(s * 0.08)}" fill="${cols[0]}"/>`);
    if (kind === "wedding") return svg(s, s, `<g style="mix-blend-mode:${night ? "screen" : "multiply"}"><circle cx="${f(s * 0.4)}" cy="${c}" r="${f(s * 0.28)}" fill="${cols[0]}" fill-opacity=".8"/><circle cx="${f(s * 0.6)}" cy="${c}" r="${f(s * 0.28)}" fill="${cols[1]}" fill-opacity=".8"/></g>`);
    if (kind === "promise") return svg(s, s, `<path d="M${f(s * 0.2)} ${f(c)}q${f(s * 0.3)} ${f(-s * 0.5)} ${f(s * 0.6)} 0q${f(-s * 0.3)} ${f(s * 0.5)} ${f(-s * 0.6)} 0z" fill="none" stroke="${cols[3]}" stroke-width="${f(s * 0.07)}" stroke-linejoin="round"/><circle cx="${c}" cy="${c}" r="${f(s * 0.06)}" fill="${cols[0]}"/>`);
    return "";
  }
  // A big disc bleeding off a corner of the room: atmosphere, one per screen, the same every day.
  function orbitDisc(w, h, col, x, y, R) { return svg(w, h, `<circle cx="${x}" cy="${y}" r="${R}" fill="${col}" fill-opacity=".22"/>`, ' class="disc"'); }

  // ---------------------------------------------------------------- E · Postmark (postcards and places)
  const POST = { cols: ["#D7382D", "#2A6FB8", "#E8B23A", "#2E6B4F", "#F2A28B", "#1E2A3A"] };
  const GLYPHS = {
    sun: (s, c) => `<circle cx="${s / 2}" cy="${s / 2}" r="${f(s * 0.2)}" fill="${c}"/>` + [0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<rect x="${f(s / 2 - s * 0.03)}" y="${f(s * 0.1)}" width="${f(s * 0.06)}" height="${f(s * 0.12)}" fill="${c}" transform="rotate(${a} ${s / 2} ${s / 2})"/>`).join(""),
    mountain: (s, c) => `<path d="M${f(s * 0.1)} ${f(s * 0.82)}L${f(s * 0.42)} ${f(s * 0.26)}L${f(s * 0.6)} ${f(s * 0.56)}L${f(s * 0.7)} ${f(s * 0.44)}L${f(s * 0.9)} ${f(s * 0.82)}z" fill="${c}"/>`,
    wave: (s, c) => `<path d="M${f(s * 0.1)} ${f(s * 0.55)}q${f(s * 0.1)} ${f(-s * 0.16)} ${f(s * 0.2)} 0t${f(s * 0.2)} 0t${f(s * 0.2)} 0t${f(s * 0.2)} 0v${f(s * 0.25)}h${f(-s * 0.8)}z" fill="${c}"/>`,
    tree: (s, c) => `<path d="M${f(s / 2)} ${f(s * 0.14)}L${f(s * 0.78)} ${f(s * 0.62)}H${f(s * 0.22)}z" fill="${c}"/><rect x="${f(s * 0.45)}" y="${f(s * 0.62)}" width="${f(s * 0.1)}" height="${f(s * 0.22)}" fill="${c}"/>`,
    house: (s, c) => `<path d="M${f(s * 0.2)} ${f(s * 0.5)}L${f(s / 2)} ${f(s * 0.2)}L${f(s * 0.8)} ${f(s * 0.5)}V${f(s * 0.84)}H${f(s * 0.2)}z" fill="${c}"/><rect x="${f(s * 0.44)}" y="${f(s * 0.6)}" width="${f(s * 0.12)}" height="${f(s * 0.24)}" fill="#F7F1E3"/>`,
    moon: (s, c) => `<path d="M${f(s * 0.58)} ${f(s * 0.16)}A${f(s * 0.34)} ${f(s * 0.34)} 0 1 0 ${f(s * 0.58)} ${f(s * 0.84)}A${f(s * 0.3)} ${f(s * 0.3)} 0 0 0 ${f(s * 0.58)} ${f(s * 0.16)}z" fill="${c}"/>`,
    bird: (s, c) => `<path d="M${f(s * 0.12)} ${f(s * 0.5)}q${f(s * 0.19)} ${f(-s * 0.2)} ${f(s * 0.38)} 0q${f(s * 0.19)} ${f(-s * 0.2)} ${f(s * 0.38)} 0" fill="none" stroke="${c}" stroke-width="${f(s * 0.09)}" stroke-linecap="round"/>`,
  };
  // A square stamp with a perforated edge, a ground colour and one glyph. Every stamp is the same size.
  function stampMark(id, size = 40) {
    const r = prng(seedOf(id)), g = pick(r, Object.keys(GLYPHS)); const bg = pick(r, POST.cols); let fg = pick(r, POST.cols); while (fg === bg) fg = pick(r, POST.cols);
    const s = size, p = s * 0.06; let holes = "";
    for (let i = 0; i <= 6; i++) { const t = (i / 6) * s; holes += `<circle cx="${f(t)}" cy="0" r="${f(p)}"/><circle cx="${f(t)}" cy="${s}" r="${f(p)}"/><circle cx="0" cy="${f(t)}" r="${f(p)}"/><circle cx="${s}" cy="${f(t)}" r="${f(p)}"/>`; }
    return svg(s, s, `<defs><mask id="m${seedOf(id)}"><rect width="${s}" height="${s}" fill="#fff"/><g fill="#000">${holes}</g></mask></defs><rect width="${s}" height="${s}" fill="#F7F1E3" mask="url(#m${seedOf(id)})"/><rect x="${f(s * 0.1)}" y="${f(s * 0.1)}" width="${f(s * 0.8)}" height="${f(s * 0.8)}" fill="${bg}"/><g transform="translate(${f(s * 0.1)} ${f(s * 0.1)}) scale(.8)">${GLYPHS[g](s, fg === "#1E2A3A" && bg === "#1E2A3A" ? "#F7F1E3" : fg)}</g>`, ' class="mark stamp"');
  }
  // A postmark: a circle with the date, the only place a date is drawn as a graphic.
  function postmark(text, size = 64, col = "#1E2A3A") { const s = size; return svg(s, s, `<circle cx="${s / 2}" cy="${s / 2}" r="${f(s * 0.46)}" fill="none" stroke="${col}" stroke-width="1.6"/><circle cx="${s / 2}" cy="${s / 2}" r="${f(s * 0.36)}" fill="none" stroke="${col}" stroke-width="1"/><text x="${s / 2}" y="${f(s * 0.46)}" text-anchor="middle" font-family="'Bricolage Grotesque', sans-serif" font-weight="700" font-size="${f(s * 0.17)}" fill="${col}">${text}</text><text x="${s / 2}" y="${f(s * 0.64)}" text-anchor="middle" font-family="'Bricolage Grotesque', sans-serif" font-size="${f(s * 0.12)}" letter-spacing="1" fill="${col}">KINSHIP</text><path d="M${f(s * 0.72)} ${f(s * 0.3)}h${f(s * 0.26)}M${f(s * 0.74)} ${f(s * 0.5)}h${f(s * 0.26)}M${f(s * 0.72)} ${f(s * 0.7)}h${f(s * 0.26)}" stroke="${col}" stroke-width="1.4" stroke-linecap="round"/>`, ' class="postmark"'); }
  // Poster graphics for the front of a card: flat, two or three colours, big shapes.
  function postArt(kind, w = 300, h = 150) {
    if (kind === "race") return svg(w, h, `<rect width="${w}" height="${h}" fill="#2A6FB8"/><circle cx="${f(w * 0.72)}" cy="${f(h * 0.36)}" r="${f(h * 0.22)}" fill="#E8B23A"/><path d="M0 ${f(h * 0.72)}Q${f(w * 0.3)} ${f(h * 0.5)} ${f(w * 0.55)} ${f(h * 0.66)}T${w} ${f(h * 0.58)}V${h}H0z" fill="#2E6B4F"/><path d="M0 ${h}L${f(w * 0.42)} ${f(h * 0.74)}L${f(w * 0.6)} ${f(h * 0.74)}L${w} ${h}z" fill="#F7F1E3"/><path d="M${f(w * 0.5)} ${f(h * 0.76)}v${f(h * 0.24)}" stroke="#D7382D" stroke-width="3" stroke-dasharray="6 4"/>`, ' preserveAspectRatio="none"');
    if (kind === "birthday") return svg(w, h, `<rect width="${w}" height="${h}" fill="#F2A28B"/><rect x="${f(w * 0.3)}" y="${f(h * 0.5)}" width="${f(w * 0.4)}" height="${f(h * 0.36)}" fill="#D7382D"/><rect x="${f(w * 0.3)}" y="${f(h * 0.5)}" width="${f(w * 0.4)}" height="${f(h * 0.1)}" fill="#F7F1E3"/><rect x="${f(w * 0.49)}" y="${f(h * 0.26)}" width="${f(w * 0.02)}" height="${f(h * 0.24)}" fill="#1E2A3A"/><ellipse cx="${f(w * 0.5)}" cy="${f(h * 0.2)}" rx="${f(w * 0.02)}" ry="${f(h * 0.07)}" fill="#E8B23A"/>${[0.12, 0.2, 0.82, 0.9].map((x, i) => `<circle cx="${f(w * x)}" cy="${f(h * (0.2 + (i % 2) * 0.3))}" r="${f(h * 0.04)}" fill="${["#2A6FB8", "#E8B23A", "#2E6B4F", "#2A6FB8"][i]}"/>`).join("")}`, ' preserveAspectRatio="none"');
    if (kind === "wedding") return svg(w, h, `<rect width="${w}" height="${h}" fill="#2E6B4F"/><circle cx="${f(w * 0.44)}" cy="${f(h * 0.5)}" r="${f(h * 0.26)}" fill="none" stroke="#E8B23A" stroke-width="10"/><circle cx="${f(w * 0.56)}" cy="${f(h * 0.5)}" r="${f(h * 0.26)}" fill="none" stroke="#F7F1E3" stroke-width="10"/>`, ' preserveAspectRatio="none"');
    if (kind === "promise") return svg(w, h, `<rect width="${w}" height="${h}" fill="#E8B23A"/><rect x="${f(w * 0.2)}" y="${f(h * 0.3)}" width="${f(w * 0.6)}" height="${f(h * 0.4)}" fill="#F7F1E3"/><path d="M${f(w * 0.2)} ${f(h * 0.3)}L${f(w * 0.5)} ${f(h * 0.55)}L${f(w * 0.8)} ${f(h * 0.3)}" fill="none" stroke="#1E2A3A" stroke-width="3"/>`, ' preserveAspectRatio="none"');
    return "";
  }

  // ---------------------------------------------------------------- F · Woven (the friendship bracelet)
  const FLOSS = ["#F25C54", "#F7B32B", "#2BB3A3", "#2D5BE3", "#B5307A", "#9BCB3C", "#FF8A5C", "#6A4CE0"];
  // A band of fixed length and three colours in one of four weaves (chevron, stripe, diamond, dot).
  // Width is set by the place it sits in, never by the person.
  function bandMark(id, w = 64, h = 14, opts = {}) {
    const r = prng(seedOf(id)), weave = Math.floor(r() * 4);
    const a = pick(r, FLOSS); let b = pick(r, FLOSS); while (b === a) b = pick(r, FLOSS); let c = pick(r, FLOSS); while (c === a || c === b) c = pick(r, FLOSS);
    const cs = [a, b, c], n = Math.max(6, Math.round(w / (h * 0.9))), seg = w / n; let d = "";
    for (let i = 0; i < n; i++) {
      const x = i * seg, col = cs[i % 3];
      if (weave === 0) d += `<path d="M${f(x)} 0h${f(seg)}l${f(-seg / 2)} ${f(h / 2)}l${f(seg / 2)} ${f(h / 2)}h${f(-seg)}l${f(seg / 2)} ${f(-h / 2)}z" fill="${col}"/>`;
      else if (weave === 1) d += `<rect x="${f(x)}" y="0" width="${f(seg + 0.5)}" height="${h}" fill="${col}"/>`;
      else if (weave === 2) d += `<rect x="${f(x)}" y="0" width="${f(seg + 0.5)}" height="${h}" fill="${cs[0]}"/><path d="M${f(x + seg / 2)} ${f(h * 0.1)}L${f(x + seg * 0.95)} ${f(h / 2)}L${f(x + seg / 2)} ${f(h * 0.9)}L${f(x + seg * 0.05)} ${f(h / 2)}z" fill="${i % 2 ? cs[1] : cs[2]}"/>`;
      else d += `<rect x="${f(x)}" y="0" width="${f(seg + 0.5)}" height="${h}" fill="${i % 2 ? cs[0] : cs[1]}"/>${i % 2 ? "" : `<circle cx="${f(x + seg / 2)}" cy="${f(h / 2)}" r="${f(h * 0.22)}" fill="${cs[2]}"/>`}`;
    }
    const ends = opts.knot ? `<circle cx="2" cy="${h / 2}" r="${f(h * 0.42)}" fill="${cs[2]}"/><circle cx="${f(w - 2)}" cy="${h / 2}" r="${f(h * 0.42)}" fill="${cs[2]}"/>` : "";
    return svg(w, h, `<defs><clipPath id="b${seedOf(id)}${w}"><rect width="${w}" height="${h}" rx="${f(h / 2)}"/></clipPath></defs><g clip-path="url(#b${seedOf(id)}${w})">${d}</g>${ends}`, ` class="mark band" style="border-radius:${h / 2}px"`);
  }
  // Charms: a few beads strung for a celebration. None for a hard time.
  function charms(kind, size = 120) {
    const s = size, y = s * 0.5;
    const bead = (x, col, r = s * 0.07) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${col}"/>`;
    const thread = `<path d="M${f(s * 0.05)} ${f(y)}Q${f(s * 0.5)} ${f(y + s * 0.12)} ${f(s * 0.95)} ${f(y)}" fill="none" stroke="#22201E" stroke-width="2" stroke-linecap="round"/>`;
    if (kind === "birthday") return svg(s, s, thread + bead(s * 0.2, "#F25C54") + bead(s * 0.35, "#F7B32B") + `<path d="M${f(s * 0.5)} ${f(y - s * 0.12)}l${f(s * 0.035)} ${f(s * 0.08)}l${f(s * 0.085)} 0l${f(-s * 0.068)} ${f(s * 0.05)}l${f(s * 0.026)} ${f(s * 0.085)}l${f(-s * 0.078)} ${f(-s * 0.05)}l${f(-s * 0.078)} ${f(s * 0.05)}l${f(s * 0.026)} ${f(-s * 0.085)}l${f(-s * 0.068)} ${f(-s * 0.05)}l${f(s * 0.085)} 0z" fill="#2BB3A3"/>` + bead(s * 0.66, "#B5307A") + bead(s * 0.8, "#2D5BE3"));
    if (kind === "race") return svg(s, s, thread + bead(s * 0.22, "#2BB3A3") + bead(s * 0.37, "#9BCB3C") + `<rect x="${f(s * 0.46)}" y="${f(y - s * 0.09)}" width="${f(s * 0.14)}" height="${f(s * 0.14)}" rx="2" fill="#22201E"/><rect x="${f(s * 0.46)}" y="${f(y - s * 0.09)}" width="${f(s * 0.07)}" height="${f(s * 0.07)}" fill="#FBF7F0"/><rect x="${f(s * 0.53)}" y="${f(y - s * 0.02)}" width="${f(s * 0.07)}" height="${f(s * 0.07)}" fill="#FBF7F0"/>` + bead(s * 0.7, "#F7B32B") + bead(s * 0.84, "#F25C54"));
    if (kind === "wedding") return svg(s, s, thread + bead(s * 0.25, "#F7B32B") + `<circle cx="${f(s * 0.47)}" cy="${f(y)}" r="${f(s * 0.1)}" fill="none" stroke="#F7B32B" stroke-width="4"/><circle cx="${f(s * 0.58)}" cy="${f(y)}" r="${f(s * 0.1)}" fill="none" stroke="#F25C54" stroke-width="4"/>` + bead(s * 0.8, "#2BB3A3"));
    if (kind === "promise") return svg(s, s, thread + bead(s * 0.3, "#2D5BE3") + `<path d="M${f(s * 0.5)} ${f(y)}c${f(-s * 0.1)} ${f(-s * 0.12)} ${f(-s * 0.16)} 0 ${f(-s * 0.04)} ${f(s * 0.02)}c${f(s * 0.12)} ${f(s * 0.02)} ${f(s * 0.06)} ${f(-s * 0.12)} ${f(-s * 0.04)} ${f(-s * 0.02)}M${f(s * 0.5)} ${f(y)}c${f(s * 0.1)} ${f(-s * 0.12)} ${f(s * 0.16)} 0 ${f(s * 0.04)} ${f(s * 0.02)}c${f(-s * 0.12)} ${f(s * 0.02)} ${f(-s * 0.06)} ${f(-s * 0.12)} ${f(s * 0.04)} ${f(-s * 0.02)}" fill="none" stroke="#B5307A" stroke-width="3"/>` + bead(s * 0.7, "#9BCB3C"));
    return "";
  }

  window.ART = { seedOf, prng, bloomMark, bloomArt, bloomPetals, stickerMark, tape, doodle, orbitMark, orbitArt, orbitDisc, stampMark, postmark, postArt, bandMark, charms, FLOSS, BLOOM, ORB, POST, KEEP };
})();
