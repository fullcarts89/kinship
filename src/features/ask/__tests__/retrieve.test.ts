// Ask Kinship v1 (CC-25; FD-30a): grounded retrieval over a fixture world of
// the user's own lines. Every answer is a line that exists, filed on its
// person; a question nothing answers is an honest miss; nothing is ranked,
// counted, suggested or invented. Pure: no store, no model.
import { ask, ASK_COPY, parse, words } from "../retrieve";
import type { ContactEventRow } from "@/features/person/trail";
import type { MemoryItem, Person, RelatedPerson } from "@/store/repositories";

const NOW = new Date("2026-10-30T12:00:00Z");

const person = (id: string, display_name: string, over: Partial<Person> = {}): Person =>
  ({ id, display_name, state: "active", birthday: null, birthday_source: null, version: 1, ...over }) as Person;

const P = {
  susan: person("susan", "Susan"),
  john: person("john", "John"),
  samE: person("sam-eden", "Sam", { full_name: "Sam Eden" } as Partial<Person>),
  samD: person("sam-doughty", "Sam", { full_name: "Sam Doughty" } as Partial<Person>),
  chris: person("chris", "Chris"),
  ben: person("ben", "Ben", { birthday: "1991-10-12", birthday_source: "contacts" }),
  aaron: person("aaron", "Aaron"),
  dana: person("dana", "Dana", { state: "remembered" }),
  alex: person("alex", "Alex", { state: "paused" }),
  zed: person("zed", "Zed", { state: "archived" }),
  jose: person("jose", "José"),
  gone: person("gone", "Gone", { deleted_at: "2026-10-01T00:00:00Z" } as Partial<Person>),
};
const people = Object.values(P);

let n = 0;
function item(id: string, person_id: string, statement: string, over: Partial<MemoryItem> = {}): MemoryItem {
  n += 1;
  return {
    id, kind: "fact", person_id, statement, detail: { category: "other" }, certainty: "stated", status: "active", sensitivity: "none",
    user_state: "unreviewed", subject_type: "person", subject_related_id: null, origin: "extracted",
    created_at: `2026-10-${String(n).padStart(2, "0")}T10:00:00.000Z`, ...over,
  } as MemoryItem;
}

const related: RelatedPerson[] = [{ id: "r-michelle", person_id: "john", relation: "sister", name: "Michelle" } as RelatedPerson];

const items: MemoryItem[] = [
  item("s-ca", "susan", "Susan lives in California", { detail: { category: "home" } }),
  item("s-oak", "susan", "Susan lives in Oakland", { detail: { category: "home" }, status: "superseded" }),
  item("s-ala", "susan", "Susan lives in Alameda", { detail: { category: "home", transition: "changed" }, supersedes_id: "s-oak" }),
  item("s-gift", "susan", "Susan said she'd love a pottery wheel as a gift", { detail: { category: "other", topic: "gift" } }),
  item("s-cats", "susan", "Susan is allergic to cats", { status: "retracted", deleted_at: "2026-10-20T00:00:00Z" } as Partial<MemoryItem>),
  item("j-pottery", "john", "John loves pottery", { detail: { category: "interest" } }),
  item("j-meta", "john", "John works at Meta", { detail: { category: "work" } }),
  item("j-run", "john", "John is into trail running", { detail: { category: "interest" } }),
  item("j-sis", "john", "John's sister had a baby", { subject_type: "related", subject_related_id: "r-michelle", detail: { category: "family" } }),
  item("se-job", "sam-eden", "Sam got the Stripe job", { detail: { category: "work" } }),
  item("se-coffee", "sam-eden", "You and Sam had coffee in Pilsen", { kind: "moment", subject_type: "shared", detail: { place: "Pilsen" } }),
  item("c-dog", "chris", "Chris has a dog named Fluffy", { detail: { category: "pet" } }),
  item("c-denver", "chris", "Chris moved to Denver", { kind: "event", detail: { event_type: "move", date_precision: "unknown" } }),
  item("b-race", "ben", "Ben runs Chicago Sunday", { kind: "event", detail: { event_type: "race", event_goal: "break four hours", date: "2026-10-11", date_precision: "day" } }),
  item("a-pottery", "aaron", "Aaron loves pottery", { detail: { category: "interest" } }),
  item("d-ala", "dana", "Dana lives in Alameda", { detail: { category: "home" } }),
  item("x-pottery", "alex", "Alex loves pottery", { detail: { category: "interest" } }),
  item("z-pottery", "zed", "Zed loves pottery", { detail: { category: "interest" } }),
  item("jo-sev", "jose", "José lives in Sevilla", { detail: { category: "home" } }),
  item("g-line", "gone", "Gone loves pottery", { detail: { category: "interest" } }),
];

