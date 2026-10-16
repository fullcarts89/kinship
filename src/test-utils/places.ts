// A small place dataset for the app's tests (Phase 4B B3): the real data's
// rows for the places the tests name, in its format, so the gateway's own
// residence reading runs in Jest. The real data never reaches the app
// (app/__tests__/placesNotInApp.test.ts); this is not it.
import { buildPlaceIndex, type PlaceIndex } from "../../supabase/functions/_shared/semantic/placeIndex";

// Only what the index reads (no sources, attribution or licence: this is not a dataset to ship).
const PLACES = {
  version: "places-2026.10",
  countries: { columns: ["ref", "name", "population"], rows: [["country:US", "United States", 327167434], ["country:CZ", "Czechia", 10625695]] },
  regions: {
    columns: ["ref", "name", "ascii", "country"],
    rows: [
      ["region:CZ.87", "Plzeň Region", "Plzen Region", "country:CZ"], ["region:US.CA", "California", "California", "country:US"],
      ["region:US.CO", "Colorado", "Colorado", "country:US"], ["region:US.IL", "Illinois", "Illinois", "country:US"],
      ["region:US.FL", "Florida", "Florida", "country:US"], ["region:US.OR", "Oregon", "Oregon", "country:US"],
    ],
  },
  cities: {
    columns: ["ref", "name", "ascii", "region", "country", "population"],
    rows: [
      ["city:3068160", "Pilsen", "Pilsen", "region:CZ.87", "country:CZ", 187863],
      ["city:4887398", "Chicago", "Chicago", "region:US.IL", "country:US", 2664452],
      ["city:5322737", "Alameda", "Alameda", "region:US.CA", "country:US", 78630],
      ["city:5378538", "Oakland", "Oakland", "region:US.CA", "country:US", 419267],
      ["city:5419384", "Denver", "Denver", "region:US.CO", "country:US", 729019],
      ["city:4158928", "Hollywood", "Hollywood", "region:US.FL", "country:US", 149728],
      ["city:5368361", "Los Angeles", "Los Angeles", "region:US.CA", "country:US", 3820914],
      ["city:5746545", "Portland", "Portland", "region:US.OR", "country:US", 652503],
    ],
  },
  aliases: { columns: ["alias", "ref"], rows: [["CA", "region:US.CA"], ["OR", "region:US.OR"]] },
} as unknown as Parameters<typeof buildPlaceIndex>[0];

export function testPlaces(): PlaceIndex {
  return buildPlaceIndex(PLACES);
}
