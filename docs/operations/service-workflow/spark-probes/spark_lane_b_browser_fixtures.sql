-- Spark Lane B browser-journey fixtures (isolated stack 54522 only).
-- Implementation: d0c311c9 | Manifest tip: 8685aa55. Run as postgres.
-- Users (auth.admin-created): laneb.admin@local.test etc. (see FIXTURES_ACCESS.txt).

-- Machine (PR1 shape; binding columns present).
INSERT INTO public.machines (name, model, brand, serial_number, catalog_model_id, catalog_link_status)
VALUES ('Browser FX-100', 'FX-100', 'Acme', 'SN-BROWSER-1', 'ACME-FX-100', 'linked');

-- Ticket (customer-owned, support-assigned, machine-linked).
INSERT INTO public.service_tickets (ticket_number, title, user_id, assigned_to, machine_id, status)
SELECT 'LB-BROWSER-1', 'Browser pin journey', u_c.id, u_s.id, m.id, 'assigned'
FROM public.machines m,
     auth.users u_c, auth.users u_s
WHERE m.serial_number = 'SN-BROWSER-1'
  AND u_c.email = 'laneb.customer@local.test'
  AND u_s.email = 'laneb.support@local.test';

-- Job (assigned to tech).
INSERT INTO public.service_jobs (ticket_id, job_sequence, title, state, assigned_technician_id, required)
SELECT t.id, 1, 'Browser Job 1', 'planned', u_t.id, true
FROM public.service_tickets t, auth.users u_t
WHERE t.ticket_number = 'LB-BROWSER-1'
  AND u_t.email = 'laneb.tech@local.test';

-- Routine with two published versions + FX-100 applicability.
INSERT INTO public.service_routines (code, name_en, owner_id, status)
SELECT 'LB-BROWSER-1', 'Browser Pin Routine', u.id, 'published'
FROM auth.users u WHERE u.email = 'laneb.admin@local.test';

INSERT INTO public.service_routine_applicability (routine_id, kind, value, value_family)
SELECT r.id, v.kind, v.value, v.vfam
FROM public.service_routines r
JOIN (VALUES
  ('family', 'FX-100', NULL),
  ('manufacturer', 'acme', 'FX-100'),
  ('catalog_model', 'ACME-FX-100', NULL)
) v(kind, value, vfam) ON true
WHERE r.code = 'LB-BROWSER-1';

INSERT INTO public.service_routine_versions (routine_id, version_ordinal, status, draft_revision, author_id)
SELECT r.id, v.ord, 'published', v.rev, u.id
FROM public.service_routines r, auth.users u,
     (VALUES (1, 'b1'), (2, 'b2')) v(ord, rev)
WHERE r.code = 'LB-BROWSER-1' AND u.email = 'laneb.admin@local.test';

-- Journey handles for the runner.
SELECT 'ticket=' || t.id FROM public.service_tickets t WHERE t.ticket_number = 'LB-BROWSER-1'
UNION ALL
SELECT 'job=' || j.id FROM public.service_jobs j
  JOIN public.service_tickets t ON t.id = j.ticket_id WHERE t.ticket_number = 'LB-BROWSER-1'
UNION ALL
SELECT 'v' || v.version_ordinal || '=' || v.id
FROM public.service_routine_versions v
JOIN public.service_routines r ON r.id = v.routine_id
WHERE r.code = 'LB-BROWSER-1' ORDER BY 1;
