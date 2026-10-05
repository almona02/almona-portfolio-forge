# Fabricator Navbar Logo Definition

## Overview
The fabricator section uses different logos depending on the context and component. This document defines all logos used in fabricator-related navigation components.

---

## 1. IndustrialNavbar (Main Fabricator Navbar)

**Location**: `src/components/layout/IndustrialNavbar.tsx`  
**Lines**: 342-367

### Logo Type: **Simple Circle SVG**
A minimal, dark-themed circle logo with a single line element.

### SVG Structure:
```tsx
<svg
  width="36"
  height="36"
  viewBox="0 0 100 100"
  className="flex-shrink-0"
  xmlns="http://www.w3.org/2000/svg"
>
  <circle
    cx="50"
    cy="50"
    r="45"
    fill="none"
    stroke="#E8E8E8"
    strokeWidth="2.5"
    strokeLinecap="square"
  />
  <line
    x1="89.84778792366981"
    y1="46.513770290093674"
    x2="96.82115081031205"
    y2="45.903680090860064"
    stroke="#E8E8E8"
    strokeWidth="2.5"
    strokeLinecap="square"
  />
</svg>
```

### Characteristics:
- **Size**: 36x36 pixels
- **Color**: Light gray (#E8E8E8)
- **Style**: Outline only (no fill)
- **Background**: Transparent (no background container)
- **Design**: Minimal circle with a single line element
- **Theme**: Dark theme compatible

### Usage Context:
- Used in the main fabricator navbar (IndustrialNavbar)
- Appears next to "ALMONA" text and "{cockpitOwner} Cockpit" subtitle
- Links to home page (`/`)

---

## 2. MasterLayout (Workflow Header)

**Location**: `src/components/fabricator/MasterLayout.tsx`  
**Lines**: 245-248

### Logo Type: **PrestigeCrownLogo**
The prestige crown logo component representing the ALMONA brand.

### Component Usage:
```tsx
<PrestigeCrownLogo 
  size={44} 
  className="flex-shrink-0" 
/>
```

### Characteristics:
- **Size**: 44px (default)
- **Component**: `src/components/ui/PrestigeCrownLogo.tsx`
- **Design**: 5-peak crown outline
- **Color**: Prestige gold gradient (Amber 400 → 500 → 600)
- **Style**: Outline stroke, no fill
- **Theme**: Prestige "Dark Gold" theme

### SVG Details (from PrestigeCrownLogo.tsx):
- **ViewBox**: `0 0 200 120`
- **Aspect Ratio**: 1.67:1 (wider than tall)
- **Stroke**: Prestige gold gradient
- **Stroke Width**: 6px
- **Fill**: None (transparent)

### Usage Context:
- Used in the MasterLayout header (workflow pages)
- Appears next to "ALMONA" and "Prestige Edition" text
- Represents the premium/prestige branding

---

## 3. EnterpriseSidebar (Sidebar Logo)

**Location**: `src/components/layout/EnterpriseSidebar.tsx`  
**Lines**: 457-468

### Logo Type: **Logo Component (Circular Saw/Gear)**
The animated circular saw/gear icon component.

### Component Usage:
```tsx
<Logo className="w-6 h-6 z-10" />
```

### Characteristics:
- **Size**: 24x24 pixels (w-6 h-6)
- **Component**: `src/components/ui/Logo.tsx`
- **Design**: Circular saw/gear with 24 teeth
- **Background**: Dark theme (`bg-[#0f0f0f]` with `border border-amber-600/20`)
- **Animation**: Rotates on hover, shimmer effect
- **Theme**: Dark background with amber border accent

### SVG Details (from Logo.tsx):
- **ViewBox**: `0 0 100 100`
- **Design**: Circular gear with radial teeth
- **Gradient**: Orange/amber gradient (FF5F1F → FF8C00 → E14A00)
- **Metallic Sheen**: Radial gradient overlay
- **Teeth**: 24 alternating flat and round teeth
- **Center**: Dark circle with white stroke

### Usage Context:
- Used in the EnterpriseSidebar (left sidebar)
- Appears in the header section
- Clickable (navigates to `/fabricator/projects` on single click)
- Has hover animation and shimmer effect

---

## 4. Main Navbar (Non-Fabricator Routes)

**Location**: `src/components/layout/Navbar.tsx`  
**Lines**: 264-266

### Logo Type: **Logo Component (Circular Saw/Gear)**
Same as EnterpriseSidebar, but used in the main application navbar.

### Component Usage:
```tsx
<div className="relative w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 xl:w-12 xl:h-12 2xl:w-14 2xl:h-14">
  <Logo />
</div>
```

### Characteristics:
- **Size**: Responsive (28px to 56px depending on screen size)
- **Component**: Same `Logo` component as sidebar
- **Design**: Circular saw/gear icon
- **Theme**: Gradient text "ALMONA" next to logo

---

## Summary Table

| Component | Logo Type | Size | Color | Background | Location |
|-----------|-----------|------|-------|------------|----------|
| **IndustrialNavbar** | Simple Circle SVG | 36x36px | #E8E8E8 | Transparent | Main fabricator navbar |
| **MasterLayout** | PrestigeCrownLogo | 44px | Amber gradient | Transparent | Workflow header |
| **EnterpriseSidebar** | Logo (Gear) | 24x24px | Orange/Amber | Dark (#0f0f0f) | Left sidebar |
| **Main Navbar** | Logo (Gear) | Responsive | Orange/Amber | Transparent | Main app navbar |

---

## Current Status

✅ **IndustrialNavbar**: Simple circle logo (no background, dark theme)  
✅ **MasterLayout**: PrestigeCrownLogo (crown outline)  
✅ **EnterpriseSidebar**: Logo component (gear with dark background)  
✅ **Main Navbar**: Logo component (gear, responsive)

---

## Notes

- The **IndustrialNavbar** logo was recently updated to remove the orange/amber gradient background and container, leaving only the simple circle outline on a transparent background.
- The **PrestigeCrownLogo** is used specifically for prestige/workflow pages to maintain brand consistency.
- The **Logo** component (gear) is used in sidebars and main navigation for general application branding.

