# ALMONA Fabricator Pro - Dark Gold Prestige Design System
## Complete UX/UI Specification v1.0

**Status:** 🏆 ULTRA-PRESTIGE EDITION  
**Theme:** Dark Gold Luxury (Orgadata + Klaes + iWindow + Moxisys Inspired)  
**Target:** Enterprise-Grade Fabrication Software  
**Date:** January 2026

---

## 🎨 Design Philosophy

### Core Principles
- **Industrial Elegance** - Professional power meets luxury aesthetics
- **Constitutional Transparency** - Algorithm rationale always visible
- **Workflow Momentum** - Minimal friction between steps
- **Visual Confidence** - Real-time validation and live data
- **Premium Perception** - Every pixel screams quality

### Color Palette (Dark Gold Prestige)

```
PRIMARY COLORS:
├── Slate 900: #0f172a (Primary background)
├── Slate 800: #1e293b (Secondary background)
├── Slate 700: #334155 (Tertiary background)
└── Slate 950: #020617 (Deep accents)

PRESTIGE ACCENTS:
├── Amber 400: #fbbf24 (Gold primary accent)
├── Amber 500: #f59e0b (Gold secondary accent)
├── Cyan 400: #22d3ee (Technology accent)
├── Emerald 400: #4ade80 (Success/Validation)
└── Orange 500: #f97316 (Warnings/Highlights)

GLASS MORPHISM:
├── Background: rgba(15, 23, 42, 0.6)
├── Border: rgba(245, 158, 11, 0.2)
└── Blur: 20px backdrop-filter
```

### Typography System

```
HEADERS:
├── H1: 32px, 700 weight, 0.05em tracking, uppercase
├── H2: 24px, 700 weight, 0.05em tracking, uppercase
├── H3: 18px, 600 weight, 0.03em tracking, uppercase
└── H4: 14px, 600 weight, 0.02em tracking, uppercase

BODY:
├── Regular: 14px, 400 weight, 1.5 line-height
├── Medium: 14px, 500 weight, 1.5 line-height
└── Small: 12px, 400 weight, 1.4 line-height

LABELS:
├── Standard: 12px, 500 weight, 0.05em tracking, uppercase
└── Compact: 11px, 500 weight, 0.05em tracking, uppercase
```

### Spacing System (4px base)

```
XS:  4px
SM:  8px
MD:  16px
LG:  24px
XL:  32px
2XL: 48px
3XL: 64px
```

### Shadow System

```
SUBTLE:    0 1px 2px rgba(245, 158, 11, 0.05)
CARD:      0 4px 6px rgba(245, 158, 11, 0.1)
ELEVATED:  0 10px 15px rgba(245, 158, 11, 0.15)
PREMIUM:   0 25px 50px rgba(245, 158, 11, 0.25)
GLOW:      0 0 20px rgba(245, 158, 11, 0.3)
```

---

## 🏗️ Layout Architecture

### Master Layout (All Pages)

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER BAR (64px)                                           │
│ ├─ Logo + Brand                                             │
│ ├─ Breadcrumb Navigation                                    │
│ └─ User Menu + Settings                                     │
├─────────────────────────────────────────────────────────────┤
│ PROGRESS STEPPER (80px)                                     │
│ ├─ Phase 1: Design                                          │
│ ├─ Phase 2: Configure                                       │
│ ├─ Phase 3: Validate                                        │
│ ├─ Phase 4: Optimize                                        │
│ └─ Phase 5: Export                                          │
├─────────────────────────────────────────────────────────────┤
│ MAIN WORKSPACE (Flex)                                       │
│ ├─ Left Sidebar (280px, collapsible)                        │
│ ├─ Center Canvas (Flex, 60%)                                │
│ └─ Right Dashboard (400px, collapsible)                     │
├─────────────────────────────────────────────────────────────┤
│ FOOTER BAR (48px)                                           │
│ ├─ Constitutional Badge                                     │
│ ├─ Live Metrics                                             │
│ └─ Status Indicators                                        │
└─────────────────────────────────────────────────────────────┘
```

### Responsive Breakpoints

```
DESKTOP (1440px+):
├─ 3-column layout (280 | flex | 400)
├─ All panels visible
└─ Full feature set

LAPTOP (1280-1439px):
├─ 3-column layout (collapsible sidebar)
├─ Right panel sticky
└─ Floating algorithm panel

