# Phase 6: Garden Visuals & Vitality Wiring - Research

**Researched:** 2026-02-27
**Domain:** Plant illustration consistency + vitality visual modifiers across 3 rendering surfaces
**Confidence:** HIGH

## Summary

Phase 6 addresses two closely related problems: (1) plant illustrations for the same growth stage differ across the Home screen, Garden tab, and Person profile, and (2) the VitalPlant wrapper — which applies opacity, desaturation overlay, and sway animation based on vitality score — is not applied to all plant-rendering contexts.

The root cause of the icon mismatch (VIS-01) is that three separate functions map growth stages to illustration components, and each uses a different mapping. The Home screen uses `GrowthPlantIllustration`, the Garden tab uses `GrowthIllustration`, and the Person profile uses `GrowthPlant` — all locally defined, with no shared source of truth. The fix is to extract a single canonical mapping function into a shared location and replace all three local versions.

For VitalPlant wiring (VITAL-01 through VITAL-03), the Home carousel and Garden canopy already wrap plants in VitalPlant. However, the Garden tab's "All People" list rows display stage emojis instead of plant illustrations entirely — they need to render the actual plant illustration wrapped in VitalPlant. The Person profile already wraps its plant in VitalPlant. The main gaps are: (a) unify illustrations, (b) wire VitalPlant into the PersonRow list items in the Garden tab.

**Primary recommendation:** Create a single `GrowthPlantIllustration` component in `src/components/GrowthPlantIllustration.tsx` that serves as the canonical stage-to-illustration mapping, then replace all three local copies. Simultaneously wire VitalPlant into the Garden tab PersonRow (the only surface currently missing it).

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| VIS-01 | Plant icons in "All people" list match garden canopy view | Three divergent mapping functions found — unify to single source of truth |
| VIS-02 | VitalPlant wrapper applies vitality modifiers consistently across all contexts | VitalPlant already exists with full modifier set; wiring gap is PersonRow only |
| VITAL-01 | VitalPlant integrated into Home screen plant carousel | Already wired in SwayingPlant — needs illustration unification only |
| VITAL-02 | VitalPlant integrated into Garden tab canopy and person rows | Canopy wired; PersonRow uses emoji not illustration — needs VitalPlant + illustration |
| VITAL-03 | VitalPlant integrated into Person profile plant display | Already wired — needs illustration unification only |
</phase_requirements>

## Standard Stack

### Core

No new libraries needed. All required tools are already in the project:

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-native-reanimated | existing | Sway animation in VitalPlant | Already used throughout |
| react-native-svg | existing | SVG plant illustrations | Already used for all illustrations |
| @design/tokens | existing | Color tokens for cream overlay | Already the design system |

### Supporting

None needed — this phase is pure refactoring and wiring of existing components.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Shared component file | Inline the mapping in each screen | Defeats the purpose — maintaining 3 copies is the bug |
| New illustration set | Existing illustrations | No design changes requested — just consistency |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── components/
│   ├── GrowthPlantIllustration.tsx  # NEW — canonical stage→illustration mapper
│   ├── VitalPlant.tsx               # EXISTING — vitality visual wrapper
│   └── illustrations/
│       └── index.tsx                # EXISTING — SVG illustration components
```

### Pattern 1: Single Source of Truth for Stage→Illustration Mapping

**What:** One shared component that maps GrowthStage to the correct SVG illustration.
**When to use:** Everywhere a plant illustration is rendered for a person's growth stage.
**Example:**

```typescript
// src/components/GrowthPlantIllustration.tsx
import type { GrowthStage } from "@/lib/growthEngine";
import { ... } from "@/components/illustrations";

