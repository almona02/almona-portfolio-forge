# ALMONA Component Reuse Mapping
## Existing Components → Unified Workflow Enhancements

**Date:** January 2026  
**Status:** Component Inventory & Reuse Strategy  
**Purpose:** Maximize reuse of existing components in unified workflow implementation

---

## 🎯 Executive Summary

This document maps **existing implemented components** to the **planned unified workflow enhancements**, ensuring maximum code reuse and consistency.

**Key Findings:**
- ✅ **15+ reusable components** identified
- ✅ **3 workflow components** can be adapted
- ✅ **4 wizard components** can be unified
- ✅ **Complete theme system** already exists
- ✅ **Navigation components** ready for adaptation

---

## 📦 Component Inventory

### 1. Workflow & Progress Components

#### ✅ `WorkflowProgress.tsx`
**Location:** `src/components/fabricator/WorkflowProgress.tsx`  
**Current Use:** Status flow indicator (measuring → design → optimized → production → quality → delivered)  
**Reusable For:**
- ✅ **4-Stage Unified Workflow** - Adapt status flow to 4 stages
- ✅ **Progress Indicator** - Use in unified workflow header
- ✅ **Status Badges** - Reuse status styling (completed/current/upcoming)

**Adaptation:**
```typescript
// Current: 6 statuses
const statusFlow: WindowUnitStatus[] = [
  'measuring', 'design', 'optimized', 'production', 'quality', 'delivered'
];

// Unified: 4 stages
const unifiedStages = [
  'measure-design',      // Stage 1: Measure & Design
  'review-optimize',     // Stage 2: Review & Optimize
  'production',         // Stage 3: Production
  'quality-delivery'    // Stage 4: Quality & Delivery
];
```

**Files to Modify:**
- `src/components/fabricator/WorkflowProgress.tsx` - Add unified stage support

---

#### ✅ `BosphorusWorkflowRibbon.tsx`
**Location:** `src/components/fabricator/BosphorusWorkflowRibbon.tsx`  
**Current Use:** Enhanced workflow ribbon with empire heritage, progress tracking  
**Reusable For:**
- ✅ **4-Stage Workflow Navigation** - Adapt ribbon to 4 stages
- ✅ **Progress Visualization** - Reuse progress bar and metrics
- ✅ **Stage Cards** - Reuse step card design with status indicators
- ✅ **Empire Heritage** - Keep visual design, adapt to unified stages

**Key Features to Reuse:**
- Progress bar with gradient
- Step cards with status (current/completed/upcoming)
- Efficiency metrics display
- Collapsible progress details
- Istanbul skyline visualization

**Adaptation:**
```typescript
// Current: Flexible steps array
interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  empire?: 'ottoman' | 'egyptian' | 'modern';
}

// Unified: 4 fixed stages
const UNIFIED_STAGES = [
  {
    id: 'measure-design',
    name: 'Measure & Design',
    description: 'Capture measurements and create technical design',
    icon: Ruler, // or combined icon
    empire: 'egyptian'
  },
  {
    id: 'review-optimize',
    name: 'Review & Optimize',
    description: 'Review design and optimize cutting',
    icon: Settings,
    empire: 'modern'
  },
  {
    id: 'production',
    name: 'Production',
    description: 'Check inventory and schedule production',
    icon: Factory,
    empire: 'ottoman'
  },
  {
    id: 'quality-delivery',
    name: 'Quality & Delivery',
    description: 'Quality control and delivery',
    icon: Zap,
    empire: 'modern'
  }
];
```

**Files to Modify:**
- `src/components/fabricator/BosphorusWorkflowRibbon.tsx` - Add unified stage support

---

#### ✅ `MasterLayout.tsx`
**Location:** `src/components/fabricator/MasterLayout.tsx`  
**Current Use:** Prestige layout with 5-phase progress stepper, 3-column workspace  
**Reusable For:**
- ✅ **Unified Workflow Layout** - Adapt 5 phases → 4 stages
- ✅ **Progress Stepper** - Reuse elite progress bar (80px)
- ✅ **3-Column Layout** - Reuse layout structure (280px | flex | 400px)
- ✅ **Intelligence Hub** - Reuse right panel for context panels
- ✅ **Left Sidebar** - Reuse for stage navigation

**Key Features to Reuse:**
- Elite Progress Stepper (80px) with phase indicators
- Luxury Top Bar (80px) with branding
- Left Sidebar (280px) with project intelligence
- Right Panel (400px) - Intelligence Hub
- Prestige Status Bar (40px)

**Adaptation:**
```typescript
// Current: 5 phases
const PHASES = [
  { id: 'design', name: 'Design', icon: Grid3x3, order: 1 },
  { id: 'configure', name: 'Configure', icon: Settings, order: 2 },
  { id: 'validate', name: 'Validate', icon: Shield, order: 3 },
  { id: 'optimize', name: 'Optimize', icon: Zap, order: 4 },
  { id: 'export', name: 'Export', icon: FileCheck, order: 5 }
];

// Unified: 4 stages
const UNIFIED_STAGES = [
  { id: 'measure-design', name: 'Measure & Design', icon: Ruler, order: 1 },
  { id: 'review-optimize', name: 'Review & Optimize', icon: Settings, order: 2 },
  { id: 'production', name: 'Production', icon: Factory, order: 3 },
  { id: 'quality-delivery', name: 'Quality & Delivery', icon: Zap, order: 4 }
];
```

**Files to Modify:**
- `src/components/fabricator/MasterLayout.tsx` - Add unified stage support

---

### 2. Wizard & Stepper Components

#### ✅ `QuoteRequestStepper.tsx`
**Location:** `src/components/quotes/QuoteRequestStepper.tsx`  
**Current Use:** Multi-step quote request form with progress indicator  
**Reusable For:**
- ✅ **Unified Studio Wizard** - Reuse stepper UI for studio flow
- ✅ **Progress Indicator** - Reuse step buttons with active/complete states
- ✅ **Step Navigation** - Reuse next/previous logic

**Key Features to Reuse:**
- Step buttons with active/complete states
- Progress bar with gradient
- Step content rendering
- Form validation per step
- Navigation (next/previous)

**Adaptation:**
```typescript
// Current: Quote steps
const steps = ['Project', 'Design', 'Review', 'Submit'];

// Unified Studio: 4 steps
const studioSteps = [
  'Import DXF',
  'Tune Profile',
  'Calibrate',
  'Verify & Save'
];
```

**Files to Create:**
- `src/components/fabricator/UnifiedStudioWizard.tsx` - New component using QuoteRequestStepper pattern

---

#### ✅ `OnboardingWizard.tsx`
**Location:** `src/components/onboarding/OnboardingWizard.tsx`  
**Current Use:** Multi-step onboarding with step components  
**Reusable For:**
- ✅ **Unified Studio Wizard** - Reuse wizard structure
- ✅ **Step Management** - Reuse step state management
- ✅ **Data Persistence** - Reuse localStorage pattern

**Key Features to Reuse:**
- Step state management (currentStep, setCurrentStep)
- Step component rendering
- Data accumulation pattern
- Next/Previous handlers
- Completion handler

**Files to Create:**
- `src/components/fabricator/UnifiedStudioWizard.tsx` - Use OnboardingWizard pattern

---

#### ✅ `NewProjectWizard.tsx` & `EgyptianProjectWizard.tsx`
**Location:** `src/components/fabricator/NewProjectWizard.tsx`  
**Current Use:** Project creation wizard with multiple steps  
**Reusable For:**
- ✅ **Wizard UI Pattern** - Reuse dialog structure
- ✅ **Step Validation** - Reuse validation logic
- ✅ **Form Handling** - Reuse form state management

**Key Features to Reuse:**
- Dialog structure
- Step validation
- Form state management
- Submit handler pattern

---

### 3. Navigation Components

#### ✅ `EnterpriseSidebar.tsx`
**Location:** `src/components/layout/EnterpriseSidebar.tsx`  
**Current Use:** Context-aware sidebar with collapsible menus, search, quick actions  
**Reusable For:**
- ✅ **Unified Navigation** - Adapt navigation items to 4-item structure
- ✅ **Context-Aware Display** - Reuse show/hide logic based on route
- ✅ **Collapsible Menus** - Reuse collapse/expand functionality
- ✅ **Search Functionality** - Reuse search for navigation filtering

**Key Features to Reuse:**
- Collapsible sidebar (expanded/collapsed states)
- Navigation items with children (sub-menus)
- Active route detection
- Search filtering
- Quick actions panel
- Mobile drawer support

**Adaptation:**
```typescript
// Current: Multiple nav items
const fabricatorNavItems: NavItem[] = [
  { id: 'workflow', label: 'Workflow', children: [...] },
  { id: 'projects', label: 'Projects', path: '/fabricator/projects' },
  { id: 'customers', label: 'Customers', path: '/fabricator/customers' },
  { id: 'inventory', label: 'Inventory', path: '/fabricator/inventory' },
  { id: 'commercial', label: 'Commercial', children: [...] },
  { id: 'resources', label: 'Resources', children: [...] }
];

// Unified: 4 items max
const unifiedNavItems: NavItem[] = [
  { id: 'projects', label: 'Projects', path: '/fabricator/projects' },
  { id: 'workflow', label: 'Workflow', path: '/fabricator/workflow' },
  { id: 'studio', label: 'Studio', path: '/fabricator/studio' },
  { id: 'user', label: 'User', children: [...] } // Settings, logout
];
```

