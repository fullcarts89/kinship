// What Kinship knows about a person: every line, its tokens and its source.
// Change anything; "Not this" forgets it. A residence said in several notes
// is one line here (Phase 4B B5); tapping it opens the notes behind it, each
// changeable or removable on its own, and the line is read again from what
// is left.
import React, { useMemo, useState } from "react";
import { Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ComposedSheet } from "@/features/person/ComposedSheet";
import { withoutForgotten } from "@/features/person/composedRecord";
import { FORGET_COPY, PersonRecordView, type RecordLine } from "@/features/person/PersonRecordView";
import { DatePane, KindPane, NamePane, namedChoices, PersonPane, WordsPane } from "@/features/tell/Pickers";
import type { ItemLine } from "@/features/tell/reviewModel";
import { todayIso, usePeople, usePersonRecord, useTrail, useUnderstanding, useV2Actions } from "@/hooks/useV2";
import { Sheet } from "@/ui";
import { afterSheets } from "@/ui/sheetStack";
import { shortName } from "../../../../supabase/functions/_shared/extraction/names";

type Pane = { kind: "person" | "date" | "kind" | "words"; line: ItemLine } | { kind: "name" };

export default function KnowsScreen() {
  // `item`: "View Ben" from a Moment whose line isn't on Ben's page lands on it here (founder I1).
  const { id, item: focusItem } = useLocalSearchParams<{ id: string; item?: string }>();
  const { person, lines, loading } = usePersonRecord(String(id));
  const people = usePeople();
  const u = useUnderstanding();
  const { settleConflict, rename, forgetConversation } = useV2Actions();
  // Every conversation the user confirmed with them (founder I2).
  const trail = useTrail(String(id));
  const [pane, setPane] = useState<Pane | null>(null);
  const today = todayIso();
  const fail = (what: Promise<unknown>) =>
    what.catch(() => Alert.alert("That couldn't be changed", "Nothing was lost. Try again in a moment."));
  const close = () => setPane(null);
  // "Not this" takes the line off the screen at once, never brought back by a read that started before it;
  // it comes back, with the alert, only if it couldn't be removed (founder K14: within 300 ms, not seconds).
  const [forgotten, setForgotten] = useState<ReadonlySet<string>>(() => new Set());
  // A composed line is read again at once from the members left (never from its old words).
  const shown = useMemo(() => withoutForgotten(lines, forgotten, new Date()), [lines, forgotten]);
  // The composed line whose notes are open, by its line; it follows every change, and closes when the
  // line is no longer composed (one member left shows as itself).
  const [openComposed, setOpenComposed] = useState<string | null>(null);
  const composedRow = useMemo(() => shown.find((r) => !!r.composed && r.line.id === openComposed) ?? null, [shown, openComposed]);
  // From the sheet to a change: the sheet goes first (never a sheet on a sheet), then the picker opens.
  const changeFromSheet = (line: ItemLine, kind: "person" | "date" | "kind" | "words") => {
    setOpenComposed(null);
    afterSheets(() => setPane({ kind, line }));
  };
  const forgetAsked = (r: RecordLine) =>
    Alert.alert(FORGET_COPY.title, r.line.statement, [
      { text: FORGET_COPY.cancel, style: "cancel" },
      { text: FORGET_COPY.forget, style: "destructive", onPress: () => forget(r.line.id) },
    ]);
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

  return (
    <PersonRecordView
      name={person?.display_name ?? null}
      loading={loading}
      short={person ? shortName(person) : null}
      label={typeof person?.relationship_label === "string" && person.relationship_label ? person.relationship_label : null}
      onRename={() => setPane({ kind: "name" })}
      lines={shown}
      onBack={() => router.back()}
      onChange={(line, kind) => setPane({ kind, line })}
      onForget={forgetAsked}
      onComposed={(r) => setOpenComposed(r.line.id)}
      onSource={(noteId) => router.push(`/v2/source/${noteId}`)}
      onSettle={(conflictId, choice) => fail(settleConflict(conflictId, choice))}
      focusItemId={typeof focusItem === "string" ? focusItem : null}
      trail={trail}
      // Asked first, as for any line (founder I2): a conversation recorded by mistake.
      onForgetConversation={(cid) => Alert.alert(FORGET_COPY.title, trail.find((t) => t.id === cid)?.label ?? "", [
        { text: FORGET_COPY.cancel, style: "cancel" },
        { text: FORGET_COPY.forget, style: "destructive", onPress: () => fail(forgetConversation(cid)) },
      ])}
    >
      <ComposedSheet
        row={composedRow}
        visible={!!composedRow}
        onChange={changeFromSheet}
        onForget={forgetAsked}
        onSource={(noteId) => {
          setOpenComposed(null);
          router.push(`/v2/source/${noteId}`);
        }}
        onSettle={(conflictId, choice) => fail(settleConflict(conflictId, choice))}
        onDismiss={() => setOpenComposed(null)}
      />
      <Sheet visible={!!pane} onDismiss={close} label="Change">
        {pane?.kind === "name" && person ? (
          <NamePane initial={person.display_name} onCancel={close} onSave={(n) => {
            fail(rename(person.id, n));
            close();
          }} />
        ) : pane?.kind === "person" ? (
          <PersonPane people={people} title="Who is this about?" current={pane.line.person?.id ?? null} onCancel={close}
            {...namedChoices(pane.line, people, (ids) => {
              fail(u.correct(pane.line.id, { person_ids: ids }));
              close();
            })}
            onPick={(pid) => {
              fail(u.correct(pane.line.id, { person_id: pid }));
              close();
            }}
            onAdd={(name, bringBack) => {
              fail(u.correct(pane.line.id, { new_person: name, ...(bringBack ? { bring_back: bringBack } : {}) }));
              close();
            }} />
        ) : pane?.kind === "date" ? (
          <DatePane title="When is it?" initial={pane.line.when?.value ?? null} today={today} allowNone onCancel={close}
            onPick={(day) => {
              fail(u.correct(pane.line.id, { date: day }));
              close();
            }} />
        ) : pane?.kind === "kind" ? (
          <KindPane current={pane.line.kind.value} owner={pane.line.kind.owner} onCancel={close} onPick={(k) => {
            fail(u.correct(pane.line.id, { kind: k }));
            close();
          }} onOwner={(o) => {
            fail(u.correct(pane.line.id, { owner: o }));
            close();
          }} />
        ) : pane?.kind === "words" ? (
          <WordsPane initial={pane.line.statement} onCancel={close} onSave={(w) => {
            fail(u.correct(pane.line.id, { statement: w }));
            close();
          }} />
        ) : null}
      </Sheet>
    </PersonRecordView>
  );
}
