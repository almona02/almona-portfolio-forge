-- B1: service workflow data contract + state guards (Ticket → Job → Visit → Report skeleton).
-- Local/disposable verification only in this PR; staging/production apply unauthorized.
--
-- NAMING (Spark-aligned):
--   Existing public.service_visits = contract preventive-maintenance visits
--     (service_contracts → scheduled/completed/cancelled). Untouched.
--   New public.service_job_visits = field attendance under a service_job.
--     Distinct authority; no overwrite of contract visits.
--
-- FSM: Slice 0 had resolved → closed only. B1 adds narrow governed edge
--   resolved → in_progress for required-job add-back (documented; closed reopen still prohibited).

BEGIN;
SET LOCAL lock_timeout = '5s';

-- ---------------------------------------------------------------------------
-- 0) Durable workflow activation on tickets (survives job cancel; never silent bypass restore)
-- ---------------------------------------------------------------------------
ALTER TABLE public.service_tickets
  ADD COLUMN IF NOT EXISTS workflow_activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS workflow_activated_by uuid REFERENCES auth.users(id);

COMMENT ON COLUMN public.service_tickets.workflow_activated_at IS
  'Set once when the ticket enters the job workflow; never cleared by job cancel/delete.';

-- ---------------------------------------------------------------------------
-- 1) Narrow FSM extension: resolved → in_progress (required-job add-back)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_valid_ticket_status_transition(p_from text, p_to text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog
AS $$
BEGIN
  IF p_from IS NOT DISTINCT FROM p_to THEN
    RETURN TRUE;
  END IF;
  RETURN CASE p_from
    WHEN 'open' THEN p_to IN ('assigned', 'cancelled')
    WHEN 'assigned' THEN p_to IN ('in_progress', 'awaiting_parts', 'cancelled')
    WHEN 'in_progress' THEN p_to IN ('awaiting_parts', 'awaiting_customer', 'resolved')
    WHEN 'awaiting_parts' THEN p_to IN ('in_progress', 'cancelled')
    WHEN 'awaiting_customer' THEN p_to IN ('in_progress', 'resolved')
    WHEN 'resolved' THEN p_to IN ('closed', 'in_progress')  -- B1: in_progress = job add-back only via create_service_job
    WHEN 'closed' THEN FALSE
    WHEN 'cancelled' THEN FALSE
    ELSE FALSE
  END;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2) Core tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.service_tickets(id) ON DELETE CASCADE,
  job_sequence integer NOT NULL,
  title text NOT NULL,
  required boolean NOT NULL DEFAULT true,
  state text NOT NULL DEFAULT 'unassigned'
    CHECK (state IN (
      'unassigned', 'planned', 'in_progress', 'awaiting_review',
      'completed', 'cancelled', 'waived'
    )),
  assigned_technician_id uuid REFERENCES auth.users(id),
  completing_revision_id uuid,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ticket_id, job_sequence)
);

CREATE INDEX IF NOT EXISTS service_jobs_ticket_idx ON public.service_jobs (ticket_id);
CREATE INDEX IF NOT EXISTS service_jobs_state_idx ON public.service_jobs (state);

COMMENT ON TABLE public.service_jobs IS
  'B1 field-work jobs under a service ticket. Machine context inherits from the ticket; no per-job machine override in B1.';

-- Attendance visits (NOT contract service_visits)
CREATE TABLE IF NOT EXISTS public.service_job_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.service_jobs(id) ON DELETE CASCADE,
  visit_sequence integer NOT NULL,
  state text NOT NULL DEFAULT 'scheduled'
    CHECK (state IN ('scheduled', 'in_progress', 'completed', 'aborted', 'no_access')),
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  attending_technician_id uuid REFERENCES auth.users(id),
  outcome_reason text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, visit_sequence)
);

CREATE INDEX IF NOT EXISTS service_job_visits_job_idx ON public.service_job_visits (job_id);
CREATE INDEX IF NOT EXISTS service_job_visits_state_idx ON public.service_job_visits (state);

COMMENT ON TABLE public.service_job_visits IS
  'B1 attendance visits for a service_job. Distinct from public.service_visits (contract PM schedule).';

CREATE TABLE IF NOT EXISTS public.service_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL UNIQUE REFERENCES public.service_job_visits(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.service_report_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.service_reports(id) ON DELETE CASCADE,
  revision_number integer NOT NULL,
  findings text NOT NULL,
  labour jsonb NOT NULL DEFAULT '[]'::jsonb,
  verification_outcome text NOT NULL
    CHECK (verification_outcome IN (
      'verified_fixed', 'not_reproduced', 'further_work_required', 'not_verified'
    )),
  verification_reason text,
  submitted_by uuid NOT NULL REFERENCES auth.users(id),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (report_id, revision_number),
  CHECK (revision_number >= 1)
);

CREATE INDEX IF NOT EXISTS service_report_revisions_report_idx
  ON public.service_report_revisions (report_id, revision_number);

CREATE TABLE IF NOT EXISTS public.service_report_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  revision_id uuid NOT NULL REFERENCES public.service_report_revisions(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id),
  decision text NOT NULL CHECK (decision IN ('approved_issued', 'returned')),
  comments text,
  decided_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS service_report_reviews_one_decision
  ON public.service_report_reviews (revision_id);

CREATE TABLE IF NOT EXISTS public.service_acknowledgments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issued_revision_id uuid NOT NULL REFERENCES public.service_report_revisions(id) ON DELETE CASCADE,
  response text NOT NULL CHECK (response IN ('accepted', 'refused', 'unavailable')),
  comment text,
  responded_by uuid NOT NULL REFERENCES auth.users(id),
  responded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS service_acknowledgments_revision_idx
  ON public.service_acknowledgments (issued_revision_id, responded_at DESC, id DESC);

