-- Fix the handle_new_user function to use correct field names
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
BEGIN
    INSERT INTO public.profiles (
        user_id,
        full_name,
        email_verified_at
    ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN NEW.email_confirmed_at ELSE NULL END
    );
    
    -- Log user registration with correct metadata field access
    INSERT INTO public.audit_logs (
        user_id,
        event,
        action_type,
        metadata
    ) VALUES (
        NEW.id,
        'user_registered',
        'auth',
        jsonb_build_object(
            'email', NEW.email, 
            'provider', COALESCE(NEW.raw_app_meta_data->>'provider', 'email')
        )
    );
    
    RETURN NEW;
END;
$function$;