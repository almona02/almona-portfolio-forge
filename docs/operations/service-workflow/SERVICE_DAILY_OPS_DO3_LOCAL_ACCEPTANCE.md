# DO-3 Customer daily operations — local implementation acceptance

**Status:** **LOCAL PASS** · **not** staging/production apply · **not** merge · **not** notifications/billing/stock/squads/scheduler · **not** new acknowledgment rules  
**Proposal tip:** `fd0387c88b265a24dbd6b966d2cbc94b2e916539` (stamp `830ddf1588d5c163436c2f2d1579567e88f26e70`)  
**Migration:** `supabase/migrations/20261119200000_service_daily_ops_do3_customer_workspace.sql`  
**Migration sha256 (LF-normalized):** `55b02c37e82a89ed8dfe203718181b45215a8af419a791b1fabe22f5408e6e7c`  
**Frozen implementation SHA:** `3f6618c4824bfa084ce97a2e7a69541f123de0f1`  
**Copy-only helper clarification (separate):** `2e3d90c68adf2407b2d7022550c11c0d294b9f47` — latest-visible issued wording only

## Mechanism

| Piece | Behavior |
|-------|----------|
| Workspace RPC | `get_customer_daily_ops_workspace` — caller-scoped; customer/admin/support; technician → `42501` / `customer_daily_ops_authz_denied` |
| Visible heads | Both **issued_reports** and **awaiting_acknowledgment** use `admin_private.revision_is_customer_visible` (one head per `service_reports` row) |
| Awaiting ack | Same population where `(effective_acknowledgment(id)).id IS NULL` |
| Upcoming | `list_machine_coverage_schedule` then `bucket ∈ {upcoming, due}`; **paused** rows remain when so classified |
| Focus | `resolve_customer_ticket_focus` for `panel=issued` (+ optional `revision`); superseded/foreign → `focused=false` |
| UI host | `CustomerDailyOpsStrip` on `/portal`; destinations reuse `/support/tickets/:id` + B6 accept/refuse anchors |
| Issued helper copy | Describes **latest-visible issued** reports only (copy-only commit above) |

Viewing the workspace creates or changes nothing (no generate, no ack writes from strip navigation).

## Evidence layers (keep distinct)

| Layer | Label | How | Result | Qualification |
|-------|-------|-----|--------|---------------|
| Database (Cursor disposable) | **database-only** | `python scripts/service-workflow/run_disposable_do3.py` | **21/21 PASS** → `.artifacts/slice0/service-workflow/disposable_do3_results.json` | Staging-eq FORCE RLS + visible-head / ack / schedule / focus probes |
| Component (Vitest) | component | `npx vitest run --config vitest.do3.config.ts` | **8/8 PASS** → `.artifacts/slice0/service-workflow/customer_daily_ops_component_results.json` | jsdom + mocked supabase |
| Real-component browser | **stubbed browser** | `node scripts/service-workflow/customer_daily_ops_browser_smoke.mjs` | **10/10 PASS** → `.artifacts/slice0/service-workflow/customer_daily_ops_browser_results.json` | Chromium · **HTTP-stubbed** · **not** full-stack |

### Explicit qualifications

1. **Full-stack isolated browser unavailable** for Cursor local acceptance (no GoTrue+PostgREST+Vite app journey against a live disposable stack). The Chromium layer is **real-component with HTTP-stubbed** responses only — **not** a full-stack GoTrue/PostgREST/Vite journey.
2. **No Spark live staging journey** in this acceptance — staging apply/verification remains separately authorized.
3. Disposable DB is **not** a substitute for Spark staging recheck.

## Acceptance coverage map

| ID | Layer |
|----|-------|
| DO3-01…DO3-11, DO3-13…DO3-16, DO3-09b, focus/supersession, count-to-destination | Disposable DB (**database-only**) |
| Strip empty/error/href contracts; issued focus + safe fallback | Vitest (**component**) |
| Empty/loading/populated chips, awaiting href, paused upcoming, ack anchors, error, evidence label | **stubbed browser** (10/10 HTTP-stubbed) |

## Out of scope (unchanged)

Staging apply · merge · production · new acknowledgment rules · notification delivery · billing · stock · squads · coverage scheduler / auto-generate · permission broadening.
