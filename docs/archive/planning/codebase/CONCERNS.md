# Concerns

## Technical Debt

### Type Safety Issues
- **`as any` casts in services**: `/src/services/personService.ts`, `/src/services/memoryService.ts`, and `/src/services/interactionService.ts` all use `as any` casts to work around Supabase's deeply-nested generic types. These bypass TypeScript's type checking and will need to be replaced with proper types from `supabase gen types typescript` once the database is fully configured.
- **Hand-written database types**: `/src/types/database.ts` is manually maintained. Once Supabase is connected, this should be auto-generated from the schema to prevent drift between code and database reality.
- **Calendar engine uses `any`**: `/src/lib/calendarEngine.ts` uses `let calendars: any[]` and `let allRecentEvents: any[]` for calendar API responses (no TypeScript types available from expo-calendar).

### String Handling & Localization
- **Hardcoded English strings throughout**: All UI text is hardcoded in English with no i18n framework (no translation system for multiple languages).
- **Emoji strings as constants**: Emoji are hardcoded directly in source files (e.g., `/src/lib/growthEngine.ts` line 182, `/app/(tabs)/index.tsx` line 90). No centralized emoji/text mapping.
- **Duplicated growth stage labels**: Labels for growth stages appear in both `/src/lib/growthEngine.ts` and `/src/lib/growthStage.ts` legacy adapter (potential for drift).

### Incomplete Features with Fallback Logic
- **Calendar integration is disabled**: `/src/lib/calendarEngine.ts` line 112 explicitly notes "Calendar integration is disabled in Expo Go" with a comment to "Enable when using a dev client build."
- **expo-contacts requires lazy require()**: Cannot use top-level import due to native module crash. Must use lazy `require("expo-contacts")` inside try/catch. This is fragile and platform-dependent.
- **Photo persistence not implemented**: `/src/hooks/usePersonPhoto.ts` comment states "future phase" for AsyncStorage or backend storage of person photos. Currently stores only in memory.

---

## Known Issues

### Authentication & Session Management
- **No session persistence in dev mode**: When Supabase is not configured (`isSupabaseConfigured = false`), the app enters "mock mode" with hardcoded authentication. Users will be logged out on app restart in development.
- **Email enumeration security**: `/src/providers/AuthProvider.tsx` line 213-219 attempts to detect email-already-exists by checking if `!data.session` after sign-up, but this is a Supabase design pattern that may change.
- **OAuth token extraction is manual**: `/src/providers/AuthProvider.tsx` lines 164-182 manually parses OAuth redirect URL fragments to extract access and refresh tokens. This is fragile if the URL format changes.

### Growth System Edge Cases
- **Daily cap behavior unclear on midnight**: `/src/lib/growthEngine.ts` uses `todayKey()` which is timezone-dependent (`new Date()`). No handling for users crossing into new timezone or daylight saving time transitions.
- **Bootstrap growth is idempotent but points never regress**: `/src/lib/growthEngine.ts` line 359 explicitly prevents regression, but historical changes or data corrections will be silently ignored.
- **Reach-out interactions give no growth points**: Design decision documented, but violates user expectation that all engagement should grow the plant. This could frustrate users.

### Navigation & Deep Linking
- **Navigation fallbacks assume specific routes exist**: Various screens call `router.replace("/(tabs)/profile")` or similar without verifying those routes exist. If routing changes, these fallbacks break silently.
- **Manual `canGoBack()` checks scattered**: `/app/settings/account.tsx` and other settings screens manually check `router.canGoBack()` before calling `router.back()`. No centralized navigation safety pattern.
- **Modal + Stack presentation inconsistencies**: Some screens use `presentation: "modal"` while others use `presentation: "card"`. No consistent back button handling or gesture dismissal strategy.

---

## Security Concerns

### Data Exposure
- **Mock data in source code**: `/src/data/mock.ts` contains hardcoded user data (names, relationships, memories) used in development. If this file is accidentally included in a production build, it could expose sample user information.
- **Supabase API key in source**: `/src/lib/supabase.ts` loads `EXPO_PUBLIC_SUPABASE_ANON_KEY` from environment, but if not set, creates client with empty key. The check `!supabaseUrl.includes("your-project")` is a naive heuristic and could fail.

