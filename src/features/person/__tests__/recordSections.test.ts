// Phase 4B B8 (brief §3, §4, §11; founder CC-17 to CC-20): the pure rules of
// What Kinship knows' sections: where a line sits, the order of the sections
// and of Background inside, the leading-name display rule, Their people's
// headings, Before's eligibility and dates. Nothing here changes a line.
import { BEFORE_LABEL, historyKind, historyProvenance, historyWhen, relatedHeading, sectionFor, sectionsFor, withoutLeadingName } from "@/features/person/recordSections";
import type { RecordLine } from "@/features/person/PersonRecordView";
import type { ItemLine } from "@/features/tell/reviewModel";
import type { MemoryKind } from "@/store/repositories";

const NOW = new Date("2026-10-16T12:00:00Z");
const susan = { id: "susan", display_name: "Susan" };

const mentions = (text: string, person_id = "susan") => [{ person_id, text, name: null }];

describe("B8: the leading name goes, the rest of the user's words stay (brief §4)", () => {
  const item = (statement: string, over: Record<string, unknown> = {}) => ({ person_id: "susan", person_mentions: mentions("Susan"), subject_type: "person", ...over });

  it("drops the person's name when the mention record puts it first and a lowercase word follows", () => {
    expect(withoutLeadingName("Susan works at Meta", item("Susan works at Meta"), susan)).toBe("Works at Meta");
    expect(withoutLeadingName("Susan loves pottery", item("Susan loves pottery"), susan)).toBe("Loves pottery");
    // Into keeps the verb, negation included (approved: things they like or don't).
    expect(withoutLeadingName("Susan doesn't like skiing", item(""), susan)).toBe("Doesn't like skiing");
    expect(withoutLeadingName("Susan moved to Colorado", item(""), susan)).toBe("Moved to Colorado");
  });

  it("leaves 'and' / 'or', a possessive, a capitalised word, or a name elsewhere unchanged", () => {
    expect(withoutLeadingName("Susan and Mike live in Alameda", item(""), susan)).toBeNull();
    expect(withoutLeadingName("Susan or Mike will call", item(""), susan)).toBeNull();
    expect(withoutLeadingName("Susan's sister lives in Alameda", item(""), susan)).toBeNull();
    expect(withoutLeadingName("Susan Oxnard works at Meta", item(""), susan)).toBeNull();
    expect(withoutLeadingName("Ben and Susan went to Tahoe", item("", { person_mentions: [{ person_id: "ben", text: "Ben", name: null }, ...mentions("Susan")] }), susan)).toBeNull();
    expect(withoutLeadingName("Susan", item(""), susan)).toBeNull();
  });

  it("fires only on the line's own mention record: no record (an older line), another person first, or no person", () => {
    expect(withoutLeadingName("Susan works at Meta", item("", { person_mentions: null }), susan)).toBeNull();
    expect(withoutLeadingName("Susan works at Meta", item("", { person_mentions: [] }), susan)).toBeNull();
    expect(withoutLeadingName("Susan works at Meta", item("", { person_mentions: mentions("Susan", "dana") }), susan)).toBeNull();
    expect(withoutLeadingName("Susan works at Meta", item(""), null)).toBeNull();
    // A line about a related person or about the user never changes.
    expect(withoutLeadingName("Susan works at Meta", item("", { subject_type: "related" }), susan)).toBeNull();
    expect(withoutLeadingName("Susan works at Meta", item("", { subject_type: "user" }), susan)).toBeNull();
  });

  it("reads the name as the line shows it now: the recorded words, or the name they go by (founder I12)", () => {
    // Recorded as "Wifey", shown as "Loo Loo" (voiced): the shown name goes.
    const looLoo = { id: "susan", display_name: "Loo Loo" };
    expect(withoutLeadingName("Loo Loo got promoted", item("", { person_mentions: mentions("Wifey") }), looLoo)).toBe("Got promoted");
    // The user's own word under the current name stays the recorded words ("Liz" while she is Elizabeth Chen): still first.
    const liz = { id: "susan", display_name: "Elizabeth Chen", full_name: "Elizabeth Chen" };
    expect(withoutLeadingName("Liz got promoted", item("", { person_mentions: [{ person_id: "susan", text: "Liz", name: "Elizabeth Chen" }] }), liz)).toBe("Got promoted");
    // A chosen name of several words, whole (founder I12).
    const cutie = { id: "susan", display_name: "Cutie Pie", nicknames: ["Cutie Pie"] };
    expect(withoutLeadingName("Cutie Pie loves pottery", item("", { person_mentions: mentions("Cutie Pie") }), cutie)).toBe("Loves pottery");
  });
});

