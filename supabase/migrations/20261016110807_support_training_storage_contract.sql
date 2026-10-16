CREATE TABLE public.training_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 160),
  email text NOT NULL CHECK (length(email) <= 320 AND email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  company text CHECK (length(company) <= 200),
  phone text CHECK (length(phone) <= 50),
  program_level text NOT NULL CHECK (length(program_level) BETWEEN 1 AND 80),
  material text NOT NULL CHECK (material IN ('aluminium','upvc')),
  cohort_id text CHECK (length(cohort_id) <= 100),
  notes text CHECK (length(notes) <= 500),
  status text NOT NULL DEFAULT 'enquiry' CHECK (status IN ('enquiry','contacted','closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX training_enrollments_user_created_idx ON public.training_enrollments(user_id,created_at DESC);
ALTER TABLE public.training_enrollments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.training_enrollments FROM PUBLIC,anon,authenticated;
GRANT INSERT(name,email,company,phone,program_level,material,cohort_id,notes)
  ON public.training_enrollments TO anon,authenticated;
GRANT SELECT ON public.training_enrollments TO authenticated;
GRANT ALL ON public.training_enrollments TO service_role;
CREATE POLICY training_enquiry_anon_insert ON public.training_enrollments FOR INSERT TO anon
  WITH CHECK (user_id IS NULL AND status='enquiry');
CREATE POLICY training_enquiry_user_insert ON public.training_enrollments FOR INSERT TO authenticated
  WITH CHECK (user_id=(SELECT auth.uid()) AND status='enquiry');
CREATE POLICY training_enquiry_read_own ON public.training_enrollments FOR SELECT TO authenticated
  USING (user_id=(SELECT auth.uid()));

CREATE TABLE public.chat_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  user_message text NOT NULL CHECK (length(user_message) BETWEEN 1 AND 16000),
  bot_response text NOT NULL CHECK (length(bot_response) BETWEEN 1 AND 32000),
  category text CHECK (length(category) <= 80),
  severity text CHECK (length(severity) <= 80),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX chat_interactions_user_created_idx ON public.chat_interactions(user_id,created_at DESC);
ALTER TABLE public.chat_interactions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.chat_interactions FROM PUBLIC,anon,authenticated;
GRANT INSERT(user_id,user_message,bot_response,category,severity,created_at) ON public.chat_interactions TO authenticated;
GRANT SELECT ON public.chat_interactions TO authenticated;
GRANT ALL ON public.chat_interactions TO service_role;
CREATE POLICY chat_interaction_insert_own ON public.chat_interactions FOR INSERT TO authenticated
  WITH CHECK (user_id=(SELECT auth.uid()));
CREATE POLICY chat_interaction_read_own ON public.chat_interactions FOR SELECT TO authenticated
  USING (user_id=(SELECT auth.uid()));

-- Analytics projects the canonical validated evidence; there is no second writable plan store.
CREATE VIEW public.fabricator_cutting_plans WITH (security_invoker=true) AS
SELECT e.position_id::text || ':' || b.ordinality::text AS id,
  e.owner_user_id AS user_id,
  coalesce(b.value->'profile'->>'id',b.value->>'profileId') AS profile_id,
  e.validated_at AS created_at,
  CASE WHEN jsonb_typeof(b.value->'cuts')='array' THEN b.value->'cuts' ELSE '[]'::jsonb END AS cuts
FROM public.fabricator_optimization_evidence e
CROSS JOIN LATERAL jsonb_array_elements(CASE
  WHEN jsonb_typeof(e.evidence_payload->'cuttingPlan')='array' THEN e.evidence_payload->'cuttingPlan'
  ELSE '[]'::jsonb END) WITH ORDINALITY b(value,ordinality)
WHERE e.invalidated_at IS NULL
  AND coalesce(b.value->'profile'->>'id',b.value->>'profileId') IS NOT NULL;
REVOKE ALL ON public.fabricator_cutting_plans FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.fabricator_cutting_plans TO authenticated,service_role;
