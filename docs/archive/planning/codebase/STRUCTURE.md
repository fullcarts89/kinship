# Structure

## Directory Layout

```
/Users/thoroxnard/Documents/Kinship/
├── app/                           # Expo Router file-based routing
│   ├── _layout.tsx               # Root Stack layout + providers + fonts
│   ├── index.tsx                 # Root redirect (auth check)
│   ├── loading.tsx               # Splash/loading screen with plant animation
│   ├── onboarding.tsx            # App onboarding flow
│   ├── +not-found.tsx            # 404 fallback
│   │
│   ├── (auth)/                   # Unauthenticated routes (group)
│   │   ├── _layout.tsx           # Auth stack layout
│   │   ├── login.tsx             # Sign-in screen
│   │   └── onboarding.tsx        # Onboarding after signup
│   │
│   ├── (tabs)/                   # Main app (group) — bottom nav stays mounted
│   │   ├── _layout.tsx           # Tabs container + "Tend your garden" sheet
│   │   ├── index.tsx             # Home screen (swaying plants, spotlight)
│   │   ├── people.tsx            # Garden tab (connection list, growth canopy)
│   │   ├── add.tsx               # Multi-step Add Person flow
│   │   ├── profile.tsx           # Profile tab (gardener level, settings)
│   │   └── activity.tsx          # Activity feed (hidden, merged into person profile)
│   │
│   ├── person/                   # Dynamic person profile
│   │   ├── _layout.tsx           # Person stack layout
│   │   └── [id].tsx              # Person detail screen (timeline, interactions, growth)
│   │
│   ├── memory/                   # Memory creation flow
│   │   ├── _layout.tsx           # Memory modal layout
│   │   └── add.tsx               # Capture memory screen
│   │
│   ├── reach-out/                # Reach-out interaction flow
│   │   ├── _layout.tsx           # Reach-out modal layout
│   │   ├── [id].tsx              # Reach-out confirmation for a person
│   │   └── check-in/             # Check-in subflow
│   │       ├── _layout.tsx       # Check-in modal layout
│   │       └── [id].tsx          # Check-in screen
│   │
│   ├── settings/                 # Settings stack
│   │   ├── _layout.tsx           # Settings stack layout
│   │   ├── index.tsx             # Settings hub (links to sub-screens)
│   │   ├── account.tsx           # Account management (multi-screen via step state)
│   │   ├── notifications.tsx     # Notification preferences (4-phase flow)
│   │   ├── privacy.tsx           # Privacy & data (5-screen flow)
│   │   ├── about.tsx             # About Kinship
│   │   ├── terms.tsx             # Terms of Service
│   │   └── privacy-policy.tsx    # Privacy Policy
│   │
│   ├── notifications.tsx         # Notification center (9-screen system)
│   ├── select-person.tsx         # Person picker modal (shared by reach-out, memory)
│   ├── garden-walk.tsx           # Garden tour experience
│   ├── garden-walk-setup.tsx     # Initial garden setup
│   └── [intent].tsx              # Dynamic intent routing
│
├── src/                          # Source code (non-app logic)
│   ├── components/               # React components
│   │   ├── ui/                   # UI primitives
│   │   │   ├── Button.tsx        # Primary, secondary, outline, ghost, destructive variants
│   │   │   ├── Card.tsx          # Card container (default, elevated, flat, outline)
│   │   │   ├── Chip.tsx          # Multi-select chip component
│   │   │   ├── Avatar.tsx        # User photo avatar with initials fallback
│   │   │   ├── TextInput.tsx     # Text input with icon, error state
│   │   │   ├── FadeIn.tsx        # Entrance animation (className-based)
│   │   │   ├── Skeleton.tsx      # Loading placeholder
│   │   │   ├── EmptyState.tsx    # Empty state message + illustration
│   │   │   ├── ErrorState.tsx    # Error message + retry
│   │   │   ├── SectionHeader.tsx # Section title + optional action
│   │   │   ├── PageIndicator.tsx # Page dot indicators
│   │   │   ├── GrowthToast.tsx   # Growth toast + overlay (module-level queue)
│   │   │   └── index.ts          # Barrel re-export
│   │   │
│   │   ├── layout/               # Layout wrappers
│   │   │   ├── ScreenContainer.tsx # Safe area wrapper
│   │   │   └── index.ts          # Barrel re-export
│   │   │
│   │   ├── illustrations/        # SVG illustrations
│   │   │   └── index.tsx         # Barrel re-export all SVG components
│   │   │
│   │   ├── cards/                # Card-style components (.gitkeep)
│   │   ├── forms/                # Form components (.gitkeep)
│   │   ├── feedback/             # Feedback components (.gitkeep)
│   │   │
│   │   ├── OrientationOverlay.tsx  # First-time guidance spotlight overlay
│   │   ├── MemoryCelebration.tsx   # Memory save celebration animation
│   │   ├── TendGardenSheet.tsx     # Bottom sheet with 3 relationship actions
│   │   ├── VitalPlant.tsx          # Interactive plant visualization
│   │   └── ErrorBoundary.tsx       # Error catch fallback
│   │
│   ├── hooks/                    # Custom React hooks
│   │   ├── usePersons.ts         # usePersons(), usePerson()
│   │   ├── useMemories.ts        # useMemories(), usePersonMemories(), useCreateMemory()
│   │   ├── useInteractions.ts    # usePersonInteractions(), useAllInteractions(), useCreateInteraction()
│   │   ├── useGrowth.ts          # usePersonGrowth(), useBootstrapGrowth()
│   │   ├── useOrientation.ts     # useOrientation() + subscriptions
│   │   ├── useVitality.ts        # usePersonVitality(), useAllVitalities()
│   │   ├── useSuggestions.ts     # useSuggestions()
│   │   ├── usePersonPhoto.ts     # usePersonPhoto() for photo selection
│   │   └── index.ts              # Barrel re-export all hooks
│   │
│   ├── lib/                      # Library utilities + engines
│   │   ├── growthEngine.ts       # Canonical growth points/stages/daily cap + subscriptions
│   │   ├── growthStage.ts        # Legacy adapter (re-exports from growthEngine)
│   │   ├── vitalityEngine.ts     # Vitality scoring system
│   │   ├── suggestionEngine.ts   # Check-in/memory suggestion intelligence
│   │   ├── notificationEngine.ts # Notification scheduling
│   │   ├── calendarEngine.ts     # Birthday + calendar logic
│   │   ├── textureEngine.ts      # Visual texture generation
│   │   ├── contextExtractor.ts   # Context extraction from memories
│   │   ├── supabase.ts           # Supabase client + isSupabaseConfigured flag
│   │   ├── auth.ts               # getAuthUserId() helper
│   │   ├── theme.ts              # Semantic design token layer
│   │   ├── formatters.ts         # Text formatting utilities
│   │   ├── utils.ts              # cn() for Tailwind class merging
│   │   ├── constants.ts          # Shared constants
│   │   └── memorySelection.ts    # Memory selection logic
│   │
│   ├── services/                 # API/data service layer
│   │   ├── personService.ts      # getPersons(), createPerson(), updatePerson(), deletePerson()
│   │   ├── memoryService.ts      # getMemories(), createMemory(), updateMemory(), deleteMemory()
│   │   ├── interactionService.ts # getInteractions(), createInteraction(), updateInteraction(), deleteInteraction()
│   │   └── index.ts              # Barrel re-export
│   │
│   ├── providers/                # Context providers
│   │   ├── AuthProvider.tsx      # Authentication state + useAuth() hook
│   │   ├── ThemeProvider.tsx     # Theme state + useTheme() hook
│   │   └── index.tsx             # AppProviders wrapper + re-exports
│   │
│   ├── types/                    # TypeScript type definitions
│   │   ├── index.ts              # Shared types (RelationshipType, Emotion, InteractionType, etc.)
│   │   ├── database.ts           # Supabase database schema types (User, Person, Memory, Interaction, Suggestion)
│   │   └── navigation.ts         # Navigation/routing types
│   │
│   ├── data/                     # Data utilities
│   │   └── mock.ts               # Mock/seed data (for development/testing)
│   │
│   └── stores/                   # Global state stores (.gitkeep)
│       └── index.ts              # (Reserved for future state management)
│
├── design/                       # Design tokens
│   └── tokens.ts                 # Colors, fonts, spacing, radii, shadows, opacity
│
├── assets/                       # Static assets
│   └── images/                   # App icons, splash, adaptive icons
│
├── supabase/                     # Supabase configuration
│   └── migrations/               # SQL migration files
│       └── 001_initial_schema.sql
│
├── .planning/                    # Planning documentation
│   └── codebase/                 # Codebase documentation
│       ├── ARCHITECTURE.md       # Architecture overview
│       └── STRUCTURE.md          # This file
│
├── .expo/                        # Expo CLI configuration
├── .claude/                      # Claude Code configuration
├── dist/                         # Build output
│
├── app.json                      # Expo app configuration
├── package.json                  # NPM dependencies
├── package-lock.json             # Lock file
├── tsconfig.json                 # TypeScript configuration
├── tailwind.config.js            # Tailwind CSS configuration
├── .mcp.json                     # MCP (Model Context Protocol) configuration
├── .eslintrc.json                # ESLint configuration
├── global.css                    # Global styles (Tailwind imports)
├── index.js                      # Entry point (Expo Router)
├── expo-env.d.ts                 # Expo environment types
├── KINSHIP_IMPLEMENTATION_SPEC.md # Implementation specification
└── CODEBASE_EXPORT.txt           # Codebase export snapshot
```