COMMENT ON TABLE public.service_acknowledgments IS
  'Append-only acknowledgment events. Effective response = latest by (responded_at, id), not a 0..1 overwrite.';

CREATE TABLE IF NOT EXISTS public.service_workflow_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES public.service_tickets(id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  actor_id uuid NOT NULL,
  actor_role text NOT NULL,
  action text NOT NULL,
  from_state text,
  to_state text,
  rationale text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS service_workflow_audit_ticket_idx
  ON public.service_workflow_audit (ticket_id, created_at);

ALTER TABLE public.service_jobs
  ADD CONSTRAINT service_jobs_completing_revision_fk
  FOREIGN KEY (completing_revision_id) REFERENCES public.service_report_revisions(id);

-- ---------------------------------------------------------------------------
-- 3) RLS — real policies, no permissive stubs
-- ---------------------------------------------------------------------------
ALTER TABLE public.service_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_job_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_report_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_report_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_acknowledgments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_workflow_audit ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION admin_private.can_read_ticket_workflow(p_ticket_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.service_tickets t
    WHERE t.id = p_ticket_id
      AND (
        t.user_id = admin_private.caller_uid()
        OR t.assigned_to = admin_private.caller_uid()
        OR admin_private.caller_role() IN ('admin', 'support')
        OR (
          admin_private.caller_role() = 'technician'
          AND EXISTS (
            SELECT 1 FROM public.service_jobs j
            WHERE j.ticket_id = t.id
              AND j.assigned_technician_id = admin_private.caller_uid()
          )
        )
      )
  );
$$;
REVOKE ALL ON FUNCTION admin_private.can_read_ticket_workflow(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_private.can_read_ticket_workflow(uuid) TO authenticated;

DROP POLICY IF EXISTS service_jobs_select ON public.service_jobs;
CREATE POLICY service_jobs_select ON public.service_jobs
FOR SELECT TO authenticated
USING (admin_private.can_read_ticket_workflow(ticket_id));

DROP POLICY IF EXISTS service_jobs_staff_insert ON public.service_jobs;
CREATE POLICY service_jobs_staff_insert ON public.service_jobs
FOR INSERT TO authenticated
WITH CHECK (admin_private.caller_role() IN ('admin', 'support')
  AND admin_private.can_read_ticket_workflow(ticket_id));

-- No direct UPDATE/DELETE for clients — RPCs only (table owner / definer).
DROP POLICY IF EXISTS service_jobs_no_client_update ON public.service_jobs;
CREATE POLICY service_jobs_no_client_update ON public.service_jobs
FOR UPDATE TO authenticated USING (false);

DROP POLICY IF EXISTS service_jobs_no_client_delete ON public.service_jobs;
CREATE POLICY service_jobs_no_client_delete ON public.service_jobs
FOR DELETE TO authenticated USING (false);

DROP POLICY IF EXISTS service_job_visits_select ON public.service_job_visits;
CREATE POLICY service_job_visits_select ON public.service_job_visits
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.service_jobs j
    WHERE j.id = job_id AND admin_private.can_read_ticket_workflow(j.ticket_id)
  )
);

DROP POLICY IF EXISTS service_job_visits_no_client_write ON public.service_job_visits;
CREATE POLICY service_job_visits_no_client_insert ON public.service_job_visits
FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY service_job_visits_no_client_update ON public.service_job_visits
FOR UPDATE TO authenticated USING (false);
CREATE POLICY service_job_visits_no_client_delete ON public.service_job_visits
FOR DELETE TO authenticated USING (false);

DROP POLICY IF EXISTS service_reports_select ON public.service_reports;
CREATE POLICY service_reports_select ON public.service_reports
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.service_job_visits v
    JOIN public.service_jobs j ON j.id = v.job_id
    WHERE v.id = visit_id AND admin_private.can_read_ticket_workflow(j.ticket_id)
  )
);
CREATE POLICY service_reports_no_client_insert ON public.service_reports
FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY service_reports_no_client_update ON public.service_reports
FOR UPDATE TO authenticated USING (false);
CREATE POLICY service_reports_no_client_delete ON public.service_reports
FOR DELETE TO authenticated USING (false);

CREATE OR REPLACE FUNCTION admin_private.revision_is_customer_visible(p_revision_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
  -- Latest ISSUED only (explicit revision_number ordering; unissued newer revisions hidden)
  SELECT EXISTS (
    SELECT 1
    FROM public.service_report_revisions r
    JOIN public.service_reports rep ON rep.id = r.report_id
    JOIN public.service_job_visits v ON v.id = rep.visit_id
    JOIN public.service_jobs j ON j.id = v.job_id
    JOIN public.service_report_reviews rv ON rv.revision_id = r.id AND rv.decision = 'approved_issued'
    WHERE r.id = p_revision_id
      AND admin_private.can_read_ticket_workflow(j.ticket_id)
      AND NOT EXISTS (
        SELECT 1
        FROM public.service_report_revisions r2
        JOIN public.service_report_reviews rv2
          ON rv2.revision_id = r2.id AND rv2.decision = 'approved_issued'
        WHERE r2.report_id = r.report_id
          AND (
            r2.revision_number > r.revision_number
            OR (r2.revision_number = r.revision_number AND r2.id > r.id)
          )
      )
  );
$$;
REVOKE ALL ON FUNCTION admin_private.revision_is_customer_visible(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_private.revision_is_customer_visible(uuid) TO authenticated;

-- Revisions: staff see all readable; customers see only latest ISSUED revision (not newer unissued)
DROP POLICY IF EXISTS service_report_revisions_select ON public.service_report_revisions;
CREATE POLICY service_report_revisions_select ON public.service_report_revisions
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.service_reports r
    JOIN public.service_job_visits v ON v.id = r.visit_id
    JOIN public.service_jobs j ON j.id = v.job_id
    WHERE r.id = report_id
      AND (
        admin_private.caller_role() IN ('admin', 'support', 'technician')
        OR (
          admin_private.caller_role() = 'customer'
          AND admin_private.revision_is_customer_visible(service_report_revisions.id)
        )
      )
  )
);
CREATE POLICY service_report_revisions_no_client_insert ON public.service_report_revisions
FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY service_report_revisions_no_client_update ON public.service_report_revisions
FOR UPDATE TO authenticated USING (false);
CREATE POLICY service_report_revisions_no_client_delete ON public.service_report_revisions
FOR DELETE TO authenticated USING (false);

