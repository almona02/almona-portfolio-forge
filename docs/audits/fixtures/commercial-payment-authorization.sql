-- Staging-only validation; transaction rolls back. Requires the staging fixture identities.
BEGIN;
DO $test$
DECLARE owner_a uuid; owner_b uuid; cust uuid:=gen_random_uuid(); ord uuid:=gen_random_uuid();
        inv uuid; inv_retry uuid; payment uuid; payment_retry uuid; key uuid:=gen_random_uuid(); denied boolean;
BEGIN
  SELECT id INTO owner_a FROM public.profiles ORDER BY id LIMIT 1;
  SELECT id INTO owner_b FROM public.profiles WHERE id<>owner_a ORDER BY id LIMIT 1;
  INSERT INTO public.fabricator_customers(id,owner_user_id,name) VALUES(cust,owner_a,'Posting test fixture');
  INSERT INTO public.orders(id,order_number,user_id,subtotal,tax_amount,shipping_cost,discount_amount,total_amount,currency,billing_address,shipping_address)
    VALUES(ord,'fixture-'||gen_random_uuid(),owner_a,100,14,5,0,119,'EGP','{}','{}');
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner_a,'role','authenticated')::text,true);
  SET LOCAL ROLE authenticated;
  inv := public.create_invoice_from_order(ord,cust,'fixture-'||gen_random_uuid(),now()+interval '30 days');
  inv_retry := public.create_invoice_from_order(ord,cust,'ignored-retry-number',NULL);
  IF inv<>inv_retry THEN RAISE EXCEPTION 'duplicate invoice'; END IF;
  payment := public.record_manual_invoice_payment(inv,30,'EGP','cash',key,'fixture');
  payment_retry := public.record_manual_invoice_payment(inv,30,'EGP','cash',key,'fixture');
  IF payment<>payment_retry THEN RAISE EXCEPTION 'duplicate payment'; END IF;
  IF (SELECT status FROM public.invoices WHERE id=inv)<>'partial' THEN RAISE EXCEPTION 'partial status incorrect'; END IF;
  denied:=false;
  BEGIN PERFORM public.record_manual_invoice_payment(inv,120,'EGP','cash',gen_random_uuid(),NULL);
  EXCEPTION WHEN raise_exception THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'overpayment allowed'; END IF;
  denied:=false;
  BEGIN PERFORM public.record_manual_invoice_payment(inv,10,'USD','cash',gen_random_uuid(),NULL);
  EXCEPTION WHEN raise_exception THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'currency mismatch allowed'; END IF;
  RESET ROLE;
  INSERT INTO public.fabricator_customer_portal_accounts(customer_id,portal_user_id) VALUES(cust,owner_b);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner_b,'role','authenticated')::text,true);
  SET LOCAL ROLE authenticated;
  denied:=false;
  BEGIN PERFORM public.record_manual_invoice_payment(inv,89,'EGP','cash',gen_random_uuid(),NULL);
  EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'customer self-settled invoice'; END IF;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner_a,'role','authenticated')::text,true);
  SET LOCAL ROLE authenticated;
  PERFORM public.record_manual_invoice_payment(inv,89,'EGP','bank_transfer',gen_random_uuid(),NULL);
  IF (SELECT status FROM public.invoices WHERE id=inv)<>'paid' THEN RAISE EXCEPTION 'settlement failed'; END IF;
  RESET ROLE;
END;
$test$;
ROLLBACK;
SELECT 'invoice creation, retries, partial/full payment, ownership and balance checks passed' AS result;
