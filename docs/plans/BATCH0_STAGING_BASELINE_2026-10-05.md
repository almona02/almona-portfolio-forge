# Batch 0 staging baseline

Date: 5 October 2026  
Status: **NEAR EXIT** — disposable two-owner Auth users + tagged fixture rows seeded on `almona02`.

## Owners (Auth)

| Role | Email | User ID |
|---|---|---|
| Owner A | `batch0.fixture.a@almona.local` | `1dfae5b1-5299-4737-b1a4-d1bc640950db` |
| Owner B | `batch0.fixture.b@almona.local` | `7c4aa1d9-cbf4-4887-aca3-5a85e0d72df7` |

Passwords live only in gitignored `.env.batch0.fixtures` (reset 2026-10-05).  
Verified in Chrome: Supabase Auth → Users (search `batch0.fixture`).

## Seeded rows (`fixture_tag = batch0-2026-10-05`)

| Kind | Count | Notes |
|---|---|---|
| `profiles` | 2 | Fixture A/B display profiles |
| `fabricator_profiles` | 3 | A populated + A empty + B UPVC |
| `fabricator_projects_v2` | 2 | `BATCH0-A`, `BATCH0-B` |
| `fabricator_positions_v2` | 3 | A R1 + A R2 + B POS-001 |

## Recorded baseline (local, unpushed program)

| Item | Value |
|---|---|
| Tip SHA (at earlier doc write) | `b522ea8` (Batch 6) |
| Later closes | `d344587`, `6e988c0` |
| UTC stamp | `2026-10-05T19:22Z` area |
| Push | **Not pushed** — operator decides |

## Migrations applied this program (staging)

| Migration | Status |
|---|---|
| `20261005_fabricator_pose_quotes.sql` | Applied |
| `20261005_orders_pose_quote_link.sql` | Applied |
| `20261005_fabricator_position_releases.sql` | Applied |
| `20261005_fabricator_delivery_acks.sql` | Applied |
| `20261005_stock_movements_idempotency.sql` | Applied |

## Feature-flag inventory (no secrets)

See `src/lib/featureFlags.ts` — `FABRICATOR_READ_V2` default true.

## Exit remaining

- [x] Two-owner accounts designated  
- [x] Multi-revision + cross-owner project/pose matrix seeded  
- [x] Restore SQL documented  
- [ ] Full QC/delivery walk recorded against fixtures (manual Studio walk)  
- [ ] Production/staging image digest recorded on next deploy  

## Restore

```sql
DELETE FROM public.fabricator_positions_v2 WHERE meta->>'fixture_tag' = 'batch0-2026-10-05';
DELETE FROM public.fabricator_projects_v2  WHERE meta->>'fixture_tag' = 'batch0-2026-10-05';
DELETE FROM public.fabricator_profiles     WHERE specifications->>'fixture_tag' = 'batch0-2026-10-05';
```
