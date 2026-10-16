-- customer_id always identifies a workshop customer, never an auth user.
-- Portal membership is assigned by a trusted server after invitation verification.
CREATE TABLE public.fabricator_customer_portal_accounts (
  customer_id uuid NOT NULL REFERENCES public.fabricator_customers(id),
  portal_user_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (customer_id, portal_user_id)
);
CREATE INDEX fabricator_customer_portal_user_idx
  ON public.fabricator_customer_portal_accounts(portal_user_id, customer_id);
ALTER TABLE public.fabricator_customer_portal_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fabricator_customer_portal_accounts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.fabricator_customer_portal_accounts TO authenticated;
GRANT ALL ON public.fabricator_customer_portal_accounts TO service_role;
CREATE POLICY portal_account_read_self ON public.fabricator_customer_portal_accounts
  FOR SELECT TO authenticated USING (portal_user_id = (SELECT auth.uid()));

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES public.profiles(id),
  customer_id uuid NOT NULL REFERENCES public.fabricator_customers(id),
  order_id uuid REFERENCES public.orders(id),
  invoice_number text NOT NULL CHECK (length(trim(invoice_number)) > 0),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','pending','sent','partial','paid','cancelled')),
  currency text NOT NULL DEFAULT 'EGP' CHECK (currency ~ '^[A-Z]{3}$'),
  subtotal numeric(18,2) NOT NULL CHECK (subtotal >= 0 AND subtotal < 1e16),
  tax_amount numeric(18,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0 AND tax_amount < 1e16),
  tax_rate numeric(8,6) NOT NULL DEFAULT 0 CHECK (tax_rate >= 0 AND tax_rate <= 1),
  discount_amount numeric(18,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0 AND discount_amount < 1e16),
  total_amount numeric(18,2) NOT NULL CHECK (total_amount >= 0 AND total_amount < 1e16),
  due_date timestamptz,
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(line_items) = 'array'),
  billing_address jsonb NOT NULL DEFAULT '{}'::jsonb,
  exemption_certificate jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_user_id, invoice_number),
  UNIQUE(id, customer_id, currency),
  CHECK (total_amount = subtotal + tax_amount - discount_amount)
);
CREATE INDEX invoices_owner_created_idx ON public.invoices(owner_user_id, created_at DESC);
CREATE INDEX invoices_customer_created_idx ON public.invoices(customer_id, created_at DESC);
CREATE INDEX invoices_order_idx ON public.invoices(order_id) WHERE order_id IS NOT NULL;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.invoices FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
CREATE POLICY invoice_read_authorized ON public.invoices FOR SELECT TO authenticated
  USING (
    owner_user_id = (SELECT auth.uid()) OR
    customer_id IN (SELECT a.customer_id FROM public.fabricator_customer_portal_accounts a
      WHERE a.portal_user_id = (SELECT auth.uid()))
  );

-- Server-only posting prevents clients from fabricating settled payments.
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  amount numeric(18,2) NOT NULL CHECK (amount > 0 AND amount < 1e16),
  currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  method text NOT NULL CHECK (method IN ('stripe','paypal','bank_transfer','cash','check')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','completed','failed','refunded','cancelled')),
  transaction_id text,
  processor_response jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  refunded_at timestamptz,
  notes text,
  FOREIGN KEY(invoice_id, customer_id, currency) REFERENCES public.invoices(id, customer_id, currency),
  UNIQUE(method, transaction_id),
  CHECK (status <> 'completed' OR completed_at IS NOT NULL)
);
CREATE INDEX payments_invoice_idx ON public.payments(invoice_id, customer_id, currency);
CREATE INDEX payments_customer_completed_idx ON public.payments(customer_id, completed_at DESC);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payments FROM PUBLIC, anon, authenticated;
GRANT SELECT(id, invoice_id, customer_id, amount, currency, method, status, transaction_id,
  created_at, updated_at, completed_at, refunded_at, notes) ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
CREATE POLICY payment_read_authorized ON public.payments FOR SELECT TO authenticated
  USING (invoice_id IN (SELECT i.id FROM public.invoices i));

-- Verify customer/order ownership even for trusted server inserts.
CREATE FUNCTION public.validate_invoice_ownership() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.fabricator_customers c
    WHERE c.id = NEW.customer_id AND c.owner_user_id = NEW.owner_user_id) THEN
    RAISE EXCEPTION 'invoice customer owner mismatch' USING ERRCODE = '23514';
  END IF;
  IF NEW.order_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.orders o
    WHERE o.id = NEW.order_id AND o.user_id = NEW.owner_user_id) THEN
    RAISE EXCEPTION 'invoice order owner mismatch' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.validate_invoice_ownership() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER validate_invoice_ownership BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.validate_invoice_ownership();

-- Complete-account metrics, independent of the recent-activity page size.
CREATE FUNCTION public.get_client_portal_summary() RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog
AS $function$
  SELECT jsonb_build_object(
    'totalQuotes', (SELECT count(*) FROM public.quotes),
    'pendingQuotes', (SELECT count(*) FROM public.quotes WHERE status::text IN ('pending','draft')),
    'totalInvoices', (SELECT count(*) FROM public.invoices),
    'paidInvoices', (SELECT count(*) FROM public.invoices WHERE status = 'paid'),
    'pendingInvoices', (SELECT count(*) FROM public.invoices WHERE status IN ('pending','sent','partial')),
    'overdueInvoices', (SELECT count(*) FROM public.invoices
      WHERE due_date < now() AND status IN ('pending','sent','partial')),
    'currencies', coalesce((SELECT jsonb_agg(t) FROM (
      SELECT i.currency,
        coalesce(sum(i.total_amount) FILTER (WHERE i.status = 'paid'),0) AS "totalRevenue",
        coalesce(sum(i.total_amount - coalesce(p.paid,0)) FILTER (WHERE i.status IN ('pending','sent','partial')),0) AS "pendingAmount"
      FROM public.invoices i
      LEFT JOIN (SELECT invoice_id, sum(amount) AS paid FROM public.payments
        WHERE status = 'completed' GROUP BY invoice_id) p ON p.invoice_id = i.id
      GROUP BY i.currency ORDER BY i.currency
    ) t), '[]'::jsonb)
  );
$function$;
REVOKE ALL ON FUNCTION public.get_client_portal_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_client_portal_summary() TO authenticated;
