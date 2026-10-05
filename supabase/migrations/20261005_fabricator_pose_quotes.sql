-- UP-15: Pose-bound fabricator quotes (project / position / revision).
-- Separate from catalog `quotes` — manufacturing identity is required.

BEGIN;

CREATE TABLE IF NOT EXISTS public.fabricator_pose_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  position_id UUID NOT NULL,
  revision BIGINT NOT NULL CHECK (revision > 0),
  status TEXT NOT NULL CHECK (status IN ('draft', 'priced', 'accepted', 'superseded', 'expired')),
  currency TEXT NOT NULL DEFAULT 'EGP',
  subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(8, 4) NOT NULL DEFAULT 0.14,
  total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  markup_percent NUMERIC(8, 4) NULL,
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  quote_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, position_id, revision)
);

CREATE INDEX IF NOT EXISTS idx_fabricator_pose_quotes_owner
  ON public.fabricator_pose_quotes (owner_user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_fabricator_pose_quotes_position
  ON public.fabricator_pose_quotes (position_id, revision);

ALTER TABLE public.fabricator_pose_quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fabricator_pose_quotes_select_own ON public.fabricator_pose_quotes;
CREATE POLICY fabricator_pose_quotes_select_own ON public.fabricator_pose_quotes
FOR SELECT USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS fabricator_pose_quotes_insert_own ON public.fabricator_pose_quotes;
CREATE POLICY fabricator_pose_quotes_insert_own ON public.fabricator_pose_quotes
FOR INSERT WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS fabricator_pose_quotes_update_own ON public.fabricator_pose_quotes;
CREATE POLICY fabricator_pose_quotes_update_own ON public.fabricator_pose_quotes
FOR UPDATE USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS fabricator_pose_quotes_delete_own ON public.fabricator_pose_quotes;
CREATE POLICY fabricator_pose_quotes_delete_own ON public.fabricator_pose_quotes
FOR DELETE USING (owner_user_id = auth.uid());

COMMENT ON TABLE public.fabricator_pose_quotes IS
  'UP-15 pose quotes bound to project/position/revision. Catalog quotes table remains separate.';

COMMIT;
