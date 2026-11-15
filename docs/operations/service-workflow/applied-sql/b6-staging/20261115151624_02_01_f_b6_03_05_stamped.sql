-- B6 correction: F-B6-03 / F-B6-04 / F-B6-05 (narrow; no staging apply until Spark PASS).
-- F-B6-03: unavailable only when effective ∈ {NULL, unavailable} (never overwrite accepted/refused).
-- F-B6-04: disposition must bind to the current effective refusal acknowledgment_id.
-- F-B6-05: contact follow-ups must be distinct by (attempted_at, channel).
-- Also: include revision id in named prerequisite details for head-aware UI targeting.
-- #155 frozen; #156 draft; no merge / production.


CREATE OR REPLACE FUNCTION admin_private.validate_unavailable_contact_attempts(p_attempts jsonb)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_elem jsonb;
  v_count int := 0;
  v_notify int := 0;
  v_follow int := 0;
  v_at text;
  v_channel text;
  v_outcome text;
  v_by text;
  v_ts timestamptz;
  v_uid uuid;
  v_key text;
  v_seen text[] := ARRAY[]::text[];
BEGIN
  IF p_attempts IS NULL OR jsonb_typeof(p_attempts) <> 'array' THEN
    RAISE EXCEPTION 'unavailable requires contact_attempts array' USING ERRCODE = '22023';
  END IF;
  FOR v_elem IN SELECT * FROM jsonb_array_elements(p_attempts)
  LOOP
    v_count := v_count + 1;
    v_at := v_elem->>'attempted_at';
    v_channel := nullif(trim(COALESCE(v_elem->>'channel', '')), '');
    v_outcome := nullif(trim(COALESCE(v_elem->>'outcome', '')), '');
    v_by := nullif(trim(COALESCE(v_elem->>'by_actor_id', '')), '');
    IF v_at IS NULL OR v_at = '' THEN
      RAISE EXCEPTION 'contact attempt missing attempted_at' USING ERRCODE = '22023';
    END IF;
    BEGIN
      v_ts := v_at::timestamptz;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'contact attempt attempted_at must be timestamptz' USING ERRCODE = '22023';
    END;
    IF v_channel IS NULL THEN
      RAISE EXCEPTION 'contact attempt missing channel' USING ERRCODE = '22023';
    END IF;
    IF v_outcome IS NULL THEN
      RAISE EXCEPTION 'contact attempt missing outcome' USING ERRCODE = '22023';
    END IF;
    BEGIN
      v_uid := v_by::uuid;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'contact attempt missing attributable by_actor_id' USING ERRCODE = '22023';
    END;
    IF v_uid IS NULL THEN
      RAISE EXCEPTION 'contact attempt missing attributable by_actor_id' USING ERRCODE = '22023';
    END IF;

    -- Distinctness by (attempted_at, channel) — policy F-B6-05 / Q6-11
    v_key := lower(v_channel) || '|' || v_ts::text;
    IF v_key = ANY (v_seen) THEN
      RAISE EXCEPTION 'contact attempts must be distinct by attempted_at and channel'
        USING ERRCODE = 'check_violation';
    END IF;
    v_seen := array_append(v_seen, v_key);

    IF lower(v_channel) IN ('in_app_notification', 'issue_notification', 'notification') THEN
      v_notify := v_notify + 1;
    ELSE
      v_follow := v_follow + 1;
    END IF;
  END LOOP;
  IF v_notify < 1 OR v_follow < 2 OR v_count < 3 THEN
    RAISE EXCEPTION
      'unavailable contact evidence insufficient (need issue notification + two further attributable attempts)'
      USING ERRCODE = 'check_violation';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_service_acknowledgment_unavailable(
  p_issued_revision_id uuid,
  p_contact_attempts jsonb,
  p_rationale text,
  p_actor_id uuid DEFAULT NULL
)
RETURNS public.service_acknowledgments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_actor record;
  v_rev public.service_report_revisions;
  v_ticket_id uuid;
  v_existing public.service_acknowledgments;
  v_row public.service_acknowledgments;
  v_rationale text := nullif(trim(COALESCE(p_rationale, '')), '');
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  IF v_actor.role NOT IN ('admin', 'support') THEN
    RAISE EXCEPTION 'Only admin/support may record unavailable acknowledgment' USING ERRCODE = '42501';
  END IF;
  IF v_rationale IS NULL THEN
    RAISE EXCEPTION 'unavailable requires a rationale' USING ERRCODE = '22023';
  END IF;
  PERFORM admin_private.validate_unavailable_contact_attempts(p_contact_attempts);

  v_rev := admin_private.assert_revision_is_issued(p_issued_revision_id);
  v_ticket_id := admin_private.ticket_id_for_revision(p_issued_revision_id);
  PERFORM pg_advisory_xact_lock(hashtext('b6_ack:' || v_ticket_id::text));
  PERFORM 1 FROM public.service_tickets WHERE id = v_ticket_id FOR UPDATE;

  SELECT * INTO v_existing FROM public.effective_acknowledgment(p_issued_revision_id);

  -- F-B6-03: never overwrite customer accepted/refused with staff unavailable
  IF v_existing.id IS NOT NULL AND v_existing.response NOT IN ('unavailable') THEN
    RAISE EXCEPTION
      'unavailable may only be recorded when acknowledgment is unset or already unavailable (effective=%); will not overwrite accepted/refused',
      v_existing.response
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_existing.id IS NOT NULL
     AND v_existing.response = 'unavailable'
     AND v_existing.responded_by = v_actor.uid
     AND COALESCE(v_existing.comment, '') = v_rationale
     AND v_existing.contact_attempts IS NOT DISTINCT FROM p_contact_attempts
  THEN
    RETURN v_existing;
  END IF;

  INSERT INTO public.service_acknowledgments (
    issued_revision_id, response, comment, responded_by, contact_attempts
  ) VALUES (
    p_issued_revision_id, 'unavailable', v_rationale, v_actor.uid, p_contact_attempts
  ) RETURNING * INTO v_row;

  PERFORM admin_private.workflow_audit(
    v_ticket_id, 'acknowledgment', v_row.id, v_actor.uid, v_actor.role,
    'record_acknowledgment_unavailable', NULL, 'unavailable', v_rationale,
    jsonb_build_object(
      'issued_revision_id', p_issued_revision_id,
      'revision_number', v_rev.revision_number,
      'contact_attempt_count', jsonb_array_length(p_contact_attempts),
      'note', 'unavailable is not acceptance; does not imply return-to-service'
    )
  );
  RETURN v_row;
END;
$$;

