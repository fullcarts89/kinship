/**
 * Profile Tab
 *
 * Your gardener's profile — warm, personal, never clinical.
 *
 * Sections:
 * 1. Avatar with PlantRing + gardener level
 * 2. Garden Overview stats (connections, memories, days growing)
 * 3. Settings menu (Account, Notifications, Privacy, About, Sign Out)
 *
 * Tone: Calm, personal, "your corner of the garden"
 */

import React, { useMemo, useCallback } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Settings,
  Bell,
  Shield,
  Info,
  LogOut,
  ChevronRight,
  Heart,
} from "lucide-react-native";
import { colors, fonts } from "@design/tokens";
import { FadeIn } from "@/components/ui";
import { usePersons, useMemories } from "@/hooks";
import { useAuth } from "@/providers";
import {
  PlantRingIllustration,
  FlourishingGardenIllustration,
} from "@/components/illustrations";
import { getGardenWalkPreferences } from "@/lib/notificationEngine";

// ─── Design tokens (local) ──────────────────────────────────────────────────

const sage = colors.sage;
const sagePale = colors.sagePale;
const sageLight = colors.sageLight;
const moss = colors.moss;
const cream = colors.cream;
const nearBlack = colors.nearBlack;
const warmGray = colors.warmGray;
const white = colors.white;
const borderClr = colors.border;

// ─── Stat Card ──────────────────────────────────────────────────────────────

function StatCard({
  emoji,
  value,
  label,
}: {
  emoji: string;
  value: string | number;
  label: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: white,
        borderRadius: 18,
        padding: 16,
        alignItems: "center",
        borderWidth: 1,
        borderColor: borderClr,
      }}
    >
      <Text style={{ fontSize: 22, marginBottom: 6 }}>{emoji}</Text>
      <Text
        style={{
          fontFamily: fonts.serif,
          fontSize: 24,
          color: nearBlack,
          marginBottom: 2,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontFamily: fonts.sans,
          fontSize: 12,
          color: warmGray,
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

// ─── Settings Row ────────────────────────────────────────────────────────────

function SettingsRow({
  icon,
  label,
  onPress,
  color = nearBlack,
  showChevron = true,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  color?: string;
  showChevron?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 16,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: borderClr,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: sagePale,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 14,
        }}
      >
        {icon}
      </View>
      <Text
        style={{
          flex: 1,
          fontFamily: fonts.sansMedium,
          fontSize: 15,
          color,
        }}
      >
        {label}
      </Text>
      {showChevron && (
        <ChevronRight color={warmGray} size={18} strokeWidth={2} />
      )}
    </Pressable>
  );
}

// ─── Day / Time helpers ─────────────────────────────────────────────────────

const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatTime12h(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
}

// ─── Garden Walk Card ───────────────────────────────────────────────────────

