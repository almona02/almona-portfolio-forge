-- Fix PL/pgSQL ambiguity: RETURNS TABLE(owner_user_id ...) shadows table column.
CREATE OR REPLACE FUNCTION public.acknowledge_fabricator_delivery(
  p_position_id UUID,
  p_expected_revision BIGINT,
  p_release_id UUID,
  p_quality_approval_id UUID,
  p_gps_latitude NUMERIC,
  p_gps_longitude NUMERIC,
  p_gps_accuracy_m NUMERIC,
  p_photo_hash TEXT,
  p_product_qr TEXT,
  p_signature_hash TEXT,
  p_delivery_notes TEXT,
  p_customer_feedback TEXT,
  p_idempotency_key UUID
) RETURNS TABLE (
  acknowledgement_id UUID,
  project_id UUID,
  position_id UUID,
  revision BIGINT,
  owner_user_id UUID,
  acknowledged_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_release public.fabricator_position_releases%ROWTYPE;
  v_qc public.fabricator_quality_approvals%ROWTYPE;
  v_existing public.fabricator_delivery_acknowledgements%ROWTYPE;
  v_expected_qr TEXT;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_expected_revision IS NULL OR p_expected_revision < 1 THEN
    RAISE EXCEPTION 'Positive revision required';
  END IF;
  IF p_photo_hash IS NULL OR char_length(p_photo_hash) < 32 THEN
    RAISE EXCEPTION 'Photo evidence hash required';
  END IF;
  IF p_signature_hash IS NULL OR char_length(p_signature_hash) < 32 THEN
    RAISE EXCEPTION 'Signature evidence hash required';
  END IF;
  IF p_product_qr IS NULL OR char_length(p_product_qr) < 8 THEN
    RAISE EXCEPTION 'Product QR required';
  END IF;
  IF p_gps_latitude IS NULL OR p_gps_longitude IS NULL THEN
    RAISE EXCEPTION 'GPS coordinates required';
  END IF;

  SELECT * INTO v_existing
  FROM public.fabricator_delivery_acknowledgements d
  WHERE d.owner_user_id = v_user AND d.idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN QUERY SELECT
      v_existing.id,
      v_existing.project_id,
      v_existing.position_id,
      v_existing.revision,
      v_existing.owner_user_id,
      v_existing.acknowledged_at;
    RETURN;
  END IF;

  SELECT * INTO v_release
  FROM public.fabricator_position_releases r
  WHERE r.id = p_release_id
    AND r.owner_user_id = v_user
    AND r.position_id = p_position_id
    AND r.revision = p_expected_revision;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Release not found for this position revision';
  END IF;

  SELECT * INTO v_qc
  FROM public.fabricator_quality_approvals q
  WHERE q.id = p_quality_approval_id
    AND q.position_id = p_position_id
    AND q.revision = p_expected_revision
    AND q.inspector_id = v_user;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'QC approval not found for this position revision';
  END IF;

  v_expected_qr := 'ALMONA_' || p_position_id::text || '_R' || p_expected_revision::text;
  IF p_product_qr <> v_expected_qr THEN
    RAISE EXCEPTION 'Product QR does not match released position revision';
  END IF;

  SELECT * INTO v_existing
  FROM public.fabricator_delivery_acknowledgements d
  WHERE d.position_id = p_position_id AND d.revision = p_expected_revision;
  IF FOUND THEN
    IF v_existing.owner_user_id <> v_user THEN
      RAISE EXCEPTION 'Delivery already acknowledged by another operator';
    END IF;
    RETURN QUERY SELECT
      v_existing.id,
      v_existing.project_id,
      v_existing.position_id,
      v_existing.revision,
      v_existing.owner_user_id,
      v_existing.acknowledged_at;
    RETURN;
  END IF;

  RETURN QUERY
  INSERT INTO public.fabricator_delivery_acknowledgements (
    owner_user_id,
    project_id,
    position_id,
    revision,
    release_id,
    quality_approval_id,
    gps_latitude,
    gps_longitude,
    gps_accuracy_m,
    photo_hash,
    product_qr,
    signature_hash,
    delivery_notes,
    customer_feedback,
    evidence,
    idempotency_key
  ) VALUES (
    v_user,
    v_release.project_id,
    p_position_id,
    p_expected_revision,
    p_release_id,
    p_quality_approval_id,
    p_gps_latitude,
    p_gps_longitude,
    p_gps_accuracy_m,
    p_photo_hash,
    p_product_qr,
    p_signature_hash,
    COALESCE(p_delivery_notes, ''),
    COALESCE(p_customer_feedback, ''),
    jsonb_build_object(
      'release_id', p_release_id,
      'quality_approval_id', p_quality_approval_id,
      'photo_hash', p_photo_hash,
      'product_qr', p_product_qr,
      'signature_hash', p_signature_hash
    ),
    p_idempotency_key
  )
  RETURNING
    public.fabricator_delivery_acknowledgements.id,
    public.fabricator_delivery_acknowledgements.project_id,
    public.fabricator_delivery_acknowledgements.position_id,
    public.fabricator_delivery_acknowledgements.revision,
    public.fabricator_delivery_acknowledgements.owner_user_id,
    public.fabricator_delivery_acknowledgements.acknowledged_at;
END;
$$;
