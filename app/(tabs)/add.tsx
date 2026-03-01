/**
 * Add Person — Multi-step flow with contact import
 *
 * Two entry paths:
 * A) Add manually — name input with avatar placeholder
 * B) Add from contacts — device contact picker with auto-fill
 *
 * Flow: Entry → Name/Contact → Relationship → Interests → Memory → Plant
 *
 * Design principles:
 * - Progressive disclosure (fields appear step-by-step)
 * - Plant metaphor ("Plant in your garden", not "Save contact")
 * - Always optional — import never required, memory always optional
 * - Gentle animations — FadeInUp, sway, growth
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  TextInput as RNTextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  FadeInUp,
} from "react-native-reanimated";
import {
  ChevronLeft,
  X,
  UserPlus,
  BookUser,
  Sparkles,
  Image as ImageIcon,
  Camera,
} from "lucide-react-native";
import { colors, fonts, shadows } from "@design/tokens";
import { usePersons, useCreateMemory } from "@/hooks";
import { relationshipLabels } from "@/lib/formatters";
import ContactPicker from "@/components/ContactPicker";
import { getInitials, consumePendingImport, type ContactEntry } from "@/lib/contacts";
import {
  SproutSmallIllustration,
  SmallGardenIllustration,
  SingleSproutIllustration,
  SeedIllustration,
} from "@/components/illustrations";
import type { RelationshipType } from "@/types";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// ─── Constants ──────────────────────────────────────────────────────────────

type FlowPath = "manual" | "contacts";

const TOTAL_STEPS = 7; // entry, name/contact, relationship, interests, memory, plant, celebration

/** Relationship options displayed in the flow (matches design spec) */
const FLOW_RELATIONSHIPS: { type: RelationshipType; label: string }[] = [
  { type: "friend", label: "Friend" },
  { type: "family", label: "Family" },
  { type: "partner", label: "Partner" },
  { type: "colleague", label: "Coworker" },
  { type: "neighbor", label: "Neighbor" },
  { type: "mentor", label: "Mentor" },
  { type: "other", label: "Other" },
];

/** Interest tag options from the design spec */
const INTERESTS = [
  "Coffee",
  "Travel",
  "Food",
  "Music",
  "Fitness",
  "Family",
  "Movies",
  "Work",
  "Reading",
  "Nature",
  "Art",
  "Gaming",
] as const;

// ContactEntry type and helpers (formatBirthdayPreview, getInitials)
// are now shared from @/lib/contacts

// ═════════════════════════════════════════════════════════════════════════════
// STEP 0: Entry — Choose path
// ═════════════════════════════════════════════════════════════════════════════

