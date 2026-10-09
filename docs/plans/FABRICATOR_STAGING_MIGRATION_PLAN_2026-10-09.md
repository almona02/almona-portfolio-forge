# Fabricator merge + staging readiness — 9 October 2026

**Status:** Phase A **complete** (merge chain on `main`). Phase B **SQL smoke complete** on Option A staging; §5.3 fixture walk still open. Phase C prod SQL still requires separate auth.  
**Do not force-push or apply prod SQL from this document without explicit owner approval.**

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

`origin/main` tip: **`8a1ac7d7`**. Vercel Production / `eu-production` deployments recorded for that SHA (GitHub Deployments API).

Merging landed **git + frontend deploy**. It did **not** apply Supabase SQL to production.

[#64](https://github.com/almona02/almona-portfolio-forge/pull/64) empty-DB replay remains open (parallel; full history replay not required for §5.2).

---

## 2. Staging target (Phase B Option A)

| Field | Value |
|---|---|
| Name | `almona02-staging` |
| Ref / project id | `apnmoevmvihfzcnttctx` |
| Region | `eu-west-3` |
| API URL | `https://apnmoevmvihfzcnttctx.supabase.co` |
| Org | `iuhujuoejbfydldnbqac` (free tier; branching PaymentRequired — Option B unavailable) |
| Role | **Staging only** — disposable; not customer prod |

Production remains `shfsebdncjnncqqnewfj` (`almona02`). **#71/#72 SQL not applied to prod.**

---

## 3. Phase B SQL apply (staging)

### 3.1 Baseline note

Empty hosted project had no manufacturing tables. Applied a **minimal manufacturing stub** (not full #64 replay) so #71/#72 could compile and §5.2 RPCs could run:

1. `phase_b_manufacturing_stub_baseline` — stub tables/functions (`fabricator_optimization_evidence`, positions, hardener stubs, `is_admin`→false, pre-#72 name-list `system_pack_requires_hardener`)
2. `phase_b_public_digest_wrappers` — `public.digest` → `extensions.digest` (pgcrypto lives in `extensions` on hosted)

### 3.2 Forward apply order (executed)

3. `fabricator_optimization_evidence_hardening` (#71 body)  
4. `fabricator_hardener_applicability_metadata` (#72 body)

**Not included:** blanket manufacturing approval seeds; authority `provenance=seed`; Phase C prod apply.

### 3.3 Smoke RPCs (§5.2) — **all passed**

| Check | Result |
|---|---|
| `validate_optimization_evidence_payload` bad schema | reject: schema must be `almona.optimization-result` |
| `validate_optimization_evidence_payload` stock overrun | reject: placed 1400 mm > stock 1000 mm |
| `record_fabricator_optimization_evidence` `ledger-fp-*` | reject: not authoritative |
| `record_fabricator_optimization_evidence` unbound fingerprint | reject: does not bind to validated placement |
| `system_pack_requires_hardener('evil-no-hardener')` | **true** (fail-closed; no LIKE loophole) |
| `system_pack_requires_hardener('sandbox-no-hardener')` | **false** (seeded metadata) |
| `admin_override_fabricator_hardener` non-admin | reject: admin role required |
| `admin_override_fabricator_hardener` empty evidence | reject: supporting evidence incomplete |

Artifact: `/opt/cursor/artifacts/phase-b-smoke-results.log`.

### 3.4 Still open (§5.3 fixture walk)

Dedicated staging Auth users + custom pack + 10/18 diverse poses → BOM → optimize → evidence → hardener → convert → release → QC → delivery + negatives. Needs staging app wiring / fixture users (no credentials in chat traces).

---

## 4. Digests (current)

| Item | Value |
|---|---|
| Git SHA | `8a1ac7d7` |
| Vercel Production | deploy recorded for `8a1ac7d7` (GitHub Deployments) |
| Staging Supabase | `apnmoevmvihfzcnttctx` |
| Staging migrations | stub baseline + digest wrappers + #71 + #72 names above |
| Prod tip migrations | still ends at `20261009002244` (manufacturing stack; **no** #71/#72) |
| Backend image digest | not captured this turn |

---

## 5. Phase C — Production promote (separate authorization)

Only if Phase B fixture walk exits clean:

1. Same artifact set as staging (no rebuild-and-hope)  
2. Maintenance window; apply #71 then #72 SQL **only** with explicit approval on `shfsebdncjnncqqnewfj`  
3. Frontend already at merged SHA `8a1ac7d7` (verify alias)  
4. Post-deploy smoke on a disposable project (not customer data)  
5. Update scorecard live-acceptance section  
6. Rollback: previous Vercel alias + Railway digest + documented DB restore point  

**Prod already has** earlier manufacturing stack (`20261009001810`…`02244`). #71/#72 are additive hardenings; still require auth.

---

## 6. Owner approval checklist

### Merge to `main` (code)

- [x] Authorize merge order: #74 → #71 → #72 → #70 → #73  
- [x] Confirm no auto SQL apply on merge/deploy  
- [x] After merges: verify Production deploy SHA chain (`8a1ac7d7`)  

### Staging (Phase B)

- [x] Identify staging target (Option A: `apnmoevmvihfzcnttctx`)  
- [x] Authorize Phase B SQL apply of #71 then #72 on that target only  
- [x] §5.2 smoke RPCs  
- [ ] §5.3 fixture walk + staging Auth users  
- [ ] Optional: full #64 empty-DB replay onto staging for deeper parity  

### Production (Phase C) — later

- [ ] Separate authorization after Phase B digests  
- [ ] Maintenance window  

---

## 7. Explicit non-claims

- Tip CI green ≠ manufacturing-qualified BOM on almona02.com  
- Merging PRs ≠ applying #71/#72 to prod DB  
- Staging stub baseline ≠ full production schema parity / #64 replay  
- Estimate 10/18 metrics (414 / 489 cuts) ≠ live FINAL GOAL  
- §5.2 smoke ≠ §5.3 fixture walk  
