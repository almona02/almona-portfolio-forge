# DO-1 Staff daily operations — local implementation acceptance

**Status:** Local implementation recorded · **not** staging/production apply · **not** merge · **not** DO-2/DO-3 · **not** scheduler  
**Proposal tip:** `4c8285117b3a304b7f113885d14b260259128e70`  
**Migration:** `supabase/migrations/20261118230000_service_daily_ops_do1_staff_workspace.sql`  
**Migration sha256 (LF-normalized):** `cbb48f7a91eac61b9a5c2de716c951d625e3065acf9288c31764e20774e97e7b`

## Old → new acceptance ID map

| Old (`187c49c9`) | New (`4c828511` / impl) | Notes |
|------------------|-------------------------|-------|
| DO-01 | DO-01 | Empty chips / muted empty |
| DO-02 | DO-02 | Overdue generated occurrences (units = occurrences) |
| *(implied in DO-02)* | DO-03 | Ungenerated candidates excluded; no auto-generate |
| DO-03 | DO-04 | Unassigned jobs |
| DO-04 | DO-05 | Jobs awaiting review (job units + label) |
| DO-05 | DO-06 | Awaiting customer tickets |
| DO-06 | DO-07 | Technician 403 |
| DO-07 | DO-08 | Customer 403 |
| DO-08 | DO-09 | Error ≠ successful zeros (UI); support read parity in DB) |
| DO-09 | DO-10 | Read-only navigation / zero writes |
| DO-G1…G3 | DO-G1…G3 | Generation boundary unchanged |
| DO-10…DO-13 (later) | DO-11…DO-14 deferred | DO-2 / DO-3 only |

## Predicates (locked)

Open-ticket scope = `status NOT IN ('closed','cancelled')` — **not** `status = 'open'`.

| Queue | Unit | Predicate |
|-------|------|-----------|
| Overdue service work | occurrences | `planned_due_date < Cairo as_of` + parent eligible |
| Unassigned jobs | jobs | `state = 'unassigned'` + parent eligible |
| Jobs awaiting review | jobs | `state = 'awaiting_review'` + parent eligible |
| Awaiting customer | tickets | `status = 'awaiting_customer'` |

Count = `jsonb_array_length(items)` from the same SELECT. Authz DETAIL `staff_daily_ops_authz_denied` → 403.

## Evidence layers (local run)

| Layer | How | Result |
|-------|-----|--------|
| Database | `python scripts/service-workflow/run_disposable_daily_ops.py` | **13/13 PASS** → `.artifacts/slice0/service-workflow/disposable_daily_ops_results.json` |
| Component | `npx vitest run --config vitest.do1.config.ts` | **8/8 PASS** → `.artifacts/slice0/service-workflow/staff_daily_ops_component_results.json` |
| Real-browser | `node scripts/service-workflow/staff_daily_ops_browser_smoke.mjs` | **9/9 PASS** → `.artifacts/slice0/service-workflow/staff_daily_ops_browser_results.json` |

Frozen implementation SHA is the commit that lands this change set; migration sha256 above; DB JSON also records `implementation_sha` at battery time.
