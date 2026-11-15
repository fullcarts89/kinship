// Your words (CMR-1; founder, 10 Nov 2026: "This needs to be logged every time"): the notes the user
// told Kinship that belong with no one in People, kept in full where they can be found. A note that
// names someone in People, or that a line was kept from, is on that person's Pages instead; this page
// holds the rest: understood with nothing in it, kept as written, after understanding failed, or a
// reading the user declined. The same notebook paper as Pages, newest first, with Find.
//
// Reached from the foot of People, only when there is something here (never an empty destination on a
// new account). Nothing here counts, ranks or marks anything; a note opens its Source page, where it
// can be deleted. The place and its name need the founder's confirmation (approved-design-coverage.md).
import React, { useState } from "react";
import { ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Search } from "lucide-react-native";
import { font, maxScale, notebookShadow, space, TOUCH } from "@/design/tokens";
import type { WordsNote } from "@/hooks/usePages";
import { NoteCard } from "@/features/person/notebook/PersonNotebookView";
import { SolidBack } from "@/features/person/notebook/parts";
import { findInPages, PAGES_COPY, withYears, type PageEntry } from "@/features/person/notebook/pagesModel";
import { WORDS_PLACE } from "@/features/tell/keptOn";
import { Pressable } from "@/ui/Pressable";
import { usePalette } from "@/ui";
import { NText, useNotebookPalette } from "@/ui/notebook";

export const WORDS_COPY = {
  title: WORDS_PLACE,
  /** Under the title: what is here, and why. */
  about: "What you told Kinship that isn't about anyone in People yet. Each note is kept exactly as you said it.",
  find: "Find in your words",
  empty: "Nothing here yet. What you tell Kinship about no one in particular will be kept here.",
  /** The row on People that leads here. */
  row: "Your words",
  rowHint: "Notes that aren't about anyone in People yet",
  open: "Opens this note",
} as const;

export function WordsView({ notes, loading, now = new Date(), onBack, onOpen }: {
  notes: WordsNote[];
  loading: boolean;
  now?: Date;
  onBack: () => void;
  /** A note: its Source page. */
  onOpen: (captureId: string) => void;
}) {
  const p = usePalette();
  const n = useNotebookPalette();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const entries: PageEntry[] = notes.map((w) => w.page);
  const shown = findInPages(entries, query);
  const rows = withYears(shown, now);
  return (
    <View style={{ flex: 1, backgroundColor: p.paper }}>
      <SolidBack onPress={onBack} style={{ position: "absolute", top: insets.top + 10, left: 14, zIndex: 5 }} />
      <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1 }} contentContainerStyle={{ paddingTop: insets.top + 60, paddingHorizontal: 18, paddingBottom: insets.bottom + 40 }}>
        <NText v="title" accessibilityRole="header" style={{ fontSize: 34, lineHeight: 34 }}>{WORDS_COPY.title}</NText>
        <NText v="body15" tone="ink2" style={{ marginTop: space.s }}>{WORDS_COPY.about}</NText>
        {entries.length ? (
          <View style={{ marginTop: space.l, marginBottom: 6, minHeight: 50, borderRadius: 25, backgroundColor: n.card, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 18, ...notebookShadow.card }}>
            <Search color={n.quiet} size={20} strokeWidth={1.8} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={WORDS_COPY.find}
              placeholderTextColor={n.quiet}
              accessibilityLabel={WORDS_COPY.find}
              autoCorrect={false}
              returnKeyType="search"
              maxFontSizeMultiplier={maxScale.text}
              testID="words-find"
              style={{ flex: 1, minHeight: TOUCH, fontFamily: font.sans, fontSize: 16, color: p.ink }}
            />
          </View>
        ) : null}
        <View style={{ paddingTop: 10 }}>
          {!entries.length && !loading ? <NText v="fine" tone="quiet">{WORDS_COPY.empty}</NText> : null}
          {entries.length && !shown.length ? <NText v="fine" tone="quiet">{PAGES_COPY.nothingFound}</NText> : null}
          {rows.map((r) => {
            if (r.type === "year") {
              return <NText key={r.key} v="group" accessibilityRole="header" style={{ marginTop: space.s, marginBottom: 14, opacity: 0.25 }}>{String(r.year)}</NText>;
            }
            if (r.type !== "note") return null;
            return (
              <Pressable
                key={r.key}
                accessibilityRole="button"
                accessibilityLabel={r.text ?? ""}
                accessibilityHint={WORDS_COPY.open}
                onPress={() => onOpen(r.captureId)}
                testID={`words-${r.captureId}`}
                style={{ marginBottom: 16 }}
              >
                <NoteCard e={r} now={now} query={query} target={false} onLine={() => undefined} />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
