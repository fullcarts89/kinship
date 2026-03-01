/**
 * Kinship Design Tokens
 *
 * Single source of truth for all visual design decisions.
 * Derived from the KinshipGarden Design System v1.0.
 *
 * Usage:
 *   import { colors, fonts, spacing } from "@design/tokens";
 *
 * These tokens are mirrored in tailwind.config.js for NativeWind className usage.
 * When updating values here, keep tailwind.config.js in sync.
 */

// ─── Colors ──────────────────────────────────────────────────────────────────

export const colors = {
  /** Warm cream — primary app background */
  cream: "#FDF7ED",
  /** Cream dark — slightly deeper cream for contrast */
  creamDark: "#F5EDDB",
  /** Sage green — primary brand / CTA color */
  sage: "#7A9E7E",
  /** Sage pale — light tinted surface (chips, cards, input backgrounds) */
  sagePale: "#EBF3EB",
  /** Sage light — borders, secondary backgrounds, soft fills */
  sageLight: "#C8DEC9",
  /** Moss green / Sage dark — secondary / pressed state / deeper accent */
  moss: "#4A7055",
  /** Soft gold — accent highlights, badges, premium */
  gold: "#D4A853",
  /** Gold light — soft accent backgrounds, decorative fills */
  goldLight: "#F0DBA0",
  /** Gold pale — premium card backgrounds */
  goldPale: "#FDF5E0",
  /** Peach — decorative accent, flower colors */
  peach: "#F4B89E",
  /** Lavender — memory card accents, decorative */
  lavender: "#C5B8E8",
  /** Sky — water drops, cool accent */
  sky: "#B8D4E8",
  /** Terracotta — plant pots in illustrations */
  terracotta: "#C97A5E",
  /** Near black — primary text */
  nearBlack: "#1C1917",
  /** Warm gray — secondary text, placeholders, captions */
  warmGray: "#78716C",
  /** Pure white — card surfaces, tab bar */
  white: "#FFFFFF",
  /** Error red */
  error: "#DC2626",
  /** Error pale — light error background */
  errorPale: "#FEF2F2",
  /** Error light — error borders and soft fills */
  errorLight: "#FECACA",
  /** Success green */
  success: "#16A34A",
  /** Success pale — light success background */
  successPale: "#F0FDF4",
  /** Warning amber */
  warning: "#D97706",
  /** Warning pale — light warning background */
  warningPale: "#FFFBEB",
  /** Border color — soft warm borders */
  border: "#E8E4DD",
  /** Transparent */
  transparent: "transparent",
} as const;

// ─── Typography ──────────────────────────────────────────────────────────────

/**
 * Font family names — must match the keys used in useFonts() in _layout.tsx.
 *
 * Weight-specific variants for DM Sans because React Native requires
 * explicit font files per weight (unlike web CSS font-weight).
 */
export const fonts = {
  /** DM Serif Display 400 — headings, emotional moments, titles */
  serif: "DMSerifDisplay",
  /** DM Sans 400 — body text, descriptions */
  sans: "DMSans",
  /** DM Sans 500 — labels, subtle emphasis */
  sansMedium: "DMSans-Medium",
  /** DM Sans 600 — buttons, tab labels, section headers */
  sansSemiBold: "DMSans-SemiBold",
  /** DM Sans 700 — strong emphasis, bold headings */
  sansBold: "DMSans-Bold",
} as const;

export const fontSizes = {
  /** 11px — micro labels, badges */
  "2xs": 11,
  /** 12px — captions, timestamps */
  xs: 12,
  /** 14px — secondary body, chip text */
  sm: 14,
  /** 16px — primary body text (default) */
  base: 16,
  /** 18px — large body, list titles */
  lg: 18,
  /** 20px — section titles */
  xl: 20,
  /** 24px — screen subtitles */
  "2xl": 24,
  /** 30px — screen titles */
  "3xl": 30,
  /** 36px — hero headlines */
  "4xl": 36,
} as const;

export const lineHeights = {
  "2xs": 14,
  xs: 16,
  sm: 20,
  base: 24,
  lg: 28,
  xl: 28,
  "2xl": 32,
  "3xl": 36,
  "4xl": 40,
} as const;

/**
 * Pre-composed typography presets for common text styles.
 * Combine font family, size, line height, and color.
 */
