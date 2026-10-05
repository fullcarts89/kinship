// Where an account is in getting started, as explicit state (founder native
// pass F20/F23; recovery brief, Gate 3).
//
// The founder build decided "does this account need setup?" from incidental
// data (any person or any note meant "done"), so an account with one old note
// skipped setup entirely, met the consent question as a sheet over Today, and
// fell into "Nothing needs you today." as soon as it had one person. Now each
// step is recorded when it is finished, on the account itself (so a new phone
// or a reinstall knows), and setup resumes at the first step not done:
//
//   name (only if Kinship doesn't already know it) → consent (only if
//   understanding is offered) → people → first Tell → activated
//
// "Activated" is its own fact: a first Tell kept and understood into memory
// (or kept as written, with understanding off). Until then Today keeps its
// first-use guidance, whatever else the account has.
//
// Records only ever grow: merging two copies (this phone's, the account's)
// keeps every step either has, so recording twice, or on two phones, is safe.

export type ActivationStep = "name" | "consent" | "people" | "worth";

export interface Activation {
  v: 1;
  /** When each step was finished (or deliberately skipped). */
  steps: Partial<Record<ActivationStep, string>>;
  /** When the first Tell became memory; null until then. */
  activated_at: string | null;
}

export const NO_ACTIVATION: Activation = { v: 1, steps: {}, activated_at: null };

const STEPS: ActivationStep[] = ["name", "consent", "people", "worth"];

/** Reads a stored copy; anything malformed counts as nothing recorded. */
export function parseActivation(raw: unknown): Activation | null {
  let v = raw;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v);
    } catch {
      return null;
    }
  }
  if (!v || typeof v !== "object") return null;
  const o = v as { steps?: unknown; activated_at?: unknown };
  const steps: Activation["steps"] = {};
  if (o.steps && typeof o.steps === "object") {
    for (const s of STEPS) {
      const at = (o.steps as Record<string, unknown>)[s];
      if (typeof at === "string" && at) steps[s] = at;
    }
  }
  return { v: 1, steps, activated_at: typeof o.activated_at === "string" && o.activated_at ? o.activated_at : null };
}

function earliest(a: string | null | undefined, b: string | null | undefined): string | null {
  if (!a) return b ?? null;
  if (!b) return a;
  return a < b ? a : b;
}

/** Everything either copy has recorded. */
export function mergeActivation(a: Activation | null, b: Activation | null): Activation | null {
  if (!a) return b;
  if (!b) return a;
  const steps: Activation["steps"] = {};
  for (const s of STEPS) {
    const at = earliest(a.steps[s], b.steps[s]);
    if (at) steps[s] = at;
  }
  return { v: 1, steps, activated_at: earliest(a.activated_at, b.activated_at) };
}

/** Records a finished step; recording it again changes nothing. */
export function withStep(a: Activation | null, step: ActivationStep, at: string): Activation {
  const base = a ?? NO_ACTIVATION;
  if (base.steps[step]) return base;
  return { ...base, steps: { ...base.steps, [step]: at } };
}

export function withActivated(a: Activation | null, at: string): Activation {
  const base = a ?? NO_ACTIVATION;
  return base.activated_at ? base : { ...base, activated_at: at };
}

export function sameActivation(a: Activation | null, b: Activation | null): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

/** What setup has to ask this account. */
export interface SetupNeeds {
  /** Kinship has no first name for the user from their sign-in. */
  name: boolean;
  /** Understanding is offered and the user hasn't answered yet. */
  consent: boolean;
}

/** The steps setup shows this account, in order. */
export function setupStepsFor(needs: SetupNeeds, a: Activation | null): ActivationStep[] {
  const out: ActivationStep[] = [];
  // A step already finished stays in the count, so "2 of 4" doesn't shift.
  if (needs.name || a?.steps.name) out.push("name");
  if (needs.consent || a?.steps.consent) out.push("consent");
  out.push("people", "worth");
  return out;
}

/** The first step still to do; null when setup is finished. */
export function nextStep(needs: SetupNeeds, a: Activation | null): ActivationStep | null {
  for (const s of setupStepsFor(needs, a)) if (!a?.steps[s]) return s;
  return null;
}

export function setupFinished(needs: SetupNeeds, a: Activation | null): boolean {
  return nextStep(needs, a) === null;
}

/**
 * An account from before this record existed, decided once from what it
 * already has, then recorded and never inferred again: people and memories
 * mean it's in use; otherwise setup resumes after what's already done.
 */
export function legacyActivation(have: { people: number; memories: number; consentAnswered: boolean; nameKnown: boolean }, at: string): Activation {
  if (have.people > 0 && have.memories > 0) {
    return { v: 1, steps: { name: at, consent: at, people: at, worth: at }, activated_at: at };
  }
  const steps: Activation["steps"] = {};
  if (have.nameKnown) steps.name = at;
  if (have.consentAnswered) steps.consent = at;
  if (have.people > 0) steps.people = at;
  return { v: 1, steps, activated_at: null };
}

/** "Setting up · 2 of 4". */
export function activationLabel(step: ActivationStep, steps: ActivationStep[]): string {
  return `Setting up · ${steps.indexOf(step) + 1} of ${steps.length}`;
}

/**
 * The user's first name, when their sign-in already gives one reliably
 * (Google's given name or full name, the name Apple shares on first sign-in,
 * or the one they gave Kinship). Never an email address or a handle.
 */
export function firstNameFrom(meta: Record<string, unknown> | null | undefined): string | null {
  if (!meta) return null;
  const pick = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const candidates = [pick(meta.kinship_first_name), pick(meta.given_name), pick(meta.first_name),
    pick(meta.full_name).split(/\s+/u)[0] ?? "", pick(meta.name).split(/\s+/u)[0] ?? ""];
  for (const c of candidates) {
    if (c && c.length <= 40 && !/[@\d]/u.test(c) && /^\p{L}[\p{L}\p{M}'’.-]*$/u.test(c)) return c;
  }
  return null;
}
