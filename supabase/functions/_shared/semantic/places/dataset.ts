// The place data the gateway reads residence with (Phase 4B B3; brief §6).
// Server only: nothing in the app imports this file or the JSON beside it
// (metro.blocklist.js; app/__tests__/placesNotInApp.test.ts).

import places from "./places-2026.10.json" with { type: "json" };
import { buildPlaceIndex, type PlaceIndex } from "../placeIndex.ts";
import type { Places } from "./format.ts";

let index: PlaceIndex | null = null;

/** places-2026.10, indexed once per process. */
export function placeIndex(): PlaceIndex {
  index ??= buildPlaceIndex(places as unknown as Places);
  return index;
}
