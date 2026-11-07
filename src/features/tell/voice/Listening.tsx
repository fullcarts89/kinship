// The Listening screen (board 1, 4th phone: "Listening · for David"; E18,
// VOX-03; founder re-confirmed the board 7 Nov 2026). Full screen in the night
// palette whatever the appearance: the caps label, the words arriving in
// Newsreader Light with each of the user's people underlined in the mark
// colour as they're heard, the voice's line, the lock line, and one round
// Stop.
//
// It starts listening as it opens (under 300 ms: no screen to wait through
// first). Stop, or going back, ends it: the words go into the Tell, where the
// user reads them, fixes what was misheard and keeps them as any note. Nothing
// is kept without that Keep, and the audio is never saved (D5).
import React, { useEffect, useRef, useState } from "react";
import { Linking, Modal, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import Svg, { Polyline } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Lock } from "lucide-react-native";
import { color, height, maxScale, press, radius, size, space, type } from "@/design/tokens";
import { Pressable } from "@/ui/Pressable";
import { listeningTap } from "@/platform/haptics";
import { listen, type ListenFailure, type ListenSession, type VoiceSupport } from "@/platform/speech";
import { nameSpans, runsOf } from "./names";

export const LISTENING_COPY = {
  label: "Listening",
  labelFor: (first: string) => `Listening · for ${first}`,
  hint: "Say it the way you'd tell a friend.",
  lock: "Transcribed on this phone. The audio is never saved.",
  stop: "Stop",
  stopHint: "Puts what you said in your note, to read over before you keep it",
  denied: "Kinship can't hear you yet.",
  deniedBody: "Allow the microphone for Kinship in Settings, or type instead.",
  settings: "Open Settings",
  unavailable: "Speaking isn't available on this phone right now.",
  unavailableBody: "You can type instead. Your words stay on this phone until you keep them.",
  close: "Type instead",
} as const;

/** How many of the latest levels the voice's line draws. */
const LINE_POINTS = 48;
/** After Stop, the longest wait for the recognizer's last words. */
const LAST_WORDS_MS = 1500;

export interface ListeningProps {
  support: VoiceSupport;
  /** The user's people, as hints and to underline. */
  names: readonly string[];
  /** First name, when telling about someone. */
  about: string | null;
  /** Listening is over: what was heard (maybe nothing) and how long it took. */
  onDone: (heard: string, seconds: number) => void;
  /** Over everything, as its own full-screen modal (the dock); otherwise it fills its parent (the notebook page). */
  modal?: boolean;
}

