# Integrations

## Database

### Supabase PostgreSQL
- **Service:** Cloud-hosted PostgreSQL via Supabase
- **URL:** `https://kddpxiiyxgvjrtpdkvio.supabase.co`
- **API Key:** `sb_publishable_pnsdH0l67OFYoEkIiL5qNQ_Ly2qee30` (Anon key, EXPO_PUBLIC_SUPABASE_ANON_KEY)
- **Environment Variables:**
  - `EXPO_PUBLIC_SUPABASE_URL` — Database URL (public)
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY` — Anon key (public)
- **Configuration File:** `.env`
- **Client Library:** `@supabase/supabase-js` 2.97.0
- **Client Instance:** `src/lib/supabase.ts` — Singleton client with encrypted session storage

### Database Schema
**Location:** `supabase/migrations/001_initial_schema.sql`

#### Tables
| Table | Description | Key Fields |
|-------|-------------|-----------|
| `persons` | People in user's garden | `id`, `user_id`, `name`, `photo_url`, `relationship_type`, `birthday`, `created_at` |
| `memories` | Captured memories with people | `id`, `user_id`, `person_id`, `content`, `emotion`, `created_at` |
| `interactions` | Touchpoints & reflections | `id`, `user_id`, `person_id`, `type`, `note`, `emotion`, `created_at` |
| `auth.users` (Supabase) | User accounts managed by Supabase Auth | `id`, `email`, `created_at` |
| `suggestions` | Not yet persisted (mock only) | — |

#### Row-Level Security (RLS)
All tables enforce `auth.uid() = user_id` policies:
- `SELECT` — Users can view only their own records
- `INSERT` — Users can create only with their own `user_id`
- `UPDATE` — Users can update only their own records
- `DELETE` — Users can delete only their own records

#### Indexes
- `idx_persons_user_id`, `idx_persons_created_at`
- `idx_memories_user_id`, `idx_memories_person_id`, `idx_memories_created_at`
- `idx_interactions_user_id`, `idx_interactions_person_id`, `idx_interactions_created_at`

### Service Layer
- **Location:** `src/services/`
- **Files:**
  - `personService.ts` — `getPersons()`, `getPersonById()`, `createPerson()`, `updatePerson()`, `deletePerson()`
  - `memoryService.ts` — `getMemories()`, `getMemoriesForPerson()`, `getRecentMemories()`, `createMemory()`
  - `interactionService.ts` — `getInteractionsForPerson()`, `getLatestInteraction()`, `getAllInteractions()`, `createInteraction()`

### Fallback Mode
When `EXPO_PUBLIC_SUPABASE_URL` or `EXPO_PUBLIC_SUPABASE_ANON_KEY` are missing or incomplete:
- `isSupabaseConfigured` flag set to `false` in `src/lib/supabase.ts`
- App falls back to mock data via module-level arrays in hooks
- `getAuthUserId()` throws error if services are called in mock mode (prevents accidental data loss)

### Session Persistence
- **Storage:** Expo Secure Store (`expo-secure-store`)
- **Adapter:** `ExpoSecureStoreAdapter` in `src/lib/supabase.ts`
- **Behavior:**
  - Sessions encrypted at rest
  - Auto-refresh enabled
  - Detects session URL disabled (React Native requirement)
  - Session restored on app cold start

### Type Generation
- **Location:** `src/types/database.ts`
- **Row Types:** `User`, `Person`, `Memory`, `Interaction`, `Suggestion`
- **Insert Types:** `*Insert` variants (omit server-generated fields)
- **Update Types:** `*Update` variants (partial updates)
- **Status:** Manually written; to be auto-generated with `supabase gen types typescript` once connected

## Authentication

### Multi-Method Auth (Supabase Auth)
- **Provider:** Supabase Auth (JWT-based)
- **Methods:**
  - Apple Sign-In (native)
  - Google OAuth (via Expo Auth Session)
  - Email/Password

### Apple Sign-In
- **Native Library:** `expo-apple-authentication` 8.0.8
- **Configuration:** Enabled in `app.json` plugin
- **iOS Bundle ID:** `com.kinship.app`
- **Implementation:** `src/providers/AuthProvider.tsx` — `signInWithApple()`
- **Permission:** "Allow Kinship to sign in with Apple ID"

### Google OAuth
- **Session Handler:** `expo-auth-session` 7.0.10
- **Browser:** `expo-web-browser` 15.0.10
- **Flow:** Authorization code flow with Supabase backend
- **Implementation:** `src/providers/AuthProvider.tsx` — `signInWithGoogle()`

### Email/Password Auth
- **Flow:** Supabase email/password signup & login
- **Password Recovery:** `resetPassword(email)` in AuthProvider
- **Verification:** Not yet implemented (TODO)
- **Implementation:** `src/providers/AuthProvider.tsx` — `signInWithEmail()`, `signUpWithEmail()`

### Auth State Management
- **Location:** `src/providers/AuthProvider.tsx`
- **Context:** `AuthContext` with state (`user`, `session`, `isLoading`, `isAuthenticated`)
- **Actions:** `signInWithApple`, `signInWithGoogle`, `signInWithEmail`, `signUpWithEmail`, `signOut`, `resetPassword`
- **Hook:** `useAuth()` to access context anywhere
- **Listener:** Subscribes to `auth.onAuthStateChange` to catch sign-out/refresh events

### Mock Auth
When Supabase is not configured:
- `isAuthenticated` = `true` (always authenticated in dev)
- All auth methods are no-ops
- App goes straight to tabs without login flow
- Preserves dev workflow during mock development

### Password Requirements
Not yet enforced in email signup (TODO: add complexity checks)

## External APIs

### No Direct REST API Integrations
- All data flows through Supabase (no custom REST endpoints)
- Calendar sync is local-only (suggests reach-outs based on device calendar)
- Suggestions are client-side generated (no external suggestion service)

### Potential Future Integrations
- Contact sync APIs (currently uses local device contacts)
- Calendar service webhooks (iCal import)
- Email/SMS notification providers

## Native Modules

### Media & File I/O
| Module | Version | Purpose | Location in Code |
|--------|---------|---------|------------------|
| `expo-image-picker` | 17.0.10 | Photo library & camera access | `app/memory/add.tsx`, `app/(tabs)/add.tsx`, `app/person/[id].tsx` |
| `expo-file-system` | 19.0.21 | File read/write & directory ops | Not yet used (available for data export) |
| `expo-asset` | 12.0.12 | Asset bundling & caching | Expo runtime |
| `expo-sharing` | 14.0.8 | Share dialog (data export) | `app/settings/account.tsx` |

### Device Contacts
| Module | Version | Purpose | Usage |
|--------|---------|---------|-------|
| `expo-contacts` | 15.0.11 | Read device contacts | `app/(tabs)/add.tsx` — Manual "Import from Contacts" button |
| **Loading:** Lazy-loaded with `require()` inside try/catch (avoids native module crash) | — | — | — |
| **Permission:** `android.permission.READ_CONTACTS` (Android) | — | — | — |
| **Prompt:** "Allow Kinship to access your contacts to help you add people to your garden." | — | — | — |

### Device Calendar
| Module | Version | Purpose | Usage |
|--------|---------|---------|-------|
| `expo-calendar` | 15.0.8 | Read device calendar events | `src/lib/calendarEngine.ts` — Suggest reach-outs based on calendar events |
| **Permission:** `android.permission.READ_CALENDAR` (read), `android.permission.WRITE_CALENDAR` (write) | — | — | — |
| **Prompt:** "Allow Kinship to check your calendar so it can gently suggest capturing memories after events with people in your garden." | — | — | — |

### Encryption & Security
| Module | Version | Purpose | Usage |
|--------|---------|---------|-------|
| `expo-secure-store` | 15.0.8 | Encrypted key-value storage | Session persistence (Supabase auth tokens) |
| `expo-crypto` | 15.0.8 | Cryptographic utilities | Not yet used (available for data export hashing) |

### System Access
| Module | Version | Purpose | Usage |
|--------|---------|---------|-------|
| `expo-constants` | 18.0.13 | Runtime config & app info | Accessing manifest data |
| `expo-linking` | 8.0.11 | Deep links & URI schemes | Navigation via `kinship://` scheme |
| `expo-web-browser` | 15.0.10 | Native web browser for OAuth | Google Sign-In flow |
| `expo-status-bar` | 3.0.9 | Status bar customization | Styling status bar appearance |
| `expo-system-ui` | 6.0.9 | System UI theming | UI mode (light/dark) control |
| `expo-updates` | 29.0.16 | Over-the-air app updates | EAS Updates integration |
| `expo-splash-screen` | 31.0.13 | Splash screen management | Hiding splash on app load |

