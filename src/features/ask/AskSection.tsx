// Ask Kinship v1, placeable (WS-6; CC-25): self-contained pieces a screen can
// put wherever Ask belongs, with their own navigation (a line → its place on
// the person's page, a source → the note, a composed residence line → its
// notes sheet). No chat, no synthesis, no ranking of people; the rules are
// retrieve.ts's and AskResults's.
//
//   AskSection({ query })       "In your memory" (or the honest-miss line)
//                               for the words given; nothing when the words
//                               ask nothing. Reads memory itself.
//   AskSectionView({ view })    the same, for a view the screen already read
//                               with useAsk (People reads once to keep the
//                               people a question names in its list).
//   AskPanel({ initialQuery })  an explicit entry: its own field, then the
//                               section. Place it as a route or a sheet body.
import React, { useCallback, useState } from "react";
import { TextInput, View } from "react-native";
import { type Href, router } from "expo-router";
import { Search } from "lucide-react-native";
import { height, maxScale, radius, size, space, type } from "@/design/tokens";
import { ComposedSheet } from "@/features/person/ComposedSheet";
import type { RecordLine } from "@/features/person/PersonRecordView";
import { usePalette } from "@/ui";
import { afterSheets } from "@/ui/sheetStack";
import { AskResults } from "./AskResults";
import { type AskView, useAsk } from "./useAsk";

/** The field's words for an explicit entry (a proposal; no chat framing). */
export const ASK_FIELD = { placeholder: "Ask about someone's memory", label: "Ask about someone's memory" } as const;

/** What a found line's tap does: its place on the person's page, the note, the notes behind a composed line. */
export function AskSectionView({ view }: { view: AskView }) {
  const [composed, setComposed] = useState<RecordLine | null>(null);
  // Edit and Not this on a composed line's notes live on What Kinship knows.
  const toKnows = useCallback((line: { id: string; person: { id: string } | null }) => {
    setComposed(null);
    if (line.person) afterSheets(() => router.push(`/v2/person/${line.person!.id}/knows?item=${encodeURIComponent(line.id)}`));
  }, []);
  return (
    <>
      <AskResults
        view={view}
        onLine={(href) => router.push(href as Href)}
        onSource={(noteId) => router.push(`/v2/source/${noteId}`)}
        onComposed={setComposed}
      />
      <ComposedSheet
        row={composed}
        visible={!!composed}
        onChange={(line) => toKnows(line)}
        onForget={(r) => toKnows(r.line)}
        onSource={(noteId) => {
          setComposed(null);
          router.push(`/v2/source/${noteId}`);
        }}
        onSettle={() => setComposed(null)}
        onDismiss={() => setComposed(null)}
      />
    </>
  );
}

/** "In your memory" for these words. */
export function AskSection({ query }: { query: string }) {
  return <AskSectionView view={useAsk(query)} />;
}

/** An explicit Ask entry: a field of its own, then what memory says. Separate from People's name filter. */
export function AskPanel({ initialQuery = "", onQuery }: { initialQuery?: string; onQuery?: (query: string) => void }) {
  const p = usePalette();
  const [query, setQuery] = useState(initialQuery);
  return (
    <View>
      <View
        style={{
          minHeight: height.search, borderRadius: radius.pill(height.search), backgroundColor: p.surface,
          borderWidth: 1, borderColor: p.hairline, flexDirection: "row", alignItems: "center", gap: space.s, paddingHorizontal: space.l,
        }}
      >
        <Search color={p.inkQuiet} size={size.icon} strokeWidth={1.8} />
        <TextInput
          value={query}
          onChangeText={(t) => {
            setQuery(t);
            onQuery?.(t);
          }}
          placeholder={ASK_FIELD.placeholder}
          placeholderTextColor={p.inkQuiet}
          accessibilityLabel={ASK_FIELD.label}
          returnKeyType="search"
          autoCorrect={false}
          maxFontSizeMultiplier={maxScale.text}
          style={[type.field, { flex: 1, color: p.ink, paddingVertical: space.m }]}
        />
      </View>
      <AskSection query={query} />
    </View>
  );
}
