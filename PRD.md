# Kinship — Product Requirements Document

**Version:** 1.0
**Last updated:** 2026-02-25
**Status:** MVP in development (frontend-complete, backend pending)

---

## 1. Product Vision

Kinship is a mobile app that helps people nurture their closest relationships through a calm, living garden metaphor. Every person in your life is a plant in your garden. The more you tend to them — capturing memories, reflecting on interactions, reaching out — the more your garden grows.

**Core philosophy:** This must feel like a calm, living garden — NOT a productivity dashboard.

**What Kinship is NOT:**
- Not a CRM or contact manager
- Not gamified — no points, streaks, or leaderboards shown to the user
- Not guilt-driven — never gap-shaming, never urgency, never "you haven't talked to Sarah in 14 days"
- Not subscription-based — the app is completely free

**What Kinship IS:**
- A gentle space to notice and appreciate the people who matter
- A garden you tend at your own pace
- A memory keeper that resurfaces beautiful moments
- A relationship mirror, not a relationship coach

---

## 2. Target Users

**Primary persona:** Adults (25–45) who value deep relationships but struggle to maintain them amid busy lives. They don't need to be told _who_ to care about — they need a gentle companion that helps them _notice_ the care they already give.

**Key user traits:**
- Already values relationships (not trying to convince them)
- Overwhelmed by existing productivity tools
- Wants warmth, not efficiency
- May already journal, use gratitude apps, or maintain close friendships manually

---

## 3. Platform & Technical Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 52 (React Native) |
| Navigation | Expo Router 4.0 (file-based, Tab + Stack) |
| Language | TypeScript (strict mode) |
| Styling | NativeWind 4.1 (Tailwind CSS for RN) |
| Animations | react-native-reanimated 3.16 |
| Illustrations | react-native-svg (hand-drawn plant SVGs) |
| Backend | Supabase (auth + Postgres) — _not yet connected_ |
| Local storage | expo-secure-store (orientation status, auth tokens) |
| Icons | lucide-react-native |
| Fonts | DM Serif Display (headings), DM Sans (body) |
| Target | iOS and Android (portrait only) |

---

## 4. Information Architecture

### 4.1 Navigation Structure

```
Root Stack
├── Loading Screen (animated plant growth → auto-redirect)
├── Auth Stack
│   ├── Login (Apple / Google / Email)
│   └── Onboarding
├── Tab Navigator
│   ├── Home (today dashboard)
│   ├── Garden (all connections)
│   ├── Tend (center FAB → bottom sheet)
│   │   ├── Capture a moment → Memory Add
│   │   ├── Reach out → Person Select → Reach-Out Flow
│   │   └── Add someone → Add Person Flow
│   └── Profile (avatar, stats, settings)
├── Person Profile [id]
├── Memory Add
├── Reach-Out [id]
├── Select Person (modal)
├── Notifications (9-screen demo)
└── Settings Stack
    ├── Settings Hub
    ├── Account (17 internal screens)
    ├── Notifications (4 phases)
    └── Privacy & Data (5 internal screens)
```

### 4.2 Data Model

```
User
 ├── id, email, created_at
 │
 ├── Person (1:many)
 │   ├── id, name, photo_url, relationship_type, created_at
 │   │
 │   ├── Memory (1:many)
 │   │   └── id, content, emotion, created_at
 │   │
 │   ├── Interaction (1:many)
 │   │   └── id, type, note, emotion, created_at
 │   │
 │   └── Suggestion (1:many)
 │       └── id, type, status, created_at
 │
 └── Growth Points (derived, module-level)
     └── personId → accumulated points (never regresses)
```

**Relationship types:** friend, family, partner, colleague, mentor, acquaintance, neighbor, other

**Emotions (10):** grateful, connected, curious, joyful, nostalgic, proud, peaceful, inspired, hopeful, loved

**Interaction types:** message, call, video, in_person, gift, letter, social_media, other

**Suggestion types:** check_in, memory_resurface, activity_recommendation

---

## 5. Feature Specifications

### 5.1 Home Screen — "Today"

**Purpose:** A warm daily greeting — the first thing the user sees. Shows their living garden at a glance, spotlights a past memory, and offers gentle (never directive) suggestions.

