import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  Animated,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowLeft,
  Leaf,
  Check,
  ChevronRight,
  Moon,
} from "lucide-react-native";
import { colors, fonts } from "@design/tokens";
import {
  GardenRevealIllustration,
  IntentionIllustration,
  SeedIllustration,
  RestingPlantIllustration,
} from "@/components/illustrations";

// ─── Category Config ────────────────────────────────────────────────────────

const CATEGORY_CONFIG = [
  {
    key: "memory",
    emoji: "✦",
    bg: colors.goldPale,
    border: colors.goldLight,
    title: "Memory Reflections",
    desc: "Rediscover moments you've shared",
    color: "#B88A30",
  },
  {
    key: "capture",
    emoji: "📸",
    bg: colors.sagePale,
    border: colors.sageLight,
    title: "Save Moment Prompts",
    desc: "Gentle invitations to capture memories",
    color: colors.moss,
  },
  {
    key: "suggest",
    emoji: "🌱",
    bg: colors.lavender + "33",
    border: colors.lavender + "77",
    title: "Relationship Suggestions",
    desc: "Thoughtful nudges to reconnect",
    color: "#7B6EC0",
  },
  {
    key: "garden",
    emoji: "🌿",
    bg: colors.peach + "33",
    border: colors.peach + "77",
    title: "Garden Reflections",
    desc: "Occasional reminders of how you've shown up",
    color: "#9E5A3A",
  },
];

// ─── Frequency Options ──────────────────────────────────────────────────────

const FREQ_OPTIONS = [
  { key: "often", emoji: "🌸", label: "Often", sub: "A few times a week, gently" },
  { key: "sometimes", emoji: "🌿", label: "Sometimes", sub: "Once or twice a week" },
  { key: "rarely", emoji: "🌱", label: "Rarely", sub: "Occasionally, when it matters" },
  { key: "pause", emoji: "🌙", label: "Pause", sub: "None for now — rest your garden" },
];

// ─── NavBar ─────────────────────────────────────────────────────────────────

function NavBar({
  title,
  onBack,
  insetTop,
}: {
  title: string;
  onBack: () => void;
  insetTop: number;
}) {
  return (
    <View style={{ paddingTop: insetTop }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingTop: 14,
          minHeight: 46,
        }}
      >
        <Pressable
          onPress={onBack}
          hitSlop={12}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
          }}
        >
          <ArrowLeft size={16} strokeWidth={2} color={colors.sage} />
          <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: colors.sage }}>
            Back
          </Text>
        </Pressable>
        <Text
          style={{
            flex: 1,
            textAlign: "center",
            fontFamily: fonts.serif,
            fontSize: 18,
            color: colors.nearBlack,
            marginRight: 56,
          }}
        >
          {title}
        </Text>
      </View>
    </View>
  );
}

// ─── SoftToggle ─────────────────────────────────────────────────────────────

function SoftToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <Pressable
      onPress={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      style={{
        width: 54,
        height: 31,
        borderRadius: 100,
        backgroundColor: on ? colors.sage : "#DDD8D2",
        justifyContent: "center",
        shadowColor: on ? colors.sage : "transparent",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: on ? 0.25 : 0,
        shadowRadius: 12,
        elevation: on ? 3 : 0,
      }}
    >
      <View
        style={{
          position: "absolute",
          top: 3.5,
          left: on ? 26.5 : 3.5,
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: colors.white,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.16,
          shadowRadius: 6,
          elevation: 2,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {on && <Leaf size={11} strokeWidth={2.5} color={colors.sage} />}
      </View>
    </Pressable>
  );
}

// ─── NotifCategoryCard ──────────────────────────────────────────────────────

function NotifCategoryCard({
  cfg,
  on,
  onToggle,
  onPress,
}: {
  cfg: (typeof CATEGORY_CONFIG)[0];
  on: boolean;
  onToggle: () => void;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 13,
        padding: 14,
        paddingHorizontal: 16,
        backgroundColor: on ? colors.white : "#FAFAF8",
        borderRadius: 18,
        borderWidth: 1.5,
        borderColor: on ? "#F0EBE3" : "#EDEAE5",
        marginBottom: 10,
        shadowColor: on ? "#000" : "transparent",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: on ? 0.04 : 0,
        shadowRadius: 6,
        elevation: on ? 1 : 0,
      }}
    >
      {/* Icon */}
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          backgroundColor: on ? cfg.bg : "#F0EBE3",
          alignItems: "center",
          justifyContent: "center",
          borderWidth: on ? 1 : 0,
          borderColor: on ? cfg.border : "transparent",
        }}
      >
        <Text style={{ fontSize: 20 }}>{cfg.emoji}</Text>
      </View>

      {/* Text */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize: 16,
            color: on ? colors.nearBlack : colors.warmGray,
            lineHeight: 20,
            marginBottom: 3,
          }}
        >
          {cfg.title}
        </Text>
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 12,
            color: on ? colors.warmGray : "#B8B0A8",
            lineHeight: 17,
          }}
        >
          {cfg.desc}
        </Text>
      </View>

      {/* Toggle */}
      <SoftToggle on={on} onToggle={onToggle} />
    </Pressable>
  );
}

