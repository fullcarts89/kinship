// "What Kinship knows about Ben" (Design Direction §I.7, §J; plan §20 knows):
// everything kept about a person, each line with who, when and what as
// tokens, where it came from, Edit (founder native pass F5: the words were
// changeable only by tapping them, which nobody could see) and "Not this".
// From plain data.
//
// Residence lines that chain are one line here (Phase 4B B5, brief §12):
// "Lives in Alameda, California", its provenance the union of its notes.
// It is a view over its members: tapping it, its provenance or Edit opens
// them (ComposedSheet), each with its own words, source, Edit and Not this.
// Never place ids, readings, datasets or rule names.
//
// The lines come in sections (Phase 4B B8; founder CC-17 to CC-20; brief §4):
// Background · Into · Hoping to · Plans · Their people · Between you, in that
// order, empty ones absent; a quiet "Before" under Background for history
// (I7), and a related person's lines under who they are ("Michelle · sister").
// No counts, completeness, progress or prompts. The same rows, the same
// Edit, Not this and source on every line; where a line sits is computed
// (recordSections.ts), never stored, and never changes the line.
import React, { useRef } from "react";
import { type ScrollView, Text, View } from "react-native";
import { Pressable } from "@/ui/Pressable";
import { press, space } from "@/design/tokens";
import type { ItemLine } from "@/features/tell/reviewModel";
import type { ConflictChoice } from "@/store/conflictCopy";
import type { SourceFacts } from "@/features/memory/format";
import type { ComposeMember } from "../../../supabase/functions/_shared/semantic/compose";
import type { Category, Section } from "../../../supabase/functions/_shared/semantic/categories";
import { Body, Emphasis, Label, Line, Pill, Provenance, Screen, Small, Title, Token, TokenRow, useLineFocus, usePalette } from "@/ui";

/** The composed line's words (B5): what tapping it does, said for screen readers; nothing about how it was made. */
export const COMPOSED_COPY = {
  hint: "Double-tap to see the notes it comes from",
  edit: "Edit",
  editHint: "See and change the notes it comes from",
} as const;

/** "Forget this?" (founder native pass F5: "Keep it" also named the Tell button, with another meaning). */
export const FORGET_COPY = { title: "Forget this?", cancel: "Cancel", forget: "Forget" } as const;

export interface RecordLine {
  line: ItemLine;
  provenance: string;
  /** The newest note it came from, for the Source view. */
  noteId: string | null;
  conflict: { id: number; title: string; choices: ConflictChoice[]; canUseMine: boolean } | null;
  /**
   * Several residence lines said as one (Phase 4B B5): "Lives in Alameda,
   * California". `line` is its most specific member's; the row shows the
   * composed words, its provenance is the union, and tapping it opens the
   * members, each with its own Edit and Not this. Never a memory of its own.
   */
  composed?: ComposedRecord;
  /** Where the line sits (B8); a flat list ignores it. */
  section?: Section;
  /** Its category, for Background's order (residence, work, education, the rest). */
  category?: Category;
  /**
   * The words the page shows when they differ from the line's own (B8:
   * "Works at Meta" for "Susan works at Meta"; "Previously lived in Alameda"
   * for a closed residence line). Edit, Not this and the Source view keep the
   * line's own words.
   */
  display?: string;
  /** A quiet heading over this line and the neighbours that share it ("Michelle · sister"; "Before"). */
  under?: string;
  /**
   * A closed line shown as history (I7, §11): dated by the day the change was
   * told (its provenance) and, when that note gives the day, "Moved · Jan 4".
   */
  history?: { when: string | null };
}

/** One section of What Kinship knows (B8): its rows in order, newest first. */
export interface RecordSection {
  key: Section;
  label: string;
  rows: RecordLine[];
}

/** One line behind a composed line, with what reading it again needs. */
export interface ComposedMember {
  input: ComposeMember;
  row: RecordLine;
  sources: SourceFacts[];
  /** Where the line came from (an extracted line's provenance can still be syncing). */
  origin: string | null;
}

export interface ComposedRecord {
  text: string;
  /** The most specific first. */
  memberIds: string[];
  members: ComposedMember[];
}

