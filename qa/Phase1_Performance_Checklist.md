# Phase 1 Performance Checklist — Visual Polish Safety Net
Version: 1.0.0
Updated: 2026-01-07
Owner: Engineering + QA

Purpose
Ensure visual polish changes (animations, shadows, transitions) introduce zero performance regressions. Target 60fps interactions on mid-range hardware with stable memory and minimal layout thrash.

Scope
- Core components: Buttons, Inputs, Selects, Dialogs, Cards, Toolbars, Status Bars, Navigation.
- Canvas/workspace chrome (excludes heavy canvas internals; tracked separately).
- Browsers: Chrome, Firefox, Safari, Edge (latest).
- Platforms: Windows/macOS.

Performance Budgets (Phase 1)
- Time to Interactive (TTI): ≤ 3s
- Largest Contentful Paint (LCP): ≤ 2.5s
- CLS: ≤ 0.1
- JS main-thread long tasks: none > 50ms during simple UI interactions
- Animation frame budget: sustain ~16.7ms/frame (60fps) on hover/press/menu open/close
- Bundle delta: no net increase > 10KB gzip for Phase 1 changes

Tools
- Chrome DevTools: Performance, Lighthouse, Coverage
- React DevTools Profiler
- Performance Markers via performance.mark/measure (if applicable)
- WebPageTest or PageSpeed (optional)
- System: mid-range laptop (8–16GB RAM) and low-power mode test

General Rules
- Use transform (translate/scale) and opacity for motion; avoid top/left
- Avoid heavy box-shadow blur radii; prefer subtle elevation
- Batch class changes to prevent layout thrash
- Respect prefers-reduced-motion
- Memoize expensive subtrees; use React.Suspense/code-splitting for heavy UI
- Debounce input-heavy handlers (>= 150–300ms)

Checklist by Area

1) Buttons
- [ ] Hover scale 1.02 uses transform; no layout shift/CLS
- [ ] Transition duration ~150ms; easing consistent
- [ ] Loading spinner does not reflow label; uses inline-flex alignment
- [ ] Focus ring via outline/ring; no costly box-shadow paints
Evidence/Notes:

2) Inputs
- [ ] Focus ring uses outline/ring with GPU-friendly rendering
- [ ] Error state class switch does not trigger layout thrash
- [ ] Placeholder style change is paint-only
Evidence/Notes:

3) Select/Dropdown
- [ ] Panel open/close uses opacity+translateY; no large reflows
- [ ] Virtualization not required for small menus (confirm item count)
- [ ] Keyboard navigation is smooth; no scroll-jank
Evidence/Notes:

4) Dialogs/Modals
- [ ] Backdrop blur (10px) verified for perf; fallback if perf issues detected
- [ ] Enter/exit transitions smooth; no frame drops
- [ ] Focus trap logic does not cause reflows each keypress
Evidence/Notes:

5) Cards
- [ ] Hover lift uses translateY and light shadow; no heavy blur
- [ ] Selected/active states apply border/outline without re-layout content
Evidence/Notes:

6) Tooltips/Toasts
- [ ] Tooltip delay prevents rapid show/hide churn
- [ ] Toast slide-in/out uses transform; no layout cascades
Evidence/Notes:

7) Navigation/Header/Sidebar
- [ ] Hover/active/focus styles do not shift layout
- [ ] Dropdowns/menus follow performance motion rules
Evidence/Notes:

8) Canvas Chrome (Status Bar, Properties Panel, Toolbar)
- [ ] Hover highlights/icons transitions are paint/transform-only
- [ ] Properties panel validation feedback does not cause costly reflows
Evidence/Notes:

Cross-Browser Verification
- Chrome: [ ] 60fps interactions [ ] Lighthouse metrics met
- Firefox: [ ] No jank; transitions smooth
- Safari: [ ] No shadow/blur perf regressions
- Edge: [ ] Matches Chrome behavior

Profiling Steps (Chrome)
1) Record Performance during:
   - [ ] Button hover/press across page
   - [ ] Input focus/typing, error toggle
   - [ ] Select open/close, 20 selections
   - [ ] Dialog open/close, scroll content
2) Inspect Main thread flame chart:
   - [ ] No long tasks > 50ms
   - [ ] No repeated layout/forced reflow
3) Memory:
   - [ ] No retained detached nodes after dialog/menu close
4) Coverage:
   - [ ] Unused CSS/JS % stable or improved after changes

Lighthouse (Desktop)
- [ ] Performance ≥ 90
- [ ] Accessibility ≥ 90
- [ ] Best Practices ≥ 90
- [ ] SEO ≥ 90
Record LCP/CLS/TTI values:

React Profiler
- [ ] No unnecessary re-renders from hover/focus states
- [ ] Memoization applied where applicable

Regression Gate
- [ ] All above checks passed on two laptops (mid-range + lower power mode)
- [ ] Bundle delta within budget and tree-shaking intact
- [ ] prefers-reduced-motion verified

Sign-off
- Engineering Lead:
- QA Lead:
- Date:
