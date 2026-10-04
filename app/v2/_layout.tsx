// The Kinship 2.0 shell (plan §20), behind shell_v2 for the signed-in
// account: the flag chooses the shell at launch, and a link into /v2 without
// it goes back to 1.0. Everything inside runs on the user's encrypted store,
// follows the system's light or night appearance, and shares one Tell flow.
import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GUTTER } from "@/design/tokens";
import { TellFlowProvider } from "@/features/tell/TellFlow";
import { useLaunchShell } from "@/hooks/useFlags";
import { useAuth } from "@/providers";
import { V2SessionProvider } from "@/providers/V2SessionProvider";
import { Body, useNight, usePalette } from "@/ui";
import { followSystemAppearance } from "@/ui/appearance";

export default function V2Layout() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const shell = useLaunchShell(isAuthenticated ? (user?.id ?? null) : null);
  const p = usePalette();
  const night = useNight();

  // 2.0 has a night palette: follow the system here; 1.0 stays light.
  useEffect(() => {
    if (shell !== "v2") return;
    followSystemAppearance(true);
    return () => followSystemAppearance(false);
  }, [shell]);

  if (isLoading || shell === null) return null;
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (shell !== "v2") return <Redirect href="/(tabs)" />;
  const centered = (child: React.ReactNode) => (
    <View style={{ flex: 1, backgroundColor: p.paper, alignItems: "center", justifyContent: "center", padding: GUTTER }}>{child}</View>
  );
  return (
    <V2SessionProvider
      opening={centered(<ActivityIndicator color={p.inkQuiet} />)}
      unavailable={centered(<Body>{"Kinship couldn't open its secure storage on this device."}</Body>)}
    >
      <StatusBar style={night ? "light" : "dark"} />
      <TellFlowProvider>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: p.paper } }} />
      </TellFlowProvider>
    </V2SessionProvider>
  );
}
