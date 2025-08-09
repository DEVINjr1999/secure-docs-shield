-- Security Questions MFA setup (idempotent)
-- 1) Table
CREATE TABLE IF NOT EXISTS public.security_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  question text NOT NULL,
  answer_hash text NOT NULL,
  salt text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.security_questions ENABLE ROW LEVEL SECURITY;

-- Helpful index
CREATE INDEX IF NOT EXISTS idx_security_questions_user ON public.security_questions(user_id) ;

-- 2) Policies (create only if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'security_questions' AND polname = 'Users can view their own security questions'
  ) THEN
    CREATE POLICY "Users can view their own security questions"
    ON public.security_questions
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'security_questions' AND polname = 'Users can insert their own security questions'
  ) THEN
    CREATE POLICY "Users can insert their own security questions"
    ON public.security_questions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'security_questions' AND polname = 'Users can update their own security questions'
  ) THEN
    CREATE POLICY "Users can update their own security questions"
    ON public.security_questions
    FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;
END$$;

-- 3) Verification function
CREATE OR REPLACE FUNCTION public.verify_security_answers(p_user_id uuid, p_answers jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  q RECORD;
  provided jsonb;
  provided_answer text;
  computed_hash text;
  correct_count int := 0;
BEGIN
  -- Require exactly two active questions
  IF (SELECT count(*) FROM public.security_questions WHERE user_id = p_user_id AND is_active) < 2 THEN
    RETURN FALSE;
  END IF;

  FOR q IN SELECT id, salt, answer_hash FROM public.security_questions WHERE user_id = p_user_id AND is_active LOOP
    provided := (
      SELECT elem
      FROM jsonb_array_elements(p_answers) elem
      WHERE (elem->>'id')::uuid = q.id
      LIMIT 1
    );

    IF provided IS NULL THEN
      RETURN FALSE;
    END IF;

    provided_answer := lower(btrim(provided->>'answer'));
    computed_hash := encode(digest(provided_answer || q.salt, 'sha256'), 'hex');

    IF computed_hash = q.answer_hash THEN
      correct_count := correct_count + 1;
    END IF;
  END LOOP;

  RETURN correct_count >= 2; -- both answers must match
END;
$function$;