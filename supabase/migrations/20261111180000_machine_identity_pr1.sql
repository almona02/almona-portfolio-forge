-- Machine identity PR1 (Wonder v0.2 - narrow slice)
-- Character: additive schema + constraint relaxation + staging schema-convergence.
-- Reuses public.machines.id and service_tickets.machine_id (prod). Does not copy production data.
-- Staging apply authorized only with explicit supervisor approval; production apply unauthorized.
--
-- Recovery note: after null/duplicate serials exist, restoring UNIQUE(serial_number) / NOT NULL
-- requires a human remediation plan - never silent deletion or invented serials.

SET lock_timeout = '5s';

-- ---------------------------------------------------------------------------
-- 0) Minimal auth stubs ONLY when absent (disposable DBs).
--    Never CREATE OR REPLACE hosted auth.uid / auth.jwt.
--    Never issue CREATE TABLE IF NOT EXISTS against hosted auth schema:
--    Postgres still requires CREATE privilege on schema auth for that form.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
    CREATE SCHEMA auth;
  END IF;

  -- Hosted Supabase already has auth.users; skip entirely when present.
  IF to_regclass('auth.users') IS NULL THEN
    CREATE TABLE auth.users (
      id uuid PRIMARY KEY
    );
  END IF;

  IF to_regprocedure('auth.uid()') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION auth.uid()
      RETURNS uuid
      LANGUAGE sql
      STABLE
      AS $body$
        SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
      $body$
    $fn$;
  END IF;

  IF to_regprocedure('auth.jwt()') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION auth.jwt()
      RETURNS jsonb
      LANGUAGE sql
      STABLE
      AS $body$
        SELECT COALESCE(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
      $body$
    $fn$;
  END IF;
END $$;

-- Role used by Supabase RLS (no-op on hosted when already present)
DO $$ BEGIN
  CREATE ROLE authenticated NOINHERIT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- profiles stub for disposable DBs only; never touch an existing hosted profiles table
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NULL THEN
    CREATE TABLE public.profiles (
      id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      role text
    );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1) Schema convergence: public.machines (staging-shaped missing registry)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.machines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  model text NOT NULL,
  serial_number text,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  purchase_date date,
  warranty_expiry date,
  created_at timestamptz DEFAULT timezone('utc', now()),
  updated_at timestamptz DEFAULT timezone('utc', now()),
  installation_date date,
  warranty_valid boolean DEFAULT false,
  photo_urls text[]
);

-- Prod-shaped DBs already have UNIQUE(serial_number) and NOT NULL - relaxed below.
-- New staging-shaped table is created without the hard unique.

CREATE INDEX IF NOT EXISTS idx_machines_owner_id ON public.machines (owner_id);

ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;

-- Owner may SELECT/INSERT own rows. Protected identity columns cannot be
-- client-updated (trigger below); non-identity fields may UPDATE.
DROP POLICY IF EXISTS machines_manage_own ON public.machines;
DROP POLICY IF EXISTS machines_select_own ON public.machines;
DROP POLICY IF EXISTS machines_insert_own ON public.machines;
DROP POLICY IF EXISTS machines_update_own_nonidentity ON public.machines;

CREATE POLICY machines_select_own ON public.machines
  FOR SELECT TO authenticated
  USING (
    COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
    AND owner_id = auth.uid()
  );

CREATE POLICY machines_insert_own ON public.machines
  FOR INSERT TO authenticated
  WITH CHECK (
    COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
    AND owner_id = auth.uid()
  );

CREATE POLICY machines_update_own_nonidentity ON public.machines
  FOR UPDATE TO authenticated
  USING (
    COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
    AND owner_id = auth.uid()
  )
  WITH CHECK (
    COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
    AND owner_id = auth.uid()
  );

-- Staff read for duplicate reconciliation (support/admin profiles)
DROP POLICY IF EXISTS machines_staff_select ON public.machines;
CREATE POLICY machines_staff_select ON public.machines
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role::text IN ('admin', 'support')
    )
  );

