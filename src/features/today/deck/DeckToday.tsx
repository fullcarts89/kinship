// Today as a Moment Deck (PR #77 §2; `renderToday`, `renderFirst`): the date and greeting; the return
// check in its panel; the poster when a Moment clears the existing threshold; "Also coming up" as a
// finite horizontal deck of exactly the quiet lines the existing rules allow, then "That's today."; a
// quiet day composed as its own page; first use as orientation with one clear next step. The same states
// and the same rules as TodayView: this is presentation over Today's own model.
import React, { useRef, useState } from "react";
import { FlatList, Image, View } from "react-native";
import { PenLine, Sprout, Users } from "lucide-react-native";
import { GUTTER, notebook, space } from "@/design/tokens";
import { trailVerb } from "@/features/person/trail";
import { usePhotos } from "@/hooks/usePhotos";
import { gardenArt } from "@/ui/garden";
import { isLargeText, Screen, usePalette } from "@/ui";
import { flowers, Lbl, NButton, NText, personLook, Raised, useNotebookPalette } from "@/ui/notebook";
import { BRING_BACK_COPY, FIRST_USE_COPY, RETURN_COPY, type TodayViewProps } from "../TodayView";
import type { QuietView } from "../todayModel";
import { DeckCard, DECK_COPY, MomentPoster, ReturnPanel } from "./DeckParts";
import { deckCards, posterFor } from "./deckModel";
import type { Rect } from "./MomentFull";

export interface DeckTodayProps extends Omit<TodayViewProps, "onOpenMoment" | "onQuiet" | "afterReturn"> {
  /** After "Yes": the same reason carried on, and how they were reached (the notebook's new line). */
  afterReturn: { personId: string; personName: string; followUp?: string; channel?: string } | null;
  today: string;
  nameOf: (personId: string) => string | null;
  /** Tap the poster (anywhere but a button): it expands from where it is. */
  onOpenMoment: (from: Rect | null) => void;
  /** Tap a deck card: a person's line expands; a question or a note opens as before. */
  onQuiet: (q: QuietView, from: Rect | null) => void;
  /** "I did this" on the user's own promise. */
  onDid?: () => void;
}

/** Where the card is, for the expand; if the measurement doesn't come back promptly, the moment opens with a fade. */
function measure(ref: React.RefObject<View | null>, then: (r: Rect | null) => void) {
  const v = ref.current;
  if (!v || typeof v.measureInWindow !== "function") return then(null);
  let done = false;
  const once = (r: Rect | null) => {
    if (done) return;
    done = true;
    then(r);
  };
  const t = setTimeout(() => once(null), 120);
  v.measureInWindow((x, y, width, height) => {
    clearTimeout(t);
    once(width > 0 && height > 0 ? { x, y, width, height } : null);
  });
}

