// Today and People (Design Direction §H): two destinations, with the Tell
// field pinned above the two-item bar on both.
import React from "react";
import { View } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ConsentSheet } from "@/features/tell/ConsentSheet";
import { TellDock } from "@/features/tell/TellDock";
import { usePalette } from "@/ui";
import { useKeyboardLift } from "@/ui/useKeyboardLift";

export default function MainLayout() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const lift = useKeyboardLift();
  return (
    <>
    <ConsentSheet />
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: p.paper }, animation: "none" }}
      tabBar={({ state, navigation }) => (
        <View style={{ backgroundColor: p.paper, paddingBottom: lift ? lift : insets.bottom }}>
          <TellDock
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
