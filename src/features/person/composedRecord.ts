// What Kinship knows says a person's residence in one line when their lines
// chain (Phase 4B B5; brief §9, §12): "Susan lives in California" and
// "Susan lives in Alameda" read as "Lives in Alameda, California". Computed
// here every time the page is read, from the lines and their mirrored
// readings; nothing is stored, and the member lines stay the memory.
//
//   provenance  the union of the members' sources, in the existing words
//               ("You told Kinship · Oct 2 · and 1 other note"); when some
//               members were edited and others not, a neutral line for the
//               whole ("From your notes · Oct 9 · one edited by you"), never
//               "Edited by you" over words the user didn't edit (founder, B5
//               review). Each member keeps its own line in the sheet
//   members     every line behind it, the most specific first, each with its
//               own words, provenance, Edit and Not this (the sheet)
//   fail open   a group that doesn't chain shows every line as today; one
//               line shows as itself. Two current lines the comparator should
//               have closed are reported content-free (compose_degraded)
//
// History (Phase 4B B8; brief §9 step 6, §11): the closed residence lines one
// note replaced, when that change may be shown (recordSections.historyKind),
// compose the same way as "Previously lived in Alameda, California", dated by
// the day the change was told; a line on its own reads "Previously lived in
// Alameda". Under the Before label of Background, never beside the current
// line as if true.
//
// Pure: the hook supplies the lines; "Not this" on a member recomposes the
// rest from the same inputs at once (withoutForgotten), never from a cached
// string.
import { type ComposeMember, composeResidence, currentResidence, residenceGroupKey } from "../../../supabase/functions/_shared/semantic/compose";
import { momentLabel, provenanceLine, type SourceFacts } from "@/features/memory/format";
import type { MemoryItem, MemorySource, ResidenceFacetRow } from "@/store/repositories";
import type { ComposedMember, ComposedRecord, RecordLine } from "./PersonRecordView";

/** One line of What Kinship knows, with what the composer needs to read it. */
export interface RecordInput {
  item: MemoryItem;
  row: RecordLine;
  sources: MemorySource[];
  facet: ResidenceFacetRow | null;
}

/** The item's fields as the composer reads them (the mirror keeps them as plain data). */
function shape(item: MemoryItem) {
  return {
    status: item.status,
    deleted_at: item.deleted_at,
    kind: item.kind,
    person_id: item.person_id,
    subject_type: typeof item.subject_type === "string" ? item.subject_type : "person",
    subject_related_id: typeof item.subject_related_id === "string" ? item.subject_related_id : null,
    certainty: item.certainty,
    sensitivity: typeof item.sensitivity === "string" ? item.sensitivity : "none",
    with_person_ids: Array.isArray(item.with_person_ids) ? item.with_person_ids : [],
  };
}

function facts(sources: readonly MemorySource[]): SourceFacts[] {
  return sources.map((s) => ({ source_kind: s.source_kind, capture_id: s.capture_id, created_at: String(s.created_at) }));
}

function newestNote(sources: readonly SourceFacts[]): string | null {
  const notes = sources.filter((s) => s.source_kind === "capture" && s.capture_id).sort((a, b) => b.created_at.localeCompare(a.created_at));
  return notes[0]?.capture_id ?? null;
}

/** The composed line's provenance when its members' sources are of different kinds (a proposal for the founder). */
export const COMPOSED_PROVENANCE = {
  from: "From your notes",
  oneEdited: "one edited by you",
  someEdited: "some edited by you",
} as const;

const edited = (m: ComposedMember) => m.sources.some((s) => s.source_kind === "user_edit");

/**
 * What the whole line can say about where it came from: the existing words
 * over the union when every member came the same way; a neutral line when
 * some members were edited and others not, dated by the newest source.
 */
export function composedProvenance(members: readonly ComposedMember[], now: Date, origin: string | null): string {
  const sources = members.flatMap((m) => m.sources);
  const some = members.filter(edited).length;
  if (some === 0 || some === members.length) return provenanceLine(sources, now, origin);
  const newest = [...sources].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  const when = newest ? ` · ${momentLabel(newest.created_at, now, false)}` : "";
  return `${COMPOSED_PROVENANCE.from}${when} · ${some === 1 ? COMPOSED_PROVENANCE.oneEdited : COMPOSED_PROVENANCE.someEdited}`;
}

/** How a closed chain is shown as history (B8): dated and sourced by the note that told the change. */
export interface HistoryRow {
  when: string | null;
  provenance: string;
  noteId: string | null;
}

