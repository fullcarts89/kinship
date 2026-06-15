# KinshipGarden — Complete Project Export
**Date**: February 24, 2026  
**Version**: 1.0 — Complete Interactive Prototype  
**Platform**: iOS (iPhone 16 Pro — 390×844 pt)

---

## 🎯 Project Overview

**KinshipGarden** is a friendship CRM built around the metaphor of nurturing relationships like a living garden. This React/TypeScript/Vite web application serves as a complete design system showcase with interactive prototype navigation displayed in iPhone 16 Pro frames.

### Design Personality
- **Warm, emotionally engaging, calm, optimistic**
- **Adult and credible** — never childish or corporate
- **Emotion-first inputs** with progressive disclosure
- **No guilt, urgency, streaks, or metrics**
- Everything is optional with "Skip" always available

### Color Palette
- **Warm Cream Background**: `#FDF7ED`
- **Sage Green Primary**: `#7A9E7E`
- **Moss Green Secondary**: `#4A7055`
- **Soft Gold Accent**: `#D4A853`
- **Near Black**: `#1C1917`
- **Warm Gray**: `#78716C`
- **Sage Pale**: `#EBF3EB`

### Typography
- **Serif**: DM Serif Display (headings, emotional moments)
- **Sans-serif**: DM Sans (body, UI)

---

## 📂 Project Structure

```
kinshipgarden/
├── src/
│   ├── app/
│   │   ├── App.tsx                    # Root component with RouterProvider
│   │   ├── routes.tsx                  # All route definitions
│   │   ├── components/
│   │   │   ├── figma/
│   │   │   │   └── ImageWithFallback.tsx
│   │   │   ├── kinship/
│   │   │   │   ├── DemoDocumentation.tsx
│   │   │   │   ├── Illustrations.tsx
│   │   │   │   ├── PhoneFrame.tsx
│   │   │   │   ├── PresentationMode.tsx
│   │   │   │   ├── ScreenshotExport.tsx
│   │   │   │   └── ShareDemo.tsx
│   │   │   └── ui/                    # shadcn/ui components (43 files)
│   │   └── pages/
│   │       ├── Layout.tsx             # Main layout with sidebar navigation
│   │       ├── DemoIndexPageV2.tsx    # Homepage showcase
│   │       │
│   │       ├── FoundationsPage.tsx
│   │       ├── ComponentsPage.tsx
│   │       │
│   │       ├── OnboardingV2Page.tsx
│   │       ├── ProgressiveOnboardingPageV2.tsx
│   │       ├── AddPersonIntegratedPage.tsx
│   │       ├── ContactImportPage.tsx
│   │       ├── PersonProfilePage.tsx
│   │       ├── MemoryLoopsPage.tsx
│   │       ├── ReachOutPageV2.tsx
│   │       ├── InteractionTimelinePage.tsx
│   │       ├── NotificationsPage.tsx
│   │       ├── NotificationSettingsPage.tsx
│   │       ├── MonetizationPage.tsx
│   │       ├── AccountPrivacyPage.tsx
│   │       │
│   │       └── archive/               # 10 deprecated flows
│   │
│   ├── styles/
│   │   ├── fonts.css                  # Google Fonts import
│   │   ├── theme.css                  # CSS variables & design tokens
│   │   ├── tailwind.css               # Tailwind directives
│   │   └── index.css                  # Global styles
│   │
│   └── index.css
│
├── package.json                        # Dependencies
├── vite.config.ts                      # Vite configuration
├── postcss.config.mjs                  # PostCSS config
│
└── Documentation (*.md files):
    ├── README.md
    ├── QUICK_START.md
    ├── DEMO_GUIDE.md
    ├── DEPLOYMENT.md
    ├── REACH_OUT_FLOW.md
    ├── VISUAL_SUMMARY.md
    ├── VNEXT_QUICK_REFERENCE.md
    └── etc.
```

---

## 🎬 12 Canonical Flow Components

### **1. Onboarding V2** (`/onboarding-v2`) — 6 screens
Emotional swipe intro with real photos → Add first person → Optional memory → Dashboard

### **2. Garden Growth Widget** (`/progressive-onboarding-v2`) — 5 screens
Gentle suggestions (no stats, no reminders) → Shrinks to identity header

