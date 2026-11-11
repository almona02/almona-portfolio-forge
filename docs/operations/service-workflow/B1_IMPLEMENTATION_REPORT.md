# B1 implementation report — data contract & state guards

**Status:** **CLOSED — ACCEPTED** (Spark independent verification). Disposable only.  
**Base tip:** `ca9f5067` (#155 frozen). **No staging/production apply. No merge.**  
**Migration:** `supabase/migrations/20261111210000_service_workflow_b1_data_contract.sql`  
**Accepted freeze SHA:** `7a8307395b79df677a96f77cd993a77351b5805c`

## Spark independent result (authoritative)

| Suite | Result |
|-------|--------|
| SQL battery | **49 PASS / 0 FAIL / 0 required SKIP / 5 DEFER** |
| Concurrency | **K1–K4 PASS** |
| Activation adjuncts | **W1–W4 PASS** (included in the 49) |
| Gate | **B1 ACCEPTED** |

Evidence: `.artifacts/slice0/service-workflow/SPARK_B1_VERDICT_7a830739.md`  
Prior BLOCKED (retained): `.artifacts/slice0/service-workflow/SPARK_B1_VERDICT_c6b1e46a.md` and `pre-acceptance-c6b1e46a/`.

### Check-count reconciliation

Spark’s **49** is the full executed PASS set (including W1–W4, X5, X6, and positive completion coverage on J1). The earlier Cursor tally of **44 PASS + 5 DEFER = 49 rows** described a **narrower harness** that omitted Spark-retained checks:

| Retained in Spark full battery | Notes |
|--------------------------------|--------|
| W1 | Activation `at` durable (overlaps Cursor X4b) |
| W2–W4 | Actor durable; RPC preserve; no resolve bypass |
| X5 | Free `resolved→in_progress` govern denied |
| X6 | Bulk resolve partial (jobless ok / activated blocked) |
| J1 positive completion | Bare complete denied **and** complete succeeds with approved issued chain |

**5 DEFER (unchanged):** V5, R3, R4, M4, M5 — later B3–B5; do not block B1.

**Harness note:** committed Spark-full battery also retains Cursor  alongside , so disposable reruns report **50 PASS / 5 DEFER** (55 executed rows) without dropping Spark coverage.

Do **not** treat Cursor’s narrower run as independent acceptance. Do **not** cite amend-placeholder SHAs (`2bb20cb1`, `bd95335b`) as the freeze — only `7a830739…`.

## Commit relationship

| SHA | Role | Runtime? |
|-----|------|----------|
| `5eef3722…` | Initial B1 schema/RLS/RPC land | Yes |
| `c6b1e46a…` / `4f64fd5f…` | Docs-only freeze labels | No |
| **`7a830739…`** | **B1 acceptance freeze** (activation protect + harness) | **Yes** |

## Naming & alignment

See `scripts/service-workflow/b1_contract.md`. Visit authority remains `service_job_visits` (contract `service_visits` untouched). Eight Spark alignment answers confirmed in that file.

## PR hygiene

- #156 remains **draft**  
- #155 tip remains `ca9f506715567e1f2ea08fdcd4e2bb0d5e3d10da`  
- Next authorized unit: **B2** (assignment) — disposable only; see `B2_ASSIGNMENT_CONTRACT.md`
