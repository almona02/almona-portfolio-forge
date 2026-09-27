-- Forward repair for databases that already recorded the earlier migration.
-- Guest quotes are written by the backend service role; this adds no anon policy.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS company text,
  ADD COLUMN IF NOT EXISTS project_description text,
  ADD COLUMN IF NOT EXISTS urgency text DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS delivery_location text,
  ADD COLUMN IF NOT EXISTS special_requirements text,
  ADD COLUMN IF NOT EXISTS related_service_ticket_id uuid,
  ADD COLUMN IF NOT EXISTS machine_id uuid;
ALTER TABLE public.quotes ALTER COLUMN user_id DROP NOT NULL;

-- MAX()+1 collides across RLS-isolated users and concurrent requests.
-- Preserve existing numbers and seed a sequence while quote writes are locked.
LOCK TABLE public.quotes IN SHARE ROW EXCLUSIVE MODE;
CREATE SEQUENCE IF NOT EXISTS public.quote_number_seq;
SELECT setval('public.quote_number_seq', GREATEST(
  COALESCE((SELECT max(substring(quote_number FROM '^QT-([0-9]+)$')::bigint)
            FROM public.quotes WHERE quote_number ~ '^QT-[0-9]+$'), 0),
  (SELECT last_value FROM public.quote_number_seq)
), true);
REVOKE ALL ON SEQUENCE public.quote_number_seq FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.generate_quote_number()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE number_text text;
BEGIN
  number_text := nextval('public.quote_number_seq'::regclass)::text;
  RETURN 'QT-' || lpad(number_text, greatest(6, length(number_text)), '0');
END;
$$;
REVOKE ALL ON FUNCTION public.generate_quote_number() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_quote_number() TO authenticated, service_role;

-- The v2 API accepts external service codes and unpriced enquiries, whereas
-- the original table only described fully priced product lines.
ALTER TABLE public.quote_items
  ADD COLUMN IF NOT EXISTS service_id text,
  ADD COLUMN IF NOT EXISTS price_pending boolean NOT NULL DEFAULT false;
CREATE OR REPLACE FUNCTION public.normalize_quote_api_item()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE product_record record;
BEGIN
  IF NEW.product_id IS NOT NULL THEN
    SELECT name_ar, name_en, sku INTO product_record
    FROM public.products WHERE id = NEW.product_id;
    IF FOUND THEN
      NEW.product_name_ar := COALESCE(NEW.product_name_ar, product_record.name_ar);
      NEW.product_name_en := COALESCE(NEW.product_name_en, product_record.name_en);
      NEW.product_sku := COALESCE(NEW.product_sku, product_record.sku);
    END IF;
  ELSIF NEW.service_id IS NOT NULL THEN
    NEW.product_name_ar := COALESCE(NEW.product_name_ar, NEW.service_id);
    NEW.product_name_en := COALESCE(NEW.product_name_en, NEW.service_id);
    NEW.product_sku := COALESCE(NEW.product_sku, NEW.service_id);
  END IF;
  NEW.price_pending := NEW.price_pending OR NEW.unit_price IS NULL;
  NEW.unit_price := COALESCE(NEW.unit_price, 0);
  NEW.total_price := COALESCE(NEW.total_price, NEW.unit_price * NEW.quantity);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS normalize_quote_api_item ON public.quote_items;
CREATE TRIGGER normalize_quote_api_item BEFORE INSERT ON public.quote_items
  FOR EACH ROW EXECUTE FUNCTION public.normalize_quote_api_item();

-- Also support the currently deployed API while its code update rolls out.
CREATE OR REPLACE FUNCTION public.normalize_quote_api_header()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.total_amount := COALESCE(NEW.total_amount, 0);
  IF NEW.contact_info IS NULL AND NEW.contact_email IS NOT NULL THEN
    NEW.contact_info := jsonb_build_object('name', NEW.contact_name,
      'email', NEW.contact_email, 'phone', NEW.contact_phone, 'company', NEW.company);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS normalize_quote_api_header ON public.quotes;
CREATE TRIGGER normalize_quote_api_header BEFORE INSERT ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.normalize_quote_api_header();

-- Keep legacy contact_info readers useful for API-created quotes as well.
-- Existing values always win; no customer contact data is overwritten.
UPDATE public.quotes
SET contact_name = COALESCE(contact_name, contact_info->>'name'),
    contact_email = COALESCE(contact_email, contact_info->>'email'),
    contact_phone = COALESCE(contact_phone, contact_info->>'phone'),
    company = COALESCE(company, contact_info->>'company')
WHERE contact_info IS NOT NULL
  AND (contact_name IS NULL OR contact_email IS NULL
       OR contact_phone IS NULL OR company IS NULL);

NOTIFY pgrst, 'reload schema';
COMMIT;
