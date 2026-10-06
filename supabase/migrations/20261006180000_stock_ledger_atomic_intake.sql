-- PR1: authoritative metre ledger, opening preservation, hardened stock RPCs,
-- and owner-scoped atomic/idempotent stock intake.
-- Matches deployed almona02 schema (stock_quantity, user_id, meters/pieces/kg,
-- stock_before/after NOT NULL, idempotency_key unique per user).

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Ledger metadata + stock version
-- ---------------------------------------------------------------------------

ALTER TABLE public.fabricator_profiles
  ADD COLUMN IF NOT EXISTS stock_version BIGINT NOT NULL DEFAULT 0;

ALTER TABLE public.stock_movements
  ADD COLUMN IF NOT EXISTS canonical_metres NUMERIC(12, 4),
  ADD COLUMN IF NOT EXISTS input_unit TEXT,
  ADD COLUMN IF NOT EXISTS bar_count NUMERIC(12, 4),
  ADD COLUMN IF NOT EXISTS bar_length_m NUMERIC(12, 4),
  ADD COLUMN IF NOT EXISTS lot_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.stock_movements.canonical_metres IS
  'Authoritative metre delta for linear profile balances. NULL for non-convertible units pending review.';
COMMENT ON COLUMN public.stock_movements.input_unit IS
  'Original intake unit (meters|pieces|kg) before canonical conversion.';
COMMENT ON COLUMN public.fabricator_profiles.stock_version IS
  'Monotonic version bumped on authoritative balance writes; used to invalidate soft acknowledgements.';

-- Backfill canonical metres for existing meters-only rows (no guessed piece/kg conversion).
UPDATE public.stock_movements
SET
  canonical_metres = quantity,
  input_unit = COALESCE(input_unit, unit, 'meters')
WHERE unit = 'meters'
  AND canonical_metres IS NULL;

-- ---------------------------------------------------------------------------
-- 2. Ambiguous legacy review report (pieces/kg without canonical metres)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.stock_unit_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_id UUID NOT NULL REFERENCES public.stock_movements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.fabricator_profiles(id) ON DELETE CASCADE,
  unit TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  notes TEXT,
  reason TEXT NOT NULL DEFAULT 'ambiguous_unit_no_validated_conversion',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  UNIQUE (movement_id)
);

ALTER TABLE public.stock_unit_review_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS stock_unit_review_queue_select_own ON public.stock_unit_review_queue;
CREATE POLICY stock_unit_review_queue_select_own
  ON public.stock_unit_review_queue
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

INSERT INTO public.stock_unit_review_queue (movement_id, user_id, profile_id, unit, quantity, notes, reason)
SELECT sm.id, sm.user_id, sm.profile_id, COALESCE(sm.unit, '<null>'), sm.quantity, sm.notes,
       'ambiguous_unit_no_validated_conversion'
FROM public.stock_movements sm
WHERE sm.canonical_metres IS NULL
  AND COALESCE(sm.unit, '') IN ('pieces', 'kg')
ON CONFLICT (movement_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Opening ledger — profiles with balance and no movements only
--     Idempotent via per-profile idempotency_key. Never invent openings when
--     movements already exist.
-- ---------------------------------------------------------------------------

-- Partial unique index (user_id, idempotency_key) + NOT EXISTS guards make reruns safe.
INSERT INTO public.stock_movements (
  user_id, profile_id, movement_type, quantity, unit,
  stock_before, stock_after, notes, reason, created_by, idempotency_key,
  canonical_metres, input_unit, lot_metadata
)
SELECT
  fp.user_id, fp.id, 'in', fp.stock_quantity, 'meters',
  0, fp.stock_quantity,
  '[opening_balance] Preserved recorded balance with no prior ledger movements.',
  'opening_balance', fp.user_id, 'opening_ledger:' || fp.id::text,
  fp.stock_quantity, 'meters',
  jsonb_build_object('source', 'opening_ledger_migration', 'migration', '20261006180000_stock_ledger_atomic_intake')
FROM public.fabricator_profiles fp
WHERE COALESCE(fp.stock_quantity, 0) <> 0
  AND NOT EXISTS (SELECT 1 FROM public.stock_movements sm WHERE sm.profile_id = fp.id)
  AND NOT EXISTS (
    SELECT 1 FROM public.stock_movements sm2
    WHERE sm2.user_id = fp.user_id
      AND sm2.idempotency_key = 'opening_ledger:' || fp.id::text
  );

-- ---------------------------------------------------------------------------
-- 4. Intake request registry (request UUID + payload hash)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.stock_intake_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_id UUID NOT NULL,
  payload_hash TEXT NOT NULL,
  receipt JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, request_id)
);