/** Shown only while listening: mounting it starts listening, Stop (or back) ends it. */
export function Listening({ support, names, about, onDone, modal }: ListeningProps) {
  const p = color.night;
  const insets = useSafeAreaInsets();
  const [words, setWords] = useState("");
  const [levels, setLevels] = useState<number[]>([]);
  const [failed, setFailed] = useState<ListenFailure | null>(null);
  const [hearing, setHearing] = useState(true);
  const session = useRef<ListenSession | null>(null);
  const finished = useRef(false);
  const latest = useRef("");
  const started = useRef(Date.now());
  const done = useRef(onDone);
  done.current = onDone;

  const finish = (heard: string) => {
    if (finished.current) return;
    finished.current = true;
    session.current = null;
    void listeningTap();
    done.current(heard, (Date.now() - started.current) / 1000);
  };

  useEffect(() => {
    let live = true;
    started.current = Date.now();
    void listeningTap();
    void listen(support, names, {
      onText: (t) => {
        latest.current = t;
        if (live) setWords(t);
      },
      onLevel: (l) => {
        if (live) setLevels((was) => [...was.slice(-(LINE_POINTS - 1)), l]);
      },
      onEnd: (t) => {
        if (live) finish(t);
      },
      onFail: (reason) => {
        if (live) setFailed(reason);
      },
    }).then((s) => {
      if (!live) s?.cancel();
      else session.current = s;
    });
    return () => {
      live = false;
      // Closed from outside: the recognizer stops; nothing more is reported.
      session.current?.cancel();
    };
    // Once per opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stop = () => {
    if (failed) {
      finish("");
      return;
    }
    setHearing(false);
    if (session.current) {
      session.current.stop();
      // The last words come with the recognizer's end; if it's slow, what's on screen is what was said.
      setTimeout(() => finish(latest.current), LAST_WORDS_MS);
    } else {
      finish(latest.current);
    }
  };

  const label = about ? LISTENING_COPY.labelFor(about) : LISTENING_COPY.label;
  const screen = (
    <View style={modal ? { flex: 1, backgroundColor: p.paper } : { ...absoluteFill, backgroundColor: p.paper }} accessibilityViewIsModal onAccessibilityEscape={stop}>
      <StatusBar style="light" />
      <View style={{ flex: 1, paddingTop: insets.top + space.xl, paddingHorizontal: space.xl }}>
        <Text accessibilityRole="header" maxFontSizeMultiplier={maxScale.label} style={[type.label, { color: p.inkQuiet }]}>{label}</Text>
        {failed ? (
          <View style={{ marginTop: space.xl, gap: space.s }} accessibilityLiveRegion="polite">
            <Text maxFontSizeMultiplier={maxScale.text} style={[type.transcript, { color: p.ink }]}>
              {failed === "denied" ? LISTENING_COPY.denied : LISTENING_COPY.unavailable}
            </Text>
            <Text maxFontSizeMultiplier={maxScale.text} style={[type.body, { color: p.inkBody }]}>
              {failed === "denied" ? LISTENING_COPY.deniedBody : LISTENING_COPY.unavailableBody}
            </Text>
            {failed === "denied" ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={LISTENING_COPY.settings}
                onPress={() => void Linking.openSettings().catch(() => undefined)}
                style={({ pressed }) => ({ alignSelf: "flex-start", paddingVertical: space.s, opacity: pressed ? press.link : 1 })}
              >
                <Text maxFontSizeMultiplier={maxScale.text} style={[type.button, { color: p.ink, textDecorationLine: "underline" }]}>{LISTENING_COPY.settings}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <Heard words={words} names={names} hearing={hearing} />
        )}
      </View>
      {failed ? null : <VoiceLine levels={levels} />}
      <View style={{ paddingHorizontal: space.xl, paddingTop: space.xl, paddingBottom: Math.max(insets.bottom, space.l) + space.s, alignItems: "center", gap: space.l }}>
        {failed ? null : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.s, alignSelf: "flex-start" }} accessible accessibilityLabel={LISTENING_COPY.lock}>
            <Lock color={p.inkQuiet} size={size.icon - 4} strokeWidth={1.8} />
            <Text maxFontSizeMultiplier={maxScale.text} style={[type.provenance, { color: p.inkQuiet, flexShrink: 1 }]}>{LISTENING_COPY.lock}</Text>
          </View>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={failed ? LISTENING_COPY.close : LISTENING_COPY.stop}
          accessibilityHint={failed ? undefined : LISTENING_COPY.stopHint}
          onPress={stop}
          style={({ pressed }) => ({
            ...(failed
              ? { minHeight: height.button, borderRadius: radius.pill(height.button), paddingHorizontal: space.xxl, alignSelf: "stretch" as const }
              : { width: STOP, height: STOP, borderRadius: STOP / 2 }),
            backgroundColor: p.ink, alignItems: "center", justifyContent: "center",
            opacity: pressed ? press.surface : 1,
          })}
        >
          {failed ? (
            <Text maxFontSizeMultiplier={maxScale.label} style={[type.button, { color: p.onInk }]}>{LISTENING_COPY.close}</Text>
          ) : (
            <View style={{ width: space.l + 2, height: space.l + 2, borderRadius: 3, backgroundColor: p.onInk }} />
          )}
        </Pressable>
      </View>
    </View>
  );
  return modal ? (
    <Modal visible animationType="fade" presentationStyle="fullScreen" onRequestClose={stop} statusBarTranslucent>
      {screen}
    </Modal>
  ) : screen;
}

const absoluteFill = { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 } as const;
const STOP = space.x5;

/** The words so far, people's names underlined; a quiet "…" while still listening. */
function Heard({ words, names, hearing }: { words: string; names: readonly string[]; hearing: boolean }) {
  const p = color.night;
  if (!words) {
    return (
      <Text maxFontSizeMultiplier={maxScale.text} style={[type.transcript, { color: p.inkQuiet, marginTop: space.xl }]}>
        {LISTENING_COPY.hint}
      </Text>
    );
  }
  const runs = runsOf(words, nameSpans(words, names));
  return (
    <Text accessibilityLiveRegion="polite" maxFontSizeMultiplier={maxScale.text} style={[type.transcript, { color: p.ink, marginTop: space.xl }]}>
      {runs.map((r, i) => (
        <Text key={i} style={r.name ? { textDecorationLine: "underline", textDecorationColor: p.mark } : undefined}>{r.text}</Text>
      ))}
      {hearing ? <Text style={{ color: p.inkQuiet }}>{"…"}</Text> : null}
    </Text>
  );
}

/** The voice, as a line: its loudness over the last few seconds (decorative). */
function VoiceLine({ levels }: { levels: readonly number[] }) {
  const p = color.night;
  const [width, setWidth] = useState(0);
  const h = space.x4;
  const step = width / (LINE_POINTS - 1);
  const pad = Array.from({ length: Math.max(0, LINE_POINTS - levels.length) }, () => 0);
  const all = [...pad, ...levels];
  // Alternate above and below the middle, so a steady voice reads as a wave.
  const points = all.map((l, i) => `${(i * step).toFixed(1)},${(h / 2 + (i % 2 ? 1 : -1) * Math.max(1, l * (h / 2 - 2))).toFixed(1)}`).join(" ");
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ height: h, marginHorizontal: space.xl }}
    >
      {width > 0 ? (
        <Svg width={width} height={h}>
          <Polyline points={points} fill="none" stroke={p.mark} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
        </Svg>
      ) : null}
    </View>
  );
}
