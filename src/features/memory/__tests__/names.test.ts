// Founder I12 and I13 (CC-18; Gate 0 remediation, decision 1b): how a
// person's name is said, which words in a line name which person (recorded
// with the line), and how a rename or a correction changes what it says.
// Whole words only, possessives included; nothing about anyone else; never a
// name written twice; the user's own words stay until an explicit rename.
import {
  aliasesAfterRename,
  findMention,
  mentionsAfterEdit,
  mentionsOf,
  recordMentions,
  shortName,
  withMentionNames,
  withSubjectReassigned,
  type NamedPerson,
  type PersonMention,
} from "../../../../supabase/functions/_shared/extraction/names";

const person = (id: string, display_name: string, more: Partial<NamedPerson> = {}): NamedPerson => ({ id, display_name, ...more });
const wifey = person("w", "Wifey Liu", { full_name: "Wifey Liu" });
const kaiya = person("k", "Kaiya", { full_name: null });
const ben = person("b", "Ben Oxnard", { full_name: "Ben Oxnard" });
const josh = person("j", "Josh", { full_name: null });

describe("I12: the name a person goes by now", () => {
  it("a name as Contacts gave it is said by its first name; a name typed or chosen is said whole", () => {
    expect(shortName(person("m", "Michelle Lee", { full_name: "Michelle Lee" }))).toBe("Michelle");
    expect(shortName(person("a", "Aunt Linda", { full_name: null }))).toBe("Aunt Linda");
    // A record that doesn't say where its name came from reads as before.
    expect(shortName(person("b", "Ben Carter"))).toBe("Ben");
    expect(shortName(person("c", "Cutie Pie", { full_name: "Cutie Pie", nicknames: ["Wifey Liu", "Wifey"] }))).toBe("Cutie Pie");
  });

  it("a rename keeps the earlier full name, and its first name only where a memory of theirs used it", () => {
    expect(aliasesAfterRename(wifey, "Cutie Pie", ["Wifey has a new job she's really excited about"])).toEqual(["Wifey Liu", "Wifey"]);
    expect(aliasesAfterRename(wifey, "Cutie Pie", ["She got promoted"])).toEqual(["Wifey Liu"]);
    // Renamed back: the name in use is never also an earlier one.
    expect(aliasesAfterRename(person("c", "Cutie Pie", { nicknames: ["Wifey Liu", "Wifey"] }), "Wifey", [])).toEqual(["Wifey Liu", "Cutie Pie"]);
  });
});

describe("I12: which words name whom, recorded with the line", () => {
  it("each person's own words, as written: the longest name written once, possessive or not", () => {
    expect(recordMentions("Ben's new job starts Monday", [{ person: ben }])).toEqual([{ person_id: "b", text: "Ben", name: "Ben Oxnard" }]);
    expect(recordMentions("Ben Oxnard got the job", [{ person: ben }])).toEqual([{ person_id: "b", text: "Ben Oxnard", name: "Ben Oxnard" }]);
    // The user's own word for them, when it is how the line was resolved to them.
    expect(recordMentions("Wifey got a raise", [{ person: kaiya, also: ["Wifey"] }])).toEqual([{ person_id: "k", text: "Wifey", name: "Kaiya" }]);
  });

  it("never a guess: a name written twice, a word two of its people share, a pronoun or a family word", () => {
    expect(findMention("Ben told Ben's mom", ["Ben"])).toBeNull();
    expect(recordMentions("Sam and Sam's mom went", [{ person: person("s", "Sam Eden", { full_name: "Sam Eden" }) }])).toEqual([]);
    const two = [{ person: person("s1", "Sam Eden", { full_name: "Sam Eden" }) }, { person: person("s2", "Sam Doughty", { full_name: "Sam Doughty" }) }];
    expect(recordMentions("Sam went to the park", two)).toEqual([]);
    expect(recordMentions("She got promoted", [{ person: kaiya, also: ["She"] }])).toEqual([]);
    expect(recordMentions("Mom got promoted", [{ person: kaiya, also: ["Mom"] }])).toEqual([]);
    expect(findMention("Benjamin got the job", ["Ben"])).toBeNull();
  });

  it("an earlier name of theirs is recorded as earlier (no name), never their current one", () => {
    const loo = person("l", "Loo Loo", { full_name: "Loo Loo", nicknames: ["Cutie Pie", "Boo Boo"] });
    expect(recordMentions("Cutie Pie got a raise", [{ person: loo }])).toEqual([{ person_id: "l", text: "Cutie Pie", name: null }]);
    expect(recordMentions("Wifey got a raise", [{ person: loo, also: ["Wifey"], earlier: ["Wifey"] }])).toEqual([{ person_id: "l", text: "Wifey", name: null }]);
    expect(recordMentions("Loo Loo got a raise", [{ person: loo }])).toEqual([{ person_id: "l", text: "Loo Loo", name: "Loo Loo" }]);
  });

  it("only well-formed records are read back", () => {
    expect(mentionsOf([{ person_id: "a", text: "Ben", name: null }, { person_id: 3, text: "x" }, { text: "y", name: null }, null, "no"]))
      .toEqual([{ person_id: "a", text: "Ben", name: null }]);
    expect(mentionsOf(undefined)).toEqual([]);
  });
});

