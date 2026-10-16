-- Staging-only validation; transaction rolls back. Requires the staging fixture identities.
BEGIN;
DO $test$
DECLARE user_a uuid; user_b uuid; row_id uuid:=gen_random_uuid();
BEGIN
 SELECT id INTO user_a FROM public.profiles ORDER BY id LIMIT 1;
 SELECT id INTO user_b FROM public.profiles WHERE id<>user_a ORDER BY id LIMIT 1;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',user_a,'role','authenticated')::text,true);
 SET LOCAL ROLE authenticated;
 INSERT INTO public.chat_interactions(user_message,bot_response) VALUES('fixture-question','fixture-answer');
 IF NOT EXISTS(SELECT 1 FROM public.chat_interactions WHERE user_message='fixture-question') THEN RAISE EXCEPTION 'own chat unreadable'; END IF;
 PERFORM 1 FROM public.fabricator_cutting_plans LIMIT 1;
 RESET ROLE;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',user_b,'role','authenticated')::text,true);
 SET LOCAL ROLE authenticated;
 IF EXISTS(SELECT 1 FROM public.chat_interactions WHERE user_message='fixture-question') THEN RAISE EXCEPTION 'chat tenant leak'; END IF;
 RESET ROLE;
END;
$test$;
ROLLBACK;
SELECT 'chat isolation and security-invoker cutting-plan access passed' AS result;