export interface PersonRecordViewProps {
  name: string | null;
  /** Still being read: an empty screen, never "isn't here any more". */
  loading?: boolean;
  /** The name Kinship says (names.ts shortName): "Michelle" from Contacts, a chosen "Cutie Pie" whole (founder I12). */
  short?: string | null;
  label: string | null;
  lines: RecordLine[];
  /** The lines in sections (B8). Without them the page is the flat list (the lab). */
  sections?: RecordSection[];
  onBack: () => void;
  /** "Edit name": a correction to the same person (H1). */
  onRename?: () => void;
  onChange: (line: ItemLine, what: "person" | "date" | "kind" | "words") => void;
  onForget: (line: RecordLine) => void;
  onSource: (noteId: string) => void;
  onSettle: (conflictId: number, choice: "keep_current" | "use_mine") => void;
  /** A composed line (B5): opens its members. */
  onComposed?: (line: RecordLine) => void;
  /** "View Ben" from a Moment whose line isn't on Ben's page (founder I1): this list lands on it. */
  focusItemId?: string | null;
  /** Every conversation the user confirmed with them, newest first (founder I2). */
  trail?: { id: string; label: string; about: string | null }[];
  /** "Not this" on a conversation recorded by mistake. */
  onForgetConversation?: (id: string) => void;
  children?: React.ReactNode;
}

export function PersonRecordView(props: PersonRecordViewProps) {
  const p = usePalette();
  const scroll = useRef<ScrollView>(null);
  const focus = useLineFocus(props.focusItemId, scroll);
  if (!props.name) {
    return (
      <Screen onBack={props.onBack}>
        {props.loading ? null : <Body>{"This person isn't here any more."}</Body>}
      </Screen>
    );
  }
  const first = props.short?.trim() || props.name.trim().split(/\s+/u)[0];
  return (
    <Screen onBack={props.onBack} scrollRef={scroll}>
      <Title>{`What Kinship knows about ${first}`}</Title>
      {props.onRename ? (
        <View style={{ alignItems: "flex-start", marginLeft: -space.xs }}>
          <Pill variant="quiet" size="small" label="Edit name" accessibilityHint={`Change ${first}'s name`} onPress={props.onRename} />
        </View>
      ) : null}
      <Body style={{ marginTop: space.s }}>
        {props.lines.length
          ? "Everything you've told Kinship about them, and where each came from. Change or remove any of it."
          : `What you tell Kinship about ${first} will be here.`}
      </Body>
      {props.sections ? (
        props.sections.map((section) => (
          <View key={section.key} onLayout={(e) => focus.onGroup(section.key, e.nativeEvent.layout.y)} style={{ marginTop: space.x3 }}>
            <Label tone="inkBody" accessibilityRole="header">{section.label}</Label>
            <View style={{ marginTop: space.s, borderTopWidth: section.rows.length || (section.key === "between_you" && props.trail?.length) ? 1 : 0, borderTopColor: p.hairline }}>
              {section.rows.map((r, i) => (
                <Row key={r.line.id} r={r} group={section.key} heading={r.under && r.under !== section.rows[i - 1]?.under ? r.under : null} props={props} focus={focus} />
              ))}
              {section.key === "between_you" ? <Trail trail={props.trail ?? []} onForget={props.onForgetConversation} /> : null}
            </View>
          </View>
        ))
      ) : (
        <>
          <View
            onLayout={(e) => focus.onGroup("lines", e.nativeEvent.layout.y)}
            style={{ marginTop: space.xl, borderTopWidth: props.lines.length ? 1 : 0, borderTopColor: p.hairline }}
          >
            {props.lines.map((r) => <Row key={r.line.id} r={r} group="lines" heading={null} props={props} focus={focus} />)}
          </View>
          {props.trail?.length ? (
            <View style={{ marginTop: space.x3 }}>
              <Label tone="inkBody" accessibilityRole="header">Between you</Label>
              <View style={{ marginTop: space.s, borderTopWidth: 1, borderTopColor: p.hairline }}>
                <Trail trail={props.trail} onForget={props.onForgetConversation} />
              </View>
            </View>
          ) : null}
        </>
      )}
      {props.children}
    </Screen>
  );
}

