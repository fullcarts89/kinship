// The read side for 2.0 screens (plan §11: screens → hooks → repositories).
// Re-runs the query whenever the user's store changes (a local write or a
// sync). Errors surface as an error state: there is no fallback data.

import { useEffect, useState } from "react";
import { repositoriesFor, type Repositories } from "@/store/repositories";
import type { UserStore } from "@/store/userStore";

export interface StoreQuery<T> {
  data: T | undefined;
  error: Error | null;
  loading: boolean;
}

export function useStoreQuery<T>(
  store: UserStore | null,
  read: (repos: Repositories) => Promise<T>,
  deps: unknown[] = [],
): StoreQuery<T> {
  const [state, setState] = useState<StoreQuery<T>>({ data: undefined, error: null, loading: true });

  useEffect(() => {
    if (!store) {
      setState({ data: undefined, error: null, loading: false });
      return;
    }
    let cancelled = false;
    let generation = 0;
    const repos = repositoriesFor(store);
    const run = () => {
      const mine = ++generation;
      read(repos).then(
        (data) => {
          if (!cancelled && mine === generation) setState({ data, error: null, loading: false });
        },
        (error: unknown) => {
          if (!cancelled && mine === generation) {
            setState({ data: undefined, error: error instanceof Error ? error : new Error(String(error)), loading: false });
          }
        },
      );
    };
    run();
    const unsubscribe = store.subscribe(run);
    return () => {
      cancelled = true;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, ...deps]);

  return state;
}
