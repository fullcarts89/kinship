# Stack

## Language & Runtime

- **Language:** TypeScript 5.9.2
- **Runtime:** React Native (0.81.5) via Expo 54.0.0
- **Entry Point:** `expo-router/entry`
- **Node Architectures:** Enabled (app.json `newArchEnabled: true`)

## Framework

- **Expo Router** 6.0.23 — File-based routing with nested tab navigation
- **React** 19.1.0
- **React DOM** 19.1.0 — Web platform support
- **Babel Preset Expo** 55.0.8 with `nativewind` JSX source

## Key Dependencies

### UI & Styling
- **NativeWind** 4.1.23 — TailwindCSS for React Native
- **Tailwind CSS** 3.4.17 (dev)
- **Tailwind Merge** 2.6.0
- **Lucide React Native** 0.469.0 — Icon library

### Animation & Graphics
- **React Native Reanimated** 4.1.1 — Gesture & animation engine
- **React Native SVG** 15.12.1 — SVG rendering
- **Expo Linear Gradient** 15.0.8 — Gradient fills

### Navigation & Routing
- **Expo Router** 6.0.23 — File-based routing
- **React Native Gesture Handler** 2.28.0 — Touch gesture support
- **React Native Screens** 4.16.0 — Native screen containers
- **React Native Safe Area Context** 5.6.2 — Safe area utilities

### Data & State
- **Supabase JS** 2.97.0 — PostgreSQL backend client
- **React Native URL Polyfill** 3.0.0 — Fetch/URL compatibility for React Native

### Media & Native Modules
- **Expo Image Picker** 17.0.10 — Photo library & camera access
- **Expo Contacts** 15.0.11 — Device contacts access (lazy-loaded)
- **Expo Calendar** 15.0.8 — Calendar read/write access
- **Expo Asset** 12.0.12 — Asset management
- **Expo File System** 19.0.21 — File I/O
- **Expo Sharing** 14.0.8 — Share dialog
- **Expo Secure Store** 15.0.8 — Encrypted key-value storage

### Authentication
- **Expo Apple Authentication** 8.0.8 — Native Apple Sign-In
- **Expo Auth Session** 7.0.10 — OAuth flows (Google)
- **Expo Web Browser** 15.0.10 — Web browser for auth flows
- **Expo Crypto** 15.0.8 — Cryptography utilities

### Fonts & Styling
- **@expo-google-fonts/dm-sans** 0.4.2 — DM Sans typeface
- **@expo-google-fonts/dm-serif-display** 0.4.2 — DM Serif Display typeface
- **Expo Font** 14.0.11 — Custom font loading

### System & Configuration
- **Expo Linking** 8.0.11 — Deep linking & URL handling
- **Expo Constants** 18.0.13 — App configuration access
- **Expo Status Bar** 3.0.9 — Status bar styling
- **Expo System UI** 6.0.9 — System UI customization
- **Expo Updates** 29.0.16 — Over-the-air app updates
- **Expo Splash Screen** 31.0.13 — Splash screen management

### Utilities
- **clsx** 2.1.1 — Conditional className utility
- **React Native Worklets** 0.5.1 — High-performance JS worklets
- **React Native Worklets Core** 1.6.3 — Worklets runtime

## Dev Dependencies

- **@babel/core** 7.25.2 — JavaScript compiler
- **@types/react** 19.1.10 — React TypeScript definitions
- **Babel Preset Expo** 54.0.10 — Babel presets for Expo
- **Tailwind CSS** 3.4.17 — Tailwind processor

## Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Project metadata, dependencies, npm scripts |
| `app.json` | Expo configuration: app name, versioning, native permissions, plugins, EAS settings |
| `tsconfig.json` | TypeScript compiler options, path aliases (`@/*` → `src/*`, `@design/*` → `design/*`) |
| `babel.config.js` | Babel configuration with `nativewind/babel` plugin and reanimated plugin |
| `.env` | Supabase credentials (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`) |
| `.mcp.json` | MCP servers for IDE extensions (Figma developer MCP) |
| `eas.json` | EAS (Expo Application Services) build/submit configuration |
| `tailwind.config.js` | Custom Tailwind configuration (if exists) |

## Build & Deploy

### Local Development
```bash
npm start          # Start Expo dev server
npm run ios        # Build for iOS simulator
npm run android    # Build for Android emulator
npm run web        # Run web build
npm run reset-cache # Clear Expo cache
npm run lint       # ESLint
```

### EAS (Expo Application Services)
- **Project ID:** `b2f87ba6-d5b8-4c19-8b76-9fec05b85df4`
- **Updates URL:** `https://u.expo.dev/b2f87ba6-d5b8-4c19-8b76-9fec05b85df4`
- **Runtime Version Policy:** App version-based
- **Build Profiles:**
  - `development` — Internal distribution with dev client
  - `preview` — Internal distribution for testing
  - `production` — Public release with auto-increment versioning

### iOS Deployment
- **Bundle ID:** `com.kinship.app`
- **Apple Sign-In:** Enabled
- **Tablets:** Not supported (portrait-only phone app)

### Android Deployment
- **Package:** `com.kinship.app`
- **Adaptive Icon:** Supported
- **Permissions:**
  - `android.permission.READ_CONTACTS` — Contact import
  - `android.permission.WRITE_CONTACTS` — Contact management
  - `android.permission.READ_CALENDAR` — Calendar sync hints
  - `android.permission.WRITE_CALENDAR` — Event creation

### Web Build
- **Bundler:** Metro
- **Output:** Static
- **Favicon:** `assets/images/favicon.png`

### Splash Screen
- **Image:** `assets/images/splash-icon.png`
- **Resize Mode:** Contain
- **Background Color:** `#FDF7ED` (cream)

### Deep Linking
- **Scheme:** `kinship://`
- **Typed Routes:** Enabled (exhaustive routing checks)
