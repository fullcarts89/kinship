// The Electric Garden's own gates (FD-30b): the poster name fits the page and
// never grows with Dynamic Type; the statement splits only on the person's
// name; the kind of day comes from what Today shows and never from anything
// sensitive; the sprig's accent comes from the id alone; the art is decorative
// (hidden from screen readers) and steps aside under Reduce Transparency.
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { AccessibilityInfo, Text } from "react-native";
import { color, sectionAccent } from "@/design/tokens";
import { blobPath, fitPoster, Grain, PosterName, SectionLabel, sprigAccent } from "@/ui";
import { dayKindFor, posterSplit, TodayView } from "@/features/today/TodayView";
import type { TodayView as TodayData } from "@/features/today/todayModel";

jest.mock("react-native-safe-area-context", () => jest.requireActual("react-native-safe-area-context/jest/mock").default);

/** The outermost node carrying a test id (a composite and its host both carry it). */
const byId = (r: TestRenderer.ReactTestRenderer, id: string) => r.root.findAll((n) => n.props.testID === id && n.parent?.props.testID !== id);

function render(el: React.ReactElement) {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(el);
  });
  return r;
}
const noop = () => undefined;

describe("the poster name", () => {
  it("fits a short name on one line at the largest size, and a long one on two lines, never below the floor", () => {
    expect(fitPoster("Ben", 341, 120, 44)).toEqual({ fontSize: 120, lines: ["Ben"] });
    const long = fitPoster("Grandpa Joe Oxnard", 341, 120, 44);
    expect(long.lines).toHaveLength(2);
    expect(long.lines.join(" ")).toBe("Grandpa Joe Oxnard");
    expect(long.fontSize).toBeGreaterThanOrEqual(44);
    expect(long.fontSize).toBeLessThan(120);
    // One very long word: the floor, one line (it wraps by the platform; it is never cut off).
    expect(fitPoster("Maximilianusvonhabsburg", 320, 120, 44)).toEqual({ fontSize: 44, lines: ["Maximilianusvonhabsburg"] });
  });

  it("does not grow with Dynamic Type", () => {
    const r = render(<PosterName name="Ben" width={341} />);
    const t = r.root.findAllByType(Text)[0];
    expect(t.props.maxFontSizeMultiplier).toBe(1);
    expect(t.props.accessibilityRole).toBe("header");
  });
});

describe("the statement split", () => {
  it("splits only when the statement opens with the name and a space", () => {
    expect(posterSplit("Ben runs Chicago tomorrow.", "Ben")).toEqual({ name: "Ben", rest: "runs Chicago tomorrow." });
    expect(posterSplit("How did it go for Ben?", "Ben")).toEqual({ name: "Ben", rest: "How did it go for Ben?" });
    expect(posterSplit("Ben's birthday is tomorrow.", "Ben")).toEqual({ name: "Ben", rest: "Ben's birthday is tomorrow." });
    expect(posterSplit("Benjamin runs today.", "Ben")).toEqual({ name: "Ben", rest: "Benjamin runs today." });
  });
});

const base: TodayData = {
  dateLabel: "Tuesday, 6 October", greeting: "Good morning.", returnCheck: null, moment: null, quiet: [], quietDay: true, waiting: null, firstUse: null,
};
const moment = (type: string): TodayData["moment"] => ({
  reasonId: "r1", type: type as never, personId: "p1", personName: "Ben", itemId: "m1", memory: "Ben runs Chicago Sunday", day: "2026-10-11",
  statement: "Ben runs Chicago tomorrow.", context: "Chicago Marathon · Sun, Oct 11", provenance: "From your note · Oct 8", noteId: "c1", score: 90,
  primary: { label: "Wish Ben luck", hint: "" }, heading: "Wish Ben luck", mention: [], opener: null, ask: "", followUp: "", hope: "He was hoping to break four hours.",
});