function StepEntry({
  onChoosePath,
}: {
  onChoosePath: (path: FlowPath) => void;
}) {
  // Subtle breathing animation on the illustration
  const breathe = useSharedValue(1);

  useEffect(() => {
    breathe.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const breatheStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathe.value }],
  }));

  return (
    <View style={{ flex: 1, justifyContent: "center" }}>
      {/* Illustration */}
      <Animated.View
        style={[{ alignItems: "center", marginBottom: 32 }, breatheStyle]}
      >
        <View
          style={{
            width: 130,
            height: 130,
            borderRadius: 65,
            backgroundColor: colors.sagePale,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <SproutSmallIllustration size={80} />
        </View>
      </Animated.View>

      <Text
        style={{
          fontFamily: fonts.serif,
          fontSize: 28,
          color: colors.nearBlack,
          textAlign: "center",
          lineHeight: 36,
          marginBottom: 10,
        }}
      >
        Add someone to{"\n"}your garden
      </Text>
      <Text
        style={{
          fontFamily: fonts.sans,
          fontSize: 15,
          color: colors.warmGray,
          textAlign: "center",
          lineHeight: 22,
          marginBottom: 36,
        }}
      >
        How would you like to add them?
      </Text>

      {/* CTA Cards */}
      <Animated.View entering={FadeInUp.delay(200).duration(400)}>
        {/* Add manually — sage gradient */}
        <Pressable
          onPress={() => onChoosePath("manual")}
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
              <UserPlus color={colors.white} size={22} strokeWidth={1.8} />
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
                Add manually
              </Text>
              <Text
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 13,
                  color: "rgba(255,255,255,0.75)",
                }}
              >
                Start with their name
              </Text>
            </View>
          </LinearGradient>
        </Pressable>

        {/* Add from contacts — white bordered */}
        <Pressable
          onPress={() => onChoosePath("contacts")}
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
            <BookUser color={colors.sage} size={22} strokeWidth={1.8} />
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
              Add from contacts
            </Text>
            <Text
              style={{
                fontFamily: fonts.sans,
                fontSize: 13,
                color: colors.warmGray,
              }}
            >
              Bring in details you already have
            </Text>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// STEP 1A: Manual Name Entry
// ═════════════════════════════════════════════════════════════════════════════

function StepManualEntry({
  name,
  onChangeName,
  profilePhotoUri,
  onPickProfilePhoto,
}: {
  name: string;
  onChangeName: (v: string) => void;
  profilePhotoUri: string | null;
  onPickProfilePhoto: () => void;
}) {
  return (
    <View style={{ flex: 1, justifyContent: "center" }}>
      {/* Illustration */}
      <View style={{ alignItems: "center", marginBottom: 28 }}>
        <SingleSproutIllustration size={100} />
      </View>

      <Text
        style={{
          fontFamily: fonts.serif,
          fontSize: 28,
          color: colors.nearBlack,
          textAlign: "center",
          lineHeight: 36,
          marginBottom: 8,
        }}
      >
        Add someone to{"\n"}your garden
      </Text>
      <Text
        style={{
          fontFamily: fonts.sans,
          fontSize: 15,
          color: colors.warmGray,
          textAlign: "center",
          lineHeight: 22,
          marginBottom: 36,
        }}
      >
        Start with the basics
      </Text>

      {/* Tappable avatar — pick profile photo */}
      <Pressable
        onPress={onPickProfilePhoto}
        style={{ alignItems: "center", marginBottom: 24 }}
      >
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            borderWidth: profilePhotoUri ? 0 : 2,
            borderColor: colors.sageLight,
            borderStyle: "dashed",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.sagePale,
            marginBottom: 6,
            overflow: "hidden",
          }}
        >
          {profilePhotoUri ? (
            <Image
              source={{ uri: profilePhotoUri }}
              style={{ width: 72, height: 72, borderRadius: 36 }}
            />
          ) : name.trim() ? (
            <Text
              style={{
                fontFamily: fonts.sansSemiBold,
                fontSize: 24,
                color: colors.sage,
              }}
            >
              {getInitials(name)}
            </Text>
          ) : (
            <SingleSproutIllustration size={36} />
          )}
          {/* Camera overlay badge */}
          {!profilePhotoUri && (
            <View
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: colors.sage,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 2,
                borderColor: colors.cream,
              }}
            >
              <Camera color={colors.white} size={12} strokeWidth={2} />
            </View>
          )}
        </View>
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 12,
            color: profilePhotoUri ? colors.sage : colors.warmGray,
          }}
        >
          {profilePhotoUri ? "Change photo" : "Add photo (optional)"}
        </Text>
      </Pressable>

      {/* Name Input */}
      <View>
        <Text
          style={{
            fontFamily: fonts.sansSemiBold,
            fontSize: 13,
            color: colors.warmGray,
            marginBottom: 8,
          }}
        >
          Name
        </Text>
        <RNTextInput
          value={name}
          onChangeText={onChangeName}
          placeholder="e.g., Sarah, Mom, Coach Kim"
          placeholderTextColor={colors.warmGray}
          autoFocus
          style={{
            backgroundColor: colors.white,
            borderWidth: 1.5,
            borderColor: colors.border,
            borderRadius: 16,
            paddingHorizontal: 18,
            paddingVertical: 16,
            fontFamily: fonts.sans,
            fontSize: 17,
            color: colors.nearBlack,
          }}
        />
      </View>
    </View>
  );
}

// StepContactSelection is now powered by the shared ContactPicker component.
// See src/components/ContactPicker.tsx for the full implementation.

// ═════════════════════════════════════════════════════════════════════════════
// STEP 2: Relationship Type
// ═════════════════════════════════════════════════════════════════════════════

