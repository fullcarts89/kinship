# Architecture

## Pattern Overview

Kinship is an **Expo React Native mobile application** using file-based routing (Expo Router) with a garden-metaphor design system. The architecture follows modern React patterns with module-level shared state for cross-component data persistence, leveraging design tokens, service layers, and custom hooks.

### Core Design Principles
- **Garden Metaphor:** All relationship terminology uses plant/garden language ("plant," "grow," "tend," "harvest")
- **Gentle, Non-Gamified Experience:** No streaks, no guilt, no urgency—everything is optional and calm
- **Single Source of Truth:** Module-level shared state (via Maps and listener patterns) ensures data consistency across screens
- **Design Consistency:** All styling uses `@design/tokens` for colors, typography, spacing, and shadows
- **Type Safety:** Full TypeScript with Supabase-compatible types for database operations

---

## Routing & Navigation

### File-Based Routing (Expo Router)

**Root Structure:** `/app/_layout.tsx`
- Defines the primary Stack navigator
- Loads fonts (DM Serif Display, DM Sans in 4 weights)
- Wraps app in `<AppProviders>` (SafeArea → Theme → Auth → ErrorBoundary)
- Registers all Stack.Screen entries
- Mounts `<GrowthToastOverlay />` for global toast notifications

**Key Stack Screens:**
- `(tabs)` — Bottom tab navigation (Home, Garden, Tend, Profile)
- `(auth)` — Authentication screens (Login, Onboarding)
- `person/[id]` — Dynamic person profile with growth visualization
- `memory/add` — Modal flow to capture a new memory
- `reach-out/[id]` — Modal flow for reaching out to a person
- `settings` — Settings group with nested screens (Account, Notifications, Privacy)
- `notifications` — Notification center (9-screen system)
- `loading` — Splash/loading screen with plant animation
- `onboarding` — First-time app orientation
- `select-person` — Modal for selecting a person (used by reach-out, memory)

### Tab Navigation

**File:** `/app/(tabs)/_layout.tsx`
- **Tabs:** Home (Sun), Garden (Flower), Tend (Sprout FAB), Profile (User)
- **Center FAB (Tend icon):** Opens a bottom sheet with 3 relationship actions
  - Capture a moment (→ `/memory/add`)
  - Reach out (→ `/select-person?intent=reach-out`)
  - Add someone (→ `/(tabs)/add`)
- **Navigation Pattern:** Tabs stay mounted (state persists via Expo Router)
- **useFocusEffect hook:** Reset/refetch data when a tab regains focus

### Navigation Utilities

**Pattern:** Always use `router.canGoBack()` before calling `router.back()`
- Fallback destinations vary by context (e.g., Settings Hub falls back to `/(tabs)/profile`)
- Prevents dead-end navigation traps

---

## Data Flow

### Three-Layer Architecture

1. **Services Layer** (`src/services/`)
   - `personService.ts` — CRUD for persons table
   - `memoryService.ts` — CRUD for memories table
   - `interactionService.ts` — CRUD for interactions table
   - Each service:
     - Checks Supabase configuration
     - Fetches authenticated user ID
     - Performs scoped queries (all queries filtered by `user_id`)
     - Throws errors on failure (no silent defaults)

2. **Hooks Layer** (`src/hooks/`)
   - `usePersons()` — Fetch all persons; exposes `createPerson()` callback
   - `usePerson(id)` — Fetch single person by ID
   - `useMemories()` — Fetch all memories; exposes `createMemory()` callback
   - `usePersonMemories(personId)` — Fetch memories for a specific person
   - `useInteractions()` — Fetch all interactions; exposes `createInteraction()` callback
   - `usePersonInteractions(personId)` — Fetch interactions for a specific person
   - `usePersonGrowth(personId)` — Get growth stage, label, and points for a person
   - `useBootstrapGrowth(memories, interactions, isLoading)` — Seed growth data from existing records (idempotent)
   - All hooks:
     - Manage loading/error states
     - Return refetch callbacks
     - Gracefully handle Supabase errors (return empty arrays if not authenticated)

3. **Component Layer** (`src/components/`)
   - UI primitives (Button, Card, Chip, Avatar, etc.)
   - Layout components (ScreenContainer)
   - Feature components (OrientationOverlay, GrowthToast, MemoryCelebration, VitalPlant)
   - Illustrations (exported via index.tsx barrel)

### Module-Level Shared State Pattern

**Principle:** Cross-component data is stored at module scope (outside React), with subscription-based listeners.

**Files Using This Pattern:**
- `src/lib/growthEngine.ts` — Growth points and stage tracking
  - Module-level Maps: `personPoints`, `dailyCapUsed`
  - `recordMemoryGrowth()`, `recordReflectionGrowth()` — Update state and notify listeners
  - `getGrowthInfo(personId)` — Get current stage and points
  - `subscribeToGrowth()` — Get updates when growth changes