/** One row of the page, whichever kind of line it holds, with the quiet heading over a group when one starts here. */
function Row({ r, group, heading, props, focus }: {
  r: RecordLine;
  group: string;
  heading: string | null;
  props: PersonRecordViewProps;
  focus: ReturnType<typeof useLineFocus>;
}) {
  const p = usePalette();
  const ids = r.composed ? r.composed.memberIds : [r.line.id];
  const focused = !!props.focusItemId && ids.includes(props.focusItemId);
  return (
    <View onLayout={(e) => ids.forEach((id) => focus.onLine(group, id, e.nativeEvent.layout.y))} style={{ paddingVertical: space.l, borderBottomWidth: 1, borderBottomColor: p.hairline }}>
      {heading ? <Small style={{ marginBottom: space.s }} accessibilityRole="header">{heading}</Small> : null}
      <Emphasis on={focused}>
        {r.composed ? (
          <ComposedRow r={r} onComposed={props.onComposed ?? (() => undefined)} onSource={props.onSource} />
        ) : r.history ? (
          <HistoryRow r={r} onChange={props.onChange} onForget={props.onForget} onSource={props.onSource} />
        ) : (
          <RecordRow r={r} onChange={props.onChange} onForget={props.onForget} onSource={props.onSource} onSettle={props.onSettle} />
        )}
      </Emphasis>
    </View>
  );
}

/** The conversations the user confirmed (founder I2), each with Not this. */
function Trail({ trail, onForget }: { trail: { id: string; label: string; about: string | null }[]; onForget?: (id: string) => void }) {
  const p = usePalette();
  return (
    <>
      {trail.map((t) => (
        <View key={t.id} style={{ paddingVertical: space.l, borderBottomWidth: 1, borderBottomColor: p.hairline }}>
          <Line>{t.label}</Line>
          {t.about ? <Small style={{ marginTop: space.xs }}>{t.about}</Small> : null}
          {onForget ? (
            <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: space.s }}>
              <Pill variant="quiet" label="Not this" accessibilityLabel={`Not this: ${t.label}`} onPress={() => onForget(t.id)} />
            </View>
          ) : null}
        </View>
      ))}
    </>
  );
}

/**
 * A closed line shown as history (B8, I7; brief §11): its words (the
 * composer's for a residence, else its own), "Moved · Jan 4" when the note
 * gives the day, dated by the day the change was told; Edit and Not this as
 * on any line. No tokens: it is past, not something to re-file.
 */
function HistoryRow({ r, onChange, onForget, onSource }: {
  r: RecordLine;
  onChange: PersonRecordViewProps["onChange"];
  onForget: PersonRecordViewProps["onForget"];
  onSource: PersonRecordViewProps["onSource"];
}) {
  const text = r.display ?? r.line.statement;
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={text}
        accessibilityHint="Double-tap to change the words"
        onPress={() => onChange(r.line, "words")}
        style={({ pressed }) => ({ opacity: pressed ? press.surface : 1 })}
      >
        <Line>{text}</Line>
      </Pressable>
      {r.history?.when ? <Small style={{ marginTop: space.xs }}>{r.history.when}</Small> : null}
      {/* The provenance gives way and wraps; the pills keep their size (a quiet pill never shrinks its type). */}
      <View style={{ flexDirection: "row", alignItems: "center", marginTop: space.s }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Provenance line={r.provenance} onPress={r.noteId ? () => onSource(r.noteId as string) : undefined} />
        </View>
        <Pill variant="quiet" label="Edit" accessibilityLabel={`Edit: ${r.line.statement}`} accessibilityHint="Change the words" onPress={() => onChange(r.line, "words")} />
        <Pill variant="quiet" label="Not this" accessibilityLabel={`Not this: ${r.line.statement}`} onPress={() => onForget(r)} />
      </View>
    </>
  );
}

