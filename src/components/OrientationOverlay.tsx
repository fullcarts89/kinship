/**
 * Orientation Overlay
 *
 * A full-screen spotlight overlay for first-time user guidance.
 * Dims the screen with a warm-cream scrim and cuts out a soft
 * "spotlight" around the highlighted UI region. A floating card
 * provides context with a plant icon, headline, body copy,
 * progress dots, and Continue/Skip buttons.
 *
 * Spotlight technique: react-native-svg Path with even-odd fill rule.
 * The outer path is a full-screen rectangle; the inner path is a
 * rounded rectangle traced in reverse winding, which creates a
 * transparent "hole" through the scrim.
 *
 * All animations use react-native-reanimated with calm, organic
 * timing — no bounce, no springs, no overshoot.
 */

import React, { useEffect } from "react";
import { View, Text, Pressable, useWindowDimensions } from "react-native";
import Svg, { Path } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { Sprout } from "lucide-react-native";
import { fonts } from "@design/tokens";

// ─── Design Tokens ─────────────────────────────────────────────────────────

const sage = "#7A9E7E";
const sagePale = "#EBF3EB";
const cream = "#FDF7ED";
const nearBlack = "#1C1917";
const warmGray = "#78716C";
const white = "#FFFFFF";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface HighlightRect {
  x: number;
  y: number;
  width: number;
  height: number;
  borderRadius?: number;
}

interface OrientationOverlayProps {
  /** Whether the overlay is visible. */
  isOpen: boolean;
  /** Current step number (1-based). */
  step: number;
  /** Total number of steps. */
  totalSteps: number;
  /** Region to highlight with a transparent cutout. */
  highlightRect: HighlightRect | null;
  /** Guidance card title (DM Serif Display). */
  title: string;
  /** Guidance card body text (DM Sans). */
  body: string;
  /** Primary button label (e.g., "Continue" or "Finish"). */
  primaryLabel: string;
  /** Called when user taps the primary button. */
  onPrimary: () => void;
  /** Called when user taps "Skip for now". */
  onSkip: () => void;
  /** Where to place the card relative to the spotlight. */
  cardPosition?: "above" | "below" | "center";
}

// ─── SVG Spotlight Path ──────────────────────────────────────────────────

/**
 * Build an SVG path that covers the full screen with a rounded-rect
 * cutout. Uses even-odd fill rule: outer rect (clockwise) + inner
 * rounded rect (counter-clockwise) = transparent hole.
 */
function buildSpotlightPath(
  screenW: number,
  screenH: number,
  rect: HighlightRect | null
): string {
  // Full-screen outer rectangle (clockwise)
  let d = `M 0 0 L ${screenW} 0 L ${screenW} ${screenH} L 0 ${screenH} Z`;

  if (!rect) return d;

  const { x, y, width, height, borderRadius: r = 0 } = rect;
  const clampedR = Math.min(r, width / 2, height / 2);

  // Inner rounded rectangle (counter-clockwise for even-odd cutout)
  // Padding around the highlight for breathing room
  const pad = 8;
  const px = x - pad;
  const py = y - pad;
  const pw = width + pad * 2;
  const ph = height + pad * 2;
  const pr = Math.min(clampedR + 4, pw / 2, ph / 2);

  d += ` M ${px + pr} ${py}`;
  d += ` L ${px + pw - pr} ${py}`;
  d += ` Q ${px + pw} ${py} ${px + pw} ${py + pr}`;
  d += ` L ${px + pw} ${py + ph - pr}`;
  d += ` Q ${px + pw} ${py + ph} ${px + pw - pr} ${py + ph}`;
  d += ` L ${px + pr} ${py + ph}`;
  d += ` Q ${px} ${py + ph} ${px} ${py + ph - pr}`;
  d += ` L ${px} ${py + pr}`;
  d += ` Q ${px} ${py} ${px + pr} ${py}`;
  d += ` Z`;

  return d;
}

// ─── Progress Dots ─────────────────────────────────────────────────────────

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "center",
        gap: 6,
        marginTop: 16,
      }}
    >
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            width: i + 1 === current ? 18 : 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: i + 1 === current ? sage : sage + "44",
          }}
        />
      ))}
    </View>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────

