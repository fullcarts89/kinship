// "See how it works" (activation pass): one continuous example of the whole
// loop, from the welcome screen, in four quiet steps. Tell → Kinship
// remembers → it brings it back → you reach out, and it asks one thing.
//
// It is clearly an example: every step is labelled so, nothing is saved, and
// the example person exists only on this screen. The last step plays the
// loop's close (founder native pass F12–F14): Yes is a real button, the
// follow-up arrives, a reply is told, and Ben's page shows what it became;
// the moment keeps what Ben was hoping for. Each step shows what the
// product really does (the same components, the same words the app would
// use): the day after Ben's race, Today asks "How did it go for Ben?".
import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, ScrollView, Text, View } from "react-native";
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
  /** The event's own hope, kept with it (Today shows the same line). */
  hope: "Ben was hoping to break four hours.",
  ask: "Ask how it went",
  opens: "One more tap opens Messages with Ben. Kinship never sends anything.",
  reached: "Did you reach Ben?",
  yes: "Yes",
  notYet: "Not yet",
  notYetNote: "Kinship asks once more, later. Nothing else changes.",
  after: "Anything worth remembering about Ben?",
  reply: "Ran 3:52. Wants to do Berlin next.",
  remembered: "Remembered",
  afterLines: [
    { section: "Lately", text: "Ben ran Chicago in 3:52" },
    { section: "Coming up", text: "Ben wants to run Berlin next" },
  ],
  afterTold: "You told Kinship · Monday",
  afterNote: "Ben's page has what happened, and what's next for him. Kinship brings that back too.",
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

function Step({ index, phase, onPhase }: { index: number; phase: number; onPhase: (n: number) => void }) {
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
              <Body tone="ink" style={{ marginTop: space.xs }}>{HOW_COPY.hope}</Body>
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
      return <Afterwards phase={phase} onPhase={onPhase} />;
  }
}

/** One part of the last step arriving: the same quiet fade and 8 pt rise as Today's moment. */
function Arrive({ children }: { children: React.ReactNode }) {
  const reduce = useReduceMotion();
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(reduce ? 0 : motion.arrive.rise)).current;
  useEffect(() => {
    const [a, b, c, d] = motion.arrive.easing;
    const easing = Easing.bezier(a, b, c, d);
    const duration = reduce ? motion.reduced.duration : motion.arrive.duration;
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration, easing, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration, easing, useNativeDriver: true }),
    ]).start();
  }, [reduce, fade, rise]);
  return <Animated.View style={{ opacity: fade, transform: [{ translateY: rise }] }}>{children}</Animated.View>;
}

/**
 * The loop closing (founder native pass F13/F14): "Did you reach Ben?" →
 * Yes → "Anything worth remembering?" with the kind of thing you'd say →
 * what Kinship now remembers, as Ben's page shows it. Yes really is a
 * button here; Next does the same.
 */
export function Afterwards({ phase, onPhase }: { phase: number; onPhase: (n: number) => void }) {
  const p = usePalette();
  const [notYet, setNotYet] = useState(false);
  return (
    <View style={{ marginTop: space.xl }}>
      <Line>{HOW_COPY.reached}</Line>
      <View style={{ flexDirection: "row", gap: space.s, marginTop: space.m }}>
        <Pill size="small" label={HOW_COPY.yes} onPress={() => phase === 0 && onPhase(1)} />
        <Pill size="small" variant="quiet" label={HOW_COPY.notYet} onPress={() => phase === 0 && setNotYet(true)} />
      </View>
      {notYet && phase === 0 ? <Small style={{ marginTop: space.s }}>{HOW_COPY.notYetNote}</Small> : null}
      {phase >= 1 ? (
        <Arrive>
          <View style={{ marginTop: space.xxl, paddingTop: space.xl, borderTopWidth: 1, borderTopColor: p.hairline }}>
            <Title>{HOW_COPY.after}</Title>
            <View style={{ marginTop: space.m, backgroundColor: p.surface, borderRadius: radius.inline + 2, borderWidth: 1, borderColor: p.hairline, padding: space.l }}>
              <Line>{`“${HOW_COPY.reply}”`}</Line>
            </View>
          </View>
        </Arrive>
      ) : null}
      {phase >= 2 ? (
        <Arrive>
          <View style={{ marginTop: space.xl }}>
            <Label tone="ochreText">{HOW_COPY.remembered}</Label>
            {HOW_COPY.afterLines.map((l) => (
              <View key={l.text} style={{ marginTop: space.m }}>
                <Small>{l.section}</Small>
                <Line>{l.text}</Line>
              </View>
            ))}
            <View style={{ marginTop: space.s }}><Provenance line={HOW_COPY.afterTold} /></View>
            <Small style={{ marginTop: space.l }}>{HOW_COPY.afterNote}</Small>
          </View>
        </Arrive>
      ) : null}
    </View>
  );
}

/** The last step's parts: the question, then the reply, then what's remembered. */
export const AFTER_PHASES = 3;

export function HowItWorksView({ step, onNext, onClose, initialPhase = 0 }: {
  step: number;
  onNext: () => void;
  onClose: () => void;
  /** The lab shows the last step's later parts. */
  initialPhase?: number;
}) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const fade = useRef(new Animated.Value(1)).current;
  const [phase, setPhase] = useState(initialPhase);
  useEffect(() => {
    fade.setValue(0);
    setPhase(initialPhase);
    Animated.timing(fade, { toValue: 1, duration: reduce ? motion.reduced.duration : motion.arrive.duration, useNativeDriver: true }).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, reduce, fade]);
  const lastStep = step >= HOW_COPY.steps.length - 1;
  const last = lastStep && phase >= AFTER_PHASES - 1;
  const next = lastStep ? () => setPhase((n) => Math.min(n + 1, AFTER_PHASES - 1)) : onNext;
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
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: space.xl }}>
          <Step index={step} phase={phase} onPhase={setPhase} />
        </ScrollView>
      </Animated.View>
      <View style={{ paddingHorizontal: GUTTER, paddingBottom: insets.bottom + space.xl }}>
        <Pill variant={last ? "primary" : "ghost"} label={last ? HOW_COPY.done : HOW_COPY.next} onPress={last ? onClose : next} />
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
