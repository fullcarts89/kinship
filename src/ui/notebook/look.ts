// A person's look in the notebook (PR #77): one identity colour, the ink that reads on it, and one
// flower, chosen from the person's id alone. Identity only (D8, contract §6): nothing about the
// relationship, its history or its activity ever changes it, and it carries no meaning.
import { personColors } from "@/design/tokens";

export const flowers = {
  poppy: require("../../../assets/images/notebook/poppy.png"),
  peony: require("../../../assets/images/notebook/peony.png"),
  anemone: require("../../../assets/images/notebook/anemone.png"),
  fern: require("../../../assets/images/notebook/fern.png"),
  tulip: require("../../../assets/images/notebook/tulip.png"),
  iris: require("../../../assets/images/notebook/iris.png"),
  ranunculus: require("../../../assets/images/notebook/ranunculus.png"),
} as const;

export type FlowerKey = keyof typeof flowers;
const FLOWER_KEYS = Object.keys(flowers) as FlowerKey[];

export interface PersonLook {
  color: string;
  /** Text and marks drawn on the colour. */
  on: string;
  flower: FlowerKey;
  /** The colour is lime: what is lime elsewhere (the poster's chip and action) is drawn otherwise on it. */
  lime: boolean;
}

function hash(id: string, seed: number): number {
  let h = seed >>> 0;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619) >>> 0;
  return h;
}

/** Deterministic from the id: the same person always looks the same, on every screen. */
export function personLook(personId: string): PersonLook {
  const c = personColors[hash(personId, 2166136261) % personColors.length];
  const flower = FLOWER_KEYS[hash(personId, 374761393) % FLOWER_KEYS.length];
  return { color: c.color, on: c.on, flower, lime: !!c.lime };
}

/** The first letter a type poster or tile is set in. */
export function initialOf(name: string): string {
  const t = name.trim();
  return t ? Array.from(t)[0].toLocaleUpperCase() : "·";
}
