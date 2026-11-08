// The notebook's small parts (PR #77 proto.css): sources with their meaning dot, buttons, chips,
// tags, raised cards, ruled paper, the lens control and section labels. Meaning colours always come
// with a word; nothing here counts, ranks or scores.
import React, { useState } from "react";
import { View, type ViewProps, type ViewStyle } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { notebook, notebookShadow, press, radius, size, space, TOUCH } from "@/design/tokens";
import { Pressable } from "../Pressable";
import { isLargeText, usePalette } from "../theme";
import { NText, type NTone, type NVariant } from "./NText";
import { useNotebookPalette } from "./theme";

/** Where a line came from, by kind: a note (green), Contacts (sky), your own word (sunset), private (magenta). */
export type SourceKind = "note" | "contacts" | "yours" | "held" | "onPhoto";

export function NSource({ kind = "note", label, onPress, tone, color, chevron = false, style }: {
  kind?: SourceKind;
  label: string;
  onPress?: () => void;
  tone?: NTone;
  /** Text drawn on a person's colour takes their ink. */
  color?: string;
  /** The full-width source row of the expanded moment (hairlines above and below, a chevron). */
  chevron?: boolean;
  style?: ViewStyle;
}) {
  const p = usePalette();
  const n = useNotebookPalette();
  const dot = { note: n.green, contacts: n.contacts, yours: n.yours, held: n.held, onPhoto: n.lime }[kind];
  const row = (
    <View style={[{ flexDirection: "row", alignItems: "center", gap: space.s - 1 }, chevron ? { flex: 1 } : null]}>
      <View style={{ width: size.dot, height: size.dot, borderRadius: size.dot / 2, backgroundColor: dot }} />
      <NText v="source" tone={tone ?? (kind === "onPhoto" ? "onPhotoQuiet" : "ink2")} color={color} style={{ flexShrink: 1, opacity: color ? 0.85 : 1 }}>{label}</NText>
    </View>
  );
  if (chevron) {
    return (
      <Pressable
        accessibilityRole={onPress ? "link" : "text"}
        accessibilityLabel={label}
        accessibilityHint={onPress ? "Opens where this came from" : undefined}
        disabled={!onPress}
        onPress={onPress}
        style={({ pressed }) => [{
          flexDirection: "row", alignItems: "center", minHeight: TOUCH, paddingVertical: space.m,
          borderTopWidth: 1, borderBottomWidth: 1, borderColor: p.hairline, opacity: pressed ? press.link : 1,
        }, style]}
      >
        {row}
        {onPress ? <ChevronRight size={20} color={n.quiet} strokeWidth={1.8} /> : null}
      </Pressable>
    );
  }
  if (!onPress) return <View style={style}>{row}</View>;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      accessibilityHint="Opens where this came from"
      onPress={onPress}
      hitSlop={{ top: space.s, bottom: space.s, left: 0, right: space.l }}
      style={({ pressed }) => [{ alignSelf: "flex-start", opacity: pressed ? press.link : 1 }, style]}
    >
      {row}
    </Pressable>
  );
}

export type NButtonVariant = "ink" | "lime" | "ghost" | "onPhoto" | "white";

export function NButton({ label, onPress, variant = "ink", small = false, icon, full = false, flex, disabled, accessibilityLabel, accessibilityHint, testID, on }: {
  label?: string;
  onPress: () => void;
  variant?: NButtonVariant;
  small?: boolean;
  icon?: (p: { color: string; size: number; strokeWidth: number }) => React.ReactNode;
  full?: boolean;
  flex?: number;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
  /**
   * The ink of a coloured surface it sits on (a person's poster): ink and ghost buttons take it, so they
   * read the same in Night as by day (the page's ink turns light at night; the person's colour doesn't).
   */
  on?: string;
}) {
  const p = usePalette();
  const n = useNotebookPalette();
  const h = small ? notebook.smallButton : 50;
  const ink = on ?? p.ink;
  const bg = { ink, lime: n.lime, ghost: "transparent", onPhoto: "transparent", white: n.card }[variant];
  const fg = { ink: on ? "#FFFFFF" : p.onInk, lime: "#0F2A1D", ghost: ink, onPhoto: n.onPhoto, white: p.ink }[variant];
  const border = variant === "ghost" ? (on ? `${on}55` : p.rule) : variant === "onPhoto" ? n.onPhotoRule : null;
  const large = isLargeText();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      hitSlop={small ? (TOUCH - h) / 2 : 0}
      style={({ pressed }) => [
        { opacity: disabled ? press.disabled : pressed ? press.surface : 1 },
        full ? { alignSelf: "stretch" } : null,
        // Sized to its words first, then sharing what's left: equal shares broke "Message" in two
        // on a 402 pt phone (native pass, 3 Nov 2026).
        flex ? { flexGrow: flex, flexShrink: 1, flexBasis: "auto" } : null,
      ]}
    >
      <View
        style={{
          minHeight: h, borderRadius: radius.pill(h), backgroundColor: bg,
          borderWidth: border ? 1.5 : 0, borderColor: border ?? undefined,
          flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.s,
          paddingHorizontal: label ? (small ? space.l : space.xl + 2) : space.m, paddingVertical: large ? space.s : 0,
        }}
      >
        {icon ? icon({ color: fg, size: small ? 17 : 19, strokeWidth: 1.8 }) : null}
        {label ? <NText v={small ? "buttonSmall" : "button"} color={fg} style={{ textAlign: "center", flexShrink: 1 }}>{label}</NText> : null}
      </View>
    </Pressable>
  );
}

