// Without a photo, the name itself is the picture (Stage 1: "type as a
// window"): the poster name filled with the hero bloom, over a soft ink
// keyline so it reads on paper. The same device for everyone with no photo;
// nothing says a photo is missing. Where the mask isn't available (the web
// lab, tests) the name is set in ink instead.
import React from "react";
import { Image, Platform, Text, View, type TextStyle } from "react-native";
import { gardenArt } from "./assets";
import { usePalette } from "../theme";

type MaskedViewType = React.ComponentType<{ maskElement: React.ReactElement; style?: object; children?: React.ReactNode }>;

let MaskedView: MaskedViewType | null = null;
if (Platform.OS !== "web") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    MaskedView = (require("@react-native-masked-view/masked-view") as { default: MaskedViewType }).default;
  } catch {
    MaskedView = null;
  }
}

/** Whether the bloom fill can be drawn here. */
export const BLOOM_NAME_AVAILABLE = MaskedView !== null;

export function BloomName({ lines, textStyle, width, height }: {
  lines: string[];
  /** The poster style (family, size, leading, tracking) the name is set in. */
  textStyle: TextStyle;
  width: number;
  height: number;
}) {
  const p = usePalette();
  const text = (color: string, extra?: TextStyle) => (
    <Text
      maxFontSizeMultiplier={1}
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[textStyle, { color, width }, extra]}
    >
      {lines.join("\n")}
    </Text>
  );
  if (!MaskedView) return <View style={{ width, height }}>{text(p.ink)}</View>;
  const Masked = MaskedView;
  return (
    <View style={{ width, height }} testID="bloom-name">
      {/* A soft ink keyline: the name once more, as a shadow only. */}
      {text("transparent", { position: "absolute", textShadowColor: p.ink, textShadowRadius: 2, textShadowOffset: { width: 0, height: 0 } })}
      <Masked style={{ width, height }} maskElement={<View style={{ backgroundColor: "transparent" }}>{text("#000")}</View>}>
        <Image
          source={gardenArt.bloom}
          resizeMode="cover"
          accessibilityElementsHidden
          importantForAccessibility="no"
          // The window looks onto the bloom's petals (the asset's upper right), so the name reads pink and orange, not leaf.
          style={{ width: width * 2.2, height: width * 2.2 * 1.339, marginLeft: -width * 1.0, marginTop: -width * 2.2 * 1.339 * 0.16 }}
        />
      </Masked>
    </View>
  );
}
