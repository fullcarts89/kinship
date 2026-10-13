// Run by returnStates.test.ts in a Jest of its own, with TZ set (Jest's
// process.env is a copy, so a zone can't change inside one run): K2 and K3
// count days on the phone's own calendar, never UTC (reviewer E, 13 Oct).
import { randomUUID } from "crypto";
import { buildToday, shownDay, type ReasonRow } from "@/features/today/todayModel";
import { portraitFor, todayIso } from "@/hooks/useV2";
import { repositoriesFor, type MemoryItem, type Person } from "@/store/repositories";
import { prepareSchema } from "@/store/schema";
import { UserStore } from "@/store/userStore";
import { openSqlJsDb } from "@/test-utils/sqljsDb";

const A = "aaaaaaaa-0000-4000-8000-0000000000f8";
const zone = process.env.TZ;
const tyler = { id: "tyler", display_name: "Tyler Shaffer", state: "active" } as unknown as Person;
const promise = (due: string) => ({
  id: "p1", kind: "promise", person_id: "tyler", subject_type: "person", statement: "Tyler said he'd send you his contractor's number",
  detail: { due_date: due }, certainty: "stated", status: "active", sensitivity: "none", user_state: "unreviewed", origin: "extracted",
  created_at: "2026-10-06T18:00:00Z",
}) as unknown as MemoryItem;
const day = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

if (zone === "Pacific/Kiritimati") {
  // Saturday Oct 10, 8am on Kiritimati (UTC+14); still Friday Oct 9 in UTC.
  const morning = new Date(Date.UTC(2026, 9, 9, 18));
  it("Kiritimati: today is Oct 10, and the morning after Tyler's day his promise is 'Waiting on Tyler', never Coming up", async () => {
    expect([day(morning), todayIso(morning), shownDay(morning)]).toEqual(["2026-10-10", "2026-10-10", "2026-10-10"]);
    const db = await openSqlJsDb(`tz-${randomUUID()}`);
    await prepareSchema(db, A);
    const store = new UserStore(db, A, { now: () => morning.toISOString(), newId: () => randomUUID() });
    await store.create("people", { id: "tyler", display_name: "Tyler Shaffer", state: "active" });
    await repositoriesFor(store).memory.remember({ id: "p1", kind: "promise", person_id: "tyler", statement: promise("2026-10-09").statement, detail: { due_date: "2026-10-09" } }, { userAuthored: true });
    const page = await portraitFor(repositoriesFor(store), tyler, morning);
    expect(page.comingUp.map((l) => l.statement)).toEqual([]);
    expect(page.lately.find((l) => l.itemId === "p1")?.when).toBe("Waiting on Tyler");
  });
} else if (zone === "Pacific/Pago_Pago") {
  // Friday Oct 9, 8pm on Pago Pago (UTC−11); already Saturday Oct 10 in UTC.
  const evening = new Date(Date.UTC(2026, 9, 10, 7));
  it("Pago Pago: today is Oct 9, and reaching Tyler that evening doesn't answer his promise for Oct 10", () => {
    expect([day(evening), todayIso(evening), shownDay(evening)]).toEqual(["2026-10-09", "2026-10-09", "2026-10-09"]);
    const v = buildToday({
      now: new Date(Date.UTC(2026, 9, 12, 20)), today: "2026-10-12", reasons: [] as ReasonRow[], items: [promise("2026-10-10")], people: [tyler],
      local: {}, primaries: [], handoff: null, told: 2, questions: 0, toLookAt: 0, provenance: () => null, activated: true,
      contacts: [{ person_id: "tyler", memory_item_id: "p1", occurred_at: evening.toISOString() }],
    });
    expect(v.quiet.find((q) => q.kind === "waiting")).toMatchObject({ label: "Waiting on Tyler" });
  });
} else {
  it("runs only in a zone it knows", () => {
    throw new Error(`unexpected zone ${zone}`);
  });
}
