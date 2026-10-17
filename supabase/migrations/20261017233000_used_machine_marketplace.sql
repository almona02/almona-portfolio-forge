-- Used Machines Marketplace — free, public, no-login posting (B2B + C2C).
-- Slogan: "Simple & Fast". Anyone can post a machine with photos and contact info;
-- anyone can browse active listings and contact the seller directly (WhatsApp/phone).

CREATE TABLE public.used_machine_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 3 AND 160),
  price numeric NOT NULL CHECK (price >= 0),
  currency text NOT NULL DEFAULT 'EGP' CHECK (currency IN ('EGP','USD','EUR','SAR','AED','TRY')),
  location text NOT NULL CHECK (length(trim(location)) BETWEEN 2 AND 60),
  condition text NOT NULL CHECK (condition IN ('new','like-new','excellent','good','fair','needs-repair')),
  category text NOT NULL CHECK (length(trim(category)) BETWEEN 2 AND 60),
  year integer CHECK (year BETWEEN 1970 AND 2035),
  hours numeric CHECK (hours >= 0),
  description text NOT NULL CHECK (length(trim(description)) BETWEEN 10 AND 2000),
  contact_name text NOT NULL CHECK (length(trim(contact_name)) BETWEEN 2 AND 120),
  contact_phone text NOT NULL CHECK (length(trim(contact_phone)) BETWEEN 5 AND 30),
  contact_whatsapp text CHECK (length(contact_whatsapp) <= 30),
  images text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','sold','flagged','removed')),
  views integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX used_machine_listings_status_created_idx ON public.used_machine_listings(status, created_at DESC);
CREATE INDEX used_machine_listings_category_idx ON public.used_machine_listings(category);
CREATE INDEX used_machine_listings_location_idx ON public.used_machine_listings(location);
CREATE INDEX used_machine_listings_price_idx ON public.used_machine_listings(price);

ALTER TABLE public.used_machine_listings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.used_machine_listings FROM PUBLIC, anon, authenticated;

-- Public read (browse) and write (post) — the marketplace is open.
GRANT SELECT ON public.used_machine_listings TO anon, authenticated;
GRANT INSERT(title,price,currency,location,condition,category,year,hours,description,contact_name,contact_phone,contact_whatsapp,images)
  ON public.used_machine_listings TO anon, authenticated;
GRANT UPDATE(views,status) ON public.used_machine_listings TO anon, authenticated;
GRANT ALL ON public.used_machine_listings TO service_role;

-- Anyone can browse active listings.
CREATE POLICY used_machine_read_active ON public.used_machine_listings
  FOR SELECT TO anon, authenticated
  USING (status = 'active');

-- Anyone (anonymous or logged-in) can post a listing with 1..8 images.
CREATE POLICY used_machine_insert_open ON public.used_machine_listings
  FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'active' AND array_length(images, 1) BETWEEN 1 AND 8);

-- Anyone can bump views, mark sold, or flag (report) an active listing.
CREATE POLICY used_machine_update_open ON public.used_machine_listings
  FOR UPDATE TO anon, authenticated
  USING (status = 'active')
  WITH CHECK (status IN ('active','sold','flagged'));

-- Images bucket: public read, public upload.
INSERT INTO storage.buckets (id, name, public) VALUES ('used-machine-images', 'used-machine-images', true)
  ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "used-machine-images-public-read" ON storage.objects;
CREATE POLICY "used-machine-images-public-read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'used-machine-images');

DROP POLICY IF EXISTS "used-machine-images-open-upload" ON storage.objects;
CREATE POLICY "used-machine-images-open-upload" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'used-machine-images');

-- Atomic view counter (used by the frontend on listing detail open).
CREATE OR REPLACE FUNCTION public.increment_used_machine_views(listing_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.used_machine_listings SET views = views + 1 WHERE id = listing_id AND status = 'active';
$$;
REVOKE ALL ON FUNCTION public.increment_used_machine_views(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_used_machine_views(uuid) TO anon, authenticated;
