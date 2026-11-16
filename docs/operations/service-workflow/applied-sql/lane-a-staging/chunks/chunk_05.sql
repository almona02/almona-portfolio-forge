REVOKE ALL ON TABLE public.service_routine_versions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.service_routine_reviews FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.service_routine_applicability FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.service_routines TO authenticated;
GRANT SELECT ON public.service_routine_versions TO authenticated;
GRANT SELECT ON public.service_routine_reviews TO authenticated;
GRANT SELECT ON public.service_routine_applicability TO authenticated;

DROP POLICY IF EXISTS service_routines_select ON public.service_routines;
CREATE POLICY service_routines_select ON public.service_routines
FOR SELECT TO authenticated
USING (
  admin_private.caller_role() IN ('admin', 'support')
  OR (
    admin_private.caller_role() = 'technician'
    AND status IN ('published', 'retired')
  )
);

DROP POLICY IF EXISTS service_routine_versions_select ON public.service_routine_versions;
CREATE POLICY service_routine_versions_select ON public.service_routine_versions
FOR SELECT TO authenticated
USING (
  admin_private.caller_role() IN ('admin', 'support')
  OR (
    admin_private.caller_role() = 'technician'
    AND status IN ('published', 'retired')
  )
);

DROP POLICY IF EXISTS service_routine_reviews_select ON public.service_routine_reviews;
CREATE POLICY service_routine_reviews_select ON public.service_routine_reviews
FOR SELECT TO authenticated
USING (admin_private.caller_role() IN ('admin', 'support'));

DROP POLICY IF EXISTS service_routine_applicability_select ON public.service_routine_applicability;
CREATE POLICY service_routine_applicability_select ON public.service_routine_applicability
FOR SELECT TO authenticated
USING (admin_private.caller_role() IN ('admin', 'support', 'technician'));

REVOKE ALL ON FUNCTION public.create_service_routine_draft(text, text, text, text, jsonb, text[], uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_service_routine_draft(uuid, text, jsonb, text, text, text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_service_routine_for_review(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_service_routine_review(uuid, text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.publish_service_routine_version(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.retire_service_routine_version(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_service_routine_applicability(uuid, text, text, text, text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_service_routine_preview(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_next_service_routine_draft(uuid, jsonb, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_service_routine_manufacturer_restrictions(uuid, text[], text[], uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_service_routine_draft(text, text, text, text, jsonb, text[], uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_service_routine_draft(uuid, text, jsonb, text, text, text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_service_routine_for_review(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_service_routine_review(uuid, text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.publish_service_routine_version(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.retire_service_routine_version(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_service_routine_applicability(uuid, text, text, text, text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_service_routine_preview(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_next_service_routine_draft(uuid, jsonb, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_service_routine_manufacturer_restrictions(uuid, text[], text[], uuid) TO authenticated, service_role;

