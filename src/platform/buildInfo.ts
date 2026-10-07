// Coarse build and platform for performance telemetry (founder CC-18, dogfood
// scope only): which build an event came from, so a fix can be told from the
// build before it. The app version, the build's short commit (baked in by
// app.config.ts from EAS), the platform and its major OS version. Nothing
// finer: no device model or name, no exact OS build, nothing about the user.
import Constants from "expo-constants";
import { Platform } from "react-native";

export interface BuildInfo {
  app_version: string;
  build: string;
  platform: string;
  os_version: string;
}

type Config = { version?: string; extra?: Record<string, unknown> | null } | null | undefined;
type PlatformLike = { OS: string; Version: string | number };

export function buildInfo(config: Config = Constants.expoConfig as Config, platform: PlatformLike = Platform): BuildInfo {
  const build = config?.extra?.build;
  return {
    app_version: typeof config?.version === "string" && config.version ? config.version : "unknown",
    build: typeof build === "string" && /^[0-9a-f]{7}$/u.test(build) ? build : "unknown",
    platform: platform.OS,
    os_version: String(platform.Version).split(".")[0] || "unknown",
  };
}
