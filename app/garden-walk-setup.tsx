/**
 * Garden Walk Setup Screen
 *
 * Shown once after the first-time orientation completes.
 * Lets the user pick their preferred day and time for the
 * weekly Garden Walk notification, then saves preferences
 * via the notification engine.
 *
 * After setup, navigates to the main tab screen.
 *
 * Uses a custom time picker (preset slots) to avoid
 * native module dependency on @react-native-community/datetimepicker.
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import { ChevronUp, ChevronDown, Calendar, Check } from "lucide-react-native";
import { colors, fonts, shadows, radii } from "@design/tokens";
import { WateringIllustration } from "@/components/illustrations";
import { setGardenWalkPreferences } from "@/lib/notificationEngine";
import { requestCalendarPermission } from "@/lib/calendarEngine";

// ─── Constants ──────────────────────────────────────────────────────────────

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;
const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** Time slots in 30-minute increments from 7:00 AM to 9:00 PM */
const TIME_SLOTS: { hour: number; minute: number }[] = [];
for (let h = 7; h <= 21; h++) {
  TIME_SLOTS.push({ hour: h, minute: 0 });
  TIME_SLOTS.push({ hour: h, minute: 30 });
}

function formatTimeSlot(hour: number, minute: number): string {
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  const m = String(minute).padStart(2, "0");
  return `${h12}:${m} ${ampm}`;
}

// Default: 10:00 AM → index 6 (7:00, 7:30, 8:00, 8:30, 9:00, 9:30, 10:00)
const DEFAULT_TIME_INDEX = 6;

// ─── Component ──────────────────────────────────────────────────────────────

