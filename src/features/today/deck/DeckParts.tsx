// Today's Moment Deck pieces (PR #77 §2; proto.css `.poster`, `.mini`, `.panel`): the poster for the one
// Moment that clears the existing threshold, and the finite deck of what the quiet-line rules already let
// through, ending in "That's today." Pure views over Today's own model: nothing is made up to fill them.
import React, { forwardRef } from "react";
import { Image, View, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Check, MessageCircle, Phone } from "lucide-react-native";
import { gardenArt } from "@/ui/garden";
import { notebook, notebookShadow, press, space } from "@/design/tokens";
import { Pressable } from "@/ui/Pressable";
import { usePalette } from "@/ui";
import { Chip, Face, flowers, initialOf, NButton, NSource, NText, personLook, Raised, useNotebookPalette } from "@/ui/notebook";

export const DECK_COPY = {
  also: "Also coming up",
  coming: "Coming up",
  worth: "Already worth knowing",
  end: "That's today.",
  endSub: "Nothing else is waiting.",
  endFirst: "That's everything so far.",
  endFirstSub: "The more you tell, the more comes back.",
  quietTitle: "Nothing needs you today.",
  quietSub: "Kinship will bring things back when they matter.",
  notNow: "Not now",
  did: "I did this",
  yours: "You said you'd",
  question: "A question",
} as const;

/** What a poster shows, already worded by Today's model (PR #77 `HERO`). */
export interface PosterData {
  personId: string;
  personName: string;
  when: string | null;
  headline: string;
  memory: string | null;
  hope: string | null;
  source: string | null;
  sourceKind: "note" | "contacts";
  primary: string;
  /** The user's own promise: "I did this" leads and Message is secondary (DN-10). */
  promise: boolean;
  /** The Moment's primary hand-off is a call. */
  call?: boolean;
}

/**
 * The poster: the person's photo when the user chose one, else their colour, initial and flower. Tap
 * anywhere but a button to expand it; the screen reader hears it as one button with its words.
 */
