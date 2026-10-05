// "Kept for David · Here's what I'll remember." (plan §8; board 1; the
// behaviour is Checkpoint D1's): each item as the
// user's own statement, with who, when and what kind as tokens they can
// change; × for "Not this"; one question at a time, answered with their own
// people; Undo and Done. Corrections and pickers open as panes in the same
// sheet.

import React, { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { X } from "lucide-react-native";
import { press, radius, size, space, TOUCH } from "@/design/tokens";
import type { HeldAnswer } from "@/store/gateway";
import type { SwitchableKind } from "@/store/memoryDetail";
import type { Person } from "@/store/repositories";
import { Body, Label, Line, Pill, Sheet, Small, Title, Token, TokenRow, usePalette } from "@/ui";
import { DatePane, KindPane, PersonPane, WordsPane } from "./Pickers";
import { answersFor, COPY, type ItemLine, type Question, type ReviewView } from "./reviewModel";

export type Correction = { statement: string } | { person_id: string } | { kind: SwitchableKind } | { date: string | null };

type Pane =
  | { kind: "review" }
  | { kind: "person"; line?: ItemLine; question?: Question }
  | { kind: "date"; line?: ItemLine; question?: Question }
  | { kind: "kind"; line: ItemLine }
  | { kind: "words"; line: ItemLine };

export interface ReviewSheetProps {
  view: ReviewView;
  visible: boolean;
  people: Person[];
  today: string;
  onDismiss: () => void;
  onDone: () => void;
  onUndo: () => void;
  onReject: (itemId: string) => void;
  onCorrect: (itemId: string, change: Correction) => void;
  onAnswer: (answers: HeldAnswer[]) => void;
  onOpenNote: () => void;
  /** Any touch: the sheet isn't idle. */
  onActivity: () => void;
}

export function ReviewSheet(props: ReviewSheetProps) {
  const { view } = props;
  const p = usePalette();
  const [pane, setPane] = useState<Pane>({ kind: "review" });
  const [picks, setPicks] = useState<Record<string, Omit<HeldAnswer, "index"> | "skip">>({});
  // A new question (or "choose again") starts its picks over.
  const signature = `${view.questions.map((q) => `${q.key}:${q.items.join(",")}:${q.prompt}`).join("|")}#${view.notice ?? ""}`;
  useEffect(() => setPicks({}), [signature]);
  useEffect(() => {
    if (!props.visible) setPane({ kind: "review" });
  }, [props.visible]);

  const question = view.questions.find((q) => picks[q.key] === undefined) ?? null;
  const act = (fn: () => void) => () => {
    props.onActivity();
    fn();
  };
  const choose = (q: Question, value: Omit<HeldAnswer, "index"> | "skip") => {
    props.onActivity();
    const next = { ...picks, [q.key]: value };
    setPicks(next);
    const answers = answersFor(view.questions, next);
    if (answers) props.onAnswer(answers);
  };
  const back = () => setPane({ kind: "review" });

  let body: React.ReactNode;
  if (pane.kind === "person") {
    body = (
      <PersonPane
        people={props.people}
        title={pane.question ? pane.question.prompt : "Who is this about?"}
        current={pane.line?.person?.id ?? null}
        onCancel={back}
        onPick={(id) => {
          if (pane.question) choose(pane.question, { person_id: id });
          else if (pane.line) props.onCorrect(pane.line.id, { person_id: id });
          back();
        }}
      />
    );
  } else if (pane.kind === "date") {
    body = (
      <DatePane
        title={pane.question ? (pane.question.type === "keep" ? "Which day?" : pane.question.prompt) : "When is it?"}
        initial={pane.line?.when?.value ?? null}
        today={props.today}
        allowNone={!pane.question}
        onCancel={back}
        onPick={(day) => {
          if (pane.question) choose(pane.question, { date: day });
          else if (pane.line) props.onCorrect(pane.line.id, { date: day });
          back();
        }}
      />
    );
  } else if (pane.kind === "kind") {
    body = <KindPane current={pane.line.kind.value} onCancel={back} onPick={(k) => {
      props.onCorrect(pane.line.id, { kind: k });
      back();
    }} />;
  } else if (pane.kind === "words") {
    body = <WordsPane initial={pane.line.statement} onCancel={back} onSave={(w) => {
      props.onCorrect(pane.line.id, { statement: w });
      back();
    }} />;
  } else {
    // A single question with nothing kept yet is the whole sheet: ask it, plainly.
    const questionOnly = !!question && view.lines.length === 0 && !view.answering;
    const label = view.heading.startsWith("Kept for") ? view.heading : null;
    body = (
      <View>
        {label ? <Label>{label}</Label> : null}
        {questionOnly ? null : (
          <Title style={{ marginTop: label ? space.m : 0 }}>{view.lines.length ? `${COPY.remember}.` : view.heading}</Title>
        )}
        {view.status ? <Small style={{ marginTop: space.s }} accessibilityLiveRegion="polite">{view.status}</Small> : null}
        {view.notice ? <Body tone="ochreText" style={{ marginTop: space.s }}>{view.notice}</Body> : null}
        {view.lines.length ? (
          <View style={{ marginTop: space.xl, borderTopWidth: 1, borderTopColor: p.hairline }}>
            {view.lines.map((line) => (
              <ReviewLine
                key={line.id}
                line={line}
                onReject={act(() => props.onReject(line.id))}
                onOpen={(what) => {
                  props.onActivity();
                  setPane(what === "kind" ? { kind: "kind", line } : what === "words" ? { kind: "words", line } : { kind: what, line });
                }}
              />
            ))}
          </View>
        ) : null}
        {question && !view.answering ? (
          <QuestionBlock
            q={question}
            boxed={!questionOnly}
            label={questionOnly ? label : null}
            onChoose={(answer) => choose(question, answer)}
            onPick={(what) => {
              props.onActivity();
              setPane({ kind: what, question });
            }}
            onSkip={() => choose(question, "skip")}
          />
        ) : null}
        <View style={{ marginTop: space.xl }}>
          {view.lines.length ? <Small>{"Tap any underlined word to change it."}</Small> : null}
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.s, marginTop: space.s }}>
            {view.canUndo ? <Pill variant="quiet" label="Undo" accessibilityHint="Forget this note and what came from it" onPress={act(props.onUndo)} /> : null}
            <Pill variant="quiet" label="See the note" onPress={act(props.onOpenNote)} />
          </View>
          {!questionOnly ? (
            <View style={{ marginTop: space.s }}>
              <Pill variant="primary" label="Done" onPress={act(props.onDone)} />
            </View>
          ) : null}
        </View>
      </View>
    );
  }
  return (
    <Sheet visible={props.visible} onDismiss={props.onDismiss} label={view.heading}>
      {body}
    </Sheet>
  );
}

