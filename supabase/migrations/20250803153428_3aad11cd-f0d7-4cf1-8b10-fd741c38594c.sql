-- Drop the trigger temporarily to create the first admin
DROP TRIGGER IF EXISTS prevent_role_escalation ON public.profiles;

-- Create the first admin user by promoting existing user "Devin"
UPDATE public.profiles 
SET role = 'admin'
WHERE user_id = '5797da1c-10a1-46cb-af5d-16ea802948b0' 
AND full_name = 'Devin' 
AND deleted_at IS NULL;

-- Recreate the trigger to maintain security
CREATE TRIGGER prevent_role_escalation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_role_escalation();

-- Log this initial admin creation for audit purposes
INSERT INTO public.audit_logs (
    user_id,
    event,
    action_type,
    success,
    metadata
) VALUES (
    '5797da1c-10a1-46cb-af5d-16ea802948b0',
    'initial_admin_created',
    'security',
    true,
    jsonb_build_object('note', 'First admin user created - bootstrap admin')
);