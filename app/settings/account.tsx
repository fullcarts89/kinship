import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput as RNTextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Mail,
  Lock,
  LogOut,
  RefreshCw,
  Trash2,
  Download,
  Shield,
  Leaf,
  Check,
  AlertCircle,
  ChevronRight,
} from "lucide-react-native";
import { colors, fonts } from "@design/tokens";
import { FadeIn } from "@/components/ui";
import { useAuth } from "@/providers";
import {
  SeedIllustration,
  WateringIllustration,
  GardenRevealIllustration,
  InboxCheckIllustration,
  FadingGardenIllustration,
} from "@/components/illustrations";

// ─── Design Tokens (local) ──────────────────────────────────────────────────

const sage = colors.sage;
const sageDark = colors.moss;
const sagePale = colors.sagePale;
const sageLight = colors.sageLight;
const gold = colors.gold;
const goldDark = "#B88A30";
const goldLight = colors.goldLight;
const goldPale = colors.goldPale;
const cream = colors.cream;
const nearBlack = colors.nearBlack;
const warmGray = colors.warmGray;
const white = colors.white;
const dangerRed = colors.error;
const dangerPale = colors.errorPale;
const dangerLight = colors.errorLight;
const settingsBg = "#F5F0EC";
const fieldBorder = "#F0EBE3";
const fieldReadOnlyBg = "#F9F5F0";
const chevronMuted = "#D4CFC8";
const placeholderColor = "#C4BBB0";

// ─── Insets Type ─────────────────────────────────────────────────────────────

type Insets = { top: number; bottom: number };

// ─── Shared Primitives ──────────────────────────────────────────────────────

function NavBar({
  left,
  title,
  right,
  insets,
}: {
  left?: React.ReactNode;
  title: string;
  right?: React.ReactNode;
  insets: Insets;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: insets.top + 14,
        paddingHorizontal: 20,
        paddingBottom: 0,
        minHeight: 52,
      }}
    >
      <View style={{ minWidth: 64, alignItems: "flex-start" }}>{left}</View>
      <Text
        style={{
          fontFamily: fonts.serif,
          fontSize: 17,
          color: nearBlack,
          textAlign: "center",
          flex: 1,
        }}
      >
        {title}
      </Text>
      <View style={{ minWidth: 64, alignItems: "flex-end" }}>{right}</View>
    </View>
  );
}

function BackBtn({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
    >
      <ArrowLeft size={16} strokeWidth={2} color={sage} />
      <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: sage }}>
        Back
      </Text>
    </Pressable>
  );
}

function CancelBtn({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={12}>
      <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: warmGray }}>
        Cancel
      </Text>
    </Pressable>
  );
}