**Files to Modify:**
- `src/components/layout/EnterpriseSidebar.tsx` - Simplify to 4 items

---

#### ✅ `Navbar.tsx`
**Location:** `src/components/layout/Navbar.tsx`  
**Current Use:** Top navigation bar with logo, main nav, user menu  
**Reusable For:**
- ✅ **Unified Top Nav** - Adapt to 4-item structure
- ✅ **Logo & Branding** - Reuse logo component
- ✅ **User Menu** - Reuse user dropdown
- ✅ **Responsive Design** - Reuse mobile menu

**Key Features to Reuse:**
- Logo component
- Navigation items rendering
- User menu dropdown
- Mobile menu toggle
- Scroll detection (isScrolled state)

**Files to Modify:**
- `src/components/layout/Navbar.tsx` - Simplify to 4 items

---

#### ✅ `Sidebar.tsx` (shared/ui)
**Location:** `src/shared/ui/ui/sidebar.tsx`  
**Current Use:** Reusable sidebar component with provider, collapsible, mobile support  
**Reusable For:**
- ✅ **Context-Aware Sidebar** - Use for workflow/studio sidebars
- ✅ **Collapsible Functionality** - Reuse collapse/expand
- ✅ **Mobile Support** - Reuse mobile drawer

**Key Features to Reuse:**
- SidebarProvider with state management
- Collapsible sidebar (offcanvas/icon/none)
- Mobile drawer (Sheet component)
- Keyboard shortcut (Ctrl/Cmd + B)
- Cookie persistence

**Files to Create:**
- `src/components/fabricator/UnifiedWorkflowSidebar.tsx` - Use Sidebar component

---

### 4. Panel Components

#### ✅ `PropertiesPanel.tsx`
**Location:** `src/components/fabricator/drafting/components/PropertiesPanel.tsx`  
**Current Use:** Context-sensitive property editor for drafting elements  
**Reusable For:**
- ✅ **Unified Context Panel** - Use as base for context panels
- ✅ **Property Editing** - Reuse editing logic
- ✅ **Validation Display** - Reuse validation error display

**Key Features to Reuse:**
- Context-sensitive content (shows based on selection)
- Property editing with validation
- Apply/Reset buttons
- Material-aware properties
- Error handling

**Files to Reuse:**
- `src/components/fabricator/drafting/components/PropertiesPanel.tsx` - Already perfect for unified workflow

---

#### ✅ `Collapsible.tsx` (shared/ui)
**Location:** `src/shared/ui/ui/collapsible.tsx`  
**Current Use:** Collapsible content component (Radix UI)  
**Reusable For:**
- ✅ **Context Panels** - Use for collapsible panels
- ✅ **Sidebar Sections** - Use for collapsible menu sections
- ✅ **Advanced Options** - Use for progressive disclosure

**Key Features to Reuse:**
- Collapsible trigger/content
- Animated expand/collapse
- Accessibility support

**Files to Use:**
- Already available in shared/ui

---

### 5. Theme & Design System

#### ✅ `prestige-design-system.css`
**Location:** `src/styles/prestige-design-system.css`  
**Current Use:** Complete gold-tier dark theme with all design tokens  
**Reusable For:**
- ✅ **All Components** - Apply to all unified workflow components
- ✅ **Color Palette** - Use existing amber/gold colors
- ✅ **Typography** - Use existing typography classes
- ✅ **Spacing** - Use existing spacing system
- ✅ **Shadows** - Use existing shadow utilities
- ✅ **Buttons** - Use existing button classes
- ✅ **Cards** - Use existing card classes

**Key Features to Reuse:**
- Color palette (slate-950, amber-500, etc.)
- Typography classes (typography-h1, typography-h2, etc.)
- Button classes (btn-primary, btn-secondary, etc.)
- Card classes (card-premium, card-glass-dark, etc.)
- Shadow utilities (shadow-glow, shadow-premium, etc.)
- Status badges (status-valid, status-warning, etc.)

**Files to Use:**
- Already imported in `src/index.css`
- Apply classes to all new components

---

#### ✅ `Card.tsx`, `Button.tsx`, `Tabs.tsx` (shared/ui)
**Location:** `src/shared/ui/ui/`  
**Current Use:** Reusable UI components  
**Reusable For:**
- ✅ **All Components** - Use for consistent UI
- ✅ **Card Layouts** - Use Card for all containers
- ✅ **Action Buttons** - Use Button for all actions
- ✅ **Tab Navigation** - Use Tabs for tabbed interfaces