CREATE INDEX IF NOT EXISTS idx_stock_intake_requests_user_created
  ON public.stock_intake_requests (user_id, created_at DESC);

ALTER TABLE public.stock_intake_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS stock_intake_requests_select_own ON public.stock_intake_requests;
CREATE POLICY stock_intake_requests_select_own
  ON public.stock_intake_requests
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- 5. Authoritative balance calculation (metres only; transfer is location-only)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.calculate_stock_from_movements(
  p_user_id UUID,
  p_profile_id UUID
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_stock NUMERIC(12, 4) := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_user_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'Forbidden: cannot calculate stock for another user' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(
    SUM(
      CASE
        WHEN movement_type IN ('in', 'return') THEN
          COALESCE(canonical_metres, CASE WHEN unit = 'meters' THEN quantity ELSE NULL END)
        WHEN movement_type IN ('out', 'production', 'remnant_used', 'damage', 'loss') THEN
          -COALESCE(canonical_metres, CASE WHEN unit = 'meters' THEN quantity ELSE NULL END)
        WHEN movement_type = 'adjustment' THEN
          (stock_after - stock_before)
        -- transfer: location change only; must not inflate workshop-wide total
        WHEN movement_type = 'transfer' THEN 0
        ELSE 0
      END
    ),
    0
  )
  INTO v_stock
  FROM public.stock_movements
  WHERE user_id = p_user_id
    AND profile_id = p_profile_id;

  RETURN GREATEST(COALESCE(v_stock, 0), 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_stock_from_movements(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_profile RECORD;
  v_calculated_stock NUMERIC(12, 4);
  v_updated_count INTEGER := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_user_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'Forbidden: cannot sync stock for another user' USING ERRCODE = '42501';
  END IF;

  FOR v_profile IN
    SELECT DISTINCT sm.profile_id
    FROM public.stock_movements sm
    WHERE sm.user_id = p_user_id
    ORDER BY sm.profile_id
  LOOP
    v_calculated_stock := public.calculate_stock_from_movements(p_user_id, v_profile.profile_id);

    UPDATE public.fabricator_profiles fp
    SET
      stock_quantity = v_calculated_stock,
      stock_version = CASE
        WHEN fp.stock_quantity IS DISTINCT FROM v_calculated_stock THEN fp.stock_version + 1
        ELSE fp.stock_version
      END,
      updated_at = NOW()
    WHERE fp.id = v_profile.profile_id
      AND fp.user_id = p_user_id;

    IF FOUND THEN
      v_updated_count := v_updated_count + 1;
    END IF;
  END LOOP;

  RETURN v_updated_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_stock_levels(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_profile RECORD;
  v_alert_count INTEGER := 0;
  v_alert_type TEXT;
  v_severity TEXT;
  v_reorder_qty NUMERIC;
  v_resolved_count INTEGER := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_user_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'Forbidden: cannot check stock levels for another user' USING ERRCODE = '42501';
  END IF;

  FOR v_profile IN
    SELECT
      fp.id,
      fp.stock_quantity,
      fp.min_stock_level,
      COUNT(DISTINCT mr.id) FILTER (WHERE mr.status = 'available') AS remnant_count,
      COALESCE(SUM(mr.length) FILTER (WHERE mr.status = 'available'), 0) AS remnant_length
    FROM public.fabricator_profiles fp
    LEFT JOIN public.material_remnants mr
      ON mr.profile_id = fp.id AND mr.user_id = fp.user_id
    WHERE fp.user_id = p_user_id
    GROUP BY fp.id, fp.stock_quantity, fp.min_stock_level
  LOOP
    IF v_profile.stock_quantity > v_profile.min_stock_level AND v_profile.stock_quantity > 0 THEN
      UPDATE public.stock_alerts
      SET is_resolved = TRUE,
          resolved_at = NOW(),
          resolved_by = p_user_id
      WHERE user_id = p_user_id
        AND profile_id = v_profile.id
        AND is_resolved = FALSE
        AND alert_type IN ('low_stock', 'out_of_stock');
      GET DIAGNOSTICS v_resolved_count = ROW_COUNT;
      CONTINUE;
    END IF;

    IF v_profile.stock_quantity <= 0 THEN
      v_alert_type := 'out_of_stock';
      v_severity := 'critical';
      v_reorder_qty := GREATEST(v_profile.min_stock_level * 2, 100);
    ELSIF v_profile.stock_quantity <= v_profile.min_stock_level THEN
      v_alert_type := 'low_stock';
      v_severity := CASE
        WHEN v_profile.stock_quantity <= v_profile.min_stock_level * 0.5 THEN 'high'
        ELSE 'medium'
      END;
      v_reorder_qty := v_profile.min_stock_level * 2 - v_profile.stock_quantity;
    ELSE
      CONTINUE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.stock_alerts
      WHERE user_id = p_user_id
        AND profile_id = v_profile.id
        AND alert_type = v_alert_type
        AND is_resolved = FALSE
    ) THEN
      INSERT INTO public.stock_alerts (
        user_id, profile_id, alert_type, severity,
        threshold_value, current_value, reorder_quantity, reorder_priority,
        message
      ) VALUES (
        p_user_id, v_profile.id, v_alert_type, v_severity,
        v_profile.min_stock_level, v_profile.stock_quantity, v_reorder_qty,
        CASE v_severity
          WHEN 'critical' THEN 'urgent'
          WHEN 'high' THEN 'high'
          ELSE 'medium'
        END,
        CASE v_alert_type
          WHEN 'out_of_stock' THEN 'Profile is out of stock. Immediate reorder required.'
          ELSE 'Stock level is below minimum threshold.'
        END
      );
      v_alert_count := v_alert_count + 1;
    ELSE
      UPDATE public.stock_alerts
      SET current_value = v_profile.stock_quantity,
          reorder_quantity = v_reorder_qty,
          severity = v_severity,
          is_resolved = FALSE,
          resolved_at = NULL,
          resolved_by = NULL
      WHERE user_id = p_user_id
        AND profile_id = v_profile.id
        AND alert_type = v_alert_type
        AND is_resolved = FALSE;
    END IF;
  END LOOP;

  RETURN v_alert_count;
END;
$$;

REVOKE ALL ON FUNCTION public.calculate_stock_from_movements(UUID, UUID)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sync_stock_from_movements(UUID)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.check_stock_levels(UUID)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.calculate_stock_from_movements(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_stock_from_movements(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_stock_levels(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. Atomic owner-scoped intake RPC
--    p_lines JSON array of validated intake lines. See stockIntake.ts.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.record_stock_intake(
  p_request_id UUID,
  p_payload_hash TEXT,
  p_lines JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_existing public.stock_intake_requests%ROWTYPE;
  v_line JSONB;
  v_profile_ids UUID[] := ARRAY[]::UUID[];
  v_lock_id UUID;
  v_profile public.fabricator_profiles%ROWTYPE;
  v_profile_id UUID;
  v_input_unit TEXT;
  v_qty NUMERIC;
  v_bar_count NUMERIC;
  v_bar_length_m NUMERIC;
  v_canonical NUMERIC;
  v_notes TEXT;
  v_stock_before NUMERIC;
  v_stock_after NUMERIC;
  v_movement_id UUID;
  v_movement_ids UUID[] := ARRAY[]::UUID[];
  v_balances JSONB := '[]'::jsonb;
  v_receipt JSONB;
  v_line_index INTEGER := 0;
  v_create BOOLEAN;
  v_catalogue_key TEXT;
  v_pack TEXT;
  v_material TEXT;
  v_finish TEXT;
  v_name TEXT;
  v_idempotency TEXT;
  v_lot JSONB;
  v_new_version BIGINT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_request_id IS NULL THEN
    RAISE EXCEPTION 'request_id is required';
  END IF;
  IF p_payload_hash IS NULL OR length(trim(p_payload_hash)) < 8 THEN
    RAISE EXCEPTION 'payload_hash is required';
  END IF;
  IF p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'At least one intake line is required';
  END IF;

  SELECT * INTO v_existing
  FROM public.stock_intake_requests
  WHERE user_id = v_uid AND request_id = p_request_id;

  IF FOUND THEN
    IF v_existing.payload_hash IS DISTINCT FROM p_payload_hash THEN
      RAISE EXCEPTION 'Stock intake request payload does not match the original request'
        USING ERRCODE = '22023';
    END IF;
    RETURN v_existing.receipt || jsonb_build_object('replay', true);
  END IF;

  -- Serialize concurrent attempts for the same request identity.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_uid::text || ':' || p_request_id::text, 0)
  );

  SELECT * INTO v_existing
  FROM public.stock_intake_requests
  WHERE user_id = v_uid AND request_id = p_request_id;

  IF FOUND THEN
    IF v_existing.payload_hash IS DISTINCT FROM p_payload_hash THEN
      RAISE EXCEPTION 'Stock intake request payload does not match the original request'
        USING ERRCODE = '22023';
    END IF;
    RETURN v_existing.receipt || jsonb_build_object('replay', true);
  END IF;

  -- Validate all lines and collect profile ids before any write.
  FOR v_line IN SELECT value FROM jsonb_array_elements(p_lines)
  LOOP
    v_line_index := v_line_index + 1;
    v_input_unit := lower(COALESCE(v_line->>'input_unit', v_line->>'unit', ''));
    v_qty := NULLIF(v_line->>'quantity', '')::NUMERIC;
    v_bar_length_m := NULLIF(v_line->>'bar_length_m', '')::NUMERIC;
    v_create := COALESCE((v_line->>'create_if_missing')::BOOLEAN, false);
    v_profile_id := NULLIF(v_line->>'profile_id', '')::UUID;

    IF v_qty IS NULL OR v_qty <= 0 OR v_qty <> v_qty THEN
      RAISE EXCEPTION 'Line %: quantity must be a finite positive number', v_line_index;
    END IF;

    IF v_input_unit NOT IN ('meters', 'pieces') THEN
      RAISE EXCEPTION 'Line %: unsupported unit % (kg requires validated conversion)', v_line_index, v_input_unit;
    END IF;

    IF v_input_unit = 'pieces' THEN
      IF v_bar_length_m IS NULL OR v_bar_length_m <= 0 THEN
        RAISE EXCEPTION 'Line %: pieces intake requires positive bar_length_m', v_line_index;
      END IF;
    END IF;

    IF v_profile_id IS NULL AND NOT v_create THEN
      RAISE EXCEPTION 'Line %: profile_id required unless create_if_missing', v_line_index;
    END IF;

    IF v_profile_id IS NOT NULL THEN
      v_profile_ids := array_append(v_profile_ids, v_profile_id);
    END IF;
  END LOOP;

  -- Deterministic lock order for existing profiles.
  FOR v_lock_id IN
    SELECT DISTINCT unnest(v_profile_ids) AS id ORDER BY 1
  LOOP
    SELECT * INTO v_profile
    FROM public.fabricator_profiles
    WHERE id = v_lock_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Unknown profile %', v_lock_id USING ERRCODE = '23503';
    END IF;
    IF v_profile.user_id IS DISTINCT FROM v_uid THEN
      RAISE EXCEPTION 'Forbidden: profile % is not owned by the caller', v_lock_id
        USING ERRCODE = '42501';
    END IF;
  END LOOP;

  -- Apply lines in array order (after locks held).
  v_line_index := 0;
  FOR v_line IN SELECT value FROM jsonb_array_elements(p_lines)
  LOOP
    v_line_index := v_line_index + 1;
    v_input_unit := lower(COALESCE(v_line->>'input_unit', v_line->>'unit', ''));
    v_qty := (v_line->>'quantity')::NUMERIC;
    v_bar_length_m := NULLIF(v_line->>'bar_length_m', '')::NUMERIC;
    v_notes := NULLIF(v_line->>'notes', '');
    v_create := COALESCE((v_line->>'create_if_missing')::BOOLEAN, false);
    v_profile_id := NULLIF(v_line->>'profile_id', '')::UUID;
    v_catalogue_key := NULLIF(v_line->>'catalogue_key', '');
    v_pack := COALESCE(v_line->>'pack', '');
    v_material := COALESCE(NULLIF(v_line->>'material', ''), 'aluminum');
    v_finish := COALESCE(v_line->>'finish', '');
    v_name := COALESCE(NULLIF(v_line->>'profile_name', ''), v_catalogue_key, 'Purchased profile');
    v_lot := COALESCE(v_line->'lot_metadata', '{}'::jsonb);

    IF v_profile_id IS NULL AND v_create THEN
      -- Resolve by stable catalogue key + pack + material + finish (not display name alone).
      SELECT fp.id INTO v_profile_id
      FROM public.fabricator_profiles fp
      WHERE fp.user_id = v_uid
        AND COALESCE(fp.specifications->>'supplierCode', '') = COALESCE(v_catalogue_key, '')
        AND COALESCE(fp.specifications->>'systemPackId', '') = v_pack
        AND lower(fp.material) = lower(v_material)
        AND COALESCE(fp.specifications->>'finish', fp.color, '') = v_finish
      ORDER BY fp.created_at ASC
      LIMIT 1
      FOR UPDATE;

      IF v_profile_id IS NULL THEN
        INSERT INTO public.fabricator_profiles (
          user_id, name, material, width, height, thickness, color,
          cost_per_meter, stock_quantity, min_stock_level, supplier, system_brand,
          specifications, stock_version
        ) VALUES (
          v_uid,
          v_name,
          v_material,
          COALESCE(NULLIF(v_line->>'width', '')::NUMERIC, 50),
          COALESCE(NULLIF(v_line->>'height', '')::NUMERIC, 50),
          COALESCE(NULLIF(v_line->>'thickness', '')::NUMERIC, 1.5),
          NULLIF(v_finish, ''),
          COALESCE(NULLIF(v_line->>'cost_per_meter', '')::NUMERIC, 0),
          0,
          COALESCE(NULLIF(v_line->>'min_stock_level', '')::NUMERIC, 10),
          NULLIF(v_line->>'supplier', ''),
          NULLIF(v_line->>'system_brand', ''),
          COALESCE(v_line->'specifications', '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
            'supplierCode', v_catalogue_key,
            'systemPackId', NULLIF(v_pack, ''),
            'finish', NULLIF(v_finish, '')
          )),
          0
        )
        RETURNING id INTO v_profile_id;

        SELECT * INTO v_profile
        FROM public.fabricator_profiles
        WHERE id = v_profile_id
        FOR UPDATE;
      ELSE
        SELECT * INTO v_profile
        FROM public.fabricator_profiles
        WHERE id = v_profile_id
        FOR UPDATE;
      END IF;
    ELSE
      SELECT * INTO v_profile
      FROM public.fabricator_profiles
      WHERE id = v_profile_id
      FOR UPDATE;

      IF NOT FOUND OR v_profile.user_id IS DISTINCT FROM v_uid THEN
        RAISE EXCEPTION 'Forbidden or missing profile on line %', v_line_index
          USING ERRCODE = '42501';
      END IF;
    END IF;

    IF v_input_unit = 'meters' THEN
      v_canonical := v_qty;
      v_bar_count := NULL;
      v_bar_length_m := NULL;
    ELSE
      v_bar_count := v_qty;
      v_canonical := round(v_qty * v_bar_length_m, 4);
    END IF;

    IF v_canonical IS NULL OR v_canonical <= 0 THEN
      RAISE EXCEPTION 'Line %: canonical metres must be positive', v_line_index;
    END IF;

    v_stock_before := COALESCE(v_profile.stock_quantity, 0);
    v_stock_after := v_stock_before + v_canonical;
    v_idempotency := p_request_id::text || ':' || v_line_index::text;

    INSERT INTO public.stock_movements (
      user_id, profile_id, movement_type, quantity, unit,
      stock_before, stock_after, notes, reason, created_by, idempotency_key,
      canonical_metres, input_unit, bar_count, bar_length_m, lot_metadata,
      reference_number
    ) VALUES (
      v_uid,
      v_profile.id,
      'in',
      CASE WHEN v_input_unit = 'meters' THEN v_canonical ELSE v_bar_count END,
      CASE WHEN v_input_unit = 'meters' THEN 'meters' ELSE 'pieces' END,
      v_stock_before,
      v_stock_after,
      v_notes,
      'stock_intake',
      v_uid,
      v_idempotency,
      v_canonical,
      v_input_unit,
      v_bar_count,
      v_bar_length_m,
      v_lot || jsonb_build_object(
        'request_id', p_request_id,
        'payload_hash', p_payload_hash,
        'line_index', v_line_index,
        'invoice', v_line->>'invoice',
        'supplier', v_line->>'supplier'
      ),
      NULLIF(v_line->>'invoice', '')
    )
    RETURNING id INTO v_movement_id;

    UPDATE public.fabricator_profiles
    SET
      stock_quantity = v_stock_after,
      stock_version = stock_version + 1,
      updated_at = NOW()
    WHERE id = v_profile.id
      AND user_id = v_uid
    RETURNING stock_quantity, stock_version INTO v_stock_after, v_new_version;

    v_movement_ids := array_append(v_movement_ids, v_movement_id);
    v_balances := v_balances || jsonb_build_array(jsonb_build_object(
      'profile_id', v_profile.id,
      'stock_quantity', v_stock_after,
      'stock_version', v_new_version,
      'canonical_metres_added', v_canonical
    ));
  END LOOP;

  v_receipt := jsonb_build_object(
    'request_id', p_request_id,
    'payload_hash', p_payload_hash,
    'replay', false,
    'movement_ids', to_jsonb(v_movement_ids),
    'balances', v_balances,
    'movement_count', coalesce(array_length(v_movement_ids, 1), 0)
  );

  INSERT INTO public.stock_intake_requests (user_id, request_id, payload_hash, receipt)
  VALUES (v_uid, p_request_id, p_payload_hash, v_receipt);

  RETURN v_receipt;
END;
$$;

REVOKE ALL ON FUNCTION public.record_stock_intake(UUID, TEXT, JSONB)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_stock_intake(UUID, TEXT, JSONB) TO authenticated;

COMMENT ON FUNCTION public.record_stock_intake(UUID, TEXT, JSONB) IS
  'Owner-scoped atomic stock intake. Same request_id+hash returns original receipt; changed hash rejects. Locks profiles in id order.';

COMMIT;
