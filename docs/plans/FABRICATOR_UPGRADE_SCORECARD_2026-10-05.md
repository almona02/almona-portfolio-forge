# Fabricator user-workflow upgrade scorecard

Date: 5 October 2026 (Batch 0 owners seeded on almona02).  
Refreshed: **10 October 2026** (main tip `f27f0317` / #75; Phase B gates + Phase C prod SQL).  
Canonical current scorecard: [FABRICATOR_SCORECARD_2026-10-09.md](../reviews/FABRICATOR_SCORECARD_2026-10-09.md).  
Companions: [upgrade plan](FABRICATOR_USER_WORKFLOW_UPGRADE_PLAN_2026-10-05.md) · [staging/promote plan](FABRICATOR_STAGING_MIGRATION_PLAN_2026-10-09.md) · [Batch 0 baseline](BATCH0_STAGING_BASELINE_2026-10-05.md) · [repair exit](FABRICATOR_REPAIR_AND_OPTIMIZATION_EXIT_PLAN_2026-10-05.md).

## Latest verification — 10 October 2026

| Evidence | Result |
|---|---|
| `origin/main` tip | **`f27f0317`** — #69 stack + #70–#74 + #73 metrics CI + #75 docs |
| Manufacturing stack #61→#68 | **Merged** onto `main` via #69 (`f9954be9`) |
| Follow-ons #70–#74 | **Merged** (mobile measure, evidence harden, hardener metadata, Profile Studio contract, measured E2E) |
| Prod SQL Phase C (#71/#72) | **Applied** on `shfsebdncjnncqqnewfj`; reject-only smoke **8/8** |
| Staging Option A | `apnmoevmvihfzcnttctx` — #71/#72 + §5.2 smoke **pass** |
| Phase B fixture gates | **PASS** — `estimate_only` without authority; cross-owner reject |
| Phase B positive convert | **OPEN** — fixture BOM blocked (no approved authority / pattern prerequisites) |
| Sliding ledger required pieces | **23 / unit** = 4 frame + 8 sash + 1 interlock + 2 track + 8 bead |
| 10/18 pooled optimize (uniform) | **414** placed (= 23×18), **74** bars, kerf **4 mm**, waste **45057 mm**, efficiency **89.85%**, reload re-BOM **23** |
| Classification | `estimate_only` — not manufacturing-qualified |
| Deploy | Vercel Production + Railway recorded for tip family (`8a1ac7d7` / `f27f0317`) |

Artifacts: `/opt/cursor/artifacts/e2e-1018-metrics.json`, `/opt/cursor/artifacts/phaseb-walk-evidence.json`, `/opt/cursor/artifacts/phase-c-prod-smoke-results.log` (when present).

## Verdict

| Layer | Score | Meaning |
|---|---|---|
| **Implementation (Batches 1–6 code)** | **~94%** | Local product work largely present |
| **Manufacturing stack on main** | **~96%** | #61–#68 + #70–#74 landed; tip CI/deploy green |
| **Local / staging acceptance** | **~68%** | Estimate 10/18 + staging §5.2 + Phase B fail-closed gates; §5.3 positive convert still open |
| **Live acceptance** | **~55%** | Prod #71/#72 live; FINAL GOAL walk on almona02.com **not run** |
| **Production deploy readiness** | **PARTIAL** | Phase C SQL done; disposable manufacturing walk + live FINAL GOAL still required |

Composite provisional (see Oct 9 scorecard): **~89/100**. Implementation ~94% is **not** live workshop readiness. Green merges and SQL smoke do **not** clear manufacturing-qualified convert or order→QC→delivery.

## Batch rollup (implementation estimates)

| Batch | Status | Score | Notes |
|---|---|---|---|
| **0** Staging baseline | **NEAR EXIT** | **85%** | Owners + seed live; §5.3 positive convert + deploy digest capture open |
| **1** Truthful readiness | **DONE** | **95%** | |
| **2** Profiles / inventory | **DONE** | **95%** | Soft reservation; hard DB reservation deferred |
| **3** Customer / pattern / revision | **DONE** | **90%** | |
| **4** Quote → order | **DONE** | **92%** | Server convert on main (#67/#69); positive staging convert open |
| **5** Production / QC / delivery | **DONE** | **95%** | Live walk still open |
| **6** Reports / a11y / integrations | **DONE** | **85%** | |

## Manufacturing stack rollup (merged)

| PR | Role | State | Score | Notes |
|---|---|---|---|---|
| **#61** | Integration reviewed (#53+#52+#58) | merged | **95%** | |
| **#62** | Canonical ledger L1–L2 | merged | **95%** | Via #69 |
| **#63** | Dated caluminium-ps EGP pricing | merged | **90%** | |
| **#64** | Empty-DB migration replay | **open draft** | **70%** | Parallel ops path |
| **#65** | Sliding estimate + 10/18 E2E | merged | **90%** | |
| **#66** | #54 admin workflow fail-closed | merged | **90%** | Applied (prod/staging as authorized) |
| **#67** | #57 server convert-to-order | merged | **88%** | Positive fixture convert open |
| **#68** | Hardener admin verification | merged | **88%** | Live approve/override/revoke walk open |
| **#69** | Stack tip → main | merged | **95%** | Full Pipeline green |
| **#70–#74** | Measure / evidence / hardener meta / Profile Studio / metrics CI | merged | **92%** | |
| **#75** | Phase B/C scorecard docs | merged | **100%** | Docs only |
| **#76–#79** | Evidence binding / Approvals / cut-ledger / materials | **open** | n/a | Follow-on hardening |

## Batch 0 owners

| Role | Email | ID |
|---|---|---|
| A | batch0.fixture.a@almona.local | `1dfae5b1-5299-4737-b1a4-d1bc640950db` |
| B | batch0.fixture.b@almona.local | `7c4aa1d9-cbf4-4887-aca3-5a85e0d72df7` |

Phase B fixture project (Owner A): `ed7226b3-f51a-4903-8fca-ca2e69a46712` / position `cbb21cb0-5767-4e32-a9c0-9bab69477eee` (`caluminium-ps` / `sliding_window_2sash`).

## Recommendation (current)

1. Treat **~89 provisional / ~55 live** as program state — not Batches 1–6 ~94%.
2. Next critical path: **§5.3 positive convert** on a disposable fixture with approved authority + compatible pattern; then release→QC→delivery + negatives.
3. Hold raising production readiness to **READY** until digests + live FINAL GOAL attached.
4. Close or supersede stale open Phase PRs **#54–#57** (work landed via #66–#69) when owner agrees.
5. Defer Phase 6/7 polish (#59/#60) until manufacturing live exit clears.

## Deployment plan (Slice 8) — status

### Phase A — Pre-merge (local/CI) — **DONE**

- [x] Ledger cross-path + sliding required count (23) + 10/18 metrics
- [x] Hardener server checks + convert evidence binding in code
- [x] #62 Linux tsc delta green
- [x] Merge #61→#69 (+ #70–#74) onto `main`

### Phase B — Staging — **PARTIAL**

- [x] Option A staging project + #71/#72 + §5.2 smoke
- [x] Fail-closed gates + cross-owner isolation (Phase B walk)
- [ ] §5.3 positive Measure→…→convert-to-order on qualified fixture
- [ ] Release→QC→delivery + hardener approve/override audit row

### Phase C — Production SQL — **DONE (SQL only)**

- [x] Owner-authorized #71 then #72 on prod; reject-only smoke
- [ ] Disposable-project post-deploy manufacturing walk
- [ ] Live FINAL GOAL on almona02.com → scorecard close ≥90 live

### Explicit non-goals until §5.3 / FINAL GOAL exit

- Claiming manufacturing-qualified BOM from estimate-only 10/18
- Raising readiness above “PARTIAL”
- Treating open #54–#60 as merge blockers for manufacturing truth

## Next

1. §5.3 disposable fixture: approved authority → BOM → optimize evidence → convert.
2. Attach Git SHA / Vercel / Railway / migration digests on success.
3. Live FINAL GOAL walk; raise Oct 9 scorecard live layer only with evidence.
