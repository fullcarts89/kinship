// Stabilization Gate B: the user is always "you", however the model put it.
// The exact failures from the founder's second native pass first, then the
// cases the guard must leave alone. The same module runs in the gateway
// (before anything is saved) and on the phone (for anything already stored).
import {
  displayStatement, mentionsInternalSelf, promiseLine, withResolvedName, yourVoice,
} from "../../../../supabase/functions/_shared/extraction/voice";

describe("the founder's round-two failures", () => {
  it.each([
    // G33: no "the", capitalised, and "they'd" pointing back at the user.
    ["Writer told Michelle they'd send her that restaurant", "You told Michelle you'd send her that restaurant"],
    // G26: "their" pointing back at the user.
    ["The writer and their daughter Kaiya watch Spirited Away every Christmas", "You and your daughter Kaiya watch Spirited Away every Christmas"],
    ["You and their daughter Kaiya watch Spirited Away every Christmas", "You and your daughter Kaiya watch Spirited Away every Christmas"],
    ["Kenji introduced the writer to their current job", "Kenji introduced you to your current job"],
    ["User's sister is visiting next week", "Your sister is visiting next week"],
    ["Author told Ben they would call him Friday", "You told Ben you would call him Friday"],
  ])("%s → %s", (from, to) => {
    const v = yourVoice(from);
    expect(v.text).toBe(to);
    expect(v.certain).toBe(true);
    expect(mentionsInternalSelf(v.text)).toBe(false);
    expect(displayStatement(from)).toBe(to);
  });

  it("a promise reads as the user's own to-do", () => {
    expect(promiseLine(displayStatement("Writer told Michelle they'd send her that restaurant"))).toBe("Send Michelle that restaurant");
    expect(promiseLine("You said you'd introduce Matt to Alex")).toBe("Introduce Matt to Alex");
    expect(promiseLine("You told Ben you'd help him move")).toBe("Help Ben move");
    expect(promiseLine("You'll send Priya the link")).toBe("Send Priya the link");
    // Nothing to place the name on: left as it is, never guessed.
    expect(promiseLine("You told Ben you'd call on Friday")).toBe("You told Ben you'd call on Friday");
    expect(promiseLine("Ask Priya how her interview went")).toBe("Ask Priya how her interview went");
  });

  it("after the user says who \"he\" is, the line names him (G32)", () => {
    expect(withResolvedName("He wants to go back to Tahoe in December", "John Oxnard")).toBe("John wants to go back to Tahoe in December");
    expect(withResolvedName("She's starting at Stripe next week", "Sam Eden")).toBe("Sam's starting at Stripe next week");
    expect(withResolvedName("His knee is getting better", "John")).toBe("John's knee is getting better");
    expect(withResolvedName("Ben and John went to Tahoe", "John")).toBe("Ben and John went to Tahoe");
  });
});

describe("what the guard leaves alone", () => {
  it.each([
    "Ben is a writer",
    "Ben is a freelance writer for the Chronicle",
    "Her favourite author is Ursula Le Guin",
    "Maya is a heavy Figma user",
    "Ben and Sara love their new dog",
    "Maya starts her new job Monday",
    "They are moving to Denver",
  ])("%s", (s) => {
    expect(displayStatement(s)).toBe(s);
  });

  it("a \"their\" that could be someone else's isn't guessed: left, and not certain", () => {
    const v = yourVoice("The writer saw Ben and Sara at their wedding");
    expect(v.text).toBe("You saw Ben and Sara at their wedding");
    expect(v.certain).toBe(false);
  });
});