export default function GrowthPlantIllustration({
  stage,
  size = 44,
}: {
  stage: GrowthStage;
  size?: number;
}) {
  switch (stage) {
    case "seed":      return <SingleSproutIllustration size={size} />;
    case "sprout":    return <SproutSmallIllustration size={size + 6} />;
    case "youngPlant": return <SmallGardenIllustration size={size + 4} />;
    case "mature":    return <FlourishingGardenIllustration size={size + 6} />;
    case "blooming":  return <FlourishingGardenIllustration size={size + 10} />;
    case "tree":      return <GardenRevealIllustration size={size + 14} />;
  }
}
```

The Home screen's `GrowthPlantIllustration` mapping is the most intentional and complete — it should be the canonical version.

### Pattern 2: VitalPlant Wrapping Pattern

**What:** Every plant illustration rendering must be wrapped in `<VitalPlant>` for consistent vitality visuals.
**When to use:** All 4 plant-rendering contexts: Home carousel, Garden canopy, Garden list rows, Person profile.
**Example:**

```typescript
<VitalPlant vitalityScore={score} size={44} index={i}>
  <GrowthPlantIllustration stage={stage} size={44} />
</VitalPlant>
```

### Anti-Patterns to Avoid

- **Duplicate mapping functions:** Each screen defining its own stage-to-illustration switch is the root cause of VIS-01. The fix must eliminate all three local copies.
- **Rendering emojis instead of illustrations in list rows:** The PersonRow currently shows `{emoji}` (a text character) instead of the actual SVG illustration. This prevents VitalPlant from being applied (VitalPlant wraps visual children, not text).
- **Missing VitalPlant wrapper:** Every plant illustration must go through VitalPlant for consistent vitality state rendering. Rendering an illustration directly (without VitalPlant) breaks VIS-02.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Stage-to-illustration mapping | Local switch in each screen file | Shared `GrowthPlantIllustration` component | Prevents divergence; single place to update if illustrations change |
| Vitality visual modifiers | Custom opacity/overlay logic per screen | `VitalPlant` wrapper (already exists) | Handles sway, opacity, and cream overlay consistently |

**Key insight:** The entire bug is caused by duplicated logic. The fix is deduplication, not new features.

## Common Pitfalls

### Pitfall 1: Size Inconsistency Between Contexts

**What goes wrong:** The canonical mapping uses relative size offsets (e.g., `size + 6` for sprout), but different contexts need different base sizes (44px for carousel, 40px for canopy cards, 100px for profile hero).
**Why it happens:** Each illustration has a different default viewport, so some need size adjustments to look balanced.
**How to avoid:** The canonical component should accept `size` as the base and apply the same relative offsets. Each consumer passes the appropriate base size.
**Warning signs:** A plant looks too large or too small in one context vs another.

### Pitfall 2: PersonRow Emoji Replacement Layout Shift

**What goes wrong:** The PersonRow currently renders a text emoji inside a 52x52 container with a gradient. Replacing the emoji with an SVG illustration + VitalPlant wrapper could change the visual layout.
**Why it happens:** Text emojis render at font size, SVG illustrations render at exact pixel dimensions.
**How to avoid:** Match the illustration size to the emoji's visual footprint (~22-24px for the SVG inside the 52x52 container), keep the same container dimensions and gradient.
**Warning signs:** Person rows look visually different or misaligned after the change.

### Pitfall 3: Stale VitalPlant on Tab Focus

**What goes wrong:** Vitality scores might not update when the user switches tabs, causing plants to show stale visual state.
**Why it happens:** `useFocusEffect` refetches data but the vitality hook memoizes on the array reference.
**How to avoid:** Both the Home screen and Garden tab already call `useAllVitalities` with refetched data in `useFocusEffect` — the hook's `useMemo` dependency on the arrays means it recomputes when data changes. No additional work needed.
**Warning signs:** A plant appears "vibrant" on one tab and "dormant" on another for the same person.

### Pitfall 4: VitalPlant Overlay Clipping in Small Containers

**What goes wrong:** The VitalPlant cream overlay uses `borderRadius: size / 2` to create a circular mask. If the container has `overflow: "hidden"`, the overlay might clip incorrectly.
**Why it happens:** The canopy card container has `overflow: "hidden"` — this could clip the VitalPlant's overlay if not sized correctly.
**How to avoid:** Ensure the VitalPlant `size` prop matches or is smaller than the container dimensions. The overlay is absolutely positioned within VitalPlant's bounds.
**Warning signs:** Cream overlay appears as a square instead of following the plant shape.

## Code Examples

### Current Divergent Mappings (the bug)

**Home screen** (`app/(tabs)/index.tsx` lines 108-129):
```
seed → SingleSproutIllustration
sprout → SproutSmallIllustration
youngPlant → SmallGardenIllustration
mature → FlourishingGardenIllustration
blooming → FlourishingGardenIllustration
tree → GardenRevealIllustration
```

**Garden tab** (`app/(tabs)/people.tsx` lines 89-110):
```
seed → SingleSproutIllustration
sprout → SingleSproutIllustration    ← MISMATCH (Home: SproutSmall)
youngPlant → SproutSmallIllustration  ← MISMATCH (Home: SmallGarden)
mature → SmallGardenIllustration      ← MISMATCH (Home: Flourishing)
blooming → FlourishingGardenIllustration ← MISMATCH (Home: Flourishing)
tree → GardenRevealIllustration
```

**Person profile** (`app/person/[id].tsx` lines 201-216):
```
seed → SeedIllustration              ← MISMATCH (Home: SingleSprout)
sprout → SproutSmallIllustration
youngPlant → SunlightIllustration     ← MISMATCH (Home: SmallGarden)
mature → FlourishingGardenIllustration
blooming → GardenRevealIllustration   ← MISMATCH (Home: Flourishing)
tree → GardenRevealIllustration(1.15x)
```

### VitalPlant Wiring Status (current state)

| Surface | VitalPlant Used? | Illustration Source | Gap |
|---------|-----------------|--------------------|----|
| Home carousel (`SwayingPlant`) | Yes | Local `GrowthPlantIllustration` | Illustration divergence |
| Garden canopy (`CanopyPlantCard`) | Yes | Local `GrowthIllustration` | Illustration divergence |
| Garden list (`PersonRow`) | **NO** | Shows emoji text only | Missing VitalPlant + illustration |
| Person profile | Yes | Local `GrowthPlant` | Illustration divergence |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Three separate mapping functions | Should be one shared component | Phase 6 will fix | Eliminates icon mismatch across all surfaces |
| PersonRow shows emoji | Should show VitalPlant-wrapped illustration | Phase 6 will fix | Enables vitality visuals in list view |

## Open Questions

1. **Which mapping is "correct"?**
   - What we know: The Home screen mapping appears most intentional — it uses distinct illustrations for each stage with progressive size increases.
   - What's unclear: Whether the design spec prescribes specific illustrations per stage.
   - Recommendation: Use the Home screen mapping as canonical. It provides the clearest visual progression (SingleSprout → SproutSmall → SmallGarden → Flourishing → Flourishing → GardenReveal).

2. **Should PersonRow show illustration or keep emoji?**
   - What we know: VIS-01 requires "plant icons in the All people list match the garden canopy view." The canopy uses SVG illustrations; the list uses text emojis. They cannot match while one is emoji and the other is SVG.
   - Recommendation: Replace emoji in PersonRow with the same SVG illustration used in the canopy, wrapped in VitalPlant. Keep the emoji in the growth stage label text below the name (it serves a different purpose there).

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis of `src/components/VitalPlant.tsx`, `src/lib/vitalityEngine.ts`, `src/hooks/useVitality.ts`
- Direct codebase analysis of `app/(tabs)/index.tsx` (Home screen plant rendering)
- Direct codebase analysis of `app/(tabs)/people.tsx` (Garden tab canopy + list rendering)
- Direct codebase analysis of `app/person/[id].tsx` (Person profile plant rendering)
- Direct codebase analysis of `src/lib/growthEngine.ts` (growth stage definitions)
- Direct codebase analysis of `src/components/illustrations/index.tsx` (available illustrations)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new libraries needed; all existing
- Architecture: HIGH - Straightforward deduplication and wiring pattern
- Pitfalls: HIGH - Based on direct code analysis, not speculation

**Research date:** 2026-02-27
**Valid until:** Indefinitely (codebase-specific, not library-dependent)
