# Kinship

A living garden for the people you love — not another CRM.

Every person in your life is a plant in your garden. Capture memories,
reflect on the moments you share, and watch your relationships grow —
at your own pace, with no streaks, scores, or guilt.

## Stack

- [Expo](https://expo.dev) SDK 54 (React Native, TypeScript, portrait-only)
- Expo Router (file-based navigation)
- NativeWind (Tailwind for RN) + a custom design-token system
- Supabase (auth + Postgres with RLS) — without it, the app runs in demo
  mode with on-device persistence

## Getting started

```bash
npm install
cp .env.example .env   # add your Supabase URL + anon key (optional)
npm start
```

Without Supabase credentials the app runs in demo mode: demo data plus
anything you create, persisted on-device.

With Supabase configured, the server is the only source of truth: screens
show an error or offline state instead of demo data, and failed saves are
reported rather than kept on the device. On-device caches aren't scoped to
an account, so they're wiped whenever the signed-in user changes.

To set up the database, run the SQL files in `supabase/migrations/` in
order against your Supabase project. Account deletion (Settings → Privacy
& Data) calls `delete_account()` from `008_delete_account.sql`; until that
migration is applied, deletion fails with an error instead of claiming
success.

## Documentation

- `PRD.md` — full product requirements (vision, flows, design system)
- `docs/` — design exports and planning artifacts
