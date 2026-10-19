// Option A, containment (founder, 19 Oct 2026), through the real screens, the local backend and this
// branch's ai-gateway, with the model's own replies to the 19 Oct calibration stories replayed
// (e2e/replies/narrative-*.json; synthetic people, fictional stories):
//   S9   an ordinary completion: seven or eight lines, no partial state, and no claim that the whole
//        note was understood (the model left the bike out; nothing can see that, and nothing pretends to).
//   S15  more than the understanding takes: eight kept, "Kinship couldn't get to all of it.", the rest
//        back in the Tell field through "Tell the rest", linked; and (founder review of PR #58) the first
//        note is NOT called answered while the later note is still to be read or failed: it keeps its
//        marks and says which; Undo on the later note offers Tell the rest again.
//   S25  the same at twenty-five, and a second request for the same note writes nothing twice.
//   S50-shaped failure: a note the model cannot answer keeps the note and says so honestly.
// Run with this branch's gateway: GATEWAY_URL=http://127.0.0.1:8000 STUB_URL=http://127.0.0.1:8791.
import { TextInput } from "react-native";
import { COPY } from "@/features/tell/reviewModel";
import { noteFor } from "@/hooks/useV2";
import { mount, setUp, settle, signedIn, tap, tapLast, tell, texts, until, unmount, canTap } from "./app";
import { serverRows, useReply } from "./localStack";
import { harness } from "./state";

const ROSTER = ["Susan", "Chris", "Ben", "Priya", "Maya", "John", "Lena", "Dad"];
const S9 = "Priya started at a new clinic on October 6. She's working night shifts and she hates them. Her pottery show is on October 24. She's been getting into trail running lately. She told me she's been dealing with anxiety again and is seeing someone about it. She wants to visit her parents in Pune over Christmas. She asked if I'd come to the pottery show. We're also thinking about doing the Point Reyes hike together in November. And she finally fixed her bike.";
const S15 = "Susan is getting married to Pedro this fall and she's stressed about finding a venue. She asked if I'd come to a tasting with her next month. Her mom is visiting from Ohio next week; her mom just retired. Ben ran a half marathon on Sunday and he wants to break two hours next time, though his knee has been bothering him. Susan, Ben and I are doing Friendsgiving at my place in November, and Susan is bringing her pie. I told Ben I'd send him my physio's number. Ben and Susan went to the A's game together last week. Susan has been obsessed with ceramics lately; she signed up for a wheel class on Thursdays and she wants me to come to one.";
const S25 = "Susan moved to Alameda in the spring, then in June she moved again, to Oakland. She and Pedro have set a date for the wedding, sometime next spring. Pedro got a job at a bakery in Berkeley. Susan's dad had a fall last month and is still recovering. Chris is training for the Oakland marathon; his race is around his birthday. Chris and I are planning a climbing trip to Bishop in the spring and I told him I'd book the campsite. He said he'd send me the gear list by Friday. Ben started a new job at Stripe on October 13 and he's nervous about the on-call rotation. Ben and Lena are expecting in March, and Lena is going part-time after the baby. Maya got into the UCSF nursing programme! She starts in January and she's worried about the commute. Maya and Ben are both into bouldering. Maya, Chris and I did the Mission Peak hike last Saturday, and Maya wants to do Half Dome next year. John's birthday party is on November 2; he wants it to be a surprise for his wife and he asked me to bring the cake. John has been learning Portuguese. I want to make more time for John this winter.";
const NO_REPLY = "Priya finally fixed her bike and then the stub has nothing for this one.";

const CARD = /^Kept for /u;
const SHEET = /^Here's what I'll remember\.?$|^One thing to check|^\d+ things to check/u;
const QUESTION = /^Who is .*\?$|^Which .* do you mean\?$|^Who is this about\?$|^Remember this|^Whose promise\?$|^When is it\?$|^Does this replace/u;
/** Nothing on any screen ever claims the whole note was understood. */
const CLAIMS_WHOLE = /understood (everything|the whole|all of)|all (of it )?kept|nothing left out/iu;

type CaptureRow = { id: string; raw_text: string | null; status: string; coverage: unknown; continues_capture_id: string | null };

afterEach(unmount);

/**
 * Lets the understanding settle as a person would: the sheet's questions answered by the words each
 * quotes, a reading held for a yes given "Remember". Returns with the result in front of the user: the
 * quiet sheet ("Here's what I'll remember.", nothing left to answer), the Kept card, or a failure line.
 */
