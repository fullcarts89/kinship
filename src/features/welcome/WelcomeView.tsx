// The first screen of Kinship 2.0: welcome and sign in (D1: an account before
// the first Tell; Sign in with Apple first). Electric Garden: a dawn wash and
// the hero bloom cut by the page's top right, a caps label, the promise in the
// poster voice, the example as three open lines, and the action pinned at the
// bottom in the gutter. Nothing about features or AI.
//
// From plain data; app/(auth)/login.tsx supplies the auth calls.
import React from "react";
import { ActivityIndicator, Platform, ScrollView, Text, TextInput, View } from "react-native";
import { Pressable } from "@/ui/Pressable";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { appleButton, font, GUTTER, press, height, maxScale, radius, size, space, type } from "@/design/tokens";
import { AppleMark, GoogleMark } from "@/ui/brand";
import { HOW_COPY } from "./HowItWorks";
import { Body, Botanical, DawnWash, Display, Grain, Label, Pill, SectionDot, Sheet, Small, Title, useNight, usePalette } from "@/ui";

/** The sprig on the welcome screen: a fixed identity, the same on every phone. */
export const WELCOME_SPRIG = "kinship";

export const WELCOME_COPY = {
  label: "Kinship",
  promise: "Remember what matters about the people you care about.",
  sub: "Kinship keeps it for you, and helps you show up.",
  /**
   * What it is, as one small example instead of a paragraph (founder native
   * pass F9): what you tell it, what it keeps, what it brings back.
   */
  example: {
    label: "An example",
    steps: [
      { label: "You tell it", text: "“Ben runs Chicago Sunday. He's hoping to break four hours.”" },
      { label: "It remembers", text: "Ben runs Chicago · Sun, Oct 11" },
      { label: "It brings it back", text: "How did it go for Ben?" },
    ],
  },
  apple: "Continue with Apple",
  google: "Continue with Google",
  email: "Use email",
  signingIn: "Signing you in…",
  failed: "That didn't work. Please try again.",
  stuck: "You're signed in, but Kinship couldn't open your account. Close Kinship and open it again.",
  legal: "By continuing you agree to the Terms and the Privacy Policy.",
} as const;

export interface WelcomeViewProps {
  /** Which sign-in methods this phone offers. */
  methods: { apple: boolean; google: boolean; email: boolean };
  busy: boolean;
  error: string | null;
  onApple: () => void;
  onGoogle: () => void;
  onEmail: () => void;
  onTerms: () => void;
  onPrivacy: () => void;
  /** "See how it works": the example of the whole loop. */
  onHowItWorks?: () => void;
  children?: React.ReactNode;
}

function AppleButton({ onPress, busy, disabled }: { onPress: () => void; busy: boolean; disabled: boolean }) {
  const night = useNight();
  const c = night ? appleButton.night : appleButton.light;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={WELCOME_COPY.apple}
      accessibilityState={{ disabled, busy }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: height.button, borderRadius: radius.pill(height.button), backgroundColor: c.background,
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.s,
        opacity: disabled && !busy ? press.disabled : pressed ? press.surface : 1,
      })}
    >
      {busy ? (
        <ActivityIndicator color={c.foreground} />
      ) : (
        <>
          <AppleMark color={c.foreground} size={size.icon + 2} />
          <Text maxFontSizeMultiplier={maxScale.label} style={[type.button, { color: c.foreground }]}>{WELCOME_COPY.apple}</Text>
        </>
      )}
    </Pressable>
  );
}

