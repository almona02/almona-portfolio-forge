# Cursor evidence — local UI-retirement

Lane A historical staging browser tally (**19/21 proven**, **2 UI-retirement assertions void**) is **preserved** and **not rewritten**.

## Attribution (keep separate)

| Layer | Attribution | Status |
|-------|-------------|--------|
| Spark independent isolated-browser flow | **Spark** | **PASS 10/10** |
| Cursor isolated-backend battery | **Cursor** | **7/7 PASS** (manual apply); **pending independent replay** (Spark) |
| Complementary Vitest toast tests | Cursor unit/component only | Not browser/DB acceptance |
| Three automated Cursor runner attempts | Cursor harness | **FAIL** (recorded below) |

## Cursor backend (isolated PG17) — pending independent replay

| Field | Value |
|-------|-------|
| Cursor result | **7/7 PASS** (manual `psql` apply path) |
| Independent replay | **PENDING** |
| Executed (UTC) | 2026-11-17T16:48:26Z |
| Environment | local disposable PostgreSQL 17 `127.0.0.1:55457` (not staging/production) |
| Battery SQL | `scripts/service-workflow/disposable_ui_retire_evidence.sql` |
| Battery SHA-256 | `3d6aa7ea32f8d4304034c4aafd1cd1ab5b8d1dd36382c415582ac883e216f10e` |
| Runner | `scripts/service-workflow/run_disposable_ui_retire_evidence.py` |
| Runner SHA-256 | `d3d23d06f106eba7b271c5e76ed433270ff0e8ab52d8b1b30767573db3f02a3b` |
| Source commit (battery + panel test first published) | `fc184cf93c616d493f6ef3306f332796f840c8ab` |

### Backend assertions (Cursor battery)

1. Exact retire success → version `retired`  
2. Denied/error control → non-admin `42501`; version **and** parent remain `published`  
3. Persisted version status after re-read  
4. Parent routine status checked **separately**

### Automated runner failures (separate from manual 7/7)

| Attempt | Result |
|---------|--------|
| Task 301249 | **FAIL** — hung / Windows `pg_ctl` readiness race |
| Task 301250 | **FAIL** — readiness / early shutdown race |
| Task 301251 | **FAIL** — same runner class |

## Spark isolated-browser flow

| Field | Value |
|-------|-------|
| Status | **PASS 10/10** (Spark-attributed) |
| Note | Do not collapse into Cursor backend 7/7; do not treat as rewriting the two historical void staging assertions |

## Explicit non-claims

- Cursor does **not** claim a separate Cursor real-browser UI PASS beyond Spark’s 10/10 attribution above.  
- No rewrite of Lane A’s two historical void UI-retirement staging assertions.  
- No staging access, production, merge, or FR-1 changes for this evidence note.
