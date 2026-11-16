# Slice 0 — Staging closeout

**Date:** 2026-11-11  
**Final status:** **Staging accepted with documented verification limitations. Production not authorized.**

## Recorded revisions

| Layer | Identity | Verification |
|---|---|---|
| Backend | Commit `a897776d539930ba31c2313d43e6e52f2c9a9614` on Railway deploy `402552ea-bf42-411b-99cd-b844c413787b` (**SUCCESS**) | **Independently verified by Spark** (Railway record + live assign/refresh behavior) |
| Protected frontend | `dpl_CyhaMa3pzkVHSZzoJHYaLyp9nQtP` @ `a897776d…` | **Live browser checks executed by Cursor** (login, session reload, assignment controls, `SLICE0-LIVE-UP1` attachment download). **Spark browser verification NOT TESTED** — share access failed (`bofmzlsf` DEPLOYMENT_NOT_FOUND; alias share fell through to Vercel login) |
| Official live Vitest suite | `test:ticketing-boundary` / live-7 | **Not executed** (no local service-role). Equivalent staging SQL/`SET ROLE` probes and independent API live checks listed separately in acceptance / Spark / Cursor evidence |

## Known baseline issues (retained)

- Pre-existing unrelated pytest failures in `test_error_handling_comprehensive.py` (observed identical on earlier tip) — **not treated as Slice 0 regressions**.  
- Staging/prod schema drift outside Slice 0 (e.g. `public.machines` present in prod, absent in staging) — tracked for later work; not a Slice 0 reopen.

## Cleanup confirmation

| Item | Status |
|---|---|
| Cursor synthetic tickets (followup + handoff_gap assign/deny/support/refresh sets) | **Cancelled** (API 200 → re-GET `cancelled`); evidence `.artifacts/slice0/staging-apply/cursor_synthetic_ticket_cleanup.json` |
| Spark synthetic tickets (3) | **Cancelled** (Spark evidence) |
| Temporary Vercel `_vercel_share` (branch alias) | **Revoked** by Cursor |
| `slice0-unrelated` temp `sales_rep` role | Restored to **customer** |
| Disposable login payload files | Removed |
| Redacted / prior evidence | Preserved (acceptance, battery R3, followup, Spark closeout hashes retained) |

## Limitations (accepted)

1. Spark did not complete protected Preview browser checks (share mechanism).  
2. Official Vitest live suite not run; equivalents used.  
3. Production apply remains **unauthorized**.

## Next

Machine identity: revised proposal `docs/MACHINE_IDENTITY_IMPLEMENTATION_PROPOSAL.md` for Wonder v0.2 review — **no identity implementation** until approved.
