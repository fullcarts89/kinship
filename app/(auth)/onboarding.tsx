import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput as RNTextInput,
  Dimensions,
  ImageBackground,
  ScrollView,
  Animated as RNAnimated,
  PanResponder,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Camera, ChevronRight } from "lucide-react-native";
import { colors, fonts } from "@design/tokens";
import { Button } from "@/components/ui";
import {
  GardenGrowthIllustration,
  SeedIllustration,
} from "@/components/illustrations";

// ─── Design Tokens (local) ──────────────────────────────────────────────────

const sage = "#7A9E7E";
const sageDark = "#4A7055";
const sagePale = "#EBF3EB";
const sageLight = "#C8DEC9";
const gold = "#D4A853";
const cream = "#FDF7ED";
const nearBlack = "#1C1917";
const warmGray = "#78716C";
const white = "#FFFFFF";
const borderColor = "#E8E4DD";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── Carousel Slide Data ────────────────────────────────────────────────────

interface Slide {
  headline: string;
  subtext: string;
  showCTA: boolean;
}

const slides: Slide[] = [
  {
    headline: "Life moves fast",
    subtext: "It's easy to lose touch with people who matter most",
    showCTA: false,
  },
  {
    headline: "Moments fade quietly",
    subtext: "The photos stay. The feelings don't always",
    showCTA: false,
  },
  {
    headline: "Kinship helps your relationships grow",
    subtext: "Stay close in the moments that matter",
    showCTA: true,
  },
];

// ─── Onboarding Screens Enum ────────────────────────────────────────────────

type OnboardingScreen = "carousel" | "addPerson" | "addMemory" | "dashboard";

