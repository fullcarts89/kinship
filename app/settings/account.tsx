/**
 * Account — Settings route
 *
 * Who you're signed in as, and the account actions that actually exist:
 * log out, and delete account (handed to the real deletion flow in
 * Privacy & Data). Signing in and creating an account happen on the login
 * screen.
 *
 * Demo mode (Supabase not configured) has no account, and says so.
 */
import React, { useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  LogOut,
  Trash2,
  Shield,
  Leaf,
  ChevronRight,
} from "lucide-react-native";
import { colors, fonts } from "@design/tokens";
import { useAuth } from "@/providers";
import { isSupabaseConfigured } from "@/lib/supabase";

// ─── Design Tokens (local) ──────────────────────────────────────────────────

const sage = colors.sage;
const sageDark = colors.moss;
const sagePale = colors.sagePale;
const sageLight = colors.sageLight;
const nearBlack = colors.nearBlack;
const warmGray = colors.warmGray;
const white = colors.white;
const dangerRed = colors.error;
const dangerPale = colors.errorPale;
const dangerLight = colors.errorLight;
const settingsBg = "#F5F0EC";
const chevronMuted = "#D4CFC8";

const cardShadow = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.04,
  shadowRadius: 4,
  elevation: 1,
} as const;

// ─── Insets Type ─────────────────────────────────────────────────────────────

type Insets = { top: number; bottom: number };

// ─── Shared Primitives ──────────────────────────────────────────────────────

function NavBar({ onBack, insets }: { onBack: () => void; insets: Insets }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: insets.top + 14,
        paddingHorizontal: 20,
        minHeight: 52,
      }}
    >
      <View style={{ minWidth: 64, alignItems: "flex-start" }}>
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
      <Text
        style={{
          fontFamily: fonts.serif,
          fontSize: 17,
          color: nearBlack,
          textAlign: "center",
          flex: 1,
        }}
      >
        Account
      </Text>
      <View style={{ minWidth: 64 }} />
    </View>
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
      style={{ width: "100%", borderRadius: 18, overflow: "hidden" }}
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
        paddingVertical: 13,
        borderRadius: 18,
        borderWidth: 1.5,
        borderColor: "#E8E0D6",
        alignItems: "center",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <Text style={{ fontFamily: fonts.sansMedium, fontSize: 14, color: warmGray }}>
        {label}
      </Text>
    </Pressable>
  );
}

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
      <Text style={{ flex: 1, fontFamily: fonts.sans, fontSize: 14, color: labelColor }}>
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

function NoteCard({ children }: { children: React.ReactNode }) {
  return (
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
        flexDirection: "row",
        gap: 9,
      }}
    >
      <Leaf size={14} strokeWidth={1.75} color={sageDark} style={{ marginTop: 2 }} />
      <Text style={{ flex: 1, fontFamily: fonts.sans, fontSize: 12, color: warmGray, lineHeight: 19 }}>
        {children}
      </Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Signed in
// ═══════════════════════════════════════════════════════════════════════════

function SignedInScreen({
  email,
  onLogOut,
  onDelete,
  onBack,
  insets,
}: {
  email: string | null;
  onLogOut: () => void;
  onDelete: () => void;
  onBack: () => void;
  insets: Insets;
}) {
  const initials = (email ?? "K").substring(0, 2).toUpperCase();

  return (
    <View style={{ flex: 1, backgroundColor: settingsBg }}>
      <NavBar onBack={onBack} insets={insets} />

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
            ...cardShadow,
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
            <Text style={{ fontFamily: fonts.serif, fontSize: 18, color: white }}>
              {initials}
            </Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.sans, fontSize: 11, color: warmGray, marginBottom: 2 }}>
              Signed in as
            </Text>
            <Text
              style={{ fontFamily: fonts.sansMedium, fontSize: 14, color: nearBlack }}
              numberOfLines={1}
            >
              {email ?? "your Kinship account"}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={{ marginHorizontal: 14, marginTop: 14 }}>
          <View style={{ backgroundColor: white, borderRadius: 18, overflow: "hidden", ...cardShadow }}>
            <SettingsRow icon={LogOut} label="Log out" onPress={onLogOut} last />
          </View>
        </View>

        {/* Danger zone */}
        <View style={{ marginHorizontal: 14, marginTop: 14 }}>
          <SectionLabel label="Danger zone" />
          <View style={{ backgroundColor: white, borderRadius: 18, overflow: "hidden", ...cardShadow }}>
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

        <NoteCard>
          Your garden is saved to your account, so you can sign back in on any
          device.
        </NoteCard>
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Log out confirmation (bottom sheet)
// ═══════════════════════════════════════════════════════════════════════════

