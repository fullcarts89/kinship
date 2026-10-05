// Today and People (Design Direction §H): two destinations, with the Tell
// field pinned above the two-item bar on both.
import React, { useRef } from "react";
import { View } from "react-native";
import { Redirect, Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ConsentSheet } from "@/features/tell/ConsentSheet";
import { TellDock } from "@/features/tell/TellDock";
import { useSetupGate } from "@/hooks/useV2";
import { space } from "@/design/tokens";
import { usePalette, Waiting } from "@/ui";
import { useKeyboardInset } from "@/ui/useKeyboardLift";

export default function MainLayout() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  // The dock rises by exactly the part of it the keyboard covers; while
  // typing, the field sits just above the keyboard and the bar stays under it.
  const dock = useRef<View>(null);
  const lift = useKeyboardInset(dock);
  // A new account sets up first; it never lands on an empty Today (contract §8).
  const gate = useSetupGate();
  if (gate === "checking") return <Waiting />;
  if (gate === "needed") return <Redirect href="/v2/setup" />;
  return (
    <>
    <ConsentSheet />
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: p.paper }, animation: "none" }}
      tabBar={({ state, navigation }) => (
        <View ref={dock} style={{ backgroundColor: p.paper, paddingBottom: lift ? lift + space.s : insets.bottom }}>
          <TellDock
            typing={lift > 0}
            current={state.routes[state.index]?.name === "people" ? "people" : "today"}
            onGo={(to) => navigation.navigate(to === "people" ? "people" : "index")}
          />
        </View>
      )}
    >
      <Tabs.Screen name="index" options={{ title: "Today" }} />
      <Tabs.Screen name="people" options={{ title: "People" }} />
    </Tabs>
    </>
  );
}
