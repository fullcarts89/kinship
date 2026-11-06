// The notebook dock and Kept card (PR #77 `.dock`, `.tellpill`, `.toast`): on Today and People, a
// white pill with a pen ("Tell Kinship something…") above the two-word bar; one tap opens the Tell
// page. Above it, what happened to the note just told, on a raised white card: a quiet
// "Understanding…", then "Kept for Priya, Sam and Josh." with Undo, or "One thing to check".
//
// The Kept card's behaviour is the built one, unchanged (stabilization Gate D; founder I4, J6, H6):
// no timer, it stays until the user is done with it; every kept line opens the review to correct it;
// "and 1 more" opens the rest in place; someone not in People can be added; Tell the rest, Try
// again, Correct this, Undo; then "Did Kinship get this right?".
import React, { useState } from "react";
import { View } from "react-native";
import { PenLine, X } from "lucide-react-native";
import type { FeedbackOff } from "@/store/repositories";
import { notebookShadow, press, space, TOUCH } from "@/design/tokens";
import { NavBar, type NavKey, usePalette } from "@/ui";
import { Pressable } from "@/ui/Pressable";
import { NButton, NText, Raised, useNotebookPalette } from "@/ui/notebook";
import { draftPreview } from "../drafts";
import { Replaces } from "../ReviewSheet";
import { FEEDBACK_OFF, KEPT_COPY, OFFLINE_LINE } from "../TellDock";
import { useTellFlow, type KeptCardState } from "../TellFlow";
import { BreathingDot } from "./motion";
import { NOTEBOOK_TELL_COPY } from "./NotebookTell";

export interface NotebookKeptCardProps {
  card: KeptCardState;
  onOpen: () => void;
  onUndo: () => void;
  onDismiss: () => void;
  onRate?: (verdict: "right" | "not_quite", off?: FeedbackOff) => void;
  onAddNewcomer?: (name: string, itemIds: string[]) => void;
  onTellRest?: () => void;
  onRetry?: () => void;
}

function Link({ label, hint, onPress, tone = "ink2" }: { label: string; hint?: string; onPress: () => void; tone?: "ink" | "ink2" | "quiet" }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={onPress}
      style={({ pressed }) => ({ minHeight: TOUCH, justifyContent: "center", opacity: pressed ? press.link : 1 })}
    >
      <NText v="strong15" tone={tone}>{label}</NText>
    </Pressable>
  );
}

