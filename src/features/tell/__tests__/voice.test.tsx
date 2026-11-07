// Voice in Tell (E18, D5; flag `voice_capture`), on the real Tell flow and store, with the phone's
// recognizer faked (test-utils/fakeSpeech). The mic exists only for an account with the flag on a
// phone that listens on the phone; Listening is the board's screen (label, lock line, Stop); Stop puts
// the words in the Tell to read over, never kept on their own; Keep keeps a voice note with how it was
// heard, never audio. A draft emptied by hand goes back to being typed.
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
import { fakeSpeech, type FakeSpeech } from "@/test-utils/fakeSpeech";
import { resetSpeechForTests } from "@/platform/speech";
import { TellFlowProvider, useTellFlow, type TellFlow } from "../TellFlow";
import { TellDock } from "../TellDock";
import { NOTEBOOK_TELL_COPY } from "../notebook/NotebookTell";
import { LISTENING_COPY } from "../voice/Listening";
import { hintNames, nameSpans, runsOf } from "../voice/names";
import { withSpoken } from "../voice/spoken";

const A = "aaaaaaaa-0000-4000-8000-0000000000c3";
const SAID = "Ben runs Chicago Sunday.";

let mockSpeech: FakeSpeech | null = null;
jest.mock("expo-speech-recognition", () => ({
  get ExpoSpeechRecognitionModule() {
    if (!mockSpeech) throw new Error("Cannot find native module 'ExpoSpeechRecognition'");
    return mockSpeech;
  },
}));
let mockSession: { store: UserStore; understanding: Understanding; userId: string } | null = null;
jest.mock("@/providers/V2SessionProvider", () => ({ useV2Session: () => mockSession }));
let mockVoiceFlag = true;
jest.mock("@/hooks/useFlags", () => ({ useFlags: () => ({ ai_extraction: false, tell: true, voice_capture: mockVoiceFlag }) }));
let mockNotebook = true;
jest.mock("../notebook/useTellNotebook", () => ({ useTellNotebook: () => mockNotebook }));
jest.mock("@/hooks/useActivation", () => ({ useActivation: () => ({ activated: true, activate: async () => undefined, firstName: null }) }));
jest.mock("@/hooks/usePersonPortrait", () => ({ usePersonPortrait: () => ({ uri: null, ready: true, pick: async () => undefined, remove: async () => undefined }) }));
jest.mock("@/lib/supabase", () => ({ supabase: null, isSupabaseConfigured: false }));
jest.mock("expo-router", () => ({ router: { push: () => undefined } }));
jest.mock("expo-haptics", () => ({ impactAsync: async () => undefined, ImpactFeedbackStyle: { Light: "light" } }));
jest.mock("react-native-safe-area-context", () => jest.requireActual("react-native-safe-area-context/jest/mock").default);

async function world() {
  const server = new FakeServer();
  const gateway = new FakeGateway(server, A);
  const db = await openSqlJsDb(`voice-${randomUUID()}`);
  await prepareSchema(db, A);
  const store = new UserStore(db, A, { newId: randomUUID });
  const engine = new SyncEngine(store, new FakeRemote(server, A));
  const understanding = new Understanding(store, () => engine.sync(), new Gateway(gateway));
  const repos = repositoriesFor(store);
  const ben = await repos.people.add({ display_name: "Ben Ortiz" });
  mockSession = { store, understanding, userId: A };
  return { store, ben };
}

const flow: { current: TellFlow | null } = { current: null };
function Probe() {
  flow.current = useTellFlow();
  return null;
}
async function settle() {
  for (let i = 0; i < 8; i++) await act(async () => { await new Promise((r) => setTimeout(r, 5)); });
}
async function mount() {
  let r!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(<TellFlowProvider><Probe /><TellDock current="today" onGo={() => undefined} /></TellFlowProvider>);
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
  await settle();
}
const mic = (r: TestRenderer.ReactTestRenderer) => target(r, NOTEBOOK_TELL_COPY.speak);
const keepButton = (r: TestRenderer.ReactTestRenderer) => r.root.findAll((n) => n.props.accessibilityLabel === "Keep" && typeof n.props.onPress === "function")[0];
function pageField(r: TestRenderer.ReactTestRenderer) {
  return r.root.findAll((n) => n.props.accessibilityLabel === NOTEBOOK_TELL_COPY.title && typeof n.props.onChangeText === "function")[0] ?? null;
}

