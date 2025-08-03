-- Add MFA secret storage to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS mfa_secret text,
ADD COLUMN IF NOT EXISTS backup_codes text[];

-- Add index for MFA lookups
CREATE INDEX IF NOT EXISTS idx_profiles_mfa_enabled ON public.profiles(mfa_enabled) WHERE mfa_enabled = true;