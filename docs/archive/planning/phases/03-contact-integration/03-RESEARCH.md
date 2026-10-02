# Phase 3: Contact Integration — Research

**Researched:** 2026-02-27
**Domain:** expo-contacts, Person data model, profile display, data persistence
**Confidence:** HIGH

---

## Summary

Phase 3 must surface phone numbers and email addresses on the profile of any person who was originally imported from device contacts. The codebase already has a working `expo-contacts` lazy-require pattern in `app/(tabs)/add.tsx` (`StepContactSelection`) — the research confirms this pattern is correct and must be reused exactly. The critical gap is that phone and email are captured into local state during the add flow but **are never persisted**. The `createPerson` call at save time only passes `name`, `photo_url`, `relationship_type`, and `birthday` — phone and email are silently dropped.

The implementation strategy is straightforward: store `phone` and `email` directly on the `Person` record, add them to the data types and mock data, then read them back on the profile screen. No re-querying the device contacts system is required at profile load time — that approach is fragile (contact IDs can change, permission may be revoked, user may have deleted the contact). Storing the values at import time is simpler, safer, and consistent with how birthday is already handled.

For Phase 4's downstream dependency (REACH-04: hide call/text/email buttons based on contact info), the `Person` object simply needs `phone` and `email` fields accessible at render time — which this approach delivers cleanly.

**Primary recommendation:** Add `phone` and `email` as optional string fields to the `Person` type, persist them during `createPerson`, and read them directly on the profile screen. Do NOT re-query expo-contacts at profile load time.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CONT-01 | When a person is imported from device contacts, their phone number and email display on their profile | Store phone/email on Person record at import time; read from Person object in profile screen |
| CONT-02 | Contact info fields (phone, email) are pulled from device contacts using lazy require pattern | Pattern already exists in `StepContactSelection` — reuse verbatim, no new pattern needed |
</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-contacts | Already in project | Device contact access (list + single lookup) | Only Expo-approved contact library; required for App Store/Play Store contact permission compliance |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none needed) | — | — | No additional libraries required; phone/email are plain strings once extracted |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Storing phone/email on Person at import time | Re-query expo-contacts by ID at profile load | Re-querying is fragile: contact IDs can change, permission may be revoked, contact may be deleted. Storing at import mirrors how birthday is already handled. |
| Direct fields on Person | Separate `contact_info` table | Overkill — phone and email are stable, single-value fields; no normalization benefit. Adds query complexity for zero benefit at this scale. |

**Installation:** No new packages needed. `expo-contacts` is already in the project.

---

## Architecture Patterns

### Recommended Project Structure

No new files needed. Changes spread across existing files:

```
src/types/database.ts         # Add phone, email to Person interface
src/types/database.ts         # Add phone?, email? to PersonInsert type
src/data/mock.ts              # Add phone/email to mock people for testing
src/hooks/usePersons.ts       # No changes needed (createPerson passthrough)
app/(tabs)/add.tsx            # Wire phone + email into createPerson() call
app/person/[id].tsx           # Read person.phone + person.email, display
```

### Pattern 1: Lazy require for expo-contacts (ALREADY IMPLEMENTED — reuse exactly)

**What:** Dynamically require expo-contacts inside a try/catch, never at module top level.
**When to use:** Any time expo-contacts is accessed — no exceptions.
**Example (from existing `StepContactSelection` in `app/(tabs)/add.tsx`):**

```typescript
// Source: app/(tabs)/add.tsx — StepContactSelection.loadContacts()
let ExpoContacts: any;
try {
  ExpoContacts = require("expo-contacts");
} catch {
  // Module not available (e.g., Expo Go without plugin)
  setPermissionDenied(true);
  setLoading(false);
  return;
}

const { status } = await ExpoContacts.requestPermissionsAsync();
if (status !== "granted") {
  setPermissionDenied(true);
  setLoading(false);
  return;
}
```

This pattern is CORRECT and complete. Do not introduce top-level imports.

### Pattern 2: Persisting contact fields at import time

**What:** When a contact is selected in the add flow, extract phone/email into local state and include them in the `createPerson` call at save time.
**When to use:** Add flow, contacts path — already happens for birthday.

