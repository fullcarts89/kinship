// Kinship 2.0 design tokens: Electric Garden (FD-30b, founder directive 30 Oct
// 2026; Direction A of the creative reset, PR #57 Stage 1). The one source for
// colour, type, space, radius, motion and depth in the 2.0 shell (app/v2,
// src/ui, src/features). No hex, font name or off-scale number elsewhere in
// v2 code. The 1.0 app keeps design/tokens.ts until it is deleted (DEL-10).
//
// What changed from the Quiet Herbarium (contract §4, superseded as the look
// by FD-30b): the paper is warmer, the ink is a near-black leaf green, a lime
// mark replaces ochre for everything Kinship understood, and five accent
// colours live in the art and the section dots; Archivo Black carries names
// and the Today statement at poster scale over Newsreader for the user's own
// words and Instrument Sans for the machine. Every experience rule stands: a
// source on every statement, one primary action, hairline rows, nothing that
// counts or scores. Contrast for every text pair is checked in
// src/design/__tests__/tokens.test.ts.

export interface Palette {
  /** App background: warm off-white paper. */
  paper: string;
  /** The one raised surface: sheets, the Tell field, search. */
  surface: string;
  /** Text, primary buttons, the poster name: the leaf green that anchors the palette. */
  ink: string;
  /** Explanations under a statement. */
  inkBody: string;
  /** Secondary text, labels, the week. */
  inkQuiet: string;
  /** Rules between rows. */
  hairline: string;
  /** The ghost button's outline. */
  rule: string;
  /**
   * The mark of something understood: the provenance dot, the underline under an
   * understood word. A lime that still reads at 3:1 on paper. Not for text.
   */
  mark: string;
  /** The mark as text: "You said you'd", a link to the source. */
  markText: string;
  /** Destructive actions. */
  brick: string;
  /** Text on an ink (primary) button. */
  onInk: string;
  /** Behind a sheet. */
  scrim: string;
  /** The art's colours, also the section dots. Never text. */
  lime: string;
  bloom: string;
  sunset: string;
  lavender: string;
  butter: string;
}

export const color: { light: Palette; night: Palette } = {
  light: {
    paper: "#F6F3EC",
    surface: "#FDFCF9",
    ink: "#0B2A1D",
    inkBody: "#2F4238",
    inkQuiet: "#5B6A61",
    hairline: "#D5D7CF",
    rule: "#B4BBB2",
    mark: "#4C9418",
    markText: "#256E3B",
    brick: "#A6301D",
    onInk: "#F6F3EC",
    scrim: "rgba(11, 42, 29, 0.32)",
    lime: "#BDF24E",
    bloom: "#FF4FA3",
    sunset: "#FF6A2B",
    lavender: "#CDBBFF",
    butter: "#FFE86A",
  },
  // Night: deep green-black paper; the art keeps its colour, the wash is quieter.
  night: {
    paper: "#0A1A12",
    surface: "#122419",
    ink: "#EEF3EA",
    inkBody: "#D2DCD3",
    inkQuiet: "#9FB0A4",
    hairline: "#1F3327",
    rule: "#2E4537",
    mark: "#BDF24E",
    markText: "#A9E63C",
    brick: "#F4A693",
    onInk: "#0A1A12",
    scrim: "rgba(0, 0, 0, 0.55)",
    lime: "#BDF24E",
    bloom: "#FF4FA3",
    sunset: "#FF6A2B",
    lavender: "#CDBBFF",
    butter: "#FFE86A",
  },
};

/** The accent a section dot takes. Fixed by section, never by history. */
export const sectionAccent = {
  comingUp: "mark",
  lately: "bloom",
  youSaid: "sunset",
  between: "lavender",
  /** A question or something waiting on the user. */
  waiting: "butter",
} as const satisfies Record<string, keyof Palette>;

/**
 * Families, as registered in app/_layout.tsx. Archivo Black (OFL, via
 * @expo-google-fonts/archivo-black) is the poster voice: names and the Today
 * statement. Newsreader is instanced from the variable font at the optical
 * sizes the scale uses (assets/fonts/newsreader/); its italic is the user's
 * own words. Instrument Sans runs the machine.
 */
