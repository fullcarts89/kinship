// Kinship 2.0 design tokens: the Quiet Herbarium (plan §18), PROVISIONAL.
//
// Used only by the 2.0 shell (app/v2, src/ui, src/features). The 1.0 app
// keeps design/tokens.ts until it is deleted (DEL-10). What is provisional
// until the design-system epic (E07) and its on-device lab:
//   * type: the plan's Newsreader and Instrument Sans aren't installed yet;
//     the families already bundled stand in (DM Serif Display, DM Sans);
//   * night: defined and contrast-checked, but the app still declares a
//     light-only interface (app.json), so it isn't shown yet.
// Colour pairs used for text are checked for ≥ 4.5:1 contrast in
// src/design/__tests__/tokens.test.ts. No hex outside this file in v2 code.

export interface Palette {
  /** Page background. */
  paper: string;
  /** Raised surfaces: sheets, fields. */
  surface: string;
  /** Primary text. */
  ink: string;
  /** Secondary text. */
  inkSoft: string;
  /** The understood word, links, the primary action. */
  ochre: string;
  /** Text on an ochre fill. */
  onOchre: string;
  /** Hairlines between rows. */
  hairline: string;
  /** Behind a sheet. */
  scrim: string;
  /** Highlight behind quoted evidence. */
  mark: string;
  /** Removing something. */
  danger: string;
}

export const color: { light: Palette; night: Palette } = {
  light: {
    paper: "#EFEEE9",
    surface: "#F8F7F3",
    ink: "#1F201D",
    inkSoft: "#575A53",
    ochre: "#8A6417",
    onOchre: "#FFFFFF",
    hairline: "#D3D0C7",
    scrim: "rgba(18, 21, 19, 0.32)",
    mark: "#E7DCC0",
    danger: "#8C2F1B",
  },
  night: {
    paper: "#121513",
    surface: "#1A1E1B",
    ink: "#E8E6DF",
    inkSoft: "#A4A79F",
    ochre: "#D4AB5E",
    onOchre: "#121513",
    hairline: "#2C312D",
    scrim: "rgba(0, 0, 0, 0.5)",
    mark: "#3A3324",
    danger: "#E59A80",
  },
};

/** Provisional families (see header). */
export const font = {
  serif: "DMSerifDisplay",
  sans: "DMSans",
  sansMedium: "DMSans-Medium",
  sansSemiBold: "DMSans-SemiBold",
} as const;

export const type = {
  display: { fontFamily: font.serif, fontSize: 30, lineHeight: 36 },
  statement: { fontFamily: font.serif, fontSize: 21, lineHeight: 27 },
  body: { fontFamily: font.sans, fontSize: 16, lineHeight: 22 },
  label: { fontFamily: font.sansMedium, fontSize: 14, lineHeight: 19 },
  small: { fontFamily: font.sans, fontSize: 13, lineHeight: 18 },
} as const;

/** The spacing scale; no other spacing numbers in v2 code. */
export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 20, xxl: 26, x3: 34, x4: 48, x5: 64 } as const;

export const radius = { inline: 16, sheet: 28, photo: 10 } as const;

/** Every control is at least this tall. */
export const TOUCH = 44;

export const motion = { quick: 160, settle: 260 } as const;
