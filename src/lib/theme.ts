/**
 * Kinship Theme
 *
 * Semantic design decisions that map tokens to component-level concerns.
 * This bridges raw design tokens and component implementations.
 *
 * Import tokens for raw values. Import theme for semantic meaning.
 */

import { colors, fonts, radii, shadows, spacing, opacity } from "@design/tokens";

// ─── Semantic Color Roles ────────────────────────────────────────────────────

export const semanticColors = {
  /** Primary background for all screens */
  background: colors.cream,
  /** Card and elevated surface background */
  surface: colors.white,
  /** Tinted surface (input backgrounds, chip containers) */
  surfaceTinted: colors.sagePale,
  /** Primary brand / CTA */
  primary: colors.sage,
  /** Primary pressed / darker */
  primaryPressed: colors.moss,
  /** Primary text on brand background */
  onPrimary: colors.white,
  /** Secondary accent */
  secondary: colors.sagePale,
  /** Text on secondary surface */
  onSecondary: colors.moss,
  /** Gold accent */
  accent: colors.gold,
  /** Primary text */
  text: colors.nearBlack,
  /** Secondary text, descriptions */
  textSecondary: colors.warmGray,
  /** Muted / disabled text */
  textMuted: colors.warmGray,
  /** Placeholder text */
  textPlaceholder: colors.warmGray,
  /** Default border color */
  border: colors.sagePale,
  /** Subtle divider */
  divider: colors.sagePale,
  /** Error states */
  error: colors.error,
  errorBackground: colors.errorPale,
  /** Success states */
  success: colors.success,
  successBackground: colors.successPale,
  /** Warning states */
  warning: colors.warning,
  warningBackground: colors.warningPale,
  /** Tab bar */
  tabBarBackground: colors.white,
  tabBarActive: colors.sage,
  tabBarInactive: colors.warmGray,
  tabBarBorder: colors.sagePale,
} as const;

// ─── Component Theme: Button ─────────────────────────────────────────────────

export const buttonTheme = {
  variants: {
    primary: {
      bg: colors.sage,
      bgPressed: colors.moss,
      text: colors.white,
      border: colors.transparent,
    },
    secondary: {
      bg: colors.sagePale,
      bgPressed: "#DCE9DC", // slightly darker sagePale
      text: colors.moss,
      border: colors.transparent,
    },
    outline: {
      bg: colors.transparent,
      bgPressed: colors.sagePale,
      text: colors.sage,
      border: colors.sage,
    },
    ghost: {
      bg: colors.transparent,
      bgPressed: colors.sagePale,
      text: colors.sage,
      border: colors.transparent,
    },
    destructive: {
      bg: colors.error,
      bgPressed: "#B91C1C", // darker red
      text: colors.white,
      border: colors.transparent,
    },
  },
  sizes: {
    sm: {
      height: 36,
      paddingHorizontal: spacing.lg,
      borderRadius: radii.lg,
      fontSize: 14,
      fontFamily: fonts.sansSemiBold,
      iconSize: 16,
    },
    md: {
      height: 48,
      paddingHorizontal: spacing.xl,
      borderRadius: radii.xl,
      fontSize: 16,
      fontFamily: fonts.sansSemiBold,
      iconSize: 20,
    },
    lg: {
      height: 56,
      paddingHorizontal: spacing["2xl"],
      borderRadius: radii.xl,
      fontSize: 18,
      fontFamily: fonts.sansSemiBold,
      iconSize: 22,
    },
  },
  disabledOpacity: opacity.disabled,
} as const;

// ─── Component Theme: Card ───────────────────────────────────────────────────

export const cardTheme = {
  variants: {
    default: {
      bg: colors.white,
      border: colors.transparent,
      shadow: shadows.card,
      borderRadius: radii.lg,
    },
    elevated: {
      bg: colors.white,
      border: colors.transparent,
      shadow: shadows.elevated,
      borderRadius: radii.lg,
    },
    flat: {
      bg: colors.sagePale,
      border: colors.transparent,
      shadow: shadows.none,
      borderRadius: radii.lg,
    },
    outline: {
      bg: colors.transparent,
      border: colors.sagePale,
      shadow: shadows.none,
      borderRadius: radii.lg,
    },
  },
  padding: spacing.lg,
} as const;

// ─── Component Theme: Chip ───────────────────────────────────────────────────

export const chipTheme = {
  unselected: {
    bg: colors.sagePale,
    text: colors.warmGray,
    border: colors.transparent,
  },
  selected: {
    bg: colors.sage,
    text: colors.white,
    border: colors.transparent,
  },
  outline: {
    bg: colors.transparent,
    text: colors.sage,
    border: colors.sage,
  },
  sizes: {
    sm: {
      height: 28,
      paddingHorizontal: spacing.md,
      fontSize: 12,
      fontFamily: fonts.sansMedium,
      iconSize: 12,
      borderRadius: radii.full,
    },
    md: {
      height: 34,
      paddingHorizontal: spacing.lg,
      fontSize: 14,
      fontFamily: fonts.sansMedium,
      iconSize: 16,
      borderRadius: radii.full,
    },
    lg: {
      height: 40,
      paddingHorizontal: spacing.xl,
      fontSize: 16,
      fontFamily: fonts.sansMedium,
      iconSize: 18,
      borderRadius: radii.full,
    },
  },
} as const;

// ─── Component Theme: Avatar ─────────────────────────────────────────────────

export const avatarTheme = {
  sizes: {
    xs: { dimension: 24, fontSize: 10, fontFamily: fonts.sansSemiBold },
    sm: { dimension: 32, fontSize: 12, fontFamily: fonts.sansSemiBold },
    md: { dimension: 40, fontSize: 14, fontFamily: fonts.sansSemiBold },
    lg: { dimension: 56, fontSize: 20, fontFamily: fonts.sansSemiBold },
    xl: { dimension: 72, fontSize: 24, fontFamily: fonts.sansBold },
    "2xl": { dimension: 96, fontSize: 32, fontFamily: fonts.sansBold },
  },
  fallbackBg: colors.sagePale,
  fallbackText: colors.moss,
  borderColor: colors.white,
  borderWidth: 2,
  onlineIndicatorColor: colors.success,
} as const;

// ─── Component Theme: Screen Container ───────────────────────────────────────

export const screenTheme = {
  backgroundColor: colors.cream,
  paddingHorizontal: spacing.xl,
  paddingTop: spacing.lg,
  paddingBottom: spacing.lg,
} as const;

// ─── Consolidated Theme Export ───────────────────────────────────────────────

export const theme = {
  colors: semanticColors,
  button: buttonTheme,
  card: cardTheme,
  chip: chipTheme,
  avatar: avatarTheme,
  screen: screenTheme,
} as const;

export default theme;