export const font = {
  poster: "ArchivoBlack",
  display: "NewsreaderDisplay",
  serif: "NewsreaderText",
  serifLight: "NewsreaderTextLight",
  serifItalic: "NewsreaderTextItalic",
  sans: "InstrumentSans",
  sansMedium: "InstrumentSans-Medium",
  sansSemi: "InstrumentSans-SemiBold",
  sansBold: "InstrumentSans-Bold",
} as const;

/** Archivo Black is set tight: tracking and leading as a share of the size. */
export const posterMetrics = { tracking: -0.045, leading: 0.88, statementTracking: -0.03 } as const;

/**
 * The type scale. Poster for names and the statement (a 12:1 ratio to the
 * 11 pt labels, as on the board); serif for what the user said; sans for the
 * machine. Sizes scale with Dynamic Type (see `maxScale`).
 */
export const type = {
  /** A person's name at poster scale (PosterName fits it to the page). Archivo Black 120. */
  poster: { fontFamily: font.poster, fontSize: 120, lineHeight: 106, letterSpacing: -5.4 },
  /** The person's name on their page. Archivo Black 104. */
  name: { fontFamily: font.poster, fontSize: 104, lineHeight: 92, letterSpacing: -4.7 },
  /** The one statement on Today. Archivo Black 40. */
  statement: { fontFamily: font.poster, fontSize: 40, lineHeight: 42, letterSpacing: -1.2 },
  /** A headline that isn't the moment: the welcome promise, first use, a quiet day. Archivo Black 34. */
  display: { fontFamily: font.poster, fontSize: 34, lineHeight: 36, letterSpacing: -1 },
  /** A sheet or page title ("Here's what I'll remember."). Archivo Black 26. */
  title: { fontFamily: font.poster, fontSize: 26, lineHeight: 29, letterSpacing: -0.6 },
  /** A sheet's heading ("Ask Ben how it went"). Archivo Black 21. */
  heading: { fontFamily: font.poster, fontSize: 21, lineHeight: 25, letterSpacing: -0.4 },
  /** Items in briefs and setup; kept items. Newsreader 21/28. */
  moment: { fontFamily: font.serif, fontSize: 21, lineHeight: 28 },
  /** A remembered line on a page. Newsreader 20/26. */
  line: { fontFamily: font.serif, fontSize: 20, lineHeight: 26 },
  /** The user's own words, and what Kinship says they said. Newsreader italic 21/27. */
  quote: { fontFamily: font.serifItalic, fontSize: 21, lineHeight: 27 },
  /** Today's greeting. Newsreader 18 in ink-quiet. */
  greeting: { fontFamily: font.serif, fontSize: 18, lineHeight: 24 },
  /** The words as they arrive while telling. Newsreader 300, 27. */
  transcript: { fontFamily: font.serifLight, fontSize: 27, lineHeight: 37 },
  /** Titles of places and seasons. */
  italic: { fontFamily: font.serifItalic, fontSize: 17, lineHeight: 24 },
  /** Explanations. Instrument Sans 16/24. */
  body: { fontFamily: font.sans, fontSize: 16, lineHeight: 24 },
  /** The event under the statement ("Chicago Marathon · Sun, Oct 11"). Instrument Sans 600, 15/20. */
  context: { fontFamily: font.sansSemi, fontSize: 15, lineHeight: 20 },
  /** Field text and placeholders (the Tell field, search). 16. */
  field: { fontFamily: font.sans, fontSize: 16, lineHeight: 21 },
  /** Actions. Instrument Sans 600, 16/20. */
  button: { fontFamily: font.sansSemi, fontSize: 16, lineHeight: 20 },
  /** Section labels ("Coming up"): 11, caps, +16%. */
  label: { fontFamily: font.sansSemi, fontSize: 11, lineHeight: 14, letterSpacing: 1.76, textTransform: "uppercase" as const },
  /** Where something came from, beside the lime dot ("From your note · Oct 8"): 11 caps, +14%. */
  source: { fontFamily: font.sansSemi, fontSize: 11, lineHeight: 15, letterSpacing: 1.54, textTransform: "uppercase" as const },
  /** Small quiet text (12/16). */
  provenance: { fontFamily: font.sans, fontSize: 12, lineHeight: 16 },
  /** A day in the week row ("WED 14"): 11 bold caps. */
  week: { fontFamily: font.sansBold, fontSize: 11, lineHeight: 16, letterSpacing: 1.54, textTransform: "uppercase" as const },
  /** The two-item bar. Instrument Sans 600, 15. */
  nav: { fontFamily: font.sansSemi, fontSize: 15, lineHeight: 18 },
} as const;

