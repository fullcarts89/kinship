// The people Kinship knows about: names only, alphabetical. No counts, no
// scores, nothing to keep up with.
import React, { useState } from "react";
import { TextInput, View } from "react-native";
import { router } from "expo-router";
import { radius, space, TOUCH, type } from "@/design/tokens";
import { personLabel } from "@/features/tell/reviewModel";
import { usePeople, useV2Actions } from "@/hooks/useV2";
import { Body, Pill, Row, Screen, usePalette } from "@/ui";

export default function PeopleScreen() {
  const p = usePalette();
  const people = usePeople();
  const { addPerson } = useV2Actions();
  const [name, setName] = useState("");
  return (
    <Screen title="People" left={<Pill variant="quiet" label="Back" onPress={() => router.back()} />}>
      {people.map((x) => (
        <Row key={x.id} title={personLabel(x, people)} onPress={() => router.push(`/v2/person/${x.id}`)} />
      ))}
      {people.length === 0 ? (
        <Body tone="inkSoft" style={{ marginTop: space.l }}>
          {"No one yet. Add someone, or tell Kinship about them and say they're new."}
        </Body>
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.s, marginTop: space.xl }}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Add someone"
          placeholderTextColor={p.inkSoft}
          accessibilityLabel="Name of someone to add"
          maxLength={80}
          style={[type.body, {
            flex: 1, color: p.ink, minHeight: TOUCH, paddingHorizontal: space.m, borderRadius: radius.inline,
            borderWidth: 1, borderColor: p.hairline, backgroundColor: p.surface,
          }]}
        />
        <Pill label="Add" disabled={!name.trim()} onPress={() => {
          void addPerson(name);
          setName("");
        }} />
      </View>
    </Screen>
  );
}
