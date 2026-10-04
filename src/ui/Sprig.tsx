// A person's pressed sprig (plan §19): who, never how much. Decorative: the
// name beside it carries the meaning, so screen readers skip it.
//
// Its only input is the person's id. There is deliberately no prop for
// moments, plans, milestones, recency or anything else about the
// relationship (identity-only V1; `sprig_marks` stays off).
import React from "react";
import Svg, { Path } from "react-native-svg";
import { sprigStyle } from "@/design/tokens";
import { cachedSprig, VIEW_H, VIEW_W } from "./sprig/generate";
import { usePalette } from "./theme";

export interface SprigProps {
  personId: string;
  /** Width in points; the height follows the 60 × 110 specimen. */
  width: number;
  /**
   * Someone the user marked "remembered" (D13): the same drawing, pressed and
   * kept, in ink-quiet with a slightly finer line. Never wilted or faded.
   */
  remembered?: boolean;
}

export function Sprig({ personId, width, remembered = false }: SprigProps) {
  const p = usePalette();
  const d = cachedSprig(personId);
  const height = (width * VIEW_H) / VIEW_W;
  // A hairline on screen at any size: 1.2 pt at the 60-wide specimen, finer when small.
  const screenStroke = Math.min(sprigStyle.stroke, Math.max(0.7, width / 50)) * (remembered ? 0.85 : 1);
  const ink = remembered ? p.inkQuiet : p.ink;
  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
    >
      <Path d={d.wash} fill={ink} fillOpacity={sprigStyle.wash} />
      <Path
        d={d.line}
        fill="none"
        stroke={ink}
        strokeWidth={(screenStroke * VIEW_W) / width}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
