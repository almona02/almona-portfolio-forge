# B5 correction — F-B5-01 / F-B5-02

**Depends on freeze:** `f8fb9358e976050089cd199579a99bc0a098e0c2`  
**Migration:** `supabase/migrations/20261115140000_service_workflow_b5_f_b5_01_02_correction.sql`  
**Gates:** #155 frozen · #156 draft · staging apply authorized at tip · no merge · no production · no B6

## Findings (Spark BLOCKED @ f8fb9358)

| ID | Severity | Defect |
|----|----------|--------|
| F-B5-01 | medium | Owners denied Storage reads for issued `evidence_paths` (`can_read_ticket_attachment` message-only) |
| F-B5-02 | medium | Approve completed jobs while completed-but-unreported visits remain; return on completed jobs dead-ends B4 resubmit |

## Fixes

1. **F-B5-01** — add issued-evidence branch: object ∈ `evidence_paths` of a `revision_is_customer_visible` revision on a caller-owned ticket. Unissued + cross-ticket remain denied.
2. **F-B5-02** — completion also requires every `completed` visit to have ≥1 submitted revision; `returned` denied on terminal job states.

## Targeted re-verify

Q5-15, Q5-25, Q5-26, Q5-27, Q5-39 (+ completion/audit positives Q5-02/13/14). Regressions: Spark B5 battery, Cursor disposable B5, B4-under-B5. No full audit restart.

## Explicit non-actions

No merge · no production · no B6. Staging apply/verification: `B5_STAGING_APPLY_RECORD.md`.
