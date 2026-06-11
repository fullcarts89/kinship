/**
 * Edit Profile — calm, single-screen editor for a person in your garden
 *
 * Mirrors the add flow's vocabulary (relationship pills, interest chips)
 * but condensed into one gentle form. Saves via useUpdatePerson and
 * returns to the profile.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  TextInput as RNTextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, Stack, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { ChevronLeft, Camera } from "lucide-react-native";
import { colors, fonts, shadows } from "@design/tokens";
import { Skeleton, ErrorState } from "@/components/ui";
import { usePerson, useUpdatePerson, useDeletePerson } from "@/hooks";
import { usePersonPhoto } from "@/hooks/usePersonPhoto";
import { relationshipLabels } from "@/lib/formatters";
import type { RelationshipType } from "@/types";

// ─── Constants ──────────────────────────────────────────────────────────────

/** All 8 relationship options — same vocabulary as the add flow */
const RELATIONSHIP_OPTIONS = Object.entries(relationshipLabels) as [
  RelationshipType,
  string,
][];

/** Interest tag presets — must match the add flow's vocabulary */
const INTERESTS: string[] = [
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
];

// ─── Small form pieces ──────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        fontFamily: fonts.sansSemiBold,
        fontSize: 13,
        color: colors.warmGray,
        marginBottom: 8,
        marginTop: 20,
      }}
    >
      {children}
    </Text>
  );
}

