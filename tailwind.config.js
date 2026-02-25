/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      // ── Colors ────────────────────────────────────────────────────────
      colors: {
        cream: {
          DEFAULT: "#FDF7ED",
          dark: "#F5EDDB",
        },
        sage: {
          DEFAULT: "#7A9E7E",
          pale: "#EBF3EB",
          light: "#C8DEC9",
          dark: "#4A7055",
        },
        moss: "#4A7055",
        gold: {
          DEFAULT: "#D4A853",
          light: "#F0DBA0",
          pale: "#FDF5E0",
        },
        peach: "#F4B89E",
        lavender: "#C5B8E8",
        sky: "#B8D4E8",
        terracotta: "#C97A5E",
        "near-black": "#1C1917",
        "warm-gray": "#78716C",
        border: "#E8E4DD",
        error: {
          DEFAULT: "#DC2626",
          pale: "#FEF2F2",
          light: "#FECACA",
        },
        success: {
          DEFAULT: "#16A34A",
          pale: "#F0FDF4",
        },
        warning: {
          DEFAULT: "#D97706",
          pale: "#FFFBEB",
        },
      },

      // ── Font Families (weight-specific for React Native) ──────────────
      fontFamily: {
        serif: ["DMSerifDisplay"],
        sans: ["DMSans"],
        "sans-medium": ["DMSans-Medium"],
        "sans-semibold": ["DMSans-SemiBold"],
        "sans-bold": ["DMSans-Bold"],
      },

      // ── Font Sizes ────────────────────────────────────────────────────
      fontSize: {
        "2xs": ["11px", { lineHeight: "14px" }],
        xs: ["12px", { lineHeight: "16px" }],
        sm: ["14px", { lineHeight: "20px" }],
        base: ["16px", { lineHeight: "24px" }],
        lg: ["18px", { lineHeight: "28px" }],
        xl: ["20px", { lineHeight: "28px" }],
        "2xl": ["24px", { lineHeight: "32px" }],
        "3xl": ["30px", { lineHeight: "36px" }],
        "4xl": ["36px", { lineHeight: "40px" }],
      },

      // ── Spacing ───────────────────────────────────────────────────────
      spacing: {
        "2xs": "2px",
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        "lg+": "20px",
        xl: "24px",
        "2xl": "32px",
        "3xl": "40px",
        "4xl": "48px",
        "5xl": "64px",
      },

      // ── Border Radius ─────────────────────────────────────────────────
      borderRadius: {
        none: "0px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
        full: "9999px",
      },

      // ── Shadows ───────────────────────────────────────────────────────
      boxShadow: {
        soft: "0 2px 8px rgba(28, 25, 23, 0.08)",
        card: "0 4px 16px rgba(28, 25, 23, 0.06)",
        elevated: "0 8px 24px rgba(28, 25, 23, 0.10)",
      },

      // ── Opacity ───────────────────────────────────────────────────────
      opacity: {
        disabled: "0.5",
        pressed: "0.8",
        overlay: "0.4",
      },
    },
  },
  plugins: [],
};
