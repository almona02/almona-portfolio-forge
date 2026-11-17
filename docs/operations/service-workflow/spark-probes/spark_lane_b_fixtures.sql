-- Spark independent Lane B fixtures (disposable only). Run as postgres AFTER the
-- manifest apply sequence. Natural keys (titles/codes/ordinals) for runner lookup.
-- Implementation: d0c311c9 | Manifest tip: 8685aa55 | Contract: da4bcb4a.

-- Mirror B1 production read shape omitted by the disposable deps stub (test-only):
-- B1 grants authenticated SELECT on jobs/visits and revokes client writes.
GRANT SELECT ON public.service_jobs, public.service_job_visits TO authenticated;

-- Extra technician for scope probes.
INSERT INTO auth.users (id) VALUES ('cccccccc-cccc-cccc-cccc-ccccccccccc2') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role) VALUES ('cccccccc-cccc-cccc-cccc-ccccccccccc2', 'technician') ON CONFLICT DO NOTHING;

-- Machines.
INSERT INTO public.machines (name, model, brand, serial_number, catalog_model_id, catalog_link_status) VALUES
  ('FX-100 #1', 'FX-100', 'Acme', 'SN-001', 'ACME-FX-100', 'linked'),
  ('ZZ-9 #1', 'ZZ-9', 'Other', 'SN-002', 'OTHER-ZZ-9', 'linked'),
  ('FX-100 uncat', 'FX-100', 'Acme', 'SN-003', NULL, 'uncatalogued'),
  ('FX-100 uncertain', 'FX-100', 'Acme', 'SN-004', 'ACME-FX-100', 'uncertain')
ON CONFLICT DO NOTHING;

-- Tickets (customer owner, support assignee).
INSERT INTO public.service_tickets (user_id, assigned_to, machine_id, status, title)
SELECT 'dddddddd-dddd-dddd-dddd-ddddddddddd1', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', m.id, 'assigned', v.title
FROM (VALUES
  ('SN-001', 'SPARK-T-MAIN'), ('SN-001', 'SPARK-T-SUP'), (NULL, 'SPARK-T-NOMACH'),
  ('SN-003', 'SPARK-T-UC'), ('SN-004', 'SPARK-T-UN'), ('SN-002', 'SPARK-T-MM'),
  ('SN-001', 'SPARK-T-MISC'), ('SN-001', 'SPARK-T-CONC')
) v(sn, title)
LEFT JOIN public.machines m ON m.serial_number = v.sn;

-- Jobs. TECH1 = cccc...c1, TECH2 = cccc...c2.
INSERT INTO public.service_jobs (ticket_id, title, state, assigned_technician_id)
SELECT t.id, v.title, 'planned', v.tech::uuid
FROM (VALUES
  ('SPARK-T-MAIN', 'SPARK-J-MAIN', 'cccccccc-cccc-cccc-cccc-ccccccccccc1'),
  ('SPARK-T-SUP', 'SPARK-J-SUP', 'cccccccc-cccc-cccc-cccc-ccccccccccc1'),
  ('SPARK-T-MAIN', 'SPARK-J-NOREASON', 'cccccccc-cccc-cccc-cccc-ccccccccccc1'),
  ('SPARK-T-MAIN', 'SPARK-J-DRAFT', 'cccccccc-cccc-cccc-cccc-ccccccccccc1'),
  ('SPARK-T-MAIN', 'SPARK-J-INREVIEW', 'cccccccc-cccc-cccc-cccc-ccccccccccc1'),
  ('SPARK-T-MAIN', 'SPARK-J-RETIRED', 'cccccccc-cccc-cccc-cccc-ccccccccccc1'),
  ('SPARK-T-MM', 'SPARK-J-MM', 'cccccccc-cccc-cccc-cccc-ccccccccccc1'),
  ('SPARK-T-NOMACH', 'SPARK-J-NOMACH', 'cccccccc-cccc-cccc-cccc-ccccccccccc1'),
  ('SPARK-T-UC', 'SPARK-J-UC', 'cccccccc-cccc-cccc-cccc-ccccccccccc1'),
  ('SPARK-T-UN', 'SPARK-J-UN', 'cccccccc-cccc-cccc-cccc-ccccccccccc1'),
  ('SPARK-T-MISC', 'SPARK-J-R7', 'cccccccc-cccc-cccc-cccc-ccccccccccc2'),
  ('SPARK-T-MISC', 'SPARK-J-R12', 'cccccccc-cccc-cccc-cccc-ccccccccccc2'),
  ('SPARK-T-MISC', 'SPARK-J-R19', 'cccccccc-cccc-cccc-cccc-ccccccccccc2'),
  ('SPARK-T-MISC', 'SPARK-J-R18', 'cccccccc-cccc-cccc-cccc-ccccccccccc2'),
  ('SPARK-T-MISC', 'SPARK-J-R18B', 'cccccccc-cccc-cccc-cccc-ccccccccccc2'),
  ('SPARK-T-MAIN', 'SPARK-J-TECH', 'cccccccc-cccc-cccc-cccc-ccccccccccc1'),
  ('SPARK-T-MAIN', 'SPARK-J-CUST', 'cccccccc-cccc-cccc-cccc-ccccccccccc1'),
  ('SPARK-T-CONC', 'SPARK-J-C1', 'cccccccc-cccc-cccc-cccc-ccccccccccc1'),
  ('SPARK-T-CONC', 'SPARK-J-C2A', 'cccccccc-cccc-cccc-cccc-ccccccccccc1'),
  ('SPARK-T-CONC', 'SPARK-J-C2B', 'cccccccc-cccc-cccc-cccc-ccccccccccc1'),
  ('SPARK-T-CONC', 'SPARK-J-C2C', 'cccccccc-cccc-cccc-cccc-ccccccccccc1'),
  ('SPARK-T-CONC', 'SPARK-J-C2D', 'cccccccc-cccc-cccc-cccc-ccccccccccc1'),
  ('SPARK-T-CONC', 'SPARK-J-C4', 'cccccccc-cccc-cccc-cccc-ccccccccccc1')
) v(tcode, title, tech)
JOIN public.service_tickets t ON t.title = v.tcode;