function SageBtn({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={{
        width: "100%",
        borderRadius: 18,
        overflow: "hidden",
        opacity: disabled ? 1 : 1,
      }}
    >
      <LinearGradient
        colors={disabled ? [sagePale, sagePale] : [sage, sageDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingVertical: 15,
          alignItems: "center",
          borderRadius: 18,
          shadowColor: disabled ? "transparent" : sage,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: disabled ? 0 : 0.27,
          shadowRadius: 18,
          elevation: disabled ? 0 : 6,
        }}
      >
        <Text
          style={{
            fontFamily: fonts.sansSemiBold,
            fontSize: 15,
            color: disabled ? warmGray : white,
          }}
        >
          {label}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

function OutlineBtn({
  label,
  onPress,
}: {
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: "100%",
        paddingVertical: 13,
        borderRadius: 18,
        borderWidth: 1.5,
        borderColor: "#E8E0D6",
        alignItems: "center",
      }}
    >
      <Text
        style={{
          fontFamily: fonts.sansMedium,
          fontSize: 14,
          color: warmGray,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function WarmDangerBtn({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={{
        width: "100%",
        paddingVertical: 14,
        borderRadius: 18,
        borderWidth: 1.5,
        borderColor: disabled ? "#EDE8E3" : dangerLight,
        backgroundColor: disabled ? "#F9F5F0" : dangerPale,
        alignItems: "center",
      }}
    >
      <Text
        style={{
          fontFamily: fonts.sansSemiBold,
          fontSize: 15,
          color: disabled ? warmGray : dangerRed,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function TxtLink({
  label,
  onPress,
  color = warmGray,
}: {
  label: string;
  onPress?: () => void;
  color?: string;
}) {
  return (
    <Pressable onPress={onPress} style={{ paddingVertical: 6 }}>
      <Text
        style={{
          fontFamily: fonts.sans,
          fontSize: 14,
          color,
          textDecorationLine: "underline",
          textDecorationColor: "#D4CECA",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function HrDivider({ label }: { label?: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginVertical: 4,
      }}
    >
      <View style={{ flex: 1, height: 1, backgroundColor: fieldBorder }} />
      {label && (
        <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: warmGray }}>
          {label}
        </Text>
      )}
      <View style={{ flex: 1, height: 1, backgroundColor: fieldBorder }} />
    </View>
  );
}

function AuthSocialBtn({
  platform,
  onPress,
}: {
  platform: "apple" | "google" | "email";
  onPress?: () => void;
}) {
  const cfg = {
    apple: {
      label: "Continue with Apple",
      icon: "\uD83C\uDF4E",
      bg: nearBlack,
      color: white,
      borderColor: nearBlack,
    },
    google: {
      label: "Continue with Google",
      icon: "\uD83D\uDD35",
      bg: white,
      color: nearBlack,
      borderColor: "#E8E0D6",
    },
    email: {
      label: "Continue with Email",
      icon: "\u2709\uFE0F",
      bg: white,
      color: nearBlack,
      borderColor: "#E8E0D6",
    },
  };
  const c = cfg[platform];
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: "100%",
        backgroundColor: c.bg,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: c.borderColor,
        paddingVertical: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
      }}
    >
      <Text style={{ fontSize: 17 }}>{c.icon}</Text>
      <Text
        style={{
          fontFamily: fonts.sansMedium,
          fontSize: 14,
          color: c.color,
        }}
      >
        {c.label}
      </Text>
    </Pressable>
  );
}

// ─── Form Field ─────────────────────────────────────────────────────────────

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  type = "text",
  readOnly = false,
  helper,
  icon: FieldIcon,
}: {
  label: string;
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  type?: "text" | "email" | "password";
  readOnly?: boolean;
  helper?: string;
  icon?: any;
}) {
  const [showPwd, setShowPwd] = useState(false);

  return (
    <View style={{ marginBottom: 14 }}>
      <Text
        style={{
          fontFamily: fonts.sansSemiBold,
          fontSize: 11,
          color: warmGray,
          textTransform: "uppercase",
          letterSpacing: 0.7,
          marginBottom: 7,
        }}
      >
        {label}
      </Text>
      <View style={{ position: "relative" }}>
        <View
          style={{
            backgroundColor: readOnly ? fieldReadOnlyBg : white,
            borderWidth: 1.5,
            borderColor: readOnly ? "#EDE8E3" : fieldBorder,
            borderRadius: 14,
            padding: 13,
            paddingRight: type === "password" ? 44 : 14,
            flexDirection: "row",
            alignItems: "center",
            gap: 9,
          }}
        >
          {FieldIcon && (
            <FieldIcon size={15} strokeWidth={1.75} color={warmGray} />
          )}
          {readOnly ? (
            <Text
              style={{
                flex: 1,
                fontFamily: fonts.sans,
                fontSize: 15,
                color: warmGray,
              }}
            >
              {value}
            </Text>
          ) : (
            <RNTextInput
              value={value}
              onChangeText={onChangeText}
              placeholder={placeholder}
              placeholderTextColor={placeholderColor}
              secureTextEntry={type === "password" && !showPwd}
              keyboardType={type === "email" ? "email-address" : "default"}
              autoCapitalize="none"
              editable={!readOnly}
              style={{
                flex: 1,
                fontFamily: fonts.sans,
                fontSize: 15,
                color: nearBlack,
                padding: 0,
              }}
            />
          )}
        </View>
        {type === "password" && (
          <Pressable
            onPress={() => setShowPwd((s) => !s)}
            hitSlop={8}
            style={{
              position: "absolute",
              right: 12,
              top: 0,
              bottom: 0,
              justifyContent: "center",
            }}
          >
            {showPwd ? (
              <EyeOff size={16} strokeWidth={1.75} color={warmGray} />
            ) : (
              <Eye size={16} strokeWidth={1.75} color={warmGray} />
            )}
          </Pressable>
        )}
      </View>
      {helper && (
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 12,
            color: warmGray,
            marginTop: 5,
            paddingLeft: 2,
          }}
        >
          {helper}
        </Text>
      )}
    </View>
  );
}

// ─── Settings Row ───────────────────────────────────────────────────────────

function SettingsRow({
  icon: Icon,
  label,
  last = false,
  iconBg = sagePale,
  iconColor = sageDark,
  labelColor = nearBlack,
  chevronColor = chevronMuted,
  onPress,
}: {
  icon: any;
  label: string;
  last?: boolean;
  iconBg?: string;
  iconColor?: string;
  labelColor?: string;
  chevronColor?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 13,
        paddingVertical: 13,
        paddingHorizontal: 18,
        backgroundColor: white,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: settingsBg,
      }}
    >
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 9,
          backgroundColor: iconBg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={15} strokeWidth={1.75} color={iconColor} />
      </View>
      <Text
        style={{
          flex: 1,
          fontFamily: fonts.sans,
          fontSize: 14,
          color: labelColor,
        }}
      >
        {label}
      </Text>
      <ChevronRight size={15} strokeWidth={2} color={chevronColor} />
    </Pressable>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <Text
      style={{
        fontFamily: fonts.sansSemiBold,
        fontSize: 11,
        color: warmGray,
        textTransform: "uppercase",
        letterSpacing: 0.7,
        marginBottom: 8,
        marginLeft: 4,
      }}
    >
      {label}
    </Text>
  );
}

function PlanBadge() {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        backgroundColor: sagePale,
        borderRadius: 100,
        paddingVertical: 3,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: sageLight,
      }}
    >
      <Text
        style={{
          fontFamily: fonts.sansBold,
          fontSize: 11,
          color: sageDark,
        }}
      >
        Free
      </Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN 1 — Save Your Garden (Account Signed-Out)
// ═══════════════════════════════════════════════════════════════════════════

