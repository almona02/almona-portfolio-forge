# Follow-up O-JC-3 — Unknown-revision acknowledgment → narrow 4xx

**Status:** Recorded observation only · **no fix authorized**  
**Source:** Spark journey-close verdict `JC-PASS-BOUNDED` (negatives batch) + supporting harness notes  
**Related acceptance:** [`JOURNEY_CLOSE_STAGING_ACCEPTANCE.md`](./JOURNEY_CLOSE_STAGING_ACCEPTANCE.md)

---

## Observation

`record_service_acknowledgment` against an unknown / non-issued revision id is correctly **denied**, but the transport surface returns **HTTP 500** with SQLSTATE `P0002` (“Revision not found”) instead of a client-facing **4xx**.

Denial semantics are correct; status class is cosmetic / contract hygiene.

---

## Proposed correction (narrow; do not implement here)

| Constraint | Guidance |
|------------|----------|
| Status | Prefer a stable **4xx** (e.g. 404 or 400) for unknown/non-issued revision acknowledgment attempts |
| Disclosure | **Non-disclosing** — do not leak existence of unrelated revisions, ticket graphs, or internal table names beyond the existing denial message class |
| Scope | Touch only the acknowledgment RPC / PostgREST error mapping for this miss path; no broader error-framework rewrite |
| Tests | Add/adjust a negative that asserts 4xx without requiring product journey changes |

---

## Out of scope for this follow-up

- Shipping the 4xx mapping  
- Changing authorization rules or successful ack paths  
- Production / merge authorization  