export default function GardenWalkSetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [selectedDay, setSelectedDay] = useState(0);
  const [timeIndex, setTimeIndex] = useState(DEFAULT_TIME_INDEX);

  // Calendar permission state: "pending" = not yet asked, "granted" = allowed, "skipped" = declined/skipped
  const [calendarStatus, setCalendarStatus] = useState<
    "pending" | "granted" | "skipped"
  >("pending");

  const currentSlot = TIME_SLOTS[timeIndex];

  const handleTimeUp = useCallback(() => {
    setTimeIndex((prev) => Math.min(prev + 1, TIME_SLOTS.length - 1));
  }, []);

  const handleTimeDown = useCallback(() => {
    setTimeIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleAllowCalendar = useCallback(async () => {
    try {
      const status = await requestCalendarPermission();
      setCalendarStatus(status === "granted" ? "granted" : "skipped");
    } catch {
      // Native module unavailable — treat as skipped
      setCalendarStatus("skipped");
    }
  }, []);

  const handleSkipCalendar = useCallback(() => {
    setCalendarStatus("skipped");
  }, []);

  const handleConfirm = useCallback(() => {
    const slot = TIME_SLOTS[timeIndex];
    const timeStr = `${String(slot.hour).padStart(2, "0")}:${String(slot.minute).padStart(2, "0")}`;

    setGardenWalkPreferences({
      enabled: true,
      dayOfWeek: selectedDay,
      timeOfDay: timeStr,
    });

    // Navigate to main app
    if (router.canGoBack()) {
      router.back();
      setTimeout(() => {
        router.replace("/(tabs)");
      }, 100);
    } else {
      router.replace("/(tabs)");
    }
  }, [selectedDay, timeIndex, router]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.cream }}
        contentContainerStyle={{
          paddingTop: insets.top + 40,
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: 32,
          alignItems: "center",
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Illustration */}
        <Animated.View entering={FadeIn.duration(500)}>
          <WateringIllustration size={200} />
        </Animated.View>

        {/* Heading */}
        <Animated.View
          entering={FadeInUp.delay(100).duration(400)}
          style={{ marginTop: 32, marginBottom: 8 }}
        >
          <Text
            style={{
              fontFamily: fonts.serif,
              fontSize: 24,
              lineHeight: 32,
              color: colors.nearBlack,
              textAlign: "center",
            }}
          >
            When would you like to{"\n"}walk through your garden?
          </Text>
        </Animated.View>

        {/* Subtitle */}
        <Animated.View entering={FadeInUp.delay(200).duration(400)}>
          <Text
            style={{
              fontFamily: fonts.sans,
              fontSize: 15,
              lineHeight: 22,
              color: colors.warmGray,
              textAlign: "center",
              marginBottom: 32,
            }}
          >
            A calm moment to revisit memories{"\n"}and nurture your connections
          </Text>
        </Animated.View>

        {/* Day picker */}
        <Animated.View
          entering={FadeInUp.delay(300).duration(400)}
          style={{ width: "100%", marginBottom: 28 }}
        >
          <Text
            style={{
              fontFamily: fonts.sansMedium,
              fontSize: 13,
              color: colors.warmGray,
              textAlign: "center",
              marginBottom: 12,
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}
          >
            Day
          </Text>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {DAY_LABELS.map((label, index) => {
              const isSelected = selectedDay === index;
              return (
                <Pressable
                  key={`${label}-${index}`}
                  onPress={() => setSelectedDay(index)}
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    backgroundColor: isSelected ? colors.sage : colors.white,
                    borderWidth: isSelected ? 0 : 1,
                    borderColor: colors.border,
                    alignItems: "center",
                    justifyContent: "center",
                    ...(isSelected ? shadows.soft : {}),
                  }}
                >
                  <Text
                    style={{
                      fontFamily: isSelected
                        ? fonts.sansSemiBold
                        : fonts.sansMedium,
                      fontSize: 15,
                      color: isSelected ? colors.white : colors.nearBlack,
                    }}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text
            style={{
              fontFamily: fonts.sans,
              fontSize: 13,
              color: colors.sage,
              textAlign: "center",
              marginTop: 8,
            }}
          >
            {DAY_NAMES[selectedDay]}
          </Text>
        </Animated.View>

        {/* Time picker — custom stepper */}
        <Animated.View
          entering={FadeInUp.delay(400).duration(400)}
          style={{ width: "100%", marginBottom: 40, alignItems: "center" }}
        >
          <Text
            style={{
              fontFamily: fonts.sansMedium,
              fontSize: 13,
              color: colors.warmGray,
              textAlign: "center",
              marginBottom: 12,
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}
          >
            Time
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 16,
            }}
          >
            {/* Down arrow */}
            <Pressable
              onPress={handleTimeDown}
              disabled={timeIndex === 0}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: timeIndex === 0 ? colors.border : colors.sagePale,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ChevronDown
                size={20}
                strokeWidth={2}
                color={timeIndex === 0 ? colors.warmGray : colors.sage}
              />
            </Pressable>

            {/* Time display */}
            <View
              style={{
                backgroundColor: colors.white,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radii.lg,
                paddingVertical: 14,
                paddingHorizontal: 28,
                minWidth: 140,
                alignItems: "center",
                ...shadows.soft,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.sansSemiBold,
                  fontSize: 20,
                  color: colors.nearBlack,
                }}
              >
                {formatTimeSlot(currentSlot.hour, currentSlot.minute)}
              </Text>
            </View>

            {/* Up arrow */}
            <Pressable
              onPress={handleTimeUp}
              disabled={timeIndex === TIME_SLOTS.length - 1}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor:
                  timeIndex === TIME_SLOTS.length - 1
                    ? colors.border
                    : colors.sagePale,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ChevronUp
                size={20}
                strokeWidth={2}
                color={
                  timeIndex === TIME_SLOTS.length - 1
                    ? colors.warmGray
                    : colors.sage
                }
              />
            </Pressable>
          </View>
        </Animated.View>

        {/* Calendar permission — optional, skippable */}
        <Animated.View
          entering={FadeInUp.delay(500).duration(400)}
          style={{ width: "100%", marginBottom: 28 }}
        >
          <Text
            style={{
              fontFamily: fonts.sansMedium,
              fontSize: 13,
              color: colors.warmGray,
              textAlign: "center",
              marginBottom: 12,
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}
          >
            Calendar
          </Text>

          {calendarStatus === "pending" && (
            <View style={{ alignItems: "center" }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: colors.sagePale,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                <Calendar size={22} strokeWidth={1.75} color={colors.sage} />
              </View>
              <Text
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 14,
                  lineHeight: 20,
                  color: colors.warmGray,
                  textAlign: "center",
                  marginBottom: 16,
                  paddingHorizontal: 8,
                }}
              >
                If you'd like, Kinship can check your calendar{"\n"}to suggest
                capturing memories after events{"\n"}with people in your garden.
              </Text>
              <Pressable
                onPress={handleAllowCalendar}
                style={{
                  borderWidth: 1.5,
                  borderColor: colors.sage,
                  borderRadius: radii.lg,
                  paddingVertical: 12,
                  paddingHorizontal: 24,
                  marginBottom: 10,
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.sansSemiBold,
                    fontSize: 15,
                    color: colors.sage,
                  }}
                >
                  Allow calendar access
                </Text>
              </Pressable>
              <Pressable onPress={handleSkipCalendar}>
                <Text
                  style={{
                    fontFamily: fonts.sans,
                    fontSize: 13,
                    color: colors.warmGray,
                  }}
                >
                  Skip for now
                </Text>
              </Pressable>
            </View>
          )}

          {calendarStatus === "granted" && (
            <View style={{ alignItems: "center" }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: colors.sagePale,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 10,
                }}
              >
                <Check size={22} strokeWidth={2.5} color={colors.sage} />
              </View>
              <Text
                style={{
                  fontFamily: fonts.sansMedium,
                  fontSize: 14,
                  color: colors.sage,
                }}
              >
                Calendar connected
              </Text>
            </View>
          )}

          {calendarStatus === "skipped" && (
            <View style={{ alignItems: "center" }}>
              <Text
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 13,
                  color: colors.warmGray,
                  textAlign: "center",
                  lineHeight: 18,
                }}
              >
                No problem at all. You can enable this{"\n"}anytime in Settings.
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Confirm button */}
        <Animated.View
          entering={FadeInUp.delay(600).duration(400)}
          style={{ width: "100%" }}
        >
          <Pressable
            onPress={handleConfirm}
            style={{
              backgroundColor: colors.sage,
              borderRadius: radii.lg,
              paddingVertical: 16,
              alignItems: "center",
              ...shadows.soft,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.sansSemiBold,
                fontSize: 17,
                color: colors.white,
              }}
            >
              Sounds lovely
            </Text>
          </Pressable>
        </Animated.View>

        {/* Caption */}
        <Animated.View
          entering={FadeInUp.delay(700).duration(400)}
          style={{ marginTop: 16 }}
        >
          <Text
            style={{
              fontFamily: fonts.sans,
              fontSize: 13,
              color: colors.warmGray,
              textAlign: "center",
              lineHeight: 18,
            }}
          >
            You can change this anytime in Settings
          </Text>
        </Animated.View>
      </ScrollView>
    </>
  );
}