function S1_SaveGarden({
  onApple,
  onGoogle,
  onEmail,
  onBack,
  insets,
}: {
  onApple: () => void;
  onGoogle: () => void;
  onEmail: () => void;
  onBack: () => void;
  insets: Insets;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: cream }}>
      {/* Back navigation */}
      <View style={{ paddingTop: insets.top + 14, paddingHorizontal: 20 }}>
        <Pressable
          onPress={onBack}
          hitSlop={12}
          style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
        >
          <ArrowLeft size={16} strokeWidth={2} color={sage} />
          <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: sage }}>
            Back
          </Text>
        </Pressable>
      </View>

      <View style={{ paddingTop: 10, alignItems: "center" }}>
        <SeedIllustration size={172} />
      </View>

      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 14 }}>
        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize: 28,
            color: nearBlack,
            marginBottom: 6,
            lineHeight: 34,
          }}
        >
          Save your garden
        </Text>
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 14,
            color: warmGray,
            lineHeight: 22,
            marginBottom: 22,
          }}
        >
          Your relationships will be safely backed up and accessible across
          devices.
        </Text>

        <View style={{ gap: 10, marginBottom: 14 }}>
          <AuthSocialBtn platform="apple" onPress={onApple} />
          <AuthSocialBtn platform="google" onPress={onGoogle} />
          <HrDivider label="or" />
          <AuthSocialBtn platform="email" onPress={onEmail} />
        </View>

        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 12,
            color: warmGray,
            textAlign: "center",
          }}
        >
          Create account or sign in.
        </Text>
      </View>

      <View
        style={{
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 36,
          paddingTop: 16,
        }}
      >
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 11,
            color: "#A8A29E",
            textAlign: "center",
            lineHeight: 18,
          }}
        >
          We never read your messages or contacts.{"\n"}Your garden, your data.
        </Text>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN 2 — Enter Email
// ═══════════════════════════════════════════════════════════════════════════

function S2_EnterEmail({
  onContinue,
  onSignIn,
  onBack,
  email,
  setEmail,
  insets,
}: {
  onContinue: () => void;
  onSignIn: () => void;
  onBack: () => void;
  email: string;
  setEmail: (v: string) => void;
  insets: Insets;
}) {
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: cream }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <NavBar
        left={<BackBtn onPress={onBack} />}
        title="Use your email"
        insets={insets}
      />
      <View style={{ flex: 1, paddingHorizontal: 22, paddingTop: 28 }}>
        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize: 26,
            color: nearBlack,
            marginBottom: 6,
            lineHeight: 32,
          }}
        >
          Enter your{"\n"}email address
        </Text>
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 14,
            color: warmGray,
            lineHeight: 22,
            marginBottom: 28,
          }}
        >
          We'll check whether you have an existing account.
        </Text>
        <FormField
          label="Email address"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          type="email"
          icon={Mail}
        />
      </View>
      <View
        style={{
          paddingHorizontal: 22,
          paddingBottom: insets.bottom + 44,
          gap: 10,
        }}
      >
        <SageBtn label="Continue" onPress={onContinue} />
        <View style={{ alignItems: "center", marginTop: 2 }}>
          <TxtLink
            label="Already have an account? Sign in"
            onPress={onSignIn}
            color={sage}
          />
        </View>
        <OutlineBtn label="Back" onPress={onBack} />
      </View>
    </KeyboardAvoidingView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN 3 — Email Validation (checking state → routes to create or sign in)
// For the prototype, this is a pass-through — the user screenshots show
// it resolves immediately. In production this would call an API.
// We skip this as a discrete screen and route directly.
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN 4 — Create Password
// ═══════════════════════════════════════════════════════════════════════════

function S4_CreatePassword({
  onCreate,
  onBack,
  insets,
}: {
  onCreate: () => void;
  onBack: () => void;
  insets: Insets;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: cream }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <NavBar
        left={<BackBtn onPress={onBack} />}
        title="Create a password"
        insets={insets}
      />
      <View style={{ flex: 1, paddingHorizontal: 22, paddingTop: 28 }}>
        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize: 26,
            color: nearBlack,
            marginBottom: 6,
            lineHeight: 32,
          }}
        >
          Create a{"\n"}password
        </Text>
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 14,
            color: warmGray,
            lineHeight: 22,
            marginBottom: 28,
          }}
        >
          You'll use this to access your garden on other devices.
        </Text>
        <FormField
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Choose a password"
          type="password"
          icon={Lock}
          helper="At least 8 characters"
        />
        <FormField
          label="Confirm password"
          value={confirm}
          onChangeText={setConfirm}
          placeholder="Re-enter your password"
          type="password"
          icon={Lock}
        />
      </View>
      <View
        style={{
          paddingHorizontal: 22,
          paddingBottom: insets.bottom + 44,
          gap: 10,
        }}
      >
        <SageBtn label="Create account" onPress={onCreate} />
        <OutlineBtn label="Back" onPress={onBack} />
      </View>
    </KeyboardAvoidingView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN 5 — Sign In
// ═══════════════════════════════════════════════════════════════════════════

function S5_SignIn({
  email,
  onSignIn,
  onForgot,
  onBack,
  insets,
}: {
  email: string;
  onSignIn: () => void;
  onForgot: () => void;
  onBack: () => void;
  insets: Insets;
}) {
  const [password, setPassword] = useState("");

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: cream }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <NavBar
        left={<BackBtn onPress={onBack} />}
        title="Sign in"
        insets={insets}
      />
      <View style={{ flex: 1, paddingHorizontal: 22, paddingTop: 28 }}>
        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize: 26,
            color: nearBlack,
            marginBottom: 6,
            lineHeight: 32,
          }}
        >
          Welcome back
        </Text>
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 14,
            color: warmGray,
            lineHeight: 22,
            marginBottom: 28,
          }}
        >
          Sign in to restore your garden.
        </Text>
        <FormField
          label="Email"
          value={email}
          type="email"
          readOnly
          icon={Mail}
        />
        <FormField
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Your password"
          type="password"
          icon={Lock}
        />
        <View style={{ alignItems: "center", marginBottom: 4 }}>
          <TxtLink
            label="Forgot password?"
            onPress={onForgot}
            color={sage}
          />
        </View>
      </View>
      <View
        style={{
          paddingHorizontal: 22,
          paddingBottom: insets.bottom + 44,
          gap: 10,
        }}
      >
        <SageBtn label="Sign in" onPress={onSignIn} />
        <OutlineBtn label="Back" onPress={onBack} />
      </View>
    </KeyboardAvoidingView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN 6 — Forgot Password
