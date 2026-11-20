// On-device speech (E18, D5): voice exists only where the phone can promise
// on-device recognition, every session asks for it, audio is never written,
// and a phone that says otherwise loses the mic for the session.
import { Platform } from "react-native";
import { fakeSpeech, type FakeSpeech } from "@/test-utils/fakeSpeech";
import * as speech from "../speech";

let mockSpeech: FakeSpeech | null = null;
// Read on each use: a test can take the module away (a build from before voice).
jest.mock("expo-speech-recognition", () => ({
  get ExpoSpeechRecognitionModule() {
    if (!mockSpeech) throw new Error("Cannot find native module 'ExpoSpeechRecognition'");
    return mockSpeech;
  },
}));

const os = { OS: Platform.OS as string, Version: Platform.Version as unknown };
Object.defineProperty(Platform, "OS", { get: () => os.OS, configurable: true });
Object.defineProperty(Platform, "Version", { get: () => os.Version, configurable: true });

/** The speech module with nothing checked yet. */
function load() {
  speech.resetSpeechForTests();
  return speech;
}

beforeEach(() => {
  // The session's three-minute cap is a timer: never left running past a test.
  jest.useFakeTimers();
  os.OS = "ios";
  os.Version = "18.1";
  mockSpeech = fakeSpeech();
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

const handlers = () => ({ onText: jest.fn(), onLevel: jest.fn(), onEnd: jest.fn(), onFail: jest.fn() });
/** Stop as the phone does it: the recognizer's "end" lands on a later turn. */
const stop = async (session: speech.ListenSession | null) => {
  session!.stop();
  await mockSpeech!.settled();
};
const ms = (start: number, end: number) => [{ startTimeMillis: start, endTimeMillis: end }];

describe("whether this phone can listen on the phone", () => {
  it("iOS with on-device recognition in the phone's language: yes", async () => {
    expect(await load().onDeviceVoice()).toEqual({ locale: expect.stringMatching(/^[a-z]{2}(-[A-Z]{2})?$/) });
  });

  it("a build without the native module: no", async () => {
    mockSpeech = null;
    expect(await load().onDeviceVoice()).toBeNull();
  });

  it("the web (its recognizer sends audio to a server): no", async () => {
    os.OS = "web";
    expect(await load().onDeviceVoice()).toBeNull();
  });

  it("a phone without on-device recognition: no", async () => {
    mockSpeech = fakeSpeech({ onDevice: false });
    expect(await load().onDeviceVoice()).toBeNull();
  });

  it("a language the recognizer doesn't have: no", async () => {
    mockSpeech = fakeSpeech({ locales: ["ja-JP"] });
    expect(await load().onDeviceVoice()).toBeNull();
  });

  it("Android 12, which can only prefer offline: no", async () => {
    os.OS = "android";
    os.Version = 32;
    expect(await load().onDeviceVoice()).toBeNull();
  });

  it("Android 13+ needs the language downloaded for on-device use", async () => {
    os.OS = "android";
    os.Version = 34;
    mockSpeech = fakeSpeech({ locales: ["en-US"], installedLocales: [] });
    expect(await load().onDeviceVoice()).toBeNull();
    mockSpeech = fakeSpeech({ locales: ["en-US"], installedLocales: ["en-US"] });
    const s = load();
    jest.spyOn(Intl, "DateTimeFormat").mockReturnValue({ resolvedOptions: () => ({ locale: "en-US" }) } as Intl.DateTimeFormat);
    expect(await s.onDeviceVoice()).toEqual({ locale: "en-US" });
    jest.restoreAllMocks();
  });
});

describe("locales", () => {
  it("canonical tags", () => {
    const s = load();
    expect(s.canonicalLocale("en_us")).toBe("en-US");
    expect(s.canonicalLocale("zh-Hant-TW")).toBe("zh-TW");
    expect(s.canonicalLocale("fr")).toBe("fr");
  });

  it("the phone's own locale, else the language's only match, else none", () => {
    const s = load();
    expect(s.pickLocale("en-GB", ["en-US", "en-GB"])).toBe("en-GB");
    expect(s.pickLocale("fr-CA", ["en-US", "fr-FR"])).toBe("fr-FR");
    expect(s.pickLocale("en-AU", ["en-US", "en-GB"])).toBeNull();
    expect(s.pickLocale("de-DE", ["en-US"])).toBeNull();
  });
});

describe("listening", () => {
  it("asks for on-device recognition every time and never records to a file", async () => {
    const s = load();
    const h = handlers();
    await s.listen({ locale: "en-US" }, ["Ben", "Kaiya"], h);
    expect(mockSpeech!.started).toHaveLength(1);
    expect(mockSpeech!.started[0]).toMatchObject({
      lang: "en-US", requiresOnDeviceRecognition: true, interimResults: true, continuous: true,
      contextualStrings: ["Ben", "Kaiya"], recordingOptions: { persist: false },
    });
  });

  it("settled words and words still being heard make one text; Stop ends with all of it", async () => {
    const s = load();
    const h = handlers();
    const session = await s.listen({ locale: "en-US" }, [], h);
    mockSpeech!.hear("Saw David");
    mockSpeech!.hear("Saw David tonight.", true);
    mockSpeech!.hear("His son starts");
    expect(h.onText).toHaveBeenLastCalledWith("Saw David tonight. His son starts");
    await stop(session);
    expect(h.onEnd).toHaveBeenCalledWith("Saw David tonight. His son starts");
    expect(h.onFail).not.toHaveBeenCalled();
  });

  // The founder's note (K34, 10 Nov 2026), as iOS 18 sends it: a pause marked final, then at Stop the
  // same sentence as final once more, with the module's leading space.
  const KAIYA = "She is the silliest little girl in the world and is very much into dressing up like princesses";

  it("iOS 18 sends a pause as final and the same sentence as final again at Stop: kept once (K34)", async () => {
    const s = load();
    const h = handlers();
    const session = await s.listen({ locale: "en-US" }, [], h);
    mockSpeech!.hear("She is the silliest little girl");
    mockSpeech!.hear(KAIYA, true);
    session!.stop();
    mockSpeech!.hear(` ${KAIYA}`, true);
    await mockSpeech!.settled();
    expect(h.onEnd).toHaveBeenCalledWith(KAIYA);
    expect(h.onEnd.mock.calls[0][0].split("silliest")).toHaveLength(2);
  });

  it("K34 with the recognizer's timing on both finals, a little apart (the re-send covers the same audio): kept once", async () => {
    const s = load();
    const h = handlers();
    const session = await s.listen({ locale: "en-US" }, [], h);
    mockSpeech!.hear("She is the silliest little girl");
    mockSpeech!.hear(KAIYA, true, ms(0, 2000));
    session!.stop();
    mockSpeech!.hear(` ${KAIYA}`, true, ms(0, 2010));
    await mockSpeech!.settled();
    expect(h.onEnd).toHaveBeenCalledWith(KAIYA);
    // The same, when the timing drifts by more than a little, with nothing heard between.
    const t = new s.Transcript();
    t.partial({ transcript: "Ben got" });
    t.final({ transcript: "Ben got the job.", segments: ms(0, 1500) });
    t.final({ transcript: " Ben got the job.", segments: ms(1200, 1700) });
    expect(t.text).toBe("Ben got the job.");
  });

  it("the recognizer's own timing of a new utterance is never ignored: disjoint spans with nothing heard between keep both", () => {
    const s = load();
    // Probe G: a different thought after a pause, no partial in between.
    const g = new s.Transcript();
    g.partial({ transcript: "Ben loves" });
    g.final({ transcript: "Ben loves hiking.", segments: ms(0, 1500) });
    g.final({ transcript: " Ben loves swimming.", segments: ms(2500, 4000) });
    expect(g.text).toBe("Ben loves hiking. Ben loves swimming.");
    // Probe I: a genuine repeat a second and a half later, no partial in between.
    const i = new s.Transcript();
    i.partial({ transcript: "Ben" });
    i.final({ transcript: "Ben ran.", segments: ms(0, 500) });
    i.final({ transcript: " Ben ran.", segments: ms(2000, 2500) });
    expect(i.text).toBe("Ben ran. Ben ran.");
  });

  it("a re-reading keeps the length and most of the words; one word changed in a short sentence is a different thought", () => {
    const s = load();
    // Probe L: the same span, one of two words changed: kept after, never in place of.
    const l = new s.Transcript();
    l.partial({ transcript: "Ben" });
    l.final({ transcript: "Ben ran.", segments: ms(0, 500) });
    l.final({ transcript: " Ben swam.", segments: ms(0, 500) });
    expect(l.text).toBe("Ben ran. Ben swam.");
    // Probe H: no timing, no partial between, one of three words changed: kept after.
    const h = new s.Transcript();
    h.partial({ transcript: "Ben loves" });
    h.final({ transcript: "Ben loves hiking." });
    h.final({ transcript: " Ben loves swimming." });
    expect(h.text).toBe("Ben loves hiking. Ben loves swimming.");
    // A long sentence re-read with one word revised, the same span: the re-reading.
    const k = new s.Transcript();
    k.partial({ transcript: "She is the silliest" });
    k.final({ transcript: "She is the silliest little girl in the whole world.", segments: ms(0, 3000) });
    k.final({ transcript: " She is the silliest little girl in the wide world.", segments: ms(0, 3000) });
    expect(k.text).toBe("She is the silliest little girl in the wide world.");
    // A reading that lost or gained more than a word is not a re-reading.
    const m = new s.Transcript();
    m.partial({ transcript: "She is" });
    m.final({ transcript: "She is the silliest little girl in the whole world.", segments: ms(0, 3000) });
    m.final({ transcript: " She is the silliest little girl.", segments: ms(0, 3000) });
    expect(m.text).toBe("She is the silliest little girl in the whole world. She is the silliest little girl.");
  });

  it("the same utterance re-read with a word changed takes the first reading's place; mostly other words are something new", async () => {
    const s = load();
    const h = handlers();
    const session = await s.listen({ locale: "en-US" }, [], h);
    mockSpeech!.hear("Ben got the");
    mockSpeech!.hear("Ben got the job.", true, ms(0, 1500));
    session!.stop();
    mockSpeech!.hear(" Ben got that job.", true, ms(0, 1500));
    await mockSpeech!.settled();
    expect(h.onEnd).toHaveBeenCalledWith("Ben got that job.");
    // The same timing with other words is not a re-reading: nothing the user said is lost.
    const t = new s.Transcript();
    t.partial({ transcript: "Ben" });
    t.final({ transcript: "Ben ran.", segments: ms(0, 500) });
    t.final({ transcript: " Lee swam.", segments: ms(0, 500) });
    expect(t.text).toBe("Ben ran. Lee swam.");
  });

  it("the user saying the same words again is kept twice: the second time arrives as partials first", async () => {
    const s = load();
    const h = handlers();
    const session = await s.listen({ locale: "en-US" }, [], h);
    mockSpeech!.hear("I love");
    mockSpeech!.hear("I love her", true);
    mockSpeech!.hear(" I");
    mockSpeech!.hear(" I love her");
    mockSpeech!.hear(" I love her so much", true);
    session!.stop();
    mockSpeech!.hear(" I love her so much", true); // iOS 18 at Stop
    await mockSpeech!.settled();
    expect(h.onEnd).toHaveBeenCalledWith("I love her I love her so much");
  });

  it("a short word said again after a pause is two, with or without timing: 'no' [pause] 'no'", async () => {
    const s = load();
    const t = new s.Transcript();
    t.partial({ transcript: "no" });
    t.final({ transcript: "No." });
    t.partial({ transcript: " no" });
    t.final({ transcript: " No." });
    expect(t.text).toBe("No. No.");
    const timed = new s.Transcript();
    timed.partial({ transcript: "no" });
    timed.final({ transcript: "No.", segments: ms(0, 300) });
    timed.partial({ transcript: " no" });
    timed.final({ transcript: " No.", segments: ms(900, 1200) });
    expect(timed.text).toBe("No. No.");
  });

  it("two separate utterances with the same words, and 'no, no, no': every word the user said", async () => {
    const s = load();
    const h = handlers();
    const session = await s.listen({ locale: "en-US" }, [], h);
    mockSpeech!.hear("Ben");
    mockSpeech!.hear("Ben ran.", true, ms(0, 700));
    mockSpeech!.hear(" Ben");
    mockSpeech!.hear(" Ben ran.", true, ms(2000, 2700));
    mockSpeech!.hear(" No, no");
    mockSpeech!.hear(" No, no, no.", true, ms(4000, 5000));
    session!.stop();
    mockSpeech!.hear(" No, no, no.", true, ms(4000, 5000));
    await mockSpeech!.settled();
    expect(h.onEnd).toHaveBeenCalledWith("Ben ran. Ben ran. No, no, no.");
  });

  it("a passage said twice in one breath is one utterance, kept as said", async () => {
    const s = load();
    const h = handlers();
    const session = await s.listen({ locale: "en-US" }, [], h);
    mockSpeech!.hear("Ben ran Ben");
    mockSpeech!.hear("Ben ran. Ben ran.", true);
    await stop(session);
    expect(h.onEnd).toHaveBeenCalledWith("Ben ran. Ben ran.");
  });

  it("partials replace what is being heard, never add to it; a pause and more words make segments in order", async () => {
    const s = load();
    const h = handlers();
    const session = await s.listen({ locale: "en-US" }, [], h);
    mockSpeech!.hear("Saw");
    mockSpeech!.hear("Saw David");
    mockSpeech!.hear("Saw David tonight.", true);
    expect(h.onText).toHaveBeenLastCalledWith("Saw David tonight.");
    mockSpeech!.hear(" His son");
    expect(h.onText).toHaveBeenLastCalledWith("Saw David tonight. His son");
    mockSpeech!.hear(" His son starts Monday.", true);
    session!.stop();
    mockSpeech!.hear(" His son starts Monday.", true);
    await mockSpeech!.settled();
    expect(h.onEnd).toHaveBeenCalledWith("Saw David tonight. His son starts Monday.");
  });

  it("a recognizer that sends the whole session (iOS 17): the one final arrives after Stop and before end, and holds everything, once", async () => {
    const s = load();
    const h = handlers();
    const session = await s.listen({ locale: "en-US" }, [], h);
    mockSpeech!.hear("Saw David tonight");
    mockSpeech!.hear("Saw David tonight. His son");
    mockSpeech!.hear("Saw David tonight. His son starts Monday.");
    expect(h.onText).toHaveBeenLastCalledWith("Saw David tonight. His son starts Monday.");
    session!.stop();
    // The real final, after Stop and before end: its words (revised) are what is kept.
    mockSpeech!.hear("Saw David tonight. His son starts on Monday.", true);
    await mockSpeech!.settled();
    expect(h.onEnd).toHaveBeenCalledTimes(1);
    expect(h.onEnd).toHaveBeenCalledWith("Saw David tonight. His son starts on Monday.");
  });

  it("the whole session sent again as one final, with nothing new heard: kept once; with more: the more is added", () => {
    const s = load();
    const t = new s.Transcript();
    t.partial({ transcript: "Saw David" });
    t.final({ transcript: "Saw David tonight." });
    t.partial({ transcript: " His son" });
    t.final({ transcript: " His son starts Monday." });
    t.final({ transcript: "Saw David tonight. His son starts Monday." });
    expect(t.text).toBe("Saw David tonight. His son starts Monday.");
    t.final({ transcript: "Saw David tonight. His son starts Monday. He's nervous." });
    expect(t.text).toBe("Saw David tonight. His son starts Monday. He's nervous.");
    // An accumulating partial after settled words: only the new words are being heard.
    t.partial({ transcript: "Saw David tonight. His son starts Monday. He's nervous. We should" });
    expect(t.text).toBe("Saw David tonight. His son starts Monday. He's nervous. We should");
  });

  it("an empty final (iOS 18 after the real last one) leaves the words heard so far standing", () => {
    const s = load();
    const t = new s.Transcript();
    t.partial({ transcript: "Ben got the job" });
    t.final({ transcript: "" });
    expect(t.text).toBe("Ben got the job");
    t.final({ transcript: "Ben got the job." });
    expect(t.text).toBe("Ben got the job.");
  });

  it("the platform limits, as they are: no timing and no partial between is the same utterance again", () => {
    // Android gives no word timing. A genuine repeat arrives as partials first and is kept twice (above);
    // a second final with the same words and nothing heard between cannot be told from a re-send.
    const s = load();
    const t = new s.Transcript();
    t.partial({ transcript: "I love her" });
    t.final({ transcript: "I love her." });
    t.final({ transcript: " I love her." });
    expect(t.text).toBe("I love her.");
    // And mostly-shared words of the same length, no timing, no partial between: taken as a re-reading.
    const r = new s.Transcript();
    r.partial({ transcript: "She is the silliest" });
    r.final({ transcript: "She is the silliest little girl in the whole world." });
    r.final({ transcript: " She is the silliest little girl in the wide world." });
    expect(r.text).toBe("She is the silliest little girl in the wide world.");
    // Probe C: a recognizer that re-emitted a pause-final's words as a partial before its Stop re-send
    // would, without timing, be taken at its word (a partial is a new utterance): kept twice. iOS 18
    // carries timing, so the re-send's overlap drops it there; theoretical on Android.
    const c = new s.Transcript();
    c.partial({ transcript: "Ben got" });
    c.final({ transcript: "Ben got the job." });
    c.partial({ transcript: " Ben got the job." });
    c.final({ transcript: " Ben got the job." });
    expect(c.text).toBe("Ben got the job. Ben got the job.");
    const ios = new s.Transcript();
    ios.partial({ transcript: "Ben got" });
    ios.final({ transcript: "Ben got the job.", segments: ms(0, 1500) });
    ios.partial({ transcript: " Ben got the job." });
    ios.final({ transcript: " Ben got the job.", segments: ms(0, 1500) });
    // With a partial between, even overlapping timing never drops: the partial is the certain signal.
    expect(ios.text).toBe("Ben got the job. Ben got the job.");
  });

  it("an ended session takes no late result", async () => {
    const s = load();
    const h = handlers();
    const session = await s.listen({ locale: "en-US" }, [], h);
    mockSpeech!.hear("Ben got the job", true);
    await stop(session);
    mockSpeech!.hear(" Ben got the job", true);
    mockSpeech!.emit("end");
    expect(h.onEnd).toHaveBeenCalledTimes(1);
    expect(h.onEnd).toHaveBeenCalledWith("Ben got the job");
    expect(h.onText).toHaveBeenCalledTimes(1);
  });

  it("an interruption mid-utterance ends with the settled words and the ones still being heard", async () => {
    const s = load();
    const h = handlers();
    await s.listen({ locale: "en-US" }, [], h);
    mockSpeech!.hear("Ben got the job.", true);
    mockSpeech!.hear(" His sister");
    mockSpeech!.emit("error", { error: "interrupted", message: "" });
    mockSpeech!.emit("end");
    expect(h.onEnd).toHaveBeenCalledTimes(1);
    expect(h.onEnd).toHaveBeenCalledWith("Ben got the job. His sister");
  });

  it("a session that heard nothing and was stopped ends with nothing, once", async () => {
    const s = load();
    const h = handlers();
    const session = await s.listen({ locale: "en-US" }, [], h);
    session!.stop();
    mockSpeech!.emit("error", { error: "no-speech", message: "" });
    await mockSpeech!.settled();
    expect(h.onEnd).toHaveBeenCalledTimes(1);
    expect(h.onEnd).toHaveBeenCalledWith("");
    expect(h.onFail).not.toHaveBeenCalled();
  });

  it("no microphone permission: denied, and nothing listens", async () => {
    mockSpeech = fakeSpeech({ granted: false });
    const s = load();
    const h = handlers();
    expect(await s.listen({ locale: "en-US" }, [], h)).toBeNull();
    expect(h.onFail).toHaveBeenCalledWith("denied");
    expect(mockSpeech!.started).toHaveLength(0);
  });

  it("the phone can't after all: unavailable, and no mic for the rest of the session", async () => {
    const s = load();
    expect(await s.onDeviceVoice()).not.toBeNull();
    const h = handlers();
    await s.listen({ locale: "en-US" }, [], h);
    mockSpeech!.emit("error", { error: "language-not-supported", message: "" });
    expect(h.onFail).toHaveBeenCalledWith("unavailable");
    expect(h.onEnd).not.toHaveBeenCalled();
    expect(await s.onDeviceVoice()).toBeNull();
  });

  it("silence or an interruption after some words ends with those words", async () => {
    const s = load();
    const h = handlers();
    await s.listen({ locale: "en-US" }, [], h);
    mockSpeech!.hear("Ben got the job");
    mockSpeech!.emit("error", { error: "interrupted", message: "" });
    expect(h.onEnd).toHaveBeenCalledWith("Ben got the job");
  });

  it("cancel throws the words away and reports nothing", async () => {
    const s = load();
    const h = handlers();
    const session = await s.listen({ locale: "en-US" }, [], h);
    mockSpeech!.hear("Ben got the job");
    session!.cancel();
    expect(mockSpeech!.aborted).toBe(1);
    expect(h.onEnd).not.toHaveBeenCalled();
    expect(h.onFail).not.toHaveBeenCalled();
  });

  it("loudness becomes 0..1", () => {
    const s = load();
    expect(s.levelOf(-2)).toBe(0);
    expect(s.levelOf(10)).toBe(1);
    expect(s.levelOf(4)).toBeCloseTo(0.5);
    expect(s.levelOf(Number.NaN)).toBe(0);
  });
});