-- C3 round jobs (SPARK-C3-01 .. SPARK-C3-20).
INSERT INTO public.service_jobs (ticket_id, title, state, assigned_technician_id)
SELECT t.id, 'SPARK-C3-' || lpad(g::text, 2, '0'), 'planned', 'cccccccc-cccc-cccc-cccc-ccccccccccc1'
FROM generate_series(1, 20) g
JOIN public.service_tickets t ON t.title = 'SPARK-T-CONC';

-- Routines.
INSERT INTO public.service_routines (code, name_en, owner_id, status) VALUES
  ('LB-SPARK-R1', 'Spark R1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'published'),
  ('LB-SPARK-R2', 'Spark R2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'published'),
  ('LB-SPARK-R3', 'Spark R3 ZZ', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'published'),
  ('LB-SPARK-R4', 'Spark R4 retire', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'published'),
  ('LB-SPARK-R5', 'Spark R5 late-pub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'published'),
  ('LB-SPARK-R6', 'Spark R6 pin-then-retire', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'published'),
  ('LB-SPARK-R7', 'Spark R7 conc-targets', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'published'),
  ('LB-SPARK-R8', 'Spark R8 conc-retire', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'published'),
  ('LB-SPARK-R9', 'Spark R9 conc-start', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'published'),
  ('LB-SPARK-R10', 'Spark R10 same-target', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'published')
ON CONFLICT (code) DO NOTHING;

-- Applicability: R1,R2,R4,R5,R6,R7,R8,R9,R10 -> FX-100/Acme; R3 -> ZZ-9/Other.
INSERT INTO public.service_routine_applicability (routine_id, kind, value, value_family)
SELECT r.id, v.kind, v.value, v.vfam
FROM public.service_routines r
JOIN (VALUES
  ('family', 'FX-100', NULL),
  ('manufacturer', 'acme', 'FX-100'),
  ('catalog_model', 'ACME-FX-100', NULL)
) v(kind, value, vfam) ON true
WHERE r.code IN ('LB-SPARK-R1','LB-SPARK-R2','LB-SPARK-R4','LB-SPARK-R5','LB-SPARK-R6',
                 'LB-SPARK-R7','LB-SPARK-R8','LB-SPARK-R9','LB-SPARK-R10')
ON CONFLICT DO NOTHING;

INSERT INTO public.service_routine_applicability (routine_id, kind, value, value_family)
SELECT r.id, v.kind, v.value, v.vfam
FROM public.service_routines r
JOIN (VALUES
  ('family', 'ZZ-9', NULL),
  ('manufacturer', 'other', 'ZZ-9'),
  ('catalog_model', 'OTHER-ZZ-9', NULL)
) v(kind, value, vfam) ON true
WHERE r.code = 'LB-SPARK-R3'
ON CONFLICT DO NOTHING;

-- Versions. V3=draft, W2=in_review (one in-flight per routine respected).
INSERT INTO public.service_routine_versions (routine_id, version_ordinal, status, draft_revision, author_id)
SELECT r.id, v.ord, v.status, v.rev, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'
FROM public.service_routines r
JOIN (VALUES
  ('LB-SPARK-R1', 1, 'published', 'r1'),
  ('LB-SPARK-R1', 2, 'published', 'r2'),
  ('LB-SPARK-R1', NULL, 'draft', 'r3'),
  ('LB-SPARK-R2', 1, 'published', 'w1'),
  ('LB-SPARK-R2', NULL, 'in_review', 'w2'),
  ('LB-SPARK-R3', 1, 'published', 'x1'),
  ('LB-SPARK-R4', 1, 'published', 'y1'),
  ('LB-SPARK-R5', 1, 'published', 'p1'),
  ('LB-SPARK-R6', 1, 'published', 'z1'),
  ('LB-SPARK-R7', 1, 'published', 'k1'),
  ('LB-SPARK-R7', 2, 'published', 'k2'),
  ('LB-SPARK-R7', 3, 'published', 'k3'),
  ('LB-SPARK-R7', 4, 'published', 'k4'),
  ('LB-SPARK-R8', 1, 'published', 'n9'),
  ('LB-SPARK-R9', 1, 'published', 'm1'),
  ('LB-SPARK-R10', 1, 'published', 's1'),
  ('LB-SPARK-R10', 2, 'published', 's2')
) v(code, ord, status, rev) ON v.code = r.code;