DROP POLICY IF EXISTS service_report_reviews_select ON public.service_report_reviews;
CREATE POLICY service_report_reviews_select ON public.service_report_reviews
FOR SELECT TO authenticated
USING (
  admin_private.caller_role() IN ('admin', 'support')
  OR (
    -- customers see issue decisions only on issued revisions of own tickets
    decision = 'approved_issued'
    AND EXISTS (
      SELECT 1
      FROM public.service_report_revisions r
      JOIN public.service_reports rep ON rep.id = r.report_id
      JOIN public.service_job_visits v ON v.id = rep.visit_id
      JOIN public.service_jobs j ON j.id = v.job_id
      JOIN public.service_tickets t ON t.id = j.ticket_id
      WHERE r.id = revision_id AND t.user_id = admin_private.caller_uid()
    )
  )
);
CREATE POLICY service_report_reviews_no_client_write ON public.service_report_reviews
FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY service_report_reviews_no_client_update ON public.service_report_reviews
FOR UPDATE TO authenticated USING (false);
CREATE POLICY service_report_reviews_no_client_delete ON public.service_report_reviews
FOR DELETE TO authenticated USING (false);

DROP POLICY IF EXISTS service_acknowledgments_select ON public.service_acknowledgments;
CREATE POLICY service_acknowledgments_select ON public.service_acknowledgments
FOR SELECT TO authenticated
USING (
  admin_private.caller_role() IN ('admin', 'support')
  OR EXISTS (
    SELECT 1
    FROM public.service_report_revisions r
    JOIN public.service_reports rep ON rep.id = r.report_id
    JOIN public.service_job_visits v ON v.id = rep.visit_id
    JOIN public.service_jobs j ON j.id = v.job_id
    JOIN public.service_tickets t ON t.id = j.ticket_id
    WHERE r.id = issued_revision_id AND t.user_id = admin_private.caller_uid()
  )
);
CREATE POLICY service_acknowledgments_no_client_write ON public.service_acknowledgments
FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY service_acknowledgments_no_client_update ON public.service_acknowledgments
FOR UPDATE TO authenticated USING (false);
CREATE POLICY service_acknowledgments_no_client_delete ON public.service_acknowledgments
FOR DELETE TO authenticated USING (false);

DROP POLICY IF EXISTS service_workflow_audit_staff_select ON public.service_workflow_audit;
CREATE POLICY service_workflow_audit_staff_select ON public.service_workflow_audit
FOR SELECT TO authenticated
USING (admin_private.caller_role() IN ('admin', 'support'));
CREATE POLICY service_workflow_audit_no_client_insert ON public.service_workflow_audit
FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY service_workflow_audit_no_client_update ON public.service_workflow_audit
FOR UPDATE TO authenticated USING (false);
CREATE POLICY service_workflow_audit_no_client_delete ON public.service_workflow_audit
FOR DELETE TO authenticated USING (false);

GRANT SELECT ON public.service_jobs, public.service_job_visits, public.service_reports,
  public.service_report_revisions, public.service_report_reviews,
  public.service_acknowledgments, public.service_workflow_audit TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.service_jobs, public.service_job_visits,
  public.service_reports, public.service_report_revisions, public.service_report_reviews,
  public.service_acknowledgments, public.service_workflow_audit FROM authenticated, anon;

-- ---------------------------------------------------------------------------
-- 4) Immutability + protected-column triggers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_service_report_revision_immutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF current_user IS DISTINCT FROM session_user
       OR NOT pg_has_role(session_user, current_user, 'member') THEN
      NULL; -- unreachable; prefer explicit owner check below
    END IF;
  END IF;
  -- Only table owner (migration/definer role) may mutate; authenticated never.
  IF current_user <> 'postgres'
     AND NOT EXISTS (
       SELECT 1 FROM pg_roles r
       WHERE r.rolname = current_user AND r.rolsuper
     )
     AND current_user IS DISTINCT FROM (
       SELECT pg_get_userbyid(c.relowner) FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relname = 'service_report_revisions'
     ) THEN
    RAISE EXCEPTION 'Submitted report revisions are immutable'
      USING ERRCODE = '42501';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Simpler owner-gate: deny when role is authenticated/anon/b1_auth
CREATE OR REPLACE FUNCTION public.enforce_workflow_immutable_row()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon', 'b1_auth')
     OR pg_has_role(current_user, 'authenticated', 'member')
        AND current_user NOT IN ('postgres')
        AND NOT (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) THEN
    -- Allow only when current_user is the table owner (SECURITY DEFINER runs as owner)
    IF current_user IS DISTINCT FROM (
         SELECT pg_get_userbyid(c.relowner)::name
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public' AND c.relname = TG_TABLE_NAME
       ) THEN
      RAISE EXCEPTION '% rows are immutable for clients', TG_TABLE_NAME
        USING ERRCODE = '42501';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_revision_immutable ON public.service_report_revisions;
