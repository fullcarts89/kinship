/**
 * Kinship SVG Illustrations Library
 *
 * Translated from Figma Make design specs to react-native-svg.
 * Each illustration accepts a `size` prop (default varies per illustration).
 *
 * Illustrations:
 * - WateringIllustration — Person watering plants (onboarding, empty garden)
 * - PrivacyIllustration — Shield with plants (privacy screens)
 * - IntentionIllustration — Calendar with plants (intention setting)
 * - SeedIllustration — Sprouts emerging from soil (new beginnings)
 * - GardenRevealIllustration — Full 5-plant garden scene (flourishing)
 * - SunlightIllustration — Sun over potted plant (warmth)
 * - MemoryIllustration — Polaroid photos with flowers (memories)
 * - SuccessIllustration — Big bloom with confetti (completion)
 * - PersonIllustration — Character with flanking plants (person profile)
 * - NoteIllustration — Envelope with flowers (notes/messages)
 * - SingleSproutIllustration — Small sprout in pot (first person added)
 * - SmallGardenIllustration — 2-3 plants (mid-progress)
 * - FlourishingGardenIllustration — 5 plants, no counts (identity state)
 * - PlantBridgeIllustration — Connection bridge with plants (reach-out)
 * - GardenGrowthIllustration — 3 plants at different stages (dashboard widget)
 */

import React from "react";
import Svg, {
  Circle,
  Ellipse,
  G,
  Line,
  Path,
  Rect,
} from "react-native-svg";

// ─── Shared Color Palette ──────────────────────────────────────────────────

export const C = {
  sage: "#7A9E7E",
  sageDark: "#4A7055",
  sageLight: "#C8DEC9",
  sagePale: "#EBF3EB",
  cream: "#FDF7ED",
  creamDark: "#F5EDDB",
  gold: "#D4A853",
  goldLight: "#F0DBA0",
  peach: "#F4B89E",
  lavender: "#C5B8E8",
  sky: "#B8D4E8",
  terracotta: "#C97A5E",
  nearBlack: "#1C1917",
  warmGray: "#78716C",
  white: "#FFFFFF",
} as const;

// ─── Helper: pre-compute sun ray positions ───────────────────────────────

const sunRayAngles = [0, 45, 90, 135, 180, 225, 270, 315];

function computeRayCoords(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  angle: number
) {
  const rad = (angle * Math.PI) / 180;
  return {
    x1: cx + Math.cos(rad) * innerR,
    y1: cy + Math.sin(rad) * innerR,
    x2: cx + Math.cos(rad) * outerR,
    y2: cy + Math.sin(rad) * outerR,
  };
}

// ─── Helper: pre-compute flower petal positions ───────────────────────────

const petalAngles = [0, 60, 120, 180, 240, 300];

