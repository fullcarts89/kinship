// Landing on one line of a long page (founder I1, J3): "View Ben" from a
// Moment scrolls Ben's page (or What Kinship knows) to the memory it was
// about, and that line comes up from faint to full: a soft fade, no badge, no
// colour block. With Reduce Motion the page jumps instead of scrolling and the
// fade takes 150 ms. A line that isn't on this page is never focused, so
// nothing about one person ever lands on another's page.
import React, { useCallback, useEffect, useRef } from "react";
import { Animated, type ScrollView } from "react-native";
import { motion } from "@/design/tokens";
import { useReduceMotion } from "./theme";

/** How long the focused line takes to come up to full. */
export const FOCUS_FADE_MS = 900;
/** Room left above the focused line, so it isn't pinned to the top edge. */
export const FOCUS_ABOVE = 96;

/**
 * Tracks where the page's groups and lines sit (from their layouts) and,
 * once the focused line's place is known, scrolls there once.
 */
export function useLineFocus(focusId: string | null | undefined, scroll: React.RefObject<ScrollView | null>) {
  const reduce = useReduceMotion();
  const groups = useRef<Record<string, number>>({});
  const lines = useRef<Record<string, { group: string; y: number }>>({});
  const done = useRef(false);
  useEffect(() => {
    done.current = false;
  }, [focusId]);
  const settle = useCallback(() => {
    if (done.current || !focusId) return;
    const line = lines.current[focusId];
    const top = line ? groups.current[line.group] : undefined;
    if (!line || top === undefined) return;
    done.current = true;
    scroll.current?.scrollTo({ y: Math.max(0, top + line.y - FOCUS_ABOVE), animated: !reduce });
  }, [focusId, scroll, reduce]);
  return {
    /** A group of lines (a section) laid out at `y` in the page. */
    onGroup: (group: string, y: number) => {
      groups.current[group] = y;
      settle();
    },
    /** A line laid out at `y` within its group. */
    onLine: (group: string, id: string, y: number) => {
      lines.current[id] = { group, y };
      settle();
    },
  };
}

/** The focused line comes up from faint to full; every other line is as always. */
export function Emphasis({ on, children }: { on: boolean; children: React.ReactNode }) {
  const reduce = useReduceMotion();
  const fade = useRef(new Animated.Value(on ? 0.3 : 1)).current;
  useEffect(() => {
    if (!on) return;
    const run = Animated.timing(fade, { toValue: 1, duration: reduce ? motion.reduced.duration : FOCUS_FADE_MS, useNativeDriver: true });
    run.start();
    return () => run.stop();
  }, [on, reduce, fade]);
  return (
    <Animated.View style={{ opacity: fade }} testID={on ? "focused-line" : undefined}>
      {children}
    </Animated.View>
  );
}
