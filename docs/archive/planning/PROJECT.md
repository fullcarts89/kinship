# Kinship — Intelligence Layer Bug Fixes & Completion

## What This Is

Kinship is an Expo React Native mobile app that helps people nurture their relationships through a garden metaphor. Users "plant" people in their garden, capture memories, reflect on interactions, and watch their relationship plants grow. The intelligence layer adds contextual awareness — vitality scoring, smart suggestions, calendar integration, texture labels, and a weekly Garden Walk experience.

## Core Value

The app must feel like a calm, living garden — never a productivity dashboard. Every interaction should be gentle, optional, and never guilt-inducing. The intelligence layer should surface relevant, timely suggestions based on actual relationship activity, not arbitrary timers.

## Requirements

### Validated

- ✓ Person creation and management (add, edit, import from contacts) — existing
- ✓ Memory capture with emotions and content — existing
- ✓ Interaction tracking (reach-out, reflect) — existing
- ✓ Plant growth system (6 stages, weighted points, daily cap) — existing
- ✓ First-time orientation overlay — existing
- ✓ Profile with gardener levels — existing
- ✓ Settings navigation (account, notifications, privacy) — existing
- ✓ Vitality engine (decay scoring) — existing code
- ✓ Suggestion engine (ranked contextual suggestions) — existing code
- ✓ Notification engine (cadence-limited, tone-validated) — existing code
- ✓ Texture engine (relationship flavor labels) — existing code
- ✓ Calendar engine (event matching) — existing code
- ✓ Context extractor (life event detection) — existing code
- ✓ Garden Walk setup screen — existing code
- ✓ Garden Walk weekly screen — existing code
- ✓ Post-reach-out check-in screen — existing code
- ✓ About, Privacy Policy, Terms screens — existing code

### Active

- [ ] Fix photo picker not working from collections folders
- [ ] Fix reach-out flow showing wrong intermediate screen (should go straight to check-in after action)
- [ ] Fix photos not displaying in saved memories
- [ ] Fix vitality/context ignoring recent interactions ("it's been a while" when just reached out)
- [ ] Fix memories not being tappable/clickable for detail view
- [ ] Fix home screen suggestions not accounting for recent reach-outs
- [ ] Wire calendar import with permission flow (Garden Walk setup + Settings)
- [ ] Fix Garden Walk showing stale "plants to tend" after recent reach-outs
- [ ] Remove "Capture a moment" section from Garden Walk (focus on suggested people only)
- [ ] Fix reach-out screen showing static/repetitive content instead of contextual intelligence
- [ ] Add swipeable memory carousel in reach-out flow (recent memories for context before action)
- [ ] Fix "moment worth revisiting" surfacing memories too soon (needs minimum 7-day lag)
- [ ] Fix plant icon inconsistency between garden canopy and "All people" list
- [ ] Fix imported contacts not showing phone/email in profile (pull from device contacts)
- [ ] Fix call/text/etc buttons showing when no contact info is available
- [ ] Complete intelligence layer wiring (vitality visuals, suggestions feeding real data, calendar integration)

### Out of Scope

- Supabase backend integration — deferred to next milestone
- Push notifications delivery — engine exists but sending deferred
- Subscription/payment/premium elements — app is free
- Analytics/tracking integration — deferred
- Localization/i18n — deferred

## Context

This is a brownfield project on the `intelligence-layer` git branch. The intelligence layer engines (vitality, suggestion, notification, texture, calendar, context extractor) have been coded but many are not properly wired to the UI, and several existing features have bugs discovered during manual testing. The app runs on Expo SDK 54 with mock data (Supabase not yet connected). All data persists via module-level shared state arrays.

**Key architectural patterns:**
- Module-level shared state with listener subscriptions (growth engine, orientation, toasts)
- Lazy `require()` for native modules (expo-contacts, expo-calendar) to avoid crashes
- `useFocusEffect` for refreshing data when tabs gain focus
- `router.canGoBack()` safety pattern before `router.back()`

**Design philosophy:**
- Never gap-shaming, never urgency, never guilt
- Plant metaphor throughout ("Plant in your garden" not "Save contact")
- Design tokens from `@design/tokens` for all colors, typography, shadows

## Constraints

- **Tech stack**: Expo SDK 54, React Native, TypeScript, NativeWind, expo-router file-based routing
- **No external state management**: Module-level shared state only (no Redux/Zustand)
- **Native modules**: Must use lazy `require()` inside try/catch for expo-contacts and expo-calendar
- **Tone**: All user-facing copy must pass tone validation (no guilt words: "haven't", "forgot", "neglect", "overdue")
- **No gamification**: No points, streaks, progress bars, or day counts shown to users

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Reach-out flow → memory carousel then actions then check-in | User wants context (past memories) before choosing how to reach out | — Pending |
| Remove "Capture a moment" from Garden Walk | Garden Walk should focus only on suggested people to tend to | — Pending |
| Calendar permission in Garden Walk setup + manageable in Settings | Natural onboarding moment + ongoing control | — Pending |
| Show device contact info on imported person profiles | Users expect to see phone/email when they import someone | — Pending |
| 7-day minimum lag before memory resurfaces | Prevents "revisit this memory" appearing for something just captured | — Pending |

---
*Last updated: 2026-02-27 after initialization*
