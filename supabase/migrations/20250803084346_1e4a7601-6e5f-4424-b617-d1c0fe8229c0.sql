-- Fix remaining security warnings

-- 1. Fix function search path issues by setting search_path for all functions
CREATE OR REPLACE FUNCTION public.log_audit_event(p_user_id uuid, p_event text, p_action_type text, p_ip_address inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text, p_session_id text DEFAULT NULL::text, p_document_id uuid DEFAULT NULL::uuid, p_old_values jsonb DEFAULT NULL::jsonb, p_new_values jsonb DEFAULT NULL::jsonb, p_device_info jsonb DEFAULT NULL::jsonb, p_success boolean DEFAULT true, p_error_details text DEFAULT NULL::text, p_metadata jsonb DEFAULT NULL::jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

CREATE OR REPLACE FUNCTION public.is_account_locked(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE 
SECURITY DEFINER
SET search_path TO 'public'
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

CREATE OR REPLACE FUNCTION public.increment_failed_login(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

CREATE OR REPLACE FUNCTION public.reset_failed_login_attempts(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_assign_reviewer(p_document_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    reviewer_id UUID;
    assignment_count INTEGER;
    min_assignments INTEGER;
BEGIN
    -- Find the legal reviewer with the least assignments
    SELECT p.user_id, COUNT(da.id) as assignments
    INTO reviewer_id, assignment_count
    FROM public.profiles p
    LEFT JOIN public.document_assignments da ON p.user_id = da.reviewer_id AND da.is_active = true
    WHERE p.role = 'legal_reviewer' 
    AND p.account_status = 'active'
    AND p.deleted_at IS NULL
    GROUP BY p.user_id
    ORDER BY assignments ASC, p.created_at ASC
    LIMIT 1;
    
    -- If we found a reviewer, assign the document
    IF reviewer_id IS NOT NULL THEN
        -- Update the document
        UPDATE public.documents 
        SET assigned_reviewer_id = reviewer_id,
            status = 'under_review'
        WHERE id = p_document_id;
        
        -- Create assignment record
        INSERT INTO public.document_assignments (
            document_id, 
            reviewer_id, 
            assigned_by
        ) VALUES (
            p_document_id,
            reviewer_id,
            auth.uid()
        );
        
        -- Log the assignment
        PERFORM public.log_audit_event(
            auth.uid(),
            'document_assigned',
            'document',
            null,
            null,
            null,
            p_document_id,
            null,
            jsonb_build_object('assigned_reviewer_id', reviewer_id),
            null,
            true,
            null,
            jsonb_build_object('document_id', p_document_id, 'reviewer_id', reviewer_id)
        );
    END IF;
    
    RETURN reviewer_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
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
$$;

CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only admins can change roles
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    -- Check if current user is admin
    IF NOT (SELECT is_admin()) THEN
      RAISE EXCEPTION 'Only administrators can change user roles';
    END IF;
    
    -- Log the role change
    PERFORM log_audit_event(
      NEW.user_id,
      'role_changed',
      'security',
      null,
      null,
      null,
      null,
      jsonb_build_object('old_role', OLD.role),
      jsonb_build_object('new_role', NEW.role),
      null,
      true,
      null,
      jsonb_build_object('changed_by', auth.uid())
    );
  END IF;

  -- Log account status changes
  IF OLD.account_status IS DISTINCT FROM NEW.account_status THEN
    PERFORM log_audit_event(
      NEW.user_id,
      'account_status_changed',
      'security',
      null,
      null,
      null,
      null,
      jsonb_build_object('old_status', OLD.account_status),
      jsonb_build_object('new_status', NEW.account_status),
      null,
      true,
      null,
      jsonb_build_object('changed_by', auth.uid())
    );
  END IF;

  RETURN NEW;
END;
$$;