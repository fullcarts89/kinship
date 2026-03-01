import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  Modal,
  Platform,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, Stack, router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import {
  ChevronLeft,
  MessageCircle,
  Phone,
  Sparkles,
  Heart,
  Calendar,
  Clock,
  BookOpen,
  Camera,
  Users,
  Share2,
  MoreHorizontal,
  Check,
  Mail,
} from "lucide-react-native";
import { colors, fonts } from "@design/tokens";
import {
  Skeleton,
  ErrorState,
  EmptyState,
  FadeIn,
} from "@/components/ui";
import {
  usePerson,
  usePersonMemories,
  usePersonInteractions,
  usePersonVitality,
} from "@/hooks";
import { usePersonPhoto } from "@/hooks/usePersonPhoto";
import VitalPlant from "@/components/VitalPlant";
import GrowthPlantIllustration from "@/components/GrowthPlantIllustration";
import {
  formatRelativeDate,
  formatEmotionLabel,
  relationshipLabels,
} from "@/lib/formatters";
import { OrientationOverlay } from "@/components/OrientationOverlay";
import type { HighlightRect } from "@/components/OrientationOverlay";
import { useOrientation, ORIENTATION_STEP_SCREEN } from "@/hooks/useOrientation";
import { usePersonGrowth } from "@/hooks/useGrowth";
import {
  growthStageLabels,
} from "@/lib/growthEngine";
import type { GrowthStage } from "@/lib/growthEngine";

import {
  getTextureForPerson,
  dismissTexture,
} from "@/lib/textureEngine";
import type { TextureInfo } from "@/lib/textureEngine";
import type { Interaction, Memory, Person } from "@/types/database";
import type { InteractionType, Emotion, IconComponent } from "@/types";
import { getNextBestAction } from "@/lib/nextActionEngine";
import type { GrowthInfo } from "@/lib/growthEngine";
import type { VitalityInfo } from "@/lib/vitalityEngine";

// ─── Design Tokens ─────────────────────────────────────────────────────────

const sage = "#7A9E7E";
const sageDark = "#4A7055";
const sagePale = "#EBF3EB";
const sageLight = "#C8DEC9";
const gold = "#D4A853";
const goldLight = "#F0DBA0";
const cream = "#FDF7ED";
const nearBlack = "#1C1917";
const warmGray = "#78716C";
const white = "#FFFFFF";
const borderColor = "#E8E4DD";
const lavender = "#C5B8E8";
const sky = "#B8D4E8";

// ─── Helpers ────────────────────────────────────────────────────────────────

const interactionIcons: Record<InteractionType, IconComponent> = {
  message: MessageCircle,
  call: Phone,
  video: Camera,
  in_person: Users,
  gift: Share2,
  letter: Sparkles,
  social_media: MessageCircle,
  check_in: Sparkles,
  other: MoreHorizontal,
};

const interactionLabels: Record<InteractionType, string> = {
  message: "Message",
  call: "Call",
  video: "Video call",
  in_person: "In person",
  gift: "Shared something",
  letter: "Letter",
  social_media: "Social media",
  check_in: "Check-in",
  other: "Other",
};

// ─── Tab Types ──────────────────────────────────────────────────────────────

type ProfileTab = "context" | "timeline" | "memories";

// ─── Quick Action Button ────────────────────────────────────────────────────