// ─── FrequencyOptionCard ────────────────────────────────────────────────────

function FrequencyOptionCard({
  opt,
  selected,
  onPress,
}: {
  opt: (typeof FREQ_OPTIONS)[0];
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 13,
        padding: 13,
        paddingHorizontal: 16,
        backgroundColor: selected ? colors.sagePale : colors.white,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: selected ? colors.sageLight : "#F0EBE3",
        marginBottom: 10,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 13,
          backgroundColor: selected ? colors.sage + "22" : colors.sagePale,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 20 }}>{opt.emoji}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize: 16,
            color: selected ? colors.moss : colors.nearBlack,
            marginBottom: 2,
          }}
        >
          {opt.label}
        </Text>
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 12,
            color: colors.warmGray,
            lineHeight: 17,
          }}
        >
          {opt.sub}
        </Text>
      </View>
      {selected && (
        <LinearGradient
          colors={[colors.sage, colors.moss]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: colors.sage,
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <Check size={11} strokeWidth={3} color={colors.white} />
        </LinearGradient>
      )}
    </Pressable>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN 1 — Notification Settings Overview
// ═══════════════════════════════════════════════════════════════════════════

function OverviewScreen({
  onBack,
  onOpenCategory,
  onOpenPause,
  insetTop,
}: {
  onBack: () => void;
  onOpenCategory: (key: string) => void;
  onOpenPause: () => void;
  insetTop: number;
}) {
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    memory: true,
    capture: true,
    suggest: true,
    garden: true,
  });

  const toggle = (key: string) =>
    setToggles((t) => ({ ...t, [key]: !t[key] }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <NavBar title="Notifications" onBack={onBack} insetTop={insetTop} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Illustration */}
        <View style={{ alignItems: "center", marginTop: 12 }}>
          <GardenRevealIllustration size={148} />
        </View>

        {/* Intro */}
        <View style={{ paddingHorizontal: 24, paddingTop: 2, paddingBottom: 16 }}>
          <Text
            style={{
              fontFamily: fonts.serif,
              fontSize: 20,
              color: colors.nearBlack,
              lineHeight: 26,
              textAlign: "center",
              marginBottom: 5,
            }}
          >
            Kinship shares reflections and gentle moments with you.
          </Text>
          <Text
            style={{
              fontFamily: fonts.sans,
              fontSize: 13,
              color: colors.warmGray,
              lineHeight: 21,
              textAlign: "center",
            }}
          >
            You can choose how your garden speaks to you.
          </Text>
        </View>

        {/* Divider */}
        <View
          style={{
            height: 1,
            backgroundColor: "#F0EBE3",
            marginHorizontal: 22,
            marginBottom: 16,
          }}
        />

        {/* Category Cards */}
        <View style={{ paddingHorizontal: 22 }}>
          {CATEGORY_CONFIG.map((cfg) => (
            <NotifCategoryCard
              key={cfg.key}
              cfg={cfg}
              on={toggles[cfg.key]}
              onToggle={() => toggle(cfg.key)}
              onPress={() => onOpenCategory(cfg.key)}
            />
          ))}
        </View>

        {/* Quiet Garden Card */}
        <View style={{ paddingHorizontal: 22, paddingTop: 4 }}>
          <Pressable
            onPress={onOpenPause}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              padding: 14,
              paddingHorizontal: 18,
              backgroundColor: "transparent",
              borderRadius: 18,
              borderWidth: 1.5,
              borderColor: colors.sageLight,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 13,
                backgroundColor: colors.sagePale,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 21 }}>🌙</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: fonts.serif,
                  fontSize: 16,
                  color: colors.nearBlack,
                  marginBottom: 2,
                }}
              >
                Quiet your garden
              </Text>
              <Text
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 12,
                  color: colors.warmGray,
                  lineHeight: 17,
                }}
              >
                Pause all notifications for now
              </Text>
            </View>
            <ChevronRight size={14} strokeWidth={2} color="#D4CFC8" />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN 2 — Category Detail (Memory Reflections)
