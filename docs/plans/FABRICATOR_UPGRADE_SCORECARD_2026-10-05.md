# Fabricator user-workflow upgrade scorecard

Date: 5 October 2026 (Batch 0 owners seeded on almona02).  
Refreshed: **8 October 2026** (stack #61–#68 local/CI evidence).  
Canonical sequencing: [upgrade plan](FABRICATOR_USER_WORKFLOW_UPGRADE_PLAN_2026-10-05.md) · [Batch 0 baseline](BATCH0_STAGING_BASELINE_2026-10-05.md) · [repair exit](FABRICATOR_REPAIR_AND_OPTIMIZATION_EXIT_PLAN_2026-10-05.md).

## Latest verification — 8 October 2026

| Evidence | Result |
|---|---|
| Sliding ledger required pieces | **23 / unit** = 4 frame + 8 sash + 1 interlock + 2 track + 8 bead (not corner-only 12) |
| 10-position / 18-unit pooled optimize | **414** placed pieces (= 23×18), **74** bars, kerf **4 mm**, waste **45057 mm**, efficiency **89.85%**, reload re-BOM **23** matches required |
| Classification | `estimate_only` — manufacturing-qualified / convert-to-order still gated on approved authority |
| Stack CI (head of #68) | Linux tsc base/head **SUCCESS**; Vercel preview **SUCCESS** |
| Cross-path ledger (#62) | Design-generator cut tuples + persist/hydrate parity tests landed |
| Hardener (#68) | Server-side checks, evidence binding, admin verification + audited overrides |

Artifacts: `/opt/cursor/artifacts/e2e-1018-metrics.json`. Earlier 6 Oct repair baseline (22 tests / PDF / responsive) remains valid for Batches 1–6 local repairs.

## Verdict

| Layer | Score | Meaning |
|---|---|---|
| **Implementation (Batches 1–6 code)** | **~94%** | Unchanged: local product work largely present |
| **Manufacturing stack (#61→#68) local/CI** | **~78%** | Ledger, sliding BOM count, admin fail-closed, convert evidence, hardener — verified in tests/CI, **not** live staging acceptance |
| **Live / staging acceptance** | **~35%** | Still open: approved authority on fixtures, durable server optimization receipt, release→QC→delivery walk, deploy digests |
| **Production deploy readiness** | **NOT READY** | Do **not** promote stack to production until staging Slice 8 exit passes |

Implementation estimate ≈ **94%** remains **not verified live acceptance**. Git publication and green PR checks do **not** imply deployment or workshop readiness. The 10/18 run proves piece conservation and optimize math under estimate classification; it does **not** clear manufacturing qualification or order conversion.

## Batch rollup (implementation estimates)

| Batch | Status | Score | Notes |
|---|---|---|---|
| **0** Staging baseline | **NEAR EXIT** | **80%** | Owners + seed live; QC/delivery walk + deploy digest open |
| **1** Truthful readiness | **DONE** | **95%** | |
| **2** Profiles / inventory | **DONE** | **95%** | Soft reservation; hard DB reservation deferred |
| **3** Customer / pattern / revision | **DONE** | **90%** | |
| **4** Quote → order | **DONE** | **90%** | Server convert gated in #67 — needs staging apply |
| **5** Production / QC / delivery | **DONE** | **95%** | Live walk still open |
| **6** Reports / a11y / integrations | **DONE** | **85%** | |

## Manufacturing stack rollup (8 Oct)

Merge order (bottom → top). Do not flatten onto `main` until #61 undrafts and each layer’s migrations are reviewed for staging.

| PR | Role | Draft | CI tsc Δ | Score | Gate remaining |
|---|---|---|---|---|---|
| **#61** | Integration reviewed slice (#53+#52+#58) | yes | pass | **90%** | Human undraft + merge to `main` first |
| **#62** | Canonical ledger L1–L2 | yes | **pass** (`0314aaf2`) | **90%** | Undraft after #61; merge next |
| **#63** | Dated caluminium-ps EGP pricing | yes | pass | **80%** | Undraft after #62 |
| **#64** | Empty-DB migration replay | yes | n/a (parallel) | **70%** | Staging-only apply path; not on critical product path |
| **#65** | Sliding estimate + 10/18 E2E | no | pass | **88%** | Staging browser re-run on deployed SHA |
| **#66** | #54 admin workflow fail-closed | no | pass | **85%** | Apply SQL on staging only |
| **#67** | #57 server convert-to-order | no | pass | **82%** | Staging convert positive + negative |
| **#68** | Hardener admin verification | no | pass | **80%** | Staging hardener RPCs + audit trail |

**Stack composite (local/CI): ~78%.** Raise to ≥90% only after staging Slice 8 evidence below.

## Batch 0 owners

| Role | Email | ID |
|---|---|---|
| A | batch0.fixture.a@almona.local | `1dfae5b1-5299-4737-b1a4-d1bc640950db` |
| B | batch0.fixture.b@almona.local | `7c4aa1d9-cbf4-4887-aca3-5a85e0d72df7` |

## Recommendation (after this score update)

1. **Treat ~78% stack / ~35% live as the honest program state** — not the ~94% batch implementation figure.
2. **Ship staging-first, never production-first.** Apply #66/#67/#68 migrations only to disposable/staging Supabase; keep production authority seed off until Slice 8 passes.
3. **Merge sequence:** undraft/merge **#61 → #62 (fix tsc) → #63 → #65 → #66 → #67 → #68** onto `main` (or a single integration branch that then PRs to `main`). Hold **#64** as ops/migration tooling.
4. **Defer Phases 0–7 polish** (perf/i18n/gold3D) until manufacturing live exit clears — they are not on the critical path for cut/BOM/order truth.
5. **Raise scorecard “live acceptance” only** when the matrix in the repair plan has a positive fixture journey plus negatives (stale revision, cross-owner, missing authority).

## Deployment plan (Slice 8)

### Phase A — Pre-merge (local/CI) — current

- [x] Ledger cross-path + sliding required count (23) + 10/18 metrics
- [x] Hardener server checks + convert evidence binding in code
- [x] Refresh #62 onto current #61 — Linux tsc delta green (`0314aaf2`, 0 new signatures)
- [ ] Undraft #61 → #62 → #63 when ready for review; keep #68 tip green
- [ ] Merge bottom-up onto `main` (human merge; no production SQL)

### Phase B — Staging deploy (required before any prod)

1. Record rollback: current staging frontend SHA, Vercel deployment URL, Railway image digest, Supabase migration list.
2. Merge stack in order; deploy frontend (Vercel preview → staging alias) and backend (`Dockerfile.realistic` Industrial path).
3. Apply **reviewed** migrations for #66/#67/#68 on **staging** only (hardener RPCs, admin workflow, convert gate). Do **not** apply production authority seed from held Phase-1 paths without explicit owner approval.
4. Smoke: `/health` honest Redis/DB status; hardener admin page loads; fail-closed convert without optimization evidence.
5. Fixture walk (Owner A/B): Measure → Design → BOM → Stock soft ack → Optimize → reload run → Quote → convert-to-order (when qualified) → release → QC → delivery. Capture fingerprints, cut counts (expect **23×qty** for 2-sash sliding), bar/waste.
6. Negatives: cross-owner reject, stale revision reject, missing catalogue/rule versions stay `estimate_only`, hardener override audit row written.
7. Record artifact IDs: Git SHA, frontend build hash, backend digest, migration versions. Confirm PWA/cache does not serve an old bundle.

### Phase C — Production promote (only if Phase B exit met)

1. Same artifact set as staging (no “rebuild and hope”).
2. Maintenance window: migrations forward-only; hardener gates remain fail-closed.
3. Post-deploy: one disposable smoke project (not customer data); verify convert blocked without durable optimize evidence; verify 23-piece sliding ledger on a known pattern.
4. Update this scorecard: live acceptance ≥90%, production readiness **READY** only with digests attached.
5. Rollback plan: previous Vercel alias + previous Railway digest + documented migration reverse or restore point.

### Explicit non-goals until Phase B exits

- Raising readiness above “staging candidate”
- Production apply of hardener / convert / admin workflow SQL
- Claiming manufacturing-qualified BOM from the 10/18 `estimate_only` run
- Parallel Phase 7 gold-3D or Phase 6 perf as merge blockers

## Next

1. Fix #62 tsc vs #61; undraft integration layers in merge order.
2. Execute Phase B on staging with Batch 0 fixtures; attach digests to this scorecard.
3. Only then Phase C production promote and scorecard live-exit update.
