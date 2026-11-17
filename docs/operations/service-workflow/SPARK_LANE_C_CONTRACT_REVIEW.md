# Spark — targeted re-review (Lane C + ticket-access)

**Repository:** `almona02/almona-portfolio-forge`  
**Branch:** `feat/service-routines-authoring`  
**Policy review HEAD (amendments):** `c7addbb19be8a1391687e2b0d831c6dde9d59702`  
**Do not auto-carry:** Spark BLOCKED on `110a5789…` · prior tips `8e01cfee…` / disposition mislabel  
**Lane B:** remain **closed**

## Paths

| Artifact | Path |
|----------|------|
| Lane C contract (at c7addbb1) | `docs/operations/service-workflow/SERVICE_ROUTINES_LANE_C_CHECKLIST_EXECUTION_CONTRACT.md` |
| Ticket-header proposal (at c7addbb1) | `docs/operations/service-workflow/TICKET_RLS_TECHNICIAN_ROUTE_ACCESS_GAP.md` |
| Disposition map (label-corrected; no policy change) | `docs/operations/service-workflow/LANE_C_SPARK_GAP_DISPOSITION_8e01cfee.md` |
| This handoff | `docs/operations/service-workflow/SPARK_LANE_C_CONTRACT_REVIEW.md` |

## Review only `c7addbb1` amendments

Retain prior passing findings. Re-check G-C1…G-C6 and T-G1…T-G3.

**Original G-C6 (preserve ID):** limit equality (inclusive/exclusive bound compare) **and** stable `item_key` for ID-less items — see Lane C §3.5 + LC-21/LC-22.  
Do **not** treat attendance/former-assignee as G-C6 (that was a disposition mislabel; those rules are §3.4 / T-G2).

Also confirm explicitly:

1. Optimistic token has **atomic compare-and-set** semantics: update succeeds only when `expected_checklist_revision` matches current; else frozen **`PT409` / `routine_checklist_stale_revision`** (locking alone insufficient) — §3.6.  
2. Header RPC returns **only** the approved field list under **current-assignee / completed-attendee** rules — ticket §6.2; contact PII excluded.

No broad audit restart · no staging · no merge · no production · no FR-1.

## Required SHA-bound verdicts (two)

```text
Lane C contract: PASS | BLOCKED
HEAD: c7addbb19be8a1391687e2b0d831c6dde9d59702
G-C1..G-C5: OK | unresolved <ids>
G-C6 limit-equality + ID-less item_key: OK | issue
Optimistic CAS + PT409: OK | issue
Passing findings retained: yes | no
Unresolved: <ids only or none>

Ticket-access proposal: PASS | BLOCKED
HEAD: c7addbb19be8a1391687e2b0d831c6dde9d59702
T-G1 narrow header fields only: OK | issue
T-G2 current-assignee / completed-attendee: OK | issue
T-G3 negatives + ENABLE: OK | issue
Unresolved: <ids only or none>

Lane B: remains CLOSED
Implementation: NOT AUTHORIZED until both PASS
```

If both PASS: hand accepted contract bindings + executable acceptance matrix (LC-* / TR-*).  
If not: list only concrete unresolved requirements.
