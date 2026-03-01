/**
 * Privacy & Data — Settings route
 *
 * Thin wrapper that opens the account flow directly at the Privacy & Data screen (step 14).
 * This lets Settings hub → "Privacy & Data" row navigate here directly.
 */
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Lock,
  Eye,
  EyeOff,
  Trash2,
  Download,
  Shield,
  Leaf,
  Check,
  AlertCircle,
  ChevronRight,
} from "lucide-react-native";
import { colors, fonts } from "@design/tokens";
import {
  FadingGardenIllustration,
} from "@/components/illustrations";
import { TextInput as RNTextInput } from "react-native";
import { usePersons, useMemories, useAllInteractions } from "@/hooks";
import { isSupabaseConfigured } from "@/lib/supabase";

// ─── Design Tokens ──────────────────────────────────────────────────────────

const sage = colors.sage;
const sageDark = colors.moss;
const sagePale = colors.sagePale;
const sageLight = colors.sageLight;
const cream = colors.cream;
const nearBlack = colors.nearBlack;
const warmGray = colors.warmGray;
const white = colors.white;
const dangerRed = colors.error;
const dangerPale = colors.errorPale;
const dangerLight = colors.errorLight;
const settingsBg = "#F5F0EC";
const fieldBorder = "#F0EBE3";
const chevronMuted = "#D4CFC8";
const placeholderColor = "#C4BBB0";

type Insets = { top: number; bottom: number };

// ─── Shared Primitives ──────────────────────────────────────────────────────

function NavBar({
  left,
  title,
  right,
  insets,
}: {
  left?: React.ReactNode;
  title: string;
  right?: React.ReactNode;
  insets: Insets;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: insets.top + 14,
        paddingHorizontal: 20,
        minHeight: 52,
      }}
    >
      <View style={{ minWidth: 64, alignItems: "flex-start" }}>{left}</View>
      <Text
        style={{
          fontFamily: fonts.serif,
          fontSize: 17,
          color: nearBlack,
          textAlign: "center",
          flex: 1,
        }}
      >
        {title}
      </Text>
      <View style={{ minWidth: 64, alignItems: "flex-end" }}>{right}</View>
    </View>
  );
}

function BackBtn({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
    >
      <ArrowLeft size={16} strokeWidth={2} color={sage} />
      <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: sage }}>
        Back
      </Text>
    </Pressable>
  );
}

function CancelBtn({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={12}>
      <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: warmGray }}>
        Cancel
      </Text>
    </Pressable>
  );
}

function SageBtn({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable onPress={disabled ? undefined : onPress} style={{ width: "100%", borderRadius: 18, overflow: "hidden" }}>
      <LinearGradient
        colors={disabled ? [sagePale, sagePale] : [sage, sageDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingVertical: 15,
          alignItems: "center",
          borderRadius: 18,
          shadowColor: disabled ? "transparent" : sage,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: disabled ? 0 : 0.27,
          shadowRadius: 18,
          elevation: disabled ? 0 : 6,
        }}
      >
        <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 15, color: disabled ? warmGray : white }}>
          {label}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

function OutlineBtn({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{ width: "100%", paddingVertical: 13, borderRadius: 18, borderWidth: 1.5, borderColor: "#E8E0D6", alignItems: "center" }}
    >
      <Text style={{ fontFamily: fonts.sansMedium, fontSize: 14, color: warmGray }}>{label}</Text>
    </Pressable>
  );
}

function WarmDangerBtn({ label, onPress, disabled = false }: { label: string; onPress?: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={{ width: "100%", paddingVertical: 14, borderRadius: 18, borderWidth: 1.5, borderColor: disabled ? "#EDE8E3" : dangerLight, backgroundColor: disabled ? "#F9F5F0" : dangerPale, alignItems: "center" }}
    >
      <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 15, color: disabled ? warmGray : dangerRed }}>{label}</Text>
    </Pressable>
  );
}

