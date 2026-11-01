# PR 122 follow-up — completion matrix

Baseline tip before follow-up: `df41eba3` (PR 122 merge). Branch: `cursor-nov-qty-evidence-layout`.

| Batch | Scope | Implemented | Automated | Browser | Live | Remaining |
|-------|--------|-------------|-----------|---------|------|-----------|
| A | Quantity multiset evidence (`requiredCutsFromBom` × poseQuantity) | yes | qty 1/2/3 + negative multiplicity tests | n/a | n/a | none for local evidence |
| B | Derive fail-closed + `availableBars` from owned stock | yes | stock gate / solver input tests; audit note | n/a | **R9 authenticated capture not run this session** | run controlled R9 on staging; reconcile raw vs allowance length if staging differs |
| C | Container ResizeObserver + pure `viewportChromePolicy` + 380px stack rule | yes | `viewportChromePolicy.test.ts`, chrome 380 fixture | unit fixtures 380/768/1024/1440 | n/a | visual screenshot pass optional |
| D | One chrome owner: status + embedded details; Preview source via `chromeStatus` | yes | chrome fixtures; DraftingPreview3D no absolute overlay | e2e shell overflow check | n/a | mocked full R3F remount proof optional |
| E | Outer shells use measured width; fixed/mixed/legacy honesty | yes | EngineeringBay/DesignWorkspace + Batch E manifest tests | e2e shell | n/a | PS customer path remains prior PR122 work |
| F | Acceptance matrix + fixtures | this doc | focused unit + playwright fixture file | playwright widths | lint/typecheck/build this session | cite commits after land |

## Contract reminders (AICS-001)

- Quantity applied **once** into required multiset (shared cut IDs × N).
- Design BOM stays per-window; never invent required identities from placements.
- Remnant packing controls stay disabled until packing + evidence support them.
- Metres-only stock ack is insufficient; finite bar counts feed the solver.

## Commands run (Batch F gate)

See CI / local agent log for:

- `npx vitest run` focused: evidence, chrome, policy, assembly Batch E, EngineeringBay layout
- `npm run type-check` (baseline-aware)
- `npm run lint` (errors must stay 0)
- `npm run build` when time allows

## Stale audit corrections

- Do **not** claim “finished” without this matrix.
- Server raw-length vs `physicalCutForOccurrence` allowance gap: still open for live parity (Batch B remaining).
- Live R9 reload evidence: checklist only until authenticated run.