- `src/hooks/useOrientation.ts` — First-time app orientation state
  - Module-level state: `currentStep`, `hasCompleted`
  - Persisted to `expo-secure-store`
  - `subscribeToOrientationStep()` — React hook subscribes to changes

- `src/components/ui/GrowthToast.tsx` — Toast notification queue
  - Module-level queue: `toastQueue`
  - `showGrowthToast(text, emoji)` — Called from anywhere to queue a toast
  - `GrowthToastOverlay` — Mounted in root layout, consumes queue

**Why This Pattern?**
- Tabs stay mounted in Expo Router, so Zustand/Redux would bloat the bundle
- Module scope avoids React re-render overhead for frequently-updated data
- Listener subscription allows React components to hook in with `useEffect`

---

## State Management

### Authentication State

**Provider:** `src/providers/AuthProvider.tsx`
- Context-based (React Context API)
- Manages user session, login/logout
- Checks Supabase configuration on app init
- Provides `useAuth()` hook with user, session, isLoading, signIn, signOut

### Theme State

**Provider:** `src/providers/ThemeProvider.tsx`
- Exposes design tokens via context
- Provides `useTheme()` hook
- Consumed by UI components for color/typography consistency

### Growth State (Module-Level)

**File:** `src/lib/growthEngine.ts`
- `personPoints: Map<personId, number>` — Accumulated points per person
- `dailyCapUsed: Map<personId, Map<"YYYY-MM-DD", number>>` — Points used today per person
- `listeners: Set<(transition: GrowthTransition | null) => void>` — React hooks subscribe here
- Synchronous API: `recordMemoryGrowth()`, `recordReflectionGrowth()`, `getGrowthInfo()`
- Bootstrap via `useBootstrapGrowth()` hook on app init (idempotent)

### Orientation State (Module-Level)

**File:** `src/hooks/useOrientation.ts`
- `currentStep: number` — 0–3 for guided orientation
- `hasCompleted: boolean` — Whether user finished or skipped
- Persisted to `expo-secure-store` (survived app restart)
- `subscribeToOrientationStep()` — Components hook in with `useEffect`

---

## Key Abstractions

### Growth System

**Concept:** Plants "grow" through meaningful interactions (memories + reflections). Growth is additive, never regressive.

**File:** `src/lib/growthEngine.ts`

**Weights:**
| Event | Points | Condition |
|-------|--------|-----------|
| Meaningful Memory | +3 | Emotion set OR content ≥ 140 chars |
| Simple Memory | +2 | All other memories |
| Reflection | +1 | Saved via ReflectSheet with note or emotion |
| Reach-out | +0 | Never triggers growth |

**Daily Cap:** Max 4 points per person per calendar day (tracked by "YYYY-MM-DD")

**6 Growth Stages:**
| Stage | Points | Label | Key |
|-------|--------|-------|-----|
| Seed | 0–1 | "Seed" | `"seed"` |
| Sprout | 2–4 | "Sprouting" | `"sprout"` |
| Young Plant | 5–9 | "Growing" | `"youngPlant"` |
| Mature | 10–16 | "Thriving" | `"mature"` |
| Blooming | 17–26 | "Blooming" | `"blooming"` |
| Tree | 27+ | "Established" | `"tree"` |

**Toast Messages on Transition:**
- Sprout → "A new leaf for you and {Name}" 🌿
- YoungPlant → "Your garden with {Name} is growing" 🪴
- Mature → "A strong bond with {Name}" 🌳
- Blooming → "Blooming beautifully with {Name}" 🌸
- Tree → "Deeply rooted with {Name}" 🏡

**Wiring:**
- Memory save (`app/memory/add.tsx`): `recordMemoryGrowth()` + toast on stage advance
- Reflection save (`app/person/[id].tsx` ReflectSheet): `recordReflectionGrowth()` + toast
- Reach-out (`app/reach-out/[id].tsx`): No growth calls
- Bootstrap: Home and Garden tabs call `useBootstrapGrowth()` on init to seed points from existing data

### First-Time Orientation System

**Concept:** 4-step guided tour showing key features (home garden, individual plant, person actions, reflect button).

**File:** `src/hooks/useOrientation.ts`

**Steps:**
1. **Home Screen:** Highlight garden overview
2. **Home Screen:** Highlight individual plant in carousel
3. **Person Profile:** Highlight action button bar (Reach Out, Add Memory, Reflect)
4. **Person Profile:** Highlight Reflect button

