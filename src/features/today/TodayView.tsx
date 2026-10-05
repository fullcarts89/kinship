// Today (board 1, "Thursday, 1 October"): the date, a greeting, one moment
// with the person's sprig and two actions, a hairline, at most two quiet
// lines. Or a quiet day. The Tell field and the bar sit below (the tab
// layout). From plain data: app/v2/(main)/index.tsx supplies it.
import React from "react";
import { View } from "react-native";
import { MessageCircle } from "lucide-react-native";
import { space } from "@/design/tokens";
import { Body, Display, Greeting, Label, Moment, MomentText, Pill, QuietLine, Screen, usePalette } from "@/ui";
import type { QuietView, TodayView as TodayData } from "./todayModel";

export interface TodayViewProps {
  view: TodayData;
  /** After "Yes" to the return check: offer to remember something from it. */
  afterReturn: { personId: string; personName: string } | null;
  onPrimary: () => void;
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
  footer?: React.ReactNode;
}

export const FIRST_USE_COPY = {
  title: "This is where Kinship brings things back.",
  withPeople: "Tell Kinship what's going on with the people you care about. When something matters, like a birthday, a big day or something you said you'd do, it will be here, with what you said.",
  noPeople: "Add the people you care about, then tell Kinship what's going on with them. When something matters, like a birthday or a big day, it will be here.",
  tell: "Tell Kinship something",
  add: "Add your people",
} as const;

export function TodayView(props: TodayViewProps) {
  const p = usePalette();
  const { view } = props;
  return (
    <Screen footer={props.footer}>
      <View style={{ paddingTop: space.x3 }}>
        <Label>{view.dateLabel}</Label>
        <Greeting style={{ marginTop: space.s }}>{view.greeting}</Greeting>
      </View>

      {props.afterReturn ? (
        <View style={{ marginTop: space.x4 }} accessibilityLiveRegion="polite">
          <Display>{`Anything worth remembering about ${props.afterReturn.personName}?`}</Display>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s, marginTop: space.xxl }}>
            <Pill variant="primary" label="Tell Kinship" onPress={props.onRemember} />
            <Pill label="Nothing today" onPress={props.onNothing} />
          </View>
        </View>
      ) : view.returnCheck ? (
        <View style={{ marginTop: space.x4 }} accessibilityLiveRegion="polite">
          <MomentText>{`Did you reach ${view.returnCheck.personName}?`}</MomentText>
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
            provenance={view.moment.provenance}
            onProvenance={props.onProvenance}
            actions={
              <>
                <Pill
                  variant="primary"
                  label={view.moment.primary.label}
                  accessibilityHint={view.moment.primary.hint}
                  icon={({ color, size, strokeWidth }) => <MessageCircle color={color} size={size} strokeWidth={strokeWidth} />}
                  onPress={props.onPrimary}
                />
                <Pill label="Not now" onPress={props.onNotNow} />
              </>
            }
          />
        </View>
      ) : view.firstUse && !props.afterReturn ? (
        <View style={{ marginTop: space.x4 }}>
          <Display>{FIRST_USE_COPY.title}</Display>
          <Body style={{ marginTop: space.m }}>{view.firstUse.hasPeople ? FIRST_USE_COPY.withPeople : FIRST_USE_COPY.noPeople}</Body>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s, marginTop: space.xxl }}>
            {view.firstUse.hasPeople ? (
              <Pill variant="primary" label={FIRST_USE_COPY.tell} onPress={() => props.onTellFirst?.()} />
            ) : (
              <>
                <Pill variant="primary" label={FIRST_USE_COPY.add} onPress={() => props.onAddPeople?.()} />
                <Pill label={FIRST_USE_COPY.tell} onPress={() => props.onTellFirst?.()} />
              </>
            )}
          </View>
        </View>
      ) : view.quietDay && !props.afterReturn ? (
        <View style={{ marginTop: space.x4 }}>
          <Display>Nothing needs you today.</Display>
        </View>
      ) : null}

      {view.quiet.length ? (
        <View style={{ marginTop: space.x4, borderTopWidth: 1, borderTopColor: p.hairline, paddingTop: space.l, gap: space.l }}>
          {view.quiet.map((q, i) => (
            <QuietLine
              key={`${q.kind}${i}`}
              label={q.label}
              text={q.text}
              action={q.kind === "coming" ? undefined : { label: q.action, onPress: () => props.onQuiet(q) }}
              onPress={() => props.onQuiet(q)}
            />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}