**Sections:**
1. **Time-aware greeting** — "Good morning" / "Good afternoon" / "Good evening" with notification and settings icons
2. **Your Living Garden** — Horizontal carousel of swaying plant illustrations, one per person, sized/styled by growth stage
3. **A Moment Worth Revisiting** — A randomly selected past memory with emotion badge, person name, and date
4. **Gentle Suggestions** — Invitational cards (never prescriptive): "You might enjoy reaching out to..." / "A moment worth capturing..."
5. **Plant a Seed FAB** — Floating action button to add a new person

**Animations:**
- Each plant sways gently (2–3s ease-in-out, ±3deg rotation, staggered start)
- Memory card fades in (600ms, translateY 10→0)
- Suggestion cards use FadeInUp stagger

**First-time experience:** Orientation Steps 1–2 overlay highlights the garden and an individual plant with spotlight cutouts and instructional cards.

---

### 5.2 Garden Tab — "Your Garden"

**Purpose:** The full connection list — a birds-eye view of every relationship, organized by growth maturity.

**Sections:**
1. **Header** — "Your Garden" title + dynamic subtitle ("3 connections growing") + Add button
2. **Garden Canopy** — Horizontal scroll of plant cards with sway animation (visual summary)
3. **All People** — Vertical list sorted by growth points (most mature first), with:
   - Growth stage emoji + plant illustration
   - Person name
   - Relationship type color-coded badge (friend=sage, family=moss, partner=lavender, etc.)
   - Context line ("3 memories shared", "Your first memory together")

**Interactions:** Tap any person card or row to navigate to their profile.

---

### 5.3 Tend — Center FAB & Action Sheet

**Purpose:** The primary action hub. The center tab icon is a sprout that opens a bottom sheet (not a tab screen) with three relationship-nurturing actions.

**Actions:**
| Action | Description | Destination |
|--------|-------------|-------------|
| Capture a moment | Save a memory with optional photo | `/memory/add` |
| Reach out | Log an interaction (call, text, visit) | `/select-person?intent=reach-out` → `/reach-out/[id]` |
| Add someone | Plant a new seed in your garden | `/(tabs)/add` |

**Design:** Primary gradient CTA for "Capture a moment", bordered secondary buttons for others. Gentle, invitational copy.

---

### 5.4 Add Person Flow — "Plant a Seed"

**Purpose:** Onboard new relationships progressively, never demanding, always optional beyond name + relationship type.

**Steps:**
1. **Entry** — Choose manual entry or contacts import (contacts import not yet wired)
2. **Name + Photo** — Text input for name, tappable circular avatar to pick photo via camera/library
3. **Relationship Type** — Select from 8 types (visual cards with icons)
4. **Interests** — Multi-select tag chips (Coffee, Travel, Food, Music, Books, Outdoors, Art, Sports, etc.)
5. **First Memory** — Optional memory with text + photo picker
6. **Celebration** — Seed-growing animation + "Planted in your garden!" confirmation
7. _(Future)_ Contact import flow

**Design principles:**
- Progressive disclosure — fields appear one step at a time
- All fields optional except name and relationship type
- Plant metaphor in all copy ("Plant in your garden", not "Save contact")
- Tappable avatar with camera icon overlay
- Smooth FadeInUp transitions between steps

---

### 5.5 Person Profile

**Purpose:** Deep view into a single relationship — their growth, your shared memories, interaction history, and a way to reflect.

**Sections:**
1. **Header** — Photo/initials avatar, name, relationship badge, growth stage label
2. **Growth Plant** — 6-stage SVG illustration reflecting the relationship's growth
3. **Quick Action Bar** — Icon buttons for common interaction types (Message, Call, In Person, Gift, etc.)
4. **Memory Timeline** — Chronological list of captured memories with emotion badges
5. **Interaction History** — Log of recorded interactions with type icons and optional notes
6. **Reflect Button** — Opens a bottom sheet modal

**Reflect Sheet (modal):**
- Select interaction type (message, call, video, in_person, gift, letter, social_media, other)
- Optional emotion selection (10 emotion chips)
- Optional free-text note
- On save: creates Interaction + awards +1 growth point (with daily cap)
- Toast on stage transition: "A strong bond with Sarah" with stage emoji

**First-time experience:** Orientation Steps 3–4 overlay highlights the quick action bar and the reflect button.

---

### 5.6 Memory Capture

**Purpose:** Save meaningful moments with optional photos and AI-assisted descriptions.

