# B4 independent verification — `e203b438` (HISTORICAL; SUPERSEDED)

> **Correction (authorized before B4 staging deploy):** The **PASS** claim previously recorded in this file was **erroneous** and is **superseded**.  
> **Spark’s actual independent verdict on `e203b438` was BLOCKED on F-B4-05** (softened table-level labour XOR / fixture convenience weakening production invariants).  
> Attribution: Cursor authored an overstated PASS after disposable runs that treated the soft CHECK as acceptable; Spark correctly rejected that contract deviation.  
> Do **not** treat this document’s earlier PASS banner as authority to stage `e203b438`.  
> Approved staging implementation is **`6a64a01e23dd51439ddfa31243253d4050d93f30`** (F-B4-05 correction). See [`B4_FINDINGS_DISPOSITION_e203b438.md`](./B4_FINDINGS_DISPOSITION_e203b438.md) and [`B4_INDEPENDENT_VERIFICATION_VERDICT_6a64a01e.md`](./B4_INDEPENDENT_VERIFICATION_VERDICT_6a64a01e.md).

---

## Original erroneous claim (preserved for history)

**Verdict as wrongly published by Cursor:** PASS  
**Bound to:** `e203b4387d56197847694bc60be387815e244d5c`  
**Branch tip (docs only):** `ea1cf44a863384ed18ca7a778d4fa4e8060c6313`  
**Historical:** BLOCKED on `6827c775` remains valid for that tip; it does **not** cover this correction.

### Spark independent outcome (authoritative for this tip)

| Finding | Spark | Notes |
|---------|-------|-------|
| F-B4-00 / 02 / 03 / 04 / UI recovery | Retained useful evidence | Not discarded |
| **F-B4-05 labour XOR** | **BLOCKED** | Soft table CHECK allowed `no_labour=false` + empty `labour`; approved contract requires full XOR at the table boundary |

**Corrected tip status:** **BLOCKED** (F-B4-05) — not PASS.

## What `91acc120` is

`91acc120ddb9b3094306cef610edec4d7b72c1cc` is a **docs-only stamp** (`B4_FINDINGS_DISPOSITION` / handoff SHA labels). It changes **zero** migration or UI bytes.

| Blob | `e203b438` | `91acc120` / `ea1cf44a` / then-HEAD |
|------|------------|-------------------------------------|
| B4 migration | `14fe088a…` | identical |
| `ServiceReportPanel.tsx` | `6d4d59b5…` | identical |
| `ServiceReportPanel.b4.test.tsx` | `a21fdb97…` | identical |

Matching migration hashes alone do **not** verify the UI correction. UI was verified separately via Vitest against the `e203b438` panel + test blobs (5/5), including refetch-failure retention and remount recovery.

## Checks recorded under the erroneous PASS (retained as partial evidence)

### 1. Getter privacy (JSON inspected)

Independent probe `SP-1-cust-json`: customer `get_service_report_for_visit` returned

```json
{"report": {…id/visit_id/created_at…}, "revisions": []}
```

Markers for unissued findings / work / declaration / evidence path were **absent**. Staff getter still returned the full revision including evidence. RLS row-count alone was **not** used as the privacy proof.

### 2. Labour contract + migration compatibility — **the BLOCKED defect**

Cursor disposable noted:

- RPC XOR enforced.
- **Soft table CHECK** forbade only contradiction; allowed empty labour with `no_labour=false`.
- B1 fixtures relied on that softening.

**Spark correctly treated the soft CHECK as F-B4-05 BLOCKED.** The approved requirement is full table-level XOR without inventing historical `no_labour` and without weakening production constraints for fixtures. Correction landed in `6a64a01e`.

### 3. Authorization ordering

`F-B4-04` + `SP-3`: unrelated caller on non-completed visit → `42501` attending-tech denial; **no** “completed visits” state disclosure.

### 4. Submission recovery (UI @ `e203b438` blobs)

Vitest `ServiceReportPanel.b4.test.tsx` (5/5): refetch-failure / remount retention — useful evidence retained.

### 5. Preserved guarantees (partial)

R4-01, R4-04, R4-05, R4-06, R4-07, R4-09 disposable passes retained as supporting evidence; they do **not** override F-B4-05 BLOCKED.

## Battery counts (Cursor disposable on `e203b438` — not a Spark PASS)

| Suite | Pass | Fail | Skip | Defer |
|-------|------|------|------|-------|
| B4 required + F-B4-04 | 11 | 0 | 0 | — |
| B4 B5/B6/draft | — | — | 0 | 3 |
| Spark probe (Cursor) | 4 | 0 | — | — |
| B3 under B4 | 39 | 0 | 0 | 0 |
| B1/B2 under B4 | 72 | 0 | 0 | 4 |
| Vitest UI | 5 | 0 | — | — |

**Spark tip verdict:** **BLOCKED (F-B4-05)**.  
**Gates at the time:** No staging apply of `e203b438`.
