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

-- ---------------------------------------------------------------------------
-- 5) Manager disposition for refusal
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_acknowledgment_disposition(
  p_issued_revision_id uuid,
  p_disposition text,
  p_rationale text,
  p_actor_id uuid DEFAULT NULL
)
RETURNS public.service_acknowledgment_dispositions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_actor record;
  v_ack public.service_acknowledgments;
  v_ticket_id uuid;
  v_existing public.service_acknowledgment_dispositions;
  v_row public.service_acknowledgment_dispositions;
  v_rationale text := nullif(trim(COALESCE(p_rationale, '')), '');
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  IF v_actor.role NOT IN ('admin', 'support') THEN
    RAISE EXCEPTION 'Only admin/support may record acknowledgment disposition' USING ERRCODE = '42501';
  END IF;
  IF p_disposition IS NULL OR p_disposition NOT IN ('accept_refusal_and_proceed', 'create_follow_up') THEN
    RAISE EXCEPTION 'Invalid disposition' USING ERRCODE = '22023';
  END IF;
  IF v_rationale IS NULL THEN
    RAISE EXCEPTION 'Disposition requires a rationale' USING ERRCODE = '22023';
  END IF;

  PERFORM admin_private.assert_revision_is_issued(p_issued_revision_id);
  v_ticket_id := admin_private.ticket_id_for_revision(p_issued_revision_id);
  PERFORM pg_advisory_xact_lock(hashtext('b6_ack:' || v_ticket_id::text));
  PERFORM 1 FROM public.service_tickets WHERE id = v_ticket_id FOR UPDATE;

  SELECT * INTO v_ack FROM public.effective_acknowledgment(p_issued_revision_id);
  IF v_ack.id IS NULL OR v_ack.response <> 'refused' THEN
    RAISE EXCEPTION 'Disposition requires effective acknowledgment response=refused'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT * INTO v_existing FROM public.effective_acknowledgment_disposition(p_issued_revision_id);
  IF v_existing.id IS NOT NULL
     AND v_existing.disposition = p_disposition
     AND v_existing.decided_by = v_actor.uid
     AND v_existing.rationale = v_rationale
     AND v_existing.acknowledgment_id = v_ack.id
  THEN
    RETURN v_existing;
  END IF;

  INSERT INTO public.service_acknowledgment_dispositions (
    issued_revision_id, acknowledgment_id, disposition, rationale, decided_by
  ) VALUES (
    p_issued_revision_id, v_ack.id, p_disposition, v_rationale, v_actor.uid
  ) RETURNING * INTO v_row;

  PERFORM admin_private.workflow_audit(
    v_ticket_id, 'acknowledgment_disposition', v_row.id, v_actor.uid, v_actor.role,
    'record_acknowledgment_disposition', 'refused', p_disposition, v_rationale,
    jsonb_build_object(
      'issued_revision_id', p_issued_revision_id,
      'acknowledgment_id', v_ack.id,
      'note', 'Disposition does not convert refusal into acceptance'
    )
  );
  RETURN v_row;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6) Prerequisites: replace B1 acknowledgment stub; add completing-report +
--    resolution summary checks
-- ---------------------------------------------------------------------------