TABLET (768-1279px):
├─ 2-column layout (left drawer | center)
├─ Right panel as bottom sheet
└─ Simplified controls

MOBILE (<768px):
├─ 1-column layout
├─ Bottom sheet navigation
└─ Stepwise workflow
```

---

## 📄 Page Specifications

### PAGE 1: FABRICATOR DASHBOARD (Entry Point)

**Purpose:** Unified entry for all users - pilot to enterprise

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ HEADER: ALMONA Fabricator Pro                              │
│ [Logo] [Breadcrumb] [User Menu]                            │
├─────────────────────────────────────────────────────────────┤
│ HERO SECTION (Full Width)                                  │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ Welcome Back, [User]                                  │  │
│ │ "Precision Fabrication Starts Here"                   │  │
│ │                                                       │  │
│ │ [New Project] [Recent Projects] [Templates]          │  │
│ └──────────────────────────────────────────────���────────┘  │
├─────────────────────────────────────────────────────────────┤
│ QUICK STATS (4-Column Grid)                                │
│ ┌──────────┬──────────┬──────────┬──────────┐              │
│ │ Projects │ Designs  │ Exports  │ Accuracy │              │
│ │    24    │   156    │   89     │  99.8%   │              │
│ └──────────┴──────────┴──────────┴──────────┘              │
├─────────────────────────────────────────────────────────────┤
│ RECENT PROJECTS (Card Grid)                                │
│ ┌──────────────┬──────────────┬──────────────┐             │
│ │ Project 1    │ Project 2    │ Project 3    │             │
│ │ [Thumbnail]  │ [Thumbnail]  │ [Thumbnail]  │             │
│ │ 24 units     │ 18 units     │ 32 units     │             │
│ ��� [Open]       │ [Open]       │ [Open]       │             │
│ └──────────────┴──────────────┴──────────────┘             │
├─────────────────────────────────────────────────────────────┤
│ TEMPLATES LIBRARY (Horizontal Scroll)                      │
│ [Modern Window] [Commercial] [Industrial] [Custom] [+]     │
├─────────────────────────────────────────────────────────────┤
│ FOOTER: Constitutional Badge + Status                      │
└─────────────────────────────────────────────────────────────┘
```

**Design Elements:**
- Hero gradient background (dark slate to amber)
- Card-based project display with thumbnails
- Quick action buttons (New Project, Import, Templates)
- Live stats with animated counters
- Constitutional compliance badge (bottom)

---

### PAGE 2: ENGINEERING BAY (Main Workspace)

**Purpose:** Core design and configuration interface

**Three-Column Layout:**

```
┌──────────────┬────────────────────────┬──────────────┐
│   LEFT       │       CENTER           │    RIGHT     │
│  SIDEBAR     │      CANVAS            │  DASHBOARD   │
│  (280px)     │      (Flex)            │   (400px)    │
├──────────────┼────────────────────────┼──────────────┤
│              │                        │              │
│ ▼ System     │  ┌──────────────────┐  │ ▼ 3D Preview │
│   Pack       │  │                  │  │   (320px)    │
│              │  │  SmartDraw       │  │              │
│ ▼ Profiles   │  │  Canvas          │  │ ▼ Validation │
│   (Auto)     │  │                  │  │   Matrix     │
│              │  │  [Grid Editor]   │  │              │
│ ▼ Hardware   │  │                  │  │ ▼ Live BOM   │
│   Config     │  │  [Floating Algo] │  │   Cards      │
│              │  │                  │  │              │
│ ▼ Validation │  │                  │  │ ▼ Export     │
���   Status     │  │                  │  │   Grid       │
│              │  └──────────────────┘  │              │
│ 🛡️ Tier 3    │                        │              │
│ Compliant    │                        │              │
└──────────────┴────────────────────────┴──────────────┘
```

**LEFT SIDEBAR (280px):**

