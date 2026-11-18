-- F-LC-VIS-1: checklist attempt-history SELECT uses the Lane C reader,
-- not owner-inclusive can_read_ticket_workflow.
-- Local correction only. No staging apply, merge, production, or FR-1.
-- Prior Lane C migration bytes are unchanged.
--
-- Contract §3.4 readers of internal checklist content / answer history:
--   admin, support;
--   current job assignee (technician);
--   in-progress attending technician of this visit;
--   historical attending technician via is_ticket_visit_attending_technician
--     (completed visit on the ticket, job not cancelled/waived).
-- Ticket owner (user_id) and ticket.assigned_to are not readers.
-- Customer / anon receive no attempt rows.
-- INSERT/UPDATE/DELETE policies and table grants are not modified.

BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE OR REPLACE FUNCTION admin_private.can_read_checklist_attempt_history(
  p_ticket_id uuid,
  p_job_id uuid,
  p_visit_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
  SELECT CASE
    WHEN admin_private.caller_role() IN ('admin', 'support') THEN true
    WHEN admin_private.caller_role() = 'technician'
         AND admin_private.caller_uid() IS NOT NULL
         AND (
           EXISTS (
             SELECT 1
             FROM public.service_jobs j
             WHERE j.id = p_job_id
               AND j.ticket_id = p_ticket_id
               AND j.assigned_technician_id = admin_private.caller_uid()
           )
           OR EXISTS (
             SELECT 1
             FROM public.service_job_visits v
             WHERE v.id = p_visit_id
               AND v.job_id = p_job_id
               AND v.attending_technician_id = admin_private.caller_uid()
               AND v.state = 'in_progress'
           )
           OR admin_private.is_ticket_visit_attending_technician(
             p_ticket_id,
             admin_private.caller_uid()
           )
         )
    THEN true
    ELSE false
  END;
$$;

REVOKE ALL ON FUNCTION admin_private.can_read_checklist_attempt_history(uuid, uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_private.can_read_checklist_attempt_history(uuid, uuid, uuid)
  TO authenticated;

-- Envelope reads attempt rows as the definer. Do not leave it callable by API roles.
REVOKE ALL ON FUNCTION admin_private.checklist_current_envelope(uuid)
  FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS svc_visit_checklist_hist_select
  ON public.service_visit_checklist_answer_history;
CREATE POLICY svc_visit_checklist_hist_select
  ON public.service_visit_checklist_answer_history
  FOR SELECT TO authenticated
  USING (
    admin_private.can_read_checklist_attempt_history(ticket_id, job_id, visit_id)
  );

-- Workspace returns the current attempt projection. Same reader; customers stay denied.
CREATE OR REPLACE FUNCTION public.get_visit_checklist_workspace(
  p_visit_id uuid,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_actor record;
  v_hier record;
  v_ticket public.service_tickets%ROWTYPE;
  v_job public.service_jobs%ROWTYPE;
  v_visit public.service_job_visits%ROWTYPE;
  v_pin_version uuid;
  v_version public.service_routine_versions%ROWTYPE;
  v_routine public.service_routines%ROWTYPE;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  SELECT * INTO v_hier FROM admin_private.lock_visit_hierarchy(p_visit_id);
  v_ticket := v_hier.ticket;
  v_job := v_hier.job;
  v_visit := v_hier.visit;

  IF NOT admin_private.can_read_checklist_attempt_history(
    v_ticket.id, v_job.id, v_visit.id
  ) THEN
    PERFORM admin_private.workflow_audit(
      v_ticket.id, 'service_job_visit', v_visit.id, v_actor.uid, v_actor.role,
      'routine_checklist_authz_denied', NULL, NULL, 'get_visit_checklist_workspace',
      jsonb_build_object('visit_id', p_visit_id));
    PERFORM admin_private.deny_checklist(
      '42501', 'routine_checklist_authz_denied', 'Checklist read denied'
    );
  END IF;

  v_pin_version := admin_private.job_active_routine_version_id(v_job.id);
  IF v_pin_version IS NULL THEN
    RETURN jsonb_build_object(
      'visit_id', v_visit.id,
      'job_id', v_job.id,
      'ticket_id', v_ticket.id,
      'has_active_pin', false,
      'checklist_revision', v_visit.checklist_revision,
      'pinned_routine_version_id', v_visit.pinned_routine_version_id,
      'payload', NULL,
      'current', NULL
    );
  END IF;

  SELECT * INTO v_version FROM public.service_routine_versions WHERE id = v_pin_version;
  SELECT * INTO v_routine FROM public.service_routines WHERE id = v_version.routine_id;

  RETURN jsonb_build_object(
    'visit_id', v_visit.id,
    'job_id', v_job.id,
    'ticket_id', v_ticket.id,
    'has_active_pin', true,
    'checklist_revision', v_visit.checklist_revision,
    'pinned_routine_version_id', v_visit.pinned_routine_version_id,
    'routine_version_id', v_version.id,
    'routine_id', v_routine.id,
    'routine_code', v_routine.code,
    'routine_name_en', v_routine.name_en,
    'version_ordinal', v_version.version_ordinal,
    'version_status', v_version.status,
    'payload', admin_private.routine_preview_payload(v_version.payload),
    'current', admin_private.checklist_current_envelope(v_visit.id),
    'can_write', (
      v_actor.role = 'technician'
      AND v_visit.attending_technician_id IS NOT NULL
      AND v_actor.uid = v_visit.attending_technician_id
      AND v_visit.state = 'in_progress'
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_visit_checklist_workspace(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_visit_checklist_workspace(uuid, uuid) TO authenticated;

COMMIT;