**4-Screen Flow:**
1. **Add Photo** — Photo picker (camera/library), person selector dropdown, title, content textarea, "Generate description" button
2. **AI Loading** — Animated gradient arc spinner + floating sparkles (placeholder — AI not yet connected)
3. **AI Suggestion** — Editable description with "Use this" / "Try again" / "Dismiss" actions
4. **Memory Saved** — GardenRevealIllustration with checkmark, "Back to garden" CTA

**Growth integration:** On save, calls `recordMemoryGrowth` — awards +3 points if "meaningful" (has emotion or content >= 140 chars), else +2 points. Respects daily cap. Shows toast on stage transition.

---

### 5.7 Reach-Out Flow

**Purpose:** Quick touchpoint logging when you interact with someone. Intentionally does NOT award growth points — growth comes from reflection and memory, not from checking a box.

**Flow:**
1. Select interaction type (8 options with icons)
2. Optional note
3. Optional emotion
4. Save → creates Interaction record, navigates back

**Design decision:** Reach-outs create data but don't grow the plant. This prevents the app from feeling like a task checklist. Growth comes from the _meaning_ you bring (memories, reflections), not the frequency of contact.

---

### 5.8 Plant Growth System

**Philosophy:** Growth is a quiet, background signal of deepening connection. The user never sees points, progress bars, or metrics. They simply notice their plants evolving over time.

**Growth is purely additive — it never regresses.** Even if you don't interact for months, the plant stays at its current stage. This prevents any guilt mechanics.

#### Growth Weights

| Event | Points | Condition |
|-------|--------|-----------|
| Meaningful Memory | +3 | Has emotion tag OR content >= 140 characters |
| Simple Memory | +2 | All other memories |
| Reflection | +1 | Interaction saved via Reflect sheet (has note or emotion) |
| Reach-out alone | +0 | Logged interaction without reflection |

#### Daily Cap

Maximum **4 points** per person per calendar day. This prevents gaming and encourages spreading attention across multiple relationships.

#### 6 Growth Stages

| Stage | Points | Label | Plant Illustration |
|-------|--------|-------|-------------------|
| Seed | 0–1 | "Seed" | SingleSproutIllustration (small) |
| Sprout | 2–4 | "Sprouting" | SingleSproutIllustration (medium) |
| Young Plant | 5–9 | "Growing" | SproutSmallIllustration |
| Mature | 10–16 | "Thriving" | SmallGardenIllustration |
| Blooming | 17–26 | "Blooming" | FlourishingGardenIllustration |
| Tree | 27+ | "Established" | GardenRevealIllustration |

#### Stage Transition Feedback

When a plant advances to a new stage, a warm toast slides in from the top:

| New Stage | Toast Message | Emoji |
|-----------|--------------|-------|
| Sprout | "A new leaf for you and {Name}" | 🌿 |
| Young Plant | "Your garden with {Name} is growing" | 🪴 |
| Mature | "A strong bond with {Name}" | 🌳 |
| Blooming | "Blooming beautifully with {Name}" | 🌸 |
| Tree | "Deeply rooted with {Name}" | 🏡 |

Toast animation: slide from top (300ms) → hold (2400ms) → fade out (300ms). Custom-built component with module-level queue — no external toast library.

---

### 5.9 First-Time Orientation

**Purpose:** Gently introduce key features on first launch without a lengthy tutorial. Uses a spotlight overlay that dims the screen and cuts out a glowing rectangle around the highlighted element.

**4 Steps Across 2 Screens:**

| Step | Screen | Highlight | Message |
|------|--------|-----------|---------|
| 1 | Home | Garden carousel | "This is your living garden. Each plant represents someone you care about." |
| 2 | Home | Individual plant | "Tap any plant to see your shared memories and reflect on your connection." |
| 3 | Person Profile | Quick action bar | "Use these to capture how you connected — a call, a visit, a message." |
| 4 | Person Profile | Reflect button | "Reflect on your interactions to help your garden grow." |

**Behavior:** Completes or skips → persisted to SecureStore → never shows again unless "Replay orientation" in Settings.

**Overlay design:** Full-screen cream-tinted scrim with SVG even-odd fill rule to create a rounded-rectangle "spotlight" hole. Floating card with plant icon, headline, body, progress dots, and Continue/Skip buttons.

---

### 5.10 Notification System (Demo)

**Purpose:** Preview notification flows for gentle check-ins and memory resurfacing. Currently a 9-screen demo — not yet connected to push notifications.

