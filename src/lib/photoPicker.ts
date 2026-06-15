/**
 * Photo Picker
 *
 * Shared camera-or-library chooser for every place a photo can be
 * attached. Presents a small native choice, requests the right
 * permission, and returns the picked image URI (or null if the user
 * cancelled / permission was denied).
 */

import { Alert, Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  quality: 0.8,
};

async function fromLibrary(): Promise<string | null> {
  try {
    const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    if (!result.canceled && result.assets[0]) return result.assets[0].uri;
  } catch {
    // picker unavailable
  }
  return null;
}

export async function takePhotoWithCamera(): Promise<string | null> {
  return fromCamera();
}

async function fromCamera(): Promise<string | null> {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Camera is off",
        "You can allow camera access in your device Settings, or choose a photo from your library instead."
      );
      return null;
    }
    const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
    if (!result.canceled && result.assets[0]) return result.assets[0].uri;
  } catch {
    // camera unavailable (e.g. simulator/web)
  }
  return null;
}

/**
 * Ask the user whether to take a photo or choose one, then return the URI.
 * On web (no camera flow), goes straight to the library.
 */
export function pickPhoto(): Promise<string | null> {
  if (Platform.OS === "web") return fromLibrary();

  return new Promise((resolve) => {
    Alert.alert("Add a photo", undefined, [
      { text: "Take photo", onPress: () => fromCamera().then(resolve) },
      { text: "Choose from library", onPress: () => fromLibrary().then(resolve) },
      { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
    ]);
  });
}