// ─── Main Component ─────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState<OnboardingScreen>("carousel");
  const [personName, setPersonName] = useState("");

  const handleFinish = useCallback(() => {
    router.replace("/(tabs)");
  }, []);

  switch (screen) {
    case "carousel":
      return (
        <CarouselScreen
          insets={insets}
          onNext={() => setScreen("addPerson")}
        />
      );
    case "addPerson":
      return (
        <AddFirstPersonScreen
          insets={insets}
          name={personName}
          onNameChange={setPersonName}
          onNext={() => setScreen("addMemory")}
          onSkip={() => setScreen("dashboard")}
        />
      );
    case "addMemory":
      return (
        <AddMemoryScreen
          insets={insets}
          personName={personName || "them"}
          onNext={() => setScreen("dashboard")}
          onSkip={() => setScreen("dashboard")}
        />
      );
    case "dashboard":
      return (
        <DashboardEntryScreen
          insets={insets}
          personName={personName || "Someone"}
          onFinish={handleFinish}
        />
      );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREENS 1-3: Emotional Swipe Carousel
// ═══════════════════════════════════════════════════════════════════════════════

interface CarouselScreenProps {
  insets: { top: number; bottom: number };
  onNext: () => void;
}

function CarouselScreen({ insets, onNext }: CarouselScreenProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollX = useRef(new RNAnimated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 10,
      onPanResponderRelease: (_, gestureState) => {
        if (Math.abs(gestureState.dx) > 50) {
          if (gestureState.dx < 0 && currentSlide < slides.length - 1) {
            setCurrentSlide((prev) => prev + 1);
          } else if (gestureState.dx > 0 && currentSlide > 0) {
            setCurrentSlide((prev) => prev - 1);
          }
        }
      },
    })
  ).current;

  // Gradient placeholder backgrounds for slides (since we can't use Unsplash reliably)
  const slideColors: [string, string][] = [
    ["#6B8E7B", "#3A5B4A"],
    ["#8B7E6A", "#5A4D3A"],
    ["#7A9E7E", "#4A7055"],
  ];

  return (
    <View style={{ flex: 1, backgroundColor: cream }} {...panResponder.panHandlers}>
      <LinearGradient
        colors={slideColors[currentSlide]}
        style={{ flex: 1 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Dark overlay on bottom */}
        <LinearGradient
          colors={["transparent", "rgba(28,25,23,0.5)", "rgba(28,25,23,0.85)"]}
          locations={[0, 0.3, 1]}
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "70%",
          }}
        />

        {/* Content at bottom */}
        <View
          style={{
            flex: 1,
            justifyContent: "flex-end",
            paddingHorizontal: 32,
            paddingBottom: Math.max(insets.bottom, 20) + 28,
          }}
        >
          {/* Page Indicator Dots */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
              marginBottom: 32,
            }}
          >
            {slides.map((_, i) => (
              <Pressable key={i} onPress={() => setCurrentSlide(i)}>
                <View
                  style={{
                    width: i === currentSlide ? 32 : 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor:
                      i === currentSlide ? white : "rgba(255,255,255,0.4)",
                  }}
                />
              </Pressable>
            ))}
          </View>

          {/* Headline */}
          <Text
            style={{
              fontFamily: fonts.serif,
              fontSize: 40,
              lineHeight: 48,
              color: white,
              marginBottom: 16,
            }}
          >
            {slides[currentSlide].headline}
          </Text>

          {/* Subtext */}
          <Text
            style={{
              fontFamily: fonts.sans,
              fontSize: 18,
              lineHeight: 27,
              color: white,
              opacity: 0.95,
              marginBottom: slides[currentSlide].showCTA ? 32 : 0,
            }}
          >
            {slides[currentSlide].subtext}
          </Text>

          {/* CTA Button - Only on last slide */}
          {slides[currentSlide].showCTA && (
            <Pressable
              onPress={onNext}
              style={{
                backgroundColor: sage,
                borderRadius: 16,
                paddingVertical: 18,
                alignItems: "center",
                shadowColor: sage,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.3,
                shadowRadius: 20,
                elevation: 8,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.sansSemiBold,
                  fontSize: 17,
                  color: white,
                }}
              >
                Begin
              </Text>
            </Pressable>
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN 4: Add First Person
// ═══════════════════════════════════════════════════════════════════════════════

interface AddFirstPersonProps {
  insets: { top: number; bottom: number };
  name: string;
  onNameChange: (name: string) => void;
  onNext: () => void;
  onSkip: () => void;
}

function AddFirstPersonScreen({
  insets,
  name,
  onNameChange,
  onNext,
  onSkip,
}: AddFirstPersonProps) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: cream,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      <View style={{ flex: 1, paddingHorizontal: 24 }}>
        {/* Illustration */}
        <View style={{ alignItems: "center", marginTop: 40, marginBottom: 8 }}>
          <SeedIllustration size={140} />
        </View>

        {/* Title */}
        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize: 32,
            color: nearBlack,
            lineHeight: 40,
            marginBottom: 12,
          }}
        >
          Who matters most to you?
        </Text>
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 16,
            color: warmGray,
            lineHeight: 24,
            marginBottom: 40,
          }}
        >
          Start with just one person
        </Text>

        {/* Name Field */}
        <View style={{ marginBottom: 24 }}>
          <Text
            style={{
              fontFamily: fonts.sansSemiBold,
              fontSize: 13,
              color: warmGray,
              marginBottom: 10,
            }}
          >
            Name
          </Text>
          <RNTextInput
            value={name}
            onChangeText={onNameChange}
            placeholder="Jake"
            placeholderTextColor={warmGray}
            style={{
              backgroundColor: white,
              borderWidth: 1.5,
              borderColor: borderColor,
              borderRadius: 16,
              paddingHorizontal: 18,
              paddingVertical: 18,
              fontFamily: fonts.sans,
              fontSize: 17,
              color: nearBlack,
            }}
          />
        </View>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* CTA */}
        <View style={{ paddingBottom: 20 }}>
          <Pressable
            onPress={onNext}
            style={{
              backgroundColor: sage,
              borderRadius: 16,
              paddingVertical: 18,
              alignItems: "center",
              shadowColor: sage,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.3,
              shadowRadius: 20,
              elevation: 8,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.sansSemiBold,
                fontSize: 17,
                color: white,
              }}
            >
              Continue
            </Text>
          </Pressable>

          <Pressable onPress={onSkip} style={{ alignItems: "center", marginTop: 18 }}>
            <Text
              style={{
                fontFamily: fonts.sansMedium,
                fontSize: 15,
                color: warmGray,
                padding: 10,
              }}
            >
              Skip
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN 5: Optional Memory Prompt
// ═══════════════════════════════════════════════════════════════════════════════