**Key Features to Reuse:**
- Card component (Card, CardHeader, CardContent, etc.)
- Button component (with variants)
- Tabs component (Tabs, TabsList, TabsTrigger, TabsContent)
- All other shared/ui components

**Files to Use:**
- Already available in shared/ui

---

### 6. Layout Components

#### ✅ `MasterLayout.tsx` (Already Covered)
**Reusable For:**
- ✅ **Unified Workflow Layout** - Adapt layout structure
- ✅ **Progress Stepper** - Reuse progress bar
- ✅ **3-Column Workspace** - Reuse layout

---

## 🔄 Component Reuse Strategy

### Strategy 1: Adapt Existing Components

**Components to Adapt:**
1. ✅ `WorkflowProgress.tsx` → Unified 4-stage progress
2. ✅ `BosphorusWorkflowRibbon.tsx` → Unified workflow navigation
3. ✅ `MasterLayout.tsx` → Unified workflow layout
4. ✅ `EnterpriseSidebar.tsx` → Simplified 4-item navigation
5. ✅ `Navbar.tsx` → Simplified 4-item top nav

**Approach:**
- Add new props for unified mode
- Maintain backward compatibility
- Create wrapper components if needed

---

### Strategy 2: Reuse Component Patterns

**Patterns to Reuse:**
1. ✅ **Wizard Pattern** → `OnboardingWizard.tsx` / `QuoteRequestStepper.tsx`
2. ✅ **Panel Pattern** → `PropertiesPanel.tsx`
3. ✅ **Stepper Pattern** → `QuoteRequestStepper.tsx`
4. ✅ **Collapsible Pattern** → `Collapsible.tsx`

**Approach:**
- Extract common patterns
- Create reusable hooks/utilities
- Apply patterns to new components

---

### Strategy 3: Apply Existing Theme

**Theme to Apply:**
1. ✅ **Color Palette** → `prestige-design-system.css`
2. ✅ **Typography** → Typography classes
3. ✅ **Spacing** → Spacing system
4. ✅ **Components** → Shared UI components

**Approach:**
- Use existing CSS classes
- Apply theme to all new components
- Maintain consistency

---

## 📋 Implementation Mapping

### Unified 4-Stage Workflow

| Component Needed | Existing Component | Reuse Strategy |
|------------------|---------------------|---------------|
| **Stage Navigation** | `BosphorusWorkflowRibbon.tsx` | ✅ Adapt to 4 stages |
| **Progress Indicator** | `WorkflowProgress.tsx` | ✅ Adapt to 4 stages |
| **Layout Wrapper** | `MasterLayout.tsx` | ✅ Adapt to 4 stages |
| **Context Panel** | `PropertiesPanel.tsx` | ✅ Reuse as-is |
| **Top Navigation** | `Navbar.tsx` | ✅ Simplify to 4 items |
| **Sidebar** | `EnterpriseSidebar.tsx` | ✅ Simplify to 4 items |
| **Theme** | `prestige-design-system.css` | ✅ Apply to all |

---

### Unified Studio

| Component Needed | Existing Component | Reuse Strategy |
|------------------|---------------------|---------------|
| **Wizard Structure** | `OnboardingWizard.tsx` | ✅ Reuse pattern |
| **Step Navigation** | `QuoteRequestStepper.tsx` | ✅ Reuse stepper UI |
| **Step Components** | `NewProjectWizard.tsx` | ✅ Reuse step pattern |
| **Dialog Wrapper** | `Dialog.tsx` (shared/ui) | ✅ Reuse as-is |
| **Form Handling** | `NewProjectWizard.tsx` | ✅ Reuse form logic |

---

### Unified Navigation

| Component Needed | Existing Component | Reuse Strategy |
|------------------|---------------------|---------------|
| **Top Nav** | `Navbar.tsx` | ✅ Simplify to 4 items |
| **Sidebar** | `EnterpriseSidebar.tsx` | ✅ Simplify to 4 items |
| **Context Sidebar** | `Sidebar.tsx` (shared/ui) | ✅ Use for context panels |
| **Mobile Menu** | `EnterpriseSidebar.tsx` | ✅ Reuse mobile drawer |

---

## 🎨 Theme Application

### Existing Theme Classes to Use

**Backgrounds:**
- `bg-[#0a0a0a]` - Deep black (primary background)
- `bg-slate-950` - Slate 950 (secondary background)
- `bg-slate-900/90` - Slate 900 with opacity (cards)

