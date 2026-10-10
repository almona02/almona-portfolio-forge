# Fabricator merge + staging readiness — 9–10 October 2026

**Status:** Phase A **complete**. Phase B staging §5.2 **complete**; Phase B fail-closed / cross-owner gates **complete**. Phase C prod SQL (#71 then #72) **applied** with reject-only smoke. §5.3 positive convert + live FINAL GOAL still open.  
**Do not force-push from this document.**

Canonical scorecard: [FABRICATOR_SCORECARD_2026-10-09.md](../reviews/FABRICATOR_SCORECARD_2026-10-09.md) · synced companion [FABRICATOR_UPGRADE_SCORECARD_2026-10-05.md](FABRICATOR_UPGRADE_SCORECARD_2026-10-05.md).

---

## 1. Merge chain (executed)

| Step | PR | Merge commit | Merged at (UTC) |
|---|---|---|---|
| 0 | [#69](https://github.com/almona02/almona-portfolio-forge/pull/69) stack tip | `f9954be9` | 2026-10-09T00:52:47Z |
| 1 | [#74](https://github.com/almona02/almona-portfolio-forge/pull/74) | `4786a26e` | 2026-10-09T19:47:54Z |
| 2 | [#71](https://github.com/almona02/almona-portfolio-forge/pull/71) | `a4dd770b` | 2026-10-09T19:49:32Z |
| 3 | [#72](https://github.com/almona02/almona-portfolio-forge/pull/72) | `71d9e059` | 2026-10-09T19:49:43Z |
| 4 | [#70](https://github.com/almona02/almona-portfolio-forge/pull/70) | `8c7cf43a` | 2026-10-09T19:49:53Z |
| 5 | [#73](https://github.com/almona02/almona-portfolio-forge/pull/73) | `8a1ac7d7` | 2026-10-09T19:52:27Z |
| 6 | [#75](https://github.com/almona02/almona-portfolio-forge/pull/75) docs | `f27f0317` | 2026-10-10T10:58:23Z |

`origin/main` tip: **`f27f0317`**. Vercel Production / Railway recorded for tip family.

[#64](https://github.com/almona02/almona-portfolio-forge/pull/64) empty-DB replay remains open (parallel). Follow-ons open: #76–#79.

---

## 2. Staging target (Phase B Option A)

| Field | Value |
|---|---|
| Name | `almona02-staging` |
| Ref / project id | `apnmoevmvihfzcnttctx` |
| Region | `eu-west-3` |
| API URL | `https://apnmoevmvihfzcnttctx.supabase.co` |
| Role | Staging / disposable |

Staging applied: stub manufacturing baseline + digest wrappers + #71 + #72. §5.2 smoke **pass**.

### 2.1 Phase B fixture gates (Batch 0)

| Check | Result |
|---|---|
| Owner A measure | pass |
| Design without authority | `estimate_only` |
| BOM without prerequisites | blocked (fail-closed) |
| Cross-owner pose | rejected |
| Positive convert | **open** (§5.3) |

Evidence: `/opt/cursor/artifacts/phaseb-walk-evidence.json`.

---

## 3. Phase C — Production SQL (authorized + applied)

| Field | Value |
|---|---|
| Project | `almona02` / `shfsebdncjnncqqnewfj` |
| Authorization | Owner: “Re with db. Grant access” (2026-10-09) |
| Evidence rows at apply | **0** |
| Pre-#72 gate | `evil-no-hardener` = **false** (LIKE loophole) |
| Post-#72 gate | `evil-no-hardener` = **true**; `sandbox-no-hardener` = **false** |

### 3.1 Apply order (prod)

1. `phase_c_public_digest_wrappers` — `public.digest` → `extensions.digest`  
2. `fabricator_optimization_evidence_hardening` (#71)  
3. `fabricator_hardener_applicability_metadata` (#72)  

**Not included:** blanket manufacturing approval seeds; authority `provenance=seed`.

### 3.2 Smoke RPCs (§5.2 reject-only) — **all passed** on prod

| Check | Result |
|---|---|
| validate bad schema | reject |
| validate stock overrun | reject |
| record `ledger-fp-*` | reject: not authoritative |
| record unbound fingerprint | reject: does not bind |
| `system_pack_requires_hardener('evil-no-hardener')` | **true** |
| `system_pack_requires_hardener('sandbox-no-hardener')` | **false** |
| admin override non-admin | reject: admin role required |
| admin override empty evidence | reject: supporting evidence incomplete |
| `is_admin(uuid)` restored | profiles-based def intact |

Artifact: `/opt/cursor/artifacts/phase-c-prod-smoke-results.log`.

### 3.3 Still open

- §5.3 fixture walk (approved authority → convert; dedicated disposable project)  
- Live FINAL GOAL on almona02.com  
- Optional full #64 empty-DB replay onto staging  

---

## 4. Digests (current)

| Item | Value |
|---|---|
| Git SHA | `f27f0317` (docs tip); manufacturing tip family `8a1ac7d7` |
| Vercel Production | deploy recorded for tip |
| Railway | production deploy success for tip |
| Staging Supabase | `apnmoevmvihfzcnttctx` (#71/#72) |
| Prod Supabase | `shfsebdncjnncqqnewfj` — tip includes #71/#72 names above |
| Backend image digest | not captured this turn |

---

## 5. Owner approval checklist

### Merge to `main` (code)

- [x] Merge order #69 then #74 → #71 → #72 → #70 → #73  
- [x] #75 scorecard docs  
- [x] No auto SQL on merge/deploy  
- [x] Production deploy tip family recorded  

### Staging (Phase B)

- [x] Option A staging project  
- [x] Phase B SQL + §5.2 smoke  
- [x] Fail-closed + cross-owner gates  
- [ ] §5.3 positive convert fixture walk  

### Production (Phase C)

- [x] Separate authorization  
- [x] Apply #71 then #72 on prod  
- [x] Reject-only smoke  
- [ ] Disposable-project post-deploy manufacturing walk  
- [ ] Live FINAL GOAL scorecard update  

---

## 6. Explicit non-claims

- Prod §5.2 smoke ≠ manufacturing-qualified BOM on almona02.com  
- Phase B gate PASS ≠ positive convert  
- Closing `%-no-hardener` loophole ≠ live hardener workflow walk  
- Estimate 10/18 metrics ≠ live FINAL GOAL  