const inputStyle = {
  backgroundColor: colors.white,
  borderWidth: 1.5,
  borderColor: colors.border,
  borderRadius: 16,
  paddingHorizontal: 18,
  paddingVertical: 14,
  fontFamily: fonts.sans,
  fontSize: 16,
  color: colors.nearBlack,
} as const;

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function EditPersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const { person, isLoading, error, refetch } = usePerson(id ?? "");
  const { updatePerson, isUpdating } = useUpdatePerson();
  const { deletePerson, isDeleting } = useDeletePerson();
  const { photoUri: sessionPhotoUri, setPhoto } = usePersonPhoto(id ?? "");

  // ─── Form state ────────────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState<RelationshipType | null>(
    null
  );
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [birthday, setBirthday] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [customInterests, setCustomInterests] = useState<string[]>([]);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customText, setCustomText] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);

  // Hydrate the form once the person loads (only once — don't clobber edits)
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (person && !hydratedRef.current) {
      hydratedRef.current = true;
      setName(person.name);
      setRelationship(person.relationship_type);
      setPhotoUrl(sessionPhotoUri ?? person.photo_url);
      setBirthday(person.birthday ?? "");
      setPhone(person.phone ?? "");
      setEmail(person.email ?? "");
      const saved = person.interests ?? [];
      setSelectedInterests(saved);
      setCustomInterests(saved.filter((i) => !INTERESTS.includes(i)));
    }
  }, [person, sessionPhotoUri]);

  // ─── Handlers ──────────────────────────────────────────────────────────

  const handleBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace(`/person/${id}`);
  }, [id]);

  const handlePickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "livePhotos"],
        quality: 0.8,
        presentationStyle:
          ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
        // Compatible mode ensures HEIF/iCloud photos get transcoded
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      });
      if (!result.canceled && result.assets[0]) {
        setPhotoUrl(result.assets[0].uri);
      }
    } catch {
      // Picker dismissed or permission issue — nothing to do
    }
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  const handleSubmitCustom = () => {
    const trimmed = customText.trim();
    if (!trimmed) return;
    if (!INTERESTS.includes(trimmed) && !customInterests.includes(trimmed)) {
      setCustomInterests((prev) => [...prev, trimmed]);
    }
    if (!selectedInterests.includes(trimmed)) {
      setSelectedInterests((prev) => [...prev, trimmed]);
    }
    setCustomText("");
    setShowCustomInput(false);
  };

  const canSave = name.trim().length > 0 && relationship !== null && !isUpdating;

  const handleRemove = () => {
    if (!id || !person || isDeleting) return;
    const firstName = (name.trim() || person.name).split(" ")[0];
    Alert.alert(
      `Remove ${firstName} from your garden?`,
      "Their plant, memories, and moments will be removed. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await deletePerson(id);
              // The profile beneath us no longer exists — replace so
              // back-navigation can't land on it.
              router.replace("/(tabs)/people");
            } catch {
              setSaveError(
                "Couldn't let them rest just yet — give it another try in a moment."
              );
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!id || !relationship || !name.trim()) return;
    setSaveError(null);
    try {
      const updated = await updatePerson(id, {
        name: name.trim(),
        photo_url: photoUrl,
        relationship_type: relationship,
        birthday: birthday.trim() || undefined,
        phone: phone.trim() || null,
        email: email.trim() || null,
        interests: selectedInterests.length > 0 ? selectedInterests : null,
      });
      if (!updated) {
        setSaveError("Couldn't save just yet — give it another try in a moment.");
        return;
      }
      // Keep the session photo in sync so the profile shows it right away
      if (photoUrl && photoUrl !== sessionPhotoUri) setPhoto(photoUrl);
      router.back();
    } catch {
      setSaveError("Couldn't save just yet — give it another try in a moment.");
    }
  };

  // ─── Loading ───────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View
          style={{
            flex: 1,
            backgroundColor: colors.cream,
            paddingTop: insets.top + 8,
            paddingHorizontal: 24,
          }}
        >
          <Skeleton width={40} height={40} circle className="mb-lg" />
          <View style={{ alignItems: "center" }}>
            <Skeleton width={96} height={96} circle />
            <Skeleton width={200} height={28} className="mt-lg" />
          </View>
        </View>
      </>
    );
  }

  // ─── Error / not found ─────────────────────────────────────────────────
  if (error || !person) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={{ flex: 1, backgroundColor: colors.cream }}>
          <View style={{ paddingHorizontal: 24, paddingTop: insets.top + 8 }}>
            <Pressable
              onPress={handleBack}
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
              <ChevronLeft color={colors.nearBlack} size={22} />
            </Pressable>
          </View>
          <ErrorState
            message={error ? "Couldn't load this person." : "Person not found."}
            onRetry={refetch}
          />
        </View>
      </>
    );
  }

  // ─── Content ───────────────────────────────────────────────────────────
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, backgroundColor: colors.cream }}
      >
        {/* Nav bar */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingTop: insets.top + 8,
            paddingHorizontal: 24,
            paddingBottom: 8,
          }}
        >
          <Pressable
            onPress={handleBack}
            hitSlop={12}
            style={{ flexDirection: "row", alignItems: "center" }}
          >
            <ChevronLeft color={colors.sage} size={20} />
            <Text
              style={{
                fontFamily: fonts.sans,
                fontSize: 14,
                color: colors.sage,
                marginLeft: 4,
              }}
            >
              Back
            </Text>
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: insets.bottom + 40,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text
            style={{
              fontFamily: fonts.serif,
              fontSize: 28,
              color: colors.nearBlack,
              marginBottom: 4,
            }}
          >
            Edit profile
          </Text>
          <Text
            style={{
              fontFamily: fonts.sans,
              fontSize: 14,
              color: colors.warmGray,
              lineHeight: 20,
              marginBottom: 20,
            }}
          >
            Tend to the details — everything here is optional except a name.
          </Text>

          {/* Tappable avatar */}
          <Pressable
            onPress={handlePickPhoto}
            style={{ alignItems: "center", marginBottom: 4 }}
          >
            <View style={{ position: "relative" }}>
              {photoUrl ? (
                <Image
                  source={{ uri: photoUrl }}
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: 48,
                    borderWidth: 3,
                    borderColor: colors.white,
                  }}
                  resizeMode="cover"
                />
              ) : (
                <LinearGradient
                  colors={[colors.sageLight, colors.sage]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: 48,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 3,
                    borderColor: colors.white,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.sansSemiBold,
                      fontSize: 36,
                      color: colors.white,
                    }}
                  >
                    {(name.trim() || person.name).charAt(0).toUpperCase()}
                  </Text>
                </LinearGradient>
              )}

              {/* Camera overlay badge */}
              <View
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: colors.sage,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 2,
                  borderColor: colors.white,
                }}
              >
                <Camera color={colors.white} size={14} strokeWidth={2} />
              </View>
            </View>
            <Text
              style={{
                fontFamily: fonts.sans,
                fontSize: 12,
                color: colors.warmGray,
                marginTop: 8,
              }}
            >
              {photoUrl ? "Change photo" : "Add photo"}
            </Text>
          </Pressable>

          {/* Name */}
          <FieldLabel>Name</FieldLabel>
          <RNTextInput
            value={name}
            onChangeText={setName}
            placeholder="Their name"
            placeholderTextColor={colors.warmGray}
            style={inputStyle}
          />

          {/* Relationship */}
          <FieldLabel>Who they are to you</FieldLabel>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {RELATIONSHIP_OPTIONS.map(([type, label]) => {
              const isSelected = relationship === type;
              return (
                <Pressable
                  key={type}
                  onPress={() => setRelationship(type)}
                  style={{
                    backgroundColor: isSelected ? colors.sage : colors.white,
                    borderWidth: 1.5,
                    borderColor: isSelected ? colors.sage : colors.border,
                    borderRadius: 24,
                    paddingVertical: 10,
                    paddingHorizontal: 20,
                    ...shadows.soft,
                    ...(isSelected
                      ? { shadowColor: colors.sage, shadowOpacity: 0.2 }
                      : {}),
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.sansMedium,
                      fontSize: 14,
                      color: isSelected ? colors.white : colors.nearBlack,
                    }}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Birthday */}
          <FieldLabel>Birthday</FieldLabel>
          <RNTextInput
            value={birthday}
            onChangeText={setBirthday}
            placeholder="MM-DD"
            placeholderTextColor={colors.warmGray}
            autoCapitalize="none"
            autoCorrect={false}
            style={inputStyle}
          />

          {/* Phone */}
          <FieldLabel>Phone</FieldLabel>
          <RNTextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="Their number"
            placeholderTextColor={colors.warmGray}
            keyboardType="phone-pad"
            style={inputStyle}
          />

          {/* Email */}
          <FieldLabel>Email</FieldLabel>
          <RNTextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Their email"
            placeholderTextColor={colors.warmGray}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={inputStyle}
          />

          {/* Interests */}
          <FieldLabel>What you love together</FieldLabel>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {[...INTERESTS, ...customInterests].map((interest) => {
              const isSelected = selectedInterests.includes(interest);
              return (
                <Pressable
                  key={interest}
                  onPress={() => toggleInterest(interest)}
                  style={{
                    backgroundColor: isSelected
                      ? colors.sagePale
                      : colors.white,
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
            {showCustomInput ? (
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
                onPress={() => setShowCustomInput(true)}
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

          {/* Gentle inline error */}
          {saveError && (
            <Text
              style={{
                fontFamily: fonts.sans,
                fontSize: 13,
                color: colors.warmGray,
                lineHeight: 19,
                textAlign: "center",
                marginTop: 20,
              }}
            >
              {saveError}
            </Text>
          )}

          {/* Save */}
          <Pressable
            onPress={handleSave}
            disabled={!canSave}
            style={{
              borderRadius: 18,
              overflow: "hidden",
              marginTop: saveError ? 12 : 28,
              opacity: canSave ? 1 : 0.5,
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
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.sansSemiBold,
                  fontSize: 15,
                  color: colors.white,
                }}
              >
                {isUpdating ? "Saving..." : "Save changes"}
              </Text>
            </LinearGradient>
          </Pressable>

          {/* ─── Remove from garden — quiet, separated danger action ──── */}
          <View
            style={{
              height: 1,
              backgroundColor: colors.border,
              marginTop: 36,
              marginBottom: 20,
            }}
          />
          <Pressable
            onPress={handleRemove}
            disabled={isDeleting}
            hitSlop={8}
            style={{
              alignItems: "center",
              paddingVertical: 10,
              opacity: isDeleting ? 0.5 : 1,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.sansMedium,
                fontSize: 14,
                color: colors.error,
              }}
            >
              {isDeleting ? "Letting them rest..." : "Remove from garden"}
            </Text>
          </Pressable>
          <Text
            style={{
              fontFamily: fonts.sans,
              fontSize: 12,
              color: colors.warmGray,
              textAlign: "center",
              lineHeight: 18,
              marginTop: 4,
            }}
          >
            Their plant and the memories you've kept will go with them.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