beforeEach(() => {
  jest.useRealTimers();
  resetSpeechForTests();
  mockSpeech = fakeSpeech({ locales: ["en-US"] });
  mockVoiceFlag = true;
  mockNotebook = true;
  jest.spyOn(Intl, "DateTimeFormat").mockReturnValue({ resolvedOptions: () => ({ locale: "en-US" }) } as Intl.DateTimeFormat);
});
afterEach(() => jest.restoreAllMocks());

describe("no mic without on-device voice (contract §8: no broken affordances)", () => {
  it("the flag off: no mic", async () => {
    mockVoiceFlag = false;
    await world();
    const r = await mount();
    await act(async () => flow.current!.openTell!(null));
    await settle();
    expect(pageField(r)).not.toBeNull();
    expect(mic(r)).toBeNull();
    r.unmount();
  });

  it("the flag on, but the phone can't listen on the phone: no mic", async () => {
    mockSpeech = fakeSpeech({ onDevice: false });
    await world();
    const r = await mount();
    await act(async () => flow.current!.openTell!(null));
    await settle();
    expect(mic(r)).toBeNull();
    r.unmount();
  });

  it("the flag on, and a build without speech: no mic", async () => {
    mockSpeech = null;
    await world();
    const r = await mount();
    await act(async () => flow.current!.openTell!(null));
    await settle();
    expect(mic(r)).toBeNull();
    r.unmount();
  });
});

describe("the notebook Tell page", () => {
  it("the mic opens Listening; Stop puts the words in the note; Keep keeps a voice note, never audio", async () => {
    const w = await world();
    const r = await mount();
    await act(async () => flow.current!.openTell!(null));
    await settle();
    await press(r, NOTEBOOK_TELL_COPY.speak);
    // The board's screen: the label, the lock line, Stop; listening began as it opened, on the phone only.
    expect(texts(r)).toEqual(expect.arrayContaining([LISTENING_COPY.label, LISTENING_COPY.lock, LISTENING_COPY.hint]));
    expect(mockSpeech!.started).toHaveLength(1);
    expect(mockSpeech!.started[0]).toMatchObject({ requiresOnDeviceRecognition: true, recordingOptions: { persist: false } });
    expect(mockSpeech!.started[0].contextualStrings).toEqual(expect.arrayContaining(["Ben Ortiz", "Ben"]));
    await act(async () => mockSpeech!.hear(SAID));
    expect(texts(r).join(" ")).toContain("runs Chicago Sunday.");
    // Nothing is kept by listening.
    expect(await w.store.list("captures")).toHaveLength(0);
    await press(r, LISTENING_COPY.stop);
    expect(texts(r)).not.toContain(LISTENING_COPY.lock);
    expect(pageField(r)!.props.value).toBe(SAID);
    await act(async () => keepButton(r).props.onPress());
    await settle();
    const notes = (await w.store.list("captures")) as { raw_text: string; source: string; transcript_meta: unknown }[];
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({ raw_text: SAID, source: "voice" });
    expect(notes[0].transcript_meta).toEqual({ on_device: true, locale: "en-US", duration_s: expect.any(Number) });
    r.unmount();
  });

  it("about someone: \"Listening · for\" them, by the name the page uses; spoken words go after what was typed", async () => {
    const w = await world();
    const r = await mount();
    await act(async () => flow.current!.openTell!(w.ben.id));
    await settle();
    await act(async () => pageField(r)!.props.onChangeText("Saw him tonight."));
    await press(r, NOTEBOOK_TELL_COPY.speak);
    expect(texts(r)).toContain(LISTENING_COPY.labelFor("Ben Ortiz"));
    await act(async () => mockSpeech!.hear("He starts the new job Monday.", true));
    await press(r, LISTENING_COPY.stop);
    expect(flow.current!.draft(w.ben.id)).toBe("Saw him tonight. He starts the new job Monday.");
    r.unmount();
  });

  it("no microphone permission: says so, keeps nothing, and the page is as it was", async () => {
    mockSpeech = fakeSpeech({ locales: ["en-US"], granted: false });
    await world();
    const r = await mount();
    await act(async () => flow.current!.openTell!(null));
    await settle();
    await press(r, NOTEBOOK_TELL_COPY.speak);
    expect(texts(r)).toEqual(expect.arrayContaining([LISTENING_COPY.denied, LISTENING_COPY.deniedBody]));
    expect(mockSpeech!.started).toHaveLength(0);
    await press(r, LISTENING_COPY.close);
    expect(pageField(r)!.props.value).toBe("");
    r.unmount();
  });

  it("the phone can't after all: says so, and the mic is gone for the session", async () => {
    await world();
    const r = await mount();
    await act(async () => flow.current!.openTell!(null));
    await settle();
    await press(r, NOTEBOOK_TELL_COPY.speak);
    await act(async () => mockSpeech!.emit("error", { error: "language-not-supported", message: "" }));
    expect(texts(r)).toContain(LISTENING_COPY.unavailable);
    await press(r, LISTENING_COPY.close);
    // The next opening of Tell checks again and finds no voice.
    r.unmount();
    const again = await mount();
    await act(async () => flow.current!.openTell!(null));
    await settle();
    expect(mic(again)).toBeNull();
    again.unmount();
  });

  it("spoken, then emptied by hand and typed: kept as typed", async () => {
    const w = await world();
    const r = await mount();
    await act(async () => flow.current!.openTell!(null));
    await settle();
    await press(r, NOTEBOOK_TELL_COPY.speak);
    await act(async () => mockSpeech!.hear(SAID, true));
    await press(r, LISTENING_COPY.stop);
    await act(async () => pageField(r)!.props.onChangeText(""));
    await act(async () => pageField(r)!.props.onChangeText("Typed instead."));
    await act(async () => keepButton(r).props.onPress());
    await settle();
    const notes = (await w.store.list("captures")) as { source: string; transcript_meta: unknown }[];
    expect(notes).toHaveLength(1);
    expect(notes[0].source).toBe("text");
    expect(notes[0].transcript_meta ?? null).toBeNull();
    r.unmount();
  });
});

