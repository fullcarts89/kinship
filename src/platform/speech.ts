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

// ─── the words of one session ────────────────────────────────────────────

/** One result from the recognizer, as its "result" event carries it. */
export interface Heard {
  transcript: string;
  /** The recognizer's own timing of the words (ms into the session's audio), when it gives it. */
  segments?: readonly { startTimeMillis: number; endTimeMillis: number }[];
}

/** Words compared without case, punctuation or spacing. */
function folded(text: string): string {
  return text.toLocaleLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/gu, " ").trim();
}

/** When an utterance was spoken, in ms into the session's audio, when the recognizer said (`segments`). */
interface Span {
  start: number;
  end: number;
}

/** A result's timing as one span, when the recognizer gave any; null when it gave none (partials, Android). */
function timingOf(r: Heard): Span | null {
  const segs = (r.segments ?? []).filter((s) => Number.isFinite(s.startTimeMillis) && Number.isFinite(s.endTimeMillis) && s.endTimeMillis > s.startTimeMillis);
  if (!segs.length || !segs.some((s) => s.endTimeMillis > 0)) return null;
  return { start: Math.min(...segs.map((s) => s.startTimeMillis)), end: Math.max(...segs.map((s) => s.endTimeMillis)) };
}

/** The two results were spoken over the same stretch of audio: a re-send or a re-reading, never a new utterance. */
function overlap(a: Span, b: Span): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * The share of words two readings have in common (0..1), as a multiset, without order ("the dog bit Ben"
 * and "Ben bit the dog" share every word). Enough for its one use: judging whether a result that is
 * already known to be the *same utterance again* (nothing heard since the last final) is a re-reading of
 * it; it never decides on its own whether two results are the same utterance.
 */
function sharedWords(a: string, b: string): number {
  const wa = a.split(" ").filter(Boolean);
  const wb = b.split(" ").filter(Boolean);
  if (!wa.length || !wb.length) return 0;
  const pool = new Map<string, number>();
  for (const w of wb) pool.set(w, (pool.get(w) ?? 0) + 1);
  let shared = 0;
  for (const w of wa) {
    const n = pool.get(w) ?? 0;
    if (n > 0) {
      shared++;
      pool.set(w, n - 1);
    }
  }
  return shared / Math.max(wa.length, wb.length);
}

/**
 * Whether `said` reads as the recognizer's re-reading of `last` (a word or two revised), rather than other
 * words: the same length give or take a word, and most words shared (three in four for a short sentence,
 * where one changed word is a different thought: "Ben ran" / "Ben swam").
 */
function reReading(said: string, last: string): boolean {
  const na = said.split(" ").filter(Boolean).length;
  const nb = last.split(" ").filter(Boolean).length;
  if (Math.abs(na - nb) > 1) return false;
  return sharedWords(said, last) >= (Math.max(na, nb) < 6 ? 0.75 : 0.5);
}

/** The words of `said` after the ones that fold to `prefix` (whole words), or null when they don't line up. */
function afterPrefix(said: string, prefix: string): string | null {
  const words = said.split(/\s+/u);
  for (let k = 1; k < words.length; k++) {
    const head = folded(words.slice(0, k).join(" "));
    if (head === prefix) return words.slice(k).join(" ");
    if (head.length > prefix.length) break;
  }
  return null;
}

/**
 * The words of one listening session, assembled from the recognizer's results by what each result
 * *is*, never by what it says. Read against the module's own sources (expo-speech-recognition 3.1.3,
 * `ios/ExpoSpeechRecognitionModule.swift`, `ios/ExpoSpeechRecognizer.swift` and
 * `android/…/ExpoSpeechService.kt`):
 *
 *   a partial       the utterance being heard so far. It replaces the last partial, never adds to it.
 *   a final         one utterance, whole. iOS 18 marks a pause as "final" (the module's reading of
 *                   `speechRecognitionMetadata.speechDuration`), and from then on every transcript it
 *                   sends is the new utterance alone, with a leading space (`hasSeenFinalResult`);
 *                   Android 13+ sends one final per segment (`onSegmentResults`); iOS 17 sends one
 *                   final, at Stop, holding the whole session. Each final is settled after the ones
 *                   before it.
 *   the same again  at Stop, iOS 18 sends the last utterance as final once more (founder device,
 *                   10 Nov 2026, K34: a note about Kaiya was kept twice over, and the server could then
 *                   place none of its quotes). That result is told apart from the user *saying* the
 *                   same words again by structure, not wording: nothing new was heard since that final
 *                   (a new utterance always arrives as partials first, interim results being on), and
 *                   the recognizer's own timing of the words (`segments`), when both finals have it,
 *                   covers the same stretch of audio (an utterance said after a pause starts after it).
 *                   So "I love her" [pause] "I love her so much" keeps both, "no" [pause] "no" is two,
 *                   and "no, no, no" is kept as said; only the recognizer repeating itself is dropped.
 *   a re-reading    the same utterance again with a word or two changed is the recognizer's final
 *                   reading of it: it takes the last final's place. Other words are something new,
 *                   kept after it.
 *   the whole again a final holding everything settled, with nothing new heard since, is the session
 *                   sent whole: it replaces what it repeats, once.
 *
 * Nothing here is a lexical guard over the finished text: a passage the user said twice is kept twice.
 */
