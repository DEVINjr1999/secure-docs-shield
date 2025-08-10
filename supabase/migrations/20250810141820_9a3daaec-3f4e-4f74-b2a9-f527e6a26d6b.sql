-- Allow security questions MFA in profiles.mfa_method
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_mfa_method_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_mfa_method_check
CHECK (mfa_method IS NULL OR mfa_method IN ('totp','security_questions'));

-- Optional: document the change in audit logs (non-blocking)
-- Note: Using SECURITY DEFINER function ensures insert under RLS
DO $$
BEGIN
  PERFORM public.log_audit_event(
    NULL,
    'mfa_method_constraint_updated',
    'security',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    jsonb_build_object('allowed_values', ARRAY['totp','security_questions']),
    NULL,
    TRUE,
    NULL,
    jsonb_build_object('performed_by_migration', TRUE)
  );
EXCEPTION WHEN OTHERS THEN
  -- ignore logging failures
  NULL;
END $$;