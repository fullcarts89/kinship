// The notebook Tell page (PR #77 §7; flag `notebook_deck`) on the real Tell flow, store and
// Understanding (FakeGateway as the server): the white pill opens it; Keep waits for words; closing
// keeps the draft; Keep freezes the words with "Understanding…"; the review takes the page's place
// when the result arrives while it's open; closed early, the Kept card carries the note as built
// (Gate D). A person's page opens it about them through the same TellSheet API.
import React from "react";
import TestRenderer, { act, type ReactTestInstance } from "react-test-renderer";
import { Text } from "react-native";
import { randomUUID } from "crypto";
import { Gateway } from "@/store/gateway";
import { repositoriesFor } from "@/store/repositories";
import { prepareSchema } from "@/store/schema";
import { SyncEngine } from "@/store/syncEngine";
import { Understanding } from "@/store/understanding";
import { UserStore } from "@/store/userStore";
import { FakeGateway } from "@/test-utils/fakeGateway";
import { FakeRemote, FakeServer } from "@/test-utils/fakeRemote";
import { openSqlJsDb } from "@/test-utils/sqljsDb";
import { TellFlowProvider, useTellFlow, type TellFlow } from "../TellFlow";
import { TellDock } from "../TellDock";
import { TellSheet } from "../TellSheet";
import { NOTEBOOK_TELL_COPY } from "../notebook/NotebookTell";
import { NOTEBOOK_REVIEW_COPY } from "../notebook/NotebookReview";

const A = "aaaaaaaa-0000-4000-8000-0000000000b2";
const SAM_NOTE = "Sam is redoing his kitchen.";
const BEN_NOTE = "Ben runs Chicago Sunday.";

let mockSession: { store: UserStore; understanding: Understanding; userId: string } | null = null;
jest.mock("@/providers/V2SessionProvider", () => ({ useV2Session: () => mockSession }));
let mockAi = true;
jest.mock("@/hooks/useFlags", () => ({ useFlags: () => ({ ai_extraction: mockAi, tell: true }) }));
jest.mock("../notebook/useTellNotebook", () => ({ useTellNotebook: () => true }));
jest.mock("@/hooks/useActivation", () => ({ useActivation: () => ({ activated: true, activate: async () => undefined, firstName: null }) }));
jest.mock("@/hooks/usePersonPortrait", () => ({ usePersonPortrait: () => ({ uri: null, ready: true, pick: async () => undefined, remove: async () => undefined }) }));
jest.mock("@/lib/supabase", () => ({ supabase: null, isSupabaseConfigured: false }));
jest.mock("expo-router", () => ({ router: { push: () => undefined } }));
jest.mock("react-native-safe-area-context", () => jest.requireActual("react-native-safe-area-context/jest/mock").default);

async function world() {
  const server = new FakeServer();
  const gateway = new FakeGateway(server, A);
  const db = await openSqlJsDb(`nb-${randomUUID()}`);
  await prepareSchema(db, A);
  const store = new UserStore(db, A, { newId: randomUUID });
  const engine = new SyncEngine(store, new FakeRemote(server, A));
  const understanding = new Understanding(store, () => engine.sync(), new Gateway(gateway));
  const repos = repositoriesFor(store);
  const ben = await repos.people.add({ display_name: "Ben" });
  const lee = await repos.people.add({ display_name: "Sam", relationship_label: "neighbor" });
  await repos.people.add({ display_name: "Sam", relationship_label: "climbing" });
  await engine.sync();
  gateway.script(SAM_NOTE, {
    items: [{
      kind: "thread", statement: "Sam is redoing his kitchen", quote: "Sam is redoing his kitchen", tier: "hold",
      person_id: null, flags: ["person_ambiguous"], detail: { topic: "redoing his kitchen", followup_after_days: 42 },
    }],
    clarification: { about: "person", question: "Which Sam do you mean?", options: [] },
  });
  gateway.script(BEN_NOTE, {
    items: [{
      kind: "event", statement: "Ben runs Chicago Sunday", quote: "Ben runs Chicago Sunday", tier: "auto", person_id: ben.id,
      detail: { date: "2026-10-11", date_precision: "day", event_type: "race", followup_policy: "after" },
    }],
  });
  mockSession = { store, understanding, userId: A };
  return { store, understanding, ben, lee };
}

