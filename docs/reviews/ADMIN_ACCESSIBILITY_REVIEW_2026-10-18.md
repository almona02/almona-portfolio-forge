# Admin accessibility review — 2026-10-18

Scope: the routed `/admin` dashboard, its global admin dropdown, and filters in Products, Orders, Customers, Inventory, Finance and Reports. Completed as a bounded upgrade within the requested five-hour limit.

## Findings addressed

| Finding | Change |
| --- | --- |
| Global menu navigated to undeclared `/admin/products`, `/admin/customers`, etc. | Shared implemented-section inventory; links use `/admin?tab=…`. Unimplemented Users/Roles, Categories, Security and Logs shortcuts removed. |
| Selected section was lost on reload and Back/Forward | Section derives from validated URL query state; unrelated query parameters preserved. |
| Mobile sidebar was visually translated off screen while its controls remained focusable; no focus trap or Escape behavior | Radix modal navigation with title, description, focus trap, Escape/close controls and focus restoration. Desktop sidebar uses responsive display hiding. |
| Sidebar account footer could overlap navigation | Fixed desktop flex layout with independently scrollable navigation and a non-overlapping footer. |
| Missing control names and content bypass | Named notification/account/navigation controls, skip link, named main landmark, current-section indication and section-heading focus. |
| Loading panels lacked announcements | Suspense fallback messages expose status semantics. |
| Four panels imported a placeholder Select built from clickable divs | Reuse the existing Radix Select for Products, Customers, Inventory and Finance, preserving options and filter callbacks. |
| Visible filter labels were not associated with controls | Explicit label/control associations across six panels, named bulk order/payment controls and contextual row-action names. |
| Header search and account Profile item had no behavior | Removed inert controls; account Settings now opens the implemented section. Panel search filters remain available. |
| Header search forced width on mobile; notification menu could exceed viewport | Compact header, constrained notification width and wrapping Reports filter row. |

## Verification

- Targeted Vitest suites: dashboard interactions, panel filters and existing access guards; 21 tests pass.
- Axe scans of the six rendered panel fragments: zero violations under enabled rules. Data tables and detail dialogs are mocked; color contrast and region rules are disabled because these are isolated jsdom fragments. This is not full-page WCAG certification.
- Keyboard test changes a customer-role filter through the real Radix Select and verifies the corresponding query predicate.
- Existing ProtectedRoute tests cover anonymous, unresolved-profile and non-admin denial; router inspection confirms `/admin` remains behind `requireAdmin`.
- Production build passes. Targeted ESLint: zero errors (13 warnings).
- Type baseline gate passes: 1,757 existing app errors versus 1,791 baseline; no new signatures or increased occurrences, node project clean. Baseline files were not changed.

## Remaining scope

Live authenticated production data, database/API authorization, table internals, chart alternatives, import tools, support/analytics subpanels, browser visual/contrast assessment and assistive-technology testing were not validated by these component tests. Reports generation remains an existing placeholder. A complete accessibility audit should cover those areas separately.