/**
 * How far each style may grow with Dynamic Type. The poster name is already
 * fitted to the page and does not grow; the statement and display reflow
 * freely to three or four lines (never truncated); body text grows to the
 * accessibility sizes.
 */
export const maxScale = { poster: 1, display: 1.5, text: 2.2, label: 1.6 } as const;

/** The spacing scale (4-pt base). No other spacing numbers in v2 code. */
export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 20, xxl: 26, x3: 34, x4: 48, x5: 64 } as const;

/** The screen gutter. */
export const GUTTER = space.xxl;

/** Every control is at least this tall. */
export const TOUCH = 44;

/** Heights: buttons 50, the Tell field 52, search 50, a person row 58, the bar 62. */
export const height = { button: 50, tell: 52, search: 50, mic: 40, small: 44, row: 58, nav: 62 } as const;

/** Small fixed sizes: the provenance dot, the section dot, the grabber, sprigs by place. */
export const size = {
  dot: 7,
  sectionDot: 8,
  grabber: { width: 36, height: 4 },
  sprig: { row: 26, moment: 46, page: 70 },
  icon: 16,
  /** Header controls (back, add). */
  iconLarge: 22,
} as const;

/**
 * Radius by role, never decoration: pressable things are pills (height / 2);
 * inline surfaces 16; sheets 28 at the top. Photos have no radius: they sit
 * in the fluid mask (src/ui/garden/FluidPhoto).
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
 * Motion. Reduce Motion replaces all of it with a 150 ms fade.
 */
export const motion = {
  /** Something arrives: 320 ms, 8 pt rise. */
  arrive: { duration: 320, rise: 8, easing: [0.2, 0.8, 0.2, 1] as const },
  /** The hero (art, photo, name) arrives a little slower and from a little further. */
  hero: { duration: 520, rise: 14, scale: 0.985 },
  /** Words understood: 600 ms underline draw. */
  understand: { duration: 600 },
  /** Sheets: 360 ms spring, no overshoot. */
  sheet: { duration: 360, damping: 30 },
  /** Small state changes (a line appearing, a pressed state). */
  quick: 160,
  /** What everything becomes with Reduce Motion on. */
  reduced: { duration: 150 },
  /** A sheet leaving: quicker than arriving, easing in. */
  sheetOut: { duration: 240 },
  /** The scrim behind a sheet fades; it never slides with the sheet. */
  scrim: { duration: 240 },
} as const;

/**
 * Pressed feedback: an immediate dim, never a scale or a bounce.
 */
export const press = { surface: 0.72, link: 0.6, disabled: 0.4 } as const;

/**
 * Sign in with Apple's button: Apple's guidelines allow only black (on a
 * light page) or white (on a dark one), with the white mark or the black.
 */
export const appleButton = {
  light: { background: "#000000", foreground: "#FFFFFF" },
  night: { background: "#FFFFFF", foreground: "#000000" },
} as const;

/** Depth: one soft lift for sheets, a softer one for the Tell field (the one raised surface on a page). */
export const shadow = {
  sheet: {
    shadowColor: "#0B2A1D",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 12,
  },
  field: {
    shadowColor: "#0B2A1D",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },
} as const;

/**
 * The art (src/ui/garden). The grain is one fine noise tile over the whole
 * page so paper, art and photo share a surface; off under Reduce Transparency.
 * The wash is the kind of day, as a soft radial light fading into the paper.
 */