async function settled(r: Awaited<ReturnType<typeof mount>>, answers: Record<string, string>, ms = 60000) {
  await until(r, (s) => s.some((t) => CARD.test(t) || SHEET.test(t) || t === COPY.failed || t === COPY.retrying), "the reading", ms);
  for (let i = 0; i < 24; i++) {
    const shown = texts(r);
    const q = shown.find((t) => QUESTION.test(t));
    if (process.env.NARRATIVES_DEBUG) console.log(`settled[${i}] q=${q ?? "-"} done=${canTap(r, "Done")} remember=${canTap(r, "Remember")} shown=${JSON.stringify(shown.slice(-14))}`);
    if (q) {
      // The question's quoted words follow it (after "<Name> isn't in your people yet." for a newcomer).
      const quote = shown.slice(shown.indexOf(q) + 1, shown.indexOf(q) + 3).join(" ");
      const pick = Object.entries(answers).find(([words]) => quote.includes(words))?.[1];
      if (q.startsWith("Remember")) await tapLast(r, "Remember");
      else if (pick && canTap(r, pick)) await tapLast(r, pick);
      else if (canTap(r, "Not sure")) await tapLast(r, "Not sure");
      else throw new Error(`a question with no answer here: ${q} (${quote}). On screen: ${JSON.stringify(shown)}`);
    } else if (canTap(r, "Remember")) await tapLast(r, "Remember");
    else if (shown.includes("Saving your answer…")) { /* the answer is on its way */ }
    else break;
    await settle(300);
  }
  await until(r, (s) => s.some((t) => CARD.test(t) || t === COPY.failed || t === COPY.retrying || t === "Here's what I'll remember.") && !s.includes("Saving your answer…"), "the result", 20000);
}

/** Closes the quiet sheet (Done) and Today's one-time bring-back (Got it), as a new user does. */
async function finish(r: Awaited<ReturnType<typeof mount>>) {
  if (texts(r).some((t) => SHEET.test(t)) && canTap(r, "Done")) await tapLast(r, "Done");
  await settle(300);
  if (texts(r).some((t) => /^This is where Kinship brings things back, when they matter/u.test(t)) && canTap(r, "Got it")) await tapLast(r, "Got it");
  await settle(300);
}

it("S9: an ordinary completion keeps what the model proposed and claims nothing about the rest", async () => {
  await useReply(S9, "live 1 (19 Oct calibration, synthetic roster; 7 proposals, 1709 output tokens, 12327 ms)");
  const acct = await signedIn();
  const r = await mount();
  await setUp(r, ROSTER);
  await tell(r, S9);
  await settled(r, { "Point Reyes": "Priya" });
  const shown = texts(r);
  expect(shown.some((t) => CARD.test(t) || t === "Here's what I'll remember.")).toBe(true);
  expect(shown.some((t) => t === COPY.partial)).toBe(false);
  expect(shown.some((t) => CLAIMS_WHOLE.test(t))).toBe(false);
  expect(canTap(r, "Tell the rest")).toBe(false);
  await finish(r);
  expect(texts(r).some((t) => CLAIMS_WHOLE.test(t))).toBe(false);
  await acct.engine.sync();
  const [cap] = await serverRows<CaptureRow>("captures", acct.userId);
  expect(cap.coverage).toBeNull();
  const lines = (await serverRows<{ statement: string; status: string }>("memory_items", acct.userId)).filter((m) => m.status === "active");
  expect(lines.length).toBeGreaterThanOrEqual(7);
  expect(lines.some((m) => /bike/u.test(m.statement))).toBe(false);
});

