/**
 * Onboarding Flow — 6 screens
 *
 * S1-S3: Photo carousel (swipe/tap navigation)
 * S4: Add first person (name input)
 * S5: Optional memory prompt (photo + text)
 * S5.5: Memory celebration (reusable component)
 * S6: → Navigate to home (dashboard)
 */
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  TextInput as RNTextInput,
  Dimensions,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  interpolate,
  SharedValue,
} from "react-native-reanimated";
import { Camera, ChevronLeft, ChevronRight } from "lucide-react-native";
import { colors, fonts } from "@design/tokens";
import { MemoryCelebration } from "@/components/MemoryCelebration";

const { width: SCREEN_W } = Dimensions.get("window");

// ─── Design Tokens ──────────────────────────────────────────────────────────

const sage = colors.sage;
const sageDark = colors.moss;
const sagePale = colors.sagePale;
const sageLight = colors.sageLight;
const gold = colors.gold;
const cream = colors.cream;
const nearBlack = colors.nearBlack;
const warmGray = colors.warmGray;
const white = colors.white;

// ─── Carousel Photos (Unsplash) ─────────────────────────────────────────────

const CAROUSEL_SLIDES = [
  {
    photo:
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=900&q=80",
    headline: "Life moves fast.",
    subtitle: "It's easy to lose touch with people who matter most.",
  },
  {
    photo:
      "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=900&q=80",
    headline: "Moments fade\nquietly.",
    subtitle: "The photos stay. The feelings don't always.",
  },
  {
    photo:
      "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=900&q=80",
    headline: "Kinship helps your\nrelationships grow.",
    subtitle: "Stay close in the moments that matter.",
  },
];

// ─── Shared Primitives ──────────────────────────────────────────────────────

function SageBtn({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={{ width: "100%", borderRadius: 18, overflow: "hidden" }}
    >
      <LinearGradient
        colors={disabled ? [sagePale, sagePale] : [sage, sageDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingVertical: 15,
          alignItems: "center",
          borderRadius: 18,
          shadowColor: disabled ? "transparent" : sage,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: disabled ? 0 : 0.27,
          shadowRadius: 18,
          elevation: disabled ? 0 : 6,
        }}
      >
        <Text
          style={{
            fontFamily: fonts.sansSemiBold,
            fontSize: 15,
            color: disabled ? warmGray : white,
          }}
        >
          {label}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

function TxtLink({
  label,
  onPress,
  color = warmGray,
}: {
  label: string;
  onPress?: () => void;
  color?: string;
}) {
  return (
    <Pressable onPress={onPress} style={{ paddingVertical: 8 }}>
      <Text
        style={{
          fontFamily: fonts.sans,
          fontSize: 14,
          color,
          textDecorationLine: "underline",
          textDecorationColor: "#D4CECA",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Page Dots ──────────────────────────────────────────────────────────────

function PageDots({ count, active }: { count: number; active: number }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "center",
        gap: 8,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            width: i === active ? 20 : 7,
            height: 7,
            borderRadius: 3.5,
            backgroundColor: i === active ? white : "rgba(255,255,255,0.45)",
          }}
        />
      ))}
    </View>
  );
}

// ─── Chevron Button ─────────────────────────────────────────────────────────

