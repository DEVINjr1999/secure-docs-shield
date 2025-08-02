-- Create enhanced profiles table with security fields
CREATE TABLE public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'legal_reviewer', 'admin')),
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    recovery_email TEXT,
    account_status TEXT NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'pending_verification', 'locked')),
    
    -- MFA and security fields
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_method TEXT CHECK (mfa_method IN ('totp', 'webauthn', 'sms')),
    mfa_verified_at TIMESTAMPTZ,
    failed_login_attempts INTEGER DEFAULT 0,
    last_failed_login_at TIMESTAMPTZ,
    account_locked_until TIMESTAMPTZ,
    is_compromised BOOLEAN DEFAULT FALSE,
    
    -- Verification and consent tracking
    email_verified_at TIMESTAMPTZ,
    terms_accepted_at TIMESTAMPTZ,
    privacy_consent_at TIMESTAMPTZ,
    gdpr_consent_at TIMESTAMPTZ,
    
    -- Activity tracking
    last_login_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ,
    session_count INTEGER DEFAULT 0,
    
    -- Localization
    locale TEXT DEFAULT 'en',
    timezone TEXT DEFAULT 'UTC',
    
    -- Soft deletion
    deleted_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create comprehensive audit logs table
CREATE TABLE public.audit_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event TEXT NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('auth', 'document', 'profile', 'admin', 'security', 'mfa')),
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    document_id UUID,
    old_values JSONB,
    new_values JSONB,
    device_info JSONB,
    risk_score INTEGER CHECK (risk_score BETWEEN 0 AND 100),
    success BOOLEAN NOT NULL DEFAULT TRUE,
    error_details TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user sessions table for session tracking
CREATE TABLE public.user_sessions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    ip_address INET,
    user_agent TEXT,
    device_info JSONB,
    expires_at TIMESTAMPTZ NOT NULL,
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create private storage bucket for avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars', 
    'avatars', 
    FALSE, 
    2097152, -- 2MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles table
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create security definer function to check admin role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin' 
    AND deleted_at IS NULL
    AND account_status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Admin policy for profiles
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.is_admin());

CREATE POLICY "Admins can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (public.is_admin());

-- RLS Policies for audit_logs table
CREATE POLICY "Users can view their own audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (public.is_admin());

CREATE POLICY "System can insert audit logs" 
ON public.audit_logs 
FOR INSERT 
WITH CHECK (TRUE);

-- RLS Policies for user_sessions table
CREATE POLICY "Users can view their own sessions" 
ON public.user_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" 
ON public.user_sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions" 
ON public.user_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Storage policies for private avatars
CREATE POLICY "Users can upload their own avatar" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own avatar" 
ON storage.objects 
FOR SELECT 
USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar" 
ON storage.objects 
FOR UPDATE 
USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar" 
ON storage.objects 
FOR DELETE 
USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Function to log audit events
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
RETURNS UUID AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check account lockout
CREATE OR REPLACE FUNCTION public.is_account_locked(p_user_id UUID)
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to increment failed login attempts
CREATE OR REPLACE FUNCTION public.increment_failed_login(p_user_id UUID)
RETURNS INTEGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset failed login attempts on successful login
CREATE OR REPLACE FUNCTION public.reset_failed_login_attempts(p_user_id UUID)
RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_account_status ON public.profiles(account_status);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX idx_audit_logs_action_type ON public.audit_logs(action_type);
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON public.user_sessions(expires_at);
CREATE INDEX idx_user_sessions_session_token ON public.user_sessions(session_token);