```
┌─────────────────────────────┐
│ SYSTEM CONFIGURATION        │
├─────────────────────────────┤
│ ▼ System Pack Selection     │
│   [Dropdown: Caluminium PS] │
│   ✓ Auto-assigned           │
│                             │
│ ▼ Profile Matrix            │
│   Frame:    CAL-FR-001 ✓    │
│   Sash:     CAL-SA-002 ✓    │
│   Mullion:  CAL-MU-003 ✓    │
│   Transom:  CAL-TR-004 ✓    │
│                             │
│ ▼ Hardware Configuration    │
│   Hinges:   Heavy-duty ✓    │
│   Locks:    Multi-point ✓   │
│   Handles:  Tilt-turn ✓     │
│                             │
│ ▼ Geometry Tuning           │
│   Corner Mitres: 45° ✓      │
│   Drainage: Auto ✓          │
│   Gaskets: Standard ✓       │
│                             │
│ ┌─────────────────────────┐ │
│ │ 🛡️ TIER 3 PROTECTED    │ │
│ │ 99.8% Accuracy         │ │
│ │ Constitutional Compliant│ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

**CENTER CANVAS (Flex):**

```
┌─────────────────────────────────────────┐
│ TOOLBAR (48px)                          │
│ [Grid Size] | [Cell Types] | [Mullions]│
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │                                 │   │
│  │  SmartDraw Canvas               │   │
│  │  [Interactive Grid Editor]      │   │
│  │                                 │   │
│  │  ┌─────┬─────┬─────┐           │   │
│  │  │ F   │ S   │ F   │           │   │
│  │  ├─────┼─────┼─────┤           │   │
│  │  │ S   │ F   │ S   │           │   │
│  │  └─────┴─────┴─────┘           │   │
│  │                                 │   │
│  │  [Floating Algorithm Panel]     │   │
│  │  ⚡ Greedy Algorithm            │   │
│  │  Rule 1.1: <50 cuts            │   │
│  │  Waste: 15-20%                 │   │
│  │  Duration: <100ms              │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

**RIGHT DASHBOARD (400px):**

```
┌─────────────────────────────┐
│ INTELLIGENCE DASHBOARD      │
├─────────────────────────────┤
│                             │
│ 3D PREVIEW (320×240px)      │
│ ┌─────────────────────────┐ │
│ │ [Three.js Viewport]     │ │
│ │ [Scan Line Effect]      │ │
│ │ [Loading State]         │ │
│ └─────────────────────────┘ │
│                             │
│ VALIDATION MATRIX           │
│ ✓ Grid dimensions           │
│ ✓ Profile assignments       │
│ ✓ Hardware compatibility    │
│ ⚠ Thermal performance       │
│                             │
│ LIVE BOM CARDS              │
│ ┌─────────────────────────┐ │
│ │ Profiles: 17.6m         │ │
│ │ EGP 12,450              │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ Glass: 3.84m²           │ │
│ │ EGP 5,760               │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ Hardware: 12 pcs        │ │
│ │ EGP 2,400               │ │
│ └─────────────────────────┘ │
│                             │
│ TOTAL: EGP 20,610           │
│ 👑 Premium Quality          │
│                             │
│ EXPORT GRID (2×2)           │
│ [���� PDF] [📊 Excel]         │
│ [🔧 DXF] [📋 CNC]           │
│                             │
└─────────────────────────────┘
```

---

### PAGE 3: SMARTDRAW CANVAS (Detailed)

**Purpose:** Interactive grid editor with real-time feedback

**Features:**

```
TOOLBAR (Premium):
┌─────────────────────────────────────────────────────┐
│ [Grid Size: 3×2] | [Cell Types] | [Mullions] | [+] │
│ [Fixed] [Casement] [Tilt-Turn] [Pivot] [Sliding]   │
└─────────────────────────────────────────────────────┘

CANVAS (Interactive):
┌─────────────────────────────────────────────────────┐
│                                                     │
│  ┌─────────┬─────────┬─────────┐                   │
│  │ FIXED   │ SASH ←  │ FIXED   │                   │
│  │ (Blue)  │ (Green) │ (Blue)  │                   │
│  ├─────────┼────���────┼─────────┤                   │
│  │ SASH →  │ FIXED   │ SASH ←  │                   │
│  │ (Green) │ (Blue)  │ (Green) │                   │
│  └─────────┴─────────┴─────────┘                   │
│                                                     │
│  Dimensions: 2400mm × 1600mm                       │
│  800mm per column | 800mm per row                  │
│                                                     │
└─────────────────────────────────────────────────────┘

LEGEND:
🔵 Fixed (Blue)      - Non-opening
🟢 Casement (Green)  - Side-opening
🟣 Tilt-Turn (Purple)- Dual-opening
🟡 Pivot (Yellow)    - Pivot-opening
🟠 Sliding (Orange)  - Horizontal-sliding
```

