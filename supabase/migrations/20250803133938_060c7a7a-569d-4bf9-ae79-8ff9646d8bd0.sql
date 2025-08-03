-- Add proper foreign key constraints to fix PostgREST auto-joins

-- Add foreign key constraint from documents.user_id to profiles.user_id
ALTER TABLE public.documents 
ADD CONSTRAINT fk_documents_user_id 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Add foreign key constraint from documents.assigned_reviewer_id to profiles.user_id  
ALTER TABLE public.documents 
ADD CONSTRAINT fk_documents_assigned_reviewer_id 
FOREIGN KEY (assigned_reviewer_id) REFERENCES public.profiles(user_id) ON DELETE SET NULL;

-- Add foreign key constraint from document_comments.user_id to profiles.user_id
ALTER TABLE public.document_comments 
ADD CONSTRAINT fk_document_comments_user_id 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Add foreign key constraint from document_assignments.reviewer_id to profiles.user_id
ALTER TABLE public.document_assignments 
ADD CONSTRAINT fk_document_assignments_reviewer_id 
FOREIGN KEY (reviewer_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Add foreign key constraint from document_assignments.assigned_by to profiles.user_id
ALTER TABLE public.document_assignments 
ADD CONSTRAINT fk_document_assignments_assigned_by 
FOREIGN KEY (assigned_by) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Add foreign key constraint from audit_logs.user_id to profiles.user_id
ALTER TABLE public.audit_logs 
ADD CONSTRAINT fk_audit_logs_user_id 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;