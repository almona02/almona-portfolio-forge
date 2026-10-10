# Oct 10 readiness execution — evidence pack

**Assessment posture:** controlled pre-production · **88/100 provisional** (unchanged).  
**FINAL GOAL:** still open — browser staging login + Project Studio entry proven; ten-pose / custom-pack / full UI manufacturing chain **not** completed.

## 1. PR heads / bases / CI

| PR | Base | Head SHA | State | CI |
|---|---|---|---|---|
| [#76](https://github.com/almona02/almona-portfolio-forge/pull/76) authoritative binding | `main` | tip `1b298c30` (pushed) | OPEN / MERGEABLE | CI re-running after flaky timing fix; required check `Frontend Build & Test` failed once on flaky perf test |
| [#75](https://github.com/almona02/almona-portfolio-forge/pull/75) scorecard/staging docs | `main` | merged → `f27f0317` | MERGED | [Full Pipeline](https://github.com/almona02/almona-portfolio-forge/actions/runs/38046757305) success |
| [#64](https://github.com/almona02/almona-portfolio-forge/pull/64) empty-DB replay | `integration/fabricator-reviewed` | `345e4a58` | OPEN draft | review before using as sole staging rebuild path |
| `origin/main` | — | `f27f0317` | tip | Full Pipeline + Constitutional + Gate 1 success |

**Do not promote #76 SQL to production** without separate owner authorization.

## 2. Main protection / rulesets

| Probe | Evidence |
|---|---|
| Classic branch protection | **APPLIED** — see [MAIN_PROTECTION_APPLIED_2026-10-10.md](../governance/MAIN_PROTECTION_APPLIED_2026-10-10.md) |
| Repository rulesets | still `[]` (classic protection active) |
| Required checks | always-triggered only (path-filtered excluded) |
| Reviews / force-push | 1 review + dismiss stale; force-push/deletion blocked; enforce_admins |

Proposal history: [MAIN_BRANCH_PROTECTION_PROPOSAL_2026-10-10.md](../governance/MAIN_BRANCH_PROTECTION_PROPOSAL_2026-10-10.md).

## 3. Independent #76 review (pre-fix head `55a9f51c`)

| Claim | Verdict |
|---|---|
| Server derives required cuts from pose | PARTIAL (pose JSON; catalogue binds placement/settings) |
| Client `requiredCuts` cannot become authority | PASS |
| Missing BOM cannot fall back to placement | PASS |
| Kerf/trim/stock from approved settings | PARTIAL → **blocker fixed in working tree** (plan-level override) |
| Rule FP covers content; TS↔SQL agree | PARTIAL (evidenceStatus + settings text; improved) |
| Placement matches required occurrences | PASS |

### Blockers addressed (focused commits on #76 branch)

1. Plan/profile `kerfMm`/`trimMm`/`sawKerf`/`barEndTrim` no longer override approved payload machining (SQL validate + TS `resolveBarKerfTrim`).
2. Placement canonicalize uses payload-level kerf/trim only.
3. `evidenceStatus` missing ≠ approved (TS matches SQL).
4. `convert_pose_quote_to_order_test.sql` seeds pose `components`, uses derive cutIds (`c1:0`/`c1:1`), content fingerprints.
5. Negative tests for plan-level zero-kerf (Vitest + pgTAP).

### Local verification

- Direct module smoke: valid payload `ok`; plan `kerfMm:0` rejected with override message.
- Full Vitest collect currently flakes locally (`describe` / `config` — pre-existing runner issue); rely on CI after push.

### Merge recommendation

**Hold merge** until: (a) owner applies main protection/rulesets, (b) PR review + required checks green on post-fix tip, (c) no production SQL promote of #76 migrations.

## 4. Staging parity

Per [FABRICATOR_STAGING_MIGRATION_PLAN_2026-10-09.md](../plans/FABRICATOR_STAGING_MIGRATION_PLAN_2026-10-09.md):

| Item | Status |
|---|---|
| Staging project `apnmoevmvihfzcnttctx` | #71/#72 + ledger/kerf + binding + §5.3 PASS |
| Dedicated Auth fixtures | done (password login) |
| Release → QC → delivery chain | §5.3 SQL + Auth |
| #64 empty-DB replay | open draft — review before reset/rebuild; **never reset production** |
| Frontend SHA pin | Phase C tip `8a1ac7d7` / main `f27f0317`; re-pin after #76 merge |
| Schema vs prod | Staging ahead of prod on ledger/kerf + binding; prod has #71/#72 only |

## 5. FINAL GOAL checklist (executed evidence)

| Goal item | Status |
|---|---|
| Dedicated user/customer/project + custom pack | **partial** — browser login as staging S53 owner; §5.3 project visible (1 pose); custom pack **not** created in UI |
| 10 different poses / 18 units | **not run** in browser (estimate fixtures only) |
| BOM + optimize >100 placed cuts | estimate 414/489 — **not** manufacturing-eligible UI walk |
| Exact metrics + zero unplaced | estimate only |
| Save → reload → fresh login | browser login + Project Studio OK; full save/reload chain **not** completed |
| Hardener approve/reject/override/revoke | SQL §5.2–5.3; browser UI **not** walked |
| Order → release → QC → delivery + negatives | SQL §5.3; browser UI **not** walked |
| EG / TR / custom Profile Studio | Design Studio reached (needs position); Profile Studio deep walk open |
| Gold flexibility (asymmetric, miters, undo) | **not run** |

JSON round-trips and estimate fixtures are **not** substitutes for browser acceptance.

## 6. Optimization metrics (estimate_only — not FINAL GOAL)

| Fixture | Positions/units | Placed/unplaced | Bars | Kerf/trim | Waste | Eff | Area |
|---|---|---|---|---|---|---|---|
| Uniform caluminium | 10/18 | 414/0 | 75 | 4/0 | 50157 | 88.85% | 30.24 m² |
| Diverse poses | 10/18 | 489/0 | 124 | 4/0 | 47894 | 93.56% | 76.68 m² |

Classification: `estimate_only` / not manufacturing-eligible. **Cannot close FP-027.**

## 7. FP-027 export blocker

| Field | Value |
|---|---|
| Status | **OPEN / ROOT CAUSE UNPROVEN** |
| Canonical | `docs/audits/FP-027-OPTIMIZATION-REQUIRED-PARTS-CONSERVATION_2026-09-13.md` |
| DoWin ORTA | prior E3 forensics; 1→4 surplus observations do **not** close |
| Caluminium 414/489 | **cannot** close FP-027 |
| Machine-export readiness | **BLOCKED** until reproducible DoWin conservation evidence + regression |

No new DoWin ORTA replay executed this turn (licensed comparator environment required).

## 8. Credentials (separate tracks)

| Track | Status |
|---|---|
| GitHub token rotation | owner-confirmed complete — **do not reopen** without contrary evidence |
| E2E password rotation | owner-confirmed complete — **do not reopen** without contrary evidence |
| Supabase legacy JWT retirement | **pending** — inventory in SECURITY_ROTATION_2026-09-08; Railway cutover + disable legacy **not** authorized this turn |

## 9. RealityOS manufacturing events

| Event surface | Coverage |
|---|---|
| `realityos_record_event` RPC | present in types; used by ticketing / dual-write monitor |
| Delivery `ProductDelivered` | emitter + DeliveryTrackingPage notes |
| Manufacturing approval / convert / release / QC correlation | **incomplete** as a durable correlated ledger for the Fabricator chain — implement in a **separate reviewed slice** |

YDT / second-vertical work stays outside Fabricator critical path.

## 10. Production promotion prep (no apply)

After full staging FINAL GOAL acceptance only:

1. Exact order: digest wrappers (if needed) → ledger/kerf `20261010010000` → binding `20261010020000` (+ any follow-ups) — **owner auth each step**.
2. Tested artifacts: #76 tip SHA, Vitest + pgTAP logs, staging §5.3 + browser FINAL GOAL digests.
3. Rollback: keep pre-apply function definitions snapshot; evidence table row count; no customer-order mutation in smoke.
4. Disposable prod verification after SQL — **UI smoke on old schema cannot prove #76**.

## 11. Scorecard layers (separate — do not flatten)

| Layer | Score | Note |
|---|---|---|
| Verified implementation | ~94 | authority fix in flight on #76 |
| Current-head CI | ~96 | main tip green; #76 re-verify after push |
| Local / staging acceptance | ~62 | §5.3 done; browser FINAL GOAL open |
| Live acceptance | ~55 | not demonstrated |
| Production readiness | PARTIAL | #71/#72 only; #76 SQL held |

Composite **88/100 provisional** retained.