interface AddMemoryScreenProps {
  insets: { top: number; bottom: number };
  personName: string;
  onNext: () => void;
  onSkip: () => void;
}

function AddMemoryScreen({ insets, personName, onNext, onSkip }: AddMemoryScreenProps) {
  const [memoryText, setMemoryText] = useState("");

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: cream,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <View style={{ marginTop: 60, marginBottom: 32 }}>
          <Text
            style={{
              fontFamily: fonts.serif,
              fontSize: 30,
              color: nearBlack,
              lineHeight: 38,
              marginBottom: 12,
            }}
          >
            Do you have a favorite moment with {personName}?
          </Text>
          <Text
            style={{
              fontFamily: fonts.sans,
              fontSize: 15,
              color: warmGray,
              lineHeight: 24,
            }}
          >
            Add a photo or write about a memory
          </Text>
        </View>

        {/* Photo Picker Area */}
        <Pressable
          style={{
            backgroundColor: sagePale,
            borderWidth: 2,
            borderColor: sageLight,
            borderStyle: "dashed",
            borderRadius: 24,
            paddingVertical: 56,
            paddingHorizontal: 24,
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: white,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: sage,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.12,
              shadowRadius: 20,
              elevation: 4,
              marginBottom: 16,
            }}
          >
            <Camera size={32} color={sage} strokeWidth={1.75} />
          </View>
          <Text
            style={{
              fontFamily: fonts.sansMedium,
              fontSize: 16,
              color: sageDark,
              textAlign: "center",
              marginBottom: 4,
            }}
          >
            Tap to add a photo
          </Text>
          <Text
            style={{
              fontFamily: fonts.sans,
              fontSize: 13,
              color: warmGray,
              textAlign: "center",
              lineHeight: 20,
            }}
          >
            Or write about your memory below
          </Text>
        </Pressable>

        {/* Text Field */}
        <RNTextInput
          placeholder="What happened? How did it feel?"
          placeholderTextColor={warmGray}
          value={memoryText}
          onChangeText={setMemoryText}
          multiline
          textAlignVertical="top"
          style={{
            backgroundColor: white,
            borderWidth: 1.5,
            borderColor: borderColor,
            borderRadius: 16,
            paddingHorizontal: 18,
            paddingVertical: 18,
            fontFamily: fonts.sans,
            fontSize: 16,
            color: nearBlack,
            minHeight: 120,
            marginBottom: 24,
          }}
        />

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* CTA */}
        <View style={{ paddingBottom: 20 }}>
          <Pressable
            onPress={onNext}
            style={{
              backgroundColor: sage,
              borderRadius: 16,
              paddingVertical: 18,
              alignItems: "center",
              shadowColor: sage,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.3,
              shadowRadius: 20,
              elevation: 8,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.sansSemiBold,
                fontSize: 17,
                color: white,
              }}
            >
              Add Memory
            </Text>
          </Pressable>

          <Pressable onPress={onSkip} style={{ alignItems: "center", marginTop: 18 }}>
            <Text
              style={{
                fontFamily: fonts.sansMedium,
                fontSize: 15,
                color: warmGray,
                padding: 10,
              }}
            >
              Skip
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN 6: Dashboard Entry (first time)
// ═══════════════════════════════════════════════════════════════════════════════

interface DashboardEntryScreenProps {
  insets: { top: number; bottom: number };
  personName: string;
  onFinish: () => void;
}

