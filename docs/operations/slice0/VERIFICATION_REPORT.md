# Slice 0 disposable verification report (post-Spark remediation)

**Date:** 2026-11-11  
**Review branch:** `feat/service-slice0-security`  
**Frozen implementation commit:** `631ab03d`  
**Prior reviewed SHAs:** `bb40d8ab` (initial Slice 0), `6bc8cb7e` (edge membership fix; Spark BLOCKED)  
**Worktree:** `C:/projects/almona-slice0`  
**Disposable engine:** Spark’s preserved Postgres 17 data dir on `127.0.0.1:55433` / db `slice0` (synthetic fixtures only)  
**Staging/production apply:** not performed

## Spart evidence archive

Immutable copy of Spark’s BLOCKED package (pre-remediation):  
`.artifacts/slice0/spark-review-20261111/` (`evidence/`, `sql/battery.cjs`, harness stubs).

Remediation re-run evidence:  
`.artifacts/slice0/evidence-remediation/` (`results.json`, `battery.log`).

## Defect fix table (Spark backlog)

| ID | Severity | Fix | Re-test |
|---|---|---|---|
| B1 | Critical | Trigger gates on `current_user` = table owner / postgres (DEFINER identity). Removed GUC authorization. | D-07b PASS; D-01..D-04 PASS |
| B2 | Critical | `GRANT EXECUTE` on `caller_uid`/`caller_role` + `USAGE` on `admin_private`; `GRANT SELECT` on audit table | O-02..O-05, O-08, O-10 PASS |
| B3 | High | Message SELECT excludes internal notes for owners; storage SELECT via `can_read_ticket_attachment` (non-internal membership for owners) | G-01 PASS; G-02 PASS |
| B4 | High | `ticket_shares_manage` allows owner, assignee, admin/support | H-03 PASS |
| B5 | Fixed earlier | Edge membership-only (no folder prefix fallback) | E-01..E-10 PASS (simulated) |
| C1 | High | `TicketDetailPage` hydrates signed URLs (auth + share); no anonymous public fallback | Client code + unit contracts |
| C2 | Medium | Create-path auto-assign uses `governTicketAssign` (errors surface) | Code path |
| C3 | Medium | `govern_ticket_bulk_transition` + `bulkUpdateStatus` partial-failure | Code path; bulk assign still B-01 PASS |
| C4 | Medium | `govern_ticket_set_priority` atomic with audit | Code + RPC |
| C5 | Medium | Staging RLS tightened to owner/assignee/admin\|support (not every technician) | T-04/T-04b/G-03 PASS without profiles masking |
| C6 | Low | Removed `pending_approval` cast from `TicketDetailView` | Code |
| C7 | Medium | Assign RPC rejects non-staff assignees and closed/cancelled tickets | Code + N/P suite |
| C8 | Info | Documented: revocation blocks new links; issued 60s URLs may survive | Documented |
| C9 | Info | Allowlisted free text is not guaranteed PII-free | Documented |
| C10 | Deploy | Python v2 + unified ticket service call `govern_*` with `p_actor_id` (no service-role trigger exemption) | pytest 2/2 PASS |

## Checks run

### A. Migration apply on Spark representative DB

1. Started Spark’s preserved cluster (`55433` / `slice0`) → **PASS**
2. Re-applied `supabase/migrations/20261111010000_service_slice0_security_boundary.sql` → **PASS**
3. Re-applied `docs/operations/slice0/staging_service_tickets_rls.sql` → **PASS**

### B. Spark 108-check battery (adapted D-07a only)

Spark’s battery verbatim except:

- Evidence path → `.artifacts/slice0/evidence-remediation/`
- **D-07a:** PostgreSQL always allows `set_config` on custom GUCs; PASS criteria = GUC is **inert** (authorization ignores it). Security property remains D-07b.

| Result | Count |
|---|---|
| PASS | **108** |
| FAIL | **0** |
| Total | **108** |

Includes: M/S/R/T/G/O/H/D/N/P/B/A groups + E-01..E-10 edge simulation.  
**A-01** audit-failure rollback preserved **PASS**.

### C. Client unit tests

`npx vitest run` ticketGovernance / message / ProtectedRoute → **17/17 PASS**.

### D. Python ticket service unit tests

`pytest tests/test_ticket_service.py` → **2/2 PASS** (rpc-backed dummy client).

### E. Live edge + Storage + browser

**NOT TESTED** — edge runtime not exercised against Storage signing in this remediation pass. Edge logic covered by E-01..E-10 code-identical simulation only. Browser attachment rendering **NOT TESTED**.

## Documented residual semantics (required)

1. **Revocation:** blocks issuance of new signed links; already-issued links may remain valid for their remaining ~60s lifetime (HMAC; no denylist).
2. **Allowlisted free text** (title/description/site/message) is not guaranteed free of personal information; PII there is sharer responsibility.
3. **RLS remediation is mandatory** wherever RLS is disabled or policies fail the approved scope; it is not optional.

## Scope hold

No later phases started. No staging/production changes applied.
