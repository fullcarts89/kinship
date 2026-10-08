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

describe("J7: once the user has said who a line is about, a name in it never reopens the question", () => {
  const samEden = p("sam-eden", "Sam Eden");
  const samD = p("sam-d", "Sam Doughty");
  const chris = p("chris", "Chris");
  const people = [samEden, samD, chris, sam, michelle];
  const line = (over: Partial<MemoryItem>) =>
    ({ id: "d1", person_id: "chris", status: "active", kind: "fact", detail: {}, certainty: "stated", user_state: "unreviewed", ...over }) as MemoryItem;

  it("a line from before records ('Sam loves watching Dragonball Z', answered Chris): kept on Chris against its own words, never asked on a Sam's page", () => {
    const dbz = line({ statement: "Sam loves watching Dragonball Z" });
    for (const who of [samEden, samD]) {
      expect(linkSuggestions({ person: who, people, items: [dbz], related: [], answered: new Set() })).toEqual([]);
    }
  });

  it("words recorded as someone's on the line (the user's answer: 'Sam' is Samantha's) are never asked about on another Sam's page", () => {
    const samantha = p("samantha", "Samantha Reyes");
    const hers = line({ person_id: "samantha", statement: "Sam got the job", person_mentions: [{ person_id: "samantha", text: "Sam", name: "Samantha Reyes" }] });
    expect(linkSuggestions({ person: samEden, people: [...people, samantha], items: [hers], related: [], answered: new Set() })).toEqual([]);
  });

  it("someone added after they were mentioned is still asked about (G20/G34): a name the line doesn't lead with, recorded for no one", () => {
    const told = line({ person_id: "sam", statement: "Sam is married to Michelle", person_mentions: [{ person_id: "sam", text: "Sam", name: "Sam Eden" }] });
    expect(linkSuggestions({ person: michelle, people, items: [told], related: [], answered: new Set() }).map((s) => s.prompt))
      .toEqual(["Is this the Michelle in “Sam is married to Michelle”?"]);
  });
});