function StepRelationship({
  selected,
  onSelect,
}: {
  selected: RelationshipType | null;
  onSelect: (v: RelationshipType) => void;
}) {
  return (
    <View style={{ flex: 1, justifyContent: "center" }}>
      {/* Sparkle + headline */}
      <View style={{ alignItems: "center", marginBottom: 12 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.goldPale,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <Sparkles color={colors.gold} size={20} strokeWidth={1.8} />
        </View>
        <Text
          style={{
            fontFamily: fonts.sansSemiBold,
            fontSize: 22,
            color: colors.nearBlack,
            textAlign: "center",
            lineHeight: 30,
          }}
        >
          Who are they to you?
        </Text>
      </View>

      {/* Relationship Pill Buttons */}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 10,
          justifyContent: "center",
          marginTop: 28,
        }}
      >
        {FLOW_RELATIONSHIPS.map(({ type, label }) => {
          const isSelected = selected === type;
          return (
            <Animated.View
              key={type}
              entering={FadeInUp.delay(FLOW_RELATIONSHIPS.indexOf({ type, label } as any) * 40).duration(300)}
            >
              <Pressable
                onPress={() => onSelect(type)}
                style={{
                  backgroundColor: isSelected ? colors.sage : colors.white,
                  borderWidth: 1.5,
                  borderColor: isSelected ? colors.sage : colors.border,
                  borderRadius: 24,
                  paddingVertical: 12,
                  paddingHorizontal: 24,
                  ...shadows.soft,
                  ...(isSelected
                    ? { shadowColor: colors.sage, shadowOpacity: 0.2 }
                    : {}),
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.sansMedium,
                    fontSize: 15,
                    color: isSelected ? colors.white : colors.nearBlack,
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// STEP 3: Shared Interests
// ═════════════════════════════════════════════════════════════════════════════

function StepInterests({
  selected,
  onToggle,
  customInterests,
  onAddCustomInterest,
}: {
  selected: string[];
  onToggle: (interest: string) => void;
  customInterests: string[];
  onAddCustomInterest: (interest: string) => void;
}) {
  const [showInput, setShowInput] = useState(false);
  const [customText, setCustomText] = useState("");

  const handleSubmitCustom = () => {
    const trimmed = customText.trim();
    if (
      trimmed.length > 0 &&
      !INTERESTS.includes(trimmed as any) &&
      !customInterests.includes(trimmed)
    ) {
      onAddCustomInterest(trimmed);
      setCustomText("");
      setShowInput(false);
    } else if (trimmed.length > 0) {
      // Already exists — just toggle it on and close
      if (!selected.includes(trimmed)) onToggle(trimmed);
      setCustomText("");
      setShowInput(false);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: "center" }}>
      {/* Sparkle + headline */}
      <View style={{ alignItems: "center", marginBottom: 12 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.goldPale,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <Sparkles color={colors.gold} size={20} strokeWidth={1.8} />
        </View>
        <Text
          style={{
            fontFamily: fonts.sansSemiBold,
            fontSize: 22,
            color: colors.nearBlack,
            textAlign: "center",
            lineHeight: 30,
          }}
        >
          What do you love together?
        </Text>
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 14,
            color: colors.warmGray,
            textAlign: "center",
            marginTop: 6,
            lineHeight: 20,
          }}
        >
          This helps Kinship offer thoughtful ideas
        </Text>
      </View>

      {/* Interest Pills */}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 10,
          justifyContent: "center",
          marginTop: 24,
        }}
      >
        {INTERESTS.map((interest) => {
          const isSelected = selected.includes(interest);
          return (
            <Pressable
              key={interest}
              onPress={() => onToggle(interest)}
              style={{
                backgroundColor: isSelected ? colors.sagePale : colors.white,
                borderWidth: 1.5,
                borderColor: isSelected ? colors.sage : colors.border,
                borderRadius: 22,
                paddingVertical: 10,
                paddingHorizontal: 18,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.sansMedium,
                  fontSize: 14,
                  color: isSelected ? colors.moss : colors.nearBlack,
                }}
              >
                {interest}
              </Text>
            </Pressable>
          );
        })}

        {/* Render custom interests as pills */}
        {customInterests.map((interest) => {
          const isSelected = selected.includes(interest);
          return (
            <Pressable
              key={`custom-${interest}`}
              onPress={() => onToggle(interest)}
              style={{
                backgroundColor: isSelected ? colors.sagePale : colors.white,
                borderWidth: 1.5,
                borderColor: isSelected ? colors.sage : colors.border,
                borderRadius: 22,
                paddingVertical: 10,
                paddingHorizontal: 18,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.sansMedium,
                  fontSize: 14,
                  color: isSelected ? colors.moss : colors.nearBlack,
                }}
              >
                {interest}
              </Text>
            </Pressable>
          );
        })}

        {/* Add your own — toggles inline input */}
        {showInput ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              borderWidth: 1.5,
              borderColor: colors.sage,
              borderRadius: 22,
              paddingVertical: 4,
              paddingLeft: 14,
              paddingRight: 6,
              backgroundColor: colors.white,
            }}
          >
            <RNTextInput
              value={customText}
              onChangeText={setCustomText}
              placeholder="Type an interest..."
              placeholderTextColor={colors.warmGray}
              autoFocus
              onSubmitEditing={handleSubmitCustom}
              returnKeyType="done"
              style={{
                fontFamily: fonts.sansMedium,
                fontSize: 14,
                color: colors.nearBlack,
                paddingVertical: 4,
                minWidth: 120,
                maxWidth: 180,
              }}
            />
            <Pressable
              onPress={handleSubmitCustom}
              style={{
                paddingVertical: 4,
                paddingHorizontal: 10,
                borderRadius: 16,
                backgroundColor: customText.trim()
                  ? colors.sage
                  : colors.border,
                marginLeft: 6,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.sansMedium,
                  fontSize: 13,
                  color: colors.white,
                }}
              >
                Add
              </Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => setShowInput(true)}
            style={{
              borderWidth: 1.5,
              borderColor: colors.sageLight,
              borderStyle: "dashed",
              borderRadius: 22,
              paddingVertical: 10,
              paddingHorizontal: 18,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.sansMedium,
                fontSize: 14,
                color: colors.sage,
              }}
            >
              + Add your own
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// STEP 4: First Memory (optional)
// ═════════════════════════════════════════════════════════════════════════════

function StepFirstMemory({
  memoryText,
  onChangeText,
  photoUri,
  onPickPhoto,
}: {
  memoryText: string;
  onChangeText: (v: string) => void;
  photoUri: string | null;
  onPickPhoto: () => void;
}) {
  return (
    <View style={{ flex: 1, justifyContent: "center" }}>
      {/* Sparkle + headline */}
      <View style={{ alignItems: "center", marginBottom: 12 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.goldPale,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <Sparkles color={colors.gold} size={20} strokeWidth={1.8} />
        </View>
        <Text
          style={{
            fontFamily: fonts.sansSemiBold,
            fontSize: 22,
            color: colors.nearBlack,
            textAlign: "center",
            lineHeight: 30,
          }}
        >
          A first memory (optional)
        </Text>
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 14,
            color: colors.warmGray,
            textAlign: "center",
            marginTop: 6,
            lineHeight: 20,
          }}
        >
          One moment you'd want to remember
        </Text>
      </View>

      {/* Photo Upload Zone */}
      {photoUri ? (
        <Pressable
          onPress={onPickPhoto}
          style={{
            borderRadius: 20,
            overflow: "hidden",
            marginTop: 20,
            marginBottom: 16,
            position: "relative",
          }}
        >
          <Image
            source={{ uri: photoUri }}
            style={{
              width: "100%",
              height: 200,
              borderRadius: 20,
            }}
            resizeMode="cover"
          />
          {/* Change photo overlay */}
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              paddingVertical: 10,
              alignItems: "center",
              backgroundColor: "rgba(0,0,0,0.35)",
            }}
          >
            <Text
              style={{
                fontFamily: fonts.sansMedium,
                fontSize: 13,
                color: colors.white,
              }}
            >
              Tap to change photo
            </Text>
          </View>
        </Pressable>
      ) : (
        <Pressable
          onPress={onPickPhoto}
          style={{
            backgroundColor: colors.sagePale,
            borderWidth: 2,
            borderColor: colors.sageLight,
            borderStyle: "dashed",
            borderRadius: 20,
            paddingVertical: 32,
            paddingHorizontal: 24,
            alignItems: "center",
            marginTop: 20,
            marginBottom: 16,
          }}
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: colors.white,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 10,
              ...shadows.soft,
            }}
          >
            <ImageIcon size={24} color={colors.sage} strokeWidth={1.8} />
          </View>
          <Text
            style={{
              fontFamily: fonts.sansMedium,
              fontSize: 14,
              color: colors.moss,
            }}
          >
            Choose photo
          </Text>
        </Pressable>
      )}

      {/* Text area */}
      <RNTextInput
        placeholder="What happened? How did it feel?"
        placeholderTextColor={colors.warmGray}
        value={memoryText}
        onChangeText={onChangeText}
        multiline
        textAlignVertical="top"
        style={{
          backgroundColor: colors.white,
          borderWidth: 1.5,
          borderColor: colors.border,
          borderRadius: 16,
          paddingHorizontal: 18,
          paddingTop: 16,
          paddingBottom: 16,
          fontFamily: fonts.sans,
          fontSize: 15,
          color: colors.nearBlack,
          minHeight: 100,
        }}
      />
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// STEP 5: Ready to Plant (confirmation)
// ═════════════════════════════════════════════════════════════════════════════

function StepReadyToPlant({
  name,
  relationship,
  interests,
  hasMemory,
  fromContacts,
}: {
  name: string;
  relationship: RelationshipType | null;
  interests: string[];
  hasMemory: boolean;
  fromContacts: boolean;
}) {
  // Plant growth animation
  const growScale = useSharedValue(0.3);
  const growOpacity = useSharedValue(0);

  useEffect(() => {
    growOpacity.value = withTiming(1, { duration: 400 });
    growScale.value = withTiming(1, {
      duration: 700,
      easing: Easing.out(Easing.back(1.5)),
    });
  }, []);

  const growStyle = useAnimatedStyle(() => ({
    opacity: growOpacity.value,
    transform: [{ scale: growScale.value }],
  }));

  // Build summary text
  const summaryParts: string[] = [];
  summaryParts.push("their name");
  if (fromContacts) summaryParts.push("contact info");
  if (relationship) {
    const label = FLOW_RELATIONSHIPS.find((r) => r.type === relationship)?.label;
    if (label) summaryParts.push(`they're a ${label.toLowerCase()}`);
  }
  if (interests.length > 0) summaryParts.push("what you love together");
  if (hasMemory) summaryParts.push("a first memory");

  const summaryText =
    summaryParts.length <= 1
      ? "You've added their name"
      : `You've added ${summaryParts.slice(0, -1).join(", ")}${summaryParts.length > 2 ? "," : ""} and ${summaryParts[summaryParts.length - 1]}`;

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      {/* Illustration */}
      <Animated.View style={growStyle}>
        <View
          style={{
            width: 150,
            height: 150,
            borderRadius: 75,
            backgroundColor: colors.sagePale,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 28,
          }}
        >
          <SmallGardenIllustration size={90} />
        </View>
      </Animated.View>

      <Text
        style={{
          fontFamily: fonts.serif,
          fontSize: 26,
          color: colors.nearBlack,
          textAlign: "center",
          lineHeight: 34,
          marginBottom: 10,
          maxWidth: 300,
        }}
      >
        Ready to plant{"\n"}
        {name || "them"} in your garden
      </Text>

      <Text
        style={{
          fontFamily: fonts.sans,
          fontSize: 14,
          color: colors.warmGray,
          textAlign: "center",
          lineHeight: 22,
          maxWidth: 280,
          marginBottom: 8,
        }}
      >
        {summaryText}
      </Text>

      <Text
        style={{
          fontFamily: fonts.sans,
          fontSize: 13,
          color: colors.warmGray,
          textAlign: "center",
          marginTop: 12,
          opacity: 0.7,
        }}
      >
        You can add more anytime
      </Text>
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// STEP 6: Celebration (consistent with MemoryCelebration)
// ═════════════════════════════════════════════════════════════════════════════

// ─── Animated Particle (matches MemoryCelebration) ───────────────────────

function CelebrationParticle({
  delay: particleDelay,
  startX,
  startY,
  driftX,
  driftY,
  size,
  color,
  shape,
}: {
  delay: number;
  startX: number;
  startY: number;
  driftX: number;
  driftY: number;
  size: number;
  color: string;
  shape: "circle" | "leaf";
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const scale = useSharedValue(0.3);
  const rotation = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(
      particleDelay,
      withSequence(
        withTiming(1, { duration: 300 }),
        withDelay(1800, withTiming(0, { duration: 600 }))
      )
    );
    translateY.value = withDelay(
      particleDelay,
      withTiming(driftY, { duration: 2700, easing: Easing.out(Easing.cubic) })
    );
    translateX.value = withDelay(
      particleDelay,
      withTiming(driftX, { duration: 2700, easing: Easing.out(Easing.cubic) })
    );
    scale.value = withDelay(
      particleDelay,
      withSequence(
        withTiming(1, { duration: 400, easing: Easing.out(Easing.back(3)) }),
        withDelay(1400, withTiming(0.5, { duration: 600 }))
      )
    );
    rotation.value = withDelay(
      particleDelay,
      withTiming((Math.random() - 0.5) * 180, {
        duration: 2700,
        easing: Easing.out(Easing.cubic),
      })
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: startX,
          top: startY,
          width: size,
          height: shape === "leaf" ? size * 0.6 : size,
          borderRadius: shape === "leaf" ? size * 0.3 : size / 2,
          backgroundColor: color,
        },
        animStyle,
      ]}
    />
  );
}

// ─── Pre-computed particle positions (matches MemoryCelebration) ──────────

const PARTICLES = Array.from({ length: 18 }).map((_, i) => ({
  id: i,
  delay: 100 + Math.random() * 600,
  startX: SCREEN_W * 0.3 + Math.random() * SCREEN_W * 0.4,
  startY: SCREEN_H * 0.28 + Math.random() * 40,
  driftX: (Math.random() - 0.5) * SCREEN_W * 0.8,
  driftY: -40 - Math.random() * SCREEN_H * 0.35,
  size: 6 + Math.random() * 8,
  color: [
    colors.sage,
    colors.sageLight,
    colors.gold,
    colors.goldLight,
    colors.moss,
    colors.peach,
  ][Math.floor(Math.random() * 6)],
  shape: (i % 3 === 0 ? "circle" : "leaf") as "circle" | "leaf",
}));

// ─── Pulsing Ring (matches MemoryCelebration) ─────────────────────────────

function PulsingRing() {
  const ringScale = useSharedValue(0.85);
  const ringOpacity = useSharedValue(0);

  useEffect(() => {
    ringScale.value = withDelay(
      200,
      withRepeat(
        withSequence(
          withTiming(1.15, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.85, { duration: 1400, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
    ringOpacity.value = withDelay(200, withTiming(0.35, { duration: 500 }));
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: 160,
          height: 160,
          borderRadius: 80,
          borderWidth: 2,
          borderColor: colors.gold,
        },
        ringStyle,
      ]}
    />
  );
}

// ─── Celebration Screen ──────────────────────────────────────────────────

function StepCelebration({
  name,
  onBackToGarden,
}: {
  name: string;
  onBackToGarden: () => void;
}) {
  const insets = useSafeAreaInsets();

  // Content fade-in (matches MemoryCelebration timing)
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(20);

  useEffect(() => {
    contentOpacity.value = withDelay(
      300,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) })
    );
    contentTranslateY.value = withDelay(
      300,
      withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) })
    );
  }, []);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  return (
    <View style={{ flex: 1 }}>
      {/* Gradient background (matches MemoryCelebration no-photo variant) */}
      <LinearGradient
        colors={[colors.sagePale, colors.cream, colors.cream]}
        locations={[0, 0.4, 1]}
        style={{ position: "absolute", width: "100%", height: "100%" }}
      />

      {/* Particles */}
      {PARTICLES.map((p) => (
        <CelebrationParticle key={p.id} {...p} />
      ))}

      {/* Content */}
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 28,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {/* PLANTED badge (mirrors "MEMORY ADDED" badge) */}
        <View
          style={{
            paddingVertical: 5,
            paddingHorizontal: 14,
            borderRadius: 100,
            backgroundColor: colors.sagePale,
            borderWidth: 1,
            borderColor: colors.sageLight,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            marginBottom: 24,
          }}
        >
          <View
            style={{
              width: 7,
              height: 7,
              borderRadius: 3.5,
              backgroundColor: colors.gold,
            }}
          />
          <Text
            style={{
              fontFamily: fonts.sansSemiBold,
              fontSize: 11,
              letterSpacing: 1.2,
              color: colors.moss,
              textTransform: "uppercase",
            }}
          >
            Planted in your garden
          </Text>
        </View>

        {/* Illustration in frosted circle with PulsingRing */}
        <Animated.View style={contentStyle}>
          <View style={{ alignItems: "center", justifyContent: "center" }}>
            <PulsingRing />
            <View
              style={{
                width: 130,
                height: 130,
                borderRadius: 65,
                backgroundColor: "rgba(122,158,126,0.12)",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: "rgba(122,158,126,0.2)",
              }}
            >
              <SeedIllustration size={78} />
            </View>
          </View>
        </Animated.View>

        {/* Text */}
        <Animated.View
          style={[{ alignItems: "center", marginTop: 28 }, contentStyle]}
        >
          <Text
            style={{
              fontFamily: fonts.serif,
              fontSize: 28,
              color: colors.nearBlack,
              textAlign: "center",
              lineHeight: 34,
              marginBottom: 10,
            }}
          >
            Your garden just grew
          </Text>
          <Text
            style={{
              fontFamily: fonts.sans,
              fontSize: 14,
              color: colors.warmGray,
              textAlign: "center",
              lineHeight: 22,
              marginBottom: 20,
              maxWidth: 280,
            }}
          >
            {name} has been planted — a new connection begins to grow
          </Text>

          {/* Growth pill (mirrors MemoryCelebration) */}
          <View
            style={{
              paddingVertical: 7,
              paddingHorizontal: 16,
              borderRadius: 100,
              backgroundColor: colors.sagePale,
              borderWidth: 1,
              borderColor: colors.sageLight,
              flexDirection: "row",
              alignItems: "center",
              gap: 7,
              marginBottom: 36,
            }}
          >
            <Text style={{ fontSize: 13 }}>🌱</Text>
            <Text
              style={{
                fontFamily: fonts.sansMedium,
                fontSize: 13,
                color: colors.moss,
              }}
            >
              Seed planted · beginning to grow
            </Text>
          </View>

          {/* Continue CTA (matches MemoryCelebration sage gradient button) */}
          <Pressable
            onPress={onBackToGarden}
            style={{ width: "100%", borderRadius: 18, overflow: "hidden" }}
          >
            <LinearGradient
              colors={[colors.sage, colors.moss]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                paddingVertical: 15,
                alignItems: "center",
                borderRadius: 18,
                shadowColor: colors.sage,
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
                  color: colors.white,
                }}
              >
                Back to garden
              </Text>
            </LinearGradient>
          </Pressable>

          {/* Footer wisdom (matches MemoryCelebration) */}
          <Text
            style={{
              fontFamily: fonts.sans,
              fontSize: 12,
              color: colors.warmGray,
              textAlign: "center",
              lineHeight: 19,
              marginTop: 20,
              maxWidth: 260,
            }}
          >
            Every connection in your garden grows at its own pace. Nurture it
            with memories and moments.
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Main Screen
// ═════════════════════════════════════════════════════════════════════════════

