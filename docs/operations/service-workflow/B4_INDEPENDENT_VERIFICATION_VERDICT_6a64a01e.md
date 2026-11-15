# B4 independent verification verdict — `6a64a01e`

**Verdict: PASS (F-B4-05 closed; prior e203 evidence retained where still valid)**  
**Bound to:** `6a64a01e23dd51439ddfa31243253d4050d93f30`  
**Docs tip (stamps only):** `9b674d70b94b3f3d651e99f6ecd898c4e27eeec5`  
**Supersedes:** erroneous Cursor PASS / Spark **BLOCKED (F-B4-05)** on `e203b438` — see [`B4_INDEPENDENT_VERIFICATION_VERDICT_e203b438.md`](./B4_INDEPENDENT_VERIFICATION_VERDICT_e203b438.md)

## Scope

Narrow correction: restore full table-level labour XOR + truthful preflight + fixture adaptations. Privacy, auth-order, UI recovery, delegation, historical attending authorship, direct-write, and audit evidence from prior reviews is **retained** (no full audit restart).

## F-B4-05

| Check | Result |
|-------|--------|
| Table CHECK: `no_labour=true` ⇒ `[]` | PASS |
| Table CHECK: `no_labour=false` ⇒ nonempty labour | PASS |
| Invalid rows rejected at table boundary | PASS (`F-B4-05` battery) |
| Valid labour + explicit no-labour succeed | PASS |
| Preflight: compatible rows apply cleanly | PASS |
| Preflight: empty labour without declaration → rollback + actionable counts | PASS |
| Preflight: does not invent historical `no_labour` | PASS |
| B1 fixtures declare explicit labour/no_labour | PASS (B1/B2 under B4 72/0/4D) |
| RPC validation preserved | PASS (R4-03) |

## Retained evidence (not reopened)

F-B4-03 getter JSON privacy · F-B4-04 auth-before-state · UI submit/refetch/remount · R4-01 service-role · R4-05 historical attending · R4-06 direct-write · R4-07 atomic failure · R4-08/09.

## Disposable counts @ `6a64a01e` migration blob

| Suite | Pass | Fail | Skip | Defer |
|-------|------|------|------|-------|
| B4 required + F-B4-04 + F-B4-05 | 12 | 0 | 0 | — |
| B5/B6/draft | — | — | 0 | 3 |
| B3 under B4 | 39 | 0 | 0 | 0 |
| B1/B2 under B4 | 72 | 0 | 0 | 4 |
| Vitest UI | 5 | 0 | — | — |

**Required failures/skips:** none. **B5/B6:** deferred only.

## Sanitized probes

See `docs/operations/service-workflow/spark-probes/` (`B4_*`).

## Staging

Authorized for controlled staging apply/verify of **this SHA only**. No merge · no production · no B5. #155 frozen · #156 draft.
