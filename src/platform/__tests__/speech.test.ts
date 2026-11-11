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
    session!.stop();
    expect(h.onEnd).toHaveBeenCalledWith("Saw David tonight. His son starts");
    expect(h.onFail).not.toHaveBeenCalled();
  });

  it("iOS 18 sends a pause as final and the same sentence as final again at Stop: kept once", async () => {
    const s = load();
    const h = handlers();
    const session = await s.listen({ locale: "en-US" }, [], h);
    const said = "She is the silliest little girl in the world and is very much into dressing up like princesses";
    mockSpeech!.hear("She is the silliest little girl");
    mockSpeech!.hear(said, true);
    mockSpeech!.hear(` ${said}`, true);
    session!.stop();
    expect(h.onEnd).toHaveBeenCalledWith(said);
  });

  it("a result holding the whole session so far replaces what was settled", () => {
    const s = load();
    expect(s.joinWords("Saw David tonight.", "Saw David tonight. His son starts Monday.")).toBe("Saw David tonight. His son starts Monday.");
    expect(s.joinWords("Saw David tonight.", "saw david tonight")).toBe("Saw David tonight.");
    expect(s.joinWords("Saw David tonight.", "His son starts Monday.")).toBe("Saw David tonight. His son starts Monday.");
    expect(s.joinWords("I love her", "her")).toBe("I love her her");
  });

  it("a passage said twice over, word for word, is kept once", () => {
    const s = load();
    const said = "She is the silliest little girl in the world and is very much into dressing up like princesses";
    expect(s.onceOver(`${said} ${said}`)).toBe(said);
    expect(s.onceOver("Ben ran. Ben ran.")).toBe("Ben ran. Ben ran.");
    expect(s.onceOver(said)).toBe(said);
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
