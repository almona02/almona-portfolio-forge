# Fabricator staging / migration plan — 9 October 2026

**Status:** awaiting explicit owner authorization.  
**Do not apply to production from this document.** No agent merge, force-push, or remote SQL apply without approval.

## Goal of this plan

Prove the manufacturing chain on **staging** (or a disposable Supabase project) before any live FINAL GOAL walk on `almona02.com`.

## Current verified state (read-only)

| Item | Evidence |
|---|---|
| Production frontend | GitHub Production deploy `f9954be9` (= `main` / merge #69) |
| Production DB (`shfsebdncjnncqqnewfj`) | Manufacturing migrations already present: `20261009001810`…`20261009002244` (admin workflow, convert, hardener) |
| Name drift | Local filenames (`20261008120000_*`, `20261009120000_*`, …) ≠ applied version numbers |
| Still name-based on prod | `system_pack_requires_hardener` uses `%-no-hardener` until #72 is authorized |
| Open code PRs | #70 measuring (tip green then RTL tests), #71 evidence harden, #72 applicability, #73 measured E2E CI |

## Candidate migrations (staging first)

| Order | PR | File | Effect |
|---|---|---|---|
| 1 | #71 | `20261009160000_fabricator_optimization_evidence_hardening.sql` | Placement validation, stock overrun reject, fingerprint bind |
| 2 | #72 | `20261009170000_fabricator_hardener_applicability_metadata.sql` | Versioned hardener N/A metadata; closes name loophole |

**Not included:** blanket manufacturing approval seeds, authority provenance=`seed`.

## Phase A — Pre-apply (no SQL)

1. Record rollback baseline: staging frontend SHA, Vercel URL, Railway digest, `schema_migrations` dump.
2. Confirm #70–#73 CI green on tips; undraft only after human review.
3. Replay migrations on empty DB path (#64) locally if available — report drift only.
4. Capture current `system_pack_requires_hardener` definition + count of `fabricator_optimization_evidence` rows.

## Phase B — Staging apply (requires authorization)

1. Apply #71 then #72 on **staging only** (forward-only).
2. Smoke RPCs:
   - `validate_optimization_evidence_payload` rejects overrun / bad schema
   - `record_fabricator_optimization_evidence` rejects `ledger-fp-*` and unbound fingerprints
   - `system_pack_requires_hardener('evil-no-hardener')` = true
   - `system_pack_requires_hardener('sandbox-no-hardener')` = false (seeded metadata)
   - `admin_override_fabricator_hardener` rejects empty evidence; non-admin denied
3. Fixture walk (Batch 0 or dedicated staging users): Measure → Design → BOM → Optimize → record evidence → convert (qualified) → release → QC → delivery.
4. Negatives: stale revision, revoked authority, missing evidence, pending/rejected hardener.
5. Record digests: Git SHA, frontend build, backend image, migration versions.

## Phase C — Production promote (only if Phase B exits)

1. Same artifact set as staging (no rebuild-and-hope).
2. Maintenance window; apply #71 then #72 only with explicit approval.
3. Post-deploy smoke on disposable project (not customer data).
4. Update `docs/reviews/FABRICATOR_SCORECARD_2026-10-09.md` live-acceptance section with digests.
5. Rollback: previous Vercel alias + Railway digest + documented restore point.

## Explicit non-goals until authorization

- Applying #71/#72 to production
- Claiming FINAL GOAL complete from estimate_only 10/18 metrics
- Seeding manufacturing authority for all packs
- Bypassing hardener / optimize evidence gates to force E2E green

## Approval checklist (owner)

- [ ] Staging project identified
- [ ] Authorize Phase B SQL apply
- [ ] Review #71 / #72 migration SQL
- [ ] After Phase B exit: authorize Phase C (separate decision)
