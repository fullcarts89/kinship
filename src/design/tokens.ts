// Kinship 2.0 design tokens: the Quiet Herbarium (Design Direction §H; plan
// §18). The one source for colour, type, space, radius, motion and depth in
// the 2.0 shell (app/v2, src/ui, src/features). No hex, font name or
// off-scale number elsewhere in v2 code. The 1.0 app keeps design/tokens.ts
// until it is deleted (DEL-10).
//
// Values are the approved ones from the Design Direction's token table and
// the canvas's design-system board. Three colours are not in the token table
// but are drawn on the approved boards, and are named here so no screen
// invents its own: `inkBody` (explanations, #3C423D on boards 1 and 2),
// `rule` (the ghost button's outline, #CFCEC5 / night #3A403A) and `onInk`
// (text on an ink button). Contrast for every text pair is checked in
// src/design/__tests__/tokens.test.ts.

export interface Palette {
  /** App background. */
  paper: string;
  /** The one raised surface: sheets, the Tell field, inline question boxes. */
  surface: string;
  /** Text, primary buttons, sprigs. */
  ink: string;
  /** Explanations under a statement (boards 1–2). */
  inkBody: string;
  /** Secondary text, provenance, labels. */
  inkQuiet: string;
  /** Rules between rows. */
  hairline: string;
  /** The ghost button's outline. */
  rule: string;
  /** Marks only: underlines under understood words, provenance dots. Not for text. */
  ochre: string;
  /** Ochre as text: "You said you'd", links. */
  ochreText: string;
  /** Destructive actions. */
  brick: string;
  /** Text on an ink (primary) button. */
  onInk: string;
  /** Behind a sheet. */
  scrim: string;
}

export const color: { light: Palette; night: Palette } = {
  light: {
    paper: "#EFEEE9",
    surface: "#F7F6F2",
    ink: "#1D221E",
    inkBody: "#3C423D",
    inkQuiet: "#5E645D",
    hairline: "#D6D5CD",
    rule: "#CFCEC5",
    ochre: "#A87A22",
    ochreText: "#8A6417",
    brick: "#9A3B2A",
    onInk: "#F7F6F2",
    scrim: "rgba(29, 34, 30, 0.28)",
  },
  // "Night garden": green-black paper, parchment ink, ochre warmed to candlelight.
  night: {
    paper: "#121513",
    surface: "#1A1E1B",
    ink: "#E6E4DC",
    inkBody: "#E6E4DC",
    inkQuiet: "#8E968B",
    hairline: "#2C322D",
    rule: "#3A403A",
    ochre: "#D9B25A",
    ochreText: "#D9B25A",
    brick: "#D98A77",
    onInk: "#121513",
    scrim: "rgba(0, 0, 0, 0.5)",
  },
};

/**
 * Families, as registered in app/_layout.tsx. Newsreader is instanced from
 * the variable font at the optical sizes the type scale uses (the design asks
 * for "optical size on"; React Native can't set the axis at run time):
 * Display at opsz 36 for 34–40 pt, Text at opsz 20 for 19–21 pt, Light for
 * the live transcript, Italic for titles of places and seasons. Files and
 * licence: assets/fonts/newsreader/.
 */
export const font = {
  display: "NewsreaderDisplay",
  serif: "NewsreaderText",
  serifLight: "NewsreaderTextLight",
  serifItalic: "NewsreaderTextItalic",
  sans: "InstrumentSans",
  sansMedium: "InstrumentSans-Medium",
} as const;

/**
 * The type scale (Design Direction §H). Serif speaks about people; sans runs
 * the machine. Sizes scale with Dynamic Type (see `maxScale`).
 */
