// The Knows lens (PR #77 `personKnows`): What Kinship knows, in its approved sections (Background · Into
// · Hoping to · Plans · Their people · Between you), Before and "was" as built, each line with its source,
// in the notebook's look. Tapping a line opens the line sheet; a residence said in several notes opens
// its notes (ComposedSheet); a line kept as Before is changed in its words; conversations keep their
// "Not this". The data and the corrections are the built page's (app/v2/person/[id]/knows.tsx).
import React, { useMemo, useState } from "react";
import { Alert, View } from "react-native";
import { space } from "@/design/tokens";
import { ComposedSheet } from "@/features/person/ComposedSheet";
import { withoutForgotten } from "@/features/person/composedRecord";
import { FORGET_COPY, type RecordLine, type RecordSection } from "@/features/person/PersonRecordView";
import { sectionsFor } from "@/features/person/recordSections";
import { DatePane, KindPane, namedChoices, PersonPane, WordsPane } from "@/features/tell/Pickers";
import { deviceZone, proposedDay } from "@/features/tell/wordsDate";
import { dayLabel } from "@/features/memory/format";
import type { ItemLine } from "@/features/tell/reviewModel";
import type { LineFact } from "@/hooks/usePages";
import { todayIso, usePeople, usePersonRecord, useTrail, useUnderstanding, useV2Actions } from "@/hooks/useV2";
import { Emphasis, Sheet } from "@/ui";
import { Lbl, NButton, NText } from "@/ui/notebook";
import { afterSheets } from "@/ui/sheetStack";
import { NotebookLine, PrivateSource, SproutRow, Was } from "./parts";

export const KNOWS_FINE = "Everything here has a source you can open. Edit any line; your edit wins.";

export interface KnowsLensProps {
  sections: RecordSection[];
  trail: { id: string; label: string; about: string | null }[];
  facts: Record<string, LineFact>;
  focusItemId?: string | null;
  onLine: (r: RecordLine) => void;
  onSource: (noteId: string) => void;
  onSettle: (conflictId: number, choice: "keep_current" | "use_mine") => void;
  onForgetConversation?: (id: string) => void;
  onLayoutLine?: (group: string, id: string, y: number) => void;
  onLayoutGroup?: (group: string, y: number) => void;
}

export function KnowsLensView(props: KnowsLensProps) {
  return (
    <View>
      {props.sections.map((section) => (
        <View key={section.key} onLayout={(e) => props.onLayoutGroup?.(section.key, e.nativeEvent.layout.y)}>
          <Lbl dot={null} style={{ marginTop: 24, marginBottom: 6 }}>{section.label}</Lbl>
          {section.rows.map((r, i) => {
            const heading = r.under && r.under !== section.rows[i - 1]?.under ? r.under : null;
            const ids = r.composed ? r.composed.memberIds : [r.line.id];
            const text = r.composed?.text ?? r.display ?? r.line.statement;
            const sensitive = !r.composed && !!props.facts[r.line.id]?.sensitive;
            return (
              <View key={r.line.id} onLayout={(e) => ids.forEach((id) => props.onLayoutLine?.(section.key, id, e.nativeEvent.layout.y))}>
                {heading ? <NText v="small" tone="quiet" accessibilityRole="header" style={{ marginTop: space.s }}>{heading}</NText> : null}
                <Emphasis on={!!props.focusItemId && ids.includes(props.focusItemId)}>
                  <NotebookLine
                    text={text}
                    provenance={r.provenance}
                    onPress={() => props.onLine(r)}
                    onSource={r.noteId ? () => props.onSource(r.noteId as string) : undefined}
                    notes={<RecordNotes r={r} />}
                    sourceNode={sensitive ? <PrivateSource dot="held" suffix={r.provenance} onPress={r.noteId ? () => props.onSource(r.noteId as string) : undefined} /> : undefined}
                  />
                  {r.conflict ? (
                    <View style={{ marginTop: space.xs, marginBottom: space.s }}>
                      <NText v="small" tone="held">{r.conflict.title}</NText>
                      {r.conflict.choices.map((c) => (
                        <View key={c.field} style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s, marginTop: space.xs }}>
                          <NButton small variant="ghost" label={`${c.keep.label} ${c.keep.value}`} onPress={() => props.onSettle(r.conflict!.id, "keep_current")} />
                          {r.conflict!.canUseMine ? <NButton small variant="ghost" label={`${c.use.label} ${c.use.value}`} onPress={() => props.onSettle(r.conflict!.id, "use_mine")} /> : null}
                        </View>
                      ))}
                    </View>
                  ) : null}
                </Emphasis>
              </View>
            );
          })}
          {section.key === "between_you" ? props.trail.map((t) => (
            <View key={t.id} style={{ flexDirection: "row", alignItems: "center", gap: space.s }}>
              <View style={{ flex: 1, minWidth: 0 }}><SproutRow title={t.label} about={t.about} /></View>
              {props.onForgetConversation ? (
                <NButton small variant="ghost" label="Not this" accessibilityLabel={`Not this: ${t.label}`} onPress={() => props.onForgetConversation?.(t.id)} />
              ) : null}
            </View>
          )) : null}
        </View>
      ))}
      <NText v="fine" tone="quiet" style={{ marginTop: 14 }}>{KNOWS_FINE}</NText>
    </View>
  );
}