export const MomentPoster = forwardRef<View, {
  data: PosterData;
  photoUri: string | null;
  onOpen: () => void;
  onPrimary: () => void;
  onNotNow: () => void;
  onDid?: () => void;
  onSource?: () => void;
  style?: ViewStyle;
}>(function MomentPoster({ data, photoUri, onOpen, onPrimary, onNotNow, onDid, onSource, style }, ref) {
  const n = useNotebookPalette();
  const look = personLook(data.personId);
  const photo = !!photoUri;
  const ink = photo ? n.onPhoto : look.on;
  const label = [data.personName, data.headline, data.memory, data.hope ? `“${data.hope}”` : null, data.source].filter(Boolean).join(". ");
  return (
    <View ref={ref} collapsable={false} style={[{ borderRadius: notebook.poster.radius, ...notebookShadow.poster }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint="Opens the moment"
        onPress={onOpen}
        testID="moment-poster"
        style={({ pressed }) => ({ opacity: pressed ? 0.94 : 1 })}
      >
        <View style={{ minHeight: notebook.poster.height, borderRadius: notebook.poster.radius, overflow: "hidden", backgroundColor: photo ? "#0F2A1D" : look.color, justifyContent: "flex-end" }}>
          {photo ? (
            <>
              <Image source={{ uri: photoUri as string }} resizeMode="cover" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} accessibilityIgnoresInvertColors />
              <LinearGradient
                colors={["rgba(8,22,15,0.05)", "rgba(8,22,15,0.72)", n.photoScrim]}
                locations={[0.34, 0.64, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
              />
              <Image source={flowers[look.flower]} resizeMode="contain" style={{ position: "absolute", width: 120, height: 120, top: -14, right: -18, transform: [{ rotate: "14deg" }] }} />
            </>
          ) : (
            <>
              <NText v="poster" allowFontScaling={false} color="rgba(15,42,29,0.09)" style={{ position: "absolute", left: 14, top: 46, fontSize: notebook.poster.initial, lineHeight: notebook.poster.initial * 0.8, letterSpacing: -9 }}>
                {initialOf(data.personName)}
              </NText>
              <Image source={flowers[look.flower]} resizeMode="contain" style={{ position: "absolute", width: 330, height: 330, right: -60, top: 20, transform: [{ rotate: "-8deg" }] }} />
              <LinearGradient
                colors={[`${look.color}00`, look.color]}
                locations={[0.36, 0.66]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
              />
            </>
          )}
          {data.when ? <View style={{ position: "absolute", top: 18, left: 18 }}><Chip label={data.when} variant={photo ? "lime" : "white"} /></View> : null}
          <View style={{ paddingHorizontal: 22, paddingBottom: 22, paddingTop: 96 }}>
            <NText v="poster" color={ink} style={{ marginBottom: space.m }}>{data.headline}</NText>
            {data.memory ? <NText v="serif19" color={photo ? n.onPhoto : look.on} style={{ marginBottom: space.xs + 2 }}>{data.memory}</NText> : null}
            {data.hope ? <NText v="quote18" color={photo ? n.onPhotoQuiet : look.on} style={{ marginBottom: space.m }}>{`“${data.hope}”`}</NText> : null}
            {data.source ? (
              <NSource
                kind={photo ? "onPhoto" : data.sourceKind}
                label={data.source}
                tone={photo ? "onPhotoQuiet" : undefined}
                color={photo ? undefined : look.on}
                onPress={onSource}
              />
            ) : null}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.m - 2, marginTop: space.l }}>
              {data.promise && onDid ? (
                <>
                  <NButton small variant="lime" label={DECK_COPY.did} onPress={onDid} icon={({ color, size }) => <Check color={color} size={size} strokeWidth={2} />} testID="poster-did" />
                  <NButton small variant={photo ? "onPhoto" : "ghost"} label={data.primary} onPress={onPrimary} testID="poster-primary" />
                </>
              ) : (
                <>
                  <NButton
                    small
                    variant="lime"
                    label={data.primary}
                    onPress={onPrimary}
                    testID="poster-primary"
                    icon={({ color, size }) => (data.call ? <Phone color={color} size={size} strokeWidth={1.8} /> : <MessageCircle color={color} size={size} strokeWidth={1.8} />)}
                  />
                  <NButton small variant={photo ? "onPhoto" : "ghost"} label={DECK_COPY.notNow} onPress={onNotNow} testID="poster-notnow" />
                </>
              )}
            </View>
          </View>
        </View>
      </Pressable>
    </View>
  );
});

export type DeckCardData =
  | { kind: "person"; key: string; personId: string; personName: string; when: string; line: string; source: string | null; sourceKind: "note" | "contacts"; yours?: boolean }
  | { kind: "question"; key: string; label: string; text: string; action: string | null }
  | { kind: "note"; key: string; label: string; text: string; action: string | null; faces?: { personId: string; personName: string }[] }
  | { kind: "more"; key: string; text: string }
  | { kind: "end"; key: string; first?: boolean };

/** One card of the deck: the whole card is a button (44 pt and up), the day is its headline. */
export const DeckCard = forwardRef<View, { card: DeckCardData; onPress?: () => void; photoUri?: string | null; full?: boolean }>(
  function DeckCard({ card, onPress, photoUri, full = false }, ref) {
    const p = usePalette();
    const n = useNotebookPalette();
    const width: ViewStyle = full ? { alignSelf: "stretch" } : { width: notebook.card.width };
    const base: ViewStyle = { ...width, minHeight: notebook.card.minHeight, borderRadius: notebook.card.radius, padding: space.l, overflow: "hidden" };
    if (card.kind === "end") {
      return (
        <View ref={ref} accessible accessibilityLabel={card.first ? `${DECK_COPY.endFirst} ${DECK_COPY.endFirstSub}` : `${DECK_COPY.end} ${DECK_COPY.endSub}`} style={[base, { backgroundColor: n.paper2, justifyContent: "center" }]} testID="deck-end">
          <Image source={gardenArt.bud} resizeMode="contain" style={{ width: 46, height: 34, marginBottom: space.m - 2 }} />
          <NText v="serif21" style={{ fontSize: 22, lineHeight: 26 }}>{card.first ? DECK_COPY.endFirst : DECK_COPY.end}</NText>
          <NText v="small" tone="ink2" style={{ marginTop: space.s - 2 }}>{card.first ? DECK_COPY.endFirstSub : DECK_COPY.endSub}</NText>
        </View>
      );
    }
    let body: React.ReactNode;
    let surface: ViewStyle;
    let label: string;
    if (card.kind === "person") {
      const look = personLook(card.personId);
      const yours = !!card.yours;
      const fg = yours ? p.ink : look.on;
      surface = yours ? { backgroundColor: n.yoursTint, borderLeftWidth: 3, borderLeftColor: n.yours } : { backgroundColor: look.color };
      label = `${card.personName}. ${card.when}. ${card.line}. ${yours ? DECK_COPY.yours : card.source ?? ""}`;
      body = (
        <>
          {yours ? null : <Image source={flowers[look.flower]} resizeMode="contain" style={{ position: "absolute", right: -22, top: -18, width: notebook.card.flower, height: notebook.card.flower, transform: [{ rotate: "10deg" }] }} />}
          <Face personId={card.personId} name={card.personName} photoUri={photoUri} size={yours ? 44 : notebook.card.face} ring={!yours} />
          <View style={{ flex: 1, minHeight: space.l }} />
          <NText v="cardWhen" color={fg} style={yours ? { fontSize: 20, lineHeight: 22 } : undefined}>{card.when}</NText>
          <NText v="serif17" color={fg} style={{ marginTop: space.s - 2 }}>{card.line}</NText>
          {yours ? <NSource kind="yours" label={DECK_COPY.yours} style={{ marginTop: space.m - 2 }} /> : card.source ? <NSource kind={card.sourceKind} label={card.source} color={fg} style={{ marginTop: space.m - 2 }} /> : null}
        </>
      );
    } else if (card.kind === "question") {
      surface = { backgroundColor: n.card, borderWidth: 1.5, borderColor: "rgba(200,20,107,0.3)" };
      label = `${card.label}. ${card.text}${card.action ? `. ${card.action}` : ""}`;
      body = (
        <>
          <NText v="cap" tone="held">{card.label}</NText>
          <View style={{ flex: 1, minHeight: space.l }} />
          <NText v="cardWhen" style={{ fontSize: 22, lineHeight: 24 }}>{card.text}</NText>
          {card.action ? <NText v="strong14" tone="ink2" style={{ marginTop: space.m - 2 }}>{`${card.action} ›`}</NText> : null}
        </>
      );
    } else if (card.kind === "note") {
      surface = { backgroundColor: n.card };
      label = `${card.label}. ${card.text}${card.action ? `. ${card.action}` : ""}`;
      body = (
        <>
          {card.faces?.length ? (
            <View style={{ flexDirection: "row" }}>
              {card.faces.slice(0, 3).map((f, i) => <Face key={f.personId} personId={f.personId} name={f.personName} size={40} ring style={{ marginLeft: i ? -8 : 0 }} />)}
            </View>
          ) : null}
          <View style={{ flex: 1, minHeight: space.l }} />
          <NText v="cardWhen" style={{ fontSize: 20, lineHeight: 22 }}>{card.label}</NText>
          <NText v="serif17" style={{ marginTop: space.s - 2 }}>{card.text}</NText>
          {card.action ? <NText v="strong14" tone="ink2" style={{ marginTop: space.m - 2 }}>{`${card.action} ›`}</NText> : null}
        </>
      );
    } else {
      surface = { backgroundColor: n.paper2, justifyContent: "center" };
      label = card.text;
      body = <NText v="serif20">{card.text}</NText>;
    }
    return (
      <Pressable
        ref={ref}
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        disabled={!onPress}
        testID={`deck-${card.kind}-${card.key}`}
        style={({ pressed }) => ({ opacity: pressed ? press.surface : 1 })}
      >
        <View collapsable={false} style={[base, surface]}>{body}</View>
      </Pressable>
    );
  },
);

/** The return check and what follows it, on Today and on a person's page (PR #77 `.panel`, `renderRC`). */
export function ReturnPanel({ personId, personName, photoUri, children }: { personId: string; personName: string; photoUri?: string | null; children: React.ReactNode }) {
  return (
    <Raised large style={{ padding: 18 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.m - 2, marginBottom: space.m - 2 }}>
        <Face personId={personId} name={personName} photoUri={photoUri} size={34} />
        <NText v="cap" tone="ink2">{personName}</NText>
      </View>
      {children}
    </Raised>
  );
}
