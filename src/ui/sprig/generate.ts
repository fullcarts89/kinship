// The sprig: a person's identity mark (plan §19; Design Direction §H).
//
// "A sprig tells you who, never how much." V1 is identity-only (plan §19,
// option B; founder decision D8): the drawing is a pure function of the
// person's id. Nothing about the relationship can reach it, because nothing
// else is an input: not moments, not upcoming plans, not milestones, not
// recency, not the relationship label. A person added today is drawn with
// the same full, mature structure and the same visual weight as an old
// friend. History marks (plan §19, option C) stay off (flag `sprig_marks`)
// and aren't implemented.
//
// The seed is derived from the id on the device (FNV-1a), so a sprig is the
// same before and after the person first syncs, on every device, and a
// renamed person keeps theirs. (people.sprig_seed exists server-side for a
// later server renderer; it isn't needed here.)
//
// Drawing: a quadratic stem in a 60 × 110 box, leaves at 5–9 nodes, one
// terminal, a hairline midrib per leaf, and a 7% wash. Six form families
// vary the botany (frond, spray, bract, trailing, grass, umbel); within a
// family, the seed varies curve, lean, node count, leaf proportion and
// angle. Leaf sizes are normalised so every sprig carries the same total
// leaf area: more nodes means smaller leaves, never a fuller sprig.

export const VIEW_W = 60;
export const VIEW_H = 110;

export const FAMILIES = ["frond", "spray", "bract", "trailing", "grass", "umbel"] as const;
export type Family = (typeof FAMILIES)[number];