**4 Notification Types (paired: lock screen → in-app detail):**

1. **Memory Resurfacing** — A past memory resurfaces → full-bleed memory view
2. **Memory Capture** — Gentle prompt after a real-world moment → save sheet
3. **Identity Reinforcement** — Affirms the kind of person you're becoming → garden reflection
4. **Opportunity Suggestion** — A relational opening (birthday, milestone) → person card

**Plus:** Garden Reflections — an in-app notification archive (default entry point).

**Tone rules:**
- Frame as the memory itself, not the absence ("Remember this moment with Sarah" not "You haven't talked to Sarah")
- Always optional — dismiss without consequence
- Never guilt, never urgency

---

### 5.11 Profile & Settings

**Profile Tab:**
- PlantRing avatar (circular plant illustration border showing gardener level)
- Gardener levels: New → Budding → Growing → Flourishing → Master
- Garden stats: connections planted, memories captured, days tending
- Navigation to Settings, About, Sign Out

**Account Settings (17 internal screens):**
Save Garden, Enter Email, Create Password, Sign In, Forgot Password, Check Inbox, Account Signed In, Log Out, Switch Account, Deactivate, Delete Account (3-step confirmation), Privacy & Data, Export Data, Restore Garden

**Notification Settings (4 phases):**
Overview → Category Detail → Paused (DND) → Permission

**Privacy & Data (5 screens):**
Privacy hub → Export Data → Delete Account (3-step confirmation)

---

### 5.12 Loading Screen

**Purpose:** A delightful 3.2-second plant growth animation that plays on app launch.

**4 Stages:**
1. Seed (0–0.8s) — Small seed illustration
2. Sprout (0.8–1.6s) — Sprout growing
3. Leaves (1.6–2.4s) — Full leaves appearing
4. Rest (2.4–3.2s) — Settled plant with gentle sway

Rotating subtitle texts fade in/out during the animation. Auto-navigates to tabs after 3.4s.

---

## 6. Design System

### 6.1 Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| cream | #FDF7ED | Primary background |
| sage | #7A9E7E | Primary brand, CTAs, healthy plants |
| sagePale | #E8F0E9 | Light sage backgrounds |
| sageLight | #A8C5AB | Subtle sage accents |
| moss | #4A7055 | Dark sage, pressed states |
| gold | #D4A853 | Accent highlights, badges |
| goldLight | #E8D49A | Light gold backgrounds |
| goldPale | #F5EDD6 | Pale gold accents |
| peach | #F4B89E | Decorative, flower colors |
| lavender | #C5B8E8 | Memory accents, partner |
| sky | #B8D4E8 | Water drops, cool accent |
| terracotta | #C97A5E | Plant pots |
| nearBlack | #2C2C2C | Primary text |
| warmGray | #8E8E8E | Secondary text |
| border | #E5E0D8 | Borders, dividers |
| white | #FFFFFF | Card backgrounds |
| error | #DC2626 | Error states |

### 6.2 Typography

| Style | Font | Size | Usage |
|-------|------|------|-------|
| Hero | DM Serif Display | 36px | Onboarding headlines |
| Title | DM Serif Display | 28px | Screen titles |
| Heading | DM Sans SemiBold | 20px | Section headings |
| Body | DM Sans Regular | 16px | Body copy |
| Caption | DM Sans Regular | 13px | Secondary text, timestamps |
| Button | DM Sans SemiBold | 16px | Button labels |
| Chip | DM Sans Medium | 13px | Tag/chip labels |

### 6.3 Spacing Scale

2xs (2px) → xs (4px) → sm (8px) → md (12px) → lg (16px) → lg+ (20px) → xl (24px) → 2xl (32px) → 3xl (40px) → 4xl (48px) → 5xl (64px)

### 6.4 Shadows

| Level | Usage |
|-------|-------|
| none | Flat elements |
| soft | Interactive elements, subtle depth |
| card | Standard card elevation |
| elevated | FABs, modals, bottom sheets |

### 6.5 Border Radii

sm (8px), md (12px), lg (16px), xl (24px), full (9999px)

### 6.6 Animation Timings

| Speed | Duration | Usage |
|-------|----------|-------|
| fast | 150ms | Button press, toggle |
| normal | 250ms | Screen fade, card expand |
| slow | 400ms | Modal, page transitions |

---

## 7. UI Component Library

