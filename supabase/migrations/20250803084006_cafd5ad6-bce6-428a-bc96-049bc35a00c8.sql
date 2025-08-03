-- Security Fix Phase 1: Critical RLS and Permission Fixes

-- 1. Re-enable RLS on document_templates with proper policies
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

-- Drop any existing conflicting policies first
DROP POLICY IF EXISTS "Public can view active templates" ON document_templates;
DROP POLICY IF EXISTS "Admins can view all templates" ON document_templates;
DROP POLICY IF EXISTS "Admins can insert templates" ON document_templates;
DROP POLICY IF EXISTS "Admins can update templates" ON document_templates;

-- Create secure policies for document_templates
CREATE POLICY "Anyone can view active templates"
ON document_templates
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can view all templates"
ON document_templates
FOR SELECT
USING (is_admin());

CREATE POLICY "Admins can insert templates"
ON document_templates
FOR INSERT
WITH CHECK (is_admin() AND auth.uid() = created_by);

CREATE POLICY "Admins can update templates"
ON document_templates
FOR UPDATE
USING (is_admin());

-- 2. Strengthen role security - prevent users from modifying their own roles
-- Add explicit policy to prevent role changes by non-admins
CREATE POLICY "Only admins can update profiles"
ON profiles
FOR UPDATE
USING (
  is_admin() OR 
  (auth.uid() = user_id AND deleted_at IS NULL)
)
WITH CHECK (
  -- Allow admins to update any profile
  is_admin() OR 
  -- Allow users to update their own profile but NOT the role field
  (auth.uid() = user_id AND deleted_at IS NULL AND OLD.role = NEW.role)
);

-- Drop the old less secure policy
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- 3. Add audit logging trigger for role changes
CREATE OR REPLACE FUNCTION audit_profile_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log role changes specifically
  IF OLD.role IS DISTINCT FROM NEW.role THEN
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for profile security changes
DROP TRIGGER IF EXISTS audit_profile_security_changes ON profiles;
CREATE TRIGGER audit_profile_security_changes
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION audit_profile_changes();

-- 4. Strengthen the is_admin function to prevent potential issues
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  user_role text;
BEGIN
  -- Get current user's role directly
  SELECT role INTO user_role
  FROM public.profiles 
  WHERE user_id = auth.uid() 
    AND account_status = 'active' 
    AND deleted_at IS NULL
  LIMIT 1;
  
  RETURN COALESCE(user_role = 'admin', false);
END;
$$;