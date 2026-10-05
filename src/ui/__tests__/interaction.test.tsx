// Interaction consistency (interaction and motion audit): every press dims to
// the same values; a busy button shows it's working instead of looking
// disabled; waiting shows paper first and a spinner only when it's slow; a
// sheet is gone when closed; Today never flashes an empty state while its
// first refresh is out.
import fs from "fs";
import path from "path";
import React from "react";
import { ActivityIndicator, Text } from "react-native";
import TestRenderer, { act } from "react-test-renderer";
import { press } from "@/design/tokens";
import { Pill } from "../Pill";
import { Sheet } from "../Sheet";
import { Waiting, WAITING_DELAY_MS } from "../Waiting";
import { TodayView } from "@/features/today/TodayView";
import type { TodayView as TodayData } from "@/features/today/todayModel";

jest.mock("react-native-safe-area-context", () => jest.requireActual("react-native-safe-area-context/jest/mock").default);
jest.mock("@/providers/V2SessionProvider", () => ({ useV2Session: () => { throw new Error("not used"); } }));

function render(el: React.ReactElement) {
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => {
    tree = TestRenderer.create(el);
  });
  return tree;
}
const texts = (t: TestRenderer.ReactTestRenderer) =>
  t.root.findAll((n) => typeof n.props.children === "string").map((n) => n.props.children as string);

it("pressed feedback uses the two press tokens everywhere in 2.0 (no hand-picked opacities)", () => {
  const roots = ["src/ui", "src/features", "app/v2"].map((d) => path.join(__dirname, "../../..", d));
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, f.name);
      if (f.isDirectory()) {
        if (f.name !== "__tests__") walk(p);
      } else if (/\.tsx?$/.test(f.name) && /pressed \? 0?\.\d/.test(fs.readFileSync(p, "utf8"))) offenders.push(p);
    }
  };
  roots.forEach(walk);
  expect(offenders).toEqual([]);
  expect(press.surface).toBeGreaterThan(press.link);
});

it("a busy button keeps its size, shows a spinner, and can't be pressed twice", () => {
  const onPress = jest.fn();
  const t = render(<Pill variant="primary" label="Continue with 4 people" busy onPress={onPress} />);
  expect(t.root.findAllByType(ActivityIndicator)).toHaveLength(1);
  const label = t.root.findAllByType(Text).find((n) => n.props.children === "Continue with 4 people")!;
  expect(label.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ opacity: 0 })])); // kept for width, not shown
  const button = t.root.find((n) => n.props.accessibilityRole === "button" && typeof n.props.onPress === "function");
  expect(button.props.accessibilityState).toMatchObject({ busy: true, disabled: true });
});

it("waiting is plain paper first, and a spinner only once it takes long enough to notice", () => {
  jest.useFakeTimers();
  const t = render(<Waiting />);
  expect(t.root.findAllByType(ActivityIndicator)).toHaveLength(0);
  act(() => {
    jest.advanceTimersByTime(WAITING_DELAY_MS + 1);
  });
  expect(t.root.findAllByType(ActivityIndicator)).toHaveLength(1);
  jest.useRealTimers();
});

it("a sheet that was never opened renders nothing; an open one shows its content", () => {
  expect(render(<Sheet visible={false} onDismiss={() => undefined} label="x"><Text>Inside</Text></Sheet>).toJSON()).toBeNull();
  expect(texts(render(<Sheet visible onDismiss={() => undefined} label="x"><Text>Inside</Text></Sheet>))).toContain("Inside");
});

const quiet: TodayData = {
  dateLabel: "Monday, 12 October", greeting: "Good morning.", returnCheck: null, moment: null, quiet: [], quietDay: true, firstUse: null,
};
const noop = () => undefined;
const handlers = { afterReturn: null, onPrimary: noop, onNotNow: noop, onProvenance: noop, onReturn: noop, onRemember: noop, onNothing: noop, onQuiet: noop };

it("Today holds its empty state while the first refresh is out, then says it", () => {
  const settling = texts(render(<TodayView view={quiet} settling {...handlers} />));
  expect(settling).toContain("Monday, 12 October");
  expect(settling).not.toContain("Nothing needs you today.");
  expect(texts(render(<TodayView view={quiet} {...handlers} />))).toContain("Nothing needs you today.");
});
