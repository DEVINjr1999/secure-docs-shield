-- Create the first admin user by promoting existing user "Devin"
-- This bypasses the prevent_role_escalation trigger since we're doing it as a direct database operation

UPDATE public.profiles 
SET role = 'admin'
WHERE user_id = '5797da1c-10a1-46cb-af5d-16ea802948b0' 
AND full_name = 'Devin' 
AND deleted_at IS NULL;

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
    jsonb_build_object('note', 'First admin user created via database migration')
);