---

## Key Directories

### `/app` — Expo Router File-Based Routing

**Pattern:** File paths map directly to route URLs.

| File Path | Route |
|-----------|-------|
| `app/index.tsx` | `/` (root) |
| `app/(tabs)/index.tsx` | `/(tabs)` (home within tabs) |
| `app/person/[id].tsx` | `/person/:id` (dynamic route) |
| `app/settings/account.tsx` | `/settings/account` |
| `app/(auth)/login.tsx` | `/(auth)/login` (auth group) |

**Groups** (parentheses) don't affect routing but organize screen stacks:
- `(auth)` — Authentication screens (separate stack)
- `(tabs)` — Bottom tab navigation (stays mounted, state persists)

### `/src/components` — React Components

**Organization:**
- **`ui/`** — Reusable UI primitives (Button, Card, Chip, Avatar, etc.)
  - All accept props for variant, size, state (loading, disabled, error)
  - Styled via NativeWind (Tailwind on React Native)
- **`layout/`** — Layout wrappers (ScreenContainer for safe area + padding)
- **`illustrations/`** — SVG plant illustrations (imported as components)
- **Feature components** at root level (OrientationOverlay, MemoryCelebration, VitalPlant, ErrorBoundary)

**Barrel Exports:**
- `src/components/ui/index.ts` — Export all UI components
- `src/components/layout/index.ts` — Export layout components
- `src/components/illustrations/index.tsx` — Export all SVG illustrations

