// Setup, run (plan E16 order after D1 sign-in; contract §8): consent when
// it's needed → pick people → already worth knowing + the first Tell → Today.
// Each step is saved as it's reached, so a setup closed half-way resumes
// where it stopped. Only the people the user picks are saved.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import { useConsentAsk, useExistingPeople, useSetup, todayIso } from "@/hooks/useV2";
import { useTellFlow } from "@/features/tell/TellFlow";
import {
  contactsAccess, openAppSettings, readContacts, requestContactsAccess, shareMoreContacts, type ContactsAccess,
} from "@/platform/deviceContacts";
import { AddByNameSheet } from "./AddByNameSheet";
import {
  buildPickLists, resumeStep, searchRows, setupSteps, stepLabel, worthKnowing,
  type PickLists, type PickRow, type SetupStep,
} from "./setupModel";
import { ConsentStepView, PeoplePickView, SETUP_COPY, WorthStepView, type PickAccess } from "./SetupViews";

function newPersonId(): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { randomUUID } = require("expo-crypto") as { randomUUID: () => string };
  return randomUUID();
}

export function SetupScreen() {
  const setup = useSetup();
  const [steps, setSteps] = useState<SetupStep[] | null>(null);
  const [step, setStep] = useState<SetupStep | null>(null);

  // Decide the steps once, when the account's settings are known.
  useEffect(() => {
    if (!setup.ready || steps) return;
    const s = setupSteps(setup.needsConsent);
    setSteps(s);
    setStep(resumeStep(setup.saved, s));
  }, [setup.ready, setup.needsConsent, setup.saved, steps]);

  useEffect(() => {
    if (step) void setup.goTo(step);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  if (!steps || !step) return null;
  const next = () => {
    const i = steps.indexOf(step);
    if (i < steps.length - 1) setStep(steps[i + 1]);
  };
  const label = stepLabel(step, steps);
  if (step === "consent") return <ConsentStep label={label} onDone={next} />;
  if (step === "people") return <PeopleStep label={label} onDone={next} save={setup.savePicked} />;
  return <WorthStep label={label} people={setup.people} finish={setup.finish} />;
}

// ─── Consent ────────────────────────────────────────────────────────────

function ConsentStep({ label, onDone }: { label: string; onDone: () => void }) {
  const { answer } = useConsentAsk();
  const [busy, setBusy] = useState<false | "allow" | "decline">(false);
  const go = async (allow: boolean) => {
    setBusy(allow ? "allow" : "decline");
    try {
      await answer(allow);
    } catch {
      // Not saved (offline): the over-Today sheet asks again later rather than assume.
    } finally {
      setBusy(false);
      onDone();
    }
  };
  return <ConsentStepView label={label} busy={busy} onAllow={() => void go(true)} onDecline={() => void go(false)} />;
}

// ─── People ─────────────────────────────────────────────────────────────

function toPickAccess(a: ContactsAccess): PickAccess {
  return a;
}

export function PeopleStep({ label, onDone, save, doneLabel }: {
  label: string;
  onDone: () => void;
  save: (rows: PickRow[]) => Promise<void>;
  /** Overrides the step label (Add from contacts, outside setup). */
  doneLabel?: string;
}) {
  const existing = useExistingPeople();
  const [access, setAccess] = useState<PickAccess>({ state: "loading" });
  const [lists, setLists] = useState<PickLists>({ suggested: [], everyone: [] });
  const [added, setAdded] = useState<PickRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (a: ContactsAccess) => {
    setAccess(toPickAccess(a));
    if (a.state !== "granted") return;
    try {
      const contacts = await readContacts();
      setLists(buildPickLists(contacts, { today: todayIso(), existing, newId: newPersonId }));
    } catch {
      setAccess({ state: "unavailable" });
    }
  };

  // Asks once, on arrival, with the question already on screen behind the prompt.
  useEffect(() => {
    void contactsAccess().then(async (a) => load(a.state === "undetermined" ? await requestContactsAccess() : a));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const results = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.trim().toLocaleLowerCase();
    return [...added.filter((r) => r.name.toLocaleLowerCase().includes(q)), ...searchRows(lists, query)];
  }, [lists, added, query]);

  const toggle = useCallback((row: PickRow) => setSelected((s) => {
    const n = new Set(s);
    if (n.has(row.personId)) n.delete(row.personId);
    else n.add(row.personId);
    return n;
  }), []);

  const go = async () => {
    const all = [...added, ...lists.suggested, ...lists.everyone];
    const picked = all.filter((r) => selected.has(r.personId));
    setBusy(true);
    setError(null);
    try {
      await save(picked);
      onDone();
    } catch {
      setError(SETUP_COPY.saveFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PeoplePickView
        label={doneLabel ?? label}
        access={access}
        suggested={lists.suggested}
        everyone={lists.everyone}
        added={added}
        results={results ? results.filter((r, i, a) => a.findIndex((x) => x.personId === r.personId) === i) : null}
        query={query}
        selected={selected}
        busy={busy}
        error={error}
        onQuery={setQuery}
        onToggle={toggle}
        onAddByName={(initial) => setAdding(initial)}
        onAsk={() => void requestContactsAccess().then(load)}
        onSettings={openAppSettings}
        onShareMore={() => void shareMoreContacts().then(() => contactsAccess()).then(load)}
        onContinue={() => void go()}
        onSkip={onDone}
      />
      <AddByNameSheet
        initial={adding}
        onDismiss={() => setAdding(null)}
        onDone={async (name) => {
          const row: PickRow = { personId: newPersonId(), contactId: null, name, why: null, birthday: null, birthdayYearKnown: false };
          setAdded((a) => [...a, row]);
          setSelected((s) => new Set(s).add(row.personId));
          setAdding(null);
          setQuery("");
        }}
      />
    </>
  );
}

// ─── Already worth knowing + the first Tell ─────────────────────────────

function WorthStep({ label, people, finish }: {
  label: string;
  people: { id: string; display_name: string; birthday: string | null }[];
  finish: () => Promise<void>;
}) {
  const flow = useTellFlow();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const lines = useMemo(
    () => worthKnowing(people.map((p) => ({ id: p.id, name: p.display_name, birthday: p.birthday })), todayIso()),
    [people],
  );
  const done = async () => {
    await finish();
    router.replace("/v2");
  };
  return (
    <WorthStepView
      label={label}
      lines={lines}
      text={text}
      busy={busy}
      onText={setText}
      onSkip={() => void done()}
      onKeep={() => {
        if (!text.trim() || busy) return;
        setBusy(true);
        // The same Tell as everywhere else: kept on the phone at once, understood when online.
        void flow.keep(text, null, "onboarding").then(async (ok) => {
          setBusy(false);
          if (ok) await done();
        });
      }}
    />
  );
}
