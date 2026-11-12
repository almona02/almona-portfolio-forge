# B4 findings disposition vs `6827c775ba55c65cc8b08a2b7ee2752f7e762b5f`

Spark’s attached verdict covered older `e83e7c2c` and is **not** a verdict on `6827c775`. Each finding was re-verified against the `6827c775` tree (untouched migration bytes from that commit). Implementation corrections are a **new freeze** (see tip after this disposition).

| Finding | Disposition on `6827c775` | Notes |
|---------|---------------------------|-------|
| **F-B4-00** Migration applies as committed | **PASS (verified)** | `run_disposable_b4.py` applies `20261112210000_…b4_report_submission.sql` verbatim (no harness rewrite). Apply succeeded on throwaway PG17. |
| **F-B4-02** Service-role delegation | **PASS (verified)** | On `6827c775`, `GRANT EXECUTE … TO service_role` + actor-scoped evidence validation already present. Disposable R4-01: anon/forged/support denied; service_role+attending actor OK; service_role without actor denied. |
| **F-B4-03** Getter customer visibility | **OPEN defect** | `get_service_report_for_visit` was SECURITY DEFINER and returned **all** revisions to any workflow-readable caller, including ticket owners — bypassing `revision_is_customer_visible` / RLS. Unissued revisions + evidence leaked via privileged RPC. |
| **F-B4-04** Auth before visit-state | **OPEN defect** | Submit checked `visit.state = completed` **before** attending-tech authorization, so unrelated callers could distinguish states via error text. |
| **UI retry / remount** | **OPEN defect** | After successful submit, UI rotated `clientSubmissionId` and cleared draft **before** refetch completed. Failed refetch / remount could lose submitted identity and create a second revision on retry. |
| **Migration compatibility** | **OPEN defect / weak strategy** | `6827c775` invented `technician_declaration = 'legacy-pre-b4'` for nulls and relied on a soft labour CHECK without an actionable preflight. |

## Fixture / harness notes (not product defects)

- Direct-write denial tests must use ordinary caller roles (`SET ROLE authenticated` / `b1_auth`), not the database owner (superuser bypasses immutability triggers). Battery R4-06 already does this; kept.
- Soft labour table CHECK (forbid contradiction only) is intentional so pre-B4 empty-labour rows are not “fixed” by inventing `no_labour=true`. Full XOR remains RPC-enforced for new submits. B1 fixture inserts remain compatible without declaring no-labour.

## Correction freeze

Implementation fixes for OPEN items above required a new SHA:

**`e203b4387d56197847694bc60be387815e244d5c`** — closes F-B4-03, F-B4-04, UI retry/remount, migration preflight/compat; preserves F-B4-00/02; updates fixtures to ordinary-caller denials and soft labour contract.

Spark must re-verify against `e203b438` (untouched migration apply). Do not treat a PASS on `6827c775` or `e83e7c2c` as a verdict on this tip.