| Component | Variants | Description |
|-----------|----------|-------------|
| Button | primary, secondary, outline, ghost, destructive × sm/md/lg | Multi-variant with icon, loading, disabled states |
| Card | default, elevated, flat, outline | Flexible padding + shadow container |
| Chip / EmotionChip | 10 emotions × selected/unselected × sm/md/lg | Emotion selection tags |
| Avatar | xs (24px) to 2xl (96px) | Photo or initials fallback, optional online indicator |
| TextInput | — | Styled input with placeholder, error, icon |
| FadeIn | — | NativeWind className animation wrapper |
| Skeleton | — | Loading shimmer placeholder |
| ErrorState | — | Error fallback with retry button |
| EmptyState | — | Empty state with illustration + CTA |
| SectionHeader | — | Title + optional subtitle + action |
| PageIndicator | — | Dot-style progress indicator |
| GrowthToast | — | Module-level toast for stage transitions |

### SVG Illustrations

14 hand-drawn plant illustrations used across growth stages, onboarding, empty states, and celebrations:
SeedIllustration, SproutSmallIllustration, SingleSproutIllustration, SunlightIllustration, PlantGrowthLeavesIllustration, PlantRingIllustration, GardenRevealIllustration, FlourishingGardenIllustration, FadingGardenIllustration, SmallGardenIllustration, IntentionIllustration, WateringIllustration, RestingPlantIllustration, InboxCheckIllustration

---

## 8. Architecture & Patterns

### 8.1 Module-Level Shared State

The app uses module-level Maps, Sets, and arrays (not React context or external state libraries) for state that must be shared across screens. This is the primary cross-screen communication pattern:

- **Mock data persistence:** `locallyCreatedPeople`, `locallyCreatedMemories`, `locallyCreatedInteractions` — module-level arrays in hooks that persist across tab switches (Expo Router keeps tabs mounted)
- **Growth engine:** Module-level Maps for points, daily tracking, recent transitions, with a listener subscription pattern
- **Orientation state:** Module-level step tracking with SecureStore persistence
- **Toast queue:** Module-level queue for sequential toast display

This pattern will be replaced with Supabase real-time subscriptions when the backend is connected.

### 8.2 File-Based Routing

Expo Router's file-based routing with:
- **Tab layout** — 4 tabs (Home, Garden, Tend FAB, Profile) in `app/(tabs)/`
- **Stack layouts** — Settings group, Person profile, Memory add, Reach-out
- **Dynamic routes** — `[id].tsx` for person and reach-out screens
- **Modal** — Select person screen, Tend garden bottom sheet

### 8.3 Data Layer

**Current:** Mock data in `src/data/mock.ts` with module-level persistence in hooks. Each hook (usePersons, useMemories, useInteractions) checks if Supabase is configured — if not, falls back to local mock data.

**Planned:** Supabase services already scaffolded in `src/services/` with full CRUD operations. Switching requires:
1. Configure Supabase URL and anon key
2. Set up database tables matching the schema
3. Set `isSupabaseConfigured = true`

### 8.4 Key Architectural Rules

- **Hooks before early returns** — All React hook calls must be placed before any conditional `return` statements
- **Lazy require for expo-contacts** — Cannot use top-level import due to native module crash
- **`router.canGoBack()` guard** — Always check before calling `router.back()`, fallback to `router.replace()`
- **FadeIn accepts className only** — NativeWind constraint, no `style` prop
- **Stack.Screen registration** — Root layout must register `index` route first or Expo Router falls through

---

## 9. Current State & Implementation Status

### Fully Implemented
- Tab navigation with custom Tend FAB center button
- Home screen with swaying plant carousel, memory spotlight, suggestions
- Garden tab with growth-sorted connections, canopy cards, person rows
- Add Person flow (7 steps, manual entry only)
- Person Profile with timeline, quick actions, reflect sheet
- Memory capture (4-screen flow with placeholder AI)
- Reach-out flow (interaction logging without growth points)
- Plant Growth System (6 stages, weighted points, daily cap, bootstrap, toasts)
- First-time orientation (4-step spotlight overlay)
- Notification system (9-screen demo)
- Settings (Account 17 screens, Notifications 4 phases, Privacy 5 screens)
- Loading screen (4-stage plant animation)
- Auth screen UI (login with Apple/Google/email buttons)
- Complete design system and UI component library
- 14 SVG plant illustrations

