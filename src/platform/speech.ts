// On-device speech for Tell (E18, D5; plan T3 and §21; tickets VOX-02/04).
//
// The phone's own recognizer (expo-speech-recognition: SFSpeechRecognizer on
// iOS, Android's on-device SpeechRecognizer), only ever on the phone:
//
//   on-device or nothing   Every session sets requiresOnDeviceRecognition.
//                          On iOS the request then never leaves the phone and
//                          fails instead; Android below 13 can only *prefer*
//                          offline, so it gets no voice at all. A phone, OS
//                          or language that can't promise on-device has no
//                          mic: typing stays (D5). There is no server path.
//   no audio kept          Recording to a file is never asked for; the words
//                          are all that leave the recognizer.
//   fail closed            No native module (a build from before voice, the
//                          web, tests), a failed check or a start that says
//                          the language or service isn't there: unavailable.
//                          A failed start also hides the mic for the rest of
//                          the session.
//
// Names of the user's people go to the recognizer as hints (contextual
// strings), on the phone, so "Kaiya" isn't heard as "Kia".
import { Platform } from "react-native";

/** What a phone that can listen on-device listens in. */
export interface VoiceSupport {
  /** BCP-47, as the recognizer takes it ("en-US"). */
  locale: string;
}

/** What a listening session reports, as it happens. */
export interface ListenHandlers {
  /** The words so far: everything settled plus what's still being heard. */
  onText: (text: string) => void;
  /** Loudness, 0 (quiet) to 1, about ten times a second. */
  onLevel?: (level: number) => void;
  /** The session is over; `text` is the last of the words. */
  onEnd: (text: string) => void;
  /** It couldn't listen. The mic is already hidden when the reason is the phone. */
  onFail: (reason: ListenFailure) => void;
}

/** "denied": no microphone permission; "unavailable": the phone can't listen on-device after all. */
export type ListenFailure = "denied" | "unavailable";

export interface ListenSession {
  /** Stop listening and finish with what was heard (onEnd follows). */
  stop: () => void;
  /** Stop and throw the words away (nothing follows). */
  cancel: () => void;
}

/** The longest one listening session runs before it finishes by itself. */
export const LISTEN_MAX_MS = 3 * 60 * 1000;

// ─── the native module, if this build has it ─────────────────────────────

type Native = typeof import("expo-speech-recognition").ExpoSpeechRecognitionModule;

let native: Native | null | undefined;

function speech(): Native | null {
  if (native !== undefined) return native;
  // The web's SpeechRecognition sends audio to a server: never on the web.
  if (Platform.OS !== "ios" && Platform.OS !== "android") return (native = null);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    native = (require("expo-speech-recognition") as typeof import("expo-speech-recognition")).ExpoSpeechRecognitionModule ?? null;
  } catch {
    // A binary from before voice: the JS may be newer than the build.
    native = null;
  }
  return native;
}

// ─── can this phone listen on-device? ────────────────────────────────────

let support: Promise<VoiceSupport | null> | null = null;
let ruledOut = false;

/** The phone's language as a BCP-47 tag ("en-US"). */
export function phoneLocale(): string {
  try {
    const tag = Intl.DateTimeFormat().resolvedOptions().locale;
    if (tag) return canonicalLocale(tag);
  } catch {
    // No Intl: the recognizer's own default.
  }
  return "en-US";
}

/** "en_us" → "en-US"; script and other subtags are dropped. */
export function canonicalLocale(tag: string): string {
  const [lang, ...rest] = tag.replace(/_/gu, "-").split("-");
  const region = rest.find((p) => /^[A-Za-z]{2}$|^\d{3}$/u.test(p));
  return region ? `${lang.toLowerCase()}-${region.toUpperCase()}` : lang.toLowerCase();
}

/** The locale to listen in, if `locales` has it (exactly, else the same language's only match). */
export function pickLocale(wanted: string, locales: readonly string[]): string | null {
  const all = locales.map(canonicalLocale);
  const want = canonicalLocale(wanted);
  if (all.includes(want)) return want;
  const lang = want.split("-")[0];
  const same = all.filter((l) => l.split("-")[0] === lang);
  return same.length === 1 ? same[0] : null;
}

/**
 * Whether this phone can turn speech into words on the phone, in its own
 * language; null when it can't (or this build has no speech at all).
 * Checked once per session.
 */