**Cell Interaction:**
- Click to cycle through types
- Drag to resize
- Hover for dimensions
- Right-click for options
- Color-coded validation (green=valid, amber=warning, red=error)

---

### PAGE 4: PROFILE TUNING STUDIO

**Purpose:** System pack and profile configuration

**Layout:**

```
┌───────────────��─────────────────────────────────────┐
│ PROFILE TUNING STUDIO                               │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ▼ SYSTEM PACK SELECTION                             │
│   ┌─────────────────────────────────────────────┐   │
│   │ Caluminium PS v3 (60mm)                     │   │
│   │ ✓ Auto-assigned from project                │   │
│   │ Thermal: U=1.2 W/m²K                        │   │
│   │ [Change System]                             │   │
│   └─────────────────────────────────────────────┘   │
│                                                     │
│ ▼ PROFILE MATRIX (Auto-Assigned ✓)                 │
│   ┌─────────────────────────────────────────────┐   │
│   │ Frame:    CAL-FR-001 (60×60mm)              │   ���
│   │ Sash:     CAL-SA-002 (50×50mm)              │   │
│   │ Mullion:  CAL-MU-003 (40×40mm)              │   │
│   │ Transom:  CAL-TR-004 (40×40mm)              │   │
│   │ Bead:     CAL-BE-005 (20×20mm)              │   │
│   │ [Manual Override]                           │   │
│   └─────────────────────────────────────────────┘   │
│                                                     │
│ ▼ GEOMETRY TUNING (88% Complete)                    │
│   ┌─────────────────────────────────────────────┐   │
│   │ Corner Mitres:     45° ✓                    │   │
│   │ Drainage Holes:    Auto ✓                   │   │
│   │ Gasket Channels:   Standard ✓               │   │
│   │ Reinforcement:     Auto ✓                   │   │
│   │ [Advanced Options]                          │   │
│   └─────────────────────────────────────────────┘   │
│                                                     │
│ ▼ HARDWARE CONFIGURATION                            │
│   ┌���────────────────────────────────────────────┐   │
│   │ Hinges:    Heavy-duty (2 per sash) ✓        │   │
│   │ Locks:     Multi-point (1 per sash) ✓       │   │
│   │ Handles:   Tilt-turn (Roto NT) ✓            │   │
│   │ Gaskets:   EPDM (Standard) ✓                │   │
│   │ [Customize]                                 │   │
│   └─────────────────────────────────────────────┘   │
│                                                     │
│ [✓ Validate] [← Back] [Next →]                     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

### PAGE 5: OPTIMIZATION & ALGORITHM PANEL

**Purpose:** Cut list optimization with transparent algorithm selection

**Floating Panel (Bottom-Right):**

```
┌─────────────────────────────────────┐
│ ⚡ ALGORITHM SELECTION              │
├──────────────────��──────────────────┤
│                                     │
│ Selected: GREEDY HEURISTIC          │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Selection Rationale:            │ │
│ │                                 │ │
│ │ Rule 1.1: <50 cuts detected     │ │
│ │ → Greedy algorithm selected     │ │
│ │                                 │ │
│ │ Expected Waste: 15-20%          │ │
│ │ Expected Duration: <100ms       │ │
│ │                                 │ │
│ │ 🛡️ Tier 3 Deterministic        │ │
│ │ 📊 99.8% Accuracy Framework     │ │
│ │ ✓ Constitutional Compliant      │ │
│ │                                 │ │
│ │ [Learn More] [View Rationale]   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Run Optimization] [Cancel]         │
│                                     │
└─────────────────────────────────────┘
```

**Optimization Results Panel:**

```
┌────��────────────────────────────────────────────────┐
│ OPTIMIZATION RESULTS                                │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Algorithm: Greedy Heuristic                         │
│ Status: ✓ Complete (87ms)                           │
│                                                     │
│ METRICS:                                            │
│ ├─ Total Cuts: 42                                   │
│ ├─ Stock Utilization: 87.3%                         │
│ ├─ Waste: 12.7% (1,524mm)                           │
│ ├─ Remnants: 3 pieces                               │
│ └─ Estimated Time: 2.5 hours                        │
│                                                     │
│ CUTTING PLAN:                                       │
│ ├─ Stock 1 (6000mm): 5 cuts, 87% utilized          │
│ ├─ Stock 2 (6000mm): 4 cuts, 89% utilized          │
│ ├─ Stock 3 (6000mm): 3 cuts, 91% utilized          │
│ └─ Remnants: 1,524mm (for future use)              │
��                                                     │
│ [✓ Accept] [Optimize Again] [Export Plan]          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