### `/src/hooks` — Custom React Hooks

**Data Hooks:**
- `usePersons()` — Fetch all persons; manage loading/error
- `usePerson(id)` — Fetch single person
- `useMemories()` — Fetch all memories
- `usePersonMemories(personId)` — Fetch memories for one person
- `useInteractions()` — Fetch all interactions
- `usePersonInteractions(personId)` — Fetch interactions for one person
- `useCreateMemory()` — Create new memory (callback)
- `useCreateInteraction()` — Create new interaction (callback)

**Growth & Vitality:**
- `usePersonGrowth(personId)` — Get current growth stage + points
- `useBootstrapGrowth(memories, interactions, isLoading)` — Seed growth on app init
- `usePersonVitality(personId)` — Get vitality score
- `useAllVitalities()` — Get vitality for all people

**System Hooks:**
- `useOrientation()` — Get current orientation step + completion status
- `useSuggestions()` — Get AI-generated suggestions
- `usePersonPhoto(personId)` — Photo URL or initials fallback

**Provider Hooks:**
- `useAuth()` — Authentication state (from AuthProvider)
- `useTheme()` — Design tokens (from ThemeProvider)

**Barrel Export:** `/src/hooks/index.ts` re-exports all hooks for convenience.

### `/src/lib` — Library Functions & Engines

