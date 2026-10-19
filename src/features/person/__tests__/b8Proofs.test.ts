// Phase 4B B8 (brief §3, §4, §11, §12; founder CC-17 to CC-20) through the
// product's real code: the gateway's pipeline (residence.ts, relate.ts,
// threads.ts, the taxonomy's inputs), the write rules, sync, and What
// Kinship knows read by recordFor and placed by recordSections. Only the
// model's reply is written by hand. The B8 acceptance matrix: the sections
// and their order; the composed residence first in Background; Before only
// on recorded evidence of a change, with Undo, a correction, a plain
// replacement and a legacy supersession; Not this and an edit on members;
// related people, several people, a sensitive line; empty sections and
// source access.
import { sectionsFor } from "@/features/person/recordSections";
import type { RecordLine } from "@/features/person/PersonRecordView";
import { recordFor } from "@/hooks/useV2";
import { A, done, home, kept, pick, serverLine, tell, world, type World } from "@/test-utils/residenceWorld";
import type { ExtractionInput, ModelProposal, ProposedDetail, ProposedItem } from "../../../../supabase/functions/_shared/extraction/types";

type Say = Omit<Partial<ProposedItem>, "detail" | "existing"> & {
  statement: string;
  personId?: string;
  /** Others in People the line is also about. */
  withIds?: string[];
  detail?: Partial<ProposedDetail>;
  /** The model's relation to an existing line, named by its statement (the dossier key is looked up). */
  existing?: { action: ProposedItem["existing"]["action"]; statement: string | null };
};

/** A correct model's reply for any kind of line about Susan (or someone else). */
function say(w: World, over: Say) {
  return (i: ExtractionInput): ModelProposal => {
    const pid = over.personId ?? w.susan.id;
    const name = pid === w.dana.id ? "Dana" : "Susan";
    const { personId: _p, withIds, existing, ...rest } = over;
    return {
      needs_clarification: null,
      items: [{
        kind: "fact", person: i.roster.find((r) => r.id === pid)!.key, person_mention: name, subject: "person",
        related_relation: null, related_name: null, evidence: [over.statement], certainty: "stated", sensitivity: "none",
        confidence: 0.95, date_text: null, date_direction: "past",
        detail: {
          event_type: null, event_goal: null, category: "other", attribute: null, value: null, firmness: null, topic: null, place: null,
          milestone_type: null, recurrence: null, anchor: null, aspect: null, time_of_day: null, ...(over.detail ?? {}),
        },
        existing: existing
          ? { action: existing.action, target: existing.statement ? i.dossier.find((d) => d.statement === existing.statement)?.key ?? null : null }
          : { action: "new", target: null },
        ...(withIds ? { with_person_keys: withIds.map((id) => i.roster.find((r) => r.id === id)!.key) } : {}),
        ...rest,
      } as ProposedItem],
    };
  };
}

async function told(w: World, note: string, over: Parameters<typeof say>[1]): Promise<string> {
  const t = await tell(w, note, say(w, over));
  await done(w, t.id);
  return t.id;
}

async function page(w: World, personId = w.susan.id) {
  const r = await recordFor(w.repos, personId, new Date(w.server.clock));
  const trail = false;
  return { ...r, sections: sectionsFor({ lines: r.lines, history: r.history, trail }) };
}
/** The page as the user reads it: each section's heading, then its rows as shown (a heading over a group once). */
const read = (sections: ReturnType<typeof sectionsFor>) =>
  sections.map((s) => [s.label, s.rows.flatMap((r, i) => [...(r.under && r.under !== s.rows[i - 1]?.under ? [`— ${r.under}`] : []), r.composed ? r.composed.text : r.display ?? r.line.statement])]);
const findRow = (lines: RecordLine[], statement: string) => lines.find((l) => l.line.statement === statement || l.composed?.text === statement || l.display === statement)!;

async function twoNotes(w: World) {
  const cal = await kept(w, "Susan lives in California.", "Susan lives in California");
  w.server.clock += 36 * 3600 * 1000;
  const ala = await kept(w, "Susan lives in Alameda.", "Susan lives in Alameda");
  return { cal, ala, alameda: String((await serverLine(w, "Susan lives in Alameda")).id), california: String((await serverLine(w, "Susan lives in California")).id) };
}