export function DeckToday(props: DeckTodayProps) {
  const p = usePalette();
  const n = useNotebookPalette();
  const { view } = props;
  const [allComing, setAllComing] = useState(false);
  const poster = useRef<View>(null);
  const cardRefs = useRef(new Map<string, View | null>());
  const moment = view.moment;
  const quietDay = !moment && !props.settling && !view.unknown && !view.firstUse && !view.bringBack && !view.waiting && view.quietDay && !props.afterReturn && !props.afterGesture && !props.attention;
  const entries = deckCards(view.quiet, props.today, props.nameOf, { allComing, firstUse: !!view.firstUse });
  const photos = usePhotos(entries.flatMap((e) => (e.card.kind === "person" ? [e.card.personId] : [])));
  const vertical = isLargeText();
  const rc = view.returnCheck;
  const deckLabel = moment ? DECK_COPY.also : view.firstUse ? DECK_COPY.worth : DECK_COPY.coming;

  const renderCard = ({ item }: { item: (typeof entries)[number] }) => (
    <DeckCard
      ref={(r) => {
        cardRefs.current.set(item.card.key, r);
      }}
      card={item.card}
      full={vertical}
      photoUri={item.card.kind === "person" ? photos[item.card.personId] ?? null : null}
      onPress={item.card.kind === "end" ? undefined : () => {
        if (!item.q) return;
        if (item.q.kind === "more") {
          setAllComing(true);
          return;
        }
        const ref = { current: cardRefs.current.get(item.card.key) ?? null };
        measure(ref, (r) => props.onQuiet(item.q as QuietView, r));
      }}
    />
  );

  return (
    <Screen footer={props.footer}>
      {/* The masthead: the date in caps and the greeting in the user's serif. */}
      <View style={{ paddingTop: space.xl }}>
        <NText v="cap" tone="ink2">{view.dateLabel}</NText>
        <NText v="serif19" tone="ink2" style={{ marginTop: space.xs + 2 }}>{view.greeting}</NText>
      </View>

      {props.afterGesture ? (
        <View style={{ marginTop: space.l }} accessibilityLiveRegion="polite">
          <Raised large style={{ padding: 18 }}>
            <NText v="serif20">{props.afterGesture.ask}</NText>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.m - 2, marginTop: space.l - 2 }}>
              <NButton small label="Yes" onPress={() => props.onGesture?.("yes")} />
              <NButton small variant="ghost" label="Not yet" onPress={() => props.onGesture?.("not_yet")} />
            </View>
            <NText v="fine" tone="quiet" style={{ marginTop: space.m - 2 }}>{"Kinship records only the kind of thing you did, never what you wrote."}</NText>
          </Raised>
        </View>
      ) : props.afterReturn ? (
        <View style={{ marginTop: space.l }} accessibilityLiveRegion="polite">
          <ReturnPanel personId={props.afterReturn.personId} personName={props.afterReturn.personName}>
            <NText v="serif20">{props.afterReturn.followUp ?? `Anything worth remembering about ${props.afterReturn.personName}?`}</NText>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.m - 2, marginTop: space.l - 2 }}>
              <NButton small label="Tell Kinship" onPress={props.onRemember} icon={({ color, size }) => <PenLine color={color} size={size} strokeWidth={1.8} />} />
              <NButton small variant="ghost" label="Nothing today" onPress={props.onNothing} />
            </View>
            {props.afterReturn.channel ? (
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: space.m - 2, marginTop: space.m }}>
                <Sprout size={20} color={n.green} strokeWidth={1.8} />
                <NText v="body15" tone="ink2" style={{ flex: 1 }}>{`In ${props.afterReturn.personName}'s notebook: ${trailVerb(props.afterReturn.channel, null)} · today`}</NText>
              </View>
            ) : null}
          </ReturnPanel>
        </View>
      ) : rc ? (
        <View style={{ marginTop: space.l }} accessibilityLiveRegion="polite">
          <ReturnPanel personId={rc.personId} personName={rc.personName}>
            <NText v="serif20">{rc.ask}</NText>
            {rc.about ? <NText v="small" tone="quiet" style={{ marginTop: space.xs }}>{rc.about}</NText> : null}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.m - 2, marginTop: space.l - 2 }}>
              <NButton small label="Yes" onPress={() => props.onReturn("yes")} testID="rc-yes" />
              <NButton small variant="ghost" label="Not yet" onPress={() => props.onReturn("not_yet")} testID="rc-no" />
              {rc.type === "promise" ? <NButton small variant="ghost" label={RETURN_COPY.putAside} onPress={() => props.onReturn("put_aside")} /> : null}
            </View>
          </ReturnPanel>
        </View>
      ) : null}

      {moment ? (
        <View style={{ marginTop: space.l, marginHorizontal: -(GUTTER - notebook.poster.gutter) }}>
          <MomentPoster
            ref={poster}
            key={moment.reasonId}
            data={posterFor(moment, props.today)}
            photoUri={props.photoUri ?? null}
            onOpen={() => measure(poster, props.onOpenMoment)}
            onPrimary={props.onPrimary}
            onNotNow={props.onNotNow}
            onDid={props.onDid}
            onSource={moment.noteId ? props.onProvenance : undefined}
          />
        </View>
      ) : props.settling || view.unknown ? null : view.firstUse && !props.afterReturn ? (
        <View style={{ marginTop: space.l, marginHorizontal: -(GUTTER - notebook.poster.gutter) }}>
          <View style={{ borderRadius: 30, backgroundColor: n.lime, padding: 22, overflow: "hidden" }}>
            <Image source={flowers.peony} resizeMode="contain" style={{ position: "absolute", width: 190, height: 190, right: -36, bottom: -40, transform: [{ rotate: "-12deg" }] }} />
            <NText v="poster" style={{ fontSize: 38, lineHeight: 37, marginBottom: space.m }} color="#0F2A1D">{FIRST_USE_COPY.title}</NText>
            <NText v="serif19" color="#0F2A1D">{view.firstUse.hasPeople ? FIRST_USE_COPY.withPeople : FIRST_USE_COPY.noPeople}</NText>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s, marginTop: space.l, paddingRight: 60 }}>
              {view.firstUse.hasPeople ? (
                <>
                  <NButton small variant="ink" label={FIRST_USE_COPY.tell} onPress={() => props.onTellFirst?.()} icon={({ color, size }) => <PenLine color={color} size={size} strokeWidth={1.8} />} />
                  {props.onAddPeople ? <NButton small variant="white" label={FIRST_USE_COPY.addMore} onPress={() => props.onAddPeople?.()} /> : null}
                </>
              ) : (
                <>
                  <NButton small variant="ink" label={FIRST_USE_COPY.add} onPress={() => props.onAddPeople?.()} icon={({ color, size }) => <Users color={color} size={size} strokeWidth={1.8} />} />
                  <NButton small variant="white" label={FIRST_USE_COPY.tell} onPress={() => props.onTellFirst?.()} />
                </>
              )}
            </View>
          </View>
        </View>
      ) : view.bringBack && !props.afterReturn ? (
        <View style={{ marginTop: space.l }}>
          <Raised large style={{ padding: 22 }}>
            <NText v="title" style={{ marginBottom: space.m }}>{BRING_BACK_COPY.title}</NText>
            {view.bringBack.kind === "example" ? <NText v="cap" tone="quiet" style={{ marginBottom: space.s }}>{BRING_BACK_COPY.example}</NText> : null}
            {(view.bringBack.kind === "own"
              ? [
                { label: BRING_BACK_COPY.told, text: view.bringBack.statement },
                { label: view.bringBack.when, text: BRING_BACK_COPY.back },
                { label: BRING_BACK_COPY.after, text: BRING_BACK_COPY.ask(view.bringBack.personName) },
              ]
              : [
                { label: BRING_BACK_COPY.exampleTold, text: BRING_BACK_COPY.exampleNote },
                { label: BRING_BACK_COPY.exampleWhen, text: BRING_BACK_COPY.exampleBack },
                { label: BRING_BACK_COPY.after, text: BRING_BACK_COPY.exampleAsk },
              ]).map((r) => (
              <View key={r.label} accessible accessibilityLabel={`${r.label}: ${r.text}`} style={{ marginTop: space.m }}>
                <Lbl>{r.label}</Lbl>
                <NText v="serif18" style={{ marginTop: space.xs }}>{r.text}</NText>
              </View>
            ))}
            <View style={{ alignItems: "flex-start", marginTop: space.l }}>
              <NButton small variant="ghost" label={BRING_BACK_COPY.done} onPress={() => props.onBringBackSeen?.()} />
            </View>
          </Raised>
        </View>
      ) : view.waiting && !props.afterReturn ? (
        <View style={{ marginTop: space.xl }}>
          <NText v="quietTitle" style={{ fontSize: 40, lineHeight: 39 }}>{view.waiting === "one" ? "One thing to check." : "A few things to check."}</NText>
        </View>
      ) : quietDay ? (
        <View style={{ marginTop: space.xxl }} accessibilityLiveRegion="polite">
          <NText v="quietTitle">{DECK_COPY.quietTitle}</NText>
          <NText v="serif20" tone="ink2" style={{ marginTop: space.l - 2 }}>{DECK_COPY.quietSub}</NText>
          <Image source={gardenArt.bud} resizeMode="contain" style={{ width: 210, height: 157, alignSelf: "flex-end", marginTop: space.xl }} accessibilityIgnoresInvertColors />
        </View>
      ) : null}

      {entries.length ? (
        <View style={{ marginTop: space.xxl }}>
          <Lbl>{deckLabel}</Lbl>
          {vertical ? (
            <View style={{ gap: space.m, marginTop: space.m }}>
              {entries.map((e) => <View key={e.card.key}>{renderCard({ item: e })}</View>)}
            </View>
          ) : (
            <FlatList
              horizontal
              data={entries}
              keyExtractor={(e) => e.card.key}
              renderItem={renderCard}
              showsHorizontalScrollIndicator={false}
              snapToInterval={notebook.card.width + space.m}
              decelerationRate="fast"
              style={{ marginHorizontal: -GUTTER, marginTop: space.m }}
              contentContainerStyle={{ paddingHorizontal: notebook.poster.gutter, gap: space.m, paddingBottom: space.xs }}
              accessibilityRole="list"
              testID="moment-deck"
            />
          )}
        </View>
      ) : null}
      <View style={{ height: space.m, backgroundColor: p.paper }} />
    </Screen>
  );
}
