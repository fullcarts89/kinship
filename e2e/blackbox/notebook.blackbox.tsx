// The Moment Deck × Notebook × Showing Up journeys (PR #77; founder directive 2 Nov 2026) through the real
// screens with the notebook_deck flag on for the local test account alone, the real session classes, the
// local backend and this branch's ai-gateway. With GATEWAY_URL at a gateway that has the model key (no
// stub), every note is read by the live model: LIVE-MODEL evidence. Stand-ins as every black-box suite:
// sql.js for SQLCipher, mocked routing, auth context, safe area, contacts and the OS hand-off.
//
//   J1  a grounded Moment → why it matters → Message → back → Yes → "Anything worth remembering?" → Tell
//   J2  a long messy note → the review with your words → questions answered → Done; Undo removes it all
//   J3  search a remembered word → the person's Pages at that note
//   J4  ideas behind the explicit control → an idea quoting the user's words → Keep it in mind (an intention)
//   J5  an idea on the user's own promise → only a day added (nothing doubles) → I did this (kept, not contact)
//   J6  what happened, told back → stored through the pipeline; nothing already known doubles
import { execFileSync } from "child_process";
import { act } from "react-test-renderer";
import { canTap, mount, setUp, settle, show, signedIn, tap, texts, type, until } from "./app";
import { appState } from "./k20flow";
import { earlierLine, serverRows } from "./localStack";
import { harness } from "./state";

const SQL = (sql: string) => execFileSync("docker", ["exec", "-i", "supabase_db_kinship", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q"], { input: sql, stdio: ["pipe", "ignore", "pipe"] });

/** The notebook experience for this local account alone (never global, never production). */
function notebookOn(userId: string): void {
  if (!/^[0-9a-f-]{36}$/u.test(userId)) throw new Error("ids only");
  SQL(`insert into public.user_flag_overrides (user_id, flag_key, enabled) values ('${userId}', 'notebook_deck', true) on conflict do nothing;`);
}

/** Seeded rows keep their day as updated_at, which a pull never reaches: touching them stamps now. Local only. */
function touchSeeded(userId: string): void {
  if (!/^[0-9a-f-]{36}$/u.test(userId)) throw new Error("ids only");
  SQL(`update public.memory_items set statement = statement where user_id = '${userId}';
    update public.memory_item_sources set span_start = span_start where user_id = '${userId}';
    update public.captures set status = status where user_id = '${userId}';`);
}

const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
function day(n: number, hour = 12): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hour, 0, 0, 0);
  return d;
}

type Item = { id: string; kind: string; person_id: string; subject_type: string; statement: string; status: string; origin: string; user_state: string; sensitivity: string; deleted_at: string | null; detail: Record<string, unknown> };
type Capture = { id: string; raw_text: string; status: string; deleted_at: string | null };
type Contact = { person_id: string; source: string; deleted_at: string | null };
type Source = { memory_item_id: string; capture_id: string | null; source_kind: string; deleted_at: string | null };

async function account(people: string[]) {
  const acct = await signedIn();
  notebookOn(acct.userId);
  const r = await mount();
  await setUp(r, people);
  const list = await acct.repos.people.list();
  const person = (name: string) => list.find((p) => p.display_name === name)!;
  return { acct, r, person };
}
type Account = Awaited<ReturnType<typeof account>>;

const items = async (a: Account, personId?: string) => (await serverRows<Item>("memory_items", a.acct.userId))
  .filter((m) => !m.deleted_at && (!personId || m.person_id === personId));
