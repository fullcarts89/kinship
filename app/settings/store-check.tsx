/**
 * DEV ONLY — Kinship 2.0 encrypted store check (Checkpoint B closeout).
 * Reachable from Settings → About in development builds only; in a release
 * build this screen renders nothing. Procedure: docs/ops/device-test-plan.md,
 * "Checkpoint B: encrypted store".
 */
import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts } from "@design/tokens";
import { useAuth } from "@/providers/AuthProvider";
import * as check from "@/dev/storeCheck";

export default function StoreCheckScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [log, setLog] = useState<string[]>([]);
  const [lastText, setLastText] = useState<string | null>(null);
  const [otherId, setOtherId] = useState("");

  const say = useCallback((line: string) => setLog((l) => [`${new Date().toLocaleTimeString()}  ${line}`, ...l]), []);
  const run = useCallback(
    (label: string, fn: () => Promise<string>) => async () => {
      try {
        say(`${label}: ${await fn()}`);
      } catch (err) {
        say(`${label}: ERROR ${err instanceof Error ? err.message : String(err)}`);
      }
    },
    [say],
  );

  if (!__DEV__) return null;
  if (!user) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top + 24, padding: 20 }}>
        <Text style={{ fontFamily: fonts.sans }}>Sign in first.</Text>
      </View>
    );
  }
  const id = user.id;

  const buttons: [string, () => Promise<string>][] = [
    ["1 Status", async () => {
      const s = await check.status(id);
      return [
        `user ${s.userId.slice(0, 8)}…  file ${s.file.slice(0, 16)}…`,
        `SQLCipher ${s.cipherVersion ?? "NOT ACTIVE"}  header "${s.header}"`,
        `rows ${JSON.stringify(s.rows)}`,
        `pending writes ${s.pendingWrites}  check notes ${s.checkCaptures.length}`,
        `files ${s.filesOnDevice.map((f) => f.slice(8, 16)).join(", ") || "none"}  keys ${JSON.stringify(Object.values(s.keysForFiles))}`,
      ].join("\n");
    }],
    ["2 Write a check note", async () => {
      const t = await check.writeCheckCapture(id);
      setLastText(t);
      return `saved locally: "${t}"`;
    }],
    ["3 Open without key (must be refused)", async () => {
      const r = await check.plaintextOpenRefused(id);
      return `${r.passed ? "PASS" : "FAIL"} ${r.detail}`;
    }],
    ["4 Open with wrong key (must be refused)", async () => {
      const r = await check.wrongKeyRefused(id);
      return `${r.passed ? "PASS" : "FAIL"} ${r.detail}`;
    }],
    ["5 Sync now", async () => JSON.stringify(await check.syncNow(id))],
    ["6 Server copies of last note (must be 1)", async () => {
      if (!lastText) {
        const s = await check.status(id);
        const t = s.checkCaptures.sort().at(-1);
        if (!t) return "no check note yet";
        setLastText(t);
        return `${await check.serverCopies(t)} copies of "${t}"`;
      }
      return `${await check.serverCopies(lastText)} copies of "${lastText}"`;
    }],
    ["7 Simulate lost key (must rebuild, not read)", async () => {
      const r = await check.simulateLostKey(id);
      return `${r.passed ? "PASS" : "FAIL"} ${r.detail}`;
    }],
    ["8 Remove check notes", async () => `removed ${await check.removeCheckCaptures(id)} (sync to apply on server)`],
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#F5F0EC" }}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40, paddingHorizontal: 16 }}>
      <Pressable onPress={() => router.back()} style={{ paddingVertical: 8 }}>
        <Text style={{ fontFamily: fonts.sans, color: colors.warmGray }}>‹ Back</Text>
      </Pressable>
      <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 18, marginBottom: 4 }}>2.0 store check (dev only)</Text>
      <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.warmGray, marginBottom: 12 }}>
        Signed in as {id}
      </Text>
      {buttons.map(([label, fn]) => (
        <Pressable key={label} onPress={run(label, fn)} accessibilityRole="button"
          style={{ backgroundColor: colors.white, borderRadius: 10, padding: 12, marginBottom: 8 }}>
          <Text style={{ fontFamily: fonts.sans, fontSize: 14 }}>{label}</Text>
        </Pressable>
      ))}
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
        <TextInput value={otherId} onChangeText={setOtherId} placeholder="Another account's user id"
          autoCapitalize="none" autoCorrect={false}
          style={{ flex: 1, backgroundColor: colors.white, borderRadius: 10, padding: 10, fontSize: 12 }} />
        <Pressable onPress={run("9 Key for that account", async () =>
          (await check.keyExistsFor(otherId)) ? "FAIL a key for that account is still on this device" : "PASS no key for that account")}
          style={{ backgroundColor: colors.white, borderRadius: 10, padding: 10, justifyContent: "center" }}>
          <Text style={{ fontFamily: fonts.sans, fontSize: 13 }}>9 Check</Text>
        </Pressable>
      </View>
      {log.map((line, i) => (
        <Text key={i} selectable style={{ fontFamily: "Courier", fontSize: 11, marginBottom: 8 }}>{line}</Text>
      ))}
    </ScrollView>
  );
}
