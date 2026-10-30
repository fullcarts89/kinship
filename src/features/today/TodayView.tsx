// Today (Electric Garden, FD-30b): the date, a greeting, and the one moment
// at poster scale: a dawn wash for the kind of day, the hero bloom cut by the
// page's top right, the person's photo in the fluid mask with leaves crossing
// in front (or, without a photo, their name filled with the bloom), the name,
// the statement, the event, what they hoped for in the user's words, where it
// came from, one primary action and "Not now"; then the week as quiet lines.
// Or a quiet day: cooler, lower light, a bud from the page's edge, and one
// sentence. The Tell field and the bar sit below (the tab layout). From plain
// data: app/v2/(main)/index.tsx supplies it.
import React from "react";
import { useWindowDimensions, View } from "react-native";
import { MessageCircle } from "lucide-react-native";
import { art as artTokens, motion, press, space } from "@/design/tokens";
import { Pressable } from "@/ui/Pressable";
import {
  Body, Botanical, Context, DawnWash, type DayKind, Display, FluidPhoto, Greeting, Label, MomentText, Pill, PosterName, Provenance, QuietLine, Quote,
  Screen, Small, Statement, useReduceMotion, usePalette,
} from "@/ui";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import type { QuietView, TodayView as TodayData } from "./todayModel";

export interface TodayViewProps {
  view: TodayData;
  /**
   * Something on screen wants the user's attention now (the Kept card of a
   * note just told): Today never says "Nothing needs you today" over it (H19).
   */
  attention?: boolean;
  /** After "Yes": the same reason carried on ("Anything worth remembering from congratulating Ben?"). */
  afterReturn: { personId: string; personName: string; followUp?: string } | null;
  onPrimary: () => void;
  /** Tap the moment's words → its detail (founder I1). */
  onOpenMoment?: () => void;
  onNotNow: () => void;
  onProvenance: () => void;
  onReturn: (answer: "yes" | "not_yet") => void;
  onRemember: () => void;
  onNothing: () => void;
  onQuiet: (q: QuietView) => void;
  /** First use: tell Kinship one thing (focuses the Tell field). */
  onTellFirst?: () => void;
  /** First use with no one here: bring people in. */
  onAddPeople?: () => void;
  /** "Got it" on how Kinship brings things back (founder H4): never shown again. */
  onBringBackSeen?: () => void;
  /**
   * Today's reasons are still being refreshed (at most 1.5 s after opening):
   * hold the empty states, so "Nothing needs you today" never flashes before
   * a moment arrives.
   */
  settling?: boolean;
  /** The photo the user chose for the moment's person (local only); null when there is none. */
  photoUri?: string | null;
  /**
   * The kind of day the light says (FD-30b). Derived from the moment when not given; a model that knows
   * better (a difficult day) can say so here. The plants never change with it.
   */
  dayKind?: DayKind;
  footer?: React.ReactNode;
}

export const FIRST_USE_COPY = {
  title: "This is where Kinship brings things back.",
  withPeople: "Tell Kinship what's going on with the people you care about. When something matters, like a birthday, a big day or something you said you'd do, it will be here, with what you said.",
  noPeople: "Add the people you care about, then tell Kinship what's going on with them. When something matters, like a birthday or a big day, it will be here.",
  tell: "Tell Kinship one thing",
  add: "Add your people",
  addMore: "Add more people",
} as const;

/**
 * How Kinship brings things back, once, after the first Tell (founder H4; CC-17, CC-20): the approved line,
 * then the loop as it really runs, with the user's own words when their first Tell has a day to come.
 */
export const BRING_BACK_COPY = {
  title: "This is where Kinship brings things back, when they matter.",
  told: "You told Kinship",
  back: "Kinship brings it back here, with Message and Call.",
  after: "When you're back",
  ask: (name: string) => `Did you reach ${name}?`,
  example: "An example",
  exampleTold: "You tell Kinship",
  exampleNote: "Ben runs Chicago Sunday and hopes to break four hours.",
  exampleWhen: "The day after",
  exampleBack: "It comes back here: “How did it go for Ben?”",
  exampleAsk: "Did you ask Ben how it went?",
  done: "Got it",
} as const;

