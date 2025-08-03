-- Create secure admin promotion function
CREATE OR REPLACE FUNCTION public.promote_to_admin(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    target_profile RECORD;
    promoting_user_id uuid;
    result jsonb;
BEGIN
    -- Get the user making the request
    promoting_user_id := auth.uid();
    
    -- Check if promoting user is admin
    IF NOT is_admin() THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Only administrators can promote users'
        );
    END IF;
    
    -- Get target user profile
    SELECT * INTO target_profile
    FROM public.profiles
    WHERE user_id = p_user_id AND deleted_at IS NULL;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;
    
    -- Check if already admin
    IF target_profile.role = 'admin' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User is already an admin'
        );
    END IF;
    
    -- Update role to admin
    UPDATE public.profiles
    SET role = 'admin'
    WHERE user_id = p_user_id;
    
    -- Log the promotion
    PERFORM log_audit_event(
        p_user_id,
        'role_promoted_to_admin',
        'security',
        null,
        null,
        null,
        null,
        jsonb_build_object('old_role', target_profile.role),
        jsonb_build_object('new_role', 'admin'),
        null,
        true,
        null,
        jsonb_build_object('promoted_by', promoting_user_id)
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'User promoted to admin successfully'
    );
END;
$$;

-- Create secure encryption key generation function
CREATE OR REPLACE FUNCTION public.generate_secure_encryption_key(p_document_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    user_id uuid;
    key_material text;
    key_hash text;
    result jsonb;
BEGIN
    user_id := auth.uid();
    
    IF user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Authentication required'
        );
    END IF;
    
    -- Generate cryptographically secure key material using multiple entropy sources
    key_material := encode(
        digest(
            user_id::text || 
            p_document_id::text || 
            extract(epoch from now())::text ||
            gen_random_bytes(32)::text,
            'sha256'
        ),
        'hex'
    );
    
    -- Create hash for storage
    key_hash := encode(digest(key_material, 'sha256'), 'hex');
    
    -- Log key generation (without storing the actual key)
    PERFORM log_audit_event(
        user_id,
        'encryption_key_generated',
        'security',
        null,
        null,
        null,
        p_document_id,
        null,
        jsonb_build_object('key_hash', key_hash),
        null,
        true,
        null,
        jsonb_build_object('document_id', p_document_id)
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'key', key_material,
        'key_hash', key_hash
    );
END;
$$;

-- Create session invalidation function for security events
CREATE OR REPLACE FUNCTION public.invalidate_user_sessions(p_user_id uuid, p_reason text DEFAULT 'security_event')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Mark all user sessions as inactive
    UPDATE public.user_sessions
    SET is_active = false
    WHERE user_id = p_user_id AND is_active = true;
    
    -- Log session invalidation
    PERFORM log_audit_event(
        p_user_id,
        'sessions_invalidated',
        'security',
        null,
        null,
        null,
        null,
        null,
        jsonb_build_object('reason', p_reason),
        null,
        true,
        null,
        jsonb_build_object('invalidated_by', auth.uid())
    );
END;
$$;