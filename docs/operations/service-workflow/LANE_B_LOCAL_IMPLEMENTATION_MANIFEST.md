# Lane B local implementation manifest

**Contract tip:** `da4bcb4a331175bce674291b6a3a802fdc7d8f84`  
**Contract SHA-256:** `806f90bd8e5cb59071153f414c1c2d917a2c9e2d9592c326dc465b6d4db9e2ed`  
**Implementation tip (code):** `d0c311c9cfc9a65bf67f85ee95b14946224d0a7b`  
**Target:** local disposable PostgreSQL 17 only  
**Gates:** LOCAL implementation + disposable/component evidence · **no staging apply · no production · no merge · no FR-1**

## Apply sequence (local / disposable)

| Order | Source | `lf_sha256` | Role |
|------:|--------|------------|------|
| 1 | `scripts/service-workflow/disposable_routines_base.sql` | (harness) | Auth/profile/audit stubs |
| 2 | `scripts/service-workflow/disposable_lane_b_deps.sql` | (harness) | Tickets/jobs/machines/`can_read`/`lock_job_hierarchy` stubs |
| 3 | `supabase/migrations/20261116180000_service_routines_lane_a_authoring.sql` | Lane A | Prerequisite |
| 4 | `supabase/migrations/20261116213000_service_routines_lane_a_stg01_stale_conflict.sql` | Lane A | Prerequisite |
| 5 | `supabase/migrations/20261117190000_service_routines_lane_b_job_pins.sql` | `3d39d6a2741a3519bbb5e144c1d4ff201048b224d1877b138f4b3c1423b223a0` | Lane B pins |

Migration hash is the git blob at `d0c311c9` (LF-normalized, 29255 bytes).

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
