# Testing

## Framework

**Current Status:** No testing framework is configured in the project.

The project does **not currently have Jest, Vitest, or any unit/integration test framework** set up. There are:
- No `.test.ts`, `.test.tsx`, `.spec.ts`, or `.spec.tsx` files in the codebase
- No Jest configuration in `package.json` or `.jest.config.js`
- No testing libraries in `devDependencies` (no `jest`, `@testing-library/react-native`, etc.)
- No test script in `package.json`

## Recommended Testing Setup

### Add Testing Dependencies

```bash
npm install --save-dev \
  jest \
  @testing-library/react-native \
  @testing-library/react-hooks \
  jest-mock-extended \
  @types/jest
```

### Update package.json

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "devDependencies": {
    "@testing-library/react-native": "^12.0.0",
    "@testing-library/react-hooks": "^8.0.0",
    "@types/jest": "^29.5.0",
    "jest": "^29.5.0",
    "jest-mock-extended": "^3.0.0"
  }
}
```

### Create jest.config.js

```javascript
module.exports = {
  preset: "react-native",
  setupFilesAfterEnv: ["<rootDir>/.jest/setup.js"],
  testEnvironment: "node",
  testPathIgnorePatterns: ["/node_modules/", "/.expo/"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@design/(.*)$": "<rootDir>/design/$1",
  },
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": ["babel-jest", { presets: ["babel-preset-expo"] }],
  },
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "app/**/*.{ts,tsx}",
    "!**/*.d.ts",
    "!**/node_modules/**",
    "!**/__tests__/**",
  ],
};
```

### Create .jest/setup.js

```javascript
// Mock Expo modules
jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
  useFocusEffect: jest.fn((cb) => {
    // Execute callback immediately in tests
    React.useEffect(cb, []);
  }),
  useLocalSearchParams: jest.fn(),
  Stack: { Screen: jest.fn() },
}));

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

jest.mock("@/lib/supabase", () => ({
  supabase: null, // Mock as unconfigured
}));
```

## Test Structure

### Unit Tests (Pure Functions)

Test pure utility functions and library modules:

```typescript
// src/lib/growthEngine.ts
export function getStageFromPoints(points: number): GrowthStage {
  for (const { min, stage } of STAGE_THRESHOLDS) {
    if (points >= min) return stage;
  }
  return "seed";
}

// __tests__/lib/growthEngine.test.ts
describe("growthEngine", () => {
  describe("getStageFromPoints", () => {
    it("returns 'seed' for 0 points", () => {
      expect(getStageFromPoints(0)).toBe("seed");
    });

    it("returns 'sprout' for 2 points", () => {
      expect(getStageFromPoints(2)).toBe("sprout");
    });

    it("returns 'tree' for 27+ points", () => {
      expect(getStageFromPoints(27)).toBe("tree");
      expect(getStageFromPoints(50)).toBe("tree");
    });
  });

  describe("isMeaningfulMemory", () => {
    it("returns true if emotion is not null", () => {
      const memory = { emotion: "joyful", content: "short" };
      expect(isMeaningfulMemory(memory)).toBe(true);
    });

    it("returns true if content length >= 140", () => {
      const memory = { emotion: null, content: "x".repeat(140) };
      expect(isMeaningfulMemory(memory)).toBe(true);
    });

    it("returns false otherwise", () => {
      const memory = { emotion: null, content: "short text" };
      expect(isMeaningfulMemory(memory)).toBe(false);
    });
  });
});
```

### Service Tests

Mock Supabase and test CRUD operations:

```typescript
// __tests__/services/personService.test.ts
import * as personService from "@/services/personService";
import { supabase } from "@/lib/supabase";
import { getAuthUserId } from "@/lib/auth";

jest.mock("@/lib/supabase");
jest.mock("@/lib/auth");

describe("personService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getPersons", () => {
    it("fetches persons for authenticated user", async () => {
      const mockUserId = "user-123";
      const mockPersons = [
        { id: "p1", name: "Alice", user_id: mockUserId, /* ... */ },
      ];

      (getAuthUserId as jest.Mock).mockResolvedValue(mockUserId);
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnValue({
          data: mockPersons,
          error: null,
        }),
      });

      const result = await personService.getPersons();
      expect(result).toEqual(mockPersons);
    });

    it("throws if Supabase is not configured", async () => {
      (supabase as any) = null;
      await expect(personService.getPersons()).rejects.toThrow(
        "Supabase not configured"
      );
    });
  });
});
```

### Hook Tests

Use `@testing-library/react-hooks` for testing custom hooks:

```typescript
// __tests__/hooks/useGrowth.test.ts
import { renderHook, act } from "@testing-library/react-hooks";
import { usePersonGrowth } from "@/hooks/useGrowth";
import * as growthEngine from "@/lib/growthEngine";

jest.mock("@/lib/growthEngine");

describe("usePersonGrowth", () => {
  it("returns growth info for a person", () => {
    const mockGrowthInfo = {
      stage: "sprout",
      label: "Sprouting",
      points: 3,
    };

    (growthEngine.getGrowthInfo as jest.Mock).mockReturnValue(mockGrowthInfo);
    (growthEngine.hasRecentTransition as jest.Mock).mockReturnValue(false);

    const { result } = renderHook(() => usePersonGrowth("person-1"));

    expect(result.current).toEqual({
      ...mockGrowthInfo,
      justTransitioned: false,
    });
  });

  it("resubscribes when personId changes", () => {
    const { rerender } = renderHook(
      ({ personId }) => usePersonGrowth(personId),
      { initialProps: { personId: "person-1" } }
    );

    rerender({ personId: "person-2" });

    // Verify subscription was updated
    expect(growthEngine.subscribeToGrowth).toHaveBeenCalledTimes(2);
  });
});
```

### Component Tests

Test components with React Native Testing Library:

```typescript
// __tests__/components/ui/Button.test.tsx
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { Button } from "@/components/ui";

