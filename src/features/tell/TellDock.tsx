// The Tell field in its place (board 1): above the two-item bar on Today and
// People. A quiet line above it says what happened to the note just told
// ("Kept: …" with Undo), or that it waits to be online.
import React, { useEffect, useRef, useState } from "react";
import { Keyboard, TextInput, View } from "react-native";
import { Pressable } from "@/ui/Pressable";
import { draftPreview } from "./drafts";
import { press, space, TOUCH } from "@/design/tokens";
import { NavBar, type NavKey, Pill, Small, TellDockFrame, TellField, usePalette } from "@/ui";
import { usePeople } from "@/hooks/useV2";
import { trackStarted, useTellFlow } from "./TellFlow";

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
        style={({ pressed }) => ({ flex: 1, opacity: pressed ? press.surface : 1 })}
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
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  /** The quiet line above the field (Kept, understanding, offline). */
  line: React.ReactNode;
  current: NavKey;
  onGo: (to: NavKey) => void;
  inputRef?: React.Ref<TextInput>;
  /** The keyboard is up: the field sits on it and the bar stays underneath. */
  typing?: boolean;
  /** An unsent draft, folded to one line until it's opened again. */
  collapsed?: { preview: string; onExpand: () => void } | null;
  /** Who this Tell is about, when it isn't the general one ("About Ben"). */
  about?: string | null;
  autoFocus?: boolean;
}

/** The dock's look, from plain data (the lab renders it without a session). */
export function TellDockView(props: TellDockViewProps) {
  const p = usePalette();
  return (
    <View style={{ backgroundColor: p.paper }}>
      {props.tellOn ? (
        <TellDockFrame>
          {props.line}
          {props.about && !props.collapsed ? <Small style={{ paddingHorizontal: space.xs, paddingBottom: space.xs }}>{`About ${props.about}`}</Small> : null}
          <TellField
            ref={props.inputRef}
            value={props.draft}
            onChange={props.onDraft}
            onSend={props.onSend}
            onFocus={props.onFocus}
            onBlur={props.onBlur}
            placeholder={props.placeholder}
            collapsed={props.collapsed}
            autoFocus={props.autoFocus}
          />
        </TellDockFrame>
      ) : null}
      {props.typing ? null : <NavBar current={props.current} onGo={props.onGo} />}
    </View>
  );
}

export function TellDock({ current, onGo, typing }: { current: NavKey; onGo: (to: NavKey) => void; typing?: boolean }) {
  const flow = useTellFlow();
  const people = usePeople();
  // Who the Tell is about: no one (the general Tell), or the person
  // "Anything worth remembering?" asked about. Each has its own draft.
  const [about, setAbout] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [focusNow, setFocusNow] = useState(false);
  const started = useRef(false);
  const sending = useRef(false);
  const input = useRef<TextInput>(null);
  const draft = flow.draft(about);

  // "Anything worth remembering?" focuses the field, about that person.
  useEffect(() => {
    if (!flow.focusRequest) return;
    setAbout(flow.focusRequest.personId);
    setOpen(true);
    setFocusNow(true);
    input.current?.focus();
  }, [flow.focusRequest]);

  const aboutName = about ? people.find((p) => p.id === about)?.display_name ?? null : null;

  const send = async () => {
    const text = draft;
    if (!text.trim() || sending.current) return;
    sending.current = true;
    const forWhom = about;
    flow.setDraft(forWhom, "");
    started.current = false;
    try {
      const ok = await flow.keep(text, forWhom);
      if (!ok) flow.setDraft(forWhom, text);
      else setAbout(null);
    } finally {
      sending.current = false;
    }
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
        flow.setDraft(about, t);
      }}
      onSend={() => void send()}
      onFocus={() => setOpen(true)}
      onBlur={() => {
        setOpen(false);
        setFocusNow(false);
        // An empty Tell about someone goes back to being the general one.
        if (!draft.trim()) setAbout(null);
      }}
      placeholder={aboutName ? `Tell Kinship about ${aboutName}…` : undefined}
      line={line}
      current={current}
      onGo={(to) => {
        // Leaving folds the Tell away; its words wait as a draft.
        Keyboard.dismiss();
        onGo(to);
      }}
      inputRef={input}
      typing={typing}
      about={aboutName}
      autoFocus={focusNow}
      collapsed={!open && draft.trim() ? {
        preview: draftPreview(draft, aboutName),
        onExpand: () => {
          setOpen(true);
          setFocusNow(true);
        },
      } : null}
    />
  );
}

export const OFFLINE_LINE = "I'll understand your notes when you're online.";
