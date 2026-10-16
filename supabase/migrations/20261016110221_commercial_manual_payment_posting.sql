ALTER TABLE public.invoices ADD COLUMN shipping_cost numeric(18,2) NOT NULL DEFAULT 0
  CHECK (shipping_cost >= 0 AND shipping_cost < 1e16);
ALTER TABLE public.invoices DROP CONSTRAINT invoices_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_totals_check
  CHECK (total_amount = subtotal + tax_amount + shipping_cost - discount_amount);
CREATE UNIQUE INDEX invoices_one_full_invoice_per_order ON public.invoices(order_id) WHERE order_id IS NOT NULL;
ALTER TABLE public.payments ADD COLUMN recorded_by uuid REFERENCES auth.users(id);
ALTER TABLE public.payments ADD COLUMN idempotency_key uuid;
CREATE UNIQUE INDEX payments_manual_idempotency ON public.payments(invoice_id,idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX payments_recorded_by_idx ON public.payments(recorded_by) WHERE recorded_by IS NOT NULL;

CREATE FUNCTION public.create_invoice_from_order(
  p_order_id uuid, p_customer_id uuid, p_invoice_number text, p_due_date timestamptz DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $function$
DECLARE v_order public.orders; v_existing public.invoices; v_id uuid; v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_order FROM public.orders WHERE id=p_order_id AND user_id=v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order unavailable' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.fabricator_customers WHERE id=p_customer_id AND owner_user_id=v_uid) THEN
    RAISE EXCEPTION 'customer unavailable' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_existing FROM public.invoices WHERE order_id=p_order_id;
  IF FOUND THEN
    IF v_existing.customer_id <> p_customer_id THEN RAISE EXCEPTION 'order already invoiced to another customer'; END IF;
    RETURN v_existing.id;
  END IF;
  IF p_invoice_number IS NULL OR length(trim(p_invoice_number)) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'invoice number required';
  END IF;
  INSERT INTO public.invoices(owner_user_id,customer_id,order_id,invoice_number,status,currency,
    subtotal,tax_amount,discount_amount,shipping_cost,total_amount,due_date,billing_address)
  VALUES(v_uid,p_customer_id,p_order_id,trim(p_invoice_number),'sent',coalesce(v_order.currency,'EGP'),
    v_order.subtotal,coalesce(v_order.tax_amount,0),coalesce(v_order.discount_amount,0),
    coalesce(v_order.shipping_cost,0),v_order.total_amount,p_due_date,v_order.billing_address)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.create_invoice_from_order(uuid,uuid,text,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_invoice_from_order(uuid,uuid,text,timestamptz) TO authenticated;

CREATE FUNCTION public.record_manual_invoice_payment(
  p_invoice_id uuid,p_amount numeric,p_currency text,p_method text,p_idempotency_key uuid,p_notes text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $function$
DECLARE v_invoice public.invoices; v_existing public.payments; v_paid numeric; v_id uuid; v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_invoice FROM public.invoices WHERE id=p_invoice_id AND owner_user_id=v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invoice unavailable' USING ERRCODE='42501'; END IF;
  IF p_idempotency_key IS NULL THEN RAISE EXCEPTION 'idempotency key required'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount >= 1e16 OR p_amount <> round(p_amount,2)
     OR p_amount::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'invalid payment amount'; END IF;
  IF p_method IS NULL OR p_method NOT IN ('cash','check','bank_transfer') THEN
    RAISE EXCEPTION 'provider payments require verified server processing';
  END IF;
  IF p_currency IS DISTINCT FROM v_invoice.currency THEN RAISE EXCEPTION 'payment currency mismatch'; END IF;
  SELECT * INTO v_existing FROM public.payments WHERE invoice_id=p_invoice_id AND idempotency_key=p_idempotency_key;
  IF FOUND THEN
    IF v_existing.amount <> p_amount OR v_existing.method <> p_method THEN RAISE EXCEPTION 'idempotency payload mismatch'; END IF;
    RETURN v_existing.id;
  END IF;
  IF v_invoice.status NOT IN ('pending','sent','partial') THEN RAISE EXCEPTION 'invoice not payable'; END IF;
  SELECT coalesce(sum(amount),0) INTO v_paid FROM public.payments WHERE invoice_id=p_invoice_id AND status='completed';
  IF p_amount > v_invoice.total_amount-v_paid THEN RAISE EXCEPTION 'payment exceeds invoice balance'; END IF;
  INSERT INTO public.payments(invoice_id,customer_id,amount,currency,method,status,completed_at,notes,recorded_by,idempotency_key)
  VALUES(p_invoice_id,v_invoice.customer_id,p_amount,p_currency,p_method,'completed',now(),p_notes,v_uid,p_idempotency_key)
  RETURNING id INTO v_id;
  UPDATE public.invoices SET status=CASE WHEN v_paid+p_amount=total_amount THEN 'paid' ELSE 'partial' END,
    updated_at=now() WHERE id=p_invoice_id;
  RETURN v_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.record_manual_invoice_payment(uuid,numeric,text,text,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_manual_invoice_payment(uuid,numeric,text,text,uuid,text) TO authenticated;
