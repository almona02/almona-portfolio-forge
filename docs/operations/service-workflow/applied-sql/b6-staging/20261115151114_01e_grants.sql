REVOKE ALL ON FUNCTION public.record_service_acknowledgment(uuid, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_service_acknowledgment(uuid, text, text, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.record_service_acknowledgment_unavailable(uuid, jsonb, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_service_acknowledgment_unavailable(uuid, jsonb, text, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.record_acknowledgment_disposition(uuid, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_acknowledgment_disposition(uuid, text, text, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.effective_acknowledgment_disposition(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.effective_acknowledgment_disposition(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.effective_acknowledgment(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.effective_acknowledgment(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.record_service_acknowledgment(uuid, text, text, uuid) FROM service_role;
REVOKE EXECUTE ON FUNCTION public.record_service_acknowledgment_unavailable(uuid, jsonb, text, uuid) FROM service_role;
REVOKE EXECUTE ON FUNCTION public.record_acknowledgment_disposition(uuid, text, text, uuid) FROM service_role;

COMMENT ON FUNCTION public.record_service_acknowledgment(uuid, text, text, uuid) IS
  'B6: ticket owner records accepted/refused for an exact issued revision (append-only).';
COMMENT ON FUNCTION public.record_service_acknowledgment_unavailable(uuid, jsonb, text, uuid) IS
  'B6: admin/support records unavailable with attributable contact evidence (no calendar hardcode).';
COMMENT ON FUNCTION public.record_acknowledgment_disposition(uuid, text, text, uuid) IS
  'B6: admin/support disposition for refused acknowledgment before closure.';

