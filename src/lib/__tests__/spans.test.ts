// The app uses the same span module as the gateway (amendment 4); these are
// the same vectors Postgres and Deno assert.
import vectors from "../../../supabase/functions/_shared/span-vectors.json";
import {
  codePointLength,
  locateEvidence,
  sliceCodePoints,
} from "../../../supabase/functions/_shared/spans";

describe("provenance spans (code points, end-exclusive, NFC)", () => {
  it.each(vectors.cases)("$name agrees with Postgres", (c) => {
    expect(codePointLength(c.text)).toBe(c.codePoints);
    expect(sliceCodePoints(c.text, { start: c.start, end: c.end })).toBe(c.quote);
    expect(locateEvidence(c.text, c.quote)).toEqual({ ok: true, span: { start: c.start, end: c.end } });
  });

  it("never guesses between repeated evidence", () => {
    expect(locateEvidence("Sam called. Later Sam texted.", "Sam")).toEqual({ ok: false, reason: "ambiguous" });
  });
});
