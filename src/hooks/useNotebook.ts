// Whether this account sees the Moment Deck × Notebook × Showing Up experience (the
// `notebook_deck` flag, founder directive 2 Nov 2026). One answer per launch.
import { useAuth } from "@/providers";
import { useNotebookDeck } from "./useFlags";

export function useNotebook(): boolean {
  const { user } = useAuth();
  return useNotebookDeck(user?.id ?? null);
}