// ═══════════════════════════════════════════════════════════════════════════

function S6_ForgotPassword({
  email,
  onSend,
  onBack,
  insets,
}: {
  email: string;
  onSend: () => void;
  onBack: () => void;
  insets: Insets;
}) {
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: cream }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <NavBar
        left={<BackBtn onPress={onBack} />}
        title="Reset password"
        insets={insets}
      />
      <View style={{ flex: 1, paddingHorizontal: 22, paddingTop: 28 }}>
        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize: 26,
            color: nearBlack,
            marginBottom: 6,
            lineHeight: 32,
          }}
        >
          Reset your{"\n"}password
        </Text>
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 14,
            color: warmGray,
            lineHeight: 22,
            marginBottom: 28,
          }}
        >
          We'll send a reset link to your email. No pressure.
        </Text>
        <FormField
          label="Email address"
          value={email}
          type="email"
          readOnly
          icon={Mail}
        />
      </View>
      <View
        style={{
          paddingHorizontal: 22,
          paddingBottom: insets.bottom + 44,
          gap: 10,
        }}
      >
        <SageBtn label="Send reset link" onPress={onSend} />
        <OutlineBtn label="Back" onPress={onBack} />
      </View>
    </KeyboardAvoidingView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN 7 — Check Inbox
// ═══════════════════════════════════════════════════════════════════════════

function S7_CheckInbox({
  email,
  onDone,
  insets,
}: {
  email: string;
  onDone: () => void;
  insets: Insets;
}) {
  return (
    <LinearGradient
      colors={[sagePale, cream]}
      locations={[0, 0.55]}
      style={{ flex: 1 }}
    >
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 28,
          paddingBottom: 40,
          paddingTop: insets.top,
        }}
      >
        <InboxCheckIllustration size={180} />
        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize: 30,
            color: nearBlack,
            textAlign: "center",
            lineHeight: 36,
            marginTop: 20,
            marginBottom: 10,
          }}
        >
          Check your inbox.
        </Text>
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 14,
            color: warmGray,
            textAlign: "center",
            lineHeight: 23,
            marginBottom: 36,
            maxWidth: 280,
          }}
        >
          We sent a link to{" "}
          <Text style={{ fontFamily: fonts.sansSemiBold, color: nearBlack }}>
            {email}
          </Text>
          . Click it to reset your password — it expires in 15 minutes.
        </Text>
        <View style={{ width: "100%" }}>
          <SageBtn label="Back to sign in" onPress={onDone} />
        </View>
      </View>
    </LinearGradient>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN 8 — Account (Signed In)
// ═══════════════════════════════════════════════════════════════════════════

function S8_AccountSignedIn({
  email,
  onLogOut,
  onSwitch,
  onDeactivate,
  onDelete,
  onBack,
  insets,
}: {
  email: string;
  onLogOut: () => void;
  onSwitch: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
  onBack: () => void;
  insets: Insets;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: settingsBg }}>
      <NavBar
        left={<BackBtn onPress={onBack} />}
        title="Account"
        insets={insets}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Identity card */}
        <View
          style={{
            marginHorizontal: 14,
            marginTop: 16,
            backgroundColor: white,
            borderRadius: 18,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 4,
            elevation: 1,
          }}
        >
          <LinearGradient
            colors={[sage, sageDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 46,
              height: 46,
              borderRadius: 15,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                fontFamily: fonts.serif,
                fontSize: 18,
                color: white,
              }}
            >
              {email.substring(0, 2).toUpperCase()}
            </Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: fonts.sans,
                fontSize: 11,
                color: warmGray,
                marginBottom: 2,
              }}
            >
              Signed in as
            </Text>
            <Text
              style={{
                fontFamily: fonts.sansMedium,
                fontSize: 14,
                color: nearBlack,
              }}
              numberOfLines={1}
            >
              {email}
            </Text>
          </View>
          <PlanBadge />
        </View>

        {/* Actions */}
        <View style={{ marginHorizontal: 14, marginTop: 14 }}>
          <View
            style={{
              backgroundColor: white,
              borderRadius: 18,
              overflow: "hidden",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 4,
              elevation: 1,
            }}
          >
            <SettingsRow
              icon={RefreshCw}
              label="Switch account"
              onPress={onSwitch}
            />
            <SettingsRow
              icon={LogOut}
              label="Log out"
              onPress={onLogOut}
              last
            />
          </View>
        </View>

        {/* Danger zone */}
        <View style={{ marginHorizontal: 14, marginTop: 14 }}>
          <SectionLabel label="Danger zone" />
          <View
            style={{
              backgroundColor: white,
              borderRadius: 18,
              overflow: "hidden",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 4,
              elevation: 1,
            }}
          >
            <SettingsRow
              icon={Leaf}
              label="Deactivate account"
              iconBg="#FFF8EC"
              iconColor={goldDark}
              onPress={onDeactivate}
            />
            <SettingsRow
              icon={Trash2}
              label="Delete account"
              iconBg={dangerPale}
              iconColor={dangerRed}
              labelColor={dangerRed}
              chevronColor={dangerLight}
              onPress={onDelete}
              last
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN 9 — Log Out Modal (Bottom Sheet)
// ═══════════════════════════════════════════════════════════════════════════

