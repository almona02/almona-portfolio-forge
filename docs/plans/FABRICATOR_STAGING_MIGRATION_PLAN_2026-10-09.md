# Fabricator merge + staging readiness — 9 October 2026

**Status:** Phase A complete (code tips green). **Phase B blocked** until owner names a staging DB and authorizes SQL.  
**Do not merge, force-push, or apply remote SQL from this document without explicit owner approval.**

Canonical scorecard: [FABRICATOR_SCORECARD_2026-10-09.md](../reviews/FABRICATOR_SCORECARD_2026-10-09.md).

---

## 1. Tip CI snapshot (verified)

| PR | Branch | Tip | Base | CI | Mergeable | Scope |
|---|---|---|---|---|---|---|
| [#74](https://github.com/almona02/almona-portfolio-forge/pull/74) | `cursor/profile-studio-entry-points-1dc6` | `f32c3174` | `main` | **green** | yes | Profile Studio route/data contract (1 file) |
| [#71](https://github.com/almona02/almona-portfolio-forge/pull/71) | `cursor/harden-optimization-evidence-1dc6` | `a639284c` | `main` | **green** | yes | Optimization evidence harden + `20261009160000_*.sql` |
| [#72](https://github.com/almona02/almona-portfolio-forge/pull/72) | `cursor/hardener-applicability-metadata-1dc6` | `d2b637d4` | `main` | **green** | yes | Hardener applicability + `20261009170000_*.sql` |
| [#70](https://github.com/almona02/almona-portfolio-forge/pull/70) | `cursor/measuring-mobile-confirm-actions-1dc6` | `f9ce74fb` | `main` | **green** | yes | Mobile measuring UX, PS/sliding-2s defaults |
| [#73](https://github.com/almona02/almona-portfolio-forge/pull/73) | `cursor/measured-pooled-e2e-ci-1dc6` | `bd8ea3b8` | `main` | **green** | yes | Measured 10/18 E2E CI + this plan/scorecard |
| [#64](https://github.com/almona02/almona-portfolio-forge/pull/64) | empty-DB replay | draft | `integration/fabricator-reviewed` | parallel | — | Empty-DB history replay (not on merge path) |

`origin/main` / production frontend: `f9954be9` (merge #69).

File overlap: only `docs/reviews/FABRICATOR_SCORECARD_2026-10-09.md` is shared (#70 ∩ #73). No code overlap between #71 and #72.

---

## 2. Recommended merge order → `main` (code only)

Merging lands **git + frontend deploy**. It does **not** apply Supabase SQL. Migrations in #71/#72 stay inert until explicit `db push` / SQL apply.

| Step | PR | Why this order |
|---|---|---|
| 1 | **#74** | Single test file; zero conflict risk |
| 2 | **#71** | Evidence hardening code + migration file |
| 3 | **#72** | Applicability metadata after #71 (SQL apply order matches) |
| 4 | **#70** | Measuring UX (older scorecard copy) |
| 5 | **#73** | Measured E2E CI + **newer scorecard/plan** (wins scorecard conflict) |

After each merge: confirm GitHub Production / Vercel preview for that SHA; do not run FINAL GOAL on prod yet.

**Explicit non-actions until authorized:** `gh pr merge`, force-push, prod SQL, blanket manufacturing seeds.

---

## 3. Staging DB gap (Phase B blocker)

Read-only Supabase inventory for this org shows **one** project:

| Project | Ref | Role |
|---|---|---|
| `almona02` | `shfsebdncjnncqqnewfj` | **Production** (manufacturing migrations `20261009001810`…`02244` already applied) |

There is **no separate staging Supabase project** in the accessible account. Phase B cannot start until the owner chooses one of:

| Option | Action | Risk |
|---|---|---|
| **A. New staging project** | Create disposable Supabase project; replay #64 path + #71 then #72 | Lowest risk; preferred |
| **B. Supabase branch** | Branch `shfsebdncjnncqqnewfj` if plan allows | Medium; confirm branching available |
| **C. Prod maintenance** | Skip staging; Phase C-style apply on prod only | Highest; **not recommended**; requires separate explicit auth |

Vercel MCP is unauthenticated in this agent session — staging frontend URL must be confirmed by owner (preview aliases vs dedicated staging project).

---

## 4. Phase A checklist (pre-merge / pre-SQL)

| Item | Status |
|---|---|
| #70–#74 tip CI green | **done** |
| Merge order documented | **done** (section 2) |
| Scorecard conflict strategy (#73 last) | **done** |
| Staging Supabase identified | **blocked** — only prod `shfsebdncjnncqqnewfj` |
| Rollback baseline (staging SHA, Vercel URL, `schema_migrations` dump) | **pending** — needs staging target |
| Empty-DB replay (#64) | **parallel** — report drift only; do not block merge of #70–#74 |
| Capture prod `system_pack_requires_hardener` + evidence row count | **pending** before any SQL (read-only) |

---

## 5. Phase B — Staging SQL + fixture walk (requires authorization)

**Authorize only after staging target exists.**

### 5.1 Apply order (staging only, forward-only)

1. `20261009160000_fabricator_optimization_evidence_hardening.sql` (#71)  
2. `20261009170000_fabricator_hardener_applicability_metadata.sql` (#72)

**Not included:** blanket manufacturing approval seeds; authority `provenance=seed`.

### 5.2 Smoke RPCs (must pass before fixture walk)

- `validate_optimization_evidence_payload` rejects overrun / bad schema  
- `record_fabricator_optimization_evidence` rejects `ledger-fp-*` and unbound fingerprints  
- `system_pack_requires_hardener('evil-no-hardener')` = **true**  
- `system_pack_requires_hardener('sandbox-no-hardener')` = **false** (seeded metadata only)  
- `admin_override_fabricator_hardener` rejects empty evidence; non-admin denied  

### 5.3 Fixture walk (dedicated staging user / customer / project)

1. Custom system pack; profiles / roles / stock  
2. 10 genuinely different poses / 18 units (diverse; not only uniform 1200×1400)  
3. Complete BOM → optimize all 10 together → **>100 placed cuts**, 0 unplaced  
4. Record authoritative optimization evidence  
5. Hardener: approve / scoped override / reject / revoke / changed-input invalidation  
6. Qualified convert → production release → QC → delivery  
7. Negatives: stale revision, revoked authority, missing evidence, pending/rejected hardener  
8. Reload + fresh login persistence  

### 5.4 Digests to record

Git SHA (merged main), Vercel deployment URL/id, backend image digest, applied migration versions, metrics JSON (cuts/bars/area/kerf/waste).

---

## 6. Phase C — Production promote (separate authorization)

Only if Phase B exits clean:

1. Same artifact set as staging (no rebuild-and-hope)  
2. Maintenance window; apply #71 then #72 SQL only with explicit approval  
3. Deploy frontend at the same merged SHA  
4. Post-deploy smoke on a disposable project (not customer data)  
5. Update scorecard live-acceptance section  
6. Rollback: previous Vercel alias + Railway digest + documented DB restore point  

**Prod already has** earlier manufacturing stack (`20261009001810`…`02244`). #71/#72 are additive hardenings; still require auth.

---

## 7. Owner approval checklist

### Merge to `main` (code)

- [ ] Authorize merge order: #74 → #71 → #72 → #70 → #73  
- [ ] Confirm no auto SQL apply on merge/deploy  
- [ ] After merges: verify Production deploy SHA chain  

### Staging (Phase B)

- [ ] Identify staging target (Option A / B / C above)  
- [ ] Authorize Phase B SQL apply of #71 then #72 on that target only  
- [ ] Review migration SQL in #71 / #72  
- [ ] Provide staging auth users for fixture walk (no credentials in chat traces)  

### Production (Phase C) — later

- [ ] Separate authorization after Phase B digests  
- [ ] Maintenance window  

---

## 8. Explicit non-claims

- Tip CI green ≠ manufacturing-qualified BOM on almona02.com  
- Merging PRs ≠ applying #71/#72 to prod DB  
- Estimate 10/18 metrics (414 / 489 cuts) ≠ live FINAL GOAL  
- This plan ≠ authorization to merge or run SQL  