**Growth System:**
- `growthEngine.ts` — Canonical points, stages, daily cap, subscriptions
- `growthStage.ts` — Adapter; backward-compatible `getGrowthStage(memoriesCount, interactionsCount)` function

**Intelligence Engines:**
- `vitalityEngine.ts` — Score relationships by frequency/recency
- `suggestionEngine.ts` — Suggest check-ins, memory resurfacing, activities
- `notificationEngine.ts` — Schedule and deliver notifications
- `contextExtractor.ts` — Extract context from memory content

**Utilities:**
- `supabase.ts` — Supabase client + `isSupabaseConfigured` flag
- `auth.ts` — `getAuthUserId()` helper
- `theme.ts` — Semantic design token layer
- `formatters.ts` — `relationshipLabels`, text formatting
- `utils.ts` — `cn()` for Tailwind class merging
- `constants.ts` — Shared constants (day names, months, etc.)
- `memorySelection.ts` — Memory filtering/sorting logic

### `/src/services` — API Service Layer

**Pattern:** Collections of async functions; NOT classes.

- `personService.ts`
  - `getPersons()` → Promise<Person[]>
  - `getPersonById(id)` → Promise<Person | null>
  - `createPerson(person)` → Promise<Person>
  - `updatePerson(id, updates)` → Promise<Person>
  - `deletePerson(id)` → Promise<void>

- `memoryService.ts`
  - `getMemories()` → Promise<Memory[]>
  - `getPersonMemories(personId)` → Promise<Memory[]>
  - `createMemory(memory)` → Promise<Memory>
  - `updateMemory(id, updates)` → Promise<Memory>
  - `deleteMemory(id)` → Promise<void>

- `interactionService.ts`
  - `getInteractions()` → Promise<Interaction[]>
  - `getPersonInteractions(personId)` → Promise<Interaction[]>
  - `createInteraction(interaction)` → Promise<Interaction>
  - `updateInteraction(id, updates)` → Promise<Interaction>
  - `deleteInteraction(id)` → Promise<void>

**Supabase Integration:**
- All services use `supabase` client from `src/lib/supabase.ts`
- All queries filtered by authenticated user ID (`user_id`)
- Throw errors on failure (no silent defaults)

### `/src/providers` — Context Providers

- `AuthProvider.tsx`
  - Checks Supabase config
  - Manages user session
  - Provides `useAuth()` hook with `{ user, session, isLoading, signIn, signOut }`

- `ThemeProvider.tsx`
  - Exposes design tokens
  - Provides `useTheme()` hook

- `index.tsx`
  - `<AppProviders>` wrapper: SafeArea → Theme → Auth → ErrorBoundary

### `/src/types` — TypeScript Definitions

- `index.ts`
  - `RelationshipType`, `Emotion`, `InteractionType`, `SuggestionType`, `SuggestionStatus`
  - `NotificationType`, `IconComponent`

- `database.ts`
  - Supabase schema types: `User`, `Person`, `Memory`, `Interaction`, `Suggestion`
  - Insert/Update variants: `PersonInsert`, `PersonUpdate`, etc.
  - `Database` interface (Supabase GenericSchema)