function S9_LogOutModal({
  onConfirm,
  onCancel,
  insets,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  insets: Insets;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "rgba(28,25,23,0.38)",
        justifyContent: "flex-end",
      }}
    >
      <Pressable style={{ flex: 1 }} onPress={onCancel} />
      <View
        style={{
          backgroundColor: white,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          paddingTop: 10,
        }}
      >
        {/* Pull pill */}
        <View
          style={{
            width: 40,
            height: 4,
            borderRadius: 100,
            backgroundColor: "#E8E0D6",
            alignSelf: "center",
            marginBottom: 24,
          }}
        />
        <View
          style={{
            paddingHorizontal: 24,
            paddingBottom: insets.bottom + 48,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.serif,
              fontSize: 26,
              color: nearBlack,
              marginBottom: 10,
            }}
          >
            Log out?
          </Text>
          <Text
            style={{
              fontFamily: fonts.sans,
              fontSize: 14,
              color: warmGray,
              lineHeight: 23,
              marginBottom: 32,
            }}
          >
            Your garden will stay on this device unless you choose to delete it.
          </Text>
          <View style={{ gap: 10 }}>
            <OutlineBtn label="Log out" onPress={onConfirm} />
            <SageBtn label="Cancel" onPress={onCancel} />
          </View>
        </View>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN 10 — Switch Account
// ═══════════════════════════════════════════════════════════════════════════

function S10_SwitchAccount({
  onContinue,
  onCancel,
  insets,
}: {
  onContinue: () => void;
  onCancel: () => void;
  insets: Insets;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: cream }}>
      <NavBar
        left={<CancelBtn onPress={onCancel} />}
        title="Switch account"
        insets={insets}
      />
      <View style={{ flex: 1, paddingHorizontal: 22, paddingTop: 24 }}>
        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize: 24,
            color: nearBlack,
            marginBottom: 8,
            lineHeight: 30,
          }}
        >
          Switch account
        </Text>
        <View
          style={{
            padding: 11,
            paddingHorizontal: 14,
            backgroundColor: goldPale,
            borderWidth: 1,
            borderColor: goldLight,
            borderRadius: 13,
            marginBottom: 24,
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 8,
          }}
        >
          <AlertCircle
            size={15}
            strokeWidth={1.75}
            color={goldDark}
            style={{ marginTop: 1 }}
          />
          <Text
            style={{
              flex: 1,
              fontFamily: fonts.sans,
              fontSize: 13,
              color: nearBlack,
              lineHeight: 20,
            }}
          >
            This will replace the current garden with the selected account's
            garden.
          </Text>
        </View>

        <View style={{ gap: 10 }}>
          <AuthSocialBtn platform="apple" onPress={onContinue} />
          <AuthSocialBtn platform="google" onPress={onContinue} />
          <AuthSocialBtn platform="email" onPress={onContinue} />
        </View>
      </View>
      <View
        style={{
          paddingHorizontal: 22,
          paddingBottom: insets.bottom + 44,
        }}
      >
        <OutlineBtn label="Cancel" onPress={onCancel} />
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN 11 — Deactivate Account
// ═══════════════════════════════════════════════════════════════════════════

function S11_Deactivate({
  onDeactivate,
  onCancel,
  insets,
}: {
  onDeactivate: () => void;
  onCancel: () => void;
  insets: Insets;
}) {
  return (
    <LinearGradient
      colors={[sagePale, cream]}
      locations={[0, 0.55]}
      style={{ flex: 1 }}
    >
      <NavBar right={<CancelBtn onPress={onCancel} />} title="" insets={insets} />
      <View style={{ alignItems: "center", marginTop: 8 }}>
        <WateringIllustration size={178} />
      </View>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 12 }}>
        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize: 28,
            color: nearBlack,
            marginBottom: 8,
            lineHeight: 34,
          }}
        >
          Take a break?
        </Text>
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 14,
            color: warmGray,
            lineHeight: 23,
            marginBottom: 20,
          }}
        >
          We'll pause your account. Your garden will be here whenever you return
          — nothing will be deleted.
        </Text>
        <View
          style={{
            backgroundColor: white,
            borderRadius: 16,
            padding: 13,
            paddingHorizontal: 16,
            borderWidth: 1,
            borderColor: fieldBorder,
            marginBottom: 24,
            flexDirection: "row",
            gap: 9,
          }}
        >
          <Leaf
            size={14}
            strokeWidth={1.75}
            color={sage}
            style={{ marginTop: 2 }}
          />
          <Text
            style={{
              flex: 1,
              fontFamily: fonts.sans,
              fontSize: 13,
              color: warmGray,
              lineHeight: 20,
            }}
          >
            Your relationships and memories are kept safe. Reactivate any time.
          </Text>
        </View>
      </View>
      <View
        style={{
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 44,
          gap: 10,
        }}
      >
        <OutlineBtn label="Deactivate" onPress={onDeactivate} />
        <SageBtn label="Cancel" onPress={onCancel} />
      </View>
    </LinearGradient>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN 12 — Delete Step 1 (Informational)
