-- Add MFA support to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS mfa_secret text,
ADD COLUMN IF NOT EXISTS mfa_backup_codes jsonb DEFAULT '[]'::jsonb;

-- Create function to setup MFA
CREATE OR REPLACE FUNCTION public.setup_mfa(p_secret text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    user_id uuid;
    encrypted_secret text;
    backup_codes text[];
    i integer;
BEGIN
    user_id := auth.uid();
    
    IF user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Authentication required'
        );
    END IF;
    
    -- Encrypt the secret (simple base64 encoding for now, could be enhanced)
    encrypted_secret := encode(p_secret::bytea, 'base64');
    
    -- Generate 10 backup codes (8 chars each)
    backup_codes := ARRAY[]::text[];
    FOR i IN 1..10 LOOP
        backup_codes := array_append(backup_codes, 
            substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)
        );
    END LOOP;
    
    -- Update user profile
    UPDATE public.profiles
    SET 
        mfa_secret = encrypted_secret,
        mfa_backup_codes = to_jsonb(backup_codes),
        mfa_enabled = true
    WHERE user_id = setup_mfa.user_id;
    
    -- Log MFA setup
    PERFORM log_audit_event(
        user_id,
        'mfa_enabled',
        'security',
        null,
        null,
        null,
        null,
        jsonb_build_object('mfa_enabled', false),
        jsonb_build_object('mfa_enabled', true),
        null,
        true,
        null,
        jsonb_build_object('method', 'totp')
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'backup_codes', backup_codes
    );
END;
$function$;

-- Create function to verify MFA code
CREATE OR REPLACE FUNCTION public.verify_mfa_code(p_code text, p_is_backup_code boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    user_id uuid;
    profile_record RECORD;
    backup_codes jsonb;
    code_found boolean := false;
    remaining_codes text[];
BEGIN
    user_id := auth.uid();
    
    IF user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Authentication required'
        );
    END IF;
    
    -- Get user profile
    SELECT mfa_secret, mfa_backup_codes INTO profile_record
    FROM public.profiles
    WHERE profiles.user_id = verify_mfa_code.user_id AND mfa_enabled = true;
    
    IF NOT FOUND OR profile_record.mfa_secret IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'MFA not configured'
        );
    END IF;
    
    -- Handle backup code verification
    IF p_is_backup_code THEN
        backup_codes := profile_record.mfa_backup_codes;
        
        -- Check if code exists in backup codes
        IF backup_codes ? p_code THEN
            -- Remove used backup code
            SELECT array_agg(value::text) INTO remaining_codes
            FROM jsonb_array_elements_text(backup_codes)
            WHERE value::text != p_code;
            
            -- Update profile with remaining codes
            UPDATE public.profiles
            SET mfa_backup_codes = to_jsonb(COALESCE(remaining_codes, ARRAY[]::text[]))
            WHERE profiles.user_id = verify_mfa_code.user_id;
            
            code_found := true;
        END IF;
    END IF;
    
    -- Log verification attempt
    PERFORM log_audit_event(
        user_id,
        CASE WHEN code_found THEN 'mfa_verification_success' ELSE 'mfa_verification_failed' END,
        'auth',
        null,
        null,
        null,
        null,
        null,
        jsonb_build_object('code_type', CASE WHEN p_is_backup_code THEN 'backup' ELSE 'totp' END),
        null,
        code_found,
        CASE WHEN NOT code_found THEN 'Invalid code' ELSE null END,
        null
    );
    
    RETURN jsonb_build_object(
        'success', code_found,
        'error', CASE WHEN NOT code_found THEN 'Invalid code' ELSE null END
    );
END;
$function$;

-- Create function to disable MFA
CREATE OR REPLACE FUNCTION public.disable_mfa()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    user_id uuid;
BEGIN
    user_id := auth.uid();
    
    IF user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Authentication required'
        );
    END IF;
    
    -- Update user profile
    UPDATE public.profiles
    SET 
        mfa_secret = null,
        mfa_backup_codes = '[]'::jsonb,
        mfa_enabled = false
    WHERE profiles.user_id = disable_mfa.user_id;
    
    -- Log MFA disable
    PERFORM log_audit_event(
        user_id,
        'mfa_disabled',
        'security',
        null,
        null,
        null,
        null,
        jsonb_build_object('mfa_enabled', true),
        jsonb_build_object('mfa_enabled', false),
        null,
        true,
        null,
        null
    );
    
    RETURN jsonb_build_object(
        'success', true
    );
END;
$function$;

-- Create function to get MFA secret for verification
CREATE OR REPLACE FUNCTION public.get_mfa_secret()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    user_id uuid;
    encrypted_secret text;
BEGIN
    user_id := auth.uid();
    
    IF user_id IS NULL THEN
        RETURN null;
    END IF;
    
    SELECT mfa_secret INTO encrypted_secret
    FROM public.profiles
    WHERE profiles.user_id = get_mfa_secret.user_id AND mfa_enabled = true;
    
    -- Decrypt the secret (reverse base64 encoding)
    IF encrypted_secret IS NOT NULL THEN
        RETURN convert_from(decode(encrypted_secret, 'base64'), 'UTF8');
    END IF;
    
    RETURN null;
END;
$function$;