### **3. Add Person (Integrated)** (`/add-person-integrated`) — 8 screens
Manual entry → Optional contact enrichment → Interests + custom tag → Memory → Profile

### **4. Bulk Contact Import** (`/contact-import`) — 5 screens
Triggered from dashboard → Multi-select → Relationship assignment → Success

### **5. Person Profile** (`/person-profile`) — 6 screens
Photo → Reach-out buttons → Timeline → Interests → Contact details

### **6. Memory Loops** (`/memory-loops`) — 7 screens
Photo-first capture → Emotion chips → Reflection → Resurfacing

### **7. Reach-Out Flow** (`/reach-out-v2`) — 2 screens
Bridge screen with context → External app opens → Passive follow-up invitation

### **8. Interaction Timeline** (`/interaction-timeline`) — 4 screens
Story-like history (no streaks) → Manual add → Detail views

### **9. Notifications** (`/notifications`) — 9 screens
4 types → Lock screen to destination flows

### **10. Notification Settings** (`/notification-settings`) — 5 screens
Toggles, pause, permission management

### **11. Monetization** (`/monetization`) — 4 screens
Freemium → Conversion screens

### **12. Account & Privacy** (`/account-privacy`) — 18 screens
Auth, settings, data export, account deletion

**Total: 79 unique screens** across 12 canonical flows

---

## 🔧 Technical Stack

### Core
- **React** 18.3.1
- **TypeScript** (via Vite)
- **Vite** 6.3.5
- **React Router** 7.13.0 (Data mode with `createBrowserRouter`)
- **Tailwind CSS** 4.1.12

### UI Libraries
- **Radix UI** (40+ primitives for accessible components)
- **shadcn/ui** (43 component files)
- **Lucide React** (icons)
- **Motion** (framer-motion successor)
- **Recharts** (charts)
- **Sonner** (toasts)

### Forms & Interaction
- **React Hook Form** 7.55.0
- **React DnD** 16.0.1
- **React Slick** (carousels)
- **React Responsive Masonry** (grid layouts)

### Styling
- **class-variance-authority** (CVA)
- **clsx** + **tailwind-merge**

---

## 🎨 Key Design System Components

### PhoneFrame (`/src/app/components/kinship/PhoneFrame.tsx`)
- iPhone 16 Pro frame (390×844)
- Scalable
- Optional labels and step indicators
- Consistent drop shadow and border radius

### Illustrations (`/src/app/components/kinship/Illustrations.tsx`)
Reusable SVG illustrations:
- `<EmptyGardenIllustration />`
- `<GrowingGardenIllustration />`
- `<BloomingGardenIllustration />`
- `<MemorySeedIllustration />`
- All use brand color palette

### Demo Controls
- **PresentationMode**: Clean full-screen prototype view
- **ScreenshotExport**: Individual and batch export
- **DemoDocumentation**: Embedded design guidelines
- **ShareDemo**: Share link generator

---

## 🚀 Routing Architecture

**File**: `/src/app/routes.tsx`

```tsx
import { createBrowserRouter } from "react-router";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: DemoIndexPageV2 },
      { path: "foundations", Component: FoundationsPage },
      { path: "components", Component: ComponentsPage },
      
      // 12 Canonical Flows
      { path: "onboarding-v2", Component: OnboardingV2Page },
      { path: "progressive-onboarding-v2", Component: ProgressiveOnboardingPageV2 },
      { path: "add-person-integrated", Component: AddPersonIntegratedPage },
      { path: "contact-import", Component: ContactImportPage },
      { path: "person-profile", Component: PersonProfilePage },
      { path: "memory-loops", Component: MemoryLoopsPage },
      { path: "reach-out-v2", Component: ReachOutPageV2 },
      { path: "interaction-timeline", Component: InteractionTimelinePage },
      { path: "notifications", Component: NotificationsPage },
      { path: "notification-settings", Component: NotificationSettingsPage },
      { path: "monetization", Component: MonetizationPage },
      { path: "account-privacy", Component: AccountPrivacyPage },
      
      // Archive (10 deprecated flows)
      { path: "archive/onboarding", Component: OnboardingPage },
      { path: "archive/add-seed", Component: AddSeedPage },
      // ... 8 more archive routes
    ],
  },
]);
```

