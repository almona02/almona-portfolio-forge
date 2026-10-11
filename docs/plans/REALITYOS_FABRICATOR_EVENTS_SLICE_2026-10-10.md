# RealityOS Fabricator events — separate reviewed slice

**Status:** scoped for a future PR — **outside** #76 merge critical path.  
**Constraint:** AICS-001 — no ML in execution; events are audit/telemetry only.

## Required durable, correlated events

| Manufacturing step | Desired RealityOS event | Current state |
|---|---|---|
| Manufacturing approval (admin) | `ManufacturingApproved` (+ request id, position, revision) | UI/RPC present; durable RealityOS emit **not correlated end-to-end** |
| Pose convert → order | `PoseConvertedToOrder` | convert RPC exists; RealityOS linkage incomplete |
| Production release | `ProductionReleased` | position release client; event correlation open |
| QC approval | `QualityApproved` | `approveQualityControl` + acknowledgements; RealityOS emit open |
| Delivery ack | `ProductDelivered` | emitter helpers exist; Fabricator delivery path partial |

## Acceptance for the slice

1. Each step writes a durable ledger row (or `realityos_record_event`) with `position_id`, `revision`, `correlation_id`.
2. Negative: cross-owner / stale revision / revoked authority do not emit success events.
3. Vitest + disposable staging fixture prove correlation query returns the chain in order.
4. No customer-order mutation; disposable fixtures only.

## Non-goals

- YDT / second-vertical RealityOS work.
- Closing FP-027.
- Production SQL for #76 binding.
