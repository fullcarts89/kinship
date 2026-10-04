// The Tell field (Design Direction §H; boards 1 and System): always a thumb
// away, pinned above the two-item bar. A 54 pt pill on the raised surface;
// it grows into a few lines while you type. Say it the way you'd tell a
// friend, then send: no type to choose, no form.
//
// Voice (the board's microphone) arrives with on-device transcription
// (E18, flag voice_capture). Until then the round button sends what was
// typed, and appears only when there is something to send; the keyboard's
// own dictation works in the field.
import React, { forwardRef } from "react";
import { TextInput, View } from "react-native";
import { ArrowUp } from "lucide-react-native";
import { height, maxScale, radius, size, space, type } from "@/design/tokens";
import { IconButton } from "./Screen";
import { usePalette } from "./theme";

export interface TellFieldProps {
  value: string;
  onChange: (text: string) => void;
  onSend: () => void;
  /** "Tell Kinship about Ben…" when telling from a person. */
  placeholder?: string;
  autoFocus?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}

export const TellField = forwardRef<TextInput, TellFieldProps>(function TellField(
  { value, onChange, onSend, placeholder = "Tell Kinship something…", autoFocus, onFocus, onBlur },
  ref,
) {
  const p = usePalette();
  const canSend = value.trim().length > 0;
  const multi = value.includes("\n") || value.length > 34;
  return (
    <View
      style={{
        minHeight: height.tell,
        borderRadius: multi ? radius.inline : radius.pill(height.tell),
        backgroundColor: p.surface,
        borderWidth: 1,
        borderColor: p.hairline,
        flexDirection: "row",
        alignItems: multi ? "flex-end" : "center",
        paddingLeft: space.xl,
        paddingRight: space.s,
        paddingVertical: multi ? space.s : 0,
      }}
    >
      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChange}
        multiline
        numberOfLines={multi ? 5 : 1}
        maxLength={5000}
        autoFocus={autoFocus}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        placeholderTextColor={p.inkQuiet}
        accessibilityLabel={placeholder.replace(/…$/u, "")}
        maxFontSizeMultiplier={maxScale.text}
        style={[type.field, {
          flex: 1, color: p.ink, maxHeight: space.x5 * 2.5, paddingTop: multi ? space.s : space.m, paddingBottom: multi ? space.s : space.m,
          paddingRight: space.s, textAlignVertical: "top",
        }]}
      />
      {canSend ? (
        <IconButton label="Send to Kinship" onPress={onSend} filled diameter={height.mic}>
          <ArrowUp color={p.onInk} size={size.icon} strokeWidth={1.8} />
        </IconButton>
      ) : null}
    </View>
  );
});

/** The field in its usual place: the gutter, above the bar. */
export function TellDockFrame({ children }: { children: React.ReactNode }) {
  return <View style={{ paddingHorizontal: space.xl, paddingTop: space.s }}>{children}</View>;
}

