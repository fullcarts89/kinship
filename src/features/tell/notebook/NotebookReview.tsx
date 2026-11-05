// "Here's what I'll remember." in the notebook (PR #77 §7; shots/review-j2*.jpg, review-sam-after.jpg):
// the header (who it was kept for, and how many questions), the user's own words with each phrase
// underlined in its person's colour, what needs the user (who it's about, then a yes for anything
// personal), then one group per person with its lines, and Done · Undo this note at the foot.
//
// Every action is the review's own, unchanged (ReviewSheet, Checkpoint D1, Gate D): clear lines are
// already saved; × is "Not this"; a held reading is never memory until the user's yes; two people a
// name could mean are one question, never a guess; a correction is the user's word and wins; Undo
// forgets the note and everything only it made. This file only draws them differently.
import React, { useEffect, useRef, useState } from "react";
import { Animated, Platform, ScrollView, TextInput, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, Contact, Plus, RotateCcw, Users, X } from "lucide-react-native";
import { font, maxScale, notebookShadow, press, space, TOUCH, GUTTER } from "@/design/tokens";
import type { HeldAnswer } from "@/store/gateway";
import type { Person } from "@/store/repositories";
import { isLargeText, useReduceMotion, usePalette } from "@/ui";
import { Pressable } from "@/ui/Pressable";
import { Face, NButton, NText, personLook, Raised, Tag, useNotebookPalette } from "@/ui/notebook";
import { usePersonPortrait } from "@/hooks/usePersonPortrait";
import { dayLabel } from "@/features/memory/format";
import { shortName } from "../../../../supabase/functions/_shared/extraction/names";
import { DatePane, KindPane, namedChoices, PersonPane } from "../Pickers";
import type { Correction, ReviewSheetProps } from "../ReviewSheet";
import { answersFor, COPY, openQuestions, personLabel, type Choice, type ItemLine, type Question } from "../reviewModel";
import { dayWrittenIn, deviceZone, proposedDay } from "../wordsDate";
import type { NoteWords } from "./useNoteWords";
import { dayInSentence, groupLines, isAsSaid, reviewCap, toldOn, type WordMark } from "./words";
import { YourWords } from "./YourWords";

export const NOTEBOOK_REVIEW_COPY = {
  title: "Here’s what I’ll remember.",
  who: "Who is this about?",
  yes: "Needs your yes",
  keepIt: "Keep it",
  dontKeep: "Don’t keep",
  answered: "Answered",
  done: "Done",
  undo: "Undo this note",
  known: "Already known · nothing added twice",
  asSaid: "Kept as you said it",
  edited: "Edited by you",
  removed: "Not kept",
  fromWords: (q: string) => `From your words: “${q}”`,
  asSaidOption: "As you said it. Kinship won’t guess a day.",
  asItIs: "As you said it.",
  wroteOption: (w: string) => `You wrote “${w}”. A day lets Kinship bring it back.`,
  anotherDay: "Another day…",
} as const;

export interface NotebookReviewProps extends Omit<ReviewSheetProps, "visible"> {
  /** The note's own words and what each phrase became; null while it loads (the card waits, never guesses). */
  words: NoteWords | null;
}

type Pane =
  | { kind: "review" }
  | { kind: "person"; lines?: ItemLine[]; question?: Question }
  | { kind: "date"; line?: ItemLine; question?: Question }
  | { kind: "kind"; line: ItemLine };

type Pick = Omit<HeldAnswer, "index"> | "skip";
interface Answered { key: string; q: Question; pick: Pick; label: string; quote: string | null }

const IDENTITY = ["which_person", "new_person", "about_whom"];

