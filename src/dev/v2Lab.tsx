// DEV-ONLY: the 2.0 screens in their states, from fixtures, with the real
// components, models and copy (plan §18's hidden lab). Rendered by
// app/lab.tsx only when EXPO_PUBLIC_V2_LAB=1; used for the screenshots in
// docs/phase2/. No store, no network. Fixtures are the user's own words only
// (the canonical Ben note, eval core-001): nothing here says "marathon".
import React from "react";
import { View } from "react-native";
import { ItemSheet } from "@/features/person/ItemSheet";
import { NoteView } from "@/features/person/NoteView";
import { PersonRecordView, type RecordLine } from "@/features/person/PersonRecordView";
import { PortraitView, type PortraitLineData } from "@/features/person/PortraitView";
import { PeopleView } from "@/features/people/PeopleView";
import { ReviewSheet } from "@/features/tell/ReviewSheet";
import { KeptLine, OFFLINE_LINE, TellDockView } from "@/features/tell/TellDock";
import { buildReview, itemLine, type ReviewInput } from "@/features/tell/reviewModel";
import { HandoffSheet } from "@/features/today/HandoffSheet";
import { TodayView } from "@/features/today/TodayView";
import { buildToday, type ReasonRow, type TodayInput } from "@/features/today/todayModel";
import type { HeldItem } from "@/store/gateway";
import type { MemoryItem, Person } from "@/store/repositories";
import type { Reading, UnderstandingRow } from "@/store/understanding";
import type { NavKey } from "@/ui";

const TODAY = "2026-10-12";
const NOW = new Date(2026, 9, 12, 9, 10);
const noop = () => undefined;

const ID = {
  ben: "7d1c2f40-1b6e-4c5a-9a0e-3f2b8c1d4e01",
  josh: "2b9e6a13-5c7d-4e8f-a1b2-c3d4e5f60702",
  sarah: "9f8e7d6c-5b4a-4392-8170-6f5e4d3c2b03",
  sam1: "4a3b2c1d-0e9f-4a8b-b7c6-d5e4f3a2b104",
  sam2: "1c2d3e4f-5a6b-4c7d-8e9f-a0b1c2d3e405",
  ana: "6e5f4a3b-2c1d-4e0f-9a8b-7c6d5e4f3a06",
  mom: "3d4c5b6a-7980-4a1b-8c2d-3e4f5a6b7c07",
};

const people = [
  { id: ID.ana, display_name: "Ana", state: "active" },
  { id: ID.ben, display_name: "Ben", state: "active", relationship_label: "running buddy" },
  { id: ID.josh, display_name: "Josh", state: "active" },
  { id: ID.mom, display_name: "Mom", state: "active" },
  { id: ID.sam1, display_name: "Sam", state: "active", relationship_label: "neighbor" },
  { id: ID.sam2, display_name: "Sam", state: "active", relationship_label: "climbing" },
  { id: ID.sarah, display_name: "Sarah", state: "active" },
] as unknown as Person[];

function item(id: string, over: Partial<MemoryItem>): MemoryItem {
  return {
    id, kind: "fact", person_id: ID.ben, statement: "", detail: {}, certainty: "stated", status: "active", sensitivity: "none",
    user_state: "unreviewed", subject_type: "person", subject_related_id: null, origin: "extracted",
    created_at: "2026-10-08T21:14:00.000Z", ...over,
  } as MemoryItem;
}

