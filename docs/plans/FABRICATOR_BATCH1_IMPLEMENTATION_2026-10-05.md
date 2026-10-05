# Fabricator Batch 1 implementation

Date: 5 October 2026. Status: **frontend promoted to production domains**; consultation migration + live UUID receipt verified; Batch 1 suites **30/30** green. **Not release-closed:** Batch 1 source largely uncommitted on `origin/main`, Railway Redis still reported healthy when `not_configured`, Batch 0 two-owner fixtures and full multi-revision walkthrough still open. Scorecard: [FABRICATOR_UPGRADE_SCORECARD_2026-10-05.md](FABRICATOR_UPGRADE_SCORECARD_2026-10-05.md).

## Changes

- Workflow selection and completion are separate. Manufacturing completion requires a qualified BOM whose identity matches the saved position revision, clean draft state and reconciled optimization. QC uses the matching acknowledgement, rather than the position's status string. Blocked active stages display prerequisites and a recovery link. Estimate BOM and draft quotes display warnings.
- Stage order is Project → Measure → Design → BOM → Stock → Optimize → Quote → Production → QC → Delivery. The Design action says Review BOM. Reports is visible; duplicate production Orders navigation is removed. Dashboard shortcuts use Studio routes. Quote's empty state links to optimization. QC navigation carries project/position context and rejects a different loaded position.
- Empty and unresolved profile sets cannot become tuned. Save & Return cannot silently mark profiles tuned; bulk tuning is blocked for empty packs. Messages distinguish saved tuning from manufacturing approval.
- URL role overrides are removed. Dashboard samples and kiosk simulation are labeled Demo. Kiosk logs use a separate demo storage key and no longer publish workflow completion callbacks. Delivery's current simulated capture UI requires an explicit component demo prop and cannot emit operational events or completion callbacks. The normal route explains the missing authoritative evidence integration.
- Public calculator uses the shared Radix Select and resets incompatible options on system changes. Consultation validates bounded name/phone/project/system/message fields, prevents repeated submission after receipt, and only claims receipt after an acknowledged UUID. Failed submission offers direct contact. Portfolio and resource actions now have real consultation/contact destinations.
- The status bar distinguishes browser network availability from machine connectivity and no longer interprets a historical updatedAt as successful autosave.

## Dependency and backend verification

The locked npm dependency restore did not change package-lock.json. npm/npx 11.11.1 and Vitest 4.1.11 work in the approved execution context. Earlier development-backend checks used the local Python environment; the current production verification uses Python 3.11 inside Docker. The old local Python 3.11 environment still points at a missing interpreter. The current local pytest invocation needs `--noconftest -o addopts=` for the isolated policy test because backend test dependencies are incomplete.

Earlier backend source compilation and the development api.prestige_endpoints smoke check passed. With Docker Desktop available, the initial production image built but failed at import. The packaging fix adds defusedxml 0.7.1 and ezdxf 1.4.3; aligns Supabase 2.8.0, gotrue 2.12.4, realtime 2.5.3, httpx 0.27.2 and typing-extensions 4.14.1; and includes services/tasks. Other runtime pins remain unchanged. The backend-only context now bundles the canonical SLA policy, with a parity test preventing drift and an explicit Docker/git ignore exception.

The final `almona-backend:batch1-verification` image built successfully (image ID `sha256:de4dcd876add68f28b89d88660c34e08c1ae7de477ce3b2b46413fb8c419295d`). `pip check` passed; production `apis.main` imported; OpenAPI generated 113 paths; the default Uvicorn command reached application startup complete; and an actual container HTTP request to `/health/live` returned 200. No production secrets or external network were supplied. This verifies packaging and process liveness, not remote database/Redis readiness or the full endpoint suite. Existing optional SmartScan middleware, Sentry and OpenTelemetry are unavailable in this image; a duplicate feedback operation ID warning remains.

## Validation

