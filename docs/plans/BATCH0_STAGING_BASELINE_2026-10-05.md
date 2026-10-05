# Batch 0 staging baseline

Date: 5 October 2026  
Status: **PARTIAL** — toolchain + recorded local SHAs; disposable two-owner fixtures await operator accounts.

## Recorded baseline (local, unpushed program)

| Item | Value |
|---|---|
| Tip SHA (at doc write) | `b522ea844b086e264aaf4e824921f8ec117236d6` (Batch 6) |
| Prior Batch 5 | `06c4489` |
| Prior Batch 4 | `b365e59` |
| UTC stamp | `2026-10-05T19:08Z` |
| Push | **Not pushed** — operator decides |

## Feature-flag inventory (no secrets)

| Flag | Default / source |
|---|---|
| `FABRICATOR_READ_V2` | default **true** unless `VITE_FABRICATOR_READ_V2=false` |
| `GOLD_TIER_ENABLED` | env `VITE_GOLD_TIER_ENABLED` |
| `DUAL_OUTPUT_BETA_ENABLED` | env |
| `PATTERN_SUGGESTIONS_ENABLED` | env |
| `ENABLE_OPENING_MECHANISMS` | default true |
| `ENABLE_PROPORTIONAL_GRID` | always true |
| `PERFORMANCE_WEB_WORKERS` | env |

Source: `src/lib/featureFlags.ts`.

## Migrations applied this program (staging)

| Migration | Status |
|---|---|
| `20261005_fabricator_pose_quotes.sql` | Applied |
| `20261005_orders_pose_quote_link.sql` | Applied |
| `20261005_fabricator_position_releases.sql` | Applied |
| `20261005_fabricator_delivery_acks.sql` | Applied |

## Fixture seed

Template: [`supabase/seeds/batch0_disposable_fixtures.sql`](../../supabase/seeds/batch0_disposable_fixtures.sql)

**Operator steps**
1. Create two disposable Auth users (never customer workshop accounts).
2. Replace `:OWNER_A` / `:OWNER_B` and expand inserts or create via Studio.
3. Cover matrix: multi-revision pose, empty+populated stock, accepted quote→order, release+QC+delivery, cross-owner reject.
4. Record restore deletes by `fixture_tag = batch0-2026-10-05`.
5. Capture Railway image digest when a staging deploy is cut.

## Exit remaining

- [ ] Two-owner accounts designated  
- [ ] Multi-revision + QC/delivery walk recorded  
- [ ] Restore point verified  
- [ ] Production/staging image digest recorded  

Code program Batches 1–6 can continue without these; release-perfect still needs them.