export const art = {
  grain: { opacity: 0.2, night: 0.1, tile: 128 },
  wash: { height: 560, opacity: 0.9, night: 0.5 },
  /** The photo's fluid mask, as a share of the page width, and its height to width. */
  photo: { width: 0.64, aspect: 1.07, small: 92 },
} as const;

/** Sprig rendering: one ink line, a wash in the person's accent. Identity-only; never varies with history. */
export const sprigStyle = { stroke: 1.2, wash: 0.35 } as const;

/**
 * The Moment Deck × Notebook experience (founder directive 2 Nov 2026, approving PR #77's
 * prototype; behind the `notebook_deck` flag). Colours the prototype adds to Electric Garden:
 * a second paper for wells and the end card, raised white cards, notebook paper with a blue
 * rule and a pink margin, and the meaning colours that always come with a word ("You said
 * you'd" sunset, "Needs your yes" magenta, "From Contacts" sky, understood green). Text pairs
 * are checked in src/design/__tests__/tokens.test.ts.
 */
export interface NotebookPalette {
  /** Wells: the lens control, the deck's end card, a tag. */
  paper2: string;
  /** Raised cards (ideas, questions, review lines, the Tell field). */
  card: string;
  /** The current lens raised in its well: card by day; a step lighter at night, where card and well meet. */
  raisedInWell: string;
  /** Notebook paper (Tell, Pages, Source, Your words) and its rule and margin. */
  sheet: string;
  sheetRule: string;
  sheetMargin: string;
  /** Text one step under ink, on paper and cards. */
  ink2: string;
  /** Quiet text on paper and cards. */
  quiet: string;
  /** The lime of a primary action on a poster (ink text on it). */
  lime: string;
  /** Understood: provenance dots and icons only, never text. */
  green: string;
  /** "You said you'd": the dot and edge, and its text. */
  yours: string;
  yoursText: string;
  yoursTint: string;
  /** "Needs your yes": a question waiting on the user. */
  held: string;
  /** "From Contacts". */
  contacts: string;
  /** "Replaces" / told-again, as text on its tint. */
  replaceText: string;
  replaceTint: string;
  /** "Already known" / understood, as text on its tint. */
  knownText: string;
  greenTint: string;
  /** The found word in search and Pages. */
  find: string;
  /** Kept spans in Pages and Source: understood, and private. */
  keptSpan: string;
  privateSpan: string;
  /** The tender poster's paper. */
  tender: string;
  /** Under a photo's words. */
  photoScrim: string;
  /** Text and outlines on a photo. */
  onPhoto: string;
  onPhotoQuiet: string;
  onPhotoRule: string;
}

