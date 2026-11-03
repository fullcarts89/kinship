// From Today's model to the deck's words (PR #77 §2). Pure and deterministic: the poster says what the
// Moment already says; the cards are exactly the quiet lines the existing rules let through, questions
// first, then the end card. Nothing is added, ranked or invented.
import { dayLabel } from "@/features/memory/format";
import { relativeDay, type MomentView, type QuietView } from "../todayModel";
import type { DeckCardData, PosterData } from "./DeckParts";

/** "Yesterday · Sun, Nov 1", "Saturday · Sat, Nov 7", or just the date when that's all there is to say. */
export function whenChip(day: string, today: string): string {
  const rel = relativeDay(day, today);
  const date = dayLabel(day, today);
  return rel === date ? date : `${rel} · ${date}`;
}

const norm = (s: string) => s.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/** The poster's words for the Moment Today selected. */
export function posterFor(m: MomentView, today: string): PosterData {
  const memory = m.memory && !norm(m.statement).includes(norm(m.memory)) && norm(m.memory) !== norm(m.statement) ? m.memory : null;
  const contacts = !!m.provenance && /^from contacts/iu.test(m.provenance);
  return {
    personId: m.personId,
    personName: m.personName,
    when: m.day && !m.toldDay ? whenChip(m.day, today) : m.type === "birthday" ? "Today" : null,
    headline: m.statement,
    memory,
    // Kinship's sentence about what they hoped (hopeLine), never dressed as the user's quote.
    hope: m.hope ?? null,
    source: m.provenance ?? (m.type === "birthday" ? "From Contacts" : null),
    sourceKind: contacts || m.type === "birthday" ? "contacts" : "note",
    primary: m.primary.label,
    promise: m.type === "promise" && !!m.itemId,
  };
}

const ASKS = new Set(["question", "look", "understanding"]);

/**
 * The deck's cards from Today's quiet lines, in the model's own order with what waits on the user first
 * ("A question" always leads), "and N more" folded until opened, then the end card.
 */
export interface DeckEntry { card: DeckCardData; q: QuietView | null }

export function deckCards(quiet: QuietView[], today: string, nameOf: (personId: string) => string | null, opts: { allComing?: boolean; firstUse?: boolean } = {}): DeckEntry[] {
  const lines = quiet.flatMap((q) => (q.kind === "more" && opts.allComing ? q.rest : [q]));
  const ordered = [...lines.filter((q) => ASKS.has(q.kind)), ...lines.filter((q) => !ASKS.has(q.kind))];
  const cards: DeckEntry[] = [];
  const push = (card: DeckCardData, q: QuietView) => cards.push({ card, q });
  ordered.forEach((q, i) => {
    const key = `${q.kind}-${i}`;
    switch (q.kind) {
      case "question":
        push({ kind: "question", key, label: q.label, text: q.text, action: q.action }, q);
        break;
      case "look":
        push({ kind: "note", key, label: q.label, text: q.text, action: q.action }, q);
        break;
      case "understanding":
        push({ kind: "note", key, label: q.label, text: q.text, action: null }, q);
        break;
      case "coming": {
        const name = nameOf(q.personId);
        if (!name) break;
        const contacts = q.itemId === null || (!!q.provenance && /^from contacts/iu.test(q.provenance));
        push({
          kind: "person", key, personId: q.personId, personName: name, when: relativeDay(q.day, today), line: q.text,
          source: contacts ? "From Contacts" : q.provenance ? "From your note" : null, sourceKind: contacts ? "contacts" : "note", yours: q.due,
        }, q);
        break;
      }
      case "waiting": {
        const name = nameOf(q.personId);
        if (!name) break;
        push({ kind: "person", key, personId: q.personId, personName: name, when: q.text, line: q.memory, source: q.provenance ? "From your note" : null, sourceKind: "note" }, q);
        break;
      }
      case "more":
        push({ kind: "more", key, text: q.text }, q);
        break;
    }
  });
  if (cards.length) cards.push({ card: { kind: "end", key: "end", first: opts.firstUse }, q: null });
  return cards;
}
