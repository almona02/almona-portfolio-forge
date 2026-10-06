# Cursor handoff: stock correctness and warehouse upgrade

Status: PLAN ONLY. No stock upgrade code or database change has been made. Created at the user's request because Codex has 17% remaining in its five-hour allowance and the required database validation exceeds a safely bounded frontend patch.

## Objective

Upgrade `/fabricator/studio/data/stock` without losing opening balances, miscounting bars, duplicating purchases, or weakening manufacturing approval. Deliver tested changes in staged PRs and verify the deployed flow with explicitly marked test stock.

Read `tmp/stock-audit-2026-10-06.md` first for the evidence and live observations. It distinguishes checked-in SQL defects from deployed database behavior, which remains unverified.

## Start safely

1. Read applicable AGENTS.md. Inspect `git status`, HEAD, remote main and existing PRs before editing. This checkout has many prior engineering/CI changes already merged remotely; DO NOT reset, clean, stash indiscriminately or commit all files.
2. Prior merged PRs include #38–#43. Last main observed was `f6ea5591f2384ba2ddf9f27ac19bbc3558b4c94c`; local HEAD remained older with those changes present as a dirty working tree. Treat this as historical context and verify current state. Prefer a fresh isolated checkout from current remote main with a `codex/` branch, preserving the current checkout.
3. Inspect deployed schema read-only using an authorized Supabase connection. Never print credentials or `.env` values. Review function definitions, defaults, triggers, policies and grants for `stock_movements`, `fabricator_profiles`, `calculate_stock_from_movements`, `sync_stock_from_movements`, and `check_stock_levels`. Existing schema may differ from migration 006/023.
4. Record schema differences and counts of metre, piece and kg movements; profiles with a balance but no movements; notes with `len=`; ambiguous units. Do not infer bar lengths from arbitrary historical text or silently rewrite data.
5. Use local/staging database fixtures for destructive and concurrency tests. No invented production catalogue approval, stock movement, purchase or qualification. The existing CALUMINIUM R2 test approval remains pending; retain that gate. Do not cancel existing deployments without the user's specific authorization.

## PR 1 — authoritative ledger and atomic intake (first priority)

Source entry points:

- `src/components/fabricator/InventoryDashboard.tsx`: invoice/CSV submission around lines 430–650.
- `src/components/fabricator/PurchaseWizard.tsx`: catalogue materialization and per-row movement inserts around lines 250–370.
- `src/lib/fabricator/inventory/stockIntake.ts`: insertion followed by separate reconciliation; retry tokens are supplied by callers.
- `src/lib/inventory/StockCalculator.ts`: RPC and raw-quantity fallback.
- `migrations/006_remnant_management.sql`: original movement constraints and before/after fields.
- `migrations/023_add_calculate_stock_from_movements.sql`: raw-quantity summation and sync.
- `supabase/migrations/20261005_stock_movements_idempotency.sql`: existing per-owner idempotency index.

### Design and implementation

- Choose a single canonical metre delta for linear profile stock. Preserve input unit, purchased bar count, individual stock length, finish, invoice and supplier as structured metadata/lot fields. Do not add bar counts to metre balances; do not reinterpret kg as metres without a validated conversion.
- Add a versioned migration under `supabase/migrations/`; don't edit an already-applied migration as the sole fix. Match actual deployed numeric types and constraint requirements.
- Preserve opening stock explicitly. Profiles with no ledger need an auditable opening entry so 50 m plus a new 6 m intake becomes 56 m. Historical mixed-unit ledgers need a reviewed reconciliation report; never automatically assume the present balance is an opening balance when movements already exist. Migration reruns must not duplicate openings.
- Build one owner-scoped intake RPC with canonical validated lines, request UUID/key and payload hash. Derive owner from auth.uid(); reject mismatched profile owners. Restrict public/anonymous execution and use a fixed search_path if SECURITY DEFINER is necessary. Harden legacy RPC entry points too; client filters do not secure definer functions.
- Persist request identity and hash in the database. Same request + same payload returns the original receipt; same request + changed payload rejects. Batch insertion, any owned profile creation, ledger update and balance reconciliation must be a single transaction.
- Lock affected profiles in a deterministic order for concurrent purchases. Return a validated receipt containing request identity and affected canonical balances/versions. Avoid computing before/after from stale browser props. Include all required fields according to deployed schema.
- Route invoice, CSV and PurchaseWizard through the shared API. Wizard currently identifies profiles by name and assumes aluminum; use a stable catalogue key + pack + material + finish. Define compatibility mapping without merging distinct profiles that share names.
- Keep pending client request identity through transient failure/reload, scoped by user; clear after a verified receipt. Do not store credentials. Avoid automatic replay of an unconfirmed draft.
- Replace or fail closed on StockCalculator's direct fallback when unit/schema semantics are unsupported. Errors must remain visible, not become a fabricated zero balance.
- Review the current read-load reconciliation side effect; prefer authoritative writes at intake and read-only stock loading once migration is complete.

