/**
 * Edit Memory Screen
 *
 * Gentle editing for an existing memory — content, emotion, and photo.
 * Loads via useMemory(id), hydrates the form once, and saves through
 * useUpdateMemory. Presented within the memory modal stack.
 */
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput as RNTextInput,
} from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { Camera, X, RefreshCw } from "lucide-react-native";
import { useMemory, useUpdateMemory } from "@/hooks";
import { emotionList, formatEmotionLabel } from "@/lib/formatters";
import type { Emotion } from "@/types";
import { colors, fonts } from "@design/tokens";

export default function EditMemoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { memory, isLoading } = useMemory(id ?? "");
  const { updateMemory, isUpdating } = useUpdateMemory();

  // ─── Form State ─────────────────────────────────────────────────────────
  const [content, setContent] = useState("");
  const [emotion, setEmotion] = useState<Emotion | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Hydrate the form exactly once when the memory arrives
  useEffect(() => {
    if (memory && !hydrated) {
      setContent(memory.content);
      setEmotion(memory.emotion);
      setPhotoUri(memory.photo_url);
      setHydrated(true);
    }
  }, [memory, hydrated]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else if (id) {
      router.replace(`/memory/${id}`);
    } else {
      router.replace("/(tabs)");
    }
  }, [id]);

  // ─── Photo Picking ──────────────────────────────────────────────────────
  const pickImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "livePhotos"],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert(
        "Couldn't open photos",
        "Something went wrong opening your photo library. Please try again."
      );
    }
  }, []);

  // ─── Save ───────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!id || isUpdating) return;
    setSaveError(null);
    try {
      const updated = await updateMemory(id, {
        content: content.trim(),
        emotion,
        photo_url: photoUri,
      });
      if (updated) {
        handleBack();
      } else {
        setSaveError("We couldn't save your changes just now. Take a breath and try again.");
      }
    } catch {
      setSaveError("We couldn't save your changes just now. Take a breath and try again.");
    }
  }, [id, isUpdating, updateMemory, content, emotion, photoUri, handleBack]);

  const canSave = content.trim().length > 0;

  // ─── Loading State ──────────────────────────────────────────────────────

  if (isLoading && !hydrated) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View
          style={{
            flex: 1,
            backgroundColor: colors.cream,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator color={colors.sage} size="large" />
        </View>
      </>
    );
  }

  // ─── Not Found ──────────────────────────────────────────────────────────

  if (!memory && !hydrated) {
    handleBack();
    return null;
  }

  // ─── Edit Form ──────────────────────────────────────────────────────────

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, backgroundColor: colors.cream }}>
        {/* Header — X close */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingVertical: 12,
          }}
        >
          <Pressable onPress={handleBack} hitSlop={12}>
            <X size={24} color={colors.nearBlack} />
          </Pressable>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: 24,
              paddingBottom: insets.bottom + 40,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ── Title ─────────────────────────────────────── */}
            <Text
              style={{
                fontFamily: fonts.serif,
                fontSize: 28,
                color: colors.nearBlack,
                marginBottom: 24,
                lineHeight: 34,
              }}
            >
              Edit memory
            </Text>

            {/* ── Photo ─────────────────────────────────────── */}
            {photoUri ? (
              <View style={{ marginBottom: 16 }}>
                <Image
                  source={{ uri: photoUri }}
                  style={{
                    width: "100%",
                    height: 180,
                    borderRadius: 16,
                    marginBottom: 10,
                  }}
                  resizeMode="cover"
                />
                <View style={{ flexDirection: "row", gap: 12 }}>
                  {/* Replace photo */}
                  <Pressable
                    onPress={pickImage}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: colors.border,
                      backgroundColor: colors.white,
                    }}
                  >
                    <RefreshCw size={16} color={colors.sage} />
                    <Text
                      style={{
                        fontFamily: fonts.sansMedium,
                        fontSize: 13,
                        color: colors.nearBlack,
                      }}
                    >
                      Replace photo
                    </Text>
                  </Pressable>

                  {/* Remove photo */}
                  <Pressable
                    onPress={() => setPhotoUri(null)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: colors.border,
                      backgroundColor: colors.white,
                    }}
                  >
                    <X size={16} color={colors.warmGray} />
                    <Text
                      style={{
                        fontFamily: fonts.sansMedium,
                        fontSize: 13,
                        color: colors.warmGray,
                      }}
                    >
                      Remove
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                onPress={pickImage}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  alignSelf: "flex-start",
                  gap: 8,
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: colors.border,
                  backgroundColor: colors.white,
                  marginBottom: 16,
                }}
              >
                <Camera size={18} color={colors.sage} />
                <Text
                  style={{
                    fontFamily: fonts.sansMedium,
                    fontSize: 13,
                    color: colors.nearBlack,
                  }}
                >
                  Add photo
                </Text>
              </Pressable>
            )}

            {/* ── Content Input ─────────────────────────────── */}
            <RNTextInput
              placeholder="What's on your mind?"
              placeholderTextColor={colors.warmGray + "88"}
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
              style={{
                fontFamily: fonts.sans,
                fontSize: 16,
                color: colors.nearBlack,
                backgroundColor: colors.white,
                borderRadius: 14,
                padding: 16,
                paddingTop: 16,
                borderWidth: 1,
                borderColor: colors.border,
                minHeight: 120,
                marginBottom: 24,
                lineHeight: 24,
              }}
            />

            {/* ── Emotion Chips ─────────────────────────────── */}
            <Text
              style={{
                fontFamily: fonts.sansSemiBold,
                fontSize: 16,
                color: colors.nearBlack,
                marginBottom: 12,
              }}
            >
              How does this feel?
            </Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 32,
              }}
            >
              {emotionList.map((e) => {
                const isSelected = emotion === e;
                return (
                  <Pressable
                    key={e}
                    onPress={() => setEmotion(isSelected ? null : e)}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 16,
                      borderRadius: 100,
                      backgroundColor: isSelected ? colors.sage : colors.sagePale,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.sansMedium,
                        fontSize: 14,
                        color: isSelected ? colors.white : colors.warmGray,
                      }}
                    >
                      {formatEmotionLabel(e)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* ── Inline Save Error — gentle, not alarming ──── */}
            {saveError && (
              <Text
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 13,
                  color: colors.error,
                  lineHeight: 18,
                  marginBottom: 16,
                  paddingHorizontal: 4,
                }}
              >
                {saveError}
              </Text>
            )}

            {/* ── Save Button ───────────────────────────────── */}
            <Pressable
              onPress={handleSave}
              disabled={!canSave || isUpdating}
              style={{
                borderRadius: 16,
                overflow: "hidden",
                opacity: canSave && !isUpdating ? 1 : 0.5,
              }}
            >
              <LinearGradient
                colors={[colors.sage, colors.moss]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  paddingVertical: 16,
                  alignItems: "center",
                  borderRadius: 16,
                  shadowColor: colors.sage,
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.25,
                  shadowRadius: 18,
                  elevation: 6,
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.sansSemiBold,
                    fontSize: 16,
                    color: colors.white,
                  }}
                >
                  {isUpdating ? "Saving..." : "Save changes"}
                </Text>
              </LinearGradient>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </>
  );
}
