import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  TextInput as RNTextInput,
  Dimensions,
  ImageBackground,
  ScrollView,
  PanResponder,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Camera, ChevronRight } from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  Easing,
  FadeIn,
  FadeOut,
  FadeInUp,
} from "react-native-reanimated";
import { colors, fonts } from "@design/tokens";
import { Button } from "@/components/ui";
import { usePersons, useCreateMemory } from "@/hooks";
import { recordMemoryGrowth } from "@/lib/growthEngine";
import { markOnboardingComplete } from "@/lib/onboardingStatus";
import {
  GardenGrowthIllustration,
  SeedIllustration,
  SingleSproutIllustration,
  SuccessIllustration,
} from "@/components/illustrations";
import GrowthPlantIllustration from "@/components/GrowthPlantIllustration";

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
    headline: "You're the kind of person who shows up",
    subtext: "Kinship helps you stay close with the people who matter most",
    showCTA: false,
  },
  {
    headline: "The friend who always remembered",
    subtext: "Capture moments, notice what matters, tend to what grows",
    showCTA: false,
  },
  {
    headline: "Your relationships deserve to grow",
    subtext: "Start with one person. Watch what happens.",
    showCTA: true,
  },
];

// Warm full-bleed photos for the carousel (restored from the original design).
const slideImages = [
  "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=900&q=80",
  "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=900&q=80",
  "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=900&q=80",
];

// ─── Onboarding Screens Enum ────────────────────────────────────────────────

type OnboardingScreen = "carousel" | "addPerson" | "dreamPreview" | "addMemory" | "dashboard";

// ─── Shared Animation Helpers ───────────────────────────────────────────────

/**
 * Gentle settle-in (soft overshoot) followed by a continuous, calm sway —
 * borrowed from the plant-rest stage on the loading screen.
 */
