# Spark handoff — Staging PR1 apply + machine journey

**Production:** unauthorized / untouched (`shfsebdncjnncqqnewfj`).  
**Staging project:** `apnmoevmvihfzcnttctx` (`almona02-staging`).

## A. Staging schema apply (foundation)

| Item | Value |
|---|---|
| Reviewed migration | `supabase/migrations/20261111180000_machine_identity_pr1.sql` |
| Git tips | foundation `aab64e1a` → hosted-safe stubs `ec56020c` / `b76d1ad3` |
| Applied migration name | `machine_identity_pr1_schema_atomic` (version `20261111165835`) |
| Apply mode | **Single atomic** `BEGIN`…`COMMIT` (no chunked partial schema) |
| Reviewed SQL sha256 (LF) | `5a64bd13edc9b933068336cf69c2c59f218e9d7a65904d1dfd944c090213f2d0` |
| Record | `.artifacts/slice0/machine-identity/STAGING_PR1_APPLY_RECORD.md` |

### Transaction / partial-failure note

An earlier hosted apply failed on `CREATE TABLE IF NOT EXISTS auth.users` (permission denied for schema `auth`) and **rolled back cleanly** — no PR1 objects left. Stubs were gated on `to_regclass` / `to_regprocedure` before re-apply. Chunked transport was **not** used for the successful apply.

### Synthetic staging battery

JWT-impersonated fixture users (`e2000000-…0001` owner, `…0003` other, `…0002` tech): **13/13 PASS** (registration, idempotency, uncatalogued/missing serial, cross-customer non-disclosure, detect null foreign flag, owner link, cross/tech deny, protected edit block, UUID immutability, null-machine ticket, ticket count preserved). Results table: `public.mi_staging_pr1_eval`.

### Recovery

Restoring `UNIQUE(serial_number)` / `NOT NULL` after nulls/duplicates requires human remediation — never silent deletes or invented serials.

## B. Journey integration (separate commit)

Frontend/API journey (register → ticket select → persist `machine_id` → reopen UUID → retry idempotent → cross-customer deny). No QR/transfer/merge/passport UI. Identity/lifecycle fields read-only in registration UI.

**Do not re-apply foundation PR1 schema** — Spark already confirmed staging schema checks pass.

### B1. Journey correction package (required before frontend staging deploy)

Fixes for journey commit `9569d350`:

1. **Missing-serial evidence** — `register_machine_identity` requires successfully persisted plate-area `photo_urls` (registration path only; no legacy backfill; no waiver). UI surfaces upload failures and keeps a recoverable draft.  
2. **Post-insert link failure** — ticket create succeeds; link denial/unexpected errors return ticket id + unlinked warning + link-only retry (no second insert, no foreign disclosure, no silent machine fallback).

| Item | Path |
|------|------|
| Evidence follow-up migration (staging package) | `supabase/migrations/20261111190000_machine_identity_missing_serial_plate_evidence.sql` |
| Hosted-auth compatibility note | `docs/operations/machine-identity/HOSTED_AUTH_COMPATIBILITY.md` |
| Foundation schema | already applied — do not re-apply |

**Freeze this correction for Spark targeted review. After Spark passes: apply the evidence migration on staging (if not already), then proceed with the already-authorized staging integration frontend deploy. Production remains unauthorized.**

### Acceptance demo checklist

1. Register a manual/uncatalogued or catalog machine (and a missing-serial provisional **with persisted plate-area photo**).  
2. Create ticket selecting that machine; confirm `service_tickets.machine_id` equals `machines.id`.  
3. Reopen ticket; same UUID shown.  
4. Retry registration with same idempotency key → same machine, no second row.  
5. Other customer cannot discover via detect (`foreign_match_exists` null) or link that machine.  
6. Force a post-insert link denial → ticket id preserved, unlinked warning, link-only retry against the same ticket (no second ticket).