describe("B8: where a line sits (B1's closed taxonomy; brief §3)", () => {
  const fact = (statement: string, category: string, over: Record<string, unknown> = {}) =>
    ({ kind: "fact", statement, subject_type: "person", certainty: "stated", user_state: "unreviewed", detail: { category }, with_person_ids: [], ...over });

  it("the founder's boundaries: Hoping to is semantic, Into keeps negation, ordinary plans are Plans", () => {
    expect(sectionFor(fact("Susan wants to learn pottery", "interest"), ["Susan wants to learn pottery"])).toEqual({ category: "aspiration", section: "hoping_to" });
    expect(sectionFor(fact("Susan loves pottery", "interest"), ["Susan loves pottery"])).toEqual({ category: "interest", section: "into" });
    expect(sectionFor(fact("Susan doesn't like skiing", "preference"), ["Susan doesn't like skiing"])).toEqual({ category: "preference", section: "into" });
    expect(sectionFor(fact("Susan doesn't want to ski this year", "other"), ["Susan doesn't want to ski this year"]).section).toBe("background");
    expect(sectionFor({ kind: "plan", statement: "Susan is going to Japan in March", subject_type: "person", detail: { firmness: "intended" } }, ["Susan is going to Japan in March"]))
      .toEqual({ category: "plan", section: "plans" });
    expect(sectionFor(fact("Susan works at Meta", "work"), ["Susan works at Meta"])).toEqual({ category: "work", section: "background" });
    expect(sectionFor(fact("Susan graduated from Berkeley", "other"), ["Susan graduated from Berkeley"])).toEqual({ category: "education", section: "background" });
    expect(sectionFor(fact("Susan lives in Alameda", "home"), ["Susan lives in Alameda"])).toEqual({ category: "residence", section: "background" });
    expect(sectionFor(fact("Michelle is Susan's sister", "family"), ["Michelle is Susan's sister"])).toEqual({ category: "their_people", section: "their_people" });
    expect(sectionFor(fact("Susan's sister lives in Alameda", "home", { subject_type: "related" }), [])).toEqual({ category: "their_people", section: "their_people" });
    expect(sectionFor(fact("Susan and Ben went to Tahoe", "other", { with_person_ids: ["ben"] }), [])).toEqual({ category: "their_people", section: "their_people" });
    expect(sectionFor({ kind: "tradition", statement: "You and Susan take an annual ski trip", subject_type: "shared", detail: {} }, [])).toEqual({ category: "between_you", section: "between_you" });
    expect(sectionFor({ kind: "promise", statement: "Send Susan the recipe", subject_type: "user", detail: {} }, [])).toEqual({ category: "between_you", section: "between_you" });
    // Health stays in its topical section; sensitivity is never a heading.
    expect(sectionFor(fact("Susan's knee is better", "health", { sensitivity: "health" }), []).section).toBe("background");
  });
});

describe("B8: Their people's headings", () => {
  it("'Michelle · sister'; the relation alone when the note gave no name", () => {
    expect(relatedHeading({ name: "Michelle", relation: "sister" })).toBe("Michelle · sister");
    expect(relatedHeading({ name: null, relation: "sister" })).toBe("Sister");
    expect(relatedHeading({ name: "Fluffy", relation: "dog" })).toBe("Fluffy · dog");
  });
});

