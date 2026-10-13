// The hand-off the screens make (reviewer C, round 3): Message or Call from
// a Moment, a Coming up or a Waiting line remembers exactly the hand-off
// `handoffFor` makes ("" for followUp kept: nothing to ask after a Waiting
// Yes) before the other app opens, and takes it back if it never opened.
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { Alert } from "react-native";
import { useHandoff, type HandoffRequest } from "@/features/today/useHandoff";

const mockCalls: string[] = [];
const mockHandedOff = jest.fn(async (_h: unknown) => {
  mockCalls.push("remembered");
});
const mockFailed = jest.fn(async (_id: string) => {
  mockCalls.push("taken back");
});
let mockOpens = true;

jest.mock("@/hooks/useV2", () => ({
  usePeople: () => [{ id: "tyler", display_name: "Tyler Shaffer", state: "active", contact_ref: "contact-1" }],
  useTodayActions: () => ({ handedOff: mockHandedOff, handoffFailed: mockFailed, linkContact: jest.fn() }),
}));
jest.mock("@/platform/handoff", () => ({
  routesFor: async () => ({ contactId: "contact-1" }),
  channelsFor: () => ["text", "call"],
  pickContact: async () => null,
  openChannel: async () => {
    mockCalls.push("opened");
    return mockOpens;
  },
}));
jest.mock("@/features/today/HandoffSheet", () => ({ HandoffSheet: () => null }));

const waiting: HandoffRequest = {
  personId: "tyler", personName: "Tyler", heading: "Message Tyler", mention: [],
  reason: { id: "waiting:p1:2026-10-09", type: "waiting", ask: "Did you reach Tyler?", about: "Tyler said he'd send you his contractor's number", followUp: "", itemId: "p1" },
};

async function run(req: HandoffRequest) {
  let api!: ReturnType<typeof useHandoff>;
  function Harness() {
    api = useHandoff();
    return <>{api.sheet}</>;
  }
  act(() => {
    TestRenderer.create(<Harness />);
  });
  await act(async () => {
    api.start(req, "text");
    for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));
  });
}

beforeEach(() => {
  mockCalls.length = 0;
  mockHandedOff.mockClear();
  mockFailed.mockClear();
  mockOpens = true;
});

it("remembers the hand-off, exactly as handoffFor makes it, before Messages opens", async () => {
  await run(waiting);
  expect(mockHandedOff).toHaveBeenCalledWith({
    reasonId: "waiting:p1:2026-10-09", personId: "tyler", channel: "text", type: "waiting", itemId: "p1",
    ask: "Did you reach Tyler?", about: "Tyler said he'd send you his contractor's number", followUp: "",
  });
  expect(mockCalls).toEqual(["remembered", "opened"]);
});

it("Messages never opened: the hand-off is taken back", async () => {
  mockOpens = false;
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
  await run(waiting);
  expect(mockCalls).toEqual(["remembered", "opened", "taken back"]);
  expect(mockFailed).toHaveBeenCalledWith("waiting:p1:2026-10-09");
  alert.mockRestore();
});
