/**
 * FadeInImage
 *
 * Drop-in replacement for react-native Image that fades in over 300ms
 * once the image loads, instead of popping. Shows a soft sagePale
 * placeholder block while loading.
 */

import React, { useCallback } from "react";
import { View, Image, type ImageProps } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { colors } from "@design/tokens";

const AnimatedImage = Animated.createAnimatedComponent(Image);

export function FadeInImage({ style, onLoad, ...rest }: ImageProps) {
  const opacity = useSharedValue(0);

  const handleLoad = useCallback(
    (e: Parameters<NonNullable<ImageProps["onLoad"]>>[0]) => {
      opacity.value = withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.quad),
      });
      onLoad?.(e);
    },
    [onLoad]
  );

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View style={[{ backgroundColor: colors.sagePale, overflow: "hidden" }, style]}>
      <AnimatedImage
        {...rest}
        onLoad={handleLoad}
        style={[{ width: "100%", height: "100%" }, animatedStyle]}
      />
    </View>
  );
}

export default FadeInImage;