// ═══════════════════════════════════════════════════════════════════════════

function CategoryDetailScreen({
  onBack,
  insetTop,
}: {
  onBack: () => void;
  insetTop: number;
}) {
  const [freq, setFreq] = useState("sometimes");
  const cfg = CATEGORY_CONFIG[0]; // Memory Reflections

  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <NavBar title="Memory Reflections" onBack={onBack} insetTop={insetTop} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Illustration */}
        <View style={{ alignItems: "center", marginTop: 14 }}>
          <IntentionIllustration size={136} />
        </View>

        {/* Description */}
        <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 20 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 7,
              marginBottom: 10,
            }}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 9,
                backgroundColor: colors.goldPale,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 14 }}>✦</Text>
            </View>
            <Text
              style={{
                fontFamily: fonts.sansBold,
                fontSize: 11,
                color: "#B88A30",
                textTransform: "uppercase",
                letterSpacing: 0.7,
              }}
            >
              Memory Reflections
            </Text>
          </View>
          <Text
            style={{
              fontFamily: fonts.serif,
              fontSize: 19,
              color: colors.nearBlack,
              lineHeight: 25,
              marginBottom: 6,
            }}
          >
            Kinship occasionally resurfaces meaningful moments so they can bloom
            again.
          </Text>
          <Text
            style={{
              fontFamily: fonts.sans,
              fontSize: 13,
              color: colors.warmGray,
              lineHeight: 21,
            }}
          >
            These reflections arrive quietly, like a letter you didn't know you
            needed.
          </Text>
        </View>

        {/* Frequency Selector */}
        <View style={{ paddingHorizontal: 22 }}>
          <Text
            style={{
              fontFamily: fonts.sansBold,
              fontSize: 11,
              color: colors.warmGray,
              textTransform: "uppercase",
              letterSpacing: 0.8,
              marginBottom: 12,
            }}
          >
            How often?
          </Text>
          {FREQ_OPTIONS.map((opt) => (
            <FrequencyOptionCard
              key={opt.key}
              opt={opt}
              selected={freq === opt.key}
              onPress={() => setFreq(opt.key)}
            />
          ))}
        </View>

        {/* Reassurance */}
        <View
          style={{
            marginHorizontal: 22,
            marginTop: 6,
            padding: 14,
            paddingHorizontal: 16,
            backgroundColor: colors.sagePale,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.sageLight + "55",
            flexDirection: "row",
            gap: 9,
          }}
        >
          <Leaf
            size={14}
            strokeWidth={2}
            color={colors.sage}
            style={{ marginTop: 1 }}
          />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: fonts.serif,
                fontSize: 15,
                color: colors.moss,
                marginBottom: 3,
              }}
            >
              You're always in control.
            </Text>
            <Text
              style={{
                fontFamily: fonts.sans,
                fontSize: 12,
                color: colors.warmGray,
                lineHeight: 19,
              }}
            >
              Change how often your memories resurface, or pause them any time.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN 3 — Pause All Notifications Modal
// ═══════════════════════════════════════════════════════════════════════════