function computePetalCenter(cx: number, cy: number, radius: number, angle: number) {
  const rad = (angle * Math.PI) / 180;
  return {
    cx: cx + Math.cos(rad) * radius,
    cy: cy + Math.sin(rad) * radius,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// WATERING ILLUSTRATION — Person watering plants (240x240)
// ═══════════════════════════════════════════════════════════════════════════

interface IllustrationProps {
  size?: number;
}

export function WateringIllustration({ size = 240 }: IllustrationProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 240 240" fill="none">
      {/* Background blob */}
      <Ellipse cx={120} cy={120} rx={108} ry={105} fill={C.sagePale} />
      <Ellipse cx={100} cy={125} rx={90} ry={85} fill={C.sageLight} opacity={0.45} />

      {/* Ground */}
      <Ellipse cx={120} cy={195} rx={85} ry={12} fill={C.sageLight} opacity={0.6} />

      {/* Big plant - left */}
      <Rect x={68} y={158} width={18} height={28} rx={9} fill={C.terracotta} />
      <Rect x={65} y={153} width={24} height={8} rx={4} fill="#B86A4E" />
      <Ellipse cx={77} cy={148} rx={18} ry={12} fill={C.sageDark} transform="rotate(-20 77 148)" />
      <Ellipse cx={85} cy={138} rx={16} ry={11} fill={C.sage} transform="rotate(15 85 138)" />
      <Ellipse cx={72} cy={135} rx={14} ry={10} fill={C.sageDark} transform="rotate(-35 72 135)" />
      <Ellipse cx={80} cy={128} rx={12} ry={8} fill={C.sage} transform="rotate(5 80 128)" />

      {/* Small plant - right */}
      <Rect x={154} y={168} width={14} height={20} rx={7} fill={C.terracotta} />
      <Rect x={151} y={163} width={20} height={7} rx={3.5} fill="#B86A4E" />
      <Ellipse cx={161} cy={156} rx={12} ry={9} fill={C.sageDark} transform="rotate(-15 161 156)" />
      <Ellipse cx={167} cy={148} rx={11} ry={8} fill={C.sage} transform="rotate(20 167 148)" />

      {/* Character body */}
      <Ellipse cx={130} cy={172} rx={16} ry={20} fill={C.goldLight} />
      <Ellipse cx={130} cy={178} rx={18} ry={14} fill={C.sage} />
      {/* Head */}
      <Circle cx={130} cy={150} r={18} fill="#F4C5A0" />
      {/* Hair */}
      <Ellipse cx={130} cy={140} rx={18} ry={10} fill={C.terracotta} opacity={0.8} />
      <Ellipse cx={114} cy={149} rx={7} ry={12} fill={C.terracotta} opacity={0.8} />

      {/* Arm */}
      <Path d="M142 162 C155 158, 162 150, 170 148" stroke={C.goldLight} strokeWidth={8} strokeLinecap="round" />

      {/* Watering can */}
      <Rect x={168} y={140} width={26} height={20} rx={5} fill={C.gold} />
      <Path d="M194 150 C200 150, 204 148, 205 145" stroke={C.gold} strokeWidth={5} strokeLinecap="round" />
      <Rect x={162} y={143} width={8} height={5} rx={2.5} fill="#B88A30" />
      <Path d="M168 158 C160 162, 152 165, 145 170" stroke={C.gold} strokeWidth={4} strokeLinecap="round" />
      {/* Water drops */}
      <Circle cx={140} cy={174} r={3} fill={C.sky} opacity={0.8} />
      <Circle cx={133} cy={180} r={2.5} fill={C.sky} opacity={0.7} />
      <Circle cx={145} cy={180} r={2} fill={C.sky} opacity={0.6} />

      {/* Sparkles */}
      <Path d="M95 100 L97 94 L99 100 L105 102 L99 104 L97 110 L95 104 L89 102Z" fill={C.gold} opacity={0.8} />
      <Path d="M190 120 L191 116 L192 120 L196 121 L192 122 L191 126 L190 122 L186 121Z" fill={C.goldLight} opacity={0.9} />
      <Circle cx={55} cy={140} r={3} fill={C.gold} opacity={0.5} />
      <Circle cx={200} cy={95} r={4} fill={C.sageLight} opacity={0.7} />
    </Svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PRIVACY ILLUSTRATION — Shield with plants (240x240)
// ═══════════════════════════════════════════════════════════════════════════

export function PrivacyIllustration({ size = 240 }: IllustrationProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 240 240" fill="none">
      <Ellipse cx={120} cy={120} rx={108} ry={105} fill={C.sagePale} />
      {/* Plants */}
      <Ellipse cx={55} cy={160} rx={20} ry={14} fill={C.sageLight} />
      <Ellipse cx={185} cy={160} rx={20} ry={14} fill={C.sageLight} />
      <Rect x={50} y={168} width={10} height={20} rx={5} fill={C.terracotta} />
      <Rect x={180} y={168} width={10} height={20} rx={5} fill={C.terracotta} />
      {/* Shield */}
      <Path d="M120 60 L158 76 L158 120 Q158 152 120 168 Q82 152 82 120 L82 76 Z" fill={C.sage} opacity={0.9} />
      <Path d="M120 70 L150 84 L150 120 Q150 146 120 160 Q90 146 90 120 L90 84 Z" fill={C.sageDark} opacity={0.6} />
      {/* Checkmark */}
      <Path d="M106 118 L116 128 L134 108" stroke="white" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
      {/* Sparkles */}
      <Circle cx={75} cy={90} r={4} fill={C.gold} opacity={0.7} />
      <Path d="M165 85 L166 80 L167 85 L172 86 L167 87 L166 92 L165 87 L160 86Z" fill={C.goldLight} opacity={0.9} />
      <Circle cx={165} cy={140} r={3} fill={C.sageLight} opacity={0.8} />
      <Circle cx={75} cy={150} r={3.5} fill={C.gold} opacity={0.5} />
    </Svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// INTENTION ILLUSTRATION — Calendar with plants (240x240)
// ═══════════════════════════════════════════════════════════════════════════

export function IntentionIllustration({ size = 240 }: IllustrationProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 240 240" fill="none">
      <Ellipse cx={120} cy={120} rx={108} ry={105} fill={C.sagePale} />
      {/* Calendar background */}
      <Rect x={70} y={80} width={100} height={90} rx={16} fill="white" opacity={0.9} />
      {/* Small plants on calendar */}
      <Rect x={90} y={130} width={12} height={20} rx={6} fill={C.terracotta} opacity={0.8} />
      <Ellipse cx={96} cy={124} rx={10} ry={8} fill={C.sage} />
      <Ellipse cx={102} cy={118} rx={8} ry={6} fill={C.sageDark} />
      <Rect x={120} y={138} width={10} height={12} rx={5} fill={C.terracotta} opacity={0.8} />
      <Ellipse cx={125} cy={133} rx={8} ry={6} fill={C.sage} />
      <Rect x={148} y={132} width={8} height={18} rx={4} fill={C.terracotta} opacity={0.8} />
      <Ellipse cx={152} cy={125} rx={7} ry={9} fill={C.sageDark} />
      {/* Stars/dots on calendar */}
      <Circle cx={92} cy={98} r={3} fill={C.gold} />
      <Circle cx={110} cy={96} r={2} fill={C.sageLight} />
      <Circle cx={128} cy={99} r={3} fill={C.gold} />
      <Circle cx={148} cy={97} r={2} fill={C.sageLight} />
      {/* Progress lines */}
      <Rect x={80} y={108} width={80} height={6} rx={3} fill={C.sagePale} />
      <Rect x={80} y={108} width={50} height={6} rx={3} fill={C.sage} />
      {/* Top decoration */}
      <Circle cx={120} cy={55} r={22} fill={C.goldLight} opacity={0.6} />
      <Circle cx={120} cy={55} r={15} fill={C.gold} opacity={0.5} />
      <Path d="M113 55 L118 60 L127 48" stroke={C.sageDark} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      {/* Sparkles */}
      <Path d="M55 100 L56 95 L57 100 L62 101 L57 102 L56 107 L55 102 L50 101Z" fill={C.gold} opacity={0.7} />
      <Circle cx={185} cy={80} r={4} fill={C.sageLight} opacity={0.8} />
    </Svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SEED ILLUSTRATION — Sprouts emerging from soil (240x240)
// ═══════════════════════════════════════════════════════════════════════════

export function SeedIllustration({ size = 240 }: IllustrationProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 240 240" fill="none">
      <Ellipse cx={120} cy={120} rx={108} ry={105} fill={C.sagePale} />
      {/* Soil mound */}
      <Ellipse cx={120} cy={190} rx={70} ry={22} fill="#8B6F5E" opacity={0.4} />
      <Ellipse cx={120} cy={186} rx={60} ry={16} fill="#A07860" opacity={0.5} />
      {/* Left sprout */}
      <Path d="M85 182 C85 170, 80 158, 75 148" stroke={C.sageDark} strokeWidth={4} strokeLinecap="round" />
      <Ellipse cx={68} cy={142} rx={14} ry={10} fill={C.sage} transform="rotate(-30 68 142)" />
      {/* Middle big sprout */}
      <Path d="M120 182 C120 165, 120 145, 120 125" stroke={C.sageDark} strokeWidth={5} strokeLinecap="round" />
      <Ellipse cx={105} cy={118} rx={18} ry={12} fill={C.sageDark} transform="rotate(-20 105 118)" />
      <Ellipse cx={135} cy={112} rx={18} ry={12} fill={C.sage} transform="rotate(20 135 112)" />
      <Ellipse cx={120} cy={105} rx={14} ry={10} fill={C.sageDark} />
      {/* Right sprout */}
      <Path d="M155 182 C155 170, 160 158, 165 150" stroke={C.sageDark} strokeWidth={4} strokeLinecap="round" />
      <Ellipse cx={172} cy={144} rx={14} ry={10} fill={C.sage} transform="rotate(30 172 144)" />
      {/* Seeds in soil */}
      <Ellipse cx={100} cy={188} rx={8} ry={5} fill={C.terracotta} opacity={0.7} />
      <Ellipse cx={140} cy={190} rx={7} ry={4} fill={C.terracotta} opacity={0.7} />
      {/* Sun rays at top */}
      <Circle cx={120} cy={70} r={24} fill={C.goldLight} opacity={0.7} />
      <Circle cx={120} cy={70} r={16} fill={C.gold} opacity={0.6} />
      {sunRayAngles.map((angle, i) => {
        const c = computeRayCoords(120, 70, 20, 30, angle);
        return (
          <Line
            key={i}
            x1={c.x1}
            y1={c.y1}
            x2={c.x2}
            y2={c.y2}
            stroke={C.gold}
            strokeWidth={3}
            strokeLinecap="round"
            opacity={0.5}
          />
        );
      })}
      {/* Sparkles */}
      <Path d="M60 75 L61 70 L62 75 L67 76 L62 77 L61 82 L60 77 L55 76Z" fill={C.gold} opacity={0.8} />
      <Circle cx={178} cy={100} r={4} fill={C.sageLight} opacity={0.9} />
      <Circle cx={55} cy={130} r={3} fill={C.gold} opacity={0.5} />
    </Svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// GARDEN REVEAL ILLUSTRATION — Full 5-plant garden scene (240x240)
// ═══════════════════════════════════════════════════════════════════════════

export function GardenRevealIllustration({ size = 240 }: IllustrationProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 240 240" fill="none">
      <Ellipse cx={120} cy={120} rx={108} ry={105} fill={C.sagePale} />
      {/* Ground */}
      <Ellipse cx={120} cy={200} rx={90} ry={15} fill={C.sageLight} opacity={0.6} />
      {/* Plant 1 - small left */}
      <Rect x={48} y={178} width={16} height={14} rx={5} fill={C.terracotta} opacity={0.8} />
      <Rect x={45} y={174} width={22} height={6} rx={3} fill="#B86A4E" opacity={0.8} />
      <Ellipse cx={56} cy={167} rx={13} ry={10} fill={C.sage} transform="rotate(-15 56 167)" />
      <Ellipse cx={62} cy={160} rx={11} ry={8} fill={C.sageDark} transform="rotate(10 62 160)" />
      {/* Plant 2 - tall middle-left */}
      <Rect x={85} y={170} width={18} height={22} rx={6} fill={C.terracotta} />
      <Rect x={82} y={165} width={24} height={7} rx={3.5} fill="#B86A4E" />
      <Ellipse cx={94} cy={157} rx={15} ry={11} fill={C.sageDark} transform="rotate(-20 94 157)" />
      <Ellipse cx={100} cy={148} rx={14} ry={10} fill={C.sage} transform="rotate(15 100 148)" />
      <Ellipse cx={90} cy={143} rx={12} ry={9} fill={C.sageDark} transform="rotate(-30 90 143)" />
      {/* Flowers on plant 2 */}
      <Circle cx={94} cy={137} r={6} fill={C.peach} />
      <Circle cx={94} cy={137} r={3} fill={C.gold} />
      {/* Plant 3 - medium middle */}
      <Rect x={114} y={175} width={16} height={17} rx={5} fill={C.terracotta} />
      <Rect x={111} y={170} width={22} height={7} rx={3.5} fill="#B86A4E" />
      <Ellipse cx={122} cy={162} rx={14} ry={10} fill={C.sage} />
      <Ellipse cx={128} cy={154} rx={12} ry={9} fill={C.sageDark} transform="rotate(10 128 154)" />
      {/* Plant 4 - tall middle-right */}
      <Rect x={143} y={168} width={18} height={24} rx={6} fill={C.terracotta} />
      <Rect x={140} y={163} width={24} height={7} rx={3.5} fill="#B86A4E" />
      <Ellipse cx={152} cy={155} rx={16} ry={12} fill={C.sageDark} transform="rotate(-10 152 155)" />
      <Ellipse cx={158} cy={145} rx={14} ry={10} fill={C.sage} transform="rotate(20 158 145)" />
      <Ellipse cx={148} cy={141} rx={12} ry={9} fill={C.sageDark} />
      <Circle cx={152} cy={133} r={7} fill={C.lavender} />
      <Circle cx={152} cy={133} r={3.5} fill="#8B72C8" />
      {/* Plant 5 - small right */}
      <Rect x={175} y={180} width={14} height={12} rx={4} fill={C.terracotta} opacity={0.8} />
      <Rect x={172} y={176} width={20} height={6} rx={3} fill="#B86A4E" opacity={0.8} />
      <Ellipse cx={182} cy={168} rx={13} ry={9} fill={C.sage} transform="rotate(20 182 168)" />
      <Ellipse cx={176} cy={162} rx={11} ry={8} fill={C.sageDark} transform="rotate(-15 176 162)" />
      {/* Stars and sparkles */}
      <Path d="M65 100 L66 95 L67 100 L72 101 L67 102 L66 107 L65 102 L60 101Z" fill={C.gold} opacity={0.9} />
      <Path d="M175 90 L176 86 L177 90 L181 91 L177 92 L176 96 L175 92 L171 91Z" fill={C.goldLight} />
      <Circle cx={120} cy={80} r={5} fill={C.gold} opacity={0.6} />
      <Circle cx={50} cy={140} r={3} fill={C.sageLight} opacity={0.8} />
      <Circle cx={195} cy={130} r={4} fill={C.goldLight} opacity={0.7} />
      {/* Rainbow arc top */}
      <Path d="M60 90 Q120 45 180 90" stroke={C.goldLight} strokeWidth={6} strokeLinecap="round" fill="none" opacity={0.4} />
      <Path d="M70 97 Q120 58 170 97" stroke={C.sageLight} strokeWidth={5} strokeLinecap="round" fill="none" opacity={0.4} />
    </Svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SUNLIGHT ILLUSTRATION — Sun over potted plant (200x200)
// ═══════════════════════════════════════════════════════════════════════════

export function SunlightIllustration({ size = 200 }: IllustrationProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Ellipse cx={100} cy={100} rx={88} ry={86} fill={C.goldLight} opacity={0.4} />
      {/* Sun */}
      <Circle cx={100} cy={75} r={28} fill={C.goldLight} opacity={0.8} />
      <Circle cx={100} cy={75} r={20} fill={C.gold} opacity={0.7} />
      {sunRayAngles.map((angle, i) => {
        const c = computeRayCoords(100, 75, 24, 36, angle);
        return (
          <Line
            key={i}
            x1={c.x1}
            y1={c.y1}
            x2={c.x2}
            y2={c.y2}
            stroke={C.gold}
            strokeWidth={3}
            strokeLinecap="round"
            opacity={0.7}
          />
        );
      })}
      {/* Plant */}
      <Rect x={90} y={148} width={20} height={26} rx={8} fill={C.terracotta} />
      <Rect x={86} y={142} width={28} height={8} rx={4} fill="#B86A4E" />
      <Path d="M100 140 C100 125, 100 110, 100 100" stroke={C.sageDark} strokeWidth={4} strokeLinecap="round" />
      <Ellipse cx={88} cy={112} rx={16} ry={10} fill={C.sage} transform="rotate(-20 88 112)" />
      <Ellipse cx={112} cy={106} rx={16} ry={10} fill={C.sageDark} transform="rotate(20 112 106)" />
      <Ellipse cx={100} cy={100} rx={12} ry={8} fill={C.sage} />
      {/* Sparkles */}
      <Circle cx={60} cy={80} r={4} fill={C.gold} opacity={0.5} />
      <Circle cx={150} cy={90} r={3} fill={C.goldLight} opacity={0.8} />
    </Svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MEMORY ILLUSTRATION — Polaroid photos with flowers (240x240)
// ═══════════════════════════════════════════════════════════════════════════

export function MemoryIllustration({ size = 240 }: IllustrationProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 240 240" fill="none">
      <Ellipse cx={120} cy={120} rx={108} ry={105} fill={C.sagePale} />
      {/* Background polaroids */}
      <Rect x={55} y={85} width={75} height={80} rx={6} fill="white" transform="rotate(-10 55 85)" opacity={0.9} />
      <Rect x={58} y={88} width={70} height={55} rx={4} fill={C.sky} opacity={0.6} transform="rotate(-10 58 88)" />
      {/* Tiny scene in left polaroid */}
      <Ellipse cx={92} cy={116} rx={18} ry={10} fill={C.sageLight} transform="rotate(-10 92 116)" />
      <Ellipse cx={92} cy={108} rx={12} ry={14} fill={C.sky} opacity={0.5} transform="rotate(-10 92 108)" />
      {/* Right polaroid - main */}
      <Rect x={110} y={80} width={80} height={95} rx={6} fill="white" transform="rotate(5 110 80)" />
      <Rect x={115} y={86} width={70} height={62} rx={4} fill={C.lavender} opacity={0.5} transform="rotate(5 115 86)" />
      {/* Scene in right polaroid */}
      <Ellipse cx={152} cy={120} rx={22} ry={12} fill={C.sageLight} transform="rotate(5 152 120)" />
      <Rect x={144} y={106} width={14} height={16} rx={5} fill={C.terracotta} opacity={0.7} transform="rotate(5 144 106)" />
      <Ellipse cx={148} cy={100} rx={10} ry={8} fill={C.sage} transform="rotate(5 148 100)" />
      {/* Polaroid captions */}
      <Rect x={125} y={154} width={50} height={6} rx={3} fill={C.sagePale} transform="rotate(5 125 154)" />
      <Rect x={130} y={163} width={38} height={5} rx={2.5} fill={C.sagePale} transform="rotate(5 130 163)" />
      {/* Decorative flowers around */}
      <Circle cx={65} cy={165} r={8} fill={C.peach} opacity={0.8} />
      <Circle cx={65} cy={165} r={4} fill={C.gold} opacity={0.7} />
      <Circle cx={185} cy={72} r={7} fill={C.lavender} opacity={0.8} />
      <Circle cx={185} cy={72} r={3.5} fill="#8B72C8" opacity={0.6} />
      {/* Stars */}
      <Path d="M55 60 L56 55 L57 60 L62 61 L57 62 L56 67 L55 62 L50 61Z" fill={C.gold} opacity={0.8} />
      <Circle cx={195} cy={155} r={4} fill={C.goldLight} opacity={0.7} />
    </Svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SUCCESS ILLUSTRATION — Big bloom with confetti (240x240)
// ═══════════════════════════════════════════════════════════════════════════

export function SuccessIllustration({ size = 240 }: IllustrationProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 240 240" fill="none">
      <Ellipse cx={120} cy={120} rx={108} ry={105} fill={C.sagePale} />
      {/* Confetti */}
      <Rect x={65} y={70} width={12} height={8} rx={3} fill={C.peach} opacity={0.8} transform="rotate(-20 65 70)" />
      <Rect x={170} y={80} width={10} height={7} rx={3} fill={C.lavender} opacity={0.8} transform="rotate(30 170 80)" />
      <Rect x={55} y={145} width={9} height={6} rx={2.5} fill={C.goldLight} opacity={0.9} transform="rotate(15 55 145)" />
      <Rect x={180} y={150} width={11} height={7} rx={3} fill={C.sageLight} opacity={0.9} transform="rotate(-25 180 150)" />
      <Circle cx={80} cy={110} r={5} fill={C.gold} opacity={0.6} />
      <Circle cx={178} cy={115} r={4} fill={C.peach} opacity={0.7} />
      <Circle cx={90} cy={170} r={3.5} fill={C.lavender} opacity={0.8} />
      <Circle cx={162} cy={170} r={4} fill={C.goldLight} opacity={0.7} />
      {/* Big flower / bloom petals */}
      {petalAngles.map((angle, i) => {
        const p = computePetalCenter(120, 120, 30, angle);
        return (
          <Ellipse
            key={i}
            cx={p.cx}
            cy={p.cy}
            rx={18}
            ry={12}
            fill={i % 2 === 0 ? C.peach : C.lavender}
            transform={`rotate(${angle} ${p.cx} ${p.cy})`}
            opacity={0.85}
          />
        );
      })}
      <Circle cx={120} cy={120} r={22} fill={C.gold} opacity={0.9} />
      <Circle cx={120} cy={120} r={15} fill={C.goldLight} />
      <Path d="M111 120 L117 126 L129 112" stroke={C.sageDark} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      {/* Stem */}
      <Path d="M120 148 C120 160, 118 170, 120 180" stroke={C.sageDark} strokeWidth={5} strokeLinecap="round" />
      <Ellipse cx={108} cy={168} rx={14} ry={9} fill={C.sage} transform="rotate(-25 108 168)" />
      <Ellipse cx={132} cy={173} rx={12} ry={8} fill={C.sageDark} transform="rotate(20 132 173)" />
      {/* Stars */}
      <Path d="M60 90 L61 85 L62 90 L67 91 L62 92 L61 97 L60 92 L55 91Z" fill={C.gold} opacity={0.9} />
      <Path d="M178 88 L179 84 L180 88 L184 89 L180 90 L179 94 L178 90 L174 89Z" fill={C.gold} opacity={0.9} />
      <Path d="M75 190 L76 186 L77 190 L81 191 L77 192 L76 196 L75 192 L71 191Z" fill={C.goldLight} opacity={0.8} />
      <Path d="M165 190 L166 186 L167 190 L171 191 L167 192 L166 196 L165 192 L161 191Z" fill={C.sageLight} opacity={0.9} />
    </Svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PERSON ILLUSTRATION — Character with flanking plants (200x200)
// ═══════════════════════════════════════════════════════════════════════════

interface PersonIllustrationProps extends IllustrationProps {
  color?: string;
}

export function PersonIllustration({
  size = 200,
  color = C.sage,
}: PersonIllustrationProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Circle cx={100} cy={100} r={90} fill={color} opacity={0.15} />
      {/* Background blob */}
      <Ellipse cx={100} cy={105} rx={75} ry={70} fill={color} opacity={0.1} />
      {/* Plant background */}
      <Rect x={148} y={148} width={14} height={22} rx={5} fill={C.terracotta} opacity={0.6} />
      <Ellipse cx={155} cy={140} rx={12} ry={10} fill={C.sage} opacity={0.7} />
      <Ellipse cx={160} cy={132} rx={10} ry={8} fill={C.sageDark} opacity={0.6} />
      <Rect x={38} y={152} width={12} height={18} rx={4} fill={C.terracotta} opacity={0.5} />
      <Ellipse cx={44} cy={145} rx={10} ry={8} fill={C.sage} opacity={0.6} />
      {/* Person */}
      <Circle cx={100} cy={80} r={28} fill="#F4C5A0" />
      {/* Hair */}
      <Ellipse cx={100} cy={68} rx={28} ry={14} fill={C.terracotta} opacity={0.7} />
      <Ellipse cx={76} cy={78} rx={8} ry={15} fill={C.terracotta} opacity={0.7} />
      {/* Body */}
      <Ellipse cx={100} cy={145} rx={32} ry={30} fill={color} opacity={0.8} />
      {/* Face details */}
      <Circle cx={93} cy={82} r={3} fill={C.nearBlack} opacity={0.5} />
      <Circle cx={107} cy={82} r={3} fill={C.nearBlack} opacity={0.5} />
      <Path d="M94 91 Q100 96 106 91" stroke={C.nearBlack} strokeWidth={2} strokeLinecap="round" fill="none" opacity={0.5} />
      {/* Sparkles */}
      <Path d="M45 65 L46 60 L47 65 L52 66 L47 67 L46 72 L45 67 L40 66Z" fill={C.gold} opacity={0.7} />
      <Circle cx={160} cy={75} r={4} fill={C.goldLight} opacity={0.8} />
    </Svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// NOTE ILLUSTRATION — Envelope with flowers (200x200)
// ═══════════════════════════════════════════════════════════════════════════

export function NoteIllustration({ size = 200 }: IllustrationProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Ellipse cx={100} cy={100} rx={88} ry={86} fill={C.sagePale} />
      {/* Envelope */}
      <Rect x={42} y={75} width={116} height={85} rx={10} fill="white" />
      <Path d="M42 80 L100 125 L158 80" stroke={C.sagePale} strokeWidth={2} fill="none" />
      <Rect x={42} y={75} width={116} height={85} rx={10} fill="none" stroke={C.sageLight} strokeWidth={2} />
      {/* Letter lines */}
      <Rect x={65} y={105} width={70} height={5} rx={2.5} fill={C.sagePale} />
      <Rect x={65} y={118} width={55} height={5} rx={2.5} fill={C.sagePale} />
      <Rect x={65} y={131} width={45} height={5} rx={2.5} fill={C.sagePale} />
      {/* Flowers decorating */}
      <Circle cx={60} cy={65} r={8} fill={C.peach} opacity={0.8} />
      <Circle cx={60} cy={65} r={4} fill={C.gold} opacity={0.7} />
      <Circle cx={140} cy={65} r={7} fill={C.lavender} opacity={0.8} />
      <Circle cx={140} cy={65} r={3.5} fill="#8B72C8" opacity={0.6} />
      {/* Sparkles */}
      <Path d="M45 155 L46 150 L47 155 L52 156 L47 157 L46 162 L45 157 L40 156Z" fill={C.gold} opacity={0.7} />
      <Circle cx={162} cy={150} r={4} fill={C.goldLight} opacity={0.8} />
    </Svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLE SPROUT ILLUSTRATION — Small sprout in pot (60x60)
// ═══════════════════════════════════════════════════════════════════════════

export function SingleSproutIllustration({ size = 60 }: IllustrationProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60" fill="none">
      <Ellipse cx={30} cy={30} rx={26} ry={25} fill={C.sagePale} opacity={0.5} />
      <Rect x={24} y={38} width={12} height={10} rx={4} fill={C.terracotta} opacity={0.6} />
      <Ellipse cx={30} cy={34} rx={7} ry={6} fill={C.sage} />
      <Circle cx={30} cy={31} r={2} fill={C.gold} opacity={0.7} />
      <Circle cx={38} cy={28} r={1.5} fill={C.goldLight} opacity={0.6} />
    </Svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SMALL GARDEN ILLUSTRATION — 2-3 plants (80x80)
// ═══════════════════════════════════════════════════════════════════════════

export function SmallGardenIllustration({ size = 80 }: IllustrationProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <Ellipse cx={40} cy={40} rx={36} ry={34} fill={C.sagePale} opacity={0.4} />
      {/* Left plant */}
      <Rect x={20} y={48} width={10} height={8} rx={3} fill={C.terracotta} opacity={0.6} />
      <Ellipse cx={25} cy={43} rx={6} ry={5} fill={C.sage} />
      <Circle cx={25} cy={40} r={1.5} fill={C.gold} opacity={0.6} />
      {/* Center plant - taller */}
      <Rect x={35} y={45} width={12} height={10} rx={4} fill={C.terracotta} opacity={0.7} />
      <Path d="M41 45 C41 39, 41 35, 41 31" stroke={C.sageDark} strokeWidth={2} strokeLinecap="round" />
      <Ellipse cx={36} cy={38} rx={7} ry={5} fill={C.sage} transform="rotate(-15 36 38)" />
      <Ellipse cx={46} cy={36} rx={7} ry={5} fill={C.sageDark} transform="rotate(15 46 36)" />
      <Circle cx={41} cy={29} r={3} fill={C.peach} opacity={0.7} />
      {/* Right plant */}
      <Rect x={55} y={50} width={8} height={6} rx={2} fill={C.terracotta} opacity={0.5} />
      <Ellipse cx={59} cy={46} rx={5} ry={4} fill={C.sageLight} />
      {/* Sparkle */}
      <Circle cx={32} cy={26} r={2} fill={C.gold} opacity={0.7} />
    </Svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FLOURISHING GARDEN ILLUSTRATION — 5 plants, identity visual (100x100)
// ═══════════════════════════════════════════════════════════════════════════

export function FlourishingGardenIllustration({ size = 100 }: IllustrationProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Ellipse cx={50} cy={50} rx={46} ry={44} fill={C.sagePale} opacity={0.3} />
      {/* Left */}
      <Rect x={18} y={62} width={12} height={10} rx={3} fill={C.terracotta} opacity={0.7} />
      <Path d="M24 62 C24 54, 24 48, 24 43" stroke={C.sageDark} strokeWidth={2} strokeLinecap="round" />
      <Ellipse cx={19} cy={50} rx={8} ry={6} fill={C.sage} transform="rotate(-20 19 50)" />
      <Ellipse cx={29} cy={47} rx={8} ry={6} fill={C.sageDark} transform="rotate(20 29 47)" />
      <Circle cx={24} cy={41} r={3.5} fill={C.peach} opacity={0.8} />
      {/* Center-left */}
      <Rect x={35} y={64} width={10} height={9} rx={3} fill={C.terracotta} opacity={0.7} />
      <Ellipse cx={40} cy={58} rx={7} ry={5} fill={C.sage} transform="rotate(-10 40 58)" />
      <Circle cx={40} cy={54} r={2.5} fill={C.goldLight} opacity={0.7} />
      {/* Center */}
      <Rect x={48} y={60} width={14} height={12} rx={4} fill={C.terracotta} opacity={0.7} />
      <Path d="M55 60 C55 50, 55 43, 55 37" stroke={C.sageDark} strokeWidth={2.5} strokeLinecap="round" />
      <Ellipse cx={48} cy={47} rx={9} ry={7} fill={C.sage} transform="rotate(-15 48 47)" />
      <Ellipse cx={62} cy={44} rx={9} ry={7} fill={C.sageDark} transform="rotate(15 62 44)" />
      <Circle cx={55} cy={35} r={4} fill={C.peach} opacity={0.8} />
      {/* Center-right */}
      <Rect x={66} y={63} width={11} height={10} rx={3} fill={C.terracotta} opacity={0.7} />
      <Ellipse cx={71} cy={56} rx={7} ry={5} fill={C.sage} transform="rotate(8 71 56)" />
      <Circle cx={71} cy={52} r={2.8} fill={C.goldLight} opacity={0.7} />
      {/* Right */}
      <Rect x={80} y={66} width={9} height={8} rx={2} fill={C.terracotta} opacity={0.6} />
      <Ellipse cx={84} cy={61} rx={6} ry={4} fill={C.sageLight} />
      {/* Sparkles */}
      <Circle cx={42} cy={32} r={2.5} fill={C.gold} opacity={0.7} />
      <Circle cx={68} cy={36} r={2} fill={C.goldLight} opacity={0.6} />
      <Circle cx={55} cy={26} r={2.2} fill={C.gold} opacity={0.8} />
    </Svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PLANT BRIDGE ILLUSTRATION — Connection bridge with plants (80x80)
// ═══════════════════════════════════════════════════════════════════════════

export function PlantBridgeIllustration({ size = 80 }: IllustrationProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <Ellipse cx={40} cy={40} rx={36} ry={35} fill={C.sagePale} opacity={0.5} />
      <Path d="M40 52 C40 42, 40 35, 40 28" stroke={C.sageDark} strokeWidth={3} strokeLinecap="round" />
      <Ellipse cx={30} cy={32} rx={12} ry={8} fill={C.sage} transform="rotate(-20 30 32)" />
      <Ellipse cx={50} cy={28} rx={12} ry={8} fill={C.sageDark} transform="rotate(20 50 28)" />
      <Ellipse cx={40} cy={24} rx={10} ry={7} fill={C.sage} />
      <Circle cx={52} cy={18} r={2.5} fill={C.gold} opacity={0.7} />
      <Circle cx={28} cy={22} r={2} fill={C.goldLight} opacity={0.6} />
    </Svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// GARDEN GROWTH ILLUSTRATION — 3 plants at different stages (100x100)
// ═══════════════════════════════════════════════════════════════════════════

export function GardenGrowthIllustration({ size = 100 }: IllustrationProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Ellipse cx={50} cy={50} rx={44} ry={42} fill={C.sagePale} opacity={0.4} />
      {/* Left plant - smallest */}
      <Rect x={20} y={60} width={10} height={8} rx={3} fill={C.terracotta} opacity={0.6} />
      <Ellipse cx={25} cy={55} rx={6} ry={5} fill={C.sage} />
      <Circle cx={25} cy={52} r={1.5} fill={C.gold} opacity={0.6} />
      {/* Center plant - medium */}
      <Rect x={42} y={58} width={12} height={10} rx={4} fill={C.terracotta} opacity={0.7} />
      <Path d="M48 58 C48 52, 48 48, 48 45" stroke={C.sageDark} strokeWidth={2} strokeLinecap="round" />
      <Ellipse cx={43} cy={50} rx={7} ry={5} fill={C.sage} transform="rotate(-15 43 50)" />
      <Ellipse cx={53} cy={48} rx={7} ry={5} fill={C.sageDark} transform="rotate(15 53 48)" />
      <Circle cx={48} cy={43} r={3} fill={C.peach} opacity={0.7} />
      {/* Right plant - small sprout */}
      <Rect x={68} y={62} width={8} height={6} rx={2} fill={C.terracotta} opacity={0.5} />
      <Ellipse cx={72} cy={58} rx={5} ry={4} fill={C.sageLight} />
      {/* Sparkles */}
      <Circle cx={35} cy={40} r={2} fill={C.gold} opacity={0.7} />
      <Circle cx={60} cy={35} r={1.8} fill={C.goldLight} opacity={0.6} />
    </Svg>
  );
}

// ─── RestingPlantIllustration ─────────────────────────────────────────────
/** Plant in a resting/paused state — stem curves gently, leaves droop softly,
 *  rest bubbles rise, crescent moon floats above. Used in notification pause flow. */
export function RestingPlantIllustration({ size = 180 }: { size?: number }) {
  const h = size * 0.92;
  return (
    <Svg width={size} height={h} viewBox="0 0 180 166" fill="none">
      {/* Background blob */}
      <Ellipse cx={90} cy={90} rx={80} ry={70} fill={C.sagePale} opacity={0.55} />
      {/* Ground */}
      <Ellipse cx={90} cy={152} rx={60} ry={8} fill={C.sageLight} opacity={0.3} />
      {/* Pot */}
      <Rect x={62} y={118} width={56} height={36} rx={10} fill={C.terracotta} />
      <Rect x={58} y={112} width={64} height={10} rx={5} fill="#B86A4E" />
      {/* Pot dots */}
      <Circle cx={78} cy={118} r={1.5} fill="#8B6F5E" opacity={0.4} />
      <Circle cx={90} cy={118} r={1.5} fill="#8B6F5E" opacity={0.4} />
      <Circle cx={102} cy={118} r={1.5} fill="#8B6F5E" opacity={0.4} />
      {/* Stem — curves gently right (resting) */}
      <Path d="M90 112 C90 95, 96 80, 106 65" stroke={C.sageDark} strokeWidth={4.5} strokeLinecap="round" opacity={0.75} />
      {/* Leaves — drooping softly */}
      <Ellipse cx={80} cy={94} rx={17} ry={9} fill={C.sage} transform="rotate(22 80 94)" opacity={0.68} />
      <Ellipse cx={98} cy={79} rx={15} ry={8} fill={C.sageDark} transform="rotate(-16 98 79)" opacity={0.62} />
      <Ellipse cx={107} cy={64} rx={12} ry={6.5} fill={C.sageLight} transform="rotate(-5 107 64)" opacity={0.78} />
      {/* Rest bubbles */}
      <Circle cx={120} cy={68} r={3.5} fill={C.sageLight} opacity={0.35} />
      <Circle cx={126} cy={54} r={2.5} fill={C.sageLight} opacity={0.24} />
      <Circle cx={121} cy={42} r={1.8} fill={C.sageLight} opacity={0.16} />
      {/* Crescent moon */}
      <Path d="M140 36 Q136 30 138 24 Q146 26 144 33 Q142 38 140 36Z" fill={C.goldLight} opacity={0.48} />
      <Circle cx={141} cy={30} r={6} fill={C.goldLight} opacity={0.15} />
      {/* Ambient sparkles */}
      <Circle cx={50} cy={88} r={2.5} fill={C.gold} opacity={0.28} />
      <Circle cx={46} cy={110} r={2} fill={C.sageLight} opacity={0.36} />
      <Circle cx={55} cy={128} r={2} fill={C.gold} opacity={0.22} />
    </Svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SPROUT SMALL ILLUSTRATION — Compact sprout in terracotta pot (72x~80)
// ═══════════════════════════════════════════════════════════════════════════

export function SproutSmallIllustration({ size = 72 }: IllustrationProps) {
  const h = size * 1.1;
  return (
    <Svg width={size} height={h} viewBox="0 0 80 88" fill="none">
      <Rect x={24} y={64} width={32} height={22} rx={7} fill={C.terracotta} />
      <Rect x={21} y={59} width={38} height={8} rx={4} fill="#B86A4E" />
      <Path d="M40 59 L40 40" stroke={C.sageDark} strokeWidth={3.5} strokeLinecap="round" />
      <Ellipse cx={29} cy={47} rx={13} ry={8} fill={C.sage} transform="rotate(-30 29 47)" />
      <Ellipse cx={51} cy={42} rx={12} ry={7} fill={C.sageDark} transform="rotate(25 51 42)" />
      <Ellipse cx={40} cy={36} rx={8} ry={5} fill={C.sageLight} />
      <Circle cx={60} cy={30} r={2.5} fill={C.gold} opacity={0.7} />
      <Line x1={60} y1={25} x2={60} y2={23} stroke={C.gold} strokeWidth={1.5} strokeLinecap="round" opacity={0.5} />
      <Line x1={65} y1={30} x2={67} y2={30} stroke={C.gold} strokeWidth={1.5} strokeLinecap="round" opacity={0.5} />
    </Svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PLANT GROWTH LEAVES ILLUSTRATION — Multi-leaf growth overlay (200x164)
// ═══════════════════════════════════════════════════════════════════════════

export function PlantGrowthLeavesIllustration({ size = 200 }: IllustrationProps) {
  const h = size * 0.82;
  return (
    <Svg width={size} height={h} viewBox="0 0 200 164" fill="none">
      {/* Central stem */}
      <Path d="M100 158 L100 82" stroke={C.sageLight} strokeWidth={4.5} strokeLinecap="round" />
      {/* Left branch + leaf */}
      <Path d="M100 138 C78 127 62 112 50 99" stroke={C.sageLight} strokeWidth={2.5} strokeLinecap="round" />
      <Ellipse cx={44} cy={93} rx={18} ry={9.5} fill={C.sageLight} transform="rotate(-38 44 93)" />
      {/* Right branch + leaf */}
      <Path d="M100 126 C122 115 138 100 150 88" stroke={C.sageLight} strokeWidth={2.5} strokeLinecap="round" />
      <Ellipse cx={156} cy={82} rx={18} ry={9.5} fill={C.sageLight} transform="rotate(32 156 82)" />
      {/* Inner leaves */}
      <Ellipse cx={74} cy={112} rx={12} ry={7} fill={C.sageDark} transform="rotate(-22 74 112)" />
      <Ellipse cx={126} cy={106} rx={12} ry={7} fill={C.sageDark} transform="rotate(18 126 106)" />
      {/* Crown */}
      <Ellipse cx={100} cy={78} rx={20} ry={11} fill={C.sage} />
      <Ellipse cx={84} cy={63} rx={13} ry={7.5} fill={C.sageLight} transform="rotate(-15 84 63)" />
      <Ellipse cx={116} cy={59} rx={12} ry={7} fill={C.sageLight} transform="rotate(12 116 59)" />
      {/* Sparkles */}
      <Circle cx={100} cy={44} r={3.5} fill={C.gold} opacity={0.65} />
      <Circle cx={54} cy={52} r={2.5} fill={C.goldLight} opacity={0.65} />
      <Circle cx={146} cy={48} r={2} fill={C.goldLight} opacity={0.65} />
    </Svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PLANT RING ILLUSTRATION — Decorative leaf ring around avatar (120x120)
// ═══════════════════════════════════════════════════════════════════════════

export function PlantRingIllustration({ size = 120 }: IllustrationProps) {
  const mid = size / 2;
  const r = size * 0.47;
  const total = 14;
  const ringColors = [C.sage, C.sageDark, C.sageLight, C.sage, C.sageDark];

  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
    >
      {Array.from({ length: total }).map((_, i) => {
        const angle = (i * 360) / total - 90;
        const rad = (angle * Math.PI) / 180;
        const x = mid + r * Math.cos(rad);
        const y = mid + r * Math.sin(rad);
        const isLeaf = i % 3 !== 2;

        return isLeaf ? (
          <Ellipse
            key={i}
            cx={x}
            cy={y}
            rx={4}
            ry={2.5}
            fill={ringColors[i % ringColors.length]}
            transform={`rotate(${angle + 90} ${x} ${y})`}
            opacity={0.62 + (i % 4) * 0.09}
          />
        ) : (
          <Circle key={i} cx={x} cy={y} r={1.8} fill={C.goldLight} opacity={0.6} />
        );
      })}
    </Svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// INBOX CHECK ILLUSTRATION — Envelope with sprouting leaf + check circle
// ═══════════════════════════════════════════════════════════════════════════

export function InboxCheckIllustration({ size = 170 }: IllustrationProps) {
  const h = size * 0.88;
  return (
    <Svg width={size} height={h} viewBox="0 0 200 176" fill="none">
      <Ellipse cx={100} cy={167} rx={64} ry={9} fill={C.sageLight} opacity={0.3} />
      {/* Envelope body */}
      <Rect x={24} y={68} width={152} height={96} rx={16} fill={C.white} />
      <Rect x={24} y={68} width={152} height={96} rx={16} stroke="#E8E0D6" strokeWidth={1.5} fill="none" />
      {/* Flap */}
      <Path d="M24 82 L100 128 L176 82 V68 H24Z" fill={C.sagePale} opacity={0.65} />
      <Path d="M24 82 L100 128 L176 82" stroke={C.sageLight} strokeWidth={1.5} fill="none" />
      {/* Fold lines */}
      <Path d="M24 164 L78 112" stroke={C.sageLight} strokeWidth={1} opacity={0.5} strokeDasharray="3 4" />
      <Path d="M176 164 L122 112" stroke={C.sageLight} strokeWidth={1} opacity={0.5} strokeDasharray="3 4" />
      {/* Sprout from envelope */}
      <Rect x={97} y={26} width={6} height={44} rx={3} fill={C.sageDark} opacity={0.8} />
      <Ellipse cx={88} cy={44} rx={15} ry={9} fill={C.sage} transform="rotate(-28 88 44)" opacity={0.9} />
      <Ellipse cx={112} cy={34} rx={12} ry={7} fill={C.sageDark} transform="rotate(22 112 34)" opacity={0.85} />
      <Ellipse cx={96} cy={24} rx={10} ry={6} fill={C.sageLight} transform="rotate(-8 96 24)" />
      {/* Check circle */}
      <Circle cx={157} cy={72} r={16} fill={C.sage} />
      <Path d="M149 72 L155 78 L165 62" stroke={C.white} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FADING GARDEN ILLUSTRATION — Desaturated pots for delete confirmation
// ═══════════════════════════════════════════════════════════════════════════

export function FadingGardenIllustration({ size = 200 }: IllustrationProps) {
  const h = size * 0.72;
  return (
    <Svg width={size} height={h} viewBox="0 0 220 158" fill="none" opacity={0.55}>
      <Ellipse cx={110} cy={148} rx={92} ry={10} fill={C.sageLight} opacity={0.4} />
      {/* Ground */}
      <Rect x={0} y={130} width={220} height={28} fill={C.sagePale} opacity={0.5} />
      {/* Pot 1 */}
      <Rect x={22} y={108} width={30} height={22} rx={7} fill="#C97A5E" opacity={0.45} />
      <Rect x={19} y={103} width={36} height={7} rx={3.5} fill="#B86A4E" opacity={0.4} />
      <Rect x={36} y={78} width={4} height={28} rx={2} fill={C.warmGray} opacity={0.28} />
      <Ellipse cx={34} cy={74} rx={12} ry={8} fill={C.warmGray} opacity={0.22} />
      <Ellipse cx={42} cy={66} rx={10} ry={7} fill={C.warmGray} opacity={0.18} />
      {/* Pot 2 */}
      <Rect x={88} y={102} width={34} height={26} rx={7} fill="#C97A5E" opacity={0.5} />
      <Rect x={85} y={97} width={40} height={8} rx={4} fill="#B86A4E" opacity={0.45} />
      <Rect x={104} y={70} width={4} height={30} rx={2} fill={C.warmGray} opacity={0.32} />
      <Ellipse cx={102} cy={65} rx={14} ry={9} fill={C.warmGray} opacity={0.26} />
      <Ellipse cx={112} cy={57} rx={12} ry={8} fill={C.warmGray} opacity={0.2} />
      {/* Pot 3 */}
      <Rect x={160} y={110} width={28} height={20} rx={7} fill="#C97A5E" opacity={0.44} />
      <Rect x={157} y={105} width={34} height={7} rx={3.5} fill="#B86A4E" opacity={0.38} />
      <Rect x={173} y={82} width={4} height={26} rx={2} fill={C.warmGray} opacity={0.25} />
      <Ellipse cx={171} cy={78} rx={11} ry={7} fill={C.warmGray} opacity={0.2} />
      {/* Drifting leaves */}
      <Ellipse cx={62} cy={48} rx={10} ry={5.5} fill={C.warmGray} opacity={0.18} transform="rotate(-38 62 48)" />
      <Ellipse cx={148} cy={36} rx={9} ry={5} fill={C.warmGray} opacity={0.15} transform="rotate(28 148 36)" />
      <Ellipse cx={28} cy={88} rx={8} ry={4.5} fill={C.warmGray} opacity={0.13} transform="rotate(-22 28 88)" />
      <Ellipse cx={188} cy={62} rx={7} ry={4} fill={C.warmGray} opacity={0.13} transform="rotate(42 188 62)" />
      <Ellipse cx={106} cy={28} rx={9} ry={5} fill={C.warmGray} opacity={0.12} transform="rotate(-12 106 28)" />
    </Svg>
  );
}
