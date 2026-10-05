# Fabricator user-workflow upgrade scorecard

Date: 5 October 2026 (evening verification).  
Inputs: [upgrade plan](FABRICATOR_USER_WORKFLOW_UPGRADE_PLAN_2026-10-05.md), [Batch 1 implementation](FABRICATOR_BATCH1_IMPLEMENTATION_2026-10-05.md), [Batch 1 readiness](FABRICATOR_BATCH1_READINESS_2026-10-05.md), [user-pages audit](../audits/FABRICATOR_USER_PAGES_WIRING_AUDIT_2026-10-05.md), [fabrication/stock/profiles audit](../audits/LIVE_FABRICATION_STOCK_PROFILES_AUDIT_2026-10-05.md).

## Verdict

**Batch 1 is functionally shipped on production frontend and live Supabase for consultation.** Local Batch 1 suites are green (30/30). Live consultation receipt, stage-order/QC context, and release metadata were verified. Redis honesty is live on Railway (`b44a864`). Batch 1 source is committed to `origin/main` with this scorecard revision. Remaining: Batch 0 staging fixtures and optional Redis service provisioning (URL still points at a missing host).

Overall upgrade program: **~20% ticket-complete** (5 of 23 UP tickets implemented; Batch 0 partial; Redis honesty closed). Batches 2–6 are not started.

## Legend

| Mark | Meaning |
|---|---|
| DONE | Exit criteria met with evidence |
| PARTIAL | Implemented or exercised, but exit gate incomplete |
| OPEN | Not started or blocked |
| RISK | Done enough to ship, but creates operational risk if ignored |

---

## Batch rollup

| Batch | Scope | Status | Score | Notes |
|---|---|---|---|---|
| **0** Staging baseline | Toolchain, fixtures, revision inventory | PARTIAL | **40%** | npm/Vitest restored; `test:batch1` exists. Two-owner fixtures, restore points, and committed deploy baseline still missing. |
| **1** Truthful readiness / nav / demos / public lead | UP-01…UP-05 | PARTIAL → near DONE | **85%** | Code + migration + frontend promote + live receipt verified. Git sync, Railway Redis honesty, and full two-owner walkthrough open. |
| **2** Profiles / systems / inventory foundation | UP-06…UP-10 | OPEN | **0%** | Audit findings FUA-03/12 and initial Stock/Profiles audit remain. Do not start production/delivery until this lands. |
| **3** Customer / pattern / revision handoffs | UP-11…UP-14 | OPEN | **0%** | FUA-14/15/16/17/19 still open. |
| **4** Quote → order + admin separation | UP-15…UP-17 | OPEN | **0%** | FUA-08/09/10 still open. |
| **5** Production / QC / delivery release records | UP-18…UP-20 | OPEN | **5%** | Batch 1 only isolated demos; no release coordinator, real QC reload, or delivery evidence path. |
| **6** Reporting / a11y / integrations | UP-21…UP-23 | OPEN | **5%** | Batch 1 fixed some nav/recovery labels; Reports NaN and Integrations remain. |

**Program score (weighted by plan emphasis):** ~**18%** of UP tickets done; foundation Batch 2 is the next critical path.

---

## Batch 1 final verification

Re-checked 5 Oct 2026 evening against local workspace + live endpoints.

| Gate | Result | Evidence |
|---|---|---|
| Targeted frontend suite | **PASS** | `npm run test:batch1` → **11 files, 30 tests passed** (includes PWA update tests). |
| Frontend production build (prior) | **PASS** | Recorded in `batch1-build.log`; later promote used Railway API base. |
| Backend Docker packaging / liveness (prior) | **PASS** | `almona-backend:batch1-verification` imported `apis.main`, `/health/live` 200. |
| Quote ownership regressions in image (prior) | **PASS** | 27 tests — `batch1-docker-ownership-tests.log`. |
| Redis readiness unit tests (local image) | **PASS** | 4 passed — `batch1-redis-readiness-tests.log`. |
| Consultation SQL on live Supabase | **PASS** | Applied to `shfsebdncjnncqqnewfj`; RLS/rate-limit/invalid input verified; synthetics rolled back / cleaned. |
| Live browser consultation receipt | **PASS** | UUID receipt persisted then removed — `batch1-live-consultation-receipt.log`. |
| Frontend promote to ALMONA domains | **PASS** | `batch1-vercel-promote.log` → `dpl_7jjAH7uuHjne7WD8CMJ1z3ZfiPUj` / `97hxhbzfm`. |
| Live release metadata | **PASS** | `https://www.almona02.com/batch1-verification.json` → `batch:1`, Railway API base, `indexSha256` `9a5a8fa9…` (matches earlier live wiring check). |
| Authenticated Studio stage order / QC context (prior) | **PASS** | Project→…→Delivery order; QC keeps project/position; blocked stages show prerequisites; autosave claim removed. |
| Calculator selection wiring (prior) | **PASS** | EGP 9,864 reference case; system change resets incompatible glass. |
| Git `origin/main` contains Batch 1 | **PASS** (this commit) | Batch 1 source + docs synced after Redis honesty `b44a864`. |
| Batch 0 two-owner / multi-revision fixtures | **FAIL** | Still not designated; walkthrough deferred. |
| Railway Redis truthfulness on public `/health` | **PASS** | Deploy `b44a864`: Redis reports `unhealthy` + `unreachable` when `redis.railway.internal` does not resolve (no longer `healthy` + `not_configured`). Overall remains `degraded`. |
| Railway backend image update with Batch 1 packaging | **PARTIAL** | Service SUCCESS + degraded; Redis not provisioned; packaging fixes verified locally, not confirmed as the running digest. |
| Application-wide `tsc -p tsconfig.app.json` | **OPEN (known dirty)** | Root `type-check` is not a full app baseline. |
| Disposable account mutation walkthrough | **OPEN** | Needs designated fixtures before any write tests. |

