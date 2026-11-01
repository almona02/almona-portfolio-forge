# PR 122 follow-up — completion matrix

Baseline tip before follow-up: `df41eba3` (PR 122 merge). Branch: `cursor-nov-qty-evidence-layout`.

**Status:** materially improved; **not production-certified.** Code implementation ≠ automated checks ≠ browser evidence ≠ live evidence.

## Commits (cite)

| Theme | Commit |
|-------|--------|
| A qty multiset | `d4175978` |
| B fail-closed derive + early bars | `33ae61f7` |
| B length-keyed bars (review) | `4c647dba` |
| B movement reconciliation + complete snapshot | `7c1ab828` |
| C–E chrome / shells | `286a56ea` … `14b25be1` |
| E inert retained workspace + strict 380 e2e | `5876e274` |
| F matrix refresh | `6d60dd9e` |

**Gates (author-run, 2026-11-02):** focused vitest **44/44**; `npm run type-check` exit 0; `npm run lint` exit 0; `npm run build` exit 0. Tip `6d60dd9e`.

## Matrix

| Batch | Scope | Source | Automated | Browser | Live | Remaining |
|-------|--------|--------|-----------|---------|------|-----------|
| A | Quantity multiset evidence | yes | unit qty 1/2/3 + negatives | n/a | n/a | page→solver→evidence reload when server fixture exists |
| B | Physical stock | yes | reconcile FIFO / metres-outbound invalidate / unknown type; paginated loader completeness | n/a | **R9 not run** | authoritative lot RPC if ledger grows; live R9; server raw vs allowance |
| C–D | Chrome non-overlap | yes | policy + chrome fixtures | e2e strict when URL set; **skips only if URL unset** | n/a | authenticated 380 run |
| E | Shells / remount / inert | yes | persistence host + inert attribute test | n/a | n/a | ResizeObserver recovery under real browser |
| F | Acceptance | partial | focused unit suite | strict e2e (config skip / else fail) | lint + typecheck + **production build** this pass | live R9 + authenticated 380 screenshots |

## Physical stock contract

- Production requires `physicalBarBinding === 'physical'` and length-keyed counts.
- Movement reconciliation: transaction effects from `movement_type`; FIFO unassigned consume; metres-only outbound **invalidates**; unknown types **invalidate**; never discard unmatched negatives alone.
- Loader: paginated + exact count match; partial/error → no physical bind; ack refused if incomplete.

## Explicit blockers

1. Server derive raw lengths vs client `physicalCutForOccurrence` allowance.
2. Authenticated R9 capture.
3. Authenticated 380 rail e2e (`E2E_FABRICATOR_POSE_URL`).
