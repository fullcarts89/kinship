// The hand-off and return loop (founder H10, H11, H18): Kinship opens the
// conversation, the user comes back (or the app was closed meanwhile), and
// Today asks about that conversation by its reason. "Not yet" keeps the
// moment; "Yes" records the contact and carries the reason into what's next.
// All of it survives closing the app.
import { randomUUID } from "crypto";
import { buildToday, type TodayInput } from "@/features/today/todayModel";
import { ReasonLocal } from "@/store/reasonLocal";
import { repositoriesFor, type MemoryItem, type Person } from "@/store/repositories";
import { prepareSchema } from "@/store/schema";
import { UserStore } from "@/store/userStore";
import { openSqlJsDb } from "@/test-utils/sqljsDb";

const A = "aaaaaaaa-0000-4000-8000-0000000000f1";
const NOW = new Date(2026, 9, 12, 9, 0);

async function device(file: string) {
  const db = await openSqlJsDb(file);
  await prepareSchema(db, A);
  const store = new UserStore(db, A, { now: () => NOW.toISOString(), newId: randomUUID });
  return { db, store, local: new ReasonLocal(store), repos: repositoriesFor(store) };
}

const ben = { id: "ben", display_name: "Ben Oxnard", state: "active" } as unknown as Person;
const promoted = {
  id: "n1", kind: "fact", person_id: "ben", statement: "Ben got promoted", detail: { category: "work", date: "2026-10-11", date_precision: "day" },
  certainty: "stated", status: "active", sensitivity: "none", user_state: "unreviewed", subject_type: "person", origin: "extracted",
  created_at: "2026-10-11T18:00:00Z",
} as unknown as MemoryItem;

async function today(local: ReasonLocal, at = NOW) {
  const s = await local.read();
  const input: TodayInput = {
    now: at, today: "2026-10-12", reasons: [], items: [promoted], people: [ben], local: s.local, primaries: s.primaries,
    handoff: s.handoff, told: 1, questions: 0, toLookAt: 0, provenance: () => null, activated: true,
  };
  return buildToday(input);
}

it("Congratulate Ben → Messages → app closed → reopened: the question waits, with its reason; Not yet keeps the moment; Yes ends it", async () => {
  const file = `loop-${randomUUID()}`;
  let d = await device(file);
  const first = await today(d.local);
  expect(first.moment?.primary.label).toBe("Congratulate Ben");
  const m = first.moment!;

  // Tapping Message: remembered before Messages opens.
  await d.local.handedOff({ reasonId: m.reasonId, personId: "ben", channel: "text", at: NOW.toISOString(), ask: m.ask, about: m.statement, followUp: m.followUp });
  // The app is closed in Messages, then opened again.
  d.db.persist();
  d = await device(file);
  const back = await today(d.local, new Date(NOW.getTime() + 60_000));
  expect(back.moment).toBeNull(); // the moment isn't asked twice
  expect(back.returnCheck).toMatchObject({ ask: "Did you congratulate Ben on the promotion?", about: "Ben got promoted" });

  // "Not yet": the moment is there again, and nothing was recorded as a contact.
  await d.local.answered("not_yet", NOW.toISOString());
  const notYet = await today(d.local);
  expect(notYet.returnCheck).toBeNull();
  expect(notYet.moment?.reasonId).toBe(m.reasonId);
  expect(await d.repos.contacts.forPerson("ben")).toEqual([]);

  // Again, then "Yes": the contact is the user's word, and the moment is done, even after a restart.
  await d.local.handedOff({ reasonId: m.reasonId, personId: "ben", channel: "text", at: NOW.toISOString(), ask: m.ask, about: m.statement, followUp: m.followUp });
  const h = await d.local.answered("yes", NOW.toISOString());
  expect(h?.followUp).toBe("Anything worth remembering from congratulating Ben?");
  await d.repos.contacts.confirm({ person_id: "ben", channel: "text", source: "manual" });
  d.db.persist();
  d = await device(file);
  const after = await today(d.local);
  expect([after.moment, after.returnCheck]).toEqual([null, null]);
  expect((await d.repos.contacts.forPerson("ben")).length).toBe(1);
});

it("if the app never opened, nothing was handed off", async () => {
  const d = await device(`loop-${randomUUID()}`);
  const m = (await today(d.local)).moment!;
  await d.local.handedOff({ reasonId: m.reasonId, personId: "ben", channel: "text", at: NOW.toISOString(), ask: m.ask });
  await d.local.cancel(m.reasonId);
  const v = await today(d.local);
  expect([v.returnCheck, v.moment?.reasonId]).toEqual([null, m.reasonId]);
});