// ═══════════════════════════════════════════════════════════════════════════

function S12_DeleteStep1({
  onContinue,
  onCancel,
  insets,
}: {
  onContinue: () => void;
  onCancel: () => void;
  insets: Insets;
}) {
  const items = [
    "Your relationships & contact notes",
    "All memories you've captured",
    "Account details & preferences",
  ];

  return (
    <View style={{ flex: 1, backgroundColor: cream }}>
      <NavBar
        right={<CancelBtn onPress={onCancel} />}
        title=""
        insets={insets}
      />
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 28 }}>
        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize: 26,
            color: nearBlack,
            marginBottom: 10,
            lineHeight: 32,
          }}
        >
          Delete your account?
        </Text>
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 14,
            color: warmGray,
            lineHeight: 23,
            marginBottom: 20,
          }}
        >
          This permanently removes your garden, relationships, and all
          associated memories from our servers.
        </Text>

        {/* Download data prompt */}
        <View
          style={{
            backgroundColor: white,
            borderRadius: 16,
            padding: 14,
            paddingHorizontal: 16,
            borderWidth: 1,
            borderColor: fieldBorder,
            marginBottom: 24,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.sans,
              fontSize: 13,
              color: nearBlack,
              marginBottom: 6,
            }}
          >
            Want a copy of your data first?
          </Text>
          <Pressable
            style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
          >
            <Download size={14} strokeWidth={1.75} color={sage} />
            <Text
              style={{
                fontFamily: fonts.sansMedium,
                fontSize: 13,
                color: sage,
              }}
            >
              Download your data first
            </Text>
          </Pressable>
        </View>

        {/* What gets deleted */}
        {items.map((item, i) => (
          <View
            key={i}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              marginBottom: 10,
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: dangerLight,
              }}
            />
            <Text
              style={{ fontFamily: fonts.sans, fontSize: 13, color: warmGray }}
            >
              {item}
            </Text>
          </View>
        ))}
      </View>
      <View
        style={{
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 44,
          gap: 10,
        }}
      >
        <OutlineBtn label="Continue" onPress={onContinue} />
        <SageBtn label="Cancel" onPress={onCancel} />
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN 13 — Delete Step 2 (Confirmation)
// ═══════════════════════════════════════════════════════════════════════════

function S13_DeleteStep2({
  onDelete,
  onCancel,
  insets,
}: {
  onDelete: () => void;
  onCancel: () => void;
  insets: Insets;
}) {
  const [checked, setChecked] = useState(false);
  const [password, setPassword] = useState("");

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: cream }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <NavBar
        right={<CancelBtn onPress={onCancel} />}
        title=""
        insets={insets}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 28 }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize: 26,
            color: nearBlack,
            marginBottom: 10,
            lineHeight: 32,
          }}
        >
          This can't be undone.
        </Text>
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 14,
            color: warmGray,
            lineHeight: 23,
            marginBottom: 28,
          }}
        >
          Please confirm you understand what this means before continuing.
        </Text>

        {/* Checkbox */}
        <Pressable
          onPress={() => setChecked((c) => !c)}
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 7,
              backgroundColor: checked ? dangerPale : white,
              borderWidth: 1.5,
              borderColor: checked ? dangerLight : "#E8E0D6",
              alignItems: "center",
              justifyContent: "center",
              marginTop: 2,
            }}
          >
            {checked && (
              <Check size={13} strokeWidth={2.5} color={dangerRed} />
            )}
          </View>
          <Text
            style={{
              flex: 1,
              fontFamily: fonts.sans,
              fontSize: 14,
              color: nearBlack,
              lineHeight: 22,
            }}
          >
            I understand this is permanent and my garden cannot be recovered.
          </Text>
        </Pressable>

        {/* Password field */}
        <FormField
          label="Confirm your password"
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your password"
          type="password"
          icon={Lock}
        />

        {/* SSO note */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 8,
            padding: 10,
            paddingHorizontal: 14,
            backgroundColor: "#F9F5F0",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: fieldBorder,
            marginTop: 4,
          }}
        >
          <Shield
            size={13}
            strokeWidth={1.75}
            color={warmGray}
            style={{ marginTop: 2 }}
          />
          <Text
            style={{
              flex: 1,
              fontFamily: fonts.sans,
              fontSize: 12,
              color: warmGray,
              lineHeight: 20,
            }}
          >
            Apple and Google users may be asked to verify their account.
          </Text>
        </View>
      </ScrollView>
      <View
        style={{
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 44,
          gap: 10,
        }}
      >
        <WarmDangerBtn
          label="Delete my account"
          onPress={onDelete}
          disabled={!checked}
        />
        <OutlineBtn label="Cancel" onPress={onCancel} />
      </View>
    </KeyboardAvoidingView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN 14 — Delete Confirmed
// ═══════════════════════════════════════════════════════════════════════════

function S14_DeleteConfirmed({
  onDone,
  insets,
}: {
  onDone: () => void;
  insets: Insets;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: cream }}>
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 28,
          paddingBottom: 40,
          paddingTop: insets.top,
        }}
      >
        <FadingGardenIllustration size={208} />
        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize: 28,
            color: nearBlack,
            textAlign: "center",
            lineHeight: 34,
            marginTop: 16,
            marginBottom: 10,
          }}
        >
          Your garden has{"\n"}been removed.
        </Text>
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 14,
            color: warmGray,
            textAlign: "center",
            lineHeight: 23,
            marginBottom: 36,
            maxWidth: 270,
          }}
        >
          Thank you for spending time with Kinship. We hope to see you again.
        </Text>
        <View style={{ width: "100%" }}>
          <SageBtn label="Done" onPress={onDone} />
        </View>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN 15 — Privacy & Data
