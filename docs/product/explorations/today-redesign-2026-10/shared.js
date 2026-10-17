// Shared drawing helpers for the Today redesign exploration (16 Oct 2026).
// Exploratory, unapproved. Fictional demonstration content only.
(function () {
  const VIEW_W = 60, VIEW_H = 110;
  const f = (n) => (Math.round(n * 10) / 10).toString();

  // A person's real sprig (paths come from src/ui/sprig/generate.ts, run on fixture ids).
  function sprig(id, width, color, opts = {}) {
    const d = window.SPRIGS[id];
    if (!d) return "";
    const height = (width * VIEW_H) / VIEW_W;
    const stroke = Math.min(1.2, Math.max(0.7, width / 50)) * (opts.fine ? 0.85 : 1);
    const cls = opts.cls ? ` class="${opts.cls}"` : "";
    const style = opts.style ? ` style="${opts.style}"` : "";
    return `<svg${cls}${style} width="${width}" height="${height}" viewBox="0 0 ${VIEW_W} ${VIEW_H}" aria-hidden="true" focusable="false">
      <path d="${d.wash}" fill="${color}" fill-opacity="${opts.wash ?? 0.07}"/>
      <path d="${d.line}" fill="none" stroke="${color}" stroke-width="${(stroke * VIEW_W) / width}" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }

  // mulberry32 for stable, seedable decoration (never Math.random: the page must draw the same every time).
  function prng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // A two-arc leaf (the sprig's own leaf), from p toward angle dir.
  function leaf(px, py, len, width, dir) {
    const ex = px + len * Math.cos(dir), ey = py + len * Math.sin(dir);
    const nx = -Math.sin(dir), ny = Math.cos(dir);
    const mx = (px + ex) / 2, my = (py + ey) / 2, k = width * 0.75;
    const d = `M${f(px)} ${f(py)}Q${f(mx + nx * k)} ${f(my + ny * k)} ${f(ex)} ${f(ey)}Q${f(mx - nx * k)} ${f(my - ny * k)} ${f(px)} ${f(py)}`;
    const mid = `M${f(px)} ${f(py)}L${f(px + (ex - px) * 0.8)} ${f(py + (ey - py) * 0.8)}`;
    return { d, mid };
  }

  // Engraved spot illustrations: one ink, hairline, a 7% wash. Atmosphere, never evidence.
  const ill = {};

  // A laurel for a race or a finish (two branches, leaves alternating).
  ill.laurel = function (size = 120, color = "currentColor") {
    const w = size, h = size, cx = w / 2, by = h * 0.92;
    let line = "", wash = "";
    for (const side of [-1, 1]) {
      const x0 = cx + side * 6, y0 = by, x1 = cx + side * w * 0.42, y1 = h * 0.22;
      const qx = cx + side * w * 0.5, qy = h * 0.72;
      line += `M${f(x0)} ${f(y0)}Q${f(qx)} ${f(qy)} ${f(x1)} ${f(y1)}`;
      const r = prng(side > 0 ? 7 : 11);
      for (let i = 0; i < 9; i++) {
        const t = 0.12 + i * 0.095;
        const px = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * qx + t * t * x1;
        const py = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * qy + t * t * y1;
        const dx = 2 * (1 - t) * (qx - x0) + 2 * t * (x1 - qx), dy = 2 * (1 - t) * (qy - y0) + 2 * t * (y1 - qy);
        const tan = Math.atan2(dy, dx);
        const len = size * (0.14 - i * 0.006), wd = len * 0.36;
        for (const s of [-1, 1]) {
          const l = leaf(px, py, len, wd, tan + s * (0.75 + (r() - 0.5) * 0.15) * side * -1);
          line += l.d + l.mid; wash += l.d;
        }
      }
    }
    // the ribbon knot
    line += `M${f(cx - 6)} ${f(by)}Q${f(cx)} ${f(by - 8)} ${f(cx + 6)} ${f(by)}Q${f(cx)} ${f(by + 8)} ${f(cx - 6)} ${f(by)}M${f(cx - 5)} ${f(by + 3)}L${f(cx - 11)} ${f(h)}M${f(cx + 5)} ${f(by + 3)}L${f(cx + 11)} ${f(h)}`;
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path d="${wash}" fill="${color}" fill-opacity="0.07"/><path d="${line}" fill="none" stroke="${color}" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  };

  // A single candle with a still flame, for a birthday.
  ill.candle = function (size = 120, color = "currentColor") {
    const w = size, h = size, cx = w / 2;
    const top = h * 0.4, bot = h * 0.96, cw = w * 0.11;
    const body = `M${f(cx - cw)} ${f(top)}L${f(cx - cw * 1.08)} ${f(bot)}L${f(cx + cw * 1.08)} ${f(bot)}L${f(cx + cw)} ${f(top)}Z`;
    const rim = `M${f(cx - cw)} ${f(top)}Q${f(cx)} ${f(top + 4)} ${f(cx + cw)} ${f(top)}Q${f(cx)} ${f(top - 4)} ${f(cx - cw)} ${f(top)}`;
    const drip = `M${f(cx + cw * 0.6)} ${f(top + 2)}Q${f(cx + cw * 0.9)} ${f(top + 14)} ${f(cx + cw * 0.55)} ${f(top + 20)}Q${f(cx + cw * 0.3)} ${f(top + 12)} ${f(cx + cw * 0.6)} ${f(top + 2)}`;
    const wick = `M${f(cx)} ${f(top - 1)}L${f(cx)} ${f(top - 9)}`;
    const fy = top - 10, fh = h * 0.2, fw = w * 0.07;
    const flame = `M${f(cx)} ${f(fy)}Q${f(cx - fw)} ${f(fy - fh * 0.45)} ${f(cx)} ${f(fy - fh)}Q${f(cx + fw)} ${f(fy - fh * 0.45)} ${f(cx)} ${f(fy)}Z`;
    const inner = `M${f(cx)} ${f(fy - 2)}Q${f(cx - fw * 0.4)} ${f(fy - fh * 0.35)} ${f(cx)} ${f(fy - fh * 0.55)}Q${f(cx + fw * 0.4)} ${f(fy - fh * 0.35)} ${f(cx)} ${f(fy - 2)}Z`;
    // a quiet halo of hairline rays
    let rays = "";
    for (let i = 0; i < 8; i++) {
      const a = -Math.PI / 2 + (i - 3.5) * 0.32;
      const r0 = fh * 0.9, r1 = fh * 1.15;
      rays += `M${f(cx + Math.cos(a) * r0)} ${f(fy - fh * 0.5 + Math.sin(a) * r0)}L${f(cx + Math.cos(a) * r1)} ${f(fy - fh * 0.5 + Math.sin(a) * r1)}`;
    }
    // hatching on the candle's shaded side
    let hatch = "";
    for (let y = top + 8; y < bot - 4; y += 5) hatch += `M${f(cx + cw * 0.35)} ${f(y)}L${f(cx + cw * 0.95)} ${f(y + 1.5)}`;
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">
      <path d="${body}${flame}" fill="${color}" fill-opacity="0.07"/>
      <path d="${inner}" fill="${color}" fill-opacity="0.12"/>
      <path d="${hatch}" stroke="${color}" stroke-width="0.6" stroke-opacity="0.5" fill="none"/>
      <path d="${rays}" stroke="${color}" stroke-width="0.7" stroke-opacity="0.55" fill="none" stroke-linecap="round"/>
      <path d="${body}${rim}${drip}${wick}${flame}" fill="none" stroke="${color}" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  };

  // A door standing ajar, for an interview or a first day.
  ill.door = function (size = 120, color = "currentColor") {
    const w = size, h = size, x = w * 0.3, y = h * 0.08, dw = w * 0.4, dh = h * 0.86;
    const frame = `M${f(x)} ${f(y + dh)}L${f(x)} ${f(y)}L${f(x + dw)} ${f(y)}L${f(x + dw)} ${f(y + dh)}`;
    const ox = x + dw * 0.78, ty = y + dh * 0.06;
    const door = `M${f(x)} ${f(y)}L${f(ox)} ${f(ty)}L${f(ox)} ${f(y + dh - dh * 0.06)}L${f(x)} ${f(y + dh)}Z`;
    const panel = `M${f(x + 5)} ${f(y + 12)}L${f(ox - 5)} ${f(ty + 14)}L${f(ox - 5)} ${f(y + dh * 0.45)}L${f(x + 5)} ${f(y + dh * 0.47)}Z`;
    const knob = `M${f(ox - 9)} ${f(y + dh * 0.52)}a2.2 2.2 0 1 0 0.01 0`;
    let light = "";
    for (let i = 0; i < 7; i++) { const yy = y + 6 + i * (dh / 7.5); light += `M${f(ox + 2)} ${f(yy)}L${f(x + dw - 1)} ${f(yy + 2)}`; }
    const sill = `M${f(x - 10)} ${f(y + dh)}L${f(x + dw + 10)} ${f(y + dh)}`;
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">
      <path d="${door}" fill="${color}" fill-opacity="0.07"/>
      <path d="${light}" stroke="${color}" stroke-width="0.6" stroke-opacity="0.5" fill="none"/>
      <path d="${frame}${door}${panel}${knob}${sill}" fill="none" stroke="${color}" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  };

  // Two rings, for a wedding or an engagement.
  ill.rings = function (size = 120, color = "currentColor") {
    const w = size, h = size, r = size * 0.22;
    const c1 = [w * 0.42, h * 0.5], c2 = [w * 0.6, h * 0.5];
    const ring = (c) => `M${f(c[0] + r)} ${f(c[1])}A${f(r)} ${f(r)} 0 1 0 ${f(c[0] - r)} ${f(c[1])}A${f(r)} ${f(r)} 0 1 0 ${f(c[0] + r)} ${f(c[1])}`;
    const ringIn = (c) => `M${f(c[0] + r - 3)} ${f(c[1])}A${f(r - 3)} ${f(r - 3)} 0 1 0 ${f(c[0] - r + 3)} ${f(c[1])}A${f(r - 3)} ${f(r - 3)} 0 1 0 ${f(c[0] + r - 3)} ${f(c[1])}`;
    const bow = `M${f(w * 0.51)} ${f(h * 0.18)}q-8 -9 -14 0q6 6 14 0q8 -9 14 0q-6 6 -14 0`;
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">
      <path d="${ring(c1)}${ringIn(c1)}" fill="${color}" fill-opacity="0.07" fill-rule="evenodd"/>
      <path d="${ring(c1)}${ringIn(c1)}${ring(c2)}${ringIn(c2)}${bow}" fill="none" stroke="${color}" stroke-width="1.1" stroke-linecap="round"/>
    </svg>`;
  };

  // A key, for a new job, a new home.
  ill.key = function (size = 120, color = "currentColor") {
    const w = size, h = size;
    const bow = `M${f(w * 0.3)} ${f(h * 0.36)}a11 11 0 1 0 0.01 0M${f(w * 0.3)} ${f(h * 0.42)}a5 5 0 1 0 0.01 0`;
    const stem = `M${f(w * 0.4)} ${f(h * 0.45)}L${f(w * 0.8)} ${f(h * 0.45)}L${f(w * 0.8)} ${f(h * 0.56)}M${f(w * 0.72)} ${f(h * 0.45)}L${f(w * 0.72)} ${f(h * 0.53)}M${f(w * 0.64)} ${f(h * 0.45)}L${f(w * 0.64)} ${f(h * 0.51)}`;
    const tag = `M${f(w * 0.18)} ${f(h * 0.48)}L${f(w * 0.12)} ${f(h * 0.66)}L${f(w * 0.3)} ${f(h * 0.62)}Z`;
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path d="${tag}" fill="${color}" fill-opacity="0.07"/><path d="${bow}${stem}${tag}" fill="none" stroke="${color}" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  };

  // A tied string around a finger: a promise (future reason, RSN-06).
  ill.bow = function (size = 120, color = "currentColor") {
    const w = size, h = size, cx = w / 2, cy = h / 2;
    const d = `M${f(cx)} ${f(cy)}q-14 -16 -22 -4q-4 10 10 10q10 0 12 -6q2 6 12 6q14 0 10 -10q-8 -12 -22 4M${f(cx)} ${f(cy)}q-6 14 -2 26M${f(cx)} ${f(cy)}q8 12 6 24`;
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path d="${d}" fill="none" stroke="${color}" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  };

  // A strip of grass blades along a baseline (identity-free, seeded): the garden floor.
  function grass(width, height, seed, color, opts = {}) {
    const r = prng(seed);
    let d = "";
    const n = Math.round(width / (opts.gap ?? 9));
    for (let i = 0; i < n; i++) {
      const x = (i + 0.3 + r() * 0.6) * (width / n);
      const hgt = height * (0.35 + r() * 0.65);
      const lean = (r() - 0.5) * 14;
      d += `M${f(x)} ${f(height)}Q${f(x + lean * 0.3)} ${f(height - hgt * 0.5)} ${f(x + lean)} ${f(height - hgt)}`;
      if (r() < 0.3) d += `M${f(x + 2)} ${f(height)}Q${f(x + 3 - lean * 0.3)} ${f(height - hgt * 0.35)} ${f(x + 1 - lean * 0.6)} ${f(height - hgt * 0.62)}`;
    }
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" fill="none" stroke="${color}" stroke-width="${opts.stroke ?? 0.9}" stroke-opacity="${opts.opacity ?? 0.5}" stroke-linecap="round"/></svg>`;
  }

  // The hour's light: a hairline arc from horizon to horizon, the sun (or moon) where the hour puts it.
  function skyArc(width, hour, color, opts = {}) {
    const h = opts.height ?? 120, pad = 20;
    const t = Math.max(0, Math.min(1, (hour - 6) / 13)); // 6 am → 7 pm across the arc
    const night = hour < 6 || hour >= 19;
    const nt = night ? Math.max(0, Math.min(1, ((hour + 5) % 24) / 11)) : t; // 7 pm → 6 am for the moon
    const x = pad + (night ? nt : t) * (width - 2 * pad);
    const y = h - 10 - Math.sin((night ? nt : t) * Math.PI) * (h - 28);
    const arc = `M${pad} ${h - 10}Q${width / 2} ${-(h - 40)} ${width - pad} ${h - 10}`;
    const disc = night
      ? `<path d="M${f(x)} ${f(y - 6)}a6 6 0 1 0 0 12a4.6 4.6 0 1 1 0 -12z" fill="${color}" fill-opacity="0.9"/>`
      : `<circle cx="${f(x)}" cy="${f(y)}" r="5.5" fill="${opts.paper ?? "#EFEEE9"}" stroke="${color}" stroke-width="1"/>`;
    return `<svg class="skyarc" width="${width}" height="${h}" viewBox="0 0 ${width} ${h}" aria-hidden="true"><path d="${arc}" fill="none" stroke="${color}" stroke-width="0.8" stroke-opacity="0.35" stroke-dasharray="1 4" stroke-linecap="round"/>${disc}</svg>`;
  }

  // Lucide-style icons at 1.8 stroke, for functions only.
  const icon = {
    message: (c = "currentColor", s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>`,
    phone: (c = "currentColor", s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z"/></svg>`,
    pen: (c = "currentColor", s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`,
    search: (c = "currentColor", s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
    plus: (c = "currentColor", s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14M12 5v14"/></svg>`,
    gear: (c = "currentColor", s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`,
    back: (c = "currentColor", s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>`,
    up: (c = "currentColor", s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>`,
  };

  window.K = { sprig, ill, grass, skyArc, icon, prng, leaf };
})();
