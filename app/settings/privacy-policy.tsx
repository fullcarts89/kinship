/**
 * Privacy Policy Screen
 *
 * In-app display of the Kinship privacy policy.
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

export default function PrivacyPolicyScreen() {
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
          Privacy Policy
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
            Kinship ("we", "our", or "the app") is a personal relationship-nurturing app. Your privacy matters deeply to us. This policy explains what data we collect, how we use it, and the control you have.
          </Text>
        </Animated.View>

        <Section
          delay={50}
          title="What we collect"
          body={"When you create an account, we store your email address and authentication credentials (securely hashed). Within the app, you may choose to store:\n\n• Names and relationship types of people in your garden\n• Memories, reflections, and interaction notes\n• Birthday reminders and cadence preferences\n\nAll of this content is created by you and stored solely for your use."}
        />

        <Section
          delay={100}
          title="How we use your data"
          body="Your data is used exclusively to provide the Kinship app experience — showing your garden, memories, and gentle reminders. We do not sell, share, or monetize your personal data. We do not run ads. We do not build profiles for third parties."
        />

        <Section
          delay={150}
          title="Data storage & security"
          body="Your data is stored in Supabase (hosted on AWS) with row-level security. Each user can only access their own data. Authentication tokens are stored in encrypted device storage (Expo SecureStore). All data is transmitted over HTTPS."
        />

        <Section
          delay={200}
          title="Third-party services"
          body={"We use the following services to operate the app:\n\n• Supabase — database and authentication\n• Apple Sign-In — optional sign-in method\n• Google Sign-In — optional sign-in method\n\nThese services have their own privacy policies. We send them only the minimum data needed for authentication."}
        />

        <Section
          delay={250}
          title="Your rights"
          body={"You can at any time:\n\n• Export all your data as JSON from Settings → Privacy & Data\n• Delete your account and all associated data from Settings → Privacy & Data\n• Contact us with questions about your data\n\nAccount deletion is permanent and irreversible. All your data is removed from our servers."}
        />

        <Section
          delay={300}
          title="Children's privacy"
          body="Kinship is not directed at children under 13. We do not knowingly collect personal information from children under 13. If we learn we have collected such information, we will delete it promptly."
        />

        <Section
          delay={350}
          title="Changes to this policy"
          body="We may update this privacy policy from time to time. We will notify you of significant changes through the app. Continued use of Kinship after changes constitutes acceptance of the updated policy."
        />

        <Section
          delay={400}
          title="Contact"
          body="If you have questions about this privacy policy or your data, please reach out to us at privacy@kinshipgarden.app."
        />
      </ScrollView>
    </View>
  );
}
