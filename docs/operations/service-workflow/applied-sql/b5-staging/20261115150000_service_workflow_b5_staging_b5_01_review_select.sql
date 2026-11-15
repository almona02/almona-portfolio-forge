-- STAGING-B5-01 companion: attending author may SELECT reviews on their revisions
-- (including returned + comments). Does not change review/submit/getter RPCs.
-- Customers still only see approved_issued via the existing owner branch.
-- Unrelated tickets remain denied. #155 frozen; #156 draft; no production/merge/B6.

BEGIN;

DROP POLICY IF EXISTS service_report_reviews_select ON public.service_report_reviews;
CREATE POLICY service_report_reviews_select ON public.service_report_reviews
FOR SELECT TO authenticated
USING (
  admin_private.caller_role() IN ('admin', 'support')
  OR (
    -- Ticket owner: issued decisions only (never returned comments).
    decision = 'approved_issued'
    AND EXISTS (
      SELECT 1
      FROM public.service_report_revisions r
      JOIN public.service_reports rep ON rep.id = r.report_id
      JOIN public.service_job_visits v ON v.id = rep.visit_id
      JOIN public.service_jobs j ON j.id = v.job_id
      JOIN public.service_tickets t ON t.id = j.ticket_id
      WHERE r.id = revision_id
        AND t.user_id = admin_private.caller_uid()
    )
  )
  OR (
    -- Historical author / attending technician: read deciding review to revise.
    EXISTS (
      SELECT 1
      FROM public.service_report_revisions r
      JOIN public.service_reports rep ON rep.id = r.report_id
      JOIN public.service_job_visits v ON v.id = rep.visit_id
      WHERE r.id = revision_id
        AND (
          r.submitted_by = admin_private.caller_uid()
          OR v.attending_technician_id = admin_private.caller_uid()
        )
    )
  )
);

COMMIT;
