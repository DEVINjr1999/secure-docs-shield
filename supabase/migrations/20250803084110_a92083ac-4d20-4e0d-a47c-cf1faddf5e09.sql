-- Security Fix Phase 1: Critical RLS and Permission Fixes (Fixed)

-- 1. Re-enable RLS on document_templates with proper policies
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

-- Drop any existing conflicting policies first
DROP POLICY IF EXISTS "Public can view active templates" ON document_templates;
DROP POLICY IF EXISTS "Admins can view all templates" ON document_templates;
DROP POLICY IF EXISTS "Admins can insert templates" ON document_templates;
DROP POLICY IF EXISTS "Admins can update templates" ON document_templates;
DROP POLICY IF EXISTS "Anyone can view active templates" ON document_templates;

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

-- 2. Create a secure function to prevent role escalation
CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for role protection
DROP TRIGGER IF EXISTS prevent_role_escalation_trigger ON profiles;
CREATE TRIGGER prevent_role_escalation_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_escalation();

-- 3. Strengthen the is_admin function
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