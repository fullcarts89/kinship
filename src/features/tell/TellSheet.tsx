// Telling Kinship about someone from their page: the Tell field in a sheet,
// already about them. Send keeps it; the same flow understands it.
import React, { useState } from "react";
import { space } from "@/design/tokens";
import { Heading, Sheet, Small, TellField } from "@/ui";
import { trackAbandoned, trackStarted, useTellFlow } from "./TellFlow";

export function TellSheet({ person, onClose }: { person: { id: string; name: string } | null; onClose: () => void }) {
  const flow = useTellFlow();
  const [draft, setDraft] = useState("");
  const close = () => {
    trackAbandoned(draft);
    setDraft("");
    onClose();
  };
  return (
    <Sheet visible={!!person} onDismiss={close} label={person ? `Tell Kinship about ${person.name}` : "Tell Kinship"}>
      <Heading>{person ? `About ${person.name}` : ""}</Heading>
      <Small style={{ marginTop: space.xs, marginBottom: space.l }}>
        {"Say it the way you'd tell a friend. Kinship keeps what matters and asks only when unsure."}
      </Small>
      <TellField
        value={draft}
        autoFocus
        onChange={(t) => {
          if (!draft.trim() && t.trim()) trackStarted();
          setDraft(t);
        }}
        onSend={() => {
          const text = draft;
          if (!person || !text.trim()) return;
          setDraft("");
          onClose();
          void flow.keep(text, person.id);
        }}
        placeholder={person ? `Tell Kinship about ${person.name}…` : undefined}
      />
    </Sheet>
  );
}
