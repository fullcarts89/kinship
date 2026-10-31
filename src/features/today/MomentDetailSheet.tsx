// The Moment detail (founder I1; Electric Garden FD-30b, the founder's named example of the
// redesign): tap a reason → see the reason, as a composition rather than a stacked form.
//
//   back to front   a wash for the kind of moment, one botanical cut by the sheet's top edge
//                   (joyful: the bloom; quiet: a leaf; difficult: none), the person's presence
//                   (their photo in the fluid mask, or their name as a window onto the bloom)
//   the eyebrow     their name and the day, with the kind's dot
//   the centre      the memory, in the user's words as kept (a statement, never dressed as a quote),
//                   and what they hoped for in the user's serif italic
//   the ledger      why now, and where it came from (tap → the note), aligned small
//   the action      one primary (Message), Call beside it, WS-3's "You could…" line under them
//                   (SUA-1), and the quiet way to the person
//
// Built only from Today's own view of the moment (momentDetail.ts): nothing here infers, scores or
// ranks. Sensitive lines never reach Today; a caller that knows a day is difficult may say so and
// gets the restrained treatment. Every behaviour of the earlier sheet is kept: Message, Call, View
// person, the tappable source, dismissal, labels.
import React from "react";
import { useWindowDimensions, View } from "react-native";
import { MessageCircle, Phone } from "lucide-react-native";
import { art as artTokens, GUTTER, type Palette, sectionAccent, space } from "@/design/tokens";
import {
  Botanical, Context, DawnWash, type DayKind, FluidPhoto, isLargeText, Label, MomentText, Pill, PosterName, Provenance, Quote, SectionDot, Sheet,
  Small, usePalette,
} from "@/ui";
import type { MomentDetail } from "./momentDetail";
import { SuggestionLine } from "./SuggestionLine";

export interface MomentDetailSheetProps {
  detail: MomentDetail | null;
  onDismiss: () => void;
  onMessage: () => void;
  onCall: () => void;
  /** Their page, at this memory. */
  onPerson: () => void;
  onSource: (noteId: string) => void;
  /** SUA-1 (FD-30d, WS-3): a tap on the detail's "You could…" line opens Messages. */
  onSuggestion?: () => void;
  /** The photo the user chose for this person (kept on this phone); null when there is none. */
  photoUri?: string | null;
  /** The kind of moment the light says; derived from the reason's type when not given. Never inferred from content. */
  mood?: DayKind;
}

/** Moments the light calls joyful; the rest are quiet. "difficult" is only ever said by a caller that knows. */
const JOYFUL = new Set(["birthday", "good_news", "starts_today", "upcoming_event", "event_followup", "milestone"]);

export function moodFor(type: string): DayKind {
  return JOYFUL.has(type) ? "joyful" : "quiet";
}

/** The accent the kind's dot takes (fixed by kind, never by history). */
export function accentFor(type: string): keyof Palette {
  switch (type) {
    case "promise":
    case "waiting":
      return sectionAccent.youSaid;
    case "event_followup":
    case "good_news":
    case "milestone":
      return sectionAccent.lately;
    case "thread":
      return sectionAccent.between;
    default:
      return sectionAccent.comingUp;
  }
}

/** The words of the ledger. */
export const DETAIL_COPY = {
  whyNow: "Why now",
  from: "From",
  view: (name: string) => `View ${name}`,
} as const;

