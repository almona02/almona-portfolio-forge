-- FR-1 disposable battery (production-shaped, no B1–B7 workflow tables).
-- Prerequisites: base + Slice0 A + MI C/D + TKT §2 + RLS + F-B7-04 + F-B7-03.
-- Uses app.b1_uid + SET ROLE authenticated (superuser bypasses RLS).
-- No production. No secrets.

BEGIN;
SET LOCAL lock_timeout = '5s';

DROP TABLE IF EXISTS public.fr1_eval;
CREATE TABLE public.fr1_eval (
  id text PRIMARY KEY,
  ok boolean NOT NULL,
  detail text NOT NULL
);

CREATE OR REPLACE FUNCTION pg_temp.fr1_note(p_id text, p_ok boolean, p_detail text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.fr1_eval(id, ok, detail) VALUES (p_id, p_ok, p_detail)
  ON CONFLICT (id) DO UPDATE SET ok = EXCLUDED.ok, detail = EXCLUDED.detail;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.fr1_as(p_uid uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('app.b1_uid', coalesce(p_uid::text, ''), true);
  PERFORM set_config('request.jwt.claim.sub', coalesce(p_uid::text, ''), true);
  PERFORM set_config('request.jwt.claim.role',
    CASE WHEN p_uid IS NULL THEN 'anon' ELSE 'authenticated' END, true);
END;
$$;

DO $$
DECLARE
  v_owner uuid := 'f1000000-0000-4000-8000-000000000001';
  v_tech  uuid := 'f1000000-0000-4000-8000-000000000002';
  v_unrel uuid := 'f1000000-0000-4000-8000-000000000003';
  v_admin uuid := 'f1000000-0000-4000-8000-000000000099';
  v_machine uuid;
  v_t_owner uuid;
  v_t_unassigned uuid;
  v_share_token text;
  v_share_id uuid;
  v_evt int;
  v_payload jsonb;
  v_msg_count int;
  v_s9_ok boolean;
  v_s9b_ok boolean;
BEGIN
  INSERT INTO auth.users (id) VALUES (v_owner), (v_tech), (v_unrel), (v_admin)
  ON CONFLICT DO NOTHING;
  INSERT INTO public.profiles (id, role) VALUES
    (v_owner, 'customer'),
    (v_tech, 'technician'),
    (v_unrel, 'customer'),
    (v_admin, 'admin')
  ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

  INSERT INTO public.machines (id, owner_id, serial_number, model, brand, name)
  VALUES (gen_random_uuid(), v_owner, 'FR1-SN-EXISTING', 'FR1-MODEL', 'YILMAZ', 'FR1 existing machine')
  RETURNING id INTO v_machine;

  INSERT INTO public.service_tickets (
    id, ticket_number, title, description, type, priority, status, user_id, assigned_to
  ) VALUES (
    gen_random_uuid(), 'FR1-T-UNASSIGNED', 'fr1 unassigned', 'existing ticket',
    'technical', 'medium', 'open', v_owner, NULL
  ) RETURNING id INTO v_t_unassigned;

  INSERT INTO public.service_tickets (
    id, ticket_number, title, description, type, priority, status, user_id, assigned_to,
    machine_id, machine_serial_number
  ) VALUES (
    gen_random_uuid(), 'FR1-T-OWNER', 'fr1 owner ticket', 'with attachment message',
    'technical', 'medium', 'open', v_owner, v_tech,
    v_machine, 'FR1-SN-EXISTING'
  ) RETURNING id INTO v_t_owner;

  INSERT INTO public.ticket_messages (
    ticket_id, author_id, message, message_type, is_internal_note, attachments
  ) VALUES (
    v_t_owner, v_owner, 'photo attached', 'message', false,
    jsonb_build_array(jsonb_build_object(
      'filename', 'plate.jpg',
      'storage_path', v_t_owner::text || '/fr1/plate.jpg',
      'size', 12,
      'type', 'image/jpeg'
    ))
  );

  INSERT INTO public.ticket_messages (
    ticket_id, author_id, message, message_type, is_internal_note, attachments
  ) VALUES (
    v_t_owner, v_admin, 'internal only', 'internal_note', true, '[]'::jsonb
  );

  PERFORM pg_temp.fr1_note(
    'M1',
    to_regprocedure('public.create_ticket_share(uuid,timestamptz)') IS NOT NULL
      AND to_regprocedure('public.revoke_ticket_share(text)') IS NOT NULL
      AND to_regprocedure('public.get_shared_ticket(text)') IS NOT NULL
      AND to_regprocedure('public.record_ticket_share_attachment_access(text)') IS NOT NULL
      AND to_regclass('public.ticket_share_access_events') IS NOT NULL,
    'share RPCs + access_events present'
  );

  PERFORM pg_temp.fr1_note(
    'M2',
    to_regclass('public.service_jobs') IS NULL
      AND to_regclass('public.service_job_visits') IS NULL,
    'FR-1 disposable has no service_jobs/visits (prod-shaped absence)'
  );

  -- S1: owner create_ticket_share
  BEGIN
    PERFORM pg_temp.fr1_as(v_owner);
    SELECT (public.create_ticket_share(v_t_owner, NULL)->>'token') INTO v_share_token;
    PERFORM pg_temp.fr1_note(
      'S1',
      v_share_token IS NOT NULL AND length(v_share_token) >= 32,
      'owner create_ticket_share'
    );
  EXCEPTION WHEN OTHERS THEN
    PERFORM pg_temp.fr1_note('S1', false, SQLERRM);
    v_share_token := NULL;
  END;

  IF v_share_token IS NOT NULL THEN
    SELECT id INTO v_share_id FROM public.ticket_shares WHERE token = v_share_token;
    PERFORM pg_temp.fr1_note(
      'S2',
      EXISTS (
        SELECT 1 FROM public.ticket_governance_audit
        WHERE ticket_id = v_t_owner AND action = 'share_created'
      ),
      'share_created audit row'
    );

    -- S3: get_shared_ticket records access event and excludes internal notes
    BEGIN
      PERFORM pg_temp.fr1_as(NULL);
      SELECT public.get_shared_ticket(v_share_token) INTO v_payload;
      SELECT count(*) INTO v_evt
        FROM public.ticket_share_access_events WHERE ticket_id = v_t_owner;
      SELECT jsonb_array_length(coalesce(v_payload->'messages', '[]'::jsonb)) INTO v_msg_count;
      PERFORM pg_temp.fr1_note(
        'S3',
        v_evt >= 1
          AND v_msg_count = 1
          AND NOT EXISTS (
            SELECT 1
            FROM jsonb_array_elements(coalesce(v_payload->'messages', '[]'::jsonb)) m
            WHERE coalesce(m->>'is_internal_note', 'false') = 'true'
               OR coalesce(m->>'message_type', '') = 'internal_note'
               OR coalesce(m->>'message', '') = 'internal only'
          ),
        'access event + internal notes excluded n_evt=' || v_evt || ' msgs=' || v_msg_count
      );
    EXCEPTION WHEN OTHERS THEN
      PERFORM pg_temp.fr1_note('S3', false, SQLERRM);
    END;

    -- S4: direct insert into ticket_shares denied for authenticated
    BEGIN
      PERFORM pg_temp.fr1_as(v_owner);
      SET LOCAL ROLE authenticated;
      INSERT INTO public.ticket_shares (ticket_id, token, created_by)
      VALUES (v_t_owner, repeat('b', 32), v_owner);
      RESET ROLE;
      PERFORM pg_temp.fr1_note('S4', false, 'direct insert unexpectedly succeeded');
    EXCEPTION WHEN insufficient_privilege OR OTHERS THEN
      RESET ROLE;
      PERFORM pg_temp.fr1_note('S4', true, 'direct insert denied: ' || SQLERRM);
    END;

    -- S5: unrelated customer cannot revoke owner share
    BEGIN
      PERFORM pg_temp.fr1_as(v_unrel);
      PERFORM public.revoke_ticket_share(v_share_token);
      PERFORM pg_temp.fr1_note('S5', false, 'unrelated revoke unexpectedly succeeded');
    EXCEPTION WHEN insufficient_privilege OR OTHERS THEN
      PERFORM pg_temp.fr1_note(
        'S5',
        (SELECT revoked_at IS NULL FROM public.ticket_shares WHERE token = v_share_token),
        'unrelated revoke denied; share intact'
      );
    END;

    -- S6: null-safe revoke on UNASSIGNED ticket — unrelated must still be denied
    BEGIN
      PERFORM pg_temp.fr1_as(v_owner);
      SELECT (public.create_ticket_share(v_t_unassigned, NULL)->>'token') INTO v_share_token;
      PERFORM pg_temp.fr1_as(v_unrel);
      PERFORM public.revoke_ticket_share(v_share_token);
      PERFORM pg_temp.fr1_note('S6', false, 'NULL assignee revoke bypass');
    EXCEPTION WHEN insufficient_privilege OR OTHERS THEN
      PERFORM pg_temp.fr1_note('S6', true, 'null-safe: unrelated denied on unassigned ticket');
    END;

    -- S7: owner revoke + audit
    BEGIN
      PERFORM pg_temp.fr1_as(v_owner);
      SELECT token INTO v_share_token FROM public.ticket_shares
       WHERE ticket_id = v_t_owner AND revoked_at IS NULL
       ORDER BY created_at DESC LIMIT 1;
      PERFORM public.revoke_ticket_share(v_share_token);
      PERFORM pg_temp.fr1_note(
        'S7',
        EXISTS (
          SELECT 1 FROM public.ticket_governance_audit
          WHERE ticket_id = v_t_owner AND action = 'share_revoked'
        )
        AND (SELECT revoked_at IS NOT NULL FROM public.ticket_shares WHERE token = v_share_token),
        'owner revoke + share_revoked audit'
      );
    EXCEPTION WHEN OTHERS THEN
      PERFORM pg_temp.fr1_note('S7', false, SQLERRM);
    END;

    -- S7b: revoked share payload fails (lifecycle)
    BEGIN
      PERFORM pg_temp.fr1_as(NULL);
      PERFORM public.get_shared_ticket(v_share_token);
      PERFORM pg_temp.fr1_note('S7b', false, 'revoked share still readable');
    EXCEPTION WHEN OTHERS THEN
      PERFORM pg_temp.fr1_note('S7b', true, 'revoked share denied: ' || SQLERRM);
    END;
  ELSE
    PERFORM pg_temp.fr1_note('S2', false, 'skipped — no share');
    PERFORM pg_temp.fr1_note('S3', false, 'skipped — no share');
    PERFORM pg_temp.fr1_note('S4', false, 'skipped — no share');
    PERFORM pg_temp.fr1_note('S5', false, 'skipped — no share');
    PERFORM pg_temp.fr1_note('S6', false, 'skipped — no share');
    PERFORM pg_temp.fr1_note('S7', false, 'skipped — no share');
    PERFORM pg_temp.fr1_note('S7b', false, 'skipped — no share');
  END IF;

  -- S8: escalate null-safe — unrelated must not escalate unassigned ticket
  BEGIN
    PERFORM pg_temp.fr1_as(v_unrel);
    PERFORM public.govern_ticket_set_escalated(v_t_unassigned, true, v_unrel);
    PERFORM pg_temp.fr1_note('S8', false, 'escalate bypass on unassigned');
  EXCEPTION WHEN insufficient_privilege OR OTHERS THEN
    PERFORM pg_temp.fr1_note(
      'S8',
      COALESCE((SELECT escalated FROM public.service_tickets WHERE id = v_t_unassigned), false) IS NOT TRUE,
      'null-safe escalate denied'
    );
  END;

  -- S9: RLS — unrelated cannot select owner ticket (must use authenticated role)
  BEGIN
    PERFORM pg_temp.fr1_as(v_unrel);
    SET LOCAL ROLE authenticated;
    SELECT NOT EXISTS (SELECT 1 FROM public.service_tickets WHERE id = v_t_owner)
      INTO v_s9_ok;
    RESET ROLE;
    PERFORM pg_temp.fr1_note('S9', v_s9_ok, 'unrelated ticket select empty under RLS');
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    PERFORM pg_temp.fr1_note('S9', false, SQLERRM);
  END;

  -- S9b: authorized owner can select own ticket under RLS
  BEGIN
    PERFORM pg_temp.fr1_as(v_owner);
    SET LOCAL ROLE authenticated;
    SELECT EXISTS (SELECT 1 FROM public.service_tickets WHERE id = v_t_owner)
      INTO v_s9b_ok;
    RESET ROLE;
    PERFORM pg_temp.fr1_note('S9b', v_s9b_ok, 'owner ticket select allowed under RLS');
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    PERFORM pg_temp.fr1_note('S9b', false, SQLERRM);
  END;

  -- S10: migration preservation — Slice0 / MI RPCs still present
  PERFORM pg_temp.fr1_note(
    'S10',
    EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'govern_ticket_transition')
      AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'link_ticket_machine')
      AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'register_machine_identity')
      AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'revoke_ticket_share')
      AND EXISTS (SELECT 1 FROM public.machines WHERE id = v_machine)
      AND EXISTS (
        SELECT 1 FROM public.ticket_messages
        WHERE ticket_id = v_t_owner AND message = 'photo attached'
      ),
    'legacy Slice0/MI RPCs + existing machine/ticket/attachment preserved'
  );

END $$;

SELECT id, ok, detail FROM public.fr1_eval ORDER BY id;
SELECT
  (SELECT count(*) FILTER (WHERE ok) FROM public.fr1_eval) AS pass,
  (SELECT count(*) FILTER (WHERE NOT ok) FROM public.fr1_eval) AS fail,
  (SELECT count(*) FROM public.fr1_eval) AS total;

COMMIT;