function DashboardEntryScreen({
  insets,
  personName,
  onFinish,
}: DashboardEntryScreenProps) {
  const suggestions = [
    { icon: "\uD83C\uDFAF", text: `Add interests for ${personName}` },
    { icon: "\uD83D\uDCF8", text: "Save your first memory" },
    { icon: "\uD83C\uDF31", text: "Add another person" },
  ];

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: cream,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 24,
          paddingTop: 16,
          paddingBottom: 24,
        }}
      >
        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize: 28,
            color: nearBlack,
          }}
        >
          Today
        </Text>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: sagePale,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 18 }}>{"\uD83D\uDC64"}</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
      >
        {/* Garden Growth Widget */}
        <LinearGradient
          colors={[white, sagePale]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 28,
            padding: 28,
            paddingHorizontal: 24,
            borderWidth: 1,
            borderColor: sage + "22",
            shadowColor: sage,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.15,
            shadowRadius: 24,
            elevation: 6,
            marginBottom: 28,
          }}
        >
          {/* Illustration */}
          <View style={{ alignItems: "center", marginBottom: 24 }}>
            <GardenGrowthIllustration size={110} />
          </View>

          {/* Title */}
          <Text
            style={{
              fontFamily: fonts.serif,
              fontSize: 24,
              color: nearBlack,
              textAlign: "center",
              lineHeight: 31,
              marginBottom: 24,
            }}
          >
            Help your garden grow
          </Text>

          {/* Suggestion Items */}
          <View style={{ gap: 12 }}>
            {suggestions.map((item, i) => (
              <Pressable
                key={i}
                onPress={i === 2 ? onFinish : undefined}
                style={{
                  backgroundColor: white,
                  borderWidth: 1,
                  borderColor: sage + "22",
                  borderRadius: 16,
                  paddingVertical: 16,
                  paddingHorizontal: 18,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <Text style={{ fontSize: 22 }}>{item.icon}</Text>
                <Text
                  style={{
                    fontFamily: fonts.sansMedium,
                    fontSize: 15,
                    color: nearBlack,
                    flex: 1,
                  }}
                >
                  {item.text}
                </Text>
                <ChevronRight size={20} color={warmGray} style={{ opacity: 0.5 }} />
              </Pressable>
            ))}
          </View>
        </LinearGradient>

        {/* Your Garden Section */}
        <Text
          style={{
            fontFamily: fonts.sansSemiBold,
            fontSize: 11,
            color: warmGray,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 16,
          }}
        >
          Your Garden
        </Text>

        {/* Person Card */}
        <View
          style={{
            backgroundColor: white,
            borderRadius: 18,
            padding: 18,
            borderWidth: 1,
            borderColor: borderColor,
            flexDirection: "row",
            gap: 14,
            marginBottom: 16,
          }}
        >
          <LinearGradient
            colors={[sageLight, sage]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 28 }}>
              {personName
                ? personName.charAt(0).toUpperCase()
                : "\uD83D\uDC68\uD83C\uDFFB\u200D\uD83D\uDCBC"}
            </Text>
          </LinearGradient>
          <View style={{ flex: 1, justifyContent: "center" }}>
            <Text
              style={{
                fontFamily: fonts.sansSemiBold,
                fontSize: 17,
                color: nearBlack,
                marginBottom: 4,
              }}
            >
              {personName || "Someone"}
            </Text>
            <Text
              style={{
                fontFamily: fonts.sans,
                fontSize: 14,
                color: warmGray,
              }}
            >
              Friend
            </Text>
          </View>
        </View>

        {/* Empty memory state */}
        <View
          style={{
            backgroundColor: white,
            borderRadius: 18,
            paddingVertical: 40,
            paddingHorizontal: 24,
            borderWidth: 1,
            borderColor: borderColor,
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.sans,
              fontSize: 15,
              color: warmGray,
            }}
          >
            Your memories will appear here
          </Text>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View
        style={{
          paddingHorizontal: 24,
          paddingVertical: 16,
          borderTopWidth: 1,
          borderTopColor: borderColor,
          backgroundColor: cream,
        }}
      >
        <Pressable
          onPress={onFinish}
          style={{
            backgroundColor: sage,
            borderRadius: 16,
            paddingVertical: 18,
            alignItems: "center",
            shadowColor: sage,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3,
            shadowRadius: 20,
            elevation: 8,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.sansSemiBold,
              fontSize: 17,
              color: white,
            }}
          >
            Enter your garden
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
