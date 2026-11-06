// Whether Tell and the review take the notebook look (the `notebook_deck` flag; founder directive
// 2 Nov 2026). The same decision as useNotebook(), read for the 2.0 session's own account so the
// Tell flow never needs the auth provider; unknown is off.
import * as flags from "@/hooks/useFlags";

export function useTellNotebook(userId: string | null | undefined): boolean {
  // A stand-in for the flags module without the notebook (older test doubles) is the experience off.
  const deck = (flags as { useNotebookDeck?: (userId: string | null) => boolean }).useNotebookDeck;
  return typeof deck === "function" ? deck(userId ?? null) : false;
}