- `npm run test:batch1`: **10 files, 27 tests passed again after the packaging edits**, covering retained identity, fail-closed optimization, measurement and QC guards plus readiness, receipt validation, role authority, tuning and delivery isolation. Active-page selection alone never implies progress; Stock remains Not recorded until reservation evidence is available, and generated production documents do not establish physical completion.
- `npm run build`: production bundle and PWA generation passed again after the dependency edits; recorded in batch1-build.log. Existing chunk-size and manualChunks warnings remain.
- Isolated packaged SLA policy test: **1 passed**; canonical frontend and packaged backend JSON are equal.
- Existing quote ownership regressions against the final image's dependencies: **27 passed**. These verify that authenticated identity controls quote ownership, invalid/expired sessions fail closed, and mismatched body claims are rejected before persistence. Evidence: batch1-docker-ownership-tests.log. Pytest was installed only in a disposable test container; it was not added to the production image.
- `npm run type-check`: passed. This root command checks an empty files list with project references, not the entire application. An explicit `tsc -p tsconfig.app.json --noEmit` revealed widespread existing application errors, including legacy Database types without Relationships. It is not a clean application-wide TypeScript baseline. The new consultation adapter has a narrow typed RPC boundary with runtime receipt validation.
- Final ESLint check across all changed source files and the new test files: **0 errors, 215 warnings**. No full-repository lint claim.
- Browser: 150 × 150 cm, one UPVC unit, double glazing and casement gives EGP 9,864 for Standard and EGP 12,947 for Premium. Aluminum Low-E → UPVC resets glass to Double Glazing and recalculates successfully. Initial dev preview loading was slow; no claim of performance improvement.

Logs are at the repository root: batch1-tests.log, batch1-build.log, batch1-typecheck.log, batch1-app-types.log, batch1-lint.log, batch1-backend-compile.log and batch1-backend-smoke.log.

The earlier disposable PostgreSQL 17 checks passed (batch1-sql-tests.log); that server was stopped. The local-only test SQL creates roles and must not be run on a live project.

## Live migration verification — 5 October 2026

Applied migrations/20261005_fabrication_consultation.sql through the signed-in Supabase SQL Editor to **almona02 / main / Production**, project `shfsebdncjnncqqnewfj`, matching the repository's public project URL. Both table and RPC were absent before application and present afterward. The PostgREST schema cache was reloaded. This was the configured live project, not a separate staging branch.

Live SQL checks passed: valid anonymous and authenticated submissions returned UUID receipts; four synthetic rows persisted within the transaction; the fourth submission for one phone was rejected after three accepted requests; invalid inputs raised 22023; anonymous and authenticated direct reads were denied; RLS was enabled; anonymous direct inserts were denied; the function is SECURITY DEFINER with `search_path=public, pg_temp`. Test writes were rolled back, and a separate query confirmed **zero synthetic rows remaining**. No customer records were deleted or displayed.

The public app API credential independently verified RPC visibility through PostgREST: invalid submission returned **400 / 22023**, and table read returned permission denial **42501**. This API probe created no leads. Replay script: scripts/verify-batch1-supabase.py. Evidence: batch1-live-api-verification.log. Dashboard verification query: https://supabase.com/dashboard/project/shfsebdncjnncqqnewfj/sql/466a12d7-4fbd-47ef-8548-8fe4c30a48df.

Docker evidence: batch1-docker-build.log, batch1-docker-runtime.log, batch1-docker-startup.log, batch1-docker-http.log. Policy parity evidence: batch1-sla-policy-tests.log. Disposable verification containers were removed after checks.

## Final verification — 5 October 2026 evening

| Check | Result |
|---|---|
| `npm run test:batch1` | **11 files / 30 tests passed** |
| Live `batch1-verification.json` on www.almona02.com | Present; Railway API base; `indexSha256` `9a5a8fa9…` |
| Vercel promote | Success — `almona-portfolio-forge-97hxhbzfm` / `dpl_7jjAH7uuHjne7WD8CMJ1z3ZfiPUj` |
| Live consultation browser receipt | PASS then synthetic row removed |
| Authenticated Studio (earlier same day) | Stage order + QC context + blocked prerequisites observed |
| `origin/main` contains Batch 1 | **FAIL** — HEAD still Measuring UX (`0e6f0ea`); deploy was artifact-based |
| Railway public `/health` | **degraded**; Redis `healthy` + `not_configured` (honesty fix not confirmed live) |
| Two-owner / multi-revision fixtures | Still required (Batch 0) |

## Staging / release-close still required

1. Commit and push the Batch 1 tree so production tracks a git SHA (exclude secrets, `__pycache__`, `batch1-release*` artifacts).
2. Complete Batch 0 disposable two-owner fixtures and restore points; finish multi-revision walkthrough without customer-record mutation.
3. Deploy Redis honesty (or provision Redis) and re-run backend readiness; confirm live `/health` no longer green-lights missing Redis.
4. Confirm PWA update prompt is in the artifact users receive after the next promote.

This batch removes simulated delivery completion. Real delivery persistence and revision-bound release/evidence integration remain Batch 5. Do not treat Batch 1 as release-closed until git sync and Batch 0 fixtures are done.