describe("the kind of day", () => {
  it("is joyful for a birthday, good news, a big day or how it went; warm for a promise; quiet with nothing", () => {
    expect(dayKindFor({ ...base, quietDay: false, moment: moment("birthday") })).toBe("joyful");
    expect(dayKindFor({ ...base, quietDay: false, moment: moment("event_followup") })).toBe("joyful");
    expect(dayKindFor({ ...base, quietDay: false, moment: moment("coming") })).toBe("warm");
    expect(dayKindFor(base)).toBe("quiet");
    expect(dayKindFor({ ...base, quietDay: false, firstUse: { hasPeople: false } })).toBe("warm");
  });

  it("a quiet day draws the quiet wash and the bud, and says only the date, the greeting and the one sentence", () => {
    const r = render(<TodayView view={base} afterReturn={null} settling={false} onPrimary={noop} onNotNow={noop} onProvenance={noop} onReturn={noop} onRemember={noop} onNothing={noop} onQuiet={noop} />);
    expect(byId(r, "dawn-wash-quiet")).toHaveLength(1);
    expect(byId(r, "botanical-bud")).toHaveLength(1);
    expect(byId(r, "botanical-bloom")).toHaveLength(0);
    expect(r.root.findAllByType(Text).map((t) => [t.props.children].flat().join(""))).toEqual(["Tuesday, 6 October", "Good morning.", "Nothing needs you today."]);
  });

  it("a moment draws the joyful wash and the hero bloom; without a photo the name is the picture, with one it is ink over the photo", () => {
    const view = { ...base, quietDay: false, moment: moment("event_followup") };
    const r = render(<TodayView view={view} afterReturn={null} settling={false} onPrimary={noop} onNotNow={noop} onProvenance={noop} onReturn={noop} onRemember={noop} onNothing={noop} onQuiet={noop} />);
    expect(byId(r, "dawn-wash-joyful")).toHaveLength(1);
    expect(byId(r, "botanical-bloom")).toHaveLength(1);
    expect(byId(r, "fluid-photo")).toHaveLength(0);
    const texts = r.root.findAllByType(Text).map((t) => [t.props.children].flat().join(""));
    expect(texts).toEqual(expect.arrayContaining(["Ben", "runs Chicago tomorrow.", "Chicago Marathon · Sun, Oct 11", "He was hoping to break four hours.", "From your note · Oct 8", "Wish Ben luck", "Not now"]));
    // The whole statement is what a screen reader hears.
    expect(r.root.findAll((n) => n.props.accessibilityLabel === "Ben runs Chicago tomorrow." && n.props.accessibilityRole === "header").length).toBeGreaterThan(0);
    const withPhoto = render(<TodayView view={view} photoUri="file:///tmp/ben.jpg" afterReturn={null} settling={false} onPrimary={noop} onNotNow={noop} onProvenance={noop} onReturn={noop} onRemember={noop} onNothing={noop} onQuiet={noop} />);
    expect(byId(withPhoto, "fluid-photo")).toHaveLength(1);
    expect(withPhoto.root.findAll((n) => n.props.accessibilityLabel === "Photo of Ben" && typeof n.type === "string")).toHaveLength(1);
    expect(byId(withPhoto, "botanical-leaves")).toHaveLength(1);
  });
});

describe("identity-only marks", () => {
  it("the sprig's accent is one of the five, from the id alone", () => {
    const accents = new Set(["bloom", "sunset", "lavender", "lime", "butter"]);
    for (const id of ["7d1c2f40-1b6e-4c5a-9a0e-3f2b8c1d4e01", "a", "b", "Ben", ""]) expect(accents.has(sprigAccent(id))).toBe(true);
    expect(sprigAccent("x")).toBe(sprigAccent("x"));
    expect(["bloom", "sunset", "lavender", "lime", "butter"].map((k) => color.light[k as keyof typeof color.light]).every(Boolean)).toBe(true);
  });

  it("section dots are fixed by section and hidden from screen readers", () => {
    const r = render(<SectionLabel section="lately">Lately</SectionLabel>);
    const dot = r.root.findAll((n) => n.props.accessibilityElementsHidden && typeof n.type === "string")[0];
    expect(dot.props.style.backgroundColor).toBe(color.light[sectionAccent.lately]);
  });

  it("the fluid mask is the same shape at any size", () => {
    const a = blobPath(100, 100);
    const b = blobPath(200, 200);
    expect(a).toMatch(/^M .* Z$/u);
    expect(b.split(" ").length).toBe(a.split(" ").length);
  });
});

describe("the grain", () => {
  it("steps aside under Reduce Transparency", async () => {
    const spy = jest.spyOn(AccessibilityInfo, "isReduceTransparencyEnabled").mockResolvedValue(true);
    const r = render(<Grain />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(byId(r, "garden-grain")).toHaveLength(0);
    spy.mockRestore();
  });
});