function ChevronBtn({
  direction,
  onPress,
}: {
  direction: "left" | "right";
  onPress: () => void;
}) {
  const Icon = direction === "left" ? ChevronLeft : ChevronRight;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={16}
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "rgba(255,255,255,0.18)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.25)",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon size={20} strokeWidth={2} color={white} />
    </Pressable>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREENS 1-3 — Photo Carousel
// ═══════════════════════════════════════════════════════════════════════════

function CarouselScreen({
  onBegin,
  insets,
}: {
  onBegin: () => void;
  insets: { top: number; bottom: number };
}) {
  const [slide, setSlide] = useState(0);

  // Fade transition
  const fadeOpacity = useSharedValue(1);
  const fadeTranslateY = useSharedValue(0);

  const animateTransition = useCallback(
    (nextSlide: number) => {
      fadeOpacity.value = withTiming(0, { duration: 150 }, () => {
        fadeOpacity.value = withTiming(1, { duration: 300 });
        fadeTranslateY.value = 10;
        fadeTranslateY.value = withTiming(0, { duration: 300 });
      });
      setTimeout(() => setSlide(nextSlide), 150);
    },
    [fadeOpacity, fadeTranslateY]
  );

  const goNext = () => {
    if (slide < CAROUSEL_SLIDES.length - 1) {
      animateTransition(slide + 1);
    }
  };
  const goPrev = () => {
    if (slide > 0) {
      animateTransition(slide - 1);
    }
  };

  const current = CAROUSEL_SLIDES[slide];
  const isLast = slide === CAROUSEL_SLIDES.length - 1;

  const textStyle = useAnimatedStyle(() => ({
    opacity: fadeOpacity.value,
    transform: [{ translateY: fadeTranslateY.value }],
  }));

  return (
    <View style={{ flex: 1, backgroundColor: nearBlack }}>
      {/* Background photo */}
      <Image
        source={{ uri: current.photo }}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
        }}
        resizeMode="cover"
      />
      {/* Dark gradient overlay */}
      <LinearGradient
        colors={[
          "rgba(0,0,0,0.05)",
          "rgba(0,0,0,0.25)",
          "rgba(0,0,0,0.72)",
        ]}
        locations={[0, 0.45, 1]}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
        }}
      />

      {/* Content */}
      <View
        style={{
          flex: 1,
          justifyContent: "flex-end",
          paddingHorizontal: 28,
          paddingBottom: insets.bottom + 28,
        }}
      >
        <Animated.View style={textStyle}>
          <Text
            style={{
              fontFamily: fonts.serif,
              fontSize: isLast ? 32 : 34,
              color: white,
              lineHeight: isLast ? 40 : 42,
              marginBottom: 10,
            }}
          >
            {current.headline}
          </Text>
          <Text
            style={{
              fontFamily: fonts.sans,
              fontSize: 15,
              color: "rgba(255,255,255,0.78)",
              lineHeight: 24,
              marginBottom: 28,
              maxWidth: 300,
            }}
          >
            {current.subtitle}
          </Text>
        </Animated.View>

        {/* Navigation row */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <View style={{ width: 44 }}>
            {slide > 0 && <ChevronBtn direction="left" onPress={goPrev} />}
          </View>

          <PageDots count={CAROUSEL_SLIDES.length} active={slide} />

          <View style={{ width: 44 }}>
            {!isLast && <ChevronBtn direction="right" onPress={goNext} />}
          </View>
        </View>

        {/* Begin button on last slide */}
        {isLast && (
          <View style={{ marginTop: 16 }}>
            <SageBtn label="Begin" onPress={onBegin} />
          </View>
        )}
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN 4 — Add First Person
// ═══════════════════════════════════════════════════════════════════════════

function AddFirstPersonScreen({
  name,
  setName,
  onContinue,
  insets,
}: {
  name: string;
  setName: (v: string) => void;
  onContinue: () => void;
  insets: { top: number; bottom: number };
}) {
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: cream }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + 60,
          paddingHorizontal: 28,
        }}
      >
        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize: 30,
            color: nearBlack,
            lineHeight: 38,
            marginBottom: 8,
          }}
        >
          Who matters most{"\n"}to you?
        </Text>
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 15,
            color: warmGray,
            lineHeight: 23,
            marginBottom: 36,
          }}
        >
          Start with just one person.
        </Text>

        {/* Name field */}
        <View style={{ marginBottom: 24 }}>
          <Text
            style={{
              fontFamily: fonts.sansSemiBold,
              fontSize: 11,
              color: warmGray,
              textTransform: "uppercase",
              letterSpacing: 0.7,
              marginBottom: 8,
            }}
          >
            Name
          </Text>
          <View
            style={{
              backgroundColor: white,
              borderWidth: 1.5,
              borderColor: "#F0EBE3",
              borderRadius: 14,
              paddingHorizontal: 16,
              paddingVertical: 14,
            }}
          >
            <RNTextInput
              value={name}
              onChangeText={setName}
              placeholder="Jake"
              placeholderTextColor="#C4BBB0"
              autoCapitalize="words"
              autoFocus
              style={{
                fontFamily: fonts.sans,
                fontSize: 16,
                color: nearBlack,
                padding: 0,
              }}
            />
          </View>
        </View>
      </View>

      <View
        style={{
          paddingHorizontal: 28,
          paddingBottom: insets.bottom + 44,
        }}
      >
        <SageBtn
          label="Continue"
          onPress={onContinue}
          disabled={name.trim().length === 0}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN 5 — Optional Memory Prompt
// ═══════════════════════════════════════════════════════════════════════════

