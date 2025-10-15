-- Migration: Copy legacy tickets into service_tickets
-- Safe / idempotent. Requires both tables to exist.
-- Adjust column mappings if legacy schema differs.

BEGIN;

-- 1. Ensure service_tickets exists (skip if already created by unified migration)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='service_tickets') THEN
        RAISE EXCEPTION 'service_tickets table missing. Run unified_ticketing_migration.sql first';
    END IF;
END $$;

-- 2. Skip if legacy tickets table absent
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='tickets') THEN
        RAISE NOTICE 'Legacy tickets table not found, skipping migration.';
    END IF;
END $$;

-- 3. Insert rows that do not yet exist (match on legacy id stored in context->>'legacy_id')
WITH legacy AS (
    SELECT t.* FROM public.tickets t
), already_migrated AS (
    SELECT (context->>'legacy_id')::uuid AS legacy_id FROM public.service_tickets WHERE context ? 'legacy_id'
)
INSERT INTO public.service_tickets (
    user_id, title, description, type, priority, status,
    machine_serial_number, maintenance_type, source, context,
    created_at, updated_at
)
SELECT 
    l.user_id,
    l.title,
    l.description,
    l.type::ticket_type,
    l.priority::ticket_priority,
    COALESCE(l.status,'open')::ticket_status,
    NULLIF(l.machine_id,'') AS machine_serial_number,
    l.maintenance_type,
    'legacy' AS source,
    jsonb_build_object('legacy_id', l.id::text, 'scheduled_date', l.scheduled_date),
    COALESCE(l.created_at, NOW()),
    COALESCE(l.updated_at, NOW())
FROM legacy l
LEFT JOIN already_migrated am ON am.legacy_id = l.id::uuid
WHERE am.legacy_id IS NULL
ON CONFLICT DO NOTHING;

COMMIT;