function ReviewLine({
  line,
  onReject,
  onOpen,
}: {
  line: ItemLine;
  onReject: () => void;
  onOpen: (what: "person" | "date" | "kind" | "words") => void;
}) {
  const p = usePalette();
  return (
    <View style={{ paddingVertical: space.m, borderBottomWidth: 1, borderBottomColor: p.hairline, flexDirection: "row", gap: space.m }}>
      <View style={{ flex: 1 }}>
        <Pressable
          style={({ pressed }) => ({ minHeight: TOUCH, justifyContent: "center", opacity: pressed ? press.surface : 1 })}
          accessibilityRole="button"
          accessibilityLabel={line.statement}
          accessibilityHint="Double-tap to change the words"
          onPress={() => onOpen("words")}
        >
          <Line>{line.statement}</Line>
        </Pressable>
        <View style={{ marginTop: space.xs }}>
          <TokenRow>
            {line.person ? <Token what="Who" value={line.person.label} onPress={line.person.changeable ? () => onOpen("person") : undefined} /> : null}
            {line.about ? <Token what="About" value={line.about} /> : null}
            {line.when ? <Token what="When" value={line.when.label} onPress={line.when.changeable ? () => onOpen("date") : undefined} /> : null}
            <Token what="What" value={line.kind.label} onPress={line.kind.changeable ? () => onOpen("kind") : undefined} />
          </TokenRow>
        </View>
        {line.edited ? <Small style={{ marginTop: space.xs }}>You edited this</Small> : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Not this: ${line.statement}`}
        onPress={onReject}
        hitSlop={space.s}
        style={({ pressed }) => ({ minWidth: TOUCH, minHeight: TOUCH, alignItems: "center", justifyContent: "center", opacity: pressed ? press.link : 1 })}
      >
        <X color={p.inkQuiet} size={size.iconLarge} strokeWidth={1.8} />
      </Pressable>
    </View>
  );
}

function QuestionBlock({
  q,
  boxed,
  label,
  onChoose,
  onPick,
  onSkip,
}: {
  q: Question;
  /** Under kept lines: an inline surface (board 1). Alone: the sheet's own title. */
  boxed: boolean;
  label: string | null;
  onChoose: (answer: Omit<HeldAnswer, "index">) => void;
  onPick: (what: "person" | "date") => void;
  onSkip: () => void;
}) {
  const p = usePalette();
  const choices = (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s, marginTop: space.m }}>
      {q.choices.map((c, i) => (
        <Pill
          key={c.key}
          size="small"
          variant={!boxed && i === 0 && "answer" in c ? "primary" : "ghost"}
          label={c.label}
          onPress={() => ("answer" in c ? onChoose(c.answer) : onPick(c.pick))}
        />
      ))}
    </View>
  );
  const about = (
    <>
      {q.about.map((a) => (
        <Line key={a} tone="inkBody" style={{ marginTop: space.s }}>{`“${a}”`}</Line>
      ))}
      {q.detail ? <Small style={{ marginTop: space.xs }}>{q.detail}</Small> : null}
    </>
  );
  if (!boxed) {
    return (
      <View accessibilityLabel={q.prompt}>
        {label ? <Label>{label}</Label> : null}
        <Title style={{ marginTop: label ? space.m : 0 }}>{q.prompt}</Title>
        {about}
        {choices}
        <View style={{ alignItems: "flex-start", marginTop: space.xs }}>
          <Pill variant="quiet" label={q.skip.label} onPress={onSkip} />
        </View>
      </View>
    );
  }
  return (
    <View
      accessibilityLabel={q.prompt}
      style={{ marginTop: space.l, borderRadius: radius.inline, backgroundColor: p.paper, borderWidth: 1, borderColor: p.hairline, padding: space.l }}
    >
      <Body tone="ink">{q.prompt}</Body>
      {about}
      {choices}
      <View style={{ alignItems: "flex-start", marginTop: space.xs }}>
        <Pill variant="quiet" label={q.skip.label} onPress={onSkip} />
      </View>
    </View>
  );
}
