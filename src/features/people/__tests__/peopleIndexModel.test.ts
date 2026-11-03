// People as an index (PR #77 spec §9): the date band, the names and lines on tiles, letter breaks,
// the found words and where a found line leads. Pure; fixtures only.
import type { AskView } from "@/features/ask/useAsk";
import type { RecordLine } from "@/features/person/PersonRecordView";
import type { ItemLine } from "@/features/tell/reviewModel";
import type { MemoryItem, Person } from "@/store/repositories";
import {
  BAND_DAYS, bandDayLabel, bandDaySpoken, buildTiles, comingUpForThem, distinguishingLine, hitsOf, letterOf, markFound,
  nameMatches, nameWordsOf, notebookHref, rowsOf, showsLetters, tileName, tileSections,
} from "../notebook/peopleIndexModel";

const TODAY = "2026-11-02"; // a Monday

function person(id: string, display_name: string, over: Record<string, unknown> = {}): Person {
  return { id, display_name, state: "active", birthday: null, birthday_source: null, version: 1, full_name: null, nicknames: [], ...over } as Person;
}

let n = 0;
function item(person_id: string, statement: string, over: Record<string, unknown> = {}): MemoryItem {
  return {
    id: `m${++n}`, kind: "event", person_id, statement, detail: {}, certainty: "stated", status: "active", user_state: "none",
    subject_type: "person", sensitivity: "none", created_at: "2026-10-20T10:00:00Z", ...over,
  } as MemoryItem;
}
const on = (date: string, over: Record<string, unknown> = {}) => ({ detail: { date, date_precision: "day" }, ...over });

