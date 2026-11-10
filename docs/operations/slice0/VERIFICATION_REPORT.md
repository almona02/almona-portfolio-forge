# Slice 0 disposable verification report (R3 correction)

**Date:** 2026-11-11  
**Review branch:** `feat/service-slice0-security`  
**Frozen implementation commit:** `7e8ac0a1`  
**Prior SHAs (superseded for review):** `06ff513b` (R1 remediation), `6bc8cb7e` / `bb40d8ab` (pre-Spark-R2)  
**Worktree:** `C:/projects/almona-slice0`  
**Disposable engine:** Spark R2 Postgres data dir on `127.0.0.1:55433` / db `slice0`  
**Staging/production apply:** not performed

## Evidence archives

| Package | Location |
|---|---|
| Spark BLOCKED (R1) | `.artifacts/slice0/spark-review-20261111/` |
| Spark re-verify (R2) — 139/141, H-07 + PR-03 FAIL | `.artifacts/slice0/spark-review-20261111-R2/` |
| Cursor R3 re-run after fixes — **141/141 PASS** | `.artifacts/slice0/evidence-r3/` |

## Correction table (R3)

| ID | Fix | Evidence |
|---|---|---|
| R1 | `governedCreateTicket` attempts assign only when actor is admin/support; authz denial returns created ticket with explicit `assignment: { status: 'unassigned', reason }`; unexpected errors rethrown | Unit: `TicketGovernanceService.create.test.ts` |
| H-07 | `admin_private.can_manage_ticket_share` SECURITY DEFINER — support share create without profiles/ticket SELECT dependency; unrelated still denied | H-07 PASS; H-06 PASS |
| PR-03 | `priority` added to protected-column trigger; direct owner UPDATE denied; `govern_ticket_set_priority` remains atomic | PR-01..PR-03 PASS; D-05 PASS (denied) |

## Battery

Spark expanded suite (`battery_r3.cjs` from R2 + D-05 expectation aligned to protected priority): **141 PASS / 0 FAIL / 141 total**.

## Client / backend units

- Vitest create-assignment + governance/message contracts: PASS  
- `pytest tests/test_ticket_service.py`: PASS  

## NOT TESTED

- Live edge + Storage signed-URL round-trip  
- Browser attachment rendering  
- Full `supabase db reset` of entire migration history  

## Required residual semantics

1. Revocation blocks new signed links; issued ~60s URLs may remain valid until expiry.  
2. Allowlisted share free text is not guaranteed PII-free.  
3. RLS remediation is mandatory wherever RLS is off or policies fail approved scope.

## Scope hold

No later phases. No staging/production apply.
