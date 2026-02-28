# Phase 4: Reach-Out Flow Core — Research

**Researched:** 2026-02-27
**Domain:** Expo Router navigation flow, conditional UI rendering
**Confidence:** HIGH

## Summary

Phase 4 fixes two issues in the reach-out flow: (1) an intermediate "Moments like this continue to grow" screen appears between completing a reach-out action and reaching the "How'd it go?" check-in screen, and (2) call/text/video action buttons render unconditionally even when the person has no phone number, email, or contact info saved.

The current reach-out flow in `app/reach-out/[id].tsx` uses a two-phase local state machine (`"bridge"` and `"followup"`). When the user taps any channel button (Message, Phone, Video), `handleChannelSelected` creates an interaction and sets `phase` to `"followup"`, which renders the `PassiveFollowUpScreen` — the "Moments like this continue to grow" intermediate screen. Only when the user taps "Maybe later" on that screen does `handleFollowUpDismiss` fire, which calls `router.replace(/reach-out/check-in/${person.id})` to navigate to the check-in screen. This is the wrong intermediate screen that REACH-03 requires to be removed.

The fix is straightforward: after a channel is selected and the interaction is created, navigate directly to the check-in screen via `router.replace`, bypassing the `PassiveFollowUpScreen` entirely. The `PassiveFollowUpScreen` component can then be removed as dead code.

For REACH-04, the `BridgeScreen` component currently renders three hardcoded channel buttons (Message, Phone, Video) with no conditional logic. The Person type already has `phone?: string | null` and `email?: string | null` fields (added in Phase 3). The fix requires checking `person.phone` and `person.email` to conditionally render each button, and ensuring a fallback generic option always exists.

**Primary recommendation:** Remove the `PassiveFollowUpScreen` and wire `handleChannelSelected` to navigate directly to check-in. Gate Phone/Video buttons on `person.phone` and add a "Meet in person" generic option so the screen works even with zero contact info.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| REACH-03 | After completing a reach-out action, user goes directly to "How'd it go?" check-in — no intermediate screen | Navigation flow traced: `handleChannelSelected` sets phase to "followup" which shows `PassiveFollowUpScreen` before check-in. Fix by replacing phase transition with direct `router.replace` to check-in route. |
| REACH-04 | Call/text/video action buttons hidden when person has no phone number or contact info | `BridgeScreen` renders 3 hardcoded buttons with no contact info checks. Person type has `phone?: string | null` and `email?: string | null` from Phase 3. Conditional rendering on these fields resolves the issue. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-router | SDK 54 | File-based routing, `router.replace` | Already in use for all navigation |
| react-native-reanimated | 3.x | Entrance animations on bridge screen | Already imported and used |
| lucide-react-native | latest | Icons (MessageCircle, Phone, Video) | Already imported |

### Supporting
No new libraries needed. This phase uses only existing dependencies.

### Alternatives Considered
None — all work is internal refactoring of existing code.

## Architecture Patterns

### Pattern 1: Direct Navigation After Action
**What:** After creating an interaction, use `router.replace` to navigate directly to the check-in screen instead of transitioning to a local phase state.
**When to use:** When an intermediate screen adds no user value and should be removed.
**Example:**
```typescript
const handleChannelSelected = async () => {
  try {
    await createInteraction({
      person_id: person.id,
      type: "message",
    });
  } catch {
    // Silent fail
  }
  // Navigate directly to check-in — no intermediate screen
  router.replace(`/reach-out/check-in/${person.id}`);
};
```

### Pattern 2: Conditional Button Rendering Based on Contact Info
**What:** Render action buttons only when the person has the corresponding contact info. Always ensure at least one generic option exists.
**When to use:** When action availability depends on data presence.
**Example:**
```typescript
{person.phone && (
  <Pressable onPress={() => handleAction("call")}>
    <Phone size={18} color={sage} />
  </Pressable>
)}
```

### Anti-Patterns to Avoid
- **Removing the check-in route entirely:** The check-in screen (`app/reach-out/check-in/[id].tsx`) is correct and must remain. Only the intermediate `PassiveFollowUpScreen` is removed.
- **Using `router.push` instead of `router.replace`:** `router.replace` is correct here because we don't want the user to navigate "back" to the bridge screen after completing the action. The bridge screen's purpose is complete once a channel is selected.
- **Rendering an empty screen when no contact info:** If a person has no phone or email, the screen should still show generic options like "Meet in person" or "Send a note" — never a blank/broken state.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Navigation after action | Custom transition state machine | `router.replace` direct navigation | Simpler, fewer states to manage |

## Common Pitfalls

### Pitfall 1: Back Navigation from Check-In
**What goes wrong:** If `handleChannelSelected` uses `router.push` instead of `router.replace`, pressing back from check-in returns to the bridge screen (which already completed its action), creating a confusing loop.
**Why it happens:** Default navigation is push-based.
**How to avoid:** Use `router.replace` so the bridge screen is removed from the navigation stack.
**Warning signs:** User can navigate back to bridge after already selecting a channel.

