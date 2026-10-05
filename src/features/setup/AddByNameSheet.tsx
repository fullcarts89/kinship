// Add someone by name (People's "+", setup's "Add someone by name"): a name
// and Done. Nothing else is asked.
import React, { useState } from "react";
import { TextInput, View } from "react-native";
import { maxScale, space, type } from "@/design/tokens";
import { Pill, Sheet, Title, usePalette } from "@/ui";

export function AddByNameSheet({
  initial,
  onDismiss,
  onDone,
  onContacts,
}: {
  initial: string | null;
  onDismiss: () => void;
  onDone: (name: string) => Promise<void>;
  /** Offers choosing from contacts instead (People). */
  onContacts?: () => void;
}) {
  const p = usePalette();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  React.useEffect(() => {
    if (initial !== null) setName(initial);
  }, [initial]);
  const done = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      await onDone(name);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet
      visible={initial !== null}
      onDismiss={onDismiss}
      label="Add someone"
      footer={<Pill variant="primary" label="Done" disabled={!name.trim() || busy} onPress={() => void done()} />}
    >
      <Title>Add someone</Title>
      <TextInput
        value={name}
        onChangeText={setName}
        autoFocus
        placeholder="Their name"
        placeholderTextColor={p.inkQuiet}
        accessibilityLabel="Their name"
        returnKeyType="done"
        onSubmitEditing={() => void done()}
        maxLength={80}
        autoCapitalize="words"
        maxFontSizeMultiplier={maxScale.text}
        style={[type.moment, {
          color: p.ink, marginTop: space.l, paddingVertical: space.m, borderBottomWidth: 1, borderBottomColor: p.hairline,
          outlineWidth: 0,
        }]}
      />
      {onContacts ? (
        <View style={{ alignItems: "flex-start", marginTop: space.l }}>
          <Pill size="small" variant="quiet" label="Choose from your contacts instead" onPress={onContacts} />
        </View>
      ) : null}
    </Sheet>
  );
}
