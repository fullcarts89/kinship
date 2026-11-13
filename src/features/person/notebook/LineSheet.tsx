// The line sheet in the notebook (PR #77 `lineSheet`): what kind of thing it is and whose, the line in
// serif, the sentence of the note it rests on with the kept words marked, "From your note · Oct 8 · open
// the note", and the same corrections the built sheet has (ItemSheet.tsx): Edit words, Change date,
// Someone else, Not this (asked first). Tapping the kind changes what it is. On the user's own open
// promise, "I did this" (Showing Up): kept, never contact.
import React, { useEffect, useState } from "react";
import { Alert, View } from "react-native";
import { Check, Clock, PenLine } from "lucide-react-native";
import { font, press, space } from "@/design/tokens";
import type { Correction } from "@/features/tell/ReviewSheet";
import { DatePane, KindPane, namedChoices, PersonPane, WordsPane } from "@/features/tell/Pickers";
import { deviceZone, proposedDay } from "@/features/tell/wordsDate";
import { dayLabel } from "@/features/memory/format";
import type { ItemLine } from "@/features/tell/reviewModel";
import type { Person } from "@/store/repositories";
import { useLineDetail, type LineDetail } from "@/hooks/usePages";
import { useShowingUp } from "@/hooks/useShowingUp";
import { useItemLine } from "@/hooks/useV2";
import { Pressable } from "@/ui/Pressable";
import { Sheet } from "@/ui";
import { NButton, NSource, NText, useNotebookPalette } from "@/ui/notebook";
import { MarkedWords, sourceKind, Was } from "./parts";

type Pane = "item" | "person" | "date" | "kind" | "words";

export const LINE_COPY = {
  edit: "Edit words",
  date: "Change date",
  person: "Someone else",
  notThis: "Not this",
  forgetAsk: "Forget this line? Your note stays exactly as you wrote it.",
  forget: "Forget it",
  cancel: "Cancel",
  did: "I did this",
  open: "open the note",
} as const;

export interface LineSheetProps {
  item: { line: ItemLine; provenance: string; noteId: string | null } | null;
  detail: LineDetail | null;
  visible: boolean;
  people: Person[];
  today: string;
  onCorrect: (itemId: string, change: Correction) => void;
  onForget: (itemId: string) => void;
  onSource: (noteId: string, itemId: string) => void;
  onDismiss: () => void;
  /** "I did this" on the user's own open promise. */
  onKept?: (itemId: string) => void;
}