export function NotebookReview(props: NotebookReviewProps) {
  const { view } = props;
  const p = usePalette();
  const n = useNotebookPalette();
  const reduce = useReduceMotion();
  const insets = useSafeAreaInsets();
  const [pane, setPane] = useState<Pane>({ kind: "review" });
  const [picks, setPicks] = useState<Record<string, Pick>>({});
  const [answered, setAnswered] = useState<Answered[]>([]);
  // After a words edit that names another day: the day to ask about (never applied silently).
  const [proposed, setProposed] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [pop, setPop] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  // Lines removed here ("Not this"): they stay in their group, struck through, until the review closes.
  const [removed, setRemoved] = useState<ItemLine[]>([]);
  const [lit, setLit] = useState<string | null>(null);
  const litTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scroll = useRef<ScrollView>(null);
  const content = useRef<View>(null);
  const spots = useRef<Record<string, View | null>>({});
  const pulses = useRef<Record<string, () => void>>({});

  // A new question (or "choose again") starts its picks over; a new note starts everything over.
  const signature = `${view.questions.map((q) => `${q.key}:${q.items.join(",")}:${q.prompt}`).join("|")}#${view.notice ?? ""}`;
  useEffect(() => {
    setPicks({});
    if (view.questions.length) setAnswered([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
  useEffect(() => {
    setPane({ kind: "review" });
    setAnswered([]);
    setRemoved([]);
    setEditing(null);
    setPop(null);
    setOpen(false);
  }, [view.captureId]);
  useEffect(() => () => {
    if (litTimer.current) clearTimeout(litTimer.current);
  }, []);

  const activity = () => props.onActivity();
  const choose = (q: Question, value: Pick, label: string) => {
    activity();
    const next = { ...picks, [q.key]: value };
    setPicks(next);
    setAnswered((a) => [...a.filter((x) => x.key !== q.key), { key: q.key, q, pick: value, label, quote: quotesOf(q)[0] ?? null }]);
    const answers = answersFor(view.questions, next);
    if (answers) props.onAnswer(answers);
  };
  const back = () => {
    setProposed(null);
    setPane({ kind: "review" });
  };
  // The user's own words for what a question asks about (never the reading's paraphrase in quotation marks).
  const quotesOf = (q: Question) => {
    const w = props.words && props.words.captureId === view.captureId ? props.words : null;
    return [...new Set(q.items.map((i) => w?.quotes[`held:${i}`]).filter((x): x is string => !!x))];
  };
  const personName = (id: string) => {
    const person = props.people.find((x) => x.id === id);
    return person ? personLabel(person, props.people) : null;
  };

  // ── Panes (the existing pickers), in place of the review ──
  if (pane.kind !== "review") {
    let body: React.ReactNode = null;
    if (pane.kind === "person") {
      const single = pane.lines?.length === 1 ? pane.lines[0] : null;
      body = (
        <PersonPane
          people={props.people}
          title={pane.question ? pane.question.prompt : NOTEBOOK_REVIEW_COPY.who}
          current={pane.lines?.[0]?.person?.id ?? null}
          {...(single ? namedChoices(single, props.people, (ids) => {
            props.onCorrect(single.id, { person_ids: ids });
            back();
          }) : {})}
          onCancel={back}
          onPick={(id) => {
            if (pane.question) choose(pane.question, { person_id: id }, personName(id) ?? "");
            else for (const l of pane.lines ?? []) props.onCorrect(l.id, { person_id: id });
            back();
          }}
          // Adding someone new moves one line; a group of several is moved to someone already here.
          onAdd={pane.question?.slots || (pane.lines && pane.lines.length !== 1) ? undefined : (name, bringBack) => {
            if (pane.question) {
              if (bringBack) props.onRestore?.(bringBack);
              choose(pane.question, bringBack ? { person_id: bringBack } : { new_person: true, new_person_name: name }, name);
            } else if (single) props.onCorrect(single.id, { new_person: name, ...(bringBack ? { bring_back: bringBack } : {}) });
            back();
          }}
        />
      );
    } else if (pane.kind === "date") {
      body = (
        <DatePane
          title={proposed ? `Is it now ${dayLabel(proposed, props.today)}?` : pane.question ? (pane.question.type === "keep" ? "Which day?" : pane.question.prompt) : "When is it?"}
          initial={proposed ?? pane.line?.when?.value ?? null}
          today={props.today}
          allowNone={!pane.question && !proposed}
          onCancel={back}
          onPick={(day) => {
            if (pane.question) choose(pane.question, { date: day }, day ? dayLabel(day, props.today) : COPY.noDate);
            else if (pane.line) props.onCorrect(pane.line.id, { date: day });
            back();
          }}
        />
      );
    } else if (pane.kind === "kind") {
      body = (
        <KindPane
          current={pane.line.kind.value}
          owner={pane.line.kind.owner}
          onCancel={back}
          onPick={(k) => {
            props.onCorrect(pane.line.id, { kind: k });
            back();
          }}
          onOwner={(o) => {
            props.onCorrect(pane.line.id, { owner: o });
            back();
          }}
        />
      );
    }
    return (
      <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1, backgroundColor: p.paper }} contentContainerStyle={{ paddingTop: insets.top + space.xl, paddingHorizontal: GUTTER, paddingBottom: insets.bottom + space.x4 }}>
        {body}
      </ScrollView>
    );
  }

  // ── The review ──
  const words = props.words && props.words.captureId === view.captureId ? props.words : null;
  const waiting = openQuestions(view.questions, picks);
  const liveIds = new Set(view.lines.map((l) => l.id));
  const gone = removed.filter((l) => !liveIds.has(l.id));
  const groups = groupLines([...view.lines, ...gone]);
  const firstName = (id: string) => {
    const person = props.people.find((x) => x.id === id);
    return person ? shortName(person) : null;
  };
  const cap = reviewCap(view.lines, firstName, waiting.length, view.heading === COPY.remember ? "Your note" : view.heading);
  const title = view.lines.length
    ? NOTEBOOK_REVIEW_COPY.title
    : waiting.length ? (waiting.length === 1 ? `${COPY.check}.` : "A few things to check.")
      : view.mode === "nothing" ? COPY.notKept : null;
  const status = view.status && !view.status.startsWith("Already known") && !(view.mode === "nothing" && view.status === COPY.notKept) ? view.status : null;
  const lineOf = (id: string) => view.lines.find((l) => l.id === id) ?? gone.find((l) => l.id === id) ?? null;
  const questionFor = (index: number) => view.questions.find((q) => q.items.includes(index)) ?? null;

  const find = (key: string) => {
    const spot = spots.current[key];
    const host = content.current;
    if (spot && host && typeof spot.measureLayout === "function") {
      try {
        spot.measureLayout(host as never, (_x, y) => scroll.current?.scrollTo({ y: Math.max(0, y - 120), animated: !reduce }), () => undefined);
      } catch {
        // Off screen or not laid out: the pulse still says which it is.
      }
    }
    pulses.current[key]?.();
  };
  const onPhrase = (m: WordMark) => {
    activity();
    if (m.target.kind === "line") find(`line:${m.target.id}`);
    else {
      const q = questionFor(m.target.index);
      if (q) find(`q:${q.key}`);
    }
  };
  const light = (lineId: string) => {
    setLit(`line:${lineId}`);
    if (litTimer.current) clearTimeout(litTimer.current);
    litTimer.current = setTimeout(() => setLit(null), 1100);
  };
  const describe = (m: WordMark) => {
    if (m.target.kind === "line") {
      const l = lineOf(m.target.id);
      return l ? `Shows the line: ${l.statement}` : "Shows the line";
    }
    const q = questionFor(m.target.index);
    return q ? `Shows the question: ${q.prompt}` : "Shows the question";
  };
  const register = (key: string) => (v: View | null) => {
    spots.current[key] = v;
  };

  const largeText = isLargeText();
  const doneWaits = waiting.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: p.paper }} onAccessibilityEscape={props.onDismiss}>
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: insets.bottom + 140 }}>
        <View ref={content} collapsable={false}>
          {/* 1. Who it was kept for, and how many questions. */}
          <View style={{ paddingTop: insets.top + space.xl, paddingHorizontal: space.xl + 2, paddingBottom: space.xs + 2 }}>
            <NText v="cap" tone="ink2" accessibilityRole="header">{cap}</NText>
            {title ? <NText v="title" style={{ marginTop: space.s, lineHeight: 30 }}>{title}</NText> : null}
            {status ? <NText v="small" tone="ink2" style={{ marginTop: space.s }} accessibilityLiveRegion="polite">{status}</NText> : null}
            {view.notice ? <NText v="body15" tone="held" style={{ marginTop: space.s }}>{view.notice}</NText> : null}
            {view.partial?.tellRest && props.onTellRest && !doneWaits ? (
              <View style={{ flexDirection: "row", marginTop: space.m }}>
                <NButton small variant="ghost" label={COPY.tellRest} accessibilityHint="Opens Tell with the words Kinship couldn't get to, to tell again" onPress={() => { activity(); props.onTellRest?.(); }} />
              </View>
            ) : null}
          </View>

          {/* 2. Your words. */}
          {words?.text ? (
            <View style={{ marginTop: space.m + 2, marginHorizontal: space.m + 2 }}>
              <YourWords
                text={words.text}
                cap={["Your words", toldOn(words.toldAt)].filter(Boolean).join(" · ")}
                marks={words.marks}
                unprocessed={words.unprocessed}
                describe={describe}
                onPhrase={onPhrase}
                lit={lit}
                open={open}
                onToggle={() => setOpen((o) => !o)}
                onOpenNote={() => { activity(); props.onOpenNote(); }}
              />
            </View>
          ) : (
            <View style={{ marginTop: space.s, marginHorizontal: space.xl + 2 }}>
              <NButton small variant="ghost" label="See the note" onPress={() => { activity(); props.onOpenNote(); }} />
            </View>
          )}

          {/* 3. Needs you: who it's about, then a yes for anything personal; answered ones say so. */}
          {(view.questions.length || answered.length) ? (
            <View style={{ marginTop: space.l + 2, marginHorizontal: space.m + 2, gap: space.s + 2 }}>
              {view.questions.map((q) => {
                const done = picks[q.key] !== undefined ? answered.find((a) => a.key === q.key) : null;
                if (!done && !waiting.includes(q)) return null;
                return done ? <AnsweredCard key={q.key} a={done} /> : (
                  <Spot key={q.key} register={register(`q:${q.key}`)} pulse={(fn) => { pulses.current[`q:${q.key}`] = fn; }} radius={22}>
                    <QuestionCard
                      q={q}
                      quotes={quotesOf(q)}
                      people={props.people}
                      onChoose={(c) => {
                        if (c.restore) props.onRestore?.(c.restore);
                        choose(q, c.answer, c.label);
                      }}
                      onPick={(what) => {
                        activity();
                        if (what === "contact") {
                          // The note stays behind the system picker; a cancel leaves the question as it was.
                          void props.onChooseContact?.().then((personId) => {
                            if (personId) choose(q, { person_id: personId }, personName(personId) ?? COPY.fromContacts);
                          }, () => undefined);
                          return;
                        }
                        setPane(what === "person" ? { kind: "person", question: q } : { kind: "date", question: q });
                      }}
                      onSkip={() => choose(q, "skip", q.skip.label)}
                    />
                  </Spot>
                );
              })}
              {answered.filter((a) => !view.questions.some((q) => q.key === a.key)).map((a) => <AnsweredCard key={`sent:${a.key}`} a={a} />)}
            </View>
          ) : null}

          {/* 4. One group per person. */}
          {groups.map((g) => {
            const person = g.personId ? props.people.find((x) => x.id === g.personId) ?? null : null;
            const movable = g.lines.filter((l) => l.person?.changeable && liveIds.has(l.id));
            return (
              <View key={g.personId ?? "none"} style={{ marginTop: space.xl + 2, marginHorizontal: space.m + 2 }}>
                <GroupHeader
                  person={person}
                  people={props.people}
                  onPress={movable.length ? () => { activity(); setPane({ kind: "person", lines: movable }); } : undefined}
                />
                {g.lines.map((line) => {
                  const isGone = !liveIds.has(line.id);
                  const key = `line:${line.id}`;
                  return (
                    <Spot key={line.id} register={register(key)} pulse={(fn) => { pulses.current[key] = fn; }} radius={18} style={{ marginTop: space.s }}>
                      <LineRow
                        line={line}
                        gone={isGone}
                        today={props.today}
                        quote={words?.quotes[key] ?? null}
                        toldAt={words?.toldAt ?? null}
                        editing={editing === line.id}
                        draft={draft}
                        onDraft={setDraft}
                        popOpen={pop === line.id}
                        onBody={() => light(line.id)}
                        onEdit={() => {
                          activity();
                          setPop(null);
                          setDraft(line.statement);
                          setEditing(line.id);
                        }}
                        onCancelEdit={() => setEditing(null)}
                        onSave={() => {
                          activity();
                          const w = draft.trim();
                          setEditing(null);
                          if (!w || w === line.statement) return;
                          props.onCorrect(line.id, { statement: w });
                          // The words name another day: ask before the line says two (never a silent change).
                          const day = proposedDay(line, w, new Date().toISOString(), deviceZone());
                          if (day) {
                            setProposed(day);
                            setPane({ kind: "date", line });
                          }
                        }}
                        onReject={() => {
                          activity();
                          setRemoved((r) => [...r.filter((x) => x.id !== line.id), line]);
                          props.onReject(line.id);
                        }}
                        onPop={() => { activity(); setPop((x) => (x === line.id ? null : line.id)); }}
                        onDay={(day) => {
                          activity();
                          setPop(null);
                          if (day !== undefined) props.onCorrect(line.id, { date: day } as Correction);
                        }}
                        onAnotherDay={() => { activity(); setPop(null); setPane({ kind: "date", line }); }}
                        onKind={line.kind.changeable ? () => { activity(); setPane({ kind: "kind", line }); } : undefined}
                        onAddPerson={props.onAddPerson ? (name) => { activity(); props.onAddPerson!(line.id, name); } : undefined}
                      />
                    </Spot>
                  );
                })}
              </View>
            );
          })}

          {/* Said again, already known (H17): grey, nothing to remove, nothing added twice. */}
          {(words?.known ?? []).length ? (
            <View style={{ marginTop: space.xl + 2, marginHorizontal: space.m + 2, gap: space.s }}>
              {(words?.known ?? []).map((k) => (
                <View key={k} style={{ backgroundColor: n.sheet, borderRadius: 18, borderLeftWidth: 3, borderLeftColor: p.rule, paddingVertical: space.m + 2, paddingHorizontal: space.l, ...notebookShadow.card }}>
                  <NText v="serif18" tone="ink2">{k}</NText>
                  <View style={{ marginTop: space.s }}>
                    <Tag kind="known" label={NOTEBOOK_REVIEW_COPY.known} />
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* 5. Done · Undo this note. */}
      <View
        style={{
          position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: p.paper,
          paddingHorizontal: space.l, paddingTop: space.m + 2, paddingBottom: Math.max(insets.bottom, space.l) + space.s,
          flexDirection: largeText ? "column" : "row", alignItems: largeText ? "stretch" : "center", gap: space.m,
        }}
      >
        <NButton
          label={NOTEBOOK_REVIEW_COPY.done}
          flex={largeText ? undefined : 1}
          full={largeText}
          // A question left unanswered keeps waiting (on Today and the person's page): Done never answers it.
          accessibilityHint={doneWaits ? "The question keeps waiting for you on Today" : undefined}
          onPress={() => {
            activity();
            if (doneWaits) props.onDismiss();
            else props.onDone();
          }}
        />
        {view.canUndo ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={NOTEBOOK_REVIEW_COPY.undo}
            accessibilityHint="Forgets this note and what came from it"
            onPress={() => { activity(); props.onUndo(); }}
            style={({ pressed }) => ({ minHeight: TOUCH, justifyContent: "center", alignItems: "center", opacity: pressed ? press.link : 1 })}
          >
            <NText v="strong15" tone="ink2">{NOTEBOOK_REVIEW_COPY.undo}</NText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/** Something the words can point at: it pulses yellow (1.2 s) when its phrase is tapped. */
function Spot({ register, pulse, radius, style, children }: {
  register: (v: View | null) => void;
  pulse: (fn: () => void) => void;
  radius: number;
  style?: ViewStyle;
  children: React.ReactNode;
}) {
  const n = useNotebookPalette();
  const o = useRef(new Animated.Value(0)).current;
  const running = useRef<Animated.CompositeAnimation | null>(null);
  useEffect(() => () => running.current?.stop(), []);
  pulse(() => {
    running.current?.stop();
    o.setValue(1);
    running.current = Animated.timing(o, { toValue: 0, duration: 1200, useNativeDriver: true });
    running.current.start();
  });
  return (
    <View ref={register} collapsable={false} style={style}>
      {children}
      <Animated.View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius, backgroundColor: n.find, opacity: Animated.multiply(o, 0.45) }} />
    </View>
  );
}

function PersonFace({ person, size }: { person: Person; size: number }) {
  const photo = usePersonPortrait(person.id);
  return <Face personId={person.id} name={person.display_name} photoUri={photo.uri} size={size} />;
}

function GroupHeader({ person, people, onPress }: { person: Person | null; people: Person[]; onPress?: () => void }) {
  const relation = person && typeof person.relationship_label === "string" && person.relationship_label ? person.relationship_label : null;
  const name = person ? (person.full_name && typeof person.full_name === "string" ? person.full_name : person.display_name) : "Your note";
  const label = person ? personLabel(person, people) : name;
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : "header"}
      accessibilityLabel={relation ? `${label}, ${relation}` : label}
      accessibilityHint={onPress ? "Choose who this is about" : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: space.m, paddingHorizontal: space.xs + 2, paddingBottom: space.xs + 2, minHeight: TOUCH, opacity: pressed ? press.surface : 1 })}
    >
      {person ? <PersonFace person={person} size={40} /> : null}
      <View style={{ flex: 1 }}>
        <NText v="group">{name}</NText>
        {relation ? <NText v="quote14" tone="ink2" style={{ marginTop: 3 }}>{relation}</NText> : null}
      </View>
    </Pressable>
  );
}