function SettingsRow({
  icon: Icon,
  label,
  last = false,
  iconBg = sagePale,
  iconColor = sageDark,
  labelColor = nearBlack,
  chevronColor = chevronMuted,
  onPress,
}: {
  icon: any;
  label: string;
  last?: boolean;
  iconBg?: string;
  iconColor?: string;
  labelColor?: string;
  chevronColor?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 13,
        paddingVertical: 13,
        paddingHorizontal: 18,
        backgroundColor: white,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: settingsBg,
      }}
    >
      <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: iconBg, alignItems: "center", justifyContent: "center" }}>
        <Icon size={15} strokeWidth={1.75} color={iconColor} />
      </View>
      <Text style={{ flex: 1, fontFamily: fonts.sans, fontSize: 14, color: labelColor }}>{label}</Text>
      <ChevronRight size={15} strokeWidth={2} color={chevronColor} />
    </Pressable>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 11, color: warmGray, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 8, marginLeft: 4 }}>
      {label}
    </Text>
  );
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  type = "text",
  icon: FieldIcon,
}: {
  label: string;
  value?: string;
  onChangeText?: (t: string) => void;
  placeholder?: string;
  type?: "text" | "password";
  icon?: any;
}) {
  const [showPwd, setShowPwd] = useState(false);
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 11, color: warmGray, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 7 }}>{label}</Text>
      <View style={{ position: "relative" }}>
        <View style={{ backgroundColor: white, borderWidth: 1.5, borderColor: fieldBorder, borderRadius: 14, padding: 13, paddingRight: type === "password" ? 44 : 14, flexDirection: "row", alignItems: "center", gap: 9 }}>
          {FieldIcon && <FieldIcon size={15} strokeWidth={1.75} color={warmGray} />}
          <RNTextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={placeholderColor}
            secureTextEntry={type === "password" && !showPwd}
            autoCapitalize="none"
            style={{ flex: 1, fontFamily: fonts.sans, fontSize: 15, color: nearBlack, padding: 0 }}
          />
        </View>
        {type === "password" && (
          <Pressable onPress={() => setShowPwd((s) => !s)} hitSlop={8} style={{ position: "absolute", right: 12, top: 0, bottom: 0, justifyContent: "center" }}>
            {showPwd ? <EyeOff size={16} strokeWidth={1.75} color={warmGray} /> : <Eye size={16} strokeWidth={1.75} color={warmGray} />}
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ─── Screens ────────────────────────────────────────────────────────────────

function PrivacyDataScreen({
  goExport,
  goDelete,
  onBack,
  insets,
}: {
  goExport: () => void;
  goDelete: () => void;
  onBack: () => void;
  insets: Insets;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: settingsBg }}>
      <NavBar left={<BackBtn onPress={onBack} />} title="Privacy & Data" insets={insets} />
      <View style={{ marginHorizontal: 14, marginTop: 16 }}>
        <View style={{ backgroundColor: white, borderRadius: 18, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 }}>
          <SettingsRow icon={Download} label="Export Data" onPress={goExport} />
          <SettingsRow icon={Shield} label="Privacy Policy" onPress={() => router.push("/settings/privacy-policy")} />
          <SettingsRow icon={AlertCircle} label="Terms of Service" onPress={() => router.push("/settings/terms")} last />
        </View>
      </View>
      <View style={{ marginHorizontal: 14, marginTop: 14 }}>
        <SectionLabel label="Data removal" />
        <View style={{ backgroundColor: white, borderRadius: 18, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 }}>
          <SettingsRow icon={Trash2} label="Delete Account" iconBg={dangerPale} iconColor={dangerRed} labelColor={dangerRed} chevronColor={dangerLight} onPress={goDelete} last />
        </View>
      </View>
      <View style={{ marginHorizontal: 14, marginTop: 14, padding: 13, paddingHorizontal: 16, backgroundColor: sagePale, borderRadius: 16, borderWidth: 1, borderColor: sageLight + "33" }}>
        <View style={{ flexDirection: "row", gap: 9 }}>
          <Leaf size={14} strokeWidth={1.75} color={sageDark} style={{ marginTop: 2 }} />
          <Text style={{ flex: 1, fontFamily: fonts.sans, fontSize: 12, color: warmGray, lineHeight: 19 }}>
            KinshipGarden never sells your data. Your relationships stay yours.
          </Text>
        </View>
      </View>
    </View>
  );
}