function GardenWalkCard() {
  const prefs = getGardenWalkPreferences();
  const dayLabel = DAY_NAMES_SHORT[prefs.dayOfWeek] ?? "Sun";
  const timeLabel = formatTime12h(prefs.timeOfDay);

  return (
    <Pressable
      onPress={() => router.push("/settings/notifications")}
      style={{
        backgroundColor: white,
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: borderClr,
        marginBottom: 28,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
        <FlourishingGardenIllustration size={56} />
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text
            style={{
              fontFamily: fonts.serif,
              fontSize: 17,
              color: nearBlack,
              marginBottom: 2,
            }}
          >
            Garden Walk
          </Text>
          <Text
            style={{
              fontFamily: fonts.sans,
              fontSize: 13,
              color: warmGray,
              lineHeight: 18,
            }}
          >
            Your weekly moment to revisit{"\n"}memories and nurture connections
          </Text>
        </View>
      </View>

      {/* Schedule display */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <View
          style={{
            backgroundColor: sagePale,
            borderRadius: 10,
            paddingVertical: 6,
            paddingHorizontal: 12,
            borderWidth: 1,
            borderColor: sageLight,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.sansSemiBold,
              fontSize: 14,
              color: moss,
            }}
          >
            {prefs.enabled ? `${dayLabel}s at ${timeLabel}` : "Paused"}
          </Text>
        </View>

        <View style={{ flex: 1 }} />

        <Text
          style={{
            fontFamily: fonts.sansMedium,
            fontSize: 13,
            color: sage,
          }}
        >
          Edit
        </Text>
        <ChevronRight color={sage} size={14} strokeWidth={2.5} />
      </View>
    </Pressable>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { persons, refetch: refetchPersons } = usePersons();
  const { memories, refetch: refetchMemories } = useMemories();
  const { signOut } = useAuth();

  // Refetch on tab focus so stats stay current
  useFocusEffect(
    useCallback(() => {
      refetchPersons();
      refetchMemories();
    }, [refetchPersons, refetchMemories])
  );

  // Calculate days since first person was added
  const daysGrowing = useMemo(() => {
    if (persons.length === 0) return 0;
    const earliest = persons.reduce((a, b) =>
      new Date(a.created_at) < new Date(b.created_at) ? a : b
    );
    return Math.max(
      1,
      Math.floor(
        (Date.now() - new Date(earliest.created_at).getTime()) / 86400000
      )
    );
  }, [persons]);

  // Garden growth phrase
  const gardenLevel = useMemo(() => {
    const total = persons.length + memories.length;
    if (total === 0) return { label: "New Gardener", emoji: "\uD83C\uDF31" };
    if (total <= 5) return { label: "Budding Gardener", emoji: "\uD83C\uDF3F" };
    if (total <= 15) return { label: "Growing Gardener", emoji: "\uD83C\uDF3B" };
    if (total <= 30) return { label: "Flourishing Gardener", emoji: "\uD83C\uDF33" };
    return { label: "Master Gardener", emoji: "\uD83C\uDFE1" };
  }, [persons.length, memories.length]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: cream }}
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 40,
        paddingHorizontal: 24,
      }}
      showsVerticalScrollIndicator={false}
    >
      <FadeIn>
        {/* ─── Header ──────────────────────────────────────────── */}
        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize: 28,
            color: nearBlack,
            marginBottom: 24,
          }}
        >
          Your profile
        </Text>

        {/* ─── Avatar + Name ───────────────────────────────────── */}
        <View style={{ alignItems: "center", marginBottom: 28 }}>
          {/* Plant ring avatar */}
          <View
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: sagePale,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14,
              borderWidth: 2,
              borderColor: sageLight,
            }}
          >
            <PlantRingIllustration size={90} />
          </View>

          {/* Gardener title pill */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingVertical: 5,
              paddingHorizontal: 14,
              backgroundColor: sagePale,
              borderRadius: 100,
              borderWidth: 1,
              borderColor: sageLight,
              marginBottom: 6,
            }}
          >
            <Text style={{ fontSize: 14 }}>{gardenLevel.emoji}</Text>
            <Text
              style={{
                fontFamily: fonts.sansMedium,
                fontSize: 13,
                color: moss,
              }}
            >
              {gardenLevel.label}
            </Text>
          </View>

          <Text
            style={{
              fontFamily: fonts.sans,
              fontSize: 13,
              color: warmGray,
              textAlign: "center",
            }}
          >
            Tending your garden with care
          </Text>
        </View>

        {/* ─── Garden Overview Stats ───────────────────────────── */}
        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize: 18,
            color: nearBlack,
            marginBottom: 12,
          }}
        >
          Your garden at a glance
        </Text>

        <View
          style={{
            flexDirection: "row",
            gap: 10,
            marginBottom: 28,
          }}
        >
          <StatCard
            emoji={"\uD83C\uDF31"}
            value={persons.length}
            label={persons.length === 1 ? "Connection" : "Connections"}
          />
          <StatCard
            emoji={"\uD83D\uDCF8"}
            value={memories.length}
            label={memories.length === 1 ? "Memory" : "Memories"}
          />
          <StatCard
            emoji={"\u2600\uFE0F"}
            value={daysGrowing}
            label={daysGrowing === 1 ? "Day growing" : "Days growing"}
          />
        </View>

        {/* ─── Garden Walk Card ────────────────────────────────── */}
        <GardenWalkCard />

        {/* ─── Settings ────────────────────────────────────────── */}
        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize: 18,
            color: nearBlack,
            marginBottom: 4,
          }}
        >
          Settings
        </Text>

        <View style={{ marginBottom: 20 }}>
          <SettingsRow
            icon={<Settings color={sage} size={18} strokeWidth={2} />}
            label="Account"
            onPress={() => router.push("/settings")}
          />
          <SettingsRow
            icon={<Bell color={sage} size={18} strokeWidth={2} />}
            label="Notifications"
            onPress={() => router.push("/settings/notifications")}
          />
          <SettingsRow
            icon={<Shield color={sage} size={18} strokeWidth={2} />}
            label="Privacy"
            onPress={() => router.push("/settings/privacy")}
          />
          <SettingsRow
            icon={<Heart color={sage} size={18} strokeWidth={2} />}
            label="About Kinship"
            onPress={() => router.push("/settings/about")}
          />
          <SettingsRow
            icon={
              <LogOut color={colors.terracotta} size={18} strokeWidth={2} />
            }
            label="Sign out"
            color={colors.terracotta}
            showChevron={false}
            onPress={async () => {
              try {
                await signOut();
              } catch {
                // Proceed to login even if signOut fails
              }
              router.replace("/(auth)/login");
            }}
          />
        </View>

        {/* ─── Footer ──────────────────────────────────────────── */}
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 12,
            color: warmGray,
            textAlign: "center",
            opacity: 0.6,
            marginTop: 8,
          }}
        >
          Kinship v1.0 {"\u00B7"} Made with {"\uD83D\uDC9B"}
        </Text>
      </FadeIn>
    </ScrollView>
  );
}
