# Fabricator repair execution — 6 October 2026

Status: implementation in progress; no new production deployment or Git push from this pass.

Canonical scope: [repair and optimization exit plan](../plans/FABRICATOR_REPAIR_AND_OPTIMIZATION_EXIT_PLAN_2026-10-05.md). This record does not close the failed live manufacturing journey.

## Applied locally

- Auth owner transitions immediately clear the prior profile, private React Query cache, persona cache and workflow artifacts. Deferred profiles and an older initial session cannot restore a previous owner. Initialization stays pending until the newer auth event installs its session, preventing a premature login redirect. Workspace snapshots use owner-specific browser keys, verify the authenticated owner, cancel obsolete hydration and wait for hydration before saving. Pose-save callbacks also verify the current authenticated owner before updating chrome.
- Saved-position hydration restores glazing, color, grid and preset. Position metadata cannot overwrite authoritative dimensions. Partial measurement updates preserve saved glazing.
- Inventory reads fail closed when movement reconciliation fails. Intake only acknowledges success after reconciliation; duplicate-key retries require an identical persisted payload, and a missing idempotency column is an error.
- Stock demand sums the expanded millimetre cut ledger exactly once, aggregates shared material profiles, uses profileCode as the material identity rather than a generated BOM row ID, and requires owned UUIDs and successfully reconciled inventory.
- Optimization uses component profiles rather than replacing them with the global catalogue. Solver, fallback and acceptance gate share calibrated length/angle preparation. Wrong geometry, bar overflow, inconsistent waste/utilization and impossible percentages reject. The solver rejects invalid fallback output too. Optimization completion preserves the reviewed BOM and stock acknowledgement.
- A qualified-status label alone is insufficient: identity, catalogue/rule versions, matching positive physical piece counts and no qualification reasons are required.
- Production QC/delivery deep links load the requested authoritative position before rendering; incomplete or foreign requests remain blocked.
- Release fingerprints include physical cut lengths/angles, catalogue/rule qualification, glazing, stock identity and bar grouping. This is a client consistency repair; server release authorization and durable optimization receipts remain open.
- Reinstalled the existing user npm installation at version 10.9.2 from the npm registry. npm and npx version commands pass outside the restricted tool sandbox. Bundled Node/npm can run workspace checks inside the sandbox.
- Shared inventory monetary displays accept an explicit currency, use EGP in Studio and Reports, and display unavailable finite values honestly. Invoice/CSV retries retain their operation token within the mounted editor until reconciliation and refresh succeed; durable retry recovery across browser restart remains open.

## Verification evidence

- `repair-final-tests.log`: 23 files / 84 tests passed across Batch 1, account-switch isolation, inventory, qualification, release fingerprints, physical ledger and actual deterministic solver integration.
- `repair-release-auth-tests.log`: 7 tests passed, including release fingerprint changes when individual cuts change without changing aggregate length.
- `repair-final-frontend-build.log`: production build passed; existing chunk and PWA build warnings remain.
- `repair-final-lint.log`: 0 errors, 331 warnings across reviewed production files, including the shared inventory dashboard and query hooks (mostly existing untyped Supabase calls).
- `repair-typecheck.log`: full application type check fails across the existing repository. No clean type-check claim is made.
- `repair-backend-readiness-tests.log`: 5 Redis-readiness tests passed in the existing Python virtual environment.
- `repair-backend-incremental-build.log`: current source and the full current `requirements-prod.txt` built against previously verified Industrial image `sha256:630b0c348f79166734a92086e5be6d0a21bed64ba3cf8a2a9ec572f596fb77dd`; PyJWT upgraded to 2.15.1 and strict `pip check` passed. Verification Dockerfile: `scripts/verification/Dockerfile.fabricator-repair`; image tag `almona-railway:fabricator-repair-verified`.
- `repair-backend-runtime-check.log`: network-disabled image import passed; PyJWT 2.15.1, 121 API paths, 109 `/api/v2` paths. Existing Pydantic and duplicate OpenAPI operation warnings remain.
- Clean `Dockerfile.realistic` build was cancelled after its 620.6 MB TensorFlow download stopped reporting progress for over 15 minutes. No clean-build success is claimed; Railway still uses the original Industrial Dockerfile. This pass produced a verified incremental local backend image, not a new Railway deployment.
- Final frontend entry is `/assets/index-DUj5-PS3.js`; index SHA256 `c672691c0bd8c286b56420235d27df8eff5991cda26865d288561fef2c7d5b33`.

Local production preview: an old cached entry on port 4173 was detected and excluded. Fresh-origin entry matched the build; Owner A's two owned profiles (50 m and 0 m) and the empty-stock alert rendered. Live API recheck confirms both fixture profiles currently have server role `admin`; cross-owner RLS and QC requests still reject. Earlier Customer/Admin header observations are not proof of a server privilege escalation.

Final artifact browser check on fresh port 4175: successful Owner A sign-in survived full navigation to the QC deep link; the requested saved position loaded with target 1200 × 1400 mm and `Revision loaded · R3`. The missing approved tolerance gate remained active and `Approve & Complete` remained disabled. No inspection or manufacturing approval was fabricated.

## Live approval inspection

The user proposed factory admin or technical office as the manufacturing approver. The live Owner A QC page is open at `/fabricator/studio/production/quality?projectId=a2000000-0000-4000-8000-0000000000a1&poseId=a3000000-0000-4000-8000-0000000000a1`.

Observed: R3, target 1200 × 1400 mm, error `approved dimensional tolerance rule is unavailable`, disabled `Approve & Complete` button. That button approves an inspection, not the governing manufacturing rule.

Source inspection found no manufacturing-authority publishing UI. `fabricator_qc_tolerance_rules` and `fabricator_manufacturing_authority_revisions` revoke authenticated writes. The existing Foundry configuration screen does not publish those approvals. Directly entering an approved flag in Supabase is not a substitute for an authorized, evidence-backed factory approval flow.

Required next implementation: factory-scoped approver membership and authorization; a technical-office rule draft/review screen with explicit units, catalogue/profile references, cutting rules, tolerance, source evidence and approval history; a restricted approval RPC. No authority/tolerance value has been invented or published during this pass.

## Remaining exits

1. Complete the factory approval workflow and obtain genuine rule evidence.
2. Consume approved rules in the manufacturing BOM engine; materialize owned profile mappings and verify every physical piece.
3. Persist server-accepted optimization runs, supported effective settings and their input fingerprints; protect quote/order/release writes with current owner/project/source/revision checks.
4. Complete concurrency and retry checks for QC and real permitted delivery capture.
5. Publish only a reviewed build with verified backend dependencies, then repeat both positive and cross-owner negative live journeys. Until then the program remains in repair, not verified exit.
