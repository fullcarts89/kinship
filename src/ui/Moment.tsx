// Today's one moment (plan §13, §18; board 1): the person's sprig, one serif
// statement, a line of context, where it came from, and at most two actions.
// It arrives by fading up 8 pt over 320 ms; with Reduce Motion, a 150 ms fade.
import React, { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import { motion, size, space } from "@/design/tokens";
import { Provenance } from "./Provenance";
import { Sprig } from "./Sprig";
import { Body, Display } from "./Text";
import { useReduceMotion } from "./theme";

export function Moment({
  statement,
  context,
  hope,
  personId,
  provenance,
  onProvenance,
  actions,
  arrive = true,
}: {
  statement: string;
  /** One line under the statement ("Ben runs Chicago Sunday"). */
  context?: string | null;
  /** What they hoped for, with the event ("Ben was hoping to break four hours."). */
  hope?: string | null;
  /** Whose sprig sits beside it. */
  personId?: string | null;
  provenance?: string | null;
  onProvenance?: () => void;
  /** One primary pill and one quiet one, at most. */
  actions?: React.ReactNode;
  arrive?: boolean;
}) {
  const reduce = useReduceMotion();
  const fade = useRef(new Animated.Value(arrive ? 0 : 1)).current;
  const rise = useRef(new Animated.Value(arrive && !reduce ? motion.arrive.rise : 0)).current;
  useEffect(() => {
    if (!arrive) return;
    const [a, b, c, d] = motion.arrive.easing;
    const easing = Easing.bezier(a, b, c, d);
    const duration = reduce ? motion.reduced.duration : motion.arrive.duration;
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration, easing, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration, easing, useNativeDriver: true }),
    ]).start();
  }, [arrive, reduce, fade, rise, statement]);

  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY: rise }] }}>
      <View style={{ flexDirection: "row", gap: space.l, alignItems: "flex-start" }}>
        {personId ? <Sprig personId={personId} width={size.sprig.moment} /> : null}
        <View style={{ flex: 1 }}>
          <Display>{statement}</Display>
          {context ? <Body style={{ marginTop: space.m }}>{context}</Body> : null}
          {hope ? <Body tone="ink" style={{ marginTop: space.xs }}>{hope}</Body> : null}
          {provenance ? (
            <View style={{ marginTop: space.s }}>
              <Provenance line={provenance} onPress={onProvenance} />
            </View>
          ) : null}
        </View>
      </View>
      {actions ? <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s, marginTop: space.xxl }}>{actions}</View> : null}
    </Animated.View>
  );
}
