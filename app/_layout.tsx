import { useEffect, useCallback } from "react";
import { useColorScheme } from "react-native";
import { color } from "@/design/tokens";
import { Stack, router, type Href } from "expo-router";
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
import {
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
} from "@expo-google-fonts/instrument-sans";
import { AppProviders } from "@/providers";
import { GrowthToastOverlay } from "@/components/ui/GrowthToast";
import {
  setupNotificationHandler,
  addNotificationResponseListener,
  notificationRoute,
} from "@/lib/notificationService";
import { legacyRoutesAllowed } from "@/hooks/useFlags";
import "../global.css";
import { startCrashReporting } from "@/platform/crashReporting";
import { startAnalytics } from "@/platform/analyticsSetup";
import { followSystemAppearance } from "@/ui/appearance";
import { buildEntryShell } from "@/platform/entryShell";

// Scrubbed crash reporting; a no-op unless EXPO_PUBLIC_SENTRY_DSN is set.
startCrashReporting();
// Content-free product analytics; off unless EXPO_PUBLIC_ANALYTICS_ENABLED=true.
startAnalytics();

// The app follows the system appearance only inside the 2.0 shell, which has
// a night palette (app/v2/_layout.tsx releases this; so does the 2.0
// dogfood build from launch, for its welcome). 1.0 is light-only.
followSystemAppearance(buildEntryShell() === "v2");

// Prevent splash screen from auto-hiding until fonts are loaded
SplashScreen.preventAutoHideAsync();

/**
 * Root Layout
 *
 * Responsibilities:
 * 1. Load the fonts: DM Serif Display + DM Sans for 1.0; Newsreader +
 *    Instrument Sans for the 2.0 shell (names match src/design/tokens.ts)
 * 2. Hold splash screen until fonts are ready
 * 3. Wrap app in providers (SafeArea → Theme → Auth)
 * 4. Define primary navigation stack
 */
export default function RootLayout() {
  const night = useColorScheme() === "dark";
  const [fontsLoaded, fontError] = useFonts({
    // Register with clean names matching tailwind.config.js fontFamily values
    DMSerifDisplay: DMSerifDisplay_400Regular,
    DMSans: DMSans_400Regular,
    "DMSans-Medium": DMSans_500Medium,
    "DMSans-SemiBold": DMSans_600SemiBold,
    "DMSans-Bold": DMSans_700Bold,
    // Kinship 2.0 (src/design/tokens.ts `font`).
    NewsreaderDisplay: require("../assets/fonts/newsreader/NewsreaderDisplay-Regular.ttf"),
    NewsreaderText: require("../assets/fonts/newsreader/NewsreaderText-Regular.ttf"),
    NewsreaderTextLight: require("../assets/fonts/newsreader/NewsreaderText-Light.ttf"),
    NewsreaderTextItalic: require("../assets/fonts/newsreader/NewsreaderText-Italic.ttf"),
    InstrumentSans: InstrumentSans_400Regular,
    "InstrumentSans-Medium": InstrumentSans_500Medium,
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
      // Land the user on the surface the notification promised. These are
      // 1.0's notifications: in a 2.0 session (or the 2.0 build still
      // deciding) they just open the app, never a 1.0 screen (founder I8).
      if (!legacyRoutesAllowed()) return;
      const href = notificationRoute(response.notification.request.content.data);
      if (href) router.push(href as Href);
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
        {/* 2.0 arrives by a fade on its own paper: never a slide over 1.0's cream. */}
        <Stack.Screen
          name="v2"
          options={{
            headerShown: false,
            animation: "fade",
            contentStyle: { backgroundColor: night ? color.night.paper : color.light.paper },
          }}
        />
        <Stack.Screen name="+not-found" />
      </Stack>
      <GrowthToastOverlay />
    </AppProviders>
  );
}
