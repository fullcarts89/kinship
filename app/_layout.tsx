import { useEffect, useCallback } from "react";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import {
  DMSerifDisplay_400Regular,
} from "@expo-google-fonts/dm-serif-display";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import { AppProviders } from "@/providers";
import { GrowthToastOverlay } from "@/components/ui/GrowthToast";
import {
  setupNotificationHandler,
  addNotificationResponseListener,
} from "@/lib/notificationService";
import "../global.css";

// Prevent splash screen from auto-hiding until fonts are loaded
SplashScreen.preventAutoHideAsync();

/**
 * Root Layout
 *
 * Responsibilities:
 * 1. Load DM Serif Display + DM Sans fonts (all required weights)
 * 2. Hold splash screen until fonts are ready
 * 3. Wrap app in providers (SafeArea → Theme → Auth)
 * 4. Define primary navigation stack
 */
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    // Register with clean names matching tailwind.config.js fontFamily values
    DMSerifDisplay: DMSerifDisplay_400Regular,
    DMSans: DMSans_400Regular,
    "DMSans-Medium": DMSans_500Medium,
    "DMSans-SemiBold": DMSans_600SemiBold,
    "DMSans-Bold": DMSans_700Bold,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    onLayoutRootView();
  }, [onLayoutRootView]);

  // ── Notification setup ───────────────────────────────────────────────
  useEffect(() => {
    setupNotificationHandler();

    const subscription = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data;
      const type = data.type as string | undefined;
      const personId = data.personId as string | undefined;
      const memoryId = data.memoryId as string | undefined;

      // Land the user on the surface the notification promised
      if (type === "memory_capture_prompt" && personId) {
        router.push(`/memory/add?personId=${personId}`);
      } else if (type === "memory_resurface" && memoryId) {
        router.push(`/memory/${memoryId}`);
      } else if (type === "weekly_digest") {
        router.push("/activity");
      } else if (type === "garden_walk") {
        router.push("/garden-walk");
      } else if (personId) {
        router.push(`/person/${personId}`);
      }
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  // Don't render until fonts are loaded
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <AppProviders>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#FDF7ED" },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen
          name="person"
          options={{
            headerShown: false,
            presentation: "card",
          }}
        />
        <Stack.Screen
          name="memory"
          options={{
            headerShown: false,
            presentation: "modal",
          }}
        />
        <Stack.Screen
          name="reach-out"
          options={{
            headerShown: false,
            presentation: "modal",
          }}
        />
        <Stack.Screen
          name="select-person"
          options={{
            headerShown: false,
            presentation: "modal",
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            headerShown: false,
            presentation: "card",
          }}
        />
        <Stack.Screen
          name="notifications"
          options={{
            headerShown: false,
            presentation: "card",
          }}
        />
        <Stack.Screen
          name="loading"
          options={{
            headerShown: false,
            presentation: "card",
            animation: "fade",
          }}
        />
        <Stack.Screen
          name="activity"
          options={{
            headerShown: false,
            presentation: "card",
          }}
        />
        <Stack.Screen
          name="quick-note"
          options={{
            headerShown: false,
            presentation: "modal",
          }}
        />
        <Stack.Screen
          name="season"
          options={{
            headerShown: false,
            presentation: "card",
          }}
        />
        <Stack.Screen
          name="import-contacts"
          options={{
            headerShown: false,
            presentation: "modal",
          }}
        />
        <Stack.Screen name="+not-found" />
      </Stack>
      <GrowthToastOverlay />
    </AppProviders>
  );
}