### PAGE 6: PRODUCTION SCHEDULE

**Purpose:** Manufacturing timeline and resource allocation

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│ PRODUCTION SCHEDULE                                 │
├─────────────────────────────────��───────────────────┤
│                                                     │
│ PROJECT: Villa Complex North - Unit A               │
│ Status: Ready for Production ✓                      │
│ Estimated Duration: 2.5 hours                       │
│                                                     │
│ TIMELINE:                                           │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 09:00 - 09:15 │ Setup & Material Prep          │ │
│ │ 09:15 - 10:30 │ Profile Cutting (42 cuts)      │ │
│ │ 10:30 - 11:00 │ Break                          │ │
│ │ 11:00 - 12:00 │ Assembly & Welding             │ │
│ │ 12:00 - 12:30 │ Hardware Installation          │ │
│ │ 12:30 - 13:00 │ Quality Check                  │ │
│ │ 13:00 - 13:15 │ Packaging & Labeling           │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ RESOURCE ALLOCATION:                                │
│ ├─ Machine 1 (DC Saw): 09:15 - 10:30 (75% util)   │
│ ├─ Machine 2 (CNC): 11:00 - 12:00 (60% util)      │
│ ├─ Technician 1: Full shift                        │
│ └─ Technician 2: 11:00 - 13:15                     │
│                                                     │
│ MATERIAL REQUIREMENTS:                              │
│ ├─ Profiles: 17.6m (3 stock pieces)                │
│ ├─ Glass: 3.84m² (4 panes)                         │
│ ├─ Hardware: 12 pieces                             │
│ └─ Accessories: 8 pieces                           │
│                                                     │
│ [Print Schedule] [Export to ERP] [Start Production]│
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

### PAGE 7: QUALITY CONTROL

**Purpose:** Final inspection and compliance verification

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│ QUALITY CONTROL CHECKLIST                           │
├─────────────────────────────────────────────────────┤
│                                                     │
│ PROJECT: Villa Complex North - Unit A               │
│ Inspector: Ahmed Hassan                             │
│ Date: 2026-01-15                                    │
│                                                     │
│ DIMENSIONAL VERIFICATION:                           │
│ ┌─────────────────────────────────────────────────┐ │
│ │ ✓ Overall Width: 2400mm (±2mm)                 │ │
│ │ ✓ Overall Height: 1600mm (±2mm)                │ │
│ │ ✓ Diagonal: 2828mm (±3mm)                      │ │
│ │ ✓ Squareness: 0.5mm (acceptable)               │ │
│ │ ✓ Flatness: 1mm (acceptable)                   │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ MATERIAL QUALITY:                                   │
│ ┌─────────────────────────────────────────────────┐ │
│ │ ✓ Profile Finish: Grade A                      │ │
│ │ ✓ Welds: No defects                            │ │
│ │ ✓ Glass: No scratches/cracks                   │ │
│ │ ✓ Hardware: All functional                     │ │
│ │ ✓ Gaskets: Properly seated                     │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ FUNCTIONAL TESTING:                                 │
│ ┌─────────────────────────────────────────────────┐ │
│ │ ✓ Opening Mechanism: Smooth                    │ │
│ │ ✓ Locking: Secure (3-point)                    │ │
│ │ ✓ Weatherproofing: Sealed                      │ │
│ │ ✓ Thermal: U=1.2 W/m²K (verified)              │ │
│ │ ✓ Noise: <30dB (acceptable)                    │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ COMPLIANCE VERIFICATION:                            │
│ ┌─────────────────────────────────────────────────┐ │
│ │ ✓ EN 14351-1 (Performance)                     │ │
│ │ ✓ ASTM E1300 (Glass)                           │ │
│ │ ✓ ISO 9001 (Quality Management)                │ │
│ │ ✓ Constitutional Tier 3 (AICS-001)             │ │
│ └──���──────────────────────────────────────────────┘ │
│                                                     │
│ FINAL VERDICT: ✅ APPROVED FOR DELIVERY             │
│                                                     │
│ [Print Report] [Sign Off] [Archive] [Ship]         │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 🎨 Component Library (Prestige Theme)

### Buttons