const press = async (a: Account, testID: string) => {
  const t = a.r.root.findAll((n) => n.props.testID === testID && typeof n.props.onPress === "function");
  if (!t.length) throw new Error(`nothing with testID ${testID}. On screen: ${JSON.stringify(texts(a.r))}`);
  await act(async () => { await t[0].props.onPress(); });
  await settle(200);
};
async function synced(a: Account) {
  await a.acct.engine.sync();
  await settle(300);
  await a.acct.engine.sync();
}
/** Tells through the notebook Tell page: the pill, the paper, Keep. */
async function tellOnPage(a: Account, words: string) {
  await type(a.r, /^Tell Kinship$/u, words);
  await tap(a.r, "Keep");
}
/** The app's own understanding tick, which the harness has no provider for (bounded, never tight). */
async function understood(a: Account, ok: (s: string[]) => boolean, what: string) {
  for (let i = 0; i < 8; i++) {
    if (ok(texts(a.r))) return;
    await harness.session!.understanding.run().catch(() => undefined);
    await a.acct.engine.sync().catch(() => undefined);
    try {
      await until(a.r, ok, what, 15000);
      return;
    } catch {
      // the next tick
    }
  }
  throw new Error(`timed out: ${what}. On screen: ${JSON.stringify(texts(a.r))}`);
}

