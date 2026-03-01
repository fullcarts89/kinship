# Conventions

## Code Style

### TypeScript

- **Strict mode enabled** — `tsconfig.json` enforces strict TypeScript checking
- **Path aliases** — Use configured path mappings in all imports:
  - `@/*` → `./src/*`
  - `@design/*` → `./design/*`
- **Type imports** — Use `import type` for types, enums, and interfaces to avoid circular dependencies:
  ```typescript
  import type { Person, Memory } from "@/types/database";
  import { createPerson } from "@/services/personService";
  ```
- **Explicit any** — When `as any` casts are necessary (e.g., Supabase type issues), use inline eslint disables:
  ```typescript
  const { data, error } = await query as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  ```

### File Organization

- **Component files** — Use `.tsx` for files containing React components
- **Hook files** — Use `.ts` for hook logic; export hook from component or module as needed
- **Service files** — Use `.ts` for Supabase CRUD operations
- **Utility files** — Use `.ts` for pure functions and constants
- **Index files** — Use barrel exports to organize public APIs (e.g., `src/hooks/index.ts`, `src/components/ui/index.ts`)

### Docstrings

All public functions, hooks, components, and modules should have JSDoc comments:

```typescript
/**
 * Growth Engine
 *
 * Single source of truth for plant growth points, stage thresholds,
 * daily caps, and stage-transition detection.
 */

/**
 * Derive growth stage from total accumulated points.
 */
export function getStageFromPoints(points: number): GrowthStage {
  // ...
}

/**
 * FadeIn
 *
 * Lightweight reanimated wrapper that fades in (and optionally slides up)
 * its children on mount.
 */
```

### Comment Organization

Use horizontal divider comments to structure large files:

```typescript
// ─── Types ──────────────────────────────────────────────────────────────────

export type GrowthStage = /* ... */;

// ─── Constants ───────────────────────────────────────────────────────────────

const DAILY_CAP = 4;

// ─── Module-level Shared State ──────────────────────────────────────────────

const _growthPoints = new Map<string, number>();
```

## Naming Patterns

### Constants

- **All caps with underscores** — `DAILY_CAP`, `POINTS_MEANINGFUL_MEMORY`, `STORAGE_KEY`
- **Private module state** — Prefix with underscore: `_growthPoints`, `_isBootstrapped`, `_listeners`, `_currentStep`

### Functions

- **Pure functions** — No prefix, standard camelCase: `getStageFromPoints`, `todayKey`, `isMeaningfulMemory`
- **Mutation functions** — Use clear verbs: `recordMemoryGrowth`, `advanceOrientation`, `notifyListeners`
- **Query functions** — Start with `get`, `use`, `fetch`: `getPersons`, `usePersonGrowth`, `getMemoriesForPerson`
- **Predicates** — Start with `is` or `has`: `isMeaningfulMemory`, `hasRecentTransition`, `isActive`, `isLoading`

### Components

- **PascalCase** — `Button`, `FadeIn`, `ErrorState`, `OrientationOverlay`
- **Compound components** — Use dot notation: `AvatarGroup`, `EmotionChip` (variations of root component)
- **UI components** — Grouped in `src/components/ui/`
- **Illustrations** — Grouped in `src/components/illustrations/`
- **Feature components** — Organized by feature in `src/components/` (e.g., `VitalPlant.tsx`, `GrowthToast.tsx`)

### Hooks

- **Start with `use`** — `usePersonGrowth`, `useBootstrapGrowth`, `useOrientation`, `usePersons`, `useMemories`
- **Return type from hook name** — `usePersonGrowth` returns `PersonGrowth`, `useOrientation` returns orientation state + actions

### Types and Interfaces

- **PascalCase** — `Person`, `Memory`, `Interaction`, `GrowthInfo`, `PersonGrowth`
- **Props interfaces** — Suffix with `Props`: `FadeInProps`, `ButtonProps`, `CardProps`, `ErrorStateProps`
- **Type unions** — All lowercase: `RelationshipType`, `Emotion`, `InteractionType`, `SuggestionType`
- **Enums (not used)** — App prefers discriminated unions over enums

