// The People route behind the notebook_deck flag: off, the alpha's People exactly; on, the
// notebook's index. Either way the same Settings sheet and add flows are reachable, and a found
// line opens the person's notebook at that note.
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { AccessibilityInfo } from "react-native";
import { EMPTY_ASK } from "@/features/ask/useAsk";
import { PeopleView } from "@/features/people/PeopleView";
import { NotebookPeopleView } from "@/features/people/notebook/NotebookPeopleView";
import { SettingsSheet } from "@/features/people/SettingsSheet";
import type { Person } from "@/store/repositories";

let mockNotebook = false;
const mockPush = jest.fn();
const ben = { id: "ben", display_name: "Ben", state: "active", birthday: null, birthday_source: null, version: 1 } as Person;

jest.mock("react-native-safe-area-context", () => jest.requireActual("react-native-safe-area-context/jest/mock").default);
jest.mock("@/lib/supabase", () => ({ supabase: null, isSupabaseConfigured: false }));
jest.mock("expo-router", () => ({ router: { push: (...a: unknown[]) => mockPush(...a), navigate: jest.fn() } }));
jest.mock("@/providers", () => ({ useAuth: () => ({ user: { id: "me" }, signOut: jest.fn() }) }));
jest.mock("@/hooks/useNotebook", () => ({ useNotebook: () => mockNotebook }));
jest.mock("@/hooks/usePersonPortrait", () => ({ usePersonPortrait: () => ({ uri: null, ready: true, pick: jest.fn(), remove: jest.fn() }) }));
jest.mock("@/features/ask/useAsk", () => ({ ...jest.requireActual("@/features/ask/useAsk"), useAsk: (q: string) => ({ ...jest.requireActual("@/features/ask/useAsk").EMPTY_ASK, query: q }) }));
jest.mock("@/hooks/usePeopleIndex", () => ({
  usePeopleIndex: () => ({
    loaded: true, people: [mockBen()], band: [], names: new Set(["ben"]), today: "2026-11-02",
    tiles: [{ id: "ben", name: "Ben", line: null, letter: "B" }],
  }),
}));
jest.mock("@/hooks/useV2", () => ({
  usePeopleRows: () => [{ person: mockBen(), label: "Ben", line: null }],
  useRemovedPeople: () => [],
  useHeldPeople: () => [],
  useTrustActions: () => ({ resume: jest.fn(), exportData: jest.fn(), deleteAccount: jest.fn() }),
  useV2Actions: () => ({ addPerson: jest.fn(), bringBack: jest.fn() }),
  useUnderstandingConsent: () => ({ allowed: true, set: jest.fn() }),
  useNotificationSetting: () => ({ on: false, set: jest.fn() }),
  usePreviewNotification: () => jest.fn(),
}));
function mockBen() {
  return ben;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const PeopleScreen = require("../../../../app/v2/(main)/people").default as React.ComponentType;

function render(): TestRenderer.ReactTestRenderer {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(<PeopleScreen />);
  });
  act(() => {
    jest.runOnlyPendingTimers();
  });
  return r;
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockReturnValue(new Promise<boolean>(() => undefined));
  mockPush.mockClear();
});
afterEach(() => jest.useRealTimers());

it("with the flag off, People is the alpha's People, with its Settings", () => {
  mockNotebook = false;
  const r = render();
  expect(r.root.findAllByType(PeopleView)).toHaveLength(1);
  expect(r.root.findAllByType(NotebookPeopleView)).toHaveLength(0);
  const sheet = r.root.findByType(SettingsSheet);
  expect(sheet.props.visible).toBe(false);
  act(() => r.root.findByType(PeopleView).props.onSettings());
  expect(r.root.findByType(SettingsSheet).props.visible).toBe(true);
  act(() => r.unmount());
});

it("with the flag on, People is the index: the same Settings, add from contacts, a person, a found line", () => {
  mockNotebook = true;
  const r = render();
  expect(r.root.findAllByType(PeopleView)).toHaveLength(0);
  const view = r.root.findByType(NotebookPeopleView);
  expect(view.props.tiles.map((t: { id: string }) => t.id)).toEqual(["ben"]);
  expect(view.props.memory).toEqual({ ...EMPTY_ASK, query: "" });
  act(() => view.props.onSettings());
  expect(r.root.findByType(SettingsSheet).props.visible).toBe(true);
  act(() => view.props.onAddFromContacts());
  act(() => view.props.onOpen("ben"));
  act(() => view.props.onHit("/v2/person/ben?lens=pages&note=n1"));
  expect(mockPush.mock.calls).toEqual([["/v2/people/add"], ["/v2/person/ben"], ["/v2/person/ben?lens=pages&note=n1"]]);
  act(() => r.unmount());
});