**Accents:**
- `text-amber-500` - Gold primary
- `text-amber-400` - Gold secondary
- `border-amber-500/30` - Gold border

**Components:**
- `card-premium` - Premium card style
- `card-glass-dark` - Glass morphism card
- `btn-primary` - Primary button
- `btn-secondary-dark` - Secondary button

**Typography:**
- `typography-h1` - H1 style
- `typography-h2` - H2 style
- `typography-h3` - H3 style

---

## 🚀 Implementation Plan

### Phase 1: Adapt Workflow Components (Week 1)

**Tasks:**
1. ✅ Adapt `WorkflowProgress.tsx` to 4 stages
2. ✅ Adapt `BosphorusWorkflowRibbon.tsx` to 4 stages
3. ✅ Adapt `MasterLayout.tsx` to 4 stages
4. ✅ Test unified workflow navigation

**Files to Modify:**
- `src/components/fabricator/WorkflowProgress.tsx`
- `src/components/fabricator/BosphorusWorkflowRibbon.tsx`
- `src/components/fabricator/MasterLayout.tsx`

---

### Phase 2: Simplify Navigation (Week 1)

**Tasks:**
1. ✅ Simplify `EnterpriseSidebar.tsx` to 4 items
2. ✅ Simplify `Navbar.tsx` to 4 items
3. ✅ Add context-aware sidebar logic
4. ✅ Test navigation simplification

**Files to Modify:**
- `src/components/layout/EnterpriseSidebar.tsx`
- `src/components/layout/Navbar.tsx`

---

### Phase 3: Create Unified Studio (Week 2)

**Tasks:**
1. ✅ Create `UnifiedStudioWizard.tsx` using `OnboardingWizard.tsx` pattern
2. ✅ Reuse `QuoteRequestStepper.tsx` for step navigation
3. ✅ Integrate DXF import, tuning, calibration steps
4. ✅ Test unified studio flow

**Files to Create:**
- `src/components/fabricator/UnifiedStudioWizard.tsx`

**Files to Reuse:**
- `src/components/onboarding/OnboardingWizard.tsx` (pattern)
- `src/components/quotes/QuoteRequestStepper.tsx` (stepper UI)
- `src/components/fabricator/smartscan/DXFProfileImporter.tsx` (import step)
- `src/components/fabricator/CalibrationWizard.tsx` (calibration step)

---

### Phase 4: Apply Theme (Week 2)

**Tasks:**
1. ✅ Apply `prestige-design-system.css` to all new components
2. ✅ Use shared UI components (Card, Button, Tabs)
3. ✅ Ensure consistent styling
4. ✅ Test theme application

**Files to Modify:**
- All new components
- Apply existing CSS classes

---

## 📊 Component Reuse Matrix

| Enhancement | Existing Component | Reuse % | Action |
|-------------|-------------------|---------|--------|
| **4-Stage Workflow** | `BosphorusWorkflowRibbon.tsx` | 80% | Adapt stages |
| **Progress Indicator** | `WorkflowProgress.tsx` | 70% | Adapt to 4 stages |
| **Layout** | `MasterLayout.tsx` | 90% | Adapt phases |
| **Top Navigation** | `Navbar.tsx` | 60% | Simplify items |
| **Sidebar** | `EnterpriseSidebar.tsx` | 70% | Simplify items |
| **Studio Wizard** | `OnboardingWizard.tsx` | 85% | Reuse pattern |
| **Step Navigation** | `QuoteRequestStepper.tsx` | 90% | Reuse UI |
| **Context Panel** | `PropertiesPanel.tsx` | 100% | Reuse as-is |
| **Theme** | `prestige-design-system.css` | 100% | Apply classes |

**Average Reuse:** **82%** - Excellent reuse potential!

---

## ✅ Next Steps

1. **Start with Workflow Components**
   - Adapt `BosphorusWorkflowRibbon.tsx` to 4 stages
   - Adapt `WorkflowProgress.tsx` to 4 stages
   - Test unified workflow navigation

2. **Simplify Navigation**
   - Simplify `EnterpriseSidebar.tsx` to 4 items
   - Simplify `Navbar.tsx` to 4 items
   - Add context-aware logic

3. **Create Unified Studio**
   - Create `UnifiedStudioWizard.tsx` using existing patterns
   - Integrate existing studio components
   - Test unified flow

4. **Apply Theme**
   - Apply existing theme classes to all components
   - Ensure consistency
   - Test visual appearance

---

**Status:** Ready for implementation  
**Estimated Reuse:** 82% of existing components  
**Priority:** HIGH (Maximize code reuse)

