import { useState, useEffect } from "react";
import { Tabs } from "expo-router";
import { View, Pressable, Modal, Text } from "react-native";
import {
  Sun,
  Flower2,
  Sprout,
  User,
  Camera,
  MessageCircle,
  UserPlus,
  BookUser,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withRepeat,
  withDelay,
  Easing,
  FadeIn,
  FadeOut,
  SlideInDown,
  type SharedValue,
} from "react-native-reanimated";
import { colors, fonts } from "@design/tokens";

// ─── Tend FAB ────────────────────────────────────────────────────────────────
// The center FAB quietly "breathes" (scale 1 → 1.05 → 1, one breath every ~6s)
// to invite the primary action, and dips to 0.94 with a spring when pressed.
// The press pulse is driven by the tab's tabPress listener via a shared value
// so tab behavior stays untouched.

const FAB_PRESS_SPRING = { damping: 18, stiffness: 280, mass: 0.7 };

function TendFabIcon({ pressScale }: { pressScale: SharedValue<number> }) {
  const breathe = useSharedValue(1);

  useEffect(() => {
    // One gentle breath per ~6s cycle: rest 4s, swell 1s, release 1s.
    breathe.value = withRepeat(
      withSequence(
        withDelay(
          4000,
          withTiming(1.05, {
            duration: 1000,
            easing: Easing.inOut(Easing.sin),
          })
        ),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, [breathe]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathe.value * pressScale.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: colors.sage,
          alignItems: "center",
          justifyContent: "center",
          marginTop: -16,
          shadowColor: colors.nearBlack,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 4,
        },
        animatedStyle,
      ]}
    >
      <Sprout color={colors.white} size={26} strokeWidth={2.5} />
    </Animated.View>
  );
}

/**
 * Tab Layout
 *
 * Bottom tab navigator with 4 tabs matching the Figma Make design:
 * 1. Home — Sun icon (represents the life source of the garden)
 * 2. Garden — Flower2 icon (a blooming flower for the people garden)
 * 3. Tend — Sprout icon (center, raised FAB) → opens "Tend your garden" sheet
 * 4. Profile — User icon
 *
 * The center FAB is intentionally NOT a navigation tab. It intercepts the
 * tab press to open a bottom sheet with 3 relationship-nurturing actions:
 *   - Capture a moment (memory)
 *   - Reach out (reconnect)
 *   - Add someone (grow garden)
 *
 * Philosophy: This sheet is an invitation, not an obligation. Every option
 * represents a gentle way to nurture the people in your garden. There are
 * no counters, streaks, or guilt mechanics — just three thoughtful actions.
 *
 * Activity tab removed (merged into Person Profile timeline).
 */
export default function TabLayout() {
  const [showTendSheet, setShowTendSheet] = useState(false);
  const insets = useSafeAreaInsets();
  const fabPressScale = useSharedValue(1);

  const closeTendSheet = () => setShowTendSheet(false);

  const handleCaptureMemory = () => {
    closeTendSheet();
    router.push("/memory/add");
  };

  const handleReachOut = () => {
    closeTendSheet();
    router.push("/select-person?intent=reach-out");
  };

  const handleAddSomeone = () => {
    closeTendSheet();
    router.push("/(tabs)/add");
  };

  const handleImportContacts = () => {
    closeTendSheet();
    router.push("/import-contacts");
  };

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.sage,
          tabBarInactiveTintColor: colors.warmGray,
          tabBarStyle: {
            backgroundColor: "#FDF7ED",
            borderTopColor: "#E8E4DD",
            borderTopWidth: 1,
            height: 88,
            paddingBottom: 28,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontFamily: "DMSans-Medium",
            fontSize: 11,
          },
        }}
      >
        {/* Sun icon represents the life source of the garden — the main overview */}
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size }) => (
              <Sun color={color} size={size} strokeWidth={2} />
            ),
          }}
        />
        {/* Flower2 icon aligns with the garden metaphor for the people list */}
        <Tabs.Screen
          name="people"
          options={{
            title: "Garden",
            tabBarIcon: ({ color, size }) => (
              <Flower2 color={color} size={size} strokeWidth={2} />
            ),
          }}
        />
        <Tabs.Screen
          name="add"
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              // Quick spring dip for press feedback, then open the sheet
              fabPressScale.value = withSequence(
                withSpring(0.94, FAB_PRESS_SPRING),
                withSpring(1, FAB_PRESS_SPRING)
              );
              setShowTendSheet(true);
            },
          }}
          options={{
            title: "",
            tabBarIcon: () => <TendFabIcon pressScale={fabPressScale} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, size }) => (
              <User color={color} size={size} strokeWidth={2} />
            ),
          }}
        />
        {/* Hide activity tab - merged into person profile timeline */}
        <Tabs.Screen
          name="activity"
          options={{
            href: null,
          }}
        />
      </Tabs>

      {/* ── "Tend your garden" bottom sheet ────────────────────────────── */}
      <Modal
        visible={showTendSheet}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeTendSheet}
      >
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          {/* Dimmed overlay — fades in, tap to dismiss */}
          <Animated.View
            entering={FadeIn.duration(220)}
            exiting={FadeOut.duration(180)}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          >
            <Pressable
              onPress={closeTendSheet}
              style={{
                flex: 1,
                backgroundColor: "rgba(28,24,20,0.44)",
              }}
            />
          </Animated.View>

          {/* Sheet content — springs up from below */}
          <Animated.View
            entering={SlideInDown.springify().damping(17).stiffness(190).mass(0.9)}
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
                <Sprout color={colors.sage} size={26} strokeWidth={1.8} />
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

            {/* Action A: Capture a moment (PRIMARY — filled gradient) */}
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
                    Capture a memory
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

            {/* Action B: Reach out (SECONDARY — bordered) */}
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

            {/* Action C: Add someone (SECONDARY — bordered) */}
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
                <UserPlus
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

            {/* Action D: Import from contacts (TERTIARY — bordered, lighter) */}
            <Pressable
              onPress={handleImportContacts}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 18,
                paddingHorizontal: 20,
                borderRadius: 18,
                backgroundColor: colors.white,
                borderWidth: 1.5,
                borderColor: colors.sageLight,
                marginTop: 12,
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
                <BookUser
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
                  Import from contacts
                </Text>
                <Text
                  style={{
                    fontFamily: fonts.sans,
                    fontSize: 13,
                    color: colors.warmGray,
                    lineHeight: 18,
                  }}
                >
                  Bring someone from your phone into the garden
                </Text>
              </View>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}