/** The when-chip on a poster ("Yesterday · Sun, Nov 1"). */
export function Chip({ label, variant = "lime" }: { label: string; variant?: "lime" | "white" | "ghost" }) {
  const p = usePalette();
  const n = useNotebookPalette();
  const bg = { lime: n.lime, white: "rgba(255,255,255,0.92)", ghost: "rgba(15,42,29,0.07)" }[variant];
  return (
    <View style={{ alignSelf: "flex-start", minHeight: 28, borderRadius: 14, paddingHorizontal: space.m, justifyContent: "center", backgroundColor: bg }}>
      <NText v="strong14" color={variant === "ghost" ? p.ink : "#0F2A1D"} style={{ fontSize: 12.5 }}>{label}</NText>
    </View>
  );
}

export type TagKind = "plain" | "yours" | "known" | "replace" | "understood";

/** A review tag ("You said you'd", "Already known · nothing added twice", "Replaces: …"). */
export function Tag({ kind = "plain", label, children }: { kind?: TagKind; label: string; children?: React.ReactNode }) {
  const p = usePalette();
  const n = useNotebookPalette();
  const bg = { plain: p.paper, yours: n.yoursTint, known: n.paper2, replace: n.replaceTint, understood: n.greenTint }[kind];
  const tone: NTone = { plain: "ink2", yours: "yours", known: "ink2", replace: "replace", understood: "known" }[kind] as NTone;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space.xs, borderRadius: 7, paddingHorizontal: space.s, paddingVertical: 5, backgroundColor: bg, alignSelf: "flex-start", maxWidth: "100%" }}>
      <NText v="tag" tone={tone}>{label}</NText>
      {children}
    </View>
  );
}

/** An idea's category ("A gesture", "Celebrate"): caps on its tint. */
export function CategoryTag({ label, tint }: { label: string; tint: string }) {
  return (
    <View style={{ alignSelf: "flex-start", borderRadius: 6, paddingHorizontal: space.s, paddingVertical: 5, backgroundColor: tint }}>
      <NText v="category" color="#0F2A1D">{label}</NText>
    </View>
  );
}

/** A raised white card with the soft lift (ideas, questions, the return check, review lines). */
export function Raised({ children, style, edge, large = false, onLayout }: { children: React.ReactNode; style?: ViewStyle; onLayout?: ViewProps["onLayout"]; edge?: string; large?: boolean }) {
  const n = useNotebookPalette();
  return (
    <View
      onLayout={onLayout}
      style={[
        { backgroundColor: n.card, borderRadius: large ? notebook.raised.large : notebook.raised.radius, padding: space.l, ...notebookShadow.card },
        edge ? { borderLeftWidth: 3, borderLeftColor: edge } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** A caps label with a dot before it ("Coming up", "You could mention"). */
export function Lbl({ children, dot, style, section = false }: { children: string; dot?: string | null; style?: ViewStyle; section?: boolean }) {
  const n = useNotebookPalette();
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", gap: space.s }, style]}>
      {dot === null ? null : <View style={{ width: size.dot, height: size.dot, borderRadius: size.dot / 2, backgroundColor: dot ?? n.lime }} />}
      <NText v={section ? "section" : "cap"} tone={section ? "ink" : "ink2"} accessibilityRole="header">{children}</NText>
    </View>
  );
}

/**
 * Notebook paper (PR #77 `.paper`, `.np`, `.tell-paper`): warm white, a blue rule every line,
 * a pink margin at the left. The rule follows the text's own line height, so the words sit on it.
 */
export function RuledPaper({ children, lineHeight, style, margin = true, rules = true }: {
  children: React.ReactNode;
  lineHeight: number;
  style?: ViewStyle;
  margin?: boolean;
  rules?: boolean;
}) {
  const n = useNotebookPalette();
  const [h, setH] = useState(0);
  const count = rules ? Math.max(0, Math.floor(h / lineHeight)) : 0;
  return (
    <View
      onLayout={(e) => setH(e.nativeEvent.layout.height)}
      style={[{ backgroundColor: n.sheet, overflow: "hidden" }, margin ? { borderLeftWidth: 3, borderLeftColor: n.sheetMargin } : null, style]}
    >
      <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        {Array.from({ length: count }, (_, i) => (
          <View key={i} style={{ position: "absolute", left: 0, right: 0, top: (i + 1) * lineHeight - 1, height: 1, backgroundColor: n.sheetRule }} />
        ))}
      </View>
      {children}
    </View>
  );
}

/** The lens control (Now · Pages · Knows): a well with the current lens raised. */
export function LensTabs<K extends string>({ lenses, current, onChange }: {
  lenses: { key: K; label: string }[];
  current: K;
  onChange: (k: K) => void;
}) {
  const p = usePalette();
  const n = useNotebookPalette();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: "row", backgroundColor: n.paper2, borderRadius: 22, padding: space.xs }}>
      {lenses.map((l) => {
        const on = l.key === current;
        return (
          <Pressable
            key={l.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={l.label}
            onPress={() => onChange(l.key)}
            style={({ pressed }) => ({ flex: 1, opacity: pressed ? press.surface : 1 })}
          >
            <View style={[
              { minHeight: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", paddingVertical: space.xs },
              on ? { backgroundColor: n.raisedInWell, ...notebookShadow.card } : null,
            ]}>
              <NText v="strong14" color={on ? p.ink : n.ink2}>{l.label}</NText>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A round icon well (the sprout before "Ideas for showing up"; a way to do it). */
export function IconWell({ children, sizePt = 38, round = true, tint }: { children: React.ReactNode; sizePt?: number; round?: boolean; tint?: string }) {
  const n = useNotebookPalette();
  return (
    <View style={{ width: sizePt, height: sizePt, borderRadius: round ? sizePt / 2 : 12, backgroundColor: tint ?? n.greenTint, alignItems: "center", justifyContent: "center" }}>
      {children}
    </View>
  );
}

export { NText, type NTone, type NVariant };
