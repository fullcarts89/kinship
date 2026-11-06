// The Electric Garden's art (FD-30b): original grainy botanicals generated for
// Kinship in the creative reset (Stage 1, 19–20 Oct 2026) and logged with their
// provenance in assets/images/garden/PROVENANCE.md. Raster, transparent, drawn
// bigger than the page and cut by its edges. Nothing here is traced from the
// mood boards or from any third party.
export const gardenArt = {
  /** The hero bloom: a corner piece, pink → orange → leaf green, for Today's top right. */
  bloom: require("../../../assets/images/garden/a-bloom-corner.png"),
  /** Lavender and butter corner piece, for a person's page. */
  lavender: require("../../../assets/images/garden/a-bloom-lavender.png"),
  /** A leaf spray with berries, crossing in front of the photo. */
  leaves: require("../../../assets/images/garden/a-leaves.png"),
  /** One leaf. */
  leaf: require("../../../assets/images/garden/a-leaf.png"),
  /** A bud and two leaves from the page's bottom edge: the quiet day. */
  bud: require("../../../assets/images/garden/a-bud.png"),
  /** The fine noise tile under Grain. */
  grain: require("../../../assets/images/garden/grain.png"),
} as const;

/** Each piece's own width to height, so a width places it exactly. */
export const artAspect = { bloom: 1339 / 1000, lavender: 1339 / 1000, leaves: 1, leaf: 1, bud: 746 / 1000 } as const;

export type GardenArt = keyof typeof artAspect;
