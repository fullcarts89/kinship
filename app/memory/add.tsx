/**
 * Unified Capture Flow — 2-Screen Memory Capture
 *
 * S1 (step 0): Capture — person selector, text input, photo, emotion chips
 * S2 (step 1): Saved — GardenRevealIllustration, confirmation, back to garden
 *
 * Flow:
 * S1 → S2: Tap "Save to garden" → auto-classifies + saves
 * S2 → Garden: Tap "Back to garden"
 *
 * Auto-classification:
 * - Has photo OR text ≥ 140 chars → meaningful (+3 growth points)
 * - Text 1-139 chars, no photo     → simple    (+2 growth points)
 *
 * The user never sees these categories. They just capture.
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
  Easing,
} from "react-native-reanimated";
import {
  Camera,
  X,
  Check,
  Mic,
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
import { emotionList, formatEmotionLabel } from "@/lib/formatters";
import type { Person } from "@/types/database";
import type { Emotion } from "@/types";

// ─── Design Tokens ──────────────────────────────────────────────────────────

const sage = colors.sage;
const sageDark = colors.moss;
const sagePale = colors.sagePale;
const sageLight = colors.sageLight;
const cream = colors.cream;
const nearBlack = colors.nearBlack;
const warmGray = colors.warmGray;
const white = colors.white;
const borderClr = colors.border;

// ─── Auto-Classification ────────────────────────────────────────────────────

function classifyCapture(
  content: string,
  hasPhoto: boolean,
  emotion: Emotion | null
): "meaningful" | "simple" {
  if (hasPhoto) return "meaningful";
  if (content.length >= 140) return "meaningful";
  if (emotion !== null) return "meaningful";
  return "simple";
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

// ─── S1: Capture ────────────────────────────────────────────────────────────

function S1_Capture({
  photoUri,
  person,
  content,
  selectedEmotion,
  onPickPhoto,
  onRemovePhoto,
  onOpenPersonSelector,
  onChangeContent,
  onSelectEmotion,
  onSave,
  onCancel,
  isSaving,
}: {
  photoUri: string | null;
  person: Person | null;
  content: string;
  selectedEmotion: Emotion | null;
  onPickPhoto: () => void;
  onRemovePhoto: () => void;
  onOpenPersonSelector: () => void;
  onChangeContent: (v: string) => void;
  onSelectEmotion: (e: Emotion | null) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const canSave = !!person && content.trim().length > 0;

  return (
    <>
      {/* Header — X close */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingVertical: 12,
        }}
      >
        <Pressable onPress={onCancel} hitSlop={12}>
          <X size={24} color={nearBlack} />
        </Pressable>
      </View>

      {/* Scrollable content */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Title ─────────────────────────────────────── */}
          <Text
            style={{
              fontFamily: fonts.serif,
              fontSize: 28,
              color: nearBlack,
              marginBottom: 24,
              lineHeight: 34,
            }}
          >
            Capture a moment
          </Text>

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

          {/* ── Content Input ──────────────────────────────── */}
          <RNTextInput
            placeholder="What's on your mind?"
            placeholderTextColor={warmGray + "88"}
            value={content}
            onChangeText={onChangeContent}
            multiline
            textAlignVertical="top"
            style={{
              fontFamily: fonts.sans,
              fontSize: 16,
              color: nearBlack,
              backgroundColor: white,
              borderRadius: 14,
              padding: 16,
              paddingTop: 16,
              borderWidth: 1,
              borderColor: borderClr,
              minHeight: 120,
              marginBottom: 16,
              lineHeight: 24,
            }}
          />

          {/* ── Photo / Voice Row ─────────────────────────── */}
          <View
            style={{
              flexDirection: "row",
              gap: 12,
              marginBottom: 24,
            }}
          >
            {/* Photo button */}
            {photoUri ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: sagePale,
                  borderRadius: 12,
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderWidth: 1,
                  borderColor: sageLight,
                }}
              >
                <Image
                  source={{ uri: photoUri }}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    marginRight: 10,
                  }}
                  resizeMode="cover"
                />
                <Text
                  style={{
                    fontFamily: fonts.sansMedium,
                    fontSize: 13,
                    color: sage,
                    marginRight: 10,
                  }}
                >
                  Photo added
                </Text>
                <Pressable onPress={onRemovePhoto} hitSlop={8}>
                  <X size={16} color={warmGray} />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={onPickPhoto}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: borderClr,
                  backgroundColor: white,
                }}
              >
                <Camera size={18} color={sage} />
                <Text
                  style={{
                    fontFamily: fonts.sansMedium,
                    fontSize: 13,
                    color: nearBlack,
                  }}
                >
                  Add photo
                </Text>
              </Pressable>
            )}

            {/* Voice button — disabled placeholder */}
            <Pressable
              disabled
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: borderClr,
                backgroundColor: white,
                opacity: 0.45,
              }}
            >
              <Mic size={18} color={warmGray} />
              <Text
                style={{
                  fontFamily: fonts.sansMedium,
                  fontSize: 13,
                  color: warmGray,
                }}
              >
                Voice
              </Text>
            </Pressable>
          </View>

          {/* ── Emotion Chips ─────────────────────────────── */}
          <Text
            style={{
              fontFamily: fonts.sansSemiBold,
              fontSize: 16,
              color: nearBlack,
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
            {emotionList.map((emotion) => {
              const isSelected = selectedEmotion === emotion;
              return (
                <Pressable
                  key={emotion}
                  onPress={() =>
                    onSelectEmotion(isSelected ? null : emotion)
                  }
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 16,
                    borderRadius: 100,
                    backgroundColor: isSelected ? sage : sagePale,
                    borderWidth: isSelected ? 0 : 0,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.sansMedium,
                      fontSize: 14,
                      color: isSelected ? white : warmGray,
                    }}
                  >
                    {formatEmotionLabel(emotion)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* ── Save Button ───────────────────────────────── */}
          <Pressable
            onPress={onSave}
            disabled={!canSave || isSaving}
            style={{
              borderRadius: 16,
              overflow: "hidden",
              opacity: canSave && !isSaving ? 1 : 0.5,
            }}
          >
            <LinearGradient
              colors={[sage, sageDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                paddingVertical: 16,
                alignItems: "center",
                borderRadius: 16,
                shadowColor: sage,
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
                  color: white,
                }}
              >
                {isSaving ? "Saving..." : "Save to garden"}
              </Text>
            </LinearGradient>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

// ─── S2: Saved Confirmation ─────────────────────────────────────────────────

function S2_Saved({
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

      {/* Text content */}
      <Animated.View
        style={[
          { alignItems: "center", marginTop: 28, width: "100%" },
          contentStyle,
        ]}
      >
        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize: 24,
            color: nearBlack,
            textAlign: "center",
            lineHeight: 30,
            marginBottom: 8,
          }}
        >
          Saved to your garden
        </Text>
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 16,
            color: warmGray,
            textAlign: "center",
            lineHeight: 22,
            marginBottom: 36,
          }}
        >
          with {personName}
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
  const [step, setStep] = useState(0); // 0=Capture, 1=Saved
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [personId, setPersonId] = useState<string | null>(
    preselectedPersonId ?? persons[0]?.id ?? null
  );
  const [content, setContent] = useState("");
  const [selectedEmotion, setSelectedEmotion] = useState<Emotion | null>(null);
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
  // No permission request needed — PHPickerViewController (iOS 14+) runs
  // in its own process and shows ALL albums/folders regardless of the
  // app's photo-library permission status.
  const pickImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
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
  }, []);

  // ── Save Memory ───────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!personId) return;

    setIsSaving(true);
    try {
      const memoryContent = content.trim() || "A moment shared together";

      const created = await createMemory({
        person_id: personId,
        content: memoryContent,
        emotion: selectedEmotion,
        photo_url: photoUri ?? null,
      });

      // Only award growth and advance to success if save actually succeeded
      if (!created) {
        Alert.alert("Error", "Failed to save memory. Please try again.");
        return;
      }

      // Record growth — meaningful gets +3, simple gets +2
      const transition = recordMemoryGrowth(personId, {
        emotion: selectedEmotion,
        content: memoryContent,
      });
      if (transition && selectedPerson) {
        transition.personName = selectedPerson.name;
        const toast = getTransitionToastMessage(transition);
        showGrowthToast(toast.text, toast.emoji);
      }

      setStep(1); // Show saved confirmation
    } catch (err: any) {
      const msg = err?.message ?? (typeof err === "string" ? err : "Something went wrong. Please try again.");
      Alert.alert("Error", msg);
    } finally {
      setIsSaving(false);
    }
  }, [personId, content, photoUri, selectedEmotion, createMemory, selectedPerson]);

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
          <S1_Capture
            photoUri={photoUri}
            person={selectedPerson}
            content={content}
            selectedEmotion={selectedEmotion}
            onPickPhoto={pickImage}
            onRemovePhoto={() => setPhotoUri(null)}
            onOpenPersonSelector={() => setShowPersonModal(true)}
            onChangeContent={setContent}
            onSelectEmotion={setSelectedEmotion}
            onSave={handleSave}
            onCancel={handleCancel}
            isSaving={isSaving}
          />
        )}

        {step === 1 && (
          <S2_Saved
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
