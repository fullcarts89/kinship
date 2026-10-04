// The Tell screen's look, from plain data (Checkpoint D1). The screen
// (app/v2/index.tsx) supplies the data and the actions.
import React from "react";
import { Pressable, TextInput, View } from "react-native";
import { radius, space, TOUCH, type } from "@/design/tokens";
import { Body, Pill, QuietLine, Screen, Small, usePalette } from "@/ui";

export interface TellViewProps {
  tellOn: boolean;
  ai: boolean;
  draft: string;
  onDraft: (text: string) => void;
  onKeep: () => void;
  /** What happened to the note just told. */
  status: string | null;
  /** Notes with a question waiting, understood while away, or waiting to be online. */
  questions: number;
  toLookAt: number;
  waitingOffline: boolean;
  onAnswer: () => void;
  onReview: () => void;
  toast: { text: string; opens: boolean } | null;
  onToast: () => void;
  onUndo: () => void;
  onPeople: () => void;
  /** The review sheet, when one is open. */
  children?: React.ReactNode;
}

export function TellView(props: TellViewProps) {
  const p = usePalette();
  return (
    <Screen title="Kinship" right={<Pill variant="quiet" label="People" onPress={props.onPeople} />}>
      {props.tellOn ? (
        <View style={{ marginTop: space.l }}>
          <View style={{ backgroundColor: p.surface, borderRadius: radius.inline, borderWidth: 1, borderColor: p.hairline, padding: space.m }}>
            <TextInput
              value={props.draft}
              onChangeText={props.onDraft}
              multiline
              maxLength={5000}
              placeholder="Tell Kinship about someone"
              placeholderTextColor={p.inkSoft}
              accessibilityLabel="Tell Kinship about someone"
              style={[type.body, { color: p.ink, minHeight: 88, maxHeight: 200, textAlignVertical: "top" }]}
            />
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: space.s }}>
              <Small style={{ flex: 1 }}>{props.ai ? "I'll read this to understand who and when it's about." : "Kept exactly as you write it."}</Small>
              <Pill variant="primary" label="Keep" disabled={!props.draft.trim()} onPress={props.onKeep} />
            </View>
          </View>
          {props.status ? <Body tone="inkSoft" style={{ marginTop: space.m }} accessibilityLiveRegion="polite">{props.status}</Body> : null}
        </View>
      ) : (
        <Body tone="inkSoft" style={{ marginTop: space.l }}>{"Telling Kinship isn't switched on for this account yet."}</Body>
      )}

      <View style={{ marginTop: space.xl }}>
        {props.questions ? (
          <QuietLine
            text={props.questions === 1 ? "A question about one of your notes" : `Questions about ${props.questions} of your notes`}
            action={{ label: "Answer", onPress: props.onAnswer }}
          />
        ) : null}
        {props.toLookAt ? (
          <QuietLine
            text={props.toLookAt === 1 ? "I understood a note" : `I understood ${props.toLookAt} notes`}
            action={{ label: "Review", onPress: props.onReview }}
          />
        ) : null}
        {props.waitingOffline ? <QuietLine text="I'll understand your notes when you're online." /> : null}
      </View>

      {props.toast ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={props.toast.text}
          accessibilityHint={props.toast.opens ? "Opens what was kept" : undefined}
          onPress={props.onToast}
          style={{
            marginTop: space.xl, minHeight: TOUCH, flexDirection: "row", alignItems: "center", gap: space.s,
            paddingHorizontal: space.m, borderRadius: radius.inline, backgroundColor: p.surface, borderWidth: 1, borderColor: p.hairline,
          }}
        >
          <Small tone="ink" style={{ flex: 1 }} numberOfLines={2}>{props.toast.text}</Small>
          <Pill variant="quiet" label="Undo" onPress={props.onUndo} />
        </Pressable>
      ) : null}
      {props.children}
    </Screen>
  );
}