### Pitfall 2: Message Button Disappearing with No Phone
**What goes wrong:** If the "Message" button is gated on `person.phone`, it disappears even though messaging can work via other channels (social media, apps).
**Why it happens:** Overly aggressive contact info gating.
**How to avoid:** Only gate "Call" and "Video Call" on `person.phone`. The "Message" button should remain as a generic action (it doesn't specifically require a phone number — the user might message via Instagram, WhatsApp, etc.). Similarly, ensure at least one generic option always exists.
**Warning signs:** Person with no contact info sees zero action buttons.

### Pitfall 3: Dead Code Left Behind
**What goes wrong:** The `PassiveFollowUpScreen` component and its related state (`phase`, `setPhase`) remain in the file as dead code after the navigation change.
**Why it happens:** Forgetting to clean up after removing the intermediate screen.
**How to avoid:** Remove the `PassiveFollowUpScreen` function, the `phase` state, and all references to it.
**Warning signs:** TypeScript warnings about unused variables.

### Pitfall 4: Interaction Type Not Reflecting Selected Channel
**What goes wrong:** Currently `handleChannelSelected` hardcodes `type: "message"` regardless of which button (Message, Phone, Video) was pressed. This means all reach-outs are logged as messages.
**Why it happens:** All three buttons call the same handler with no parameter.
**How to avoid:** Pass the channel type (message, call, video) as a parameter to the handler. This is a minor enhancement that should be done while fixing the flow.
**Warning signs:** All interactions show as "message" type in the interaction history.

## Code Examples

### Current Flow (BROKEN)
```
User taps "Reach out" on person profile
  → app/reach-out/[id].tsx loads (phase: "bridge")
  → BridgeScreen renders (channel buttons)
  → User taps Message/Phone/Video
  → handleChannelSelected: creates interaction, sets phase to "followup"
  → PassiveFollowUpScreen renders ("Moments like this continue to grow")
  → User taps "Maybe later"
  → handleFollowUpDismiss: router.replace to /reach-out/check-in/[id]
  → CheckInScreen renders ("How'd it go?")
```

### Fixed Flow (TARGET)
```
User taps "Reach out" on person profile
  → app/reach-out/[id].tsx loads
  → BridgeScreen renders (channel buttons, conditionally based on contact info)
  → User taps Message/Phone/Video/Meet in person
  → handleChannelSelected: creates interaction, router.replace to /reach-out/check-in/[id]
  → CheckInScreen renders ("How'd it go?")
```

### Key Files
| File | Role | Changes Needed |
|------|------|----------------|
| `app/reach-out/[id].tsx` | Main reach-out screen | Remove PassiveFollowUpScreen, fix handleChannelSelected, add contact info gating, add generic options |
| `app/reach-out/check-in/[id].tsx` | "How'd it go?" screen | No changes needed — already works correctly |
| `app/reach-out/_layout.tsx` | Stack layout for reach-out | No changes needed |
| `app/reach-out/check-in/_layout.tsx` | Stack layout for check-in | No changes needed |

### Current Button Rendering (no contact info check)
```typescript
// Lines 311-378 in app/reach-out/[id].tsx — BridgeScreen
<View style={{ flexDirection: "row", gap: 10 }}>
  {/* Message - Primary */}
  <Pressable onPress={onChannelSelected} style={{...}}>
    <MessageCircle size={18} color={white} />
    <Text>Message</Text>
  </Pressable>
  {/* Phone */}
  <Pressable onPress={onChannelSelected} style={{...}}>
    <Phone size={18} color={sage} />
  </Pressable>
  {/* Video */}
  <Pressable onPress={onChannelSelected} style={{...}}>
    <Video size={18} color={sage} />
  </Pressable>
</View>
```

### Contact Info on Person Type (from Phase 3)
```typescript
// src/types/database.ts
export interface Person {
  id: string;
  user_id: string;
  name: string;
  photo_url: string | null;
  relationship_type: RelationshipType;
  birthday?: string;
  phone?: string | null;   // From device contacts import
  email?: string | null;   // From device contacts import
  created_at: string;
}
```

### Mock Data Contact Info
```typescript
// src/data/mock.ts — people with/without contact info
{ id: "p1", name: "Sarah Miller", phone: "(555) 123-4567", email: "sarah.miller@email.com", ... }
{ id: "p2", name: "James Chen",  /* no phone, no email */ ... }
{ id: "p3", name: "Mom", phone: "(555) 987-6543", /* no email */ ... }
{ id: "p4", name: "Alex Rivera", /* no phone, no email */ ... }
```

## Open Questions

1. **Should "Save Memory" from the follow-up screen be relocated?**
   - What we know: The `PassiveFollowUpScreen` has a "Save Memory" button that navigates to `/memory/add`. Removing it means this prompt disappears from the reach-out flow.
   - What's unclear: Whether the check-in screen's existing "Save & Return" + optional note is sufficient to capture any memory.
   - Recommendation: The check-in screen already allows the user to capture a note and emotion. The "Save Memory" navigation is out of scope for this phase. If users need a dedicated memory capture after reach-out, that can be added later. Removing the intermediate screen is the explicit requirement.

2. **Should the interaction type reflect the actual channel used?**
   - What we know: Currently all channels create a `type: "message"` interaction.
   - What's unclear: Whether Phase 5 (Reach-Out Intelligence) will need accurate channel type data.
   - Recommendation: Fix this while refactoring — pass the channel type as a parameter. It's low-cost and prevents Phase 5 from needing to redo this work.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `app/reach-out/[id].tsx`, `app/reach-out/check-in/[id].tsx`, `app/reach-out/_layout.tsx`, `app/reach-out/check-in/_layout.tsx`
- Direct codebase inspection: `src/types/database.ts` (Person type with phone/email fields)
- Direct codebase inspection: `src/data/mock.ts` (mock people with varied contact info)

### Secondary (MEDIUM confidence)
- Navigation patterns from existing codebase (router.replace usage in other screens)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries, all existing code
- Architecture: HIGH — simple navigation refactor with clear before/after
- Pitfalls: HIGH — all identified from direct code inspection

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (stable — internal codebase refactoring)