function LineRow(props: {
  line: ItemLine;
  gone: boolean;
  today: string;
  quote: string | null;
  toldAt: string | null;
  editing: boolean;
  draft: string;
  onDraft: (t: string) => void;
  popOpen: boolean;
  onBody: () => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onReject: () => void;
  onPop: () => void;
  /** A day picked from the three choices; undefined keeps it as said. */
  onDay: (day: string | null | undefined) => void;
  onAnotherDay: () => void;
  onKind?: () => void;
  onAddPerson?: (name: string) => void;
}) {
  const { line } = props;
  const p = usePalette();
  const n = useNotebookPalette();
  const edge = line.person ? personLook(line.person.id).color : n.quiet;
  const row: ViewStyle = {
    backgroundColor: props.gone ? n.sheet : n.card, borderRadius: 18, borderLeftWidth: 3, borderLeftColor: props.gone ? p.rule : edge,
    paddingTop: space.m + 2, paddingBottom: space.m, paddingLeft: space.l, paddingRight: space.x4 - 4, ...notebookShadow.card,
  };
  if (props.editing) {
    return (
      <View style={[row, { paddingRight: space.l }]}>
        {props.quote ? <NText v="quote14" tone="ink2" style={{ marginBottom: space.s }}>{NOTEBOOK_REVIEW_COPY.fromWords(props.quote)}</NText> : null}
        <TextInput
          value={props.draft}
          onChangeText={props.onDraft}
          multiline
          autoFocus
          accessibilityLabel="The words for this line"
          maxFontSizeMultiplier={maxScale.text}
          style={{
            borderWidth: 1.5, borderColor: p.ink, borderRadius: 12, paddingHorizontal: space.m, paddingVertical: space.s + 2,
            fontFamily: font.serif, fontSize: 18, lineHeight: 25, color: p.ink, backgroundColor: n.sheet, minHeight: 25 * 3, textAlignVertical: "top",
          }}
        />
        <View style={{ flexDirection: "row", gap: space.s, marginTop: space.s }}>
          <NButton small label="Save" onPress={props.onSave} accessibilityHint="Your words replace these; Kinship never rewrites them" />
          <NButton small variant="ghost" label="Cancel" onPress={props.onCancelEdit} />
        </View>
      </View>
    );
  }
  const when = line.when;
  const asSaid = isAsSaid(when, props.today);
  const inline = when && when.changeable ? dayInSentence(line.statement, when.label) : null;
  const token = (label: string) => (
    <NText
      v="serif18"
      accessibilityRole="button"
      accessibilityLabel={`When: ${when?.label ?? label}`}
      accessibilityHint="Choose how Kinship keeps the day"
      onPress={props.gone ? undefined : props.onPop}
      style={{ textDecorationLine: "underline", textDecorationStyle: "dotted", textDecorationColor: n.ink2 }}
    >
      {label}
    </NText>
  );
  const sentence = (
    <NText
      v="serif18"
      accessibilityRole={props.gone ? "text" : "button"}
      accessibilityLabel={props.gone ? `Not kept: ${line.statement}` : line.statement}
      accessibilityHint={props.gone ? undefined : "Double-tap to change the words"}
      onPress={props.gone ? undefined : props.onEdit}
      style={props.gone ? { textDecorationLine: "line-through", color: n.quiet } : null}
    >
      {inline && !props.gone ? (
        <>
          {line.statement.slice(0, inline.start)}
          {token(line.statement.slice(inline.start, inline.end))}
          {line.statement.slice(inline.end)}
        </>
      ) : line.statement}
    </NText>
  );
  const written = when && when.changeable && props.quote && props.toldAt ? dayWrittenIn(props.quote, props.toldAt, deviceZone()) : null;
  const offerWritten = written && written.date !== when?.value ? written : null;
  const tags: React.ReactNode[] = [];
  if (props.gone) tags.push(<Tag key="gone" label={NOTEBOOK_REVIEW_COPY.removed} />);
  else {
    if (line.kind.value === "promise") tags.push(<TagButton key="kind" kind="yours" label={line.kind.label} onPress={props.onKind} hint="Whose promise it is" />);
    else if (props.onKind) tags.push(<TagButton key="kind" kind="plain" label={line.kind.label} onPress={props.onKind} hint="What kind of thing this is" />);
    if (line.maybe) tags.push(<Tag key="maybe" label="Maybe" />);
    if (line.about) tags.push(<Tag key="about" label={`About ${line.about}`} />);
    if (line.also.length) tags.push(<Tag key="also" label={`Also about ${line.also.join(", ")}`} />);
    for (const r of line.replaces) tags.push(<Tag key={`r:${r}`} kind="replace" label={`Replaces: ${r}`} />);
    if (line.edited) tags.push(<Tag key="edited" label={NOTEBOOK_REVIEW_COPY.edited} />);
    if (asSaid && when && when.label !== "No date yet") tags.push(<Tag key="said" kind="known" label={NOTEBOOK_REVIEW_COPY.asSaid} />);
    for (const name of line.newcomers ?? []) {
      tags.push(
        <Tag key={`new:${name}`} kind="known" label={`${name} isn't in your people yet.`}>
          {props.onAddPerson ? (
            <NText v="tag" tone="ink" accessibilityRole="button" accessibilityLabel={`Add ${name}`} onPress={() => props.onAddPerson?.(name)} style={{ textDecorationLine: "underline", fontFamily: font.sansBold }}>
              {`Add ${name}`}
            </NText>
          ) : null}
        </Tag>,
      );
    }
  }
  return (
    // The row's own tap lights its phrase in "Your words"; its sentence, day, tags and × stay separate for VoiceOver.
    <Pressable
      accessible={false}
      onPress={props.gone ? undefined : props.onBody}
      style={row}
    >
      {sentence}
      {when && when.changeable && !inline && !props.gone ? <View style={{ marginTop: space.xs }}>{token(when.label)}</View> : null}
      {tags.length ? <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.xs + 2, marginTop: space.s }}>{tags}</View> : null}
      {props.popOpen && when ? (
        <View style={{ marginTop: space.m - 2, backgroundColor: p.paper, borderRadius: 14, padding: space.s + 2, gap: space.xs + 2 }}>
          <DayChoice title={when.label} sub={asSaid ? NOTEBOOK_REVIEW_COPY.asSaidOption : NOTEBOOK_REVIEW_COPY.asItIs} on onPress={() => props.onDay(undefined)} />
          {offerWritten ? (
            <DayChoice title={dayLabel(offerWritten.date, props.today)} sub={NOTEBOOK_REVIEW_COPY.wroteOption(offerWritten.words)} onPress={() => props.onDay(offerWritten.date)} />
          ) : null}
          <DayChoice title={NOTEBOOK_REVIEW_COPY.anotherDay} onPress={props.onAnotherDay} />
        </View>
      ) : null}
      {props.gone ? null : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Not this: ${line.statement}`}
          accessibilityHint="Kinship won't keep this line; your note stays as it is"
          onPress={props.onReject}
          style={({ pressed }) => ({ position: "absolute", right: 2, top: 4, width: TOUCH, height: TOUCH, alignItems: "center", justifyContent: "center", opacity: pressed ? press.link : 1 })}
        >
          <X color={n.quiet} size={22} strokeWidth={1.8} />
        </Pressable>
      )}
    </Pressable>
  );
}

function TagButton({ kind, label, onPress, hint }: { kind: "yours" | "plain"; label: string; onPress?: () => void; hint: string }) {
  if (!onPress) return <Tag kind={kind} label={label} />;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint={hint} onPress={onPress} hitSlop={{ top: 10, bottom: 10 }} style={({ pressed }) => ({ opacity: pressed ? press.surface : 1 })}>
      <Tag kind={kind} label={label} />
    </Pressable>
  );
}

function DayChoice({ title, sub, on = false, onPress }: { title: string; sub?: string; on?: boolean; onPress: () => void }) {
  const p = usePalette();
  const n = useNotebookPalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={sub ? `${title}. ${sub}` : title}
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: n.card, borderRadius: 12, paddingHorizontal: space.m, paddingVertical: space.m - 1, minHeight: TOUCH,
        borderWidth: 2, borderColor: on ? p.ink : "transparent", opacity: pressed ? press.surface : 1,
      })}
    >
      <NText v="strong14">{title}</NText>
      {sub ? <NText v="small" tone="quiet" style={{ marginTop: 2, fontSize: 12.5 }}>{sub}</NText> : null}
    </Pressable>
  );
}

function QuestionCard({ q, quotes, people, onChoose, onPick, onSkip }: {
  q: Question;
  /** The user's own words for it, from the note; the reading's words when they can't be placed. */
  quotes: string[];
  people: Person[];
  onChoose: (c: Extract<Choice, { answer: unknown }>) => void;
  onPick: (what: "person" | "date" | "contact") => void;
  onSkip: () => void;
}) {
  const n = useNotebookPalette();
  const identity = IDENTITY.includes(q.type);
  const keep = q.type === "keep";
  const choices = q.choices.filter((c) => !("pick" in c && c.pick === "contact" && Platform.OS === "web"));
  const act = (c: Choice) => ("answer" in c ? onChoose(c) : onPick(c.pick));
  return (
    <Raised large edge={n.held} style={{ paddingTop: space.l, paddingBottom: space.m + 2 }}>
      <View accessibilityLabel={q.prompt}>
        <NText v="cap" tone="held" accessibilityRole="header">{identity ? NOTEBOOK_REVIEW_COPY.who : keep ? NOTEBOOK_REVIEW_COPY.yes : COPY.check}</NText>
        <NText v="serif18" style={{ marginTop: space.s, marginBottom: space.xs }}>{keep ? q.about[0] ?? q.prompt : q.prompt}</NText>
        {keep ? (
          q.reason ? <NText v="quote15" tone="ink2">{q.reason}</NText> : null
        ) : (
          <>
            {(quotes.length ? quotes : q.about).map((a) => <NText key={a} v="quote15" tone="ink2">{`“${a}”`}</NText>)}
            {q.reason ? <NText v="small" tone="quiet" style={{ marginTop: space.xs }}>{q.reason}</NText> : null}
          </>
        )}
        {q.detail ? <NText v="small" tone="quiet" style={{ marginTop: space.xs }}>{q.detail}</NText> : null}
        {q.replaces ? <View style={{ marginTop: space.s }}><Tag kind="replace" label={`Replaces: ${q.replaces}`} /></View> : null}
      </View>
      {keep ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s, marginTop: space.m }}>
          {choices.map((c) => (
            <NButton key={c.key} small variant={c.key === "yes" ? "ink" : "ghost"} label={c.key === "yes" ? NOTEBOOK_REVIEW_COPY.keepIt : c.label} accessibilityHint={c.key === "yes" ? "Kinship keeps this only because you said so" : undefined} onPress={() => act(c)} />
          ))}
          <NButton small variant="ghost" label={NOTEBOOK_REVIEW_COPY.dontKeep} accessibilityHint="Nothing from this is kept; your note stays as it is" onPress={onSkip} />
        </View>
      ) : identity ? (
        <View style={{ gap: space.s, marginTop: space.m }}>
          {choices.map((c) => <Option key={c.key} c={c} people={people} onPress={() => act(c)} />)}
          <SkipLink label={q.skip.label} onPress={onSkip} />
        </View>
      ) : (
        <View style={{ marginTop: space.m }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s }}>
            {choices.map((c) => <NButton key={c.key} small variant="ghost" label={c.label} onPress={() => act(c)} />)}
          </View>
          <SkipLink label={q.skip.label} onPress={onSkip} />
        </View>
      )}
    </Raised>
  );
}

/** One way to answer "Who is this about?": a person (face, name, how they know them), or another way. */
function Option({ c, people, onPress }: { c: Choice; people: Person[]; onPress: () => void }) {
  const p = usePalette();
  const id = "answer" in c && !c.restore && typeof c.answer.person_id === "string" && !c.answer.also_person_ids ? c.answer.person_id : null;
  const person = id ? people.find((x) => x.id === id) ?? null : null;
  const relation = person && typeof person.relationship_label === "string" && person.relationship_label ? person.relationship_label : null;
  // Split "Sam (From the pottery studio)" into a name and how they know them; two Sams read by their full names (PR #77).
  const full = person && typeof person.full_name === "string" && person.full_name ? person.full_name : null;
  const name = person && relation && c.label === `${person.display_name} (${relation})` ? full ?? person.display_name : c.label;
  const icon = "pick" in c
    ? c.pick === "contact" ? <Contact color={p.ink} size={20} strokeWidth={1.8} /> : <Plus color={p.ink} size={22} strokeWidth={1.8} />
    : "restore" in c && c.restore ? <RotateCcw color={p.ink} size={20} strokeWidth={1.8} />
      : c.answer.also_person_ids ? <Users color={p.ink} size={20} strokeWidth={1.8} />
        : c.answer.new_person ? <Plus color={p.ink} size={22} strokeWidth={1.8} /> : <Check color={p.ink} size={20} strokeWidth={1.8} />;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={c.label}
      onPress={onPress}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: space.m, borderRadius: 16, backgroundColor: p.paper, paddingHorizontal: space.m, paddingVertical: space.s + 2, minHeight: TOUCH + 8, opacity: pressed ? press.surface : 1 })}
    >
      {person ? <PersonFace person={person} size={36} /> : <View style={{ width: 36, alignItems: "center" }}>{icon}</View>}
      <View style={{ flex: 1 }}>
        <NText v="strong15">{name}</NText>
        {person && relation ? <NText v="small" tone="quiet">{relation}</NText> : null}
      </View>
    </Pressable>
  );
}

function SkipLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => ({ alignSelf: "flex-start", minHeight: TOUCH, justifyContent: "center", opacity: pressed ? press.link : 1 })}>
      <NText v="strong14" tone="ink2">{label}</NText>
    </Pressable>
  );
}

function AnsweredCard({ a }: { a: Answered }) {
  const n = useNotebookPalette();
  const keep = a.q.type === "keep";
  const said = a.pick === "skip"
    ? keep ? "You said don’t keep it." : `You said: ${a.label}.`
    : keep ? "You said keep it." : a.q.type === "which_person" && a.quote ? `“${a.quote}” is ${a.label}.` : `You said: ${a.label}.`;
  return (
    <Raised large edge={n.green} style={{ paddingTop: space.l, paddingBottom: space.m + 2 }}>
      <View accessible accessibilityLabel={`${NOTEBOOK_REVIEW_COPY.answered}. ${keep ? a.q.about[0] ?? "" : a.q.prompt}. ${said}`}>
        <NText v="cap" tone="known">{NOTEBOOK_REVIEW_COPY.answered}</NText>
        <NText v="serif16" style={{ marginTop: space.s }}>{keep ? a.q.about[0] ?? a.q.prompt : said}</NText>
        {keep ? <NText v="small" tone="quiet" style={{ marginTop: space.xs }}>{said}</NText> : null}
      </View>
    </Raised>
  );
}
