// Telling Kinship about someone from their page: the Tell field in a sheet,
// already about them. Send keeps it; the same flow understands it.
//
// Closing the sheet never throws the words away: they wait as this person's
// draft and come back the next time the sheet opens here, and only here.
import React, { useRef } from "react";
import { space } from "@/design/tokens";
import { Heading, Sheet, Small, TellField } from "@/ui";
import { trackStarted, useTellFlow } from "./TellFlow";

export const TELL_SHEET_COPY = {
  body: "Say it the way you'd tell a friend. Kinship keeps what matters and asks only when unsure.",
  draft: "Your unsent note is still here.",
} as const;

export function TellSheet({ person, onClose }: { person: { id: string; name: string } | null; onClose: () => void }) {
  const flow = useTellFlow();
  const draft = person ? flow.draft(person.id) : "";
  // A draft from before this opening is said to be one.
  const opened = useRef<{ id: string; hadDraft: boolean } | null>(null);
  if (person && opened.current?.id !== person.id) opened.current = { id: person.id, hadDraft: !!draft.trim() };
  if (!person) opened.current = null;
  const sending = useRef(false);
  return (
    <Sheet visible={!!person} onDismiss={onClose} label={person ? `Tell Kinship about ${person.name}` : "Tell Kinship"}>
      <Heading>{person ? `About ${person.name}` : ""}</Heading>
      <Small style={{ marginTop: space.xs, marginBottom: space.l }}>
        {opened.current?.hadDraft && draft.trim() ? TELL_SHEET_COPY.draft : TELL_SHEET_COPY.body}
      </Small>
      <TellField
        value={draft}
        autoFocus
        onChange={(t) => {
          if (!person) return;
          if (!draft.trim() && t.trim()) trackStarted();
          flow.setDraft(person.id, t);
        }}
        onSend={() => {
          const text = draft;
          if (!person || !text.trim() || sending.current) return;
          sending.current = true;
          flow.setDraft(person.id, "");
          onClose();
          void flow.keep(text, person.id).then((ok) => {
            // Not kept: the words go back to being this person's draft.
            if (!ok) flow.setDraft(person.id, text);
          }).finally(() => {
            sending.current = false;
          });
        }}
        placeholder={person ? `What's going on with ${person.name}?` : undefined}
      />
    </Sheet>
  );
}