export class Transcript {
  private readonly finals: { text: string; timing: Span | null }[] = [];
  private hearing = "";
  /** A partial arrived since the last final: the recognizer is hearing a new utterance. */
  private fresh = true;

  /** Everything settled plus what is still being heard. */
  get text(): string {
    return [...this.finals.map((f) => f.text), this.hearing].filter(Boolean).join(" ");
  }

  /** A result still being heard. */
  partial(r: Heard): void {
    const said = r.transcript.trim();
    if (!said) return;
    const last = this.finals[this.finals.length - 1];
    const fs = folded(said);
    if (last) {
      const all = folded(this.finals.map((f) => f.text).join(" "));
      // The session so far, said whole (a recognizer that accumulates): only the new words are being heard.
      // With one final settled, the same words again are a new utterance ("no" [pause] "no"), not the session.
      if (fs === all && this.finals.length > 1) {
        this.hearing = "";
        return;
      }
      if (fs.startsWith(`${all} `)) {
        const rest = afterPrefix(said, all);
        if (rest !== null) {
          this.hearing = rest;
          this.fresh = true;
          return;
        }
      }
    }
    // Any partial after a final is a new utterance being heard, whatever its words: "no" [pause] "no" is two.
    this.hearing = said;
    this.fresh = true;
  }

  /**
   * A final result: one utterance, settled.
   *
   * Whether it is the *same* utterance as the last final, again, is decided by structure, and a partial
   * since the last final is the one certain sign of a new utterance (interim results are on, so a new
   * utterance always arrives as partials first): with one, nothing is ever dropped or replaced. Without
   * one, the result is the same utterance again unless both finals carry timing and their spans are
   * disjoint (an utterance said after a pause starts after the last one ended; a re-send covers the same
   * stretch of audio). The same utterance with the same words is dropped. With other words it is the
   * recognizer's re-reading when the length and most of the words match (`reReading`), and replaces the
   * last final; otherwise it is something new, kept after it.
   *
   * Limits (recorded in approved-design-coverage.md): on a recognizer that gives no timing (Android), a
   * second final with no partial between is treated as the same utterance again, so the same words are
   * kept once and mostly-shared words are taken as a re-reading; and should such a recognizer re-emit a
   * pause-final's words as a partial before its Stop re-send, that re-send would be kept twice.
   */
  final(r: Heard): void {
    const said = r.transcript.trim();
    // A final with no words (iOS 18 sends one at Stop after the real last one): what was heard stands.
    if (!said) return;
    const timing = timingOf(r);
    const last = this.finals[this.finals.length - 1];
    const fs = folded(said);
    const settle = () => {
      this.hearing = "";
      this.fresh = false;
    };
    if (last) {
      const all = folded(this.finals.map((f) => f.text).join(" "));
      if (!this.fresh) {
        // Nothing new was heard since the last final, and this holds the whole session: sent again (dropped),
        // or sent whole with more at the end (it takes the place of what it repeats).
        if (fs === all && this.finals.length > 1) return settle();
        if (fs.startsWith(`${all} `)) {
          this.finals.splice(0, this.finals.length, { text: said, timing });
          return settle();
        }
      }
      // Nothing heard since the last final, and the recognizer's own timing (when both have it) does not
      // say otherwise: the same utterance again.
      const same = !this.fresh && (!(timing && last.timing) || overlap(timing, last.timing));
      if (same) {
        const fl = folded(last.text);
        if (fs === fl) return settle();
        if (reReading(fs, fl)) {
          last.text = said;
          last.timing = timing ?? last.timing;
          return settle();
        }
      }
    }
    this.finals.push({ text: said, timing });
    settle();
  }
}

// ─── listening ───────────────────────────────────────────────────────────

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
 *
 * Only the microphone is asked for: with `requiresOnDeviceRecognition` the iOS module skips Apple's
 * speech-recognition authorization (its prompt is about audio sent to Apple, which never happens here).
 * Every event after the session is over (a late result, the module's own "end" after an error) is dropped.
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

  const words = new Transcript();
  let done = false;
  let cancelled = false;
  let cap: ReturnType<typeof setTimeout> | undefined;
  const subs: { remove: () => void }[] = [];
  const close = () => {
    done = true;
    clearTimeout(cap);
    for (const s of subs) s.remove();
  };
  const finish = () => {
    if (done) return;
    close();
    if (!cancelled) on.onEnd(words.text);
  };
  const fail = (reason: ListenFailure) => {
    if (done) return;
    close();
    if (!cancelled) on.onFail(reason);
  };

  subs.push(
    m.addListener("result", (e) => {
      if (done) return;
      // The first alternative is the recognizer's best; the others are never shown.
      const heard = e.results[0];
      if (heard) {
        if (e.isFinal) words.final(heard);
        else words.partial(heard);
      }
      if (!cancelled) on.onText(words.text);
    }),
    m.addListener("volumechange", (e) => {
      if (!done) on.onLevel?.(levelOf(e.value));
    }),
    m.addListener("error", (e) => {
      if (NOT_HERE.has(e.error)) ruleOutVoice();
      // Nothing heard yet: say why. Otherwise (silence, a call, "aborted") it ends with what was heard.
      if (!words.text && NOT_HERE.has(e.error)) fail("unavailable");
      else if (!words.text && e.error === "not-allowed") fail("denied");
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
