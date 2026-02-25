/**
 * TendGardenSheet
 *
 * "Tend your garden" — the central action sheet for nurturing relationships.
 *
 * Philosophy: This sheet is an invitation, not an obligation. Every option
 * represents a gentle way to nurture the people in your garden. There are
 * no counters, streaks, or guilt mechanics — just three thoughtful actions
 * that help you show up for the people you care about.
 *
 * Why exactly 3 actions:
 * These three map to the core relationship-nurturing loop:
 *   1. Capture a moment  — preserve what matters
 *   2. Reach out         — reconnect with someone
 *   3. Add someone       — grow your garden
 *
 * To extend later: add new `intent` values to select-person.tsx or
 * conditionally render actions here. Keep the sheet focused — more than
 * 3 actions would overwhelm the gentle, calm experience.
 */

import React from "react";
import { View, Text, Pressable, Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  Sprout,
  Camera,
  MessageCircle,
  UserPlus,
} from "lucide-react-native";
import { colors, fonts } from "@design/tokens";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TendGardenSheetProps {
  visible: boolean;
  onClose: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TendGardenSheet({ visible, onClose }: TendGardenSheetProps) {
  const insets = useSafeAreaInsets();

  // ── Navigation handlers ──────────────────────────────────────────────────
  // Each handler closes the sheet first, then navigates. This ensures the
  // Modal dismiss animation runs concurrently with the route transition.

  const handleCaptureMemory = () => {
    onClose();
    // memory/add has a built-in PersonSelectorModal — no pre-selection needed
    router.push("/memory/add");
  };

  const handleReachOut = () => {
    onClose();
    // Select a person first, then route to the reach-out flow
    router.push("/select-person?intent=reach-out");
  };

  const handleAddSomeone = () => {
    onClose();
    // Navigate to the existing Add Person wizard
    router.push("/(tabs)/add");
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
    >
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        {/* Dimmed overlay — tap to dismiss */}
        <Pressable
          onPress={onClose}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(28,24,20,0.44)",
          }}
        />

        {/* Sheet content */}
        <View
          style={{
            backgroundColor: colors.white,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 24,
            paddingBottom: insets.bottom + 24,
            paddingTop: 6,
          }}
        >
          {/* Handle pill */}
          <View
            style={{
              width: 36,
              height: 4,
              borderRadius: 100,
              backgroundColor: "#E8E0D6",
              alignSelf: "center",
              marginTop: 12,
              marginBottom: 20,
            }}
          />

          {/* Header — Sprout icon + title */}
          <View style={{ alignItems: "center", marginBottom: 24 }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                backgroundColor: colors.sagePale,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <Sprout
                color={colors.sage}
                size={26}
                strokeWidth={1.8}
              />
            </View>
            <Text
              style={{
                fontFamily: fonts.serif,
                fontSize: 24,
                color: colors.nearBlack,
                textAlign: "center",
                lineHeight: 30,
              }}
            >
              Tend your garden
            </Text>
          </View>

          {/* ── Action A: Capture a moment (PRIMARY — filled gradient) ── */}
          <Pressable
            onPress={handleCaptureMemory}
            style={{ marginBottom: 12, borderRadius: 18, overflow: "hidden" }}
          >
            <LinearGradient
              colors={[colors.sage, colors.moss]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 18,
                paddingHorizontal: 20,
                borderRadius: 18,
                shadowColor: colors.sage,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.25,
                shadowRadius: 18,
                elevation: 6,
              }}
            >
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  backgroundColor: "rgba(255,255,255,0.2)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 14,
                }}
              >
                <Camera color={colors.white} size={22} strokeWidth={1.8} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: fonts.sansSemiBold,
                    fontSize: 16,
                    color: colors.white,
                    marginBottom: 2,
                  }}
                >
                  Capture a moment
                </Text>
                <Text
                  style={{
                    fontFamily: fonts.sans,
                    fontSize: 13,
                    color: "rgba(255,255,255,0.75)",
                    lineHeight: 18,
                  }}
                >
                  Save a memory with someone you care about
                </Text>
              </View>
            </LinearGradient>
          </Pressable>

          {/* ── Action B: Reach out (SECONDARY — bordered) ── */}
          <Pressable
            onPress={handleReachOut}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 18,
              paddingHorizontal: 20,
              borderRadius: 18,
              backgroundColor: colors.white,
              borderWidth: 1.5,
              borderColor: colors.sageLight,
              marginBottom: 12,
            }}
          >
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                backgroundColor: colors.sagePale,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 14,
              }}
            >
              <MessageCircle
                color={colors.sage}
                size={22}
                strokeWidth={1.8}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: fonts.sansSemiBold,
                  fontSize: 16,
                  color: colors.nearBlack,
                  marginBottom: 2,
                }}
              >
                Reach out
              </Text>
              <Text
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 13,
                  color: colors.warmGray,
                  lineHeight: 18,
                }}
              >
                Connect with someone in your garden
              </Text>
            </View>
          </Pressable>

          {/* ── Action C: Add someone (SECONDARY — bordered) ── */}
          <Pressable
            onPress={handleAddSomeone}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 18,
              paddingHorizontal: 20,
              borderRadius: 18,
              backgroundColor: colors.white,
              borderWidth: 1.5,
              borderColor: colors.sageLight,
            }}
          >
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                backgroundColor: colors.sagePale,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 14,
              }}
            >
              <UserPlus color={colors.sage} size={22} strokeWidth={1.8} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: fonts.sansSemiBold,
                  fontSize: 16,
                  color: colors.nearBlack,
                  marginBottom: 2,
                }}
              >
                Add someone
              </Text>
              <Text
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 13,
                  color: colors.warmGray,
                  lineHeight: 18,
                }}
              >
                Plant a new person in your garden
              </Text>
            </View>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
