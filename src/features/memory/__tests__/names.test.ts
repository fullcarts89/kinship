// Founder I12 and I13 (CC-18): how a person's name is said, found and moved
// in a memory's words. Whole words only, possessives included; nothing about
// anyone else; a line that doesn't name the wrong person keeps its words.
import {
  aliasesAfterRename,
  shortName,
  withCurrentNames,
  withSubjectMoved,
  type NamedPerson,
} from "../../../../supabase/functions/_shared/extraction/names";

const person = (id: string, display_name: string, more: Partial<NamedPerson> = {}): NamedPerson => ({ id, display_name, ...more });
const wifey = person("w", "Wifey Liu", { full_name: "Wifey Liu" });
const kaiya = person("k", "Kaiya");
const ben = person("b", "Ben Oxnard", { full_name: "Ben Oxnard" });
const josh = person("j", "Josh Patel", { full_name: "Josh Patel" });

describe("I13: moving a line to the right person", () => {
  it("renames the subject it leads with, possessive included", () => {
    expect(withSubjectMoved("Wifey has a new job she's really excited about", wifey, kaiya)).toBe("Kaiya has a new job she's really excited about");
    expect(withSubjectMoved("Wifey Liu has a new job", wifey, kaiya)).toBe("Kaiya has a new job");
    expect(withSubjectMoved("Ben's new job starts Monday", ben, josh)).toBe("Josh's new job starts Monday");
    expect(withSubjectMoved("Ben and Sarah went to Tahoe", ben, josh)).toBe("Josh and Sarah went to Tahoe");
    expect(withSubjectMoved("Sarah and Ben went to Tahoe", ben, josh)).toBe("Sarah and Josh went to Tahoe");
    expect(withSubjectMoved("You and Wifey are getting ice cream", wifey, kaiya)).toBe("You and Kaiya are getting ice cream");
  });

  it("leaves the words alone when the line doesn't name the wrong person as its subject", () => {
    expect(withSubjectMoved("She has a new job", wifey, kaiya)).toBeNull();
    expect(withSubjectMoved("John is Ben's brother", ben, josh)).toBeNull();
    expect(withSubjectMoved("Wifey's friend from work is moving to Seattle", wifey, kaiya)).toBeNull();
    expect(withSubjectMoved("Benjamin got the job", ben, josh)).toBeNull();
    expect(withSubjectMoved("The new job starts Monday", ben, josh)).toBeNull();
  });
});

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

  it("shows the current name where an earlier one was written, as a whole word, only for that person", () => {
    const cutie = person("w", "Cutie Pie", { full_name: "Cutie Pie", nicknames: ["Wifey Liu", "Wifey"] });
    const everyone = [cutie, kaiya, ben];
    expect(withCurrentNames("Wifey has a new job she's really excited about", [cutie], everyone)).toBe("Cutie Pie has a new job she's really excited about");
    expect(withCurrentNames("Wifey's promotion is Monday", [cutie], everyone)).toBe("Cutie Pie's promotion is Monday");
    expect(withCurrentNames("Wifeyish things", [cutie], everyone)).toBe("Wifeyish things");
    // Not her memory: never renamed.
    expect(withCurrentNames("Wifey has a new job", [ben], everyone)).toBe("Wifey has a new job");
    // An earlier name that is someone else's name now: left as written.
    const otherWifey = person("x", "Wifey", { full_name: "Wifey" });
    expect(withCurrentNames("Wifey has a new job", [cutie], [...everyone, otherWifey])).toBe("Wifey has a new job");
  });
});
