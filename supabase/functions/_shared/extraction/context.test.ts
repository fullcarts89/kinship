// D2 minimal context for relationship_extract (Checkpoint C).
// Run: deno test supabase/functions
import { buildInput, type CaptureRow, dossierPeople, type ItemRow, type PersonRow, type RelatedRow } from "./context.ts";
import { buildUserContent } from "../prompts/relationship_extract/v1.ts";

function eq<T>(actual: T, expected: T, msg = ""): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg} expected ${e}, got ${a}`);
}

const person = (id: string, display_name: string, extra: Partial<PersonRow> = {}): PersonRow => ({
  id, display_name, full_name: null, nicknames: [], relationship_label: null, state: "active", ...extra,
});
const PEOPLE: PersonRow[] = [
  person("ben", "Ben", { full_name: "Ben Ortiz" }),
  person("mom", "Mom", { relationship_label: "mother" }),
  person("david", "David"),
  person("jose", "José"),
  person("old", "Oldfriend", { state: "archived" }),
  ...Array.from({ length: 150 }, (_, i) => person(`p${i}`, `Person${i}`)),
];
const RELATED: RelatedRow[] = [{ id: "leo", person_id: "david", relation: "son", name: "Leo" }];
const cap = (raw_text: string, context_person_id: string | null = null): CaptureRow => ({
  id: "c", raw_text, occurred_at: "2026-10-09T02:14:00Z", time_zone: "America/Chicago", context_person_id,
});
const names = (text: string, ctx: string | null = null) => buildInput(cap(text, ctx), PEOPLE, RELATED, []).roster.map((r) => r.display_name);

Deno.test("the model sees only the people this note could be about", () => {
  eq(names("Ben runs Chicago Sunday."), ["Ben"]);
  eq(names("My mom's surgery is Friday."), ["Mom"]);
  eq(names("Leo starts kindergarten Tuesday"), ["David"], "a named relative brings in their person");
  eq(names("Starts kindergarten Tuesday", "david"), ["David"], "the page it was written on");
  eq(names("Jose is opening a bakery"), ["José"], "accents ignored");
  eq(names("Oldfriend called"), [], "archived people are out of the conversation");
  eq(names("Weather was awful today."), []);
});

Deno.test("the prompt never carries the whole list, or anything but names and labels", () => {
  const content = buildUserContent(buildInput(cap("Ben runs Chicago Sunday."), PEOPLE, RELATED, []));
  eq(content.includes("Person1"), false);
  eq(/@|\+1|\d{3}-\d{4}/.test(content), false);
});

Deno.test("dossiers: at most three people, at most forty items", () => {
  const many = Array.from({ length: 10 }, (_, i) => person(`n${i}`, `Name${i}`));
  const text = many.map((p) => p.display_name).join(" and ") + " came over.";
  eq(dossierPeople(cap(text), many, []).length, 3);
  const items: ItemRow[] = Array.from({ length: 60 }, (_, i) => ({
    id: `m${i}`, person_id: "ben", kind: "fact", subject_type: "person", subject_related_id: null,
    statement: `fact ${i}`, certainty: "stated", status: "active", user_state: "unreviewed", detail: { category: "other" },
  }));
  eq(buildInput(cap("Ben loves jazz."), PEOPLE, RELATED, items).dossier.length, 40);
});
