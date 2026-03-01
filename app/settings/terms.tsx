/**
 * Terms of Service Screen
 *
 * In-app display of the Kinship terms of service.
 * Required by Apple App Store and Google Play Store.
 */

import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { colors, fonts } from "@design/tokens";

const settingsBg = "#F5F0EC";

function Section({ title, body, delay }: { title: string; body: string; delay: number }) {
  return (
    <Animated.View
      entering={FadeInUp.delay(delay).duration(400)}
      style={{ marginBottom: 24 }}
    >
      <Text
        style={{
          fontFamily: fonts.sansSemiBold,
          fontSize: 15,
          color: colors.nearBlack,
          marginBottom: 6,
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          fontFamily: fonts.sans,
          fontSize: 14,
          color: colors.warmGray,
          lineHeight: 22,
        }}
      >
        {body}
      </Text>
    </Animated.View>
  );
}

export default function TermsScreen() {
  const insets = useSafeAreaInsets();

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/settings");
  };

  return (
    <View style={{ flex: 1, backgroundColor: settingsBg }}>
      {/* Nav bar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingTop: insets.top + 14,
          paddingHorizontal: 20,
          paddingBottom: 12,
        }}
      >
        <Pressable
          onPress={goBack}
          hitSlop={12}
          style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
        >
          <ArrowLeft size={16} strokeWidth={2} color={colors.sage} />
          <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: colors.sage }}>
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
          Terms of Service
        </Text>
        <View style={{ minWidth: 64 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInUp.duration(400)} style={{ marginBottom: 20 }}>
          <Text
            style={{
              fontFamily: fonts.sans,
              fontSize: 12,
              color: colors.warmGray,
              marginBottom: 4,
            }}
          >
            Effective date: February 2026
          </Text>
          <Text
            style={{
              fontFamily: fonts.sans,
              fontSize: 14,
              color: colors.warmGray,
              lineHeight: 22,
            }}
          >
            Welcome to Kinship. By using this app, you agree to the following terms. Please read them carefully.
          </Text>
        </Animated.View>

        <Section
          delay={50}
          title="Acceptance of terms"
          body="By creating an account or using Kinship, you agree to these Terms of Service and our Privacy Policy. If you do not agree, please do not use the app."
        />

        <Section
          delay={100}
          title="What Kinship is"
          body="Kinship is a personal app for nurturing your relationships. You can store information about the people in your life, capture memories, and receive gentle reminders to stay connected. Kinship is free to use."
        />

        <Section
          delay={150}
          title="Your account"
          body={"You are responsible for maintaining the security of your account. You agree to:\n\n• Provide accurate information when creating your account\n• Keep your login credentials secure\n• Notify us if you suspect unauthorized access to your account\n\nYou may delete your account at any time from Settings."}
        />

        <Section
          delay={200}
          title="Your content"
          body="You retain full ownership of everything you create in Kinship — names, memories, notes, and preferences. We do not claim any rights over your content. We only store it to provide the app experience to you."
        />

        <Section
          delay={250}
          title="Acceptable use"
          body={"You agree not to:\n\n• Use the app for any unlawful purpose\n• Attempt to access other users' data\n• Reverse-engineer or modify the app\n• Use automated systems to access the app"}
        />

        <Section
          delay={300}
          title="Availability"
          body="We strive to keep Kinship available at all times, but we do not guarantee uninterrupted access. We may update, modify, or discontinue features as the app evolves. We will provide reasonable notice before making significant changes."
        />

        <Section
          delay={350}
          title="Limitation of liability"
          body="Kinship is provided as-is. While we care deeply about your experience, we are not liable for any indirect, incidental, or consequential damages arising from your use of the app. Our total liability is limited to the amount you paid for the app (which is free)."
        />

        <Section
          delay={400}
          title="Changes to these terms"
          body="We may update these terms from time to time. We will notify you of significant changes through the app. Continued use of Kinship after changes constitutes acceptance of the updated terms."
        />

        <Section
          delay={450}
          title="Contact"
          body="If you have questions about these terms, please reach out to us at hello@kinshipgarden.app."
        />
      </ScrollView>
    </View>
  );
}