function ExportDataScreen({
  onDownload,
  onCancel,
  insets,
}: {
  onDownload: () => void;
  onCancel: () => void;
  insets: Insets;
}) {
  const items = [
    "Your relationship list & notes",
    "Memory entries & timestamps",
    "Cadence preferences & settings",
    "Weekly intention history",
  ];
  return (
    <View style={{ flex: 1, backgroundColor: cream }}>
      <NavBar left={<CancelBtn onPress={onCancel} />} title="Export your garden" insets={insets} />
      <View style={{ flex: 1, paddingHorizontal: 22, paddingTop: 24 }}>
        <Text style={{ fontFamily: fonts.serif, fontSize: 26, color: nearBlack, marginBottom: 10, lineHeight: 32 }}>
          Export your garden
        </Text>
        <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: warmGray, lineHeight: 23, marginBottom: 24 }}>
          Download a complete copy of your data in JSON format — readable by you and any app you choose.
        </Text>
        {items.map((item, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 10, paddingHorizontal: 14, backgroundColor: white, borderRadius: 12, borderWidth: 1, borderColor: fieldBorder, marginBottom: 9 }}>
            <Check size={14} strokeWidth={2.5} color={sage} />
            <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: nearBlack }}>{item}</Text>
          </View>
        ))}
        <View style={{ flexDirection: "row", gap: 9, padding: 11, paddingHorizontal: 14, backgroundColor: sagePale, borderRadius: 12, marginTop: 6 }}>
          <Shield size={13} strokeWidth={1.75} color={sageDark} style={{ marginTop: 2 }} />
          <Text style={{ flex: 1, fontFamily: fonts.sans, fontSize: 12, color: warmGray, lineHeight: 19 }}>
            Your export is generated on-device. We never see the contents.
          </Text>
        </View>
      </View>
      <View style={{ paddingHorizontal: 22, paddingBottom: insets.bottom + 44, gap: 10 }}>
        <SageBtn label="Download JSON" onPress={onDownload} />
        <OutlineBtn label="Cancel" onPress={onCancel} />
      </View>
    </View>
  );
}

function DeleteStep1Screen({
  onContinue,
  onCancel,
  insets,
}: {
  onContinue: () => void;
  onCancel: () => void;
  insets: Insets;
}) {
  const items = ["Your relationships & contact notes", "All memories you've captured", "Account details & preferences"];
  return (
    <View style={{ flex: 1, backgroundColor: cream }}>
      <NavBar right={<CancelBtn onPress={onCancel} />} title="" insets={insets} />
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 28 }}>
        <Text style={{ fontFamily: fonts.serif, fontSize: 26, color: nearBlack, marginBottom: 10, lineHeight: 32 }}>Delete your account?</Text>
        <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: warmGray, lineHeight: 23, marginBottom: 20 }}>
          This permanently removes your garden, relationships, and all associated memories from our servers.
        </Text>
        <View style={{ backgroundColor: white, borderRadius: 16, padding: 14, paddingHorizontal: 16, borderWidth: 1, borderColor: fieldBorder, marginBottom: 24 }}>
          <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: nearBlack, marginBottom: 6 }}>Want a copy of your data first?</Text>
          <Pressable style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Download size={14} strokeWidth={1.75} color={sage} />
            <Text style={{ fontFamily: fonts.sansMedium, fontSize: 13, color: sage }}>Download your data first</Text>
          </Pressable>
        </View>
        {items.map((item, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: dangerLight }} />
            <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: warmGray }}>{item}</Text>
          </View>
        ))}
      </View>
      <View style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 44, gap: 10 }}>
        <OutlineBtn label="Continue" onPress={onContinue} />
        <SageBtn label="Cancel" onPress={onCancel} />
      </View>
    </View>
  );
}

function DeleteStep2Screen({
  onDelete,
  onCancel,
  insets,
}: {
  onDelete: () => void;
  onCancel: () => void;
  insets: Insets;
}) {
  const [checked, setChecked] = useState(false);
  const [password, setPassword] = useState("");
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: cream }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <NavBar right={<CancelBtn onPress={onCancel} />} title="" insets={insets} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 28 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontFamily: fonts.serif, fontSize: 26, color: nearBlack, marginBottom: 10, lineHeight: 32 }}>This can't be undone.</Text>
        <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: warmGray, lineHeight: 23, marginBottom: 28 }}>
          Please confirm you understand what this means before continuing.
        </Text>
        <Pressable onPress={() => setChecked((c) => !c)} style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 24 }}>
          <View style={{ width: 22, height: 22, borderRadius: 7, backgroundColor: checked ? dangerPale : white, borderWidth: 1.5, borderColor: checked ? dangerLight : "#E8E0D6", alignItems: "center", justifyContent: "center", marginTop: 2 }}>
            {checked && <Check size={13} strokeWidth={2.5} color={dangerRed} />}
          </View>
          <Text style={{ flex: 1, fontFamily: fonts.sans, fontSize: 14, color: nearBlack, lineHeight: 22 }}>
            I understand this is permanent and my garden cannot be recovered.
          </Text>
        </Pressable>
        <FormField label="Confirm your password" value={password} onChangeText={setPassword} placeholder="Enter your password" type="password" icon={Lock} />
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 10, paddingHorizontal: 14, backgroundColor: "#F9F5F0", borderRadius: 12, borderWidth: 1, borderColor: fieldBorder, marginTop: 4 }}>
          <Shield size={13} strokeWidth={1.75} color={warmGray} style={{ marginTop: 2 }} />
          <Text style={{ flex: 1, fontFamily: fonts.sans, fontSize: 12, color: warmGray, lineHeight: 20 }}>
            Apple and Google users may be asked to verify their account.
          </Text>
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 44, gap: 10 }}>
        <WarmDangerBtn label="Delete my account" onPress={onDelete} disabled={!checked} />
        <OutlineBtn label="Cancel" onPress={onCancel} />
      </View>
    </KeyboardAvoidingView>
  );
}

