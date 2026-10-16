-- Staging-only validation; transaction rolls back. Requires the staging fixture identities.
BEGIN;
DO $test$
DECLARE owner_a uuid; owner_b uuid; customer_a uuid := gen_random_uuid(); customer_b uuid := gen_random_uuid();
        fixture_ids uuid[] := ARRAY[]::uuid[]; invoice_id uuid; amount_a numeric; denied boolean; n integer;
BEGIN
  SELECT id INTO owner_a FROM public.profiles ORDER BY id LIMIT 1;
  SELECT id INTO owner_b FROM public.profiles WHERE id <> owner_a ORDER BY id LIMIT 1;
  IF owner_a IS NULL OR owner_b IS NULL THEN RAISE EXCEPTION 'two staging profiles required'; END IF;
  INSERT INTO public.fabricator_customers(id,owner_user_id,name) VALUES
    (customer_a,owner_a,'Commercial isolation fixture A'),(customer_b,owner_b,'Commercial isolation fixture B');
  FOR n IN 1..12 LOOP
    INSERT INTO public.invoices(owner_user_id,customer_id,invoice_number,status,currency,subtotal,total_amount)
    VALUES(owner_a,customer_a,'fixture-'||gen_random_uuid(),'paid','EGP',10,10) RETURNING id INTO invoice_id;
    fixture_ids := array_append(fixture_ids,invoice_id);
  END LOOP;
  INSERT INTO public.invoices(owner_user_id,customer_id,invoice_number,status,currency,subtotal,total_amount)
    VALUES(owner_b,customer_b,'fixture-'||gen_random_uuid(),'sent','USD',20,20);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner_a,'role','authenticated')::text,true);
  SET LOCAL ROLE authenticated;
  IF (SELECT count(*) FROM public.invoices WHERE id=ANY(fixture_ids)) <> 12 THEN RAISE EXCEPTION 'owner read failed'; END IF;
  SELECT (v->>'totalRevenue')::numeric INTO amount_a
    FROM jsonb_array_elements(public.get_client_portal_summary()->'currencies') v WHERE v->>'currency'='EGP';
  IF amount_a <> 120 THEN RAISE EXCEPTION 'aggregate truncated or incorrect: %',amount_a; END IF;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner_b,'role','authenticated')::text,true);
  SET LOCAL ROLE authenticated;
  IF EXISTS(SELECT 1 FROM public.invoices WHERE id=ANY(fixture_ids)) THEN RAISE EXCEPTION 'tenant leak'; END IF;
  denied := false;
  BEGIN
    INSERT INTO public.invoices(owner_user_id,customer_id,invoice_number,subtotal,total_amount)
    VALUES(owner_a,customer_a,'forged',1,1);
  EXCEPTION WHEN insufficient_privilege THEN denied := true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'client forged invoice'; END IF;
  RESET ROLE;
  INSERT INTO public.fabricator_customer_portal_accounts(customer_id,portal_user_id) VALUES(customer_a,owner_b);
  SET LOCAL ROLE authenticated;
  IF (SELECT count(*) FROM public.invoices WHERE id=ANY(fixture_ids)) <> 12 THEN RAISE EXCEPTION 'optional portal link failed'; END IF;
  RESET ROLE;
END;
$test$;
ROLLBACK;
SELECT 'ownership, isolation, optional portal membership, full-account totals, and write denial passed' AS result;
