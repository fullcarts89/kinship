// Correction panes (plan §8): who it's about, when, what kind, and the words.
// Panes, not sheets: they replace a sheet's content, so there is never a
// sheet on top of a sheet.

import React, { useMemo, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { Pressable } from "@/ui/Pressable";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { height, maxScale, press, radius, size, space, TOUCH, type } from "@/design/tokens";
import { kindLabel, monthName, spokenDay } from "@/features/memory/format";
import { SWITCHABLE_KINDS, type SwitchableKind } from "@/store/memoryDetail";
import type { Person } from "@/store/repositories";
import { Body, Heading, IconButton, Pill, Row, Small, Sprig, usePalette } from "@/ui";
import { personLabel } from "./reviewModel";

function PaneHeader({ title, onCancel }: { title: string; onCancel: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space.s, marginBottom: space.m }}>
      <Heading style={{ flex: 1 }}>{title}</Heading>
      <Pill variant="quiet" label="Back" onPress={onCancel} />
    </View>
  );
}

export function PersonPane({
  people,
  title,
  current,
  onPick,
  onCancel,
}: {
  people: Person[];
  title: string;
  current?: string | null;
  onPick: (personId: string) => void;
  onCancel: () => void;
}) {
  const p = usePalette();
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return people
      .filter((x) => x.state !== "archived")
      .filter((x) => !q || x.display_name.toLocaleLowerCase().includes(q))
      .sort((a, b) => a.display_name.localeCompare(b.display_name));
  }, [people, query]);
  return (
    <View>
      <PaneHeader title={title} onCancel={onCancel} />
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search your people"
        placeholderTextColor={p.inkQuiet}
        accessibilityLabel="Search your people"
        maxFontSizeMultiplier={maxScale.text}
        style={[type.field, {
          color: p.ink, minHeight: height.search, paddingHorizontal: space.l, borderRadius: radius.pill(height.search),
          borderWidth: 1, borderColor: p.hairline, backgroundColor: p.paper, marginBottom: space.m,
        }]}
      />
      {shown.map((x, i) => (
        <Row
          key={x.id}
          first={i === 0}
          leading={<Sprig personId={x.id} width={size.sprig.row} />}
          title={personLabel(x, people)}
          selected={x.id === current}
          onPress={() => onPick(x.id)}
        />
      ))}
      {shown.length === 0 ? <Small>No one by that name yet.</Small> : null}
    </View>
  );
}

export function KindPane({
  current,
  owner,
  onPick,
  onOwner,
  onCancel,
}: {
  current: string;
  /** For a promise: whose it is. The only thing about a promise that changes (H28). */
  owner?: { value: "user" | "person"; name: string | null };
  onPick: (k: SwitchableKind) => void;
  onOwner?: (owner: "user" | "person") => void;
  onCancel: () => void;
}) {
  if (current === "promise" && owner && onOwner) {
    return (
      <View>
        <PaneHeader title="Whose promise?" onCancel={onCancel} />
        <Row first title="Yours" selected={owner.value === "user"} onPress={() => onOwner("user")} />
        <Row title={owner.name ? `${owner.name}'s` : "Theirs"} selected={owner.value === "person"} onPress={() => onOwner("person")} />
      </View>
    );
  }
  return (
    <View>
      <PaneHeader title="What is it?" onCancel={onCancel} />
      {SWITCHABLE_KINDS.map((k, i) => (
        <Row key={k} first={i === 0} title={kindLabel(k)} selected={k === current} onPress={() => onPick(k)} />
      ))}
    </View>
  );
}

export function WordsPane({ initial, onSave, onCancel }: { initial: string; onSave: (words: string) => void; onCancel: () => void }) {
  const p = usePalette();
  const [words, setWords] = useState(initial);
  return (
    <View>
      <PaneHeader title="In your words" onCancel={onCancel} />
      <TextInput
        value={words}
        onChangeText={setWords}
        multiline
        maxLength={500}
        autoFocus
        accessibilityLabel="What to remember"
        maxFontSizeMultiplier={maxScale.text}
        style={[type.line, {
          color: p.ink, minHeight: TOUCH * 2, padding: space.m, borderRadius: radius.inline, borderWidth: 1,
          borderColor: p.hairline, backgroundColor: p.paper, textAlignVertical: "top",
        }]}
      />
      <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: space.m }}>
        <Pill variant="primary" label="Save" disabled={!words.trim()} onPress={() => onSave(words)} />
      </View>
    </View>
  );
}

export function DatePane({
  title,
  initial,
  today,
  allowNone,
  onPick,
  onCancel,
}: {
  title: string;
  initial: string | null;
  today: string;
  allowNone: boolean;
  onPick: (isoDay: string | null) => void;
  onCancel: () => void;
}) {
  const p = usePalette();
  const [month, setMonth] = useState((initial ?? today).slice(0, 7));
  const [y, m] = month.split("-").map(Number);
  const lead = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const iso = (d: number) => `${month}-${String(d).padStart(2, "0")}`;
  const shift = (n: number) => {
    const t = new Date(Date.UTC(y, m - 1 + n, 1));
    setMonth(`${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}`);
  };
  const dot = TOUCH - space.s;
  return (
    <View>
      <PaneHeader title={title} onCancel={onCancel} />
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: space.s }}>
        <IconButton label="Previous month" onPress={() => shift(-1)}>
          <ChevronLeft color={p.ink} size={size.iconLarge} strokeWidth={1.8} />
        </IconButton>
        <Body tone="ink" style={{ flex: 1, textAlign: "center" }}>{`${monthName(m - 1)} ${y}`}</Body>
        <IconButton label="Next month" onPress={() => shift(1)}>
          <ChevronRight color={p.ink} size={size.iconLarge} strokeWidth={1.8} />
        </IconButton>
      </View>
      <View style={{ flexDirection: "row" }}>
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <Small key={i} style={{ flex: 1, textAlign: "center" }} accessibilityElementsHidden importantForAccessibility="no">{d}</Small>
        ))}
      </View>
      {Array.from({ length: cells.length / 7 }, (_, r) => (
        <View key={r} style={{ flexDirection: "row" }}>
          {cells.slice(r * 7, r * 7 + 7).map((d, i) => {
            if (d === null) return <View key={i} style={{ flex: 1, minHeight: TOUCH }} />;
            const day = iso(d);
            const selected = day === initial;
            return (
              <Pressable
                key={i}
                accessibilityRole="button"
                accessibilityLabel={spokenDay(day)}
                accessibilityState={{ selected }}
                onPress={() => onPick(day)}
                style={({ pressed }) => ({ flex: 1, minHeight: TOUCH, alignItems: "center", justifyContent: "center", opacity: pressed ? press.surface : 1 })}
              >
                <View
                  style={{
                    width: dot, height: dot, borderRadius: dot / 2, alignItems: "center", justifyContent: "center",
                    backgroundColor: selected ? p.ink : "transparent",
                    borderWidth: day === today && !selected ? 1.5 : 0, borderColor: p.ochre,
                  }}
                >
                  <Text maxFontSizeMultiplier={maxScale.label} style={[type.field, { color: selected ? p.onInk : p.ink }]}>{d}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
      {allowNone ? (
        <View style={{ alignItems: "flex-start", marginTop: space.s }}>
          <Pill variant="quiet" label="No date" onPress={() => onPick(null)} />
        </View>
      ) : null}
    </View>
  );
}
