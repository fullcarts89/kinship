// Photo stand-ins (19 Oct 2026). No photograph of a real person is in this repository: these are drawn scenes that
// read as photos (a backlit portrait at golden hour; two people on a dock at dusk) so the layouts can be judged.
// Drop real, user-provided images at photos/<person>.jpg and photos/<person>-memory.jpg and they replace the stand-ins.
(function () {
  const f = (n) => (Math.round(n * 10) / 10).toString();
  const grain = (id) => `<filter id="${id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 .35"/></feComponentTransfer></filter>`;
  // a person at golden hour: backlit, shoulders and head, sun behind, bokeh
  function person(w, h, id = "p") {
    const cx = w * 0.5, g = `ph-${id}`;
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>
      <linearGradient id="${g}-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F7B267"/><stop offset=".55" stop-color="#F28F5C"/><stop offset="1" stop-color="#7A3E4A"/></linearGradient>
      <radialGradient id="${g}-sun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFF4D6"/><stop offset=".4" stop-color="#FFD98A" stop-opacity=".9"/><stop offset="1" stop-color="#FFB45C" stop-opacity="0"/></radialGradient>
      <linearGradient id="${g}-fig" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3B1F1F"/><stop offset="1" stop-color="#1C0F12"/></linearGradient>
      <linearGradient id="${g}-rim" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFE3A3" stop-opacity="0"/><stop offset=".5" stop-color="#FFE3A3" stop-opacity=".9"/><stop offset="1" stop-color="#FFE3A3" stop-opacity="0"/></linearGradient>
      ${grain(g + "-grain")}</defs>
      <rect width="${w}" height="${h}" fill="url(#${g}-sky)"/>
      <circle cx="${f(cx + w * 0.16)}" cy="${f(h * 0.34)}" r="${f(w * 0.34)}" fill="url(#${g}-sun)"/>
      ${[[0.12, 0.2, 0.05], [0.82, 0.18, 0.04], [0.9, 0.46, 0.06], [0.2, 0.52, 0.035], [0.72, 0.62, 0.045]].map(([x, y, r]) => `<circle cx="${f(w * x)}" cy="${f(h * y)}" r="${f(w * r)}" fill="#FFE7B5" fill-opacity=".35"/>`).join("")}
      <path d="M${f(cx)} ${f(h * 0.3)}c${f(w * 0.11)} 0 ${f(w * 0.15)} ${f(h * 0.1)} ${f(w * 0.14)} ${f(h * 0.2)}c0 ${f(h * 0.08)} ${f(-w * 0.05)} ${f(h * 0.12)} ${f(-w * 0.06)} ${f(h * 0.16)}c${f(w * 0.2)} ${f(h * 0.04)} ${f(w * 0.3)} ${f(h * 0.14)} ${f(w * 0.3)} ${f(h * 0.4)}H${f(cx - w * 0.38)}c0 ${f(-h * 0.26)} ${f(w * 0.1)} ${f(-h * 0.36)} ${f(w * 0.3)} ${f(-h * 0.4)}c${f(-w * 0.01)} ${f(-h * 0.04)} ${f(-w * 0.06)} ${f(-h * 0.08)} ${f(-w * 0.06)} ${f(-h * 0.16)}c${f(-w * 0.01)} ${f(-h * 0.1)} ${f(w * 0.03)} ${f(-h * 0.2)} ${f(w * 0.14)} ${f(-h * 0.2)}z" fill="url(#${g}-fig)"/>
      <path d="M${f(cx + w * 0.1)} ${f(h * 0.32)}c${f(w * 0.06)} ${f(h * 0.04)} ${f(w * 0.06)} ${f(h * 0.14)} ${f(w * 0.02)} ${f(h * 0.2)}" fill="none" stroke="url(#${g}-rim)" stroke-width="${f(w * 0.02)}" stroke-linecap="round"/>
      <rect width="${w}" height="${h}" filter="url(#${g}-grain)" opacity=".5" style="mix-blend-mode:multiply"/>
      <rect width="${w}" height="${h}" fill="url(#${g}-sky)" opacity="0"/></svg>`;
  }
  // a shared memory: two people on a dock at dusk, the water taking the sky
  function memory(w, h, id = "m") {
    const g = `mm-${id}`, hz = h * 0.56;
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>
      <linearGradient id="${g}-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2E3C6E"/><stop offset=".5" stop-color="#C96F7B"/><stop offset="1" stop-color="#F7B37A"/></linearGradient>
      <linearGradient id="${g}-water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E7A277"/><stop offset=".4" stop-color="#8E5A72"/><stop offset="1" stop-color="#1D2140"/></linearGradient>
      ${grain(g + "-grain")}</defs>
      <rect width="${w}" height="${hz}" fill="url(#${g}-sky)"/><rect y="${f(hz)}" width="${w}" height="${f(h - hz)}" fill="url(#${g}-water)"/>
      <circle cx="${f(w * 0.62)}" cy="${f(hz - h * 0.06)}" r="${f(h * 0.09)}" fill="#FFE2A8"/><rect x="${f(w * 0.56)}" y="${f(hz + 2)}" width="${f(w * 0.12)}" height="${f(h * 0.3)}" fill="#FFE2A8" opacity=".35"/>
      <path d="M0 ${f(hz)}q${f(w * 0.3)} ${f(-h * 0.08)} ${f(w * 0.55)} ${f(-h * 0.02)}T${w} ${f(hz - h * 0.05)}V${f(hz)}z" fill="#2B2440" opacity=".85"/>
      <path d="M${f(w * 0.05)} ${f(h * 0.9)}L${f(w * 0.46)} ${f(hz + h * 0.02)}H${f(w * 0.56)}L${f(w * 0.62)} ${f(h * 0.9)}z" fill="#241B2E"/>
      ${[[0.22, 1], [0.3, 1.12]].map(([x, s]) => `<g transform="translate(${f(w * x)} ${f(hz + h * 0.02)}) scale(${s})"><circle cx="0" cy="${f(-h * 0.22)}" r="${f(h * 0.045)}" fill="#1A1420"/><path d="M${f(-w * 0.03)} 0c0 ${f(-h * 0.14)} ${f(w * 0.02)} ${f(-h * 0.18)} ${f(w * 0.03)} ${f(-h * 0.18)}s${f(w * 0.03)} ${f(h * 0.04)} ${f(w * 0.03)} ${f(h * 0.18)}z" fill="#1A1420"/></g>`).join("")}
      <rect width="${w}" height="${h}" filter="url(#${g}-grain)" opacity=".5" style="mix-blend-mode:multiply"/></svg>`;
  }
  // A reviewer can register real, user-provided images here (never committed): window.PHOTO_FILES = { ben: "photos/ben.jpg", "ben-memory": "photos/ben-memory.jpg" }.
  // Only a registered file is drawn over the stand-in; nothing is fetched otherwise.
  const file = (kind, id) => (window.PHOTO_FILES || {})[kind === "memory" ? `${id}-memory` : id];
  const slot = (kind, id, w, h) => { const src = file(kind, id); return `<div class="photo photo-${kind}">${kind === "person" ? person(w, h, id) : memory(w, h, id)}${src ? `<img src="${src}" alt="">` : ""}</div>`; };
  window.PHOTOS = { person, memory, slot, file };
})();