/** Tell → Remember → Bring back, in three open lines with their dots (no card); it opens the full example. */
function ExampleCard({ onPress }: { onPress?: () => void }) {
  const p = usePalette();
  const accents = ["lavender", "mark", "bloom"] as const;
  const body = (
    <View style={{ borderTopWidth: 1, borderTopColor: p.hairline, paddingTop: space.l, gap: space.l }}>
      <Small>{WELCOME_COPY.example.label}</Small>
      {WELCOME_COPY.example.steps.map((s, i) => (
        <View key={s.label} style={{ flexDirection: "row", gap: space.m, alignItems: "flex-start" }}>
          <View style={{ paddingTop: space.xs }}><SectionDot accent={accents[i]} /></View>
          <View style={{ flex: 1 }}>
            <Label>{s.label}</Label>
            <Body tone="ink" style={{ marginTop: space.xs }}>{s.text}</Body>
          </View>
        </View>
      ))}
      {onPress ? <Body tone="ink" style={{ fontFamily: font.sansSemi }}>{`${HOW_COPY.link} →`}</Body> : null}
    </View>
  );
  if (!onPress) return <View>{body}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${WELCOME_COPY.example.label}: ${WELCOME_COPY.example.steps.map((s) => `${s.label}, ${s.text}`).join(". ")}`}
      accessibilityHint={HOW_COPY.link}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? press.surface : 1 })}
    >
      {body}
    </Pressable>
  );
}

export function WelcomeView(props: WelcomeViewProps) {
  const p = usePalette();
  const night = useNight();
  const insets = useSafeAreaInsets();
  const { methods } = props;
  return (
    <View style={{ flex: 1, backgroundColor: p.paper }}>
      <StatusBar style={night ? "light" : "dark"} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: GUTTER, paddingTop: insets.top + space.x5 + space.x5, paddingBottom: space.xl }}
      >
        <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
          <DawnWash kind="joyful" />
          <Botanical art="bloom" width={330} top={-30} right={-40} />
          <Botanical art="leaves" width={200} top={150} left={-110} rotate={-28} flip />
        </View>
        <Label>{WELCOME_COPY.label}</Label>
        <Display style={{ marginTop: space.m, maxWidth: "88%" }}>{WELCOME_COPY.promise}</Display>
        <Body style={{ marginTop: space.m }}>{WELCOME_COPY.sub}</Body>
        <View style={{ marginTop: space.xxl }}><ExampleCard onPress={props.onHowItWorks} /></View>
      </ScrollView>

      <View style={{ paddingHorizontal: GUTTER, paddingBottom: insets.bottom + space.xl, gap: space.m }}>
        {props.error ? (
          <Small tone="brick" accessibilityLiveRegion="assertive" accessibilityRole="alert">{props.error}</Small>
        ) : props.busy ? (
          <Small accessibilityLiveRegion="polite">{WELCOME_COPY.signingIn}</Small>
        ) : null}
        {methods.apple ? <AppleButton onPress={props.onApple} busy={props.busy} disabled={props.busy} /> : null}
        {methods.google ? (
          <Pill
            variant={methods.apple ? "ghost" : "primary"}
            label={WELCOME_COPY.google}
            disabled={props.busy}
            icon={() => <GoogleMark size={size.icon} />}
            onPress={props.onGoogle}
          />
        ) : null}
        {methods.email ? (
          <View style={{ alignItems: "center" }}>
            <Pill size="small" variant="quiet" label={WELCOME_COPY.email} disabled={props.busy} onPress={props.onEmail} />
          </View>
        ) : null}
        <Text maxFontSizeMultiplier={maxScale.text} style={[type.provenance, { color: p.inkQuiet, textAlign: "center" }]}>
          {"By continuing you agree to the "}
          <Text accessibilityRole="link" onPress={props.onTerms} style={{ textDecorationLine: "underline" }}>Terms</Text>
          {" and the "}
          <Text accessibilityRole="link" onPress={props.onPrivacy} style={{ textDecorationLine: "underline" }}>Privacy Policy</Text>
          {"."}
        </Text>
      </View>
      <Grain />
      {props.children}
    </View>
  );
}

// ─── Email (secondary) ──────────────────────────────────────────────────

export type EmailMode = "sign_in" | "sign_up" | "forgot";

export interface EmailSheetProps {
  visible: boolean;
  mode: EmailMode;
  email: string;
  password: string;
  busy: boolean;
  /** An error or a confirmation ("Check your inbox"). */
  message: { text: string; tone: "error" | "info" } | null;
  onEmail: (v: string) => void;
  onPassword: (v: string) => void;
  onMode: (m: EmailMode) => void;
  onSubmit: () => void;
  onDismiss: () => void;
  /** The lab shows the keyboard state without focusing. */
  autoFocus?: boolean;
}

const EMAIL_TITLE: Record<EmailMode, string> = {
  sign_in: "Sign in with email",
  sign_up: "Create your account",
  forgot: "Reset your password",
};

const EMAIL_ACTION: Record<EmailMode, string> = { sign_in: "Sign in", sign_up: "Create account", forgot: "Send reset link" };

function Field(props: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  secure?: boolean;
  email?: boolean;
  autoFocus?: boolean;
  onSubmit?: () => void;
  last?: boolean;
}) {
  const p = usePalette();
  return (
    <TextInput
      value={props.value}
      onChangeText={props.onChange}
      placeholder={props.label}
      placeholderTextColor={p.inkQuiet}
      accessibilityLabel={props.label}
      secureTextEntry={props.secure}
      keyboardType={props.email ? "email-address" : "default"}
      textContentType={props.email ? "username" : props.secure ? "password" : undefined}
      autoComplete={props.email ? "email" : props.secure ? "password" : undefined}
      autoCapitalize="none"
      autoCorrect={false}
      autoFocus={props.autoFocus}
      returnKeyType={props.last ? "go" : "next"}
      onSubmitEditing={props.onSubmit}
      maxFontSizeMultiplier={maxScale.text}
      style={[type.field, {
        color: p.ink, minHeight: height.search, paddingHorizontal: space.l, borderRadius: radius.inline,
        borderWidth: 1, borderColor: p.hairline, backgroundColor: p.surface,
        ...(Platform.OS === "web" ? { outlineWidth: 0 } : {}),
      }]}
    />
  );
}

export function EmailSheet(props: EmailSheetProps) {
  const ready = props.email.trim().length > 0 && (props.mode === "forgot" || props.password.length > 0);
  return (
    <Sheet
      visible={props.visible}
      onDismiss={props.onDismiss}
      label={EMAIL_TITLE[props.mode]}
      footer={
        <View style={{ gap: space.xs }}>
          <Pill variant="primary" label={EMAIL_ACTION[props.mode]} disabled={!ready || props.busy} onPress={props.onSubmit} />
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: space.s }}>
            {props.mode === "sign_in" ? (
              <>
                <Pill variant="quiet" label="Create an account" onPress={() => props.onMode("sign_up")} />
                <Pill variant="quiet" label="Forgot password?" onPress={() => props.onMode("forgot")} />
              </>
            ) : (
              <Pill variant="quiet" label="Back to sign in" onPress={() => props.onMode("sign_in")} />
            )}
          </View>
        </View>
      }
    >
      <Title>{EMAIL_TITLE[props.mode]}</Title>
      <View style={{ gap: space.m, marginTop: space.xl }}>
        <Field value={props.email} onChange={props.onEmail} label="Email" email autoFocus={props.autoFocus}
          last={props.mode === "forgot"} onSubmit={props.mode === "forgot" ? props.onSubmit : undefined} />
        {props.mode !== "forgot" ? (
          <Field value={props.password} onChange={props.onPassword} label="Password" secure last onSubmit={props.onSubmit} />
        ) : null}
      </View>
      {props.mode === "sign_up" ? <Small style={{ marginTop: space.s }}>At least 6 characters.</Small> : null}
      {props.busy ? <ActivityIndicator style={{ marginTop: space.l }} /> : null}
      {props.message ? (
        <Small tone={props.message.tone === "error" ? "brick" : "inkBody"} style={{ marginTop: space.l }}
          accessibilityLiveRegion="assertive" accessibilityRole={props.message.tone === "error" ? "alert" : undefined}>
          {props.message.text}
        </Small>
      ) : null}
    </Sheet>
  );
}
