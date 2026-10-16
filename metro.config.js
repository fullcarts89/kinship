const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const neverBundled = require("./metro.blocklist");

const config = getDefaultConfig(__dirname);
config.resolver.blockList = [...[].concat(config.resolver.blockList ?? []), ...neverBundled];

module.exports = withNativeWind(config, {
  input: "./global.css",
  inlineRem: 16,
});