function DeleteConfirmedScreen({ onDone, insets }: { onDone: () => void; insets: Insets }) {
  return (
    <View style={{ flex: 1, backgroundColor: cream }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28, paddingBottom: 40, paddingTop: insets.top }}>
        <FadingGardenIllustration size={208} />
        <Text style={{ fontFamily: fonts.serif, fontSize: 28, color: nearBlack, textAlign: "center", lineHeight: 34, marginTop: 16, marginBottom: 10 }}>
          Your garden has{"\n"}been removed.
        </Text>
        <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: warmGray, textAlign: "center", lineHeight: 23, marginBottom: 36, maxWidth: 270 }}>
          Thank you for spending time with Kinship. We hope to see you again.
        </Text>
        <View style={{ width: "100%" }}>
          <SageBtn label="Done" onPress={onDone} />
        </View>
      </View>
    </View>
  );
}

// ─── Main Router ────────────────────────────────────────────────────────────

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const { persons } = usePersons();
  const { memories } = useMemories();
  const { interactions } = useAllInteractions();

  const screenInsets: Insets = { top: insets.top, bottom: insets.bottom };

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/profile");
    }
  }, []);

  const handleExport = useCallback(async () => {
    try {
      const exportData = {
        exported_at: new Date().toISOString(),
        persons: persons.map((p) => ({
          name: p.name,
          relationship_type: p.relationship_type,
          birthday: (p as any).birthday ?? null,
          created_at: p.created_at,
        })),
        memories: memories.map((m) => ({
          person_id: m.person_id,
          content: m.content,
          emotion: m.emotion,
          created_at: m.created_at,
        })),
        interactions: interactions.map((i) => ({
          person_id: i.person_id,
          type: i.type,
          note: i.note ?? null,
          emotion: i.emotion ?? null,
          created_at: i.created_at,
        })),
      };

      const jsonString = JSON.stringify(exportData, null, 2);

      // Lazy require to avoid crash if modules aren't available
      const FileSystem = require("expo-file-system");
      const Sharing = require("expo-sharing");

      const fileUri = FileSystem.documentDirectory + "kinship-export.json";
      await FileSystem.writeAsStringAsync(fileUri, jsonString, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/json",
          dialogTitle: "Export your garden data",
          UTI: "public.json",
        });
      } else {
        Alert.alert("Export saved", "Your data has been saved to the app's documents folder.");
      }
    } catch (err: any) {
      Alert.alert("Export failed", err?.message ?? "Something went wrong");
    }
  }, [persons, memories, interactions]);

  switch (step) {
    case 0:
      return <PrivacyDataScreen insets={screenInsets} goExport={() => setStep(1)} goDelete={() => setStep(2)} onBack={goBack} />;
    case 1:
      return <ExportDataScreen insets={screenInsets} onDownload={handleExport} onCancel={() => setStep(0)} />;
    case 2:
      return <DeleteStep1Screen insets={screenInsets} onContinue={() => setStep(3)} onCancel={() => setStep(0)} />;
    case 3:
      return <DeleteStep2Screen insets={screenInsets} onDelete={() => setStep(4)} onCancel={() => setStep(2)} />;
    case 4:
      return <DeleteConfirmedScreen insets={screenInsets} onDone={goBack} />;
    default:
      return null;
  }
}
