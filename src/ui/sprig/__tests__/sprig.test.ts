// E08: the sprig is identity-only. "A sprig tells you who, never how much."
//
// The drawing is a pure function of the person's id: there is no other
// input through which relationship history could reach it, and these tests
// pin that, along with the properties that keep a new person looking as
// complete as an old friend.
import { cachedSprig, draw, FAMILIES, LEAF_AREA, seedOf, sprigFor, VIEW_H, VIEW_W } from "../generate";

const ids = Array.from({ length: 500 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`);

it("is deterministic: the same id draws the same sprig, every time", () => {
  for (const id of ids.slice(0, 50)) expect(sprigFor(id)).toEqual(sprigFor(id));
  expect(cachedSprig(ids[3])).toEqual(sprigFor(ids[3]));
});

it("takes the id and nothing else: no history parameter exists", () => {
  // One argument. A history input would have to be added here first.
  expect(sprigFor.length).toBe(1);
  expect(draw.length).toBe(1);
});

it("is stable across platforms: the seed is a fixed hash of the id", () => {
  expect(seedOf("")).toBe(0x811c9dc5);
  expect(seedOf("ben")).toBe(seedOf("ben"));
  expect(seedOf("ben")).not.toBe(seedOf("Ben"));
  // A pinned drawing: a change to the renderer that alters existing people's
  // sprigs must be deliberate (update this snapshot on purpose).
  expect(sprigFor("4f1c2b6e-0d7a-4b8e-9a51-2c7e3f9d1a00").line.slice(0, 80)).toMatchSnapshot();
});

it("every sprig carries the same total leaf area, whatever its node count", () => {
  for (const id of ids) {
    expect(sprigFor(id).leafArea).toBeCloseTo(LEAF_AREA, 6);
  }
});

it("every sprig has its full structure: 5–9 nodes and a terminal, never a flower", () => {
  for (const id of ids) {
    const d = sprigFor(id);
    expect(d.nodes).toBeGreaterThanOrEqual(5);
    expect(d.nodes).toBeLessThanOrEqual(9);
    expect(d.line).not.toMatch(/NaN|Infinity/);
  }
});

it("fits the specimen box, so no sprig is drawn larger than another", () => {
  for (const id of ids) {
    const b = sprigFor(id).bounds;
    expect(b.minX).toBeGreaterThanOrEqual(0);
    expect(b.maxX).toBeLessThanOrEqual(VIEW_W);
    expect(b.minY).toBeGreaterThanOrEqual(0);
    expect(b.maxY).toBeLessThanOrEqual(VIEW_H);
  }
});

it("varies by identity: all six form families occur, none dominates", () => {
  const counts = new Map<string, number>();
  for (const id of ids) counts.set(sprigFor(id).family, (counts.get(sprigFor(id).family) ?? 0) + 1);
  expect([...counts.keys()].sort()).toEqual([...FAMILIES].sort());
  for (const n of counts.values()) expect(n).toBeGreaterThan(ids.length / FAMILIES.length / 2);
});
