# DO-2 Technician daily operations — local implementation acceptance

**Status:** Local acceptance recorded @ `d65e5636` · staging apply separately authorized · **not** merge · **not** production · **not** DO-3 · **not** squads/notifications/scheduler  
**Proposal tip:** `82f74069fd5fbd57ef19c47b4e66cb46b2424f19`  
**Migration:** `supabase/migrations/20261119190000_service_daily_ops_do2_technician_workspace.sql`  
**Migration sha256 (LF-normalized):** `fa9db26a4b3a7d8d6595c1eaeaa9d89b95c5303b2e417de875a95f9bdd81406f`  
**Frozen implementation SHA:** `d65e5636df7aea5810c582d1ac1d4d12b756b437`

## Mechanism note (corrected)

Technicians open ticket shells via the **authorized getter** `get_technician_ticket_header` (SECURITY DEFINER). Focus uses **`resolve_technician_ticket_focus`** (authorized workflow membership only; invalid/cross-ticket/unauthorized → `focused=false` with no disclosure). Report bundles use **`get_service_report_for_visit`**.

Do **not** describe ticket access as “equivalent RLS SELECT” on `service_tickets` — technicians remain denied on direct ticket-table SELECT under staging-equivalent RLS. Job/visit rows continue to use existing `can_read_ticket_workflow` policies. **No** `service_tickets` SELECT broadening and **no** RLS disable.

### New assignee vs historical attendee (reconciled)

| Actor | Read / focus | Report submit / revision |
|-------|----------------|--------------------------|
| **Current assignee** (incl. new assignee after reassignment) | Allowed where **existing** workflow/header policy permits (job assignee arm) | Only for visits **they** attended (R4-05) |
| **Historical completed-visit attendee** (former assignee) | Allowed via attending arm of header/workflow getters | Retains separate R4-05 submit/resubmit for **their** completed visits |
| **Unrelated technician** | Denied (header/focus `null` / `focused=false`) | Denied |

**Do not** introduce a new read denial for the new assignee. Reassignment must not strip historical-attendee report authorship, and must not grant the new assignee submit rights on visits they did not attend.

## Predicates (locked from proposal)

| Queue | Unit | Predicate gist |
|-------|------|----------------|
| Assigned jobs | jobs | Current `assigned_technician_id`; non-terminal; open ticket |
| Upcoming visits | visits | `scheduled` + non-null start; current assignment; Cairo `[as_of, as_of+7]` |
| Needs attention | visits (once) | Overdue wall-clock / in-progress+checklist / report submit / returned revision |

Count = `jsonb_array_length(items)`. Authz DETAIL `technician_daily_ops_authz_denied` → 403. Viewing is read-only.

## Evidence layers (local / Spark @ `d65e5636`)

Keep layers distinct — do not fold stubbed-browser or disposable rows into the Spark live database journey.

| Layer | Label | How | Result | Qualification |
|-------|-------|-----|--------|---------------|
| Database (Cursor disposable) | **database-only** | `python scripts/service-workflow/run_disposable_do2.py` | **24/24 PASS** → `.artifacts/slice0/service-workflow/disposable_do2_results.json` | Staging-eq FORCE RLS + authenticated SELECT probe |
| Database (Spark probes) | **database-only** | Spark `spark_do2_probes.sql` | **27/27 PASS** → `.artifacts/slice0/service-workflow/spark-do2/spark_do2_database_only_probes.txt` | Queue/predicate/RLS/header/focus/getter probes; not browser |
| Database journey (Spark) | **database journey** | Spark `spark_do2_journey.sql` | **34/34 PASS** → `.artifacts/slice0/service-workflow/spark-do2/spark_do2_database_journey_34_34.txt` | Live assign/start/reassign/submit/resubmit RPC journey; not stubbed browser |
| Component (Vitest) | component | `npx vitest run --config vitest.do2.config.ts` | **8/8 PASS** → `.artifacts/slice0/service-workflow/technician_daily_ops_component_results.json` | jsdom + mocked supabase |
| Real-component browser | **stubbed browser** | `node scripts/service-workflow/technician_daily_ops_browser_smoke.mjs` | **20/20 PASS** → `.artifacts/slice0/service-workflow/technician_daily_ops_browser_results.json` | Chromium · **stubbed HTTP** · not full-stack · not the Spark 34/34 journey |

### Explicit qualifications (preserved)

1. **Full-stack isolated browser unavailable** for Cursor local acceptance (no GoTrue+PostgREST+Vite app journey against a live disposable stack). The Chromium layer is **real-component with stubbed HTTP** only — distinct from Spark’s **34/34 database journey**.
2. **Live B2 / report mutations** are covered by Spark’s **34/34 database journey** evidence (preserved above), not by the stubbed-browser layer. Staging verification remains separately authorized.

## Acceptance coverage map

| ID | Layer |
|----|-------|
| DO2-01…DO2-06, DO2-10, DO2-12, DO2-13, overdue/NULL clarifications | Disposable DB (**database-only**) |
| Spark SP-DO2 probes (queues, RLS, header/focus/getter) | Spark probes (**database-only** 27/27) |
| Spark J-DO2 live assign / reassign / submit / resubmit | Spark journey (**database journey** 34/34) |
| DO2-07/08/09 focus href + expand/scroll contracts; DO2-11/13 UI | Vitest + **stubbed browser** |
| DO2-06 chain: queue → header getter → focus getter → report getter; direct ticket SELECT denied; new-assignee read retained / submit separate | Disposable DB + Spark journey |

## Out of scope (unchanged)

Merge · production · DO-3 · squads · notifications · scheduler · new workflow states. Staging apply/verification is a **separate** controlled authorization.
