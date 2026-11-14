// The founder's 14 Nov 2026 motion and touch decisions (audits/2026-11-13-ux-motion-principles.md §5).
import { motion, sourceHitSlop, space, TOUCH, type } from "@/design/tokens";
import { isFirstArrivalToday, localDay, markArrivedToday, resetDailyArrivalForTests } from "@/ui/dailyArrival";

describe("source links reach TOUCH, downward only", () => {
  it.each([type.source.lineHeight, type.provenance.lineHeight, 10.5 * 1.25])("a %s pt line", (lh) => {
    const slop = sourceHitSlop(lh);
    expect(slop.top).toBe(space.s); // never more upward: the memory line above keeps its target
    expect(Math.ceil(lh) + slop.top + slop.bottom).toBeGreaterThanOrEqual(TOUCH);
  });
  it("a tall line keeps the usual slop", () => {
    expect(sourceHitSlop(60).bottom).toBe(space.s);
  });
});

describe("Today's hero arrives in full once a day", () => {
  beforeEach(resetDailyArrivalForTests);
  const morning = new Date(2026, 10, 14, 8, 0);
  const evening = new Date(2026, 10, 14, 21, 30);
  const tomorrow = new Date(2026, 10, 15, 7, 0);

  it("the first open of the day is the full arrival; later that day it is not; the next day it is again", () => {
    expect(isFirstArrivalToday(morning)).toBe(true);
    markArrivedToday(morning);
    expect(isFirstArrivalToday(evening)).toBe(false);
    expect(isFirstArrivalToday(tomorrow)).toBe(true);
  });
  it("asking is pure (safe while rendering)", () => {
    expect(isFirstArrivalToday(morning)).toBe(true);
    expect(isFirstArrivalToday(morning)).toBe(true);
  });
  it("the day is the local calendar day", () => {
    expect(localDay(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });
});

describe("motion values are named", () => {
  it("keeps every value as it was", () => {
    expect([motion.expand.duration, motion.fadeOut.duration, motion.lens.duration, motion.lens.shift, motion.reviewIn.duration,
      motion.focus.duration, motion.breathe.duration, motion.highlight.duration, motion.stagger.word, motion.stagger.idea])
      .toEqual([420, 200, 200, 16, 260, 900, 500, 1200, 110, 60]);
  });
  it("an exit is shorter than its entrance", () => {
    expect(motion.sheetOut.duration).toBeLessThan(motion.sheet.duration);
    expect(motion.arrive.duration).toBeLessThan(motion.expand.duration); // the moment closes in arrive's time
  });
});
