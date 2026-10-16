# Third-party notices

Data and works whose licences ask Kinship to credit them.

## GeoNames

**Place data from GeoNames (geonames.org), CC BY 4.0**

- **Licence:** Creative Commons Attribution 4.0 International, <https://creativecommons.org/licenses/by/4.0/>. Attribution is required; commercial use is allowed.
- **Source:** the GeoNames export dumps at <https://download.geonames.org/export/dump/>: `countryInfo.txt`, `admin1CodesASCII.txt` and `cities15000.zip`.
- **What Kinship keeps:** for each country, first-level region and city of about 15,000 people or more, its name, ASCII name, region, country and population. Nothing else: no alternate names, coordinates, geometry, counties, neighbourhoods or postal codes.
- **Changes made:** rows are filtered (sections of cities and historical places are left out), reduced to those fields, given Kinship references (`country:US`, `region:US.CA`, `city:<GeoNames id>`), sorted, and joined with a curated alias list (`scripts/semantic/places/aliases.json`). Built by `scripts/semantic/build-places.ts`; each dump's URL, download day and SHA-256 are pinned in `scripts/semantic/places/sources.json` and in the built file.
- **Current version:** `places-2026.10`, from the dumps of 16 October 2026.
- **Where it is used:** the server only (`supabase/functions/_shared/semantic/places/`), to read where someone lives from the user's own words. It is never shipped in the app, and the text a user sees is always their own words, never GeoNames names.
- **In the app:** the same attribution goes in Settings › About (brief §6, CC-20 decision 1). Not built yet: it ships with the first build that uses the place data (Phase 4B, B3 onward).
