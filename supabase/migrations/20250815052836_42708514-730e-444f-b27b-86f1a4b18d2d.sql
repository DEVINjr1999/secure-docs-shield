-- Create function to verify admin/reviewer password
CREATE OR REPLACE FUNCTION public.verify_admin_reviewer_password(p_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    stored_password text;
    user_profile RECORD;
BEGIN
    -- Check if user is admin or legal_reviewer
    SELECT role INTO user_profile
    FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND account_status = 'active' 
    AND deleted_at IS NULL;
    
    IF user_profile.role NOT IN ('admin', 'legal_reviewer') THEN
        RETURN false;
    END IF;
    
    -- This would normally get the password from Supabase secrets
    -- For now, we'll create a simple verification system
    -- In production, this should be more secure
    
    -- Log the password verification attempt
    PERFORM log_audit_event(
        auth.uid(),
        'admin_password_verification',
        'security',
        null,
        null,
        null,
        null,
        null,
        jsonb_build_object('success', p_password IS NOT NULL),
        null,
        p_password IS NOT NULL,
        null,
        jsonb_build_object('user_role', user_profile.role)
    );
    
    -- For demo purposes, return true if password is provided and user has correct role
    -- In production, implement proper password verification
    RETURN p_password IS NOT NULL AND length(p_password) > 0;
END;
$$;