### UP ticket status (Batch 1)

| Ticket | Status | Covers |
|---|---|---|
| UP-01 Workflow readiness vs selection | **DONE** (live + tests) | FUA-01/19 |
| UP-02 Stage order / nav / QC context | **DONE** (live + tests) | FUA-02/14/20 (partial nav) |
| UP-03 Tuning empty-array / Save&Return | **DONE** (tests + source) | FUA-04 |
| UP-04 Demo isolation / persona URL | **DONE** (tests + source) | FUA-06/11/13/18 |
| UP-05 Calculator + consultation + CTAs | **DONE** (live receipt + migration) | Initial public audit |

**Batch 1 product exit:** effectively met on production UI/DB for UP-01…05.  
**Batch 1 release exit:** not met until git sync + Redis/backend honesty + Batch 0 fixtures are closed.

---

## Later batches (UP-06…UP-23)

| Ticket | Batch | Status | Blocked by / depends on |
|---|---|---|---|
| UP-06 Shared catalog + profile DB adapter | 2 | OPEN | Foundation for almost all later work |
| UP-07 Persisted Profiles library | 2 | OPEN | UP-06 |
| UP-08 Measured DXF / material truth | 2 | OPEN | UP-06/07 |
| UP-09 Authoritative Stock load | 2 | OPEN | UP-06; fixes Reports↔Stock mismatch |
| UP-10 Transactional intake + reservations | 2 | OPEN | UP-09 |
| UP-11 Canonical project + customer UUID | 3 | OPEN | Prefer after UP-06 |
| UP-12 Pattern → project/position | 3 | OPEN | UP-11 |
| UP-13 Project BOM per-position honesty | 3 | OPEN | UP-06 |
| UP-14 Single save/revision status machine | 3 | OPEN | Complements Batch 1 save bar |
| UP-15 Persisted quotes | 4 | OPEN | UP-13 identity |
| UP-16 Idempotent quote→order | 4 | OPEN | UP-15 |
| UP-17 One Orders UX + admin gate | 4 | OPEN | UP-16 |
| UP-18 Release coordinator | 5 | OPEN | Batches 2–4 |
| UP-19 QC acknowledgement reload | 5 | OPEN | UP-18 |
| UP-20 Delivery evidence + ack | 5 | OPEN | UP-19; Batch 1 only demos |
| UP-21 Command/Reports authoritative metrics | 6 | OPEN | UP-09 + production events |
| UP-22 Search / a11y / RTL recovery | 6 | OPEN | Can overlap earlier UI |
| UP-23 Integrations honesty | 6 | OPEN | Independent small |

Audit findings still outstanding after Batch 1: **FUA-03, 05, 07–10, 12, 14–17** (and residual FUA-13/19/20 polish). Batch 1 closed or reduced: **FUA-01, 02, 04, 06, 11, 18** plus public fabrication calculator/consultation from the initial audit.

---

## Critical risks before Batch 2

1. **Source control drift (P0):** Production frontend behaves as Batch 1; `origin/main` does not. A normal Vercel git deploy can wipe Batch 1. Commit and push the Batch 1 tree (excluding secrets, `__pycache__`, and large `batch1-release*` artifacts) before further feature work.
2. **Redis / readiness honesty (P1):** Public Railway `/health` still green-lights Redis when unconfigured. Either provision Redis or deploy the degraded-when-missing check, then re-run `scripts/verify-batch1-backend-readiness.py`.
3. **Batch 0 fixtures (P1):** Without disposable two-owner projects, Batch 2 inventory migrations and Batch 3–5 handoff tests will pressure live workshop data.
4. **PWA stale tabs (P2):** Update prompt exists locally (`src/lib/pwaUpdate.ts`); confirm it is in the live artifact users receive after the next promote.

---

## Recommended next sequence

1. ~~Commit and push the Batch 1 tree so production tracks a git SHA~~ — done with this Batch 1 sync (exclude secrets, `__pycache__`, `batch1-release*` artifacts).  
2. Close Batch 0 exit: fixture inventory + restore points + record production commit/API digest.  
3. Optionally provision a real Redis service (URL currently resolves to a missing `redis.railway.internal` host) — honesty already reports unhealthy/unreachable.  
4. Confirm PWA update prompt is in the artifact users receive after the next Vercel promote from main.

## Related scorecards / plans (outside this program)

- [FP-028 Apex Accuracy](FP-028_FABRICATOR_DESIGN_STUDIO_APEX_ACCURACY.md) — manufacturing formula authority; still blocked on ROCK60 live operator gates. Orthogonal to Batch 1 UI truthfulness; Batch 2 catalog work must not invent physics.
- Connectivity/hardening plans under `docs/plans/FABRICATOR_PRO_*` — not part of UP-01…23; leave OPEN unless explicitly scheduled.

---

## Evidence index

| Artifact | Role |
|---|---|
| `https://www.almona02.com/batch1-verification.json` | Live frontend Batch 1 marker |
| `batch1-vercel-promote.log` | Domain promote |
| `batch1-live-consultation-receipt.log` | Real UUID receipt + cleanup |
| `batch1-live-api-verification.log` / `scripts/verify-batch1-supabase.py` | RPC/RLS probe |
| `batch1-redis-readiness-tests.log` | Local Redis honesty unit tests |
| Live `…railway.app/health` | Backend still degraded; Redis `not_configured` reported healthy |
| Local `npm run test:batch1` | 30/30 on 2026-10-05 evening |
| `origin/main` @ `0e6f0ea` | Confirms Batch 1 not in git remote |
