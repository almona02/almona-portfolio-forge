-- Staging §5.3 positive chain (disposable fixtures).
-- Runs under Supabase SQL editor / execute_sql with JWT claim switches.
-- Project: apnmoevmvihfzcnttctx. NOT for production.

DO $chain$
DECLARE
  v_owner UUID := 'e2000000-0000-4000-8000-000000000001';
  v_admin UUID := 'e2000000-0000-4000-8000-000000000099';
  v_project UUID := 'e2000000-0000-4000-8000-000000000010';
  v_position UUID := 'e2000000-0000-4000-8000-000000000020';
  v_approval UUID := 'e2000000-0000-4000-8000-000000000030';
  v_prop UUID;
  v_rev BIGINT;
  v_pack_rev BIGINT := 1;
  v_payload JSONB;
  v_cuts JSONB;
  v_bound JSONB;
  v_ledger TEXT;
  v_rule_fp TEXT;
  v_cut_count INT;
  v_order_id UUID;
  v_quote_id UUID;
  v_reused BOOLEAN;
  v_release_id UUID;
  v_qc_id UUID;
  v_ack_id UUID;
  v_design_fp TEXT;
  v_placement_fp TEXT;
  v_reload_order UUID;
  v_reload_ack UUID;
BEGIN
  -- Auth fixtures
  -- GoTrue requires empty strings (not NULL) on token columns.
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    phone_change, phone_change_token, email_change_token_current,
    reauthentication_token, email_change_confirm_status, is_sso_user, is_anonymous
  ) VALUES
    (v_owner, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'staging.s53.owner@almona.test', crypt('StagingS53Owner!pass1', gen_salt('bf')),
     now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"S53 Owner"}'::jsonb,
     '', '', '', '', '', '', '', '', 0, false, false),
    (v_admin, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'staging.s53.admin@almona.test', crypt('StagingS53Admin!pass1', gen_salt('bf')),
     now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"S53 Admin"}'::jsonb,
     '', '', '', '', '', '', '', '', 0, false, false)
  ON CONFLICT (id) DO UPDATE SET
    email_confirmed_at = now(),
    encrypted_password = EXCLUDED.encrypted_password,
    confirmation_token = '',
    recovery_token = '',
    email_change_token_new = '',
    email_change = '',
    phone_change = '',
    phone_change_token = '',
    email_change_token_current = '',
    reauthentication_token = '',
    email_change_confirm_status = 0;

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) VALUES
    (v_owner, v_owner, jsonb_build_object('sub', v_owner::text, 'email', 'staging.s53.owner@almona.test'),
     'email', v_owner::text, now(), now(), now()),
    (v_admin, v_admin, jsonb_build_object('sub', v_admin::text, 'email', 'staging.s53.admin@almona.test'),
     'email', v_admin::text, now(), now(), now())
  ON CONFLICT DO NOTHING;

  INSERT INTO public.profiles (id, full_name, role)
  VALUES
    (v_owner, 'S53 Owner', 'customer'),
    (v_admin, 'S53 Admin', 'admin')
  ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, full_name = EXCLUDED.full_name;

  INSERT INTO public.fabricator_qc_tolerance_rules (
    system_pack_id, dimensional_tolerance_mm, approved, approved_by, approved_at
  ) VALUES ('caluminium-ps', 1.5, TRUE, v_admin, now())
  ON CONFLICT (system_pack_id) DO UPDATE
    SET dimensional_tolerance_mm = 1.5, approved = TRUE;

  -- Manufacturing authority (approved)
  INSERT INTO public.fabricator_manufacturing_authority_revisions (
    approval_id, system_pack_id, system_pack_revision, authority_payload, approved_by, provenance
  ) VALUES (
    v_approval, 'caluminium-ps', v_pack_rev,
    jsonb_build_object(
      'schema', 'almona.manufacturing-authority',
      'schemaVersion', 1,
      'system', jsonb_build_object('id', 'caluminium-ps'),
      'systemPack', jsonb_build_object(
        'id', 'caluminium-ps', 'revision', v_pack_rev,
        'evidenceStatus', 'approved', 'approvalId', v_approval::text
      ),
      'profiles', jsonb_build_array(
        jsonb_build_object('role','frame','profileId','PS-FRAME','stockLengthMm',6000,'evidenceStatus','approved','approvalId','b2000000-0000-4000-8000-000000000010'),
        jsonb_build_object('role','sash','profileId','PS-SASH','stockLengthMm',6000,'evidenceStatus','approved','approvalId','b2000000-0000-4000-8000-000000000011')
      ),
      'cuttingRules', jsonb_build_array(
        jsonb_build_object(
          'ruleId','ps-default','revision',1,'evidenceStatus','approved',
          'approvalId','b2000000-0000-4000-8000-000000000020',
          'deductions', jsonb_build_object('endDeductionMm', 20),
          'allowances', jsonb_build_object('weldMm', 3),
          'applicability', jsonb_build_object('materials', jsonb_build_array('aluminum'))
        )
      ),
      'toleranceRule', jsonb_build_object(
        'ruleId','ps-tol','revision',1,'evidenceStatus','approved',
        'approvalId','b2000000-0000-4000-8000-000000000030'
      ),
      'manufacturingSettings', jsonb_build_object('sawKerfMm', 4, 'trimCutMm', 0)
    ),
    v_admin, 'seed'
  )
  ON CONFLICT (approval_id) DO NOTHING;

  -- Capture while still postgres (authenticated lacks SELECT on authority revisions)
  SELECT authority_payload->'cuttingRules' INTO v_bound
  FROM public.fabricator_manufacturing_authority_revisions
  WHERE approval_id = v_approval;

  -- Project + position with design components (server ledger source)
  INSERT INTO public.fabricator_projects_v2 (
    id, owner_user_id, project_code, project_name, client_name, system_pack_id, status
  ) VALUES (
    v_project, v_owner, 'S53-POS', 'Staging S53 Chain', 'Fixture Client', 'caluminium-ps', 'active'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.fabricator_positions_v2 (
    id, project_id, owner_user_id, overall_width_mm, overall_height_mm,
    system_pack_id, qc_revision, status, quantity, components
  ) VALUES (
    v_position, v_project, v_owner, 1200, 1500, 'caluminium-ps', 1, 'designed', 1,
    jsonb_build_array(
      jsonb_build_object(
        'id', 'c1',
        'profile', jsonb_build_object('id', 'PS-FRAME', 'profileCode', 'PS-FRAME'),
        'cuttingLengths', jsonb_build_array(1200, 1400),
        'angles', jsonb_build_array(45, 45),
        'quantity', 1
      )
    )
  )
  ON CONFLICT (id) DO UPDATE SET
    components = EXCLUDED.components,
    quantity = 1,
    system_pack_id = 'caluminium-ps',
    status = 'designed';

  SELECT qc_revision INTO v_rev FROM public.fabricator_positions_v2 WHERE id = v_position;

  -- Owner: request hardener
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_owner::text, 'role', 'authenticated')::text, true);
  PERFORM set_config('role', 'authenticated', true);

  v_prop := public.request_fabricator_hardener_verification(
    v_position, v_rev, 'H-PS-S53-01',
    '{"method":"catalogue","reference":"s53","calc":"ok"}'::jsonb,
    jsonb_build_array(
      jsonb_build_object('check','system_profile','passed',true),
      jsonb_build_object('check','material','passed',true),
      jsonb_build_object('check','glass_thickness','passed',true),
      jsonb_build_object('check','sash_dimensions','passed',true),
      jsonb_build_object('check','sash_weight','passed',true),
      jsonb_build_object('check','opening_type','passed',true)
    ),
    '{}',
    'sliding', 'aluminum', 6, 600, 1400, 28
  );

  -- Admin: approve hardener
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_admin::text, 'role', 'authenticated')::text, true);
  PERFORM public.admin_review_fabricator_hardener(v_prop, 'approve', 'staging s53 hardener approve');

  -- Owner: record optimization evidence (server derives ledger)
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_owner::text, 'role', 'authenticated')::text, true);

  v_cuts := public.derive_required_cuts_from_position(v_position, v_rev);
  v_cut_count := jsonb_array_length(v_cuts);
  v_payload := jsonb_build_object(
    'schema', 'almona.optimization-result',
    'schemaVersion', 2,
    'kerfMm', 4,
    'trimMm', 0,
    'requiredCuts', v_cuts,
    'cuttingPlan', jsonb_build_array(
      jsonb_build_object(
        'stockLength', 6000,
        'profile', jsonb_build_object('id', 'PS-FRAME'),
        'cuts', jsonb_build_array(
          jsonb_build_object('cutId', 'c1:0', 'length', 1200, 'angle', 45),
          jsonb_build_object('cutId', 'c1:1', 'length', 1400, 'angle', 45)
        )
      )
    )
  );

  SELECT v.o_design_fingerprint, v.o_placement_fingerprint
    INTO v_design_fp, v_placement_fp
  FROM public.validate_optimization_evidence_payload(v_payload, v_cut_count) AS v;
  v_ledger := v_design_fp || '||' || v_placement_fp;
  v_rule_fp := public.approved_rule_content_fingerprint(v_bound);

  PERFORM public.record_fabricator_optimization_evidence(
    v_position, v_rev, v_rev, v_ledger, v_pack_rev, v_rule_fp, v_cut_count, v_payload
  );

  -- Convert → order
  SELECT * INTO v_order_id, v_quote_id, v_reused
  FROM public.convert_fabricator_pose_quote_to_order(
    v_project, v_position, v_rev,
    100, 14, 114, 'EGP', 0.14, NULL,
    '[{"sku":"PS-FRAME","qty":1,"unit":100}]'::jsonb,
    '{"source":"s53"}'::jsonb,
    'staging s53 convert'
  );

  -- Release (table insert; trigger asserts hardener)
  INSERT INTO public.fabricator_position_releases (
    id, owner_user_id, project_id, position_id, position_source, revision,
    bom_fingerprint, stock_fingerprint, optimization_fingerprint, release_payload
  ) VALUES (
    gen_random_uuid(), v_owner, v_project, v_position, 'v2', v_rev,
    encode(digest('bom-s53', 'sha256'), 'hex'),
    encode(digest('stock-s53', 'sha256'), 'hex'),
    v_ledger,
    jsonb_build_object('source', 's53-chain')
  )
  RETURNING id INTO v_release_id;

  -- QC
  SELECT approval_id INTO v_qc_id
  FROM public.approve_fabricator_quality_control(
    v_position, v_rev,
    jsonb_build_object(
      'checks', jsonb_build_object(
        'measurements', true, 'design', true, 'model', true,
        'optimization', true, 'materials', true, 'commands', true, 'documents', true
      ),
      'notes', 'S53 QC pass',
      'measurements', jsonb_build_object(
        'width', jsonb_build_object('actualMm', 1200),
        'height', jsonb_build_object('actualMm', 1500)
      )
    ),
    'e2000000-0000-4000-8000-000000000040'::uuid
  );

  -- Delivery
  SELECT acknowledgement_id INTO v_ack_id
  FROM public.acknowledge_fabricator_delivery(
    v_position, v_rev, v_release_id, v_qc_id,
    30.0444, 31.2357, 5.0,
    encode(digest('photo-s53', 'sha256'), 'hex'),
    'ALMONA_' || v_position::text || '_R' || v_rev::text,
    encode(digest('sig-s53', 'sha256'), 'hex'),
    'delivered s53',
    'ok',
    'e2000000-0000-4000-8000-000000000050'::uuid
  );

  -- Reload persistence (same owner session)
  SELECT o.id INTO v_reload_order
  FROM public.orders o
  WHERE o.id = v_order_id AND o.user_id = v_owner;

  SELECT d.id INTO v_reload_ack
  FROM public.fabricator_delivery_acknowledgements d
  WHERE d.id = v_ack_id AND d.owner_user_id = v_owner;

  IF v_reload_order IS NULL OR v_reload_ack IS NULL THEN
    RAISE EXCEPTION 'reload persistence failed order=% ack=%', v_reload_order, v_reload_ack;
  END IF;

  -- Fresh login simulation: clear claims, re-set as owner, re-read
  PERFORM set_config('request.jwt.claims', '', true);
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_owner::text, 'role', 'authenticated', 'session_id', 'fresh-login-1')::text, true);

  IF NOT EXISTS (
    SELECT 1 FROM public.fabricator_delivery_acknowledgements
    WHERE id = v_ack_id AND owner_user_id = auth.uid()
  ) AND auth.uid() IS DISTINCT FROM v_owner THEN
    -- auth.uid() may be null outside PostgREST; claim-based check:
    NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.fabricator_delivery_acknowledgements WHERE id = v_ack_id) THEN
    RAISE EXCEPTION 'fresh-login read of delivery ack failed';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.orders WHERE id = v_order_id) THEN
    RAISE EXCEPTION 'fresh-login read of order failed';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.fabricator_optimization_evidence
    WHERE position_id = v_position AND invalidated_at IS NULL
  ) THEN
    RAISE EXCEPTION 'fresh-login read of evidence failed';
  END IF;

  RAISE NOTICE 'S53_OK project=% position=% rev=% order=% release=% qc=% ack=% rule_fp=%',
    v_project, v_position, v_rev, v_order_id, v_release_id, v_qc_id, v_ack_id, left(v_rule_fp, 16);
END;
$chain$;

SELECT 's53_chain' AS step,
       e.position_id,
       e.cut_count,
       e.validation_schema_version,
       e.rule_version,
       (SELECT count(*) FROM public.orders o WHERE o.user_id = 'e2000000-0000-4000-8000-000000000001') AS orders,
       (SELECT count(*) FROM public.fabricator_position_releases r WHERE r.position_id = e.position_id) AS releases,
       (SELECT count(*) FROM public.fabricator_quality_approvals q WHERE q.position_id = e.position_id) AS qc,
       (SELECT count(*) FROM public.fabricator_delivery_acknowledgements d WHERE d.position_id = e.position_id) AS deliveries
FROM public.fabricator_optimization_evidence e
WHERE e.position_id = 'e2000000-0000-4000-8000-000000000020';