function MemoryPromptScreen({
  personName,
  onAddMemory,
  onSkip,
  insets,
}: {
  personName: string;
  onAddMemory: (photoUri: string | null) => void;
  onSkip: () => void;
  insets: { top: number; bottom: number };
}) {
  const [hasPhoto, setHasPhoto] = useState(false);
  const [memoryText, setMemoryText] = useState("");

  // For prototype, use Unsplash image as "uploaded photo"
  const protoPhotoUri =
    "https://images.unsplash.com/photo-1543269865-cbf427effbad?w=800&q=80";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: cream }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 36,
          paddingHorizontal: 24,
          paddingBottom: 20,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize: 26,
            color: nearBlack,
            lineHeight: 33,
            marginBottom: 6,
          }}
        >
          Do you have a favorite{"\n"}moment with {personName}?
        </Text>
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 14,
            color: warmGray,
            lineHeight: 22,
            marginBottom: 28,
          }}
        >
          Add a photo or write about a memory.
        </Text>

        {/* Photo upload area */}
        <Pressable
          onPress={() => setHasPhoto(!hasPhoto)}
          style={{
            borderWidth: 2,
            borderColor: hasPhoto ? sageLight : "#E0DCD4",
            borderStyle: "dashed",
            borderRadius: 20,
            backgroundColor: hasPhoto ? undefined : sagePale,
            overflow: "hidden",
            marginBottom: 20,
          }}
        >
          {hasPhoto ? (
            <Image
              source={{ uri: protoPhotoUri }}
              style={{ width: "100%", height: 200 }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{
                paddingVertical: 44,
                alignItems: "center",
                gap: 10,
              }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: white,
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: sage,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.12,
                  shadowRadius: 12,
                  elevation: 2,
                }}
              >
                <Camera size={24} strokeWidth={1.75} color={sage} />
              </View>
              <Text
                style={{
                  fontFamily: fonts.sansMedium,
                  fontSize: 14,
                  color: sageDark,
                }}
              >
                Tap to add a photo
              </Text>
            </View>
          )}
        </Pressable>

        {/* Divider */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            marginBottom: 18,
          }}
        >
          <View
            style={{
              flex: 1,
              height: 1,
              backgroundColor: "#F0EBE3",
            }}
          />
          <Text
            style={{
              fontFamily: fonts.sans,
              fontSize: 12,
              color: warmGray,
            }}
          >
            Or write about your memory below
          </Text>
          <View
            style={{
              flex: 1,
              height: 1,
              backgroundColor: "#F0EBE3",
            }}
          />
        </View>

        {/* Text area */}
        <View
          style={{
            backgroundColor: white,
            borderWidth: 1.5,
            borderColor: "#F0EBE3",
            borderRadius: 16,
            padding: 14,
            minHeight: 100,
            marginBottom: 12,
          }}
        >
          <RNTextInput
            value={memoryText}
            onChangeText={setMemoryText}
            placeholder="What happened? How did it feel?"
            placeholderTextColor="#C4BBB0"
            multiline
            textAlignVertical="top"
            style={{
              fontFamily: fonts.sans,
              fontSize: 15,
              color: nearBlack,
              lineHeight: 23,
              padding: 0,
              minHeight: 80,
            }}
          />
        </View>
      </ScrollView>

      <View
        style={{
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 36,
          gap: 6,
        }}
      >
        <SageBtn
          label="Add Memory"
          onPress={() => onAddMemory(hasPhoto ? protoPhotoUri : null)}
          disabled={!hasPhoto && memoryText.trim().length === 0}
        />
        <View style={{ alignItems: "center", marginTop: 4 }}>
          <TxtLink label="Skip for now" onPress={onSkip} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN — Onboarding Router
// ═══════════════════════════════════════════════════════════════════════════

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [personName, setPersonName] = useState("");
  const [memoryPhotoUri, setMemoryPhotoUri] = useState<string | null>(null);

  const screenInsets = { top: insets.top, bottom: insets.bottom };

  const goHome = useCallback(() => {
    router.replace("/(tabs)");
  }, []);

  switch (step) {
    // S1-S3: Carousel
    case 0:
      return (
        <CarouselScreen
          onBegin={() => setStep(1)}
          insets={screenInsets}
        />
      );

    // S4: Add first person
    case 1:
      return (
        <AddFirstPersonScreen
          name={personName}
          setName={setPersonName}
          onContinue={() => setStep(2)}
          insets={screenInsets}
        />
      );

    // S5: Optional memory prompt
    case 2:
      return (
        <MemoryPromptScreen
          personName={personName || "them"}
          onAddMemory={(photoUri) => {
            setMemoryPhotoUri(photoUri);
            setStep(3);
          }}
          onSkip={goHome}
          insets={screenInsets}
        />
      );

    // S5.5: Memory celebration
    case 3:
      return (
        <MemoryCelebration
          personName={personName || "them"}
          photoUri={memoryPhotoUri}
          memoryCount={1}
          onContinue={goHome}
        />
      );

    default:
      return null;
  }
}
