// "the writer" is the extraction prompt's word for the user; the user must
// only ever read "you" (founder native pass F4/F6). Cases are the 23 phrasings
// the approved baseline's real model outputs contain, plus verb agreement.
import { displayStatement, mentionsInternalSelf, yourVoice } from "./voice.ts";

function eq<T>(actual: T, expected: T, msg = ""): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${msg} expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

const CASES: [string, string][] = [
  ["John is the writer's brother", "John is your brother"],
  ["Ben wants to play the new warhammer game with the writer and John on weekends", "Ben wants to play the new warhammer game with you and John on weekends"],
  ["Anna brought the writer tiles from Lisbon", "Anna brought you tiles from Lisbon"],
  ["Anna recommended the writer's dentist", "Anna recommended your dentist"],
  ["Ben and the writer booked the campsite for June 5–7", "You and Ben booked the campsite for June 5–7"],
  ["Mike and the writer are thinking of doing a Japan trip next year", "You and Mike are thinking of doing a Japan trip next year"],
  ["Emma came out to the writer, the first person she's told", "Emma came out to you, the first person she's told"],
  ["Grandma wants the writer to visit at Christmas", "Grandma wants you to visit at Christmas"],
  ["Kenji introduced the writer to their current job", "Kenji introduced you to their current job"],
  ["Mike said he'd send the writer the playlist", "Mike said he'd send you the playlist"],
  ["The writer and Ben are skiing Tahoe February 18", "You and Ben are skiing Tahoe February 18"],
  ["The writer met Rafa at climbing", "You met Rafa at climbing"],
  ["The writer's sister is visiting next week", "Your sister is visiting next week"],
  ["Tom is coming to the writer's birthday dinner Friday", "Tom is coming to your birthday dinner Friday"],
  ["The writer runs Chicago Sunday", "You run Chicago Sunday"],
  ["The writer is Ben's brother", "You are Ben's brother"],
  ["The writer's going to Ben's wedding", "You're going to Ben's wedding"],
  ["Ben thinks the writer is moving", "Ben thinks you are moving"],
  ["The writer always watches the game with Ben", "You always watch the game with Ben"],
  ["The user will send Priya the link", "You will send Priya the link"],
  ["The writer doesn't know Sam's new address", "You don't know Sam's new address"],
];

Deno.test("every baseline phrasing reads as 'you', with the verb agreeing", () => {
  for (const [from, to] of CASES) {
    const v = yourVoice(from);
    eq(v.text, to, from);
    eq(v.certain, true, from);
    eq(mentionsInternalSelf(v.text), false, from);
  }
});

Deno.test("statements without it are untouched", () => {
  eq(yourVoice("Ben runs Chicago Sunday"), { text: "Ben runs Chicago Sunday", certain: true, changed: false });
  eq(displayStatement("Maya starts her new job Monday"), "Maya starts her new job Monday");
});