### Mandatory database acceptance tests

1. Ten bars × 6 m = 60 m through invoice, CSV and wizard; metres input remains unchanged.
2. Mixed 6 m and 7 m lots retain cut-feasibility data, with correct metre totals.
3. Opening 50 m + intake 6 m = 56 m, including migration rerun and retry.
4. A batch with one invalid/foreign profile inserts nothing and changes no balances.
5. Concurrent requests sum correctly; identical retry inserts once; changed-payload retry rejects.
6. Simulated reconciliation failure rolls back intake; reload/retry does not duplicate it.
7. User A cannot read/recalculate/write user B's stock through any public RPC; anonymous execution fails.
8. Ambiguous legacy pieces/kg entries are reported for review; no guessed conversion.
9. Adjustment, return, consumption and transfer semantics are explicitly covered (transfer must not inflate a workshop-wide total merely because it changes location).

## PR 2 — project demand, stale evidence and intake UX

Files: `StudioStockPage.tsx`, `bomStockDemand.ts`, `ProfileInventoryAdapter.ts`, `profileInventoryMapper.ts`, `workflowStore.ts`, `studioWorkflow.ts`, `OptimizationPage.tsx`, inventory dashboard and new dedicated helpers/components.

- Show active revision demand by catalogue code/owned ID: required metres, available metres, shortage, eligible bar lengths and compatible remnants. Separate missing catalogue-to-owned mapping from genuine insufficient stock. Match finish/material/pack, not display name.
- Keep qualification required for acknowledgement. Show the exact prerequisite and a BOM navigation action. Hide internal UP-10 jargon from user-facing headings.
- Represent acknowledgement as a soft check, distinct from real allocation. Bind it to BOM identity/hash and authoritative stock version. Refresh/invalidate after intake, adjustments and other project consumption. Revalidate server-side before release/allocation, with atomic reservation only if that workflow is implemented.
- Render shortage in amber/red, not the current green check. Surface inventory loading/error state and prevent acknowledgement until authoritative data is available.
- Parse CSV using a proper quoted-field parser already available in dependencies, or add a justified dependency. Preview normalized lines with row-level errors before submission. Validate finite positive quantities, supported units and positive lengths; reject unknown units rather than treating them as bars. Resolve ambiguous catalogue codes explicitly. Don't silently skip bad rows.
- Add history pagination, date/profile/invoice/project filters, export and before/after balances. Distinguish empty history, loading and error. Existing history fetch caps at 50.
- Make refresh refresh owned quantities as well as alerts/remnants/history; show last successful refresh and errors.

Acceptance: exact BOM shortages, missing mapping, unit parsing with quoted supplier commas, retry after reload, stale-stock gate after another project's consumption, failed fetch distinct from empty, and keyboard-labelled controls. Add focused component tests for behaviors, not mirrored implementation assertions.

## PR 3 — pricing, remnants and meaningful analytics

- Separate pricing setup from stock overview; reconcile two owned BATCH0 profiles versus the current zero-row pricing table. Make currency explicit across EGP inventory and USD catalogue prices, with configured conversion and source/date if conversion is used.
- Disable/explain catalogue packs with zero purchasable profiles. Respect real material/finish and catalogue identifiers when materializing owned stock.
- Show consumption and ageing from real ledger data, reorder coverage and remnant reuse rate. Remove unsupported AI prediction wording until a validated feature exists. Do not present today's fixed 100 m reorder suggestion as a demand forecast.
- Add warehouse/location and bar-lot drilldown, barcode intake and compatible remnant selection as a separate bounded follow-up if schema complexity warrants it.
- Check desktop/mobile overflow, table readability, empty/error states and accessible icon-only alert actions.

## Validation and rollout

Existing baseline run on 2026-10-06: four inventory test files, 16 tests passed:

