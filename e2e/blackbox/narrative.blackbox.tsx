// CER-1 natural stories (founder, 30 Oct 2026; issue #63) through the real screens, the real session
// classes, the local backend and the real ai-gateway, with the live model's own proposal shapes replayed
// from e2e/replies/narrative-*.json (captured 30 Oct; live with LIVE=1). A person is named once and then
// "he"; relatives and pets are mentioned as objects; one note holds eleven things; one runs to three
// passages. Kinship keeps every line for the right person, asks no "Who is he?", and never says it
// couldn't get to all of it.
import { readFileSync } from "node:fs";
import { mount, setUp, settle, show, signedIn, tell, texts, until } from "./app";
import { serverRows, useReply as chooseReply } from "./localStack";

const LIVE = process.env.LIVE === "1";
const PEOPLE = ["Pablo", "Leo", "Mina", "Noah", "Dani"];
const READING = /^(Kept for|Kept as you wrote|Nothing to remember|One thing to check about|\d+ things to check)/u;
const WHO = /Who is|isn't in your people|someone new|Who is this about|Which .* do you mean/u;

type Item = { id: string; person_id: string; statement: string; status: string; subject_type: string; subject_related_id: string | null; deleted_at: string | null };
type Related = { id: string; person_id: string; relation: string; name: string | null; deleted_at: string | null };
type Capture = { id: string; raw_text: string | null; coverage: unknown };

/** The saved live reply for a corpus scenario: its note, and the label of its general-Tell variant. */
function saved(id: string): { note: string; label: string } {
  const r = JSON.parse(readFileSync(`${__dirname}/../replies/narrative-${id}.json`, "utf8")) as { note: string; variants: { label: string }[] };
  // The newest general-Tell shape (the later runs were made after the cap was removed).
  const general = [...r.variants].reverse().find((v) => / general/u.test(v.label)) ?? r.variants[r.variants.length - 1];
  return { note: r.note, label: general.label };
}

async function account() {
  const acct = await signedIn();
  const r = await mount();
  await setUp(r, PEOPLE);
  await acct.engine.sync();
  const people = await acct.repos.people.list();
  const id = (n: string) => people.find((p) => p.display_name === n)!.id;
  return { acct, r, id };
}
type Account = Awaited<ReturnType<typeof account>>;

async function told(a: Account, scenario: string) {
  const { note, label } = saved(scenario);
  if (!LIVE) await chooseReply(note, label);
  await tell(a.r, note);
  await until(a.r, (s) => s.some((t) => READING.test(t)), `the reading of ${scenario}`, 90000);
  await settle(400);
  await a.acct.engine.sync();
  return texts(a.r);
}

const live = async (a: Account, who: string) =>
  (await serverRows<Item>("memory_items", a.acct.userId)).filter((m) => !m.deleted_at && m.status === "active" && m.person_id === a.id(who));

describe("CER-1: natural stories are understood as people tell them", () => {
  it("#63: a four-sentence story about Pablo, his mom and sister, his dog Rocket and our dog Bean: four lines for Pablo, no 'Who is he?'", async () => {
    const a = await account();
    const shown = await told(a, "s63");
    expect(shown.some((t) => WHO.test(t))).toBe(false);
    expect(shown.some((t) => /^Kept for Pablo/u.test(t))).toBe(true);
    const lines = await live(a, "Pablo");
    expect(lines.length).toBe(4);
    expect(lines.map((l) => l.statement).join(" | ")).toMatch(/cooking/u);
    expect(lines.map((l) => l.statement).join(" | ")).toMatch(/mom and sister/u);
    expect(lines.map((l) => l.statement).join(" | ")).toMatch(/Rocket/u);
    expect(lines.map((l) => l.statement).join(" | ")).toMatch(/work/u);
    // Rocket is Pablo's related dog; Bean (the user's dog) and the relatives are never people.
    const related = (await serverRows<Related>("related_people", a.acct.userId)).filter((x) => !x.deleted_at);
    expect(related.map((x) => [x.person_id, x.relation, x.name])).toEqual([[a.id("Pablo"), "dog", "Rocket"]]);
    expect((await a.acct.repos.people.list()).map((p) => p.display_name).sort()).toEqual([...PEOPLE].sort());
    // Every line on his page.
    await show(a.r, { screen: "knows", id: a.id("Pablo") });
    await until(a.r, (s) => s.some((t) => /Rocket/u.test(t)), "Pablo's page", 10000);
  }, 240000);

  it("eleven things about Mina in one note: eleven lines kept, nothing lost to a count, the note never 'couldn't get to all of it'", async () => {
    const a = await account();
    const shown = await told(a, "s12");
    expect(shown.some((t) => /couldn't get to all of it|Tell the rest/u.test(t))).toBe(false);
    expect(shown.some((t) => WHO.test(t))).toBe(false);
    const lines = await live(a, "Mina");
    // Ten plain things are saved on show; the interview ("next Wednesday", a C-4 ambiguous day) waits for the user.
    expect(lines.length).toBeGreaterThanOrEqual(10);
    expect(lines.map((l) => l.statement).join(" | ")).toMatch(/chess on Thursdays/u);
    const capture = (await serverRows<Capture>("captures", a.acct.userId)).find((c) => c.raw_text === saved("s12").note)!;
    expect(capture.coverage ?? null).toBeNull();
  }, 240000);

  it("a 1,300-character evening with Leo, understood in three passages: every line for Leo (or his sister, his mom, his dog), no question about who", async () => {
    const a = await account();
    const shown = await told(a, "s13");
    expect(shown.some((t) => WHO.test(t))).toBe(false);
    expect(shown.some((t) => /couldn't get to all of it|Tell the rest/u.test(t))).toBe(false);
    const lines = await live(a, "Leo");
    // Nineteen proposals; the mom's knee (sensitive) and any ambiguous-day event wait for the user, the rest is saved.
    expect(lines.length).toBeGreaterThanOrEqual(14);
    const all = lines.map((l) => l.statement).join(" | ");
    for (const words of [/Pilsen/u, /Carla/u, /Pentax/u, /10K/u, /contractor/u, /December 3/u]) expect(all).toMatch(words);
    const related = (await serverRows<Related>("related_people", a.acct.userId)).filter((x) => !x.deleted_at);
    expect(related.some((x) => x.person_id === a.id("Leo") && x.relation === "sister" && x.name === "Carla")).toBe(true);
    expect((await a.acct.repos.people.list()).map((p) => p.display_name).sort()).toEqual([...PEOPLE].sort());
    const capture = (await serverRows<Capture>("captures", a.acct.userId)).find((c) => c.raw_text === saved("s13").note)!;
    expect(capture.coverage ?? null).toBeNull();
  }, 300000);
});
