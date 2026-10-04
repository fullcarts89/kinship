// The first screen of Kinship 2.0: welcome and sign in (D1: an account before
// the first Tell; Sign in with Apple first). Board 1's setup language: paper,
// a caps label, the promise in the display serif, one pressed sprig, and the
// action pinned at the bottom in the gutter. Nothing about features or AI.
//
// From plain data; app/(auth)/login.tsx supplies the auth calls.
import React from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { appleButton, GUTTER, height, maxScale, radius, size, space, type } from "@/design/tokens";
import { AppleMark, GoogleMark } from "@/ui/brand";
import { Body, Display, Label, Pill, Sheet, Small, Sprig, Title, useNight, usePalette } from "@/ui";

/** The sprig on the welcome screen: a fixed identity, the same on every phone. */
export const WELCOME_SPRIG = "kinship";

export const WELCOME_COPY = {
  label: "Kinship",
  promise: "Remember what matters about the people you care about.",
  sub: "Kinship keeps it for you, and helps you show up.",
  apple: "Continue with Apple",
  google: "Continue with Google",
  email: "Use email",
  signingIn: "Signing you in…",
  failed: "That didn't work. Please try again.",
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
        opacity: disabled && !busy ? 0.5 : pressed ? 0.8 : 1,
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
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: GUTTER, paddingTop: insets.top + space.x4, paddingBottom: space.xl }}
      >
        <Sprig personId={WELCOME_SPRIG} width={size.sprig.moment} />
        <Label style={{ marginTop: space.x3 }}>{WELCOME_COPY.label}</Label>
        <Display style={{ marginTop: space.m }}>{WELCOME_COPY.promise}</Display>
        <Body style={{ marginTop: space.l }}>{WELCOME_COPY.sub}</Body>
      </ScrollView>

      <View style={{ paddingHorizontal: GUTTER, paddingBottom: insets.bottom + space.xl, gap: space.m }}>
        {props.error ? (
          <Small tone="brick" accessibilityLiveRegion="assertive" accessibilityRole="alert">{props.error}</Small>
        ) : props.busy ? (
          <Small accessibilityLiveRegion="polite">{WELCOME_COPY.signingIn}</Small>
        ) : null}
        {methods.apple ? <AppleButton onPress={props.onApple} busy={props.busy} disabled={props.busy} /> : null}
        {methods.google || methods.email ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: space.s }}>
            {methods.google ? (
              <Pill
                size="small"
                variant={methods.apple ? "quiet" : "ghost"}
                label={WELCOME_COPY.google}
                disabled={props.busy}
                icon={() => <GoogleMark size={size.icon} />}
                onPress={props.onGoogle}
              />
            ) : null}
            {methods.email ? (
              <Pill size="small" variant="quiet" label={WELCOME_COPY.email} disabled={props.busy} onPress={props.onEmail} />
            ) : null}
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
        borderWidth: 1, borderColor: p.hairline, backgroundColor: p.paper,
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
