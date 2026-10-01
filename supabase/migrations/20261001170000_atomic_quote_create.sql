-- Atomic quote header + items. Service role only.
-- Drops JWT-claim quote admin policy that can honor client-influenced user_role.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE OR REPLACE FUNCTION public.create_quote_with_items(_header jsonb, _items jsonb)
RETURNS public.quotes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  new_quote public.quotes;
  item jsonb;
  line_total numeric;
BEGIN
  INSERT INTO public.quotes (
    contact_name,
    contact_email,
    contact_phone,
    company,
    project_description,
    urgency,
    delivery_location,
    special_requirements,
    related_service_ticket_id,
    machine_id,
    total_amount,
    contact_info,
    user_id
  ) VALUES (
    _header->>'contact_name',
    _header->>'contact_email',
    _header->>'contact_phone',
    _header->>'company',
    _header->>'project_description',
    COALESCE(_header->>'urgency', 'standard'),
    _header->>'delivery_location',
    _header->>'special_requirements',
    CASE
      WHEN COALESCE(_header->>'related_service_ticket_id', '') ~
        '^[0-9a-fA-F-]{36}$'
      THEN (_header->>'related_service_ticket_id')::uuid
      ELSE NULL
    END,
    CASE
      WHEN COALESCE(_header->>'machine_id', '') ~ '^[0-9a-fA-F-]{36}$'
      THEN (_header->>'machine_id')::uuid
      ELSE NULL
    END,
    COALESCE((_header->>'total_amount')::numeric, 0),
    COALESCE(_header->'contact_info', '{}'::jsonb),
    CASE
      WHEN COALESCE(_header->>'user_id', '') ~ '^[0-9a-fA-F-]{36}$'
      THEN (_header->>'user_id')::uuid
      ELSE NULL
    END
  )
  RETURNING * INTO new_quote;

  FOR item IN
    SELECT value FROM jsonb_array_elements(COALESCE(_items, '[]'::jsonb))
  LOOP
    line_total := COALESCE((item->>'total_price')::numeric, 0);
    INSERT INTO public.quote_items (
      quote_id,
      product_id,
      service_id,
      quantity,
      unit_price,
      total_price
    ) VALUES (
      new_quote.id,
      CASE
        WHEN COALESCE(item->>'product_id', '') ~ '^[0-9a-fA-F-]{36}$'
        THEN (item->>'product_id')::uuid
        ELSE NULL
      END,
      NULLIF(item->>'service_id', ''),
      GREATEST(COALESCE((item->>'quantity')::integer, 1), 1),
      COALESCE((item->>'unit_price')::numeric, 0),
      line_total
    );
  END LOOP;

  UPDATE public.quotes
  SET total_amount = COALESCE((
    SELECT SUM(total_price) FROM public.quote_items WHERE quote_id = new_quote.id
  ), new_quote.total_amount)
  WHERE id = new_quote.id
  RETURNING * INTO new_quote;

  RETURN new_quote;
END;
$$;

REVOKE ALL ON FUNCTION public.create_quote_with_items(jsonb, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_quote_with_items(jsonb, jsonb) TO service_role;

DROP POLICY IF EXISTS "admins_manage_quotes_jwt" ON public.quotes;

DROP POLICY IF EXISTS "quote_items_insert_owner" ON public.quote_items;
CREATE POLICY "quote_items_insert_owner" ON public.quote_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_items.quote_id
        AND q.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "quote_items_update_owner" ON public.quote_items;
CREATE POLICY "quote_items_update_owner" ON public.quote_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_items.quote_id
        AND q.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_items.quote_id
        AND q.user_id = (SELECT auth.uid())
    )
  );

NOTIFY pgrst, 'reload schema';
COMMIT;