export default function AddPersonScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [flowPath, setFlowPath] = useState<FlowPath | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { persons, createPerson } = usePersons();
  const { createMemory } = useCreateMemory();

  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [birthday, setBirthday] = useState<string | undefined>(undefined);
  const [relationship, setRelationship] = useState<RelationshipType | null>(
    null
  );
  const [interests, setInterests] = useState<string[]>([]);
  const [customInterests, setCustomInterests] = useState<string[]>([]);
  const [memoryText, setMemoryText] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);

  // Reset the entire flow when the tab gains focus (tab stays mounted,
  // so we need to clear stale state from previous completions).
  // Also check for a pending contact import from the Import Contacts screen.
  const hasCompletedRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      // Check for a pending contact import (set by Import Contacts screen)
      const imported = consumePendingImport();
      if (imported) {
        // Pre-fill from the imported contact and jump to Step 2
        setStep(2);
        setFlowPath("contacts");
        setIsSaving(false);
        setName(imported.name);
        setPhone(imported.phone || "");
        setEmail(imported.email || "");
        setBirthday(imported.birthday || undefined);
        setRelationship(null);
        setInterests([]);
        setCustomInterests([]);
        setMemoryText("");
        setPhotoUri(null);
        setProfilePhotoUri(null);
        hasCompletedRef.current = false;
        return;
      }

      if (hasCompletedRef.current) {
        // Reset all state for a fresh flow
        setStep(0);
        setFlowPath(null);
        setIsSaving(false);
        setName("");
        setPhone("");
        setEmail("");
        setBirthday(undefined);
        setRelationship(null);
        setInterests([]);
        setCustomInterests([]);
        setMemoryText("");
        setPhotoUri(null);
        setProfilePhotoUri(null);
        hasCompletedRef.current = false;
      }
    }, [])
  );

  const toggleInterest = useCallback((interest: string) => {
    setInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  }, []);

  // ─── Path selection ──────────────────────────────────────────────────

  const handleChoosePath = (path: FlowPath) => {
    setFlowPath(path);
    setStep(1);
  };

  const handleSelectContact = (contact: ContactEntry) => {
    setName(contact.name);
    setPhone(contact.phone || "");
    setEmail(contact.email || "");
    setBirthday(contact.birthday);
    setStep(2); // Skip to relationship after contact selection
  };

  // ─── Photo picker (memory photo) ───────────────────────────────────
  // No permission request needed — PHPickerViewController (iOS 14+) runs
  // in its own process and shows ALL albums/folders regardless of the
  // app's photo-library permission status.

  const handlePickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "livePhotos"],
        quality: 0.8,
        presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
        // Compatible mode ensures HEIF/iCloud photos from Memories get transcoded
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      });
      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert(
        "Couldn't open photos",
        "Please check that Kinship has permission to access your photo library in Settings."
      );
    }
  };

  // ─── Profile photo picker ────────────────────────────────────────
  // No allowsEditing — that forces UIImagePickerController which can't
  // browse album folders. Visual circle crop is handled by borderRadius.

  const handlePickProfilePhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "livePhotos"],
        quality: 0.8,
        presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
        // Compatible mode ensures HEIF/iCloud photos from Memories get transcoded
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      });
      if (!result.canceled && result.assets[0]) {
        setProfilePhotoUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert(
        "Couldn't open photos",
        "Please check that Kinship has permission to access your photo library in Settings."
      );
    }
  };

  // ─── Custom interests ─────────────────────────────────────────────

  const handleAddCustomInterest = useCallback((interest: string) => {
    setCustomInterests((prev) => [...prev, interest]);
    setInterests((prev) => [...prev, interest]);
  }, []);

  // ─── Navigation ──────────────────────────────────────────────────────

  const canContinue = (): boolean => {
    switch (step) {
      case 0:
        return true; // Entry always available
      case 1:
        return flowPath === "contacts" ? true : name.trim().length > 0;
      case 2:
        return relationship !== null;
      default:
        return true;
    }
  };

  /** Visible step count: steps 1–5 are user-facing; entry (0) and celebration (6) are hidden */
  const displayStep = step;
  const visibleStepCount = 5;

  const handleContinue = () => {
    if (step === 5) {
      // "Plant in your garden" triggers save → celebration
      handleSave();
    } else if (step < TOTAL_STEPS - 1) {
      setStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (step === 2 && flowPath === "contacts") {
      // From relationship step, go back to entry when on contacts path
      setStep(0);
      setFlowPath(null);
      setName("");
      setPhone("");
      setEmail("");
    } else if (step > 0) {
      setStep((prev) => prev - 1);
      if (step === 1) {
        setFlowPath(null);
      }
    }
  };

  const handleClose = () => {
    if (name.trim() || memoryText.trim()) {
      Alert.alert(
        "Discard changes?",
        "You'll lose any information you've entered.",
        [
          { text: "Keep editing", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => {
              hasCompletedRef.current = true;
              if (router.canGoBack()) router.back();
              else router.replace("/(tabs)");
            },
          },
        ]
      );
    } else {
      hasCompletedRef.current = true;
      if (router.canGoBack()) router.back();
      else router.replace("/(tabs)");
    }
  };

  // ─── Save ────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!relationship) return;

    setIsSaving(true);
    try {
      const newPerson = await createPerson({
        name: name.trim(),
        photo_url: profilePhotoUri || null,
        relationship_type: relationship,
        birthday,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      });

      if ((memoryText.trim() || photoUri) && newPerson) {
        await createMemory({
          person_id: newPerson.id,
          content: memoryText.trim() || "A moment shared together",
          emotion: null,
          photo_url: photoUri ?? null,
        });
      }

      // Advance to celebration screen
      setStep(6);
    } catch (err: any) {
      const msg =
        err?.message ??
        (typeof err === "string" ? err : "Something went wrong. Please try again.");
      Alert.alert("Error", msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackToGarden = () => {
    hasCompletedRef.current = true;
    router.replace("/(tabs)/people");
  };

  // ─── Render step ─────────────────────────────────────────────────────

  const renderStep = () => {
    switch (step) {
      case 0:
        return <StepEntry onChoosePath={handleChoosePath} />;
      case 1:
        return flowPath === "contacts" ? (
          <ContactPicker persons={persons} onSelectContact={handleSelectContact} />
        ) : (
          <StepManualEntry
            name={name}
            onChangeName={setName}
            profilePhotoUri={profilePhotoUri}
            onPickProfilePhoto={handlePickProfilePhoto}
          />
        );
      case 2:
        return (
          <StepRelationship selected={relationship} onSelect={setRelationship} />
        );
      case 3:
        return (
          <StepInterests
            selected={interests}
            onToggle={toggleInterest}
            customInterests={customInterests}
            onAddCustomInterest={handleAddCustomInterest}
          />
        );
      case 4:
        return (
          <StepFirstMemory
            memoryText={memoryText}
            onChangeText={setMemoryText}
            photoUri={photoUri}
            onPickPhoto={handlePickPhoto}
          />
        );
      case 5:
        return (
          <StepReadyToPlant
            name={name || "them"}
            relationship={relationship}
            interests={interests}
            hasMemory={memoryText.trim().length > 0}
            fromContacts={flowPath === "contacts"}
          />
        );
      case 6:
        return (
          <StepCelebration
            name={name || "them"}
            onBackToGarden={handleBackToGarden}
          />
        );
      default:
        return null;
    }
  };

  const isOptionalStep = step === 3 || step === 4;
  const isConfirmation = step === 5;
  const isEntry = step === 0;
  const isCelebration = step === 6;
  const isContactSelection = step === 1 && flowPath === "contacts";
  const showBottomNav = !isEntry && !isContactSelection && !isCelebration;
  const showHeader = !isCelebration;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: isCelebration ? colors.sagePale : colors.cream }}
    >
      <View
        style={{
          flex: 1,
          paddingTop: isCelebration ? 0 : insets.top,
          paddingBottom: isCelebration ? 0 : insets.bottom,
        }}
      >
        {/* ─── Header ────────────────────────────────────────────────── */}
        {showHeader && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 8,
          }}
        >
          {step > 0 ? (
            <Pressable
              onPress={handleBack}
              hitSlop={12}
              style={{ flexDirection: "row", alignItems: "center" }}
            >
              <ChevronLeft color={colors.moss} size={22} />
              <Text
                style={{
                  fontFamily: fonts.sansMedium,
                  fontSize: 15,
                  color: colors.moss,
                  marginLeft: 2,
                }}
              >
                Back
              </Text>
            </Pressable>
          ) : (
            <View style={{ width: 60 }} />
          )}

          {isContactSelection ? (
            <Text
              style={{
                fontFamily: fonts.sansSemiBold,
                fontSize: 16,
                color: colors.nearBlack,
              }}
            >
              Choose contact
            </Text>
          ) : !isEntry ? (
            <Text
              style={{
                fontFamily: fonts.sansMedium,
                fontSize: 13,
                color: colors.warmGray,
              }}
            >
              Step {displayStep} of {visibleStepCount}
            </Text>
          ) : (
            <View />
          )}

          <Pressable onPress={handleClose} hitSlop={12}>
            <X color={colors.warmGray} size={22} />
          </Pressable>
        </View>
        )}

        {/* ─── Content ───────────────────────────────────────────────── */}
        {isCelebration ? (
          renderStep()
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: 24,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {renderStep()}
          </ScrollView>
        )}

        {/* ─── Bottom Navigation ─────────────────────────────────────── */}
        {showBottomNav && (
          <View style={{ paddingHorizontal: 24, paddingBottom: 12 }}>
            {/* Page Indicator */}
            {!isConfirmation && (
              <View style={{ alignItems: "center", marginBottom: 16 }}>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  {Array.from({ length: visibleStepCount }).map((_, i) => {
                    const dotStep = i + 1;
                    const isActive = dotStep === displayStep;
                    const isPast = dotStep < displayStep;
                    return (
                      <View
                        key={i}
                        style={{
                          width: isActive ? 20 : 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: isActive
                            ? colors.sage
                            : isPast
                              ? colors.sageLight
                              : colors.border,
                        }}
                      />
                    );
                  })}
                </View>
              </View>
            )}

            <View style={{ flexDirection: "row", gap: 12 }}>
              {/* Skip button for optional steps */}
              {isOptionalStep && (
                <Pressable
                  onPress={handleContinue}
                  style={{
                    flex: 1,
                    borderRadius: 18,
                    paddingVertical: 16,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.sansMedium,
                      fontSize: 15,
                      color: colors.warmGray,
                    }}
                  >
                    Skip for now
                  </Text>
                </Pressable>
              )}

              {/* Primary CTA */}
              <Pressable
                onPress={handleContinue}
                disabled={!canContinue() || isSaving}
                style={{
                  flex: isOptionalStep ? 1 : undefined,
                  width: isOptionalStep ? undefined : "100%",
                  borderRadius: 18,
                  overflow: "hidden",
                  opacity: canContinue() && !isSaving ? 1 : 0.5,
                }}
              >
                <LinearGradient
                  colors={[colors.sage, colors.moss]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    paddingVertical: 16,
                    alignItems: "center",
                    borderRadius: 18,
                    shadowColor: colors.sage,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: canContinue() ? 0.25 : 0,
                    shadowRadius: 16,
                    elevation: canContinue() ? 4 : 0,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.sansSemiBold,
                      fontSize: 15,
                      color: colors.white,
                    }}
                  >
                    {isSaving
                      ? "Planting..."
                      : isConfirmation
                        ? "Plant in your garden"
                        : "Continue"}
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
