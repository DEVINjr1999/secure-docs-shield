-- Drop conflicting foreign key constraints that point to auth.users
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS fk_documents_user_id;
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS fk_documents_assigned_reviewer_id;
ALTER TABLE public.document_comments DROP CONSTRAINT IF EXISTS fk_document_comments_user_id;
ALTER TABLE public.document_assignments DROP CONSTRAINT IF EXISTS fk_document_assignments_reviewer_id;
ALTER TABLE public.document_assignments DROP CONSTRAINT IF EXISTS fk_document_assignments_assigned_by;
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;

-- Create proper foreign key constraints that point to profiles.user_id
ALTER TABLE public.documents 
ADD CONSTRAINT documents_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

ALTER TABLE public.documents 
ADD CONSTRAINT documents_assigned_reviewer_id_fkey 
FOREIGN KEY (assigned_reviewer_id) REFERENCES public.profiles(user_id) ON DELETE SET NULL;

ALTER TABLE public.document_comments 
ADD CONSTRAINT document_comments_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

ALTER TABLE public.document_assignments 
ADD CONSTRAINT document_assignments_reviewer_id_fkey 
FOREIGN KEY (reviewer_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

ALTER TABLE public.document_assignments 
ADD CONSTRAINT document_assignments_assigned_by_fkey 
FOREIGN KEY (assigned_by) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

ALTER TABLE public.audit_logs 
ADD CONSTRAINT audit_logs_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE SET NULL;