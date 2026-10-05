# Cursor implementation comparison — 5 October 2026

Compared supplied progress statements against local commits, current source, migration definitions, remote main, and available build evidence. This is an implementation audit, not an end-to-end acceptance certificate.

## Commit and deployment evidence

- Local HEAD: `5242a35`. Remote main, independently queried: `a599c54ccfb4caa4acfbd01bfc7878477df6b2e4`. Nine subsequent commits are local only.
- Security commit changes Python requirement pins, npm/mobile lockfiles, and **python_backend/railway.json**. There is no root railway.json in this checkout; the supplied root-file description is inaccurate.
- The Railway service manifest uses `/python_backend/Dockerfile.realistic`, matching the Industrial API. Last independently inspected successful live backend commit was `0e6f0ea`; local commit presence does not establish backend deployment.
- Industrial Docker build completed; runtime pip check passed and app OpenAPI generated 121 paths. However, that built image contains PyJWT **2.15.0**, while current requirement files pin **2.15.1**. Rebuild and recheck the current security revision before shipping this image.
- Frontend production build evidence exists in batch1-build.log. A newer candidate has been uploaded but not promoted. No new backend deployment or Git push was performed during this comparison.

## Comparison with Cursor claims

| Area | Implementation evidence | Acceptance limit |
|---|---|---|
| Batch 1 | Commit 91802b8 plus CI follow-up 7a3226a; consultation receipt previously verified live and synthetic row removed | Redis/live health remains degraded; build success is separate from service readiness |
| Batch 2 | CatalogResolver imports present in Project Studio, Optimization and Production; owned inventory adapter used by Stock; materialization/intake modules present | Intake acknowledgement has error-handling defects below; soft reservation does not prove server-enforced stock reservation |
| Batch 3 | c2b6fa0 and 3ef4d94 contain handoff/save work; later close d344587 exists | Save/customer/revision journeys still require fixture acceptance evidence |
| Batch 4 | Pose quote and order-link migration files plus 8a40189/b365e59 exist | Migration application and idempotent conversion need independent live acceptance |
| Batch 5 | Release fingerprints, QC reload, delivery RPC client and migration definitions exist in 06c4489 | Server ownership/revision enforcement needs strengthening; full A/B walkthrough is unrecorded |
| Batch 6 | b522ea8 exists for command/report/search/integration work | Code presence does not establish full accessibility, RTL or dialog acceptance |
| Batch 0 | 5242a35 records designated disposable owners and tagged fixture seed | Baseline still lists QC/delivery walk and deploy digest as open |

Baseline documentation now says all five October migration files were applied. This supersedes earlier supplied “SQL pending” statements, but this comparison has not independently checked every live object or exercised its RPC. Do not reapply migrations merely because older messages call them pending.

## Findings requiring correction before declaring program exit

Fresh targeted verification: Batch 1 **32/32 passed** across 11 files. Catalog/inventory/release suites **20/21 passed** across six files; materializeOwnedProfiles.test.ts fails because its Supabase mock lacks `.contains()`. This is a stale test double rather than demonstrated production failure, but the claim that all these current checks are green is not reproducible. Lockfiles confirm fast-uri 4.2.1, serialize-javascript 7.1.2, DOMPurify 3.4.16 and mobile brace-expansion 2.1.7. Upstream availability claims for braces/node-forge were not independently revalidated in this comparison.

1. **P1 — Release authorization is client-dependent.** `fabricator_position_releases_insert_own` checks only `owner_user_id = auth.uid()`. Project/position IDs have no relational ownership constraint, revision freshness is not checked, and fingerprint strings are supplied directly by the client. An authenticated caller can insert a release with its own owner ID referencing another project/position or stale revision. Enforce referenced ownership/source/current revision and qualified artifacts in a server transaction/RPC; restrict direct inserts.
2. **P1 — Stock intake can falsely acknowledge failure.** `recordStockIntakeThenSync` treats any error message containing “idempotency” as success. A schema/cache error for a missing idempotency_key column would therefore be acknowledged even though insertion failed. Any 23505 is also accepted without identifying the intended constraint or matching the persisted payload. Verify a matching persisted movement before acknowledging a retry.
3. **P1 — Stock synchronization failure is swallowed.** `syncStockFromMovements` returns zero on RPC errors; intake then returns ok:true regardless. A successful insert followed by failed reconciliation can be presented as authoritative stock success. Propagate reconciliation failure and allow safe retry.
4. **P2 — Delivery evidence checks are narrower than the claim.** SQL checks hash lengths and non-null GPS, not hash format or geographic bounds; delivery acknowledgement also does not independently check current position revision. Matching release/QC IDs is valuable, but does not prove real photo/GPS capture or freshness by itself.
5. **P2 — Completion score is not acceptance evidence.** Scorecard says approximately 94% and all product exits met while baseline leaves release/QC/delivery and deployment digest open. The cross-owner reject test is called optional; it should be a required acceptance gate for owner-scoped writes.

## Recommended next slice

First repair server release authorization and stock acknowledgements, with negative tests for cross-owner IDs, stale revision, missing column, unrelated unique constraint, and failed sync. Then independently inventory live migration objects, run the designated A/B fixture journey (including stale revision and retry rejection), rebuild the secured backend, and record the exact frontend/backend deployment revisions. Keep implementation, migration, deployment and acceptance statuses separate in the scorecard. Do not infer an overall verified percentage from commit counts.

No customer records were changed for this comparison. Existing document moves and unrelated working-tree changes were preserved.