export const typography = {
  /** Hero headline — DM Serif 36/40 */
  hero: {
    fontFamily: fonts.serif,
    fontSize: fontSizes["4xl"],
    lineHeight: lineHeights["4xl"],
    color: colors.nearBlack,
  },
  /** Screen title — DM Serif 30/36 */
  title: {
    fontFamily: fonts.serif,
    fontSize: fontSizes["3xl"],
    lineHeight: lineHeights["3xl"],
    color: colors.nearBlack,
  },
  /** Section heading — DM Sans SemiBold 20/28 */
  heading: {
    fontFamily: fonts.sansSemiBold,
    fontSize: fontSizes.xl,
    lineHeight: lineHeights.xl,
    color: colors.nearBlack,
  },
  /** Subheading — DM Sans SemiBold 18/28 */
  subheading: {
    fontFamily: fonts.sansSemiBold,
    fontSize: fontSizes.lg,
    lineHeight: lineHeights.lg,
    color: colors.nearBlack,
  },
  /** Body text — DM Sans 16/24 */
  body: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.base,
    lineHeight: lineHeights.base,
    color: colors.nearBlack,
  },
  /** Secondary body — DM Sans 14/20 */
  bodySmall: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.sm,
    color: colors.warmGray,
  },
  /** Caption — DM Sans 12/16 */
  caption: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.xs,
    lineHeight: lineHeights.xs,
    color: colors.warmGray,
  },
  /** Button label — DM Sans SemiBold 16/24 */
  button: {
    fontFamily: fonts.sansSemiBold,
    fontSize: fontSizes.base,
    lineHeight: lineHeights.base,
  },
  /** Button small label — DM Sans SemiBold 14/20 */
  buttonSmall: {
    fontFamily: fonts.sansSemiBold,
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.sm,
  },
  /** Chip / tag label — DM Sans Medium 14/20 */
  chip: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.sm,
  },
  /** Tab bar label — DM Sans Medium 11/14 */
  tabLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes["2xs"],
    lineHeight: lineHeights["2xs"],
  },
} as const;

// ─── Spacing ─────────────────────────────────────────────────────────────────

export const spacing = {
  /** 2px — hairline gaps */
  "2xs": 2,
  /** 4px — tight internal padding */
  xs: 4,
  /** 8px — compact spacing */
  sm: 8,
  /** 12px — standard internal padding */
  md: 12,
  /** 16px — default element spacing */
  lg: 16,
  /** 20px — comfortable spacing */
  "lg+": 20,
  /** 24px — section spacing */
  xl: 24,
  /** 32px — large section gaps */
  "2xl": 32,
  /** 40px — major section dividers */
  "3xl": 40,
  /** 48px — screen-level spacing */
  "4xl": 48,
  /** 64px — generous screen padding */
  "5xl": 64,
} as const;

// ─── Border Radii ────────────────────────────────────────────────────────────

export const radii = {
  /** No rounding */
  none: 0,
  /** 8px — subtle rounding (inputs, small cards) */
  sm: 8,
  /** 12px — default card rounding */
  md: 12,
  /** 16px — prominent rounding (large cards, modals) */
  lg: 16,
  /** 24px — pill shapes (buttons, chips, tags) */
  xl: 24,
  /** Fully circular (avatars, icon buttons) */
  full: 9999,
} as const;

// ─── Shadows (React Native style objects) ────────────────────────────────────

export const shadows = {
  /** No shadow */
  none: {
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  /** Subtle elevation — interactive elements, hover states */
  soft: {
    shadowColor: colors.nearBlack,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  /** Standard card elevation */
  card: {
    shadowColor: colors.nearBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  /** Elevated / floating elements (FAB, modals) */
  elevated: {
    shadowColor: colors.nearBlack,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;

// ─── Opacity ─────────────────────────────────────────────────────────────────

export const opacity = {
  /** Disabled elements */
  disabled: 0.5,
  /** Pressed/active state */
  pressed: 0.8,
  /** Overlay backdrops */
  overlay: 0.4,
  /** Full */
  full: 1,
} as const;

// ─── Animation ───────────────────────────────────────────────────────────────

export const animation = {
  /** Fast micro-interactions (button press, toggle) */
  fast: 150,
  /** Default transitions (screen fade, card expand) */
  normal: 250,
  /** Slow, deliberate transitions (modal, page) */
  slow: 400,
  /** Spring config for pressable scale */
  pressScale: 0.97,
} as const;

// ─── Layout ──────────────────────────────────────────────────────────────────

export const layout = {
  /** Screen horizontal padding */
  screenPaddingX: spacing.xl,
  /** Screen vertical padding (below safe area) */
  screenPaddingY: spacing.lg,
  /** Tab bar total height (including safe area) */
  tabBarHeight: 88,
  /** Header height */
  headerHeight: 56,
  /** iPhone 16 Pro viewport */
  viewportWidth: 390,
  viewportHeight: 844,
} as const;

// ─── Consolidated Export ─────────────────────────────────────────────────────

export const tokens = {
  colors,
  fonts,
  fontSizes,
  lineHeights,
  typography,
  spacing,
  radii,
  shadows,
  opacity,
  animation,
  layout,
} as const;

export type AppColors = keyof typeof colors;
export type AppFonts = keyof typeof fonts;
export type AppSpacing = keyof typeof spacing;
export type AppRadii = keyof typeof radii;
export type TypographyPreset = keyof typeof typography;

export default tokens;