// ═══════════════════════════════════════════════════════════════════════════

function S15_PrivacyData({
  goExport,
  goDelete,
  onBack,
  insets,
}: {
  goExport: () => void;
  goDelete: () => void;
  onBack: () => void;
  insets: Insets;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: settingsBg }}>
      <NavBar
        left={<BackBtn onPress={onBack} />}
        title="Privacy & Data"
        insets={insets}
      />

      <View style={{ marginHorizontal: 14, marginTop: 16 }}>
        <View
          style={{
            backgroundColor: white,
            borderRadius: 18,
            overflow: "hidden",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 4,
            elevation: 1,
          }}
        >
          <SettingsRow
            icon={Download}
            label="Export Data"
            onPress={goExport}
          />
          <SettingsRow icon={Shield} label="Privacy Policy" />
          <SettingsRow
            icon={AlertCircle}
            label="Terms of Service"
            last
          />
        </View>
      </View>

      <View style={{ marginHorizontal: 14, marginTop: 14 }}>
        <SectionLabel label="Data removal" />
        <View
          style={{
            backgroundColor: white,
            borderRadius: 18,
            overflow: "hidden",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 4,
            elevation: 1,
          }}
        >
          <SettingsRow
            icon={Trash2}
            label="Delete Account"
            iconBg={dangerPale}
            iconColor={dangerRed}
            labelColor={dangerRed}
            chevronColor={dangerLight}
            onPress={goDelete}
            last
          />
        </View>
      </View>

      {/* Privacy summary */}
      <View
        style={{
          marginHorizontal: 14,
          marginTop: 14,
          padding: 13,
          paddingHorizontal: 16,
          backgroundColor: sagePale,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: sageLight + "33",
        }}
      >
        <View style={{ flexDirection: "row", gap: 9 }}>
          <Leaf
            size={14}
            strokeWidth={1.75}
            color={sageDark}
            style={{ marginTop: 2 }}
          />
          <Text
            style={{
              flex: 1,
              fontFamily: fonts.sans,
              fontSize: 12,
              color: warmGray,
              lineHeight: 19,
            }}
          >
            KinshipGarden never sells your data. Your relationships stay yours.
          </Text>
        </View>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN 16 — Export Data
// ═══════════════════════════════════════════════════════════════════════════

function S16_ExportData({
  onDownload,
  onCancel,
  insets,
}: {
  onDownload: () => void;
  onCancel: () => void;
  insets: Insets;
}) {
  const items = [
    "Your relationship list & notes",
    "Memory entries & timestamps",
    "Cadence preferences & settings",
    "Weekly intention history",
  ];

  return (
    <View style={{ flex: 1, backgroundColor: cream }}>
      <NavBar
        left={<CancelBtn onPress={onCancel} />}
        title="Export your garden"
        insets={insets}
      />
      <View style={{ flex: 1, paddingHorizontal: 22, paddingTop: 24 }}>
        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize: 26,
            color: nearBlack,
            marginBottom: 10,
            lineHeight: 32,
          }}
        >
          Export your garden
        </Text>
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 14,
            color: warmGray,
            lineHeight: 23,
            marginBottom: 24,
          }}
        >
          Download a complete copy of your data in JSON format — readable by you
          and any app you choose.
        </Text>

        {items.map((item, i) => (
          <View
            key={i}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              padding: 10,
              paddingHorizontal: 14,
              backgroundColor: white,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: fieldBorder,
              marginBottom: 9,
            }}
          >
            <Check size={14} strokeWidth={2.5} color={sage} />
            <Text
              style={{
                fontFamily: fonts.sans,
                fontSize: 13,
                color: nearBlack,
              }}
            >
              {item}
            </Text>
          </View>
        ))}

        <View
          style={{
            flexDirection: "row",
            gap: 9,
            padding: 11,
            paddingHorizontal: 14,
            backgroundColor: sagePale,
            borderRadius: 12,
            marginTop: 6,
          }}
        >
          <Shield
            size={13}
            strokeWidth={1.75}
            color={sageDark}
            style={{ marginTop: 2 }}
          />
          <Text
            style={{
              flex: 1,
              fontFamily: fonts.sans,
              fontSize: 12,
              color: warmGray,
              lineHeight: 19,
            }}
          >
            Your export is generated on-device. We never see the contents.
          </Text>
        </View>
      </View>
      <View
        style={{
          paddingHorizontal: 22,
          paddingBottom: insets.bottom + 44,
          gap: 10,
        }}
      >
        <SageBtn label="Download JSON" onPress={onDownload} />
        <OutlineBtn label="Cancel" onPress={onCancel} />
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN 17 — Restore Your Garden (Reinstall)
// ═══════════════════════════════════════════════════════════════════════════