### Auth & Tokens
- **Deprecated `setSession` usage**: `/src/providers/AuthProvider.tsx` line 175 calls `supabase.auth.setSession()` with extracted tokens from OAuth redirect. This pattern may be deprecated in newer Supabase versions.
- **No CSRF protection for OAuth**: Manual token extraction from redirect URL with no CSRF token validation. Vulnerable if redirect URL is intercepted.
- **Nonce used only in Apple auth**: `/src/providers/AuthProvider.tsx` generates a nonce for Apple Sign-In but not for Google OAuth. Inconsistent security practice.

### User Data
- **No input validation**: Memory content, person names, and other user inputs are never validated for length, format, or SQL injection patterns before being sent to Supabase.
- **No rate limiting**: User can rapidly create memories, interactions, and persons with no throttling. Could be abused to spam the database.
- **User ID collision potential in mock mode**: Both services and UI hard-reference `"u1"` for mock data. Multiple users in dev mode would collide and share data.

---

## Performance Concerns

### Render Performance
- **Large component files**: `/app/(tabs)/add.tsx` is 2242 lines, `/app/person/[id].tsx` is very large. No component splitting or code-splitting strategy visible.
- **Unoptimized list rendering**: `/app/(tabs)/people.tsx` renders all persons in a ScrollView without virtualization. Freezes on large contact lists.
- **No memoization of expensive computations**: Growth calculations (`getGrowthInfo`) are called on every render without memoization. Could be slow with many people.

### Data Fetching
- **No pagination**: All `getPersons()`, `getMemories()`, etc. fetch ALL data from Supabase. No cursor-based pagination for large datasets.
- **No caching strategy**: Every screen refetch via `useFocusEffect` causes full network round-trip. No local cache invalidation strategy or stale-while-revalidate pattern.
- **Eager bootstrap on app start**: `/src/hooks/useGrowth.ts` bootstraps growth from all memories and interactions on first render. Blocks UI if dataset is large.

### Bundle Size
- **Expo dependencies not optimized**: Multiple animation libraries (reanimated, linear-gradient, svg) are imported but selectively used. No tree-shaking analysis.
- **Illustrations are not code-split**: All SVG illustrations imported at root level. If app grows to 50+ screens, bundle could balloon.

---

## Fragile Areas

### Module-Level State Management
- **Module-level Maps without cleanup**: `/src/lib/growthEngine.ts` maintains `_growthPoints`, `_dailyPoints`, `_recentTransitions` at module level. No way to reset state for testing or switching users.
- **Listener pattern without unsubscribe guarantee**: `/src/lib/growthEngine.ts` `subscribeToGrowth()` returns unsubscribe function, but no enforcement that callers actually unsubscribe. Memory leaks possible.
- **Shared state across auth boundaries**: In mock mode, multiple conceptual "users" share the same module-level data. No isolation mechanism.

### Date & Time Handling
- **Timezone assumptions**: `/src/lib/growthEngine.ts` `todayKey()` and `/src/lib/calendarEngine.ts` use local `new Date()`. No UTC normalization. Could cause bugs when users travel or DST changes.
- **No server-side date enforcement**: Clients can spoof `created_at` timestamps. Supabase should enforce server-side defaults.
- **Relative date formatting without timezone**: `/src/lib/formatters.ts` `formatRelativeDate()` likely doesn't account for user timezone.

### Contact Import
- **Lazy require for expo-contacts**: `/app/(tabs)/add.tsx` uses try/catch with lazy require for contacts. If module fails to load, entire contact import flow breaks silently.
- **No contact permission caching**: Repeated calls to contact picker request permission repeatedly. No caching of permission status.
- **Contact data model mismatch**: `/app/(tabs)/add.tsx` defines local `ContactEntry` interface. No guarantee it matches actual contact schema from device.

### Animation Cleanup
- **Shared value cleanup not guaranteed**: Many animated components use `useSharedValue()` without explicit cleanup. Reanimated 4 may leak values on unmount.
- **Effect dependencies incomplete**: Several `useEffect` calls have incomplete dependency arrays (checked with static analysis). Could cause stale closures.

---

## Missing Features / Incomplete Implementations

### Not Yet Wired (from memory.md)
- **"About Kinship" screen**: Listed in settings hub but no navigation handler. Points to non-existent screen.
- **Profile row in Settings**: Has no `onPress` handler. Clicking it does nothing.
- **Privacy Policy and Terms of Service rows**: Point to screens (`/settings/privacy-policy`, `/settings/terms`) that exist but have no content implementation.
- **"Replay orientation" button**: Settings screen has the button (noted in memory) but no handler to actually replay the orientation overlay.