const flow: { current: TellFlow | null } = { current: null };
function Probe() {
  flow.current = useTellFlow();
  return null;
}

async function settle() {
  for (let i = 0; i < 8; i++) await act(async () => { await new Promise((r) => setTimeout(r, 5)); });
}

async function mount(extra?: React.ReactNode) {
  let r!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(<TellFlowProvider><Probe /><TellDock current="today" onGo={() => undefined} />{extra}</TellFlowProvider>);
  });
  await settle();
  return r;
}

function texts(r: TestRenderer.ReactTestRenderer): string[] {
  return r.root.findAllByType(Text).map((t) => [t.props.children].flat().filter((c) => typeof c === "string").join("")).filter((s) => s.trim());
}
function target(r: TestRenderer.ReactTestRenderer, label: string): ReactTestInstance | null {
  return r.root.findAll((n) => n.props.accessibilityLabel === label && typeof n.props.onPress === "function")[0] ?? null;
}
async function press(r: TestRenderer.ReactTestRenderer, label: string) {
  const t = target(r, label);
  if (!t) throw new Error(`nothing to press: ${label}`);
  await act(async () => t.props.onPress());
}
function field(r: TestRenderer.ReactTestRenderer) {
  return r.root.findAll((n) => n.props.accessibilityLabel === NOTEBOOK_TELL_COPY.title && typeof n.props.onChangeText === "function")[0] ?? null;
}
async function type(r: TestRenderer.ReactTestRenderer, text: string) {
  await act(async () => field(r)!.props.onChangeText(text));
}
const pageOpen = (r: TestRenderer.ReactTestRenderer) => texts(r).includes(NOTEBOOK_TELL_COPY.title);
const keepButton = (r: TestRenderer.ReactTestRenderer) => r.root.findAll((n) => n.props.accessibilityLabel === "Keep" && typeof n.props.onPress === "function")[0];

beforeEach(() => {
  jest.useRealTimers();
  mockAi = true;
});

it("the white pill opens the Tell page; Keep waits for words; closing keeps them as the draft", async () => {
  await world();
  const r = await mount();
  expect(texts(r)).toContain(NOTEBOOK_TELL_COPY.pill);
  await press(r, "Tell Kinship something");
  expect(pageOpen(r)).toBe(true);
  expect(texts(r)).toEqual(expect.arrayContaining([NOTEBOOK_TELL_COPY.aboutAnyone, NOTEBOOK_TELL_COPY.hint]));
  expect(field(r)!.props.placeholder).toBe(NOTEBOOK_TELL_COPY.placeholder);
  expect(field(r)!.props.maxLength).toBe(5000);
  expect(keepButton(r).props.disabled).toBe(true);
  await type(r, "Ben is training for Chicago");
  expect(keepButton(r).props.disabled).toBe(false);
  await press(r, "Close");
  expect(pageOpen(r)).toBe(false);
  // The words wait as the general draft, and the pill says so; opening again brings them back.
  expect(flow.current!.draft(null)).toBe("Ben is training for Chicago");
  expect(texts(r)).toContain("Draft · Ben is training for Chicago");
  await press(r, "Draft · Ben is training for Chicago");
  expect(field(r)!.props.value).toBe("Ben is training for Chicago");
  r.unmount();
});