**Main App** (`/src/app/App.tsx`):
```tsx
import { RouterProvider } from "react-router";
import { router } from "./routes";

export default function App() {
  return <RouterProvider router={router} />;
}
```

---

## 🎭 Layout & Navigation

**File**: `/src/app/pages/Layout.tsx`

### Features
- **Sidebar Navigation** (260px fixed width, dark background)
  - Logo and version badge
  - Grouped by sections (Demo, Foundations, Core Demo, Settings & Business, Archive)
  - Active state highlighting with sage green accent
  - Icon + label + sublabel for each item
  
- **Top Breadcrumb Bar**
  - Current page label
  - Platform badge (iOS · iPhone 16 Pro)
  - Version badge (v1.0)
  
- **Main Content Area**
  - Flexible scrollable region
  - Padding: 40px
  - Cream background (`#F5F0EC`)

- **Demo Controls** (bottom-right floating buttons)
  - Presentation Mode toggle
  - Screenshot Export
  - Documentation overlay
  - Share Demo link

---

## 📱 Screen Flow Pattern

Each page follows this structure:

```tsx
export function [PageName]Page() {
  const navigate = useNavigate();

  return (
    <div>
      {/* Page Header */}
      <div>
        <h1 style={{ fontFamily: "DM Serif Display" }}>
          Flow Title
        </h1>
        <p>Description of the flow...</p>
      </div>

      {/* Screen Grid */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
        gap: 40 
      }}>
        <PhoneFrame label="Step 1" stepLabel="1/6">
          {/* Screen content */}
        </PhoneFrame>
        
        <PhoneFrame label="Step 2" stepLabel="2/6">
          {/* Screen content */}
        </PhoneFrame>
      </div>

      {/* Navigation Buttons */}
      <div style={{ marginTop: 60, display: "flex", gap: 16 }}>
        <button onClick={() => navigate("/previous-flow")}>
          ← Previous Flow
        </button>
        <button onClick={() => navigate("/next-flow")}>
          Next Flow →
        </button>
        <button onClick={() => navigate("/")}>
          Back to Demo Index
        </button>
      </div>
    </div>
  );
}
```

---

## 🌿 Design Patterns & Principles

### 1. **Progressive Disclosure**
- Start with core emotional input
- Reveal additional fields only when needed
- "Skip" always available
- No required fields unless absolutely necessary

### 2. **Emotion-First Inputs**
- Chips for emotions ("Grateful", "Connected", "Curious")
- Photos before text
- Context before data entry
- Story-like presentation

### 3. **Garden Metaphor**
- Seeds = New connections
- Watering = Regular check-ins
- Blooming = Thriving relationships
- Garden visualization (never shown as empty/failing)

### 4. **No Guilt/Pressure**
- No streaks
- No metrics (unless user explicitly requests)
- Gentle "suggestions" not "reminders"
- Pause/snooze always available
- Notifications are invitations, not demands

### 5. **Warm Visual Language**
- Rounded corners (12-16px radius)
- Soft shadows
- Pastel color palette
- Generous white space
- Illustrations over icons where possible

### 6. **Accessibility**
- All Radix UI primitives are accessible
- Keyboard navigation
- Screen reader support
- Focus states
- Color contrast compliance

---

## 🔑 Key Components Breakdown

### **PhoneFrame Component**
```tsx
interface PhoneFrameProps {
  children: React.ReactNode;
  scale?: number;
  label?: string;
  stepLabel?: string;
}
```
- Renders iPhone 16 Pro bezel
- Notch simulation
- Dynamic Island space
- Home indicator
- Rounded corners with shadow

### **Illustrations Component**
All illustrations are inline SVG with:
- Semantic naming
- Brand color variables
- Consistent stroke widths
- Scalable viewBox

### **Navigation Pattern**
All 12 canonical flows have:
- Consistent hover-lift styling on navigation buttons
- Previous/Next flow progression
- "Back to Demo Index" escape hatch
- Router-based navigation (no page refreshes)

---

