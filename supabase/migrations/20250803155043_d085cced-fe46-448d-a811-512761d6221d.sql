-- Remove custom MFA columns from profiles table
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS mfa_secret,
DROP COLUMN IF EXISTS backup_codes;

-- Keep mfa_enabled and mfa_verified_at for application logic tracking
-- These will be used to track MFA status in the application layer