**Implementation:**
- `src/components/OrientationOverlay.tsx` — SVG spotlight overlay with even-odd fill cutout
- Module-level state with `expo-secure-store` persistence
- Triggered on screens via `useEffect` + ref targeting
- After completing or skipping, never shows again (unless "Replay orientation" in Settings)

### Design Tokens System

**File:** `design/tokens.ts`
- **Colors:** cream, sage, sagePale, sageLight, moss, gold, goldLight, goldPale, peach, lavender, sky, terracotta, nearBlack, warmGray, border, white, error, errorPale, errorLight, success, successPale, warning, warningPale
- **Fonts:** DMSerifDisplay (serif headings), DMSans (regular + Medium + SemiBold + Bold)
- **Spacing:** xs, sm, md, lg, xl, 2xl (8px base)
- **Radii:** sm, md, lg, xl, full
- **Shadows:** card, elevated, none

**Semantic Layer:** `src/lib/theme.ts`
- Maps tokens to semantic roles: `semanticColors`, `buttonTheme`, `cardTheme`, `chipTheme`, etc.
- Imported by components for consistent, maintainable styling

### Type System

**File:** `src/types/index.ts`
- `RelationshipType` — friend, family, partner, colleague, mentor, acquaintance, neighbor, other
- `Emotion` — grateful, connected, curious, joyful, nostalgic, proud, peaceful, inspired, hopeful, loved
- `InteractionType` — message, call, video, in_person, gift, letter, social_media, check_in, other
- `SuggestionType` — check_in, memory_resurface, activity_recommendation
- `IconComponent` — Lucide-compatible icon type

**Database Schema:** `src/types/database.ts`
- Supabase-compatible Row/Insert/Update types for all tables (users, persons, memories, interactions, suggestions)
- Auto-generated after Supabase connection (currently hand-written)

---

## Entry Points

### App Initialization Flow

1. **`app/_layout.tsx` (Root Layout)**
   - Loads fonts via `useFonts()`, holds splash screen until ready
   - Wraps entire app in `<AppProviders>`
   - Renders Stack navigator

2. **`src/providers/index.tsx` (AppProviders)**
   - SafeAreaProvider → ThemeProvider → AuthProvider → ErrorBoundary
   - Establishes context hierarchy

3. **`src/providers/AuthProvider.tsx`**
   - Checks Supabase configuration
   - Initializes auth session from storage
   - Renders route-guarding logic (auth or tabs)

4. **`app/index.tsx` (Root Redirect)**
   - Conditional redirect:
     - Not authenticated → `/(auth)/login`
     - Authenticated → `/(tabs)` (Home)

5. **`app/(tabs)/index.tsx` (Home Screen)**
   - Calls `useBootstrapGrowth()` to seed growth data from mock/existing records
   - Calls `useFocusEffect()` to reset state when tab gains focus
   - Renders swaying plant carousel, memory spotlight, suggestion cards
   - Triggers orientation Steps 1–2

### Key Lifecycle Hooks

**useFocusEffect** (from expo-router)
- Runs when a tab/screen gains focus
- Used to refetch data, reset local state, refresh growth

**useEffect** for Module-Level Subscriptions
- Growth state: `subscribeToGrowth()` listener
- Orientation: `subscribeToOrientationStep()` listener
- Ensures React components re-render when module state changes

**Bootstrap Pattern**
- `useBootstrapGrowth(memories, interactions, isLoading)` is idempotent
- Called on Home and Garden tabs on first mount
- Seeds growth points from existing data without double-counting
- Never regresses growth

---

## Important Implementation Details

### Lazy Loading of expo-contacts

**Problem:** Top-level `import * as Contacts from "expo-contacts"` crashes the app (native module issue).

**Solution:** Use `require()` inside try/catch:
```typescript
let Contacts: typeof import("expo-contacts") | null = null;
try {
  Contacts = require("expo-contacts");
} catch {
  // Contacts not available
}
```

### FadeIn Component Constraint

**Important:** `<FadeIn>` only accepts the `className` prop (NativeWind), NOT `style` prop.
- Use `className` for all styling
- Do NOT pass inline `style` objects to FadeIn

### Router Navigation Safety

**Pattern:** Always check before going back
```typescript
if (router.canGoBack()) {
  router.back();
} else {
  router.replace("/(tabs)/profile"); // Fallback
}
```

### Stack.Screen Registration

**Requirement:** Root Stack in `_layout.tsx` MUST register the `index` route first (or Expo Router falls through to the first defined screen).
```typescript
<Stack.Screen name="index" options={{ headerShown: false }} />
```

### React Hook Rules

**Constraint:** All React hook calls (useState, useEffect, useCallback, etc.) must be placed BEFORE any conditional `return` statements.
- Hooks must be called at the top level of component functions
- No early returns before hooks

---

## Component Structure

