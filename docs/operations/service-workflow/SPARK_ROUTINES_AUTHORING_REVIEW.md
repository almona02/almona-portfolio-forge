# Spark — routines authoring package (Lane A) review

**Branch / tip:** `feat/service-routines-authoring` (review exact HEAD after docs land)  
**Contract:** [`SERVICE_ROUTINES_AUTHORING_IMPLEMENTATION_CONTRACT.md`](./SERVICE_ROUTINES_AUTHORING_IMPLEMENTATION_CONTRACT.md)  
**Spec blob (Spark-reviewed content):** `docs/specs/SERVICE_WORKFLOW_SPECIFICATION_MANUAL_MACHINES.md` @ `6f0e11cb1662e1fd051d3236266c451f02f7f804`  
**Proposal (Lane A only for this package):** [`SERVICE_ROUTINES_FIRST_SLICE_PROPOSAL.md`](./SERVICE_ROUTINES_FIRST_SLICE_PROPOSAL.md)  
**Do not merge. Do not apply to staging/production. Do not implement runtime until PASS.**

## Preserve

- Staging B1–B7 closeout and FR-1 freeze `e17858a5` (separate release branch).
- SP-05/05B bounded disposable FAIL (not reopened).
- No manufacturer accounts.

## Review scope

1. Contract completeness vs §13 authoring surfaces (not Lane B/C).
2. Policy table: family hard-deny; model mismatch override; Support reviews / Admin publishes; author≠reviewer; external manufacturer refs only.
3. Acceptance RA-A1…RA-A10 are sufficient disposable/API criteria for a later implementation tip.
4. Confirm exclusions: no contract activation, recurrence, squads, stock, technician results, production deploy.

## Policy disagreement to confirm or escalate

Contract adopts **warning + Admin override** for catalog-model/manufacturer mismatch (Spec §13.9). If supervisor requires **hard deny** with no override, reply `POLICY_BLOCK` naming that rule before any applicability RPC work.

## Verdict format

```text
Routines authoring Spark: PASS | BLOCKED | POLICY_BLOCK
HEAD: <sha>
Contract: accepted | gaps <list>
Policy model-mismatch: override OK | hard-deny required
Author≠reviewer + Support review + Admin publish: OK | issue
Manufacturer external-refs only: OK | issue
RA-A1..A10: sufficient | missing <ids>
Runtime implementation: NOT AUTHORIZED | AUTHORIZED for disposable/local only
Staging/prod apply: NOT AUTHORIZED
```
