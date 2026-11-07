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
    /** Words heard: interim unless final. */
    hear(transcript: string, isFinal = false) {
      emit("result", { isFinal, results: [{ transcript, confidence: 0.9, segments: [] }] });
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
    stop() {
      m.stopped += 1;
      emit("end");
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