// The canonical Ben note: one event, in the note's own words, the goal kept on it.
const race = item("m1", {
  kind: "event", statement: "Ben runs Chicago Sunday",
  detail: { date: "2026-10-11", date_precision: "day", date_hint: "Sunday", event_type: "race", followup_policy: "after", event_goal: "break four hours" },
});
const knee = item("m2", { kind: "thread", statement: "Ben's knee has been bothering him", detail: { topic: "knee" }, created_at: "2026-09-02T19:00:00.000Z" });
const interview = item("m4", {
  kind: "event", person_id: ID.josh, statement: "Josh has his interview Wednesday",
  detail: { date: "2026-10-14", date_precision: "day", event_type: "interview", followup_policy: "both" },
});
const anaMove = item("m5", { kind: "plan", person_id: ID.ana, statement: "Ana is visiting for Thanksgiving", detail: { firmness: "intended", when_hint: "Thanksgiving" } });
const jam = item("m6", { kind: "promise", person_id: ID.ben, statement: "Send Ben the playlist", detail: {} });
const trail = item("m7", { kind: "context", person_id: ID.ben, statement: "You two run the lake loop on Saturdays", detail: { aspect: "shared_interest" } });
const items = [race, knee, interview, anaMove, jam, trail];

const reasons: ReasonRow[] = [
  {
    id: "r1", person_id: ID.ben, type: "event_followup", window_start: new Date(2026, 9, 12).toISOString(),
    window_end: new Date(2026, 9, 14).toISOString(), score: 90, state: "candidate", dedupe_key: `event_followup:m1:2026-10-11`,
  },
];

function today(over: Partial<TodayInput> = {}) {
  return buildToday({
    now: NOW, today: TODAY, reasons, items, people, local: {}, primaries: [], handoff: null, questions: 0, toLookAt: 0,
    provenance: () => ({ line: "You told Kinship · Oct 8", noteId: "c1" }), ...over,
  });
}

function Phone({ children, nav, dock }: { children: React.ReactNode; nav?: NavKey; dock?: React.ReactNode }) {
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>{children}</View>
      {nav ? dock ?? <TellDockView tellOn draft="" onDraft={noop} onSend={noop} line={null} current={nav} onGo={noop} /> : null}
    </View>
  );
}

function row(state: UnderstandingRow["state"], reading: Partial<Reading> | null, notice: UnderstandingRow["notice"] = null): UnderstandingRow {
  return {
    capture_id: "c1", state, answer: null, notice, attempts: 0, next_at: null, seen_at: null,
    created_at: "2026-10-08T21:14:00.000Z", updated_at: "2026-10-08T21:14:00.000Z",
    reading: reading ? { tier: "confirm", saved: [], held: [], clarification: null, review_created_at: "t", settled: false, ...reading } : null,
  };
}

function held(over: Partial<HeldItem>): HeldItem {
  return {
    kind: "thread", person_id: null, new_person_name: null, subject_type: "person", related: null, statement: "",
    detail: {}, certainty: "stated", sensitivity: "none", tier: "hold", flags: [], spans: [], ...over,
  };
}

const sam = held({ statement: "Sam is redoing his kitchen", flags: ["person_ambiguous"], spans: [{ start: 0, end: 26, quote: "Sam is redoing his kitchen" }] });
const sister = held({ kind: "event", person_id: ID.sarah, statement: "Sarah's sister has surgery Thursday", sensitivity: "health",
  flags: ["subject_check", "sensitive"], spans: [{ start: 0, end: 35, quote: "Sarah's sister has surgery Thursday" }] });
const surgery = held({ kind: "event", person_id: ID.sarah, statement: "Sarah has surgery Thursday", sensitivity: "health", tier: "confirm",
  flags: ["sensitive"], detail: { event_type: "surgery", followup_policy: "both", date: "2026-10-15", date_precision: "day", date_hint: "Thursday" },
  spans: [{ start: 0, end: 26, quote: "Sarah has surgery Thursday" }] });
const maya = held({ kind: "event", new_person_name: "Maya", statement: "Maya has surgery", sensitivity: "health",
  flags: ["new_person", "date_unresolved_sensitive", "sensitive"], spans: [{ start: 0, end: 16, quote: "Maya has surgery" }] });
const lisbon = item("m3", { person_id: ID.ana, statement: "Ana might move to Lisbon", certainty: "tentative", detail: { category: "home" } });

function review(note: string, r: UnderstandingRow, its: MemoryItem[], offline = false) {
  const input: ReviewInput = {
    row: r, capture: { id: "c1", raw_text: note, context_person_id: null, status: "needs_review" }, items: its, people,
    related: [], offline, today: TODAY,
  };
  return buildReview(input);
}

