-- #57: Server-side transactional convert pose-quote → order (fail-closed).
-- Requires durable optimized position evidence. Local/staging only — STOP before remote apply.
BEGIN;

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
  v_quote_id UUID;
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

  -- Durable optimization gate (not a client boolean).
  IF v_pos.status IS DISTINCT FROM 'optimized'
     OR v_pos.optimization IS NULL
     OR jsonb_typeof(v_pos.optimization) IS DISTINCT FROM 'object'
     OR v_pos.optimization = '{}'::JSONB THEN
    RAISE EXCEPTION 'optimization not approved on position (durable status required)'
      USING ERRCODE = 'P0001';
  END IF;

  -- Optional stricter bind: when qc_revision is ahead, still allow convert at requested
  -- revision only if it does not exceed current (stale future revisions rejected).
  IF p_revision > v_pos.qc_revision THEN
    RAISE EXCEPTION 'revision % is ahead of position qc_revision %', p_revision, v_pos.qc_revision;
  END IF;

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
  ON CONFLICT (project_id, position_id, revision) DO UPDATE
    SET status = 'accepted',
        currency = EXCLUDED.currency,
        subtotal = EXCLUDED.subtotal,
        tax_amount = EXCLUDED.tax_amount,
        tax_rate = EXCLUDED.tax_rate,
        total_amount = EXCLUDED.total_amount,
        markup_percent = EXCLUDED.markup_percent,
        line_items = EXCLUDED.line_items,
        quote_payload = EXCLUDED.quote_payload,
        updated_at = now()
  RETURNING id INTO v_quote_id;

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
  '#57 fail-closed convert: requires durable optimized position; idempotent per pose quote.';

COMMIT;
