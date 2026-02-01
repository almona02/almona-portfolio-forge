# ALMONA 12-Week Execution Blueprint — Implementation Artifacts Plan
Date: 2026-01-07
Status: Draft for Review
Owner: Engineering Lead

Purpose
- Translate the ALMONA Implementation Precision Plan into concrete, reviewable execution artifacts that engineering, design, and QA can consume immediately.
- Align deliverables to repository reality: this repo currently hosts plans and documentation, not the active application codebase.
- Provide file conventions, acceptance criteria, success metrics, and a gated rollout plan per phase.

Repository Reality Check (Assessment)
- This repository contains documentation, deployment scripts, and analyses. It does not contain the active React/Vite/Tailwind application code referenced in the plan.
- One UI artifact found: components/fabricator/ElsherifImportWizard.tsx, but it imports shared/ui and lib/* paths which do not exist here; indicates it was copied as a reference or belongs to another repo.
- Conclusion: Use this repo as the central source-of-truth for execution artifacts (specs, tokens, test matrices, templates). When the code repo is specified, we will generate a binding sheet and PR plan to implement the specs.

Scope & Goals (from Plan)
- Raise visual parity from ~70–75% to 85%+ by end of Phase 1 (Week 4).
- Achieve 85%+ keyboard shortcut coverage by Phase 2/Week 5.
- Deliver enterprise features (search, filter, bulk ops, templates, activity timeline) to reach 80%+ enterprise parity by Week 8.
- Professional reporting and analytics (70–75% parity) by Week 11.
- Mobile optimization (80–85% parity) by Week 12.
- Maintain performance budgets: initial bundle < 200KB (target), TTI < 3s, LCP < 2.5s, total page weight < 1MB. WCAG 2.1 AA compliance.

High-Level Artifact Strategy
- Create a structured artifact set that engineering can implement directly in the code repository.
- Provide tokens, specs, acceptance criteria, QA matrices, and program backlogs.
- Keep artifacts minimal but complete—each spec includes interfaces, UX flows, error cases, and performance targets.

===============================================================================
PHASE 1 — Visual Polish & Design System (Weeks 1–4)
===============================================================================

Deliverables to Create in This Repo
1) design-system/tokens/colors.json
   - Gold prestige palette tokens: primary slate 950 (#020617), amber 400 (#fbbf24) accents, success/warn/error scales.
   - Opacity tokens: 100%, 80%, 60%, 40%, 20%.
   - Light/dark variants; contrast-satisfying pairs.

2) design-system/tokens/typography.json
   - Scale &amp; weights:
     - H1: 32px, 700, 0.05em tracking (uppercase)
     - H2: 24px, 700, 0.05em tracking (uppercase)
     - H3: 18px, 600, 0.03em tracking (uppercase)
     - Body: 14px, 400, line-height 1.5
     - Small: 12px, 400
   - Tailwind class mapping suggestions.

3) design-system/Spacing.md
   - 4px base spacing system: 4, 8, 16, 24, 32, 48, 64px.
   - Margin/padding rules, layout rhythm, density options (compact/comfortable).

4) design-system/ComponentStates.md
   - Buttons: default, hover, active, disabled, loading
     - hover: transform scale(1.02), transition 150ms, will-change: transform
     - focus: ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900
     - disabled: opacity-50 cursor-not-allowed
     - loading: spinner + disabled
   - Inputs: focus ring glow (amber), error border and hint, disabled, placeholder style
   - Selects/Dropdowns: animation (200ms), hover/selected states, focus trap
   - Dialogs: enter/exit transitions, backdrop blur (10px), elevation
   - Cards: hover lift, subtle border, standardized padding and icon sizing
   - All include accessibility notes (focus order, roles, ARIA)

5) qa/Phase1_VisualAudit_Template.md
   - Screenshot checklists across pages
   - Cross-browser compat matrix (Chrome/Firefox/Safari/Edge)
   - Animation smoothness, color accuracy, typography crispness
   - WCAG 2.1 AA quick checks (contrast, focus, labels)

6) qa/Phase1_Performance_Checklist.md
   - Profile transitions to ensure transform-only, avoid layout thrash
   - Lazy-load heavy modules; verify bundle impact
   - Lighthouse/Profiler steps and targets

Acceptance Criteria (Phase 1)
- Visual parity 85%+ (design/product sign-off)
- All core components have defined and implemented states
- Animations smooth at 60fps on mid-range hardware
- WCAG AA verified for primary flows
- No bundle regressions and minimal reflow

===============================================================================
PHASE 2 — Keyboard Shortcuts & Accessibility (Weeks 2–3 Overlap + Week 5)
===============================================================================

Deliverables to Create in This Repo
1) KEYBOARD_SHORTCUTS.md
   - Full mapping per plan (Drawing: R/C/L/A/P; Edit: Ctrl+Z/Y/X/C/V; View; Project; Help).
   - Platform normalization: Ctrl (Windows/Linux) vs Cmd (macOS).
   - Scope rules: global vs canvas-only vs modal suppression.
   - Conflict resolution policy; discoverability (help modal ? / F1).

2) qa/KeyboardShortcutTestMatrix.csv
   - Columns: Area, Shortcut, Platform, Context, Expected Behavior, Precondition, Steps, Result, Notes.
   - Include matrix for Windows/macOS; modifiers and edge cases.

3) specs/keyboard/ShortcutArchitecture.md
   - Hook: useKeyboardShortcuts(registry, enabled) signature
   - Context provider for global handler; event priority, stopPropagation, preventDefault rules
   - Reliability: focus handling, IME input safety, nested components

Acceptance Criteria (Phase 2)
- 85%+ coverage of planned shortcuts
- Works on Windows/macOS, conflicts documented and handled
- Accessible help modal shows full map, printable cheat sheet available
- No regressions in text inputs and forms

===============================================================================
PHASE 3 — Enterprise Features (Weeks 5–8)
===============================================================================

Service &amp; API Specs (Front-End Contracts)
1) specs/services/SearchService.md
   - Purpose: full-text search across projects/positions/history.
   - Query DTO:
     - q: string, types: [projects|positions|history], filters, sort, page, perPage
     - debounce recommended 300ms
   - Response:
     - items[], total, page, perPage, latencyMs
   - Ranking, fuzzy match, pagination, error model, cancellation.

2) specs/services/FilterService.md
   - Multi-select filters, combinations, URL sync, presets
   - Persistence strategy (localStorage/user profile)
   - Performance guards for large datasets.

3) specs/services/BulkOperationService.md
   - Operations: Edit, Export (PDF/CSV/DXF), Delete, Status Change
   - Async job model: jobId, progress, cancellation, retries, idempotency
   - Error handling, partial successes, undo/redo strategy.

UI Component Specs
4) specs/ui/SearchBar.md
   - Components: input, suggestions, grouped results
   - UX: debounce, keyboard nav, clear button, history list
   - Empty/error/loading states.

5) specs/ui/AdvancedFilters.md
   - Filter button + dropdown; multi-select; date range picker
   - Filter pills; clear all; save presets; keyboard access

6) specs/ui/MultiSelectGrid.md
   - Checkboxes per item; select all/deselect all; count display
   - Accessibility and virtualization for large lists

7) specs/ui/BulkOperationToolbar.md
   - Visible on selection; bulk actions; confirmation patterns
   - Progress display, errors, toasts/notifications

8) specs/ui/ProjectTemplates.md
   - Template library UI; clone/create-from-existing; metadata editing

9) specs/ui/ProjectActivityTimeline.md
   - Timeline spec; attribution; revert recent changes; comment integration

Acceptance Criteria (Phase 3)
- Search returns relevant results < 500ms (typical dataset), paginated
- Filters combine instantly and persist; URL reflects state
- Bulk ops resilient with progress, cancellation, undo; safe confirmations
- Templates functional; Activity timeline records and displays changes
- QA sign-off and performance checks pass

===============================================================================
PHASE 4 — Reporting &amp; Analytics (Weeks 9–11)
===============================================================================

Deliverables to Create in This Repo
1) specs/reporting/ReportTemplateSchema.md
   - JSON schema for templates: metadata, sections, fields, bindings (e.g., {{project_name}}), conditionals, branding assets.

2) specs/reporting/PDFGenerationServiceSpec.md
   - Rendering approach: React-PDF vs server headless Chrome rendering
   - Pagination, headers/footers, images, caching common assets
   - Background job flow for large reports; retries; SLA (< 2s typical)

3) specs/analytics/AnalyticsMetrics.md
   - KPI definitions: project volume, revenue, waste %, production time, segments
   - Data contracts, units, rounding, freshness SLAs

4) specs/analytics/AnalyticsQueries.md
   - Query definitions and expected shapes; performance targets
   - Export formats: PDF/Excel/CSV; security considerations

Acceptance Criteria (Phase 4)
- 4 report templates implemented end-to-end
- PDF generation accurate, stable, and performant (< 2s)
- Analytics dashboard loads < 1s with cached/pre-aggregated data
- Exports verified; unit tests for template bindings

===============================================================================
PHASE 5 — Mobile Optimization &amp; Workshop Portal (Week 12)
===============================================================================

Deliverables to Create in This Repo
1) mobile/MobileOptimizationChecklist.md
   - Touch gestures (pinch-zoom, two-finger pan)
   - Hit target sizes, responsive breakpoints, orientation handling
   - Performance budgets; off-main-thread where possible

2) specs/mobile/WorkshopPortalSpec.md
   - Screens: today’s jobs, quick status, QR scan for remnants, issue photo capture
   - Flows, offline/PWA constraints, large-button UI
   - Device test plan (iOS/Android/Tablet)

Acceptance Criteria (Phase 5)
- Touch gestures smooth; bottom nav functional on small devices
- Workshop portal prototype usable; accessibility tested
- Mobile load < 2s on 4G; QA sign-off

===============================================================================
Engineering Conventions &amp; File Path Binding (for the App Repo)
===============================================================================

When applied to the active app repository, use these conventions aligned to .blackboxrules:

- Components:
  - src/components/common/Button.tsx
  - src/components/ui/button.tsx (shadcn entry)
  - src/components/common/Input.tsx
  - src/components/ui/input.tsx
  - src/components/common/Select.tsx
  - src/components/ui/dialog.tsx
  - src/components/common/Card.tsx
  - src/components/fabricator/drafting/DraftingCanvas2D.tsx
  - src/components/fabricator/drafting/SelectionHandler.tsx
  - src/components/fabricator/drafting/DraftingToolbar.tsx
  - src/components/fabricator/drafting/PropertiesPanel.tsx
  - src/components/fabricator/drafting/EnhancedStatusBar.tsx
  - src/components/layout/Navbar.tsx
  - src/components/layout/EnterpriseSidebar.tsx

- Hooks/Context:
  - src/hooks/useKeyboardShortcuts.ts
  - src/context/KeyboardContext.tsx

- Services:
  - src/services/SearchService.ts
  - src/services/FilterService.ts
  - src/services/BulkOperationService.ts
  - src/services/ReportTemplateService.ts
  - src/services/PDFGenerationService.ts
  - src/services/AnalyticsService.ts

- Pages/Features:
  - src/components/fabricator/ProjectTemplates.tsx
  - src/components/fabricator/ProjectActivityTimeline.tsx
  - src/components/fabricator/ReportBuilder.tsx
  - src/components/fabricator/AnalyticsDashboard.tsx
  - src/pages/WorkshopPortal.tsx

Performance, Security, Accessibility (Cross-Cutting)
- Performance:
  - Transition with transform/opacity only; avoid triggering layout where possible
  - Virtualize large lists; memoize expensive components; code-split heavy features
  - Debounce UI inputs (search 300ms); cache responses; paginate server side

- Security:
  - Sanitize all inputs; follow CSP; use HTTPS; validate file uploads server-side
  - Use env vars: VITE_API_URL, VITE_SMS_API_KEY, VITE_GOOGLE_ANALYTICS_ID, VITE_MAPS_API_KEY, VITE_AR_API_KEY
  - RBAC checks on bulk operations and reporting endpoints

- Accessibility:
  - WCAG 2.1 AA; clear focus rings; alt text; ARIA roles; keyboard navigation
  - Dialog focus management; skip-to-content; color contrast verified

QA &amp; Definition of Done (Per Phase)
- All specs have acceptance criteria met and reviewed by product/design
- Unit tests for utilities and hooks; integration tests for flows
- Snapshot tests for stable UI components where applicable
- Cross-browser and device matrix executed
- Lint (npm run lint) and type-check (npm run type-check) clean
- Performance budgets satisfied (Lighthouse, Profiler)
- Documentation updated (CHANGELOG, Storybook if present)

Risks &amp; Mitigations (Tracked)
- Visual Polish Spillover: Prioritize high-impact components; daily design reviews
- Shortcut Conflicts: Map to industry standards, allow overrides in settings
- Search Perf: Index strategy; load test early; paginate and cache
- PDF Speed: Use proven libs; background job for heavy; cache repeated assets
- Mobile Canvas Perf: Profile on devices; simplify interactions for mobile mode

Program Management Artifacts (to be generated after approval)
- program/IMPLEMENTATION_BACKLOG.csv
  - Columns: Epic, Story, Description, Acceptance Criteria, Estimate, Owner, Phase, Target Week
  - Will contain import-ready tickets for Jira/Linear

- program/EXECUTION_TODO.md
  - Milestone checklists, dates aligned to the Master Timeline in the plan

- program/RISKS_AND_MITIGATIONS.md
  - Expanded risk register with triggers, owners, mitigation playbooks

- CONTRIBUTING_EXECUTION.md
  - DOR/DOE per phase, PR checklist, testing gates

Immediate Next Steps (Upon Approval)
1) Generate Phase 1–5 artifact files and folders in this repo exactly as listed (design-system, specs, qa, mobile, program).
2) If you provide the active application repository (path or remote), create a File Binding Sheet mapping all component/service specs to actual filepaths and open a PR plan (branch naming: blackboxai/phase-1-visual-polish).
3) Convert the approved specs into tracked issues in program/IMPLEMENTATION_BACKLOG.csv and prepare import for Jira/Linear.

Appendix — Sample Interfaces (for Clarity, Implemented in App Repo)
Typescript skeletons (to be implemented in app repository, not here):

SearchService (Front-End Contract)
/*
export type SearchType = 'projects' | 'positions' | 'history';

export interface SearchQuery {
  q: string;
  type: SearchType[];
  filters?: Record<string, string | number | boolean | string[]>;
  sort?: { field: string; dir: 'asc' | 'desc' };
  page?: number;
  perPage?: number;
}

export interface SearchResultItem {
  id: string;
  kind: SearchType;
  title: string;
  subtitle?: string;
  score?: number;
  meta?: Record<string, any>;
}

export interface SearchResponse {
  items: SearchResultItem[];
  total: number;
  page: number;
  perPage: number;
  latencyMs: number;
}

export interface SearchService {
  search(query: SearchQuery, signal?: AbortSignal): Promise<SearchResponse>;
}
*/

BulkOperationService (Front-End Contract)
/*
export type BulkOperation =
  | { op: 'edit'; fields: Record<string, any> }
  | { op: 'export'; format: 'pdf' | 'csv' | 'dxf' }
  | { op: 'delete' }
  | { op: 'status'; status: string };

export interface BulkJob {
  jobId: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'canceled';
  progress: number; // 0..100
  errors?: Array<{ id: string; message: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface BulkOperationService {
  start(itemIds: string[], op: BulkOperation): Promise<BulkJob>;
  status(jobId: string): Promise<BulkJob>;
  cancel(jobId: string): Promise<BulkJob>;
}
*/

Keyboard Shortcuts Hook (Front-End Contract)
/*
export type ShortcutHandler = () => void | boolean;
export type ShortcutRegistry = Record<string, ShortcutHandler>;

export function useKeyboardShortcuts(registry: ShortcutRegistry, enabled: boolean): void;
*/

Review Gate
- This document is the single blueprint to review before generating the full artifact set.
- After approval, we will produce all listed files with complete content and cross-links.