-- ---------------------------------------------------------------------------
-- 2) Additive identity columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.machines
  ADD COLUMN IF NOT EXISTS brand text,
  ADD COLUMN IF NOT EXISTS catalog_model_id text,
  ADD COLUMN IF NOT EXISTS catalog_uncertain boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS catalog_link_status text NOT NULL DEFAULT 'uncatalogued',
  ADD COLUMN IF NOT EXISTS serial_number_raw text,
  ADD COLUMN IF NOT EXISTS serial_canonical text,
  ADD COLUMN IF NOT EXISTS serial_normalization_version text,
  ADD COLUMN IF NOT EXISTS provisional_asset_ref text,
  ADD COLUMN IF NOT EXISTS identity_lifecycle text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS identity_review_status text NOT NULL DEFAULT 'clear',
  ADD COLUMN IF NOT EXISTS identity_confidence text NOT NULL DEFAULT 'legacy_incomplete',
  ADD COLUMN IF NOT EXISTS manufacturer_validation_status text NOT NULL DEFAULT 'unchecked',
  ADD COLUMN IF NOT EXISTS legacy_gaps jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS registration_source text,
  ADD COLUMN IF NOT EXISTS registration_idempotency_key text,
  ADD COLUMN IF NOT EXISTS site_label text;

-- Explicit catalog axis: linked | uncatalogued | uncertain (v0.3). catalog_uncertain is a
-- convenience mirror of (status = 'uncertain') only - status is authoritative.
ALTER TABLE public.machines DROP CONSTRAINT IF EXISTS machines_catalog_link_status_chk;
ALTER TABLE public.machines
  ADD CONSTRAINT machines_catalog_link_status_chk
  CHECK (catalog_link_status IN ('linked', 'uncatalogued', 'uncertain'));

-- Checks (idempotent via drop/create)
ALTER TABLE public.machines DROP CONSTRAINT IF EXISTS machines_identity_lifecycle_chk;
ALTER TABLE public.machines
  ADD CONSTRAINT machines_identity_lifecycle_chk
  CHECK (identity_lifecycle IN ('active', 'retired'));

ALTER TABLE public.machines DROP CONSTRAINT IF EXISTS machines_identity_review_status_chk;
ALTER TABLE public.machines
  ADD CONSTRAINT machines_identity_review_status_chk
  CHECK (identity_review_status IN ('clear', 'duplicate_review', 'serial_disputed'));

ALTER TABLE public.machines DROP CONSTRAINT IF EXISTS machines_identity_confidence_chk;
ALTER TABLE public.machines
  ADD CONSTRAINT machines_identity_confidence_chk
  CHECK (identity_confidence IN (
    'verified', 'unverified', 'unchecked', 'provisional', 'legacy_incomplete'
  ));

ALTER TABLE public.machines DROP CONSTRAINT IF EXISTS machines_mfr_validation_chk;
ALTER TABLE public.machines
  ADD CONSTRAINT machines_mfr_validation_chk
  CHECK (manufacturer_validation_status IN (
    'verified', 'unverified', 'unchecked', 'not_applicable'
  ));

-- ---------------------------------------------------------------------------
-- 3) Constraint relaxation (describe accurately: not a table rewrite)
-- ---------------------------------------------------------------------------
ALTER TABLE public.machines DROP CONSTRAINT IF EXISTS machines_serial_number_key;
DROP INDEX IF EXISTS public.machines_serial_number_key;

-- Allow missing-plate provisional registrations
ALTER TABLE public.machines ALTER COLUMN serial_number DROP NOT NULL;

-- Non-unique match aids (include retired for authorized detection)
CREATE INDEX IF NOT EXISTS idx_machines_brand_serial_canonical
  ON public.machines (brand, serial_canonical)
  WHERE serial_canonical IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_machines_serial_canonical
  ON public.machines (serial_canonical)
  WHERE serial_canonical IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_machines_provisional_asset_ref
  ON public.machines (provisional_asset_ref)
  WHERE provisional_asset_ref IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_machines_owner_idempotency
  ON public.machines (owner_id, registration_idempotency_key)
  WHERE registration_idempotency_key IS NOT NULL AND owner_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 4) Grandfather backfill (no invented dates / serials)
-- ---------------------------------------------------------------------------
UPDATE public.machines
SET
  serial_number_raw = COALESCE(serial_number_raw, serial_number),
  serial_canonical = COALESCE(
    serial_canonical,
    CASE
      WHEN serial_number IS NULL OR btrim(serial_number) = '' THEN NULL
      ELSE upper(btrim(serial_number))
    END
  ),
  serial_normalization_version = COALESCE(serial_normalization_version, 'v1_retain_separators'),
  manufacturer_validation_status = COALESCE(manufacturer_validation_status, 'unchecked'),
  identity_confidence = CASE
    WHEN identity_confidence IS DISTINCT FROM 'legacy_incomplete'
         AND identity_confidence IS NOT NULL THEN identity_confidence
    ELSE 'legacy_incomplete'
  END,
  catalog_link_status = CASE
    WHEN catalog_link_status IS DISTINCT FROM 'uncatalogued'
         AND catalog_link_status IS NOT NULL THEN catalog_link_status
    WHEN catalog_model_id IS NOT NULL AND coalesce(catalog_uncertain, false) = false THEN 'linked'
    WHEN coalesce(catalog_uncertain, false) = true THEN 'uncertain'
    WHEN catalog_model_id IS NULL THEN 'uncatalogued'
    ELSE 'uncertain'
  END,
  catalog_uncertain = CASE
    WHEN catalog_model_id IS NOT NULL AND coalesce(catalog_uncertain, false) = false THEN false
    WHEN coalesce(catalog_uncertain, false) = true THEN true
    WHEN catalog_model_id IS NULL THEN false
    ELSE true
  END,
  legacy_gaps = CASE
    WHEN jsonb_typeof(legacy_gaps) = 'array' AND legacy_gaps <> '[]'::jsonb THEN legacy_gaps
    ELSE (
      COALESCE(legacy_gaps, '[]'::jsonb)
      || CASE WHEN installation_date IS NULL THEN '["installation_date_unknown"]'::jsonb ELSE '[]'::jsonb END
      || CASE WHEN brand IS NULL THEN '["brand_unknown"]'::jsonb ELSE '[]'::jsonb END
      || CASE WHEN catalog_model_id IS NULL THEN '["catalog_unlinked"]'::jsonb ELSE '[]'::jsonb END
    )
  END
WHERE TRUE;

-- ---------------------------------------------------------------------------
-- 5) service_tickets.machine_id convergence (reuse prod column; add if missing)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.service_tickets') IS NOT NULL THEN
    ALTER TABLE public.service_tickets
      ADD COLUMN IF NOT EXISTS machine_id uuid;
    -- Add FK only when machines exists (always true after section 1)
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'service_tickets_machine_id_fkey'
    ) THEN
      ALTER TABLE public.service_tickets
        ADD CONSTRAINT service_tickets_machine_id_fkey
        FOREIGN KEY (machine_id) REFERENCES public.machines(id) ON DELETE SET NULL;
    END IF;
    CREATE INDEX IF NOT EXISTS idx_service_tickets_machine_id
      ON public.service_tickets (machine_id)
      WHERE machine_id IS NOT NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 6) Duplicate cases + identity audit (append-oriented)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.machine_duplicate_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  brand text,
  serial_canonical text,
  serial_raw text,
  candidate_machine_id uuid REFERENCES public.machines(id) ON DELETE SET NULL,
  incoming_owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN (
      'open', 'resolved_same_machine', 'resolved_distinct',
      'resolved_typing_error', 'dismissed'
    )),
  resolution_notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  separator_insensitive_flag boolean NOT NULL DEFAULT false
);

ALTER TABLE public.machine_duplicate_cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS machine_duplicate_cases_staff ON public.machine_duplicate_cases;
CREATE POLICY machine_duplicate_cases_staff ON public.machine_duplicate_cases
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role::text IN ('admin', 'support')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role::text IN ('admin', 'support')
    )
  );

CREATE TABLE IF NOT EXISTS public.machine_identity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  occurred_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  actor_id uuid,
  actor_role text,
  event_type text NOT NULL,
  provenance text NOT NULL,
  before_values jsonb,
  after_values jsonb,
  reason text,
  evidence_refs jsonb,
  -- staff_only: foreign duplicate cases and other non-disclosing audit; never owner-visible
  visibility text NOT NULL DEFAULT 'owner_visible'
    CHECK (visibility IN ('owner_visible', 'staff_only'))
);

-- Idempotent add for DBs that created the table before visibility existed
ALTER TABLE public.machine_identity_events
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'owner_visible';

ALTER TABLE public.machine_identity_events DROP CONSTRAINT IF EXISTS machine_identity_events_visibility_chk;
ALTER TABLE public.machine_identity_events
  ADD CONSTRAINT machine_identity_events_visibility_chk
  CHECK (visibility IN ('owner_visible', 'staff_only'));

CREATE INDEX IF NOT EXISTS idx_machine_identity_events_machine
  ON public.machine_identity_events (machine_id, occurred_at DESC);

ALTER TABLE public.machine_identity_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS machine_identity_events_owner_select ON public.machine_identity_events;
CREATE POLICY machine_identity_events_owner_select ON public.machine_identity_events
  FOR SELECT TO authenticated
  USING (
    (
      visibility = 'owner_visible'
      AND EXISTS (
        SELECT 1 FROM public.machines m
        WHERE m.id = machine_id AND m.owner_id = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role::text IN ('admin', 'support')
    )
  );

-- Inserts happen via SECURITY DEFINER RPCs (table owner / definer).

-- ---------------------------------------------------------------------------
-- 7) Normalization helpers (retain separators in default canonical)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.machine_serial_canonical_v1(p_raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_raw IS NULL OR btrim(p_raw) = '' THEN NULL
    ELSE upper(btrim(p_raw))
  END;
$$;

-- Separator-insensitive form: review-flag only - never identity assertion / auto-link
CREATE OR REPLACE FUNCTION public.machine_serial_separator_insensitive_v1(p_raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_raw IS NULL OR btrim(p_raw) = '' THEN NULL
    ELSE regexp_replace(upper(btrim(p_raw)), '[\s\-/._]+', '', 'g')
  END;
$$;

CREATE OR REPLACE FUNCTION public.machine_allocate_alm_ref()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v text;
BEGIN
  LOOP
    v := 'ALM-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.machines WHERE provisional_asset_ref = v
    );
  END LOOP;
  RETURN v;
END;
$$;

CREATE OR REPLACE FUNCTION public.machine_actor_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT p.role::text
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.machine_is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(public.machine_actor_role() IN ('admin', 'support'), false);
$$;

-- Resolve explicit catalog_link_status from inputs (authoritative for PR1).
CREATE OR REPLACE FUNCTION public.machine_resolve_catalog_link_status(
  p_catalog_model_id text,
  p_catalog_uncertain boolean DEFAULT NULL,
  p_catalog_link_status text DEFAULT NULL
)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_catalog_link_status IN ('linked', 'uncatalogued', 'uncertain') THEN p_catalog_link_status
    WHEN nullif(btrim(p_catalog_model_id), '') IS NOT NULL
         AND coalesce(p_catalog_uncertain, false) = false THEN 'linked'
    WHEN coalesce(p_catalog_uncertain, false) = true THEN 'uncertain'
    ELSE 'uncatalogued'
  END;
$$;

-- UUID immutability + block silent identity edits (corrections deferred in PR1).
-- Future authorized correction RPC may SET LOCAL machine_identity.allow_protected_update = 'on'.
CREATE OR REPLACE FUNCTION public.machines_enforce_identity_guards()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'machines.id is immutable'
      USING ERRCODE = '22023';
  END IF;

  IF TG_OP = 'UPDATE'
     AND current_setting('machine_identity.allow_protected_update', true) IS DISTINCT FROM 'on' THEN
    IF NEW.serial_number IS DISTINCT FROM OLD.serial_number
       OR NEW.serial_number_raw IS DISTINCT FROM OLD.serial_number_raw
       OR NEW.serial_canonical IS DISTINCT FROM OLD.serial_canonical
       OR NEW.serial_normalization_version IS DISTINCT FROM OLD.serial_normalization_version
       OR NEW.brand IS DISTINCT FROM OLD.brand
       OR NEW.catalog_model_id IS DISTINCT FROM OLD.catalog_model_id
       OR NEW.catalog_uncertain IS DISTINCT FROM OLD.catalog_uncertain
       OR NEW.catalog_link_status IS DISTINCT FROM OLD.catalog_link_status
       OR NEW.provisional_asset_ref IS DISTINCT FROM OLD.provisional_asset_ref
       OR NEW.identity_lifecycle IS DISTINCT FROM OLD.identity_lifecycle
       OR NEW.identity_review_status IS DISTINCT FROM OLD.identity_review_status
       OR NEW.identity_confidence IS DISTINCT FROM OLD.identity_confidence
       OR NEW.manufacturer_validation_status IS DISTINCT FROM OLD.manufacturer_validation_status
       OR NEW.owner_id IS DISTINCT FROM OLD.owner_id
       OR NEW.registration_idempotency_key IS DISTINCT FROM OLD.registration_idempotency_key
       OR NEW.legacy_gaps IS DISTINCT FROM OLD.legacy_gaps
       OR NEW.registration_source IS DISTINCT FROM OLD.registration_source
    THEN
      RAISE EXCEPTION
        'Protected identity fields are not client-editable in PR1; identity corrections deferred'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_machines_identity_guards ON public.machines;
CREATE TRIGGER trg_machines_identity_guards
  BEFORE UPDATE ON public.machines
  FOR EACH ROW
  EXECUTE FUNCTION public.machines_enforce_identity_guards();

-- ---------------------------------------------------------------------------
-- 8) Register machine (idempotent, authz-safe duplicates)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_machine_identity(
  p_name text,
  p_model text,
  p_serial_raw text DEFAULT NULL,
  p_brand text DEFAULT NULL,
  p_catalog_model_id text DEFAULT NULL,
  p_catalog_uncertain boolean DEFAULT false,
  p_installation_date date DEFAULT NULL,
  p_warranty_valid boolean DEFAULT NULL,
  p_photo_urls text[] DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL,
  p_registration_source text DEFAULT 'web_registration',
  p_site_label text DEFAULT NULL,
  p_missing_serial_reason text DEFAULT NULL,
  p_catalog_link_status text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text := public.machine_actor_role();
  v_canon text;
  v_sep text;
  v_existing public.machines%ROWTYPE;
  v_other public.machines%ROWTYPE;
  v_new public.machines%ROWTYPE;
  v_case_id uuid;
  v_confidence text;
  v_review text := 'clear';
  v_alm text;
  v_payload_fp text;
  v_catalog_status text;
  v_catalog_uncertain boolean;
  v_own_sep_review boolean := false;
  v_foreign_exact boolean := false;
  v_foreign_sep boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  v_canon := public.machine_serial_canonical_v1(p_serial_raw);
  v_sep := public.machine_serial_separator_insensitive_v1(p_serial_raw);
  v_catalog_status := public.machine_resolve_catalog_link_status(
    p_catalog_model_id, p_catalog_uncertain, p_catalog_link_status
  );
  IF v_catalog_status = 'linked' AND nullif(btrim(p_catalog_model_id), '') IS NULL THEN
    RAISE EXCEPTION 'catalog_link_status linked requires catalog_model_id' USING ERRCODE = '22023';
  END IF;
  v_catalog_uncertain := (v_catalog_status = 'uncertain');
  v_payload_fp := md5(concat_ws('|',
    coalesce(p_name, ''), coalesce(p_model, ''), coalesce(v_canon, ''),
    coalesce(p_brand, ''), coalesce(p_catalog_model_id, ''),
    coalesce(v_catalog_status, ''), coalesce(p_idempotency_key, '')
  ));

  -- Idempotency: same actor + key -> same machine; conflicting payload rejected
  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_existing
    FROM public.machines m
    WHERE m.owner_id = v_uid
      AND m.registration_idempotency_key = p_idempotency_key
    LIMIT 1;

    IF FOUND THEN
      IF coalesce(v_existing.serial_canonical, '') IS DISTINCT FROM coalesce(v_canon, '')
         OR coalesce(v_existing.model, '') IS DISTINCT FROM coalesce(p_model, '')
         OR coalesce(v_existing.brand, '') IS DISTINCT FROM coalesce(p_brand, '') THEN
        RAISE EXCEPTION 'Idempotency key reused with conflicting payload' USING ERRCODE = '22023';
      END IF;

      INSERT INTO public.machine_identity_events (
        machine_id, actor_id, actor_role, event_type, provenance,
        after_values, reason, visibility
      ) VALUES (
        v_existing.id, v_uid, v_role, 'idempotent_replay', p_registration_source,
        jsonb_build_object('idempotency_key', p_idempotency_key),
        'concurrent or retried registration',
        'owner_visible'
      );

      RETURN jsonb_build_object(
        'machine_id', v_existing.id,
        'idempotent', true,
        'identity_review_status', v_existing.identity_review_status,
        'identity_confidence', v_existing.identity_confidence,
        'catalog_link_status', v_existing.catalog_link_status,
        'provisional_asset_ref', CASE
          WHEN public.machine_is_staff() THEN v_existing.provisional_asset_ref
          ELSE NULL
        END
      );
    END IF;
  END IF;

  IF v_canon IS NULL THEN
    IF p_missing_serial_reason IS NULL OR btrim(p_missing_serial_reason) = '' THEN
      RAISE EXCEPTION 'missing_serial_reason required when serial is absent' USING ERRCODE = '22023';
    END IF;
    v_confidence := 'provisional';
    v_alm := public.machine_allocate_alm_ref();
  ELSE
    v_confidence := 'unchecked';
    v_alm := NULL;
  END IF;

  -- Own exact canonical match -> return same machine (non-conflicting retry without key)
  IF v_canon IS NOT NULL THEN
    SELECT * INTO v_existing
    FROM public.machines m
    WHERE m.owner_id = v_uid
      AND m.serial_canonical = v_canon
      AND coalesce(m.brand, '') = coalesce(p_brand, '')
    ORDER BY m.created_at ASC
    LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'machine_id', v_existing.id,
        'idempotent', true,
        'identity_review_status', v_existing.identity_review_status,
        'identity_confidence', v_existing.identity_confidence,
        'catalog_link_status', v_existing.catalog_link_status,
        'provisional_asset_ref', CASE
          WHEN public.machine_is_staff() THEN v_existing.provisional_asset_ref
          ELSE NULL
        END
      );
    END IF;

    -- Own separator-insensitive advisory (authorized records only) may open local review
    SELECT EXISTS (
      SELECT 1 FROM public.machines m
      WHERE m.owner_id = v_uid
        AND public.machine_serial_separator_insensitive_v1(m.serial_number_raw) = v_sep
        AND m.serial_canonical IS DISTINCT FROM v_canon
        AND coalesce(m.brand, '') = coalesce(p_brand, '')
    ) INTO v_own_sep_review;
    IF v_own_sep_review THEN
      v_review := 'duplicate_review';
    END IF;
  END IF;

  -- Foreign exact / sep-insensitive: staff-only case. Customer-visible review/status
  -- must NOT change in a way that discloses the foreign match.
  IF v_canon IS NOT NULL THEN
    SELECT * INTO v_other
    FROM public.machines m
    WHERE m.serial_canonical = v_canon
      AND coalesce(m.brand, '') = coalesce(p_brand, '')
      AND m.owner_id IS DISTINCT FROM v_uid
    ORDER BY m.created_at ASC
    LIMIT 1;

    IF FOUND THEN
      v_foreign_exact := true;
      INSERT INTO public.machine_duplicate_cases (
        brand, serial_canonical, serial_raw, candidate_machine_id,
        incoming_owner_id, created_by, separator_insensitive_flag
      ) VALUES (
        p_brand, v_canon, p_serial_raw, v_other.id, v_uid, v_uid, false
      ) RETURNING id INTO v_case_id;
    ELSIF v_sep IS NOT NULL THEN
      IF EXISTS (
        SELECT 1 FROM public.machines m
        WHERE public.machine_serial_separator_insensitive_v1(m.serial_number_raw) = v_sep
          AND m.serial_canonical IS DISTINCT FROM v_canon
          AND coalesce(m.brand, '') = coalesce(p_brand, '')
          AND m.owner_id IS DISTINCT FROM v_uid
      ) THEN
        v_foreign_sep := true;
        INSERT INTO public.machine_duplicate_cases (
          brand, serial_canonical, serial_raw, candidate_machine_id,
          incoming_owner_id, created_by, separator_insensitive_flag
        ) VALUES (
          p_brand, v_canon, p_serial_raw, NULL, v_uid, v_uid, true
        ) RETURNING id INTO v_case_id;
      END IF;
    END IF;
  END IF;

  INSERT INTO public.machines (
    name, model, serial_number, serial_number_raw, serial_canonical,
    serial_normalization_version, brand, catalog_model_id, catalog_uncertain,
    catalog_link_status,
    owner_id, installation_date, warranty_valid, photo_urls,
    provisional_asset_ref, identity_lifecycle, identity_review_status,
    identity_confidence, manufacturer_validation_status, legacy_gaps,
    registration_source, registration_idempotency_key, site_label
  ) VALUES (
    coalesce(nullif(btrim(p_name), ''), coalesce(p_model, 'Machine')),
    coalesce(nullif(btrim(p_model), ''), 'unknown'),
    CASE WHEN v_canon IS NULL THEN NULL ELSE btrim(p_serial_raw) END,
    CASE WHEN v_canon IS NULL THEN NULL ELSE btrim(p_serial_raw) END,
    v_canon,
    'v1_retain_separators',
    nullif(btrim(p_brand), ''),
    CASE WHEN v_catalog_status = 'linked' THEN nullif(btrim(p_catalog_model_id), '') ELSE NULL END,
    v_catalog_uncertain,
    v_catalog_status,
    v_uid,
    p_installation_date,
    coalesce(p_warranty_valid, false),
    p_photo_urls,
    v_alm,
    'active',
    v_review,
    v_confidence,
    CASE WHEN v_canon IS NULL THEN 'not_applicable' ELSE 'unchecked' END,
    CASE
      WHEN v_canon IS NULL THEN jsonb_build_array('manufacturer_serial_not_recorded', p_missing_serial_reason)
      WHEN v_catalog_status <> 'linked' THEN jsonb_build_array('catalog_unlinked')
      ELSE '[]'::jsonb
    END,
    p_registration_source,
    p_idempotency_key,
    p_site_label
  )
  RETURNING * INTO v_new;

  -- Owner-visible registration event: no foreign case ids / match indicators
  INSERT INTO public.machine_identity_events (
    machine_id, actor_id, actor_role, event_type, provenance,
    after_values, reason, visibility
  ) VALUES (
    v_new.id, v_uid, v_role, 'registered', p_registration_source,
    jsonb_build_object(
      'identity_confidence', v_new.identity_confidence,
      'identity_review_status', v_new.identity_review_status,
      'catalog_link_status', v_new.catalog_link_status,
      'payload_fp', v_payload_fp
    ),
    p_missing_serial_reason,
    'owner_visible'
  );

  -- Staff-only duplicate-case trail (never customer-visible history)
  IF v_case_id IS NOT NULL THEN
    INSERT INTO public.machine_identity_events (
      machine_id, actor_id, actor_role, event_type, provenance,
      after_values, reason, visibility
    ) VALUES (
      v_new.id, v_uid, v_role, 'duplicate_case_opened', 'duplicate_detection',
      jsonb_build_object(
        'duplicate_case_id', v_case_id,
        'match_kind', CASE
          WHEN v_foreign_exact THEN 'foreign_exact_canonical'
          WHEN v_foreign_sep THEN 'foreign_separator_insensitive'
          ELSE 'unspecified'
        END,
        'separator_insensitive_flag', v_foreign_sep,
        -- candidate id is staff-only; never returned to customers
        'candidate_machine_id', CASE WHEN v_foreign_exact THEN v_other.id ELSE NULL END
      ),
      'Staff review case; customer response unchanged',
      'staff_only'
    );
  END IF;

  -- Customer response depends only on authorized (own) review state.
  -- Foreign matches must not flip needs_staff_review / review status here.
  RETURN jsonb_build_object(
    'machine_id', v_new.id,
    'idempotent', false,
    'identity_review_status', v_new.identity_review_status,
    'identity_confidence', v_new.identity_confidence,
    'catalog_link_status', v_new.catalog_link_status,
    'provisional_asset_ref', CASE
      WHEN public.machine_is_staff() THEN v_new.provisional_asset_ref
      ELSE NULL
    END,
    'needs_staff_review', (v_review = 'duplicate_review' AND v_own_sep_review),
    'message', 'registered'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.register_machine_identity FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_machine_identity TO authenticated;

-- ---------------------------------------------------------------------------
-- 9) Authorized duplicate detection (includes retired)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.machine_duplicate_detect(
  p_serial_raw text,
  p_brand text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_canon text := public.machine_serial_canonical_v1(p_serial_raw);
  v_sep text := public.machine_serial_separator_insensitive_v1(p_serial_raw);
  v_staff boolean := public.machine_is_staff();
  v_own jsonb := '[]'::jsonb;
  v_staff_hits jsonb := '[]'::jsonb;
  v_flag_own boolean := false;
  v_flag_staff boolean := false;
  v_foreign_exact boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF v_canon IS NULL THEN
    RETURN jsonb_build_object(
      'own_matches', '[]'::jsonb,
      'staff_matches', '[]'::jsonb,
      'review_flag_separator_insensitive', false,
      'foreign_match_exists', NULL
    );
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'machine_id', m.id,
    'identity_lifecycle', m.identity_lifecycle,
    'identity_review_status', m.identity_review_status,
    'model', m.model
  ) ORDER BY m.created_at), '[]'::jsonb)
  INTO v_own
  FROM public.machines m
  WHERE m.owner_id = v_uid
    AND m.serial_canonical = v_canon
    AND coalesce(m.brand, '') = coalesce(p_brand, '');

  -- Customer-visible sep flag: authorized (own) records only
  SELECT EXISTS (
    SELECT 1 FROM public.machines m
    WHERE m.owner_id = v_uid
      AND public.machine_serial_separator_insensitive_v1(m.serial_number_raw) = v_sep
      AND m.serial_canonical IS DISTINCT FROM v_canon
      AND coalesce(m.brand, '') = coalesce(p_brand, '')
  ) INTO v_flag_own;

  IF v_staff THEN
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'machine_id', m.id,
      'identity_lifecycle', m.identity_lifecycle,
      'identity_review_status', m.identity_review_status,
      'model', m.model,
      'registration_year', extract(year FROM m.created_at)::int,
      'masked_serial', CASE
        WHEN m.serial_number_raw IS NULL THEN NULL
        WHEN length(m.serial_number_raw) <= 4 THEN '****'
        ELSE repeat('*', greatest(length(m.serial_number_raw) - 4, 0)) || right(m.serial_number_raw, 4)
      END
      -- owner_id intentionally omitted from default staff list payload for least disclosure
    ) ORDER BY m.created_at), '[]'::jsonb)
    INTO v_staff_hits
    FROM public.machines m
    WHERE m.serial_canonical = v_canon
      AND coalesce(m.brand, '') = coalesce(p_brand, '');
    -- Includes retired by design (no lifecycle filter)

    SELECT EXISTS (
      SELECT 1 FROM public.machines m
      WHERE public.machine_serial_separator_insensitive_v1(m.serial_number_raw) = v_sep
        AND m.serial_canonical IS DISTINCT FROM v_canon
        AND coalesce(m.brand, '') = coalesce(p_brand, '')
    ) INTO v_flag_staff;

    SELECT EXISTS (
      SELECT 1 FROM public.machines m
      WHERE m.serial_canonical = v_canon
        AND coalesce(m.brand, '') = coalesce(p_brand, '')
        AND m.owner_id IS DISTINCT FROM v_uid
    ) INTO v_foreign_exact;
  END IF;

  RETURN jsonb_build_object(
    'own_matches', v_own,
    'staff_matches', CASE WHEN v_staff THEN v_staff_hits ELSE '[]'::jsonb END,
    -- Customers: own-only sep flag. Staff: fleet advisory flag.
    'review_flag_separator_insensitive', CASE
      WHEN v_staff THEN v_flag_staff
      ELSE v_flag_own
    END,
    -- Cross-customer existence never returned to non-staff (NULL, not false):
    'foreign_match_exists', CASE WHEN v_staff THEN v_foreign_exact ELSE NULL END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.machine_duplicate_detect FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.machine_duplicate_detect TO authenticated;

-- ---------------------------------------------------------------------------
-- 10) Ticket - machine link with server-side access check
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.link_ticket_machine(
  p_ticket_id uuid,
  p_machine_id uuid
)
RETURNS public.service_tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text := public.machine_actor_role();
  v_ticket public.service_tickets%ROWTYPE;
  v_machine public.machines%ROWTYPE;
  v_allowed boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_ticket FROM public.service_tickets WHERE id = p_ticket_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_machine FROM public.machines WHERE id = p_machine_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Machine not found' USING ERRCODE = 'P0002';
  END IF;

  -- PR1 ticket-link matrix (technician linking explicitly deferred):
  --   customer (ticket owner) + own machine -> allow
  --   admin / support -> allow
  --   technician (assigned or otherwise) -> deny in PR1
  IF v_role = 'technician' THEN
    RAISE EXCEPTION 'Technician ticket-machine linking deferred in PR1'
      USING ERRCODE = '42501';
  END IF;

  IF v_ticket.user_id = v_uid OR v_role IN ('admin', 'support') THEN
    NULL; -- ticket ok
  ELSE
    RAISE EXCEPTION 'Not authorized for ticket' USING ERRCODE = '42501';
  END IF;

  -- Machine access: owner or staff. Knowing UUID never authorizes alone for customers.
  IF v_machine.owner_id = v_uid OR v_role IN ('admin', 'support') THEN
    v_allowed := true;
  END IF;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Not authorized for machine' USING ERRCODE = '42501';
  END IF;

  -- Missing-serial / provisional machines may still be linked explicitly
  UPDATE public.service_tickets t
  SET machine_id = p_machine_id,
      machine_serial_number = COALESCE(t.machine_serial_number, v_machine.serial_number_raw),
      machine_model = COALESCE(t.machine_model, v_machine.model),
      updated_at = timezone('utc', now())
  WHERE t.id = p_ticket_id
  RETURNING * INTO v_ticket;

  INSERT INTO public.machine_identity_events (
    machine_id, actor_id, actor_role, event_type, provenance,
    after_values, visibility
  ) VALUES (
    p_machine_id, v_uid, v_role, 'ticket_linked', 'ticket_link',
    jsonb_build_object('ticket_id', p_ticket_id),
    'owner_visible'
  );

  RETURN v_ticket;
END;
$$;

REVOKE ALL ON FUNCTION public.link_ticket_machine FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.link_ticket_machine TO authenticated;
