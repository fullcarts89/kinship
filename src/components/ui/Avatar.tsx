import React, { useState } from "react";
import { View, Text, Image, type ImageSourcePropType } from "react-native";
import { cn } from "@/lib/utils";
import { colors, fonts } from "@design/tokens";
import { avatarTheme } from "@/lib/theme";

// ─── Types ───────────────────────────────────────────────────────────────────

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

export interface AvatarProps {
  /** Image source (uri or require) */
  source?: ImageSourcePropType | null;
  /** Person's name — used to generate initials as fallback */
  name?: string;
  /** Size preset */
  size?: AvatarSize;
  /** Show a green online indicator dot */
  showOnlineIndicator?: boolean;
  /** Custom fallback background color */
  fallbackColor?: string;
  /** Additional className */
  className?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extract up to 2 initials from a name.
 * "Sarah Miller" → "SM", "Jo" → "JO", "" → "?"
 */
function getInitials(name?: string): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── Size Presets ────────────────────────────────────────────────────────────

const sizeStyles = avatarTheme.sizes;

const onlineIndicatorSizeMap: Record<AvatarSize, number> = {
  xs: 6,
  sm: 8,
  md: 10,
  lg: 14,
  xl: 16,
  "2xl": 20,
};

// ─── Component ───────────────────────────────────────────────────────────────

export function Avatar({
  source,
  name,
  size = "md",
  showOnlineIndicator = false,
  fallbackColor,
  className,
}: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  const sizeConfig = sizeStyles[size];
  const dimension = sizeConfig.dimension;
  const showImage = !!source && !imageError;
  const initials = getInitials(name);
  const indicatorDim = onlineIndicatorSizeMap[size];

  return (
    <View
      className={cn("relative items-center justify-center", className)}
      style={{ width: dimension, height: dimension }}
    >
      {/* Avatar Circle */}
      {showImage ? (
        <Image
          source={source}
          onError={() => setImageError(true)}
          style={{
            width: dimension,
            height: dimension,
            borderRadius: dimension / 2,
          }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            width: dimension,
            height: dimension,
            borderRadius: dimension / 2,
            backgroundColor: fallbackColor || avatarTheme.fallbackBg,
          }}
          className="items-center justify-center"
        >
          <Text
            style={{
              fontSize: sizeConfig.fontSize,
              fontFamily: sizeConfig.fontFamily,
              color: avatarTheme.fallbackText,
            }}
          >
            {initials}
          </Text>
        </View>
      )}

      {/* Online Indicator */}
      {showOnlineIndicator && (
        <View
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: indicatorDim,
            height: indicatorDim,
            borderRadius: indicatorDim / 2,
            backgroundColor: avatarTheme.onlineIndicatorColor,
            borderWidth: avatarTheme.borderWidth,
            borderColor: avatarTheme.borderColor,
          }}
        />
      )}
    </View>
  );
}

// ─── Avatar Group ────────────────────────────────────────────────────────────

export interface AvatarGroupProps {
  /** Array of avatar data */
  avatars: Array<{
    source?: ImageSourcePropType | null;
    name?: string;
  }>;
  /** Size of each avatar */
  size?: AvatarSize;
  /** Maximum number to show before "+N" overflow */
  max?: number;
  /** Additional className */
  className?: string;
}

export function AvatarGroup({
  avatars,
  size = "sm",
  max = 4,
  className,
}: AvatarGroupProps) {
  const visible = avatars.slice(0, max);
  const overflowCount = Math.max(0, avatars.length - max);
  const dimension = sizeStyles[size].dimension;
  const overlap = dimension * 0.3;

  return (
    <View className={cn("flex-row items-center", className)}>
      {visible.map((avatar, index) => (
        <View
          key={index}
          style={{
            marginLeft: index === 0 ? 0 : -overlap,
            zIndex: visible.length - index,
            borderWidth: avatarTheme.borderWidth,
            borderColor: avatarTheme.borderColor,
            borderRadius: dimension / 2,
          }}
        >
          <Avatar
            source={avatar.source}
            name={avatar.name}
            size={size}
          />
        </View>
      ))}
      {overflowCount > 0 && (
        <View
          style={{
            marginLeft: -overlap,
            width: dimension,
            height: dimension,
            borderRadius: dimension / 2,
            backgroundColor: colors.sagePale,
            borderWidth: avatarTheme.borderWidth,
            borderColor: avatarTheme.borderColor,
          }}
          className="items-center justify-center"
        >
          <Text
            style={{
              fontSize: sizeStyles[size].fontSize - 2,
              fontFamily: fonts.sansSemiBold,
              color: colors.warmGray,
            }}
          >
            +{overflowCount}
          </Text>
        </View>
      )}
    </View>
  );
}

export default Avatar;
