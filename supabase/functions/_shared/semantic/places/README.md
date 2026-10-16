# Place data (Phase 4B, brief §6)

**Place data from GeoNames (geonames.org), CC BY 4.0.** See `THIRD_PARTY_NOTICES.md`.

- `places-2026.10.json`: the dataset residence readings use (B3 onward). Countries, first-level regions and cities of about 15,000 people or more: name, ASCII name, region, country and population only, plus the curated aliases. Generated; never edit it by hand.
- `format.ts`: its format, the attribution and `checkPlaces`, shared by the build and the gateway.
- `places.test.ts`: the committed dataset is sound, attributed, pinned, and reads the brief's places as expected.

**Server only.** Nothing in the app imports it, and Metro refuses to bundle it (`metro.blocklist.js`, `app/__tests__/placesNotInApp.test.ts`). The phone knows places only through its facets' own readings, and shows only the user's own words.

## Rebuilding

The dumps' URLs, download day (UTC), sizes and SHA-256 are pinned in `scripts/semantic/places/sources.json` and repeated in the dataset. The same dumps always build the same bytes:

```sh
# A rebuild or a check needs the pinned dumps themselves (GeoNames updates them daily).
deno run --allow-read --config scripts/deno.json scripts/semantic/build-places.ts --dumps <folder> --check
```

A new version: download `countryInfo.txt`, `admin1CodesASCII.txt` and `cities15000.zip` from <https://download.geonames.org/export/dump/> into an empty folder, unzip `cities15000.zip` there, set `"version"` in `sources.json` to `places-YYYY.MM`, then:

```sh
deno run --allow-read --allow-write --config scripts/deno.json scripts/semantic/build-places.ts --dumps <folder> --pin <YYYY-MM-DD>
```

Rows are sorted and written one per line, so the new file's diff reads place by place. A new version changes `dataset_version` on the facets derived from it.

## places-2026.10

Downloaded 16 Oct 2026 (UTC). 252 countries, 3,865 regions, 31,764 cities (2,401 sections of cities and historical places left out), 56 aliases; about 2.8 MB.