describe("B8: the sections (brief §4)", () => {
  it("(1) the approved order, the residence composed and first in Background, the leading name dropped, verbs kept; empty sections absent", async () => {
    const w = await world();
    await told(w, "Susan works at Meta.", { statement: "Susan works at Meta", detail: { category: "work" } });
    await twoNotes(w);
    await told(w, "Susan loves pottery.", { statement: "Susan loves pottery", detail: { category: "interest" } });
    await told(w, "Susan doesn't like skiing.", { statement: "Susan doesn't like skiing", detail: { category: "preference" } });
    await told(w, "Susan wants to visit Japan.", { statement: "Susan wants to visit Japan", detail: { category: "other" } });
    await told(w, "Susan is going to Japan in March.", { statement: "Susan is going to Japan in March", kind: "plan", date_text: "in March", date_direction: "future", detail: { firmness: "intended" } });
    await told(w, "Susan graduated from Berkeley.", { statement: "Susan graduated from Berkeley", detail: { category: "other" } });
    await told(w, "You and Susan take an annual ski trip.", { statement: "You and Susan take an annual ski trip", kind: "tradition", subject: "shared", person_mention: null });
    const { sections, history } = await page(w);
    expect(read(sections)).toEqual([
      ["Background", ["Lives in Alameda, California", "Works at Meta", "Graduated from Berkeley"]],
      ["Into", ["Doesn't like skiing", "Loves pottery"]],
      ["Hoping to", ["Wants to visit Japan"]],
      ["Plans", ["Is going to Japan in March"]],
      ["Between you", ["You and Susan take an annual ski trip"]],
    ]);
    expect(history).toEqual([]);
    // Every line keeps its own words for Edit and the Source view, its provenance and its note.
    const { lines } = await page(w);
    const meta = findRow(lines, "Works at Meta");
    expect(meta.line.statement).toBe("Susan works at Meta");
    expect(meta.provenance).toMatch(/^You told Kinship · Oct \d+$/u);
    expect(meta.noteId).toBeTruthy();
    // Nothing the page says names the machinery, counts or prompts.
    const said = [...read(sections).flatMap(([, rows]) => rows), ...lines.map((l) => l.provenance), ...history.map((h) => h.provenance)].join(" ");
    expect(said).not.toMatch(/region:|city:|country:|places-20|compose\/v|residence\/v|dataset|\b\d+ (?:memories|items|lines)\b|complete|%|score/iu);
  });

  it("(2) nothing told: no sections; one line: one section", async () => {
    const w = await world();
    expect((await page(w)).sections).toEqual([]);
    await told(w, "Susan loves pottery.", { statement: "Susan loves pottery", detail: { category: "interest" } });
    expect(read((await page(w)).sections)).toEqual([["Into", ["Loves pottery"]]]);
  });

  it("(3) Their people: a related person's lines under who they are; a memory shared with someone in People; never across pages", async () => {
    const w = await world();
    const t = await tell(w, "Susan's sister Michelle lives in Alameda.", (i) => {
      const p = home(w, "Susan's sister Michelle lives in Alameda")(i);
      p.items[0] = { ...p.items[0], subject: "related", related_relation: "sister", related_name: "Michelle", person_mention: null };
      return p;
    });
    await done(w, t.id);
    await told(w, "Susan and Dana went to Tahoe.", { statement: "Susan and Dana went to Tahoe", withIds: [w.dana.id] });
    await told(w, "Susan lives in California.", { statement: "Susan lives in California", detail: { category: "home" } });
    const { sections } = await page(w);
    expect(read(sections)).toEqual([
      ["Background", ["Lives in California"]],
      ["Their people", ["— Michelle · sister", "Susan's sister Michelle lives in Alameda", "Susan and Dana went to Tahoe"]],
    ]);
    // The sister's residence never composes with Susan's, and the shared line reads on Dana's page too (hers to see, under Their people).
    expect(read((await page(w, w.dana.id)).sections)).toEqual([["Their people", ["Susan and Dana went to Tahoe"]]]);
  });

  it("(4) a sensitive line sits in its topical section once kept, and never becomes history", async () => {
    const w = await world();
    const t = await tell(w, "Susan's knee has been bothering her.", say(w, { statement: "Susan's knee has been bothering her", sensitivity: "health", detail: { category: "health" } }));
    expect(t.review.questions.map((q) => q.type)).toEqual(["keep"]);
    await pick(w, t.id, "Remember");
    expect(read((await page(w)).sections)).toEqual([["Background", ["Susan's knee has been bothering her"]]]);
    // Better now: the old line is replaced as completed; a health chain is never Before.
    const better = await tell(w, "Susan's knee is better now.", say(w, { statement: "Susan's knee is better now", sensitivity: "health", detail: { category: "health" }, existing: { action: "supersede", statement: "Susan's knee has been bothering her" } }));
    await pick(w, better.id, "Remember");
    const after = await page(w);
    expect(read(after.sections)).toEqual([["Background", ["Susan's knee is better now"]]]);
    expect(after.history).toEqual([]);
  });
});

