// The dock and the keyboard (native pass at 375 pt, 4 Nov 2026): the notebook's dock has no field of its
// own, so a keyboard up for People's search leaves it under the keyboard instead of raising the Tell pill
// and the bar over the results; the alpha's dock, whose field is the Tell, still rises with it.
import React from "react";
import TestRenderer, { act } from "react-test-renderer";

let mockNotebook = false;
const mockDock: { typing?: boolean }[] = [];

jest.mock("expo-router", () => {
  const Tabs = function Tabs({ tabBar }: { tabBar: (p: unknown) => React.ReactNode }) {
    return tabBar({ state: { index: 0, routes: [{ name: "index" }] }, navigation: { navigate: () => undefined } });
  };
  Tabs.Screen = function Screen() {
    return null;
  };
  return { Redirect: () => null, Tabs };
});
jest.mock("react-native-safe-area-context", () => jest.requireActual("react-native-safe-area-context/jest/mock").default);
jest.mock("@/hooks/useV2", () => ({ useSetupGate: () => "ready" }));
jest.mock("@/ui/useKeyboardLift", () => ({ useKeyboardInset: () => 300 }));
jest.mock("@/features/tell/ConsentSheet", () => ({ ConsentSheet: () => null }));
jest.mock("@/features/tell/TellFlow", () => ({ useTellNotebookMode: () => mockNotebook }));
jest.mock("@/features/tell/TellDock", () => ({
  TellDock: (p: { typing?: boolean }) => {
    mockDock.push(p);
    return null;
  },
}));

function dockWhileTyping(notebook: boolean) {
  mockNotebook = notebook;
  mockDock.length = 0;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Main = require("../v2/(main)/_layout").default as React.ComponentType;
  act(() => {
    TestRenderer.create(<Main />);
  });
  return mockDock[mockDock.length - 1]?.typing;
}

it("the notebook's dock stays under a keyboard that is up for something else; the alpha's rises with it", () => {
  expect(dockWhileTyping(true)).toBe(false);
  expect(dockWhileTyping(false)).toBe(true);
});
