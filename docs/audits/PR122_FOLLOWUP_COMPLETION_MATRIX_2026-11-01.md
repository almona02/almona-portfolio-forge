# PR 122 follow-up — completion matrix

Baseline tip before follow-up: `df41eba3` (PR 122 merge). Branch: `cursor-nov-qty-evidence-layout`.

**Status:** materially improved; **not production-certified.**

Columns stay separate: **Source** | **Automated (author-run)** | **Browser** | **Live**.

## Freshness (Batch 1) — current tip

| Check | Status |
|-------|--------|
| Ack acceptance uses a **fresh** inventory + physical-bar load (not React cache alone) | source: yes (`StudioStockPage` async ack) |
| Drift vs displayed fingerprint → block + invalidate UI cache | source + UI flow tests |
| Production optimize re-reads `stock_version` and fails on drift | source + UI fail-closed tests (`STOCK_ACK_STALE_STOCK`) |
| Soft acknowledgement ≠ hard stock reservation / allocation RPC | still soft; allocation boundary remains open |

The `445d901a` acknowledgement check was **cached self-consistency only**. That description is obsolete after this tip: acceptance now compares the displayed fingerprint against a freshly loaded authoritative snapshot, and production re-reads versions before packing.

## Matrix

| Batch | Scope | Source | Automated | Browser | Live | Remaining |
|-------|--------|--------|-----------|---------|------|-----------|
| A | Qty multiset | yes | unit | n/a | n/a | server record/reload |
| B | Physical stock + freshness | yes | freshness helpers + StudioStock UI + Optimization UI + reconcile + loader | n/a | **R9 open** | hard allocation/versioned claim; live R9; raw vs allowance |
| C–D | Chrome | yes | unit | strict e2e requires **canvas** at hit centre + negative intercept | **380 run open** | authenticated execution |
| E | Shells / inert | yes | unit | n/a | n/a | — |
| F | Acceptance | partial | focused suite (author-run) | skipped without URL ≠ evidence | lint/typecheck/build | R9 + 380 auth |

## Explicit blockers (unchanged)

1. Server derive raw vs `physicalCutForOccurrence` allowance (same occurrence inputs, including pose quantity).
2. Authenticated R9: bead cut, ack verified stock, optimize, record/reload without missing-cut errors.
3. Authenticated 380 px rail with Parts open (screenshot/trace). A skipped test is not browser evidence.
4. Authoritative stock-allocation operation at consume boundary (ack remains soft).

## Gates (author-run — cite tip after land)

- Focused vitest: freshness helpers, StudioStock UI ack flow, Optimization fail-closed (incl. live version drift), inventory reconcile/physical bars, chrome policy/shell, pose-quantity evidence — **78 passed**.
- `npm run type-check` — pass (win32 baseline delta; 0 new signatures).
- `npm run lint` — 0 errors (warnings pre-existing).
- `vite build` — pass; post-vite `render-public-catalogue.mjs` fails on this host with pre-existing `.ts` ESM load of `yilmazMachines.ts` (also at tip `445d901a`, unrelated to freshness).