describe("B8: Before, conservatively (brief §11; CC-20)", () => {
  const closed = (kind: MemoryKind = "fact", over: Record<string, unknown> = {}) => ({ kind, status: "superseded", deleted_at: null, sensitivity: "none", ...over });

  it("only when every live closer records a change, and the line is durable", () => {
    expect(historyKind(closed(), "residence", [{ transition: "changed" }])).toBe("residence");
    expect(historyKind(closed(), "work", [{ transition: "changed" }])).toBe("work");
    expect(historyKind(closed("thread"), "other", [{ transition: "completed" }])).toBe("thread");
    expect(historyKind(closed("thread"), "other", [{ transition: "cancelled" }])).toBe("thread");
    // Two closers, both a change: history. One a change, one not: never.
    expect(historyKind(closed(), "residence", [{ transition: "changed" }, { transition: "changed" }])).toBe("residence");
    expect(historyKind(closed(), "residence", [{ transition: "changed" }, { transition: "corrected" }])).toBeNull();
  });

  it("never from a correction, a plain replacement, progress, no closer, a pre-4B supersession, a refinement", () => {
    expect(historyKind(closed(), "residence", [{ transition: "corrected" }])).toBeNull();
    expect(historyKind(closed(), "residence", [{}])).toBeNull();
    expect(historyKind(closed(), "residence", [{ transition: null }])).toBeNull();
    expect(historyKind(closed("thread"), "other", [{ transition: "progress" }])).toBeNull();
    expect(historyKind(closed(), "residence", [])).toBeNull();
    // A refinement is never superseded, so it is never history; an active or retracted line neither.
    expect(historyKind(closed("fact", { status: "active" }), "residence", [{ transition: "changed" }])).toBeNull();
    expect(historyKind(closed("fact", { status: "retracted" }), "residence", [{ transition: "changed" }])).toBeNull();
    expect(historyKind(closed("fact", { deleted_at: "2026-10-01T00:00:00Z" }), "residence", [{ transition: "changed" }])).toBeNull();
  });

  it("never a sensitive line, never a health or progress chain, never an interest, plan or event", () => {
    expect(historyKind(closed("fact", { sensitivity: "health" }), "other", [{ transition: "completed" }])).toBeNull();
    expect(historyKind(closed("fact", { sensitivity: "health" }), "residence", [{ transition: "changed" }])).toBeNull();
    expect(historyKind(closed(), "other", [{ transition: "changed" }])).toBeNull();
    expect(historyKind(closed(), "interest", [{ transition: "changed" }])).toBeNull();
    expect(historyKind(closed("plan"), "plan", [{ transition: "cancelled" }])).toBeNull();
    expect(historyKind(closed("event"), "plan", [{ transition: "cancelled" }])).toBeNull();
    // A thread closed as "changed" (not an ending) isn't an ended thread.
    expect(historyKind(closed("thread"), "other", [{ transition: "changed" }])).toBeNull();
  });

  it("is dated by the note that told the change, and 'Moved · Jan 4' only when it gives the day", () => {
    expect(historyProvenance("2026-10-09T15:00:00Z", NOW)).toBe("You told Kinship · Oct 9");
    expect(historyProvenance("2025-01-04T15:00:00Z", NOW)).toBe("You told Kinship · Jan 4, 2025");
    const moved = (detail: Record<string, unknown>) => ({ statement: "Susan moved to Colorado on Jan 4", detail });
    expect(historyWhen("residence", moved({ date: "2026-01-04", date_precision: "day" }), NOW)).toBe("Moved · Jan 4");
    expect(historyWhen("residence", moved({ date: "2026-01-01", date_precision: "month" }), NOW)).toBe("Moved · January");
    expect(historyWhen("residence", moved({ date: "2025-01-01", date_precision: "month" }), NOW)).toBe("Moved · January 2025");
    expect(historyWhen("residence", { statement: "Susan now lives in Colorado", detail: { date: "2026-01-04", date_precision: "day" } }, NOW)).toBe("Moved · Jan 4");
    // A year, a season, a range or no date: nothing (never valid_to, never "Updated").
    expect(historyWhen("residence", moved({ date: "2026-01-01", date_precision: "year" }), NOW)).toBeNull();
    expect(historyWhen("residence", moved({ date: "2026-06-01", date_precision: "season" }), NOW)).toBeNull();
    expect(historyWhen("residence", moved({}), NOW)).toBeNull();
    expect(historyWhen("residence", moved({ valid_to: "2026-10-09" }), NOW)).toBeNull();
    // A residence closer whose words don't say a move ("lives in California since March", closed by the user's
    // "Susan moved"): its date is not the move's.
    expect(historyWhen("residence", { statement: "Susan lives in California since March", detail: { date: "2026-03-01", date_precision: "month" } }, NOW)).toBeNull();
  });

  it("never claims when a job or a thread ended: a closing note's date is the new state's (review of PR #56)", () => {
    // "Susan got the job at Google on Jan 4" dates the new job, not Meta's end.
    expect(historyWhen("work", { statement: "Susan got the job at Google on Jan 4", detail: { date: "2026-01-04", date_precision: "day" } }, NOW)).toBeNull();
    expect(historyWhen("work", { statement: "Susan started at Google in January", detail: { date: "2026-01-01", date_precision: "month" } }, NOW)).toBeNull();
    expect(historyWhen("thread", { statement: "Susan got the job at Stripe on Oct 6", detail: { date: "2026-10-06", date_precision: "day" } }, NOW)).toBeNull();
    expect(historyWhen("thread", { statement: "The wedding was called off on Oct 6", detail: { date: "2026-10-06", date_precision: "day" } }, NOW)).toBeNull();
    expect(historyWhen("work", { statement: "Susan left Meta on Jan 4", detail: { date: "2026-01-04", date_precision: "day" } }, NOW)).toBeNull();
  });
});

