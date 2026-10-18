-- Auto-generate the next preventive visit after a visit is completed, following
-- the contract's visit_frequency, so the schedule continues without manual input.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE OR REPLACE FUNCTION public.generate_next_service_visit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_freq text;
  v_next date;
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    SELECT c.visit_frequency INTO v_freq FROM public.service_contracts c WHERE c.id = NEW.contract_id;
    IF v_freq IS NOT NULL AND NEW.scheduled_at IS NOT NULL THEN
      v_next := CASE v_freq
        WHEN 'weekly' THEN (NEW.scheduled_at + INTERVAL '7 days')::date
        WHEN 'biweekly' THEN (NEW.scheduled_at + INTERVAL '14 days')::date
        WHEN 'monthly' THEN (NEW.scheduled_at + INTERVAL '1 month')::date
        WHEN 'quarterly' THEN (NEW.scheduled_at + INTERVAL '3 months')::date
        WHEN 'biannual' THEN (NEW.scheduled_at + INTERVAL '6 months')::date
        WHEN 'annual' THEN (NEW.scheduled_at + INTERVAL '1 year')::date
        ELSE NULL
      END;
      IF v_next IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.service_visits v
        WHERE v.contract_id = NEW.contract_id AND v.scheduled_at = v_next AND v.status = 'scheduled'
      ) THEN
        INSERT INTO public.service_visits (contract_id, scheduled_at, status, type)
        VALUES (NEW.contract_id, v_next, 'scheduled', 'preventive');
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.generate_next_service_visit() FROM PUBLIC;

DROP TRIGGER IF EXISTS service_visit_generate_next ON public.service_visits;
CREATE TRIGGER service_visit_generate_next
  AFTER UPDATE OF status ON public.service_visits
  FOR EACH ROW EXECUTE FUNCTION public.generate_next_service_visit();

COMMIT;
