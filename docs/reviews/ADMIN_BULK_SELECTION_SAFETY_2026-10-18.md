# Admin bulk selection safety — 2026-10-18

## Problem

Products, Inventory and Orders use the shared DataTable with server-side paging and parent-owned bulk-action selections. TanStack's default row IDs were positional, and the parent callback depended on selection changes but not new data. Selecting row 0 on page 1 and loading page 2 could retain that position or leave the parent's prior selection active. Local filtering also reported hidden selections to the parent.

## Change

- Use each record's `id` where available; allow a caller-provided `getRowId` for other record shapes. Positional fallback remains for records without IDs, with the same dataset invalidation protection.
- Associate selection state with its data reference, filters, page, page size and explicit reset key. Reject stale state in the render that receives new data; clear it so returning to a previous page cannot resurrect it.
- Report only filtered selected records to bulk-action owners, and notify them when data/page/filter context changes.
- Preserve selections through sorting of unchanged records. Conservatively clear on data refresh, including realtime and optimistic updates, so the operator must reselect after changes.
- Announce the selected count even for server-paged tables and name checkboxes by row ID/page scope. Correct the empty-table colspan when selection or column visibility changes.

## Scope and validation

Only the shared table changes; no APIs, authorization, database migrations or bulk mutation handlers are modified. The three admin callers store their data in state and use stable selection setters. Callers must replace arrays on data changes, following React's normal immutable-data convention.

No test suites were run, in accordance with the user's usage preference. Validation is limited to targeted ESLint, the existing baseline-delta type gate and source inspection; runtime interaction behavior is not verified by these checks. The type gate tolerates existing app errors and is not a type-clean check.

This follow-up is based on main and independent of PR95/PR97; neither PR is merged by this task.
