-- Fix the ambiguous user_id column reference in setup_mfa function
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
    
    -- Update user profile - fully qualify the table and column names
    UPDATE public.profiles
    SET 
        mfa_secret = encrypted_secret,
        mfa_backup_codes = to_jsonb(backup_codes),
        mfa_enabled = true
    WHERE public.profiles.user_id = setup_mfa.user_id;
    
    -- Log MFA setup
    PERFORM log_audit_event(
        setup_mfa.user_id,
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