// Temporary context over a screen (plan §18; board 2): the review, a
// correction, the hand-off. The surface, 28 pt corners at the top, a
// grabber, the one sheet shadow. Panes replace a sheet's content: there is
// never a sheet on a sheet.
//
// Motion (Design Direction §H): the scrim fades; the sheet rises in 360 ms
// with no overshoot and leaves in 240 ms. With Reduce Motion both fade in
// 150 ms. The grabber means what it shows: drag the sheet down to close it,
// from anywhere on it once its content is at the top (founder J5, as iOS
// sheets do); content scrolled down scrolls back first.
import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Keyboard, KeyboardAvoidingView, Modal, PanResponder, Platform, ScrollView, StyleSheet, View } from "react-native";
import { Pressable } from "./Pressable";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GUTTER, motion, radius, shadow, size, space } from "@/design/tokens";
import { useReduceMotion, usePalette } from "./theme";
import { sheetClosed, sheetOpened } from "./sheetStack";

/** How far to drag before letting go closes the sheet. */
const DRAG_CLOSE = 96;
const OFFSCREEN = 900;

/** Whether a drag is the sheet's (founder J5): downward, mostly vertical, with its content at the top. */
export function takesDrag(atTop: boolean, dx: number, dy: number): boolean {
  return atTop && dy > 6 && Math.abs(dy) > Math.abs(dx);
}

/** Whether letting go closes it: dragged far enough, or flicked down. */
export function dragCloses(dy: number, vy: number): boolean {
  return dy > DRAG_CLOSE || vy > 0.9;
}

export function Sheet({
  visible,
  onDismiss,
  children,
  label,
  footer,
}: {
  visible: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
  /** Read by screen readers when the sheet opens. */
  label: string;
  /** Pinned under the scrolling content (the sheet's main action). */
  footer?: React.ReactNode;
}) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  // Stays mounted while it leaves, so closing animates too.
  const [mounted, setMounted] = useState(visible);
  const scrim = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(reduce ? 0 : OFFSCREEN)).current;
  const fade = useRef(new Animated.Value(reduce ? 0 : 1)).current;
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;
  // Whether its content is scrolled to the top (founder J5): a sheet opens there.
  const atTop = useRef(true);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      atTop.current = true;
    }
  }, [visible]);

  // Counted from the moment it's up until it has fully left (sheetStack.ts).
  useEffect(() => {
    if (!mounted) return;
    sheetOpened();
    return () => sheetClosed();
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    const [a, b, c, d] = motion.arrive.easing;
    if (visible) {
      if (reduce) {
        rise.setValue(0);
        Animated.parallel([
          Animated.timing(scrim, { toValue: 1, duration: motion.reduced.duration, useNativeDriver: true }),
          Animated.timing(fade, { toValue: 1, duration: motion.reduced.duration, useNativeDriver: true }),
        ]).start();
      } else {
        fade.setValue(1);
        Animated.parallel([
          Animated.timing(scrim, { toValue: 1, duration: motion.scrim.duration, useNativeDriver: true }),
          Animated.timing(rise, { toValue: 0, duration: motion.sheet.duration, easing: Easing.bezier(a, b, c, d), useNativeDriver: true }),
        ]).start();
      }
    } else {
      const out = reduce
        ? [Animated.timing(fade, { toValue: 0, duration: motion.reduced.duration, useNativeDriver: true })]
        : [Animated.timing(rise, { toValue: OFFSCREEN, duration: motion.sheetOut.duration, easing: Easing.in(Easing.cubic), useNativeDriver: true })];
      Animated.parallel([
        Animated.timing(scrim, { toValue: 0, duration: reduce ? motion.reduced.duration : motion.sheetOut.duration, useNativeDriver: true }),
        ...out,
      ]).start(({ finished }) => {
        if (finished) {
          setMounted(false);
          if (!reduce) rise.setValue(OFFSCREEN);
        }
      });
    }
  }, [visible, mounted, reduce, scrim, rise, fade]);

  // Drag down to close, from anywhere on the sheet (founder J5): taken
  // before its content gets it, but only while the content is at the top,
  // so content scrolled down scrolls back first. Taps still reach what's
  // tapped. The sheet follows the finger and settles back on a short drag.
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, g) => takesDrag(atTop.current, g.dx, g.dy),
    onMoveShouldSetPanResponder: (_, g) => takesDrag(atTop.current, g.dx, g.dy),
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (_, g) => rise.setValue(Math.max(0, g.dy)),
    onPanResponderRelease: (_, g) => {
      // As a tap above it does, a drag first puts the keyboard away.
      if (dragCloses(g.dy, g.vy) && !Keyboard.isVisible()) dismiss.current();
      else {
        if (dragCloses(g.dy, g.vy)) Keyboard.dismiss();
        Animated.timing(rise, { toValue: 0, duration: motion.quick, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      }
    },
    onPanResponderTerminate: () => {
      Animated.timing(rise, { toValue: 0, duration: motion.quick, useNativeDriver: true }).start();
    },
  })).current;

  if (!mounted) return null;
  return (
    <Modal visible transparent animationType="none" onRequestClose={onDismiss}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: scrim, backgroundColor: p.scrim }]} />
        {/* A tap above the sheet first puts the keyboard away (iOS's habit);
            with no keyboard up, it closes the sheet. */}
        <Pressable
          accessibilityLabel="Close"
          accessibilityRole="button"
          onPress={() => (Keyboard.isVisible() ? Keyboard.dismiss() : onDismiss())}
          style={{ flex: 1 }}
        />
        <Animated.View
          {...pan.panHandlers}
          accessibilityViewIsModal
          accessibilityLabel={label}
          style={[shadow.sheet, {
            maxHeight: "88%", backgroundColor: p.surface, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet,
            paddingBottom: space.m + insets.bottom, opacity: fade, transform: [{ translateY: rise }],
          }]}
        >
          <View style={{ paddingTop: space.m, paddingBottom: space.xl }}>
            <View
              accessibilityElementsHidden
              importantForAccessibility="no"
              style={{
                alignSelf: "center", width: size.grabber.width, height: size.grabber.height, borderRadius: radius.grabber,
                backgroundColor: p.rule,
              }}
            />
          </View>
          <ScrollView
            // At the top, a downward drag is the sheet's, never an overscroll.
            bounces={false}
            scrollEventThrottle={16}
            onScroll={(e) => {
              atTop.current = e.nativeEvent.contentOffset.y <= 0;
            }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: space.s }}
          >
            {children}
          </ScrollView>
          {footer ? <View style={{ paddingHorizontal: GUTTER, paddingTop: space.m }}>{footer}</View> : null}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
