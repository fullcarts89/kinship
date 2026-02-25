/**
 * Add Photo Memory — 4-Screen Photo Memory Capture Flow
 *
 * S1 (step 0): Add Photo — image picker, person selector, title, note, AI assist
 * S2 (step 1): AI Loading — arc spinner, sparkles, fading dots, privacy
 * S3 (step 2): AI Suggestion — editable description, Use this / Try again / Dismiss
 * S4 (step 3): Memory Saved — GardenRevealIllustration, checkmark, back to garden
 *
 * Flow:
 * S1 → S2: Tap "Generate description"
 * S2 → S3: Generation completes (~2.2s)
 * S3 → S1: "Use this" (fills note) or "Dismiss"
 * S3 → S2: "Try again"
 * S1 → S4: Tap "Save memory"
 * S4 → Today Dashboard: Tap "Back to garden"
 */
import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TextInput as RNTextInput,
} from "react-native";
import { useLocalSearchParams, Stack, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated";
import Svg, {
  Circle as SvgCircle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from "react-native-svg";
import {
  Camera,
  X,
  Check,
  Sparkles,
  Shield,
  ChevronDown,
} from "lucide-react-native";
import { colors, fonts } from "@design/tokens";
import { usePersons, useCreateMemory } from "@/hooks";
import { GardenRevealIllustration } from "@/components/illustrations";
import {
  recordMemoryGrowth,
  getTransitionToastMessage,
} from "@/lib/growthEngine";
import { showGrowthToast } from "@/components/ui/GrowthToast";
import type { Person } from "@/types/database";

// ─── Design Tokens ──────────────────────────────────────────────────────────

const sage = colors.sage;
const sageDark = colors.moss;
const sagePale = colors.sagePale;
const sageLight = colors.sageLight;
const gold = colors.gold;
const goldLight = colors.goldLight;
const goldPale = colors.goldPale;
const cream = colors.cream;
const nearBlack = colors.nearBlack;
const warmGray = colors.warmGray;
const white = colors.white;
const borderClr = colors.border;

// ─── Prototype AI Descriptions ──────────────────────────────────────────────

const AI_DESCRIPTIONS = [
  "A warm afternoon spent catching up over coffee, sharing stories about the week and laughing at inside jokes that only the two of you understand.",
  "A beautiful moment of connection — the kind that reminds you why this person matters so much in your life.",
  "Sitting together in comfortable silence, the kind that only comes with people who truly know you.",
  "A spontaneous adventure that turned into one of those golden memories you'll hold onto forever.",
  "One of those rare conversations where time seemed to stand still and everything felt perfectly right.",
];

function getRandomDescription(): string {
  return AI_DESCRIPTIONS[Math.floor(Math.random() * AI_DESCRIPTIONS.length)];
}

// ─── Person Selector Modal ──────────────────────────────────────────────────

function PersonSelectorModal({
  visible,
  persons,
  selectedId,
  onSelect,
  onClose,
}: {
  visible: boolean;
  persons: Person[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)" }}
        onPress={onClose}
      >
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: white,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingTop: 20,
            paddingBottom: insets.bottom + 20,
            paddingHorizontal: 24,
            maxHeight: "60%",
          }}
        >
          {/* Handle */}
          <View
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: borderClr,
              alignSelf: "center",
              marginBottom: 20,
            }}
          />
          <Text
            style={{
              fontFamily: fonts.serif,
              fontSize: 22,
              color: nearBlack,
              marginBottom: 16,
            }}
          >
            Who is this about?
          </Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {persons.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => {
                  onSelect(p.id);
                  onClose();
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 14,
                  borderRadius: 14,
                  marginBottom: 6,
                  backgroundColor:
                    selectedId === p.id ? sagePale : "transparent",
                  borderWidth: selectedId === p.id ? 1 : 0,
                  borderColor: sageLight,
                }}
              >
                {/* Avatar */}
                <LinearGradient
                  colors={[sageLight, sage]}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 18,
                      color: white,
                      fontFamily: fonts.sansSemiBold,
                    }}
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </Text>
                </LinearGradient>
                <Text
                  style={{
                    flex: 1,
                    fontFamily: fonts.sansMedium,
                    fontSize: 16,
                    color: nearBlack,
                  }}
                >
                  {p.name}
                </Text>
                {selectedId === p.id && (
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: sage,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Check size={14} color={white} />
                  </View>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Arc Spinner (AI Loading) ───────────────────────────────────────────────

function ArcSpinner() {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 1400, easing: Easing.linear }),
      -1
    );
  }, []);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const circumference = 2 * Math.PI * 42;

  return (
    <View
      style={{
        width: 100,
        height: 100,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Animated.View style={[{ width: 100, height: 100 }, spinStyle]}>
        <Svg width={100} height={100} viewBox="0 0 100 100">
          <Defs>
            <SvgLinearGradient id="arcGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor={gold} />
              <Stop offset="100%" stopColor={sage} />
            </SvgLinearGradient>
          </Defs>
          <SvgCircle
            cx={50}
            cy={50}
            r={42}
            stroke="url(#arcGrad)"
            strokeWidth={3.5}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference * 0.3} ${circumference * 0.7}`}
          />
        </Svg>
      </Animated.View>
      {/* Sparkles center */}
      <View style={{ position: "absolute" }}>
        <Sparkles size={26} color={gold} />
      </View>
    </View>
  );
}

// ─── Fading Dots ────────────────────────────────────────────────────────────

function FadingDots() {
  const o1 = useSharedValue(0.3);
  const o2 = useSharedValue(0.3);
  const o3 = useSharedValue(0.3);

  useEffect(() => {
    const animate = (
      v: Animated.SharedValue<number>,
      delay: number
    ) => {
      v.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 400 }),
            withTiming(0.3, { duration: 400 })
          ),
          -1
        )
      );
    };
    animate(o1, 0);
    animate(o2, 200);
    animate(o3, 400);
  }, []);

  const s1 = useAnimatedStyle(() => ({ opacity: o1.value }));
  const s2 = useAnimatedStyle(() => ({ opacity: o2.value }));
  const s3 = useAnimatedStyle(() => ({ opacity: o3.value }));

  const dotStyle = {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: warmGray,
    marginHorizontal: 4,
  };

  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Animated.View style={[dotStyle, s1]} />
      <Animated.View style={[dotStyle, s2]} />
      <Animated.View style={[dotStyle, s3]} />
    </View>
  );
}

// ─── S1: Add Photo ──────────────────────────────────────────────────────────

function S1_AddPhoto({
  photoUri,
  person,
  title,
  note,
  onPickPhoto,
  onRemovePhoto,
  onOpenPersonSelector,
  onChangeTitle,
  onChangeNote,
  onGenerateAI,
  onSave,
  onCancel,
  isSaving,
}: {
  photoUri: string | null;
  person: Person | null;
  title: string;
  note: string;
  onPickPhoto: () => void;
  onRemovePhoto: () => void;
  onOpenPersonSelector: () => void;
  onChangeTitle: (v: string) => void;
  onChangeNote: (v: string) => void;
  onGenerateAI: () => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const canSave = !!person && (note.trim().length > 0 || title.trim().length > 0);

  return (
    <>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingVertical: 12,
        }}
      >
        <Pressable onPress={onCancel} hitSlop={12}>
          <Text
            style={{
              fontFamily: fonts.sansMedium,
              fontSize: 15,
              color: warmGray,
            }}
          >
            Cancel
          </Text>
        </Pressable>
        <Text
          style={{
            fontFamily: fonts.sansSemiBold,
            fontSize: 15,
            color: nearBlack,
          }}
        >
          Add memory
        </Text>
        <Pressable
          onPress={onSave}
          disabled={!canSave || isSaving}
          style={{
            backgroundColor: canSave ? sage : sageLight,
            paddingVertical: 7,
            paddingHorizontal: 16,
            borderRadius: 10,
            opacity: canSave && !isSaving ? 1 : 0.5,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.sansSemiBold,
              fontSize: 13,
              color: white,
            }}
          >
            {isSaving ? "Saving..." : "Save"}
          </Text>
        </Pressable>
      </View>

      {/* Scrollable content */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Photo Picker ──────────────────────────────── */}
          {photoUri ? (
            <View
              style={{
                borderRadius: 20,
                overflow: "hidden",
                marginBottom: 20,
                position: "relative",
              }}
            >
              <Image
                source={{ uri: photoUri }}
                style={{ width: "100%", height: 220, borderRadius: 20 }}
                resizeMode="cover"
              />
              <Pressable
                onPress={onRemovePhoto}
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: "rgba(0,0,0,0.45)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={16} color={white} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={onPickPhoto}
              style={{
                height: 180,
                borderRadius: 20,
                borderWidth: 2,
                borderStyle: "dashed",
                borderColor: sageLight,
                backgroundColor: sagePale + "44",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
              }}
            >
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: sagePale,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 10,
                }}
              >
                <Camera size={24} color={sage} />
              </View>
              <Text
                style={{
                  fontFamily: fonts.sansMedium,
                  fontSize: 14,
                  color: sage,
                }}
              >
                Tap to add a photo
              </Text>
              <Text
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 12,
                  color: warmGray,
                  marginTop: 4,
                }}
              >
                Optional — add photos freely
              </Text>
            </Pressable>
          )}

          {/* ── Person Selector ────────────────────────────── */}
          <Pressable
            onPress={onOpenPersonSelector}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: white,
              borderRadius: 14,
              padding: 14,
              borderWidth: 1,
              borderColor: borderClr,
              marginBottom: 16,
            }}
          >
            {person ? (
              <>
                <LinearGradient
                  colors={[sageLight, sage]}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 10,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      color: white,
                      fontFamily: fonts.sansSemiBold,
                    }}
                  >
                    {person.name.charAt(0).toUpperCase()}
                  </Text>
                </LinearGradient>
                <Text
                  style={{
                    flex: 1,
                    fontFamily: fonts.sansMedium,
                    fontSize: 15,
                    color: nearBlack,
                  }}
                >
                  {person.name}
                </Text>
              </>
            ) : (
              <Text
                style={{
                  flex: 1,
                  fontFamily: fonts.sans,
                  fontSize: 15,
                  color: warmGray,
                }}
              >
                Select a person
              </Text>
            )}
            <ChevronDown size={18} color={warmGray} />
          </Pressable>

          {/* ── Title ──────────────────────────────────────── */}
          <RNTextInput
            placeholder="Title (optional)"
            placeholderTextColor={warmGray + "88"}
            value={title}
            onChangeText={onChangeTitle}
            style={{
              fontFamily: fonts.sansMedium,
              fontSize: 18,
              color: nearBlack,
              backgroundColor: white,
              borderRadius: 14,
              padding: 14,
              borderWidth: 1,
              borderColor: borderClr,
              marginBottom: 12,
            }}
          />

          {/* ── Note ───────────────────────────────────────── */}
          <RNTextInput
            placeholder="Write about this moment..."
            placeholderTextColor={warmGray + "88"}
            value={note}
            onChangeText={onChangeNote}
            multiline
            textAlignVertical="top"
            style={{
              fontFamily: fonts.sans,
              fontSize: 15,
              color: nearBlack,
              backgroundColor: white,
              borderRadius: 14,
              padding: 14,
              paddingTop: 14,
              borderWidth: 1,
              borderColor: borderClr,
              minHeight: 100,
              marginBottom: 20,
              lineHeight: 22,
            }}
          />

          {/* ── AI Assist Divider ──────────────────────────── */}
          <View
            style={{
              height: 1,
              backgroundColor: borderClr,
              marginBottom: 20,
            }}
          />

          {/* ── AI Assist Section ──────────────────────────── */}
          <View style={{ alignItems: "center", marginBottom: 12 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginBottom: 12,
              }}
            >
              <Sparkles size={16} color={gold} />
              <Text
                style={{
                  fontFamily: fonts.sansMedium,
                  fontSize: 14,
                  color: nearBlack,
                }}
              >
                Want help describing this moment?
              </Text>
            </View>

            {/* Generate button */}
            <Pressable
              onPress={onGenerateAI}
              disabled={!photoUri}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingVertical: 11,
                paddingHorizontal: 20,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: photoUri ? goldLight : borderClr,
                backgroundColor: photoUri ? goldPale + "55" : "transparent",
                opacity: photoUri ? 1 : 0.5,
              }}
            >
              <Sparkles size={14} color={photoUri ? gold : warmGray} />
              <Text
                style={{
                  fontFamily: fonts.sansSemiBold,
                  fontSize: 13,
                  color: photoUri ? gold : warmGray,
                }}
              >
                Generate description
              </Text>
            </Pressable>

            {/* Privacy note */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                marginTop: 12,
              }}
            >
              <Shield size={12} color={warmGray} />
              <Text
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 11,
                  color: warmGray,
                  lineHeight: 16,
                  flex: 1,
                }}
              >
                Descriptions are generated on-device. Nothing is stored or sent
                to servers.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

// ─── S2: AI Loading ─────────────────────────────────────────────────────────

function S2_AILoading() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 40,
      }}
    >
      {/* Spinner */}
      <ArcSpinner />

      {/* "Thinking..." */}
      <Text
        style={{
          fontFamily: fonts.serif,
          fontSize: 22,
          color: nearBlack,
          marginTop: 28,
          marginBottom: 12,
        }}
      >
        Thinking...
      </Text>

      {/* Fading dots */}
      <FadingDots />

      {/* Privacy note */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          marginTop: 40,
          paddingHorizontal: 20,
        }}
      >
        <Shield size={14} color={warmGray} />
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 12,
            color: warmGray,
            lineHeight: 18,
          }}
        >
          Your photo stays on your device
        </Text>
      </View>
    </View>
  );
}

// ─── S3: AI Suggestion ──────────────────────────────────────────────────────

function S3_AISuggestion({
  suggestion,
  onChangeSuggestion,
  onUseThis,
  onTryAgain,
  onDismiss,
}: {
  suggestion: string;
  onChangeSuggestion: (v: string) => void;
  onUseThis: () => void;
  onTryAgain: () => void;
  onDismiss: () => void;
}) {
  const fadeOpacity = useSharedValue(0);
  const fadeTranslateY = useSharedValue(16);

  useEffect(() => {
    fadeOpacity.value = withTiming(1, { duration: 500 });
    fadeTranslateY.value = withTiming(0, { duration: 500 });
  }, []);

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: fadeOpacity.value,
    transform: [{ translateY: fadeTranslateY.value }],
  }));

  return (
    <View
      style={{
        flex: 1,
        paddingHorizontal: 24,
        justifyContent: "center",
      }}
    >
      <Animated.View style={fadeStyle}>
        {/* AI Suggestion badge */}
        <View
          style={{
            alignSelf: "center",
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: goldPale,
            paddingVertical: 5,
            paddingHorizontal: 12,
            borderRadius: 100,
            marginBottom: 20,
          }}
        >
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: gold,
            }}
          />
          <Text
            style={{
              fontFamily: fonts.sansSemiBold,
              fontSize: 11,
              color: gold,
              textTransform: "uppercase",
              letterSpacing: 0.8,
            }}
          >
            AI Suggestion
          </Text>
        </View>

        {/* Title */}
        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize: 24,
            color: nearBlack,
            textAlign: "center",
            lineHeight: 30,
            marginBottom: 24,
          }}
        >
          Here's a description{"\n"}of that moment
        </Text>

        {/* Editable suggestion block */}
        <View
          style={{
            backgroundColor: goldPale + "66",
            borderRadius: 16,
            borderWidth: 1.5,
            borderColor: goldLight,
            padding: 16,
            marginBottom: 28,
          }}
        >
          <RNTextInput
            value={suggestion}
            onChangeText={onChangeSuggestion}
            multiline
            textAlignVertical="top"
            style={{
              fontFamily: fonts.sans,
              fontSize: 15,
              color: nearBlack,
              lineHeight: 23,
              minHeight: 100,
              padding: 0,
            }}
          />
        </View>

        {/* CTAs */}
        <Pressable
          onPress={onUseThis}
          style={{
            backgroundColor: sage,
            borderRadius: 14,
            paddingVertical: 14,
            alignItems: "center",
            marginBottom: 10,
            shadowColor: sage,
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.25,
            shadowRadius: 12,
            elevation: 4,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.sansSemiBold,
              fontSize: 15,
              color: white,
            }}
          >
            Use this
          </Text>
        </Pressable>

        <Pressable
          onPress={onTryAgain}
          style={{
            borderRadius: 14,
            paddingVertical: 14,
            alignItems: "center",
            borderWidth: 1.5,
            borderColor: goldLight,
            marginBottom: 10,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.sansSemiBold,
              fontSize: 15,
              color: gold,
            }}
          >
            Try again
          </Text>
        </Pressable>

        <Pressable
          onPress={onDismiss}
          style={{
            paddingVertical: 12,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontFamily: fonts.sans,
              fontSize: 14,
              color: warmGray,
            }}
          >
            Dismiss
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

// ─── S4: Memory Saved ───────────────────────────────────────────────────────

function S4_MemorySaved({
  personName,
  onBackToGarden,
}: {
  personName: string;
  onBackToGarden: () => void;
}) {
  // Garden illustration grows from center
  const gardenScale = useSharedValue(0.3);
  const gardenOpacity = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(20);

  useEffect(() => {
    // Illustration grows
    gardenScale.value = withTiming(1, {
      duration: 800,
      easing: Easing.out(Easing.back(1.5)),
    });
    gardenOpacity.value = withTiming(1, { duration: 500 });

    // Content fades in after illustration
    contentOpacity.value = withDelay(
      500,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) })
    );
    contentTranslateY.value = withDelay(
      500,
      withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) })
    );
  }, []);

  const gardenStyle = useAnimatedStyle(() => ({
    transform: [{ scale: gardenScale.value }],
    opacity: gardenOpacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 32,
      }}
    >
      {/* Garden illustration with grow animation */}
      <Animated.View style={[{ alignItems: "center" }, gardenStyle]}>
        <GardenRevealIllustration size={200} />
      </Animated.View>

      {/* Checkmark circle */}
      <Animated.View style={[{ marginTop: -10 }, gardenStyle]}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: sage,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: sage,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 4,
          }}
        >
          <Check size={24} color={white} strokeWidth={2.5} />
        </View>
      </Animated.View>

      {/* Text content */}
      <Animated.View
        style={[{ alignItems: "center", marginTop: 24, width: "100%" }, contentStyle]}
      >
        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize: 28,
            color: nearBlack,
            textAlign: "center",
            lineHeight: 34,
            marginBottom: 10,
          }}
        >
          That moment matters.
        </Text>
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 15,
            color: warmGray,
            textAlign: "center",
            lineHeight: 22,
            marginBottom: 36,
            maxWidth: 280,
          }}
        >
          Your memory with {personName} has been saved to your garden.
        </Text>

        {/* CTA */}
        <Pressable
          onPress={onBackToGarden}
          style={{ width: "100%", borderRadius: 16, overflow: "hidden" }}
        >
          <LinearGradient
            colors={[sage, sageDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              paddingVertical: 15,
              alignItems: "center",
              borderRadius: 16,
              shadowColor: sage,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.27,
              shadowRadius: 18,
              elevation: 6,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.sansSemiBold,
                fontSize: 15,
                color: white,
              }}
            >
              Back to garden
            </Text>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function AddMemoryScreen() {
  const { personId: preselectedPersonId } = useLocalSearchParams<{
    personId?: string;
  }>();
  const insets = useSafeAreaInsets();
  const { persons } = usePersons();
  const { createMemory, isCreating } = useCreateMemory();

  // ── State ─────────────────────────────────────────────────────────────
  const [step, setStep] = useState(0); // 0=Add, 1=AILoading, 2=AISuggestion, 3=Saved
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [personId, setPersonId] = useState<string | null>(
    preselectedPersonId ?? persons[0]?.id ?? null
  );
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [showPersonModal, setShowPersonModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const selectedPerson = personId
    ? persons.find((p) => p.id === personId) ?? null
    : null;

  // Default person selection when persons load
  useEffect(() => {
    if (!personId && persons.length > 0) {
      setPersonId(preselectedPersonId ?? persons[0].id);
    }
  }, [persons, personId, preselectedPersonId]);

  // ── Image Picker ──────────────────────────────────────────────────────
  const pickImage = useCallback(async () => {
    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Please allow access to your photo library to add photos."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }, []);

  // ── AI Generation (simulated) ─────────────────────────────────────────
  const handleGenerateAI = useCallback(() => {
    setStep(1); // Go to AI Loading
    setAiSuggestion(getRandomDescription());

    // Auto-advance to suggestion after delay
    setTimeout(() => {
      setStep(2);
    }, 2200);
  }, []);

  const handleUseThis = useCallback(() => {
    setNote(aiSuggestion);
    setStep(0);
  }, [aiSuggestion]);

  const handleTryAgain = useCallback(() => {
    setAiSuggestion(getRandomDescription());
    setStep(1);
    setTimeout(() => {
      setStep(2);
    }, 2200);
  }, []);

  const handleDismiss = useCallback(() => {
    setStep(0);
  }, []);

  // ── Save Memory ───────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!personId) return;

    setIsSaving(true);
    try {
      const content = [title.trim(), note.trim()].filter(Boolean).join(" — ");
      const memoryContent = content || "A moment shared together";
      await createMemory({
        person_id: personId,
        content: memoryContent,
        emotion: null,
      });

      // Record growth for this memory
      const transition = recordMemoryGrowth(personId, {
        emotion: null,
        content: memoryContent,
      });
      if (transition && selectedPerson) {
        transition.personName = selectedPerson.name;
        const toast = getTransitionToastMessage(transition);
        showGrowthToast(toast.text, toast.emoji);
      }

      setStep(3); // Show celebration
    } catch {
      Alert.alert("Error", "Failed to save memory. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [personId, title, note, createMemory, selectedPerson]);

  const handleBackToGarden = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  }, []);

  const handleCancel = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  }, []);

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View
        style={{
          flex: 1,
          backgroundColor: cream,
          paddingTop: insets.top,
          paddingBottom: step === 0 ? 0 : insets.bottom,
        }}
      >
        {step === 0 && (
          <S1_AddPhoto
            photoUri={photoUri}
            person={selectedPerson}
            title={title}
            note={note}
            onPickPhoto={pickImage}
            onRemovePhoto={() => setPhotoUri(null)}
            onOpenPersonSelector={() => setShowPersonModal(true)}
            onChangeTitle={setTitle}
            onChangeNote={setNote}
            onGenerateAI={handleGenerateAI}
            onSave={handleSave}
            onCancel={handleCancel}
            isSaving={isSaving}
          />
        )}

        {step === 1 && <S2_AILoading />}

        {step === 2 && (
          <S3_AISuggestion
            suggestion={aiSuggestion}
            onChangeSuggestion={setAiSuggestion}
            onUseThis={handleUseThis}
            onTryAgain={handleTryAgain}
            onDismiss={handleDismiss}
          />
        )}

        {step === 3 && (
          <S4_MemorySaved
            personName={selectedPerson?.name ?? "them"}
            onBackToGarden={handleBackToGarden}
          />
        )}
      </View>

      {/* Person selector modal */}
      <PersonSelectorModal
        visible={showPersonModal}
        persons={persons}
        selectedId={personId}
        onSelect={setPersonId}
        onClose={() => setShowPersonModal(false)}
      />
    </>
  );
}