### Incomplete Data Features
- **No export data functionality**: `/app/settings/privacy.tsx` claims to export data but implementation is stubbed (likely just `Alert.alert("Export saved...)`). Actual file writing not implemented.
- **No delete account flow**: Delete account has 3-step confirmation UI but no actual deletion of user account from Supabase.
- **No contact sync**: Add Person flow can import from device contacts, but no periodic sync to keep contacts up-to-date.

### Missing Integration Points
- **Notifications not sent to device**: `/src/lib/notificationEngine.ts` generates suggestion data but no integration with expo-notifications to actually send push notifications.
- **Calendar integration disabled**: `/src/lib/calendarEngine.ts` is fully implemented but cannot load in Expo Go and is disabled.
- **Suggestion engine runs but no UI**: `/src/lib/suggestionEngine.ts` generates intelligent suggestions but no dedicated UI to display them (only home screen hints).
- **Texture system incomplete**: `/src/lib/textureEngine.ts` generates "texture insights" but unclear if fully displayed in UI.

---

## Data Layer Concerns

### Database Schema Issues
- **No enforcement of required fields**: `/src/types/database.ts` makes `birthday` optional on Person but optional fields should be nullable in database schema. Schema may not match types.
- **Relationships not defined**: Database types have empty `Relationships: []` array. Supabase can auto-generate foreign key relationships, but current types don't reflect them.
- **No soft deletes**: Delete functions hard-delete rows. No audit trail or recovery mechanism.

### Service Layer Gaps
- **No update service for persons**: `/src/services/personService.ts` has `updatePerson()` but it's never called from UI. No form to edit person details after creation.
- **No update service for memories**: Once created, memories cannot be edited or deleted. `/src/services/memoryService.ts` has no update or delete functions.
- **Interaction deletion not available**: `/src/services/interactionService.ts` has no delete function. Interactions are permanent.

### Data Validation
- **No server-side validation**: All validation happens client-side. Supabase doesn't enforce constraints (length, format, uniqueness).
- **Empty strings allowed**: TextInput fields can be empty. No frontend validation of required fields.
- **No duplicate detection**: Creating multiple people with same name/email is allowed.

### Migration & Seeding
- **Single migration file**: `/supabase/migrations/001_initial_schema.sql` is a monolithic file. No versioning or rollback strategy visible.
- **No seed data mechanism**: Mock data is hardcoded in source. No structured way to seed test data or reset database.
- **No schema versioning**: Comments in migration don't explain schema decisions. Future maintainers unclear on intent.

---

## Dependency & Build Concerns

### Version Constraints
- **Loose dependency versions**: `package.json` uses `^` semver for most deps. Patch updates could break app. No lock file version control discipline mentioned.
- **Expo version pinned to 54**: Should monitor for critical security updates in Expo and dependencies monthly.
- **React Native patches**: Using 0.81.5 is recent but rapidly evolving. Monitor for breaking changes in reanimated, react-native-svg, etc.

### Build & Deployment
- **No CI/CD**: No GitHub Actions or similar to run tests, lint, or build on commit. Manual QA only.
- **EAS config missing**: `eas.json` exists but content not checked. May be incomplete for production builds.
- **No error boundaries**: No React Error Boundary components to catch crashes and display friendly UI.

---

## Summary Table

| Category | Risk | Impact | Priority |
|----------|------|--------|----------|
| Type Safety | `as any` casts bypass checking | Silent bugs in production | HIGH |
| Auth/Sessions | OAuth token manual parsing | Breaks if API changes | HIGH |
| Growth Daily Cap | Timezone not handled | Incorrect points across time zones | MEDIUM |
| Navigation | Hardcoded fallback routes | Silent navigation failures | MEDIUM |
| Performance | No pagination or virtualization | Freezes on large datasets | MEDIUM |
| Data Validation | No input validation | Corrupted or malicious data in DB | MEDIUM |
| Module State | No cleanup or reset | Memory leaks, test pollution | MEDIUM |
| Feature Completeness | Missing export, delete, update | Incomplete user journeys | LOW |
| Calendar | Disabled in Expo Go | Limited suggestion functionality | LOW |
| i18n | No localization | Non-English users can't use app | LOW |

