-- Browser readers receive only global migration state, never ledger proofs/payloads.
CREATE OR REPLACE FUNCTION public.get_fabricator_migration_mode_events()
RETURNS TABLE(event_hash text, chain_position bigint, payload jsonb, recorded_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT e.event_hash::text, e.chain_position,
      jsonb_build_object('almona_event_type', e.payload->>'almona_event_type'), e.recorded_at
    FROM public.reality_events e
    WHERE e.payload->>'almona_event_type' IN (
      'FabricatorMigrationInitiated', 'FabricatorMigrationCompleted',
      'FabricatorRollbackInitiated', 'FabricatorRollbackCompleted'
    )
    ORDER BY e.chain_position DESC
    LIMIT 1;
END;
$function$;
REVOKE ALL ON FUNCTION public.get_fabricator_migration_mode_events() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_fabricator_migration_mode_events() TO authenticated;
