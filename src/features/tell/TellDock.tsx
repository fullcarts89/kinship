// The Tell field in its place (board 1): above the two-item bar on Today and
// People. Above it, the Kept card says what happened to the note just told
// ("Understanding…", then "Kept for Ben" and what was kept, with Undo), and
// stays until the user is done with it (stabilization Gate D).
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { FeedbackOff } from "@/store/repositories";
import { ActivityIndicator, Keyboard, PanResponder, TextInput, View } from "react-native";
import { X } from "lucide-react-native";
import { Pressable } from "@/ui/Pressable";
import { draftPreview } from "./drafts";
import { press, radius, size, space, TOUCH } from "@/design/tokens";
import { Body, KEYBOARD_BAR, Label, Line, NavBar, type NavKey, Pill, Small, TellDockFrame, TellField, usePalette, WAITING_DELAY_MS } from "@/ui";
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

/** What can be off about a reading: fixed reasons, never free text (H6). */
export const FEEDBACK_OFF: { key: FeedbackOff; label: string }[] = [
  { key: "wrong_person", label: "Wrong person" },
  { key: "missed_something", label: "Missed something" },
  { key: "wrong_relationship", label: "Wrong relationship" },
  { key: "wrong_wording", label: "Wrong wording" },
  { key: "other", label: "Other" },
];

/** The Kept card's words (founder I4; copy approved in CC-20). Names, never guessed pronouns. */
export const KEPT_COPY = {
  notInPeople: (name: string) => `${name} isn't in People yet.`,
  why: (name: string) => `Add ${name} so this also shows on ${name}'s page.`,
  add: (name: string) => `Add ${name}`,
  notNow: "Not now",
  correct: "Correct this",
  undo: "Undo",
  rateAsk: "Did Kinship get this right?",
} as const;

/**
 * The Kept card (Gate D; hierarchy founder I4), in this order:
 *
 *   KEPT FOR SUSAN OXNARD                                              ✕
 *   Susan is getting married to Pedro in the fall
 *
 *   Pedro isn't in People yet.
 *   Add Pedro so this also shows on Pedro's page.
 *   [Add Pedro]  Not now
 *
 *   Correct this · Undo
 *
 *   Did Kinship get this right?
 *   Got it right · Not quite
 *
 * Kept is done: adding someone is an optional next step, never a block.
 * While it's understood: "Understanding…"; when Kinship needs the user: "One
 * thing to check" (tap to answer); or "Nothing to remember in that one",
 * "Couldn't understand this one". No timer: it stays until the user is done
 * with it.
 */
