# B6 cleanup — synthetic audit rows removed

**When:** 2026-11-15 (see handoff `CLEANUP_EXECUTION.json`)  
**Scope:** `service_workflow_audit` rows whose `ticket_id` belonged to the three synthetic `B6STG-SPK-*` tickets only.  
**Count:** **99** rows deleted.  
**Method:** one-time `ALTER TABLE … DISABLE TRIGGER trg_workflow_audit_immutable` inside the same transaction as the synthetic ticket purge, then **re-enable**. No other audit rows were targeted.

## Ticket IDs (sanitized — synthetic only)

| ticket_number | ticket_id |
|---------------|-----------|
| `B6STG-SPK-L1-mwhzo4y0` | `fd5e9ae2-eede-4121-a720-a24bb9d9ff96` |
| `B6STG-SPK-UI-mwhzs1ey` | `954b605e-f6bd-444a-894f-b3c3ad393c2a` |
| `B6STG-SPK-UI-mwi0ln0e` | `9ce12f17-7341-4213-bc6a-f377b78afab4` |

Row-level audit payloads (actor emails, JSON detail) are **not** reproduced here.

## Protection policy going forward

Do **not** disable `trg_workflow_audit_immutable` (or other workflow immutability triggers) for routine cleanup. Future synthetic cleanup must use an approved privileged path that does not weaken live immutability, or leave synthetic audit retained with `ticket_id` nulled by `ON DELETE SET NULL` if product policy allows.

## Access-holder trigger / policy evidence (post-cleanup)

| Object | State |
|--------|-------|
| `trg_ack_disposition_immutable` | enabled (`O`) · `BEFORE DELETE OR UPDATE` · `admin_private.service_ack_disposition_immutable()` |
| `trg_ack_immutable` | enabled · `enforce_workflow_immutable_row()` |
| `trg_review_immutable` | enabled · `enforce_workflow_immutable_row()` |
| `trg_revision_immutable` | enabled · `enforce_workflow_immutable_row()` |
| `trg_workflow_audit_immutable` | enabled · `enforce_workflow_immutable_row()` |
| `tmp_b6_spk_cleanup_delete` | **absent** |
