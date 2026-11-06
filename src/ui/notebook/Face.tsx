// A person's face in the notebook (PR #77 `.face`): their photo, when the user chose one (kept on
// this phone only), else their initial on their identity colour with their flower. Circle by
// default; the date band's softer blob; an optional white ring on coloured cards. Identity only.
import React from "react";
import { Image, View, type ViewStyle } from "react-native";
import { font } from "@/design/tokens";
import { flowers, initialOf, personLook } from "./look";
import { RNText } from "./NText";

export function Face({ personId, name, photoUri, size, ring = false, blob = false, style, label }: {
  personId: string;
  name: string;
  photoUri?: string | null;
  size: number;
  ring?: boolean;
  blob?: boolean;
  style?: ViewStyle;
  /** Read to screen readers when the face stands alone; otherwise the row says the name. */
  label?: string;
}) {
  const look = personLook(personId);
  const r = size / 2;
  const shape: ViewStyle = blob
    ? { borderTopLeftRadius: size * 0.62, borderTopRightRadius: size * 0.38, borderBottomRightRadius: size * 0.55, borderBottomLeftRadius: size * 0.45 }
    : { borderRadius: r };
  return (
    <View
      accessible={!!label}
      accessibilityRole={label ? "image" : undefined}
      accessibilityLabel={label}
      importantForAccessibility={label ? "yes" : "no-hide-descendants"}
      accessibilityElementsHidden={!label}
      style={[
        { width: size, height: size, overflow: "hidden", backgroundColor: look.color, alignItems: "center", justifyContent: "center" },
        shape,
        ring ? { borderWidth: 3, borderColor: "rgba(255,255,255,0.9)" } : null,
        style,
      ]}
    >
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={{ width: size, height: size }} resizeMode="cover" />
      ) : (
        <>
          <RNText
            allowFontScaling={false}
            style={{ fontFamily: font.poster, fontSize: Math.round(size * 0.42), lineHeight: Math.round(size * 0.5), color: look.on }}
          >
            {initialOf(name)}
          </RNText>
          <Image
            source={flowers[look.flower]}
            resizeMode="contain"
            style={{ position: "absolute", width: size * 0.74, height: size * 0.74, right: -size * 0.1, bottom: -size * 0.08 }}
          />
        </>
      )}
    </View>
  );
}
