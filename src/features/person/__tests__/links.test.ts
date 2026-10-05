// Founder G20/G34: Michelle added after "Sam is married to Michelle" is asked
// about, never merged silently; a No is remembered.
import { linkSuggestions } from "../links";
import type { MemoryItem, Person, RelatedPerson } from "@/store/repositories";

const p = (id: string, display_name: string) => ({ id, display_name, state: "active" }) as Person;
const sam = p("sam", "Sam Eden");
const michelle = p("michelle", "Michelle Lee");
const married = { id: "m1", person_id: "sam", statement: "Sam is married to Michelle", status: "active", kind: "fact", detail: {}, certainty: "stated", user_state: "confirmed" } as MemoryItem;

it("asks once, about the memory that names her", () => {
  const out = linkSuggestions({ person: michelle, people: [sam, michelle], items: [married], related: [], answered: new Set() });
  expect(out).toEqual([{ key: "item:m1:michelle", kind: "item", targetId: "m1", prompt: "Is this the Michelle in “Sam is married to Michelle”?" }]);
});

it("a relative remembered by name on someone else is offered too", () => {
  const wife = { id: "r1", person_id: "sam", relation: "wife", name: "Michelle" } as RelatedPerson;
  const out = linkSuggestions({ person: michelle, people: [sam, michelle], items: [], related: [wife], answered: new Set() });
  expect(out.map((s) => s.prompt)).toEqual(["Is this Sam's wife, Michelle?"]);
});

it("never asks again once answered, or once it's already on her page", () => {
  expect(linkSuggestions({ person: michelle, people: [sam, michelle], items: [married], related: [], answered: new Set(["item:m1:michelle"]) })).toEqual([]);
  const shared = { ...married, with_person_ids: ["michelle"] } as MemoryItem;
  expect(linkSuggestions({ person: michelle, people: [sam, michelle], items: [shared], related: [], answered: new Set() })).toEqual([]);
});