export function NotebookKeptCard({ card, onOpen, onUndo, onDismiss, onRate, onAddNewcomer, onTellRest, onRetry }: NotebookKeptCardProps) {
  const n = useNotebookPalette();
  const [asking, setAsking] = useState(false);
  const [everyLine, setEveryLine] = useState(false);
  const [settled, setSettled] = useState<string[]>([]);
  React.useEffect(() => {
    setEveryLine(false);
    setSettled([]);
  }, [card.captureId]);
  const lines = everyLine ? [...card.lines, ...(card.rest ?? [])] : card.lines;
  const working = card.mode === "understanding";
  const opens = card.mode === "card" || card.mode === "sheet";
  const kept = card.mode === "card";
  const newcomers = kept && onAddNewcomer ? (card.newcomers ?? []).filter((x) => !settled.includes(x.name)) : [];
  const editing = !(card.mode === "understanding" || card.mode === "sheet");
  const lead = card.heading ? `${card.heading}.` : null;
  return (
    <Raised style={{ marginTop: space.m, marginBottom: space.s, paddingTop: space.m, paddingBottom: space.s, paddingRight: space.s }}>
      <View accessibilityLiveRegion="polite" style={{ flexDirection: "row", alignItems: "flex-start", gap: space.s }}>
        <View style={{ flex: 1, gap: space.xs }}>
          {lead ? <NText v="strong16" style={{ paddingTop: space.m - 2 }}>{lead}</NText> : null}
          {card.status ? (
            <Pressable
              accessibilityRole={opens ? "button" : "text"}
              accessibilityLabel={card.status}
              disabled={!opens}
              onPress={onOpen}
              style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: space.s + 2, minHeight: TOUCH, opacity: pressed ? press.surface : 1 })}
            >
              {working ? <BreathingDot /> : null}
              <NText v={working ? "strong14" : "body15"} tone={working ? "ink2" : card.mode === "sheet" ? "held" : "ink2"} style={{ flexShrink: 1 }}>{card.status}</NText>
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
              <NText v="serif17" numberOfLines={2}>{l.statement}</NText>
              {(l.replaces ?? []).map((text) => <Replaces key={text} text={text} />)}
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
              <NText v="small" tone="ink2">{`and ${card.more} more`}</NText>
            </Pressable>
          ) : null}
        </View>
        {editing ? <Link label={KEPT_COPY.undo} hint="Forgets this note and what came from it" onPress={onUndo} tone="ink" /> : null}
        {working ? null : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Got it"
            onPress={onDismiss}
            style={({ pressed }) => ({ minWidth: TOUCH, minHeight: TOUCH, alignItems: "center", justifyContent: "center", opacity: pressed ? press.link : 1 })}
          >
            <X color={n.quiet} size={20} strokeWidth={1.8} />
          </Pressable>
        )}
      </View>

      {newcomers.map((x) => (
        <View key={x.name} style={{ marginTop: space.s, gap: space.xs, paddingRight: space.s }}>
          <NText v="body15">{KEPT_COPY.notInPeople(x.name)}</NText>
          <NText v="small" tone="quiet">{KEPT_COPY.why(x.name)}</NText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space.s, marginTop: space.xs }}>
            <NButton
              small
              label={KEPT_COPY.add(x.name)}
              accessibilityHint={`Adds ${x.name} to People. This memory also shows on ${x.name}'s page`}
              onPress={() => {
                setSettled((s) => [...s, x.name]);
                onAddNewcomer?.(x.name, x.itemIds);
              }}
            />
            <NButton
              small
              variant="ghost"
              label={KEPT_COPY.notNow}
              accessibilityLabel={`Not now: ${KEPT_COPY.add(x.name)}`}
              accessibilityHint="Keeps the memory as it is"
              onPress={() => setSettled((s) => [...s, x.name])}
            />
          </View>
        </View>
      ))}

      {kept && card.partial?.tellRest && onTellRest ? (
        <View style={{ flexDirection: "row", marginTop: space.s }}>
          <NButton small variant="ghost" label={KEPT_COPY.tellRest} accessibilityHint="Opens Tell with the words Kinship couldn't get to, to tell again" onPress={onTellRest} />
        </View>
      ) : null}

      {editing && (kept || (card.canRetry && onRetry)) ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: space.l }}>
          {card.canRetry && onRetry ? <Link label={KEPT_COPY.tryAgain} hint="Asks Kinship to understand this note once more" onPress={onRetry} /> : null}
          {kept ? <Link label={KEPT_COPY.correct} hint="Shows what was kept, to change it" onPress={onOpen} /> : null}
        </View>
      ) : null}

      {kept && onRate ? (
        <View style={{ marginTop: space.xs, paddingBottom: space.xs, gap: space.xs, paddingRight: space.s }}>
          {card.feedback ? (
            <NText v="small" tone="quiet">{"Thanks. Noted."}</NText>
          ) : asking ? (
            <>
              <NText v="small" tone="ink2">{"What was off?"}</NText>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.xs }}>
                {FEEDBACK_OFF.map((o) => (
                  <NButton key={o.key} small variant="ghost" label={o.label} onPress={() => { onRate("not_quite", o.key); setAsking(false); }} />
                ))}
              </View>
            </>
          ) : (
            <>
              <NText v="small" tone="quiet">{KEPT_COPY.rateAsk}</NText>
              <View style={{ flexDirection: "row", gap: space.xs }}>
                <NButton small variant="ghost" label="Got it right" onPress={() => onRate("right")} />
                <NButton small variant="ghost" label="Not quite" onPress={() => setAsking(true)} />
              </View>
            </>
          )}
        </View>
      ) : null}
    </Raised>
  );
}

/** The Tell pill and the bar, with the Kept card above them. */
export function NotebookDock({ current, onGo }: { current: NavKey; onGo: (to: NavKey) => void }) {
  const flow = useTellFlow();
  const p = usePalette();
  const n = useNotebookPalette();
  const draft = flow.draft(null);
  let line: React.ReactNode = null;
  if (flow.card) {
    line = (
      <NotebookKeptCard
        card={flow.card} onOpen={flow.openCard} onUndo={flow.undoCard} onDismiss={flow.dismissCard} onRate={flow.rateCard} onAddNewcomer={flow.addNewcomer}
        onTellRest={() => flow.tellRest(flow.card!.captureId)} onRetry={flow.retryCard}
      />
    );
  } else if (flow.waitingOffline) {
    line = <NText v="small" tone="ink2" accessibilityLiveRegion="polite" style={{ paddingHorizontal: space.xs, paddingBottom: space.s }}>{OFFLINE_LINE}</NText>;
  }
  const label = draft.trim() ? draftPreview(draft, null) : NOTEBOOK_TELL_COPY.pill;
  return (
    <View style={{ backgroundColor: p.paper }}>
      {flow.tellOn ? (
        <View style={{ paddingHorizontal: space.l, paddingTop: space.s }}>
          {line}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={draft.trim() ? label : "Tell Kinship something"}
            accessibilityHint={draft.trim() ? "Opens your unsent note" : "Opens a page to tell Kinship about anyone, in your own words"}
            onPress={() => flow.openTell?.(null)}
            style={({ pressed }) => ({
              minHeight: 52, borderRadius: 26, backgroundColor: n.card, flexDirection: "row", alignItems: "center", gap: space.s + 2,
              paddingHorizontal: space.xl, opacity: pressed ? press.surface : 1, ...notebookShadow.card,
            })}
          >
            <PenLine color={p.ink} size={20} strokeWidth={1.8} />
            <NText v="body16" tone="quiet" numberOfLines={1} style={{ flex: 1 }}>{label}</NText>
          </Pressable>
        </View>
      ) : null}
      <NavBar current={current} onGo={onGo} />
    </View>
  );
}