/** One line: its words, its tokens, what it replaced, where it came from, Edit and Not this. The sheet of a composed line reuses it. */
export function RecordRow({ r, onChange, onForget, onSource, onSettle }: {
  r: RecordLine;
  onChange: PersonRecordViewProps["onChange"];
  onForget: PersonRecordViewProps["onForget"];
  onSource: PersonRecordViewProps["onSource"];
  onSettle: PersonRecordViewProps["onSettle"];
}) {
  const text = r.display ?? r.line.statement;
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={text}
        accessibilityHint="Double-tap to change the words"
        onPress={() => onChange(r.line, "words")}
        style={({ pressed }) => ({ opacity: pressed ? press.surface : 1 })}
      >
        <Line>{text}</Line>
      </Pressable>
      <View style={{ marginTop: space.s }}>
        <TokenRow>
          {r.line.person?.changeable ? (
            <Token what="Who" value={r.line.person.label} onPress={() => onChange(r.line, "person")} />
          ) : null}
          {r.line.about ? <Token what="About" value={r.line.about} /> : null}
          {r.line.also?.length ? <Token what="Also about" value={r.line.also.join(", ")} /> : null}
          {r.line.when ? (
            <Token what="When" value={r.line.when.label} onPress={r.line.when.changeable ? () => onChange(r.line, "date") : undefined} />
          ) : null}
          {r.line.maybe ? <Token what="How sure" value="Maybe" /> : null}
          <Token what="What" value={r.line.kind.label} onPress={r.line.kind.changeable ? () => onChange(r.line, "kind") : undefined} />
        </TokenRow>
      </View>
      {/* Gate E: everything this updated stays traceable. */}
      {r.line.replaces.map((text) => <Small key={text} style={{ marginTop: space.xs }}>{`Before: ${text}`}</Small>)}
      {r.line.editedFrom ? (
        <Small style={{ marginTop: space.xs }} accessibilityLabel={`Edited by you. Before: ${r.line.editedFrom}`}>
          {"Edited by you · was: "}
          <Text style={{ textDecorationLine: "line-through" }}>{r.line.editedFrom}</Text>
        </Small>
      ) : null}
      {/* The provenance gives way and wraps; the pills keep their size (a quiet pill never shrinks its type). */}
      <View style={{ flexDirection: "row", alignItems: "center", marginTop: space.s }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Provenance line={r.provenance} onPress={r.noteId ? () => onSource(r.noteId as string) : undefined} />
        </View>
        <Pill variant="quiet" label="Edit" accessibilityLabel={`Edit: ${r.line.statement}`} accessibilityHint="Change the words" onPress={() => onChange(r.line, "words")} />
        <Pill variant="quiet" label="Not this" accessibilityLabel={`Not this: ${r.line.statement}`} onPress={() => onForget(r)} />
      </View>
      {r.conflict ? (
        <View style={{ marginTop: space.s }}>
          <Small tone="markText">{r.conflict.title}</Small>
          {r.conflict.choices.map((c) => (
            <View key={c.field} style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s, marginTop: space.xs }}>
              <Pill size="small" label={`${c.keep.label} ${c.keep.value}`} onPress={() => onSettle(r.conflict!.id, "keep_current")} />
              {r.conflict!.canUseMine ? (
                <Pill size="small" label={`${c.use.label} ${c.use.value}`} onPress={() => onSettle(r.conflict!.id, "use_mine")} />
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
    </>
  );
}

/**
 * A composed line (B5, brief §12): the words, the union of its sources, and
 * one way in, to its members. No tokens of its own (it is no memory) and no
 * "Not this" of its own: each member has them. As history (B8), its
 * provenance is the day the change was told and opens that note's Source
 * view; the line and Edit still open its members.
 */
function ComposedRow({ r, onComposed, onSource }: { r: RecordLine; onComposed: (line: RecordLine) => void; onSource: (noteId: string) => void }) {
  const text = r.composed!.text;
  const provenance = r.history && r.noteId ? () => onSource(r.noteId as string) : () => onComposed(r);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={text}
        accessibilityHint={COMPOSED_COPY.hint}
        onPress={() => onComposed(r)}
        style={({ pressed }) => ({ opacity: pressed ? press.surface : 1 })}
      >
        <Line>{text}</Line>
      </Pressable>
      {r.history?.when ? <Small style={{ marginTop: space.xs }}>{r.history.when}</Small> : null}
      {/* The provenance gives way and wraps; the pills keep their size (a quiet pill never shrinks its type). */}
      <View style={{ flexDirection: "row", alignItems: "center", marginTop: space.s }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Provenance line={r.provenance} onPress={provenance} />
        </View>
        <Pill variant="quiet" label={COMPOSED_COPY.edit} accessibilityLabel={`${COMPOSED_COPY.edit}: ${text}`} accessibilityHint={COMPOSED_COPY.editHint} onPress={() => onComposed(r)} />
      </View>
    </>
  );
}
