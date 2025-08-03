-- Create a special function for bootstrap admin creation that bypasses security
CREATE OR REPLACE FUNCTION public.create_bootstrap_admin(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- This function can only be used when no admin exists
    IF EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin' AND deleted_at IS NULL) THEN
        RAISE EXCEPTION 'Admin already exists. This function can only be used for bootstrap.';
    END IF;
    
    -- Update the user to admin role without triggering security checks
    UPDATE public.profiles 
    SET role = 'admin'
    WHERE user_id = p_user_id 
    AND deleted_at IS NULL;
    
    -- Log this action
    INSERT INTO public.audit_logs (
        user_id,
        event,
        action_type,
        success,
        metadata
    ) VALUES (
        p_user_id,
        'bootstrap_admin_created',
        'security',
        true,
        jsonb_build_object('note', 'Bootstrap admin created via special function')
    );
END;
$$;

-- Use the function to create the first admin
SELECT public.create_bootstrap_admin('5797da1c-10a1-46cb-af5d-16ea802948b0');