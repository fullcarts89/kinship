/**
 * LivingPlant
 *
 * A parametric, internally animated plant illustration. Unlike the static
 * SVG illustrations (which can only sway as one rigid block), every leaf
 * and bloom here is its own animated group riding a single shared time
 * driver with a per-leaf phase offset — so the plant moves like a living
 * thing, not a swinging sign.
 *
 * Stage-aware: complexity grows with the relationship —
 *   seed       → soil mound + seed
 *   sprout     → short stem, 2 leaves
 *   youngPlant → taller stem, 4 leaves
 *   mature     → full stem, 6 leaves
 *   blooming   → + flowers
 *   tree       → tallest, dense leaves, multiple blooms
 *
 * Calm-brand motion rules: leaf rotation stays within ±4°, the cycle is
 * slow (~3.2s), and everything eases — nothing snaps or bounces.
 *
 * Usage (drop-in for the static stage illustrations):
 *   <LivingPlant stage={growth.stage} size={96} />
 */

import React, { useEffect, useMemo } from "react";
import Svg, { G, Path, Circle, Ellipse } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withTiming,
  Easing,
  type SharedValue,
} from "react-native-reanimated";
import { colors } from "@design/tokens";
import type { GrowthStage } from "@/lib/growthEngine";

const AnimatedG = Animated.createAnimatedComponent(G);

// ─── Plant geometry per stage ───────────────────────────────────────────────
// ViewBox is 0 0 100 100; the ground line sits at y≈86.

interface LeafSpec {
  /** Attachment point on the stem (also the rotation origin). */
  x: number;
  y: number;
  /** Resting angle in degrees (negative = leaning left). */
  angle: number;
  /** Leaf size multiplier. */
  scale: number;
  /** Phase offset (0–1) into the shared sway cycle. */
  phase: number;
  /** Mirror the leaf to point left. */
  flip?: boolean;
  color?: string;
}

interface BloomSpec {
  x: number;
  y: number;
  scale: number;
  phase: number;
  petalColor: string;
}

interface PlantSpec {
  /** SVG path for the stem (drawn bottom-up from the ground). */
  stem: string | null;
  stemWidth: number;
  leaves: LeafSpec[];
  blooms: BloomSpec[];
  /** Show the resting seed instead of a stem. */
  seed?: boolean;
}

const sage = colors.sage;
const sageLight = colors.sageLight;
const moss = colors.moss;
const gold = colors.gold;
const peach = colors.peach;
const terracotta = colors.terracotta;

const PLANT_SPECS: Record<GrowthStage, PlantSpec> = {
  seed: {
    stem: null,
    stemWidth: 0,
    leaves: [],
    blooms: [],
    seed: true,
  },
  sprout: {
    stem: "M50 86 C50 78 49.5 72 50 66",
    stemWidth: 2.4,
    leaves: [
      { x: 50, y: 70, angle: -28, scale: 0.85, phase: 0.0, flip: true },
      { x: 50, y: 66, angle: 24, scale: 1.0, phase: 0.35 },
    ],
    blooms: [],
  },
  youngPlant: {
    stem: "M50 86 C50 74 49 64 50 54",
    stemWidth: 2.8,
    leaves: [
      { x: 50, y: 76, angle: -32, scale: 0.9, phase: 0.1, flip: true },
      { x: 50, y: 72, angle: 28, scale: 0.95, phase: 0.45 },
      { x: 50, y: 62, angle: -24, scale: 1.05, phase: 0.7, flip: true, color: sageLight },
      { x: 50, y: 54, angle: 18, scale: 1.1, phase: 0.25 },
    ],
    blooms: [],
  },
  mature: {
    stem: "M50 86 C50 72 48.5 58 50 44",
    stemWidth: 3.2,
    leaves: [
      { x: 50, y: 78, angle: -36, scale: 1.0, phase: 0.05, flip: true },
      { x: 50, y: 74, angle: 30, scale: 1.05, phase: 0.5 },
      { x: 50, y: 64, angle: -28, scale: 1.15, phase: 0.8, flip: true, color: sageLight },
      { x: 50, y: 58, angle: 24, scale: 1.2, phase: 0.3 },
      { x: 50, y: 50, angle: -20, scale: 1.0, phase: 0.6, flip: true },
      { x: 50, y: 44, angle: 14, scale: 0.9, phase: 0.15, color: sageLight },
    ],
    blooms: [],
  },
  blooming: {
    stem: "M50 86 C50 70 48.5 56 50 40",
    stemWidth: 3.2,
    leaves: [
      { x: 50, y: 78, angle: -36, scale: 1.05, phase: 0.05, flip: true },
      { x: 50, y: 73, angle: 30, scale: 1.1, phase: 0.5 },
      { x: 50, y: 64, angle: -28, scale: 1.2, phase: 0.8, flip: true, color: sageLight },
      { x: 50, y: 57, angle: 24, scale: 1.15, phase: 0.3 },
      { x: 50, y: 49, angle: -18, scale: 1.0, phase: 0.6, flip: true },
    ],
    blooms: [
      { x: 50, y: 38, scale: 1.15, phase: 0.2, petalColor: peach },
      { x: 42, y: 50, scale: 0.7, phase: 0.65, petalColor: gold },
    ],
  },
  tree: {
    stem: "M50 86 C50 68 48 52 50 34",
    stemWidth: 3.8,
    leaves: [
      { x: 50, y: 80, angle: -38, scale: 1.1, phase: 0.0, flip: true },
      { x: 50, y: 76, angle: 32, scale: 1.15, phase: 0.45 },
      { x: 50, y: 66, angle: -30, scale: 1.25, phase: 0.75, flip: true, color: sageLight },
      { x: 50, y: 60, angle: 26, scale: 1.3, phase: 0.25 },
      { x: 50, y: 51, angle: -22, scale: 1.15, phase: 0.55, flip: true },
      { x: 50, y: 44, angle: 18, scale: 1.05, phase: 0.9, color: sageLight },
      { x: 50, y: 37, angle: -14, scale: 0.9, phase: 0.4, flip: true },
    ],
    blooms: [
      { x: 50, y: 30, scale: 1.2, phase: 0.15, petalColor: peach },
      { x: 41, y: 44, scale: 0.8, phase: 0.55, petalColor: gold },
      { x: 59, y: 52, scale: 0.7, phase: 0.85, petalColor: peach },
    ],
  },
};

