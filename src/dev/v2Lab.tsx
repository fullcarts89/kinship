// DEV-ONLY: the D1 screens in their states, from fixtures, with the real
// components and copy (plan §18's hidden lab). Rendered by app/lab.tsx only
// when EXPO_PUBLIC_V2_LAB=1; used for the screenshots in
// docs/phase1/checkpoint-d1-tell-memory-loop.md. No store, no network.
import React from "react";
import { NoteView } from "@/features/person/NoteView";
import { PersonRecordView, type RecordLine } from "@/features/person/PersonRecordView";
import { DatePane } from "@/features/tell/Pickers";
import { ReviewSheet } from "@/features/tell/ReviewSheet";
import { TellView, type TellViewProps } from "@/features/tell/TellView";
import { buildReview, itemLine, type ReviewInput } from "@/features/tell/reviewModel";
import type { HeldItem } from "@/store/gateway";
import type { MemoryItem, Person } from "@/store/repositories";
import type { Reading, UnderstandingRow } from "@/store/understanding";
import { Sheet } from "@/ui";

const TODAY = "2026-10-08";
const noop = () => undefined;

const people = [
  { id: "ben", display_name: "Ben", state: "active" },
  { id: "lee", display_name: "Sam", state: "active", relationship_label: "neighbor" },
  { id: "diaz", display_name: "Sam", state: "active", relationship_label: "climbing" },
  { id: "sarah", display_name: "Sarah", state: "active" },
  { id: "ana", display_name: "Ana", state: "active" },
] as unknown as Person[];

function row(state: UnderstandingRow["state"], reading: Partial<Reading> | null, notice: UnderstandingRow["notice"] = null): UnderstandingRow {
  return {
    capture_id: "c1", state, answer: null, notice, attempts: 0, next_at: null, seen_at: null,
    created_at: "2026-10-08T21:14:00.000Z", updated_at: "2026-10-08T21:14:00.000Z",
    reading: reading ? { tier: "confirm", saved: [], held: [], clarification: null, review_created_at: "t", settled: false, ...reading } : null,
  };
}

function item(id: string, over: Partial<MemoryItem>): MemoryItem {
  return {
    id, kind: "fact", person_id: "ben", statement: "", detail: {}, certainty: "stated", status: "active",
    user_state: "unreviewed", subject_type: "person", subject_related_id: null, origin: "extracted", ...over,
  } as MemoryItem;
}

function held(over: Partial<HeldItem>): HeldItem {
  return {
    kind: "thread", person_id: null, new_person_name: null, subject_type: "person", related: null, statement: "",
    detail: {}, certainty: "stated", sensitivity: "none", tier: "hold", flags: [], spans: [], ...over,
  };
}

const race = item("m1", {
  kind: "event", statement: "Ben runs the Chicago Marathon on Sunday",
  detail: { date: "2026-10-11", date_precision: "day", date_hint: "Sunday", event_type: "race", followup_policy: "after", event_goal: "break four hours" },
});
const goal = item("m2", { kind: "fact", statement: "Ben is hoping to break four hours", detail: { category: "interest" } });
const lisbon = item("m3", { person_id: "ana", statement: "Ana might move to Lisbon", certainty: "tentative", detail: { category: "home" } });
const sam = held({ statement: "Sam is redoing his kitchen", flags: ["person_ambiguous"], spans: [{ start: 0, end: 26, quote: "Sam is redoing his kitchen" }] });
const sister = held({ kind: "event", person_id: "sarah", statement: "Sarah's sister has surgery Thursday", sensitivity: "health",
  flags: ["subject_check", "sensitive"], spans: [{ start: 0, end: 35, quote: "Sarah's sister has surgery Thursday" }] });
const maya = held({ kind: "event", new_person_name: "Maya", statement: "Maya has surgery", sensitivity: "health",
  flags: ["new_person", "date_unresolved_sensitive", "sensitive"], spans: [{ start: 0, end: 16, quote: "Maya has surgery" }] });

function review(note: string, r: UnderstandingRow, items: MemoryItem[], offline = false) {
  const input: ReviewInput = {
    row: r, capture: { id: "c1", raw_text: note, context_person_id: null, status: "needs_review" }, items, people,
    related: [], offline, today: TODAY,
  };
  return buildReview(input);
}

const tell = (over: Partial<TellViewProps> = {}): TellViewProps => ({
  tellOn: true, ai: true, draft: "", onDraft: noop, onKeep: noop, status: null, questions: 0, toLookAt: 0,
  waitingOffline: false, onAnswer: noop, onReview: noop, toast: null, onToast: noop, onUndo: noop, onPeople: noop, ...over,
});

