-- Checklist-journey fixture for the isolated browser stack.
-- Ids come from psql variables set by the bootstrap (GoTrue user ids).
-- No passwords. Local only.

INSERT INTO public.machines (name, model, brand, catalog_model_id, catalog_link_status)
VALUES ('Browser Saw', 'saw', 'Acme', 'CM-SAW-1', 'linked');

INSERT INTO public.service_tickets (
  user_id, assigned_to, status, title, description,
  ticket_number, priority, type, site_location
) VALUES (
  :'owner_id', :'support_id', 'assigned', 'Lane C checklist journey',
  'Synthetic local fixture',
  'T-LC-BROWSER', 'medium', 'maintenance', 'Local plant'
);

INSERT INTO public.service_jobs (
  ticket_id, job_sequence, title, state, assigned_technician_id, required
)
SELECT id, 1, 'Checklist journey job', 'in_progress', :'tech_id'::uuid, true
FROM public.service_tickets
WHERE ticket_number = 'T-LC-BROWSER';

INSERT INTO public.service_routines (
  code, name_en, name_ar, description, owner_id, status
) VALUES (
  'LC-BROWSER', 'Lane C browser routine', '', '', :'admin_id'::uuid, 'published'
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
    ))
  ),
  'browser-seed', :'admin_id'::uuid, now()
FROM public.service_routines r
WHERE r.code = 'LC-BROWSER';

INSERT INTO public.service_job_routine_pins (
  job_id, routine_id, routine_version_id, status, reason, pinned_by
)
SELECT j.id, r.id, v.id, 'active', 'browser seed pin', :'admin_id'::uuid
FROM public.service_jobs j
JOIN public.service_tickets t ON t.id = j.ticket_id AND t.ticket_number = 'T-LC-BROWSER'
JOIN public.service_routines r ON r.code = 'LC-BROWSER'
JOIN public.service_routine_versions v ON v.routine_id = r.id AND v.status = 'published';

INSERT INTO public.service_job_visits (
  job_id, visit_sequence, state, attending_technician_id, actual_start
)
SELECT j.id, 1, 'in_progress', :'tech_id'::uuid, now()
FROM public.service_jobs j
JOIN public.service_tickets t ON t.id = j.ticket_id AND t.ticket_number = 'T-LC-BROWSER';
