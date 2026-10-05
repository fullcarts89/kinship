// Setup's rules (plan E16, T7, T8; contract §7–§8): nothing pre-selected,
// suggestions are a short alphabetical list (never a ranking), birthdays are
// the contact's own, "already worth knowing" is only what's true, and a
// half-finished setup resumes.
import {
  birthdayIso, buildPickLists, looksLikeFamily, needsSetup, nextBirthday, resumeStep, searchRows, setupSteps, stepLabel,
  whenFromToday, worthKnowing, type DeviceContact,
} from "../setupModel";

const TODAY = "2026-10-05"; // a Monday
const none = { contactRefs: new Set<string>(), names: new Set<string>() };
const ids = (c: string) => `p-${c}`;

const contacts: DeviceContact[] = [
  { id: "c1", name: "Maya Okafor", birthday: { day: 10, month: 10, year: 1991 } },
  { id: "c2", name: "Mom" },
  { id: "c3", name: "Zed Plumber" },
  { id: "c4", name: "Ben Carter", birthday: { day: 3, month: 2 } },
  { id: "c5", name: "Uncle Ray" },
  { id: "c6", name: "  " },
  { id: "c7", name: "Grandmaster Flash" },
];

it("suggests family names and birthdays within a month, alphabetically; everyone else is listed too", () => {
  const l = buildPickLists(contacts, { today: TODAY, existing: none, newId: ids });
  expect(l.suggested.map((r) => r.name)).toEqual(["Maya Okafor", "Mom", "Uncle Ray"]);
  expect(l.everyone.map((r) => r.name)).toEqual(["Ben Carter", "Grandmaster Flash", "Zed Plumber"]);
  expect(l.suggested.find((r) => r.name === "Maya Okafor")?.why).toBe("Birthday · 10 October");
  expect(l.suggested.find((r) => r.name === "Mom")?.why).toBe("Family");
  expect(l.everyone.find((r) => r.name === "Ben Carter")?.why).toBe("Birthday · 3 February");
});

it("keeps the id it will save under, so the sprig never changes", () => {
  const l = buildPickLists(contacts, { today: TODAY, existing: none, newId: ids });
  expect(l.suggested[0].personId).toBe("p-c1");
  expect(l.suggested[0].contactId).toBe("c1");
});

it("leaves out people already here, by contact or by name", () => {
  const l = buildPickLists(contacts, { today: TODAY, existing: { contactRefs: new Set(["c1"]), names: new Set(["mom"]) }, newId: ids });
  const names = [...l.suggested, ...l.everyone].map((r) => r.name);
  expect(names).not.toContain("Maya Okafor");
  expect(names).not.toContain("Mom");
});

it("family means a whole word, not a fragment", () => {
  expect(looksLikeFamily({ name: "Grandma Jo" })).toBe(true);
  expect(looksLikeFamily({ name: "Grandmaster Flash" })).toBe(false);
  expect(looksLikeFamily({ name: "Sam", nickname: "Sis" })).toBe(true);
});

it("birthdays: month and day from the contact; a missing year is not invented", () => {
  expect(birthdayIso({ day: 10, month: 10, year: 1991 })).toEqual({ iso: "1991-10-10", yearKnown: true });
  expect(birthdayIso({ day: 3, month: 2 })).toEqual({ iso: "2000-02-03", yearKnown: false });
  expect(birthdayIso({ day: 31, month: 4 })).toBeNull();
  expect(nextBirthday("1991-10-10", TODAY)).toBe("2026-10-10");
  expect(nextBirthday("1991-10-01", TODAY)).toBe("2027-10-01");
  expect(nextBirthday("2000-02-29", "2027-02-01")).toBe("2027-02-28");
  expect(nextBirthday("2000-02-29", "2028-02-01")).toBe("2028-02-29");
});

it("already worth knowing: real birthdays within two weeks, soonest first; nothing invented", () => {
  const people = [
    { id: "a", name: "Maya Okafor", birthday: "1991-10-10" },
    { id: "b", name: "Ben", birthday: "2000-10-05" },
    { id: "c", name: "Chris", birthday: "1990-12-25" },
    { id: "d", name: "Dana", birthday: null },
  ];
  expect(worthKnowing(people, TODAY)).toEqual([
    { personId: "b", text: "It's Ben's birthday today.", provenance: "From Contacts" },
    { personId: "a", text: "Maya's birthday is Saturday.", provenance: "From Contacts" },
  ]);
  expect(worthKnowing([{ id: "d", name: "Dana", birthday: null }], TODAY)).toEqual([]);
  expect(whenFromToday("2026-10-06", TODAY)).toBe("tomorrow");
  expect(whenFromToday("2026-10-15", TODAY)).toBe("on 15 October");
});

it("search finds people in both lists", () => {
  const l = buildPickLists(contacts, { today: TODAY, existing: none, newId: ids });
  expect(searchRows(l, "ray").map((r) => r.name)).toEqual(["Uncle Ray"]);
  expect(searchRows(l, "  ")).toEqual([]);
});

it("steps: consent only when needed; labels follow board 1; resume where it stopped", () => {
  expect(setupSteps(true)).toEqual(["consent", "people", "worth"]);
  expect(setupSteps(false)).toEqual(["people", "worth"]);
  expect(stepLabel("people", setupSteps(false))).toBe("Setting up · 1 of 2");
  expect(stepLabel("worth", setupSteps(true))).toBe("Setting up · 3 of 3");
  expect(resumeStep("worth", setupSteps(false))).toBe("worth");
  expect(resumeStep("consent", setupSteps(false))).toBe("people");
  expect(resumeStep(null, setupSteps(true))).toBe("consent");
});

it("a new account sets up; an account with anything in it doesn't; a setup under way resumes", () => {
  expect(needsSetup({ done: false, inProgress: false, people: 0, notes: 0 })).toBe(true);
  expect(needsSetup({ done: false, inProgress: false, people: 3, notes: 0 })).toBe(false);
  expect(needsSetup({ done: false, inProgress: false, people: 0, notes: 1 })).toBe(false);
  expect(needsSetup({ done: false, inProgress: true, people: 3, notes: 0 })).toBe(true);
  expect(needsSetup({ done: true, inProgress: true, people: 0, notes: 0 })).toBe(false);
});