describe("Coming up for them", () => {
  const ben = person("ben", "Ben");
  const maya = person("maya", "Maya");
  const rosa = person("rosa", "Rosa");

  it("orders people by date only, each once at their soonest day, with the chip the prototype shows", () => {
    const band = comingUpForThem({
      people: [ben, maya, rosa],
      items: [
        item("rosa", "Rosa is teaching you ravioli", on("2026-11-08")),
        item("ben", "Ben runs the marathon", on("2026-11-16")),
        item("ben", "Ben's dinner", on("2026-11-03")),
        item("maya", "Maya's show opens", on("2026-11-07", { kind: "plan" })),
      ],
      today: TODAY,
    });
    expect(band.map((b) => [b.personId, b.day, b.label])).toEqual([
      ["ben", "2026-11-03", "Tomorrow"],
      ["maya", "2026-11-07", "Sat"],
      ["rosa", "2026-11-08", "Sun"],
    ]);
  });

  it("looks 14 days ahead, today included; nothing past, nothing beyond", () => {
    const band = comingUpForThem({
      people: [ben, maya, rosa],
      items: [
        item("ben", "Ben's thing today", on(TODAY)),
        item("maya", "Maya's thing in 14 days", on("2026-11-16")),
        item("rosa", "Rosa's thing in 15 days", on("2026-11-17")),
        item("rosa", "Rosa's thing yesterday", on("2026-11-01")),
      ],
      today: TODAY,
    });
    expect(BAND_DAYS).toBe(14);
    expect(band.map((b) => [b.personId, b.label])).toEqual([["ben", "Today"], ["maya", "Nov 16"]]);
  });

  it("never shows a sensitive line (by label or by wording), a relative's line, or the user's own promise", () => {
    const band = comingUpForThem({
      people: [ben, maya, rosa],
      items: [
        item("ben", "Ben's surgery", on("2026-11-04", { sensitivity: "health" })),
        item("maya", "Maya has chemo on Thursday", on("2026-11-05")),
        item("rosa", "Rosa's sister Ana is visiting", on("2026-11-05", { subject_type: "related", subject_related_id: "r1" })),
        item("rosa", "You said you'd bring her the flour", on("2026-11-06", { kind: "promise", subject_type: "user" })),
      ],
      today: TODAY,
    });
    expect(band).toEqual([]);
  });

  it("keeps their own promise, and a line shared with them", () => {
    const band = comingUpForThem({
      people: [ben, maya],
      items: [
        item("ben", "Ben said he'd send the photos", on("2026-11-05", { kind: "promise", subject_type: "person" })),
        item("ben", "Ben and Maya are hiking", on("2026-11-09", { kind: "plan", with_person_ids: ["maya"] })),
      ],
      today: TODAY,
    });
    expect(band.map((b) => [b.personId, b.label, b.from])).toEqual([["ben", "Thu", "line"], ["maya", "Nov 9", "line"]]);
  });

  it("never anything retracted, superseded, expired, deleted, coarse or undated; never a fact", () => {
    const band = comingUpForThem({
      people: [ben],
      items: [
        item("ben", "a", on("2026-11-04", { status: "retracted" })),
        item("ben", "b", on("2026-11-04", { status: "superseded" })),
        item("ben", "c", on("2026-11-04", { status: "expired" })),
        item("ben", "d", on("2026-11-04", { deleted_at: "2026-10-30T00:00:00Z" })),
        item("ben", "e", { detail: { date: "2026-11-01", date_precision: "month" } }),
        item("ben", "f"),
        item("ben", "g", on("2026-11-04", { kind: "fact" })),
      ],
      today: TODAY,
    });
    expect(band).toEqual([]);
  });

  it("never anyone paused, remembered or removed (D13), even for a birthday", () => {
    const people = [
      person("p", "Pat", { state: "paused", birthday: "1990-11-04", birthday_source: "contacts" }),
      person("r", "Rae", { state: "remembered", birthday: "1950-11-04", birthday_source: "contacts" }),
      person("a", "Ari", { state: "archived" }),
      person("d", "Dee", { deleted_at: "2026-10-01T00:00:00Z" }),
    ];
    const band = comingUpForThem({ people, items: [item("p", "x", on("2026-11-04")), item("a", "y", on("2026-11-04")), item("d", "z", on("2026-11-04"))], today: TODAY });
    expect(band).toEqual([]);
  });

  it("takes a sourced birthday, at their soonest day, next year when this year's has passed", () => {
    const people = [
      person("ana", "Ana", { birthday: "1990-11-10", birthday_source: "contacts" }),
      person("bo", "Bo", { birthday: "1988-11-05", birthday_source: "capture" }),
      person("cy", "Cy", { birthday: "1988-11-04", birthday_source: null }),
      person("di", "Di", { birthday: "1992-11-01", birthday_source: "contacts" }),
    ];
    const band = comingUpForThem({ people, items: [item("ana", "Ana's recital", on("2026-11-06"))], today: TODAY });
    expect(band.map((b) => [b.personId, b.day, b.from])).toEqual([["bo", "2026-11-05", "birthday"], ["ana", "2026-11-06", "line"]]);
    // A birthday at the turn of the year.
    const dec = comingUpForThem({ people: [person("ny", "Noa", { birthday: "2000-01-03", birthday_source: "contacts" })], items: [], today: "2026-12-28" });
    expect(dec.map((b) => [b.day, b.label])).toEqual([["2027-01-03", "Sun"]]);
  });

  it("says a shared day by name so the order never moves", () => {
    const band = comingUpForThem({
      people: [maya, ben],
      items: [item("maya", "m", on("2026-11-05")), item("ben", "b", on("2026-11-05"))],
      today: TODAY,
    });
    expect(band.map((b) => b.personId)).toEqual(["ben", "maya"]);
  });
});

describe("the day chip", () => {
  it("says Today, Tomorrow, the weekday within the week, else the date", () => {
    expect(bandDayLabel("2026-11-02", TODAY)).toBe("Today");
    expect(bandDayLabel("2026-11-03", TODAY)).toBe("Tomorrow");
    expect(bandDayLabel("2026-11-07", TODAY)).toBe("Sat");
    expect(bandDayLabel("2026-11-08", TODAY)).toBe("Sun");
    expect(bandDayLabel("2026-11-09", TODAY)).toBe("Nov 9");
    expect(bandDaySpoken("2026-11-07", TODAY)).toBe("Saturday");
    expect(bandDaySpoken("2026-11-16", TODAY)).toBe("November 16");
  });
});

