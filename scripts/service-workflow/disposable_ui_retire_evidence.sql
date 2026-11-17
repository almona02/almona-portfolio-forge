-- Cursor evidence: local isolated-backend retirement path (not staging).
-- Author → independent review → publish → retire; assert version + parent status;
-- denied control must not look like success.
\set ON_ERROR_STOP on

-- Non-temp: must survive separate psql sessions used by the runner.
CREATE TABLE IF NOT EXISTS public.ra_retire_ev (
  step text PRIMARY KEY,
  ok boolean NOT NULL,
  detail text
);
TRUNCATE public.ra_retire_ev;

CREATE OR REPLACE FUNCTION pg_temp.ev(p_step text, p_ok boolean, p_detail text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.ra_retire_ev(step, ok, detail) VALUES (p_step, p_ok, p_detail)
  ON CONFLICT (step) DO UPDATE SET ok = EXCLUDED.ok, detail = EXCLUDED.detail;
END;
$$;

DO $$
DECLARE
  v_admin1 uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
  v_admin2 uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2';
  v_tech uuid := 'cccccccc-cccc-cccc-cccc-ccccccccccc1';
  v_routine uuid;
  v_version uuid;
  v_code text := 'LA-RET-EV-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISS');
  v_payload jsonb;
  v_created jsonb;
  v_pub jsonb;
  v_ret jsonb;
  v_ver_status text;
  v_routine_status text;
  v_denied boolean := false;
  v_denied_sqlstate text;
BEGIN
  v_payload := jsonb_build_object(
    'sections', jsonb_build_array(
      jsonb_build_object(
        'id', 'safety', 'kind', 'safety', 'title', 'Safety',
        'items', jsonb_build_array(
          jsonb_build_object(
            'id', 'g1', 'type', 'safety_gate', 'requirement_class', 'safety_gate',
            'instruction', 'Lockout', 'evidence', 'none', 'waivable', false
          )
        )
      ),
      jsonb_build_object(
        'id', 'work', 'kind', 'inspection', 'title', 'Work',
        'items', jsonb_build_array(
          jsonb_build_object(
            'id', 'i1', 'type', 'inspection', 'requirement_class', 'required',
            'instruction', 'Inspect', 'evidence', 'none'
          )
        )
      )
    )
  );

  PERFORM set_config('app.b1_uid', v_admin1::text, true);
  v_created := public.create_service_routine_draft(
    v_code, 'Retire evidence', '', 'local evidence', v_payload, ARRAY['saw'], NULL
  );
  v_routine := (v_created ->> 'routine_id')::uuid;
  v_version := (v_created ->> 'version_id')::uuid;
  PERFORM pg_temp.ev('create_draft', v_routine IS NOT NULL AND v_version IS NOT NULL, v_created::text);

  PERFORM public.submit_service_routine_for_review(v_version, NULL);
  PERFORM set_config('app.b1_uid', v_admin2::text, true);
  PERFORM public.record_service_routine_review(v_version, 'Operationally feasible', NULL);

  PERFORM set_config('app.b1_uid', v_admin1::text, true);
  v_pub := public.publish_service_routine_version(v_version, NULL);
  SELECT status INTO v_ver_status FROM public.service_routine_versions WHERE id = v_version;
  SELECT status INTO v_routine_status FROM public.service_routines WHERE id = v_routine;
  PERFORM pg_temp.ev(
    'publish',
    (v_pub ->> 'status') = 'published'
      AND v_ver_status = 'published'
      AND v_routine_status = 'published',
    format('pub=%s ver=%s routine=%s', v_pub::text, v_ver_status, v_routine_status)
  );

  -- Denied control: non-admin retire must fail; state unchanged (exact published)
  PERFORM set_config('app.b1_uid', v_tech::text, true);
  BEGIN
    PERFORM public.retire_service_routine_version(v_version, NULL);
    v_denied := false;
  EXCEPTION WHEN OTHERS THEN
    v_denied := true;
    v_denied_sqlstate := SQLSTATE;
  END;
  SELECT status INTO v_ver_status FROM public.service_routine_versions WHERE id = v_version;
  SELECT status INTO v_routine_status FROM public.service_routines WHERE id = v_routine;
  PERFORM pg_temp.ev(
    'denied_non_admin',
    v_denied AND v_denied_sqlstate = '42501'
      AND v_ver_status = 'published'
      AND v_routine_status = 'published',
    format('denied=%s sqlstate=%s ver=%s routine=%s', v_denied, v_denied_sqlstate, v_ver_status, v_routine_status)
  );

  -- Success retire
  PERFORM set_config('app.b1_uid', v_admin1::text, true);
  v_ret := public.retire_service_routine_version(v_version, NULL);
  SELECT status INTO v_ver_status FROM public.service_routine_versions WHERE id = v_version;
  PERFORM pg_temp.ev(
    'retire_success_version',
    (v_ret ->> 'status') = 'retired' AND v_ver_status = 'retired',
    format('ret=%s ver=%s', v_ret::text, v_ver_status)
  );

  -- Parent status checked separately
  SELECT status INTO v_routine_status FROM public.service_routines WHERE id = v_routine;
  PERFORM pg_temp.ev(
    'retire_success_parent',
    v_routine_status = 'retired',
    format('routine_status=%s', v_routine_status)
  );

  -- Persisted after reload (fresh SELECT)
  SELECT status INTO v_ver_status FROM public.service_routine_versions WHERE id = v_version;
  SELECT status INTO v_routine_status FROM public.service_routines WHERE id = v_routine;
  PERFORM pg_temp.ev(
    'persisted_after_reload',
    v_ver_status = 'retired' AND v_routine_status = 'retired',
    format('ver=%s routine=%s', v_ver_status, v_routine_status)
  );

  PERFORM pg_temp.ev(
    'error_control_not_success',
    (SELECT ok FROM public.ra_retire_ev WHERE step = 'denied_non_admin'),
    'denied control must pass for evidence to be valid'
  );
END;
$$;

SELECT step, ok, detail FROM public.ra_retire_ev ORDER BY step;
SELECT
  count(*) FILTER (WHERE ok) AS passed,
  count(*) FILTER (WHERE NOT ok) AS failed,
  count(*) AS total
FROM public.ra_retire_ev;
