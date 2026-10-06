// How many sheets are on screen (including one still leaving). "There is
// never a sheet on a sheet" (Sheet.tsx): presenting a second iOS modal while
// another is up or on its way out can leave an invisible one over the app,
// taking every touch (the founder's native-pass freezes are the likeliest
// case: a question arriving while the Tell or memory sheet was open). The
// Tell flow waits for this to reach zero before it opens a question by
// itself; the question is never lost meanwhile (Today and the person's page
// list it).

let open = 0;
const listeners = new Set<() => void>();

export function sheetOpened(): void {
  open += 1;
  for (const l of [...listeners]) l();
}

export function sheetClosed(): void {
  open = Math.max(0, open - 1);
  for (const l of [...listeners]) l();
}

export function openSheets(): number {
  return open;
}

export function onSheetsChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