function QuickAction({
  icon: Icon,
  label,
  bgColor,
  onPress,
}: {
  icon: IconComponent;
  label: string;
  bgColor: string;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withTiming(0.92, {
      duration: 80,
      easing: Easing.out(Easing.ease),
    });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, {
      duration: 150,
      easing: Easing.out(Easing.ease),
    });
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={{ alignItems: "center" }}
    >
      <Animated.View
        style={[
          {
            width: 48,
            height: 48,
            borderRadius: 15,
            backgroundColor: bgColor + "38",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 6,
          },
          animStyle,
        ]}
      >
        <Icon color={bgColor} size={22} />
      </Animated.View>
      <Text
        style={{
          fontFamily: fonts.sans,
          fontSize: 10,
          color: warmGray,
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Photo Picker Modal ────────────────────────────────────────────────────

function PhotoPickerModal({
  visible,
  hasPhoto,
  onChoosePhoto,
  onRemovePhoto,
  onClose,
}: {
  visible: boolean;
  hasPhoto: boolean;
  onChoosePhoto: () => void;
  onRemovePhoto: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        {/* Dimmed overlay */}
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

        {/* Sheet */}
        <View
          style={{
            backgroundColor: white,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 24,
            paddingBottom: 40,
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
              marginBottom: 24,
            }}
          />

          {/* Choose from library */}
          <Pressable
            onPress={onChoosePhoto}
            style={{
              backgroundColor: sagePale,
              borderRadius: 14,
              paddingVertical: 16,
              paddingHorizontal: 20,
              marginBottom: 10,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Camera color={sage} size={20} strokeWidth={1.8} />
            <Text
              style={{
                fontFamily: fonts.sansSemiBold,
                fontSize: 16,
                color: nearBlack,
                marginLeft: 12,
              }}
            >
              Choose from library
            </Text>
          </Pressable>

          {/* Remove photo (only if one exists) */}
          {hasPhoto && (
            <Pressable
              onPress={onRemovePhoto}
              style={{
                backgroundColor: white,
                borderWidth: 1.5,
                borderColor: borderColor,
                borderRadius: 14,
                paddingVertical: 16,
                paddingHorizontal: 20,
                marginBottom: 10,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.sansMedium,
                  fontSize: 16,
                  color: warmGray,
                }}
              >
                Remove photo
              </Text>
            </Pressable>
          )}

          {/* Cancel */}
          <Pressable
            onPress={onClose}
            style={{
              paddingVertical: 14,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontFamily: fonts.sansMedium,
                fontSize: 16,
                color: warmGray,
              }}
            >
              Cancel
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ─── Tab Bar ────────────────────────────────────────────────────────────────

function ProfileTabBar({
  activeTab,
  onTabChange,
}: {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
}) {
  const tabs: { key: ProfileTab; label: string }[] = [
    { key: "context", label: "Context" },
    { key: "timeline", label: "Timeline" },
    { key: "memories", label: "Memories" },
  ];

  return (
    <View
      style={{
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: borderColor,
        paddingHorizontal: 24,
        marginBottom: 20,
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onTabChange(tab.key)}
            style={{
              paddingVertical: 14,
              paddingHorizontal: 16,
              marginRight: 8,
              borderBottomWidth: 2,
              borderBottomColor: isActive ? sage : "transparent",
            }}
          >
            <Text
              style={{
                fontFamily: isActive ? fonts.sansSemiBold : fonts.sans,
                fontSize: 15,
                color: isActive ? sage : warmGray,
              }}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Context Tab Content ────────────────────────────────────────────────────

function ContextTab({
  person,
  memories,
  interactions,
  growthInfo,
  vitalityInfo,
}: {
  person: Person;
  memories: Memory[];
  interactions: Interaction[];
  growthInfo: GrowthInfo;
  vitalityInfo: VitalityInfo;
}) {
  const relationLabel = relationshipLabels[person.relationship_type] ?? person.relationship_type;
  const contextBriefs: string[] = [];
  if (memories.length > 0)
    contextBriefs.push(`${memories.length} shared ${memories.length === 1 ? "memory" : "memories"} saved`);
  if (interactions.length > 0)
    contextBriefs.push(`${interactions.length} recorded ${interactions.length === 1 ? "interaction" : "interactions"}`);
  contextBriefs.push(`${relationLabel} relationship`);

  const action = getNextBestAction({ person, memories, interactions, growthInfo, vitalityInfo });

  return (
    <View style={{ paddingHorizontal: 24 }}>
      {/* Context Brief Card */}
      <View
        style={{
          backgroundColor: sagePale,
          borderRadius: 20,
          padding: 20,
          borderWidth: 1,
          borderColor: sageLight,
          marginBottom: 20,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
          <Text style={{ fontSize: 16, marginRight: 8 }}>{"\uD83C\uDF3F"}</Text>
          <Text
            style={{
              fontFamily: fonts.sansSemiBold,
              fontSize: 15,
              color: nearBlack,
            }}
          >
            Context Brief
          </Text>
        </View>
        {contextBriefs.map((brief, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 8 }}>
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: sage,
                marginTop: 7,
                marginRight: 12,
              }}
            />
            <Text
              style={{
                fontFamily: fonts.sans,
                fontSize: 14,
                color: nearBlack,
                lineHeight: 20,
                flex: 1,
              }}
            >
              {brief}
            </Text>
          </View>
        ))}
      </View>

      {/* Next Best Action Card */}
      <LinearGradient
        colors={[goldLight, "#F4B89E66"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 20,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <Text
          style={{
            fontFamily: fonts.sansSemiBold,
            fontSize: 11,
            color: warmGray,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 10,
          }}
        >
          Suggested next step
        </Text>
        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize: 18,
            color: nearBlack,
            lineHeight: 24,
            marginBottom: action.body ? 6 : 16,
          }}
        >
          {action.headline}
        </Text>
        {action.body && (
          <Text
            style={{
              fontFamily: fonts.sans,
              fontSize: 14,
              color: warmGray,
              lineHeight: 20,
              marginBottom: 16,
            }}
          >
            {action.body}
          </Text>
        )}
        {action.actionLabel && (
          <Pressable
            onPress={() => {
              if (action.actionType === "add_memory") {
                router.push(`/memory/add?personId=${person.id}`);
              } else {
                router.push(`/reach-out/${person.id}`);
              }
            }}
            style={{
              backgroundColor: white,
              borderRadius: 12,
              paddingVertical: 12,
              paddingHorizontal: 20,
              alignSelf: "flex-start",
            }}
          >
            <Text
              style={{
                fontFamily: fonts.sansSemiBold,
                fontSize: 14,
                color: sageDark,
              }}
            >
              {action.actionLabel}
            </Text>
          </Pressable>
        )}
      </LinearGradient>
    </View>
  );
}

// ─── Timeline Tab Content ───────────────────────────────────────────────────

/** Emotion emojis for timeline display — matches home screen pattern. */
const emotionEmojis: Record<Emotion, string> = {
  grateful: "\uD83D\uDE4F",
  connected: "\uD83D\uDCAB",
  curious: "\uD83D\uDD0E",
  joyful: "\uD83D\uDE0A",
  nostalgic: "\uD83C\uDF05",
  proud: "\u2B50",
  peaceful: "\uD83C\uDF38",
  inspired: "\u2728",
  hopeful: "\uD83C\uDF31",
  loved: "\uD83D\uDC9B",
};

function TimelineTab({ interactions }: { interactions: Interaction[] }) {
  if (interactions.length === 0) {
    return (
      <View style={{ paddingHorizontal: 24 }}>
        <EmptyState
          icon={Calendar}
          title="Your story together"
          message="When you reflect or connect, those moments will show up here."
          className="py-xl"
        />
      </View>
    );
  }

  return (
    <View style={{ paddingHorizontal: 24 }}>
      {interactions.slice(0, 10).map((interaction, index) => {
        const Icon = interactionIcons[interaction.type] || Clock;
        const label = interactionLabels[interaction.type] || "Activity";
        const iconColors: Record<string, string> = {
          message: sage,
          call: sky,
          video: sky,
          in_person: "#F4B89E",
          gift: gold,
          letter: lavender,
          social_media: sage,
          other: warmGray,
        };
        const iconBg = iconColors[interaction.type] || sage;
        const hasNote = !!interaction.note;
        const hasEmotion = !!interaction.emotion;

        return (
          <FadeIn key={interaction.id} delay={index * 40}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 16 }}>
              {/* Icon circle + connector line */}
              <View style={{ alignItems: "center", marginRight: 14 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: iconBg + "22",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon color={iconBg} size={16} />
                </View>
                {index < Math.min(interactions.length, 10) - 1 && (
                  <View
                    style={{
                      width: 2,
                      height: hasNote ? 24 : 16,
                      backgroundColor: sagePale,
                      marginTop: 4,
                    }}
                  />
                )}
              </View>

              {/* Content — enhanced for reflections with note/emotion */}
              <View style={{ flex: 1, paddingTop: 2 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text
                    style={{
                      fontFamily: fonts.sansMedium,
                      fontSize: 14,
                      color: nearBlack,
                    }}
                  >
                    {label}
                  </Text>
                  {hasEmotion && (
                    <Text style={{ fontSize: 13 }}>
                      {emotionEmojis[interaction.emotion!]}
                    </Text>
                  )}
                </View>

                {/* Reflection note — only shown for interactions with detail */}
                {hasNote && (
                  <Text
                    style={{
                      fontFamily: fonts.sans,
                      fontSize: 13,
                      color: nearBlack,
                      lineHeight: 18,
                      marginTop: 3,
                      marginBottom: 2,
                    }}
                    numberOfLines={2}
                  >
                    {interaction.note}
                  </Text>
                )}

                <Text
                  style={{
                    fontFamily: fonts.sans,
                    fontSize: 13,
                    color: warmGray,
                    marginTop: hasNote ? 2 : 2,
                  }}
                >
                  {formatRelativeDate(interaction.created_at)}
                </Text>
              </View>
            </View>
          </FadeIn>
        );
      })}
    </View>
  );
}

// ─── Memories Tab Content ───────────────────────────────────────────────────

function MemoriesTab({ memories, personId }: { memories: Memory[]; personId: string }) {
  if (memories.length === 0) {
    return (
      <View style={{ paddingHorizontal: 24 }}>
        <EmptyState
          icon={BookOpen}
          title="No memories yet"
          message="Capture special moments and things you want to remember."
          actionLabel="Add a memory"
          onAction={() => router.push(`/memory/add?personId=${personId}`)}
          className="py-xl"
        />
      </View>
    );
  }

  // 2-column grid of memory cards
  const rows: Memory[][] = [];
  for (let i = 0; i < memories.length; i += 2) {
    rows.push(memories.slice(i, i + 2));
  }

  const cardColors: [string, string][] = [
    [sagePale, sageLight + "88"],
    [goldLight + "44", "#F4B89E44"],
    [lavender + "33", sky + "33"],
  ];

  return (
    <View style={{ paddingHorizontal: 24 }}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
          {row.map((memory, colIndex) => {
            const colorPair = cardColors[(rowIndex * 2 + colIndex) % cardColors.length];
            return (
              <Pressable
                key={memory.id}
                onPress={() => router.push(`/memory/${memory.id}`)}
                style={{
                  flex: 1,
                  backgroundColor: white,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: borderColor,
                  overflow: "hidden",
                }}
              >
                {memory.photo_url ? (
                  <Image
                    source={{ uri: memory.photo_url }}
                    style={{ height: 80, width: "100%" }}
                    resizeMode="cover"
                  />
                ) : (
                  <LinearGradient
                    colors={colorPair}
                    style={{
                      height: 80,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 24, opacity: 0.5 }}>{"\uD83D\uDCF8"}</Text>
                  </LinearGradient>
                )}
                <View style={{ padding: 12 }}>
                  <Text
                    style={{
                      fontFamily: fonts.sansMedium,
                      fontSize: 13,
                      color: nearBlack,
                      marginBottom: 4,
                    }}
                    numberOfLines={2}
                  >
                    {memory.content}
                  </Text>
                  <Text
                    style={{
                      fontFamily: fonts.sans,
                      fontSize: 11,
                      color: warmGray,
                    }}
                  >
                    {formatRelativeDate(memory.created_at)}
                  </Text>
                </View>
              </Pressable>
            );
          })}
          {/* Fill empty space in last row */}
          {row.length === 1 && <View style={{ flex: 1 }} />}
        </View>
      ))}
    </View>
  );
}

// ─── Skeleton Loading ──────────────────────────────────────────────────────

function PersonDetailSkeleton({ insets }: { insets: { top: number; bottom: number } }) {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: cream }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ paddingHorizontal: 24, paddingTop: insets.top + 8 }}>
        <Skeleton width={40} height={40} circle className="mb-lg" />
      </View>
      <View className="items-center px-xl mb-xl">
        <Skeleton width={160} height={160} circle />
        <Skeleton width={160} height={30} className="mt-lg" />
        <Skeleton width={80} height={28} borderRadius={24} className="mt-sm" />
      </View>
      <View className="flex-row justify-center gap-2xl px-xl mb-2xl">
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} className="items-center">
            <Skeleton width={48} height={48} borderRadius={15} />
            <Skeleton width={40} height={10} className="mt-xs" />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function PersonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<ProfileTab>("context");
  const [showPhotoModal, setShowPhotoModal] = useState(false);


  const {
    person,
    isLoading: personLoading,
    error: personError,
    refetch: refetchPerson,
  } = usePerson(id ?? "");
  const {
    memories,
    isLoading: memoriesLoading,
    refetch: refetchMemories,
  } = usePersonMemories(id ?? "");
  const {
    interactions,
    latestInteraction,
    isLoading: interactionsLoading,
    refetch: refetchInteractions,
  } = usePersonInteractions(id ?? "");
  const { photoUri, setPhoto, removePhoto } = usePersonPhoto(id ?? "");

  const isLoading = personLoading || memoriesLoading || interactionsLoading;

  // ─── Plant exit hint animation ──────────────────────────────────────────
  // All hooks MUST be called before any early returns (React rules of hooks)
  const plantExitScale = useSharedValue(1);
  const plantExitOpacity = useSharedValue(0.85);

  const plantExitStyle = useAnimatedStyle(() => ({
    opacity: plantExitOpacity.value,
    transform: [{ scale: plantExitScale.value }],
  }));

  // Refetch data + reset plant when screen regains focus (after returning from modal)
  useFocusEffect(
    useCallback(() => {
      refetchMemories();
      refetchInteractions();
      plantExitScale.value = withTiming(1, { duration: 300 });
      plantExitOpacity.value = withTiming(0.85, { duration: 300 });
    }, [refetchMemories, refetchInteractions])
  );

  // ─── Orientation Steps 3–4 ────────────────────────────────────────────────
  const orientation = useOrientation();
  const quickActionBarRef = useRef<View>(null);
  const captureButtonRef = useRef<View>(null);
  const [orientationHighlight, setOrientationHighlight] =
    useState<HighlightRect | null>(null);

  const showOrientation =
    orientation.isActive &&
    ORIENTATION_STEP_SCREEN[orientation.currentStep] === "person";

  // Measure the target element for the spotlight cutout
  useEffect(() => {
    if (!showOrientation) {
      setOrientationHighlight(null);
      return;
    }

    const targetRef =
      orientation.currentStep === 3 ? quickActionBarRef : captureButtonRef;

    const timer = setTimeout(() => {
      targetRef.current?.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) {
          setOrientationHighlight({ x, y, width, height, borderRadius: 16 });
        }
      });
    }, 400);

    return () => clearTimeout(timer);
  }, [showOrientation, orientation.currentStep]);

  const orientationStepConfig: Record<
    number,
    {
      title: string;
      body: string;
      primaryLabel: string;
      cardPosition: "above" | "below" | "center";
    }
  > = {
    3: {
      title: "Stay connected",
      body: "Quick actions let you text, call, or reflect on moments with the people in your garden.",
      primaryLabel: "Continue",
      cardPosition: "below",
    },
    4: {
      title: "Capture moments",
      body: "Tap Capture to save a moment with this person. Photos, thoughts, feelings \u2014 these feed your garden\u2019s growth.",
      primaryLabel: "Finish",
      cardPosition: "above",
    },
  };

  const handleOrientationAdvance = useCallback(async () => {
    const isLastStep =
      orientation.currentStep >= orientation.totalSteps;
    await orientation.advance();
    if (isLastStep) {
      // After orientation completes, show Garden Walk setup
      router.push("/garden-walk-setup");
    }
  }, [orientation.advance, orientation.currentStep, orientation.totalSteps]);

  const currentOrientationConfig =
    orientationStepConfig[orientation.currentStep];

  // ─── Growth (must be before early returns) ────────────────────────────────
  const growth = usePersonGrowth(id ?? "");

  // ─── Vitality (must be before early returns) ──────────────────────────────
  const vitality = usePersonVitality(memories, interactions);

  // ─── Texture label (must be before early returns) ────────────────────────
  const [textureDismissCount, setTextureDismissCount] = useState(0);
  const textureInfo: TextureInfo | null = useMemo(
    () =>
      getTextureForPerson(
        id ?? "",
        memories.map((m) => ({ content: m.content, emotion: m.emotion }))
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id, memories, textureDismissCount]
  );

  const textureFadeOpacity = useSharedValue(0);
  useEffect(() => {
    if (textureInfo) {
      textureFadeOpacity.value = withTiming(1, {
        duration: 400,
        easing: Easing.out(Easing.ease),
      });
    } else {
      textureFadeOpacity.value = 0;
    }
  }, [textureInfo]);
  const textureFadeStyle = useAnimatedStyle(() => ({
    opacity: textureFadeOpacity.value,
  }));

  // ─── Loading ─────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <PersonDetailSkeleton insets={insets} />
      </>
    );
  }

  // ─── Error ───────────────────────────────────────────────────────────────
  if (personError || !person) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={{ flex: 1, backgroundColor: cream }}>
          <View style={{ paddingHorizontal: 24, paddingTop: insets.top + 8 }}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "rgba(255,255,255,0.8)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ChevronLeft color={nearBlack} size={22} />
            </Pressable>
          </View>
          <ErrorState
            message={personError ? "Couldn't load this person." : "Person not found."}
            onRetry={refetchPerson}
          />
        </View>
      </>
    );
  }

  const relationLabel = relationshipLabels[person.relationship_type];
  const growthStage = growth.stage;
  const growthLabel = growth.label;

  const handleChoosePhoto = async () => {
    setShowPhotoModal(false);

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
        setPhoto(result.assets[0].uri);
      }
    } catch {
      // Permission denied or picker failed — nothing we can do
    }
  };

  const handleRemovePhoto = () => {
    setShowPhotoModal(false);
    removePhoto();
  };

  const handleReachOut = () => {
    // Animate plant exit hint — gentle scale-up + fade
    plantExitScale.value = withTiming(1.08, {
      duration: 250,
      easing: Easing.out(Easing.ease),
    });
    plantExitOpacity.value = withTiming(0, {
      duration: 250,
      easing: Easing.out(Easing.ease),
    });

    // Navigate after brief delay so user sees animation start
    setTimeout(() => {
      router.push(`/reach-out/${person!.id}`);
    }, 80);
  };

  // ─── Content ─────────────────────────────────────────────────────────────
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: cream }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!showOrientation}
      >
        {/* Header Background */}
        <LinearGradient
          colors={[sagePale, cream]}
          style={{
            paddingTop: insets.top + 8,
            paddingBottom: 0,
          }}
        >
          {/* Back Navigation */}
          <View style={{ paddingHorizontal: 24, marginBottom: 8 }}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              style={{ flexDirection: "row", alignItems: "center" }}
            >
              <ChevronLeft color={sage} size={20} />
              <Text
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 14,
                  color: sage,
                  marginLeft: 4,
                }}
              >
                My garden
              </Text>
            </Pressable>
          </View>

          {/* Growth Stage Plant Illustration */}
          <View style={{ alignItems: "center", marginBottom: 4 }}>
            <Animated.View style={plantExitStyle}>
              <VitalPlant
                vitalityScore={vitality.score}
                size={100}
              >
                <GrowthPlantIllustration stage={growthStage} size={100} />
              </VitalPlant>
            </Animated.View>
          </View>

          {/* Friend Photo / Avatar with camera overlay */}
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <Pressable
              onPress={() => setShowPhotoModal(true)}
              style={{ position: "relative" }}
            >
              {photoUri ? (
                <Image
                  source={{ uri: photoUri }}
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: 48,
                    borderWidth: 3,
                    borderColor: white,
                  }}
                  resizeMode="cover"
                />
              ) : (
                <LinearGradient
                  colors={[sageLight, sage]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: 48,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 3,
                    borderColor: white,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.sansSemiBold,
                      fontSize: 36,
                      color: white,
                    }}
                  >
                    {person.name.charAt(0).toUpperCase()}
                  </Text>
                </LinearGradient>
              )}

              {/* Camera overlay button */}
              <View
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: sage,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 2,
                  borderColor: white,
                }}
              >
                <Camera color={white} size={14} strokeWidth={2} />
              </View>
            </Pressable>
          </View>
        </LinearGradient>

        <FadeIn>
          {/* Person Info */}
          <View style={{ alignItems: "center", paddingHorizontal: 24, marginBottom: 20 }}>
            <Text
              style={{
                fontFamily: fonts.serif,
                fontSize: 28,
                color: nearBlack,
                marginBottom: 10,
              }}
            >
              {person.name}
            </Text>

            {/* Status Badges — growth stage + relationship + last interaction */}
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
              {/* Growth Stage Badge */}
              <View
                style={{
                  backgroundColor: sageLight + "66",
                  borderRadius: 20,
                  paddingVertical: 6,
                  paddingHorizontal: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Text style={{ fontSize: 12 }}>{"\uD83C\uDF31"}</Text>
                <Text
                  style={{
                    fontFamily: fonts.sansMedium,
                    fontSize: 13,
                    color: sageDark,
                  }}
                >
                  {growthLabel}
                </Text>
              </View>

              {/* Relationship Badge */}
              <View
                style={{
                  backgroundColor: sagePale,
                  borderRadius: 20,
                  paddingVertical: 6,
                  paddingHorizontal: 14,
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.sansMedium,
                    fontSize: 13,
                    color: sageDark,
                  }}
                >
                  {relationLabel}
                </Text>
              </View>

              {/* Last Interaction Badge */}
              {latestInteraction && (
                <View
                  style={{
                    backgroundColor: goldLight + "66",
                    borderRadius: 20,
                    paddingVertical: 6,
                    paddingHorizontal: 14,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.sansMedium,
                      fontSize: 13,
                      color: warmGray,
                    }}
                  >
                    Last: {formatRelativeDate(latestInteraction.created_at)}
                  </Text>
                </View>
              )}
            </View>

            {/* Texture Label — relationship flavor inferred from captures */}
            {textureInfo && (
              <Animated.View
                style={[
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 6,
                  },
                  textureFadeStyle,
                ]}
              >
                <Pressable
                  onPress={() =>
                    Alert.alert(
                      textureInfo.displayLabel,
                      "Based on your shared moments. Tap \u2715 to dismiss."
                    )
                  }
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Text style={{ fontSize: 14 }}>{textureInfo.emoji}</Text>
                  <Text
                    style={{
                      fontFamily: fonts.sans,
                      fontSize: 13,
                      color: sage,
                    }}
                  >
                    {textureInfo.displayLabel}
                  </Text>
                </Pressable>

                {/* Dismiss button */}
                <Pressable
                  onPress={() => {
                    dismissTexture(id ?? "", textureInfo.label);
                    setTextureDismissCount((c) => c + 1);
                  }}
                  hitSlop={8}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: sagePale,
                    alignItems: "center",
                    justifyContent: "center",
                    marginLeft: 2,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.sans,
                      fontSize: 11,
                      color: warmGray,
                      lineHeight: 13,
                    }}
                  >
                    {"\u2715"}
                  </Text>
                </Pressable>
              </Animated.View>
            )}
          </View>

          {/* Contact Info */}
          {(person.phone || person.email) && (
            <View style={{ paddingHorizontal: 24, marginBottom: 16, gap: 10 }}>
              {person.phone && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: sagePale,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Phone size={15} color={sage} />
                  </View>
                  <Text
                    style={{
                      fontFamily: fonts.sans,
                      fontSize: 14,
                      color: nearBlack,
                    }}
                  >
                    {person.phone}
                  </Text>
                </View>
              )}
              {person.email && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: sagePale,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Mail size={15} color={sage} />
                  </View>
                  <Text
                    style={{
                      fontFamily: fonts.sans,
                      fontSize: 14,
                      color: nearBlack,
                    }}
                  >
                    {person.email}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Quick Action Bar */}
          <View
            ref={quickActionBarRef}
            collapsable={false}
            style={{
              flexDirection: "row",
              justifyContent: "center",
              gap: 32,
              paddingHorizontal: 24,
              marginBottom: 24,
            }}
          >
            <QuickAction
              icon={MessageCircle}
              label="Text"
              bgColor={sage}
              onPress={handleReachOut}
            />
            <QuickAction
              icon={Phone}
              label="Call"
              bgColor="#5E9EA0"
              onPress={handleReachOut}
            />
            <View ref={captureButtonRef} collapsable={false}>
              <QuickAction
                icon={Camera}
                label="Capture"
                bgColor={gold}
                onPress={() => router.push(`/memory/add?personId=${person.id}`)}
              />
            </View>
          </View>

          {/* Tab Navigation */}
          <ProfileTabBar activeTab={activeTab} onTabChange={setActiveTab} />

          {/* Tab Content */}
          {activeTab === "context" && (
            <ContextTab
              person={person}
              memories={memories}
              interactions={interactions}
              growthInfo={growth}
              vitalityInfo={vitality}
            />
          )}
          {activeTab === "timeline" && <TimelineTab interactions={interactions} />}
          {activeTab === "memories" && (
            <MemoriesTab memories={memories} personId={person.id} />
          )}
        </FadeIn>
      </ScrollView>

      {/* Photo Picker Modal */}
      <PhotoPickerModal
        visible={showPhotoModal}
        hasPhoto={!!photoUri}
        onChoosePhoto={handleChoosePhoto}
        onRemovePhoto={handleRemovePhoto}
        onClose={() => setShowPhotoModal(false)}
      />

      {/* Orientation overlay — Steps 3 & 4 (person profile) */}
      {showOrientation && currentOrientationConfig && (
        <OrientationOverlay
          isOpen={showOrientation}
          step={orientation.currentStep}
          totalSteps={orientation.totalSteps}
          highlightRect={orientationHighlight}
          title={currentOrientationConfig.title}
          body={currentOrientationConfig.body}
          primaryLabel={currentOrientationConfig.primaryLabel}
          onPrimary={handleOrientationAdvance}
          onSkip={orientation.skip}
          cardPosition={currentOrientationConfig.cardPosition}
        />
      )}
    </>
  );
}
