-- Fix the RLS policies that might be causing hanging profile queries
-- Add a security definer function to safely fetch profiles

CREATE OR REPLACE FUNCTION public.get_user_profile(p_user_id uuid)
RETURNS TABLE (
    id uuid,
    user_id uuid,
    full_name text,
    role text,
    account_status text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    session_count integer,
    last_activity_at timestamp with time zone,
    last_login_at timestamp with time zone,
    gdpr_consent_at timestamp with time zone,
    privacy_consent_at timestamp with time zone,
    mfa_enabled boolean,
    locale text,
    username text,
    avatar_url text,
    phone text,
    recovery_email text,
    terms_accepted_at timestamp with time zone,
    mfa_method text,
    email_verified_at timestamp with time zone,
    is_compromised boolean,
    account_locked_until timestamp with time zone,
    last_failed_login_at timestamp with time zone,
    timezone text,
    failed_login_attempts integer,
    mfa_verified_at timestamp with time zone
) 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        p.id,
        p.user_id,
        p.full_name,
        p.role,
        p.account_status,
        p.created_at,
        p.updated_at,
        p.deleted_at,
        p.session_count,
        p.last_activity_at,
        p.last_login_at,
        p.gdpr_consent_at,
        p.privacy_consent_at,
        p.mfa_enabled,
        p.locale,
        p.username,
        p.avatar_url,
        p.phone,
        p.recovery_email,
        p.terms_accepted_at,
        p.mfa_method,
        p.email_verified_at,
        p.is_compromised,
        p.account_locked_until,
        p.last_failed_login_at,
        p.timezone,
        p.failed_login_attempts,
        p.mfa_verified_at
    FROM public.profiles p
    WHERE p.user_id = p_user_id 
    AND p.deleted_at IS NULL
    AND (
        -- User can access their own profile
        auth.uid() = p_user_id
        -- Or admin can access any profile
        OR is_admin()
    );
END;
$$;