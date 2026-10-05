// The account's getting-started record (src/features/setup/activation.ts):
// read from this phone's store and from the account itself, written to both.
//
// The account copy lives in the signed-in user's own auth metadata, so a new
// phone or a reinstall knows where setup stands without waiting for a sync,
// and no schema change is needed. The phone copy makes every step stick at
// once, offline too; it is pushed to the account whenever the account's copy
// is missing something. Copies only ever merge upward (never go back a step).
import { useCallback, useEffect, useRef } from "react";
import {
  firstNameFrom, mergeActivation, parseActivation, sameActivation, withActivated, withStep,
  type Activation, type ActivationStep,
} from "@/features/setup/activation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers";
import { useV2Session } from "@/providers/V2SessionProvider";
import { getMeta, setMeta } from "@/store/schema";
import { useStoreQuery } from "./useStoreQuery";

const LOCAL = "activation";
const LOCAL_NAME = "first_name";
/** The account metadata keys (the user's own; never someone else's). */
export const ACCOUNT_KEYS = { activation: "kinship_activation", firstName: "kinship_first_name" } as const;

async function pushToAccount(data: Record<string, unknown>): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.auth.updateUser({ data });
  if (error) throw error;
}

export interface ActivationState {
  /** False until this phone's copy has been read. */
  loaded: boolean;
  /** Null when nothing has ever been recorded for this account (an account from before this record). */
  activation: Activation | null;
  activated: boolean;
  firstName: string | null;
  record: (step: ActivationStep) => Promise<void>;
  activate: () => Promise<void>;
  /** Writes a whole record (the one-time decision for an older account). */
  adopt: (a: Activation) => Promise<void>;
  saveFirstName: (name: string) => Promise<void>;
}

export function useActivation(): ActivationState {
  const { store } = useV2Session();
  const { user } = useAuth();
  const meta = (user?.user_metadata ?? null) as Record<string, unknown> | null;
  const account = parseActivation(meta?.[ACCOUNT_KEYS.activation]);
  const accountRef = useRef(account);
  accountRef.current = account;
  const q = useStoreQuery(store, async () => ({
    activation: parseActivation(await getMeta(store.db, LOCAL)),
    firstName: await getMeta(store.db, LOCAL_NAME),
  }));
  const local = q.data?.activation ?? null;
  const merged = mergeActivation(local, account);

  // The account's copy is missing something this phone recorded: send it.
  const pushing = useRef(false);
  useEffect(() => {
    if (!local || pushing.current) return;
    const next = mergeActivation(account, local);
    if (sameActivation(next, account)) return;
    pushing.current = true;
    pushToAccount({ [ACCOUNT_KEYS.activation]: next })
      .catch(() => undefined)
      .finally(() => {
        pushing.current = false;
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(local), JSON.stringify(account)]);

  const update = useCallback(async (change: (a: Activation | null) => Activation) => {
    // Read the latest copies at write time, so two quick steps never lose one.
    const current = mergeActivation(parseActivation(await getMeta(store.db, LOCAL)), accountRef.current);
    const next = change(current);
    if (sameActivation(next, current)) return;
    await setMeta(store.db, LOCAL, JSON.stringify(next));
    store.notify();
    await pushToAccount({ [ACCOUNT_KEYS.activation]: next }).catch(() => undefined);
  }, [store]);

  const now = () => new Date().toISOString();
  return {
    loaded: q.data !== undefined,
    activation: merged,
    activated: !!merged?.activated_at,
    firstName: firstNameFrom(meta) ?? firstNameFrom({ kinship_first_name: q.data?.firstName ?? null }),
    record: (step) => update((a) => withStep(a, step, now())),
    activate: () => update((a) => withActivated(a, now())),
    adopt: (a) => update((cur) => mergeActivation(cur, a) ?? a),
    saveFirstName: async (name) => {
      const clean = name.normalize("NFC").trim().split(/\s+/u)[0] ?? "";
      if (!clean) return;
      await setMeta(store.db, LOCAL_NAME, clean);
      store.notify();
      await pushToAccount({ [ACCOUNT_KEYS.firstName]: clean }).catch(() => undefined);
    },
  };
}
