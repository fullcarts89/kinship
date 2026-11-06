// A person's photo in a fluid, organic mask (Stage 1: Connection Orbit's fluid
// forms; "never a circle or a rounded rectangle; the same shape for everyone;
// it carries no meaning"). The photo is the user's own choice and is never
// inferred from. A leaf may cross in front of it (the screen places it).
import React, { useId } from "react";
import { View, type ViewStyle } from "react-native";
import Svg, { ClipPath, Defs, Image as SvgImage, Path } from "react-native-svg";

// One hand-tuned shape, scaled to the box: anchor points and the two control
// points of the curve leaving each one, as shares of width and height.
const P = [[0.52, 0], [0.86, 0.04], [1, 0.36], [0.96, 0.74], [0.72, 1], [0.34, 0.98], [0.06, 0.8], [0, 0.42], [0.16, 0.08]];
const C = [[0.7, 0, 0.8, 0], [0.96, 0.1, 1, 0.22], [1, 0.52, 1, 0.62], [0.9, 0.9, 0.84, 0.98], [0.6, 1.02, 0.46, 1.02], [0.2, 0.94, 0.1, 0.9], [0, 0.66, 0, 0.54], [0, 0.24, 0.06, 0.14], [0.28, 0, 0.4, 0]];

/** The mask's path for a box; the same shape at any size. */
export function blobPath(w: number, h: number): string {
  let d = `M ${P[0][0] * w} ${P[0][1] * h}`;
  for (let i = 0; i < P.length; i++) {
    const n = P[(i + 1) % P.length];
    const c = C[i];
    d += ` C ${c[0] * w} ${c[1] * h} ${c[2] * w} ${c[3] * h} ${n[0] * w} ${n[1] * h}`;
  }
  return `${d} Z`;
}

export function FluidPhoto({ uri, width, height, style, label }: {
  uri: string;
  width: number;
  height: number;
  style?: ViewStyle;
  /** Who it is, for screen readers ("Photo of Ben"). */
  label?: string;
}) {
  const id = `blob${useId().replace(/[^\w]/gu, "")}`;
  return (
    <View
      style={[{ width, height }, style]}
      accessible={!!label}
      accessibilityRole={label ? "image" : undefined}
      accessibilityLabel={label}
      testID="fluid-photo"
    >
      <Svg width={width} height={height}>
        <Defs>
          <ClipPath id={id}>
            <Path d={blobPath(width, height)} />
          </ClipPath>
        </Defs>
        <SvgImage href={{ uri }} x={0} y={0} width={width} height={height} preserveAspectRatio="xMidYMin slice" clipPath={`url(#${id})`} />
      </Svg>
    </View>
  );
}