export function LineSheetView(props: LineSheetProps) {
  const n = useNotebookPalette();
  const [pane, setPane] = useState<Pane>("item");
  const [proposed, setProposed] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  useEffect(() => {
    if (!props.visible) {
      setPane("item");
      setProposed(null);
      setAsking(false);
    }
  }, [props.visible]);
  const it = props.item;
  const d = props.detail && it && props.detail.itemId === it.line.id ? props.detail : null;
  const back = () => {
    setProposed(null);
    setPane("item");
  };
  let body: React.ReactNode = null;
  if (it) {
    const { line } = it;
    if (pane === "person") {
      body = <PersonPane people={props.people} title="Who is this about?" current={line.person?.id ?? null} onCancel={back}
        {...namedChoices(line, props.people, (ids) => { props.onCorrect(line.id, { person_ids: ids }); back(); })}
        onPick={(id) => { props.onCorrect(line.id, { person_id: id }); back(); }}
        onAdd={(name, bringBack) => { props.onCorrect(line.id, { new_person: name, ...(bringBack ? { bring_back: bringBack } : {}) }); back(); }} />;
    } else if (pane === "date") {
      body = <DatePane title={proposed ? `Is it now ${dayLabel(proposed, props.today)}?` : "When is it?"} initial={proposed ?? line.when?.value ?? null} today={props.today} allowNone={!proposed} onCancel={back}
        onPick={(day) => { props.onCorrect(line.id, { date: day }); back(); }} />;
    } else if (pane === "kind") {
      body = <KindPane current={line.kind.value} owner={line.kind.owner} onCancel={back}
        onPick={(k) => { props.onCorrect(line.id, { kind: k }); back(); }}
        onOwner={(o) => { props.onCorrect(line.id, { owner: o }); back(); }} />;
    } else if (pane === "words") {
      body = <WordsPane initial={line.statement} onCancel={back} onSave={(w) => {
        props.onCorrect(line.id, { statement: w });
        // The words name another day: ask, in this sheet, before the line says two (never a silent change).
        const day = proposedDay(line, w, new Date().toISOString(), deviceZone());
        if (day) {
          setProposed(day);
          setPane("date");
        } else back();
      }} />;
    } else {
      const kind = `${d?.kindLabel ?? line.kind.label}${d?.first ? ` · ${d.first}` : ""}`;
      const extra = [line.about ? `About ${line.about}` : null, line.also?.length ? `Also about ${line.also.join(", ")}` : null, line.maybe ? "Maybe" : null].filter(Boolean).join(" · ");
      const kindText = <NText v="cap" tone={d?.promise ? "yours" : "ink2"}>{kind}</NText>;
      body = (
        <View>
          {line.kind.changeable ? (
            <Pressable accessibilityRole="button" accessibilityLabel={kind} accessibilityHint="Change what kind of thing this is" onPress={() => setPane("kind")}
              hitSlop={{ top: space.m, bottom: space.s, right: space.l }}
              style={({ pressed }) => ({ alignSelf: "flex-start", minHeight: 24, justifyContent: "center", opacity: pressed ? press.link : 1 })}>
              {kindText}
            </Pressable>
          ) : kindText}
          <NText v="serif23" style={{ marginTop: 6, marginBottom: 12 }}>{line.statement}</NText>
          {line.edited && line.editedFrom ? <View style={{ marginTop: -6, marginBottom: 12 }}><Was prefix="Edited by you · " was={line.editedFrom} /></View> : null}
          {line.replaces.map((t) => <View key={t} style={{ marginTop: -6, marginBottom: 12 }}><Was prefix="Replaces · " was={t} /></View>)}
          {extra ? <NText v="small" tone="quiet" style={{ marginTop: -6, marginBottom: 12 }}>{extra}</NText> : null}
          {d?.quote ? (
            <View style={{ backgroundColor: n.sheet, borderRadius: 16, paddingVertical: space.m, paddingHorizontal: 14, borderLeftWidth: 3, borderLeftColor: n.sheetMargin }}>
              <MarkedWords
                text={d.quote.text}
                spans={d.quote.mark ? [{ start: d.quote.mark[0], end: d.quote.mark[1], itemId: line.id, sensitive: d.sensitive }] : []}
                style={{ fontFamily: font.serif, fontSize: 16.5, lineHeight: 24 }}
              />
            </View>
          ) : null}
          <View style={{ marginTop: space.m }}>
            {it.noteId ? (
              <NSource chevron kind={sourceKind(it.provenance)} label={`${it.provenance} · ${LINE_COPY.open}`} onPress={() => props.onSource(it.noteId as string, line.id)} />
            ) : (
              <NSource chevron kind={sourceKind(it.provenance)} label={it.provenance} />
            )}
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s, marginTop: space.l }}>
            <Half><NButton full small variant="ghost" label={LINE_COPY.edit} icon={(i) => <PenLine {...i} />} onPress={() => setPane("words")} /></Half>
            {line.when?.changeable ? <Half><NButton full small variant="ghost" label={LINE_COPY.date} icon={(i) => <Clock {...i} />} onPress={() => setPane("date")} /></Half> : null}
            {line.person?.changeable ? <Half><NButton full small variant="ghost" label={LINE_COPY.person} accessibilityHint="Who is this about?" onPress={() => setPane("person")} /></Half> : null}
            <Half><NButton full small variant="ghost" label={LINE_COPY.notThis} accessibilityHint="Kinship forgets this line" onPress={() => setAsking(true)} /></Half>
          </View>
          {asking ? (
            <View style={{ marginTop: space.m, backgroundColor: n.card, borderRadius: 18, paddingVertical: 14, paddingHorizontal: space.l, borderLeftWidth: 3, borderLeftColor: n.held }} accessibilityLiveRegion="polite">
              <NText v="serif17">{LINE_COPY.forgetAsk}</NText>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s, marginTop: 10 }}>
                <NButton small label={LINE_COPY.forget} onPress={() => props.onForget(line.id)} />
                <NButton small variant="ghost" label={LINE_COPY.cancel} onPress={() => setAsking(false)} />
              </View>
            </View>
          ) : null}
          {d?.openOwnPromise && props.onKept ? (
            <View style={{ marginTop: space.m }}>
              <NButton full variant="lime" label={LINE_COPY.did} icon={(i) => <Check {...i} />} accessibilityHint="Kinship keeps that you did it. Nothing is sent" onPress={() => props.onKept?.(line.id)} testID="i-did-this" />
            </View>
          ) : null}
        </View>
      );
    }
  }
  return (
    <Sheet visible={props.visible && !!it} onDismiss={props.onDismiss} label="This line">
      {body}
    </Sheet>
  );
}

function Half({ children }: { children: React.ReactNode }) {
  return <View style={{ flexGrow: 1, flexBasis: "45%" }}>{children}</View>;
}

/** The line sheet with its data and "I did this" wired (the screens' one line sheet in the notebook). */
export function LineSheet(props: Omit<LineSheetProps, "item" | "detail" | "visible" | "onKept"> & { itemId: string | null }) {
  const item = useItemLine(props.itemId);
  const detail = useLineDetail(props.itemId);
  const showing = useShowingUp();
  return (
    <LineSheetView
      {...props}
      item={item}
      detail={detail}
      visible={!!props.itemId}
      onKept={(id) => {
        props.onDismiss();
        showing.keptIt(id, "line").catch(() => Alert.alert("That couldn't be saved", "Nothing was lost. Try again in a moment."));
      }}
    />
  );
}