### Device Geolocation
- **Not integrated** — No location-based features planned

## Third-Party Services

### EAS (Expo Application Services)
- **Project ID:** `b2f87ba6-d5b8-4c19-8b76-9fec05b85df4`
- **Services:**
  - **EAS Build** — Managed iOS/Android builds in the cloud
  - **EAS Submit** — Automated app store submission
  - **EAS Updates** — Over-the-air app updates
- **Configuration:** `eas.json`
- **Update URL:** `https://u.expo.dev/b2f87ba6-d5b8-4c19-8b76-9fec05b85df4`

### Figma Design Integration
- **MCP Tool:** Figma Developer MCP
- **Configuration File:** `.mcp.json`
- **Figma File ID:** `508zTd1zisXxbvlSIWDMTv`
- **File Name:** "KinshipGarden Mobile App Design"
- **URL:** https://www.figma.com/make/508zTd1zisXxbvlSIWDMTv/KinshipGarden-Mobile-App-Design
- **API Key:** `<REDACTED — see .mcp.json>`
- **Scopes:** `current_user:read`, `file_comments:read`, `file_content:read`, `file_metadata:read`, `file_versions:read`

### Analytics & Monitoring
- **Not yet integrated** — No analytics, crash reporting, or APM tools configured
- **Available:** Could integrate Sentry, LogRocket, or Amplitude

