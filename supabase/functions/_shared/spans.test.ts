// Amendment 4 proofs: code-point spans agree with Postgres on the shared
// vectors, and evidence is located from exact text, never trusted offsets.
// Run: deno test supabase/functions
import vectors from "./span-vectors.json" with { type: "json" };
import {
  codePointLength,
  codePointToUtf16,
  isNfc,
  locateEvidence,
  sliceCodePoints,
  utf16ToCodePoint,
} from "./spans.ts";

function assertEquals<T>(actual: T, expected: T, msg = ""): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg} expected ${e}, got ${a}`);
}
function assertThrows(fn: () => unknown, msg: string): void {
  try {
    fn();
  } catch {
    return;
  }
  throw new Error(`expected a throw: ${msg}`);
}

for (const c of vectors.cases) {
  Deno.test(`spans: ${c.name} matches Postgres`, () => {
    assertEquals(isNfc(c.text), true, "vector text is NFC");
    assertEquals(codePointLength(c.text), c.codePoints, "code points");
    assertEquals(c.text.length, c.utf16, "UTF-16 length differs only where expected");
    assertEquals(sliceCodePoints(c.text, { start: c.start, end: c.end }), c.quote, "slice");
    assertEquals(locateEvidence(c.text, c.quote), { ok: true, span: { start: c.start, end: c.end } }, "locate");
    const u = codePointToUtf16(c.text, c.start);
    assertEquals(utf16ToCodePoint(c.text, u), c.start, "round trip");
  });
}

Deno.test("spans: evidence not in the text yields no span", () => {
  assertEquals(locateEvidence("Ben runs Chicago Sunday.", "Ben runs Boston"), { ok: false, reason: "not_found" });
  assertEquals(locateEvidence("Ben runs Chicago Sunday.", ""), { ok: false, reason: "empty" });
});

Deno.test("spans: repeated evidence is ambiguous unless a hint picks one", () => {
  const text = "Sam called. Later Sam texted.";
  assertEquals(locateEvidence(text, "Sam"), { ok: false, reason: "ambiguous" });
  assertEquals(locateEvidence(text, "Sam", 17), { ok: true, span: { start: 18, end: 21 } });
  assertEquals(locateEvidence(text, "Sam", 9), { ok: false, reason: "ambiguous" }, "equidistant");
});

Deno.test("spans: decomposed input is matched against NFC text", () => {
  const stored = "Zoë's café".normalize("NFC");
  assertEquals(locateEvidence(stored, "Zoë"), { ok: true, span: { start: 0, end: 3 } });
});

Deno.test("spans: invalid offsets throw instead of guessing", () => {
  const text = "Ben 🏃 ran";
  assertThrows(() => sliceCodePoints(text, { start: 5, end: 5 }), "empty span");
  assertThrows(() => sliceCodePoints(text, { start: 0, end: 99 }), "past the end");
  assertThrows(() => utf16ToCodePoint(text, 5), "inside a surrogate pair");
});