- `navigation.ts`
  - Navigation-related types (route params, etc.)

### `/design/tokens.ts` — Design Tokens

**Colors:**
- Primary: sage, moss, sageLight, sagePale
- Accents: gold, goldLight, goldPale, peach, lavender, sky, terracotta
- Neutral: cream (background), white, nearBlack, warmGray
- Semantic: error, errorLight, errorPale, success, successPale, warning, warningPale, border

**Fonts:**
- Serif: DMSerifDisplay (headings)
- Sans: DMSans, DMSans-Medium, DMSans-SemiBold, DMSans-Bold

**Spacing:** xs (4px), sm (8px), md (12px), lg (16px), xl (24px), 2xl (32px) — 4px base

**Radii:** sm (4px), md (8px), lg (12px), xl (16px), full (999px)

**Shadows:** card, elevated, none

---

## Key Files

### Root Configuration Files

| File | Purpose |
|------|---------|
| `app.json` | Expo app config (name, version, orientation, iOS/Android settings, splash, plugins) |
| `package.json` | NPM dependencies, scripts (start, ios, android, web, lint) |
| `tsconfig.json` | TypeScript configuration |
| `tailwind.config.js` | Tailwind CSS (NativeWind) config |
| `.mcp.json` | MCP (Model Context Protocol) config for Figma integration |
| `.eslintrc.json` | ESLint linting rules |
| `index.js` | Expo Router entry point |
| `global.css` | Global styles (Tailwind + CSS resets) |
| `expo-env.d.ts` | Expo environment type definitions |

### Core App Files

| File | Purpose |
|------|---------|
| `app/_layout.tsx` | **Root Stack** — Fonts, providers, screen registration, toast overlay |
| `app/index.tsx` | **Root Redirect** — Auth check → `/` or `/(tabs)` |
| `app/(tabs)/_layout.tsx` | **Tab Navigator** — Home, Garden, Tend (FAB), Profile; "Tend your garden" sheet |
| `app/(tabs)/index.tsx` | **Home Screen** — Swaying plant carousel, memory spotlight, suggestions, orientation Steps 1–2 |
| `app/(tabs)/people.tsx` | **Garden Tab** — Connection list, canopy visualization, growth stages |
| `app/(tabs)/add.tsx` | **Add Person** — Multi-step flow: manual entry, interests, photo |
| `app/(tabs)/profile.tsx` | **Profile Tab** — Gardener level, statistics, settings menu |
| `app/person/[id].tsx` | **Person Detail** — Growth visualization, timeline, interactions, Reflect sheet, orientation Steps 3–4 |
| `app/memory/add.tsx` | **Capture Memory** — Emotion chips, content, optional photo, growth wiring |
| `app/reach-out/[id].tsx` | **Reach Out** — Interaction type selector, optional note, no growth |
| `app/settings/index.tsx` | **Settings Hub** — Links to Account, Notifications, Privacy, About |
| `app/settings/account.tsx` | **Account Settings** — Multi-screen via step state: save/restore, signin, logout, etc. |
| `app/settings/notifications.tsx` | **Notification Preferences** — 4-phase flow for notification settings |
| `app/settings/privacy.tsx` | **Privacy & Data** — 5-screen flow: export, delete, GDPR |
| `app/notifications.tsx` | **Notification Center** — 9-screen system with lock screen flows |

### Key Source Files

