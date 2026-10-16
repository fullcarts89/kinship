// K25 (founder device check, 16 Oct): "Who is Matt?" for someone not in People is answered with the user's
// own contact. Through the real screens, the local backend and the real ai-gateway, with the founder's People:
// the note is held, Choose from Contacts opens the system picker (the OS boundary, set by the test), the
// person that contact is is added once (or reused), the answer files the line on them, and no second Matt
// ever appears. A cancel leaves the question as it was, with Add Matt still there.
import { canTap, mount, setUp, settle, signedIn, tap, tell, texts, until } from "./app";
import { serverRows, useReply as chooseReply } from "./localStack";
import { harness } from "./state";

const NOTE = "I need to call Matt tomorrow";
const PEOPLE = ["Anthony", "Anthony Lopez", "Sam Eden", "Sam Doughty", "Chris", "Ben", "John"];
const MATT = { id: "contact-matt-jones", name: "Matt Jones", nickname: null, birthday: { day: 14, month: 3, year: null } };
type PersonRow = { id: string; display_name: string; contact_ref: string | null; state: string; deleted_at: string | null; birthday_source: string | null };
type ItemRow = { person_id: string; statement: string; status: string; deleted_at: string | null };

async function heldAndAsked(r: Parameters<typeof tap>[0]) {
  await until(r, (s) => s.includes("Who is Matt?") || s.some((t) => /^One thing to check about/u.test(t)), "Who is Matt?", 30000);
  const waiting = texts(r).find((t) => /^One thing to check about/u.test(t));
  if (waiting && !texts(r).includes("Who is Matt?")) await tap(r, waiting);
  await until(r, (s) => s.includes("Who is Matt?"), "the question", 10000);
}

it("K25: Choose from Contacts → Matt Jones, added once from the contact; the line is his; no second Matt", async () => {
  await chooseReply(NOTE, "hand: promise, Matt not in People");
  const acct = await signedIn();
  const r = await mount();
  await setUp(r, PEOPLE);
  await tell(r, NOTE);
  await heldAndAsked(r);
  expect(texts(r)).toEqual(expect.arrayContaining(["Choose from Contacts", "Add Matt"]));
  harness.contactPick = MATT;
  await tap(r, "Choose from Contacts");
  await until(r, (s) => s.some((t) => /^Kept for Matt/u.test(t)), "kept for Matt Jones", 30000);
  await settle(500);
  await acct.engine.sync();
  const people = (await serverRows<PersonRow>("people", acct.userId)).filter((p) => !p.deleted_at && /Matt/u.test(p.display_name));
  expect(people.map((p) => [p.display_name, p.contact_ref, p.birthday_source])).toEqual([["Matt Jones", "contact-matt-jones", "contacts"]]);
  const lines = (await serverRows<ItemRow>("memory_items", acct.userId)).filter((m) => m.status === "active" && !m.deleted_at && /Matt/u.test(m.statement));
  expect(lines.map((m) => m.person_id)).toEqual([people[0].id]);
  harness.contactPick = null;
});

it("K25: the contact is already someone here (by another name): reused, never a second person", async () => {
  await chooseReply(NOTE, "hand: promise, Matt not in People");
  const acct = await signedIn();
  const r = await mount();
  await setUp(r, PEOPLE);
  const matthew = await acct.repos.people.addPicked({ name: "Matthew", contactId: MATT.id, birthday: null, birthdayYearKnown: false });
  await acct.engine.sync();
  await tell(r, NOTE);
  await heldAndAsked(r);
  harness.contactPick = MATT;
  await tap(r, "Choose from Contacts");
  await until(r, (s) => s.some((t) => /^Kept for Matthew/u.test(t)), "kept for Matthew", 30000);
  await acct.engine.sync();
  const people = (await serverRows<PersonRow>("people", acct.userId)).filter((p) => !p.deleted_at && /Matt/u.test(p.display_name));
  expect(people.map((p) => p.id)).toEqual([matthew.id]);
  harness.contactPick = null;
});

it("K25: cancelled in the picker (or Contacts unavailable): the question stays, Add Matt still adds him by name", async () => {
  await chooseReply(NOTE, "hand: promise, Matt not in People");
  const acct = await signedIn();
  const r = await mount();
  await setUp(r, PEOPLE);
  await tell(r, NOTE);
  await heldAndAsked(r);
  harness.contactPick = null;
  await tap(r, "Choose from Contacts");
  await settle(500);
  expect(texts(r)).toEqual(expect.arrayContaining(["Who is Matt?", "Add Matt"]));
  await tap(r, "Add Matt");
  await until(r, (s) => s.some((t) => /^Kept for Matt/u.test(t)), "kept for Matt", 30000);
  await acct.engine.sync();
  const people = (await serverRows<PersonRow>("people", acct.userId)).filter((p) => !p.deleted_at && /Matt/u.test(p.display_name));
  expect(people.map((p) => [p.display_name, p.contact_ref])).toEqual([["Matt", null]]);
  expect(canTap(r, "Choose from Contacts")).toBe(false);
});