function PauseModal({
  visible,
  onPause,
  onCancel,
}: {
  visible: boolean;
  onPause: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
    >
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        {/* Dimmed overlay */}
        <Pressable
          onPress={onCancel}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(28,24,20,0.44)",
          }}
        />

        {/* Modal sheet */}
        <View
          style={{
            backgroundColor: colors.white,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 24,
            paddingBottom: 48,
            paddingTop: 6,
          }}
        >
          {/* Handle */}
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

          {/* Resting plant */}
          <View style={{ alignItems: "center", marginBottom: 6 }}>
            <RestingPlantIllustration size={124} />
          </View>

          <Text
            style={{
              fontFamily: fonts.serif,
              fontSize: 24,
              color: colors.nearBlack,
              textAlign: "center",
              lineHeight: 29,
              marginBottom: 8,
            }}
          >
            Quiet your garden
          </Text>
          <Text
            style={{
              fontFamily: fonts.sans,
              fontSize: 14,
              color: colors.warmGray,
              textAlign: "center",
              lineHeight: 23,
              marginBottom: 28,
              maxWidth: 290,
              alignSelf: "center",
            }}
          >
            Kinship will stay quietly in the background. Your memories will be
            here whenever you return.
          </Text>

          {/* Pause button */}
          <Pressable
            onPress={onPause}
            style={{
              backgroundColor: colors.sage,
              borderRadius: 18,
              paddingVertical: 15,
              alignItems: "center",
              shadowColor: colors.sage,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.25,
              shadowRadius: 18,
              elevation: 4,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.sansSemiBold,
                fontSize: 15,
                color: colors.white,
              }}
            >
              Pause
            </Text>
          </Pressable>

          {/* Cancel */}
          <Pressable
            onPress={onCancel}
            style={{ alignItems: "center", marginTop: 4, padding: 8 }}
          >
            <Text
              style={{
                fontFamily: fonts.sans,
                fontSize: 14,
                color: colors.warmGray,
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

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN 4 — Notifications Paused State
// ═══════════════════════════════════════════════════════════════════════════

function PausedScreen({
  onResume,
  onBack,
  insetTop,
  insetBottom,
}: {
  onResume: () => void;
  onBack: () => void;
  insetTop: number;
  insetBottom: number;
}) {
  return (
    <LinearGradient
      colors={[colors.sagePale, colors.cream]}
      locations={[0, 0.55]}
      style={{ flex: 1 }}
    >
      <NavBar title="Notifications" onBack={onBack} insetTop={insetTop} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insetBottom + 44 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Resting plant — central moment */}
        <View style={{ alignItems: "center", paddingHorizontal: 24, paddingTop: 18 }}>
          <RestingPlantIllustration size={172} />
          <Text
            style={{
              fontFamily: fonts.serif,
              fontSize: 26,
              color: colors.nearBlack,
              textAlign: "center",
              lineHeight: 31,
              marginTop: 14,
              marginBottom: 8,
            }}
          >
            Your garden is resting.
          </Text>
          <Text
            style={{
              fontFamily: fonts.sans,
              fontSize: 14,
              color: colors.warmGray,
              textAlign: "center",
              lineHeight: 23,
              maxWidth: 270,
            }}
          >
            Kinship will remain here, quietly, whenever you're ready.
          </Text>
        </View>

        {/* Divider */}
        <View
          style={{
            height: 1,
            backgroundColor: "#F0EBE3",
            marginHorizontal: 22,
            marginVertical: 18,
          }}
        />

        {/* Paused category cards (all OFF, muted) */}
        <View style={{ paddingHorizontal: 22 }}>
          {CATEGORY_CONFIG.map((cfg) => (
            <View
              key={cfg.key}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 13,
                padding: 14,
                paddingHorizontal: 16,
                backgroundColor: "rgba(255,255,255,0.65)",
                borderRadius: 18,
                borderWidth: 1.5,
                borderColor: "#EDEAE5",
                marginBottom: 10,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: "#F0EBE3",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: 0.55,
                }}
              >
                <Text style={{ fontSize: 20 }}>{cfg.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: fonts.serif,
                    fontSize: 16,
                    color: colors.warmGray,
                    lineHeight: 20,
                    marginBottom: 2,
                  }}
                >
                  {cfg.title}
                </Text>
                <Text
                  style={{ fontFamily: fonts.sans, fontSize: 12, color: "#B8B0A8", lineHeight: 17 }}
                >
                  {cfg.desc}
                </Text>
              </View>
              {/* Static OFF toggle */}
              <View
                style={{
                  width: 54,
                  height: 31,
                  borderRadius: 100,
                  backgroundColor: "#DDD8D2",
                  justifyContent: "center",
                }}
              >
                <View
                  style={{
                    position: "absolute",
                    top: 3.5,
                    left: 3.5,
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: colors.white,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.12,
                    shadowRadius: 6,
                    elevation: 1,
                  }}
                />
              </View>
            </View>
          ))}
        </View>

        {/* Resume button */}
        <View style={{ paddingHorizontal: 22, paddingTop: 12 }}>
          <Pressable
            onPress={onResume}
            style={{
              backgroundColor: colors.white,
              borderWidth: 1.5,
              borderColor: colors.sageLight,
              borderRadius: 18,
              paddingVertical: 14,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              shadowColor: colors.sage,
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.12,
              shadowRadius: 12,
              elevation: 2,
            }}
          >
            <Leaf size={15} strokeWidth={2} color={colors.sage} />
            <Text
              style={{
                fontFamily: fonts.sansSemiBold,
                fontSize: 15,
                color: colors.moss,
              }}
            >
              Resume notifications
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN 5 — Permission Explanation (First-Time UX)
// ═══════════════════════════════════════════════════════════════════════════

