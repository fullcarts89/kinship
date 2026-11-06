// The notebook Tell page (PR #77 §7; shots/tell.jpg): a full-height page of ruled notebook paper,
// the user's words in Newsreader 21/34. Keep is there once there is something to keep; closing
// keeps the words as a draft. After Keep the words stay on the page, frozen, with "Understanding…";
// the user may close it then too: understanding goes on, and the Kept card carries it (Gate D).
import React, { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Modal, PixelRatio, Platform, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { font, maxScale, notebook, press, space, TOUCH } from "@/design/tokens";
import { useReduceMotion, usePalette } from "@/ui";
import { Pressable } from "@/ui/Pressable";
import { NButton, NText, RuledPaper, useNotebookPalette } from "@/ui/notebook";
import { sheetClosed, sheetOpened } from "@/ui/sheetStack";
import { BreathingDot, FadeIn } from "./motion";

export const NOTEBOOK_TELL_COPY = {
  title: "Tell Kinship",
  aboutAnyone: "About anyone. In your own words.",
  about: (first: string) => `About ${first}. In your own words.`,
  placeholder: "Long or short, messy is fine. Several people at once is fine.",
  hint: "Kinship keeps your words and shows you what it understood.",
  /** Understanding is off or declined: nothing is understood, so nothing is shown back. */
  hintAsWritten: "Kinship keeps your words exactly as you write them.",
  keep: "Keep",
  pill: "Tell Kinship something…",
} as const;

/** The longest note one Tell takes (as the Tell field). */
export const TELL_MAX = 5000;

export interface NotebookTellPageProps {
  /** Who it's about, by first name, when opened about someone. */
  about: string | null;
  draft: string;
  onDraft: (text: string) => void;
  onKeep: () => void;
  onClose: () => void;
  /** After Keep: the words, frozen, while Kinship understands them. */
  frozen: string | null;
  /** "Understanding…", or "I'll understand this when you're online.". */
  status: string | null;
  /** Understanding is on (otherwise the note is kept as written and nothing is shown back). */
  ai: boolean;
}

export function NotebookTellPage(props: NotebookTellPageProps) {
  const p = usePalette();
  const n = useNotebookPalette();
  const insets = useSafeAreaInsets();
  const [height, setHeight] = useState(0);
  // The paper's rule follows the words, at whatever size the user reads them.
  const scale = Math.min(PixelRatio.getFontScale() || 1, maxScale.text);
  const line = Math.round(notebook.ruled.tell * scale);
  const words = { fontSize: 21, lineHeight: notebook.ruled.tell, color: p.ink };
  const canKeep = props.draft.trim().length > 0;
  const understanding = props.frozen !== null;
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: p.paper }} onAccessibilityEscape={props.onClose}>
      <View style={{ paddingTop: insets.top + space.m, paddingLeft: space.xl + 2, paddingRight: space.l + 2, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <NText v="title" style={{ flexShrink: 1 }}>{NOTEBOOK_TELL_COPY.title}</NText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          accessibilityHint={understanding ? "Kinship keeps understanding it; what it kept shows on Today" : "Your words wait here as a draft"}
          onPress={props.onClose}
          style={({ pressed }) => ({ width: TOUCH, height: TOUCH, alignItems: "center", justifyContent: "center", opacity: pressed ? press.link : 1 })}
        >
          <X color={p.ink} size={24} strokeWidth={1.8} />
        </Pressable>
      </View>
      <NText v="body16" tone="quiet" style={{ paddingHorizontal: space.xl + 2, paddingBottom: space.s + 2 }}>
        {props.about ? NOTEBOOK_TELL_COPY.about(props.about) : NOTEBOOK_TELL_COPY.aboutAnyone}
      </NText>
      <View style={{ flex: 1, marginTop: space.xs + 2, marginHorizontal: space.m + 2 }} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }} bounces={false}>
          <RuledPaper
            lineHeight={line}
            style={{ minHeight: height, borderTopLeftRadius: 10, borderTopRightRadius: 24, paddingLeft: space.xl + 3, paddingRight: space.l + 2 }}
          >
            {understanding ? (
              <NText v="serif21" maxFontSizeMultiplier={maxScale.text} style={words} accessibilityLabel={`Your note: ${props.frozen}`}>
                {props.frozen}
              </NText>
            ) : (
              <TextInput
                value={props.draft}
                onChangeText={props.onDraft}
                multiline
                scrollEnabled={false}
                autoFocus
                maxLength={TELL_MAX}
                placeholder={NOTEBOOK_TELL_COPY.placeholder}
                placeholderTextColor={n.quiet}
                accessibilityLabel={NOTEBOOK_TELL_COPY.title}
                accessibilityHint={props.about ? NOTEBOOK_TELL_COPY.about(props.about) : NOTEBOOK_TELL_COPY.aboutAnyone}
                maxFontSizeMultiplier={maxScale.text}
                textAlignVertical="top"
                style={{
                  ...words,
                  // The placeholder is the page's own italic; the words the user writes are upright.
                  fontFamily: props.draft ? font.serif : font.serifItalic,
                  minHeight: Math.max(line * 6, height - space.l),
                  paddingTop: 0, paddingBottom: 0, paddingHorizontal: 0,
                }}
              />
            )}
          </RuledPaper>
        </ScrollView>
      </View>
      <View
        style={{
          flexDirection: "row", alignItems: "center", gap: space.s + 2, paddingHorizontal: space.l, paddingTop: space.m,
          paddingBottom: Math.max(insets.bottom, space.l) + space.xs, backgroundColor: n.sheet, borderTopWidth: 1, borderTopColor: p.hairline,
        }}
      >
        {understanding ? (
          <View accessibilityLiveRegion="polite" accessible accessibilityLabel={props.status ?? "Understanding…"} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: space.s + 2, minHeight: TOUCH }}>
            <BreathingDot />
            <NText v="strong14" tone="ink2" style={{ flexShrink: 1 }}>{props.status ?? "Understanding…"}</NText>
          </View>
        ) : (
          <>
            <NText v="fine" tone="quiet" style={{ flex: 1 }}>{props.ai ? NOTEBOOK_TELL_COPY.hint : NOTEBOOK_TELL_COPY.hintAsWritten}</NText>
            <NButton label={NOTEBOOK_TELL_COPY.keep} onPress={props.onKeep} disabled={!canKeep} accessibilityHint="Keeps your words; Kinship shows you what it understood" />
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

/**
 * One full-screen surface for Tell and its review, so the review can replace the page (a fade)
 * without a sheet ever opening on a sheet (sheetStack.ts): counted as one sheet while it's up.
 */
export function NotebookHost({ kind, onRequestClose, children }: {
  /** What it shows: the Tell page, the review, or nothing (closed). */
  kind: "page" | "review" | null;
  onRequestClose: () => void;
  children: React.ReactNode;
}) {
  const reduce = useReduceMotion();
  const p = usePalette();
  const visible = kind !== null;
  useEffect(() => {
    if (!visible) return;
    sheetOpened();
    return () => sheetClosed();
  }, [visible]);
  // How it arrived decides how it comes and goes: the page rises as a sheet, the review fades.
  const first = useRef<"page" | "review" | null>(null);
  if (visible && first.current === null) first.current = kind;
  const animation = reduce || first.current === "review" ? "fade" : "slide";
  if (!visible) first.current = null;
  return (
    <Modal visible={visible} animationType={animation} presentationStyle="fullScreen" onRequestClose={onRequestClose}>
      <View style={{ flex: 1, backgroundColor: p.paper }} accessibilityViewIsModal>
        {visible ? <FadeIn token={kind ?? ""}>{children}</FadeIn> : null}
      </View>
    </Modal>
  );
}