export function OrientationOverlay({
  isOpen,
  step,
  totalSteps,
  highlightRect,
  title,
  body,
  primaryLabel,
  onPrimary,
  onSkip,
  cardPosition = "below",
}: OrientationOverlayProps) {
  const { width: screenW, height: screenH } = useWindowDimensions();

  // ─── Entrance animations ──────────────────────────────────────────────
  const scrimOpacity = useSharedValue(0);
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(12);

  useEffect(() => {
    if (isOpen) {
      // Scrim fades in
      scrimOpacity.value = withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.ease),
      });
      // Card appears with slight delay
      cardOpacity.value = withDelay(
        150,
        withTiming(1, { duration: 250, easing: Easing.out(Easing.ease) })
      );
      cardTranslateY.value = withDelay(
        150,
        withTiming(0, { duration: 250, easing: Easing.out(Easing.cubic) })
      );
    } else {
      scrimOpacity.value = withTiming(0, { duration: 200 });
      cardOpacity.value = withTiming(0, { duration: 150 });
      cardTranslateY.value = 12;
    }
  }, [isOpen, step]);

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: scrimOpacity.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }],
  }));

  if (!isOpen) return null;

  // ─── Card positioning ─────────────────────────────────────────────────
  // Place the card above or below the spotlight, or centered if no rect.
  let cardTop: number | undefined;
  let cardBottom: number | undefined;

  if (!highlightRect || cardPosition === "center") {
    // Center the card on screen
    cardTop = screenH * 0.35;
  } else if (cardPosition === "above") {
    // Card above the spotlight
    const spotTop = highlightRect.y - 8;
    cardBottom = screenH - spotTop + 20;
  } else {
    // Card below the spotlight (default)
    const spotBottom = highlightRect.y + highlightRect.height + 8;
    cardTop = spotBottom + 20;
  }

  const spotlightPath = buildSpotlightPath(screenW, screenH, highlightRect);

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
      }}
      pointerEvents="box-none"
    >
      {/* Scrim with spotlight cutout */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          },
          scrimStyle,
        ]}
        pointerEvents="auto"
      >
        <Pressable
          onPress={() => {
            /* Block taps outside highlight */
          }}
          style={{ flex: 1 }}
        >
          <Svg
            width={screenW}
            height={screenH}
            style={{ position: "absolute", top: 0, left: 0 }}
          >
            <Path
              d={spotlightPath}
              fill="rgba(253,247,237,0.82)"
              fillRule="evenodd"
            />
          </Svg>
        </Pressable>
      </Animated.View>

      {/* Guidance card */}
      <Animated.View
        style={[
          {
            position: "absolute",
            left: 24,
            right: 24,
            ...(cardTop !== undefined ? { top: cardTop } : {}),
            ...(cardBottom !== undefined ? { bottom: cardBottom } : {}),
            backgroundColor: white,
            borderRadius: 20,
            paddingHorizontal: 24,
            paddingTop: 24,
            paddingBottom: 20,
            shadowColor: nearBlack,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.1,
            shadowRadius: 24,
            elevation: 8,
          },
          cardStyle,
        ]}
        pointerEvents="auto"
      >
        {/* Plant icon */}
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: sagePale,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 14,
          }}
        >
          <Sprout color={sage} size={22} strokeWidth={1.8} />
        </View>

        {/* Headline */}
        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize: 20,
            color: nearBlack,
            lineHeight: 26,
            marginBottom: 8,
          }}
        >
          {title}
        </Text>

        {/* Body */}
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 15,
            color: warmGray,
            lineHeight: 22,
            marginBottom: 20,
          }}
        >
          {body}
        </Text>

        {/* Primary button */}
        <Pressable
          onPress={onPrimary}
          style={{
            backgroundColor: sage,
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.sansSemiBold,
              fontSize: 16,
              color: white,
            }}
          >
            {primaryLabel}
          </Text>
        </Pressable>

        {/* Skip link */}
        <Pressable
          onPress={onSkip}
          style={{ paddingVertical: 10, alignItems: "center" }}
        >
          <Text
            style={{
              fontFamily: fonts.sansMedium,
              fontSize: 14,
              color: warmGray,
            }}
          >
            Skip for now
          </Text>
        </Pressable>

        {/* Progress dots */}
        <ProgressDots current={step} total={totalSteps} />
      </Animated.View>
    </View>
  );
}
