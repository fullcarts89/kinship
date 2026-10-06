// The Tell field in its place (board 1): above the two-item bar on Today and
// People. Above it, the Kept card says what happened to the note just told
// ("Understanding…", then "Kept for Ben" and what was kept, with Undo), and
// stays until the user is done with it (stabilization Gate D).
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Keyboard, TextInput, View } from "react-native";
import { X } from "lucide-react-native";
import { Pressable } from "@/ui/Pressable";
import { draftPreview } from "./drafts";
import { press, size, space, TOUCH } from "@/design/tokens";
import { Label, Line, NavBar, type NavKey, Pill, Small, TellDockFrame, TellField, usePalette, WAITING_DELAY_MS } from "@/ui";
import { usePeople } from "@/hooks/useV2";
import { trackStarted, useTellFlow, type KeptCardState } from "./TellFlow";

/** A quiet one-line status (offline, and older callers). */
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

/** Words first; a small spinner only once the wait is long enough to notice (motion spec rule 10). */
function Working() {
  const p = usePalette();
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), WAITING_DELAY_MS);
    return () => clearTimeout(t);
  }, []);
  return show ? <ActivityIndicator size="small" color={p.inkQuiet} /> : null;
}

/**
 * The Kept card (Gate D): "Understanding…" while it's understood, then "Kept
 * for Ben" and each line kept (tap one to correct it), Undo, and ✕ when the
 * user has seen it. Or "One thing to check" (tap to answer), "Nothing to
 * remember in that one", "Couldn't understand this one". No timer: it stays
 * until the user is done with it.
 */
export function KeptCard({
  card,
  onOpen,
  onUndo,
  onDismiss,
}: {
  card: KeptCardState;
  onOpen: () => void;
  onUndo: () => void;
  onDismiss: () => void;
}) {
  const p = usePalette();
  const working = card.mode === "understanding";
  const opens = card.mode === "card" || card.mode === "sheet";
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{ paddingHorizontal: space.xs, paddingTop: space.s, paddingBottom: space.xs, borderTopWidth: 1, borderTopColor: p.hairline }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: space.s }}>
        <View style={{ flex: 1, gap: space.xs }}>
          {card.heading ? <Label>{card.heading}</Label> : null}
          {card.status ? (
            <Pressable
              accessibilityRole={opens ? "button" : "text"}
              accessibilityLabel={card.status}
              disabled={!opens}
              onPress={onOpen}
              style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: space.s, minHeight: TOUCH, opacity: pressed ? press.surface : 1 })}
            >
              <Small tone="inkBody" style={{ flexShrink: 1 }}>{card.status}</Small>
              {working ? <Working /> : null}
            </Pressable>
          ) : null}
          {card.lines.map((l) => (
            <Pressable
              key={l.id}
              accessibilityRole="button"
              accessibilityLabel={l.statement}
              accessibilityHint="Shows what was kept, to correct it"
              onPress={onOpen}
              style={({ pressed }) => ({ minHeight: TOUCH, justifyContent: "center", opacity: pressed ? press.surface : 1 })}
            >
              <Line numberOfLines={2}>{l.statement}</Line>
            </Pressable>
          ))}
          {card.more > 0 ? <Small>{`and ${card.more} more`}</Small> : null}
          {card.newcomers?.length ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${card.newcomers.join(" and ")} isn't in your people yet. Add`}
              onPress={onOpen}
              style={({ pressed }) => ({ minHeight: TOUCH, justifyContent: "center", opacity: pressed ? press.surface : 1 })}
            >
              <Small tone="inkBody">{`${card.newcomers.join(" and ")} ${card.newcomers.length > 1 ? "aren't" : "isn't"} in your people yet · Add`}</Small>
            </Pressable>
          ) : null}
          {card.mode === "card" ? <Small>{"Tap a line to correct it."}</Small> : null}
        </View>
        {working ? null : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Got it"
            onPress={onDismiss}
            hitSlop={space.s}
            style={({ pressed }) => ({ minWidth: TOUCH, minHeight: TOUCH, alignItems: "center", justifyContent: "center", opacity: pressed ? press.link : 1 })}
          >
            <X color={p.inkQuiet} size={size.icon} strokeWidth={1.8} />
          </Pressable>
        )}
      </View>
      {card.mode === "understanding" || card.mode === "sheet" ? null : (
        <View style={{ alignItems: "flex-start" }}>
          <Pill variant="quiet" label="Undo" accessibilityHint="Forgets this note and what came from it" onPress={onUndo} />
        </View>
      )}
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
  if (flow.card) {
    line = <KeptCard card={flow.card} onOpen={flow.openCard} onUndo={flow.undoCard} onDismiss={flow.dismissCard} />;
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
