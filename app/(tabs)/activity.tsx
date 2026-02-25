import { View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Activity Tab — Placeholder
 *
 * Will contain:
 * - Interaction timeline (story-like history, no streaks)
 * - Suggestions from intelligence engine
 * - Resurfaced memories
 * - Recent check-ins
 */
export default function ActivityScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 bg-cream px-xl"
      style={{ paddingTop: insets.top + 16 }}
    >
      <Text className="font-serif text-4xl text-near-black mb-sm">
        Activity
      </Text>
      <Text className="font-sans text-base text-warm-gray">
        Your relationship timeline
      </Text>
    </View>
  );
}
