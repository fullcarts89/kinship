// DEV-ONLY lab for the 2.0 screens (plan §18). Off unless the build sets
// EXPO_PUBLIC_V2_LAB=1; otherwise it sends you home. On the web, the state
// can also be switched with the URL hash (#sams) without reloading.
import React, { useEffect, useState } from "react";
import { Platform } from "react-native";
import { Redirect, useLocalSearchParams } from "expo-router";
import { V2Lab } from "@/dev/v2Lab";

export default function Lab() {
  const { state } = useLocalSearchParams<{ state?: string }>();
  const [hash, setHash] = useState<string | null>(null);
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const read = () => setHash(window.location.hash.slice(1) || null);
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  if (process.env.EXPO_PUBLIC_V2_LAB !== "1") return <Redirect href="/" />;
  return <V2Lab key={hash ?? state ?? "tell"} state={String(hash ?? state ?? "tell")} />;
}
