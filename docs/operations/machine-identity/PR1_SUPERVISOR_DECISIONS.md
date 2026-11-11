# Machine identity PR1 — supervisor decisions & Wonder gap corrections

**Date:** 2026-11-11  
**Authorization:** PR1 code + migration + **local disposable testing only**.  
**Not authorized:** staging apply, production apply, transfers, QR, passport UI, merges, cutover.

## Supervisor decisions (binding for PR1)

1. **Raw serials preserved.** Default normalized value **retains separators**. A separate separator-insensitive comparison may **only** flag review candidates; it must never assert identity or auto-link.
2. **Catalog linkage optional.** Uncatalogued manufacturer/model text is supported with explicit uncertainty.
3. **Three axes separated:** identity confidence, review status, and operational lifecycle — with documented mapping to Wonder states.
4. **Retired records** are included in authorized duplicate detection.
5. **Omitted nonessential Wonder fields and QR criteria are explicitly deferred.** PR1 does **not** claim full-spec acceptance.

## Wonder v0.2 gap corrections (recorded)

From Wonder `docs/machine-identity-spec.md` v0.2 review decisions:

1. **Scope retained, priority narrowed** — all lines one model; conventional/manual workflows first; no connectivity assumed.
2. **`ALM-` is internal only** — never a manufacturer serial, never stored/displayed as one, never submitted to manufacturer systems.
3. **Backfill is conservative** — unique exact non-conflicting match only; ambiguous → human review; unlinked preferred over wrong link.
4. **Scanning is not authorization** — QR deferred in PR1; when later implemented, server-side per-machine authz is mandatory (gap correction stands; QR out of PR1).

*(Wonder’s fifth decision on unavailable-owner transfer exceptions remains deferred with transfers.)*

## State mapping (Wonder ↔ PR1 columns)

| Wonder concept | PR1 column / value | Notes |
|---|---|---|
| `machine_id` | `machines.id` | Immutable UUID; reuse existing |
| `provisional` (identity) | `identity_confidence = provisional` + `provisional_asset_ref` | Serial fields null; ALM- internal |
| `active` (identity lifecycle) | `identity_lifecycle = active` | Default for usable machines |
| `retired` | `identity_lifecycle = retired` | Still visible to authorized duplicate detection |
| `serial_disputed` / duplicate case | `identity_review_status ∈ {duplicate_review, serial_disputed}` | Separate from lifecycle |
| Serial verification | `manufacturer_validation_status` / feeds `identity_confidence` | Default `unchecked` (no manufacturer API in PR1) |
| CNC operational idle/running/… | `machine_profiles.status` only | **Not** identity lifecycle |
| `transfer_pending` | — | Deferred |

## Migration character

Described accurately as: **additive columns/tables/RPCs + constraint relaxation** (`DROP UNIQUE(serial_number)`, allow NULL serials) + **staging schema-convergence** for missing `machines` / `service_tickets.machine_id`. Not a registry replacement. No production-data copy.