/** What a line in Knows carries under it, as built: Before, Edited by you, what it replaced. */
function RecordNotes({ r }: { r: RecordLine }) {
  return (
    <>
      {r.history?.when ? <NText v="small" tone="quiet" style={{ marginTop: space.xs }}>{r.history.when}</NText> : null}
      {r.line.editedFrom ? <Was prefix="Edited by you · " was={r.line.editedFrom} /> : null}
      {r.line.replaces.map((t) => <Was key={t} prefix="Replaces · " was={t} />)}
    </>
  );
}

type Pane = { kind: "person" | "date" | "kind" | "words"; line: ItemLine };

/** The Knows lens with the built page's data and corrections. */
export function NotebookKnows({ personId, facts, focusItemId, onLine, onSource, onLayoutLine, onLayoutGroup }: {
  personId: string;
  facts: Record<string, LineFact>;
  focusItemId?: string | null;
  /** A live line: the notebook's line sheet. */
  onLine: (itemId: string) => void;
  onSource: (noteId: string) => void;
  onLayoutLine?: KnowsLensProps["onLayoutLine"];
  onLayoutGroup?: KnowsLensProps["onLayoutGroup"];
}) {
  const { lines, history } = usePersonRecord(personId);
  const people = usePeople();
  const u = useUnderstanding();
  const { settleConflict, forgetConversation } = useV2Actions();
  const trail = useTrail(personId);
  const [pane, setPane] = useState<Pane | null>(null);
  const [proposed, setProposed] = useState<string | null>(null);
  const [openComposed, setOpenComposed] = useState<string | null>(null);
  const [forgotten, setForgotten] = useState<ReadonlySet<string>>(() => new Set());
  const today = todayIso();
  const fail = (what: Promise<unknown>) =>
    what.catch(() => Alert.alert("That couldn't be changed", "Nothing was lost. Try again in a moment."));
  const close = () => {
    setProposed(null);
    setPane(null);
  };
  const shown = useMemo(() => withoutForgotten(lines, forgotten, new Date()), [lines, forgotten]);
  const past = useMemo(() => withoutForgotten(history, forgotten, new Date()), [history, forgotten]);
  const sections = useMemo(() => sectionsFor({ lines: shown, history: past, trail: trail.length > 0 }), [shown, past, trail]);
  const composedRow = useMemo(() => [...shown, ...past].find((r) => !!r.composed && r.line.id === openComposed) ?? null, [shown, past, openComposed]);
  const forget = (lineId: string) => {
    setForgotten((s) => new Set(s).add(lineId));
    void fail(u.reject(lineId).catch((err: unknown) => {
      setForgotten((s) => {
        const next = new Set(s);
        next.delete(lineId);
        return next;
      });
      throw err;
    }));
  };
  const forgetAsked = (r: RecordLine) =>
    Alert.alert(FORGET_COPY.title, r.line.statement, [
      { text: FORGET_COPY.cancel, style: "cancel" },
      { text: FORGET_COPY.forget, style: "destructive", onPress: () => forget(r.line.id) },
    ]);
  return (
    <>
      <KnowsLensView
        sections={sections}
        trail={trail}
        facts={facts}
        focusItemId={focusItemId}
        onLayoutLine={onLayoutLine}
        onLayoutGroup={onLayoutGroup}
        onLine={(r) => {
          if (r.composed) setOpenComposed(r.line.id);
          // Before is a closed line: its words are changed here, as built (no live line sheet for it).
          else if (r.history) setPane({ kind: "words", line: r.line });
          else onLine(r.line.id);
        }}
        onSource={onSource}
        onSettle={(conflictId, choice) => fail(settleConflict(conflictId, choice))}
        onForgetConversation={(cid) => Alert.alert(FORGET_COPY.title, trail.find((t) => t.id === cid)?.label ?? "", [
          { text: FORGET_COPY.cancel, style: "cancel" },
          { text: FORGET_COPY.forget, style: "destructive", onPress: () => fail(forgetConversation(cid)) },
        ])}
      />
      <ComposedSheet
        row={composedRow}
        visible={!!composedRow}
        onChange={(line, kind) => {
          setOpenComposed(null);
          afterSheets(() => setPane({ kind, line }));
        }}
        onForget={forgetAsked}
        onSource={(noteId) => {
          setOpenComposed(null);
          onSource(noteId);
        }}
        onSettle={(conflictId, choice) => fail(settleConflict(conflictId, choice))}
        onDismiss={() => setOpenComposed(null)}
      />
      <Sheet visible={!!pane} onDismiss={close} label="Change">
        {pane?.kind === "person" ? (
          <PersonPane people={people} title="Who is this about?" current={pane.line.person?.id ?? null} onCancel={close}
            {...namedChoices(pane.line, people, (ids) => { fail(u.correct(pane.line.id, { person_ids: ids })); close(); })}
            onPick={(pid) => { fail(u.correct(pane.line.id, { person_id: pid })); close(); }}
            onAdd={(name, bringBack) => { fail(u.correct(pane.line.id, { new_person: name, ...(bringBack ? { bring_back: bringBack } : {}) })); close(); }} />
        ) : pane?.kind === "date" ? (
          <DatePane title={proposed ? `Is it now ${dayLabel(proposed, today)}?` : "When is it?"} initial={proposed ?? pane.line.when?.value ?? null} today={today} allowNone={!proposed} onCancel={close}
            onPick={(day) => { fail(u.correct(pane.line.id, { date: day })); close(); }} />
        ) : pane?.kind === "kind" ? (
          <KindPane current={pane.line.kind.value} owner={pane.line.kind.owner} onCancel={close}
            onPick={(k) => { fail(u.correct(pane.line.id, { kind: k })); close(); }}
            onOwner={(o) => { fail(u.correct(pane.line.id, { owner: o })); close(); }} />
        ) : pane?.kind === "words" ? (
          <WordsPane initial={pane.line.statement} onCancel={close} onSave={(w) => {
            fail(u.correct(pane.line.id, { statement: w }));
            const day = proposedDay(pane.line, w, new Date().toISOString(), deviceZone());
            if (day) {
              setProposed(day);
              setPane({ kind: "date", line: pane.line });
            } else close();
          }} />
        ) : null}
      </Sheet>
    </>
  );
}

