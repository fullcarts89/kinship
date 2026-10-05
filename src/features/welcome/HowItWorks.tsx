// "See how it works" (activation pass): one continuous example of the whole
// loop, from the welcome screen, in four quiet steps. Tell → Kinship
// remembers → it brings it back → you reach out, and it asks one thing.
//
// It is clearly an example: every step is labelled so, nothing is saved, and
// the example person exists only on this screen. Each step shows what the
// product really does (the same components, the same words the app would
// use): the day after Ben's race, Today asks "How did it go for Ben?".
import React, { useEffect, useRef, useState } from "react";
import { Animated, Modal, Text, View } from "react-native";
import { MessageCircle, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GUTTER, maxScale, motion, radius, size, space, stroke, type } from "@/design/tokens";
import { Body, Display, IconButton, Label, Line, Pill, Provenance, Small, Sprig, Title, usePalette, useReduceMotion } from "@/ui";

/** A fixed identity for the example's Ben (never a real person's id). */
export const EXAMPLE_BEN = "example:ben";

export const HOW_COPY = {
  link: "See how it works",
  close: "Close the example",
  label: (n: number) => `An example · ${n} of 4`,
  notSaved: "Nothing here is saved. It's only an example.",
  next: "Next",
  done: "Got it",
  steps: [
    { title: "You tell Kinship what's going on, in your own words." },
    { title: "Kinship keeps what matters, and where it came from." },
    { title: "When it matters, it brings it back." },
    { title: "You reach out. Afterwards, one quiet question." },
  ],
  note: "Ben runs Chicago Sunday and hopes to break four hours.",
  kept: "Ben runs Chicago Sunday",
  goal: "Hoping to break four hours",
  told: "You told Kinship · Thursday",
  today: "Monday, 12 October",
  moment: "How did it go for Ben?",
  context: "Ben runs Chicago Sunday · Sun, Oct 11",
  ask: "Ask how it went",
  opens: "One more tap opens Messages with Ben. Kinship never sends anything.",
  reached: "Did you reach Ben?",
  after: "Anything worth remembering about Ben?",
  afterNote: "Whatever you say becomes part of what Kinship knows, and it starts again.",
} as const;

/** An understood word as the review draws it (inert here: it's an example). */
function Understood({ children }: { children: string }) {
  const p = usePalette();
  return (
    <View style={{ borderBottomWidth: stroke.underline, borderBottomColor: p.ochre, paddingBottom: 1 }}>
      <Text maxFontSizeMultiplier={maxScale.text} style={[type.field, { color: p.inkBody }]}>{children}</Text>
    </View>
  );
}

function Step({ index }: { index: number }) {
  const p = usePalette();
  switch (index) {
    case 0:
      return (
        <View style={{ marginTop: space.xl }}>
          <View style={{ backgroundColor: p.surface, borderRadius: radius.inline + 2, borderWidth: 1, borderColor: p.hairline, padding: space.l + 2 }}>
            <Line>{`“${HOW_COPY.note}”`}</Line>
          </View>
          <Small style={{ marginTop: space.m }}>{HOW_COPY.notSaved}</Small>
        </View>
      );
    case 1:
      return (
        <View style={{ marginTop: space.xl, borderTopWidth: 1, borderTopColor: p.hairline }}>
          <View style={{ paddingVertical: space.l, borderBottomWidth: 1, borderBottomColor: p.hairline, gap: space.s }}>
            <Line>{HOW_COPY.kept}</Line>
            <View style={{ flexDirection: "row", gap: space.s, alignItems: "center" }}>
              <Understood>Ben</Understood>
              <Small>·</Small>
              <Understood>Sun, Oct 11</Understood>
            </View>
            <Small>{HOW_COPY.goal}</Small>
          </View>
          <View style={{ marginTop: space.m }}><Provenance line={HOW_COPY.told} /></View>
        </View>
      );
    case 2:
      return (
        <View style={{ marginTop: space.xl }}>
          <Label>{HOW_COPY.today}</Label>
          <View style={{ flexDirection: "row", gap: space.l, marginTop: space.l, alignItems: "flex-start" }}>
            <Sprig personId={EXAMPLE_BEN} width={size.sprig.moment} />
            <View style={{ flex: 1 }}>
              <Display>{HOW_COPY.moment}</Display>
              <Body style={{ marginTop: space.m }}>{HOW_COPY.context}</Body>
              <View style={{ marginTop: space.s }}><Provenance line={HOW_COPY.told} /></View>
            </View>
          </View>
          <View style={{ flexDirection: "row", marginTop: space.xl }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            <Pill variant="primary" label={HOW_COPY.ask}
              icon={({ color, size: s, strokeWidth }) => <MessageCircle color={color} size={s} strokeWidth={strokeWidth} />} onPress={() => undefined} />
          </View>
          <Small style={{ marginTop: space.m }}>{HOW_COPY.opens}</Small>
        </View>
      );
    default:
      return (
        <View style={{ marginTop: space.xl }}>
          <Line>{HOW_COPY.reached}</Line>
          <View style={{ flexDirection: "row", gap: space.s, marginTop: space.m }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            <Pill size="small" label="Yes" onPress={() => undefined} />
            <Pill size="small" label="Not yet" onPress={() => undefined} />
          </View>
          <View style={{ marginTop: space.x3, paddingTop: space.xl, borderTopWidth: 1, borderTopColor: p.hairline }}>
            <Display>{HOW_COPY.after}</Display>
            <Body style={{ marginTop: space.m }}>{HOW_COPY.afterNote}</Body>
          </View>
        </View>
      );
  }
}

export function HowItWorksView({ step, onNext, onClose }: { step: number; onNext: () => void; onClose: () => void }) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const fade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: reduce ? motion.reduced.duration : motion.arrive.duration, useNativeDriver: true }).start();
  }, [step, reduce, fade]);
  const last = step >= HOW_COPY.steps.length - 1;
  return (
    <View style={{ flex: 1, backgroundColor: p.paper, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: space.m }}>
        <IconButton label={HOW_COPY.close} onPress={onClose}>
          <X color={p.inkQuiet} size={size.iconLarge} strokeWidth={1.8} />
        </IconButton>
      </View>
      <Animated.View style={{ flex: 1, opacity: fade, paddingHorizontal: GUTTER }} accessibilityLiveRegion="polite">
        <Label>{HOW_COPY.label(step + 1)}</Label>
        <Title style={{ marginTop: space.m }}>{HOW_COPY.steps[step].title}</Title>
        <Step index={step} />
      </Animated.View>
      <View style={{ paddingHorizontal: GUTTER, paddingBottom: insets.bottom + space.xl }}>
        <Pill variant={last ? "primary" : "ghost"} label={last ? HOW_COPY.done : HOW_COPY.next} onPress={last ? onClose : onNext} />
      </View>
    </View>
  );
}

/** The example, over the welcome screen. Opening it again starts at the beginning. */
export function HowItWorks({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (visible) setStep(0);
  }, [visible]);
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <HowItWorksView step={step} onNext={() => setStep((s) => Math.min(s + 1, HOW_COPY.steps.length - 1))} onClose={onClose} />
    </Modal>
  );
}