it("Keep freezes the words with Understanding…; the review takes the page's place when the result arrives", async () => {
  const w = await world();
  const r = await mount();
  await act(async () => flow.current!.openTell!(null));
  await type(r, BEN_NOTE);
  act(() => keepButton(r).props.onPress());
  // Frozen at once: the words stay, no field, no Keep; "Understanding…" with its dot.
  expect(texts(r)).toEqual(expect.arrayContaining([BEN_NOTE, "Understanding…"]));
  expect(field(r)).toBeNull();
  await settle();
  await act(async () => {
    await w.understanding.run();
  });
  await settle();
  expect(pageOpen(r)).toBe(false);
  expect(texts(r)).toEqual(expect.arrayContaining(["Kept for Ben", NOTEBOOK_REVIEW_COPY.title, "Ben runs Chicago Sunday"]));
  // The draft was the note: it's gone now.
  expect(flow.current!.draft(null)).toBe("");
  // Done goes back to the Kept card, as "Correct this" always did (founder I9), on the notebook card.
  await press(r, NOTEBOOK_REVIEW_COPY.done);
  await settle();
  expect(texts(r)).toContain("Kept for Ben.");
  expect(target(r, "Undo")).not.toBeNull();
  r.unmount();
});

it("a question arrives as the review in the page's place: who it's about, never a guess", async () => {
  const w = await world();
  const r = await mount();
  await act(async () => flow.current!.openTell!(null));
  await type(r, SAM_NOTE);
  act(() => keepButton(r).props.onPress());
  await settle();
  await act(async () => {
    await w.understanding.run();
  });
  await settle();
  expect(pageOpen(r)).toBe(false);
  expect(texts(r)).toEqual(expect.arrayContaining([NOTEBOOK_REVIEW_COPY.who, "Which Sam do you mean?"]));
  expect(flow.current!.asking).toBe(true);
  r.unmount();
});

it("closed while understanding: understanding goes on, and the Kept card carries it (Gate D)", async () => {
  const w = await world();
  const r = await mount();
  await act(async () => flow.current!.openTell!(null));
  await type(r, BEN_NOTE);
  act(() => keepButton(r).props.onPress());
  await press(r, "Close");
  expect(pageOpen(r)).toBe(false);
  // (The understanding may already be done here: either way, the page stays closed.)
  await settle();
  await act(async () => {
    await w.understanding.run();
  });
  await settle();
  // Kept, on the card: never a review the user didn't ask to see.
  expect(texts(r)).not.toContain(NOTEBOOK_REVIEW_COPY.title);
  expect(flow.current!.card).toMatchObject({ mode: "card", heading: "Kept for Ben" });
  expect(texts(r)).toEqual(expect.arrayContaining(["Kept for Ben.", "Ben runs Chicago Sunday"]));
  r.unmount();
});

it("a person's page opens it about them through TellSheet; its close is the sheet's close; the draft is theirs", async () => {
  const w = await world();
  const closed = jest.fn();
  function Host({ open }: { open: boolean }) {
    return <TellSheet person={open ? { id: w.ben.id, name: "Ben" } : null} onClose={closed} />;
  }
  let r!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(<TellFlowProvider><Probe /><Host open /></TellFlowProvider>);
  });
  await settle();
  expect(texts(r)).toContain(NOTEBOOK_TELL_COPY.about("Ben"));
  await type(r, "Ran 3:52");
  await press(r, "Close");
  expect(closed).toHaveBeenCalled();
  expect(flow.current!.draft(w.ben.id)).toBe("Ran 3:52");
  expect(flow.current!.draft(null)).toBe("");
  r.unmount();
});

it("Today's \"Tell Kinship\" after a return check opens the page about that person", async () => {
  const w = await world();
  const r = await mount();
  await act(async () => flow.current!.focusTell(w.lee.id));
  await settle();
  expect(texts(r)).toContain(NOTEBOOK_TELL_COPY.about("Sam"));
  r.unmount();
});

it("understanding off: the page says the words are kept as written, and Keep keeps them and closes", async () => {
  mockAi = false;
  const w = await world();
  const r = await mount();
  await act(async () => flow.current!.openTell!(null));
  expect(texts(r)).toContain(NOTEBOOK_TELL_COPY.hintAsWritten);
  await type(r, "Ben loves the lake house");
  await act(async () => keepButton(r).props.onPress());
  await settle();
  expect(pageOpen(r)).toBe(false);
  expect(flow.current!.draft(null)).toBe("");
  const notes = (await w.store.list("captures")) as { raw_text: string | null }[];
  expect(notes.map((c) => c.raw_text)).toContain("Ben loves the lake house");
  r.unmount();
});