export function MomentDetailSheet({ detail, onDismiss, onMessage, onCall, onPerson, onSource, onSuggestion, photoUri, mood }: MomentDetailSheetProps) {
  const p = usePalette();
  const { width } = useWindowDimensions();
  const kind: DayKind = mood ?? (detail ? moodFor(detail.type) : "quiet");
  const large = isLargeText();
  const photoW = Math.round(width * 0.46);
  const photoH = Math.round(photoW * artTokens.photo.aspect);
  const bleed = detail ? (
    <View style={{ height: photoUri ? photoH + space.l : 150, overflow: "hidden" }}>
      <DawnWash kind={kind} height={photoUri ? photoH + space.x3 : 220} />
      {kind === "joyful" ? <Botanical art="bloom" width={240} top={-70} right={-60} /> : null}
      {kind === "quiet" ? <Botanical art="leaf" width={150} top={-20} right={-50} rotate={24} dim /> : null}
      {photoUri ? (
        <View style={{ position: "absolute", left: GUTTER - space.s, top: space.xl }}>
          <FluidPhoto uri={photoUri} width={photoW} height={photoH} label={`Photo of ${detail.personName}`} />
          {kind !== "difficult" ? <Botanical art="leaves" width={120} top={photoH * 0.45} left={photoW * 0.6} rotate={14} /> : null}
        </View>
      ) : (
        <View style={{ position: "absolute", left: GUTTER, right: GUTTER, bottom: 0 }}>
          <PosterName name={detail.personName} max={64} min={36} fill={kind === "difficult" ? "ink" : "bloom"} width={width - 2 * GUTTER} />
        </View>
      )}
    </View>
  ) : null;
  return (
    <Sheet visible={!!detail} onDismiss={onDismiss} label={detail ? detail.line : "Moment"} bleed={bleed}>
      {detail ? (
        <View style={{ paddingTop: space.l }}>
          {/* The eyebrow: who and when, with the kind's dot. */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.s }}>
            <SectionDot accent={accentFor(detail.type)} />
            <Label>{detail.when ? `${detail.personName} · ${detail.when}` : detail.personName}</Label>
          </View>
          {/* The centre: the memory as kept, in the user's serif; never dressed as a quote. */}
          <MomentText style={{ marginTop: space.m, fontSize: 26, lineHeight: 32 }} accessibilityRole="header">{detail.line}</MomentText>
          {detail.hope ? <Quote style={{ marginTop: space.s }}>{detail.hope}</Quote> : null}
          {/* The ledger: why now, and where it came from, aligned small. */}
          <View style={{ marginTop: space.xl, borderTopWidth: 1, borderTopColor: p.hairline, paddingTop: space.m, gap: space.s }}>
            <View style={{ flexDirection: large ? "column" : "row", gap: large ? space.xs : space.l }}>
              <Small style={{ width: large ? undefined : 72 }}>{DETAIL_COPY.whyNow}</Small>
              <Context style={{ flex: 1 }}>{detail.why}</Context>
            </View>
            {detail.provenance ? (
              <View style={{ flexDirection: large ? "column" : "row", gap: large ? space.xs : space.l, alignItems: large ? "flex-start" : "center" }}>
                <Small style={{ width: large ? undefined : 72 }}>{DETAIL_COPY.from}</Small>
                <Provenance line={detail.provenance} onPress={detail.noteId ? () => onSource(detail.noteId as string) : undefined} />
              </View>
            ) : null}
          </View>
          {/* The action: one primary, Call beside it, the suggestion under them, the person as the quiet way out. */}
          <View style={{ flexDirection: large ? "column" : "row", gap: space.s, marginTop: space.xxl }}>
            <Pill
              variant="primary"
              dense
              label="Message"
              accessibilityHint={`Opens a conversation with ${detail.personName}`}
              style={large ? { alignSelf: "stretch" } : { flex: 1.6 }}
              icon={({ color, size, strokeWidth }) => <MessageCircle color={color} size={size} strokeWidth={strokeWidth} />}
              onPress={onMessage}
            />
            <Pill
              dense
              label="Call"
              accessibilityHint={`Calls ${detail.personName}`}
              style={large ? { alignSelf: "stretch" } : { flex: 1 }}
              icon={({ color, size, strokeWidth }) => <Phone color={color} size={size} strokeWidth={strokeWidth} />}
              onPress={onCall}
            />
          </View>
          <SuggestionLine suggestion={detail.suggestion} personName={detail.personName} onPress={onSuggestion} />
          <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: space.m }}>
            <Pill variant="quiet" label={DETAIL_COPY.view(detail.personName)} accessibilityHint={`Opens ${detail.personName}'s page at this`} onPress={onPerson} />
          </View>
        </View>
      ) : null}
    </Sheet>
  );
}
