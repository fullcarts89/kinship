# Kinship

A living garden for the people you love — not another CRM.

Every person in your life is a plant in your garden. Capture memories,
reflect on the moments you share, and watch your relationships grow —
at your own pace, with no streaks, scores, or guilt.

## Stack

- [Expo](https://expo.dev) SDK 54 (React Native, TypeScript, portrait-only)
- Expo Router (file-based navigation)
- NativeWind (Tailwind for RN) + a custom design-token system
- Supabase (auth + Postgres with RLS) — falls back to local mock mode
  with on-device persistence when not configured

## Getting started

```bash
npm install
cp .env.example .env   # add your Supabase URL + anon key (optional)
npm start
```

Without Supabase credentials the app runs in mock mode: demo data plus
anything you create, persisted on-device.

To set up the database, run the SQL files in `supabase/migrations/` in
order against your Supabase project.

## Documentation

- `PRD.md` — full product requirements (vision, flows, design system)
- `docs/` — design exports and planning artifacts