const facets = new Map<string, { value_text: string; deleted_at?: unknown }>([
  ["s-ca", { value_text: "California" }],
  ["s-oak", { value_text: "Oakland" }],
  ["s-ala", { value_text: "Alameda" }],
  ["c-denver", { value_text: "Denver" }],
  ["d-ala", { value_text: "Alameda" }],
  ["jo-sev", { value_text: "Sevilla" }],
]);

const contacts: ContactEventRow[] = [
  { id: "ce-1", person_id: "sam-eden", channel: "in_person", occurred_at: "2026-09-20T18:00:00.000Z" },
  { id: "ce-2", person_id: "sam-eden", channel: "text", occurred_at: "2026-10-06T18:00:00.000Z", memory_item_id: "se-job" },
];

function q(query: string) {
  return ask({ query, people, related, items, facets, contacts, now: NOW });
}
const ids = (a: ReturnType<typeof q>) => a.groups.map((g) => [g.person.id, g.matches.map((m) => `${m.item.id}${m.earlier ? "~" : ""}`)]);

describe("words", () => {
  it("folds accents, case, possessives and plurals the same on both sides", () => {
    expect(words("Susan's GIFTS")).toEqual(["susan", "gift"]);
    expect(words("José’s hobbies")).toEqual(["jose", "hobby"]);
    expect(words("Chris likes")).toEqual(["chris", "like"]);
  });
  it("drops question and function words, keeps the content, reads the steer", () => {
    expect(parse("What is John into?")).toEqual({ content: ["john"], steers: new Set(["interest"]) });
    expect(parse("Who do I know in Alameda?")).toEqual({ content: ["alameda"], steers: new Set(["residence"]) });
    expect(parse("When did I last see Sam?")).toEqual({ content: ["sam"], steers: new Set(["conversation"]) });
  });
});

describe("nothing asked", () => {
  it.each(["", "   ", "what did", "did I ever", "?"])("no content words → nothing (%j)", (s) => {
    expect(q(s)).toEqual({ asked: false, named: [], groups: [], birthdays: [], miss: null });
  });
  it("a name alone is People's own filter, not a question", () => {
    expect(q("John").asked).toBe(false);
    expect(q("Sam").asked).toBe(false);
    expect(q("Sam Eden").asked).toBe(false);
  });
  it("a steer with no one it is about asks nothing", () => {
    expect(q("what do they like").asked).toBe(false);
  });
  it("a lone word that names no one and finds nothing is not a question (People says 'No one called … yet')", () => {
    expect(q("Zelda").asked).toBe(false);
  });
});

