import React, { useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView, Linking } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  User,
  Bell,
  Shield,
  Settings,
  Info,
  Calendar,
  RotateCcw,
  ChevronRight,
} from "lucide-react-native";
import { colors, fonts } from "@design/tokens";
import {
  checkCalendarPermission,
  type CalendarPermissionStatus,
} from "@/lib/calendarEngine";
import { useOrientation } from "@/hooks";

// ─── Design Tokens ──────────────────────────────────────────────────────────

const settingsBg = "#F5F0EC";

// ─── Section Label ──────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <Text
      style={{
        fontFamily: fonts.sansSemiBold,
        fontSize: 11,
        color: colors.warmGray,
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

// ─── Settings Row ───────────────────────────────────────────────────────────

function SettingsRow({
  icon: Icon,
  label,
  last = false,
  onPress,
  rightElement,
}: {
  icon: any;
  label: string;
  last?: boolean;
  onPress?: () => void;
  rightElement?: React.ReactNode;
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
        backgroundColor: colors.white,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: "#F5F0EC",
      }}
    >
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 9,
          backgroundColor: colors.sagePale,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={15} strokeWidth={1.75} color={colors.moss} />
      </View>
      <Text
        style={{
          flex: 1,
          fontFamily: fonts.sans,
          fontSize: 14,
          color: colors.nearBlack,
        }}
      >
        {label}
      </Text>
      {rightElement ?? <ChevronRight size={15} strokeWidth={2} color="#D4CFC8" />}
    </Pressable>
  );
}

// ─── Settings Screen ────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();

  const { reset: resetOrientation } = useOrientation();

  // Calendar permission status — refreshes each time Settings gains focus
  const [calendarStatus, setCalendarStatus] =
    useState<CalendarPermissionStatus>("undetermined");

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const status = await checkCalendarPermission();
          if (!cancelled) setCalendarStatus(status);
        } catch {
          // expo-calendar unavailable — leave as undetermined
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  return (
    <View style={{ flex: 1, backgroundColor: settingsBg }}>
      {/* Safe area + back nav */}
      <View style={{ paddingTop: insets.top }}>
        <Pressable
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(tabs)/profile");
            }
          }}
          hitSlop={12}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingHorizontal: 20,
            paddingTop: 14,
            paddingBottom: 4,
          }}
        >
          <ArrowLeft size={16} strokeWidth={2} color={colors.sage} />
          <Text
            style={{
              fontFamily: fonts.sans,
              fontSize: 14,
              color: colors.sage,
            }}
          >
            Back
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14 }}>
          <Text
            style={{
              fontFamily: fonts.serif,
              fontSize: 32,
              color: colors.nearBlack,
            }}
          >
            Settings
          </Text>
        </View>

        {/* Account section */}
        <View style={{ marginHorizontal: 14, marginBottom: 14 }}>
          <SectionLabel label="Account" />
          <View
            style={{
              backgroundColor: colors.white,
              borderRadius: 18,
              overflow: "hidden",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 4,
              elevation: 1,
            }}
          >
            <SettingsRow icon={User} label="Profile" last />
          </View>
        </View>

        {/* App section */}
        <View style={{ marginHorizontal: 14, marginBottom: 14 }}>
          <SectionLabel label="App" />
          <View
            style={{
              backgroundColor: colors.white,
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
              icon={Bell}
              label="Notifications"
              onPress={() => router.push("/settings/notifications")}
            />
            <SettingsRow
              icon={Shield}
              label="Privacy & Data"
              onPress={() => router.push("/settings/privacy")}
            />
            <SettingsRow
              icon={Calendar}
              label="Calendar"
              onPress={() => Linking.openSettings()}
              rightElement={
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor:
                        calendarStatus === "granted"
                          ? colors.sage
                          : colors.warmGray,
                    }}
                  />
                  <Text
                    style={{
                      fontFamily: fonts.sans,
                      fontSize: 13,
                      color:
                        calendarStatus === "granted"
                          ? colors.sage
                          : colors.warmGray,
                    }}
                  >
                    {calendarStatus === "granted"
                      ? "Connected"
                      : "Not connected"}
                  </Text>
                  <ChevronRight size={15} strokeWidth={2} color="#D4CFC8" />
                </View>
              }
            />
            <SettingsRow
              icon={Settings}
              label="Account"
              onPress={() => router.push("/settings/account")}
            />
            <SettingsRow
              icon={RotateCcw}
              label="Replay orientation"
              onPress={async () => {
                await resetOrientation();
                router.replace("/(tabs)");
              }}
              last
            />
          </View>
        </View>

        {/* Info section */}
        <View style={{ marginHorizontal: 14 }}>
          <SectionLabel label="Info" />
          <View
            style={{
              backgroundColor: colors.white,
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
              icon={Info}
              label="About"
              onPress={() => router.push("/settings/about")}
              last
            />
          </View>
        </View>

        {/* Footer */}
        <View style={{ paddingTop: 32, paddingBottom: 36, alignItems: "center" }}>
          <Text
            style={{
              fontFamily: fonts.sans,
              fontSize: 12,
              color: colors.warmGray,
            }}
          >
            KinshipGarden · v1.0.0
          </Text>
          <Text
            style={{
              fontFamily: fonts.serif,
              fontSize: 13,
              color: colors.sageLight,
              marginTop: 4,
            }}
          >
            {"\uD83C\uDF3F"} Grow with intention.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
