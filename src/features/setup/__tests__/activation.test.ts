// Getting started as explicit state (recovery Gate 3): steps are recorded as
// they finish, records only grow, setup resumes at the first step not done,
// a name is asked only when sign-in didn't give one, and an account counts as
// activated only once its first Tell became memory.
import {
  activationLabel, firstNameFrom, legacyActivation, mergeActivation, nextStep, NO_ACTIVATION, parseActivation,
  setupFinished, setupStepsFor, withActivated, withStep, type Activation,
} from "../activation";
import { buildToday, greetingFor } from "@/features/today/todayModel";
import type { Person } from "@/store/repositories";

const T1 = "2026-10-05T17:00:00.000Z";
const T2 = "2026-10-05T18:00:00.000Z";
const ALL = { name: true, consent: true };
const NONE = { name: false, consent: false };

it("a new account: name (if needed) → consent (if offered) → people → first Tell", () => {
  expect(setupStepsFor(ALL, null)).toEqual(["name", "consent", "people", "worth"]);
  expect(setupStepsFor(NONE, null)).toEqual(["people", "worth"]);
  expect(nextStep(ALL, null)).toBe("name");
  expect(nextStep(NONE, null)).toBe("people");
  expect(activationLabel("people", setupStepsFor(ALL, null))).toBe("Setting up · 3 of 4");
});

it("resumes at the first step not done; a finished setup is finished, activated or not", () => {
  let a: Activation | null = null;
  a = withStep(a, "name", T1);
  a = withStep(a, "consent", T1);
  expect(nextStep(ALL, a)).toBe("people");
  a = withStep(a, "people", T1);
  expect(nextStep(ALL, a)).toBe("worth");
  a = withStep(a, "worth", T1);
  expect(setupFinished(ALL, a)).toBe(true);
  expect(a.activated_at).toBeNull();
  // Once asked, the name step keeps its place in the count even when the name is now known.
  expect(setupStepsFor({ name: false, consent: false }, a)).toEqual(["name", "consent", "people", "worth"]);
});

it("recording twice changes nothing; two phones' copies merge upward, never back", () => {
  const a = withStep(NO_ACTIVATION, "people", T2);
  expect(withStep(a, "people", T1)).toBe(a);
  const phone = withStep(withStep(NO_ACTIVATION, "people", T2), "worth", T2);
  const account = withActivated(withStep(NO_ACTIVATION, "people", T1), T2);
  const merged = mergeActivation(phone, account)!;
  expect(merged.steps).toEqual({ people: T1, worth: T2 });
  expect(merged.activated_at).toBe(T2);
  expect(mergeActivation(null, null)).toBeNull();
});

it("reads only well-formed records", () => {
  expect(parseActivation(undefined)).toBeNull();
  expect(parseActivation("nope")).toBeNull();
  expect(parseActivation({ steps: { people: T1, bogus: T1, worth: 3 }, activated_at: 5 })).toEqual({ v: 1, steps: { people: T1 }, activated_at: null });
  expect(parseActivation(JSON.stringify({ steps: { worth: T1 }, activated_at: T1 }))).toEqual({ v: 1, steps: { worth: T1 }, activated_at: T1 });
});

describe("accounts from before the record (decided once, then recorded)", () => {
  it("in use (people and memories): activated, setup finished", () => {
    const a = legacyActivation({ people: 4, memories: 2, consentAnswered: true, nameKnown: false }, T1);
    expect(setupFinished(ALL, a)).toBe(true);
    expect(a.activated_at).toBe(T1);
  });
  it("the founder's second account: one old note, consent answered, one person, nothing remembered → the first Tell", () => {
    const a = legacyActivation({ people: 1, memories: 0, consentAnswered: true, nameKnown: false }, T1);
    expect(nextStep({ name: true, consent: false }, a)).toBe("name");
    expect(nextStep({ name: false, consent: false }, withStep(a, "name", T2))).toBe("worth");
    expect(a.activated_at).toBeNull();
  });
  it("nothing at all: setup from the start", () => {
    expect(nextStep(NONE, legacyActivation({ people: 0, memories: 0, consentAnswered: false, nameKnown: true }, T1))).toBe("people");
  });
});

it("a first name is taken from sign-in when it's reliable, never from an email or a handle", () => {
  expect(firstNameFrom({ given_name: "Thor" })).toBe("Thor");
  expect(firstNameFrom({ full_name: "Thor Liu" })).toBe("Thor");
  expect(firstNameFrom({ name: "Thor Liu" })).toBe("Thor");
  expect(firstNameFrom({ kinship_first_name: "Thor", given_name: "T" })).toBe("Thor");
  expect(firstNameFrom({ full_name: "liuxnard@gmail.com" })).toBeNull();
  expect(firstNameFrom({ name: "user12345" })).toBeNull();
  expect(firstNameFrom({})).toBeNull();
  expect(firstNameFrom(null)).toBeNull();
});

describe("Today keeps its first-use guidance until the account is activated", () => {
  const tyler = { id: "t", display_name: "Tyler", state: "active", birthday: null } as unknown as Person;
  const base = {
    now: new Date(2026, 9, 5, 10, 20), today: "2026-10-05", reasons: [], items: [], local: {}, primaries: [], handoff: null,
    questions: 0, toLookAt: 0, provenance: () => null,
  };
  it("a person added and an old note: still first use, never 'Nothing needs you today.' (F23)", () => {
    const view = buildToday({ ...base, people: [tyler], told: 1, activated: false });
    expect(view.firstUse).toEqual({ hasPeople: true });
    expect(view.quietDay).toBe(false);
  });
  it("activated with nothing due: the mature quiet day", () => {
    const view = buildToday({ ...base, people: [tyler], told: 1, activated: true });
    expect(view.firstUse).toBeNull();
    expect(view.quietDay).toBe(true);
  });
  it("greets by first name when Kinship knows it", () => {
    expect(greetingFor(new Date(2026, 9, 5, 10), "Thor")).toBe("Good morning, Thor.");
    expect(greetingFor(new Date(2026, 9, 5, 20), null)).toBe("Good evening.");
  });
});
