/**
 * Account
 *
 * Who is signed in, sign out, and delete the account. Replaces a prototype
 * whose sign-in, password, "take a break" and delete flows only changed
 * screens (P0-04). Deletion goes to the one real flow in Privacy & Data,
 * which deletes server data and the sign-in before saying so (P0-05/06).
 */

import React, { useCallback, useState } from "react";
import { View, Text, Pressable, ScrollView, Alert } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, LogOut, Trash2, User } from "lucide-react-native";
import { colors, fonts } from "@design/tokens";
import { useAuth } from "@/providers";

const sage = colors.sage;
const nearBlack = colors.nearBlack;
const warmGray = colors.warmGray;
const white = colors.white;
const dangerRed = colors.error;
const settingsBg = "#F5F0EC";

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/settings");
  }, []);

  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    try {
      await signOut();
      router.replace("/");
    } catch {
      Alert.alert("Couldn't sign out", "Check your connection and try again.");
    } finally {
      setSigningOut(false);
    }
  }, [signOut]);

  const provider = (user?.app_metadata?.provider as string | undefined) ?? null;
  const signedInWith =
    provider === "apple" ? "Apple" : provider === "google" ? "Google" : provider === "email" ? "Email" : null;

  return (
    <View style={{ flex: 1, backgroundColor: settingsBg }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingTop: insets.top + 14,
          paddingHorizontal: 20,
          minHeight: 52,
        }}
      >
        <Pressable
          onPress={goBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={{ flexDirection: "row", alignItems: "center", gap: 4, minWidth: 64 }}
        >
          <ArrowLeft size={16} strokeWidth={2} color={sage} />
          <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: sage }}>Back</Text>
        </Pressable>
        <Text
          style={{ flex: 1, textAlign: "center", fontFamily: fonts.serif, fontSize: 17, color: nearBlack }}
          accessibilityRole="header"
        >
          Account
        </Text>
        <View style={{ minWidth: 64 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 40, gap: 14 }}>
        <View style={{ backgroundColor: white, borderRadius: 18, padding: 18, flexDirection: "row", gap: 13, alignItems: "center" }}>
          <User size={18} strokeWidth={1.75} color={warmGray} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: warmGray }}>Signed in as</Text>
            <Text style={{ fontFamily: fonts.sans, fontSize: 15, color: nearBlack, marginTop: 2 }}>
              {user?.email ?? "Your account"}
            </Text>
            {signedInWith ? (
              <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: warmGray, marginTop: 2 }}>
                {`With ${signedInWith}`}
              </Text>
            ) : null}
          </View>
        </View>

        <Pressable
          onPress={handleSignOut}
          disabled={signingOut}
          accessibilityRole="button"
          style={{ backgroundColor: white, borderRadius: 18, padding: 18, flexDirection: "row", gap: 13, alignItems: "center" }}
        >
          <LogOut size={18} strokeWidth={1.75} color={nearBlack} />
          <Text style={{ flex: 1, fontFamily: fonts.sans, fontSize: 15, color: nearBlack }}>
            {signingOut ? "Signing out…" : "Sign out"}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.push({ pathname: "/settings/privacy", params: { step: "delete" } })}
          accessibilityRole="button"
          style={{ backgroundColor: white, borderRadius: 18, padding: 18, flexDirection: "row", gap: 13, alignItems: "center" }}
        >
          <Trash2 size={18} strokeWidth={1.75} color={dangerRed} />
          <Text style={{ flex: 1, fontFamily: fonts.sans, fontSize: 15, color: dangerRed }}>Delete account</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