function PermissionScreen({
  onAllow,
  onSkip,
  insetTop,
  insetBottom,
}: {
  onAllow: () => void;
  onSkip: () => void;
  insetTop: number;
  insetBottom: number;
}) {
  return (
    <LinearGradient
      colors={[colors.sagePale, colors.cream]}
      locations={[0, 0.6]}
      style={{ flex: 1 }}
    >
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 28,
          paddingTop: insetTop,
          paddingBottom: insetBottom,
        }}
      >
        {/* Illustration with glow */}
        <View style={{ position: "relative", marginBottom: 8 }}>
          <View
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 190,
              height: 190,
              borderRadius: 95,
              backgroundColor: colors.goldLight + "44",
              transform: [{ translateX: -95 }, { translateY: -95 }],
            }}
          />
          <SeedIllustration size={176} />
        </View>

        {/* Kinship leaf badge */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 7,
            marginBottom: 16,
          }}
        >
          <LinearGradient
            colors={[colors.sage, colors.moss]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 28,
              height: 28,
              borderRadius: 9,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Leaf size={13} strokeWidth={2.5} color={colors.white} />
          </LinearGradient>
          <Text
            style={{
              fontFamily: fonts.sansSemiBold,
              fontSize: 13,
              color: colors.moss,
            }}
          >
            Kinship
          </Text>
        </View>

        {/* Headline */}
        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize: 26,
            color: colors.nearBlack,
            textAlign: "center",
            lineHeight: 33,
            marginBottom: 12,
            maxWidth: 290,
          }}
        >
          Would you like Kinship to share gentle reflections?
        </Text>
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 14,
            color: colors.warmGray,
            textAlign: "center",
            lineHeight: 24,
            marginBottom: 36,
            maxWidth: 280,
          }}
        >
          This helps memories bloom again. You'll only receive what feels
          meaningful — never urgent.
        </Text>

        {/* Actions */}
        <View style={{ width: "100%", gap: 12, alignItems: "center" }}>
          <Pressable
            onPress={onAllow}
            style={{
              width: "100%",
              backgroundColor: colors.sage,
              borderRadius: 18,
              paddingVertical: 15,
              alignItems: "center",
              shadowColor: colors.sage,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.25,
              shadowRadius: 18,
              elevation: 4,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.sansSemiBold,
                fontSize: 15,
                color: colors.white,
              }}
            >
              Allow Notifications
            </Text>
          </Pressable>
          <Pressable onPress={onSkip} style={{ padding: 8 }}>
            <Text
              style={{
                fontFamily: fonts.sans,
                fontSize: 14,
                color: colors.warmGray,
              }}
            >
              Not now
            </Text>
          </Pressable>
        </View>

        {/* Trust note */}
        <View
          style={{
            flexDirection: "row",
            gap: 7,
            alignItems: "flex-start",
            marginTop: 24,
            padding: 11,
            paddingHorizontal: 14,
            backgroundColor: colors.sage + "16",
            borderRadius: 13,
            borderWidth: 1,
            borderColor: colors.sageLight + "44",
          }}
        >
          <Leaf
            size={12}
            strokeWidth={1.75}
            color={colors.sage}
            style={{ marginTop: 1 }}
          />
          <Text
            style={{
              fontFamily: fonts.sans,
              fontSize: 12,
              color: colors.warmGray,
              lineHeight: 19,
              flex: 1,
            }}
          >
            You can change or pause this any time from Settings.
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN SCREEN — Orchestrator
// ═══════════════════════════════════════════════════════════════════════════

export default function NotificationSettingsScreen() {
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<
    "overview" | "detail" | "paused" | "permission"
  >("overview");
  const [showPauseModal, setShowPauseModal] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      {phase === "overview" && (
        <OverviewScreen
          onBack={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/settings");
            }
          }}
          onOpenCategory={() => setPhase("detail")}
          onOpenPause={() => setShowPauseModal(true)}
          insetTop={insets.top}
        />
      )}

      {phase === "detail" && (
        <CategoryDetailScreen
          onBack={() => setPhase("overview")}
          insetTop={insets.top}
        />
      )}

      {phase === "paused" && (
        <PausedScreen
          onResume={() => setPhase("overview")}
          onBack={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/settings");
            }
          }}
          insetTop={insets.top}
          insetBottom={insets.bottom}
        />
      )}

      {phase === "permission" && (
        <PermissionScreen
          onAllow={() => setPhase("overview")}
          onSkip={() => setPhase("overview")}
          insetTop={insets.top}
          insetBottom={insets.bottom}
        />
      )}

      <PauseModal
        visible={showPauseModal}
        onPause={() => {
          setShowPauseModal(false);
          setPhase("paused");
        }}
        onCancel={() => setShowPauseModal(false)}
      />
    </View>
  );
}
