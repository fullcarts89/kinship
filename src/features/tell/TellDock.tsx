// The Tell field in its place (board 1): above the two-item bar on Today and
// People. A quiet line above it says what happened to the note just told
// ("Kept: …" with Undo), or that it waits to be online.
import React, { useEffect, useRef, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { space, TOUCH } from "@/design/tokens";
import { NavBar, type NavKey, Pill, Small, TellDockFrame, TellField, usePalette } from "@/ui";
import { usePeople } from "@/hooks/useV2";
import { trackAbandoned, trackStarted, useTellFlow } from "./TellFlow";

export function KeptLine({
  text,
  onOpen,
  onUndo,
}: {
  text: string;
  onOpen?: () => void;
  onUndo?: () => void;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space.s, minHeight: TOUCH, paddingHorizontal: space.xs }}>
      <Pressable
        accessibilityRole={onOpen ? "button" : "text"}
        accessibilityLabel={text}
        accessibilityHint={onOpen ? "Shows what was kept" : undefined}
        accessibilityLiveRegion="polite"
        disabled={!onOpen}
        onPress={onOpen}
        style={{ flex: 1 }}
      >
        <Small tone="inkBody" numberOfLines={2}>{text}</Small>
      </Pressable>
      {onUndo ? <Pill variant="quiet" label="Undo" accessibilityHint="Forgets this note and what came from it" onPress={onUndo} /> : null}
    </View>
  );
}

export interface TellDockViewProps {
  tellOn: boolean;
  draft: string;
  onDraft: (text: string) => void;
  onSend: () => void;
  onBlur?: () => void;
  placeholder?: string;
  /** The quiet line above the field (Kept, understanding, offline). */
  line: React.ReactNode;
  current: NavKey;
  onGo: (to: NavKey) => void;
  inputRef?: React.Ref<TextInput>;
}

/** The dock's look, from plain data (the lab renders it without a session). */
export function TellDockView(props: TellDockViewProps) {
  const p = usePalette();
  return (
    <View style={{ backgroundColor: p.paper }}>
      {props.tellOn ? (
        <TellDockFrame>
          {props.line}
          <TellField
            ref={props.inputRef}
            value={props.draft}
            onChange={props.onDraft}
            onSend={props.onSend}
            onBlur={props.onBlur}
            placeholder={props.placeholder}
          />
        </TellDockFrame>
      ) : null}
      <NavBar current={props.current} onGo={props.onGo} />
    </View>
  );
}

export function TellDock({ current, onGo }: { current: NavKey; onGo: (to: NavKey) => void }) {
  const flow = useTellFlow();
  const people = usePeople();
  const [draft, setDraft] = useState("");
  const [about, setAbout] = useState<string | null>(null);
  const started = useRef(false);
  const input = useRef<TextInput>(null);

  // "Anything worth remembering?" focuses the field, about that person.
  useEffect(() => {
    if (!flow.focusRequest) return;
    setAbout(flow.focusRequest.personId);
    input.current?.focus();
  }, [flow.focusRequest]);

  const aboutName = about ? people.find((p) => p.id === about)?.display_name ?? null : null;

  const send = async () => {
    const text = draft;
    if (!text.trim()) return;
    setDraft("");
    started.current = false;
    const ok = await flow.keep(text, about);
    if (!ok) setDraft(text);
    else setAbout(null);
  };

  let line: React.ReactNode = null;
  if (flow.kept) {
    line = <KeptLine text={flow.kept.text} onOpen={flow.kept.opens ? flow.openKept : undefined} onUndo={flow.undoKept} />;
  } else if (flow.status) {
    line = <KeptLine text={flow.status} />;
  } else if (flow.waitingOffline) {
    line = <KeptLine text={OFFLINE_LINE} />;
  }

  return (
    <TellDockView
      tellOn={flow.tellOn}
      draft={draft}
      onDraft={(t) => {
        if (!started.current && t.trim()) {
          started.current = true;
          trackStarted();
        }
        setDraft(t);
      }}
      onSend={() => void send()}
      onBlur={() => {
        if (!draft.trim()) setAbout(null);
      }}
      placeholder={aboutName ? `Tell Kinship about ${aboutName}…` : undefined}
      line={line}
      current={current}
      onGo={(to) => {
        trackAbandoned(draft);
        onGo(to);
      }}
      inputRef={input}
    />
  );
}

export const OFFLINE_LINE = "I'll understand your notes when you're online.";
