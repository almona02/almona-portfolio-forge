# Lane B staging apply manifest

**Authorized scope:** Staging apply + verification only · **no production · no merge · no FR-1 · no next-lane**  
**Implementation tip:** `d0c311c9cfc9a65bf67f85ee95b14946224d0a7b`  
**Local acceptance:** [`LANE_B_LOCAL_ACCEPTANCE_d0c311c9.md`](./LANE_B_LOCAL_ACCEPTANCE_d0c311c9.md) (Spark independent PASS)  
**Contract tip:** `da4bcb4a` / SHA-256 `806f90bd…`  
**Target:** Supabase staging `apnmoevmvihfzcnttctx` (`almona02-staging`, eu-west-3, PG17)

## Prerequisites (must already be present — do not reapply)

| Package | Expected staging stamp / presence |
|---------|-----------------------------------|
| B1–B7 service workflow chain | Present (through B7 share audit / null auth) |
| Lane A authoring | `20261116192555` / `service_routines_lane_a_authoring` |
| Lane A STG-01 | `20261116210024` / `service_routines_lane_a_stg01_stale_conflict` |
| Lane B pins | **Absent** before apply |

Stop on unexplained drift.

## Apply sequence (Lane B only)

| Order | Source @ `d0c311c9` | MCP name | `lf_sha256` | bytes |
|------:|---------------------|----------|-------------|------:|
| 1 | `supabase/migrations/20261117190000_service_routines_lane_b_job_pins.sql` | `service_routines_lane_b_job_pins` | `3d39d6a2741a3519bbb5e144c1d4ff201048b224d1877b138f4b3c1423b223a0` | 29255 |

Canonical applied copy: `applied-sql/lane-b-staging/01_20261117190000_service_routines_lane_b_job_pins.sql`.

## Frontend

Branch-scoped preview env on `feat/service-routines-authoring` already binds `VITE_SUPABASE_*` to staging `apnmoevmvihfzcnttctx` (Lane A comment). Deploy protected preview from the published tip that contains the Lane B UI (`d0c311c9` product surface).
