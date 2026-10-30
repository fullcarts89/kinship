const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const neverBundled = require("./metro.blocklist");

const config = getDefaultConfig(__dirname);
config.resolver.blockList = [...[].concat(config.resolver.blockList ?? []), ...neverBundled];
// expo-sqlite's web build imports its wa-sqlite .wasm as an asset; without this the web lab (and any
// web bundle) fails to resolve it. Native bundles import no .wasm, so they are unchanged.
if (!config.resolver.assetExts.includes("wasm")) config.resolver.assetExts = [...config.resolver.assetExts, "wasm"];

module.exports = withNativeWind(config, {
  input: "./global.css",
  inlineRem: 16,
});