## 📊 Complete Flow Inventory

### ✅ Core Demo (vNext) — 8 Flows
1. Onboarding V2 (6 screens)
2. Garden Growth Widget (5 screens)
3. Add Person (Integrated) (8 screens)
4. Bulk Contact Import (5 screens)
5. Person Profile (6 screens)
6. Memory Loops (7 screens)
7. Reach-Out Flow (2 screens)
8. Interaction Timeline (4 screens)

### ✅ Settings & Business — 4 Flows
9. Notifications (9 screens)
10. Notification Settings (5 screens)
11. Monetization (4 screens)
12. Account & Privacy (18 screens)

### 📦 Archive (Deprecated) — 10 Flows
- Onboarding (Old)
- Progressive Onboarding (Old)
- Add Seed Flow
- Add Person Progressive
- Reach-Out (Old)
- Onboarding Memory Capture
- Today Dashboard
- Memory Flow
- Photo Memory
- Relational Intelligence
- Core Screens

**Total**: 22 page components

---

## 🎨 CSS Architecture

### **Global Styles** (`/src/styles/theme.css`)
- CSS custom properties for colors
- Tailwind v4 theme tokens
- Light/dark mode support (currently light only)
- Typography defaults (h1-h4, p, label, button, input)

### **Font Loading** (`/src/styles/fonts.css`)
```css
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap');
```

### **Tailwind Configuration**
- Using Tailwind CSS v4
- PostCSS with `@tailwindcss/vite` plugin
- No `tailwind.config.js` (uses inline `@theme`)

---

## 🚢 Deployment

### Development
```bash
pnpm install
pnpm dev
```

### Production Build
```bash
pnpm build
```

### Hosting
- Vercel (recommended)
- Netlify
- Any static host
- See `/DEPLOYMENT.md` and `/VERCEL_DEPLOY.md` for detailed instructions

---

## 📚 Documentation Files

The project includes comprehensive markdown documentation:

| File | Purpose |
|------|---------|
| `README.md` | Project overview and setup |
| `QUICK_START.md` | Fast onboarding guide |
| `DEMO_GUIDE.md` | How to navigate the demo |
| `DEPLOYMENT.md` | Hosting instructions |
| `REACH_OUT_FLOW.md` | Detailed reach-out flow design rationale |
| `VISUAL_SUMMARY.md` | Screenshot summary of all flows |
| `VNEXT_QUICK_REFERENCE.md` | vNext canonical flows reference |
| `VNEXT_CLEANUP_SUMMARY.md` | Migration notes from old to new flows |
| `HOW_IT_WORKS.md` | Technical architecture |
| `ATTRIBUTIONS.md` | Third-party credits |

---

## 🔗 Navigation Flow Map

```
Demo Index (/)
  ↓
Foundations (/foundations)
  ↓
Components (/components)
  ↓
┌─────────────────────────────────────────────┐
│ CANONICAL PROTOTYPE FLOW (12 components)    │
├─────────────────────────────────────────────┤
│ 1. Onboarding V2                            │
│ 2. Garden Growth Widget                     │
│ 3. Add Person (Integrated)                  │
│ 4. Bulk Contact Import                      │
│ 5. Person Profile                           │
│ 6. Memory Loops                             │
│ 7. Reach-Out Flow                           │
│ 8. Interaction Timeline                     │
│ 9. Notifications                            │
│ 10. Notification Settings                   │
│ 11. Monetization                            │
│ 12. Account & Privacy                       │
└─────────────────────────────────────────────┘
  ↓
Back to Demo Index
```

Each flow has:
- ← Previous Flow
- → Next Flow  
- 🏠 Back to Demo Index

---

## 🎯 Current State

### ✅ Complete
- All 12 canonical flows implemented
- Interactive prototype navigation on all pages
- Consistent hover-lift button styling
- Full routing architecture with React Router
- Design system documentation
- Presentation mode
- Screenshot export functionality
- Sidebar navigation with active states
- Breadcrumb navigation
- Mobile-first responsive design (iPhone 16 Pro)

### 🎨 Design System Status
- ✅ Color palette established
- ✅ Typography system (DM Serif Display + DM Sans)
- ✅ Component library (43 shadcn/ui components)
- ✅ Illustration library
- ✅ iPhone frame component
- ✅ Consistent spacing and radius tokens