function WithSheet({ view }: { view: ReturnType<typeof review> }) {
  return (
    <TellView {...tell()}>
      <ReviewSheet view={view} visible people={people} today={TODAY} onDismiss={noop} onDone={noop} onUndo={noop}
        onReject={noop} onCorrect={noop} onAnswer={noop} onOpenNote={noop} onActivity={noop} />
    </TellView>
  );
}

const benNote = "Ben runs Chicago Sunday. He's hoping to break four hours.";

const record: RecordLine[] = [
  { line: itemLine(race, { people, related: [], today: TODAY }), provenance: "You told Kinship · Oct 8", noteId: "c1", conflict: null },
  {
    line: itemLine({ ...goal, user_state: "edited", statement: "Ben wants to finish under four hours" }, { people, related: [], today: TODAY }),
    provenance: "You edited this · Oct 9 (from your note, Oct 8)", noteId: "c1",
    conflict: {
      id: 1, title: "This changed on another device.", canUseMine: true,
      choices: [{ field: "statement", title: "", keep: { label: "Keep", value: "“Ben wants to finish under four hours”" },
        use: { label: "Use", value: "“Ben hopes to run a sub-4”" } }],
    },
  },
];

export const LAB_STATES = [
  "tell", "tell-offline", "ben-summary", "ben-sheet", "sams", "sams-answering", "sarah", "maya", "changed",
  "record", "record-date", "source",
] as const;

export function V2Lab({ state }: { state: string }) {
  switch (state) {
    case "tell-offline":
      return <TellView {...tell({ status: "I'll understand this when you're online.", questions: 1 })} />;
    case "ben-summary":
      return <TellView {...tell({ toast: { text: review(benNote, row("review", { tier: "auto", saved: [{ id: "m1", tier: "auto" }], settled: true }), [race]).summary ?? "", opens: true } })} />;
    case "ben-sheet":
      return <WithSheet view={review(benNote, row("review", { saved: [{ id: "m1", tier: "confirm" }, { id: "m2", tier: "confirm" }] }), [race, goal])} />;
    case "sams":
      return <WithSheet view={review("Sam is redoing his kitchen.", row("review", { tier: "clarify", held: [sam] }), [])} />;
    case "sams-answering":
      return <WithSheet view={review("Sam is redoing his kitchen.", row("answering", { tier: "clarify", held: [sam] }), [], true)} />;
    case "sarah":
      return <WithSheet view={review("Sarah's sister has surgery Thursday.", row("review", {
        tier: "clarify", held: [sister],
        clarification: { about: "subject", question: "Is this about Sarah, or Sarah's sister?", options: ["Sarah", "Sarah's sister"] },
      }), [])} />;
    case "maya":
      return <WithSheet view={review("Maya has surgery sometime soon.", row("review", { tier: "clarify", held: [maya] }), [])} />;
    case "changed":
      return <WithSheet view={review("Ana mentioned she might move to Lisbon.", row("review", { saved: [{ id: "m3", tier: "confirm" }], settled: true }, "changed_elsewhere"), [lisbon])} />;
    case "record":
      return <PersonRecordView name="Ben" label="running buddy" lines={record} onBack={noop} onChange={noop} onForget={noop} onSource={noop} onSettle={noop} />;
    case "record-date":
      return (
        <PersonRecordView name="Ben" label="running buddy" lines={record} onBack={noop} onChange={noop} onForget={noop} onSource={noop} onSettle={noop}>
          <Sheet visible onDismiss={noop} label="Change">
            <DatePane title="When is it?" initial="2026-10-11" today={TODAY} allowNone onCancel={noop} onPick={noop} />
          </Sheet>
        </PersonRecordView>
      );
    case "source":
      return (
        <NoteView
          note={{
            runs: [{ text: "Ben runs Chicago Sunday.", marked: true }, { text: " ", marked: false }, { text: "He's hoping to break four hours.", marked: true }],
            quotes: [], arrived: "Typed · Oct 8, 9:14 pm",
            items: [
              { id: "m1", statement: "Ben runs the Chicago Marathon on Sunday", person: "Ben", personId: "ben" },
              { id: "m2", statement: "Ben is hoping to break four hours", person: "Ben", personId: "ben" },
            ],
          }}
          onBack={noop} onPerson={noop} onDelete={noop}
        />
      );
    default:
      return <TellView {...tell({ draft: benNote })} />;
  }
}