```typescript
// In handleSelectContact (app/(tabs)/add.tsx)
const handleSelectContact = (contact: ContactEntry) => {
  setName(contact.name);
  setPhone(contact.phone || "");
  setEmail(contact.email || "");
  setBirthday(contact.birthday);
  setStep(2);
};

// In handleSave — add phone and email alongside birthday
const newPerson = await createPerson({
  name: name.trim(),
  photo_url: profilePhotoUri || null,
  relationship_type: relationship,
  birthday,
  phone: phone.trim() || undefined,   // omit if empty
  email: email.trim() || undefined,   // omit if empty
});
```

### Pattern 3: Conditional display of contact fields on profile

**What:** Only render phone/email rows when the field is truthy. Never render an empty broken field.
**When to use:** `app/person/[id].tsx` contact info section.

```typescript
// In person profile render
{person.phone && (
  <View style={styles.contactRow}>
    <Phone size={16} color={colors.sage} />
    <Text>{person.phone}</Text>
  </View>
)}

{person.email && (
  <View style={styles.contactRow}>
    <Mail size={16} color={colors.sage} />
    <Text>{person.email}</Text>
  </View>
)}
```

### Anti-Patterns to Avoid

- **Top-level import of expo-contacts:** `import * as Contacts from "expo-contacts"` CRASHES the app. This is a confirmed known crash in this project (see Known Issues #1 in MEMORY.md). Always use `require()` inside try/catch.
- **Re-querying device contacts at profile load time:** Fragile — contact IDs are not stable across OS upgrades/contact merges, permission may be revoked, or the contact may have been deleted. Store at import time instead.
- **Rendering empty contact fields:** A person added manually will have no phone/email. The fields must be entirely absent from the UI in that case, not rendered as blank rows or dashes.
- **Assuming phone/email are always populated for contacts-imported people:** Some contacts have no phone or no email. Each field must be independently conditional.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Phone number formatting | Custom formatter | Display `person.phone` as-is | The number comes from the device OS — it is already formatted for locale. Reformatting creates issues for international numbers. |
| Email validation | Custom regex | Trust values from expo-contacts | Values originate from the device's Contacts app, which already validates them. No need to re-validate on display. |

**Key insight:** The data origin is the device OS contacts store, which already applies formatting and validation. Treat phone/email as opaque display strings.

---

## Common Pitfalls

### Pitfall 1: Top-level expo-contacts import

**What goes wrong:** App crashes with a native module error immediately on screen load, before any user interaction.
**Why it happens:** expo-contacts is a native module. If the module is not linked or the app is running in an environment where it's not available (e.g., Expo Go without the plugin configured), a top-level import throws synchronously during module initialization.
**How to avoid:** Always and only use `require("expo-contacts")` inside a try/catch inside an async function. Never `import * as Contacts from "expo-contacts"` at the top of any file.
**Warning signs:** Crash on app start; error message mentions `expo-contacts` or native module not found.

### Pitfall 2: Forgetting that `phone` and `email` state exist but are never saved

**What goes wrong:** Contact info appears to work in the add flow UI (the state is populated) but vanishes after saving — the person profile shows nothing.
**Why it happens:** The existing `createPerson` call in `app/(tabs)/add.tsx` does not pass `phone` or `email`. Those local state variables (`const [phone, setPhone] = useState("")`) are set in `handleSelectContact` but never forwarded to the save call.
**How to avoid:** In `handleSave`, include `phone: phone.trim() || undefined` and `email: email.trim() || undefined` in the `createPerson` payload.
**Warning signs:** Profile shows no contact info even for a person confirmed imported from contacts.

### Pitfall 3: Person type and mock data not updated

**What goes wrong:** TypeScript errors when trying to pass phone/email to createPerson; mock people always show no contact info.
**Why it happens:** The `Person` interface in `src/types/database.ts` does not currently include `phone` or `email`. The `PersonInsert` type derives from `Person`.
**How to avoid:** Add `phone?: string | null` and `email?: string | null` to the `Person` interface. Also update 1–2 mock people in `src/data/mock.ts` to have phone/email values so the profile display can be verified during development.
**Warning signs:** TypeScript compile errors; profile screen always shows no contact info during testing.

### Pitfall 4: Manual-path person showing phantom fields

**What goes wrong:** A person added manually shows blank phone/email rows or "undefined" text.
**Why it happens:** The `phone` and `email` state variables are initialized to `""` — if the save logic passes empty strings instead of `undefined`, the fields will be persisted as empty strings, and a naive `{person.phone && ...}` check will correctly not render — but `""` is falsy so this is actually safe. However, if `null` is stored and the display checks `!= null` instead of truthiness, a blank row could appear.
**How to avoid:** Use `phone: phone.trim() || undefined` in the save payload. Use `{person.phone && ...}` (truthiness check) for display.

### Pitfall 5: Permission-denied path crashing or showing broken UI

**What goes wrong:** If contacts permission is denied (or revoked), any code path that accesses expo-contacts crashes or produces an error state.
**Why it happens:** Not wrapping the require + API call in try/catch.
**How to avoid:** The entire expo-contacts access must be inside try/catch. For Phase 3, the only expo-contacts access is at add time (already handled by `StepContactSelection`). The profile screen does NOT call expo-contacts — it just reads from `person.phone` / `person.email`. So the profile screen is inherently permission-safe.

---

## Code Examples

Verified patterns from official sources and project codebase:

### expo-contacts getContactByIdAsync (not needed for this phase — but documented for reference)

```typescript
// Source: https://docs.expo.dev/versions/latest/sdk/contacts/
// Signature: getContactByIdAsync(id: string, fields?: FieldType[])
// Returns: Contact | undefined
// NOTE: Not used in this phase — we store at import time instead.

let ExpoContacts: any;
try {
  ExpoContacts = require("expo-contacts");
} catch {
  return; // graceful degradation
}
const contact = await ExpoContacts.getContactByIdAsync(contactId, [
  ExpoContacts.Fields.PhoneNumbers,
  ExpoContacts.Fields.Emails,
]);
const phone = contact?.phoneNumbers?.[0]?.number;
const email = contact?.emails?.[0]?.email;
```

### Phone and email field structures (from expo-contacts docs)

```typescript
// phoneNumbers array element:
// { number: string, countryCode: string, digits: string, label: string, isPrimary: boolean, id: string }
// Access primary: contact.phoneNumbers?.[0]?.number

// emails array element:
// { email: string, label: string, isPrimary: boolean, id: string }
// Access primary: contact.emails?.[0]?.email
```

### Person type additions

```typescript
// src/types/database.ts — Person interface additions
export interface Person {
  id: string;
  user_id: string;
  name: string;
  photo_url: string | null;
  relationship_type: RelationshipType;
  birthday?: string;
  phone?: string | null;   // ADD: from device contacts import
  email?: string | null;   // ADD: from device contacts import
  created_at: string;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `import * as Contacts from "expo-contacts"` | `require("expo-contacts")` inside try/catch | This project (known crash #1) | Top-level import crashes on some environments; lazy require is required |

**Deprecated/outdated:**
- Storing a `contactId` on Person and re-fetching at display time: Fragile and unnecessary. Contact IDs can become invalid. Storing data at import time is the correct approach for this milestone (Supabase backend not yet connected; data is in-memory mock anyway).

---

## Key Codebase Findings

### What already works (do not change)
- `StepContactSelection` in `app/(tabs)/add.tsx` already correctly uses lazy require, handles permission denial, handles module-not-available, and maps `phoneNumbers[0].number` / `emails[0].email` to `ContactEntry.phone` / `ContactEntry.email`.
- `handleSelectContact` already sets local state `phone` and `email` when a contact is selected.
- The `phone` and `email` local state variables already exist in the main component.
- birthday is already handled as a passthrough from contacts to `createPerson` — phone/email follow the exact same pattern.

### What is missing (the actual work)
1. **`src/types/database.ts`:** `Person` interface has no `phone` or `email` field. `PersonInsert` derives from `Person` so it inherits the gap.
2. **`app/(tabs)/add.tsx` handleSave:** `createPerson({...})` does not pass `phone` or `email`. They are in local state but dropped at save time.
3. **`src/data/mock.ts`:** Mock people have no phone/email. At least one should have values for development testing.
4. **`app/person/[id].tsx`:** No contact info display section exists. Phone and email are never read or rendered.
5. **`supabase/migrations/`:** No migration exists for phone/email columns on the persons table. (Not blocking for this milestone — Supabase is not connected — but a migration file should be created for when it is.)

### Downstream dependency (Phase 4)
The reach-out screen (`app/reach-out/[id].tsx`) currently shows Phone and Video buttons unconditionally. REACH-04 requires hiding them when there's no phone number. After Phase 3, `person.phone` will be available on the `Person` object returned by `usePerson(id)` — Phase 4 can simply check `person.phone` to conditionally render those buttons. No additional data plumbing is needed from Phase 3.

---

## Open Questions

1. **`neighbor` as interaction type in migration**
   - What we know: `supabase/migrations/001_initial_schema.sql` includes `'neighbor'` in the interactions type CHECK constraint, but `InteractionType` in `src/types/index.ts` does not include `"neighbor"`. This is a pre-existing inconsistency, unrelated to Phase 3.
   - What's unclear: Whether this causes any runtime issues.
   - Recommendation: Note it but do not fix in Phase 3 — out of scope.

2. **Whether to show phone/email as tappable (tel: / mailto: links)**
   - What we know: The phase success criteria only require the fields to "appear on their profile" — no mention of tapability.
   - What's unclear: Whether the user expects to tap the phone number to call.
   - Recommendation: Display as plain text for now. Tapability can be added in Phase 4 when the call/text button visibility logic is wired anyway.

3. **Multiple phone numbers / emails per contact**
   - What we know: expo-contacts returns `phoneNumbers[]` and `emails[]` arrays. The current code already takes index [0] for both. Contacts can have multiple numbers (home, work, mobile).
   - What's unclear: Whether storing only [0] is acceptable.
   - Recommendation: Store only the primary (index 0) for now. This matches the existing pattern in `StepContactSelection` and is sufficient for REACH-04's call/text button gating.

---

## Validation Architecture

> Checking config for nyquist_validation setting...

*(Config check: `.planning/config.json` was read — if `workflow.nyquist_validation` is false, this section is omitted. Based on the config loaded by the init tool, validation section is included for completeness but the project uses manual verification.)*

Phase 3 has no automated test infrastructure in this project. All validation is manual/visual.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Notes |
|--------|----------|-----------|-------|
| CONT-01 | Contact-imported person shows phone/email on profile | Manual visual | Open profile of person imported from contacts; verify fields appear |
| CONT-01 | Manually-added person shows no phantom phone/email | Manual visual | Open profile of manually added person; verify no contact rows appear |
| CONT-02 | Lazy require pattern used — no top-level import | Code review | Search for `import.*expo-contacts` in codebase — must be zero results |
| CONT-02 | Permission-denied path: no crash, no broken UI | Manual device test | Deny contacts permission in iOS Settings; open add-from-contacts; verify graceful fallback |

---

## Sources

### Primary (HIGH confidence)
- Expo Contacts official docs — https://docs.expo.dev/versions/latest/sdk/contacts/ — `getContactByIdAsync` signature, field structures, permission API
- Project codebase — `app/(tabs)/add.tsx` — confirmed lazy require pattern, ContactEntry type, handleSelectContact, existing phone/email state
- Project codebase — `src/types/database.ts` — confirmed Person type lacks phone/email fields
- Project codebase — `app/(tabs)/add.tsx` handleSave — confirmed phone/email not passed to createPerson
- Project codebase — `src/data/mock.ts` — confirmed no phone/email on mock people
- Project codebase — `app/person/[id].tsx` — confirmed no contact info display section

### Secondary (MEDIUM confidence)
- WebSearch: expo-contacts `getContactByIdAsync` API confirmed to exist and accept fields parameter

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — expo-contacts is already in the project and working
- Architecture: HIGH — the gap is precisely identified from reading the actual code; the fix pattern mirrors how birthday is already handled
- Pitfalls: HIGH — top-level import crash is a confirmed known issue in this project; other pitfalls derived from direct code inspection

**Research date:** 2026-02-27
**Valid until:** 2026-04-27 (expo-contacts API is stable; project patterns are locked)
