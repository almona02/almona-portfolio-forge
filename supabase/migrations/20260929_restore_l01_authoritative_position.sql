DO $restore_l01$
DECLARE
  v_position public.fabricator_positions%ROWTYPE;
  v_project public.fabricator_projects%ROWTYPE;
BEGIN
  SELECT * INTO v_position
  FROM public.fabricator_positions
  WHERE id = 'c7744d56-e20c-4cd9-a08f-76cbbb24225c'
    AND project_id = '97f5f925-58a8-4696-94f0-b3ce5e792172'
    AND owner_user_id = '23196c39-fc18-4f9d-8f86-f47a63a08049'
    AND qc_revision = 1
    AND overall_width_mm = 1210
    AND overall_height_mm = 1550
    AND system_pack_id = 'rock60';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'L01 source position does not match the approved before-image';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.fabricator_positions_v2
    WHERE id = v_position.id
  ) THEN
    RAISE EXCEPTION 'L01 v2 position already exists; refusing to overwrite it';
  END IF;

  SELECT * INTO STRICT v_project
  FROM public.fabricator_projects
  WHERE id = v_position.project_id
    AND owner_user_id = v_position.owner_user_id;

  INSERT INTO public.fabricator_projects_v2 (
    id, owner_user_id, project_code, project_name, client_name, site_name,
    currency, region, system_pack_id, status, meta, created_at, updated_at
  ) VALUES (
    v_project.id, v_project.owner_user_id, v_project.project_code,
    v_project.project_name, v_project.client_name, v_project.site_name,
    v_project.currency, v_project.region, v_project.system_pack_id,
    v_project.status, coalesce(v_project.meta, '{}'::jsonb) || jsonb_build_object(
      'l01RestoredFrom', 'fabricator_projects',
      'l01RestoredAt', now()
    ), v_project.created_at, now()
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.fabricator_positions_v2 (
    id, project_id, owner_user_id, order_number, pos_number, type,
    overall_width_mm, overall_height_mm, color, glazing, system_pack_id,
    status, quantity, position_meta, meta, optimization, grid, components,
    hardware, selected_preset, window_unit, created_at, updated_at, qc_revision
  ) VALUES (
    v_position.id, v_position.project_id, v_position.owner_user_id,
    v_position.order_number, v_position.pos_number, v_position.type,
    v_position.overall_width_mm, v_position.overall_height_mm,
    v_position.color, v_position.glazing, v_position.system_pack_id,
    v_position.status, v_position.quantity, v_position.position_meta,
    coalesce(v_position.meta, '{}'::jsonb) || jsonb_build_object(
      'l01RestoredFrom', 'fabricator_positions',
      'l01SourceRevision', v_position.qc_revision,
      'l01RestoredAt', now()
    ),
    NULL,
    v_position.grid,
    v_position.components,
    coalesce(v_position.hardware, '[]'::jsonb),
    v_position.selected_preset,
    jsonb_build_object(
      'id', v_position.id,
      'projectId', v_position.project_id,
      'projectCode', v_position.project_code,
      'orderNumber', v_position.order_number,
      'posNumber', v_position.pos_number,
      'type', v_position.type,
      'overallWidth', v_position.overall_width_mm,
      'overallHeight', v_position.overall_height_mm,
      'systemPackId', v_position.system_pack_id,
      'color', v_position.color,
      'glazing', v_position.glazing,
      'hardware', coalesce(v_position.hardware, '[]'::jsonb),
      'components', v_position.components,
      'grid', v_position.grid,
      'presetId', v_position.selected_preset,
      'quantity', v_position.quantity,
      'positionMeta', v_position.position_meta,
      'status', v_position.status,
      'createdAt', v_position.created_at,
      'updatedAt', now()
    ),
    v_position.created_at,
    now(),
    v_position.qc_revision + 1
  );
END;
$restore_l01$;
