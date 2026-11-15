// A stand-in for expo-speech-recognition's native module (tests only): what
// the phone says it supports, the permission it gives, and the events a
// listening session sends, driven by the test.
type Listener = (e: unknown) => void;

export interface FakeSpeechOptions {
  onDevice?: boolean;
  locales?: string[];
  installedLocales?: string[];
  granted?: boolean;
}

export function fakeSpeech(opts: FakeSpeechOptions = {}) {
  const listeners = new Map<string, Set<Listener>>();
  const emit = (event: string, payload: unknown = null) => {
    for (const l of [...(listeners.get(event) ?? [])]) l(payload);
  };
  const m = {
    options: { ...opts },
    started: [] as Record<string, unknown>[],
    stopped: 0,
    aborted: 0,
    emit,
    /** Words heard: interim unless final; `segments` is the recognizer's timing of them, when it gives any. */
    hear(transcript: string, isFinal = false, segments: { startTimeMillis: number; endTimeMillis: number }[] = []) {
      emit("result", {
        isFinal,
        results: [{ transcript, confidence: isFinal ? 0.9 : 0, segments: segments.map((s) => ({ ...s, segment: "", confidence: -1 })) }],
      });
    },
    listening: () => (listeners.get("result")?.size ?? 0) > 0,
    supportsOnDeviceRecognition: () => m.options.onDevice ?? true,
    isRecognitionAvailable: () => true,
    getSupportedLocales: async () => ({
      locales: m.options.locales ?? ["en-GB", "en-US", "fr-FR"],
      installedLocales: m.options.installedLocales ?? m.options.locales ?? ["en-US"],
    }),
    requestMicrophonePermissionsAsync: async () => ({ granted: m.options.granted ?? true, status: (m.options.granted ?? true) ? "granted" : "denied" }),
    addListener(event: string, l: Listener) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(l);
      return { remove: () => listeners.get(event)?.delete(l) };
    },
    start(o: Record<string, unknown>) {
      m.started.push(o);
      emit("start");
    },
    /**
     * As the phone does it: Stop returns at once; the recognizer's last result (iOS: the real `isFinal`,
     * often the last utterance again) may still arrive, and "end" follows on a later turn. A test that
     * wants the last result sends it with `hear(…, true)` right after `stop()`; `await settled()` then
     * lets "end" land.
     */
    stop() {
      m.stopped += 1;
      // A native promise, not queueMicrotask: Jest's fake timers take the latter over.
      void Promise.resolve().then(() => emit("end"));
    },
    /** Lets the turn a stop queued run (the "end" after Stop). */
    settled: async () => {
      await Promise.resolve();
      await Promise.resolve();
    },
    abort() {
      m.aborted += 1;
      emit("error", { error: "aborted", message: "" });
      emit("end");
    },
  };
  return m;
}

export type FakeSpeech = ReturnType<typeof fakeSpeech>;