/** Moments the light calls joyful: a birthday, good news, a big day, how it went. */
const JOYFUL = new Set(["birthday", "good_news", "starts_today", "upcoming_event", "event_followup", "milestone"]);

/** The kind of day, from what Today shows (never from anything sensitive: nothing sensitive reaches Today). */
export function dayKindFor(view: TodayData, attention = false): DayKind {
  if (view.moment) return JOYFUL.has(view.moment.type) ? "joyful" : "warm";
  if (view.returnCheck || view.firstUse || view.bringBack) return "warm";
  if (view.waiting || attention) return "quiet";
  return "quiet";
}

/**
 * The statement split for the poster (Stage 1: "Ben" at 120 pt, "runs Chicago tomorrow." at 40): the
 * person's name when the statement opens with it, and the rest. A statement that doesn't open with the
 * name is set whole under the name. The whole statement is always what screen readers hear.
 */
export function posterSplit(statement: string, name: string): { name: string; rest: string } {
  const n = name.trim();
  if (n && statement.startsWith(`${n} `) && statement.length > n.length + 1) return { name: n, rest: statement.slice(n.length + 1) };
  return { name: n, rest: statement };
}

export function TodayView(props: TodayViewProps) {
  const p = usePalette();
  const { view } = props;
  const { width } = useWindowDimensions();
  // "and 2 more" opens in place; nothing in the next week is ever hidden for good.
  const [allComing, setAllComing] = React.useState(false);
  const quiet = view.quiet.flatMap((q) => (q.kind === "more" ? (allComing ? q.rest : [q]) : [q]));
  const kind = props.dayKind ?? dayKindFor(view, props.attention);
  const moment = view.moment;
  const photo = moment && props.photoUri ? props.photoUri : null;
  const quietDay = !moment && !props.settling && !view.unknown && !view.firstUse && !view.bringBack && !view.waiting && view.quietDay && !props.afterReturn && !props.attention;

  const art = (
    <>
      <DawnWash kind={kind} />
      {moment || (view.firstUse && !props.afterReturn) ? <Botanical art="bloom" width={330} top={-6} right={-26} /> : null}
      {moment && !photo ? <Botanical art="leaves" width={230} top={150} left={-92} rotate={-24} flip /> : null}
      {quietDay ? <Botanical art="bud" width={170} bottom={-8} right={-14} /> : null}
    </>
  );

  return (
    <Screen footer={props.footer} art={art}>
      <View style={{ paddingTop: space.m }}>
        <Label>{view.dateLabel}</Label>
        <Greeting style={{ marginTop: space.s }}>{view.greeting}</Greeting>
      </View>

      {props.afterReturn ? (
        <View style={{ marginTop: space.x4 }} accessibilityLiveRegion="polite">
          <Display>{props.afterReturn.followUp ?? `Anything worth remembering about ${props.afterReturn.personName}?`}</Display>
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space.m, marginTop: space.xxl }}>
            <Pill variant="primary" label="Tell Kinship" onPress={props.onRemember} />
            <Pill variant="quiet" label="Nothing today" onPress={props.onNothing} />
          </View>
        </View>
      ) : view.returnCheck ? (
        <View style={{ marginTop: space.x4 }} accessibilityLiveRegion="polite">
          <MomentText>{view.returnCheck.ask}</MomentText>
          {view.returnCheck.about ? <Small style={{ marginTop: space.xs }}>{view.returnCheck.about}</Small> : null}
          <View style={{ flexDirection: "row", gap: space.s, marginTop: space.m }}>
            <Pill size="small" label="Yes" onPress={() => props.onReturn("yes")} />
            <Pill size="small" label="Not yet" onPress={() => props.onReturn("not_yet")} />
          </View>
        </View>
      ) : null}

      {moment ? (
        <Hero
          key={moment.reasonId}
          width={width}
          name={moment.personName}
          statement={moment.statement}
          context={moment.context}
          hope={moment.hope ?? null}
          provenance={moment.provenance}
          photoUri={photo}
          onOpen={props.onOpenMoment}
          onProvenance={props.onProvenance}
          actions={
            <>
              <Pill
                variant="primary"
                label={moment.primary.label}
                accessibilityHint={moment.primary.hint}
                icon={({ color, size, strokeWidth }) => <MessageCircle color={color} size={size} strokeWidth={strokeWidth} />}
                onPress={props.onPrimary}
              />
              <Pill variant="quiet" label="Not now" onPress={props.onNotNow} />
            </>
          }
        />
      ) : props.settling || view.unknown ? null : view.firstUse && !props.afterReturn ? (
        <View style={{ marginTop: space.x5 + space.x4 }}>
          <Display>{FIRST_USE_COPY.title}</Display>
          <Body style={{ marginTop: space.m }}>{view.firstUse.hasPeople ? FIRST_USE_COPY.withPeople : FIRST_USE_COPY.noPeople}</Body>
          {/* One clear next step; the other is a quiet line, never a pair that reads as a toggle. */}
          <View style={{ alignItems: "flex-start", marginTop: space.xxl, gap: space.xs }}>
            {view.firstUse.hasPeople ? (
              <>
                <Pill variant="primary" label={FIRST_USE_COPY.tell} onPress={() => props.onTellFirst?.()} />
                {props.onAddPeople ? <Pill variant="quiet" label={FIRST_USE_COPY.addMore} onPress={() => props.onAddPeople?.()} /> : null}
              </>
            ) : (
              <>
                <Pill variant="primary" label={FIRST_USE_COPY.add} onPress={() => props.onAddPeople?.()} />
                <Pill variant="quiet" label={FIRST_USE_COPY.tell} onPress={() => props.onTellFirst?.()} />
              </>
            )}
          </View>
        </View>
      ) : view.bringBack && !props.afterReturn ? (
        <BringBack view={view.bringBack} onDone={props.onBringBackSeen} />
      ) : view.waiting && !props.afterReturn ? (
        <View style={{ marginTop: space.x4 }}>
          <Display>{view.waiting === "one" ? "One thing to check." : "A few things to check."}</Display>
        </View>
      ) : quietDay ? (
        <View style={{ marginTop: space.x4 }}>
          <Display>Nothing needs you today.</Display>
        </View>
      ) : null}
      {/* While a note just told is on screen (being understood, asked about or kept), the Tell dock alone
          says so (founder K24, 16 Oct): Today keeps whatever it really has, never a second "Understanding…",
          and a quiet day's headline waits until the note settles. */}

      {quiet.length ? (
        <View style={{ marginTop: space.x3, borderTopWidth: 1, borderTopColor: p.hairline, paddingTop: space.l, gap: space.l }}>
          {quiet.map((q, i) => (
            <QuietLine
              key={`${q.kind}${i}`}
              label={q.label}
              text={q.text}
              action={q.kind === "question" || q.kind === "look" ? { label: q.action, onPress: () => props.onQuiet(q) } : undefined}
              onPress={() => (q.kind === "more" ? setAllComing(true) : props.onQuiet(q))}
            />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

/**
 * The moment at poster scale. Order, back to front (Stage 1): wash → bloom →
 * photo → leaves → name. It arrives by rising and fading in; with Reduce
 * Motion, a 150 ms fade.
 */
function Hero({ width, name, statement, context, hope, provenance, photoUri, onOpen, onProvenance, actions }: {
  width: number;
  name: string;
  statement: string;
  context: string | null;
  hope: string | null;
  provenance: string | null;
  photoUri: string | null;
  onOpen?: () => void;
  onProvenance: () => void;
  actions: React.ReactNode;
}) {
  const reduce = useReduceMotion();
  const rise = useSharedValue(reduce ? 0 : motion.hero.rise);
  const fade = useSharedValue(0);
  React.useEffect(() => {
    const [a, b, c, d] = motion.arrive.easing;
    const duration = reduce ? motion.reduced.duration : motion.hero.duration;
    fade.value = withTiming(1, { duration, easing: Easing.bezier(a, b, c, d) });
    rise.value = withTiming(0, { duration, easing: Easing.bezier(a, b, c, d) });
  }, [reduce, fade, rise]);
  const arrive = useAnimatedStyle(() => ({ opacity: fade.value, transform: [{ translateY: rise.value }] }));

  const { name: poster, rest } = posterSplit(statement, name);
  const k = width / 393;
  const photoW = Math.round(width * artTokens.photo.width);
  const photoH = Math.round(photoW * artTokens.photo.aspect);
  const words = (
    <>
      <PosterName name={poster} fill={photoUri ? "ink" : "bloom"} />
      <Statement style={{ marginTop: space.s }}>{rest}</Statement>
    </>
  );
  return (
    <Animated.View style={[{ marginTop: photoUri ? space.l : space.x4 }, arrive]}>
      {photoUri ? (
        <View style={{ height: photoH - 26 * k, marginLeft: -8 * k }}>
          <FluidPhoto uri={photoUri} width={photoW} height={photoH} label={`Photo of ${name}`} />
          <Botanical art="leaves" width={196} top={118} left={176} rotate={16} />
        </View>
      ) : null}
      {onOpen ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={statement}
          accessibilityHint="Shows why this is here"
          onPress={onOpen}
          style={({ pressed }) => ({ opacity: pressed ? press.surface : 1 })}
        >
          {words}
        </Pressable>
      ) : (
        <View accessible accessibilityRole="header" accessibilityLabel={statement}>{words}</View>
      )}
      {context ? <Context style={{ marginTop: space.l }}>{context}</Context> : null}
      {hope ? <Quote style={{ marginTop: space.xs }}>{hope}</Quote> : null}
      {provenance ? (
        <View style={{ marginTop: space.m }}>
          <Provenance line={provenance} onPress={onProvenance} />
        </View>
      ) : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space.m, marginTop: space.xl }}>{actions}</View>
    </Animated.View>
  );
}

/** H4: the loop, once, in three quiet rows (no carousel, no motion), then "Got it". */
function BringBack({ view, onDone }: { view: NonNullable<TodayData["bringBack"]>; onDone?: () => void }) {
  const rows = view.kind === "own"
    ? [
      { label: BRING_BACK_COPY.told, text: view.statement },
      { label: view.when, text: BRING_BACK_COPY.back },
      { label: BRING_BACK_COPY.after, text: BRING_BACK_COPY.ask(view.personName) },
    ]
    : [
      { label: BRING_BACK_COPY.exampleTold, text: BRING_BACK_COPY.exampleNote },
      { label: BRING_BACK_COPY.exampleWhen, text: BRING_BACK_COPY.exampleBack },
      { label: BRING_BACK_COPY.after, text: BRING_BACK_COPY.exampleAsk },
    ];
  return (
    <View style={{ marginTop: space.x4 }} accessibilityLiveRegion="polite">
      <Display>{BRING_BACK_COPY.title}</Display>
      {view.kind === "example" ? <Small style={{ marginTop: space.m }}>{BRING_BACK_COPY.example}</Small> : null}
      <View style={{ marginTop: view.kind === "example" ? space.s : space.l, gap: space.m }}>
        {rows.map((r) => (
          <View key={r.label} accessible accessibilityLabel={`${r.label}: ${r.text}`}>
            <Label>{r.label}</Label>
            <Body tone="ink" style={{ marginTop: space.xs }}>{r.text}</Body>
          </View>
        ))}
      </View>
      <View style={{ alignItems: "flex-start", marginTop: space.l }}>
        <Pill variant="quiet" label={BRING_BACK_COPY.done} onPress={() => onDone?.()} />
      </View>
    </View>
  );
}