const benNote = "Ben runs Chicago Sunday. He's hoping to break four hours.";

function WithSheet({ view }: { view: ReturnType<typeof review> }) {
  return (
    <Phone nav="today">
      <TodayLab />
      <ReviewSheet view={view} visible people={people} today={TODAY} onDismiss={noop} onDone={noop} onUndo={noop}
        onReject={noop} onCorrect={noop} onAnswer={noop} onOpenNote={noop} onActivity={noop} />
    </Phone>
  );
}

function TodayLab(props: { view?: ReturnType<typeof today>; after?: boolean }) {
  return (
    <TodayView
      view={props.view ?? today()}
      afterReturn={props.after ? { personId: ID.ben, personName: "Ben" } : null}
      onPrimary={noop} onNotNow={noop} onProvenance={noop} onReturn={noop} onRemember={noop} onNothing={noop} onQuiet={noop}
    />
  );
}

const line = (it: MemoryItem, prov = "You told Kinship · Oct 8"): PortraitLineData => ({
  itemId: it.id, statement: it.statement, when: it.id === "m1" ? "Sun, Oct 11" : null, provenance: prov, noteId: "c1",
});

function Portrait(props: { children?: React.ReactNode; empty?: boolean; kept?: boolean }) {
  return (
    <PortraitView
      personId={ID.ben} name="Ben" label="running buddy" remembered={false}
      lately={props.empty ? [] : [line(race), line(knee, "You told Kinship · Sep 2")]}
      comingUp={[]}
      youSaid={props.empty ? [] : [line(jam)]}
      between={props.empty ? [] : [line(trail, "You told Kinship · Sep 2")]}
      total={props.empty ? 0 : 4}
      onBack={noop} onLine={noop} onSource={noop} onKnows={noop} onMessage={noop} onCall={noop} onTell={noop}
      kept={props.kept ? <KeptLine text="Kept: Ben's knee is better · Undo" onUndo={noop} /> : null}
    >
      {props.children}
    </PortraitView>
  );
}

const record: RecordLine[] = [
  { line: itemLine(race, { people, related: [], today: TODAY }), provenance: "You told Kinship · Oct 8", noteId: "c1", conflict: null },
  { line: itemLine(knee, { people, related: [], today: TODAY }), provenance: "You told Kinship · Sep 2", noteId: "c2", conflict: null },
  {
    line: itemLine(item("m8", { kind: "fact", user_state: "edited", statement: "Ben wants to finish under four hours", detail: { category: "interest" } }), { people, related: [], today: TODAY }),
    provenance: "You edited this · Oct 9 (from your note, Oct 8)", noteId: "c1", conflict: null,
  },
];

const peopleRows = [
  { id: ID.ana, label: "Ana", line: "Ana is visiting for Thanksgiving", remembered: false },
  { id: ID.ben, label: "Ben", line: "Ben runs Chicago Sunday", remembered: false },
  { id: ID.josh, label: "Josh", line: "Josh has his interview Wednesday", remembered: false },
  { id: ID.mom, label: "Mom", line: null, remembered: false },
  { id: ID.sam1, label: "Sam (neighbor)", line: null, remembered: false },
  { id: ID.sam2, label: "Sam (climbing)", line: null, remembered: false },
  { id: ID.sarah, label: "Sarah", line: null, remembered: false },
];

export const LAB_STATES = [
  "today", "today-quiet", "today-return", "today-after", "handoff", "handoff-choose", "tell", "kept", "offline",
  "review", "keep", "sams", "sams-answering", "sarah", "maya", "changed",
  "people", "people-add", "person", "person-empty", "correction", "correction-date", "knows", "source",
] as const;