export function onDeviceVoice(): Promise<VoiceSupport | null> {
  if (ruledOut) return Promise.resolve(null);
  support ??= check().catch(() => null);
  return support.then((s) => (ruledOut ? null : s));
}

async function check(): Promise<VoiceSupport | null> {
  const m = speech();
  if (!m) return null;
  // Android 13 is the first that runs a recognizer only on the phone.
  if (Platform.OS === "android" && Number(Platform.Version) < 33) return null;
  if (!m.supportsOnDeviceRecognition()) return null;
  const { locales, installedLocales } = await m.getSupportedLocales({});
  // Android lists the on-device languages it has downloaded; iOS, every language it knows.
  const usable = Platform.OS === "android" ? installedLocales : locales;
  const locale = pickLocale(phoneLocale(), usable);
  return locale ? { locale } : null;
}

/** The phone said it can't after all: no mic for the rest of the session. */
export function ruleOutVoice(): void {
  ruledOut = true;
}

/** Tests only: forget what was checked. */
export function resetSpeechForTests(): void {
  native = undefined;
  support = null;
  ruledOut = false;
}

// ─── listening ───────────────────────────────────────────────────────────

/** Settled words plus the words still being heard, with one space between. */
export function joinWords(settled: string, hearing: string): string {
  const a = settled.trim();
  const b = hearing.trim();
  return a && b ? `${a} ${b}` : a || b;
}

/** The recognizer's loudness (about -2 to 10) as 0..1. */
export function levelOf(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, (value + 2) / 12));
}

/** Errors that mean the phone can't listen on-device here: never tried again this session. */
const NOT_HERE = new Set(["language-not-supported", "service-not-allowed", "network", "bad-grammar"]);

/**
 * Asks for the microphone (the first time), then listens until stopped.
 * Resolves with the session, or null when it couldn't start (onFail says why).
 */
export async function listen(support: VoiceSupport, names: readonly string[], on: ListenHandlers): Promise<ListenSession | null> {
  const m = speech();
  if (!m) {
    on.onFail("unavailable");
    return null;
  }
  const permission = await m.requestMicrophonePermissionsAsync().catch(() => null);
  if (!permission?.granted) {
    on.onFail("denied");
    return null;
  }

  let settled = "";
  let hearing = "";
  let done = false;
  let cancelled = false;
  let cap: ReturnType<typeof setTimeout> | undefined;
  const subs: { remove: () => void }[] = [];
  const words = () => joinWords(settled, hearing);
  const close = () => {
    done = true;
    clearTimeout(cap);
    for (const s of subs) s.remove();
  };
  const finish = () => {
    if (done) return;
    close();
    if (!cancelled) on.onEnd(words());
  };
  const fail = (reason: ListenFailure) => {
    if (done) return;
    close();
    if (!cancelled) on.onFail(reason);
  };

  subs.push(
    m.addListener("result", (e) => {
      const said = e.results[0]?.transcript ?? "";
      if (e.isFinal) {
        settled = joinWords(settled, said);
        hearing = "";
      } else {
        hearing = said;
      }
      if (!cancelled && !done) on.onText(words());
    }),
    m.addListener("volumechange", (e) => {
      if (!done) on.onLevel?.(levelOf(e.value));
    }),
    m.addListener("error", (e) => {
      if (NOT_HERE.has(e.error)) ruleOutVoice();
      // Nothing heard yet: say why. Otherwise (silence, a call, "aborted") it ends with what was heard.
      if (!words() && NOT_HERE.has(e.error)) fail("unavailable");
      else if (!words() && e.error === "not-allowed") fail("denied");
      else finish();
    }),
    m.addListener("end", finish),
  );

  try {
    m.start({
      lang: support.locale,
      interimResults: true,
      continuous: true,
      requiresOnDeviceRecognition: true,
      addsPunctuation: true,
      contextualStrings: [...new Set(names)].slice(0, 100),
      volumeChangeEventOptions: { enabled: true, intervalMillis: 100 },
      iosTaskHint: "dictation",
      // Never written to a file.
      recordingOptions: { persist: false },
    });
  } catch {
    ruleOutVoice();
    fail("unavailable");
    return null;
  }
  cap = setTimeout(() => m.stop(), LISTEN_MAX_MS);

  return {
    stop: () => {
      if (!done) m.stop();
    },
    cancel: () => {
      cancelled = true;
      if (!done) m.abort();
      finish();
    },
  };
}