export const type = {
  /** The one moment on Today. Newsreader 34/38. */
  display: { fontFamily: font.display, fontSize: 34, lineHeight: 38 },
  /** A person's name on their page. Newsreader 40. */
  name: { fontFamily: font.display, fontSize: 40, lineHeight: 44 },
  /** A sheet or page title ("Here's what I'll remember."). Board 1: 30. */
  title: { fontFamily: font.display, fontSize: 30, lineHeight: 35 },
  /** A sheet's heading ("Ask Ben how it went"). Board 2: 24. */
  heading: { fontFamily: font.serif, fontSize: 24, lineHeight: 29 },
  /** Items in briefs and setup. Newsreader 21/28. */
  moment: { fontFamily: font.serif, fontSize: 21, lineHeight: 28 },
  /** Facts on a relationship page, kept items. Newsreader 19/26. */
  line: { fontFamily: font.serif, fontSize: 19, lineHeight: 26 },
  /** Today's greeting. Board 1: Newsreader 18 in ink-quiet. */
  greeting: { fontFamily: font.serif, fontSize: 18, lineHeight: 24 },
  /** The words as they arrive while telling. Board 1: Newsreader 300, 27. */
  transcript: { fontFamily: font.serifLight, fontSize: 27, lineHeight: 37 },
  /** Titles of places and seasons. */
  italic: { fontFamily: font.serifItalic, fontSize: 17, lineHeight: 24 },
  /** Explanations. Instrument Sans 16/24. */
  body: { fontFamily: font.sans, fontSize: 16, lineHeight: 24 },
  /** Field text and placeholders (the Tell field, search). Board 1: 15. */
  field: { fontFamily: font.sans, fontSize: 15, lineHeight: 20 },
  /** Actions. Instrument Sans 500, 15/20. */
  button: { fontFamily: font.sansMedium, fontSize: 15, lineHeight: 20 },
  /** Section labels ("Coming up"): 11, caps, +14%. */
  label: { fontFamily: font.sansMedium, fontSize: 11, lineHeight: 14, letterSpacing: 1.54, textTransform: "uppercase" as const },
  /** Where something came from. Instrument Sans 12/16. */
  provenance: { fontFamily: font.sans, fontSize: 12, lineHeight: 16 },
  /** The two-item bar. Board 1: 13, 500. */
  nav: { fontFamily: font.sansMedium, fontSize: 13, lineHeight: 18 },
} as const;

/**
 * How far each style may grow with Dynamic Type. Statements and body reflow
 * freely up to the accessibility sizes; the display sizes stop where a
 * three-line moment still fits a small phone (plan §18 gate: Display reflows
 * to 3 lines at AX1 with no truncation).
 */
export const maxScale = { display: 1.6, text: 2.2, label: 1.6 } as const;

/** The spacing scale (4-pt base). No other spacing numbers in v2 code. */
export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 20, xxl: 26, x3: 34, x4: 48, x5: 64 } as const;

/** The screen gutter. */
export const GUTTER = space.xxl;

/** Every control is at least this tall. */
export const TOUCH = 44;

/** Heights from the boards: buttons 48, the Tell field 54, search 50, a person row 58, the bar 62. */
export const height = { button: 48, tell: 54, search: 50, mic: 40, small: 44, row: 58, nav: 62 } as const;

/** Small fixed sizes from the boards: the provenance dot, the sheet's grabber, sprigs by place. */
export const size = {
  dot: 5,
  grabber: { width: 36, height: 4 },
  sprig: { row: 26, moment: 46, page: 70 },
  icon: 16,
  /** Header controls (back, add). */
  iconLarge: 22,
} as const;

/**
 * Radius by role, never decoration: pressable things are pills (height / 2);
 * inline surfaces 14–18; sheets 28 at the top; photos 10.
 */
export const radius = {
  pill: (h: number) => h / 2,
  inline: 16,
  sheet: 28,
  photo: 10,
  /** The sheet's grabber. */
  grabber: 2,
} as const;

/** One hairline weight; the understood-word underline. */
export const stroke = { hairline: 1, underline: 1.5 } as const;

/**
 * Motion (Design Direction §H). Reduce Motion replaces all of it with a
 * 150 ms fade.
 */
export const motion = {
  /** Today's one moment arrives: 320 ms, 8 pt rise. */
  arrive: { duration: 320, rise: 8, easing: [0.2, 0.8, 0.2, 1] as const },
  /** Words understood: 600 ms underline draw. */
  understand: { duration: 600 },
  /** Sheets: 360 ms spring, no overshoot. */
  sheet: { duration: 360, damping: 30 },
  /** Small state changes (a line appearing, a pressed state). */
  quick: 160,
  /** What everything becomes with Reduce Motion on. */
  reduced: { duration: 150 },
} as const;

/**
 * Sign in with Apple's button: Apple's guidelines allow only black (on a
 * light page) or white (on a dark one), with the white mark or the black.
 */
export const appleButton = {
  light: { background: "#000000", foreground: "#FFFFFF" },
  night: { background: "#FFFFFF", foreground: "#000000" },
} as const;

/** The only shadow: one soft lift for sheets. */
export const shadow = {
  sheet: {
    shadowColor: "#1D221E",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 12,
  },
} as const;

/** Sprig rendering (plan §19): one ink, a hairline stroke, a 7% wash. */
export const sprigStyle = { stroke: 1.2, wash: 0.07 } as const;