| File | Purpose |
|------|---------|
| `src/lib/growthEngine.ts` | **Canonical Growth** — Points, stages, daily cap, subscriptions |
| `src/lib/supabase.ts` | **Supabase Client** — Initialization + config check |
| `src/lib/theme.ts` | **Semantic Theme** — Maps tokens to component roles |
| `src/types/database.ts` | **DB Schema Types** — User, Person, Memory, Interaction, Suggestion |
| `src/providers/AuthProvider.tsx` | **Auth Context** — Session management + `useAuth()` hook |
| `src/services/personService.ts` | **Person CRUD** — Database operations |
| `src/hooks/usePersons.ts` | **Person Hooks** — Fetch + create persons |
| `src/hooks/useGrowth.ts` | **Growth Hooks** — Get growth stage, bootstrap data |
| `src/components/ui/GrowthToast.tsx` | **Growth Toast** — Module-level queue + overlay |
| `src/components/OrientationOverlay.tsx` | **Orientation** — SVG spotlight overlay for first-time guidance |

---

## Naming Conventions

### Components

**File names:** PascalCase (CapWords)
```
Button.tsx, Avatar.tsx, ScreenContainer.tsx, OrientationOverlay.tsx
```

**Export names:** Exact match file name (default export)
```typescript
export default function Button(...) { ... }
export default function Avatar(...) { ... }
```

**Variant props:** lowercase, kebab-case values
```typescript
<Button variant="primary" size="md" />
<Card variant="elevated" />
```

### Hooks

**File names:** camelCase, prefixed with `use`
```
usePersons.ts, useGrowth.ts, useOrientation.ts
```

**Exported functions:** Same as file name (no default exports)
```typescript
export function usePersons() { ... }
export function useGrowth() { ... }
```

### Services

**File names:** camelCase, suffixed with `Service`
```
personService.ts, memoryService.ts, interactionService.ts
```

**Exported functions:** verb + noun, camelCase
```typescript
export async function getPersons() { ... }
export async function createPerson(...) { ... }
export async function updatePerson(...) { ... }
```

### Types

**File names:** lowercase, plural or descriptive
```
database.ts, index.ts, navigation.ts
```

**Type exports:** PascalCase
```typescript
export type RelationshipType = "friend" | "family" | ...;
export type Person = { id: string; name: string; ... };
export interface GrowthInfo { stage: GrowthStage; ... }
```

### Constants

**Naming:** SCREAMING_SNAKE_CASE (module-level const)
```typescript
const POINTS_MEANINGFUL_MEMORY = 3;
const DAILY_CAP = 4;
const STAGE_THRESHOLDS = [...];
```

### Routes (Expo Router)

**File names:** lowercase, dash-separated for segments
```
app/(tabs)/index.tsx  → /(tabs)
app/person/[id].tsx   → /person/:id
app/settings/account.tsx → /settings/account
```

**Dynamic segments:** `[paramName].tsx`
```
[id].tsx    → Route param: route.params.id
[...route].tsx → Catch-all param
```

**Groups:** `(groupName)/` doesn't affect route, organizes stack
```
(auth)/      → Routes stay under /(auth) for stack organization
(tabs)/      → Routes stay under /(tabs) for tab navigation
```

---

## File Organization Patterns

### Barrel Exports

**Pattern:** `index.ts` file re-exports grouped items for cleaner imports.

**Example:** `src/components/ui/index.ts`
```typescript
export { Button } from "./Button";
export { Card } from "./Card";
export { Avatar } from "./Avatar";
// ... all UI primitives
```

**Import:**
```typescript
import { Button, Card, Avatar } from "@/components/ui";
```

### Module-Level Shared State

**Pattern:** Module scope (outside React) for cross-component state with subscription listeners.

**Example:** `src/lib/growthEngine.ts`
```typescript
// Module-level storage
const personPoints = new Map<string, number>();
const dailyCapUsed = new Map<string, Map<string, number>>();
const listeners = new Set<(transition: GrowthTransition | null) => void>();

// Public API
export function recordMemoryGrowth(...) { ... listeners.forEach(fn => fn(...)) }
export function getGrowthInfo(personId): GrowthInfo { ... }
export function subscribeToGrowth(fn): () => void { ... }

// Hook that subscribes
export function usePersonGrowth(personId) {
  const [info, setInfo] = useState(...);
  useEffect(() => {
    const unsubscribe = subscribeToGrowth(transition => { ... setInfo(...) });
    return unsubscribe;
  }, []);
  return info;
}
```

