// The user's people as the recognizer hears them (E18): their names go to the
// on-device recognizer as hints, and while listening each one heard is
// underlined (board 1, "Listening · for David"). Matching is the user's own
// names, whole words, any case: never a guess about who someone is.
import type { Person } from "@/store/repositories";
import { firstName } from "../../../../supabase/functions/_shared/extraction/names";

/** Names worth listening for: each person's full display name and first name. */
export function hintNames(people: readonly Pick<Person, "display_name">[]): string[] {
  const out = new Set<string>();
  for (const p of people) {
    const name = p.display_name.trim();
    if (!name) continue;
    out.add(name);
    const first = firstName(name);
    if (first.length > 1) out.add(first);
  }
  return [...out];
}

export interface Span {
  start: number;
  end: number;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

/** Where `names` appear in `text` as whole words; longest first, never overlapping, in reading order. */
export function nameSpans(text: string, names: readonly string[]): Span[] {
  const taken: Span[] = [];
  const sorted = [...new Set(names.map((n) => n.trim()).filter((n) => n.length > 1))].sort((a, b) => b.length - a.length);
  for (const name of sorted) {
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(name)}(?![\\p{L}\\p{N}])`, "giu");
    for (const m of text.matchAll(re)) {
      const span = { start: m.index ?? 0, end: (m.index ?? 0) + m[0].length };
      if (!taken.some((t) => span.start < t.end && t.start < span.end)) taken.push(span);
    }
  }
  return taken.sort((a, b) => a.start - b.start);
}

/** The text cut into runs, each marked or not. */
export function runsOf(text: string, spans: readonly Span[]): { text: string; name: boolean }[] {
  const out: { text: string; name: boolean }[] = [];
  let at = 0;
  for (const s of spans) {
    if (s.start > at) out.push({ text: text.slice(at, s.start), name: false });
    out.push({ text: text.slice(s.start, s.end), name: true });
    at = s.end;
  }
  if (at < text.length) out.push({ text: text.slice(at), name: false });
  return out;
}