```powershell
node node_modules/vitest/vitest.mjs run src/lib/fabricator/inventory/stockIntake.test.ts src/lib/fabricator/inventory/ProfileInventoryAdapter.test.ts src/lib/fabricator/inventory/bomStockDemand.test.ts src/lib/fabricator/inventory/profileInventoryMapper.test.ts
```

Also run new database integration tests, relevant workflow fail-closed tests, changed-file lint and production build. Record baseline failures separately: root type-check script has previously been a no-op config; full app type-check has existing errors. Do not claim full clean typing from the root script alone.

Stage migration and application together with a compatibility/rollout plan. Archive a pre-migration reconciliation report and verify balances before/after. Do not rely on frontend deployment rollback to undo ledger/schema changes; prefer a corrective forward migration that preserves movement history.

Live E2E after staging checks: create a clearly named disposable test project/owned lot in an agreed test scope; intake by each supported path, retry the same request, view history/alerts, inspect project shortages, consume/reserve against the proper authoritative workflow, and verify remnants. Qualified optimization requires authorized workshop-approved catalogue/rules. If none exists, verify the blocked approval path and record that full manufacturing E2E remains pending rather than fabricating approval.

Deliver each PR with concrete before/after behavior, test evidence, migration impact and screenshot. Keep a checklist of completed steps and known limitations in this file.

## Completion checklist

- [x] Current remote/workspace reconciled safely; deployed SQL inspected
  - Isolated worktree `C:/projects/almona-stock-upgrade` on `codex/stock-ledger-intake` @ `f6ea559` (origin/main). Original dirty checkout preserved.
  - Deployed inspection: `tmp/stock-schema-inspection-2026-10-06.md`
- [x] Legacy balances/units reviewed; opening ledger preserved *(migration authored; not yet applied)*
  - Live: 44 metres-only `in` movements; 0 pieces/kg; 0 `len=` notes; 2 unledgered openings (BATCH0 Frame 60 = 50 m, BATCH0 B Frame = 20 m).
  - Opening INSERT is idempotent via `opening_ledger:{profile_id}` + NOT EXISTS guards.
- [x] Owner-scoped atomic/idempotent intake verified in database
  - Applied to production 2026-10-06 (authorized): see `tmp/stock-migration-applied-2026-10-06.md`
  - Openings preserved; anon revoked; disposable lot intake 10×6=60, replay, foreign reject, metres +6→66, transfer non-inflating
- [x] All three UI entry paths use canonical metre quantities and same transaction *(client wired; needs frontend deploy)*
  - Invoice, CSV, PurchaseWizard → `recordAtomicStockIntake` / `record_stock_intake`.
  - Pending request UUID persisted in user-scoped localStorage (`stockIntakeRequest.ts`); cleared after verified receipt; no auto-replay.
- [x] BOM demand, missing mappings, shortages and stale evidence handled *(PR2 on `codex/stock-pr2-demand-history`)*
- [x] CSV preview/validation and movement history upgraded *(PR2 — quoted parser, preview, filters/pagination/export)*
- [ ] Pricing/currency and analytics claims corrected *(PR3 on `codex/stock-pr3-pricing-analytics`)*
  - Inventory defaults to EGP; Pricing tab separated from Overview; empty catalogue packs disabled; ledger analytics replace predictive wording; TEST STOCK excluded from readiness totals
- [x] Required tests/build pass with baseline limitations reported *(unit subset)*
  - PR2 worktree: inventory + workflow focused tests green after demand/CSV/history changes.
  - Full app type-check / production build not claimed clean from root script alone.
- [x] Migration/deployment verified and authorized live E2E evidence recorded
  - DB PR1 applied; disposable lot marked `PR1 TEST Disposable Stock Lot` with `specifications.testStock=true`.
  - Frontend PR2 merged + production deploy `9bba5b9` READY on www.almona02.com (bundle markers verified). Interactive authenticated click-through still pending login.
  - Evidence: `tmp/stock-pr2-live-verify-2026-10-06.md`

## Known limitations (this session)

1. Supabase branching unavailable on current plan — DB acceptance ran against production with a clearly named disposable lot only.
2. PR2 is on production (`9bba5b9`); authenticated click-through of Studio Stock / CSV / history still needs a signed-in session.
3. CALUMINIUM R2 manufacturing approval gate remains pending — unchanged.
4. PR3 implemented on `codex/stock-pr3-pricing-analytics` (not yet merged/deployed).
5. Disposable lot `PR1 TEST Disposable Stock Lot` remains at **66 m** for optional UI inspection; excluded from readiness totals; delete when no longer needed.
