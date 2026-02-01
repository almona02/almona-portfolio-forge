# Phase 1 Visual Audit Template — ALMONA Dark Gold Prestige
Version: 1.0.0
Updated: 2026-01-07
Owner: Design + QA

Purpose
- Provide a structured audit to close the 15–20% visual perception gap and reach 85%+ visual parity by end of Week 4.
- Standardize capture of before/after evidence, defects, and acceptance criteria.

Scope
- All primary pages/flows (Projects, Workflow/Engineering Bay, Studio variants, Settings, Inventory, Customers, Commercial).
- Core components (Buttons, Inputs, Selects, Dialogs, Cards, Toolbars, Status Bars, Navigation).
- Canvas/Workspace UI (selection, hover, bounding boxes, handles).
- Cross-browser: Chrome, Firefox, Safari, Edge.
- Platforms: Windows, macOS (font rendering differences noted).
- Localization: English and Arabic (RTL) spot checks for layout, alignment, and truncation.

How to Use
1. Run through each section, capture screenshots and notes.
2. Record any inconsistency or defect; propose fix mapped to tokens/specs.
3. Attach screenshots in the Evidence sections (filename convention below).
4. Triage severity and link to Jira/Linear (use program/IMPLEMENTATION_BACKLOG.csv once generated).

Screenshot Naming Convention
- {section}-{page}-{component}-{state}-{before|after}-{date}.png
  - Example: projects-list-button-primary-hover-before-2026-01-15.png

======================================================================
A) Global Checks
======================================================================
1. Typography (design-system/tokens/typography.json)
- Verify headings (H1/H2/H3) sizes, weights, tracking, uppercase.
- Body and small sizes and line-height.
- Font family usage (Inter or Arabic fallback Cairo).
- Contrast ratios meet WCAG AA (4.5:1 normal, 3:1 large).
Notes:
Evidence:
Defects:

2. Color System (design-system/tokens/colors.json)
- Primary background and surface layering (slate 950/900/800).
- Accent usage (amber 400/500) limited to actions/accents.
- Status colors (success/warn/error/info) consistent across components.
- Divider/border contrast acceptable and consistent.
Notes:
Evidence:
Defects:

3. Spacing & Rhythm (design-system/Spacing.md)
- 4px system adherence (4, 8, 16, 24, 32, 48, 64).
- Container paddings, grid gaps, card paddings.
- No arbitrary spacings (e.g., 5px, 13px) except hairlines.
Notes:
Evidence:
Defects:

4. Motion & Performance
- Transitions use transform/opacity; durations ~150–200ms.
- Prefers-reduced-motion honored.
- No jank on hover/press; 60fps target maintained.
Notes:
Evidence:
Defects:

======================================================================
B) Core Components State Audit (design-system/ComponentStates.md)
======================================================================
1. Buttons (primary/secondary/outline/ghost/destructive; sm/md/lg)
- States: default, hover (scale 1.02), active (scale 0.99), focus ring, disabled (opacity 0.5), loading (spinner).
- Icon placement, spacing, alignment.
- Accessible labels/focus indicators.
Notes:
Evidence:
Defects:

2. Inputs (text/number/password)
- Focus ring (amber), border tokens, placeholder styling.
- Error state (border + helper text), disabled/readonly.
- Label spacing and alignment.
Notes:
Evidence:
Defects:

3. Selects/Dropdowns
- Trigger matches Inputs state rules.
- Menu animation (fade/translate), item hover/selected/disabled.
- Keyboard navigation; focus trap; typeahead (if applicable).
Notes:
Evidence:
Defects:

4. Dialogs/Modals
- Backdrop blur (10px) and opacity.
- Enter/exit animation; focus trap; Esc close.
- Header/footer spacing, button alignment.
Notes:
Evidence:
Defects:

5. Cards
- Surface elevation; border/divider clarity.
- Hover lift for interactive cards; selected state.
- Content spacing and icon sizing.
Notes:
Evidence:
Defects:

6. Tooltips & Toasts
- Delay (tooltip 400–600ms), readability, contrast.
- Toast types (success/info/warn/error), durations, motion.
Notes:
Evidence:
Defects:

======================================================================
C) Canvas & Workspace Polish
======================================================================
1. Selection States
- Glow/highlight effect; bounding box refinement; handle styling.
- Multi-selection visuals; hover preview states.
Notes:
Evidence:
Defects:

2. Toolbar
- Icon consistency, hover effects, active tool highlight.
- Tooltip clarity and latency.
Notes:
Evidence:
Defects:

3. Properties Panel
- Input alignment; label clarity; validation messages.
- Collapsible sections; real-time feedback visuals.
Notes:
Evidence:
Defects:

4. Status Bar
- Text contrast, icon sizing, spacing, error formatting.
Notes:
Evidence:
Defects:

======================================================================
D) Navigation & Layout
======================================================================
1. Header/Sidebar
- Logo sizing; breadcrumb styling; user menu polish.
- Section headers clarity; hover/active states.
Notes:
Evidence:
Defects:

2. Responsiveness
- Layout on common breakpoints (mobile, tablet, desktop).
- Density modes (compact vs comfortable) where applicable.
Notes:
Evidence:
Defects:

======================================================================
E) Accessibility (WCAG 2.1 AA)
======================================================================
1. Keyboard Navigation
- Tab order logical; visible focus everywhere.
- Enter/Space/Esc behavior correct; shortcuts don’t hijack inputs.
Notes:
Evidence:
Defects:

2. Screen Reader
- ARIA roles/labels for dialogs, menus, buttons.
- Live regions (toasts) polite/assertive as appropriate.
Notes:
Evidence:
Defects:

3. Contrast
- All text/icons meet AA ratios; links distinct beyond color alone.
Notes:
Evidence:
Defects:

======================================================================
F) Cross-Browser QA
======================================================================
- Chrome (latest) — Pass/Fail & notes
- Firefox (latest) — Pass/Fail & notes
- Safari (latest) — Pass/Fail & notes
- Edge (latest) — Pass/Fail & notes

======================================================================
G) Summary & Recommendations
======================================================================
Top Issues (Prioritized):
1.
2.
3.

Quick Wins (High ROI, Low Effort):
1.
2.
3.

Risks:
- 
Mitigations:
- 

Acceptance for Phase 1 (Design + Product Sign-off):
- Visual parity ≥ 85% achieved: Yes/No
- All core component states implemented and verified: Yes/No
- Accessibility AA checks pass on primary flows: Yes/No
- No performance regressions (Lighthouse/Profiler): Yes/No

Sign-offs:
- Design Lead:
- Product Manager:
- QA Lead:
