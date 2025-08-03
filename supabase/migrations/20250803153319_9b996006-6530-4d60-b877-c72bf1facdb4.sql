-- Temporarily disable the role escalation trigger to create the first admin
ALTER TABLE public.profiles DISABLE TRIGGER prevent_role_escalation;

-- Create the first admin user by promoting existing user "Devin"
UPDATE public.profiles 
SET role = 'admin'
WHERE user_id = '5797da1c-10a1-46cb-af5d-16ea802948b0' 
AND full_name = 'Devin' 
AND deleted_at IS NULL;

-- Re-enable the trigger to maintain security
ALTER TABLE public.profiles ENABLE TRIGGER prevent_role_escalation;

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
    jsonb_build_object(
        'note', 'First admin user created via database migration',
        'trigger_temporarily_disabled', true
    )
);