### Variables

- **camelCase** — `personId`, `isLoading`, `currentStep`, `animatedStyle`
- **Boolean prefixes** — `is`, `has`, `can`, `should`: `isActive`, `hasTransitioned`, `canGoBack`, `shouldShow`

## Component Patterns

### Functional Components

All components are **functional components** using React hooks. No class components.

```typescript
import React, { useState, useCallback } from "react";

export function MyComponent({ prop }: MyComponentProps) {
  const [state, setState] = useState(false);

  const handleAction = useCallback(() => {
    setState(!state);
  }, [state]);

  return <View>{/* ... */}</View>;
}

export default MyComponent;
```

### Props Interface

Every component should have a typed props interface:

```typescript
export interface ButtonProps extends Omit<PressableProps, "children"> {
  /** Button text label */
  children: string;
  /** Visual variant */
  variant?: ButtonVariant;
  /** Loading state */
  loading?: boolean;
  /** Additional className */
  className?: string;
}
```

**Key conventions:**
- Extend or omit from React Native base props (e.g., `PressableProps`, `ViewProps`)
- Document each prop with JSDoc comments
- Use optional (`?`) for non-required props
- Always include a `className` prop for NativeWind styling flexibility

### Size and Variant Pattern

Use typed discriminated unions for size and variant:

```typescript
export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "destructive";
export type ButtonSize = "sm" | "md" | "lg";

const variantStyles: Record<ButtonVariant, { base: string; text: string }> = {
  primary: { base: "bg-sage", text: "text-white" },
  // ...
};

const sizeStyles: Record<ButtonSize, { container: string; text: string }> = {
  sm: { container: "h-[36px] px-lg", text: "text-sm" },
  // ...
};
```

### Animation Patterns

Use `react-native-reanimated` for all animations:

```typescript
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  Easing,
} from "react-native-reanimated";

const opacity = useSharedValue(0);
const animatedStyle = useAnimatedStyle(() => ({
  opacity: opacity.value,
  transform: [{ scale: scale.value }],
}));

// Apply animation
useEffect(() => {
  opacity.value = withDelay(delay, withTiming(1, { duration }));
}, []);

return <Animated.View style={animatedStyle}>{children}</Animated.View>;
```

### Refs and useFocusEffect

For screen-level state management and refocusing:

```typescript
import { useFocusEffect } from "expo-router";
import { useRef } from "react";

const gardenRef = useRef<View>(null);

useFocusEffect(
  useCallback(() => {
    // Reset state when tab gains focus
    setActiveIndex(0);
  }, [])
);
```

### Error Handling Components

Use the `ErrorState` component for error display:

```typescript
import { ErrorState } from "@/components/ui";

{error ? (
  <ErrorState
    message="Failed to load persons"
    onRetry={() => refetch()}
    compact={false}
  />
) : (
  // success content
)}
```

### Loading States

Use the `Skeleton` component for loading placeholders:

```typescript
import { Skeleton } from "@/components/ui";

{isLoading ? (
  <View>
    <Skeleton height={200} />
    <Skeleton height={40} />
  </View>
) : (
  // content
)}
```

### Conditional Rendering

Prefer ternary operators and logical operators over `if` statements within JSX:

```typescript
// Good
{isLoading ? <Skeleton /> : <Content />}
{isVisible && <Component />}

// Avoid wrapping entire components in conditional returns
if (!isLoaded) return null; // OK at top level
```

## Hook Patterns

### Data Hooks (usePersons, useMemories, etc.)

Data hooks manage module-level shared state (mock data) that persists across tab navigations:

```typescript
// Module-level shared state (persists between screens)
let locallyCreatedPeople: Person[] = [];

export function usePersons() {
  const [, rerender] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeToChanges(() => {
      rerender(n => n + 1);
    });
    return unsubscribe;
  }, []);

  return locallyCreatedPeople;
}
```