describe("notebook journeys", () => {
  it("J1 + J4 + J6: Ben's marathon comes back as a poster; ideas only on request; Message, back, Yes; what happened becomes memory without doubling", async () => {
    const a = await account(["Ben", "Maya"]);
    const ben = a.person("Ben");
    earlierLine(a.acct.userId, {
      kind: "event", personId: ben.id, subject: "person", statement: "Ben is running the New York Marathon",
      detail: { date: isoDay(day(-1)), date_precision: "day", event_type: "race", followup_policy: "after", event_goal: "break four hours" },
      at: day(-25).toISOString(),
    });
    earlierLine(a.acct.userId, {
      kind: "fact", personId: ben.id, subject: "person", statement: "Ben loves trail running",
      detail: { category: "interest", value: "trail running" }, at: day(-20).toISOString(),
    });
    touchSeeded(a.acct.userId);
    await synced(a);
    // Today's reasons, refreshed by hand after seeding (the app's own refresh is throttled to ten minutes).
    await harness.session!.reasons.refresh({ force: true, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
    await synced(a);

    // J1: the poster, grounded in the user's words, from the unchanged eligibility rules.
    await show(a.r, { screen: "today" });
    await until(a.r, (s) => s.some((t) => /Ben/u.test(t) && /how did it go|marathon/iu.test(t)), "Ben's Moment as the poster", 20000);
    const poster = texts(a.r);
    expect(poster.some((t) => /^Yesterday · /u.test(t))).toBe(true);
    expect(poster).toContain("Ben was hoping to break four hours.");
    // Ideas are never on the card (DN-5).
    expect(poster).not.toContain("Ideas for showing up");

    // The expanded moment: why now, the source, and the ideas control (closed).
    await press(a, "moment-poster");
    await until(a.r, (s) => s.includes("It was yesterday."), "the expanded moment", 5000);
    const moment = texts(a.r);
    expect(moment).toContain("Open Ben's notebook");
    const hasIdeas = moment.includes("Ideas for showing up");
    if (hasIdeas) {
      await press(a, "ideas-toggle");
      const ideas = texts(a.r);
      // Every idea quotes the user's own words, with a source.
      expect(ideas.some((t) => /^“.+”$/u.test(t))).toBe(true);
    }

    // Message: the OS opens Messages; nothing is recorded by opening it (T12).
    await press(a, "moment-primary");
    await until(a.r, () => harness.opens.length > 0 || canTap(a.r, "Open Messages"), "Messages to open", 5000);
    if (!harness.opens.length) await tap(a.r, "Open Messages");
    expect(harness.opens.map((o) => o.channel)).toEqual(["text"]);
    await synced(a);
    expect((await serverRows<Contact>("contact_events", a.acct.userId)).filter((c) => !c.deleted_at)).toEqual([]);

    // Back: the return check asks its reason; Yes records one conversation.
    await appState("background");
    await appState("active");
    await show(a.r, { screen: "today" });
    await until(a.r, (s) => s.some((t) => /^Did you .*Ben/u.test(t)), "the return check", 10000);
    await tap(a.r, "Yes");
    await until(a.r, (s) => s.some((t) => /Anything worth remembering/u.test(t)), "Anything worth remembering?", 5000);
    await synced(a);
    expect((await serverRows<Contact>("contact_events", a.acct.userId)).filter((c) => !c.deleted_at).map((c) => [c.person_id, c.source])).toEqual([[ben.id, "return_check"]]);

    // J6: Tell Kinship → the page about Ben → what happened, with something already known said again.
    await tap(a.r, "Tell Kinship");
    await until(a.r, (s) => s.includes("About Ben. In your own words."), "the Tell page about Ben", 5000);
    const before = (await items(a, ben.id)).filter((m) => m.status === "active").length;
    await tellOnPage(a, "Ben finished the marathon in 3:52 and was over the moon. He still loves trail running.");
    await understood(a, (s) => s.includes("Here's what I'll remember.") || s.some((t) => /^Kept for/u.test(t)), "the note understood");
    await synced(a);
    const after = await items(a, ben.id);
    const live = after.filter((m) => m.status === "active");
    // What happened is kept from the new note, with its source; trail running, already known, is not doubled.
    const note = (await serverRows<Capture>("captures", a.acct.userId)).find((c) => c.raw_text.startsWith("Ben finished the marathon"))!;
    const sources = await serverRows<Source>("memory_item_sources", a.acct.userId);
    const fromNote = live.filter((m) => sources.some((x) => x.memory_item_id === m.id && x.capture_id === note.id && !x.deleted_at));
    expect(fromNote.some((m) => /3:52|finished/iu.test(m.statement))).toBe(true);
    expect(live.filter((m) => /trail running/iu.test(m.statement)).length).toBe(1);
    for (const m of live) expect(sources.some((x) => x.memory_item_id === m.id && !x.deleted_at)).toBe(true);
    // The earlier "running the marathon" line is closed by the news (told again), never left beside it as current.
    expect(after.filter((m) => m.status === "active" && /is running the New York Marathon/u.test(m.statement))).toEqual([]);
    void before;
  });

  it("J5 + J4: an idea on the user's own promise only adds a day; a new intention is a note and one promise; I did this keeps it, never contact", async () => {
    const a = await account(["Elena", "Rosa"]);
    const elena = a.person("Elena");
    const rosa = a.person("Rosa");
    earlierLine(a.acct.userId, {
      kind: "promise", personId: elena.id, subject: "user", statement: "Bring Elena dinner",
      detail: { due_date: isoDay(day(3)) }, at: day(-7).toISOString(),
    });
    earlierLine(a.acct.userId, {
      kind: "fact", personId: rosa.id, subject: "person", statement: "Rosa loves making ravioli",
      detail: { category: "interest", value: "making ravioli" }, at: day(-10).toISOString(),
    });
    touchSeeded(a.acct.userId);
    await synced(a);

    // Elena's Now lens: You said you'd; ideas behind the control.
    await show(a.r, { screen: "person", id: elena.id, params: { lens: "now" } });
    await until(a.r, (s) => s.some((t) => t.startsWith("Bring Elena dinner")), "Elena's promise on Now", 10000);
    await press(a, "ideas-toggle");
    await until(a.r, (s) => s.includes("Follow through on what you said"), "the follow-through idea", 5000);
    const promiseIdea = a.r.root.findAll((n) => typeof n.props.testID === "string" && n.props.testID.startsWith("idea-promise:") && typeof n.props.onPress === "function")[0];
    await act(async () => { await promiseIdea.props.onPress(); });
    await settle(200);
    await press(a, "way-keep");
    expect(texts(a.r)).toContain("You already said you'd do this");
    await tap(a.r, "Tomorrow");
    await press(a, "keep-save");
    await synced(a);
    const promises = (await items(a, elena.id)).filter((m) => m.kind === "promise");
    // Nothing new: the same promise, its day the user's edit.
    expect(promises).toHaveLength(1);
    expect(promises[0].detail.due_date).toBe(isoDay(day(1)));
    expect(promises[0].user_state).toBe("edited");

    // Rosa: an interest in the user's words → Keep it in mind → a note kept as written and one promise.
    await show(a.r, { screen: "person", id: rosa.id, params: { lens: "now" } });
    await until(a.r, (s) => s.some((t) => t.startsWith("Rosa loves making ravioli")), "Rosa's Now", 10000);
    if (process.env.DEBUG_IDEAS) console.log(JSON.stringify({ items: (await a.acct.store.list("memory_items")).filter((m) => m.person_id === rosa.id), sources: await a.acct.store.list("memory_item_sources") }));
    await press(a, "ideas-toggle");
    const idea = a.r.root.findAll((n) => typeof n.props.testID === "string" && n.props.testID.startsWith("idea-") && typeof n.props.onPress === "function")[0];
    await act(async () => { await idea.props.onPress(); });
    await settle(200);
    await press(a, "way-keep");
    await type(a.r, /^In your words/u, "Make ravioli with Rosa on Sunday");
    await press(a, "keep-save");
    await synced(a);
    const rosaPromises = (await items(a, rosa.id)).filter((m) => m.kind === "promise");
    expect(rosaPromises.map((m) => [m.statement, m.subject_type, m.origin, m.user_state])).toEqual([["Make ravioli with Rosa on Sunday", "user", "user", "user_authored"]]);
    const note = (await serverRows<Capture>("captures", a.acct.userId)).find((c) => c.raw_text === "Make ravioli with Rosa on Sunday")!;
    // Kept exactly as written and never sent for understanding.
    expect(note.status).toBe("skipped");
    const src = (await serverRows<Source>("memory_item_sources", a.acct.userId)).filter((s) => s.memory_item_id === rosaPromises[0].id && !s.deleted_at);
    expect(src.map((s) => [s.source_kind, s.capture_id])).toEqual([["capture", note.id]]);

    // I did this, from Elena's line: the promise is kept; no conversation is recorded.
    await show(a.r, { screen: "person", id: elena.id, params: { lens: "now" } });
    await until(a.r, (s) => s.some((t) => t.startsWith("Bring Elena dinner")), "Elena's promise", 10000);
    await tap(a.r, texts(a.r).find((t) => t.startsWith("Bring Elena dinner"))!);
    await until(a.r, () => canTap(a.r, "I did this"), "the line sheet with I did this", 5000);
    await tap(a.r, "I did this");
    await synced(a);
    expect((await items(a, elena.id)).find((m) => m.kind === "promise")!.status).toBe("resolved");
    expect((await serverRows<Contact>("contact_events", a.acct.userId)).filter((c) => !c.deleted_at)).toEqual([]);
  });

  it("J3: a remembered word finds its person and opens their Pages at that note", async () => {
    const a = await account(["Rosa", "Leo"]);
    const rosa = a.person("Rosa");
    earlierLine(a.acct.userId, {
      kind: "promise", personId: rosa.id, subject: "user", statement: "Bring Nonna the 00 flour",
      detail: {}, at: day(-29).toISOString(),
    });
    touchSeeded(a.acct.userId);
    await synced(a);
    await show(a.r, { screen: "people" });
    await type(a.r, /^Find someone, or something you told Kinship$/u, "flour");
    await until(a.r, (s) => s.includes("In what you told Kinship"), "word hits", 10000);
    await tap(a.r, texts(a.r).find((t) => /flour/iu.test(t) && !/^Find/u.test(t))!);
    const href = harness.pushes.find((h) => h.startsWith(`/v2/person/${rosa.id}?lens=pages&note=`));
    expect(href).toBeTruthy();
    const noteId = new URLSearchParams(href!.split("?")[1]).get("note")!;
    await show(a.r, { screen: "person", id: rosa.id, params: { lens: "pages", note: noteId } });
    await until(a.r, (s) => s.some((t) => /00 flour/u.test(t)), "Rosa's Pages with the note", 10000);
    expect(a.r.root.findAll((n) => n.props.testID === "target-note").length).toBeGreaterThan(0);
  });

  it("J2: a long messy note with two Sams, a relative, a sensitive line and a change: understood, asked, saved; Undo removes every line", async () => {
    const a = await account(["Priya", "Sam Delgado", "Sam Okafor", "Josh", "Leo"]);
    const priya = a.person("Priya");
    earlierLine(a.acct.userId, {
      kind: "fact", personId: priya.id, subject: "person", statement: "Priya lives in Lisbon",
      detail: { category: "home" }, at: day(-40).toISOString(),
    });
    touchSeeded(a.acct.userId);
    await synced(a);
    await show(a.r, { screen: "today" });
    await tap(a.r, "Tell Kinship something");
    await until(a.r, (s) => s.includes("About anyone. In your own words."), "the Tell page", 5000);
    const J2 = "Lunch with Priya today — she's back from Lisbon for good!! Moving into a place in Oakland on the 15th I think? or mid-month anyway. Her sister Anjali is flying in to help with the move. Her mom's knee surgery went fine but she's worried about her dad being on his own so much. Then Sam called — she got the promotion!!! I said I'd take her out to celebrate Friday, maybe the Thai place she loves. Oh and Leo — no wait, Josh — his interview got moved to Thursday at 10.";
    await tellOnPage(a, J2);
    await understood(a, (s) => s.includes("Here's what I'll remember.") || s.some((t) => /^(Which Sam|Who is this about|Needs your yes)/iu.test(t)), "the review or a question");
    const shown = texts(a.r);
    // Two Sams: one question, never a guess.
    await synced(a);
    const samIds = [a.person("Sam Delgado").id, a.person("Sam Okafor").id];
    const samLines = (await items(a)).filter((m) => samIds.includes(m.person_id) && m.status === "active");
    if (samLines.length) expect(shown.some((t) => /Sam/u.test(t))).toBe(true);
    // Nothing sensitive is memory before the user's yes.
    expect((await items(a)).filter((m) => m.sensitivity !== "none" && m.status === "active")).toEqual([]);
    // Answer what's asked: the pottery-studio Sam for "which Sam", Keep it for a sensitive line. Then the review or the Kept card.
    const answered: string[] = [];
    for (let i = 0; i < 20; i++) {
      const asking = texts(a.r).some((t) => /Sam/u.test(t) && /\?$/u.test(t));
      if (asking && !answered.includes("which Sam") && canTap(a.r, "Sam Delgado")) {
        await tap(a.r, "Sam Delgado");
        answered.push("which Sam");
        continue;
      }
      if (canTap(a.r, "Keep it")) {
        await tap(a.r, "Keep it");
        answered.push("keep it");
        continue;
      }
      const s = texts(a.r);
      if (s.includes("Here's what I'll remember.") || s.some((t) => /^Kept for/u.test(t))) break;
      await harness.session!.understanding.run().catch(() => undefined);
      await a.acct.engine.sync().catch(() => undefined);
      await settle(3000);
    }
    await synced(a);
    const kept = (await items(a)).filter((m) => m.status === "active");
    const named = (n: string) => kept.filter((m) => m.person_id === a.person(n).id);
    // The told person, and the correction mid-sentence ("Leo — no wait, Josh"): nothing filed on Leo.
    expect(named("Priya").length).toBeGreaterThan(1);
    expect(named("Josh").length).toBeGreaterThan(0);
    expect(named("Leo")).toEqual([]);
    // Two Sams: never a guess. Whatever Sam lines exist sit on the one the user chose, after the question.
    expect(named("Sam Okafor")).toEqual([]);
    if (named("Sam Delgado").length) expect(answered).toContain("which Sam");
    // Sensitive lines are memory only after the user's yes.
    if (kept.some((m) => m.sensitivity !== "none")) expect(answered).toContain("keep it");
    // Every live line has a source in this note or an earlier one.
    const sources = await serverRows<Source>("memory_item_sources", a.acct.userId);
    for (const m of kept) expect(sources.some((x) => x.memory_item_id === m.id && !x.deleted_at)).toBe(true);
    console.log(JSON.stringify({ j2: kept.map((m) => [a.acct.userId && m.person_id, m.kind, m.sensitivity, m.statement]), answered }));
    // Undo this note (from the review, or the Kept card): every line from it goes; the earlier Lisbon line stays.
    const undo = canTap(a.r, "Undo this note") ? "Undo this note" : canTap(a.r, "Undo") ? "Undo" : null;
    expect(undo).not.toBeNull();
    await tap(a.r, undo!);
    if (canTap(a.r, "Undo note")) await tap(a.r, "Undo note");
    await synced(a);
    const left = (await items(a)).filter((m) => m.status === "active");
    expect(left.map((m) => m.statement)).toEqual(["Priya lives in Lisbon"]);
  }, 480000);
});
