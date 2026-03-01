/**
 * Select Person — Lightweight person picker modal
 *
 * Used as an intermediate step when an action requires choosing a person
 * before proceeding (e.g., "Reach out" from the Tend your garden sheet).
 *
 * Accepts an `intent` query param to determine where to navigate after
 * selection. Currently supports:
 *   - "reach-out" → /reach-out/[id]
 *
 * Extensible: add new intent values here without touching TendGardenSheet.
 *
 * Pattern follows PersonSelectorModal from app/memory/add.tsx with
 * full-screen modal presentation instead of inline modal.
 */

import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  X,
  ChevronRight,
  Sprout,
  UserPlus,
} from "lucide-react-native";
import { colors, fonts } from "@design/tokens";
import { usePersons } from "@/hooks";
import type { Person } from "@/types/database";

// ─── Design Tokens (local aliases) ──────────────────────────────────────────

const sage = colors.sage;
const moss = colors.moss;
const sagePale = colors.sagePale;
const sageLight = colors.sageLight;
const cream = colors.cream;
const nearBlack = colors.nearBlack;
const warmGray = colors.warmGray;
const white = colors.white;
const borderClr = colors.border;

// ─── Relationship badge colors ──────────────────────────────────────────────

const RELATIONSHIP_COLORS: Record<string, { bg: string; text: string }> = {
  friend: { bg: sagePale, text: moss },
  family: { bg: colors.goldPale, text: "#B88A30" },
  partner: { bg: colors.lavender + "33", text: "#7B6EC0" },
  colleague: { bg: colors.sky + "33", text: "#4A8BAD" },
  mentor: { bg: colors.peach + "33", text: "#9E5A3A" },
  acquaintance: { bg: "#F0EBE3", text: warmGray },
  neighbor: { bg: sagePale, text: moss },
  other: { bg: "#F0EBE3", text: warmGray },
};

// ─── Person Row ─────────────────────────────────────────────────────────────

function PersonRow({
  person,
  onPress,
}: {
  person: Person;
  onPress: () => void;
}) {
  const relColors = RELATIONSHIP_COLORS[person.relationship_type] || RELATIONSHIP_COLORS.other;
  const relLabel =
    person.relationship_type.charAt(0).toUpperCase() +
    person.relationship_type.slice(1);

  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        padding: 14,
        borderRadius: 16,
        marginBottom: 8,
        backgroundColor: white,
        borderWidth: 1,
        borderColor: borderClr,
      }}
    >
      {/* Avatar circle */}
      <LinearGradient
        colors={[sageLight, sage]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 14,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            color: white,
            fontFamily: fonts.sansSemiBold,
          }}
        >
          {person.name.charAt(0).toUpperCase()}
        </Text>
      </LinearGradient>

      {/* Name + relationship badge */}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: fonts.sansMedium,
            fontSize: 16,
            color: nearBlack,
            marginBottom: 3,
          }}
        >
          {person.name}
        </Text>
        <View
          style={{
            alignSelf: "flex-start",
            paddingVertical: 2,
            paddingHorizontal: 8,
            borderRadius: 100,
            backgroundColor: relColors.bg,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.sans,
              fontSize: 11,
              color: relColors.text,
            }}
          >
            {relLabel}
          </Text>
        </View>
      </View>

      {/* Chevron */}
      <ChevronRight size={16} strokeWidth={2} color="#D4CFC8" />
    </Pressable>
  );
}

// ─── Empty State ────────────────────────────────────────────────────────────

function EmptyGarden({ onAddSomeone }: { onAddSomeone: () => void }) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 32,
      }}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          backgroundColor: sagePale,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
        }}
      >
        <Sprout color={sage} size={32} strokeWidth={1.6} />
      </View>
      <Text
        style={{
          fontFamily: fonts.serif,
          fontSize: 22,
          color: nearBlack,
          textAlign: "center",
          lineHeight: 28,
          marginBottom: 8,
        }}
      >
        Your garden is quiet
      </Text>
      <Text
        style={{
          fontFamily: fonts.sans,
          fontSize: 14,
          color: warmGray,
          textAlign: "center",
          lineHeight: 22,
          marginBottom: 28,
          maxWidth: 260,
        }}
      >
        Add someone to your garden first, then you can reach out to them here.
      </Text>
      <Pressable
        onPress={onAddSomeone}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingVertical: 14,
          paddingHorizontal: 24,
          borderRadius: 18,
          backgroundColor: sage,
          shadowColor: sage,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 12,
          elevation: 4,
        }}
      >
        <UserPlus color={white} size={18} strokeWidth={2} />
        <Text
          style={{
            fontFamily: fonts.sansSemiBold,
            fontSize: 15,
            color: white,
          }}
        >
          Add someone
        </Text>
      </Pressable>
    </View>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function SelectPersonScreen() {
  const insets = useSafeAreaInsets();
  const { intent } = useLocalSearchParams<{ intent?: string }>();
  const { persons } = usePersons();

  const handleSelectPerson = (person: Person) => {
    switch (intent) {
      case "reach-out":
        router.replace(`/reach-out/${person.id}`);
        break;
      default:
        // Fallback: close the screen
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace("/(tabs)");
        }
        break;
    }
  };

  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  };

  const handleAddSomeone = () => {
    router.replace("/(tabs)/add");
  };

  // Determine header text based on intent
  const headerText =
    intent === "reach-out"
      ? "Who would you like to\nreach out to?"
      : "Choose someone";

  return (
    <View style={{ flex: 1, backgroundColor: cream }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 14,
          paddingHorizontal: 22,
          paddingBottom: 16,
        }}
      >
        {/* Close button */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "flex-end",
            marginBottom: 16,
          }}
        >
          <Pressable
            onPress={handleClose}
            hitSlop={12}
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              backgroundColor: "#F0EBE3",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={18} strokeWidth={2} color={warmGray} />
          </Pressable>
        </View>

        {/* Title */}
        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize: 26,
            color: nearBlack,
            lineHeight: 33,
          }}
        >
          {headerText}
        </Text>
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 14,
            color: warmGray,
            marginTop: 6,
            lineHeight: 20,
          }}
        >
          {persons.length === 1
            ? "1 person in your garden"
            : `${persons.length} people in your garden`}
        </Text>
      </View>

      {/* Person list or empty state */}
      {persons.length === 0 ? (
        <EmptyGarden onAddSomeone={handleAddSomeone} />
      ) : (
        <ScrollView
          style={{ flex: 1, paddingHorizontal: 22 }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
        >
          {persons.map((person) => (
            <PersonRow
              key={person.id}
              person={person}
              onPress={() => handleSelectPerson(person)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}