**Key conventions:**
- Use module-level shared state (matched by ALL screen instances)
- Use `useState(0)` + manual increment to trigger re-renders on data changes
- Provide subscription mechanism for other components to listen
- Document that state persists across tab navigations (important for UX)

### Subscription Pattern

For real-time state synchronization across screens:

```typescript
const _listeners = new Set<() => void>();

function notifyListeners() {
  _listeners.forEach((fn) => fn());
}

export function subscribeToGrowth(listener: () => void): () => void {
  _listeners.add(listener);
  return () => {
    _listeners.delete(listener);
  };
}
```

Then in hooks:

```typescript
useEffect(() => {
  const unsubscribe = subscribeToGrowth(() => {
    rerender((n) => n + 1);
  });
  return unsubscribe;
}, []);
```

### Growth Hook Pattern

Growth is accessed via `usePersonGrowth(personId)`:

```typescript
export function usePersonGrowth(personId: string): PersonGrowth {
  const [, rerender] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeToGrowth(() => {
      rerender((n) => n + 1);
    });
    return unsubscribe;
  }, [personId]);

  const info = getGrowthInfo(personId);
  return {
    ...info,
    justTransitioned: hasRecentTransition(personId),
  };
}
```

**Key conventions:**
- Always check `personId` dependency
- Combine data from engine functions with local state (e.g., `justTransitioned`)
- Return plain object (not wrapped in provider)

### Bootstrap Pattern

One-time initialization of shared state from data:

```typescript
export function useBootstrapGrowth(
  memories: Memory[],
  interactions: Interaction[],
  isLoading: boolean
): void {
  useEffect(() => {
    if (!isLoading) {
      bootstrapGrowthFromData(memories, interactions);
    }
  }, [isLoading]);
}
```

**Key conventions:**
- Call once from top-level screens (home, garden tab)
- Idempotent — safe to call multiple times (guarded by `_isBootstrapped` flag)
- Seed growth points from existing data without triggering daily caps retroactively

## Error Handling

### Service Errors

Services throw errors directly; callers decide how to handle:

```typescript
// Service throws
export async function getPersons(): Promise<Person[]> {
  if (!supabase) throw new Error("Supabase not configured");

  const { data, error } = await supabase
    .from("persons")
    .select("*")
    .eq("user_id", userId);

  if (error) throw error; // Throw directly
  return data as Person[];
}

// Component handles
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  (async () => {
    try {
      const result = await getPersons();
      setResult(result);
    } catch (err) {
      setError((err as Error).message);
    }
  })();
}, []);

return error ? <ErrorState message={error} /> : <Content />;
```

### Try/Catch for Async Operations

Wrap async operations in try/catch:

```typescript
try {
  await SecureStore.setItemAsync(STORAGE_KEY, "completed");
} catch {
  // Silent failure — log if needed
  console.warn("Failed to persist orientation status");
}
```

### Null Coalescing

Use optional chaining and nullish coalescing for safe property access:

```typescript
const name = person?.name ?? "Unknown";
const emoji = emotion ? emotionEmojis[emotion] : "🌱";
```

## Import Patterns

### Path Aliases

Always use configured path aliases:

```typescript
// Good
import { Button } from "@/components/ui";
import { usePersonGrowth } from "@/hooks";
import { colors, fonts } from "@design/tokens";

// Avoid
import Button from "../../../components/ui/Button";
import usePersonGrowth from "../hooks/useGrowth";
```

### Barrel Exports

Use barrel files to organize public APIs:

```typescript
// src/components/ui/index.ts
export { Button, type ButtonProps } from "./Button";
export { Card, type CardProps } from "./Card";

// Component imports
import { Button, Card } from "@/components/ui";
```

### Type Imports

Separate type and value imports:

```typescript
import type { Person, Memory } from "@/types/database";
import { createPerson, getMemories } from "@/services";
```

### Default vs Named Exports

Prefer **named exports** for components and functions:

```typescript
// Good
export function Button({ ... }) { ... }
import { Button } from "@/components/ui";

// Component footer (optional for convenience)
export default Button;
```

## Design Tokens & Styling

### NativeWind (TailwindCSS for React Native)

All styling uses **NativeWind className** system, NOT inline styles:

```typescript
// Good
<View className="px-4 py-2 bg-sage rounded-lg">
  <Text className="text-white font-sans-semibold">Button</Text>
</View>

// Avoid
<View style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#7A9E7E" }}>
  <Text style={{ color: "#FFFFFF", fontWeight: "600" }}>Button</Text>
</View>
```

### Design Tokens

All colors, fonts, and spacing come from `@design/tokens`:

```typescript
import { colors, fonts, spacing, opacity, animation } from "@design/tokens";

// In components
<Text className="text-sage font-serif text-2xl">Heading</Text>
<View className="px-lg py-xl bg-sage-pale">Content</View>

// Or reference tokens directly
<View style={{ backgroundColor: colors.sage, paddingLeft: spacing.lg }}>
```

### Color Palette

Available colors from `@design/tokens`:

- **Primary**: `cream`, `creamDark`, `sage`, `sagePale`, `sageLight`, `moss`
- **Accents**: `gold`, `goldLight`, `goldPale`, `peach`, `lavender`, `sky`, `terracotta`
- **Status**: `error`, `errorPale`, `errorLight`, `success`, `successPale`, `warning`, `warningPale`
- **Text**: `nearBlack`, `warmGray`, `white`
- **Utility**: `border`, `transparent`

### Typography

Font families (weight-specific for React Native):

```typescript
// From design/tokens
fonts: {
  serif: "DMSerifDisplay",          // Headings
  sans: "DMSans",                    // Body (400)
  "sans-medium": "DMSans-Medium",   // Medium (500)
  "sans-semibold": "DMSans-SemiBold", // Semibold (600)
  "sans-bold": "DMSans-Bold",       // Bold (700)
}

// Usage
<Text className="font-serif text-3xl">Big Heading</Text>
<Text className="font-sans text-base">Body text</Text>
<Text className="font-sans-semibold text-lg">Semi-bold label</Text>
```

### Spacing

Scale from `@design/tokens`:

```typescript
spacing: {
  "2xs": "2px",    // Minimal gaps
  xs: "4px",       // Tight spacing
  sm: "8px",       // Small spacing
  md: "12px",      // Medium spacing
  lg: "16px",      // Default padding/margin
  "lg+": "20px",   // Large spacing
  xl: "24px",      // Extra large
  "2xl": "32px",   // Double extra large
  // ...
}

// Usage in NativeWind
<View className="px-lg py-md mx-sm">Content</View>
```

### cn() Utility

Use `cn()` helper to merge Tailwind classes with proper conflict resolution:

```typescript
import { cn } from "@/lib/utils";

function Button({ variant = "primary", className }) {
  return (
    <Pressable className={cn(
      "px-4 py-2 rounded-lg",
      variant === "primary" && "bg-sage",
      variant === "secondary" && "bg-sage-pale",
      className // Allows override
    )}>
      {/* ... */}
    </Pressable>
  );
}
```

### Opacity Tokens

```typescript
opacity: {
  full: 1,       // 100%
  disabled: 0.5, // 50%
  hint: 0.3,     // 30%
}

// Usage
style={{ opacity: opacity.disabled }}
<View className="opacity-50">Disabled</View>
```

### Animation Timings

```typescript
animation: {
  fast: 75,      // 75ms (micro-interactions)
  normal: 250,   // 250ms (standard transitions)
  slow: 500,     // 500ms (delicate animations)
  pressScale: 0.95, // Scale on press
}

// Usage
opacity.value = withTiming(1, { duration: animation.normal });
```