describe("the tile's name", () => {
  it("is the first name, or the full name where two people share it", () => {
    const people = [
      person("s1", "Sam Doughty", { full_name: "Sam Doughty" }),
      person("s2", "Sam Eden", { full_name: "Sam Eden" }),
      person("b", "Ben Carter", { full_name: "Ben Carter" }),
    ];
    expect(people.map((p) => tileName(p, people))).toEqual(["Sam Doughty", "Sam Eden", "Ben"]);
  });

  it("says a name typed whole as it was typed (names.ts), and tells exact twins apart by their relation", () => {
    const aunt = person("a", "Aunt Linda");
    expect(tileName(aunt, [aunt])).toBe("Aunt Linda");
    const twins = [person("x", "Sam", { relationship_label: "work" }), person("y", "Sam", { relationship_label: "climbing" })];
    expect(twins.map((p) => tileName(p, twins))).toEqual(["Sam (work)", "Sam (climbing)"]);
  });
});

describe("the tile's line", () => {
  it("is the relation the user gave, else the Contacts birthday, else Added from Contacts, else nothing", () => {
    expect(distinguishingLine(person("e", "Elena", { relationship_label: "Your neighbor, two doors down", birthday: "1990-11-07", birthday_source: "contacts" }))).toBe("Your neighbor, two doors down");
    expect(distinguishingLine(person("a", "Aiko Tanaka", { full_name: "Aiko Tanaka", contact_ref: "c1", birthday: "1991-01-14", birthday_source: "contacts" }))).toBe("Birthday Jan 14");
    expect(distinguishingLine(person("g", "Gus Lee", { full_name: "Gus Lee", contact_ref: "c2" }))).toBe("Added from Contacts");
    // Added by name: nothing invented, even with a told birthday or a contact linked later.
    expect(distinguishingLine(person("h", "Hana"))).toBeNull();
    expect(distinguishingLine(person("i", "Ivo", { birthday: "1990-03-03", birthday_source: "capture" }))).toBeNull();
    expect(distinguishingLine(person("j", "Jo", { contact_ref: "c3" }))).toBeNull();
  });
});

describe("everyone, A–Z", () => {
  it("sorts by the name on the tile, accents folded, with held people like anyone else and removed people gone", () => {
    const tiles = buildTiles([
      person("z", "Zoë"),
      person("e", "Élodie"),
      person("a", "ada"),
      person("r", "Rae", { state: "remembered" }),
      person("p", "Pat", { state: "paused" }),
      person("x", "Xan", { state: "archived" }),
      person("n", "7even"),
    ]);
    expect(tiles.map((t) => [t.name, t.letter])).toEqual([["ada", "A"], ["Élodie", "E"], ["Pat", "P"], ["Rae", "R"], ["Zoë", "Z"], ["7even", "#"]]);
    expect(letterOf("Øyvind")).toBe("Ø");
  });

  it("shows letter breaks only above 25 people, in rows of three", () => {
    expect(showsLetters(25, 25)).toBe(false);
    expect(showsLetters(26, 25)).toBe(true);
    expect(rowsOf([1, 2, 3, 4, 5, 6, 7], 3)).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
    const tiles = buildTiles([person("a1", "Ada"), person("a2", "Aiko"), person("b1", "Ben"), person("a3", "Alma"), person("a4", "Ann")]);
    expect(tileSections(tiles, 3, false).map((s) => [s.letter, s.rows.map((r) => r.map((t) => t.name))])).toEqual([[null, [["Ada", "Aiko", "Alma"], ["Ann", "Ben"]]]]);
    expect(tileSections(tiles, 3, true).map((s) => [s.letter, s.rows.map((r) => r.map((t) => t.name))])).toEqual([
      ["A", [["Ada", "Aiko", "Alma"], ["Ann"]]],
      ["B", [["Ben"]]],
    ]);
  });
});

