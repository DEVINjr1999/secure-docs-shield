-- Fix security warnings by setting proper search paths on functions

-- Update handle_new_user function with secure search path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, auth
AS $$
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
    
    -- Log user registration
    INSERT INTO public.audit_logs (
        user_id,
        event,
        action_type,
        metadata
    ) VALUES (
        NEW.id,
        'user_registered',
        'auth',
        jsonb_build_object('email', NEW.email, 'provider', COALESCE(NEW.app_metadata->>'provider', 'email'))
    );
    
    RETURN NEW;
END;
$$;

-- Update log_audit_event function with secure search path
CREATE OR REPLACE FUNCTION public.log_audit_event(
    p_user_id UUID,
    p_event TEXT,
    p_action_type TEXT,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_session_id TEXT DEFAULT NULL,
    p_document_id UUID DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_device_info JSONB DEFAULT NULL,
    p_success BOOLEAN DEFAULT TRUE,
    p_error_details TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS UUID 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
    audit_id UUID;
BEGIN
    INSERT INTO public.audit_logs (
        user_id,
        event,
        action_type,
        ip_address,
        user_agent,
        session_id,
        document_id,
        old_values,
        new_values,
        device_info,
        success,
        error_details,
        metadata
    ) VALUES (
        p_user_id,
        p_event,
        p_action_type,
        p_ip_address,
        p_user_agent,
        p_session_id,
        p_document_id,
        p_old_values,
        p_new_values,
        p_device_info,
        p_success,
        p_error_details,
        p_metadata
    ) RETURNING id INTO audit_id;
    
    RETURN audit_id;
END;
$$;

-- Update is_account_locked function with secure search path
CREATE OR REPLACE FUNCTION public.is_account_locked(p_user_id UUID)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
STABLE 
SET search_path = public
AS $$
DECLARE
    profile_record RECORD;
BEGIN
    SELECT account_locked_until, account_status 
    INTO profile_record
    FROM public.profiles 
    WHERE user_id = p_user_id AND deleted_at IS NULL;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check if account is suspended
    IF profile_record.account_status IN ('suspended', 'locked') THEN
        RETURN TRUE;
    END IF;
    
    -- Check if account is temporarily locked
    IF profile_record.account_locked_until IS NOT NULL 
       AND profile_record.account_locked_until > now() THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$;

-- Update increment_failed_login function with secure search path
CREATE OR REPLACE FUNCTION public.increment_failed_login(p_user_id UUID)
RETURNS INTEGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
    new_attempts INTEGER;
    lock_duration INTERVAL;
BEGIN
    UPDATE public.profiles 
    SET 
        failed_login_attempts = failed_login_attempts + 1,
        last_failed_login_at = now()
    WHERE user_id = p_user_id
    RETURNING failed_login_attempts INTO new_attempts;
    
    -- Lock account after 5 failed attempts
    IF new_attempts >= 5 THEN
        -- Progressive lockout: 5 min, 15 min, 1 hour, 24 hours
        CASE 
            WHEN new_attempts = 5 THEN lock_duration = INTERVAL '5 minutes';
            WHEN new_attempts = 6 THEN lock_duration = INTERVAL '15 minutes';
            WHEN new_attempts = 7 THEN lock_duration = INTERVAL '1 hour';
            ELSE lock_duration = INTERVAL '24 hours';
        END CASE;
        
        UPDATE public.profiles 
        SET account_locked_until = now() + lock_duration
        WHERE user_id = p_user_id;
    END IF;
    
    RETURN new_attempts;
END;
$$;

-- Update reset_failed_login_attempts function with secure search path
CREATE OR REPLACE FUNCTION public.reset_failed_login_attempts(p_user_id UUID)
RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
    UPDATE public.profiles 
    SET 
        failed_login_attempts = 0,
        last_failed_login_at = NULL,
        account_locked_until = NULL,
        last_login_at = now(),
        last_activity_at = now(),
        session_count = session_count + 1
    WHERE user_id = p_user_id;
END;
$$;

-- Update is_admin function with secure search path
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
STABLE 
SET search_path = public, auth
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin' 
    AND deleted_at IS NULL
    AND account_status = 'active'
  );
END;
$$;

-- Update update_updated_at_column function with secure search path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;