CREATE TRIGGER trg_revision_immutable
  BEFORE UPDATE OR DELETE ON public.service_report_revisions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_workflow_immutable_row();

DROP TRIGGER IF EXISTS trg_review_immutable ON public.service_report_reviews;
CREATE TRIGGER trg_review_immutable
  BEFORE UPDATE OR DELETE ON public.service_report_reviews
  FOR EACH ROW EXECUTE FUNCTION public.enforce_workflow_immutable_row();

DROP TRIGGER IF EXISTS trg_ack_immutable ON public.service_acknowledgments;
CREATE TRIGGER trg_ack_immutable
  BEFORE UPDATE OR DELETE ON public.service_acknowledgments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_workflow_immutable_row();

DROP TRIGGER IF EXISTS trg_workflow_audit_immutable ON public.service_workflow_audit;
CREATE TRIGGER trg_workflow_audit_immutable
  BEFORE UPDATE OR DELETE ON public.service_workflow_audit
  FOR EACH ROW EXECUTE FUNCTION public.enforce_workflow_immutable_row();

CREATE OR REPLACE FUNCTION public.enforce_service_job_protected_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  IF current_user IS DISTINCT FROM (
       SELECT pg_get_userbyid(c.relowner)::name
       FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relname = 'service_jobs'
     )
     AND NOT COALESCE((SELECT rolsuper FROM pg_roles WHERE rolname = current_user), false) THEN
    IF NEW.ticket_id IS DISTINCT FROM OLD.ticket_id
       OR NEW.job_sequence IS DISTINCT FROM OLD.job_sequence
       OR NEW.required IS DISTINCT FROM OLD.required
       OR NEW.state IS DISTINCT FROM OLD.state
       OR NEW.assigned_technician_id IS DISTINCT FROM OLD.assigned_technician_id
       OR NEW.completing_revision_id IS DISTINCT FROM OLD.completing_revision_id
       OR NEW.created_by IS DISTINCT FROM OLD.created_by THEN
      RAISE EXCEPTION 'Protected job fields require governed RPCs'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_service_job_protected ON public.service_jobs;
CREATE TRIGGER trg_service_job_protected
  BEFORE UPDATE ON public.service_jobs
  FOR EACH ROW EXECUTE FUNCTION public.enforce_service_job_protected_columns();

CREATE OR REPLACE FUNCTION public.enforce_service_job_visit_protected_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  IF current_user IS DISTINCT FROM (
       SELECT pg_get_userbyid(c.relowner)::name
       FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relname = 'service_job_visits'
     )
     AND NOT COALESCE((SELECT rolsuper FROM pg_roles WHERE rolname = current_user), false) THEN
    IF NEW.job_id IS DISTINCT FROM OLD.job_id
       OR NEW.visit_sequence IS DISTINCT FROM OLD.visit_sequence
       OR NEW.state IS DISTINCT FROM OLD.state
       OR NEW.attending_technician_id IS DISTINCT FROM OLD.attending_technician_id THEN
      RAISE EXCEPTION 'Protected visit fields require governed RPCs'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_service_job_visit_protected ON public.service_job_visits;
CREATE TRIGGER trg_service_job_visit_protected
  BEFORE UPDATE ON public.service_job_visits
  FOR EACH ROW EXECUTE FUNCTION public.enforce_service_job_visit_protected_columns();

