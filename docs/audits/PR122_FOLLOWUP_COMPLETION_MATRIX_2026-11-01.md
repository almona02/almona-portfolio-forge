# PR 122 follow-up — completion matrix

Baseline tip before follow-up: `df41eba3` (PR 122 merge). Branch: `cursor-nov-qty-evidence-layout`.

**Status:** materially improved; **not production-certified.** Source ≠ automated ≠ browser ≠ live.

## Recent commits

| Theme | Commit |
|-------|--------|
| Movement FIFO + complete paging | `7c1ab828` |
| Inert CAD + strict 380 e2e (v1) | `5876e274` |
| Incomplete adjustment/transfer invalidate + version snapshot + pointer assert | *(this tip)* |

## Matrix

| Batch | Scope | Source | Automated | Browser | Live | Remaining |
|-------|--------|--------|-----------|---------|------|-----------|
| A | Qty multiset evidence | yes | unit | n/a | n/a | server record/reload fixture |
| B | Physical stock | yes | FIFO; incomplete adjustment/transfer invalidate; before/after `stock_version`; ack fingerprint | n/a | **R9 open** | live R9; server raw vs allowance |
| C–D | Chrome | yes | unit fixtures | strict e2e (URL skip / else fail); pointer via `elementFromPoint` | **380 run open** | authenticated execution |
| E | Shells / inert | yes | persistence + inert | n/a | n/a | — |
| F | Acceptance | partial | **49** focused tests | e2e gated | lint + typecheck + **build** | R9 + 380 auth |

## Physical stock notes

- Incomplete `adjustment` / `transfer` / `release` without bar fields **invalidate** (metres sign retained for audit only).
- Same-profile transfer with known length is a no-op; ambiguous/cross-profile transfer invalidates.
- Loader reads stock versions before and after paging; drift or count growth → fail. Ack stores verified fingerprint and rechecks before write; readiness requires fingerprint match.

## Explicit blockers

1. Server derive raw vs `physicalCutForOccurrence` allowance.
2. Authenticated R9 record/reload.
3. Authenticated 380 px browser run (`E2E_FABRICATOR_POSE_URL`).

**Gates (author-run):** focused vitest 49/49; `npm run type-check` 0; `npm run lint` 0; `npm run build` 0.
