// Provenance spans: the one representation shared by Postgres, the app and
// the AI gateway (Checkpoint A amendment 4).
//
//   * A span is [start, end) in Unicode CODE POINTS (end-exclusive) into the
//     capture's raw_text as stored.
//   * Stored text is NFC (a database CHECK enforces it), so the same words
//     are the same code points on every device.
//   * Postgres counts code points natively (char_length, substr). JavaScript
//     strings are UTF-16, so never use .length/.slice indexes as offsets:
//     convert with the helpers below.
//   * The gateway never trusts numeric offsets from a model. It asks for the
//     exact evidence text and locates it here; a quote that isn't found, or
//     that appears more than once with no way to choose, yields no span and
//     the item is dropped ("silence beats a wrong personal detail").
//
// Plain TypeScript with no runtime imports, so the app (Jest/tsc) and the
// Deno edge functions use this same file.

export interface Span {
  start: number;
  end: number;
}

export type LocateResult =
  | { ok: true; span: Span }
  | { ok: false; reason: "empty" | "not_found" | "ambiguous" };

/** Number of Unicode code points (what Postgres char_length returns). */
export function codePointLength(text: string): number {
  return Array.from(text).length;
}

/** UTF-16 index of a code-point offset. Throws if the offset is out of range. */
export function codePointToUtf16(text: string, offset: number): number {
  if (!Number.isInteger(offset) || offset < 0) throw new RangeError(`bad code-point offset ${offset}`);
  let cp = 0;
  let i = 0;
  while (cp < offset) {
    if (i >= text.length) throw new RangeError(`code-point offset ${offset} is past the end`);
    i += (text.codePointAt(i) ?? 0) > 0xffff ? 2 : 1;
    cp++;
  }
  return i;
}

/** Code-point offset of a UTF-16 index. Throws inside a surrogate pair. */
export function utf16ToCodePoint(text: string, index: number): number {
  if (!Number.isInteger(index) || index < 0 || index > text.length) {
    throw new RangeError(`bad UTF-16 index ${index}`);
  }
  let cp = 0;
  let i = 0;
  while (i < index) {
    i += (text.codePointAt(i) ?? 0) > 0xffff ? 2 : 1;
    cp++;
  }
  if (i !== index) throw new RangeError(`UTF-16 index ${index} splits a surrogate pair`);
  return cp;
}

/** The text a span covers (what Postgres substr(text, start + 1, end - start) returns). */
export function sliceCodePoints(text: string, span: Span): string {
  assertSpan(text, span);
  return text.slice(codePointToUtf16(text, span.start), codePointToUtf16(text, span.end));
}

/** Throws unless span is a non-empty, in-range, end-exclusive code-point span. */
export function assertSpan(text: string, span: Span): void {
  const len = codePointLength(text);
  if (!Number.isInteger(span.start) || !Number.isInteger(span.end) ||
      span.start < 0 || span.end <= span.start || span.end > len) {
    throw new RangeError(`span [${span.start}, ${span.end}) is not inside text of ${len} code points`);
  }
}

/** True if text is already in Unicode Normalization Form C. */
export function isNfc(text: string): boolean {
  return text === text.normalize("NFC");
}

/**
 * Finds the code-point span of an exact evidence quote in the capture text.
 * Both are compared in NFC. When the quote occurs more than once, `near` (a
 * code-point offset hint, e.g. what the model claimed) picks the closest
 * occurrence only if exactly one is closest; otherwise the result is
 * ambiguous and the caller must not invent a span.
 */
export function locateEvidence(text: string, evidence: string, near?: number): LocateResult {
  const haystack = text.normalize("NFC");
  const needle = evidence.normalize("NFC");
  if (needle.length === 0) return { ok: false, reason: "empty" };

  const starts: number[] = [];
  for (let i = haystack.indexOf(needle); i !== -1; i = haystack.indexOf(needle, i + 1)) {
    // Ignore matches that begin in the middle of a surrogate pair.
    const prev = haystack.charCodeAt(i - 1);
    const curr = haystack.charCodeAt(i);
    if (i > 0 && prev >= 0xd800 && prev <= 0xdbff && curr >= 0xdc00 && curr <= 0xdfff) continue;
    starts.push(utf16ToCodePoint(haystack, i));
  }
  if (starts.length === 0) return { ok: false, reason: "not_found" };

  const length = codePointLength(needle);
  if (starts.length === 1) return { ok: true, span: { start: starts[0], end: starts[0] + length } };
  if (near === undefined || !Number.isFinite(near)) return { ok: false, reason: "ambiguous" };

  const distances = starts.map((s) => Math.abs(s - near));
  const best = Math.min(...distances);
  const winners = starts.filter((_, i) => distances[i] === best);
  if (winners.length !== 1) return { ok: false, reason: "ambiguous" };
  return { ok: true, span: { start: winners[0], end: winners[0] + length } };
}