describe("search", () => {
  it("finds people by any name they go by", () => {
    const people = [person("b", "Ben", { full_name: "Ben Carter" }), person("m", "Maya", { nicknames: ["Mimi"] }), person("r", "Rosa")];
    expect([...nameMatches(people, "cart")]).toEqual(["b"]);
    expect([...nameMatches(people, "mimi")]).toEqual(["m"]);
    expect([...nameMatches(people, "  ")]).toEqual([]);
  });

  it("marks the found words, Ask's way (case, plurals, the word still being typed), never a name", () => {
    const names = nameWordsOf([person("r", "Rosa")]);
    const marked = (text: string, q: string) => markFound(text, q, names).map((x) => (x.found ? `[${x.text}]` : x.text)).join("");
    expect(marked("You said you'd bring her the good flour from Sahadi's.", "flour")).toBe("You said you'd bring her the good [flour] from Sahadi's.");
    expect(marked("Ben loves Gifts and gift wrap", "gifts ")).toBe("Ben loves [Gifts] and [gift] wrap");
    expect(marked("Ravioli with Rosa", "Rosa rav")).toBe("[Ravioli] with Rosa");
    expect(marked("Nothing here", "the ")).toBe("Nothing here");
  });

  it("leads a found line to its note in their Pages, else to the line in Knows", () => {
    expect(notebookHref("ben", "note 1", "m1")).toBe("/v2/person/ben?lens=pages&note=note%201");
    expect(notebookHref("ben", null, "m1")).toBe("/v2/person/ben?lens=knows&item=m1");
  });

  it("keeps Ask v1's answer whole: conversations, lines with their sources, composed lines to their first note, birthdays", () => {
    const line = (id: string, statement: string): ItemLine => ({
      id, statement, person: { id: "rosa", label: "Rosa", changeable: true }, about: null, also: [], replaces: [], when: null,
      kind: { value: "fact", label: "Something true", changeable: true }, edited: false,
    } as ItemLine);
    const row = (id: string, statement: string, over: Partial<RecordLine> = {}): RecordLine =>
      ({ line: line(id, statement), provenance: "You told Kinship · Oct 4", noteId: `n-${id}`, conflict: null, ...over });
    const member = (noteId: string | null) => ({ row: { noteId } }) as unknown as NonNullable<RecordLine["composed"]>["members"][number];
    const view: AskView = {
      query: "flour", asked: true, named: [], miss: null,
      groups: [{
        personId: "rosa", name: "Rosa", href: "/v2/person/rosa", quiet: false,
        conversations: [{ id: "c1", label: "You called · Sep 21", about: "About Christmas Eve" }],
        rows: [
          { key: "a", earlier: false, href: "x", row: row("flour", "You said you'd bring her the good flour") },
          { key: "b", earlier: true, href: "x", row: row("old", "Rosa lived in Queens", { display: "Previously lived in Queens", history: { when: "Moved · Jan 4" } }) },
          { key: "c", earlier: false, href: "x", row: row("res", "Rosa lives in Bensonhurst", { noteId: null, composed: { text: "Lives in Bensonhurst, Brooklyn", memberIds: ["res", "bk"], members: [member(null), member("n-bk")] } }) },
          { key: "d", earlier: false, href: "x", row: row("typed", "Rosa likes figs", { noteId: null, provenance: "You added this" }) },
        ],
      }],
      birthdays: [{ personId: "rosa", text: "Rosa's birthday · Mar 3", provenance: "From Contacts", noteId: null, href: "/v2/person/rosa" }],
    };
    expect(hitsOf(view).map((h) => [h.kind, h.text, h.earlier, h.notes, h.source, h.sourceKind, h.href])).toEqual([
      ["conversation", "You called · Sep 21", false, ["About Christmas Eve"], null, "note", "/v2/person/rosa"],
      ["line", "You said you'd bring her the good flour", false, [], "Rosa · You told Kinship · Oct 4", "note", "/v2/person/rosa?lens=pages&note=n-flour"],
      ["line", "Previously lived in Queens", true, ["Moved · Jan 4"], "Rosa · You told Kinship · Oct 4", "note", "/v2/person/rosa?lens=pages&note=n-old"],
      ["line", "Lives in Bensonhurst, Brooklyn", false, [], "Rosa · You told Kinship · Oct 4", "note", "/v2/person/rosa?lens=pages&note=n-bk"],
      ["line", "Rosa likes figs", false, [], "Rosa · You added this", "yours", "/v2/person/rosa?lens=knows&item=typed"],
      ["birthday", "Rosa's birthday · Mar 3", false, [], "From Contacts", "contacts", "/v2/person/rosa"],
    ]);
    expect(hitsOf({ ...view, asked: false })).toEqual([]);
  });
});