function SettleSwayIllustration({
  children,
  settleDuration = 700,
  swayDeg = 2.5,
  swayDuration = 2500,
}: {
  children: React.ReactNode;
  settleDuration?: number;
  swayDeg?: number;
  swayDuration?: number;
}) {
  const scale = useSharedValue(0.6);
  const sway = useSharedValue(0);

  useEffect(() => {
    scale.value = withTiming(1, {
      duration: settleDuration,
      easing: Easing.out(Easing.back(1.7)),
    });
    sway.value = withDelay(
      settleDuration,
      withRepeat(
        withSequence(
          withTiming(swayDeg, {
            duration: swayDuration / 2,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(-swayDeg, {
            duration: swayDuration / 2,
            easing: Easing.inOut(Easing.ease),
          })
        ),
        -1,
        true
      )
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${sway.value}deg` }],
  }));

  return <Animated.View style={animStyle}>{children}</Animated.View>;
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState<OnboardingScreen>("carousel");
  const [personName, setPersonName] = useState("");
  const personIdRef = useRef<string | null>(null);
  const { createPerson } = usePersons();
  const { createMemory } = useCreateMemory();

  // Plant the first person for real — onboarding used to be visual-only,
  // so the name the user typed never reached their garden.
  const handlePersonNext = useCallback(async () => {
    setScreen("dreamPreview");
    const name = personName.trim();
    if (!name || personIdRef.current) return;
    try {
      const person = await createPerson({
        name,
        relationship_type: "friend",
        photo_url: null,
      });
      personIdRef.current = person.id;
    } catch {
      // Planting failed — the user can re-add from the garden tab.
    }
  }, [personName, createPerson]);

  const handleMemorySave = useCallback(
    async (content: string, photoUri: string | null) => {
      setScreen("dashboard");
      const personId = personIdRef.current;
      const trimmed = content.trim();
      if (!personId || (!trimmed && !photoUri)) return;
      try {
        const memory = await createMemory({
          person_id: personId,
          content: trimmed,
          emotion: null,
          photo_url: photoUri,
        });
        recordMemoryGrowth(personId, memory);
      } catch {
        // Memory save failed — the celebration still plays; the user
        // can capture it again from the Tend sheet.
      }
    },
    [createMemory]
  );

  const handleFinish = useCallback(async () => {
    await markOnboardingComplete();
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
          onNext={handlePersonNext}
          onSkip={() => setScreen("dashboard")}
        />
      );
    case "dreamPreview":
      return (
        <DreamPreviewScreen
          insets={insets}
          personName={personName || "them"}
          onNext={() => setScreen("addMemory")}
        />
      );
    case "addMemory":
      return (
        <AddMemoryScreen
          insets={insets}
          personName={personName || "them"}
          onSave={handleMemorySave}
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

/** One full-bleed slide photo that cross-fades in/out as the slide changes. */
function CarouselSlideImage({ uri, visible }: { uri: string; visible: boolean }) {
  const opacity = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, {
      duration: 600,
      easing: Easing.inOut(Easing.ease),
    });
  }, [visible]);

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
        fadeStyle,
      ]}
    >
      <ImageBackground source={{ uri }} style={{ flex: 1 }} resizeMode="cover" />
    </Animated.View>
  );
}

function CarouselScreen({ insets, onNext }: CarouselScreenProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 10,
      onPanResponderRelease: (_, gestureState) => {
        if (Math.abs(gestureState.dx) > 50) {
          if (gestureState.dx < 0) {
            setCurrentSlide((prev) => Math.min(prev + 1, slides.length - 1));
          } else if (gestureState.dx > 0) {
            setCurrentSlide((prev) => Math.max(prev - 1, 0));
          }
        }
      },
    })
  ).current;

  // Warm gradient base — shown behind each photo while it loads.
  const slideColors: [string, string][] = [
    ["#6B8E7B", "#3A5B4A"],
    ["#8B7E6A", "#5A4D3A"],
    ["#7A9E7E", "#4A7055"],
  ];

  return (
    <View style={{ flex: 1, backgroundColor: cream }} {...panResponder.panHandlers}>
      <LinearGradient
        colors={slideColors[currentSlide]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Full-bleed photos, cross-fading between slides */}
      {slideImages.map((uri, i) => (
        <CarouselSlideImage key={uri} uri={uri} visible={i === currentSlide} />
      ))}

      {/* Dark overlay on bottom for text legibility */}
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

        {/* Text slides up + fades in on every slide change */}
        <Animated.View
          key={currentSlide}
          entering={FadeInUp.duration(500).easing(Easing.out(Easing.cubic))}
        >
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
        </Animated.View>
      </View>
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
        {/* Illustration — settles in with a soft overshoot, then sways gently */}
        <View style={{ alignItems: "center", marginTop: 40, marginBottom: 8 }}>
          <SettleSwayIllustration settleDuration={700} swayDeg={2.5} swayDuration={2500}>
            <SeedIllustration size={140} />
          </SettleSwayIllustration>
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
  onSave: (content: string, photoUri: string | null) => void;
  onSkip: () => void;
}

function AddMemoryScreen({ insets, personName, onSave, onSkip }: AddMemoryScreenProps) {
  const [memoryText, setMemoryText] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const pickPhoto = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch {
      // Picker unavailable — text-only memory still works.
    }
  }, []);

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
        {photoUri ? (
          <Pressable onPress={pickPhoto} style={{ marginBottom: 24 }}>
            <Image
              source={{ uri: photoUri }}
              style={{ width: "100%", height: 220, borderRadius: 24 }}
              resizeMode="cover"
            />
          </Pressable>
        ) : (
        <Pressable
          onPress={pickPhoto}
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
        )}

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
            onPress={() => onSave(memoryText, photoUri)}
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
// SCREEN 5b: Dream Outcome Preview
// ═══════════════════════════════════════════════════════════════════════════════

interface DreamPreviewScreenProps {
  insets: { top: number; bottom: number };
  personName: string;
  onNext: () => void;
}

/** Final grow stage: bloom settles in with a spring, then sways gently. */
function BloomSettle({ size }: { size: number }) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.7);
  const sway = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });
    scale.value = withSpring(1, { damping: 10, stiffness: 120 });
    sway.value = withDelay(
      900,
      withRepeat(
        withSequence(
          withTiming(2, { duration: 1250, easing: Easing.inOut(Easing.ease) }),
          withTiming(-2, { duration: 1250, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { rotate: `${sway.value}deg` }],
  }));

  return (
    <Animated.View style={animStyle}>
      <GrowthPlantIllustration stage="blooming" size={size} />
    </Animated.View>
  );
}

/**
 * Plant grows in over ~1.8s: seed → sprout → bloom, coarse stage steps
 * like loading.tsx, with cross-fades between stages.
 */
function GrowingBloomIllustration({ size }: { size: number }) {
  const [growStage, setGrowStage] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setGrowStage(1), 600),
      setTimeout(() => setGrowStage(2), 1200),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const stageWrap = {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  };

  return (
    <View style={{ width: size, height: size }}>
      {growStage === 0 && (
        <Animated.View
          style={stageWrap}
          entering={FadeIn.duration(250)}
          exiting={FadeOut.duration(250)}
        >
          <SeedIllustration size={size * 0.7} />
        </Animated.View>
      )}
      {growStage === 1 && (
        <Animated.View
          style={stageWrap}
          entering={FadeIn.duration(250)}
          exiting={FadeOut.duration(250)}
        >
          <SingleSproutIllustration size={size * 0.8} />
        </Animated.View>
      )}
      {growStage === 2 && (
        <View style={stageWrap}>
          <BloomSettle size={size} />
        </View>
      )}
    </View>
  );
}

function DreamPreviewScreen({ insets, personName, onNext }: DreamPreviewScreenProps) {
  const displayName = personName === "them" ? "someone you love" : personName;
  const firstName = personName === "them" ? "them" : personName.split(" ")[0];

  const sampleMemories = [
    { emoji: "☕", text: `That long coffee catch-up with ${firstName}` },
    { emoji: "🎉", text: `Celebrating ${firstName}'s big news` },
    { emoji: "🌧️", text: `The late night call when ${firstName} needed to talk` },
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
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Plant illustration — grows seed → sprout → bloom into the future state */}
        <View style={{ alignItems: "center", marginTop: 40, marginBottom: 8 }}>
          <GrowingBloomIllustration size={120} />
        </View>

        {/* Stage label */}
        <Text
          style={{
            fontFamily: fonts.sansMedium,
            fontSize: 12,
            color: sage,
            textAlign: "center",
            textTransform: "uppercase",
            letterSpacing: 1,
            marginBottom: 20,
          }}
        >
          Blooming · Stage 5 of 6
        </Text>

        {/* Headline */}
        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize: 28,
            color: nearBlack,
            lineHeight: 36,
            textAlign: "center",
            marginBottom: 10,
          }}
        >
          This is {displayName}'s plant in a few months
        </Text>
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 15,
            color: warmGray,
            lineHeight: 23,
            textAlign: "center",
            marginBottom: 32,
          }}
        >
          Every memory you capture helps it grow. Here's what your garden story could look like.
        </Text>

        {/* Sample memories preview */}
        <Text
          style={{
            fontFamily: fonts.sansSemiBold,
            fontSize: 11,
            color: warmGray,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 12,
          }}
        >
          Moments you might capture
        </Text>
        <View style={{ gap: 10, marginBottom: 32 }}>
          {sampleMemories.map((m, i) => (
            <View
              key={i}
              style={{
                backgroundColor: white,
                borderRadius: 14,
                paddingVertical: 14,
                paddingHorizontal: 16,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                borderWidth: 1,
                borderColor: borderColor,
              }}
            >
              <Text style={{ fontSize: 20 }}>{m.emoji}</Text>
              <Text
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 14,
                  color: nearBlack,
                  flex: 1,
                  lineHeight: 20,
                }}
              >
                {m.text}
              </Text>
            </View>
          ))}
        </View>

        {/* Identity statement */}
        <View
          style={{
            backgroundColor: sagePale,
            borderRadius: 16,
            paddingVertical: 18,
            paddingHorizontal: 20,
            marginBottom: 32,
            borderWidth: 1,
            borderColor: sageLight,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.sansMedium,
              fontSize: 15,
              color: sageDark,
              lineHeight: 22,
              textAlign: "center",
            }}
          >
            You'll be the friend {firstName === "them" ? "they" : firstName} thinks of when someone asks{" "}
            <Text style={{ fontFamily: fonts.sansSemiBold }}>"who always shows up?"</Text>
          </Text>
        </View>
      </ScrollView>

      {/* CTA */}
      <View
        style={{
          paddingHorizontal: 24,
          paddingBottom: Math.max(insets.bottom, 16) + 8,
        }}
      >
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
            Add your first memory with {firstName}
          </Text>
        </Pressable>
      </View>
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
          {/* Illustration — gentle scale-in, then a calm sway loop */}
          <View style={{ alignItems: "center", marginBottom: 24 }}>
            <SettleSwayIllustration settleDuration={650} swayDeg={2} swayDuration={2800}>
              <GardenGrowthIllustration size={110} />
            </SettleSwayIllustration>
          </View>

          {/* Title */}
          <Animated.View entering={FadeInUp.duration(450).delay(200)}>
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
          </Animated.View>

          {/* Suggestion Items */}
          <Animated.View entering={FadeInUp.duration(450).delay(350)} style={{ gap: 12 }}>
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
          </Animated.View>
        </LinearGradient>

        {/* Your Garden Section */}
        <Animated.View entering={FadeInUp.duration(450).delay(500)}>
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
        </Animated.View>
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