export const notebookColor: { light: NotebookPalette; night: NotebookPalette } = {
  light: {
    paper2: "#EAE3D6",
    card: "#FFFFFF",
    raisedInWell: "#FFFFFF",
    sheet: "#FFFDF8",
    sheetRule: "rgba(56, 120, 200, 0.13)",
    sheetMargin: "rgba(255, 61, 154, 0.32)",
    ink2: "#3C5246",
    quiet: "#57645C",
    lime: "#A6E22E",
    green: "#3B8A1C",
    yours: "#FF6B1A",
    yoursText: "#A9430A",
    yoursTint: "#FFF1E6",
    held: "#C8146B",
    contacts: "#8CC8FF",
    replaceText: "#1D4E89",
    replaceTint: "#EAF2FF",
    knownText: "#2B6A12",
    greenTint: "#E9F7CF",
    find: "#FFE05A",
    keptSpan: "rgba(166, 226, 46, 0.34)",
    privateSpan: "rgba(183, 164, 255, 0.34)",
    tender: "#EFE8F6",
    photoScrim: "rgba(8, 22, 15, 0.94)",
    onPhoto: "#FFFFFF",
    onPhotoQuiet: "rgba(255, 255, 255, 0.86)",
    onPhotoRule: "rgba(255, 255, 255, 0.55)",
  },
  // Night: the papers go to the night garden; meaning colours lighten to keep their contrast.
  night: {
    paper2: "#15291D",
    card: "#16291E",
    raisedInWell: "#2A4433",
    sheet: "#112218",
    sheetRule: "rgba(140, 200, 255, 0.10)",
    sheetMargin: "rgba(255, 61, 154, 0.40)",
    ink2: "#C9D6CC",
    quiet: "#A3B4A8",
    lime: "#A6E22E",
    green: "#8FD45A",
    yours: "#FF8A4A",
    yoursText: "#FFB27F",
    yoursTint: "#2E1D12",
    held: "#FF7DBE",
    contacts: "#8CC8FF",
    replaceText: "#A9CBFF",
    replaceTint: "#15243A",
    knownText: "#B6EC86",
    greenTint: "#1C3317",
    find: "#7A6400",
    keptSpan: "rgba(166, 226, 46, 0.26)",
    privateSpan: "rgba(183, 164, 255, 0.26)",
    tender: "#231C30",
    photoScrim: "rgba(4, 12, 8, 0.94)",
    onPhoto: "#FFFFFF",
    onPhotoQuiet: "rgba(255, 255, 255, 0.86)",
    onPhotoRule: "rgba(255, 255, 255, 0.55)",
  },
};

/**
 * A person's identity colour and the ink that reads on it (PR #77's people palette). Chosen
 * from the id alone, never from history (D8); an art colour, the same at night.
 */
export const personColors: readonly { color: string; on: string; lime?: true }[] = [
  { color: "#FF6B1A", on: "#1B0A00" },
  { color: "#FF3D9A", on: "#2A0016" },
  { color: "#8CC8FF", on: "#0A1F33" },
  { color: "#16264A", on: "#FFFFFF" },
  { color: "#FF8A5C", on: "#2A0D00" },
  { color: "#B7A4FF", on: "#160A3A" },
  { color: "#FFE05A", on: "#2A2000" },
  // Lime itself: a lime button or chip on it would disappear (native pass, 3 Nov 2026).
  { color: "#A6E22E", on: "#0F2A1D", lime: true },
  { color: "#CDBDF2", on: "#1E1238" },
];

/** An idea's category tint (the words always say the category). */
export const ideaTint = {
  gesture: "#FFD6EA",
  celebrate: "#FFD6EA",
  together: "#DCEBFF",
  help: "#FFE9DA",
  followThrough: "#FFF2B8",
  message: "#E9F7CF",
  checkIn: "#E9F7CF",
} as const;

/** The notebook's sizes (PR #77 proto.css), on the 4-pt grid where it allows. */
export const notebook = {
  /** Today's poster. */
  /** `screen`: the most of the screen's height the poster's floor may take, so its buttons clear the Tell bar on a 667 pt phone. */
  poster: { height: 470, screen: 0.62, radius: 30, gutter: 14, initial: 230 },
  /** A deck card. */
  card: { width: 214, minHeight: 232, radius: 26, face: 64, flower: 104 },
  /** The expanded moment's media, and the sheet that rises over it. */
  momentMedia: { photo: 340, tender: 250, overlap: 30 },
  /** The person page's media. */
  personMedia: 360,
  /** People tiles: three columns, 4:5. */
  tile: { columns: 3, aspect: 5 / 4, radius: 20, gap: 10, rowGap: 16 },
  /** The date band's portraits. */
  band: 84,
  /** Raised cards and their soft lift. */
  raised: { radius: 20, large: 24 },
  /** The notebook paper's line height. */
  ruled: { tell: 34, pages: 30, words: 28 },
  /** Above this many people, letter breaks and the A–Z rail. */
  railAbove: 25,
  /** Small buttons in the notebook are 40 tall (44 with their touch slop). */
  smallButton: 40,
} as const;

export const notebookShadow = {
  card: {
    shadowColor: "#0B2A1D",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 3,
  },
  poster: {
    shadowColor: "#0B2A1D",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 40,
    elevation: 10,
  },
} as const;
