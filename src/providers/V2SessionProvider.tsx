// The 2.0 session for whoever is signed in (plan §11): their encrypted store,
// sync, and Understanding (Tell → understand → review), kept moving while the
// app is open: at start, on returning to the foreground, and every 30
// seconds. Screens reach it only through hooks (src/hooks/useV2.ts).

import React, { createContext, useContext, useEffect, useState } from "react";
import { AppState } from "react-native";
import { supabase } from "@/lib/supabase";
import { Gateway, supabaseGatewayTransport } from "@/store/gateway";
import { storeForUser } from "@/store/session";
import { SupabaseRemote } from "@/store/supabaseRemote";
import { SyncEngine } from "@/store/syncEngine";
import { Understanding } from "@/store/understanding";
import type { UserStore } from "@/store/userStore";
import { useAuth } from "./AuthProvider";

export interface V2Session {
  userId: string;
  store: UserStore;
  understanding: Understanding;
}

const V2Context = createContext<V2Session | null>(null);

export function V2SessionProvider({
  children,
  opening,
  unavailable,
}: {
  children: React.ReactNode;
  /** Shown while the store opens. */
  opening: React.ReactNode;
  /** Shown if this device can't open an encrypted store. */
  unavailable: React.ReactNode;
}) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [session, setSession] = useState<V2Session | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSession(null);
    setFailed(false);
    const client = supabase;
    if (!userId || !client) return;
    let cancelled = false;
    storeForUser(userId).then(
      (store) => {
        if (cancelled) return;
        const engine = new SyncEngine(store, new SupabaseRemote(client));
        const gateway = new Gateway(supabaseGatewayTransport(client));
        setSession({ userId, store, understanding: new Understanding(store, () => engine.sync(), gateway) });
      },
      () => {
        if (!cancelled) setFailed(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!session) return;
    const tick = () => {
      session.understanding.run().catch(() => undefined);
    };
    tick();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") tick();
    });
    const timer = setInterval(() => {
      if (AppState.currentState === "active") tick();
    }, 30_000);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, [session]);

  if (failed) return <>{unavailable}</>;
  if (!session) return <>{opening}</>;
  return <V2Context.Provider value={session}>{children}</V2Context.Provider>;
}

export function useV2Session(): V2Session {
  const s = useContext(V2Context);
  if (!s) throw new Error("useV2Session is only available inside the 2.0 shell");
  return s;
}