```
PRIMARY (Gold):
┌─────────────────────┐
│ ✓ Confirm Design    │ (Amber-500, hover: Amber-400)
└─────────────────────┘

SECONDARY (Slate):
┌─────────────────────┐
│ ← Back              │ (Slate-700, hover: Slate-600)
└─────────────────────┘

ACCENT (Cyan):
┌─────────────────────┐
│ 🔧 Advanced Options │ (Cyan-400, hover: Cyan-300)
└─────────────────────┘

DANGER (Red):
┌─��───────────────────┐
│ ✕ Delete            │ (Red-600, hover: Red-500)
└─────────────────────┘
```

### Cards

```
STANDARD CARD:
┌─────────────────────────────────────┐
│ Title                               │
├─────────────────────────────────────┤
│ Content                             │
│                                     │
│ [Action Button]                     │
└─────────────────────────────────────┘

PREMIUM CARD (Gold Border):
┌─────────────────────────────────────┐
│ ✨ Premium Feature                  │
├─────────────────────────────────────┤
│ Content with gradient background    │
│                                     │
│ [Gold CTA]                          │
└────────��────────────────────────────┘

GLASS MORPHISM CARD:
┌─────────────────────────────────────┐
│ Frosted Glass Effect                │
├─────────────────────────────────────┤
│ Backdrop blur + semi-transparent    │
│ Gold border accent                  │
└─────────────────────────────────────┘
```

### Status Indicators

```
✓ VALID (Emerald):     Green checkmark, no border
⚠ WARNING (Amber):     Amber triangle, amber border
✕ ERROR (Red):         Red X, red border
◐ LOADING (Cyan):      Pulsing cyan dot
● ACTIVE (Gold):       Filled gold circle
```

---

## 🎬 Animations & Transitions

```
PANEL SLIDE-IN:
duration: 0.5s
easing: cubic-bezier(0.4, 0, 0.2, 1)
transform: translateX(-100%) → translateX(0)

BUTTON HOVER:
duration: 0.2s
transform: scale(1.05)
box-shadow: 0 0 20px rgba(245, 158, 11, 0.3)

VALIDATION PULSE:
duration: 2s
opacity: 1 → 0.5 → 1
infinite loop

ALGORITHM PANEL EXPAND:
duration: 0.4s
width: 280px → 380px
opacity: 0.8 → 1
```

---

## 📱 Responsive Behavior

### Desktop (1440px+)
- 3-column layout fully visible
- All panels accessible
- Floating algorithm panel
- Full feature set

### Laptop (1280-1439px)
- Collapsible left sidebar
- Right panel sticky
- Floating algorithm panel
- Keyboard shortcuts enabled

### Tablet (768-1279px)
- Left sidebar as drawer
- Right panel as bottom sheet
- Simplified toolbar
- Touch-optimized controls

### Mobile (<768px)
- Single column layout
- Bottom sheet navigation
- Stepwise workflow
- Simplified controls

---

## 🏆 Prestige Elements

### Corner Luxury Frames
```
Top-Left Corner:
┌─────
│
│

Bottom-Right Corner:
        ─────┐
            │
            │
```

### Animated Background Grid
- Subtle radial gradient pattern
- Amber dots on dark background
- Creates depth and texture
- Inspired by luxury car dashboards

### Glow Effects
- Amber glow on active elements
- Cyan glow on technology elements
- Creates "holographic" feeling
- Blur + opacity for depth

### Constitutional Badge
- Always visible (left sidebar bottom)
- Gradient background (emerald/cyan)
- Shield icon with premium copy
- Reinforces trust and quality

---

## ✅ Design Checklist

- [ ] All pages follow dark gold prestige theme
- [ ] Consistent spacing (4px grid system)
- [ ] Consistent typography (header/body/label scales)
- [ ] Color palette applied throughout
- [ ] Glass morphism effects on key panels
- [ ] Animations smooth and purposeful
- [ ] Responsive breakpoints tested
- [ ] Accessibility (WCAG 2.1 AA)
- [ ] Constitutional compliance visible
- [ ] Premium perception maintained

---

**Status:** 🏆 ULTRA-PRESTIGE DESIGN SYSTEM COMPLETE  
**Ready for:** Implementation in React + Tailwind CSS  
**Target:** Enterprise-Grade Fabrication Software  
**Competitor Level:** Orgadata + Klaes + iWindow + Moxisys