function S17_RestoreGarden({
  onApple,
  onGoogle,
  onEmail,
  onFresh,
  insets,
}: {
  onApple: () => void;
  onGoogle: () => void;
  onEmail: () => void;
  onFresh: () => void;
  insets: Insets;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: cream }}>
      <View style={{ paddingTop: insets.top + 16, alignItems: "center" }}>
        <GardenRevealIllustration size={168} />
      </View>

      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 12 }}>
        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize: 26,
            color: nearBlack,
            marginBottom: 8,
            lineHeight: 32,
          }}
        >
          Restore your garden?
        </Text>
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 13,
            color: warmGray,
            lineHeight: 21,
            marginBottom: 22,
          }}
        >
          If you previously created an account, you can restore your
          relationships and memories.
        </Text>

        <View style={{ gap: 10 }}>
          <AuthSocialBtn platform="apple" onPress={onApple} />
          <AuthSocialBtn platform="google" onPress={onGoogle} />
          <AuthSocialBtn platform="email" onPress={onEmail} />
        </View>

        <View
          style={{
            height: 1,
            backgroundColor: fieldBorder,
            marginVertical: 14,
          }}
        />

        <Pressable
          onPress={onFresh}
          style={{
            width: "100%",
            backgroundColor: sagePale,
            borderWidth: 1,
            borderColor: sageLight,
            borderRadius: 16,
            paddingVertical: 14,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontFamily: fonts.sansMedium,
              fontSize: 14,
              color: sageDark,
            }}
          >
            {"\uD83C\uDF31"} Start fresh
          </Text>
        </Pressable>
      </View>

      <View
        style={{
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 32,
          paddingTop: 14,
        }}
      >
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 11,
            color: "#A8A29E",
            textAlign: "center",
            lineHeight: 18,
          }}
        >
          We never access your messages or contacts.{"\n"}Your garden, your
          data.
        </Text>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN — Account & Privacy Router
// ═══════════════════════════════════════════════════════════════════════════

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const { user, signOut, isAuthenticated } = useAuth();

  const screenInsets: Insets = {
    top: insets.top,
    bottom: insets.bottom,
  };

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/profile");
    }
  }, []);

  switch (step) {
    // Auth flow (signed out)
    case 0:
      return (
        <S1_SaveGarden
          insets={screenInsets}
          onApple={() => setStep(7)}
          onGoogle={() => setStep(7)}
          onEmail={() => setStep(1)}
          onBack={goBack}
        />
      );
    case 1:
      return (
        <S2_EnterEmail
          insets={screenInsets}
          email={email}
          setEmail={setEmail}
          onContinue={() => setStep(3)}
          onSignIn={() => setStep(4)}
          onBack={() => setStep(0)}
        />
      );
    // Case 2 is email validation (pass-through in prototype)
    case 3:
      return (
        <S4_CreatePassword
          insets={screenInsets}
          onCreate={() => setStep(7)}
          onBack={() => setStep(1)}
        />
      );
    case 4:
      return (
        <S5_SignIn
          insets={screenInsets}
          email={email}
          onSignIn={() => setStep(7)}
          onForgot={() => setStep(5)}
          onBack={() => setStep(0)}
        />
      );
    case 5:
      return (
        <S6_ForgotPassword
          insets={screenInsets}
          email={email}
          onSend={() => setStep(6)}
          onBack={() => setStep(4)}
        />
      );
    case 6:
      return (
        <S7_CheckInbox
          insets={screenInsets}
          email={email}
          onDone={() => setStep(4)}
        />
      );

    // Account signed-in
    case 7:
      return (
        <S8_AccountSignedIn
          insets={screenInsets}
          email={user?.email || email || "amara@example.com"}
          onLogOut={() => setStep(8)}
          onSwitch={() => setStep(9)}
          onDeactivate={() => setStep(10)}
          onDelete={() => setStep(11)}
          onBack={goBack}
        />
      );

    // Modals & destructive flows
    case 8:
      return (
        <S9_LogOutModal
          insets={screenInsets}
          onConfirm={async () => {
            try {
              await signOut();
            } catch {
              // Proceed even if signOut fails
            }
            router.replace("/(auth)/login");
          }}
          onCancel={() => setStep(7)}
        />
      );
    case 9:
      return (
        <S10_SwitchAccount
          insets={screenInsets}
          onContinue={() => setStep(7)}
          onCancel={() => setStep(7)}
        />
      );
    case 10:
      return (
        <S11_Deactivate
          insets={screenInsets}
          onDeactivate={() => setStep(0)}
          onCancel={() => setStep(7)}
        />
      );
    case 11:
      return (
        <S12_DeleteStep1
          insets={screenInsets}
          onContinue={() => setStep(12)}
          onCancel={() => setStep(7)}
        />
      );
    case 12:
      return (
        <S13_DeleteStep2
          insets={screenInsets}
          onDelete={() => setStep(13)}
          onCancel={() => setStep(11)}
        />
      );
    case 13:
      return (
        <S14_DeleteConfirmed
          insets={screenInsets}
          onDone={goBack}
        />
      );

    // Privacy & Data
    case 14:
      return (
        <S15_PrivacyData
          insets={screenInsets}
          goExport={() => setStep(15)}
          goDelete={() => setStep(11)}
          onBack={goBack}
        />
      );
    case 15:
      return (
        <S16_ExportData
          insets={screenInsets}
          onDownload={() => setStep(14)}
          onCancel={() => setStep(14)}
        />
      );

    // Restore (reinstall)
    case 16:
      return (
        <S17_RestoreGarden
          insets={screenInsets}
          onApple={() => setStep(7)}
          onGoogle={() => setStep(7)}
          onEmail={() => setStep(1)}
          onFresh={goBack}
        />
      );

    default:
      return null;
  }
}
