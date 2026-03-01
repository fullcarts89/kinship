/**
 * Import Contacts — Standalone screen for re-importing device contacts
 *
 * Wraps the shared ContactPicker component with a full-screen modal layout.
 * When the user selects a contact, it stores the data in module-level state
 * (pendingImport) and navigates to the Add Person tab, which picks it up.
 *
 * Contacts already in the garden are shown with an "Already planted" badge
 * and are not selectable, preventing duplicates.
 */

import React from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { colors, fonts } from "@design/tokens";
import { usePersons } from "@/hooks";
import ContactPicker from "@/components/ContactPicker";
import { setPendingImport, type ContactEntry } from "@/lib/contacts";

export default function ImportContactsScreen() {
  const insets = useSafeAreaInsets();
  const { persons } = usePersons();

  const handleSelectContact = (contact: ContactEntry) => {
    // Store the selected contact in module-level state (route params
    // don't reliably reach tab routes in Expo Router).
    setPendingImport(contact);
    router.push("/(tabs)/add");
  };

  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/people");
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.cream,
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
          paddingHorizontal: 20,
          paddingVertical: 14,
        }}
      >
        <Text
          style={{
            fontFamily: fonts.sansSemiBold,
            fontSize: 18,
            color: colors.nearBlack,
          }}
        >
          Import from contacts
        </Text>
        <Pressable onPress={handleClose} hitSlop={12}>
          <X color={colors.warmGray} size={22} />
        </Pressable>
      </View>

      {/* Picker */}
      <View style={{ flex: 1, paddingHorizontal: 20 }}>
        <ContactPicker
          persons={persons}
          onSelectContact={handleSelectContact}
        />
      </View>
    </View>
  );
}
