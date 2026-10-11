# Fabricator merge + staging readiness — 9–10 October 2026

**Status:** Phase A **complete**. Phase B staging §5.2 **complete**. Phase C prod SQL (#71 then #72) **applied** with reject-only smoke. **Authoritative binding + §5.3 staging positive chain complete** on `apnmoevmvihfzcnttctx`. Live FINAL GOAL on almona02.com still open.  
**#76 code merged; production SQL hold retained** — **no production promote** of ledger/kerf or binding SQL without separate authorization.  
**Do not force-push from this document.**

Canonical scorecard: [FABRICATOR_SCORECARD_2026-10-09.md](../reviews/FABRICATOR_SCORECARD_2026-10-09.md).

---

## 1. Merge chain (executed)

| Step | PR | Merge commit | Merged at (UTC) |
|---|---|---|---|
| 1 | [#74](https://github.com/almona02/almona-portfolio-forge/pull/74) | `4786a26e` | 2026-10-09T19:47:54Z |
| 2 | [#71](https://github.com/almona02/almona-portfolio-forge/pull/71) | `a4dd770b` | 2026-10-09T19:49:32Z |
| 3 | [#72](https://github.com/almona02/almona-portfolio-forge/pull/72) | `71d9e059` | 2026-10-09T19:49:43Z |
| 4 | [#70](https://github.com/almona02/almona-portfolio-forge/pull/70) | `8c7cf43a` | 2026-10-09T19:49:53Z |
| 5 | [#73](https://github.com/almona02/almona-portfolio-forge/pull/73) | `8a1ac7d7` | 2026-10-09T19:52:27Z |

`origin/main` tip at Phase C scorecard: **`8a1ac7d7`**. Vercel Production / `eu-production` deployments recorded for that SHA.  
[#75](https://github.com/almona02/almona-portfolio-forge/pull/75) recorded Phase B/C docs. Draft [#76](https://github.com/almona02/almona-portfolio-forge/pull/76) carries authoritative binding + §5.3 staging walk.  
[#64](https://github.com/almona02/almona-portfolio-forge/pull/64) empty-DB replay remains open (parallel); empty-DB prerequisites were applied to staging via MCP for §5.3.

---

## 2. Staging / prod DB

| Project | Ref | #71/#72 | Ledger/kerf | Authoritative binding | §5.3 walk |
|---|---|---|---|---|---|
| Staging `almona02-staging` | `apnmoevmvihfzcnttctx` | applied | applied | **applied** (`20261010020000`) | **PASS** (SQL + Auth login) |
| Prod `almona02` | `shfsebdncjnncqqnewfj` | applied (Phase C) | **not applied** | **not applied** | n/a |

Staging API: `https://apnmoevmvihfzcnttctx.supabase.co` (`eu-west-3`).

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
**Not included:** ledger/kerf (`20261010010000_*`) or authoritative binding (`20261010020000_*`) — require separate promote auth.

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

---

## 4. Authoritative binding (#76 code merged)

Migration `20261010020000_fabricator_evidence_authoritative_binding.sql` + TS mirror:

1. **No placement fallback** — missing BOM/design ledger fails closed  
2. **Server-derived ledger** — `derive_required_cuts_from_position` from saved pose; record ignores client `requiredCuts`  
3. **Kerf/trim/stock authority** — `manufacturingSettings` + catalogue stock lengths; zero-kerf / invented stock rejected  
4. **Rule content fingerprint** — deductions / allowances / applicability (not IDs alone); TS/SQL parity via `pgJsonbText`

Prior ledger/kerf (`20261010010000_*`) remains: FP-023B accounting + multiset reconcile + `designFp||placementFp`.

### Tests

- Vitest: fabricated ledger, missing BOM, zero-kerf, invented stock, rule-content drift, free-form labels  
- pgTAP: `fabricator_evidence_authoritative_binding_test.sql` + ledger/kerf suite  
- Fixtures: authority payloads include `manufacturingSettings` + rule content  

Artifacts: `/opt/cursor/artifacts/authoritative-binding-vitest.log`, `/opt/cursor/artifacts/staging-s53-positive-chain.log`.

---

## 5. §5.3 fixture walk — status

| Step | Status |
|---|---|
| Staging schema/RPC parity (empty-DB + manufacturing stack) | **done** on staging |
| Dedicated Auth fixtures (owner + admin) | **done** — password login HTTP 200 |
| Approval → optimization evidence (reject paths) | **done** |
| Successful convert with ledger-bound evidence | **done** |
| Release → QC → delivery | **done** |
| Reload + fresh login persistence | **done** (SQL reload + Auth password re-login) |

Script: `scripts/staging-s53-positive-chain.sql`.

Still open: live FINAL GOAL on almona02.com; disposable-project walk on **prod** fixture (not customer data).

---

## 6. Digests (current)

| Item | Value |
|---|---|
| Git SHA (Phase C tip) | `8a1ac7d7` |
| Vercel Production | deploy recorded for `8a1ac7d7` |
| Staging Supabase | `apnmoevmvihfzcnttctx` (#71/#72 + ledger/kerf + binding + §5.3) |
| Prod Supabase | `shfsebdncjnncqqnewfj` — #71/#72 only |
| Backend image digest | not captured this turn |

---

## 7. Owner approval checklist

### Merge to `main` (code)

- [x] Merge order #74 → #71 → #72 → #70 → #73  
- [x] No auto SQL on merge/deploy  
- [x] Production deploy SHA `8a1ac7d7`  
- [x] #76 code merged; one required approval restored afterward  

### Staging (Phase B)

- [x] Option A staging project  
- [x] Phase B SQL + §5.2 smoke  
- [x] §5.3 fixture walk (disposable Auth + positive chain)  

### Production (Phase C)

- [x] Separate authorization for #71/#72  
- [x] Apply #71 then #72 on prod  
- [x] Reject-only smoke  
- [ ] Separate authorization for ledger/kerf + binding promote  
- [ ] Disposable-project post-deploy manufacturing walk  
- [ ] Live FINAL GOAL scorecard update  

---

## 8. Explicit non-claims

- Prod §5.2 smoke ≠ manufacturing-qualified BOM on almona02.com  
- Staging §5.3 disposable fixture ≠ live FINAL GOAL on almona02.com  
- Closing `%-no-hardener` loophole ≠ live hardener workflow walk  
- Estimate 10/18 metrics ≠ live FINAL GOAL  
- Phase C #71/#72 grant does **not** authorize ledger/kerf or binding SQL promote  

## 11 October verified status and next steps

This section supersedes stale current-state labels above; earlier dated artifacts remain historical evidence.

- Main **99fd2520** includes **#76 and #77**. One required approval was restored after the owner-authorized #76 exception; required checks retained. No further review bypass authorized.
- Composite remains **88/100 provisional**, controlled pre-production. Batch DONE labels describe implementation, not completed browser/manufacturing contracts. Partial DXF, soft stock reservation, flag-dependent customer persistence and quote/order integration remain bounded gaps.
- Staging-only reviewed delta **20261011094729** (`pr76_reviewed_staging_evidence_delta`) passed **39/39 SQL checks**: owner/stock 8, canonical 15, binding 8, ledger/kerf 8. Test transactions rolled back and no fixtures persisted. This supplements prior staging SQL/Auth evidence, not browser or full convert acceptance. Production #76 SQL remains separately gated.
- E2E is **paused by owner instruction**. No new FINAL GOAL or workshop-readiness claim. FP-027 remains a machine-export blocker. Staging security remains open: 14 public tables without RLS and 24 anonymous security-definer findings.

Execution order:
1. Verify the isolated BOM save/qualification repair against current main: failed saves and stale responses cannot publish; new revisions require fresh authority; saved sliding cuts require exact profile/length/angle multiset parity. Do not merge original #80 qualification rebinding.
2. Repair #78 conflicts and ledger test contracts, then independently review fingerprint preservation. Split upgrade documentation from functional patches.
3. Complete #81 phase-one production inspector wiring, stable occurrence IDs, reference-source generator parity and catalogue/rule cache invalidation before phases 2-5.
4. Keep Gold flexibility explicit: asymmetric and mixed openings; material-specific aluminum/UPVC accessories; per-occurrence frame/sash/glass editing; authored profile choices must not be silently replaced to force parity.
5. Address staging schema/security parity through reviewed migrations; no reset or blanket production SQL push.
6. Resume disposable browser FINAL GOAL only on owner instruction: ten distinct poses, eighteen units, >100 cuts, save/reload/fresh login, hardener negatives and order/release/QC/delivery. Keep 414 uniform cuts and 489 diverse cuts attached to their separate fixtures and dimensions.

Keep implementation, CI, staging SQL, staging browser, live acceptance and production readiness separate. See [the repair report](../reviews/FABRICATOR_BOM_REPAIR_2026-10-11.md).
