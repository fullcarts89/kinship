# Kinship — Intelligence Layer Implementation Spec

**Purpose:** This document is a complete, implementation-ready specification for adding the intelligence layer, vitality system, passive data sources, unified capture, post-reach-out check-in, and notification framework to Kinship. It is designed to be consumed directly by Claude Code against the existing codebase.

**How to use this document:** Implement changes in the order listed (Tier 1 → Tier 2 → Tier 3). Each section specifies exact files to create or modify, data model changes, component specs, and design constraints. Follow every architectural rule in the existing PRD (hooks before early returns, lazy require for expo-contacts, router.canGoBack() guard, FadeIn accepts className only).

**Golden rules that apply to every change below:**
- All UI must use tokens from `design/tokens.ts` and semantic themes from `src/lib/theme.ts`
- All copy must follow the Tone & Copy Guidelines in the existing PRD Section 10
- No points, streaks, progress bars, or day counts are ever shown to the user
- No guilt language, no urgency language, no gap-shaming
- All new state follows the existing module-level Maps/Sets/arrays pattern until Supabase is connected
- All new hooks go in `src/hooks/`, all new lib modules go in `src/lib/`, all new services go in `src/services/`
- Typography: DM Serif Display for headings/titles, DM Sans for body/labels/UI
- Primary colors: cream (#FDF7ED) background, sage (#7A9E7E) primary, moss (#4A7055) dark accent, nearBlack (#2C2C2C) text, warmGray (#8E8E8E) secondary text
- Animations: react-native-reanimated 3.16, calm and organic motion, no bouncy/springy effects

---

## TIER 1 — Build Before Backend Connection

These changes are purely frontend, use mock data, and lay the foundation for everything else.

---

### 1.1 Post-Reach-Out Check-In

**What:** After a user completes the reach-out flow and the Interaction is saved, instead of navigating straight back, show a single check-in screen that captures a lightweight emotional reaction. This is the lowest-friction data capture point in the app.

**Why:** The moment after someone reaches out to a friend is the highest emotional warmth. A one-tap reaction here feeds the intelligence layer without asking the user to journal.

#### Files to modify

**`app/reach-out/[id].tsx`**
- After the current save logic (creates Interaction record), instead of navigating back immediately, navigate to a new check-in screen: `router.push(\`/reach-out/check-in/\${personId}\`)`

**New file: `app/reach-out/check-in/[id].tsx`**

Screen spec:
```
┌─────────────────────────────┐
│                             │
│   [RestingPlantIllustration]│
│                             │
│   "How'd it go with {Name}?"│  ← DM Serif Display, 28px, nearBlack
│                             │
│   [😊] [❤️] [🌱] [✨] [🤗]  │  ← Reaction emoji row, tappable
│                             │
│   [Optional one-line note]  │  ← TextInput, single line, placeholder:
│                             │     "Anything worth remembering?"
│                             │
│   [    Save & Return    ]   │  ← Primary button, sage gradient
│                             │
│   "Skip for now"            │  ← Ghost text button, warmGray
│                             │
└─────────────────────────────┘
```

**Behavior:**
- Selecting a reaction emoji highlights it with a sage border + sagePale background
- Only one emoji can be selected at a time
- Note is optional — if empty, still saves with just the reaction
- "Save & Return" creates an Interaction record with type `check_in`, the selected emoji stored in the `emotion` field mapped as: 😊→connected, ❤️→loved, 🌱→hopeful, ✨→inspired, 🤗→grateful
- Awards +1 growth point via `recordReflectionGrowth` from the growth engine (same as existing Reflect behavior)
- Shows growth toast on stage transition
- Navigates back to the person profile or garden (use `router.canGoBack()` guard)
- "Skip for now" navigates back without saving anything — no guilt, no consequence

**Design tokens:**
- Background: cream (#FDF7ED)
- Emoji row: each emoji in a 56x56 rounded-full container, border: border (#E5E0D8), on select: border sage, bg sagePale (#E8F0E9)
- Note input: bg white, border border, rounded-lg, 16px DM Sans, placeholder warmGray
- All transitions: 250ms ease-in-out (normal speed from design system)

#### Data model addition

Add `check_in` to the Interaction types:
```typescript
// In the type definition for Interaction
type InteractionType = 'message' | 'call' | 'video' | 'in_person' | 'gift' | 'letter' | 'social_media' | 'check_in' | 'other';
```

Modify `src/hooks/useInteractions.ts` to handle the new type. No schema changes needed — check_in interactions use the same shape as other interactions.

#### Growth integration

In `src/lib/growthEngine.ts`, check-in interactions with an emotion or note should award +1 point (same as Reflect). The existing `recordReflectionGrowth` function should work as-is. Call it from the check-in save handler.

---

### 1.2 Plant Vitality System

**What:** A visual layer on top of the existing growth stages. Growth stage is permanent and never regresses. Vitality is a real-time visual modifier that reflects how recently the relationship has been tended. An untended Blooming plant looks slightly muted/wilted. A freshly tended Seed looks vibrant.

**Why:** Without this, a plant for someone you haven't spoken to in a year is visually identical to one you saw yesterday. Vitality provides honest emotional feedback without erasing history or creating guilt.

#### New file: `src/lib/vitalityEngine.ts`

```typescript
/**
 * Vitality Engine
 * 
 * Calculates a vitality score (0.0 to 1.0) for each person based on
 * time since their last interaction or memory. This score is used
 * ONLY for visual rendering — it is never displayed as a number.
 * 
 * Vitality follows a gradual decay curve:
 * - 0-7 days since last activity:   1.0 (fully vibrant)
 * - 7-14 days:                       0.9
 * - 14-30 days:                      0.75
 * - 30-60 days:                      0.6
 * - 60-90 days:                      0.45
 * - 90-180 days:                     0.3
 * - 180+ days:                       0.2 (floor — never fully dead)
 * 
 * The curve is intentionally generous. Most people don't talk to
 * every friend every week, and the app should not punish that.
 * The floor of 0.2 ensures plants always have life.
 */

export type VitalityLevel = 'vibrant' | 'healthy' | 'resting' | 'dormant';

export function getVitalityScore(daysSinceLastActivity: number): number {
  if (daysSinceLastActivity <= 7) return 1.0;
  if (daysSinceLastActivity <= 14) return 0.9;
  if (daysSinceLastActivity <= 30) return 0.75;
  if (daysSinceLastActivity <= 60) return 0.6;
  if (daysSinceLastActivity <= 90) return 0.45;
  if (daysSinceLastActivity <= 180) return 0.3;
  return 0.2;
}

export function getVitalityLevel(score: number): VitalityLevel {
  if (score >= 0.85) return 'vibrant';
  if (score >= 0.6) return 'healthy';
  if (score >= 0.35) return 'resting';
  return 'dormant';
}

export function getDaysSinceLastActivity(
  memories: { created_at: string }[],
  interactions: { created_at: string }[]
): number {
  const allDates = [
    ...memories.map(m => new Date(m.created_at).getTime()),
    ...interactions.map(i => new Date(i.created_at).getTime()),
  ];
  if (allDates.length === 0) return 999; // Never interacted
  const mostRecent = Math.max(...allDates);
  const now = Date.now();
  return Math.floor((now - mostRecent) / (1000 * 60 * 60 * 24));
}
```

#### New file: `src/hooks/useVitality.ts`

```typescript
/**
 * Hook that computes vitality for a person or all persons.
 * Uses the same module-level pattern as usePersons/useMemories/useInteractions.
 * 
 * Usage:
 *   const { vitalityScore, vitalityLevel } = usePersonVitality(personId);
 *   const vitalities = useAllVitalities(); // Map<personId, { score, level }>
 */
```

This hook should:
- Pull memories and interactions for the given person(s) from the existing hooks
- Compute `daysSinceLastActivity` and `getVitalityScore`
- Return the score and level
- Memoize per render cycle

#### Visual implementation

**How vitality affects plant rendering:**

Vitality does NOT change the plant illustration (growth stage determines that). It applies visual modifiers:

| Vitality Level | Opacity | Saturation | Sway Animation | Additional |
|---|---|---|---|---|
| vibrant (≥0.85) | 1.0 | 100% | Full sway (±3deg, 2-3s) | None |
| healthy (≥0.6) | 1.0 | 90% | Gentle sway (±2deg, 3-4s) | None |
| resting (≥0.35) | 0.85 | 75% | Minimal sway (±1deg, 4-5s) | None |
| dormant (<0.35) | 0.7 | 60% | Nearly still (±0.5deg, 5-6s) | Subtle dust motes (optional v2) |

**Implementation approach:**
- In the plant rendering components (Home carousel, Garden canopy, Person profile), wrap the plant SVG illustration in an `Animated.View`
- Apply opacity via `useAnimatedStyle` based on vitality score
- Apply saturation via a color matrix filter if react-native-svg supports it, OR by overlaying a semi-transparent cream layer on top of the plant (simpler approach):
  ```
  overlayOpacity = (1 - vitalityScore) * 0.4
  ```
  This creates a subtle cream wash over lower-vitality plants
- Adjust the sway animation parameters (rotation amplitude and duration) based on vitality level

**Files to modify:**
- `app/(tabs)/index.tsx` — Home screen plant carousel: pass vitality data to plant rendering
- `app/(tabs)/people.tsx` — Garden tab canopy cards and person rows: pass vitality data
- `app/person/[id].tsx` — Person profile growth plant: apply vitality visual modifiers
- Plant illustration components may need a wrapper component. Create:

**New file: `src/components/VitalPlant.tsx`**

A wrapper component that takes:
```typescript
interface VitalPlantProps {
  illustration: React.ComponentType<any>; // The SVG plant illustration
  vitalityScore: number; // 0.0 to 1.0
  size?: number; // illustration size
  style?: any;
}
```

This component handles the opacity overlay, sway animation parameterization, and saturation adjustment. Use it everywhere a plant is rendered instead of rendering the illustration directly.

#### Garden position (drift detection visual)

On the Garden tab (`app/(tabs)/people.tsx`), the "All People" list is currently sorted by growth points (most mature first). Add a secondary consideration:

- Primary sort: growth points (descending) — unchanged
- Within the horizontal canopy scroll: plants with `dormant` vitality drift to the right end
- This is a soft signal, not a rigid sort. Implementation: stable sort by growth stage, then within same stage sort by vitality descending

This provides visual drift detection without any explicit "you're neglecting this person" messaging.

---

### 1.3 Unified Capture Flow

**What:** Merge the existing "Capture a Moment" (Memory) and "Reflect" (Interaction via bottom sheet) into a single "Capture" action. The system auto-classifies based on input richness instead of asking the user to choose between two similar-sounding actions.

**Why:** The distinction between a Memory and a Reflection is clear to the product team but ambiguous to users. Merging them reduces the cognitive tax of "which one do I pick?" and simplifies the Tend FAB.

#### How auto-classification works

| Input characteristics | Classification | Growth points |
|---|---|---|
| Has photo OR text ≥ 140 chars OR both | Meaningful Memory | +3 |
| Text between 1-139 chars, no photo | Simple Memory | +2 |
| Emoji reaction only (from check-in) | Check-in | +1 |

The user never sees these categories. They just capture. The system decides the weight.

#### Changes to the Tend FAB

**Modify: `app/(tabs)/_layout.tsx`** (Tab layout with Tend FAB)

Current Tend bottom sheet actions:
1. Capture a moment → `/memory/add`
2. Reach out → `/select-person?intent=reach-out` → `/reach-out/[id]`
3. Add someone → `/(tabs)/add`

New Tend bottom sheet actions:
1. **Capture** → `/memory/add` (redesigned, see below)
2. **Reach out** → `/select-person?intent=reach-out` → `/reach-out/[id]`

"Add someone" is removed from the Tend sheet. It moves to:
- Garden tab: a persistent `+` button in the header (next to the existing Add button noted in Section 5.2 — this may already exist, just ensure it's the primary entry point)
- Home screen: the "Plant a Seed FAB" that already exists on the home screen

**Tend sheet redesign:**
```
┌─────────────────────────────┐
│   ── (drag handle) ──       │
│                             │
│   Tend your garden          │  ← DM Serif Display, 24px, nearBlack
│                             │
│   ┌───────────────────────┐ │
│   │ 🌱 Capture a moment   │ │  ← Primary gradient CTA (sage→moss)
│   │    Save what matters  │ │     DM Sans, 16px body
│   └───────────────────────┘ │
│                             │
│   ┌───────────────────────┐ │
│   │ 💌 Reach out          │ │  ← Secondary bordered button
│   │    Connect with       │ │     border: sage, bg: white
│   │    someone you love   │ │
│   └───────────────────────┘ │
│                             │
└─────────────────────────────┘
```

Two actions instead of three. Cleaner, faster decision.

#### Redesigned Capture Flow

**Modify: `app/memory/add.tsx`**

The current 4-screen Memory flow becomes a streamlined unified capture:

**Screen 1: Capture**
```
┌─────────────────────────────┐
│ ✕                           │  ← Close button (X), top-left
│                             │
│   Capture a moment          │  ← DM Serif Display, 28px
│                             │
│   [Person selector ▾]      │  ← Dropdown, same as current
│                             │
│   ┌───────────────────────┐ │
│   │                       │ │
│   │  What's on your mind? │ │  ← TextInput, multiline, 4+ lines
│   │                       │ │     DM Sans 16px, placeholder warmGray
│   │                       │ │
│   └───────────────────────┘ │
│                             │
│   [📷 Add photo]  [🎤 Voice]│  ← Icon buttons, secondary style
│                             │     Voice = future, show as disabled
│                             │     with "Coming soon" tooltip
│                             │
│   How does this feel?       │  ← DM Sans SemiBold, 16px
│   [grateful] [connected]    │  ← EmotionChip components (existing)
│   [curious] [joyful] ...    │     Same 10 emotions, same styling
│                             │
│   [    Save to garden    ]  │  ← Primary button, sage gradient
│                             │
└─────────────────────────────┘
```

**Screen 2: Saved confirmation**
```
┌─────────────────────────────┐
│                             │
│   [GardenRevealIllustration]│
│                             │
│   "Saved to your garden"    │  ← DM Serif Display, 24px
│   "with {Name}"             │  ← DM Sans, 16px, warmGray
│                             │
│   [  Back to garden  ]      │  ← Primary button
│                             │
└─────────────────────────────┘
```

Two screens instead of four. The AI description feature (currently placeholder) can be reintroduced later as an optional "Generate description" button on the capture screen — don't include it now, keep it minimal.

**Auto-classification on save:**
```typescript
function classifyCapture(content: string, hasPhoto: boolean): 'meaningful' | 'simple' {
  if (hasPhoto) return 'meaningful';
  if (content.length >= 140) return 'meaningful';
  return 'simple';
}
```

Then call the appropriate growth function:
- `meaningful` → `recordMemoryGrowth` with meaningful=true (+3)
- `simple` → `recordMemoryGrowth` with meaningful=false (+2)

#### Remove the Reflect bottom sheet from Person Profile

**Modify: `app/person/[id].tsx`**

The Reflect button on the Person Profile currently opens a bottom sheet for logging an Interaction with type, emotion, and note. Replace this:

- Remove the "Reflect" button
- Replace with a "Capture a moment" button that navigates to `/memory/add?personId={id}` (pre-selects the person in the capture flow)
- Keep the Quick Action Bar as-is — those icon buttons (Message, Call, In Person, etc.) should navigate to the Reach-Out flow: `/reach-out/[id]`

This means the Person Profile now has two pathways:
1. Quick Action Bar → Reach-Out flow → Post-Reach-Out Check-In (logs interaction + optional reaction)
2. Capture button → Unified Capture flow (saves memory + growth points)

Both feed the intelligence layer. Neither requires the user to understand the Memory vs Reflection distinction.

---

### 1.4 Contact Import with Birthday Extraction

**What:** Wire the existing contacts import UI (noted as pending in PRD Section 5.4) to actually import contacts, specifically extracting birthdays for the intelligence layer.

**Why:** Birthdays are the highest-converting contextual signal. They're unambiguous, time-bound, and socially expected. This gives the suggestion engine its first real data without requiring manual input.

#### Data model addition

Add `birthday` to the Person type:
```typescript
interface Person {
  id: string;
  name: string;
  photo_url?: string;
  relationship_type: RelationshipType;
  birthday?: string; // ISO date string, e.g. "1990-03-15" — year optional
  created_at: string;
}
```

Also add to mock data in `src/data/mock.ts` — give 2-3 mock people birthdays for testing.

#### Implementation

**Modify: `app/(tabs)/add.tsx`** — Step 1 (Entry)

The "contacts import" option already exists in the UI but isn't wired. Wire it:

```typescript
// Lazy require pattern (existing architectural rule)
const importContacts = async () => {
  const Contacts = require('expo-contacts');
  const { status } = await Contacts.requestPermissionsAsync();
  if (status !== 'granted') return;
  
  const { data } = await Contacts.getContactsAsync({
    fields: [
      Contacts.Fields.Name,
      Contacts.Fields.Birthday,
      Contacts.Fields.Image,
    ],
  });
  
  // Present contact list for selection (multi-select)
  // On selection, create Person records with name, photo, and birthday
};
```

**New screen within add flow: Contact Selection**

```
┌─────────────────────────────┐
│ ← Back        Import        │
│                             │
│ Choose people to plant      │  ← DM Serif Display, 24px
│ in your garden              │
│                             │
│ [🔍 Search contacts]       │  ← TextInput filter
│                             │
│ ☐ Alex Chen      Mar 15    │  ← Contact row with birthday if available
│ ☐ Jamie Park     —         │  ← No birthday = dash
│ ☑ Morgan Lee     Jul 22    │  ← Selected state: sage checkbox
│ ☑ Sam Torres     Dec 3     │
│ ...                         │
│                             │
│ [  Plant 2 seeds  ]        │  ← Primary button, count updates
│                             │
└─────────────────────────────┘
```

On import:
- Create Person records for each selected contact
- Extract birthday from `contact.birthday` (expo-contacts returns `{ day, month, year }`)
- Store as ISO string in the Person record
- Navigate to the celebration screen (existing Step 6 in add flow), adjusted for plural: "Planted in your garden!"
- Each imported person starts at Seed stage with 0 growth points

**Files to modify:**
- `app/(tabs)/add.tsx` — Wire contact import, add contact selection step
- `src/hooks/usePersons.ts` — Accept birthday in createPerson
- `src/data/mock.ts` — Add birthday field to mock people

---

## TIER 2 — Build Alongside Backend Integration

These features build on Tier 1 and form the intelligence layer.

---

### 2.1 Suggestion Engine

**What:** A module that generates contextual, data-driven suggestions for the home screen and Garden Walk. Replaces the current static suggestion cards.

**Why:** Static suggestions are the same every time. Data-driven suggestions make the app feel alive and personally relevant — this is where the app earns its place on someone's phone.

#### New file: `src/lib/suggestionEngine.ts`

```typescript
/**
 * Suggestion Engine
 * 
 * Generates ranked suggestions based on available data.
 * Each suggestion has a type, a person, a reason, and a priority score.
 * 
 * Suggestion types:
 * - birthday_upcoming: Person has a birthday within the next 7 days
 * - memory_resurface: A meaningful memory from 30+ days ago worth revisiting
 * - drift_reconnect: Person with high growth but low vitality (drifting)
 * - post_event_capture: Calendar shows recent event with this person (Tier 2)
 * - general_reach_out: Gentle suggestion based on vitality ranking
 * 
 * Priority scoring:
 * - birthday_upcoming (within 3 days): 100
 * - birthday_upcoming (within 7 days): 80
 * - post_event_capture: 70
 * - drift_reconnect (vitality dormant, growth >= Mature): 60
 * - memory_resurface: 40
 * - general_reach_out: 20
 * 
 * The engine returns the top N suggestions, deduped by person
 * (max one suggestion per person).
 */

export interface Suggestion {
  id: string;
  type: SuggestionType;
  personId: string;
  personName: string;
  reason: string; // User-facing copy, must follow tone guidelines
  priority: number;
  metadata?: {
    memoryId?: string; // For memory_resurface
    birthdayDate?: string; // For birthday_upcoming
    calendarEventName?: string; // For post_event_capture
  };
}

export type SuggestionType = 
  | 'birthday_upcoming'
  | 'memory_resurface'
  | 'drift_reconnect'
  | 'post_event_capture'
  | 'general_reach_out';
```

**Suggestion copy templates (must follow tone guidelines):**

| Type | Copy template |
|---|---|
| birthday_upcoming | "{Name}'s birthday is {in X days / today / tomorrow}. A perfect moment to reach out." |
| memory_resurface | "A moment worth revisiting with {Name}: \"{memory preview}\"" |
| drift_reconnect | "Your garden with {Name} is well-rooted. You might enjoy tending to it." |
| post_event_capture | "Looks like you saw {Name} recently — anything worth remembering?" |
| general_reach_out | "You might enjoy reaching out to {Name}." |

**CRITICAL COPY RULES for suggestions:**
- NEVER say "You haven't talked to {Name} in X days"
- NEVER say "Don't forget" or "Remember to"
- NEVER use the word "remind" or "reminder"
- ALWAYS frame as invitation: "You might enjoy...", "A moment worth...", "A perfect time to..."
- Birthday suggestions can be slightly more direct because birthdays are socially expected

#### New file: `src/hooks/useSuggestions.ts`

Hook that calls the suggestion engine and returns ranked suggestions:
```typescript
export function useSuggestions(limit: number = 3): Suggestion[] {
  // Pull all persons, memories, interactions from existing hooks
  // Compute vitality for each person
  // Generate and rank suggestions
  // Return top N, deduped by person
}
```

#### Modify: `app/(tabs)/index.tsx` — Home screen

Replace the current static "Gentle Suggestions" section (Section 4 in the Home screen spec) with dynamic suggestions from `useSuggestions(3)`.

Each suggestion card:
```
┌─────────────────────────────┐
│  🌱  {Suggestion copy}      │  ← Icon varies by type
│      ───────                │     birthday: 🎂, resurface: 💭
│      {Action button}        │     drift: 🌿, general: 💌
└─────────────────────────────┘
```

- Card: bg white, border border (#E5E0D8), rounded-xl, shadow soft
- Tap on birthday suggestion → navigates to Reach-Out flow for that person
- Tap on memory resurface → navigates to Person Profile, scrolled to that memory
- Tap on drift/general → navigates to Person Profile

Keep the FadeInUp stagger animation for suggestion cards.

---

### 2.2 Garden Walk

**What:** A weekly curated experience — the single bundled notification that opens to a dedicated screen showing a resurfaced memory, 2-3 suggested reach-outs, and an optional capture prompt.

**Why:** This is the primary engagement mechanism. One meaningful weekly moment instead of scattered guilt-driven pings.

#### Onboarding addition

**Modify: `app/(tabs)/add.tsx`** or the onboarding flow

During first-time setup (after orientation or during onboarding), add a step:

```
┌─────────────────────────────┐
│                             │
│   [WateringIllustration]    │
│                             │
│   When would you like to    │  ← DM Serif Display, 24px
│   walk through your garden? │
│                             │
│   [Day picker]              │  ← Horizontal scroll: S M T W T F S
│                             │     Default: Sunday highlighted in sage
│                             │
│   [Time picker]             │  ← Standard time picker
│                             │     Default: 10:00 AM
│                             │
│   [  Sounds lovely  ]      │  ← Primary button
│                             │
│   "You can change this      │  ← Caption, warmGray, DM Sans 13px
│    anytime in Settings"     │
│                             │
└─────────────────────────────┘
```

Store the chosen day and time in module-level state (and later in Supabase user preferences). Also add a "Garden Walk" row in notification settings (`app/settings/notifications.tsx`).

#### New file: `app/garden-walk.tsx`

The Garden Walk screen:

```
┌─────────────────────────────┐
│ ✕                           │
│                             │
│   Your garden this week     │  ← DM Serif Display, 28px, nearBlack
│   ─────────────             │
│                             │
│   ┌───────────────────────┐ │
│   │  💭 A Moment Worth    │ │  ← Memory resurface card
│   │     Revisiting        │ │     bg: sagePale, border: sage
│   │                       │ │
│   │  "That camping trip   │ │  ← Memory preview text
│   │   with Marcus last    │ │     DM Sans 16px, nearBlack
│   │   summer"             │ │
│   │                       │ │
│   │  [View memory →]      │ │  ← Text button, sage
│   └───────────────────────┘ │
│                             │
│   Plants to tend            │  ← DM Sans SemiBold, 16px
│                             │
│   ┌───────────────────────┐ │
│   │ [Avatar] Jamie Park   │ │  ← Person row with vitality plant
│   │ 🎂 Birthday Thursday  │ │     Context line varies by suggestion type
│   │         [Reach out →] │ │
│   ├───────────────────────┤ │
│   │ [Avatar] Alex Chen    │ │
│   │ 🌿 Well-rooted        │ │
│   │         [Reach out →] │ │
│   ├───────────────────────┤ │
│   │ [Avatar] Morgan Lee   │ │
│   │ 💌 Might enjoy a note │ │
│   │         [Reach out →] │ │
│   └───────────────────────┘ │
│                             │
│   ┌───────────────────────┐ │
│   │  Anything on your     │ │  ← Optional capture prompt
│   │  mind today?          │ │     bg: goldPale, border: gold
│   │                       │ │
│   │  [Capture a moment →] │ │  ← Navigates to /memory/add
│   └───────────────────────┘ │
│                             │
│   "Enjoy your week" 🌿      │  ← Closing text, centered
│                             │     DM Serif Display italic, 16px, sage
│                             │
└─────────────────────────────┘
```

**Data flow:**
- Memory resurface: from `useSuggestions` filtered to type `memory_resurface`, pick the top one
- Plants to tend: from `useSuggestions` filtered to non-resurface types, top 3, deduped by person
- If no suggestions are available (new user, very few connections), show:
  ```
  "Your garden is just getting started.
   Capture a moment to help it grow."
   [Capture a moment →]
  ```

**Navigation:**
- "Reach out" buttons → Reach-Out flow for that person
- "View memory" → Person Profile scrolled to memory
- "Capture a moment" → Unified capture flow
- Close (✕) → Home tab

#### Push notification (scaffolded, not functional until backend)

When push notifications are connected:
- Schedule a local notification at the user's chosen day/time
- Notification copy: "Your garden is ready for a visit 🌿" (NEVER "You have X plants to tend" or "Don't forget to check in")
- Tap opens the Garden Walk screen

For now, add a "Preview Garden Walk" button in the notification demo screen (`app/notifications.tsx`) that navigates to the Garden Walk screen with current data.

---

### 2.3 Calendar Proximity Detection

**What:** With user permission, detect when the user had recent calendar events that match contacts in their garden, and generate post-event capture prompts.

**Why:** Post-event is the most natural capture moment — the memory is warm. This generates suggestions without any manual input.

#### New file: `src/lib/calendarEngine.ts`

```typescript
/**
 * Calendar Engine
 * 
 * Scans recent calendar events (past 48 hours) and matches attendee
 * names or event titles against persons in the user's garden.
 * 
 * Matching strategy:
 * - Compare event title and attendee names against Person.name
 * - Case-insensitive, first-name match is sufficient
 * - Only consider events that ended in the past 48 hours
 * - Ignore recurring daily events (standup, etc.) via heuristic:
 *   skip events that occur 5+ times in the past 14 days
 * 
 * Returns matched events as post_event_capture suggestions
 * for the suggestion engine.
 */

import * as Calendar from 'expo-calendar';

export interface CalendarMatch {
  personId: string;
  personName: string;
  eventTitle: string;
  eventDate: string;
}

export async function getRecentCalendarMatches(
  persons: Person[]
): Promise<CalendarMatch[]> {
  // Request permission
  // Get events from past 48 hours
  // Match against person names
  // Filter out recurring daily events
  // Return matches
}
```

**Permission flow:**
- During onboarding (or in Settings), show a calendar permission prompt:
  ```
  "Kinship can notice when you've spent time    
   with someone, so you can capture the moment 
   while it's fresh."
   
   [Allow calendar access]    [Not now]
  ```
- Store permission status in module-level state / SecureStore
- If denied, the suggestion engine simply skips `post_event_capture` type — no nagging, no re-prompts

**Integration with suggestion engine:**
- Add `post_event_capture` generation to `src/lib/suggestionEngine.ts`
- Calendar matches feed in as high-priority suggestions (priority 70)
- Copy: "Looks like you saw {Name} recently — anything worth remembering?"
- Tapping the suggestion navigates to `/memory/add?personId={id}`

#### Dependencies

```bash
npx expo install expo-calendar
```

Add to `app.json` plugins if needed. Follow the lazy require pattern from the existing architectural rules.

---

### 2.4 Notification Framework

**What:** Codify the notification rules into the codebase so they're enforced structurally, not just by convention.

#### New file: `src/lib/notificationEngine.ts`

```typescript
/**
 * Notification Engine
 * 
 * RULES (inviolable):
 * 1. No notification may imply the user is falling short
 * 2. Default cadence: one Garden Walk per week at user-chosen time
 * 3. All other notifications are memory-based or context-based, never timer-based
 * 
 * CADENCE LIMITS:
 * - Garden Walk: 1x per week (scheduled)
 * - Memory Resurface: max 2 per month (triggered by meaningful memory anniversary)
 * - Contextual Nudge: as relevant, max 1 per day (birthday, calendar event)
 * - Post-Reach-Out Check-In: handled in-app, not a push notification
 * 
 * BANNED PATTERNS:
 * - Timer-based: "It's been X days since..."
 * - Guilt-based: "Your plant is wilting..."
 * - Urgency-based: "Don't forget to..."
 * - Per-friend reminders: "Time to check in with..."
 * 
 * COPY VALIDATION:
 * Every notification body must pass these checks:
 * - Does not contain "haven't", "forgot", "remember to", "don't forget"
 * - Does not contain any number followed by "days" or "weeks"
 * - Does not contain "remind" in any form
 * - Does not reference wilting, dying, or neglect
 */

export interface KinshipNotification {
  id: string;
  type: 'garden_walk' | 'memory_resurface' | 'contextual_nudge';
  title: string;
  body: string;
  personId?: string;
  memoryId?: string;
  scheduledFor: Date;
}

export function validateNotificationCopy(body: string): boolean {
  const banned = [
    /haven'?t/i,
    /forgot/i,
    /remember to/i,
    /don'?t forget/i,
    /remind/i,
    /\d+\s*(days?|weeks?)/i,
    /wilt/i,
    /dying/i,
    /neglect/i,
    /overdue/i,
  ];
  return !banned.some(pattern => pattern.test(body));
}

// Notification copy templates (all pre-validated)
export const NOTIFICATION_COPY = {
  garden_walk: {
    title: "Your garden is ready",
    body: "A few moments from your garden this week 🌿",
  },
  memory_resurface: (personName: string, preview: string) => ({
    title: "A moment worth revisiting",
    body: `With ${personName}: "${preview.slice(0, 60)}..."`,
  }),
  birthday: (personName: string, when: 'today' | 'tomorrow' | string) => ({
    title: `${personName}'s birthday`,
    body: when === 'today' 
      ? `Today is ${personName}'s birthday 🎂` 
      : when === 'tomorrow'
        ? `${personName}'s birthday is tomorrow 🎂`
        : `${personName}'s birthday is coming up this week 🎂`,
  }),
} as const;
```

**Modify: `app/settings/notifications.tsx`**

Update the 4-phase notification settings to include:
- Garden Walk: toggle on/off, day picker, time picker
- Memory Resurface: toggle on/off
- Birthday Notifications: toggle on/off
- "Kinship will never send you more than a few gentle notifications per week."

---

## TIER 3 — Post-Launch Iteration

These are lower-priority enhancements that build on the intelligence layer.

---

### 3.1 Contextual Nudge Extraction

**What:** Scan capture text for references to future events and resurface them at the appropriate time.

#### New file: `src/lib/contextExtractor.ts`

```typescript
/**
 * Context Extractor
 * 
 * Lightweight keyword + date heuristic that scans capture text for
 * references to upcoming events.
 * 
 * V1 detects:
 * - Explicit dates: "March 15", "next Tuesday", "in two weeks"
 * - Event keywords: "birthday", "wedding", "moving", "starting",
 *   "surgery", "interview", "graduation", "trip", "marathon",
 *   "concert", "exam", "due date"
 * 
 * When a match is found:
 * - Store as a ContextualNudge record linked to the person
 * - Schedule a suggestion for the extracted date (or 1-2 days before)
 * - If no date extracted, schedule for 2-4 weeks from capture date
 *   (assumption: person mentioned a near-future event)
 * 
 * V2 (future): Replace keyword matching with lightweight NLP
 */

export interface ContextualNudge {
  id: string;
  personId: string;
  sourceMemoryId: string;
  keyword: string;
  extractedDate?: string; // ISO date if detected
  fallbackDate: string; // 2-4 weeks from capture if no date detected
  surfaced: boolean; // Has this nudge been shown?
}

export function extractContext(text: string): {
  keyword: string;
  dateHint?: string;
} | null {
  // Keyword detection
  // Date parsing (simple regex for "March 15", "next week", etc.)
  // Return match or null
}
```

**Data model addition:**
```typescript
// Add to Person or as a separate collection
interface Person {
  // ... existing fields
  contextual_nudges?: ContextualNudge[];
}
```

**Integration:** Run `extractContext` on every capture save. If a match is found, create a ContextualNudge record. The suggestion engine checks for nudges whose date is approaching.

---

### 3.2 Relationship Texture Labels

**What:** After a person accumulates 5+ captures, the system infers a texture label like "Adventure buddy" or "Deep talks" and displays it subtly on the person profile.

#### New file: `src/lib/textureEngine.ts`

```typescript
/**
 * Texture Engine
 * 
 * Infers a relationship texture label from accumulated captures.
 * Only activates after 5+ captures for a person.
 * 
 * V1 approach: keyword frequency in capture text + emotion distribution
 * 
 * Texture labels:
 * - "Adventure buddy" — captures mention outdoor/travel/activity words
 * - "Deep talks" — captures are long (avg 200+ chars) with emotions: connected, grateful, peaceful
 * - "Always laughing" — captures mention funny/hilarious/laugh + emotion: joyful
 * - "Creative spark" — captures mention art/music/writing/project + emotion: inspired
 * - "Rock solid" — high capture frequency + emotions: grateful, connected, loved
 * - "Old soul" — captures mention nostalgia/remember/childhood + emotion: nostalgic
 * - "Growth partner" — captures mention goals/learning/challenge + emotion: proud, hopeful
 * 
 * Labels are:
 * - Displayed as a subtle badge on the person profile below their name
 * - Never shown to the other person
 * - Dismissable or editable by the user
 * - Only ONE label per person (the strongest match)
 */

export function inferTexture(
  captures: { content: string; emotion?: string }[]
): { label: string; confidence: number } | null {
  if (captures.length < 5) return null;
  // Keyword frequency analysis
  // Emotion distribution analysis
  // Return highest confidence label, or null if confidence < threshold
}
```

**Visual placement on Person Profile:**

```
┌─────────────────────────────┐
│     [Avatar]                │
│     Jamie Park              │  ← Name, DM Serif Display, 24px
│     friend                  │  ← Relationship type badge
│     ✨ Adventure buddy      │  ← Texture label, DM Sans 13px,
│                             │     sage color, with dismiss (✕)
│     [Plant illustration]    │
│     ...                     │
```

- Text: DM Sans, 13px, sage (#7A9E7E)
- Icon: contextual emoji (🏔️ adventure, 💭 deep talks, 😂 laughing, 🎨 creative, 🪨 rock solid, 🕰️ old soul, 🌱 growth)
- Tappable: shows a small tooltip "Based on your shared moments. Tap to change or dismiss."
- Dismiss: removes label, won't regenerate for 30 days

---

### 3.3 Voice Capture (Future)

**What:** A voice-first capture option that records a short audio note, transcribes it, and auto-tags it to a person.

This is noted in the unified capture flow as a disabled button with "Coming soon." When implemented:

- Tap 🎤 to start recording (max 30 seconds)
- On stop, transcribe via Whisper API or similar
- Auto-detect person name in transcript, or fall back to person selector
- Transcription becomes the capture text
- Auto-classify as meaningful (voice notes tend to be rich) → +3 growth

Dependencies: `expo-av` for recording, transcription API for backend. Scaffold the UI now, implement when backend is connected.

---

## DATA MODEL SUMMARY

All additions to the existing data model:

```typescript
// Modified: Person
interface Person {
  id: string;
  name: string;
  photo_url?: string;
  relationship_type: RelationshipType;
  birthday?: string;          // NEW — ISO date string
  interests?: string[];
  created_at: string;
}

// Modified: Interaction types
type InteractionType = 
  | 'message' | 'call' | 'video' | 'in_person' 
  | 'gift' | 'letter' | 'social_media' 
  | 'check_in'                // NEW — post-reach-out reaction
  | 'other';

// NEW: Contextual Nudge (Tier 3)
interface ContextualNudge {
  id: string;
  personId: string;
  sourceMemoryId: string;
  keyword: string;
  extractedDate?: string;
  fallbackDate: string;
  surfaced: boolean;
}

// NEW: Garden Walk Preferences
interface GardenWalkPreferences {
  enabled: boolean;
  dayOfWeek: number;         // 0=Sun, 1=Mon, ..., 6=Sat
  timeOfDay: string;         // "10:00" (24hr format)
}

// NEW: Suggestion (replaces static suggestions)
interface Suggestion {
  id: string;
  type: SuggestionType;
  personId: string;
  personName: string;
  reason: string;
  priority: number;
  metadata?: {
    memoryId?: string;
    birthdayDate?: string;
    calendarEventName?: string;
    nudgeId?: string;
  };
}
```

---

## NEW FILES SUMMARY

| File | Tier | Purpose |
|---|---|---|
| `app/reach-out/check-in/[id].tsx` | 1 | Post-reach-out check-in screen |
| `src/lib/vitalityEngine.ts` | 1 | Vitality score calculation |
| `src/hooks/useVitality.ts` | 1 | Vitality hook for components |
| `src/components/VitalPlant.tsx` | 1 | Plant wrapper with vitality visual modifiers |
| `src/lib/suggestionEngine.ts` | 2 | Data-driven suggestion generation |
| `src/hooks/useSuggestions.ts` | 2 | Suggestion hook for screens |
| `app/garden-walk.tsx` | 2 | Garden Walk dedicated screen |
| `src/lib/calendarEngine.ts` | 2 | Calendar event matching |
| `src/lib/notificationEngine.ts` | 2 | Notification rules, copy, scheduling |
| `src/lib/contextExtractor.ts` | 3 | Keyword/date extraction from captures |
| `src/lib/textureEngine.ts` | 3 | Relationship texture inference |

## MODIFIED FILES SUMMARY

| File | Tier | Changes |
|---|---|---|
| `app/reach-out/[id].tsx` | 1 | Navigate to check-in after save |
| `app/(tabs)/index.tsx` | 1+2 | Vitality in plant carousel; dynamic suggestions |
| `app/(tabs)/people.tsx` | 1 | Vitality in canopy cards + person rows; vitality-aware sort |
| `app/person/[id].tsx` | 1+3 | Vitality on plant; replace Reflect with Capture button; texture label |
| `app/(tabs)/_layout.tsx` | 1 | Tend FAB: 2 actions instead of 3 |
| `app/memory/add.tsx` | 1 | Unified capture flow (2 screens, auto-classify) |
| `app/(tabs)/add.tsx` | 1+2 | Wire contact import with birthdays; Garden Walk onboarding step |
| `src/hooks/usePersons.ts` | 1 | Accept birthday field |
| `src/hooks/useInteractions.ts` | 1 | Handle check_in type |
| `src/data/mock.ts` | 1 | Add birthdays to mock people |
| `src/lib/growthEngine.ts` | 1 | Ensure check_in interactions award +1 |
| `app/settings/notifications.tsx` | 2 | Garden Walk settings, cadence controls |
| `app/notifications.tsx` | 2 | "Preview Garden Walk" button |

---

## DESIGN CONSISTENCY CHECKLIST

Every new screen and component must use:

- [ ] Background: cream (#FDF7ED)
- [ ] Primary actions: sage (#7A9E7E) gradient or solid
- [ ] Dark accents / pressed states: moss (#4A7055)
- [ ] Card backgrounds: white (#FFFFFF) with border (#E5E0D8) and shadow soft
- [ ] Headings: DM Serif Display
- [ ] Body / labels / UI: DM Sans
- [ ] Emotion chips: existing EmotionChip component (10 emotions, same styling)
- [ ] Animations: reanimated 3.16, calm/organic, normal speed (250ms) for transitions
- [ ] Illustrations: use existing 14 SVGs — do not create new ones without design review
- [ ] Icons: lucide-react-native
- [ ] Plant sway: ease-in-out, ±3deg for vibrant, reduced for lower vitality
- [ ] Toast: existing GrowthToast component for stage transitions
- [ ] Button variants: existing Button component (primary, secondary, outline, ghost)
- [ ] Spacing: follow existing scale (sm=8, md=12, lg=16, xl=24)
- [ ] Border radii: follow existing scale (sm=8, md=12, lg=16)

---

## IMPLEMENTATION ORDER

Execute in this exact sequence. Each step should be a complete, testable unit.

1. **Add `birthday` field to Person type and mock data** (30 min)
2. **Add `check_in` to InteractionType** (15 min)
3. **Build `vitalityEngine.ts`** (1 hr)
4. **Build `useVitality.ts` hook** (30 min)
5. **Build `VitalPlant.tsx` wrapper component** (2 hr)
6. **Integrate VitalPlant into Home carousel, Garden canopy, Person profile** (2 hr)
7. **Build post-reach-out check-in screen** (2 hr)
8. **Wire check-in into reach-out flow** (30 min)
9. **Redesign Tend FAB: 2 actions** (1 hr)
10. **Redesign unified capture flow: 2 screens** (3 hr)
11. **Replace Reflect sheet on Person Profile with Capture button** (1 hr)
12. **Wire contact import with birthday extraction** (3 hr)
13. **Build `suggestionEngine.ts`** (3 hr)
14. **Build `useSuggestions.ts` hook** (1 hr)
15. **Replace static Home suggestions with dynamic suggestions** (2 hr)
16. **Build Garden Walk screen** (3 hr)
17. **Add Garden Walk onboarding step** (1 hr)
18. **Build `calendarEngine.ts`** (2 hr)
19. **Integrate calendar matches into suggestion engine** (1 hr)
20. **Build `notificationEngine.ts` with copy validation** (2 hr)
21. **Update notification settings screen** (1 hr)
22. **Build `contextExtractor.ts`** (Tier 3) (2 hr)
23. **Build `textureEngine.ts`** (Tier 3) (2 hr)
24. **Add texture labels to Person Profile** (Tier 3) (1 hr)
