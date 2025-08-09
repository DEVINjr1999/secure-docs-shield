-- Fix policy existence checks using correct column names
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'security_questions' AND policyname = 'Users can view their own security questions'
  ) THEN
    CREATE POLICY "Users can view their own security questions"
    ON public.security_questions
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'security_questions' AND policyname = 'Users can insert their own security questions'
  ) THEN
    CREATE POLICY "Users can insert their own security questions"
    ON public.security_questions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'security_questions' AND policyname = 'Users can update their own security questions'
  ) THEN
    CREATE POLICY "Users can update their own security questions"
    ON public.security_questions
    FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;
END$$;