export function V2Lab({ state }: { state: string }) {
  switch (state) {
    case "today-quiet":
      return <Phone nav="today"><TodayLab view={today({ reasons: [], items: [] })} /></Phone>;
    case "today-return":
      return (
        <Phone nav="today">
          <TodayLab view={today({
            local: { r1: { acted: NOW.toISOString(), firstShown: TODAY } },
            handoff: { reasonId: "r1", personId: ID.ben, channel: "text", at: new Date(NOW.getTime() - 40 * 60_000).toISOString() },
          })} />
        </Phone>
      );
    case "today-after":
      return <Phone nav="today"><TodayLab view={today({ local: { r1: { done: NOW.toISOString() } } })} after /></Phone>;
    case "handoff":
    case "handoff-choose":
      return (
        <Phone nav="today">
          <TodayLab />
          <HandoffSheet visible heading="Ask Ben how it went" personName="Ben" mention={["Ben's knee has been bothering him"]}
            channels={state === "handoff" ? ["text", "call", "facetime", "whatsapp"] : []} ready onOpen={noop} onChooseContact={noop}
            onDismiss={noop} returnCheck />
        </Phone>
      );
    case "tell":
      return (
        <Phone nav="today" dock={<TellDockView tellOn draft={benNote} onDraft={noop} onSend={noop} line={null} current="today" onGo={noop} />}>
          <TodayLab />
        </Phone>
      );
    case "kept":
      return (
        <Phone nav="today" dock={<TellDockView tellOn draft="" onDraft={noop} onSend={noop} current="today" onGo={noop}
          line={<KeptLine text={review(benNote, row("review", { tier: "auto", saved: [{ id: "m1", tier: "auto" }], settled: true }), [race]).summary ?? ""} onOpen={noop} onUndo={noop} />} />}>
          <TodayLab />
        </Phone>
      );
    case "offline":
      return (
        <Phone nav="today" dock={<TellDockView tellOn draft="" onDraft={noop} onSend={noop} current="today" onGo={noop}
          line={<KeptLine text={OFFLINE_LINE} />} />}>
          <TodayLab view={today({ questions: 1 })} />
        </Phone>
      );
    case "review":
      return <WithSheet view={review(benNote, row("review", { saved: [{ id: "m1", tier: "confirm" }] }), [race])} />;
    case "keep":
      return <WithSheet view={review("Sarah has surgery Thursday.", row("review", { tier: "confirm", held: [surgery] }), [])} />;
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
    case "people":
      return <Phone nav="people"><PeopleView rows={peopleRows} onOpen={noop} onAdd={async () => undefined} /></Phone>;
    case "people-add":
      return <Phone nav="people"><PeopleView rows={peopleRows} onOpen={noop} onAdd={async () => undefined} initialAdding="" /></Phone>;
    case "person":
      return <Portrait />;
    case "person-empty":
      return <Portrait empty />;
    case "correction":
    case "correction-date":
      return (
        <Portrait>
          <ItemSheet
            item={{ line: itemLine(race, { people, related: [], today: TODAY }), provenance: "You told Kinship · Oct 8", noteId: "c1" }}
            visible people={people} today={TODAY} onCorrect={noop} onForget={noop} onSource={noop} onDismiss={noop}
            initialPane={state === "correction-date" ? "date" : undefined}
          />
        </Portrait>
      );
    case "knows":
      return <PersonRecordView name="Ben" label="running buddy" lines={record} onBack={noop} onChange={noop} onForget={noop} onSource={noop} onSettle={noop} />;
    case "source":
      return (
        <NoteView
          note={{
            runs: [{ text: "Ben runs Chicago Sunday.", marked: true }, { text: " ", marked: false }, { text: "He's hoping to break four hours", marked: true }, { text: ".", marked: false }],
            quotes: [], arrived: "Typed · Oct 8, 9:14 pm",
            items: [{ id: "m1", statement: "Ben runs Chicago Sunday", person: "Ben", personId: ID.ben }],
          }}
          onBack={noop} onPerson={noop} onDelete={noop}
        />
      );
    default:
      return <Phone nav="today"><TodayLab /></Phone>;
  }
}