### 📱 Flow Status
All flows are **production-ready** with:
- Multiple screen states
- Step-by-step progression
- Labels and annotations
- Navigation buttons
- Garden metaphor integration
- Emotion-first patterns

---

## 📦 Dependencies Summary

### Production (64 packages)
Key dependencies:
- `react-router@7.13.0`
- `motion@12.23.24` (Framer Motion successor)
- `lucide-react@0.487.0`
- `recharts@2.15.2`
- `sonner@2.0.3`
- `@radix-ui/*` (40+ packages)
- `react-hook-form@7.55.0`
- `react-dnd@16.0.1`
- `react-slick@0.31.0`

### Dev Dependencies (4 packages)
- `@tailwindcss/vite@4.1.12`
- `@vitejs/plugin-react@4.7.0`
- `tailwindcss@4.1.12`
- `vite@6.3.5`

---

## 🔮 Future Considerations

This is a **design system showcase**, not a functional app. For production:

1. **Backend Integration**
   - User authentication
   - Database (e.g., Supabase)
   - Image upload/storage
   - Contact sync APIs

2. **Additional Features**
   - Push notifications (iOS)
   - Background reminders
   - iCloud sync
   - Share extensions

3. **Performance**
   - Code splitting
   - Lazy loading
   - Image optimization
   - Service worker

4. **Testing**
   - Unit tests (Vitest)
   - E2E tests (Playwright)
   - Accessibility audits
   - Performance testing

---

## 🎬 Using This Export

### For LLM Review
This document provides:
- Complete architecture overview
- Component inventory
- Design system specifications
- Navigation structure
- File organization
- Dependencies list

### For Handoff
Share this with:
- **Developers**: Technical stack and component structure
- **Designers**: Design patterns and color palette
- **Product Managers**: Flow descriptions and screen counts
- **Stakeholders**: Demo link and visual summary

### For Documentation
Use as reference for:
- Design system documentation
- Developer onboarding
- Design decision rationale
- Component usage guidelines

---

## 📞 Key Contact Points

### Entry Points
- **Main App**: `/src/app/App.tsx`
- **Routes**: `/src/app/routes.tsx`
- **Layout**: `/src/app/pages/Layout.tsx`
- **Homepage**: `/src/app/pages/DemoIndexPageV2.tsx`

### Design System
- **Colors**: `/src/styles/theme.css` (lines 1-120)
- **Fonts**: `/src/styles/fonts.css`
- **Components**: `/src/app/components/ui/*` (43 files)
- **Kinship Components**: `/src/app/components/kinship/*` (6 files)

### Documentation
- **Quick Start**: `/QUICK_START.md`
- **Demo Guide**: `/DEMO_GUIDE.md`
- **Deployment**: `/DEPLOYMENT.md`

---

## 🎨 Visual Summary

All 12 canonical flows are complete with:
- **79 unique screens** total
- **Consistent visual language** (warm cream, sage green, DM typography)
- **Interactive navigation** between all flows
- **iPhone 16 Pro frames** for all screens
- **Hover states** and transitions
- **Design system documentation** embedded

---

## ✨ Special Features

### 1. Presentation Mode
Full-screen, distraction-free prototype view

### 2. Screenshot Export
- Individual screen export
- Batch export all screens
- PNG format, 2x resolution

### 3. Demo Documentation Overlay
Embedded design guidelines and pattern library

### 4. Share Demo
Generate shareable links to specific flows

### 5. Responsive Sidebar
Collapsible navigation with search and filtering

---

## 🏁 Conclusion

**KinshipGarden Design System v1.0** is a complete, interactive prototype showcase with:
- ✅ 12 canonical user flows
- ✅ 79 unique screens
- ✅ Full navigation architecture
- ✅ Production-ready component library
- ✅ Comprehensive documentation
- ✅ Export and presentation tools

**Status**: Ready for stakeholder review, developer handoff, or further iteration.

**Last Updated**: February 24, 2026

---

*This export document was generated for LLM review and team handoff. For the latest version, refer to the live codebase.*