### Not Yet Connected / Pending
- **Supabase backend** — Auth, database, real-time subscriptions (services scaffolded, mock data in use)
- **AI memory descriptions** — Placeholder loading animation in place, no AI connected
- **Push notifications** — Demo screens built, no scheduling/delivery
- **Contact import** — UI structure in add flow, expo-contacts not wired
- **Session persistence** — App currently redirects to tabs on launch
- **Export data** — Settings screen built, functionality pending
- **"About Kinship" screen** — Not yet created
- **"Replay orientation" button** — Settings row exists, not wired

---

## 10. Tone & Copy Guidelines

### Always
- Use plant/garden metaphors: "Plant in your garden", "Tend your garden", "Your garden is growing"
- Frame positively: "3 memories shared" not "Only 3 interactions"
- Make everything optional: "You might enjoy..." not "You should..."
- Celebrate gently: "A new leaf for you and Sarah" not "Achievement unlocked!"
- Use warm, organic language: "blooming", "flourishing", "deeply rooted"

### Never
- Gap-shame: "You haven't talked to Sarah in 14 days"
- Create urgency: "Don't forget to..."
- Guilt: "Your plant is wilting because..."
- Gamify visibly: No points, scores, streaks, or leaderboards shown to the user
- Use productivity language: "track", "manage", "optimize", "KPI"

### Example Substitutions

| Instead of... | Use... |
|---------------|--------|
| "Save contact" | "Plant in your garden" |
| "Track interaction" | "Reflect on your connection" |
| "Log activity" | "Capture a moment" |
| "View contacts" | "Visit your garden" |
| "Streak: 7 days!" | _(don't show this at all)_ |
| "Sarah needs attention" | "You might enjoy reaching out to Sarah" |

---

## 11. File Reference

### App Screens
| File | Purpose |
|------|---------|
| `app/_layout.tsx` | Root Stack (fonts, providers, GrowthToastOverlay) |
| `app/index.tsx` | Entry redirect to tabs |
| `app/loading.tsx` | 4-stage plant growth loading animation |
| `app/(tabs)/_layout.tsx` | Tab layout (Home, Garden, Tend FAB, Profile) |
| `app/(tabs)/index.tsx` | Home screen |
| `app/(tabs)/people.tsx` | Garden tab |
| `app/(tabs)/add.tsx` | Add Person flow (7 steps) |
| `app/(tabs)/profile.tsx` | Profile tab |
| `app/person/[id].tsx` | Person profile |
| `app/memory/add.tsx` | Memory capture (4 screens) |
| `app/reach-out/[id].tsx` | Reach-out flow |
| `app/notifications.tsx` | Notification demo (9 screens) |
| `app/settings/account.tsx` | Account settings (17 screens) |
| `app/settings/notifications.tsx` | Notification prefs (4 phases) |
| `app/settings/privacy.tsx` | Privacy & data (5 screens) |

### Core Systems
| File | Purpose |
|------|---------|
| `src/lib/growthEngine.ts` | Growth points, stages, daily cap, bootstrap |
| `src/hooks/useGrowth.ts` | usePersonGrowth, useBootstrapGrowth |
| `src/hooks/useOrientation.ts` | First-time orientation state |
| `src/components/ui/GrowthToast.tsx` | Toast overlay for stage transitions |
| `src/components/OrientationOverlay.tsx` | Spotlight overlay |

### Data & Hooks
| File | Purpose |
|------|---------|
| `src/data/mock.ts` | Mock people, memories, interactions, suggestions |
| `src/hooks/usePersons.ts` | Person CRUD + module-level mock persistence |
| `src/hooks/useMemories.ts` | Memory CRUD + module-level mock persistence |
| `src/hooks/useInteractions.ts` | Interaction CRUD + module-level mock persistence |

### Design
| File | Purpose |
|------|---------|
| `design/tokens.ts` | Colors, typography, spacing, shadows, radii |
| `src/lib/theme.ts` | Semantic theme colors + component themes |
| `src/components/illustrations/index.tsx` | 14 SVG plant illustrations |

### Services (scaffolded for Supabase)
| File | Purpose |
|------|---------|
| `src/services/personService.ts` | Person CRUD via Supabase |
| `src/services/memoryService.ts` | Memory CRUD via Supabase |
| `src/services/interactionService.ts` | Interaction CRUD via Supabase |