export interface SprigDrawing {
  family: Family;
  /** Number of leaf nodes (5–9). */
  nodes: number;
  /** Stroked: the stem, every leaf outline and midrib, the terminal. */
  line: string;
  /** Filled at 7%: the leaves and terminal. */
  wash: string;
  /** Sum of leaf areas in view units² (kept constant across people). */
  leafArea: number;
  /** Extent of the drawing, in view units. */
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

/** The constant total leaf area every sprig is normalised to (view units²). */
export const LEAF_AREA = 520;

/** FNV-1a (32-bit) over the UTF-16 code units of the id. */
export function seedOf(personId: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < personId.length; i++) {
    h ^= personId.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: a small, platform-independent seeded PRNG. */
function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (n: number) => (Math.round(n * 10) / 10).toString();

interface Pt {
  x: number;
  y: number;
}

interface FamilySpec {
  /** Node positions along the stem (0 base → 1 apex). */
  span: [number, number];
  /** Leaf width as a fraction of length. */
  aspect: [number, number];
  /** Angle off the stem, radians. */
  angle: [number, number];
  /** Opposite pairs instead of alternate leaves. */
  opposite: boolean;
  /** How far leaves shrink toward the apex (0 = not at all). */
  taper: number;
  /** Stem bend amplitude, as a fraction of the width. */
  bend: [number, number];
  /** Apex height (view units from the top). */
  apex: [number, number];
  terminal: "bud" | "spike" | "rays";
}

const SPECS: Record<Family, FamilySpec> = {
  frond: { span: [0.2, 0.86], aspect: [0.26, 0.34], angle: [0.45, 0.75], opposite: false, taper: 0.45, bend: [0.18, 0.32], apex: [12, 18], terminal: "bud" },
  spray: { span: [0.24, 0.84], aspect: [0.42, 0.55], angle: [0.55, 0.9], opposite: true, taper: 0.35, bend: [0.1, 0.24], apex: [12, 18], terminal: "bud" },
  bract: { span: [0.18, 0.78], aspect: [0.5, 0.62], angle: [0.3, 0.55], opposite: false, taper: 0.25, bend: [0.08, 0.2], apex: [14, 20], terminal: "bud" },
  trailing: { span: [0.22, 0.9], aspect: [0.4, 0.52], angle: [0.5, 0.85], opposite: false, taper: 0.3, bend: [0.36, 0.5], apex: [20, 28], terminal: "bud" },
  grass: { span: [0.06, 0.56], aspect: [0.16, 0.2], angle: [0.34, 0.56], opposite: false, taper: 0.3, bend: [0.12, 0.26], apex: [10, 16], terminal: "spike" },
  umbel: { span: [0.1, 0.5], aspect: [0.3, 0.4], angle: [0.5, 0.8], opposite: false, taper: 0.4, bend: [0.06, 0.16], apex: [16, 22], terminal: "rays" },
};

const between = (r: () => number, [lo, hi]: [number, number]) => lo + (hi - lo) * r();

/** The sprig for a person. Pure, deterministic, identity-only: the id is the only input. */
export function sprigFor(personId: string): SprigDrawing {
  return draw(seedOf(personId));
}

/** The drawing for a seed (exported for the lab and tests). */
export function draw(seed: number): SprigDrawing {
  const r = prng(seed);
  const family = FAMILIES[Math.floor(r() * FAMILIES.length) % FAMILIES.length];
  const s = SPECS[family];
  const nodes = 5 + Math.floor(r() * 5); // 5–9
  const lean = r() < 0.5 ? -1 : 1;

  const x0 = VIEW_W / 2;
  const y0 = VIEW_H - 2;
  const x1 = x0 + lean * between(r, [0.04, 0.16]) * VIEW_W * (family === "trailing" ? 2.2 : 1);
  const y1 = between(r, s.apex);
  const cx = x0 - lean * between(r, s.bend) * VIEW_W;
  const cy = VIEW_H * between(r, [0.48, 0.62]);
  const at = (t: number): Pt => ({
    x: (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1,
    y: (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1,
  });
  const tangent = (t: number): number => {
    const dx = 2 * (1 - t) * (cx - x0) + 2 * t * (x1 - cx);
    const dy = 2 * (1 - t) * (cy - y0) + 2 * t * (y1 - cy);
    return Math.atan2(dy, dx);
  };

  // Leaf placements, then sizes normalised to the constant total area.
  const aspect = between(r, s.aspect);
  const baseAngle = between(r, s.angle);
  const leaves: { t: number; side: number; rel: number; angle: number; aspect: number }[] = [];
  for (let i = 0; i < nodes; i++) {
    const t = s.span[0] + (s.span[1] - s.span[0]) * (nodes === 1 ? 0 : i / (nodes - 1));
    const jitter = (r() - 0.5) * 0.18;
    const rel = 1 - s.taper * (i / Math.max(nodes - 1, 1)) + (r() - 0.5) * 0.12;
    const sides = s.opposite ? [-1, 1] : [i % 2 === 0 ? lean : -lean];
    for (const side of sides) {
      leaves.push({ t, side, rel, angle: baseAngle + jitter, aspect: aspect * (0.92 + r() * 0.16) });
    }
  }
  // Area of a two-arc leaf ≈ (2/3) · length · width = (2/3) · aspect · length².
  const unit = leaves.reduce((sum, l) => sum + (2 / 3) * l.aspect * l.rel * l.rel, 0);
  const scale = Math.sqrt(LEAF_AREA / unit);

  let line = `M${f(x0)} ${f(y0)}Q${f(cx)} ${f(cy)} ${f(x1)} ${f(y1)}`;
  let wash = "";
  let leafArea = 0;
  const xs: number[] = [x0, x1];
  const ys: number[] = [y0, y1];
  for (const l of leaves) {
    const p = at(l.t);
    const len = scale * l.rel;
    const width = len * l.aspect;
    // Off the stem's direction, toward the leaf's side, leaning up.
    const dir = tangent(l.t) + l.side * l.angle;
    const ex = p.x + len * Math.cos(dir);
    const ey = p.y + len * Math.sin(dir);
    const nx = -Math.sin(dir);
    const ny = Math.cos(dir);
    const mx = (p.x + ex) / 2;
    const my = (p.y + ey) / 2;
    const k = width * 0.75; // control offset for a leaf of this width
    const d = `M${f(p.x)} ${f(p.y)}Q${f(mx + nx * k)} ${f(my + ny * k)} ${f(ex)} ${f(ey)}Q${f(mx - nx * k)} ${f(my - ny * k)} ${f(p.x)} ${f(p.y)}`;
    line += `${d}M${f(p.x)} ${f(p.y)}L${f(p.x + (ex - p.x) * 0.8)} ${f(p.y + (ey - p.y) * 0.8)}`;
    wash += d;
    leafArea += (2 / 3) * len * width;
    xs.push(ex, mx + nx * k * 0.5, mx - nx * k * 0.5);
    ys.push(ey, my + ny * k * 0.5, my - ny * k * 0.5);
  }

  // The terminal is structural (same for everyone in a family), never a flower.
  const apexDir = tangent(1);
  if (s.terminal === "bud") {
    const b = 2.4;
    const tx = x1 + Math.cos(apexDir) * b * 2.2;
    const ty = y1 + Math.sin(apexDir) * b * 2.2;
    const nx = -Math.sin(apexDir);
    const ny = Math.cos(apexDir);
    const d = `M${f(x1)} ${f(y1)}Q${f(x1 + nx * b * 1.6 + (tx - x1) * 0.5)} ${f(y1 + ny * b * 1.6 + (ty - y1) * 0.5)} ${f(tx)} ${f(ty)}Q${f(x1 - nx * b * 1.6 + (tx - x1) * 0.5)} ${f(y1 - ny * b * 1.6 + (ty - y1) * 0.5)} ${f(x1)} ${f(y1)}`;
    line += d;
    wash += d;
    xs.push(tx);
    ys.push(ty);
  } else if (s.terminal === "spike") {
    for (let i = 0; i < 4; i++) {
      const t = 0.9 + i * 0.03;
      const p = at(Math.min(t, 1));
      const side = i % 2 ? 1 : -1;
      const dir = tangent(Math.min(t, 1)) + side * 0.5;
      const ex = p.x + 4 * Math.cos(dir);
      const ey = p.y + 4 * Math.sin(dir);
      line += `M${f(p.x)} ${f(p.y)}L${f(ex)} ${f(ey)}`;
      xs.push(ex);
      ys.push(ey);
    }
  } else {
    const rays = 5;
    for (let i = 0; i < rays; i++) {
      const dir = apexDir + (i - (rays - 1) / 2) * 0.42;
      const ex = x1 + 9 * Math.cos(dir);
      const ey = y1 + 9 * Math.sin(dir);
      line += `M${f(x1)} ${f(y1)}L${f(ex)} ${f(ey)}M${f(ex + 1.3)} ${f(ey)}A1.3 1.3 0 1 0 ${f(ex - 1.3)} ${f(ey)}A1.3 1.3 0 1 0 ${f(ex + 1.3)} ${f(ey)}`;
      xs.push(ex);
      ys.push(ey);
    }
  }

  return {
    family,
    nodes,
    line,
    wash,
    leafArea,
    bounds: { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) },
  };
}

// A small LRU so a long people list draws each sprig once.
const cache = new Map<string, SprigDrawing>();
const CACHE_SIZE = 200;

export function cachedSprig(personId: string): SprigDrawing {
  const hit = cache.get(personId);
  if (hit) {
    cache.delete(personId);
    cache.set(personId, hit);
    return hit;
  }
  const drawing = sprigFor(personId);
  cache.set(personId, drawing);
  if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value as string);
  return drawing;
}
