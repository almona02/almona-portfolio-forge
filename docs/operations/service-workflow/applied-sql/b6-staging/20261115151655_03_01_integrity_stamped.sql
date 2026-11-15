-- B6 integrity + structured prerequisite targeting (narrow; no staging apply).
-- 1) Deterministic effective-ack ordering on timestamp ties (event_seq).
-- 2) evaluate returns entity_id (issued revision uuid) — UI must not parse prose.
-- 3) Idempotent re-close preserves closed_at and skips duplicate closure audit.
-- Builds on 20261115170000 (F-B6-03/04/05).
-- #155 frozen; #156 draft; no merge / production.


-- ---------------------------------------------------------------------------
-- 1) Monotonic event_seq for deterministic tie-break
-- ---------------------------------------------------------------------------
ALTER TABLE public.service_acknowledgments
  ADD COLUMN IF NOT EXISTS event_seq bigint;

ALTER TABLE public.service_acknowledgment_dispositions
  ADD COLUMN IF NOT EXISTS event_seq bigint;

CREATE SEQUENCE IF NOT EXISTS public.service_ack_event_seq;
CREATE SEQUENCE IF NOT EXISTS public.service_ack_disposition_event_seq;

UPDATE public.service_acknowledgments
SET event_seq = nextval('public.service_ack_event_seq')
WHERE event_seq IS NULL;

UPDATE public.service_acknowledgment_dispositions
SET event_seq = nextval('public.service_ack_disposition_event_seq')
WHERE event_seq IS NULL;

ALTER TABLE public.service_acknowledgments
  ALTER COLUMN event_seq SET DEFAULT nextval('public.service_ack_event_seq'),
  ALTER COLUMN event_seq SET NOT NULL;

ALTER TABLE public.service_acknowledgment_dispositions
  ALTER COLUMN event_seq SET DEFAULT nextval('public.service_ack_disposition_event_seq'),
  ALTER COLUMN event_seq SET NOT NULL;

CREATE OR REPLACE FUNCTION public.effective_acknowledgment(p_revision_id uuid)
RETURNS public.service_acknowledgments
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT a.*
  FROM public.service_acknowledgments a
  WHERE a.issued_revision_id = p_revision_id
  ORDER BY a.responded_at DESC, a.event_seq DESC, a.id DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.effective_acknowledgment_disposition(p_revision_id uuid)
RETURNS public.service_acknowledgment_dispositions
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT d.*
  FROM public.service_acknowledgment_dispositions d
  WHERE d.issued_revision_id = p_revision_id
  ORDER BY d.decided_at DESC, d.event_seq DESC, d.id DESC
  LIMIT 1;
$$;

COMMENT ON COLUMN public.service_acknowledgments.event_seq IS
  'Monotonic insert order; breaks responded_at ties deterministically (not random uuid order).';
COMMENT ON COLUMN public.service_acknowledgment_dispositions.event_seq IS
  'Monotonic insert order; breaks decided_at ties deterministically.';

-- ---------------------------------------------------------------------------
-- 2) Prerequisites with structured entity_id
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.evaluate_ticket_workflow_prerequisites(uuid);

