/**
 * About Kinship Screen
 *
 * Accessible from Profile tab → "About Kinship" and
 * Settings hub → Info → "About".
 *
 * Shows the app's identity, version, philosophy,
 * and links to legal documents.
 */

import React from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Linking,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  ExternalLink,
  ChevronRight,
} from "lucide-react-native";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import { colors, fonts } from "@design/tokens";
import { SmallGardenIllustration } from "@/components/illustrations";

// ─── Design Tokens ──────────────────────────────────────────────────────────

const settingsBg = "#F5F0EC";

// ─── Link Row Component ─────────────────────────────────────────────────────

function LinkRow({
  label,
  onPress,
  external = false,
  last = false,
}: {
  label: string;
  onPress: () => void;
  external?: boolean;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 18,
        backgroundColor: colors.white,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: "#F5F0EC",
      }}
    >
      <Text
        style={{
          flex: 1,
          fontFamily: fonts.sans,
          fontSize: 15,
          color: colors.nearBlack,
        }}
      >
        {label}
      </Text>
      {external ? (
        <ExternalLink size={14} strokeWidth={2} color="#D4CFC8" />
      ) : (
        <ChevronRight size={15} strokeWidth={2} color="#D4CFC8" />
      )}
    </Pressable>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function AboutScreen() {
  const insets = useSafeAreaInsets();

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/settings");
    }
  };

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => {
      // Silent — link failed to open
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: settingsBg }}>
      {/* Nav bar */}
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
        <Pressable
          onPress={goBack}
          hitSlop={12}
          style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
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
        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize: 17,
            color: colors.nearBlack,
            textAlign: "center",
            flex: 1,
          }}
        >
          About
        </Text>
        <View style={{ minWidth: 64 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 40,
          alignItems: "center",
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Illustration + Brand */}
        <Animated.View
          entering={FadeIn.duration(500)}
          style={{ alignItems: "center", marginTop: 28, marginBottom: 8 }}
        >
          <SmallGardenIllustration size={80} />
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(100).duration(400)}
          style={{ alignItems: "center", marginBottom: 6 }}
        >
          <Text
            style={{
              fontFamily: fonts.serif,
              fontSize: 28,
              color: colors.nearBlack,
            }}
          >
            Kinship
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(200).duration(400)}
          style={{ alignItems: "center", marginBottom: 24 }}
        >
          <Text
            style={{
              fontFamily: fonts.sans,
              fontSize: 13,
              color: colors.warmGray,
            }}
          >
            Version 1.0.0
          </Text>
        </Animated.View>

        {/* Philosophy card */}
        <Animated.View
          entering={FadeInUp.delay(300).duration(400)}
          style={{
            marginHorizontal: 20,
            marginBottom: 24,
            backgroundColor: colors.sagePale,
            borderRadius: 18,
            paddingVertical: 24,
            paddingHorizontal: 24,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.serif,
              fontSize: 18,
              color: colors.nearBlack,
              textAlign: "center",
              lineHeight: 26,
              marginBottom: 12,
            }}
          >
            Grow with intention
          </Text>
          <Text
            style={{
              fontFamily: fonts.sans,
              fontSize: 14,
              color: colors.warmGray,
              textAlign: "center",
              lineHeight: 22,
            }}
          >
            Kinship is a quiet space for nurturing the relationships
            that matter most. No scores, no streaks — just a living
            garden that grows alongside your connections.
          </Text>
        </Animated.View>

        {/* Links section */}
        <Animated.View
          entering={FadeInUp.delay(400).duration(400)}
          style={{ width: "100%", paddingHorizontal: 14, marginBottom: 24 }}
        >
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
            Legal
          </Text>
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
            <LinkRow
              label="Privacy Policy"
              onPress={() => router.push("/settings/privacy-policy")}
            />
            <LinkRow
              label="Terms of Service"
              onPress={() => router.push("/settings/terms")}
            />
            <LinkRow
              label="Open-Source Licenses"
              external
              last
              onPress={() => openLink("https://kinshipgarden.app/licenses")}
            />
          </View>
        </Animated.View>

        {/* Credits section */}
        <Animated.View
          entering={FadeInUp.delay(500).duration(400)}
          style={{ width: "100%", paddingHorizontal: 14, marginBottom: 32 }}
        >
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
            Credits
          </Text>
          <View
            style={{
              backgroundColor: colors.white,
              borderRadius: 18,
              overflow: "hidden",
              paddingVertical: 18,
              paddingHorizontal: 20,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 4,
              elevation: 1,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.sans,
                fontSize: 14,
                color: colors.nearBlack,
                lineHeight: 22,
                marginBottom: 8,
              }}
            >
              Made with care for the people who care.
            </Text>
            <Text
              style={{
                fontFamily: fonts.sans,
                fontSize: 13,
                color: colors.warmGray,
                lineHeight: 20,
              }}
            >
              Illustrations crafted with organic warmth.{"\n"}
              Typography: DM Serif Display + DM Sans.{"\n"}
              Built with Expo, React Native, and a lot of tea.
            </Text>
          </View>
        </Animated.View>

        {/* Footer */}
        <Animated.View
          entering={FadeInUp.delay(600).duration(400)}
          style={{ alignItems: "center" }}
        >
          <Text
            style={{
              fontFamily: fonts.serif,
              fontSize: 14,
              color: colors.sageLight,
              fontStyle: "italic",
            }}
          >
            {"\uD83C\uDF3F"} Tend gently, grow deeply.
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
