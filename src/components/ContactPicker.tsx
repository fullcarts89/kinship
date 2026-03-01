/**
 * ContactPicker — Reusable contact browser with duplicate detection
 *
 * Loads device contacts, annotates them against existing garden people,
 * and lets the user select one to import.
 *
 * Duplicate contacts are shown dimmed at the bottom of the list with
 * an "Already planted" badge and are not selectable.
 *
 * Usage:
 *   <ContactPicker persons={persons} onSelectContact={handleSelect} />
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  TextInput as RNTextInput,
  ActivityIndicator,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Search, BookUser, Leaf } from "lucide-react-native";
import { colors, fonts } from "@design/tokens";
import type { Person } from "@/types/database";
import {
  loadDeviceContacts,
  annotateContacts,
  formatBirthdayPreview,
  getInitials,
  type ContactEntry,
  type AnnotatedContact,
} from "@/lib/contacts";

// ─── Props ──────────────────────────────────────────────────────────────────

interface ContactPickerProps {
  /** Garden people — used to detect duplicates */
  persons: Person[];
  /** Fires when the user taps "Select" on a non-duplicate contact */
  onSelectContact: (contact: ContactEntry) => void;
}

// ─── Max stagger animations ────────────────────────────────────────────────
const MAX_ANIMATED = 20;

// ─── Component ──────────────────────────────────────────────────────────────

export default function ContactPicker({
  persons,
  onSelectContact,
}: ContactPickerProps) {
  const [rawContacts, setRawContacts] = useState<ContactEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // ── Load contacts on mount ────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const result = await loadDeviceContacts();
      if (cancelled) return;

      if (result.permissionDenied) {
        setPermissionDenied(true);
      } else {
        setRawContacts(result.contacts);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ── Annotate with duplicates ──────────────────────────────────────────
  const annotated = useMemo(
    () => annotateContacts(rawContacts, persons),
    [rawContacts, persons]
  );

  // ── Search filter ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return annotated;
    const q = searchQuery.toLowerCase();
    return annotated.filter((c) => c.name.toLowerCase().includes(q));
  }, [annotated, searchQuery]);

  // ── Loading state ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <View
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <ActivityIndicator color={colors.sage} size="large" />
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 15,
            color: colors.warmGray,
            marginTop: 16,
          }}
        >
          Loading your contacts...
        </Text>
      </View>
    );
  }

  // ── Permission denied state ───────────────────────────────────────────
  if (permissionDenied) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 24,
        }}
      >
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: colors.sagePale,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
          }}
        >
          <BookUser color={colors.sage} size={36} strokeWidth={1.5} />
        </View>
        <Text
          style={{
            fontFamily: fonts.sansSemiBold,
            fontSize: 18,
            color: colors.nearBlack,
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          Contact access needed
        </Text>
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 14,
            color: colors.warmGray,
            textAlign: "center",
            lineHeight: 22,
            maxWidth: 280,
          }}
        >
          Enable contact access in Settings to bring in the people you already
          know. You can always add people manually.
        </Text>
      </View>
    );
  }

  // ── Render a single contact row ───────────────────────────────────────
  const renderItem = ({
    item,
    index,
  }: {
    item: AnnotatedContact;
    index: number;
  }) => {
    const entering =
      index < MAX_ANIMATED
        ? FadeInUp.delay(index * 40).duration(300)
        : undefined;

    return (
      <Animated.View entering={entering}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            opacity: item.isDuplicate ? 0.5 : 1,
          }}
        >
          {/* Avatar */}
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: item.isDuplicate
                ? colors.border
                : colors.sagePale,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.sansSemiBold,
                fontSize: 16,
                color: item.isDuplicate ? colors.warmGray : colors.sage,
              }}
            >
              {getInitials(item.name)}
            </Text>
          </View>

          {/* Info */}
          <View style={{ flex: 1 }}>
            <Text
              numberOfLines={1}
              style={{
                fontFamily: fonts.sansSemiBold,
                fontSize: 15,
                color: colors.nearBlack,
              }}
            >
              {item.name}
            </Text>
            {(item.phone || item.birthday) && (
              <Text
                numberOfLines={1}
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 13,
                  color: colors.warmGray,
                  marginTop: 1,
                }}
              >
                {[
                  item.phone,
                  item.birthday
                    ? `\uD83C\uDF82 ${formatBirthdayPreview(item.birthday)}`
                    : null,
                ]
                  .filter(Boolean)
                  .join("  \u00B7  ")}
              </Text>
            )}
          </View>

          {/* Action pill */}
          {item.isDuplicate ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: 20,
                backgroundColor: colors.sagePale,
              }}
            >
              <Leaf size={12} color={colors.moss} strokeWidth={2} />
              <Text
                style={{
                  fontFamily: fonts.sansMedium,
                  fontSize: 12,
                  color: colors.moss,
                  marginLeft: 4,
                }}
              >
                Already planted
              </Text>
            </View>
          ) : (
            <Pressable
              onPress={() => onSelectContact(item)}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 16,
                borderRadius: 20,
                backgroundColor: colors.sage,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.sansMedium,
                  fontSize: 13,
                  color: colors.white,
                }}
              >
                Select
              </Text>
            </Pressable>
          )}
        </View>
      </Animated.View>
    );
  };

  // ── Main render ───────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1 }}>
      {/* Search bar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.white,
          borderWidth: 1.5,
          borderColor: colors.border,
          borderRadius: 14,
          paddingHorizontal: 14,
          height: 46,
          marginBottom: 16,
        }}
      >
        <Search color={colors.warmGray} size={18} />
        <RNTextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search contacts"
          placeholderTextColor={colors.warmGray}
          autoFocus
          style={{
            flex: 1,
            fontFamily: fonts.sans,
            fontSize: 15,
            color: colors.nearBlack,
            marginLeft: 10,
            paddingVertical: 0,
          }}
        />
      </View>

      {/* Contact list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        initialNumToRender={30}
        maxToRenderPerBatch={20}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingTop: 40 }}>
            <Text
              style={{
                fontFamily: fonts.sans,
                fontSize: 15,
                color: colors.warmGray,
                textAlign: "center",
              }}
            >
              {searchQuery
                ? "No contacts match your search"
                : "No contacts found"}
            </Text>
          </View>
        }
      />
    </View>
  );
}
