import { Link, Stack } from "expo-router";
import { View, Text } from "react-native";

/**
 * 404 — Not Found Screen
 */
export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View className="flex-1 items-center justify-center bg-cream px-xl">
        <Text className="font-serif text-3xl text-near-black mb-lg">
          Page not found
        </Text>
        <Text className="font-sans text-base text-warm-gray text-center mb-xl">
          This screen doesn&apos;t exist in your garden yet.
        </Text>
        {/* Through the launch route, which opens the shell this account uses (founder I8). */}
        <Link href="/" className="mt-lg">
          <Text className="font-sans text-base text-sage font-semibold">
            Return to Garden
          </Text>
        </Link>
      </View>
    </>
  );
}