describe("the CC-25 examples", () => {
  it("'What is John into?' → John's interest lines, newest first, never his work", () => {
    const a = q("What is John into?");
    expect(a.asked).toBe(true);
    expect(a.named.map((p) => p.id)).toEqual(["john"]);
    expect(ids(a)).toEqual([["john", ["j-run", "j-pottery"]]]);
    expect(a.miss).toBeNull();
  });
  it("'What gift did Susan mention?' → the line, found in her words and the line's topic", () => {
    const a = q("What gift did Susan mention?");
    expect(ids(a)).toEqual([["susan", ["s-gift"]]]);
    expect(a.groups[0].matches[0].why).toEqual({ words: ["gift"], where: ["statement", "detail"] });
  });
  it("'Who do I know in Alameda?' → residence lines, Susan then Dana (remembered, last)", () => {
    const a = q("Who do I know in Alameda?");
    expect(ids(a)).toEqual([["susan", ["s-ala"]], ["dana", ["d-ala"]]]);
    expect(a.groups.map((g) => g.quiet)).toEqual([false, true]);
  });
  it("'Alameda' alone finds the same lines (a word that names no one but matches memory)", () => {
    expect(ids(q("Alameda"))).toEqual([["susan", ["s-ala"]], ["dana", ["d-ala"]]]);
  });
  it("'When did I last see Sam?' → Sam Eden's conversations newest first and the moment; Sam Doughty has none, and is not guessed", () => {
    const a = q("When did I last see Sam?");
    expect(a.named.map((p) => p.id)).toEqual(["sam-doughty", "sam-eden"]);
    expect(a.groups.map((g) => g.person.id)).toEqual(["sam-eden"]);
    expect(a.groups[0].conversations.map((t) => [t.label, t.about])).toEqual([
      ["You messaged · Oct 6", "Sam got the Stripe job"],
      ["You saw Sam · Sep 20", null],
    ]);
    expect(a.groups[0].matches.map((m) => m.item.id)).toEqual(["se-coffee"]);
    expect(a.miss).toBeNull();
  });
  it("'When did I last talk to Chris?' with nothing recorded → an honest line, never a count or a guess", () => {
    const a = q("When did I last talk to Chris?");
    expect(a.groups).toEqual([]);
    expect(a.miss).toBe(ASK_COPY.noConversations("Chris"));
  });
});

describe("places, people and details", () => {
  it("a place in a residence reading: 'Where does Chris live?'", () => {
    expect(ids(q("Where does Chris live?"))).toEqual([["chris", ["c-denver"]]]);
  });
  it("accents fold: 'Where does Jose live'", () => {
    expect(ids(q("Where does Jose live"))).toEqual([["jose", ["jo-sev"]]]);
  });
  it("a related person's name and relation: 'Michelle', 'What is John's sister up to?'", () => {
    expect(ids(q("Michelle"))).toEqual([["john", ["j-sis"]]]);
    expect(q("Michelle").groups[0].matches[0].why.where).toEqual(["related"]);
    expect(ids(q("What is John's sister up to?"))).toEqual([["john", ["j-sis"]]]);
  });
  it("a detail field: 'Ben four hours' (the event's goal)", () => {
    const a = q("Ben four hours");
    expect(ids(a)).toEqual([["ben", ["b-race"]]]);
    expect(a.groups[0].matches[0].why.where).toEqual(["detail"]);
  });
  it("plurals and possessives: 'gifts', 'Susan's gift'", () => {
    expect(ids(q("gifts"))).toEqual([["susan", ["s-gift"]]]);
    expect(ids(q("Susan's gift"))).toEqual([["susan", ["s-gift"]]]);
  });
  it("the word still being typed may be the start of one: 'Alamed', 'Who has a do'", () => {
    expect(ids(q("Alamed"))).toEqual([["susan", ["s-ala"]], ["dana", ["d-ala"]]]);
    expect(ids(q("Who has a dog"))).toEqual([["chris", ["c-dog"]]]);
  });
  it("'Who works at Meta?', 'Chicago', 'Fluffy'", () => {
    expect(ids(q("Who works at Meta?"))).toEqual([["john", ["j-meta"]]]);
    expect(ids(q("Chicago"))).toEqual([["ben", ["b-race"]]]);
    expect(ids(q("Fluffy"))).toEqual([["chris", ["c-dog"]]]);
  });
  it("'Who likes pottery?' → everyone whose line says so, in People's order, paused last; archived and deleted never", () => {
    expect(ids(q("Who likes pottery?"))).toEqual([["aaron", ["a-pottery"]], ["john", ["j-pottery"]], ["alex", ["x-pottery"]]]);
  });
  it("every word, else any of them: 'Ben marathon Chicago' still finds the Chicago line and says which word did", () => {
    const a = q("Ben marathon Chicago");
    expect(ids(a)).toEqual([["ben", ["b-race"]]]);
    expect(a.groups[0].matches[0].why.words).toEqual(["chicago"]);
  });
  it("a steer never hides what the words found: 'Who likes Chicago' (no interest line says it)", () => {
    expect(ids(q("Who likes Chicago"))).toEqual([["ben", ["b-race"]]]);
  });
});