// ─── Animated parts ─────────────────────────────────────────────────────────

/** A single leaf that sways around its stem attachment point. */
function Leaf({
  spec,
  driver,
  amplitude,
}: {
  spec: LeafSpec;
  driver: SharedValue<number>;
  amplitude: number;
}) {
  const animatedProps = useAnimatedProps(() => ({
    rotation:
      spec.angle +
      Math.sin((driver.value + spec.phase) * Math.PI * 2) * amplitude,
    origin: `${spec.x}, ${spec.y}`,
  }));

  const dir = spec.flip ? -1 : 1;
  const s = spec.scale;

  return (
    <AnimatedG animatedProps={animatedProps}>
      <Path
        d={`M${spec.x} ${spec.y} C${spec.x + 7 * s * dir} ${spec.y - 5 * s} ${
          spec.x + 15 * s * dir
        } ${spec.y - 4 * s} ${spec.x + 17 * s * dir} ${spec.y + 1 * s} C${
          spec.x + 11 * s * dir
        } ${spec.y + 6 * s} ${spec.x + 4 * s * dir} ${spec.y + 4 * s} ${spec.x} ${spec.y}`}
        fill={spec.color ?? sage}
      />
      {/* Leaf vein */}
      <Path
        d={`M${spec.x} ${spec.y} Q${spec.x + 8 * s * dir} ${spec.y - 1 * s} ${
          spec.x + 15 * s * dir
        } ${spec.y + 0.5 * s}`}
        stroke={moss}
        strokeWidth={0.7}
        strokeOpacity={0.45}
        fill="none"
      />
    </AnimatedG>
  );
}

/** A flower that breathes (slow scale pulse) and sways slightly. */
function Bloom({
  spec,
  driver,
}: {
  spec: BloomSpec;
  driver: SharedValue<number>;
}) {
  const animatedProps = useAnimatedProps(() => {
    const t = (driver.value + spec.phase) % 1;
    const breath = 1 + Math.sin(t * Math.PI * 2) * 0.04;
    return {
      rotation: Math.sin(t * Math.PI * 2) * 3,
      origin: `${spec.x}, ${spec.y}`,
      scale: spec.scale * breath,
    };
  });

  const petals = [0, 60, 120, 180, 240, 300];

  return (
    <AnimatedG animatedProps={animatedProps} origin={`${spec.x}, ${spec.y}`}>
      {petals.map((deg) => (
        <Ellipse
          key={deg}
          cx={spec.x}
          cy={spec.y - 4.2}
          rx={2.6}
          ry={4.2}
          fill={spec.petalColor}
          opacity={0.92}
          rotation={deg}
          origin={`${spec.x}, ${spec.y}`}
        />
      ))}
      <Circle cx={spec.x} cy={spec.y} r={2.4} fill={gold} />
    </AnimatedG>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export interface LivingPlantProps {
  stage: GrowthStage;
  size: number;
  /**
   * Sway amplitude in degrees added on top of each leaf's resting angle.
   * Callers can soften motion for low-vitality plants. Default 3.5.
   */
  amplitude?: number;
  /** Disable motion entirely (e.g. reduce-motion contexts). */
  animated?: boolean;
}

export function LivingPlant({
  stage,
  size,
  amplitude = 3.5,
  animated = true,
}: LivingPlantProps) {
  const spec = PLANT_SPECS[stage];

  // One shared time driver for the whole plant; leaves/blooms offset by phase.
  const driver = useSharedValue(0);

  useEffect(() => {
    if (!animated) return;
    driver.value = 0;
    driver.value = withRepeat(
      withTiming(1, { duration: 3200, easing: Easing.linear }),
      -1,
      false
    );
  }, [animated]);

  // Randomize the starting phase a touch so a row of plants doesn't move in lockstep.
  const startPhase = useMemo(() => Math.random() * 0.5, []);

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {/* Ground mound */}
      <Ellipse cx={50} cy={88} rx={20} ry={5} fill={terracotta} opacity={0.35} />

      {spec.seed ? (
        <G>
          <Ellipse cx={50} cy={83} rx={5.5} ry={7} fill={terracotta} />
          <Path
            d="M50 76 Q53 80 50 84 Q47 80 50 76"
            fill={gold}
            opacity={0.85}
          />
        </G>
      ) : (
        <>
          {spec.stem && (
            <Path
              d={spec.stem}
              stroke={moss}
              strokeWidth={spec.stemWidth}
              strokeLinecap="round"
              fill="none"
            />
          )}
          {spec.leaves.map((leaf, i) => (
            <Leaf
              key={`leaf-${i}`}
              spec={{ ...leaf, phase: (leaf.phase + startPhase) % 1 }}
              driver={driver}
              amplitude={amplitude}
            />
          ))}
          {spec.blooms.map((bloom, i) => (
            <Bloom
              key={`bloom-${i}`}
              spec={{ ...bloom, phase: (bloom.phase + startPhase) % 1 }}
              driver={driver}
            />
          ))}
        </>
      )}
    </Svg>
  );
}

export default LivingPlant;