describe("B8: Before, under CC-20 (brief §11)", () => {
  it("(5) California → Alameda → 'moved to Colorado': 'Previously lived in Alameda, California', dated by the move, opening that note; Undo restores the composed line and clears Before", async () => {
    const w = await world();
    const { alameda, california } = await twoNotes(w);
    w.server.clock += 24 * 3600 * 1000;
    const colorado = await kept(w, "Susan moved to Colorado.", "Susan moved to Colorado");
    const closed = await page(w);
    expect(read(closed.sections)).toEqual([["Background", ["Moved to Colorado", "— Before", "Previously lived in Alameda, California"]]]);
    const before = closed.history[0];
    expect(before.composed!.memberIds).toEqual([alameda, california]);
    expect(before.provenance).toMatch(/^You told Kinship · Oct \d+$/u);
    expect(before.noteId).toBe(colorado);
    expect(before.history).toEqual({ when: null });
    // The current line still says what it replaced (H23), and the members are still the memory.
    expect(closed.lines[0].line.replaces).toEqual(["Susan lives in Alameda", "Susan lives in California"]);
    await w.understanding.undo(colorado);
    await w.understanding.run();
    await w.engine.sync();
    const back = await page(w);
    expect(read(back.sections)).toEqual([["Background", ["Lives in Alameda, California"]]]);
    expect(back.history).toEqual([]);
  });

  it("(5b) 'Not this' on the closer in What Kinship knows does the same", async () => {
    const w = await world();
    await twoNotes(w);
    await kept(w, "Susan moved to Colorado.", "Susan moved to Colorado");
    const closer = String((await serverLine(w, "Susan moved to Colorado")).id);
    await w.understanding.reject(closer);
    await w.engine.sync();
    const back = await page(w);
    expect(read(back.sections)).toEqual([["Background", ["Lives in Alameda, California"]]]);
    expect(back.history).toEqual([]);
  });

  it("(6) Alameda → 'lives in Colorado' with no cue: Colorado current, nothing under Before", async () => {
    const w = await world();
    await kept(w, "Susan lives in Alameda.", "Susan lives in Alameda");
    await kept(w, "Susan lives in Colorado.", "Susan lives in Colorado");
    const p = await page(w);
    expect(read(p.sections)).toEqual([["Background", ["Lives in Colorado"]]]);
    expect(p.history).toEqual([]);
    expect(JSON.stringify(p)).not.toMatch(/Previously|Before/u);
  });

  it("(7) a correction: 'Actually … Oakland, not Alameda' leaves no history", async () => {
    const w = await world();
    await twoNotes(w);
    await kept(w, "Actually Susan lives in Oakland, not Alameda.", "Susan lives in Oakland", { evidence: "Actually Susan lives in Oakland, not Alameda" });
    const p = await page(w);
    expect(read(p.sections)).toEqual([["Background", ["Lives in Oakland, California"]]]);
    expect(p.history).toEqual([]);
  });

  it("(8) 'moved to Oakland' closes Alameda alone: 'Previously lived in Alameda' beside 'Lives in Oakland, California'", async () => {
    const w = await world();
    await twoNotes(w);
    await kept(w, "Susan moved to Oakland.", "Susan moved to Oakland");
    const p = await page(w);
    expect(read(p.sections)).toEqual([["Background", ["Lives in Oakland, California", "— Before", "Previously lived in Alameda"]]]);
    expect(p.history[0].composed).toBeUndefined();
    expect(p.history[0].line.statement).toBe("Susan lives in Alameda");
  });

  it("(9) two moves: each change is its own Before line, the newest change first", async () => {
    const w = await world();
    await kept(w, "Susan lives in Alameda.", "Susan lives in Alameda");
    w.server.clock += 24 * 3600 * 1000;
    await kept(w, "Susan moved to Oakland.", "Susan moved to Oakland");
    w.server.clock += 24 * 3600 * 1000;
    await kept(w, "Susan moved to Colorado.", "Susan moved to Colorado");
    const p = await page(w);
    expect(read(p.sections)).toEqual([["Background", ["Moved to Colorado", "— Before", "Previously lived in Oakland", "Previously lived in Alameda"]]]);
    expect(p.history.map((h) => h.provenance)).toEqual([expect.stringMatching(/^You told Kinship · Oct \d+$/u), expect.stringMatching(/^You told Kinship · Oct \d+$/u)]);
    expect(p.history[0].provenance >= p.history[1].provenance).toBe(true);
  });

  it("(10) 'Not this' on a Before line removes it and leaves the current line; an edit on a member reads it again", async () => {
    const w = await world();
    const { alameda, california } = await twoNotes(w);
    await kept(w, "Susan moved to Colorado.", "Susan moved to Colorado");
    await w.understanding.reject(california);
    await w.engine.sync();
    let p = await page(w);
    expect(read(p.sections)).toEqual([["Background", ["Moved to Colorado", "— Before", "Previously lived in Alameda"]]]);
    // Editing the remaining member's words: its reading is read again, and Before follows its own words.
    await w.understanding.correct(alameda, { statement: "Susan lives in Oakland" });
    await w.understanding.run();
    await w.engine.sync();
    p = await page(w);
    expect(read(p.sections)[0][1]).toEqual(["Moved to Colorado", "— Before", expect.stringMatching(/^(Previously lived in Oakland|Susan lives in Oakland)$/u)]);
    await w.understanding.reject(alameda);
    await w.engine.sync();
    p = await page(w);
    expect(read(p.sections)).toEqual([["Background", ["Moved to Colorado"]]]);
    expect(p.history).toEqual([]);
  });

  it("(11) a legacy supersession with no transition recorded is never Before", async () => {
    const w = await world();
    await kept(w, "Susan lives in Alameda.", "Susan lives in Alameda");
    w.server.clock += 24 * 3600 * 1000;
    await kept(w, "Susan moved to Colorado.", "Susan moved to Colorado");
    // As a line told before 4B would be: the closer records nothing.
    const closer = await serverLine(w, "Susan moved to Colorado");
    const detail = { ...(closer.detail as Record<string, unknown>) };
    delete detail.transition;
    w.server.serverWrite("memory_items", String(closer.id), A, { detail });
    await w.engine.sync();
    const p = await page(w);
    expect(read(p.sections)).toEqual([["Background", ["Moved to Colorado"]]]);
    expect(p.history).toEqual([]);
  });

  it("(12) a life thread that ended is Before in its own words; one in progress, or a resolved thread, is not", async () => {
    const w = await world();
    await told(w, "Susan is interviewing at Stripe.", { statement: "Susan is interviewing at Stripe", kind: "thread", detail: { topic: "Stripe" } });
    w.server.clock += 24 * 3600 * 1000;
    await told(w, "Susan got the job at Stripe.", { statement: "Susan got the job at Stripe", detail: { category: "work" }, existing: { action: "resolves", statement: "Susan is interviewing at Stripe" } });
    const p = await page(w);
    const thread = await serverLine(w, "Susan is interviewing at Stripe");
    expect(thread.status).toBe("superseded");
    expect(read(p.sections)).toEqual([["Background", ["Got the job at Stripe", "— Before", "Susan is interviewing at Stripe"]]]);
    expect(p.history[0].history).toEqual({ when: null });
    expect(p.history[0].provenance).toMatch(/^You told Kinship · Oct \d+$/u);
    // Progress is never history: "getting better" closes nothing as an ending.
    const d = await world();
    await told(d, "Dana is training for a marathon.", { statement: "Dana is training for a marathon", kind: "thread", personId: d.dana.id, detail: { topic: "marathon" } });
    await told(d, "Dana's training is getting better.", { statement: "Dana's training is getting better", kind: "thread", personId: d.dana.id, detail: { topic: "marathon" }, existing: { action: "supersede", statement: "Dana is training for a marathon" } });
    const dp = await page(d, d.dana.id);
    expect((await serverLine(d, "Dana is training for a marathon")).status).toBe("superseded");
    expect(read(dp.sections)).toEqual([["Background", ["Dana's training is getting better"]]]);
    expect(dp.history).toEqual([]);
  });

  it("(13) never across people: Dana's history never reaches Susan's page", async () => {
    const w = await world();
    await kept(w, "Dana lives in Alameda.", "Dana lives in Alameda", { person: w.dana.id });
    w.server.clock += 24 * 3600 * 1000;
    await kept(w, "Dana moved to Colorado.", "Dana moved to Colorado", { person: w.dana.id });
    await kept(w, "Susan lives in California.", "Susan lives in California");
    expect(read((await page(w)).sections)).toEqual([["Background", ["Lives in California"]]]);
    expect(read((await page(w, w.dana.id)).sections)).toEqual([["Background", ["Moved to Colorado", "— Before", "Previously lived in Alameda"]]]);
  });
});