### Service Layer Pattern

**Pattern:** Async functions grouped by entity; no class abstractions.

**Example:** `src/services/personService.ts`
```typescript
import { supabase } from "@/lib/supabase";
import { getAuthUserId } from "@/lib/auth";
import type { Person, PersonInsert } from "@/types/database";

export async function getPersons(): Promise<Person[]> {
  const userId = await getAuthUserId();
  const { data, error } = await supabase
    .from("persons")
    .select("*")
    .eq("user_id", userId);
  if (error) throw error;
  return data;
}

export async function createPerson(person: PersonInsert): Promise<Person> {
  // ... implementation
}
```

### Hook Pattern

**Pattern:** Custom hooks manage state + async operations; return object with `{ data, isLoading, error, refetch, ...callbacks }`.

**Example:** `src/hooks/usePersons.ts`
```typescript
export function usePersons() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await personService.getPersons();
      setPersons(data);
    } catch (err) {
      setError(err);
      setPersons([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const createPerson = useCallback(async (person) => {
    const created = await personService.createPerson(person);
    setPersons(prev => [created, ...prev]);
    return created;
  }, []);

  return { persons, isLoading, error, refetch: fetch, createPerson };
}
```

### Provider Pattern

**Pattern:** Context + custom hook for access; composed in `AppProviders`.

**Example:** `src/providers/AuthProvider.tsx`
```typescript
const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // ... auth logic

  return (
    <AuthContext.Provider value={{ user, isLoading, ... }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
```

### Semantic Design Tokens

**Pattern:** `tokens.ts` (raw values) + `theme.ts` (semantic roles).

**Example:** `design/tokens.ts`
```typescript
export const colors = {
  cream: "#FDF7ED",
  sage: "#5C736D",
  moss: "#3D5449",
  white: "#FFFFFF",
  // ...
};
```

**Example:** `src/lib/theme.ts`
```typescript
export const semanticColors = {
  background: colors.cream,
  primary: colors.sage,
  primaryPressed: colors.moss,
  text: colors.nearBlack,
  // ...
};

export const theme = {
  colors: semanticColors,
  button: buttonTheme,
  card: cardTheme,
  // ...
};
```

**Usage in Components:**
```typescript
import { theme } from "@/lib/theme";

<View style={{ backgroundColor: theme.colors.background }} />
```

### Error Handling

**Pattern:** Services throw errors; hooks catch and manage state gracefully.

**Example:** Service throws
```typescript
export async function getPersons() {
  const { data, error } = await supabase.from("persons").select("*");
  if (error) throw error;  // Always throw
  return data;
}
```

**Hook catches:**
```typescript
export function usePersons() {
  const fetch = useCallback(async () => {
    try {
      const data = await personService.getPersons();
      setPersons(data);
    } catch (err) {
      setError(err);  // Store error state
      setPersons([]);  // Fallback to empty
    }
  }, []);
}
```

---

## Summary

- **App Routes:** Expo Router file-based routing; groups organize stacks
- **Components:** NativeWind styling; UI primitives in `/ui`, features at root
- **Hooks:** Data management, state subscriptions, growth/vitality/suggestions
- **Services:** Async CRUD functions; Supabase integration; user-scoped queries
- **Types:** TypeScript for type safety; Supabase-compatible schema definitions
- **Design:** Design tokens + semantic theme layer; consistent across components
- **State:** Module-level shared state with subscriptions; Context for auth/theme
- **Naming:** PascalCase components/types; camelCase functions/hooks; SCREAMING_SNAKE_CASE constants
- **Patterns:** Barrel exports, module-level state, service/hook/provider patterns, semantic design

The codebase is organized for scalability and maintainability, ready for Supabase integration and feature expansion.
