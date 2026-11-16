# Lane A local acceptance — runtime `e1345a0a`

| Field | Value |
|-------|-------|
| **Accepted runtime** | `e1345a0aef857e857fe5af50176c1fcb633aae70` |
| **Contract** | `1350b749ffd999ef3206c9733f0bcfb47b483ce2` |
| **Freeze base** | `5e53ee009507b29de707be0f1eebd0252c34c9c9` |
| **Local Auth/API env tip** | `2bb3681549088dc2218c5deede287b4b408df883` (docs/bootstrap only) |
| **FR-1 / production** | Untouched |
| **Staging apply** | **Not authorized** — packet only |

## Verdict

**Local acceptance recorded** for Lane A at runtime `e1345a0a`, after isolated Auth/API/Storage browser verification and Spark’s separate independent batteries.

## Spark verification commits (authorship preserved)

Published on origin; authors **Spark QA &lt;sparksubagent@almona.invalid&gt;** — not rewritten.

| Branch | Commit | Implementation under test | Result |
|--------|--------|---------------------------|--------|
| `origin/spark/laneA-verify-5e53ee00` | `db09f89a392c877d4c823ef62d54c722b83ea6a1` | `5e53ee00` freeze | 72 PASS / 7 FAIL / 79 (BLOCKED → drove F-01…F-04) |
| `origin/spark/laneA-verify-e1345a0a` | `75db91254e61f2e3c1627ccbf4ee30f97b83d489` | `e1345a0a` correction | **79 PASS / 0 FAIL / 79** |

Sanitized result bytes (byte-identical to those commits) published on this branch:

- [`spark-probes/SPARK_LANE_A_RESULTS_e1345a0a.json`](./spark-probes/SPARK_LANE_A_RESULTS_e1345a0a.json) — sha256 `16c2df0ab148…` (full in file)
- [`spark-probes/SPARK_LANE_A_RESULTS_5e53ee00.json`](./spark-probes/SPARK_LANE_A_RESULTS_5e53ee00.json)

Spark commit `75db9125` noted browser execution **NOT RUN** at publish time; Cursor later completed isolated local browser checks against `e1345a0a` (see below). Cursor evidence does **not** replace Spark’s independent SQL/Vitest verdict.

## Cursor local browser (supporting)

| Check | Result |
|-------|--------|
| Isolated project `almona-lane-a-local` on loopback `54421–54424` | OK |
| Admin / Support / Tech / Customer synthetic fixtures | OK |
| Admin login → `/admin?tab=service-routines` panel (via nav click) | OK |
| Support login → `/support/routines` review queue | OK |
| Support denied `/admin` | OK |
| RPC Admin create/submit + Support review; Tech draft preview denied | OK |

Handoff: [`SPARK_LANE_A_LOCAL_SUPABASE_HANDOFF.md`](./SPARK_LANE_A_LOCAL_SUPABASE_HANDOFF.md).

## Constraints retained

- One in-flight `draft|in_review` per routine = **implementation constraint** (Spark `SPK-CC-inflight-*` PASS) — not concurrent draft publication evidence.
- Deep-link `?tab=service-routines` issue: **confirmed** separately — [`LANE_A_TAB_NAV_FINDING.md`](./LANE_A_TAB_NAV_FINDING.md). Accepted runtime **not** modified for it.
