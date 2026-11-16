-- Machine identity: require persisted plate-area photo evidence for missing-serial registration.
-- Registration-path only; does not alter grandfathered legacy rows.
-- No application security behavior change beyond the evidence gate.
-- Hosted-auth stubs remain gated (never CREATE against hosted auth schema).

CREATE OR REPLACE FUNCTION public.register_machine_identity(
  p_name text,
  p_model text,
  p_serial_raw text DEFAULT NULL,
  p_brand text DEFAULT NULL,
  p_catalog_model_id text DEFAULT NULL,
  p_catalog_uncertain boolean DEFAULT false,
  p_installation_date date DEFAULT NULL,
  p_warranty_valid boolean DEFAULT NULL,
  p_photo_urls text[] DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL,
  p_registration_source text DEFAULT 'web_registration',
  p_site_label text DEFAULT NULL,
  p_missing_serial_reason text DEFAULT NULL,
  p_catalog_link_status text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text := public.machine_actor_role();
  v_canon text;
  v_sep text;
  v_existing public.machines%ROWTYPE;
  v_other public.machines%ROWTYPE;
  v_new public.machines%ROWTYPE;
  v_case_id uuid;
  v_confidence text;
  v_review text := 'clear';
  v_alm text;
  v_payload_fp text;
  v_catalog_status text;
  v_catalog_uncertain boolean;
  v_own_sep_review boolean := false;
  v_foreign_exact boolean := false;
  v_foreign_sep boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  v_canon := public.machine_serial_canonical_v1(p_serial_raw);
  v_sep := public.machine_serial_separator_insensitive_v1(p_serial_raw);
  v_catalog_status := public.machine_resolve_catalog_link_status(
    p_catalog_model_id, p_catalog_uncertain, p_catalog_link_status
  );
  IF v_catalog_status = 'linked' AND nullif(btrim(p_catalog_model_id), '') IS NULL THEN
    RAISE EXCEPTION 'catalog_link_status linked requires catalog_model_id' USING ERRCODE = '22023';
  END IF;
  v_catalog_uncertain := (v_catalog_status = 'uncertain');
  v_payload_fp := md5(concat_ws('|',
    coalesce(p_name, ''), coalesce(p_model, ''), coalesce(v_canon, ''),
    coalesce(p_brand, ''), coalesce(p_catalog_model_id, ''),
    coalesce(v_catalog_status, ''), coalesce(p_idempotency_key, '')
  ));

  -- Idempotency: same actor + key -> same machine; conflicting payload rejected
  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_existing
    FROM public.machines m
    WHERE m.owner_id = v_uid
      AND m.registration_idempotency_key = p_idempotency_key
    LIMIT 1;

    IF FOUND THEN
      IF coalesce(v_existing.serial_canonical, '') IS DISTINCT FROM coalesce(v_canon, '')
         OR coalesce(v_existing.model, '') IS DISTINCT FROM coalesce(p_model, '')
         OR coalesce(v_existing.brand, '') IS DISTINCT FROM coalesce(p_brand, '') THEN
        RAISE EXCEPTION 'Idempotency key reused with conflicting payload' USING ERRCODE = '22023';
      END IF;

      INSERT INTO public.machine_identity_events (
        machine_id, actor_id, actor_role, event_type, provenance,
        after_values, reason, visibility
      ) VALUES (
        v_existing.id, v_uid, v_role, 'idempotent_replay', p_registration_source,
        jsonb_build_object('idempotency_key', p_idempotency_key),
        'concurrent or retried registration',
        'owner_visible'
      );

      RETURN jsonb_build_object(
        'machine_id', v_existing.id,
        'idempotent', true,
        'identity_review_status', v_existing.identity_review_status,
        'identity_confidence', v_existing.identity_confidence,
        'catalog_link_status', v_existing.catalog_link_status,
        'provisional_asset_ref', CASE
          WHEN public.machine_is_staff() THEN v_existing.provisional_asset_ref
          ELSE NULL
        END
      );
    END IF;
  END IF;

  IF v_canon IS NULL THEN
    IF p_missing_serial_reason IS NULL OR btrim(p_missing_serial_reason) = '' THEN
      RAISE EXCEPTION 'missing_serial_reason required when serial is absent' USING ERRCODE = '22023';
    END IF;
    -- Spec 4.2: plate-area photo evidence required for provisional registration.
    -- Gate is registration-path only; grandfathered legacy rows are unaffected.
    IF p_photo_urls IS NULL
       OR coalesce(cardinality(p_photo_urls), 0) = 0
       OR NOT EXISTS (
         SELECT 1
         FROM unnest(p_photo_urls) AS u(url)
         WHERE nullif(btrim(url), '') IS NOT NULL
       ) THEN
      RAISE EXCEPTION 'plate_area_photo_evidence_required when serial is absent'
        USING ERRCODE = '22023';
    END IF;
    v_confidence := 'provisional';
    v_alm := public.machine_allocate_alm_ref();
  ELSE
    v_confidence := 'unchecked';
    v_alm := NULL;
  END IF;

  -- Own exact canonical match -> return same machine (non-conflicting retry without key)
  IF v_canon IS NOT NULL THEN
    SELECT * INTO v_existing
    FROM public.machines m
    WHERE m.owner_id = v_uid
      AND m.serial_canonical = v_canon
      AND coalesce(m.brand, '') = coalesce(p_brand, '')
    ORDER BY m.created_at ASC
    LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'machine_id', v_existing.id,
        'idempotent', true,
        'identity_review_status', v_existing.identity_review_status,
        'identity_confidence', v_existing.identity_confidence,
        'catalog_link_status', v_existing.catalog_link_status,
        'provisional_asset_ref', CASE
          WHEN public.machine_is_staff() THEN v_existing.provisional_asset_ref
          ELSE NULL
        END
      );
    END IF;

    -- Own separator-insensitive advisory (authorized records only) may open local review
    SELECT EXISTS (
      SELECT 1 FROM public.machines m
      WHERE m.owner_id = v_uid
        AND public.machine_serial_separator_insensitive_v1(m.serial_number_raw) = v_sep
        AND m.serial_canonical IS DISTINCT FROM v_canon
        AND coalesce(m.brand, '') = coalesce(p_brand, '')
    ) INTO v_own_sep_review;
    IF v_own_sep_review THEN
      v_review := 'duplicate_review';
    END IF;
  END IF;

  -- Foreign exact / sep-insensitive: staff-only case. Customer-visible review/status
  -- must NOT change in a way that discloses the foreign match.
  IF v_canon IS NOT NULL THEN
    SELECT * INTO v_other
    FROM public.machines m
    WHERE m.serial_canonical = v_canon
      AND coalesce(m.brand, '') = coalesce(p_brand, '')
      AND m.owner_id IS DISTINCT FROM v_uid
    ORDER BY m.created_at ASC
    LIMIT 1;

    IF FOUND THEN
      v_foreign_exact := true;
      INSERT INTO public.machine_duplicate_cases (
        brand, serial_canonical, serial_raw, candidate_machine_id,
        incoming_owner_id, created_by, separator_insensitive_flag
      ) VALUES (
        p_brand, v_canon, p_serial_raw, v_other.id, v_uid, v_uid, false
      ) RETURNING id INTO v_case_id;
    ELSIF v_sep IS NOT NULL THEN
      IF EXISTS (
        SELECT 1 FROM public.machines m
        WHERE public.machine_serial_separator_insensitive_v1(m.serial_number_raw) = v_sep
          AND m.serial_canonical IS DISTINCT FROM v_canon
          AND coalesce(m.brand, '') = coalesce(p_brand, '')
          AND m.owner_id IS DISTINCT FROM v_uid
      ) THEN
        v_foreign_sep := true;
        INSERT INTO public.machine_duplicate_cases (
          brand, serial_canonical, serial_raw, candidate_machine_id,
          incoming_owner_id, created_by, separator_insensitive_flag
        ) VALUES (
          p_brand, v_canon, p_serial_raw, NULL, v_uid, v_uid, true
        ) RETURNING id INTO v_case_id;
      END IF;
    END IF;
  END IF;

  INSERT INTO public.machines (
    name, model, serial_number, serial_number_raw, serial_canonical,
    serial_normalization_version, brand, catalog_model_id, catalog_uncertain,
    catalog_link_status,
    owner_id, installation_date, warranty_valid, photo_urls,
    provisional_asset_ref, identity_lifecycle, identity_review_status,
    identity_confidence, manufacturer_validation_status, legacy_gaps,
    registration_source, registration_idempotency_key, site_label
  ) VALUES (
    coalesce(nullif(btrim(p_name), ''), coalesce(p_model, 'Machine')),
    coalesce(nullif(btrim(p_model), ''), 'unknown'),
    CASE WHEN v_canon IS NULL THEN NULL ELSE btrim(p_serial_raw) END,
    CASE WHEN v_canon IS NULL THEN NULL ELSE btrim(p_serial_raw) END,
    v_canon,
    'v1_retain_separators',
    nullif(btrim(p_brand), ''),
    CASE WHEN v_catalog_status = 'linked' THEN nullif(btrim(p_catalog_model_id), '') ELSE NULL END,
    v_catalog_uncertain,
    v_catalog_status,
    v_uid,
    p_installation_date,
    coalesce(p_warranty_valid, false),
    p_photo_urls,
    v_alm,
    'active',
    v_review,
    v_confidence,
    CASE WHEN v_canon IS NULL THEN 'not_applicable' ELSE 'unchecked' END,
    CASE
      WHEN v_canon IS NULL THEN jsonb_build_array('manufacturer_serial_not_recorded', p_missing_serial_reason)
      WHEN v_catalog_status <> 'linked' THEN jsonb_build_array('catalog_unlinked')
      ELSE '[]'::jsonb
    END,
    p_registration_source,
    p_idempotency_key,
    p_site_label
  )
  RETURNING * INTO v_new;

  -- Owner-visible registration event: no foreign case ids / match indicators
  INSERT INTO public.machine_identity_events (
    machine_id, actor_id, actor_role, event_type, provenance,
    after_values, reason, visibility
  ) VALUES (
    v_new.id, v_uid, v_role, 'registered', p_registration_source,
    jsonb_build_object(
      'identity_confidence', v_new.identity_confidence,
      'identity_review_status', v_new.identity_review_status,
      'catalog_link_status', v_new.catalog_link_status,
      'payload_fp', v_payload_fp
    ),
    p_missing_serial_reason,
    'owner_visible'
  );

  -- Staff-only duplicate-case trail (never customer-visible history)
  IF v_case_id IS NOT NULL THEN
    INSERT INTO public.machine_identity_events (
      machine_id, actor_id, actor_role, event_type, provenance,
      after_values, reason, visibility
    ) VALUES (
      v_new.id, v_uid, v_role, 'duplicate_case_opened', 'duplicate_detection',
      jsonb_build_object(
        'duplicate_case_id', v_case_id,
        'match_kind', CASE
          WHEN v_foreign_exact THEN 'foreign_exact_canonical'
          WHEN v_foreign_sep THEN 'foreign_separator_insensitive'
          ELSE 'unspecified'
        END,
        'separator_insensitive_flag', v_foreign_sep,
        -- candidate id is staff-only; never returned to customers
        'candidate_machine_id', CASE WHEN v_foreign_exact THEN v_other.id ELSE NULL END
      ),
      'Staff review case; customer response unchanged',
      'staff_only'
    );
  END IF;

  -- Customer response depends only on authorized (own) review state.
  -- Foreign matches must not flip needs_staff_review / review status here.
  RETURN jsonb_build_object(
    'machine_id', v_new.id,
    'idempotent', false,
    'identity_review_status', v_new.identity_review_status,
    'identity_confidence', v_new.identity_confidence,
    'catalog_link_status', v_new.catalog_link_status,
    'provisional_asset_ref', CASE
      WHEN public.machine_is_staff() THEN v_new.provisional_asset_ref
      ELSE NULL
    END,
    'needs_staff_review', (v_review = 'duplicate_review' AND v_own_sep_review),
    'message', 'registered'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.register_machine_identity FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_machine_identity TO authenticated;
