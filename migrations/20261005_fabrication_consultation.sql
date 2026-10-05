-- Apply in staging before enabling the consultation submission flow.
BEGIN;
CREATE TABLE IF NOT EXISTS public.fabrication_consultation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(name) BETWEEN 2 AND 120),
  phone text NOT NULL CHECK (phone ~ '^\+20[0-9]{10}$'),
  project_type text NOT NULL CHECK (project_type IN ('new-home', 'renovation', 'commercial', 'extension', 'replacement')),
  system text NOT NULL CHECK (system IN ('upvc', 'aluminum')),
  message text NOT NULL CHECK (length(message) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fabrication_consultation_phone_time ON public.fabrication_consultation_requests(phone, created_at);
ALTER TABLE public.fabrication_consultation_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fabrication_consultation_requests FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_fabrication_consultation(p_name text, p_phone text, p_project_type text, p_system text, p_message text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE receipt uuid;
BEGIN
  IF p_name IS NULL OR length(trim(p_name)) NOT BETWEEN 2 AND 120
    OR p_phone IS NULL OR p_phone !~ '^\+20[0-9]{10}$'
    OR p_project_type IS NULL OR p_project_type NOT IN ('new-home', 'renovation', 'commercial', 'extension', 'replacement')
    OR p_system IS NULL OR p_system NOT IN ('upvc', 'aluminum')
    OR p_message IS NULL OR length(trim(p_message)) > 2000 THEN
    RAISE EXCEPTION 'Invalid consultation request' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_phone, 0));
  IF (SELECT count(*) FROM public.fabrication_consultation_requests WHERE phone = p_phone AND created_at > now() - interval '1 hour') >= 3 THEN
    RAISE EXCEPTION 'Too many requests. Please contact us directly.' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO public.fabrication_consultation_requests(name, phone, project_type, system, message)
    VALUES (trim(p_name), p_phone, p_project_type, p_system, trim(p_message)) RETURNING id INTO receipt;
  RETURN receipt;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_fabrication_consultation(text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_fabrication_consultation(text, text, text, text, text) TO anon, authenticated;
COMMIT;
