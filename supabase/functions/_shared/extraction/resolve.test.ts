// Resolving held extractions (C-2, Checkpoint D1): the answer settles only
// what the item was held for, with values the review allows, and nothing is
// saved on a guess. Run: deno test supabase/functions
import { type HeldAnswer, type HeldItem, type ResolveContext, resolveHeld } from "./resolve.ts";

function eq<T>(actual: T, expected: T, msg = ""): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg} expected ${e}, got ${a}`);
}

const SAM_NOTE = "Sam is redoing his kitchen.";
const samHeld: HeldItem = {
  kind: "thread", person_id: null, new_person_name: null, subject_type: "person", related: null,
  statement: "Sam is redoing his kitchen", detail: { topic: "redoing his kitchen", followup_after_days: 42 },
  certainty: "stated", sensitivity: "none", confidence: 0.7, action: { type: "new", target_id: null },
  tier: "hold", flags: ["person_ambiguous", "mid_confidence"], spans: [{ start: 0, end: 26, quote: "Sam is redoing his kitchen" }],
};
const ctx = (over: Partial<ResolveContext> = {}): ResolveContext => ({
  note: SAM_NOTE,
  people: [
    { id: "sam-lee", display_name: "Sam", state: "active" },
    { id: "sam-diaz", display_name: "Sam", state: "active" },
    { id: "old-friend", display_name: "Sam", state: "archived" },
    { id: "sarah", display_name: "Sarah", state: "active" },
  ],
  related: [],
  existing: [],
  ...over,
});

Deno.test("two Sams: the chosen Sam, and only one of the user's own people", () => {
  const ok = resolveHeld([samHeld], [{ index: 0, person_id: "sam-lee" }], ctx());
  if ("fail" in ok) throw new Error(ok.fail);
  eq(ok.items.map((i) => [i.person_id, i.subject_type, i.statement, i.action.type]), [["sam-lee", "person", "Sam is redoing his kitchen", "new"]]);
  eq(ok.items[0].confidence, 0.7);
  eq(ok.items[0].spans, [{ start: 0, end: 26, quote: "Sam is redoing his kitchen" }]);
  eq(resolveHeld([samHeld], [{ index: 0, person_id: "someone-elses-person" }], ctx()), { fail: "unknown_person" });
  eq(resolveHeld([samHeld], [{ index: 0, person_id: "old-friend" }], ctx()), { fail: "unknown_person" }, "archived");
  eq(resolveHeld([samHeld], [], ctx()), { fail: "unanswered" }, "nothing is saved on a guess");
  eq(resolveHeld([samHeld], [{ index: 0 }], ctx()), { fail: "bad_answer" }, "an empty answer");
  eq(resolveHeld([samHeld], [{ index: 0, person_id: "sam-lee", new_person: true }], ctx()), { fail: "bad_answer" });
  eq(resolveHeld([samHeld], [{ index: 0, new_person: true }], ctx()), { fail: "bad_answer" }, "the note named no new person");
});

Deno.test("answers are one per held item, in range, never repeated", () => {
  eq(resolveHeld([samHeld], [{ index: 1, person_id: "sam-lee" }], ctx()), { fail: "bad_answer" });
  eq(resolveHeld([samHeld], [{ index: 0, person_id: "sam-lee" }, { index: 0, skip: true }], ctx()), { fail: "bad_answer" });
  eq(resolveHeld([samHeld, samHeld], [{ index: 0, person_id: "sam-lee" }], ctx()), { fail: "unanswered" });
  eq(resolveHeld([samHeld], "nope" as unknown as HeldAnswer[], ctx()), { fail: "bad_answer" });
});

Deno.test("someone new: only the name the note gave, created once", () => {
  const maya: HeldItem = {
    ...samHeld, statement: "Maya graduated in 2024", kind: "milestone", new_person_name: "Maya", flags: ["new_person"],
    detail: { milestone_type: "other", anniversary: false, date: "2024-01-01", date_end: "2024-12-31", date_precision: "year", date_hint: "in 2024" },
    spans: [{ start: 0, end: 22, quote: "Maya graduated in 2024" }],
  };
  const mayaToo: HeldItem = { ...maya, kind: "fact", statement: "Maya lives in Oakland", detail: { category: "home" }, spans: [{ start: 24, end: 45, quote: "Maya lives in Oakland" }] };
  const r = resolveHeld([maya, mayaToo], [{ index: 0, new_person: true }, { index: 1, new_person: true }], ctx({ note: "Maya graduated in 2024. Maya lives in Oakland." }));
  if ("fail" in r) throw new Error(r.fail);
  eq(r.newPeople, [{ ref: "new:0", display_name: "Maya" }], "one Maya, not two");
  eq(r.items.map((i) => i.person_id), ["new:0", "new:0"]);
  eq(r.items[0].detail, maya.detail, "the year is kept as the user gave it");
  // Or she was someone already on the list after all.
  const mapped = resolveHeld([maya], [{ index: 0, person_id: "sarah" }], ctx());
  if ("fail" in mapped) throw new Error(mapped.fail);
  eq([mapped.items[0].person_id, mapped.newPeople], ["sarah", []]);
});

Deno.test("Sarah or Sarah's sister: the relation must be the user's own word", () => {
  const note = "Sarah's sister has surgery Thursday.";
  const held: HeldItem = {
    ...samHeld, kind: "event", person_id: "sarah", statement: "Sarah's sister has surgery Thursday", sensitivity: "health",
    detail: { event_type: "surgery", followup_policy: "both", date_precision: "day", date: "2026-10-15", date_hint: "Thursday" },
    flags: ["subject_check", "sensitive"], spans: [{ start: 0, end: 35, quote: "Sarah's sister has surgery Thursday" }],
    action: { type: "supersede", target_id: "m-old" },
  };
  const sister = resolveHeld([held], [{ index: 0, subject: "related", relation: "sister" }], ctx({ note }));
  if ("fail" in sister) throw new Error(sister.fail);
  eq([sister.items[0].subject_type, sister.items[0].related, sister.items[0].action], ["related", { id: null, relation: "sister", name: null }, { type: "new", target_id: null }],
    "a new related row; the supersede was worked out for Sarah, so it no longer applies");
  const known = resolveHeld([held], [{ index: 0, subject: "related", relation: "sister" }],
    ctx({ note, related: [{ id: "rel-sis", person_id: "sarah", relation: "sister", name: "Ana" }] }));
  if ("fail" in known) throw new Error(known.fail);
  eq(known.items[0].related, { id: "rel-sis", relation: "sister", name: "Ana" }, "the sister the user already has");
  const herself = resolveHeld([held], [{ index: 0, subject: "person" }], ctx({ note }));
  if ("fail" in herself) throw new Error(herself.fail);
  eq([herself.items[0].subject_type, herself.items[0].related, herself.items[0].action], ["person", null, { type: "supersede", target_id: "m-old" }],
    "unchanged person and subject keep the proposal; the database checks the target again");
  eq(resolveHeld([held], [{ index: 0, subject: "related", relation: "brother" }], ctx({ note })), { fail: "relation_not_in_note" });
  eq(resolveHeld([held], [{ index: 0, subject: "related", relation: "Thursday" }], ctx({ note })), { fail: "relation_not_in_note" }, "not a relation");
  eq(resolveHeld([held], [{ index: 0 }], ctx({ note })), { fail: "bad_answer" }, "the question needs an answer");
  eq(resolveHeld([held], [{ index: 0, subject: "person", person_id: "sam-lee" }], ctx({ note })), { fail: "bad_answer" }, "the person wasn't in question");
});

Deno.test("a held health event without a date: a real day, or no date", () => {
  const note = "Grandma goes in for surgery next week sometime.";
  const held: HeldItem = {
    ...samHeld, kind: "event", person_id: "sarah", statement: "Grandma has surgery", sensitivity: "health",
    detail: { event_type: "surgery", followup_policy: "both", date_precision: "unknown" },
    flags: ["date_unresolved_sensitive", "sensitive"], spans: [{ start: 0, end: 36, quote: "Grandma goes in for surgery next week" }],
  };
  const dated = resolveHeld([held], [{ index: 0, date: "2026-10-15" }], ctx({ note }));
  if ("fail" in dated) throw new Error(dated.fail);
  eq(dated.items[0].detail, { event_type: "surgery", followup_policy: "both", date_precision: "day", date: "2026-10-15" });
  const none = resolveHeld([held], [{ index: 0, date: null }], ctx({ note }));
  if ("fail" in none) throw new Error(none.fail);
  eq(none.items[0].detail, { event_type: "surgery", followup_policy: "both", date_precision: "unknown" });
  eq(resolveHeld([held], [{ index: 0, date: "2026-02-30" }], ctx({ note })), { fail: "bad_date" });
  eq(resolveHeld([held], [{ index: 0, date: "next week" }], ctx({ note })), { fail: "bad_date" });
  eq(resolveHeld([held], [{ index: 0 }], ctx({ note })), { fail: "bad_answer" });
  eq(resolveHeld([samHeld], [{ index: 0, person_id: "sam-lee", date: "2026-10-15" }], ctx()), { fail: "bad_answer" }, "no date was in question");
});

Deno.test("skipping: not remembered, and nothing else may ride along", () => {
  const r = resolveHeld([samHeld], [{ index: 0, skip: true }], ctx());
  if ("fail" in r) throw new Error(r.fail);
  eq([r.items.length, r.skipped], [0, 1]);
  eq(resolveHeld([samHeld], [{ index: 0, skip: true, person_id: "sam-lee" }], ctx()), { fail: "bad_answer" });
});

Deno.test("the same thing already remembered for the chosen person is one memory", () => {
  const existing = [
    { id: "m-kitchen", person_id: "sam-lee", kind: "thread", subject_type: "person", subject_related_id: null, statement: "Sam is redoing his kitchen", status: "active" },
    { id: "m-other", person_id: "sam-diaz", kind: "thread", subject_type: "person", subject_related_id: null, statement: "Sam is redoing his kitchen", status: "active" },
  ];
  const r = resolveHeld([samHeld], [{ index: 0, person_id: "sam-lee" }], ctx({ existing }));
  if ("fail" in r) throw new Error(r.fail);
  eq(r.items[0].action, { type: "merge", target_id: "m-kitchen" }, "the chosen Sam's, never the other Sam's");
  const resolvedTwin = resolveHeld([samHeld], [{ index: 0, person_id: "sam-lee" }], ctx({ existing: [{ ...existing[0], status: "resolved" }] }));
  if ("fail" in resolvedTwin) throw new Error(resolvedTwin.fail);
  eq(resolvedTwin.items[0].action.type, "new", "only an active memory is the same thing");
});

Deno.test("held for the user's yes: only an explicit yes writes it; a skip writes nothing", () => {
  const note = "Sarah is pregnant.";
  const held: HeldItem = {
    ...samHeld, kind: "fact", person_id: "sarah", statement: "Sarah is pregnant", sensitivity: "health", tier: "confirm",
    flags: ["sensitive"], detail: { category: "health" }, spans: [{ start: 0, end: 17, quote: "Sarah is pregnant" }],
  };
  eq(resolveHeld([held], [{ index: 0 }], ctx({ note })), { fail: "bad_answer" }, "silence is not a yes");
  eq(resolveHeld([held], [{ index: 0, accept: false }], ctx({ note })), { fail: "bad_answer" });
  eq(resolveHeld([held], [{ index: 0, skip: true, accept: true }], ctx({ note })), { fail: "bad_answer" });
  const yes = resolveHeld([held], [{ index: 0, accept: true }], ctx({ note }));
  if ("fail" in yes) throw new Error(yes.fail);
  eq(yes.items.map((i) => [i.person_id, i.statement, i.sensitivity]), [["sarah", "Sarah is pregnant", "health"]]);
  eq(resolveHeld([held], [{ index: 0, accept: true, person_id: "sam-lee" }], ctx({ note })), { fail: "bad_answer" }, "a yes can't move it");
  const no = resolveHeld([held], [{ index: 0, skip: true }], ctx({ note }));
  if ("fail" in no) throw new Error(no.fail);
  eq([no.items.length, no.skipped], [0, 1]);
  // Answering the question an item was held for is itself the user's explicit choice.
  const sam = resolveHeld([{ ...samHeld, sensitivity: "health", flags: ["person_ambiguous", "sensitive"] }], [{ index: 0, person_id: "sam-lee" }], ctx());
  if ("fail" in sam) throw new Error(sam.fail);
});

Deno.test("an ambiguous day: the user's yes keeps it, or they pick the right day", () => {
  const note = "Ben runs Chicago Sunday.";
  const held: HeldItem = {
    ...samHeld, kind: "event", person_id: "sarah", statement: "Ben runs Chicago Sunday", tier: "confirm", flags: ["date_ambiguous"],
    detail: { event_type: "race", followup_policy: "after", date: "2026-10-11", date_precision: "day", date_hint: "Sunday" },
    spans: [{ start: 0, end: 23, quote: "Ben runs Chicago Sunday" }],
  };
  const kept = resolveHeld([held], [{ index: 0, accept: true }], ctx({ note }));
  if ("fail" in kept) throw new Error(kept.fail);
  eq(kept.items[0].detail.date, "2026-10-11");
  const moved = resolveHeld([held], [{ index: 0, accept: true, date: "2026-10-18" }], ctx({ note }));
  if ("fail" in moved) throw new Error(moved.fail);
  eq([moved.items[0].detail.date, moved.items[0].detail.date_precision], ["2026-10-18", "day"]);
  eq(resolveHeld([held], [{ index: 0, accept: true, date: "Sunday" }], ctx({ note })), { fail: "bad_date" });
});

Deno.test("Gate B: once the user says who \"he\" is, the line names him", () => {
  const note = "Ben and John went to Tahoe. He wants to go back in December.";
  const he: HeldItem = {
    ...samHeld, kind: "plan", statement: "He wants to go back to Tahoe in December", detail: { firmness: "idea" },
    flags: ["pronoun_multiple"], spans: [{ start: 28, end: 59, quote: "He wants to go back in December" }],
  };
  const people = [
    { id: "ben", display_name: "Ben Oxnard", state: "active" },
    { id: "john", display_name: "John Oxnard", state: "active" },
  ];
  const r = resolveHeld([he], [{ index: 0, person_id: "john" }], ctx({ note, people }));
  if ("fail" in r) throw new Error(r.fail);
  eq(r.items[0].statement, "John wants to go back to Tahoe in December");
});

Deno.test("H20: a reading held as 'My daughter Kaiya' adds 'Kaiya', your daughter", () => {
  const note = "My daughter Kaiya and I are going to the zoo on Sunday.";
  const held: HeldItem = {
    ...samHeld, kind: "event", subject_type: "shared", statement: "You and Kaiya are going to the zoo", new_person_name: "My daughter Kaiya",
    flags: ["new_person"], detail: { event_type: "other", date: "2026-10-11", date_precision: "day" },
    spans: [{ start: 0, end: 54, quote: "My daughter Kaiya and I are going to the zoo on Sunday" }],
  };
  const r = resolveHeld([held], [{ index: 0, new_person: true }], ctx({ note }));
  if ("fail" in r) throw new Error(r.fail);
  eq(r.newPeople.map((p) => [p.display_name, p.relationship_label]), [["Kaiya", "daughter"]]);
});
