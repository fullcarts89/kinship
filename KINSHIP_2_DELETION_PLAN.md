# Kinship 2.0 — Deletion Plan

As of 30 September 2026 · Repository at `5687ed7` · Companion to `KINSHIP_2_OPERATIONALIZATION.md` §20

Kinship 2.0 should ship with fewer files, concepts and dependencies than 1.0. Each item below falls into one of three classes:

- **Delete now (Phase 0):** dead code, fake flows and trust hazards. Nothing in 2.0 needs them.
- **Delete after replacement:** removed in the same release as its 2.0 replacement. The 1.0 shell is frozen and deleted as one unit (ticket DEL-10) when `shell_v2` reaches 100%.
- **Keep temporarily as fallback:** logic worth porting, or needed until a replacement is proven.

Import counts come from `grep` over `app/` and `src/` on 30 September.

---

## 1. Delete now (Phase 0)

| Path | What it is | Why delete | Dependencies to cut first | Ticket |
|---|---|---|---|---|
| `src/lib/contextExtractor.ts` (424 lines) | Keyword life-event detection | Never called | None (0 importers) | DEL-01 |
| `src/lib/memorySelection.ts` | Memory picker | Never called | None | DEL-01 |
| `src/lib/growthStage.ts` | Stage adapter | 0 importers | None | DEL-01 |
| `src/components/MemoryCelebration.tsx` | Celebration UI | 0 importers | None | DEL-01 |
| `src/components/TendGardenSheet.tsx` | Old tend sheet | 0 importers | None | DEL-01 |
| `src/hooks/useVitality.ts` | Vitality hook | Exported by `src/hooks/index.ts` only | Remove the export line | DEL-01 |
| `src/stores/index.ts` | Empty placeholder | No content | None | DEL-01 |
| `app/notifications.tsx` (1,941 lines) | Notification archive plus 9-screen design demo | Always empty in production; a demo shipped in dev builds | Remove `Stack.Screen name="notifications"` in `app/_layout.tsx:144` and the link in `app/(tabs)/index.tsx:1038` | DEL-02 |
| `src/lib/seasonCalendar.ts`, the calendar-echo option in `app/season/new.tsx` | Writes "reach out to Priya" into the default calendar | Leaks into shared calendars (audit #8) | Remove the option UI and import in `season/new.tsx` | P0-08 |
| `buildInviteMessage` in `src/lib/appLinks.ts` and the Invite quick action in `app/person/[id].tsx` | "I added you to my Kinship garden" | Tells friends they're tracked (audit #9) | Remove the action button | P0-12 |
| Mock fallback branches in `src/hooks/usePersons.ts`, `useMemories.ts`, `useInteractions.ts` (plus the tombstone-for-mock code), then `src/data/mock.ts` | Demo people and `u1` saves | Strangers in a real garden; silent data loss (audit #1) | Hooks fixed first (P0-02) | P0-02 |
| `app/settings/account.tsx` prototype (2,420 lines) | Fake sign-in, password, "take a break", delete | Fake deletion (audit #3) | Replace with a minimal real account screen (sign-out, real delete, email) | P0-04 |
| `android.permission.WRITE_CONTACTS` in `app.json` | Unused permission | Over-permissioning (audit #12) | — | P0-10 |
| `react-native-worklets-core` (package.json) | Unused dependency | 0 imports; `react-native-worklets` is the Reanimated 4 dependency and stays | Rebuild the dev client | DEL-03 |
| `expo-media-library` (package.json) | Unused dependency | 0 imports in `app/` or `src/`; not in plugins | Verify share-card save doesn't depend on it (it uses `expo-sharing`), then rebuild | DEL-03 |
| Branch `claude/fervent-lovelace-szugz6` | Gift logging, "Remember a detail" | Superseded by Tell | Close without merging | DEL-04 |
| Branches `claude/hormozi-value-research-s592G`, `claude/review-kinship-history-P53d6`, `claude/brave-cori-514h7d` | Stale (53–54 commits behind, or 0 ahead) | Noise for agents | Close | DEL-04 |
| `.planning/` (PROJECT, REQUIREMENTS, ROADMAP, STATE, phases, codebase) | February-state plans | Agents plan against stale facts | Move to `docs/archive/planning-2026-02/` with a README line "historical, not current" | DEL-05 |
| `docs/KINSHIP_COMPLETE_CODE_EXPORT.md`, `docs/KINSHIP_PROJECT_EXPORT_LATEST.md`, `docs/KINSHIP_IMPLEMENTATION_SPEC.md`, `docs/KinshipGarden_PRD_v3_BuildReady.docx` | Old exports and specs | Superseded by the 2.0 documents | Move to `docs/archive/` | DEL-05 |
| `PRD.md` (root) | 1.0 PRD | Superseded | Move to `docs/archive/`; the root README links to the 2.0 docs | DEL-05 |

## 2. Delete after replacement

### Routes (see Operationalization §20 for the replacements)

| Path | Replaced by | Deleted in |
|---|---|---|
| `app/loading.tsx` | Native splash | DEL-10 (no dependents; could go in Phase 0 if the 1.0 shell's redirect is updated) |
| `app/(tabs)/_layout.tsx`, `index.tsx`, `people.tsx`, `add.tsx`, `profile.tsx` | `app/(v2)/(main)/…` | DEL-10 |
| `app/(auth)/onboarding.tsx` | `app/(v2)/onboarding/*` | DEL-10 |
| `app/person/[id].tsx`, `person/edit/[id].tsx`, `person/_layout.tsx` | `app/(v2)/person/*` | DEL-10 |
| `app/memory/add.tsx`, `[id].tsx`, `edit/[id].tsx`, `_layout.tsx` | `app/(v2)/tell.tsx`, `app/(v2)/source/[captureId].tsx` | DEL-10 |
| `app/quick-note/[id].tsx` | Tell from a person's page | DEL-10 |
| `app/reach-out/[id].tsx`, `reach-out/_layout.tsx`, `reach-out/check-in/[id].tsx`, `check-in/_layout.tsx` | Follow-up sheet + return check | DEL-10 |
| `app/select-person.tsx` | PersonPicker | DEL-10 |
| `app/import-contacts.tsx` | `app/(v2)/people/add-from-contacts.tsx` | DEL-10 |
| `app/garden-walk.tsx`, `app/garden-walk-setup.tsx` | Today + weekly brief | DEL-10 |
| `app/activity.tsx` | Monthly letter (Next) | DEL-10 |
| `app/season/new.tsx`, `app/season/retrospective.tsx` | Nothing (tension T14) | DEL-10 |
| `app/settings/*` (1.0 versions) | `app/(v2)/settings/*` | DEL-10 |
| `app/(auth)/login.tsx` | Adapted into `app/(v2)/auth/sign-in.tsx`; `src/lib/auth.ts` kept | DEL-10 |
| `app/index.tsx` shell switch | A plain redirect into v2 | DEL-11 (flag removal) |

### Engines and libraries

| Path | Importers today | Replaced by | Port first? |
|---|---|---|---|
| `src/lib/growthEngine.ts` (402) | 14 files | Nothing: points, stages and toasts are retired | No |
| `src/lib/vitalityEngine.ts` | 8 files | Nothing: no decay | No |
| `src/lib/nextActionEngine.ts` (344) | `person/[id].tsx` | Candidate engine (server) | No |
| `src/lib/suggestionEngine.ts` (802) | 6 files | Candidate engine + `reason_generate` | **Yes:** keep the best 10–15 templates, rewritten for tone, as `packages/domain/reasons/templates.ts` (offline and model-failure fallback) |
| `src/lib/textureEngine.ts` (437) | `person/[id].tsx` | Extraction (`context` items) | No |
| `src/lib/reachOutActionEngine.ts` (264) | `reach-out/[id].tsx` | Channel list from the device contact | No |
| `src/lib/seasonEngine.ts` | 4 files | Nothing | No |
| `src/lib/calendarEngine.ts` (326) | 4 files | `src/platform/calendar.ts` (Next; forward-looking, identity matching) | Partial: permission helpers only |
| `src/lib/notificationService.ts` (439) | 5 files | Server planner/sender + `src/platform/push.ts` (token registration) | No |
| `src/lib/notificationEngine.ts` (414) | 5 files | `packages/domain/tone/` | **Yes:** port the banned-word validator and cadence ideas to the server |
| `src/lib/aiInsightService.ts` (450) | 3 files | `src/platform/aiGateway.ts` (thin typed client) | Patterns only (refusal handling) |
| `src/lib/aiPreferences.ts` | 2 files | `user_settings.ai_consent` via SettingsRepo | No |
| `src/lib/spotlightEngine.ts` | 2 files | `packages/domain/reasons/anniversary.ts` | **Yes:** the anniversary weighting powers "A year ago" |
| `src/lib/contacts.ts` (271) | several | `src/platform/contacts.ts` | **Yes:** normalization and the duplicate index |
| `src/lib/localStore.ts` | several | `src/data/local/` (SQLite) | No |
| `src/lib/exportService.ts` | 2 files | `supabase/functions/export` + client download | No |
| `src/lib/shareImage.ts` + `react-native-view-shot` | 3 files | Nothing (sharing moves to the user's own apps) | No |
| `src/lib/onboardingStatus.ts` | — | Server `user_settings.onboarded_at` | No |
| `src/lib/photoPicker.ts` | — | `src/platform/photos.ts` (Later) | Phase 0 fix only |
| `src/lib/theme.ts`, `design/tokens.ts` | many | `src/design/tokens.ts` | Palette values superseded; motion durations reviewed |
| `src/lib/constants.ts` | — | Split into domain config | Review each constant; the unenforced `FREE_TIER_RELATIONSHIP_LIMIT` and `MAX_MEMORY_LENGTH` go |
| `src/lib/formatters.ts`, `src/lib/utils.ts` | many | `packages/domain/format/` | **Yes**, the date helpers only, with tests |
| `src/services/*.ts` (5) | hooks | Repositories | No |
| `src/hooks/usePersons.ts`, `useMemories.ts`, `useInteractions.ts`, `usePromises.ts`, `useSeason.ts`, `useGrowth.ts`, `useOrientation.ts`, `usePersonPhoto.ts`, `useSuggestions.ts`, `useAIInsight.ts`, `index.ts` | many | `src/features/*/hooks` over repositories | No |
| `src/types/database.ts` (hand-written) | many | `src/types/database.generated.ts` | No |
| `src/providers/ThemeProvider.tsx` | `_layout` | `useTokens()` | No |

### Components

| Path | Replaced by |
|---|---|
| `src/components/LivingPlant.tsx`, `VitalPlant.tsx`, `GrowthPlantIllustration.tsx`, `GrowthCelebration.tsx` | `src/ui/sprig/Sprig.tsx` |
| `src/components/illustrations/index.tsx` (14 plant SVGs) | Sprig renderer |
| `src/components/OrientationOverlay.tsx` | Nothing |
| `src/components/MemoryCarousel.tsx` | "You could mention" list in the follow-up sheet |
| `src/components/MemoryShareCard.tsx` | Nothing |
| `src/components/ContactPicker.tsx` | Adapted: multi-select onboarding picker |
| `src/components/ErrorBoundary.tsx` | Kept, restyled, reporting to Sentry |
| `src/components/ui/Card.tsx` | **No replacement** (no Card in 2.0; lint-banned in v2) |
| `src/components/ui/Button.tsx`, `Chip.tsx` | `Pill`, `Token` |
| `src/components/ui/GrowthToast.tsx`, `PageIndicator.tsx` | Nothing |
| `src/components/ui/SectionHeader.tsx`, `EmptyState.tsx`, `ErrorState.tsx`, `Avatar.tsx`, `TextInput.tsx` | `Label`, `QuietLine`, error state in `Moment`, `Sprig` (People rows use the sprig, not an avatar), `TellField` / plain field |
| `src/components/layout/ScreenContainer.tsx` | `src/ui/Screen.tsx` (paper background, gutter 26) |
| Empty folders `src/components/cards`, `feedback`, `forms` | Removed |

### Styling system and dependencies

| Item | Why | When |
|---|---|---|
| `nativewind`, `tailwindcss`, `tailwind-merge`, `clsx`, `tailwind.config.js`, `global.css`, `nativewind-env.d.ts`, the NativeWind lines in `metro.config.js` and `babel.config.js` | 73 `className` uses vs 1,762 inline styles; 2.0 uses tokens | DEL-10 (removing the Babel/Metro config needs a dev-client rebuild) |
| `@expo-google-fonts/dm-sans`, `@expo-google-fonts/dm-serif-display` | Replaced by Newsreader and Instrument Sans | DEL-10 |
| `expo-linear-gradient` (21 importers) | "No gradients" | DEL-10 |
| `react-native-view-shot` | Share cards retired | DEL-10 |
| `expo-sharing` | Used by share cards and export | **Keep** (export uses the share sheet) |
| `expo-calendar` | Unused in V1 | Keep the dependency; the permission string is rewritten for briefs (Next); no V1 code path asks |

### Backend

| Item | Replaced by | When |
|---|---|---|
| `supabase/functions/ai-insight` | `ai-gateway` (built on its hardening) | After the 1.0 shell is deleted (DEL-12) |
| Tables `persons`, `memories`, `interactions` (old shape), `promises`, `seasons`, `season_commitments` | `people`, `captures`, `memory_items`, `memory_item_sources`, `related_people`, `reasons`, `interactions` (v2) | DEL-12: dropped by migration after `shell_v2` = 100%. Live data is test-only (2 people, 3 memories, 12 interactions, 0 promises, 0 seasons); an optional one-time import script exists for internal testers (DEL-12a) |
| `persons.notes` JSONB, `persons.interests[]` | `memory_items` (kinds fact/context) | With the table drop |
| Migrations `001`–`008` | A single CLI-timestamped baseline plus v2 migrations | P0-11 (baseline); old files are kept as history under `supabase/migrations/_legacy/` for one release, then removed |

## 3. Keep temporarily as fallback

| Item | Kept for | Removed when |
|---|---|---|
| Rewritten 1.0 suggestion templates (`packages/domain/reasons/templates.ts`) | Copy when `reason_generate` fails or AI consent is off | Never, as long as they stay the offline path; reviewed each release |
| 1.0 shell (`app/(tabs)` and the rest), frozen | Internal dogfooding until v2 alpha; rollback target if `shell_v2` must be switched off | DEL-10, two weeks after `shell_v2` = 100% with no rollback |
| `ai-insight` function | The 1.0 shell's profile insight and promise check | DEL-12 |
| Old tables | The 1.0 shell reads them | DEL-12 |
| `src/lib/auth.ts`, `src/lib/supabase.ts`, `src/providers/AuthProvider.tsx` | Adapted, not replaced (with the sign-out wipe added) | Not removed |
| `PressableScale`, `FadeIn`, `FadeInImage`, `Skeleton` | Retuned to the motion table | Not removed |

## Order and safety

1. Phase 0 deletions (§1) land first, each in its own PR with `tsc`, lint and tests green.
2. The v2 shell is built alongside the frozen 1.0 shell. **No 2.0 code imports anything in §2.**
   - An ESLint `no-restricted-imports` rule in `app/(v2)/**` and `src/{ui,features,data,domain,platform}/**` bans `@/lib/*Engine`, `@/hooks/*`, `@/services/*`, `@/components/*` (except the kept primitives) and `@/data/mock`.
3. DEL-10 deletes §2 routes, engines, components and styling in one PR per area, in this order:
   1. Routes.
   2. Components.
   3. Engines and hooks.
   4. Styling and dependencies (with a dev-client rebuild).
   5. `tsc` catches stragglers.
4. DEL-12 drops the old tables and function after two weeks at 100% with no rollback, together with a Supabase backup snapshot.

**Expected size change:** about 26,500 lines in `app/` and about 6,000 in `src/lib/` today. The 2.0 target is under 12,000 lines of app code, plus server functions and tests.
