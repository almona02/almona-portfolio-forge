-- UP-18: Freeze qualified manufacturing artifacts for a position revision.
-- Thin release — no CNC protocol; shop records bind to this snapshot.

BEGIN;

CREATE TABLE IF NOT EXISTS public.fabricator_position_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  position_id UUID NOT NULL,
  position_source TEXT NOT NULL CHECK (position_source IN ('v1', 'v2')),
  revision BIGINT NOT NULL CHECK (revision > 0),
  bom_fingerprint TEXT NOT NULL,
  stock_fingerprint TEXT NOT NULL,
  optimization_fingerprint TEXT NOT NULL,
  release_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  released_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (position_id, position_source, revision)
);

CREATE INDEX IF NOT EXISTS idx_fabricator_position_releases_owner
  ON public.fabricator_position_releases (owner_user_id, released_at DESC);

CREATE INDEX IF NOT EXISTS idx_fabricator_position_releases_position
  ON public.fabricator_position_releases (position_id, revision);

ALTER TABLE public.fabricator_position_releases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fabricator_position_releases_select_own ON public.fabricator_position_releases;
CREATE POLICY fabricator_position_releases_select_own ON public.fabricator_position_releases
FOR SELECT USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS fabricator_position_releases_insert_own ON public.fabricator_position_releases;
CREATE POLICY fabricator_position_releases_insert_own ON public.fabricator_position_releases
FOR INSERT WITH CHECK (owner_user_id = auth.uid());

-- No UPDATE/DELETE for authenticated — releases are immutable once frozen.
REVOKE UPDATE, DELETE ON public.fabricator_position_releases FROM anon, authenticated;

COMMENT ON TABLE public.fabricator_position_releases IS
  'UP-18 revision-bound freeze of qualified BOM / stock / optimization fingerprints. Manual production recording only.';

COMMIT;
