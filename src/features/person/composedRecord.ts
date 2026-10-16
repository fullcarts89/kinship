// What Kinship knows says a person's residence in one line when their lines
// chain (Phase 4B B5; brief §9, §12): "Susan lives in California" and
// "Susan lives in Alameda" read as "Lives in Alameda, California". Computed
// here every time the page is read, from the lines and their mirrored
// readings; nothing is stored, and the member lines stay the memory.
//
//   provenance  the union of the members' sources, in the existing words
//               ("You told Kinship · Oct 2 · and 1 other note")
//   members     every line behind it, the most specific first, each with its
//               own words, provenance, Edit and Not this (the sheet)
//   fail open   a group that doesn't chain shows every line as today; one
//               line shows as itself. Two current lines the comparator should
//               have closed are reported content-free (compose_degraded)
//
// Pure: the hook supplies the lines; "Not this" on a member recomposes the
// rest from the same inputs at once (withoutForgotten), never from a cached
// string.
import { type ComposeMember, composeResidence, currentResidence, residenceGroupKey } from "../../../supabase/functions/_shared/semantic/compose";
import { provenanceLine, type SourceFacts } from "@/features/memory/format";
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

/**
 * The rows for one group of members: one composed row when they chain (and
 * there are at least two), else each member's own row (fail open).
 */
export function composedRows(members: readonly ComposedMember[], now: Date): { rows: RecordLine[]; degraded: boolean } {
  const byId = new Map(members.map((m) => [m.input.id, m]));
  const r = composeResidence(members.map((m) => m.input));
  const rows = r.lines.map((line) => {
    const ordered = line.memberIds.map((id) => byId.get(id)!);
    if (ordered.length < 2) return ordered[0].row;
    const sources = ordered.flatMap((m) => m.sources);
    const head = ordered[0];
    const record: ComposedRecord = { text: line.text, memberIds: line.memberIds, members: ordered };
    return {
      line: head.row.line,
      provenance: provenanceLine(sources, now, head.origin),
      noteId: newestNote(sources),
      conflict: null,
      composed: record,
    };
  });
  return { rows, degraded: r.degraded };
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
    const members: ComposedMember[] = indexes.map((i) => {
      const x = inputs[i];
      const f = x.facet!;
      const input: ComposeMember = {
        id: x.item.id,
        facet: { value_text: f.value_text, value_norm: f.value_norm, place_ref: f.place_ref, candidates: f.candidates, usual_ref: f.usual_ref, dataset_version: f.dataset_version },
        told: String(x.item.created_at ?? ""),
      };
      return { input, row: x.row, sources: facts(x.sources), origin: typeof x.item.origin === "string" ? x.item.origin : null };
    });
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
    else if (kept.length) out.push(...composedRows(kept, now).rows);
  }
  return out;
}