-- ---------------------------------------------------------------------------
-- 5) Helpers: ordering, issued revision, prerequisites
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.latest_issued_revision_id(p_report_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT r.id
  FROM public.service_report_revisions r
  JOIN public.service_report_reviews v ON v.revision_id = r.id AND v.decision = 'approved_issued'
  WHERE r.report_id = p_report_id
  ORDER BY r.revision_number DESC, r.submitted_at DESC, r.id DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.effective_acknowledgment(p_revision_id uuid)
RETURNS public.service_acknowledgments
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT a.*
  FROM public.service_acknowledgments a
  WHERE a.issued_revision_id = p_revision_id
  ORDER BY a.responded_at DESC, a.id DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.evaluate_ticket_workflow_prerequisites(p_ticket_id uuid)
RETURNS TABLE(code text, detail text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_activated timestamptz;
  r record;
  v_issued uuid;
  v_ack public.service_acknowledgments;
BEGIN
  SELECT workflow_activated_at INTO v_activated
  FROM public.service_tickets WHERE id = p_ticket_id;
  IF v_activated IS NULL THEN
    RETURN;
  END IF;

  -- Required jobs must be completed or waived (optional jobs never block merely by existing)
  FOR r IN
    SELECT j.id, j.job_sequence, j.title, j.state
    FROM public.service_jobs j
    WHERE j.ticket_id = p_ticket_id AND j.required
      AND j.state NOT IN ('completed', 'waived')
  LOOP
    code := 'required_job_unsatisfied';
    detail := format('Job %s (%s) state=%s', r.job_sequence, r.title, r.state);
    RETURN NEXT;
  END LOOP;

  -- Active/scheduled visits on ANY job must be settled (do not orphan work, including optional jobs)
  FOR r IN
    SELECT v.id, v.visit_sequence, v.state, j.job_sequence, j.title
    FROM public.service_job_visits v
    JOIN public.service_jobs j ON j.id = v.job_id
    WHERE j.ticket_id = p_ticket_id
      AND v.state IN ('scheduled', 'in_progress')
  LOOP
    code := CASE WHEN r.state = 'scheduled' THEN 'scheduled_visit_open' ELSE 'active_visit_open' END;
    detail := format('Job %s (%s) visit %s state=%s', r.job_sequence, r.title, r.visit_sequence, r.state);
    RETURN NEXT;
  END LOOP;

  -- Pending reviews: revision exists without a deciding review
  FOR r IN
    SELECT rev.id, rev.revision_number, j.job_sequence, j.title
    FROM public.service_report_revisions rev
    JOIN public.service_reports rep ON rep.id = rev.report_id
    JOIN public.service_job_visits v ON v.id = rep.visit_id
    JOIN public.service_jobs j ON j.id = v.job_id
    WHERE j.ticket_id = p_ticket_id
      AND NOT EXISTS (
        SELECT 1 FROM public.service_report_reviews rv WHERE rv.revision_id = rev.id
      )
  LOOP
    code := 'revision_awaiting_review';
    detail := format('Job %s (%s) revision %s awaiting review', r.job_sequence, r.title, r.revision_number);
    RETURN NEXT;
  END LOOP;

  -- Issued revisions: acknowledgment is B6 — never stub as satisfied
  FOR r IN
    SELECT rev.id, rev.revision_number, j.job_sequence, j.title
    FROM public.service_report_revisions rev
    JOIN public.service_report_reviews rv ON rv.revision_id = rev.id AND rv.decision = 'approved_issued'
    JOIN public.service_reports rep ON rep.id = rev.report_id
    JOIN public.service_job_visits v ON v.id = rep.visit_id
    JOIN public.service_jobs j ON j.id = v.job_id
    WHERE j.ticket_id = p_ticket_id
      AND rev.id = public.latest_issued_revision_id(rep.id)  -- customer-visible issued head only
  LOOP
    v_ack := public.effective_acknowledgment(r.id);
    IF v_ack IS NULL THEN
      code := 'acknowledgment_not_implemented';
      detail := format('Job %s (%s) issued revision %s — acknowledgment path is B6 (not stubbed satisfied)',
        r.job_sequence, r.title, r.revision_number);
      RETURN NEXT;
    ELSIF v_ack.response = 'refused' THEN
      code := 'acknowledgment_refusal_disposition_pending';
      detail := format('Job %s (%s) issued revision %s refused — manager disposition required (B6)',
        r.job_sequence, r.title, r.revision_number);
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.evaluate_ticket_workflow_prerequisites(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.evaluate_ticket_workflow_prerequisites(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION admin_private.assert_ticket_workflow_allows_resolve_close(
  p_ticket public.service_tickets,
  p_to_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_row record;
  v_msgs text := '';
BEGIN
  IF p_ticket.workflow_activated_at IS NULL THEN
    RETURN; -- legacy / jobless path
  END IF;
  IF p_to_status NOT IN ('resolved', 'closed') THEN
    RETURN;
  END IF;
  FOR v_row IN SELECT * FROM public.evaluate_ticket_workflow_prerequisites(p_ticket.id)
  LOOP
    v_msgs := v_msgs || v_row.code || ': ' || v_row.detail || E'\n';
  END LOOP;
  IF v_msgs <> '' THEN
    RAISE EXCEPTION 'Workflow prerequisites unsatisfied for %:%', p_to_status, E'\n' || v_msgs
      USING ERRCODE = 'check_violation';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6) Actor resolution (Slice 0 pattern)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_private.workflow_resolve_actor(p_actor_id uuid)
RETURNS TABLE(uid uuid, role text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_uid uuid := admin_private.caller_uid();
  v_role text;
BEGIN
  IF v_uid IS NULL AND p_actor_id IS NOT NULL THEN
    -- service_role path may pass actor; still bind role from profiles
    v_uid := p_actor_id;
  ELSIF p_actor_id IS NOT NULL AND p_actor_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'Actor impersonation not permitted' USING ERRCODE = '42501';
  END IF;
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  SELECT p.role::text INTO v_role FROM public.profiles p WHERE p.id = v_uid;
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Unknown actor' USING ERRCODE = '42501';
  END IF;
  uid := v_uid;
  role := v_role;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION admin_private.workflow_audit(
  p_ticket_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_actor_id uuid,
  p_actor_role text,
  p_action text,
  p_from text,
  p_to text,
  p_rationale text,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  INSERT INTO public.service_workflow_audit (
    ticket_id, entity_type, entity_id, actor_id, actor_role,
    action, from_state, to_state, rationale, details
  ) VALUES (
    p_ticket_id, p_entity_type, p_entity_id, p_actor_id, p_actor_role,
    p_action, p_from, p_to, p_rationale, COALESCE(p_details, '{}'::jsonb)
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 7) Job / visit RPCs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_valid_job_transition(p_from text, p_to text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog
AS $$
BEGIN
  IF p_from IS NOT DISTINCT FROM p_to THEN RETURN TRUE; END IF;
  IF p_from IN ('completed', 'waived') THEN RETURN FALSE; END IF;
  IF p_from = 'cancelled' THEN
    RETURN FALSE; -- waive uses waive_service_job, not generic transition
  END IF;
  RETURN CASE p_from
    WHEN 'unassigned' THEN p_to IN ('planned', 'cancelled')
    WHEN 'planned' THEN p_to IN ('in_progress', 'cancelled')
    WHEN 'in_progress' THEN p_to IN ('awaiting_review', 'cancelled')
    WHEN 'awaiting_review' THEN p_to IN ('in_progress', 'completed', 'cancelled')
    ELSE FALSE
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_valid_visit_transition(p_from text, p_to text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog
AS $$
BEGIN
  IF p_from IS NOT DISTINCT FROM p_to THEN RETURN TRUE; END IF;
  IF p_from IN ('completed', 'aborted', 'no_access') THEN RETURN FALSE; END IF;
  RETURN CASE p_from
    WHEN 'scheduled' THEN p_to IN ('in_progress', 'aborted', 'no_access')
    WHEN 'in_progress' THEN p_to IN ('completed', 'aborted', 'no_access')
    ELSE FALSE
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_service_job(
  p_ticket_id uuid,
  p_title text,
  p_required boolean DEFAULT true,
  p_rationale text DEFAULT NULL
)
RETURNS public.service_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_actor record;
  v_ticket public.service_tickets;
  v_job public.service_jobs;
  v_seq int;
  v_from text;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(NULL);
  IF v_actor.role NOT IN ('admin', 'support') THEN
    RAISE EXCEPTION 'Only admin/support may create jobs' USING ERRCODE = '42501';
  END IF;
  IF p_title IS NULL OR btrim(p_title) = '' THEN
    RAISE EXCEPTION 'Job title required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_ticket FROM public.service_tickets WHERE id = p_ticket_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_ticket.status = 'closed' THEN
    RAISE EXCEPTION 'Closed tickets cannot receive jobs' USING ERRCODE = 'check_violation';
  END IF;
  IF v_ticket.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cancelled tickets cannot receive jobs' USING ERRCODE = 'check_violation';
  END IF;

  SELECT COALESCE(MAX(job_sequence), 0) + 1 INTO v_seq
  FROM public.service_jobs WHERE ticket_id = p_ticket_id;

  INSERT INTO public.service_jobs (
    ticket_id, job_sequence, title, required, state, created_by
  ) VALUES (
    p_ticket_id, v_seq, btrim(p_title), COALESCE(p_required, true), 'unassigned', v_actor.uid
  ) RETURNING * INTO v_job;

  -- Durable activation (never cleared)
  IF v_ticket.workflow_activated_at IS NULL THEN
    UPDATE public.service_tickets
    SET workflow_activated_at = now(),
        workflow_activated_by = v_actor.uid,
        updated_at = now()
    WHERE id = p_ticket_id;
  END IF;

  -- Required job on resolved ticket: atomic resolved → in_progress + ticket audit
  IF v_job.required AND v_ticket.status = 'resolved' THEN
    v_from := v_ticket.status;
    UPDATE public.service_tickets
    SET status = 'in_progress',
        updated_at = now(),
        resolved_at = NULL
    WHERE id = p_ticket_id;

    INSERT INTO public.ticket_governance_audit (
      ticket_id, actor_id, action, from_status, to_status, assigned_to, details
    ) VALUES (
      p_ticket_id, v_actor.uid, 'status_transition', v_from, 'in_progress', v_ticket.assigned_to,
      jsonb_build_object(
        'rationale', COALESCE(p_rationale, 'required job added'),
        'role', v_actor.role,
        'workflow', 'required_job_add_back',
        'job_id', v_job.id
      )
    );
  END IF;

  PERFORM admin_private.workflow_audit(
    p_ticket_id, 'service_job', v_job.id, v_actor.uid, v_actor.role,
    'create_job', NULL, v_job.state, p_rationale,
    jsonb_build_object('required', v_job.required, 'sequence', v_job.job_sequence, 'title', v_job.title)
  );

  RETURN v_job;
END;
$$;
REVOKE ALL ON FUNCTION public.create_service_job(uuid, text, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_service_job(uuid, text, boolean, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.govern_job_transition(
  p_job_id uuid,
  p_to_state text,
  p_rationale text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
)
RETURNS public.service_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_actor record;
  v_job public.service_jobs;
  v_next public.service_jobs;
  v_rev uuid;
  v_verif text;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  IF v_actor.role NOT IN ('admin', 'support') THEN
    -- B2 will allow technician on assigned jobs; B1 staff-only transitions
    RAISE EXCEPTION 'Only admin/support may transition jobs in B1' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_job FROM public.service_jobs WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found' USING ERRCODE = 'P0002';
  END IF;

  PERFORM 1 FROM public.service_tickets WHERE id = v_job.ticket_id FOR UPDATE;

  IF p_to_state = 'cancelled' AND (p_rationale IS NULL OR btrim(p_rationale) = '') THEN
    RAISE EXCEPTION 'Cancel reason mandatory' USING ERRCODE = '22023';
  END IF;

  IF NOT public.is_valid_job_transition(v_job.state, p_to_state) THEN
    RAISE EXCEPTION 'Invalid job transition: % -> %', v_job.state, p_to_state
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_to_state = 'completed' THEN
    -- Require approved issued report with explicit visit/revision ordering; no timestamp-only sort
    SELECT r.id, r.verification_outcome INTO v_rev, v_verif
    FROM public.service_report_revisions r
    JOIN public.service_reports rep ON rep.id = r.report_id
    JOIN public.service_job_visits v ON v.id = rep.visit_id
    JOIN public.service_report_reviews rv ON rv.revision_id = r.id AND rv.decision = 'approved_issued'
    WHERE v.job_id = v_job.id
      AND r.id = public.latest_issued_revision_id(rep.id)
    ORDER BY v.visit_sequence DESC, r.revision_number DESC, r.id DESC
    LIMIT 1;

    IF v_rev IS NULL THEN
      RAISE EXCEPTION 'Job completion requires an approved issued report'
        USING ERRCODE = 'check_violation';
    END IF;
    IF v_verif = 'further_work_required' THEN
      RAISE EXCEPTION 'Job cannot complete while verification is further_work_required'
        USING ERRCODE = 'check_violation';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.service_job_visits v
      WHERE v.job_id = v_job.id AND v.state IN ('scheduled', 'in_progress')
    ) THEN
      RAISE EXCEPTION 'Job cannot complete with open visits'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  UPDATE public.service_jobs
  SET state = p_to_state,
      completing_revision_id = CASE WHEN p_to_state = 'completed' THEN v_rev ELSE completing_revision_id END,
      updated_at = now()
  WHERE id = p_job_id
  RETURNING * INTO v_next;

  PERFORM admin_private.workflow_audit(
    v_job.ticket_id, 'service_job', v_job.id, v_actor.uid, v_actor.role,
    'job_transition', v_job.state, p_to_state, p_rationale,
    jsonb_build_object('completing_revision_id', v_next.completing_revision_id)
  );

  RETURN v_next;
END;
$$;
REVOKE ALL ON FUNCTION public.govern_job_transition(uuid, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.govern_job_transition(uuid, text, text, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.waive_service_job(
  p_job_id uuid,
  p_reason text,
  p_actor_id uuid DEFAULT NULL
)
RETURNS public.service_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_actor record;
  v_job public.service_jobs;
  v_next public.service_jobs;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  IF v_actor.role NOT IN ('admin', 'support') THEN
    RAISE EXCEPTION 'Only admin/support may waive jobs' USING ERRCODE = '42501';
  END IF;
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'Waive reason mandatory' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_job FROM public.service_jobs WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found' USING ERRCODE = 'P0002';
  END IF;
  PERFORM 1 FROM public.service_tickets WHERE id = v_job.ticket_id FOR UPDATE;

  IF v_job.state IN ('completed', 'waived') THEN
    RAISE EXCEPTION 'Job already terminal' USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.service_jobs
  SET state = 'waived', updated_at = now()
  WHERE id = p_job_id
  RETURNING * INTO v_next;

  PERFORM admin_private.workflow_audit(
    v_job.ticket_id, 'service_job', v_job.id, v_actor.uid, v_actor.role,
    'waive_job', v_job.state, 'waived', p_reason, '{}'::jsonb
  );
  RETURN v_next;
END;
$$;
REVOKE ALL ON FUNCTION public.waive_service_job(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.waive_service_job(uuid, text, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.create_service_job_visit(
  p_job_id uuid,
  p_rationale text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
)
RETURNS public.service_job_visits
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_actor record;
  v_job public.service_jobs;
  v_visit public.service_job_visits;
  v_seq int;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  IF v_actor.role NOT IN ('admin', 'support') THEN
    RAISE EXCEPTION 'Only admin/support may create visits in B1' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_job FROM public.service_jobs WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_job.state IN ('completed', 'waived', 'cancelled') THEN
    RAISE EXCEPTION 'Cannot create visit on terminal job' USING ERRCODE = 'check_violation';
  END IF;

  PERFORM 1 FROM public.service_tickets WHERE id = v_job.ticket_id FOR UPDATE;

  SELECT COALESCE(MAX(visit_sequence), 0) + 1 INTO v_seq
  FROM public.service_job_visits WHERE job_id = p_job_id;

  INSERT INTO public.service_job_visits (
    job_id, visit_sequence, state, created_by, attending_technician_id
  ) VALUES (
    p_job_id, v_seq, 'scheduled', v_actor.uid, v_job.assigned_technician_id
  ) RETURNING * INTO v_visit;

  PERFORM admin_private.workflow_audit(
    v_job.ticket_id, 'service_job_visit', v_visit.id, v_actor.uid, v_actor.role,
    'create_visit', NULL, 'scheduled', p_rationale,
    jsonb_build_object('job_id', p_job_id, 'sequence', v_seq)
  );
  RETURN v_visit;
END;
$$;
REVOKE ALL ON FUNCTION public.create_service_job_visit(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_service_job_visit(uuid, text, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.govern_visit_transition(
  p_visit_id uuid,
  p_to_state text,
  p_rationale text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
)
RETURNS public.service_job_visits
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_actor record;
  v_visit public.service_job_visits;
  v_job public.service_jobs;
  v_next public.service_job_visits;
BEGIN
  SELECT * INTO v_actor FROM admin_private.workflow_resolve_actor(p_actor_id);
  IF v_actor.role NOT IN ('admin', 'support') THEN
    RAISE EXCEPTION 'Only admin/support may transition visits in B1' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_visit FROM public.service_job_visits WHERE id = p_visit_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Visit not found' USING ERRCODE = 'P0002';
  END IF;
  SELECT * INTO v_job FROM public.service_jobs WHERE id = v_visit.job_id FOR UPDATE;
  PERFORM 1 FROM public.service_tickets WHERE id = v_job.ticket_id FOR UPDATE;

  IF p_to_state IN ('aborted', 'no_access') AND (p_rationale IS NULL OR btrim(p_rationale) = '') THEN
    RAISE EXCEPTION 'Outcome reason mandatory for %', p_to_state USING ERRCODE = '22023';
  END IF;

  IF NOT public.is_valid_visit_transition(v_visit.state, p_to_state) THEN
    RAISE EXCEPTION 'Invalid visit transition: % -> %', v_visit.state, p_to_state
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_to_state = 'in_progress' AND v_job.state = 'unassigned' THEN
    RAISE EXCEPTION 'Cannot start visit on unassigned job' USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.service_job_visits
  SET state = p_to_state,
      outcome_reason = CASE
        WHEN p_to_state IN ('aborted', 'no_access') THEN p_rationale
        ELSE outcome_reason
      END,
      updated_at = now()
  WHERE id = p_visit_id
  RETURNING * INTO v_next;

  PERFORM admin_private.workflow_audit(
    v_job.ticket_id, 'service_job_visit', v_visit.id, v_actor.uid, v_actor.role,
    'visit_transition', v_visit.state, p_to_state, p_rationale, '{}'::jsonb
  );
  RETURN v_next;
END;
$$;
REVOKE ALL ON FUNCTION public.govern_visit_transition(uuid, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.govern_visit_transition(uuid, text, text, uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 8) Gate resolve/close for workflow-activated tickets (replace govern overloads)
-- Drop both signatures first to avoid 4-arg / 5-arg DEFAULT ambiguity (42725).
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.govern_ticket_transition(uuid, text, text, text);
DROP FUNCTION IF EXISTS public.govern_ticket_transition(uuid, text, text, text, uuid);

CREATE FUNCTION public.govern_ticket_transition(
  p_ticket_id uuid,
  p_to_status text,
  p_rationale text,
  p_resolution_summary text,
  p_actor_id uuid
)
RETURNS public.service_tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_uid uuid := admin_private.caller_uid();
  v_role text;
  v_ticket public.service_tickets;
  v_next public.service_tickets;
BEGIN
  IF admin_private.is_service_role_request() AND p_actor_id IS NOT NULL THEN
    v_uid := p_actor_id;
  ELSIF p_actor_id IS NOT NULL AND p_actor_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'Actor impersonation not permitted' USING ERRCODE = '42501';
  END IF;

  SELECT p.role::text INTO v_role FROM public.profiles p WHERE p.id = v_uid;
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Unknown actor' USING ERRCODE = '42501';
  END IF;

  IF p_to_status IS NULL OR p_to_status = 'pending_approval' THEN
    RAISE EXCEPTION 'Status not permitted' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_ticket FROM public.service_tickets WHERE id = p_ticket_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.is_valid_ticket_status_transition(v_ticket.status::text, p_to_status) THEN
    RAISE EXCEPTION 'Invalid ticket status transition: % -> %', v_ticket.status, p_to_status
      USING ERRCODE = 'check_violation';
  END IF;

  -- B1: resolved → in_progress only via create_service_job add-back, not free transition
  IF v_ticket.status::text = 'resolved' AND p_to_status = 'in_progress' THEN
    RAISE EXCEPTION 'resolved→in_progress is only allowed via required job creation'
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_role IN ('admin', 'support') THEN
    NULL;
  ELSIF v_role = 'technician' THEN
    IF v_ticket.assigned_to IS DISTINCT FROM v_uid THEN
      RAISE EXCEPTION 'Technician may only transition assigned tickets' USING ERRCODE = '42501';
    END IF;
    IF NOT (
      (v_ticket.status::text = 'assigned' AND p_to_status IN ('in_progress', 'awaiting_parts', 'cancelled'))
      OR (v_ticket.status::text = 'in_progress' AND p_to_status IN ('awaiting_parts', 'awaiting_customer', 'resolved'))
      OR (v_ticket.status::text = 'awaiting_parts' AND p_to_status IN ('in_progress', 'cancelled'))
      OR (v_ticket.status::text = 'awaiting_customer' AND p_to_status IN ('in_progress', 'resolved'))
    ) THEN
      RAISE EXCEPTION 'Technician transition not permitted' USING ERRCODE = '42501';
    END IF;
  ELSE
    RAISE EXCEPTION 'Not permitted' USING ERRCODE = '42501';
  END IF;

  PERFORM admin_private.assert_ticket_workflow_allows_resolve_close(v_ticket, p_to_status);

  UPDATE public.service_tickets t
  SET
    status = p_to_status,
    updated_at = now(),
    resolution_summary = CASE
      WHEN p_to_status IN ('resolved', 'closed') THEN COALESCE(p_resolution_summary, t.resolution_summary)
      ELSE t.resolution_summary
    END,
    resolved_at = CASE WHEN p_to_status = 'resolved' THEN now()
                       WHEN p_to_status = 'in_progress' THEN NULL
                       ELSE t.resolved_at END,
    closed_at = CASE WHEN p_to_status = 'closed' THEN now() ELSE t.closed_at END,
    first_response_at = CASE
      WHEN t.first_response_at IS NULL AND t.status::text = 'open' AND p_to_status IN ('assigned', 'in_progress')
        THEN now()
      ELSE t.first_response_at
    END,
    assigned_to = CASE
      WHEN p_to_status = 'cancelled' AND t.status::text = 'assigned' AND v_role = 'technician'
        THEN NULL
      ELSE t.assigned_to
    END
  WHERE t.id = p_ticket_id
  RETURNING * INTO v_next;

  INSERT INTO public.ticket_governance_audit(ticket_id, actor_id, action, from_status, to_status, assigned_to, details)
  VALUES (
    p_ticket_id,
    v_uid,
    'status_transition',
    v_ticket.status::text,
    p_to_status,
    v_next.assigned_to,
    jsonb_build_object('rationale', p_rationale, 'role', v_role)
  );

  RETURN v_next;
END;
$$;

-- Exact 4-arg client/battery signature (no DEFAULT overlap with 5-arg).
CREATE FUNCTION public.govern_ticket_transition(
  p_ticket_id uuid,
  p_to_status text,
  p_rationale text DEFAULT NULL,
  p_resolution_summary text DEFAULT NULL
)
RETURNS public.service_tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
BEGIN
  RETURN public.govern_ticket_transition(
    p_ticket_id, p_to_status, p_rationale, p_resolution_summary, NULL::uuid);
END;
$$;

REVOKE ALL ON FUNCTION public.govern_ticket_transition(uuid, text, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.govern_ticket_transition(uuid, text, text, text, uuid)
  TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.govern_ticket_transition(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.govern_ticket_transition(uuid, text, text, text)
  TO authenticated, service_role;

COMMIT;
