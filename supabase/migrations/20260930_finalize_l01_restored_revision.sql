DO $finalize_l01$
DECLARE
  v_updated integer;
BEGIN
  UPDATE public.fabricator_positions_v2
  SET
    qc_revision = 3,
    updated_at = now(),
    meta = coalesce(meta, '{}'::jsonb) || jsonb_build_object(
      'l01FinalizedAt', now(),
      'l01InvalidatedRestorationDraftRevision', 2
    )
  WHERE id = 'c7744d56-e20c-4cd9-a08f-76cbbb24225c'
    AND project_id = '97f5f925-58a8-4696-94f0-b3ce5e792172'
    AND owner_user_id = '23196c39-fc18-4f9d-8f86-f47a63a08049'
    AND qc_revision = 2
    AND overall_width_mm = 1210
    AND overall_height_mm = 1550
    AND system_pack_id = 'rock60'
    AND grid @> '{"rows":1,"cols":2}'::jsonb
    AND jsonb_array_length(coalesce(grid->'cells', '[]'::jsonb)) = 2
    AND (SELECT bool_and(cell->>'type' = 'sliding') FROM jsonb_array_elements(grid->'cells') AS cell);

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN
    RAISE EXCEPTION 'L01 restored position no longer matches the verified revision-2 record';
  END IF;
END;
$finalize_l01$;
