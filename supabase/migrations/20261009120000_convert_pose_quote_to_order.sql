-- #57 / #67: Server convert pose-quote → order with validated optimization evidence.
-- Client-written position.optimization JSON does NOT qualify.
-- Local/staging only — STOP before remote/production apply.
BEGIN;

-- ---------------------------------------------------------------------------
-- Server-stamped optimization evidence (owners cannot forge via direct UPDATE)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fabricator_optimization_evidence (
  position_id UUID PRIMARY KEY REFERENCES public.fabricator_positions_v2(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id),
  project_id UUID NOT NULL,
  position_revision BIGINT NOT NULL CHECK (position_revision > 0),
  design_revision BIGINT NOT NULL CHECK (design_revision > 0),
  ledger_fingerprint TEXT NOT NULL CHECK (length(trim(ledger_fingerprint)) >= 8),
  system_pack_id TEXT NOT NULL,
  system_pack_revision BIGINT NOT NULL CHECK (system_pack_revision > 0),
  rule_version TEXT NOT NULL CHECK (length(trim(rule_version)) >= 1),
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  cut_count INTEGER NOT NULL CHECK (cut_count > 0),
  authority_approval_id UUID NOT NULL
    REFERENCES public.fabricator_manufacturing_authority_revisions(approval_id),
  evidence_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  validated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  invalidated_at TIMESTAMPTZ,
  invalidation_reason TEXT,
  CHECK (
    (invalidated_at IS NULL AND invalidation_reason IS NULL)
    OR (invalidated_at IS NOT NULL AND length(trim(coalesce(invalidation_reason, ''))) >= 3)
  ),
  CHECK (jsonb_typeof(evidence_payload) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_fabricator_opt_evidence_active
  ON public.fabricator_optimization_evidence(position_id)
  WHERE invalidated_at IS NULL;

ALTER TABLE public.fabricator_optimization_evidence ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fabricator_optimization_evidence FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.fabricator_optimization_evidence TO authenticated;

DROP POLICY IF EXISTS fabricator_opt_evidence_select_own ON public.fabricator_optimization_evidence;
CREATE POLICY fabricator_opt_evidence_select_own ON public.fabricator_optimization_evidence
  FOR SELECT USING (owner_user_id = auth.uid());

COMMENT ON TABLE public.fabricator_optimization_evidence IS
  '#67 server-stamped optimization evidence; client JSON on positions_v2.optimization is not authoritative.';

-- Invalidate evidence when design/revision/pack/qty inputs change
CREATE OR REPLACE FUNCTION public.trg_invalidate_optimization_evidence()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (
    NEW.qc_revision IS DISTINCT FROM OLD.qc_revision
    OR NEW.system_pack_id IS DISTINCT FROM OLD.system_pack_id
    OR NEW.quantity IS DISTINCT FROM OLD.quantity
    OR NEW.overall_width_mm IS DISTINCT FROM OLD.overall_width_mm
    OR NEW.overall_height_mm IS DISTINCT FROM OLD.overall_height_mm
    OR NEW.components IS DISTINCT FROM OLD.components
  ) THEN
    UPDATE public.fabricator_optimization_evidence e
       SET invalidated_at = now(),
           invalidation_reason = 'position inputs changed'
     WHERE e.position_id = NEW.id
       AND e.invalidated_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_invalidate_optimization_evidence ON public.fabricator_positions_v2;
CREATE TRIGGER trg_invalidate_optimization_evidence
  AFTER UPDATE ON public.fabricator_positions_v2
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_invalidate_optimization_evidence();

-- ---------------------------------------------------------------------------
-- Record validated optimization evidence (SECURITY DEFINER)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_fabricator_optimization_evidence(
  p_position_id UUID,
  p_expected_revision BIGINT,
  p_design_revision BIGINT,
  p_ledger_fingerprint TEXT,
  p_system_pack_revision BIGINT,
  p_rule_version TEXT,
  p_cut_count INTEGER,
  p_evidence_payload JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_pos public.fabricator_positions_v2%ROWTYPE;
  v_authority_id UUID;
  v_authority_pack TEXT;
  v_authority_rev BIGINT;
  v_authority_revoked TIMESTAMPTZ;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_position_id IS NULL OR coalesce(p_expected_revision, 0) <= 0 THEN
    RAISE EXCEPTION 'position and positive expected revision required';
  END IF;
  IF coalesce(p_design_revision, 0) <= 0 THEN
    RAISE EXCEPTION 'positive design revision required';
  END IF;
  IF length(trim(coalesce(p_ledger_fingerprint, ''))) < 8 THEN
    RAISE EXCEPTION 'ledger fingerprint required';
  END IF;
  IF coalesce(p_system_pack_revision, 0) <= 0 THEN
    RAISE EXCEPTION 'positive system pack revision required';
  END IF;
  IF length(trim(coalesce(p_rule_version, ''))) < 1 THEN
    RAISE EXCEPTION 'rule version required';
  END IF;
  IF coalesce(p_cut_count, 0) <= 0 THEN
    RAISE EXCEPTION 'positive cut count required';
  END IF;

  SELECT * INTO v_pos
  FROM public.fabricator_positions_v2
  WHERE id = p_position_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'position not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_pos.owner_user_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'position owner mismatch' USING ERRCODE = '42501';
  END IF;
  IF v_pos.qc_revision IS DISTINCT FROM p_expected_revision THEN
    RAISE EXCEPTION 'stale position revision (expected %, actual %)',
      p_expected_revision, v_pos.qc_revision;
  END IF;
  IF v_pos.system_pack_id IS NULL OR length(trim(v_pos.system_pack_id)) = 0 THEN
    RAISE EXCEPTION 'position system pack required';
  END IF;
  IF coalesce(v_pos.quantity, 0) <= 0 THEN
    RAISE EXCEPTION 'position quantity required';
  END IF;

  SELECT a.approval_id, a.system_pack_id, a.system_pack_revision, a.revoked_at
    INTO v_authority_id, v_authority_pack, v_authority_rev, v_authority_revoked
  FROM public.fabricator_manufacturing_authority_revisions a
  WHERE a.system_pack_id = v_pos.system_pack_id
    AND a.revoked_at IS NULL
  ORDER BY a.system_pack_revision DESC
  LIMIT 1;

  IF v_authority_id IS NULL THEN
    RAISE EXCEPTION 'approved manufacturing authority is unavailable'
      USING ERRCODE = 'P0001';
  END IF;
  IF v_authority_revoked IS NOT NULL THEN
    RAISE EXCEPTION 'manufacturing authority revoked' USING ERRCODE = 'P0001';
  END IF;
  IF v_authority_rev IS DISTINCT FROM p_system_pack_revision THEN
    RAISE EXCEPTION 'system pack revision mismatch (evidence %, authority %)',
      p_system_pack_revision, v_authority_rev;
  END IF;

  -- Upsert authoritative stamp (one row per position; history via invalidation timestamps).
  INSERT INTO public.fabricator_optimization_evidence (
    position_id, owner_user_id, project_id,
    position_revision, design_revision, ledger_fingerprint,
    system_pack_id, system_pack_revision, rule_version,
    quantity, cut_count, authority_approval_id, evidence_payload,
    validated_at, invalidated_at, invalidation_reason
  ) VALUES (
    p_position_id, v_uid, v_pos.project_id,
    v_pos.qc_revision, p_design_revision, trim(p_ledger_fingerprint),
    v_pos.system_pack_id, p_system_pack_revision, trim(p_rule_version),
    v_pos.quantity, p_cut_count, v_authority_id,
    coalesce(p_evidence_payload, '{}'::JSONB),
    now(), NULL, NULL
  )
  ON CONFLICT (position_id) DO UPDATE SET
    owner_user_id = EXCLUDED.owner_user_id,
    project_id = EXCLUDED.project_id,
    position_revision = EXCLUDED.position_revision,
    design_revision = EXCLUDED.design_revision,
    ledger_fingerprint = EXCLUDED.ledger_fingerprint,
    system_pack_id = EXCLUDED.system_pack_id,
    system_pack_revision = EXCLUDED.system_pack_revision,
    rule_version = EXCLUDED.rule_version,
    quantity = EXCLUDED.quantity,
    cut_count = EXCLUDED.cut_count,
    authority_approval_id = EXCLUDED.authority_approval_id,
    evidence_payload = EXCLUDED.evidence_payload,
    validated_at = now(),
    invalidated_at = NULL,
    invalidation_reason = NULL;

  -- Do not UPDATE fabricator_positions_v2 here: qc_revision bump triggers would
  -- invalidate the evidence we just stamped. Convert reads this table only;
  -- client JSON on positions_v2.optimization never qualifies.

  RETURN p_position_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_fabricator_optimization_evidence(
  UUID, BIGINT, BIGINT, TEXT, BIGINT, TEXT, INTEGER, JSONB
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_fabricator_optimization_evidence(
  UUID, BIGINT, BIGINT, TEXT, BIGINT, TEXT, INTEGER, JSONB
) TO authenticated;

-- ---------------------------------------------------------------------------
-- Convert pose quote → order (fail-closed on evidence + authority + money)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.convert_fabricator_pose_quote_to_order(
  p_project_id UUID,
  p_position_id UUID,
  p_revision BIGINT,
  p_subtotal NUMERIC,
  p_tax_amount NUMERIC,
  p_total_amount NUMERIC,
  p_currency TEXT DEFAULT 'EGP',
  p_tax_rate NUMERIC DEFAULT 0.14,
  p_markup_percent NUMERIC DEFAULT NULL,
  p_line_items JSONB DEFAULT '[]'::JSONB,
  p_quote_payload JSONB DEFAULT '{}'::JSONB,
  p_customer_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
  order_id UUID,
  pose_quote_id UUID,
  reused BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_pos public.fabricator_positions_v2%ROWTYPE;
  v_ev public.fabricator_optimization_evidence%ROWTYPE;
  v_authority_revoked TIMESTAMPTZ;
  v_quote_id UUID;
  v_existing_sub NUMERIC;
  v_existing_tax NUMERIC;
  v_existing_total NUMERIC;
  v_existing_items JSONB;
  v_existing_payload JSONB;
  v_order_id UUID;
  v_order_number TEXT;
  v_notes TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_project_id IS NULL OR p_position_id IS NULL THEN
    RAISE EXCEPTION 'project and position are required';
  END IF;
  IF coalesce(p_revision, 0) <= 0 THEN
    RAISE EXCEPTION 'positive revision required';
  END IF;
  IF p_subtotal IS NULL OR p_tax_amount IS NULL OR p_total_amount IS NULL
     OR p_subtotal < 0 OR p_tax_amount < 0 OR p_total_amount < 0 THEN
    RAISE EXCEPTION 'quote money fields must be finite and non-negative';
  END IF;
  IF abs(p_total_amount - (p_subtotal + p_tax_amount)) > 0.02 THEN
    RAISE EXCEPTION 'quote totals inconsistent (subtotal + tax ≠ total)';
  END IF;

  SELECT * INTO v_pos
  FROM public.fabricator_positions_v2
  WHERE id = p_position_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'position not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_pos.owner_user_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'position owner mismatch' USING ERRCODE = '42501';
  END IF;
  IF v_pos.project_id IS DISTINCT FROM p_project_id THEN
    RAISE EXCEPTION 'project/position mismatch';
  END IF;

  -- Authoritative evidence: separate table only (ignore client optimization JSON).
  SELECT * INTO v_ev
  FROM public.fabricator_optimization_evidence e
  WHERE e.position_id = p_position_id
    AND e.invalidated_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'optimization evidence missing (server validation required)'
      USING ERRCODE = 'P0001';
  END IF;
  IF v_ev.owner_user_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'evidence owner mismatch' USING ERRCODE = '42501';
  END IF;
  IF v_ev.position_revision IS DISTINCT FROM v_pos.qc_revision
     OR v_ev.position_revision IS DISTINCT FROM p_revision THEN
    RAISE EXCEPTION 'stale optimization evidence (revision mismatch)';
  END IF;
  IF v_ev.system_pack_id IS DISTINCT FROM v_pos.system_pack_id THEN
    RAISE EXCEPTION 'optimization evidence system pack mismatch';
  END IF;
  IF v_ev.quantity IS DISTINCT FROM v_pos.quantity THEN
    RAISE EXCEPTION 'optimization evidence quantity mismatch';
  END IF;

  SELECT a.revoked_at INTO v_authority_revoked
  FROM public.fabricator_manufacturing_authority_revisions a
  WHERE a.approval_id = v_ev.authority_approval_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'manufacturing authority missing for evidence';
  END IF;
  IF v_authority_revoked IS NOT NULL THEN
    RAISE EXCEPTION 'manufacturing authority revoked' USING ERRCODE = 'P0001';
  END IF;

  -- Look up existing quote at this revision (no silent money overwrite).
  SELECT q.id, q.subtotal, q.tax_amount, q.total_amount, q.line_items, q.quote_payload
    INTO v_quote_id, v_existing_sub, v_existing_tax, v_existing_total, v_existing_items, v_existing_payload
  FROM public.fabricator_pose_quotes q
  WHERE q.project_id = p_project_id
    AND q.position_id = p_position_id
    AND q.revision = p_revision
  FOR UPDATE;

  IF v_quote_id IS NOT NULL THEN
    IF v_existing_sub IS DISTINCT FROM p_subtotal
       OR v_existing_tax IS DISTINCT FROM p_tax_amount
       OR v_existing_total IS DISTINCT FROM p_total_amount
       OR coalesce(v_existing_items, '[]'::JSONB) IS DISTINCT FROM coalesce(p_line_items, '[]'::JSONB)
       OR coalesce(v_existing_payload, '{}'::JSONB) IS DISTINCT FROM coalesce(p_quote_payload, '{}'::JSONB)
    THEN
      RAISE EXCEPTION 'quote money/payload changed; use a new revision'
        USING ERRCODE = 'P0001';
    END IF;

    SELECT o.id INTO v_order_id
    FROM public.orders o
    WHERE o.fabricator_pose_quote_id = v_quote_id
      AND o.user_id = v_uid
    LIMIT 1;

    IF v_order_id IS NOT NULL THEN
      order_id := v_order_id;
      pose_quote_id := v_quote_id;
      reused := TRUE;
      RETURN NEXT;
      RETURN;
    END IF;
  ELSE
    INSERT INTO public.fabricator_pose_quotes (
      owner_user_id, project_id, position_id, revision, status,
      currency, subtotal, tax_amount, tax_rate, total_amount, markup_percent,
      line_items, quote_payload, updated_at
    ) VALUES (
      v_uid, p_project_id, p_position_id, p_revision, 'accepted',
      coalesce(nullif(trim(p_currency), ''), 'EGP'),
      p_subtotal, p_tax_amount, coalesce(p_tax_rate, 0.14), p_total_amount, p_markup_percent,
      coalesce(p_line_items, '[]'::JSONB),
      coalesce(p_quote_payload, '{}'::JSONB),
      now()
    )
    RETURNING id INTO v_quote_id;
  END IF;

  v_order_number := 'FO-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  v_notes := coalesce(
    nullif(trim(p_customer_notes), ''),
    format('Pose quote %s · project=%s · position=%s · revision=%s', v_quote_id, p_project_id, p_position_id, p_revision)
  );

  INSERT INTO public.orders (
    order_number, user_id, fabricator_pose_quote_id, status,
    subtotal, tax_amount, discount_amount, shipping_cost, total_amount,
    currency, payment_status, billing_address, shipping_address
  ) VALUES (
    v_order_number, v_uid, v_quote_id, 'pending',
    p_subtotal, p_tax_amount, 0, 0, p_total_amount,
    coalesce(nullif(trim(p_currency), ''), 'EGP'),
    'pending',
    jsonb_build_object('notes', v_notes),
    '{}'::JSONB
  )
  RETURNING id INTO v_order_id;

  order_id := v_order_id;
  pose_quote_id := v_quote_id;
  reused := FALSE;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.convert_fabricator_pose_quote_to_order(
  UUID, UUID, BIGINT, NUMERIC, NUMERIC, NUMERIC, TEXT, NUMERIC, NUMERIC, JSONB, JSONB, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.convert_fabricator_pose_quote_to_order(
  UUID, UUID, BIGINT, NUMERIC, NUMERIC, NUMERIC, TEXT, NUMERIC, NUMERIC, JSONB, JSONB, TEXT
) TO authenticated;

COMMENT ON FUNCTION public.convert_fabricator_pose_quote_to_order IS
  '#67 fail-closed convert: requires server-stamped optimization evidence + active authority; idempotent identical retries only.';

COMMIT;
