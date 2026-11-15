// What came of a Tell, read one way everywhere (CMR-1): the server's word first, this phone's row next,
// the synced row's status last. Every retained note has an outcome; only a settled one is placed.
import { declinedReading, serverUnderstanding, settled, tellOutcome, UNDERSTANDING_VALUES } from "@/store/tellOutcome";
import type { Reading, UnderstandingRow } from "@/store/understanding";

function row(state: UnderstandingRow["state"], reading: Partial<Reading> | null = null): UnderstandingRow {
  return {
    capture_id: "c1", state, answer: null, notice: null, attempts: 0, next_at: null, seen_at: null, understood_at: null, shown_at: null,
    first_request_at: null, request_at: null, server_ms: null, retries: null, created_at: "2026-11-10T09:00:00Z", updated_at: "2026-11-10T09:00:00Z",
    reading: reading ? { tier: "auto", saved: [], held: [], clarification: null, review_created_at: null, settled: true, ...reading } : null,
  };
}
const held = { statement: "x", flags: [], spans: [] } as unknown as Reading["held"][number];
const cap = (status: string, over: Record<string, unknown> = {}) => ({ status, ...over });

describe("the server's word comes first", () => {
  it("each of the gateway's words is read as itself, whatever this phone's row says", () => {
    for (const w of UNDERSTANDING_VALUES) {
      expect(tellOutcome(cap("extracted", { understanding: w }), row("waiting"))).toBe(w);
      expect(serverUnderstanding(cap("extracted", { understanding: w }))).toBe(w);
    }
  });

  it("except a question still held on this phone, which wins over the server's kept or partial (agreed with the gateway)", () => {
    const asking = row("review", { tier: "clarify", saved: [{ id: "m1", tier: "auto" }], held: [held], settled: false, review_created_at: "t" });
    expect(tellOutcome(cap("needs_review", { understanding: "kept" }), asking, 1)).toBe("held");
    expect(tellOutcome(cap("needs_review", { understanding: "partial" }), asking, 1)).toBe("held");
    // Answered (settled), the server's word stands again.
    expect(tellOutcome(cap("extracted", { understanding: "kept" }), row("review", { saved: [{ id: "m1", tier: "auto" }], settled: true }), 1)).toBe("kept");
  });

  it("null, absent or an unknown word is no word: the phone's own row decides", () => {
    expect(tellOutcome(cap("extracted", { understanding: null }), row("failed"))).toBe("failed");
    expect(tellOutcome(cap("extracted"), row("failed"))).toBe("failed");
    expect(tellOutcome(cap("extracted", { understanding: "later" }), row("failed"))).toBe("failed");
    expect(serverUnderstanding(cap("extracted", { understanding: 3 }))).toBeNull();
  });
});

describe("this phone's row", () => {
  it("waiting or answering is pending; kept (understanding off, or declined by the model) is nothing; failed is failed", () => {
    expect(tellOutcome(cap("pending"), row("waiting"))).toBe("pending");
    expect(tellOutcome(cap("needs_review"), row("answering", { tier: "clarify", held: [held], settled: false }))).toBe("pending");
    expect(tellOutcome(cap("pending"), row("kept"))).toBe("nothing");
    expect(tellOutcome(cap("pending"), row("failed"))).toBe("failed");
  });

  it("a question waiting is held; answered 'Don't keep this' with nothing saved is declined; nothing saved is nothing", () => {
    expect(tellOutcome(cap("needs_review"), row("review", { tier: "clarify", held: [held], settled: false, review_created_at: "t" }))).toBe("held");
    const skipped = row("done", { tier: "clarify", saved: [], held: [], settled: true, answered: [{ index: 0, skip: true }] });
    expect(declinedReading(skipped)).toBe(true);
    expect(tellOutcome(cap("extracted"), skipped)).toBe("declined");
    // The durable mark, once the answer itself has been checked and forgotten (afterPull).
    const marked = row("done", { tier: "clarify", saved: [], held: [], settled: true, declined: true });
    expect(declinedReading(marked)).toBe(true);
    expect(tellOutcome(cap("extracted"), marked)).toBe("declined");
    expect(tellOutcome(cap("extracted"), row("done", { tier: "nothing" }))).toBe("nothing");
    // An answer that chose someone, not "Don't keep this": not declined.
    expect(declinedReading(row("done", { tier: "clarify", saved: [{ id: "m1", tier: "confirm" }], settled: true, answered: [{ index: 0, person_id: "ben" }] }))).toBe(false);
  });

  it("lines kept are kept; with passages not got to, partial (the synced coverage first, the reply's until it syncs)", () => {
    const saved = { tier: "auto" as const, saved: [{ id: "m1", tier: "auto" as const }] };
    expect(tellOutcome(cap("extracted"), row("done", saved), 1)).toBe("kept");
    expect(tellOutcome(cap("extracted"), row("review", saved), 1)).toBe("kept");
    expect(tellOutcome(cap("extracted", { coverage: { unprocessed: [{ start: 0, end: 4 }], unlocated: 0 } }), row("done", saved), 1)).toBe("partial");
    expect(tellOutcome(cap("extracted"), row("done", { ...saved, coverage: { unprocessed: [], unlocated: 1 } }), 1)).toBe("partial");
    expect(tellOutcome(cap("extracted", { coverage: { unprocessed: [], unlocated: 0 } }), row("done", saved), 1)).toBe("kept");
    // Lines saved, since removed ("Not this" on each): the Tell is still a kept one, not "nothing".
    expect(tellOutcome(cap("extracted"), row("done", saved), 0)).toBe("kept");
  });

  it("done with no reading (Undo, or deleted elsewhere): kept if lines rest on it, else nothing", () => {
    expect(tellOutcome(cap("extracted"), row("done"), 0)).toBe("nothing");
    expect(tellOutcome(cap("extracted"), row("done"), 2)).toBe("kept");
    expect(tellOutcome(cap("extracted"), row("review"), 0)).toBe("pending");
  });
});

describe("told on another phone: the synced row's own status", () => {
  it("failed, skipped, needs_review, extracted, pending", () => {
    expect(tellOutcome(cap("failed"), null)).toBe("failed");
    expect(tellOutcome(cap("skipped"), null)).toBe("nothing");
    expect(tellOutcome(cap("skipped"), null, 1)).toBe("kept");
    expect(tellOutcome(cap("needs_review"), null)).toBe("held");
    expect(tellOutcome(cap("extracted"), null)).toBe("nothing");
    expect(tellOutcome(cap("extracted"), null, 1)).toBe("kept");
    expect(tellOutcome(cap("extracted", { coverage: { unprocessed: [{ start: 0, end: 2 }], unlocated: 0 } }), null, 1)).toBe("partial");
    expect(tellOutcome(cap("pending"), null)).toBe("pending");
    expect(tellOutcome(cap("processing"), null)).toBe("pending");
  });
});

it("only a settled note is placed on a page: pending and held wait with the question", () => {
  expect(["kept", "nothing", "partial", "declined", "failed"].every((o) => settled(o as never))).toBe(true);
  expect(settled("pending")).toBe(false);
  expect(settled("held")).toBe(false);
});
