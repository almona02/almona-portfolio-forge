# Lane B local implementation manifest

**Contract tip:** `da4bcb4a331175bce674291b6a3a802fdc7d8f84`  
**Contract SHA-256:** `806f90bd8e5cb59071153f414c1c2d917a2c9e2d9592c326dc465b6d4db9e2ed`  
**Target:** local disposable PostgreSQL 17 only  
**Gates:** LOCAL implementation + disposable/component evidence · **no staging apply · no production · no merge · no FR-1**

## Apply sequence (local / disposable)

| Order | Source | `lf_sha256` (filled at publish) | Role |
|------:|--------|----------------------------------|------|
| 1 | `scripts/service-workflow/disposable_routines_base.sql` | (harness) | Auth/profile/audit stubs |
| 2 | `scripts/service-workflow/disposable_lane_b_deps.sql` | (harness) | Tickets/jobs/machines/`can_read`/`lock_job_hierarchy` stubs |
| 3 | `supabase/migrations/20261116180000_service_routines_lane_a_authoring.sql` | Lane A | Prerequisite |
| 4 | `supabase/migrations/20261116213000_service_routines_lane_a_stg01_stale_conflict.sql` | Lane A | Prerequisite |
| 5 |  |  (29255 bytes @ d0c311c9) | Lane B pins |

Canonical binding choices: `LANE_B_BINDING_CHOICES.md`.

## Evidence layers (keep distinct)

| Layer | Result | Attribution |
|-------|--------|-------------|
| Disposable PG17 battery (`disposable_lane_b_battery.sql`) | **28/28 PASS** | Cursor disposable — not Spark, not browser |
| Component Vitest (API + pin panel + assignment mount) | **7/7 PASS** | Cursor component — not browser |
| Actual browser | **NOT TESTED** | — |

Artifacts: `.artifacts/slice0/service-workflow/disposable_lane_b_results.json` (gitignored).

## Explicit non-claims

- No staging MCP apply / no live stamps  
- No visit dual-write of `pinned_routine_version_id`  
- No checklist results / B4 submit wiring  
- No FR-1 / merge / production authorization  