### Push Notifications
- **Not yet integrated** — `expo-notifications` not in dependencies
- **Future:** Can add `expo-notifications` + Expo Push Notification Service

### Email Service
- **Not yet integrated** — Supabase Auth handles transactional emails
- **Future:** Could use SendGrid, Mailgun, or Supabase email templates

## Summary Table

| Integration | Status | Purpose | Config Location |
|-------------|--------|---------|------------------|
| Supabase PostgreSQL | Active | User data persistence | `.env`, `src/lib/supabase.ts` |
| Supabase Auth | Active | User authentication | `src/providers/AuthProvider.tsx` |
| Apple Sign-In | Active | Native iOS login | `app.json`, `src/providers/AuthProvider.tsx` |
| Google OAuth | Active | Cross-platform login | `src/providers/AuthProvider.tsx` |
| Expo Secure Store | Active | Session encryption | `src/lib/supabase.ts` |
| Expo Image Picker | Active | Photo selection | App screens |
| Expo Contacts | Active | Device contacts import | `app/(tabs)/add.tsx` |
| Expo Calendar | Active | Event-based suggestions | `src/lib/calendarEngine.ts` |
| EAS Build & Deploy | Active | CI/CD & app distribution | `eas.json` |
| Figma (MCP) | Active | Design tooling | `.mcp.json` |
| Analytics | Inactive | Not configured | — |
| Push Notifications | Inactive | `expo-notifications` not installed | — |
| Email Service | Inactive | Supabase handles transactional | — |
