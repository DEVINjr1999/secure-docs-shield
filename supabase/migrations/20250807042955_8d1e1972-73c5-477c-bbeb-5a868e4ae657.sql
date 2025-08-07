-- Remove custom MFA functions and use Supabase's native MFA
DROP FUNCTION IF EXISTS public.setup_mfa(text);
DROP FUNCTION IF EXISTS public.verify_mfa_code(text, boolean);
DROP FUNCTION IF EXISTS public.disable_mfa();
DROP FUNCTION IF EXISTS public.get_mfa_secret();

-- Update profiles table to remove custom MFA columns since we'll use Supabase native
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS mfa_secret,
DROP COLUMN IF EXISTS mfa_backup_codes;