/**
 * The rows for one group of members: one composed row when they chain (and
 * there are at least two), else each member's own row (fail open). As
 * history (`history`), the rows read "Previously lived in …", each member on
 * its own when they don't chain, all dated by the change.
 */
export function composedRows(members: readonly ComposedMember[], now: Date, opts: { history?: HistoryRow } = {}): { rows: RecordLine[]; degraded: boolean } {
  const byId = new Map(members.map((m) => [m.input.id, m]));
  const r = composeResidence(members.map((m) => m.input), { previous: !!opts.history });
  const rows = r.lines.map((line) => {
    const ordered = line.memberIds.map((id) => byId.get(id)!);
    const head = ordered[0];
    if (ordered.length < 2) {
      if (!opts.history) return head.row;
      // One closed line, in the composer's words, dated by the change.
      return { ...head.row, display: line.text, provenance: opts.history.provenance, noteId: opts.history.noteId, history: { when: opts.history.when }, section: "background" as const, category: "residence" as const };
    }
    const sources = ordered.flatMap((m) => m.sources);
    const record: ComposedRecord = { text: line.text, memberIds: line.memberIds, members: ordered };
    return {
      line: head.row.line,
      provenance: opts.history ? opts.history.provenance : composedProvenance(ordered, now, head.origin),
      noteId: opts.history ? opts.history.noteId : newestNote(sources),
      conflict: null,
      composed: record,
      section: "background" as const,
      category: "residence" as const,
      ...(opts.history ? { history: { when: opts.history.when } } : {}),
    };
  });
  return { rows, degraded: r.degraded };
}

/** A line's mirrored reading as the composer takes it. */
export function memberOf(x: Pick<RecordInput, "item" | "row" | "sources"> & { facet: ResidenceFacetRow }): ComposedMember {
  const f = x.facet;
  const input: ComposeMember = {
    id: x.item.id,
    facet: { value_text: f.value_text, value_norm: f.value_norm, place_ref: f.place_ref, candidates: f.candidates, usual_ref: f.usual_ref, dataset_version: f.dataset_version },
    told: String(x.item.created_at ?? ""),
  };
  return { input, row: x.row, sources: facts(x.sources), origin: typeof x.item.origin === "string" ? x.item.origin : null };
}

/**
 * The page's lines, newest first as given, with each group of current
 * residence lines that chain shown as one line where its newest member was.
 */
export function composeRecordLines(inputs: readonly RecordInput[], now: Date): { lines: RecordLine[]; degraded: number } {
  const groups = new Map<string, number[]>();
  inputs.forEach((x, i) => {
    const it = shape(x.item);
    if (!currentResidence(it, x.facet)) return;
    const key = residenceGroupKey(it);
    groups.set(key, [...(groups.get(key) ?? []), i]);
  });
  const at = new Map<number, RecordLine[]>();
  const taken = new Set<number>();
  let degraded = 0;
  for (const indexes of groups.values()) {
    if (indexes.length < 2) continue;
    const members: ComposedMember[] = indexes.map((i) => memberOf({ ...inputs[i], facet: inputs[i].facet! }));
    const { rows, degraded: d } = composedRows(members, now);
    if (d) degraded++;
    // Where the group's newest line was: its first member in page order.
    for (const i of indexes) taken.add(i);
    at.set(Math.min(...indexes), rows);
  }
  const lines: RecordLine[] = [];
  inputs.forEach((x, i) => {
    const group = at.get(i);
    if (group) lines.push(...group);
    else if (!taken.has(i)) lines.push(x.row);
  });
  return { lines, degraded };
}

/**
 * The page without the lines the user just removed (founder K14: off the
 * screen at once). A composed line loses that member and is read again from
 * the rest, in their own words; with one left, that line shows as itself.
 */
export function withoutForgotten(lines: readonly RecordLine[], forgotten: ReadonlySet<string>, now: Date): RecordLine[] {
  if (!forgotten.size) return [...lines];
  const out: RecordLine[] = [];
  for (const r of lines) {
    if (!r.composed) {
      if (!forgotten.has(r.line.id)) out.push(r);
      continue;
    }
    const kept = r.composed.members.filter((m) => !forgotten.has(m.input.id));
    if (kept.length === r.composed.members.length) out.push(r);
    else if (kept.length) out.push(...composedRows(kept, now, r.history ? { history: { when: r.history.when, provenance: r.provenance, noteId: r.noteId } } : {}).rows);
  }
  return out;
}
