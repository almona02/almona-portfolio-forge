# B4 independent verification verdict — `e203b438`

**Verdict: PASS**  
**Bound to:** `e203b4387d56197847694bc60be387815e244d5c`  
**Branch tip (docs only):** `ea1cf44a863384ed18ca7a778d4fa4e8060c6313`  
**Historical:** BLOCKED on `6827c775` remains valid for that tip; it does **not** cover this correction.

## What `91acc120` is

`91acc120ddb9b3094306cef610edec4d7b72c1cc` is a **docs-only stamp** (`B4_FINDINGS_DISPOSITION` / handoff SHA labels). It changes **zero** migration or UI bytes.

| Blob | `e203b438` | `91acc120` / `ea1cf44a` / `HEAD` |
|------|------------|----------------------------------|
| B4 migration | `14fe088a…` | identical |
| `ServiceReportPanel.tsx` | `6d4d59b5…` | identical |
| `ServiceReportPanel.b4.test.tsx` | `a21fdb97…` | identical |

Matching migration hashes alone do **not** verify the UI correction. UI was verified separately via Vitest against the `e203b438` panel + test blobs (5/5), including refetch-failure retention and remount recovery.

## Checks

### 1. Getter privacy (JSON inspected)

Independent probe `SP-1-cust-json`: customer `get_service_report_for_visit` returned

```json
{"report": {…id/visit_id/created_at…}, "revisions": []}
```

Markers for unissued findings / work / declaration / evidence path were **absent**. Staff getter still returned the full revision including evidence. RLS row-count alone was **not** used as the privacy proof.

### 2. Labour contract + migration compatibility

- RPC XOR enforced (`SP-2`: empty-without-`no_labour` denied; labour+`no_labour` denied; valid `no_labour` OK).
- Soft table CHECK forbids only contradiction; does **not** invent `no_labour=true` for empty legacy arrays (`legacy_empty_ok`).
- Preflight probe @ `e203b438` migration bytes:
  - Valid legacy (non-blank findings, empty labour) → apply OK; `work_performed` backfilled from findings; `no_labour=false`; `technician_declaration` remains NULL.
  - Incompatible (blank findings) → `B4 preflight blocked: … lack work_performed…`; transaction rolled back (`work_performed` column not persisted).
- B1 fixtures: generic `b1_fixture` fills new NOT NULL text columns; soft CHECK lets empty labour + default `no_labour=false` through. Product XOR remains RPC-enforced for submits — not weakened for fixtures.

### 3. Authorization ordering

`F-B4-04` + `SP-3`: unrelated caller on non-completed visit → `42501` attending-tech denial; **no** “completed visits” state disclosure.

### 4. Submission recovery (UI @ `e203b438` blobs)

Vitest `ServiceReportPanel.b4.test.tsx` (5/5):

- Successful submit → failed refetch: status stays **submitted**; `clientSubmissionId` unchanged; session storage retains revision identity.
- Remount with stored submitted identity recovers status without re-submit UI (no second revision path).
- Failed submit keeps key for idempotent retry.

### 5. Preserved guarantees

| Check | Result |
|-------|--------|
| R4-01 service-role delegation | PASS |
| R4-05 historical attending authorship | PASS |
| R4-06 direct-write denials (ordinary callers / service_role) | PASS |
| R4-04 idempotency + revision numbering (concurrency-related) | PASS |
| R4-07 atomicity on failure (no rev / no audit / job unchanged) | PASS |
| R4-09 no self-issue / premature complete / close | PASS |

## Battery counts (migration bytes from `e203b438`)

| Suite | Pass | Fail | Skip | Defer |
|-------|------|------|------|-------|
| B4 required + F-B4-04 | 11 | 0 | 0 | — |
| B4 B5/B6/draft | — | — | 0 | 3 (`R5-DEFER`, `R6-DEFER`, `R4-DRAFT-DEFER`) |
| Spark probe | 4 | 0 | — | — |
| B3 under B4 | 39 | 0 | 0 | 0 |
| B1/B2 under B4 | 72 | 0 | 0 | 4 (pre-existing B1 deferrals) |
| Vitest UI | 5 | 0 | — | — |
| Migration preflight probe | 2/2 cases | 0 | — | — |

**Required failures:** none  
**Required skips:** none  
**B5/B6 deferrals (not failures):** manager review/issue, acknowledgment/closure  

## Gates

No staging apply · no merge · no production · no B5 implementation.
