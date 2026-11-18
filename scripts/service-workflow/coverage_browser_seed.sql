-- Coverage UI journey fixtures for the isolated browser stack.
-- Ids from psql -v vars set by bootstrap. No passwords. Local only.
-- Distinct from F-COV-CAP-1 product correction.

INSERT INTO public.machines (name, model, brand, catalog_model_id, catalog_link_status, owner_id)
VALUES ('Coverage Browser Saw', 'saw', 'Acme', 'CM-SAW-1', 'linked', :'owner_id'::uuid);

INSERT INTO public.service_routines (
  code, name_en, name_ar, description, owner_id, status
) VALUES (
  'COV-BROWSER', 'Coverage browser routine', '', '', :'admin_id'::uuid, 'published'
);

INSERT INTO public.service_routine_versions (
  routine_id, version_ordinal, status, payload, draft_revision, author_id, published_at
)
SELECT r.id, 1, 'published',
  jsonb_build_object(
    'sections', jsonb_build_array(jsonb_build_object(
      'id', 'safety', 'kind', 'safety', 'title', 'Safety',
      'items', jsonb_build_array(jsonb_build_object(
        'id', 'sg1', 'type', 'safety_gate', 'requirement_class', 'safety_gate',
        'instruction', 'LOTO', 'evidence', 'none', 'waivable', false
      ))
    )),
    'cadence', jsonb_build_object('interval', 30, 'unit', 'days')
  ),
  'coverage-browser-seed', :'admin_id'::uuid, now()
FROM public.service_routines r
WHERE r.code = 'COV-BROWSER';

INSERT INTO public.service_routine_applicability (routine_id, kind, value, value_family)
SELECT r.id, 'family', 'saw', NULL
FROM public.service_routines r WHERE r.code = 'COV-BROWSER';

INSERT INTO public.service_routine_applicability (routine_id, kind, value, value_family)
SELECT r.id, 'catalog_model', 'CM-SAW-1', 'saw'
FROM public.service_routines r WHERE r.code = 'COV-BROWSER';

-- Active coverage for the journey panel (dates as DATE).
INSERT INTO public.service_machine_coverages (
  machine_id, routine_id, routine_version_id, status,
  start_date, end_date, cadence_interval, cadence_unit,
  first_planned_due_date, schedule_anchor_day, created_by
)
SELECT m.id, r.id, v.id, 'active',
  DATE '2026-01-01', NULL, 30, 'days',
  DATE '2026-01-31', 31, :'admin_id'::uuid
FROM public.machines m
JOIN public.service_routines r ON r.code = 'COV-BROWSER'
JOIN public.service_routine_versions v ON v.routine_id = r.id AND v.status = 'published'
WHERE m.name = 'Coverage Browser Saw'
LIMIT 1;
