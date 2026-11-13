// useReduceMotion starts from what the system last said, so an arrival never
// begins at full motion and switches to the fade half-way (the rise or slide
// was partly visible with Reduce Motion on).
/* eslint-disable @typescript-eslint/no-require-imports */

afterEach(() => jest.restoreAllMocks());

/** A fresh module graph (the setting is read once per app load), with the system answering `on`. */
function load(on: boolean) {
  jest.resetModules();
  const RN = require("react-native") as typeof import("react-native");
  jest.spyOn(RN.AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(on);
  const React = require("react") as typeof import("react");
  const TestRenderer = require("react-test-renderer") as typeof import("react-test-renderer");
  const { act } = TestRenderer;
  const { useReduceMotion } = require("@/ui/theme") as typeof import("@/ui/theme");
  return { React, TestRenderer, act, useReduceMotion };
}

async function firstRenders(on: boolean): Promise<boolean[]> {
  const { React, TestRenderer, act, useReduceMotion } = load(on);
  await act(async () => undefined); // the module's own read settles, as it does long before a screen animates
  const seen: boolean[] = [];
  function Probe() {
    seen.push(useReduceMotion());
    return null;
  }
  await act(async () => {
    TestRenderer.create(React.createElement(Probe));
  });
  return seen;
}

it("a component mounted after the setting is known starts with it, on its first render", async () => {
  const seen = await firstRenders(true);
  expect(seen[0]).toBe(true);
  expect(seen.every((v) => v)).toBe(true);
});

it("with Reduce Motion off nothing changes", async () => {
  const seen = await firstRenders(false);
  expect(seen.every((v) => !v)).toBe(true);
});
