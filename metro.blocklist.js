// Files Metro must never bundle into the app. The place data for residence
// readings (Phase 4B, brief §6: GeoNames, CC BY 4.0, about 2 MB) lives with
// the gateway only; app/__tests__/placesNotInApp.test.ts keeps it that way.
module.exports = [/supabase[\\/]functions[\\/]_shared[\\/]semantic[\\/]places[\\/][^\\/]+\.json$/];
