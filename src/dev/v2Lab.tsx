// DEV-ONLY: the 2.0 screens in their states, from fixtures, with the real
// components, models and copy (plan §18's hidden lab). Rendered by
// app/lab.tsx only when EXPO_PUBLIC_V2_LAB=1; used for the screenshots in
// docs/phase2/. No store, no network. Fixtures are the user's own words only
// (the canonical Ben note, eval core-001): nothing here says "marathon".
import React from "react";
import { View } from "react-native";
import { ItemSheet } from "@/features/person/ItemSheet";
import { NoteView, type NoteData } from "@/features/person/NoteView";
import { PersonRecordView, type RecordLine } from "@/features/person/PersonRecordView";
import { PortraitView, type PortraitLineData } from "@/features/person/PortraitView";
import { PeopleView } from "@/features/people/PeopleView";
import { AddByNameSheet } from "@/features/setup/AddByNameSheet";
import { HowItWorksView } from "@/features/welcome/HowItWorks";
import type { Portrait as PortraitData } from "@/features/person/portraitModel";
import proofs from "./fixtures/generated/proofs.json";
import { buildPickLists, searchRows, worthKnowing, type DeviceContact } from "@/features/setup/setupModel";
import { ConsentStepView, PeoplePickView, WorthStepView, type PeoplePickViewProps } from "@/features/setup/SetupViews";
import { EmailSheet, WelcomeView } from "@/features/welcome/WelcomeView";
import { SettingsSheetView } from "@/features/people/SettingsSheet";
import { ConsentSheetView } from "@/features/tell/ConsentSheet";
import { ReviewSheet } from "@/features/tell/ReviewSheet";
import { KeptLine, OFFLINE_LINE, TellDockView } from "@/features/tell/TellDock";
import { buildReview, itemLine, type ReviewInput, type ReviewView } from "@/features/tell/reviewModel";
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
  { id: ID.ben, display_name: "Ben", full_name: "Ben Carter", state: "active" },
  { id: ID.josh, display_name: "Josh", state: "active" },
  { id: ID.mom, display_name: "Mom", state: "active" },
  { id: ID.sam1, display_name: "Sam", full_name: "Sam Lee", state: "active" },
  { id: ID.sam2, display_name: "Sam", full_name: "Sam Diaz", state: "active" },
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
    now: NOW, today: TODAY, reasons, items, people, local: {}, primaries: [], handoff: null, told: 6, questions: 0, toLookAt: 0,
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
      personId={ID.ben} name="Ben" label={null} remembered={false}
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
  { id: ID.sam1, label: "Sam Lee", line: null, remembered: false },
  { id: ID.sam2, label: "Sam Diaz", line: null, remembered: false },
  { id: ID.sarah, label: "Sarah", line: null, remembered: false },
];

// Setup fixtures: lab-only contacts (never in a real account; contract §7.9).
const labContacts: DeviceContact[] = [
  { id: "k1", name: "Maya Okafor", birthday: { day: 17, month: 10, year: 1991 } },
  { id: "k2", name: "Mom" },
  { id: "k3", name: "David Reyes", birthday: { day: 2, month: 3 } },
  { id: "k4", name: "Ben Carter" },
  { id: "k5", name: "Chris Alvarez" },
  { id: "k6", name: "Sarah Kim", birthday: { day: 14, month: 10, year: 1988 } },
  { id: "k7", name: "Grandpa Joe" },
  { id: "k8", name: "Josh Lee" },
  { id: "k9", name: "Priya Shah" },
  { id: "k10", name: "Ana Torres" },
  { id: "k11", name: "Dr. Feldman (dentist)" },
  { id: "k12", name: "Sam Okafor" },
];
const pickLists = buildPickLists(labContacts, {
  today: TODAY, existing: { contactRefs: new Set(), names: new Set() }, newId: (c) => `0000000${c.length}-0000-4000-8000-${c.padStart(12, "0")}`,
});
function Pick(over: Partial<PeoplePickViewProps>) {
  return (
    <PeoplePickView
      label="Setting up · 2 of 3" access={{ state: "granted", limited: false }} suggested={pickLists.suggested}
      everyone={pickLists.everyone} added={[]} results={null} query="" selected={new Set()} busy={false} error={null}
      onQuery={noop} onToggle={noop} onAddByName={noop} onAsk={noop} onSettings={noop} onShareMore={noop} onContinue={noop} onSkip={noop}
      {...over}
    />
  );
}
const picked = [...pickLists.suggested, ...pickLists.everyone].filter((r) => ["Maya Okafor", "Mom", "Sarah Kim", "Ben Carter"].includes(r.name));
const pickedPeople = picked.map((r) => ({ id: r.personId, display_name: r.name, state: "active", birthday: r.birthday, birthday_source: r.birthday ? "contacts" : null })) as unknown as Person[];
const worthLines = worthKnowing(picked.map((r) => ({ id: r.personId, name: r.name, birthday: r.birthday })), TODAY);

