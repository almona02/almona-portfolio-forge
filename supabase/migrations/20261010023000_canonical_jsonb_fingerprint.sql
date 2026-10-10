-- Explicit canonical JSON serialization for fingerprint parity (TS ↔ SQL).
-- DO NOT apply to production without separate owner authorization.
--
-- Contract (must match src/.../canonicalJsonbSerialize):
--   null            → null
--   boolean         → true | false
--   number          → shortest decimal (no exponent; integer-valued without ".0")
--   string          → JSON-escaped UTF-8 double-quoted string
--   array           → [elem, elem]  (comma+space)
--   object          → {"k": v, ...} keys sorted UTF-8 binary, comma+space, space after ':'
-- Never use jsonb::text / ::text on nested objects for fingerprints.

CREATE OR REPLACE FUNCTION public.canonical_jsonb_serialize(p_value JSONB)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
STRICT
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_type TEXT;
  v_keys TEXT[];
  v_parts TEXT[] := ARRAY[]::TEXT[];
  v_key TEXT;
  v_num NUMERIC;
  v_num_text TEXT;
  i INT;
BEGIN
  IF p_value IS NULL THEN
    RETURN 'null';
  END IF;

  v_type := jsonb_typeof(p_value);

  IF v_type = 'null' THEN
    RETURN 'null';
  ELSIF v_type = 'boolean' THEN
    IF (p_value #>> '{}') = 'true' THEN
      RETURN 'true';
    END IF;
    RETURN 'false';
  ELSIF v_type = 'number' THEN
    v_num := (p_value #>> '{}')::NUMERIC;
    IF v_num = trunc(v_num) AND v_num BETWEEN -9007199254740991::NUMERIC AND 9007199254740991::NUMERIC THEN
      RETURN trunc(v_num)::TEXT;
    END IF;
    -- Trim trailing zeros after decimal; never use scientific notation.
    v_num_text := trim(both FROM to_char(v_num, 'FM999999999999999999990.99999999999999999999'));
    IF v_num_text = '' OR v_num_text = '.' OR v_num_text = '-.' THEN
      RETURN '0';
    END IF;
    IF right(v_num_text, 1) = '.' THEN
      v_num_text := left(v_num_text, length(v_num_text) - 1);
    END IF;
    RETURN v_num_text;
  ELSIF v_type = 'string' THEN
    -- jsonb string scalar → JSON-escaped via to_json (text form includes quotes)
    RETURN to_json(p_value #>> '{}')::TEXT;
  ELSIF v_type = 'array' THEN
    IF jsonb_array_length(p_value) = 0 THEN
      RETURN '[]';
    END IF;
    FOR i IN 0 .. jsonb_array_length(p_value) - 1 LOOP
      v_parts := array_append(v_parts, public.canonical_jsonb_serialize(p_value->i));
    END LOOP;
    RETURN '[' || array_to_string(v_parts, ', ') || ']';
  ELSIF v_type = 'object' THEN
    SELECT coalesce(array_agg(k ORDER BY k), ARRAY[]::TEXT[])
      INTO v_keys
    FROM jsonb_object_keys(p_value) AS k;
    IF coalesce(array_length(v_keys, 1), 0) = 0 THEN
      RETURN '{}';
    END IF;
    FOREACH v_key IN ARRAY v_keys LOOP
      v_parts := array_append(
        v_parts,
        to_json(v_key)::TEXT || ': ' || public.canonical_jsonb_serialize(p_value->v_key)
      );
    END LOOP;
    RETURN '{' || array_to_string(v_parts, ', ') || '}';
  END IF;

  RETURN 'null';
END;
$$;

CREATE OR REPLACE FUNCTION public.approved_rule_content_fingerprint(p_cutting_rules JSONB)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_parts TEXT[] := ARRAY[]::TEXT[];
  v_rule JSONB;
  i INT;
  v_canonical TEXT;
BEGIN
  IF p_cutting_rules IS NULL OR jsonb_typeof(p_cutting_rules) IS DISTINCT FROM 'array' THEN
    RETURN '';
  END IF;
  FOR i IN 0 .. coalesce(jsonb_array_length(p_cutting_rules), 0) - 1 LOOP
    v_rule := p_cutting_rules->i;
    IF coalesce(v_rule->>'evidenceStatus', '') IS DISTINCT FROM 'approved' THEN
      CONTINUE;
    END IF;
    v_parts := array_append(
      v_parts,
      concat_ws(
        '|',
        coalesce(v_rule->>'approvalId', ''),
        coalesce(v_rule->>'ruleId', ''),
        coalesce(v_rule->>'revision', '0'),
        'approved',
        public.canonical_jsonb_serialize(coalesce(v_rule->'deductions', 'null'::JSONB)),
        public.canonical_jsonb_serialize(coalesce(v_rule->'allowances', 'null'::JSONB)),
        public.canonical_jsonb_serialize(coalesce(v_rule->'applicability', 'null'::JSONB))
      )
    );
  END LOOP;
  SELECT coalesce(array_agg(x ORDER BY x), ARRAY[]::TEXT[]) INTO v_parts FROM unnest(v_parts) AS x;
  v_canonical := coalesce(array_to_string(v_parts, ';'), '');
  IF length(v_canonical) < 4 THEN
    RETURN '';
  END IF;
  RETURN encode(digest(v_canonical, 'sha256'), 'hex');
END;
$$;

CREATE OR REPLACE FUNCTION public.authority_content_fingerprint(p_authority JSONB)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_settings TEXT;
  v_stocks TEXT;
  v_rules TEXT;
  v_canonical TEXT;
BEGIN
  v_settings := public.canonical_jsonb_serialize(
    coalesce(p_authority->'manufacturingSettings', '{}'::JSONB)
  );
  SELECT coalesce(string_agg(s::TEXT, ',' ORDER BY s), '')
    INTO v_stocks
  FROM unnest(public.authority_permitted_stock_lengths(p_authority)) AS s;
  v_rules := public.approved_rule_content_fingerprint(p_authority->'cuttingRules');
  v_canonical := concat_ws('||', v_settings, 'stocks=' || v_stocks, 'rules=' || v_rules);
  RETURN encode(digest(v_canonical, 'sha256'), 'hex');
END;
$$;

REVOKE ALL ON FUNCTION public.canonical_jsonb_serialize(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.canonical_jsonb_serialize(JSONB) TO authenticated;
REVOKE ALL ON FUNCTION public.approved_rule_content_fingerprint(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approved_rule_content_fingerprint(JSONB) TO authenticated;
REVOKE ALL ON FUNCTION public.authority_content_fingerprint(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.authority_content_fingerprint(JSONB) TO authenticated;
