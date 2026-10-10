// Today (board 1, "Thursday, 1 October"): the date, a greeting, one moment
// with the person's sprig and two actions, a hairline, at most two quiet
// lines. Or a quiet day. The Tell field and the bar sit below (the tab
// layout). From plain data: app/v2/(main)/index.tsx supplies it.
import React from "react";
import { View } from "react-native";
import { MessageCircle } from "lucide-react-native";
import { space } from "@/design/tokens";
import { Body, Display, Greeting, Label, Moment, MomentText, Pill, QuietLine, Screen, Small, usePalette } from "@/ui";
import type { QuietView, TodayView as TodayData } from "./todayModel";

export interface TodayViewProps {
  view: TodayData;
  /** After "Yes" to the return check: offer to remember something from it. */
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
  /**
   * Today's reasons are still being refreshed (at most 1.5 s after opening):
   * hold the empty states, so "Nothing needs you today" never flashes before
   * a moment arrives.
   */
  settling?: boolean;
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

export function TodayView(props: TodayViewProps) {
  const p = usePalette();
  const { view } = props;
  // "and 2 more" opens in place; nothing in the next week is ever hidden for good.
  const [allComing, setAllComing] = React.useState(false);
  const quiet = view.quiet.flatMap((q) => (q.kind === "more" ? (allComing ? q.rest : [q]) : [q]));
  return (
    <Screen footer={props.footer}>
      <View style={{ paddingTop: space.x3 }}>
        <Label>{view.dateLabel}</Label>
        <Greeting style={{ marginTop: space.s }}>{view.greeting}</Greeting>
      </View>

      {props.afterReturn ? (
        <View style={{ marginTop: space.x4 }} accessibilityLiveRegion="polite">
          <Display>{props.afterReturn.followUp ?? `Anything worth remembering about ${props.afterReturn.personName}?`}</Display>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s, marginTop: space.xxl }}>
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

      {view.moment ? (
        <View style={{ marginTop: space.x4 }}>
          <Moment
            personId={view.moment.personId}
            statement={view.moment.statement}
            context={view.moment.context}
            hope={view.moment.hope ?? null}
            provenance={view.moment.provenance}
            onProvenance={props.onProvenance}
            onOpen={props.onOpenMoment}
            actions={
              <>
                <Pill
                  variant="primary"
                  label={view.moment.primary.label}
                  accessibilityHint={view.moment.primary.hint}
                  icon={({ color, size, strokeWidth }) => <MessageCircle color={color} size={size} strokeWidth={strokeWidth} />}
                  onPress={props.onPrimary}
                />
                <Pill variant="quiet" label="Not now" onPress={props.onNotNow} />
              </>
            }
          />
        </View>
      ) : props.settling || view.unknown ? null : view.firstUse && !props.afterReturn ? (
        <View style={{ marginTop: space.x4 }}>
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
      ) : view.waiting && !props.afterReturn ? (
        <View style={{ marginTop: space.x4 }}>
          <Display>{view.waiting === "one" ? "One thing to check." : "A few things to check."}</Display>
        </View>
      ) : view.quietDay && !props.afterReturn && !props.attention ? (
        <View style={{ marginTop: space.x4 }}>
          <Display>Nothing needs you today.</Display>
        </View>
      ) : null}

      {quiet.length ? (
        <View style={{ marginTop: space.x4, borderTopWidth: 1, borderTopColor: p.hairline, paddingTop: space.l, gap: space.l }}>
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