### UI Primitives (`src/components/ui/`)

- `Button.tsx` — Variants: primary, secondary, outline, ghost, destructive
- `Card.tsx` — Variants: default, elevated, flat, outline
- `Chip.tsx` — Select-multiple emotion/interest chips; outline or filled
- `Avatar.tsx` — User photo with initials fallback; 6 size options
- `TextInput.tsx` — Text input with optional icon, error state
- `FadeIn.tsx` — Entrance animation (className-based only)
- `Skeleton.tsx` — Loading placeholder
- `EmptyState.tsx` — No-data message with illustration
- `ErrorState.tsx` — Error message with retry
- `SectionHeader.tsx` — Section title + optional action
- `PageIndicator.tsx` — Page dot indicators
- `GrowthToast.tsx` — Module-level toast queue + overlay component

### Layout Components (`src/components/layout/`)

- `ScreenContainer.tsx` — Safe area wrapper with standard padding/background
- `index.ts` — Barrel re-export

### Feature Components

- `OrientationOverlay.tsx` — Full-screen spotlight SVG overlay with refs
- `MemoryCelebration.tsx` — Memory save animation/celebration
- `TendGardenSheet.tsx` — Bottom sheet with 3 relationship actions (part of Tab layout)
- `VitalPlant.tsx` — Interactive plant visualization (Vital system)
- `ErrorBoundary.tsx` — Error catch fallback

### Illustrations (`src/components/illustrations/`)

- Exported as SVG React components via barrel (index.tsx)
- Used throughout app for visual metaphor (SeedIllustration, SproutIllustration, PlantGrowthLeavesIllustration, etc.)

---

## Services & Libraries

### Service Layer

**Pattern:** Services are not classes; they're collections of async functions.

- `src/services/personService.ts`
  - `getPersons()` — Fetch all persons for authenticated user
  - `getPersonById(id)` — Fetch single person
  - `createPerson(person)` — Insert new person
  - `updatePerson(id, updates)` — Update person data
  - `deletePerson(id)` — Delete person

- `src/services/memoryService.ts`
  - `getMemories()` — Fetch all memories for authenticated user
  - `getPersonMemories(personId)` — Fetch memories for a specific person
  - `createMemory(memory)` — Insert new memory with emotion + content
  - `updateMemory(id, updates)` — Update memory
  - `deleteMemory(id)` — Delete memory

- `src/services/interactionService.ts`
  - `getInteractions()` — Fetch all interactions
  - `getPersonInteractions(personId)` — Fetch interactions for a person
  - `createInteraction(interaction)` — Insert interaction (bare or with reflection note/emotion)
  - `updateInteraction(id, updates)` — Update interaction
  - `deleteInteraction(id)` — Delete interaction

### Library Functions

- **`src/lib/growthEngine.ts`** — Growth points, stages, daily cap, subscriptions
- **`src/lib/growthStage.ts`** — Legacy adapter; backward-compatible `getGrowthStage()` function
- **`src/lib/supabase.ts`** — Supabase client initialization + `isSupabaseConfigured` flag
- **`src/lib/auth.ts`** — `getAuthUserId()` helper to fetch current user ID
- **`src/lib/theme.ts`** — Semantic design token layer
- **`src/lib/formatters.ts`** — `relationshipLabels` + text formatting utilities
- **`src/lib/utils.ts`** — `cn()` function for Tailwind class merging
- **`src/lib/vitalityEngine.ts`** — Vitality scoring system (not yet fully integrated)
- **`src/lib/suggestionEngine.ts`** — Intelligence engine for check-in/memory suggestions
- **`src/lib/notificationEngine.ts`** — Notification scheduling + delivery
- **`src/lib/calendarEngine.ts`** — Birthday + calendar-based event logic
- **`src/lib/textureEngine.ts`** — Visual texture/pattern generation
- **`src/lib/contextExtractor.ts`** — NLP-style context extraction from memories
- **`src/lib/constants.ts`** — Shared constants (day names, months, etc.)

---

## Summary

Kinship's architecture balances simplicity with scalability:

- **Routing:** Expo Router with file-based structure; tabs stay mounted for state persistence
- **Data:** Service layer → Hook layer → Component layer; clean separation of concerns
- **State:** Module-level shared state for cross-component data (growth, orientation, toasts); Context for auth/theme
- **Growth:** Canonical single-source-of-truth engine; weighted points, daily caps, stage transitions
- **Design:** Design tokens + semantic theme layer ensure consistency
- **Type Safety:** TypeScript + Supabase-compatible types for type-safe database operations
- **UX:** Gentle, non-gamified experience; no guilt, no urgency; optional and calm

The architecture is ready for Supabase integration—services already follow Supabase patterns, and types are pre-defined for all tables.