describe("the Tell field on Today and People", () => {
  it("the empty field's round button is the mic; Stop leaves the words in the field to send", async () => {
    mockNotebook = false;
    const w = await world();
    const r = await mount();
    expect(target(r, "Send to Kinship")).toBeNull();
    await press(r, "Say it instead");
    expect(texts(r)).toContain(LISTENING_COPY.lock);
    await act(async () => mockSpeech!.hear(SAID, true));
    await press(r, LISTENING_COPY.stop);
    expect(flow.current!.draft(null)).toBe(SAID);
    // With words in it, the round button is Send again.
    expect(target(r, "Say it instead")).toBeNull();
    await press(r, "Send to Kinship");
    const notes = (await w.store.list("captures")) as { source: string; transcript_meta: { on_device: boolean } | null }[];
    expect(notes).toHaveLength(1);
    expect(notes[0].source).toBe("voice");
    expect(notes[0].transcript_meta?.on_device).toBe(true);
    r.unmount();
  });

  it("without voice, the empty field has no round button at all", async () => {
    mockNotebook = false;
    mockVoiceFlag = false;
    await world();
    const r = await mount();
    expect(target(r, "Say it instead")).toBeNull();
    expect(target(r, "Send to Kinship")).toBeNull();
    r.unmount();
  });
});

describe("words and names", () => {
  it("each person is listened for by full name and first name", () => {
    expect(hintNames([{ display_name: "Ben Ortiz" }, { display_name: "Kaiya" }, { display_name: " " }])).toEqual(["Ben Ortiz", "Ben", "Kaiya"]);
  });

  it("names heard are whole words, longest first, any case", () => {
    const text = "Saw ben ortiz and Benjamin; Ben's son too.";
    const spans = nameSpans(text, ["Ben", "Ben Ortiz"]);
    expect(spans.map((s) => text.slice(s.start, s.end))).toEqual(["ben ortiz", "Ben"]);
    expect(runsOf("Hi Ben!", nameSpans("Hi Ben!", ["Ben"]))).toEqual([
      { text: "Hi ", name: false }, { text: "Ben", name: true }, { text: "!", name: false },
    ]);
  });

  it("spoken words go after what's written, within the note's limit", () => {
    expect(withSpoken("", " Hello ", 100)).toBe("Hello");
    expect(withSpoken("Typed. ", "Spoken.", 100)).toBe("Typed. Spoken.");
    expect(withSpoken("Line one\n", "Spoken.", 100)).toBe("Line one\nSpoken.");
    expect(withSpoken("abc", "defgh", 6)).toBe("abc de");
    expect(withSpoken("Typed.", "  ", 100)).toBe("Typed.");
  });
});