describe("what is current, earlier, and gone", () => {
  it("a superseded residence the page shows under Before is found only as earlier", () => {
    const a = q("Who do I know in Oakland?");
    expect(ids(a)).toEqual([["susan", ["s-oak~"]]]);
  });
  it("a superseded line with no recorded change is never found", () => {
    const plain = items.map((m) => (m.id === "s-ala" ? { ...m, detail: { category: "home" } } : m));
    expect(ask({ query: "Who do I know in Oakland?", people, related, items: plain, facets, contacts, now: NOW }).groups).toEqual([]);
  });
  it("a retracted line is never found, by its words or through its person", () => {
    expect(q("cats").asked).toBe(false);
    const a = q("Is Susan allergic to cats?");
    expect(a.groups).toEqual([]);
    expect(a.miss).toBe(ASK_COPY.nothingFor("Susan"));
  });
  it("current lines come before earlier ones within a person", () => {
    const a = ask({ query: "Susan lives", people, related, items, facets, contacts, now: NOW });
    expect(a.groups[0].matches.map((m) => m.earlier)).toEqual([false, false, true]);
  });
});

describe("honest misses", () => {
  it("a named person with no matching line: 'Does John like skiing?'", () => {
    const a = q("Does John like skiing?");
    expect(a.asked).toBe(true);
    expect(a.groups).toEqual([]);
    expect(a.miss).toBe(ASK_COPY.nothingFor("John"));
  });
  it("two people named: 'Have Sam and Chris been skiing'", () => {
    expect(q("Did Sam and Chris go skiing").miss).toBe(ASK_COPY.nothingFor("Chris, Sam and Sam"));
  });
  it("no one named, nothing found: a question or statement gets the one quiet line", () => {
    const a = q("purple elephants");
    expect(a.asked).toBe(true);
    expect(a.miss).toBe(ASK_COPY.nothing);
  });
});

describe("birthdays", () => {
  it("'Who has a birthday?' → the people with one, from their own record", () => {
    const a = q("Who has a birthday?");
    expect(a.birthdays.map((p) => p.id)).toEqual(["ben"]);
    expect(a.miss).toBeNull();
  });
  it("'When is Ben's birthday?' → Ben's; 'When is John's birthday?' → an honest miss", () => {
    expect(q("When is Ben's birthday?").birthdays.map((p) => p.id)).toEqual(["ben"]);
    expect(q("When is John's birthday?").miss).toBe(ASK_COPY.nothingFor("John"));
  });
});

describe("what never happens", () => {
  it("no counts, scores or ranks anywhere in an answer's copy", () => {
    const copy = JSON.stringify(ASK_COPY);
    expect(copy).not.toMatch(/\b\d+\b|score|rank|health|days since/iu);
  });
  it("the answer is only lines that exist, each filed on a person in People", () => {
    for (const query of ["pottery", "Alameda", "What is John into?", "Who do I know in Oakland?"]) {
      for (const g of q(query).groups) {
        for (const m of g.matches) {
          expect(items.find((i) => i.id === m.item.id)).toBeDefined();
          expect(m.person.id).toBe(m.item.person_id);
          expect(["active", "resolved", "superseded"]).toContain(m.item.status);
        }
      }
    }
  });
});