function LogOutSheet({
  isSigningOut,
  onConfirm,
  onCancel,
  insets,
}: {
  isSigningOut: boolean;
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
      <Pressable style={{ flex: 1 }} onPress={isSigningOut ? undefined : onCancel} />
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
        <View style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 48 }}>
          <Text style={{ fontFamily: fonts.serif, fontSize: 26, color: nearBlack, marginBottom: 10 }}>
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
            Your garden stays safe in your account. Kinship will clear it from
            this device until you sign back in.
          </Text>
          <View style={{ gap: 10 }}>
            <OutlineBtn
              label={isSigningOut ? "Logging out…" : "Log out"}
              onPress={onConfirm}
              disabled={isSigningOut}
            />
            <SageBtn label="Cancel" onPress={onCancel} disabled={isSigningOut} />
          </View>
        </View>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Signed out / demo mode
// ═══════════════════════════════════════════════════════════════════════════

function NoAccountScreen({
  title,
  body,
  action,
  onBack,
  insets,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
  onBack: () => void;
  insets: Insets;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: settingsBg }}>
      <NavBar onBack={onBack} insets={insets} />
      <View style={{ paddingHorizontal: 24, paddingTop: 24 }}>
        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize: 26,
            color: nearBlack,
            marginBottom: 10,
            lineHeight: 32,
          }}
        >
          {title}
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
          {body}
        </Text>
        {action}
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut, isAuthenticated } = useAuth();
  const [confirmingLogOut, setConfirmingLogOut] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

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

  const handleLogOut = useCallback(async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } catch {
      // Still signed in (usually offline) — never pretend otherwise.
      setIsSigningOut(false);
      Alert.alert(
        "Couldn't log out",
        "You're still signed in. Check your connection and try again."
      );
      return;
    }
    // Session ended and this device's copy of the garden is wiped.
    router.replace("/(auth)/login");
  }, [signOut]);

  const handleDelete = useCallback(() => {
    router.push({ pathname: "/settings/privacy", params: { start: "delete" } });
  }, []);

  if (!isSupabaseConfigured) {
    return (
      <NoAccountScreen
        insets={screenInsets}
        onBack={goBack}
        title="No account on this device"
        body="Kinship is running in demo mode, so there's no account to sign in to. Your garden is stored only on this device — you can export or remove it from Privacy & Data."
        action={
          <View style={{ backgroundColor: white, borderRadius: 18, overflow: "hidden", ...cardShadow }}>
            <SettingsRow
              icon={Shield}
              label="Privacy & Data"
              onPress={() => router.push("/settings/privacy")}
              last
            />
          </View>
        }
      />
    );
  }

  // Keep the sheet up while signing out so it doesn't flash "signed out".
  if (confirmingLogOut || isSigningOut) {
    return (
      <LogOutSheet
        insets={screenInsets}
        isSigningOut={isSigningOut}
        onConfirm={handleLogOut}
        onCancel={() => setConfirmingLogOut(false)}
      />
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <NoAccountScreen
        insets={screenInsets}
        onBack={goBack}
        title="You're signed out"
        body="Sign in to get back to your garden."
        action={
          <SageBtn label="Sign in" onPress={() => router.replace("/(auth)/login")} />
        }
      />
    );
  }

  return (
    <SignedInScreen
      insets={screenInsets}
      email={user.email ?? null}
      onLogOut={() => setConfirmingLogOut(true)}
      onDelete={handleDelete}
      onBack={goBack}
    />
  );
}