for (const [name, note, label, answers] of [
  ["S15", S15, "live 1 (19 Oct calibration, synthetic roster; 13 proposals, 3140 output tokens, 22210 ms)", { "knee": "Ben", "bakery": "Add Pedro", "married": "Add Pedro" }],
  ["S25", S25, "live 1 (19 Oct calibration, synthetic roster; 25 proposals, 5877 output tokens, 38692 ms)", { "campsite": "Chris", "gear list": "Chris", "bakery": "Add Pedro", "fall": "Remember" }],
] as const) {
  it(`${name}: more than the understanding takes is said so, the rest is told again and linked, nothing twice`, async () => {
    await useReply(note, label);
    const acct = await signedIn();
    const r = await mount();
    await setUp(r, ROSTER);
    await tell(r, note);
    await settled(r, answers, 90000);
    // The look-over (or the card): what was kept, and that the note held more than that; never a claim of the whole.
    expect(texts(r)).toContain(COPY.partial);
    expect(texts(r).some((t) => CLAIMS_WHOLE.test(t))).toBe(false);
    expect(canTap(r, "Tell the rest")).toBe(true);
    expect(canTap(r, "Try again")).toBe(false);
    await acct.engine.sync();
    const [first] = await serverRows<CaptureRow>("captures", acct.userId);
    const coverage = first.coverage as { unprocessed: { start: number; end: number }[]; unlocated: number } | null;
    expect(coverage).not.toBeNull();
    expect(coverage!.unprocessed.length + coverage!.unlocated).toBeGreaterThanOrEqual(1);
    expect(JSON.stringify(coverage)).not.toMatch(/Susan|Pedro|Ben|Maya|John|wedding|marathon/u);
    const before = (await serverRows<{ statement: string; status: string; deleted_at: string | null }>("memory_items", acct.userId)).filter((m) => m.status === "active" && !m.deleted_at);
    expect(before.length).toBe(8);

    // The Source view marks the words not got to (on their own, or under a kept line's words when one
    // sentence held two things), and offers Tell the rest.
    const source = (await noteFor(acct.store, first.id, new Date()))!;
    expect(source.partial).toEqual({ followUp: "none", resolved: false, recovered: 0, unlocated: coverage!.unlocated, tellRest: true });
    const text = first.raw_text!;
    for (const sp of coverage!.unprocessed) {
      const words = Array.from(text).slice(sp.start, sp.end).join("");
      expect(source.runs!.filter((run) => run.unprocessed).map((run) => run.text).join("")).toContain(words.trim().slice(0, 12));
    }

    // A second request for the same note (a retry after a lost reply) writes nothing twice.
    await harness.session!.understanding.run();
    await acct.engine.sync();
    const again = (await serverRows<{ statement: string; status: string; deleted_at: string | null }>("memory_items", acct.userId)).filter((m) => m.status === "active" && !m.deleted_at);
    expect(again.length).toBe(8);

    // "Tell the rest" (from the sheet, or the card): the words not got to are the draft, about the note's
    // person; keeping them links the new note to the first. The sheet closes as "done" (what it kept stays).
    await tapLast(r, "Tell the rest");
    await settle(300);
    if (texts(r).some((t) => /^This is where Kinship brings things back, when they matter/u.test(t)) && canTap(r, "Got it")) await tapLast(r, "Got it");
    const field = r.root.findAll((n) => n.type === TextInput && /^Tell Kinship/u.test(String(n.props.placeholder ?? n.props.accessibilityLabel ?? "")))[0];
    const rest = String(field?.props.value ?? "");
    expect(rest.length).toBeGreaterThan(0);
    expect(note).toContain(rest.split(" ").slice(0, 4).join(" "));
    expect(canTap(r, "Tell the rest")).toBe(false);
    await useReply(rest, "none");
    await tap(r, "Send to Kinship");
    // The stub has no reply for the rest (synthetic words it never saw): the note is kept and waits, honestly.
    await until(r, (s) => s.some((t) => CARD.test(t) || SHEET.test(t) || t === COPY.failed || t === COPY.retrying || t === "Nothing to remember in that one."), "the rest's reading", 60000);
    await acct.engine.sync();
    const captures = await serverRows<CaptureRow>("captures", acct.userId);
    const second = captures.find((c) => c.id !== first.id)!;
    expect(second.raw_text).toBe(rest);
    expect(second.continues_capture_id).toBe(first.id);
    // The later note has not been read (the stub had no reply): the first is NOT answered. It keeps its
    // marks, says the later note is still to be read (or failed), and offers nothing twice.
    const told = (await noteFor(acct.store, first.id, new Date()))!;
    expect(["pending", "failed"]).toContain(told.partial!.followUp);
    expect(told.partial).toEqual(expect.objectContaining({ resolved: false, recovered: 0, tellRest: false, unlocated: coverage!.unlocated }));
    expect(told.runs!.some((run) => run.unprocessed)).toBe(true);
    expect((await serverRows<{ status: string; deleted_at: string | null }>("memory_items", acct.userId)).filter((m) => m.status === "active" && !m.deleted_at).length).toBe(8);
    // Undo on the later note: the first is as it was, with Tell the rest offered again.
    await harness.session!.understanding.undo(second.id);
    await acct.engine.sync();
    const undone = (await noteFor(acct.store, first.id, new Date()))!;
    expect(undone.partial).toEqual({ followUp: "none", resolved: false, recovered: 0, unlocated: coverage!.unlocated, tellRest: true });
    expect((await serverRows<CaptureRow & { deleted_at: string | null }>("captures", acct.userId)).filter((c) => !c.deleted_at).map((c) => c.id)).toEqual([first.id]);
  });
}

it("a note the model cannot answer keeps the note and says so, honestly, with nothing kept", async () => {
  const acct = await signedIn();
  const r = await mount();
  await setUp(r, ROSTER);
  await tell(r, NO_REPLY);
  await until(r, (s) => s.includes(COPY.retrying) || s.includes(COPY.failed), "the honest failure line", 60000);
  expect(texts(r).some((t) => CARD.test(t))).toBe(false);
  expect(texts(r).some((t) => CLAIMS_WHOLE.test(t))).toBe(false);
  await acct.engine.sync();
  const [cap] = await serverRows<CaptureRow>("captures", acct.userId);
  expect(cap.raw_text).toBe(NO_REPLY);
  expect(["failed", "pending"]).toContain(cap.status);
  expect((await serverRows("memory_items", acct.userId)).length).toBe(0);
});
