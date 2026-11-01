# PR 122 follow-up — completion matrix

Baseline tip before follow-up: `df41eba3` (PR 122 merge). Branch: `cursor-nov-qty-evidence-layout`.

**Review (2026-11-02):** A–F are **not** fully accepted until physical-stock length binding, chrome non-overlap, real 380 rail browser evidence, and remount preservation are verified. This matrix distinguishes source / automated / browser / live.

## Commits (cite; tip advances with review fixes)

| Batch | Earlier commit | Review-fix commit |
|-------|----------------|---------------------|
| A | `d4175978` | (kept) |
| B | `33ae61f7` | `4c647dba` physical `barsByCatalogueLength` + fail-closed unbound |
| C–D | `286a56ea` / `afa683ea` | `14b25be1` status flex row; exclusive Parts; canvas hit |
| E | `5e044618` | `14b25be1` persistent preview host; CollapsiblePanel width |
| F | `92a402df` / `69b7b7b8` | `684cae14` auth-gated 380 e2e; matrix refresh |

**Gates this session:** focused vitest 37/37; `npm run type-check` exit 0; `npm run lint` exit 0. Production `npm run build` not re-run in the review-fix pass.

## Matrix

| Batch | Scope | Source | Automated | Browser | Live | Remaining |
|-------|--------|--------|-----------|---------|------|-----------|
| A | Quantity multiset evidence | yes | qty 1/2/3 + negatives | n/a | n/a | integrated page→solver→evidence record/reload when server fixture available |
| B | Derive fail-closed + **physical** bars | yes (derive + length-keyed lots) | physicalOwnedBars + solver STOCK_BARS_UNBOUND | n/a | **R9 not run** | authenticated R9; server raw vs allowance parity still open |
| C | Container policy + 380 rule | yes | policy + chrome unit/fixtures | unit only until e2e pose URL | n/a | visual screenshot on authenticated bay |
| D | One chrome owner | yes | chrome slots + deferred details | same | n/a | full R3F remount proof optional once e2e green |
| E | Outer shells + honesty | yes | layout + Batch E manifest + persistence host | e2e when configured | n/a | sync mobile 3d tab ↔ right panel expand |
| F | Acceptance | partial | focused unit suite | **skips** without `E2E_FABRICATOR_POSE_URL` | lint/typecheck this session | production build + live R9 |

## Physical stock contract (review correction)

- Production packing requires `physicalBarBinding === 'physical'` and `barsByCatalogueLength` keys `${id}|${stockLengthMm}`.
- `barsByCatalogueProfileFromDemand` (metres ÷ length) is **estimate-only / deprecated** for solver input.
- Missing length binding → `STOCK_BARS_UNBOUND` (never unlimited).

## Chrome contract (review correction)

- Status is a **flex row under** the panel region (not absolute over Parts).
- At 380 px with Parts+details: exclusive Parts drawer; details deferred with return hint; canvas hit ≥ `minUsableCanvasPx`.

## Explicitly open

1. Server derive raw lengths vs client `physicalCutForOccurrence` allowance.
2. Authenticated R9 capture (revision, expected/placed, reload).
3. Browser 380 rail run when `E2E_FABRICATOR_POSE_URL` is set.