describe("I12, decision 1b: what a line reads after a rename", () => {
  const loo = person("w", "Loo Loo", { full_name: "Loo Loo", nicknames: ["Cutie Pie", "Boo Boo"] });
  const everyone = [loo, kaiya, ben];
  const her = (text: string, name: string | null): PersonMention[] => [{ person_id: "w", text, name }];

  it("words recorded under an earlier name show the name she goes by now, possessive and all", () => {
    expect(withMentionNames("Wifey got promoted", her("Wifey", null), everyone, ["w"])).toBe("Loo Loo got promoted");
    expect(withMentionNames("Wifey's promotion is Monday", her("Wifey", null), everyone, ["w"])).toBe("Loo Loo's promotion is Monday");
    expect(withMentionNames("Cutie Pie said she might move", her("Cutie Pie", "Cutie Pie"), everyone, ["w"])).toBe("Loo Loo said she might move");
  });

  it("the user's own words stay until she is explicitly renamed: 'Liz got promoted' while she is Elizabeth Chen", () => {
    const liz = person("e", "Elizabeth Chen", { full_name: "Elizabeth Chen" });
    const said: PersonMention[] = [{ person_id: "e", text: "Liz", name: "Elizabeth Chen" }];
    expect(withMentionNames("Liz got promoted", said, [liz], ["e"])).toBe("Liz got promoted");
    const lizzie = { ...liz, display_name: "Lizzie", full_name: "Lizzie", nicknames: ["Elizabeth Chen"] };
    expect(withMentionNames("Liz got promoted", said, [lizzie], ["e"])).toBe("Lizzie got promoted");
  });

  it("only the words recorded for her, only on a line about her, only when written once", () => {
    expect(withMentionNames("Wifey has a new job", her("Wifey", null), everyone, ["b"])).toBe("Wifey has a new job");
    expect(withMentionNames("Wifeyish things", her("Wifey", null), everyone, ["w"])).toBe("Wifeyish things");
    expect(withMentionNames("Wifey told Wifey's sister", her("Wifey", null), everyone, ["w"])).toBe("Wifey told Wifey's sister");
    // No record (an older line the backfill couldn't fill): left exactly as written.
    expect(withMentionNames("Wifey got promoted", [], everyone, ["w"])).toBe("Wifey got promoted");
  });
});

describe("I13: a line moved to the right person", () => {
  const benWords: PersonMention[] = [{ person_id: "b", text: "Ben", name: "Ben Oxnard" }];

  it("the recorded words naming the wrong person become the right one's name", () => {
    expect(withSubjectReassigned("Ben's new job starts Monday", benWords, "b", { person: josh }))
      .toEqual({ statement: "Josh's new job starts Monday", mentions: [{ person_id: "j", text: "Josh", name: "Josh" }] });
    const sarahBen: PersonMention[] = [{ person_id: "s", text: "Sarah", name: "Sarah" }, ...benWords];
    expect(withSubjectReassigned("Sarah and Ben went to Tahoe", sarahBen, "b", { person: josh }).statement).toBe("Sarah and Josh went to Tahoe");
    const wifeyWords: PersonMention[] = [{ person_id: "w", text: "Wifey", name: "Wifey Liu" }];
    expect(withSubjectReassigned("You and Wifey are getting ice cream", wifeyWords, "w", { person: kaiya }).statement).toBe("You and Kaiya are getting ice cream");
  });

  it("a held line's open 'who?' takes the chosen person's name", () => {
    const asked: PersonMention[] = [{ person_id: null, text: "Anthony", name: null }];
    expect(withSubjectReassigned("Anthony loves watching Dragonball Z", asked, null, { person: person("c", "Chris", { full_name: null }) }))
      .toEqual({ statement: "Chris loves watching Dragonball Z", mentions: [{ person_id: "c", text: "Chris", name: "Chris" }] });
  });

  it("the words stay when the right person goes by them (a Samantha called Sam), or when nothing recorded names the wrong one", () => {
    const sam: PersonMention[] = [{ person_id: "s", text: "Sam", name: "Sam Eden" }];
    const samantha = person("sr", "Samantha Reyes", { full_name: "Samantha Reyes" });
    expect(withSubjectReassigned("Sam got the job", sam, "s", { person: samantha, also: ["Sam"] }))
      .toEqual({ statement: "Sam got the job", mentions: [{ person_id: "sr", text: "Sam", name: "Samantha Reyes" }] });
    expect(withSubjectReassigned("She has a new job", [], "w", { person: kaiya }).statement).toBe("She has a new job");
    expect(withSubjectReassigned("John is Ben's brother", [{ person_id: "x", text: "John", name: "John" }], "b", { person: josh }).statement)
      .toBe("John is Ben's brother");
  });

  it("moved to someone the line already names: never 'Sam and Sam'", () => {
    const both: PersonMention[] = [{ person_id: "m", text: "Michelle", name: "Michelle Lee" }, { person_id: "s", text: "Sam", name: "Sam Eden" }];
    expect(withSubjectReassigned("Michelle and Sam might move", both, "m", { person: person("s", "Sam Eden", { full_name: "Sam Eden" }) }).statement)
      .toBe("Michelle and Sam might move");
  });
});

describe("the user's own edit wins (contract §7.4)", () => {
  it("words they keep are theirs under the current name; words they replace no longer count", () => {
    const loo = person("w", "Loo Loo", { full_name: "Loo Loo", nicknames: ["Cutie Pie"] });
    const was: PersonMention[] = [{ person_id: "w", text: "Wifey", name: null }];
    expect(mentionsAfterEdit("Wifey got a big raise", was, [{ person: loo }])).toEqual([{ person_id: "w", text: "Wifey", name: "Loo Loo" }]);
    expect(mentionsAfterEdit("Loo Loo got a big raise", was, [{ person: loo }])).toEqual([{ person_id: "w", text: "Loo Loo", name: "Loo Loo" }]);
    expect(mentionsAfterEdit("Got a big raise", was, [{ person: loo }])).toEqual([]);
  });
});