describe("Button", () => {
  it("renders with label text", () => {
    const { getByText } = render(<Button>Click me</Button>);
    expect(getByText("Click me")).toBeTruthy();
  });

  it("calls onPress when pressed", () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <Button onPress={onPress}>Click me</Button>
    );

    fireEvent.press(getByRole("button"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("displays loading spinner when loading=true", () => {
    const { getByTestId } = render(<Button loading>Save</Button>);
    expect(getByTestId("loading-spinner")).toBeTruthy();
  });

  it("disables when disabled=true", () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <Button disabled onPress={onPress}>
        Disabled
      </Button>
    );

    const button = getByRole("button");
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  describe("variants", () => {
    it("applies primary variant styles", () => {
      const { getByRole } = render(
        <Button variant="primary">Primary</Button>
      );
      expect(getByRole("button")).toHaveStyle({
        backgroundColor: colors.sage,
      });
    });

    it("applies outline variant styles", () => {
      const { getByRole } = render(
        <Button variant="outline">Outline</Button>
      );
      const button = getByRole("button");
      expect(button).toHaveStyle({
        borderColor: colors.sage,
      });
    });
  });
});
```

## Mocking Patterns

### Mock Expo Router

```typescript
jest.mock("expo-router", () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  })),
  useFocusEffect: jest.fn((cb) => {
    // Execute callback in test
    React.useEffect(cb, []);
  }),
  useLocalSearchParams: jest.fn(() => ({})),
}));
```

### Mock Supabase Client

```typescript
jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn((table) => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: mockData,
        error: null,
      }),
    })),
  },
}));
```

### Mock Module-Level State

For hooks that depend on module-level shared state (e.g., `usePersonGrowth`, `useOrientation`):

```typescript
// __tests__/hooks/useOrientation.test.ts
jest.resetModules(); // Clear module cache before each test

let orientationModule: any;

beforeEach(() => {
  orientationModule = require("@/hooks/useOrientation");
});

it("loads persisted status from SecureStore", async () => {
  const { useOrientation } = orientationModule;

  // SecureStore is mocked by setup.js
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValue("completed");

  const { result, waitForNextUpdate } = renderHook(() => useOrientation());

  await waitForNextUpdate();

  expect(result.current.isActive).toBe(false);
});
```

### Mock Animations

```typescript
jest.mock("react-native-reanimated", () => ({
  ...jest.requireActual("react-native-reanimated"),
  useSharedValue: jest.fn((val) => ({ value: val })),
  useAnimatedStyle: jest.fn(() => ({})),
  withTiming: jest.fn((val) => val),
  withDelay: jest.fn((_delay, val) => val),
}));
```

## Coverage

### Target Coverage Metrics

Once testing infrastructure is in place, aim for:

- **Statements:** > 70% (core business logic must be tested)
- **Branches:** > 60% (key decision paths)
- **Functions:** > 70% (all public functions)
- **Lines:** > 70% (actual code lines)

### Focus Areas (Priority Order)

1. **Growth Engine** (`src/lib/growthEngine.ts`) — Core calculation logic (100% target)
2. **Services** (`src/services/*`) — Data persistence layer (80% target)
3. **Utilities** (`src/lib/formatters.ts`, `src/lib/utils.ts`) — Pure functions (100% target)
4. **Hooks** (`src/hooks/*`) — State management (70% target)
5. **UI Components** — Integration tests, not detailed implementation (40-50% target)

### Coverage Report

```bash
npm run test:coverage

# Generates coverage report in ./coverage/
# View HTML report: open coverage/lcov-report/index.html
```

## Running Tests

### Commands

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-run on file changes)
npm run test:watch

# Run specific test file
npm test -- Button.test.tsx

# Run tests matching pattern
npm test -- --testNamePattern="usePersonGrowth"

# Generate coverage report
npm run test:coverage

# Run with verbose output
npm test -- --verbose
```

### Environment Variables for Tests

Create `.env.test`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://mock-supabase.com
EXPO_PUBLIC_SUPABASE_ANON_KEY=mock-anon-key
```

Load in `jest.config.js`:

```javascript
process.env.NODE_ENV = "test";
require("dotenv").config({ path: ".env.test" });
```

### Continuous Integration

Example GitHub Actions workflow (`.github/workflows/test.yml`):

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - run: npm ci
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

## Important Notes

### Async Testing

Always await promises in tests:

```typescript
// Good
it("fetches data", async () => {
  const result = await getPersons();
  expect(result).toEqual([...]);
});

// Good with act()
it("updates state", async () => {
  const { result } = renderHook(() => usePersonGrowth("p1"));

  await act(async () => {
    // Trigger state updates
  });

  expect(result.current.stage).toBe("sprout");
});
```

### useFocusEffect in Tests

The mock in setup.js executes `useFocusEffect` callbacks immediately:

```typescript
jest.mock("expo-router", () => ({
  useFocusEffect: jest.fn((cb) => {
    React.useEffect(cb, []);
  }),
}));
```

This ensures focus effects run in tests just like in real usage.

### NativeWind and Styling

NativeWind className tests are usually not worth testing (TailwindCSS handles consistency). Instead, test component behavior and state.

### Snapshot Testing

Use snapshots **sparingly** for component structure only:

```typescript
it("renders with correct structure", () => {
  const { getByRole } = render(
    <Button variant="primary">Click me</Button>
  );
  expect(getByRole("button")).toMatchSnapshot();
});
```

Avoid snapshot tests for props-driven behavior or styles (they break easily and provide little value).
