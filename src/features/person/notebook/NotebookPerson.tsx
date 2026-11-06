// The person notebook with its reads (behind `notebook_deck`): the page's own data comes from the
// person screen (app/v2/person/[id]/index.tsx, the same controller as the built page); this adds the
// lenses, Pages, what Now needs about each line, Knows, and Showing Up's ideas.
import React, { useState } from "react";
import { todayIso } from "@/hooks/useV2";
import { contactsBirthday, useLineFacts, usePages } from "@/hooks/usePages";
import { PersonIdeas } from "@/features/showingup/PersonIdeas";
import type { Person } from "@/store/repositories";
import { NotebookKnows } from "./KnowsLens";
import { PersonNotebookView, type Lens, type PersonNotebookProps } from "./PersonNotebookView";

/** The last lens used on each person's page, for this session (default Now). */
const lastLens = new Map<string, Lens>();

export function isLens(v: unknown): v is Lens {
  return v === "now" || v === "pages" || v === "knows";
}

/** Which lens a page opens on: the link's own, a note's (Pages), else the last one used here, else Now. */
export function openingLens(personId: string, params: { lens?: unknown; note?: unknown; item?: unknown }): Lens {
  if (isLens(params.lens)) return params.lens;
  if (typeof params.note === "string" && params.note) return "pages";
  if (typeof params.item === "string" && params.item) return "now";
  return lastLens.get(personId) ?? "now";
}

/** Forgets the session's lenses (tests). */
export function resetLenses(): void {
  lastLens.clear();
}

export function NotebookPerson(props: Omit<PersonNotebookProps, "facts" | "pages" | "lens" | "onLens" | "knows" | "ideas" | "ack" | "contactsBirthday"> & {
  person: Person | null;
  params: { lens?: unknown; note?: unknown; item?: unknown };
}) {
  const { person, params, ...rest } = props;
  const [lens, setLens] = useState<Lens>(() => {
    const l = openingLens(props.personId, params);
    lastLens.set(props.personId, l);
    return l;
  });
  const pages = usePages(props.personId);
  const facts = useLineFacts(props.personId);
  const first = props.short?.trim() || (props.name ?? "").trim().split(/\s+/u)[0];
  // The conversation just recorded, said where it went (only one recorded today, never an older one).
  const today = todayIso();
  const latest = pages.entries.find((e) => e.type === "show" && e.kind === "conversation");
  const ack = props.afterReturn && latest && latest.type === "show" && latest.at && todayIso(new Date(latest.at)) === today
    ? `In ${first}'s notebook: ${latest.title}`
    : null;
  return (
    <PersonNotebookView
      {...rest}
      facts={facts}
      pages={pages.loading ? null : pages.entries}
      lens={lens}
      onLens={(l) => {
        lastLens.set(props.personId, l);
        setLens(l);
      }}
      ack={ack}
      contactsBirthday={contactsBirthday(person, today)}
      ideas={<PersonIdeas personId={props.personId} personName={first} />}
      knows={(layout) => (
        <NotebookKnows
          personId={props.personId}
          facts={facts}
          focusItemId={props.focusItemId}
          onLine={props.onLine}
          onSource={props.onSource}
          onLayoutGroup={layout.onLayoutGroup}
          onLayoutLine={layout.onLayoutLine}
        />
      )}
    />
  );
}