describe("B8: the sections, in order, empty ones gone", () => {
  const line = (id: string, statement: string, section: RecordLine["section"], over: Partial<RecordLine> = {}): RecordLine => ({
    line: { id, statement, person: null, about: null, also: [], replaces: [], when: null, kind: { value: "fact", label: "Something to remember", changeable: true }, edited: false } as ItemLine,
    provenance: "You told Kinship · Oct 2", noteId: `n-${id}`, conflict: null, section, ...over,
  });

  it("Background · Into · Hoping to · Plans · Their people · Between you, each only when it has a line", () => {
    const all = sectionsFor({
      lines: [
        line("b", "You and Susan ski", "between_you"), line("t", "Susan's sister lives in Alameda", "their_people"), line("p", "Susan is going to Japan", "plans"),
        line("h", "Susan wants to learn pottery", "hoping_to"), line("i", "Susan loves pottery", "into"), line("w", "Susan works at Meta", "background", { category: "work" }),
      ],
    });
    expect(all.map((s) => [s.key, s.label])).toEqual([
      ["background", "Background"], ["into", "Into"], ["hoping_to", "Hoping to"], ["plans", "Plans"], ["their_people", "Their people"], ["between_you", "Between you"],
    ]);
    expect(sectionsFor({ lines: [line("i", "Susan loves pottery", "into")] }).map((s) => s.key)).toEqual(["into"]);
    expect(sectionsFor({ lines: [] })).toEqual([]);
    // Between you shows for the conversations alone.
    expect(sectionsFor({ lines: [], trail: true }).map((s) => [s.key, s.rows.length])).toEqual([["between_you", 0]]);
  });

  it("Background: the residence first, then work, education, the rest, each newest first; then Before", () => {
    const rows = sectionsFor({
      lines: [
        line("o2", "Susan mentioned the fence", "background", { category: "other" }),
        line("e", "Susan graduated from Berkeley", "background", { category: "education" }),
        line("w2", "Susan was promoted", "background", { category: "work" }),
        line("o1", "Susan had a rough week", "background", { category: "other" }),
        line("r", "Lives in Alameda, California", "background", { category: "residence" }),
        line("w1", "Susan works at Meta", "background", { category: "work" }),
      ],
      history: [line("x", "Susan lives in Colorado", "background", { category: "residence", display: "Previously lived in Colorado", history: { when: null } })],
    })[0].rows;
    expect(rows.map((r) => [r.line.id, r.under ?? null])).toEqual([["r", null], ["w2", null], ["w1", null], ["e", null], ["o2", null], ["o1", null], ["x", BEFORE_LABEL]]);
  });

  it("Their people: each related person's lines under who they are, then the rest, newest first", () => {
    const rows = sectionsFor({
      lines: [
        line("m1", "Michelle is Susan's sister", "their_people"),
        line("s1", "Susan's sister lives in Alameda", "their_people", { under: "Michelle · sister" }),
        line("d1", "Susan's dog Fluffy is twelve", "their_people", { under: "Fluffy · dog" }),
        line("s2", "Susan's sister works at Box", "their_people", { under: "Michelle · sister" }),
        line("t1", "Susan and Ben went to Tahoe", "their_people"),
      ],
    })[0].rows;
    expect(rows.map((r) => [r.line.id, r.under ?? null])).toEqual([
      ["s1", "Michelle · sister"], ["s2", "Michelle · sister"], ["d1", "Fluffy · dog"], ["m1", null], ["t1", null],
    ]);
  });

  it("never adds, drops or reorders a line beyond that; a line with no section is Background (fail open)", () => {
    const lines = [line("a", "A", undefined), line("b", "B", "into"), line("c", "C", undefined)];
    const out = sectionsFor({ lines });
    expect(out.flatMap((s) => s.rows.map((r) => r.line.id)).sort()).toEqual(["a", "b", "c"]);
    expect(out.map((s) => [s.key, s.rows.map((r) => r.line.id)])).toEqual([["background", ["a", "c"]], ["into", ["b"]]]);
    // The rows are the same objects: nothing about a line changes by being placed.
    expect(out[1].rows[0]).toBe(lines[1]);
  });
});
