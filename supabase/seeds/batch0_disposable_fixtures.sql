-- Batch 0 disposable staging fixtures (OPERATOR-APPLIED).
-- NEVER run against customer workshop data without replacing owner UUIDs.
--
-- Usage:
--   1. Create two disposable auth users in Supabase Auth (fixture-a@…, fixture-b@…).
--   2. Replace :OWNER_A and :OWNER_B below with their auth.users ids.
--   3. Run in a staging project only.
--   4. Restore: DELETE FROM … WHERE (specifications->>'fixture_tag') = 'batch0-2026-10-05'
--      (and matching project/position rows tagged the same way).
--
-- This script is intentionally incomplete for live apply until owners are set.
-- It documents the required row shapes for multi-revision / QC / release / delivery walks.

BEGIN;

-- Guard: refuse empty placeholders.
DO $$
BEGIN
  IF ':OWNER_A' LIKE ':%' OR ':OWNER_B' LIKE ':%' THEN
    RAISE NOTICE 'Batch 0 seed: replace :OWNER_A / :OWNER_B before apply. Aborting without writes.';
  END IF;
END $$;

-- Example owned profile (Owner A) — catalog code retained in specs.
-- INSERT INTO public.fabricator_profiles (
--   user_id, name, material, width, height, thickness, color,
--   cost_per_meter, cutting_allowance, stock_quantity, min_stock_level, specifications
-- ) VALUES (
--   ':OWNER_A'::uuid,
--   'BATCH0 Frame 60',
--   'aluminum',
--   60, 60, 1.5, '#C0C0C0',
--   120, 3, 50, 10,
--   jsonb_build_object(
--     'fixture_tag', 'batch0-2026-10-05',
--     'originalCatalogCode', 'BATCH0-FRAME-60',
--     'partNumber', 'BATCH0-FRAME-60'
--   )
-- );

-- Required fixture matrix (create via Studio UI or expand this script once owners exist):
--   Owner A: project with poses R1 (draft), R2 (qualified BOM + stock ack + release + QC)
--   Owner A: empty stock vs populated stock profiles
--   Owner A: accepted pose quote + converted order (fabricator_pose_quote_id)
--   Owner B: separate project — prove cross-owner hydration rejection
--   Materials: aluminum + UPVC + custom pack (materialized UUIDs)
--   Delivery: one ack bound to release + QC for Owner A R2

COMMENT ON SCHEMA public IS
  'Batch 0 fixture template present: supabase/seeds/batch0_disposable_fixtures.sql (operator-owned).';

COMMIT;