// The memory proofs, exactly as src/features/person/__tests__/memoryProofs.test.ts computed them.
type ProofPortrait = PortraitData & { person: { id: string; display_name: string } };
const P = proofs as unknown as {
  matt: { note: string; review: ReviewView; portrait: ProofPortrait; knows: RecordLine[]; source: NoteData; personId: string };
  anna: { before: ProofPortrait; after: ProofPortrait; knowsAfter: RecordLine[]; personId: string };
  knee: { before: ProofPortrait; after: ProofPortrait; knowsAfter: RecordLine[]; personId: string };
  density: { fresh: ProofPortrait; light: ProofPortrait; rich: ProofPortrait; richKnows: RecordLine[] };
};
function ProofPage({ p }: { p: ProofPortrait }) {
  return (
    <PortraitView
      personId={p.person.id} name={p.person.display_name} label={p.label} remembered={false}
      lately={p.lately} comingUp={p.comingUp} youSaid={p.youSaid} between={p.between} total={p.total}
      onBack={noop} onLine={noop} onSource={noop} onKnows={noop} onMessage={noop} onCall={noop} onTell={noop}
    />
  );
}
const proofPeople = [{ id: P.matt.personId, display_name: "Matt", state: "active" }] as unknown as Person[];

export const LAB_STATES = [
  "today", "today-quiet", "today-return", "today-after", "handoff", "handoff-choose", "tell", "kept", "offline",
  "review", "keep", "sams", "sams-answering", "sarah", "maya", "changed",
  "welcome", "welcome-busy", "welcome-error", "welcome-email", "welcome-email-error", "welcome-no-apple",
  "setup-consent", "setup-ask", "setup-people", "setup-people-picked", "setup-search", "setup-denied", "setup-limited",
  "setup-add-name", "setup-worth", "setup-tell", "today-first", "today-first-empty", "today-birthday", "today-birthday-week",
  "people-empty", "person-birthday",
  "how-1", "how-2", "how-3", "how-4", "setup-worth-typed",
  "matt-tell", "matt-review", "matt-person", "matt-knows", "matt-source",
  "anna-before", "anna-after", "anna-knows", "knee-before", "knee-after", "knee-knows",
  "person-new", "person-light", "person-rich", "person-rich-knows",
  "consent", "settings", "people", "people-add", "person", "person-empty", "correction", "correction-date", "knows", "source",
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
    case "welcome":
    case "welcome-busy":
    case "welcome-error":
    case "welcome-no-apple":
      return (
        <WelcomeView
          methods={{ apple: state !== "welcome-no-apple", google: true, email: true }}
          busy={state === "welcome-busy"}
          error={state === "welcome-error" ? "That didn't work. Please try again." : null}
          onApple={noop} onGoogle={noop} onEmail={noop} onTerms={noop} onPrivacy={noop}
        />
      );
    case "welcome-email":
    case "welcome-email-error":
      return (
        <WelcomeView methods={{ apple: true, google: true, email: true }} busy={false} error={null}
          onApple={noop} onGoogle={noop} onEmail={noop} onTerms={noop} onPrivacy={noop}>
          <EmailSheet visible mode="sign_in" email="dana@example.com" password={state === "welcome-email-error" ? "secret12" : ""}
            busy={false} message={state === "welcome-email-error" ? { text: "That email and password didn't work.", tone: "error" } : null}
            onEmail={noop} onPassword={noop} onMode={noop} onSubmit={noop} onDismiss={noop} />
        </WelcomeView>
      );
    case "how-1":
    case "how-2":
    case "how-3":
    case "how-4":
      return <HowItWorksView step={Number(state.slice(4)) - 1} onNext={noop} onClose={noop} />;
    case "setup-worth-typed":
      return <WorthStepView label="Setting up · 3 of 3" lines={worthLines} text="Maya starts her new job next month." busy={false} onText={noop} onKeep={noop} onSkip={noop} />;
    case "matt-tell":
      return <Phone nav="today" dock={<TellDockView tellOn draft={P.matt.note} onDraft={noop} onSend={noop} line={null} current="today" onGo={noop} />}><TodayLab view={today({ reasons: [], items: [], told: 3 })} /></Phone>;
    case "matt-review":
      return (
        <Phone nav="today">
          <TodayLab view={today({ reasons: [], items: [], told: 3 })} />
          <ReviewSheet view={P.matt.review} visible people={proofPeople} today={TODAY} onDismiss={noop} onDone={noop} onUndo={noop}
            onReject={noop} onCorrect={noop} onAnswer={noop} onOpenNote={noop} onActivity={noop} />
        </Phone>
      );
    case "matt-person":
      return <ProofPage p={P.matt.portrait} />;
    case "matt-knows":
      return <PersonRecordView name="Matt" label={null} lines={P.matt.knows} onBack={noop} onChange={noop} onForget={noop} onSource={noop} onSettle={noop} />;
    case "matt-source":
      return <NoteView note={P.matt.source} onBack={noop} onPerson={noop} onDelete={noop} />;
    case "anna-before":
      return <ProofPage p={P.anna.before} />;
    case "anna-after":
      return <ProofPage p={P.anna.after} />;
    case "anna-knows":
      return <PersonRecordView name="Anna" label={null} lines={P.anna.knowsAfter} onBack={noop} onChange={noop} onForget={noop} onSource={noop} onSettle={noop} />;
    case "knee-before":
      return <ProofPage p={P.knee.before} />;
    case "knee-after":
      return <ProofPage p={P.knee.after} />;
    case "knee-knows":
      return <PersonRecordView name="Ben" label={null} lines={P.knee.knowsAfter} onBack={noop} onChange={noop} onForget={noop} onSource={noop} onSettle={noop} />;
    case "person-new":
      return <ProofPage p={P.density.fresh} />;
    case "person-light":
      return <ProofPage p={P.density.light} />;
    case "person-rich":
      return <ProofPage p={P.density.rich} />;
    case "person-rich-knows":
      return <PersonRecordView name="Priya" label={null} lines={P.density.richKnows} onBack={noop} onChange={noop} onForget={noop} onSource={noop} onSettle={noop} />;
    case "setup-consent":
      return <ConsentStepView label="Setting up · 1 of 3" busy={false} onAllow={noop} onDecline={noop} />;
    case "setup-ask":
      return <Pick access={{ state: "undetermined" }} suggested={[]} everyone={[]} />;
    case "setup-people":
      return <Pick />;
    case "setup-people-picked":
      return <Pick selected={new Set(picked.map((r) => r.personId))} />;
    case "setup-search":
      return <Pick query="sa" results={searchRows(pickLists, "sa")} selected={new Set(picked.map((r) => r.personId))} />;
    case "setup-denied":
      return <Pick access={{ state: "denied", canAskAgain: false }} suggested={[]} everyone={[]} />;
    case "setup-limited":
      return <Pick access={{ state: "granted", limited: true }} suggested={pickLists.suggested.slice(0, 2)} everyone={[]} />;
    case "setup-add-name":
      return (
        <View style={{ flex: 1 }}>
          <Pick access={{ state: "denied", canAskAgain: false }} suggested={[]} everyone={[]} />
          <AddByNameSheet initial="" onDismiss={noop} onDone={async () => undefined} />
        </View>
      );
    case "setup-worth":
      return <WorthStepView label="Setting up · 3 of 3" lines={worthLines} text="" busy={false} onText={noop} onKeep={noop} onSkip={noop} />;
    case "setup-tell":
      return <WorthStepView label="Setting up · 3 of 3" lines={[]} text="" busy={false} onText={noop} onKeep={noop} onSkip={noop} />;
    case "today-first":
      return <Phone nav="today"><TodayLab view={today({ reasons: [], items: [], people: pickedPeople.filter((x) => !x.birthday), told: 0 })} /></Phone>;
    case "today-first-empty":
      return <Phone nav="today"><TodayLab view={today({ reasons: [], items: [], people: [], told: 0 })} /></Phone>;
    case "today-birthday":
      return <Phone nav="today"><TodayLab view={today({ reasons: [], items: [], people: [{ ...pickedPeople[0], birthday: "1991-10-12" } as Person, ...pickedPeople.slice(1)], told: 0 })} /></Phone>;
    case "today-birthday-week":
      return <Phone nav="today"><TodayLab view={today({ people: [...people, ...pickedPeople], told: 3 })} /></Phone>;
    case "people-empty":
      return <Phone nav="people"><PeopleView rows={[]} onOpen={noop} onAdd={async () => undefined} onSettings={noop} onAddFromContacts={noop} /></Phone>;
    case "person-birthday":
      return (
        <PortraitView
          personId={picked.find((r) => r.name === "Sarah Kim")?.personId ?? ""} name="Sarah Kim" label={null} remembered={false} lately={[]} youSaid={[]} between={[]} total={0}
          comingUp={[{ itemId: "birthday", statement: "Sarah's birthday", when: "14 October", provenance: "From Contacts", noteId: null, fixed: true }]}
          onBack={noop} onLine={noop} onSource={noop} onKnows={noop} onMessage={noop} onCall={noop} onTell={noop}
        />
      );
    case "consent":
      return <Phone nav="today"><TodayLab view={today({ reasons: [], items: [] })} /><ConsentSheetView visible busy={false} onAllow={noop} onDecline={noop} /></Phone>;
    case "settings":
      return (
        <Phone nav="people">
          <PeopleView rows={peopleRows} onOpen={noop} onAdd={async () => undefined} onSettings={noop} />
          <SettingsSheetView visible understanding onUnderstanding={noop} onSignOut={noop} onDismiss={noop} />
        </Phone>
      );
    case "people":
      return <Phone nav="people"><PeopleView rows={peopleRows} onOpen={noop} onAdd={async () => undefined} onSettings={noop} /></Phone>;
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
      return <PersonRecordView name="Ben" label={null} lines={record} onBack={noop} onChange={noop} onForget={noop} onSource={noop} onSettle={noop} />;
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
