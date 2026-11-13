// The notebook Tell's small motions (PR #77 §7, §10): the breathing dot beside "Understanding…", a
// fade-in, and the yellow pulse on a line found from its phrase. Reduce Motion: no breathing, every
// arrival a 150 ms fade. Nothing here hides or dismisses anything.
import React, { useEffect, useRef } from "react";
import { Animated, Easing, type ViewStyle } from "react-native";
import { motion } from "@/design/tokens";
import { useReduceMotion } from "@/ui";
import { useNotebookPalette } from "@/ui/notebook";

/** The understood-green dot, breathing once a second while Kinship reads (static with Reduce Motion). */
export function BreathingDot() {
  const n = useNotebookPalette();
  const reduce = useReduceMotion();
  const o = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduce) {
      o.setValue(1);
      return;
    }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(o, { toValue: 0.35, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(o, { toValue: 1, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [reduce, o]);
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: n.green, opacity: o }}
    />
  );
}

/** Fades its children in when `token` changes (the review replacing the Tell page: 260 ms; 150 ms reduced). */
export function FadeIn({ token, children, style }: { token: string; children: React.ReactNode; style?: ViewStyle }) {
  const reduce = useReduceMotion();
  const o = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    o.setValue(0);
    Animated.timing(o, { toValue: 1, duration: reduce ? motion.reduced.duration : 260, easing: Easing.bezier(...motion.arrive.easing), useNativeDriver: true }).start();
  }, [token, reduce, o]);
  return <Animated.View style={[{ flex: 1, opacity: o }, style]}>{children}</Animated.View>;
}