export function KeptCard({
  card,
  onOpen,
  onUndo,
  onDismiss,
  onRate,
  onAddNewcomer,
}: {
  card: KeptCardState;
  onOpen: () => void;
  onUndo: () => void;
  onDismiss: () => void;
  /** "Got it right / Not quite" (H6): quiet, after what was kept. */
  onRate?: (verdict: "right" | "not_quite", off?: FeedbackOff) => void;
  /** "Add Pedro" (founder I4). */
  onAddNewcomer?: (name: string, itemIds: string[]) => void;
}) {
  const p = usePalette();
  const [asking, setAsking] = React.useState(false);
  // Every kept line can be looked at (founder J6): "and 1 more" opens the
  // rest in place, each as tappable as the first three.
  const [everyLine, setEveryLine] = React.useState(false);
  // Someone added or put off on this card: their row goes (founder I4).
  const [settled, setSettled] = React.useState<string[]>([]);
  React.useEffect(() => {
    setEveryLine(false);
    setSettled([]);
  }, [card.captureId]);
  const lines = everyLine ? [...card.lines, ...(card.rest ?? [])] : card.lines;
  const working = card.mode === "understanding";
  const opens = card.mode === "card" || card.mode === "sheet";
  const kept = card.mode === "card";
  const newcomers = kept && onAddNewcomer ? (card.newcomers ?? []).filter((n) => !settled.includes(n.name)) : [];
  const editing = !(card.mode === "understanding" || card.mode === "sheet");
  return (
    // Its own raised surface, apart from Today's lines (founder H19): what
    // just happened to your note never reads as part of a Coming up line.
    <View
      accessibilityLiveRegion="polite"
      style={{
        marginTop: space.m, marginBottom: space.s, paddingHorizontal: space.m, paddingTop: space.s, paddingBottom: space.xs,
        borderRadius: radius.inline, borderWidth: 1, borderColor: p.hairline, backgroundColor: p.surface,
      }}
    >
      {/* 1. What was kept. */}
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
          {lines.map((l) => (
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
          {card.more > 0 && !everyLine ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`and ${card.more} more`}
              accessibilityHint="Shows the rest of what was kept"
              onPress={() => (card.rest?.length ? setEveryLine(true) : onOpen())}
              style={({ pressed }) => ({ minHeight: TOUCH, justifyContent: "center", opacity: pressed ? press.surface : 1 })}
            >
              <Small tone="inkBody">{`and ${card.more} more`}</Small>
            </Pressable>
          ) : null}
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

      {/* 2. Something that needs the user, only if it does: someone not in People yet. */}
      {newcomers.map((n) => (
        <View key={n.name} style={{ marginTop: space.m, gap: space.xs }}>
          <Body tone="ink">{KEPT_COPY.notInPeople(n.name)}</Body>
          <Small tone="inkBody">{KEPT_COPY.why(n.name)}</Small>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.m, marginTop: space.xs }}>
            <Pill
              size="small"
              label={KEPT_COPY.add(n.name)}
              accessibilityHint={`Adds ${n.name} to People. This memory also shows on ${n.name}'s page`}
              onPress={() => {
                setSettled((s) => [...s, n.name]);
                onAddNewcomer?.(n.name, n.itemIds);
              }}
            />
            <Pill
              variant="quiet"
              label={KEPT_COPY.notNow}
              accessibilityLabel={`Not now: ${KEPT_COPY.add(n.name)}`}
              accessibilityHint="Keeps the memory as it is"
              onPress={() => setSettled((s) => [...s, n.name])}
            />
          </View>
        </View>
      ))}

      {/* 3. Correcting it: Correct this · Undo. */}
      {editing ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.s, marginTop: newcomers.length ? space.m : 0 }}>
          {kept ? (
            <>
              <Pill variant="quiet" label={KEPT_COPY.correct} accessibilityHint="Shows what was kept, to change it" onPress={onOpen} />
              <Small accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{"·"}</Small>
            </>
          ) : null}
          <Pill variant="quiet" label={KEPT_COPY.undo} accessibilityHint="Forgets this note and what came from it" onPress={onUndo} />
        </View>
      ) : null}

      {/* 4. Dogfood feedback, apart from the memory (H6). */}
      {kept && onRate ? (
        <View style={{ marginTop: space.s, paddingBottom: space.xs, gap: space.xs }}>
          {card.feedback ? (
            <Small style={{ paddingHorizontal: space.xs }}>{"Thanks. Noted."}</Small>
          ) : asking ? (
            <>
              <Small tone="inkBody" style={{ paddingHorizontal: space.xs }}>{"What was off?"}</Small>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.xs }}>
                {FEEDBACK_OFF.map((o) => (
                  <Pill key={o.key} variant="quiet" size="small" label={o.label} onPress={() => { onRate("not_quite", o.key); setAsking(false); }} />
                ))}
              </View>
            </>
          ) : (
            <>
              <Small style={{ paddingHorizontal: space.xs }}>{KEPT_COPY.rateAsk}</Small>
              <View style={{ flexDirection: "row", gap: space.xs }}>
                <Pill variant="quiet" size="small" label="Got it right" onPress={() => onRate("right")} />
                <Pill variant="quiet" size="small" label="Not quite" onPress={() => setAsking(true)} />
              </View>
            </>
          )}
        </View>
      ) : null}
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
  /**
   * The keyboard is up: the field sits on it. Today · People stay reachable
   * (founder I6): on the keyboard's own bar where the platform draws one,
   * otherwise here.
   */
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
  // While typing, a downward swipe on what sits above the field (the Kept
  // card) puts the keyboard away (founder I6). The field keeps its own drags.
  const swipeAway = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_e, g) => !!props.typing && g.dy > 12 && Math.abs(g.dy) > 2 * Math.abs(g.dx),
    onPanResponderGrant: () => Keyboard.dismiss(),
  }), [props.typing]);
  return (
    <View style={{ backgroundColor: p.paper }}>
      {props.tellOn ? (
        <TellDockFrame>
          <View {...swipeAway.panHandlers}>{props.line}</View>
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
            nav={{ current: props.current, onGo: props.onGo }}
          />
        </TellDockFrame>
      ) : null}
      {props.typing && KEYBOARD_BAR ? null : <NavBar current={props.current} onGo={props.onGo} />}
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
    line = <KeptCard card={flow.card} onOpen={flow.openCard} onUndo={flow.undoCard} onDismiss={flow.dismissCard} onRate={flow.rateCard} onAddNewcomer={flow.addNewcomer} />;
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
